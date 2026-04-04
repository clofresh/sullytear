import { useRef, useCallback } from 'react';
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
  onDragEnd?: (clientPoint: { x: number; y: number }) => void;
}

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
  const pileId = `tableau-${index}` as PileId;
  const dragIdxRef = useRef<number | null>(null);

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

  const handleLocalDragStart = useCallback((i: number) => {
    dragIdxRef.current = i;
    // Boost zIndex on drag source and all follower wrappers
    const container = document.querySelector(`[data-pile-id="${pileId}"]`);
    if (container) {
      container.querySelectorAll<HTMLElement>('[data-card-index]').forEach(el => {
        const idx = parseInt(el.getAttribute('data-card-index')!);
        if (idx >= i) {
          el.style.zIndex = `${1000 + idx}`;
        }
      });
    }
    onDragStart?.(pileId, i);
  }, [pileId, onDragStart]);

  const handleDrag = useCallback((_event: PointerEvent, info: { offset: { x: number; y: number } }) => {
    if (dragIdxRef.current === null) return;
    const container = document.querySelector(`[data-pile-id="${pileId}"]`);
    if (!container) return;

    container.querySelectorAll<HTMLElement>('[data-card-index]').forEach(el => {
      const idx = parseInt(el.getAttribute('data-card-index')!);
      if (idx > dragIdxRef.current!) {
        el.style.transform = `translate(${info.offset.x}px, ${info.offset.y}px)`;
        el.style.transition = 'none';
      }
    });
  }, [pileId]);

  const handleLocalDragEnd = useCallback((info: { event: PointerEvent }) => {
    const container = document.querySelector(`[data-pile-id="${pileId}"]`);
    if (container && dragIdxRef.current !== null) {
      container.querySelectorAll<HTMLElement>('[data-card-index]').forEach(el => {
        const idx = parseInt(el.getAttribute('data-card-index')!);
        if (idx >= dragIdxRef.current!) {
          // Animate followers back to origin (matches dragSnapToOrigin)
          if (idx > dragIdxRef.current!) {
            el.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
            el.style.transform = '';
          }
          el.style.zIndex = '';
          // Clean up transition after animation
          setTimeout(() => {
            el.style.transition = '';
          }, 500);
        }
      });
    }
    dragIdxRef.current = null;
    onDragEnd?.({ x: info.event.clientX, y: info.event.clientY });
  }, [pileId, onDragEnd]);

  // Calculate total height for the pile container
  let totalOffset = 0;
  for (let i = 0; i < pile.length; i++) {
    if (i > 0) {
      totalOffset += pile[i - 1].faceUp ? faceUpOffset : FACE_DOWN_OFFSET;
    }
  }

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

        return (
          <div
            key={card.id}
            data-card-index={i}
            style={{
              position: 'absolute',
              top,
              left: 0,
              zIndex: i,
              width: cardWidth,
              height: cardHeight,
            }}
          >
            <Card
              card={card}
              width={cardWidth}
              height={cardHeight}
              onDoubleClick={() => handleDoubleClick(i)}
              draggable={card.faceUp}
              onDragStart={() => handleLocalDragStart(i)}
              onDrag={card.faceUp ? handleDrag : undefined}
              onDragEnd={(info) => handleLocalDragEnd(info)}
            />
          </div>
        );
      })}
    </div>
  );
}
