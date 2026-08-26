/** `traceCompare` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'trigger': '执行迷宫',
  'trigger.open': '打开执行迷宫',
  'trigger.close': '关闭执行迷宫',
  'title': '执行迷宫',
  'subtitle': '上传 session log，看模型真实的执行路径与分析',
  'view.live': '实时迷宫',
  'surface.close': '关闭（Esc）',
  'live.empty': '会话还没有可可视化的执行轨迹',
} satisfies Record<string, string>

/** Trace Compare locale key union. */
export type TraceCompareKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'trigger': 'Maze',
  'trigger.open': 'Open Maze',
  'trigger.close': 'Close Maze',
  'title': 'Maze',
  'subtitle': 'Upload session logs to see how the agent really worked, with analysis',
  'view.live': 'Live Maze',
  'surface.close': 'Close (Esc)',
  'live.empty': 'No execution trace to visualize in this session yet',
} satisfies Record<TraceCompareKey, string>
