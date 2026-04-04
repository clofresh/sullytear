import Card, { CardPlaceholder } from './Card';
import { useGameStore } from '../game/store';
import { SUIT_SYMBOLS } from '../utils/constants';

const FOUNDATION_SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];

interface FoundationProps {
  index: number;
  cardWidth: number;
  cardHeight: number;
}

export default function Foundation({ index, cardWidth, cardHeight }: FoundationProps) {
  const pile = useGameStore(s => s.foundations[index]);
  const pileId = `foundation-${index}`;

  return (
    <div
      data-pile-id={pileId}
      style={{ position: 'relative', width: cardWidth, height: cardHeight }}
    >
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
