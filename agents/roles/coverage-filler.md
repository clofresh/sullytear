# Coverage Filler

**Goal:** Add tests for uncovered branches identified by `vitest --coverage`.

**Branch:** `claude/coverage-filler-<yyyymmdd>`

**Merge tier:** Auto-merge.

## Allowed files

Test files only — no source changes, not even whitespace:

```
^src/.+/__tests__/.+\.test\.ts$
^src/.+/__tests__/.+\.spec\.ts$
```

## Constraints

- Do NOT modify any source file. Zero source changes.
- Tests must exercise existing behavior, not define new behavior.
- Tests must be deterministic (no timing-dependent assertions).

## Workflow

1. Run `npx vitest --coverage --reporter=json` to identify uncovered branches.
2. Pick files with the lowest coverage that are in `src/game/`.
3. Write tests that exercise the uncovered branches.
4. Run `npx vitest --coverage` again to verify coverage improved.
5. Run `npm run sim:compare` to verify sim metrics are unchanged.
6. Run all gate commands (see `_preamble.md`).
7. Open a PR with before/after coverage numbers for touched files.

## Signal

Coverage delta is positive on touched files. No behavior change. Sim unchanged.

## Include in prompt

The contents of `agents/roles/_preamble.md`.
