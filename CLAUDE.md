# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Lumen Hollow** — an original 2D platformer (Mario-*inspired* genre, no
Nintendo assets, characters, names, music or level designs). Hero: **Pip**, a
lantern-sprite exploring glowing caverns.

## Stack

Vanilla JavaScript (ES modules), HTML5 Canvas 2D, plain CSS. **No frameworks, no
build step, no runtime dependencies.** Source is served as-is to the browser.

## Commands

```bash
npm start      # serve on http://localhost:8080 via python3 -m http.server
npm run serve  # same, via npx serve (Node alternative)
```

ES modules require HTTP; opening `index.html` from the filesystem will not work.
There is no test runner or linter configured yet.

## Architecture

- `src/main.js` — entry point only: locate the canvas, construct `Game`, report
  fatal boot errors. Keep it thin.
- `src/Game.js` — game root. Owns long-lived subsystems and the frame render.
- `src/core/Config.js` — all tunable constants (resolution, tile size, palette,
  debug switches). New magic numbers belong here, not inline.
- `src/core/Viewport.js` — responsive canvas. Owns *all* knowledge of screen
  size and device pixel ratio.

### Rendering model

The canvas backing store is pinned to a fixed logical resolution
(`GAME_WIDTH` × `GAME_HEIGHT` = 480 × 270) and CSS scales it up, snapping to
integer scale factors at ≥ 1x with `image-rendering: pixelated`. Consequences to
preserve:

- Gameplay code works purely in logical pixels; never read `window.innerWidth`
  or `devicePixelRatio` outside `Viewport`.
- Fill cost is constant across devices, which is how 60 FPS holds on mobile.
- Use `Viewport.toGameCoords()` to convert pointer/touch events.

## Conventions

- Object-oriented, modular; one class per file, files under ~300 lines.
- JSDoc on classes and public methods; comments explain *why*, not *what*.
- Refactor rather than duplicate.
- No placeholder hacks — committed code must actually work.

## Workflow

Development proceeds one numbered milestone at a time (see the checklist in
`README.md`); stop after each and wait for the user's approval before starting
the next. Do not rewrite files unrelated to the current milestone.
