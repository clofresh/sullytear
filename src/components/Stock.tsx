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

  return (
    <div data-pile-id="stock" style={{ position: 'relative', width: cardWidth, height: cardHeight }}>
      <Card
        card={stock[stock.length - 1]}
        width={cardWidth}
        height={cardHeight}
        onClick={drawFromStock}
        draggable
        onDragStart={() => onDragStart?.('stock', stock.length - 1)}
        onDragEnd={(info) => onDragEnd?.({ x: info.event.clientX, y: info.event.clientY })}
      />
    </div>
  );
}
