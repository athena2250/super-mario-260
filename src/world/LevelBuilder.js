/**
 * Turns a parsed level's object markers into live game objects.
 *
 * Kept apart from both `TileMap` (which only knows about a grid) and `Game`
 * (which only knows about systems), so adding a new kind of object means
 * touching one table here and one character in `tiles.js` - never the game
 * root.
 *
 * @module world/LevelBuilder
 */

import { TILE_SIZE } from '../core/Config.js';
import { Snub } from '../entities/enemies/Snub.js';
import { Thistle } from '../entities/enemies/Thistle.js';
import { Wisp } from '../entities/enemies/Wisp.js';
import { Shard } from '../entities/Shard.js';
import { RuneSwitch } from '../entities/RuneSwitch.js';
import { RuneTablet } from '../entities/RuneTablet.js';
import { MovingPlatform } from '../entities/MovingPlatform.js';
import { Chest } from '../entities/Chest.js';

/**
 * Place a creature so that it stands on top of the tile below its marker,
 * horizontally centred in its own tile.
 *
 * @param {new (x: number, y: number) => import('../entities/Enemy.js').Enemy} Species
 * @param {number} col
 * @param {number} row
 * @param {{width: number, height: number}} size
 * @returns {import('../entities/Enemy.js').Enemy}
 */
function placeCreature(Species, col, row, size) {
  const x = col * TILE_SIZE + (TILE_SIZE - size.width) / 2;
  const y = (row + 1) * TILE_SIZE - size.height;
  return new Species(Math.round(x), Math.round(y));
}

/**
 * Build every object a level declares.
 *
 * @param {{switchOrder?: number[]}} definition - The level definition.
 * @param {import('./TileMap.js').TileMap} map - Already parsed.
 * @returns {{
 *   enemies: import('../entities/Enemy.js').Enemy[],
 *   shards: Shard[],
 *   switches: RuneSwitch[],
 *   tablets: RuneTablet[],
 *   platforms: MovingPlatform[],
 *   chest: Chest | null,
 *   switchOrder: number[],
 * }}
 */
export function buildLevel(definition, map) {
  const switchOrder = definition.switchOrder ?? [0, 1, 2];

  const built = {
    enemies: [],
    shards: [],
    switches: [],
    tablets: [],
    platforms: [],
    chest: null,
    switchOrder,
  };

  for (const placement of map.objects) {
    const { type, col, row } = placement;

    switch (type) {
      case 'snub':
        built.enemies.push(placeCreature(Snub, col, row, { width: 12, height: 11 }));
        break;
      case 'thistle':
        built.enemies.push(placeCreature(Thistle, col, row, { width: 12, height: 12 }));
        break;
      case 'wisp':
        built.enemies.push(placeCreature(Wisp, col, row, { width: 11, height: 11 }));
        break;
      case 'shard':
        built.shards.push(new Shard(col, row));
        break;
      case 'switch':
        built.switches.push(new RuneSwitch(col, row, placement.index ?? 0));
        break;
      case 'tablet':
        built.tablets.push(new RuneTablet(col, row, switchOrder));
        break;
      case 'platform':
        built.platforms.push(new MovingPlatform(col, row));
        break;
      case 'chest':
        built.chest = new Chest(col, row);
        break;
      default:
        throw new Error(`Level "${map.name}" declares unknown object "${type}"`);
    }
  }

  // Switches are addressed by index throughout the puzzle, so keep the array
  // ordered by identity rather than by where they happened to appear.
  built.switches.sort((a, b) => a.index - b.index);

  return built;
}
