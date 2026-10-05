import type { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client';
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { createTraceCompareViewStore } from './store.ts';
/**
 * Root-scoped center surface: the self-contained maze upload page inside an
 * isolated iframe. The page parses uploaded session logs and renders the
 * exploration maze on a shared timeline; nothing here reaches the host.
 */
export declare function TraceCompareSurface({ useStore, actions, useSessions, locale, t }: TraceCompareSurfaceProps): import("react/jsx-runtime").JSX.Element | null;
/** Center surface props: the runtime kit (session navigation), the shared view store, and the host locale service. */
export type TraceCompareSurfaceProps = PropsRuntime<'shell.overlay'> & PropsStore<ReturnType<typeof createTraceCompareViewStore>> & PropsLocale<'traceCompare'> & {
    /** 宿主 locale 服务：iframe 页面文案跟随其 active 语言。 */
    locale: LocaleRuntime;
};
//# sourceMappingURL=TraceCompareSurface.d.ts.map