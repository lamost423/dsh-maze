/**
 * axis-map.js 的手写类型声明（该实现须保持纯 JS：构建期会被注入 maze-upload.html
 * 的内联脚本，同时被 tests/axis-map.test.ts 直接 import）。改导出时同步本文件。
 */

/** 一列条宽（一列 1 个单位，条宽占 92%）。 */
export declare const STEP_WIDTH: number

/** 节点或工具：`s`/`e` 是当前轴坐标，`s0`/`e0` 是映射前的原始墙钟秒。 */
export interface AxisSpan {
  s: number
  e: number
  s0?: number
  e0?: number
}

export interface AxisNode extends AxisSpan {
  step?: number
  turn?: number
  tools?: (AxisSpan & { s?: number | null; e?: number | null })[]
}

/** 压缩事件原料：starts/pruneAt 是当前轴坐标，starts0/pruneAt0 是原始墙钟秒。 */
export interface AxisCompaction {
  starts: number[]
  starts0?: number[]
  pruneAt?: number[]
  pruneAt0?: number[]
  prunes?: number
  summaries?: number
  ends?: number
}

export interface AxisLane {
  key: string
  main: AxisNode[]
  detours: AxisNode[]
  compaction?: AxisCompaction
}

export interface AxisData {
  lanes: AxisLane[]
  Tmax: number
  timeMap?: StepMap | FoldMap | null
}

export interface StepColumn {
  lane: string
  step?: number
  cs: number
  ce: number
  realS: number
  realE: number
}

export interface StepMap {
  kind: 'step'
  unit: number
  width: number
  count: number
  cols: StepColumn[]
}

export interface FoldSegment {
  rs: number
  re: number
  cs: number
}

export interface FoldMap {
  kind?: 'fold'
  segments: FoldSegment[]
  gaps: { c: number; skipped: number }[]
  seam: number
}

export declare function keepOriginals(data: AxisData): void
export declare function restoreOriginals(data: AxisData): void
export declare function laneSteps(lane: AxisLane): AxisNode[]
export declare function stepColumnCount(lanes: AxisLane[]): number
export declare function applyStepMap(data: AxisData): StepMap
export declare function stepWallClock(t: number, map: StepMap): number
export declare function foldWallClock(t: number, map: FoldMap): number
