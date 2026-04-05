import { useRef, useCallback } from 'react';
import Stock from './Stock';
import Waste from './Waste';
import Foundation from './Foundation';
import Tableau from './Tableau';
import { useGameStore } from '../game/store';
import { useResponsive } from '../hooks/useResponsive';
import { dragState } from '../game/dragState';
import './GameBoard.css';

export default function GameBoard() {
  const { cardWidth, cardHeight, gap, faceUpOffset } = useResponsive();
  const boardRef = useRef<HTMLDivElement>(null);
  const dragSourceRef = useRef<{ pileId: string; cardIndex: number } | null>(null);

  const handleDragStart = useCallback((pileId: string, cardIndex: number) => {
    dragSourceRef.current = { pileId, cardIndex };

    // Populate shared drag state for valid-target highlighting
    const state = useGameStore.getState();
    let cards: import('../game/types').Card[] = [];
    if (pileId === 'waste') {
      cards = state.waste.length > 0 ? [state.waste[state.waste.length - 1]] : [];
    } else if (pileId.startsWith('tableau-')) {
      const tabIdx = parseInt(pileId.split('-')[1]);
      cards = state.tableau[tabIdx].slice(cardIndex);
    }
    dragState.active = true;
    dragState.cards = cards;
    dragState.sourcePileId = pileId;
  }, []);

  const handleDragEnd = useCallback((point: { x: number; y: number }) => {
    const dragSource = dragSourceRef.current;
    if (!dragSource) return;
    dragSourceRef.current = null;

    // Clear shared drag state
    dragState.active = false;
    dragState.cards = [];
    dragState.sourcePileId = '';

    // Read fresh state from store (avoid stale closures)
    const state = useGameStore.getState();

    // Find drop target — temporarily hide the dragged card so elementsFromPoint
    // can see through to the pile underneath
    const elements = document.elementsFromPoint(point.x, point.y);
    let targetPileId: string | null = null;

    for (const el of elements) {
      const pileEl = (el as HTMLElement).closest('[data-pile-id]');
      if (pileEl) {
        const id = pileEl.getAttribute('data-pile-id');
        // Skip the source pile — the dragged card is still visually inside it
        if (id && id !== dragSource.pileId) {
          targetPileId = id;
          break;
        }
      }
    }

    if (!targetPileId) return;

    // Get the cards being moved from fresh state
    let movingCards: import('../game/types').Card[];
    if (dragSource.pileId === 'waste') {
      movingCards = state.waste.length > 0 ? [state.waste[state.waste.length - 1]] : [];
    } else if (dragSource.pileId.startsWith('tableau-')) {
      const tabIdx = parseInt(dragSource.pileId.split('-')[1]);
      movingCards = state.tableau[tabIdx].slice(dragSource.cardIndex);
    } else {
      movingCards = [];
    }

    if (movingCards.length > 0) {
      state.moveCards({
        cards: movingCards,
        from: dragSource.pileId as 'waste' | `tableau-${number}`,
        fromIndex: dragSource.cardIndex,
        to: targetPileId as `tableau-${number}` | `foundation-${number}`,
      });
    }
  }, []);

  return (
    <div
      ref={boardRef}
      className="game-board"
      style={{ '--pile-gap': `${gap}px` } as React.CSSProperties}
    >
      <div className="top-row">
        <div className="top-left">
          <Stock cardWidth={cardWidth} cardHeight={cardHeight} />
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
