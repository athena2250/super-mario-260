# Milestone 3 — Enemies

Read `@plan/00-OVERVIEW.md` first.

## Goal

Add at least 3 distinct enemy types.

### Patrol enemy
- Walks back and forth
- Turns at boundaries or obstacles
- Predictable behavior

### Jumping enemy
- Periodically jumps
- Creates timing challenges

### Flying enemy
- Follows a predictable path
- Creates vertical timing challenges

## Combat

- Touching an enemy damages/kills the player according to the existing life system
- Jumping on top of an enemy defeats it
- Add defeat animation
- Add appropriate sound feedback
- Enemies reset when the level restarts

## Difficulty

Level 1 should use simpler enemy placement.
Level 2 should combine enemy types.
Level 3 should use more demanding combinations and positioning.

Do not make difficulty depend only on speed.

## Architecture

Reuse existing collision and player systems.
Use a clean enemy abstraction or manager if appropriate.
Do not rewrite working physics.

## Test

Test:
- Each enemy behavior
- Player/enemy collision
- Enemy defeat
- Death/respawn behavior
- Enemy reset
- Level transitions
- No performance regression

Do not commit.
