/**
 * verdict.js 的手写类型声明（该实现须保持纯 JS：构建期会被注入 maze-upload.html
 * 的内联脚本）。改 verdict.js 导出时同步本文件。
 */

/** toolVerdict 的输入：一次已配对结果的工具调用。 */
export interface VerdictInput {
  name: string
  res?: string
  err?: boolean
}

/**
 * 结构化判定依据：语言无关的键 + 参数。展示端按当前界面语言渲染成文案
 * （maze-upload.html 的 whyText），切语言即时生效。
 */
export interface VerdictWhy {
  k: 'errFlag' | 'errStrong' | 'errWeak' | 'writeOk' | 'searchEmpty' | 'searchNoHit'
    | 'searchOk' | 'exitNoOut' | 'exitOk' | 'retryCtx' | 'retryCluster'
    | 'noTools' | 'pendingTools' | 'child' | 'llmRetry' | 'turnError'
  p?: (string | number)[]
}

/** 单工具判定结果。 */
export interface Verdict {
  v: 'error' | 'deadend' | 'ok'
  why: VerdictWhy
}

/** 判定常量（阈值与分类，均可调；依据见工作区 PROPOSAL-trace-compare-verdict.md）。 */
export declare const VERDICT_RULES: {
  ERROR_PATTERNS_STRONG: RegExp
  ERROR_PATTERNS_WEAK: RegExp
  ERROR_HEAD_SCAN: number
  ERROR_TAIL_SCAN: number
  WRITE_TOOLS: string[]
  SEARCH_TOOLS: string[]
  NO_RESULT_PATTERNS: RegExp
  RETRY_SIMILARITY: number
  RETRY_MIN_CLUSTER: number
}

/** 步级聚合的严重度序。 */
export declare const SEV: Record<string, number>

/**
 * 单工具判定：错误标志 → 强失败特征（全文）→ 弱失败特征（仅开头）→ 按工具分类。
 * @param ev 已配对结果的工具调用；res 必须是未截断的返回全文（两条渲染链路统一口径）
 * @returns 判定值与结构化依据
 */
export declare function toolVerdict(ev: VerdictInput): Verdict

/**
 * 步级判定：返回该步最坏判定的工具（其 v/why 即步判定与依据）。
 * @param tools 该步已定判定的工具
 * @returns 最坏工具；空数组时 null
 */
export declare function stepVerdict<T extends { v: string }>(tools: readonly T[]): T | null

/**
 * 参数相似度（token 集 Jaccard）。
 * @param a 一次调用的参数摘要
 * @param b 另一次调用的参数摘要
 * @returns 0–1 相似度
 */
export declare function argSimilarity(a: string, b: string): number

/**
 * 盲目重试簇标注：就地把「同工具 + 参数相似 + 簇内含失败」的连续调用簇内
 * 非失败调用改判 v='retry' 并写结构化依据（失败成员的簇上下文写在 why2）。
 * calls 须按时间序、只含已有结果的调用。
 * @param calls 时间序的已结算工具调用
 * @returns 命中簇数
 */
export declare function markRetryClusters(calls: { name: string; args: string; v: string; why?: VerdictWhy; why2?: VerdictWhy }[]): number

/** 分析层常量（失败恢复窗口 / 原样重试相似度门槛 / 结果与证据的命令正则清单）。 */
export declare const ANALYSIS_RULES: {
  RECOVERY_WINDOW: number
  IDENTICAL_SIMILARITY: number
  SHELL_TOOLS: string[]
  CODE_TOOLS: string[]
  ARTIFACT_TOOLS: string[]
  TURN_END_INCOMPLETE: string[]
  VALIDATION: { test: RegExp[]; build: RegExp[]; lint: RegExp[] }
  SIGNALS: {
    POLL_TOOLS: string[]
    READ_TOOLS: string[]
    READ_SHELL: RegExp
    SIG_MAX: number
    MECHANICAL: { medium: number; high: number }
    REPEAT: { low: { rate: number; min: number }; medium: { rate: number; min: number } }
    REPEAT_READ: number
    LOOP: { medium: number; high: number }
    FAIL: { medium: { count: number; rate: number }; high: { count: number; rate: number } }
    SLOW_SEC: number
    SLOW: { low: number; medium: number }
    HHI: { minCalls: number; min: number }
    CTX_JUMP: number
    CTX_PEAK: { low: number; medium: number; high: number }
    PRUNE_NOTE: number
    TODO: { low: number; medium: number }
  }
  VALIDATION_SPLIT: RegExp
  HEREDOC: RegExp
  QUOTED: RegExp
  VALIDATION_WRAP: RegExp
  PROBE_FLAGS: RegExp
  BACKGROUND_JOB: RegExp
  EXIT_CODE: RegExp
}

/* ---- 结果与证据（诊断层第 1 项） ---- */

/** 验证类别。 */
export type ValidationKind = 'test' | 'build' | 'lint'

/** 一次 shell 类调用的命令文本（参数可为原始 JSON 串或摘要串）；参数里没有命令时 null。 */
export declare function commandOf(args: unknown): string | null

