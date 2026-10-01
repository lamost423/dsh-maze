import { describe, expect, it, vi } from 'vitest'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { UiConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { chatSnapshot } from './chat-fixture.ts'
import {
  MAX_LIVE_CHILDREN, MAZE_RETAIN_SOURCE, RetainedSubagentRoster, SubagentMazeSource, createSubagentRoster, hostCanRetain,
} from '../src/client/subagent-lanes.ts'

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

  it('host 0.1.7: no legacy catalog calls and unretained children do not bind — empty roster, no throw', async () => {
    // 0.1.7-alpha.1 删掉了 setSubagentCatalogOpen / refreshSubagents（子代理目录改从父会话投影读），
    // 旧写法无条件调用，构造时抛 TypeError，把整个实时迷宫页签带崩。
    // 0.1.6-alpha.2 起 binding() 只给已被 retain 的会话：没有别的视图持有这个子会话时拿不到，花名册为空。
    const rows: FakeRow[] = [
      { id: sid('c1'), parentId: sid('p'), origin: 'subagent', running: true, displayTitle: '任务甲' },
    ]
    const h = harness(rows)
    h.addFace(sid('c1'))
    const host017 = {
      ...Object.fromEntries(Object.entries(h.sessions as object)
        .filter(([key]) => key !== 'setSubagentCatalogOpen' && key !== 'refreshSubagents')),
      binding: () => undefined,
    } as unknown as ISessions
    let source: SubagentMazeSource | undefined
    expect(() => { source = new SubagentMazeSource(host017, h.conversations, sid('p')) }).not.toThrow()
    h.chatOf(sid('c1')).push([{ kind: 'user', time: 1 }, { kind: 'assistant', seq: 2, time: 2, blocks: [{ kind: 'text', text: 'x' }] }])
    h.setRows([...rows])   // 列表通知照常到达
    await flush()
    expect(source!.getSnapshot()).toEqual([])
    expect(() => { source!.dispose() }).not.toThrow()
  })

  it('follows the binding generation: a child released by the host leaves the roster, a re-retained one is re-tracked', async () => {
    // 0.1.6-alpha.2 起子会话只在有视图持有时可绑定（例如从右侧栏打开子代理）；侧栏关掉后旧的 face / chat
    // 停在最后一帧，再打开拿到的是新一代。花名册要跟着换代，不能画一条冻结的支路。
    const rows: FakeRow[] = [
      { id: sid('c1'), parentId: sid('p'), origin: 'subagent', running: true, displayTitle: '任务甲' },
    ]
    const h = harness(rows)
    const first = h.addFace(sid('c1'))
    const source = new SubagentMazeSource(h.sessions, h.conversations, sid('p'))
    h.chatOf(sid('c1')).push([{ kind: 'user', time: 1 }, { kind: 'assistant', seq: 2, time: 2, blocks: [{ kind: 'text', text: 'x' }] }])
    await flush()
    expect(source.getSnapshot().map(c => c.id)).toEqual(['c1'])
    expect(first.listeners.size).toBe(1)
    // 宿主释放了这个子会话：binding 不再给值
    h.faces.delete(sid('c1'))
    h.setRows([...rows])
    expect(source.getSnapshot()).toEqual([])
    expect(first.listeners.size).toBe(0)
    // 再次被持有：新一代 face，花名册重新跟上
    const second = h.addFace(sid('c1'))
    h.setRows([...rows])
    expect(source.getSnapshot().map(c => c.id)).toEqual(['c1'])
    expect(second.listeners.size).toBe(1)
    expect(first.listeners.size).toBe(0)
    source.dispose()
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

/* ======================= RetainedSubagentRoster（宿主 0.1.6-alpha.2+：插件自己持有子会话） ======================= */

interface RetainRow { id: string; running: boolean; displayTitle?: string }
interface RetainRec { id: string; parent: string; mode: string; source: string; released: boolean }

/**
 * 贴近真实宿主的替身（评审 P0/P3-7）：retain() 和 release() 都在返回前**同步**通知会话列表（宿主的
 * publishRetention → list.set 是同步的）；binding 在释放后读取抛错；ready 在首次打开结束时 resolve，
 * 释放早于它时 reject；openFails 里的子会话 openState 为 'error'（ready 照样 resolve）。
 */
function retainHarness(rows: RetainRow[], opts: { retainThrows?: boolean; retainThrowsOnce?: string[]; openFails?: string[]; openThrows?: string[] } = {}) {
  const thrownOnce = new Set<string>()
  const listListeners = new Set<() => void>()
  const notify = () => { for (const l of [...listListeners]) l() }
  const byId = () => Object.fromEntries(rows.map(r => [r.id, r]))
  const retained: RetainRec[] = []
  const bindings = new Map<object, string>()
  const chats = new Map<string, { listeners: Set<() => void>; snapshot: ReturnType<typeof chatSnapshot>; push(events: unknown[]): void }>()
  const chatOf = (id: string) => {
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
  const retain = vi.fn((target: { parentSessionId: string; childSessionId: string; mode: string }, options: { source: string }) => {
    if (opts.retainThrows === true) throw new Error('sessions.retain: unknown session')
    const id = target.childSessionId
    if (opts.retainThrowsOnce?.includes(id) === true && !thrownOnce.has(id)) { thrownOnce.add(id); throw new Error('sessions.retain: unknown session') }
    const token = { session: { getSnapshot: () => ({ openState: opts.openFails?.includes(id) === true ? 'error' : 'open' }) } }
    bindings.set(token, id)
    const rec: RetainRec = { id, parent: target.parentSessionId, mode: target.mode, source: options.source, released: false }
    retained.push(rec)
    let settle: { res: (v: unknown) => void; rej: (e: unknown) => void } | null = null
    const ready = new Promise<unknown>((res, rej) => { settle = { res, rej } })
    queueMicrotask(() => {
      if (rec.released) settle!.rej(new Error('reference released'))
      else if (opts.openThrows?.includes(id) === true) settle!.rej(new Error('open threw'))   // 非远程异常：doOpen 抛出，ready reject，引用未释放
      else settle!.res(token)
    })
    const ref = {
      ready,
      get binding(): object { if (rec.released) throw new Error('reference released'); return token },
      release: () => { if (rec.released) return; rec.released = true; notify() },
    }
    notify()   // 宿主在 retain() 返回前就把新的持有计数发布到列表
    return ref
  })
  const sessions = {
    list: {
      getSnapshot: () => ({ byId: byId() }),
      subscribe: (l: () => void) => { listListeners.add(l); return () => listListeners.delete(l) },
    },
    retain,
  } as unknown as ISessions
  const conversations = {
    binding: (token: object) => {
      const id = bindings.get(token)
      if (id === undefined) throw new Error('unknown binding')
      return {
        target: () => ({
          getSnapshot: () => chatOf(id).snapshot,
          // 宿主的 Chat 目标：先加监听器、再激活，首次激活会同步通知刚加进去的监听器
          subscribe: (l: () => void) => { chatOf(id).listeners.add(l); l(); return () => chatOf(id).listeners.delete(l) },
        }),
      }
    },
  } as unknown as UiConversation
  return {
    sessions, conversations, chatOf, retained, retain, notify,
    held: () => retained.filter(r => !r.released).map(r => r.id),
    setRows: (next: RetainRow[]) => { rows.length = 0; rows.push(...next); notify() },
  }
}

/** 已结束的子会话：用户消息 + 回答 + turn/end（末轮已关闭）。 */
const content = (t: number): unknown[] => [
  { kind: 'user', time: t },
  { kind: 'assistant', seq: 2, time: t + 1, blocks: [{ kind: 'text', text: 'x' }] },
  { kind: 'turn-end', seq: 3, time: t + 2, reason: 'completed' },
]
/** 末轮还没关闭的子会话：turn/end 还在路上。 */
const openContent = (t: number): unknown[] => content(t).slice(0, 2)
const fast = { cache: new Map(), publishDelayMs: 0 }
const wait = (ms: number) => new Promise<void>(resolve => { setTimeout(resolve, ms) })

describe('createSubagentRoster / hostCanRetain', () => {
  it('picks the retained roster only when the host exposes sessions.retain', () => {
    const legacy = harness([])
    expect(hostCanRetain(legacy.sessions)).toBe(false)
    expect(createSubagentRoster(legacy.sessions, legacy.conversations, sid('p'))).toBeInstanceOf(SubagentMazeSource)
    const modern = retainHarness([])
    expect(hostCanRetain(modern.sessions)).toBe(true)
    expect(createSubagentRoster(modern.sessions, modern.conversations, sid('p'))).toBeInstanceOf(RetainedSubagentRoster)
    expect(hostCanRetain(null)).toBe(false)
  })
})

describe('RetainedSubagentRoster', () => {
  it('the host notifies the list synchronously inside retain(): one hold, no recursion, nothing leaked (review P0-1)', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const h = retainHarness([{ id: 'c1', running: true, displayTitle: 'StartUp_AIBrain' }])
      const roster = new RetainedSubagentRoster(h.sessions, h.conversations, sid('p'), { ...fast, cache: new Map() })
      roster.setCatalog([{ id: 'c1', mode: 'one-shot', label: 'slow child task' }])
      await flush()
      expect(h.retain).toHaveBeenCalledTimes(1)
      expect(errors).not.toHaveBeenCalled()
      expect(h.retained[0]).toMatchObject({ id: 'c1', parent: 'p', mode: 'one-shot', source: MAZE_RETAIN_SOURCE })
      expect(roster.getSnapshot()).toEqual([])   // 事件窗口还没内容：不画空支路
      h.chatOf('c1').push(content(1))
      expect(roster.getSnapshot().map(c => ({ id: c.id, label: c.label, running: c.running }))).toEqual([{ id: 'c1', label: 'slow child task', running: true }])
      expect(h.held()).toEqual(['c1'])           // 运行中：一直持有
      roster.dispose()
      expect(h.held()).toEqual([])
      expect(h.retained.every(r => r.released)).toBe(true)
      expect(errors).not.toHaveBeenCalled()
    } finally { errors.mockRestore() }
  })

  it('disposed before ready: the reference is released and no conversation is followed', async () => {
    const h = retainHarness([{ id: 'c1', running: true }])
    const roster = new RetainedSubagentRoster(h.sessions, h.conversations, sid('p'), { ...fast, cache: new Map() })
    roster.setCatalog([{ id: 'c1', mode: 'one-shot' }])
    roster.dispose()                            // ready 还没 resolve
    await flush()
    expect(h.held()).toEqual([])
    expect(h.chatOf('c1').listeners.size).toBe(0)
  })

  it('reads a settled child once (last turn closed), releases and caches it; a fresh roster replays the cache without retaining again', async () => {
    const cache = new Map()
    const h = retainHarness([{ id: 'c1', running: false }])
    h.chatOf('c1').push(content(1))            // 迷宫打开前就结束了的子代理：持有后首帧带全部内容
    const first = new RetainedSubagentRoster(h.sessions, h.conversations, sid('p'), { cache, publishDelayMs: 0 })
    first.setCatalog([{ id: 'c1', mode: 'one-shot', label: 'done task' }])
    await flush()
    expect(first.getSnapshot().map(c => ({ id: c.id, running: c.running, label: c.label }))).toEqual([{ id: 'c1', running: false, label: 'done task' }])
    expect(h.held()).toEqual([])               // 读完即释放
    expect(cache.has('c1')).toBe(true)
    first.dispose()
    const second = new RetainedSubagentRoster(h.sessions, h.conversations, sid('p'), { cache, publishDelayMs: 0 })
    second.setCatalog([{ id: 'c1', mode: 'one-shot', label: 'done task' }])
    expect(second.getSnapshot().map(c => c.id)).toEqual(['c1'])
    expect(h.retain).toHaveBeenCalledTimes(1)  // 缓存命中，不再持有
    second.dispose()
  })

  it('a child that stopped on the list while its last turn is still open stays held until turn/end arrives — or the grace period ends (review P1-1)', async () => {
    const h = retainHarness([{ id: 'c1', running: true }])
    const roster = new RetainedSubagentRoster(h.sessions, h.conversations, sid('p'), { cache: new Map(), publishDelayMs: 0, settleGraceMs: 60 })
    roster.setCatalog([{ id: 'c1', mode: 'one-shot', label: 't' }])
    await flush()
    h.chatOf('c1').push(openContent(1))
    h.setRows([{ id: 'c1', running: false }])   // 列表先翻，最后的事件还在路上
    expect(h.held()).toEqual(['c1'])
    h.chatOf('c1').push(content(1))             // turn/end 到了 → 立即结算
    expect(h.held()).toEqual([])
    const cachedConv = roster.getSnapshot()[0]!.conversation!
    expect(cachedConv.order.length).toBe(2)   // turn/end 记在时间线上，不是对话节点
    expect(cachedConv.timeline.turns.get(cachedConv.timeline.turnOrder[0]!)?.end).toBeDefined()   // 缓存的是带 turn/end 的完整版
    roster.dispose()
    // 兜底：事件一直不来，宽限期到了也结算
    const h2 = retainHarness([{ id: 'c1', running: true }])
    const r2 = new RetainedSubagentRoster(h2.sessions, h2.conversations, sid('p'), { cache: new Map(), publishDelayMs: 0, settleGraceMs: 40 })
    r2.setCatalog([{ id: 'c1', mode: 'one-shot', label: 't' }])
    await flush()
    h2.chatOf('c1').push(openContent(1))
    h2.setRows([{ id: 'c1', running: false }])
    expect(h2.held()).toEqual(['c1'])
    await wait(70)
    expect(h2.held()).toEqual([])
    expect(r2.getSnapshot().map(c => ({ id: c.id, running: c.running }))).toEqual([{ id: 'c1', running: false }])
    r2.dispose()
  })

  it('expands at most MAX_LIVE_CHILDREN children at once; the rest are known but not expanded (conversation: null)', async () => {
    const n = MAX_LIVE_CHILDREN + 1
    const rows: RetainRow[] = Array.from({ length: n }, (_, i) => ({ id: 'c' + String(i + 1), running: true }))
    const h = retainHarness(rows)
    const roster = new RetainedSubagentRoster(h.sessions, h.conversations, sid('p'), { ...fast, cache: new Map() })
    roster.setCatalog(rows.map(r => ({ id: r.id, mode: 'one-shot' })))
    await flush()
    expect(h.retain).toHaveBeenCalledTimes(MAX_LIVE_CHILDREN)
    expect(h.held()).toHaveLength(MAX_LIVE_CHILDREN)
    for (let i = 1; i <= MAX_LIVE_CHILDREN; i++) h.chatOf('c' + String(i)).push(content(i))
    const snap = roster.getSnapshot()
    expect(snap).toHaveLength(n)
    expect(snap.filter(c => c.conversation !== null)).toHaveLength(MAX_LIVE_CHILDREN)
    expect(snap.find(c => c.id === 'c' + String(n))).toMatchObject({ conversation: null, running: true })
    roster.dispose()
    expect(h.held()).toEqual([])
  })

  it('a child the host could not open frees its slot and is not retried until the catalog changes (review P2-2)', async () => {
    const n = MAX_LIVE_CHILDREN + 1
    const rows: RetainRow[] = Array.from({ length: n }, (_, i) => ({ id: 'c' + String(i + 1), running: true }))
    const h = retainHarness(rows, { openFails: ['c1'] })
    const roster = new RetainedSubagentRoster(h.sessions, h.conversations, sid('p'), { ...fast, cache: new Map() })
    roster.setCatalog(rows.map(r => ({ id: r.id, mode: 'one-shot' })))
    await flush()
    expect(h.held().sort()).toEqual(rows.slice(1).map(r => r.id).sort())   // c1 释放，c2..c9 都占到名额
    for (let i = 2; i <= n; i++) h.chatOf('c' + String(i)).push(content(i))
    const snap = roster.getSnapshot()
    expect(snap).toHaveLength(MAX_LIVE_CHILDREN)
    expect(snap.some(c => c.conversation === null)).toBe(false)
    h.notify(); h.notify()
    expect(h.retain).toHaveBeenCalledTimes(n)    // 打开失败的不反复重试
    roster.dispose()
  })

  it('retain() throwing is caught, not retried on list notifications, and retried only when the catalog changes (review P2-1)', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const h = retainHarness([{ id: 'c1', running: true }], { retainThrows: true })
      const roster = new RetainedSubagentRoster(h.sessions, h.conversations, sid('p'), { ...fast, cache: new Map() })
      expect(() => { roster.setCatalog([{ id: 'c1', mode: 'one-shot' }]) }).not.toThrow()
      expect(roster.getSnapshot()).toEqual([])
      h.notify(); h.notify(); h.notify()
      expect(h.retain).toHaveBeenCalledTimes(1)
      roster.setCatalog([{ id: 'c1', mode: 'one-shot' }, { id: 'c2', mode: 'one-shot' }])   // 目录变了才再试
      expect(h.retain).toHaveBeenCalledTimes(3)
      roster.dispose()
    } finally { errors.mockRestore() }
  })

  it('a catalog entry without a mode is never held (hosts before 0.1.7 reject a guessed mode)', () => {
    const h = retainHarness([{ id: 'c1', running: true }])
    const roster = new RetainedSubagentRoster(h.sessions, h.conversations, sid('p'), { ...fast, cache: new Map() })
    roster.setCatalog([{ id: 'c1' }])
    expect(h.retain).not.toHaveBeenCalled()
    roster.dispose()
  })

  it('a child that leaves the catalog is released', async () => {
    const h = retainHarness([{ id: 'c1', running: true }])
    const roster = new RetainedSubagentRoster(h.sessions, h.conversations, sid('p'), { ...fast, cache: new Map() })
    roster.setCatalog([{ id: 'c1', mode: 'one-shot' }])
    await flush()
    expect(h.held()).toEqual(['c1'])
    roster.setCatalog([])
    expect(h.held()).toEqual([])
    expect(roster.getSnapshot()).toEqual([])
    roster.dispose()
  })

  it('a continuable child running again keeps showing its cached branch while the new hold loads (review P3-6)', async () => {
    const cache = new Map()
    const h = retainHarness([{ id: 'c1', running: false }])
    h.chatOf('c1').push(content(1))
    const roster = new RetainedSubagentRoster(h.sessions, h.conversations, sid('p'), { cache, publishDelayMs: 0 })
    roster.setCatalog([{ id: 'c1', mode: 'continuable', label: 'again' }])
    await flush()
    expect(h.held()).toEqual([])
    h.chatOf('c1').push([])                      // 新一代持有的窗口还是空的
    h.setRows([{ id: 'c1', running: true }])
    expect(h.held()).toEqual(['c1'])
    expect(roster.getSnapshot().map(c => ({ id: c.id, running: c.running, rows: c.conversation?.order.length }))).toEqual([{ id: 'c1', running: true, rows: 2 }])
    roster.dispose()
  })

  it('coalesces publishes from streaming conversation cuts, and never re-publishes an unchanged roster', async () => {
    const h = retainHarness([{ id: 'c1', running: true }])
    const roster = new RetainedSubagentRoster(h.sessions, h.conversations, sid('p'), { cache: new Map(), publishDelayMs: 40 })
    roster.setCatalog([{ id: 'c1', mode: 'one-shot', label: 't' }])
    await flush()
    const seen = vi.fn()
    roster.subscribe(seen)
    h.chatOf('c1').push(openContent(1))
    h.chatOf('c1').push(openContent(1))
    expect(seen).not.toHaveBeenCalled()          // 还在合并窗口里
    await wait(60)
    expect(seen).toHaveBeenCalledTimes(1)
    const before = roster.getSnapshot()
    h.setRows([{ id: 'c1', running: true }])     // 列表通知，内容没变（0.2.0 任何投影变化都通知）
    h.setRows([{ id: 'c1', running: true }])
    expect(seen).toHaveBeenCalledTimes(1)
    expect(roster.getSnapshot()).toBe(before)
    roster.dispose()
  })

  it("a child settled by the host's synchronous first subscriber callback still gets its listener removed (re-review P3-A)", async () => {
    const h = retainHarness([{ id: 'c1', running: false }])
    h.chatOf('c1').push(content(1))
    const roster = new RetainedSubagentRoster(h.sessions, h.conversations, sid('p'), { ...fast, cache: new Map() })
    roster.setCatalog([{ id: 'c1', mode: 'one-shot', label: 'done' }])
    await flush()
    expect(h.held()).toEqual([])
    expect(roster.getSnapshot().map(c => c.id)).toEqual(['c1'])
    expect(h.chatOf('c1').listeners.size).toBe(0)   // 结算发生在 subscribe 返回之前，退订函数仍被调用
    roster.dispose()
  })

  it('ready rejecting with an open error frees the slot instead of holding an empty child forever (re-review P3-C)', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const h = retainHarness([{ id: 'c1', running: true }], { openThrows: ['c1'] })
      const roster = new RetainedSubagentRoster(h.sessions, h.conversations, sid('p'), { ...fast, cache: new Map() })
      roster.setCatalog([{ id: 'c1', mode: 'one-shot' }])
      await flush()
      expect(h.held()).toEqual([])
      expect(roster.getSnapshot()).toEqual([])
      h.notify(); h.notify()
      expect(h.retain).toHaveBeenCalledTimes(1)
      roster.dispose()
    } finally { errors.mockRestore() }
  })

  it('a refusal seen while the child was not running is retried once it starts running (re-review P3-D)', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const h = retainHarness([{ id: 'c1', running: false }], { retainThrowsOnce: ['c1'] })
      const roster = new RetainedSubagentRoster(h.sessions, h.conversations, sid('p'), { ...fast, cache: new Map() })
      roster.setCatalog([{ id: 'c1', mode: 'one-shot' }])
      expect(h.retain).toHaveBeenCalledTimes(1)      // 第一次被拒
      h.notify()
      expect(h.retain).toHaveBeenCalledTimes(1)      // 列表通知不重试
      h.setRows([{ id: 'c1', running: true }])       // 翻回运行：再试一次
      expect(h.retain).toHaveBeenCalledTimes(2)
      await flush()
      expect(h.held()).toEqual(['c1'])
      roster.dispose()
    } finally { errors.mockRestore() }
  })

  it('stop → run → stop within the grace period restarts the grace clock (re-review P3-B)', async () => {
    const h = retainHarness([{ id: 'c1', running: true }])
    const roster = new RetainedSubagentRoster(h.sessions, h.conversations, sid('p'), { cache: new Map(), publishDelayMs: 0, settleGraceMs: 200 })
    roster.setCatalog([{ id: 'c1', mode: 'continuable', label: 't' }])
    await flush()
    h.chatOf('c1').push(openContent(1))
    h.setRows([{ id: 'c1', running: false }])       // t0：宽限开始
    await wait(60)
    h.setRows([{ id: 'c1', running: true }])        // 又跑起来：宽限作废
    h.setRows([{ id: 'c1', running: false }])       // t0+60：重新计时
    await wait(170)                                  // t0+230：旧算法已按 t0 结算，新算法还在等
    expect(h.held()).toEqual(['c1'])
    await wait(80)                                   // t0+310：超过 t0+60+200
    expect(h.held()).toEqual([])
    roster.dispose()
  })

  it('legacy (passive) roster takes the child name from the catalog when the host projects one', async () => {
    const rows: FakeRow[] = [
      { id: sid('c1'), parentId: sid('p'), origin: 'subagent', running: true, displayTitle: 'StartUp_AIBrain' },
    ]
    const h = harness(rows)
    h.addFace(sid('c1'))
    const source = new SubagentMazeSource(h.sessions, h.conversations, sid('p'))
    h.chatOf(sid('c1')).push(content(1) as never)
    await flush()
    expect(source.getSnapshot()[0]!.label).toBe('StartUp_AIBrain')   // 0.1.5 上没标题的子会话退回工作区目录名
    source.setCatalog([{ id: 'c1', label: '任务甲' }])
    expect(source.getSnapshot()[0]!.label).toBe('任务甲')
    source.dispose()
  })
})
