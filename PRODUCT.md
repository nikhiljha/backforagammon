# Back for a Gammon

## Register

product — the board is the interface; design serves play. Brand character (club warmth) is carried by materials and typography, not by marketing chrome.

## Platform

web

## Users

- **Primary**: two friends who want a quick backgammon match — one creates a game, sends a link, the other clicks it and plays. No accounts, no setup.
- **Secondary**: spectators who open the same link and watch live.
- Context: casual, social, often on a phone or a second monitor while chatting.

## Purpose

Play real backgammon — full match play with the doubling cube — with nothing between you and the game but a link. Success: from landing page to first roll in under 15 seconds.

## Positioning

The fastest way to play a real backgammon match with a friend: grab a link, send it, play. No sign-in, ever.

## Brand personality

Warm, tactile, unhurried. The feel of a wooden board in a members' club: felt, walnut, leather, brass. Serious about the rules, relaxed about everything else.

### References

- Physical backgammon boards (cork-lined field, walnut frame, stitched leather cup).
- Up for a Camel / Down for a Cross: link-based, zero-friction multiplayer board games.

### Anti-references

- Online casino aesthetics: neon, glow, jackpot energy.
- Chess.com-style app chrome: ratings, feeds, upsells.
- Flat "AI slop" gradients-on-white with generic sans.

## Strategic design principles

1. **Board first.** The board owns the screen; everything else (score, cube, controls) is furniture around it.
2. **Material honesty.** Color and texture come from the physical game: felt, wood, bone, leather. No decoration that a real board wouldn't have.
3. **Zero friction.** One action on the landing page. Links are the only identity. Rejoin from the same browser just works.
4. **Rules are law.** The engine enforces legal moves, forced dice usage, cube etiquette, and match scoring (Crawford rule). The UI never lets you make an illegal move.
5. **Legible state.** Whose turn, what was rolled, what the cube says, and the match score are readable at a glance — including for spectators.

## Accessibility

- WCAG AA contrast for all text and state indicators.
- Checker ownership never encoded by color alone (shape/edge treatment differs).
- Full `prefers-reduced-motion` alternatives; dice results readable as text.
