# Shared preamble — included in every agent role prompt

## Non-negotiables

- **No direct combat calls from move handlers.** Write a detector.
- **Every detector defines a reverse effect.** Undo must rewind combat state atomically with the board — see `docs/state-management.md`.
- **VFX is read-only.** Nothing under `src/background/` or HUD components may mutate `gameStore` or `combatStore`.
- **Error boundaries on lazy R3F / shader code.** Shader compile failures must never crash the app.

## Change budget

- **≤ 200 lines** changed per PR.
- **≤ 5 files** touched per PR.

## Gate commands

Before opening a PR, run **all** of these. If any fails, fix the issue or open no PR.

```sh
npm run typecheck && npm test && npm run build && npm run validate:models && npm run sim:compare
```

## PR rules

- If the diff is empty, open no PR.
- If any gate command fails and you cannot fix it within the change budget, open no PR.
- Include gate command output summary in the PR description.
