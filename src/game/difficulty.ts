export type Difficulty = 'normal' | 'hard' | 'nightmare';

export interface DifficultyConfig {
  hpMultiplier: number;
  atkMultiplier: number;
  goldMultiplier: number;
  startArmor: number;
  startDefense: number;
  label: string;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  normal: { hpMultiplier: 1.0, atkMultiplier: 1.0, goldMultiplier: 1.0, startArmor: 10, startDefense: 15, label: 'Normal' },
  hard: { hpMultiplier: 1.4, atkMultiplier: 1.3, goldMultiplier: 1.5, startArmor: 5, startDefense: 5, label: 'Hard' },
  nightmare: { hpMultiplier: 1.8, atkMultiplier: 1.6, goldMultiplier: 2.0, startArmor: 0, startDefense: 0, label: 'Nightmare' },
};
