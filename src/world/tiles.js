/**
 * Tile types and their appearance.
 *
 * Tiles are stored as small integers in a flat array, so behaviour has to be
 * derived from the id rather than from per-tile objects - that is what keeps a
 * large level cheap to store and fast to query. The predicates below are the
 * only place that mapping lives.
 *
 * Artwork lives in `tileArt.js`, so collision code can import tile behaviour
 * without pulling in a single drawing routine.
 *
 * @module world/tiles
 */

/**
 * Tile ids. Values are persisted in level data only via {@link CHAR_TO_TILE},
 * so they can be renumbered freely.
 * @enum {number}
 */
export const TILE = Object.freeze({
  EMPTY: 0,
  /** Plain cavern rock. Solid on all sides. */
  STONE: 1,
  /** Rock with a mossy, lit top. Solid on all sides. */
  MOSS: 2,
  /** One-way platform: solid only when landing on it from above. */
  PLATFORM: 3,
  /** Spikes. Never blocks movement; hurts on contact. */
  SPIKE: 4,
  /**
   * Looks like stone, but can be walked straight through. Drawn with a faint
   * crack so it is *findable* rather than arbitrary - a secret nobody can spot
   * is indistinguishable from a bug.
   */
  FALSE_WALL: 5,
  /**
   * Where a bridge will appear. Drawn as a faint outline: the player can see
   * the crossing they cannot yet make, which is what motivates the puzzle.
   */
  BRIDGE_GHOST: 6,
  /** A raised bridge plank. Solid. Swapped in from BRIDGE_GHOST. */
  BRIDGE: 7,
  /** Sealed vault door. Solid until the puzzle is solved. */
  VAULT: 8,
});

/**
 * Level-data characters. Levels are authored as ASCII art (see
 * `src/levels/`), which diffs readably in git and can be edited by hand.
 * @type {Record<string, number>}
 */
export const CHAR_TO_TILE = Object.freeze({
  '.': TILE.EMPTY,
  ' ': TILE.EMPTY,
  '#': TILE.STONE,
  '=': TILE.MOSS,
  '-': TILE.PLATFORM,
  '^': TILE.SPIKE,
  '%': TILE.FALSE_WALL,
  ':': TILE.BRIDGE_GHOST,
  'V': TILE.VAULT,
});

/** Character marking Pip's start position. Becomes an empty tile. */
export const SPAWN_CHAR = 'P';

/**
 * Level characters that spawn an *entity* rather than paint a tile. The tile
 * underneath is left empty; `TileMap` collects these as placement records and
 * the game builds the actual objects from them, so level files never need to
 * know about constructor signatures.
 *
 * @type {Record<string, string>}
 */
export const CHAR_TO_OBJECT = Object.freeze({
  g: 'snub',
  h: 'thistle',
  w: 'wisp',
  o: 'shard',
  m: 'platform',
  M: 'platform',
  v: 'platform',
  1: 'switch',
  2: 'switch',
  3: 'switch',
  C: 'checkpoint',
  T: 'chest',
  t: 'tablet',
});

/**
 * How each platform marker is rigged. A level says what a crossing *is* - a
 * short ferry, a long one, a lift - rather than repeating constructor options,
 * so the marker in the ASCII carries the whole meaning.
 *
 * Vertical platforms travel *downward* from their marker, so the character is
 * placed at the top of the run and the level reads as where the lift rests when
 * it is up.
 *
 * @type {Record<string, {travelTiles: number, vertical?: boolean}>}
 */
export const PLATFORM_VARIANT = Object.freeze({
  m: { travelTiles: 5 },
  M: { travelTiles: 8 },
  v: { travelTiles: 4, vertical: true },
});

/**
 * Switch markers double as their index, so `1`, `2` and `3` are the amber,
 * verdant and azure runes respectively.
 * @type {Record<string, number>}
 */
export const SWITCH_INDEX = Object.freeze({ 1: 0, 2: 1, 3: 2 });

/**
 * Blocks movement from every direction.
 * @param {number} tile
 * @returns {boolean}
 */
export function isSolid(tile) {
  return (
    tile === TILE.STONE ||
    tile === TILE.MOSS ||
    tile === TILE.BRIDGE ||
    tile === TILE.VAULT
  );
}

/**
 * Blocks only a downward landing, so Pip can jump up through it.
 * @param {number} tile
 * @returns {boolean}
 */
export function isPlatform(tile) {
  return tile === TILE.PLATFORM;
}

/**
 * Hurts on contact but never blocks.
 * @param {number} tile
 * @returns {boolean}
 */
export function isHazard(tile) {
  return tile === TILE.SPIKE;
}

/** Thickness of the one-way platform's solid surface, in pixels. */
export const PLATFORM_THICKNESS = 4;

/**
 * Spikes are inset from their tile so that brushing the very edge of the block
 * is safe. Deaths should come from landing on the points, not from clipping a
 * corner the sprite never visually touched.
 */
export const HAZARD_INSET = Object.freeze({ x: 2, top: 6 });
