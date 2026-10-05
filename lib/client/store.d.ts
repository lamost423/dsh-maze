/** Shared transient visibility state for the trigger and center surface. */
import { type EngineStoreHandle } from '@deepseek-ai/dsh-client-store';
type TraceCompareViewState = {
    open: boolean;
};
type TraceCompareViewActions = {
    toggle: (draft: TraceCompareViewState) => void;
    close: (draft: TraceCompareViewState) => void;
};
/**
 * Create one Trace Compare viewing-store handle for an apply lifetime.
 * @returns the root-scoped handle shared by both slot entries.
 */
export declare function createTraceCompareViewStore(): EngineStoreHandle<TraceCompareViewState, TraceCompareViewActions>;
export {};
//# sourceMappingURL=store.d.ts.map