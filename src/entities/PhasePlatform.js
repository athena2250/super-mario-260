/**
 * Phase platform - level 3's signature obstacle.
 *
 * Two interleaved sets of decks share one beat: while the `[` set is solid the
 * `]` set is a ghost, and every {@link PHASE.period} seconds they trade places.
 * Crossing is a matter of reading the rhythm, not of hitting a frame - which is
 * exactly what the final level should ask for.
 *
 * There is no shared clock object. Every platform accumulates the same fixed
 * `dt` from the same start, so they stay in lockstep by construction; a clock
 * passed around would be one more thing that could be wired up wrong.
 *
 * Landing uses the same one-way `carry()` contract as {@link MovingPlatform},
 * so the world's platform handling is untouched.
 *
 * @module entities/PhasePlatform
 */

import { Entity } from './Entity.js';
import { PALETTE, PHASE, TILE_SIZE } from '../core/Config.js';

/** Tolerance for "was above the platform before moving", in pixels. */
const LANDING_TOLERANCE = 2;

export class PhasePlatform extends Entity {
  /**
   * @param {number} col - Grid column of the deck's left edge.
   * @param {number} row - Grid row of the deck's top surface.
   * @param {number} phase - 0 for the set that is solid first, 1 for the other.
   */
  constructor(col, row, phase) {
    super(col * TILE_SIZE, row * TILE_SIZE, PHASE.width, PHASE.height);

    /** @type {number} */
    this.phase = phase;

    /** @type {number} @private */
    this._time = 0;

    /**
     * Held at zero so a phase deck is interchangeable with a moving one
     * everywhere outside this file.
     * @type {number}
     */
    this.deltaX = 0;
    /** @type {number} */
    this.deltaY = 0;

    /** True on the step this deck changes state - hook for sound. */
    this.justFlipped = false;
  }

  /** Which half of the beat the world is in. @returns {number} @private */
  get _beat() {
    return Math.floor(this._time / PHASE.period) % 2;
  }

  /** Can something stand on this right now? @returns {boolean} */
  get solid() {
    return this._beat === this.phase;
  }

  /** Seconds until this deck next changes state. @returns {number} @private */
  get _untilFlip() {
    return PHASE.period - (this._time % PHASE.period);
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    this.savePrevious();
    const before = this.solid;
    this._time += dt;
    this.justFlipped = this.solid !== before;
  }

  /**
   * Land a falling body on top of this deck.
   *
   * A body already standing here when the deck fades simply stops being caught
   * on the next step and falls, which is the behaviour the player expects from
   * watching it - no special case is needed to drop them.
   *
   * @param {Entity} body
   * @param {number} previousBottom - The body's bottom edge before it moved.
   * @returns {boolean} True if the body is now standing on the deck.
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
    return true;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} _alpha
   */
  render(ctx, _alpha) {
    // Each set gets its own hue, so "these two are opposites" is readable
    // without waiting a full cycle to watch them swap.
    const color = this.phase === 0 ? PALETTE.runeAzure : PALETTE.runeVerdant;

    if (!this.solid) {
      this._renderGhost(ctx, color);
      return;
    }

    // Flicker on the way out. The deck is still solid throughout - this is a
    // warning, not a grace period, and treating it as one is the mistake the
    // level is teaching against.
    const leaving = this._untilFlip <= PHASE.warnTime;
    const blinkedOut = leaving && Math.floor(this._untilFlip / 0.08) % 2 === 0;

    ctx.fillStyle = PALETTE.stone;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.fillStyle = blinkedOut ? PALETTE.stoneLit : color;
    ctx.fillRect(this.x, this.y, this.width, 2);

    // A filling bar across the deck showing how much of this beat is left,
    // which is what lets the player time a crossing instead of guessing at it.
    const remaining = Math.max(0, this._untilFlip / PHASE.period);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(this.x + 1, this.y + 3, Math.round((this.width - 2) * remaining), 1);
    ctx.globalAlpha = 1;
  }

  /**
   * The outline of a deck that is currently intangible.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} color
   * @private
   */
  _renderGhost(ctx, color) {
    // Brightening as its turn approaches is the cue the player actually reads:
    // it says "this one next", early enough to jump toward it.
    const returning = this._untilFlip <= PHASE.warnTime;

    ctx.globalAlpha = returning ? 0.55 : 0.22;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 0.5, this.y + 0.5, this.width - 1, this.height - 1);

    // Corner ticks, so a ghost deck is still findable against a dark cavern.
    ctx.fillStyle = color;
    ctx.fillRect(this.x, this.y, 2, 1);
    ctx.fillRect(this.x + this.width - 2, this.y, 2, 1);
    ctx.globalAlpha = 1;
  }
}
