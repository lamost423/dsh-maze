/** Package-owned invariant companion for the Trace Compare UI plugin. */
import type { Context } from '@deepseek-ai/cordis';
/** Cordis companion name. */
export declare const name = "client-ui-trace-compare-invariant";
/** Invariant registry dependency. */
export declare const inject: string[];
/** Register package ownership with the invariant registry. */
export declare const apply: (ctx: Context) => Promise<() => void>;
//# sourceMappingURL=invariant.d.ts.map