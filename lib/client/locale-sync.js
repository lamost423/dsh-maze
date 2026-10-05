/**
 * 把当前宿主界面语言推给迷宫页面。
 * @param frame - 迷宫 iframe；null（未挂载）时不做事。
 * @param locale - 宿主 locale 服务。
 */
export function postLocaleTo(frame, locale) {
    frame?.contentWindow?.postMessage({ kind: 'trace-locale', lang: locale.getLocale().active }, '*');
}
//# sourceMappingURL=locale-sync.js.map