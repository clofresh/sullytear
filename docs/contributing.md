# Contributing

Thanks for hacking on Sullytear. This doc covers how to set up, what to run before pushing, and the conventions the repo expects.

## Setup

```sh
npm install
npm run dev
```

Open the URL Vite prints. Hot reload covers React, R3F, and shaders.

## Before you push

Run these locally — CI runs the same things:

```sh
npm run typecheck       # tsc --noEmit
npm test                # vitest run
npm run validate:models # only needed if you touched public/models/** or art/**
npm run build           # full build, catches anything the above missed
```

A green local build is the bar. Don't push red.

## Where to make changes

| Kind of change | Where to start | Reference |
| --- | --- | --- |
| New combat trigger | `src/game/combat/detectors/` + `combatStore` action | [architecture.md](./architecture.md), [game-design.md](./game-design.md) |
| New card rule | `src/game/rules.ts` | [state-management.md](./state-management.md) |
| New monster | `src/combat/monsters.ts` + mesh in `art/` | [game-design.md](./game-design.md), [art.md](./art.md) |
| New visual effect | `src/background/useCombatEffects.ts` + `burstEffects.ts` | [vfx.md](./vfx.md) |
| New UI screen | `src/components/`, gated in `App.tsx` | [ui-ux.md](./ui-ux.md) |
| Build / PWA config | `vite.config.ts`, `scripts/` | [build.md](./build.md) |

## Conventions

- **Test-driven development.** Write the failing test first, then the implementation. For any new detector, rule, or store action: red → green → refactor. The red step is not optional — a test that was never seen to fail is not a test. See [testing.md](./testing.md) for how to drive the stores from tests.
- **Code style:** see [code-style.md](./code-style.md). Strict TypeScript, no `any`, immutable Zustand updates.
- **No direct combat calls from move handlers.** If a card action should affect combat, write a detector.
- **Undo coverage is mandatory.** Every detector needs a reverse effect and paired tests — see [testing.md](./testing.md).
- **Tests through the public API.** Use real stores, not mocks. `_withSuppressedEvents` for seeding state.
- **Error boundaries on shaders.** Any lazy R3F scene or GLSL-heavy component must be wrapped in `ErrorBoundary`.

## Commits & PRs

- Write one logical change per commit when you can. Small commits are easier to review and revert.
- Commit messages: short imperative subject (`tighten monster threat meters`, `fix undo on column clear`), body explaining the why if non-obvious.
- Open a PR against `main`. Describe the user-visible change, note any assets touched, link related issues.
- Don't skip hooks (`--no-verify`) or force-push shared branches.

## Assets

- Character models: follow the full workflow in [`art/README.md`](../art/README.md). Commit both the source (`.blend` or `.model.toml`) and the generated `.glb`.
- Images, sprites, sounds: put them under `public/` or `src/combat/sprites/` as appropriate. Keep file sizes modest — the PWA precaches them.

## Good first tasks

- Write missing detector tests (check `src/game/combat/__tests__/` against the detector list).
- Tune monster threat values in `src/combat/monsters.ts` and play-test.
- Add a new VFX variant for an existing `EffectEvent` type — no gameplay change, just palette and spawn tuning in `burstEffects.ts`.

## Questions

File an issue, or open a draft PR early and ask in the description. Draft PRs are welcome.