/** 一条命令里命中各验证类别的片段（归一去重）；「同一条命令取最后一次」按片段算，不按整行 bash。 */
export declare function validationHits(command: string | null | undefined): Record<ValidationKind, string[]>

/** 一条命令命中的验证类别（固定序 test → build → lint 的子集）；只看命令位置。 */
export declare function detectValidationKinds(command: string | null | undefined): ValidationKind[]

/** 返回文本末行的退出码；没有则 null。传未压空白的原文。 */
export declare function exitCodeOf(text: string | null | undefined): number | null

/** 验证类调用是否通过：isError 为假且末行没有非零退出码（tl.exit 缺席时回退扫 resFull/res）。 */
export declare function validationPassed(tl: { err?: boolean; exit?: number | null; resFull?: string; res?: string }): boolean

/** job_output 类调用的 job id；没有则 null。 */
export declare function jobIdOf(args: unknown): string | null

/** 写入/编辑类调用触及的文件路径（补丁可多条）；识别不出时空数组。 */
export declare function artifactPaths(name: string, args: unknown): string[]

/** 结果与证据里一格验证类别的结论。 */
export interface ValidationCell<C> {
  /** 该类命令的运行次数。 */
  runs: number
  /** 不同命令条数（空白归一后比较）。 */
  commands: number
  /** 最后一次运行失败的不同命令条数（类别通过时它们是「此前失败」的那些）。 */
  failedCommands: number
  /** 起了后台任务却没从 job_output 拿到退出码的次数（不计入 runs）。 */
  unresolved: number
  /** 没跑过为 null；否则以该类别最后一次运行的结果为准。 */
  passed: boolean | null
  /** 决定性的那次调用 = 该类别最后一次运行；没跑过为 null。 */
  anchor: C | null
  anchorCmd: string | null
  anchorExit: number | null
}

/** outcomeEvidence 输入的泳道形状（页面与实时的 lane 都满足）。 */
export interface OutcomeLane<N> extends AnalysisLane<N> {
  turnEnds?: readonly { turn?: number; kind: string; s: number }[]
  userMsgs?: readonly { s: number }[]
}

/** 结果与证据六格 + 综合。 */
export interface OutcomeEvidence<N, T> {
  task: {
    /** done = 最后一轮正常收尾且有最终回答；failed = 以 error/aborted/interrupted/blocked 收尾；noAnswer = 收尾但最后一步不是回答；unfinished = 最后一轮没有结束事件；running = 实时链路仍在跑。 */
    state: 'done' | 'failed' | 'noAnswer' | 'unfinished' | 'running'
    turn: number | null
    /** 最后一轮 turn/end 的 reason.kind；没有时 null。 */
    reason: string | null
    answer: N | null
  }
  test: ValidationCell<{ tl: T; n: N }>
  build: ValidationCell<{ tl: T; n: N }>
  lint: ValidationCell<{ tl: T; n: N }>
  artifacts: { paths: string[]; writes: number; failedWrites: number }
  /** responded 为 null = 没有最终回答可供回应。 */
  human: { responded: boolean | null; answerAt: number | null }
  overall: 'done' | 'partial' | 'unverified'
  failedKinds: ValidationKind[]
  missing: ValidationKind[]
  anyValidation: boolean
  /** code 模式外层调用次数（>0 时脚本内部派发的真实命令未被识别）。 */
  codeCalls: number
}

/* ---- 行为信号清单（诊断层第 2 项） ---- */

/** 参数签名（与校准脚本同规则）。 */
export declare function callSignature(name: string, args: unknown): string

/** 严重度序。 */
export declare const SIGNAL_SEV: Record<'high' | 'medium' | 'low' | 'info', number>

export type SignalType = 'mechanicalRetry' | 'repeat' | 'loop' | 'toolFail' | 'slowCall' | 'concentration'
  | 'ctxJump' | 'ctxDrop' | 'ctxPeak' | 'compaction' | 'todoStale' | 'adaptiveRecovery'

/** 一条行为信号。 */
export interface BehaviorSignal<N, T> {
  type: SignalType
  severity: 'high' | 'medium' | 'low' | 'info'
  /** 涉及调用数（refs.length）。 */
  count: number
  callIds: string[]
  /** 涉及的调用（首个即点击定位目标）；上下文类信号 tl 可为 null。 */
  refs: { tl: T | null; n: N }[]
  why: { k: string; p: (string | number)[] }
}

/** behaviorSignals 输入的泳道形状。 */
export interface SignalLane<N> extends AnalysisLane<N> {
  model?: string | null
  ctxWindow?: number | null
  compaction?: { starts: number[]; prunes?: number; summaries?: number; ends?: number }
  todoReminders?: number
}

