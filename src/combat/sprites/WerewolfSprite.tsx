import PoisonDrips from './PoisonDrips';

interface Props {
  poisoned: boolean;
}

export default function WerewolfSprite({ poisoned }: Props) {
  return (
    <svg viewBox="0 0 64 64" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="32" cy="42" rx="16" ry="14" fill="#4a4a5a" stroke="#333344" strokeWidth="1" />

      {/* Head */}
      <ellipse cx="32" cy="22" rx="11" ry="10" fill="#555566" stroke="#333344" strokeWidth="1" />

      {/* Ears */}
      <polygon points="22,18 16,6 24,14" fill="#555566" stroke="#333344" strokeWidth="0.8" />
      <polygon points="42,18 48,6 40,14" fill="#555566" stroke="#333344" strokeWidth="0.8" />
      <polygon points="22,18 18,8 24,14" fill="#775566" strokeWidth="0" />
      <polygon points="42,18 46,8 40,14" fill="#775566" strokeWidth="0" />

      {/* Snout */}
      <ellipse cx="32" cy="27" rx="6" ry="4" fill="#666677" />
      <ellipse cx="32" cy="25" rx="3" ry="2" fill="#222" />

      {/* Eyes */}
      <ellipse cx="26" cy="20" rx="2.5" ry="2" fill="#FFD700" />
      <ellipse cx="38" cy="20" rx="2.5" ry="2" fill="#FFD700" />
      <ellipse cx="26" cy="20" rx="1" ry="1.8" fill="#1a1a1a" />
      <ellipse cx="38" cy="20" rx="1" ry="1.8" fill="#1a1a1a" />

      {/* Fangs */}
      <polygon points="28,29 29,33 30,29" fill="#fff" />
      <polygon points="34,29 35,33 36,29" fill="#fff" />

      {/* Fur tufts */}
      <path d="M18 36 Q14 32 16 28" stroke="#555566" strokeWidth="2" fill="none" />
      <path d="M46 36 Q50 32 48 28" stroke="#555566" strokeWidth="2" fill="none" />

      {/* Claws */}
      <line x1="20" y1="52" x2="16" y2="58" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24" y1="54" x2="22" y2="60" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="54" x2="42" y2="60" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="44" y1="52" x2="48" y2="58" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" />

      {/* Tail */}
      <path d="M48 44 Q56 40 54 34" stroke="#4a4a5a" strokeWidth="3" fill="none" strokeLinecap="round" />

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
