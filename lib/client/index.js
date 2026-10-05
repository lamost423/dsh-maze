/**
 * Trace Compare browser plugin: sidebar footer trigger plus center-column
 * surface hosting the self-contained maze upload page.
 */
import { createElement } from 'react';
import { MazeSettingsSection } from "./MazeSettingsSection.js";
import { getMazeSettings, subscribeMazeSettings } from "./settings.js";
import { TraceCompareTrigger } from "./TraceCompareTrigger.js";
import { TraceCompareSurface } from "./TraceCompareSurface.js";
import { TraceLiveView } from "./TraceLiveView.js";
import { en, zh } from "./locales.js";
import { createTraceCompareViewStore } from "./store.js";
const NS = 'traceCompare';
/** Required services for slot composition, the subagent child roster, per-session Conversation assembly, and localized copy. */
export const inject = ['slots', 'locale', 'sessions', 'uiConversation'];
/** Mount the trigger, center surface, and live per-session view with one apply-scoped viewing store. */
export async function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-trace-compare: dictionaries');
    const t = ctx.locale.bind(NS);
    const viewStore = createTraceCompareViewStore();
    // The sidebar entry is switchable (#11: live-tab-only users never need it).
    // The switch lives on our settings page below and persists per browser (see
    // settings.ts for why not the Host settings document); slots.inject's
    // idempotent disposer makes the flip immediate — no reload.
    const mountSidebarEntry = () => ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'trace-compare',
        order: 10,
        locale: NS,
        store: viewStore,
    }, TraceCompareTrigger));
    let disposeSidebarEntry = getMazeSettings().sidebarEntry ? mountSidebarEntry() : undefined;
    ctx.effect(() => subscribeMazeSettings(() => {
        const wanted = getMazeSettings().sidebarEntry;
        if (wanted && disposeSidebarEntry === undefined) {
            disposeSidebarEntry = mountSidebarEntry();
        }
        else if (!wanted && disposeSidebarEntry !== undefined) {
            // Clear the bookkeeping first: a throwing disposer must not wedge the
            // entry in a "mounted" state it can never leave.
            const dispose = disposeSidebarEntry;
            disposeSidebarEntry = undefined;
            dispose();
        }
    }), 'ui-trace-compare: sidebar entry switch');
    // Absent settings shell (a host without ui-settings) leaves this waiting
    // forever — the switch is then unreachable but the default keeps the entry.
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'dsh-maze',
        order: 50,
        locale: NS,
        label: () => t('title'),
    }, MazeSettingsSection));
    // Service dependencies ride closure components: the slot kit owns the
    // per-slot props while the plugin owns its service dependencies (sessions,
    // and the locale runtime the iframe pages follow for their copy).
    const BoundTraceCompareSurface = (props) => createElement(TraceCompareSurface, { ...props, locale: ctx.locale });
    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'trace-compare',
        order: 10,
        locale: NS,
        store: viewStore,
    }, BoundTraceCompareSurface));
    // Context.sessions carries two upstream declaration merges: the client face
    // (api-session-controller/client: ISessions) and the server store dragged in
    // transitively through dsh-workspace/types (dsh-session: SessionStore). TS
    // binds the server one first, so the client face is asserted here; on a
    // client host the client layer is what installs ctx.sessions.
    const BoundTraceLiveView = (props) => createElement(TraceLiveView, {
        ...props, sessions: ctx.sessions, conversations: ctx.uiConversation, locale: ctx.locale,
    });
    ctx.slots.inject('conversation.view', () => ctx.slots.register({
        name: 'conversation.view',
        id: 'trace-live',
        order: 20,
        locale: NS,
        label: () => t('view.live'),
    }, BoundTraceLiveView));
    return async () => {
        // The view store carries no disposables; the registrations own their teardown.
    };
}
//# sourceMappingURL=index.js.map