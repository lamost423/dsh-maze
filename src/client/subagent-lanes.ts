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

/**
 * Shallow equality of roster snapshots. An unchanged roster must not re-publish:
 * host 0.2.0 notifies the session list on ANY session's projection change, and a
 * fresh array there would make the maze recompute on every notification.
 */
function sameRoster(a: readonly ChildSessionMaze[], b: readonly ChildSessionMaze[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i] as ChildSessionMaze, y = b[i] as ChildSessionMaze
    if (x.id !== y.id || x.label !== y.label || x.running !== y.running || x.conversation !== y.conversation) return false
  }
  return true
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
    if (sameRoster(this.#snapshot, next)) return
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
}
interface RetainedRef {
  /** Resolves once the host's first open attempt settled (also on failure); rejects once the reference is released. */
  readonly ready: Promise<unknown>
  /** The session binding; the host throws when it is read after release. */
  readonly binding: unknown
  release(): void
}

/** Our reference source name, as the host's own views use `mainView` / `sidebarChat`. */
export const MAZE_RETAIN_SOURCE = 'maze'
/** Children followed live at once; the rest are counted, not drawn (吴昊 2026-10-01 拍板：8 个). */
export const MAX_LIVE_CHILDREN = 8
/** After the list reports a child stopped running, how long to wait for its last events (turn/end) before settling anyway. */
export const SETTLE_GRACE_MS = 3000
/** Child conversation cuts arrive per streamed chunk; publishes from that path are coalesced to one per this many ms. */
export const CHILD_PUBLISH_DELAY_MS = 250

/** True when the host can hold a child session for us (0.1.6-alpha.2+). */
export function hostCanRetain(sessions: unknown): boolean {
  return typeof (sessions as RetainCapable | null)?.retain === 'function'
}

/** A settled child read once and released; replayed from here when the tab comes back. */
export interface SettledChild {
  label: string
  conversation: ChatSnapshot
}

/** A child the roster currently holds (running, or a settled one still being read). */
interface HeldChild {
  /** null while retain() is in flight: the slot is claimed before the call (see #hold). */
  ref: RetainedRef | null
  chat: ObservableSnapshot<ChatSnapshot | undefined> | null
  offChat: (() => void) | null
  released: boolean
  /** When the list first reported the child not running while its last turn was still open. */
  stoppedAt: number | null
  /** Pending re-check at the end of the settle grace period. */
  graceTimer: ReturnType<typeof setTimeout> | null
}

/** Construction knobs; production uses the defaults, tests shorten the timers and pass their own cache. */
export interface RetainedRosterOptions {
  cache?: Map<string, SettledChild>
  settleGraceMs?: number
  publishDelayMs?: number
}

/** Module-level cache of settled children: survives tab switches, keyed by child session id. */
const settledCache = new Map<string, SettledChild>()

/** Whether the conversation's latest turn has a recorded end (its turn/end reached the window). */
function lastTurnClosed(snap: ChatSnapshot): boolean {
  const order = snap.timeline.turnOrder
  const lastTurn = order[order.length - 1]
  if (lastTurn === undefined) return false
  const last = snap.timeline.turns.get(lastTurn)
  return last !== undefined && last.end !== undefined
}

/** Host contract: `binding.session.getSnapshot().openState`; 'error' means the open attempt failed (ready resolves anyway). */
function openStateOf(binding: unknown): string | undefined {
  const session = (binding as { session?: { getSnapshot?: () => { openState?: unknown } } } | null)?.session
  const state = session?.getSnapshot?.()?.openState
  return typeof state === 'string' ? state : undefined
}

/**
 * Roster that holds children itself (`sessions.retain`, source `maze`).
 * Rules (吴昊 2026-10-01 拍板): a running child is held until it settles; a
 * settled child is read once, released, and cached; at most MAX_LIVE_CHILDREN
 * children are expanded at once, the rest are counted as hidden; everything
 * is released on dispose (tab switch / session switch).
 *
 * Re-entrancy: the host publishes the new retention count to `sessions.list`
 * synchronously inside retain() and release(), and that list is what this
 * roster subscribes to — so every hold claims its slot before calling the
 * host, and #sync defers nested calls instead of running them.
 */
export class RetainedSubagentRoster implements SubagentRoster {
  #held = new Map<string, HeldChild>()
  #settled = new Map<string, SettledChild>()
  /** Children the host refused (retain threw, open failed, no mode): not retried until the catalog changes. */
  #failed = new Set<string>()
  #catalog: CatalogEntryLike[] = []
  #catalogKey = ''
  #snapshot: readonly ChildSessionMaze[] = []
  #listeners = new Set<() => void>()
  #offList: () => void
  #disposed = false
  #syncing = false
  #syncPending = false
  #publishTimer: ReturnType<typeof setTimeout> | null = null
  readonly #cache: Map<string, SettledChild>
  readonly #settleGraceMs: number
  readonly #publishDelayMs: number

  constructor(
    private readonly sessions: ISessions,
    private readonly conversations: UiConversation,
    private readonly sessionId: SessionId,
    options: RetainedRosterOptions = {},
  ) {
    this.#cache = options.cache ?? settledCache
    this.#settleGraceMs = options.settleGraceMs ?? SETTLE_GRACE_MS
    this.#publishDelayMs = options.publishDelayMs ?? CHILD_PUBLISH_DELAY_MS
    // Running flags and retention counts live on the session list; re-evaluate holds on every change.
    this.#offList = sessions.list.subscribe(() => { this.#sync() })
  }

  getSnapshot = (): readonly ChildSessionMaze[] => this.#snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => { this.#listeners.delete(listener) }
  }

  setCatalog(entries: readonly CatalogEntryLike[] | undefined): void {
    const list = [...(entries ?? [])]
    const key = list.map(e => e.id).join('\n')
    // A changed catalog is the one moment a refused hold is worth retrying.
    if (key !== this.#catalogKey) { this.#catalogKey = key; this.#failed.clear() }
    this.#catalog = list
    this.#sync()
  }

  dispose(): void {
    if (this.#disposed) return
    this.#disposed = true
    this.#offList()
    if (this.#publishTimer !== null) { clearTimeout(this.#publishTimer); this.#publishTimer = null }
    const held = [...this.#held.values()]
    this.#held.clear()
    for (const child of held) this.#release(child)
    this.#listeners.clear()
    this.#snapshot = []
  }

  #release(child: HeldChild): void {
    if (child.released) return
    child.released = true
    if (child.graceTimer !== null) { clearTimeout(child.graceTimer); child.graceTimer = null }
    child.offChat?.()
    child.offChat = null
    child.chat = null
    // release() publishes the retention count to the list synchronously → re-enters #sync (deferred by its guard).
    try { child.ref?.release() } catch (error) { console.error('[dsh-maze] releasing a child session threw:', error) }
  }

  #isRunning(id: string): boolean {
    const row = this.sessions.list.getSnapshot().byId[id as SessionId] as { running?: boolean } | undefined
    return row?.running === true
  }

  /** Re-entrancy guard around #syncOnce: nested notifications (from retain/release) run once afterwards. */
  #sync(): void {
    if (this.#disposed) return
    if (this.#syncing) { this.#syncPending = true; return }
    this.#syncing = true
    try { this.#syncOnce() } finally { this.#syncing = false }
    if (this.#syncPending) { this.#syncPending = false; this.#sync() }
  }

  /** Decide which catalog children to hold, hold/release accordingly, settle what finished, then publish. */
  #syncOnce(): void {
    const wanted = new Set<string>()
    let expanded = 0
    for (const entry of this.#catalog) {
      const id = entry.id
      if (this.#failed.has(id)) continue
      const running = this.#isRunning(id)
      // A settled child already read is served from the cache; a held one stays until it settles.
      if (!running && !this.#held.has(id) && (this.#settled.has(id) || this.#cache.has(id))) {
        if (!this.#settled.has(id)) this.#settled.set(id, this.#cache.get(id) as SettledChild)
        continue
      }
      if (expanded >= MAX_LIVE_CHILDREN) continue
      expanded += 1
      wanted.add(id)
    }
    for (const [id, child] of [...this.#held]) {
      if (!wanted.has(id)) {
        this.#held.delete(id)
        this.#release(child)
      }
    }
    for (const entry of this.#catalog) {
      if (wanted.has(entry.id) && !this.#held.has(entry.id)) this.#hold(entry)
    }
    // A child can stop running on the list without a new conversation cut: re-check held children here.
    for (const id of [...this.#held.keys()]) if (!this.#isRunning(id)) this.#settleIfDone(id)
    this.#publish()
  }

  #hold(entry: CatalogEntryLike): void {
    const api = this.sessions as unknown as RetainCapable
    if (typeof api.retain !== 'function') return
    // Never guess the mode: hosts before 0.1.7 reject an address whose mode does not match the child.
    if (typeof entry.mode !== 'string') { this.#failed.add(entry.id); return }
    const child: HeldChild = { ref: null, chat: null, offChat: null, released: false, stoppedAt: null, graceTimer: null }
    // Claim the slot BEFORE calling the host: retain() notifies the session list synchronously,
    // and the nested #sync must already see this child as held or it would hold it again.
    this.#held.set(entry.id, child)
    let ref: RetainedRef
    try {
      // The full subagent address is required: the host refuses to follow a child by bare id.
      ref = api.retain(
        { parentSessionId: this.sessionId, childSessionId: entry.id, mode: entry.mode },
        { source: MAZE_RETAIN_SOURCE },
      )
    } catch (error) {
      console.error('[dsh-maze] could not hold child session', entry.id, error)
      this.#held.delete(entry.id)
      this.#failed.add(entry.id)
      return
    }
    if (child.released || this.#disposed) {
      // Dropped during the host's synchronous notification: give the reference straight back.
      try { ref.release() } catch (error) { console.error('[dsh-maze] releasing a child session threw:', error) }
      return
    }
    child.ref = ref
    ref.ready.then(() => {
      if (child.released || this.#disposed) return
      if (openStateOf(ref.binding) === 'error') {
        // The host could not open this child (`ready` resolves anyway): free the slot, do not retry until the catalog changes.
        this.#drop(entry.id, child)
        return
      }
      try {
        const chat = this.conversations.binding(ref.binding as never).target('chat')
        child.chat = chat
        child.offChat = chat.subscribe(() => { this.#onChildChange(entry.id) })
      } catch (error) {
        console.error('[dsh-maze] could not follow child conversation', entry.id, error)
        this.#drop(entry.id, child)
        return
      }
      this.#onChildChange(entry.id)
    }).catch(() => {
      // `ready` rejects once the reference is released (host contract) — nothing left to do for a released child.
    })
  }

  /** Give up on a child the host refused: release it, remember the refusal, publish. */
  #drop(id: string, child: HeldChild): void {
    this.#failed.add(id)
    this.#held.delete(id)
    this.#release(child)
    this.#publish()
  }

  /**
   * A held child that is no longer running: cache it and release the hold — but only once its
   * conversation shows the last turn closed. The list's running flag flips synchronously on the
   * host while the follow stream delivers the last events later; settling on the flip alone would
   * cache a truncated conversation for good. A grace period bounds the wait.
   */
  #settleIfDone(id: string, now: number = Date.now()): void {
    const child = this.#held.get(id)
    if (child === undefined || child.released) return
    if (this.#isRunning(id)) {
      child.stoppedAt = null
      if (child.graceTimer !== null) { clearTimeout(child.graceTimer); child.graceTimer = null }
      return
    }
    const conversation = child.chat?.getSnapshot()
    if (conversation === undefined || conversation.order.length === 0) return   // nothing to cache yet: keep holding
    if (!lastTurnClosed(conversation)) {
      if (child.stoppedAt === null) child.stoppedAt = now
      const waited = now - child.stoppedAt
      if (waited < this.#settleGraceMs) {
        if (child.graceTimer === null) {
          child.graceTimer = setTimeout(() => { child.graceTimer = null; this.#onChildChange(id) }, this.#settleGraceMs - waited)
        }
        return
      }
    }
    const entry = this.#catalog.find(e => e.id === id)
    const row = this.sessions.list.getSnapshot().byId[id as SessionId] as { displayTitle?: string } | undefined
    const settled = { label: childLabel(id, entry, row), conversation }
    this.#settled.set(id, settled)
    this.#cache.set(id, settled)
    this.#held.delete(id)
    this.#release(child)
  }

  /** A held child's conversation changed (or its hold just became ready, or its grace period ended). */
  #onChildChange(id: string): void {
    if (this.#disposed) return
    this.#settleIfDone(id)
    this.#schedulePublish()
  }

  /** Streaming children change their conversation per chunk: coalesce those publishes. */
  #schedulePublish(): void {
    if (this.#publishDelayMs <= 0) { this.#publish(); return }
    if (this.#publishTimer !== null) return
    this.#publishTimer = setTimeout(() => { this.#publishTimer = null; this.#publish() }, this.#publishDelayMs)
  }

  #publish(): void {
    if (this.#disposed) return
    const { byId } = this.sessions.list.getSnapshot()
    const next: ChildSessionMaze[] = []
    let expanded = 0
    for (const entry of this.#catalog) {
      const id = entry.id
      if (this.#failed.has(id)) continue
      const running = this.#isRunning(id)
      const row = byId[id as SessionId] as { displayTitle?: string } | undefined
      const label = childLabel(id, entry, row)
      const held = this.#held.get(id)
      const cached = this.#settled.get(id)
      if (held !== undefined) {
        expanded += 1
        const live = held.chat?.getSnapshot()
        // A continuable child running again: keep showing the cached branch while the new hold loads.
        const shown = live !== undefined && live.order.length > 0 ? live : cached?.conversation
        if (shown === undefined) continue
        next.push({ id, label, running, conversation: shown })
        continue
      }
      if (cached !== undefined && !running) {
        next.push({ id, label: cached.label, running: false, conversation: cached.conversation })
        continue
      }
      // Beyond the cap: known but not expanded.
      if (expanded >= MAX_LIVE_CHILDREN) next.push({ id, label, running, conversation: null })
    }
    if (sameRoster(this.#snapshot, next)) return
    this.#snapshot = next
    for (const listener of [...this.#listeners]) {
      try { listener() } catch (error) { console.error('[dsh-maze] subagent roster subscriber threw:', error) }
    }
  }
}

/** Pick the roster implementation the host supports. */
export function createSubagentRoster(sessions: ISessions, conversations: UiConversation, sessionId: SessionId): SubagentRoster {
  return hostCanRetain(sessions)
    ? new RetainedSubagentRoster(sessions, conversations, sessionId)
    : new SubagentMazeSource(sessions, conversations, sessionId)
}
