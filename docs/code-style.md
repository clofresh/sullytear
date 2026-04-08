# Code Style

## General
- Prefer direct, readable code. Avoid unnecessary verbosity.
- Use immutable patterns, especially for Zustand state transitions.
- Maintain strict TypeScript typing. Avoid `any`.

## Naming
- **Components**: PascalCase (`GameBoard.tsx`, `CombatBar.tsx`).
- **Hooks/Stores**: camelCase, prefixed with `use` (`useGameStore`).
- **Functions/Variables**: camelCase (`snapshotGame`, `currentEncounterIndex`).
- **Constants**: UPPER_SNAKE_CASE or PascalCase depending on usage.

## TypeScript
- Define explicit interfaces/types for complex objects, especially in `src/game/combat/types.ts`.
- Define Zustand store state and actions explicitly.

## Imports
- Group: (1) React/external libraries, (2) internal shared utilities/types, (3) component-specific imports.

## State Management
- `useGameStore` is the single source of truth for card state.
- Keep business logic out of components — put it in store actions or the detector pipeline.

## React & R3F
- Wrap high-risk components (e.g. `AnimatedBackground`, shader-based components) in `ErrorBoundary`.
- Use `React.memo` and `useMemo` for expensive 3D or complex 2D renders.
- Keep arena logic in `src/combat/arena/`; separate models, lighting, and layout.

## Error Handling
- Use `ErrorBoundary` for UI failures.
- Validate moves in `src/game/rules.ts` before updating `useGameStore`.
