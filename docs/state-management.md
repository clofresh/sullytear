# State Management

Sullytear has four Zustand stores plus one React context. They form a one-way subscription chain: solitaire state drives combat, combat drives run progression, meta state persists independently.

```
gameStore  ── change ──▶ EventDetector ──▶ combatStore ──▶ runStore ──▶ (resets gameStore)
                                             │
                                             └─▶ HUD + VFX subscribers
metaStore  (independent, persisted)
DragContext (React context, UI-only)
```

## Stores

### `useGameStore` — `src/game/store.ts`

Source of truth for Klondike state: stock, waste, tableau, foundations, moves, stockCycleCount, undoStack. Persisted via `zustand/middleware` so a mid-run refresh restores the board.

Key responsibilities:
- Apply move rules from `rules.ts` and deck logic from `deck.ts`.
- Push a snapshot onto `undoStack` before every mutating action (capped at 50 entries).
- Call out to a registered `combatBridge` to include a combat snapshot in each undo entry — this is how undo rewinds both the board and HP/threat atomically.
- Expose `undo()` which pops the stack and restores board + combat state together.

### `useCombatStore` — `src/game/combatStore.ts`

Hero and monster HP, threat meter, combat phase, damage events, poison/empower flags, encounter config. Subscribers: HUD components, VFX (`useCombatEffects`), arena models. Exposes `_withSuppressedEvents(fn)` for tests and encounter transitions that must mutate state without re-running detectors.

Registers itself as `gameStore`'s `combatBridge` on mount so undo can snapshot/restore combat state.

### `useRunStore` — `src/game/runStore.ts`

Run-level meta: difficulty, encounter list, current index, gold, run result (`none | victory | defeat`). Orchestrates `startRun` and `advanceEncounter`. Advancing an encounter resets `gameStore` and `combatStore` in the correct order so detectors don't fire on the transition.

### `useMetaStore` — `src/game/metaStore.ts`

Persisted progression via `zustand/persist`. Gold and unlocks survive across runs. Independent of the other three — nothing in the combat pipeline reads from it.

## React context

### `DragContext` — `src/game/DragContext.tsx`

Non-Zustand. Tracks in-flight drag state (active cards, source pile, valid drop targets) for UI only. A drag is not a game action until drop — dropping calls `gameStore` actions, which trigger the combat chain normally. See [ui-ux.md](./ui-ux.md).

## The combat subscription chain

`EventDetector` (`src/game/combat/EventDetector.ts`) subscribes to `gameStore` on mount. On every change it:

1. Snapshots the new game state via `snapshotGame`.
2. Diffs against the previous snapshot.
3. Runs each detector in `src/game/combat/detectors/`.
4. Detectors dispatch to `combatStore` actions (`dealDamageToMonster`, `healHero`, `addThreat`, …).
5. `combatStore` may end the encounter, which calls `runStore.advanceEncounter`, which resets `gameStore`.

`isCombatPaused()` and `withSuppressedEvents` exist so tests and encounter transitions can mutate card state without firing events. Do **not** add direct `combatStore` calls from move handlers — write a detector instead. See [architecture.md](./architecture.md).

## Undo model

Undo is the reason the combat bridge exists. Each `gameStore` mutation:

1. Calls `takeSnapshot(state)` which captures stock/waste/tableau/foundations/moves/stockCycleCount **plus** a combat snapshot from `combatBridge.snapshot()`.
2. Pushes the snapshot onto `undoStack` (capped at 50).

`undo()` pops the stack and restores both halves atomically. This is why every detector must define a reverse effect — a forward-only detector would double-apply damage on redo.

## Persistence rules

- **Persisted:** `gameStore` (board + undo stack), `metaStore` (progression). A refresh mid-run returns you to the same board with the same undo history.
- **Not persisted:** `combatStore`, `runStore`. They re-hydrate from the board and the current encounter config on mount.
- **Never persist VFX state** — it's derived from `combatStore` in `useFrame`.

## Adding state

- **Board rules** → `rules.ts` or `deck.ts`, consumed by `gameStore` actions.
- **Combat triggers** → new detector in `src/game/combat/detectors/` + matching `combatStore` action.
- **Run progression** → extend `runStore`, not `combatStore`.
- **Cross-run progression** → `metaStore`, and remember it auto-persists.
- **UI-only transient state** → local component state or a dedicated React context. Don't put transient UI state in Zustand.
