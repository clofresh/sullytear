import { motion } from 'framer-motion';
import DragonSprite from './sprites/DragonSprite';
import SlimeSprite from './sprites/SlimeSprite';
import GoblinSprite from './sprites/GoblinSprite';
import SkeletonSprite from './sprites/SkeletonSprite';
import WerewolfSprite from './sprites/WerewolfSprite';
import LichSprite from './sprites/LichSprite';

const SPRITE_MAP: Record<string, React.ComponentType<{ poisoned: boolean }>> = {
  dragon: DragonSprite,
  slime: SlimeSprite,
  goblin: GoblinSprite,
  skeleton: SkeletonSprite,
  werewolf: WerewolfSprite,
  lich: LichSprite,
};

interface MonsterSpriteProps {
  shake: boolean;
  poisoned: boolean;
  monsterId?: string;
}

export default function MonsterSprite({ shake, poisoned, monsterId = 'dragon' }: MonsterSpriteProps) {
  const SpriteComponent = SPRITE_MAP[monsterId] ?? DragonSprite;

  return (
    <motion.div
      className="combat-sprite monster-sprite"
      animate={
        shake
          ? { x: [0, 6, -6, 4, -4, 2, -2, 0] }
          : { x: 0 }
      }
      transition={{ duration: 0.4 }}
      style={{
        boxShadow: poisoned
          ? '0 0 12px 4px rgba(120, 50, 180, 0.5), inset 0 0 8px rgba(120, 50, 180, 0.3)'
          : undefined,
        borderColor: poisoned ? '#8a44bb' : undefined,
      }}
    >
      <SpriteComponent poisoned={poisoned} />
    </motion.div>
  );
}
