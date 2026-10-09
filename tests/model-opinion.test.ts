/**
 * 模型解读（诊断层第 8 项）：宿主半的路由解析与流读取口径、客户端半的错误映射。
 * 两条硬约束在测试里也钉住：提示词由页面自己拼（这里只测路由不被猜）、回答原样返回。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { REVIEW_PATH as HOST_PATH, readStream, resolveRoute } from '../src/index.ts'
import { REVIEW_PATH, askModel } from '../src/client/model-opinion.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** 造一个最小 ctx：只实现 ctx.get()。 */
const ctxWith = (services: Record<string, unknown>) => ({ get: (name: string) => services[name] } as never)

describe('host routes: 模型解读', () => {
  it('路由：页面上报的 provider/model 优先', () => {
    const ctx = ctxWith({ agentDefaultModel: { currentSelection: () => ({ provider: 'other', model: 'x' }) } })
    expect(resolveRoute(ctx, { provider: 'deepseek-official', model: 'deepseek-flash' })).toEqual({ provider: 'deepseek-official', model: 'deepseek-flash' })
  })

  it('路由：没上报就用宿主默认；两边都没有返回 null（不猜）', () => {
    expect(resolveRoute(ctxWith({ agentDefaultModel: { currentSelection: () => ({ provider: 'deepseek-official', model: 'deepseek-flash' }) } }), {}))
      .toEqual({ provider: 'deepseek-official', model: 'deepseek-flash' })
    expect(resolveRoute(ctxWith({}), {})).toBeNull()
    expect(resolveRoute(ctxWith({}), { provider: 'only-provider' })).toBeNull()
    expect(resolveRoute(ctxWith({ agentDefaultModel: { currentSelection: () => undefined } }), {})).toBeNull()
  })

  it('流读取：拼接 text-delta，正常 stop 收尾', async () => {
    async function* stream() {
      yield { type: 'block-start', index: 0, blockType: 'reasoning' } as never
      yield { type: 'reasoning-delta', index: 0, text: '想一下' }
      yield { type: 'text-delta', index: 1, text: '结论：' }
      yield { type: 'text-delta', index: 1, text: '还行' }
      yield { type: 'usage', usage: { inputTokens: 1, outputTokens: 2 } }
      yield { type: 'finish', reason: { kind: 'stop' } as never }
    }
    expect(await readStream(stream())).toEqual({ text: '结论：还行', usage: { inputTokens: 1, outputTokens: 2 } })
  })

  it('流读取：非 stop 收尾、缺收尾、收尾后还有数据、空回答都当失败', async () => {
    async function* aborted() {
      yield { type: 'text-delta', index: 0, text: '半句' }
      yield { type: 'finish', reason: { kind: 'error', failure: { message: 'boom' } } as never }
    }
    await expect(readStream(aborted())).rejects.toThrow(/ended with error/)

    async function* noFinish() {
      yield { type: 'text-delta', index: 0, text: '半句' }
    }
    await expect(readStream(noFinish())).rejects.toThrow(/no terminal finish/)

    async function* afterFinish() {
      yield { type: 'finish', reason: { kind: 'stop' } as never }
      yield { type: 'text-delta', index: 0, text: '迟到' }
    }
    await expect(readStream(afterFinish())).rejects.toThrow(/after its terminal finish/)

    async function* empty() {
      yield { type: 'finish', reason: { kind: 'stop' } as never }
    }
    await expect(readStream(empty())).rejects.toThrow(/no text/)
  })

  it('端点常量两半一致', () => {
    expect(REVIEW_PATH).toBe(HOST_PATH)
  })
})

describe('model-opinion: 客户端取回答', () => {
  it('成功：原样返回文本与路由', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, text: '结论', provider: 'p', model: 'm' }), { status: 200 })))
    const res = await askModel({ prompt: 'x' })
    expect(res).toEqual({ ok: true, opinion: { text: '结论', provider: 'p', model: 'm' } })
  })

  it('宿主没模型服务 / 没路由 / 调用失败：三种都给出可读的错误码', async () => {
    for (const [status, code] of [[503, 'llm-unavailable'], [409, 'no-model-route'], [502, 'model-call-failed']] as const) {
      vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: code }), { status })))
      const res = await askModel({ prompt: 'x' })
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.error).toBe(code)
    }
  })

  it('回答为空当失败（不显示空块）', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, text: '   ' }), { status: 200 })))
    expect(await askModel({ prompt: 'x' })).toEqual({ ok: false, error: 'empty-opinion' })
  })
})
