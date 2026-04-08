# Stickers: Between-Encounter Run Decisions

**Status:** Design approved, pending implementation plan
**Date:** 2026-04-08
**Problem:** Sullytear runs are driven entirely by solitaire play. There are no player decisions outside of card moves, so every run feels identical and players cannot express strategy or a build. We want meaningful run-scoped decisions, deferred meta progression.

## Goals

- Add a run-scoped decision layer that does not disturb Klondike's card rules.
- Decisions appear early and repeatedly, tied to the natural beats of the run.
- One generalized primitive covers cards, piles, the hero, monsters, and one-shot charges — no bespoke systems per category.
- Undo stays honest: sticker effects are fully reversible through the existing event-reversal path.

## Non-goals (v1)

- Meta progression, unlocks, persistent sticker collections.
- Run-start drafting or deck composition.
- Sticker removal, swap, upgrade, rarity tiers, gold-skip rewards.
- Negative/cursed stickers.
- Priority/ordering rules beyond placement order.

## Core concept: stickers as a universal modifier

A **sticker** is a small tagged effect that attaches to a target in the run and fires when that target participates in a combat event. One primitive covers every modifier the game needs, so new content is a registry entry rather than a new subsystem.

Targets:

- **Card** — attached by `cardId`. Survives shuffles, visible once the card is face-up.
- **Pile** — a tableau column, a foundation suit, or the stock.
- **Hero** — passive run modifiers (what a "class" or "relic" would have been).
- **Monster** — `current` or `next` encounter.
- **Charge** — unplaced, one-shot, spent by the player during play.

## Acquisition and placement loop

- Monster dies → reward screen → player picks **1 of 3** stickers offered, weighted by encounter tier. No skip-for-gold in v1.
- Immediately after picking, a **placement step** runs against the next encounter's deal, which is generated and committed but rendered face-down. The player sees columns, stock, foundations, hero, and the upcoming monster portrait.
- Legal targets glow based on the chosen sticker's `target.kind`. Card stickers may be placed on **face-down cards** — this is an intentional gambling layer. If playtesting shows it feels bad, the fix is a one-line rule restricting card stickers to face-up cards.
- Charges bypass placement and go straight to a charge tray in the HUD.
- The **first encounter has zero stickers.** No onboarding burden — players learn solitaire→combat baseline first, then the second encounter introduces the new system.

## Data model

```ts
type StickerTarget =
  | { kind: 'card';    cardId: string }
  | { kind: 'pile';    pileId: PileId }
  | { kind: 'hero' }
  | { kind: 'monster'; scope: 'current' | 'next' }
  | { kind: 'charge' }

type Sticker = {
  id: string            // instance id
  defId: StickerDefId   // points into the static registry
  target: StickerTarget
  usesLeft?: number     // for charges or limited-use stickers
}
```

- Static `stickerRegistry.ts` holds `StickerDef`s: `{ id, name, icon, description, triggers: EventKind[], apply(event, ctx) }`.
- `runStore` gains `stickers: Sticker[]`. Cleared on new run.
- `Card` schema is **unchanged** — stickers reference cards by existing `cardId`.

## Combat pipeline integration

Stickers hook in as a **post-detector transform**, not as a new detector:

```
move → detectors → CombatEvent[] → applyStickers(events, state) → CombatEvent[]′ → resolve
```

Rules that keep this tractable:

1. **Stickers mutate numbers and may spawn new events, but cannot rewrite event kinds.** Detectors remain authoritative about *what happened*; stickers only adjust *how hard*.
2. **Deterministic ordering** — stickers resolve in placement order. No priority system in v1.
3. **Undo honesty** — stickers are pure transforms over events. The reversed event replays through the same transform and produces the mirrored result. The only mutable sticker state is `usesLeft`, which lives in `runStore` and is therefore already part of the undo snapshot.
4. **Recursion guard** — the one sticker with recursion risk (`Echo`, re-triggers the last combo) must be forbidden from re-triggering itself.

## Starter sticker pool (v1)

15 stickers, symbol+tag aesthetic, tuned together.

**Card-target (5)**

- ⚔ **Sharpened** — +3 damage when this card is foundationed.
- 💥 **Volatile** — when revealed, deals `rank` damage immediately.
- 👁 **Scouted** — this card is dealt face-up.
- 🩸 **Bloodbound** — healing from this card is doubled.
- 🪞 **Echo** — foundationing this card re-triggers the last combo.

**Pile-target (4)**

