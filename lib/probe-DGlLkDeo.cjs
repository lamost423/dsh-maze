window.__ModuleLoader__.load({
	id: "dsh-maze",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		//#region src/client/probe.ts
		/**
		* 临时诊断探针——诊断层第 7 项（本机会话库）的前置实机验证。
		* 回答调研里标了「必须实机确认」的几个问题：客户端能拿到多少会话行、冷会话 retain 会不会
		* 把 Agent 唤醒（=产生模型调用）、读到的历史是完整还是尾部窗口。
		*
		* 只在 __mazeProbe 被显式调用时工作；验证完从入口摘掉并删除本文件。
		*/
		function installProbe(ctx) {
			const g = globalThis;
			const snap = () => ctx?.sessions?.list?.getSnapshot?.() ?? null;
			g.__mazeProbe = {
				/** 客户端能看到的服务与接口清单。 */
				info() {
					return {
						services: [
							"sessions",
							"conversations",
							"connection",
							"llm",
							"agentDefaultModel",
							"slots",
							"locale",
							"uiConversation"
						].filter((k) => ctx?.[k] != null),
						retain: typeof ctx?.sessions?.retain === "function",
						using: typeof ctx?.sessions?.using === "function",
						retainInfo: typeof ctx?.sessions?.retainInfo === "function",
						refreshProjections: typeof ctx?.sessions?.refreshProjections === "function",
						subagentAddress: typeof ctx?.sessions?.subagentAddress === "function",
						create: typeof ctx?.sessions?.create === "function",
						conversationsBinding: typeof ctx?.conversations?.binding === "function",
						rpcCall: typeof ctx?.connection?.rpc?.call === "function",
						fetchRegister: typeof ctx?.connection?.fetch?.register === "function"
					};
				},
				/** 会话目录：行数、phase、冷会话是否在列（以及有没有 projections）。 */
				list() {
					const s = snap();
					if (!s) return { error: "no list snapshot" };
					const rows = (s.ids ?? []).map((id) => {
						const r = s.byId?.[id] ?? {};
						return {
							id,
							running: r.running ?? null,
							cwd: r.cwd ?? null,
							title: String(r.displayTitle ?? r.title ?? "").slice(0, 28),
							projections: !!s.projectionsBySession?.[id],
							parent: r.parentId ?? null,
							origin: r.origin ?? null
						};
					});
					return {
						count: rows.length,
						phase: s.phase,
						cold: rows.filter((r) => !r.projections).length,
						sample: rows.slice(0, 6)
					};
				},
				/** retain 一场会话：看耗时、running 是否变化（=Agent 是否被唤醒）、快照里有多少消息。 */
				async retain(id, waitMs = 3e3) {
					const t0 = performance.now();
					const row = () => snap()?.byId?.[id] ?? {};
					const runningBefore = row().running ?? null;
					let ref;
					try {
						ref = ctx.sessions.retain(id, { source: "maze" });
					} catch (e) {
						return { error: "retain threw: " + String(e) };
					}
					let readyError = null;
					try {
						await ref.ready;
					} catch (e) {
						readyError = String(e);
					}
					const readyMs = Math.round(performance.now() - t0);
					await new Promise((r) => setTimeout(r, waitMs));
					const runningAfter = row().running ?? null;
					let snapshot;
					try {
						const target = ctx.conversations.binding(ref.binding).target("chat");
						const s = target.getSnapshot?.() ?? target;
						const msgs = s?.messages ?? s?.nodes ?? [];
						snapshot = {
							keys: Object.keys(s ?? {}).slice(0, 14),
							count: Array.isArray(msgs) ? msgs.length : null,
							firstTime: msgs?.[0]?.time ?? msgs?.[0]?.data?.time ?? null,
							lastTime: msgs?.[msgs.length - 1]?.time ?? msgs?.[msgs.length - 1]?.data?.time ?? null
						};
					} catch (e) {
						snapshot = { error: String(e) };
					}
					g.__mazeProbeRefs = g.__mazeProbeRefs ?? {};
					g.__mazeProbeRefs[id] = ref;
					return {
						readyMs,
						waitedMs: waitMs,
						readyError,
						runningBefore,
						runningAfter,
						runningChanged: runningBefore !== runningAfter,
						snapshot
					};
				},
				/** 释放 retain 的引用（避免探针自己泄漏会话引用）。 */
				release(id) {
					const ref = g.__mazeProbeRefs?.[id];
					if (!ref) return { released: false };
					try {
						ref.release();
					} catch (e) {
						return {
							released: false,
							error: String(e)
						};
					}
					delete g.__mazeProbeRefs[id];
					return { released: true };
				},
				/** 不 retain 的情况下读某场会话的投影缓存（看冷会话有没有现成的统计）。 */
				projections(id) {
					const p = snap()?.projectionsBySession?.[id];
					if (!p) return { present: false };
					return {
						present: true,
						state: p.state ?? null,
						keys: Object.keys(p.values ?? {}).slice(0, 16)
					};
				}
			};
		}
		//#endregion
		exports.installProbe = installProbe;
		return module.exports;
	}
});

//# sourceMappingURL=probe-DGlLkDeo.cjs.map