/** 诊断层第 2 项：行为信号清单——每种信号触发与不触发各一份合成用例，阈值常量固定在校准表上。 */
import { describe, expect, it } from 'vitest'
import { ANALYSIS_RULES, behaviorSignals, callSignature, contextOccupancy } from '../src/client/verdict.js'

const R = ANALYSIS_RULES.SIGNALS

/* ---- 合成泳道：每个调用自成一步；opts: { err, dur, turn, ctx }（ctx = 该步 inTok+cacheTok 的上下文快照） ---- */
type Call = [string, string, { err?: boolean; dur?: number; turn?: number; ctx?: number }?]
interface Lane { main: object[]; detours: object[]; model?: string | null; ctxWindow?: number | null; compaction?: { starts: number[]; prunes: number; summaries: number; ends: number }; todoReminders?: number }

function synth(calls: readonly Call[], extra: Partial<Lane> = {}): Lane {
  const main: object[] = [], detours: object[] = []
  let t = 0
  calls.forEach(([name, args, o = {}], i) => {
    t += 10
    const dur = o.dur ?? 1
    const tool = { name, args, s: t, e: t + dur, dur, v: o.err ? 'error' : 'ok', err: o.err ?? false, callId: 'c' + i }
    const node = { step: i + 1, turn: o.turn ?? 1, s: t, e: t + dur + 1, v: o.err ? 'error' : 'ok', tools: [tool], ...(o.ctx !== undefined ? { inTok: o.ctx, cacheTok: 0 } : {}) }
    ;(o.err ? detours : main).push(node)
  })
  return { main, detours, ...extra }
}
const sig = (lane: Lane) => behaviorSignals(lane as never)
const byType = (lane: Lane, type: string) => sig(lane).find(s => s.type === type)
const bash = (cmd: string, o?: Call[2]): Call => ['bash', cmd, o]
const rep = (n: number, ...c: Call[]): Call[] => Array.from({ length: n }, () => c).flat()

describe('ANALYSIS_RULES.SIGNALS（阈值固定在 2026-09-06 校准表上）', () => {
  it('matches the calibration table', () => {
    expect(R.MECHANICAL).toEqual({ medium: 1, high: 3 })
    expect(R.REPEAT).toEqual({ low: { rate: 0.10, min: 5 }, medium: { rate: 0.20, min: 10 } })
    expect(R.REPEAT_READ).toBe(5)
    expect(R.LOOP).toEqual({ medium: 9, high: 30 })
    expect(R.FAIL).toEqual({ medium: { count: 5, rate: 0.05 }, high: { count: 5, rate: 0.10 } })
    expect(R.SLOW_SEC).toBe(120)
    expect(R.SLOW).toEqual({ low: 1, medium: 3 })
    expect(R.HHI).toEqual({ minCalls: 20, min: 0.85 })
    expect(R.CTX_JUMP).toBe(0.20)
    expect(R.CTX_PEAK).toEqual({ low: 0.5, medium: 0.7, high: 0.9 })
    expect(R.PRUNE_NOTE).toBe(10)
    expect(R.TODO).toEqual({ low: 10, medium: 30 })
    expect(R.POLL_TOOLS).toEqual(['job_output', 'todo_write', 'list_agents', 'send_message', 'wait', 'sleep'])
  })
})

describe('callSignature（与校准脚本同规则）', () => {
  it('bash = whole command collapsed; read/write = path; others = JSON; both raw JSON and summary forms', () => {
    expect(callSignature('bash', '{"command":"ls   -la","description":"x"}')).toBe('bash|ls -la')
    expect(callSignature('bash', 'ls   -la')).toBe('bash|ls -la')
    expect(callSignature('read', '{"file_path":"/a.ts"}')).toBe('read|/a.ts')
    expect(callSignature('read', '/a.ts')).toBe('read|/a.ts')
    expect(callSignature('grep', '{"pattern":"x","path":"src"}')).toBe('grep|src')
    expect(callSignature('bash', 'x'.repeat(400)).length).toBe('bash|'.length + R.SIG_MAX)
  })
})

