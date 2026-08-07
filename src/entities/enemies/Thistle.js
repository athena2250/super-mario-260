/**
 * Thistle - a coiled hopper.
 *
 * Crouches, winds up, and leaps on a fixed rhythm. The rhythm is the point: a
 * Thistle is an obstacle you time rather than one you dodge, so it is always
 * fair as long as the wind-up is visible. The sprite compresses through the
 * last third of a second before every leap, which is that tell.
 *
 * It refuses to leap into a gap it cannot land in, so it stays on its platform
 * instead of hopping into a pit and vanishing.
 *
 * @module entities/enemies/Thistle
 */

import { Enemy } from '../Enemy.js';
import { applyGravity } from '../../physics/Physics.js';
import { moveAndCollide } from '../../physics/TileCollision.js';
import { ENEMY, PHYSICS, PALETTE } from '../../core/Config.js';

/** Seconds before a leap during which the creature visibly compresses. */
const WIND_UP = 0.32;

/**
 * How far a leap actually carries, in pixels.
 *
 * Derived from the tuning rather than guessed, because the landing check has to
 * match the real arc: a probe that reaches further than the leap does will
 * happily launch the creature into a gap it cannot clear. The 0.9 factor is
 * headroom for the heavier falling gravity, which shortens the arc slightly.
 */
const LEAP_REACH =
  ENEMY.thistle.speed * ((2 * ENEMY.thistle.jumpSpeed) / PHYSICS.gravity) * 0.9;

export class Thistle extends Enemy {
  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    super(x, y, ENEMY.thistle.width, ENEMY.thistle.height);

    /** Seconds until the next leap. @type {number} @private */
    this._timer = ENEMY.thistle.interval;

    /** Whether it is standing on something. @type {boolean} */
    this.grounded = false;
  }

  /**
   * @param {number} dt
   * @param {import('../../world/TileMap.js').TileMap} map
   */
  think(dt, map) {
    if (this.grounded) {
      // Planted between leaps, so the wind-up reads as a deliberate crouch.
      this.vx = 0;
      this._timer -= dt;

      if (this._timer <= 0) this._leap(map);
    }

    applyGravity(this, dt);
    const contact = moveAndCollide(this, dt, map);

    if (contact.wall) {
      this.facing *= -1;
      this.vx = 0;
    }

    this.grounded = contact.grounded;
    if (this.grounded && this._timer <= 0) this._timer = ENEMY.thistle.interval;
  }

  /**
   * Launch, turning first if there is nowhere to land ahead.
   *
   * @param {import('../../world/TileMap.js').TileMap} map
   * @private
   */
  _leap(map) {
    if (!this._canLandAhead(map)) this.facing *= -1;

    this.vy = -ENEMY.thistle.jumpSpeed;
    this.vx = this.facing * ENEMY.thistle.speed;
  }

  /**
   * Is there ground within leaping distance in the direction it faces?
   *
   * @param {import('../../world/TileMap.js').TileMap} map
   * @returns {boolean}
   * @private
   */
  _canLandAhead(map) {
    const row = map.rowAt(this.bottom + 1);

    // Sample across the arc, not only its far end, so a narrow ledge partway
    // along still counts. Every sample is inside LEAP_REACH, so anything found
    // here is somewhere the creature can genuinely land.
    for (const fraction of [0.5, 0.8, 1]) {
      const probeX = this.centerX + this.facing * LEAP_REACH * fraction;
      const col = map.colAt(probeX);
      if (map.isSolidAt(col, row) || map.isPlatformAt(col, row)) return true;
    }
    return false;
  }

  /** Crouch depth, 0 relaxed to 1 fully compressed. @returns {number} @private */
  _windUp() {
    if (!this.grounded || this.defeated) return 0;
    const remaining = Math.max(0, this._timer);
    if (remaining > WIND_UP) return 0;
    return 1 - remaining / WIND_UP;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   */
  render(ctx, alpha) {
    const { x, y } = this.getRenderPosition(alpha);
    const pose = this.getDefeatPose();

    // Crouching squashes the body; the airborne pose stretches it. Both are
    // anchored to the feet so the creature never appears to sink into a floor.
    const wind = this._windUp();
    const stretch = this.grounded ? -wind * 3 : 2;
    const height = Math.round((this.height + stretch) * pose.squash);
    const width = this.width + Math.round(wind * 3) - (this.grounded ? 0 : 2);

    const bottom = y + this.height + pose.drop;
    const top = bottom - height;
    const centerX = x + Math.round(this.width / 2);
    const half = Math.round(width / 2);

    ctx.globalAlpha = pose.alpha;

    // Feet.
    ctx.fillStyle = PALETTE.thistleDark;
    ctx.fillRect(centerX - half + 1, bottom - 2, 3, 2);
    ctx.fillRect(centerX + half - 4, bottom - 2, 3, 2);

    // Bulb body.
    ctx.fillStyle = PALETTE.thistle;
    ctx.fillRect(centerX - half, top + 2, width, height - 3);
    ctx.fillRect(centerX - half + 2, top, width - 4, 3);

    // Tuft, which flattens as it winds up.
    ctx.fillStyle = PALETTE.thistleDark;
    const tuft = Math.max(0, 3 - Math.round(wind * 3));
    ctx.fillRect(centerX - 1, top - tuft, 2, tuft);

    // Eyes, wide while airborne.
    ctx.fillStyle = PALETTE.skyTop;
    const eyeHeight = this.grounded ? 2 : 3;
    ctx.fillRect(centerX - 3, top + 4, 2, eyeHeight);
    ctx.fillRect(centerX + 1, top + 4, 2, eyeHeight);

    ctx.globalAlpha = 1;
  }
}
