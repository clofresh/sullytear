import { useState, useEffect } from 'react';
import Card, { CardPlaceholder } from './Card';
import { useGameStore } from '../game/store';
import { canMoveToFoundation } from '../game/rules';
import { SUIT_SYMBOLS } from '../utils/constants';
import { dragState } from '../game/dragState';
import DropPreview from './DropPreview';

const FOUNDATION_SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];

interface FoundationProps {
  index: number;
  cardWidth: number;
  cardHeight: number;
}

export default function Foundation({ index, cardWidth, cardHeight }: FoundationProps) {
  const pile = useGameStore(s => s.foundations[index]);
  const pileId = `foundation-${index}`;
  const [isValidTarget, setIsValidTarget] = useState(false);

  // Poll for valid drop target status during drag
  useEffect(() => {
    const check = () => {
      if (!dragState.active || dragState.cards.length !== 1) {
        setIsValidTarget(false);
        dragState.validTargets.delete(pileId);
        return;
      }
      const valid = canMoveToFoundation(dragState.cards[0], pile);
      setIsValidTarget(valid);
      if (valid) {
        dragState.validTargets.add(pileId);
      } else {
        dragState.validTargets.delete(pileId);
      }
    };

    const interval = setInterval(check, 100);
    return () => {
      clearInterval(interval);
      dragState.validTargets.delete(pileId);
    };
  }, [pile, pileId]);

  const moves = useGameStore(s => s.moves);
  useEffect(() => {
    setIsValidTarget(false);
  }, [moves]);

  return (
    <div
      data-pile-id={pileId}
      className={isValidTarget ? 'valid-drop-target' : undefined}
      style={{ position: 'relative', width: cardWidth, height: cardHeight }}
    >
      {isValidTarget && <DropPreview targetPileId={pileId} />}
      {pile.length === 0 ? (
        <CardPlaceholder
          width={cardWidth}
          height={cardHeight}
          label={SUIT_SYMBOLS[FOUNDATION_SUITS[index]]}
        />
      ) : (
        <Card
          card={pile[pile.length - 1]}
          width={cardWidth}
          height={cardHeight}
        />
      )}
    </div>
  );
}
