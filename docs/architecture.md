# Architecture

High-level map of Sullytear. Start here, then jump to the specialized docs for depth.

Sullytear is a React + TypeScript PWA. Klondike solitaire is the game's input layer; every meaningful card action emits a combat event against the current monster. The app is client-only — there is no backend.

## The one concept to internalize

```
gameStore change ─▶ EventDetector ─▶ combatStore ─▶ (maybe) runStore ─▶ resets gameStore
```

Solitaire moves never call combat code directly. They mutate `gameStore`; a subscription runs detectors that diff snapshots and dispatch to `combatStore`. This indirection is what makes undo, tests, and encounter transitions tractable.

**Rule:** do not trigger combat effects from card-move handlers. Add a detector in `src/game/combat/detectors/` and register it in `src/game/combat/EventDetector.ts`.

## Where things live

| Area | Path | Doc |
| --- | --- | --- |
| Solitaire UI (board, piles, cards) | `src/components/` | [ui-ux.md](./ui-ux.md) |
| Combat HUD + R3F arena | `src/combat/` | [ui-ux.md](./ui-ux.md), [art.md](./art.md) |
| Animated background + VFX | `src/background/` | [vfx.md](./vfx.md) |
| Zustand stores, rules, detectors | `src/game/` | [state-management.md](./state-management.md) |
| Character model sources | `art/` | [art.md](./art.md) |
| Build + validation scripts | `scripts/` | [build.md](./build.md) |

## How to find the right doc

- **Adding a combat trigger or card rule?** → [state-management.md](./state-management.md), then [game-design.md](./game-design.md).
- **Tuning numbers (HP, damage, threat)?** → [game-design.md](./game-design.md).
- **Touching the board, drag-and-drop, or HUD?** → [ui-ux.md](./ui-ux.md).
- **Adding a monster mesh or animation?** → [art.md](./art.md).
- **Adding a particle, flash, or shader?** → [vfx.md](./vfx.md).
- **Writing tests?** → [testing.md](./testing.md).
- **Touching Vite, PWA, or build scripts?** → [build.md](./build.md).
- **Setting up or shipping a PR?** → [contributing.md](./contributing.md).

## Non-negotiables

- **No direct combat calls from move handlers.** Write a detector.
- **Every detector defines a reverse effect.** Undo must rewind combat state atomically with the board — see [state-management.md](./state-management.md).
- **VFX is read-only.** Nothing under `src/background/` or HUD components may mutate `gameStore` or `combatStore`.
- **Error boundaries on lazy R3F / shader code.** Shader compile failures must never crash the app.
