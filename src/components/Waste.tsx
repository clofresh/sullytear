import Card, { CardPlaceholder } from './Card';
import { useGameStore } from '../game/store';
import { findFoundationIndex } from '../game/rules';

interface WasteProps {
  cardWidth: number;
  cardHeight: number;
  onDragStart?: (pileId: string, cardIndex: number) => void;
  onDragEnd?: (clientPoint: { x: number; y: number }) => void;
}

export default function Waste({ cardWidth, cardHeight, onDragStart, onDragEnd }: WasteProps) {
  const waste = useGameStore(s => s.waste);
  const foundations = useGameStore(s => s.foundations);
  const moveCards = useGameStore(s => s.moveCards);

  if (waste.length === 0) {
    return (
      <div data-pile-id="waste" style={{ position: 'relative', width: cardWidth, height: cardHeight }}>
        <CardPlaceholder width={cardWidth} height={cardHeight} />
      </div>
    );
  }

  const topCard = waste[waste.length - 1];
  const secondCard = waste.length >= 2 ? waste[waste.length - 2] : null;

  const handleDoubleClick = () => {
    const fi = findFoundationIndex(topCard, foundations);
    if (fi >= 0) {
      moveCards({
        cards: [topCard],
        from: 'waste',
        fromIndex: waste.length - 1,
        to: `foundation-${fi}`,
      });
    }
  };

  return (
    <div data-pile-id="waste" style={{ position: 'relative', width: cardWidth, height: cardHeight }}>
      {secondCard && (
        <Card
          card={secondCard}
          width={cardWidth}
          height={cardHeight}
        />
      )}
      <Card
        card={topCard}
        width={cardWidth}
        height={cardHeight}
        zIndex={1}
        onDoubleClick={handleDoubleClick}
        draggable
        onDragStart={() => onDragStart?.('waste', waste.length - 1)}
        onDragEnd={(info) => onDragEnd?.({ x: info.event.clientX, y: info.event.clientY })}
      />
    </div>
  );
}
