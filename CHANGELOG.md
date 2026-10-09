# 更新日志

本仓库的版本历史。英文摘要附在每个条目末尾。

## 2.5.0 — 诊断层六项全落地（2026-10-09）

本版把「执行迷宫」从「画路径」补成「给证据」：六项诊断各自独立成块，全部由确定性规则从日志算出；
只有最后一项（模型解读）会调模型，且调用前必须你确认。测试从 158 增至 210。

六项一览：① 结果与证据（六格 + 综合徽标，全部来自日志证据）② 失败恢复链与行为信号（阈值按本机会话校准）③ 压缩真事件（⌄ 与裁剪刻线对上信号块数字）④ 上下文构成（六段字符估算，不换算 token）⑤ 对比变量表（受控/疑似受控/探索性三档判定）⑥ 优化建议（十类模板，55% 的会话一条不给）。

**诊断层第 8 项：模型解读 + 对比 Judge——插件从「只算不评」变成「先给证据、再按你确认发一次模型」。**

- **单场解读**：分析区最末新增「模型解读」块，`让模型点评这场`把本场确定性结果（摘要、结果与证据、行为信号、上下文构成、失败调用摘录 ≤12 条）拼成提示词，**先整段给你看，你点发送才走**。回答显示在独立块里，带「模型意见」标识与免责行；不参与任何统计、不进缓存，换数据即清空。
- **对比 Judge**：同任务对比时多一个`让模型按四维打分`（正确性/完整性/指令遵循/证据充分性，0~10）。提示词里给各次的确定性数字与**最终回答原文**（解析层新保留 `lane.answer`，截 1200 字）；要求严格 JSON，页面宽松解析——模型不按协议输出就原样展示文本，绝不假装有分数。
- **宿主半只多一个路由**：`POST /api/maze.review`。路由按你日志里的 provider/model 解析（缺则退到宿主默认模型，两者都没有就明确 409，不猜）；`ctx.llm.stream` 一次、温度 0；**密钥不经过插件**（宿主 provider 适配器自己解析凭据）。收流口径照官方 experimental-auto-review：收尾后还有数据、非 stop 收尾、空回答一律判失败并说明原因。
- **验收（真机真调用）**：独立 0.2.0-rc.2 宿主 + 本机凭据（验完即删），上传真实 23 步会话 → 预览 302 字（就是本场数字）→ 发送 → 34 秒后拿到回答，标识「模型意见」、路由 `deepseek-official / deepseek-flash`，回答引用的正是我们算出的数字（119 条技能目录 0 加载、工具返回 91,648 字符 vs 模型输出 1,199）。对比 Judge：提示词 489 字含四维与最终回答原文，模型按协议返回，页面渲染成评分表。两次实测均零控制台报错。
- 测试 199 → 210 全绿（新增 8 个：路由解析三态、收流四种失败、客户端错误映射、空回答、Judge JSON 宽松解析三例）。

_EN: Diagnosis item 8 — **model review and comparison judge**: the plugin goes from "measures only" to "shows the evidence, then sends one model call you approved". The single-run review builds a prompt from this run's deterministic results (summary, outcome evidence, behaviour signals, context composition, up to 12 failure excerpts) and shows the whole thing before sending; the reply lives in its own block with a *model opinion* badge and a disclaimer, counts in no statistic and is cleared when the data changes. In a same-task comparison a second button asks the model to score correctness / completeness / instruction-following / evidence (0–10) under a strict JSON contract, with each run's numbers and its final answer text (the parser now keeps `lane.answer`, truncated to 1 200 characters); if the contract is ignored the raw text is shown and no scores are invented. One host route is added, `POST /api/maze.review`: it resolves the route from the model recorded in your log (falling back to the host default, and answering 409 rather than guessing when neither exists), calls `ctx.llm.stream` once at temperature 0, and **credentials never pass through the plugin**. Stream reading follows the host's own experimental-auto-review rules — data after the finish, a non-stop finish, or an empty reply are all failures with a stated reason. Verified with a real call on a standalone 0.2.0-rc.2 host (local credentials copied in, deleted right after): a real 23-step session produced a 302-character preview, the reply arrived in 34 s tagged `deepseek-official / deepseek-flash` and cited exactly the numbers we computed (119-entry skill catalog with 0 loaded, 91 648 characters of tool output against 1 199 characters of model output); the judge's 489-character prompt carried the four dimensions and the final answers, and its JSON reply rendered as a score table. Zero console errors in both runs. 199 → 210 tests green._

**诊断层第 7 项：本机会话库——迷宫页左上角「本机会话」直接列本机会话，勾 2~5 场即对比，不用先导出再上传。同时插件首次有了宿主半（性质变化，见下）。**

- **为什么需要宿主半**：客户端能列会话、能 retain，但宿主对一场会话的可读消息有分页上限，长会话不保证一次给全；完整日志只有进程内可取——宿主的 `sessionQuery.readSession()` 已经正确读多帧 `.jsonl.zstd`（Node 自带的 `zstdDecompressSync` 只解第一帧且**静默截断**）。所以宿主半注册两个**只读**路由：`GET /api/maze.sessions`（`listSessions()` → id/cwd/createdAt/live，新到旧，默认只列顶层会话）与 `GET /api/maze.log?sessionId=…`（完整逻辑日志，NDJSON；id 必须来自宿主自己的列表，无路径输入）。
- **两条链路不分叉**：取回的日志走与手动上传**完全相同**的入口（`loaded → apply → buildData`）。实测同一场会话：端点 740 个逻辑事件（对应原始 8966 行）解析出 **120 步 / 140 次工具 / 133,019 输出 tok / 3015 秒**，与上传原始文件**逐项相同**。
- **容错**：多份日志里有的没有有效步骤（空会话、刚开的会话）时，跳过那一份、其余照画，并在错误条里点名跳过了谁；全都不可解析才报错复位。
- **安全边界（性质变化）**：宿主半的代码在宿主进程内运行（官方口径：工作区沙箱之外）。约束：两个路由只读、同源、按 id 取数、不接触凭据、不写文件；超过 96 MB 的日志明确 413。README 新增「安全边界」一节，不想要宿主半的可在 `cordis.patch.yml` 里禁掉该行，客户端半照常。
- 实现细节与踩坑（都写进了注释）：cordis 服务必须用 `ctx.get(name)` 取——`Reflect.get` 拿不到，会与「宿主没装该服务」混淆；`sessionQuery` 的方法是 `readSession` 不是 `load`。
- 验收：typecheck 零错误；189 → 199 测试全绿（新增 7 个宿主路由用例 + 6 个客户端半/容错用例）；独立 `0.2.0-rc.2` 宿主上端到端实测——面板列出 3 场会话、勾两场后端点两个 200、空会话被点名跳过、剩余场次画出 120 步迷宫，零控制台报错。

_EN: Diagnosis item 7 — a **local session library**: the maze page's top-left panel lists this machine's sessions and compares 2–5 of them without a manual export. The plugin also gains a host half for the first time (a property change, below). A host half is needed because a retained cold session only yields a bounded page of history, while the complete log is only reachable in-process — `sessionQuery.readSession()` already reads multi-frame `.jsonl.zstd` correctly, whereas Node's own decompressor silently returns the first frame. The host half therefore registers two **read-only** routes: `GET /api/maze.sessions` (listSessions → id/cwd/createdAt/live, newest first, top-level only by default) and `GET /api/maze.log?sessionId=…` (the complete logical log as NDJSON; ids must come from the Host's own list, so there is no path input). Fetched logs enter exactly the same path as a manual upload, and measured on one session: 740 logical events (from 8 966 raw lines) parse to **120 steps / 140 tool calls / 133 019 output tokens / 3 015 s**, item-for-item identical to uploading the raw file. Logs with no parsable steps are skipped and named in the error bar instead of failing the comparison. **Security boundary**: host code runs in-process, outside the workspace sandbox; both routes are read-only, same-origin, id-scoped, touch no credentials and write no files, and refuse logs over 96 MB with a 413 — the README states this and shows how to disable the host row, leaving the browser half working. Implementation notes: cordis services must be read with `ctx.get(name)` (`Reflect.get` cannot see them and confuses "not installed" with "not injected"), and `sessionQuery` exposes `readSession`, not `load`. 189 → 199 tests green, plus an end-to-end run on a standalone `0.2.0-rc.2` host: three sessions listed, two fetched with 200s, the empty one skipped by name, the rest drawn as a 120-step maze, zero console errors._

**诊断层第 6 项：分析区末尾新增「优化建议」——每条都引用本场实测数字、涉及调用可点击定位；模板与阈值先按本机 240 场会话跑出真实分布再定。**

