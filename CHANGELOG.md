# 更新日志

本仓库的版本历史。英文摘要附在每个条目末尾。

## v0.6.0 — 2026-08-22

**UI 大改版：一次设计评审驱动的全面重做——看得清、拖入即读、去 AI 味配色。**

- **画布自适应滚动**：整图 fit 在内容偏高时会把迷宫压到十几个百分点（双会话实测 0.24×，节点文字 2.6px 全糊）。缩放跌破可读下限改为按宽度铺满 + 纵向滚动，时间轴刻度钉在顶部不随内容滚走，首帧自动定位到主干线；滚动模式下普通滚轮归滚动、缩放走 ⌘/Ctrl+滚轮。实测双会话 0.24× → 0.79×。
- **拖入即读**：上传后直接呈现完整迷宫（原先节点条 opacity 0，非得先找到播放键才看得见自己的数据）；播放降级为可选回放，按钮显示「重播」。
- **全新配色「钢蓝 + 赭褐」**：明确告别靛/紫系（AI 生成界面的招牌色）。两条对比泳道一冷一暖（红绿色盲可分），主干节点用泳道主色、绿色只留每轮最终回答（原先整条主干染绿与图例语义冲突）；轮次对齐线降为中性灰，全图高彩度色从五个收敛到三个。
- **界面精致化**：设计令牌重构（明暗两套）、毛玻璃浮层（详情/盘点/悬停卡）、ghost 工具条（只有播放键实心）、页头并行化（1280 下页头 259→156px，迷宫多拿高度）、图例单行横滚、泳道标题显示上传文件名、全局字阶下调一档。
- **可达性与健壮性**：正文/刻度文字对比度提到 WCAG AA；折叠时间轴的刻度标签逐个避让不再互相叠字、轴标签精度随步长（14h 跨度不再连排六个「13h」）；375px 视口横向溢出修复（774→375）；触屏设备控件抬到 44px 触控下限。
- **实时泳道显示模型名**：`request/header` 不属于会话快照的 surface 事件，浏览器侧从来拿不到模型名。配套宿主 fork 注册 `modelIdentity` 会话投影（宿主侧折叠全量日志），本插件经标准投影钩子探测读取——stock dsh 无此键时自然降级，兼容不变。

_EN: Major UI overhaul from a design review. Canvas adaptively switches to width-fill + vertical scroll with a pinned axis when meet-fit drops below legibility (two-lane real case: 0.24× → 0.79×), first frame lands on the main path. Uploads render the full maze immediately (playback becomes optional replay). New "steel blue + ochre" palette retires the AI-signature indigo/purple: warm/cool lane pair (CVD-safe), lane-colored main-path nodes with green reserved for final answers, neutral turn-alignment lines. Refined chrome: glass overlays, ghost toolbar, parallelized header, single-line legend, filenames in lane titles. Contrast raised to WCAG AA, tick labels self-collide-avoid with step-aware precision, 375px overflow fixed, 44px touch targets. Live lane now shows the model name via a host-fork `modelIdentity` session projection with capability probing — stock dsh degrades gracefully._

## v0.5.3 — 2026-08-21

**长会话布局修复：迷宫不再随会话时长挤成一条竖线。**

- **支路槽位贪心复用**：支路泳道从「每条独占一层」改为按横向占位（出程弧、条形、回程弧、标签）贪心装箱——前一条支路画完的槽位可被后续支路复用，首选方向仍按序号上下交替保持原有观感。层数从「支路总数的一半」塌缩到「同一时段真正互相重叠的支路数」，画布高度基本与会话时长无关（4.2h/455 步/96 支路的实测会话：viewH 4159 → 1439）。
- **布局随缩放窗口重算**：装箱、布局、画布高度全部挪进 build() 按当前窗口重算——整图态挤在同一时段的支路，放大到单轮后自动重新摊开。
- 同槽相邻支路的下方标签复用原有的行内防重叠抑制，不互相叠字。

_EN: Long-session layout fix — detour lanes switch from one-slot-per-detour to greedy interval packing on each detour's horizontal footprint (out-arc, bar, back-arc, label), so slot count collapses to the true concurrent overlap and viewH stays flat regardless of session length (real 4.2h/455-step/96-detour session: viewH 4159 → 1439). Packing/layout/canvas height now recompute per build against the current zoom window, so detours crowded at full view re-spread when zoomed into a turn._

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
