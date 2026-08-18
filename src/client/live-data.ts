/**
 * Live maze data converter: ConversationSnapshot (the session's real-time
 * observable) → the same maze payload the upload page renders. Verdict and
 * main/detour partitioning mirror the upload page's logic so both modes
 * share one visual language.
 */
import type { ConversationNode, ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

/** One tool event in the maze model. */
export interface MazeTool {
  k: 't'
  name: string
  s: number
  e: number | null
  args: string
  res: string
  err: boolean
  dur: number
  v: 'error' | 'deadend' | 'neutral' | 'ok'
  /** Call head pairing key; dropped before the payload crosses to the iframe. */
  _callId?: string
}

/** One maze node (main step or detour branch). */
export interface MazeNode {
  step: number
  s: number
  e: number
  tools: MazeTool[]
  rz: number
  rzTxt: string
  v: 'ok' | 'answer' | 'error' | 'deadend' | 'neutral'
  attach?: number
}

/** One lane (one session). */
export interface MazeLane {
  key: 'l1' | 'l2'
  model: string | null
  main: MazeNode[]
  detours: MazeNode[]
  stats: { steps: number; tools: number; rz: number; T: number; main: number; detours: number }
  mlist: number | null
}

/** The maze payload the upload page consumes. */
export interface MazeData {
  Tmax: number
  milestones: { id: string; label: string; flashT: number; proT: number }[]
  lanes: MazeLane[]
}

const MODEL_LIKE = /"data"\s*:\s*\[/

function toolVerdict(ev: MazeTool): MazeTool['v'] {
  if (ev.err) return 'error'
  if (/No such container|Invalid token|HTTP 40\d|HTTP 50\d|^Error:|raw output|does not match|No such file/i.test(ev.res)) return 'error'
  if (ev.res.length < 60 || ev.res === '---' || ev.res === '') return 'deadend'
  return 'ok'
}

const SEV: Record<MazeTool['v'], number> = { error: 3, deadend: 2, neutral: 1, ok: 0 }

function stepVerdict(tools: readonly MazeTool[]): MazeNode['v'] {
  let v: MazeNode['v'] = 'ok'
  for (const t of tools) if (SEV[t.v] > SEV[v]) v = t.v
  return v
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

  // Verdicts are recomputed after the full scan: at push time the step's
  // tool-results have not been paired yet (they arrive as later nodes).
  const pushStep = (s: number, e: number, tools: MazeTool[], rz: number, rzTxt: string): MazeNode => {
    nextStep += 1
    const node: MazeNode = {
      step: nextStep, s, e, tools, rz, rzTxt: rzTxt.replace(/\s+/g, ' ').trim().slice(0, 240),
      v: 'ok',
    }
    rows.push(node)
    return node
  }

  for (const n of nodes) {
    if (n.kind === 'assistant') {
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
          }
          tool._callId = b.callId
          tools.push(tool)
          pending.push({ tool })
        }
      }
      cur = pushStep(s, rel(n.time), tools, rz, rzTxt)
    } else if (n.kind === 'tool-result') {
      const idx = pending.findIndex(p => p.tool._callId === n.callId)
      if (idx >= 0) {
        const p = pending.splice(idx, 1)[0]!
        p.tool.e = rel(n.time)
        p.tool.res = contentText(n.content)
        p.tool.err = n.isError
        p.tool.dur = Math.round((p.tool.e - p.tool.s) * 10) / 10
        p.tool.v = toolVerdict(p.tool)
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
        tools.push({ k: 't', name: b.name, s: now, e: null, args: b.argsRaw ?? '', res: '', err: false, dur: 0, v: 'ok' })
      }
    }
    if (rz > 0 || tools.length > 0) liveRow = cur = pushStep(now, now + 0.1, tools, rz, rzTxt)
  }

  if (rows.length === 0) return null

  // Settle verdicts now that every arrived tool-result is paired. Pending
  // tools (no result yet) do not vote, so a step only becomes a detour once
  // its outcome is known; the in-flight step always stays on the main path.
  // Tool-less settled steps are answer nodes, mirroring the upload page.
  for (const r of rows) {
    if (r === liveRow) continue
    r.v = r.tools.length === 0 ? 'answer' : stepVerdict(r.tools.filter(t => t.e !== null))
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
  const T = Math.max(...rows.map(r => r.e), 0.1)
  let mlist: number | null = null
  outer: for (const r of rows) {
    for (const tool of r.tools) {
      if (tool.res && MODEL_LIKE.test(tool.res) && /model/i.test(tool.res) && /"id"/.test(tool.res)) {
        mlist = tool.e; break outer
      }
    }
  }
  // requestConfig is only present on assistant nodes whose request header fell
  // inside the snapshot window; take the latest carrier so the current model shows.
  let model: string | null = null
  for (const n of nodes) {
    if (n.kind === 'assistant' && n.requestConfig?.model !== undefined) model = n.requestConfig.model
  }
  const lane: MazeLane = {
    key: 'l1',
    model,
    main, detours,
    stats: { steps: rows.length, tools: toolsCount, rz: rzCount, T, main: main.length, detours: detours.length },
    mlist,
  }

  const Tmax = Math.max(T, 60)
  const milestones: MazeData['milestones'] = []
  if (mlist !== null) milestones.push({ id: 'm1', label: '模型列表结果', flashT: mlist, proT: mlist })
  milestones.push({ id: 'm2', label: '当前进度', flashT: T, proT: T })
  return { Tmax, milestones, lanes: [lane] }
}
