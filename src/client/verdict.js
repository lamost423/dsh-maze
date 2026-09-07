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
  /** 命令位置前可剥掉的包装（循环剥到不变为止）；`bash -lc` 这类壳也在内，Codex 的数组形式命令走它。
   *  `command` 刻意不在内：`command -v pytest` 是探测有没有装，不是跑测试（评审 P2-2）。 */
  VALIDATION_WRAP: /^(?:[A-Za-z_]\w*=(?:"[^"]*"|'[^']*'|\S*)\s+|(?:time|sudo|nice|nohup|env|exec|builtin|do|then|else|if|elif|while|until|timeout\s+\S+|poetry\s+run|uv\s+run|pipenv\s+run|hatch\s+run|pdm\s+run|conda\s+run|(?:bash|sh|zsh|dash)\s+-[A-Za-z]*c)\s+(?:-{1,2}[\w-]+(?:=\S+)?\s+)*)/,
  /** 命中片段的参数只剩这些旗标时是探测（`pytest --version`、`go test -h`、`cargo test --help`），不算跑了验证。 */
  PROBE_FLAGS: /^(?:--version|-V|--help|-h)$/,
  /** bash 带 run_in_background 时结果只有这一句；真正的退出码在后面 job_output 的末行，按 job id 关联（评审 P2-1）。 */
  BACKGROUND_JOB: /^started background job (\S+)/i,
  /** 后台任务读取工具：参数里的 job_id 关联回起任务的那次 shell 调用。 */
  JOB_TOOLS: ['job_output'],
  /** 退出码只认返回文本的**末行**，且必须在行首、`[` 之后或逗号之后：dsh 的 bash 工具在末尾追加
   *  `[exit code: N]`（仅非零），后台任务 job_output 末行是 `[status: completed, exit code: N]`；
   *  正文中间引用别的日志里的 "exit code: 1"（如 docker 构建输出被 head 出来）、末行的
   *  "expected exit code: 1"（评审 P3-7）都不算本次命令的退出码——2026-09-06 真实日志核对。 */
  EXIT_CODE: /(?:^|\[|,\s*)exit[ _]code[:=]?\s*(\d+)\)?\]?\.?\s*$/i,
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

/**
 * 命令拆成 shell 片段并剥掉命令位置前的包装（见 VALIDATION_WRAP）。每个片段给两份：
 *   m   = 抹掉 heredoc 正文、引号串内容换成等长下划线（`-c "…"` 的脚本体保留）——只用于正则匹配；
 *   raw = 同一片段的原文（heredoc 正文同样抹掉）——归一 key 用它，`pytest -k "a"` 和 `pytest -k "b"`
 *         不会碰成一条（评审 P2-3）。等长替换保证两份文本的切分位置一致。
 */
