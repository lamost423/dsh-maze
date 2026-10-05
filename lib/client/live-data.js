import { contextWindowFor, exitCodeOf, isTodoReminderSource, markRetryClusters, stepVerdict, toolVerdict } from './verdict.js';
/** Narrow one ordered Chat node to a registered renderer kind. */
function isKind(node, kind) {
    return node.kind === kind;
}
/**
 * A Tool root carries `kind: 'tool-result'` once settled; a running call has no
 * `kind` field at all. Narrowed inline so ui-chat stays a type-only dependency
 * (importing its `isSettledTool` would put ui-chat in the bundle's externals,
 * and it is not one of the host's platform seed modules).
 */
function isSettled(block) {
    return 'kind' in block;
}
/** Ordered materialized nodes of the Chat target, in render order. */
function orderedNodes(snap) {
    const out = [];
    for (const key of snap.order) {
        const node = snap.nodes.get(key);
        if (node !== undefined)
            out.push(node);
    }
    return out;
}
/** Owning turn of one Chat node from its engine-resolved location, when placed. */
function locationTurn(node) {
    const loc = node.location;
    return loc.kind === 'turn' || loc.kind === 'step' ? loc.turn.turn : null;
}
/** Wall-clock time of one Chat node, or null for kinds that carry none. */
function nodeTime(node) {
    if (isKind(node, 'assistant-step'))
        return node.data.time;
    if (isKind(node, 'tool-call')) {
        const root = node.data.root;
        return isSettled(root) ? (root.callTime ?? root.time) : root.time;
    }
    if (isKind(node, 'model-retry'))
        return node.data.current.time;
    if (isKind(node, 'turn-error'))
        return node.data.time;
    if (isKind(node, 'turn-tail'))
        return node.data.time;
    return null;
}
/** Child detour steps start here so they never collide with parent step ids. */
const CHILD_STEP_BASE = 100_000;
/** Request-failure marker steps start here (offset by node seq — unique and replay-stable). */
const EVT_STEP_BASE = 200_000;
/**
 * Lane token totals, taking each turn from its most exact source.
 *
 * A completed turn reports provider-exact totals on its tail row, covering
 * every billed attempt — including requests that failed and were retried, whose
 * tokens no assistant node ever carried. A turn still running has no tail yet,
 * so its steps are summed as before. Each turn is counted once, from one source.
 * Input counts uncached prompt tokens only, matching what the lane header
 * reports: cache re-reads repeat the whole context on every request, so summing
 * them yields a huge number that says nothing about real usage.
 * @param rows - scanned maze rows.
 * @param turnTokens - exact per-turn totals published by completed turns.
 * @returns lane input, reasoning and output totals, or null when nothing reported.
 */
function laneTokens(rows, turnTokens) {
    let rzTok = null;
    let outTok = null;
    let inTok = null;
    const add = (into, value) => (into ?? 0) + value;
    for (const [, exact] of turnTokens) {
        inTok = add(inTok, exact.in);
        outTok = add(outTok, exact.out);
        if (exact.rz !== null)
            rzTok = add(rzTok, exact.rz);
    }
    for (const r of rows) {
        if (r.turn !== undefined && turnTokens.has(r.turn))
            continue;
        if (r.inTok != null)
            inTok = add(inTok, r.inTok);
        if (r.outTok != null)
            outTok = add(outTok, r.outTok);
        if (r.rzTok != null)
            rzTok = add(rzTok, r.rzTok);
    }
    return { rzTok, outTok, inTok };
}
/** Fix a settled tool's duration and verdict once its span is final. */
function settleToolSpan(tool) {
    if (tool.e === null)
        return;
    tool.dur = Math.round((tool.e - tool.s) * 10) / 10;
    const tv = toolVerdict(tool);
    tool.v = tv.v;
    tool.why = tv.why;
}
/** Concatenated text blocks with whitespace untouched — the exit-code reader wants the real last line. */
function rawText(blocks) {
    if (!blocks)
        return '';
    const out = [];
    for (const b of blocks)
        if (b.type === 'text' && b.text !== undefined)
            out.push(b.text);
    return out.join('');
}
/** Latest wall-clock event time in a conversation, or null while empty. */
function lastActivityTime(snap) {
    let last = null;
    for (const n of orderedNodes(snap)) {
        const t = nodeTime(n);
        if (t !== null)
            last = last === null ? t : Math.max(last, t);
    }
    return last;
}
/**
 * Wall-clock start of the earliest loaded turn. Replaces the old "first user
 * message" probe: turn boundaries are now resolved by the engine and published
 * on the timeline, so the anchor no longer depends on a user node being inside
 * the event window.
 */
