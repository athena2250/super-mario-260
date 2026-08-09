/**
 * Tile artwork.
 *
 * Split from `tiles.js` so that what a tile *is* - its id, and whether it
 * blocks movement - stays separate from what it looks like. Collision code
 * imports the former and never pulls in a line of drawing.
 *
 * Drawing is procedural and deterministic: the speckle pattern comes from a
 * hash of the tile's grid position, so a stone block always looks the same
 * without storing any per-tile decoration.
 *
 * @module world/tileArt
 */

import { TILE_SIZE, PALETTE } from '../core/Config.js';
import { TILE, PLATFORM_THICKNESS } from './tiles.js';

/**
 * Cheap deterministic hash of a grid position, used to vary tile decoration.
 *
 * @param {number} col
 * @param {number} row
 * @returns {number} A well-mixed unsigned 32-bit integer.
 */
function hashPosition(col, row) {
  let hash = (col * 73856093) ^ (row * 19349663);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return (hash ^ (hash >>> 16)) >>> 0;
}

/**
 * Draw a single tile.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} tile - Tile id.
 * @param {number} col
 * @param {number} row
 */
export function drawTile(ctx, tile, col, row) {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const hash = hashPosition(col, row);

  switch (tile) {
    case TILE.STONE:
      drawStone(ctx, x, y, hash);
      break;
    case TILE.MOSS:
      drawStone(ctx, x, y, hash);
      drawMossyTop(ctx, x, y, hash);
      break;
    case TILE.PLATFORM:
      drawPlatform(ctx, x, y);
      break;
    case TILE.SPIKE:
      drawSpikes(ctx, x, y);
      break;
    case TILE.FALSE_WALL:
      drawStone(ctx, x, y, hash);
      drawCrack(ctx, x, y);
      break;
    case TILE.BRIDGE_GHOST:
      drawBridgeGhost(ctx, x, y);
      break;
    case TILE.BRIDGE:
      drawBridge(ctx, x, y, hash);
      break;
    case TILE.VAULT:
      drawVault(ctx, x, y);
      break;
    case TILE.SPRING:
      drawSpring(ctx, x, y, hash);
      break;
    default:
      break;
  }
}

/**
 * A glowspring: a coil of lantern-lit coral wound on a stone base.
 *
 * Drawn tall and bright, and deliberately unlike every other tile - a surface
 * that behaves differently has to *look* different from across the room, or the
 * player learns it by dying on it.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} hash
 */
function drawSpring(ctx, x, y, hash) {
  // Stone footing, so the spring reads as anchored rather than floating.
  drawStone(ctx, x, y, hash);

  ctx.fillStyle = PALETTE.stone;
  ctx.fillRect(x, y, TILE_SIZE, 11);

  // Three coils, each inset a little further, which reads as a wound spring
  // compressed under the cap.
  ctx.fillStyle = PALETTE.lantern;
  for (let i = 0; i < 3; i++) {
    const coilY = y + 4 + i * 3;
    ctx.fillRect(x + 2 + i, coilY, TILE_SIZE - 4 - i * 2, 2);
  }

  // The cap, and the core light that names the thing.
  ctx.fillStyle = PALETTE.lanternCore;
  ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, 3);
  ctx.fillRect(x + 6, y + 5, 4, 1);
}

/**
 * The tell on a false wall: a hairline fracture and a missing corner. Subtle
 * enough to need looking for, obvious enough to be fair once noticed.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 */
function drawCrack(ctx, x, y) {
  ctx.fillStyle = PALETTE.skyTop;
  ctx.fillRect(x + 7, y + 1, 1, 5);
  ctx.fillRect(x + 8, y + 6, 1, 4);
  ctx.fillRect(x + 7, y + 10, 1, 5);
  ctx.fillRect(x + 9, y + 8, 2, 1);
  ctx.fillRect(x + 4, y + 4, 2, 1);
}

/**
 * A bridge that has not been raised: corner brackets only, so the crossing
 * reads as "not yet" rather than "not here".
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 */
function drawBridgeGhost(ctx, x, y) {
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = PALETTE.runeAzure;
  ctx.fillRect(x, y, 3, 1);
  ctx.fillRect(x + TILE_SIZE - 3, y, 3, 1);
  ctx.fillRect(x, y, 1, 3);
  ctx.fillRect(x + TILE_SIZE - 1, y, 1, 3);
  ctx.globalAlpha = 1;
}

