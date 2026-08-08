# Milestone 1 — Welcome Screen + Game States

Read `@plan/00-OVERVIEW.md` first.

## Goal

Add a polished welcome screen and establish centralized game states without breaking existing gameplay.

## Welcome screen

Title:
`Lumen Hollow`

Subtitle:
`An Adventure Beyond the Light`

Buttons:
- PLAY
- HOW TO PLAY

How To Play should explain:
- Move left/right
- Jump
- Defeat or avoid enemies
- Explore
- Reach checkpoints
- Solve puzzles
- Find the treasure
- Finish before the 5 minute timer expires

Use the existing Lumen Hollow visual style:
- bruised purples
- amber lantern glow
- pixel-art aesthetic
- glowing cavern atmosphere

Use large, readable buttons and subtle animation.

## Game states

Centralize states such as:
- MAIN_MENU
- HOW_TO_PLAY
- LEVEL_SELECT
- PLAYING
- PAUSED
- LEVEL_COMPLETE
- TIME_UP
- GAME_OVER
- FINAL_VICTORY

Do not scatter state logic through unrelated modules.

## Rules

Inspect the existing architecture first.
Reuse the existing Game root and rendering systems.
Do not create duplicate game loops.
Do not commit.

## Test

Verify:
- Game opens on welcome screen
- PLAY enters gameplay
- HOW TO PLAY opens correctly
- Return navigation works
- Existing gameplay still works
- No console errors
