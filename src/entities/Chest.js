/**
 * The treasure chest - the level's objective.
 *
 * Sits behind the vault door and does nothing until touched. Opening runs a
 * short scripted animation (lid lifts, light escapes, contents rise) before the
 * game declares victory, so the payoff has a beat of its own rather than
 * cutting straight to a results screen.
 *
 * @module entities/Chest
 */

import { Entity } from './Entity.js';
import { PALETTE, TILE_SIZE } from '../core/Config.js';

const WIDTH = 22;
const HEIGHT = 17;

/** Seconds the opening animation runs before victory is declared. */
export const OPEN_TIME = 1.5;

export class Chest extends Entity {
  /**
   * @param {number} col
   * @param {number} row
   */
  constructor(col, row) {
    super(
      col * TILE_SIZE + (TILE_SIZE - WIDTH) / 2,
      (row + 1) * TILE_SIZE - HEIGHT,
      WIDTH,
      HEIGHT,
    );

    /** True from the moment it is touched. @type {boolean} */
    this.opening = false;

    /** True once the animation has finished. @type {boolean} */
    this.opened = false;

    /** @type {number} @private */
    this._time = 0;

    /** Seconds since opening began. @type {number} @private */
    this._openTime = 0;
  }

  /**
   * Animation progress, 0..1.
   * @returns {number}
   */
  get progress() {
    return Math.min(1, this._openTime / OPEN_TIME);
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    this._time += dt;
    if (!this.opening || this.opened) return;

    this._openTime += dt;
    if (this._openTime >= OPEN_TIME) this.opened = true;
  }

  /**
   * Begin opening. Returns false if it is already open, so the caller only
   * fires its effects once.
   *
   * @returns {boolean}
   */
  open() {
    if (this.opening) return false;
    this.opening = true;
    return true;
  }

  /** Reseal. Used on level restart. */
  reset() {
    this.opening = false;
    this.opened = false;
    this._openTime = 0;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const progress = this.progress;

    // Escaping light, growing as the lid lifts. Drawn behind the chest so the
    // chest itself stays legible.
    if (this.opening) this._renderLight(ctx, x, y, progress);

    // Base.
    ctx.fillStyle = PALETTE.chestWood;
    ctx.fillRect(x, y + 6, WIDTH, HEIGHT - 6);
    ctx.fillStyle = PALETTE.chestBand;
    ctx.fillRect(x, y + 9, WIDTH, 2);
    ctx.fillRect(x + WIDTH / 2 - 1, y + 6, 2, HEIGHT - 6);

    // Lid, hinged at the back: it rises and tilts as it opens.
    const lift = Math.round(progress * 7);
    const tilt = Math.round(progress * 3);

    ctx.fillStyle = PALETTE.chestWood;
    ctx.fillRect(x, y + 1 - lift, WIDTH, 5 - tilt);
    ctx.fillStyle = PALETTE.chestBand;
    ctx.fillRect(x, y + 1 - lift, WIDTH, 1);
    ctx.fillRect(x + 1, y + 1 - lift, 2, 5 - tilt);
    ctx.fillRect(x + WIDTH - 3, y + 1 - lift, 2, 5 - tilt);

    // Lock plate, which pops off once the lid is clear of it.
    if (progress < 0.35) {
      ctx.fillStyle = PALETTE.chestBand;
      ctx.fillRect(x + WIDTH / 2 - 2, y + 4, 4, 4);
      ctx.fillStyle = PALETTE.skyTop;
      ctx.fillRect(x + WIDTH / 2 - 1, y + 5, 2, 2);
    }

    // Contents rising out of the chest late in the animation.
    if (progress > 0.4) {
      const rise = Math.round((progress - 0.4) * 14);
      const centerX = x + Math.round(WIDTH / 2);
      const bob = Math.sin(this._time * 6) * 1;

      ctx.fillStyle = PALETTE.lanternCore;
      ctx.fillRect(centerX - 3, y - rise + bob, 6, 6);
      ctx.fillStyle = PALETTE.lantern;
      ctx.fillRect(centerX - 5, y - rise + 2 + bob, 10, 2);
      ctx.fillRect(centerX - 1, y - rise - 2 + bob, 2, 10);
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} progress
   * @private
   */
  _renderLight(ctx, x, y, progress) {
    const centerX = x + WIDTH / 2;
    const flicker = 0.85 + Math.sin(this._time * 18) * 0.15;

    // A widening cone of light. Three stacked trapezoids approximate it
    // cheaply and keep the hard edges the rest of the art uses.
    for (let band = 0; band < 3; band++) {
      const spread = (band + 1) * 7 * progress;
      const height = 10 + band * 12;
      ctx.globalAlpha = (0.3 - band * 0.08) * progress * flicker;
      ctx.fillStyle = PALETTE.lantern;
      ctx.fillRect(centerX - spread, y - height, spread * 2, height);
    }
    ctx.globalAlpha = 1;
  }
}
