import { describe, expect, it, vi } from 'vitest'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { UiConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { chatSnapshot } from './chat-fixture.ts'
import { SubagentMazeSource } from '../src/client/subagent-lanes.ts'

const sid = (s: string): SessionId => s as SessionId

interface FakeRow {
  id: SessionId
  parentId?: SessionId
  origin?: 'subagent'
  ephemeral?: true
  running: boolean
  displayTitle: string
}

/**
 * In-memory doubles for the two services the roster now needs: ISessions for
 * the list and session lifecycle, and UiConversation for each child's Chat
 * target (conversation content left the Session snapshot in host 0.1.2).
 */
function harness(rows: FakeRow[]) {
  const listListeners = new Set<() => void>()
  const byId = () => Object.fromEntries(rows.map(r => [r.id, r]))
  const faces = new Map<SessionId, ReturnType<typeof face>>()

  function face(openState: 'open' | 'failed' = 'open') {
    const listeners = new Set<() => void>()
    let snapshot = { openState }
    return {
      open: vi.fn(() => openState === 'open'
        ? Promise.resolve()
        : Promise.reject(new Error('history refused'))),
      subscribe: vi.fn((l: () => void) => { listeners.add(l); return () => listeners.delete(l) }),
      getSnapshot: () => snapshot,
      push(next: object) {
        snapshot = { ...snapshot, ...next }
        for (const l of [...listeners]) l()
      },
      listeners,
    }
  }

  const chats = new Map<SessionId, { listeners: Set<() => void>; snapshot: ReturnType<typeof chatSnapshot>; push(events: unknown[]): void }>()
  const chatOf = (id: SessionId) => {
    const found = chats.get(id)
    if (found !== undefined) return found
    const listeners = new Set<() => void>()
    const entry = {
      listeners,
      snapshot: chatSnapshot([]),
      push(events: unknown[]) {
        entry.snapshot = chatSnapshot(events as never)
        for (const l of [...listeners]) l()
      },
    }
    chats.set(id, entry)
    return entry
  }

  const conversations = {
    binding: (id: SessionId) => ({
      target: () => ({
        getSnapshot: () => chatOf(id).snapshot,
        subscribe: (l: () => void) => {
          chatOf(id).listeners.add(l)
          return () => chatOf(id).listeners.delete(l)
        },
      }),
    }),
  } as unknown as UiConversation

  // 宿主 0.1.2 起子会话必须经"直接父地址"打开：地址来自目录刷新，
  // 未刷出地址的孩子不可达。addFace 同时登记地址，模拟目录已包含该孩子。
  const cataloged = new Set<SessionId>()
  const catalog = () => ({
    [sid('p')]: {
      entries: [...cataloged].map(id => ({ kind: 'child' as const, id, mode: 'one-shot' as const, activity: 'inactive' as const, hasChildren: false })),
      state: 'ready' as const, error: null,
    },
  })
  const opened: SessionId[] = []
  let catalogOpen = false

  const sessions = {
    setSubagentCatalogOpen: (_id: SessionId, open: boolean) => { catalogOpen = open },
    refreshSubagents: () => Promise.resolve(),
    subagentAddress: () => undefined,   // 未导航过的孩子在这里永远查不到
    openSubagent: (a: { childSessionId: SessionId }) => { opened.push(a.childSessionId) },
    list: {
      getSnapshot: () => ({ byId: byId(), subagentsByParent: catalog() }),
      subscribe: (l: () => void) => { listListeners.add(l); return () => listListeners.delete(l) },
    },
    binding: (id: SessionId) => {
      const found = faces.get(id)
      return found === undefined ? undefined : { session: found }
    },
  } as unknown as ISessions

  return {
    sessions,
    conversations,
    chatOf,
    faces,
    addFace: (id: SessionId, state: 'open' | 'failed' = 'open') => {
      const f = face(state)
      faces.set(id, f)
      cataloged.add(id)
      return f
    },
    opened,
    isCatalogOpen: () => catalogOpen,
    setRows: (next: FakeRow[]) => {
      rows.length = 0
      rows.push(...next)
      for (const l of [...listListeners]) l()
    },
  }
}

const flush = () => new Promise<void>((resolve) => { setTimeout(resolve, 0) })

describe('SubagentMazeSource', () => {
  it('tracks subagent-origin, non-ephemeral children of the target session only', async () => {
    const rows: FakeRow[] = [
      { id: sid('p'), running: true, displayTitle: '父会话' },
      { id: sid('c1'), parentId: sid('p'), origin: 'subagent', running: true, displayTitle: '任务甲' },
      { id: sid('side'), parentId: sid('p'), origin: 'subagent', ephemeral: true, running: true, displayTitle: '侧聊' },
      { id: sid('branch'), parentId: sid('p'), running: false, displayTitle: '手动分支' },
      { id: sid('other'), parentId: sid('x'), origin: 'subagent', running: true, displayTitle: '别家孩子' },
    ]
    const h = harness(rows)
    h.addFace(sid('c1'))
    const source = new SubagentMazeSource(h.sessions, h.conversations, sid('p'))
    h.chatOf(sid('c1')).push([{ kind: 'user', time: 1 }, { kind: 'assistant', seq: 2, time: 2, blocks: [{ kind: 'text', text: 'x' }] }])
    await flush()
    const roster = source.getSnapshot()
    expect(roster.map(c => c.id)).toEqual(['c1'])
    expect(roster[0]!.label).toBe('任务甲')
    expect(roster[0]!.running).toBe(true)
    source.dispose()
  })

  it('never navigates: observing a child must not select it', async () => {
    // 宿主 0.1.2 唯一支持的子会话进入方式 openSubagent 是导航动作——会把用户
    // 正在看的会话切走。后台花名册绝不能碰它。
    const rows: FakeRow[] = [
      { id: sid('c1'), parentId: sid('p'), origin: 'subagent', running: true, displayTitle: '任务甲' },
    ]
    const h = harness(rows)
    h.addFace(sid('c1'))
    const source = new SubagentMazeSource(h.sessions, h.conversations, sid('p'))
    h.chatOf(sid('c1')).push([{ kind: 'user', time: 1 }, { kind: 'assistant', seq: 2, time: 2, blocks: [{ kind: 'text', text: 'x' }] }])
    await flush()
    expect(h.opened).toEqual([])              // 一次都没导航
    expect(h.isCatalogOpen()).toBe(true)      // 但目录保持订阅，才能发现新孩子
    source.dispose()
    expect(h.isCatalogOpen()).toBe(false)
  })

  it('gates on conversation content, not on openState', async () => {
    const rows: FakeRow[] = [
      { id: sid('c1'), parentId: sid('p'), origin: 'subagent', running: true, displayTitle: '任务甲' },
    ]
    const h = harness(rows)
    h.addFace(sid('c1'), 'failed')            // 从不打开：openState 不是 'open'
    const source = new SubagentMazeSource(h.sessions, h.conversations, sid('p'))
    await flush()
    expect(source.getSnapshot()).toHaveLength(0)   // 事件窗口为空 -> 不出现
    h.chatOf(sid('c1')).push([{ kind: 'user', time: 1 }, { kind: 'assistant', seq: 2, time: 2, blocks: [{ kind: 'text', text: 'x' }] }])
    expect(source.getSnapshot().map(c => c.id)).toEqual(['c1'])   // 有内容就出现
    source.dispose()
  })

  it('publishes on child conversation changes and releases dropped children', async () => {
    const rows: FakeRow[] = [
      { id: sid('c1'), parentId: sid('p'), origin: 'subagent', running: true, displayTitle: '任务甲' },
    ]
    const h = harness(rows)
    const f = h.addFace(sid('c1'))
    const source = new SubagentMazeSource(h.sessions, h.conversations, sid('p'))
    await flush()
    const seen = vi.fn()
    source.subscribe(seen)
    h.chatOf(sid('c1')).push([{ kind: 'user', time: 1 }, { kind: 'assistant', seq: 2, time: 2, blocks: [{ kind: 'text', text: 'x' }] }])
    expect(seen).toHaveBeenCalled()
    expect(f.listeners.size).toBe(1)
    h.setRows([])
    expect(source.getSnapshot()).toHaveLength(0)
    expect(f.listeners.size).toBe(0)
    source.dispose()
  })

  it('drops a child whose history refuses to open and survives dispose mid-open', async () => {
    const rows: FakeRow[] = [
      { id: sid('bad'), parentId: sid('p'), origin: 'subagent', running: true, displayTitle: '坏孩子' },
    ]
    const h = harness(rows)
    h.addFace(sid('bad'), 'failed')
    const source = new SubagentMazeSource(h.sessions, h.conversations, sid('p'))
    await flush()
    expect(source.getSnapshot()).toHaveLength(0)
    source.dispose()
    source.dispose()
    expect(source.getSnapshot()).toHaveLength(0)
  })

  it('picks up a child that was not yet addressable on a later list tick', async () => {
    const rows: FakeRow[] = [
      { id: sid('late'), parentId: sid('p'), origin: 'subagent', running: true, displayTitle: '晚到' },
    ]
    const h = harness(rows)
    const source = new SubagentMazeSource(h.sessions, h.conversations, sid('p'))
    await flush()
    expect(source.getSnapshot()).toHaveLength(0)
    h.addFace(sid('late'))
    h.setRows([...rows])
    h.chatOf(sid('late')).push([{ kind: 'user', time: 1 }, { kind: 'assistant', seq: 2, time: 2, blocks: [{ kind: 'text', text: 'x' }] }])
    await flush()
    expect(source.getSnapshot().map(c => c.id)).toEqual(['late'])
    source.dispose()
  })
})
