import { describe, it, expect } from 'vitest';
import { DIFFICULTY_CONFIG, type Difficulty } from '../difficulty';

describe('Difficulty Config', () => {
  it('has entries for all three difficulties', () => {
    const keys = Object.keys(DIFFICULTY_CONFIG) as Difficulty[];
    expect(keys).toContain('normal');
    expect(keys).toContain('hard');
    expect(keys).toContain('nightmare');
    expect(keys).toHaveLength(3);
  });

  it('normal has all multipliers at 1.0', () => {
    const n = DIFFICULTY_CONFIG.normal;
    expect(n.hpMultiplier).toBe(1.0);
    expect(n.atkMultiplier).toBe(1.0);
    expect(n.goldMultiplier).toBe(1.0);
  });

  it('hard has higher multipliers than normal', () => {
    const h = DIFFICULTY_CONFIG.hard;
    expect(h.hpMultiplier).toBeGreaterThan(1.0);
    expect(h.atkMultiplier).toBeGreaterThan(1.0);
    expect(h.goldMultiplier).toBeGreaterThan(1.0);
  });

  it('nightmare has higher multipliers than hard', () => {
    const n = DIFFICULTY_CONFIG.nightmare;
    const h = DIFFICULTY_CONFIG.hard;
    expect(n.hpMultiplier).toBeGreaterThan(h.hpMultiplier);
    expect(n.atkMultiplier).toBeGreaterThan(h.atkMultiplier);
    expect(n.goldMultiplier).toBeGreaterThan(h.goldMultiplier);
  });
});
