import { describe, expect, it } from 'vitest'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { snapshotToMazeData, type ChildSessionMaze } from '../src/client/live-data.ts'

/** Parent anchor: child times below are chosen relative to this wall clock. */
const T0 = 1_000_000

function snap(nodes: unknown[], partial: unknown = null): ConversationSnapshot {
  return { nodes, partial } as unknown as ConversationSnapshot
}

function user(time: number): unknown {
  return { kind: 'user', time }
}

function assistant(time: number, seq: number, blocks: unknown[]): unknown {
  return { kind: 'assistant', time, seq, blocks }
}

function toolCall(name: string, callId: string): unknown {
  return { kind: 'tool-call', name, argsRaw: '{}', callId }
}

function toolResult(callId: string, time: number, text: string, isError = false): unknown {
  return { kind: 'tool-result', callId, time, isError, content: [{ type: 'text', text }] }
}

/** Parent with one spawning subagent call at +10s and a closing answer at +40s. */
function parentSnap(): ConversationSnapshot {
  return snap([
    user(T0),
    assistant(T0 + 10_000, 5, [toolCall('subagent', 'spawn-1')]),
    toolResult('spawn-1', T0 + 35_000, 'child done'),
    assistant(T0 + 40_000, 9, []),
  ])
}

function child(overrides: Partial<ChildSessionMaze>, nodes: unknown[]): ChildSessionMaze {
  return {
    id: 'child-1',
    label: '修测试',
    running: false,
    conversation: snap(nodes),
    ...overrides,
  }
}

/** Child activity: two steps between +12s and +30s on the parent clock. */
function childNodes(opts: { errorTail?: boolean } = {}): unknown[] {
  return [
    user(T0 + 12_000),
    assistant(T0 + 13_000, 2, [toolCall('bash', 'c1')]),
    toolResult('c1', T0 + 20_000, 'ok output'),
    assistant(T0 + 25_000, 4, [toolCall('bash', 'c2')]),
    toolResult('c2', T0 + 30_000, opts.errorTail === true ? 'boom' : 'fine', opts.errorTail === true),
  ]
}

describe('snapshotToMazeData with subagent children', () => {
  it('folds one child into one aggregated detour on the parent clock', () => {
    const data = snapshotToMazeData(parentSnap(), [child({}, childNodes())])
    expect(data).not.toBeNull()
    const lane = data!.lanes[0]!
    expect(lane.detours).toHaveLength(1)
    const node = lane.detours[0]!
    expect(node.step).toBeGreaterThanOrEqual(100_000)
    expect(node.tools.map(t => t.callId)).toEqual(['c1', 'c2'])
    expect(node.s).toBeCloseTo(13, 1)
    expect(node.e).toBeCloseTo(30, 1)
    expect(node.v).toBe('ok')
    expect(node.label).toBe('子代理 修测试')
    expect(node.why).toContain('子代理「修测试」')
    expect(node.why).toContain('2 次工具调用')
    // Anchored at the parent main step that contains the child's start,
    // with the spawning call's row seq as the chat-jump anchor.
    expect(node.attach).toBe(lane.main[0]!.step)
    expect(node.seq).toBe(5)
    expect(lane.stats.detours).toBe(1)
  })

  it('keeps a running child live with an in-flight verdict line', () => {
    const data = snapshotToMazeData(parentSnap(), [child({ running: true }, childNodes())])
    const node = data!.lanes[0]!.detours[0]!
    expect(node.live).toBe(true)
    expect(node.v).toBe('ok')
    expect(node.why).toContain('运行中')
  })

  it('marks a child whose last settled step errored', () => {
    const data = snapshotToMazeData(parentSnap(), [child({}, childNodes({ errorTail: true }))])
    const node = data!.lanes[0]!.detours[0]!
    expect(node.v).toBe('error')
    expect(node.why).toContain('以错误收尾')
  })

  it('skips children without usable rows and extends Tmax past long children', () => {
    const empty = child({ id: 'empty' }, [user(T0 + 12_000)])
    const long = child({ id: 'long' }, [
      user(T0 + 12_000),
      assistant(T0 + 13_000, 2, [toolCall('bash', 'c9')]),
      toolResult('c9', T0 + 300_000, 'slow'),
    ])
    const data = snapshotToMazeData(parentSnap(), [empty, long])
    const lane = data!.lanes[0]!
    expect(lane.detours).toHaveLength(1)
    expect(data!.Tmax).toBeGreaterThanOrEqual(300)
  })

  it('drops a settled child whose whole activity predates the visible window', () => {
    const stale = child({ id: 'stale' }, [
      user(T0 - 500_000),
      assistant(T0 - 499_000, 2, [toolCall('bash', 'old1')]),
      toolResult('old1', T0 - 498_000, 'ancient'),
    ])
    const staleButRunning = child({ id: 'live-old', running: true }, [
      user(T0 - 500_000),
      assistant(T0 - 499_000, 2, [toolCall('bash', 'old2')]),
      toolResult('old2', T0 - 498_000, 'still going'),
    ])
    const data = snapshotToMazeData(parentSnap(), [stale, staleButRunning])
    expect(data!.lanes[0]!.detours).toHaveLength(1)
    expect(data!.lanes[0]!.detours[0]!.live).toBe(true)
  })

  it('returns the parent-only payload when no children are passed', () => {
    const data = snapshotToMazeData(parentSnap())
    expect(data!.lanes[0]!.detours).toHaveLength(0)
    expect(data!.lanes[0]!.main.length).toBeGreaterThan(0)
  })
})
