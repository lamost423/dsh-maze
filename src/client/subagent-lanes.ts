/**
 * dsh subagent child roster for the live maze: tracks the current session's
 * subagent children off the session list, opens each child's conversation
 * projection, and republishes one immutable ChildSessionMaze array on every
 * roster or child-conversation change. Only `origin: 'subagent'` rows
 * qualify — manual "branch in new conversation" forks and ephemeral
 * side-chat children also carry parentId but are the user's own work,
 * not task delegation.
 */
import type { ISessions, SessionFace } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { UiConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ChildSessionMaze } from './live-data.ts'

interface TrackedChild {
  face: SessionFace
  /** Session lifecycle subscription (openState). */
  off: (() => void) | null
  /**
   * The child's Chat target source. Conversation content is no longer part of
   * the Session snapshot — it is assembled per session by uiConversation and
   * published per target, so the roster follows both.
   */
  chat: ObservableSnapshot<ChatSnapshot | undefined> | null
  offChat: (() => void) | null
  /** Set when the roster drops the child while its open() is still settling. */
  released: boolean
}

/** Observable child roster consumed by TraceLiveView via useSyncExternalStore. */
export class SubagentMazeSource implements ObservableSnapshot<readonly ChildSessionMaze[]> {
  #children = new Map<SessionId, TrackedChild>()
  #snapshot: readonly ChildSessionMaze[] = []
  #listeners = new Set<() => void>()
  #offList: () => void
  #disposed = false

  constructor(
    private readonly sessions: ISessions,
    private readonly conversations: UiConversation,
    private readonly sessionId: SessionId,
  ) {
    this.#offList = sessions.list.subscribe(() => { this.#sync() })
    // Keep this parent's child catalog live so the roster learns about children
    // as they are spawned. This is read-only: it never selects a session.
    sessions.setSubagentCatalogOpen(sessionId, true)
    sessions.refreshSubagents(sessionId).then(() => { this.#sync() }).catch(() => {
      // A parent with no children (or a host that refuses the catalog)
      // contributes an empty roster; the list subscription still retries.
    })
    this.#sync()
  }

  getSnapshot = (): readonly ChildSessionMaze[] => this.#snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => { this.#listeners.delete(listener) }
  }

  /** Idempotent: unsubscribes the list and every child projection. */
  dispose(): void {
    if (this.#disposed) return
    this.#disposed = true
    this.#offList()
    this.sessions.setSubagentCatalogOpen(this.sessionId, false)
    for (const child of this.#children.values()) this.#release(child)
    this.#children.clear()
    this.#listeners.clear()
    this.#snapshot = []
  }

  #release(child: TrackedChild): void {
    child.released = true
    child.off?.()
    child.off = null
    child.offChat?.()
    child.offChat = null
    child.chat = null
  }

  #sync(): void {
    if (this.#disposed) return
    const { byId } = this.sessions.list.getSnapshot()
    const wanted = new Set<SessionId>()
    for (const row of Object.values(byId)) {
      // `ephemeral` is a capability-line field (fork side-chat children); the
      // published rc line never sets it, so the structural read stays true.
      const ephemeral = (row as typeof row & { ephemeral?: true }).ephemeral
      if (row.parentId === this.sessionId && row.origin === 'subagent' && ephemeral !== true) {
        wanted.add(row.id)
      }
    }
    for (const [id, child] of this.#children) {
      if (!wanted.has(id)) {
        this.#release(child)
        this.#children.delete(id)
      }
    }
    for (const id of wanted) {
      if (!this.#children.has(id)) this.#track(id)
    }
    this.#publish()
  }

  /**
   * Follow one child passively.
   *
   * Deliberately does NOT open the child. Host 0.1.2 rejects a bare open() on a
   * subagent child ("subagent Sessions require their durable parent address"),
   * and the only supported way in — `sessions.openSubagent()` / the catalog
   * menu — is a NAVIGATION action: it sets the selected session, which would
   * yank the user out of the conversation they are watching the maze for. A
   * background roster must never do that.
   *
   * What remains is passive observation: the Conversation binding feeds off the
   * child's event window, so a child that is running streams into the maze
   * live. A child that finished before this view mounted has nothing in its
   * window and stays absent until the host offers a background history read.
   * @param id - child session id.
   */
  #track(id: SessionId): void {
    const face = this.sessions.binding(id)?.session
    if (face === undefined) return
    const child: TrackedChild = { face, off: null, chat: null, offChat: null, released: false }
    this.#children.set(id, child)
    child.off = face.subscribe(() => { this.#publish() })
    const chat = this.conversations.binding(id).target('chat')
    child.chat = chat
    child.offChat = chat.subscribe(() => { this.#publish() })
    this.#publish()
  }

  #publish(): void {
    if (this.#disposed) return
    const { byId } = this.sessions.list.getSnapshot()
    const next: ChildSessionMaze[] = []
    for (const [id, child] of this.#children) {
      if (child.off === null) continue
      // Content, not openState, is the gate. The roster never opens a child
      // (see #track), so openState stays 'cold' for children it only observes;
      // an empty window simply contributes nothing rather than an empty lane.
      const conversation = child.chat?.getSnapshot()
      if (conversation === undefined || conversation.order.length === 0) continue
      const row = byId[id]
      next.push({
        id,
        label: row?.displayTitle ?? id,
        running: row?.running ?? false,
        conversation,
      })
    }
    this.#snapshot = next
    for (const listener of [...this.#listeners]) {
      try { listener() } catch (error) { console.error('[ui-trace-compare] subagent roster subscriber threw:', error) }
    }
  }
}
