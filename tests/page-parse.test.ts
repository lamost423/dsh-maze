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
