import Card, { CardPlaceholder } from './Card';
import { useGameStore } from '../game/store';

interface StockProps {
  cardWidth: number;
  cardHeight: number;
  onDragStart?: (pileId: string, cardIndex: number) => void;
  onDragEnd?: (clientPoint: { x: number; y: number }) => void;
}

export default function Stock({ cardWidth, cardHeight, onDragStart, onDragEnd }: StockProps) {
  const stock = useGameStore(s => s.stock);
  const drawFromStock = useGameStore(s => s.drawFromStock);

  if (stock.length === 0) {
    return (
      <div data-pile-id="stock" style={{ position: 'relative', width: cardWidth, height: cardHeight }}>
        <CardPlaceholder
          width={cardWidth}
          height={cardHeight}
          label="↻"
          onClick={drawFromStock}
        />
      </div>
    );
  }

  const topCard = stock[stock.length - 1];
  const hasMore = stock.length > 1;

  return (
    <div data-pile-id="stock" style={{ position: 'relative', width: cardWidth, height: cardHeight }}>
      {/* Underneath: second card if present, else empty placeholder */}
      {hasMore ? (
        <div style={{ position: 'absolute', inset: 0 }}>
          <Card
            card={stock[stock.length - 2]}
            width={cardWidth}
            height={cardHeight}
          />
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0 }}>
          <CardPlaceholder width={cardWidth} height={cardHeight} />
        </div>
      )}
      {/* Top card: draggable */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Card
          card={topCard}
          width={cardWidth}
          height={cardHeight}
          draggable
          onDragStart={() => onDragStart?.('stock', stock.length - 1)}
          onDragEnd={(point) => onDragEnd?.(point)}
        />
      </div>
    </div>
  );
}
