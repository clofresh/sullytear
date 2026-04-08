# UI / UX

The 2D solitaire UI lives in `src/components/`. The combat HUD overlays it from `src/combat/`. Both coexist in `App.tsx`, which gates on `useRunStore.isRunActive`: `RunStartScreen` before a run, the board + combat HUD + arena during a run, `WinScreen` after.

## Screen flow

```
RunStartScreen
    └─ startRun(difficulty) ─▶ GameBoard + CombatBar + CombatOverlay + CombatArena
                                    └─ monster dies ─▶ runStore.advanceEncounter ─▶ next encounter
                                    └─ hero dies    ─▶ WinScreen (defeat)
                                    └─ roster clear ─▶ WinScreen (victory)
```

`WinScreen` reads `runStore.runResult` and offers retry / return to start.

## Board layout

- `GameBoard.tsx` — top-level frame, lays out stock, waste, foundations, tableau. Handles responsive grid via `useResponsive`.
- `Stock.tsx` / `Waste.tsx` / `Foundation.tsx` / `Tableau.tsx` — the four Klondike pile types. Each is a thin view over `useGameStore`.
- `Card.tsx` — the unit card component. `FaceCard.tsx` renders J/Q/K/A art.
- `tableauLayout.ts` — pure math for tableau stacking offsets. Easy to unit-test (and is tested).
- `Header.tsx` — top bar with undo, gold, moves, run status.

## Drag and drop

Sullytear implements its own drag system rather than HTML5 drag events (HTML5 drag is unusable on touch and conflicts with R3F pointer handling).

- **`DragContext`** (`src/game/DragContext.tsx`) — React context holding the current drag snapshot (active cards, source pile id, valid drop targets). Mutable internally so pointer-move doesn't re-render the tree.
- **`useDropTargetValidation`** (`src/hooks/useDropTargetValidation.ts`) — on drag start, precomputes the set of valid drop pile ids by calling `rules.ts` against the current `gameStore`. Drop targets consult this set for hover feedback.
- **`DragTrail.tsx`** — pointer-follow visual effect painted during a drag.
- **`DropPreview.tsx`** — ghost-card preview on hovered valid targets. Preview math lives in `dropPreview.ts` and is unit tested.
- **Drop handling** — on pointer-up over a valid target, the drop handler calls a `gameStore` move action. That action is what triggers the combat chain; the drag itself is pure UI.

## Responsive & orientation

- `useResponsive` (`src/hooks/useResponsive.ts`) exposes breakpoint info for the board.
- `useTimer` (`src/hooks/useTimer.ts`) is a small reusable RAF timer used by HUD tweens.
- The PWA manifest allows any orientation; portrait and landscape layouts are both supported. `portraitPositions.ts` stores portrait-specific arena/HUD offsets.

## Combat HUD

- `CombatBar.tsx` — always-visible bar with hero/monster HP and threat meter.
- `CombatOverlay.tsx` — transient overlay for big moments (face-card rises, royal awakening).
- `HealthBar.tsx` — reusable tweened HP bar.
- `DamageFlash.tsx` — red flash on hero damage.
- `RoyalAwakeningBanner.tsx` — banner for the royal awakening event.

HUD components subscribe to `combatStore` via normal React selectors. They must never mutate game state — if they need a new trigger, add a detector instead. See [state-management.md](./state-management.md).

## Error boundaries

- `ErrorBoundary.tsx` wraps `AnimatedBackground` in `App.tsx`. This is load-bearing: shader / lazy-chunk failures must not crash the app. Preserve this pattern if you introduce new lazy R3F scenes.
- Consider wrapping any new third-party or GPU-sensitive surface in its own boundary.

## UX rules of thumb

- **Every meaningful click is a combat event.** If you add a UI affordance that moves cards, make sure it goes through `gameStore` actions (not direct state mutation), so detectors fire.
- **Undo is sacred.** Any UI state that can be rewound must restore correctly — don't cache derived UI state in refs that outlive the store.
- **Touch first.** Hit targets should be finger-sized; drag handles should be generous.
- **Never block on animation.** Input must remain responsive even mid-burst. VFX queues are fire-and-forget by design.
