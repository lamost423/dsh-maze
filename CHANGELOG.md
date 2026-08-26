# 更新日志

本仓库的版本历史。英文摘要附在每个条目末尾。

## v0.7.0 — 2026-08-26

**分析层三件套（执行分析面板 / 泳道数据轨道 / Agent 关系图谱）+ 请求级失败可见化 + 对比扩到 5 个文件（同任务智能识别）。**

- **执行分析面板（📈 分析）**：摘要三卡（工具失败与恢复 / 时间消耗 / 上下文压力）+ 工具结果矩阵（成功/失败/扑空/盲重试/成功率，附 P50/P95/最长耗时分位）+ 失败恢复链——每个失败调用之后发生了什么：原样重试 / 换参数 / 换工具 / 未恢复（分类看失败后的下一次调用；恢复 = 失败后任意工具在 120 秒内再次成功，超窗如实标注；链只统计失败 ✗——扑空 · 与盲重试 ↻ 计入矩阵各自列、不单独进链，盲重试也不算恢复证据）；点一条缩放到该失败并打开详情面板。全部数字是对已判定数据的确定性聚合，不调 LLM，规则在 `verdict.js` 的 `analyzeFailureChains`/`ANALYSIS_RULES`。
- **泳道数据轨道（📊 轨道，可开关）**：泳道带底部三条与迷宫同一时间轴联动（缩放/平移/空闲折叠/播放全跟随）的轨道——**工具调用密度**（每次调用一根刻线，按读取/检索/命令/编辑/其他类别着色，宽 = 真实时长）；**Token 脉冲**（每步堆叠柱：缓存输入/未缓存输入/推理/可见输出——用真实日志验证 `usage.inputTokens` 是未命中缓存口径、`cacheReadTokens` 是命中口径，上下文总量 = 两者之和）；**上下文压力**（折线+面积，模型窗口已知时给占用百分比与 70%/90% 阈值线，压缩呈现为锯齿下落）。窗口表在 `verdict.js` 的 `CONTEXT_WINDOWS`（DeepSeek V4 = 1M 按官方口径收录）；观测峰值超过表值时视为表已过时、自动退回绝对 token 显示——绝不显示超过 100% 的占用。日志没报 usage 就不画后两条轨道，不占高度。
- **Agent 关系图谱（🕸 Agent，UI 选项）**：主 Agent 与子代理的星形总览——节点大小 = 该 Agent 消耗的 token（输入+缓存+输出，无真值时按调用数并注明），连线粗细 = 工具调用数，运行中的子代理虚线标示；点子代理节点跳到它在时间轴上的位置并打开详情。按钮只在真有子代理数据时出现（依赖 v0.4.0 的子代理折入；stock dsh 无该能力时自然隐藏）。
- 配套：实时链路每步新增 `inTok`/`cacheTok` 真值（子代理聚合节点同步汇总）；界面双语与明暗主题全量覆盖新面板与轨道；分析聚合的纯逻辑（已结算调用过滤 / 活动时长合并 / 分位数 / 工具矩阵 / 请求级失败计数 / 同任务可比性）下沉 `verdict.js` 可测模块并有单元测试覆盖。

_EN: The analysis layer arrives as three pieces. **Execution analysis panel (📈)**: three summary cards (tool failures & recovery / time spent / context pressure), a per-tool result matrix (ok/failed/no-result/blind-retry/success rate with P50/P95/max durations), and failure recovery chains — what happened after each failed call: identical retry / changed args / switched tool / not recovered (recovered = any tool succeeds again within 120s; over-window reported honestly); click a row to zoom to that failure. All numbers are deterministic aggregations of judged data — no LLM. **Lane data tracks (📊, toggleable)**: three tracks under each lane band sharing the maze's time axis (zoom/pan/idle-folding/playback all linked) — tool-call density (colored by category), token pulse (stacked cached-input / uncached-input / reasoning / visible-output per step; verified on real logs that `usage.inputTokens` is the cache-miss share and `cacheReadTokens` the hit share), and context pressure (line+area; with a known model window it shows percentage plus 70%/90% thresholds, compaction appears as sawtooth drops). The window table lives in `verdict.js` `CONTEXT_WINDOWS` (DeepSeek V4 = 1M per the official release); when the observed peak exceeds the table value the table is treated as stale and the track falls back to absolute tokens — never a >100% reading. **Agent graph (🕸, a UI option)**: a star overview of the main agent and its subagents — node size = tokens consumed, edge width = tool-call count, running subagents dashed; click a node to jump to its span on the timeline. The button appears only when subagent data exists._

**请求级失败可见化 + 对比扩到 5 个文件（同任务智能识别）。**

