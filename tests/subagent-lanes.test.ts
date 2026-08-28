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

  const sessions = {
    list: {
      getSnapshot: () => ({ byId: byId() }),
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
      return f
    },
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
    await flush()
    const roster = source.getSnapshot()
    expect(roster.map(c => c.id)).toEqual(['c1'])
    expect(roster[0]!.label).toBe('任务甲')
    expect(roster[0]!.running).toBe(true)
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
    h.chatOf(sid('c1')).push([{ kind: 'user', time: 1 }])
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

  it('retries a child that was not yet addressable on a later list tick', async () => {
    const rows: FakeRow[] = [
      { id: sid('late'), parentId: sid('p'), origin: 'subagent', running: true, displayTitle: '晚到' },
    ]
    const h = harness(rows)
    const source = new SubagentMazeSource(h.sessions, h.conversations, sid('p'))
    await flush()
    expect(source.getSnapshot()).toHaveLength(0)
    h.addFace(sid('late'))
    h.setRows([...rows])
    await flush()
    expect(source.getSnapshot().map(c => c.id)).toEqual(['late'])
    source.dispose()
  })
})
