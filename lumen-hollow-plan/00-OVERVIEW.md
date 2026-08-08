# Lumen Hollow — Claude Code Plan

This folder is designed for low-context Claude Code sessions.

## How to use

Start a new Claude Code chat and type:

`@plan/3-enemies.md`

Then say:

`Implement this milestone. Inspect the existing code first. Preserve working systems. Do not commit. After implementation, give me a test checklist and stop.`

The actual repository code is always the source of truth.

## Milestones

1. `1-welcome-and-game-states.md` — Welcome screen, How To Play, centralized game states
2. `2-three-level-foundation.md` — Three levels, level manager, transitions
3. `3-enemies.md` — Three enemy types, combat, enemy reset
4. `4-treasure-and-puzzles.md` — Treasure objective, environmental puzzles, exploration
5. `5-checkpoints.md` — Three checkpoints per level, checkpoint HUD, respawn
6. `6-five-minute-timer.md` — Five minute timer, warnings, Time's Up
7. `7-level-completion.md` — Treasure completion, completion screen, next level
8. `8-progression-and-save.md` — Level unlocking, level select, localStorage
9. `9-pause-and-polish.md` — Pause, transitions, UI, effects, audio
10. `10-final-qa-and-deployment.md` — Full QA, deployment readiness

## Project identity

Game: Lumen Hollow
Repository: super-mario-260
Hero: Pip
Genre: Original 2D puzzle platformer
Visual identity: bruised purples, amber lantern light, glowing caverns, pixel-art aesthetic

Do not use Nintendo copyrighted characters, assets, music, logos, or level layouts.

## Existing architecture

The original project uses HTML, CSS, vanilla JavaScript, HTML5 Canvas and ES modules.

Known core files:
- `index.html`
- `styles/main.css`
- `src/main.js`
- `src/Game.js`
- `src/core/Config.js`
- `src/core/Viewport.js`

Always inspect the current repository before editing because the codebase may have evolved.

## Global rules

- Do not rebuild the game from scratch.
- Preserve working mechanics.
- Avoid unrelated rewrites.
- Reuse existing systems.
- Keep gameplay frame-rate independent.
- Do not commit unless explicitly asked.
- Work only on the requested milestone.
- Explain changed files.
- Provide a test checklist.
- Stop after the milestone.
