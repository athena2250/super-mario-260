# Milestone 10 — Final QA + Deployment Readiness

Read `@plan/00-OVERVIEW.md` first.

## Goal

Perform a complete production-style review without changing gameplay unnecessarily.

## Full playthrough

Test all 3 levels from start to finish.

Check:
- Welcome screen
- How To Play
- Level Select
- Player movement
- Jumping
- Collision
- All enemy types
- Enemy defeat
- Player death
- Checkpoint 1
- Checkpoint 2
- Checkpoint 3
- Checkpoint respawn
- Puzzles
- Treasure
- 5 minute timer
- Timer warnings
- Time Up
- Pause
- Level completion
- Level unlocking
- localStorage
- Final victory
- Replay

## Technical QA

Check:
- Console errors
- Broken asset paths
- Unused code
- Duplicate systems
- Timer frame-rate independence
- Memory leaks
- Excessive allocations
- Performance
- Responsive behavior
- Mobile behavior
- Rotation behavior

Do not perform large rewrites just for style.

## Deployment readiness

The game is a static browser game intended for GitHub Pages.

Repository:
`super-mario-260`

Expected deployment:
`https://athena2250.github.io/super-mario-260/`

Verify:
- All asset paths are relative
- No localhost-only URLs
- No development-only dependencies
- Game works from deployed URL
- No console errors on deployment

## Final output

Give:
1. Remaining bugs
2. Recommended fixes
3. Deployment checklist
4. Short project summary

Do not commit unless explicitly asked.
