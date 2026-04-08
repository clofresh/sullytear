import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Card, { CardPlaceholder } from './Card';
import { useGameStore } from '../game/store';
import { findFoundationIndex } from '../game/rules';
import { foundationId } from '../game/pileId';
import { useDropTargetValidation } from '../hooks/useDropTargetValidation';

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
  const [isDragging, setIsDragging] = useState(false);

  const isValidTarget = useDropTargetValidation('waste', (drag) => drag.sourcePileId === 'stock');

  if (waste.length === 0) {
    return (
      <div
        data-pile-id="waste"
        className={isValidTarget ? 'valid-drop-target' : undefined}
        style={{ position: 'relative', width: cardWidth, height: cardHeight }}
      >
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
        to: foundationId(fi),
      });
    }
  };

  return (
    <div
      data-pile-id="waste"
      className={isValidTarget ? 'valid-drop-target' : undefined}
      style={{
        position: 'relative',
        width: cardWidth,
        height: cardHeight,
        zIndex: isDragging ? 1000 : undefined,
      }}
    >
      {secondCard && (
        <Card
          card={secondCard}
          width={cardWidth}
          height={cardHeight}
        />
      )}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={topCard.id}
          initial={{ rotateY: 180, x: -cardWidth * 0.5, opacity: 0.8 }}
          animate={{ rotateY: 0, x: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, perspective: 600, transformStyle: 'preserve-3d' }}
        >
          <Card
            card={topCard}
            width={cardWidth}
            height={cardHeight}
            zIndex={1}
            onDoubleClick={handleDoubleClick}
            draggable
            onDragStart={() => { setIsDragging(true); onDragStart?.('waste', waste.length - 1); }}
            onDragEnd={(point) => { setIsDragging(false); onDragEnd?.(point); }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
