import { motion } from 'framer-motion';
import { Card as CardType, getColor, getRankLabel } from '../game/types';
import { SUIT_SYMBOLS } from '../utils/constants';
import { PIP_LAYOUTS } from '../utils/pipLayouts';
import FaceCard from './FaceCard';
import './Card.css';

interface CardProps {
  card: CardType;
  width: number;
  height: number;
  style?: React.CSSProperties;
  onClick?: () => void;
  onDoubleClick?: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDrag?: (event: PointerEvent, info: { offset: { x: number; y: number } }) => void;
  onDragEnd?: (info: { point: { x: number; y: number }; event: PointerEvent }) => void;
  zIndex?: number;
}

export default function Card({
  card,
  width,
  height,
  style,
  onClick,
  onDoubleClick,
  draggable = false,
  onDragStart,
  onDrag,
  onDragEnd,
  zIndex = 0,
}: CardProps) {
  const color = getColor(card.suit);
  const rank = getRankLabel(card.rank);
  const suit = SUIT_SYMBOLS[card.suit];
  const fontSize = Math.max(width * 0.16, 8);

  return (
    <motion.div
      className={`card ${color}`}
      style={{
        width,
        height,
        zIndex,
        ...style,
      }}
      animate={{ rotateY: card.faceUp ? 0 : 180 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      drag={draggable}
      dragSnapToOrigin
      dragElastic={0}
      dragMomentum={false}
      onDragStart={onDragStart}
      onDrag={(e, info) => onDrag?.(e as unknown as PointerEvent, { offset: info.offset })}
      onDragEnd={(e, info) => onDragEnd?.({ point: info.point, event: e as unknown as PointerEvent })}
      whileDrag={{ scale: 1.05, zIndex: 1000 }}
    >
      <div className="card-inner">
        <div className="card-face">
          <div className="card-corner card-corner-top" style={{ fontSize }}>
            <span className="card-rank">{rank}</span>
            <span className="card-suit-small">{suit}</span>
          </div>
          {card.rank >= 11 ? (
            <FaceCard rank={card.rank as 11 | 12 | 13} suit={card.suit} width={width} height={height} />
          ) : (
            <div className="card-pips">
              {PIP_LAYOUTS[card.rank]?.map((pip, i) => (
                <span
                  key={i}
                  className={`pip${pip.inverted ? ' pip-inverted' : ''}${pip.large ? ' pip-large' : ''}`}
                  style={{
                    left: `${pip.x}%`,
                    top: `${pip.y}%`,
                    fontSize: pip.large ? width * 0.38 : width * 0.22,
                  }}
                >
                  {suit}
                </span>
              ))}
            </div>
          )}
          <div className="card-corner card-corner-bottom" style={{ fontSize }}>
            <span className="card-rank">{rank}</span>
            <span className="card-suit-small">{suit}</span>
          </div>
        </div>
        <div className="card-back" />
      </div>
    </motion.div>
  );
}

interface CardPlaceholderProps {
  width: number;
  height: number;
  label?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function CardPlaceholder({ width, height, label, style, onClick }: CardPlaceholderProps) {
  return (
    <div
      className="card-placeholder"
      style={{ width, height, ...style }}
      onClick={onClick}
    >
      {label && <div className="card-placeholder-label">{label}</div>}
    </div>
  );
}
