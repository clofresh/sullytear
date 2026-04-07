# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server (runs `generate-build-info.js` first).
- `npm run build` — `tsc -b && vite build` (generates build info first).
- `npm run typecheck` — type-check only, no emit.
- `npm test` — run Vitest once (`vitest run`).
- Run a single test file: `npx vitest run src/game/__tests__/store.test.ts`
- Run tests matching a name: `npx vitest run -t "pattern"`
- `npm run preview` — serve the production build.

Note: `prebuild`/`predev` hooks invoke `scripts/generate-build-info.js`, which writes a build-info module consumed by the app. If typecheck or build fails complaining about missing build info, run that script manually.

## Architecture

Sullytear is a React + TypeScript solitaire game where Klondike play drives a turn-based combat system against a series of monsters. Vite + PWA, React Three Fiber for the 3D combat arena and animated background, Zustand for all state.

### State: four Zustand stores that subscribe to each other

- `src/game/store.ts` (`useGameStore`) — core Klondike state (stock/waste/tableau/foundations, undo stack, snapshots, move rules from `rules.ts`, deck logic from `deck.ts`). This is the source of truth for card state; combat reads from it.
- `src/game/combatStore.ts` (`useCombatStore`) — hero/monster HP, combat phase, damage events. Exposes `_withSuppressedEvents` for tests that need to mutate game state without triggering combat side-effects.
- `src/game/runStore.ts` (`useRunStore`) — run-level meta (difficulty, encounter list from `combat/monsters.ts`, current encounter index, gold, run result). Orchestrates starting runs and advancing between encounters, which in turn resets `gameStore` and `combatStore`.
- `src/game/metaStore.ts` (`useMetaStore`) — persisted progression (via zustand `persist`).

`App.tsx` gates the UI on `useRunStore.isRunActive`: shows `RunStartScreen` before a run, otherwise the board + combat UI.

### Combat event detection pipeline

Solitaire actions translate into combat events through a detector pipeline rather than ad-hoc calls from the store:

- `src/game/combat/EventDetector.ts` owns a previous-snapshot and runs on every `gameStore` change via a subscription. It calls the individual detectors under `src/game/combat/detectors/` (foundation, stockCycle, waste, faceCardMove, columnClear, reveal, combo) and dispatches to `combatStore` actions.
- Detectors are pure functions over `GameSnapshot` diffs (see `snapshotGame` in `game/combat/types.ts`). Add new combat triggers by writing a new detector and wiring it into `EventDetector.run`.
- `isCombatPaused()` and `withSuppressedEvents` exist so tests and encounter transitions can mutate card state without firing events.

When touching store logic, remember the subscription chain: `gameStore` change → `EventDetector` → `combatStore` → may end encounter → `runStore.advanceEncounter` → resets `gameStore`.

### Rendering layout

- `src/components/` — 2D solitaire UI (GameBoard, Tableau, Foundation, Stock, Waste, Card, drag trail/preview, ErrorBoundary, screens).
- `src/combat/` — combat HUD (`CombatBar`, `CombatOverlay`, `HealthBar`, `DamageFlash`, `RoyalAwakeningBanner`), 2D sprite components in `sprites/`, and the R3F arena under `arena/` (`CombatArena`, `HeroModel`, `MonsterModel`, `ArenaLighting`, GLB models in `arena/models/`).
- `src/background/` — R3F animated background, burst/particle effects, and shaders under `background/shaders/`. `AnimatedBackground` is lazy-loaded and wrapped in an `ErrorBoundary` in `App.tsx` because shader/chunk failures must not crash the app — preserve this pattern.
- `src/game/DragContext.tsx` — React context for drag-and-drop state used across components and `hooks/useDropTargetValidation.ts`.

### Tests

Vitest is configured via `vitest.config.ts`. Tests live in `src/game/__tests__/` and `src/game/combat/__tests__/`, focused on store logic, rules, detectors, and difficulty/monster tables. Prefer testing via the stores' public API; use `_withSuppressedEvents` when you need to seed game state without triggering combat.
