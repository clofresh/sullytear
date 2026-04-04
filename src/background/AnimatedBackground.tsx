import { Canvas } from '@react-three/fiber';
import Particles from './Particles';
import BurstParticles from './BurstParticles';
import BackgroundGradient from './BackgroundGradient';
import { useCombatEffects } from './useCombatEffects';

function Scene() {
  const { effectQueue, combatState } = useCombatEffects();

  return (
    <>
      <BackgroundGradient combatState={combatState} />
      <Particles combatState={combatState} />
      <BurstParticles effectQueue={effectQueue} />
    </>
  );
}

export default function AnimatedBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        background: '#0d2818',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: false, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
