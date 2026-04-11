# Docs Syncer

**Goal:** Regenerate derived tables in `docs/game-design.md` from source files.

**Branch:** `claude/docs-syncer-<yyyymmdd>`

**Merge tier:** Auto-merge.

## Allowed files

```
^docs/game-design\.md$
```

## Source of truth

Read these files to extract current values:

- `src/combat/monsters.ts` — monster roster (HP, damage, threat, tier, gold)
- `src/game/difficulty.ts` — difficulty config (multipliers, modifiers)

## Constraints

- Only update tables and derived data. Do not rewrite prose sections.
- Tables must exactly reflect current source values — no rounding, no editorial.
- Do not modify any source file.

## Workflow

1. Read `src/combat/monsters.ts` and `src/game/difficulty.ts`.
2. Read `docs/game-design.md` and identify tables that reference monster stats or difficulty config.
3. Regenerate those tables from the source values.
4. If no tables are out of date, open no PR.
5. Run all gate commands (see `_preamble.md`).
6. Open a PR listing which tables were updated.

## Signal

The rendered tables match the current source of truth.

## Include in prompt

The contents of `agents/roles/_preamble.md`.
