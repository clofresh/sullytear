import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CombatVisualState } from './useCombatEffects';

const vertexShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform vec3 uTopColor;
  uniform vec3 uBottomColor;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float t = vUv.y;
    // Subtle organic distortion
    t += sin(uTime * 0.3 + vUv.x * 3.0) * 0.02;
    t += sin(uTime * 0.2 + vUv.y * 2.0) * 0.01;
    vec3 color = mix(uBottomColor, uTopColor, clamp(t, 0.0, 1.0));
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Color targets for each state
const COLORS = {
  normal:   { top: new THREE.Color('#0d2818'), bottom: new THREE.Color('#1a472a') },
  lowHp:    { top: new THREE.Color('#2d0d0d'), bottom: new THREE.Color('#4a1a1a') },
  poison:   { top: new THREE.Color('#1a0d28'), bottom: new THREE.Color('#2a1a3a') },
  empower:  { top: new THREE.Color('#28200d'), bottom: new THREE.Color('#3a2a1a') },
  victory:  { top: new THREE.Color('#28250d'), bottom: new THREE.Color('#4a3a1a') },
  defeat:   { top: new THREE.Color('#2d0808'), bottom: new THREE.Color('#1a0505') },
};

interface Props {
  combatState: React.RefObject<CombatVisualState>;
}

export default function BackgroundGradient({ combatState }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTopColor: { value: COLORS.normal.top.clone() },
    uBottomColor: { value: COLORS.normal.bottom.clone() },
    uTime: { value: 0 },
  }), []);

  // Reusable target colors to avoid allocations
  const targetTop = useMemo(() => COLORS.normal.top.clone(), []);
  const targetBottom = useMemo(() => COLORS.normal.bottom.clone(), []);

  useFrame((_, delta) => {
    if (!matRef.current) return;
    const mat = matRef.current;
    mat.uniforms.uTime.value += delta;

    const cs = combatState.current;
    if (!cs) return;

    // Determine target colors based on combat state priority
    if (cs.combatResult === 'victory' || cs.isWon) {
      targetTop.copy(COLORS.victory.top);
      targetBottom.copy(COLORS.victory.bottom);
    } else if (cs.combatResult === 'defeat') {
      targetTop.copy(COLORS.defeat.top);
      targetBottom.copy(COLORS.defeat.bottom);
    } else if (cs.empowered) {
      targetTop.copy(COLORS.empower.top);
      targetBottom.copy(COLORS.empower.bottom);
    } else if (cs.poisonActive) {
      targetTop.copy(COLORS.poison.top);
      targetBottom.copy(COLORS.poison.bottom);
    } else if (cs.hpRatio < 0.3) {
      targetTop.copy(COLORS.lowHp.top);
      targetBottom.copy(COLORS.lowHp.bottom);
    } else {
      targetTop.copy(COLORS.normal.top);
      targetBottom.copy(COLORS.normal.bottom);
    }

    // Smooth lerp toward target
    const lerpRate = 1 - Math.pow(0.05, delta); // ~2.0 * delta equivalent, framerate-independent
    mat.uniforms.uTopColor.value.lerp(targetTop, lerpRate);
    mat.uniforms.uBottomColor.value.lerp(targetBottom, lerpRate);
  });

  return (
    <mesh position={[0, 0, -5]}>
      <planeGeometry args={[40, 40]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  );
}
