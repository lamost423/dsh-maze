/** Shared transient visibility state for the trigger and center surface. */
import { defineStore } from '@deepseek-ai/dsh-client-store';
/**
 * Create one Trace Compare viewing-store handle for an apply lifetime.
 * @returns the root-scoped handle shared by both slot entries.
 */
export function createTraceCompareViewStore() {
    return defineStore({
        init: () => ({ open: false }),
        actions: {
            toggle: (draft) => { draft.open = !draft.open; },
            close: (draft) => { draft.open = false; },
        },
    });
}
//# sourceMappingURL=store.js.map