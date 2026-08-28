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
import type {
  ChatConversationViewNode, ChatNode, ChatSnapshot, ToolCallBlock, ToolResultNode,
} from '@deepseek-ai/dsh-client-ui-chat/client'
import type { TrajectorySnapshot } from '@deepseek-ai/dsh-client-ui-trajectory/client'
import { markRetryClusters, stepVerdict, toolVerdict } from './verdict.js'
import type { VerdictWhy } from './verdict.js'

/** Narrow one ordered Chat node to a registered renderer kind. */
function isKind<K extends ChatNode['kind']>(
  node: ChatConversationViewNode,
  kind: K,
): node is Extract<ChatNode, { kind: K }> {
  return node.kind === kind
}

/**
 * A Tool root carries `kind: 'tool-result'` once settled; a running call has no
 * `kind` field at all. Narrowed inline so ui-chat stays a type-only dependency
 * (importing its `isSettledTool` would put ui-chat in the bundle's externals,
 * and it is not one of the host's platform seed modules).
 */
function isSettled(block: ToolCallBlock): block is ToolResultNode {
  return 'kind' in block
}

/** Ordered materialized nodes of the Chat target, in render order. */
function orderedNodes(snap: ChatSnapshot): ChatConversationViewNode[] {
  const out: ChatConversationViewNode[] = []
  for (const key of snap.order) {
    const node = snap.nodes.get(key)
    if (node !== undefined) out.push(node)
  }
  return out
}

/** Owning turn of one Chat node from its engine-resolved location, when placed. */
function locationTurn(node: ChatConversationViewNode): number | null {
  const loc = node.location
  return loc.kind === 'turn' || loc.kind === 'step' ? loc.turn.turn : null
}

/** Wall-clock time of one Chat node, or null for kinds that carry none. */
function nodeTime(node: ChatConversationViewNode): number | null {
  if (isKind(node, 'assistant-step')) return node.data.time
  if (isKind(node, 'tool-call')) {
    const root = node.data.root
    return isSettled(root) ? (root.callTime ?? root.time) : root.time
  }
  if (isKind(node, 'model-retry')) return node.data.current.time
  if (isKind(node, 'turn-error')) return node.data.time
  if (isKind(node, 'turn-tail')) return node.data.time
  return null
}

/** One tool event in the maze model. */
export interface MazeTool {
  k: 't'
  name: string
  s: number
  e: number | null
  args: string
  /** Tooltip excerpt of the result (≤380 chars). */
  res: string
  /** Detail-panel text of the result (≤5000 chars). */
  resFull?: string
  err: boolean
  dur: number
  v: 'error' | 'deadend' | 'retry' | 'ok'
  /** 结构化判定依据（展示端按界面语言渲染）。 */
  why?: VerdictWhy
  /** 附加依据（盲目重试簇里失败成员的簇上下文）。 */
  why2?: VerdictWhy
  /**
   * Wire call identity: pairs the result during conversion, then anchors the
   * page's 在对话中定位 jump (the chat rows carry `data-chat-call-id`).
   */
  callId?: string
}

/** One maze node (main step or detour branch). */
export interface MazeNode {
  step: number
  /** Display label overriding the page's `S<step>` composition (subagent nodes). */
  label?: string
  /** 1-based conversation turn; the page breaks the main path between turns. */
  turn?: number
  /** Session-log seq of the source assistant node; fallback jump anchor (`dsh-message-<seq>`). */
  seq?: number
  /** True for the single in-flight step; excluded from the page's redraw signature. */
  live?: boolean
  s: number
  e: number
  tools: MazeTool[]
  rz: number
  rzTxt: string
  /** Detail-panel reasoning excerpt (≤2000 chars). */
  rzTxtFull?: string
  /** 该步真实推理 token（assistant/message 的 usage；无真值时 null，页面回退显示段数）。 */
  rzTok?: number | null
  /** 该步真实输出 token（含推理），同上口径。 */
  outTok?: number | null
  /** 该步未命中缓存的输入 token（usage.inputTokens 是 cache-miss 口径；实测缓存命中另记）。 */
  inTok?: number | null
  /** 该步缓存命中的输入 token（usage.cacheReadTokens）；上下文总量 = inTok + cacheTok。 */
  cacheTok?: number | null
  v: 'ok' | 'answer' | 'error' | 'deadend' | 'retry'
  /** 步级结构化判定依据（最坏工具的依据；展示端按界面语言渲染）。 */
  why?: VerdictWhy
  /** 附加依据（最坏工具携带的重试簇上下文）。 */
  why2?: VerdictWhy
  /** True marks an aggregated subagent child node (display composes its label). */
  sub?: true
  /**
   * 请求级失败标记：'retry' = llm/retry（失败后安排重试，条长 = 退避等待），
   * 'turnError' = turn/end error（终局失败，无再重试）。这类节点没有工具与推理，
   * 判定固定为 error，不参与步级聚合——否则空 tools 会被误判成 answer。
   */
  evt?: 'retry' | 'turnError'
  attach?: number
}

