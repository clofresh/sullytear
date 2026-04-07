import { Canvas } from '@react-three/fiber';
import DebugArena from './DebugArena';

export default function DebugPage() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111', position: 'relative' }}>
      <Canvas camera={{ position: [0, 2, 10], fov: 50 }}>
        <DebugArena />
      </Canvas>
      <div style={{ 
        position: 'absolute', 
        top: 20, 
        left: 20, 
        color: 'white', 
        fontFamily: 'sans-serif', 
        pointerEvents: 'none',
        textShadow: '1px 1px 2px black'
      }}>
        <h1 style={{ margin: 0 }}>Monster Debug View</h1>
        <p style={{ margin: '0 0 0 5px' }}>Orbit: Left-click | Pan: Right-click | Zoom: Scroll</p>
        <p style={{ margin: '0 0 0 5px' }}>Change URL or remove hash to return to game</p>
      </div>
    </div>
  );
}
