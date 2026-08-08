/**
 * Entity-versus-tile collision.
 *
 * Movement is resolved **one axis at a time**: move horizontally, push out of
 * anything hit, then move vertically and push out again. Resolving both at once
 * needs the collision normal to disambiguate corners, and gets it wrong exactly
 * where it matters most - running along a flat floor made of separate tiles,
 * where a combined test snags on every seam.
 *
 * Both passes assume a body penetrates at most one tile per step. At the
 * game's terminal velocity that is 7.2 px against a 16 px tile, so there is a
 * wide margin; anything faster would need real swept collision.
 *
 * @module physics/TileCollision
 */

import { TILE_SIZE } from '../core/Config.js';
import { HAZARD_INSET } from '../world/tiles.js';

/**
 * Slack allowed when deciding whether a body was above a one-way platform.
 *
 * Deliberately sub-pixel: it exists only to absorb float error for a body
 * resting exactly on the surface. Anything larger becomes a band in which a
 * body that has just started dropping through gets snapped back up.
 */
const PLATFORM_TOLERANCE = 1;

/**
 * @typedef {object} Contact
 * @property {boolean} grounded - Standing on something solid.
 * @property {boolean} ceiling - Head hit something this step.
 * @property {boolean} wall - Side hit something this step.
 * @property {boolean} hazard - Overlapping a hazard tile.
 */

/**
 * Scratch grid ranges, one per query, so no call can overwrite another's while
 * it is still being read. Reused rather than reallocated: this file runs three
 * range queries per body per step, which was thousands of short-lived objects a
 * second for numbers that are read immediately and then thrown away.
 */
const horizontalRange = { colStart: 0, colEnd: 0, rowStart: 0, rowEnd: 0 };
const verticalRange = { colStart: 0, colEnd: 0, rowStart: 0, rowEnd: 0 };
const hazardRange = { colStart: 0, colEnd: 0, rowStart: 0, rowEnd: 0 };

/**
 * Integrate a body's velocity against the tile map and resolve overlaps.
 *
 * The result is the body's own {@link Contact} object, written in place. Read
 * it before moving the same body again.
 *
 * @param {import('../entities/Entity.js').Entity} body
 * @param {number} dt - Timestep in seconds.
 * @param {import('../world/TileMap.js').TileMap} map
 * @param {boolean} [dropThrough=false] - Ignore one-way platforms this step,
 *   letting the body fall through them.
 * @returns {Contact}
 */
export function moveAndCollide(body, dt, map, dropThrough = false) {
  const contact = body.contact;
  contact.grounded = false;
  contact.ceiling = false;
  contact.wall = false;
  contact.hazard = false;

  // Captured before any movement: one-way platforms need to know whether the
  // body was already below them.
  const previousBottom = body.y + body.height;

  body.x += body.vx * dt;
  resolveHorizontal(body, map, contact);

  body.y += body.vy * dt;
  resolveVertical(body, map, contact, previousBottom, dropThrough === true);

  contact.hazard = overlapsHazard(body, map);
  return contact;
}

/**
 * Keep a body inside the level's left and right edges.
 *
 * @param {import('../entities/Entity.js').Entity} body
 * @param {import('../world/TileMap.js').TileMap} map
 */
export function clampToBounds(body, map) {
  if (body.x < 0) {
    body.x = 0;
    body.vx = 0;
  } else if (body.x + body.width > map.pixelWidth) {
    body.x = map.pixelWidth - body.width;
    body.vx = 0;
  }
}

/**
 * @param {import('../entities/Entity.js').Entity} body
 * @param {import('../world/TileMap.js').TileMap} map
 * @param {Contact} contact
 */
function resolveHorizontal(body, map, contact) {
  const direction = Math.sign(body.vx);
  if (direction === 0) return;

  const range = map.rangeInto(body, horizontalRange);

  // Scan from the trailing edge toward the leading edge, so the tile that
  // stops the body is the first one it would actually have reached.
  const first = direction > 0 ? range.colStart : range.colEnd;
  const last = direction > 0 ? range.colEnd : range.colStart;

  for (let col = first; direction > 0 ? col <= last : col >= last; col += direction) {
    for (let row = range.rowStart; row <= range.rowEnd; row++) {
      if (!map.isSolidAt(col, row)) continue;

      body.x =
        direction > 0 ? col * TILE_SIZE - body.width : (col + 1) * TILE_SIZE;
      body.vx = 0;
      contact.wall = true;
      return;
    }
  }
}

/**
 * @param {import('../entities/Entity.js').Entity} body
 * @param {import('../world/TileMap.js').TileMap} map
 * @param {Contact} contact
 * @param {number} previousBottom - Body's bottom edge before this step's move.
 * @param {boolean} dropThrough - Ignore one-way platforms.
 */
function resolveVertical(body, map, contact, previousBottom, dropThrough) {
  const direction = Math.sign(body.vy);
  if (direction === 0) return;

  const range = map.rangeInto(body, verticalRange);
  const first = direction > 0 ? range.rowStart : range.rowEnd;
  const last = direction > 0 ? range.rowEnd : range.rowStart;

  for (let row = first; direction > 0 ? row <= last : row >= last; row += direction) {
    for (let col = range.colStart; col <= range.colEnd; col++) {
      const blocking =
        map.isSolidAt(col, row) ||
        (direction > 0 &&
          !dropThrough &&
          map.isPlatformAt(col, row) &&
          landsOnPlatform(row, previousBottom));

      if (!blocking) continue;

      if (direction > 0) {
        body.y = row * TILE_SIZE - body.height;
        contact.grounded = true;
      } else {
        body.y = (row + 1) * TILE_SIZE;
        contact.ceiling = true;
      }
      body.vy = 0;
      return;
    }
  }
}

/**
 * A one-way platform only catches a body whose feet were at or above its
 * surface before the move. Anything already below it passes straight up
 * through, which is the whole point of the tile.
 *
 * @param {number} row
 * @param {number} previousBottom
 * @returns {boolean}
 */
function landsOnPlatform(row, previousBottom) {
  return previousBottom <= row * TILE_SIZE + PLATFORM_TOLERANCE;
}

/**
 * @param {import('../entities/Entity.js').Entity} body
 * @param {import('../world/TileMap.js').TileMap} map
 * @returns {boolean} True if the body overlaps a hazard's inset danger zone.
 */
function overlapsHazard(body, map) {
  const range = map.rangeInto(body, hazardRange);

  for (let row = range.rowStart; row <= range.rowEnd; row++) {
    for (let col = range.colStart; col <= range.colEnd; col++) {
      if (!map.isHazardAt(col, row)) continue;

      const left = col * TILE_SIZE + HAZARD_INSET.x;
      const right = (col + 1) * TILE_SIZE - HAZARD_INSET.x;
      const top = row * TILE_SIZE + HAZARD_INSET.top;
      const bottom = (row + 1) * TILE_SIZE;

      if (
        body.x < right &&
        body.x + body.width > left &&
        body.y < bottom &&
        body.y + body.height > top
      ) {
        return true;
      }
    }
  }
  return false;
}
