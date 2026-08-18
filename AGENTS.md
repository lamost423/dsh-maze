# AGENTS.md

Single-package DSH client plugin. Read README.md for what it does.

- `src/index.ts` is the no-op Host half; the real plugin is the browser bundle from `src/client/`, wired through `package.json`'s `dsh.client` and inserted by `cordis.patch.yml`.
- `src/client/maze-upload.html` is a self-contained page (inline CSS/JS, no imports) rendered via `<iframe srcDoc>`. Parsing, idle-gap folding, layout, and playback all live in its inline script; `tsdown.config.ts` inlines it as a string and splices the fzstd UMD build into its `/*__FZSTD_UMD__*/` placeholder at bundle time.
- `src/client/live-data.ts` converts the live `ConversationSnapshot` into the same maze payload the page renders; verdicts settle only from arrived tool results (tests in `tests/live-data.test.ts`).
- Verify with `pnpm check` (typecheck + vitest + build). Peers pin to the published `@deepseek-ai/dsh-*@0.1.0-rc.x` line, not to a harness checkout.
