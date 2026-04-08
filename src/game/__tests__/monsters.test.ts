import { describe, it, expect } from 'vitest';
import { MONSTER_ROSTER, buildEncounterConfig } from '../../combat/monsters';

describe('Monster Roster', () => {
  it('has 6 monsters', () => {
    expect(MONSTER_ROSTER).toHaveLength(6);
  });

  it('monsters are sorted by ascending tier', () => {
    for (let i = 1; i < MONSTER_ROSTER.length; i++) {
      expect(MONSTER_ROSTER[i].tier).toBeGreaterThan(MONSTER_ROSTER[i - 1].tier);
    }
  });

  it('each monster has positive HP, attack, and gold', () => {
    for (const m of MONSTER_ROSTER) {
      expect(m.maxHp).toBeGreaterThan(0);
      expect(m.attackDamage).toBeGreaterThan(0);
      expect(m.goldReward).toBeGreaterThan(0);
    }
  });

  it('each monster has a unique id', () => {
    const ids = MONSTER_ROSTER.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('buildEncounterConfig', () => {
  const slime = MONSTER_ROSTER[0]; // 40 HP, 4 atk

  it('returns correct stats for normal difficulty', () => {
    const config = buildEncounterConfig(slime, 'normal');
    expect(config.monsterName).toBe('Slime');
    expect(config.monsterId).toBe('slime');
    expect(config.monsterMaxHp).toBe(40);
    expect(config.monsterAttackDamage).toBe(4);
    expect(config.heroMaxHp).toBe(50);
  });

  it('applies hard difficulty multipliers', () => {
    const config = buildEncounterConfig(slime, 'hard');
    expect(config.monsterMaxHp).toBe(Math.round(40 * 1.4)); // 56
    expect(config.monsterAttackDamage).toBe(Math.round(4 * 1.3)); // 5
  });

  it('applies nightmare difficulty multipliers', () => {
    const config = buildEncounterConfig(slime, 'nightmare');
    expect(config.monsterMaxHp).toBe(Math.round(40 * 1.8)); // 72
    expect(config.monsterAttackDamage).toBe(Math.round(4 * 1.6)); // 6
  });

  it('passes heroStartHp when provided', () => {
    const config = buildEncounterConfig(slime, 'normal', 50, 30);
    expect(config.heroStartHp).toBe(30);
    expect(config.heroMaxHp).toBe(50);
  });

  it('heroStartHp is undefined when not provided', () => {
    const config = buildEncounterConfig(slime, 'normal');
    expect(config.heroStartHp).toBeUndefined();
  });

  it('does not seed starting armor or defense from difficulty', () => {
    const normal = buildEncounterConfig(slime, 'normal');
    expect(normal.heroStartArmor).toBeUndefined();
    expect(normal.heroStartDefense).toBeUndefined();
  });
});