- 十类模板（括号里是本机 240 场的命中率，都落在尾部）：失败后没换策略（未恢复失败链 ≥3，2.5%）、失败后原样重试（16.7%）、疑似卡在循环（13.8%）、改了文件但没验证（12.1%）、上下文接近窗口上限（峰值 ≥70%，5.0%）、本场发生上下文压缩（4.2%）、工具返回占上下文偏高（≥95% 且调用 ≥10，15.4%）、同轮重复调用（18.3%）、待办清单陈旧（10.0%）、技能目录 ≥50 条且一条没加载（1.7%）。最多给 5 条，按行动价值排序（未恢复的失败排最前）。
- **建议条数分布（实测）**：0 条 55.4%、1 条 18.8%、2 条 11.7%、3 条 4.6%、4 条 5.4%、5 条 4.2%——超过一半的会话一条都不给，块里明说「没有触发任何建议模板」，不做无话找话。
- 全部由确定性规则算出，不调用模型；常量在 `verdict.js` 的 `SUGGESTION_RULES`，README 中英各补一节说明模板与阈值。
- 验收：typecheck 零错误；177 → 182 测试全绿（新增 5 个：未恢复失败、技能目录、工具返回占比两种边界、空态、上限与去重）；真实日志实测——119 条目录的会话给出「技能目录有 119 条（约 17k 字符」，另一份 574 步会话给出 3 条（循环 9 步 / 写了 1 个文件未验证 / 压缩 6 次裁剪 15 次），点击后选中该行并淡化其他节点（淡化元素 0 → 7），零控制台报错。

_EN: Diagnosis item 6 — the analysis area ends with **Suggestions**: each row cites numbers measured in that session, and rows with calls involved are clickable to locate them; the templates and thresholds were fixed only after measuring the real distribution over 240 local sessions. Ten templates (hit rate in brackets): failure not followed by a new approach (≥3 unrecovered chains, 2.5%), identical retry after failure (16.7%), looks stuck in a loop (13.8%), files changed without verification (12.1%), context near the ceiling (peak ≥70%, 5.0%), context compacted (4.2%), tool results dominating (≥95% with ≥10 calls, 15.4%), same-turn repeats (18.3%), stale todo list (10.0%), skill catalog ≥50 with none loaded (1.7%). At most five, ordered by actionability. Measured distribution: 0 suggestions 55.4%, 1 18.8%, 2 11.7%, 3 4.6%, 4 5.4%, 5 4.2% — the majority get none and the block says so. All deterministic, no model call; constants in `SUGGESTION_RULES`, documented in both READMEs. 177 → 182 tests green, plus live verification: a 119-entry catalog session reports it with the character estimate, a 574-step session yields three suggestions whose click selects the row and dims the rest (dimmed elements 0 → 7), zero console errors._

**诊断层第 5 项：同任务对比先列「对比变量表」，并给出「受控 / 疑似受控 / 探索性」判定——只有除模型外全部相同（且都有记录）时，才算受控对比、差额才可以归因于模型。**

- 变量十项：提供方、推理强度、Agent 预设、权限预设、沙箱模式、审批策略、指令文件（按「路径:摘要」指纹比）、技能目录（名字+描述长度指纹）、工作目录、模型。前九项任一不同 → 探索性并点名；日志没记录的项**不算相同**，全部相同但有未记录项时标「疑似受控」。
- 口径：全部来自日志元数据（`session` / `agent-preset/selected` / `permission/preset` / `sandbox/mode` / `approval/policy` / `request/header.config` / `user/message` 的指令与技能目录来源），缺失留空；判定逻辑在 `verdict.js`（`comparisonVariables` / `controlledVerdict`），两条链路共用。
- 验收：合成日志对（只换模型）显示「受控对比：除模型外全部相同（模型：deepseek-flash vs deepseek-v4-pro）」；换 `agentPreset` 的对显示「探索性对比：除模型外还有 1 项不同（Agent 预设）」。新增 6 个单元测试（四种判定分支 + 元数据解析两例），171 → 177 全绿。

_EN: Diagnosis item 5 — same-task comparisons now open with a **comparison variable table** and a controlled / probably-controlled / exploratory verdict: only when everything except the model matches (and every variable is actually recorded) may the difference be attributed to the model. The ten variables are provider, reasoning effort, agent preset, permission preset, sandbox, approval policy, instruction files (fingerprinted by path:digest), skill catalog (name + description-length fingerprint), working directory and model; any mismatch among the first nine makes it exploratory and is named, and variables missing from the log never count as "same" (they yield "probably controlled"). All values come from log metadata; the logic lives in `verdict.js` (`comparisonVariables` / `controlledVerdict`), shared by both render paths. Verified with two synthetic pairs: the model-only pair reports a controlled comparison naming both models, the agentPreset pair reports an exploratory comparison naming the agent preset. 6 new unit tests, 171 → 177._

**诊断层第 4 项：分析区新增「上下文里装了什么」——系统提示、技能目录、插件注入、工具返回、用户消息、模型输出按字符数估算画堆叠条，并列「技能目录 N 个、本场加载 M 个」。**

- 口径（一律标注是**字符估算，不是 token 真值**）：系统提示取 `request/header.header.system` 最长的一份；技能目录取 catalog 条目 name+description；插件注入按来源名分组（日志格式 v4 的 `plugin:<名>` 与旧格式都认）；工具返回、用户消息、模型输出按日志原文长度累计；指令文件只有路径与摘要，只报文件数并注明「正文大小未记录」。技能加载 = `skill` 工具调用参数里的名字（去重）。
- 没有可估数据的日志该块不画；实时页签只统计已加载窗口内的部分（块里注明，且工具返回是截断文本，属于下界）。
- 验收：同一份 500 行真实日志，块里的六段字符数与独立脚本核算逐项一致（系统提示 6,331 / 技能目录 17,367 / 插件注入 855 / 工具返回 91,648 / 用户消息 73 / 模型输出 1,199，指令文件 2 个、技能目录 119 个、本场加载 0 个），零控制台报错；新增 1 个解析单元测试，170 → 171 全绿。

_EN: Diagnosis item 4 — the analysis area gains a **"What the context carried"** block: system prompt, skill catalog, plugin injections, tool results, user messages and model output, estimated by character count in one stacked bar, plus "catalog holds N, M loaded this session". Every number is labelled a character estimate, never a token count; instruction files only report a file count (the log records paths and digests, not sizes). Logs with nothing to measure skip the block; the live tab counts only its loaded window and says so (tool results there are truncated lower bounds). Verified on a 500-line real log: all six segments match an independent script exactly (6,331 / 17,367 / 855 / 91,648 / 73 / 1,199; 2 instruction files, 119 catalog entries, 0 loaded), zero console errors; 1 new parse unit test, 170 → 171._

**诊断层第 3 项：上下文压力轨道的压缩标注改读日志真事件——`compaction/start` 标「⌄−N%」（悬停看压缩前后占用），`compaction/prune` 画细刻线（工具结果被裁剪）；没有真事件的旧日志退回「相邻请求骤降 ≥20%」的推断，图例与悬停都写明是推断。**

- 解析层记下每一次 `compaction/prune` 的时刻（原先只有次数），压缩事件时刻跟着轴映射一起走（折叠/步序两种视图都落位正确，切视图不漂移）。
- 口径与信号块对账：轨道上的 ⌄ 数量 = 行为信号「压缩发生」的次数、刻线数 = prune 次数；实测一份 574 步的真实日志：6 个 ⌄ / 15 条刻线，与信号块「压缩 6 次，裁剪 15 次」逐项一致，悬停显示「583,479 → 537,136 tok（−8%）」。
- 新增 2 个单元测试（`compaction/prune` 时刻解析、压缩时刻随步序列映射与还原），168 → 170 全绿。

_EN: Diagnosis item 3 — the context-pressure track now marks the log's real compaction events: `compaction/start` renders as `⌄−N%` (hover shows before/after occupancy) and `compaction/prune` as thin ticks (tool results trimmed); logs without events fall back to the ≥20% consecutive-request inference, labelled as inference both in the legend and on hover. The parser now records every prune timestamp, and compaction marks follow the axis mapping in both views. Verified against a real 574-step log: 6 ⌄ marks and 15 ticks, matching the behavior-signal block's "6 compactions, 15 prunes", with hover showing 583,479 → 537,136 tok (−8%). 2 new unit tests, 168 → 170._

**issue #9：横轴新增「步序视图」——每一步一列等宽、与墙钟解耦；耗时与时刻的显示仍走墙钟真值。**

- **背景**（issue #9，2026-09-01 提）：横轴原本只有墙钟时间（长等待折成细缝）。但「一分钟里跑二十步」的密集会话看不出到底多少步、逐步对账要来回找；等待段即使折成细缝，工作流在长会话里仍被压成一条窄带。
- **做法**：工具条加 `🕒 时间轴` / `#️⃣ 步序` 开关。步序视图把每一步压成一列等宽（列宽不代表耗时），步内工具的先后与相对位置保留；对比模式下同一列就是各泳道的同一步，逐步对账直接对齐。列头悬停给出该步的真实起止与耗时。
- **实现**：新增 `src/client/axis-map.js`（纯函数，构建期按 `/*__AXIS__*/` 占位符内联进页面，`tests/axis-map.test.ts` 直接 import 同一份源码）。两种视图都先把原始时间备份到 `s0`/`e0` 再从原始坐标映射，来回切换不累积误差；所有耗时/时刻显示（提示面板、对齐线、锚点 Δ、恢复链、活动时长）改读 `s0`/`e0`，坐标反查只留给播放时钟。
- **已知取舍**：步序视图下实时页签的「每秒生长」不生效（列坐标按秒推进没有意义），结构变化时整图重画；时间视图不受影响。
- 新增 10 个单元测试（等宽列、列内工具按比例压缩、多泳道同一步同列、来回切换坐标不漂移、列内插值与列间距反查、空泳道与单步会话、折叠视图反查四情形），158 → 168 全绿。实机在 `0.2.0-rc.2` 宿主上用两份真实日志验证（63 秒 23 步的密集会话、8 月的长会话）：步序列 12–13px 等间距、轴标签 `S1…Sn`、图例与按钮随视图切换、来回切换零控制台报错。

