import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { createTraceCompareViewStore } from './store.ts';
/** Sidebar entry that toggles the root-scoped Trace Compare surface. */
export declare function TraceCompareTrigger({ wide, useStore, actions, t }: TraceCompareTriggerProps): import("react/jsx-runtime").JSX.Element;
/** Sidebar trigger props: owner column state, shared view store, and copy. */
export type TraceCompareTriggerProps = PropsRuntime<'sidebar.footer.action'> & PropsStore<ReturnType<typeof createTraceCompareViewStore>> & PropsLocale<'traceCompare'>;
//# sourceMappingURL=TraceCompareTrigger.d.ts.map