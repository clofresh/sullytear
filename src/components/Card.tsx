import { useState } from 'react';
import { motion, type PanInfo } from 'framer-motion';
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
  /** Receives the cumulative pointer offset since drag start. */
  onDrag?: (info: { offset: { x: number; y: number } }) => void;
  /** Receives the final pointer position in viewport (clientX/Y) coordinates. */
  onDragEnd?: (point: { x: number; y: number }) => void;
  zIndex?: number;
}

// framer-motion's `info.point` uses `pageX`/`pageY` (document coordinates),
// but we need viewport (`clientX`/`clientY`) coordinates so callers can feed
// the result into `document.elementsFromPoint`.
function viewportPoint(info: PanInfo): { x: number; y: number } {
  return {
    x: info.point.x - window.scrollX,
    y: info.point.y - window.scrollY,
  };
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
  const [isDragging, setIsDragging] = useState(false);
  const color = getColor(card.suit);
  const rank = getRankLabel(card.rank);
  const suit = SUIT_SYMBOLS[card.suit];
  const fontSize = Math.max(width * 0.22, 10);

  return (
    <motion.div
      className={`card ${color}${isDragging ? ' dragging' : ''}`}
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
      dragTransition={{ bounceStiffness: 400, bounceDamping: 28 }}
      onDragStart={() => { setIsDragging(true); onDragStart?.(); }}
      onDrag={(_event, info) => onDrag?.({ offset: info.offset })}
      onDragEnd={(_event, info) => { setIsDragging(false); onDragEnd?.(viewportPoint(info)); }}
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
