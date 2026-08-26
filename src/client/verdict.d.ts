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

/** 分析层常量（失败恢复窗口 / 原样重试相似度门槛）。 */
export declare const ANALYSIS_RULES: {
  RECOVERY_WINDOW: number
  IDENTICAL_SIMILARITY: number
}

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
