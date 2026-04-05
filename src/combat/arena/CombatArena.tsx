import { Canvas } from '@react-three/fiber';
import { useCombatStore } from '../../game/combatStore';
import MonsterModel from './MonsterModel';
import ArenaLighting from './ArenaLighting';
import './CombatArena.css';

export default function CombatArena() {
  const monsterId = useCombatStore(s => s.monsterId);
  const isActive = useCombatStore(s => s.isActive);

  if (!isActive) return null;

  return (
    <div className="combat-arena">
      <Canvas
        camera={{ position: [0, 0.8, 4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ArenaLighting />
        <MonsterModel monsterId={monsterId} />
      </Canvas>
    </div>
  );
}
