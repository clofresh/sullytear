import type { Card } from './types';
import { useCombatStore, _hasPlayTriggered } from './combatStore';

const FACE_NAMES: Record<number, string> = { 1: 'Ace', 11: 'Jack', 12: 'Queen', 13: 'King' };

function isFaceCard(rank: number): boolean {
  return rank in FACE_NAMES;
}

export function getDropPreview(cards: Card[], targetPileId: string, sourcePileId?: string): string | null {
  if (cards.length === 0) return null;
  const card = cards[0];
  const rank = card.rank;

  if (targetPileId.startsWith('foundation-')) {
    const combat = useCombatStore.getState();
    const multiplier = combat.empowerMultiplier;
    const damage: number = multiplier !== 1.0 ? Math.round(rank * multiplier) : rank;
    const faceName = FACE_NAMES[rank];
    const dmgStr = `-${damage}`;

    if (multiplier !== 1.0 && !faceName) {
      return `${dmgStr} (${multiplier}x!)`;
    }
    if (faceName) {
      return `${dmgStr} ${faceName} Awakens!`;
    }
    return dmgStr;
  }

  if (targetPileId.startsWith('tableau-')) {
    // Non-face from waste: show damage
    if (sourcePileId === 'waste' && !isFaceCard(rank)) {
      return `-${rank}`;
    }
    // Face card from tableau: show Rises! if not already triggered
    if (isFaceCard(rank) && sourcePileId?.startsWith('tableau-')) {
      if (_hasPlayTriggered(card.id)) return null;
      return `${FACE_NAMES[rank]} Rises!`;
    }
    return null;
  }

  return null;
}
