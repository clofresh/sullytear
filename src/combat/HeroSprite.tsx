import { motion } from 'framer-motion';

interface HeroSpriteProps {
  shake: boolean;
  empowered: boolean;
}

export default function HeroSprite({ shake, empowered }: HeroSpriteProps) {
  return (
    <motion.div
      className="combat-sprite hero-sprite"
      animate={
        shake
          ? { x: [0, -6, 6, -4, 4, -2, 2, 0] }
          : { x: 0 }
      }
      transition={{ duration: 0.4 }}
      style={{
        boxShadow: empowered
          ? '0 0 12px 4px rgba(212, 168, 67, 0.6), inset 0 0 8px rgba(212, 168, 67, 0.3)'
          : undefined,
        borderColor: empowered ? '#d4a843' : undefined,
      }}
    >
      <svg viewBox="0 0 64 64" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shield */}
        <path d="M14 28 L14 46 L24 52 L34 46 L34 28 L24 24 Z" fill="#3a6a9a" stroke="#6aafe0" strokeWidth="1.5" />
        <path d="M24 28 L24 48" stroke="#6aafe0" strokeWidth="1" />
        <path d="M17 36 L31 36" stroke="#6aafe0" strokeWidth="1" />

        {/* Sword */}
        <line x1="40" y1="14" x2="40" y2="48" stroke="#c0c0c0" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="34" y1="40" x2="46" y2="40" stroke="#d4a843" strokeWidth="2.5" strokeLinecap="round" />
        <polygon points="40,10 37,16 43,16" fill="#c0c0c0" />
        <rect x="38" y="48" width="4" height="6" rx="1" fill="#8B4513" />

        {/* Helmet */}
        <ellipse cx="40" cy="26" rx="10" ry="8" fill="#7a7a7a" stroke="#555" strokeWidth="1" />
        <rect x="36" y="30" width="8" height="3" rx="1" fill="#333" />
        <path d="M40 18 L40 14" stroke="#d4a843" strokeWidth="2" strokeLinecap="round" />

        {/* Health cross on shield */}
        <rect x="22" y="33" width="4" height="10" rx="1" fill="#cc3333" />
        <rect x="19" y="36" width="10" height="4" rx="1" fill="#cc3333" />

        {/* Empower glow on sword */}
        {empowered && (
          <motion.line
            x1="40" y1="14" x2="40" y2="48"
            stroke="#d4a843"
            strokeWidth="4"
            strokeLinecap="round"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </svg>
    </motion.div>
  );
}
