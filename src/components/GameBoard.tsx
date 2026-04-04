import { useRef, useCallback, useState } from 'react';
import Stock from './Stock';
import Waste from './Waste';
import Foundation from './Foundation';
import Tableau from './Tableau';
import { useGameStore } from '../game/store';
import { useResponsive } from '../hooks/useResponsive';
import './GameBoard.css';

export default function GameBoard() {
  const { cardWidth, cardHeight, gap, faceUpOffset } = useResponsive();
  const moveCards = useGameStore(s => s.moveCards);
  const tableau = useGameStore(s => s.tableau);
  const waste = useGameStore(s => s.waste);
  const boardRef = useRef<HTMLDivElement>(null);

  const [dragSource, setDragSource] = useState<{ pileId: string; cardIndex: number } | null>(null);

  const handleDragStart = useCallback((pileId: string, cardIndex: number) => {
    setDragSource({ pileId, cardIndex });
  }, []);

  const handleDragEnd = useCallback((point: { x: number; y: number }) => {
    if (!dragSource) return;

    // Find drop target using elementsFromPoint
    const elements = document.elementsFromPoint(point.x, point.y);
    let targetPileId: string | null = null;

    for (const el of elements) {
      const pileEl = (el as HTMLElement).closest('[data-pile-id]');
      if (pileEl) {
        targetPileId = pileEl.getAttribute('data-pile-id');
        break;
      }
    }

    if (targetPileId && targetPileId !== dragSource.pileId) {
      // Get the cards being moved
      let movingCards: import('../game/types').Card[];
      if (dragSource.pileId === 'waste') {
        movingCards = [waste[waste.length - 1]];
      } else if (dragSource.pileId.startsWith('tableau-')) {
        const tabIdx = parseInt(dragSource.pileId.split('-')[1]);
        movingCards = tableau[tabIdx].slice(dragSource.cardIndex);
      } else {
        movingCards = [];
      }

      if (movingCards.length > 0) {
        moveCards({
          cards: movingCards,
          from: dragSource.pileId as 'waste' | `tableau-${number}`,
          fromIndex: dragSource.cardIndex,
          to: targetPileId as `tableau-${number}` | `foundation-${number}`,
        });
      }
    }

    setDragSource(null);
  }, [dragSource, moveCards, waste, tableau]);

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
            draggingFrom={dragSource?.pileId}
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
            draggingFrom={dragSource?.pileId}
            draggingIndex={dragSource?.pileId === `tableau-${i}` ? dragSource.cardIndex : undefined}
          />
        ))}
      </div>
    </div>
  );
}
