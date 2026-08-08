/**
 * Global game configuration.
 *
 * Every tunable constant lives here so gameplay can be balanced without hunting
 * through modules. Values are frozen to make accidental mutation at runtime a
 * loud error in strict mode rather than a silent bug.
 *
 * @module core/Config
 */

/**
 * Logical (internal) render resolution in pixels.
 *
 * The game always draws at this size; Viewport scales the result up to fit the
 * screen. A small fixed resolution means level design, physics and sprite work
 * all share one coordinate space regardless of device, and it keeps fill cost
 * constant so 60 FPS is achievable on low-end phones.
 *
 * 480x270 is exactly 16:9 and an even divisor of 1920x1080.
 */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** Size of one tile in logical pixels. Drives the tile map and collision grid. */
export const TILE_SIZE = 16;

/** Target simulation rate. The loop advances physics in steps of this size. */
export const TARGET_FPS = 60;

/** Duration of one fixed simulation step, in seconds. */
export const FIXED_STEP = 1 / TARGET_FPS;

/**
 * Largest frame delta the loop will accept, in seconds.
 *
 * A tab restored after being backgrounded, or a long GC pause, can report a
 * delta of many seconds. Feeding that to the accumulator would queue hundreds
 * of catch-up steps, each of which takes longer than a frame - the "spiral of
 * death". Clamping means the simulation simply loses that time instead.
 */
export const MAX_FRAME_TIME = 0.25;

/**
 * Hard ceiling on catch-up steps per frame. Second line of defence: if the
 * machine genuinely cannot simulate in real time, we drop simulation time
 * rather than lock up the browser.
 */
export const MAX_STEPS_PER_FRAME = 5;

/**
 * Colour palette for the Hollow.
 *
 * Deliberately limited and original: cool bruised purples for the cavern, warm
 * amber for anything Pip's lantern touches. Keeping the palette centralised
 * lets later milestones re-theme a whole level by swapping this object.
 */
export const PALETTE = Object.freeze({
  skyTop: '#1b1033',
  skyBottom: '#432a5c',
  hazeGlow: '#6d4a8f',
  stone: '#2a2140',
  stoneLit: '#3d3159',
  moss: '#3f7d54',
  lantern: '#ffc45e',
  lanternCore: '#fff2c9',
  letterbox: '#0d0b1a',

  // Creatures of the Hollow. Each is a distinct hue so the three read apart at
  // a glance even when small and moving.
  snub: '#4fa87a',
  snubShell: '#2f6b4e',
  thistle: '#d1568c',
  thistleDark: '#8c2f5c',
  wisp: '#6fd3e8',
  wispCore: '#d8f7ff',

  // Puzzle furniture.
  runeAmber: '#ffc45e',
  runeVerdant: '#7ef2a5',
  runeAzure: '#7ec8f2',
  runeDormant: '#453a5e',
  chestWood: '#a86b3a',
  chestBand: '#ffd977',
  vault: '#5a4a7a',
});

/**
 * Pip's movement tuning, in logical pixels and seconds.
 *
 * The feel these numbers aim for: quick to reach a useful speed, but with
 * enough momentum that stopping and turning are decisions rather than
 * instant snaps. `turnAccel` being the largest value is what makes a direction
 * change feel sharp without making the top speed twitchy.
 */
export const PLAYER = Object.freeze({
  /** Collision box size. Deliberately narrower than the drawn sprite so Pip
   *  slips through tile gaps that look passable (Milestone 5). */
  width: 10,
  height: 14,

  /** Top speed when walking, and when holding the run button. */
  walkSpeed: 74,
  runSpeed: 122,

  /** Ground acceleration toward the target speed. */
  accel: 560,
  /** Extra acceleration applied when reversing against current velocity. */
  turnAccel: 1000,
  /** Deceleration when no direction is held. */
  friction: 700,

  /** Airborne equivalents. Weaker control and almost no drag in the air keeps
   *  jump arcs committal - you steer a jump, you do not redirect it. */
  airAccel: 430,
  airTurnAccel: 620,
  /** Deliberately tiny: a jump should land roughly where its launch speed
   *  aimed it, so releasing the direction mid-flight must not bleed momentum. */
  airFriction: 45,

  /** Below this speed, Pip is treated as stopped - kills endless drift. */
  minSpeed: 4,
});

