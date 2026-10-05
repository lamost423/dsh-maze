import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type TraceCompareKey } from './locales.ts';
export type { TraceCompareKey } from './locales.ts';
export type { TraceCompareTriggerProps } from './TraceCompareTrigger.tsx';
export type { TraceCompareSurfaceProps } from './TraceCompareSurface.tsx';
export type { TraceLiveViewProps } from './TraceLiveView.tsx';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Trace Compare trigger and surface copy. */
        traceCompare: TraceCompareKey;
    }
}
/** Required services for slot composition, the subagent child roster, per-session Conversation assembly, and localized copy. */
export declare const inject: string[];
/** Mount the trigger, center surface, and live per-session view with one apply-scoped viewing store. */
export declare function apply(ctx: ClientContext): Promise<() => Promise<void>>;
//# sourceMappingURL=index.d.ts.map