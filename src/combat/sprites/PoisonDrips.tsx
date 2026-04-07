import { motion } from 'framer-motion';

export interface DripConfig {
  cx: number;
  cy: number;
  r: number;
  /** Fall distance in viewBox units. Defaults to 8. */
  fall?: number;
  /** Animation duration in seconds. Defaults to 1.2. */
  duration?: number;
  /** Stagger delay in seconds. Defaults to drip index × 0.4. */
  delay?: number;
  /** Override fill color (default cycles purple). */
  fill?: string;
  /** Starting opacity (default 0.8). */
  opacity?: number;
}

const DEFAULT_FILLS = ['#8a44bb', '#aa55dd', '#9944cc'];

interface Props {
  poisoned: boolean;
  drips: DripConfig[];
}

/**
 * Shared poison-drip animation used by every monster sprite. Each drip is
 * a purple circle that falls and fades, looping forever. Per-monster the
 * positions/sizes/timing differ slightly (the drips visually attach to the
 * monster's body) — pass them via the `drips` prop. Renders nothing when
 * `poisoned` is false.
 */
export default function PoisonDrips({ poisoned, drips }: Props) {
  if (!poisoned) return null;
  return (
    <>
      {drips.map((d, i) => {
        const fall = d.fall ?? 8;
        const duration = d.duration ?? 1.2;
        const delay = d.delay ?? i * 0.4;
        const fill = d.fill ?? DEFAULT_FILLS[i % DEFAULT_FILLS.length];
        const opacity = d.opacity ?? 0.8;
        return (
          <motion.circle
            key={i}
            cx={d.cx}
            cy={d.cy}
            r={d.r}
            fill={fill}
            animate={{ cy: [d.cy, d.cy + fall], opacity: [opacity, 0] }}
            transition={{ duration, repeat: Infinity, delay }}
          />
        );
      })}
    </>
  );
}
