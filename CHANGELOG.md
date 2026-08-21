# 更新日志

本仓库的版本历史。英文摘要附在每个条目末尾。

## v0.5.2 — 2026-08-21

浮层加可见关闭按钮（右上角 ✕，带「关闭（Esc）」提示）。v0.5.0 起对比面板挂 `shell.overlay` 全屏盖住侧栏后，界面上没有任何可见出口，只能靠碰运气知道 Esc——实际用户第一次就被困住了。Esc 与切换会话自动关闭的行为保持不变。

_EN: The overlay surface gains a visible close button (top-right ✕, titled "Close (Esc)"). Since v0.5.0 the compare surface mounts on `shell.overlay`, covering the sidebar with no visible exit — first-time users got stuck unless they guessed Esc. Esc and close-on-session-switch behavior unchanged._

## v0.5.1 — 2026-08-21

对比可读性三连修：

- **加载自适应**：时间轴去掉 460 秒固定下限，短会话（如 72s/43s 双会话对比）不再被压扁在左侧、对齐标注挤成一团；Tmax 贴合内容跨度（×1.04 给右缘旗标留呼吸位）。
- **本轮耗时口径**：轮次对齐线从「会话开始算起的累计墙钟」改标「本轮耗时」（该轮最早节点 → 回答完成）：轮与轮之间等用户输入的空闲不再计入，两次运行的速度对比不再被空闲污染。图例悬停注明口径。
- **推理量标签自解释**：无 usage 真值时从「N 段推理」改为「推理 N 段（日志未报 token 用量）」——中转站日志常缺 `reasoningTokens`，与原厂日志并排时单位不同，标签自带原因。

_EN: Three compare-readability fixes — the axis's 460s floor is retired (short sessions fit the viewport on load); turn-alignment labels switch to per-turn time (turn start → answer done, inter-turn user-input waits excluded); the reasoning-volume fallback without usage is self-explaining ("reasoning N chunks (no token usage in log)")._

## v0.5.0 — 2026-08-20

**界面双语。**

整页 UI 中英双语：嵌入宿主时经 postMessage 实时跟随 dsh 的语言设置（同主题跟随的通道模式），独立打开按浏览器语言兜底。判定依据从成品文案改为语言无关的结构化键值 `{k, p}`，展示端按当前语言集中渲染——切语言即时生效，已加载的会话数据无需重新解析。仓库 README 调换为中文默认（英文在 README.en.md）。

_EN: The whole UI ships bilingual (zh/en), live-following the dsh host's language setting via postMessage (same channel pattern as theme following) with a browser-language fallback standalone. Verdict rationales become language-neutral structured `{k, p}` keys rendered in the current language — switching is instant, no re-parse. The repo README flips to Chinese-default with English in README.en.md._

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
