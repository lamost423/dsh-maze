/**
 * 页面解析段（maze-upload.html 的 buildLane / buildData）抽出来在 node 里跑——照 HANDOFF-trace-compare-tier1
 * 的做法：切出「解析」到「空闲折叠」之间的脚本，把 verdict.js 去掉 export 前缀注入占位符。
 * 覆盖只能在解析层验证的口径：上下文窗口按每次请求当时的模型（评审 P2-6：第一条 request/context 之前的样本用第一条兜底）。
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const html = readFileSync(new URL('../src/client/maze-upload.html', import.meta.url), 'utf8')
const verdict = readFileSync(new URL('../src/client/verdict.js', import.meta.url), 'utf8').replace(/^export /gm, '')
const a = html.indexOf('/* ============================ 解析：JSONL → lanes')
const b = html.indexOf('/* ==================== 空闲折叠')
const section = html.slice(a, b).replace('/*__VERDICT__*/', () => verdict)
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const page = new Function('tr', `${section}\nreturn { buildData, buildLane, contextOccupancy }`)((k: string) => k) as {
  buildData: (texts: string[], names: string[]) => { lanes: { main: { turn: number; inTok: number | null; ctxWin?: number }[]; ctxWindow: number | null }[] }
  contextOccupancy: (lane: unknown) => { windows: number[]; samples: { ratio: number | null }[] }
}

let seq = 0
const ev = (type: string, data: object, time: number): string => JSON.stringify({ type, seq: ++seq, time, data })

describe('page parse: per-request context window', () => {
  it('samples before the first request/context use the first one; later samples follow the switch (review P2-6)', () => {
    const t0 = 1_787_000_000_000
    const lines = [
      ev('user/message', { content: [{ type: 'text', text: 'go' }], source: { kind: 'user' } }, t0),
      ev('turn/start', { turn: 1 }, t0 + 100),
      // 第一步的 usage 落在第一条 request/context 之前（老日志的顺序）：用第一条的 262144 兜底
      ev('step/start', { turn: 1, step: 1 }, t0 + 200),
      ev('assistant/message', { turn: 1, step: 1, message: { content: [{ type: 'text', text: 'a' }] }, usage: { inputTokens: 200_000, cacheReadTokens: 0, outputTokens: 5 } }, t0 + 300),
      ev('step/end', { turn: 1, step: 1 }, t0 + 400),
      ev('request/context', { provider: 'relay', model: 'DeepSeek-V4-Flash-0731', contextWindow: 262_144 }, t0 + 500),
      ev('step/start', { turn: 1, step: 2 }, t0 + 600),
      ev('assistant/message', { turn: 1, step: 2, message: { content: [{ type: 'text', text: 'b' }] }, usage: { inputTokens: 210_000, cacheReadTokens: 0, outputTokens: 5 } }, t0 + 700),
      ev('step/end', { turn: 1, step: 2 }, t0 + 800),
      // 切到 1M 窗口（宿主真值缺席时查模型表）
      ev('request/context', { provider: 'deepseek-official', model: 'deepseek-v4-flash' }, t0 + 900),
      ev('step/start', { turn: 1, step: 3 }, t0 + 1000),
      ev('assistant/message', { turn: 1, step: 3, message: { content: [{ type: 'text', text: 'c' }] }, usage: { inputTokens: 300_000, cacheReadTokens: 0, outputTokens: 5 } }, t0 + 1100),
      ev('step/end', { turn: 1, step: 3 }, t0 + 1200),
      ev('turn/end', { turn: 1, reason: { kind: 'completed' } }, t0 + 1300),
    ].join('\n')
    const lane = page.buildData([lines], ['x.jsonl']).lanes[0]!
    expect(lane.main.map(n => n.ctxWin)).toEqual([262_144, 262_144, 1_000_000])
    expect(lane.ctxWindow).toBe(1_000_000)   // 泳道级留最后一条作退路
    const occ = page.contextOccupancy(lane)
    expect(occ.windows).toEqual([262_144, 1_000_000])
    expect(occ.samples.map(s => Math.round(s.ratio! * 100))).toEqual([76, 80, 30])
  })
})