function commandSegments(command){
  const out = []
  const raw = String(command ?? '').replace(ANALYSIS_RULES.HEREDOC, (m, q, tag) => '<<' + tag)
  const blank = raw.replace(ANALYSIS_RULES.QUOTED, (m, c) => c !== undefined ? m : m[0] + '_'.repeat(m.length - 2) + m[m.length - 1])
  const split = new RegExp(ANALYSIS_RULES.VALIDATION_SPLIT.source, 'g')
  const spans = []
  let pos = 0, mm
  while ((mm = split.exec(blank)) !== null){
    spans.push([pos, mm.index])
    pos = mm.index + mm[0].length
    if (mm[0] === '') split.lastIndex += 1
  }
  spans.push([pos, blank.length])
  for (const [a, b] of spans){
    const m0 = blank.slice(a, b).trimEnd()
    let m = m0
    let prev
    do {
      prev = m
      m = m.replace(/^[\s({!"']+/, '').replace(ANALYSIS_RULES.VALIDATION_WRAP, '')
    } while (m !== prev)
    const r = raw.slice(a, b).slice(m0.length - m.length, m0.length)
    // 匹配副本再去掉尾引号（`sh -c 'cargo clippy'` 的脚本体收尾）；原文副本保留引号，归一时只去不成对的那个
    m = m.replace(/["']+$/, '')
    if (m !== '') out.push({ m, raw: r })
  }
  return out
}

/** 探测命令：命令词之外只剩 --version / -V / --help / -h（评审 P2-2）。 */
function isProbe(seg){
  const rest = seg.split(/\s+/).slice(1)
    .filter(t => !/^(?:run|run-script|exec|dlx|x|test|t|tests|check|build|lint|typecheck|type-check|compile|bundle|eslint|stylelint|nextest|clippy|vet)(?::[\w:.-]+)?$/.test(t))
  return rest.length > 0 && rest.every(t => ANALYSIS_RULES.PROBE_FLAGS.test(t))
}

/** 片段归一：去掉重定向、`$(…)` 留下的尾括号（评审 P3-8）与多余空白——`sh x_test.sh >/dev/null 2>&1` 和 `sh x_test.sh` 是同一条命令。 */
function normalizeSegment(seg){
  let s = seg.replace(/\s*(?:\d*>>?\s*\S+|\d*>&\d+|<\s*\S+)/g, '').replace(/[\s)]+$/, '').replace(/\s+/g, ' ').trim()
  // `bash -lc "go test"` 剥壳后原文只剩收尾的那个引号：不成对才去掉，`pytest -k "a"` 的成对引号保留
  for (const q of ['"', "'"]) if (s.endsWith(q) && (s.split(q).length - 1) % 2 === 1) s = s.slice(0, -1).trimEnd()
  return s
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
      if (!pats.some(re => re.test(seg.m)) || isProbe(seg.m)) continue
      const key = normalizeSegment(seg.raw)
      if (key !== '' && !hits[kind].includes(key)) hits[kind].push(key)
    }
  }
  return hits
}

/** job_output 类调用的 job id（原始 JSON 或摘要串）；没有则 null。 */
export function jobIdOf(args){
  const a = parseArgs(args)
  if (typeof a === 'string') return a.trim() === '' ? null : a.trim()
  for (const k of ['job_id', 'jobId', 'id']) if (typeof a[k] === 'string' && a[k] !== '') return a[k]
  return null
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
 *   测试/构建/Lint = shell 类调用命令按 validationHits 归类，类别通过 = 该类别最后一次运行通过
 *     （anchor 指向它）；此前别的命令最后一次失败的条数记在 failedCommands，展示端小字注明；
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
  const mk = () => ({ runs: 0, byCmd: new Map(), last: null, unresolved: 0 })
  const kinds = { test: mk(), build: mk(), lint: mk() }
  let codeCalls = 0
  const paths = new Map()
  let writes = 0, failedWrites = 0
  /** 后台任务：起任务的那次 shell 调用先挂着，等 job_output 末行给出退出码再计入（评审 P2-1）。 */
  const bgPending = new Map()
  const record = (call, hits, passed, exit) => {
    for (const k of ['test', 'build', 'lint']){
      if (hits[k].length === 0) continue
      const g = kinds[k]
      g.runs += 1
      // 同一条命令（归一后的片段）多次执行：后者覆盖前者；退出码是整次调用的，片段共享它
      for (const key of hits[k]) g.byCmd.set(key, { call, passed, cmd: key, exit })
      g.last = { call, passed, cmd: hits[k][hits[k].length - 1], exit }
    }
  }
  for (const c of calls){
    const name = c.tl.name
    if (R.CODE_TOOLS.includes(name)) codeCalls += 1
    if (R.JOB_TOOLS.includes(name)){
      const pend = bgPending.get(jobIdOf(c.tl.args))
      if (pend === undefined) continue
      const code = c.tl.exit !== undefined ? c.tl.exit : exitCodeOf(c.tl.resFull ?? c.tl.res ?? '')
      if (code === null && !c.tl.err) continue   // 还在跑（[status: running]），继续挂着
      bgPending.delete(jobIdOf(c.tl.args))
      record(pend.call, pend.hits, !c.tl.err && code !== null && code === 0, code)
      continue
    }
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
    if (hits.test.length + hits.build.length + hits.lint.length === 0) continue
    const bg = R.BACKGROUND_JOB.exec(String(c.tl.res ?? c.tl.resFull ?? '').trimStart())
    if (bg !== null){ bgPending.set(bg[1], { call: c, hits }); continue }
    record(c, hits, validationPassed(c.tl), c.tl.exit ?? null)
  }
  // 起了后台任务却始终没拿到退出码的：不计入运行，格里如实标注
  for (const pend of bgPending.values()) for (const k of ['test', 'build', 'lint']) if (pend.hits[k].length > 0) kinds[k].unresolved += 1
  const out = {}
  for (const k of ['test', 'build', 'lint']){
    const g = kinds[k]
    // 类别通过与否以该类别**最后一次运行**为准（吴昊 2026-09-06 拍板的 B 方案）：单文件 pytest 失败后
    // 整套 pytest 通过就是通过；此前别的命令最后一次失败的条数另给出，格里小字注明。决定性的那次 = 最后一次运行。
    const failed = [...g.byCmd.values()].filter(x => !x.passed)
    const decisive = g.last
    out[k] = {
      runs: g.runs, commands: g.byCmd.size, failedCommands: failed.length, unresolved: g.unresolved,
      passed: decisive === null ? null : decisive.passed,
      anchor: decisive ? decisive.call : null,
      anchorCmd: decisive ? decisive.cmd : null,
      anchorExit: decisive ? decisive.exit : null,
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

/* ==================== 诊断层第 2 项（2026-09-07）：行为信号清单 ==================== */

/**
 * 阈值全部按 2026-09-06 本机 202 份会话（149 场有效）校准，脚本
 * trace-compare-verdict-calibration/behavior-signals-calib.mjs（2026-09-07 独立评审后修正三处——循环去重、签名同规则、
 * 失败改用 toolVerdict——并重跑，各条命中占比见下）；定阈值的原则：「中」落在最差的 15%~20% 会话，「高」落在最差的
 * 3%~5%。改这里必须重跑校准脚本，把命中占比记进 CHANGELOG。
 */
ANALYSIS_RULES.SIGNALS = {
  /** 轮询 / 记账类工具：不参与重复与循环计数（它们本来就要反复调）。 */
  POLL_TOOLS: ['job_output', 'todo_write', 'list_agents', 'send_message', 'wait', 'sleep'],
  /** 读取类工具（重复读取子标签用）。 */
  READ_TOOLS: ['read', 'grep', 'glob', 'ls', 'list_files', 'search'],
  /** shell 里的读取类命令（作用于命令文本开头）。 */
  READ_SHELL: /^(?:cat|sed|head|tail|rg|grep|ls|find|wc|git (?:log|status|diff|show)) /,
  /** 参数签名截断长度（与校准脚本一致）。 */
  SIG_MAX: 300,
  /** 失败后原样重试：上一次失败、这一次同工具同参数。中 ≥1，高 ≥3（按 toolVerdict 口径重跑 15% / 4%；换策略恢复 32%，信息级不设阈值）。 */
  MECHANICAL: { medium: 1, high: 3 },
  /** 同轮重复调用：占本场调用的比例且次数（低 ≥10% 且 ≥5；中 ≥20% 且 ≥10；2026-09-07 重跑校准 30% / 8%，签名与页面同规则后比首轮的 37% / 16% 低）。 */
  REPEAT: { low: { rate: 0.10, min: 5 }, medium: { rate: 0.20, min: 10 } },
  /** 重复读取子标签：同轮重复里读取类 ≥5（重跑校准 26%，只作子标签）。 */
  REPEAT_READ: 5,
  /** 循环：排除轮询类后长度 1~3 的序列连续 3 次，长窗口先扫、已覆盖的下标不再数；占用步数 中 ≥9，高 ≥30（去重后重跑校准 16% / 4%，落在目标区间）。 */
  LOOP: { medium: 9, high: 30 },
  /** 工具失败（判定 = toolVerdict，错误标志 + 输出特征）：中 = 失败率 ≥8%（且本场调用 ≥10 次，与校准集口径一致）或失败 ≥10 次；
   *  高 = 失败率 ≥15% 且 ≥10 次（2026-09-07 第二轮：校准脚本真正接上 toolVerdict 后旧阈值命中 38% / 5%，按目标区间重定；
   *  第三轮喂 toolVerdict 的文本先压空白后重跑 19% / 3%，普通模式单看 23% / 3%，code 模式几乎不失败把整体拉低）。 */
  FAIL: { medium: { count: 10, rate: 0.08, minCalls: 10 }, high: { count: 10, rate: 0.15 } },
  /** 慢调用：单次 ≥120 秒；低 ≥1 次，中 ≥3 次（校准 14% / 3%，2026-09-07 去掉压缩重发的 tool/result 后重算）。相对均值的口径在 72% 会话触发，没有区分度，已弃。 */
  SLOW_SEC: 120,
  SLOW: { low: 1, medium: 3 },
  /** 工具集中度：调用 ≥20 次且赫芬达尔指数 ≥0.85（低，校准 10%）。 */
  HHI: { minCalls: 20, min: 0.85 },
  /** 上下文骤升 / 骤降：相邻两次请求占用变化 ≥20 个百分点，只在同一窗口内比（升为中，降为信息；按逐请求窗口重跑 1% / 4%）。 */
  CTX_JUMP: 0.20,
  /** 上下文峰值占窗口：低 ≥50%，中 ≥70%，高 ≥90%（校准 11% / 5% / 0%，1M 窗口下几乎不亮）。 */
  CTX_PEAK: { low: 0.5, medium: 0.7, high: 0.9 },
  /** 压缩发生：compaction/start ≥1 为信息；prune ≥10 另加一句（校准 5%）。 */
  PRUNE_NOTE: 10,
  /** 待办陈旧：todo-freshness-guard 提醒次数 低 ≥10，中 ≥30（校准 11% / 3%）。 */
  TODO: { low: 10, medium: 30 },
}

/** 参数签名（与校准脚本同规则）：bash 取整条命令压空白，读写类取文件路径，其余取参数 JSON；截到 SIG_MAX。 */
export function callSignature(name, args){
  const a = parseArgs(args)
  let body
  if (typeof a === 'string') body = a
  else if (typeof a.command === 'string') body = a.command
  else if (Array.isArray(a.command)) body = a.command.map(String).join(' ')
  else if (typeof a.file_path === 'string') body = a.file_path
  // grep/glob 这类带 pattern 的工具与 query 类工具：和页面 argSummary 同一形态（评审 P1-2，两条链路签名一致）
  else if (typeof a.pattern === 'string') body = 'pattern=' + a.pattern + (a.path ? ' path=' + a.path : '')
  else if (typeof a.query === 'string') body = a.query
  else body = JSON.stringify(a)
  return name + '|' + String(body).replace(/\s+/g, ' ').trim().slice(0, ANALYSIS_RULES.SIGNALS.SIG_MAX)
}

/** 调用目标（换策略恢复用）：文件路径，或 shell 命令的第一个词。 */
function callTarget(name, args){
  const a = parseArgs(args)
  if (typeof a !== 'string'){
    if (typeof a.file_path === 'string') return a.file_path
    if (typeof a.path === 'string') return a.path
    if (typeof a.command === 'string' && ANALYSIS_RULES.SHELL_TOOLS.includes(name)) return (a.command.trim().match(/^([\w./-]+)/) ?? ['', ''])[1]
    return ''
  }
  if (ANALYSIS_RULES.SHELL_TOOLS.includes(name)) return (a.trim().match(/^([\w./-]+)/) ?? ['', ''])[1]
  if (['read', 'write', 'edit'].includes(name)) return a.trim()
  return ''
}

/** 严重度序，块内排序用。 */
export const SIGNAL_SEV = { high: 3, medium: 2, low: 1, info: 0 }

/**
 * 行为信号清单：对已结算调用与轮次/上下文原料的确定性聚合，每条 { type, severity, count, callIds,
 * refs（涉及的 {tl,n}，首个即点击定位目标）, why {k,p} }。各信号独立计数、口径与校准脚本逐条对应
 * （见 ANALYSIS_RULES.SIGNALS）；循环与同轮重复、原样重试与工具失败可能指向同一段调用——各自说各自
 * 的事实，展示端在方法说明里写明，不在这里互相扣减（扣减会让计数对不上校准）。
 * @param lane { main, detours, model?, ctxWindow?, compaction?: {starts:[s], prunes, summaries}, todoReminders? }
 * @param wall 节点坐标 → 墙钟秒（页面折叠过时间轴时传 wallClock）
 */
export function behaviorSignals(lane, wall){
  const R = ANALYSIS_RULES.SIGNALS
  const toWall = typeof wall === 'function' ? wall : (t => t)
  const calls = settledLaneCalls(lane).map(c => ({
    ref: c, name: c.tl.name, sig: callSignature(c.tl.name, c.tl.args), tgt: callTarget(c.tl.name, c.tl.args),
    turn: c.n.turn ?? 1, failed: c.tl.v === 'error', dur: c.tl.dur ?? 0, id: c.tl.callId ?? null,
  }))
  const out = []
  const push = (type, severity, refs, why) => out.push({
    type, severity, count: refs.length, callIds: refs.map(r => r.tl?.callId ?? null).filter(x => x !== null),
    refs, why,
  })
  const isRead = c => R.READ_TOOLS.includes(c.name)
    || (ANALYSIS_RULES.SHELL_TOOLS.includes(c.name) && R.READ_SHELL.test(c.sig.slice(c.name.length + 1)))

  // 失败后原样重试 / 换策略恢复 / 同轮重复（含读取子标签）——一趟扫描，与校准脚本同序
  const mech = [], adaptive = [], repeats = [], readRepeats = []
  const lastIdx = new Map()
  for (let i = 0; i < calls.length; i++){
    const c = calls[i], p = calls[i - 1]
    if (p && p.failed && p.sig === c.sig){ mech.push(c.ref); lastIdx.set(c.sig, i); continue }
    if (p && p.failed && p.name === c.name && p.tgt !== '' && p.tgt === c.tgt && p.sig !== c.sig && !c.failed) adaptive.push(c.ref)
    if (R.POLL_TOOLS.includes(c.name)){ lastIdx.set(c.sig, i); continue }
    if (lastIdx.has(c.sig) && calls[lastIdx.get(c.sig)].turn === c.turn){
      repeats.push(c.ref)
      if (isRead(c)) readRepeats.push(c.ref)
    }
    lastIdx.set(c.sig, i)
  }
  if (mech.length >= R.MECHANICAL.medium) push('mechanicalRetry', mech.length >= R.MECHANICAL.high ? 'high' : 'medium', mech, { k: 'sigMechanical', p: [mech.length] })
  const total = calls.length
  const repRate = total > 0 ? repeats.length / total : 0
  if (repeats.length >= R.REPEAT.low.min && repRate >= R.REPEAT.low.rate){
    const sev = repeats.length >= R.REPEAT.medium.min && repRate >= R.REPEAT.medium.rate ? 'medium' : 'low'
    push('repeat', sev, repeats, { k: 'sigRepeat', p: [repeats.length, Math.round(repRate * 100), readRepeats.length >= R.REPEAT_READ ? readRepeats.length : 0] })
  }

  // 循环：排除轮询类后，长度 1~3 的序列连续 3 次
  const seq = calls.filter(c => !R.POLL_TOOLS.includes(c.name))
  const sigs = seq.map(c => c.sig)
  // 长窗口先扫：一段被长窗口命中后短窗口不再数（评审 P1-1：9 次相同调用是 1 段 9 步，不是 24 步）
  const covered = new Set()
  let loops = 0
  for (const w of [3, 2, 1]){
    for (let at = 0; at + w * 3 <= sigs.length; at++){
      let clash = false
      for (let j = at; j < at + w * 3; j++) if (covered.has(j)){ clash = true; break }
      if (clash) continue
      const pat = sigs.slice(at, at + w).join('||')
      if ([1, 2].every(k => sigs.slice(at + k * w, at + (k + 1) * w).join('||') === pat)){
        loops += 1
        for (let j = at; j < at + w * 3; j++) covered.add(j)
        at += w * 3 - 1
      }
    }
  }
  const loopSteps = covered.size
  const loopRefs = [...covered].sort((x, y) => x - y).map(j => seq[j].ref)
  if (loopSteps >= R.LOOP.medium) push('loop', loopSteps >= R.LOOP.high ? 'high' : 'medium', loopRefs, { k: 'sigLoop', p: [loops, loopSteps] })

  // 工具失败（沿用现有判定 v = error）
  const fails = calls.filter(c => c.failed)
  const failRate = total > 0 ? fails.length / total : 0
  if (fails.length >= R.FAIL.medium.count || (total >= R.FAIL.medium.minCalls && failRate >= R.FAIL.medium.rate)){
    const sev = failRate >= R.FAIL.high.rate && fails.length >= R.FAIL.high.count ? 'high' : 'medium'
    push('toolFail', sev, fails.map(c => c.ref), { k: 'sigFail', p: [fails.length, total, Math.round(failRate * 100)] })
  }

  // 慢调用：绝对 120 秒
  const slow = calls.filter(c => c.dur >= R.SLOW_SEC).sort((a, b) => b.dur - a.dur)
  if (slow.length >= R.SLOW.low) push('slowCall', slow.length >= R.SLOW.medium ? 'medium' : 'low', slow.map(c => c.ref), { k: 'sigSlow', p: [slow.length, Math.round(slow[0].dur), slow[0].name] })

  // 工具集中度：赫芬达尔指数
  if (total >= R.HHI.minCalls){
    const cnt = new Map()
    for (const c of calls) cnt.set(c.name, (cnt.get(c.name) ?? 0) + 1)
    let hhi = 0, top = null, topN = 0
    for (const [name, n] of cnt){ hhi += (n / total) ** 2; if (n > topN){ topN = n; top = name } }
    // code 模式外层全是 run_code，集中度必然 100%、说明不了任何事——真实工具在脚本里，本版未展开，跳过
    if (hhi >= R.HHI.min && !ANALYSIS_RULES.CODE_TOOLS.includes(top)) push('concentration', 'low', calls.filter(c => c.name === top).map(c => c.ref), { k: 'sigHhi', p: [Math.round(hhi * 1000) / 1000, top, Math.round(topN / total * 100)] })
  }

  // 上下文占用：每次请求按当时的模型换算窗口（contextOccupancy）；窗口表过时（有样本超窗）时不出任何上下文信号
  const occ = contextOccupancy(lane)
  const compStarts = (lane.compaction?.starts ?? [])
  if (occ.valid && occ.samples.length > 0){
    // 窗口值不可信而被略过的样本没有占用：不参与比较，而且把比较链在它这里断开——它两侧不跨着比（评审 P2-3）
    let peak = 0, peakNode = null
    const ups = [], downs = []
    let compacted = 0
    let prev = null
    for (const sm of occ.samples){
      if (sm.ratio == null){ prev = null; continue }
      const r = sm.ratio
      if (r > peak){ peak = r; peakNode = sm.n }
      // 窗口切换处也断开：300K@1M（30%）切到 128K 模型跑 100K（78%）不是骤升，只是换了尺子（第二轮评审 A）
      if (prev !== null && prev.win === sm.win){
        const d = r - prev.ratio
        if (d >= R.CTX_JUMP) ups.push({ n: sm.n, from: prev.ratio, to: r })
        if (d <= -R.CTX_JUMP){
          const a = toWall(prev.n.s), b = toWall(sm.n.e)
          const near = compStarts.some(t => t >= a && t <= b)
          if (near) compacted += 1
          downs.push({ n: sm.n, from: prev.ratio, to: r, near })
        }
      }
      prev = sm
    }
    const nodeRef = n => ({ tl: (n.tools ?? [])[0] ?? null, n })
    if (ups.length > 0) push('ctxJump', 'medium', ups.map(x => nodeRef(x.n)), { k: 'sigCtxUp', p: [ups.length, Math.round(ups[0].from * 100), Math.round(ups[0].to * 100)] })
    if (downs.length > 0) push('ctxDrop', 'info', downs.map(x => nodeRef(x.n)), { k: 'sigCtxDown', p: [downs.length, Math.round(downs[0].from * 100), Math.round(downs[0].to * 100), compacted] })
    if (peak >= R.CTX_PEAK.low) push('ctxPeak', peak >= R.CTX_PEAK.high ? 'high' : peak >= R.CTX_PEAK.medium ? 'medium' : 'low', [nodeRef(peakNode)], { k: 'sigCtxPeak', p: [Math.round(peak * 1000) / 10, occ.peakWin] })
  }

  // 压缩发生 / 待办陈旧 / 换策略恢复
  const comp = lane.compaction
  if (comp && comp.starts.length >= 1) push('compaction', 'info', [], { k: 'sigCompaction', p: [comp.starts.length, (comp.prunes ?? 0) >= R.PRUNE_NOTE ? comp.prunes : 0] })
  const todo = lane.todoReminders ?? 0
  if (todo >= R.TODO.low) push('todoStale', todo >= R.TODO.medium ? 'medium' : 'low', [], { k: 'sigTodo', p: [todo] })
  if (adaptive.length > 0) push('adaptiveRecovery', 'info', adaptive, { k: 'sigAdaptive', p: [adaptive.length] })

  out.sort((a, b) => SIGNAL_SEV[b.severity] - SIGNAL_SEV[a.severity] || b.count - a.count)
  return out
}

/**
 * 上下文占用（吴昊 2026-09-07 拍板）：每次请求按**当时的模型**换算窗口——节点自带 ctxWin（上传链路
 * 解析时取该 assistant/message 之前最近一条 request/context 的 contextWindow，宿主报了真值优先，
 * 没有再查模型表），缺席时退回泳道级窗口（最后一条 request/context）或会话模型的表值。
 * 健全性守卫沿用：任何一个样本的 token 超过它的窗口，就视为窗口表过时，valid=false，
 * 展示端退回绝对 token（绝不显示超过 100% 的占用）；守卫按窗口分别算，见函数内注释。
 * @returns { samples:[{n,tok,win,ratio}] 按结束时间序, valid, peakTok, peakRatio, peakWin, peakNode, windows:[去重后的窗口] }
 */
export function contextOccupancy(lane){
  const fallback = lane.ctxWindow ?? contextWindowFor(lane.model)
  const own = [...lane.main, ...lane.detours].filter(n => !n.sub && !n.evt && !n.live && (n.inTok != null || n.cacheTok != null)).sort((a, b) => a.e - b.e || a.s - b.s)
  const tokOf = n => (n.inTok ?? 0) + (n.cacheTok ?? 0)
  // 守卫按窗口算：某个窗口下有样本超过它，这个窗口值就不可信（big2 里中转站给的 262144 窗口跑了 595K 的请求），
  // 只把该窗口下的样本作废（ratio = null），别的窗口照常——一条中转站的错报不该让整场退回绝对值。
  const stale = new Set()
  for (const n of own){ const win = n.ctxWin ?? fallback; if (win != null && tokOf(n) > win) stale.add(win) }
  const samples = []
  let peakTok = 0, peakRatio = 0, peakNode = null, peakWin = null, skipped = 0
  const windows = []
  for (const n of own){
    const tok = tokOf(n)
    const win = n.ctxWin ?? fallback
    const ok = win != null && !stale.has(win)
    if (ok && !windows.includes(win)) windows.push(win)
    if (!ok) skipped += 1
    const ratio = ok ? tok / win : null
    samples.push({ n, tok, win: win ?? null, ratio })
    if (tok > peakTok) peakTok = tok
    if (ratio != null && ratio > peakRatio){ peakRatio = ratio; peakNode = n; peakWin = win }
  }
  const valid = own.length > 0 && skipped < own.length
  if (!valid){ peakRatio = 0; peakWin = null; peakNode = own.reduce((b, n) => (b === null || tokOf(n) > tokOf(b)) ? n : b, null) }
  return { samples, valid, peakTok, peakRatio, peakWin, peakNode, windows, skipped }
}
