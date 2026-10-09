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
  'settings.sidebarEntry': '侧边栏入口',
  'settings.sidebarEntry.hint': '在侧边栏底部显示「执行迷宫」入口。关闭后「实时迷宫」页签不受影响。此开关按浏览器保存。',
  'lib.title': '本机会话',
  'lib.loading': '正在读取会话列表…',
  'lib.empty': '这台机器上没有可对比的会话',
  'lib.live': '进行中',
  'lib.compare': '对比选中的',
  'lib.hint': '勾选 2~5 场；点对比后会把完整日志读进来（长会话要等几秒）。数据来自宿主进程，整篇日志不进浏览器缓存。',
  'lib.reading': '正在读取',
  'lib.errNoQuery': '这个宿主没装会话查询服务（session-query），本机会话库不可用——把日志导出后手动上传仍然可用。',
  'lib.errTooLarge': '这份日志超过 96 MB 上限，请手动导出后上传。',
  'lib.errGeneric': '读取失败：',
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
  'settings.sidebarEntry': 'Sidebar entry',
  'settings.sidebarEntry.hint': 'Show the Maze entry at the bottom of the sidebar. The Live Maze tab is not affected. Saved per browser.',
  'lib.title': 'Local sessions',
  'lib.loading': 'Loading the session list…',
  'lib.empty': 'No sessions to compare on this machine',
  'lib.live': 'running',
  'lib.compare': 'Compare selected',
  'lib.hint': 'Pick 2–5 sessions; Compare pulls their full logs in (a long one takes a few seconds). The data comes from the Host process; nothing is cached in the browser.',
  'lib.reading': 'Reading',
  'lib.errNoQuery': 'This Host has no session-query service, so the local library is unavailable — exporting a log and uploading it still works.',
  'lib.errTooLarge': 'That log is over the 96 MB limit; export and upload it instead.',
  'lib.errGeneric': 'Could not read: ',
} satisfies Record<TraceCompareKey, string>
