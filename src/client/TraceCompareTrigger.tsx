import clsx from 'clsx'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { createTraceCompareViewStore } from './store.ts'
import css from './TraceCompareTrigger.module.css'

type BranchIconComponent = (props: { size?: number | undefined }) => JSX.Element | null
/** Host 0.1.7 renamed the 16px icon set (IconBranchOutline16 → IconBranchOutlineRegular); read either at runtime. */
const iconTable = primitives as unknown as Record<string, BranchIconComponent | undefined>
const BranchIcon: BranchIconComponent = iconTable.IconBranchOutline16 ?? iconTable.IconBranchOutlineRegular ?? (() => null)

/** Sidebar entry that toggles the root-scoped Trace Compare surface. */
export function TraceCompareTrigger({ wide, useStore, actions, t }: TraceCompareTriggerProps) {
  const open = useStore(state => state.open)
  const label = t(open ? 'trigger.close' : 'trigger.open')
  return (
    <Tooltip label={label} delayMs={500} disabled={wide}>
      <button
        type="button"
        className={clsx(css.trigger, !wide && css.rail)}
        aria-label={label}
        aria-pressed={open}
        onClick={() => { actions.toggle() }}
      >
        <BranchIcon size={wide ? 16 : 18} />
        {wide && <span className={css.label}>{t('trigger')}</span>}
      </button>
    </Tooltip>
  )
}

/** Sidebar trigger props: owner column state, shared view store, and copy. */
export type TraceCompareTriggerProps =
  PropsRuntime<'sidebar.footer.action'>
  & PropsStore<ReturnType<typeof createTraceCompareViewStore>>
  & PropsLocale<'traceCompare'>
