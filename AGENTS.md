# AGENTS.md

This document provides technical guidelines and operational commands for agentic coding assistants working on the Sullytear project.

## Operational Commands

### Build and Quality
- **Development Server**: `npm run dev` (starts Vite dev server)
- **Production Build**: `npm run build` (runs `tsc -b` and `vite build`)
- **Type Checking**: `npm run typecheck` (runs `generate-build-info.js` then `tsc --noEmit`)
- **Build Info Generation**: `node scripts/generate-build-info.js` (required for type-checking and builds)

### Testing (Vitest)
- **Run All Tests**: `npm test`
- **Run Specific Test File**: `npx vitest run <path_to_file>`
  - Example: `npx vitest run src/game/__tests__/store.test.ts`
- **Run Tests by Name/Pattern**: `npx vitest run -t "pattern"`

## Code Style Guidelines

### General Principles
- **Conciseness**: Prefer direct, readable code. Avoid unnecessary verbosity.
- **Immutability**: Use immutable patterns, especially when dealing with state transitions in Zustand stores.
- **Type Safety**: Maintain strict TypeScript typing. Avoid `any` wherever possible.

### Naming Conventions
- **Components**: PascalCase (e.g., `GameBoard.tsx`, `CombatBar.tsx`).
- **Hooks/Stores**: camelCase, prefixed with `use` (e.g., `useGameStore`, `useCombatStore`).
- **Functions/Variables**: camelCase (e.g., `snapshotGame`, `currentEncounterIndex`).
- **Constants/Enums**: UPPER_SNAKE_CASE or PascalCase depending on usage.
- **Files**: Match component names or use descriptive camelCase for logic files.

### TypeScript & Types
- **Explicit Types**: Define interfaces or types for complex objects, especially in `src/game/combat/types.ts`.
- **Zustand Stores**: Define state and action types explicitly to ensure store consistency across the four interconnected stores.

### Imports and Structure
- **Organization**: Group imports by (1) React/External libraries, (2) Internal shared utilities/types, (3) Component-specific imports.
- **Pathing**: Use consistent relative paths or configured aliases.

### State Management (Zustand)
- **Single Source of Truth**: `useGameStore` is the primary source for card state.
- **Subscription Chain**: Adhere to the pipeline: `gameStore` $\rightarrow$ `EventDetector` $\rightarrow$ `combatStore` $\rightarrow$ `runStore`.
- **Side Effects**: Avoid putting business logic directly in components; move it to store actions or the detector pipeline.

### React & R3F
- **Error Boundaries**: Wrap high-risk components (like `AnimatedBackground` or shader-based components) in `ErrorBoundary` to prevent application crashes.
- **Performance**: Use `React.memo` and `useMemo` for expensive 3D calculations or complex 2D UI renders.
- **R3F Convention**: Keep arena logic in `src/combat/arena/` and separate models from lighting and layout.

### Error Handling
- **Graceful Degradation**: Use `ErrorBoundary` for UI failures.
- **Validation**: Perform move validation in `src/game/rules.ts` before updating the state in `useGameStore`.

## Architecture Notes for Agents
- **Combat Pipeline**: Do not trigger combat effects directly from card moves. Add a detector in `src/game/combat/detectors/` and register it in `EventDetector.ts`.
- **State Resets**: The `runStore.advanceEncounter` action is responsible for resetting the game and combat stores.
