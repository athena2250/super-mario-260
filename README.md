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
    GameState.js       Lives, score, shards, beacons and the level's phase
    LevelTimer.js      The five-minute countdown, and how urgent it is
    Progress.js        Which levels are finished and unlocked, and the best runs
    Storage.js         A localStorage wrapper that cannot throw
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
    Checkpoint.js      A beacon: progress, and where death returns Pip to
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
      LevelSelectScreen.js  The three levels, locked ones included
      OutcomeScreen.js   Shared panel for a level that ended badly
      TimeUpScreen.js    The clock ran out
      GameOverScreen.js  The last lantern went out
      LevelCompleteScreen.js  "Treasure Found!" and the level's results
      FinalVictoryScreen.js   "Adventure Complete!" and the campaign totals
  levels/
    levels.js          The campaign list: order, names, difficulty
    level01.js         "The Shallow Hollow" - gentle
    level02.js         "The Weeping Gallery" - testing
    level03.js         "The Shattered Deep" - punishing
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
`C` beacon · `P` spawn. See `src/world/tiles.js` for the full legend.

There are three of them, and they escalate by asking for more at once rather
than by making anything faster:

| | Size | Creatures | Crossings | The vault's order |
| --- | --- | --- | --- | --- |
| **1. The Shallow Hollow** | 150 × 30 | 10 | one ferry | west to east, as met |
| **2. The Weeping Gallery** | 176 × 30 | 12 | one long ferry | doubles back at the mesa |
| **3. The Shattered Deep** | 200 × 30 | 16 | a lift and two ferries | doubles back across half the level |

Levels 2 and 3 were composed and validated by a throwaway script rather than
typed by hand. It checks what a person cannot check by eye: that every row is
the same width, that no spike floats or object hangs in the air, that no spike
run is too wide to jump back over, that every rune, tablet and shard is
actually reachable using the measured jump metrics — and, crucially, that the
*order the vault demands can be walked*, leg by leg, without stranding the
player. The committed files are plain ASCII; regenerate them the same way if
they change much.

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
Terrain deaths return Pip to the last beacon he lit; creature contact only
knocks him back, because on a level this long, sending the player backwards for
one mistimed jump would be punishing out of all proportion.

## Finishing a level

Three beacons, then the treasure. The chest opens onto a results screen that
counts its rows in one at a time and tallies the score up rather than printing
it — a results screen that animates reads as a reward, one that does not reads
as a dialog box. Its buttons stay inert until the tally lands, so the payoff is
never skipped past by a jump the player was still holding when the chest opened.

The level is banked the moment the chest finishes opening, not when a button is
pressed, so walking away at the results screen still keeps what was earned.
Finishing a level unlocks the next one; finishing the third closes the adventure
with the totals from all three. A replay only overwrites a previous result if it
scores higher — the game rewards finding things, and a fast run that skipped
half the level should not erase a thorough one.

Once the score has finished counting, the game **carries on to the next level by
itself** after five seconds, counting down on the button it is about to press.
Any input at all cancels it — arrowing onto another button is enough — because a
player reaching for the controls is a player who wants to choose. The adventure
should flow without having to be asked, but never take the choice away.

## Saving

Progress is written to `localStorage` after every completed level, and read back
at boot. Everything about that is treated as hostile:

- The API may not exist, or may throw merely on being touched — Safari's
  private mode and a page opened from `file://` both do this — so it is probed
  with a real write before being trusted.
- The stored text is user-editable, so it may be truncated, hand-edited, or left
  over from a build with a different number of levels. Anything that does not
  survive validation is dropped, and stray numbers are scrubbed rather than
  believed.

None of it is allowed to stop someone playing: a lost save is a disappointment,
a black screen is a broken game. With no storage at all the game runs exactly as
before and simply forgets between sessions.

Level select shows all three levels including the locked ones — a list that
grows as you play tells you nothing about what is ahead, while a list of three
with two dark tells you exactly how much Hollow is left. Locked rows can be
highlighted and read, and refuse to open.

A level can also end badly, in two ways — the clock running out and the last
lantern going out — and those are one screen with different words, drawn over
the frozen level so the player can see exactly where it happened.

## The clock

Every level is played against five minutes. It is a ceiling rather than a race:
five minutes is roughly three unhurried traversals of the longest level, so it
only ever punishes wandering.

It counts **simulation time, not wall-clock time**, and that is the accurate
choice rather than the lazy one. The loop advances in fixed 1/60 s steps exactly
sixty times per second of real time, whatever the display refreshes at, so
subtracting `dt` burns the clock at the same rate on a 30 Hz phone and a 144 Hz
monitor — a full level is exactly 18,000 steps. Sampling `performance.now()`
instead would keep the clock running through a stall the player cannot play
through, and would drift away from the simulation whenever the loop drops
catch-up steps. The clock should measure the game the player actually got.

It stops the moment the chest is touched, so a completion time reflects play and
not how long the reward animation ran, and it stops dead whenever a screen is
up. The HUD escalates at 60 s (amber), 30 s (a slow throb and a thin bar at the
screen edges) and 10 s (a fast throb, a one-pixel jitter, and a tick each
second). Urgency is carried by colour, rhythm and sound rather than by anything
that moves the readout or tints the platform Pip is aiming at.

## Beacons

Every level has exactly three, standing on the through-route where they cannot
be missed. Lighting one is worth points, lights a flame visible from off screen,
and makes that beacon the place death returns Pip to — the run itself is never
rolled back, so a death costs a life and the walk, never progress.

All three must be lit before the chest will open, which is checked separately
from the rune puzzle: the runes are the lock on the vault, the beacons are the
toll on the treasure. Touching the chest early says so rather than doing
nothing.

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
