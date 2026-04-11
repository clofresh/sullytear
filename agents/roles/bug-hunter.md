# Bug Hunter

**Goal:** Find invariant violations via fuzz/property tests.

**Branch:** `claude/bug-hunter-<yyyymmdd>`

**Merge tier:** Test-only PRs auto-merge. Source fixes require human review.

## Allowed files

For **test-only PRs** (adding invariant/fuzz tests):

```
^src/game/.+/__tests__/.+$
^src/game/__tests__/fuzz/.+$
```

For **source fix PRs** (fixing a discovered bug):

```
<the file containing the bug>
<a paired failing test that demonstrates the bug>
```

## Invariants to check

Write property-based or fuzz tests that verify:

1. **Deck conservation:** total card count is preserved across any sequence of moves.
2. **HP/threat monotonicity:** in the absence of heal triggers, hero HP never increases and monster threat never decreases between turns.
3. **Undo full rewind:** undo fully rewinds combat state (HP, threat, damage counters) atomically with the board.
4. **Monster HP non-negative:** monster HP never goes below zero.
5. **Detector reversibility:** applying a detector's forward effect then its reverse effect is a no-op on combat state.

## Workflow

1. Pick an invariant from the list above.
2. Write a failing test that exercises the invariant with randomized inputs.
3. If the test passes (no bug found), commit the test as a green invariant check.
4. If the test fails (bug found):
   a. Minimize the failing case to a minimal repro.
   b. Fix the bug in the source file.
   c. Verify the test now passes.
   d. Commit the test + fix together.
5. Run all gate commands (see `_preamble.md`).
6. Open a PR. Include the invariant being tested and whether a bug was found.

## Signal

A failing invariant produces a minimal repro test. After fix, all tests green.

## Include in prompt

The contents of `agents/roles/_preamble.md`.
