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
export declare const REVIEW_PATH = "/api/maze.review";
export interface ModelOpinionRequest {
    prompt: string;
    provider?: string | undefined;
    model?: string | undefined;
}
export interface ModelOpinion {
    text: string;
    provider: string;
    model: string;
}
export type ModelOpinionResult = {
    ok: true;
    opinion: ModelOpinion;
} | {
    ok: false;
    error: string;
    detail?: string;
};
/** Ask the Host's configured model to review one analysis payload. */
export declare function askModel(request: ModelOpinionRequest, signal?: AbortSignal): Promise<ModelOpinionResult>;
//# sourceMappingURL=model-opinion.d.ts.map