import { motion } from 'framer-motion';

interface Props {
  poisoned: boolean;
}

export default function GoblinSprite({ poisoned }: Props) {
  return (
    <svg viewBox="0 0 64 64" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="32" cy="44" rx="12" ry="14" fill="#5a8a3a" stroke="#3d6b24" strokeWidth="1" />

      {/* Head */}
      <circle cx="32" cy="24" r="11" fill="#6b9b4a" stroke="#3d6b24" strokeWidth="1" />

      {/* Pointy ears */}
      <path d="M21 22 L10 14 L20 26" fill="#6b9b4a" stroke="#3d6b24" strokeWidth="0.8" />
      <path d="M43 22 L54 14 L44 26" fill="#6b9b4a" stroke="#3d6b24" strokeWidth="0.8" />

      {/* Eyes */}
      <ellipse cx="27" cy="23" rx="3" ry="2.5" fill="#FFD700" />
      <ellipse cx="37" cy="23" rx="3" ry="2.5" fill="#FFD700" />
      <ellipse cx="27" cy="23" rx="1.2" ry="2" fill="#1a1a1a" />
      <ellipse cx="37" cy="23" rx="1.2" ry="2" fill="#1a1a1a" />

      {/* Nose */}
      <circle cx="32" cy="27" r="2" fill="#4a7a2a" />

      {/* Mouth with fangs */}
      <path d="M27 31 Q32 34 37 31" stroke="#3d6b24" strokeWidth="1" fill="none" />
      <polygon points="29,31 30,34 31,31" fill="#fff" />
      <polygon points="33,31 34,34 35,31" fill="#fff" />

      {/* Arms */}
      <line x1="20" y1="40" x2="12" y2="48" stroke="#5a8a3a" strokeWidth="3" strokeLinecap="round" />
      <line x1="44" y1="40" x2="52" y2="48" stroke="#5a8a3a" strokeWidth="3" strokeLinecap="round" />

      {/* Dagger in right hand */}
      <line x1="52" y1="48" x2="56" y2="40" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" />

      {/* Feet */}
      <ellipse cx="26" cy="57" rx="4" ry="2" fill="#4a7a2a" />
      <ellipse cx="38" cy="57" rx="4" ry="2" fill="#4a7a2a" />

      {poisoned && (
        <>
          <motion.circle cx="26" cy="50" r="2" fill="#8a44bb"
            animate={{ cy: [50, 58], opacity: [0.8, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }} />
          <motion.circle cx="38" cy="48" r="1.5" fill="#aa55dd"
            animate={{ cy: [48, 56], opacity: [0.7, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
        </>
      )}
    </svg>
  );
}
