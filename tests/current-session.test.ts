/** 宿主 0.1.6-alpha.2 起把「当前会话」从会话列表上拿掉了：上传面板靠它判断切会话时自动关闭，两代列表形态都要读得出来。 */
import { describe, expect, it } from 'vitest'
import { currentSessionOf } from '../src/client/current-session.ts'

describe('currentSessionOf', () => {
  it('host ≤0.1.6-alpha.1: reads list.current', () => {
    expect(currentSessionOf({ current: 's1', byId: { s1: { id: 's1' }, s2: { id: 's2' } } })).toBe('s1')
  })

  it('host ≤0.1.6-alpha.1 with nothing selected: undefined (rows carry no retain counts)', () => {
    expect(currentSessionOf({ current: undefined, byId: { s1: { id: 's1' } } })).toBeUndefined()
  })

  it('host 0.1.6-alpha.2+: the row the main view retains is the selected one', () => {
    const state = { byId: {
      a: { id: 'a', retainedBy: { sidebar: 1 } },
      b: { id: 'b', retainedBy: { mainView: 1, sidebar: 1 } },
    } }
    expect(currentSessionOf(state)).toBe('b')
  })

  it('host 0.1.6-alpha.2+ with no Session in the main view (home screen): undefined', () => {
    // 宿主只发正数计数，mainView: 0 是防御性用例
    expect(currentSessionOf({ byId: { a: { id: 'a', retainedBy: {} }, b: { id: 'b', retainedBy: { mainView: 0 } } } })).toBeUndefined()
    expect(currentSessionOf({ byId: {} })).toBeUndefined()
  })
})
