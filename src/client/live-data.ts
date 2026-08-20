/**
 * Live maze data converter: ConversationSnapshot (the session's real-time
 * observable) → the same maze payload the upload page renders. Verdict and
 * main/detour partitioning mirror the upload page's logic so both modes
 * share one visual language. dsh subagent child sessions fold in as one
 * aggregated detour node each, on the parent's clock.
 */
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { markRetryClusters, stepVerdict, toolVerdict } from './verdict.js'
import type { VerdictWhy } from './verdict.js'

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
  v: 'ok' | 'answer' | 'error' | 'deadend' | 'retry'
  /** 步级结构化判定依据（最坏工具的依据；展示端按界面语言渲染）。 */
  why?: VerdictWhy
  /** 附加依据（最坏工具携带的重试簇上下文）。 */
  why2?: VerdictWhy
  /** True marks an aggregated subagent child node (display composes its label). */
  sub?: true
  attach?: number
}

/** One lane (one session). */
export interface MazeLane {
  key: 'l1' | 'l2'
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
  /** The child's own conversation snapshot; times share the parent's clock. */
  conversation: ConversationSnapshot
}

/** Child detour steps start here so they never collide with parent step ids. */
const CHILD_STEP_BASE = 100_000

function contentText(blocks: readonly { type?: string; text?: string }[] | undefined): string {
  if (!blocks) return ''
  const out: string[] = []
  for (const b of blocks) if (b.type === 'text' && b.text !== undefined) out.push(b.text)
  return out.join('').replace(/\s+/g, ' ').trim()
}

/** Latest wall-clock event time in a conversation, or null while empty. */
function lastActivityTime(snap: ConversationSnapshot): number | null {
  let last: number | null = null
  for (const n of snap.nodes) {
    const t = (n as { time?: number }).time
    if (typeof t === 'number') last = last === null ? t : Math.max(last, t)
  }
  return last
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
function scanRows(snap: ConversationSnapshot, rel: (t: number) => number): ScanResult {
  const nodes = snap.nodes
  const firstUser = nodes.find(n => n.kind === 'user')

  interface PendingTool { tool: MazeTool }
  const rows: MazeNode[] = []
  let cur: MazeNode | null = null
  const pending: PendingTool[] = []
  let nextStep = 0
  let turn = 0

  // Verdicts are recomputed after the full scan: at push time the step's
  // tool-results have not been paired yet (they arrive as later nodes).
  const pushStep = (s: number, e: number, tools: MazeTool[], rz: number, rzTxt: string, seq?: number): MazeNode => {
    nextStep += 1
    const rzClean = rzTxt.replace(/\s+/g, ' ').trim()
    const node: MazeNode = {
      step: nextStep, turn: Math.max(turn, 1), s, e, tools, rz,
      rzTxt: rzClean.slice(0, 240), rzTxtFull: rzClean.slice(0, 2000),
      v: 'ok',
      ...(seq === undefined ? {} : { seq }),
    }
    rows.push(node)
    return node
  }

  let preWindow = 0
  for (const n of nodes) {
    if (n.kind === 'user') {
      turn += 1
    } else if (n.kind === 'assistant') {
      if (firstUser !== undefined && n.time < firstUser.time) {
        preWindow += 1
        continue
      }
      const s = rel(n.timing?.stepStartTime ?? n.time)
      const tools: MazeTool[] = []
      let rz = 0
      let rzTxt = ''
      for (const b of n.blocks) {
        if (b.kind === 'reasoning') {
          rz += 1
          rzTxt += b.text
        } else if (b.kind === 'tool-call') {
          const tool: MazeTool = {
            k: 't', name: b.name, s, e: null,
            args: b.argsRaw, res: '', err: false, dur: 0, v: 'ok',
            callId: b.callId,
          }
          tools.push(tool)
          pending.push({ tool })
        }
      }
      cur = pushStep(s, rel(n.time), tools, rz, rzTxt, n.seq)
      // usage 在节点契约上是 unknown（源自 assistant/message 事件），运行期窄化后取真实 token
      const u = n.usage as { reasoningTokens?: unknown; outputTokens?: unknown } | null | undefined
      if (u !== null && typeof u === 'object') {
        if (typeof u.reasoningTokens === 'number') cur.rzTok = u.reasoningTokens
        if (typeof u.outputTokens === 'number') cur.outTok = u.outputTokens
      }
    } else if (n.kind === 'tool-result') {
      const idx = pending.findIndex(p => p.tool.callId === n.callId)
      const p = idx >= 0 ? pending[idx] : undefined
      if (p !== undefined) {
        pending.splice(idx, 1)
        p.tool.e = rel(n.time)
        p.tool.res = contentText(n.content)
        p.tool.err = n.isError
        p.tool.dur = Math.round((p.tool.e - p.tool.s) * 10) / 10
        const tv = toolVerdict(p.tool)
        p.tool.v = tv.v
        p.tool.why = tv.why
        p.tool.resFull = p.tool.res.slice(0, 5000)
        p.tool.res = p.tool.res.slice(0, 380)
        const toolEnd = p.tool.e
        if (cur !== null) cur.e = Math.max(cur.e, toolEnd)
      }
    }
  }

  // In-flight step: the live partial (reasoning + tool calls still running).
  let liveRow: MazeNode | null = null
  if (snap.partial !== null) {
    const now = rel(Date.now())
    const tools: MazeTool[] = []
    let rz = 0
    let rzTxt = ''
    for (const b of snap.partial.blocks) {
      if (b.kind === 'reasoning') { rz += 1; rzTxt += b.text }
      else if (b.kind === 'tool-call') {
        tools.push({ k: 't', name: b.name, s: now, e: null, args: b.argsRaw, res: '', err: false, dur: 0, v: 'ok', callId: b.callId })
      }
    }
    if (rz > 0 || tools.length > 0) {
      liveRow = pushStep(now, now + 0.1, tools, rz, rzTxt)
      liveRow.live = true
    }
  }

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
    v,
    why: { k: 'child', p: [child.label, rows.length, tools.length, state] },
    ...(child.running ? { live: true } : {}),
  }
}

/**
 * Convert the live session snapshot into maze data. Returns null while the
 * session has no usable conversation nodes yet.
 * @param snap - the current session's conversation snapshot.
 * @param children - dsh subagent child sessions to fold in as detour nodes.
 */
export function snapshotToMazeData(
  snap: ConversationSnapshot,
  children: readonly ChildSessionMaze[] = [],
): MazeData | null {
  const nodes = snap.nodes
  const firstUser = nodes.find(n => n.kind === 'user')
  const anchor = firstUser !== undefined ? firstUser.time : (nodes[0]?.time ?? Date.now())
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
  // requestConfig is only present on assistant nodes whose request header fell
  // inside the snapshot window; take the latest carrier so the current model shows.
  let model: string | null = null
  for (const n of nodes) {
    if (n.kind === 'assistant' && n.requestConfig?.model !== undefined) model = n.requestConfig.model
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
