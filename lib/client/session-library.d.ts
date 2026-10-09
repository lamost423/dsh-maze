/**
 * Local session library (diagnosis item 7): client side of the Host's two read-only
 * routes. Fetching happens here — in the app shell — because the maze page runs in a
 * sandboxed iframe without `allow-same-origin`, so it cannot call the Host itself;
 * the surface hands the fetched text to the page over postMessage instead.
 *
 * Failure is reported, never papered over: a Host without the session-query service
 * answers 503 and the panel says exactly that instead of showing an empty list.
 */
/** Must match `SESSIONS_PATH` in src/index.ts (asserted by tests/host-routes.test.ts). */
export declare const SESSIONS_PATH = "/api/maze.sessions";
/** Must match `LOG_PATH` in src/index.ts. */
export declare const LOG_PATH = "/api/maze.log";
/** One session row as the Host reports it. */
export interface LocalSessionRow {
    id: string;
    cwd: string | null;
    createdAt: number;
    live: boolean;
    persisted: boolean;
    origin: string | null;
    parent: string | null;
}
export type SessionListResult = {
    ok: true;
    sessions: LocalSessionRow[];
} | {
    ok: false;
    error: string;
};
export type SessionLogResult = {
    ok: true;
    name: string;
    text: string;
    events: number;
} | {
    ok: false;
    error: string;
};
/** List the Host's top-level sessions (newest first). */
export declare function fetchLocalSessions(signal?: AbortSignal): Promise<SessionListResult>;
/** Fetch one session's complete logical log as the JSONL text the page's parser reads. */
export declare function fetchSessionLog(id: string, signal?: AbortSignal): Promise<SessionLogResult>;
/** Label for one row: workspace directory name plus date, the two things people recognize. */
export declare function rowLabel(row: LocalSessionRow): string;
/** Format a row's creation time compactly. */
export declare function rowTime(row: LocalSessionRow): string;
//# sourceMappingURL=session-library.d.ts.map