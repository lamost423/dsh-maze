/** Verdict settlement and partitioning for the live maze converter. */
import { describe, expect, it } from 'vitest'
import { snapshotToMazeData } from '../src/client/live-data.ts'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

const t0 = 1_787_000_000_000

function syntheticSnapshot(): ConversationSnapshot {
  return {
    partial: null,
    nodes: [
      { kind: 'user', time: t0 },
      // step 1: one failed tool + one ok tool -> error -> detour
      { kind: 'assistant', seq: 11, time: t0 + 2000, timing: { stepStartTime: t0 + 1000 }, requestConfig: { model: 'deepseek-v4-flash' }, blocks: [
        { kind: 'reasoning', text: 'think' },
        { kind: 'tool-call', name: 'bash', callId: 'a', argsRaw: '{"command":"ls"}' },
        { kind: 'tool-call', name: 'bash', callId: 'b', argsRaw: '{"command":"cat x"}' },
      ] },
      { kind: 'tool-result', time: t0 + 3000, callId: 'a', isError: true, content: [{ type: 'text', text: 'boom' }] },
      { kind: 'tool-result', time: t0 + 4000, callId: 'b', isError: false, content: [{ type: 'text', text: 'a'.repeat(6000) }] },
      // step 2: search tool with an empty result -> deadend -> detour
      { kind: 'assistant', seq: 12, time: t0 + 6000, timing: { stepStartTime: t0 + 5000 }, blocks: [
        { kind: 'tool-call', name: 'grep', callId: 'c', argsRaw: '{"pattern":"x"}' },
      ] },
      { kind: 'tool-result', time: t0 + 7000, callId: 'c', isError: false, content: [{ type: 'text', text: '' }] },
      // step 3: tool call whose result has not arrived -> pending -> stays main
      { kind: 'assistant', seq: 13, time: t0 + 9000, timing: { stepStartTime: t0 + 8000 }, blocks: [
        { kind: 'tool-call', name: 'bash', callId: 'd', argsRaw: '{"command":"sleep 99"}' },
      ] },
      // step 4: no tools -> answer -> main
      { kind: 'assistant', seq: 14, time: t0 + 11000, timing: { stepStartTime: t0 + 10000 }, blocks: [
        { kind: 'text', text: 'done' },
      ] },
    ],
  } as never
}