_EN: Issue #9 — the axis gains a **step view**: one equal-width column per step, decoupled from wall-clock time, while every duration and timestamp shown stays wall-clock. A toolbar toggle (`🕒 Time axis` / `#️⃣ Steps`) switches between the existing idle-folded time axis and the new step axis; inside a step, tool order and relative position are preserved, and in comparison mode the same column is the same step of every lane. The mapping lives in a new pure module (`src/client/axis-map.js`, inlined into the page at build time and imported directly by its tests); both views remap from originals backed up as `s0`/`e0`, so switching back and forth never drifts, and all duration/timestamp displays read those originals instead of inverting axis coordinates (the inverse is kept for the playback clock only). Known trade-off: the live tab's per-second growth is skipped in step view (advancing column coordinates by seconds is meaningless) — the maze redraws when structure changes; the time axis is unaffected. 10 new unit tests, 158 → 168, all green, plus live verification on a `0.2.0-rc.2` host with two real logs (a 63-second/23-step session and a long August session): equal 12–13 px columns, `S1…Sn` axis labels, legend and button following the mode, zero console errors on switching._

## v2.4.0 — 2026-10-05

**子代理支路在新宿主上改由插件自己持有（`0.1.6-alpha.2` 起）；运行中的步骤与支路每秒生长；上下文窗口优先用宿主真值；并修掉 2.3.0 冒烟与评审查出的几处小问题。另外补上了桌面版装不上的两个包侧问题：GitHub 安装不再装出空壳，peer 范围放开到 `0.2.x`。**

- **子代理支路（吴昊 2026-10-01 拍板）**：宿主 `0.1.6-alpha.2` 起子会话只在被持有时可读，2.3.0 只能跟着右侧栏画。本版在有 `sessions.retain` 的宿主上由插件用自己的来源名 `maze` 持有子会话——成员来自父会话的子代理目录投影 `subagentCatalog`，不再看右侧栏；迷宫打开之前就结束的子代理也画完整支路。规则：运行中的子代理一直持有到结束；已结束的读一次就释放，结果按子会话缓存，页签切回不重拉——结算要等它的最后一轮在对话里关闭（宿主先翻运行标记、事件随后才到，只看标记会缓存成残缺版），最多等 3 秒；同时最多展开 8 个，超出的在泳道信息行注明「另有 N 个子代理未展开」；页签切走或切会话时全部释放。持有不会切换当前会话（宿主判定当前会话只看它自己的 `mainView` 计数）。宿主在持有/释放时会同步通知会话列表，花名册先占名额再向宿主持有、嵌套通知延后处理，不会重入。宿主拒绝打开的子会话（持有抛错、打开失败、目录条目没有模式）让出名额，目录变化前不重试（不在运行时被拒的，翻回运行后再试一次）。超过宿主一页（500 条消息）的子会话只画首页。子代理流式输出的对话切面按 250 毫秒合并一次发布。没有 `retain` 的老宿主（`0.1.5` / `0.1.2`）保持 2.3.0 的被动跟随：只画宿主已打开过的子会话。孙代理不画。
- **支路名字**：改用子代理目录里的名字（派出时的任务简述，宿主下拉菜单显示的那个），不再用会话标题——`0.1.5` 上没有标题的子会话原来会显示成工作区目录名。
- **运行中实时生长**：实时页签加一秒时钟，只在父会话或某个子代理运行中、且页签可见时走；运行中的子代理支路终点取「现在」（宿主自己的子代理菜单也这么算），不再停在上一个持久事件（2.3.0 实测卡在 0.7 秒、结束才一下跳到全长）。页面侧：结构没变、只是时钟走了一秒时，不整页重画——按原始时间的增量延长运行中的节点，只重画迷宫 SVG（与缩放同一条路径），图例、头部指标条、分析区都不动；时间轴预留余量（30 秒或 8% 取大），余量用完就扩大时间轴再留一段，仍走同一条只重画迷宫的路径；头部的总时长跟着刷新；运行中子代理里某个工具跑完（判定变色）算结构变化，照常整图重画。
- **上下文窗口**：实时页签改读宿主 token-meter 的 `contextPressure.contextWindow`（宿主上下文指示器同一来源，`0.1.0-rc.8` 起字段不变）作为泳道窗口和当前模型请求的窗口；宿主不留逐请求历史，中途换掉的旧模型仍按模型表；没装 token-meter 时退回查表。
- **头部指标条**：「N 次调用」只算父会话自己的，子代理支路里的调用另注「子代理另有 M 次」，与工具轨道的总数对得上（2.3.0 冒烟：头部写 1 次、轨道写共 2 次）。
- **小修（2.3.0 冒烟与评审查出，均为旧问题）**：结果与证据——同一轮里失败步与回答落在同一个 0.1 秒刻度时按步序裁决，不再误判「没有最终回答」；上传页第一次上传就解析失败不再多抛一条控制台报错；选中行为信号时顺带打开的详情面板按一次 Esc 同时关面板、撤选中；侧边栏入口改用宿主侧边栏同一套颜色变量，深色主题下对比度从 2.2:1 恢复到与宿主条目一致；实时迷宫的子代理花名册改在 effect 里创建、卸载时释放，被丢弃的渲染不再留下不释放的实例。
- **构建基座与测试**：devDependencies 换到 npm 的 `0.2.0-rc.2` 包组（宿主 `latest`），产物依赖不变；类型检查另在 `0.1.2-rc.1`、`0.1.5-rc.3` 两套包上跑过，均为零错误。新增 22 个单元测试（持有式花名册：宿主在 retain 内同步通知列表时不重入不泄漏、dispose 早于 ready、末轮未关闭时的结算与宽限、重跑后宽限重新计时、上限、打开失败与 ready 异常让出名额、持有抛错不重试但翻回运行后再试一次、无模式不持有、可续聊子代理重跑时沿用缓存、首次订阅同步回调后监听器仍被摘掉、流式切面合并发布、不变不通知、目录命名；未展开计数、时钟生长、宿主窗口、同刻度裁决），136 → 158，全部通过。
- **包侧：桌面版装不上的两个原因（2026-10-05）**：
  - **GitHub 安装装出空壳（真正的原因）**：DSH 插件管理器安装 git 依赖时按 `package.json` 的 `files` 白名单打包，而 `lib/` 一直被 `.gitignore` 忽略、又从没进过仓库，于是装出来的包里只有 README、LICENSE、`package.json`、`cordis.patch.yml`，入口 `lib/index.js` 根本不存在，插件加载必然失败（侧边栏入口消失、设置里也看不到）。现在 `lib/` 纳入版本控制，两条安装路径（npm / `github:lamost423/dsh-maze`）都能拿到构建产物；改源码后必须 `pnpm build` 一起提交。
  - **peer 范围放不到 `0.2.x` 正式版**：宿主运行时会把插件 `peerDependencies` 里的 `@deepseek-ai/dsh*` 逐条对宿主版本做区间校验，不满足就把这一行禁用掉。旧范围 `<0.2.0` 靠 semver 的「预发布版低于正式版」规则侥幸放过了 `0.2.0-rc.2`，但对 `0.2.0` 正式版和 `0.2.1-alpha.1` 都是 false——桌面版的 nightly 通道一旦升到正式版，插件会被静默禁用。范围改为 `>=0.1.2-alpha.1 <0.3.0`。
  - **桌面版 profile 的实机验证**：`0.2.0-rc.2` 桌面版（`~/.dsh/profiles/desktop`）里装上本版后，客户端插件 `dsh-maze` 正常注册、侧边栏入口与实时迷宫恢复。

_EN: Subagent branches on new hosts are now held by the plugin itself (from `0.1.6-alpha.2`): with `sessions.retain` present the maze holds each child under its own reference source `maze` — membership comes from the parent's `subagentCatalog` projection instead of the right sidebar, children that finished before the maze opened are drawn in full, running children stay held until they settle, settled ones are read once, released and cached, at most 8 are expanded at once (the rest are noted on the lane), everything is released when the tab or Session changes, and holding never changes the selected Session. A settled child is cached only once its last turn is closed in the conversation (the host flips the running flag before the last events arrive; a 3 s grace bounds the wait). The host notifies the session list synchronously inside retain/release, so the roster claims a slot before calling the host and defers nested notifications. Children the host refuses (retain throws, open fails, no mode) free their slot and are not retried until the catalog changes; children longer than the host's first page (500 messages) draw that page only; streaming child cuts are coalesced to one publish per 250 ms. Hosts without `retain` (`0.1.5` / `0.1.2`) keep 2.3.0's passive behaviour. Branch names now use the catalog label (the task description given at spawn time). A one-second clock runs only while the parent or a child is running and the tab is visible: a running branch ends at "now" instead of its last durable event, and on the page a tick that changes nothing structural only extends the running nodes and rebuilds the maze SVG (the zoom path) — legend, header strip and analysis stay put, with axis headroom (30 s or 8%); when it runs out the axis grows (with new headroom) on the same maze-only path, the header strip's total duration follows, and a tool settling inside a running child counts as structural and redraws normally. The live tab reads the host's `contextPressure.contextWindow` (the same source as the host's context indicator) as the lane window and the window of the current model's requests; models switched away from keep the table. The header strip counts the parent's own calls and notes calls made inside subagents separately, matching the tool track. Small fixes found by the 2.3.0 smoke and review: tie-break by step order when a failed step and the answer share a 0.1 s tick; no stray console error when the first upload fails to parse; one Esc clears a signal-opened detail panel together with the selection; the sidebar entry uses the host sidebar's own color tokens (dark-theme contrast back to the host's level); the subagent roster is built in an effect and disposed on unmount. Build base moves to the npm `0.2.0-rc.2` set. 22 new unit tests, 136 → 158, all green. Packaging fixes for the desktop app (2026-10-05): `lib/` is now tracked in git, because DSH's plugin manager packages a git dependency through `package.json`'s `files` whitelist — with the build output gitignored, `dsh plugin add github:lamost423/dsh-maze` installed a shell with no `lib/index.js` and the plugin could not load at all (this was the real cause of "won't install on the desktop app"); the `@deepseek-ai/dsh*` peer ranges move from `<0.2.0` to `<0.3.0`, since DSH's runtime denies any profile row whose plugin peers do not satisfy the running host version — the old range only passed `0.2.0-rc.2` by the prerelease rule and would have silently disabled the plugin on `0.2.0` / `0.2.1-alpha.1`. Verified in the `0.2.0-rc.2` desktop profile: the `dsh-maze` client plugin registers, the sidebar entry and the Live Maze are back._