/** One lane (one session). Upload mode goes up to l5; live mode is always l1. */
export interface MazeLane {
  key: string
  model: string | null
  /**
   * 被丢弃的窗口外陈旧步数：对话快照是事件窗口，窗口内可能残留早于首条用户消息的
   * assistant 节点（更早轮次的尾巴）。它们的时间会被钳到 0 堆在左边缘、虚高统计并
   * 制造假支路，所以转换时丢弃并在此计数，页面据此标注「另有 N 步更早历史未加载」。
   */
  preWindow: number
  main: MazeNode[]
  detours: MazeNode[]
  stats: { steps: number; tools: number; rz: number; rzTok: number | null; outTok: number | null; T: number; main: number; detours: number }
}

/** The maze payload the upload page consumes. */
export interface MazeData {
  Tmax: number
  lanes: MazeLane[]
}

/** One dsh subagent child session folded into the parent's live maze. */
export interface ChildSessionMaze {
  /** Child session id (dedup key; not rendered). */
  id: string
  /** Human-facing child label, shown in the detour node's verdict text. */
  label: string
  /** Child still running: the node stays live and reads as in-flight. */
  running: boolean
  /** The child's own Chat target snapshot; times share the parent's clock. */
  conversation: ChatSnapshot
}

/** Child detour steps start here so they never collide with parent step ids. */
const CHILD_STEP_BASE = 100_000

/** Request-failure marker steps start here (offset by node seq — unique and replay-stable). */
const EVT_STEP_BASE = 200_000

/** Fix a settled tool's duration and verdict once its span is final. */
function settleToolSpan(tool: MazeTool): void {
  if (tool.e === null) return
  tool.dur = Math.round((tool.e - tool.s) * 10) / 10
  const tv = toolVerdict(tool)
  tool.v = tv.v
  tool.why = tv.why
}

function contentText(blocks: readonly { type?: string; text?: string }[] | undefined): string {
  if (!blocks) return ''
  const out: string[] = []
  for (const b of blocks) if (b.type === 'text' && b.text !== undefined) out.push(b.text)
  return out.join('').replace(/\s+/g, ' ').trim()
}

/** Latest wall-clock event time in a conversation, or null while empty. */
function lastActivityTime(snap: ChatSnapshot): number | null {
  let last: number | null = null
  for (const n of orderedNodes(snap)) {
    const t = nodeTime(n)
    if (t !== null) last = last === null ? t : Math.max(last, t)
  }
  return last
}

/**
 * Wall-clock start of the earliest loaded turn. Replaces the old "first user
 * message" probe: turn boundaries are now resolved by the engine and published
 * on the timeline, so the anchor no longer depends on a user node being inside
 * the event window.
 */
function firstTurnStart(snap: ChatSnapshot): number | null {
  for (const turn of snap.timeline.turnOrder) {
    const start = snap.timeline.turns.get(turn)?.start
    if (start !== undefined) return start.time
  }
  return null
}

/** Scanned, verdict-settled rows of one conversation on a caller-chosen clock. */
interface ScanResult {
  rows: MazeNode[]
  /** The in-flight partial row, when present; always last in `rows`. */
  liveRow: MazeNode | null
  /** Dropped stale pre-window steps (see MazeLane.preWindow). */
  preWindow: number
}

