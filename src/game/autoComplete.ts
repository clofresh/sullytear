import { Card, MovePayload, PileId } from './types';
import { canMoveToFoundation } from './rules';

export function getAutoCompleteSequence(
  tableau: Card[][],
  foundations: Card[][]
): MovePayload[] {
  const moves: MovePayload[] = [];
  const tabCopy = tableau.map(pile => [...pile]);
  const foundCopy = foundations.map(pile => [...pile]);

  let found = true;
  while (found) {
    found = false;
    for (let t = 0; t < 7; t++) {
      if (tabCopy[t].length === 0) continue;
      const topCard = tabCopy[t][tabCopy[t].length - 1];
      for (let f = 0; f < 4; f++) {
        if (canMoveToFoundation(topCard, foundCopy[f])) {
          moves.push({
            cards: [topCard],
            from: `tableau-${t}` as PileId,
            fromIndex: tabCopy[t].length - 1,
            to: `foundation-${f}` as PileId,
          });
          tabCopy[t].pop();
          foundCopy[f].push(topCard);
          found = true;
          break;
        }
      }
    }
  }

  return moves;
}
