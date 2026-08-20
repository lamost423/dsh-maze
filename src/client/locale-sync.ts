/**
 * 宿主界面语言 → 迷宫 iframe 的同步。iframe 是 srcDoc 沙箱读不到宿主状态，
 * 所以宿主组件在 iframe 加载与语言变化时 postMessage {kind:'trace-locale', lang}
 * 进页面（照 trace-theme 的消息模式）；页面据此重写文案并全量重建。
 */
import type { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'

/**
 * 把当前宿主界面语言推给迷宫页面。
 * @param frame - 迷宫 iframe；null（未挂载）时不做事。
 * @param locale - 宿主 locale 服务。
 */
export function postLocaleTo(frame: HTMLIFrameElement | null, locale: LocaleRuntime): void {
  frame?.contentWindow?.postMessage({ kind: 'trace-locale', lang: locale.getLocale().active }, '*')
}
