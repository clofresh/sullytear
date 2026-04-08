import { useRef, useCallback } from 'react';
import Stock from './Stock';
import Waste from './Waste';
import Foundation from './Foundation';
import Tableau from './Tableau';
import { useGameStore } from '../game/store';
import { useResponsive } from '../hooks/useResponsive';
import { useDragApi } from '../game/DragContext';
import { foundationId, parsePileId, tableauId } from '../game/pileId';
import type { PileId } from '../game/types';
import { resolveDropTarget, type Point } from './dropTarget';
import './GameBoard.css';

// DOM adapters for resolveDropTarget. Kept here so the helper itself stays
// pure and unit-testable.
function elementsAtPoint(point: Point): string[] {
  const ids: string[] = [];
  for (const el of document.elementsFromPoint(point.x, point.y)) {
    const pileEl = (el as HTMLElement).closest('[data-pile-id]');
    const id = pileEl?.getAttribute('data-pile-id');
    if (id) ids.push(id);
  }
  return ids;
}

function getPileCenter(pileId: string): Point | null {
  const el = document.querySelector(`[data-pile-id="${pileId}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export default function GameBoard() {
  const { cardWidth, cardHeight, gap, faceUpOffset } = useResponsive();
  const boardRef = useRef<HTMLDivElement>(null);
  const dragSourceRef = useRef<{ pileId: string; cardIndex: number } | null>(null);
  const dragApi = useDragApi();

  const handleDragStart = useCallback((pileId: string, cardIndex: number) => {
    dragSourceRef.current = { pileId, cardIndex };

    const state = useGameStore.getState();
    const parsed = parsePileId(pileId);
    let cards: import('../game/types').Card[] = [];
    if (parsed?.kind === 'stock') {
      cards = state.stock.length > 0 ? [state.stock[state.stock.length - 1]] : [];
    } else if (parsed?.kind === 'waste') {
      cards = state.waste.length > 0 ? [state.waste[state.waste.length - 1]] : [];
    } else if (parsed?.kind === 'tableau') {
      cards = state.tableau[parsed.index].slice(cardIndex);
    }
    dragApi.start(cards, pileId);
  }, [dragApi]);

  const handleDragEnd = useCallback((point: { x: number; y: number }) => {
    const dragSource = dragSourceRef.current;
    if (!dragSource) return;
    dragSourceRef.current = null;

    // Capture valid targets, then clear drag state.
    const captured = dragApi.end();
    const validTargets = captured.validTargets;

    // Read fresh state from store (avoid stale closures)
    const state = useGameStore.getState();

    const targetPileId = resolveDropTarget({
      point,
      dragSourcePileId: dragSource.pileId,
      validTargets,
      cardWidth,
      elementsAtPoint,
      getPileCenter,
    });

    if (!targetPileId) return;

    // Stock → waste: draw from stock
    if (dragSource.pileId === 'stock' && targetPileId === 'waste') {
      state.drawFromStock();
      return;
    }

    // Get the cards being moved from fresh state
    const parsedSource = parsePileId(dragSource.pileId);
    const parsedTarget = parsePileId(targetPileId);
    if (!parsedSource || !parsedTarget) return;

    let movingCards: import('../game/types').Card[] = [];
    if (parsedSource.kind === 'waste') {
      movingCards = state.waste.length > 0 ? [state.waste[state.waste.length - 1]] : [];
    } else if (parsedSource.kind === 'tableau') {
      movingCards = state.tableau[parsedSource.index].slice(dragSource.cardIndex);
    }

    if (movingCards.length > 0) {
      const from: PileId =
        parsedSource.kind === 'tableau' ? tableauId(parsedSource.index) :
        parsedSource.kind === 'foundation' ? foundationId(parsedSource.index) :
        parsedSource.kind;
      const to: PileId =
        parsedTarget.kind === 'tableau' ? tableauId(parsedTarget.index) :
        parsedTarget.kind === 'foundation' ? foundationId(parsedTarget.index) :
        parsedTarget.kind;
      state.moveCards({
        cards: movingCards,
        from,
        fromIndex: dragSource.cardIndex,
        to,
      });
    }
  }, [cardWidth, dragApi]);

  return (
    <div
      ref={boardRef}
      className="game-board"
      style={{ '--pile-gap': `${gap}px` } as React.CSSProperties}
    >
      <div className="top-row">
        <div className="top-left">
          <Stock
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
          <Waste
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        </div>
        <div className="top-right">
          {[0, 1, 2, 3].map(i => (
            <Foundation key={i} index={i} cardWidth={cardWidth} cardHeight={cardHeight} />
          ))}
        </div>
      </div>

      <div className="tableau-row">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <Tableau
            key={i}
            index={i}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            faceUpOffset={faceUpOffset}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>
    </div>
  );
}
