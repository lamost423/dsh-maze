/**
 * 本机会话库（诊断层第 7 项）客户端半的测试：
 * 端点常量与宿主半一致、错误映射说人话、列表/日志取数的形状，以及页面侧「跳过空日志」的容错合并。
 */
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LOG_PATH, SESSIONS_PATH, fetchLocalSessions, fetchSessionLog, rowLabel, rowTime } from '../src/client/session-library.ts'
import { LOG_PATH as HOST_LOG_PATH, SESSIONS_PATH as HOST_SESSIONS_PATH } from '../src/index.ts'

const html = readFileSync(new URL('../src/client/maze-upload.html', import.meta.url), 'utf8')

/** 取出页面里的 mergeParsed/apply 段，注入替身跑（与 page-parse.test.ts 同一套抽段做法）。 */
function pageApplyHarness() {
  const a = html.indexOf('function mergeParsed(')
  const b = html.indexOf('function scrollToMain()')
  const section = html.slice(a, b)
  const calls: { rendered: unknown[]; errors: string[]; resets: number } = { rendered: [], errors: [], resets: 0 }
  const loaded: { name: string; text: string }[] = []
  const buildData = (texts: string[], names: string[]) => {
    // 真实 buildData 的契约：任一份没有有效步骤就整体抛错；泳道键按输入顺序 l1..lN。
    if (texts.some((t) => t === 'EMPTY')) throw new Error('没有可解析的有效步骤（step/start 事件缺失？）')
    return {
      Tmax: 100,
      lanes: texts.map((_, i) => ({ key: 'l' + String(i + 1), firstUser: 'task', stats: { T: 50 + i } })),
      sameTask: true,
    }
  }
  const fn = new Function(
    'tr', 'buildData', 'loaded', 'showErr', 'clearErr', 'resetView', 'renderData', 'taskComparability',
    `${section}\nreturn { apply, mergeParsed }`,
  ) as (...args: unknown[]) => { apply: () => void; mergeParsed: (p: unknown[]) => unknown }
  const api = fn(
    (k: string) => (k === 'errSkipped' ? (n: number, names: string) => `skipped ${n}: ${names}` : (m: string) => m),
    buildData,
    loaded,
    (m: string) => calls.errors.push(m),
    () => { calls.errors.length = calls.errors.length },
    () => { calls.resets += 1 },
    (d: unknown) => calls.rendered.push(d),
    (f: string[]) => ({ sameTask: f.every((x) => x === f[0]) }),
  )
  return { api, loaded, calls }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('session-library: 端点与错误映射', () => {
  it('端点常量与宿主半一致（两半不许漂移）', () => {
    expect(SESSIONS_PATH).toBe(HOST_SESSIONS_PATH)
    expect(LOG_PATH).toBe(HOST_LOG_PATH)
  })

  it('取会话列表：成功返回行数组', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ sessions: [{ id: 'a', cwd: '/w', createdAt: 1, live: false, persisted: true, origin: null, parent: null }] }), { status: 200, headers: { 'content-type': 'application/json' } })))
    const res = await fetchLocalSessions()
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.sessions.map((r) => r.id)).toEqual(['a'])
  })

  it('宿主没装会话查询服务 → 说人话的错误码，而不是空列表', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'session-query-unavailable' }), { status: 503 })))
    const res = await fetchLocalSessions()
    expect(res).toEqual({ ok: false, error: 'host-has-no-session-query' })
  })

  it('日志取数：文本 + 事件数来自响应头', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"type":"session"}\n{"type":"turn/start"}', { status: 200, headers: { 'x-maze-events': '2' } })))
    const res = await fetchSessionLog('session-1234567890abcdef')
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.events).toBe(2)
      expect(res.text.split('\n')).toHaveLength(2)
      expect(res.name).toBe('1234567890ab.jsonl')   // id 去掉 session- 前缀、截 12 字符
    }
  })

  it('超大日志 → 明确的错误码', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'log-too-large' }), { status: 413 })))
    expect(await fetchSessionLog('session-x')).toEqual({ ok: false, error: 'log-too-large' })
  })

  it('行标签取工作目录名，时间格式化到分钟', () => {
    expect(rowLabel({ id: 'x', cwd: '/Users/a/Documents/Chem_AI', createdAt: 0, live: false, persisted: true, origin: null, parent: null })).toBe('Chem_AI')
    expect(rowLabel({ id: 'x', cwd: null, createdAt: 0, live: false, persisted: true, origin: null, parent: null })).toBe('?')
    expect(rowTime({ id: 'x', cwd: null, createdAt: 0, live: false, persisted: true, origin: null, parent: null })).toBe('—')
    expect(rowTime({ id: 'x', cwd: null, createdAt: 1_789_895_233_128, live: false, persisted: true, origin: null, parent: null })).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  })
})

