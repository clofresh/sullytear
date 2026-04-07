/**
 * Vertex + fragment shaders for the ambient floating-card background
 * (`Particles.tsx`). Each instance is a textured plane displaying a
 * stylised playing card; the fragment shader computes the suit symbol
 * via SDFs so no textures are needed.
 */

export const cardsVertexShader = /* glsl */ `
  precision highp float;

  attribute vec3 aOffset;      // world position of this card
  attribute vec4 aRotation;    // xyz = euler seed, w = spin speed
  attribute float aSize;       // scale multiplier
  attribute float aSuit;       // 0-3 → suit type
  attribute vec3 aColor;       // base tint per card

  uniform float uTime;
  uniform vec3 uTintColor;
  uniform float uTintStrength;

  varying vec2 vUv;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSuit;
  varying float vFaceDir;

  mat3 rotateXYZ(vec3 angles) {
    float cx = cos(angles.x); float sx = sin(angles.x);
    float cy = cos(angles.y); float sy = sin(angles.y);
    float cz = cos(angles.z); float sz = sin(angles.z);
    return mat3(
      cy*cz,              cy*sz,              -sy,
      sx*sy*cz - cx*sz,   sx*sy*sz + cx*cz,   sx*cy,
      cx*sy*cz + sx*sz,   cx*sy*sz - sx*cz,   cx*cy
    );
  }

  void main() {
    vUv = uv;
    vSuit = aSuit;

    // Per-card rotation: seed + time-based spin
    vec3 angles = aRotation.xyz + uTime * aRotation.w;
    mat3 rot = rotateXYZ(angles);

    // Use the card's facing direction for front/back detection
    vec3 faceNormal = rot * vec3(0.0, 0.0, 1.0);
    vec3 viewDir = normalize(cameraPosition - aOffset);
    vFaceDir = dot(faceNormal, viewDir);

    vec3 pos = rot * (position * aSize) + aOffset;

    vec3 baseColor = mix(aColor, uTintColor, uTintStrength);
    vColor = baseColor;

    // Distance fade
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    float distFade = smoothstep(12.0, 6.0, -mvPos.z);
    vAlpha = distFade * 0.7;

    gl_Position = projectionMatrix * mvPos;
  }
`;

export const cardsFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSuit;
  varying float vFaceDir;

  // SDF for a rounded rectangle
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  // Heart shape SDF
  float sdHeart(vec2 p) {
    p.y -= 0.3;
    p.x = abs(p.x);
    float a = atan(p.x, p.y) / 3.14159;
    float r = length(p);
    float h = clamp(a, 0.0, 1.0);
    float d = r - 0.5 * (1.0 + h * 0.3);
    return d;
  }

  // Diamond shape
  float sdDiamond(vec2 p) {
    p = abs(p);
    return (p.x + p.y - 0.55) * 0.707;
  }

  // Club shape (3 circles + stem)
  float sdClub(vec2 p) {
    float d1 = length(p - vec2(-0.15, 0.1)) - 0.18;
    float d2 = length(p - vec2(0.15, 0.1)) - 0.18;
    float d3 = length(p - vec2(0.0, 0.3)) - 0.18;
    float stem = sdRoundedBox(p - vec2(0.0, -0.1), vec2(0.05, 0.18), 0.02);
    return min(min(d1, d2), min(d3, stem));
  }

  // Spade shape (inverted heart + stem)
  float sdSpade(vec2 p) {
    vec2 hp = vec2(p.x, -p.y + 0.55);
    hp.x = abs(hp.x);
    float a = atan(hp.x, hp.y) / 3.14159;
    float r = length(hp);
    float h = clamp(a, 0.0, 1.0);
    float heart = r - 0.45 * (1.0 + h * 0.3);
    float stem = sdRoundedBox(p - vec2(0.0, -0.1), vec2(0.04, 0.2), 0.02);
    return min(heart, stem);
  }

  float getSuitSDF(vec2 p, float suit) {
    if (suit < 0.5) return sdHeart(p);
    if (suit < 1.5) return sdDiamond(p);
    if (suit < 2.5) return sdClub(p);
    return sdSpade(p);
  }

  void main() {
    if (vAlpha < 0.01) discard;

    // Map UV to centered coords
    vec2 p = vUv * 2.0 - 1.0;

    // Card body — rounded rectangle
    float cardDist = sdRoundedBox(p, vec2(0.85, 0.85), 0.15);
    float cardMask = 1.0 - smoothstep(-0.02, 0.02, cardDist);
    if (cardMask < 0.01) discard;

    // Determine if showing front or back
    bool isFront = vFaceDir > 0.0;

    vec3 col;
    if (isFront) {
      // White card face
      col = vec3(0.95, 0.93, 0.90);

      // Card border
      float borderDist = sdRoundedBox(p, vec2(0.78, 0.78), 0.12);
      float border = smoothstep(-0.02, 0.0, borderDist) * (1.0 - smoothstep(0.0, 0.02, borderDist));
      col = mix(col, vec3(0.7, 0.65, 0.6), border * 0.5);

      // Suit symbol in center
      vec2 suitP = p * 1.5;
      float suitDist = getSuitSDF(suitP, vSuit);
      float suitMask = 1.0 - smoothstep(-0.02, 0.02, suitDist);

      // Red for hearts/diamonds, dark for clubs/spades
      vec3 suitColor = vSuit < 1.5 ? vec3(0.85, 0.1, 0.1) : vec3(0.12, 0.12, 0.12);
      col = mix(col, suitColor, suitMask);

      // Subtle tint from combat state
      col = mix(col, vColor, 0.15);
    } else {
      // Card back — dark pattern with tint
      col = mix(vec3(0.1, 0.22, 0.36), vColor, 0.3);

      // Crosshatch pattern
      float pattern = sin(p.x * 20.0) * sin(p.y * 20.0);
      col += pattern * 0.06;

      // Inner border
      float innerDist = sdRoundedBox(p, vec2(0.72, 0.72), 0.1);
      float innerBorder = smoothstep(-0.02, 0.0, innerDist) * (1.0 - smoothstep(0.0, 0.02, innerDist));
      col += innerBorder * 0.15;
    }

    // Boost for bloom pickup
    gl_FragColor = vec4(col * 1.5, cardMask * vAlpha);
  }
`;
