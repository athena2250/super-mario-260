/**
 * Follow camera.
 *
 * Three behaviours stacked, in the order they are applied:
 *
 *   1. **Dead zone** - the camera ignores the target entirely while it stays
 *      inside a box at the centre of the screen. Without this, every small
 *      movement drags the whole world, which is exhausting to look at.
 *   2. **Look-ahead** - the focus point leads in the direction Pip faces, so
 *      more of the level is visible ahead of him than behind. This is what
 *      makes running into unseen hazards feel unfair or not.
 *   3. **Damping** - the camera eases toward its target rather than snapping.
 *
 * The vertical dead zone is much taller than the horizontal one, and taller
 * still while airborne: a camera that chases every jump makes the horizon bob
 * constantly and is a common source of motion sickness.
 *
 * @module core/Camera
 */

import { GAME_WIDTH, GAME_HEIGHT } from './Config.js';

/**
 * Half-size of the box the target may move in before the camera reacts.
 *
 * The horizontal value is small on purpose. The dead zone and the look-ahead
 * pull against each other - the camera is allowed to sit `x` pixels behind
 * where the look-ahead asks it to be - so the net lead is `LOOK_AHEAD - x`, and
 * a generous dead zone quietly cancels most of the effect.
 */
const DEAD_ZONE = Object.freeze({
  x: 16,
  /** Used while standing on ground. */
  y: 20,
  /** Used while airborne, so ordinary jumps do not move the camera at all. */
  yAirborne: 56,
});

/**
 * How far ahead of the target the view leads, in pixels. Net lead after the
 * dead zone and damping lag is roughly 45 px, or a fifth of a screen.
 */
const LOOK_AHEAD = 72;

/**
 * Damping rates, in "e-folds per second". Higher is snappier. Vertical
 * tracking is deliberately looser than horizontal, and looser again in the air.
 */
const DAMPING = Object.freeze({
  x: 10,
  yGrounded: 8,
  yAirborne: 3.5,
  /** Look-ahead shifts slowly, so turning around does not whip the view. */
  look: 3,
});

/**
 * Screen shake.
 *
 * Presentation only: it offsets what is *drawn*, never where the camera thinks
 * it is, so nothing in the simulation can be affected by it. Amplitudes are
 * deliberately tiny - at this resolution four pixels is already a hard knock,
 * and anything more turns a pixel-art level into mush.
 */
const SHAKE = Object.freeze({
  /** Seconds one shake lasts. Short: an impact, not an earthquake. */
  duration: 0.28,
  /** Ceiling on amplitude, in pixels, whatever a caller asks for. */
  maxPower: 4,
  /** Oscillation rates, deliberately incommensurable so it never looks like a
   *  clean sine wave. */
  rateX: 58,
  rateY: 41,
});

/**
 * Frame-rate independent exponential damping.
 *
 * The naive `current += (target - current) * rate` form is dt-dependent and
 * would give a different feel at 30 and 144 Hz; the exponential form is exact
 * for any step size.
 *
 * @param {number} current
 * @param {number} target
 * @param {number} lambda - Rate in e-folds per second.
 * @param {number} dt - Timestep in seconds.
 * @returns {number}
 */
function damp(current, target, lambda, dt) {
  return target + (current - target) * Math.exp(-lambda * dt);
}

export class Camera {
  /**
   * @param {import('../world/TileMap.js').TileMap} map - Level to stay inside.
   */
  constructor(map) {
    /** View width in logical pixels. @type {number} */
    this.width = GAME_WIDTH;
    /** View height in logical pixels. @type {number} */
    this.height = GAME_HEIGHT;

    /** Left edge of the view, in world pixels. @type {number} */
    this.x = 0;
    /** Top edge of the view, in world pixels. @type {number} */
    this.y = 0;

    /** @type {import('../world/TileMap.js').TileMap} @private */
    this._map = map;

    /** Current smoothed look-ahead offset. @type {number} @private */
    this._look = 0;

    /** Drawing offset from the current shake, in whole pixels. @type {number} */
    this.shakeX = 0;
    /** @type {number} */
    this.shakeY = 0;

    /** @type {number} @private */
    this._shakePower = 0;
    /** @type {number} @private */
    this._shakeTime = 0;
    /** Runs while shaking, so successive shakes do not restart the waveform. */
    this._shakeAge = 0;

    /**
     * Reused rectangle handed to renderers for culling. Mutated in place rather
     * than reallocated, since it is read every frame.
     * @type {{x: number, y: number, width: number, height: number}}
     * @private
     */
    this._view = { x: 0, y: 0, width: this.width, height: this.height };
  }

