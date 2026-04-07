import { useRef, useCallback, useState } from 'react';
import { useGameStore } from '../game/store';
import { findFoundationIndex, canMoveToTableau } from '../game/rules';
import { useDropTargetValidation } from '../hooks/useDropTargetValidation';
import { tableauId, foundationId } from '../game/pileId';
import TableauVisual from './TableauVisual';

interface TableauProps {
  index: number;
  cardWidth: number;
  cardHeight: number;
  faceUpOffset: number;
  onDragStart?: (pileId: string, cardIndex: number) => void;
  onDragEnd?: (clientPoint: { x: number; y: number }) => void;
}

/**
 * Tableau owns the per-pile drag state (zIndex boosting, follower transform
 * tracking) and delegates rendering to TableauVisual. The drop-target
 * validation predicate lives in useDropTargetValidation.
 */
export default function Tableau({
  index,
  cardWidth,
  cardHeight,
  faceUpOffset,
  onDragStart,
  onDragEnd,
}: TableauProps) {
  const pile = useGameStore(s => s.tableau[index]);
  const foundations = useGameStore(s => s.foundations);
  const moveCards = useGameStore(s => s.moveCards);
  const pileId = tableauId(index);
  const dragIdxRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragSource, setIsDragSource] = useState(false);

  const isValidTarget = useDropTargetValidation(pileId, (drag) => {
    if (drag.sourcePileId === pileId) return false;
    if (drag.cards.length === 0) return false;
    if (drag.sourcePileId === 'stock') return false;
    return canMoveToTableau([...drag.cards], pile);
  });

  const handleDoubleClick = useCallback(
    (cardIndex: number) => {
      if (cardIndex !== pile.length - 1) return;
      const card = pile[cardIndex];
      if (!card.faceUp) return;
      const fi = findFoundationIndex(card, foundations);
      if (fi >= 0) {
        moveCards({
          cards: [card],
          from: pileId,
          fromIndex: cardIndex,
          to: foundationId(fi),
        });
      }
    },
    [pile, foundations, moveCards, pileId],
  );

  const handleLocalDragStart = useCallback(
    (i: number) => {
      dragIdxRef.current = i;
      setIsDragSource(true);

      // Boost zIndex on drag source and all follower wrappers
      const container = containerRef.current;
      if (container) {
        container.querySelectorAll<HTMLElement>('[data-card-index]').forEach(el => {
          const idx = parseInt(el.getAttribute('data-card-index')!);
          if (idx >= i) {
            el.style.zIndex = `${1000 + idx}`;
          }
        });
      }
      onDragStart?.(pileId, i);
    },
    [pileId, onDragStart],
  );

  const handleDrag = useCallback(
    (_event: PointerEvent, info: { offset: { x: number; y: number } }) => {
      if (dragIdxRef.current === null) return;
      const container = containerRef.current;
      if (!container) return;

      container.querySelectorAll<HTMLElement>('[data-card-index]').forEach(el => {
        const idx = parseInt(el.getAttribute('data-card-index')!);
        if (idx > dragIdxRef.current!) {
          el.style.transform = `translate(${info.offset.x}px, ${info.offset.y}px)`;
          el.style.transition = 'none';
        }
      });
    },
    [],
  );

  const handleLocalDragEnd = useCallback(
    (info: { event: PointerEvent }) => {
      const container = containerRef.current;
      if (container && dragIdxRef.current !== null) {
        container.querySelectorAll<HTMLElement>('[data-card-index]').forEach(el => {
          const idx = parseInt(el.getAttribute('data-card-index')!);
          if (idx >= dragIdxRef.current!) {
            // Animate followers back to origin (matches dragSnapToOrigin)
            if (idx > dragIdxRef.current!) {
              el.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
              el.style.transform = '';
            }
            // Defer zIndex reset until after snap-back animation completes,
            // otherwise cards render behind face-down cards during animation
            setTimeout(() => {
              el.style.transition = '';
              el.style.zIndex = `${idx}`;
            }, 500);
          }
        });
      }
      dragIdxRef.current = null;
      setIsDragSource(false);
      onDragEnd?.({ x: info.event.clientX, y: info.event.clientY });
    },
    [onDragEnd],
  );

  return (
    <TableauVisual
      ref={containerRef}
      pileId={pileId}
      pile={pile}
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      faceUpOffset={faceUpOffset}
      isDragSource={isDragSource}
      isValidTarget={isValidTarget}
      onCardDoubleClick={handleDoubleClick}
      onCardDragStart={handleLocalDragStart}
      onCardDrag={handleDrag}
      onCardDragEnd={handleLocalDragEnd}
    />
  );
}
