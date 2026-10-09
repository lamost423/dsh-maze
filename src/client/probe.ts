/**
 * 临时诊断探针——诊断层第 7 项（本机会话库）的前置实机验证。
 * 回答调研里标了「必须实机确认」的几个问题：客户端能拿到多少会话行、冷会话 retain 会不会
 * 把 Agent 唤醒（=产生模型调用）、读到的历史是完整还是尾部窗口。
 *
 * 只在 __mazeProbe 被显式调用时工作；验证完从入口摘掉并删除本文件。
 */
export function installProbe(ctx: Record<string, any>): void {
  const g = globalThis as unknown as Record<string, any>
  const snap = () => ctx?.sessions?.list?.getSnapshot?.() ?? null

  g.__mazeProbe = {
    /** 客户端能看到的服务与接口清单（未 inject 的服务取值即抛错，所以每次访问都包 try）。 */
    info() {
      const at = (obj: any, key: string) => { try { return obj?.[key] ?? null } catch { return null } }
      const svc = (k: string) => at(ctx, k)
      const names = ['sessions', 'uiConversation', 'connection', 'llm', 'agentDefaultModel', 'slots', 'locale']
      const sessions = svc('sessions')
      const uiConversation = svc('uiConversation')
      const connection = svc('connection')
      return {
        services: names.filter((k) => svc(k) != null),
        notInjected: names.filter((k) => svc(k) == null),
        retain: typeof at(sessions, 'retain') === 'function',
        using: typeof at(sessions, 'using') === 'function',
        retainInfo: typeof at(sessions, 'retainInfo') === 'function',
        refreshProjections: typeof at(sessions, 'refreshProjections') === 'function',
        subagentAddress: typeof at(sessions, 'subagentAddress') === 'function',
        create: typeof at(sessions, 'create') === 'function',
        uiConversationBinding: typeof at(uiConversation, 'binding') === 'function',
        rpcCall: typeof at(at(connection, 'rpc'), 'call') === 'function',
        fetchRegister: typeof at(at(connection, 'fetch'), 'register') === 'function',
      }
    },

    /** 会话目录：行数、phase、冷会话是否在列（以及有没有 projections）。 */
    list() {
      const s = snap()
      if (!s) return { error: 'no list snapshot' }
      const ids: string[] = s.ids ?? []
      const rows = ids.map((id) => {
        const r = s.byId?.[id] ?? {}
        return {
          id,
          running: r.running ?? null,
          cwd: r.cwd ?? null,
          title: String(r.displayTitle ?? r.title ?? '').slice(0, 28),
          projections: !!s.projectionsBySession?.[id],
          parent: r.parentId ?? null,
          origin: r.origin ?? null,
        }
      })
      return {
        count: rows.length,
        phase: s.phase,
        cold: rows.filter((r) => !r.projections).length,
        sample: rows.slice(0, 6),
      }
    },

    /** retain 一场会话：看耗时、running 是否变化（=Agent 是否被唤醒）、快照里有多少消息。 */
    async retain(id: string, waitMs = 3000) {
      const t0 = performance.now()
      const row = () => snap()?.byId?.[id] ?? {}
      const runningBefore = row().running ?? null
      let ref: any
      try {
        ref = ctx.sessions.retain(id, { source: 'maze' })
      } catch (e) {
        return { error: 'retain threw: ' + String(e) }
      }
      let readyError: string | null = null
      try {
        await ref.ready
      } catch (e) {
        readyError = String(e)
      }
      const readyMs = Math.round(performance.now() - t0)
      await new Promise((r) => setTimeout(r, waitMs))
      const runningAfter = row().running ?? null
      let snapshot: Record<string, any>
      try {
        const ui = (ctx as Record<string, any>).uiConversation
        const target = ui.binding(ref.binding).target('chat')
        // 我们自己的花名册就是「先订阅激活 target，再读快照」——照抄这个顺序
        const off = typeof target.subscribe === 'function' ? target.subscribe(() => {}) : null
        await new Promise((r) => setTimeout(r, 1500))
        const read = () => {
          const s = target.getSnapshot?.()
          if (!s) return { type: typeof s }
          // 与 live-data.ts 的 orderedNodes 同法：order 是键序、nodes 是 Map
          const order: string[] = Array.from(s.order ?? [])
          const nodeAt = (k: string) => s.nodes?.get?.(k) ?? s.nodes?.[k] ?? null
          const first = order.length ? nodeAt(order[0]!) : null
          const last = order.length ? nodeAt(order[order.length - 1]!) : null
          const t = (n: any) => n?.time ?? n?.data?.time ?? null
          return {
            type: typeof s,
            keys: Object.keys(s).slice(0, 14),
            order: order.length,
            nodesMap: s.nodes?.size ?? (s.nodes ? Object.keys(s.nodes).length : null),
            firstTime: t(first),
            lastTime: t(last),
            firstKind: first?.kind ?? first?.data?.kind ?? null,
            lastKind: last?.kind ?? last?.data?.kind ?? null,
          }
        }
        snapshot = { first: read() }
        await new Promise((r) => setTimeout(r, 2000))
        snapshot.second = read()
        if (typeof off === 'function') off()
      } catch (e) {
        snapshot = { error: String(e) }
      }
      g.__mazeProbeRefs = g.__mazeProbeRefs ?? {}
      g.__mazeProbeRefs[id] = ref
      return {
        readyMs,
        waitedMs: waitMs,
        readyError,
        runningBefore,
        runningAfter,
        runningChanged: runningBefore !== runningAfter,
        snapshot,
      }
    },

    /** 释放 retain 的引用（避免探针自己泄漏会话引用）。 */
    release(id: string) {
      const ref = g.__mazeProbeRefs?.[id]
      if (!ref) return { released: false }
      try {
        ref.release()
      } catch (e) {
        return { released: false, error: String(e) }
      }
      delete g.__mazeProbeRefs[id]
      return { released: true }
    },

    /** 不 retain 的情况下读某场会话的投影缓存（看冷会话有没有现成的统计）。 */
    projections(id: string) {
      const s = snap()
      const p = s?.projectionsBySession?.[id]
      if (!p) return { present: false }
      return { present: true, state: p.state ?? null, keys: Object.keys(p.values ?? {}).slice(0, 16) }
    },
  }
}