  /**
   * World-space rectangle currently visible. The values are rounded to match
   * what is actually drawn, so culling never omits a tile that is half on
   * screen.
   *
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  get view() {
    // Widened by the shake ceiling, so a knock can never expose an unculled
    // strip at the edge of the screen.
    this._view.x = Math.round(this.x) - SHAKE.maxPower;
    this._view.y = Math.round(this.y) - SHAKE.maxPower;
    this._view.width = this.width + SHAKE.maxPower * 2;
    this._view.height = this.height + SHAKE.maxPower * 2;
    return this._view;
  }

  /**
   * Knock the view about for a moment.
   *
   * Repeat calls take the strongest rather than adding up, so a stomp landing
   * in the same step as a vault opening reads as one impact instead of
   * doubling into something painful.
   *
   * @param {number} power - Amplitude in pixels; clamped.
   */
  shake(power) {
    this._shakePower = Math.min(SHAKE.maxPower, Math.max(this._shakePower, power));
    this._shakeTime = SHAKE.duration;
  }

  /**
   * Advance the camera one step.
   *
   * @param {number} dt - Timestep in seconds.
   * @param {import('../entities/Player.js').Player} target
   */
  update(dt, target) {
    this._updateLookAhead(dt, target);

    const focusX = target.centerX + this._look;
    const focusY = target.centerY;

    const desiredX = this._applyDeadZone(this.x, focusX, this.width, DEAD_ZONE.x);
    const verticalSlack = target.grounded ? DEAD_ZONE.y : DEAD_ZONE.yAirborne;
    const desiredY = this._applyDeadZone(this.y, focusY, this.height, verticalSlack);

    const verticalRate = target.grounded ? DAMPING.yGrounded : DAMPING.yAirborne;

    this.x = damp(this.x, desiredX, DAMPING.x, dt);
    this.y = damp(this.y, desiredY, verticalRate, dt);

    this._clampToLevel();
    this._updateShake(dt);
  }

  /**
   * @param {number} dt
   * @private
   */
  _updateShake(dt) {
    if (this._shakeTime <= 0) {
      this.shakeX = 0;
      this.shakeY = 0;
      this._shakePower = 0;
      return;
    }

    this._shakeTime -= dt;
    this._shakeAge += dt;

    // Linear decay to nothing. Whole pixels only: a fractional offset would
    // resample every sprite, which is exactly what the renderer avoids.
    const amplitude = this._shakePower * Math.max(0, this._shakeTime / SHAKE.duration);
    this.shakeX = Math.round(Math.sin(this._shakeAge * SHAKE.rateX) * amplitude);
    this.shakeY = Math.round(Math.cos(this._shakeAge * SHAKE.rateY) * amplitude * 0.6);
  }

  /**
   * Jump straight to the target with no easing. Used on spawn and respawn,
   * where damping would show the world sliding into place.
   *
   * @param {import('../entities/Player.js').Player} target
   */
  snapTo(target) {
    this._look = target.facing * LOOK_AHEAD;
    this.x = target.centerX + this._look - this.width / 2;
    this.y = target.centerY - this.height / 2;
    this._clampToLevel();

    // A shake left over from whatever killed him must not follow Pip to where
    // he respawns.
    this._shakeTime = 0;
    this._shakePower = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  /**
   * Shift the drawing origin so world coordinates render at the right place on
   * screen. Wrap world drawing in `ctx.save()` / `ctx.restore()` around this;
   * anything drawn outside it (HUD, touch controls) stays in screen space.
   *
   * @param {CanvasRenderingContext2D} ctx
   */
  applyTo(ctx) {
    // Rounding is what keeps the tile grid pixel-aligned. A fractional
    // translate would let the canvas resample every sprite, undoing the crisp
    // upscale the whole renderer is built around.
    ctx.translate(-Math.round(this.x) + this.shakeX, -Math.round(this.y) + this.shakeY);
  }

  /**
   * @param {number} dt
   * @param {import('../entities/Player.js').Player} target
   * @private
   */
  _updateLookAhead(dt, target) {
    // Lead fully when running, barely at all when standing still - otherwise
    // the view drifts off-centre while the player is trying to line up a jump.
    const engagement = target.animation.moving ? 1 : 0.25;
    const desired = target.facing * LOOK_AHEAD * engagement;
    this._look = damp(this._look, desired, DAMPING.look, dt);
  }

  /**
   * Nearest view origin that keeps `focus` within `slack` pixels of the view's
   * centre. Returns the current origin unchanged while the focus is inside.
   *
   * @param {number} origin - Current view origin on this axis.
   * @param {number} focus - Point being tracked.
   * @param {number} size - View size on this axis.
   * @param {number} slack - Half-size of the dead zone.
   * @returns {number}
   * @private
   */
  _applyDeadZone(origin, focus, size, slack) {
    const center = origin + size / 2;

    if (focus > center + slack) return focus - slack - size / 2;
    if (focus < center - slack) return focus + slack - size / 2;
    return origin;
  }

  /**
   * Keep the view inside the level. Levels smaller than the view on an axis are
   * pinned to 0 rather than centred, so the edge of the world stays put.
   *
   * @private
   */
  _clampToLevel() {
    const maxX = Math.max(0, this._map.pixelWidth - this.width);
    const maxY = Math.max(0, this._map.pixelHeight - this.height);

    this.x = Math.min(Math.max(this.x, 0), maxX);
    this.y = Math.min(Math.max(this.y, 0), maxY);
  }
}
