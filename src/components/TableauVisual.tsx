import { forwardRef } from 'react';
import Card, { CardPlaceholder } from './Card';
import DropPreview from './DropPreview';
import { computePileLayout } from './tableauLayout';
import { FACE_DOWN_OFFSET } from '../utils/constants';
import type { Card as CardType, PileId } from '../game/types';

interface TableauVisualProps {
  pileId: PileId;
  pile: ReadonlyArray<CardType>;
  cardWidth: number;
  cardHeight: number;
  faceUpOffset: number;
  isDragSource: boolean;
  isValidTarget: boolean;
  onCardDoubleClick: (cardIndex: number) => void;
  onCardDragStart: (cardIndex: number) => void;
  onCardDrag?: (event: PointerEvent, info: { offset: { x: number; y: number } }) => void;
  onCardDragEnd: (info: { event: PointerEvent }) => void;
}

/**
 * Pure presentational rendering of a tableau pile. Drag/zIndex state lives
 * in the parent — this component only consumes it via props.
 */
const TableauVisual = forwardRef<HTMLDivElement, TableauVisualProps>(function TableauVisual(
  {
    pileId,
    pile,
    cardWidth,
    cardHeight,
    faceUpOffset,
    isDragSource,
    isValidTarget,
    onCardDoubleClick,
    onCardDragStart,
    onCardDrag,
    onCardDragEnd,
  },
  ref,
) {
  const { tops, totalOffset } = computePileLayout(pile, faceUpOffset, FACE_DOWN_OFFSET);

  return (
    <div
      ref={ref}
      data-pile-id={pileId}
      style={{
        position: 'relative',
        width: cardWidth,
        height: pile.length === 0 ? cardHeight : totalOffset + cardHeight,
        minHeight: cardHeight,
        zIndex: isDragSource ? 1000 : undefined,
      }}
    >
      {pile.length === 0 && (
        <>
          {isValidTarget && <DropPreview targetPileId={pileId} />}
          <CardPlaceholder width={cardWidth} height={cardHeight} label="K" />
        </>
      )}
      {pile.map((card, i) => {
        const isTopCard = i === pile.length - 1;
        return (
          <div
            key={card.id}
            data-card-index={i}
            className={isTopCard && isValidTarget ? 'valid-drop-target' : undefined}
            style={{
              position: 'absolute',
              top: tops[i],
              left: 0,
              zIndex: i,
              width: cardWidth,
              height: cardHeight,
            }}
          >
            {isTopCard && isValidTarget && <DropPreview targetPileId={pileId} />}
            <Card
              card={card}
              width={cardWidth}
              height={cardHeight}
              onDoubleClick={() => onCardDoubleClick(i)}
              draggable={card.faceUp}
              onDragStart={() => onCardDragStart(i)}
              onDrag={card.faceUp ? onCardDrag : undefined}
              onDragEnd={onCardDragEnd}
            />
          </div>
        );
      })}
    </div>
  );
});

export default TableauVisual;
