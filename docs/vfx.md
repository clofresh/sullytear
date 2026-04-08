# VFX

Sullytear's visual effects pipeline bridges combat state and the R3F scene. Gameplay emits semantic events; the VFX layer turns them into particles, shader pulses, screen flashes, and banners. Nothing in the VFX layer mutates game state — it only reads from `combatStore` and `gameStore`.

## Layers

| Layer | Where | What it does |
| --- | --- | --- |
| Background shaders | `src/background/shaders/` (`burst.ts`, `cards.ts`) | GLSL used by the animated background and burst particles. |
| Animated background | `src/background/AnimatedBackground.tsx`, `BackgroundGradient.tsx`, `Particles.tsx` | Full-viewport R3F scene behind the board. Lazy-loaded and wrapped in an `ErrorBoundary` in `App.tsx` — shader/chunk failures must not crash the app. |
| Burst particles | `src/background/BurstParticles.tsx` + `burstEffects.ts` | GPU-pooled particle system triggered by combat events. |
| Combat bridge | `src/background/useCombatEffects.ts` | Subscribes to `combatStore`/`gameStore` inside `useFrame` and pushes `EffectEvent`s into the burst queue. |
| Arena animations | `src/combat/arena/models/useIdleAnimation.ts` and the GLB `attack`/`hit`/`death` actions | Character motion reactions to combat events. See [art.md](./art.md). |
| 2D HUD flashes | `src/combat/DamageFlash.tsx`, `HealthBar.tsx`, `CombatOverlay.tsx`, `RoyalAwakeningBanner.tsx` | Overlay reactions: red screen flash on damage, HP-bar tween, face-card banners, royal awakening. |
| Drag feedback | `src/components/DragTrail.tsx`, `DropPreview.tsx` | Pointer-follow trail and drop target preview during card drags. |

## Event flow

```
card move
  → EventDetector (src/game/combat/EventDetector.ts)
  → combatStore action (dealDamageToMonster / healHero / emitFaceCardEvent / …)
  → combatStore publishes an event id + data
  → useCombatEffects (runs in useFrame)
      • reads combat/game state
      • pushes an EffectEvent into BurstParticles' queue
      • updates continuous visual state (hpRatio, poison, empowered, win/loss)
  → BurstParticles.processEvent → spawn(...) with palette + velocity fn
  → shader renders the burst
```

Parallel paths: the same `combatStore` events drive the HUD components (`DamageFlash`, `HealthBar`, etc.) via normal React subscriptions, and drive arena character animations via `MonsterModel`/`HeroModel` listeners.

## EffectEvent

Defined in `src/background/useCombatEffects.ts`:

```ts
type EffectEvent = {
  type: 'hero-attack' | 'monster-attack' | 'hero-heal'
      | 'poison' | 'empower' | 'face-card';
  damage: number;
  label?: string;
  timestamp: number;
};
```

Adding a new effect type means extending this union, handling it in `burstEffects.ts#processEvent`, and emitting it from `useCombatEffects` (or directly from a new hook that mirrors its pattern). Do **not** emit EffectEvents from inside detectors — detectors only talk to `combatStore`.

## Palette

Canonical colors live in `src/background/burstEffects.ts`:

- `C_GREEN` `#66cc77`, `C_HEAL_GREEN` `#44dd44` — healing, column clear, Ace/Queen rises.
- `C_WHITE` `#ffffff` — chip damage, generic highlights.
- `C_RED` `#ff4444`, `C_DARK_RED` `#661111` — damage taken, poison.
- `C_PURPLE` `#aa44dd` — empower / combo.
- `C_GOLD` `#d4a843` — gold rewards.
- `C_ROYAL_PURPLE` `#c8a2ff`, `C_ROYAL_GOLD` `#ffd866` — royal awakening banner.

Use `lerpColor(a, b, t)` for gradients instead of introducing new constants ad hoc. Reuse palette entries so combat reads consistently across HUD, particles, and banners.

## Performance rules

- **GPU buffer pool.** `BurstParticles.tsx` owns a fixed-size particle pool. Spawns are cheap; allocations are not. Never create Three objects in a hot path — reuse `THREE.Color`/`THREE.Vector3` instances at module scope.
- **No per-frame store reads outside `useFrame`.** `useCombatEffects` reads `combatStore.getState()` / `gameStore.getState()` inside `useFrame` on purpose — don't convert to React subscriptions, which would re-render the R3F tree every event.
- **Lazy + boundary.** Keep `AnimatedBackground` lazy-loaded behind `React.lazy` and wrapped in `ErrorBoundary`. Shader compile failures on older GPUs must fall back silently.
- **No gameplay side effects.** VFX code must never call `gameStore` or `combatStore` setters. It's a read-only consumer.

## Adding a new VFX

1. Decide whether the trigger is a new combat event or a new visualization of an existing one.
   - **New combat event** → add a detector in `src/game/combat/detectors/` and a `combatStore` action (see [architecture.md](./architecture.md) and [game-design.md](./game-design.md)).
   - **New visualization only** → skip to step 3.
2. Emit the event from `combatStore`.
3. Extend `EffectEvent` in `useCombatEffects.ts` and push the event from the `useFrame` loop.
4. Handle it in `burstEffects.ts#processEvent` with palette colors + spawn calls.
5. If it needs a new shader, add it under `src/background/shaders/` and import from `BurstParticles.tsx` or `AnimatedBackground.tsx`.
6. Test on a low-end GPU profile; confirm the `ErrorBoundary` still catches a forced shader compile failure.
