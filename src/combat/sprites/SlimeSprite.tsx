import PoisonDrips from './PoisonDrips';

interface Props {
  poisoned: boolean;
}

export default function SlimeSprite({ poisoned }: Props) {
  return (
    <svg viewBox="0 0 64 64" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body blob */}
      <ellipse cx="32" cy="42" rx="22" ry="16" fill="#44cc44" stroke="#22aa22" strokeWidth="1.5" />
      <ellipse cx="32" cy="38" rx="18" ry="14" fill="#55dd55" />

      {/* Highlight */}
      <ellipse cx="26" cy="34" rx="5" ry="4" fill="#88ee88" opacity="0.6" />

      {/* Eyes */}
      <ellipse cx="26" cy="38" rx="3" ry="3.5" fill="#fff" />
      <ellipse cx="38" cy="38" rx="3" ry="3.5" fill="#fff" />
      <ellipse cx="26" cy="39" rx="1.5" ry="2" fill="#1a1a1a" />
      <ellipse cx="38" cy="39" rx="1.5" ry="2" fill="#1a1a1a" />

      {/* Mouth */}
      <path d="M28 44 Q32 47 36 44" stroke="#22aa22" strokeWidth="1.2" fill="none" />

      {/* Drip */}
      <ellipse cx="14" cy="54" rx="3" ry="2" fill="#44cc44" opacity="0.5" />
      <ellipse cx="50" cy="55" rx="2.5" ry="1.5" fill="#44cc44" opacity="0.4" />

      <PoisonDrips
        poisoned={poisoned}
        drips={[
          { cx: 24, cy: 50, r: 2, duration: 1.2 },
          { cx: 40, cy: 48, r: 1.5, duration: 1, opacity: 0.7 },
        ]}
      />
    </svg>
  );
}
