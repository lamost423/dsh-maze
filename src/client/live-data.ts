/**
 * Live maze data converter: ConversationSnapshot (the session's real-time
 * observable) → the same maze payload the upload page renders. Verdict and
 * main/detour partitioning mirror the upload page's logic so both modes
 * share one visual language.
 */
import type { ConversationNode, ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { markRetryClusters, stepVerdict, toolVerdict } from './verdict.js'

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
  /** 判定依据文本（tooltip/详情面板展示）。 */
  why?: string
  /**
   * Wire call identity: pairs the result during conversion, then anchors the
   * page's 在对话中定位 jump (the chat rows carry `data-chat-call-id`).
   */
  callId?: string
}

/** One maze node (main step or detour branch). */
export interface MazeNode {
  step: number
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
  /** 步级判定依据（最坏工具的依据）。 */
  why?: string
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

function contentText(blocks: readonly { type?: string; text?: string }[] | undefined): string {
  if (!blocks) return ''
  const out: string[] = []
  for (const b of blocks) if (b.type === 'text' && b.text !== undefined) out.push(b.text)
  return out.join('').replace(/\s+/g, ' ').trim()
}

/**
 * Convert the live session snapshot into maze data. Returns null while the
 * session has no usable conversation nodes yet.
 */
export function snapshotToMazeData(snap: ConversationSnapshot): MazeData | null {
  const nodes = snap.nodes as readonly ConversationNode[]
  const firstUser = nodes.find(n => n.kind === 'user')
  const anchor = firstUser !== undefined ? firstUser.time : (nodes[0]?.time ?? Date.now())
  const rel = (t: number): number => Math.max(0, Math.round((t - anchor) / 100) / 10)

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
            args: b.argsRaw ?? '', res: '', err: false, dur: 0, v: 'ok',
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
      if (idx >= 0) {
        const p = pending.splice(idx, 1)[0]!
        p.tool.e = rel(n.time)
        p.tool.res = contentText(n.content)
        p.tool.err = n.isError
        p.tool.dur = Math.round((p.tool.e - p.tool.s) * 10) / 10
        const tv = toolVerdict(p.tool)
        p.tool.v = tv.v
        p.tool.why = tv.why
        p.tool.resFull = p.tool.res.slice(0, 5000)
        p.tool.res = p.tool.res.slice(0, 380)
        const toolEnd = p.tool.e ?? p.tool.s
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
        tools.push({ k: 't', name: b.name, s: now, e: null, args: b.argsRaw ?? '', res: '', err: false, dur: 0, v: 'ok', callId: b.callId })
      }
    }
    if (rz > 0 || tools.length > 0) {
      liveRow = cur = pushStep(now, now + 0.1, tools, rz, rzTxt)
      liveRow.live = true
    }
  }

  if (rows.length === 0) return null

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
      r.why = '无工具调用，输出回答'
      continue
    }
    const sv = stepVerdict(r.tools.filter(t => t.e !== null))
    if (sv !== null) {
      r.v = sv.v
      if (sv.why !== undefined) r.why = sv.why
    } else {
      r.why = '工具结果未返回，暂留主干'
    }
  }

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
  const toolsCount = rows.reduce((n, r) => n + r.tools.length, 0)
  const rzCount = rows.reduce((n, r) => n + r.rz, 0)
  const rzTok = rows.some(r => r.rzTok != null) ? rows.reduce((n, r) => n + (r.rzTok ?? 0), 0) : null
  const outTok = rows.some(r => r.outTok != null) ? rows.reduce((n, r) => n + (r.outTok ?? 0), 0) : null
  const T = Math.max(...rows.map(r => r.e), 0.1)
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
