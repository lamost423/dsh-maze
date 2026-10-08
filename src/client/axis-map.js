/**
 * 横轴映射：把节点时间换成「横轴坐标」。两种视图共用一套接口：
 *
 *   - `time`（默认）：空闲折叠——对话间的等待压成细缝（由页面里的 compressTimeline 建图）。
 *   - `step`：步序视图——每一步一列等宽，与墙钟时间解耦（issue #9）。
 *
 * 两种模式都先把原始时间备份到 `s0`/`e0`，因此可以随时来回切换，不必重新解析日志；
 * 任何用到「真实耗时」的地方一律读 `s0`/`e0`，不靠坐标反查（反查只服务播放时钟这类显示）。
 *
 * 这个模块是纯函数、不碰 DOM：tsdown 把它内联进 maze-upload.html 的 AXIS 占位符，
 * 同时 tests/axis-map.test.ts 直接 import 它——两条链路口径靠同一份源码保证。
 */

/** 步序列宽：一列 1 个单位，条宽占 92%，留 8% 做列间距。 */
export const STEP_WIDTH = 0.92

/** 把每个节点/工具的原始时间备份到 s0/e0。已有备份不覆盖（切视图来回时不丢原始值）。 */
export function keepOriginals(data) {
  for (const l of data.lanes) {
    for (const arr of [l.main, l.detours]) {
      for (const n of arr) {
        if (n.s0 === undefined) n.s0 = n.s
        if (n.e0 === undefined) n.e0 = n.e
        if (!n.tools) continue
        for (const tl of n.tools) {
          if (tl.s == null) continue
          if (tl.s0 === undefined) tl.s0 = tl.s
          if (tl.e0 === undefined) tl.e0 = tl.e
        }
      }
    }
  }
}

/** 还原原始时间。切视图前调用：映射永远从原始坐标出发，多次切换不累积误差。 */
export function restoreOriginals(data) {
  for (const l of data.lanes) {
    for (const arr of [l.main, l.detours]) {
      for (const n of arr) {
        if (n.s0 !== undefined) n.s = n.s0
        if (n.e0 !== undefined) n.e = n.e0
        if (!n.tools) continue
        for (const tl of n.tools) {
          if (tl.s0 !== undefined) tl.s = tl.s0
          if (tl.e0 !== undefined) tl.e = tl.e0
        }
      }
    }
  }
}

/** 一条泳道的步骤（一步一个节点，主路径或支路），按步号升序。 */
export function laneSteps(lane) {
  return [...lane.main, ...lane.detours].sort((a, b) => (a.step ?? 0) - (b.step ?? 0))
}

/** 列数 = 各泳道步数的最大值：对比模式下同一列就是各泳道的同一步，便于逐步对账。 */
export function stepColumnCount(lanes) {
  let n = 0
  for (const l of lanes) n = Math.max(n, l.main.length + l.detours.length)
  return n
}

/**
 * 步序映射：第 k 步落在 `[k, k+1)`，所有步等宽；步内工具的先后与相对位置保留
 * （按原始时间在同一列内线性压缩）。返回挂在 `data.timeMap` 上的映射描述。
 */
export function applyStepMap(data) {
  keepOriginals(data)
  const unit = 1
  const cols = []
  for (const l of data.lanes) {
    laneSteps(l).forEach((n, k) => {
      const s0 = n.s0 ?? n.s
      const e0 = Math.max(n.e0 ?? n.e, s0)
      const real = Math.max(e0 - s0, 1e-6)
      const cs = k * unit
      const ce = cs + STEP_WIDTH
      n.s = cs
      n.e = ce
      if (n.tools) {
        for (const tl of n.tools) {
          if (tl.s0 == null) continue
          const ts = Math.min(1, Math.max(0, (tl.s0 - s0) / real))
          const te = Math.min(1, Math.max(0, ((tl.e0 ?? tl.s0) - s0) / real))
          tl.s = cs + ts * STEP_WIDTH
          tl.e = cs + te * STEP_WIDTH
        }
      }
      cols.push({ lane: l.key, step: n.step, cs, ce, realS: s0, realE: e0 })
    })
  }
  const count = stepColumnCount(data.lanes)
  data.Tmax = Math.max(count, 1) * unit
  data.timeMap = { kind: 'step', unit, width: STEP_WIDTH, count, cols }
  return data.timeMap
}

/**
 * 步序反查：轴坐标 → 墙钟秒。一列内按该列的真实起止线性插值；
 * 对比模式下一列有多个泳道的不同真实区间，取它们的并集（显示用近似值，
 * 需要精确耗时的地方请直接读节点的 s0/e0）。
 */
export function stepWallClock(t, map) {
  const k = Math.min(map.count - 1, Math.max(0, Math.floor(t / map.unit)))
  const cs = k * map.unit
  const frac = Math.min(1, Math.max(0, (t - cs) / map.width))
  let realS = Infinity
  let realE = -Infinity
  for (const c of map.cols) {
    if (Math.abs(c.cs - cs) > 1e-9) continue
    if (c.realS < realS) realS = c.realS
    if (c.realE > realE) realE = c.realE
  }
  if (!isFinite(realS) || !isFinite(realE)) return t
  return realS + (realE - realS) * frac
}

/** 折叠反查：折叠坐标 → 墙钟秒（原先页面里 wallClock 的逻辑，抽出来给两条映射共用）。 */
export function foldWallClock(t, map) {
  const segs = map.segments
  for (let i = segs.length - 1; i >= 0; i--) {
    const g = segs[i]
    if (t >= g.cs) return Math.min(g.re, g.rs + (t - g.cs))
  }
  return t
}
