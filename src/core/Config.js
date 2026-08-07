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

/** Target simulation rate. The loop (Milestone 2) uses this for fixed steps. */
export const TARGET_FPS = 60;

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