/**
 * Scan one conversation snapshot into verdict-settled maze rows.
 * @param snap - the conversation to scan.
 * @param rel - wall-clock ms → maze seconds, chosen by the caller so a child
 * session can share its parent's axis.
 * @returns rows in step order with settled verdicts.
 */
function scanRows(snap: ChatSnapshot, rel: (t: number) => number): ScanResult {
  const nodes = orderedNodes(snap)
  // Turn starts are engine-resolved now; the old probe counted user nodes,
  // which broke whenever the event window opened mid-turn.
  const anchor = firstTurnStart(snap)

  // Rows are keyed by the engine-resolved agent-loop step, NOT by node.
  // A step that only issued tool calls has no assistant-step node at all —
  // ui-chat promotes the call to its own `tool-call` row and never emits an
  // assistant row for it — so keying by node would silently drop that step
  // and every tool it ran. Both node kinds fold into the step they name in
  // their location, and a step's row is created by whichever arrives first.
  const byStep = new Map<string, MazeNode>()
  const rows: MazeNode[] = []
  let nextStep = 0
  let turn = 0

  const rowFor = (loc: readonly [number, number], s: number, seq?: number): MazeNode => {
    const key = `${String(loc[0])}:${String(loc[1])}`
    const found = byStep.get(key)
    if (found !== undefined) {
      found.s = Math.min(found.s, s)
      if (seq !== undefined && found.seq === undefined) found.seq = seq
      return found
    }
    nextStep += 1
    const node: MazeNode = {
      step: nextStep, turn: Math.max(loc[0], 1), s, e: s, tools: [], rz: 0,
      rzTxt: '', v: 'ok',
      ...(seq === undefined ? {} : { seq }),
    }
    byStep.set(key, node)
    rows.push(node)
    return node
  }

  /** Engine-resolved (turn, step) of one node, or null when it is not step-placed. */
  const stepOf = (node: ChatConversationViewNode): readonly [number, number] | null => {
    const loc = node.location
    return loc.kind === 'step' ? [loc.turn.turn, loc.step.step] : null
  }

  /**
   * Settled calls whose own start is unknown — window truncation left the
   * tool/call event outside the loaded range, so the root reports no
   * `callTime`. Their bars are anchored to the owning step's start once every
   * node has contributed to it, which is the honest floor: the call cannot
   * have been issued before its step began.
   */
  const unanchored: { tool: MazeTool; row: MazeNode }[] = []
  /** Every settled bar, so result excerpts are cut after the verdicts settle. */
  const settledTools: MazeTool[] = []
  let preWindow = 0
  let liveRow: MazeNode | null = null
  for (const n of nodes) {
    const t = locationTurn(n)
    if (t !== null) turn = t
    if (isKind(n, 'assistant-step')) {
      const d = n.data
      if (anchor !== null && d.time < anchor) {
        preWindow += 1
        continue
      }
      const loc = stepOf(n) ?? ([d.turn, d.step] as const)
      // The in-flight step keeps the old marker semantics: a short bar pinned at
      // "now", not a measured span — it is a liveness indicator, and its real
      // start would redraw the bar on every tick.
      const running = d.status === 'running'
      const now = rel(Date.now())
      const s = running ? now : rel(d.finalNode?.timing?.stepStartTime ?? d.time)
      const cur = rowFor(loc, s, n.anchorSeq)
      cur.e = Math.max(cur.e, running ? now + 0.1 : rel(d.time))
      // Reasoning rides the assistant node; tool calls do not (they are their
      // own rows now), so blocks contribute text weight only.
      let rzTxt = cur.rzTxt
      for (const b of d.blocks) {
        if (b.kind === 'reasoning') {
          cur.rz += 1
          rzTxt += b.text
        }
      }
      const rzClean = rzTxt.replace(/\s+/g, ' ').trim()
      cur.rzTxt = rzClean.slice(0, 240)
      cur.rzTxtFull = rzClean.slice(0, 2000)
      if (running) {
        cur.live = true
        liveRow = cur
      }
      // usage 在节点契约上是 unknown（源自 assistant/message 事件），运行期窄化后取真实 token
      const u = (d.usage ?? d.finalNode?.usage) as { reasoningTokens?: unknown; outputTokens?: unknown; inputTokens?: unknown; cacheReadTokens?: unknown } | null | undefined
      if (u !== null && u !== undefined && typeof u === 'object') {
        if (typeof u.reasoningTokens === 'number') cur.rzTok = u.reasoningTokens
        if (typeof u.outputTokens === 'number') cur.outTok = u.outputTokens
        if (typeof u.inputTokens === 'number') cur.inTok = u.inputTokens
        if (typeof u.cacheReadTokens === 'number') cur.cacheTok = u.cacheReadTokens
      }
    } else if (isKind(n, 'tool-call')) {
      // One node carries the call and its result together, so no pairing pass:
      // name, arguments, issue time and outcome all ride the root. Code Dispatch
      // subcalls stay nested inside their root and get no bar of their own,
      // matching what the old assistant-blocks reading produced.
      const root = n.data.root
      const settled = isSettled(root)
      const callAt = settled ? (root.callTime ?? root.time) : root.time
      if (anchor !== null && callAt < anchor) continue
      const loc = stepOf(n) ?? (settled ? null : ([root.turn, root.step] as const))
      if (loc === null) continue
      const s = rel(callAt)
      const cur = rowFor(loc, s)
      const tool: MazeTool = {
        k: 't',
        name: settled ? (root.call?.name ?? '?') : root.name,
        s, e: null,
        args: settled ? (root.call?.argsRaw ?? '') : root.argsRaw,
        res: '', err: false, dur: 0, v: 'ok',
        callId: root.callId,
      }
      cur.tools.push(tool)
      if (settled) {
        tool.e = rel(root.time)
        // Full text here on purpose: the verdict scans the head AND the tail of
        // the output, so truncating before judging would hide a crash appended
        // at the end. Excerpts are cut once every verdict has been settled.
        tool.res = contentText(root.content)
        tool.err = root.isError
        cur.e = Math.max(cur.e, tool.e)
        settledTools.push(tool)
        if (root.callTime === null) unanchored.push({ tool, row: cur })
        else settleToolSpan(tool)
      }
    } else if (isKind(n, 'model-retry')) {
      // 请求失败后的重试排期：模型没吐出任何内容就挂了，快照里不会有对应 assistant
      // 节点——不画的话这段失败 + 退避在图上是纯空白（最误导的一类"什么都没发生"）。
      // 条长 = 退避等待窗口；用户中途按停止会取消重试（retryState='cancelled'），
      // 退避没真等完——画成时间点，不虚报满窗等待。
      // ui-chat 把一条重试链折叠成一个节点；仍按每次尝试各画一行，保持原有读图方式。
      for (const attempt of n.data.attempts) {
        if (anchor !== null && attempt.time < anchor) continue
        const s = rel(attempt.time)
        const cancelled = attempt.retryState === 'cancelled'
        const fail = `${attempt.failure.message}${attempt.failure.code === '' ? '' : ` [${attempt.failure.code}]`}`
        rows.push({
          step: EVT_STEP_BASE + attempt.seq, turn: Math.max(turn, 1), seq: attempt.seq,
          s, e: cancelled ? s : Math.max(rel(attempt.time + attempt.delayMs), s),
          tools: [], rz: 0, rzTxt: '',
          v: 'error', evt: 'retry', label: `↻${attempt.retry}`,
          why: { k: 'llmRetry', p: [attempt.retry, attempt.mode === 'always' ? '∞' : attempt.maxRetries, Math.round(attempt.delayMs / 100) / 10, fail, cancelled ? 1 : 0] },
        })
      }
    } else if (isKind(n, 'turn-error')) {
      // 终局失败（无再重试）：同样没有 assistant 节点承载，画成时间点标记。
      const d = n.data
      if (anchor !== null && d.time < anchor) continue
      const s = rel(d.time)
      rows.push({
        step: EVT_STEP_BASE + d.seq, turn: Math.max(turn, 1), seq: d.seq,
        s, e: s,
        tools: [], rz: 0, rzTxt: '',
        v: 'error', evt: 'turnError', label: '✗',
        why: { k: 'turnError', p: [d.message, d.code ?? ''] },
      })
    }
  }

  // Anchor the truncated calls now that every node has folded into its step.
  for (const { tool, row } of unanchored) {
    tool.s = Math.min(row.s, tool.e ?? row.s)
    settleToolSpan(tool)
  }
  // Verdicts are settled; cut the tooltip and detail-panel excerpts.
  for (const tool of settledTools) {
    tool.resFull = tool.res.slice(0, 5000)
    tool.res = tool.res.slice(0, 380)
  }

  // Chronological order drives both the blind-retry clustering and the
  // main/detour attachment below; node order is timeline order, but a step's
  // row can be opened by a late-arriving tool node, so sort explicitly.
  rows.sort((a, b) => a.s - b.s)

  // Settle verdicts now that every arrived tool-result is paired. Pending
  // tools (no result yet) do not vote, so a step only becomes a detour once
  // its outcome is known; the in-flight step always stays on the main path.
  // Tool-less settled steps are answer nodes, mirroring the upload page.
  // 行为学盲目重试簇先于步级聚合：只扫已结算调用，in-flight 不参与，签名稳定。
  const settled: MazeTool[] = []
  for (const r of rows) {
    if (r === liveRow) continue
    for (const t of r.tools) if (t.e !== null) settled.push(t)
  }
  markRetryClusters(settled)
  for (const r of rows) {
    if (r === liveRow) continue
    if (r.evt !== undefined) continue   // 请求级失败标记：判定在构造时定死，不参与聚合
    if (r.tools.length === 0) {
      r.v = 'answer'
      r.why = { k: 'noTools' }
      continue
    }
    const sv = stepVerdict(r.tools.filter(t => t.e !== null))
    if (sv !== null) {
      r.v = sv.v
      if (sv.why !== undefined) r.why = sv.why
      if (sv.why2 !== undefined) r.why2 = sv.why2
    } else {
      r.why = { k: 'pendingTools' }
    }
  }

  return { rows, liveRow, preWindow }
}

