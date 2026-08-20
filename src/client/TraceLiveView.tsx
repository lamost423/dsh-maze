import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { ISessions } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { snapshotToMazeData, type MazeData } from './live-data.ts'
import { postLocaleTo } from './locale-sync.ts'
import { MAZE_PAGE_HTML } from './maze-html.ts'
import { SubagentMazeSource } from './subagent-lanes.ts'
import { postThemeTo, watchHostTheme } from './theme-sync.ts'
import css from './TraceLiveView.module.css'

/** trace-jump payload posted by the maze page's detail panel. */
interface TraceJumpMessage {
  kind?: string
  callId?: string
  seq?: number
}

/** How long the jump keeps polling for the target chat row before giving up (chat may still be rendering). */
const JUMP_SEEK_TRIES = 40
const JUMP_SEEK_INTERVAL_MS = 100

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
function jumpToChat(frame: HTMLIFrameElement, msg: TraceJumpMessage): void {
  const scrollport = frame.closest('[data-conversation-scroll]')
  if (scrollport === null) return
  const column = scrollport.parentElement
  if (column === null) return
  const chatTab = column.querySelector('[role="tablist"] [role="tab"]')
  if (chatTab instanceof HTMLElement) chatTab.click()
  const selector = msg.callId !== undefined
    ? `[data-chat-call-id="${CSS.escape(msg.callId)}"]`
    : msg.seq !== undefined ? `[id="dsh-message-${String(msg.seq)}"]` : null
  if (selector === null) return
  let tries = 0
  const seek = (): void => {
    const target = scrollport.querySelector(selector)
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      target.animate(
        [{ boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.75)' }, { boxShadow: '0 0 0 3px rgba(37, 99, 235, 0)' }],
        { duration: 1800, easing: 'ease-out' },
      )
      return
    }
    tries += 1
    if (tries < JUMP_SEEK_TRIES) setTimeout(seek, JUMP_SEEK_INTERVAL_MS)
  }
  seek()
}

/**
 * Live maze view: a per-session conversation tab that mirrors the current
 * session's execution as a growing exploration maze. Subscribes to the
 * conversation snapshot (real-time) and pushes converted payloads into the
 * shared maze page inside an isolated iframe. The page's detail panel posts
 * trace-jump messages back; this component answers them by switching the
 * column to the Chat view and revealing the step's row.
 */
export function TraceLiveView({ useSession, sessionId, sessions, locale, t }: TraceLiveViewProps) {
  const snapshot = useSession(s => s)
  // One roster per (service, session); disposed with the view or on session switch.
  const source = useMemo(() => new SubagentMazeSource(sessions, sessionId), [sessions, sessionId])
  useEffect(() => () => { source.dispose() }, [source])
  const children = useSyncExternalStore(source.subscribe, source.getSnapshot)
  const data = useMemo<MazeData | null>(() => snapshotToMazeData(snapshot, children), [snapshot, children])
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const dataRef = useRef<MazeData | null>(null)
  dataRef.current = data

  // Push on data change; also re-push once the iframe finished loading.
  useEffect(() => {
    const frame = iframeRef.current
    if (frame !== null && data !== null) {
      frame.contentWindow?.postMessage({ kind: 'trace-maze', data }, '*')
    }
  }, [data])
  const onLoad = (): void => {
    const frame = iframeRef.current
    postThemeTo(frame)   // 主题先于数据：首次 build 即按宿主主题着色
    postLocaleTo(frame, locale)   // 语言同理：首次 build 即按宿主语言渲染文案
    const payload = dataRef.current
    if (frame !== null && payload !== null) {
      frame.contentWindow?.postMessage({ kind: 'trace-maze', data: payload }, '*')
    }
  }

  // 宿主主题翻转时同步进 iframe（body[data-ds-dark-theme] 属性观察）。
  useEffect(() => watchHostTheme(() => { postThemeTo(iframeRef.current) }), [])
  // 宿主语言切换时同步进 iframe（照主题同步的通道模式）。
  useEffect(() => {
    postLocaleTo(iframeRef.current, locale)
    return locale.subscribe(() => { postLocaleTo(iframeRef.current, locale) })
  }, [locale])

  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      const frame = iframeRef.current
      if (frame === null || event.source !== frame.contentWindow) return
      const msg = event.data as TraceJumpMessage | null
      if (msg === null || msg.kind !== 'trace-jump') return
      jumpToChat(frame, msg)
    }
    window.addEventListener('message', onMessage)
    return () => { window.removeEventListener('message', onMessage) }
  }, [])

  if (data === null) {
    return <div className={css.empty}>{t('live.empty')}</div>
  }
  return (
    <div className={css.frame}>
      <iframe
        ref={iframeRef}
        title="trace-live"
        className={css.iframe}
        srcDoc={MAZE_PAGE_HTML}
        sandbox="allow-scripts allow-modals allow-downloads"
        onLoad={onLoad}
      />
    </div>
  )
}

/** Live view props: the conversation view runtime kit, the sessions service, the host locale service, and locale copy. */
export type TraceLiveViewProps = ConvViewProps & PropsLocale<'traceCompare'> & {
  /** Root sessions service; supplies the subagent child roster and projections. */
  sessions: ISessions
  /** 宿主 locale 服务：iframe 页面文案跟随其 active 语言。 */
  locale: LocaleRuntime
}
