import PoisonDrips from './PoisonDrips';

interface Props {
  poisoned: boolean;
}

export default function DragonSprite({ poisoned }: Props) {
  return (
    <svg viewBox="0 0 64 64" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Dragon body */}
      <ellipse cx="32" cy="38" rx="18" ry="14" fill="#8B2500" stroke="#cc4400" strokeWidth="1" />

      {/* Wings */}
      <path d="M14 30 Q4 16 10 10 Q16 18 20 26 Z" fill="#6a1a00" stroke="#cc4400" strokeWidth="1" />
      <path d="M50 30 Q60 16 54 10 Q48 18 44 26 Z" fill="#6a1a00" stroke="#cc4400" strokeWidth="1" />

      {/* Head */}
      <ellipse cx="32" cy="22" rx="10" ry="8" fill="#9B3000" stroke="#cc4400" strokeWidth="1" />

      {/* Horns */}
      <path d="M24 18 L18 8 L26 16" fill="#5a1a00" stroke="#cc4400" strokeWidth="0.8" />
      <path d="M40 18 L46 8 L38 16" fill="#5a1a00" stroke="#cc4400" strokeWidth="0.8" />

      {/* Eyes */}
      <ellipse cx="28" cy="21" rx="2.5" ry="2" fill="#FFD700" />
      <ellipse cx="36" cy="21" rx="2.5" ry="2" fill="#FFD700" />
      <ellipse cx="28" cy="21" rx="1" ry="1.8" fill="#1a1a1a" />
      <ellipse cx="36" cy="21" rx="1" ry="1.8" fill="#1a1a1a" />

      {/* Mouth / Fangs */}
      <path d="M27 27 Q32 31 37 27" stroke="#cc4400" strokeWidth="1" fill="none" />
      <polygon points="29,27 30,31 31,27" fill="#fff" />
      <polygon points="33,27 34,31 35,27" fill="#fff" />

      {/* Fire breath hint */}
      <circle cx="32" cy="32" r="1.5" fill="#FF6600" opacity="0.7" />
      <circle cx="30" cy="33" r="1" fill="#FFD700" opacity="0.5" />
      <circle cx="34" cy="33" r="1" fill="#FFD700" opacity="0.5" />

      {/* Belly scales */}
      <path d="M24 38 Q28 36 32 38 Q36 36 40 38" stroke="#cc6633" strokeWidth="0.8" fill="none" />
      <path d="M26 42 Q30 40 34 42 Q38 40 42 42" stroke="#cc6633" strokeWidth="0.8" fill="none" />

      {/* Tail */}
      <path d="M50 38 Q56 42 58 36 Q60 32 56 34" fill="#8B2500" stroke="#cc4400" strokeWidth="1" />
      <polygon points="56,34 60,30 58,36" fill="#cc4400" />

      {/* Claws */}
      <line x1="22" y1="50" x2="18" y2="56" stroke="#cc4400" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="50" x2="24" y2="56" stroke="#cc4400" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="38" y1="50" x2="40" y2="56" stroke="#cc4400" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="42" y1="50" x2="46" y2="56" stroke="#cc4400" strokeWidth="1.5" strokeLinecap="round" />

      <PoisonDrips
        poisoned={poisoned}
        drips={[
          { cx: 26, cy: 48, r: 2, duration: 1.2 },
          { cx: 38, cy: 46, r: 1.5, duration: 1, opacity: 0.7 },
          { cx: 32, cy: 50, r: 1.8, duration: 1.1 },
        ]}
      />
    </svg>
  );
}
