# Milestone 6 — Five Minute Countdown

Read `@plan/00-OVERVIEW.md` first.

## Goal

Every level has a real 5 minute countdown.

Start:

`05:00`

HUD example:

`LEVEL 1   CHECKPOINTS: 1/3   TIME: 04:32`

## Technical requirement

Use real elapsed time / delta time.
Do NOT subtract a fixed value every frame.
The timer must be accurate regardless of FPS.

## Warning states

At 60 seconds:
- subtle warning

At 30 seconds:
- stronger urgency

At 10 seconds:
- urgent visual feedback

Do not make warnings obscure gameplay.

## Time Up

At 00:00:

`TIME'S UP!`

`You didn't reach the treasure in time.`

Buttons:
- TRY AGAIN
- LEVEL SELECT
- MAIN MENU

Retry resets the timer to 05:00.

## Pause compatibility

The timer must stop while the game is paused.

## Test

Test timer accuracy, pause/resume, restart, level transition and timeout.
Do not commit.
