import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { currentSessionOf } from "./current-session.js";
import { postLocaleTo } from "./locale-sync.js";
import { MAZE_PAGE_HTML } from "./maze-html.js";
import { postThemeTo, themedMazeHtml, watchHostTheme } from "./theme-sync.js";
import { fetchLocalSessions, fetchSessionLog, rowLabel, rowTime } from "./session-library.js";
import { askModel } from "./model-opinion.js";
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
    // 本机会话库（诊断层第 7 项）：列表与日志都从宿主半的只读端点取；取数在应用外壳里做
    //（迷宫页在 sandbox 无 same-origin 的 iframe 里，自己 fetch 不到宿主），取回后 postMessage 推给页面。
    const [libOpen, setLibOpen] = useState(false);
    const [libRows, setLibRows] = useState(null);
    const [libError, setLibError] = useState(null);
    const [picked, setPicked] = useState([]);
    const [busy, setBusy] = useState(null);
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
            if (msg === null)
                return;
            if (msg.kind === 'trace-esc') {
                actions.close();
                return;
            }
            // 模型解读（诊断层第 8 项）：页面把已经给用户看过、确认过的提示词交上来，这里只负责
            // 调宿主路由并把回答原样送回——外壳不加工内容，也不把它混进任何确定性数据。
            if (msg.kind === 'maze-ask-model') {
                const target = iframeRef.current?.contentWindow;
                void askModel({
                    prompt: String(msg.prompt ?? ''),
                    provider: typeof msg.provider === 'string' ? msg.provider : undefined,
                    model: typeof msg.model === 'string' ? msg.model : undefined,
                }).then((res) => {
                    target?.postMessage(res.ok
                        ? { kind: 'maze-model-opinion', text: res.opinion.text, provider: res.opinion.provider, model: res.opinion.model }
                        : { kind: 'maze-model-opinion', error: res.error, detail: res.detail ?? '' }, '*');
                });
            }
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
    const libErrorText = (code) => code === 'host-has-no-session-query' ? t('lib.errNoQuery')
        : code === 'log-too-large' ? t('lib.errTooLarge')
            : `${t('lib.errGeneric')}${code}`;
    const refreshLib = async () => {
        setLibError(null);
        const res = await fetchLocalSessions();
        if (res.ok)
            setLibRows(res.sessions);
        else {
            setLibRows([]);
            setLibError(res.error);
        }
    };
    const onToggleLib = () => {
        const next = !libOpen;
        setLibOpen(next);
        if (next && libRows === null)
            void refreshLib();
    };
    const togglePick = (id) => {
        setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : (prev.length >= 5 ? prev : [...prev, id]));
    };
    const onCompare = async () => {
        const frame = iframeRef.current;
        if (frame === null || picked.length < 2 || busy !== null)
            return;
        const files = [];
        for (const [i, id] of picked.entries()) {
            setBusy(`${t('lib.reading')} ${String(i + 1)}/${String(picked.length)}…`);
            const res = await fetchSessionLog(id);
            if (!res.ok) {
                setBusy(null);
                setLibError(res.error);
                return;
            }
            files.push({ name: res.name, text: res.text });
        }
        setBusy(null);
        frame.contentWindow?.postMessage({ kind: 'maze-load', files }, '*');
    };
    if (!open)
        return null;
    return (_jsxs("div", { className: css.frame, children: [_jsx("button", { type: "button", className: css.close, title: t('surface.close'), "aria-label": t('surface.close'), onClick: () => { actions.close(); }, children: "\u2715" }), _jsxs("div", { className: css.lib, children: [_jsxs("button", { type: "button", className: css.libToggle, onClick: onToggleLib, children: [t('lib.title'), libRows === null ? '' : ` · ${String(libRows.length)}`] }), libOpen && (_jsxs("div", { className: css.libBody, children: [libError !== null && _jsx("div", { className: css.libErr, children: libErrorText(libError) }), busy !== null && _jsx("div", { className: css.libNote, children: busy }), libError === null && libRows === null && _jsx("div", { className: css.libNote, children: t('lib.loading') }), libRows !== null && libRows.length === 0 && libError === null && _jsx("div", { className: css.libNote, children: t('lib.empty') }), libRows?.map(row => (_jsxs("label", { className: css.libRow, children: [_jsx("input", { type: "checkbox", checked: picked.includes(row.id), onChange: () => { togglePick(row.id); } }), _jsx("span", { className: css.libName, title: row.cwd ?? '', children: rowLabel(row) }), _jsx("span", { className: css.libTime, children: rowTime(row) }), row.live && _jsx("span", { className: css.libLive, children: t('lib.live') })] }, row.id))), libRows !== null && libRows.length > 0 && (_jsxs("div", { className: css.libFoot, children: [_jsxs("button", { type: "button", disabled: picked.length < 2 || busy !== null, onClick: () => { void onCompare(); }, children: [t('lib.compare'), " ", String(picked.length)] }), _jsx("span", { className: css.libHint, children: t('lib.hint') })] }))] }))] }), _jsx("iframe", { ref: iframeRef, title: "trace-compare", className: css.iframe, srcDoc: srcDoc, sandbox: "allow-scripts allow-modals allow-downloads", onLoad: () => { postThemeTo(iframeRef.current); postLocaleTo(iframeRef.current, locale); } })] }));
}
//# sourceMappingURL=TraceCompareSurface.js.map