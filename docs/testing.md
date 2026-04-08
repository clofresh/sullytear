# Testing

Sullytear uses [Vitest](https://vitest.dev/) in a Node environment (`vitest.config.ts`). Tests focus on store logic, rules, and detectors — not on rendering. Prefer testing through the stores' public API.

## Layout

- `src/game/__tests__/` — store, deck, rules, difficulty, run, meta, orchestrator, pile id, drop preview, face-card, auto-complete, monsters.
- `src/game/combat/__tests__/` — detector pipeline (`detectors.test.ts`, `moreDetectors.test.ts`).
- `src/components/__tests__/` — lightweight component helpers (layout math, drop target logic).

## Running

- `npm test` — full suite, single run.
- `npx vitest run src/game/__tests__/store.test.ts` — one file.
- `npx vitest run -t "pattern"` — by test name.
- `npx vitest` (without `run`) — watch mode for local iteration.

## Testing the combat pipeline

The subscription chain (`gameStore → EventDetector → combatStore → runStore`) fires on every `gameStore` mutation. Two patterns keep tests ergonomic:

### Seed state without firing events

Use `combatStore._withSuppressedEvents(fn)` when you need to mutate game state as test setup and don't want detectors to run:

```ts
useCombatStore.getState()._withSuppressedEvents(() => {
  useGameStore.setState({ /* seed board */ });
});
```

See `src/game/__tests__/combatStore.test.ts` and `store.test.ts` for examples.

### Test detectors directly

Detectors under `src/game/combat/detectors/` are pure functions over `GameSnapshot` diffs. Prefer calling them with hand-built snapshots in `src/game/combat/__tests__/detectors.test.ts` over driving them through the full store — faster and easier to reason about edge cases.

## Undo coverage

Every detector defines both a forward and a reverse effect (see [game-design.md](./game-design.md)). When adding a detector, write paired tests: action → combat effect, then undo → reversed effect. The foundation, combo, and reveal detector tests are canonical examples.

## What not to test

- R3F scenes, shaders, and particle systems — too expensive to simulate; rely on `ErrorBoundary` at runtime and manual QA.
- PWA/service worker behavior — tested implicitly via `npm run build`.
- Visual CSS/layout — covered by hand.

## Conventions

- Use the real stores, not mocks. Sullytear's stores are cheap to instantiate and the subscription wiring is load-bearing.
- Reset store state between tests that share module scope (stores are singletons in Node). Call the store's `reset()` action or re-seed in `beforeEach`.
- Prefer many small `it` blocks per behavior over one large scenario test; detector tests in particular should isolate one event type per case.
