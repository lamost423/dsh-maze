import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives';
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './TraceCompareTrigger.module.css';
/** Host 0.1.7 renamed the 16px icon set (IconBranchOutline16 → IconBranchOutlineRegular); read either at runtime. */
const iconTable = primitives;
const BranchIcon = iconTable.IconBranchOutline16 ?? iconTable.IconBranchOutlineRegular ?? (() => null);
/** Sidebar entry that toggles the root-scoped Trace Compare surface. */
export function TraceCompareTrigger({ wide, useStore, actions, t }) {
    const open = useStore(state => state.open);
    const label = t(open ? 'trigger.close' : 'trigger.open');
    return (_jsx(Tooltip, { label: label, delayMs: 500, disabled: wide, children: _jsxs("button", { type: "button", className: clsx(css.trigger, !wide && css.rail), "aria-label": label, "aria-pressed": open, onClick: () => { actions.toggle(); }, children: [_jsx(BranchIcon, { size: wide ? 16 : 18 }), wide && _jsx("span", { className: css.label, children: t('trigger') })] }) }));
}
//# sourceMappingURL=TraceCompareTrigger.js.map