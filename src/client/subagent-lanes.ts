/**
 * dsh subagent child roster for the live maze: tracks the current session's
 * subagent children and republishes one immutable ChildSessionMaze array on
 * every roster or child-conversation change. Two implementations behind one
 * interface (`createSubagentRoster` picks at runtime):
 *
 * - `RetainedSubagentRoster` (host 0.1.6-alpha.2+, `sessions.retain` present):
 *   membership comes from the parent's subagent catalog; the maze holds each
 *   child itself under its own reference source, so a child's branch no longer
 *   depends on another view having opened it, and children that finished
 *   before the maze opened are drawn in full (吴昊 2026-10-01 拍板).
 * - `SubagentMazeSource` (older hosts): passive — follows the children the
 *   host already has open; a child never opened stays absent. Unchanged except
 *   that names come from the catalog when the host projects one.
 *
 * Only real task subagents qualify — manual "branch in new conversation"
 * forks and ephemeral side-chat children also carry parentId but are the
 * user's own work, not task delegation (the catalog only records the former).
 */
import type { ISessions, SessionFace } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { UiConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ChildSessionMaze } from './live-data.ts'

/** A row of the host's subagent catalog projection (host 0.1.5+); only `id` is relied on. */
export interface CatalogEntryLike {
  readonly id: string
  readonly createdAt?: number
  readonly mode?: string
  readonly label?: string
}

/** What TraceLiveView consumes; both roster implementations satisfy it. */
export interface SubagentRoster extends ObservableSnapshot<readonly ChildSessionMaze[]> {
  /** The parent's catalog as the host projects it (names; membership where the roster holds children). */
  setCatalog(entries: readonly CatalogEntryLike[] | undefined): void
  /** Idempotent: unsubscribes and releases everything the roster holds. */
  dispose(): void
}

/** Catalog name first: on 0.1.5 an untitled child's displayTitle falls back to the workspace folder name. */
function childLabel(id: string, entry: CatalogEntryLike | undefined, row: { displayTitle?: string } | undefined): string {
  return entry?.label ?? row?.displayTitle ?? id
}

