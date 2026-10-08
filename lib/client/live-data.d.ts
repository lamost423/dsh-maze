/**
 * Live maze data converter: the session's Chat target snapshot (the real-time
 * observable published by ui-chat) → the same maze payload the upload page
 * renders. Verdict and main/detour partitioning mirror the upload page's logic
 * so both modes share one visual language. dsh subagent child sessions fold in
 * as one aggregated detour node each, on the parent's clock.
 *
 * Host 0.1.2 moved Conversation to a target-neutral snapshot: the ordered node
 * list now lives on the `chat` target, tool calls and their results arrive as
 * one settled node instead of two events to pair, the in-flight step is an
 * `assistant-step` node with `status: 'running'` rather than a separate
 * `partial`, and turn boundaries come off the timeline instead of being counted
 * from user messages.
 */
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { TrajectorySnapshot } from '@deepseek-ai/dsh-client-ui-trajectory/client';
import type { VerdictWhy } from './verdict.js';
/** One tool event in the maze model. */
export interface MazeTool {
    k: 't';
    name: string;
    s: number;
    e: number | null;
    args: string;
    /** Tooltip excerpt of the result (≤380 chars). */
    res: string;
    /** Detail-panel text of the result (≤5000 chars). */
    resFull?: string;
    err: boolean;
    /**
     * 返回原文末行的退出码（dsh 把 `[exit code: N]` 追加在末尾，仅非零）；没有则 null。
     * 在压空白与截断之前算好——结果与证据块靠它判验证命令通过与否，不能从 5000 字截断文本里找。
     */
    exit?: number | null;
    dur: number;
    v: 'error' | 'deadend' | 'retry' | 'ok';
    /** 结构化判定依据（展示端按界面语言渲染）。 */
    why?: VerdictWhy;
    /** 附加依据（盲目重试簇里失败成员的簇上下文）。 */
    why2?: VerdictWhy;
    /**
     * Wire call identity: pairs the result during conversion, then anchors the
     * page's 在对话中定位 jump (the chat rows carry `data-chat-call-id`).
     */
    callId?: string;
}
/** One maze node (main step or detour branch). */
export interface MazeNode {
    step: number;
    /** Display label overriding the page's `S<step>` composition (subagent nodes). */
    label?: string;
    /** 1-based conversation turn; the page breaks the main path between turns. */
    turn?: number;
    /** Session-log seq of the source assistant node; fallback jump anchor (`dsh-message-<seq>`). */
    seq?: number;
    /** True for the single in-flight step; excluded from the page's redraw signature. */
    live?: boolean;
    s: number;
    e: number;
    tools: MazeTool[];
    rz: number;
    rzTxt: string;
    /** Detail-panel reasoning excerpt (≤2000 chars). */
    rzTxtFull?: string;
    /** 该步真实推理 token（assistant/message 的 usage；无真值时 null，页面回退显示段数）。 */
    rzTok?: number | null;
    /** 该步真实输出 token（含推理），同上口径。 */
    outTok?: number | null;
    /** 该步未命中缓存的输入 token（usage.inputTokens 是 cache-miss 口径；实测缓存命中另记）。 */
    inTok?: number | null;
    /** 该步缓存命中的输入 token（usage.cacheReadTokens）；上下文总量 = inTok + cacheTok。 */
    cacheTok?: number | null;
    /** 该步请求当时的上下文窗口（实时链路按逐请求模型查表；上传链路读 request/context 真值）。 */
    ctxWin?: number;
    v: 'ok' | 'answer' | 'error' | 'deadend' | 'retry';
    /** 步级结构化判定依据（最坏工具的依据；展示端按界面语言渲染）。 */
    why?: VerdictWhy;
    /** 附加依据（最坏工具携带的重试簇上下文）。 */
    why2?: VerdictWhy;
    /** True marks an aggregated subagent child node (display composes its label). */
    sub?: true;
    /**
     * 请求级失败标记：'retry' = llm/retry（失败后安排重试，条长 = 退避等待），
     * 'turnError' = turn/end error（终局失败，无再重试）。这类节点没有工具与推理，
     * 判定固定为 error，不参与步级聚合——否则空 tools 会被误判成 answer。
     */
    evt?: 'retry' | 'turnError';
    attach?: number;
}
/** One lane (one session). Upload mode goes up to l5; live mode is always l1. */
export interface MazeLane {
    key: string;
    model: string | null;
    /**
     * 被丢弃的窗口外陈旧步数：对话快照是事件窗口，窗口内可能残留早于首条用户消息的
     * assistant 节点（更早轮次的尾巴）。它们的时间会被钳到 0 堆在左边缘、虚高统计并
     * 制造假支路，所以转换时丢弃并在此计数，页面据此标注「另有 N 步更早历史未加载」。
     */
    preWindow: number;
    main: MazeNode[];
    detours: MazeNode[];
    /** 每轮怎么收尾（turn/end 的 reason.kind），结果与证据块判「任务完成」用；s 为泳道秒。 */
    turnEnds?: {
        turn: number;
        kind: string;
        s: number;
    }[];
    /** 真人消息（user / steering 节点）的时刻，结果与证据块判「人工确认」用；只有时刻，不带内容。 */
    userMsgs?: {
        s: number;
    }[];
    /** 压缩事件（行为信号块）：start 的时刻与 prune / summary 次数。快照只有落地的压缩节点，prune 不在窗口里，记 0。 */
    compaction?: {
        starts: number[];
        prunes: number;
        summaries: number;
        ends: number;
    };
    /**
     * 上下文构成（诊断层第 4 项）：逐段字符数估算。实时窗口里只有工具返回的**截断**文本，
     * 系统提示/指令文件/技能目录不在快照里，所以这里只有工具返回一项并标 live。
     */
    context?: {
        sys: number | null;
        instr: number | null;
        skills: {
            n: number;
            chars: number;
        } | null;
        plugin: {
            name: string;
            chars: number;
        }[];
        tool: number | null;
        user: number | null;
        assistant: number | null;
        loaded: string[];
        live?: boolean;
    };
    /** todo-freshness-guard 插件提醒次数（行为信号「待办陈旧」）。 */
    todoReminders?: number;
    /** 上下文窗口真值：上传链路读 request/context，实时链路读宿主 contextPressure 投影；都没有时省略，页面退回模型表。 */
    ctxWindow?: number;
    /** 已知但没有展开的子代理个数（超出同时跟踪上限）；页面在泳道上注明「另有 N 个子代理未展开」。 */
    subHidden?: number;
    stats: {
        steps: number;
        tools: number;
        rz: number;
        rzTok: number | null;
        outTok: number | null;
        inTok: number | null;
        T: number;
        main: number;
        detours: number;
    };
}
/** The maze payload the upload page consumes. */
export interface MazeData {
    Tmax: number;
    lanes: MazeLane[];
}
/** One dsh subagent child session folded into the parent's live maze. */
export interface ChildSessionMaze {
    /** Child session id (dedup key; not rendered). */
    id: string;
    /** Human-facing child label, shown in the detour node's verdict text. */
    label: string;
    /** Child still running: the node stays live and reads as in-flight. */
    running: boolean;
    /**
     * The child's own Chat target snapshot; times share the parent's clock.
     * null = a known child the roster did not expand (beyond the concurrent
     * tracking cap): counted into the lane's `subHidden`, never drawn.
     */
    conversation: ChatSnapshot | null;
}
/** Optional live-tab inputs to snapshotToMazeData. */
export interface LiveMazeOptions {
    /** Epoch ms used as "now" for running steps and branches (the view's one-second clock). */
    now?: number;
    /** The host's contextPressure.contextWindow for the current model, when reported. */
    hostWindow?: number;
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
export declare function snapshotToMazeData(snap: ChatSnapshot, children?: readonly ChildSessionMaze[], requests?: TrajectorySnapshot['requests'], opts?: LiveMazeOptions): MazeData | null;
//# sourceMappingURL=live-data.d.ts.map