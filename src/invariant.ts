/** Package-owned invariant companion for the Trace Compare UI plugin. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = 'dsh-maze'

/** Cordis companion name. */
export const name = 'client-ui-trace-compare-invariant'
/** Invariant registry dependency. */
export const inject = ['invariants']

/** The slot registry and component tests own this client-only viewing state. */
const install: InvariantInstaller = () => {
  // No runtime invariant: the package owns no domain data or cross-event relation.
}

/** Register package ownership with the invariant registry. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