## v2.3.0 — 2026-09-28

**适配宿主 0.1.6 / 0.1.7（npm 上宿主的 `latest` 现已到 `0.2.0-rc.2`，本版同样适用）：新宿主上侧边栏入口与实时迷宫恢复，切换会话时自动关闭上传面板也恢复。**

- **现象**：
  - 宿主 `0.1.7-alpha.1` 起：侧边栏的「执行迷宫」入口不显示（插件位置渲染时崩溃），「实时迷宫」页签整片空白（构造子代理花名册时抛 TypeError）。宿主给每个插件位置做了错误隔离，页面其余部分不受影响。
  - 宿主 `0.1.6-alpha.2` 起（不崩，但悄悄失效）：会话列表不再公开「当前会话」，子会话也要先被持有才能读取，所以 2.2.0 在这些宿主上切换会话时不再自动关闭上传面板，子代理支路也不画。`0.1.6-alpha.1` 及更早的宿主不受影响。
- **原因与改法**（全部是运行时探测，一份构建同时服务 `0.1.2` 到 `0.1.7`）：
  - 图标组改名（`0.1.7-alpha.1`，`IconBranchOutline16` → `IconBranchOutlineRegular`）：运行时先取旧名、再取新名；两个都没有时只画按钮、不画图标。
  - 子代理目录的 `setSubagentCatalogOpen` / `refreshSubagents` 被删除（`0.1.7-alpha.1`，目录改从父会话的投影读取）：改为宿主有才调用。
  - 会话列表去掉了 `current`（`0.1.6-alpha.2`）：判断「当前会话」改为先读 `current`，没有时取被主视图持有（`retainedBy.mainView`）的那一行——宿主自己的 ui-session 也按这个计数判定选中的会话。它用于切换会话时自动关闭上传面板。
  - 运行中的工具调用新增「准备」阶段（`0.1.7-rc.1`），此时还没有参数原文：按空字符串处理。
  - 请求上的 `provenance` 改名为 `providerMetadata`（`0.1.6-alpha.1`）：模型名按 `providerMetadata` → `provenance` → 请求配置的顺序取。请求配置只在该请求的请求头还在已加载窗口里时才有；长会话的请求头滚出窗口后，不读新字段就拿不到泳道模型名和逐请求的上下文窗口。
  - 子会话只在被持有时可绑定（`0.1.6-alpha.2`）：花名册跟着宿主的绑定换代——子会话被释放就移出，再次被持有就重新跟上，不再画一条停在最后一刻的支路（评审查出：右侧栏打开过的子代理关掉后，支路会冻结，还可能把仍在运行的子代理显示成已结束）。
- **顺带修正（实机冒烟查出，新宿主上才明显）**：
  - 模型表把宿主 `0.1.5` 起的默认模型 `deepseek-flash`（DeepSeek-V41-Flash）落进了「其他 deepseek = 128K」，宿主模型目录写的是 1M：实时页签的上下文占用会放大约 8 倍，「上下文峰值」信号在实际占用约 6% 时就会亮。补上这一行。
  - 日志格式 v4（宿主 `0.1.7` 起）拒收 `kind: 'plugin'` 的消息来源，旧来源在迁移时被改写成 `plugin:<插件名>`：「待办陈旧」原来只认旧写法，在新宿主上会一直是 0。现在新旧写法都认，实时页签与上传页共用 `verdict.js` 的 `isTodoReminderSource`。
- **已知限制**：从 `0.1.6-alpha.2` 起的宿主上，子代理支路只在别的界面（例如右侧栏）打开了该子代理时才画，关掉就随之消失；完整支持要按新接口重写花名册，留到下一版。不会报错。
- **构建基座**：devDependencies 换到 npm 的 `0.1.7-rc.2` 包组（cordis 4.0.4），`pnpm-workspace.yaml` 里针对 `0.1.2-rc.1` 的发布时间门禁豁免随之删除。类型检查另在 `0.1.2-rc.1`、`0.1.5-rc.3`、`0.2.0-rc.2` 三套包上跑过，均为零错误。新增 14 个单元测试（图标新旧名与都缺失、没有旧目录接口且子会话未被持有时的花名册、花名册跟随绑定换代、两代会话列表的当前会话、`providerMetadata` 优先、长会话只剩 `providerMetadata` 时的模型名与窗口、准备阶段参数为空、待办提醒的新旧来源写法；另在既有用例里补了 `deepseek-flash` 窗口与 v4 来源），针对新宿主的用例都确认在旧代码上会失败；并入行为信号后本版合计 136 个测试，全部通过。
- **实机验收**：全新的 `0.1.5-rc.3`、`0.1.7-rc.2`、`0.2.0-rc.2` 宿主各装本版安装包、用模拟模型跑会话：侧边栏入口、上传页、实时迷宫、分析区两块、设置开关、切换会话自动关闭上传页全部通过，插件相关的控制台报错为零，迷宫上的步数、调用数、Token 与宿主底栏一致；上传页读通了这些宿主写出的第 3 版、第 4 版会话日志。

_EN: Adapts to hosts 0.1.6 / 0.1.7 (npm's `latest` for the host has since moved on to `0.2.0-rc.2`, which this release covers too): the sidebar entry and the Live Maze tab work again on the new host, and so does auto-closing the upload panel on a Session switch. From `0.1.7-alpha.1`, the entry vanished (its slot crashed while rendering) and the Live Maze tab went blank (building the subagent roster threw a TypeError); the host isolates each plugin slot, so nothing else broke. From `0.1.6-alpha.2` things failed silently instead: the Session list stopped publishing the selected Session and child Sessions must be retained before they can be read, so on those hosts 2.2.0 no longer closed the upload panel on a Session switch and drew no subagent branches; hosts up to `0.1.6-alpha.1` were unaffected. All fixes are runtime feature detection, so one build serves `0.1.2` through `0.1.7`: the 16px icon set was renamed in `0.1.7-alpha.1` (`IconBranchOutline16` → `IconBranchOutlineRegular`) — read either, draw the bare button if neither exists; the subagent catalog calls `setSubagentCatalogOpen` / `refreshSubagents` were removed in `0.1.7-alpha.1` (the catalog now lives in the parent's projections) — call them only when present; the Session list lost `current` in `0.1.6-alpha.2` — read it when present, otherwise take the row the main view retains (`retainedBy.mainView`), the same count ui-session uses to decide the selected Session (this drives auto-closing the upload panel); running tool calls gained a "preparing" phase without raw arguments in `0.1.7-rc.1` — treat them as empty; request `provenance` was renamed `providerMetadata` in `0.1.6-alpha.1` — the model name now reads `providerMetadata`, then `provenance`, then the request config, because the request config only exists while that request's header is inside the loaded window, and without the new field a long session loses its lane model and per-request context windows once the headers scroll out. Child Sessions bind only while retained (`0.1.6-alpha.2`): the roster now follows the host's binding generation — a released child leaves, a re-retained one is followed again — instead of drawing a branch frozen on its last frame (found in review: a subagent opened in the right sidebar froze once the sidebar closed, and could show as finished while still running). Also fixed, found in live smoke and mostly visible on new hosts: the model table put `deepseek-flash` (DeepSeek-V41-Flash, the default model since host `0.1.5`) under the generic 128K deepseek row although the host catalog says 1M, inflating the live tab's context use about 8× and lighting the context-peak signal at roughly 6% real use — the row is added; and log format v4 (host `0.1.7`) refuses `kind: 'plugin'` sources and migrates old ones to `plugin:<name>`, so the stale-todo signal, which only knew the old shape, read 0 on new hosts — both shapes are recognized now, through `isTodoReminderSource` in `verdict.js` shared by the live tab and the upload page. Known limit: from `0.1.6-alpha.2` a subagent branch is drawn only while another view (e.g. the right sidebar) holds that child open and disappears when it closes; full support needs a roster rewrite against the new API in the next release; nothing errors. Build base: devDependencies move to npm's `0.1.7-rc.2` package set (cordis 4.0.4) and the release-age exemptions for `0.1.2-rc.1` are dropped; typecheck also passes against the `0.1.2-rc.1`, `0.1.5-rc.3` and `0.2.0-rc.2` sets. 14 new unit tests (icon old/new/missing, the roster without the legacy catalog calls and with unretained children, the roster following binding generations, current Session on both list shapes, `providerMetadata` first, a long session left with `providerMetadata` alone, empty arguments while preparing, both reminder source shapes; plus `deepseek-flash` and v4-source cases added to existing tests); the cases aimed at the new hosts were confirmed to fail on the old code; with behavior signals merged, 136 tests in total, all green. Live acceptance: fresh `0.1.5-rc.3`, `0.1.7-rc.2` and `0.2.0-rc.2` hosts, each with this release's package, driven through sessions by a mock model — sidebar entry, upload page, Live Maze, both analysis blocks, the settings switch and auto-closing the upload page on a Session switch all pass, with zero plugin console errors and steps, calls and tokens matching the host's own footer; the upload page reads the format v3 and v4 logs those hosts wrote._

