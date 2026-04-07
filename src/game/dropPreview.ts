import type { Card } from './types';
import { useCombatStore, hasPlayTriggered } from './combatStore';
import { useGameStore } from './store';
import { FACE_NAMES, isFaceCard, RANK_ACE, RANK_JACK, RANK_QUEEN, RANK_KING } from './faceCard';

// Effect descriptions per face card per tier
const TIER_3_EFFECTS: Record<number, string> = {
  [RANK_ACE]: 'Heal 3',
  [RANK_JACK]: 'Poison 3',
  [RANK_QUEEN]: 'Heal 5',
  [RANK_KING]: 'Empower 2x',
};

const TIER_2_EFFECTS: Record<number, string> = {
  [RANK_ACE]: 'Heal 2',
  [RANK_JACK]: 'Poison 2',
  [RANK_QUEEN]: 'Heal 3',
  [RANK_KING]: 'Empower 1.5x',
};

export function getDropPreview(cards: Card[], targetPileId: string, sourcePileId?: string): string | null {
  if (cards.length === 0) return null;
  const card = cards[0];
  const rank = card.rank;

  if (targetPileId === 'waste' && sourcePileId === 'stock') {
    const combat = useCombatStore.getState();
    const stockEmpty = useGameStore.getState().stock.length === 0;
    const baseDmg = stockEmpty ? combat.monsterAttackDamage : rank;
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
    const parts: string[] = [];

    // Waste → tableau: show waste damage (always, regardless of face card)
    if (sourcePileId === 'waste') {
      parts.push(`${rank} dmg`);
      // Face card from waste also triggers tier 2 Rises! on arrival
      if (isFaceCard(rank) && !hasPlayTriggered(card.id)) {
        parts.push(`${FACE_NAMES[rank]} Rises! ${TIER_2_EFFECTS[rank]}`);
      }
    }

    // Tableau → tableau: face card tier 2 + source-pile side effects
    if (sourcePileId?.startsWith('tableau-')) {
      // Face card Rises! if head is face card and not already triggered
      if (isFaceCard(rank) && !hasPlayTriggered(card.id)) {
        parts.push(`${FACE_NAMES[rank]} Rises! ${TIER_2_EFFECTS[rank]}`);
      }

      // Compute source-pile side effects
      const sourceIdx = parseInt(sourcePileId.split('-')[1]);
      const sourcePile = useGameStore.getState().tableau[sourceIdx];
      if (sourcePile) {
        const fromIndex = sourcePile.findIndex(c => c.id === card.id);
        if (fromIndex >= 0) {
          const reveal = fromIndex > 0 && sourcePile[fromIndex - 1].faceUp === false;
          const columnClear = fromIndex === 0;
          if (reveal) parts.push('+2 dmg Reveal');
          if (columnClear) parts.push('+5 HP Clear');
        }
      }
    }

    return parts.length > 0 ? parts.join(' · ') : null;
  }

  return null;
}
