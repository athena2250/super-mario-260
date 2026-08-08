# Milestone 5 — Three Checkpoints Per Level

Read `@plan/00-OVERVIEW.md` first.

## Goal

Every level must contain exactly 3 checkpoints.

Required progression:

Checkpoint 1 → harder section → Checkpoint 2 → harder section → Checkpoint 3 → final challenge → treasure

## HUD

Show:

`CHECKPOINTS: 0/3`

Then:
- 1/3
- 2/3
- 3/3

## Activation

When reached:
- Activate visually
- Play sound
- Show `Checkpoint 1 Reached!` style notification
- Update HUD
- Save respawn position

A checkpoint must only count once.

## Respawn

If the player dies:
- Respawn at the latest activated checkpoint
- Preserve activated checkpoints
- Preserve puzzle/level progress where appropriate
- Do not reset the entire level

If no checkpoint has been reached, respawn at the level start.

Manual level restart resets all checkpoints.

## Test

Verify all three checkpoints in every level.
Test dying before and after each checkpoint.
Ensure no duplicate counting.
Ensure camera/player placement is correct after respawn.

Do not commit.
