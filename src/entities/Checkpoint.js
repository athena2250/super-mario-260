/**
 * A beacon - one of the three a level must have lit before its vault will give
 * up the treasure, and the place Pip returns to when the Hollow kills him.
 *
 * Two jobs, one object. As a goal it has to be *unmissable*: a tall post with a
 * dark bowl reads as something waiting to be lit, and the moment it is, it
 * throws light the player can see from off screen. As a respawn point it has to
 * be *exact*: `respawnX`/`respawnY` are the collision-box position for a body of
 * a given size standing on the beacon's own footing, so Pip always comes back
 * standing rather than falling.
 *
 * Lighting is one-way and idempotent - `activate()` refuses a second time, so a
 * player standing inside the box cannot count it twice.
 *
 * @module entities/Checkpoint
 */

import { Entity } from './Entity.js';
import { PALETTE, TILE_SIZE } from '../core/Config.js';

const WIDTH = 12;
const HEIGHT = 22;

/** Seconds the ignition flare runs for. */
export const IGNITE_TIME = 0.7;

export class Checkpoint extends Entity {
  /**
   * @param {number} col
   * @param {number} row - The beacon stands on the tile below this one.
   * @param {number} number - 1-based, in west-to-east order. Shown as pips on
   *   the post and used for the "checkpoint 2 reached" message.
   */
  constructor(col, row, number) {
    super(
      col * TILE_SIZE + (TILE_SIZE - WIDTH) / 2,
      (row + 1) * TILE_SIZE - HEIGHT,
      WIDTH,
      HEIGHT,
    );

    /** @type {number} */
    this.number = number;

    /** True once struck. @type {boolean} */
    this.lit = false;

    /** Seconds since the level began, for the idle flicker. @type {number} @private */
    this._time = 0;

    /** Seconds of ignition flare remaining. @type {number} @private */
    this._ignite = 0;
  }

  /** Ignition progress, 1 at the moment of lighting down to 0. @returns {number} */
  get igniting() {
    return this._ignite / IGNITE_TIME;
  }

  /**
   * Where a body of this size stands when it respawns here: centred on the
   * post, feet on the beacon's own footing.
   *
   * @param {number} width - The body's collision width.
   * @param {number} height - The body's collision height.
   * @returns {{x: number, y: number}}
   */
  respawnPosition(width, height) {
    return {
      x: Math.round(this.centerX - width / 2),
      y: Math.round(this.bottom - height),
    };
  }

  /**
   * Light it.
   *
   * @returns {boolean} False if it was already lit, so the caller knows not to
   *   count, sound or announce it twice.
   */
  activate() {
    if (this.lit) return false;
    this.lit = true;
    this._ignite = IGNITE_TIME;
    return true;
  }

  /** Put it out. Used when the level restarts. */
  reset() {
    this.lit = false;
    this._ignite = 0;
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    this._time += dt;
    this._ignite = Math.max(0, this._ignite - dt);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);

    if (this.lit) this._renderGlow(ctx, x, y);

    // Post: a stone column with a lit rim down one side, so it reads as round.
    const postX = x + Math.round(WIDTH / 2) - 2;
    ctx.fillStyle = PALETTE.stone;
    ctx.fillRect(postX, y + 6, 4, HEIGHT - 6);
    ctx.fillStyle = PALETTE.stoneLit;
    ctx.fillRect(postX, y + 6, 1, HEIGHT - 6);

    // Base.
    ctx.fillStyle = PALETTE.stoneLit;
    ctx.fillRect(x + 1, y + HEIGHT - 3, WIDTH - 2, 3);
    ctx.fillStyle = PALETTE.stone;
    ctx.fillRect(x + 2, y + HEIGHT - 2, WIDTH - 4, 2);

    this._renderNumber(ctx, x, y);
    this._renderBowl(ctx, x, y);
    if (this._ignite > 0) this._renderFlare(ctx, x, y);
  }

  /**
   * The bowl and its flame. Unlit it is a dormant crystal, which is the same
   * language the rune switches use for "not yet".
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @private
   */
  _renderBowl(ctx, x, y) {
    const centerX = x + Math.round(WIDTH / 2);

    ctx.fillStyle = PALETTE.stoneLit;
    ctx.fillRect(x + 2, y + 5, WIDTH - 4, 3);

    if (!this.lit) {
      ctx.fillStyle = PALETTE.runeDormant;
      ctx.fillRect(centerX - 2, y + 1, 4, 4);
      return;
    }

    // A two-tone flame whose height flickers on a fast, irregular rhythm - two
    // sines that never line up, so it never looks like it is looping.
    const flicker =
      Math.sin(this._time * 11 + this.number) + Math.sin(this._time * 17) * 0.5;
    const height = 5 + Math.round(flicker);

    ctx.fillStyle = PALETTE.lantern;
    ctx.fillRect(centerX - 2, y + 5 - height, 4, height);
    ctx.fillStyle = PALETTE.lanternCore;
    ctx.fillRect(centerX - 1, y + 6 - height, 2, Math.max(1, height - 2));
  }

  /**
   * The beacon's number, as pips down the post. Small enough to be furniture,
   * readable enough to answer "which one was that".
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @private
   */
  _renderNumber(ctx, x, y) {
    ctx.fillStyle = this.lit ? PALETTE.lantern : PALETTE.runeDormant;
    for (let pip = 0; pip < this.number; pip++) {
      ctx.fillRect(x + Math.round(WIDTH / 2) + 2, y + 10 + pip * 3, 2, 2);
    }
  }

  /**
   * Standing light: a soft column of it, plus a pool on the ground. Drawn
   * behind the post so the post stays a hard silhouette against it.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @private
   */
  _renderGlow(ctx, x, y) {
    const centerX = x + WIDTH / 2;
    const breath = 0.8 + Math.sin(this._time * 3) * 0.2;

    for (let band = 0; band < 3; band++) {
      const spread = 5 + band * 5;
      ctx.globalAlpha = (0.22 - band * 0.06) * breath;
      ctx.fillStyle = PALETTE.lantern;
      ctx.fillRect(centerX - spread, y + 2 - band * 3, spread * 2, HEIGHT + band * 4);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * The ignition: a ring that expands and fades. One beat, then gone - the
   * standing glow is what carries the state afterwards.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @private
   */
  _renderFlare(ctx, x, y) {
    const progress = 1 - this.igniting;
    const centerX = x + WIDTH / 2;
    const centerY = y + 4;
    const radius = 4 + progress * 26;

    ctx.globalAlpha = (1 - progress) * 0.8;
    ctx.strokeStyle = PALETTE.lanternCore;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.round(centerX - radius) + 0.5,
      Math.round(centerY - radius) + 0.5,
      Math.round(radius * 2),
      Math.round(radius * 2),
    );
    ctx.globalAlpha = 1;
  }
}
