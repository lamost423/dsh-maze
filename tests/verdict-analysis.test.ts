/** 分析层（v0.7）：失败恢复链分类与模型上下文窗口解析。 */
import { describe, expect, it } from 'vitest'
import { ANALYSIS_RULES, analyzeFailureChains, contextWindowFor } from '../src/client/verdict.js'

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
