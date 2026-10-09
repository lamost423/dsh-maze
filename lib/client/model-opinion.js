/**
 * Model review (diagnosis item 8): client side of the Host's `POST /api/maze.review`.
 *
 * Two rules this module exists to keep:
 *  - the prompt is authored by the page from its own deterministic analysis and shown
 *    to the user before it is sent, so nothing leaves the machine unreviewed;
 *  - the reply is returned verbatim as an *opinion* — it is never merged into the
 *    deterministic payload or any statistic.
 */
/** Must match `REVIEW_PATH` in src/index.ts (asserted by tests). */
export const REVIEW_PATH = '/api/maze.review';
/** Turn a Host error body into one honest code the UI can phrase itself. */
function errorText(status, body) {
    const code = body !== null && typeof body === 'object' ? String(body.error ?? '') : '';
    const detail = body !== null && typeof body === 'object' ? body.detail : undefined;
    const out = code === '' ? `HTTP ${status}` : code;
    return detail === undefined ? { error: out } : { error: out, detail: String(detail) };
}
/** Ask the Host's configured model to review one analysis payload. */
export async function askModel(request, signal) {
    try {
        const res = await fetch(REVIEW_PATH, {
            method: 'POST',
            signal: signal ?? null,
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ prompt: request.prompt, provider: request.provider ?? '', model: request.model ?? '' }),
        });
        const body = (await res.json().catch(() => null));
        if (!res.ok)
            return { ok: false, ...errorText(res.status, body) };
        const text = typeof body?.text === 'string' ? body.text : '';
        if (text.trim() === '')
            return { ok: false, error: 'empty-opinion' };
        return {
            ok: true,
            opinion: {
                text,
                provider: typeof body?.provider === 'string' ? body.provider : '',
                model: typeof body?.model === 'string' ? body.model : '',
            },
        };
    }
    catch (error) {
        return { ok: false, error: 'request-failed', detail: String(error) };
    }
}
//# sourceMappingURL=model-opinion.js.map