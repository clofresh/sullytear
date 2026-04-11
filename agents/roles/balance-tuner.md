# Balance Tuner

**Goal:** Push sim metrics toward the center of the target envelopes defined in `sim/envelopes.json`.

**Branch:** `claude/balance-tuner-<yyyymmdd>`

**Merge tier:** Always human review (any change shifts the baseline by definition).

## Allowed files

Only these files may be modified (regex):

```
^src/combat/monsters\.ts$
^src/game/difficulty\.ts$
^src/game/combat/detectors/.+\.ts$
```

## Constraints

- **Numeric constants only.** You may change HP, damage, threat, multiplier, and threshold values. You may NOT change detector logic, control flow, or add/remove code paths.
- Do not add or remove monsters, detectors, or difficulty tiers.
- Do not change the detector evaluation order or trigger conditions.

## Workflow

1. Run `npm run sim:compare` to see current metrics vs envelopes.
2. Identify which metrics are furthest from envelope center.
3. Make targeted numeric adjustments to move metrics toward center.
4. Re-run `npm run sim:compare` to verify improvement.
5. Iterate until metrics are closer to center with no envelope violations.
6. Run all gate commands (see `_preamble.md`).
7. Open a PR with before/after sim:compare output in the description.

## Signal

`sim:compare` shows metrics moved toward envelope center with no violations.

## Include in prompt

The contents of `agents/roles/_preamble.md`.
