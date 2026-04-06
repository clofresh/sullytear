import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCombatStore } from '../../game/combatStore';
import MonsterModel from './MonsterModel';
import HeroModel from './HeroModel';
import ArenaLighting from './ArenaLighting';
import { portraitPositions } from '../../game/portraitPositions';
import './CombatArena.css';

const HERO_POS: [number, number, number] = [-1.5, 0, 0];
const MONSTER_POS: [number, number, number] = [1.5, 0, 0];

/** Projects 3D arena positions to normalized screen coords for BurstParticles */
function PositionTracker() {
  const heroVec = useRef(new THREE.Vector3(...HERO_POS));
  const monsterVec = useRef(new THREE.Vector3(...MONSTER_POS));
  const { camera, gl } = useThree();

  useFrame(() => {
    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();

    // Project hero position to screen
    const hProj = heroVec.current.clone().project(camera);
    portraitPositions.hero.x = ((hProj.x + 1) / 2 * rect.width + rect.left) / window.innerWidth;
    portraitPositions.hero.y = ((-hProj.y + 1) / 2 * rect.height + rect.top) / window.innerHeight;

    // Project monster position to screen
    const mProj = monsterVec.current.clone().project(camera);
    portraitPositions.monster.x = ((mProj.x + 1) / 2 * rect.width + rect.left) / window.innerWidth;
    portraitPositions.monster.y = ((-mProj.y + 1) / 2 * rect.height + rect.top) / window.innerHeight;
  });

  return null;
}

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
        <PositionTracker />
        {/* Hero on the left, rotated to face right (+X) */}
        <group position={HERO_POS} rotation={[0, Math.PI / 2, 0]}>
          <HeroModel />
        </group>
        {/* Monster on the right, rotated to face left (-X) */}
        <group position={MONSTER_POS} rotation={[0, -Math.PI / 2, 0]}>
          <MonsterModel monsterId={monsterId} />
        </group>
      </Canvas>
    </div>
  );
}