/**
 * A raised plank, lit from within by the same energy that raised it.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} hash
 */
function drawBridge(ctx, x, y, hash) {
  ctx.fillStyle = PALETTE.stone;
  ctx.fillRect(x, y, TILE_SIZE, 6);

  ctx.fillStyle = PALETTE.runeAzure;
  ctx.fillRect(x, y, TILE_SIZE, 1);
  ctx.fillRect(x + 2 + (hash & 3), y + 3, 2, 1);

  ctx.fillStyle = PALETTE.stoneLit;
  ctx.fillRect(x + 3, y + 6, 2, 3);
  ctx.fillRect(x + 11, y + 6, 2, 3);
}

/**
 * The sealed vault: heavy stone banded with dormant rune metal.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 */
function drawVault(ctx, x, y) {
  ctx.fillStyle = PALETTE.vault;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  ctx.fillStyle = PALETTE.stone;
  ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

  ctx.fillStyle = PALETTE.runeDormant;
  ctx.fillRect(x + 2, y + 6, TILE_SIZE - 4, 2);
  ctx.fillRect(x + 6, y + 2, 2, TILE_SIZE - 4);
}

/**
 * Rock with a few lighter flecks. The flecks come from three bits of the hash,
 * so the pattern is stable but not obviously repeating.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} hash
 */
function drawStone(ctx, x, y, hash) {
  ctx.fillStyle = PALETTE.stone;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  ctx.fillStyle = PALETTE.stoneLit;
  ctx.fillRect(x + (hash & 7) + 2, y + ((hash >> 3) & 7) + 2, 2, 1);
  ctx.fillRect(x + ((hash >> 6) & 9) + 3, y + ((hash >> 9) & 5) + 8, 1, 1);
  ctx.fillRect(x + ((hash >> 12) & 5) + 9, y + ((hash >> 15) & 7) + 5, 1, 2);
}

/**
 * Lit rim and hanging moss along the top edge, marking a walkable surface.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} hash
 */
function drawMossyTop(ctx, x, y, hash) {
  ctx.fillStyle = PALETTE.stoneLit;
  ctx.fillRect(x, y, TILE_SIZE, 1);

  ctx.fillStyle = PALETTE.moss;
  ctx.fillRect(x, y, TILE_SIZE, 2);

  // Three tufts of varying length hanging below the moss line.
  for (let i = 0; i < 3; i++) {
    const offset = ((hash >> (i * 4)) & 3) + i * 5;
    const length = ((hash >> (i * 3 + 2)) & 3) + 1;
    ctx.fillRect(x + offset, y + 2, 2, length);
  }
}

/**
 * A plank suspended in its tile. The gap underneath is the visual promise that
 * you can jump up through it.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 */
function drawPlatform(ctx, x, y) {
  ctx.fillStyle = PALETTE.stone;
  ctx.fillRect(x, y, TILE_SIZE, PLATFORM_THICKNESS);

  ctx.fillStyle = PALETTE.moss;
  ctx.fillRect(x, y, TILE_SIZE, 1);

  // Two stubby brackets, so the plank reads as supported rather than floating.
  ctx.fillStyle = PALETTE.stone;
  ctx.fillRect(x + 3, y + PLATFORM_THICKNESS, 2, 2);
  ctx.fillRect(x + 11, y + PLATFORM_THICKNESS, 2, 2);
}

/**
 * Three crystal spikes growing from the tile's floor.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 */
function drawSpikes(ctx, x, y) {
  const base = y + TILE_SIZE;

  ctx.fillStyle = PALETTE.stoneLit;
  for (let i = 0; i < 3; i++) {
    const centerX = x + 3 + i * 5;
    ctx.beginPath();
    ctx.moveTo(centerX - 2, base);
    ctx.lineTo(centerX + 3, base);
    ctx.lineTo(centerX + 0.5, base - 9);
    ctx.closePath();
    ctx.fill();
  }

  // Cold highlight down the leading edge of each spike.
  ctx.fillStyle = PALETTE.lanternCore;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + 3 + i * 5, base - 5, 1, 3);
  }
}
