# AGENTS.md

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on alexisNorthcoders/Platformer-Game (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Levels

To create or change a level, follow `.claude/skills/new-level/SKILL.md`. It covers the level toolkit (`tools/levelgen.py`), the King's reach, the map layers and how to check a level in the browser: `node tools/play.mjs --level N --file tools/level-checks.js` runs the checks in headless Chromium, with no browser extension needed.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
