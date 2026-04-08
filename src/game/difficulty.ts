export type Difficulty = 'normal' | 'hard' | 'nightmare';

export interface DifficultyConfig {
  hpMultiplier: number;
  atkMultiplier: number;
  goldMultiplier: number;
  label: string;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  normal: { hpMultiplier: 1.0, atkMultiplier: 1.0, goldMultiplier: 1.0, label: 'Normal' },
  hard: { hpMultiplier: 1.4, atkMultiplier: 1.3, goldMultiplier: 1.5, label: 'Hard' },
  nightmare: { hpMultiplier: 1.8, atkMultiplier: 1.6, goldMultiplier: 2.0, label: 'Nightmare' },
};
