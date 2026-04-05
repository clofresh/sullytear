import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCombatStore } from '../game/combatStore';
import { useGameStore } from '../game/store';

export interface EffectEvent {
  type: 'hero-attack' | 'monster-attack' | 'hero-heal' | 'poison' | 'empower';
  damage: number;
  label?: string;
  timestamp: number;
}

export interface CombatVisualState {
  hpRatio: number;
  poisonActive: boolean;
  empowered: boolean;
  combatResult: 'none' | 'victory' | 'defeat';
  isWon: boolean;
}

export function useCombatEffects() {
  const effectQueue = useRef<EffectEvent[]>([]);
  const combatState = useRef<CombatVisualState>({
    hpRatio: 1,
    poisonActive: false,
    empowered: false,
    combatResult: 'none',
    isWon: false,
  });
  const lastEventId = useRef(-1);
  const lastCombatResult = useRef<'none' | 'victory' | 'defeat'>('none');

  useFrame(() => {
    const cs = useCombatStore.getState();
    const gs = useGameStore.getState();

    // Update continuous visual state
    combatState.current.hpRatio = cs.heroMaxHp > 0 ? cs.heroHp / cs.heroMaxHp : 1;
    combatState.current.poisonActive = cs.poisonTurns > 0;
    combatState.current.empowered = cs.empowered;
    combatState.current.isWon = gs.isWon;

    // Detect combat result changes
    if (cs.combatResult !== lastCombatResult.current) {
      combatState.current.combatResult = cs.combatResult;
      if (cs.combatResult === 'victory' || cs.combatResult === 'defeat') {
        effectQueue.current.push({
          type: cs.combatResult === 'victory' ? 'hero-attack' : 'monster-attack',
          damage: 999,
          label: cs.combatResult,
          timestamp: Date.now(),
        });
      }
      lastCombatResult.current = cs.combatResult;
    }

    // Detect new combat events
    if (cs.eventId !== lastEventId.current && cs.lastEvent) {
      lastEventId.current = cs.eventId;
      effectQueue.current.push({
        type: cs.lastEvent.type,
        damage: cs.lastEvent.damage,
        label: cs.lastEvent.label,
        timestamp: Date.now(),
      });
    }
  });

  return { effectQueue, combatState };
}
