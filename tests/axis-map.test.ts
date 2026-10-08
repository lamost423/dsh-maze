/**
 * 横轴映射（issue #9）的单元测试：步序视图的等宽列、列内工具压缩、来回切换不累积误差、
 * 反查墙钟，以及折叠视图的反查口径（原先页面里 wallClock 的逻辑）。
 */
import { describe, expect, it } from 'vitest'
import {
  STEP_WIDTH,
  applyStepMap,
  foldWallClock,
  keepOriginals,
  laneSteps,
  restoreOriginals,
  stepColumnCount,
  stepWallClock,
  type AxisData,
} from '../src/client/axis-map.js'

/** 造一条泳道：steps = [步号, 起点, 终点, 工具[[s,e],…]] */
function lane(key: string, steps: [number, number, number, [number, number][]][]): AxisData['lanes'][number] {
  return {
    key,
    main: steps.map(([step, s, e, tools]) => ({ step, s, e, tools: tools.map(([ts, te]) => ({ s: ts, e: te })) })),
    detours: [],
  }
}

function data(...lanes: AxisData['lanes']): AxisData {
  return { lanes, Tmax: 0 }
}

describe('axis-map：步序视图', () => {
  it('每一步一列等宽，与真实时长无关', () => {
    const d = data(lane('l1', [
      [1, 0, 5, []],
      [2, 5, 300, []],     // 拖了五分钟的一步
      [3, 300, 301, []],
    ]))
    const map = applyStepMap(d)
    const nodes = d.lanes[0].main
    expect(nodes.map(n => n.s)).toEqual([0, 1, 2])
    expect(nodes.map(n => n.e)).toEqual([STEP_WIDTH, 1 + STEP_WIDTH, 2 + STEP_WIDTH])
    expect(map.count).toBe(3)
    expect(d.Tmax).toBe(3)
    // 三列等宽：列间距也一致
    expect(nodes[1].s - nodes[0].s).toBe(nodes[2].s - nodes[1].s)
  })

  it('列内工具按原始时间比例压缩，先后顺序不变', () => {
    const d = data(lane('l1', [
      [1, 100, 200, [[100, 125], [150, 160], [200, 200]]],
    ]))
    applyStepMap(d)
    const tools = d.lanes[0].main[0].tools!
    expect(tools[0].s).toBeCloseTo(0, 6)
    expect(tools[0].e).toBeCloseTo(STEP_WIDTH * 0.25, 6)
    expect(tools[1].s).toBeCloseTo(STEP_WIDTH * 0.5, 6)
    expect(tools[2].s).toBeCloseTo(STEP_WIDTH, 6)
    expect(tools[0].s!).toBeLessThan(tools[1].s!)
    expect(tools[1].s!).toBeLessThan(tools[2].s!)
  })

  it('多泳道：列数取最大步数，同一步号落在同一列（对比模式逐步对账）', () => {
    const a = lane('l1', [[1, 0, 10, []], [2, 10, 20, []]])
    const b = lane('l2', [[1, 0, 30, []], [2, 40, 50, []], [3, 60, 90, []]])
    const d = data(a, b)
    const map = applyStepMap(d)
    expect(stepColumnCount(d.lanes)).toBe(3)
    expect(map.count).toBe(3)
    // l1 的第 2 步与 l2 的第 2 步同列
    expect(a.main[1].s).toBe(b.main[1].s)
    expect(d.Tmax).toBe(3)
  })

  it('原始时间备份保留，还原后可再次映射（切换视图不累积误差）', () => {
    const d = data(lane('l1', [[1, 100, 140, [[110, 120]]], [2, 900, 940, []]]))
    keepOriginals(d)
    applyStepMap(d)
    expect(d.lanes[0].main[0].s0).toBe(100)
    expect(d.lanes[0].main[0].e0).toBe(140)
    expect(d.lanes[0].main[0].tools![0].s0).toBe(110)
    restoreOriginals(d)
    expect(d.lanes[0].main[0].s).toBe(100)
    expect(d.lanes[0].main[0].e).toBe(140)
    expect(d.lanes[0].main[1].s).toBe(900)
    expect(d.lanes[0].main[0].tools![0].e).toBe(120)
    // 再映射一次，坐标与第一次完全一致
    const first = applyStepMap(d).cols.map(c => [c.cs, c.ce])
    restoreOriginals(d)
    const second = applyStepMap(d).cols.map(c => [c.cs, c.ce])
    expect(second).toEqual(first)
  })

  it('反查墙钟：列首是真实起点、列尾是真实终点（单泳道精确）', () => {
    const d = data(lane('l1', [[1, 100, 200, []], [2, 275, 400, []]]))
    const map = applyStepMap(d)
    expect(stepWallClock(0, map)).toBeCloseTo(100, 6)
    expect(stepWallClock(STEP_WIDTH, map)).toBeCloseTo(200, 6)
    expect(stepWallClock(1, map)).toBeCloseTo(275, 6)
    expect(stepWallClock(1 + STEP_WIDTH / 2, map)).toBeCloseTo(337.5, 6)      // 列内线性插值（条宽一半）
    expect(stepWallClock(1 + STEP_WIDTH + 0.03, map)).toBeCloseTo(400, 6)     // 列间距里按列尾算，不给假时间
  })

  it('空泳道与单步会话都不炸', () => {
    expect(stepColumnCount([])).toBe(0)
    const one = data(lane('l1', [[1, 0, 1, []]]))
    const map = applyStepMap(one)
    expect(map.count).toBe(1)
    expect(one.Tmax).toBe(1)
    const empty = data(lane('l1', []))
    expect(applyStepMap(empty).count).toBe(0)
  })

  it('laneSteps 按步号升序，支路节点也占一列', () => {
    const l = lane('l1', [[1, 0, 1, []], [3, 9, 10, []]])
    l.detours.push({ step: 2, s: 5, e: 6, tools: [] })
    expect(laneSteps(l).map(n => n.step)).toEqual([1, 2, 3])
  })

  it('压缩事件时刻跟着所在列走，还原后回到原始时刻（诊断层第 3 项）', () => {
    const d = data(lane('l1', [[1, 0, 10, []], [2, 20, 30, []]]))
    d.lanes[0].compaction = { starts: [25], pruneAt: [5], prunes: 1, summaries: 1, ends: 1 }
    applyStepMap(d)
    expect(d.lanes[0].compaction!.starts).toEqual([1])     // 25 秒落在第 2 步 → 列 1
    expect(d.lanes[0].compaction!.pruneAt).toEqual([0])    // 5 秒落在第 1 步 → 列 0
    restoreOriginals(d)
    expect(d.lanes[0].compaction!.starts).toEqual([25])
    expect(d.lanes[0].compaction!.pruneAt).toEqual([5])
    applyStepMap(d)
    expect(d.lanes[0].compaction!.starts).toEqual([1])     // 再映射一次结果一致
  })
})

describe('axis-map：折叠视图反查', () => {
  const map = {
    segments: [
      { rs: 0, re: 100, cs: 0 },
      { rs: 1000, re: 1100, cs: 130 },   // 中间 900 秒折成 30 秒缝
    ],
    gaps: [{ c: 100, skipped: 900 }],
    seam: 30,
  }

  it('活动段内与原始时间一一对应', () => {
    expect(foldWallClock(40, map)).toBe(40)
    expect(foldWallClock(150, map)).toBe(1020)
  })

  it('折叠缝里停在活动段起点（不给假时间）', () => {
    expect(foldWallClock(115, map)).toBe(100)
    expect(foldWallClock(129, map)).toBe(100)
  })

  it('段前与段后原样返回', () => {
    expect(foldWallClock(0, map)).toBe(0)
    expect(foldWallClock(130, map)).toBe(1000)
  })
})
