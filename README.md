# Lumen Hollow

An original 2D platformer: **Pip**, a lantern-sprite, spelunks the glowing
caverns of the Hollow. Built with vanilla JavaScript and HTML5 Canvas — no
frameworks, no build step, no dependencies.

All characters, art, audio and level design are original work.

## Running it

The game uses ES modules, so it must be served over HTTP rather than opened as
a `file://` URL.

```bash
npm start          # python3 -m http.server 8080
# or
npm run serve      # npx serve, if you'd rather use Node
```

Then open <http://localhost:8080>.

## How it renders

The game always draws at a fixed logical resolution of **480 × 270** (see
`src/core/Config.js`). The canvas backing store stays that size and CSS scales
it up to fit the screen, snapping to whole-number scale factors whenever the
display is large enough. That keeps pixel art crisp, keeps the fill cost
constant across a phone and a 4K monitor, and lets all gameplay code work in a
single coordinate space. `src/core/Viewport.js` owns this.

## How it runs

`src/core/Loop.js` is an accumulator loop: the simulation always advances in
fixed 1/60 s steps, while rendering happens once per animation frame and
receives an interpolation factor. Gameplay therefore behaves identically at 30,
60, 120 or 144 Hz, and physics never sees a variable delta. Two guards stop a
stalled tab from triggering a catch-up death spiral — deltas are clamped to
0.25 s, and no frame runs more than 5 catch-up steps.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | Arrow keys / `A` `D` | On-screen ◀ ▶ |
| Run | `Shift` / `J` | On-screen ⏩ |
| Drop through platform | `↓` / `S` | — |
| Jump / stomp | `Space` / `W` / `↑` | On-screen ▲ |

Jump height is analogue — tap for a hop (~1.5 tiles), hold for a full leap
(~3.1 tiles up, ~5 tiles across at a run). Jumps are forgiving by design: a
press up to 0.1 s *after* walking off a ledge still fires (coyote time), and a
press up to 0.12 s *before* landing is remembered and fires on touchdown (input
buffering).

The touch pad stays hidden until the first real touch, so desktop players never
see it. Both input paths write to the same action state in `src/input/Input.js`,
so there is only one movement code path to reason about.

## Layout

```
index.html            Page shell and canvas element
package.json          Metadata + local dev server scripts
styles/
  main.css            Page chrome, letterboxing, mobile touch behaviour
src/
  main.js              Entry point: finds the canvas, boots the game
  Game.js              Orchestrator: viewport, loop, camera, state, interface
  core/
    Config.js          All tuning: resolution, physics, creatures, scoring
    Viewport.js        Responsive canvas sizing and coordinate conversion
    Loop.js            Fixed-timestep loop with interpolated rendering
    Camera.js          Follow camera: dead zone, look-ahead, damping, clamping
    GameState.js       Lives, score, shards, timer and the game's phase
    AppState.js        Which screen the game is on, and the fade between them
  input/
    Input.js           Action state (keyboard bindings, press/release API)
    Pointer.js         Cursor and taps in game pixels, for the menus
    TouchControls.js   On-screen multitouch pad, drawn into the canvas
  physics/
    Physics.js         Gravity integration and shared math helpers
    TileCollision.js   Axis-separated AABB resolution against the tile grid
  audio/
    Audio.js           Sound effects synthesised with WebAudio; no files
  entities/
    Entity.js          Base: collision box, velocity, render interpolation
    Player.js          Pip: movement, damage, checkpoints
    JumpController.js  Coyote time, jump buffering, variable jump height
    PlayerAnimation.js Walk cycle, idle bob, glow pulse, landing squash
    pipSprite.js       Pip's procedural pixel-art sprite
    Enemy.js           Creature base: spawn memory, stomp test, defeat
    enemies/           Snub, Thistle and Wisp - one file each
    Shard.js           The collectible
    RuneSwitch.js      One of the vault's three runes
    RuneTablet.js      The clue: shows the required order and the progress
    MovingPlatform.js  Rides between two points; carries whoever stands on it
    Chest.js           The objective, with its opening animation
  world/
    World.js           The living level: owns and simulates everything in it
    Interactions.js    What a touch means: stomp, hurt, collect, activate
    LevelBuilder.js    Turns level markers into live objects
    PuzzleController.js The rune sequence, the bridge and the vault door
    Particles.js       Pooled particle bursts
    Spores.js          Ambient drifting particle field
    tiles.js           Tile types, legend and collision predicates
    tileArt.js         How each tile is drawn
    TileMap.js         Tile grid: parsing, queries, mutation, culled rendering
  ui/
    PixelText.js       A 3x5 bitmap font, so text matches the art
    Menu.js            Vertical button list: keyboard, pointer, animation
    MenuBackdrop.js    Parallax cavern scenery shared by every menu
    Hud.js             Lives, shards, score, clock and banners
    VictoryScreen.js   The "Treasure Found!" results screen
    DebugOverlay.js    Developer readout
    screens/
      TitleScreen.js     Welcome screen: title, subtitle, Play, How To Play
      HowToPlayScreen.js Controls and objectives
  levels/
    level01.js         "The Shallow Hollow" as editable ASCII art
```

