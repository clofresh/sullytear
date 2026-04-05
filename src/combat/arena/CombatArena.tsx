import { Canvas } from '@react-three/fiber';
import { useCombatStore } from '../../game/combatStore';
import MonsterModel from './MonsterModel';
import HeroModel from './HeroModel';
import ArenaLighting from './ArenaLighting';
import './CombatArena.css';

export default function CombatArena() {
  const monsterId = useCombatStore(s => s.monsterId);
  const isActive = useCombatStore(s => s.isActive);

  if (!isActive) return null;

  return (
    <div className="combat-arena">
      <Canvas
        camera={{ position: [0, 0.8, 5], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ArenaLighting />
        {/* Hero on the left, rotated to face right (+X) */}
        <group position={[-1.5, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <HeroModel />
        </group>
        {/* Monster on the right, rotated to face left (-X) */}
        <group position={[1.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <MonsterModel monsterId={monsterId} />
        </group>
      </Canvas>
    </div>
  );
}