- 🔥 **Forge** (foundation suit) — +2 damage to all foundations of this suit.
- 🛡 **Bulwark** (tableau column) — clearing this column heals 10 instead of 5.
- 🌀 **Vortex** (stock) — every 3rd cycle adds 0 threat.
- 🕯 **Shrine** (tableau column) — revealing in this column heals 1 extra.

**Hero-target (2)**

- 🗡 **Duelist** — first foundation each encounter deals double.
- ❤ **Vampire** — 10% of damage dealt heals the hero (min 1).

**Monster-target (2)**

- 🧊 **Frostbitten** (next monster) — threatMax −4.
- 💀 **Marked** (current monster) — next combo deals triple.

**Charge-target (2)**

- ⚡ **Surge** — next foundation deals double (one-shot).
- 🔍 **Peek** — reveal one face-down card without flipping it (one-shot).

## Visual design

Stickers should look like actual stickers — physical, tactile, slightly crooked paper/vinyl stuck onto the game. Reads instantly, on-brand, and gives art a clear, buildable target.

**Anatomy:**

- **Die-cut shape** — irregular rounded blob, thin white border.
- **Drop shadow** — soft, short, down-right. Sells "stuck on top of."
- **Slight rotation** — ±4°, derived deterministically from instance id.
- **Paper grain** — one shared low-opacity noise overlay.
- **Peeling corner** (charges only) — implies "use me" without extra UI.
- **Color band by target kind:**
  - Card → parchment cream
  - Pile → slate blue
  - Hero → warm red
  - Monster → sickly green
  - Charge → gold

**Glyph treatment (v1):**

- Single bold symbol + 1–2 letter tag ("SHRP", "FRG", "FRST"), not bespoke illustration.
- One chunky display face (Bungee / Rubik Mono / similar), all caps, tight tracking.
- Two-tone: saturated ink symbol, near-black tag, on the category background.
- Promotion path: when a sticker earns its keep in playtesting, replace the symbol with custom art. Shape/shadow/rotation frame is unchanged, so there's zero rework.

**Size tiers (same asset, different render size):**

- **Corner pip** (card in tableau) — ~20×20px, symbol only.
- **HUD badge** (hero/monster/pile) — ~32×32px, symbol + tag.
- **Reward card** (draft screen) — ~140×140px, full treatment with name and description.

**Rendering:** one `<Sticker>` React component takes `defId`, `size`, `instanceId` and renders SVG. Shared shape/shadow/grain defs, per-def symbol and color. No per-sticker PNGs in v1.

**Fallback:** if category color bands fight the existing palette, desaturate all sticker backgrounds to off-white and encode category with a small corner dot.

## UX flow summary

- **Reward screen** — defeat banner, gold (existing), 3 sticker offers. Hover/tap reveals full description and legal-target highlights. Pick 1.
- **Placement step** — face-down preview of the next deal, legal targets glow by sticker kind, tap to commit, then "Begin encounter" reveals the deal.
- **In-fight visibility:**
  - Card stickers render as corner pips once the card is face-up. Face-down stickered cards show nothing, preserving the gamble.
  - Pile/hero/monster stickers render as badges next to the relevant entity in the existing HUD.
  - A "Stickers" pip in the HUD opens a list of all active stickers for the run.

## Architectural footprint

- `src/game/stickers/` — new directory with `types.ts`, `registry.ts`, `applyStickers.ts`.
- `src/game/runStore.ts` — add `stickers: Sticker[]` and actions for add/remove/decrement uses.
- `src/game/combat/EventDetector.ts` (or the place events are finalized) — call `applyStickers` after detectors run.
- `src/combat/RewardScreen.tsx` (new or extended) — sticker draft.
- `src/combat/StickerPlacement.tsx` (new) — placement step.
- `src/components/Sticker.tsx` (new) — SVG renderer with size tiers.
- `src/components/...` — corner pips on cards, badges on HUD elements.

## Risks and open questions

- **Face-down card placement** is the spicy bet. If it feels bad, restrict to face-up cards. One-line rule change.
- **Echo recursion** needs an explicit guard.
- **Sticker/HUD palette conflict** — fallback is desaturated backgrounds with corner-dot category encoding.
- **Balance of 15 starter stickers** is an afternoon of tuning after the system is in, not an upfront design task.

## Deferred follow-ups (post-v1)

- Meta progression / unlocks (carry stickers across runs, discover new ones).
- Run-start drafting layered on top of the between-encounter flow.
- Sticker removal, swap, upgrade, rarity tiers, skip-for-gold.
- Negative/cursed stickers for risk-reward drafts.
- Deal-time deck influence (the original "option 4" from brainstorming).
- Priority/ordering rules if content pressure demands them.
