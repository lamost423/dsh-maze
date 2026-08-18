import { useEffect, useMemo, useRef } from 'react'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { snapshotToMazeData, type MazeData } from './live-data.ts'
import { MAZE_PAGE_HTML } from './maze-html.ts'
import css from './TraceLiveView.module.css'

/**
 * Live maze view: a per-session conversation tab that mirrors the current
 * session's execution as a growing exploration maze. Subscribes to the
 * conversation snapshot (real-time) and pushes converted payloads into the
 * shared maze page inside an isolated iframe.
 */
export function TraceLiveView({ useSession, t }: TraceLiveViewProps) {
  const snapshot = useSession(s => s)
  const data = useMemo<MazeData | null>(() => snapshotToMazeData(snapshot), [snapshot])
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
    const payload = dataRef.current
    if (frame !== null && payload !== null) {
      frame.contentWindow?.postMessage({ kind: 'trace-maze', data: payload }, '*')
    }
  }

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

/** Live view props: the conversation view runtime kit plus locale copy. */
export type TraceLiveViewProps = ConvViewProps & PropsLocale<'traceCompare'>