describe('snapshotToMazeData', () => {
  it('settles verdicts only from arrived tool results', () => {
    const data = snapshotToMazeData(syntheticSnapshot())
    expect(data).not.toBeNull()
    const lane = data!.lanes[0]!
    expect(lane.stats.main).toBe(2)
    expect(lane.stats.detours).toBe(2)
    expect(lane.detours.map(n => n.v).sort()).toEqual(['deadend', 'error'])
    // pending tool (no result) must not vote its step onto a detour
    expect(lane.main.some(n => n.tools.some(t => t.e === null))).toBe(true)
    // tool-less settled step renders as the answer node
    expect(lane.main[lane.main.length - 1]!.v).toBe('answer')
    // one user message -> every node belongs to turn 1
    expect(new Set([...lane.main, ...lane.detours].map(n => n.turn))).toEqual(new Set([1]))
  })

  it('carries no retired milestone fields (v0.3.0: turn alignment replaced mlist/milestones)', () => {
    const data = snapshotToMazeData(syntheticSnapshot())!
    expect('milestones' in data).toBe(false)
    expect('mlist' in data.lanes[0]!).toBe(false)
  })

  it('reports the latest model carried by a request header', () => {
    const data = snapshotToMazeData(syntheticSnapshot())
    expect(data!.lanes[0]!.model).toBe('deepseek-v4-flash')
  })

  it('returns null for an empty conversation', () => {
    expect(snapshotToMazeData({ partial: null, nodes: [] } as never)).toBeNull()
  })

  it('carries jump anchors: node seq and tool callId', () => {
    const data = snapshotToMazeData(syntheticSnapshot())
    const lane = data!.lanes[0]!
    const all = [...lane.main, ...lane.detours]
    expect(all.map(n => n.seq).sort()).toEqual([11, 12, 13, 14])
    const detour = lane.detours.find(n => n.v === 'error')!
    expect(detour.tools.map(t => t.callId)).toEqual(['a', 'b'])
  })

  it('keeps a 380-char tooltip excerpt and a 5000-char panel text for long results', () => {
    const data = snapshotToMazeData(syntheticSnapshot())
    const lane = data!.lanes[0]!
    const long = [...lane.main, ...lane.detours]
      .flatMap(n => n.tools)
      .find(t => t.callId === 'b')!
    expect(long.res).toHaveLength(380)
    expect(long.resFull).toHaveLength(5000)
  })

  it('attaches a rationale (why) to every settled node and tool', () => {
    const data = snapshotToMazeData(syntheticSnapshot())
    const lane = data!.lanes[0]!
    for (const n of [...lane.main, ...lane.detours]) {
      expect(n.why, `node S${n.step}`).toBeTruthy()
      for (const t of n.tools) if (t.e !== null) expect(t.why, `tool ${t.callId}`).toBeTruthy()
    }
    const err = lane.detours.find(n => n.v === 'error')!
    expect(err.why).toEqual({ k: 'errFlag' })
    const dead = lane.detours.find(n => n.v === 'deadend')!
    expect(dead.why!.k).toBe('searchEmpty')
  })

  it('keeps short write confirmations on the main path (no length verdicts)', () => {
    const snap = {
      partial: null,
      nodes: [
        { kind: 'user', time: t0 },
        { kind: 'assistant', seq: 11, time: t0 + 2000, timing: { stepStartTime: t0 + 1000 }, blocks: [
          { kind: 'tool-call', name: 'todo_write', callId: 'a', argsRaw: '{"todos":[]}' },
        ] },
        { kind: 'tool-result', time: t0 + 3000, callId: 'a', isError: false, content: [{ type: 'text', text: 'Updated todo list: 3 pending, 1 in progress, 0 completed.' }] },
      ],
    } as never
    const lane = snapshotToMazeData(snap)!.lanes[0]!
    expect(lane.stats.detours).toBe(0)
    expect(lane.main[0]!.v).toBe('ok')
    expect(lane.main[0]!.why).toEqual({ k: 'writeOk' })
  })

  it('marks blind-retry clusters: repeated near-identical calls with a failure inside', () => {
    const snap = {
      partial: null,
      nodes: [
        { kind: 'user', time: t0 },
        { kind: 'assistant', seq: 11, time: t0 + 2000, timing: { stepStartTime: t0 + 1000 }, blocks: [
          { kind: 'tool-call', name: 'bash', callId: 'a', argsRaw: '{"command":"python3 gen_timeline.py --check"}' },
        ] },
        { kind: 'tool-result', time: t0 + 3000, callId: 'a', isError: true, content: [{ type: 'text', text: 'boom' }] },
        { kind: 'assistant', seq: 12, time: t0 + 5000, timing: { stepStartTime: t0 + 4000 }, blocks: [
          { kind: 'tool-call', name: 'bash', callId: 'b', argsRaw: '{"command":"python3 gen_timeline.py --check"}' },
        ] },
        { kind: 'tool-result', time: t0 + 6000, callId: 'b', isError: false, content: [{ type: 'text', text: 'wrote timeline.html ok' }] },
      ],
    } as never
    const lane = snapshotToMazeData(snap)!.lanes[0]!
    // both steps leave the main path: the failure, and its blind retry
    expect(lane.stats.detours).toBe(2)
    const retry = lane.detours.find(n => n.v === 'retry')!
    expect(retry.why).toEqual({ k: 'retryCluster', p: [2, 1] })
    const err = lane.detours.find(n => n.v === 'error')!
    expect(err.tools[0]!.why2).toEqual({ k: 'retryCtx', p: [2] })
  })

  it('carries real token usage per step and lane totals; null without usage', () => {
    const snap = {
      partial: null,
      nodes: [
        { kind: 'user', time: t0 },
        { kind: 'assistant', seq: 11, time: t0 + 2000, timing: { stepStartTime: t0 + 1000 }, usage: { inputTokens: 900, outputTokens: 321, reasoningTokens: 274 }, blocks: [
          { kind: 'text', text: 'a' },
        ] },
        { kind: 'assistant', seq: 12, time: t0 + 4000, timing: { stepStartTime: t0 + 3000 }, usage: { outputTokens: 100, reasoningTokens: 40 }, blocks: [
          { kind: 'text', text: 'b' },
        ] },
      ],
    } as never
    const lane = snapshotToMazeData(snap)!.lanes[0]!
    expect(lane.main.map(n => n.rzTok)).toEqual([274, 40])
    expect(lane.stats.rzTok).toBe(314)
    expect(lane.stats.outTok).toBe(421)
    // 无 usage 的会话：统计为 null，页面据此回退到「N 段推理」的诚实标签
    const bare = snapshotToMazeData(syntheticSnapshot())!.lanes[0]!
    expect(bare.stats.rzTok).toBeNull()
    expect(bare.stats.outTok).toBeNull()
  })

  it('carries input/cache tokens per step for the token-pulse and context-pressure tracks', () => {
    const snap = {
      partial: null,
      nodes: [
        { kind: 'user', time: t0 },
        // inputTokens 是未命中缓存的输入，cacheReadTokens 是缓存命中——上下文总量 = 两者之和
        { kind: 'assistant', seq: 11, time: t0 + 2000, timing: { stepStartTime: t0 + 1000 }, usage: { inputTokens: 15852, outputTokens: 887, cacheReadTokens: 384 }, blocks: [
          { kind: 'text', text: 'a' },
        ] },
        { kind: 'assistant', seq: 12, time: t0 + 4000, timing: { stepStartTime: t0 + 3000 }, usage: { inputTokens: 3118, outputTokens: 385, cacheReadTokens: 17024 }, blocks: [
          { kind: 'text', text: 'b' },
        ] },
      ],
    } as never
    const lane = snapshotToMazeData(snap)!.lanes[0]!
    expect(lane.main.map(n => n.inTok)).toEqual([15852, 3118])
    expect(lane.main.map(n => n.cacheTok)).toEqual([384, 17024])
    // usage 没报这两项时字段缺席（页面据此不画轨道，不猜数）
    const bare = snapshotToMazeData(syntheticSnapshot())!.lanes[0]!
    expect(bare.main.every(n => n.inTok == null && n.cacheTok == null)).toBe(true)
  })

  it('drops pre-window stale assistant nodes and counts them as preWindow', () => {
    const snap = {
      partial: null,
      nodes: [
        // 更早轮次的尾巴：早于窗口内首条用户消息，会被钳到 0 制造假象 -> 丢弃并计数
        { kind: 'assistant', seq: 5, time: t0 - 60000, blocks: [
          { kind: 'tool-call', name: 'bash', callId: 'old', argsRaw: '{"command":"ls"}' },
        ] },
        { kind: 'tool-result', time: t0 - 59000, callId: 'old', isError: false, content: [{ type: 'text', text: 'stale' }] },
        { kind: 'user', time: t0 },
        { kind: 'assistant', seq: 11, time: t0 + 2000, timing: { stepStartTime: t0 + 1000 }, blocks: [
          { kind: 'text', text: 'fresh answer' },
        ] },
      ],
    } as never
    const lane = snapshotToMazeData(snap)!.lanes[0]!
    expect(lane.preWindow).toBe(1)
    expect(lane.stats.steps).toBe(1)
    expect(lane.main[0]!.v).toBe('answer')
  })

  it('ignores failure-looking text quoted deep in output; catches head and tail signatures', () => {
    const quoted = 'commit log '.repeat(60) + ' upstream returns HTTP 400 when sound=true ' + 'more log '.repeat(200)
    const tailCrash = 'build output '.repeat(200) + ' [stderr] Traceback (most recent call last): boom'
    const headMiss = 'command not found: foobar'
    const snap = {
      partial: null,
      nodes: [
        { kind: 'user', time: t0 },
        { kind: 'assistant', seq: 11, time: t0 + 2000, timing: { stepStartTime: t0 + 1000 }, blocks: [
          { kind: 'tool-call', name: 'bash', callId: 'a', argsRaw: '{"command":"git log"}' },
        ] },
        { kind: 'tool-result', time: t0 + 3000, callId: 'a', isError: false, content: [{ type: 'text', text: quoted }] },
        { kind: 'assistant', seq: 12, time: t0 + 5000, timing: { stepStartTime: t0 + 4000 }, blocks: [
          { kind: 'tool-call', name: 'bash', callId: 'b', argsRaw: '{"command":"pnpm build"}' },
        ] },
        { kind: 'tool-result', time: t0 + 6000, callId: 'b', isError: false, content: [{ type: 'text', text: tailCrash }] },
        { kind: 'assistant', seq: 13, time: t0 + 8000, timing: { stepStartTime: t0 + 7000 }, blocks: [
          { kind: 'tool-call', name: 'bash', callId: 'c', argsRaw: '{"command":"foobar"}' },
        ] },
        { kind: 'tool-result', time: t0 + 9000, callId: 'c', isError: false, content: [{ type: 'text', text: headMiss }] },
      ],
    } as never
    const lane = snapshotToMazeData(snap)!.lanes[0]!
    const byCall = new Map([...lane.main, ...lane.detours].flatMap(n => n.tools.map(t => [t.callId, t] as const)))
    expect(byCall.get('a')!.v).toBe('ok')      // 引用在正文深处，不算这条命令失败
    expect(byCall.get('b')!.v).toBe('error')   // 末尾 stderr 追加段
    expect(byCall.get('c')!.v).toBe('error')   // 开头真实报错
  })

  it('renders request-level failures: model-retry and turn-error become error detours', () => {
    const snap = {
      partial: null,
      nodes: [
        { kind: 'user', time: t0 },
        // 请求一上来就失败，安排 30s 退避重试——此前这段在图上是纯空白
        { kind: 'model-retry', seq: 3, time: t0 + 1000, retryId: 'r1', turn: 1, step: 1, provider: 'p', mode: 'normal', policyKey: 'k', retry: 1, maxRetries: 5, delayMs: 30_000, failure: { message: 'HTTP 500', code: 'SERVER_ERROR' }, retryState: 'started' },
        { kind: 'assistant', seq: 11, time: t0 + 40_000, timing: { stepStartTime: t0 + 35_000 }, blocks: [
          { kind: 'text', text: 'recovered' },
        ] },
        { kind: 'turn-error', seq: 12, time: t0 + 50_000, turn: 2, step: 1, message: 'retries exhausted', code: 'RETRY_EXHAUSTED' },
      ],
    } as never
    const lane = snapshotToMazeData(snap)!.lanes[0]!
    const retry = lane.detours.find(n => n.evt === 'retry')!
    expect(retry.v).toBe('error')
    expect(retry.label).toBe('↻1')
    expect(retry.why).toEqual({ k: 'llmRetry', p: [1, 5, 30, 'HTTP 500 [SERVER_ERROR]', 0] })
    expect(retry.e - retry.s).toBeCloseTo(30, 1)   // 条长 = 退避等待窗口
    const te = lane.detours.find(n => n.evt === 'turnError')!
    expect(te.v).toBe('error')
    expect(te.why).toEqual({ k: 'turnError', p: ['retries exhausted', 'RETRY_EXHAUSTED'] })
    // 恢复后的正常回答仍在主干；失败标记不挤占真实步骤的 S 编号
    expect(lane.main.some(n => n.v === 'answer')).toBe(true)
    expect(lane.main.find(n => n.v === 'answer')!.step).toBe(1)
  })

  it('a cancelled retry renders as a point marker, not a fabricated full backoff wait', () => {
    const snap = {
      partial: null,
      nodes: [
        { kind: 'user', time: t0 },
        // 用户在退避等待期按了停止：重试被取消，30s 的退避没有真等完
        { kind: 'model-retry', seq: 3, time: t0 + 1000, retryId: 'r1', turn: 1, step: 1, provider: 'p', mode: 'normal', policyKey: 'k', retry: 1, maxRetries: 5, delayMs: 30_000, failure: { message: 'HTTP 500', code: '' }, retryState: 'cancelled' },
      ],
    } as never
    const lane = snapshotToMazeData(snap)!.lanes[0]!
    const retry = lane.detours.find(n => n.evt === 'retry')!
    expect(retry.e).toBe(retry.s)                       // 时间点，不虚报等待
    expect(retry.why!.p![4]).toBe(1)                    // 依据带取消标记（展示端据此换文案）
  })

  it('keeps a 240-char reasoning excerpt and a 2000-char panel text', () => {
    const snap = syntheticSnapshot() as { nodes: { kind: string; blocks?: { kind: string; text?: string }[] }[] }
    const first = snap.nodes.find(n => n.kind === 'assistant')!
    first.blocks![0] = { kind: 'reasoning', text: 'r'.repeat(9000) }
    const data = snapshotToMazeData(snap as never)
    const node = [...data!.lanes[0]!.main, ...data!.lanes[0]!.detours].find(n => n.seq === 11)!
    expect(node.rzTxt).toHaveLength(240)
    expect(node.rzTxtFull).toHaveLength(2000)
  })
})