describe('page parse: compaction events (诊断层第 3 项)', () => {
  it('记下 compaction/start 的时刻与每次 prune 的时刻，供轨道按真事件标注', () => {
    const t0 = 1_787_000_000_000
    const lines = [
      ev('user/message', { content: [{ type: 'text', text: 'go' }], source: { kind: 'user' } }, t0),
      ev('turn/start', { turn: 1 }, t0 + 100),
      ev('step/start', { turn: 1, step: 1 }, t0 + 200),
      ev('compaction/prune', { count: 3 }, t0 + 500),
      ev('compaction/start', {}, t0 + 1000),
      ev('compaction/summary', {}, t0 + 1100),
      ev('compaction/prune', { count: 2 }, t0 + 1200),
      ev('compaction/end', {}, t0 + 1300),
      ev('assistant/message', { turn: 1, step: 1, message: { content: [{ type: 'text', text: 'a' }] } }, t0 + 1400),
      ev('step/end', { turn: 1, step: 1 }, t0 + 1500),
      ev('turn/end', { turn: 1, reason: { kind: 'completed' } }, t0 + 1600),
    ].join('\n')
    const lane = page.buildData([lines], ['x.jsonl']).lanes[0]!
    const cp = (lane as { compaction: { starts: number[]; pruneAt: number[]; prunes: number; summaries: number; ends: number } }).compaction
    expect(cp.starts).toEqual([1])          // +1000ms
    expect(cp.pruneAt).toEqual([0.5, 1.2])  // 每一次 prune 都有时刻，轨道要画刻线
    expect(cp.prunes).toBe(2)
    expect(cp.summaries).toBe(1)
    expect(cp.ends).toBe(1)
  })
})

describe('page parse: 上下文构成（诊断层第 4 项）', () => {
  it('逐段按字符估算，并识别 skill 工具加载了哪个技能', () => {
    const t0 = 1_787_000_000_000
    const lines = [
      ev('user/message', { content: [{ type: 'text', text: 'go' }], source: { kind: 'user' } }, t0),
      ev('request/header', { header: { system: 'S'.repeat(1200), config: { model: 'm' } } }, t0 + 50),
      ev('user/message', {
        content: [{ type: 'text', text: 'x'.repeat(30) }],
        source: { kind: 'agent-instructions', changes: [{ path: 'AGENTS.md' }, { path: 'CLAUDE.md' }, { path: 'AGENTS.md' }] },
      }, t0 + 60),
      ev('user/message', {
        content: [{ type: 'text', text: 'y'.repeat(40) }],
        source: { kind: 'skill-catalog', entries: [{ name: 'a', description: 'd'.repeat(9) }, { name: 'bb', description: 'd'.repeat(8) }] },
      }, t0 + 70),
      ev('user/message', { content: [{ type: 'text', text: 'p'.repeat(25) }], source: { kind: 'plugin:todo-freshness-guard' } }, t0 + 80),
      ev('turn/start', { turn: 1 }, t0 + 100),
      ev('step/start', { turn: 1, step: 1 }, t0 + 200),
      ev('tool/call', { name: 'skill', arguments: JSON.stringify({ name: 'digest-qa-verify' }), callId: 'c1' }, t0 + 300),
      ev('tool/result', { callId: 'c1', content: [{ type: 'text', text: 'r'.repeat(50) }] }, t0 + 400),
      ev('assistant/message', { turn: 1, step: 1, message: { content: [{ type: 'text', text: 'z'.repeat(70) }] }, usage: { inputTokens: 10, cacheReadTokens: 0, outputTokens: 5 } }, t0 + 500),
      ev('step/end', { turn: 1, step: 1 }, t0 + 600),
      ev('turn/end', { turn: 1, reason: { kind: 'completed' } }, t0 + 700),
    ].join('\n')
    const lane = page.buildData([lines], ['x.jsonl']).lanes[0]!
    const ctx = (lane as { context: {
      sys: number | null; instr: number | null; skills: { n: number; chars: number } | null
      plugin: { name: string; chars: number }[]; tool: number | null; user: number | null
      assistant: number | null; loaded: string[]
    } }).context
    expect(ctx.sys).toBe(1200)                                   // request/header.header.system 长度
    expect(ctx.instr).toBe(2)                                    // 三个 changes 里两个不同路径
    expect(ctx.skills).toEqual({ n: 2, chars: 20 })              // (1+9) + (2+8)
    expect(ctx.plugin).toEqual([{ name: 'todo-freshness-guard', chars: 25 }])
    expect(ctx.tool).toBe(50)
    expect(ctx.user).toBe(2)                                     // 'go'
    expect(ctx.assistant).toBe(70)
    expect(ctx.loaded).toEqual(['digest-qa-verify'])
  })
})

