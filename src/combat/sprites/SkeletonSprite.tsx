import PoisonDrips from './PoisonDrips';

interface Props {
  poisoned: boolean;
}

export default function SkeletonSprite({ poisoned }: Props) {
  return (
    <svg viewBox="0 0 64 64" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Skull */}
      <circle cx="32" cy="18" r="10" fill="#e8e0d0" stroke="#a09080" strokeWidth="1" />

      {/* Eye sockets */}
      <ellipse cx="27" cy="17" rx="3" ry="3.5" fill="#2a1a1a" />
      <ellipse cx="37" cy="17" rx="3" ry="3.5" fill="#2a1a1a" />
      {/* Eye glow */}
      <circle cx="27" cy="17" r="1" fill="#ff4444" opacity="0.8" />
      <circle cx="37" cy="17" r="1" fill="#ff4444" opacity="0.8" />

      {/* Nose hole */}
      <polygon points="31,22 33,22 32,24" fill="#2a1a1a" />

      {/* Jaw */}
      <path d="M24 25 Q32 30 40 25" stroke="#a09080" strokeWidth="1" fill="none" />
      <line x1="28" y1="26" x2="28" y2="28" stroke="#a09080" strokeWidth="0.8" />
      <line x1="32" y1="27" x2="32" y2="29" stroke="#a09080" strokeWidth="0.8" />
      <line x1="36" y1="26" x2="36" y2="28" stroke="#a09080" strokeWidth="0.8" />

      {/* Spine */}
      <line x1="32" y1="28" x2="32" y2="48" stroke="#d0c8b8" strokeWidth="2.5" strokeLinecap="round" />

      {/* Ribs */}
      <path d="M26 34 Q32 32 38 34" stroke="#d0c8b8" strokeWidth="1.5" fill="none" />
      <path d="M27 38 Q32 36 37 38" stroke="#d0c8b8" strokeWidth="1.5" fill="none" />
      <path d="M28 42 Q32 40 36 42" stroke="#d0c8b8" strokeWidth="1.5" fill="none" />

      {/* Arms */}
      <line x1="26" y1="34" x2="16" y2="44" stroke="#d0c8b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="34" x2="48" y2="44" stroke="#d0c8b8" strokeWidth="2" strokeLinecap="round" />

      {/* Sword */}
      <line x1="48" y1="44" x2="54" y2="32" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
      <line x1="46" y1="44" x2="50" y2="44" stroke="#aa8844" strokeWidth="2" strokeLinecap="round" />

      {/* Legs */}
      <line x1="32" y1="48" x2="24" y2="60" stroke="#d0c8b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="48" x2="40" y2="60" stroke="#d0c8b8" strokeWidth="2" strokeLinecap="round" />

      <PoisonDrips
        poisoned={poisoned}
        drips={[
          { cx: 26, cy: 50, r: 2, duration: 1.2 },
          { cx: 38, cy: 48, r: 1.5, duration: 1, opacity: 0.7 },
        ]}
      />
    </svg>
  );
}
