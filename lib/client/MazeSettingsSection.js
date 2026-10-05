import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSyncExternalStore } from 'react';
import { getMazeSettings, subscribeMazeSettings, updateMazeSettings } from "./settings.js";
import css from './MazeSettingsSection.module.css';
/** Settings page ("设置 → 执行迷宫"): per-browser preferences for the maze surfaces. */
export function MazeSettingsSection({ t }) {
    const settings = useSyncExternalStore(subscribeMazeSettings, getMazeSettings, getMazeSettings);
    return (_jsxs("div", { className: css.section, children: [_jsx("h2", { className: css.heading, children: t('title') }), _jsxs("label", { className: css.row, children: [_jsxs("span", { className: css.copy, children: [_jsx("span", { className: css.label, children: t('settings.sidebarEntry') }), _jsx("span", { className: css.hint, children: t('settings.sidebarEntry.hint') })] }), _jsx("input", { className: css.toggle, type: "checkbox", checked: settings.sidebarEntry, onChange: (event) => { updateMazeSettings({ sidebarEntry: event.currentTarget.checked }); } })] })] }));
}
//# sourceMappingURL=MazeSettingsSection.js.map