**诊断层第 2 项：分析区新增「行为信号」块——12 种信号，阈值按本机 202 份会话校准；上下文占用改按每次请求当时的模型换算窗口。**

- **信号与阈值**（`ANALYSIS_RULES.SIGNALS`，与校准表逐条对应；「中」落在最差的 15%~20% 会话，「高」落在最差的 3%~5%。校准脚本在独立评审后修正了三处并于 2026-09-07 重跑，括号里是重跑后的命中占比，149 场有效）：失败后原样重试（中 ≥1，高 ≥3；15% / 4%）、同轮重复调用（排除 job_output/todo_write/list_agents/send_message 等轮询记账类，原样重试不算；低 ≥10% 且 ≥5 次，中 ≥15% 且 ≥8 次；原定「中」≥20% 且 ≥10 次重跑只命中 8%，低于目标区间，2026-09-24 放宽后按本机 184 场重跑为 29% / 14%；重复读取 ≥5 作子标签，26%）、循环（排除轮询类后长度 1~3 序列连续 3 次，长窗口先扫、已覆盖的下标不再数；占用 ≥9 步中，≥30 步高；16% / 4%）、工具失败（沿用迷宫判定——错误标志 + 输出失败特征，比只看错误标志宽；失败率 ≥8%（且本场调用 ≥10 次）或失败 ≥10 次中，失败率 ≥15% 且 ≥10 次高；19% / 3%。code 模式会话的失败率几乎为 0，整体占比被它拉低，普通模式单看是 23% / 3%，落在区间上沿）、慢调用（单次 ≥120 秒；≥1 低，≥3 中；14% / 3%）、工具集中度（≥20 次且赫芬达尔指数 ≥0.85，低；10%；code 模式外层全是 run_code 时不报）、上下文骤升（≥20 个百分点，只在同一窗口内比，中；1%）/ 骤降（信息，落在压缩事件附近标「压缩」；4%）、上下文峰值（50/70/90% → 低/中/高；11% / 5% / 0%）、压缩发生（`compaction/start` ≥1 信息，prune ≥10 另加一句；5%）、待办陈旧（todo-freshness-guard 提醒 ≥10 低，≥30 中；11% / 3%）、换策略恢复（信息，不设阈值；32%）。参数签名与校准脚本同规则：bash 取整条命令压空白，读写类取路径，grep/glob 这类带 pattern 的工具与 query 类工具取页面 argSummary 的形态（`pattern=… path=…`），截到 300 字，两条链路一致。
- **块**：失败恢复链旁；每条严重度徽标 + 一句话依据（含具体数字）+ 涉及调用数；点一条淡化其他节点（复用过滤淡化，与「只看失败/重试」等过滤同时生效）并缩放到该段第一个调用、打开详情，再点同一条或按 Esc 取消；选中按「泳道 + 信号类型」记，实时重渲染顺序变了高亮不漂移；没有信号时明说「本场没有触发任何信号」。方法说明写明阈值来源、各信号独立计数（循环与重复、原样重试与失败可能指向同一段调用）、失败口径比错误标志宽、签名截 300 字、code 模式本版只统计外层 run_code 调用（内部派发未展开，与校准集的 code 模式数字不可直接对照）。中英双语、明暗主题。
- **上下文占用按每次请求当时的模型换算窗口**（吴昊 2026-09-07 拍板）：上传链路按时间顺序读 `request/context`，每步的 usage 用它之前最近一条的 `contextWindow`（宿主真值优先，没有再查模型表；第一条之前的样本用第一条兜底）；实时链路按 Trajectory 请求的 (turn, step) 把逐请求模型的表值填到节点，只缺宿主报的窗口真值。上下文峰值 / 骤升 / 骤降信号、上下文压力轨道（纵轴改为占用百分比，标题标注中途切过的窗口与略过的样本）、摘要卡 03 与头部指标条统一用这一口径（`contextOccupancy`）。健全性守卫按窗口算：某窗口下有样本超过它（实测：中转站声称 262144 却跑了 595K 的请求），只作废该窗口下的样本、略过不画、比较链在它处断开，其余照常；全部作废才退回绝对 token。窗口切换处同样断开比较链：300K@1M（30%）切到 128K 模型跑 100K（78%）只是换了尺子，不报骤升，反过来不报骤降。
- **两条链路**：上传链路解析时记录 `compaction/*` 事件（start 时刻、prune/summary 次数）、todo-freshness-guard 提醒次数、`request/context` 的窗口、每次调用的 callId；实时链路用落地的 compaction 节点与 `context` 节点（插件来源鸭子判断）补同样的原料；只多几个小字段。
- **校准脚本的三处修正（发现于对照与评审）**：① 压缩会为被折叠的调用重新发一遍 `tool/result`，脚本按 callId 取最后一条，这些调用的「耗时」变成了「调用时刻到压缩时刻」（big2 里 12 条各约 31000 秒）——改为每个 callId 只取第一条，慢调用占比由 15% / 7% 修正为 14% / 3%；② 循环按长度 1/2/3 各扫一遍累加，9 次相同调用记成 24 步——改为去重，占比由 19% / 6% 变为 16% / 4%；③ 失败只看错误标志——改用 verdict.js 的 `toolVerdict`（第二轮复核发现首次改动没真正接上，接上后旧阈值「中」命中 38%、「高」5%，于是按目标区间把工具失败阈值重定为「失败率 ≥8% 或 ≥10 次」中、「失败率 ≥15% 且 ≥10 次」高，命中 19% / 3%——喂给 toolVerdict 的文本与页面一样先压空白；原样重试按同一口径变为 15% / 4%，换策略恢复 32%）；④ 上下文占比改成与页面同口径的逐请求窗口（超窗作废、作废处与窗口切换处断链），峰值 11% / 5% / 0%、骤升 1%、骤降 4%。同轮重复因签名规则统一由 37% / 16% 变为 30% / 8%。既有判定的一处误报顺带记录：输出里含「[status=Failed]」字样的 read / cat 调用会被判成失败（例如读一份转储的部署日志），本轮不改判定。
- 新增 21 个单元测试（每种信号触发与不触发、循环去重步数、签名两种形态、略过样本与窗口切换处断链、中途切窗口、实时链路逐请求窗口与压缩/提醒原料、页面解析段的首条窗口兜底），全部通过。

_EN: Diagnosis layer, item 2 — the analysis section gains a **Behavior signals** block: 12 signals with thresholds calibrated on 202 local sessions (constants in `ANALYSIS_RULES.SIGNALS`; the calibration script was corrected in three places after an independent review and re-run on 2026-09-07 — shares in the Chinese entry). Identical retry after failure, same-turn repeats (polling/bookkeeping tools excluded, identical retries not counted, repeated reads as a sub-tag), loops (a 1–3 call sequence repeated 3 times, longest window first, covered indices never counted twice), tool failures (the maze verdict — error flag plus failure signatures, wider than the flag alone), slow calls (≥120 s), tool concentration (Herfindahl ≥0.85 at ≥20 calls, skipped for code-mode outer `run_code`), context jumps/drops (≥20 points; a drop next to a compaction event is tagged), context peak (50/70/90%), compaction (with a prune note at ≥10), stale todo reminders, adaptive recovery. Argument signatures follow one rule on both render paths (`pattern=… path=…` for pattern tools, the query for query tools, cut at 300 chars). Each row shows severity, a numeric rationale and the calls involved; clicking dims everything else and locates the first call (selection keyed by lane + signal type; Esc or a second click clears; stacks with the other filters); with nothing fired the block says so. **Context use is now converted with the window of the model in use at each request**: uploaded logs read `request/context` in order (host value first, model table second, the first entry backfilling earlier samples), the live tab fills per-request table values from the Trajectory requests' (turn, step) and only lacks the host-reported value; the peak/jump/drop signals, the context-pressure track (now a percentage axis, caption noting window switches and skipped samples), summary card 03 and the header strip all share `contextOccupancy`. The sanity guard is per window: a sample exceeding the window its provider declared (a relay claiming 262 144 while serving 595 k tokens) voids only that window's samples, which are skipped and break the comparison chain; a window switch breaks the chain too (30% at 1M followed by 78% at 128K is a change of ruler, not a jump); everything voided falls back to absolute tokens. Calibration script fixes: results deduplicated per callId (compaction re-emits them; slow calls 15%/7% → 14%/3%), loops deduplicated (19%/6% → 16%/4%), failures via `toolVerdict` (the old thresholds then fired in 38%/5% of sessions, so tool-failure thresholds were reset to rate ≥8% or ≥10 failures / rate ≥15% and ≥10 failures → 19%/3% (normal mode alone 23%/3%: code-mode sessions almost never fail and pull the overall share down); identical retry 15%/4%, adaptive recovery 32%), context ratios on the same per-request windows as the page; same-turn repeats 37%/16% → 30%/8% with the unified signature; "medium" then sat below the target band, so it was relaxed on 2026-09-24 from ≥20% and ≥10 to ≥15% and ≥8 (29%/14% on a 184-session re-run). 21 new unit tests, all green._

