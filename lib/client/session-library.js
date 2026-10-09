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
export const SESSIONS_PATH = '/api/maze.sessions';
/** Must match `LOG_PATH` in src/index.ts. */
export const LOG_PATH = '/api/maze.log';
/** Turn a Host error body into one honest line. */
function errorText(status, body) {
    const code = body !== null && typeof body === 'object' ? String(body.error ?? '') : '';
    if (code === 'session-query-unavailable')
        return 'host-has-no-session-query';
    if (code === 'log-too-large')
        return 'log-too-large';
    if (code === 'unknown-session')
        return 'unknown-session';
    if (code === 'missing-sessionId')
        return 'missing-session';
    return code === '' ? `HTTP ${status}` : code;
}
/** List the Host's top-level sessions (newest first). */
export async function fetchLocalSessions(signal) {
    try {
        const res = await fetch(SESSIONS_PATH, { signal: signal ?? null, headers: { accept: 'application/json' } });
        const body = (await res.json().catch(() => null));
        if (!res.ok)
            return { ok: false, error: errorText(res.status, body) };
        const sessions = Array.isArray(body?.sessions) ? body?.sessions : [];
        return { ok: true, sessions };
    }
    catch (error) {
        return { ok: false, error: String(error) };
    }
}
/** Fetch one session's complete logical log as the JSONL text the page's parser reads. */
export async function fetchSessionLog(id, signal) {
    try {
        const res = await fetch(`${LOG_PATH}?sessionId=${encodeURIComponent(id)}`, {
            signal: signal ?? null,
            headers: { accept: 'application/x-ndjson' },
        });
        if (!res.ok) {
            const body = (await res.json().catch(() => null));
            return { ok: false, error: errorText(res.status, body) };
        }
        const text = await res.text();
        const events = Number(res.headers.get('x-maze-events') ?? '0');
        return { ok: true, name: `${id.replace(/^session-/, '').slice(0, 12)}.jsonl`, text, events: Number.isFinite(events) ? events : 0 };
    }
    catch (error) {
        return { ok: false, error: String(error) };
    }
}
/** Label for one row: workspace directory name plus date, the two things people recognize. */
export function rowLabel(row) {
    const dir = row.cwd === null || row.cwd === '' ? '?' : (row.cwd.split('/').filter(Boolean).pop() ?? row.cwd);
    return dir;
}
/** Format a row's creation time compactly. */
export function rowTime(row) {
    if (!Number.isFinite(row.createdAt) || row.createdAt <= 0)
        return '—';
    const d = new Date(row.createdAt);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
//# sourceMappingURL=session-library.js.map