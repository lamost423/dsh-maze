/**
 * 宿主主题 → 迷宫 iframe 的同步。dsh 把暗色表达为 body[data-ds-dark-theme]
 * （ui-layout 的 ThemePresenter 所写，rc.6 与源码一致）；iframe 是 srcDoc 沙箱
 * 读不到宿主 DOM，所以宿主组件在 iframe 加载与主题变化时 postMessage
 * {kind:'trace-theme', mode} 进页面（照 trace-maze 的消息模式）。
 */

/** dsh 暗色主题的 body 布尔属性。 */
const DARK_ATTRIBUTE = 'data-ds-dark-theme'

/**
 * 当前宿主主题。
 * @returns 'dark' 当 body 带暗色属性，否则 'light'。
 */
export function hostThemeMode(): 'dark' | 'light' {
  return document.body.hasAttribute(DARK_ATTRIBUTE) ? 'dark' : 'light'
}

/**
 * 把当前宿主主题推给迷宫页面。
 * @param frame - 迷宫 iframe；null（未挂载）时不做事。
 */
export function postThemeTo(frame: HTMLIFrameElement | null): void {
  frame?.contentWindow?.postMessage({ kind: 'trace-theme', mode: hostThemeMode() }, '*')
}

/**
 * 监听宿主主题属性变化。
 * @param onChange - 主题属性翻转时的回调。
 * @returns 停止监听的函数。
 */
export function watchHostTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(() => { onChange() })
  observer.observe(document.body, { attributes: true, attributeFilter: [DARK_ATTRIBUTE] })
  return () => { observer.disconnect() }
}
