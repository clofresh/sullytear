import Card, { CardPlaceholder } from './Card';
import { useGameStore } from '../game/store';
import { findFoundationIndex } from '../game/rules';
import { FACE_DOWN_OFFSET } from '../utils/constants';
import type { PileId } from '../game/types';

interface TableauProps {
  index: number;
  cardWidth: number;
  cardHeight: number;
  faceUpOffset: number;
  onDragStart?: (pileId: string, cardIndex: number) => void;
  onDragEnd?: (point: { x: number; y: number }) => void;
  draggingFrom?: string | null;
  draggingIndex?: number;
}

export default function Tableau({
  index,
  cardWidth,
  cardHeight,
  faceUpOffset,
  onDragStart,
  onDragEnd,
  draggingFrom,
  draggingIndex,
}: TableauProps) {
  const pile = useGameStore(s => s.tableau[index]);
  const foundations = useGameStore(s => s.foundations);
  const moveCards = useGameStore(s => s.moveCards);
  const pileId = `tableau-${index}` as PileId;

  const handleDoubleClick = (cardIndex: number) => {
    if (cardIndex !== pile.length - 1) return;
    const card = pile[cardIndex];
    if (!card.faceUp) return;
    const fi = findFoundationIndex(card, foundations);
    if (fi >= 0) {
      moveCards({
        cards: [card],
        from: pileId,
        fromIndex: cardIndex,
        to: `foundation-${fi}` as PileId,
      });
    }
  };

  // Calculate total height for the pile container
  let totalOffset = 0;
  for (let i = 0; i < pile.length; i++) {
    if (i > 0) {
      totalOffset += pile[i - 1].faceUp ? faceUpOffset : FACE_DOWN_OFFSET;
    }
  }

  const isDraggingThisPile = draggingFrom === pileId;

  return (
    <div
      data-pile-id={pileId}
      style={{
        position: 'relative',
        width: cardWidth,
        height: pile.length === 0 ? cardHeight : totalOffset + cardHeight,
        minHeight: cardHeight,
      }}
    >
      {pile.length === 0 && (
        <CardPlaceholder width={cardWidth} height={cardHeight} label="K" />
      )}
      {pile.map((card, i) => {
        let top = 0;
        for (let j = 0; j < i; j++) {
          top += pile[j].faceUp ? faceUpOffset : FACE_DOWN_OFFSET;
        }

        const isBeingDragged = isDraggingThisPile && draggingIndex !== undefined && i >= draggingIndex;
        const canDrag = card.faceUp;

        return (
          <Card
            key={card.id}
            card={card}
            width={cardWidth}
            height={cardHeight}
            style={{ top }}
            zIndex={i}
            onDoubleClick={() => handleDoubleClick(i)}
            draggable={canDrag}
            onDragStart={() => onDragStart?.(pileId, i)}
            onDragEnd={(info) => onDragEnd?.(info.point)}
            isDragging={isBeingDragged}
          />
        );
      })}
    </div>
  );
}
