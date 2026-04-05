import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MetaState {
  gold: number;
  totalGold: number;
  totalMonstersSlain: number;
  totalRunsCompleted: number;
  totalRunsStarted: number;
}

interface MetaActions {
  addGold: (amount: number) => void;
  recordMonsterSlain: () => void;
  recordRunCompleted: () => void;
  recordRunStarted: () => void;
}

export const useMetaStore = create<MetaState & MetaActions>()(
  persist(
    (set) => ({
      gold: 0,
      totalGold: 0,
      totalMonstersSlain: 0,
      totalRunsCompleted: 0,
      totalRunsStarted: 0,

      addGold: (amount: number) =>
        set((s) => ({ gold: s.gold + amount, totalGold: s.totalGold + amount })),

      recordMonsterSlain: () =>
        set((s) => ({ totalMonstersSlain: s.totalMonstersSlain + 1 })),

      recordRunCompleted: () =>
        set((s) => ({ totalRunsCompleted: s.totalRunsCompleted + 1 })),

      recordRunStarted: () =>
        set((s) => ({ totalRunsStarted: s.totalRunsStarted + 1 })),
    }),
    {
      name: 'sullytear-meta',
      partialize: (state) => ({
        gold: state.gold,
        totalGold: state.totalGold,
        totalMonstersSlain: state.totalMonstersSlain,
        totalRunsCompleted: state.totalRunsCompleted,
        totalRunsStarted: state.totalRunsStarted,
      }),
    },
  ),
);
