# dsh-trace-compare

中文 | [English](README.en.md)

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的执行轨迹可视化插件：把智能体真实的探索过程画出来——它坚持推进的主干、失败或扑空的支路、以及折返点，全部落在同一根时间轴上。

两个入口，一套视觉语言：

- **Trace 对比**（侧边栏入口）：上传 1 个 session log 看单次运行的迷宫，或上传 2 个做同轴对比（比如同一任务 flash 与 pro 的跑法差异），带里程碑对比线。

![Trace 对比：flash 与 pro 在同一时间轴上的探索差异回放](assets/trace-compare.gif)

- **实时迷宫**（会话内页签）：同一张迷宫图随当前会话执行实时生长；某一步的工具结果一旦落定，支路立刻显现。

![实时迷宫：会话执行中迷宫实时生长，空闲等待自动折叠](assets/live-maze.gif)

## 迷宫画的是什么

- 实线：主干路径——工具调用成功推进的步骤和回答节点。
- 虚线弧：探索支路——工具失败（红 ✗）或结果扑空（灰 ·）的步骤，以及折返回分支点的回程线。
- 悬停任意节点或弧线，查看命令、返回内容、耗时和思考摘要。
- 播放功能最高 300× 回放整次运行。

时间轴的诚实规则：

- **空闲折叠**：超过 60 秒没有任何步骤/工具活动的区间（比如两轮对话之间你在思考）压缩成一条带 `⏸` 标注的细缝，标明省略了多久；活动段内的刻度仍显示真实墙钟时间。
- 步骤标识带轮次（`S15·47`），多轮会话的支路不会挂错节点。
- 步骤时长、工具耗时、总耗时都保持墙钟真值，只有轴被压缩。

## 支持的 session log 格式

按文件内容识别格式，文件名任意（macOS 复制出的「session.jsonl 2」也能直接选）：

- 纯文本 `.jsonl`（session 格式 v0 事件流）
- `~/.dsh/sessions/` 下原样的 `.jsonl.zstd`——浏览器端直接解压（原生 `DecompressionStream('zstd')` 可用时优先，否则用内置的 [fzstd](https://github.com/101arrowz/fzstd)）

## 安装

先安装兼容版本的 DSH CLI，再把插件加进 profile：

```sh
npm install --global @deepseek-ai/dsh@0.1.0-rc.6
dsh plugin --profile web add https://github.com/lamost423/dsh-trace-compare/releases/download/v0.1.2/dsh-trace-compare-0.1.2.tgz
dsh web
```

从源码安装：

```sh
git clone https://github.com/lamost423/dsh-trace-compare.git
cd dsh-trace-compare
corepack enable
pnpm install
pnpm build
dsh plugin --profile web add .
dsh web
```

重启 `dsh web` 后，侧边栏底部出现「Trace 对比」入口，每个会话视图多一个「实时迷宫」页签。

## 开发

```sh
pnpm install
pnpm check   # 类型检查 + vitest + 构建
```

上传/可视化页面是一份自包含的 HTML（`src/client/maze-upload.html`），运行在沙箱化的 `<iframe srcDoc>` 里；解析与渲染全部在浏览器端完成，上传的日志内容不会到达宿主。

## 许可

MIT。见 [NOTICE](NOTICE)——本项目包含源自 DeepSeek Harness 的衍生代码。