function firstTurnStart(snap) {
    for (const turn of snap.timeline.turnOrder) {
        const start = snap.timeline.turns.get(turn)?.start;
        if (start !== undefined)
            return start.time;
    }
    return null;
}
/**
 * Scan one conversation snapshot into verdict-settled maze rows.
 * @param snap - the conversation to scan.
 * @param rel - wall-clock ms → maze seconds, chosen by the caller so a child
 * session can share its parent's axis.
 * @returns rows in step order with settled verdicts.
 */
function scanRows(snap, rel, nowMs = Date.now()) {
    const nodes = orderedNodes(snap);
    // Turn starts are engine-resolved now; the old probe counted user nodes,
    // which broke whenever the event window opened mid-turn.
    const anchor = firstTurnStart(snap);
    // Rows are keyed by the engine-resolved agent-loop step, NOT by node.
    // A step that only issued tool calls has no assistant-step node at all —
    // ui-chat promotes the call to its own `tool-call` row and never emits an
    // assistant row for it — so keying by node would silently drop that step
    // and every tool it ran. Both node kinds fold into the step they name in
    // their location, and a step's row is created by whichever arrives first.
    const byStep = new Map();
    const rows = [];
    let nextStep = 0;
    let turn = 0;
    const rowFor = (loc, s, seq) => {
        const key = `${String(loc[0])}:${String(loc[1])}`;
        const found = byStep.get(key);
        if (found !== undefined) {
            found.s = Math.min(found.s, s);
            if (seq !== undefined && found.seq === undefined)
                found.seq = seq;
            return found;
        }
        nextStep += 1;
        const node = {
            step: nextStep, turn: Math.max(loc[0], 1), s, e: s, tools: [], rz: 0,
            rzTxt: '', v: 'ok',
            ...(seq === undefined ? {} : { seq }),
        };
        byStep.set(key, node);
        rows.push(node);
        return node;
    };
    /** Engine-resolved (turn, step) of one node, or null when it is not step-placed. */
    const stepOf = (node) => {
        const loc = node.location;
        return loc.kind === 'step' ? [loc.turn.turn, loc.step.step] : null;
    };
    /**
     * Settled calls whose own start is unknown — window truncation left the
     * tool/call event outside the loaded range, so the root reports no
     * `callTime`. Their bars are anchored to the owning step's start once every
     * node has contributed to it, which is the honest floor: the call cannot
     * have been issued before its step began.
     */
    const unanchored = [];
    /** Every settled bar, so result excerpts are cut after the verdicts settle. */
    const settledTools = [];
    const turnTokens = new Map();
    const userMsgs = [];
    const compaction = { starts: [], prunes: 0, summaries: 0, ends: 0 };
    let todoReminders = 0;
    /** Turn endings read off the nodes themselves — the fallback when the timeline carries no turn/end event. */
    const endByNode = new Map();
    let preWindow = 0;
    let liveRow = null;
    for (const n of nodes) {
        const t = locationTurn(n);
        if (t !== null)
            turn = t;
        if (isKind(n, 'assistant-step')) {
            const d = n.data;
            if (anchor !== null && d.time < anchor) {
                preWindow += 1;
                continue;
            }
            const loc = stepOf(n) ?? [d.turn, d.step];
            // The in-flight step keeps the old marker semantics: a short bar pinned at
            // "now", not a measured span — it is a liveness indicator, and its real
            // start would redraw the bar on every tick.
            const running = d.status === 'running';
            const now = rel(nowMs);
            const s = running ? now : rel(d.finalNode?.timing?.stepStartTime ?? d.time);
            const cur = rowFor(loc, s, n.anchorSeq);
            cur.e = Math.max(cur.e, running ? now + 0.1 : rel(d.time));
            // Reasoning rides the assistant node; tool calls do not (they are their
            // own rows now), so blocks contribute text weight only.
            let rzTxt = cur.rzTxt;
            for (const b of d.blocks) {
                if (b.kind === 'reasoning') {
                    cur.rz += 1;
                    rzTxt += b.text;
                }
            }
            const rzClean = rzTxt.replace(/\s+/g, ' ').trim();
            cur.rzTxt = rzClean.slice(0, 240);
            cur.rzTxtFull = rzClean.slice(0, 2000);
            if (running) {
                cur.live = true;
                liveRow = cur;
            }
            // usage 在节点契约上是 unknown（源自 assistant/message 事件），运行期窄化后取真实 token
            const u = (d.usage ?? d.finalNode?.usage);
            if (u !== null && u !== undefined && typeof u === 'object') {
                if (typeof u.reasoningTokens === 'number')
                    cur.rzTok = u.reasoningTokens;
                if (typeof u.outputTokens === 'number')
                    cur.outTok = u.outputTokens;
                if (typeof u.inputTokens === 'number')
                    cur.inTok = u.inputTokens;
                if (typeof u.cacheReadTokens === 'number')
                    cur.cacheTok = u.cacheReadTokens;
            }
        }
        else if (isKind(n, 'tool-call')) {
            // One node carries the call and its result together, so no pairing pass:
            // name, arguments, issue time and outcome all ride the root. Code Dispatch
            // subcalls stay nested inside their root and get no bar of their own,
            // matching what the old assistant-blocks reading produced.
            const root = n.data.root;
            const settled = isSettled(root);
            const callAt = settled ? (root.callTime ?? root.time) : root.time;
            if (anchor !== null && callAt < anchor)
                continue;
            const loc = stepOf(n) ?? (settled ? null : [root.turn, root.step]);
            if (loc === null)
                continue;
            const s = rel(callAt);
            const cur = rowFor(loc, s);
            const tool = {
                k: 't',
                name: settled ? (root.call?.name ?? '?') : root.name,
                s, e: null,
                // 0.1.7-rc.1 adds a 'preparing' running phase that has no argsRaw yet.
                args: settled ? (root.call?.argsRaw ?? '') : (root.argsRaw ?? ''),
                res: '', err: false, dur: 0, v: 'ok',
                callId: root.callId,
            };
            cur.tools.push(tool);
            if (settled) {
                tool.e = rel(root.time);
                // Full text here on purpose: the verdict scans the head AND the tail of
                // the output, so truncating before judging would hide a crash appended
                // at the end. Excerpts are cut once every verdict has been settled.
                // The exit code is read off the untouched last line first — collapsing
                // whitespace would fold it into the body.
                const raw = rawText(root.content);
                tool.exit = exitCodeOf(raw);
                tool.res = raw.replace(/\s+/g, ' ').trim();
                tool.err = root.isError;
                cur.e = Math.max(cur.e, tool.e);
                settledTools.push(tool);
                if (root.callTime === null)
                    unanchored.push({ tool, row: cur });
                else
                    settleToolSpan(tool);
            }
        }
        else if (isKind(n, 'model-retry')) {
            // 请求失败后的重试排期：模型没吐出任何内容就挂了，快照里不会有对应 assistant
            // 节点——不画的话这段失败 + 退避在图上是纯空白（最误导的一类"什么都没发生"）。
            // 条长 = 退避等待窗口；用户中途按停止会取消重试（retryState='cancelled'），
            // 退避没真等完——画成时间点，不虚报满窗等待。
            // ui-chat 把一条重试链折叠成一个节点；仍按每次尝试各画一行，保持原有读图方式。
            for (const attempt of n.data.attempts) {
                if (anchor !== null && attempt.time < anchor)
                    continue;
                const s = rel(attempt.time);
                const cancelled = attempt.retryState === 'cancelled';
                const fail = `${attempt.failure.message}${attempt.failure.code === '' ? '' : ` [${attempt.failure.code}]`}`;
                rows.push({
                    step: EVT_STEP_BASE + attempt.seq, turn: Math.max(turn, 1), seq: attempt.seq,
                    s, e: cancelled ? s : Math.max(rel(attempt.time + attempt.delayMs), s),
                    tools: [], rz: 0, rzTxt: '',
                    v: 'error', evt: 'retry', label: `↻${attempt.retry}`,
                    why: { k: 'llmRetry', p: [attempt.retry, attempt.mode === 'always' ? '∞' : attempt.maxRetries, Math.round(attempt.delayMs / 100) / 10, fail, cancelled ? 1 : 0] },
                });
            }
        }
        else if (isKind(n, 'turn-error')) {
            // 终局失败（无再重试）：同样没有 assistant 节点承载，画成时间点标记。
            const d = n.data;
            if (anchor !== null && d.time < anchor)
                continue;
            const s = rel(d.time);
            rows.push({
                step: EVT_STEP_BASE + d.seq, turn: Math.max(turn, 1), seq: d.seq,
                s, e: s,
                tools: [], rz: 0, rzTxt: '',
                v: 'error', evt: 'turnError', label: '✗',
                why: { k: 'turnError', p: [d.message, d.code ?? ''] },
            });
            endByNode.set(Math.max(turn, 1), { kind: 'error', s });
        }
        else if (isKind(n, 'turn-max-tokens')) {
            // The provider cut the turn at its output cap; a tail may still follow, but the cap is the truer ending.
            const d = n.data;
            if (anchor !== null && d.time < anchor)
                continue;
            if (endByNode.get(d.turn)?.kind !== 'error')
                endByNode.set(d.turn, { kind: 'max-tokens', s: rel(d.time) });
        }
        else if (isKind(n, 'turn-tail')) {
            // The turn's closing row carries the exact provider accounting. It is not
            // a maze row of its own — its closing assistant already has one.
            const usage = n.data.tokenUsage;
            if (usage !== undefined) {
                turnTokens.set(n.data.turn, {
                    in: usage.uncachedInputTokens,
                    out: usage.outputTokens,
                    rz: usage.reasoningTokens ?? null,
                });
            }
            if (!endByNode.has(n.data.turn))
                endByNode.set(n.data.turn, { kind: 'completed', s: rel(n.data.time) });
        }
        else if (isKind(n, 'user') || isKind(n, 'steering')) {
            // 人工确认只看真人消息：user = 开轮消息，steering = 轮中插入的消息。注入的上下文
            //（指令文件 / 技能目录 / 插件提醒 / 子代理回报）是 'context' 节点，不算。
            if (anchor !== null && n.data.time < anchor)
                continue;
            userMsgs.push({ s: rel(n.data.time) });
        }
        else if (isKind(n, 'compaction')) {
            // 落地的压缩检查点：等于一次 compaction/start…end 完成；summary 有文本就算一次 summary
            if (anchor !== null && n.data.time < anchor)
                continue;
            compaction.starts.push(rel(n.data.time));
            compaction.ends += 1;
            if (n.data.summary !== null)
                compaction.summaries += 1;
        }
        else if (isKind(n, 'context')) {
            // 插件注入的上下文：只数 todo-freshness-guard 的提醒（行为信号「待办陈旧」）
            if (isTodoReminderSource(n.data.source))
                todoReminders += 1;
        }
    }
    // How each turn ended: the timeline's own turn/end event (with reason.kind)
    // wins; when the window holds no such event, fall back to what the nodes say.
    const turnEnds = [];
    const fromTimeline = new Set();
    for (const t of snap.timeline.turnOrder) {
        const endEv = snap.timeline.turns.get(t)?.end;
        if (endEv === undefined)
            continue;
        turnEnds.push({ turn: t, kind: endEv.data.reason.kind, s: rel(endEv.time) });
        fromTimeline.add(t);
    }
    for (const [t, e] of endByNode)
        if (!fromTimeline.has(t))
            turnEnds.push({ turn: t, ...e });
    turnEnds.sort((a, b) => a.turn - b.turn);
    // Anchor the truncated calls now that every node has folded into its step.
    for (const { tool, row } of unanchored) {
        tool.s = Math.min(row.s, tool.e ?? row.s);
        settleToolSpan(tool);
    }
    // Verdicts are settled; cut the tooltip and detail-panel excerpts.
    for (const tool of settledTools) {
        tool.resFull = tool.res.slice(0, 5000);
        tool.res = tool.res.slice(0, 380);
    }
    // Chronological order drives both the blind-retry clustering and the
    // main/detour attachment below; node order is timeline order, but a step's
    // row can be opened by a late-arriving tool node, so sort explicitly.
    rows.sort((a, b) => a.s - b.s);
    // Settle verdicts now that every arrived tool-result is paired. Pending
    // tools (no result yet) do not vote, so a step only becomes a detour once
    // its outcome is known; the in-flight step always stays on the main path.
    // Tool-less settled steps are answer nodes, mirroring the upload page.
    // 行为学盲目重试簇先于步级聚合：只扫已结算调用，in-flight 不参与，签名稳定。
    const settled = [];
    for (const r of rows) {
        if (r === liveRow)
            continue;
        for (const t of r.tools)
            if (t.e !== null)
                settled.push(t);
    }
    markRetryClusters(settled);
    for (const r of rows) {
        if (r === liveRow)
            continue;
        if (r.evt !== undefined)
            continue; // 请求级失败标记：判定在构造时定死，不参与聚合
        if (r.tools.length === 0) {
            r.v = 'answer';
            r.why = { k: 'noTools' };
            continue;
        }
        const sv = stepVerdict(r.tools.filter(t => t.e !== null));
        if (sv !== null) {
            r.v = sv.v;
            if (sv.why !== undefined)
                r.why = sv.why;
            if (sv.why2 !== undefined)
                r.why2 = sv.why2;
        }
        else {
            r.why = { k: 'pendingTools' };
        }
    }
    return { rows, liveRow, preWindow, turnTokens, turnEnds, userMsgs, compaction, todoReminders, byStep };
}
/**
 * Fold one child session into a single aggregated detour node: the node's
 * span is the child's activity span, its sub-bars are the child's judged
 * tool calls, and the verdict line names the child.
 * @param child - child roster row plus its conversation on the parent clock.
 * @param index - roster position, offset into the reserved child step range.
 * @returns the detour node, or null while the child has no usable rows.
 */
