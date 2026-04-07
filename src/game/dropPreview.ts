import type { Card } from './types';
import { useCombatStore, _hasPlayTriggered } from './combatStore';
import { useGameStore } from './store';

const FACE_NAMES: Record<number, string> = { 1: 'Ace', 11: 'Jack', 12: 'Queen', 13: 'King' };

// Effect descriptions per face card per tier
const TIER_3_EFFECTS: Record<number, string> = {
  1: 'Heal 3',
  11: 'Poison 3',
  12: 'Heal 5',
  13: 'Empower 2x',
};

const TIER_2_EFFECTS: Record<number, string> = {
  1: 'Heal 2',
  11: 'Poison 2',
  12: 'Heal 3',
  13: 'Empower 1.5x',
};

function isFaceCard(rank: number): boolean {
  return rank in FACE_NAMES;
}

export function getDropPreview(cards: Card[], targetPileId: string, sourcePileId?: string): string | null {
  if (cards.length === 0) return null;
  const card = cards[0];
  const rank = card.rank;

  if (targetPileId === 'waste' && sourcePileId === 'stock') {
    const combat = useCombatStore.getState();
    const stockEmpty = useGameStore.getState().stock.length === 0;
    const baseDmg = stockEmpty ? combat.monsterAttackDamage : 1;
    const poison = combat.poisonTurns;
    if (poison > 0) {
      return `${baseDmg} + 2 poison dmg to you`;
    }
    return `${baseDmg} dmg to you`;
  }

  if (targetPileId.startsWith('foundation-')) {
    const combat = useCombatStore.getState();
    const multiplier = combat.empowerMultiplier;
    const damage: number = multiplier !== 1.0 ? Math.round(rank * multiplier) : rank;
    const faceName = FACE_NAMES[rank];
    const dmgStr = multiplier !== 1.0 ? `${damage} dmg (${multiplier}x)` : `${damage} dmg`;

    if (faceName) {
      return `${dmgStr} · ${faceName} Awakens! ${TIER_3_EFFECTS[rank]}`;
    }
    return dmgStr;
  }

  if (targetPileId.startsWith('tableau-')) {
    // Non-face from waste: show damage
    if (sourcePileId === 'waste' && !isFaceCard(rank)) {
      return `${rank} dmg`;
    }
    // Face card from tableau: show Rises! + effect if not already triggered
    if (isFaceCard(rank) && sourcePileId?.startsWith('tableau-')) {
      if (_hasPlayTriggered(card.id)) return null;
      return `${FACE_NAMES[rank]} Rises! ${TIER_2_EFFECTS[rank]}`;
    }
    return null;
  }

  return null;
}
