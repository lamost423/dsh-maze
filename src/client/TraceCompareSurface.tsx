import { useEffect, useMemo, useRef, useState } from 'react'
import type { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { createTraceCompareViewStore } from './store.ts'
import { currentSessionOf } from './current-session.ts'
import { postLocaleTo } from './locale-sync.ts'
import { MAZE_PAGE_HTML } from './maze-html.ts'
import { postThemeTo, themedMazeHtml, watchHostTheme } from './theme-sync.ts'
import { fetchLocalSessions, fetchSessionLog, rowLabel, rowTime, type LocalSessionRow } from './session-library.ts'
import { askModel } from './model-opinion.ts'
import css from './TraceCompareSurface.module.css'

/**
 * Root-scoped center surface: the self-contained maze upload page inside an
 * isolated iframe. The page parses uploaded session logs and renders the
 * exploration maze on a shared timeline; nothing here reaches the host.
 */
export function TraceCompareSurface({ useStore, actions, useSessions, locale, t }: TraceCompareSurfaceProps) {
  const open = useStore(state => state.open)
  // srcDoc 按本次打开时的宿主主题预置暗色（首帧防闪）；打开期间的主题翻转走
  // postMessage，不动 srcDoc——改了会整页重载丢状态。以 open 为键：面板常驻
  // 组件，两次打开之间主题可能已翻转。
  const srcDoc = useMemo(() => themedMazeHtml(MAZE_PAGE_HTML), [open])
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  // Any Session navigation while the surface is open — sidebar selection or a
  // new Session — switches the conversation beneath this opaque surface, so it
  // closes to reveal it (mirrors the execution board). Host 0.1.6-alpha.2 moved the
  // selection off the Session list; currentSessionOf reads either shape.
  // 本机会话库（诊断层第 7 项）：列表与日志都从宿主半的只读端点取；取数在应用外壳里做
  //（迷宫页在 sandbox 无 same-origin 的 iframe 里，自己 fetch 不到宿主），取回后 postMessage 推给页面。
  const [libOpen, setLibOpen] = useState(false)
  const [libRows, setLibRows] = useState<LocalSessionRow[] | null>(null)
  const [libError, setLibError] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const currentSession = useSessions(currentSessionOf)
  const lastSession = useRef(currentSession)
  useEffect(() => {
    const changed = lastSession.current !== currentSession
    lastSession.current = currentSession
    if (open && changed) actions.close()
  }, [actions, currentSession, open])
  // Host-level Esc plus the page's trace-esc relay: keydown lands inside the
  // iframe window once it has focus, so the page forwards Esc via postMessage.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') actions.close()
    }
    const onMessage = (event: MessageEvent): void => {
      if (event.source !== iframeRef.current?.contentWindow) return
      const msg = event.data as { kind?: string; prompt?: unknown; provider?: unknown; model?: unknown } | null
      if (msg === null) return
      if (msg.kind === 'trace-esc') { actions.close(); return }
      // 模型解读（诊断层第 8 项）：页面把已经给用户看过、确认过的提示词交上来，这里只负责
      // 调宿主路由并把回答原样送回——外壳不加工内容，也不把它混进任何确定性数据。
      if (msg.kind === 'maze-ask-model') {
        const target = iframeRef.current?.contentWindow
        void askModel({
          prompt: String(msg.prompt ?? ''),
          provider: typeof msg.provider === 'string' ? msg.provider : undefined,
          model: typeof msg.model === 'string' ? msg.model : undefined,
        }).then((res) => {
          target?.postMessage(res.ok
            ? { kind: 'maze-model-opinion', text: res.opinion.text, provider: res.opinion.provider, model: res.opinion.model }
            : { kind: 'maze-model-opinion', error: res.error, detail: res.detail ?? '' }, '*')
        })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('message', onMessage)
    }
  }, [actions, open])
  // 宿主主题同步：iframe 加载时推一次，打开期间跟随宿主翻转。
  useEffect(() => {
    if (!open) return
    return watchHostTheme(() => { postThemeTo(iframeRef.current) })
  }, [open])
  // 宿主语言同步：打开时推一次，打开期间跟随语言切换（照主题同步的通道模式）。
  useEffect(() => {
    if (!open) return
    postLocaleTo(iframeRef.current, locale)
    return locale.subscribe(() => { postLocaleTo(iframeRef.current, locale) })
  }, [locale, open])
  const libErrorText = (code: string): string =>
    code === 'host-has-no-session-query' ? t('lib.errNoQuery')
      : code === 'log-too-large' ? t('lib.errTooLarge')
        : `${t('lib.errGeneric')}${code}`

  const refreshLib = async (): Promise<void> => {
    setLibError(null)
    const res = await fetchLocalSessions()
    if (res.ok) setLibRows(res.sessions)
    else { setLibRows([]); setLibError(res.error) }
  }

  const onToggleLib = (): void => {
    const next = !libOpen
    setLibOpen(next)
    if (next && libRows === null) void refreshLib()
  }

  const togglePick = (id: string): void => {
    setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : (prev.length >= 5 ? prev : [...prev, id]))
  }

  const onCompare = async (): Promise<void> => {
    const frame = iframeRef.current
    if (frame === null || picked.length < 2 || busy !== null) return
    const files: { name: string; text: string }[] = []
    for (const [i, id] of picked.entries()) {
      setBusy(`${t('lib.reading')} ${String(i + 1)}/${String(picked.length)}…`)
      const res = await fetchSessionLog(id)
      if (!res.ok) { setBusy(null); setLibError(res.error); return }
      files.push({ name: res.name, text: res.text })
    }
    setBusy(null)
    frame.contentWindow?.postMessage({ kind: 'maze-load', files }, '*')
  }

  if (!open) return null
  return (
    <div className={css.frame}>
      <button
        type="button"
        className={css.close}
        title={t('surface.close')}
        aria-label={t('surface.close')}
        onClick={() => { actions.close() }}
      >
        ✕
      </button>
      <div className={css.lib}>
        <button type="button" className={css.libToggle} onClick={onToggleLib}>
          {t('lib.title')}{libRows === null ? '' : ` · ${String(libRows.length)}`}
        </button>
        {libOpen && (
          <div className={css.libBody}>
            {libError !== null && <div className={css.libErr}>{libErrorText(libError)}</div>}
            {busy !== null && <div className={css.libNote}>{busy}</div>}
            {libError === null && libRows === null && <div className={css.libNote}>{t('lib.loading')}</div>}
            {libRows !== null && libRows.length === 0 && libError === null && <div className={css.libNote}>{t('lib.empty')}</div>}
            {libRows?.map(row => (
              <label key={row.id} className={css.libRow}>
                <input
                  type="checkbox"
                  checked={picked.includes(row.id)}
                  onChange={() => { togglePick(row.id) }}
                />
                <span className={css.libName} title={row.cwd ?? ''}>{rowLabel(row)}</span>
                <span className={css.libTime}>{rowTime(row)}</span>
                {row.live && <span className={css.libLive}>{t('lib.live')}</span>}
              </label>
            ))}
            {libRows !== null && libRows.length > 0 && (
              <div className={css.libFoot}>
                <button type="button" disabled={picked.length < 2 || busy !== null} onClick={() => { void onCompare() }}>
                  {t('lib.compare')} {String(picked.length)}
                </button>
                <span className={css.libHint}>{t('lib.hint')}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <iframe
        ref={iframeRef}
        title="trace-compare"
        className={css.iframe}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-modals allow-downloads"
        onLoad={() => { postThemeTo(iframeRef.current); postLocaleTo(iframeRef.current, locale) }}
      />
    </div>
  )
}

/** Center surface props: the runtime kit (session navigation), the shared view store, and the host locale service. */
export type TraceCompareSurfaceProps =
  PropsRuntime<'shell.overlay'>
  & PropsStore<ReturnType<typeof createTraceCompareViewStore>>
  & PropsLocale<'traceCompare'>
  & {
    /** 宿主 locale 服务：iframe 页面文案跟随其 active 语言。 */
    locale: LocaleRuntime
  }
