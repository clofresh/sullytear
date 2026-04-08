# Game Design

Sullytear fuses Klondike solitaire with a turn-based combat roguelike. Solitaire is not scored — every meaningful card action translates into a combat event against the current monster. The run ends when the hero dies or the full monster roster is cleared.

## Core Loop

1. Start a run from `RunStartScreen` (pick a difficulty).
2. A fresh Klondike deal is paired with the next monster in the run's encounter list.
3. Play cards. Foundation placements, combos, reveals, and column clears damage or heal; stock cycles and certain face-card moves fill the monster's threat meter, which strikes back at the hero when it fills.
4. When the monster dies, the run advances to the next encounter and the board resets. When the hero dies, the run ends.
5. Gold earned persists to meta progression.

## Monster Roster

Defined in `src/combat/monsters.ts`. Six tiered monsters per run:

| Tier | Monster | HP | Attack | Threat Max | Gold |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Slime | 40 | 4 | 12 | 10 |
| 2 | Goblin | 55 | 6 | 18 | 15 |
| 3 | Skeleton | 70 | 8 | 24 | 20 |
| 4 | Werewolf | 85 | 9 | 28 | 25 |
| 5 | Lich | 100 | 10 | 32 | 30 |
| 6 | Dragon | 120 | 12 | 40 | 40 |

`buildEncounterConfig` scales HP and attack by the run's difficulty multipliers.

## Difficulty

Defined in `src/game/difficulty.ts`:

| Difficulty | HP ×   | Attack × | Gold × |
| --- | ---: | ---: | ---: |
| Normal    | 1.0 | 1.0 | 1.0 |
| Hard      | 1.4 | 1.3 | 1.5 |
| Nightmare | 1.8 | 1.6 | 2.0 |

## Card Actions → Combat Events

All triggers are pure detectors in `src/game/combat/detectors/`. Each detector is also the undo rule — undoing a card move reverses its combat effect.

- **Foundation placement** (`foundationDetector`) — deal damage equal to card rank (× active empower multiplier). Ace heals hero by 3; Queen heals hero by 5. Undo heals the monster for the removed rank.
- **Combo** (`comboDetector`) — chained foundation placements deal `2 × growth` bonus damage labeled "Combo xN". Undo heals the monster by `2 × shrinkage`.
- **Tableau reveal** (`revealDetector`) — each newly-flipped card does 2 chip damage. Revealing an Ace or Queen also heals the hero (1 / 2). Undo reverses the chip damage and face-card effects.
- **Column clear** (`columnClearDetector`) — emptying a tableau column heals the hero for 5.
- **Face-card move** (`faceCardMoveDetector`) — moving an Ace or Queen into play heals the hero (2 / 3) and emits a banner event.
- **Stock cycle** (`stockCycleDetector`) — cycling the stock dumps `monsterAttackDamage × 2` onto the monster's threat meter. When the meter fills, the monster attacks the hero.
- **Waste interactions** (`wasteDetector`) — governs waste-pile-specific triggers.

Adding a new combat trigger means writing a detector and registering it in `src/game/combat/EventDetector.ts` — see [architecture.md](./architecture.md).

## Threat Meter

Each monster has a `threatMax`. Threat accumulates primarily from stock cycles; when it overflows, the monster strikes the hero for its attack damage and the meter resets. Threat values are tuned so that a player who leans on stock cycling takes roughly one hit per cycle-through of the deck.

## Stickers

Between encounters the hero earns **stickers** — small persistent modifiers that attach to specific cards, suits, or monsters. The loop:

1. A monster dies → a reward screen offers a **3-sticker draft** (weighted by encounter tier; no skip in v1).
2. The player picks one, then enters a **placement step** over the face-down preview of the next deal — pick a target card, suit, or the next monster depending on the sticker's scope.
3. Placement commits the encounter and the next board deals with the sticker attached.

Stickers fire through the same detector pipeline as the rest of combat, so their effects (and undo) stay consistent with existing rules. Charge-based effects reuse the existing `empowerMultiplier` pathway.

**v1 starter pool** (six stickers):

- ⚔ **Sharpened** (card) — +3 damage when this card is foundationed.
- 🔥 **Forge** (suit) — +2 damage to every foundation of this suit.
- 💥 **Volatile** (card) — when revealed from the tableau, deals `rank` damage immediately.
- ⚡ **Surge** (run) — the next foundation placement deals double (one-shot charge).
- 🧊 **Frostbitten** (next monster) — reduces the next monster's `threatMax` by 4, consumed on apply.

Full design rationale and the full starter pool live in [plans/2026-04-08-stickers-design.md](./plans/2026-04-08-stickers-design.md); the implementation breakdown lives in [plans/2026-04-08-stickers.md](./plans/2026-04-08-stickers.md).

**v1 limitations:**

- Foundation-undo does not reverse sticker damage bonuses.
- Frostbitten is consumed on apply and is not rescoped to the `current` encounter if the player rewinds.
- Pile-sticker and placement UIs use a simplified HUD badge row and a standalone preview rather than inline-per-pile rendering — a future polish pass.

## Hero

Hero maxHp defaults to 50. Damage sources: monster threat strikes. Heal sources: foundation Aces/Queens, revealing Aces/Queens, moving Aces/Queens into play, column clears. There is no armor or starting defense (removed in `7507b9a`).

## Meta Progression

Persisted in `src/game/metaStore.ts` via `zustand/persist`. Gold from cleared encounters carries across runs; run-scoped state (deck, HP, encounter index) lives in `runStore` and resets on each new run.

## Design Intent

- **Solitaire is the combat interface.** Players should think in solitaire terms (where do I reveal? when do I cycle?) while feeling every decision as a combat trade-off.
- **Undo must be honest.** Every detector defines both the forward and reverse effect so undo cannot be used to farm damage or healing.
- **Threat meter gates greed.** Cycling the stock is the safest move in vanilla Klondike; threat makes it the riskiest move here, forcing players to commit to the tableau.
