/**
 * Host half: read-only endpoints behind the local session library (diagnosis item 7).
 *
 * Why a Host half at all: the browser half can list sessions and retain one, but a
 * retained cold session only yields the Host's first page of history (measured on a
 * 37 871-second, 120-step log: the snapshot came back as a 3 014-second window).
 * The complete log is only reachable in-process, where `sessionQuery` already reads
 * multi-frame `.jsonl.zstd` correctly — Node's own zstd decompressor silently
 * returns the first frame only, which is why the browser half must not read files
 * itself.
 *
 * Both routes are read-only, same-origin, and id-scoped: ids must come from the
 * Host's own session list, so there is no path input to traverse with.
 *
 * `inject: ['connection']` is the only required service — `connection` carries the
 * browser-reachable route registry. Optional services are looked up with
 * `Reflect.get` so a host without them answers 503 with a reason instead of failing
 * to load the plugin.
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-maze";
/** `connection` is the only browser-reachable route channel; without it the row just waits. */
export declare const inject: string[];
/** List of sessions known to the Host (metadata only). */
export declare const SESSIONS_PATH = "/api/maze.sessions";
/** Complete raw log of one session, as newline-delimited JSON events. */
export declare const LOG_PATH = "/api/maze.log";
/** Model review of one deterministic analysis (diagnosis item 8). POST, JSON in/out. */
export declare const REVIEW_PATH = "/api/maze.review";
interface StreamChunkLike {
    type?: string;
    text?: string;
    usage?: unknown;
    reason?: {
        kind?: string;
        failure?: {
            message?: string;
        };
    };
}
interface ReviewRoute {
    provider: string;
    model: string;
}
/** One row of the Host's session corpus, as this plugin reports it. */
export interface MazeSessionRow {
    id: string;
    cwd: string | null;
    createdAt: number;
    live: boolean;
    persisted: boolean;
    origin: string | null;
    parent: string | null;
}
interface SessionRecordLike {
    header: {
        id: string;
        cwd?: string;
        createdAt?: number;
        origin?: string;
        parentSession?: string;
    };
    live?: boolean;
    persisted?: boolean;
}
/** Compact one corpus record into the shape the browser half lists. */
export declare function toRow(record: SessionRecordLike): MazeSessionRow;
/** Newest first; subagent children are filtered out unless explicitly asked for. */
export declare function rowsOf(records: SessionRecordLike[], includeChildren?: boolean): MazeSessionRow[];
/**
 * UTF-8 byte length without importing Node types: the plugin compiles against the
 * client type environment too. Falls back to a UTF-16 estimate where Buffer is absent.
 */
export declare function byteLength(text: string): number;
/** Serialize a logical log back to the on-disk JSONL shape the page's parser reads. */
export declare function logText(events: unknown[]): string;
/**
 * Resolve the route for one review: the page's own numbers (the model that ran the
 * session) win, the host default is the fallback. Nothing is guessed: without either,
 * the route answers 409 so the UI can say "no model route" instead of failing late.
 */
export declare function resolveRoute(ctx: Context, body: {
    provider?: unknown;
    model?: unknown;
}): ReviewRoute | null;
/**
 * Read one assistant stream to completion: text deltas in, plus the terminal finish.
 * Rules copied from the host's own experimental-auto-review reviewer — data after the
 * finish is an error, a non-stop finish is an error, and empty text is an error, so a
 * truncated or failed call can never be shown as an opinion.
 */
export declare function readStream(stream: AsyncIterable<StreamChunkLike>): Promise<{
    text: string;
    usage: unknown;
}>;
export declare function apply(ctx: Context): void;
export {};
//# sourceMappingURL=index.d.ts.map