# Milestone 7 — Level Completion + Treasure Finish

Read `@plan/00-OVERVIEW.md` first.

## Goal

A level completes only after:
1. Checkpoint 1 is active
2. Checkpoint 2 is active
3. Checkpoint 3 is active
4. Player reaches the treasure/final goal

The treasure should not finish the level before 3/3 checkpoints.

## Completion screen

Show:

`TREASURE FOUND!`
`Level Complete!`

Include:
- Completion time
- Checkpoints: 3/3
- Score
- Enemies defeated
- Optional collectibles

Buttons:
- NEXT LEVEL
- REPLAY LEVEL
- MAIN MENU

Add:
- Treasure opening animation
- Victory effects
- Sound
- Smooth transition

## Progression

After Level 1, prepare Level 2 as the next level.
After Level 2, prepare Level 3.
After Level 3, transition to the final victory state.

Do not implement persistent unlock storage yet unless already required by the existing code. Full persistence belongs to Milestone 8.

## Test

Attempt treasure with fewer than 3 checkpoints and verify it cannot complete.
Complete all 3 and reach treasure.
Verify correct next level.
Do not commit.
