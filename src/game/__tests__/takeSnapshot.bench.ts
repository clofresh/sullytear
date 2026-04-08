import { bench, describe } from 'vitest';
import { takeSnapshot, useGameStore } from '../store';

/**
 * Benchmark for issue #66: profile the per-move cost of `takeSnapshot`.
 *
 * Run with:
 *   npx vitest bench src/game/__tests__/takeSnapshot.bench.ts
 *
 * `npm test` (which calls `vitest run`) does NOT execute `.bench.ts`
 * files, so this benchmark stays out of CI by default.
 *
 * Decision rule from #66's acceptance criteria:
 *   - mean < 0.5 ms / op  → close as won't-fix
 *   - mean ≥ 0.5 ms / op  → implement structural-sharing history
 */

function buildMidGameState(): ReturnType<typeof useGameStore.getState> {
  const store = useGameStore;
  // Reset to a fresh deal so the bench is reproducible across runs.
  store.getState().newGame(1);

  // Run a small fixed sequence of legal-ish actions so the snapshot
  // exercises every pile (waste populated, tableau columns shuffled,
  // an undo stack at typical mid-game depth). The exact moves don't
  // matter — only that they touch each pile collection.
  for (let i = 0; i < 25; i++) {
    store.getState().drawFromStock();
  }
  return store.getState();
}

describe('takeSnapshot', () => {
  const state = buildMidGameState();

  bench('takeSnapshot, mid-game state', () => {
    takeSnapshot(state);
  });
});
