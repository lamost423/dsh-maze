# dsh-maze

> 🔀 **`dsh-trace-compare` 已更名为 `dsh-maze`**（v1.0.0 起）。旧包保留可装但不再更新，[迁移只要两条命令](#从-dsh-trace-compare-迁移)。

中文 | [English](README.en.md)

[![npm](https://img.shields.io/npm/v/dsh-maze?color=cb3837&logo=npm)](https://www.npmjs.com/package/dsh-maze)
[![dsh.so 安全扫描：低风险](https://www.dsh.so/badge/dsh-trace-compare.svg)](https://www.dsh.so/zh/artifact/dsh-trace-compare)
[![dsh.so 沙盒安装实测：通过](https://www.dsh.so/badge/install/dsh-trace-compare.svg)](https://www.dsh.so/zh/artifact/dsh-trace-compare)
[![Mentioned in Awesome DSH Plugins](https://awesome.re/mentioned-badge.svg)](https://github.com/bruc3van/awesome-dsh-plugin)
[![Listed in awesome-dsh-plugin index](https://img.shields.io/badge/listed-awesome--dsh--plugin%20index-blue)](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
[![dshbase](https://dshbase.com/badges/dsh-maze.svg)](https://dshbase.com/plugins/dsh-maze/)
[![Listed in awesome-deepseek-harness (Dominic789654)](https://img.shields.io/badge/listed-awesome--deepseek--harness-blue)](https://github.com/Dominic789654/awesome-deepseek-harness)
[![Listed in awesome-deepseek-harness (0xsline)](https://img.shields.io/badge/listed-awesome--deepseek--harness%20catalog-blue)](https://github.com/0xsline/awesome-deepseek-harness)

[![Listed in dsh-plugin-registry](https://img.shields.io/badge/registry-dsh--plugin--registry-2d6a8f)](https://github.com/XingLingQAQ/dsh-plugin-registry)
[![Listed on dshfind](https://dshfind.com/api/badge/lamost423/dsh-maze?lang=zh)](https://dshfind.com/zh/plugins/lamost423/dsh-maze?ref=badge)
[![Capability card on dsh-xray](https://img.shields.io/badge/capability%20card-dsh--xray-2d6a8f)](https://github.com/unStone/dsh-xray)
[![featured on dsh-suite](https://img.shields.io/badge/featured%20on-dsh--suite-4d6bfe)](https://whyihaveyou.github.io/dsh-suite/)

<sub>还被收录于：[fendouai/awesome-deepseek-harness](https://github.com/fendouai/awesome-deepseek-harness)（独立介绍页）· [Zhiyuan-Fan/Awesome-DeepSeek-Harness-Plugins](https://github.com/Zhiyuan-Fan/Awesome-DeepSeek-Harness-Plugins) · [ZeroPointRepo/awesome-dsh-plugins](https://github.com/ZeroPointRepo/awesome-dsh-plugins) · [cccakeee/awesome-dsh-plugins](https://github.com/cccakeee/awesome-dsh-plugins)</sub>

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的**执行迷宫**：把 Agent 真实的干活过程完整画出来、并分析给你看。

![执行迷宫：迷宫 + 数据轨道 + 执行分析，一屏读懂一场 8.6 小时的真实会话](assets/maze-hero.png)

- **迷宫**——主干路径、失败支路、折返点落在同一根时间轴上；空闲自动折叠、密集段自动聚合成「×N」徽标（点击放大、标签逐级补齐）、进度条自带失败热力，8 小时的会话照样字字可辨：

![密集会话：整图态聚合徽标 → 点击放大 → 标签补齐 → 点开失败详情](assets/maze-zoom.gif)

- **数据轨道**——每一步的工具调用密度、Token 脉冲（缓存背景 + 未缓存输入/推理/输出增量柱）、上下文压力曲线（70%/90% 阈值线、压缩事件「⌄−N%」标注，悬停看压缩前后真值）：

![轨道悬停：Token 分层数字 → 上下文占用 → 压缩事件前后对比](assets/maze-tracks.gif)

- **执行分析**——失败恢复链（原样重试 / 换参数 / 换工具 / 未恢复）、工具结果矩阵、耗时分位散点。**每个结论一键点回原始命令与返回内容**：

![点失败链任意一条：缩放定位到那次失败，弹出完整命令、报错返回与判定依据](assets/maze-drilldown.gif)

- **多会话对比**——同一任务在不同模型上的 2~5 次跑同轴对比：轮次对齐、手动锚点、支路盘点。

![对比：同一任务的两次真实跑 → 支路盘点按轮次列差额 → 点行缩放到该轮](assets/maze-compare.gif)

- **回放**——最高 300× 重放整场执行，看它是怎么一步步走到结果的：

![回放：300× 重放一场 8.6 小时的会话](assets/maze-replay.gif)

**铁律**：所有数字都是对判定数据的确定性聚合，不调 LLM；每个判定带依据、每个结论可回溯到证据；数据缺失时如实标注（不画没有数据的轨道、不猜未知模型的窗口），绝不编。

两个入口：会话内的「**实时迷宫**」页签（随当前会话实时生长），侧边栏的「**执行迷宫**」（上传 session log 单看或对比）。

## 迷宫画的是什么

- 实线：主干路径——工具调用成功推进的步骤和回答节点。
- **时长胶囊条**：每个步骤画成从开始到结束的圆角条，判定色填充——3 分钟的 bash 和 0.2 秒的 read 一眼可辨；条够宽时耗时直接写在条内。
- **并行工具分行**（v0.3.2 起）：一步内 ≥2 次工具调用时，每次调用画成胶囊条下方的细小条（瀑布惯例），按各自真实起止摆位、按各自判定上色——一眼看出并行发的几个调用里哪个拖了时间、哪个失败；悬停单条看该次调用的命令/返回/判定依据，泳道高度随最大并行数自适应。支路节点保持「+N」标签（其空间为固定泳道格，详情面板已列全）。
- 虚线弧：探索支路——工具失败（红 ✗）、检索扑空（灰 ·）或盲目重试（灰 ↻）的步骤，以及折返回分支点的回程线。
- **子代理支路**（v0.4.0 起，实时页签）：模型派生的 dsh 子代理会话画成主干上分出的聚合支路节点——挂靠在派生它的那一步、与父会话共享时间轴，节点子条是子代理全部已判定的工具调用，运行中的子代理实时生长并标注「仍在运行」；悬停/详情面板显示「子代理支路」身份与派生汇回关系，点击跳回主对话中的派生位置。只认真正的任务子代理（`origin: 'subagent'`），手动分支和 side-chat 侧聊不入图。依赖宿主「后台加载子会话历史」的能力，官方 rc 线暂缺该能力时自动静默隐藏。
- 悬停任意节点或弧线快速预览；**点击**在右侧打开固定详情面板——完整命令与返回内容（各带复制按钮，返回内容保留前 5000 字）、耗时、判定、思考摘要，Esc 或 × 关闭。
- **缩放导航**：滚轮以光标为中心横向缩放，拖拽平移，双击空白处或「⤢ 整图」按钮复位；轴刻度随缩放窗口自动加密（最细到 1 秒）。
- **跳转对话**（仅实时页签）：详情面板里点「在对话中定位此步骤」，宿主切回对话页并滚动高亮对应的工具行。行太老、超出对话已加载窗口时退化为只切页签。
- **搜索与过滤**：工具行提供「只看失败/重试」开关、按工具类型过滤、命令与返回内容全文搜索（含 5000 字面板全文）；不命中的节点与支路淡化到 15% 透明度，实时显示命中步数。实时模式下过滤状态在重建后自动还原。
- **轮次对齐线**（同任务对比件，v0.3.0 起，现扩到 2~5 泳道）：仅当各文件被识别为同一任务的多次跑（首条用户消息一致）时启用。每一轮的回答节点自动连成跨泳道对比链，标注各泳道**本轮各自的耗时**（该轮起点 → 回答完成；轮与轮之间等用户输入的空闲不计入，v0.5.1 起）；双泳道额外标注耗时差与该轮支路数差（如「第 3 轮耗时：1st 4m ↔ 2nd 6m（Δ2m）· 支路 4↔0」）。只连该轮出现在 ≥2 条泳道的轮次——旧版从特定任务总结的「模型列表结果」正则里程碑已退役。
- **手动锚点**（同任务对比件）：「🔗 加锚点」后在任意两条泳道各点一个节点，钉一条带时差标注的对比线；点线删除，Esc 取消选点。适合钉住语义等价但轮次错位的时刻。
- **支路盘点**（同任务对比件）：「📋 支路盘点」打开按轮次的盘点表——每轮各泳道的支路步数、墙钟耗时、类别构成（✗ 失败 / ↻ 无效重试 / · 扑空），双泳道附差额列（如「第 2 会话多耗 48.4s」）；点一行缩放到该轮并只保留该轮支路，其余淡化。某泳道没有这轮显示「—」，缺席本身就是信号。任务不同的文件仅同轴并排，这三样不出现（图例明示原因）。
- **泳道数据轨道**（v0.7 起，📊 可开关）：泳道带底部三条与迷宫同一时间轴联动的轨道——**工具调用密度**（每次调用一根刻线，按读取/检索/命令/编辑/其他着色）、**Token 脉冲**（每步堆叠柱：缓存输入/未缓存输入/推理/可见输出，读自 usage 真值）、**上下文压力**（折线+面积，纵轴随数据自适应；模型窗口已知时显示占用百分比与 70%/90% 阈值线，上下文压缩呈现为锯齿下落，窗口未知或表值过时自动退回绝对 token 数——绝不显示超过 100% 的占用）。日志没报 usage 的轨道不画、不占高度。
- **执行分析区**（v0.7 起，迷宫下方主界面直出）：摘要三卡（工具失败与恢复 / 时间消耗 / 上下文压力）+ **耗时分布散点图**（每工具一行，P50/P95 参考线，失败点标红，悬停看单次调用）+ 按工具的结果矩阵（成功/失败/扑空/盲重试/成功率 + P50/P95/最长耗时）+ **失败恢复链**——每个失败调用之后发生了什么：原样重试 / 换参数 / 换工具 / 未恢复，恢复耗时如实标注；点一条缩放到该失败并打开详情。口径：链只统计失败（✗），扑空（· 检索无结果）与盲重试（↻）计入矩阵各自列、不单独进链，盲重试也不作为恢复证据。全部数字是确定性聚合，不调 LLM。
- **Agent 关系图谱**（v0.7 起，分析区内的块）：主 Agent 与子代理的星形总览，节点大小 = 各 Agent 消耗的 token、连线粗细 = 工具调用数、运行中的虚线标示；点子代理节点跳到时间轴位置。只在有子代理数据时出现。
- **导出**：一键导出当前视图（含缩放窗口与过滤淡化状态）为 SVG 或 2x PNG，样式已内联、拿去即用；**无论页面当前是浅色还是暗色，导出固定浅色底**（分享场景）。
- **界面双语**（v0.5.0 起）：整页 UI（上传区、图例、泳道统计、对齐线、支路盘点、悬停卡、详情面板、错误提示）中英双语，嵌入宿主时实时跟随 dsh 的语言设置切换，独立打开按浏览器语言兜底；判定依据是结构化键值、按当前语言渲染，切语言不用重新上传。
- **主题跟随**（v0.3.1 起）：页面随宿主 dsh 的明暗主题自动切换（宿主组件监听 `body[data-ds-dark-theme]` 并 postMessage 进 iframe）；独立打开时按系统偏好。
- **紧凑页头**（v0.3.1 起）：出数据后说明文字隐藏、上传区收成细条、泳道统计卡隐藏（同信息已画在泳道带内）、图例压成一行——迷宫拿走绝大部分视口。
- 播放功能最高 300× 回放整次运行。

时间轴的诚实规则：

- **空闲折叠**：超过 60 秒没有任何步骤/工具活动的区间（比如两轮对话之间你在思考）压缩成一条带 `⏸` 标注的细缝，标明省略了多久；活动段内的刻度仍显示真实墙钟时间。
- 步骤标识带轮次（`S15·47`），多轮会话的支路不会挂错节点。
- 步骤时长、工具耗时、总耗时都保持墙钟真值，只有轴被压缩。
- **实时页签只画对话已加载的事件窗口**（v0.2.3 起诚实标注）：窗口边缘残留的更早轮次步骤会被丢弃并标注「⏮ 另有 N 步更早历史未加载」，不再钳到 0 秒堆在左边缘、虚高统计；要看全会话用「Session log 下载 → 上传对比」。
- **token 是真值**（v0.2.2 起）：推理/输出 token 读自 session log 里 `assistant/message` 的 `usage`（此前的「reasoning N tok」数的是流式段数，不是 token）。日志没有 usage 时标签诚实回退为「推理 N 段（日志未报 token 用量）」——中转站日志常缺推理 token 字段，与原厂日志并排时单位不同，标签自带原因（v0.5.1 起）。

判定的诚实规则（v0.2.1 起）：

- **不按输出长度判定**。单工具判定三层：错误标志（isError）→ 失败特征 → 按工具分类（写入类无错误即成功；检索类空结果才算扑空；bash 及未知工具有输出即成功）。
- **失败特征只扫开头与末尾窗口**（v0.2.3 起）：真实报错要么从开头开始说、要么是追加在末尾的 stderr 段；而 git log / 读文件 / 转储日志时**引用**的报错字样悬在长文本中部——判定刻意不看那里，避免把「病历」当「发病」（实测案例：提交信息里写 "upstream returns HTTP 400" 被误判为该命令失败）。两条渲染链路统一在未截断的全文上判定。
- **盲目重试**是行为学判定：时间序上连续的「同工具 + 参数相似」调用簇、且簇内至少一次失败，才标为无效重试——借鉴 AgentLens 对 SWE-agent 轨迹「浪费」的确定性检测。
- 每个判定都带**依据文本**，悬停 tooltip 和详情面板可见（如「同一操作连续重试 4 次（其中 1 次失败），判为盲目重试」）。
- 全部阈值与分类在 `src/client/verdict.js` 的 `VERDICT_RULES` 常量里，可按项目语料调整；页面与实时两条渲染链路共用这一份实现（构建期注入）。

## 支持的 session log 格式

按文件内容识别格式，文件名任意（macOS 复制出的「session.jsonl 2」也能直接选）：

- 纯文本 `.jsonl`（session 格式 v0 事件流）
- `~/.dsh/sessions/` 下原样的 `.jsonl.zstd`——浏览器端直接解压（原生 `DecompressionStream('zstd')` 可用时优先，否则用内置的 [fzstd](https://github.com/101arrowz/fzstd)）

## 安装

兼容性：已对官方 `0.1.0-rc.6`（构建 + 全量测试）与 `rc.8`（插槽/类型核对 + 实机验收）验证；peer 范围覆盖 `rc.6` 到当前 rc 线，且随官方每个新 rc 版本跟进复验。

```sh
npm install --global @deepseek-ai/dsh@0.1.0-rc.8
dsh plugin --profile web add dsh-maze
dsh web
```

重启 `dsh web` 后，侧边栏底部出现「执行迷宫」入口，每个会话视图多一个「实时迷宫」页签。

从源码安装：

```sh
git clone https://github.com/lamost423/dsh-maze.git
cd dsh-maze
corepack enable && pnpm install && pnpm build
dsh plugin --profile web add .
dsh web
```

## 从 dsh-trace-compare 迁移

```sh
dsh plugin --profile web remove dsh-trace-compare
dsh plugin --profile web add dsh-maze
```

旧包停在 v0.7.0（功能与 dsh-maze 1.0.0 相同），此后只有 dsh-maze 继续更新。GitHub 旧地址自动重定向到本仓库。

## 版本历史

全部演进见 [CHANGELOG.md](CHANGELOG.md)。

## 开发

```sh
pnpm install
pnpm check   # 类型检查 + vitest + 构建
```

上传/可视化页面是一份自包含的 HTML（`src/client/maze-upload.html`），运行在沙箱化的 `<iframe srcDoc>` 里；解析与渲染全部在浏览器端完成，上传的日志内容不会到达宿主。

## 许可

MIT。见 [NOTICE](NOTICE)——本项目包含源自 DeepSeek Harness 的衍生代码。