function childDetourNode(child, index, rel, nowMs) {
    if (child.conversation === null)
        return null;
    const { rows, liveRow } = scanRows(child.conversation, rel, nowMs);
    if (rows.length === 0)
        return null;
    const tools = rows.flatMap(r => r.tools);
    const s = Math.min(...rows.map(r => r.s));
    // 运行中的子代理终点取「现在」：长工具执行期间没有持久事件，只看已到的行，支路会停在上一个事件
    //（2.3.0 实测卡在 0.7 秒、结束才一下跳到全长）。宿主自己的子代理菜单也是运行中用现在。
    const e = Math.max(...rows.map(r => r.e), child.running ? rel(nowMs) : 0);
    const rz = rows.reduce((n, r) => n + r.rz, 0);
    const rzTxt = rows.map(r => r.rzTxt).filter(t => t !== '').join(' ');
    const rzTok = rows.some(r => r.rzTok != null) ? rows.reduce((n, r) => n + (r.rzTok ?? 0), 0) : null;
    const outTok = rows.some(r => r.outTok != null) ? rows.reduce((n, r) => n + (r.outTok ?? 0), 0) : null;
    const inTok = rows.some(r => r.inTok != null) ? rows.reduce((n, r) => n + (r.inTok ?? 0), 0) : null;
    const cacheTok = rows.some(r => r.cacheTok != null) ? rows.reduce((n, r) => n + (r.cacheTok ?? 0), 0) : null;
    const settledRows = rows.filter(r => r !== liveRow);
    const lastSettled = settledRows[settledRows.length - 1];
    const v = child.running ? 'ok' : lastSettled?.v === 'error' ? 'error' : 'ok';
    // 状态码进依据参数：0 = 已完成，1 = 运行中，2 = 以错误收尾（展示端按语言渲染）。
    const state = child.running ? 1 : lastSettled?.v === 'error' ? 2 : 0;
    const short = child.label.length > 12 ? `${child.label.slice(0, 12)}…` : child.label;
    return {
        step: CHILD_STEP_BASE + index,
        label: short,
        sub: true,
        s, e, tools, rz,
        rzTxt: rzTxt.slice(0, 240),
        rzTxtFull: rzTxt.slice(0, 2000),
        ...(rzTok === null ? {} : { rzTok }),
        ...(outTok === null ? {} : { outTok }),
        ...(inTok === null ? {} : { inTok }),
        ...(cacheTok === null ? {} : { cacheTok }),
        v,
        why: { k: 'child', p: [child.label, rows.length, tools.length, state] },
        ...(child.running ? { live: true } : {}),
    };
}
/**
 * Convert the live session snapshot into maze data. Returns null while the
 * session has no usable conversation nodes yet.
 * @param snap - the current session's Chat target snapshot.
 * @param children - dsh subagent child sessions to fold in as detour nodes.
 * @param requests - the Trajectory target's assembled requests, the only
 * browser-side carrier of provider/model identity; omit and no model is reported.
 * @param opts - `now` (epoch ms; the view's one-second clock, so running branches
 * grow without a new snapshot) and `hostWindow` (the host's contextPressure
 * window for the current model — the same value as the host's own indicator).
 */
