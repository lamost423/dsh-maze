/**
 * Shallow equality of roster snapshots. An unchanged roster must not re-publish:
 * host 0.2.0 notifies the session list on ANY session's projection change, and a
 * fresh array there would make the maze recompute on every notification.
 */
function sameRoster(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        const x = a[i], y = b[i];
        if (x.id !== y.id || x.label !== y.label || x.running !== y.running || x.conversation !== y.conversation)
            return false;
    }
    return true;
}
/** Catalog name first: on 0.1.5 an untitled child's displayTitle falls back to the workspace folder name. */
function childLabel(id, entry, row) {
    return entry?.label ?? row?.displayTitle ?? id;
}
/** Observable child roster consumed by TraceLiveView via useSyncExternalStore. */
export class SubagentMazeSource {
    sessions;
    conversations;
    sessionId;
    #children = new Map();
    #catalog = new Map();
    #snapshot = [];
    #listeners = new Set();
    #offList;
    #disposed = false;
    constructor(sessions, conversations, sessionId) {
        this.sessions = sessions;
        this.conversations = conversations;
        this.sessionId = sessionId;
        this.#offList = sessions.list.subscribe(() => { this.#sync(); });
        // Keep this parent's child catalog live so the roster learns about children
        // as they are spawned. This is read-only: it never selects a session.
        // Host ≤0.1.6 API; 0.1.7 removed both (catalog moved to parent projections,
        // children must be retain()ed before binding() resolves). Feature-detect.
        const legacy = sessions;
        legacy.setSubagentCatalogOpen?.(sessionId, true);
        Promise.resolve(legacy.refreshSubagents?.(sessionId)).then(() => { this.#sync(); }).catch(() => {
            // A parent with no children (or a host that refuses the catalog)
            // contributes an empty roster; the list subscription still retries.
        });
        this.#sync();
    }
    getSnapshot = () => this.#snapshot;
    subscribe = (listener) => {
        this.#listeners.add(listener);
        return () => { this.#listeners.delete(listener); };
    };
    /** Passive roster: the catalog only supplies names (membership stays the session list). */
    setCatalog(entries) {
        this.#catalog = new Map((entries ?? []).map(entry => [entry.id, entry]));
        this.#publish();
    }
    /** Idempotent: unsubscribes the list and every child projection. */
    dispose() {
        if (this.#disposed)
            return;
        this.#disposed = true;
        this.#offList();
        this.sessions.setSubagentCatalogOpen?.(this.sessionId, false);
        for (const child of this.#children.values())
            this.#release(child);
        this.#children.clear();
        this.#listeners.clear();
        this.#snapshot = [];
    }
    #release(child) {
        child.released = true;
        child.off?.();
        child.off = null;
        child.offChat?.();
        child.offChat = null;
        child.chat = null;
    }
    #sync() {
        if (this.#disposed)
            return;
        const { byId } = this.sessions.list.getSnapshot();
        const wanted = new Set();
        for (const row of Object.values(byId)) {
            // `ephemeral` is a capability-line field (fork side-chat children); the
            // published rc line never sets it, so the structural read stays true.
            const ephemeral = row.ephemeral;
            if (row.parentId === this.sessionId && row.origin === 'subagent' && ephemeral !== true) {
                wanted.add(row.id);
            }
        }
        for (const [id, child] of this.#children) {
            // Also drop a child whose binding changed under it. From host
            // 0.1.6-alpha.2 a child binds only while some view retains it (e.g. the
            // subagent sidebar); once released, the old face and chat target freeze
            // on their last frame, and a later retain hands out a new generation.
            // Older hosts cache the binding, so this never churns there.
            if (!wanted.has(id) || this.sessions.binding(id)?.session !== child.face) {
                this.#release(child);
                this.#children.delete(id);
            }
        }
        for (const id of wanted) {
            if (!this.#children.has(id))
                this.#track(id);
        }
        this.#publish();
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
    #track(id) {
        const face = this.sessions.binding(id)?.session;
        if (face === undefined)
            return;
        const child = { face, off: null, chat: null, offChat: null, released: false };
        this.#children.set(id, child);
        child.off = face.subscribe(() => { this.#publish(); });
        const chat = this.conversations.binding(id).target('chat');
        child.chat = chat;
        child.offChat = chat.subscribe(() => { this.#publish(); });
        this.#publish();
    }
    #publish() {
        if (this.#disposed)
            return;
        const { byId } = this.sessions.list.getSnapshot();
        const next = [];
        for (const [id, child] of this.#children) {
            if (child.off === null)
                continue;
            // Content, not openState, is the gate. The roster never opens a child
            // (see #track), so openState stays 'cold' for children it only observes;
            // an empty window simply contributes nothing rather than an empty lane.
            const conversation = child.chat?.getSnapshot();
            if (conversation === undefined || conversation.order.length === 0)
                continue;
            const row = byId[id];
            next.push({
                id,
                label: childLabel(id, this.#catalog.get(id), row),
                running: row?.running ?? false,
                conversation,
            });
        }
        if (sameRoster(this.#snapshot, next))
            return;
        this.#snapshot = next;
        for (const listener of [...this.#listeners]) {
            try {
                listener();
            }
            catch (error) {
                console.error('[ui-trace-compare] subagent roster subscriber threw:', error);
            }
        }
    }
}
/** Our reference source name, as the host's own views use `mainView` / `sidebarChat`. */
export const MAZE_RETAIN_SOURCE = 'maze';
/** Children followed live at once; the rest are counted, not drawn (吴昊 2026-10-01 拍板：8 个). */
export const MAX_LIVE_CHILDREN = 8;
/** After the list reports a child stopped running, how long to wait for its last events (turn/end) before settling anyway. */
export const SETTLE_GRACE_MS = 3000;
/** Child conversation cuts arrive per streamed chunk; publishes from that path are coalesced to one per this many ms. */
export const CHILD_PUBLISH_DELAY_MS = 250;
/** True when the host can hold a child session for us (0.1.6-alpha.2+). */
export function hostCanRetain(sessions) {
    return typeof sessions?.retain === 'function';
}
/** Module-level cache of settled children: survives tab switches, keyed by child session id. */
const settledCache = new Map();
/** Whether the conversation's latest turn has a recorded end (its turn/end reached the window). */
function lastTurnClosed(snap) {
    const order = snap.timeline.turnOrder;
    const lastTurn = order[order.length - 1];
    if (lastTurn === undefined)
        return false;
    const last = snap.timeline.turns.get(lastTurn);
    return last !== undefined && last.end !== undefined;
}
/** Host contract: `binding.session.getSnapshot().openState`; 'error' means the open attempt failed (ready resolves anyway). */
function openStateOf(binding) {
    const session = binding?.session;
    const state = session?.getSnapshot?.()?.openState;
    return typeof state === 'string' ? state : undefined;
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
export class RetainedSubagentRoster {
    sessions;
    conversations;
    sessionId;
    #held = new Map();
    #settled = new Map();
    /**
     * Children the host refused (retain threw, open failed, no mode) → whether the child was running
     * at the time. Not retried until the catalog changes — or, for a refusal seen while the child was
     * not running (possibly transient: descriptor not there yet), until it starts running.
     */
    #failed = new Map();
    #catalog = [];
    #catalogKey = '';
    #snapshot = [];
    #listeners = new Set();
    #offList;
    #disposed = false;
    #syncing = false;
    #syncPending = false;
    #publishTimer = null;
    #cache;
    #settleGraceMs;
    #publishDelayMs;
    constructor(sessions, conversations, sessionId, options = {}) {
        this.sessions = sessions;
        this.conversations = conversations;
        this.sessionId = sessionId;
        this.#cache = options.cache ?? settledCache;
        this.#settleGraceMs = options.settleGraceMs ?? SETTLE_GRACE_MS;
        this.#publishDelayMs = options.publishDelayMs ?? CHILD_PUBLISH_DELAY_MS;
        // Running flags and retention counts live on the session list; re-evaluate holds on every change.
        this.#offList = sessions.list.subscribe(() => { this.#sync(); });
    }
    getSnapshot = () => this.#snapshot;
    subscribe = (listener) => {
        this.#listeners.add(listener);
        return () => { this.#listeners.delete(listener); };
    };
    setCatalog(entries) {
        const list = [...(entries ?? [])];
        const key = list.map(e => e.id).join('\n');
        // A changed catalog is the one moment a refused hold is worth retrying.
        if (key !== this.#catalogKey) {
            this.#catalogKey = key;
            this.#failed.clear();
        }
        this.#catalog = list;
        this.#sync();
    }
    dispose() {
        if (this.#disposed)
            return;
        this.#disposed = true;
        this.#offList();
        if (this.#publishTimer !== null) {
            clearTimeout(this.#publishTimer);
            this.#publishTimer = null;
        }
        const held = [...this.#held.values()];
        this.#held.clear();
        for (const child of held)
            this.#release(child);
        this.#listeners.clear();
        this.#snapshot = [];
    }
    #release(child) {
        if (child.released)
            return;
        child.released = true;
        if (child.graceTimer !== null) {
            clearTimeout(child.graceTimer);
            child.graceTimer = null;
        }
        child.offChat?.();
        child.offChat = null;
        child.chat = null;
        // release() publishes the retention count to the list synchronously → re-enters #sync (deferred by its guard).
        try {
            child.ref?.release();
        }
        catch (error) {
            console.error('[dsh-maze] releasing a child session threw:', error);
        }
    }
    #isRunning(id) {
        const row = this.sessions.list.getSnapshot().byId[id];
        return row?.running === true;
    }
    /** Re-entrancy guard around #syncOnce: nested notifications (from retain/release) run once afterwards. */
    #sync() {
        if (this.#disposed)
            return;
        if (this.#syncing) {
            this.#syncPending = true;
            return;
        }
        this.#syncing = true;
        try {
            this.#syncOnce();
        }
        finally {
            this.#syncing = false;
        }
        if (this.#syncPending) {
            this.#syncPending = false;
            this.#sync();
        }
    }
    /** Decide which catalog children to hold, hold/release accordingly, settle what finished, then publish. */
    #syncOnce() {
        const wanted = new Set();
        let expanded = 0;
        for (const entry of this.#catalog) {
            const id = entry.id;
            const running = this.#isRunning(id);
            const failedWhileRunning = this.#failed.get(id);
            if (failedWhileRunning !== undefined) {
                if (running && !failedWhileRunning)
                    this.#failed.delete(id); // it started running since: worth one more try
                else
                    continue;
            }
            // A settled child already read is served from the cache; a held one stays until it settles.
            if (!running && !this.#held.has(id) && (this.#settled.has(id) || this.#cache.has(id))) {
                if (!this.#settled.has(id))
                    this.#settled.set(id, this.#cache.get(id));
                continue;
            }
            if (expanded >= MAX_LIVE_CHILDREN)
                continue;
            expanded += 1;
            wanted.add(id);
        }
        for (const [id, child] of [...this.#held]) {
            if (!wanted.has(id)) {
                this.#held.delete(id);
                this.#release(child);
            }
        }
        for (const entry of this.#catalog) {
            if (wanted.has(entry.id) && !this.#held.has(entry.id))
                this.#hold(entry);
        }
        // A child can stop running on the list without a new conversation cut: re-check every held child
        // here (#settleIfDone also resets the grace clock of a child that started running again).
        for (const id of [...this.#held.keys()])
            this.#settleIfDone(id);
        this.#publish();
    }
    #hold(entry) {
        const api = this.sessions;
        if (typeof api.retain !== 'function')
            return;
        // Never guess the mode: hosts before 0.1.7 reject an address whose mode does not match the child.
        if (typeof entry.mode !== 'string') {
            this.#failed.set(entry.id, this.#isRunning(entry.id));
            return;
        }
        const child = { ref: null, chat: null, offChat: null, released: false, stoppedAt: null, graceTimer: null };
        // Claim the slot BEFORE calling the host: retain() notifies the session list synchronously,
        // and the nested #sync must already see this child as held or it would hold it again.
        this.#held.set(entry.id, child);
        let ref;
        try {
            // The full subagent address is required: the host refuses to follow a child by bare id.
            ref = api.retain({ parentSessionId: this.sessionId, childSessionId: entry.id, mode: entry.mode }, { source: MAZE_RETAIN_SOURCE });
        }
        catch (error) {
            console.error('[dsh-maze] could not hold child session', entry.id, error);
            this.#held.delete(entry.id);
            this.#failed.set(entry.id, this.#isRunning(entry.id));
            return;
        }
        if (child.released || this.#disposed) {
            // Dropped during the host's synchronous notification: give the reference straight back.
            try {
                ref.release();
            }
            catch (error) {
                console.error('[dsh-maze] releasing a child session threw:', error);
            }
            return;
        }
        child.ref = ref;
        ref.ready.then(() => {
            if (child.released || this.#disposed)
                return;
            if (openStateOf(ref.binding) === 'error') {
                // The host could not open this child (`ready` resolves anyway): free the slot, do not retry until the catalog changes.
                this.#drop(entry.id, child);
                return;
            }
            try {
                const chat = this.conversations.binding(ref.binding).target('chat');
                child.chat = chat;
                const off = chat.subscribe(() => { this.#onChildChange(entry.id); });
                child.offChat = off;
                // The host's Chat target calls a new subscriber synchronously on first activation; when that
                // callback already settled and released this child, the unsubscribe handed back must run now.
                if (child.released) {
                    off();
                    child.offChat = null;
                }
            }
            catch (error) {
                console.error('[dsh-maze] could not follow child conversation', entry.id, error);
                this.#drop(entry.id, child);
                return;
            }
            this.#onChildChange(entry.id);
        }).catch(() => {
            // `ready` rejects once the reference is released (host contract: nothing left to do) — or when the
            // open threw a programming error; then the child must not sit on a slot with no conversation.
            if (!child.released && !this.#disposed)
                this.#drop(entry.id, child);
        });
    }
    /** Give up on a child the host refused: release it, remember the refusal, publish. */
    #drop(id, child) {
        this.#failed.set(id, this.#isRunning(id));
        this.#held.delete(id);
        this.#release(child);
        this.#publish();
    }
    /**
     * A held child that is no longer running: cache it and release the hold — but only once its
     * conversation shows the last turn closed. The list's running flag flips synchronously on the
     * host while the follow stream delivers the last events later; settling on the flip alone would
     * cache a truncated conversation for good. A grace period bounds the wait.
     */
    #settleIfDone(id, now = Date.now()) {
        const child = this.#held.get(id);
        if (child === undefined || child.released)
            return;
        if (this.#isRunning(id)) {
            child.stoppedAt = null;
            if (child.graceTimer !== null) {
                clearTimeout(child.graceTimer);
                child.graceTimer = null;
            }
            return;
        }
        const conversation = child.chat?.getSnapshot();
        if (conversation === undefined || conversation.order.length === 0)
            return; // nothing to cache yet: keep holding
        if (!lastTurnClosed(conversation)) {
            if (child.stoppedAt === null)
                child.stoppedAt = now;
            const waited = now - child.stoppedAt;
            if (waited < this.#settleGraceMs) {
                if (child.graceTimer === null) {
                    child.graceTimer = setTimeout(() => { child.graceTimer = null; this.#onChildChange(id); }, this.#settleGraceMs - waited);
                }
                return;
            }
        }
        const entry = this.#catalog.find(e => e.id === id);
        const row = this.sessions.list.getSnapshot().byId[id];
        const settled = { label: childLabel(id, entry, row), conversation };
        this.#settled.set(id, settled);
        this.#cache.set(id, settled);
        this.#held.delete(id);
        this.#release(child);
    }
    /** A held child's conversation changed (or its hold just became ready, or its grace period ended). */
    #onChildChange(id) {
        if (this.#disposed)
            return;
        this.#settleIfDone(id);
        this.#schedulePublish();
    }
    /** Streaming children change their conversation per chunk: coalesce those publishes. */
    #schedulePublish() {
        if (this.#publishDelayMs <= 0) {
            this.#publish();
            return;
        }
        if (this.#publishTimer !== null)
            return;
        this.#publishTimer = setTimeout(() => { this.#publishTimer = null; this.#publish(); }, this.#publishDelayMs);
    }
    #publish() {
        if (this.#disposed)
            return;
        const { byId } = this.sessions.list.getSnapshot();
        const next = [];
        let expanded = 0;
        for (const entry of this.#catalog) {
            const id = entry.id;
            if (this.#failed.has(id))
                continue;
            const running = this.#isRunning(id);
            const row = byId[id];
            const label = childLabel(id, entry, row);
            const held = this.#held.get(id);
            const cached = this.#settled.get(id);
            if (held !== undefined) {
                expanded += 1;
                const live = held.chat?.getSnapshot();
                // A continuable child running again: keep showing the cached branch while the new hold loads.
                const shown = live !== undefined && live.order.length > 0 ? live : cached?.conversation;
                if (shown === undefined)
                    continue;
                next.push({ id, label, running, conversation: shown });
                continue;
            }
            if (cached !== undefined && !running) {
                next.push({ id, label: cached.label, running: false, conversation: cached.conversation });
                continue;
            }
            // Beyond the cap: known but not expanded.
            if (expanded >= MAX_LIVE_CHILDREN)
                next.push({ id, label, running, conversation: null });
        }
        if (sameRoster(this.#snapshot, next))
            return;
        this.#snapshot = next;
        for (const listener of [...this.#listeners]) {
            try {
                listener();
            }
            catch (error) {
                console.error('[dsh-maze] subagent roster subscriber threw:', error);
            }
        }
    }
}
/** Pick the roster implementation the host supports. */
export function createSubagentRoster(sessions, conversations, sessionId) {
    return hostCanRetain(sessions)
        ? new RetainedSubagentRoster(sessions, conversations, sessionId)
        : new SubagentMazeSource(sessions, conversations, sessionId);
}
//# sourceMappingURL=subagent-lanes.js.map