/**
 * 优化建议（诊断层第 6 项）：模板命中、上限与「没有建议」的空态。
 * 阈值按本机 240 场会话校准（见 verdict.js 的 SUGGESTION_RULES 注释）。
 */
import { describe, expect, it } from 'vitest'
import { SUGGESTION_RULES, suggestions } from '../src/client/verdict.js'

const tool = (name: string, args: string, v: string, s: number, e: number) =>
  ({ k: 't', name, args, s, e, res: '', err: v === 'error', dur: e - s, v })
const node = (step: number, tools: unknown[]) => {
  const ts = tools as { s: number; e: number }[]
  return { step, turn: 1, s: ts[0]?.s ?? 0, e: ts[ts.length - 1]?.e ?? 0, tools, rz: 0, rzTxt: '', v: 'ok' }
}
const laneOf = (main: unknown[], extra: Record<string, unknown> = {}) =>
  ({ key: 'l1', model: 'm', firstUser: 'x', main, detours: [], ...extra })
const wall = (t: number) => t
const keys = (lane: unknown) => suggestions(lane, wall).map(s => s.key)

describe('suggestions（诊断层第 6 项）', () => {
  it('失败后没换策略：3 条未恢复的失败链触发', () => {
    const nodes = [1, 2, 3].map(i => node(i, [tool('bash', `cmd-${i}`, 'error', i * 10, i * 10 + 5)]))
    expect(keys(laneOf(nodes))).toContain('unrecovered')
  })

  it('技能目录大且一条没加载触发；加载过就不触发', () => {
    const nodes = [node(1, [tool('bash', 'ls', 'ok', 0, 1)])]
    const big = { skills: { n: SUGGESTION_RULES.SKILL_UNUSED_MIN, chars: 5000 }, loaded: [] }
    expect(keys(laneOf(nodes, { context: big }))).toContain('skillsUnused')
    expect(keys(laneOf(nodes, { context: { ...big, loaded: ['a'] } }))).not.toContain('skillsUnused')
  })

  it('工具返回占比 ≥95% 且调用数够才触发', () => {
    const nodes = Array.from({ length: SUGGESTION_RULES.TOOL_SHARE_MIN_CALLS }, (_, i) => node(i + 1, [tool('bash', `c${i}`, 'ok', i, i + 1)]))
    const heavy = { tool: 9600, user: 100, assistant: 200, sys: 100 }
    expect(keys(laneOf(nodes, { context: heavy }))).toContain('toolHeavy')
    expect(keys(laneOf(nodes.slice(0, 3), { context: heavy }))).not.toContain('toolHeavy')   // 调用太少，占比没意义
    expect(keys(laneOf(nodes, { context: { tool: 5000, user: 3000, assistant: 1500, sys: 500 } }))).not.toContain('toolHeavy')
  })

  it('干净的会话给空数组（页面据此明说「没有触发任何模板」）', () => {
    const nodes = [node(1, [tool('bash', 'pnpm test', 'ok', 0, 3)]), node(2, [tool('read', '/a.ts', 'ok', 3, 4)])]
    expect(suggestions(laneOf(nodes, { context: { tool: 100, user: 100, assistant: 100, sys: 100 } }), wall)).toEqual([])
  })

  it('最多给 SUGGESTION_RULES.MAX 条（按价值排序取前几条）', () => {
    // 同时触发 6 类：未恢复失败、原样重试、同轮重复、工具返回过高、技能目录未加载、压缩
    const failing = [1, 2, 3, 4].map(i => node(i, [tool('bash', `cmd-${i}`, 'error', i * 10, i * 10 + 5)]))
    const retryPair = [node(5, [tool('bash', 'same-cmd', 'error', 50, 55)]), node(6, [tool('bash', 'same-cmd', 'ok', 56, 58)])]
    const repeats = Array.from({ length: 8 }, (_, i) => node(7 + i, [tool('read', '/same.ts', 'ok', 60 + i, 60.5 + i)]))
    const rest = Array.from({ length: 12 }, (_, i) => node(20 + i, [tool('bash', `c${i}`, 'ok', 100 + i, 101 + i)]))
    const many = [...failing, ...retryPair, ...repeats, ...rest]
    const out = suggestions(laneOf(many, {
      context: { tool: 99000, user: 100, assistant: 500, sys: 400, skills: { n: 80, chars: 9000 }, loaded: [] },
      compaction: { starts: [10, 20], prunes: 12, summaries: 2, ends: 2 },
      todoReminders: 40,
    }), wall)
    expect(out.length).toBe(SUGGESTION_RULES.MAX)                      // 触发 6 类也只给前 5 条
    expect(new Set(out.map(x => x.key)).size).toBe(out.length)          // 同一模板不重复出现
    expect(out.every(x => typeof x.why.k === 'string' && x.why.k.startsWith('sug'))).toBe(true)   // 文案都走结构化 why
  })
})
