/** `traceCompare` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'trigger': 'Trace 对比',
  'trigger.open': '打开 Trace 对比',
  'trigger.close': '关闭 Trace 对比',
  'title': 'Trace 对比',
  'subtitle': '上传 session log，可视化模型探索路径',
  'view.live': '实时迷宫',
  'surface.close': '关闭（Esc）',
  'live.empty': '会话还没有可可视化的执行轨迹',
} satisfies Record<string, string>

/** Trace Compare locale key union. */
export type TraceCompareKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'trigger': 'Trace Compare',
  'trigger.open': 'Open Trace Compare',
  'trigger.close': 'Close Trace Compare',
  'title': 'Trace Compare',
  'subtitle': 'Upload session logs and visualize agent exploration paths',
  'view.live': 'Live Maze',
  'surface.close': 'Close (Esc)',
  'live.empty': 'No execution trace to visualize in this session yet',
} satisfies Record<TraceCompareKey, string>
