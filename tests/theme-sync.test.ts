/** srcDoc 首帧主题预置（themedMazeHtml）——issue #4 暗色闪白的回归保护。 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { themedMazeHtml } from '../src/client/theme-sync.ts'

const MAZE_HTML = readFileSync(
  fileURLToPath(new URL('../src/client/maze-upload.html', import.meta.url)),
  'utf8',
)

describe('themedMazeHtml', () => {
  it('宿主暗色时给 <html> 预置 data-theme="dark"（首帧即暗色，不等 postMessage）', () => {
    const themed = themedMazeHtml(MAZE_HTML, 'dark')
    expect(themed).toContain('<html lang="zh-CN" data-theme="dark">')
    expect(themed).not.toBe(MAZE_HTML)
  })

  it('宿主浅色时原样返回（浅色是页面默认态）', () => {
    expect(themedMazeHtml(MAZE_HTML, 'light')).toBe(MAZE_HTML)
  })

  it('迷宫页保留注入锚点，且页面自初始化尊重预置的 data-theme', () => {
    // 锚点若被改名，themedMazeHtml 会静默变成 no-op——在这里拦住。
    expect(MAZE_HTML).toContain('<html lang="zh-CN">')
    // 页面末尾的自初始化必须先看预置属性，否则「宿主暗色 + 系统浅色」
    // 会在解析完成时翻回浅色，闪白只是换了个时机。
    expect(MAZE_HTML).toContain("document.documentElement.getAttribute('data-theme') === 'dark'")
  })
})
