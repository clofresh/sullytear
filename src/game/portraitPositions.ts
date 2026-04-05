// Shared mutable state for portrait screen positions (normalized 0-1)
// Updated by CombatBar DOM refs, read by Three.js BurstParticles
export const portraitPositions = {
  hero: { x: 0.1, y: 0.1 },    // fallback defaults (top-left area)
  monster: { x: 0.9, y: 0.1 }, // fallback defaults (top-right area)
};
