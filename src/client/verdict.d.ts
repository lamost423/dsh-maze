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
    | 'noTools' | 'pendingTools' | 'child'
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
