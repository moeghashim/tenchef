# tenchef

> Like bringing ten chefs to the kitchen before you start cooking.

A local PRD interview studio for AI-assisted product builds. Answer eight visual questions, annotate the generated plan the same way you'd annotate a Claude Design artifact, then hand off a PRD with a live build checklist to your coding agent.

## Status

**v0.1.0-rc.1** — built. Typecheck, unit, and integration tests pass. End-to-end runtime smoke test against a real `bd` install is not yet fully confirmed; treat this release as a preview.

## What it does

1. **Interview** — 8 fixed questions: product name, audience, problem, platforms, visual direction, must-have features, success metric, and timeline. Text, single-select, multi-select, and visual pick types. About two minutes.
2. **Plan** — your answers become an annotatable product plan. Toggle comment mode and click any section to pin feedback. "Send to model" revises the plan against your comments. Iterate as many rounds as you want.
3. **PRD** — generates a rendered document with a grouped build checklist (Foundation / Core features / Launch). Tasks land in [beads](https://github.com/gastownhall/beads) so your coding agent picks them up via `bd ready` and check-marks flow back to `.beads/beads.jsonl`.

Outputs to your project directory: `PRD.md`, `.beads/beads.jsonl`.

## Prerequisites

- **Node 20+**
- **[beads](https://github.com/gastownhall/beads) (`bd`)** — install via one of:
  ```sh
  brew install beads
  npm i -g @beads/bd
  pipx install beads-mcp
  ```
- An **Anthropic** or **OpenAI** API key — pasted into the browser at first launch and stored only in `localStorage`. Never sent to any tenchef-controlled server.

## Install & run

```sh
npx tenchef [directory]
```

- `[directory]` — target project root (defaults to current directory)
- `--port <n>` — pin the local server port
- `--no-open` — skip auto-open (useful for CI or headless environments)

Opens a browser to `http://127.0.0.1:<port>`. The server auto-shuts down after 30 minutes idle.

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
