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
- `src/core/Loop.js` — fixed-timestep accumulator loop.
- `src/core/Camera.js` — follow camera; owns all world→screen translation.
- `src/input/` — `Input.js` holds action state; `TouchControls.js` feeds it via
  the same `press()`/`release()` API the keyboard uses.
- `src/entities/` — `Entity` base (collision box + interpolation), `Player`,
  `JumpController` (coyote/buffer/variable height), `PlayerAnimation`
  (presentation only — never read back by the simulation), sprite modules.
- `src/physics/` — `Physics.js` (gravity), `TileCollision.js` (tile AABB).
- `src/world/` — `World` owns the level and everything in it; `Interactions.js`
  decides what a touch means; `PuzzleController` runs the rune sequence;
  `LevelBuilder` turns markers into objects; `tiles.js` (behaviour) is separate
  from `tileArt.js` (drawing) so collision never imports drawing code.
- `src/ui/` — `PixelText` (3x5 bitmap font), `Hud`, `VictoryScreen`.
- `src/audio/Audio.js` — WebAudio synthesis. No asset files anywhere.
- `src/levels/` — level data as ASCII art.

### Adding content

A new tile: add an id + legend char in `tiles.js`, a case in `tileArt.js`, and a
predicate if it collides. A new object: add a marker char to `CHAR_TO_OBJECT`
and a case in `LevelBuilder`. Neither should require touching `Game.js`.

The world reports interactions through the `on` callbacks it is constructed
with; it must not touch score, audio or the HUD directly.

### Ordering rules that are load-bearing

In `World.update()`: platforms move **first** (so riders are carried before they
run their own movement), then the player, then platform landing, then creatures,
then interactions against final positions. `Player._recordCheckpoint()` uses
`contact.grounded` (tile contact) rather than `grounded`, so a checkpoint is
never taken on a moving platform that will have travelled elsewhere.

### Simulation model

`update(dt)` is **always** called with `dt === FIXED_STEP` (1/60 s); `render(alpha)`
runs once per animation frame. Rules to preserve:

- Never scale gameplay by the display rate, and never simulate inside `render`.
- Moving things store `prevX`/`prevY` and lerp by `alpha` when drawing, so
  motion stays smooth on 120/144 Hz displays. Snap `prev` to the new value when
  teleporting/wrapping, or the lerp draws a one-frame streak.
- Round positions to whole pixels at draw time to keep pixel art crisp.
- Don't allocate in `update`/`render` — pool objects instead (see `Spores`).

### Input

Gameplay reads **actions** (`left`, `right`, `jump`, `run`, `down`), never keys
or touches. `Input.endStep()` must stay the last call in `Game.update()` — it
clears the just-pressed/just-released edges after every consumer has read them.
Entity position is the **top-left of the collision box**, in logical pixels.

### Physics

Gravity is not constant — weaker near the apex (hang time), stronger while
falling (weight). Tuning lives in `PHYSICS` in `Config.js`; `jumpSpeed` and
`gravity` are derived from a target apex height/time (h = v²/2g), so change them
as a pair, not individually.

`JumpController.update()` is passed **last step's** `grounded` value — that is
what makes coyote time work. Don't "fix" it to use the current value.

Reference metrics for level design: full jump ≈ 49 px (3.1 tiles) up, running
jump ≈ 79 px (5 tiles) across, tapped jump ≈ 24 px (1.5 tiles). A walking jump
clears a 2-tile gap but **not** a 3-tile gap. Any gap meant to *require* the
moving platform must therefore be wider than 5 tiles.

`Thistle`'s `LEAP_REACH` is derived from the jump tuning, not guessed — a
landing probe that reaches further than the leap actually carries will launch
the creature into a gap it cannot clear.

Levels are generated and validated by a throwaway script rather than typed by
hand (row widths, floating spikes, objects with nothing to stand on). The
committed file is plain ASCII; regenerate it the same way if it changes much.

### Tile collision

`moveAndCollide()` resolves **one axis at a time** (move X, push out, move Y,
push out). Don't "optimize" it into a single combined test — that snags on the
seams between floor tiles. It assumes ≤1 tile of penetration per step, which
holds because terminal velocity is 7.2 px/step against 16 px tiles.

One-way platforms compare the body's bottom edge *before* the move against the
tile's top, with a sub-pixel `PLATFORM_TOLERANCE`. Widening that tolerance
re-catches a body that has just started dropping through. Drop-through is
`input.isDown('down')` with no `grounded` check, for the same reason.

Level rows must all be the same width — `TileMap` throws on ragged rows rather
than padding, because a miscount shifts every tile after it.

### Rendering order

`Game.render()` draws in three bands: **screen space** (sky, spores), then
**world space** inside `ctx.save()` / `camera.applyTo(ctx)` / `ctx.restore()`
(tiles, entities), then **screen space** again (touch controls, debug). Anything
new goes in the right band — a HUD drawn inside the camera transform scrolls
away with the level.

`Camera.applyTo()` rounds the translation. Don't remove that: a fractional
translate resamples every sprite and undoes the crisp pixel upscale.

In `Camera`, the dead zone and look-ahead pull against each other — net lead is
`LOOK_AHEAD - DEAD_ZONE.x`, minus damping lag of roughly `speed / DAMPING.x`.
Raising the dead zone silently cancels the look-ahead.

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
