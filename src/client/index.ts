/**
 * Trace Compare browser plugin: sidebar footer trigger plus center-column
 * surface hosting the self-contained maze upload page.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { TraceCompareTrigger } from './TraceCompareTrigger.tsx'
import { TraceCompareSurface } from './TraceCompareSurface.tsx'
import { TraceLiveView } from './TraceLiveView.tsx'
import { en, zh, type TraceCompareKey } from './locales.ts'
import { createTraceCompareViewStore } from './store.ts'

export type { TraceCompareKey } from './locales.ts'
export type { TraceCompareTriggerProps } from './TraceCompareTrigger.tsx'
export type { TraceCompareSurfaceProps } from './TraceCompareSurface.tsx'
export type { TraceLiveViewProps } from './TraceLiveView.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Trace Compare trigger and surface copy. */
    traceCompare: TraceCompareKey
  }
}

const NS = 'traceCompare'

/** Required services for slot composition and localized copy. */
export const inject = ['slots', 'locale']

/** Mount the trigger, center surface, and live per-session view with one apply-scoped viewing store. */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-trace-compare: dictionaries')
  const t = ctx.locale.bind(NS)
  const viewStore = createTraceCompareViewStore()
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'trace-compare',
    order: 10,
    locale: NS,
    store: viewStore,
  }, TraceCompareTrigger))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'trace-compare',
    order: 10,
    locale: NS,
    store: viewStore,
  }, TraceCompareSurface))
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'trace-live',
    order: 20,
    locale: NS,
    label: () => t('view.live'),
  }, TraceLiveView))
  return async () => {
    // The view store carries no disposables; the registrations own their teardown.
  }
}
