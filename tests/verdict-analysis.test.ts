/** 分析层（v0.7）：失败恢复链分类、模型上下文窗口解析，与下沉的聚合逻辑。 */
import { describe, expect, it } from 'vitest'
import {
  ANALYSIS_RULES, analyzeFailureChains, contextWindowFor,
  countRequestFailures, mergeIntervalsTotal, percentile, settledLaneCalls, taskComparability, toolMatrix,
} from '../src/client/verdict.js'

const call = (name: string, args: string, v: string, s: number, e?: number) =>
  ({ name, args, v, s, e: e ?? s + 1 })

describe('analyzeFailureChains', () => {
  it('classifies the very next call after a failure: identical / strategy / switch / none', () => {
    const chains = analyzeFailureChains([
      // 失败 → 同工具同参数再来一次：原样重试
      call('bash', '{"command":"npm run build --verbose"}', 'error', 0),
      call('bash', '{"command":"npm run build --verbose"}', 'ok', 5),
      // 失败 → 同工具但参数明显换了：换参数（策略改变）
      call('grep', '{"pattern":"loadConfig","path":"src"}', 'error', 10),
      call('grep', '{"pattern":"parseSettings","path":"lib/internal"}', 'ok', 15),
      // 失败 → 换了别的工具：换工具（策略改变）
      call('bash', '{"command":"cat missing.txt"}', 'error', 20),
      call('read', '{"file_path":"present.txt"}', 'ok', 25),
      // 失败收尾：之后再无任何调用
      call('bash', '{"command":"deploy"}', 'error', 30),
    ])
    expect(chains.map(c => c.mode)).toEqual(['identical', 'strategy', 'switch', 'none'])
    expect(chains.map(c => c.name)).toEqual(['bash', 'grep', 'bash', 'bash'])
  })

  it('recovery = first later successful call of any tool, wall-clock from the failure start', () => {
    const chains = analyzeFailureChains([
      call('bash', '{"command":"a"}', 'error', 0),
      call('bash', '{"command":"a"}', 'error', 10),   // 中间又失败，不算恢复
      call('grep', '{"pattern":"x"}', 'ok', 42),
    ])
    expect(chains).toHaveLength(2)
    expect(chains[0]!.recoverSec).toBe(42)
    expect(chains[1]!.recoverSec).toBe(32)
    expect(chains.every(c => c.recovered)).toBe(true)
  })

  it('recovery beyond the window is reported honestly as not recovered', () => {
    const late = analyzeFailureChains([
      call('bash', '{"command":"a"}', 'error', 0),
      call('bash', '{"command":"b"}', 'ok', ANALYSIS_RULES.RECOVERY_WINDOW + 30),
    ])
    expect(late[0]!.recoverSec).toBe(ANALYSIS_RULES.RECOVERY_WINDOW + 30)
    expect(late[0]!.recovered).toBe(false)
    // 此后再无成功：recoverSec 为 null
    const never = analyzeFailureChains([
      call('bash', '{"command":"a"}', 'error', 0),
      call('bash', '{"command":"a"}', 'error', 5),
    ])
    expect(never.every(c => c.recoverSec === null && !c.recovered)).toBe(true)
  })

  it('non-failures produce no chains', () => {
    expect(analyzeFailureChains([call('bash', '{}', 'ok', 0), call('grep', '{}', 'deadend', 5)])).toEqual([])
  })
})

describe('contextWindowFor', () => {
  it('resolves known model families (v4 line before the generic deepseek 128K)', () => {
    expect(contextWindowFor('deepseek-v4-flash')).toBe(1_000_000)
    expect(contextWindowFor('deepseek-v4-pro')).toBe(1_000_000)
    expect(contextWindowFor('deepseek-chat')).toBe(128_000)
    expect(contextWindowFor('kimi-k2-instruct')).toBe(256_000)
    expect(contextWindowFor('claude-sonnet-5')).toBe(200_000)
    expect(contextWindowFor('gpt-5.6-terra')).toBe(400_000)
  })

  it('returns null for unknown models and empty input — the page falls back to absolute tokens', () => {
    expect(contextWindowFor('totally-new-model-9000')).toBeNull()
    expect(contextWindowFor(null)).toBeNull()
    expect(contextWindowFor('')).toBeNull()
  })
})

