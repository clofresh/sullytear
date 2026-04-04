import { Card, getColor } from './types';

export function canMoveToTableau(cards: Card[], targetPile: Card[]): boolean {
  if (cards.length === 0) return false;
  const movingCard = cards[0];

  if (targetPile.length === 0) {
    return movingCard.rank === 13; // Only Kings on empty tableau
  }

  const topCard = targetPile[targetPile.length - 1];
  return (
    topCard.faceUp &&
    getColor(movingCard.suit) !== getColor(topCard.suit) &&
    movingCard.rank === topCard.rank - 1
  );
}

export function canMoveToFoundation(card: Card, foundationPile: Card[]): boolean {
  if (foundationPile.length === 0) {
    return card.rank === 1; // Only Aces on empty foundation
  }

  const topCard = foundationPile[foundationPile.length - 1];
  return card.suit === topCard.suit && card.rank === topCard.rank + 1;
}

export function isWin(foundations: Card[][]): boolean {
  return foundations.every(pile => pile.length === 13);
}

export function canAutoComplete(stock: Card[], waste: Card[], tableau: Card[][]): boolean {
  if (stock.length > 0 || waste.length > 0) return false;
  return tableau.every(pile => pile.every(card => card.faceUp));
}

export function findFoundationIndex(card: Card, foundations: Card[][]): number {
  for (let i = 0; i < 4; i++) {
    if (canMoveToFoundation(card, foundations[i])) return i;
  }
  return -1;
}