/**
 * Gravity and jump tuning, in logical pixels and seconds.
 *
 * Derived rather than guessed: for a target apex height `h` reached in time
 * `t`, jumpSpeed = 2h/t and gravity = 2h/t². These values aim for a ~52 px
 * (3.25 tile) full jump peaking in about a third of a second, which is high
 * enough to clear a three-tile wall and quick enough to feel responsive.
 *
 * The multipliers below are the difference between "technically correct
 * projectile motion" and a jump that feels good: a pure parabola feels floaty
 * on the way down and mushy at the top.
 */
export const PHYSICS = Object.freeze({
  /** Downward acceleration while rising. */
  gravity: 955,
  /** Upward launch velocity. */
  jumpSpeed: 315,

  /** Gravity is stronger while falling, so descents feel weighty, not floaty. */
  fallMultiplier: 1.35,

  /** Near the apex gravity eases off, giving a moment of hang time that makes
   *  mid-air positioning readable. */
  apexMultiplier: 0.72,
  /** Vertical speed below which Pip counts as "at the apex". */
  apexThreshold: 42,

  /** Releasing jump mid-rise scales the remaining upward velocity, which is
   *  what makes jump height analogue to how long the button is held. */
  jumpCut: 0.42,

  /** Fall speed ceiling. Also stops fast falls from tunnelling through thin
   *  tiles once collision exists (Milestone 5). */
  maxFallSpeed: 430,

  /** Grace period after walking off a ledge during which a jump still works.
   *  Players press jump slightly late constantly; without this the game feels
   *  like it is ignoring inputs. */
  coyoteTime: 0.1,

  /** Grace period before landing during which a jump press is remembered and
   *  fires on touchdown. The other half of the same problem. */
  jumpBufferTime: 0.12,

  /** How long the landing squash pose is held. */
  landingTime: 0.09,
});

/**
 * Enemy tuning. Each creature is slow enough to be read and reacted to - the
 * challenge is meant to come from level geometry, not from reflexes.
 */
export const ENEMY = Object.freeze({
  /** Snub: a shelled grazer that patrols a ledge and turns at its edges. */
  snub: { width: 12, height: 11, speed: 26 },

  /** Thistle: a coiled hopper that leaps on a fixed rhythm. */
  thistle: {
    width: 12,
    height: 12,
    speed: 34,
    /** Seconds between leaps, and the launch velocity of each. */
    interval: 1.6,
    jumpSpeed: 260,
  },

  /** Wisp: drifts along a fixed path, ignoring gravity and terrain. */
  wisp: {
    width: 11,
    height: 11,
    speed: 38,
    /** Amplitude and rate of the vertical weave along its path. */
    weave: 14,
    weaveRate: 2.1,
  },

  /** Upward speed given to Pip by a successful stomp. */
  stompBounce: 235,

  /** Seconds a defeated enemy's squash-and-fade animation lasts. */
  deathTime: 0.4,
});

/** Player survival rules. */
export const RULES = Object.freeze({
  startingLives: 3,
  /** Seconds of invulnerability after taking a hit, so one touch is one life. */
  invulnerableTime: 1.4,
  /** Points awarded per pickup and per defeated enemy. */
  shardScore: 25,
  stompScore: 10,
  /** Bonus for finishing quickly: this many points, decaying one per second. */
  timeBonusStart: 600,
});

/** Moving platform behaviour. */
export const PLATFORM = Object.freeze({
  width: 32,
  height: 6,
  speed: 34,
  /** Seconds paused at each end of the run, giving the player a boarding window. */
  waitTime: 0.9,
});

/**
 * Interface tuning: screen transitions and menu furniture.
 *
 * The fade in is deliberately longer than the fade out. Leaving a screen should
 * feel decisive - the player already committed - while arriving somewhere new
 * wants a moment to read.
 */
export const UI = Object.freeze({
  /** Seconds to black out when leaving a screen. */
  fadeOut: 0.22,
  /** Seconds to fade up on the screen arrived at. */
  fadeIn: 0.3,
  /** Colour of the transition curtain. */
  curtain: '#0d0b1a',

  /** Menu button geometry, in logical pixels. */
  buttonWidth: 132,
  buttonHeight: 20,
  buttonGap: 8,
});

/**
 * Developer switches. Flip these while working on a milestone; they should all
 * be false on any commit that is meant to be played.
 */
export const DEBUG = Object.freeze({
  /** Draw collision boxes and the tile grid. */
  showHitboxes: false,
  /** Draw the FPS / frame-time readout. */
  showStats: false,
});
