/**
 * Moving platform.
 *
 * Travels between two points on a fixed cycle, pausing at each end so there is
 * always a boarding window. The pause is what makes the timing puzzle fair:
 * without it the player has to match a moving target, which is a reflex test
 * rather than a timing one.
 *
 * Riders are carried by adding the platform's per-step delta to their position
 * *before* they run their own movement, which is why the game updates platforms
 * first. Landing is one-way, exactly like a `PLATFORM` tile: you can jump up
 * through it and land on top, but never get shoved sideways by it.
 *
 * @module entities/MovingPlatform
 */

import { Entity } from './Entity.js';
import { PALETTE, PLATFORM, TILE_SIZE } from '../core/Config.js';

/** Tolerance for "was above the platform before moving", in pixels. */
const LANDING_TOLERANCE = 2;

export class MovingPlatform extends Entity {
  /**
   * @param {number} col - Starting grid column.
   * @param {number} row - Grid row of the platform's top surface.
   * @param {object} [options]
   * @param {number} [options.travelTiles=5] - Distance travelled, in tiles.
   * @param {boolean} [options.vertical=false] - Travel up/down instead of side
   *   to side.
   */
  constructor(col, row, { travelTiles = 5, vertical = false } = {}) {
    super(col * TILE_SIZE, row * TILE_SIZE, PLATFORM.width, PLATFORM.height);

    /** @type {boolean} */
    this.vertical = vertical;

    /** @type {{x: number, y: number}} @private */
    this._origin = { x: this.x, y: this.y };

    /** @type {number} @private */
    this._travel = travelTiles * TILE_SIZE;

    /** Direction along the run: +1 outbound, -1 back. @type {number} @private */
    this._direction = 1;

    /** Seconds remaining of the end-of-run pause. @type {number} @private */
    this._wait = PLATFORM.waitTime;

    /** Movement applied this step, for carrying riders. @type {number} */
    this.deltaX = 0;
    /** @type {number} */
    this.deltaY = 0;

    /** @type {number} @private */
    this._time = 0;
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    this.savePrevious();
    this._time += dt;

    if (this._wait > 0) {
      this._wait -= dt;
      this.deltaX = 0;
      this.deltaY = 0;
      return;
    }

    const step = PLATFORM.speed * this._direction * dt;
    const axis = this.vertical ? 'y' : 'x';
    const origin = this.vertical ? this._origin.y : this._origin.x;

    let next = this[axis] + step;

    // Clamp to the ends of the run and start the pause, so the platform never
    // overshoots by a fraction of a step and jitters at its limits.
    if (next >= origin + this._travel) {
      next = origin + this._travel;
      this._direction = -1;
      this._wait = PLATFORM.waitTime;
    } else if (next <= origin) {
      next = origin;
      this._direction = 1;
      this._wait = PLATFORM.waitTime;
    }

    const delta = next - this[axis];
    this[axis] = next;

    this.deltaX = this.vertical ? 0 : delta;
    this.deltaY = this.vertical ? delta : 0;
  }

  /**
   * Land a falling body on top of this platform.
   *
   * @param {Entity} body
   * @param {number} previousBottom - The body's bottom edge before it moved.
   * @returns {boolean} True if the body is now standing on the platform.
   */
  carry(body, previousBottom) {
    if (body.vy < 0) return false;
    if (body.right <= this.left || body.left >= this.right) return false;
    if (body.bottom < this.top || previousBottom > this.top + LANDING_TOLERANCE) {
      return false;
    }

    body.y = this.top - body.height;
    body.vy = 0;
    return true;
  }

  /** Return to the start of the run. */
  reset() {
    this.x = this._origin.x;
    this.y = this._origin.y;
    this._direction = 1;
    this._wait = PLATFORM.waitTime;
    this.deltaX = 0;
    this.deltaY = 0;
    this.snapToPosition();
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   */
  render(ctx, alpha) {
    const { x, y } = this.getRenderPosition(alpha);

    // Deck.
    ctx.fillStyle = PALETTE.stone;
    ctx.fillRect(x, y, this.width, this.height);

    // Lit rim, tinted with the same energy as the bridge runes so the player
    // reads it as machinery rather than as scenery.
    ctx.fillStyle = PALETTE.runeAzure;
    ctx.fillRect(x, y, this.width, 1);

    // Running lights that drift along the deck, showing it is powered even
    // while it is paused at the end of its run.
    ctx.fillStyle = PALETTE.lanternCore;
    for (let i = 0; i < 3; i++) {
      const offset = (this._time * 14 + i * 11) % (this.width - 4);
      ctx.fillRect(x + 2 + Math.floor(offset), y + 3, 2, 1);
    }

    // Underside brackets.
    ctx.fillStyle = PALETTE.stoneLit;
    ctx.fillRect(x + 3, y + this.height, 2, 2);
    ctx.fillRect(x + this.width - 5, y + this.height, 2, 2);
  }
}
