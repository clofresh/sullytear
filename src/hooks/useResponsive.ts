import { useState, useEffect, useMemo } from 'react';
import { CARD_ASPECT_RATIO, MAX_CARD_WIDTH, FACE_DOWN_OFFSET, FACE_UP_OFFSET_RATIO } from '../utils/constants';

interface Dimensions {
  cardWidth: number;
  cardHeight: number;
  gap: number;
  faceDownOffset: number;
  faceUpOffset: number;
  boardWidth: number;
  boardHeight: number;
}

export function useResponsive(): Dimensions {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return useMemo(() => {
    const gap = size.w < 480 ? 6 : size.w < 1024 ? 10 : 14;
    const headerHeight = 48 + 72; // header + combat bar
    const availableWidth = size.w - 16; // 8px padding each side
    const cardWidth = Math.min(Math.floor((availableWidth - 8 * gap) / 7), MAX_CARD_WIDTH);
    const cardHeight = Math.round(cardWidth * CARD_ASPECT_RATIO);
    const faceUpOffset = Math.round(cardHeight * FACE_UP_OFFSET_RATIO);

    return {
      cardWidth,
      cardHeight,
      gap,
      faceDownOffset: FACE_DOWN_OFFSET,
      faceUpOffset,
      boardWidth: size.w,
      boardHeight: size.h - headerHeight,
    };
  }, [size.w, size.h]);
}
