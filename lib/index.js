export const name = 'dsh-maze';
/** `connection` is the only browser-reachable route channel; without it the row just waits. */
export const inject = ['connection'];
/** List of sessions known to the Host (metadata only). */
export const SESSIONS_PATH = '/api/maze.sessions';
/** Complete raw log of one session, as newline-delimited JSON events. */
export const LOG_PATH = '/api/maze.log';
/** Refuse absurd logs rather than trying to serialize them into one response. */
const MAX_LOG_BYTES = 96 * 1024 * 1024;
function connectionOf(ctx) {
    return Reflect.get(ctx, 'connection');
}
/**
 * Optional host services. `ctx.get(name)` is cordis's own lookup: it returns
 * undefined for a service this plugin did not inject, whereas plain property
 * access throws ("cannot get property X without inject").
 */
function serviceOf(ctx, key) {
    const get = ctx.get;
    if (typeof get === 'function') {
        try {
            return get.call(ctx, key);
        }
        catch {
            return undefined;
        }
    }
    try {
        return Reflect.get(ctx, key);
    }
    catch {
        return undefined;
    }
}
function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
}
/** Compact one corpus record into the shape the browser half lists. */
export function toRow(record) {
    const h = record.header ?? {};
    return {
        id: String(h.id ?? ''),
        cwd: h.cwd ?? null,
        createdAt: Number(h.createdAt ?? 0),
        live: record.live === true,
        persisted: record.persisted === true,
        origin: h.origin ?? null,
        parent: h.parentSession ?? null,
    };
}
/** Newest first; subagent children are filtered out unless explicitly asked for. */
export function rowsOf(records, includeChildren = false) {
    return records
        .map(toRow)
        .filter((r) => r.id !== '' && (includeChildren || (r.origin == null && r.parent == null)))
        .sort((a, b) => b.createdAt - a.createdAt);
}
/**
 * UTF-8 byte length without importing Node types: the plugin compiles against the
 * client type environment too. Falls back to a UTF-16 estimate where Buffer is absent.
 */
export function byteLength(text) {
    const buf = globalThis.Buffer;
    return buf === undefined ? text.length * 2 : buf.byteLength(text);
}
/** Serialize a logical log back to the on-disk JSONL shape the page's parser reads. */
export function logText(events) {
    const lines = [];
    for (const event of events) {
        if (event === null || typeof event !== 'object')
            continue;
        lines.push(JSON.stringify(event));
    }
    return lines.join('\n');
}
export function apply(ctx) {
    const connection = connectionOf(ctx);
    if (connection?.fetch?.register === undefined)
        return;
    connection.fetch.register({
        path: SESSIONS_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: async (request) => {
            const query = serviceOf(ctx, 'sessionQuery');
            if (query?.listSessions === undefined) {
                return json({ error: 'session-query-unavailable', detail: 'this host has no session-query service' }, 503);
            }
            const url = new URL(request.url, 'http://localhost');
            const records = await query.listSessions();
            return json({ sessions: rowsOf(records, url.searchParams.get('children') === 'true') });
        },
    });
    connection.fetch.register({
        path: LOG_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: async (request) => {
            const query = serviceOf(ctx, 'sessionQuery');
            if (query?.listSessions === undefined || query.readSession === undefined) {
                return json({ error: 'session-query-unavailable', detail: 'this host exposes no readSession' }, 503);
            }
            const id = new URL(request.url, 'http://localhost').searchParams.get('sessionId') ?? '';
            if (id === '')
                return json({ error: 'missing-sessionId' }, 400);
            // ID-scoped on purpose: only sessions the Host itself lists may be read.
            const records = await query.listSessions();
            if (!records.some((r) => String(r.header?.id ?? '') === id))
                return json({ error: 'unknown-session' }, 404);
            const loaded = await query.readSession(id);
            const events = Array.isArray(loaded?.events) ? loaded.events : [];
            const text = logText(events);
            const bytes = byteLength(text);
            if (bytes > MAX_LOG_BYTES)
                return json({ error: 'log-too-large', bytes, limit: MAX_LOG_BYTES }, 413);
            return new Response(text, {
                headers: {
                    'content-type': 'application/x-ndjson; charset=utf-8',
                    'cache-control': 'no-store',
                    'x-maze-events': String(events.length),
                },
            });
        },
    });
}
//# sourceMappingURL=index.js.map