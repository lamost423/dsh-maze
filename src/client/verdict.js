/**
 * 迷宫判定的唯一真相源：单步判定（成功/失败/扑空）+ 行为学盲目重试簇标注。
 * live-data.ts 正常 import 本模块；maze-upload.html 在构建期由 tsdown 把本文件
 * 剥掉 export 前缀后注入页面脚本的 VERDICT 占位符——改这里即同时改两条链路。
 * 类型声明在 verdict.d.ts（手写，改导出时同步）。
 *
 * 阈值与分类按 2026-08-19 三个真实会话（338 次工具调用）校准拍定，依据见工作区
 * PROPOSAL-trace-compare-verdict.md；VERDICT_RULES 各参数可调，改后重跑校准脚本核对。
 */

export const VERDICT_RULES = {
  /** 通用失败特征。刻意不含项目特定话术（如 "No such container"），包装器级失败靠 [status=Failed] / __EXIT__ 兜住。 */
  ERROR_PATTERNS: /Traceback \(most recent|command not found|Permission denied|No such file|HTTP 40\d|HTTP 50\d|^Error:|\[stderr\].*(Error|Traceback)|\[status=Failed\]|__EXIT__=[1-9]/i,
  /** 写入类工具：成功确认天然很短，无错误即成功，永不按输出判扑空。 */
  WRITE_TOOLS: ['write', 'edit', 'todo_write'],
  /** 检索类工具：空结果=扑空；有返回（哪怕一行命中）即成功。 */
  SEARCH_TOOLS: ['grep', 'read', 'web_search', 'read_image'],
  /** 空结果/无命中特征（整体为空或 '---'，或含无结果话术）。 */
  NO_RESULT_PATTERNS: /^(---)?$|no matches|no results|not found in/i,
  /** 盲目重试：相邻同工具调用的参数 token Jaccard 相似度门槛。 */
  RETRY_SIMILARITY: 0.6,
  /** 盲目重试：最小连续调用数。 */
  RETRY_MIN_CLUSTER: 2,
}

/** 步级聚合的严重度序：取最坏工具判定作为步判定。 */
export const SEV = { error: 4, retry: 3, deadend: 2, ok: 0, answer: 0 }

/** 单工具判定：错误标志 → 失败特征 → 按工具分类；返回判定值和依据文本。 */
export function toolVerdict(ev){
  if (ev.err) return { v: 'error', why: '工具返回错误标志（isError）' }
  const txt = (ev.res ?? '').trim()
  const hit = VERDICT_RULES.ERROR_PATTERNS.exec(txt)
  if (hit !== null) return { v: 'error', why: '返回内容命中失败特征「' + hit[0].slice(0, 48) + '」' }
  if (VERDICT_RULES.WRITE_TOOLS.includes(ev.name)) return { v: 'ok', why: '写入类工具，无错误即成功' }
  if (VERDICT_RULES.SEARCH_TOOLS.includes(ev.name)){
    if (VERDICT_RULES.NO_RESULT_PATTERNS.test(txt)) return { v: 'deadend', why: txt === '' ? '检索返回为空，判为扑空' : '检索命中无结果特征，判为扑空' }
    return { v: 'ok', why: '检索有返回' }
  }
  if (VERDICT_RULES.NO_RESULT_PATTERNS.test(txt)) return { v: 'deadend', why: '退出正常但无输出，判为扑空' }
  return { v: 'ok', why: '退出正常且有输出' }
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
 * v='retry' 并写依据；失败调用保持 error、依据追加簇上下文。返回命中簇数。
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
          if (c.v === 'error') c.why = (c.why ?? '') + '；处于连续重试簇（同一操作共 ' + len + ' 次）'
          else { c.v = 'retry'; c.why = '同一操作连续重试 ' + len + ' 次（其中 ' + fails + ' 次失败），判为盲目重试' }
        }
      }
    }
    start = i
  }
  return clusters
}
