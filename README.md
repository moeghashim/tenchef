# tenchef

> Like bringing ten chefs to the kitchen before you start cooking.

A local PRD interview studio for AI-assisted product builds. Answer eight visual questions, annotate the generated plan the same way you'd annotate a Claude Design artifact, then hand off a PRD with a live build checklist to your coding agent.

## Status

**v0.2.1** — typecheck, lint, unit, security, and integration tests pass (`npm run verify`), including an end-to-end smoke test that boots the built CLI and drives the full init → create → close → list flow against a real `bd` install (verified with bd 1.0.5).

Known issue: revising the plan *after* a PRD has been generated rebuilds the task list without its beads IDs, so generating again creates duplicate beads issues. Until this is fixed, finish your comment rounds before the first "Generate PRD".

## What it does

1. **Interview** — 8 fixed questions: product name, audience, problem, platforms, visual direction, must-have features, success metric, and timeline. Text, single-select, multi-select, and visual pick types. About two minutes.
2. **Plan** — your answers become an annotatable product plan. Toggle comment mode and click any section to pin feedback. "Send to model" revises the plan against your comments. Iterate as many rounds as you want.
3. **PRD** — generates a rendered document with a grouped build checklist (Foundation / Core features / Launch). Tasks land in [beads](https://github.com/gastownhall/beads) so your coding agent picks them up via `bd ready` and check-marks flow back to `.beads/beads.jsonl`.

Outputs to your project directory: `PRD.md`, `.beads/beads.jsonl`, and `.tenchef/state.json` (session state — add `.tenchef/` to your project's `.gitignore` if you don't want it tracked).

While the PRD is on screen, tenchef polls beads every few seconds — when your coding agent runs `bd close` on a task, the checklist ticks itself off and the progress bar moves without a reload. Sessions also resume: close the tab (or the whole tool) and the next launch picks up exactly where you left off, restored from `.tenchef/state.json`.

## Prerequisites

- **Node 20+**
- **[beads](https://github.com/gastownhall/beads) (`bd`)** — install via one of:
  ```sh
  brew install beads
  npm i -g @beads/bd
  pipx install beads-mcp
  ```
- A model for plan revisions, one of:
  - **Claude Code** — if the `claude` CLI is installed and logged in, pick "Claude Code" at first launch. No API key needed; revisions run through your local CLI.
  - An **Anthropic** or **OpenAI** API key — pasted into the browser at first launch and stored only in `localStorage`. Never sent to any tenchef-controlled server. The model is configurable on the same screen (defaults to a current GA model per provider) and the key is validated with a cheap ping before it's saved.

## Install & run

```sh
npx tenchef [directory]
```

- `[directory]` — target project root (defaults to current directory)
- `--port <n>` — pin the local server port
- `--no-open` — skip auto-open (useful for CI or headless environments)

Opens a browser to `http://127.0.0.1:<port>`. The local API is protected by a per-session token (delivered to the app via same-origin `/config`, which other websites cannot read) plus Host and Origin checks, so nothing else — not even another website you have open — can write files into your project or drive `bd` while tenchef runs. The server auto-shuts down after 30 minutes idle.

## Design

The visual and interaction design lives in `design/PRD Interview.dc.html`. The implementation ports it faithfully to Vite + React + TypeScript. `design/support.js` is the claude.ai design-canvas runtime and is included only as reference — it isn't used at runtime.

## Development

```sh
git clone git@github.com:moeghashim/tenchef.git
cd tenchef
npm install
npm test          # vitest — unit + integration
npm run build     # typecheck + node compile + Vite build
```

Full spec is in [PRD.md](./PRD.md).

## License

Apache 2.0
