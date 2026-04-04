// Pip positions for ranks 1-10 as percentage offsets within the card center area.
// x: 0=left, 50=center, 100=right
// y: 0=top, 50=middle, 100=bottom
// inverted: pip rendered upside-down (bottom half of card)

interface PipPosition {
  x: number;
  y: number;
  inverted?: boolean;
  large?: boolean;
}

// Standard playing card pip layouts
export const PIP_LAYOUTS: Record<number, PipPosition[]> = {
  1: [
    { x: 50, y: 50, large: true },
  ],
  2: [
    { x: 50, y: 10 },
    { x: 50, y: 90, inverted: true },
  ],
  3: [
    { x: 50, y: 10 },
    { x: 50, y: 50 },
    { x: 50, y: 90, inverted: true },
  ],
  4: [
    { x: 30, y: 10 },
    { x: 70, y: 10 },
    { x: 30, y: 90, inverted: true },
    { x: 70, y: 90, inverted: true },
  ],
  5: [
    { x: 30, y: 10 },
    { x: 70, y: 10 },
    { x: 50, y: 50 },
    { x: 30, y: 90, inverted: true },
    { x: 70, y: 90, inverted: true },
  ],
  6: [
    { x: 30, y: 10 },
    { x: 70, y: 10 },
    { x: 30, y: 50 },
    { x: 70, y: 50 },
    { x: 30, y: 90, inverted: true },
    { x: 70, y: 90, inverted: true },
  ],
  7: [
    { x: 30, y: 10 },
    { x: 70, y: 10 },
    { x: 50, y: 30 },
    { x: 30, y: 50 },
    { x: 70, y: 50 },
    { x: 30, y: 90, inverted: true },
    { x: 70, y: 90, inverted: true },
  ],
  8: [
    { x: 30, y: 10 },
    { x: 70, y: 10 },
    { x: 50, y: 30 },
    { x: 30, y: 50 },
    { x: 70, y: 50 },
    { x: 50, y: 70, inverted: true },
    { x: 30, y: 90, inverted: true },
    { x: 70, y: 90, inverted: true },
  ],
  9: [
    { x: 30, y: 10 },
    { x: 70, y: 10 },
    { x: 30, y: 36 },
    { x: 70, y: 36 },
    { x: 50, y: 50 },
    { x: 30, y: 64, inverted: true },
    { x: 70, y: 64, inverted: true },
    { x: 30, y: 90, inverted: true },
    { x: 70, y: 90, inverted: true },
  ],
  10: [
    { x: 30, y: 10 },
    { x: 70, y: 10 },
    { x: 50, y: 23 },
    { x: 30, y: 36 },
    { x: 70, y: 36 },
    { x: 30, y: 64, inverted: true },
    { x: 70, y: 64, inverted: true },
    { x: 50, y: 77, inverted: true },
    { x: 30, y: 90, inverted: true },
    { x: 70, y: 90, inverted: true },
  ],
};