/** 上下文占用：每次请求按当时的模型换算窗口（节点 ctxWin → 泳道 ctxWindow → 模型表）；有样本超窗即 valid=false。 */
export declare function contextOccupancy<N extends { sub?: unknown; evt?: unknown; live?: unknown; s: number; e: number; inTok?: number | null; cacheTok?: number | null; ctxWin?: number | null }>(
  lane: { main: readonly N[]; detours: readonly N[]; model?: string | null; ctxWindow?: number | null },
): { samples: { n: N; tok: number; win: number | null; ratio: number | null }[]; valid: boolean; peakTok: number; peakRatio: number; peakWin: number | null; peakNode: N | null; windows: number[]; skipped: number }

/** 行为信号清单：阈值见 ANALYSIS_RULES.SIGNALS（按本机 202 份会话校准）。 */
export declare function behaviorSignals<
  N extends { sub?: unknown; evt?: unknown; live?: unknown; turn?: number; s: number; e: number; v: string; inTok?: number | null; cacheTok?: number | null; tools?: readonly T[] },
  T extends { name: string; args?: unknown; s?: number | null; e?: number | null; v: string; dur?: number | null; callId?: string },
>(lane: SignalLane<N>, wall?: (t: number) => number): BehaviorSignal<N, T>[]

/**
 * 结果与证据：对已判定泳道数据的确定性聚合（口径见实现注释）。
 * @param lane 泳道（turnEnds/userMsgs 为墙钟秒，不随空闲折叠变）
 * @param wall 节点坐标 → 墙钟秒；页面折叠过时间轴时传 wallClock，否则可省略
 */
export declare function outcomeEvidence<
  N extends { sub?: unknown; evt?: unknown; live?: unknown; turn?: number; s: number; e: number; v: string; tools?: readonly T[] },
  T extends { name: string; args?: unknown; s?: number | null; e?: number | null; v: string; err?: boolean; exit?: number | null; resFull?: string; res?: string },
>(lane: OutcomeLane<N>, wall?: (t: number) => number): OutcomeEvidence<N, T>

/** analyzeFailureChains 的单条结论：一个失败调用之后发生了什么。 */
export interface FailureChain {
  /** 该失败调用在传入数组中的下标。 */
  i: number
  name: string
  /** 失败调用的开始时刻（与传入坐标同系）。 */
  s: number
  /** 失败后的下一步：原样重试 / 换参数 / 换工具 / 再无调用。 */
  mode: 'identical' | 'strategy' | 'switch' | 'none'
  /** 失败起点到下一次成功调用（任意工具）开始的秒数；此后再无成功为 null。 */
  recoverSec: number | null
  /** recoverSec 落在 RECOVERY_WINDOW 内。 */
  recovered: boolean
}

/**
 * 失败恢复链分析（纯读取，不改判定）：对每个失败调用给出恢复方式与恢复耗时。
 * @param calls 时间序的已结算工具调用（需带 s/e 时间）
 * @returns 与失败调用一一对应的结论数组
 */
export declare function analyzeFailureChains(calls: readonly { name: string; args: string; v: string; s: number; e: number | null }[]): FailureChain[]

/**
 * 区间合并求和：gap 内视为连续，返回合并后总时长（「工具占比」的活动时长分母）。
 * @param iv [[s,e],...] 任意序
 * @param gap 视为连续的最大间隔（秒）
 */
export declare function mergeIntervalsTotal(iv: readonly (readonly [number, number])[], gap: number): number

/** 最近邻分位数：空数组 0，单样本即该样本。 */
export declare function percentile(arr: readonly number[], p: number): number

/** settledLaneCalls 输入的最小泳道形状（页面与实时的 lane 都满足）。 */
export interface AnalysisLane<N> {
  main: readonly N[]
  detours: readonly N[]
}

/** 该泳道时间序的已结算工具调用；排除子代理聚合、请求级失败标记与在途调用（e == null）。 */
export declare function settledLaneCalls<N extends { sub?: unknown; evt?: unknown; tools?: readonly T[] }, T extends { s?: number | null; e?: number | null }>(lane: AnalysisLane<N>): { tl: T; n: N }[]

/** 请求级失败计数（evt 标记节点）。 */
export declare function countRequestFailures(lane: AnalysisLane<{ evt?: unknown }>): number

/** 工具结果矩阵聚合行。 */
export interface ToolMatrixRow {
  calls: number
  ok: number
  error: number
  deadend: number
  retry: number
  durs: number[]
}

/** 工具结果矩阵聚合：name → 各判定计数与耗时样本。 */
export declare function toolMatrix(calls: readonly { name: string; v: string; dur?: number | null }[]): Map<string, ToolMatrixRow>

/** 同任务可比性：对比件开关判定 + 图例原因（same/diff/no-first-user/single）。 */
export declare function taskComparability(firstUsers: readonly string[]): { sameTask: boolean; reason: 'same' | 'diff' | 'no-first-user' | 'single' }

/** 模型名模式 → 上下文窗口 token 数（匹配不到的模型不猜，走绝对值回退）。 */
export declare const CONTEXT_WINDOWS: [RegExp, number][]

/**
 * 按模型名解析上下文窗口。
 * @param model 模型名（可空）
 * @returns 窗口 token 数；未知模型返回 null
 */
export declare function contextWindowFor(model: string | null | undefined): number | null