## v2.2.0 — 2026-09-07

**诊断层第 1 项：分析区新增「结果与证据」块——不信 Agent 自述，用日志证据回答「做成没有、凭什么说做成」。**

- **六格 + 综合**：任务完成（最后一轮 `turn/end` 的原因不是 error/aborted/interrupted/blocked，且最后一步是回答；max-tokens 算结束但写明原因）、测试 / 构建 / Lint（对 bash 命令做**命令位置**正则识别——`cat vitest.config.ts`、`grep pytest`、heredoc 正文都不算；初版覆盖 JS/TS、Python、Rust、Go、Swift 与 make/ctest/docker build，npm/pnpm/yarn 的 `check` 脚本按测试计；一条命令命中多类分别记；通过 = 该调用没有错误标志且返回**末行**没有非零退出码；每个类别以最后一次运行的结果为准，此前别的命令最后一次失败的条数小字注明——「同一条命令」按命中的那段命令算（去掉 `cd` 前缀、重定向、`&& echo PASS` 装饰），不按整行 bash，真实日志里同一个测试脚本换着写法跑了十几次；`command -v pytest`、`pytest --version` 这类探测不算跑；后台任务（结果只有 `started background job bash-N`）按之后 `job_output` 末行的退出码计，取不到就不计并标注；点格定位到最后一次运行所在的那一步并打开该步详情）、产物（写入/编辑/补丁类调用成功触及的文件去重，格内展开路径列表）、人工确认（最终回答之后有没有真人消息，只给有无、不解读内容）。综合：任务没正常结束或某类验证最后一次失败 → 「部分成功」；一条验证命令都没有 → 中性灰的「未验证」并写明本场没跑测试/构建/Lint；其余「已完成」。中英双语、明暗主题同步。
- **退出码口径（真实日志核对）**：dsh 的 bash 工具只在非零退出时把 `[exit code: N]` 追加在末行，后台任务 `job_output` 的末行是 `[status: completed, exit code: N]`；退出码只认末行——正文里引用别的日志的 "exit code: 1"（实测案例：docker 构建输出被 `head` 出来，末行是 `[status=Failed]`）不算本次命令失败。退出码在压空白/截断**之前**从原文读出并随工具对象携带（新字段 `exit`），5000 字面板全文上限不变。
- **两条链路同口径**：上传链路解析时记录每轮收尾原因（`turnEnds`）与真人消息时刻（`userMsgs`，只认 `source.kind = user`，指令文件/插件注入/子代理回报不算）；实时链路从时间线的 `turn/end` 读原因，窗口里没有时退回 turn-error / turn-max-tokens / turn-tail 节点各自的说法，真人消息取 `user` / `steering` 节点；payload 只多几个小字段，并进重绘签名。
- **诚实边界**：code 模式会话（`run_code`）里脚本内部派发的真实命令暂不识别（解析层没展开 `tool/code-dispatch*`），块里如实标注；项目自定义的测试包装脚本（`deploy/x.sh test_y.py`）、循环变量里的测试文件（`for t in …; do sh $t`）、被 `| tail` / `|| true` 掩盖的退出码都识别不到，会显示「没有跑」或「通过」。
- 纯逻辑在 `verdict.js`（`detectValidationKinds` / `exitCodeOf` / `validationPassed` / `artifactPaths` / `outcomeEvidence`，规则常量在 `ANALYSIS_RULES`），新增 38 个单元测试（main 基线 63 → 101：含测试先失败后通过 / 只构建没测试 / 没有任何验证 / 一条命令命中多类 / 非零退出码、后台任务关联 job_output、探测命令排除、引号参数不碰撞、类别以最后一次运行为准，以及实时链路原料契约与节点退回），全部通过。

