# dsh-trace-compare

[中文](README.md) | English

Trace visualization for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): see how the agent actually explored — the main path it committed to, the detours that failed or dead-ended, and where it backtracked — on one shared timeline.

Two surfaces, one visual language:

- **Trace Compare** (sidebar entry): upload 1 session log for a single-run maze, or 2 logs for a same-axis comparison (e.g. flash vs pro on the same task) with milestone lines.

![Trace Compare: flash vs pro exploration replayed on one shared timeline](assets/trace-compare.gif)

- **Live Maze** (per-session conversation tab): the same maze grows in real time while the session executes; detours appear as soon as a tool result settles a step's verdict.

![Live Maze: the maze grows while the session runs; idle waits fold away](assets/live-maze.gif)

## What the maze shows

- Solid line: the main path — steps whose tool calls succeeded, plus answer nodes.
- **Duration capsules**: every step renders as a rounded bar spanning its start→end, verdict-colored — a 3-minute bash and a 0.2 s read are no longer the same dot; wide bars carry the duration inline.
- Dashed arcs: exploration detours — steps whose tools failed (red ✗) or returned nothing useful (gray ·), with the return arc back to the branch point.
- Hover any node or arc for a quick preview; **click** to pin a detail panel on the right — full command and result text (copy buttons; results keep their first 5000 chars), timings, verdict, reasoning summary. Close with Esc or ×.
- **Zoom navigation**: wheel zooms horizontally around the cursor, drag pans, double-click (or the fit button) resets; axis ticks re-densify with the zoom window down to 1 s.
- **Jump to conversation** (live tab only): the panel's locate button switches the host back to the Chat view and scroll-highlights the step's tool row. Rows older than the chat's loaded window degrade to the view switch alone.
- Playback replays the whole run at up to 300×.

Timeline honesty rules:

- **Idle folding**: stretches with no step or tool activity for over 60 s (you thinking between turns) collapse into a thin `⏸` seam labeled with the skipped duration. Axis ticks keep wall-clock labels inside activity segments.
- Step identity is turn-qualified (`S15·47`), so multi-turn sessions attach detours to the right nodes.
- Durations, tool timings, and totals stay wall-clock; only the axis is compressed.

## Session log support

Upload accepts DSH session logs in any of these forms, detected by content (the file name does not matter — macOS duplicates like `session.jsonl 2` work):

- plain `.jsonl` (session format v0 event streams)
- `.jsonl.zstd` exactly as stored under `~/.dsh/sessions/` — decompressed in the browser (native `DecompressionStream('zstd')` when available, bundled [fzstd](https://github.com/101arrowz/fzstd) otherwise)

## Install

Install the compatible DSH CLI, then add the plugin to the profile:

```sh
npm install --global @deepseek-ai/dsh@0.1.0-rc.6
dsh plugin --profile web add https://github.com/lamost423/dsh-trace-compare/releases/download/v0.2.0/dsh-trace-compare-0.2.0.tgz
dsh web
```

To install from a checkout instead:

```sh
git clone https://github.com/lamost423/dsh-trace-compare.git
cd dsh-trace-compare
corepack enable
pnpm install
pnpm build
dsh plugin --profile web add .
dsh web
```

After a restart of `dsh web`, the sidebar footer gains a **Trace Compare** entry and every session view gains a **Live Maze** tab.

## Development

```sh
pnpm install
pnpm check   # typecheck + vitest + build
```

The upload/visualization page is a self-contained HTML document (`src/client/maze-upload.html`) rendered inside a sandboxed `<iframe srcDoc>`; parsing and rendering run entirely in the browser, and nothing from an uploaded log reaches the host.

## License

MIT. See [NOTICE](NOTICE) — this project contains code derived from DeepSeek Harness.