- **请求级失败画进迷宫**（实时 + 上传两条链路同口径）：模型没吐出任何内容就失败的请求，此前在图上是纯空白——实测有会话前 2 分 40 秒全在失败重试，图上却像"什么都没发生"。现在 `llm/retry`（失败后安排重试）画成红色支路条，条长 = 退避等待窗口，图标 ↻、标签 ↻N，判定依据带失败原因 / 第几次重试 / 退避时长；`turn/end` 的 `error`（终局失败，无再重试）画成红色 ✗ 点标记。两类标记计入支路统计，退避窗口按活动时间参与空闲折叠判断（不再被折叠掩埋）。全程失败、一步未成的会话也照画。
- **对比扩到最多 5 个 session log**（原 1~2）：五套泳道配色（明暗主题各一套），图例、泳道带、统计卡、文件上限、`?load1..load5` 直载全部跟进。
- **同任务智能识别**：按各文件首条用户消息是否一致判定「是不是同一个任务的多次跑」。同任务 → 对比件全量泛化到 N 泳道：轮次对齐线连成跨泳道链（双泳道保留原有差额标注，N 泳道标注各自本轮耗时）、手动锚点可钉任意两条泳道、支路盘点扩成 N 列（差额列仅双泳道显示）；任务不同 → 仅同轴并排，对比件停用。识别结果在图例明示（⛓ 同一任务 ×N / ≠ 任务不同），不默默切换。

_EN: Request-level failures become visible (live + upload, one contract): a request that dies before producing any content used to render as pure blank — a real session spent its first 2m40s failing and retrying while the maze showed "nothing". `llm/retry` now draws as a red detour bar (length = backoff window, ↻ icon, rationale carries cause / attempt / delay); a `turn/end` error (terminal, no more retries) draws as a red ✗ point marker. Backoff windows count as activity for idle folding. Compare now takes up to 5 session logs (was 1–2) with five lane palettes in both themes. Same-task detection (identical first user message) gates the compare kit: same task generalizes it to N lanes (turn alignment as a cross-lane chain, anchors between any two lanes, N-column detour inventory with a delta column at 2 lanes); different tasks render side-by-side only — the verdict is shown in the legend, never silent._

## v0.6.2 — 2026-08-25

**适配 DSH Desktop 桌面端**（issue #4，感谢 @devyujie 反馈）。

- **暗色主题切 tab 闪白**：iframe 层背景硬编码浅色、srcDoc 页面首帧按默认浅色变量绘制，暗色要等 onLoad 后 postMessage 才翻转——切 tab 重挂载 iframe 时闪一帧白。三层修掉：iframe / 面板底色跟随宿主暗色标记（`body[data-ds-dark-theme]`）；srcDoc 挂载时预置 `data-theme="dark"` 让首帧即暗色；页面自初始化优先尊重预置属性（否则「宿主暗 + 系统浅」会在解析完成时翻回浅色）。
- **Trace 对比面板关闭按钮与窗口按钮重叠**：DSH Desktop（Electron）用 titleBarOverlay，原生「最小化 / 最大化 / 关闭」悬浮在页面右上角，正压在面板的 ✕ 上。✕ 的位置加 `env(titlebar-area-*)` 偏移——桌面端自动下移让出窗口按钮区，浏览器里这些变量不存在、走 0px 兜底位置不变。✕ 同时补上暗色配色（此前暗色下仍是白底）。

_EN: DSH Desktop adaptation (issue #4, thanks @devyujie). Dark-theme tab-switch white flash: the iframe layer's background was hardcoded light and the srcDoc page painted its first frame with default light variables (dark only arrived via postMessage after onLoad), so every iframe remount flashed white. Fixed at three layers — iframe/surface backgrounds follow the host's dark attribute, the srcDoc gets `data-theme="dark"` pre-injected at mount so the first frame is already dark, and the page's self-init respects the pre-injected attribute. Close-button overlap: DSH Desktop (Electron) uses titleBarOverlay, floating native window controls over the top-right corner right where the surface's ✕ sits; the ✕ now offsets by `env(titlebar-area-*)` (0px fallback keeps browsers unchanged) and gains proper dark-theme styling._

## v0.6.1 — 2026-08-23

修一处悬停卡残留，并换上 v0.6.0 新界面录制的全套演示动图。

- **全量重建时收掉悬停卡**：钉锚点的第二次点击、缩放、过滤等都会触发迷宫全量重建，重建把悬停中的节点直接移出 DOM，`mouseleave` 永远不会到达——悬停卡就卡在画面上，直到下次悬停才被顶掉。重建前统一收起。
- 文档：README 换上新录的演示动图（对比：同一任务 Flash vs Pro；实时迷宫：真实会话页签内重播 + 跳回聊天；新增长会话可读性一节）。

_EN: Fixes a stuck tooltip — anchor-pinning, zooming, and filtering all trigger a full maze rebuild that removes the hovered node from the DOM, so `mouseleave` never fires and the hover card stayed on screen until the next hover. The rebuild now dismisses it. Docs: README ships freshly recorded demos on the v0.6.0 UI (compare: same task on Flash vs Pro; live maze: replay inside a real session tab with jump-back-to-chat; plus a new long-session legibility section)._

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
