import { motion } from 'framer-motion';

interface Props {
  poisoned: boolean;
}

export default function LichSprite({ poisoned }: Props) {
  return (
    <svg viewBox="0 0 64 64" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Robe */}
      <path d="M18 30 L14 58 L50 58 L46 30 Z" fill="#3a1a5a" stroke="#5522aa" strokeWidth="1" />
      <path d="M20 30 L32 56 L44 30" fill="#2a1040" opacity="0.4" />

      {/* Hood */}
      <path d="M20 30 Q20 14 32 12 Q44 14 44 30 Z" fill="#3a1a5a" stroke="#5522aa" strokeWidth="1" />

      {/* Face shadow */}
      <ellipse cx="32" cy="24" rx="8" ry="7" fill="#1a0a2a" />

      {/* Glowing eyes */}
      <motion.circle cx="28" cy="23" r="2.5" fill="#aa44ff"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }} />
      <motion.circle cx="36" cy="23" r="2.5" fill="#aa44ff"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }} />
      <circle cx="28" cy="23" r="1" fill="#fff" opacity="0.8" />
      <circle cx="36" cy="23" r="1" fill="#fff" opacity="0.8" />

      {/* Staff */}
      <line x1="50" y1="18" x2="50" y2="58" stroke="#666" strokeWidth="2" strokeLinecap="round" />
      {/* Staff orb */}
      <motion.circle cx="50" cy="16" r="4" fill="#7733cc" stroke="#aa55ff" strokeWidth="1"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity }} />
      <circle cx="49" cy="15" r="1.5" fill="#cc88ff" opacity="0.5" />

      {/* Skeletal hands */}
      <line x1="20" y1="40" x2="14" y2="44" stroke="#d0c8b8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="44" x2="12" y2="42" stroke="#d0c8b8" strokeWidth="1" strokeLinecap="round" />
      <line x1="14" y1="44" x2="11" y2="45" stroke="#d0c8b8" strokeWidth="1" strokeLinecap="round" />
      <line x1="44" y1="38" x2="50" y2="34" stroke="#d0c8b8" strokeWidth="1.5" strokeLinecap="round" />

      {poisoned && (
        <>
          <motion.circle cx="26" cy="52" r="2" fill="#8a44bb"
            animate={{ cy: [52, 60], opacity: [0.8, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }} />
          <motion.circle cx="38" cy="50" r="1.5" fill="#aa55dd"
            animate={{ cy: [50, 58], opacity: [0.7, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
        </>
      )}
    </svg>
  );
}
