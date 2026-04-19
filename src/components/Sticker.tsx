import { STICKER_REGISTRY } from '../game/stickers/registry';
import type { StickerDefId, StickerTarget } from '../game/stickers/types';
import './Sticker.css';

export type StickerSize = 'pip' | 'badge' | 'card';

interface StickerProps {
  defId: StickerDefId;
  instanceId: string;
  size?: StickerSize;
  onClick?: () => void;
  title?: string;
}

const SIZE_PX: Record<StickerSize, number> = { pip: 20, badge: 32, card: 140 };

const KIND_COLOR: Record<StickerTarget['kind'], string> = {
  card: '#f2e6c4',    // parchment cream
  pile: '#5a6b8c',    // slate blue
  hero: '#c0392b',    // warm red
  monster: '#6b8e23', // sickly green
  charge: '#d4a017',  // gold
};

const KIND_TEXT: Record<StickerTarget['kind'], string> = {
  card: '#3a2f15',
  pile: '#f6f6f6',
  hero: '#fff4ef',
  monster: '#f4f7e6',
  charge: '#2a1f05',
};

const GLYPH: Record<StickerDefId, string> = {
  sharpened: '\u2694',   // crossed swords
  volatile: '\u26A1',    // lightning
  forge: '\u2692',       // hammer
  vampire: '\u2665',     // heart
  frostbitten: '\u2744', // snowflake
  surge: '\u2605',       // star
};

/** Deterministic hash → ±4° rotation. */
function hashRotation(instanceId: string): number {
  let h = 0;
  for (let i = 0; i < instanceId.length; i++) {
    h = (h * 31 + instanceId.charCodeAt(i)) | 0;
  }
  const mod = ((h % 80) + 80) % 80; // 0..79
  return (mod - 40) / 10; // -4.0 .. 3.9
}

export default function Sticker({
  defId,
  instanceId,
  size = 'badge',
  onClick,
  title,
}: StickerProps) {
  const def = STICKER_REGISTRY[defId];
  const kind = def.validTargetKinds[0];
  const bg = KIND_COLOR[kind];
  const fg = KIND_TEXT[kind];
  const px = SIZE_PX[size];
  const rotation = hashRotation(instanceId);
  const showText = size !== 'pip';
  const glyph = GLYPH[defId] ?? '*';

  // SVG internal coordinate space
  const vb = 100;
  const pad = 8;

  return (
    <div
      className={`sticker sticker-${size} sticker-kind-${kind}`}
      style={{
        width: px,
        height: px,
        transform: `rotate(${rotation}deg)`,
      }}
      onClick={onClick}
      title={title ?? def.name}
      role={onClick ? 'button' : undefined}
    >
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${vb} ${vb}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))' }}
      >
        <rect
          x={pad}
          y={pad}
          width={vb - pad * 2}
          height={vb - pad * 2}
          rx={14}
          ry={14}
          fill={bg}
          stroke="rgba(0,0,0,0.35)"
          strokeWidth={2}
        />
        <text
          x={vb / 2}
          y={showText ? vb * 0.48 : vb * 0.62}
          textAnchor="middle"
          fontSize={showText ? vb * 0.42 : vb * 0.6}
          fill={fg}
          fontFamily="serif"
          fontWeight="bold"
        >
          {glyph}
        </text>
        {showText && (
          <text
            x={vb / 2}
            y={vb * 0.82}
            textAnchor="middle"
            fontSize={vb * 0.18}
            fill={fg}
            fontFamily="sans-serif"
            fontWeight="bold"
            letterSpacing="1"
          >
            {def.tag}
          </text>
        )}
      </svg>
    </div>
  );
}