describe('page parse: 对比变量表元数据（诊断层第 5 项）', () => {
  it('取到提供方/推理强度/权限/沙箱/审批/指令摘要/技能目录指纹与工作目录；缺失的留 null', () => {
    const t0 = 1_787_000_000_000
    const lines = [
      ev('session', { cwd: '/w', agentPreset: 'default' }, t0),
      ev('permission/preset', { preset: 'workspace-write' }, t0 + 10),
      ev('sandbox/mode', { mode: 'workspace-write' }, t0 + 20),
      ev('approval/policy', { policy: 'ask' }, t0 + 30),
      ev('request/header', { header: { system: 'S', config: { provider: 'deepseek-official', model: 'deepseek-flash', reasoningEffort: 'high' } } }, t0 + 40),
      ev('user/message', { content: [{ type: 'text', text: 'go' }], source: { kind: 'agent-instructions', changes: [{ path: 'AGENTS.md', digest: 'aaa' }] } }, t0 + 50),
      ev('user/message', { content: [{ type: 'text', text: 'c' }], source: { kind: 'skill-catalog', entries: [{ name: 'a', description: 'dd' }] } }, t0 + 60),
      ev('turn/start', { turn: 1 }, t0 + 100),
      ev('step/start', { turn: 1, step: 1 }, t0 + 200),
      ev('assistant/message', { turn: 1, step: 1, message: { content: [{ type: 'text', text: 'z' }] }, usage: { inputTokens: 10, cacheReadTokens: 0, outputTokens: 5 } }, t0 + 300),
      ev('step/end', { turn: 1, step: 1 }, t0 + 400),
      ev('turn/end', { turn: 1, reason: { kind: 'completed' } }, t0 + 500),
    ].join('\n')
    const lane = page.buildData([lines], ['x.jsonl']).lanes[0]!
    const meta = (lane as { meta: Record<string, string | null> }).meta
    expect(meta).toEqual({
      provider: 'deepseek-official', reasoningEffort: 'high', agentPreset: 'default',
      permission: 'workspace-write', sandbox: 'workspace-write', approval: 'ask',
      instructions: 'AGENTS.md:aaa', skills: 'a:2', cwd: '/w', model: 'deepseek-flash',
    })
  })

  it('日志没记录的项留 null（判定端据此说「未记录」，不当作相同）', () => {
    const t0 = 1_787_000_000_000
    const lines = [
      ev('turn/start', { turn: 1 }, t0),
      ev('step/start', { turn: 1, step: 1 }, t0 + 100),
      ev('assistant/message', { turn: 1, step: 1, message: { content: [{ type: 'text', text: 'z' }] }, usage: { inputTokens: 1, cacheReadTokens: 0, outputTokens: 1 } }, t0 + 200),
      ev('step/end', { turn: 1, step: 1 }, t0 + 300),
      ev('turn/end', { turn: 1, reason: { kind: 'completed' } }, t0 + 400),
    ].join('\n')
    const lane = page.buildData([lines], ['x.jsonl']).lanes[0]!
    const meta = (lane as { meta: Record<string, string | null> }).meta
    expect(meta.agentPreset).toBeNull()
    expect(meta.cwd).toBeNull()
    expect(meta.instructions).toBeNull()
    expect(meta.skills).toBeNull()
  })
})
