import { useEffect, useMemo, useRef } from 'react'
import type { PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { createTraceCompareViewStore } from './store.ts'
import { MAZE_PAGE_HTML } from './maze-html.ts'
import css from './TraceCompareSurface.module.css'

/**
 * Root-scoped center surface: the self-contained maze upload page inside an
 * isolated iframe. The page parses uploaded session logs and renders the
 * exploration maze on a shared timeline; nothing here reaches the host.
 */
export function TraceCompareSurface({ useStore, actions, useSessions }: TraceCompareSurfaceProps) {
  const open = useStore(state => state.open)
  const srcDoc = useMemo(() => MAZE_PAGE_HTML, [])
  // Any Session navigation while the surface is open — sidebar selection or a
  // new Session — switches the conversation beneath this opaque surface, so it
  // closes to reveal it (mirrors the execution board).
  const currentSession = useSessions(state => state.current)
  const lastSession = useRef(currentSession)
  useEffect(() => {
    const changed = lastSession.current !== currentSession
    lastSession.current = currentSession
    if (open && changed) actions.close()
  }, [actions, currentSession, open])
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') actions.close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown) }
  }, [actions, open])
  if (!open) return null
  return (
    <div className={css.frame}>
      <iframe title="trace-compare" className={css.iframe} srcDoc={srcDoc} sandbox="allow-scripts allow-modals allow-downloads" />
    </div>
  )
}

/** Center surface props: the runtime kit (session navigation) plus the shared view store. */
export type TraceCompareSurfaceProps =
  PropsRuntime<'shell.overlay'>
  & PropsStore<ReturnType<typeof createTraceCompareViewStore>>
