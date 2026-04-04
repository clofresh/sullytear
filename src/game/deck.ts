import { Card, SUITS, RANKS } from './types';

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: `${suit}-${rank}`, suit, rank, faceUp: false });
    }
  }
  return cards;
}

export function shuffle(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dealTableau(deck: Card[]): { tableau: Card[][]; stock: Card[] } {
  const cards = [...deck];
  const tableau: Card[][] = [];

  for (let col = 0; col < 7; col++) {
    const pile: Card[] = [];
    for (let row = 0; row <= col; row++) {
      const card = cards.pop()!;
      card.faceUp = row === col;
      pile.push(card);
    }
    tableau.push(pile);
  }

  // Remaining cards become stock (all face down)
  const stock = cards.map(c => ({ ...c, faceUp: false }));

  return { tableau, stock };
}
