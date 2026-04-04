import Card, { CardPlaceholder } from './Card';
import { useGameStore } from '../game/store';

interface StockProps {
  cardWidth: number;
  cardHeight: number;
}

export default function Stock({ cardWidth, cardHeight }: StockProps) {
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
      />
    </div>
  );
}