export function snapshotToMazeData(snap, children = [], requests = [], opts = {}) {
    const nowMs = opts.now ?? Date.now();
    const nodes = orderedNodes(snap);
    const firstNode = nodes.length === 0 ? null : nodeTime(nodes[0]);
    const anchor = firstTurnStart(snap) ?? firstNode ?? Date.now();
    const rel = (t) => Math.max(0, Math.round((t - anchor) / 100) / 10);
    const { rows, preWindow, turnTokens, turnEnds, userMsgs, compaction, todoReminders, byStep } = scanRows(snap, rel, nowMs);
    if (rows.length === 0)
        return null;
    // Partition main path vs detours (mirror of the upload page).
    const main = [];
    const detours = [];
    let lastMain = null;
    for (const r of rows) {
        if (r.v === 'ok' || r.v === 'answer') {
            main.push(r);
            lastMain = r;
        }
        else {
            detours.push({ ...r, attach: lastMain?.step ?? 0 });
        }
    }
    // Child sessions: one aggregated detour per child, anchored where the
    // parent spawned it — the main step containing the child's start, with the
    // spawning subagent tool call's row seq as the chat-jump anchor.
    let childEnd = 0;
    let subHidden = 0;
    children.forEach((child, i) => {
        if (child.conversation === null) {
            subHidden += 1;
            return;
        }
        // Mirror the parent's pre-window discipline: a settled child whose whole
        // activity predates the visible window would clamp to the axis origin and
        // pile up at the left edge; a running child stays regardless.
        const lastT = lastActivityTime(child.conversation);
        if (!child.running && (lastT === null || lastT < anchor))
            return;
        const node = childDetourNode(child, i, rel, nowMs);
        if (node === null)
            return;
        let attach = 0;
        let turn;
        for (const m of main) {
            if (m.s <= node.s) {
                attach = m.step;
                turn = m.turn;
            }
            else
                break;
        }
        let spawnSeq;
        let spawnS = -1;
        for (const r of rows) {
            for (const t of r.tools) {
                if (t.name.startsWith('subagent') && t.s <= node.s + 1 && t.s > spawnS) {
                    spawnS = t.s;
                    spawnSeq = r.seq;
                    turn = r.turn;
                }
            }
        }
        detours.push({
            ...node,
            attach,
            ...(turn === undefined ? {} : { turn }),
            ...(spawnSeq === undefined ? {} : { seq: spawnSeq }),
        });
        childEnd = Math.max(childEnd, node.e);
    });
    const toolsCount = rows.reduce((n, r) => n + r.tools.length, 0);
    const rzCount = rows.reduce((n, r) => n + r.rz, 0);
    const { rzTok, outTok, inTok } = laneTokens(rows, turnTokens);
    const T = Math.max(...rows.map(r => r.e), childEnd, 0.1);
    // Model identity: the Trajectory target assembles it from the durable
    // request/header events, which is the only place it exists — the Chat
    // target's assistant nodes never carry requestConfig. Before host 0.1.2
    // there was no browser-side source at all, which is why the caller still
    // falls back to a fork-only host projection when this comes back null.
    // Both name the same resolved model id, but requestConfig only exists while
    // that request's request/header is inside the loaded window, whereas the
    // per-request provenance rides every completed assistant message — so it is
    // read first and survives a long session scrolling its headers out.
    let model = null;
    const perRequest = [];
    for (const request of requests) {
        // 0.1.6-alpha.1 renamed provenance → providerMetadata (same {provider, model} shape).
        const served = request;
        const named = served.providerMetadata?.model ?? served.provenance?.model ?? request.requestConfig?.model;
        if (named !== undefined && named !== '')
            model = named;
        // 每次请求按当时的模型换算窗口（评审 P1-3）：请求带 (turn, step)，把窗口填到那一步的节点上。
        // 压缩请求 step 为 0 / turn 为 null，跳过。
        const loc = request;
        if (named !== undefined && named !== '' && typeof loc.turn === 'number' && typeof loc.step === 'number' && loc.step > 0) {
            const row = byStep.get(`${String(loc.turn)}:${String(loc.step)}`);
            if (row !== undefined)
                perRequest.push({ named, row });
        }
    }
    // 窗口取值（吴昊 2026-10-01 拍板）：宿主 contextPressure 投影报的是**当前模型**的窗口，与宿主自己的
    // 指示器同一来源，当前模型的请求用它；宿主不留逐请求历史，换过的旧模型仍按模型表推。没报时全按表。
    const hostWindow = typeof opts.hostWindow === 'number' && Number.isFinite(opts.hostWindow) && opts.hostWindow > 0 ? opts.hostWindow : null;
    for (const { named, row } of perRequest) {
        const win = hostWindow !== null && named === model ? hostWindow : contextWindowFor(named);
        if (win !== null)
            row.ctxWin = win;
    }
    const lane = {
        key: 'l1',
        model,
        preWindow,
        main, detours,
        turnEnds, userMsgs, compaction, todoReminders,
        ...(hostWindow === null ? {} : { ctxWindow: hostWindow }),
        ...(subHidden > 0 ? { subHidden } : {}),
        stats: {
            steps: rows.length, tools: toolsCount, rz: rzCount,
            rzTok, outTok, inTok, T, main: main.length, detours: detours.length,
        },
    };
    return { Tmax: Math.max(T, 60), lanes: [lane] };
}
//# sourceMappingURL=live-data.js.map