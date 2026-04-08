import type { EncounterConfig } from '../game/combatStore';
import { type Difficulty, DIFFICULTY_CONFIG } from '../game/difficulty';

export interface MonsterDef {
  id: string;
  name: string;
  maxHp: number;
  attackDamage: number;
  threatMax: number;
  tier: number;
  goldReward: number;
}

export const MONSTER_ROSTER: MonsterDef[] = [
  { id: 'slime',    name: 'Slime',    maxHp: 40,  attackDamage: 4,  threatMax: 20, tier: 1, goldReward: 10 },
  { id: 'goblin',   name: 'Goblin',   maxHp: 55,  attackDamage: 6,  threatMax: 28, tier: 2, goldReward: 15 },
  { id: 'skeleton', name: 'Skeleton', maxHp: 70,  attackDamage: 8,  threatMax: 35, tier: 3, goldReward: 20 },
  { id: 'werewolf', name: 'Werewolf', maxHp: 85,  attackDamage: 9,  threatMax: 40, tier: 4, goldReward: 25 },
  { id: 'lich',     name: 'Lich',     maxHp: 100, attackDamage: 10, threatMax: 50, tier: 5, goldReward: 30 },
  { id: 'dragon',   name: 'Dragon',   maxHp: 120, attackDamage: 12, threatMax: 60, tier: 6, goldReward: 40 },
];

export function buildEncounterConfig(
  monster: MonsterDef,
  difficulty: Difficulty,
  heroMaxHp: number = 50,
  heroStartHp?: number,
): EncounterConfig {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  return {
    monsterName: monster.name,
    monsterId: monster.id,
    monsterMaxHp: Math.round(monster.maxHp * cfg.hpMultiplier),
    monsterAttackDamage: Math.round(monster.attackDamage * cfg.atkMultiplier),
    monsterThreatMax: monster.threatMax,
    heroMaxHp,
    heroStartHp,
    heroStartArmor: cfg.startArmor,
    heroStartDefense: cfg.startDefense,
  };
}
