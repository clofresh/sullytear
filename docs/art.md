# Art

Sullytear has three art surfaces, each with its own pipeline.

## 1. Character models (3D, GLB)

All hero and monster meshes load from `public/models/<name>.glb` and render through `src/combat/arena/MonsterModel.tsx` / `HeroModel.tsx`.

Two supported source formats compile to the same `.glb`:

| Source | Author | Build step |
| --- | --- | --- |
| `art/<name>.blend` | Human artists (Blender 3.6+) | Manual export |
| `art/<name>.model.toml` | Claude / text-based | `npm run build:models` |

**Exactly one source of truth per character.** If the `.toml` exists, `scripts/compile-models.mjs` owns the `.glb` and CI fails on stale output. See [`art/README.md`](../art/README.md) for the full Blender workflow, the TOML schema, and the handoff rules between the two paths.

### Animation contract

Every character mesh **must** define exactly these four lowercase Actions, or `npm run validate:models` (run in `prebuild` and CI) rejects it:

| Name | When | Looping |
| --- | --- | --- |
| `idle` | Default stance | yes |
| `attack` | Strikes an enemy | no |
| `hit` | Takes damage | no |
| `death` | Defeated | no |

Playback is driven by `src/combat/arena/models/useIdleAnimation.ts` and by combat event callbacks from `EventDetector` → `combatStore`.

### Arena placement

All models must be grounded at `y = 0` in their own local space. The arena offsets the whole group by `ARENA_FLOOR_OFFSET` in `MonsterModel.tsx` — individual models should **not** ship with their own Y offsets. See commit history around `plan.txt` for the normalization rationale.

## 2. Procedural TSX models

Legacy / fallback characters live as hand-written R3F components in `src/combat/arena/models/` (`SlimeModel.tsx`, `GoblinModel.tsx`, `DragonModel.tsx`, `KnightModel.tsx`, etc.). They share the same mount point and animation hooks as GLB models, so `MonsterModel.tsx` can switch between the two without the rest of the arena caring.

Prefer GLB for new characters; procedural TSX is kept only for cases where a quick programmatic shape is easier than authoring a mesh.

## 3. 2D HUD sprites & UI

- Combat HUD sprites live under `src/combat/sprites/` and are consumed by `CombatBar`, `CombatOverlay`, `HealthBar`, `DamageFlash`, and `RoyalAwakeningBanner`.
- Card faces, pile chrome, and screen art live under `src/components/` alongside the React components that render them.
- The animated R3F background in `src/background/` (shaders under `background/shaders/`) is lazy-loaded and wrapped in an `ErrorBoundary` — shader compilation failures must never crash the app.

## Validation & Build

- `npm run validate:models` — runs `scripts/validate-gltf.mjs` against every `public/models/*.glb`. Checks magic bytes, skinned mesh presence, required animations, mesh bounds, feet-on-floor, and file size.
- `npm run build:models` — runs `scripts/compile-models.mjs` to regenerate `.glb` files from `.model.toml` sources.
- Both steps run automatically in `prebuild`, so a broken asset cannot ship.

## Adding a new character

1. Add the monster definition to `src/combat/monsters.ts` (see [game-design.md](./game-design.md)).
2. Author the mesh via Blender (`art/<name>.blend`) or TOML (`art/<name>.model.toml`). Follow [`art/README.md`](../art/README.md).
3. Ensure the four required animations exist.
4. Run `npm run validate:models`.
5. Wire the new id into `MonsterModel.tsx`'s model map.
6. Commit both the source (`.blend` or `.toml`) and the generated `.glb`.