describe('page apply: 多份日志里有的解析不出来时跳过并说明', () => {
  it('全部可解析：走原来的合并路径，不出提示', () => {
    const h = pageApplyHarness()
    h.loaded.push({ name: 'a.jsonl', text: 'A' }, { name: 'b.jsonl', text: 'B' })
    h.api.apply()
    expect(h.calls.errors).toEqual([])
    expect(h.calls.rendered).toHaveLength(1)
    expect(h.calls.resets).toBe(0)
  })

  it('有一份是空会话：跳过它、其余照画、错误条如实说明', () => {
    const h = pageApplyHarness()
    h.loaded.push({ name: 'empty.jsonl', text: 'EMPTY' }, { name: 'ok.jsonl', text: 'A' })
    h.api.apply()
    expect(h.calls.errors).toEqual(['skipped 1: empty.jsonl'])
    expect(h.calls.rendered).toHaveLength(1)
    const data = h.calls.rendered[0] as { lanes: { key: string }[] }
    expect(data.lanes.map((l) => l.key)).toEqual(['l1'])
  })

  it('全都解析不出来：保留原来的报错与复位（不是静默空白）', () => {
    const h = pageApplyHarness()
    h.loaded.push({ name: 'e1.jsonl', text: 'EMPTY' })
    h.api.apply()
    expect(h.calls.rendered).toEqual([])
    expect(h.calls.resets).toBe(1)
    expect(h.calls.errors).toHaveLength(1)
    expect(h.calls.errors[0]).toContain('没有可解析的有效步骤')
  })

  it('合并多份时泳道键重编成 l1..lN，轴跨度取最大', () => {
    const h = pageApplyHarness()
    h.loaded.push({ name: 'a.jsonl', text: 'A' }, { name: 'b.jsonl', text: 'B' }, { name: 'c.jsonl', text: 'C' })
    h.api.apply()
    const data = h.calls.rendered[0] as { lanes: { key: string }[]; Tmax: number }
    expect(data.lanes.map((l) => l.key)).toEqual(['l1', 'l2', 'l3'])
    expect(data.Tmax).toBeGreaterThan(0)
  })
})

/** 取页面里的 Judge 段（buildJudgePrompt + judgeScores + stripFence）跑替身。 */
function judgeHarness() {
  const a = html.indexOf('function stripFence(')
  const b = html.indexOf('function modelOpinionBlockHtml(')
  const fn = new Function('tr', 'outcomeEvidence', 'behaviorSignals', 'wallClock', 'fmtT',
    `${html.slice(a, b)}\nreturn { judgeScores, stripFence }`) as (...args: unknown[]) => {
      judgeScores: (t: string) => { rows: { lane: number; scores: (number | null)[]; reason: string }[]; summary: string } | null
      stripFence: (t: string) => string
    }
  return fn((k: string) => k, () => ({ task: {}, test: {}, build: {}, lint: {}, artifacts: {} }), () => [], (t: number) => t, (t: number) => `${t}s`)
}

describe('对比 Judge：严格 JSON 协议 + 宽松解析', () => {
  it('规范 JSON 解析出四维分数与理由', () => {
    const h = judgeHarness()
    const out = h.judgeScores('{"scores":[{"lane":1,"正确性":8,"完整性":7,"指令遵循":9,"证据充分性":6,"理由":"稳"},{"lane":2,"正确性":5,"完整性":4,"指令遵循":6,"证据充分性":3,"理由":"漏了验证"}],"总结":"第一次更好"}')
    expect(out?.rows).toHaveLength(2)
    expect(out?.rows[0]?.scores).toEqual([8, 7, 9, 6])
    expect(out?.rows[1]?.reason).toBe('漏了验证')
    expect(out?.summary).toBe('第一次更好')
  })

  it('带 ```json 围栏也认（剥壳后再解析）', () => {
    const h = judgeHarness()
    const out = h.judgeScores('```json\n{"scores":[{"lane":1,"正确性":7}]}\n```')
    expect(out?.rows[0]?.scores[0]).toBe(7)
    expect(out?.rows[0]?.scores[1]).toBeNull()   // 缺的维度如实标未给
  })

  it('没按协议输出：返回 null（页面改展示原文，不假装有分数）', () => {
    const h = judgeHarness()
    expect(h.judgeScores('第一次跑得更好，第二次漏了验证。')).toBeNull()
    expect(h.judgeScores('{"判决":"a"}')).toBeNull()
    expect(h.judgeScores('{"scores":[]}')).toBeNull()
    expect(h.judgeScores('')).toBeNull()
  })
})
