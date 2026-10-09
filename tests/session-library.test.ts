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
