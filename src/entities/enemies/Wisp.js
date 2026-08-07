/**
 * Wisp - a drifting light.
 *
 * Ignores gravity and terrain entirely and flies a fixed path: a horizontal
 * patrol either side of where it was placed, with a slow vertical weave laid
 * over it. Because the path is fixed and periodic, a Wisp can be waited out -
 * it is a timing obstacle for the airborne sections rather than a chase.
 *
 * Not colliding with tiles is deliberate. A flyer that pathfound around
 * geometry would be unpredictable, and unpredictable is unfair when the player
 * is mid-jump with no way to change course.
 *
 * @module entities/enemies/Wisp
 */

import { Enemy } from '../Enemy.js';
import { ENEMY, PALETTE, TILE_SIZE } from '../../core/Config.js';

/** Half-width of the patrol, in tiles either side of the spawn point. */
const PATROL_TILES = 3.5;

export class Wisp extends Enemy {
  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    super(x, y, ENEMY.wisp.width, ENEMY.wisp.height);

    /** @type {number} @private */
    this._range = PATROL_TILES * TILE_SIZE;
  }

  /**
   * @param {number} dt
   * @param {import('../../world/TileMap.js').TileMap} _map - Unused: a Wisp
   *   passes through terrain.
   */
  think(dt, _map) {
    this.x += this.facing * ENEMY.wisp.speed * dt;

    // Turn at the ends of the patrol, clamping first so a large step cannot
    // carry it past the limit and leave it oscillating outside its path.
    if (this.x > this._spawn.x + this._range) {
      this.x = this._spawn.x + this._range;
      this.facing = -1;
    } else if (this.x < this._spawn.x - this._range) {
      this.x = this._spawn.x - this._range;
      this.facing = 1;
    }

    // The weave is a function of time, not of accumulated velocity, so it can
    // never drift out of phase.
    this.y = this._spawn.y + Math.sin(this.animTime * ENEMY.wisp.weaveRate) * ENEMY.wisp.weave;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   */
  render(ctx, alpha) {
    const { x, y } = this.getRenderPosition(alpha);
    const pose = this.getDefeatPose();

    const centerX = x + Math.round(this.width / 2);
    const centerY = y + Math.round(this.height / 2) + pose.drop;

    ctx.globalAlpha = pose.alpha;

    // Halo, pulsing on its own slow rhythm.
    const pulse = (Math.sin(this.animTime * 4) + 1) / 2;
    ctx.fillStyle = PALETTE.wisp;
    ctx.globalAlpha = pose.alpha * (0.12 + pulse * 0.08);
    ctx.fillRect(centerX - 9, centerY - 9, 18, 18);
    ctx.globalAlpha = pose.alpha;

    // Trailing streamers, lagging behind the direction of travel.
    const tailX = centerX - this.facing * 6;
    ctx.fillStyle = PALETTE.wisp;
    ctx.globalAlpha = pose.alpha * 0.5;
    ctx.fillRect(tailX, centerY - 2 + Math.round(Math.sin(this.animTime * 9)), 4, 1);
    ctx.fillRect(tailX, centerY + 2 + Math.round(Math.cos(this.animTime * 7)), 3, 1);
    ctx.globalAlpha = pose.alpha;

    // Body: a bright core inside a cooler shell.
    const radius = Math.max(1, Math.round(4 * pose.squash));
    ctx.fillStyle = PALETTE.wisp;
    ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    ctx.fillStyle = PALETTE.wispCore;
    ctx.fillRect(centerX - 2, centerY - 2, 4, 4);

    // Eye, always on the leading side.
    ctx.fillStyle = PALETTE.skyTop;
    ctx.fillRect(centerX + this.facing * 2 - 1, centerY - 1, 2, 2);

    ctx.globalAlpha = 1;
  }
}
