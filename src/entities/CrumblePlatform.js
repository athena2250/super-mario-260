/**
 * Crumbling ledge - level 2's signature obstacle.
 *
 * Solid until it is stood on, then it shakes for a beat and falls away, leaving
 * the drop it was bridging. It rebuilds itself after a pause, so a failed
 * crossing costs a life and never the level.
 *
 * The shake is the whole mechanic: it converts "where do I stand" into "keep
 * moving", which is a different question from anything levels 1 and 2 ask
 * elsewhere, and it is legible - the player is told what is about to happen
 * with time to act on it.
 *
 * Landing uses the same one-way `carry()` contract as {@link MovingPlatform},
 * so the world's platform handling needs to know nothing about crumbling.
 *
 * @module entities/CrumblePlatform
 */

import { Entity } from './Entity.js';
import { PALETTE, CRUMBLE, TILE_SIZE } from '../core/Config.js';

/** Tolerance for "was above the platform before moving", in pixels. */
const LANDING_TOLERANCE = 2;

/** @enum {string} */
const STATE = Object.freeze({ SOLID: 'solid', WARNING: 'warning', GONE: 'gone' });

export class CrumblePlatform extends Entity {
  /**
   * @param {number} col - Grid column of the ledge's left edge.
   * @param {number} row - Grid row of the ledge's top surface.
   */
  constructor(col, row) {
    super(col * TILE_SIZE, row * TILE_SIZE, CRUMBLE.width, CRUMBLE.height);

    /** @type {string} @private */
    this._state = STATE.SOLID;

    /** Seconds remaining in the current state. @type {number} @private */
    this._timer = 0;

    /**
     * Never moves, but the world carries riders by these every step. Held at
     * zero rather than special-cased, so a crumbling ledge is interchangeable
     * with a moving one everywhere outside this file.
     * @type {number}
     */
    this.deltaX = 0;
    /** @type {number} */
    this.deltaY = 0;

    /** True on the step the ledge gives way - hook for sound. @type {boolean} */
    this.justCollapsed = false;

    /** True on the step a footfall starts the countdown. @type {boolean} */
    this.justTriggered = false;

    /** @type {number} @private */
    this._time = 0;
  }

  /** Can something stand on this right now? @returns {boolean} */
  get solid() {
    return this._state !== STATE.GONE;
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    this.savePrevious();
    this._time += dt;
    this.justCollapsed = false;
    this.justTriggered = false;

    if (this._state === STATE.SOLID) return;

    this._timer -= dt;
    if (this._timer > 0) return;

    if (this._state === STATE.WARNING) {
      this._state = STATE.GONE;
      this._timer = CRUMBLE.goneTime;
      this.justCollapsed = true;
      return;
    }

    // Rebuilt. A ledge that stayed gone would turn one mistake into a dead end
    // on a level the player is expected to re-cross after a death.
    this._state = STATE.SOLID;
  }

  /**
   * Land a falling body on top of this ledge, and start the collapse.
   *
   * @param {Entity} body
   * @param {number} previousBottom - The body's bottom edge before it moved.
   * @returns {boolean} True if the body is now standing on the ledge.
   */
  carry(body, previousBottom) {
    if (!this.solid) return false;
    if (body.vy < 0) return false;
    if (body.right <= this.left || body.left >= this.right) return false;
    if (body.bottom < this.top || previousBottom > this.top + LANDING_TOLERANCE) {
      return false;
    }

    body.y = this.top - body.height;
    body.vy = 0;

    if (this._state === STATE.SOLID) {
      this._state = STATE.WARNING;
      this._timer = CRUMBLE.warnTime;
      this.justTriggered = true;
    }
    return true;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   */
  render(ctx, alpha) {
    if (this._state === STATE.GONE) {
      this._renderGhost(ctx);
      return;
    }

    const { x, y } = this.getRenderPosition(alpha);

    // Tremor grows as the collapse nears, so the warning escalates rather than
    // just being present. Rounded, or the shake resamples the deck every frame.
    let shakeX = 0;
    if (this._state === STATE.WARNING) {
      const urgency = 1 - this._timer / CRUMBLE.warnTime;
      shakeX = Math.round(Math.sin(this._time * 46) * CRUMBLE.shake * urgency);
    }

    const drawX = x + shakeX;

    ctx.fillStyle = PALETTE.stone;
    ctx.fillRect(drawX, y, this.width, this.height);

    // Mossy while sound, angry amber once it is going.
    ctx.fillStyle = this._state === STATE.WARNING ? PALETTE.lantern : PALETTE.moss;
    ctx.fillRect(drawX, y, this.width, 1);

    // Fracture lines, which is what marks this apart from a solid ledge before
    // it has ever been touched.
    ctx.fillStyle = PALETTE.stoneLit;
    ctx.fillRect(drawX + 9, y + 1, 1, this.height - 1);
    ctx.fillRect(drawX + 20, y + 1, 1, this.height - 1);

    // Grit shaking loose beneath it.
    if (this._state === STATE.WARNING) {
      ctx.fillStyle = PALETTE.stoneLit;
      for (let i = 0; i < 3; i++) {
        const fall = (this._time * 40 + i * 7) % 9;
        ctx.fillRect(drawX + 5 + i * 11, y + this.height + Math.floor(fall), 1, 1);
      }
    }
  }

  /**
   * The outline left behind while the ledge is gone, so the player can see
   * where it will be when it comes back.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _renderGhost(ctx) {
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = PALETTE.stoneLit;
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 0.5, this.y + 0.5, this.width - 1, this.height - 1);
    ctx.globalAlpha = 1;
  }
}
