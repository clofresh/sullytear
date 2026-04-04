import { motion } from 'framer-motion';

interface HealthBarProps {
  current: number;
  max: number;
  side: 'left' | 'right';
}

function getBarColor(ratio: number): string {
  if (ratio > 0.6) return '#4a8a4a';
  if (ratio > 0.3) return '#c4a832';
  return '#cc3333';
}

export default function HealthBar({ current, max, side }: HealthBarProps) {
  const ratio = Math.max(0, current / max);
  const color = getBarColor(ratio);

  return (
    <div className="health-bar-container" style={{ direction: side === 'right' ? 'rtl' : 'ltr' }}>
      <div className="health-bar-track">
        <motion.div
          className="health-bar-fill"
          animate={{ width: `${ratio * 100}%`, backgroundColor: color }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
      <div className="health-bar-text" style={{ direction: 'ltr' }}>
        {current}/{max}
      </div>
    </div>
  );
}
