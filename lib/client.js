window.__ModuleLoader__.load({
	id: "dsh-maze",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		_deepseek_ai_dsh_client_ui_primitives = __toESM(_deepseek_ai_dsh_client_ui_primitives, 1);
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region src/client/settings.ts
		const STORAGE_KEY = "dsh-maze:v1:settings";
		const DEFAULTS = { sidebarEntry: true };
		let current;
		const listeners = /* @__PURE__ */ new Set();
		let watchingStorage = false;
		/**
		* Coerce a stored payload: known fields to their types, unknown keys kept so
		* an older build touching the switch never erases a newer build's preference
		* under the shared key.
		*/
		function coerce(raw) {
			if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ...DEFAULTS };
			const record = raw;
			return {
				...record,
				sidebarEntry: typeof record.sidebarEntry === "boolean" ? record.sidebarEntry : DEFAULTS.sidebarEntry
			};
		}
		function load() {
			try {
				const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
				return raw === null || raw === void 0 ? { ...DEFAULTS } : coerce(JSON.parse(raw));
			} catch {
				return { ...DEFAULTS };
			}
		}
		function shallowEqual(a, b) {
			const left = a;
			const right = b;
			const keys = Object.keys(left);
			return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key]);
		}
		/** One failing subscriber must not starve the rest (host broadcast paths do the same). */
		function notify() {
			for (const listener of [...listeners]) try {
				listener();
			} catch (error) {
				console.error("[dsh-maze] settings listener failed", error);
			}
		}
		/** Another tab's write invalidates this tab's cache and re-notifies. */
		function watchStorage() {
			if (watchingStorage) return;
			watchingStorage = true;
			try {
				globalThis.addEventListener?.("storage", (event) => {
					if (event.key !== null && event.key !== STORAGE_KEY) return;
					current = load();
					notify();
				});
			} catch {}
		}
		/** Current preferences (stable reference until a value actually changes — uSES-safe). */
		function getMazeSettings() {
			current ??= load();
			return current;
		}
		/** Merge a patch; persist and notify only when a value actually changed. */
		function updateMazeSettings(patch) {
			const prev = getMazeSettings();
			const next = {
				...prev,
				...patch
			};
			if (shallowEqual(prev, next)) return;
			current = next;
			try {
				globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
			} catch (error) {
				console.warn("[dsh-maze] settings not persisted", error);
			}
			notify();
		}
		/** Subscribe to preference changes (this tab's writes and other tabs'); returns the unsubscriber. */
		function subscribeMazeSettings(listener) {
			watchStorage();
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}
		//#endregion
		//#region \0dsh-css:/Users/danielwu/Documents/StartUp_AIBrain/dsh-maze-diagnosis-wt/src/client/MazeSettingsSection.module.css.mjs
		const css$3 = ".IlnfDG_section{color:var(--dsw-alias-label-primary,#23304a);flex-direction:column;gap:16px;display:flex}.IlnfDG_heading{margin:0;font-size:15px;font-weight:600}.IlnfDG_row{cursor:pointer;justify-content:space-between;align-items:flex-start;gap:24px;display:flex}.IlnfDG_copy{flex-direction:column;gap:4px;display:flex}.IlnfDG_label{font-size:13px}.IlnfDG_hint{color:var(--dsw-alias-label-tertiary,#7a869c);max-width:48em;font-size:12px}.IlnfDG_toggle{cursor:pointer;accent-color:#2d6a8f;flex:none;width:16px;height:16px;margin-top:2px}body[data-ds-dark-theme] .IlnfDG_toggle{accent-color:#5b9bc4}";
		const tagId$3 = "dsh-maze/MazeSettingsSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-maze";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var MazeSettingsSection_module_css_default = {
			"hint": "IlnfDG_hint",
			"heading": "IlnfDG_heading",
			"section": "IlnfDG_section",
			"label": "IlnfDG_label",
			"copy": "IlnfDG_copy",
			"toggle": "IlnfDG_toggle",
			"row": "IlnfDG_row"
		};
		//#endregion
		//#region src/client/MazeSettingsSection.tsx
		/** Settings page ("设置 → 执行迷宫"): per-browser preferences for the maze surfaces. */
		function MazeSettingsSection({ t }) {
			const settings = (0, react.useSyncExternalStore)(subscribeMazeSettings, getMazeSettings, getMazeSettings);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: MazeSettingsSection_module_css_default.section,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					className: MazeSettingsSection_module_css_default.heading,
					children: t("title")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: MazeSettingsSection_module_css_default.row,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: MazeSettingsSection_module_css_default.copy,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: MazeSettingsSection_module_css_default.label,
							children: t("settings.sidebarEntry")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: MazeSettingsSection_module_css_default.hint,
							children: t("settings.sidebarEntry.hint")
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: MazeSettingsSection_module_css_default.toggle,
						type: "checkbox",
						checked: settings.sidebarEntry,
						onChange: (event) => {
							updateMazeSettings({ sidebarEntry: event.currentTarget.checked });
						}
					})]
				})]
			});
		}
		//#endregion
		//#region node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
		function r(e) {
			var t, f, n = "";
			if ("string" == typeof e || "number" == typeof e) n += e;
			else if ("object" == typeof e) if (Array.isArray(e)) {
				var o = e.length;
				for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
			} else for (f in e) e[f] && (n && (n += " "), n += f);
			return n;
		}
		function clsx() {
			for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
			return n;
		}
		//#endregion
		//#region \0dsh-css:/Users/danielwu/Documents/StartUp_AIBrain/dsh-maze-diagnosis-wt/src/client/TraceCompareTrigger.module.css.mjs
		const css$2 = ".-KlkUG_trigger{width:100%;color:var(--dsw-alias-label-primary,#46536a);font:inherit;cursor:pointer;background:0 0;border:0;border-radius:8px;align-items:center;gap:8px;padding:7px 10px;font-size:13px;transition:background .15s;display:flex}.-KlkUG_trigger:hover{background:var(--dsw-alias-interactive-bg-hover,#2d6a8f14)}.-KlkUG_trigger[aria-pressed=true]{color:var(--dsw-alias-label-primary,#245c7e);background:var(--dsw-alias-interactive-bg-hover,#2d6a8f1f)}.-KlkUG_rail{justify-content:center;width:auto;padding:7px 0}.-KlkUG_rail:hover{background:var(--dsw-alias-interactive-bg-hover,#2d6a8f14)}.-KlkUG_label{white-space:nowrap}";
		const tagId$2 = "dsh-maze/TraceCompareTrigger.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-maze";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var TraceCompareTrigger_module_css_default = {
			"label": "-KlkUG_label",
			"trigger": "-KlkUG_trigger",
			"rail": "-KlkUG_rail"
		};
		//#endregion
		//#region src/client/TraceCompareTrigger.tsx
		/** Host 0.1.7 renamed the 16px icon set (IconBranchOutline16 → IconBranchOutlineRegular); read either at runtime. */
		const iconTable = _deepseek_ai_dsh_client_ui_primitives;
		const BranchIcon = iconTable.IconBranchOutline16 ?? iconTable.IconBranchOutlineRegular ?? (() => null);
		/** Sidebar entry that toggles the root-scoped Trace Compare surface. */
		function TraceCompareTrigger({ wide, useStore, actions, t }) {
			const open = useStore((state) => state.open);
			const label = t(open ? "trigger.close" : "trigger.open");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label,
				delayMs: 500,
				disabled: wide,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: clsx(TraceCompareTrigger_module_css_default.trigger, !wide && TraceCompareTrigger_module_css_default.rail),
					"aria-label": label,
					"aria-pressed": open,
					onClick: () => {
						actions.toggle();
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BranchIcon, { size: wide ? 16 : 18 }), wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: TraceCompareTrigger_module_css_default.label,
						children: t("trigger")
					})]
				})
			});
		}
		//#endregion
		//#region src/client/current-session.ts
		/**
		* Which Session the host's main view is showing, read off the Session list.
		*
		* Host ≤0.1.6-alpha.1 publishes it as `list.current`. 0.1.6-alpha.2 dropped that
		* field — the selection moved into ui-workspace — and the public trace left on the list is
		* each row's retain counts: the main view retains its Session under the
		* `mainView` source. ui-session derives the selected Session from that same
		* count, so this follows the host's own rule rather than a private detail.
		* Typed structurally so one build reads both list shapes.
		* @param state - the Session list snapshot (`useSessions` selector input).
		* @returns the selected Session id, or undefined while none is selected.
		*/
		function currentSessionOf(state) {
			const legacy = state.current;
			if (legacy !== void 0) return legacy;
			const byId = state.byId;
			if (byId === void 0) return void 0;
			for (const row of Object.values(byId)) if ((row.retainedBy?.mainView ?? 0) > 0 && typeof row.id === "string") return row.id;
		}
		//#endregion
		//#region src/client/locale-sync.ts
		/**
		* 把当前宿主界面语言推给迷宫页面。
		* @param frame - 迷宫 iframe；null（未挂载）时不做事。
		* @param locale - 宿主 locale 服务。
		*/
		function postLocaleTo(frame, locale) {
			frame?.contentWindow?.postMessage({
				kind: "trace-locale",
				lang: locale.getLocale().active
			}, "*");
		}
		//#endregion
		//#region src/client/maze-html.ts
		/**
		* The self-contained maze upload page as a string for <iframe srcDoc>.
		* Inlined by the virtual module plugin in tsdown.config.ts.
		*/
		/** Complete HTML document of the upload-and-visualize maze page. */
		const MAZE_PAGE_HTML = "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>DSH Maze 执行迷宫</title>\n<style>\n  :root{\n    --bg:#f2f4f8; --bg-grad:linear-gradient(180deg,#f7f8fb 0%,#eef1f6 100%);\n    --panel:#ffffff; --panel2:#f6f8fb; --line:#e6e9f0; --txt:#1b2434; --dim:#5f6b85;\n    --llm:#2563eb; --bash:#0f9488; --grep:#7c3aed; --read:#059669; --web:#d97706; --other:#0891b2;\n    --tok-cache:#a9c6e8; --tok-in:#2563eb; --tok-rz:#d97706; --tok-out:#2f7d5f;\n    --ctx-line:#2d6a8f; --ctx-fill:rgba(45,106,143,.12); --ctx-warn:#d97706; --ctx-crit:#c0453f;\n    --turnband:rgba(100,116,139,.055);\n    --err:#c0453f; --dead:#98a1ad; --retry:#88919f; --ans:#3f7d55; --main-f:#2d6a8f; --main-p:#a06a35;\n    --milestone:#7d8896; --mslabel-txt:#5f6b7a; --anchor:#2f8a99;\n    --hover:#eef1f6; --sel:#dfeaf1; --border:#d9dee8; --codebg:#f9fafd; --code:#3a4354;\n    --grid:#e9edf3; --seam:#eef1f6; --seam-edge:#c7cedb; --seam-txt:#b45309;\n    --turnsep:#94a3b8; --turnsep-txt:#64748b; --backarc:#9aa4b8;\n    --nlabel:#46536a; --tick:#6b7689; --tick-big:#4a5a75; --nodeline:#ffffff; --hl:#1f2937;\n    --lane1-main:#2d6a8f; --lane1-title:#245c7e; --lane1-bg:rgba(45,106,143,.045); --lane1-edge:rgba(45,106,143,.15); --lane1-head:rgba(45,106,143,.07);\n    --lane2-main:#a06a35; --lane2-title:#8b5a2b; --lane2-bg:rgba(160,106,53,.045); --lane2-edge:rgba(160,106,53,.15); --lane2-head:rgba(160,106,53,.07);\n    --lane3-main:#6d55a3; --lane3-title:#5d4693; --lane3-bg:rgba(109,85,163,.045); --lane3-edge:rgba(109,85,163,.15); --lane3-head:rgba(109,85,163,.07);\n    --lane4-main:#2f7d5f; --lane4-title:#266a50; --lane4-bg:rgba(47,125,95,.045); --lane4-edge:rgba(47,125,95,.15); --lane4-head:rgba(47,125,95,.07);\n    --lane5-main:#a04b62; --lane5-title:#8c3e54; --lane5-bg:rgba(160,75,98,.045); --lane5-edge:rgba(160,75,98,.15); --lane5-head:rgba(160,75,98,.07);\n    --glass:rgba(255,255,255,.86); --glass-brd:rgba(23,32,48,.08);\n    --shadow-sm:0 1px 2px rgba(15,23,42,.05);\n    --shadow-md:0 2px 6px rgba(15,23,42,.05),0 12px 32px -12px rgba(15,23,42,.10);\n    --shadow-lg:0 4px 16px rgba(15,23,42,.08),0 24px 64px -24px rgba(15,23,42,.22);\n    --panel-shadow-l:-12px 0 40px rgba(15,23,42,.12); --panel-shadow-r:12px 0 40px rgba(15,23,42,.12);\n    --ring:rgba(45,106,143,.20);\n    --btn-primary:#2d6a8f; --btn-primary-h:#245c7e;\n    --chev:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M1 1l4 4 4-4' stroke='%236e7a91' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\");\n  }\n  /* 暗色主题：宿主经 postMessage {kind:'trace-theme'} 切换（iframe srcDoc 读不到宿主 DOM）。\n     导出的 SVG/PNG 固定浅色底：导出前临时切回浅色重建（分享场景）。 */\n  :root[data-theme=\"dark\"]{\n    --bg:#0d1219; --bg-grad:linear-gradient(180deg,#111825 0%,#0b1017 100%);\n    --panel:#151c27; --panel2:#1a2330; --line:#273041; --txt:#dde4f0; --dim:#8e9bb3;\n    --err:#e0645e; --dead:#7e879c; --retry:#97a1ba; --ans:#5fae7c; --main-f:#6aa8cc; --main-p:#cf9a5e;\n    --llm:#60a5fa; --bash:#2dd4bf; --grep:#a78bfa; --read:#34d399; --web:#fbbf24; --other:#22d3ee;\n    --tok-cache:#48627f; --tok-in:#60a5fa; --tok-rz:#e0a35c; --tok-out:#6fbf9a;\n    --ctx-line:#6aa8cc; --ctx-fill:rgba(106,168,204,.16); --ctx-warn:#e0a35c; --ctx-crit:#e0645e;\n    --turnband:rgba(148,163,184,.06);\n    --milestone:#93a0b0; --mslabel-txt:#a9b5c4; --anchor:#4fb0c0;\n    --hover:#212c3d; --sel:#22384a; --border:#333f54; --codebg:#111823; --code:#c3cddd;\n    --grid:#1e2735; --seam:#182130; --seam-edge:#39455a; --seam-txt:#e0a35c;\n    --turnsep:#5d6b82; --turnsep-txt:#8b99b0; --backarc:#7f8ca3;\n    --nlabel:#aab6ca; --tick:#77839a; --tick-big:#93a0b6; --nodeline:#0d1219; --hl:#f2f6ff;\n    --lane1-main:#6aa8cc; --lane1-title:#8cc0dd; --lane1-bg:rgba(106,168,204,.06); --lane1-edge:rgba(106,168,204,.22); --lane1-head:rgba(106,168,204,.09);\n    --lane2-main:#cf9a5e; --lane2-title:#e0b077; --lane2-bg:rgba(207,154,94,.06); --lane2-edge:rgba(207,154,94,.22); --lane2-head:rgba(207,154,94,.09);\n    --lane3-main:#a68fd8; --lane3-title:#c3b1ec; --lane3-bg:rgba(166,143,216,.06); --lane3-edge:rgba(166,143,216,.22); --lane3-head:rgba(166,143,216,.09);\n    --lane4-main:#6fbf9a; --lane4-title:#8ed4b2; --lane4-bg:rgba(111,191,154,.06); --lane4-edge:rgba(111,191,154,.22); --lane4-head:rgba(111,191,154,.09);\n    --lane5-main:#d98aa0; --lane5-title:#e8aebf; --lane5-bg:rgba(217,138,160,.06); --lane5-edge:rgba(217,138,160,.22); --lane5-head:rgba(217,138,160,.09);\n    --glass:rgba(21,28,39,.85); --glass-brd:rgba(255,255,255,.07);\n    --shadow-sm:0 1px 2px rgba(0,0,0,.28);\n    --shadow-md:0 2px 8px rgba(0,0,0,.32),0 12px 32px -12px rgba(0,0,0,.5);\n    --shadow-lg:0 4px 16px rgba(0,0,0,.4),0 24px 64px -24px rgba(0,0,0,.65);\n    --panel-shadow-l:-12px 0 40px rgba(0,0,0,.5); --panel-shadow-r:12px 0 40px rgba(0,0,0,.5);\n    --ring:rgba(106,168,204,.28);\n    --btn-primary:#3b7fa6; --btn-primary-h:#4a92ba;\n    --chev:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M1 1l4 4 4-4' stroke='%238e9bb3' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\");\n  }\n  *{box-sizing:border-box; margin:0; padding:0}\n  html,body{height:100%}\n  body{background-color:var(--bg); background-image:var(--bg-grad); color:var(--txt); font:12.5px/1.55 -apple-system,BlinkMacSystemFont,\"SF Pro Text\",\"Segoe UI\",Roboto,\"PingFang SC\",\"Hiragino Sans GB\",\"Microsoft YaHei\",sans-serif; font-variant-numeric:tabular-nums; -webkit-font-smoothing:antialiased; padding:20px 24px 16px; display:flex; flex-direction:column; overflow:hidden}\n  body > :not(#svgwrap){flex-shrink:0}\n  /* v0.7 分析区进主界面：出数据后整页可纵向滚动，迷宫占视口约六成高度，\n     分析卡/散点/矩阵/恢复链/Agent 图谱在其下方的常规文档流里，整页一眼读完。 */\n  body.hasdata{overflow-y:auto}\n  body.hasdata #svgwrap{flex:0 0 auto; height:clamp(320px, 58vh, 860px)}\n  ::-webkit-scrollbar{width:9px; height:9px}\n  ::-webkit-scrollbar-track{background:transparent}\n  ::-webkit-scrollbar-thumb{background:var(--border); border-radius:5px; border:2px solid transparent; background-clip:padding-box}\n  ::-webkit-scrollbar-thumb:hover{background:var(--dim); border:2px solid transparent; background-clip:padding-box}\n  input[type=checkbox]{accent-color:var(--main-f)}\n  button:focus-visible, select:focus-visible, input:focus-visible{outline:none; box-shadow:0 0 0 3px var(--ring)}\n  h1{font-size:15px; font-weight:700; letter-spacing:-.01em; color:var(--txt)}\n  .sub{color:var(--dim); font-size:11.5px; margin:3px 0 12px}\n  #drop{background:var(--panel); border:1.5px dashed var(--seam-edge); border-radius:14px; padding:26px 18px; text-align:center; color:var(--dim); cursor:pointer; box-shadow:var(--shadow-sm); transition:border-color .15s, background .15s, box-shadow .15s}\n  #drop.hover{border-color:var(--main-f); background:var(--hover); box-shadow:0 0 0 3px var(--ring)}\n  #drop b{color:var(--main-f)}\n  /* 出数据后页头收紧：说明隐藏、上传区收成细条、统计卡隐藏（同信息已画在泳道带内）、图例压缩 */\n  /* 页头并行化：标题、上传入口、文件名收进同一行，全宽横带条数减半，迷宫多拿约 70px 高度 */\n  body.hasdata .topbar{display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:8px}\n  body.hasdata .topbar h1{flex:0 0 auto}\n  body.hasdata .topbar #drop{flex:0 1 auto}\n  body.hasdata .topbar .files{flex:1 1 auto; margin-top:0}\n  body.hasdata{padding:10px 24px 12px}\n  body.hasdata h1{font-size:13px}\n  body.hasdata .sub{display:none}\n  body.hasdata #drop{padding:5px 12px; font-size:11.5px; border-width:1.5px}\n  body.hasdata #drop .drop-hint, body.hasdata #drop br{display:none}\n  body.hasdata #stats{display:none}\n  body.hasdata .legend{margin:4px 0 6px; font-size:10.5px; gap:10px}\n  body.hasdata .files{margin-top:6px}\n  .files{display:flex; gap:10px; flex-wrap:wrap; margin-top:10px}\n  .fchip{background:var(--panel); border:1px solid var(--line); border-radius:999px; padding:4.5px 8px 4.5px 12px; font-size:11.5px; display:flex; align-items:center; gap:7px; box-shadow:var(--shadow-sm)}\n  .fchip .x{cursor:pointer; color:var(--dim); font-weight:700; width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; transition:background .15s, color .15s}\n  .fchip .x:hover{color:var(--err); background:rgba(192,69,63,.10)}\n  .fchip.err{border-color:rgba(192,69,63,.35); color:var(--err); background:rgba(192,69,63,.07)}\n  .stats{display:flex; gap:10px; flex-wrap:wrap; margin:12px 0}\n  .card{background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:10px 15px; min-width:210px; box-shadow:var(--shadow-sm)}\n  .card b{font-size:13.5px; letter-spacing:-.01em}\n  .card .m{color:var(--dim); font-size:10.5px}\n  .card .key{color:var(--dim); margin-left:8px; font-size:10.5px}\n  /* 图例压成单行横滚：换行时桌面吃 44px、375px 下吃 152px，全是常看不常点的参照信息 */\n  .legend{display:flex; gap:14px; flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; margin:8px 0; color:var(--dim); font-size:11px}\n  .legend::-webkit-scrollbar{display:none}\n  .lg{display:inline-flex; align-items:center; gap:5px; flex:0 0 auto}\n  .ln{width:20px; height:0; border-top:2px solid #fff; display:inline-block; border-radius:1px}\n  .ln.mf{border-color:var(--main-f)} .ln.mp{border-color:var(--main-p)}\n  .ln.dt{border-color:var(--dead); border-top-style:dashed}\n  .ln.bk{border-color:var(--backarc); border-top-style:dotted}\n  .sw{width:13px; height:9px; border-radius:3px; display:inline-block}\n  .sw.er{background:var(--err)} .sw.de{background:var(--dead)} .sw.rt{background:var(--retry)} .sw.an{background:var(--ans)} .sw.ms{background:var(--milestone)}\n  .flt-dim{opacity:.15 !important}\n  #fltbar .fltlab{display:flex; align-items:center; gap:5px; white-space:nowrap}\n  #fltbar input[type=\"search\"]{flex:1 1 220px; min-width:120px; max-width:320px; padding:4px 11px; border:1px solid var(--border); border-radius:9px; font:inherit; font-size:12px; background:var(--panel); color:var(--txt); transition:border-color .15s, box-shadow .15s}\n  #fltbar input[type=\"search\"]:focus{outline:none; border-color:var(--main-f); box-shadow:0 0 0 3px var(--ring)}\n  #fltbar #fltCount{color:var(--dim); white-space:nowrap}\n  /* 工具条：ghost 控件（默认无框，悬停浮起），只有主操作「播放」是实心主色。\n     flex-wrap 必开：body overflow:hidden 下溢出的控件不是\"要横滚\"而是彻底够不着（375px 实测 2.06× 溢出）。 */\n  .controls{display:flex; align-items:center; flex-wrap:wrap; gap:6px 7px; min-width:0; background:var(--panel); border:1px solid var(--line); border-radius:11px; padding:4px 10px; margin-bottom:8px; position:sticky; top:0; z-index:50; box-shadow:var(--shadow-sm)}\n  .controls button{background:transparent; color:var(--txt); border:1px solid transparent; border-radius:8px; padding:3px 10px; font-size:12px; font-weight:500; cursor:pointer; transition:background .15s, color .15s, transform .06s}\n  .controls button:hover{background:var(--hover)}\n  .controls button:active{transform:translateY(1px)}\n  #btnPlay{background:var(--btn-primary); color:#fff; font-weight:600; min-width:76px; padding:3px 12px; box-shadow:var(--shadow-sm)}\n  #btnPlay:hover{background:var(--btn-primary-h)}\n  #btnReset{width:26px; padding:3px 0; text-align:center; color:var(--dim)}\n  #btnReset:hover{color:var(--txt)}\n  .controls select{appearance:none; -webkit-appearance:none; background:transparent var(--chev) no-repeat right 6px center; color:var(--txt); border:1px solid transparent; border-radius:8px; padding:3px 20px 3px 8px; font:inherit; font-size:12px; cursor:pointer; transition:background .15s}\n  .controls select:hover{background-color:var(--hover)}\n  #curTime{font-variant-numeric:tabular-nums; min-width:58px; text-align:center; color:var(--main-f); font-weight:600; font-size:11.5px; background:var(--panel2); border-radius:7px; padding:2px 8px}\n  /* 进度条热力化：canvas 画活动密度与失败刻线垫底，透明轨道的原生 range 叠在上面负责交互 */\n  #seekwrap{position:relative; flex:1 1 180px; min-width:120px; height:22px; display:inline-flex; align-items:center}\n  #seekheat{position:absolute; left:0; top:3px; width:100%; height:16px; border-radius:8px; pointer-events:none}\n  #seek{position:relative; width:100%; height:22px; margin:0; background:transparent; -webkit-appearance:none; appearance:none; cursor:pointer}\n  #seek::-webkit-slider-runnable-track{background:transparent; height:16px}\n  #seek::-webkit-slider-thumb{-webkit-appearance:none; appearance:none; width:7px; height:20px; border-radius:3.5px; background:var(--main-f); margin-top:-2px; box-shadow:0 0 0 1.5px var(--panel)}\n  /* 过滤条：去面板底，退成安静的一行；页面可滚后不再 sticky（否则与控件条叠在同一 top） */\n  #fltbar{background:transparent; border-color:transparent; box-shadow:none; padding:0 6px; margin-bottom:6px; font-size:12px; position:static}\n  #fltbar input[type=\"search\"]{border-color:var(--line)}\n  /* The maze scales to whatever space is left: viewBox + meet fit（内容不高时）。 */\n  .svgwrap{overflow:hidden; flex:1 1 0; min-height:120px; border:1px solid var(--line); border-radius:14px; background:var(--panel); box-shadow:var(--shadow-md); position:relative}\n  /* 内层滚动容器：整图 meet fit 在内容偏高时会把迷宫压到十几个百分点（实测 1560×1889\n     塞进 1230×450 = 0.24×，文字全糊、七成画布空白）。低于可读下限时改按宽度铺满、\n     纵向滚动——时间轴是语义主轴必须占满宽度，泳道方向本就是可滚的列表。\n     详情/盘点面板留在 .svgwrap 上不进滚动层，否则会跟着内容滚走。 */\n  .svgscroll{position:absolute; inset:0; overflow:hidden}\n  /* 滚动模式下轴头会随内容滚走，时间参照就没了。把刻度文字复制到一条钉住的轴条上，\n     不透明底盖住底下同位置的那份；主 SVG 里仍保留刻度，导出的 SVG/PNG 不受影响。 */\n  .axisbar{position:absolute; left:0; right:0; top:0; display:none; background:var(--panel); border-bottom:1px solid var(--line); pointer-events:none; z-index:5}\n  .svgwrap.scroll .axisbar{display:block}\n  .svgwrap.scroll .svgscroll{overflow-y:auto; overflow-x:hidden}\n  #svg{width:100%; height:100%; display:block; cursor:grab}\n  .svgwrap.scroll #svg{height:auto}\n  #svg.panning{cursor:grabbing}\n  /* 固定详情面板：盖在 svgwrap 右侧，点节点/支路打开（毛玻璃，迷宫在底下隐约可见） */\n  #panel{position:absolute; top:0; right:0; bottom:0; width:410px; max-width:78%; background:var(--glass); backdrop-filter:blur(16px) saturate(1.5); -webkit-backdrop-filter:blur(16px) saturate(1.5); border-left:1px solid var(--glass-brd); box-shadow:var(--panel-shadow-l); display:none; flex-direction:column; z-index:60}\n  #panel.show{display:flex}\n  #panel .ph{display:flex; align-items:center; gap:8px; padding:11px 13px; border-bottom:1px solid var(--line); flex-shrink:0}\n  #panel .ph b{font-size:12.5px; color:var(--txt); letter-spacing:-.01em}\n  #panel .vchip{font-size:10.5px; font-weight:700; border-radius:999px; padding:1.5px 9px; color:#fff}\n  #panel .pclose{margin-left:auto; cursor:pointer; border:none; background:none; color:var(--dim); font-size:15px; font-weight:700; width:24px; height:24px; display:flex; align-items:center; justify-content:center; border-radius:7px; line-height:1; transition:background .15s, color .15s}\n  #panel .pclose:hover{color:var(--err); background:var(--hover)}\n  #panel .pbody{overflow:auto; padding:10px 13px 14px; font-size:11.5px; flex:1}\n  #panel .prow{color:var(--dim); margin-bottom:6px}\n  #panel .psec{margin-top:10px; border:1px solid var(--line); border-radius:10px; overflow:hidden; background:var(--panel); box-shadow:var(--shadow-sm)}\n  #panel .psec .pt{display:flex; align-items:center; gap:8px; background:var(--panel2); padding:5px 10px; font-weight:600; color:var(--txt)}\n  #panel .psec .pt .cp{margin-left:auto}\n  #panel pre{white-space:pre-wrap; word-break:break-all; font-family:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace; font-size:10.5px; color:var(--code); padding:8px 10px; margin:0; max-height:230px; overflow:auto; user-select:text}\n  #panel pre.args{background:var(--codebg); border-bottom:1px solid var(--line); max-height:120px}\n  #panel .pwhy{padding:4px 10px; color:var(--dim); font-size:10.5px; border-bottom:1px solid var(--line)}\n  #panel .cp{border:1px solid var(--border); background:var(--panel); border-radius:7px; font-size:10.5px; color:var(--txt); cursor:pointer; padding:1.5px 9px; transition:background .15s, border-color .15s}\n  #panel .cp:hover{background:var(--hover); border-color:var(--dim)}\n  #panel .jump{display:inline-block; margin:8px 0 0; border:1px solid var(--main-f); background:var(--sel); color:var(--lane1-title); border-radius:9px; font-size:11.5px; font-weight:600; cursor:pointer; padding:3.5px 12px; transition:background .15s}\n  #panel .jump:hover{background:var(--hover)}\n  #panel .rzfull{color:var(--dim); background:var(--codebg); border:1px solid var(--line); border-radius:10px; padding:8px 10px; margin-top:10px; max-height:160px; overflow:auto; user-select:text}\n  .zoomhint{color:var(--dim); font-size:10.5px}\n  svg text{font-family:-apple-system,BlinkMacSystemFont,\"SF Pro Text\",\"Segoe UI\",Roboto,\"PingFang SC\",\"Hiragino Sans GB\",sans-serif}\n  .node{cursor:pointer}\n  .node .nbar{stroke:var(--nodeline); stroke-width:1.2}\n  .node .subbar{stroke-width:.8}\n  /* 密集图内的文字标签垫一圈画布底色描边（paint-order 晕圈），压线也可读 */\n  .nlabel,.seg-label,.mslabel,.anclabel,.trk-label,.trk-cap{paint-order:stroke fill; stroke:var(--panel); stroke-width:2.5px; stroke-linejoin:round}\n  .nlabel{font-size:10.5px; fill:var(--nlabel); pointer-events:none; font-weight:600}\n  .dur-label{font-size:9px; fill:var(--tick); pointer-events:none}\n  .node-icon{pointer-events:none}\n  .back-label{font-size:11px; fill:var(--backarc); pointer-events:none}\n  .seg-label{font-size:10px; font-weight:700; pointer-events:none}\n  .hl-path{stroke-width:4.5!important; filter:drop-shadow(0 0 3px rgba(16,24,40,.18))}\n  .hl-node .nbar{stroke:var(--hl)!important; stroke-width:2.5!important}\n  .hl-node .nlabel{fill:var(--hl)!important}\n  .lane-name{font-size:12.5px; font-weight:700; letter-spacing:-.01em}\n  .lane-info{font-size:10.5px; fill:var(--dim); font-weight:500}\n  .tick{font-size:9.5px; fill:var(--tick)}\n  .tick.big{fill:var(--tick-big)}\n  .mk-flag{font-size:11px}\n  .msline{stroke:var(--milestone); stroke-dasharray:4 4; stroke-width:1.5}\n  .mslabel{font-size:10px; fill:var(--mslabel-txt)}\n  .ancline{stroke:var(--anchor); stroke-dasharray:2 3; stroke-width:1.6; cursor:pointer}\n  .anclabel{font-size:10px; fill:var(--anchor); font-weight:600; cursor:pointer}\n  .sw.anc{background:var(--anchor)}\n  /* 支路盘点面板：盖在 svgwrap 左侧（与右侧详情面板对称），列每轮各泳道支路差额 */\n  #invpanel{position:absolute; top:0; left:0; bottom:0; width:470px; max-width:80%; background:var(--glass); backdrop-filter:blur(16px) saturate(1.5); -webkit-backdrop-filter:blur(16px) saturate(1.5); border-right:1px solid var(--glass-brd); box-shadow:var(--panel-shadow-r); display:none; flex-direction:column; z-index:60}\n  #invpanel.show{display:flex}\n  #invpanel .ph{display:flex; align-items:center; gap:8px; padding:11px 13px; border-bottom:1px solid var(--line); flex-shrink:0}\n  #invpanel .ph b{font-size:13.5px; color:var(--txt); letter-spacing:-.01em}\n  #invpanel .pclose{margin-left:auto; cursor:pointer; border:none; background:none; color:var(--dim); font-size:15px; font-weight:700; width:24px; height:24px; display:flex; align-items:center; justify-content:center; border-radius:7px; line-height:1; transition:background .15s, color .15s}\n  #invpanel .pclose:hover{color:var(--err); background:var(--hover)}\n  #invpanel .pbody{overflow:auto; padding:8px 10px 12px; font-size:12px; flex:1}\n  #invpanel table{width:100%; border-collapse:collapse}\n  #invpanel th{color:var(--dim); font-weight:600; text-align:left; font-size:11px; letter-spacing:.02em}\n  #invpanel th,#invpanel td{padding:5.5px 7px; border-bottom:1px solid var(--line); vertical-align:top}\n  #invpanel tbody tr[data-turn]{cursor:pointer; transition:background .12s}\n  #invpanel tbody tr[data-turn]:hover{background:var(--hover)}\n  #invpanel tr.sel{background:var(--sel)}\n  #invpanel tr.total td{color:var(--txt); font-weight:600; background:var(--panel2)}\n  #invpanel .hint{color:var(--dim); font-size:11px; margin:6px 2px 0}\n  .controls button.on{background:var(--sel); color:var(--lane1-title)}\n  /* ==================== 主界面分析区（v0.7.0）：迷宫下方的常规文档流 ==================== */\n  #anasec{display:none; margin-top:12px}\n  body.hasdata #anasec{display:block}\n  .analane{margin:14px 2px 4px; font-weight:700; font-size:13.5px; color:var(--txt)}\n  .analane .m{color:var(--dim); font-weight:500; font-size:11px; margin-left:8px}\n  /* 摘要三卡：编号徽标 + 标题行 + 关键数字行（对齐参照稿的 01/02/03 卡片） */\n  .anacards{display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:10px; margin:8px 0 12px}\n  .anacard{display:flex; gap:10px; background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:11px 13px; box-shadow:var(--shadow-sm)}\n  .anacard .num{flex:0 0 auto; width:26px; height:26px; border-radius:50%; border:1.5px solid var(--main-f); color:var(--main-f); font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; margin-top:1px}\n  .anacard .t{color:var(--txt); font-size:12px; font-weight:700; margin-bottom:3px}\n  .anacard .v{font-size:11.5px; line-height:1.6; color:var(--dim)}\n  .anacard .warn{color:var(--err); font-weight:700}\n  .anacard .good{color:var(--ans); font-weight:600}\n  /* 双列块网格：耗时散点 | 工具矩阵；失败恢复链 | Agent 图谱 */\n  .anagrid{display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; align-items:start}\n  @media (max-width:980px){ .anagrid{grid-template-columns:1fr} }\n  .anablock{background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:10px 13px 12px; box-shadow:var(--shadow-sm); min-width:0}\n  .anablock > .bt{font-size:12px; font-weight:700; color:var(--txt); margin-bottom:6px; letter-spacing:.01em}\n  /* 上下文构成（诊断层第 4 项）：堆叠条 + 逐段字符数 */\n  .cchint{font-weight:400; color:var(--dim); font-size:10.5px; margin-left:6px}\n  .ccbar{display:flex; height:13px; border-radius:7px; overflow:hidden; border:1px solid var(--line); margin:2px 0 8px}\n  .ccseg{min-width:2px}\n  .cclist{display:flex; flex-wrap:wrap; gap:4px 16px; font-size:11px; color:var(--dim)}\n  .ccrow{display:flex; align-items:center; gap:5px}\n  .ccsw{width:9px; height:9px; border-radius:2px; display:inline-block}\n  .ccnum{color:var(--txt); font-variant-numeric:tabular-nums}\n  .ccpct{opacity:.75}\n  .ccnote{margin-top:7px; font-size:10.5px; color:var(--dim)}\n  /* 对比变量表（诊断层第 5 项） */\n  .cvverdict{margin:2px 0 8px; padding:7px 10px; border-radius:8px; font-size:11.5px; line-height:1.5}\n  .cv-ok{background:rgba(63,125,85,.12); border:1px solid rgba(63,125,85,.35)}\n  .cv-likely{background:rgba(224,163,92,.14); border:1px solid rgba(224,163,92,.4)}\n  .cv-explore{background:rgba(192,69,63,.12); border:1px solid rgba(192,69,63,.35)}\n  .cvtbl td.v{max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}\n  .cvtbl td.s-same{color:#3f7d55} .cvtbl td.s-diff{color:#c0453f; font-weight:700} .cvtbl td.s-unknown{color:var(--dim)}\n  .anatbl{width:100%; border-collapse:collapse; font-size:11px}\n  .anatbl th{color:var(--dim); font-weight:600; text-align:right; font-size:10px; padding:4px 6px; border-bottom:1px solid var(--line); letter-spacing:.02em}\n  .anatbl td{padding:4px 6px; border-bottom:1px solid var(--line); text-align:right; font-variant-numeric:tabular-nums}\n  .anatbl th:first-child,.anatbl td:first-child{text-align:left}\n  .anatbl td.err{color:var(--err)} .anatbl td.dead{color:var(--dead)} .anatbl td.rt{color:var(--retry)}\n  .okbar{display:inline-block; width:46px; height:5px; border-radius:3px; background:var(--line); vertical-align:1.5px; margin-left:6px; overflow:hidden}\n  .okbar i{display:block; height:100%; background:var(--ans); border-radius:3px}\n  .chain{display:flex; align-items:center; gap:8px; padding:4.5px 6px; border-bottom:1px solid var(--line); cursor:pointer; border-radius:7px; transition:background .12s}\n  .chain:hover{background:var(--hover)}\n  .chain .cid{font-weight:700; color:var(--txt); flex:0 0 auto}\n  .chain .cmeta{color:var(--dim); flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}\n  .chainwrap{max-height:320px; overflow-y:auto}\n  .chaintag{font-size:10px; font-weight:700; border-radius:999px; padding:1px 8px; flex:0 0 auto}\n  .chaintag.strategy{color:var(--ans); background:rgba(63,125,85,.13)}\n  .chaintag.switch{color:var(--lane1-title); background:var(--sel)}\n  .chaintag.identical{color:var(--retry); background:rgba(136,145,159,.16)}\n  .chaintag.none{color:var(--err); background:rgba(192,69,63,.11)}\n  .anahint{color:var(--dim); font-size:10.5px; margin:6px 2px 2px}\n  /* 结果与证据（诊断层第 1 项）：六格 + 综合徽标；颜色全走 CSS 变量，明暗同步 */\n  .ochead{display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:8px}\n  .ochead > .bt{margin-bottom:0}\n  .ocverdict{font-size:11px; font-weight:700; border-radius:999px; padding:2px 10px; flex:0 0 auto}\n  .ocverdict.done{color:var(--ans); background:rgba(63,125,85,.13)}\n  .ocverdict.partial{color:var(--ctx-warn); background:rgba(217,119,6,.13)}\n  .ocverdict.unverified{color:var(--dim); background:var(--sel)}\n  .ocsum{color:var(--dim); font-size:11px; flex:1 1 200px; min-width:0}\n  .ocgrid{display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:8px}\n  .occell{background:var(--panel2); border:1px solid var(--line); border-radius:9px; padding:8px 10px; min-width:0}\n  .occell[data-ai]{cursor:pointer; transition:background .12s}\n  .occell[data-ai]:hover{background:var(--hover)}\n  .occell .ol{font-size:10.5px; color:var(--dim); font-weight:600; letter-spacing:.02em}\n  .occell .os{font-size:12.5px; font-weight:700; margin-top:2px; color:var(--txt)}\n  .occell .os.pass{color:var(--ans)} .occell .os.fail{color:var(--err)} .occell .os.warn{color:var(--ctx-warn)}\n  .occell .os.none{color:var(--dim); font-weight:600}\n  .occell .om{font-size:10.5px; color:var(--dim); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}\n  .occell .om.cmd{font-family:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace; color:var(--code)}\n  .occell details{margin-top:3px}\n  .occell summary{font-size:10.5px; color:var(--main-f); cursor:pointer; list-style:none}\n  .occell summary::-webkit-details-marker{display:none}\n  .ocpaths{margin:4px 0 0; padding:0; list-style:none; max-height:160px; overflow:auto; font-family:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace; font-size:10.5px; color:var(--code)}\n  .ocpaths li{padding:1px 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}\n  .ocnote{color:var(--seam-txt); font-size:10.5px; margin:6px 2px 0}\n  /* 行为信号（诊断层第 2 项）：一行一条，严重度徽标 + 依据 + 涉及调用数；选中行高亮 */\n  .sigwrap{max-height:340px; overflow-y:auto}\n  .sig{display:flex; align-items:flex-start; gap:8px; padding:5px 6px; border-bottom:1px solid var(--line); border-radius:7px; transition:background .12s}\n  .sig[data-sig]{cursor:pointer}\n  .sig[data-sig]:hover{background:var(--hover)}\n  .sig.sel{background:var(--sel)}\n  .sigsev{font-size:10px; font-weight:700; border-radius:999px; padding:1px 8px; flex:0 0 auto; margin-top:1px; min-width:34px; text-align:center}\n  .sigsev.high{color:#fff; background:var(--err)}\n  .sigsev.medium{color:#fff; background:var(--ctx-warn)}\n  .sigsev.low{color:var(--main-f); background:var(--sel)}\n  .sigsev.info{color:var(--dim); background:var(--panel2); border:1px solid var(--line)}\n  .sig .sname{font-weight:700; color:var(--txt); flex:0 0 auto}\n  .sig .swhy{color:var(--dim); flex:1 1 auto; min-width:0}\n  .sig .scnt{color:var(--dim); flex:0 0 auto; font-size:10.5px}\n  /* 耗时分布散点图（分析区 SVG）：颜色走 CSS 变量，主题切换零重绘 */\n  .dsc-row{font-size:10.5px; font-weight:600; fill:var(--txt)}\n  .dsc-cnt{font-size:9.5px; fill:var(--dim)}\n  .dsc-tick{font-size:9px; fill:var(--tick)}\n  .dsc-pline{stroke:var(--dim); stroke-dasharray:4 4; stroke-width:1}\n  .dsc-plab{font-size:9px; fill:var(--dim); font-weight:600}\n  .dsc-grid{stroke:var(--grid); stroke-width:1}\n  /* Agent 关系图谱（分析区 SVG） */\n  .agname{font-size:11px; font-weight:700; fill:var(--txt)}\n  .agmeta{font-size:9.5px; fill:var(--dim)}\n  .agnode{cursor:pointer}\n  .agnode:hover circle{filter:brightness(1.06)}\n  /* 会话头部指标条：模型/时长/步数/Token/峰值上下文收拢成一行（多泳道逐行） */\n  #metastrip{display:none; flex-wrap:wrap; gap:4px 16px; align-items:center; background:var(--panel); border:1px solid var(--line); border-radius:11px; padding:5px 13px; margin-bottom:8px; font-size:11.5px; color:var(--dim); box-shadow:var(--shadow-sm)}\n  body.hasdata #metastrip{display:flex}\n  #metastrip b{color:var(--txt); font-weight:600}\n  #metastrip .mdot{width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:5px; vertical-align:0}\n  #metastrip .mlane{display:inline-flex; align-items:center; gap:14px; flex-wrap:wrap}\n  #metastrip .warn{color:var(--err); font-weight:700}\n  /* 密集会话的支路聚合徽标 */\n  .clusterbadge{cursor:pointer}\n  .clusterbadge:hover rect{filter:brightness(.96)}\n  /* 数据轨道（迷宫内，泳道带底部）：标签同密集图文字加画布底色晕圈 */\n  .trk-label{font-size:9.5px; fill:var(--dim); font-weight:600}\n  .trk-cap{font-size:9px; fill:var(--tick)}\n  .trk-cap.warn{fill:var(--err); font-weight:700}\n  .deadX{font-size:12px; font-weight:700}\n  #tip{position:fixed; z-index:100; max-width:600px; max-height:360px; overflow:auto; background:var(--glass); backdrop-filter:blur(14px) saturate(1.5); -webkit-backdrop-filter:blur(14px) saturate(1.5); border:1px solid var(--glass-brd); border-radius:12px; padding:10px 13px; font-size:11.5px; display:none; box-shadow:var(--shadow-lg)}\n  #tip .th{color:var(--main-f); font-weight:600; margin-bottom:4px}\n  #tip pre{white-space:pre-wrap; word-break:break-all; color:var(--code); font-family:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace; font-size:11px}\n  #tip .rs{margin-top:5px; color:var(--dim)}\n  #tip .back{margin-top:4px; color:var(--dim)}\n  .errbar{background:rgba(192,69,63,.07); border:1px solid rgba(192,69,63,.35); color:var(--err); border-radius:12px; padding:10px 14px; margin:10px 0; font-size:12.5px; display:none}\n  @media (max-width:720px){\n    body{padding:12px 12px 10px}\n    body.hasdata{padding:8px 12px 10px}\n    .controls{padding:5px 8px; gap:6px}\n    #fltbar input[type=\"search\"]{max-width:none}\n    .zoomhint{display:none}\n  }\n  /* 触屏设备把控件抬到 44px 触控下限；指针设备保持紧凑，垂直空间留给迷宫 */\n  @media (pointer:coarse){\n    .controls button, .controls select{min-height:44px; padding-top:10px; padding-bottom:10px}\n    #fltbar input[type=\"search\"]{min-height:44px}\n    #seek{height:44px}\n    .fchip .x{width:32px; height:32px}\n    #fltbar input[type=checkbox]{width:22px; height:22px}\n  }\n  /* Live (embedded tab) mode: page chrome off, everything tight — the lane band already carries the stats. */\n  body.live{padding:4px 8px 8px}\n  body.live h1, body.live .sub, body.live #stats{display:none}\n  /* live 下 topbar 里的东西全被藏了（h1/sub 靠 CSS，drop/files 靠 JS），把空容器连 margin 一起收掉 */\n  body.live .topbar{display:none}\n  body.live .legend{margin:2px 0 4px; font-size:11px; gap:10px}\n  body.live .controls{margin-bottom:4px; padding:4px 10px}\n</style>\n</head>\n<body>\n<div class=\"topbar\">\n<h1>DSH Maze 执行迷宫</h1>\n<div class=\"sub\">上传 1 个 session log（.jsonl / .jsonl.zstd）单独展示，或 2~5 个进行同时间轴对比。识别为同一任务的多次跑（首条用户消息一致）时启用对比件：按轮次自动对齐 + 手动锚点 + 支路盘点；任务不同则仅同轴并排。实线 = 主干路径，虚线 = 探索支路，✗/· 后折返；节点长度 = 步骤耗时。悬停快速预览，点击打开详情面板；滚轮缩放、拖拽平移、双击复位。</div>\n\n<div id=\"drop\">\n  <b>点击选择或拖拽</b> 1~5 个 session log（.jsonl / .json / .jsonl.zstd）<br>\n  <span class=\"drop-hint\">上传 1 个文件 → 单会话展示；2~5 个文件 → 同时间轴对比；.zstd 压缩文件由浏览器直接解压；按内容识别格式，文件名任意（如 macOS 副本「xxx.jsonl 2」）</span>\n</div>\n<!-- No accept filter: names like \"xxx.jsonl 2\" (macOS duplicates) must stay selectable; format is detected from content. -->\n<input type=\"file\" id=\"file\" multiple hidden>\n<div class=\"files\" id=\"files\"></div>\n</div>\n<div class=\"errbar\" id=\"errbar\"></div>\n\n<div class=\"stats\" id=\"stats\"></div>\n<!-- Populated per render: entries reflect the actual lane count, models, and compare-mode extras. -->\n<div class=\"legend\" id=\"legend\" style=\"display:none\"></div>\n\n<div class=\"controls\" id=\"controls\" style=\"display:none\">\n  <button id=\"btnPlay\">▶ 播放</button>\n  <button id=\"btnReset\">⟲</button>\n  <select id=\"speed\">\n    <option value=\"1\">1×</option><option value=\"5\">5×</option>\n    <option value=\"10\">10×</option><option value=\"25\" selected>25×</option>\n    <option value=\"50\">50×</option><option value=\"100\">100×</option>\n    <option value=\"300\">300×</option>\n  </select>\n  <span id=\"curTime\">0.0s</span>\n  <span id=\"seekwrap\"><canvas id=\"seekheat\"></canvas><input type=\"range\" id=\"seek\" min=\"0\" max=\"1000\" value=\"0\"></span>\n  <button id=\"btnFit\" title=\"复位缩放（双击空白处同效）\">⤢ 整图</button>\n  <span class=\"zoomhint\">滚轮缩放 · 拖拽平移</span>\n</div>\n\n<div id=\"metastrip\"></div>\n\n<div class=\"controls\" id=\"fltbar\" style=\"display:none\">\n  <label class=\"fltlab\"><input type=\"checkbox\" id=\"fltFail\"> <span id=\"fltFailTxt\">只看失败/重试</span></label>\n  <select id=\"fltToolSel\"><option value=\"\">全部工具</option></select>\n  <input type=\"search\" id=\"fltQIn\" placeholder=\"搜索命令与返回内容…\">\n  <span id=\"fltCount\"></span>\n  <span style=\"flex:1\"></span>\n  <button id=\"btnAnchor\" style=\"display:none\" title=\"两条泳道各点一个节点，钉一条对比锚线；点已钉的锚线可删除\">🔗 加锚点</button>\n  <button id=\"btnInv\" style=\"display:none\" title=\"按轮次盘点两条泳道的支路差额\">📋 支路盘点</button>\n  <button id=\"btnAxis\" title=\"横轴按真实时间（长等待折成细缝）；点击切到步序视图\">🕒 时间轴</button>\n  <button id=\"btnTracks\" class=\"on\" title=\"显示/隐藏泳道下方的数据轨道\">📊 轨道</button>\n  <button id=\"btnExpSvg\" title=\"导出当前视图为 SVG\">⬇ SVG</button>\n  <button id=\"btnExpPng\" title=\"导出当前视图为 PNG（2x）\">⬇ PNG</button>\n</div>\n\n<div class=\"svgwrap\" id=\"svgwrap\" style=\"display:none\">\n<div class=\"svgscroll\" id=\"svgscroll\">\n<svg id=\"svg\" viewBox=\"0 0 1560 1150\" preserveAspectRatio=\"xMidYMin meet\"></svg>\n</div>\n<svg class=\"axisbar\" id=\"axisbar\" viewBox=\"0 0 1560 20\" preserveAspectRatio=\"xMidYMin meet\"></svg>\n<div id=\"panel\">\n  <div class=\"ph\"><b id=\"panelTitle\"></b><span class=\"vchip\" id=\"panelChip\"></span><button class=\"pclose\" id=\"panelClose\" title=\"关闭（Esc）\">×</button></div>\n  <div class=\"pbody\" id=\"panelBody\"></div>\n</div>\n<div id=\"invpanel\">\n  <div class=\"ph\"><b id=\"invTitle\">支路盘点（按轮次）</b><button class=\"pclose\" id=\"invClose\" title=\"关闭\">×</button></div>\n  <div class=\"pbody\" id=\"invBody\"></div>\n</div>\n</div>\n<div id=\"anasec\"></div>\n<div id=\"tip\"></div>\n\n<script>!function(f){typeof module!='undefined'&&typeof exports=='object'?module.exports=f():typeof define!='undefined'&&define.amd?define(['fzstd',f]):(typeof self!='undefined'?self:this).fzstd=f()}(function(){var _e={};\"use strict\";var r=ArrayBuffer,t=Uint8Array,e=Uint16Array,n=Int16Array,a=Uint32Array,s=Int32Array,i=function(r,e,n){if(t.prototype.slice)return t.prototype.slice.call(r,e,n);(null==e||e<0)&&(e=0),(null==n||n>r.length)&&(n=r.length);var a=new t(n-e);return a.set(r.subarray(e,n)),a},o=function(r,e,n,a){if(t.prototype.fill)return t.prototype.fill.call(r,e,n,a);for((null==n||n<0)&&(n=0),(null==a||a>r.length)&&(a=r.length);n<a;++n)r[n]=e;return r},u=function(r,e,n,a){if(t.prototype.copyWithin)return t.prototype.copyWithin.call(r,e,n,a);for((null==n||n<0)&&(n=0),(null==a||a>r.length)&&(a=r.length);n<a;)r[e++]=r[n++]};_e.ZstdErrorCode={InvalidData:0,WindowSizeTooLarge:1,InvalidBlockType:2,FSEAccuracyTooHigh:3,DistanceTooFarBack:4,UnexpectedEOF:5};var h=[\"invalid zstd data\",\"window size too large (>2046MB)\",\"invalid block type\",\"FSE accuracy too high\",\"match distance too far back\",\"unexpected EOF\"],f=function(r,t,e){var n=Error(t||h[r]);if(n.code=r,Error.captureStackTrace&&Error.captureStackTrace(n,f),!e)throw n;return n},l=function(r,t,e){for(var n=0,a=0;n<e;++n)a|=r[t++]<<(n<<3);return a},v=function(r,t){return(r[t]|r[t+1]<<8|r[t+2]<<16|r[t+3]<<24)>>>0},c=function(r,e){var n=r[0]|r[1]<<8|r[2]<<16;if(3126568==n&&253==r[3]){var a=r[4],i=a>>5&1,o=a>>2&1,u=3&a,h=a>>6;8&a&&f(0);var c=6-i,b=3==u?4:u,y=l(r,c,b),p=h?1<<h:i,w=l(r,c+=b,p)+(1==h&&256),g=w;if(!i){var d=1<<10+(r[5]>>3);g=d+(d>>3)*(7&r[5])}g>2145386496&&f(1);var m=new t((1==e?w||g:e?0:g)+12);return m[0]=1,m[4]=4,m[8]=8,{b:c+p,y:0,l:0,d:y,w:e&&1!=e?e:m.subarray(12),e:g,o:new s(m.buffer,0,3),u:w,c:o,m:Math.min(131072,g)}}if(25481893==(n>>4|r[3]<<20))return v(r,4)+8;f(0)},b=function(r){for(var t=0;1<<t<=r;++t);return t-1},y=function(a,s,i){var o=4+(s<<3),u=5+(15&a[s]);u>i&&f(3);for(var h=1<<u,l=h,v=-1,c=-1,y=-1,p=h,w=new r(512+(h<<2)),g=new n(w,0,256),d=new e(w,0,256),m=new e(w,512,h),z=512+(h<<1),E=new t(w,z,h),k=new t(w,z+h);v<255&&l>0;){var A=b(l+1),T=o>>3,x=(1<<A+1)-1,F=(a[T]|a[T+1]<<8|a[T+2]<<16)>>(7&o)&x,S=(1<<A)-1,B=x-l-1,I=F&S;if(I<B?(o+=A,F=I):(o+=A+1,F>S&&(F-=B)),g[++v]=--F,-1==F?(l+=F,E[--p]=v):l-=F,!F)do{var U=o>>3;c=(a[U]|a[U+1]<<8)>>(7&o)&3,o+=2,v+=c}while(3==c)}(v>255||l)&&f(0);for(var D=0,M=(h>>1)+(h>>3)+3,W=h-1,O=0;O<=v;++O){var j=g[O];if(j<1)d[O]=-j;else for(y=0;y<j;++y){E[D]=O;do{D=D+M&W}while(D>=p)}}for(D&&f(0),y=0;y<h;++y){var C=d[E[y]]++,H=k[y]=u-b(C);m[y]=(C<<H)-h}return[o+7>>3,{b:u,s:E,n:k,t:m}]},p=function(r,n){var a=0,s=-1,i=new t(292),u=r[n],h=i.subarray(0,256),l=i.subarray(256,268),v=new e(i.buffer,268);if(u<128){var c=y(r,n+1,6),p=c[1],w=c[0]<<3,g=r[n+=u];g||f(0);for(var d=0,m=0,z=p.b,E=z,k=(++n<<3)-8+b(g);!((k-=z)<w);){var A=k>>3;if(h[++s]=p.s[d+=(r[A]|r[A+1]<<8)>>(7&k)&(1<<z)-1],(k-=E)<w)break;h[++s]=p.s[m+=(r[A=k>>3]|r[A+1]<<8)>>(7&k)&(1<<E)-1],z=p.n[d],d=p.t[d],E=p.n[m],m=p.t[m]}++s>255&&f(0)}else{for(s=u-127;a<s;a+=2){var T=r[++n];h[a]=T>>4,h[a+1]=15&T}++n}var x=0;for(a=0;a<s;++a)(I=h[a])>11&&f(0),x+=I&&1<<I-1;var F=b(x)+1,S=1<<F,B=S-x;for(B&B-1&&f(0),h[s++]=b(B)+1,a=0;a<s;++a){var I;++l[h[a]=(I=h[a])&&F+1-I]}var U=new t(S<<1),D=U.subarray(0,S),M=U.subarray(S);for(v[F]=0,a=F;a>0;--a){var W=v[a];o(M,a,W,v[a-1]=W+l[a]*(1<<F-a))}for(v[0]!=S&&f(0),a=0;a<s;++a){var O=h[a];if(O){var j=v[O];o(D,a,j,v[O]=j+(1<<F-O))}}return[n,{n:M,b:F,s:D}]},w=y(new t([81,16,99,140,49,198,24,99,12,33,196,24,99,102,102,134,70,146,4]),0,6)[1],g=y(new t([33,20,196,24,99,140,33,132,16,66,8,33,132,16,66,8,33,68,68,68,68,68,68,68,68,36,9]),0,6)[1],d=y(new t([32,132,16,66,102,70,68,68,68,68,36,73,2]),0,5)[1],m=function(r,t){for(var e=r.length,n=new s(e),a=0;a<e;++a)n[a]=t,t+=1<<r[a];return n},z=new t(new s([0,0,0,0,16843009,50528770,134678020,202050057,269422093]).buffer,0,36),E=m(z,0),k=new t(new s([0,0,0,0,0,0,0,0,16843009,50528770,117769220,185207048,252579084,16]).buffer,0,53),A=m(k,3),T=function(r,t,e){var n=r.length,a=t.length,s=r[n-1],i=(1<<e.b)-1,o=-e.b;s||f(0);for(var u=0,h=e.b,l=(n<<3)-8+b(s)-h,v=-1;l>o&&v<a;){var c=l>>3;t[++v]=e.s[u=(u<<h|(r[c]|r[c+1]<<8|r[c+2]<<16)>>(7&l))&i],l-=h=e.n[u]}l==o&&v+1==a||f(0)},x=function(r,t,e){var n=6,a=t.length+3>>2,s=a<<1,i=a+s;T(r.subarray(n,n+=r[0]|r[1]<<8),t.subarray(0,a),e),T(r.subarray(n,n+=r[2]|r[3]<<8),t.subarray(a,s),e),T(r.subarray(n,n+=r[4]|r[5]<<8),t.subarray(s,i),e),T(r.subarray(n),t.subarray(i),e)},F=function(r,n,a){var s,u=n.b,h=r[u],l=h>>1&3;n.l=1&h;var v=h>>3|r[u+1]<<5|r[u+2]<<13,c=(u+=3)+v;if(1==l){if(u>=r.length)return;return n.b=u+1,a?(o(a,r[u],n.y,n.y+=v),a):o(new t(v),r[u])}if(!(c>r.length)){if(0==l)return n.b=c,a?(a.set(r.subarray(u,c),n.y),n.y+=v,a):i(r,u,c);if(2==l){var m=r[u],F=3&m,S=m>>2&3,B=m>>4,I=0,U=0;F<2?1&S?B|=r[++u]<<4|(2&S&&r[++u]<<12):B=m>>3:(U=S,S<2?(B|=(63&r[++u])<<4,I=r[u]>>6|r[++u]<<2):2==S?(B|=r[++u]<<4|(3&r[++u])<<12,I=r[u]>>2|r[++u]<<6):(B|=r[++u]<<4|(63&r[++u])<<12,I=r[u]>>6|r[++u]<<2|r[++u]<<10)),++u;var D=a?a.subarray(n.y,n.y+n.m):new t(n.m),M=D.length-B;if(0==F)D.set(r.subarray(u,u+=B),M);else if(1==F)o(D,r[u++],M);else{var W=n.h;if(2==F){var O=p(r,u);I+=u-(u=O[0]),n.h=W=O[1]}else W||f(0);(U?x:T)(r.subarray(u,u+=I),D.subarray(M),W)}var j=r[u++];if(j){255==j?j=32512+(r[u++]|r[u++]<<8):j>127&&(j=j-128<<8|r[u++]);var C=r[u++];3&C&&f(0);for(var H=[g,d,w],L=2;L>-1;--L){var Z=C>>2+(L<<1)&3;if(1==Z){var q=new t([0,0,r[u++]]);H[L]={s:q.subarray(2,3),n:q.subarray(0,1),t:new e(q.buffer,0,1),b:0}}else 2==Z?(u=(s=y(r,u,9-(1&L)))[0],H[L]=s[1]):3==Z&&(n.t||f(0),H[L]=n.t[L])}var G=n.t=H,J=G[0],K=G[1],N=G[2],P=r[c-1];P||f(0);var Q=(c<<3)-8+b(P)-N.b,R=Q>>3,V=0,X=(r[R]|r[R+1]<<8)>>(7&Q)&(1<<N.b)-1,Y=(r[R=(Q-=K.b)>>3]|r[R+1]<<8)>>(7&Q)&(1<<K.b)-1,$=(r[R=(Q-=J.b)>>3]|r[R+1]<<8)>>(7&Q)&(1<<J.b)-1;for(++j;--j;){var _=N.s[X],rr=N.n[X],tr=J.s[$],er=J.n[$],nr=K.s[Y],ar=K.n[Y],sr=1<<nr,ir=sr+((r[R=(Q-=nr)>>3]|r[R+1]<<8|r[R+2]<<16|r[R+3]<<24)>>>(7&Q)&sr-1);R=(Q-=k[tr])>>3;var or=A[tr]+((r[R]|r[R+1]<<8|r[R+2]<<16)>>(7&Q)&(1<<k[tr])-1);R=(Q-=z[_])>>3;var ur=E[_]+((r[R]|r[R+1]<<8|r[R+2]<<16)>>(7&Q)&(1<<z[_])-1);if(R=(Q-=rr)>>3,X=N.t[X]+((r[R]|r[R+1]<<8)>>(7&Q)&(1<<rr)-1),R=(Q-=er)>>3,$=J.t[$]+((r[R]|r[R+1]<<8)>>(7&Q)&(1<<er)-1),R=(Q-=ar)>>3,Y=K.t[Y]+((r[R]|r[R+1]<<8)>>(7&Q)&(1<<ar)-1),ir>3)n.o[2]=n.o[1],n.o[1]=n.o[0],n.o[0]=ir-=3;else{var hr=ir-(0!=ur);hr?(ir=3==hr?n.o[0]-1:n.o[hr],hr>1&&(n.o[2]=n.o[1]),n.o[1]=n.o[0],n.o[0]=ir):ir=n.o[0]}for(L=0;L<ur;++L)D[V+L]=D[M+L];M+=ur;var fr=(V+=ur)-ir;if(fr<0){var lr=-fr,vr=n.e+fr;for(lr>or&&(lr=or),L=0;L<lr;++L)D[V+L]=n.w[vr+L];V+=lr,or-=lr,fr=0}for(L=0;L<or;++L)D[V+L]=D[fr+L];V+=or}if(V!=M)for(;M<D.length;)D[V++]=D[M++];else V=D.length;a?n.y+=V:D=i(D,0,V)}else if(a){if(n.y+=B,M)for(L=0;L<B;++L)D[L]=D[M+L]}else M&&(D=i(D,M));return n.b=c,D}f(2)}},S=function(r,e){if(1==r.length)return r[0];for(var n=new t(e),a=0,s=0;a<r.length;++a){var i=r[a];n.set(i,s),s+=i.length}return n};function B(r,t){for(var e=[],n=+!t,a=0,s=0;r.length;){var i=c(r,n||t);if(\"object\"==typeof i){for(n?(t=null,i.w.length==i.u&&(e.push(t=i.w),s+=i.u)):(e.push(t),i.e=0);!i.l;){var o=F(r,i,t);o||f(5),t?i.e=i.y:(e.push(o),s+=o.length,u(i.w,0,o.length),i.w.set(o,i.w.length-o.length))}a=i.b+4*i.c}else a=i;r=r.subarray(a)}return S(e,s)}_e.decompress=B;var I=function(){function r(r){this.ondata=r,this.c=[],this.l=0,this.z=0}return r.prototype.push=function(r,e){if(\"number\"==typeof this.s){var n=Math.min(r.length,this.s);r=r.subarray(n),this.s-=n}var a=r.length+this.l;if(!this.s){if(e){if(!a)return void this.ondata(new t(0),!0);a<5&&f(5)}else if(a<18)return this.c.push(r),void(this.l=a);if(this.l&&(this.c.push(r),r=S(this.c,a),this.c=[],this.l=0),\"number\"==typeof(this.s=c(r)))return this.push(r,e)}if(\"number\"!=typeof this.s){if(a<(this.z||3))return e&&f(5),this.c.push(r),void(this.l=a);if(this.l&&(this.c.push(r),r=S(this.c,a),this.c=[],this.l=0),!this.z&&a<(this.z=2&r[this.s.b]?4:3+(r[this.s.b]>>3|r[this.s.b+1]<<5|r[this.s.b+2]<<13)))return e&&f(5),this.c.push(r),void(this.l=a);for(this.z=0;;){var s=F(r,this.s);if(!s){e&&f(5);var i=r.subarray(this.s.b);return this.s.b=0,this.c.push(i),void(this.l+=i.length)}if(this.ondata(s,!1),u(this.s.w,0,s.length),this.s.w.set(s,this.s.w.length-s.length),this.s.l){var o=r.subarray(this.s.b);return this.s=4*this.s.c,void this.push(o,e)}}}else e&&f(5)},r}();_e.Decompress=I;return _e})<\/script>\n<script>\n'use strict'\n/* ==================== 界面语言：zh/en 双字典 + 结构化判定依据渲染 ====================\n   独立打开时按浏览器语言兜底；嵌入宿主时由宿主 postMessage {kind:'trace-locale', lang}\n   跟随 dsh 的语言设置（同主题跟随的通道模式）。切语言即时生效：静态文案重写 +\n   数据视图全量重建（判定依据是 {k,p} 结构化键值，本函数集中渲染成当前语言文案）。 */\nconst I18N = {\n  zh: {\n    title: 'DSH Maze 执行迷宫',\n    sub: '上传 1 个 session log（.jsonl / .jsonl.zstd）单独展示，或 2~5 个进行同时间轴对比。识别为同一任务的多次跑（首条用户消息一致）时启用对比件：按轮次自动对齐 + 手动锚点 + 支路盘点；任务不同则仅同轴并排。实线 = 主干路径，虚线 = 探索支路，✗/· 后折返；节点长度 = 步骤耗时。悬停快速预览，点击打开详情面板；滚轮缩放、拖拽平移、双击复位。',\n    dropHtml: '<b>点击选择或拖拽</b> 1~5 个 session log（.jsonl / .json / .jsonl.zstd）<br><span class=\"drop-hint\">上传 1 个文件 → 单会话展示；2~5 个文件 → 同时间轴对比；.zstd 压缩文件由浏览器直接解压；按内容识别格式，文件名任意（如 macOS 副本「xxx.jsonl 2」）</span>',\n    dropCompact: '<b>＋ 添加或替换文件</b>',\n    play: '▶ 播放', pause: '⏸ 暂停', replay: '▶ 重播',\n    fit: '⤢ 整图', fitTitle: '复位缩放（双击空白处同效）', zoomhint: '滚轮缩放 · 拖拽平移',\n    zoomhintScroll: '滚轮上下 · ⌘/Ctrl+滚轮缩放 · 拖拽平移',\n    fltFail: '只看失败/重试', allTools: '全部工具', searchPh: '搜索命令与返回内容…',\n    fltCount: (hit, total) => `命中 ${hit} / ${total} 步`,\n    anchorBtn: '🔗 加锚点', anchorTitle: '在任意两条泳道各点一个节点，钉一条对比锚线；点已钉的锚线可删除',\n    anchorFirst: '点第一个节点…（再按取消）', anchorSecond: '再点另一会话的节点…',\n    anchorDel: '点击删除此锚点',\n    invBtn: '📋 支路盘点', invTitle: '按轮次盘点各泳道的支路差额', invHeader: '支路盘点（按轮次）',\n    expSvgTitle: '导出当前视图为 SVG', expPngTitle: '导出当前视图为 PNG（2x）',\n    closeEsc: '关闭（Esc）', close: '关闭',\n    laneCur: '当前会话', laneN: i => `第 ${i} 会话`,\n    vError: '失败 ✗', vDead: '扑空 ·', vRetry: '无效重试 ↻', vOk: '成功', vAnswer: '回答',\n    lgMain: m => `主干路径${m ? '（' + m + '）' : ''}`,\n    lgMainN: (i, m) => `第 ${i} 会话主干${m ? '（' + m + '）' : ''}`,\n    lgOut: '出程探索', lgOutTitle: '从分支点出发的探索',\n    lgBack: '回程折返', lgBackTitle: '失败后折返分支点',\n    lgAnswer: '最终回答', lgIdle: '⏸ 空闲已折叠',\n    lgStep: '#️⃣ 步序视图：每列一步',\n    lgStepTitle: '横轴按步序，每步等宽、与墙钟解耦；列宽不代表耗时。列头 S<步号> 悬停可看该步真实起止与耗时',\n    axisTime: '🕒 时间轴', axisTimeTitle: '横轴按真实时间（长等待折成细缝）；点击切到步序视图',\n    axisStep: '#️⃣ 步序', axisStepTitle: '横轴按步序，每步一列等宽、与墙钟解耦；点击切回时间轴',\n    lgCompactReal: '⌄ 压缩事件（日志记录）', lgCompactRealTitle: '日志里有 compaction/start 事件，按事件时刻标注；悬停看压缩前后占用',\n    lgCompactGuess: '⌄ 压缩（按骤降推断）', lgCompactGuessTitle: '这份日志没有 compaction 事件，标注是按相邻请求占用骤降 ≥20% 推断的',\n    lgPruneMarks: '┊ 工具结果被裁剪', lgPruneTitle: '日志里的 compaction/prune：工具结果被裁掉以腾出上下文',\n    ctxReal: '压缩事件', ctxGuess: '压缩（推断）',\n    ctxRealNote: '来自日志里的 compaction 事件', ctxGuessNote: '日志没有 compaction 事件，按相邻请求占用骤降 ≥20% 推断',\n    ctxPruneTip: a => `工具结果被裁剪（prune）；裁剪前上下文约 ${a} tok`,\n    ccTitle: '上下文里装了什么', ccHint: '按字符数估算，不是 token 真值',\n    ccName: { sys: '系统提示', skills: '技能目录', plugin: '插件注入', tool: '工具返回', user: '用户消息', assistant: '模型输出' },\n    ccSkills: (n, loaded, names) => `技能目录 ${n} 个，本场加载 ${loaded} 个${loaded > 0 && names ? '：' + names + (loaded > 4 ? ' 等' : '') : ''}`,\n    ccInstr: n => `指令文件 ${n} 个（日志只有路径与摘要，正文大小未记录）`,\n    ccPlugins: n => `插件注入来自 ${n} 个插件`,\n    ccLiveNote: '实时页签只统计已加载窗口内的部分',\n    cvTitle: '对比变量表', cvHint: '受控对比 = 除模型外全部相同',\n    sugTitle: '优化建议', sugHint: '每条都写着本场实测的数字；点一条定位到相关调用',\n    sugNone: '本场没有触发任何建议模板（阈值按本机 240 场会话校准，只挑少数会话才会亮的问题）。',\n    sugNote: '建议由确定性规则从本场日志算出，不调用模型；阈值与依据见 README「优化建议」一节。',\n    sugName: { unrecovered: '失败后没换策略', identicalRetry: '失败后原样重试', loop: '疑似卡在循环', wroteNoVerify: '改了文件但没验证', ctxPeak: '上下文接近窗口上限', compaction: '本场发生上下文压缩', toolHeavy: '工具返回占上下文偏高', sameTurnRepeats: '同轮重复调用', todoStale: '待办清单陈旧', skillsUnused: '技能目录大且未加载' },\n    cvVar: '变量', cvState: '状态', cvLane: i => `第 ${i} 次`, cvNoRecord: '日志未记录',\n    cvSame: '相同', cvDiff: '不同', cvUnknown: '未记录',\n    cvName: { provider: '提供方', reasoningEffort: '推理强度', agentPreset: 'Agent 预设', permission: '权限预设', sandbox: '沙箱模式', approval: '审批策略', instructions: '指令文件', skills: '技能目录', cwd: '工作目录', model: '模型' },\n    cvControlled: models => `受控对比：除模型外全部相同（模型：${models}），两次跑的差额可以算到模型头上。`,\n    cvLikely: (n, names) => `疑似受控：已记录的变量都相同，但有 ${n} 项日志没记录（${names}），无法确认完全一致——结论请当参考。`,\n    cvExploratory: (n, names) => `探索性对比：除模型外还有 ${n} 项不同（${names}），不能把差额算到模型头上。`, \n    lgAlign: '轮次对齐线', lgAlignTitle: '每轮回答互连；标注为本轮耗时（不含轮间等待）',\n    lgAnchor: '手动锚点', lgAnchorTitle: '🔗 添加 · 点线删除',\n    lgSameTask: n => `⛓ 已识别为同一任务 ×${n}，对比功能启用`,\n    lgSameTaskTitle: '各文件首条用户消息一致，判定为同一任务的多次跑',\n    lgDiffTask: '≠ 任务不同，仅同轴并排（对齐线/盘点已停用）',\n    lgDiffTaskTitle: '各文件首条用户消息不一致；轮次对齐在不同任务间没有意义',\n    lgNoFirstUser: '≠ 无法判定是否同一任务（有文件缺首条用户消息），仅同轴并排',\n    lgNoFirstUserTitle: '同任务识别依赖各文件的首条用户消息；缺失时对比件（对齐线/锚点/盘点）停用',\n    modelUnknown: '未知模型', modelNoHeader: '(模型未知：会话早期记录未加载)', modelNone: '(未知模型)',\n    laneInfo: (turns, st) => `${turns > 1 ? turns + ' 轮 · ' : ''}${st.steps} 步（主干 ${st.main} / 支路 ${st.detours}）· ${st.tools} 次工具调用 · ${laneTokLabel(st)} · 总耗时 ${fmtT(st.T)}`,\n    preWindow: n => ` · ⏮ 另有 ${n} 步更早历史未加载`,\n    turnLabel: n => `第 ${n} 轮`,\n    alignLabel: (turn, a, b, d) => `第 ${turn} 轮耗时：1st ${a} ↔ 2nd ${b}（Δ${d}）`,\n    alignDet: (a, b) => ` · 支路 ${a}↔${b}`,\n    alignLabelN: (turn, list) => `第 ${turn} 轮耗时：${list}`,\n    rzTok: n => '推理 ' + n.toLocaleString() + ' tok', rzSeg: n => '推理 ' + n.toLocaleString() + ' 段（日志未报 token 用量）',\n    outTok: n => '输出 ' + n.toLocaleString() + ' tok',\n    statsCard: st => `主干 ${st.main} 步 + 支路 ${st.detours} 步 = ${st.steps} 步 · ${st.tools} 次工具调用 · ${laneTokLabel(st)} · 总耗时 <b>${fmtT(st.T)}</b>`,\n    invTurnCol: '轮次', invLaneCol: i => `第 ${i} 会话支路`, invDiffCol: '差额', invTotal: '合计',\n    invSteps: n => `${n} 步`, invNone: '两边都无支路', invEven: '≈持平',\n    invMore: (i, d) => `第 ${i} 会话多耗 ${d}`,\n    invHint: '点一行：缩放到该轮并只保留该轮支路（其余淡化），再点同一行取消。支路耗时为墙钟时间；✗ 失败 · ↻ 无效重试 · · 扑空。',\n    tracksBtn: '📊 轨道', tracksTitle: '显示/隐藏泳道下方的数据轨道（工具调用 · Token 脉冲 · 上下文压力）', agHeader: 'Agent 关系图谱',\n    trkTools: '工具调用', trkTok: 'Token 脉冲', trkCtx: '上下文压力',\n    catNames: { read: '读', search: '搜', shell: '命令', edit: '编辑', other: '其他' },\n    trkToolsCap: n => `共 ${n} 次`,\n    trkTokCap: (i, o, c) => `输入峰值 ${fmtTok(i)} · 输出峰值 ${fmtTok(o)}${c > 0 ? '（缓存背景峰值 ' + fmtTok(c) + '）' : ''}`,\n    trkCtxCapPct: (p, w) => `峰值 ${p}%（窗口 ${fmtTok(w)}）`,\n    trkCtxCapAbs: n => `峰值 ${fmtTok(n)} tok（模型窗口未知或过时，示绝对值）`,\n    trkCtxWinSwitch: ws => `，会话中途切过窗口：${ws.map(fmtTok).join(' → ')}`,\n    trkCtxStale: n => `；${n} 个样本的窗口值不可信（请求超过了它声称的窗口），已略过`,\n    ctxDropTip: (a, b, p) => `上下文压缩：${a.toLocaleString()} → ${b.toLocaleString()} tok（−${p}%）`,\n    msDur: '总时长', msCalls: (s, t) => `${s} 步 · ${t} 次调用`, msSubCalls: n => ` · 子代理另有 ${n} 次`, msPeak: '峰值上下文',\n    subHidden: n => ` · 另有 ${n} 个子代理未展开`,\n    msTok: (i, o) => [i ? `输入 ${i}` : '', o ? `输出 ${o}` : ''].filter(Boolean).join(' · '),\n    clusterTip: n => `此处 ${n} 条支路，点击放大`,\n    tokCache: '缓存输入', tokIn: '未缓存输入', tokRz: '推理', tokOutVis: '可见输出', tokTotal: '合计',\n    ctxTipPct: (v, p) => `上下文 ${v.toLocaleString()} tok · 占窗口 ${p}%`,\n    ctxTipAbs: v => `上下文 ${v.toLocaleString()} tok（模型窗口未知）`,\n    cardFail: '工具失败与恢复', cardTime: '时间消耗', cardCtx: '上下文压力',\n    cardFailBody: (f, tot, tool, k) => `${f} 次失败 / ${tot} 次调用${tool ? `，失败最多 ${tool}（${k} 次）` : ''}`,\n    cardFailRec: (rec, f, w) => `${rec}/${f} 次在 ${w} 秒内恢复`,\n    cardFailNone: '没有失败调用',\n    cardFailRate: p => `失败率 ${p}%`,\n    cardFailEvt: n => `请求级失败 ${n} 次（模型请求重试/终局失败，不计入工具统计）`,\n    cardTimeBody: (tool, d) => `最长调用 ${tool} · ${d}`,\n    cardTimeShare: p => `工具累计耗时占活动时间 ${p}%（空闲已剔除）`,\n    cardCtxPct: (v, p) => `最大上下文 ${v.toLocaleString()} tok · 峰值占用 ${p}%`,\n    cardCtxOver: th => `已越过 ${th}% 阈值`,\n    cardCtxUnder: '在安全区',\n    cardCtxAbs: v => `最大上下文 ${v.toLocaleString()} tok（模型窗口未知）`,\n    cardCtxNone: '日志未报 token 用量',\n    mtTool: '工具', mtCalls: '次数', mtOk: '成功', mtErr: '失败', mtDead: '扑空', mtRetry: '盲重试', mtRate: '成功率',\n    mtP50: 'P50', mtP95: 'P95', mtMax: '最长', mtSum: '累计',\n    anaMatrix: '工具结果矩阵', anaDur: '耗时分位（按工具）', anaChains: '失败恢复链',\n    chainsNone: '本会话没有失败调用',\n    chainTag: { identical: '原样重试', strategy: '换参数', switch: '换工具', none: '未恢复' },\n    chainRec: s => `${fmtT(s)} 后回到成功`, chainRecSlow: s => `${fmtT(s)} 后才回到成功`, chainNoRec: '此后再无成功调用',\n    anaChainHint: '恢复 = 失败后任意工具再次成功；标签看失败后的下一次调用是否换了做法（120 秒窗口判「已恢复」）。链只统计失败（✗）；扑空（·）与盲重试（↻）计入矩阵各自列、不单独进链，盲重试也不算恢复证据。点一条缩放到该失败并打开详情。',\n    agMain: '主 Agent', agSubNone: '本会话没有子代理任务',\n    agTok: n => `${fmtTok(n)} tok`, agTokNone: '（日志未报 token）',\n    agCalls: n => `${n} 次工具调用`, agRunningTag: '运行中',\n    agHint: '节点大小 = 该 Agent 消耗的 token（输入+缓存+输出）；连线粗细 = 工具调用数。点子代理节点跳到它在时间轴上的位置。',\n    ocHeader: '结果与证据',\n    ocOverall: { done: '已完成', partial: '部分成功', unverified: '未验证' },\n    ocCell: { task: '任务完成', test: '测试', build: '构建', lint: 'Lint', artifacts: '产物', human: '人工确认' },\n    ocTaskS: { done: '已结束', failed: '未正常结束', noAnswer: '没有最终回答', unfinished: '未收尾', running: '进行中' },\n    ocTask: {\n      done: (turn, reason) => `第 ${turn} 轮正常结束` + (reason !== 'completed' ? `（结束原因：${reason}）` : ''),\n      failed: (turn, reason) => `第 ${turn} 轮以 ${reason} 收尾`,\n      noAnswer: turn => `第 ${turn} 轮结束了，但最后一步不是回答`,\n      unfinished: turn => turn != null ? `第 ${turn} 轮没有结束事件（会话没收尾，或日志没加载完）` : '没有任何轮次',\n      running: turn => `第 ${turn} 轮仍在进行`,\n    },\n    ocPass: '通过', ocFail: '最后一次失败', ocNotRun: '没有跑',\n    ocRuns: (runs, cmds) => `${runs} 次运行 · ${cmds} 条命令`,\n    ocFailedCmds: n => `，此前 ${n} 条命令的最后一次失败`,\n    ocExit: code => `退出码 ${code}`,\n    ocBgUnresolved: n => `后台任务未取到退出码 ×${n}`,\n    ocArtifactsN: n => `${n} 个文件`, ocArtifactsNone: '没有写入/编辑文件',\n    ocWrites: (w, f) => `${w} 次成功写入${f > 0 ? ` · ${f} 次写入失败` : ''}`,\n    ocPathsToggle: '文件列表',\n    ocHumanYes: '用户已回应', ocHumanNo: '回答后没有用户消息', ocHumanNA: '没有最终回答可回应',\n    ocSummary: {\n      done: (ran, missing) => `最后一轮正常结束，${ran}通过` + (missing ? `；没有跑${missing}` : ''),\n      partial: reasons => reasons.join('；'),\n      unverified: '本场没有跑测试/构建/Lint，结果未经验证',\n    },\n    ocReason: { task: '任务没有正常结束', test: '测试最后一次失败', build: '构建最后一次失败', lint: 'Lint 最后一次失败' },\n    ocHint: '口径：测试/构建/Lint 按命令正则在命令位置识别（初版覆盖 JS/TS、Python、Rust、Go、Swift；npm/pnpm/yarn 的 check 脚本按测试计），一条命令命中多类分别记；通过 = 该调用没有错误标志、返回末行没有非零退出码；后台任务按之后 job_output 末行的退出码计，取不到就不计并标注；每个类别以最后一次运行的结果为准，此前别的命令最后一次失败的条数小字注明。产物 = 写入/编辑类调用成功触及的文件（去重）。任务完成 = 最后一轮的 turn/end 不是 error/aborted/interrupted/blocked，且最后一步是回答。人工确认只看最终回答之后有没有真人消息，不解读内容。「未验证」是中性的，不当失败。点测试/构建/Lint 格定位到最后一次运行所在的那一步并打开该步详情。',\n    ocCode: n => `code 模式会话（run_code ×${n}）：脚本内部派发的真实工具调用暂不识别，以上各格只统计直接调用。`,\n    anaSignals: '行为信号',\n    sigNone: '本场没有触发任何信号',\n    sigSev: { high: '高', medium: '中', low: '低', info: '信息' },\n    sigName: { mechanicalRetry: '失败后原样重试', repeat: '同轮重复调用', loop: '循环', toolFail: '工具失败', slowCall: '慢调用', concentration: '工具集中度', ctxJump: '上下文骤升', ctxDrop: '上下文骤降', ctxPeak: '上下文峰值', compaction: '压缩发生', todoStale: '待办陈旧', adaptiveRecovery: '换策略恢复' },\n    sigCalls: n => `${n} 次调用`,\n    sigHint: '阈值按本机 202 份会话校准（2026-09-06 定，2026-09-07 修正校准脚本后重跑；「中」落在最差的 15%~20% 会话，「高」落在最差的 3%~5%），常量在 verdict.js 的 ANALYSIS_RULES.SIGNALS。各信号独立计数：循环与同轮重复、原样重试与工具失败可能指向同一段调用，各说各的事实；工具失败与换策略恢复沿用迷宫的判定（错误标志 + 输出失败特征），比只看错误标志宽。参数签名截到 300 字，更长的命令只比前 300 字。code 模式本版只统计外层 run_code 调用，内部派发未展开，与校准集的 code 模式数字不可直接对照。上下文占用按每次请求当时的模型换算窗口（上传日志读 request/context 真值；实时页签只缺窗口真值，按逐请求模型查表）。点一条淡化其他节点并定位到该段第一个调用，再点同一条或按 Esc 取消；与「只看失败/重试」等过滤是同时生效的叠加。',\n\n    subPrefix: '子代理 ', subBranch: '子代理支路', detBranch: '探索支路',\n    evtRetry: '请求失败重试', evtTurnError: '请求终局失败',\n    mainStep: '主干推进', finalAnswer: '最终回答', rejected: '（被打回）',\n    whyLabel: '判定依据：', whyShort: '判定：',\n    spanTo: (a, b) => `时段 ${a} → ${b}`, durP: d => `（${d}s）`,\n    subSpawn: (n, live) => `⤴ 由主干 S${n} 派生的子代理任务${live ? '，仍在运行' : '，完成后结果汇回主干'}`,\n    outCurve: (n, a, b) => `出程曲线自分支点 S${n} 分叉（x 位置），于 ${a} → ${b} 生长完成`,\n    deadReturn: n => `↩ 此路不通，折返回分支点（S${n}）`,\n    deadReturnPanel: n => `↩ 此路不通，自分支点 S${n} 出发并折返`,\n    branchOrigin: n => `⦿ 分支原点：${n} 条探索支路从这里出发并折返`,\n    resultLabel: '返回：', rzExcerpt: '思考摘要：', rzExcerptTitle: '思考摘要',\n    parallelCall: '并行调用', running: '进行中', noArgs: '(无参数)',\n    took: d => `耗时 ${d}s`, turnSuffix: n => ` · 第 ${n} 轮`,\n    jumpBtn: '↗ 在对话中定位此步骤', copyCmd: '复制命令', copyRes: '复制返回',\n    copied: '已复制', copyFail: '复制失败', resultHead: '返回内容',\n    chars5000: '前 5000 字', charsN: n => `${n} 字`,\n    ptFail: ' · ✗ 失败', ptRetry: ' · ↻ 无效重试',\n    errParse: m => '解析失败：' + m,\n    errNotJsonl: '文件不是有效的 JSONL（每行一个 JSON 对象）',\n    errNoSteps: '没有可解析的有效步骤（step/start 事件缺失？）',\n    errMax: '最多上传 5 个 session log',\n    errReadFile: (name, m) => `读取文件失败：${name}（${m}）`,\n    errZstd: '此浏览器不支持 zstd 解压，请先在终端执行 zstd -d 解压后上传 .jsonl',\n    errUrl: (p, m) => `URL 加载失败：${p}（${m}）`,\n    errPngCanvas: 'PNG 导出失败：canvas 编码为空', errPngRaster: 'PNG 导出失败：SVG 栅格化未成功',\n    why: {\n      sugUnrecovered: p => `${p[0]} 处失败之后没有换参数也没有换工具，那一步就停在那里（本场共 ${p[1]} 条失败链）`,\n      sugIdenticalRetry: p => `失败后用同一条命令原样重试了 ${p[0]} 次——先看清错误信息再改参数，比重跑一次便宜`,\n      sugLoop: p => `有 ${p[0]} 步在重复同一个调用序列，像是卡在循环里：把目标拆小或换个入口`,\n      sugWroteNoVerify: p => `本场写了 ${p[0]} 个文件，但没有跑过任何测试/构建/Lint——改完至少跑一次能挡回归`,\n      sugCtxPeak: p => `上下文峰值占到窗口的 ${p[0]}%（窗口 ${p[1]?.toLocaleString?.() ?? p[1]} tok），接近上限；换大窗口或先把中间产物落盘`,\n      sugCompaction: p => `本场触发上下文压缩 ${p[0]} 次、工具结果被裁剪 ${p[1]} 次：单场任务偏大，拆段或落盘能少丢上下文`,\n      sugToolHeavy: p => `工具返回占了上下文的 ${p[0]}%（约 ${p[1]}k 字符）：大输出建议落盘后只读需要的段`,\n      sugSameTurnRepeats: p => `同一轮里同参数调用了 ${p[0]} 次（占本场调用 ${p[1]}%）：同一份内容读一次就够`,\n      sugTodoStale: p => `待办清单被提醒了 ${p[0]} 次（清单与实际进度脱节）：把已完成项划掉再往下走`,\n      sugSkillsUnused: p => `技能目录有 ${p[0]} 条（约 ${p[1]}k 字符），本场一条都没加载：目录也是每次请求的成本，可按需精简`,\n      errFlag: () => '工具返回错误标志（isError）',\n      errStrong: p => `输出命中失败特征「${p[0]}」`,\n      errWeak: p => `输出开头命中失败特征「${p[0]}」`,\n      writeOk: () => '写入类工具，无错误即成功',\n      searchEmpty: () => '检索返回为空，判为扑空',\n      searchNoHit: () => '检索开头命中无结果特征，判为扑空',\n      searchOk: () => '检索有返回',\n      exitNoOut: () => '退出正常但无输出，判为扑空',\n      exitOk: () => '退出正常且有输出',\n      retryCtx: p => `处于连续重试簇（同一操作共 ${p[0]} 次）`,\n      retryCluster: p => `同一操作连续重试 ${p[0]} 次（其中 ${p[1]} 次失败），判为盲目重试`,\n      noTools: () => '无工具调用，输出回答',\n      pendingTools: () => '工具结果未返回，暂留主干',\n      child: p => `子代理「${p[0]}」· ${p[1]} 步 · ${p[2]} 次工具调用${p[3] === 1 ? ' · 运行中' : p[3] === 2 ? ' · 以错误收尾' : ''}`,\n      llmRetry: p => `请求失败，安排第 ${p[0]}/${p[1]} 次重试${p[4] ? '（该重试已被取消，不再等待）' : `，退避等待 ${p[2]}s`}；失败原因：${p[3]}`,\n      turnError: p => `请求终局失败，不再重试${p[1] ? `（${p[1]}）` : ''}：${p[0]}`,\n      sigMechanical: p => `上一次失败后同工具同参数原样重试 ${p[0]} 次`,\n      sigRepeat: p => `同一轮里同工具同参数再次出现 ${p[0]} 次，占本场调用 ${p[1]}%${p[2] ? `（其中重复读取 ${p[2]} 次）` : ''}`,\n      sigLoop: p => `长度 1~3 的调用序列连续重复 3 次，共 ${p[0]} 段、占用 ${p[1]} 步`,\n      sigFail: p => `${p[0]} 次失败 / ${p[1]} 次调用，失败率 ${p[2]}%`,\n      sigSlow: p => `${p[0]} 次调用超过 120 秒，最长 ${p[1]} 秒（${p[2]}）`,\n      sigHhi: p => `赫芬达尔指数 ${p[0]}，${p[1]} 占 ${p[2]}%`,\n      sigCtxUp: p => `相邻两次请求占用上升 ≥20 个百分点 ${p[0]} 次，首次 ${p[1]}% → ${p[2]}%`,\n      sigCtxDown: p => `相邻两次请求占用下降 ≥20 个百分点 ${p[0]} 次，首次 ${p[1]}% → ${p[2]}%${p[3] ? `，其中 ${p[3]} 次对应压缩事件` : ''}`,\n      sigCtxPeak: p => `上下文峰值占窗口 ${p[0]}%（窗口 ${fmtTok(p[1])}）`,\n      sigCompaction: p => `发生上下文压缩 ${p[0]} 次${p[1] ? `，工具结果被裁剪（prune）${p[1]} 次` : ''}`,\n      sigTodo: p => `todo-freshness-guard 提醒 ${p[0]} 次`,\n      sigAdaptive: p => `失败后同目标换参数或换工具成功 ${p[0]} 次`,\n    },\n  },\n  en: {\n    title: 'DSH Maze',\n    sub: 'Upload 1 session log (.jsonl / .jsonl.zstd) for a single run, or 2–5 for a same-axis comparison. Runs of the same task (identical first user message) get the full compare kit: per-turn auto alignment + manual anchors + detour inventory; different tasks render side-by-side only. Solid = main path, dashed = exploration detours with ✗/· and backtracks; bar length = step duration. Hover for a quick preview, click for the detail panel; wheel to zoom, drag to pan, double-click to reset.',\n    dropHtml: '<b>Click to choose or drag in</b> 1–5 session logs (.jsonl / .json / .jsonl.zstd)<br><span class=\"drop-hint\">1 file → single-session view; 2–5 files → same-axis comparison; .zstd decompresses in the browser; format is detected from content, any filename works (e.g. macOS copies like “xxx.jsonl 2”)</span>',\n    dropCompact: '<b>＋ Add or replace files</b>',\n    play: '▶ Play', pause: '⏸ Pause', replay: '▶ Replay',\n    fit: '⤢ Fit', fitTitle: 'Reset zoom (double-click empty space does the same)', zoomhint: 'wheel to zoom · drag to pan',\n    zoomhintScroll: 'wheel to scroll · ⌘/Ctrl+wheel to zoom · drag to pan',\n    fltFail: 'Failures/retries only', allTools: 'All tools', searchPh: 'Search commands & results…',\n    fltCount: (hit, total) => `${hit} / ${total} steps match`,\n    anchorBtn: '🔗 Add anchor', anchorTitle: 'Click one node in each of any two lanes to pin a comparison line; click a pinned line to delete it',\n    anchorFirst: 'Click the first node… (press again to cancel)', anchorSecond: 'Now click a node in another session…',\n    anchorDel: 'Click to delete this anchor',\n    invBtn: '📋 Detour inventory', invTitle: 'Per-turn tally of each lane’s detours', invHeader: 'Detour inventory (by turn)',\n    expSvgTitle: 'Export the current view as SVG', expPngTitle: 'Export the current view as PNG (2x)',\n    closeEsc: 'Close (Esc)', close: 'Close',\n    laneCur: 'Current session', laneN: i => `Session ${i}`,\n    vError: 'Failed ✗', vDead: 'No result ·', vRetry: 'Blind retry ↻', vOk: 'OK', vAnswer: 'Answer',\n    lgMain: m => `Main path${m ? ' (' + m + ')' : ''}`,\n    lgMainN: (i, m) => `Session ${i} main path${m ? ' (' + m + ')' : ''}`,\n    lgOut: 'Outbound exploration', lgOutTitle: 'Exploration leaving a branch point',\n    lgBack: 'Return backtrack', lgBackTitle: 'Backtrack to the branch point after a failure',\n    lgAnswer: 'Final answer', lgIdle: '⏸ idle collapsed',\n    lgStep: '#️⃣ Step view: one column per step',\n    lgStepTitle: 'Axis runs in step order: every step gets an equal column, decoupled from wall-clock time — column width is not duration. Hover a column header (S<n>) for that step\\u2019s real start, end and duration.',\n    axisTime: '🕒 Time axis', axisTimeTitle: 'Axis uses real time (long waits fold into thin seams); click for the step-order view',\n    axisStep: '#️⃣ Steps', axisStepTitle: 'Axis runs in step order — one equal-width column per step, decoupled from wall clock; click to go back to the time axis',\n    lgCompactReal: '⌄ compaction (logged)', lgCompactRealTitle: 'The log carries compaction/start events, so marks sit at their real times; hover for before/after occupancy',\n    lgCompactGuess: '⌄ compaction (inferred)', lgCompactGuessTitle: 'This log has no compaction events — marks are inferred from consecutive-request drops of ≥20%',\n    lgPruneMarks: '┊ tool results pruned', lgPruneTitle: 'compaction/prune in the log: tool results were trimmed to free context',\n    ctxReal: 'compaction event', ctxGuess: 'compaction (inferred)',\n    ctxRealNote: 'From the log\\u2019s own compaction events', ctxGuessNote: 'No compaction events in this log — inferred from consecutive-request drops of ≥20%',\n    ctxPruneTip: a => `Tool results pruned; the context held about ${a} tok before the prune`,\n    ccTitle: 'What the context carried', ccHint: 'Character estimates, not token counts',\n    ccName: { sys: 'System prompt', skills: 'Skill catalog', plugin: 'Plugin injections', tool: 'Tool results', user: 'User messages', assistant: 'Model output' },\n    ccSkills: (n, loaded, names) => `Skill catalog holds ${n}; ${loaded} loaded this session${loaded > 0 && names ? ': ' + names + (loaded > 4 ? ' …' : '') : ''}`,\n    ccInstr: n => `${n} instruction file${n > 1 ? 's' : ''} (the log records paths and digests only, not sizes)`,\n    ccPlugins: n => `Plugin injections came from ${n} plugin${n > 1 ? 's' : ''}`,\n    ccLiveNote: 'The live tab counts only the loaded event window',\n    cvTitle: 'Comparison variables', cvHint: 'controlled = everything but the model matches',\n    sugTitle: 'Suggestions', sugHint: 'each cites numbers measured in this session; click one to locate the calls',\n    sugNone: 'No suggestion template fired for this session (thresholds are calibrated on 240 local sessions — only the minority that stand out light up).',\n    sugNote: 'Suggestions come from deterministic rules over this session\\u2019s log — no model call; thresholds and rationale in the README.',\n    sugName: { unrecovered: 'Failure not followed by a new approach', identicalRetry: 'Identical retry after failure', loop: 'Looks stuck in a loop', wroteNoVerify: 'Files changed without verification', ctxPeak: 'Context near the window ceiling', compaction: 'Context was compacted', toolHeavy: 'Tool results dominate the context', sameTurnRepeats: 'Repeated calls in one turn', todoStale: 'Stale todo list', skillsUnused: 'Large skill catalog, none loaded' },\n    cvVar: 'Variable', cvState: 'State', cvLane: i => `Run ${i}`, cvNoRecord: 'not in log',\n    cvSame: 'same', cvDiff: 'differs', cvUnknown: 'unrecorded',\n    cvName: { provider: 'Provider', reasoningEffort: 'Reasoning effort', agentPreset: 'Agent preset', permission: 'Permission preset', sandbox: 'Sandbox', approval: 'Approval policy', instructions: 'Instruction files', skills: 'Skill catalog', cwd: 'Working directory', model: 'Model' },\n    cvControlled: models => `Controlled comparison: everything but the model matches (model: ${models}), so the difference between the runs can be attributed to the model.`,\n    cvLikely: (n, names) => `Probably controlled: every recorded variable matches, but ${n} variable${n > 1 ? 's are' : ' is'} not in the log (${names}) — treat the conclusion as indicative.`,\n    cvExploratory: (n, names) => `Exploratory comparison: ${n} variable${n > 1 ? 's differ' : ' differs'} besides the model (${names}), so the difference cannot be attributed to the model.`, \n    lgAlign: 'Turn alignment', lgAlignTitle: 'Answer nodes connected per turn; labels show per-turn time (inter-turn waits excluded)',\n    lgAnchor: 'Manual anchor', lgAnchorTitle: '🔗 add · click a line to delete',\n    lgSameTask: n => `⛓ Same task ×${n} — compare kit enabled`,\n    lgSameTaskTitle: 'Every file opens with the same first user message: treated as runs of one task',\n    lgDiffTask: '≠ Different tasks — side-by-side only (alignment/inventory off)',\n    lgDiffTaskTitle: 'First user messages differ; per-turn alignment is meaningless across different tasks',\n    lgNoFirstUser: '≠ Same-task check impossible (a file has no first user message) — side-by-side only',\n    lgNoFirstUserTitle: 'Same-task detection needs each file\\'s first user message; without it the compare kit (alignment/anchors/inventory) stays off',\n    modelUnknown: 'unknown model', modelNoHeader: '(model unknown: earlier history not loaded)', modelNone: '(unknown model)',\n    laneInfo: (turns, st) => `${turns > 1 ? turns + ' turns · ' : ''}${st.steps} steps (main ${st.main} / detours ${st.detours}) · ${st.tools} tool calls · ${laneTokLabel(st)} · total ${fmtT(st.T)}`,\n    preWindow: n => ` · ⏮ ${n} earlier steps not loaded`,\n    turnLabel: n => `Turn ${n}`,\n    alignLabel: (turn, a, b, d) => `Turn ${turn} time: 1st ${a} ↔ 2nd ${b} (Δ${d})`,\n    alignDet: (a, b) => ` · detours ${a}↔${b}`,\n    alignLabelN: (turn, list) => `Turn ${turn} time: ${list}`,\n    rzTok: n => 'reasoning ' + n.toLocaleString() + ' tok', rzSeg: n => 'reasoning ' + n.toLocaleString() + ' chunks (no token usage in log)',\n    outTok: n => 'output ' + n.toLocaleString() + ' tok',\n    statsCard: st => `main ${st.main} + detours ${st.detours} = ${st.steps} steps · ${st.tools} tool calls · ${laneTokLabel(st)} · total <b>${fmtT(st.T)}</b>`,\n    invTurnCol: 'Turn', invLaneCol: i => `Session ${i} detours`, invDiffCol: 'Delta', invTotal: 'Total',\n    invSteps: n => `${n} steps`, invNone: 'No detours on either side', invEven: '≈ even',\n    invMore: (i, d) => `Session ${i} spent ${d} more`,\n    invHint: 'Click a row: zoom to that turn and keep only its detours (everything else dims); click the same row again to cancel. Detour times are wall-clock; ✗ failed · ↻ blind retry · · no result.',\n    tracksBtn: '📊 Tracks', tracksTitle: 'Show/hide the data tracks under each lane (tool calls · token pulse · context pressure)', agHeader: 'Agent graph',\n    trkTools: 'Tool calls', trkTok: 'Token pulse', trkCtx: 'Context pressure',\n    catNames: { read: 'read', search: 'search', shell: 'shell', edit: 'edit', other: 'other' },\n    trkToolsCap: n => `${n} total`,\n    trkTokCap: (i, o, c) => `in peak ${fmtTok(i)} · out peak ${fmtTok(o)}${c > 0 ? ' (cache backdrop peak ' + fmtTok(c) + ')' : ''}`,\n    trkCtxCapPct: (p, w) => `peak ${p}% (window ${fmtTok(w)})`,\n    trkCtxCapAbs: n => `peak ${fmtTok(n)} tok (model window unknown or stale, absolute)`,\n    trkCtxWinSwitch: ws => `, window switched mid-session: ${ws.map(fmtTok).join(' → ')}`,\n    trkCtxStale: n => `; ${n} sample${n > 1 ? 's' : ''} skipped (the request exceeded the window its provider declared)`,\n    ctxDropTip: (a, b, p) => `Context compaction: ${a.toLocaleString()} → ${b.toLocaleString()} tok (−${p}%)`,\n    msDur: 'Total', msCalls: (s, t) => `${s} steps · ${t} calls`, msSubCalls: n => ` · ${n} more in subagents`, msPeak: 'Peak context',\n    subHidden: n => ` · ${n} more subagent${n > 1 ? 's' : ''} not expanded`,\n    msTok: (i, o) => [i ? `in ${i}` : '', o ? `out ${o}` : ''].filter(Boolean).join(' · '),\n    clusterTip: n => `${n} detours here — click to zoom in`,\n    tokCache: 'cached input', tokIn: 'uncached input', tokRz: 'reasoning', tokOutVis: 'visible output', tokTotal: 'total',\n    ctxTipPct: (v, p) => `context ${v.toLocaleString()} tok · ${p}% of window`,\n    ctxTipAbs: v => `context ${v.toLocaleString()} tok (window unknown)`,\n    cardFail: 'Tool failures & recovery', cardTime: 'Time spent', cardCtx: 'Context pressure',\n    cardFailBody: (f, tot, tool, k) => `${f} failed / ${tot} calls${tool ? `; most-failed ${tool} (×${k})` : ''}`,\n    cardFailRec: (rec, f, w) => `${rec}/${f} recovered within ${w}s`,\n    cardFailNone: 'No failed calls',\n    cardFailRate: p => `failure rate ${p}%`,\n    cardFailEvt: n => `${n} request-level failures (model retries / terminal errors, outside tool stats)`,\n    cardTimeBody: (tool, d) => `longest call ${tool} · ${d}`,\n    cardTimeShare: p => `tools took ${p}% of active time (idle excluded)`,\n    cardCtxPct: (v, p) => `max context ${v.toLocaleString()} tok · peak ${p}%`,\n    cardCtxOver: th => `crossed the ${th}% threshold`,\n    cardCtxUnder: 'within the safe zone',\n    cardCtxAbs: v => `max context ${v.toLocaleString()} tok (model window unknown)`,\n    cardCtxNone: 'No token usage in this log',\n    mtTool: 'Tool', mtCalls: 'Calls', mtOk: 'OK', mtErr: 'Failed', mtDead: 'No result', mtRetry: 'Blind retry', mtRate: 'Success',\n    mtP50: 'P50', mtP95: 'P95', mtMax: 'Max', mtSum: 'Total',\n    anaMatrix: 'Tool result matrix', anaDur: 'Duration percentiles (per tool)', anaChains: 'Failure recovery chains',\n    chainsNone: 'No failed calls in this session',\n    chainTag: { identical: 'identical retry', strategy: 'changed args', switch: 'switched tool', none: 'not recovered' },\n    chainRec: s => `back to success after ${fmtT(s)}`, chainRecSlow: s => `back to success only after ${fmtT(s)}`, chainNoRec: 'no successful call afterwards',\n    anaChainHint: 'Recovered = any tool succeeds again after the failure; the tag reflects what the very next call did (120s window counts as \"recovered\"). Chains cover failures (✗) only; no-result (·) and blind-retry (↻) calls count in their own matrix columns, not here — a blind retry is never recovery evidence either. Click a row to zoom to that failure and open its details.',\n    agMain: 'Main agent', agSubNone: 'No subagent tasks in this session',\n    agTok: n => `${fmtTok(n)} tok`, agTokNone: '(no token usage in log)',\n    agCalls: n => `${n} tool calls`, agRunningTag: 'running',\n    agHint: 'Node size = tokens consumed by that agent (input+cache+output); edge width = tool call count. Click a subagent node to jump to its span on the timeline.',\n    ocHeader: 'Outcome & evidence',\n    ocOverall: { done: 'Completed', partial: 'Partial', unverified: 'Unverified' },\n    ocCell: { task: 'Task', test: 'Tests', build: 'Build', lint: 'Lint', artifacts: 'Artifacts', human: 'Human check' },\n    ocTaskS: { done: 'finished', failed: 'not finished', noAnswer: 'no final answer', unfinished: 'unfinished', running: 'running' },\n    ocTask: {\n      done: (turn, reason) => `turn ${turn} ended normally` + (reason !== 'completed' ? ` (end reason: ${reason})` : ''),\n      failed: (turn, reason) => `turn ${turn} ended with ${reason}`,\n      noAnswer: turn => `turn ${turn} ended, but its last step is not an answer`,\n      unfinished: turn => turn != null ? `turn ${turn} has no end event (session not wrapped up, or log not fully loaded)` : 'no turns at all',\n      running: turn => `turn ${turn} still running`,\n    },\n    ocPass: 'passed', ocFail: 'last run failed', ocNotRun: 'not run',\n    ocRuns: (runs, cmds) => `${runs} runs · ${cmds} commands`,\n    ocFailedCmds: n => `, ${n} earlier command${n > 1 ? 's' : ''} failed on their last run`,\n    ocExit: code => `exit code ${code}`,\n    ocBgUnresolved: n => `background job without an exit code ×${n}`,\n    ocArtifactsN: n => `${n} files`, ocArtifactsNone: 'no files written or edited',\n    ocWrites: (w, f) => `${w} successful writes${f > 0 ? ` · ${f} failed` : ''}`,\n    ocPathsToggle: 'file list',\n    ocHumanYes: 'user responded', ocHumanNo: 'no user message after the answer', ocHumanNA: 'no final answer to respond to',\n    ocSummary: {\n      done: (ran, missing) => `last turn ended normally; ${ran} passed` + (missing ? `; ${missing} not run` : ''),\n      partial: reasons => reasons.join('; '),\n      unverified: 'no tests, build or lint were run — the result is unverified',\n    },\n    ocReason: { task: 'the task did not finish normally', test: 'tests failed on their last run', build: 'the build failed on its last run', lint: 'lint failed on its last run' },\n    ocHint: 'Method: tests/build/lint are recognized by command-position regexes (JS/TS, Python, Rust, Go, Swift in this first cut; an npm/pnpm/yarn `check` script counts as tests); one command can count for several kinds. Passed = the call carried no error flag and the last line of its output has no non-zero exit code; a background job counts by the exit code on its later job_output last line, and is left out (and noted) when none arrives; each category is judged by its last run, with earlier commands that failed on their last run noted in small print. Artifacts = files touched by successful write/edit calls, deduplicated. Task done = the last turn/end is not error/aborted/interrupted/blocked and the last step is an answer. Human check only asks whether a human message followed the final answer — content is never interpreted. \"Unverified\" is neutral, not a failure. Click the tests/build/lint cell to locate the step of the last run and open that step\\'s details.',\n    ocCode: n => `Code-mode session (run_code ×${n}): the real tool calls dispatched inside the script are not recognized yet; the cells above count direct calls only.`,\n    anaSignals: 'Behavior signals',\n    sigNone: 'No signal fired in this session',\n    sigSev: { high: 'high', medium: 'medium', low: 'low', info: 'info' },\n    sigName: { mechanicalRetry: 'identical retry after failure', repeat: 'same-turn repeats', loop: 'loop', toolFail: 'tool failures', slowCall: 'slow calls', concentration: 'tool concentration', ctxJump: 'context jump', ctxDrop: 'context drop', ctxPeak: 'context peak', compaction: 'compaction', todoStale: 'stale todo', adaptiveRecovery: 'adaptive recovery' },\n    sigCalls: n => `${n} calls`,\n    sigHint: 'Thresholds calibrated on 202 local sessions (set 2026-09-06, re-run 2026-09-07 after fixing the calibration script; \"medium\" lands in the worst 15–20% of sessions, \"high\" in the worst 3–5%), constants in ANALYSIS_RULES.SIGNALS in verdict.js. Signals count independently: a loop and same-turn repeats, or identical retries and tool failures, may point at the same calls — each states its own fact; tool failures and adaptive recovery use the maze verdict (error flag plus failure signatures in the output), wider than the error flag alone. Argument signatures are cut at 300 characters, so longer commands compare on their first 300. In this version code-mode sessions count only the outer run_code calls; inner dispatches are not expanded, so their numbers are not directly comparable with the calibration set\\'s code-mode figures. Context use is converted with the window of the model in use at each request (uploaded logs read the request/context value; the live tab only lacks the host-reported value and looks the per-request model up in the table). Click a row to dim everything else and locate the first call of that stretch; click it again or press Esc to clear — this stacks with the failures-only and other filters.',\n\n    subPrefix: 'Subagent ', subBranch: 'Subagent branch', detBranch: 'Exploration detour',\n    evtRetry: 'Request retry', evtTurnError: 'Request failed for good',\n    mainStep: 'Main-path step', finalAnswer: 'Final answer', rejected: ' (rejected)',\n    whyLabel: 'Rationale: ', whyShort: 'Verdict: ',\n    spanTo: (a, b) => `Span ${a} → ${b}`, durP: d => ` (${d}s)`,\n    subSpawn: (n, live) => `⤴ Subagent task spawned from main-path S${n}${live ? ', still running' : '; result merges back on completion'}`,\n    outCurve: (n, a, b) => `Outbound curve forks from branch point S${n} (x position), grew ${a} → ${b}`,\n    deadReturn: n => `↩ Dead end — backtracked to branch point (S${n})`,\n    deadReturnPanel: n => `↩ Dead end — left branch point S${n} and backtracked`,\n    branchOrigin: n => `⦿ Branch origin: ${n} detours left and returned here`,\n    resultLabel: 'Result: ', rzExcerpt: 'Reasoning excerpt: ', rzExcerptTitle: 'Reasoning excerpt',\n    parallelCall: 'parallel call', running: 'running', noArgs: '(no arguments)',\n    took: d => `took ${d}s`, turnSuffix: n => ` · turn ${n}`,\n    jumpBtn: '↗ Locate this step in the chat', copyCmd: 'Copy command', copyRes: 'Copy result',\n    copied: 'Copied', copyFail: 'Copy failed', resultHead: 'Result',\n    chars5000: 'first 5000 chars', charsN: n => `${n} chars`,\n    ptFail: ' · ✗ failed', ptRetry: ' · ↻ blind retry',\n    errParse: m => 'Parse failed: ' + m,\n    errNotJsonl: 'Not valid JSONL (one JSON object per line)',\n    errNoSteps: 'No parseable steps (missing step/start events?)',\n    errMax: 'At most 5 session logs',\n    errReadFile: (name, m) => `Failed to read ${name} (${m})`,\n    errZstd: 'This browser cannot decompress zstd; run `zstd -d` in a terminal first, then upload the .jsonl',\n    errUrl: (p, m) => `URL load failed: ${p} (${m})`,\n    errPngCanvas: 'PNG export failed: canvas produced no data', errPngRaster: 'PNG export failed: SVG rasterization failed',\n    why: {\n      sugUnrecovered: p => `${p[0]} failure${p[0] > 1 ? 's' : ''} ended without changing arguments or tools — that step simply stopped there (${p[1]} failure chains in this session)`,\n      sugIdenticalRetry: p => `The same command was retried identically ${p[0]} time${p[0] > 1 ? 's' : ''} after failing — reading the error before changing the arguments is cheaper than another run`,\n      sugLoop: p => `${p[0]} steps repeat the same call sequence; the session looks stuck in a loop — narrow the goal or change the entry point`,\n      sugWroteNoVerify: p => `${p[0]} file${p[0] > 1 ? 's were' : ' was'} written, yet no test/build/lint command ran — one run would catch regressions`,\n      sugCtxPeak: p => `Context peaked at ${p[0]}% of the window (${p[1]?.toLocaleString?.() ?? p[1]} tok), close to the ceiling; use a larger window or offload intermediates to disk`,\n      sugCompaction: p => `Context compacted ${p[0]} time${p[0] > 1 ? 's' : ''} and tool results were pruned ${p[1]} time${p[1] > 1 ? 's' : ''}: the session carries too much for one run — split it or offload to disk`,\n      sugToolHeavy: p => `Tool results fill ${p[0]}% of the context (~${p[1]}k characters): offload large outputs to disk and read only the needed part`,\n      sugSameTurnRepeats: p => `The same arguments were called ${p[0]} times within one turn (${p[1]}% of all calls): reading the same thing once is enough`,\n      sugTodoStale: p => `The todo list was nudged ${p[0]} times (it drifts from actual progress): tick off finished items before moving on`,\n      sugSkillsUnused: p => `The skill catalog holds ${p[0]} entries (~${p[1]}k characters) and this session loaded none: the catalog rides every request, so trim it as needed`,\n      errFlag: () => 'Tool returned an error flag (isError)',\n      errStrong: p => `Output matches failure signature “${p[0]}”`,\n      errWeak: p => `Output head matches failure signature “${p[0]}”`,\n      writeOk: () => 'Write-class tool: success unless an error is flagged',\n      searchEmpty: () => 'Search returned nothing — no result',\n      searchNoHit: () => 'Search output starts with a no-match marker — no result',\n      searchOk: () => 'Search returned content',\n      exitNoOut: () => 'Exited cleanly with no output — no result',\n      exitOk: () => 'Exited cleanly with output',\n      retryCtx: p => `Inside a consecutive retry cluster (same operation ×${p[0]})`,\n      retryCluster: p => `Same operation retried ${p[0]} times in a row (${p[1]} failed) — blind retry`,\n      noTools: () => 'No tool calls; produced the answer',\n      pendingTools: () => 'Tool results pending; kept on the main path for now',\n      child: p => `Subagent “${p[0]}” · ${p[1]} steps · ${p[2]} tool calls${p[3] === 1 ? ' · running' : p[3] === 2 ? ' · ended with an error' : ''}`,\n      llmRetry: p => `Request failed — retry ${p[0]}/${p[1]} ${p[4] ? 'was cancelled (no more waiting)' : `scheduled after a ${p[2]}s backoff`}; cause: ${p[3]}`,\n      turnError: p => `Request failed for good, no more retries${p[1] ? ` (${p[1]})` : ''}: ${p[0]}`,\n      sigMechanical: p => `same tool with the same arguments retried ${p[0]} times right after a failure`,\n      sigRepeat: p => `same tool with the same arguments repeated ${p[0]} times within a turn, ${p[1]}% of all calls${p[2] ? ` (${p[2]} of them repeated reads)` : ''}`,\n      sigLoop: p => `a 1–3 call sequence repeated 3 times in a row: ${p[0]} loops, ${p[1]} steps`,\n      sigFail: p => `${p[0]} failed / ${p[1]} calls, failure rate ${p[2]}%`,\n      sigSlow: p => `${p[0]} calls over 120 s, longest ${p[1]} s (${p[2]})`,\n      sigHhi: p => `Herfindahl index ${p[0]}, ${p[1]} takes ${p[2]}%`,\n      sigCtxUp: p => `context use rose ≥20 points between consecutive requests ${p[0]} times, first ${p[1]}% → ${p[2]}%`,\n      sigCtxDown: p => `context use fell ≥20 points between consecutive requests ${p[0]} times, first ${p[1]}% → ${p[2]}%${p[3] ? `, ${p[3]} of them at a compaction event` : ''}`,\n      sigCtxPeak: p => `peak context ${p[0]}% of the window (${fmtTok(p[1])})`,\n      sigCompaction: p => `context compacted ${p[0]} times${p[1] ? `, tool results pruned ${p[1]} times` : ''}`,\n      sigTodo: p => `todo-freshness-guard reminded ${p[0]} times`,\n      sigAdaptive: p => `after a failure, same target with changed arguments or another tool succeeded ${p[0]} times`,\n    },\n  },\n}\nlet LANG = typeof navigator !== 'undefined' && /^zh\\b/i.test(navigator.language ?? '') ? 'zh' : 'en'\nconst tr = k => I18N[LANG][k] ?? I18N.zh[k] ?? k\n\n/** 结构化判定依据 {k,p}（可带 why2 附加簇上下文）→ 当前语言文案；老字符串原样透传。 */\nfunction whyText(why, why2){\n  const one = w => {\n    if (w == null) return ''\n    if (typeof w === 'string') return w\n    const f = I18N[LANG].why[w.k] ?? I18N.zh.why[w.k]\n    return f ? f(w.p ?? []) : w.k\n  }\n  const a = one(why), b = one(why2)\n  return b ? a + (LANG === 'zh' ? '；' : '; ') + b : a\n}\n\n/** 节点显示标签：子代理节点合成前缀，其余用自带标签或 S<step>。 */\nfunction nodeLabel(n){\n  if (n.sub) return tr('subPrefix') + (n.label ?? '')\n  return n.label ?? ('S' + n.step)\n}\n\n/** 节点类别文案：请求级失败标记有专属类别，其余按主干/子代理/支路。 */\nfunction nodeKindLabel(n, isMain){\n  if (n.evt) return tr(n.evt === 'retry' ? 'evtRetry' : 'evtTurnError')\n  if (isMain) return n.v === 'answer' ? tr('finalAnswer') : tr('mainStep')\n  return n.sub ? tr('subBranch') : tr('detBranch')\n}\n\n/** 静态界面文案重写：boot 与每次语言切换时调用（动态 SVG/面板由重建覆盖）。 */\nfunction applyStatic(){\n  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : 'en'\n  document.title = tr('title')\n  document.querySelector('h1').textContent = tr('title')\n  document.querySelector('.sub').textContent = tr('sub')\n  renderDrop()\n  updatePlayBtn()\n  const fit = document.getElementById('btnFit')\n  fit.textContent = tr('fit'); fit.title = tr('fitTitle')\n  updateZoomHint()\n  document.getElementById('fltFailTxt').textContent = tr('fltFail')\n  const sel0 = document.getElementById('fltToolSel').options[0]\n  if (sel0) sel0.textContent = tr('allTools')\n  document.getElementById('fltQIn').placeholder = tr('searchPh')\n  const ba = document.getElementById('btnAnchor')\n  ba.title = tr('anchorTitle')\n  ba.textContent = anchorPick ? (anchorPick.first ? tr('anchorSecond') : tr('anchorFirst')) : tr('anchorBtn')\n  const bi = document.getElementById('btnInv')\n  bi.textContent = tr('invBtn'); bi.title = tr('invTitle')\n  const bt = document.getElementById('btnTracks')\n  bt.textContent = tr('tracksBtn'); bt.title = tr('tracksTitle')\n  const bx = document.getElementById('btnAxis')\n  bx.textContent = tr(AXIS_MODE === 'step' ? 'axisStep' : 'axisTime')\n  bx.title = tr(AXIS_MODE === 'step' ? 'axisStepTitle' : 'axisTimeTitle')\n  bx.classList.toggle('on', AXIS_MODE === 'step')\n  document.getElementById('btnExpSvg').title = tr('expSvgTitle')\n  document.getElementById('btnExpPng').title = tr('expPngTitle')\n  document.getElementById('panelClose').title = tr('closeEsc')\n  document.getElementById('invClose').title = tr('close')\n  document.getElementById('invTitle').textContent = tr('invHeader')\n}\n\n/** 上传入口文案随状态走：出数据后收成一颗添加按钮，不再重复整句上传指引。 */\nfunction renderDrop(){\n  document.getElementById('drop').innerHTML =\n    document.body.classList.contains('hasdata') ? tr('dropCompact') : tr('dropHtml')\n}\n\n/** 播放按钮按当前播放状态取文案（切语言与各处状态翻转共用）。 */\nfunction updatePlayBtn(){\n  const b = document.getElementById('btnPlay')\n  b.textContent = playing ? tr('pause') : (playEnded ? tr('replay') : tr('play'))\n}\n\n/** 语言切换入口：宿主消息或独立场景调用；重写静态文案并全量重建数据视图。 */\nfunction setLang(lang){\n  lang = lang === 'zh' ? 'zh' : 'en'\n  if (lang === LANG) return\n  LANG = lang\n  applyStatic()\n  if (DATA){\n    renderLegend()\n    renderStats()\n    renderMetaStrip()\n    refreshFltTools()\n    if (invPanelEl.classList.contains('show')) renderInventory()\n    renderAnalysis()\n    applyFilter()\n    queueBuild()\n  }\n}\n\n/* ============================ 解析：JSONL → lanes ============================ */\nfunction tOf(e){ return e.time ?? e.time0 ?? e.createdAt }\n\n/** Format seconds for axis/stat labels: 49252 → \"13.7h\", 340 → \"6m\", 42.5 → \"42.5s\". */\nfunction fmtT(t){\n  if (t >= 3600) return (t / 3600).toFixed(t >= 36000 ? 0 : 1) + 'h'\n  if (t >= 120) return Math.round(t / 60) + 'm'\n  return (Math.round(t * 10) / 10) + 's'\n}\n\n/** Token 量的紧凑格式：236793 → \"237K\"，2958682 → \"3.0M\"。 */\nfunction fmtTok(n){\n  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'\n  if (n >= 1000) return Math.round(n / 1000) + 'K'\n  return String(n)\n}\n\n/** 步级推理量标签：有 usage 真值用 token，否则诚实按流式段数计（旧标签把段数冒充 token）。 */\nfunction rzLabel(n){\n  return n.rzTok != null ? tr('rzTok')(n.rzTok) : tr('rzSeg')(n.rz)\n}\n\n/** 泳道级推理/输出量标签，同上口径。 */\nfunction laneTokLabel(st){\n  if (st.rzTok == null && st.outTok == null) return tr('rzSeg')(st.rz)\n  const parts = []\n  if (st.outTok != null) parts.push(tr('outTok')(st.outTok))\n  if (st.rzTok != null) parts.push(tr('rzTok')(st.rzTok))\n  return parts.join(' · ')\n}\n\n/** Axis tick interval keeping ≤50 gridlines for any span (sub-minute steps serve zoomed-in windows). */\nfunction tickStep(T){\n  for (const s of [1, 2, 5, 10, 30, 60, 120, 300, 600, 1800, 3600, 7200, 14400, 43200]){\n    if (T / s <= 50) return s\n  }\n  return 86400\n}\n\n/** True if any nested tool-result block carries isError (session log v2 nests it per block). */\nfunction hasErrorFlag(x){\n  if (Array.isArray(x)) return x.some(hasErrorFlag)\n  if (x && typeof x === 'object'){\n    if (x.isError === true) return true\n    return Object.values(x).some(hasErrorFlag)\n  }\n  return false\n}\n\nfunction resultText(d){\n  const out = []\n  const walk = x => {\n    if (Array.isArray(x)){ x.forEach(walk); return }\n    if (x && typeof x === 'object'){\n      if (x.type === 'text') out.push(x.text ?? '')\n      else Object.values(x).forEach(walk)\n    }\n  }\n  walk(d.message ?? d)\n  return out.join('')\n}\n\nfunction argSummary(argumentsRaw){\n  let a\n  try { a = JSON.parse(argumentsRaw) } catch { return String(argumentsRaw ?? '') }\n  if (a && typeof a === 'object'){\n    if (typeof a.command === 'string') return a.command\n    if (typeof a.file_path === 'string') return a.file_path\n    if (typeof a.pattern === 'string'){\n      let s = 'pattern=' + a.pattern\n      if (a.path) s += ' path=' + a.path\n      return s\n    }\n    if (typeof a.query === 'string') return a.query\n    return JSON.stringify(a)\n  }\n  return JSON.stringify(a)\n}\n\n/** One session log → rows of steps with tool events, verdicts, reasoning stats. */\nfunction buildLane(text){\n  const evs = []\n  for (const line of text.split(/\\r?\\n/)){\n    const l = line.trim()\n    if (!l) continue\n    try { evs.push(JSON.parse(l)) } catch { /* skip malformed lines */ }\n  }\n  if (evs.length === 0) throw new Error(tr('errNotJsonl'))\n  const first = evs.find(e => e.type === 'user/message')\n  const t0 = first !== undefined ? tOf(first) : tOf(evs[0])\n  const rows = []\n  const rowByStep = new Map()\n  const turnEnds = []   // 结果与证据块：每轮以什么原因收尾（turn/end 的 reason.kind）\n  const userMsgs = []   // 结果与证据块：真人消息的时刻（source.kind = user；指令文件/插件注入/子代理回报不算）\n  // 行为信号块的原料：压缩事件（start 的时刻 + prune/summary 次数）、待办陈旧提醒次数、上下文窗口真值\n  // pruneAt 记每次裁剪的时刻：上下文压力轨道要在真事件的位置上画刻线（诊断层第 3 项）\n  const compaction = { starts: [], pruneAt: [], prunes: 0, summaries: 0, ends: 0 }\n  // 上下文构成（诊断层第 4 项）：逐段按**字符数**估算——日志里没有分段 token，也只能这样估。\n  // 系统提示来自 request/header.header.system；指令文件只有路径与摘要（大小日志不记）；\n  // 技能目录取 catalog 条目的 name+description；插件注入按来源名分组；工具返回/用户/模型输出按文本长度累计。\n  const composition = { sysChars: 0, instrFiles: 0, skillCount: 0, skillChars: 0, plugin: new Map(), toolChars: 0, userChars: 0, assistantChars: 0, loaded: new Set() }\n  // 对比件的变量表（诊断层第 5 项）：从日志元数据取「除任务外的条件」。缺失一律留 null——\n  // 不把「日志没记」当成「两边相同」，判定里会把它单列为未记录。\n  const meta = { provider: null, reasoningEffort: null, agentPreset: null, permission: null, sandbox: null, approval: null, instructions: null, skills: null, cwd: null, model: null }\n  const instrDigests = new Set()\n  let skillNames = null\n  let todoReminders = 0\n  let ctxWindow = null\n  let curWin = null   // 当前生效的上下文窗口（最近一条 request/context）\n  let firstWin = null // 第一条 request/context 的窗口：更早的样本用它兜底（评审 P2-6）\n  let cur = null\n  const pending = []\n  for (const e of evs){\n    const t = e.type\n    const d = e.data ?? {}\n    const tm = (tOf(e) - t0) / 1000\n    if (t === 'session'){\n      if (typeof d.agentPreset === 'string' && d.agentPreset !== '') meta.agentPreset = d.agentPreset\n      if (typeof d.cwd === 'string' && d.cwd !== '') meta.cwd = d.cwd\n    } else if (t === 'agent-preset/selected'){\n      const v = d.preset ?? d.id ?? d.name\n      if (typeof v === 'string' && v !== '') meta.agentPreset = v\n    } else if (t === 'permission/preset'){\n      if (typeof d.preset === 'string') meta.permission = d.preset\n    } else if (t === 'sandbox/mode'){\n      if (typeof d.mode === 'string') meta.sandbox = d.mode\n    } else if (t === 'approval/policy'){\n      if (typeof d.policy === 'string') meta.approval = d.policy\n    } else if (t === 'user/message'){\n      const sk = d.source?.kind\n      if (sk === undefined || sk === 'user'){\n        userMsgs.push({ s: Math.round(tm * 10) / 10 })\n        composition.userChars += resultText(d).length\n      } else if (sk === 'agent-instructions'){\n        // 只有路径与摘要，没有正文大小：只数文件数，块里注明「大小日志未记录」\n        composition.instrFiles += new Set((d.source?.changes ?? []).map(c => c.path)).size\n        // 对比件变量表按「路径:摘要」指纹比较（摘要相同 = 同一份指令；没有摘要就退回路径）\n        for (const c of d.source?.changes ?? []) instrDigests.add(String(c.path ?? '') + ':' + String(c.digest ?? ''))\n      } else if (sk === 'skill-catalog'){\n        const ents = d.source?.entries ?? []\n        composition.skillCount = Math.max(composition.skillCount, ents.length)\n        composition.skillChars = Math.max(composition.skillChars, ents.reduce((n, e) => n + String(e.name ?? '').length + String(e.description ?? '').length, 0))\n        // 技能目录指纹：名字排序后拼接（条目描述变化也算目录变了，故连描述长度一起进指纹）\n        const fp = ents.map(e => String(e.name ?? '') + ':' + String(e.description ?? '').length).sort().join(',')\n        if (fp !== '') skillNames = fp\n      } else if (typeof sk === 'string' && sk.startsWith('plugin')){\n        // 日志格式 v4 把来源改写成 'plugin:<插件名>'，旧格式是 'plugin'（按注释里的插件名兜底）\n        const name = sk.includes(':') ? sk.slice(sk.indexOf(':') + 1) : (d.source?.plugin ?? 'plugin')\n        composition.plugin.set(name, (composition.plugin.get(name) ?? 0) + resultText(d).length)\n      }\n      if (isTodoReminderSource(d.source)) todoReminders += 1\n    } else if (t === 'compaction/start'){\n      compaction.starts.push(Math.round(tm * 10) / 10)\n    } else if (t === 'compaction/prune'){\n      compaction.prunes += 1\n      compaction.pruneAt.push(Math.round(tm * 10) / 10)\n    } else if (t === 'compaction/summary'){\n      compaction.summaries += 1\n    } else if (t === 'compaction/end'){\n      compaction.ends += 1\n    } else if (t === 'request/context'){\n      // 一场会话可能切模型出现多条：宿主报的真值优先，没有再查模型表；之后每步的 usage 按「当时」的窗口换算\n      //（吴昊 2026-09-07 拍板）。lane.ctxWindow 留最后一条作没有逐步窗口时的退路。\n      const w = typeof d.contextWindow === 'number' && d.contextWindow > 0 ? d.contextWindow : contextWindowFor(d.model)\n      if (w != null){ ctxWindow = w; curWin = w; if (firstWin == null) firstWin = w }\n    } else if (t === 'step/start'){\n      // step numbers restart every turn; qualify with the turn so identity stays unique\n      cur = { step: d.turn != null ? d.turn + '·' + d.step : d.step, turn: d.turn, s: tm, e: tm, events: [], rz: 0, rzTxt: '', rzTok: null, outTok: null, inTok: null, cacheTok: null }\n      rows.push(cur)\n      rowByStep.set(cur.step, cur)\n    } else if (t === 'assistant/message' && d.usage && typeof d.usage === 'object'){\n      // 真实 token 用量：assistant/message 自带 turn/step 归属（每步一条，产出量防御性累加）。\n      // inputTokens 是未命中缓存的输入，cacheReadTokens 是缓存命中——上下文总量 = 两者之和\n      //（2026-08-25 用真实日志验证：cacheReadTokens 随会话单调增长，inputTokens 只有增量波动）。\n      // 口径分两类：推理/输出是「流量」，一步多条请求时累加；输入/缓存是「每次请求的上下文\n      // 快照」，累加会虚增上下文压力——取最后一条（与实时链路的覆盖语义一致）。\n      const row = rowByStep.get(d.turn != null ? d.turn + '·' + d.step : d.step)\n      if (row){\n        if (typeof d.usage.reasoningTokens === 'number') row.rzTok = (row.rzTok ?? 0) + d.usage.reasoningTokens\n        if (typeof d.usage.outputTokens === 'number') row.outTok = (row.outTok ?? 0) + d.usage.outputTokens\n        if (typeof d.usage.inputTokens === 'number') row.inTok = d.usage.inputTokens\n        if (typeof d.usage.cacheReadTokens === 'number') row.cacheTok = d.usage.cacheReadTokens\n        if (curWin != null) row.ctxWin = curWin\n      }\n      composition.assistantChars += resultText(d).length\n    } else if (t === 'step/end' && cur !== null){\n      cur.e = tm\n    } else if (t === 'reasoning-chunks' && cur !== null){\n      const texts = d.texts ?? []\n      cur.rz += texts.length\n      cur.rzTxt += texts.join('')\n    } else if (t === 'tool/call' && cur !== null){\n      const ev = { k: 't', name: d.name ?? '?', s: tm, e: tm, args: argSummary(d.arguments), callId: d.callId }\n      cur.events.push(ev)\n      pending.push(ev)\n      if (d.name === 'skill'){\n        try {\n          const parsed = JSON.parse(d.arguments ?? '{}')\n          if (parsed && typeof parsed.name === 'string') composition.loaded.add(parsed.name)\n        } catch { /* 参数不是 JSON 就不记，块里如实少一个 */ }\n      }\n    } else if (t === 'tool/result' && pending.length > 0){\n      const ev = pending.shift()\n      ev.e = tm\n      const raw = resultText(d)\n      // 退出码在压空白前从原文**末行**读（dsh 把 [exit code: N] 追加在末尾）；结果与证据块据此判验证命令通过与否\n      ev.exit = exitCodeOf(raw)\n      ev.res = raw.replace(/\\s+/g, ' ').trim()\n      ev.err = d.isError === true || hasErrorFlag(d)\n      composition.toolChars += raw.length\n    } else if (t === 'llm/retry'){\n      // 请求失败后的重试排期：失败的那次请求没有 assistant 输出，不画就是纯空白。\n      // 伪行进 rows（时间序保持），条长 = 退避等待；判定在 buildData 里定死为 error。\n      // 用户中途按停止会取消重试（retryState='cancelled'）——退避没真等完，画成时间点不虚报等待。\n      const cancelled = d.retryState === 'cancelled'\n      const delay = cancelled ? 0 : (d.delayMs ?? 0) / 1000\n      rows.push({ step: 'r' + rows.length, turn: d.turn, s: tm, e: tm + delay, events: [], rz: 0, rzTxt: '', rzTok: null, outTok: null,\n        evt: 'retry', label: '↻' + (d.retry ?? ''),\n        why: { k: 'llmRetry', p: [d.retry ?? '?', d.mode === 'always' ? '∞' : (d.maxRetries ?? '?'), Math.round((d.delayMs ?? 0) / 100) / 10, (d.failure?.message ?? '') + (d.failure?.code ? ' [' + d.failure.code + ']' : ''), cancelled ? 1 : 0] } })\n    } else if (t === 'turn/end'){\n      turnEnds.push({ turn: d.turn, kind: d.reason?.kind ?? 'unknown', s: Math.round(tm * 10) / 10 })\n      if (d.reason?.kind === 'error'){\n        // 终局失败（无再重试）：同样没有输出承载，画成时间点标记。\n        rows.push({ step: 'e' + rows.length, turn: d.turn, s: tm, e: tm, events: [], rz: 0, rzTxt: '', rzTok: null, outTok: null,\n          evt: 'turnError', label: '✗',\n          why: { k: 'turnError', p: [d.reason.error?.message ?? '', d.reason.error?.code ?? ''] } })\n      }\n    }\n  }\n  const modelHeader = evs.find(e => e.type === 'request/header')\n  const model = modelHeader?.data?.header?.config?.model ?? null\n  // 同任务识别的指纹：首条用户消息的文本（空白归一）。\n  const firstUserText = first !== undefined ? resultText(first.data ?? {}).replace(/\\s+/g, ' ').trim() : ''\n  for (const r of rows){\n    if (r.ctxWin == null && firstWin != null && (r.inTok != null || r.cacheTok != null)) r.ctxWin = firstWin\n    const rz = r.rzTxt.replace(/\\s+/g, ' ').trim()\n    r.rzTxt = rz.slice(0, 240)\n    r.rzTxtFull = rz.slice(0, 2000)\n    for (const ev of r.events){\n      ev.dur = Math.round((ev.e - ev.s) * 10) / 10\n      ev.s = Math.round(ev.s * 10) / 10\n      ev.e = Math.round(ev.e * 10) / 10\n      const full = ev.res ?? ''\n      // 判定在截断前的全文上做（与实时链路同口径，见 verdict.js 的契约）\n      const tv = toolVerdict({ name: ev.name, res: full, err: ev.err })\n      ev.v = tv.v\n      ev.why = tv.why\n      // 380 chars feed the hover tooltip; the pinned detail panel reads the ~5KB full text.\n      ev.resFull = full.slice(0, 5000)\n      ev.res = full.slice(0, 380)\n    }\n    r.s = Math.round(r.s * 10) / 10\n    r.e = Math.round(r.e * 10) / 10\n  }\n  // 系统提示按各次 request/header 里最长的那份算（同一场一般不变；换过指令文件时取最大更诚实）\n  for (const e of evs){\n    if (e.type !== 'request/header') continue\n    const len = String(e.data?.header?.system ?? '').length\n    if (len > composition.sysChars) composition.sysChars = len\n  }\n  // 提供方 / reasoningEffort / 模型名：取第一条非空的 request/header 配置（一场会话中途换过模型时，\n  // 变量表比较的是「开场那一套」，换模型本身由模型这一行体现）\n  for (const e of evs){\n    if (e.type !== 'request/header') continue\n    const cfg = e.data?.header?.config ?? {}\n    if (meta.provider === null && typeof cfg.provider === 'string' && cfg.provider !== '') meta.provider = cfg.provider\n    if (meta.reasoningEffort === null && typeof cfg.reasoningEffort === 'string' && cfg.reasoningEffort !== '') meta.reasoningEffort = cfg.reasoningEffort\n  }\n  meta.model = model ?? null\n  meta.instructions = instrDigests.size > 0 ? [...instrDigests].sort().join('|') : null\n  meta.skills = skillNames\n  const context = {\n    sys: composition.sysChars || null,\n    instr: composition.instrFiles || null,\n    skills: composition.skillCount > 0 ? { n: composition.skillCount, chars: composition.skillChars } : null,\n    plugin: [...composition.plugin].map(([name, chars]) => ({ name, chars })),\n    tool: composition.toolChars || null,\n    user: composition.userChars || null,\n    assistant: composition.assistantChars || null,\n    loaded: [...composition.loaded],\n  }\n  return { rows, model, firstUser: firstUserText, turnEnds, userMsgs, compaction, todoReminders, ctxWindow, context, meta, title: model ?? (rows.length ? 'Session' : '?') }\n}\n\n/* 判定逻辑（toolVerdict/stepVerdict/markRetryClusters/VERDICT_RULES/SEV）构建期\n   自 verdict.js 注入——与 live-data.ts 共用同一份真相源，改判定请改 verdict.js。 */\n/**\n * 迷宫判定的唯一真相源：单步判定（成功/失败/扑空）+ 行为学盲目重试簇标注。\n * live-data.ts 正常 import 本模块；maze-upload.html 在构建期由 tsdown 把本文件\n * 剥掉 export 前缀后注入页面脚本的 VERDICT 占位符——改这里即同时改两条链路。\n * 类型声明在 verdict.d.ts（手写，改导出时同步）。\n *\n * 判定依据（why/why2）是结构化键值 { k, p }，不含任何语言的成品文案——展示端\n * （maze-upload.html 的 whyText）按当前界面语言渲染，切语言即时生效。\n *\n * 阈值与分类按 2026-08-19 三个真实会话（338 次工具调用）校准拍定，依据见工作区\n * PROPOSAL-trace-compare-verdict.md；VERDICT_RULES 各参数可调，改后重跑校准脚本核对。\n */\n\nconst VERDICT_RULES = {\n  /**\n   * 强失败特征（扫开头 + 末尾两个窗口）：包装器/运行时的硬标记。真失败的标记要么在\n   * 短输出里（命令直接死掉），要么贴着末尾（stderr 段是包装器追加在最后的）；而转储/\n   * 引用别的日志时（如会话分析会话），这些标记悬在长文本中部，两个窗口都够不着。\n   * 刻意不含项目特定话术（如 \"No such container\"），那类失败靠 [status=Failed] / __EXIT__ 兜住。\n   */\n  ERROR_PATTERNS_STRONG: /\\[stderr\\].*(Error|Traceback|File \")|\\[status=Failed\\]|__EXIT__=[1-9]/i,\n  /**\n   * 弱失败特征（只扫开头窗口）：真实报错从开头开始说，而 git log / grep / 文档类输出\n   * 在正文深处**引用**别人的报错（如提交信息里写 \"upstream returns HTTP 400\"）不该算\n   * 这条命令失败——2026-08-19 实测误报案例。\n   */\n  ERROR_PATTERNS_WEAK: /Traceback \\(most recent|command not found|Permission denied|No such file|HTTP 40\\d|HTTP 50\\d|^Error:/i,\n  /** 开头扫描窗口（字符）：弱特征仅此窗口；强特征此窗口 + 末尾窗口。 */\n  ERROR_HEAD_SCAN: 300,\n  /** 末尾扫描窗口（字符）：覆盖「长输出后崩溃」的 stderr 追加段。 */\n  ERROR_TAIL_SCAN: 1000,\n  /** 写入类工具：成功确认天然很短，无错误即成功，永不按输出判扑空。 */\n  WRITE_TOOLS: ['write', 'edit', 'todo_write'],\n  /** 检索类工具：空结果=扑空；有返回（哪怕一行命中）即成功。 */\n  SEARCH_TOOLS: ['grep', 'read', 'web_search', 'read_image'],\n  /**\n   * 空结果/无命中特征（只扫开头窗口）：真正的空结果提示本来就是整段短消息；\n   * 读到的文件内容/命中的代码里出现 \"not found in\" 字样不算扑空——2026-08-19 实测误报案例。\n   */\n  NO_RESULT_PATTERNS: /^(---)?$|no matches|no results|not found in/i,\n  /** 盲目重试：相邻同工具调用的参数 token Jaccard 相似度门槛。 */\n  RETRY_SIMILARITY: 0.6,\n  /** 盲目重试：最小连续调用数。 */\n  RETRY_MIN_CLUSTER: 2,\n}\n\n/** 步级聚合的严重度序：取最坏工具判定作为步判定。 */\nconst SEV = { error: 4, retry: 3, deadend: 2, ok: 0, answer: 0 }\n\n/**\n * 单工具判定：错误标志 → 失败特征 → 按工具分类；返回判定值和结构化依据 { k, p }。\n * ev.res 必须传**未截断**的返回全文——上传与实时两条链路统一在同一份文本上判定，\n * 否则同一步会在两种模式下判出不同结果（2026-08-19 实测踩过）。\n */\nfunction toolVerdict(ev){\n  if (ev.err) return { v: 'error', why: { k: 'errFlag' } }\n  const txt = (ev.res ?? '').trim()\n  const head = txt.slice(0, VERDICT_RULES.ERROR_HEAD_SCAN)\n  const tail = txt.slice(-VERDICT_RULES.ERROR_TAIL_SCAN)\n  const strong = VERDICT_RULES.ERROR_PATTERNS_STRONG.exec(head) ?? VERDICT_RULES.ERROR_PATTERNS_STRONG.exec(tail)\n  if (strong !== null) return { v: 'error', why: { k: 'errStrong', p: [strong[0].slice(0, 48)] } }\n  const weak = VERDICT_RULES.ERROR_PATTERNS_WEAK.exec(head)\n  if (weak !== null) return { v: 'error', why: { k: 'errWeak', p: [weak[0].slice(0, 48)] } }\n  if (VERDICT_RULES.WRITE_TOOLS.includes(ev.name)) return { v: 'ok', why: { k: 'writeOk' } }\n  if (VERDICT_RULES.SEARCH_TOOLS.includes(ev.name)){\n    if (VERDICT_RULES.NO_RESULT_PATTERNS.test(head)) return { v: 'deadend', why: { k: txt === '' ? 'searchEmpty' : 'searchNoHit' } }\n    return { v: 'ok', why: { k: 'searchOk' } }\n  }\n  if (VERDICT_RULES.NO_RESULT_PATTERNS.test(head)) return { v: 'deadend', why: { k: 'exitNoOut' } }\n  return { v: 'ok', why: { k: 'exitOk' } }\n}\n\n/** 步级判定：返回该步最坏判定的工具（其 v/why 即步判定与依据）；无参与投票的工具时返回 null。 */\nfunction stepVerdict(tools){\n  let worst = null\n  for (const t of tools){\n    if (worst === null || (SEV[t.v] ?? 0) > (SEV[worst.v] ?? 0)) worst = t\n  }\n  return worst\n}\n\nfunction argTokens(s){\n  const out = new Set()\n  for (const w of String(s).split(/[^\\w一-鿿./-]+/)) if (w.length > 2) out.add(w)\n  return out\n}\n\n/** 参数相似度：token 集 Jaccard，用于识别「几乎相同的重复调用」。 */\nfunction argSimilarity(a, b){\n  const ta = argTokens(a), tb = argTokens(b)\n  if (ta.size === 0 || tb.size === 0) return 0\n  let inter = 0\n  for (const w of ta) if (tb.has(w)) inter += 1\n  return inter / (ta.size + tb.size - inter)\n}\n\n/* ==================== 分析层（v0.7）：失败恢复链 + 模型上下文窗口 ==================== */\n\n/** 包管理器脚本调用的前缀：`pnpm -r test` / `npm --prefix x run build` / `yarn -s lint` 这类带旗标的写法。 */\nconst PM = '^(?:npm|pnpm|yarn|bun)\\\\s+(?:(?:-{1,2}[\\\\w-]+(?:=\\\\S+)?|(?:-F|--filter|-C|--dir|--prefix|-w|--workspace|--cwd)\\\\s+\\\\S+)\\\\s+)*(?:run\\\\s+|run-script\\\\s+)?'\n/** 直接执行二进制的启动器：npx / pnpm exec / yarn / bun x / node_modules/.bin/……，可无。 */\nconst RUNNER = '^(?:(?:npx|bunx|pnpx|pnpm(?:\\\\s+exec|\\\\s+dlx|\\\\s+run)?|npm\\\\s+exec|yarn(?:\\\\s+exec|\\\\s+run)?|bun(?:\\\\s+x|\\\\s+run)?)\\\\s+(?:-{1,2}[\\\\w-]+(?:=\\\\S+)?\\\\s+)*(?:--\\\\s+)?|\\\\.?\\\\/?(?:\\\\S*\\\\/)?node_modules\\\\/\\\\.bin\\\\/)?'\n/** `python -m xxx`（含 python3.12 / py / pypy）。 */\nconst PY_M = '^(?:python[0-9.]*|py|pypy[0-9]*)\\\\s+(?:-[\\\\w-]+\\\\s+)*-m\\\\s+'\n/** 命令词之后必须是空白、行尾或 shell 边界，`vitest.config.ts`、`pytest.ini` 这类文件名不算命令。 */\nconst END = '(?=\\\\s|$|[;&|)])'\n\nconst ANALYSIS_RULES = {\n  /** 失败恢复窗口（秒）：失败后任意工具在此窗口内出现成功调用即算「已恢复」。 */\n  RECOVERY_WINDOW: 120,\n  /** 恢复方式分类：失败后下一次同工具调用的参数相似度 ≥ 此值判「原样重试」，否则「换参数」。 */\n  IDENTICAL_SIMILARITY: 0.6,\n\n  /* ---- 结果与证据（诊断层第 1 项，2026-09-06）---- */\n  /** 只在这些工具的命令文本里识别验证类命令；code 模式的 run_code 另计（脚本内部派发的真实工具日志未展开）。 */\n  SHELL_TOOLS: ['bash', 'shell', 'sh', 'zsh', 'exec', 'shell_command', 'run_command', 'terminal', 'local_shell'],\n  /** code 模式的外层调用名：命中即在结果块里如实标注「内部派发暂不识别」。 */\n  CODE_TOOLS: ['run_code'],\n  /** 产物 = 这些写入/编辑类调用成功触及的文件路径（去重）；todo_write 不是产物。 */\n  ARTIFACT_TOOLS: ['write', 'edit', 'multi_edit', 'apply_patch', 'write_file', 'edit_file', 'create_file', 'str_replace_editor', 'str_replace_based_edit_tool', 'notebook_edit'],\n  /** 最后一轮以这些原因收尾即「任务未完成」：error（终局失败）/ interrupted（崩溃遗留）/ aborted（用户或父会话取消）/ blocked。\n   *  max-tokens 不在其中——轮次仍算结束，但结果块会写明原因。 */\n  TURN_END_INCOMPLETE: ['error', 'interrupted', 'aborted', 'blocked'],\n  /**\n   * 验证类命令识别：命令按 shell 边界（换行、&&、||、;、|、$(、反引号）拆成片段，每个片段\n   * 剥掉命令位置前的包装（环境变量赋值、time/sudo/env、timeout N、poetry/uv run、do/then/if\n   * 等关键字）后，在**命令位置**匹配下面的正则——`cat vitest.config.ts`、`grep pytest`、\n   * `wc -l build-all.sh` 都不算跑了验证。一条命令命中多类分别记（`pnpm lint && pnpm test`）。\n   * 初版覆盖 JS/TS、Python、Rust、Go、Swift 与 make/ctest/docker build；项目自定义的测试\n   * 包装脚本（如 `deploy/x.sh test_y.py`）识别不到，块里会如实显示「没有跑」。\n   */\n  VALIDATION: {\n    test: [\n      // 项目自定义的 `check` 脚本（如本仓库的 pnpm check = 类型检查 + 测试 + 构建）按测试计——2026-09-06 吴昊拍板\n      new RegExp(PM + '(?:test|t|tests|check)(?::[\\\\w:.-]+)?' + END),\n      new RegExp(RUNNER + '(?:vitest|jest|mocha|ava|tap|tape|uvu|karma|jasmine|cypress\\\\s+run|playwright\\\\s+test|bun\\\\s+test|deno\\\\s+test)' + END),\n      /^node\\s+(?:-[\\w-]+\\s+)*--test(?=\\s|$|[;&|)])/,\n      /^(?:pytest|py\\.test|nose2|nosetests|tox)(?=\\s|$|[;&|)])/,\n      new RegExp(PY_M + '(?:pytest|unittest|nose2)' + END),\n      /^cargo\\s+(?:\\+\\S+\\s+)?(?:test|nextest)(?=\\s|$|[;&|)])/,\n      /^go\\s+test(?=\\s|$|[;&|)])/,\n      /^swift\\s+test(?=\\s|$|[;&|)])/,\n      /^xcodebuild\\b(?=.*\\s(?:test|test-without-building)(?=\\s|$|[;&|)]))/,\n      /^(?:make\\s+(?:-[\\w-]+\\s+)*(?:test|check)|ctest)(?=\\s|$|[;&|)])/,\n      // 直接执行测试文件：sh x_test.sh / python3 test_x.py / node x.test.js / ./x_test.sh（`sh -n` 只查语法，不算跑）\n      /^(?:sh|bash|zsh|dash|python[0-9.]*|py|node|bun|tsx|ts-node)\\s+(?:-(?!n(?:\\s|$))[\\w-]+\\s+)*(?:\\S*\\/)?(?:test_[\\w.-]*\\.py|[\\w.-]*_test\\.(?:sh|py|js|mjs|cjs|ts|mts)|[\\w.-]*\\.(?:test|spec)\\.(?:js|mjs|cjs|ts|mts|tsx|jsx))(?=\\s|$|[;&|)])/,\n      /^(?:\\.\\/|\\S*\\/)?[\\w.-]*_test\\.sh(?=\\s|$|[;&|)])/,\n    ],\n    build: [\n      new RegExp(PM + '(?:build|typecheck|type-check|tsc|compile|bundle)(?::[\\\\w:.-]+)?' + END),\n      new RegExp(RUNNER + '(?:tsc|vite\\\\s+build|next\\\\s+build|nuxt\\\\s+build|tsup|tsdown|esbuild|rollup|webpack|turbo\\\\s+(?:run\\\\s+)?build|nx\\\\s+build|ng\\\\s+build|vue-cli-service\\\\s+build)' + END),\n      /^cargo\\s+(?:\\+\\S+\\s+)?(?:build|check)(?=\\s|$|[;&|)])/,\n      /^go\\s+build(?=\\s|$|[;&|)])/,\n      /^swift\\s+build(?=\\s|$|[;&|)])/,\n      /^xcodebuild\\b(?!.*\\s(?:test|test-without-building)(?=\\s|$|[;&|)]))/,\n      /^make(?:\\s+-[\\w=-]+)*(?:\\s+(?:all|build))?\\s*$/,\n      /^cmake\\s+--build(?=\\s|$|[;&|)])/,\n      /^docker\\s+(?:buildx\\s+)?build(?=\\s|$|[;&|)])/,\n      /^docker\\s+compose\\s+(?:-[\\w-]+(?:=\\S+)?\\s+)*build(?=\\s|$|[;&|)])/,\n    ],\n    lint: [\n      new RegExp(PM + '(?:lint|eslint|stylelint|format:check|prettier:check|fmt:check)(?::[\\\\w:.-]+)?' + END),\n      new RegExp(RUNNER + '(?:eslint|oxlint|biome\\\\s+(?:lint|check|ci)|stylelint|prettier\\\\s+(?:-c|--check)|tslint|standard|xo)' + END),\n      /^(?:ruff\\s+check|ruff\\s+format\\s+--check|flake8|pylint|mypy|pyright|black\\s+--check|isort\\s+(?:--check|--check-only|-c)|bandit|pyflakes|pycodestyle)(?=\\s|$|[;&|)])/,\n      new RegExp(PY_M + '(?:ruff|flake8|pylint|mypy|pyright|pyflakes|pycodestyle|bandit)' + END),\n      /^cargo\\s+(?:\\+\\S+\\s+)?(?:clippy|fmt\\s+(?:--all\\s+)?--check)(?=\\s|$|[;&|)])/,\n      /^(?:go\\s+vet|golangci-lint|staticcheck|gofmt\\s+-l|goimports\\s+-l)(?=\\s|$|[;&|)])/,\n      /^(?:swiftlint|swift-format\\s+lint)(?=\\s|$|[;&|)])/,\n      /^make\\s+(?:-[\\w-]+\\s+)*lint(?=\\s|$|[;&|)])/,\n      /^(?:shellcheck|hadolint|yamllint|markdownlint(?:-cli2?)?|actionlint)(?=\\s|$|[;&|)])/,\n    ],\n  },\n  /** shell 片段边界。 */\n  VALIDATION_SPLIT: /\\r?\\n|&&|\\|\\||;|\\||\\$\\(|`/,\n  /**\n   * 拆片段前先抹掉 heredoc 正文（`<<'PY' … PY`）：2026-09-06 真实日志里大量 `python3 - <<'PY'` 脚本在\n   * **编辑**测试文件，脚本正文里的 `sh x_test.sh` 字样和正则串里的 `…|docker build|…` 都会被当成命令。\n   * 只留 `<<TAG` 这一行本身。\n   */\n  HEREDOC: /<<-?\\s*(['\"]?)([A-Za-z_][\\w-]*)\\1[^\\n]*\\n[\\s\\S]*?\\n[ \\t]*\\2[ \\t]*(?=\\n|$)/g,\n  /**\n   * 拆片段前再抹掉引号串的内容（`git commit -m \"…多行… sh x_test.sh…\"`、`echo \"npm test\"`），\n   * 但 `-c` / `-lc` 之后的那段是要执行的脚本，保留内容（`bash -lc \"go test ./...\"`）。\n   */\n  QUOTED: /(-[A-Za-z]*c\\s+)?(?:\"((?:[^\"\\\\]|\\\\[\\s\\S])*)\"|'([^']*)')/g,\n  /** 命令位置前可剥掉的包装（循环剥到不变为止）；`bash -lc` 这类壳也在内，Codex 的数组形式命令走它。\n   *  `command` 刻意不在内：`command -v pytest` 是探测有没有装，不是跑测试（评审 P2-2）。 */\n  VALIDATION_WRAP: /^(?:[A-Za-z_]\\w*=(?:\"[^\"]*\"|'[^']*'|\\S*)\\s+|(?:time|sudo|nice|nohup|env|exec|builtin|do|then|else|if|elif|while|until|timeout\\s+\\S+|poetry\\s+run|uv\\s+run|pipenv\\s+run|hatch\\s+run|pdm\\s+run|conda\\s+run|(?:bash|sh|zsh|dash)\\s+-[A-Za-z]*c)\\s+(?:-{1,2}[\\w-]+(?:=\\S+)?\\s+)*)/,\n  /** 命中片段的参数只剩这些旗标时是探测（`pytest --version`、`go test -h`、`cargo test --help`），不算跑了验证。 */\n  PROBE_FLAGS: /^(?:--version|-V|--help|-h)$/,\n  /** bash 带 run_in_background 时结果只有这一句；真正的退出码在后面 job_output 的末行，按 job id 关联（评审 P2-1）。 */\n  BACKGROUND_JOB: /^started background job (\\S+)/i,\n  /** 后台任务读取工具：参数里的 job_id 关联回起任务的那次 shell 调用。 */\n  JOB_TOOLS: ['job_output'],\n  /** 退出码只认返回文本的**末行**，且必须在行首、`[` 之后或逗号之后：dsh 的 bash 工具在末尾追加\n   *  `[exit code: N]`（仅非零），后台任务 job_output 末行是 `[status: completed, exit code: N]`；\n   *  正文中间引用别的日志里的 \"exit code: 1\"（如 docker 构建输出被 head 出来）、末行的\n   *  \"expected exit code: 1\"（评审 P3-7）都不算本次命令的退出码——2026-09-06 真实日志核对。 */\n  EXIT_CODE: /(?:^|\\[|,\\s*)exit[ _]code[:=]?\\s*(\\d+)\\)?\\]?\\.?\\s*$/i,\n}\n\n/**\n * 失败恢复链分析（纯读取，不改任何判定）：对时间序已结算调用，给每个失败调用\n * 定出「失败之后发生了什么」。mode 看失败后的下一次调用：\n *   'identical' = 同工具且参数相似度 ≥ 阈值（原样重试）\n *   'strategy'  = 同工具但参数明显变了（换参数）\n *   'switch'    = 换了别的工具\n *   'none'      = 之后再无任何调用（失败收尾）\n * recover 取失败后第一次成功调用（任意工具）：恢复 = 执行回到成功推进，\n * recoverSec 为失败起点到该次成功开始的墙钟秒数，超出 RECOVERY_WINDOW 也如实给出。\n * calls 须按时间序传入 {name, args, v, s, e}；返回数组与失败调用一一对应（带原下标 i）。\n */\nfunction analyzeFailureChains(calls){\n  const chains = []\n  for (let i = 0; i < calls.length; i++){\n    if (calls[i].v !== 'error') continue\n    const next = calls[i + 1] ?? null\n    let mode = 'none'\n    if (next !== null){\n      if (next.name !== calls[i].name) mode = 'switch'\n      else mode = argSimilarity(calls[i].args, next.args) >= ANALYSIS_RULES.IDENTICAL_SIMILARITY ? 'identical' : 'strategy'\n    }\n    let recoverSec = null\n    for (let j = i + 1; j < calls.length; j++){\n      if (calls[j].v === 'ok'){ recoverSec = Math.max(0, Math.round((calls[j].s - calls[i].s) * 10) / 10); break }\n    }\n    chains.push({ i, name: calls[i].name, s: calls[i].s, mode, recoverSec,\n      recovered: recoverSec !== null && recoverSec <= ANALYSIS_RULES.RECOVERY_WINDOW })\n  }\n  return chains\n}\n\n/**\n * 区间合并求和：gap 秒内视为连续（与页面空闲折叠同口径），返回合并后的总时长。\n * 「工具占比」的分母用它——27 小时挂机的会话不该把密集的工具活动稀释成 1%。\n * @param iv [[s,e],...] 任意序；e < s 的脏区间按点处理\n * @param gap 视为连续的最大间隔（秒）\n */\nfunction mergeIntervalsTotal(iv, gap){\n  if (iv.length === 0) return 0\n  const v = [...iv].sort((a, b) => a[0] - b[0])\n  let total = 0, cs = v[0][0], ce = Math.max(v[0][1], v[0][0])\n  for (const [s, e0] of v){\n    const e = Math.max(e0, s)\n    if (s <= ce + gap) ce = Math.max(ce, e)\n    else { total += ce - cs; cs = s; ce = e }\n  }\n  return total + (ce - cs)\n}\n\n/** 最近邻分位数（P50/P95 用）：空数组为 0，单样本即该样本。刻意用最近邻不用线性插值——\n * 可视化「看个大概」的场景里，样本少时宁可取真实观测值也不造一个不存在的中间数。 */\nfunction percentile(arr, p){\n  if (arr.length === 0) return 0\n  const v = [...arr].sort((a, b) => a - b)\n  return v[Math.min(v.length - 1, Math.max(0, Math.ceil(p / 100 * v.length) - 1))]\n}\n\n/**\n * 该泳道时间序的已结算工具调用（带节点引用，供点击定位）。三类不进统计：\n * 子代理聚合节点（独立上下文）、请求级失败标记（无工具）、在途调用——判据只能是\n * e == null（实时链路在途工具创建时 dur 就是 0，拿 dur 当判据守卫会永不生效，踩过）。\n */\nfunction settledLaneCalls(lane){\n  const out = []\n  for (const n of [...lane.main, ...lane.detours]){\n    if (n.sub || n.evt) continue\n    for (const tl of n.tools ?? []){\n      if (tl.e == null) continue\n      out.push({ tl, n })\n    }\n  }\n  out.sort((a, b) => (a.tl.s ?? 0) - (b.tl.s ?? 0))\n  return out\n}\n\n/** 请求级失败计数（llm/retry / turn/end error 标记节点）：不属于工具统计，\n * 但全程失败的会话不能在分析卡上亮绿灯——单独计数列在卡内。 */\nfunction countRequestFailures(lane){\n  return [...lane.main, ...lane.detours].filter(n => n.evt).length\n}\n\n/** 工具结果矩阵聚合：Map(name → { calls, ok, error, deadend, retry, durs })。 */\nfunction toolMatrix(calls){\n  const m = new Map()\n  for (const tl of calls){\n    const g = m.get(tl.name) ?? { calls: 0, ok: 0, error: 0, deadend: 0, retry: 0, durs: [] }\n    g.calls += 1\n    g[tl.v] = (g[tl.v] ?? 0) + 1\n    g.durs.push(tl.dur ?? 0)\n    m.set(tl.name, g)\n  }\n  return m\n}\n\n/**\n * 同任务可比性：对比件（对齐线/锚点/盘点）的开关判定 + 图例要说的原因。\n * 图例要说真话：缺首条用户消息不是「任务不同」，是「没法判定」——两种原因分开。\n * @param firstUsers 各泳道首条用户消息文本（空串 = 该文件没有用户消息）\n * @returns { sameTask, reason: 'same' | 'diff' | 'no-first-user' | 'single' }\n */\nfunction taskComparability(firstUsers){\n  if (firstUsers.length < 2) return { sameTask: false, reason: 'single' }\n  if (firstUsers.some(f => !f)) return { sameTask: false, reason: 'no-first-user' }\n  const sameTask = firstUsers.every(f => f === firstUsers[0])\n  return { sameTask, reason: sameTask ? 'same' : 'diff' }\n}\n\n/**\n * 模型 → 上下文窗口（token）。上下文压力轨道用它把绝对输入量换算成占用百分比；\n * 匹配不到时返回 null，轨道诚实回退为绝对 token 数（不猜窗口）。\n * 数值取各家公开文档口径（2026-08），新模型按需补行——只加确定的，不加猜的。\n */\nconst CONTEXT_WINDOWS = [\n  [/deepseek-v4/i, 1_000_000],   // V4 系列（pro/flash）官方 1M：https://huggingface.co/blog/deepseekv4\n  [/deepseek-flash/i, 1_000_000], // 宿主 0.1.5 起的默认模型 deepseek-flash（DeepSeek-V41-Flash），宿主模型目录写 1M\n  [/deepseek/i, 128_000],        // V3 线与 deepseek-chat/reasoner\n  [/kimi|moonshot/i, 256_000],\n  [/qwen/i, 128_000],\n  [/glm/i, 128_000],\n  [/gpt-5/i, 400_000],\n  [/gpt-4\\.1/i, 1_000_000],\n  [/gpt-4o|o[34]-mini|o3\\b/i, 128_000],\n  [/claude/i, 200_000],\n  [/gemini/i, 1_000_000],\n]\n\n/** todo-freshness-guard 插件名（行为信号「待办陈旧」数它的提醒）。 */\nconst TODO_GUARD = 'todo-freshness-guard'\n\n/**\n * 这条注入上下文是不是 todo-freshness-guard 的提醒。日志格式 v0–v3（宿主 ≤0.1.6）写\n * `{kind:'plugin', plugin:'todo-freshness-guard'}`；v4（宿主 0.1.7 起）拒收 kind 'plugin'，迁移把旧来源\n * 改写成 `{kind:'plugin:todo-freshness-guard'}`，插件改用自有 kind 时也可能直接写 'todo-freshness-guard'——三种都认。\n * 实时链路（Chat 的 context 节点）与上传链路（user/message 事件）共用这一个判定。\n * @param {unknown} source 消息的 source 字段\n * @returns {boolean}\n */\nfunction isTodoReminderSource(source){\n  if (source === null || typeof source !== 'object') return false\n  const kind = /** @type {{ kind?: unknown }} */ (source).kind\n  if (kind === 'plugin') return /** @type {{ plugin?: unknown }} */ (source).plugin === TODO_GUARD\n  return kind === 'plugin:' + TODO_GUARD || kind === TODO_GUARD\n}\n\n/**\n * 按模型名解析上下文窗口。\n * @param model 模型名（可空）\n * @returns 窗口 token 数；未知模型返回 null\n */\nfunction contextWindowFor(model){\n  if (!model) return null\n  for (const [re, win] of CONTEXT_WINDOWS) if (re.test(model)) return win\n  return null\n}\n\n/**\n * 盲目重试簇标注（借 AgentLens 的确定性检测）：时间序上连续的「同工具 + 参数相似」\n * 调用簇，且簇内至少一次失败，才算盲目重试——不加失败约束会把「连续编辑同一文件」\n * 这类正常工作方式冤枉进去（edit 参数只有文件路径）。就地把簇内非失败调用改判\n * v='retry' 并写结构化依据；失败调用保持 error，簇上下文追加在 why2。返回命中簇数。\n * calls 必须按时间序传入，且只传已有结果的调用（实时模式排除 in-flight）。\n */\nfunction markRetryClusters(calls){\n  let clusters = 0\n  let start = 0\n  for (let i = 1; i <= calls.length; i++){\n    const brk = i === calls.length\n      || calls[i].name !== calls[i - 1].name\n      || argSimilarity(calls[i].args, calls[i - 1].args) < VERDICT_RULES.RETRY_SIMILARITY\n    if (!brk) continue\n    const len = i - start\n    if (len >= VERDICT_RULES.RETRY_MIN_CLUSTER){\n      const cluster = calls.slice(start, i)\n      const fails = cluster.filter(c => c.v === 'error').length\n      if (fails > 0){\n        clusters += 1\n        for (const c of cluster){\n          if (c.v === 'error') c.why2 = { k: 'retryCtx', p: [len] }\n          else { c.v = 'retry'; c.why = { k: 'retryCluster', p: [len, fails] } }\n        }\n      }\n    }\n    start = i\n  }\n  return clusters\n}\n\n/* ==================== 诊断层第 1 项（2026-09-06）：结果与证据 ==================== */\n\n/** 工具参数：实时链路给的是原始 JSON 字符串，上传链路给的是 argSummary 摘要（命令 / 路径）；两种都收。 */\nfunction parseArgs(args){\n  if (args != null && typeof args === 'object') return args\n  const s = String(args ?? '')\n  try {\n    const v = JSON.parse(s)\n    return v != null && typeof v === 'object' ? v : s\n  } catch { return s }\n}\n\n/** 一次 shell 类调用的命令文本；参数里没有命令时 null。Codex 风格的 `command: [...]` 数组也收。 */\nfunction commandOf(args){\n  const a = parseArgs(args)\n  if (typeof a === 'string') return a\n  if (typeof a.command === 'string') return a.command\n  if (Array.isArray(a.command)) return a.command.map(String).join(' ')\n  if (typeof a.cmd === 'string') return a.cmd\n  return null\n}\n\n/**\n * 命令拆成 shell 片段并剥掉命令位置前的包装（见 VALIDATION_WRAP）。每个片段给两份：\n *   m   = 抹掉 heredoc 正文、引号串内容换成等长下划线（`-c \"…\"` 的脚本体保留）——只用于正则匹配；\n *   raw = 同一片段的原文（heredoc 正文同样抹掉）——归一 key 用它，`pytest -k \"a\"` 和 `pytest -k \"b\"`\n *         不会碰成一条（评审 P2-3）。等长替换保证两份文本的切分位置一致。\n */\nfunction commandSegments(command){\n  const out = []\n  const raw = String(command ?? '').replace(ANALYSIS_RULES.HEREDOC, (m, q, tag) => '<<' + tag)\n  const blank = raw.replace(ANALYSIS_RULES.QUOTED, (m, c) => c !== undefined ? m : m[0] + '_'.repeat(m.length - 2) + m[m.length - 1])\n  const split = new RegExp(ANALYSIS_RULES.VALIDATION_SPLIT.source, 'g')\n  const spans = []\n  let pos = 0, mm\n  while ((mm = split.exec(blank)) !== null){\n    spans.push([pos, mm.index])\n    pos = mm.index + mm[0].length\n    if (mm[0] === '') split.lastIndex += 1\n  }\n  spans.push([pos, blank.length])\n  for (const [a, b] of spans){\n    const m0 = blank.slice(a, b).trimEnd()\n    let m = m0\n    let prev\n    do {\n      prev = m\n      m = m.replace(/^[\\s({!\"']+/, '').replace(ANALYSIS_RULES.VALIDATION_WRAP, '')\n    } while (m !== prev)\n    const r = raw.slice(a, b).slice(m0.length - m.length, m0.length)\n    // 匹配副本再去掉尾引号（`sh -c 'cargo clippy'` 的脚本体收尾）；原文副本保留引号，归一时只去不成对的那个\n    m = m.replace(/[\"']+$/, '')\n    if (m !== '') out.push({ m, raw: r })\n  }\n  return out\n}\n\n/** 探测命令：命令词之外只剩 --version / -V / --help / -h（评审 P2-2）。 */\nfunction isProbe(seg){\n  const rest = seg.split(/\\s+/).slice(1)\n    .filter(t => !/^(?:run|run-script|exec|dlx|x|test|t|tests|check|build|lint|typecheck|type-check|compile|bundle|eslint|stylelint|nextest|clippy|vet)(?::[\\w:.-]+)?$/.test(t))\n  return rest.length > 0 && rest.every(t => ANALYSIS_RULES.PROBE_FLAGS.test(t))\n}\n\n/** 片段归一：去掉重定向、`$(…)` 留下的尾括号（评审 P3-8）与多余空白——`sh x_test.sh >/dev/null 2>&1` 和 `sh x_test.sh` 是同一条命令。 */\nfunction normalizeSegment(seg){\n  let s = seg.replace(/\\s*(?:\\d*>>?\\s*\\S+|\\d*>&\\d+|<\\s*\\S+)/g, '').replace(/[\\s)]+$/, '').replace(/\\s+/g, ' ').trim()\n  // `bash -lc \"go test\"` 剥壳后原文只剩收尾的那个引号：不成对才去掉，`pytest -k \"a\"` 的成对引号保留\n  for (const q of ['\"', \"'\"]) if (s.endsWith(q) && (s.split(q).length - 1) % 2 === 1) s = s.slice(0, -1).trimEnd()\n  return s\n}\n\n/**\n * 一条命令里命中验证类别的片段：{ test: [...], build: [...], lint: [...] }，片段已归一去重。\n * 只看命令位置（`cat vitest.config.ts`、`grep -n pytest` 不算），规则见 ANALYSIS_RULES.VALIDATION。\n * 「同一条命令多次执行取最后一次」按这里的片段算，而不是整行 bash——`cd x && sh a_test.sh` 与\n * `sh a_test.sh 2>&1 | tail -3` 跑的是同一个测试。\n */\nfunction validationHits(command){\n  const segs = commandSegments(command)\n  const hits = { test: [], build: [], lint: [] }\n  for (const kind of ['test', 'build', 'lint']){\n    const pats = ANALYSIS_RULES.VALIDATION[kind]\n    for (const seg of segs){\n      if (!pats.some(re => re.test(seg.m)) || isProbe(seg.m)) continue\n      const key = normalizeSegment(seg.raw)\n      if (key !== '' && !hits[kind].includes(key)) hits[kind].push(key)\n    }\n  }\n  return hits\n}\n\n/** job_output 类调用的 job id（原始 JSON 或摘要串）；没有则 null。 */\nfunction jobIdOf(args){\n  const a = parseArgs(args)\n  if (typeof a === 'string') return a.trim() === '' ? null : a.trim()\n  for (const k of ['job_id', 'jobId', 'id']) if (typeof a[k] === 'string' && a[k] !== '') return a[k]\n  return null\n}\n\n/** 一条命令命中的验证类别，固定序 ['test','build','lint'] 的子集；一条命令命中多类分别记。 */\nfunction detectValidationKinds(command){\n  const hits = validationHits(command)\n  return ['test', 'build', 'lint'].filter(k => hits[k].length > 0)\n}\n\n/**\n * 返回文本末行里的退出码；没有则 null。要传**未压空白**的原文（两条链路都在截断/压空白前算好\n * 存到 tl.exit）；压过空白的文本整段算一行，dsh 追加在末尾的 `[exit code: N]` 仍能命中。\n */\nfunction exitCodeOf(text){\n  const t = String(text ?? '').trimEnd()\n  if (t === '') return null\n  const line = t.slice(t.lastIndexOf('\\n') + 1)\n  const m = ANALYSIS_RULES.EXIT_CODE.exec(line)\n  return m ? Number(m[1]) : null\n}\n\n/** 验证类调用是否通过：isError 为假且末行没有非零退出码。judged v 刻意不参与——退出码才是命令的裁判。 */\nfunction validationPassed(tl){\n  if (tl.err) return false\n  const code = tl.exit !== undefined ? tl.exit : exitCodeOf(tl.resFull ?? tl.res ?? '')\n  return !(typeof code === 'number' && code !== 0)\n}\n\n/** apply_patch 补丁文本里触及的文件（Add/Update/Delete File 头）。 */\nfunction patchPaths(text){\n  const out = []\n  const re = /\\*\\*\\* (?:Add|Update|Delete) File: ([^\\n\\r\"]+)/g\n  let m\n  while ((m = re.exec(String(text ?? ''))) !== null) out.push(m[1].trim())\n  return out\n}\n\n/** 写入/编辑类调用触及的文件路径（可能多条：补丁）；识别不出路径时空数组。 */\nfunction artifactPaths(name, args){\n  const a = parseArgs(args)\n  if (typeof a !== 'string'){\n    for (const k of ['file_path', 'path', 'filePath', 'filename', 'target_file', 'notebook_path']){\n      if (typeof a[k] === 'string' && a[k].trim() !== '') return [a[k].trim()]\n    }\n    return patchPaths(typeof a.patch === 'string' ? a.patch : typeof a.input === 'string' ? a.input : '')\n  }\n  const s = a.trim()\n  if (s === '') return []\n  if (s.includes('*** ') && /\\*\\*\\* (?:Add|Update|Delete) File:/.test(s)) return patchPaths(s)\n  return [s]   // 上传链路的参数摘要就是文件路径\n}\n\n/**\n * 结果与证据：六格 + 综合。全部是对已判定数据的确定性聚合，不信 Agent 自述。\n *   任务完成 = 最后一轮 turn/end 的原因不在 TURN_END_INCOMPLETE 里且该轮最后一步是回答节点；\n *   测试/构建/Lint = shell 类调用命令按 validationHits 归类，类别通过 = 该类别最后一次运行通过\n *     （anchor 指向它）；此前别的命令最后一次失败的条数记在 failedCommands，展示端小字注明；\n *   产物 = 写入/编辑类调用成功触及的文件去重；\n *   人工确认 = 最终回答之后有没有用户消息（只给布尔，不解读内容）；\n *   综合：任务没正常结束 → partial；有验证类命令且某类最后一次失败 → partial；一条验证命令都没有 → unverified；其余 done。\n * @param lane { main, detours, turnEnds?: [{turn, kind, s}], userMsgs?: [{s}] }（s 为墙钟秒，不随空闲折叠变）\n * @param wall 节点坐标 → 墙钟秒（页面折叠过时间轴时传 wallClock；否则恒等）\n */\nfunction outcomeEvidence(lane, wall){\n  const toWall = typeof wall === 'function' ? wall : (t => t)\n  const calls = settledLaneCalls(lane)\n  const R = ANALYSIS_RULES\n  const mk = () => ({ runs: 0, byCmd: new Map(), last: null, unresolved: 0 })\n  const kinds = { test: mk(), build: mk(), lint: mk() }\n  let codeCalls = 0\n  const paths = new Map()\n  let writes = 0, failedWrites = 0\n  /** 后台任务：起任务的那次 shell 调用先挂着，等 job_output 末行给出退出码再计入（评审 P2-1）。 */\n  const bgPending = new Map()\n  const record = (call, hits, passed, exit) => {\n    for (const k of ['test', 'build', 'lint']){\n      if (hits[k].length === 0) continue\n      const g = kinds[k]\n      g.runs += 1\n      // 同一条命令（归一后的片段）多次执行：后者覆盖前者；退出码是整次调用的，片段共享它\n      for (const key of hits[k]) g.byCmd.set(key, { call, passed, cmd: key, exit })\n      g.last = { call, passed, cmd: hits[k][hits[k].length - 1], exit }\n    }\n  }\n  for (const c of calls){\n    const name = c.tl.name\n    if (R.CODE_TOOLS.includes(name)) codeCalls += 1\n    if (R.JOB_TOOLS.includes(name)){\n      const pend = bgPending.get(jobIdOf(c.tl.args))\n      if (pend === undefined) continue\n      const code = c.tl.exit !== undefined ? c.tl.exit : exitCodeOf(c.tl.resFull ?? c.tl.res ?? '')\n      if (code === null && !c.tl.err) continue   // 还在跑（[status: running]），继续挂着\n      bgPending.delete(jobIdOf(c.tl.args))\n      record(pend.call, pend.hits, !c.tl.err && code !== null && code === 0, code)\n      continue\n    }\n    if (R.ARTIFACT_TOOLS.includes(name)){\n      const ps = artifactPaths(name, c.tl.args)\n      if (ps.length > 0){\n        if (c.tl.err || c.tl.v === 'error') failedWrites += 1\n        else { writes += 1; for (const p of ps) paths.set(p, (paths.get(p) ?? 0) + 1) }\n      }\n      continue\n    }\n    if (!R.SHELL_TOOLS.includes(name)) continue\n    const cmd = commandOf(c.tl.args)\n    if (cmd === null || cmd.trim() === '') continue\n    const hits = validationHits(cmd)\n    if (hits.test.length + hits.build.length + hits.lint.length === 0) continue\n    const bg = R.BACKGROUND_JOB.exec(String(c.tl.res ?? c.tl.resFull ?? '').trimStart())\n    if (bg !== null){ bgPending.set(bg[1], { call: c, hits }); continue }\n    record(c, hits, validationPassed(c.tl), c.tl.exit ?? null)\n  }\n  // 起了后台任务却始终没拿到退出码的：不计入运行，格里如实标注\n  for (const pend of bgPending.values()) for (const k of ['test', 'build', 'lint']) if (pend.hits[k].length > 0) kinds[k].unresolved += 1\n  const out = {}\n  for (const k of ['test', 'build', 'lint']){\n    const g = kinds[k]\n    // 类别通过与否以该类别**最后一次运行**为准（吴昊 2026-09-06 拍板的 B 方案）：单文件 pytest 失败后\n    // 整套 pytest 通过就是通过；此前别的命令最后一次失败的条数另给出，格里小字注明。决定性的那次 = 最后一次运行。\n    const failed = [...g.byCmd.values()].filter(x => !x.passed)\n    const decisive = g.last\n    out[k] = {\n      runs: g.runs, commands: g.byCmd.size, failedCommands: failed.length, unresolved: g.unresolved,\n      passed: decisive === null ? null : decisive.passed,\n      anchor: decisive ? decisive.call : null,\n      anchorCmd: decisive ? decisive.cmd : null,\n      anchorExit: decisive ? decisive.exit : null,\n    }\n  }\n\n  // 任务完成：最后一轮（步骤与 turn/end 里最大的轮次）怎么收的尾\n  const steps = [...lane.main, ...lane.detours].filter(n => !n.sub && !n.evt)\n  const turnEnds = lane.turnEnds ?? []\n  let lastTurn = 0\n  for (const n of steps) lastTurn = Math.max(lastTurn, n.turn ?? 1)\n  for (const t of turnEnds) lastTurn = Math.max(lastTurn, t.turn ?? 1)\n  const running = steps.some(n => n.live && (n.turn ?? 1) === lastTurn)\n  // 时间打平时按步序裁决：实时链路把时间取整到 0.1 秒，失败的一步和紧跟的回答可能落在同一刻度，\n  // 只按时间排时支路（排在主干之后拼接）会被当成最后一步，误判「没有最终回答」\n  const inTurn = steps.filter(n => !n.live && (n.turn ?? 1) === lastTurn).sort((a, b) => a.s - b.s || a.e - b.e || (a.step ?? 0) - (b.step ?? 0))\n  const lastNode = inTurn.length > 0 ? inTurn[inTurn.length - 1] : null\n  const answer = lastNode !== null && lastNode.v === 'answer' ? lastNode : null\n  const end = turnEnds.filter(t => (t.turn ?? 1) === lastTurn).pop() ?? null\n  let state\n  if (running) state = 'running'\n  else if (end !== null && R.TURN_END_INCOMPLETE.includes(end.kind)) state = 'failed'\n  else if (end === null) state = 'unfinished'\n  else if (answer === null) state = 'noAnswer'\n  else state = 'done'\n  const task = { state, turn: lastTurn > 0 ? lastTurn : null, reason: end ? end.kind : null, answer }\n\n  // 人工确认：最终回答之后有没有真人消息（source.kind = user）\n  const responded = answer === null ? null\n    : (lane.userMsgs ?? []).some(u => u.s > toWall(answer.e))\n\n  const anyValidation = out.test.runs + out.build.runs + out.lint.runs > 0\n  const failedKinds = ['test', 'build', 'lint'].filter(k => out[k].passed === false)\n  const missing = ['test', 'build', 'lint'].filter(k => out[k].runs === 0)\n  const overall = state !== 'done' ? 'partial'\n    : !anyValidation ? 'unverified'\n    : failedKinds.length > 0 ? 'partial'\n    : 'done'\n  return {\n    task, test: out.test, build: out.build, lint: out.lint,\n    artifacts: { paths: [...paths.keys()], writes, failedWrites },\n    human: { responded, answerAt: answer !== null ? toWall(answer.e) : null },\n    overall, failedKinds, missing, anyValidation, codeCalls,\n  }\n}\n\n/* ==================== 诊断层第 2 项（2026-09-07）：行为信号清单 ==================== */\n\n/**\n * 阈值全部按 2026-09-06 本机 202 份会话（149 场有效）校准，脚本\n * trace-compare-verdict-calibration/behavior-signals-calib.mjs（2026-09-07 独立评审后修正三处——循环去重、签名同规则、\n * 失败改用 toolVerdict——并重跑，各条命中占比见下）；定阈值的原则：「中」落在最差的 15%~20% 会话，「高」落在最差的\n * 3%~5%。改这里必须重跑校准脚本，把命中占比记进 CHANGELOG。\n */\nANALYSIS_RULES.SIGNALS = {\n  /** 轮询 / 记账类工具：不参与重复与循环计数（它们本来就要反复调）。 */\n  POLL_TOOLS: ['job_output', 'todo_write', 'list_agents', 'send_message', 'wait', 'sleep'],\n  /** 读取类工具（重复读取子标签用）。 */\n  READ_TOOLS: ['read', 'grep', 'glob', 'ls', 'list_files', 'search'],\n  /** shell 里的读取类命令（作用于命令文本开头）。 */\n  READ_SHELL: /^(?:cat|sed|head|tail|rg|grep|ls|find|wc|git (?:log|status|diff|show)) /,\n  /** 参数签名截断长度（与校准脚本一致）。 */\n  SIG_MAX: 300,\n  /** 失败后原样重试：上一次失败、这一次同工具同参数。中 ≥1，高 ≥3（按 toolVerdict 口径重跑 15% / 4%；换策略恢复 32%，信息级不设阈值）。 */\n  MECHANICAL: { medium: 1, high: 3 },\n  /** 同轮重复调用：占本场调用的比例且次数（低 ≥10% 且 ≥5；中 ≥15% 且 ≥8）。2026-09-07 签名与页面同规则后重跑，旧「中」（≥20% 且 ≥10）只命中 8%，\n   *  低于 15%~20% 的目标区间，2026-09-24 吴昊拍板放宽到 ≥15% 且 ≥8。 */\n  REPEAT: { low: { rate: 0.10, min: 5 }, medium: { rate: 0.15, min: 8 } },\n  /** 重复读取子标签：同轮重复里读取类 ≥5（重跑校准 26%，只作子标签）。 */\n  REPEAT_READ: 5,\n  /** 循环：排除轮询类后长度 1~3 的序列连续 3 次，长窗口先扫、已覆盖的下标不再数；占用步数 中 ≥9，高 ≥30（去重后重跑校准 16% / 4%，落在目标区间）。 */\n  LOOP: { medium: 9, high: 30 },\n  /** 工具失败（判定 = toolVerdict，错误标志 + 输出特征）：中 = 失败率 ≥8%（且本场调用 ≥10 次，与校准集口径一致）或失败 ≥10 次；\n   *  高 = 失败率 ≥15% 且 ≥10 次（2026-09-07 第二轮：校准脚本真正接上 toolVerdict 后旧阈值命中 38% / 5%，按目标区间重定；\n   *  第三轮喂 toolVerdict 的文本先压空白后重跑 19% / 3%，普通模式单看 23% / 3%，code 模式几乎不失败把整体拉低）。 */\n  FAIL: { medium: { count: 10, rate: 0.08, minCalls: 10 }, high: { count: 10, rate: 0.15 } },\n  /** 慢调用：单次 ≥120 秒；低 ≥1 次，中 ≥3 次（校准 14% / 3%，2026-09-07 去掉压缩重发的 tool/result 后重算）。相对均值的口径在 72% 会话触发，没有区分度，已弃。 */\n  SLOW_SEC: 120,\n  SLOW: { low: 1, medium: 3 },\n  /** 工具集中度：调用 ≥20 次且赫芬达尔指数 ≥0.85（低，校准 10%）。 */\n  HHI: { minCalls: 20, min: 0.85 },\n  /** 上下文骤升 / 骤降：相邻两次请求占用变化 ≥20 个百分点，只在同一窗口内比（升为中，降为信息；按逐请求窗口重跑 1% / 4%）。 */\n  CTX_JUMP: 0.20,\n  /** 上下文峰值占窗口：低 ≥50%，中 ≥70%，高 ≥90%（校准 11% / 5% / 0%，1M 窗口下几乎不亮）。 */\n  CTX_PEAK: { low: 0.5, medium: 0.7, high: 0.9 },\n  /** 压缩发生：compaction/start ≥1 为信息；prune ≥10 另加一句（校准 5%）。 */\n  PRUNE_NOTE: 10,\n  /** 待办陈旧：todo-freshness-guard 提醒次数 低 ≥10，中 ≥30（校准 11% / 3%）。 */\n  TODO: { low: 10, medium: 30 },\n}\n\n/** 参数签名（与校准脚本同规则）：bash 取整条命令压空白，读写类取文件路径，其余取参数 JSON；截到 SIG_MAX。 */\nfunction callSignature(name, args){\n  const a = parseArgs(args)\n  let body\n  if (typeof a === 'string') body = a\n  else if (typeof a.command === 'string') body = a.command\n  else if (Array.isArray(a.command)) body = a.command.map(String).join(' ')\n  else if (typeof a.file_path === 'string') body = a.file_path\n  // grep/glob 这类带 pattern 的工具与 query 类工具：和页面 argSummary 同一形态（评审 P1-2，两条链路签名一致）\n  else if (typeof a.pattern === 'string') body = 'pattern=' + a.pattern + (a.path ? ' path=' + a.path : '')\n  else if (typeof a.query === 'string') body = a.query\n  else body = JSON.stringify(a)\n  return name + '|' + String(body).replace(/\\s+/g, ' ').trim().slice(0, ANALYSIS_RULES.SIGNALS.SIG_MAX)\n}\n\n/** 调用目标（换策略恢复用）：文件路径，或 shell 命令的第一个词。 */\nfunction callTarget(name, args){\n  const a = parseArgs(args)\n  if (typeof a !== 'string'){\n    if (typeof a.file_path === 'string') return a.file_path\n    if (typeof a.path === 'string') return a.path\n    if (typeof a.command === 'string' && ANALYSIS_RULES.SHELL_TOOLS.includes(name)) return (a.command.trim().match(/^([\\w./-]+)/) ?? ['', ''])[1]\n    return ''\n  }\n  if (ANALYSIS_RULES.SHELL_TOOLS.includes(name)) return (a.trim().match(/^([\\w./-]+)/) ?? ['', ''])[1]\n  if (['read', 'write', 'edit'].includes(name)) return a.trim()\n  return ''\n}\n\n/** 严重度序，块内排序用。 */\nconst SIGNAL_SEV = { high: 3, medium: 2, low: 1, info: 0 }\n\n/**\n * 行为信号清单：对已结算调用与轮次/上下文原料的确定性聚合，每条 { type, severity, count, callIds,\n * refs（涉及的 {tl,n}，首个即点击定位目标）, why {k,p} }。各信号独立计数、口径与校准脚本逐条对应\n * （见 ANALYSIS_RULES.SIGNALS）；循环与同轮重复、原样重试与工具失败可能指向同一段调用——各自说各自\n * 的事实，展示端在方法说明里写明，不在这里互相扣减（扣减会让计数对不上校准）。\n * @param lane { main, detours, model?, ctxWindow?, compaction?: {starts:[s], prunes, summaries}, todoReminders? }\n * @param wall 节点坐标 → 墙钟秒（页面折叠过时间轴时传 wallClock）\n */\nfunction behaviorSignals(lane, wall){\n  const R = ANALYSIS_RULES.SIGNALS\n  const toWall = typeof wall === 'function' ? wall : (t => t)\n  const calls = settledLaneCalls(lane).map(c => ({\n    ref: c, name: c.tl.name, sig: callSignature(c.tl.name, c.tl.args), tgt: callTarget(c.tl.name, c.tl.args),\n    turn: c.n.turn ?? 1, failed: c.tl.v === 'error', dur: c.tl.dur ?? 0, id: c.tl.callId ?? null,\n  }))\n  const out = []\n  const push = (type, severity, refs, why) => out.push({\n    type, severity, count: refs.length, callIds: refs.map(r => r.tl?.callId ?? null).filter(x => x !== null),\n    refs, why,\n  })\n  const isRead = c => R.READ_TOOLS.includes(c.name)\n    || (ANALYSIS_RULES.SHELL_TOOLS.includes(c.name) && R.READ_SHELL.test(c.sig.slice(c.name.length + 1)))\n\n  // 失败后原样重试 / 换策略恢复 / 同轮重复（含读取子标签）——一趟扫描，与校准脚本同序\n  const mech = [], adaptive = [], repeats = [], readRepeats = []\n  const lastIdx = new Map()\n  for (let i = 0; i < calls.length; i++){\n    const c = calls[i], p = calls[i - 1]\n    if (p && p.failed && p.sig === c.sig){ mech.push(c.ref); lastIdx.set(c.sig, i); continue }\n    if (p && p.failed && p.name === c.name && p.tgt !== '' && p.tgt === c.tgt && p.sig !== c.sig && !c.failed) adaptive.push(c.ref)\n    if (R.POLL_TOOLS.includes(c.name)){ lastIdx.set(c.sig, i); continue }\n    if (lastIdx.has(c.sig) && calls[lastIdx.get(c.sig)].turn === c.turn){\n      repeats.push(c.ref)\n      if (isRead(c)) readRepeats.push(c.ref)\n    }\n    lastIdx.set(c.sig, i)\n  }\n  if (mech.length >= R.MECHANICAL.medium) push('mechanicalRetry', mech.length >= R.MECHANICAL.high ? 'high' : 'medium', mech, { k: 'sigMechanical', p: [mech.length] })\n  const total = calls.length\n  const repRate = total > 0 ? repeats.length / total : 0\n  if (repeats.length >= R.REPEAT.low.min && repRate >= R.REPEAT.low.rate){\n    const sev = repeats.length >= R.REPEAT.medium.min && repRate >= R.REPEAT.medium.rate ? 'medium' : 'low'\n    push('repeat', sev, repeats, { k: 'sigRepeat', p: [repeats.length, Math.round(repRate * 100), readRepeats.length >= R.REPEAT_READ ? readRepeats.length : 0] })\n  }\n\n  // 循环：排除轮询类后，长度 1~3 的序列连续 3 次\n  const seq = calls.filter(c => !R.POLL_TOOLS.includes(c.name))\n  const sigs = seq.map(c => c.sig)\n  // 长窗口先扫：一段被长窗口命中后短窗口不再数（评审 P1-1：9 次相同调用是 1 段 9 步，不是 24 步）\n  const covered = new Set()\n  let loops = 0\n  for (const w of [3, 2, 1]){\n    for (let at = 0; at + w * 3 <= sigs.length; at++){\n      let clash = false\n      for (let j = at; j < at + w * 3; j++) if (covered.has(j)){ clash = true; break }\n      if (clash) continue\n      const pat = sigs.slice(at, at + w).join('||')\n      if ([1, 2].every(k => sigs.slice(at + k * w, at + (k + 1) * w).join('||') === pat)){\n        loops += 1\n        for (let j = at; j < at + w * 3; j++) covered.add(j)\n        at += w * 3 - 1\n      }\n    }\n  }\n  const loopSteps = covered.size\n  const loopRefs = [...covered].sort((x, y) => x - y).map(j => seq[j].ref)\n  if (loopSteps >= R.LOOP.medium) push('loop', loopSteps >= R.LOOP.high ? 'high' : 'medium', loopRefs, { k: 'sigLoop', p: [loops, loopSteps] })\n\n  // 工具失败（沿用现有判定 v = error）\n  const fails = calls.filter(c => c.failed)\n  const failRate = total > 0 ? fails.length / total : 0\n  if (fails.length >= R.FAIL.medium.count || (total >= R.FAIL.medium.minCalls && failRate >= R.FAIL.medium.rate)){\n    const sev = failRate >= R.FAIL.high.rate && fails.length >= R.FAIL.high.count ? 'high' : 'medium'\n    push('toolFail', sev, fails.map(c => c.ref), { k: 'sigFail', p: [fails.length, total, Math.round(failRate * 100)] })\n  }\n\n  // 慢调用：绝对 120 秒\n  const slow = calls.filter(c => c.dur >= R.SLOW_SEC).sort((a, b) => b.dur - a.dur)\n  if (slow.length >= R.SLOW.low) push('slowCall', slow.length >= R.SLOW.medium ? 'medium' : 'low', slow.map(c => c.ref), { k: 'sigSlow', p: [slow.length, Math.round(slow[0].dur), slow[0].name] })\n\n  // 工具集中度：赫芬达尔指数\n  if (total >= R.HHI.minCalls){\n    const cnt = new Map()\n    for (const c of calls) cnt.set(c.name, (cnt.get(c.name) ?? 0) + 1)\n    let hhi = 0, top = null, topN = 0\n    for (const [name, n] of cnt){ hhi += (n / total) ** 2; if (n > topN){ topN = n; top = name } }\n    // code 模式外层全是 run_code，集中度必然 100%、说明不了任何事——真实工具在脚本里，本版未展开，跳过\n    if (hhi >= R.HHI.min && !ANALYSIS_RULES.CODE_TOOLS.includes(top)) push('concentration', 'low', calls.filter(c => c.name === top).map(c => c.ref), { k: 'sigHhi', p: [Math.round(hhi * 1000) / 1000, top, Math.round(topN / total * 100)] })\n  }\n\n  // 上下文占用：每次请求按当时的模型换算窗口（contextOccupancy）；窗口表过时（有样本超窗）时不出任何上下文信号\n  const occ = contextOccupancy(lane)\n  const compStarts = (lane.compaction?.starts ?? [])\n  if (occ.valid && occ.samples.length > 0){\n    // 窗口值不可信而被略过的样本没有占用：不参与比较，而且把比较链在它这里断开——它两侧不跨着比（评审 P2-3）\n    let peak = 0, peakNode = null\n    const ups = [], downs = []\n    let compacted = 0\n    let prev = null\n    for (const sm of occ.samples){\n      if (sm.ratio == null){ prev = null; continue }\n      const r = sm.ratio\n      if (r > peak){ peak = r; peakNode = sm.n }\n      // 窗口切换处也断开：300K@1M（30%）切到 128K 模型跑 100K（78%）不是骤升，只是换了尺子（第二轮评审 A）\n      if (prev !== null && prev.win === sm.win){\n        const d = r - prev.ratio\n        if (d >= R.CTX_JUMP) ups.push({ n: sm.n, from: prev.ratio, to: r })\n        if (d <= -R.CTX_JUMP){\n          const a = toWall(prev.n.s), b = toWall(sm.n.e)\n          const near = compStarts.some(t => t >= a && t <= b)\n          if (near) compacted += 1\n          downs.push({ n: sm.n, from: prev.ratio, to: r, near })\n        }\n      }\n      prev = sm\n    }\n    const nodeRef = n => ({ tl: (n.tools ?? [])[0] ?? null, n })\n    if (ups.length > 0) push('ctxJump', 'medium', ups.map(x => nodeRef(x.n)), { k: 'sigCtxUp', p: [ups.length, Math.round(ups[0].from * 100), Math.round(ups[0].to * 100)] })\n    if (downs.length > 0) push('ctxDrop', 'info', downs.map(x => nodeRef(x.n)), { k: 'sigCtxDown', p: [downs.length, Math.round(downs[0].from * 100), Math.round(downs[0].to * 100), compacted] })\n    if (peak >= R.CTX_PEAK.low) push('ctxPeak', peak >= R.CTX_PEAK.high ? 'high' : peak >= R.CTX_PEAK.medium ? 'medium' : 'low', [nodeRef(peakNode)], { k: 'sigCtxPeak', p: [Math.round(peak * 1000) / 10, occ.peakWin] })\n  }\n\n  // 压缩发生 / 待办陈旧 / 换策略恢复\n  const comp = lane.compaction\n  if (comp && comp.starts.length >= 1) push('compaction', 'info', [], { k: 'sigCompaction', p: [comp.starts.length, (comp.prunes ?? 0) >= R.PRUNE_NOTE ? comp.prunes : 0] })\n  const todo = lane.todoReminders ?? 0\n  if (todo >= R.TODO.low) push('todoStale', todo >= R.TODO.medium ? 'medium' : 'low', [], { k: 'sigTodo', p: [todo] })\n  if (adaptive.length > 0) push('adaptiveRecovery', 'info', adaptive, { k: 'sigAdaptive', p: [adaptive.length] })\n\n  out.sort((a, b) => SIGNAL_SEV[b.severity] - SIGNAL_SEV[a.severity] || b.count - a.count)\n  return out\n}\n\n/**\n * 上下文占用（吴昊 2026-09-07 拍板）：每次请求按**当时的模型**换算窗口——节点自带 ctxWin（上传链路\n * 解析时取该 assistant/message 之前最近一条 request/context 的 contextWindow，宿主报了真值优先，\n * 没有再查模型表），缺席时退回泳道级窗口（最后一条 request/context）或会话模型的表值。\n * 健全性守卫沿用：任何一个样本的 token 超过它的窗口，就视为窗口表过时，valid=false，\n * 展示端退回绝对 token（绝不显示超过 100% 的占用）；守卫按窗口分别算，见函数内注释。\n * @returns { samples:[{n,tok,win,ratio}] 按结束时间序, valid, peakTok, peakRatio, peakWin, peakNode, windows:[去重后的窗口] }\n */\nfunction contextOccupancy(lane){\n  const fallback = lane.ctxWindow ?? contextWindowFor(lane.model)\n  const own = [...lane.main, ...lane.detours].filter(n => !n.sub && !n.evt && !n.live && (n.inTok != null || n.cacheTok != null)).sort((a, b) => a.e - b.e || a.s - b.s)\n  const tokOf = n => (n.inTok ?? 0) + (n.cacheTok ?? 0)\n  // 守卫按窗口算：某个窗口下有样本超过它，这个窗口值就不可信（big2 里中转站给的 262144 窗口跑了 595K 的请求），\n  // 只把该窗口下的样本作废（ratio = null），别的窗口照常——一条中转站的错报不该让整场退回绝对值。\n  const stale = new Set()\n  for (const n of own){ const win = n.ctxWin ?? fallback; if (win != null && tokOf(n) > win) stale.add(win) }\n  const samples = []\n  let peakTok = 0, peakRatio = 0, peakNode = null, peakWin = null, skipped = 0\n  const windows = []\n  for (const n of own){\n    const tok = tokOf(n)\n    const win = n.ctxWin ?? fallback\n    const ok = win != null && !stale.has(win)\n    if (ok && !windows.includes(win)) windows.push(win)\n    if (!ok) skipped += 1\n    const ratio = ok ? tok / win : null\n    samples.push({ n, tok, win: win ?? null, ratio })\n    if (tok > peakTok) peakTok = tok\n    if (ratio != null && ratio > peakRatio){ peakRatio = ratio; peakNode = n; peakWin = win }\n  }\n  const valid = own.length > 0 && skipped < own.length\n  if (!valid){ peakRatio = 0; peakWin = null; peakNode = own.reduce((b, n) => (b === null || tokOf(n) > tokOf(b)) ? n : b, null) }\n  return { samples, valid, peakTok, peakRatio, peakWin, peakNode, windows, skipped }\n}\n\n/* ==================== 对比件：变量表与「受控 / 探索」判定（诊断层第 5 项） ==================== */\n\n/** 变量表的项：模型单独看（那是要比较的条件），其余是必须相同的干扰变量。 */\nconst COMPARE_VARS = ['provider', 'reasoningEffort', 'agentPreset', 'permission', 'sandbox', 'approval', 'instructions', 'skills', 'cwd', 'model']\n\n/**\n * 逐项比较各泳道的元数据。\n * 每项状态：`same`（各泳道都有记录且相同）/ `diff`（都有记录但有不同）/ `unknown`（至少一条没记录，\n * 日志里没有这一项时绝不当作「相同」——那会把没验证过的东西说成受控）。\n * @param lanes 泳道数组，读 `lane.meta[key]`\n * @returns [{ key, values, state }]\n */\nfunction comparisonVariables(lanes){\n  const pick = (l, k) => {\n    const v = l && l.meta ? l.meta[k] : null\n    return v === undefined || v === null || v === '' ? null : String(v)\n  }\n  return COMPARE_VARS.map(k => {\n    const values = lanes.map(l => pick(l, k))\n    const known = values.filter(v => v !== null)\n    const state = known.length < values.length ? 'unknown' : (values.every(v => v === values[0]) ? 'same' : 'diff')\n    return { key: k, values, state }\n  })\n}\n\n/**\n * 「受控 / 探索」判定：除模型外全部相同且都有记录 → 受控；有变量不同 → 探索性；只差在未记录项 → 疑似受控。\n * 只有受控时，两次跑的差额才可以算到模型头上。\n * @param vars comparisonVariables 的结果\n * @returns { kind: 'controlled'|'likely'|'exploratory', diffKeys, unknownKeys, modelChanged }\n */\nfunction controlledVerdict(vars){\n  const others = vars.filter(v => v.key !== 'model')\n  const diffKeys = others.filter(v => v.state === 'diff').map(v => v.key)\n  const unknownKeys = others.filter(v => v.state === 'unknown').map(v => v.key)\n  const model = vars.find(v => v.key === 'model')\n  return {\n    kind: diffKeys.length > 0 ? 'exploratory' : unknownKeys.length > 0 ? 'likely' : 'controlled',\n    diffKeys,\n    unknownKeys,\n    modelChanged: model ? model.state === 'diff' : false,\n  }\n}\n\n/* ==================== 优化建议（诊断层第 6 项） ==================== */\n\n/**\n * 阈值按本机 240 场会话校准（2026-10-09）：每条模板的命中率落在 1.7%~20%，\n * 都是\"少数会话才会亮\"的尾部条件——否则建议就成了每场都有的噪音。\n * 括号里是实测命中率：unrecovered ≥3 处（本次未单测，与 toolFail 同量级）、\n * 原样重试 16.7%、循环 13.8%、同轮重复 18.3%、写文件没验证 12.1%、\n * 上下文峰值 ≥70% 5.0%、压缩 4.2%、工具返回占比 ≥95% 15.4%、待办陈旧 10.0%、技能目录≥50 且 0 加载 1.7%。\n */\nconst SUGGESTION_RULES = {\n  /** 未恢复的失败链达到几条才值得提 */\n  UNRECOVERED_MIN: 3,\n  /** 工具返回占上下文（按字符估）达到此比例才算\"偏高\"（本机 P90=95.8%） */\n  TOOL_SHARE: 0.95,\n  /** 占比建议的最少调用数：太少时占比没有统计意义 */\n  TOOL_SHARE_MIN_CALLS: 10,\n  /** 上下文峰值占用达到此比例提醒接近上限 */\n  CTX_PEAK: 0.7,\n  /** 技能目录条目数达到此值且一条没加载才提 */\n  SKILL_UNUSED_MIN: 50,\n  /** 一次最多给几条建议（按价值排序取前几条） */\n  MAX: 5,\n}\n\n/**\n * 优化建议（诊断层第 6 项）：每条都引用本场实测的数字，并带涉及调用（点击可定位）。\n * 口径：只从已校准的尾部条件里挑，最多 `SUGGESTION_RULES.MAX` 条；没有就返回空数组（页面明说没有）。\n * @param lane 泳道（与行为信号同一形状，另读 `lane.context`）\n * @param wall 折叠坐标 → 墙钟秒（与页面同一函数）\n * @returns [{ key, severity, why: { k, p }, refs, count }]\n */\nfunction suggestions(lane, wall){\n  const out = []\n  const sigs = behaviorSignals(lane, wall)\n  const sigOf = t => sigs.find(x => x.type === t) ?? null\n  const calls = settledLaneCalls(lane)\n  const tools = calls.length\n  const oc = outcomeEvidence(lane, wall)\n  const chains = analyzeFailureChains(calls.map(c => ({ name: c.tl.name, args: c.tl.args ?? '', v: c.tl.v, s: c.tl.s, e: c.tl.e ?? null })))\n  const unrecovered = chains.filter(x => !x.recovered)\n\n  // 1) 失败后再没换策略：最有行动价值的一条（改法明确：要么换参数、要么承认失败）\n  if (unrecovered.length >= SUGGESTION_RULES.UNRECOVERED_MIN){\n    out.push({ key: 'unrecovered', severity: 'high',\n      why: { k: 'sugUnrecovered', p: [unrecovered.length, chains.length] },\n      refs: unrecovered.slice(0, 40).map(x => ({ n: calls[x.i].n, tl: calls[x.i].tl })), count: unrecovered.length })\n  }\n\n  // 2) 失败后原样重试（校准 16.7%）\n  const retry = sigOf('mechanicalRetry')\n  if (retry) out.push({ key: 'identicalRetry', severity: retry.severity, why: { k: 'sugIdenticalRetry', p: [retry.count] }, refs: retry.refs.slice(0, 40), count: retry.count })\n\n  // 3) 卡在循环里（13.8%）\n  const loop = sigOf('loop')\n  if (loop) out.push({ key: 'loop', severity: loop.severity, why: { k: 'sugLoop', p: [loop.count] }, refs: loop.refs.slice(0, 40), count: loop.count })\n\n  // 4) 写了文件但整场没有验证类命令（12.1%）\n  const anyVerify = !(oc.test.runs === 0 && oc.build.runs === 0 && oc.lint.runs === 0)\n  const wrote = oc.artifacts?.paths?.length ?? 0\n  if (!anyVerify && wrote > 0){\n    out.push({ key: 'wroteNoVerify', severity: 'high',\n      why: { k: 'sugWroteNoVerify', p: [wrote] },\n      refs: calls.filter(c => /write|edit|apply_patch/i.test(c.tl.name)).slice(0, 40).map(c => ({ n: c.n, tl: c.tl })), count: wrote })\n  }\n\n  // 5) 上下文接近窗口上限（5.0%）\n  const occ = contextOccupancy(lane)\n  if (occ.valid && occ.peakRatio >= SUGGESTION_RULES.CTX_PEAK){\n    out.push({ key: 'ctxPeak', severity: occ.peakRatio >= 0.9 ? 'high' : 'medium',\n      why: { k: 'sugCtxPeak', p: [Math.round(occ.peakRatio * 1000) / 10, occ.peakWin] },\n      refs: occ.peakNode ? [{ n: occ.peakNode, tl: null }] : [], count: 1 })\n  }\n\n  // 6) 上下文压缩（4.2%）：单场塞太多，或该把中间产物落盘\n  const comp = sigOf('compaction')\n  if (comp) out.push({ key: 'compaction', severity: comp.severity, why: { k: 'sugCompaction', p: [lane.compaction?.starts?.length ?? 0, lane.compaction?.prunes ?? 0] }, refs: comp.refs.slice(0, 40), count: comp.count })\n\n  // 7) 工具返回占上下文偏高（≥95%，15.4%）\n  const c = lane.context ?? {}\n  const compTotal = (c.tool ?? 0) + (c.user ?? 0) + (c.assistant ?? 0) + (c.sys ?? 0)\n  const toolShare = compTotal > 0 ? (c.tool ?? 0) / compTotal : 0\n  if (tools >= SUGGESTION_RULES.TOOL_SHARE_MIN_CALLS && toolShare >= SUGGESTION_RULES.TOOL_SHARE){\n    out.push({ key: 'toolHeavy', severity: 'info',\n      why: { k: 'sugToolHeavy', p: [Math.round(toolShare * 100), Math.round((c.tool ?? 0) / 1000)] },\n      refs: [], count: tools })\n  }\n\n  // 8) 同轮重复调用（18.3%）\n  const rep = sigOf('repeat')\n  if (rep) out.push({ key: 'sameTurnRepeats', severity: rep.severity, why: { k: 'sugSameTurnRepeats', p: [rep.count, tools > 0 ? Math.round(rep.count / tools * 100) : 0] }, refs: rep.refs.slice(0, 40), count: rep.count })\n\n  // 9) 待办陈旧（10.0%）\n  const todo = sigOf('todoStale')\n  if (todo) out.push({ key: 'todoStale', severity: todo.severity, why: { k: 'sugTodoStale', p: [lane.todoReminders ?? 0] }, refs: [], count: lane.todoReminders ?? 0 })\n\n  // 10) 技能目录大但一条没加载（1.7%）\n  if ((c.skills?.n ?? 0) >= SUGGESTION_RULES.SKILL_UNUSED_MIN && (c.loaded ?? []).length === 0){\n    out.push({ key: 'skillsUnused', severity: 'info',\n      why: { k: 'sugSkillsUnused', p: [c.skills.n, Math.round((c.skills.chars ?? 0) / 1000)] },\n      refs: [], count: 0 })\n  }\n\n  return out.slice(0, SUGGESTION_RULES.MAX)\n}\n\n\n/* 横轴映射（keepOriginals/restoreOriginals/applyStepMap/stepWallClock/foldWallClock）\n   构建期自 axis-map.js 注入——与 tests/axis-map.test.ts 共用同一份真相源。 */\n/**\n * 横轴映射：把节点时间换成「横轴坐标」。两种视图共用一套接口：\n *\n *   - `time`（默认）：空闲折叠——对话间的等待压成细缝（由页面里的 compressTimeline 建图）。\n *   - `step`：步序视图——每一步一列等宽，与墙钟时间解耦（issue #9）。\n *\n * 两种模式都先把原始时间备份到 `s0`/`e0`，因此可以随时来回切换，不必重新解析日志；\n * 任何用到「真实耗时」的地方一律读 `s0`/`e0`，不靠坐标反查（反查只服务播放时钟这类显示）。\n *\n * 这个模块是纯函数、不碰 DOM：tsdown 把它内联进 maze-upload.html 的 AXIS 占位符，\n * 同时 tests/axis-map.test.ts 直接 import 它——两条链路口径靠同一份源码保证。\n */\n\n/** 步序列宽：一列 1 个单位，条宽占 92%，留 8% 做列间距。 */\nconst STEP_WIDTH = 0.92\n\n/** 把每个节点/工具的原始时间备份到 s0/e0。已有备份不覆盖（切视图来回时不丢原始值）。 */\nfunction keepOriginals(data) {\n  for (const l of data.lanes) {\n    const c = l.compaction\n    if (c) {\n      if (c.starts0 === undefined) c.starts0 = (c.starts ?? []).slice()\n      if (c.pruneAt0 === undefined && c.pruneAt !== undefined) c.pruneAt0 = c.pruneAt.slice()\n    }\n    for (const arr of [l.main, l.detours]) {\n      for (const n of arr) {\n        if (n.s0 === undefined) n.s0 = n.s\n        if (n.e0 === undefined) n.e0 = n.e\n        if (!n.tools) continue\n        for (const tl of n.tools) {\n          if (tl.s == null) continue\n          if (tl.s0 === undefined) tl.s0 = tl.s\n          if (tl.e0 === undefined) tl.e0 = tl.e\n        }\n      }\n    }\n  }\n}\n\n/** 还原原始时间（含压缩事件时刻）。切视图前调用：映射永远从原始坐标出发，多次切换不累积误差。 */\nfunction restoreOriginals(data) {\n  for (const l of data.lanes) {\n    const c = l.compaction\n    if (c) {\n      if (c.starts0 !== undefined) c.starts = c.starts0.slice()\n      if (c.pruneAt0 !== undefined) c.pruneAt = c.pruneAt0.slice()\n    }\n    for (const arr of [l.main, l.detours]) {\n      for (const n of arr) {\n        if (n.s0 !== undefined) n.s = n.s0\n        if (n.e0 !== undefined) n.e = n.e0\n        if (!n.tools) continue\n        for (const tl of n.tools) {\n          if (tl.s0 !== undefined) tl.s = tl.s0\n          if (tl.e0 !== undefined) tl.e = tl.e0\n        }\n      }\n    }\n  }\n}\n\n/** 一条泳道的步骤（一步一个节点，主路径或支路），按步号升序。 */\nfunction laneSteps(lane) {\n  return [...lane.main, ...lane.detours].sort((a, b) => (a.step ?? 0) - (b.step ?? 0))\n}\n\n/** 列数 = 各泳道步数的最大值：对比模式下同一列就是各泳道的同一步，便于逐步对账。 */\nfunction stepColumnCount(lanes) {\n  let n = 0\n  for (const l of lanes) n = Math.max(n, l.main.length + l.detours.length)\n  return n\n}\n\n/**\n * 步序映射：第 k 步落在 `[k, k+1)`，所有步等宽；步内工具的先后与相对位置保留\n * （按原始时间在同一列内线性压缩）。返回挂在 `data.timeMap` 上的映射描述。\n */\nfunction applyStepMap(data) {\n  keepOriginals(data)\n  const unit = 1\n  const cols = []\n  for (const l of data.lanes) {\n    laneSteps(l).forEach((n, k) => {\n      const s0 = n.s0 ?? n.s\n      const e0 = Math.max(n.e0 ?? n.e, s0)\n      const real = Math.max(e0 - s0, 1e-6)\n      const cs = k * unit\n      const ce = cs + STEP_WIDTH\n      n.s = cs\n      n.e = ce\n      if (n.tools) {\n        for (const tl of n.tools) {\n          if (tl.s0 == null) continue\n          const ts = Math.min(1, Math.max(0, (tl.s0 - s0) / real))\n          const te = Math.min(1, Math.max(0, ((tl.e0 ?? tl.s0) - s0) / real))\n          tl.s = cs + ts * STEP_WIDTH\n          tl.e = cs + te * STEP_WIDTH\n        }\n      }\n      cols.push({ lane: l.key, step: n.step, cs, ce, realS: s0, realE: e0 })\n    })\n  }\n  // 压缩事件时刻跟着所在列走：落在第 k 步区间内的事件画到第 k 列（事件本身挂在两步之间的缝隙里时，\n  // 归到它前面那一步，和节点归属同一口径）。\n  for (const l of data.lanes) {\n    const c = l.compaction\n    if (!c) continue\n    const cols0 = laneSteps(l).map((n, k) => ({ s0: n.s0 ?? n.s, k }))\n    const colOf = t => {\n      let k = 0\n      for (const e of cols0) if (t >= e.s0) k = e.k\n      return k * unit\n    }\n    if (c.starts0) c.starts = c.starts0.map(colOf)\n    if (c.pruneAt0) c.pruneAt = c.pruneAt0.map(colOf)\n  }\n  const count = stepColumnCount(data.lanes)\n  data.Tmax = Math.max(count, 1) * unit\n  data.timeMap = { kind: 'step', unit, width: STEP_WIDTH, count, cols }\n  return data.timeMap\n}\n\n/**\n * 步序反查：轴坐标 → 墙钟秒。一列内按该列的真实起止线性插值；\n * 对比模式下一列有多个泳道的不同真实区间，取它们的并集（显示用近似值，\n * 需要精确耗时的地方请直接读节点的 s0/e0）。\n */\nfunction stepWallClock(t, map) {\n  const k = Math.min(map.count - 1, Math.max(0, Math.floor(t / map.unit)))\n  const cs = k * map.unit\n  const frac = Math.min(1, Math.max(0, (t - cs) / map.width))\n  let realS = Infinity\n  let realE = -Infinity\n  for (const c of map.cols) {\n    if (Math.abs(c.cs - cs) > 1e-9) continue\n    if (c.realS < realS) realS = c.realS\n    if (c.realE > realE) realE = c.realE\n  }\n  if (!isFinite(realS) || !isFinite(realE)) return t\n  return realS + (realE - realS) * frac\n}\n\n/** 折叠反查：折叠坐标 → 墙钟秒（原先页面里 wallClock 的逻辑，抽出来给两条映射共用）。 */\nfunction foldWallClock(t, map) {\n  const segs = map.segments\n  for (let i = segs.length - 1; i >= 0; i--) {\n    const g = segs[i]\n    if (t >= g.cs) return Math.min(g.re, g.rs + (t - g.cs))\n  }\n  return t\n}\n\n\nfunction buildData(fileTexts, fileNames){\n  const lanes = fileTexts.map((text, i) => {\n    const { rows, model, firstUser, turnEnds, userMsgs, compaction, todoReminders, ctxWindow, context, meta } = buildLane(text)\n    const fname = fileNames?.[i] ?? null\n    // 工具级判定已在 buildLane 的全文上完成；这里做跨步骤盲目重试簇标注（会改工具判定），再步级聚合\n    const allEvs = []\n    for (const r of rows) for (const ev of r.events) allEvs.push(ev)\n    markRetryClusters(allEvs)\n    const main = []\n    const detours = []\n    let lastMain = null\n    for (const r of rows){\n      // 请求级失败标记（llm/retry / turn/end error）：判定在解析时定死，直接落支路\n      if (r.evt){\n        detours.push({ step: r.step, turn: r.turn, s: r.s, e: r.e, tools: [], rz: 0, rzTxt: '', v: 'error', evt: r.evt, label: r.label, why: r.why, attach: lastMain ? lastMain.step : 0 })\n        continue\n      }\n      const sv = stepVerdict(r.events)\n      const v = sv === null ? 'answer' : sv.v\n      const node = { step: r.step, turn: r.turn, s: r.s, e: r.e, tools: r.events, rz: r.rz, rzTxt: r.rzTxt, rzTxtFull: r.rzTxtFull, rzTok: r.rzTok, outTok: r.outTok, inTok: r.inTok, cacheTok: r.cacheTok, ctxWin: r.ctxWin, v, why: sv === null ? { k: 'noTools' } : sv.why, why2: sv === null ? undefined : sv.why2 }\n      if (v === 'ok' || v === 'answer'){\n        main.push(node); lastMain = node\n      } else {\n        detours.push({ ...node, attach: lastMain ? lastMain.step : 0 })\n      }\n    }\n    // 全程失败的会话（只有失败标记、没有一步成型）也照画——空白比失败更误导\n    if (rows.length === 0) throw new Error(tr('errNoSteps'))\n    const tools = rows.reduce((n, r) => n + r.events.length, 0)\n    const rz = rows.reduce((n, r) => n + r.rz, 0)\n    const rzTok = rows.some(r => r.rzTok != null) ? rows.reduce((n, r) => n + (r.rzTok ?? 0), 0) : null\n    const outTok = rows.some(r => r.outTok != null) ? rows.reduce((n, r) => n + (r.outTok ?? 0), 0) : null\n    const T = Math.round(Math.max(...rows.map(r => r.e)) * 10) / 10\n    return { key: 'l' + (i + 1), model, fname, firstUser, rows, main, detours, turnEnds, userMsgs, compaction, todoReminders, ctxWindow, context, meta, preWindow: 0, stats: { steps: rows.length, tools, rz, rzTok, outTok, T, main: main.length, detours: detours.length } }\n  })\n  // 轴跨度贴合内容：短会话不再被 460s 固定下限压扁在左侧（×1.04 给右缘旗标留呼吸位）。\n  const Tmax = Math.round(Math.max(...lanes.map(l => l.stats.T), 10) * 1.04 * 10) / 10\n  // 同任务识别：全部文件首条用户消息一致 → 同一任务的多次跑，对比件（对齐线/锚点/盘点）启用。\n  // 判定与原因在 verdict.js 的 taskComparability（图例按 reason 说明为什么没启用）。\n  const sameTask = taskComparability(lanes.map(l => l.firstUser)).sameTask\n  return { Tmax, lanes, sameTask }\n}\n\n/* 轮次聚合（纯数据，对比模式的对齐线与支路盘点共用）。turn 缺失的旧日志统一记第 1 轮。 */\n\n/** 每轮支路聚合：Map(turn → { n, T, by:{error,retry,deadend} })。T 为墙钟秒——wall 把（可能折叠过的）坐标反查回墙钟，未折叠时传恒等函数。 */\nfunction turnDetourStats(lane){\n  const m = new Map()\n  for (const d of lane.detours){\n    const t = d.turn ?? 1\n    const g = m.get(t) ?? { n: 0, T: 0, by: { error: 0, retry: 0, deadend: 0 } }\n    g.n += 1\n    g.T += rawDur(d)\n    g.by[d.v] = (g.by[d.v] ?? 0) + 1\n    m.set(t, g)\n  }\n  return m\n}\n\n/** 每轮的收尾主干节点（该轮最后一个主干节点，即回答）：Map(turn → node)。main 按时间序，后者覆盖前者。 */\nfunction turnEndNodes(lane){\n  const m = new Map()\n  for (const n of lane.main) m.set(n.turn ?? 1, n)\n  return m\n}\n\n/** 每轮的起点时刻（主干与支路里该轮最早的节点开始）：Map(turn → s)。对齐线用它算\"本轮耗时\"。 */\nfunction turnStartTimes(lane){\n  const m = new Map()\n  for (const n of [...lane.main, ...lane.detours]){\n    const t = n.turn ?? 1\n    if (!m.has(t) || rawS(n) < m.get(t)) m.set(t, rawS(n))\n  }\n  return m\n}\n\n/** 各泳道出现过的轮次并集，升序。 */\nfunction unionTurns(lanes){\n  const s = new Set()\n  for (const l of lanes) for (const n of [...l.main, ...l.detours]) s.add(n.turn ?? 1)\n  return [...s].sort((a, b) => a - b)\n}\n\n/* ==================== 空闲折叠：对话间等待压成细缝 ==================== */\nconst IDLE_MIN = 60   // 无活动超过此秒数的区间视为等待，折叠显示\n\n/* 稀疏模式与轨道标注的观感阈值（按 703 调用/686 步的真实会话校准；换语料不顺眼先调这里）。 */\nconst SPARSE_RULES = {\n  /** 当前窗口可见步数超过此值进入稀疏模式（标签分级 / 细弧线 / 聚合徽标）。 */\n  VISIBLE_STEPS: 90,\n  /** 聚合徽标：支路中心点像素间距 ≤ 此值归为同一密集段。 */\n  CLUSTER_GAP_PX: 26,\n  /** 聚合徽标：一段至少这么多条支路才出徽标。 */\n  CLUSTER_MIN: 4,\n  /** 稀疏模式保留标签：失败/扑空/重试步的条宽 ≥ 此值（px）。 */\n  KEEP_FAIL_W: 14,\n  /** 稀疏模式保留标签：任意步的条宽 ≥ 此值（px，长步本身就是信号）。 */\n  KEEP_LONG_W: 70,\n  /** 上下文压缩标注：相邻样本降幅 ≥ 此比例才标「⌄−N%」（0.2 = 掉两成）。 */\n  CTX_DROP: 0.2,\n}\n\n/**\n * Collapse idle stretches (no step/tool activity in any lane) into thin seams.\n * Mutates node/tool times into compressed coordinates, sets data.Tmax to the\n * compressed span, and attaches data.timeMap { segments, gaps, seam } for the\n * axis and for wall-clock display. Durations and stats stay wall-clock.\n */\n/** 折叠映射：原始秒 → 折叠坐标。compressTimeline 建图时用，实时轻量延长（extendLive）也用它。 */\nfunction timeMapFn({ segments, seam }){\n  return t => {\n    if (t <= segments[0].rs) return segments[0].cs - (segments[0].rs - t)\n    for (let i = segments.length - 1; i >= 0; i--){\n      const g = segments[i]\n      if (t < g.rs) continue\n      if (t <= g.re) return g.cs + (t - g.rs)\n      const next = segments[i + 1]\n      const gapLen = next ? next.rs - g.re : 1\n      return g.cs + (g.re - g.rs) + Math.min(1, (t - g.re) / gapLen) * seam\n    }\n    return t\n  }\n}\n\n/** 有运行中节点时给时间轴留的余量（秒）：轻量延长在余量内只改节点，不动轴；用完再整图重画。 */\nfunction liveHeadroom(data){\n  const anyLive = data.lanes.some(l => l.main.some(n => n.live) || l.detours.some(n => n.live))\n  return anyLive ? Math.max(30, Math.round(data.Tmax * 0.08)) : 0\n}\n\nfunction compressTimeline(data){\n  const iv = []\n  for (const l of data.lanes){\n    for (const arr of [l.main, l.detours]){\n      for (const n of arr){\n        iv.push([n.s, Math.max(n.e, n.s)])\n        for (const tl of n.tools ?? []){\n          if (tl.s != null) iv.push([tl.s, Math.max(tl.e ?? tl.s, tl.s)])\n        }\n      }\n    }\n  }\n  data.timeMap = null\n  if (iv.length === 0) return\n  iv.sort((a, b) => a[0] - b[0])\n  const act = []\n  for (const [s, e] of iv){\n    const last = act[act.length - 1]\n    if (last && s <= last[1] + IDLE_MIN) last[1] = Math.max(last[1], e)\n    else act.push([s, e])\n  }\n  if (act.length <= 1) return\n  const active = act.reduce((n, [s, e]) => n + (e - s), 0)\n  const seam = Math.min(30, Math.max(1, Math.round(active * 0.015 * 10) / 10))\n  const segments = []\n  const gaps = []\n  let c = Math.min(act[0][0], IDLE_MIN)\n  for (let i = 0; i < act.length; i++){\n    const [rs, re] = act[i]\n    segments.push({ rs, re, cs: c })\n    c += re - rs\n    if (i < act.length - 1){\n      gaps.push({ c, skipped: act[i + 1][0] - re })\n      c += seam\n    }\n  }\n  const map = timeMapFn({ segments, seam })\n  const seen = new Set()\n  const remap = n => {\n    if (seen.has(n)) return\n    seen.add(n)\n    n.s = map(n.s)\n    n.e = map(n.e)\n    for (const tl of n.tools ?? []){\n      if (seen.has(tl)) continue\n      seen.add(tl)\n      if (tl.s != null) tl.s = map(tl.s)\n      if (tl.e != null) tl.e = map(tl.e)\n    }\n  }\n  for (const l of data.lanes){\n    l.main.forEach(remap)\n    l.detours.forEach(remap)\n    // 压缩事件时刻跟着折叠坐标走（诊断层第 3 项：真事件要画在轨道上的正确位置）\n    const cp = l.compaction\n    if (cp){\n      cp.starts = (cp.starts0 ?? cp.starts).map(map)\n      if (cp.pruneAt) cp.pruneAt = (cp.pruneAt0 ?? cp.pruneAt).map(map)\n    }\n  }\n  data.Tmax = Math.max(c, 60)\n  data.timeMap = { segments, gaps, seam }\n}\n\n/** 轴坐标 → 墙钟秒（播放时钟这类显示用）。两种映射分别反查；要精确耗时请直接读节点的 s0/e0。 */\nfunction wallClock(t){\n  if (!DATA || !DATA.timeMap) return t\n  return DATA.timeMap.kind === 'step' ? stepWallClock(t, DATA.timeMap) : foldWallClock(t, DATA.timeMap)\n}\n\n/* ==================== 横轴视图：时间（空闲折叠）/ 步序 ==================== */\n/*\n * 时间视图解决\"整段挂起横贯一屏\"，但对\"一分钟里跑二十步\"这类会话仍然只能看出相对宽窄；\n * 步序视图（issue #9）把每一步压成一列等宽，与墙钟解耦——对比模式下同一列就是各泳道的同一步。\n * 两个视图都从原始时间重新映射，随时切换不会累积误差；真实耗时的显示一律读 s0/e0。\n */\nlet AXIS_MODE = 'time'   // 'time' | 'step'\n\n/** 按当前视图把节点时间映射到轴坐标：先还原原始时间，再套该视图的映射。 */\nfunction applyAxisMap(data){\n  keepOriginals(data)\n  restoreOriginals(data)\n  if (AXIS_MODE === 'step'){\n    applyStepMap(data)\n    return\n  }\n  compressTimeline(data)\n}\n\n/** 真实时间读数（原始墙钟秒）：映射只改 s/e，时刻与耗时的显示一律读 s0/e0。 */\nconst rawS = o => o.s0 ?? o.s\nconst rawE = o => o.e0 ?? o.e ?? o.s\nconst rawDur = o => Math.max(0, rawE(o) - rawS(o))\n\n/** 切换横轴视图：重置缩放（旧窗口是上一套坐标），重画整图与图例。 */\nfunction setAxisMode(mode){\n  if (mode === AXIS_MODE) return\n  AXIS_MODE = mode\n  const btn = document.getElementById('btnAxis')\n  if (btn){\n    btn.classList.toggle('on', mode === 'step')\n    btn.textContent = tr(mode === 'step' ? 'axisStep' : 'axisTime')\n    btn.title = tr(mode === 'step' ? 'axisStepTitle' : 'axisTimeTitle')\n  }\n  if (!DATA) return\n  applyAxisMap(DATA)\n  TMAX = DATA.Tmax + liveHeadroom(DATA)\n  VIEW = null\n  renderLegend()\n  renderMetaStrip()\n  queueBuild()\n}\n\n/* ============================ 布局 ============================ */\nconst X0 = 56, AXIS_W = 1500\n// 缩放窗口：VIEW=null 显示整图；否则 [t0,t1]（折叠后坐标）。x() 把时间映射进当前窗口。\nlet VIEW = null\nconst viewT0 = () => VIEW ? VIEW.t0 : 0\nconst viewSpan = () => VIEW ? VIEW.t1 - VIEW.t0 : TMAX\nconst x = t => X0 + (t - viewT0()) / viewSpan() * AXIS_W\nlet TMAX = 460\nlet LAYOUT = {}\nlet LANE_GAP = 40\nlet tracksOn = true   // 数据轨道开关（📊 轨道按钮），关掉即回到纯迷宫布局\n\n/**\n * 该泳道的数据轨道规格：工具调用密度恒在；Token 脉冲与上下文压力只在日志真有\n * usage 数据时出现（没有就不画，不占高度——诚实规则：不画没有数据支撑的轨道）。\n * 子代理聚合节点的 token 不进父泳道轨道（那是子代理自己上下文窗口里的量）。\n */\nfunction laneTrackSpec(l){\n  if (!tracksOn) return { h: 0, dens: 0, tok: 0, ctx: 0 }\n  const own = [...l.main, ...l.detours].filter(n => !n.sub)\n  const hasTok = own.some(n => n.inTok != null || n.outTok != null || n.rzTok != null)\n  const hasCtx = own.some(n => n.inTok != null || n.cacheTok != null)\n  // 高度按数据密度给足：轨道是数据主角，不是脚注（空间来自泳道内空转区的收紧）。\n  // 每条轨道自带 16px 标题行（名称 + 行内图例 + 峰值标注），内容区在其下。\n  const dens = 40, tok = hasTok ? 92 : 0, ctx = hasCtx ? 100 : 0\n  return { h: dens + tok + ctx + 8, dens, tok, ctx }\n}\n\nfunction computeLayout(lanes){\n  // Lane geometry grows with the packed slot count from assignLanes (not the\n  // raw detour count) so no curve can leave the canvas: mainY sits below the\n  // band header plus all up-detour slots, regionBottom clears all down-detour\n  // slots plus the data-track zone, and the next lane starts below that.\n  // parH reserves the parallel-tool sub-bar zone directly under the main path\n  // (one 9px row per concurrent call); down-detour slots and below-row labels\n  // shift past it.\n  const layout = {}\n  let regionTop = 30\n  lanes.forEach(l => {\n    const up = l._slotsUp ?? 0\n    const down = l._slotsDown ?? 0\n    const maxPar = Math.max(0, ...l.main.map(n => n.tools.length >= 2 ? n.tools.length : 0))\n    const parH = maxPar > 0 ? maxPar * 9 + 8 : 0\n    const trk = laneTrackSpec(l)\n    // 空间收紧（2026-08-26 对照实测）：没有上方支路时泳道头到主干曾固定空转 82px，\n    // 收到 58（节点上方标签仍让过 30px 带头）；主干到轨道 44→36（正好放下下方标签行）；\n    // 轨道底垫 12→8。省出的高度全部给了加高后的轨道。\n    const mainY = regionTop + (up > 0 ? 34 + up * LANE_GAP + 48 : 58)\n    const trackTop = mainY + parH + down * LANE_GAP + 36\n    const regionBottom = trackTop + trk.h + (trk.h > 0 ? 8 : 14)\n    layout[l.key] = { top: regionTop + 24, mainY, up, down, parH, regionTop, regionBottom, trk, trackTop }\n    regionTop = regionBottom + 66\n  })\n  return layout\n}\n\n/* ============================ 渲染 ============================ */\nconst svg = document.getElementById('svg')\nconst svgScrollEl = document.getElementById('svgscroll')\nconst svgWrapEl = document.getElementById('svgwrap')\nconst NS = 'http://www.w3.org/2000/svg'\n\n/* ==================== 画布适配：整图 fit ↔ 宽度铺满 + 纵向滚动 ====================\n   viewBox + meet fit 在内容偏高时被高度卡死：1560×1889 塞进 1230×450 只有 0.24×，\n   节点文字糊成一片、七成画布留白。缩放跌破可读下限时改为按宽度铺满（时间轴是语义\n   主轴，必须占满宽度），泳道方向交给纵向滚动。 */\nconst FIT_FLOOR = 0.5   // 整图 fit 缩放低于此值时 11px 标签实际不足 5.5px\nconst axisBarEl = document.getElementById('axisbar')\nconst tickLabels = []   // build 期记下的刻度文字，供钉住的轴条复用\n\nfunction applyFit(){\n  if (!DATA) return\n  const w = svgScrollEl.clientWidth\n  let h = svgScrollEl.clientHeight\n  if (w === 0 || h === 0) return\n  // 信箱留白收编：内容缩放后比容器矮时，容器高度贴内容（页面纵向可滚，矮下来把\n  // 分析区顶上来，不再上下各空一条）。dataset.fullH 记住 CSS 期望高度供放大时恢复。\n  if (!svgWrapEl.style.height) svgWrapEl.dataset.fullH = String(h)\n  const fullH = Number(svgWrapEl.dataset.fullH || h)\n  const natural = Math.ceil(DATA.viewH * (w / 1560)) + 6\n  const target = Math.min(fullH, Math.max(280, natural))\n  if (Math.abs(svgWrapEl.clientHeight - target) > 4){\n    svgWrapEl.style.height = target + 'px'\n    h = target\n  }\n  const scroll = Math.min(w / 1560, h / DATA.viewH) < FIT_FLOOR\n  svgWrapEl.classList.toggle('scroll', scroll)\n  svg.style.height = scroll ? Math.round(DATA.viewH * w / 1560) + 'px' : '100%'\n  // 整图模式纵向居中；滚动模式必须顶对齐，否则滚动内容会被挤出容器\n  svg.setAttribute('preserveAspectRatio', scroll ? 'xMidYMin meet' : 'xMidYMid meet')\n  axisBarEl.style.height = Math.round(20 * w / 1560) + 'px'\n  if (scroll) renderAxisBar()\n  updateZoomHint()\n}\n\n/** 钉住轴条：按 build 记下的刻度重画一份（与主 SVG 同一 x 映射，宽度比例一致）。 */\nfunction renderAxisBar(){\n  while (axisBarEl.firstChild) axisBarEl.removeChild(axisBarEl.firstChild)\n  for (const t of tickLabels){\n    const tx = el('text', { x: t.x, y: 14, 'text-anchor': 'middle', class: t.cls })\n    if (t.fill) tx.setAttribute('fill', t.fill)\n    tx.textContent = t.text\n    axisBarEl.appendChild(tx)\n  }\n}\n\n/** 操作提示随适配模式走：滚动模式下普通滚轮归纵向滚动，缩放让给 ⌘/Ctrl+滚轮。 */\nfunction updateZoomHint(){\n  const el = document.querySelector('.zoomhint')\n  if (el) el.textContent = svgWrapEl.classList.contains('scroll') ? tr('zoomhintScroll') : tr('zoomhint')\n}\n\n// 容器尺寸变化只需重算适配（支路装箱走 viewBox 单位，与像素宽度无关）\nif (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => applyFit()).observe(svgScrollEl)\nconst MAX_LANES = 5\nconst MAIN_COLOR = { l1: '#2d6a8f', l2: '#a06a35', l3: '#6d55a3', l4: '#2f7d5f', l5: '#a04b62' }\nconst LANEC = []   // 每条泳道的成套颜色 {main,title,bg,edge,head}，readPalette 按主题填充\nconst VCOLOR = { error: '#c0453f', deadend: '#98a1ad', retry: '#88919f', ok: '#3f7d55', answer: '#3f7d55' }\nconst laneIdx = key => Number(key.slice(1)) - 1\n\n/* ==================== 主题：CSS 变量单真相源，SVG 属性色经 readPalette 取值 ==================== */\nlet THEME = 'light'\nconst SVGC = {}   // build 期使用的 SVG 属性色（文本 fill 走 CSS 类，不经此处）\n\n/** 从当前主题的 CSS 变量读入全部 SVG 属性色（含 MAIN_COLOR/LANEC/VCOLOR），build 前调用。 */\nfunction readPalette(){\n  const cs = getComputedStyle(document.documentElement)\n  const v = n => cs.getPropertyValue(n).trim()\n  LANEC.length = 0\n  for (let i = 1; i <= MAX_LANES; i++){\n    LANEC.push({ main: v(`--lane${i}-main`), title: v(`--lane${i}-title`), bg: v(`--lane${i}-bg`), edge: v(`--lane${i}-edge`), head: v(`--lane${i}-head`) })\n    MAIN_COLOR['l' + i] = LANEC[i - 1].main\n  }\n  VCOLOR.error = v('--err'); VCOLOR.deadend = v('--dead'); VCOLOR.retry = v('--retry')\n  VCOLOR.ok = v('--ans'); VCOLOR.answer = v('--ans')\n  SVGC.nodeline = v('--nodeline')\n  SVGC.grid = v('--grid'); SVGC.seam = v('--seam'); SVGC.seamEdge = v('--seam-edge'); SVGC.seamTxt = v('--seam-txt')\n  SVGC.turnSep = v('--turnsep'); SVGC.turnSepTxt = v('--turnsep-txt'); SVGC.back = v('--backarc')\n  SVGC.milestone = v('--milestone')\n  // 数据轨道用色：工具类别 5 色 + Token 脉冲堆叠 4 色 + 上下文压力曲线/阈值\n  SVGC.cat = { read: v('--read'), search: v('--grep'), shell: v('--bash'), edit: v('--web'), other: v('--other') }\n  SVGC.tokCache = v('--tok-cache'); SVGC.tokIn = v('--tok-in'); SVGC.tokRz = v('--tok-rz'); SVGC.tokOut = v('--tok-out')\n  SVGC.ctxLine = v('--ctx-line'); SVGC.ctxFill = v('--ctx-fill'); SVGC.ctxWarn = v('--ctx-warn'); SVGC.ctxCrit = v('--ctx-crit')\n  SVGC.turnBand = v('--turnband'); SVGC.panel = v('--panel')\n}\n\n/**\n * 泳道的上下文窗口（带健全性守卫）：CONTEXT_WINDOWS 表匹配之上，若观测到的\n * 上下文峰值超过表值，说明表对该模型已过时——此时退回 null（绝对值显示），\n * 绝不显示超过 100% 的占用（诚实规则：表可能错，观测不会）。\n */\nfunction laneWindow(model, peak){\n  const w = contextWindowFor(model)\n  return w != null && peak > w ? null : w\n}\n\n/** 轨道用的工具类别：读取 / 检索 / 命令 / 编辑 / 其他（决定密度轨道刻线颜色）。 */\nfunction toolCat(name){\n  if (name === 'read' || name === 'read_image') return 'read'\n  if (name === 'grep' || name === 'web_search' || name === 'glob' || name === 'find') return 'search'\n  if (name === 'bash' || name === 'python3' || name === 'curl' || name === 'run_code' || name === 'node') return 'shell'\n  if (name === 'write' || name === 'edit' || name === 'todo_write') return 'edit'\n  return 'other'\n}\n\n/**\n * 切换主题：置根元素 data-theme + colorScheme（原生控件跟随），重读调色板并全量重建。\n * mode 非 'dark' 一律按 'light'；force 用于导出时的临时切换（同值也重建）。\n */\nfunction setTheme(mode, force){\n  mode = mode === 'dark' ? 'dark' : 'light'\n  if (mode === THEME && !force) return\n  THEME = mode\n  if (mode === 'dark') document.documentElement.setAttribute('data-theme', 'dark')\n  else document.documentElement.removeAttribute('data-theme')\n  document.documentElement.style.colorScheme = mode\n  readPalette()\n  if (DATA){ build(); render() }\n}\nconst TOOL_LABEL = { bash: 'bash', grep: 'grep', read: 'read', web_search: 'web', python3: 'python', curl: 'curl' }\nconst tlabel = n => TOOL_LABEL[n] ?? n\nconst vlabel = v => ({ error: tr('vError'), deadend: tr('vDead'), retry: tr('vRetry'), ok: tr('vOk'), answer: tr('vAnswer') }[v] ?? v)\nconst laneName = lane => DATA.lanes.length === 1 ? tr('laneCur') : tr('laneN')(laneIdx(lane.key) + 1)\n\n/** 对比件开关：≥2 条泳道且识别为同一任务的多次跑（buildData 的 sameTask）。 */\nconst cmpOn = () => DATA != null && DATA.lanes.length >= 2 && DATA.sameTask === true\n\n/** Rebuild the legend from the rendered data: lane entries, then verdict swatches. */\nfunction renderLegend(){\n  const lg = []\n  if (DATA.lanes.length === 1){\n    const m = DATA.lanes[0].model\n    lg.push(`<span class=\"lg\"><span class=\"ln\" style=\"border-color:${LANEC[0].main}\"></span>${tr('lgMain')(esc(m ?? ''))}</span>`)\n  } else {\n    DATA.lanes.forEach((l, i) => {\n      lg.push(`<span class=\"lg\"><span class=\"ln\" style=\"border-color:${LANEC[i]?.main ?? LANEC[0].main}\"></span>${tr('lgMainN')(i + 1, esc(l.model ?? ''))}</span>`)\n    })\n  }\n  lg.push(`<span class=\"lg\" title=\"${tr('lgOutTitle')}\"><span class=\"ln dt\"></span>${tr('lgOut')}</span>`)\n  lg.push(`<span class=\"lg\" title=\"${tr('lgBackTitle')}\"><span class=\"ln bk\"></span>${tr('lgBack')}</span>`)\n  lg.push(`<span class=\"lg\"><span class=\"sw er\"></span>${tr('vError')}</span>`)\n  lg.push(`<span class=\"lg\"><span class=\"sw de\"></span>${tr('vDead')}</span>`)\n  lg.push(`<span class=\"lg\"><span class=\"sw rt\"></span>${tr('vRetry')}</span>`)\n  lg.push(`<span class=\"lg\"><span class=\"sw an\"></span>${tr('lgAnswer')}</span>`)\n  if (DATA.timeMap && DATA.timeMap.kind === 'step') lg.push(`<span class=\"lg\" title=\"${tr('lgStepTitle')}\">${tr('lgStep')}</span>`)\n  else if (DATA.timeMap) lg.push(`<span class=\"lg\">${tr('lgIdle')}</span>`)\n  // 压缩标注的口径进图例（诊断层第 3 项）：真事件按事件时刻画，旧日志退回骤降推断并写明是推断\n  const anyReal = DATA.lanes.some(l => (l.compaction?.starts?.length ?? 0) > 0)\n  const anyPrune = DATA.lanes.some(l => (l.compaction?.pruneAt?.length ?? 0) > 0)\n  if (anyReal){\n    lg.push(`<span class=\"lg\" title=\"${tr('lgCompactRealTitle')}\">${tr('lgCompactReal')}</span>`)\n  } else if (DATA.lanes.some(l => {\n    const occ = contextOccupancy(l)\n    return occ.samples.some((sm, i, arr) => i > 0 && arr[i - 1].tok > 0 && sm.tok < arr[i - 1].tok * (1 - SPARSE_RULES.CTX_DROP))\n  })){\n    lg.push(`<span class=\"lg\" title=\"${tr('lgCompactGuessTitle')}\">${tr('lgCompactGuess')}</span>`)\n  }\n  if (anyPrune) lg.push(`<span class=\"lg\" title=\"${tr('lgPruneTitle')}\">${tr('lgPruneMarks')}</span>`)\n  if (cmpOn()){\n    lg.push(`<span class=\"lg\" title=\"${tr('lgSameTaskTitle')}\">${tr('lgSameTask')(DATA.lanes.length)}</span>`)\n    lg.push(`<span class=\"lg\" title=\"${tr('lgAlignTitle')}\"><span class=\"sw ms\"></span>${tr('lgAlign')}</span>`)\n    lg.push(`<span class=\"lg\" title=\"${tr('lgAnchorTitle')}\"><span class=\"sw anc\"></span>${tr('lgAnchor')}</span>`)\n  } else if (DATA.lanes.length >= 2){\n    // 图例要说真话：缺首条用户消息时不是「任务不同」，是「没法判定」——原因由 taskComparability 给出\n    const noFu = taskComparability(DATA.lanes.map(l => l.firstUser ?? '')).reason === 'no-first-user'\n    lg.push(`<span class=\"lg\" title=\"${tr(noFu ? 'lgNoFirstUserTitle' : 'lgDiffTaskTitle')}\">${tr(noFu ? 'lgNoFirstUser' : 'lgDiffTask')}</span>`)\n  }\n  document.getElementById('legend').innerHTML = lg.join('')\n}\n\nfunction el(name, attrs){\n  const n = document.createElementNS(NS, name)\n  for (const k in attrs) n.setAttribute(k, attrs[k])\n  return n\n}\n\nconst pathEls = []\nconst nodeEls = []\nconst markEls = []\nconst msEls = []\nconst labRows = {}\nconst wEst = s => s.length * 5.9 + 6\n\n/**\n * Greedy interval packing of detours into vertical slots: a slot is reusable\n * once its previous occupant's full horizontal footprint — out-arc from the\n * attach point, bar, back-arc bulge, below-bar label — has cleared a safety\n * gap, in current-window pixel coordinates. Long sessions collapse from\n * one-slot-per-detour to max-concurrent-overlap, so viewH stays flat instead\n * of shrinking the whole maze into a sliver. First-choice side still\n * alternates below/above by detour index to keep the familiar look when\n * slots are free. Runs per build (footprints depend on the zoom window);\n * computeLayout then sizes the band from _slotsUp/_slotsDown, and _y is\n * assigned afterwards by assignDetourY.\n */\nfunction assignLanes(lane){\n  const downEnd = [], upEnd = []   // per-slot rightmost occupied x\n  const GAPX = 26\n  lane.detours.forEach((d, i) => {\n    const attach = lane.main.find(n => n.step === d.attach)\n    const ax = x(attach ? attach.e : d.s)\n    const left = Math.min(ax, x(d.s)) - 8\n    // 右边界盖住三样：回程弧右鼓包(x(e)+~30)、出程弧控制点(ax+90 的贝塞尔实际最右\n    // 不超 ax+~70)、条形中点下方的标签(可能带工具后缀,多留 30)。\n    const labelHalf = wEst(nodeLabel(d)) / 2 + 30\n    const right = Math.max(x(d.e) + 34, ax + 70, (x(d.s) + x(d.e)) / 2 + labelHalf)\n    for (let k = 0; ; k++){\n      const useDown = (k + i) % 2 === 0\n      const arr = useDown ? downEnd : upEnd\n      const s = Math.floor(k / 2)\n      if (arr[s] === undefined || arr[s] + GAPX <= left){\n        arr[s] = right\n        d._lane = useDown ? s + 1 : -(s + 1)\n        break\n      }\n    }\n  })\n  lane._slotsDown = downEnd.length\n  lane._slotsUp = upEnd.length\n}\n\n/** 支路 y 定位：槽位 × 槽距；主干下方槽让过并行分行区。须在 computeLayout 之后调用。 */\nfunction assignDetourY(lane){\n  const lay = LAYOUT[lane.key]\n  lane.detours.forEach(d => {\n    d._y = lay.mainY + d._lane * LANE_GAP + (d._lane > 0 ? lay.parH : 0)\n  })\n}\n\n/** Element horizontal-visibility cull for the zoom window (generous margin keeps arcs whole). */\nconst xVisible = (s, e) => x(Math.max(e, s)) >= X0 - 60 && x(Math.min(s, e)) <= X0 + AXIS_W + 60\n\nfunction build(){\n  // 全量重建会移除悬停中的节点，mouseleave 永远不会来——悬停卡随重建一并收掉，\n  // 否则锚点第二击、缩放等触发重建后 tooltip 残留在画面上直到下次悬停。\n  document.getElementById('tip').style.display = 'none'\n  hoverDet = null\n  while (svg.firstChild) svg.removeChild(svg.firstChild)\n  pathEls.length = 0; nodeEls.length = 0; markEls.length = 0; msEls.length = 0\n  for (const k of Object.keys(labRows)) delete labRows[k]\n  // 装箱 → 布局 → 画布高度全按当前缩放窗口重算：整图态支路密集共用少数槽位,\n  // 放大到局部后同批支路自动重新摊开。\n  DATA.lanes.forEach(assignLanes)\n  LAYOUT = computeLayout(DATA.lanes)\n  DATA.viewH = Math.max(...DATA.lanes.map(l => LAYOUT[l.key].regionBottom)) + 30\n  DATA.lanes.forEach(assignDetourY)\n  svg.setAttribute('viewBox', `0 0 1560 ${DATA.viewH}`)\n\n  const defs = el('defs', {})\n  defs.appendChild(el('marker', { id: 'arr', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }))\n      .appendChild(el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: SVGC.back }))\n  defs.appendChild(el('clipPath', { id: 'clipTime' }))\n      .appendChild(el('rect', { x: X0 - 14, y: 0, width: AXIS_W + 28, height: DATA.viewH }))\n  svg.appendChild(defs)\n\n  // Paint order: clipped tick layer under the static lane chrome, clipped time\n  // content above it — zoomed-out-of-window geometry can never smear the page.\n  const gTicks = svg.appendChild(el('g', { 'clip-path': 'url(#clipTime)' }))\n  const gStatic = svg.appendChild(el('g', {}))\n  const gTime = svg.appendChild(el('g', { 'clip-path': 'url(#clipTime)' }))\n\n  const TS = tickStep(viewSpan())\n  // Sub-minute tick steps need second precision: fmtT alone renders every\n  // deep-zoom label as the same \"3m\".\n  // 轴标签精度跟着刻度步长走：fmtT 对 ≥10h 只留整数，14h 跨度里连着六枚刻度都写成\n  // \"13h\"，等于没标。步长小于 1h 时保留一位小数。\n  const axisLab = rt => {\n    if (rt >= 3600) return (rt / 3600).toFixed(TS >= 3600 ? 0 : 1) + 'h'\n    if (rt >= 120) return Math.round(rt / 60) + 'm'\n    return (Math.round(rt * 10) / 10) + 's'\n  }\n  const tickLab = TS < 60\n    ? rt => rt >= 120 ? Math.floor(rt / 60) + 'm' + String(Math.round(rt % 60)).padStart(2, '0') + 's' : fmtT(rt)\n    : axisLab\n  // 折叠时间轴上刻度按活动段分别铺，段与段的标签会撞在一起（实测轴头糊成\n  // \"59m1.6m 2m 110s\"）。逐个记录上一枚标签的右缘，装不下就只画栅格线不画字。\n  let tickLabRight = -1e9\n  tickLabels.length = 0\n  const drawTick = (cx, label, big) => {\n    if (cx < X0 - 20 || cx > X0 + AXIS_W + 20) return\n    const g = el('g', {})\n    g.appendChild(el('line', { x1: cx, y1: 0, x2: cx, y2: DATA.viewH, stroke: SVGC.grid, 'stroke-width': big ? 1 : 0.5 }))\n    // Fine steps label only the big ticks: \"12m14s\"-wide labels on every tick overlap.\n    const half = label.length * 3 + 3\n    if ((TS >= 60 || big) && cx - half >= tickLabRight + 6){\n      const tx = el('text', { x: cx, y: 14, 'text-anchor': 'middle', class: big ? 'tick big' : 'tick' })\n      tx.textContent = label\n      g.appendChild(tx)\n      tickLabels.push({ x: cx, text: label, cls: big ? 'tick big' : 'tick' })\n      tickLabRight = cx + half\n    }\n    gTicks.appendChild(g)\n  }\n  if (DATA.timeMap && DATA.timeMap.kind === 'step'){\n    // 步序视图：每列一步，等宽；列头标步序号，悬停给该步的真实起止与耗时。\n    let lastLab = -1e9\n    const U = DATA.timeMap.unit\n    for (let k = 0; k < DATA.timeMap.count; k++){\n      const cx = x(k * U)\n      if (cx < X0 - 20 || cx > X0 + AXIS_W + 20) continue\n      const g = el('g', {})\n      g.appendChild(el('line', { x1: cx, y1: 0, x2: cx, y2: DATA.viewH, stroke: SVGC.grid, 'stroke-width': k % 5 === 0 ? 1 : 0.5 }))\n      const col = DATA.timeMap.cols.filter(c => Math.abs(c.cs - k * U) < 1e-9)\n      if (col.length){\n        const realS = Math.min(...col.map(c => c.realS))\n        const realE = Math.max(...col.map(c => c.realE))\n        const tip = el('title', {})\n        tip.textContent = `S${k + 1} · ${fmtT(realS)} → ${fmtT(realE)}（${fmtT(realE - realS)}）`\n        g.appendChild(tip)\n      }\n      const label = 'S' + (k + 1)\n      const half = label.length * 3 + 3\n      if (cx - half >= lastLab + 6){\n        const tx = el('text', { x: cx, y: 14, 'text-anchor': 'middle', class: k % 5 === 0 ? 'tick big' : 'tick' })\n        tx.textContent = label\n        g.appendChild(tx)\n        tickLabels.push({ x: cx, text: label, cls: k % 5 === 0 ? 'tick big' : 'tick' })\n        lastLab = cx + half\n      }\n      gTicks.appendChild(g)\n    }\n  } else if (DATA.timeMap){\n    // Ticks live inside activity segments and carry wall-clock labels; each\n    // collapsed idle gap renders as a hatched seam labeled with the skipped time.\n    for (const seg of DATA.timeMap.segments){\n      for (let rt = Math.ceil(seg.rs / TS) * TS; rt <= seg.re + 0.001; rt += TS){\n        drawTick(x(seg.cs + (rt - seg.rs)), tickLab(rt), (rt / TS) % 2 === 0)\n      }\n    }\n    for (const gp of DATA.timeMap.gaps){\n      if (!xVisible(gp.c, gp.c + DATA.timeMap.seam)) continue\n      const x0 = x(gp.c), x1 = x(gp.c + DATA.timeMap.seam)\n      gTicks.appendChild(el('rect', { x: x0, y: 0, width: Math.max(x1 - x0, 3), height: DATA.viewH, fill: SVGC.seam, opacity: 0.85 }))\n      gTicks.appendChild(el('line', { x1: x0, y1: 0, x2: x0, y2: DATA.viewH, stroke: SVGC.seamEdge, 'stroke-dasharray': '3 4' }))\n      gTicks.appendChild(el('line', { x1: x1, y1: 0, x2: x1, y2: DATA.viewH, stroke: SVGC.seamEdge, 'stroke-dasharray': '3 4' }))\n      const lbTxt = '⏸ ' + fmtT(gp.skipped)\n      const lbHalf = lbTxt.length * 3 + 3\n      const lbX = (x0 + x1) / 2\n      if (lbX - lbHalf >= tickLabRight + 6){\n        const lb = el('text', { x: lbX, y: 14, 'text-anchor': 'middle', class: 'tick big', fill: SVGC.seamTxt })\n        lb.textContent = lbTxt\n        gTicks.appendChild(lb)\n        tickLabels.push({ x: lbX, text: lbTxt, cls: 'tick big', fill: SVGC.seamTxt })\n        tickLabRight = lbX + lbHalf\n      }\n    }\n  } else {\n    for (let t = 0; t <= TMAX + 0.001; t += TS){\n      drawTick(x(t), tickLab(t), (t / TS) % 2 === 0)\n    }\n  }\n\n  // 轮次对齐线（同任务对比）：每一轮取各泳道的回答节点，相邻泳道两两连线成跨泳道链，\n  // 标注各自\"本轮耗时\"（该轮起点 → 回答完成，墙钟计；轮与轮之间等用户输入的空闲不计入）。\n  // 只连该轮出现在 ≥2 条泳道的轮次；缺席的泳道交给支路盘点面板呈现（缺席本身就是信号）。\n  if (cmpOn()){\n    const ends = DATA.lanes.map(turnEndNodes)\n    const starts = DATA.lanes.map(turnStartTimes)\n    const dets = DATA.lanes.map(l => turnDetourStats(l))\n    for (const turn of unionTurns(DATA.lanes)){\n      const pts = []\n      DATA.lanes.forEach((l, i) => {\n        const n = ends[i].get(turn)\n        if (n) pts.push({ i, key: l.key, n, y: LAYOUT[l.key].mainY })\n      })\n      if (pts.length < 2) continue\n      const es = pts.map(p => p.n.e)\n      if (!xVisible(Math.min(...es), Math.max(...es))) continue\n      const g = el('g', {})\n      for (let k = 0; k + 1 < pts.length; k++){\n        g.appendChild(el('line', { x1: x(pts[k].n.e), y1: pts[k].y, x2: x(pts[k + 1].n.e), y2: pts[k + 1].y, class: 'msline' }))\n      }\n      for (const p of pts){\n        const f = el('text', { x: x(p.n.e) + 6, y: p.y - 6, class: 'mk-flag', fill: MAIN_COLOR[p.key] }); f.textContent = '⚑'\n        g.appendChild(f)\n        g.appendChild(el('circle', { cx: x(p.n.e), cy: p.y, r: 12, fill: 'none', stroke: SVGC.milestone, 'stroke-width': 2 }))\n      }\n      const per = pts.map(p => fmtT(rawE(p.n) - (starts[p.i].get(turn) ?? rawS(p.n))))\n      const lab = el('text', { x: (x(pts[0].n.e) + x(pts[1].n.e)) / 2, y: (pts[0].y + pts[1].y) / 2 - 8, 'text-anchor': 'middle', class: 'mslabel' })\n      if (pts.length === 2){\n        const [wa, wb] = [rawE(pts[0].n) - (starts[pts[0].i].get(turn) ?? rawS(pts[0].n)), rawE(pts[1].n) - (starts[pts[1].i].get(turn) ?? rawS(pts[1].n))]\n        const dA = dets[pts[0].i].get(turn), dB = dets[pts[1].i].get(turn)\n        lab.textContent = tr('alignLabel')(turn, per[0], per[1], fmtT(Math.abs(wb - wa)))\n          + ((dA?.n ?? 0) + (dB?.n ?? 0) > 0 ? tr('alignDet')(dA?.n ?? 0, dB?.n ?? 0) : '')\n      } else {\n        lab.textContent = tr('alignLabelN')(turn, per.join(' | '))\n      }\n      g.appendChild(lab)\n      msEls.push({ el: g, s: Math.max(...es) })\n      gTime.appendChild(g)\n    }\n  }\n\n  DATA.lanes.forEach((lane, li) => {\n    const lay = LAYOUT[lane.key]\n    const mainC = MAIN_COLOR[lane.key]\n    // 泳道带底色随主题走调色板（readPalette 填 LANEC 成套色），按泳道索引取\n    const lc = LANEC[li] ?? LANEC[0]\n    // 稀疏模式：当前窗口内可见步数超过阈值时启用——标签只留要紧的（失败/回答/长步/子代理）、\n    // 支路弧线变细、密集支路收聚合徽标。放大后自动退出，标签逐级补齐。阈值在 SPARSE_RULES。\n    lane._sparse = lane.main.filter(n => xVisible(n.s, n.e)).length\n      + lane.detours.filter(d => xVisible(d.s, d.e)).length > SPARSE_RULES.VISIBLE_STEPS\n    // 轮次交替底色：偶数轮着 subtle 色带，多轮会话的分轮结构一眼可辨（画在最底层）\n    {\n      const mainNodes = lane.main\n      let segStart = null, segTurn = null, prevE = null\n      const flushBand = end => {\n        if (segTurn != null && segTurn % 2 === 0 && xVisible(segStart, end)){\n          gTime.appendChild(el('rect', { x: x(segStart), y: lay.regionTop + 30, width: Math.max(0, x(end) - x(segStart)), height: lay.regionBottom - lay.regionTop - 34, fill: SVGC.turnBand }))\n        }\n      }\n      for (const n of mainNodes){\n        if (n.turn == null) continue\n        if (segTurn === null){ segTurn = n.turn; segStart = n.s }\n        else if (n.turn !== segTurn){\n          const bx = Math.max(prevE, (prevE + n.s) / 2)\n          flushBand(bx)\n          segTurn = n.turn; segStart = bx\n        }\n        prevE = n.e\n      }\n      if (segTurn != null && prevE != null) flushBand(prevE + 1)\n    }\n    let lastTurnLabX = -1e9   // 轮次标签逐个避让：装不下只画分隔线不画字\n    gStatic.appendChild(el('rect', { x: X0 - 14, y: lay.regionTop, width: AXIS_W + 28, height: lay.regionBottom - lay.regionTop, rx: 10, fill: lc.bg, stroke: lc.edge, 'stroke-width': 1.2 }))\n    gStatic.appendChild(el('rect', { x: X0 - 14, y: lay.regionTop, width: AXIS_W + 28, height: 30, rx: 10, fill: lc.head }))\n    gStatic.appendChild(el('rect', { x: X0 - 14, y: lay.regionTop + 15, width: AXIS_W + 28, height: 15, fill: lc.head }))\n    const title = el('text', { x: X0 + 4, y: lay.regionTop + 20, class: 'lane-name', fill: lc.title })\n    // 上传模式带文件名（对比两份日志时「第 N 会话」不足以指认是哪个文件）；实时模式无文件名\n    const src = lane.fname ? lane.fname + ' · ' : ''\n    title.textContent = `${laneName(lane)}   ${src}${lane.model ?? (lane.preWindow ? tr('modelNoHeader') : tr('modelNone'))}`\n    const info = el('text', { x: X0 + AXIS_W - 4, y: lay.regionTop + 20, 'text-anchor': 'end', class: 'lane-info' })\n    const laneTurns = new Set([...lane.main, ...lane.detours].map(n => n.turn).filter(v => v != null)).size\n    info.textContent = tr('laneInfo')(laneTurns, lane.stats) + (lane.preWindow ? tr('preWindow')(lane.preWindow) : '') + (lane.subHidden ? tr('subHidden')(lane.subHidden) : '')\n    gStatic.appendChild(title); gStatic.appendChild(info)\n\n    const main = lane.main\n    main.forEach((n, i) => {\n      if (i > 0){\n        const prev = main[i - 1]\n        // A new conversation turn is a fresh journey: break the main line and\n        // mark the boundary instead of pretending one continuous task.\n        if (prev.turn != null && n.turn != null && prev.turn !== n.turn){\n          if (xVisible(prev.e, n.s)){\n            const bx = x(Math.max(prev.e, (prev.e + n.s) / 2))\n            const sep = el('line', { x1: bx, y1: lay.regionTop + 34, x2: bx, y2: lay.regionBottom - 12, stroke: SVGC.turnSep, 'stroke-dasharray': '5 5', 'stroke-width': 1.3 })\n            gTime.appendChild(sep)\n            pathEls.push({ el: sep, s: prev.e, e: prev.e + 0.5, base: '5 5' })\n            // 挤不下的轮次标签不画（分隔线保留）——多轮长会话曾出现「Turn 5 Turn 6 Turn 7」叠字\n            if (bx + 6 >= lastTurnLabX + 46){\n              const tl = el('text', { x: bx + 6, y: lay.regionTop + 48, class: 'tick big', fill: SVGC.turnSepTxt })\n              tl.textContent = tr('turnLabel')(n.turn)\n              gTime.appendChild(tl)\n              markEls.push({ el: tl, s: prev.e, e: prev.e + 1 })\n              lastTurnLabX = bx + 6 + tr('turnLabel')(n.turn).length * 6.5\n            }\n          }\n        } else if (xVisible(prev.e, n.s)){\n          // Bars own [s,e]; the connector covers only the gap between bars.\n          const p = el('path', { d: `M ${x(prev.e)} ${lay.mainY} L ${Math.max(x(n.s), x(prev.e))} ${lay.mainY}`, fill: 'none', stroke: mainC, 'stroke-width': 3, 'stroke-linecap': 'round' })\n          gTime.appendChild(p)\n          pathEls.push({ el: p, s: prev.e, e: n.s, base: '' })\n        }\n      }\n      if (xVisible(n.s, n.e)){\n        const node = drawNode(gTime, lane, n, lay.mainY, true, i)\n        nodeEls.push({ el: node.g, s: n.s, e: n.e })\n      }\n    })\n\n    lane.detours.forEach((d, di) => {\n      d._id = lane.key + '-d' + di\n      d._laneKey = lane.key\n      const attach = main.find(n => n.step === d.attach)\n      const at = attach ? attach.e : d.s\n      if (!xVisible(Math.min(at, d.s), d.e + 1.5)) return\n      const ax = x(at)\n      const ay = lay.mainY\n      const ex = x(d.s), bx0 = x(d.e), ey = d._y\n      const mx = (ax + ex) / 2\n      const vc = VCOLOR[d.v] ?? '#b6c0d2'\n      const c1x = ax + 90, c1y = ay + (ey - ay) * 0.38\n      const c2x = mx, c2y = ey\n      const out = el('path', { d: `M ${ax} ${ay} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`, fill: 'none', stroke: vc, 'stroke-width': lane._sparse ? 1.7 : 2.6, 'stroke-dasharray': '6 5' })\n      out._det = d\n      out.addEventListener('mouseenter', onArcHover)\n      out.addEventListener('mouseleave', offArcHover)\n      out.addEventListener('click', onArcClick)\n      gTime.appendChild(out)\n      pathEls.push({ el: out, s: d.s, e: Math.min(d.s + 0.6, d.e), det: d, base: '6 5' })\n      const bx = 0.125 * ax + 0.375 * c1x + 0.375 * c2x + 0.125 * ex\n      const by = 0.125 * ay + 0.375 * c1y + 0.375 * c2y + 0.125 * ey\n      const sl = el('text', { x: bx, y: by - 5, 'text-anchor': 'middle', class: 'seg-label', fill: vc })\n      sl.textContent = nodeLabel(d)\n      sl.style.opacity = 0\n      gTime.appendChild(sl)\n      pathEls.push({ el: sl, s: d.s, e: d.e, det: d, base: '', kind: 'lab' })\n      const mx2 = (ax + bx0) / 2\n      const back = el('path', { d: `M ${bx0} ${ey} C ${mx2 + 30} ${ey}, ${mx2 + 30} ${ay}, ${ax} ${ay}`, fill: 'none', stroke: SVGC.back, 'stroke-width': lane._sparse ? 1.1 : 1.6, 'stroke-dasharray': '2 4', 'marker-end': 'url(#arr)' })\n      back._det = d\n      back.addEventListener('mouseenter', onArcHover)\n      back.addEventListener('mouseleave', offArcHover)\n      back.addEventListener('click', onArcClick)\n      gTime.appendChild(back)\n      pathEls.push({ el: back, s: d.e, e: d.e + 1.5, det: d, base: '2 4' })\n      const btl = el('text', { x: mx2 + 24, y: (ey + ay) / 2 + 4, 'text-anchor': 'end', class: 'back-label' })\n      btl.textContent = '↩'\n      btl.style.opacity = 0\n      gTime.appendChild(btl)\n      pathEls.push({ el: btl, s: d.e, e: d.e + 1.5, det: d, base: '', kind: 'lab' })\n      const node = drawNode(gTime, lane, d, ey, false, -1)\n      nodeEls.push({ el: node.g, s: d.s, e: d.e })\n    })\n\n    const lastN = main[main.length - 1]\n    if (lastN && xVisible(lastN.e, lastN.e)){\n      const f = el('text', { x: x(lastN.e), y: lay.mainY - 12, 'text-anchor': 'middle', class: 'mk-flag', fill: VCOLOR.answer })\n      f.textContent = '🏁 ' + fmtT(lane.stats.T)\n      gTime.appendChild(f)\n      markEls.push({ el: f, s: lastN.e, e: lastN.e + 1 })\n    }\n\n    // 稀疏模式的支路聚合徽标：同一小段时间轴上 ≥4 条支路收一个「×N」，点击放大到该段。\n    // 弧线仍在（密度本身是信号），徽标给出计数与放大入口——毛线球有了出口。\n    if (lane._sparse){\n      const ds = lane.detours.filter(d => !d.sub && xVisible(d.s, d.e)).sort((a, b) => a.s - b.s)\n      const groups = []\n      let cur = null\n      for (const d of ds){\n        const cxp = (x(d.s) + x(d.e)) / 2\n        if (cur !== null && cxp - cur.x1 <= SPARSE_RULES.CLUSTER_GAP_PX){\n          cur.x1 = Math.max(cur.x1, cxp); cur.n += 1\n          cur.s = Math.min(cur.s, d.s); cur.e = Math.max(cur.e, d.e)\n        } else {\n          cur = { x0: cxp, x1: cxp, n: 1, s: d.s, e: d.e }\n          groups.push(cur)\n        }\n      }\n      for (const grp of groups){\n        if (grp.n < SPARSE_RULES.CLUSTER_MIN) continue\n        const gx = (grp.x0 + grp.x1) / 2\n        const label = '×' + grp.n\n        const bw = label.length * 7 + 12\n        const g = el('g', { class: 'clusterbadge' })\n        g.appendChild(el('rect', { x: gx - bw / 2, y: lay.regionTop + 36, width: bw, height: 16, rx: 8, fill: SVGC.panel, stroke: VCOLOR.error, 'stroke-width': 1.2 }))\n        const t = el('text', { x: gx, y: lay.regionTop + 48, 'text-anchor': 'middle', class: 'seg-label' })\n        t.setAttribute('fill', VCOLOR.error)\n        t.textContent = label\n        g.appendChild(t)\n        const tt = el('title', {})\n        tt.textContent = tr('clusterTip')(grp.n)\n        g.appendChild(tt)\n        g.addEventListener('click', ev => {\n          const pad = Math.max((grp.e - grp.s) * 0.25, 5)\n          setViewWindow(grp.s - pad, grp.e + pad)\n          ev.stopPropagation()\n        })\n        gTime.appendChild(g)\n        markEls.push({ el: g, s: grp.s, e: grp.s })\n      }\n    }\n\n    drawTracks(gTime, gStatic, lane, lay)\n  })\n\n  drawAnchors(gTime)   // 锚点端点可挂在支路上，须等 assignDetourY 给出 _y 后再画\n\n  const cur = el('line', { x1: X0, y1: 0, x2: X0, y2: DATA.viewH, stroke: SVGC.milestone, 'stroke-width': 2 })\n  gTime.appendChild(cur)\n  window._cursor = cur\n  applyFit()      // viewH 每次重建都会变，适配模式跟着重算\n  applyFilter()   // 缩放/实时都走 build 全量重建，过滤淡化必须每次重建后重放\n  drawSeekHeat()  // 进度条热力随数据/主题重画\n}\n\n/* ==================== 数据轨道（v0.7）：工具调用密度 / Token 脉冲 / 上下文压力 ====================\n   泳道带底部的横向轨道，与迷宫共享同一 x 时间映射——缩放、平移、空闲折叠、播放全部联动。\n   诚实规则：Token 脉冲与上下文压力只在日志真报了 usage 时出现（没有数据就不画，不占高度）；\n   上下文占用百分比只在模型窗口已知时显示（CONTEXT_WINDOWS 匹配），未知回退绝对 token 数。 */\n\n/** 悬停卡跟随鼠标定位（右/下边缘翻转），新轨道处理器共用。 */\nfunction placeTip(e){\n  const tip = document.getElementById('tip')\n  let px = e.clientX + 14, py = e.clientY + 14\n  if (px + 640 > window.innerWidth) px = e.clientX - 640\n  if (py + 400 > window.innerHeight) py = e.clientY - 400\n  tip.style.left = px + 'px'; tip.style.top = py + 'px'\n}\n\nfunction onTokHover(e){\n  const g = e.currentTarget\n  const n = g._tokNode, lane = g._tokLane\n  const parts = []\n  if (n.cacheTok != null) parts.push(tr('tokCache') + ' ' + n.cacheTok.toLocaleString())\n  if (n.inTok != null) parts.push(tr('tokIn') + ' ' + n.inTok.toLocaleString())\n  if (n.rzTok != null) parts.push(tr('tokRz') + ' ' + n.rzTok.toLocaleString())\n  if (n.outTok != null) parts.push(tr('tokOutVis') + ' ' + Math.max(0, n.outTok - (n.rzTok ?? 0)).toLocaleString())\n  const total = (n.cacheTok ?? 0) + (n.inTok ?? 0) + (n.outTok ?? 0)\n  const tip = document.getElementById('tip')\n  tip.innerHTML = `<div class=\"th\">${laneName(lane)} ${nodeLabel(n)} · ${tr('trkTok')}</div>`\n    + `<div class=\"rs\">${parts.map(esc).join(' · ')} · ${esc(tr('tokTotal'))} ${total.toLocaleString()}</div>`\n  tip.style.display = 'block'\n  placeTip(e)\n}\n\nfunction onCtxHover(e){\n  const dot = e.currentTarget\n  const n = dot._ctxNode, lane = dot._ctxLane, win = dot._ctxWin\n  const v = (n.inTok ?? 0) + (n.cacheTok ?? 0)\n  const tip = document.getElementById('tip')\n  tip.innerHTML = `<div class=\"th\">${laneName(lane)} ${nodeLabel(n)} · ${tr('trkCtx')}</div>`\n    + `<div class=\"rs\">${esc(win ? tr('ctxTipPct')(v, Math.round(v / win * 1000) / 10) : tr('ctxTipAbs')(v))}</div>`\n  tip.style.display = 'block'\n  placeTip(e)\n}\n\nfunction offTrackHover(){\n  document.getElementById('tip').style.display = 'none'\n}\n\n/**\n * 画一条泳道的数据轨道。子代理聚合节点不进 Token/上下文轨道（那是子代理自己\n * 上下文窗口里的量），但其工具调用照进密度轨道——它们真实占用了时间轴。\n */\nfunction drawTracks(gTime, gStatic, lane, lay){\n  const trk = lay.trk\n  if (!trk || trk.h === 0) return\n  const own = [...lane.main, ...lane.detours].filter(n => !n.sub && !n.evt)\n  const all = [...lane.main, ...lane.detours].filter(n => !n.evt)\n  let y0 = lay.trackTop\n\n  const sep = y => gStatic.appendChild(el('line', { x1: X0 - 14, y1: y, x2: X0 + AXIS_W + 14, y2: y, stroke: SVGC.grid, 'stroke-width': 1 }))\n  const nameText = (text, y) => {\n    const t = el('text', { x: X0 + 2, y, class: 'trk-label' })\n    t.textContent = text\n    gStatic.appendChild(t)\n  }\n  const capText = (text, y, warn) => {\n    const t = el('text', { x: X0 + AXIS_W - 8, y, 'text-anchor': 'end', class: warn ? 'trk-cap warn' : 'trk-cap' })\n    t.textContent = text\n    gStatic.appendChild(t)\n  }\n\n  // 行内图例（轨道标题行右延）：彩点 + 标签 + 计数——信息对齐参照稿的左侧图例列，\n  // 但不吃画布宽度。画进 gStatic，随 build 重建自动跟语言/主题。\n  const legend = (items, y) => {\n    let lx = X0 + 74\n    for (const it of items){\n      if (it.swatch === 'rect') gStatic.appendChild(el('rect', { x: lx, y: y - 8, width: 9, height: 7, rx: 1.5, fill: it.color, opacity: it.op ?? 1 }))\n      else gStatic.appendChild(el('circle', { cx: lx + 4, cy: y - 4, r: 3.4, fill: it.color }))\n      const t = el('text', { x: lx + 13, y, class: 'trk-cap' })\n      t.textContent = it.label\n      gStatic.appendChild(t)\n      lx += 13 + it.label.length * 6.4 + 14\n    }\n  }\n\n  // 1) 工具调用密度：每次调用一根刻线，颜色 = 工具类别，宽 = 真实时长；悬停即工具详情。\n  //    行内图例带各类别计数，扫一眼知道调用构成。\n  sep(y0)\n  nameText(tr('trkTools'), y0 + 13)\n  {\n    const catCounts = {}\n    let total = 0\n    for (const n of all) for (const tl of n.tools){ catCounts[toolCat(tl.name)] = (catCounts[toolCat(tl.name)] ?? 0) + 1; total += 1 }\n    legend(['read', 'search', 'shell', 'edit', 'other'].filter(c => catCounts[c] > 0)\n      .map(c => ({ color: SVGC.cat[c], label: `${tr('catNames')[c]} ${catCounts[c]}` })), y0 + 13)\n    capText(tr('trkToolsCap')(total), y0 + 13)\n  }\n  for (const n of all){\n    for (const tl of n.tools){\n      if (tl.s == null) continue\n      const te = tl.e ?? tl.s\n      if (!xVisible(tl.s, te)) continue\n      const bx = x(tl.s)\n      // 右侧让缝：相邻调用的色条不再连成一条带（太窄时放弃留缝保可见）\n      const bar = el('rect', { x: bx, y: y0 + 20, width: Math.max(1.6, x(te) - bx - 1), height: 16, rx: 1.5, fill: SVGC.cat[toolCat(tl.name)], opacity: .85 })\n      bar._tool = tl; bar._toolNode = n; bar._toolLane = lane\n      bar.addEventListener('mouseenter', onToolHover)\n      bar.addEventListener('mouseleave', offToolHover)\n      gTime.appendChild(bar)\n      markEls.push({ el: bar, s: tl.s, e: tl.s })\n    }\n  }\n  y0 += trk.dens\n\n  // 2) Token 脉冲：双向布局——基线之上是未缓存输入（缓存命中作上半区半透明背景，\n  //    自有刻度），基线之下是推理 + 可见输出走独立刻度。输入动辄上万、输出常只有几百，\n  //    同向堆叠时输出永远被压扁；上下分开后两边各自撑满，产出一眼可见。\n  if (trk.tok > 0){\n    sep(y0)\n    const zoneTop = y0 + 18, zoneH = trk.tok - 24\n    const upH = Math.round(zoneH * 0.55), dnH = zoneH - upH\n    const zeroY = zoneTop + upH\n    const samples = own.filter(n => n.inTok != null || n.outTok != null || n.rzTok != null || n.cacheTok != null)\n    const outOf = n => (n.rzTok ?? 0) + Math.max(0, (n.outTok ?? 0) - (n.rzTok ?? 0))\n    const mxIn = Math.max(1, ...samples.map(n => n.inTok ?? 0))\n    const mxOut = Math.max(1, ...samples.map(outOf))\n    const mxCache = Math.max(0, ...samples.map(n => n.cacheTok ?? 0))\n    nameText(tr('trkTok'), y0 + 13)\n    legend([\n      { color: SVGC.tokIn, label: tr('tokIn') },\n      { color: SVGC.tokRz, label: tr('tokRz') },\n      { color: SVGC.tokOut, label: tr('tokOutVis') },\n      ...(mxCache > 0 ? [{ color: SVGC.tokCache, label: tr('tokCache'), swatch: 'rect', op: .45 }] : []),\n    ], y0 + 13)\n    capText(tr('trkTokCap')(mxIn, mxOut, mxCache), y0 + 13)\n    gStatic.appendChild(el('line', { x1: X0, y1: zeroY, x2: X0 + AXIS_W, y2: zeroY, stroke: SVGC.grid, 'stroke-width': 1 }))\n    for (const n of samples){\n      if (!xVisible(n.s, n.e)) continue\n      const bx0 = x(n.s)\n      const raw = x(n.e) - bx0\n      // 读数柱宽 = min(步长-缝, 10px)，钉在步中点（吴昊定版的折中方案）：\n      // 密集会话里柱被步距压细、自动呈参照稿式的细尖峰，稀疏会话保底 10px 不至于空；\n      // 时长语义由迷宫胶囊条承担，这里不重复编码。缓存背景仍按步时长铺底当参照带。\n      const bw = Math.min(Math.max(2, raw - 1.5), 10)\n      const bxc = bx0 + raw / 2 - bw / 2\n      const g = el('g', {})\n      if (mxCache > 0 && (n.cacheTok ?? 0) > 0){\n        const ch = Math.max(1, (n.cacheTok ?? 0) / mxCache * upH)\n        g.appendChild(el('rect', { x: bx0, y: zeroY - ch, width: Math.max(2, raw), height: ch, fill: SVGC.tokCache, opacity: .4 }))\n      }\n      if ((n.inTok ?? 0) > 0){\n        const hh = Math.max(1.5, (n.inTok ?? 0) / mxIn * upH)\n        g.appendChild(el('rect', { x: bxc, y: zeroY - hh, width: bw, height: hh, fill: SVGC.tokIn }))\n      }\n      let yy = zeroY\n      for (const [v, c] of [\n        [n.rzTok ?? 0, SVGC.tokRz],\n        [Math.max(0, (n.outTok ?? 0) - (n.rzTok ?? 0)), SVGC.tokOut],\n      ]){\n        if (v <= 0) continue\n        const hh = Math.max(1.5, v / mxOut * dnH)\n        g.appendChild(el('rect', { x: bxc, y: yy, width: bw, height: hh, fill: c }))\n        yy += hh\n      }\n      g._tokNode = n; g._tokLane = lane\n      g.addEventListener('mouseenter', onTokHover)\n      g.addEventListener('mouseleave', offTrackHover)\n      gTime.appendChild(g)\n      markEls.push({ el: g, s: n.e, e: n.e })\n    }\n    y0 += trk.tok\n  }\n\n  // 3) 上下文压力：折线 + 面积，纵轴 = 未缓存输入 + 缓存命中（即每次请求的真实上下文\n  //    总量）。纵轴随数据自适应：顶 = 峰值上方留 25% 余量——按整窗满刻度画的话，\n  //    一个只用到窗口 8% 的会话曲线全贴在底边，什么变化都看不出（实测教训）。\n  //    百分比与 70%/90% 阈值线仍按真实窗口换算，只在落进可视范围时画；压缩呈现为锯齿下落。\n  if (trk.ctx > 0){\n    sep(y0)\n    const H = trk.ctx - 20, yB = y0 + trk.ctx - 6\n    // 每次请求按当时的模型换算窗口（verdict.js 的 contextOccupancy）：窗口可用时纵轴是占用百分比\n    //（一场会话中途切模型时窗口会变，按 token 画阈值线就对不齐）；窗口表过时（有样本超窗）退回绝对 token。\n    const occ = contextOccupancy(lane)\n    const pctMode = occ.valid && occ.samples.length > 0\n    // 百分比模式下，窗口值不可信（超窗）的样本没有占用可画，略过并在标题里说明\n    const samples = occ.samples.filter(sm => !pctMode || sm.ratio != null).map(sm => ({ ...sm, e: sm.n.e }))\n    const val = sm => pctMode ? sm.ratio * 100 : sm.tok\n    const peak = Math.max(1, ...samples.map(val))\n    const win = pctMode ? 100 : null\n    const scaleMax = win != null ? Math.min(win, peak * 1.25) : peak * 1.15\n    const yOf = v => yB - Math.min(1, v / scaleMax) * H\n    nameText(tr('trkCtx'), y0 + 13)\n    const peakPct = pctMode ? Math.round(occ.peakRatio * 1000) / 10 : null\n    capText(pctMode ? tr('trkCtxCapPct')(peakPct, occ.peakWin) + (occ.windows.length > 1 ? tr('trkCtxWinSwitch')(occ.windows) : '') + (occ.skipped > 0 ? tr('trkCtxStale')(occ.skipped) : '') : tr('trkCtxCapAbs')(occ.peakTok), y0 + 13, pctMode && peakPct >= 90)\n    // 纵轴参照：中线 + 顶值刻度（自适应刻度下没有标尺，曲线高低要有锚）。\n    // 有阈值线落进可视范围时阈值标签就是锚，顶值标签不再画（曾与其在左缘撞字）。\n    const thresholdVisible = win != null && win * 0.7 <= scaleMax\n    if (!thresholdVisible){\n      const topLab = el('text', { x: X0 + 2, y: yOf(scaleMax) + 9, class: 'trk-cap' })\n      topLab.textContent = pctMode ? Math.round(scaleMax) + '%' : fmtTok(Math.round(scaleMax))\n      gStatic.appendChild(topLab)\n    }\n    gStatic.appendChild(el('line', { x1: X0, y1: yOf(scaleMax / 2), x2: X0 + AXIS_W, y2: yOf(scaleMax / 2), stroke: SVGC.grid, 'stroke-width': 1, 'stroke-dasharray': '2 5' }))\n    if (win){\n      // 阈值线只在落进可视范围时画（低占用会话里 70%/90% 在图外，画了也是贴顶的假线）\n      for (const [frac, color] of [[0.7, SVGC.ctxWarn], [0.9, SVGC.ctxCrit]]){\n        if (win * frac > scaleMax) continue\n        const ly = yOf(win * frac)\n        gTime.appendChild(el('line', { x1: X0, y1: ly, x2: X0 + AXIS_W, y2: ly, stroke: color, 'stroke-dasharray': '5 4', 'stroke-width': 1, opacity: .7 }))\n        const lt = el('text', { x: X0 + 2, y: ly - 2, class: 'trk-cap' })\n        lt.setAttribute('fill', color)\n        lt.textContent = Math.round(frac * 100) + '%'\n        gTime.appendChild(lt)\n      }\n    }\n    if (samples.length > 0){\n      const pts = samples.map(sm => x(sm.e).toFixed(1) + ' ' + yOf(val(sm)).toFixed(1))\n      const area = el('path', { d: `M ${x(samples[0].e).toFixed(1)} ${yB} L ` + pts.join(' L ') + ` L ${x(samples[samples.length - 1].e).toFixed(1)} ${yB} Z`, fill: SVGC.ctxFill, stroke: 'none' })\n      gTime.appendChild(area)\n      markEls.push({ el: area, s: samples[0].e, e: samples[0].e })\n      const line = el('path', { d: 'M ' + pts.join(' L '), fill: 'none', stroke: SVGC.ctxLine, 'stroke-width': 2 })\n      gTime.appendChild(line)\n      pathEls.push({ el: line, s: samples[0].e, e: samples[samples.length - 1].e, base: '' })\n      for (const sm of samples){\n        const n = sm.n\n        if (!xVisible(n.e, n.e)) continue\n        const dot = el('circle', { cx: x(n.e), cy: yOf(val(sm)), r: 2.6, fill: SVGC.ctxLine })\n        dot._ctxNode = n; dot._ctxLane = lane; dot._ctxWin = pctMode ? sm.win : null\n        dot.addEventListener('mouseenter', onCtxHover)\n        dot.addEventListener('mouseleave', offTrackHover)\n        gTime.appendChild(dot)\n        markEls.push({ el: dot, s: n.e, e: n.e })\n      }\n      // 压缩标注（诊断层第 3 项）：优先画日志里的真事件——compaction/start 标「⌄−N%」、\n      // compaction/prune 画细刻线；没有真事件的旧日志才退回「相邻样本骤降 ≥20%」的推断，\n      // 并在悬停与图例里写明是推断（口径：真事件按时刻落位，推断按样本落点）。\n      const cp = lane.compaction\n      const realStarts = (cp?.starts ?? []).filter(t => xVisible(t, t))\n      const realPrunes = (cp?.pruneAt ?? []).filter(t => xVisible(t, t))\n      const aroundAt = t => {           // 事件前后的占用样本：前 = 最后一个 ≤ t 的样本，后 = 第一个 > t 的样本\n        let before = null, after = null\n        for (const sm of samples){\n          if (sm.e <= t) before = sm\n          else { after = sm; break }\n        }\n        return { before, after }\n      }\n      if (realStarts.length > 0 || realPrunes.length > 0){\n        for (const t of realPrunes){\n          const { before } = aroundAt(t)\n          const tk = el('line', { x1: x(t), y1: y0 + 14, x2: x(t), y2: yB, stroke: SVGC.ctxWarn, 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: '.85' })\n          tk._ctxDrop = { real: 'prune', at: t, a: before?.tok ?? null }\n          tk._ctxLane = lane\n          tk.addEventListener('mouseenter', onCtxDropHover)\n          tk.addEventListener('mouseleave', offTrackHover)\n          gTime.appendChild(tk)\n          markEls.push({ el: tk, s: t, e: t })\n        }\n        for (const t of realStarts){\n          const { before, after } = aroundAt(t)\n          const a = before?.tok ?? null, b = after?.tok ?? null\n          const p = a && b && a > 0 && b < a ? Math.round((1 - b / a) * 100) : null\n          const anchor = after ?? before\n          if (!anchor) continue\n          const mk = el('text', { x: x(t) + 4, y: yOf(val(anchor)) - 7, class: 'trk-cap' })\n          mk.setAttribute('fill', SVGC.ctxWarn)\n          mk.style.fontWeight = '700'\n          mk.textContent = p != null ? '⌄−' + p + '%' : '⌄'\n          mk._ctxDrop = { real: 'start', at: t, a, b, p }\n          mk._ctxLane = lane\n          mk.addEventListener('mouseenter', onCtxDropHover)\n          mk.addEventListener('mouseleave', offTrackHover)\n          gTime.appendChild(mk)\n          markEls.push({ el: mk, s: t, e: t })\n        }\n      } else {\n        for (let i = 1; i < samples.length; i++){\n          // 降幅按 token 真值判（切模型只改窗口不改 token，不该冒充压缩）；标注位置按当前纵轴\n          const a = samples[i - 1].tok, b = samples[i].tok\n          if (a <= 0 || b >= a * (1 - SPARSE_RULES.CTX_DROP)) continue\n          if (!xVisible(samples[i].e, samples[i].e)) continue\n          const p = Math.round((1 - b / a) * 100)\n          const mk = el('text', { x: x(samples[i].e) + 5, y: yOf(val(samples[i])) - 7, class: 'trk-cap' })\n          mk.setAttribute('fill', SVGC.ctxWarn)\n          mk.style.fontWeight = '700'\n          mk.textContent = '⌄−' + p + '%'\n          mk._ctxDrop = { a, b, p, real: null }; mk._ctxLane = lane\n          mk.addEventListener('mouseenter', onCtxDropHover)\n          mk.addEventListener('mouseleave', offTrackHover)\n          gTime.appendChild(mk)\n          markEls.push({ el: mk, s: samples[i].e, e: samples[i].e })\n        }\n      }\n    }\n  }\n}\n\nfunction onCtxDropHover(e){\n  const d = e.currentTarget._ctxDrop\n  const tip = document.getElementById('tip')\n  const title = d.real ? tr('ctxReal') : tr('ctxGuess')\n  tip.innerHTML = `<div class=\"th\">${laneName(e.currentTarget._ctxLane)} · ${tr('trkCtx')} · ${title}</div>`\n    + (d.real === 'prune'\n      ? `<div class=\"rs\">${esc(tr('ctxPruneTip')(fmtTok(d.a ?? 0)))}</div>`\n      : `<div class=\"rs\">${esc(tr('ctxDropTip')(d.a, d.b, d.p))}</div>`)\n    + `<div class=\"rs\">${esc(tr(d.real ? 'ctxRealNote' : 'ctxGuessNote'))}</div>`\n  tip.style.display = 'block'\n  placeTip(e)\n}\n\n/**\n * 播放进度条热力化：活动密度铺蓝色深浅、失败位置画红色刻线——\n * 长会话不用先放大就知道「坎坷在哪段」，拖过去即达。build() 每次重建后重画（跟主题）。\n */\nfunction drawSeekHeat(){\n  const cv = document.getElementById('seekheat')\n  if (!cv || !DATA) return\n  const W = Math.max(60, cv.clientWidth || 200), H = 16\n  cv.width = Math.round(W * 2); cv.height = H * 2\n  const c = cv.getContext('2d')\n  c.setTransform(2, 0, 0, 2, 0, 0)\n  c.clearRect(0, 0, W, H)\n  const cs = getComputedStyle(document.documentElement)\n  const lineC = cs.getPropertyValue('--line').trim()\n  const actC = cs.getPropertyValue('--main-f').trim()\n  const errC = cs.getPropertyValue('--err').trim()\n  const B = Math.max(60, Math.min(240, Math.floor(W / 3)))\n  const dens = new Float32Array(B)\n  const fail = new Uint8Array(B)\n  const bAt = t => Math.max(0, Math.min(B - 1, Math.floor(t / TMAX * B)))\n  for (const l of DATA.lanes){\n    for (const arr of [l.main, l.detours]){\n      for (const n of arr){\n        const b0 = bAt(n.s), b1 = bAt(n.e)\n        for (let b = b0; b <= b1; b++) dens[b] += 1\n        if (n.v === 'error') fail[bAt((n.s + n.e) / 2)] = 1\n      }\n    }\n  }\n  const dmax = Math.max(1, ...dens)\n  c.globalAlpha = .55\n  c.fillStyle = lineC\n  if (c.roundRect){ c.beginPath(); c.roundRect(0, 5, W, 6, 3); c.fill() } else c.fillRect(0, 5, W, 6)\n  const bw = W / B\n  c.fillStyle = actC\n  for (let b = 0; b < B; b++){\n    if (dens[b] <= 0) continue\n    c.globalAlpha = .18 + .68 * (dens[b] / dmax)\n    c.fillRect(b * bw, 5, bw + .5, 6)\n  }\n  c.globalAlpha = .95\n  c.fillStyle = errC\n  for (let b = 0; b < B; b++){\n    if (fail[b]) c.fillRect(b * bw, 2, Math.max(2, bw), 12)\n  }\n  c.globalAlpha = 1\n}\nif (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => drawSeekHeat()).observe(document.getElementById('seekwrap'))\n\n/* ==================== 手动锚点：页内状态（DATA 之外），build() 尾部重画 ==================== */\nlet ANCHORS = []       // [{a:{lane,step}, b:{lane,step}}]，a 恒为泳道序号小的一侧\nlet anchorPick = null  // 选点中：{first: {lane,step}|null}；null = 未在选点\n\n/** 按 {lane,step} 找回节点与其当前绘制 y（主干=mainY，支路=_y）；数据刷新后找不到返回 null。 */\nfunction findAnchorNode(ref){\n  const lane = DATA.lanes.find(l => l.key === ref.lane)\n  if (!lane) return null\n  const n = lane.main.find(nn => nn.step === ref.step)\n  if (n) return { n, y: LAYOUT[lane.key].mainY }\n  const d = lane.detours.find(nn => nn.step === ref.step)\n  return d ? { n: d, y: d._y } : null\n}\n\nfunction drawAnchors(gTime){\n  if (!cmpOn()) return\n  ANCHORS = ANCHORS.filter(a => findAnchorNode(a.a) && findAnchorNode(a.b))   // 节点随数据刷新消失时静默放弃\n  ANCHORS.forEach((a, i) => {\n    const pa = findAnchorNode(a.a), pb = findAnchorNode(a.b)\n    const ax = x((pa.n.s + pa.n.e) / 2), bx = x((pb.n.s + pb.n.e) / 2)\n    if (!xVisible(Math.min(pa.n.s, pb.n.s), Math.max(pa.n.e, pb.n.e))) return\n    const g = el('g', {})\n    g.appendChild(el('line', { x1: ax, y1: pa.y, x2: bx, y2: pb.y, class: 'ancline' }))\n    const lab = el('text', { x: (ax + bx) / 2 + 8, y: (pa.y + pb.y) / 2 + 4, class: 'anclabel' })\n    lab.textContent = `⚓ ${nodeLabel(pa.n)} ↔ ${nodeLabel(pb.n)}（Δ${fmtT(Math.abs(rawE(pb.n) - rawE(pa.n)))}）✕`\n    g.appendChild(lab)\n    const tt = el('title', {}); tt.textContent = tr('anchorDel'); g.appendChild(tt)\n    g.addEventListener('click', ev => { ANCHORS.splice(i, 1); queueBuild(); ev.stopPropagation() })\n    gTime.appendChild(g)\n  })\n}\n\nconst btnAnchor = document.getElementById('btnAnchor')\nfunction startAnchorPick(){ anchorPick = { first: null }; btnAnchor.classList.add('on'); btnAnchor.textContent = tr('anchorFirst') }\nfunction stopAnchorPick(){ anchorPick = null; btnAnchor.classList.remove('on'); btnAnchor.textContent = tr('anchorBtn') }\nbtnAnchor.addEventListener('click', () => { anchorPick ? stopAnchorPick() : startAnchorPick() })\n\n/** 选点模式下的节点点击：同泳道重选，异泳道成锚（任意两条泳道之间都可钉）。 */\nfunction pickAnchorNode(n, laneKey){\n  const ref = { lane: laneKey, step: n.step }\n  if (!anchorPick.first || anchorPick.first.lane === laneKey){\n    anchorPick.first = ref\n    btnAnchor.textContent = tr('anchorSecond')\n    return\n  }\n  ANCHORS.push(laneIdx(anchorPick.first.lane) <= laneIdx(laneKey) ? { a: anchorPick.first, b: ref } : { a: ref, b: anchorPick.first })\n  stopAnchorPick()\n  queueBuild()\n}\n\n/* ==================== 过滤与搜索：状态在 DATA 之外，重建后还原 ==================== */\nlet fltFail = false, fltTool = '', fltQ = ''\n\nfunction nodeMatches(n){\n  if (fltFail && (n.v === 'ok' || n.v === 'answer')) return false\n  if (fltTool !== '' && !(n.tools ?? []).some(tl => tl.name === fltTool)) return false\n  if (fltQ !== ''){\n    const q = fltQ.toLowerCase()\n    const inTools = (n.tools ?? []).some(tl =>\n      String(tl.args ?? '').toLowerCase().includes(q) || String(tl.resFull ?? tl.res ?? '').toLowerCase().includes(q))\n    if (!inTools && !String(n.rzTxtFull ?? n.rzTxt ?? '').toLowerCase().includes(q)) return false\n  }\n  return true\n}\n\nfunction applyFilter(){\n  const sigNodes = sigSelRow()?.nodes ?? null\n  const active = fltFail || fltTool !== '' || fltQ !== '' || invSel != null || sigNodes != null\n  // 盘点选轮叠加在常规过滤上：选中某轮后只保留该轮的支路，其余（含主干）淡化；行为信号选中同理只保留涉及的节点\n  const pass = (n, isDet) => nodeMatches(n) && (invSel == null || (isDet && (n.turn ?? 1) === invSel)) && (sigNodes == null || sigNodes.has(n))\n  nodeEls.forEach(({ el }) => el.classList.toggle('flt-dim', active && el._node != null && !pass(el._node, el._det != null)))\n  pathEls.forEach(({ el, det }) => { if (det) el.classList.toggle('flt-dim', active && !pass(det, true)) })\n  let hit = 0, total = 0\n  if (active && DATA){\n    for (const l of DATA.lanes){\n      for (const n of l.main){ total += 1; if (pass(n, false)) hit += 1 }\n      for (const n of l.detours){ total += 1; if (pass(n, true)) hit += 1 }\n    }\n  }\n  document.getElementById('fltCount').textContent = active ? tr('fltCount')(hit, total) : ''\n}\n\n/** 工具类型下拉从当前数据取集合，保留选中项；选中的工具从数据消失时清空过滤。 */\nfunction refreshFltTools(){\n  const sel = document.getElementById('fltToolSel')\n  const names = new Set()\n  for (const l of DATA.lanes) for (const n of [...l.main, ...l.detours]) for (const tl of n.tools ?? []) names.add(tl.name)\n  if (fltTool !== '' && !names.has(fltTool)) fltTool = ''\n  sel.innerHTML = '<option value=\"\">' + esc(tr('allTools')) + '</option>'\n    + [...names].sort().map(x => `<option value=\"${esc(x)}\"${x === fltTool ? ' selected' : ''}>${esc(tlabel(x))}</option>`).join('')\n}\n\ndocument.getElementById('fltFail').addEventListener('change', e => { fltFail = e.target.checked; applyFilter() })\ndocument.getElementById('fltToolSel').addEventListener('change', e => { fltTool = e.target.value; applyFilter() })\ndocument.getElementById('fltQIn').addEventListener('input', e => { fltQ = e.target.value.trim(); applyFilter() })\n\n/* ==================== 支路盘点（双泳道按轮次）：状态在 DATA 之外 ==================== */\nconst invPanelEl = document.getElementById('invpanel')\nconst invBody = document.getElementById('invBody')\nlet invSel = null   // 盘点面板选中的轮次；非空时 applyFilter 只保留该轮支路\n\nfunction fmtDetCell(g){\n  if (!g) return '<td style=\"color:#b6c0d2\">—</td>'\n  const by = []\n  if (g.by.error) by.push(`<span style=\"color:var(--err)\">✗${g.by.error}</span>`)\n  if (g.by.retry) by.push(`<span style=\"color:var(--retry)\">↻${g.by.retry}</span>`)\n  if (g.by.deadend) by.push(`<span style=\"color:var(--dead)\">·${g.by.deadend}</span>`)\n  return `<td>${tr('invSteps')(g.n)} · ${fmtT(g.T)}${by.length ? '　' + by.join(' ') : ''}</td>`\n}\n\n/** 差额文案：正=第 2 会话多耗，负=第 1 会话多耗；1 秒内视为持平。 */\nfunction fmtDetDiff(dT, any){\n  if (!any) return ''\n  return Math.abs(dT) < 1 ? tr('invEven') : tr('invMore')(dT > 0 ? 2 : 1, fmtT(Math.abs(dT)))\n}\n\nfunction renderInventory(){\n  if (!cmpOn()) return\n  const stats = DATA.lanes.map(l => turnDetourStats(l))\n  const totals = DATA.lanes.map(() => ({ n: 0, T: 0 }))\n  const two = DATA.lanes.length === 2   // 差额列只对两条泳道有意义；N 泳道各列并排即为盘点\n  let rows = ''\n  for (const turn of unionTurns(DATA.lanes)){\n    const gs = stats.map(m => m.get(turn))\n    gs.forEach((g, i) => { if (g){ totals[i].n += g.n; totals[i].T += g.T } })\n    rows += `<tr data-turn=\"${turn}\"${turn === invSel ? ' class=\"sel\"' : ''}><td>${tr('turnLabel')(turn)}</td>${gs.map(fmtDetCell).join('')}`\n      + (two ? `<td>${fmtDetDiff((gs[1]?.T ?? 0) - (gs[0]?.T ?? 0), gs[0] || gs[1])}</td>` : '') + `</tr>`\n  }\n  const anyN = totals.reduce((n, t) => n + t.n, 0)\n  invBody.innerHTML = `<table><thead><tr><th>${tr('invTurnCol')}</th>${DATA.lanes.map((_, i) => `<th>${tr('invLaneCol')(i + 1)}</th>`).join('')}${two ? `<th>${tr('invDiffCol')}</th>` : ''}</tr></thead><tbody>${rows}`\n    + `<tr class=\"total\"><td>${tr('invTotal')}</td>${totals.map(t => `<td>${tr('invSteps')(t.n)} · ${fmtT(t.T)}</td>`).join('')}`\n    + (two ? `<td>${anyN > 0 ? fmtDetDiff(totals[1].T - totals[0].T, true) : tr('invNone')}</td>` : '') + `</tr></tbody></table>`\n    + `<div class=\"hint\">${tr('invHint')}</div>`\n}\n\ninvBody.addEventListener('click', ev => {\n  const tr = ev.target.closest('tr[data-turn]')\n  if (!tr) return\n  const turn = Number(tr.dataset.turn)\n  if (invSel === turn){\n    invSel = null\n    renderInventory(); applyFilter()\n    return\n  }\n  invSel = turn\n  // 缩放到该轮：两条泳道该轮全部节点的时间范围（压缩坐标，setViewWindow 同一坐标系）\n  let s = Infinity, e = -Infinity\n  for (const l of DATA.lanes) for (const n of [...l.main, ...l.detours]){\n    if ((n.turn ?? 1) !== turn) continue\n    s = Math.min(s, n.s); e = Math.max(e, n.e)\n  }\n  if (s < e){ const pad = Math.max((e - s) * 0.06, 2); setViewWindow(s - pad, e + pad) }\n  renderInventory(); applyFilter()\n})\n\nfunction closeInv(){\n  invPanelEl.classList.remove('show')\n  if (invSel != null){ invSel = null; applyFilter() }\n}\ndocument.getElementById('invClose').addEventListener('click', closeInv)\ndocument.getElementById('btnInv').addEventListener('click', () => {\n  if (invPanelEl.classList.contains('show')) closeInv()\n  else { renderInventory(); invPanelEl.classList.add('show') }\n})\n\n/* ==================== 主界面分析区（v0.7）：摘要卡 / 耗时散点 / 工具矩阵 / 失败恢复链 / Agent 图谱 ====================\n   迷宫下方的常规文档流，数据一到即渲染、无需按钮。\n   全部数字都是对已解析判定数据的确定性聚合，不调 LLM；失败恢复链的分类\n   （原样重试/换参数/换工具/未恢复）来自 verdict.js 的 analyzeFailureChains。 */\nconst anaSecEl = document.getElementById('anasec')\nlet anaRefs = []   // 失败链行 / Agent 节点 → { node, laneKey }，点击缩放定位用\nlet sigRows = []   // 行为信号行 → { laneKey, type, nodes: Set, first: {tl,n}|null }，点击淡化其他节点并定位\nlet sigSel = null  // 选中的信号 { laneKey, type }：用键不用下标，实时重渲染信号顺序变了高亮不漂移（评审 P2-5）\nlet sigPanelNode = null  // 选中信号时顺带打开的详情面板对应的节点：这时按一次 Esc 同时关面板、撤选中（实机冒烟：原来要按两次，提示只写了按 Esc）\nconst sigSelRow = () => sigSel === null ? null : (sigRows.find(r => r.laneKey === sigSel.laneKey && r.type === sigSel.type) ?? null)\n/** 取消信号选中（再点同一条 / Esc）：去高亮并撤淡化。 */\nfunction clearSigSel(){\n  sigSel = null\n  sigPanelNode = null\n  anaSecEl.querySelectorAll('.sig.sel').forEach(el => el.classList.remove('sel'))\n  applyFilter()\n}\n\n/* 已结算调用过滤（settledLaneCalls）、分位数（percentile）、区间合并（mergeIntervalsTotal）、\n   工具矩阵（toolMatrix）、请求级失败计数（countRequestFailures）、同任务可比性\n   （taskComparability）都在 verdict.js 可测模块里（构建期注入）——评审抽测点由单元测试固化。 */\n\n/**\n * 该泳道的活动时长（墙钟秒）：节点/工具区间按空闲折叠同口径（IDLE_MIN 内视为连续）\n * 合并后求和。「工具占比」的分母用它而不用总时长——27 小时挂机的会话不该把密集的\n * 工具活动稀释成 1%（对齐线 v0.5.1 起就剔除轮间等待，这里同口径）。\n * 墙钟折算在此完成（映射后节点时间是轴坐标，耗时统计一律读原始 s0/e0），合并规则在可测模块。\n */\nfunction laneActiveTime(lane){\n  const iv = []\n  for (const n of [...lane.main, ...lane.detours]){\n    iv.push([rawS(n), rawE(n)])\n    for (const tl of n.tools ?? []){\n      if (tl.s != null) iv.push([rawS(tl), rawE(tl)])\n    }\n  }\n  return mergeIntervalsTotal(iv, IDLE_MIN)\n}\n\n/** 耗时分布散点图 SVG（字符串构建）：每工具一行，x 轴 sqrt 刻度铺开长尾，\n    点色 = 判定（成功按工具类别色），全局 P50/P95 虚线。颜色全走 CSS 变量，主题切换零重绘。 */\nfunction durScatterSvg(m, calls){\n  const names = [...m.keys()].sort((a, b) => m.get(b).calls - m.get(a).calls)\n  if (names.length === 0 || calls.length === 0) return ''\n  const W = 620, LX = 96, RX = W - 14, ROW = 26, TOP = 18\n  const H = TOP + names.length * ROW + 26\n  const allDurs = calls.map(c => c.tl.dur ?? 0)\n  const dmax = Math.max(0.1, ...allDurs)\n  const xOf = d => LX + Math.sqrt(Math.max(0, d) / dmax) * (RX - LX)\n  const catVar = { read: '--read', search: '--grep', shell: '--bash', edit: '--web', other: '--other' }\n  const vVar = { error: '--err', deadend: '--dead', retry: '--retry' }\n  let s = `<svg viewBox=\"0 0 ${W} ${H}\" width=\"100%\" style=\"display:block\">`\n  // 轴刻度（sqrt 域上挑不挤的档位）\n  const cand = [0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600, 1800, 3600, 14400].filter(t => t < dmax * 0.85)\n  const ticks = cand.filter((_, i) => cand.length <= 5 || i % Math.ceil(cand.length / 5) === 0).concat([dmax])\n  let lastTx = -1e9\n  for (const t of ticks){\n    const x0 = xOf(t)\n    s += `<line x1=\"${x0.toFixed(1)}\" y1=\"${TOP - 6}\" x2=\"${x0.toFixed(1)}\" y2=\"${H - 22}\" class=\"dsc-grid\"/>`\n    if (x0 - lastTx > 34){\n      s += `<text x=\"${x0.toFixed(1)}\" y=\"${H - 9}\" text-anchor=\"middle\" class=\"dsc-tick\">${fmtT(t)}</text>`\n      lastTx = x0\n    }\n  }\n  // 全局 P50/P95 参考线\n  for (const [p, lab] of [[50, 'P50'], [95, 'P95']]){\n    const v = percentile(allDurs, p)\n    const x0 = xOf(v)\n    s += `<line x1=\"${x0.toFixed(1)}\" y1=\"${TOP - 6}\" x2=\"${x0.toFixed(1)}\" y2=\"${H - 22}\" class=\"dsc-pline\"/>`\n    s += `<text x=\"${x0.toFixed(1)}\" y=\"${TOP - 9}\" text-anchor=\"middle\" class=\"dsc-plab\">${lab}</text>`\n  }\n  names.forEach((name, ri) => {\n    const cy = TOP + ri * ROW + ROW / 2\n    s += `<text x=\"4\" y=\"${cy + 1}\" class=\"dsc-row\">${esc(tlabel(name)).slice(0, 10)}</text>`\n    s += `<text x=\"4\" y=\"${cy + 12}\" class=\"dsc-cnt\">×${m.get(name).calls}</text>`\n    s += `<line x1=\"${LX}\" y1=\"${cy}\" x2=\"${RX}\" y2=\"${cy}\" class=\"dsc-grid\" opacity=\".55\"/>`\n    // 每行自己的 P50（实线小刻度）/P95（虚线小刻度）——工具间快慢直接可比\n    const rd = m.get(name).durs\n    for (const [pp, dash] of [[50, ''], [95, '2 2']]){\n      const xv = xOf(percentile(rd, pp))\n      s += `<line x1=\"${xv.toFixed(1)}\" y1=\"${cy - 7}\" x2=\"${xv.toFixed(1)}\" y2=\"${cy + 7}\" style=\"stroke:var(--dim)\" stroke-width=\"1.4\"${dash === '' ? '' : ` stroke-dasharray=\"${dash}\"`} opacity=\".85\"/>`\n    }\n  })\n  calls.forEach((c, i) => {\n    const ri = names.indexOf(c.tl.name)\n    if (ri < 0) return\n    const d = c.tl.dur ?? 0\n    // 确定性抖动（纵 ±7 / 横 ±3），密集同值不叠成一个点；失败点画大一号压在上层\n    const cy = TOP + ri * ROW + ROW / 2 + ((i * 137) % 15) - 7\n    const cx0 = xOf(d) + ((i * 61) % 7) - 3\n    const bad = c.tl.v !== 'ok'\n    const varName = bad ? (vVar[c.tl.v] ?? '--retry') : catVar[toolCat(c.tl.name)]\n    const tip = `${tlabel(c.tl.name)} · ${fmtT(d)} · ${vlabel(c.tl.v)} · ${String(c.tl.args ?? '').slice(0, 70)}`\n    s += `<circle cx=\"${cx0.toFixed(1)}\" cy=\"${cy.toFixed(1)}\" r=\"${bad ? 3.4 : 2.6}\" style=\"fill:var(${varName})\" opacity=\"${bad ? '.85' : '.45'}\" class=\"dsc-dot\" data-tip=\"${esc(tip)}\"/>`\n  })\n  return s + '</svg>'\n}\n\n/** 一个节点消耗的总 token（输入+缓存+输出）；日志未报任何一项时 null。 */\nfunction agTokOf(n){\n  if (n.inTok == null && n.cacheTok == null && n.outTok == null) return null\n  return (n.inTok ?? 0) + (n.cacheTok ?? 0) + (n.outTok ?? 0)\n}\n\n/** Agent 关系图谱 SVG（字符串构建）：星形总览，节点大小 = token、连线粗细 = 调用数。 */\nfunction agentGraphSvg(lane, li){\n  const subs = lane.detours.filter(d => d.sub)\n  if (subs.length === 0) return ''\n  const own = [...lane.main, ...lane.detours].filter(n => !n.sub && !n.evt)\n  const mainTok = own.some(n => agTokOf(n) != null) ? own.reduce((sum, n) => sum + (agTokOf(n) ?? 0), 0) : null\n  const W = 520, CY = 183, R = 118\n  const cx = W / 2\n  const maxTok = Math.max(1, ...subs.map(x => agTokOf(x) ?? 0))\n  const maxCalls = Math.max(1, ...subs.map(x => x.tools.length))\n  const mainVar = `--lane${li + 1}-main`, headVar = `--lane${li + 1}-head`, bgVar = `--lane${li + 1}-bg`\n  let s = `<svg viewBox=\"0 0 ${W} 372\" width=\"100%\" style=\"display:block;max-width:560px;margin:0 auto\">`\n  const pos = subs.map((x, i) => {\n    const ang = -Math.PI / 2 + i * 2 * Math.PI / subs.length\n    return { x: cx + Math.cos(ang) * R, y: CY + Math.sin(ang) * R }\n  })\n  subs.forEach((x, i) => {\n    const w = 1.2 + 4.5 * (x.tools.length / maxCalls)\n    s += `<line x1=\"${cx}\" y1=\"${CY}\" x2=\"${pos[i].x.toFixed(1)}\" y2=\"${pos[i].y.toFixed(1)}\" style=\"stroke:var(--backarc)\" stroke-width=\"${w.toFixed(1)}\" opacity=\".75\"${x.live ? ' stroke-dasharray=\"5 4\"' : ''}/>`\n  })\n  s += `<circle cx=\"${cx}\" cy=\"${CY}\" r=\"34\" style=\"fill:var(${headVar});stroke:var(${mainVar})\" stroke-width=\"2\"/>`\n  s += `<text x=\"${cx}\" y=\"${CY - 3}\" text-anchor=\"middle\" class=\"agname\">${esc(tr('agMain'))}</text>`\n  s += `<text x=\"${cx}\" y=\"${CY + 11}\" text-anchor=\"middle\" class=\"agmeta\">${esc(mainTok != null ? tr('agTok')(mainTok) : tr('agTokNone'))}</text>`\n  subs.forEach((x, i) => {\n    const tok = agTokOf(x)\n    const frac = tok != null ? tok / maxTok : Math.min(1, x.tools.length / maxCalls) * 0.5\n    const r = 15 + 17 * Math.sqrt(Math.min(1, frac))\n    const ai = anaRefs.push({ node: x, laneKey: lane.key }) - 1\n    const above = pos[i].y <= CY\n    s += `<g class=\"agnode\" data-ai=\"${ai}\">`\n      + `<circle cx=\"${pos[i].x.toFixed(1)}\" cy=\"${pos[i].y.toFixed(1)}\" r=\"${r.toFixed(1)}\" style=\"fill:var(${bgVar});stroke:var(${x.live ? '--backarc' : mainVar})\" stroke-width=\"1.6\"${x.live ? ' stroke-dasharray=\"5 4\"' : ''}/>`\n      + `<text x=\"${pos[i].x.toFixed(1)}\" y=\"${(above ? pos[i].y - r - 17 : pos[i].y + r + 13).toFixed(1)}\" text-anchor=\"middle\" class=\"agname\">${esc(nodeLabel(x))}</text>`\n      + `<text x=\"${pos[i].x.toFixed(1)}\" y=\"${(above ? pos[i].y - r - 5 : pos[i].y + r + 25).toFixed(1)}\" text-anchor=\"middle\" class=\"agmeta\">${esc((tok != null ? tr('agTok')(tok) + ' · ' : '') + tr('agCalls')(x.tools.length) + (x.live ? ' · ' + tr('agRunningTag') : ''))}</text>`\n      + `</g>`\n  })\n  return s + '</svg>'\n}\n\n/**\n * 结果与证据块（诊断层第 1 项）：六格（任务完成 / 测试 / 构建 / Lint / 产物 / 人工确认）+ 综合徽标。\n * 聚合全在 verdict.js 的 outcomeEvidence（可测），这里只排版；时间轴折叠后节点坐标不是墙钟，\n * 人工确认的先后比较经 wallClock 还原。测试/构建/Lint 格点击复用失败恢复链的 data-ai 定位。\n */\nfunction outcomeBlockHtml(lane){\n  const oc = outcomeEvidence(lane, wallClock)\n  const names = tr('ocCell')\n  const cell = (key, cls, status, meta, extra, ai) =>\n    `<div class=\"occell\"${ai != null ? ` data-ai=\"${ai}\"` : ''}><div class=\"ol\">${esc(names[key])}</div><div class=\"os ${cls}\">${status}</div>`\n    + (meta ? `<div class=\"om\">${meta}</div>` : '') + (extra ?? '') + `</div>`\n  const tk = oc.task\n  const taskCls = tk.state === 'done' ? 'pass' : tk.state === 'failed' || tk.state === 'noAnswer' ? 'fail' : tk.state === 'running' ? 'warn' : 'none'\n  let cells = cell('task', taskCls, esc(tr('ocTaskS')[tk.state]), esc(tr('ocTask')[tk.state](tk.turn, tk.reason ?? '')))\n  for (const k of ['test', 'build', 'lint']){\n    const g = oc[k]\n    const ai = g.anchor ? anaRefs.push({ node: g.anchor.n, laneKey: lane.key }) - 1 : null\n    const status = g.passed === null ? tr('ocNotRun') : g.passed ? '✓ ' + tr('ocPass') : '✗ ' + tr('ocFail')\n    const cls = g.passed === null ? 'none' : g.passed ? 'pass' : 'fail'\n    // 类别以最后一次运行为准；此前别的命令最后一次失败的条数小字注明（最后一次失败时它本身也在其中，减掉）\n    const prior = g.passed === false ? g.failedCommands - 1 : g.failedCommands\n    const meta = esc((g.runs === 0 ? '' : tr('ocRuns')(g.runs, g.commands) + (prior > 0 ? tr('ocFailedCmds')(prior) : ''))\n      + (g.unresolved > 0 ? (g.runs === 0 ? '' : ' · ') + tr('ocBgUnresolved')(g.unresolved) : ''))\n    const cmdTxt = g.anchorCmd ? g.anchorCmd.replace(/\\s+/g, ' ').trim() : ''\n    const cmd = cmdTxt ? `<div class=\"om cmd\" title=\"${esc(cmdTxt.slice(0, 400))}\">${esc(cmdTxt.slice(0, 80))}${g.anchorExit != null && g.anchorExit !== 0 ? ` · ${esc(tr('ocExit')(g.anchorExit))}` : ''}</div>` : ''\n    cells += cell(k, cls, status, meta, cmd, ai)\n  }\n  const ar = oc.artifacts\n  const list = ar.paths.length > 0\n    ? `<details><summary>${esc(tr('ocPathsToggle'))} ▾</summary><ul class=\"ocpaths\">${ar.paths.map(p => `<li title=\"${esc(p)}\">${esc(p)}</li>`).join('')}</ul></details>` : ''\n  cells += cell('artifacts', ar.paths.length > 0 ? '' : 'none', esc(ar.paths.length > 0 ? tr('ocArtifactsN')(ar.paths.length) : tr('ocArtifactsNone')),\n    ar.writes + ar.failedWrites > 0 ? esc(tr('ocWrites')(ar.writes, ar.failedWrites)) : '', list)\n  const hm = oc.human\n  cells += cell('human', hm.responded === true ? 'pass' : 'none', esc(hm.responded === null ? tr('ocHumanNA') : hm.responded ? tr('ocHumanYes') : tr('ocHumanNo')), '')\n  let sum\n  if (oc.overall === 'unverified') sum = tr('ocSummary').unverified\n  else if (oc.overall === 'done') sum = tr('ocSummary').done(\n    ['test', 'build', 'lint'].filter(k => oc[k].runs > 0).map(k => names[k]).join(' / '),\n    oc.missing.map(k => names[k]).join(' / '))\n  else {\n    const reasons = []\n    if (oc.task.state !== 'done') reasons.push(tr('ocReason').task)\n    for (const k of oc.failedKinds) reasons.push(tr('ocReason')[k])\n    sum = tr('ocSummary').partial(reasons)\n  }\n  return `<div class=\"anablock\" style=\"margin-bottom:10px\"><div class=\"ochead\"><div class=\"bt\">${esc(tr('ocHeader'))}</div>`\n    + `<span class=\"ocverdict ${oc.overall}\">${esc(tr('ocOverall')[oc.overall])}</span><span class=\"ocsum\">${esc(sum)}</span></div>`\n    + `<div class=\"ocgrid\">${cells}</div>`\n    + (oc.codeCalls > 0 ? `<div class=\"ocnote\">${esc(tr('ocCode')(oc.codeCalls))}</div>` : '')\n    + `<div class=\"anahint\">${esc(tr('ocHint'))}</div></div>`\n}\n\n/** 行为信号块（诊断层第 2 项）：聚合在 verdict.js 的 behaviorSignals（可测），这里只排版；点击走 sigSel 淡化 + 定位。 */\nfunction signalsBlockHtml(lane){\n  const sigs = behaviorSignals(lane, wallClock)\n  if (sigs.length === 0) return `<div class=\"anahint\">${esc(tr('sigNone'))}</div><div class=\"anahint\">${esc(tr('sigHint'))}</div>`\n  let h = '<div class=\"sigwrap\">'\n  for (const s of sigs){\n    const nodes = new Set(s.refs.map(r => r.n))\n    const first = s.refs[0] ?? null\n    const idx = sigRows.push({ laneKey: lane.key, type: s.type, nodes, first }) - 1\n    const clickable = nodes.size > 0\n    const selected = sigSel !== null && sigSel.laneKey === lane.key && sigSel.type === s.type\n    h += `<div class=\"sig${selected ? ' sel' : ''}\"${clickable ? ` data-sig=\"${idx}\"` : ''}>`\n      + `<span class=\"sigsev ${s.severity}\">${esc(tr('sigSev')[s.severity])}</span>`\n      + `<span class=\"sname\">${esc(tr('sigName')[s.type] ?? s.type)}</span>`\n      + `<span class=\"swhy\">${esc(whyText(s.why))}</span>`\n      + (s.count > 0 ? `<span class=\"scnt\">${esc(tr('sigCalls')(s.count))}</span>` : '')\n      + `</div>`\n  }\n  return h + `</div><div class=\"anahint\">${esc(tr('sigHint'))}</div>`\n}\n\n/**\n * 优化建议块（诊断层第 6 项）：分析区末尾。每条建议都是 verdict.js 的 suggestions 里按校准阈值挑出来的，\n * 文案自带本场实测数字；有涉及调用的可点，复用行为信号的淡化+定位机制。\n */\nfunction suggestionsBlockHtml(lane){\n  const sugs = suggestions(lane, wallClock)\n  const head = `<div class=\"bt\">${tr('sugTitle')}<span class=\"cchint\">${tr('sugHint')}</span></div>`\n  if (sugs.length === 0) return `<div class=\"anablock\">${head}<div class=\"anahint\">${esc(tr('sugNone'))}</div></div>`\n  let h = `<div class=\"anablock\">${head}<div class=\"sigwrap\">`\n  for (const sg of sugs){\n    const nodes = new Set((sg.refs ?? []).map(r => r.n).filter(Boolean))\n    const first = (sg.refs ?? [])[0] ?? null\n    const type = 'sug:' + sg.key\n    const idx = sigRows.push({ laneKey: lane.key, type, nodes, first }) - 1\n    const clickable = nodes.size > 0\n    const selected = sigSel !== null && sigSel.laneKey === lane.key && sigSel.type === type\n    h += `<div class=\"sig${selected ? ' sel' : ''}\"${clickable ? ` data-sig=\"${idx}\"` : ''}>`\n      + `<span class=\"sigsev ${sg.severity}\">${esc(tr('sigSev')[sg.severity])}</span>`\n      + `<span class=\"sname\">${esc(tr('sugName')[sg.key] ?? sg.key)}</span>`\n      + `<span class=\"swhy\">${esc(whyText(sg.why))}</span>`\n      + `</div>`\n  }\n  return h + `</div><div class=\"anahint\">${esc(tr('sugNote'))}</div></div>`\n}\n\n/**\n * 上下文构成块（诊断层第 4 项）：把「上下文里装了什么」按**字符数**估出来画一条堆叠条。\n * 诚实边界：日志没有分段 token，这里一律是字符估算，不换算成 token；指令文件只有路径与摘要，\n * 只报文件数；实时页签只有已加载窗口，注明部分是窗口内统计。\n */\nfunction ctxCompositionBlockHtml(lane){\n  const c = lane.context\n  if (!c) return ''\n  const parts = [\n    { key: 'sys', chars: c.sys, color: '#6d55a3' },\n    { key: 'skills', chars: c.skills ? c.skills.chars : null, color: '#2f7d5f' },\n    { key: 'plugin', chars: c.plugin && c.plugin.length ? c.plugin.reduce((n, x) => n + x.chars, 0) : null, color: '#a06a35' },\n    { key: 'tool', chars: c.tool, color: '#8a93a3' },\n    { key: 'user', chars: c.user, color: '#a04b62' },\n    { key: 'assistant', chars: c.assistant, color: '#4f7ca8' },\n  ].filter(x => x.chars != null && x.chars > 0)\n  const instr = c.instr ?? 0\n  const loaded = c.loaded ?? []\n  if (parts.length === 0 && instr === 0 && !c.skills) return ''\n  const total = parts.reduce((n, x) => n + x.chars, 0)\n  const nm = tr('ccName')\n  const bar = total > 0\n    ? '<div class=\"ccbar\">' + parts.map(x => `<span class=\"ccseg\" style=\"flex:${x.chars} 0 0;background:${x.color}\" title=\"${esc(nm[x.key] + ' ' + x.chars.toLocaleString() + ' 字符')}\"></span>`).join('') + '</div>'\n    : ''\n  const rows = parts.map(x => `<span class=\"ccrow\"><i class=\"ccsw\" style=\"background:${x.color}\"></i>${esc(nm[x.key])} <b class=\"ccnum\">${x.chars.toLocaleString()}</b><span class=\"ccpct\">${Math.round(x.chars / Math.max(1, total) * 100)}%</span></span>`).join('')\n  const extras = []\n  if (c.skills) extras.push(tr('ccSkills')(c.skills.n, loaded.length, loaded.slice(0, 4).map(x => esc(x)).join('、')))\n  if (instr > 0) extras.push(tr('ccInstr')(instr))\n  if (c.plugin && c.plugin.length) extras.push(tr('ccPlugins')(c.plugin.length))\n  return `<div class=\"anablock\"><div class=\"bt\">${tr('ccTitle')}<span class=\"cchint\">${tr('ccHint')}</span></div>`\n    + bar + `<div class=\"cclist\">${rows}</div>`\n    + (extras.length ? `<div class=\"ccnote\">${extras.join(' · ')}</div>` : '')\n    + (c.live ? `<div class=\"ccnote\">${tr('ccLiveNote')}</div>` : '')\n    + `</div>`\n}\n\n/**\n * 对比变量表（诊断层第 5 项）：同任务多次跑时，先列「除任务外的条件」是否一致。\n * 只有「除模型外全部相同且都有记录」才是受控对比，差额才能算到模型头上；\n * 有变量不同 → 探索性对比并点名；只差在日志没记录的项 → 疑似受控（不冒充受控）。\n */\nfunction compareVarBlockHtml(vars, verdict){\n  const nm = tr('cvName')\n  const st = { same: tr('cvSame'), diff: tr('cvDiff'), unknown: tr('cvUnknown') }\n  const cls = { same: 's-same', diff: 's-diff', unknown: 's-unknown' }\n  let rows = ''\n  for (const v of vars){\n    if (v.key === 'model') continue\n    rows += `<tr><td>${esc(nm[v.key] ?? v.key)}</td>`\n    for (const val of v.values) rows += `<td class=\"v\" title=\"${esc(val ?? '')}\">${val === null ? esc(tr('cvNoRecord')) : esc(val)}</td>`\n    rows += `<td class=\"${cls[v.state]}\">${esc(st[v.state])}</td></tr>`\n  }\n  const modelVar = vars.find(v => v.key === 'model')\n  const vals = (modelVar?.values ?? []).map(v => v === null ? tr('cvNoRecord') : v)\n  rows += `<tr><td><b>${esc(nm.model)}</b></td>` + vals.map(v => `<td class=\"v\">${esc(v)}</td>`).join('') + `<td>${esc(st[modelVar?.state ?? 'unknown'])}</td></tr>`\n  const heads = DATA.lanes.map((_, i) => `<th>${tr('cvLane')(i + 1)}</th>`).join('')\n  const vc = verdict.kind === 'controlled' ? 'cv-ok' : verdict.kind === 'likely' ? 'cv-likely' : 'cv-explore'\n  const names = k => esc(nm[k] ?? k)\n  const text = verdict.kind === 'controlled'\n    ? tr('cvControlled')(vals.join(' vs '))\n    : verdict.kind === 'likely'\n      ? tr('cvLikely')(verdict.unknownKeys.length, verdict.unknownKeys.map(names).join('、'))\n      : tr('cvExploratory')(verdict.diffKeys.length, verdict.diffKeys.map(names).join('、'))\n  return `<div class=\"anablock\"><div class=\"bt\">${tr('cvTitle')}<span class=\"cchint\">${tr('cvHint')}</span></div>`\n    + `<div class=\"cvverdict ${vc}\">${text}</div>`\n    + `<table class=\"anatbl cvtbl\"><thead><tr><th>${tr('cvVar')}</th>${heads}<th>${tr('cvState')}</th></tr></thead><tbody>${rows}</tbody></table></div>`\n}\n\nfunction renderAnalysis(){\n  if (!DATA) return\n  anaRefs = []\n  sigRows = []\n  let h = ''\n  // 同任务对比：先回答「这两次跑除了模型以外，别的是不是一样」——否则后面的差额结论会误导\n  if (cmpOn()){\n    const vars = comparisonVariables(DATA.lanes)\n    h += compareVarBlockHtml(vars, controlledVerdict(vars))\n  }\n  DATA.lanes.forEach((lane, li) => {\n    const calls = settledLaneCalls(lane)\n    // 恢复链在墙钟坐标上算（映射只改 s/e，恢复耗时必须是真实秒数）\n    const chains = analyzeFailureChains(calls.map(c => ({\n      name: c.tl.name, args: c.tl.args ?? '', v: c.tl.v,\n      s: rawS(c.tl), e: c.tl.e != null ? rawE(c.tl) : null,\n    })))\n    const m = toolMatrix(calls.map(c => c.tl))\n    const fails = chains.length\n    const rec = chains.filter(c => c.recovered).length\n    let mostTool = null, mostN = 0\n    for (const [name, g] of m) if (g.error > mostN){ mostN = g.error; mostTool = name }\n    let longTool = null, longD = 0, sumD = 0\n    for (const { tl } of calls){\n      const d = tl.dur ?? 0\n      sumD += d\n      if (d > longD){ longD = d; longTool = tl.name }\n    }\n    // 分母 = 活动时长（挂机空闲剔除）；并行调用的时长求和可超墙钟，钳到 100%\n    const active = laneActiveTime(lane)\n    const share = active > 0 ? Math.min(100, Math.round(sumD / active * 100)) : 0\n    const own = [...lane.main, ...lane.detours].filter(n => !n.sub && !n.evt)\n    // 上下文占用按每次请求当时的模型换算窗口（contextOccupancy）；窗口表过时退回绝对 token\n    const occ = contextOccupancy(lane)\n    const ctxPeak = occ.samples.length > 0 ? occ.peakTok : null\n    const win = occ.valid && ctxPeak != null ? occ.peakWin : null\n    const ctxPct = win != null ? Math.round(occ.peakRatio * 1000) / 10 : null\n    // 请求级失败（llm/retry / turn/end error）不属于工具统计，但一个全程失败的会话\n    // 不能在这张卡上亮绿灯——单独计数列在卡内。\n    const evtFails = countRequestFailures(lane)\n\n    if (DATA.lanes.length > 1) h += `<div class=\"analane\">${laneName(lane)}<span class=\"m\">${esc(lane.fname ?? lane.model ?? '')}</span></div>`\n    // 结果与证据先于三卡：先回答「做成没有、凭什么说做成」，再看过程指标\n    h += outcomeBlockHtml(lane)\n    h += `<div class=\"anacards\">`\n    h += `<div class=\"anacard\"><div class=\"num\">01</div><div><div class=\"t\">${tr('cardFail')}</div><div class=\"v\">`\n      + (fails === 0 && evtFails === 0 ? `<span class=\"good\">${tr('cardFailNone')}</span>`\n        : (fails === 0 ? ''\n          : `${tr('cardFailBody')(fails, calls.length, mostTool ? esc(tlabel(mostTool)) : '', mostN)}<br>`\n            + `${tr('cardFailRec')(rec, fails, ANALYSIS_RULES.RECOVERY_WINDOW)} · `\n            + `<span class=\"${fails / Math.max(1, calls.length) > 0.1 ? 'warn' : ''}\">${tr('cardFailRate')(Math.round(fails / Math.max(1, calls.length) * 100))}</span>`)\n          + (evtFails > 0 ? `${fails > 0 ? '<br>' : ''}<span class=\"warn\">${tr('cardFailEvt')(evtFails)}</span>` : ''))\n      + `</div></div></div>`\n    h += `<div class=\"anacard\"><div class=\"num\">02</div><div><div class=\"t\">${tr('cardTime')}</div><div class=\"v\">`\n      + (longTool ? tr('cardTimeBody')(esc(tlabel(longTool)), fmtT(longD)) + '<br>' : '')\n      + tr('cardTimeShare')(share) + `</div></div></div>`\n    h += `<div class=\"anacard\"><div class=\"num\">03</div><div><div class=\"t\">${tr('cardCtx')}</div><div class=\"v\">`\n      + (ctxPeak == null ? tr('cardCtxNone')\n        : win != null\n          ? (() => {\n              const p = ctxPct\n              return tr('cardCtxPct')(occ.peakNode ? (occ.peakNode.inTok ?? 0) + (occ.peakNode.cacheTok ?? 0) : ctxPeak, p) + '<br>'\n                + (p >= 90 ? `<span class=\"warn\">${tr('cardCtxOver')(90)}</span>`\n                  : p >= 70 ? `<span class=\"warn\">${tr('cardCtxOver')(70)}</span>`\n                  : `<span class=\"good\">${tr('cardCtxUnder')}</span>`)\n            })()\n          : tr('cardCtxAbs')(ctxPeak))\n      + `</div></div></div>`\n    h += `</div>`\n\n    // 上下文里装了什么：先回答「模型每次都带着什么在读」，再看下面的耗时/矩阵\n    h += ctxCompositionBlockHtml(lane)\n\n    // 双列：耗时散点 | 工具结果矩阵\n    const names = [...m.keys()].sort((a, b) => m.get(b).calls - m.get(a).calls)\n    let tbl = `<table class=\"anatbl\"><thead><tr>`\n      + `<th>${tr('mtTool')}</th><th>${tr('mtCalls')}</th><th>${tr('mtOk')}</th><th>${tr('mtErr')}</th><th>${tr('mtDead')}</th><th>${tr('mtRetry')}</th><th>${tr('mtRate')}</th>`\n      + `<th>${tr('mtP50')}</th><th>${tr('mtP95')}</th><th>${tr('mtMax')}</th></tr></thead><tbody>`\n    for (const name of names){\n      const g = m.get(name)\n      const rate = Math.round(g.ok / g.calls * 100)\n      tbl += `<tr><td>${esc(tlabel(name))}</td><td>${g.calls}</td><td>${g.ok}</td>`\n        + `<td class=\"err\">${g.error > 0 ? g.error : ''}</td><td class=\"dead\">${g.deadend > 0 ? g.deadend : ''}</td><td class=\"rt\">${g.retry > 0 ? g.retry : ''}</td>`\n        + `<td>${rate}%<span class=\"okbar\"><i style=\"width:${rate}%\"></i></span></td>`\n        + `<td>${fmtT(percentile(g.durs, 50))}</td><td>${fmtT(percentile(g.durs, 95))}</td><td>${fmtT(Math.max(0, ...g.durs))}</td></tr>`\n    }\n    tbl += `</tbody></table>`\n    h += `<div class=\"anagrid\">`\n      + `<div class=\"anablock\"><div class=\"bt\">${tr('anaDur')}</div>${durScatterSvg(m, calls)}</div>`\n      + `<div class=\"anablock\"><div class=\"bt\">${tr('anaMatrix')}</div>${tbl}</div>`\n      + `</div>`\n\n    // 双列：失败恢复链 | Agent 图谱（有子代理才有）\n    let chainsHtml = ''\n    if (chains.length === 0) chainsHtml = `<div class=\"anahint\">${tr('chainsNone')}</div>`\n    else {\n      // 未恢复的排最前，其余按恢复耗时降序——最该看的失败在最上面\n      const order = [...chains].sort((a, b) =>\n        a.recovered !== b.recovered ? (a.recovered ? 1 : -1) : (b.recoverSec ?? Infinity) - (a.recoverSec ?? Infinity))\n      chainsHtml = '<div class=\"chainwrap\">'\n      for (const c of order){\n        const ref = calls[c.i]\n        const ai = anaRefs.push({ node: ref.n, laneKey: lane.key }) - 1\n        const recTxt = c.recoverSec == null ? tr('chainNoRec') : c.recovered ? tr('chainRec')(c.recoverSec) : tr('chainRecSlow')(c.recoverSec)\n        chainsHtml += `<div class=\"chain\" data-ai=\"${ai}\"><span class=\"cid\">${esc(nodeLabel(ref.n))}</span>`\n          + `<span class=\"cmeta\">${esc(tlabel(c.name))} · ${esc(String(ref.tl.args ?? '').slice(0, 60))} · ${esc(recTxt)}</span>`\n          + `<span class=\"chaintag ${c.mode}\">${esc(tr('chainTag')[c.mode])}</span></div>`\n      }\n      chainsHtml += `</div><div class=\"anahint\">${tr('anaChainHint')}</div>`\n    }\n    // 双列：失败恢复链 | 行为信号（无信号时也显示，说明「本场没有触发」）；Agent 图谱（有子代理才有）独占一行\n    h += `<div class=\"anagrid\">`\n      + `<div class=\"anablock\"><div class=\"bt\">${tr('anaChains')}</div>${chainsHtml}</div>`\n      + `<div class=\"anablock\"><div class=\"bt\">${tr('anaSignals')}</div>${signalsBlockHtml(lane)}</div>`\n      + `</div>`\n    const agSvg = agentGraphSvg(lane, li)\n    if (agSvg) h += `<div class=\"anablock\" style=\"margin-bottom:10px\"><div class=\"bt\">${tr('agHeader')}</div>${agSvg}<div class=\"anahint\">${tr('agHint')}</div></div>`\n    // 优化建议放最末：前面几块给证据，这一块给「下一步改什么」\n    h += suggestionsBlockHtml(lane)\n  })\n  anaSecEl.innerHTML = h\n}\n\n/** 分析/图谱面板共用的「缩放到节点并打开详情」。 */\nfunction zoomToNode(ref){\n  const lane = DATA.lanes.find(l => l.key === ref.laneKey)\n  if (!lane) return\n  const n = ref.node\n  const span = Math.max((n.e - n.s) * 4, 20)\n  const mid = (n.s + n.e) / 2\n  setViewWindow(mid - span / 2, mid + span / 2)\n  openPanel(n, lane, lane.main.includes(n))\n}\n\nanaSecEl.addEventListener('click', ev => {\n  const sigRow = ev.target.closest('[data-sig]')\n  if (sigRow){\n    // 行为信号：再点同一条取消；否则淡化其他节点、缩放到该段第一个调用并打开详情\n    const r = sigRows[+sigRow.getAttribute('data-sig')]\n    if (!r) return\n    const wasSel = sigSel !== null && sigSel.laneKey === r.laneKey && sigSel.type === r.type\n    sigSel = wasSel ? null : { laneKey: r.laneKey, type: r.type }\n    anaSecEl.querySelectorAll('.sig.sel').forEach(el => el.classList.remove('sel'))\n    if (!wasSel) sigRow.classList.add('sel')\n    applyFilter()\n    if (!wasSel){\n      if (r.first){ zoomToNode({ node: r.first.n, laneKey: r.laneKey }); sigPanelNode = r.first.n }\n      svgWrapEl.scrollIntoView({ behavior: 'smooth', block: 'start' })\n    }\n    return\n  }\n  const row = ev.target.closest('[data-ai]')\n  if (!row) return\n  const ref = anaRefs[+row.getAttribute('data-ai')]\n  if (!ref) return\n  zoomToNode(ref)\n  // 分析区在迷宫下方——定位后把迷宫滚回视口，否则缩放发生在屏幕外看不见\n  svgWrapEl.scrollIntoView({ behavior: 'smooth', block: 'start' })\n})\n\n// 散点图点位悬停：data-tip 直出（事件委托，重渲染零残留）\nanaSecEl.addEventListener('mouseover', ev => {\n  const dot = ev.target.closest('.dsc-dot')\n  if (!dot) return\n  const tip = document.getElementById('tip')\n  tip.innerHTML = `<div class=\"th\">${esc(dot.getAttribute('data-tip') ?? '')}</div>`\n  tip.style.display = 'block'\n  placeTip(ev)\n})\nanaSecEl.addEventListener('mouseout', ev => {\n  if (ev.target.closest('.dsc-dot')) document.getElementById('tip').style.display = 'none'\n})\n\ndocument.getElementById('btnTracks').addEventListener('click', () => {\n  tracksOn = !tracksOn\n  document.getElementById('btnTracks').classList.toggle('on', tracksOn)\n  queueBuild()\n})\n\ndocument.getElementById('btnAxis').addEventListener('click', () => {\n  setAxisMode(AXIS_MODE === 'step' ? 'time' : 'step')\n})\n\n/* ==================== 导出：当前视图 SVG / PNG（2x），固定浅色底 ==================== */\nfunction serializeSvg(){\n  // 导出面向分享，固定浅色：暗色下临时切浅色全量重建，序列化完立即切回。\n  // 内联进 SVG 的 CSS 含暗色覆盖块，但导出的 svg 根没有 data-theme，浅色变量恒生效。\n  const wasDark = THEME === 'dark'\n  if (wasDark) setTheme('light', true)\n  try {\n    const vb = svg.getAttribute('viewBox').split(/\\s+/).map(Number)\n    const clone = svg.cloneNode(true)\n    clone.setAttribute('xmlns', NS)\n    // 滚动模式给 #svg 设了内联 style.height，克隆里它会盖过下面的 height 属性，导出就变形\n    clone.removeAttribute('style')\n    clone.setAttribute('width', vb[2])\n    clone.setAttribute('height', vb[3])\n    // 页面样式是 <style> 类 + 属性混合，序列化时把全部 CSS 内联进 SVG（body 级选择器在 SVG 内不命中，无害）\n    const css = []\n    for (const sh of document.styleSheets){\n      try { for (const r of sh.cssRules) css.push(r.cssText) } catch { /* 同源内联样式表，正常可读 */ }\n    }\n    const st = el('style', {})\n    st.textContent = css.join('\\n')\n    clone.insertBefore(st, clone.firstChild)\n    const bg = el('rect', { x: vb[0], y: vb[1], width: vb[2], height: vb[3], fill: getComputedStyle(document.body).backgroundColor || '#ffffff' })\n    clone.insertBefore(bg, st.nextSibling)\n    return new XMLSerializer().serializeToString(clone)\n  } finally {\n    if (wasDark) setTheme('dark', true)\n  }\n}\n\nfunction dlBlob(blob, name){\n  const a = document.createElement('a')\n  a.href = URL.createObjectURL(blob)\n  a.download = name\n  document.body.appendChild(a)\n  a.click()\n  a.remove()\n  setTimeout(() => URL.revokeObjectURL(a.href), 4000)\n}\n\nconst expName = () => 'dsh-maze-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)\n\ndocument.getElementById('btnExpSvg').addEventListener('click', () => {\n  dlBlob(new Blob([serializeSvg()], { type: 'image/svg+xml' }), expName() + '.svg')\n})\n\ndocument.getElementById('btnExpPng').addEventListener('click', () => {\n  const vb = svg.getAttribute('viewBox').split(/\\s+/).map(Number)\n  const url = URL.createObjectURL(new Blob([serializeSvg()], { type: 'image/svg+xml' }))\n  const img = new Image()\n  img.onload = () => {\n    const cv = document.createElement('canvas')\n    cv.width = Math.round(vb[2] * 2)\n    cv.height = Math.round(vb[3] * 2)\n    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)\n    URL.revokeObjectURL(url)\n    cv.toBlob(b => { if (b) dlBlob(b, expName() + '.png'); else showErr(tr('errPngCanvas')) }, 'image/png')\n  }\n  img.onerror = () => { URL.revokeObjectURL(url); showErr(tr('errPngRaster')) }\n  img.src = url\n})\n\n/**\n * One step as a duration capsule: a rounded bar spanning x(s)→x(e) (minimum\n * width for sub-pixel steps), verdict-colored, so a 3-minute bash and a 0.2s\n * read no longer look identical. The icon sits at the bar center, or at the\n * left cap when the bar is wide enough to carry an inline duration label.\n */\nfunction drawNode(parent, lane, n, y, isMain, idx){\n  const g = el('g', { class: 'node' })\n  // 主干推进节点用泳道主色（与主干线一体），绿色只留给「最终回答」——\n  // 图例语义本就是绿 = 最终回答，成功步骤染绿会把主干糊成一条绿带。\n  const c = isMain && n.v === 'ok' ? MAIN_COLOR[lane.key] : (VCOLOR[n.v] ?? '#b6c0d2')\n  const h = isMain ? 16 : 12\n  const bx0 = x(n.s), bx1 = x(n.e)\n  const w = Math.max(bx1 - bx0, 8)\n  const rx0 = bx1 - bx0 >= 8 ? bx0 : (bx0 + bx1) / 2 - w / 2\n  const cx = rx0 + w / 2\n  g.appendChild(el('rect', { class: 'nbar', x: rx0, y: y - h / 2, width: w, height: h, rx: h / 2, fill: c, opacity: '0' }))\n  const wide = w >= 64\n  // 条内文字用画布底色反压（写死白色在暗色主题的浅色条上只有 2.6:1 对比度）\n  const icon = el('text', { x: wide ? rx0 + 10 : cx, y: y + 3.5, 'text-anchor': 'middle', class: 'node-icon', fill: SVGC.nodeline })\n  if (isMain){\n    icon.textContent = n.v === 'answer' ? '' : '✓'\n    icon.style.fontSize = n.v === 'answer' ? '0' : '10px'\n  } else {\n    // 请求重试标记（evt='retry'）判定虽是 error，图标用 ↻ 表达「失败后在等重试」\n    icon.textContent = n.evt === 'retry' ? '↻' : n.v === 'error' ? '✗' : (n.v === 'retry' ? '↻' : (n.v === 'deadend' ? '·' : '○'))\n    icon.style.fontSize = n.v === 'error' && n.evt !== 'retry' ? '11px' : '12px'\n    icon.style.fontWeight = '700'\n  }\n  g.appendChild(icon)\n  if (wide){\n    const dur = el('text', { x: cx, y: y + 3, 'text-anchor': 'middle', class: 'node-icon', fill: SVGC.nodeline })\n    dur.style.fontSize = '9px'\n    dur.textContent = fmtT(Math.max(n.e - n.s, 0))\n    g.appendChild(dur)\n  }\n  // 并行工具分行（瀑布惯例）：一步 ≥2 次调用时，每次调用画成胶囊条下方的细小条，\n  // 按各自起止摆位、按各自判定上色；悬停显示该调用详情，点击仍开整步面板。\n  // 仅主干步分行：支路节点的纵向空间是固定泳道格，保持「+N」标签（详情面板已列全）。\n  const parH = isMain ? (LAYOUT[lane.key].parH ?? 0) : 0\n  if (isMain && n.tools.length >= 2){\n    n.tools.forEach((tl, ti) => {\n      const ty = y + 12 + ti * 9\n      const tx0 = x(tl.s), tx1 = x(tl.e ?? tl.s)\n      const tw = Math.max(tx1 - tx0, 5)\n      const bar = el('rect', { class: 'nbar subbar', x: tx1 - tx0 >= 5 ? tx0 : (tx0 + tx1) / 2 - tw / 2, y: ty, width: tw, height: 7, rx: 3.5, fill: tl.e == null ? SVGC.back : (tl.v === 'ok' ? MAIN_COLOR[lane.key] : VCOLOR[tl.v] ?? VCOLOR.retry), opacity: '0' })\n      bar._tool = tl\n      bar._toolNode = n\n      bar._toolLane = lane\n      bar.addEventListener('mouseenter', onToolHover)\n      bar.addEventListener('mouseleave', offToolHover)\n      g.appendChild(bar)\n    })\n  }\n  // 支路标签按槽位共行：复用同一槽的相邻支路靠 labRows 抑制标签重叠。\n  const rowKey = isMain ? (idx % 2 ? 'u' : 'd') : ('det' + (n._lane ?? idx))\n  const labY = isMain ? y + (idx % 2 ? -17 : 28 + parH) : y + 24\n  const lab = el('text', { x: cx, y: labY, 'text-anchor': 'middle', class: 'nlabel' })\n  let toolTxt = ''\n  // 实时模式的 in-flight 步在「推理中、尚无工具调用」阶段 tools 为空且 v='ok'——\n  // 无保护取 tools[0] 会抛错打断 build()，整图停在初始透明度（实测：每个新步骤开始时全图消失）。\n  if (n.v !== 'answer' && n.tools.length > 0){\n    const t0 = n.tools[0]\n    toolTxt = tlabel(t0.name) + (n.tools.length > 1 ? ' +' + (n.tools.length - 1) : '')\n  }\n  // 子代理等携带 label 的节点用自己的标签，不暴露内部 step 编号。\n  // 稀疏模式（当前窗口可见步数超阈值）只标要紧的：回答/请求级失败/子代理/够宽的失败步/长步——\n  // 密集会话整图态不再满屏叠字，放大后可见步数下降、标签自动逐级补齐。\n  const short = nodeLabel(n)\n  const full = short + (toolTxt ? ' ' + toolTxt : '')\n  const keepInSparse = n.v === 'answer' || n.evt != null || n.sub === true\n    || (n.v !== 'ok' && w >= SPARSE_RULES.KEEP_FAIL_W) || w >= SPARSE_RULES.KEEP_LONG_W\n  if (lane._sparse && !keepInSparse){\n    lab.textContent = ''\n  } else {\n    const key = lane.key + '-' + rowKey\n    const prevEnd = labRows[key] !== undefined ? labRows[key] : -1e9\n    if (cx - prevEnd >= wEst(full) + 12){\n      lab.textContent = full\n      labRows[key] = cx + wEst(full) / 2\n    } else if (cx - prevEnd >= 26){\n      lab.textContent = short\n      labRows[key] = cx + 10\n    } else {\n      lab.textContent = ''\n    }\n  }\n  g.appendChild(lab)\n  g._node = n; g._lane = lane; g._isMain = isMain; g._y = y; g._det = isMain ? null : n\n  g.addEventListener('mouseenter', onHover)\n  g.addEventListener('mouseleave', offHover)\n  g.addEventListener('click', onNodeClick)\n  parent.appendChild(g)\n  return { g }\n}\n\nlet hoverDet = null\nlet pinnedDet = null   // detour pinned by the open detail panel; keeps its highlight while hovering elsewhere\nfunction onArcHover(e){\n  hoverDet = e.currentTarget._det\n  showTipFor(hoverDet)\n  render()\n}\nfunction offArcHover(){\n  hoverDet = null\n  document.getElementById('tip').style.display = 'none'\n  render()\n}\nfunction showTipFor(d){\n  const lane = DATA.lanes.find(l => l.key === d._laneKey) ?? DATA.lanes[0]\n  const tip = document.getElementById('tip')\n  const sub = d.sub === true\n  let inner = `<div class=\"th\">${laneName(lane)} ${nodeLabel(d)} · ${nodeKindLabel(d, false)} · ${vlabel(d.v)}${d.v === 'error' && !d.evt ? tr('rejected') : ''}</div>`\n  if (d.why) inner += `<div class=\"rs\">${tr('whyLabel')}${esc(whyText(d.why, d.why2))}</div>`\n  inner += `<div class=\"rs\">${tr('spanTo')(fmtT(rawS(d)), fmtT(rawE(d)))}${tr('durP')(rawDur(d).toFixed(1))}${d.evt ? '' : ' · ' + rzLabel(d)}</div>`\n  inner += d.evt ? ''\n    : sub\n    ? `<div class=\"back\">${tr('subSpawn')(d.attach, d.live === true)}</div>`\n    : `<div class=\"back\">${tr('outCurve')(d.attach, fmtT(rawS(d)), fmtT(rawE(d)))}</div>`\n      + `<div class=\"back\">${tr('deadReturn')(d.attach)}</div>`\n  d.tools.forEach(t => {\n    inner += `<pre><b>${tlabel(t.name)}</b> (${t.dur}s) ${t.v === 'error' ? '✗' : (t.v === 'retry' ? '↻' : '')}\\n${esc(t.args)}</pre>`\n    if (t.res) inner += `<div class=\"rs\">${tr('resultLabel')}<pre>${esc(t.res)}</pre></div>`\n  })\n  if (d.rzTxt) inner += `<div class=\"rs\">${tr('rzExcerpt')}${esc(d.rzTxt)}</div>`\n  tip.innerHTML = inner\n  tip.style.display = 'block'\n}\nfunction onHover(e){\n  const g = e.currentTarget, n = g._node\n  hoverDet = n._id ? n : null\n  render()\n  const lane = g._lane\n  let inner = `<div class=\"th\">${laneName(lane)} ${nodeLabel(n)} · ${nodeKindLabel(n, g._isMain)} · ${vlabel(n.v)}${n.v === 'error' && !n.evt ? tr('rejected') : ''}</div>`\n  if (n.v !== 'answer'){\n    if (n.why) inner += `<div class=\"rs\">${tr('whyLabel')}${esc(whyText(n.why, n.why2))}</div>`\n    inner += `<div class=\"rs\">${tr('spanTo')(fmtT(rawS(n)), fmtT(rawE(n)))}${tr('durP')(rawDur(n).toFixed(1))}${n.evt ? '' : ' · ' + rzLabel(n)}</div>`\n    if (!g._isMain && !n.evt){\n      inner += n.sub\n        ? `<div class=\"back\">${tr('subSpawn')(n.attach, n.live === true)}</div>`\n        : `<div class=\"back\">${tr('deadReturn')(n.attach)}</div>`\n    }\n    if (g._nAtt) inner += `<div class=\"back\">${tr('branchOrigin')(g._nAtt)}</div>`\n    n.tools.forEach(t => {\n      inner += `<pre><b>${tlabel(t.name)}</b> (${t.dur}s) ${t.v === 'error' ? '✗' : (t.v === 'retry' ? '↻' : '')}\\n${esc(t.args)}</pre>`\n      if (t.res) inner += `<div class=\"rs\">${tr('resultLabel')}<pre>${esc(t.res)}</pre></div>`\n    })\n    if (n.rzTxt) inner += `<div class=\"rs\">${tr('rzExcerpt')}${esc(n.rzTxt)}</div>`\n  }\n  const tip = document.getElementById('tip')\n  tip.innerHTML = inner\n  tip.style.display = 'block'\n  let px = e.clientX + 14, py = e.clientY + 14\n  if (px + 640 > window.innerWidth) px = e.clientX - 640\n  if (py + 400 > window.innerHeight) py = e.clientY - 400\n  tip.style.left = px + 'px'; tip.style.top = py + 'px'\n}\nfunction offHover(){\n  hoverDet = null\n  document.getElementById('tip').style.display = 'none'\n  render()\n}\n/* 并行分行小条的悬停：只讲这一次调用；离开即收（回到胶囊条重新悬停可看整步）。 */\nfunction onToolHover(e){\n  const bar = e.currentTarget\n  const tl = bar._tool, lane = bar._toolLane, n = bar._toolNode\n  const tip = document.getElementById('tip')\n  let inner = `<div class=\"th\">${laneName(lane)} S${n.step} · ${tr('parallelCall')} ${esc(tlabel(tl.name))} · ${vlabel(tl.v)}</div>`\n  inner += `<div class=\"rs\">${tr('spanTo')(fmtT(rawS(tl)), tl.e != null ? fmtT(rawE(tl)) : tr('running'))}${tl.dur != null ? tr('durP')(tl.dur) : ''}</div>`\n  if (tl.why) inner += `<div class=\"rs\">${tr('whyLabel')}${esc(whyText(tl.why, tl.why2))}</div>`\n  inner += `<pre>${esc(tl.args || tr('noArgs'))}</pre>`\n  if (tl.res) inner += `<div class=\"rs\">${tr('resultLabel')}<pre>${esc(tl.res)}</pre></div>`\n  tip.innerHTML = inner\n  tip.style.display = 'block'\n  let px = e.clientX + 14, py = e.clientY + 14\n  if (px + 640 > window.innerWidth) px = e.clientX - 640\n  if (py + 400 > window.innerHeight) py = e.clientY - 400\n  tip.style.left = px + 'px'; tip.style.top = py + 'px'\n}\nfunction offToolHover(){\n  document.getElementById('tip').style.display = 'none'\n}\nfunction esc(s){\n  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')\n}\n\n/* ==================== 固定详情面板：点节点/支路弧线打开 ==================== */\nconst panelEl = document.getElementById('panel')\nconst panelBody = document.getElementById('panelBody')\nlet panelTexts = []   // copy-button sources, indexed by data-ci\nlet panelJump = null  // trace-jump payload for the locate button (live mode only)\nlet suppressClick = false   // a drag-pan swallows the click it ends on\n\nfunction openPanel(n, lane, isMain){\n  if (n !== sigPanelNode) sigPanelNode = null   // 用户自己点开了别的节点：面板不再算信号选中的一部分\n  pinnedDet = n._id ? n : null\n  panelTexts = []\n  panelJump = null\n  document.getElementById('panelTitle').textContent = `${laneName(lane)} ${nodeLabel(n)}`\n  const chip = document.getElementById('panelChip')\n  chip.textContent = nodeKindLabel(n, isMain) + ' · ' + vlabel(n.v)\n  chip.style.background = isMain && n.v === 'ok' ? MAIN_COLOR[lane.key] : (VCOLOR[n.v] ?? '#9aa4b8')\n  let inner = `<div class=\"prow\">${tr('spanTo')(fmtT(rawS(n)), fmtT(rawE(n)))} · ${tr('took')(rawDur(n).toFixed(1))}${n.evt ? '' : ' · ' + rzLabel(n)}${n.turn != null ? tr('turnSuffix')(n.turn) : ''}</div>`\n  if (n.why) inner += `<div class=\"prow\">${tr('whyLabel')}${esc(whyText(n.why, n.why2))}</div>`\n  if (!isMain && !n.evt){\n    inner += n.sub\n      ? `<div class=\"prow\">${tr('subSpawn')(n.attach, n.live === true)}</div>`\n      : `<div class=\"prow\" style=\"color:var(--dim)\">${tr('deadReturnPanel')(n.attach)}</div>`\n  }\n  if (liveMode){\n    const jumpTool = (n.tools ?? []).find(tl => tl.callId)\n    if (jumpTool !== undefined || n.seq != null){\n      panelJump = { kind: 'trace-jump', callId: jumpTool ? jumpTool.callId : undefined, seq: n.seq, step: n.step, turn: n.turn }\n      inner += `<button class=\"jump\" id=\"panelJumpBtn\">${tr('jumpBtn')}</button>`\n    }\n  }\n  for (const tl of n.tools ?? []){\n    const args = String(tl.args ?? '')\n    const res = String(tl.resFull ?? tl.res ?? '')\n    const ai = panelTexts.push(args) - 1\n    const ri = panelTexts.push(res) - 1\n    inner += `<div class=\"psec\"><div class=\"pt\"><b>${esc(tlabel(tl.name))}</b><span style=\"color:var(--dim);font-weight:500\">${tl.dur != null && tl.e != null ? tl.dur + 's' : tr('running')}${(tl.v === 'error' || tl.err) ? tr('ptFail') : (tl.v === 'retry' ? tr('ptRetry') : '')}</span><button class=\"cp\" data-ci=\"${ai}\">${tr('copyCmd')}</button></div>`\n    inner += `<pre class=\"args\">${args ? esc(args) : tr('noArgs')}</pre>`\n    if (tl.why) inner += `<div class=\"pwhy\">${tr('whyShort')}${esc(whyText(tl.why, tl.why2))}</div>`\n    if (res) inner += `<div class=\"pt\" style=\"border-top:1px solid var(--line)\">${tr('resultHead')}<span style=\"color:var(--dim);font-weight:500\">${res.length >= 5000 ? tr('chars5000') : tr('charsN')(res.length)}</span><button class=\"cp\" data-ci=\"${ri}\">${tr('copyRes')}</button></div><pre>${esc(res)}</pre>`\n    inner += `</div>`\n  }\n  const rz = n.rzTxtFull ?? n.rzTxt\n  if (rz) inner += `<div class=\"rzfull\"><b>${tr('rzExcerptTitle')}</b><br>${esc(rz)}</div>`\n  panelBody.innerHTML = inner\n  panelBody.scrollTop = 0\n  panelEl.classList.add('show')\n  render()\n}\nfunction closePanel(){\n  pinnedDet = null\n  panelEl.classList.remove('show')\n  render()\n}\ndocument.getElementById('panelClose').addEventListener('click', closePanel)\npanelBody.addEventListener('click', ev => {\n  const btn = ev.target.closest('button')\n  if (!btn) return\n  if (btn.id === 'panelJumpBtn'){\n    if (panelJump) parent.postMessage(panelJump, '*')\n    return\n  }\n  if (btn.dataset.ci !== undefined) copyText(panelTexts[+btn.dataset.ci] ?? '', btn)\n})\n/** Clipboard write with the sandboxed-iframe fallback (execCommand still works there). */\nfunction copyText(text, btn){\n  const done = ok => {\n    const old = btn.textContent\n    btn.textContent = ok ? tr('copied') : tr('copyFail')\n    setTimeout(() => { btn.textContent = old }, 1200)\n  }\n  if (navigator.clipboard && navigator.clipboard.writeText){\n    navigator.clipboard.writeText(text).then(() => done(true), () => done(legacyCopy(text)))\n  } else done(legacyCopy(text))\n}\nfunction legacyCopy(text){\n  const ta = document.createElement('textarea')\n  ta.value = text\n  ta.style.position = 'fixed'\n  ta.style.opacity = '0'\n  document.body.appendChild(ta)\n  ta.select()\n  let ok = false\n  try { ok = document.execCommand('copy') } catch { ok = false }\n  ta.remove()\n  return ok\n}\nfunction onNodeClick(e){\n  if (suppressClick) return\n  const g = e.currentTarget\n  if (anchorPick){ pickAnchorNode(g._node, g._lane.key); e.stopPropagation(); return }\n  openPanel(g._node, g._lane, g._isMain)\n  e.stopPropagation()\n}\nfunction onArcClick(e){\n  if (suppressClick) return\n  const d = e.currentTarget._det\n  if (anchorPick){ pickAnchorNode(d, d._laneKey); e.stopPropagation(); return }\n  openPanel(d, DATA.lanes.find(l => l.key === d._laneKey) ?? DATA.lanes[0], false)\n  e.stopPropagation()\n}\n\n/* ==================== 缩放导航：滚轮缩放 + 拖拽平移 + 双击/按钮复位 ==================== */\nlet buildQueued = false\n/** Coalesce zoom/pan rebuilds to one full SVG rebuild per animation frame. */\nfunction queueBuild(){\n  if (buildQueued) return\n  buildQueued = true\n  requestAnimationFrame(() => {\n    buildQueued = false\n    if (DATA){ build(); render() }\n  })\n}\nfunction setViewWindow(t0, t1){\n  const minSpan = Math.max(TMAX / 4000, 0.5)\n  const span = Math.max(minSpan, Math.min(t1 - t0, TMAX))\n  const s = Math.max(0, Math.min(t0, TMAX - span))\n  VIEW = span >= TMAX - 1e-9 ? null : { t0: s, t1: s + span }\n  queueBuild()\n}\n/** clientX → compressed-timeline time, via the SVG's live screen matrix. */\nfunction tAtClientX(cx){\n  const m = svg.getScreenCTM()\n  if (!m) return viewT0()\n  return viewT0() + (((cx - m.e) / m.a) - X0) / AXIS_W * viewSpan()\n}\nsvg.addEventListener('wheel', e => {\n  if (!DATA) return\n  // 滚动模式下普通滚轮归纵向滚动，缩放让给 ⌘/Ctrl+滚轮（画布类应用通行约定）\n  if (svgWrapEl.classList.contains('scroll') && !e.ctrlKey && !e.metaKey) return\n  e.preventDefault()\n  const span = viewSpan()\n  const ns = span * Math.exp(e.deltaY * 0.0018)\n  const tc = tAtClientX(e.clientX)\n  const t0 = tc - (tc - viewT0()) * (ns / span)\n  setViewWindow(t0, t0 + ns)\n}, { passive: false })\nlet panState = null\nsvg.addEventListener('mousedown', e => {\n  if (!DATA || e.button !== 0) return\n  e.preventDefault()\n  panState = { x0: e.clientX, t0: viewT0(), span: viewSpan() }\n})\nwindow.addEventListener('mousemove', e => {\n  if (!panState) return\n  const dx = e.clientX - panState.x0\n  if (!suppressClick && Math.abs(dx) < 4) return\n  suppressClick = true\n  svg.classList.add('panning')\n  const m = svg.getScreenCTM()\n  const dt = m ? (dx / m.a) / AXIS_W * panState.span : 0\n  setViewWindow(panState.t0 - dt, panState.t0 - dt + panState.span)\n})\nwindow.addEventListener('mouseup', () => {\n  if (!panState) return\n  panState = null\n  svg.classList.remove('panning')\n  setTimeout(() => { suppressClick = false }, 0)\n})\nsvg.addEventListener('dblclick', e => {\n  if (e.target.closest && e.target.closest('.node')) return\n  VIEW = null\n  queueBuild()\n})\ndocument.getElementById('btnFit').addEventListener('click', () => { VIEW = null; queueBuild() })\n// Esc 逐层退出：选锚点中先取消选点，再关详情面板，再关盘点面板；都没有才透传给宿主\n//（上传面板的宿主级 Esc 收不到 iframe 焦点内的按键）。\nwindow.addEventListener('keydown', e => {\n  if (e.key !== 'Escape') return\n  if (anchorPick){ stopAnchorPick(); return }\n  if (panelEl.classList.contains('show')){\n    const bySig = sigSel !== null && sigPanelNode !== null\n    closePanel()\n    if (bySig) clearSigSel()\n    return\n  }\n  if (invPanelEl.classList.contains('show')){ closeInv(); return }\n  if (sigSel !== null){ clearSigSel(); return }\n  parent.postMessage({ kind: 'trace-esc' }, '*')\n})\n\n/* ============================ 动画 ============================ */\nlet t = 0, playing = false, playEnded = false, timer = 0, lastTs = 0\nconst speedSel = document.getElementById('speed')\nconst curTimeEl = document.getElementById('curTime')\nconst seekEl = document.getElementById('seek')\nfunction prog(s, e){ return e - s <= 0 ? (t >= e ? 1 : 0) : (t - s) / (e - s) }\n\nfunction render(){\n  // 还没成功画过一次图（例如第一次上传就解析失败）时没有游标与坐标轴可更新；resetView → closePanel 会调到这里\n  if (!window._cursor) return\n  const focus = hoverDet ?? pinnedDet\n  pathEls.forEach(({ el, s, e, det, base, kind }) => {\n    const p = prog(s, e)\n    const len = el.getTotalLength ? el.getTotalLength() : 100\n    if (p >= 1){\n      el.setAttribute('stroke-dasharray', base || '')\n      el.setAttribute('stroke-dashoffset', '0')\n    } else {\n      el.setAttribute('stroke-dasharray', len)\n      el.setAttribute('stroke-dashoffset', len * (1 - Math.max(0, p)))\n    }\n    if (det){\n      const hit = focus && det._id === focus._id\n      if (kind === 'lab'){\n        el.style.opacity = hit ? 1 : 0\n      } else if (focus){\n        el.style.opacity = hit ? 1 : 0.12\n        el.classList.toggle('hl-path', hit)\n      } else {\n        el.style.opacity = t >= s ? 1 : 0.25\n        el.classList.remove('hl-path')\n      }\n    } else {\n      el.style.opacity = t >= s ? 1 : 0.25\n    }\n  })\n  nodeEls.forEach(({ el, s, e }) => {\n    const p = prog(s, e)\n    const cs = el.querySelectorAll('.nbar')\n    const op = t < s ? 0 : (t < e ? 0.3 + 0.7 * p : 1)\n    cs.forEach(c => c.setAttribute('opacity', op))\n    if (el._det && focus){\n      el.style.opacity = el._det._id === focus._id ? 1 : 0.18\n      el.classList.toggle('hl-node', el._det._id === focus._id)\n    } else {\n      el.style.opacity = t >= s ? 1 : 0.3\n      el.classList.remove('hl-node')\n    }\n  })\n  markEls.forEach(({ el, s, e }) => {\n    el.style.opacity = t >= s ? 1 : 0\n    if (t >= s && t < e) el.style.opacity = (t * 30) % 2 < 1 ? 1 : 0.15\n  })\n  msEls.forEach(({ el, s }) => { el.style.opacity = t >= s ? 1 : 0 })\n  window._cursor.setAttribute('x1', x(t))\n  window._cursor.setAttribute('x2', x(t))\n  curTimeEl.textContent = fmtT(wallClock(t))\n  seekEl.value = Math.round(t / TMAX * 1000)\n}\nfunction tick(){\n  if (!playing) return\n  const now = Date.now()\n  if (!lastTs) lastTs = now\n  const dt = (now - lastTs) / 1000 * parseFloat(speedSel.value)\n  lastTs = now\n  t = Math.min(t + dt, TMAX)\n  render()\n  if (t >= TMAX){ playing = false; playEnded = true; updatePlayBtn() }\n}\nconst btnPlay = document.getElementById('btnPlay')\nbtnPlay.addEventListener('click', () => {\n  if (t >= TMAX) t = 0\n  playing = !playing\n  playEnded = false\n  updatePlayBtn()\n  lastTs = 0\n  if (playing && !timer) timer = setInterval(tick, 16)\n  else if (!playing && timer){ clearInterval(timer); timer = 0 }\n})\ndocument.getElementById('btnReset').addEventListener('click', () => {\n  playing = false\n  playEnded = false\n  if (timer){ clearInterval(timer); timer = 0 }\n  updatePlayBtn()\n  t = 0; render()\n})\nseekEl.addEventListener('input', () => {\n  t = parseFloat(seekEl.value) / 1000 * TMAX\n  render()\n})\n\n/* ============================ 上传 ============================ */\nlet DATA = null\nconst drop = document.getElementById('drop')\nconst fileInput = document.getElementById('file')\nconst filesBox = document.getElementById('files')\nconst errbar = document.getElementById('errbar')\nconst loaded = []   // {name, text}\n\nfunction showErr(msg){\n  errbar.textContent = msg\n  errbar.style.display = 'block'\n}\nfunction clearErr(){ errbar.style.display = 'none' }\n\nfunction renderFiles(){\n  filesBox.innerHTML = ''\n  loaded.forEach((f, i) => {\n    const chip = document.createElement('span')\n    chip.className = 'fchip'\n    chip.innerHTML = `<span>${esc(f.name)}</span><span class=\"x\" data-i=\"${i}\">×</span>`\n    chip.querySelector('.x').addEventListener('click', () => {\n      loaded.splice(i, 1)\n      renderFiles()\n      if (loaded.length === 0) resetView()\n      else apply()\n    })\n    filesBox.appendChild(chip)\n  })\n}\n\nfunction resetView(){\n  document.body.classList.remove('hasdata')\n  renderDrop()\n  document.getElementById('legend').style.display = 'none'\n  document.getElementById('controls').style.display = 'none'\n  document.getElementById('fltbar').style.display = 'none'\n  document.getElementById('svgwrap').style.display = 'none'\n  document.getElementById('stats').innerHTML = ''\n  VIEW = null\n  closePanel()\n  closeInv()\n  anaSecEl.innerHTML = ''\n  ANCHORS = []\n  if (anchorPick) stopAnchorPick()\n  while (svg.firstChild) svg.removeChild(svg.firstChild)\n}\n\nfunction apply(){\n  clearErr()\n  let data\n  try {\n    data = buildData(loaded.map(f => f.text), loaded.map(f => f.name))\n  } catch (e){\n    showErr(tr('errParse')(e.message ?? e))\n    resetView()\n    return\n  }\n  renderData(data, { follow: false })\n}\n\n/**\n * 滚动模式下把视口落到第 1 泳道的主干线：默认 scrollTop=0 停在支路槽区顶端，\n * 最该先看到的主干反而在屏外。上方留一段让泳道带标题仍可见。\n */\nfunction scrollToMain(){\n  if (!DATA || !svgWrapEl.classList.contains('scroll')) return\n  const lay = LAYOUT[DATA.lanes[0].key]\n  if (!lay) return\n  const scale = svgScrollEl.clientWidth / 1560\n  svgScrollEl.scrollTop = Math.max(0, Math.round(lay.mainY * scale - svgScrollEl.clientHeight * 0.42))\n}\n\n/** Render a fully-built maze data payload (upload mode or live mode). */\nfunction renderData(data, opts){\n  opts = opts ?? {}\n  DATA = data\n  applyAxisMap(DATA)\n  TMAX = DATA.Tmax + liveHeadroom(DATA)\n  // Fresh uploads reset the zoom (and compare-mode user state: anchors, inventory\n  // selection); live refreshes keep the user's window, re-clamped to the new\n  // (compressed) span. Coordinates can drift slightly when a refresh adds\n  // activity segments — the window stays approximate.\n  if (!opts.follow){\n    VIEW = null\n    ANCHORS = []\n    if (anchorPick) stopAnchorPick()\n    invSel = null\n    sigSel = null\n    sigPanelNode = null\n  }\n  else if (VIEW){\n    const span = Math.min(VIEW.t1 - VIEW.t0, TMAX)\n    const s = Math.max(0, Math.min(VIEW.t0, TMAX - span))\n    VIEW = span >= TMAX - 1e-9 ? null : { t0: s, t1: s + span }\n  }\n  renderLegend()\n  renderStats()\n  renderMetaStrip()\n  document.body.classList.add('hasdata')   // 页头收紧：说明/大上传区/统计卡让位给迷宫\n  renderDrop()\n  document.getElementById('legend').style.display = 'flex'\n  document.getElementById('controls').style.display = 'flex'\n  document.getElementById('fltbar').style.display = 'flex'\n  refreshFltTools()\n  // 对比专属控件只在「同任务多次跑」时出现（cmpOn）；盘点面板开着时随数据刷新重算\n  const cmp = cmpOn()\n  btnAnchor.style.display = cmp ? '' : 'none'\n  document.getElementById('btnInv').style.display = cmp ? '' : 'none'\n  if (!cmp) closeInv()\n  else if (invPanelEl.classList.contains('show')) renderInventory()\n  // 分析区随数据直接渲染（主界面文档流；Agent 图谱块只在真有子代理数据时出现）\n  renderAnalysis()\n  document.getElementById('svgwrap').style.display = 'block'\n  playing = false\n  // 默认直接呈现完整迷宫：t=0 时节点条 opacity 为 0、连线只有 25%，\n  // 上传后满屏近乎空白，非得先找到并按下播放才看得见自己的数据。\n  // 播放是可选回放，不是看图的前置条件——按钮相应显示为「重播」。\n  playEnded = true\n  if (timer){ clearInterval(timer); timer = 0 }\n  updatePlayBtn()\n  t = TMAX\n  build()\n  render()\n  if (!opts.follow) scrollToMain()\n}\n\n/** 会话头部指标条：每泳道一行——模型 · 总时长 · 步数/调用 · 总 Token · 峰值上下文。 */\nfunction renderMetaStrip(){\n  const box = document.getElementById('metastrip')\n  if (!DATA){ box.innerHTML = ''; return }\n  box.innerHTML = DATA.lanes.map((lane, li) => {\n    const own = [...lane.main, ...lane.detours].filter(n => !n.sub && !n.evt)\n    // Token 指标刻意不含缓存重读：每次请求都全量重读缓存，累计会得出「335.9M」这类\n    // 吓人且无操作意义的数——输入（未命中缓存的新读入）与输出（含推理）才是真实用量。\n    // 泳道统计里若已有轮级精确账就用它，不再自己按行累加：新宿主里「只发工具调用」\n    // 的那一步不产生 assistant 节点，它的 token 落不到任何一行上，按行加会漏掉——\n    // 这类步骤在写代码的会话里占比很高，漏的量不小，而且会和泳道标签自相矛盾。\n    const rowSum = (key) => own.some(n => n[key] != null) ? own.reduce((s, n) => s + (n[key] ?? 0), 0) : null\n    const inTot = lane.stats.inTok ?? rowSum('inTok')\n    const outTot = lane.stats.outTok ?? rowSum('outTok')\n    const occ = contextOccupancy(lane)\n    const peak = occ.samples.length > 0 ? occ.peakTok : null\n    const win = occ.valid && peak != null ? occ.peakWin : null\n    const pct = win != null ? Math.round(occ.peakRatio * 1000) / 10 : null\n    const tokTxt = tr('msTok')(inTot != null ? fmtTok(inTot) : '', outTot != null ? fmtTok(outTot) : '')\n    // 头部写父会话自己的调用数；子代理支路里的调用另计一句，与工具轨道的「共 N 次」（含子代理）对得上\n    const subCalls = lane.detours.filter(d => d.sub).reduce((n, d) => n + (d.tools?.length ?? 0), 0)\n    return `<span class=\"mlane\">`\n      + `<span><span class=\"mdot\" style=\"background:${(LANEC[li] ?? LANEC[0]).main}\"></span><b>${laneName(lane)}</b> ${esc(lane.model ?? tr('modelUnknown'))}</span>`\n      + `<span>${tr('msDur')} <b>${fmtT(lane.stats.T)}</b></span>`\n      + `<span>${tr('msCalls')(lane.stats.steps, lane.stats.tools)}${subCalls > 0 ? tr('msSubCalls')(subCalls) : ''}</span>`\n      + (tokTxt !== '' ? `<span>Token <b>${tokTxt}</b></span>` : '')\n      + (peak != null ? `<span>${tr('msPeak')} <b class=\"${pct != null && pct >= 90 ? 'warn' : ''}\">${pct != null ? pct + '%' : fmtTok(peak)}</b></span>` : '')\n      + `</span>`\n  }).join('')\n}\n\n/** 泳道统计卡（语言切换与数据刷新共用）。 */\nfunction renderStats(){\n  let h = ''\n  DATA.lanes.forEach(l => {\n    h += `<div class=\"card\"><div><b>${laneName(l)}</b> <span class=\"key\">${l.fname ? esc(l.fname) + ' · ' : ''}${esc(l.model ?? tr('modelUnknown'))}</span></div>\n      <div class=\"m\">${tr('statsCard')(l.stats)}</div></div>`\n  })\n  document.getElementById('stats').innerHTML = h\n}\n\ndrop.addEventListener('click', () => fileInput.click())\ndrop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('hover') })\ndrop.addEventListener('dragleave', () => drop.classList.remove('hover'))\ndrop.addEventListener('drop', e => {\n  e.preventDefault()\n  drop.classList.remove('hover')\n  handleFiles([...e.dataTransfer.files])\n})\nfileInput.addEventListener('change', () => {\n  handleFiles([...fileInput.files])\n  fileInput.value = ''\n})\n\nconst ZSTD_MAGIC = [0x28, 0xb5, 0x2f, 0xfd]\n\n/** Whether this browser's DecompressionStream understands 'zstd', probed once at load. */\nconst NATIVE_ZSTD = (() => {\n  try { new DecompressionStream('zstd'); return true } catch { return false }\n})()\n\n/** zstd bytes → text: native DecompressionStream where available, bundled fzstd otherwise. */\nasync function unzstd(buf){\n  if (NATIVE_ZSTD) return await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('zstd'))).text()\n  if (typeof fzstd !== 'undefined') return new TextDecoder().decode(fzstd.decompress(buf))\n  throw new Error(tr('errZstd'))\n}\n\n/** File → decoded text; zstd frames (session.jsonl.zstd) are detected by magic bytes and decompressed. */\nasync function decodeFile(f){\n  const buf = new Uint8Array(await f.arrayBuffer())\n  const isZstd = buf.length >= 4 && ZSTD_MAGIC.every((b, i) => buf[i] === b)\n  return isZstd ? await unzstd(buf) : new TextDecoder().decode(buf)\n}\n\nasync function handleFiles(files){\n  if (files.length === 0) return\n  if (loaded.length + files.length > MAX_LANES){\n    showErr(tr('errMax'))\n    return\n  }\n  clearErr()\n  let failed = false\n  for (const f of files){\n    try {\n      loaded.push({ name: f.name, text: await decodeFile(f) })\n    } catch (e){\n      failed = true\n      showErr(tr('errReadFile')(f.name, e.message ?? e))\n    }\n  }\n  renderFiles()\n  if (loaded.length > 0 && !failed) apply()\n}\n\n/* ===== Live mode: parent frame pushes rendered maze data via postMessage ===== */\nlet liveMode = false\nlet liveSig = null\nlet liveRawE = new Map()   // 上一帧里运行中节点的原始时间（未折叠），轻量延长按增量推进\n\n/** 运行中节点的原始时间，按「泳道:类型:step」记。 */\nfunction liveRawTimes(data){\n  const m = new Map()\n  for (const l of data.lanes) for (const arr of [l.main, l.detours]) for (const n of arr){\n    if (n.live) m.set(l.key + (n.sub ? ':S' : ':M') + n.step, { s: n.s, e: n.e })\n  }\n  return m\n}\n\n/**\n * 轻量延长（吴昊 2026-10-01 拍板）：结构签名没变、只是宿主的一秒时钟走了，不重跑 renderData——\n * 把运行中的步骤和子代理支路按原始时间的增量向右推，只重画迷宫 SVG（与缩放同一条路径 queueBuild），\n * 图例、头部指标条、分析区都不动。轴的余量（liveHeadroom）用完才整图重画。\n */\nfunction extendLive(payload, rawLive){\n  // 步序视图下坐标是「列号」，按秒推进没有意义：跳过轻量延长，等结构变化时整图重画\n  // （列宽恒等，运行中的步在下次 renderData 里按当时的真实终点重算列内进度）。\n  if (AXIS_MODE === 'step') return\n  let maxE = 0, grew = false\n  const segs = DATA.timeMap ? DATA.timeMap.segments : null\n  const last = segs ? segs[segs.length - 1] : null\n  DATA.lanes.forEach((lane, li) => {\n    const fresh = payload.lanes[li]\n    if (fresh) lane.stats.T = fresh.stats.T\n    for (const arr of [lane.main, lane.detours]) for (const n of arr){\n      if (!n.live) continue\n      const key = lane.key + (n.sub ? ':S' : ':M') + n.step\n      const was = liveRawE.get(key), now = rawLive.get(key)\n      if (!was || !now) continue\n      const d = now.e - was.e\n      if (d <= 0) continue\n      // 运行中的区间本身没有空闲缝，延长量在同一活动段内：折叠坐标等量推进，最后一段的原始终点同步外推\n      if (last && was.e >= last.re - 1e-6) last.re = Math.max(last.re, now.e)\n      if (!n.sub) n.s += d   // 父会话的在途步是钉在「现在」的短标记，整体右移\n      n.e += d\n      grew = true\n      maxE = Math.max(maxE, n.e)\n    }\n  })\n  if (!grew) return\n  // 余量用完：扩大时间轴（再留一段余量），仍走同一条只重画迷宫的路径\n  if (maxE + 2 > TMAX){ DATA.Tmax = Math.max(DATA.Tmax, maxE); TMAX = DATA.Tmax + liveHeadroom(DATA) }\n  if (!playing) t = TMAX\n  renderMetaStrip()   // 头部的总时长跟着走（只是一小段 innerHTML）\n  queueBuild()\n}\n\n/**\n * Structural signature of a live payload: settled nodes' identity/verdict and\n * arrived tool-result counts. Deliberately excludes the in-flight step's\n * timings and reasoning volume so streaming chunks don't force a full SVG\n * rebuild — the maze only redraws when something structural actually changed.\n */\nfunction mazeSignature(data){\n  const parts = []\n  for (const l of data.lanes){\n    // 轮次收尾与真人消息只改结果与证据块，但它们到达时未必伴随节点变化，得单独进签名\n    parts.push('m' + l.main.length, 'd' + l.detours.length, 't' + (l.turnEnds?.length ?? 0), 'u' + (l.userMsgs?.length ?? 0),\n      'k' + (l.compaction?.starts.length ?? 0), 'o' + (l.todoReminders ?? 0))\n    for (const arr of [l.main, l.detours]){\n      for (const n of arr){\n        if (n.live){ parts.push('L' + n.tools.length + '.' + n.tools.filter(tl => tl.e != null).length); continue }\n        // rzTok/inTok 在 assistant/message 终结时一次性到位（流式期间恒空），进签名不会引发重画风暴；\n        // inTok 单独进签名：非推理模型 rzTok 恒空，token 轨道要等 usage 到位后重画一次\n        parts.push(n.step + ':' + n.v + ':' + n.tools.length + ':' + n.tools.filter(tl => tl.e != null).length + ':' + (n.rzTok != null ? 1 : 0) + (n.inTok != null ? 1 : 0))\n      }\n    }\n  }\n  return parts.join('|')\n}\n\nwindow.addEventListener('message', e => {\n  if (!e.data || e.data.kind !== 'trace-maze') return\n  const firstLive = !liveMode\n  liveMode = true\n  drop.style.display = 'none'\n  filesBox.style.display = 'none'\n  document.body.classList.add('live')\n  const payload = e.data.data\n  const sig = mazeSignature(payload)\n  const rawLive = liveRawTimes(payload)\n  if (sig === liveSig && DATA){\n    extendLive(payload, rawLive)\n    liveRawE = rawLive\n    return\n  }\n  liveSig = sig\n  liveRawE = rawLive\n  renderData(payload, { follow: true })\n  // 首帧进滚动模式时同样要落到主干线（follow 路径不重定位，避免打断用户正在看的位置）\n  if (firstLive) scrollToMain()\n})\n\n// 主题跟随：宿主读取自身主题后推 {kind:'trace-theme', mode}（照 trace-maze 的 postMessage 模式）\nwindow.addEventListener('message', e => {\n  if (!e.data || e.data.kind !== 'trace-theme') return\n  setTheme(e.data.mode)\n})\n\n// 语言跟随：宿主读取 dsh 语言设置后推 {kind:'trace-locale', lang}（同主题通道模式）；\n// 到达前按浏览器语言兜底（独立打开/分享场景）\nwindow.addEventListener('message', e => {\n  if (!e.data || e.data.kind !== 'trace-locale') return\n  setLang(e.data.lang)\n})\n\n// 初始主题：宿主经 srcDoc 预置的 data-theme 优先（首帧防闪，themedMazeHtml 注入）；\n// 没有预置（独立打开/分享场景）按系统偏好兜底；宿主消息一到以宿主为准\napplyStatic()\nreadPalette()\nsetTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark'\n  : typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')\n\n/* URL-direct load hook: ?load1=<path>…&load5=<path> (dev/embed convenience). */\n;(async () => {\n  const params = new URLSearchParams(location.search)\n  const paths = Array.from({ length: MAX_LANES }, (_, i) => params.get('load' + (i + 1))).filter(Boolean)\n  for (const p of paths){\n    try {\n      const r = await fetch(p)\n      const text = await r.text()\n      loaded.push({ name: p.split('/').pop() ?? p, text })\n    } catch (e){\n      showErr(tr('errUrl')(p, e.message ?? e))\n    }\n  }\n  if (loaded.length > 0){\n    renderFiles()\n    apply()\n  }\n})()\n<\/script>\n</body>\n</html>\n";
		//#endregion
		//#region src/client/theme-sync.ts
		/**
		* 宿主主题 → 迷宫 iframe 的同步。dsh 把暗色表达为 body[data-ds-dark-theme]
		* （ui-layout 的 ThemePresenter 所写，rc.6 与源码一致）；iframe 是 srcDoc 沙箱
		* 读不到宿主 DOM，所以宿主组件在 iframe 加载与主题变化时 postMessage
		* {kind:'trace-theme', mode} 进页面（照 trace-maze 的消息模式）。
		*/
		/** dsh 暗色主题的 body 布尔属性。 */
		const DARK_ATTRIBUTE = "data-ds-dark-theme";
		/**
		* 当前宿主主题。
		* @returns 'dark' 当 body 带暗色属性，否则 'light'。
		*/
		function hostThemeMode() {
			return document.body.hasAttribute(DARK_ATTRIBUTE) ? "dark" : "light";
		}
		/**
		* 把当前宿主主题推给迷宫页面。
		* @param frame - 迷宫 iframe；null（未挂载）时不做事。
		*/
		function postThemeTo(frame) {
			frame?.contentWindow?.postMessage({
				kind: "trace-theme",
				mode: hostThemeMode()
			}, "*");
		}
		/**
		* 监听宿主主题属性变化。
		* @param onChange - 主题属性翻转时的回调。
		* @returns 停止监听的函数。
		*/
		function watchHostTheme(onChange) {
			const observer = new MutationObserver(() => {
				onChange();
			});
			observer.observe(document.body, {
				attributes: true,
				attributeFilter: [DARK_ATTRIBUTE]
			});
			return () => {
				observer.disconnect();
			};
		}
		/** 迷宫页 `<html>` 起始标签——data-theme 预置的锚点（页面自持文件，标签稳定）。 */
		const MAZE_HTML_TAG = "<html lang=\"zh-CN\">";
		/**
		* 按宿主主题给迷宫页 HTML 预置 `data-theme`，让 srcDoc 首帧就按暗色着色。
		* postMessage 通道要等 onLoad 才生效，暗色宿主下 iframe 重挂载（切 tab /
		* 重开面板）会先按页面默认的浅色变量画一帧再翻转——桌面端（issue #4）
		* 整块内容区闪白。浅色是页面默认态，原样返回。
		* @param html - 迷宫页完整 HTML。
		* @param mode - 目标主题；默认取当前宿主主题。
		* @returns 预置好主题属性的 HTML。
		*/
		function themedMazeHtml(html, mode = hostThemeMode()) {
			if (mode !== "dark") return html;
			return html.replace(MAZE_HTML_TAG, "<html lang=\"zh-CN\" data-theme=\"dark\">");
		}
		//#endregion
		//#region \0dsh-css:/Users/danielwu/Documents/StartUp_AIBrain/dsh-maze-diagnosis-wt/src/client/TraceCompareSurface.module.css.mjs
		const css$1 = "._9qXUGG_frame{z-index:30;background:#f2f4f8;display:flex;position:absolute;inset:0}._9qXUGG_iframe{background:#f2f4f8;border:0;flex:1}._9qXUGG_close{top:calc(env(_9qXUGG_titlebar-area-y,0px) + env(_9qXUGG_titlebar-area-height,0px) + 10px);z-index:2;color:#3a4354;cursor:pointer;background:#fff;border:1px solid #d9dee8;border-radius:9px;width:30px;height:30px;font-size:14px;line-height:1;transition:background .15s,border-color .15s;position:absolute;right:12px;box-shadow:0 1px 2px #0f172a0f,0 4px 12px #0f172a14}._9qXUGG_close:hover{background:#eef1f6;border-color:#6e7a91}body[data-ds-dark-theme] ._9qXUGG_frame,body[data-ds-dark-theme] ._9qXUGG_iframe{background:#0d1219}body[data-ds-dark-theme] ._9qXUGG_close{color:#c3cddd;background:#151c27;border-color:#333f54;box-shadow:0 1px 2px #00000047,0 4px 12px #00000052}body[data-ds-dark-theme] ._9qXUGG_close:hover{background:#212c3d;border-color:#5d6b82}";
		const tagId$1 = "dsh-maze/TraceCompareSurface.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-maze";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var TraceCompareSurface_module_css_default = {
			"frame": "_9qXUGG_frame",
			"iframe": "_9qXUGG_iframe",
			"titlebar-area-height": "_9qXUGG_titlebar-area-height",
			"titlebar-area-y": "_9qXUGG_titlebar-area-y",
			"close": "_9qXUGG_close"
		};
		//#endregion
		//#region src/client/TraceCompareSurface.tsx
		/**
		* Root-scoped center surface: the self-contained maze upload page inside an
		* isolated iframe. The page parses uploaded session logs and renders the
		* exploration maze on a shared timeline; nothing here reaches the host.
		*/
		function TraceCompareSurface({ useStore, actions, useSessions, locale, t }) {
			const open = useStore((state) => state.open);
			const srcDoc = (0, react.useMemo)(() => themedMazeHtml(MAZE_PAGE_HTML), [open]);
			const iframeRef = (0, react.useRef)(null);
			const currentSession = useSessions(currentSessionOf);
			const lastSession = (0, react.useRef)(currentSession);
			(0, react.useEffect)(() => {
				const changed = lastSession.current !== currentSession;
				lastSession.current = currentSession;
				if (open && changed) actions.close();
			}, [
				actions,
				currentSession,
				open
			]);
			(0, react.useEffect)(() => {
				if (!open) return;
				const onKeyDown = (event) => {
					if (event.key === "Escape") actions.close();
				};
				const onMessage = (event) => {
					if (event.source !== iframeRef.current?.contentWindow) return;
					const msg = event.data;
					if (msg !== null && msg.kind === "trace-esc") actions.close();
				};
				window.addEventListener("keydown", onKeyDown);
				window.addEventListener("message", onMessage);
				return () => {
					window.removeEventListener("keydown", onKeyDown);
					window.removeEventListener("message", onMessage);
				};
			}, [actions, open]);
			(0, react.useEffect)(() => {
				if (!open) return;
				return watchHostTheme(() => {
					postThemeTo(iframeRef.current);
				});
			}, [open]);
			(0, react.useEffect)(() => {
				if (!open) return;
				postLocaleTo(iframeRef.current, locale);
				return locale.subscribe(() => {
					postLocaleTo(iframeRef.current, locale);
				});
			}, [locale, open]);
			if (!open) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: TraceCompareSurface_module_css_default.frame,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: TraceCompareSurface_module_css_default.close,
					title: t("surface.close"),
					"aria-label": t("surface.close"),
					onClick: () => {
						actions.close();
					},
					children: "✕"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
					ref: iframeRef,
					title: "trace-compare",
					className: TraceCompareSurface_module_css_default.iframe,
					srcDoc,
					sandbox: "allow-scripts allow-modals allow-downloads",
					onLoad: () => {
						postThemeTo(iframeRef.current);
						postLocaleTo(iframeRef.current, locale);
					}
				})]
			});
		}
		//#endregion
		//#region src/client/verdict.js
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
		const VERDICT_RULES = {
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
			ERROR_TAIL_SCAN: 1e3,
			/** 写入类工具：成功确认天然很短，无错误即成功，永不按输出判扑空。 */
			WRITE_TOOLS: [
				"write",
				"edit",
				"todo_write"
			],
			/** 检索类工具：空结果=扑空；有返回（哪怕一行命中）即成功。 */
			SEARCH_TOOLS: [
				"grep",
				"read",
				"web_search",
				"read_image"
			],
			/**
			* 空结果/无命中特征（只扫开头窗口）：真正的空结果提示本来就是整段短消息；
			* 读到的文件内容/命中的代码里出现 "not found in" 字样不算扑空——2026-08-19 实测误报案例。
			*/
			NO_RESULT_PATTERNS: /^(---)?$|no matches|no results|not found in/i,
			/** 盲目重试：相邻同工具调用的参数 token Jaccard 相似度门槛。 */
			RETRY_SIMILARITY: .6,
			/** 盲目重试：最小连续调用数。 */
			RETRY_MIN_CLUSTER: 2
		};
		/** 步级聚合的严重度序：取最坏工具判定作为步判定。 */
		const SEV = {
			error: 4,
			retry: 3,
			deadend: 2,
			ok: 0,
			answer: 0
		};
		/**
		* 单工具判定：错误标志 → 失败特征 → 按工具分类；返回判定值和结构化依据 { k, p }。
		* ev.res 必须传**未截断**的返回全文——上传与实时两条链路统一在同一份文本上判定，
		* 否则同一步会在两种模式下判出不同结果（2026-08-19 实测踩过）。
		*/
		function toolVerdict(ev) {
			if (ev.err) return {
				v: "error",
				why: { k: "errFlag" }
			};
			const txt = (ev.res ?? "").trim();
			const head = txt.slice(0, VERDICT_RULES.ERROR_HEAD_SCAN);
			const tail = txt.slice(-VERDICT_RULES.ERROR_TAIL_SCAN);
			const strong = VERDICT_RULES.ERROR_PATTERNS_STRONG.exec(head) ?? VERDICT_RULES.ERROR_PATTERNS_STRONG.exec(tail);
			if (strong !== null) return {
				v: "error",
				why: {
					k: "errStrong",
					p: [strong[0].slice(0, 48)]
				}
			};
			const weak = VERDICT_RULES.ERROR_PATTERNS_WEAK.exec(head);
			if (weak !== null) return {
				v: "error",
				why: {
					k: "errWeak",
					p: [weak[0].slice(0, 48)]
				}
			};
			if (VERDICT_RULES.WRITE_TOOLS.includes(ev.name)) return {
				v: "ok",
				why: { k: "writeOk" }
			};
			if (VERDICT_RULES.SEARCH_TOOLS.includes(ev.name)) {
				if (VERDICT_RULES.NO_RESULT_PATTERNS.test(head)) return {
					v: "deadend",
					why: { k: txt === "" ? "searchEmpty" : "searchNoHit" }
				};
				return {
					v: "ok",
					why: { k: "searchOk" }
				};
			}
			if (VERDICT_RULES.NO_RESULT_PATTERNS.test(head)) return {
				v: "deadend",
				why: { k: "exitNoOut" }
			};
			return {
				v: "ok",
				why: { k: "exitOk" }
			};
		}
		/** 步级判定：返回该步最坏判定的工具（其 v/why 即步判定与依据）；无参与投票的工具时返回 null。 */
		function stepVerdict(tools) {
			let worst = null;
			for (const t of tools) if (worst === null || (SEV[t.v] ?? 0) > (SEV[worst.v] ?? 0)) worst = t;
			return worst;
		}
		function argTokens(s) {
			const out = /* @__PURE__ */ new Set();
			for (const w of String(s).split(/[^\w一-鿿./-]+/)) if (w.length > 2) out.add(w);
			return out;
		}
		/** 参数相似度：token 集 Jaccard，用于识别「几乎相同的重复调用」。 */
		function argSimilarity(a, b) {
			const ta = argTokens(a), tb = argTokens(b);
			if (ta.size === 0 || tb.size === 0) return 0;
			let inter = 0;
			for (const w of ta) if (tb.has(w)) inter += 1;
			return inter / (ta.size + tb.size - inter);
		}
		const ANALYSIS_RULES = {
			/** 失败恢复窗口（秒）：失败后任意工具在此窗口内出现成功调用即算「已恢复」。 */
			RECOVERY_WINDOW: 120,
			/** 恢复方式分类：失败后下一次同工具调用的参数相似度 ≥ 此值判「原样重试」，否则「换参数」。 */
			IDENTICAL_SIMILARITY: .6,
			/** 只在这些工具的命令文本里识别验证类命令；code 模式的 run_code 另计（脚本内部派发的真实工具日志未展开）。 */
			SHELL_TOOLS: [
				"bash",
				"shell",
				"sh",
				"zsh",
				"exec",
				"shell_command",
				"run_command",
				"terminal",
				"local_shell"
			],
			/** code 模式的外层调用名：命中即在结果块里如实标注「内部派发暂不识别」。 */
			CODE_TOOLS: ["run_code"],
			/** 产物 = 这些写入/编辑类调用成功触及的文件路径（去重）；todo_write 不是产物。 */
			ARTIFACT_TOOLS: [
				"write",
				"edit",
				"multi_edit",
				"apply_patch",
				"write_file",
				"edit_file",
				"create_file",
				"str_replace_editor",
				"str_replace_based_edit_tool",
				"notebook_edit"
			],
			/** 最后一轮以这些原因收尾即「任务未完成」：error（终局失败）/ interrupted（崩溃遗留）/ aborted（用户或父会话取消）/ blocked。
			*  max-tokens 不在其中——轮次仍算结束，但结果块会写明原因。 */
			TURN_END_INCOMPLETE: [
				"error",
				"interrupted",
				"aborted",
				"blocked"
			],
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
					/* @__PURE__ */ new RegExp("^(?:npm|pnpm|yarn|bun)\\s+(?:(?:-{1,2}[\\w-]+(?:=\\S+)?|(?:-F|--filter|-C|--dir|--prefix|-w|--workspace|--cwd)\\s+\\S+)\\s+)*(?:run\\s+|run-script\\s+)?(?:test|t|tests|check)(?::[\\w:.-]+)?(?=\\s|$|[;&|)])"),
					/* @__PURE__ */ new RegExp("^(?:(?:npx|bunx|pnpx|pnpm(?:\\s+exec|\\s+dlx|\\s+run)?|npm\\s+exec|yarn(?:\\s+exec|\\s+run)?|bun(?:\\s+x|\\s+run)?)\\s+(?:-{1,2}[\\w-]+(?:=\\S+)?\\s+)*(?:--\\s+)?|\\.?\\/?(?:\\S*\\/)?node_modules\\/\\.bin\\/)?(?:vitest|jest|mocha|ava|tap|tape|uvu|karma|jasmine|cypress\\s+run|playwright\\s+test|bun\\s+test|deno\\s+test)(?=\\s|$|[;&|)])"),
					/^node\s+(?:-[\w-]+\s+)*--test(?=\s|$|[;&|)])/,
					/^(?:pytest|py\.test|nose2|nosetests|tox)(?=\s|$|[;&|)])/,
					/* @__PURE__ */ new RegExp("^(?:python[0-9.]*|py|pypy[0-9]*)\\s+(?:-[\\w-]+\\s+)*-m\\s+(?:pytest|unittest|nose2)(?=\\s|$|[;&|)])"),
					/^cargo\s+(?:\+\S+\s+)?(?:test|nextest)(?=\s|$|[;&|)])/,
					/^go\s+test(?=\s|$|[;&|)])/,
					/^swift\s+test(?=\s|$|[;&|)])/,
					/^xcodebuild\b(?=.*\s(?:test|test-without-building)(?=\s|$|[;&|)]))/,
					/^(?:make\s+(?:-[\w-]+\s+)*(?:test|check)|ctest)(?=\s|$|[;&|)])/,
					/^(?:sh|bash|zsh|dash|python[0-9.]*|py|node|bun|tsx|ts-node)\s+(?:-(?!n(?:\s|$))[\w-]+\s+)*(?:\S*\/)?(?:test_[\w.-]*\.py|[\w.-]*_test\.(?:sh|py|js|mjs|cjs|ts|mts)|[\w.-]*\.(?:test|spec)\.(?:js|mjs|cjs|ts|mts|tsx|jsx))(?=\s|$|[;&|)])/,
					/^(?:\.\/|\S*\/)?[\w.-]*_test\.sh(?=\s|$|[;&|)])/
				],
				build: [
					/* @__PURE__ */ new RegExp("^(?:npm|pnpm|yarn|bun)\\s+(?:(?:-{1,2}[\\w-]+(?:=\\S+)?|(?:-F|--filter|-C|--dir|--prefix|-w|--workspace|--cwd)\\s+\\S+)\\s+)*(?:run\\s+|run-script\\s+)?(?:build|typecheck|type-check|tsc|compile|bundle)(?::[\\w:.-]+)?(?=\\s|$|[;&|)])"),
					/* @__PURE__ */ new RegExp("^(?:(?:npx|bunx|pnpx|pnpm(?:\\s+exec|\\s+dlx|\\s+run)?|npm\\s+exec|yarn(?:\\s+exec|\\s+run)?|bun(?:\\s+x|\\s+run)?)\\s+(?:-{1,2}[\\w-]+(?:=\\S+)?\\s+)*(?:--\\s+)?|\\.?\\/?(?:\\S*\\/)?node_modules\\/\\.bin\\/)?(?:tsc|vite\\s+build|next\\s+build|nuxt\\s+build|tsup|tsdown|esbuild|rollup|webpack|turbo\\s+(?:run\\s+)?build|nx\\s+build|ng\\s+build|vue-cli-service\\s+build)(?=\\s|$|[;&|)])"),
					/^cargo\s+(?:\+\S+\s+)?(?:build|check)(?=\s|$|[;&|)])/,
					/^go\s+build(?=\s|$|[;&|)])/,
					/^swift\s+build(?=\s|$|[;&|)])/,
					/^xcodebuild\b(?!.*\s(?:test|test-without-building)(?=\s|$|[;&|)]))/,
					/^make(?:\s+-[\w=-]+)*(?:\s+(?:all|build))?\s*$/,
					/^cmake\s+--build(?=\s|$|[;&|)])/,
					/^docker\s+(?:buildx\s+)?build(?=\s|$|[;&|)])/,
					/^docker\s+compose\s+(?:-[\w-]+(?:=\S+)?\s+)*build(?=\s|$|[;&|)])/
				],
				lint: [
					/* @__PURE__ */ new RegExp("^(?:npm|pnpm|yarn|bun)\\s+(?:(?:-{1,2}[\\w-]+(?:=\\S+)?|(?:-F|--filter|-C|--dir|--prefix|-w|--workspace|--cwd)\\s+\\S+)\\s+)*(?:run\\s+|run-script\\s+)?(?:lint|eslint|stylelint|format:check|prettier:check|fmt:check)(?::[\\w:.-]+)?(?=\\s|$|[;&|)])"),
					/* @__PURE__ */ new RegExp("^(?:(?:npx|bunx|pnpx|pnpm(?:\\s+exec|\\s+dlx|\\s+run)?|npm\\s+exec|yarn(?:\\s+exec|\\s+run)?|bun(?:\\s+x|\\s+run)?)\\s+(?:-{1,2}[\\w-]+(?:=\\S+)?\\s+)*(?:--\\s+)?|\\.?\\/?(?:\\S*\\/)?node_modules\\/\\.bin\\/)?(?:eslint|oxlint|biome\\s+(?:lint|check|ci)|stylelint|prettier\\s+(?:-c|--check)|tslint|standard|xo)(?=\\s|$|[;&|)])"),
					/^(?:ruff\s+check|ruff\s+format\s+--check|flake8|pylint|mypy|pyright|black\s+--check|isort\s+(?:--check|--check-only|-c)|bandit|pyflakes|pycodestyle)(?=\s|$|[;&|)])/,
					/* @__PURE__ */ new RegExp("^(?:python[0-9.]*|py|pypy[0-9]*)\\s+(?:-[\\w-]+\\s+)*-m\\s+(?:ruff|flake8|pylint|mypy|pyright|pyflakes|pycodestyle|bandit)(?=\\s|$|[;&|)])"),
					/^cargo\s+(?:\+\S+\s+)?(?:clippy|fmt\s+(?:--all\s+)?--check)(?=\s|$|[;&|)])/,
					/^(?:go\s+vet|golangci-lint|staticcheck|gofmt\s+-l|goimports\s+-l)(?=\s|$|[;&|)])/,
					/^(?:swiftlint|swift-format\s+lint)(?=\s|$|[;&|)])/,
					/^make\s+(?:-[\w-]+\s+)*lint(?=\s|$|[;&|)])/,
					/^(?:shellcheck|hadolint|yamllint|markdownlint(?:-cli2?)?|actionlint)(?=\s|$|[;&|)])/
				]
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
			JOB_TOOLS: ["job_output"],
			/** 退出码只认返回文本的**末行**，且必须在行首、`[` 之后或逗号之后：dsh 的 bash 工具在末尾追加
			*  `[exit code: N]`（仅非零），后台任务 job_output 末行是 `[status: completed, exit code: N]`；
			*  正文中间引用别的日志里的 "exit code: 1"（如 docker 构建输出被 head 出来）、末行的
			*  "expected exit code: 1"（评审 P3-7）都不算本次命令的退出码——2026-09-06 真实日志核对。 */
			EXIT_CODE: /(?:^|\[|,\s*)exit[ _]code[:=]?\s*(\d+)\)?\]?\.?\s*$/i
		};
		/**
		* 模型 → 上下文窗口（token）。上下文压力轨道用它把绝对输入量换算成占用百分比；
		* 匹配不到时返回 null，轨道诚实回退为绝对 token 数（不猜窗口）。
		* 数值取各家公开文档口径（2026-08），新模型按需补行——只加确定的，不加猜的。
		*/
		const CONTEXT_WINDOWS = [
			[/deepseek-v4/i, 1e6],
			[/deepseek-flash/i, 1e6],
			[/deepseek/i, 128e3],
			[/kimi|moonshot/i, 256e3],
			[/qwen/i, 128e3],
			[/glm/i, 128e3],
			[/gpt-5/i, 4e5],
			[/gpt-4\.1/i, 1e6],
			[/gpt-4o|o[34]-mini|o3\b/i, 128e3],
			[/claude/i, 2e5],
			[/gemini/i, 1e6]
		];
		/** todo-freshness-guard 插件名（行为信号「待办陈旧」数它的提醒）。 */
		const TODO_GUARD = "todo-freshness-guard";
		/**
		* 这条注入上下文是不是 todo-freshness-guard 的提醒。日志格式 v0–v3（宿主 ≤0.1.6）写
		* `{kind:'plugin', plugin:'todo-freshness-guard'}`；v4（宿主 0.1.7 起）拒收 kind 'plugin'，迁移把旧来源
		* 改写成 `{kind:'plugin:todo-freshness-guard'}`，插件改用自有 kind 时也可能直接写 'todo-freshness-guard'——三种都认。
		* 实时链路（Chat 的 context 节点）与上传链路（user/message 事件）共用这一个判定。
		* @param {unknown} source 消息的 source 字段
		* @returns {boolean}
		*/
		function isTodoReminderSource(source) {
			if (source === null || typeof source !== "object") return false;
			const kind = source.kind;
			if (kind === "plugin") return source.plugin === TODO_GUARD;
			return kind === "plugin:todo-freshness-guard" || kind === TODO_GUARD;
		}
		/**
		* 按模型名解析上下文窗口。
		* @param model 模型名（可空）
		* @returns 窗口 token 数；未知模型返回 null
		*/
		function contextWindowFor(model) {
			if (!model) return null;
			for (const [re, win] of CONTEXT_WINDOWS) if (re.test(model)) return win;
			return null;
		}
		/**
		* 盲目重试簇标注（借 AgentLens 的确定性检测）：时间序上连续的「同工具 + 参数相似」
		* 调用簇，且簇内至少一次失败，才算盲目重试——不加失败约束会把「连续编辑同一文件」
		* 这类正常工作方式冤枉进去（edit 参数只有文件路径）。就地把簇内非失败调用改判
		* v='retry' 并写结构化依据；失败调用保持 error，簇上下文追加在 why2。返回命中簇数。
		* calls 必须按时间序传入，且只传已有结果的调用（实时模式排除 in-flight）。
		*/
		function markRetryClusters(calls) {
			let clusters = 0;
			let start = 0;
			for (let i = 1; i <= calls.length; i++) {
				if (!(i === calls.length || calls[i].name !== calls[i - 1].name || argSimilarity(calls[i].args, calls[i - 1].args) < VERDICT_RULES.RETRY_SIMILARITY)) continue;
				const len = i - start;
				if (len >= VERDICT_RULES.RETRY_MIN_CLUSTER) {
					const cluster = calls.slice(start, i);
					const fails = cluster.filter((c) => c.v === "error").length;
					if (fails > 0) {
						clusters += 1;
						for (const c of cluster) if (c.v === "error") c.why2 = {
							k: "retryCtx",
							p: [len]
						};
						else {
							c.v = "retry";
							c.why = {
								k: "retryCluster",
								p: [len, fails]
							};
						}
					}
				}
				start = i;
			}
			return clusters;
		}
		/**
		* 返回文本末行里的退出码；没有则 null。要传**未压空白**的原文（两条链路都在截断/压空白前算好
		* 存到 tl.exit）；压过空白的文本整段算一行，dsh 追加在末尾的 `[exit code: N]` 仍能命中。
		*/
		function exitCodeOf(text) {
			const t = String(text ?? "").trimEnd();
			if (t === "") return null;
			const line = t.slice(t.lastIndexOf("\n") + 1);
			const m = ANALYSIS_RULES.EXIT_CODE.exec(line);
			return m ? Number(m[1]) : null;
		}
		/**
		* 阈值全部按 2026-09-06 本机 202 份会话（149 场有效）校准，脚本
		* trace-compare-verdict-calibration/behavior-signals-calib.mjs（2026-09-07 独立评审后修正三处——循环去重、签名同规则、
		* 失败改用 toolVerdict——并重跑，各条命中占比见下）；定阈值的原则：「中」落在最差的 15%~20% 会话，「高」落在最差的
		* 3%~5%。改这里必须重跑校准脚本，把命中占比记进 CHANGELOG。
		*/
		ANALYSIS_RULES.SIGNALS = {
			/** 轮询 / 记账类工具：不参与重复与循环计数（它们本来就要反复调）。 */
			POLL_TOOLS: [
				"job_output",
				"todo_write",
				"list_agents",
				"send_message",
				"wait",
				"sleep"
			],
			/** 读取类工具（重复读取子标签用）。 */
			READ_TOOLS: [
				"read",
				"grep",
				"glob",
				"ls",
				"list_files",
				"search"
			],
			/** shell 里的读取类命令（作用于命令文本开头）。 */
			READ_SHELL: /^(?:cat|sed|head|tail|rg|grep|ls|find|wc|git (?:log|status|diff|show)) /,
			/** 参数签名截断长度（与校准脚本一致）。 */
			SIG_MAX: 300,
			/** 失败后原样重试：上一次失败、这一次同工具同参数。中 ≥1，高 ≥3（按 toolVerdict 口径重跑 15% / 4%；换策略恢复 32%，信息级不设阈值）。 */
			MECHANICAL: {
				medium: 1,
				high: 3
			},
			/** 同轮重复调用：占本场调用的比例且次数（低 ≥10% 且 ≥5；中 ≥15% 且 ≥8）。2026-09-07 签名与页面同规则后重跑，旧「中」（≥20% 且 ≥10）只命中 8%，
			*  低于 15%~20% 的目标区间，2026-09-24 吴昊拍板放宽到 ≥15% 且 ≥8。 */
			REPEAT: {
				low: {
					rate: .1,
					min: 5
				},
				medium: {
					rate: .15,
					min: 8
				}
			},
			/** 重复读取子标签：同轮重复里读取类 ≥5（重跑校准 26%，只作子标签）。 */
			REPEAT_READ: 5,
			/** 循环：排除轮询类后长度 1~3 的序列连续 3 次，长窗口先扫、已覆盖的下标不再数；占用步数 中 ≥9，高 ≥30（去重后重跑校准 16% / 4%，落在目标区间）。 */
			LOOP: {
				medium: 9,
				high: 30
			},
			/** 工具失败（判定 = toolVerdict，错误标志 + 输出特征）：中 = 失败率 ≥8%（且本场调用 ≥10 次，与校准集口径一致）或失败 ≥10 次；
			*  高 = 失败率 ≥15% 且 ≥10 次（2026-09-07 第二轮：校准脚本真正接上 toolVerdict 后旧阈值命中 38% / 5%，按目标区间重定；
			*  第三轮喂 toolVerdict 的文本先压空白后重跑 19% / 3%，普通模式单看 23% / 3%，code 模式几乎不失败把整体拉低）。 */
			FAIL: {
				medium: {
					count: 10,
					rate: .08,
					minCalls: 10
				},
				high: {
					count: 10,
					rate: .15
				}
			},
			/** 慢调用：单次 ≥120 秒；低 ≥1 次，中 ≥3 次（校准 14% / 3%，2026-09-07 去掉压缩重发的 tool/result 后重算）。相对均值的口径在 72% 会话触发，没有区分度，已弃。 */
			SLOW_SEC: 120,
			SLOW: {
				low: 1,
				medium: 3
			},
			/** 工具集中度：调用 ≥20 次且赫芬达尔指数 ≥0.85（低，校准 10%）。 */
			HHI: {
				minCalls: 20,
				min: .85
			},
			/** 上下文骤升 / 骤降：相邻两次请求占用变化 ≥20 个百分点，只在同一窗口内比（升为中，降为信息；按逐请求窗口重跑 1% / 4%）。 */
			CTX_JUMP: .2,
			/** 上下文峰值占窗口：低 ≥50%，中 ≥70%，高 ≥90%（校准 11% / 5% / 0%，1M 窗口下几乎不亮）。 */
			CTX_PEAK: {
				low: .5,
				medium: .7,
				high: .9
			},
			/** 压缩发生：compaction/start ≥1 为信息；prune ≥10 另加一句（校准 5%）。 */
			PRUNE_NOTE: 10,
			/** 待办陈旧：todo-freshness-guard 提醒次数 低 ≥10，中 ≥30（校准 11% / 3%）。 */
			TODO: {
				low: 10,
				medium: 30
			}
		};
		//#endregion
		//#region src/client/live-data.ts
		/** Narrow one ordered Chat node to a registered renderer kind. */
		function isKind(node, kind) {
			return node.kind === kind;
		}
		/**
		* A Tool root carries `kind: 'tool-result'` once settled; a running call has no
		* `kind` field at all. Narrowed inline so ui-chat stays a type-only dependency
		* (importing its `isSettledTool` would put ui-chat in the bundle's externals,
		* and it is not one of the host's platform seed modules).
		*/
		function isSettled(block) {
			return "kind" in block;
		}
		/** Ordered materialized nodes of the Chat target, in render order. */
		function orderedNodes(snap) {
			const out = [];
			for (const key of snap.order) {
				const node = snap.nodes.get(key);
				if (node !== void 0) out.push(node);
			}
			return out;
		}
		/** Owning turn of one Chat node from its engine-resolved location, when placed. */
		function locationTurn(node) {
			const loc = node.location;
			return loc.kind === "turn" || loc.kind === "step" ? loc.turn.turn : null;
		}
		/** Wall-clock time of one Chat node, or null for kinds that carry none. */
		function nodeTime(node) {
			if (isKind(node, "assistant-step")) return node.data.time;
			if (isKind(node, "tool-call")) {
				const root = node.data.root;
				return isSettled(root) ? root.callTime ?? root.time : root.time;
			}
			if (isKind(node, "model-retry")) return node.data.current.time;
			if (isKind(node, "turn-error")) return node.data.time;
			if (isKind(node, "turn-tail")) return node.data.time;
			return null;
		}
		/** Child detour steps start here so they never collide with parent step ids. */
		const CHILD_STEP_BASE = 1e5;
		/** Request-failure marker steps start here (offset by node seq — unique and replay-stable). */
		const EVT_STEP_BASE = 2e5;
		/**
		* Lane token totals, taking each turn from its most exact source.
		*
		* A completed turn reports provider-exact totals on its tail row, covering
		* every billed attempt — including requests that failed and were retried, whose
		* tokens no assistant node ever carried. A turn still running has no tail yet,
		* so its steps are summed as before. Each turn is counted once, from one source.
		* Input counts uncached prompt tokens only, matching what the lane header
		* reports: cache re-reads repeat the whole context on every request, so summing
		* them yields a huge number that says nothing about real usage.
		* @param rows - scanned maze rows.
		* @param turnTokens - exact per-turn totals published by completed turns.
		* @returns lane input, reasoning and output totals, or null when nothing reported.
		*/
		function laneTokens(rows, turnTokens) {
			let rzTok = null;
			let outTok = null;
			let inTok = null;
			const add = (into, value) => (into ?? 0) + value;
			for (const [, exact] of turnTokens) {
				inTok = add(inTok, exact.in);
				outTok = add(outTok, exact.out);
				if (exact.rz !== null) rzTok = add(rzTok, exact.rz);
			}
			for (const r of rows) {
				if (r.turn !== void 0 && turnTokens.has(r.turn)) continue;
				if (r.inTok != null) inTok = add(inTok, r.inTok);
				if (r.outTok != null) outTok = add(outTok, r.outTok);
				if (r.rzTok != null) rzTok = add(rzTok, r.rzTok);
			}
			return {
				rzTok,
				outTok,
				inTok
			};
		}
		/** Fix a settled tool's duration and verdict once its span is final. */
		function settleToolSpan(tool) {
			if (tool.e === null) return;
			tool.dur = Math.round((tool.e - tool.s) * 10) / 10;
			const tv = toolVerdict(tool);
			tool.v = tv.v;
			tool.why = tv.why;
		}
		/** Concatenated text blocks with whitespace untouched — the exit-code reader wants the real last line. */
		function rawText(blocks) {
			if (!blocks) return "";
			const out = [];
			for (const b of blocks) if (b.type === "text" && b.text !== void 0) out.push(b.text);
			return out.join("");
		}
		/** Latest wall-clock event time in a conversation, or null while empty. */
		function lastActivityTime(snap) {
			let last = null;
			for (const n of orderedNodes(snap)) {
				const t = nodeTime(n);
				if (t !== null) last = last === null ? t : Math.max(last, t);
			}
			return last;
		}
		/**
		* Wall-clock start of the earliest loaded turn. Replaces the old "first user
		* message" probe: turn boundaries are now resolved by the engine and published
		* on the timeline, so the anchor no longer depends on a user node being inside
		* the event window.
		*/
		function firstTurnStart(snap) {
			for (const turn of snap.timeline.turnOrder) {
				const start = snap.timeline.turns.get(turn)?.start;
				if (start !== void 0) return start.time;
			}
			return null;
		}
		/**
		* Scan one conversation snapshot into verdict-settled maze rows.
		* @param snap - the conversation to scan.
		* @param rel - wall-clock ms → maze seconds, chosen by the caller so a child
		* session can share its parent's axis.
		* @returns rows in step order with settled verdicts.
		*/
		function scanRows(snap, rel, nowMs = Date.now()) {
			const nodes = orderedNodes(snap);
			const anchor = firstTurnStart(snap);
			const byStep = /* @__PURE__ */ new Map();
			const rows = [];
			let nextStep = 0;
			let turn = 0;
			const rowFor = (loc, s, seq) => {
				const key = `${String(loc[0])}:${String(loc[1])}`;
				const found = byStep.get(key);
				if (found !== void 0) {
					found.s = Math.min(found.s, s);
					if (seq !== void 0 && found.seq === void 0) found.seq = seq;
					return found;
				}
				nextStep += 1;
				const node = {
					step: nextStep,
					turn: Math.max(loc[0], 1),
					s,
					e: s,
					tools: [],
					rz: 0,
					rzTxt: "",
					v: "ok",
					...seq === void 0 ? {} : { seq }
				};
				byStep.set(key, node);
				rows.push(node);
				return node;
			};
			/** Engine-resolved (turn, step) of one node, or null when it is not step-placed. */
			const stepOf = (node) => {
				const loc = node.location;
				return loc.kind === "step" ? [loc.turn.turn, loc.step.step] : null;
			};
			/**
			* Settled calls whose own start is unknown — window truncation left the
			* tool/call event outside the loaded range, so the root reports no
			* `callTime`. Their bars are anchored to the owning step's start once every
			* node has contributed to it, which is the honest floor: the call cannot
			* have been issued before its step began.
			*/
			const unanchored = [];
			/** Every settled bar, so result excerpts are cut after the verdicts settle. */
			const settledTools = [];
			const turnTokens = /* @__PURE__ */ new Map();
			const userMsgs = [];
			const compaction = {
				starts: [],
				prunes: 0,
				summaries: 0,
				ends: 0
			};
			let ctxToolChars = 0;
			const ctxSkillsLoaded = /* @__PURE__ */ new Set();
			let todoReminders = 0;
			/** Turn endings read off the nodes themselves — the fallback when the timeline carries no turn/end event. */
			const endByNode = /* @__PURE__ */ new Map();
			let preWindow = 0;
			let liveRow = null;
			for (const n of nodes) {
				const t = locationTurn(n);
				if (t !== null) turn = t;
				if (isKind(n, "assistant-step")) {
					const d = n.data;
					if (anchor !== null && d.time < anchor) {
						preWindow += 1;
						continue;
					}
					const loc = stepOf(n) ?? [d.turn, d.step];
					const running = d.status === "running";
					const now = rel(nowMs);
					const cur = rowFor(loc, running ? now : rel(d.finalNode?.timing?.stepStartTime ?? d.time), n.anchorSeq);
					cur.e = Math.max(cur.e, running ? now + .1 : rel(d.time));
					let rzTxt = cur.rzTxt;
					for (const b of d.blocks) if (b.kind === "reasoning") {
						cur.rz += 1;
						rzTxt += b.text;
					}
					const rzClean = rzTxt.replace(/\s+/g, " ").trim();
					cur.rzTxt = rzClean.slice(0, 240);
					cur.rzTxtFull = rzClean.slice(0, 2e3);
					if (running) {
						cur.live = true;
						liveRow = cur;
					}
					const u = d.usage ?? d.finalNode?.usage;
					if (u !== null && u !== void 0 && typeof u === "object") {
						if (typeof u.reasoningTokens === "number") cur.rzTok = u.reasoningTokens;
						if (typeof u.outputTokens === "number") cur.outTok = u.outputTokens;
						if (typeof u.inputTokens === "number") cur.inTok = u.inputTokens;
						if (typeof u.cacheReadTokens === "number") cur.cacheTok = u.cacheReadTokens;
					}
				} else if (isKind(n, "tool-call")) {
					const root = n.data.root;
					const settled = isSettled(root);
					const callAt = settled ? root.callTime ?? root.time : root.time;
					if (anchor !== null && callAt < anchor) continue;
					const loc = stepOf(n) ?? (settled ? null : [root.turn, root.step]);
					if (loc === null) continue;
					const s = rel(callAt);
					const cur = rowFor(loc, s);
					const toolName = settled ? root.call?.name ?? "?" : root.name;
					const toolArgs = settled ? root.call?.argsRaw ?? "" : root.argsRaw ?? "";
					if (toolName === "skill") {
						const m = /name=([^\s&]+)/.exec(toolArgs);
						if (m && m[1]) ctxSkillsLoaded.add(m[1]);
					}
					const tool = {
						k: "t",
						name: toolName,
						s,
						e: null,
						args: toolArgs,
						res: "",
						err: false,
						dur: 0,
						v: "ok",
						callId: root.callId
					};
					cur.tools.push(tool);
					if (settled) {
						tool.e = rel(root.time);
						const raw = rawText(root.content);
						tool.exit = exitCodeOf(raw);
						tool.res = raw.replace(/\s+/g, " ").trim();
						ctxToolChars += raw.length;
						tool.err = root.isError;
						cur.e = Math.max(cur.e, tool.e);
						settledTools.push(tool);
						if (root.callTime === null) unanchored.push({
							tool,
							row: cur
						});
						else settleToolSpan(tool);
					}
				} else if (isKind(n, "model-retry")) for (const attempt of n.data.attempts) {
					if (anchor !== null && attempt.time < anchor) continue;
					const s = rel(attempt.time);
					const cancelled = attempt.retryState === "cancelled";
					const fail = `${attempt.failure.message}${attempt.failure.code === "" ? "" : ` [${attempt.failure.code}]`}`;
					rows.push({
						step: EVT_STEP_BASE + attempt.seq,
						turn: Math.max(turn, 1),
						seq: attempt.seq,
						s,
						e: cancelled ? s : Math.max(rel(attempt.time + attempt.delayMs), s),
						tools: [],
						rz: 0,
						rzTxt: "",
						v: "error",
						evt: "retry",
						label: `↻${attempt.retry}`,
						why: {
							k: "llmRetry",
							p: [
								attempt.retry,
								attempt.mode === "always" ? "∞" : attempt.maxRetries,
								Math.round(attempt.delayMs / 100) / 10,
								fail,
								cancelled ? 1 : 0
							]
						}
					});
				}
				else if (isKind(n, "turn-error")) {
					const d = n.data;
					if (anchor !== null && d.time < anchor) continue;
					const s = rel(d.time);
					rows.push({
						step: EVT_STEP_BASE + d.seq,
						turn: Math.max(turn, 1),
						seq: d.seq,
						s,
						e: s,
						tools: [],
						rz: 0,
						rzTxt: "",
						v: "error",
						evt: "turnError",
						label: "✗",
						why: {
							k: "turnError",
							p: [d.message, d.code ?? ""]
						}
					});
					endByNode.set(Math.max(turn, 1), {
						kind: "error",
						s
					});
				} else if (isKind(n, "turn-max-tokens")) {
					const d = n.data;
					if (anchor !== null && d.time < anchor) continue;
					if (endByNode.get(d.turn)?.kind !== "error") endByNode.set(d.turn, {
						kind: "max-tokens",
						s: rel(d.time)
					});
				} else if (isKind(n, "turn-tail")) {
					const usage = n.data.tokenUsage;
					if (usage !== void 0) turnTokens.set(n.data.turn, {
						in: usage.uncachedInputTokens,
						out: usage.outputTokens,
						rz: usage.reasoningTokens ?? null
					});
					if (!endByNode.has(n.data.turn)) endByNode.set(n.data.turn, {
						kind: "completed",
						s: rel(n.data.time)
					});
				} else if (isKind(n, "user") || isKind(n, "steering")) {
					if (anchor !== null && n.data.time < anchor) continue;
					userMsgs.push({ s: rel(n.data.time) });
				} else if (isKind(n, "compaction")) {
					if (anchor !== null && n.data.time < anchor) continue;
					compaction.starts.push(rel(n.data.time));
					compaction.ends += 1;
					if (n.data.summary !== null) compaction.summaries += 1;
				} else if (isKind(n, "context")) {
					if (isTodoReminderSource(n.data.source)) todoReminders += 1;
				}
			}
			const turnEnds = [];
			const fromTimeline = /* @__PURE__ */ new Set();
			for (const t of snap.timeline.turnOrder) {
				const endEv = snap.timeline.turns.get(t)?.end;
				if (endEv === void 0) continue;
				turnEnds.push({
					turn: t,
					kind: endEv.data.reason.kind,
					s: rel(endEv.time)
				});
				fromTimeline.add(t);
			}
			for (const [t, e] of endByNode) if (!fromTimeline.has(t)) turnEnds.push({
				turn: t,
				...e
			});
			turnEnds.sort((a, b) => a.turn - b.turn);
			for (const { tool, row } of unanchored) {
				tool.s = Math.min(row.s, tool.e ?? row.s);
				settleToolSpan(tool);
			}
			for (const tool of settledTools) {
				tool.resFull = tool.res.slice(0, 5e3);
				tool.res = tool.res.slice(0, 380);
			}
			rows.sort((a, b) => a.s - b.s);
			const settled = [];
			for (const r of rows) {
				if (r === liveRow) continue;
				for (const t of r.tools) if (t.e !== null) settled.push(t);
			}
			markRetryClusters(settled);
			for (const r of rows) {
				if (r === liveRow) continue;
				if (r.evt !== void 0) continue;
				if (r.tools.length === 0) {
					r.v = "answer";
					r.why = { k: "noTools" };
					continue;
				}
				const sv = stepVerdict(r.tools.filter((t) => t.e !== null));
				if (sv !== null) {
					r.v = sv.v;
					if (sv.why !== void 0) r.why = sv.why;
					if (sv.why2 !== void 0) r.why2 = sv.why2;
				} else r.why = { k: "pendingTools" };
			}
			const context = {
				sys: null,
				instr: null,
				skills: null,
				plugin: [],
				tool: ctxToolChars || null,
				user: null,
				assistant: null,
				loaded: [...ctxSkillsLoaded],
				live: true
			};
			return {
				rows,
				liveRow,
				preWindow,
				turnTokens,
				turnEnds,
				userMsgs,
				compaction,
				todoReminders,
				byStep,
				context
			};
		}
		/**
		* Fold one child session into a single aggregated detour node: the node's
		* span is the child's activity span, its sub-bars are the child's judged
		* tool calls, and the verdict line names the child.
		* @param child - child roster row plus its conversation on the parent clock.
		* @param index - roster position, offset into the reserved child step range.
		* @returns the detour node, or null while the child has no usable rows.
		*/
		function childDetourNode(child, index, rel, nowMs) {
			if (child.conversation === null) return null;
			const { rows, liveRow } = scanRows(child.conversation, rel, nowMs);
			if (rows.length === 0) return null;
			const tools = rows.flatMap((r) => r.tools);
			const s = Math.min(...rows.map((r) => r.s));
			const e = Math.max(...rows.map((r) => r.e), child.running ? rel(nowMs) : 0);
			const rz = rows.reduce((n, r) => n + r.rz, 0);
			const rzTxt = rows.map((r) => r.rzTxt).filter((t) => t !== "").join(" ");
			const rzTok = rows.some((r) => r.rzTok != null) ? rows.reduce((n, r) => n + (r.rzTok ?? 0), 0) : null;
			const outTok = rows.some((r) => r.outTok != null) ? rows.reduce((n, r) => n + (r.outTok ?? 0), 0) : null;
			const inTok = rows.some((r) => r.inTok != null) ? rows.reduce((n, r) => n + (r.inTok ?? 0), 0) : null;
			const cacheTok = rows.some((r) => r.cacheTok != null) ? rows.reduce((n, r) => n + (r.cacheTok ?? 0), 0) : null;
			const settledRows = rows.filter((r) => r !== liveRow);
			const lastSettled = settledRows[settledRows.length - 1];
			const v = child.running ? "ok" : lastSettled?.v === "error" ? "error" : "ok";
			const state = child.running ? 1 : lastSettled?.v === "error" ? 2 : 0;
			const short = child.label.length > 12 ? `${child.label.slice(0, 12)}…` : child.label;
			return {
				step: CHILD_STEP_BASE + index,
				label: short,
				sub: true,
				s,
				e,
				tools,
				rz,
				rzTxt: rzTxt.slice(0, 240),
				rzTxtFull: rzTxt.slice(0, 2e3),
				...rzTok === null ? {} : { rzTok },
				...outTok === null ? {} : { outTok },
				...inTok === null ? {} : { inTok },
				...cacheTok === null ? {} : { cacheTok },
				v,
				why: {
					k: "child",
					p: [
						child.label,
						rows.length,
						tools.length,
						state
					]
				},
				...child.running ? { live: true } : {}
			};
		}
		/**
		* Convert the live session snapshot into maze data. Returns null while the
		* session has no usable conversation nodes yet.
		* @param snap - the current session's Chat target snapshot.
		* @param children - dsh subagent child sessions to fold in as detour nodes.
		* @param requests - the Trajectory target's assembled requests, the only
		* browser-side carrier of provider/model identity; omit and no model is reported.
		* @param opts - `now` (epoch ms; the view's one-second clock, so running branches
		* grow without a new snapshot) and `hostWindow` (the host's contextPressure
		* window for the current model — the same value as the host's own indicator).
		*/
		function snapshotToMazeData(snap, children = [], requests = [], opts = {}) {
			const nowMs = opts.now ?? Date.now();
			const nodes = orderedNodes(snap);
			const firstNode = nodes.length === 0 ? null : nodeTime(nodes[0]);
			const anchor = firstTurnStart(snap) ?? firstNode ?? Date.now();
			const rel = (t) => Math.max(0, Math.round((t - anchor) / 100) / 10);
			const { rows, preWindow, turnTokens, turnEnds, userMsgs, compaction, todoReminders, byStep, context } = scanRows(snap, rel, nowMs);
			if (rows.length === 0) return null;
			const main = [];
			const detours = [];
			let lastMain = null;
			for (const r of rows) if (r.v === "ok" || r.v === "answer") {
				main.push(r);
				lastMain = r;
			} else detours.push({
				...r,
				attach: lastMain?.step ?? 0
			});
			let childEnd = 0;
			let subHidden = 0;
			children.forEach((child, i) => {
				if (child.conversation === null) {
					subHidden += 1;
					return;
				}
				const lastT = lastActivityTime(child.conversation);
				if (!child.running && (lastT === null || lastT < anchor)) return;
				const node = childDetourNode(child, i, rel, nowMs);
				if (node === null) return;
				let attach = 0;
				let turn;
				for (const m of main) if (m.s <= node.s) {
					attach = m.step;
					turn = m.turn;
				} else break;
				let spawnSeq;
				let spawnS = -1;
				for (const r of rows) for (const t of r.tools) if (t.name.startsWith("subagent") && t.s <= node.s + 1 && t.s > spawnS) {
					spawnS = t.s;
					spawnSeq = r.seq;
					turn = r.turn;
				}
				detours.push({
					...node,
					attach,
					...turn === void 0 ? {} : { turn },
					...spawnSeq === void 0 ? {} : { seq: spawnSeq }
				});
				childEnd = Math.max(childEnd, node.e);
			});
			const toolsCount = rows.reduce((n, r) => n + r.tools.length, 0);
			const rzCount = rows.reduce((n, r) => n + r.rz, 0);
			const { rzTok, outTok, inTok } = laneTokens(rows, turnTokens);
			const T = Math.max(...rows.map((r) => r.e), childEnd, .1);
			let model = null;
			const perRequest = [];
			for (const request of requests) {
				const served = request;
				const named = served.providerMetadata?.model ?? served.provenance?.model ?? request.requestConfig?.model;
				if (named !== void 0 && named !== "") model = named;
				const loc = request;
				if (named !== void 0 && named !== "" && typeof loc.turn === "number" && typeof loc.step === "number" && loc.step > 0) {
					const row = byStep.get(`${String(loc.turn)}:${String(loc.step)}`);
					if (row !== void 0) perRequest.push({
						named,
						row
					});
				}
			}
			const hostWindow = typeof opts.hostWindow === "number" && Number.isFinite(opts.hostWindow) && opts.hostWindow > 0 ? opts.hostWindow : null;
			for (const { named, row } of perRequest) {
				const win = hostWindow !== null && named === model ? hostWindow : contextWindowFor(named);
				if (win !== null) row.ctxWin = win;
			}
			const lane = {
				key: "l1",
				model,
				preWindow,
				main,
				detours,
				turnEnds,
				userMsgs,
				compaction,
				todoReminders,
				context,
				...hostWindow === null ? {} : { ctxWindow: hostWindow },
				...subHidden > 0 ? { subHidden } : {},
				stats: {
					steps: rows.length,
					tools: toolsCount,
					rz: rzCount,
					rzTok,
					outTok,
					inTok,
					T,
					main: main.length,
					detours: detours.length
				}
			};
			return {
				Tmax: Math.max(T, 60),
				lanes: [lane]
			};
		}
		//#endregion
		//#region src/client/subagent-lanes.ts
		/**
		* Shallow equality of roster snapshots. An unchanged roster must not re-publish:
		* host 0.2.0 notifies the session list on ANY session's projection change, and a
		* fresh array there would make the maze recompute on every notification.
		*/
		function sameRoster(a, b) {
			if (a.length !== b.length) return false;
			for (let i = 0; i < a.length; i++) {
				const x = a[i], y = b[i];
				if (x.id !== y.id || x.label !== y.label || x.running !== y.running || x.conversation !== y.conversation) return false;
			}
			return true;
		}
		/** Catalog name first: on 0.1.5 an untitled child's displayTitle falls back to the workspace folder name. */
		function childLabel(id, entry, row) {
			return entry?.label ?? row?.displayTitle ?? id;
		}
		/** Observable child roster consumed by TraceLiveView via useSyncExternalStore. */
		var SubagentMazeSource = class {
			sessions;
			conversations;
			sessionId;
			#children = /* @__PURE__ */ new Map();
			#catalog = /* @__PURE__ */ new Map();
			#snapshot = [];
			#listeners = /* @__PURE__ */ new Set();
			#offList;
			#disposed = false;
			constructor(sessions, conversations, sessionId) {
				this.sessions = sessions;
				this.conversations = conversations;
				this.sessionId = sessionId;
				this.#offList = sessions.list.subscribe(() => {
					this.#sync();
				});
				const legacy = sessions;
				legacy.setSubagentCatalogOpen?.(sessionId, true);
				Promise.resolve(legacy.refreshSubagents?.(sessionId)).then(() => {
					this.#sync();
				}).catch(() => {});
				this.#sync();
			}
			getSnapshot = () => this.#snapshot;
			subscribe = (listener) => {
				this.#listeners.add(listener);
				return () => {
					this.#listeners.delete(listener);
				};
			};
			/** Passive roster: the catalog only supplies names (membership stays the session list). */
			setCatalog(entries) {
				this.#catalog = new Map((entries ?? []).map((entry) => [entry.id, entry]));
				this.#publish();
			}
			/** Idempotent: unsubscribes the list and every child projection. */
			dispose() {
				if (this.#disposed) return;
				this.#disposed = true;
				this.#offList();
				this.sessions.setSubagentCatalogOpen?.(this.sessionId, false);
				for (const child of this.#children.values()) this.#release(child);
				this.#children.clear();
				this.#listeners.clear();
				this.#snapshot = [];
			}
			#release(child) {
				child.released = true;
				child.off?.();
				child.off = null;
				child.offChat?.();
				child.offChat = null;
				child.chat = null;
			}
			#sync() {
				if (this.#disposed) return;
				const { byId } = this.sessions.list.getSnapshot();
				const wanted = /* @__PURE__ */ new Set();
				for (const row of Object.values(byId)) {
					const ephemeral = row.ephemeral;
					if (row.parentId === this.sessionId && row.origin === "subagent" && ephemeral !== true) wanted.add(row.id);
				}
				for (const [id, child] of this.#children) if (!wanted.has(id) || this.sessions.binding(id)?.session !== child.face) {
					this.#release(child);
					this.#children.delete(id);
				}
				for (const id of wanted) if (!this.#children.has(id)) this.#track(id);
				this.#publish();
			}
			/**
			* Follow one child passively.
			*
			* Deliberately does NOT open the child. Host 0.1.2 rejects a bare open() on a
			* subagent child ("subagent Sessions require their durable parent address"),
			* and the only supported way in — `sessions.openSubagent()` / the catalog
			* menu — is a NAVIGATION action: it sets the selected session, which would
			* yank the user out of the conversation they are watching the maze for. A
			* background roster must never do that.
			*
			* What remains is passive observation: the Conversation binding feeds off the
			* child's event window, so a child that is running streams into the maze
			* live. A child that finished before this view mounted has nothing in its
			* window and stays absent until the host offers a background history read.
			* @param id - child session id.
			*/
			#track(id) {
				const face = this.sessions.binding(id)?.session;
				if (face === void 0) return;
				const child = {
					face,
					off: null,
					chat: null,
					offChat: null,
					released: false
				};
				this.#children.set(id, child);
				child.off = face.subscribe(() => {
					this.#publish();
				});
				const chat = this.conversations.binding(id).target("chat");
				child.chat = chat;
				child.offChat = chat.subscribe(() => {
					this.#publish();
				});
				this.#publish();
			}
			#publish() {
				if (this.#disposed) return;
				const { byId } = this.sessions.list.getSnapshot();
				const next = [];
				for (const [id, child] of this.#children) {
					if (child.off === null) continue;
					const conversation = child.chat?.getSnapshot();
					if (conversation === void 0 || conversation.order.length === 0) continue;
					const row = byId[id];
					next.push({
						id,
						label: childLabel(id, this.#catalog.get(id), row),
						running: row?.running ?? false,
						conversation
					});
				}
				if (sameRoster(this.#snapshot, next)) return;
				this.#snapshot = next;
				for (const listener of [...this.#listeners]) try {
					listener();
				} catch (error) {
					console.error("[ui-trace-compare] subagent roster subscriber threw:", error);
				}
			}
		};
		/** Our reference source name, as the host's own views use `mainView` / `sidebarChat`. */
		const MAZE_RETAIN_SOURCE = "maze";
		/** True when the host can hold a child session for us (0.1.6-alpha.2+). */
		function hostCanRetain(sessions) {
			return typeof sessions?.retain === "function";
		}
		/** Module-level cache of settled children: survives tab switches, keyed by child session id. */
		const settledCache = /* @__PURE__ */ new Map();
		/** Whether the conversation's latest turn has a recorded end (its turn/end reached the window). */
		function lastTurnClosed(snap) {
			const order = snap.timeline.turnOrder;
			const lastTurn = order[order.length - 1];
			if (lastTurn === void 0) return false;
			const last = snap.timeline.turns.get(lastTurn);
			return last !== void 0 && last.end !== void 0;
		}
		/** Host contract: `binding.session.getSnapshot().openState`; 'error' means the open attempt failed (ready resolves anyway). */
		function openStateOf(binding) {
			const state = (binding?.session)?.getSnapshot?.()?.openState;
			return typeof state === "string" ? state : void 0;
		}
		/**
		* Roster that holds children itself (`sessions.retain`, source `maze`).
		* Rules (吴昊 2026-10-01 拍板): a running child is held until it settles; a
		* settled child is read once, released, and cached; at most MAX_LIVE_CHILDREN
		* children are expanded at once, the rest are counted as hidden; everything
		* is released on dispose (tab switch / session switch).
		*
		* Re-entrancy: the host publishes the new retention count to `sessions.list`
		* synchronously inside retain() and release(), and that list is what this
		* roster subscribes to — so every hold claims its slot before calling the
		* host, and #sync defers nested calls instead of running them.
		*/
		var RetainedSubagentRoster = class {
			sessions;
			conversations;
			sessionId;
			#held = /* @__PURE__ */ new Map();
			#settled = /* @__PURE__ */ new Map();
			/**
			* Children the host refused (retain threw, open failed, no mode) → whether the child was running
			* at the time. Not retried until the catalog changes — or, for a refusal seen while the child was
			* not running (possibly transient: descriptor not there yet), until it starts running.
			*/
			#failed = /* @__PURE__ */ new Map();
			#catalog = [];
			#catalogKey = "";
			#snapshot = [];
			#listeners = /* @__PURE__ */ new Set();
			#offList;
			#disposed = false;
			#syncing = false;
			#syncPending = false;
			#publishTimer = null;
			#cache;
			#settleGraceMs;
			#publishDelayMs;
			constructor(sessions, conversations, sessionId, options = {}) {
				this.sessions = sessions;
				this.conversations = conversations;
				this.sessionId = sessionId;
				this.#cache = options.cache ?? settledCache;
				this.#settleGraceMs = options.settleGraceMs ?? 3e3;
				this.#publishDelayMs = options.publishDelayMs ?? 250;
				this.#offList = sessions.list.subscribe(() => {
					this.#sync();
				});
			}
			getSnapshot = () => this.#snapshot;
			subscribe = (listener) => {
				this.#listeners.add(listener);
				return () => {
					this.#listeners.delete(listener);
				};
			};
			setCatalog(entries) {
				const list = [...entries ?? []];
				const key = list.map((e) => e.id).join("\n");
				if (key !== this.#catalogKey) {
					this.#catalogKey = key;
					this.#failed.clear();
				}
				this.#catalog = list;
				this.#sync();
			}
			dispose() {
				if (this.#disposed) return;
				this.#disposed = true;
				this.#offList();
				if (this.#publishTimer !== null) {
					clearTimeout(this.#publishTimer);
					this.#publishTimer = null;
				}
				const held = [...this.#held.values()];
				this.#held.clear();
				for (const child of held) this.#release(child);
				this.#listeners.clear();
				this.#snapshot = [];
			}
			#release(child) {
				if (child.released) return;
				child.released = true;
				if (child.graceTimer !== null) {
					clearTimeout(child.graceTimer);
					child.graceTimer = null;
				}
				child.offChat?.();
				child.offChat = null;
				child.chat = null;
				try {
					child.ref?.release();
				} catch (error) {
					console.error("[dsh-maze] releasing a child session threw:", error);
				}
			}
			#isRunning(id) {
				return this.sessions.list.getSnapshot().byId[id]?.running === true;
			}
			/** Re-entrancy guard around #syncOnce: nested notifications (from retain/release) run once afterwards. */
			#sync() {
				if (this.#disposed) return;
				if (this.#syncing) {
					this.#syncPending = true;
					return;
				}
				this.#syncing = true;
				try {
					this.#syncOnce();
				} finally {
					this.#syncing = false;
				}
				if (this.#syncPending) {
					this.#syncPending = false;
					this.#sync();
				}
			}
			/** Decide which catalog children to hold, hold/release accordingly, settle what finished, then publish. */
			#syncOnce() {
				const wanted = /* @__PURE__ */ new Set();
				let expanded = 0;
				for (const entry of this.#catalog) {
					const id = entry.id;
					const running = this.#isRunning(id);
					const failedWhileRunning = this.#failed.get(id);
					if (failedWhileRunning !== void 0) if (running && !failedWhileRunning) this.#failed.delete(id);
					else continue;
					if (!running && !this.#held.has(id) && (this.#settled.has(id) || this.#cache.has(id))) {
						if (!this.#settled.has(id)) this.#settled.set(id, this.#cache.get(id));
						continue;
					}
					if (expanded >= 8) continue;
					expanded += 1;
					wanted.add(id);
				}
				for (const [id, child] of [...this.#held]) if (!wanted.has(id)) {
					this.#held.delete(id);
					this.#release(child);
				}
				for (const entry of this.#catalog) if (wanted.has(entry.id) && !this.#held.has(entry.id)) this.#hold(entry);
				for (const id of [...this.#held.keys()]) this.#settleIfDone(id);
				this.#publish();
			}
			#hold(entry) {
				const api = this.sessions;
				if (typeof api.retain !== "function") return;
				if (typeof entry.mode !== "string") {
					this.#failed.set(entry.id, this.#isRunning(entry.id));
					return;
				}
				const child = {
					ref: null,
					chat: null,
					offChat: null,
					released: false,
					stoppedAt: null,
					graceTimer: null
				};
				this.#held.set(entry.id, child);
				let ref;
				try {
					ref = api.retain({
						parentSessionId: this.sessionId,
						childSessionId: entry.id,
						mode: entry.mode
					}, { source: MAZE_RETAIN_SOURCE });
				} catch (error) {
					console.error("[dsh-maze] could not hold child session", entry.id, error);
					this.#held.delete(entry.id);
					this.#failed.set(entry.id, this.#isRunning(entry.id));
					return;
				}
				if (child.released || this.#disposed) {
					try {
						ref.release();
					} catch (error) {
						console.error("[dsh-maze] releasing a child session threw:", error);
					}
					return;
				}
				child.ref = ref;
				ref.ready.then(() => {
					if (child.released || this.#disposed) return;
					if (openStateOf(ref.binding) === "error") {
						this.#drop(entry.id, child);
						return;
					}
					try {
						const chat = this.conversations.binding(ref.binding).target("chat");
						child.chat = chat;
						const off = chat.subscribe(() => {
							this.#onChildChange(entry.id);
						});
						child.offChat = off;
						if (child.released) {
							off();
							child.offChat = null;
						}
					} catch (error) {
						console.error("[dsh-maze] could not follow child conversation", entry.id, error);
						this.#drop(entry.id, child);
						return;
					}
					this.#onChildChange(entry.id);
				}).catch(() => {
					if (!child.released && !this.#disposed) this.#drop(entry.id, child);
				});
			}
			/** Give up on a child the host refused: release it, remember the refusal, publish. */
			#drop(id, child) {
				this.#failed.set(id, this.#isRunning(id));
				this.#held.delete(id);
				this.#release(child);
				this.#publish();
			}
			/**
			* A held child that is no longer running: cache it and release the hold — but only once its
			* conversation shows the last turn closed. The list's running flag flips synchronously on the
			* host while the follow stream delivers the last events later; settling on the flip alone would
			* cache a truncated conversation for good. A grace period bounds the wait.
			*/
			#settleIfDone(id, now = Date.now()) {
				const child = this.#held.get(id);
				if (child === void 0 || child.released) return;
				if (this.#isRunning(id)) {
					child.stoppedAt = null;
					if (child.graceTimer !== null) {
						clearTimeout(child.graceTimer);
						child.graceTimer = null;
					}
					return;
				}
				const conversation = child.chat?.getSnapshot();
				if (conversation === void 0 || conversation.order.length === 0) return;
				if (!lastTurnClosed(conversation)) {
					if (child.stoppedAt === null) child.stoppedAt = now;
					const waited = now - child.stoppedAt;
					if (waited < this.#settleGraceMs) {
						if (child.graceTimer === null) child.graceTimer = setTimeout(() => {
							child.graceTimer = null;
							this.#onChildChange(id);
						}, this.#settleGraceMs - waited);
						return;
					}
				}
				const entry = this.#catalog.find((e) => e.id === id);
				const row = this.sessions.list.getSnapshot().byId[id];
				const settled = {
					label: childLabel(id, entry, row),
					conversation
				};
				this.#settled.set(id, settled);
				this.#cache.set(id, settled);
				this.#held.delete(id);
				this.#release(child);
			}
			/** A held child's conversation changed (or its hold just became ready, or its grace period ended). */
			#onChildChange(id) {
				if (this.#disposed) return;
				this.#settleIfDone(id);
				this.#schedulePublish();
			}
			/** Streaming children change their conversation per chunk: coalesce those publishes. */
			#schedulePublish() {
				if (this.#publishDelayMs <= 0) {
					this.#publish();
					return;
				}
				if (this.#publishTimer !== null) return;
				this.#publishTimer = setTimeout(() => {
					this.#publishTimer = null;
					this.#publish();
				}, this.#publishDelayMs);
			}
			#publish() {
				if (this.#disposed) return;
				const { byId } = this.sessions.list.getSnapshot();
				const next = [];
				let expanded = 0;
				for (const entry of this.#catalog) {
					const id = entry.id;
					if (this.#failed.has(id)) continue;
					const running = this.#isRunning(id);
					const row = byId[id];
					const label = childLabel(id, entry, row);
					const held = this.#held.get(id);
					const cached = this.#settled.get(id);
					if (held !== void 0) {
						expanded += 1;
						const live = held.chat?.getSnapshot();
						const shown = live !== void 0 && live.order.length > 0 ? live : cached?.conversation;
						if (shown === void 0) continue;
						next.push({
							id,
							label,
							running,
							conversation: shown
						});
						continue;
					}
					if (cached !== void 0 && !running) {
						next.push({
							id,
							label: cached.label,
							running: false,
							conversation: cached.conversation
						});
						continue;
					}
					if (expanded >= 8) next.push({
						id,
						label,
						running,
						conversation: null
					});
				}
				if (sameRoster(this.#snapshot, next)) return;
				this.#snapshot = next;
				for (const listener of [...this.#listeners]) try {
					listener();
				} catch (error) {
					console.error("[dsh-maze] subagent roster subscriber threw:", error);
				}
			}
		};
		/** Pick the roster implementation the host supports. */
		function createSubagentRoster(sessions, conversations, sessionId) {
			return hostCanRetain(sessions) ? new RetainedSubagentRoster(sessions, conversations, sessionId) : new SubagentMazeSource(sessions, conversations, sessionId);
		}
		//#endregion
		//#region \0dsh-css:/Users/danielwu/Documents/StartUp_AIBrain/dsh-maze-diagnosis-wt/src/client/TraceLiveView.module.css.mjs
		const css = "._50Ob3W_frame{flex-direction:column;height:100%;display:flex}._50Ob3W_iframe{background:#f2f4f8;border:0;flex:1}body[data-ds-dark-theme] ._50Ob3W_iframe{background:#0d1219}._50Ob3W_empty{color:#7a869e;justify-content:center;align-items:center;height:100%;font-size:13px;display:flex}";
		const tagId = "dsh-maze/TraceLiveView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-maze";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var TraceLiveView_module_css_default = {
			"frame": "_50Ob3W_frame",
			"iframe": "_50Ob3W_iframe",
			"empty": "_50Ob3W_empty"
		};
		//#endregion
		//#region src/client/TraceLiveView.tsx
		/** How long the jump keeps polling for the target chat row before giving up (chat may still be rendering). */
		const JUMP_SEEK_TRIES = 40;
		const JUMP_SEEK_INTERVAL_MS = 100;
		/**
		* Switch this conversation column to the Chat view and reveal the step's row.
		* DOM-routed on purpose: the per-session chat store (view/inspect) is private
		* to ui-conversation's apply scope, so the plugin drives the visible controls
		* instead — the first `role=tab` button is the Chat tab (order 0), tool rows
		* carry `data-chat-call-id`, and a turn's closing assistant message carries
		* `id="dsh-message-<seq>"`. Works unchanged against stock dsh (rc.6). Rows
		* older than the chat's loaded window are not found; the jump then degrades
		* to the view switch alone.
		*/
		function jumpToChat(frame, msg) {
			const scrollport = frame.closest("[data-conversation-scroll]");
			if (scrollport === null) return;
			const column = scrollport.parentElement;
			if (column === null) return;
			const chatTab = column.querySelector("[role=\"tablist\"] [role=\"tab\"]");
			if (chatTab instanceof HTMLElement) chatTab.click();
			const selector = msg.callId !== void 0 ? `[data-chat-call-id="${CSS.escape(msg.callId)}"]` : msg.seq !== void 0 ? `[id="dsh-message-${String(msg.seq)}"]` : null;
			if (selector === null) return;
			let tries = 0;
			const seek = () => {
				const target = scrollport.querySelector(selector);
				if (target instanceof HTMLElement) {
					target.scrollIntoView({
						block: "center",
						behavior: "smooth"
					});
					target.animate([{ boxShadow: "0 0 0 3px rgba(45, 106, 143, 0.75)" }, { boxShadow: "0 0 0 3px rgba(45, 106, 143, 0)" }], {
						duration: 1800,
						easing: "ease-out"
					});
					return;
				}
				tries += 1;
				if (tries < JUMP_SEEK_TRIES) setTimeout(seek, JUMP_SEEK_INTERVAL_MS);
			};
			seek();
		}
		/** Stable stand-ins while the roster is not built yet (first render, or between session switches). */
		const NO_CHILDREN = [];
		const noRosterSubscribe = () => () => {};
		const noChildren = () => NO_CHILDREN;
		/**
		* Live maze view: a per-session conversation tab that mirrors the current
		* session's execution as a growing exploration maze. Subscribes to the
		* conversation snapshot (real-time) and pushes converted payloads into the
		* shared maze page inside an isolated iframe. The page's detail panel posts
		* trace-jump messages back; this component answers them by switching the
		* column to the Chat view and revealing the step's row.
		*/
		function TraceLiveView({ useChat, useTrajectory, sessionId, sessions, conversations, locale, t, useProjection }) {
			const snapshot = useChat((s) => s);
			const requests = useTrajectory((s) => s.requests);
			const [source, setSource] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				const roster = createSubagentRoster(sessions, conversations, sessionId);
				setSource(roster);
				return () => {
					roster.dispose();
				};
			}, [
				sessions,
				conversations,
				sessionId
			]);
			const children = (0, react.useSyncExternalStore)(source?.subscribe ?? noRosterSubscribe, source?.getSnapshot ?? noChildren);
			const catalogRaw = useProjection("subagentCatalog");
			const catalog = (0, react.useMemo)(() => {
				if (!Array.isArray(catalogRaw)) return void 0;
				const out = [];
				for (const item of catalogRaw) {
					if (item === null || typeof item !== "object") continue;
					const e = item;
					if (typeof e.id !== "string") continue;
					out.push({
						id: e.id,
						...typeof e.createdAt === "number" ? { createdAt: e.createdAt } : {},
						...typeof e.mode === "string" ? { mode: e.mode } : {},
						...typeof e.label === "string" ? { label: e.label } : {}
					});
				}
				return out;
			}, [catalogRaw]);
			(0, react.useEffect)(() => {
				source?.setCatalog(catalog);
			}, [source, catalog]);
			const hostWindow = ((v) => {
				if (v === null || typeof v !== "object") return void 0;
				const w = v.contextWindow;
				return typeof w === "number" && Number.isFinite(w) && w > 0 ? w : void 0;
			})(useProjection("contextPressure"));
			const hostModel = ((v) => {
				if (v === null || typeof v !== "object") return null;
				const m = v.model;
				return typeof m === "string" && m !== "" ? m : null;
			})(useProjection("modelIdentity"));
			const [now, setNow] = (0, react.useState)(() => Date.now());
			const data = (0, react.useMemo)(() => {
				const d = snapshotToMazeData(snapshot, children, requests, {
					now,
					...hostWindow === void 0 ? {} : { hostWindow }
				});
				const lane = d?.lanes[0];
				if (lane !== void 0 && lane.model === null && hostModel !== null) lane.model = hostModel;
				return d;
			}, [
				snapshot,
				children,
				requests,
				hostModel,
				now,
				hostWindow
			]);
			const anyLive = data !== null && data.lanes.some((l) => l.main.some((n) => n.live) || l.detours.some((n) => n.live));
			(0, react.useEffect)(() => {
				if (!anyLive) return;
				setNow(Date.now());
				const tick = () => {
					if (typeof document === "undefined" || !document.hidden) setNow(Date.now());
				};
				const id = setInterval(tick, 1e3);
				return () => {
					clearInterval(id);
				};
			}, [anyLive]);
			const iframeRef = (0, react.useRef)(null);
			const dataRef = (0, react.useRef)(null);
			dataRef.current = data;
			const srcDoc = (0, react.useMemo)(() => themedMazeHtml(MAZE_PAGE_HTML), []);
			(0, react.useEffect)(() => {
				const frame = iframeRef.current;
				if (frame !== null && data !== null) frame.contentWindow?.postMessage({
					kind: "trace-maze",
					data
				}, "*");
			}, [data]);
			const onLoad = () => {
				const frame = iframeRef.current;
				postThemeTo(frame);
				postLocaleTo(frame, locale);
				const payload = dataRef.current;
				if (frame !== null && payload !== null) frame.contentWindow?.postMessage({
					kind: "trace-maze",
					data: payload
				}, "*");
			};
			(0, react.useEffect)(() => watchHostTheme(() => {
				postThemeTo(iframeRef.current);
			}), []);
			(0, react.useEffect)(() => {
				postLocaleTo(iframeRef.current, locale);
				return locale.subscribe(() => {
					postLocaleTo(iframeRef.current, locale);
				});
			}, [locale]);
			(0, react.useEffect)(() => {
				const onMessage = (event) => {
					const frame = iframeRef.current;
					if (frame === null || event.source !== frame.contentWindow) return;
					const msg = event.data;
					if (msg === null || msg.kind !== "trace-jump") return;
					jumpToChat(frame, msg);
				};
				window.addEventListener("message", onMessage);
				return () => {
					window.removeEventListener("message", onMessage);
				};
			}, []);
			if (data === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: TraceLiveView_module_css_default.empty,
				children: t("live.empty")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: TraceLiveView_module_css_default.frame,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
					ref: iframeRef,
					title: "trace-live",
					className: TraceLiveView_module_css_default.iframe,
					srcDoc,
					sandbox: "allow-scripts allow-modals allow-downloads",
					onLoad
				})
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** `traceCompare` namespace dictionaries. */
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"trigger": "执行迷宫",
			"trigger.open": "打开执行迷宫",
			"trigger.close": "关闭执行迷宫",
			"title": "执行迷宫",
			"subtitle": "上传 session log，看模型真实的执行路径与分析",
			"view.live": "实时迷宫",
			"surface.close": "关闭（Esc）",
			"live.empty": "会话还没有可可视化的执行轨迹",
			"settings.sidebarEntry": "侧边栏入口",
			"settings.sidebarEntry.hint": "在侧边栏底部显示「执行迷宫」入口。关闭后「实时迷宫」页签不受影响。此开关按浏览器保存。"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"trigger": "Maze",
			"trigger.open": "Open Maze",
			"trigger.close": "Close Maze",
			"title": "Maze",
			"subtitle": "Upload session logs to see how the agent really worked, with analysis",
			"view.live": "Live Maze",
			"surface.close": "Close (Esc)",
			"live.empty": "No execution trace to visualize in this session yet",
			"settings.sidebarEntry": "Sidebar entry",
			"settings.sidebarEntry.hint": "Show the Maze entry at the bottom of the sidebar. The Live Maze tab is not affected. Saved per browser."
		};
		//#endregion
		//#region src/client/store.ts
		/** Shared transient visibility state for the trigger and center surface. */
		/**
		* Create one Trace Compare viewing-store handle for an apply lifetime.
		* @returns the root-scoped handle shared by both slot entries.
		*/
		function createTraceCompareViewStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({ open: false }),
				actions: {
					toggle: (draft) => {
						draft.open = !draft.open;
					},
					close: (draft) => {
						draft.open = false;
					}
				}
			});
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* Trace Compare browser plugin: sidebar footer trigger plus center-column
		* surface hosting the self-contained maze upload page.
		*/
		const NS = "traceCompare";
		/** Required services for slot composition, the subagent child roster, per-session Conversation assembly, and localized copy. */
		const inject = [
			"slots",
			"locale",
			"sessions",
			"uiConversation"
		];
		/** Mount the trigger, center surface, and live per-session view with one apply-scoped viewing store. */
		async function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-trace-compare: dictionaries");
			const t = ctx.locale.bind(NS);
			const viewStore = createTraceCompareViewStore();
			const mountSidebarEntry = () => ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "trace-compare",
				order: 10,
				locale: NS,
				store: viewStore
			}, TraceCompareTrigger));
			let disposeSidebarEntry = getMazeSettings().sidebarEntry ? mountSidebarEntry() : void 0;
			ctx.effect(() => subscribeMazeSettings(() => {
				const wanted = getMazeSettings().sidebarEntry;
				if (wanted && disposeSidebarEntry === void 0) disposeSidebarEntry = mountSidebarEntry();
				else if (!wanted && disposeSidebarEntry !== void 0) {
					const dispose = disposeSidebarEntry;
					disposeSidebarEntry = void 0;
					dispose();
				}
			}), "ui-trace-compare: sidebar entry switch");
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "dsh-maze",
				order: 50,
				locale: NS,
				label: () => t("title")
			}, MazeSettingsSection));
			const BoundTraceCompareSurface = (props) => (0, react.createElement)(TraceCompareSurface, {
				...props,
				locale: ctx.locale
			});
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "trace-compare",
				order: 10,
				locale: NS,
				store: viewStore
			}, BoundTraceCompareSurface));
			const BoundTraceLiveView = (props) => (0, react.createElement)(TraceLiveView, {
				...props,
				sessions: ctx.sessions,
				conversations: ctx.uiConversation,
				locale: ctx.locale
			});
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "trace-live",
				order: 20,
				locale: NS,
				label: () => t("view.live")
			}, BoundTraceLiveView));
			return async () => {};
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map