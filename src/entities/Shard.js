/**
 * Lumen shard - the optional collectible.
 *
 * Shards do nothing mechanically; they exist to reward looking around. Their
 * placement is the level's way of pointing: a line of shards leading into a
 * blank wall is a hint, and picking one up in mid-air confirms a jump was the
 * intended route.
 *
 * @module entities/Shard
 */

import { Entity } from './Entity.js';
import { PALETTE, TILE_SIZE } from '../core/Config.js';

/** Collision box. Smaller than a tile so shards read as floating in a gap. */
const SIZE = 8;

export class Shard extends Entity {
  /**
   * @param {number} col - Grid column to centre on.
   * @param {number} row - Grid row to centre on.
   */
  constructor(col, row) {
    super(
      col * TILE_SIZE + (TILE_SIZE - SIZE) / 2,
      row * TILE_SIZE + (TILE_SIZE - SIZE) / 2,
      SIZE,
      SIZE,
    );

    /** True once picked up. @type {boolean} */
    this.collected = false;

    /**
     * Phase offset from the grid position, so a row of shards bobs as a wave
     * instead of moving as one block.
     * @type {number}
     * @private
     */
    this._phase = (col * 0.7 + row * 1.3) % (Math.PI * 2);

    /** @type {number} @private */
    this._time = 0;
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    this._time += dt;
  }

  /** Mark as taken. The game plays the effects. */
  collect() {
    this.collected = true;
    this.alive = false;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const bob = Math.round(Math.sin(this._time * 3 + this._phase) * 1.5);
    const centerX = Math.round(this.centerX);
    const centerY = Math.round(this.centerY) + bob;

    // Glow.
    const pulse = (Math.sin(this._time * 4 + this._phase) + 1) / 2;
    ctx.globalAlpha = 0.1 + pulse * 0.1;
    ctx.fillStyle = PALETTE.lantern;
    ctx.fillRect(centerX - 7, centerY - 7, 14, 14);
    ctx.globalAlpha = 1;

    // A four-pointed shard: two crossed bars with a bright core.
    ctx.fillStyle = PALETTE.lantern;
    ctx.fillRect(centerX - 1, centerY - 4, 2, 8);
    ctx.fillRect(centerX - 4, centerY - 1, 8, 2);

    ctx.fillStyle = PALETTE.lanternCore;
    ctx.fillRect(centerX - 1, centerY - 2, 2, 4);
    ctx.fillRect(centerX - 2, centerY - 1, 4, 2);
  }
}
