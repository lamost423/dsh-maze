/**
 * Which Session the host's main view is showing, read off the Session list.
 *
 * Host ≤0.1.6-alpha.1 publishes it as `list.current`. 0.1.6-alpha.2 dropped that
 * field — the selection moved into ui-workspace — and the public trace left on the list is
 * each row's retain counts: the main view retains its Session under the
 * `mainView` source. ui-session derives the selected Session from that same
 * count, so this follows the host's own rule rather than a private detail.
 * Typed structurally so one build reads both list shapes.
 * @param state - the Session list snapshot (`useSessions` selector input).
 * @returns the selected Session id, or undefined while none is selected.
 */
export function currentSessionOf(state) {
    const legacy = state.current;
    if (legacy !== undefined)
        return legacy;
    const byId = state.byId;
    if (byId === undefined)
        return undefined;
    for (const row of Object.values(byId)) {
        if ((row.retainedBy?.mainView ?? 0) > 0 && typeof row.id === 'string')
            return row.id;
    }
    return undefined;
}
//# sourceMappingURL=current-session.js.map