## Levels

Levels are ASCII art, so they diff readably in git and can be edited by hand:

```
'...............=====..........'
'...............#####..........'
'..............................'
'..........----................'
'..............................'
'..P.......................^^..'
'======..=============...======'
```

`.` empty · `#` stone · `=` mossy stone · `-` one-way platform · `^` spikes ·
`P` spawn. See `src/world/tiles.js` for the legend and `src/levels/level01.js`
for the full map.

Geometry is set from the measured jump metrics, not by eye: surfaces sit exactly
three tiles apart because Pip's feet reach 49 px, and the pits are graded — two
tiles (clearable at a walk) before the run button is taught, three tiles
(requires a run) after. Level 1 is 72 × 24 tiles, about two and a half screens
wide and one and a half tall.

## Camera

The camera stacks three behaviours, in order: a **dead zone** (it ignores Pip
entirely while he stays near the centre, so small movements don't drag the
world), **look-ahead** (the view leads ~45 px in the direction he faces, so you
see more of what's coming than what's behind), and **exponential damping** (it
eases rather than snaps, frame-rate independently).

The vertical dead zone is much taller than the horizontal one, and taller again
while airborne, so an ordinary jump moves the camera by exactly zero pixels —
a camera that chases every hop makes the horizon bob constantly.

Directories for entities, the tile map, input, UI and audio are added as their
milestones land, so the tree always reflects code that actually exists.

## The objective

Level 1 hides a treasure chest behind a sealed vault. Reaching it is the point
of the level, and it cannot be done by running and jumping alone.

**The puzzle.** Three rune switches — amber, verdant, azure — must be struck in
the order carved on the stone tablets. There are two tablets, one at the cavern
mouth and one at the vault, and both show the required order *and* how much of
it is currently satisfied. Nothing is guessed: the answer is written down, in
colour, before the first rune is ever reached. Striking a rune out of turn
darkens all three and the attempt starts over.

The difficulty lives in the *reaching*:

- **Amber** sits on a one-way platform above the main path — a deliberate jump.
- **Verdant** is on a ledge on the far side of a seven-tile chasm, which is
  wider than any jump and must be crossed on the moving platform.
- **Azure** is inside a hidden room behind a cracked wall in the mesa's eastern
  face. Since the route runs left to right past that face, entering it means
  noticing the crack and deliberately turning back.

None of the three sits on the through-route, so no rune can be tripped by
accident. Because azure is inside the secret, **the treasure cannot be reached
without finding the hidden room.**

Solving the sequence raises a bridge across the vault chasm one plank at a
time and dissolves the vault door. The bridge is drawn as a faint outline from
the very start, so the crossing you cannot yet make is visible long before you
can make it.

## Creatures

| | Behaviour | How to read it |
| --- | --- | --- |
| **Snub** | Patrols a ledge; turns at walls and at edges | Stays put, so its patrol can be learned and timed |
| **Thistle** | Leaps on a fixed 1.6 s rhythm; refuses to leap into a gap | Compresses visibly for a third of a second before each leap |
| **Wisp** | Flies a fixed path: horizontal patrol plus a slow weave | Ignores terrain entirely, so it is never unpredictable |

Land on any of them to defeat it. Touch one any other way and it costs a life.
Terrain deaths return Pip to the last solid ground he stood on; creature
contact only knocks him back, because on a level this long, sending the player
to the start for one mistimed jump would be punishing out of all proportion.

## Milestones

- [x] 1. Project setup
- [x] 2. Game loop
- [x] 3. Player movement
- [x] 4. Physics
- [x] 5. Tile map
- [x] 6. Camera
- [x] 7. Enemies
- [x] 8. Collectibles
- [x] 9. UI
- [x] 10. Sound
- [ ] 11. Multiple levels
- [ ] 12. Polish
- [ ] 13. Performance optimization
- [ ] 14. Final bug fixing
