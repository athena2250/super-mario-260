# Milestone 2 — Three Level Foundation

Read `@plan/00-OVERVIEW.md` first.

## Goal

Create the structure for exactly 3 playable levels with increasing difficulty.

## Level 1 — Beginner

- Introduce movement and jumping
- Fewer enemies
- Simple platforms
- Simple puzzles
- Clear exploration
- Teach checkpoint and treasure concepts

## Level 2 — Medium

- More enemies
- More complicated platforms
- Moving platforms
- More difficult puzzles
- More exploration
- Better timing requirements

## Level 3 — Hard

- Challenging enemy placement
- Complex platforming
- Multiple puzzle sections
- More dangerous areas
- Precise timing
- Combines mechanics learned earlier

Difficulty should increase through level design, not merely enemy speed.

## Architecture

Create or extend a LevelManager only if needed.
Keep level-specific data separate from generic gameplay logic.
Reuse Player, Camera, Collision, Rendering and Input systems.

## Level transitions

Support:
- Level 1 → Level 2
- Level 2 → Level 3
- Returning to menu
- Replay

Do not implement full persistence yet unless already present. That belongs to Milestone 8.

## Test

Verify all three levels load independently and existing gameplay is not broken.
Do not commit.