/**
 * Fold one child session into a single aggregated detour node: the node's
 * span is the child's activity span, its sub-bars are the child's judged
 * tool calls, and the verdict line names the child.
 * @param child - child roster row plus its conversation on the parent clock.
 * @param index - roster position, offset into the reserved child step range.
 * @returns the detour node, or null while the child has no usable rows.
 */
function childDetourNode(child: ChildSessionMaze, index: number, rel: (t: number) => number): MazeNode | null {
  const { rows, liveRow } = scanRows(child.conversation, rel)
  if (rows.length === 0) return null
  const tools = rows.flatMap(r => r.tools)
  const s = Math.min(...rows.map(r => r.s))
  const e = Math.max(...rows.map(r => r.e))
  const rz = rows.reduce((n, r) => n + r.rz, 0)
  const rzTxt = rows.map(r => r.rzTxt).filter(t => t !== '').join(' ')
  const rzTok = rows.some(r => r.rzTok != null) ? rows.reduce((n, r) => n + (r.rzTok ?? 0), 0) : null
  const outTok = rows.some(r => r.outTok != null) ? rows.reduce((n, r) => n + (r.outTok ?? 0), 0) : null
  const inTok = rows.some(r => r.inTok != null) ? rows.reduce((n, r) => n + (r.inTok ?? 0), 0) : null
  const cacheTok = rows.some(r => r.cacheTok != null) ? rows.reduce((n, r) => n + (r.cacheTok ?? 0), 0) : null
  const settledRows = rows.filter(r => r !== liveRow)
  const lastSettled = settledRows[settledRows.length - 1]
  const v: MazeNode['v'] = child.running ? 'ok' : lastSettled?.v === 'error' ? 'error' : 'ok'
  // 状态码进依据参数：0 = 已完成，1 = 运行中，2 = 以错误收尾（展示端按语言渲染）。
  const state = child.running ? 1 : lastSettled?.v === 'error' ? 2 : 0
  const short = child.label.length > 12 ? `${child.label.slice(0, 12)}…` : child.label
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
  }
}

