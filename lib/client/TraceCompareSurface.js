import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef } from 'react';
import { currentSessionOf } from "./current-session.js";
import { postLocaleTo } from "./locale-sync.js";
import { MAZE_PAGE_HTML } from "./maze-html.js";
import { postThemeTo, themedMazeHtml, watchHostTheme } from "./theme-sync.js";
import css from './TraceCompareSurface.module.css';
/**
 * Root-scoped center surface: the self-contained maze upload page inside an
 * isolated iframe. The page parses uploaded session logs and renders the
 * exploration maze on a shared timeline; nothing here reaches the host.
 */
export function TraceCompareSurface({ useStore, actions, useSessions, locale, t }) {
    const open = useStore(state => state.open);
    // srcDoc 按本次打开时的宿主主题预置暗色（首帧防闪）；打开期间的主题翻转走
    // postMessage，不动 srcDoc——改了会整页重载丢状态。以 open 为键：面板常驻
    // 组件，两次打开之间主题可能已翻转。
    const srcDoc = useMemo(() => themedMazeHtml(MAZE_PAGE_HTML), [open]);
    const iframeRef = useRef(null);
    // Any Session navigation while the surface is open — sidebar selection or a
    // new Session — switches the conversation beneath this opaque surface, so it
    // closes to reveal it (mirrors the execution board). Host 0.1.6-alpha.2 moved the
    // selection off the Session list; currentSessionOf reads either shape.
    const currentSession = useSessions(currentSessionOf);
    const lastSession = useRef(currentSession);
    useEffect(() => {
        const changed = lastSession.current !== currentSession;
        lastSession.current = currentSession;
        if (open && changed)
            actions.close();
    }, [actions, currentSession, open]);
    // Host-level Esc plus the page's trace-esc relay: keydown lands inside the
    // iframe window once it has focus, so the page forwards Esc via postMessage.
    useEffect(() => {
        if (!open)
            return;
        const onKeyDown = (event) => {
            if (event.key === 'Escape')
                actions.close();
        };
        const onMessage = (event) => {
            if (event.source !== iframeRef.current?.contentWindow)
                return;
            const msg = event.data;
            if (msg !== null && msg.kind === 'trace-esc')
                actions.close();
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('message', onMessage);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('message', onMessage);
        };
    }, [actions, open]);
    // 宿主主题同步：iframe 加载时推一次，打开期间跟随宿主翻转。
    useEffect(() => {
        if (!open)
            return;
        return watchHostTheme(() => { postThemeTo(iframeRef.current); });
    }, [open]);
    // 宿主语言同步：打开时推一次，打开期间跟随语言切换（照主题同步的通道模式）。
    useEffect(() => {
        if (!open)
            return;
        postLocaleTo(iframeRef.current, locale);
        return locale.subscribe(() => { postLocaleTo(iframeRef.current, locale); });
    }, [locale, open]);
    if (!open)
        return null;
    return (_jsxs("div", { className: css.frame, children: [_jsx("button", { type: "button", className: css.close, title: t('surface.close'), "aria-label": t('surface.close'), onClick: () => { actions.close(); }, children: "\u2715" }), _jsx("iframe", { ref: iframeRef, title: "trace-compare", className: css.iframe, srcDoc: srcDoc, sandbox: "allow-scripts allow-modals allow-downloads", onLoad: () => { postThemeTo(iframeRef.current); postLocaleTo(iframeRef.current, locale); } })] }));
}
//# sourceMappingURL=TraceCompareSurface.js.map