_EN: Diagnosis layer, item 1 — the analysis section gains an **Outcome & evidence** block that answers "did it get done, and what proves it" from log evidence instead of the agent's own claims. Six cells: task (the last `turn/end` is not error/aborted/interrupted/blocked and the last step is an answer; max-tokens counts as ended with the reason shown), tests / build / lint (command-position regexes over bash commands — `cat vitest.config.ts`, `grep pytest` and heredoc bodies do not count; JS/TS, Python, Rust, Go, Swift plus make/ctest/docker build in this first cut, with an npm/pnpm/yarn `check` script counted as tests; one command can count for several kinds; passed = no error flag and no non-zero exit code on the output's last line; each category is judged by its last run with earlier last-run failures noted, where "the same command" is the matched segment with `cd` prefixes, redirections and `&& echo PASS` decorations stripped — real logs run one test script a dozen ways; probes like `command -v pytest` or `pytest --version` do not count; a background job counts by the exit code on its later `job_output` last line and is left out and noted when none arrives; click a cell to locate the step of the last run), artifacts (files touched by successful write/edit/patch calls, deduplicated), human check (whether a human message followed the final answer — never interpreted). Overall badge: an abnormal ending or a last-run failure → "partial"; no verification command at all → a neutral "unverified"; otherwise "completed". Exit codes are read from the untouched last line before whitespace collapsing and truncation and carried as a new `exit` field (verified on real logs: dsh appends `[exit code: N]` only on non-zero exits; an "exit code: 1" quoted mid-output is not this command's failure). Both render paths carry the same raw material — turn endings and human message times — with the live path reading `turn/end` off the timeline and falling back to turn-error / turn-max-tokens / turn-tail nodes. Honest limits: code-mode sessions (`run_code`) are flagged as not recognized; project-specific test wrappers, loop variables and `| tail` / `|| true` masking are invisible. 38 new unit tests (63 on main → 101), all green._

## v2.1.0 — 2026-09-04

**新增设置页开关：可隐藏侧边栏入口（[#11](https://github.com/lamost423/dsh-maze/issues/11)）。**

- **需求来源**：只用「实时迷宫」页签的用户用不上侧边栏底部的常驻入口（窄栏模式下占一个独立图标位），此前只能本地改包删掉那段注册。
- **实现**：设置面板新增「Maze」一节（`settings.section` 槽位，生态先例 better-sidebar 同款），内含「侧边栏入口」开关，默认开、不改任何人的现有习惯。关闭即时生效——`slots.inject` 的幂等销毁器当场摘除注册，无需刷新；重开同理。「实时迷宫」页签与已打开的迷宫页不受开关影响。
- **持久化**：存 localStorage（`dsh-maze:v1:settings`），按浏览器保存；同一浏览器的多个标签页之间实时同步（监听 `storage` 事件）。没走宿主设置文档（`ctx.settingsScope`）是权衡不是做不到：那条通道要求插件的宿主半边注册设置命名空间（我们的宿主半边刻意留空），且在非本机访问的页面上会失效；一个界面开关不值得为此长出宿主半边，better-sidebar 也是同样的取舍。存储被禁/损坏时按默认值运行，开关在页面存续期内仍可用；存储里的未知键写回时原样保留，老版本不会抹掉新版本的偏好。
- **兼容**：`@deepseek-ai/dsh-client-ui-settings` 仅作类型依赖（可选 peer），产物 require 零新增；宿主没有设置壳时该节静默不渲染，默认行为不变。
- 实机验收于全新 `@deepseek-ai/dsh@0.1.2-rc.1` 宿主：加载零报错、开关双向即时生效、刷新后状态保持、两个标签页互相同步不用刷新。经独立代码评审加固后测试 63 个全绿（新增 14 个覆盖设置存取：默认值/损坏或异型 JSON/存储抛错/订阅通知与异常隔离/跨标签同步/未知键保留）。

_EN: Adds a settings toggle to hide the sidebar entry ([#11](https://github.com/lamost423/dsh-maze/issues/11)). Live-tab-only users never needed the persistent footer button (a full icon slot in rail mode) and previously had to patch the installed package locally. The settings panel now carries a "Maze" section (the `settings.section` slot, same seat better-sidebar uses) with a "Sidebar entry" switch — default on, so nobody's habits change. Flipping it takes effect immediately in both directions via the slot registration's idempotent disposer, no reload; the Live Maze tab and an open maze page are unaffected. The preference persists per browser in localStorage (`dsh-maze:v1:settings`) and syncs live across that browser's tabs via the `storage` event. Skipping the Host settings document (`ctx.settingsScope`) is a tradeoff, not an impossibility: that channel needs the plugin's Host half to register a settings namespace (ours is a deliberate no-op) and goes inert on non-loopback pages — one UI switch is not worth growing a Host half for, and better-sidebar made the same call. Blocked or corrupted storage falls back to defaults with the switch still working for the page's lifetime; unknown keys in storage survive writes, so an older build never erases a newer one's preferences. `@deepseek-ai/dsh-client-ui-settings` is a type-only optional peer, so the bundle's requires are unchanged, and on hosts without the settings shell the section silently never renders. Accepted live on a fresh `@deepseek-ai/dsh@0.1.2-rc.1` host: clean load, immediate two-way flips, state surviving reload, two tabs syncing without reload. Hardened after an independent code review; 63 tests green (14 new covering the settings facade: defaults, corrupted or odd-shaped JSON, throwing storage, subscription with error isolation, cross-tab sync, unknown-key preservation)._

## v2.0.0 — 2026-09-03

**2.x 转正：`latest` 从 1.1.0 切到 2.0.0，修复新宿主上插件加载失败（[#10](https://github.com/lamost423/dsh-maze/issues/10)）。**

- **为什么现在转正**：npm `latest`（1.1.0）的产物 require 已被宿主 `0.1.2` 移出模块表的 `@deepseek-ai/dsh-client-runtime`，在 DSH Desktop 2.0.4（内核 `0.1.2-alpha.1`）上迷宫入口直接抛错——普通用户按文档默认安装装到的就是坏的（#10）。上游宿主 `@deepseek-ai/dsh@0.1.2-rc.1` 与拆分出的客户端包本周发到了 npm（`next` 标签），2.x 第一次可以对着正式发布的宿主构建发版（[#7](https://github.com/lamost423/dsh-maze/issues/7) 一直在等的前提）。
- **构建基座换轨**：devDependencies 从自建宿主软链换成 npm 的 `0.1.2-rc.1` 包组；补齐源码 type-import 到但此前没声明的包（api-session-controller、ui-chat、ui-renderer、ui-trajectory、ui-session、session、store）。
- **适配 rc.1 类型**：`sessionId` / `useProjection` / `useSessions` 这些槽位标准 props 的声明合并在 rc.1 里归 `dsh-client-ui-session`，装进 devDependencies 后即解；`Context.sessions` 存在两份声明合并（客户端 `ISessions`，以及经 `dsh-workspace/types` 间接拖进来的服务端 `SessionStore`），TS 绑了服务端那份，在唯一使用点显式断言客户端面。
- **兼容代价**：还在老宿主（npm `latest`，`0.1.0-rc.6` ~ `0.1.1-rc.2`）上的用户，装插件时手动钉 `dsh plugin add dsh-maze@1.1.0`；README 安装表已随之翻面。
- 功能与 `2.0.0-alpha.2` 一致。typecheck + 49 测试 + 构建全绿；产物 require 审计：只剩 `dsh-client-store` / `dsh-client-ui-primitives` / `react`，旧包名零残留。

_EN: Promotes the 2.x line: `latest` moves from 1.1.0 to 2.0.0, fixing the plugin failing to load on new hosts ([#10](https://github.com/lamost423/dsh-maze/issues/10)). The 1.1.0 bundle requires `@deepseek-ai/dsh-client-runtime`, which host `0.1.2` removed from its module table, so on DSH Desktop 2.0.4 (kernel `0.1.2-alpha.1`) the maze entry threw on load — and the documented default install handed exactly that to ordinary users. With host `@deepseek-ai/dsh@0.1.2-rc.1` and its split-out client packages now on npm (tag `next` — the precondition [#7](https://github.com/lamost423/dsh-maze/issues/7) was waiting for), 2.x can finally build and release against a published host. The build base switches from self-built host symlinks to the npm `0.1.2-rc.1` package set, declaring every package the source actually type-imports. Two rc.1 type adaptations: the slot standard props (`sessionId` / `useProjection` / `useSessions`) are declaration-merged by `dsh-client-ui-session`, now a devDependency; and `Context.sessions` carries two competing merges (client `ISessions` vs the server `SessionStore` dragged in via `dsh-workspace/types`), so the single use site asserts the client face. Users still on older hosts (`0.1.0-rc.6` ~ `0.1.1-rc.2`) pin `dsh-maze@1.1.0`. Functionally identical to `2.0.0-alpha.2`; typecheck + 49 tests + build green, and the bundle require audit shows only `dsh-client-store` / `dsh-client-ui-primitives` / `react` — zero traces of the old package name._

## v2.0.0-alpha.2 — 2026-08-29

**修 alpha.1 实机验收查出的一处数字打架：实时视图头部的 Token 总数少算。**

- **现象**：同一画面上，头部指标条写「Token in 3 · out 23」，泳道标签写「output 25 tok」，宿主自己的底栏写「Input 6 · Output 25」。头部那个是错的。
- **根因**：宿主 `0.1.2` 里只发工具调用的 assistant 步不产生 assistant 节点，它那次请求的 token 落不到任何一行迷宫上，只存在于轮级账里。上一版把泳道统计改成取轮级账，但页面头部仍然自己按行累加，于是漏掉了那一步。写代码的会话里纯工具调用的步骤占比很高，会话越长漏得越多。
- **改法**：轮级账同时取出未命中缓存的输入（宿主 `TurnTokenUsage.uncachedInputTokens`，按其契约覆盖该轮每一次计费尝试），连同输出一起进泳道统计；页面头部优先用泳道统计里已经算对的值，没有时才回退按行累加。上传链路的日志每步都带 usage，走回退路径，行为不变。
- 新增一条契约测试：一步只发工具调用、不产生 assistant 节点时，泳道总数必须等于轮级账而不是行累加。49 个测试全绿。

_EN: Fixes one number disagreeing with itself, caught while accepting alpha.1 on a real host. The live view's header read "Token in 3 · out 23" while the lane label right beside it read "output 25 tok" and the host's own footer said "Input 6 · Output 25" — the header was wrong. Under host `0.1.2` an assistant step that only calls tools produces no assistant node, so that request's tokens land on no maze row and exist only in the turn account. The previous release moved lane stats onto the turn account but left the page header summing rows, so it dropped those steps — and coding sessions are full of them. The turn account now also carries uncached input (`TurnTokenUsage.uncachedInputTokens`, which by contract covers every billed attempt in the turn), and the header prefers the lane totals, falling back to row sums only when there are none (the upload path, whose logs carry per-step usage, is unchanged). A contract test pins it: with a tool-only step carrying no assistant node, lane totals must equal the turn account, not the row sum. 49 tests green._

## v2.0.0-alpha.1 — 2026-08-29

**适配宿主 `0.1.2` 的客户端拆包与新会话模型。这一版只给自己从上游 master 构建宿主的人，发在 `next` 标签上；从 npm 装宿主的用户请继续用 `latest`（`1.1.x`），升上来反而会打挂。**

- **包迁移**：宿主删掉了 `@deepseek-ai/dsh-client-runtime`，`defineStore` / `EngineStoreHandle` 迁到新的 `@deepseek-ai/dsh-client-store`；`ClientContext` 回到 cordis 的 `Context`，`ISessions` / `SessionFace` 归 `dsh-api-session-controller`，`SessionId` 归 `dsh-session`。`package.json` 的 `dsh.client.inject` 与 `tsdown` 的 external 同步换名——旧名字留在那里会让宿主的模块表查不到而直接抛错，这正是 [#7](https://github.com/lamost423/dsh-maze/issues/7) 的现象。
- **实时迷宫按新节点模型重写**：`0.1.2` 把 Conversation 拆成 target 中立的快照，节点不再挂在会话快照上、聊天内容归 ui-chat 的 chat target。有序节点改从 `order` + `nodes.get(key)` 走，工具调用与结果合成一个已结算节点，进行中的步改读 `assistant-step` 的 `running` 状态，轮次锚点改用 timeline 的 turn 起点（原来靠数用户消息推断，事件窗口从半途打开时会错）。
- **按实测修扫描**：在真宿主上冒烟发现步数和工具数会读丢（日志里 2 个步骤 1 次工具调用，界面只显示「1 steps · 0 calls」）。原因是只发工具调用的 assistant 步根本不产生 assistant-step 节点，该步由独立的 tool-call 节点代表。扫描改为按 location 的 (turn, step) 归组，谁先到谁建行。
- **turn 级精确 token**：完成的一轮在 turn-tail 上带宿主的精确账，覆盖该轮每一次计费尝试，包括失败后被重试的那些——这些 token 没有任何 assistant 节点承载，按步累加永远看不见。已完成的轮用轮级账，仍在跑的轮回退到步累加。
- **子会话花名册改为不导航**：上一版调 `sessions.openSubagent()` 打开子会话，实测那是个导航动作，会把用户正在看的会话直接切走。现在改成纯被动观察，只订阅子会话的 Conversation 绑定。代价是在本视图挂载前就已结束的子会话读不到历史——宿主公开契约里没有「不导航地加载子会话历史」这条路。
- **peer 依赖标为可选**：拆分出来的新包还没发到 npm，照常规写法声明会让 pnpm 自动去装 peer 而撞上 404，谁都装不上。宿主提供的包本来就不该从 registry 装，标成可选是如实的写法。
- 测试 48 个全绿（新增按新节点模型对齐的 fixture、以及「绝不导航」「按内容而非 openState 放行」两条契约测试）。

_EN: Adapts to host `0.1.2`, which re-split the client packages and swapped the conversation model. This build is for people who build the host from upstream master themselves — it ships on the `next` tag, while npm-host users stay on `latest` (`1.1.x`), where upgrading would break them. `dsh-client-runtime` is gone: `defineStore` / `EngineStoreHandle` move to `@deepseek-ai/dsh-client-store`, `ClientContext` returns to cordis `Context`, `ISessions` to `dsh-api-session-controller`, `SessionId` to `dsh-session` — with `dsh.client.inject` and the bundler externals renamed to match (a stale name misses the host module table and throws, which is [#7](https://github.com/lamost423/dsh-maze/issues/7)). The live maze is rewritten for the target-neutral snapshot: ordered nodes via `order` + `nodes.get(key)`, settled tool nodes instead of call/result pairing, in-flight steps from `assistant-step` status, turn anchors from the timeline. Smoke-testing on a real host caught steps and tool calls being dropped — an assistant step that only makes a tool call produces no assistant-step node at all, so scanning now groups by the location's (turn, step). Completed turns now report provider-exact tokens covering every billed attempt, including failed-and-retried requests no assistant node ever carried. The subagent roster no longer calls `openSubagent()`: that turned out to be a navigation action that switched the user's current session away — it is a passive observer now. Peer deps on the not-yet-published host packages are marked optional, otherwise pnpm auto-installs them and hits a 404. 48 tests green._

## v1.1.0 — 2026-08-26

**观感大版本：空间收紧 + 轨道加高 + Token 脉冲双向 + 行内图例 + 柱形定版。**

- **空间收紧**：无上方支路时泳道头到主干 82→58px、主干到轨道 44→36、轨道底垫减半、顶部起步 34→30；信箱留白收编——内容缩放后比容器矮时容器高度贴内容，迷宫框不再上下空一条。
- **轨道加高**：密度 18→40（新增独立标题行）、Token 56→92、上下文 70→100——省出的空转高度全部给数据区。
- **Token 脉冲双向 + 柱形定版**：基线之上未缓存输入（缓存命中作上半区半透明背景、自有刻度），基线之下推理+可见输出走独立刻度——输入动辄上万、输出常只有几百，同向堆叠时输出永远被压扁，上下分开后两边各自撑满。读数柱宽 = min(步长−缝, 10px) 钉步中点：密集会话自动呈细尖峰、稀疏会话保底存在感；时长语义由迷宫胶囊条承担，不重复编码。
- **行内图例 + 计数**：每条轨道标题行带彩点图例（密度轨道按类别计数、Token 轨道四层、上下文阈值标签），随双语与主题；`run_code`/`node` 归入命令类。
- **柱间留缝**：密度色条与 Token 柱步步可分（太窄时放弃留缝保可见），缓存背景保持连续当参照带。
- 全套演示素材（主视觉 / 六个功能 GIF / 社交预览图）按最终布局用真实会话重录。

_EN: A visual milestone. Tightened idle chrome (lane-header-to-main-path 82→58px with no up-detours, main-to-tracks 44→36, halved bottom padding, letterboxing removed — the canvas hugs its content when shorter than the container). Taller tracks (density 18→40 with its own caption row, token 56→92, context 70→100) — the reclaimed idle height goes to data. Token pulse goes bipolar: uncached input above the baseline (cache hits as a translucent upper-zone backdrop on its own scale), reasoning + visible output below on an independent scale — inputs run to tens of thousands while outputs are often a few hundred, so same-direction stacking always crushed the output. Bar width is now min(step span − gap, 10px), pinned at the step midpoint: dense sessions naturally render as thin spikes, sparse sessions keep presence; duration semantics stay with the maze capsules. Inline legends with per-category counts on every track caption; `run_code`/`node` classified as shell. Inter-bar gaps keep steps distinguishable (cache backdrop stays continuous as a reference band). Every demo asset re-recorded from real sessions on the final layout._

## v1.0.0 — 2026-08-26

**`dsh-trace-compare` 更名 `dsh-maze`，1.0 里程碑。**

- **为什么更名**：项目已从「对比工具」长成完整的执行观测台——迷宫、数据轨道、执行分析、多会话对比是四个并列的一等能力，「trace-compare」这个名字装不下了。迷宫是本项目从第一天起的招牌视觉语言，名字回到它身上。
- **改了什么**：npm 新包 `dsh-maze`（旧包冻结在 v0.7.0 并标记弃用、附迁移指引）；GitHub 仓库改名 `lamost423/dsh-maze`（旧地址自动重定向，star/issue/历史全保留）；dsh 内入口更名「执行迷宫 / Maze」；README 中英全部重写，全套演示素材换成真实 8.6 小时会话的新录屏。
- **功能与 v0.7.0 一致**：本版是更名与品牌重塑，无行为变更。
- 迁移：`dsh plugin --profile web remove dsh-trace-compare && dsh plugin --profile web add dsh-maze`。

_EN: `dsh-trace-compare` becomes `dsh-maze` for the 1.0 milestone. The project outgrew "compare": the maze, the data tracks, the execution analysis and multi-session comparison are four first-class capabilities now — and the maze has been this project's signature visual language since day one, so the name goes to it. New npm package `dsh-maze` (the old one is frozen at v0.7.0 and deprecated with a migration pointer); the GitHub repo is renamed with automatic redirects (stars/issues/history preserved); in-app entries become "Maze"; both READMEs rewritten and every demo asset re-recorded from a real 8.6-hour session. Feature-identical to v0.7.0 — this release is the rename and rebrand. Migration: remove `dsh-trace-compare`, add `dsh-maze`._

## v0.7.0 — 2026-08-26

**分析层三件套（执行分析面板 / 泳道数据轨道 / Agent 关系图谱）+ 请求级失败可见化 + 对比扩到 5 个文件（同任务智能识别）。**

- **执行分析区（主界面直出，迷宫下方）**：数据一到即渲染在迷宫下方的文档流里，整页纵向滚动、无需任何按钮——摘要三卡（工具失败与恢复 / 时间消耗 / 上下文压力）+ **耗时分布散点图**（每工具一行、sqrt 横轴铺开长尾、全局 P50/P95 参考线、失败点放大标红、悬停看单次调用）+ 工具结果矩阵（成功/失败/扑空/盲重试/成功率，附 P50/P95/最长耗时分位）+ 失败恢复链——每个失败调用之后发生了什么：原样重试 / 换参数 / 换工具 / 未恢复（分类看失败后的下一次调用；恢复 = 失败后任意工具在 120 秒内再次成功，超窗如实标注；链只统计失败 ✗——扑空 · 与盲重试 ↻ 计入矩阵各自列、不单独进链，盲重试也不算恢复证据）；点一条缩放到该失败并打开详情面板。全部数字是对已判定数据的确定性聚合，不调 LLM，规则在 `verdict.js` 的 `analyzeFailureChains`/`ANALYSIS_RULES`。
- **泳道数据轨道（📊 轨道，可开关）**：泳道带底部三条与迷宫同一时间轴联动（缩放/平移/空闲折叠/播放全跟随）的轨道——**工具调用密度**（每次调用一根刻线，按读取/检索/命令/编辑/其他类别着色，宽 = 真实时长）；**Token 脉冲**（每步堆叠柱：缓存输入/未缓存输入/推理/可见输出——用真实日志验证 `usage.inputTokens` 是未命中缓存口径、`cacheReadTokens` 是命中口径，上下文总量 = 两者之和）；**上下文压力**（折线+面积，纵轴随数据自适应——按整窗满刻度画的话低占用会话的曲线全贴底边看不出变化；百分比与 70%/90% 阈值线按真实窗口换算、只在落进可视范围时画，压缩呈现为锯齿下落）。窗口表在 `verdict.js` 的 `CONTEXT_WINDOWS`（DeepSeek V4 = 1M 按官方口径收录）；观测峰值超过表值时视为表已过时、自动退回绝对 token 显示——绝不显示超过 100% 的占用。日志没报 usage 就不画后两条轨道，不占高度。
- **Agent 关系图谱（分析区内的块）**：主 Agent 与子代理的星形总览——节点大小 = 该 Agent 消耗的 token（输入+缓存+输出，无真值时按调用数并注明），连线粗细 = 工具调用数，运行中的子代理虚线标示；点子代理节点跳到它在时间轴上的位置并打开详情。只在真有子代理数据时出现（依赖 v0.4.0 的子代理折入；stock dsh 无该能力时自然隐藏）。
- **密集会话可读性 + 头部指标条 + 热力进度条**：稀疏模式（当前窗口可见步数超阈值时自动启用——标签只留失败/回答/子代理/长步，支路弧线变细，≥4 条支路的密集段收「×N」聚合徽标、点击放大，放大后标签逐级补齐）；轮次交替底色与轮次标签避让（多轮长会话不再叠字）；播放进度条热力化（活动密度铺底 + 失败红刻线，拖到坎坷段即达）；会话头部指标条（模型 · 总时长 · 步数/调用 · Token 输入/输出——**刻意不含缓存重读**，累计缓存会得出数亿级的吓人数字 · 峰值上下文）；Token 脉冲改「缓存半透明背景（自有刻度）+ 增量三层柱」——97K 缓存不再把几百 token 的产出压成细边；上下文压缩事件「⌄−N%」标注（相邻样本掉 ≥20% 即标，悬停看压缩前后真值）；耗时散点图每行加自身 P50/P95 刻度。
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
