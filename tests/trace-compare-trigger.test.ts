/**
 * 宿主 0.1.7 把 16px 图标组改了名（IconBranchOutline16 → IconBranchOutlineRegular）。
 * 旧写法拿到 undefined 当组件渲染，侧边栏入口整块崩掉；这里钉住两代宿主都画得出入口、两个名字都没有时也不崩。
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const PRIMITIVES = '@deepseek-ai/dsh-client-ui-primitives'
const icon = (name: string) => ({ size }: { size?: number }) => createElement('svg', { 'data-icon': name, width: size })

/** Render the trigger against a primitives module that exports only `exports` (plus a pass-through Tooltip). */
async function renderTrigger(exports: Record<string, unknown>): Promise<string> {
  vi.resetModules()
  vi.doMock(PRIMITIVES, () => ({
    Tooltip: ({ children }: { children: unknown }) => children,
    // 明确列出两个名字：mock 模块读不存在的导出会抛错，真宿主的模块对象只会给 undefined
    IconBranchOutline16: undefined,
    IconBranchOutlineRegular: undefined,
    ...exports,
  }))
  const { TraceCompareTrigger } = await import('../src/client/TraceCompareTrigger.tsx')
  const props = {
    wide: true,
    useStore: (select: (state: { open: boolean }) => unknown) => select({ open: false }),
    actions: { toggle: () => {} },
    t: (key: string) => key,
  }
  return renderToStaticMarkup(createElement(TraceCompareTrigger, props as never))
}

afterEach(() => { vi.doUnmock(PRIMITIVES) })

describe('TraceCompareTrigger icon across the host icon-set rename', () => {
  it('host ≤0.1.6: draws IconBranchOutline16', async () => {
    const html = await renderTrigger({ IconBranchOutline16: icon('16'), IconBranchOutlineRegular: icon('regular') })
    expect(html).toContain('data-icon="16"')
  })

  it('host 0.1.7: falls back to IconBranchOutlineRegular', async () => {
    expect(await renderTrigger({ IconBranchOutlineRegular: icon('regular') })).toContain('data-icon="regular"')
  })

  it('neither name: still renders the button, just without an icon', async () => {
    const html = await renderTrigger({})
    expect(html).toContain('<button')
    expect(html).toContain('trigger')
    expect(html).not.toContain('data-icon')
  })
})
