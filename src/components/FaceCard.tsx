import { Suit, getColor } from '../game/types';
import { SUIT_SYMBOLS } from '../utils/constants';

interface FaceCardProps {
  rank: 11 | 12 | 13;
  suit: Suit;
  width: number;
  height: number;
}

const LABELS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K' };

// Crown paths for K, tiara for Q, feather cap for J
function CrownIcon({ rank }: { rank: number }) {
  if (rank === 13) {
    // Crown
    return (
      <path
        d="M10 22h20v3H10zm1-2l4-8 5 5 5-5 4 8z"
        fill="currentColor"
        opacity={0.4}
      />
    );
  }
  if (rank === 12) {
    // Tiara
    return (
      <path
        d="M12 22h16v2H12zm2-2c0-4 4-7 6-7s6 3 6 7z"
        fill="currentColor"
        opacity={0.4}
      />
    );
  }
  // Jack - diamond hat
  return (
    <path
      d="M14 24h12l-2-6h-8z M20 14l3 4h-6z"
      fill="currentColor"
      opacity={0.4}
    />
  );
}

export default function FaceCard({ rank, suit, width, height }: FaceCardProps) {
  const color = getColor(suit);
  const fillColor = color === 'red' ? '#cc0000' : '#1a1a1a';
  const bgColor = color === 'red' ? '#fff0f0' : '#f0f0f5';
  const label = LABELS[rank];
  const suitSymbol = SUIT_SYMBOLS[suit];

  // Scale SVG viewBox to fill the center area (between corners)
  const centerHeight = height * 0.7;
  const centerWidth = width * 0.85;

  return (
    <div className="card-face-image" style={{ width: centerWidth, height: centerHeight }}>
      <svg
        viewBox="0 0 40 56"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        {/* Background frame */}
        <rect x="2" y="2" width="36" height="52" rx="3" fill={bgColor} stroke={fillColor} strokeWidth="1" opacity="0.3" />

        {/* Decorative border */}
        <rect x="5" y="5" width="30" height="46" rx="2" fill="none" stroke={fillColor} strokeWidth="0.5" opacity="0.2" />

        {/* Crown/hat icon */}
        <g color={fillColor}>
          <CrownIcon rank={rank} />
        </g>

        {/* Large letter */}
        <text
          x="20"
          y="40"
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fontFamily="Georgia, serif"
          fill={fillColor}
        >
          {label}
        </text>

        {/* Suit symbol */}
        <text
          x="20"
          y="52"
          textAnchor="middle"
          fontSize="8"
          fill={fillColor}
        >
          {suitSymbol}
        </text>
      </svg>
    </div>
  );
}
