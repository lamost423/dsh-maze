const PACKAGE_NAME = 'dsh-maze';
/** Cordis companion name. */
export const name = 'client-ui-trace-compare-invariant';
/** Invariant registry dependency. */
export const inject = ['invariants'];
/** The slot registry and component tests own this client-only viewing state. */
const install = () => {
    // No runtime invariant: the package owns no domain data or cross-event relation.
};
/** Register package ownership with the invariant registry. */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//# sourceMappingURL=invariant.js.map