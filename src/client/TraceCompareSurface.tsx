import { useMemo } from 'react'
import type { PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { createTraceCompareViewStore } from './store.ts'
import { MAZE_PAGE_HTML } from './maze-html.ts'
import css from './TraceCompareSurface.module.css'

/**
 * Root-scoped center surface: the self-contained maze upload page inside an
 * isolated iframe. The page parses uploaded session logs and renders the
 * exploration maze on a shared timeline; nothing here reaches the host.
 */
export function TraceCompareSurface({ useStore }: TraceCompareSurfaceProps) {
  const open = useStore(state => state.open)
  const srcDoc = useMemo(() => MAZE_PAGE_HTML, [])
  if (!open) return null
  return (
    <div className={css.frame}>
      <iframe title="trace-compare" className={css.iframe} srcDoc={srcDoc} sandbox="allow-scripts allow-modals allow-downloads" />
    </div>
  )
}

/** Center surface props: shared view store only. */
export type TraceCompareSurfaceProps =
  PropsStore<ReturnType<typeof createTraceCompareViewStore>>
