import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { snapshotToMazeData } from "./live-data.js";
import { postLocaleTo } from "./locale-sync.js";
import { MAZE_PAGE_HTML } from "./maze-html.js";
import { createSubagentRoster } from "./subagent-lanes.js";
import { postThemeTo, themedMazeHtml, watchHostTheme } from "./theme-sync.js";
import css from './TraceLiveView.module.css';
/** How long the jump keeps polling for the target chat row before giving up (chat may still be rendering). */
const JUMP_SEEK_TRIES = 40;
const JUMP_SEEK_INTERVAL_MS = 100;
/**
 * Switch this conversation column to the Chat view and reveal the step's row.
 * DOM-routed on purpose: the per-session chat store (view/inspect) is private
 * to ui-conversation's apply scope, so the plugin drives the visible controls
 * instead — the first `role=tab` button is the Chat tab (order 0), tool rows
 * carry `data-chat-call-id`, and a turn's closing assistant message carries
 * `id="dsh-message-<seq>"`. Works unchanged against stock dsh (rc.6). Rows
 * older than the chat's loaded window are not found; the jump then degrades
 * to the view switch alone.
 */
function jumpToChat(frame, msg) {
    const scrollport = frame.closest('[data-conversation-scroll]');
    if (scrollport === null)
        return;
    const column = scrollport.parentElement;
    if (column === null)
        return;
    const chatTab = column.querySelector('[role="tablist"] [role="tab"]');
    if (chatTab instanceof HTMLElement)
        chatTab.click();
    const selector = msg.callId !== undefined
        ? `[data-chat-call-id="${CSS.escape(msg.callId)}"]`
        : msg.seq !== undefined ? `[id="dsh-message-${String(msg.seq)}"]` : null;
    if (selector === null)
        return;
    let tries = 0;
    const seek = () => {
        const target = scrollport.querySelector(selector);
        if (target instanceof HTMLElement) {
            target.scrollIntoView({ block: 'center', behavior: 'smooth' });
            target.animate([{ boxShadow: '0 0 0 3px rgba(45, 106, 143, 0.75)' }, { boxShadow: '0 0 0 3px rgba(45, 106, 143, 0)' }], { duration: 1800, easing: 'ease-out' });
            return;
        }
        tries += 1;
        if (tries < JUMP_SEEK_TRIES)
            setTimeout(seek, JUMP_SEEK_INTERVAL_MS);
    };
    seek();
}
/** Stable stand-ins while the roster is not built yet (first render, or between session switches). */
const NO_CHILDREN = [];
const noRosterSubscribe = () => () => { };
const noChildren = () => NO_CHILDREN;
/**
 * Live maze view: a per-session conversation tab that mirrors the current
 * session's execution as a growing exploration maze. Subscribes to the
 * conversation snapshot (real-time) and pushes converted payloads into the
 * shared maze page inside an isolated iframe. The page's detail panel posts
 * trace-jump messages back; this component answers them by switching the
 * column to the Chat view and revealing the step's row.
 */
