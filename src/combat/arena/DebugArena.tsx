import { OrbitControls, Grid } from '@react-three/drei';
import { MODEL_MAP } from './MonsterModel';
import MonsterModel from './MonsterModel';
import ArenaLighting from './ArenaLighting';

const SPACING = 4;

export default function DebugArena() {
  const monsterIds = Object.keys(MODEL_MAP);
  
  return (
    <>
      <ArenaLighting />
      <OrbitControls makeDefault />
      <Grid infiniteGrid />
      
      {monsterIds.map((id, index) => (
        <group key={id} position={[index * SPACING, 0, 0]}>
          <MonsterModel monsterId={id} />
        </group>
      ))}
    </>
  );
}
