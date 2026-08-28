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
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ChildSessionMaze } from './live-data.ts'

interface TrackedChild {
  face: SessionFace
  off: (() => void) | null
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

  constructor(private readonly sessions: ISessions, private readonly sessionId: SessionId) {
    this.#offList = sessions.list.subscribe(() => { this.#sync() })
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
    for (const child of this.#children.values()) this.#release(child)
    this.#children.clear()
    this.#listeners.clear()
    this.#snapshot = []
  }

  #release(child: TrackedChild): void {
    child.released = true
    child.off?.()
    child.off = null
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

  #track(id: SessionId): void {
    // An unaddressable child stays untracked; the next list tick retries.
    const face = this.sessions.binding(id)?.session
    if (face === undefined) return
    const child: TrackedChild = { face, off: null, released: false }
    this.#children.set(id, child)
    // Background history open is a capability-line ability (absent through
    // rc.8): when the face has no open(), subscribe anyway — publish() keeps
    // children hidden until their snapshot actually reports 'open'.
    const open = (face as typeof face & { open?: () => Promise<void> }).open
    const opening = open === undefined ? Promise.resolve() : open.call(face)
    opening.then(() => {
      if (this.#disposed || child.released) return
      child.off = face.subscribe(() => { this.#publish() })
      this.#publish()
    }).catch(() => {
      // A child whose history refuses to open contributes nothing; drop it so
      // the roster does not retry a permanently broken projection.
      if (!child.released) this.#children.delete(id)
    })
  }

  #publish(): void {
    if (this.#disposed) return
    const { byId } = this.sessions.list.getSnapshot()
    const next: ChildSessionMaze[] = []
    for (const [id, child] of this.#children) {
      if (child.off === null) continue
      const conversation = child.face.getSnapshot()
      if (conversation.openState !== 'open') continue
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
