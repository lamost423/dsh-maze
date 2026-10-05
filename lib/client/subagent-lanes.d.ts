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
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { UiConversation } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { ChildSessionMaze } from './live-data.ts';
/** A row of the host's subagent catalog projection (host 0.1.5+); only `id` is relied on. */
export interface CatalogEntryLike {
    readonly id: string;
    readonly createdAt?: number;
    readonly mode?: string;
    readonly label?: string;
}
/** What TraceLiveView consumes; both roster implementations satisfy it. */
export interface SubagentRoster extends ObservableSnapshot<readonly ChildSessionMaze[]> {
    /** The parent's catalog as the host projects it (names; membership where the roster holds children). */
    setCatalog(entries: readonly CatalogEntryLike[] | undefined): void;
    /** Idempotent: unsubscribes and releases everything the roster holds. */
    dispose(): void;
}
/** Observable child roster consumed by TraceLiveView via useSyncExternalStore. */
export declare class SubagentMazeSource implements SubagentRoster {
    #private;
    private readonly sessions;
    private readonly conversations;
    private readonly sessionId;
    constructor(sessions: ISessions, conversations: UiConversation, sessionId: SessionId);
    getSnapshot: () => readonly ChildSessionMaze[];
    subscribe: (listener: () => void) => (() => void);
    /** Passive roster: the catalog only supplies names (membership stays the session list). */
    setCatalog(entries: readonly CatalogEntryLike[] | undefined): void;
    /** Idempotent: unsubscribes the list and every child projection. */
    dispose(): void;
}
/** Our reference source name, as the host's own views use `mainView` / `sidebarChat`. */
export declare const MAZE_RETAIN_SOURCE = "maze";
/** Children followed live at once; the rest are counted, not drawn (吴昊 2026-10-01 拍板：8 个). */
export declare const MAX_LIVE_CHILDREN = 8;
/** After the list reports a child stopped running, how long to wait for its last events (turn/end) before settling anyway. */
export declare const SETTLE_GRACE_MS = 3000;
/** Child conversation cuts arrive per streamed chunk; publishes from that path are coalesced to one per this many ms. */
export declare const CHILD_PUBLISH_DELAY_MS = 250;
/** True when the host can hold a child session for us (0.1.6-alpha.2+). */
export declare function hostCanRetain(sessions: unknown): boolean;
/** A settled child read once and released; replayed from here when the tab comes back. */
export interface SettledChild {
    label: string;
    conversation: ChatSnapshot;
}
/** Construction knobs; production uses the defaults, tests shorten the timers and pass their own cache. */
export interface RetainedRosterOptions {
    cache?: Map<string, SettledChild>;
    settleGraceMs?: number;
    publishDelayMs?: number;
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
export declare class RetainedSubagentRoster implements SubagentRoster {
    #private;
    private readonly sessions;
    private readonly conversations;
    private readonly sessionId;
    constructor(sessions: ISessions, conversations: UiConversation, sessionId: SessionId, options?: RetainedRosterOptions);
    getSnapshot: () => readonly ChildSessionMaze[];
    subscribe: (listener: () => void) => (() => void);
    setCatalog(entries: readonly CatalogEntryLike[] | undefined): void;
    dispose(): void;
}
/** Pick the roster implementation the host supports. */
export declare function createSubagentRoster(sessions: ISessions, conversations: UiConversation, sessionId: SessionId): SubagentRoster;
//# sourceMappingURL=subagent-lanes.d.ts.map