describe('behaviorSignals', () => {
  it('empty lane / no usage → no signals, no throw', () => {
    expect(sig({ main: [], detours: [] })).toEqual([])
    expect(sig(synth([bash('ls'), bash('pwd')]))).toEqual([])
  })

  it('失败后原样重试：上一次失败、这一次同工具同参数 → 中（≥1）/ 高（≥3）；换了参数不算', () => {
    const one = byType(synth([bash('pnpm test', { err: true }), bash('pnpm test')]), 'mechanicalRetry')!
    expect(one).toMatchObject({ severity: 'medium', count: 1 })
    expect(one.callIds).toEqual(['c1'])
    const three = synth([bash('x', { err: true }), bash('x', { err: true }), bash('x', { err: true }), bash('x')])
    expect(byType(three, 'mechanicalRetry')).toMatchObject({ severity: 'high', count: 3 })
    expect(byType(synth([bash('x', { err: true }), bash('x --fix')]), 'mechanicalRetry')).toBeUndefined()
    // 原样重试不进同轮重复的计数
    expect(byType(three, 'repeat')).toBeUndefined()
  })

  it('换策略恢复：失败后同目标换参数（或换工具）成功 → 信息级；换工具换目标不算', () => {
    expect(byType(synth([bash('pytest -x', { err: true }), bash('pytest -q')]), 'adaptiveRecovery')).toMatchObject({ severity: 'info', count: 1 })
    expect(byType(synth([['read', '/a.ts', { err: true }], ['read', '/b.ts']]), 'adaptiveRecovery')).toBeUndefined()
  })

  it('同轮重复调用：排除轮询类；占比 ≥10% 且 ≥5 次为低，≥20% 且 ≥10 次为中；跨轮不算；重复读取作子标签', () => {
    // 50 次调用：同一文件同轮读 6 次 = 首次 + 5 次重复（10%）→ 低；5 次都是读取 → 子标签
    const distinct = Array.from({ length: 44 }, (_, i) => bash('cmd' + i))
    const low = synth([...distinct, ...rep(6, ['read', '/x.ts'])])
    const s = byType(low, 'repeat')!
    expect(s).toMatchObject({ severity: 'low', count: 5 })
    expect(s.why.p).toEqual([5, 10, 5])
    // 同样的重复但跨轮：不算
    expect(byType(synth([...distinct, ...Array.from({ length: 6 }, (_, i): Call => ['read', '/x.ts', { turn: i + 2 }])]), 'repeat')).toBeUndefined()
    // 轮询类工具反复调不算
    expect(byType(synth([...distinct, ...rep(6, ['job_output', '{"job_id":"j1"}'])]), 'repeat')).toBeUndefined()
    // 21 次调用里同一命令出现 11 次 = 10 次重复（48%）→ 中
    expect(byType(synth([...Array.from({ length: 10 }, (_, i) => bash('c' + i)), ...rep(11, bash('same'))]), 'repeat')).toMatchObject({ severity: 'medium', count: 10 })
    // 4 次重复（占 8%）：不到低的门槛
    expect(byType(synth([...distinct, ...rep(4, bash('same'))]), 'repeat')).toBeUndefined()
  })

  it('循环：排除轮询类后长度 1~3 序列连续 3 次；占用 ≥9 步为中，≥30 步为高；只重复 2 次不算', () => {
    const abc = (): Call[] => [bash('a'), bash('b'), bash('c')]
    const nine = synth([...abc(), ...abc(), ...abc()])
    const s = byType(nine, 'loop')!
    expect(s).toMatchObject({ severity: 'medium', count: 9 })
    expect(s.why.p).toEqual([1, 9])
    expect(byType(synth([...abc(), ...abc()]), 'loop')).toBeUndefined()
    // 长度 1 的序列连续 3 次是 3 步，不到 9；连续 9 次（分 3 段各 3 步）到 9
    expect(byType(synth(rep(3, bash('a'))), 'loop')).toBeUndefined()
    expect(byType(synth(rep(9, bash('a'))), 'loop')).toMatchObject({ severity: 'medium' })
    // 循环按「连续 3 次」成段计数：12 段 abc = 4 个循环、36 步 → 高；10 段只凑出 3 个循环 27 步 → 仍是中
    expect(byType(synth(Array.from({ length: 10 }, abc).flat()), 'loop')).toMatchObject({ severity: 'medium', count: 27 })
    expect(byType(synth(Array.from({ length: 12 }, abc).flat()), 'loop')).toMatchObject({ severity: 'high', count: 36 })
    // 中间插着轮询调用不打断循环
    expect(byType(synth([...abc(), ['job_output', 'j'], ...abc(), ...abc()]), 'loop')).toMatchObject({ severity: 'medium' })
  })

  it('工具失败：失败 ≥5 次或失败率 ≥5% 为中；失败率 ≥10% 且 ≥5 次为高', () => {
    const ok = Array.from({ length: 95 }, (_, i) => bash('ok' + i))
    expect(byType(synth([...ok, ...Array.from({ length: 5 }, (_, i) => bash('bad' + i, { err: true }))]), 'toolFail')).toMatchObject({ severity: 'medium', count: 5 })   // 5%
    expect(byType(synth([...ok.slice(0, 40), ...Array.from({ length: 5 }, (_, i) => bash('bad' + i, { err: true }))]), 'toolFail')).toMatchObject({ severity: 'high' })    // 11%
    expect(byType(synth([...ok, bash('bad', { err: true })]), 'toolFail')).toBeUndefined()   // 1%
    expect(byType(synth([bash('bad', { err: true }), bash('ok')]), 'toolFail')).toMatchObject({ severity: 'medium' })   // 50% 但只 1 次：按失败率也算中
  })

  it('慢调用：单次 ≥120 秒；≥1 次低，≥3 次中；点名最长的那次', () => {
    const one = byType(synth([bash('build', { dur: 130 }), bash('ls')]), 'slowCall')!
    expect(one).toMatchObject({ severity: 'low', count: 1 })
    expect(one.why.p).toEqual([1, 130, 'bash'])
    expect(byType(synth([bash('a', { dur: 120 }), bash('b', { dur: 200 }), bash('c', { dur: 500 })]), 'slowCall')).toMatchObject({ severity: 'medium', count: 3 })
    expect(byType(synth([bash('a', { dur: 119 })]), 'slowCall')).toBeUndefined()
  })

  it('工具集中度：调用 ≥20 次且赫芬达尔指数 ≥0.85 → 低；不到 20 次不看', () => {
    const s = byType(synth([...Array.from({ length: 19 }, (_, i) => bash('c' + i)), ['read', '/x']]), 'concentration')!
    expect(s).toMatchObject({ severity: 'low' })
    expect(s.why.p[0]).toBeCloseTo(0.905, 2)   // (19/20)² + (1/20)²
    expect(s.why.p.slice(1)).toEqual(['bash', 95])
    expect(byType(synth([...Array.from({ length: 10 }, (_, i) => bash('c' + i)), ...Array.from({ length: 10 }, (_, i): Call => ['read', '/f' + i])]), 'concentration')).toBeUndefined()
    expect(byType(synth(Array.from({ length: 19 }, (_, i) => bash('c' + i))), 'concentration')).toBeUndefined()
    // code 模式：外层全是 run_code，集中度必然 100%，不报
    expect(byType(synth(Array.from({ length: 25 }, (_, i): Call => ['run_code', 'script ' + i])), 'concentration')).toBeUndefined()
  })

  it('上下文骤升 / 骤降 / 峰值：按窗口真值换算；骤降落在压缩事件附近标压缩；没有窗口不出信号', () => {
    const lane = synth([bash('a', { ctx: 100 }), bash('b', { ctx: 400 }), bash('c', { ctx: 950 }), bash('d', { ctx: 300 })],
      { ctxWindow: 1000, compaction: { starts: [35], prunes: 0, summaries: 0, ends: 1 } })
    expect(byType(lane, 'ctxJump')).toMatchObject({ severity: 'medium', count: 2 })
    const drop = byType(lane, 'ctxDrop')!
    expect(drop).toMatchObject({ severity: 'info', count: 1 })
    expect(drop.why.p).toEqual([1, 95, 30, 1])
    const peak = byType(lane, 'ctxPeak')!
    expect(peak).toMatchObject({ severity: 'high' })
    expect(peak.why.p).toEqual([95, 1000])
    // 60% → 低；75% → 中
    expect(byType(synth([bash('a', { ctx: 600 })], { ctxWindow: 1000 }), 'ctxPeak')).toMatchObject({ severity: 'low' })
    expect(byType(synth([bash('a', { ctx: 750 })], { ctxWindow: 1000 }), 'ctxPeak')).toMatchObject({ severity: 'medium' })
    // 窗口真值缺席时退回模型表；模型也未知则不出任何上下文信号
    expect(byType(synth([bash('a', { ctx: 700_000 })], { model: 'deepseek-v4-flash' }), 'ctxPeak')).toMatchObject({ severity: 'medium' })
    expect(sig(synth([bash('a', { ctx: 900 })], { model: null })).some(s => s.type.startsWith('ctx'))).toBe(false)
    // 骤降没有压缩事件在附近：不标压缩
    expect(byType(synth([bash('a', { ctx: 900 }), bash('b', { ctx: 100 })], { ctxWindow: 1000 }), 'ctxDrop')!.why.p[3]).toBe(0)
  })

  it('上下文按每次请求当时的模型换算：中途从 262144 切到 1M，切换前的高占用按小窗口算（吴昊 2026-09-07 拍板）', () => {
    const lane = synth([bash('a', { ctx: 50_000 }), bash('b', { ctx: 200_000 }), bash('c', { ctx: 300_000 }), bash('d', { ctx: 320_000 })], { ctxWindow: 1_000_000 })
    ;(lane.main[0] as { ctxWin?: number }).ctxWin = 262_144
    ;(lane.main[1] as { ctxWin?: number }).ctxWin = 262_144
    ;(lane.main[2] as { ctxWin?: number }).ctxWin = 1_000_000
    ;(lane.main[3] as { ctxWin?: number }).ctxWin = 1_000_000
    const occ = contextOccupancy(lane as never)
    expect(occ.valid).toBe(true)
    expect(occ.windows).toEqual([262_144, 1_000_000])
    expect(occ.samples.map(s => Math.round(s.ratio! * 100))).toEqual([19, 76, 30, 32])
    expect(occ.peakWin).toBe(262_144)
    const peak = byType(lane, 'ctxPeak')!
    expect(peak).toMatchObject({ severity: 'medium' })
    expect(peak.why.p).toEqual([76.3, 262_144])
    // 200K → 300K token 是上升，但按各自窗口是 76% → 30%：记骤降，不记骤升
    expect(byType(lane, 'ctxJump')).toMatchObject({ count: 1 })   // 19% → 76%
    expect(byType(lane, 'ctxDrop')!.why.p.slice(0, 3)).toEqual([1, 76, 30])
    // 按最后一条窗口（1M）算会把切换前的 76% 看成 20%：这就是要逐请求换算的原因
    const flat = synth([bash('a', { ctx: 200_000 })], { ctxWindow: 1_000_000 })
    expect(byType(flat, 'ctxPeak')).toBeUndefined()
  })

  it('健全性守卫按窗口算：某窗口下有样本超过它，只作废该窗口的样本；全部作废才退回绝对值', () => {
    const all = synth([bash('a', { ctx: 300_000 })], { model: 'deepseek-chat' })   // 表值 128K，唯一样本超窗
    const occ = contextOccupancy(all as never)
    expect(occ.valid).toBe(false)
    expect(occ.peakTok).toBe(300_000)
    expect(sig(all).some(s => s.type.startsWith('ctx'))).toBe(false)
    // big2 的真实情形：中转站声称 262144 却跑了 595K 的请求——只略过那一个样本，其余仍按各自窗口算
    const mixed = synth([bash('a', { ctx: 595_000 }), bash('b', { ctx: 550_000 }), bash('c', { ctx: 700_000 })], { ctxWindow: 1_000_000 })
    ;(mixed.main[0] as { ctxWin?: number }).ctxWin = 262_144
    const o2 = contextOccupancy(mixed as never)
    expect(o2.valid).toBe(true)
    expect(o2.skipped).toBe(1)
    expect(o2.samples[0]!.ratio).toBeNull()
    expect(o2.windows).toEqual([1_000_000])
    expect(byType(mixed, 'ctxPeak')!.why.p).toEqual([70, 1_000_000])
    expect(byType(mixed, 'ctxJump')).toBeUndefined()   // 被略过的样本不参与相邻比较
  })

  it('压缩发生：start ≥1 为信息；prune ≥10 另加一句', () => {
    expect(byType(synth([bash('a')], { compaction: { starts: [5], prunes: 3, summaries: 1, ends: 1 } }), 'compaction')!.why.p).toEqual([1, 0])
    expect(byType(synth([bash('a')], { compaction: { starts: [5], prunes: 12, summaries: 1, ends: 1 } }), 'compaction')!.why.p).toEqual([1, 12])
    expect(byType(synth([bash('a')], { compaction: { starts: [], prunes: 12, summaries: 0, ends: 0 } }), 'compaction')).toBeUndefined()
  })

  it('待办陈旧：提醒 ≥10 低，≥30 中', () => {
    expect(byType(synth([bash('a')], { todoReminders: 9 }), 'todoStale')).toBeUndefined()
    expect(byType(synth([bash('a')], { todoReminders: 10 }), 'todoStale')).toMatchObject({ severity: 'low' })
    expect(byType(synth([bash('a')], { todoReminders: 30 }), 'todoStale')).toMatchObject({ severity: 'medium' })
  })

  it('在途调用、子代理聚合节点、请求级失败标记不进统计；结果按严重度降序', () => {
    const lane = synth([bash('x', { err: true }), bash('x')])
    lane.detours.push({ step: 90, turn: 1, s: 1, e: 2, v: 'ok', sub: true, tools: Array.from({ length: 6 }, () => ({ name: 'bash', args: 'y', s: 1, e: 2, dur: 1, v: 'error', err: true })) })
    lane.detours.push({ step: 91, turn: 1, s: 3, e: 3, v: 'error', evt: 'retry', tools: [] })
    lane.main.push({ step: 92, turn: 1, s: 4, e: 5, v: 'ok', live: true, tools: [{ name: 'bash', args: 'x', s: 4, e: null, dur: 0, v: 'ok', err: false }] })
    const out = sig(lane)
    expect(out.map(s => s.type)).toEqual(['mechanicalRetry', 'toolFail'])
    expect(out[1]!.count).toBe(1)
    const order = sig(synth([bash('a', { ctx: 600 }), bash('b', { err: true })], { ctxWindow: 1000, todoReminders: 10 })).map(s => s.severity)
    expect([...order].sort((a, b) => ({ high: 3, medium: 2, low: 1, info: 0 })[b]! - ({ high: 3, medium: 2, low: 1, info: 0 })[a]!)).toEqual(order)
  })
})
