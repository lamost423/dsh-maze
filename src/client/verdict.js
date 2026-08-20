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
