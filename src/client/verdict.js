/**
 * 迷宫判定的唯一真相源：单步判定（成功/失败/扑空）+ 行为学盲目重试簇标注。
 * live-data.ts 正常 import 本模块；maze-upload.html 在构建期由 tsdown 把本文件
 * 剥掉 export 前缀后注入页面脚本的 VERDICT 占位符——改这里即同时改两条链路。
 * 类型声明在 verdict.d.ts（手写，改导出时同步）。
 *
 * 判定依据（why/why2）是结构化键值 { k, p }，不含任何语言的成品文案——展示端
 * （maze-upload.html 的 whyText）按当前界面语言渲染，切语言即时生效。
 *
 * 阈值与分类按 2026-08-19 三个真实会话（338 次工具调用）校准拍定，依据见工作区
 * PROPOSAL-trace-compare-verdict.md；VERDICT_RULES 各参数可调，改后重跑校准脚本核对。
 */

export const VERDICT_RULES = {
  /**
   * 强失败特征（扫开头 + 末尾两个窗口）：包装器/运行时的硬标记。真失败的标记要么在
   * 短输出里（命令直接死掉），要么贴着末尾（stderr 段是包装器追加在最后的）；而转储/
   * 引用别的日志时（如会话分析会话），这些标记悬在长文本中部，两个窗口都够不着。
   * 刻意不含项目特定话术（如 "No such container"），那类失败靠 [status=Failed] / __EXIT__ 兜住。
   */
  ERROR_PATTERNS_STRONG: /\[stderr\].*(Error|Traceback|File ")|\[status=Failed\]|__EXIT__=[1-9]/i,
  /**
   * 弱失败特征（只扫开头窗口）：真实报错从开头开始说，而 git log / grep / 文档类输出
   * 在正文深处**引用**别人的报错（如提交信息里写 "upstream returns HTTP 400"）不该算
   * 这条命令失败——2026-08-19 实测误报案例。
   */
  ERROR_PATTERNS_WEAK: /Traceback \(most recent|command not found|Permission denied|No such file|HTTP 40\d|HTTP 50\d|^Error:/i,
  /** 开头扫描窗口（字符）：弱特征仅此窗口；强特征此窗口 + 末尾窗口。 */
  ERROR_HEAD_SCAN: 300,
  /** 末尾扫描窗口（字符）：覆盖「长输出后崩溃」的 stderr 追加段。 */
  ERROR_TAIL_SCAN: 1000,
  /** 写入类工具：成功确认天然很短，无错误即成功，永不按输出判扑空。 */
  WRITE_TOOLS: ['write', 'edit', 'todo_write'],
  /** 检索类工具：空结果=扑空；有返回（哪怕一行命中）即成功。 */
  SEARCH_TOOLS: ['grep', 'read', 'web_search', 'read_image'],
  /**
   * 空结果/无命中特征（只扫开头窗口）：真正的空结果提示本来就是整段短消息；
   * 读到的文件内容/命中的代码里出现 "not found in" 字样不算扑空——2026-08-19 实测误报案例。
   */
  NO_RESULT_PATTERNS: /^(---)?$|no matches|no results|not found in/i,
  /** 盲目重试：相邻同工具调用的参数 token Jaccard 相似度门槛。 */
  RETRY_SIMILARITY: 0.6,
  /** 盲目重试：最小连续调用数。 */
  RETRY_MIN_CLUSTER: 2,
}

/** 步级聚合的严重度序：取最坏工具判定作为步判定。 */
export const SEV = { error: 4, retry: 3, deadend: 2, ok: 0, answer: 0 }

/**
 * 单工具判定：错误标志 → 失败特征 → 按工具分类；返回判定值和结构化依据 { k, p }。
 * ev.res 必须传**未截断**的返回全文——上传与实时两条链路统一在同一份文本上判定，
 * 否则同一步会在两种模式下判出不同结果（2026-08-19 实测踩过）。
 */
export function toolVerdict(ev){
  if (ev.err) return { v: 'error', why: { k: 'errFlag' } }
  const txt = (ev.res ?? '').trim()
  const head = txt.slice(0, VERDICT_RULES.ERROR_HEAD_SCAN)
  const tail = txt.slice(-VERDICT_RULES.ERROR_TAIL_SCAN)
  const strong = VERDICT_RULES.ERROR_PATTERNS_STRONG.exec(head) ?? VERDICT_RULES.ERROR_PATTERNS_STRONG.exec(tail)
  if (strong !== null) return { v: 'error', why: { k: 'errStrong', p: [strong[0].slice(0, 48)] } }
  const weak = VERDICT_RULES.ERROR_PATTERNS_WEAK.exec(head)
  if (weak !== null) return { v: 'error', why: { k: 'errWeak', p: [weak[0].slice(0, 48)] } }
  if (VERDICT_RULES.WRITE_TOOLS.includes(ev.name)) return { v: 'ok', why: { k: 'writeOk' } }
  if (VERDICT_RULES.SEARCH_TOOLS.includes(ev.name)){
    if (VERDICT_RULES.NO_RESULT_PATTERNS.test(head)) return { v: 'deadend', why: { k: txt === '' ? 'searchEmpty' : 'searchNoHit' } }
    return { v: 'ok', why: { k: 'searchOk' } }
  }
  if (VERDICT_RULES.NO_RESULT_PATTERNS.test(head)) return { v: 'deadend', why: { k: 'exitNoOut' } }
  return { v: 'ok', why: { k: 'exitOk' } }
}

/** 步级判定：返回该步最坏判定的工具（其 v/why 即步判定与依据）；无参与投票的工具时返回 null。 */
export function stepVerdict(tools){
  let worst = null
  for (const t of tools){
    if (worst === null || (SEV[t.v] ?? 0) > (SEV[worst.v] ?? 0)) worst = t
  }
  return worst
}

function argTokens(s){
  const out = new Set()
  for (const w of String(s).split(/[^\w一-鿿./-]+/)) if (w.length > 2) out.add(w)
  return out
}

/** 参数相似度：token 集 Jaccard，用于识别「几乎相同的重复调用」。 */
export function argSimilarity(a, b){
  const ta = argTokens(a), tb = argTokens(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const w of ta) if (tb.has(w)) inter += 1
  return inter / (ta.size + tb.size - inter)
}

/* ==================== 分析层（v0.7）：失败恢复链 + 模型上下文窗口 ==================== */

/** 包管理器脚本调用的前缀：`pnpm -r test` / `npm --prefix x run build` / `yarn -s lint` 这类带旗标的写法。 */
const PM = '^(?:npm|pnpm|yarn|bun)\\s+(?:(?:-{1,2}[\\w-]+(?:=\\S+)?|(?:-F|--filter|-C|--dir|--prefix|-w|--workspace|--cwd)\\s+\\S+)\\s+)*(?:run\\s+|run-script\\s+)?'
/** 直接执行二进制的启动器：npx / pnpm exec / yarn / bun x / node_modules/.bin/……，可无。 */
const RUNNER = '^(?:(?:npx|bunx|pnpx|pnpm(?:\\s+exec|\\s+dlx|\\s+run)?|npm\\s+exec|yarn(?:\\s+exec|\\s+run)?|bun(?:\\s+x|\\s+run)?)\\s+(?:-{1,2}[\\w-]+(?:=\\S+)?\\s+)*(?:--\\s+)?|\\.?\\/?(?:\\S*\\/)?node_modules\\/\\.bin\\/)?'
/** `python -m xxx`（含 python3.12 / py / pypy）。 */
const PY_M = '^(?:python[0-9.]*|py|pypy[0-9]*)\\s+(?:-[\\w-]+\\s+)*-m\\s+'
/** 命令词之后必须是空白、行尾或 shell 边界，`vitest.config.ts`、`pytest.ini` 这类文件名不算命令。 */
const END = '(?=\\s|$|[;&|)])'

export const ANALYSIS_RULES = {
  /** 失败恢复窗口（秒）：失败后任意工具在此窗口内出现成功调用即算「已恢复」。 */
  RECOVERY_WINDOW: 120,
  /** 恢复方式分类：失败后下一次同工具调用的参数相似度 ≥ 此值判「原样重试」，否则「换参数」。 */
  IDENTICAL_SIMILARITY: 0.6,

  /* ---- 结果与证据（诊断层第 1 项，2026-09-06）---- */
  /** 只在这些工具的命令文本里识别验证类命令；code 模式的 run_code 另计（脚本内部派发的真实工具日志未展开）。 */
  SHELL_TOOLS: ['bash', 'shell', 'sh', 'zsh', 'exec', 'shell_command', 'run_command', 'terminal', 'local_shell'],
  /** code 模式的外层调用名：命中即在结果块里如实标注「内部派发暂不识别」。 */
  CODE_TOOLS: ['run_code'],
  /** 产物 = 这些写入/编辑类调用成功触及的文件路径（去重）；todo_write 不是产物。 */
  ARTIFACT_TOOLS: ['write', 'edit', 'multi_edit', 'apply_patch', 'write_file', 'edit_file', 'create_file', 'str_replace_editor', 'str_replace_based_edit_tool', 'notebook_edit'],
  /** 最后一轮以这些原因收尾即「任务未完成」：error（终局失败）/ interrupted（崩溃遗留）/ aborted（用户或父会话取消）/ blocked。
   *  max-tokens 不在其中——轮次仍算结束，但结果块会写明原因。 */
  TURN_END_INCOMPLETE: ['error', 'interrupted', 'aborted', 'blocked'],
  /**
   * 验证类命令识别：命令按 shell 边界（换行、&&、||、;、|、$(、反引号）拆成片段，每个片段
   * 剥掉命令位置前的包装（环境变量赋值、time/sudo/env、timeout N、poetry/uv run、do/then/if
   * 等关键字）后，在**命令位置**匹配下面的正则——`cat vitest.config.ts`、`grep pytest`、
   * `wc -l build-all.sh` 都不算跑了验证。一条命令命中多类分别记（`pnpm lint && pnpm test`）。
   * 初版覆盖 JS/TS、Python、Rust、Go、Swift 与 make/ctest/docker build；项目自定义的测试
   * 包装脚本（如 `deploy/x.sh test_y.py`）识别不到，块里会如实显示「没有跑」。
   */
  VALIDATION: {
    test: [
      // 项目自定义的 `check` 脚本（如本仓库的 pnpm check = 类型检查 + 测试 + 构建）按测试计——2026-09-06 吴昊拍板
      new RegExp(PM + '(?:test|t|tests|check)(?::[\\w:.-]+)?' + END),
      new RegExp(RUNNER + '(?:vitest|jest|mocha|ava|tap|tape|uvu|karma|jasmine|cypress\\s+run|playwright\\s+test|bun\\s+test|deno\\s+test)' + END),
      /^node\s+(?:-[\w-]+\s+)*--test(?=\s|$|[;&|)])/,
      /^(?:pytest|py\.test|nose2|nosetests|tox)(?=\s|$|[;&|)])/,
      new RegExp(PY_M + '(?:pytest|unittest|nose2)' + END),
      /^cargo\s+(?:\+\S+\s+)?(?:test|nextest)(?=\s|$|[;&|)])/,
      /^go\s+test(?=\s|$|[;&|)])/,
      /^swift\s+test(?=\s|$|[;&|)])/,
      /^xcodebuild\b(?=.*\s(?:test|test-without-building)(?=\s|$|[;&|)]))/,
      /^(?:make\s+(?:-[\w-]+\s+)*(?:test|check)|ctest)(?=\s|$|[;&|)])/,
      // 直接执行测试文件：sh x_test.sh / python3 test_x.py / node x.test.js / ./x_test.sh（`sh -n` 只查语法，不算跑）
      /^(?:sh|bash|zsh|dash|python[0-9.]*|py|node|bun|tsx|ts-node)\s+(?:-(?!n(?:\s|$))[\w-]+\s+)*(?:\S*\/)?(?:test_[\w.-]*\.py|[\w.-]*_test\.(?:sh|py|js|mjs|cjs|ts|mts)|[\w.-]*\.(?:test|spec)\.(?:js|mjs|cjs|ts|mts|tsx|jsx))(?=\s|$|[;&|)])/,
      /^(?:\.\/|\S*\/)?[\w.-]*_test\.sh(?=\s|$|[;&|)])/,
    ],
    build: [
      new RegExp(PM + '(?:build|typecheck|type-check|tsc|compile|bundle)(?::[\\w:.-]+)?' + END),
      new RegExp(RUNNER + '(?:tsc|vite\\s+build|next\\s+build|nuxt\\s+build|tsup|tsdown|esbuild|rollup|webpack|turbo\\s+(?:run\\s+)?build|nx\\s+build|ng\\s+build|vue-cli-service\\s+build)' + END),
      /^cargo\s+(?:\+\S+\s+)?(?:build|check)(?=\s|$|[;&|)])/,
      /^go\s+build(?=\s|$|[;&|)])/,
      /^swift\s+build(?=\s|$|[;&|)])/,
      /^xcodebuild\b(?!.*\s(?:test|test-without-building)(?=\s|$|[;&|)]))/,
      /^make(?:\s+-[\w=-]+)*(?:\s+(?:all|build))?\s*$/,
      /^cmake\s+--build(?=\s|$|[;&|)])/,
      /^docker\s+(?:buildx\s+)?build(?=\s|$|[;&|)])/,
      /^docker\s+compose\s+(?:-[\w-]+(?:=\S+)?\s+)*build(?=\s|$|[;&|)])/,
    ],
    lint: [
      new RegExp(PM + '(?:lint|eslint|stylelint|format:check|prettier:check|fmt:check)(?::[\\w:.-]+)?' + END),
      new RegExp(RUNNER + '(?:eslint|oxlint|biome\\s+(?:lint|check|ci)|stylelint|prettier\\s+(?:-c|--check)|tslint|standard|xo)' + END),
      /^(?:ruff\s+check|ruff\s+format\s+--check|flake8|pylint|mypy|pyright|black\s+--check|isort\s+(?:--check|--check-only|-c)|bandit|pyflakes|pycodestyle)(?=\s|$|[;&|)])/,
      new RegExp(PY_M + '(?:ruff|flake8|pylint|mypy|pyright|pyflakes|pycodestyle|bandit)' + END),
      /^cargo\s+(?:\+\S+\s+)?(?:clippy|fmt\s+(?:--all\s+)?--check)(?=\s|$|[;&|)])/,
      /^(?:go\s+vet|golangci-lint|staticcheck|gofmt\s+-l|goimports\s+-l)(?=\s|$|[;&|)])/,
      /^(?:swiftlint|swift-format\s+lint)(?=\s|$|[;&|)])/,
      /^make\s+(?:-[\w-]+\s+)*lint(?=\s|$|[;&|)])/,
      /^(?:shellcheck|hadolint|yamllint|markdownlint(?:-cli2?)?|actionlint)(?=\s|$|[;&|)])/,
    ],
  },
  /** shell 片段边界。 */
  VALIDATION_SPLIT: /\r?\n|&&|\|\||;|\||\$\(|`/,
  /**
   * 拆片段前先抹掉 heredoc 正文（`<<'PY' … PY`）：2026-09-06 真实日志里大量 `python3 - <<'PY'` 脚本在
   * **编辑**测试文件，脚本正文里的 `sh x_test.sh` 字样和正则串里的 `…|docker build|…` 都会被当成命令。
   * 只留 `<<TAG` 这一行本身。
   */
  HEREDOC: /<<-?\s*(['"]?)([A-Za-z_][\w-]*)\1[^\n]*\n[\s\S]*?\n[ \t]*\2[ \t]*(?=\n|$)/g,
  /**
   * 拆片段前再抹掉引号串的内容（`git commit -m "…多行… sh x_test.sh…"`、`echo "npm test"`），
   * 但 `-c` / `-lc` 之后的那段是要执行的脚本，保留内容（`bash -lc "go test ./..."`）。
   */
  QUOTED: /(-[A-Za-z]*c\s+)?(?:"((?:[^"\\]|\\[\s\S])*)"|'([^']*)')/g,
  /** 命令位置前可剥掉的包装（循环剥到不变为止）；`bash -lc` 这类壳也在内，Codex 的数组形式命令走它。 */
  VALIDATION_WRAP: /^(?:[A-Za-z_]\w*=(?:"[^"]*"|'[^']*'|\S*)\s+|(?:time|sudo|nice|nohup|env|command|exec|builtin|do|then|else|if|elif|while|until|timeout\s+\S+|poetry\s+run|uv\s+run|pipenv\s+run|hatch\s+run|pdm\s+run|conda\s+run|(?:bash|sh|zsh|dash)\s+-[A-Za-z]*c)\s+(?:-{1,2}[\w-]+(?:=\S+)?\s+)*)/,
  /** 退出码只认返回文本的**末行**：dsh 的 bash 工具在末尾追加 `[exit code: N]`（仅非零），
   *  后台任务 job_output 末行是 `[status: completed, exit code: N]`；正文中间引用别的日志里的
   *  "exit code: 1"（如 docker 构建输出被 head 出来）不算本次命令失败——2026-09-06 真实日志核对。 */
  EXIT_CODE: /\bexit[ _]code[:=]?\s*(\d+)\)?\]?\.?\s*$/i,
}

/**
 * 失败恢复链分析（纯读取，不改任何判定）：对时间序已结算调用，给每个失败调用
 * 定出「失败之后发生了什么」。mode 看失败后的下一次调用：
 *   'identical' = 同工具且参数相似度 ≥ 阈值（原样重试）
 *   'strategy'  = 同工具但参数明显变了（换参数）
 *   'switch'    = 换了别的工具
 *   'none'      = 之后再无任何调用（失败收尾）
 * recover 取失败后第一次成功调用（任意工具）：恢复 = 执行回到成功推进，
 * recoverSec 为失败起点到该次成功开始的墙钟秒数，超出 RECOVERY_WINDOW 也如实给出。
 * calls 须按时间序传入 {name, args, v, s, e}；返回数组与失败调用一一对应（带原下标 i）。
 */
export function analyzeFailureChains(calls){
  const chains = []
  for (let i = 0; i < calls.length; i++){
    if (calls[i].v !== 'error') continue
    const next = calls[i + 1] ?? null
    let mode = 'none'
    if (next !== null){
      if (next.name !== calls[i].name) mode = 'switch'
      else mode = argSimilarity(calls[i].args, next.args) >= ANALYSIS_RULES.IDENTICAL_SIMILARITY ? 'identical' : 'strategy'
    }
    let recoverSec = null
    for (let j = i + 1; j < calls.length; j++){
      if (calls[j].v === 'ok'){ recoverSec = Math.max(0, Math.round((calls[j].s - calls[i].s) * 10) / 10); break }
    }
    chains.push({ i, name: calls[i].name, s: calls[i].s, mode, recoverSec,
      recovered: recoverSec !== null && recoverSec <= ANALYSIS_RULES.RECOVERY_WINDOW })
  }
  return chains
}

/**
 * 区间合并求和：gap 秒内视为连续（与页面空闲折叠同口径），返回合并后的总时长。
 * 「工具占比」的分母用它——27 小时挂机的会话不该把密集的工具活动稀释成 1%。
 * @param iv [[s,e],...] 任意序；e < s 的脏区间按点处理
 * @param gap 视为连续的最大间隔（秒）
 */
export function mergeIntervalsTotal(iv, gap){
  if (iv.length === 0) return 0
  const v = [...iv].sort((a, b) => a[0] - b[0])
  let total = 0, cs = v[0][0], ce = Math.max(v[0][1], v[0][0])
  for (const [s, e0] of v){
    const e = Math.max(e0, s)
    if (s <= ce + gap) ce = Math.max(ce, e)
    else { total += ce - cs; cs = s; ce = e }
  }
  return total + (ce - cs)
}

/** 最近邻分位数（P50/P95 用）：空数组为 0，单样本即该样本。刻意用最近邻不用线性插值——
 * 可视化「看个大概」的场景里，样本少时宁可取真实观测值也不造一个不存在的中间数。 */
export function percentile(arr, p){
  if (arr.length === 0) return 0
  const v = [...arr].sort((a, b) => a - b)
  return v[Math.min(v.length - 1, Math.max(0, Math.ceil(p / 100 * v.length) - 1))]
}

/**
 * 该泳道时间序的已结算工具调用（带节点引用，供点击定位）。三类不进统计：
 * 子代理聚合节点（独立上下文）、请求级失败标记（无工具）、在途调用——判据只能是
 * e == null（实时链路在途工具创建时 dur 就是 0，拿 dur 当判据守卫会永不生效，踩过）。
 */
export function settledLaneCalls(lane){
  const out = []
  for (const n of [...lane.main, ...lane.detours]){
    if (n.sub || n.evt) continue
    for (const tl of n.tools ?? []){
      if (tl.e == null) continue
      out.push({ tl, n })
    }
  }
  out.sort((a, b) => (a.tl.s ?? 0) - (b.tl.s ?? 0))
  return out
}

/** 请求级失败计数（llm/retry / turn/end error 标记节点）：不属于工具统计，
 * 但全程失败的会话不能在分析卡上亮绿灯——单独计数列在卡内。 */
export function countRequestFailures(lane){
  return [...lane.main, ...lane.detours].filter(n => n.evt).length
}

/** 工具结果矩阵聚合：Map(name → { calls, ok, error, deadend, retry, durs })。 */
export function toolMatrix(calls){
  const m = new Map()
  for (const tl of calls){
    const g = m.get(tl.name) ?? { calls: 0, ok: 0, error: 0, deadend: 0, retry: 0, durs: [] }
    g.calls += 1
    g[tl.v] = (g[tl.v] ?? 0) + 1
    g.durs.push(tl.dur ?? 0)
    m.set(tl.name, g)
  }
  return m
}

/**
 * 同任务可比性：对比件（对齐线/锚点/盘点）的开关判定 + 图例要说的原因。
 * 图例要说真话：缺首条用户消息不是「任务不同」，是「没法判定」——两种原因分开。
 * @param firstUsers 各泳道首条用户消息文本（空串 = 该文件没有用户消息）
 * @returns { sameTask, reason: 'same' | 'diff' | 'no-first-user' | 'single' }
 */
export function taskComparability(firstUsers){
  if (firstUsers.length < 2) return { sameTask: false, reason: 'single' }
  if (firstUsers.some(f => !f)) return { sameTask: false, reason: 'no-first-user' }
  const sameTask = firstUsers.every(f => f === firstUsers[0])
  return { sameTask, reason: sameTask ? 'same' : 'diff' }
}

/**
 * 模型 → 上下文窗口（token）。上下文压力轨道用它把绝对输入量换算成占用百分比；
 * 匹配不到时返回 null，轨道诚实回退为绝对 token 数（不猜窗口）。
 * 数值取各家公开文档口径（2026-08），新模型按需补行——只加确定的，不加猜的。
 */
export const CONTEXT_WINDOWS = [
  [/deepseek-v4/i, 1_000_000],   // V4 系列（pro/flash）官方 1M：https://huggingface.co/blog/deepseekv4
  [/deepseek/i, 128_000],        // V3 线与 deepseek-chat/reasoner
  [/kimi|moonshot/i, 256_000],
  [/qwen/i, 128_000],
  [/glm/i, 128_000],
  [/gpt-5/i, 400_000],
  [/gpt-4\.1/i, 1_000_000],
  [/gpt-4o|o[34]-mini|o3\b/i, 128_000],
  [/claude/i, 200_000],
  [/gemini/i, 1_000_000],
]

/**
 * 按模型名解析上下文窗口。
 * @param model 模型名（可空）
 * @returns 窗口 token 数；未知模型返回 null
 */
export function contextWindowFor(model){
  if (!model) return null
  for (const [re, win] of CONTEXT_WINDOWS) if (re.test(model)) return win
  return null
}

/**
 * 盲目重试簇标注（借 AgentLens 的确定性检测）：时间序上连续的「同工具 + 参数相似」
 * 调用簇，且簇内至少一次失败，才算盲目重试——不加失败约束会把「连续编辑同一文件」
 * 这类正常工作方式冤枉进去（edit 参数只有文件路径）。就地把簇内非失败调用改判
 * v='retry' 并写结构化依据；失败调用保持 error，簇上下文追加在 why2。返回命中簇数。
 * calls 必须按时间序传入，且只传已有结果的调用（实时模式排除 in-flight）。
 */
export function markRetryClusters(calls){
  let clusters = 0
  let start = 0
  for (let i = 1; i <= calls.length; i++){
    const brk = i === calls.length
      || calls[i].name !== calls[i - 1].name
      || argSimilarity(calls[i].args, calls[i - 1].args) < VERDICT_RULES.RETRY_SIMILARITY
    if (!brk) continue
    const len = i - start
    if (len >= VERDICT_RULES.RETRY_MIN_CLUSTER){
      const cluster = calls.slice(start, i)
      const fails = cluster.filter(c => c.v === 'error').length
      if (fails > 0){
        clusters += 1
        for (const c of cluster){
          if (c.v === 'error') c.why2 = { k: 'retryCtx', p: [len] }
          else { c.v = 'retry'; c.why = { k: 'retryCluster', p: [len, fails] } }
        }
      }
    }
    start = i
  }
  return clusters
}

/* ==================== 诊断层第 1 项（2026-09-06）：结果与证据 ==================== */

/** 工具参数：实时链路给的是原始 JSON 字符串，上传链路给的是 argSummary 摘要（命令 / 路径）；两种都收。 */
function parseArgs(args){
  if (args != null && typeof args === 'object') return args
  const s = String(args ?? '')
  try {
    const v = JSON.parse(s)
    return v != null && typeof v === 'object' ? v : s
  } catch { return s }
}

/** 一次 shell 类调用的命令文本；参数里没有命令时 null。Codex 风格的 `command: [...]` 数组也收。 */
export function commandOf(args){
  const a = parseArgs(args)
  if (typeof a === 'string') return a
  if (typeof a.command === 'string') return a.command
  if (Array.isArray(a.command)) return a.command.map(String).join(' ')
  if (typeof a.cmd === 'string') return a.cmd
  return null
}

/** 命令拆成 shell 片段并剥掉命令位置前的包装（见 VALIDATION_WRAP）；heredoc 正文与引号串内容先抹掉。 */
function commandSegments(command){
  const out = []
  const text = String(command ?? '')
    .replace(ANALYSIS_RULES.HEREDOC, (m, q, tag) => '<<' + tag)
    .replace(ANALYSIS_RULES.QUOTED, (m, c, dq, sq) => c !== undefined ? c + (dq ?? sq ?? '') : '""')
  for (const raw of text.split(ANALYSIS_RULES.VALIDATION_SPLIT)){
    let s = raw.replace(/^[\s({!]+/, '').trimEnd()
    let prev
    do { prev = s; s = s.replace(ANALYSIS_RULES.VALIDATION_WRAP, '') } while (s !== prev)
    if (s !== '') out.push(s)
  }
  return out
}

/** 片段归一：去掉重定向与多余空白——`sh x_test.sh >/dev/null 2>&1` 和 `sh x_test.sh` 是同一条命令。 */
function normalizeSegment(seg){
  return seg.replace(/\s*(?:\d*>>?\s*\S+|\d*>&\d+|<\s*\S+)/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * 一条命令里命中验证类别的片段：{ test: [...], build: [...], lint: [...] }，片段已归一去重。
 * 只看命令位置（`cat vitest.config.ts`、`grep -n pytest` 不算），规则见 ANALYSIS_RULES.VALIDATION。
 * 「同一条命令多次执行取最后一次」按这里的片段算，而不是整行 bash——`cd x && sh a_test.sh` 与
 * `sh a_test.sh 2>&1 | tail -3` 跑的是同一个测试。
 */
export function validationHits(command){
  const segs = commandSegments(command)
  const hits = { test: [], build: [], lint: [] }
  for (const kind of ['test', 'build', 'lint']){
    const pats = ANALYSIS_RULES.VALIDATION[kind]
    for (const seg of segs){
      if (!pats.some(re => re.test(seg))) continue
      const key = normalizeSegment(seg)
      if (key !== '' && !hits[kind].includes(key)) hits[kind].push(key)
    }
  }
  return hits
}

/** 一条命令命中的验证类别，固定序 ['test','build','lint'] 的子集；一条命令命中多类分别记。 */
export function detectValidationKinds(command){
  const hits = validationHits(command)
  return ['test', 'build', 'lint'].filter(k => hits[k].length > 0)
}

/**
 * 返回文本末行里的退出码；没有则 null。要传**未压空白**的原文（两条链路都在截断/压空白前算好
 * 存到 tl.exit）；压过空白的文本整段算一行，dsh 追加在末尾的 `[exit code: N]` 仍能命中。
 */
export function exitCodeOf(text){
  const t = String(text ?? '').trimEnd()
  if (t === '') return null
  const line = t.slice(t.lastIndexOf('\n') + 1)
  const m = ANALYSIS_RULES.EXIT_CODE.exec(line)
  return m ? Number(m[1]) : null
}

/** 验证类调用是否通过：isError 为假且末行没有非零退出码。judged v 刻意不参与——退出码才是命令的裁判。 */
export function validationPassed(tl){
  if (tl.err) return false
  const code = tl.exit !== undefined ? tl.exit : exitCodeOf(tl.resFull ?? tl.res ?? '')
  return !(typeof code === 'number' && code !== 0)
}

/** apply_patch 补丁文本里触及的文件（Add/Update/Delete File 头）。 */
function patchPaths(text){
  const out = []
  const re = /\*\*\* (?:Add|Update|Delete) File: ([^\n\r"]+)/g
  let m
  while ((m = re.exec(String(text ?? ''))) !== null) out.push(m[1].trim())
  return out
}

/** 写入/编辑类调用触及的文件路径（可能多条：补丁）；识别不出路径时空数组。 */
export function artifactPaths(name, args){
  const a = parseArgs(args)
  if (typeof a !== 'string'){
    for (const k of ['file_path', 'path', 'filePath', 'filename', 'target_file', 'notebook_path']){
      if (typeof a[k] === 'string' && a[k].trim() !== '') return [a[k].trim()]
    }
    return patchPaths(typeof a.patch === 'string' ? a.patch : typeof a.input === 'string' ? a.input : '')
  }
  const s = a.trim()
  if (s === '') return []
  if (s.includes('*** ') && /\*\*\* (?:Add|Update|Delete) File:/.test(s)) return patchPaths(s)
  return [s]   // 上传链路的参数摘要就是文件路径
}

/**
 * 结果与证据：六格 + 综合。全部是对已判定数据的确定性聚合，不信 Agent 自述。
 *   任务完成 = 最后一轮 turn/end 的原因不在 TURN_END_INCOMPLETE 里且该轮最后一步是回答节点；
 *   测试/构建/Lint = shell 类调用命令按 detectValidationKinds 归类，同一条命令多次执行取最后一次，
 *     类别通过 = 该类每条不同命令的最后一次都通过（anchor 指向决定性的那次：最后一次失败，否则最后一次运行）；
 *   产物 = 写入/编辑类调用成功触及的文件去重；
 *   人工确认 = 最终回答之后有没有用户消息（只给布尔，不解读内容）；
 *   综合：任务没正常结束 → partial；有验证类命令且某类最后一次失败 → partial；一条验证命令都没有 → unverified；其余 done。
 * @param lane { main, detours, turnEnds?: [{turn, kind, s}], userMsgs?: [{s}] }（s 为墙钟秒，不随空闲折叠变）
 * @param wall 节点坐标 → 墙钟秒（页面折叠过时间轴时传 wallClock；否则恒等）
 */
export function outcomeEvidence(lane, wall){
  const toWall = typeof wall === 'function' ? wall : (t => t)
  const calls = settledLaneCalls(lane)
  const R = ANALYSIS_RULES
  const mk = () => ({ runs: 0, byCmd: new Map(), last: null })
  const kinds = { test: mk(), build: mk(), lint: mk() }
  let codeCalls = 0
  const paths = new Map()
  let writes = 0, failedWrites = 0
  for (const c of calls){
    const name = c.tl.name
    if (R.CODE_TOOLS.includes(name)) codeCalls += 1
    if (R.ARTIFACT_TOOLS.includes(name)){
      const ps = artifactPaths(name, c.tl.args)
      if (ps.length > 0){
        if (c.tl.err || c.tl.v === 'error') failedWrites += 1
        else { writes += 1; for (const p of ps) paths.set(p, (paths.get(p) ?? 0) + 1) }
      }
      continue
    }
    if (!R.SHELL_TOOLS.includes(name)) continue
    const cmd = commandOf(c.tl.args)
    if (cmd === null || cmd.trim() === '') continue
    const hits = validationHits(cmd)
    const passed = validationPassed(c.tl)
    for (const k of ['test', 'build', 'lint']){
      if (hits[k].length === 0) continue
      const g = kinds[k]
      g.runs += 1
      // 同一条命令（归一后的片段）多次执行：后者覆盖前者；退出码是整次调用的，片段共享它
      for (const key of hits[k]) g.byCmd.set(key, { call: c, passed, cmd: key })
      g.last = { call: c, passed, cmd: hits[k][hits[k].length - 1] }
    }
  }
  const out = {}
  for (const k of ['test', 'build', 'lint']){
    const g = kinds[k]
    const failed = [...g.byCmd.values()].filter(x => !x.passed).sort((a, b) => a.call.tl.s - b.call.tl.s)
    const decisive = failed.length > 0 ? failed[failed.length - 1] : g.last
    out[k] = {
      runs: g.runs, commands: g.byCmd.size, failedCommands: failed.length,
      passed: g.runs === 0 ? null : failed.length === 0,
      anchor: decisive ? decisive.call : null,
      anchorCmd: decisive ? decisive.cmd : null,
      anchorExit: decisive ? (decisive.call.tl.exit ?? null) : null,
    }
  }

  // 任务完成：最后一轮（步骤与 turn/end 里最大的轮次）怎么收的尾
  const steps = [...lane.main, ...lane.detours].filter(n => !n.sub && !n.evt)
  const turnEnds = lane.turnEnds ?? []
  let lastTurn = 0
  for (const n of steps) lastTurn = Math.max(lastTurn, n.turn ?? 1)
  for (const t of turnEnds) lastTurn = Math.max(lastTurn, t.turn ?? 1)
  const running = steps.some(n => n.live && (n.turn ?? 1) === lastTurn)
  const inTurn = steps.filter(n => !n.live && (n.turn ?? 1) === lastTurn).sort((a, b) => a.s - b.s || a.e - b.e)
  const lastNode = inTurn.length > 0 ? inTurn[inTurn.length - 1] : null
  const answer = lastNode !== null && lastNode.v === 'answer' ? lastNode : null
  const end = turnEnds.filter(t => (t.turn ?? 1) === lastTurn).pop() ?? null
  let state
  if (running) state = 'running'
  else if (end !== null && R.TURN_END_INCOMPLETE.includes(end.kind)) state = 'failed'
  else if (end === null) state = 'unfinished'
  else if (answer === null) state = 'noAnswer'
  else state = 'done'
  const task = { state, turn: lastTurn > 0 ? lastTurn : null, reason: end ? end.kind : null, answer }

  // 人工确认：最终回答之后有没有真人消息（source.kind = user）
  const responded = answer === null ? null
    : (lane.userMsgs ?? []).some(u => u.s > toWall(answer.e))

  const anyValidation = out.test.runs + out.build.runs + out.lint.runs > 0
  const failedKinds = ['test', 'build', 'lint'].filter(k => out[k].passed === false)
  const missing = ['test', 'build', 'lint'].filter(k => out[k].runs === 0)
  const overall = state !== 'done' ? 'partial'
    : !anyValidation ? 'unverified'
    : failedKinds.length > 0 ? 'partial'
    : 'done'
  return {
    task, test: out.test, build: out.build, lint: out.lint,
    artifacts: { paths: [...paths.keys()], writes, failedWrites },
    human: { responded, answerAt: answer !== null ? toWall(answer.e) : null },
    overall, failedKinds, missing, anyValidation, codeCalls,
  }
}