/** Subagent catalog calls that exist on host ≤0.1.6 only. */
interface LegacyCatalog {
  setSubagentCatalogOpen?: (parentSessionId: SessionId, open: boolean) => void
  refreshSubagents?: (parentSessionId: SessionId) => Promise<void>
}

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
export class SubagentMazeSource implements SubagentRoster {
  #children = new Map<SessionId, TrackedChild>()
  #catalog = new Map<string, CatalogEntryLike>()
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
    // Host ≤0.1.6 API; 0.1.7 removed both (catalog moved to parent projections,
    // children must be retain()ed before binding() resolves). Feature-detect.
    const legacy = sessions as unknown as LegacyCatalog
    legacy.setSubagentCatalogOpen?.(sessionId, true)
    Promise.resolve(legacy.refreshSubagents?.(sessionId)).then(() => { this.#sync() }).catch(() => {
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

  /** Passive roster: the catalog only supplies names (membership stays the session list). */
  setCatalog(entries: readonly CatalogEntryLike[] | undefined): void {
    this.#catalog = new Map((entries ?? []).map(entry => [entry.id, entry]))
    this.#publish()
  }

  /** Idempotent: unsubscribes the list and every child projection. */
  dispose(): void {
    if (this.#disposed) return
    this.#disposed = true
    this.#offList()
    ;(this.sessions as unknown as LegacyCatalog).setSubagentCatalogOpen?.(this.sessionId, false)
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
      // Also drop a child whose binding changed under it. From host
      // 0.1.6-alpha.2 a child binds only while some view retains it (e.g. the
      // subagent sidebar); once released, the old face and chat target freeze
      // on their last frame, and a later retain hands out a new generation.
      // Older hosts cache the binding, so this never churns there.
      if (!wanted.has(id) || this.sessions.binding(id)?.session !== child.face) {
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
        label: childLabel(id, this.#catalog.get(id), row),
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

/* ======================= Retained roster (host 0.1.6-alpha.2+) ======================= */

/** Structural view of the host calls the retained roster needs; typed locally so one build compiles on every host type set. */
interface RetainCapable {
  retain?: (
    target: { parentSessionId: string; childSessionId: string; mode: string },
    options: { source: string },
  ) => RetainedRef
  retainInfo?: (id: string) => unknown
}
interface RetainedRef {
  readonly ready: Promise<unknown>
  readonly binding: unknown
  release(): void
}

/** Our reference source name, as the host's own views use `mainView` / `sidebarChat`. */
export const MAZE_RETAIN_SOURCE = 'maze'
/** Children followed live at once; the rest are counted, not drawn (吴昊 2026-10-01 拍板：8 个). */
export const MAX_LIVE_CHILDREN = 8
/** Retained-roster hosts only publish positive retain counts; a running child is tracked until it settles. */

/** True when the host can hold a child session for us (0.1.6-alpha.2+). */
export function hostCanRetain(sessions: unknown): boolean {
  return typeof (sessions as RetainCapable | null)?.retain === 'function'
}

/** A settled child read once and released; replayed from here when the tab comes back. */
interface SettledChild {
  label: string
  conversation: ChatSnapshot
}

/** A child the roster currently holds (running, or a settled one still being read). */
interface HeldChild {
  ref: RetainedRef
  chat: ObservableSnapshot<ChatSnapshot | undefined> | null
  offChat: (() => void) | null
  /** Set once the host finished its first open attempt. */
  ready: boolean
  released: boolean
}

/**
 * Roster that holds children itself (`sessions.retain`, source `maze`).
 * Rules (吴昊 2026-10-01 拍板): a running child is held until it settles; a
 * settled child is read once, released, and cached; at most
 * MAX_LIVE_CHILDREN children are expanded at once, the rest are counted as
 * hidden; everything is released on dispose (tab switch / session switch).
 */
export class RetainedSubagentRoster implements SubagentRoster {
  #held = new Map<string, HeldChild>()
  #settled = new Map<string, SettledChild>()
  #catalog: CatalogEntryLike[] = []
  #snapshot: readonly ChildSessionMaze[] = []
  #listeners = new Set<() => void>()
  #offList: () => void
  #disposed = false

  constructor(
    private readonly sessions: ISessions,
    private readonly conversations: UiConversation,
    private readonly sessionId: SessionId,
    /** Settled-child cache shared across roster instances (module-level in production). */
    private readonly cache: Map<string, SettledChild> = settledCache,
  ) {
    // Running flags live on the session list; re-evaluate holds on every change.
    this.#offList = sessions.list.subscribe(() => { this.#sync() })
  }

  getSnapshot = (): readonly ChildSessionMaze[] => this.#snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => { this.#listeners.delete(listener) }
  }

  setCatalog(entries: readonly CatalogEntryLike[] | undefined): void {
    this.#catalog = [...(entries ?? [])]
    this.#sync()
  }

  dispose(): void {
    if (this.#disposed) return
    this.#disposed = true
    this.#offList()
    for (const child of this.#held.values()) this.#release(child)
    this.#held.clear()
    this.#listeners.clear()
    this.#snapshot = []
  }

  #release(child: HeldChild): void {
    if (child.released) return
    child.released = true
    child.offChat?.()
    child.offChat = null
    child.chat = null
    try { child.ref.release() } catch (error) { console.error('[dsh-maze] releasing a child session threw:', error) }
  }

  #isRunning(id: string): boolean {
    const row = this.sessions.list.getSnapshot().byId[id as SessionId] as { running?: boolean } | undefined
    return row?.running === true
  }

  /** Decide which catalog children to hold, hold/release accordingly, then publish. */
  #sync(): void {
    if (this.#disposed) return
    const wanted = new Set<string>()
    let expanded = 0
    for (const entry of this.#catalog) {
      const id = entry.id
      const running = this.#isRunning(id)
      // A settled child we already read needs no hold; one that is running again gets re-read.
      if (!running && (this.#settled.has(id) || this.cache.has(id))) {
        if (!this.#settled.has(id)) this.#settled.set(id, this.cache.get(id) as SettledChild)
        continue
      }
      if (expanded >= MAX_LIVE_CHILDREN) continue
      expanded += 1
      wanted.add(id)
    }
    for (const [id, child] of this.#held) {
      if (!wanted.has(id)) {
        this.#release(child)
        this.#held.delete(id)
      }
    }
    for (const entry of this.#catalog) {
      if (wanted.has(entry.id) && !this.#held.has(entry.id)) this.#hold(entry)
    }
    this.#publish()
  }

  #hold(entry: CatalogEntryLike): void {
    const api = this.sessions as unknown as RetainCapable
    if (typeof api.retain !== 'function') return
    let ref: RetainedRef
    try {
      // The full subagent address is required: the host refuses to follow a child by bare id.
      ref = api.retain(
        { parentSessionId: this.sessionId, childSessionId: entry.id, mode: entry.mode ?? 'unknown' },
        { source: MAZE_RETAIN_SOURCE },
      )
    } catch (error) {
      console.error('[dsh-maze] could not hold child session', entry.id, error)
      return
    }
    const child: HeldChild = { ref, chat: null, offChat: null, ready: false, released: false }
    this.#held.set(entry.id, child)
    ref.ready.then(() => {
      if (child.released || this.#disposed) return
      child.ready = true
      // `ready` also resolves on a failed open; the Chat target then simply stays empty.
      try {
        const chat = this.conversations.binding(ref.binding as never).target('chat')
        child.chat = chat
        child.offChat = chat.subscribe(() => { this.#onChildChange(entry.id) })
      } catch (error) {
        console.error('[dsh-maze] could not follow child conversation', entry.id, error)
      }
      this.#onChildChange(entry.id)
    }).catch(() => { /* retain() surfaces open failures on the snapshot, never here */ })
  }

  /** A held child's conversation changed: cache + release it once it has settled, then publish. */
  #onChildChange(id: string): void {
    if (this.#disposed) return
    const child = this.#held.get(id)
    if (child === undefined || child.released) return
    if (!this.#isRunning(id)) {
      const conversation = child.chat?.getSnapshot()
      if (conversation !== undefined && conversation.order.length > 0) {
        const entry = this.#catalog.find(e => e.id === id)
        const row = this.sessions.list.getSnapshot().byId[id as SessionId] as { displayTitle?: string } | undefined
        const settled = { label: childLabel(id, entry, row), conversation }
        this.#settled.set(id, settled)
        this.cache.set(id, settled)
        this.#release(child)
        this.#held.delete(id)
      }
    }
    this.#publish()
  }

  #publish(): void {
    if (this.#disposed) return
    const { byId } = this.sessions.list.getSnapshot()
    const next: ChildSessionMaze[] = []
    let expanded = 0
    for (const entry of this.#catalog) {
      const id = entry.id
      const running = this.#isRunning(id)
      const row = byId[id as SessionId] as { displayTitle?: string } | undefined
      const label = childLabel(id, entry, row)
      const held = this.#held.get(id)
      if (held !== undefined) {
        expanded += 1
        const conversation = held.chat?.getSnapshot()
        if (conversation === undefined || conversation.order.length === 0) continue
        next.push({ id, label, running, conversation })
        continue
      }
      const settled = this.#settled.get(id)
      if (settled !== undefined && !running) {
        next.push({ id, label: settled.label, running: false, conversation: settled.conversation })
        continue
      }
      // Beyond the cap (or not yet held): known but not expanded.
      if (expanded >= MAX_LIVE_CHILDREN) next.push({ id, label, running, conversation: null })
    }
    this.#snapshot = next
    for (const listener of [...this.#listeners]) {
      try { listener() } catch (error) { console.error('[dsh-maze] subagent roster subscriber threw:', error) }
    }
  }
}

/** Module-level cache of settled children: survives tab switches, keyed by child session id. */
const settledCache = new Map<string, SettledChild>()

/** Pick the roster implementation the host supports. */
export function createSubagentRoster(sessions: ISessions, conversations: UiConversation, sessionId: SessionId): SubagentRoster {
  return hostCanRetain(sessions)
    ? new RetainedSubagentRoster(sessions, conversations, sessionId)
    : new SubagentMazeSource(sessions, conversations, sessionId)
}