describe('settledLaneCalls（抽测点：在途调用不进统计）', () => {
  it('excludes in-flight (e:null, dur:0), subagent aggregates, and request-failure markers; sorts by start', () => {
    const lane = {
      main: [
        { tools: [{ name: 'bash', s: 10, e: 14, dur: 4, v: 'ok' }] },
        // 在途调用：e 为 null 但 dur 创建时就是 0——判据只能看 e，拿 dur 判会永不生效（P1 回归）
        { tools: [{ name: 'read', s: 30, e: null, dur: 0, v: 'ok' }] },
      ],
      detours: [
        { tools: [{ name: 'bash', s: 5, e: 8, dur: 3, v: 'error' }] },
        { sub: true, tools: [{ name: 'grep', s: 1, e: 2, dur: 1, v: 'ok' }] },   // 子代理聚合
        { evt: 'retry', tools: [] },                                              // 请求级失败标记
      ],
    }
    const calls = settledLaneCalls(lane)
    expect(calls.map(c => c.tl.name)).toEqual(['bash', 'bash'])
    expect(calls.map(c => c.tl.s)).toEqual([5, 10])   // 时间序
  })
})

describe('countRequestFailures（抽测点：全失败会话不亮绿灯的计数依据）', () => {
  it('counts evt-marked nodes across main and detours', () => {
    expect(countRequestFailures({ main: [], detours: [{ evt: 'retry' }, { evt: 'retry' }, { evt: 'turnError' }, { v: 'error' }] })).toBe(3)
    expect(countRequestFailures({ main: [{}], detours: [{ v: 'error' }] })).toBe(0)
  })
})

describe('taskComparability（抽测点：图例原因要说真话）', () => {
  it('separates "different tasks" from "cannot tell" (missing first user message)', () => {
    expect(taskComparability(['fix the bug', 'fix the bug'])).toEqual({ sameTask: true, reason: 'same' })
    expect(taskComparability(['fix the bug', 'write docs'])).toEqual({ sameTask: false, reason: 'diff' })
    expect(taskComparability(['fix the bug', ''])).toEqual({ sameTask: false, reason: 'no-first-user' })
    expect(taskComparability(['fix the bug'])).toEqual({ sameTask: false, reason: 'single' })
  })
})

describe('mergeIntervalsTotal', () => {
  it('merges intervals within the gap and splits beyond it, regardless of input order', () => {
    // 10s 活动 + 30s 内的近邻并段 + 远处独立段（gap 60 同空闲折叠口径）
    expect(mergeIntervalsTotal([[100, 110], [0, 10], [30, 40]], 60)).toBe(110)   // 0..40 与 100..110 各自成段? 40+60=100 ≥ 100 → 全并成 0..110
    expect(mergeIntervalsTotal([[0, 10], [200, 230]], 60)).toBe(40)             // 相隔 190s：两段独立 10+30
    expect(mergeIntervalsTotal([], 60)).toBe(0)
    expect(mergeIntervalsTotal([[5, 5]], 60)).toBe(0)                            // 点区间
    expect(mergeIntervalsTotal([[10, 3]], 60)).toBe(0)                           // 脏区间按点处理
  })
})

describe('percentile（最近邻法）', () => {
  it('nearest-rank: single sample is itself, small-n P95 lands on a real observation', () => {
    expect(percentile([], 95)).toBe(0)
    expect(percentile([7], 95)).toBe(7)
    expect(percentile([1, 2, 3, 4], 50)).toBe(2)
    // n=10 的 P95 落在最大值上——刻意取真实观测值，不造不存在的中间数
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 100], 95)).toBe(100)
  })
})

describe('toolMatrix', () => {
  it('aggregates verdict counts and duration samples per tool', () => {
    const m = toolMatrix([
      { name: 'bash', v: 'ok', dur: 1 },
      { name: 'bash', v: 'error', dur: 5 },
      { name: 'bash', v: 'retry', dur: 2 },
      { name: 'grep', v: 'deadend', dur: 0.5 },
    ])
    expect(m.get('bash')).toEqual({ calls: 3, ok: 1, error: 1, deadend: 0, retry: 1, durs: [1, 5, 2] })
    expect(m.get('grep')!.deadend).toBe(1)
  })
})
