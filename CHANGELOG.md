# 更新日志

本仓库的版本历史。英文摘要附在每个条目末尾。

## v0.4.0 — 2026-08-20

**子代理执行折入实时迷宫。**

- **新功能**：dsh 子代理会话（模型调 `subagent` 工具派生的任务）以聚合支路节点折入实时迷宫——挂靠在派生它的主干步上、与父会话共享时间轴；节点内的子条是子代理全部已判定的工具调用（参数 / 返回 / 判定齐全）；运行中的子代理实时生长并标注"仍在运行"；点击节点可跳回主对话中的派生位置。
- **身份与文案**：子代理节点在图上、支路段标、悬停预览卡、详情面板显示自己的标签（"子代理 ×××"）与"子代理支路"身份；派生关系写作"⤴ 由主干 SN 派生的子代理任务，完成后结果汇回主干"，不再错误套用失败探索的"此路不通，折返"文案。
- **入图纪律**：仅 `origin: 'subagent'` 且非临时的子会话入图——手动"在新对话分支"与 side-chat 临时子会话不算子代理；已结束且活动完全早于可见窗口的陈旧子代理不画（与父会话窗口外步骤同一处理口径），运行中的照留。
- **兼容性**：子代理支路依赖宿主"后台打开子会话历史"的能力（`SessionFace.open`）。官方 `0.1.0-rc.6` – `rc.8` 尚无此能力，插件自动静默降级——不报错，其余全部功能不受影响；在具备该能力的宿主构建上即刻生效。
- **顺带修复**：内部步号（如 S100000）不再出现在任何用户可见位置。

_EN: Fold dsh subagent child sessions into the live maze as aggregated detour nodes — anchored at the spawning main-path step on the parent's clock, with the child's judged tool calls as sub-bars, live growth while running, and subagent-specific identity copy across labels, hover cards, and the detail panel. Only `origin: 'subagent'`, non-ephemeral children qualify; stale pre-window children are dropped. Requires the host's background history-open capability (`SessionFace.open`); absent through official rc.8, the feature degrades silently._

## v0.3.3 — 2026-08-19

修复实时页签：新步骤开始（纯推理、零工具调用）时整张迷宫瞬间透明。根因是无保护取 `tools[0].name` 打断 build()。

_EN: Fix live-view blackout at the start of every tool-less in-flight step._

## v0.3.2 — 2026-08-19

并行工具调用按调用分行（瀑布行），不再挤在一条杠上。

_EN: Parallel tool calls render as per-call waterfall rows._

## v0.3.1 — 2026-08-19

主题跟随宿主明暗切换；紧凑页头。

_EN: Host theme following and a compact header._

## v0.3.0 — 2026-08-19

对比语义升级：按轮次自动对齐两条会话、手动锚点、每轮支路盘点。

_EN: Turn-aligned compare semantics — alignment lines, manual anchors, per-turn detour inventory._

## v0.2.3 — 2026-08-19

实时窗口诚实化（窗口外陈旧步计数展示而非乱画）；判定防引用误报。

_EN: Honest live window and quote-proof failure signatures._

## v0.2.2 — 2026-08-19

真实 token 计数（推理 / 输出）、搜索过滤工具栏、SVG / PNG 导出。

_EN: Real token counts, search/filter toolbar, SVG/PNG export._

## v0.2.1 — 2026-08-19

判定 v2：共享 verdict 单真相源、长度阈值退役、行为学盲目重试簇检测。

_EN: Honest verdicts — shared verdict module, no length thresholds, behavioral blind-retry detection._

## v0.2.0 — 2026-08-18

上传对比页 + 实时迷宫首个公开版本。

_EN: First public release — trace upload/compare page plus the live maze._
