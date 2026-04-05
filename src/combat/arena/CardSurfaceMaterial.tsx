import { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Custom shader material that renders mesh surfaces as a lattice of
 * tiny rotating playing cards with gaps between them.
 */

const cardVertexShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cardFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3 uColor;
  uniform vec3 uEmissive;
  uniform float uEmissiveIntensity;
  uniform float uTime;
  uniform float uCardDensity;   // cards per UV unit
  uniform float uGapSize;       // gap between cards (0-1)
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;

  // SDF for rounded rectangle
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  // Simple hash for per-card randomness
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Heart SDF
  float sdHeart(vec2 p) {
    p.y -= 0.25;
    p.x = abs(p.x);
    float a = atan(p.x, p.y) / 3.14159;
    float r = length(p);
    return r - 0.45 * (1.0 + clamp(a, 0.0, 1.0) * 0.3);
  }

  // Diamond SDF
  float sdDiamond(vec2 p) {
    return (abs(p.x) + abs(p.y) - 0.4) * 0.707;
  }

  // Club SDF
  float sdClub(vec2 p) {
    float d1 = length(p - vec2(-0.12, 0.08)) - 0.14;
    float d2 = length(p - vec2(0.12, 0.08)) - 0.14;
    float d3 = length(p - vec2(0.0, 0.24)) - 0.14;
    float stem = sdRoundedBox(p - vec2(0.0, -0.08), vec2(0.04, 0.14), 0.02);
    return min(min(d1, d2), min(d3, stem));
  }

  // Spade SDF
  float sdSpade(vec2 p) {
    vec2 hp = vec2(p.x, -p.y + 0.45);
    hp.x = abs(hp.x);
    float a = atan(hp.x, hp.y) / 3.14159;
    float r = length(hp);
    float heart = r - 0.38 * (1.0 + clamp(a, 0.0, 1.0) * 0.3);
    float stem = sdRoundedBox(p - vec2(0.0, -0.08), vec2(0.03, 0.16), 0.02);
    return min(heart, stem);
  }

  float getSuitSDF(vec2 p, float suit) {
    if (suit < 0.5) return sdHeart(p);
    if (suit < 1.5) return sdDiamond(p);
    if (suit < 2.5) return sdClub(p);
    return sdSpade(p);
  }

  // 2D rotation matrix
  mat2 rot2(float a) {
    float c = cos(a); float s = sin(a);
    return mat2(c, -s, s, c);
  }

  void main() {
    // Tile UVs into card grid
    vec2 gridUv = vUv * uCardDensity;
    vec2 cellId = floor(gridUv);
    vec2 cellUv = fract(gridUv);

    // Per-card random values
    float r1 = hash(cellId);
    float r2 = hash(cellId + 73.0);
    float r3 = hash(cellId + 137.0);

    // Card-local coords centered at cell middle
    vec2 cardP = cellUv - 0.5;

    // Per-card slow rotation
    float rotAngle = (r1 - 0.5) * 0.4 + sin(uTime * (0.3 + r2 * 0.5) + r1 * 6.28) * 0.12;
    cardP = rot2(rotAngle) * cardP;

    // Card shape — rounded rect with gap
    float cardAspect = 0.7;  // width/height ratio of a playing card
    vec2 cardSize = vec2(0.5 - uGapSize, (0.5 - uGapSize) / cardAspect);
    // Clamp cardSize so it doesn't go negative on large gaps
    cardSize = max(cardSize, vec2(0.1));
    float cardDist = sdRoundedBox(cardP, cardSize, 0.06);
    float cardMask = 1.0 - smoothstep(-0.01, 0.01, cardDist);

    if (cardMask < 0.01) discard;

    // Basic lighting
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
    float NdotL = max(dot(vNormal, lightDir), 0.0);
    float ambient = 0.35;
    float diffuse = NdotL * 0.6;

    // Rim light
    float rim = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.0) * 0.3;

    float lighting = ambient + diffuse + rim;

    // Determine suit (from random)
    float suit = floor(r1 * 4.0);

    // Card face rendering
    // Base: off-white card
    vec3 cardFace = vec3(0.92, 0.90, 0.86);

    // Border
    float borderDist = sdRoundedBox(cardP, cardSize - 0.03, 0.04);
    float borderLine = smoothstep(-0.015, -0.005, borderDist) * (1.0 - smoothstep(-0.005, 0.005, borderDist));

    // Suit symbol
    vec2 suitP = cardP * 2.8;
    float suitDist = getSuitSDF(suitP, suit);
    float suitMask = 1.0 - smoothstep(-0.02, 0.02, suitDist);

    // Red for hearts/diamonds, dark for clubs/spades
    vec3 suitColor = suit < 1.5 ? vec3(0.8, 0.1, 0.1) : vec3(0.15, 0.15, 0.15);

    // Compose card face
    vec3 faceColor = cardFace;
    faceColor = mix(faceColor, vec3(0.65, 0.6, 0.55), borderLine * 0.5);
    faceColor = mix(faceColor, suitColor, suitMask);

    // Tint the whole card with the monster's color
    vec3 tintedColor = mix(faceColor, uColor, 0.35);

    // Slight per-card brightness variation
    float cardBrightness = 0.85 + r3 * 0.3;

    // Final color with lighting
    vec3 finalColor = tintedColor * lighting * cardBrightness;

    // Add emissive
    finalColor += uEmissive * uEmissiveIntensity;

    // Edge darkening on card for depth
    float edgeDark = smoothstep(0.0, 0.08, -cardDist);
    finalColor *= mix(0.7, 1.0, edgeDark);

    gl_FragColor = vec4(finalColor, cardMask * uOpacity);
  }
`;

interface CardSurfaceMaterialProps {
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  cardDensity?: number;
  gapSize?: number;
  opacity?: number;
  transparent?: boolean;
  side?: THREE.Side;
}

const CardSurfaceMaterial = forwardRef<THREE.ShaderMaterial, CardSurfaceMaterialProps>(function CardSurfaceMaterial({
  color = '#ffffff',
  emissive = '#000000',
  emissiveIntensity = 0,
  cardDensity = 12,
  gapSize = 0.08,
  opacity = 1.0,
  transparent = false,
  side = THREE.FrontSide,
}, ref) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  useImperativeHandle(ref, () => matRef.current);

  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(color) },
    uEmissive: { value: new THREE.Color(emissive) },
    uEmissiveIntensity: { value: emissiveIntensity },
    uTime: { value: 0 },
    uCardDensity: { value: cardDensity },
    uGapSize: { value: gapSize },
    uOpacity: { value: opacity },
  }), [color, emissive, emissiveIntensity, cardDensity, gapSize, opacity]);

  useFrame((_, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <shaderMaterial
      ref={matRef}
      vertexShader={cardVertexShader}
      fragmentShader={cardFragmentShader}
      uniforms={uniforms}
      transparent={transparent || opacity < 1}
      side={side}
      depthWrite={opacity >= 1}
    />
  );
});

export default CardSurfaceMaterial;