/**
 * Convert the live session snapshot into maze data. Returns null while the
 * session has no usable conversation nodes yet.
 * @param snap - the current session's Chat target snapshot.
 * @param children - dsh subagent child sessions to fold in as detour nodes.
 * @param requests - the Trajectory target's assembled requests, the only
 * browser-side carrier of provider/model identity; omit and no model is reported.
 */
export function snapshotToMazeData(
  snap: ChatSnapshot,
  children: readonly ChildSessionMaze[] = [],
  requests: TrajectorySnapshot['requests'] = [],
): MazeData | null {
  const nodes = orderedNodes(snap)
  const firstNode = nodes.length === 0 ? null : nodeTime(nodes[0] as ChatConversationViewNode)
  const anchor = firstTurnStart(snap) ?? firstNode ?? Date.now()
  const rel = (t: number): number => Math.max(0, Math.round((t - anchor) / 100) / 10)

  const { rows, preWindow } = scanRows(snap, rel)
  if (rows.length === 0) return null

  // Partition main path vs detours (mirror of the upload page).
  const main: MazeNode[] = []
  const detours: MazeNode[] = []
  let lastMain: MazeNode | null = null
  for (const r of rows) {
    if (r.v === 'ok' || r.v === 'answer') {
      main.push(r); lastMain = r
    } else {
      detours.push({ ...r, attach: lastMain?.step ?? 0 })
    }
  }

  // Child sessions: one aggregated detour per child, anchored where the
  // parent spawned it — the main step containing the child's start, with the
  // spawning subagent tool call's row seq as the chat-jump anchor.
  let childEnd = 0
  children.forEach((child, i) => {
    // Mirror the parent's pre-window discipline: a settled child whose whole
    // activity predates the visible window would clamp to the axis origin and
    // pile up at the left edge; a running child stays regardless.
    const lastT = lastActivityTime(child.conversation)
    if (!child.running && (lastT === null || lastT < anchor)) return
    const node = childDetourNode(child, i, rel)
    if (node === null) return
    let attach = 0
    let turn: number | undefined
    for (const m of main) {
      if (m.s <= node.s) { attach = m.step; turn = m.turn } else break
    }
    let spawnSeq: number | undefined
    let spawnS = -1
    for (const r of rows) {
      for (const t of r.tools) {
        if (t.name.startsWith('subagent') && t.s <= node.s + 1 && t.s > spawnS) {
          spawnS = t.s
          spawnSeq = r.seq
          turn = r.turn
        }
      }
    }
    detours.push({
      ...node,
      attach,
      ...(turn === undefined ? {} : { turn }),
      ...(spawnSeq === undefined ? {} : { seq: spawnSeq }),
    })
    childEnd = Math.max(childEnd, node.e)
  })

  const toolsCount = rows.reduce((n, r) => n + r.tools.length, 0)
  const rzCount = rows.reduce((n, r) => n + r.rz, 0)
  const rzTok = rows.some(r => r.rzTok != null) ? rows.reduce((n, r) => n + (r.rzTok ?? 0), 0) : null
  const outTok = rows.some(r => r.outTok != null) ? rows.reduce((n, r) => n + (r.outTok ?? 0), 0) : null
  const T = Math.max(...rows.map(r => r.e), childEnd, 0.1)
  // Model identity: the Trajectory target assembles it from the durable
  // request/header events, which is the only place it exists — the Chat
  // target's assistant nodes never carry requestConfig. Before host 0.1.2
  // there was no browser-side source at all, which is why the caller still
  // falls back to a fork-only host projection when this comes back null.
  // `provenance` is what the provider actually served; requestConfig is what
  // was asked for, so provenance wins when both are present.
  let model: string | null = null
  for (const request of requests) {
    const named = request.provenance?.model ?? request.requestConfig?.model
    if (named !== undefined && named !== '') model = named
  }
  const lane: MazeLane = {
    key: 'l1',
    model,
    preWindow,
    main, detours,
    stats: { steps: rows.length, tools: toolsCount, rz: rzCount, rzTok, outTok, T, main: main.length, detours: detours.length },
  }

  return { Tmax: Math.max(T, 60), lanes: [lane] }
}
