/**
 * Ambient spore field.
 *
 * Drifting motes of light that fill the Hollow's air. This is background
 * atmosphere rather than gameplay: nothing collides with it and it costs one
 * pass over a small fixed pool. Each mote carries a `depth` so the camera can
 * parallax the field once it exists (Milestone 6).
 *
 * The pool is allocated once at construction and reused forever - particles
 * that leave the top of the screen are recycled to the bottom. No allocation
 * happens in the update path, so the field never causes GC hitches.
 *
 * @module world/Spores
 */

import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../core/Config.js';

/** Number of motes in the field. */
const SPORE_COUNT = 56;

/**
 * Fraction of the camera's movement the nearest motes travel. Kept low: the
 * field should suggest depth, not compete with the level for attention.
 */
const PARALLAX_STRENGTH = 0.25;

/**
 * Wrap a screen x into the visible range, so parallax never opens a gap at
 * either edge.
 *
 * @param {number} x
 * @returns {number}
 */
function wrapX(x) {
  // The double modulo handles negative values, which `%` alone does not.
  return ((x % GAME_WIDTH) + GAME_WIDTH) % GAME_WIDTH;
}

export class Spores {
  /**
   * @param {number} [count=SPORE_COUNT] - Pool size.
   */
  constructor(count = SPORE_COUNT) {
    /**
     * @type {Array<{
     *   x: number, y: number, prevX: number, prevY: number,
     *   riseSpeed: number, swayAmount: number, swaySpeed: number,
     *   phase: number, depth: number, size: number
     * }>}
     */
    this.motes = Array.from({ length: count }, () => this._createMote(true));
  }

  /**
   * Advance the field.
   *
   * @param {number} dt - Fixed timestep in seconds.
   */
  update(dt) {
    for (const mote of this.motes) {
      mote.prevX = mote.x;
      mote.prevY = mote.y;

      mote.phase += mote.swaySpeed * dt;
      mote.y -= mote.riseSpeed * dt;
      mote.x += Math.cos(mote.phase) * mote.swayAmount * dt;

      // Recycle above the top edge; the margin keeps the pop-in off-screen.
      if (mote.y < -2) {
        this._resetMote(mote);
      } else {
        this._wrapHorizontally(mote);
      }
    }
  }

  /**
   * Draw the field.
   *
   * Drawn in **screen space**, outside the camera transform: the motes are
   * atmosphere hanging in front of the lens, not objects at a fixed place in
   * the level. They are still offset by a fraction of the camera position so
   * they parallax as the view scrolls, and wrapped so the field never runs out.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha - Interpolation factor from the loop, 0..1.
   * @param {number} [cameraX=0] - Camera's world x, for the parallax offset.
   */
  render(ctx, alpha, cameraX = 0) {
    ctx.fillStyle = PALETTE.lantern;

    for (const mote of this.motes) {
      // Interpolate between the last two simulation states for smooth motion
      // on displays that do not run at exactly the simulation rate.
      const x = mote.prevX + (mote.x - mote.prevX) * alpha;
      const y = mote.prevY + (mote.y - mote.prevY) * alpha;

      // Nearer motes (higher depth) slide further as the camera pans.
      const drift = cameraX * mote.depth * PARALLAX_STRENGTH;
      const wrapped = wrapX(x - drift);

      // Distant motes are dimmer, which reads as depth in a flat palette.
      ctx.globalAlpha = 0.15 + mote.depth * 0.5;

      // Snapping to whole pixels keeps motes as crisp squares; fractional
      // coordinates would let the canvas antialias them into grey smudges.
      ctx.fillRect(Math.round(wrapped), Math.round(y), mote.size, mote.size);
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Build a mote with randomised drift.
   *
   * @param {boolean} scatter - True to place it anywhere on screen (initial
   *   fill), false to place it just below the bottom edge (recycling).
   * @returns {object}
   * @private
   */
  _createMote(scatter) {
    const depth = Math.random();
    return {
      x: Math.random() * GAME_WIDTH,
      y: scatter ? Math.random() * GAME_HEIGHT : GAME_HEIGHT + Math.random() * 8,
      prevX: 0,
      prevY: 0,
      // Nearer motes rise faster - the same cue as the brightness ramp.
      riseSpeed: 4 + depth * 12,
      swayAmount: 3 + Math.random() * 7,
      swaySpeed: 0.4 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
      depth,
      size: depth > 0.72 ? 2 : 1,
    };
  }

  /**
   * Recycle a mote to the bottom of the screen.
   *
   * `prev` is snapped to the new position: without this the renderer would
   * interpolate from the old position at the top to the new one at the bottom,
   * drawing the mote in a wrong spot for one frame.
   *
   * @param {object} mote
   * @private
   */
  _resetMote(mote) {
    Object.assign(mote, this._createMote(false));
    mote.prevX = mote.x;
    mote.prevY = mote.y;
  }

  /**
   * Keep sideways drift on screen, snapping `prev` for the same reason as
   * `_resetMote`.
   *
   * @param {object} mote
   * @private
   */
  _wrapHorizontally(mote) {
    if (mote.x < -2) {
      mote.x = GAME_WIDTH + 2;
    } else if (mote.x > GAME_WIDTH + 2) {
      mote.x = -2;
    } else {
      return;
    }
    mote.prevX = mote.x;
  }
}
