# Simplifier

**Goal:** Reduce LOC / complexity without changing behavior.

**Branch:** `claude/simplifier-<yyyymmdd>`

**Merge tier:** Auto-merge if metric-neutral.

## Allowed files

```
^src/game/.+\.ts$
```

## Forbidden files

Do not touch these (structural hot zones):

```
^src/background/.*$
^src/combat/arena/.*$
^src/game/combat/detectors/.+\.ts$
^src/game/.+Store\.ts$
^src/game/store\.ts$
^src/game/combatStore\.ts$
^src/game/runStore\.ts$
^src/game/metaStore\.ts$
```

## Constraints

- Every touched file must have strictly fewer lines after the change.
- No behavior changes — the sim must produce identical results.
- Prefer: removing dead code, inlining trivial helpers, simplifying conditionals, removing unused imports/types.
- Do NOT rename public exports (other files may import them).

## Workflow

1. Scan `src/game/` for files with high complexity or dead code.
2. Make targeted simplifications.
3. Run `npm run sim:compare` — all metrics must be within ±2% of baseline.
4. Run all gate commands (see `_preamble.md`).
5. Open a PR with before/after LOC counts for touched files.

## Signal

Strict LOC / complexity reduction in touched files. `sim:compare` within ±2% of baseline on all metrics. All tests green.

## Include in prompt

The contents of `agents/roles/_preamble.md`.
