import Card, { CardPlaceholder } from './Card';
import { useGameStore } from '../game/store';
import { canMoveToFoundation } from '../game/rules';
import { SUIT_SYMBOLS } from '../utils/constants';
import { useDropTargetValidation } from '../hooks/useDropTargetValidation';
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

  const isValidTarget = useDropTargetValidation(pileId, (drag) => {
    if (drag.cards.length !== 1) return false;
    if (drag.sourcePileId === 'stock') return false;
    return canMoveToFoundation(drag.cards[0], pile);
  });

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
