import { useSyncExternalStore } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { getMazeSettings, subscribeMazeSettings, updateMazeSettings } from './settings.ts'
import css from './MazeSettingsSection.module.css'

/** Settings page ("设置 → 执行迷宫"): per-browser preferences for the maze surfaces. */
export function MazeSettingsSection({ t }: MazeSettingsSectionProps) {
  const settings = useSyncExternalStore(subscribeMazeSettings, getMazeSettings)
  return (
    <div className={css.section}>
      <h2 className={css.heading}>{t('title')}</h2>
      <label className={css.row}>
        <span className={css.copy}>
          <span className={css.label}>{t('settings.sidebarEntry')}</span>
          <span className={css.hint}>{t('settings.sidebarEntry.hint')}</span>
        </span>
        <input
          className={css.toggle}
          type="checkbox"
          checked={settings.sidebarEntry}
          onChange={(event) => { updateMazeSettings({ sidebarEntry: event.currentTarget.checked }) }}
        />
      </label>
    </div>
  )
}

/** Settings section props: shell owner share plus localized copy. */
export type MazeSettingsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'traceCompare'>
