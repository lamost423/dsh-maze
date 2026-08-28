/**
 * Trace Compare browser plugin: sidebar footer trigger plus center-column
 * surface hosting the self-contained maze upload page.
 */
import { createElement } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { TraceCompareTrigger } from './TraceCompareTrigger.tsx'
import { TraceCompareSurface, type TraceCompareSurfaceProps } from './TraceCompareSurface.tsx'
import { TraceLiveView, type TraceLiveViewProps } from './TraceLiveView.tsx'
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

/** Required services for slot composition, the subagent child roster, and localized copy. */
export const inject = ['slots', 'locale', 'sessions']

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
  // Service dependencies ride closure components: the slot kit owns the
  // per-slot props while the plugin owns its service dependencies (sessions,
  // and the locale runtime the iframe pages follow for their copy).
  const BoundTraceCompareSurface = (props: Omit<TraceCompareSurfaceProps, 'locale'>) =>
    createElement(TraceCompareSurface, { ...props, locale: ctx.locale })
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'trace-compare',
    order: 10,
    locale: NS,
    store: viewStore,
  }, BoundTraceCompareSurface))
  const BoundTraceLiveView = (props: Omit<TraceLiveViewProps, 'sessions' | 'locale'>) =>
    createElement(TraceLiveView, { ...props, sessions: ctx.sessions, locale: ctx.locale })
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'trace-live',
    order: 20,
    locale: NS,
    label: () => t('view.live'),
  }, BoundTraceLiveView))
  return async () => {
    // The view store carries no disposables; the registrations own their teardown.
  }
}
