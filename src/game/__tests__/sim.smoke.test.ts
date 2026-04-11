/**
 * Smoke test for the headless simulator.
 *
 * Runs a handful of seeded games in-process and asserts basic shape
 * + invariants. The full simulator lives under `scripts/sim/` and is
 * normally invoked via `npm run sim`, but the core entry point is
 * importable directly for test coverage.
 */

import { describe, it, expect } from 'vitest';
import { runChunk } from '../../../scripts/sim/runnerCore';

describe('headless simulator smoke', () => {
  it('runs 5 seeded games and produces well-formed records', async () => {
    const lines = await runChunk({
      start: 0,
      end: 5,
      seed: 42,
      player: 'greedy',
      difficulty: 'normal',
      maxTurns: 200,
    });

    expect(lines).toHaveLength(5);

    for (const raw of lines) {
      const rec = JSON.parse(raw);
      expect(rec.player).toBe('greedy');
      expect(rec.difficulty).toBe('normal');
      expect(['victory', 'defeat', 'stuck']).toContain(rec.result);
      expect(typeof rec.turns).toBe('number');
      expect(typeof rec.encountersCleared).toBe('number');
      expect(Array.isArray(rec.heroHpCurve)).toBe(true);
      expect(rec.heroHpCurve.length).toBeGreaterThan(0);
      expect(typeof rec.damageBySource).toBe('object');
      expect(typeof rec.healBySource).toBe('object');
    }
  });

  it('same seed produces the same run (determinism)', async () => {
    const a = await runChunk({
      start: 0, end: 1, seed: 12345, player: 'greedy', difficulty: 'normal', maxTurns: 200,
    });
    const b = await runChunk({
      start: 0, end: 1, seed: 12345, player: 'greedy', difficulty: 'normal', maxTurns: 200,
    });

    // Parse both; compare the fields that must be deterministic.
    // heroHpCurve length and result should match exactly.
    const ra = JSON.parse(a[0]);
    const rb = JSON.parse(b[0]);
    expect(ra.result).toBe(rb.result);
    expect(ra.turns).toBe(rb.turns);
    expect(ra.encountersCleared).toBe(rb.encountersCleared);
    expect(ra.heroHpCurve).toEqual(rb.heroHpCurve);
  });
});
