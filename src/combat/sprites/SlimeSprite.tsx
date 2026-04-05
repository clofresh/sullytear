import { motion } from 'framer-motion';

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

      {poisoned && (
        <>
          <motion.circle cx="24" cy="50" r="2" fill="#8a44bb"
            animate={{ cy: [50, 58], opacity: [0.8, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }} />
          <motion.circle cx="40" cy="48" r="1.5" fill="#aa55dd"
            animate={{ cy: [48, 56], opacity: [0.7, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
        </>
      )}
    </svg>
  );
}
