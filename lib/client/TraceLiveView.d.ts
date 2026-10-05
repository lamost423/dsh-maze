import type { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client';
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import type { ConvViewProps, UiConversation } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
/**
 * Live maze view: a per-session conversation tab that mirrors the current
 * session's execution as a growing exploration maze. Subscribes to the
 * conversation snapshot (real-time) and pushes converted payloads into the
 * shared maze page inside an isolated iframe. The page's detail panel posts
 * trace-jump messages back; this component answers them by switching the
 * column to the Chat view and revealing the step's row.
 */
export declare function TraceLiveView({ useChat, useTrajectory, sessionId, sessions, conversations, locale, t, useProjection }: TraceLiveViewProps): import("react/jsx-runtime").JSX.Element;
/** Live view props: the conversation view runtime kit, the sessions service, the host locale service, and locale copy. */
export type TraceLiveViewProps = ConvViewProps & PropsLocale<'traceCompare'> & {
    /** Root sessions service; supplies the subagent child roster and projections. */
    sessions: ISessions;
    /** Per-session Conversation assembly; the roster binds each child's Chat target through it. */
    conversations: UiConversation;
    /** 宿主 locale 服务：iframe 页面文案跟随其 active 语言。 */
    locale: LocaleRuntime;
};
//# sourceMappingURL=TraceLiveView.d.ts.map