export function TraceLiveView({ useChat, useTrajectory, sessionId, sessions, conversations, locale, t, useProjection }) {
    // Conversation content moved off the Session snapshot in host 0.1.2; the
    // maze reads the Chat target, which owns the ordered node stream.
    const snapshot = useChat(s => s);
    // Model identity rides the Trajectory target: it is assembled from the
    // durable request/header events, which never reach the Chat nodes.
    const requests = useTrajectory(s => s.requests);
    // One roster per (service, session); disposed with the view or on session switch.
    // Built in an effect, not in render: the roster subscribes to the session list
    // and follows child sessions as soon as it exists, and React may discard a
    // render (concurrent rendering) — a roster built there would never be disposed.
    const [source, setSource] = useState(null);
    useEffect(() => {
        const roster = createSubagentRoster(sessions, conversations, sessionId);
        setSource(roster);
        return () => { roster.dispose(); };
    }, [sessions, conversations, sessionId]);
    const children = useSyncExternalStore(source?.subscribe ?? noRosterSubscribe, source?.getSnapshot ?? noChildren);
    // 父会话的子代理目录（宿主 0.1.5 起的投影；0.1.2 没有，读到 undefined）：持有式花名册靠它定成员，
    // 被动式花名册只拿它当名字来源。投影值按宿主的折叠切面稳定，可直接当依赖。
    const catalogRaw = useProjection('subagentCatalog');
    const catalog = useMemo(() => {
        if (!Array.isArray(catalogRaw))
            return undefined;
        const out = [];
        for (const item of catalogRaw) {
            if (item === null || typeof item !== 'object')
                continue;
            const e = item;
            if (typeof e.id !== 'string')
                continue;
            out.push({
                id: e.id,
                ...(typeof e.createdAt === 'number' ? { createdAt: e.createdAt } : {}),
                ...(typeof e.mode === 'string' ? { mode: e.mode } : {}),
                ...(typeof e.label === 'string' ? { label: e.label } : {}),
            });
        }
        return out;
    }, [catalogRaw]);
    useEffect(() => { source?.setCatalog(catalog); }, [source, catalog]);
    // 宿主上下文指示器读的同一份投影（token-meter 的 contextPressure，0.1.0-rc.8 起字段不变）：
    // 当前模型的窗口真值优先于模型表。没装 token-meter 时读到 undefined，退回查表。
    const pressureRaw = useProjection('contextPressure');
    const hostWindow = ((v) => {
        if (v === null || typeof v !== 'object')
            return undefined;
        const w = v.contextWindow;
        return typeof w === 'number' && Number.isFinite(w) && w > 0 ? w : undefined;
    })(pressureRaw);
    // 宿主 fork 注册的 modelIdentity 投影：host 侧折叠全量日志，覆盖面比浏览器侧的
    // 事件窗口宽（窗口滚出去的早期请求头它还留着）。0.1.2 起 Trajectory target 已经
    // 原生带模型身份，所以这条降级成兜底；stock dsh 没有这个键，读到 undefined 自然降级
    //（照 SessionFace.open 的 fork 能力探测模式）。键在投影表类型之外，断言调用。
    const identityRaw = useProjection('modelIdentity');
    const hostModel = ((v) => {
        if (v === null || typeof v !== 'object')
            return null;
        const m = v.model;
        return typeof m === 'string' && m !== '' ? m : null;
    })(identityRaw);
    // 一秒时钟（吴昊 2026-10-01 拍板）：只在父会话或某个子代理运行中时走，页签不可见时不走；
    // 运行中的步骤与子代理支路以它为「现在」向右生长，不用等新快照。
    const [now, setNow] = useState(() => Date.now());
    const data = useMemo(() => {
        const d = snapshotToMazeData(snapshot, children, requests, { now, ...(hostWindow === undefined ? {} : { hostWindow }) });
        const lane = d?.lanes[0];
        // Trajectory 的请求级身份更精确，优先；窗口外的早期请求靠 fork 投影兜。
        if (lane !== undefined && lane.model === null && hostModel !== null)
            lane.model = hostModel;
        return d;
    }, [snapshot, children, requests, hostModel, now, hostWindow]);
    const anyLive = data !== null && data.lanes.some(l => l.main.some(n => n.live) || l.detours.some(n => n.live));
    useEffect(() => {
        if (!anyLive)
            return;
        setNow(Date.now()); // 刚开始运行时立刻对齐，别让第一帧钉在旧的「现在」
        const tick = () => { if (typeof document === 'undefined' || !document.hidden)
            setNow(Date.now()); };
        const id = setInterval(tick, 1000);
        return () => { clearInterval(id); };
    }, [anyLive]);
    const iframeRef = useRef(null);
    const dataRef = useRef(null);
    dataRef.current = data;
    // srcDoc 按挂载时的宿主主题预置暗色：暗色宿主下切 tab 重挂载 iframe，
    // 页面默认浅色变量会先画一帧（issue #4 的闪白）。挂载后的主题翻转走
    // postMessage，不动 srcDoc。
    const srcDoc = useMemo(() => themedMazeHtml(MAZE_PAGE_HTML), []);
    // Push on data change; also re-push once the iframe finished loading.
    useEffect(() => {
        const frame = iframeRef.current;
        if (frame !== null && data !== null) {
            frame.contentWindow?.postMessage({ kind: 'trace-maze', data }, '*');
        }
    }, [data]);
    const onLoad = () => {
        const frame = iframeRef.current;
        postThemeTo(frame); // 主题先于数据：首次 build 即按宿主主题着色
        postLocaleTo(frame, locale); // 语言同理：首次 build 即按宿主语言渲染文案
        const payload = dataRef.current;
        if (frame !== null && payload !== null) {
            frame.contentWindow?.postMessage({ kind: 'trace-maze', data: payload }, '*');
        }
    };
    // 宿主主题翻转时同步进 iframe（body[data-ds-dark-theme] 属性观察）。
    useEffect(() => watchHostTheme(() => { postThemeTo(iframeRef.current); }), []);
    // 宿主语言切换时同步进 iframe（照主题同步的通道模式）。
    useEffect(() => {
        postLocaleTo(iframeRef.current, locale);
        return locale.subscribe(() => { postLocaleTo(iframeRef.current, locale); });
    }, [locale]);
    useEffect(() => {
        const onMessage = (event) => {
            const frame = iframeRef.current;
            if (frame === null || event.source !== frame.contentWindow)
                return;
            const msg = event.data;
            if (msg === null || msg.kind !== 'trace-jump')
                return;
            jumpToChat(frame, msg);
        };
        window.addEventListener('message', onMessage);
        return () => { window.removeEventListener('message', onMessage); };
    }, []);
    if (data === null) {
        return _jsx("div", { className: css.empty, children: t('live.empty') });
    }
    return (_jsx("div", { className: css.frame, children: _jsx("iframe", { ref: iframeRef, title: "trace-live", className: css.iframe, srcDoc: srcDoc, sandbox: "allow-scripts allow-modals allow-downloads", onLoad: onLoad }) }));
}
//# sourceMappingURL=TraceLiveView.js.map