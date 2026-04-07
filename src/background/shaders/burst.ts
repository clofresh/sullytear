/**
 * Vertex + fragment shaders for the combat-event burst particle system
 * (`BurstParticles.tsx`). Each particle is a soft-edged circular point
 * sprite. Color is multiplied by 2.5 in the fragment shader so the
 * post-processing bloom pass picks it up as HDR-ish highlights.
 */

export const burstVertexShader = /* glsl */ `
  precision highp float;
  attribute float aAlpha;
  attribute float aSize;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPos;
    gl_PointSize = min(aSize * (800.0 / -mvPos.z), 64.0);
  }
`;

export const burstFragmentShader = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float dist = distance(gl_PointCoord, vec2(0.5));
    float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
    alpha *= vAlpha;
    if (alpha < 0.01) discard;
    // Boost color above 1.0 for HDR bloom pickup
    gl_FragColor = vec4(vColor * 2.5, alpha);
  }
`;
