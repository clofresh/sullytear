export default function ArenaLighting() {
  return (
    <>
      {/* Key light — warm from above, centered for both characters */}
      <directionalLight position={[0, 5, 3]} intensity={1.2} color="#ffe8cc" />
      {/* Fill light — cool from left */}
      <directionalLight position={[-2, 2, 1]} intensity={0.4} color="#aaccff" />
      {/* Rim light — from behind for silhouette */}
      <directionalLight position={[0, 1, -3]} intensity={0.6} color="#ffccaa" />
      {/* Ambient — keep shadows from going pure black */}
      <ambientLight intensity={0.25} color="#8899aa" />
    </>
  );
}
