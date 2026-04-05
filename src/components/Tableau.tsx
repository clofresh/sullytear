import { useRef, useCallback, useState, useEffect } from 'react';
import Card, { CardPlaceholder } from './Card';
import { useGameStore } from '../game/store';
import { findFoundationIndex, canMoveToTableau } from '../game/rules';
import { FACE_DOWN_OFFSET } from '../utils/constants';
import { dragState } from '../game/dragState';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragSource, setIsDragSource] = useState(false);
  const [isValidTarget, setIsValidTarget] = useState(false);

  // Poll for valid drop target status during drag
  useEffect(() => {
    if (!dragState.active) {
      setIsValidTarget(false);
      return;
    }

    const check = () => {
      if (!dragState.active || dragState.sourcePileId === pileId || dragState.cards.length === 0) {
        setIsValidTarget(false);
        return;
      }

      // Check if dragged cards can be placed on this pile
      setIsValidTarget(canMoveToTableau(dragState.cards, pile));
    };

    check();
    const interval = setInterval(check, 100);
    return () => clearInterval(interval);
  }, [pile, pileId]);

  // Clear valid target when drag state changes (via store updates)
  const moves = useGameStore(s => s.moves);
  useEffect(() => {
    setIsValidTarget(false);
  }, [moves]);

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
  }, [pileId, onDragStart]);

  const handleDrag = useCallback((_event: PointerEvent, info: { offset: { x: number; y: number } }) => {
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
  }, []);

  const handleLocalDragEnd = useCallback((info: { event: PointerEvent }) => {
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
    setIsValidTarget(false);
    onDragEnd?.({ x: info.event.clientX, y: info.event.clientY });
  }, [onDragEnd]);

  // Calculate total height for the pile container
  let totalOffset = 0;
  for (let i = 0; i < pile.length; i++) {
    if (i > 0) {
      totalOffset += pile[i - 1].faceUp ? faceUpOffset : FACE_DOWN_OFFSET;
    }
  }

  return (
    <div
      ref={containerRef}
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
        <CardPlaceholder width={cardWidth} height={cardHeight} label="K" />
      )}
      {pile.map((card, i) => {
        let top = 0;
        for (let j = 0; j < i; j++) {
          top += pile[j].faceUp ? faceUpOffset : FACE_DOWN_OFFSET;
        }

        const isTopCard = i === pile.length - 1;

        return (
          <div
            key={card.id}
            data-card-index={i}
            className={isTopCard && isValidTarget ? 'valid-drop-target' : undefined}
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
