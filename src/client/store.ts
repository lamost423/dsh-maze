/** Shared transient visibility state for the trigger and center surface. */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'

type TraceCompareViewState = {
  open: boolean
}

type TraceCompareViewActions = {
  toggle: (draft: TraceCompareViewState) => void
}

/**
 * Create one Trace Compare viewing-store handle for an apply lifetime.
 * @returns the root-scoped handle shared by both slot entries.
 */
export function createTraceCompareViewStore(): EngineStoreHandle<TraceCompareViewState, TraceCompareViewActions> {
  return defineStore({
    init: (): TraceCompareViewState => ({ open: false }),
    actions: {
      toggle: (draft) => { draft.open = !draft.open },
    },
  })
}
