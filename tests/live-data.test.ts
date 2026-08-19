/** Verdict settlement and partitioning for the live maze converter. */
import { describe, expect, it } from 'vitest'
import { snapshotToMazeData } from '../src/client/live-data.ts'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

const t0 = 1_787_000_000_000

function syntheticSnapshot(): ConversationSnapshot {
  return {
    partial: null,
    nodes: [
      { kind: 'user', time: t0 },
      // step 1: one failed tool + one ok tool -> error -> detour
      { kind: 'assistant', seq: 11, time: t0 + 2000, timing: { stepStartTime: t0 + 1000 }, requestConfig: { model: 'deepseek-v4-flash' }, blocks: [
        { kind: 'reasoning', text: 'think' },
        { kind: 'tool-call', name: 'bash', callId: 'a', argsRaw: '{"command":"ls"}' },
        { kind: 'tool-call', name: 'bash', callId: 'b', argsRaw: '{"command":"cat x"}' },
      ] },
      { kind: 'tool-result', time: t0 + 3000, callId: 'a', isError: true, content: [{ type: 'text', text: 'boom' }] },
      { kind: 'tool-result', time: t0 + 4000, callId: 'b', isError: false, content: [{ type: 'text', text: 'a'.repeat(6000) }] },
      // step 2: one short-result tool -> deadend -> detour
      { kind: 'assistant', seq: 12, time: t0 + 6000, timing: { stepStartTime: t0 + 5000 }, blocks: [
        { kind: 'tool-call', name: 'grep', callId: 'c', argsRaw: '{"pattern":"x"}' },
      ] },
      { kind: 'tool-result', time: t0 + 7000, callId: 'c', isError: false, content: [{ type: 'text', text: 'hit' }] },
      // step 3: tool call whose result has not arrived -> pending -> stays main
      { kind: 'assistant', seq: 13, time: t0 + 9000, timing: { stepStartTime: t0 + 8000 }, blocks: [
        { kind: 'tool-call', name: 'bash', callId: 'd', argsRaw: '{"command":"sleep 99"}' },
      ] },
      // step 4: no tools -> answer -> main
      { kind: 'assistant', seq: 14, time: t0 + 11000, timing: { stepStartTime: t0 + 10000 }, blocks: [
        { kind: 'text', text: 'done' },
      ] },
    ],
  } as never
}

describe('snapshotToMazeData', () => {
  it('settles verdicts only from arrived tool results', () => {
    const data = snapshotToMazeData(syntheticSnapshot())
    expect(data).not.toBeNull()
    const lane = data!.lanes[0]!
    expect(lane.stats.main).toBe(2)
    expect(lane.stats.detours).toBe(2)
    expect(lane.detours.map(n => n.v).sort()).toEqual(['deadend', 'error'])
    // pending tool (no result) must not vote its step onto a detour
    expect(lane.main.some(n => n.tools.some(t => t.e === null))).toBe(true)
    // tool-less settled step renders as the answer node
    expect(lane.main[lane.main.length - 1]!.v).toBe('answer')
    // one user message -> every node belongs to turn 1
    expect(new Set([...lane.main, ...lane.detours].map(n => n.turn))).toEqual(new Set([1]))
  })

  it('reports the latest model carried by a request header', () => {
    const data = snapshotToMazeData(syntheticSnapshot())
    expect(data!.lanes[0]!.model).toBe('deepseek-v4-flash')
  })

  it('returns null for an empty conversation', () => {
    expect(snapshotToMazeData({ partial: null, nodes: [] } as never)).toBeNull()
  })

  it('carries jump anchors: node seq and tool callId', () => {
    const data = snapshotToMazeData(syntheticSnapshot())
    const lane = data!.lanes[0]!
    const all = [...lane.main, ...lane.detours]
    expect(all.map(n => n.seq).sort()).toEqual([11, 12, 13, 14])
    const detour = lane.detours.find(n => n.v === 'error')!
    expect(detour.tools.map(t => t.callId)).toEqual(['a', 'b'])
  })

  it('keeps a 380-char tooltip excerpt and a 5000-char panel text for long results', () => {
    const data = snapshotToMazeData(syntheticSnapshot())
    const lane = data!.lanes[0]!
    const long = [...lane.main, ...lane.detours]
      .flatMap(n => n.tools)
      .find(t => t.callId === 'b')!
    expect(long.res).toHaveLength(380)
    expect(long.resFull).toHaveLength(5000)
  })

  it('keeps a 240-char reasoning excerpt and a 2000-char panel text', () => {
    const snap = syntheticSnapshot() as { nodes: { kind: string; blocks?: { kind: string; text?: string }[] }[] }
    const first = snap.nodes.find(n => n.kind === 'assistant')!
    first.blocks![0] = { kind: 'reasoning', text: 'r'.repeat(9000) }
    const data = snapshotToMazeData(snap as never)
    const node = [...data!.lanes[0]!.main, ...data!.lanes[0]!.detours].find(n => n.seq === 11)!
    expect(node.rzTxt).toHaveLength(240)
    expect(node.rzTxtFull).toHaveLength(2000)
  })
})
