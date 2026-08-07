/**
 * Fixed-timestep game loop.
 *
 * Simulation and rendering are decoupled: `update` always advances by exactly
 * FIXED_STEP seconds, while `render` runs once per animation frame and receives
 * an interpolation factor. This is the standard accumulator loop, and it is
 * what makes the game behave identically on a 60 Hz laptop, a 120 Hz phone and
 * a 144 Hz monitor - jump heights and run speeds stop being frame-rate
 * dependent, and physics never sees a variable dt that could tunnel a body
 * through a wall.
 *
 * @module core/Loop
 */

import {
  FIXED_STEP,
  MAX_FRAME_TIME,
  MAX_STEPS_PER_FRAME,
} from './Config.js';

export class Loop {
  /**
   * @param {object} callbacks
   * @param {(dt: number) => void} callbacks.update - Advance the simulation by
   *   `dt` seconds. Always called with exactly FIXED_STEP.
   * @param {(alpha: number) => void} callbacks.render - Draw a frame. `alpha`
   *   is 0..1, the fraction of a step between the previous and current
   *   simulation states, for positional interpolation.
   */
  constructor({ update, render }) {
    if (typeof update !== 'function' || typeof render !== 'function') {
      throw new TypeError('Loop requires update and render callbacks');
    }

    /** @private */
    this._update = update;
    /** @private */
    this._render = render;

    /** Whether the loop is currently scheduling frames. @type {boolean} */
    this.running = false;

    /** Smoothed frames per second, for the debug readout. @type {number} */
    this.fps = 0;

    /** Total simulated time in seconds. Useful for animation phases. */
    this.elapsed = 0;

    /** Leftover simulation time carried between frames. @private */
    this._accumulator = 0;
    /** Timestamp of the previous frame, in ms. @private */
    this._lastTime = 0;
    /** Handle from requestAnimationFrame. @private */
    this._frameHandle = 0;

    /** Rolling FPS sample window. @private */
    this._fpsElapsed = 0;
    /** @private */
    this._fpsFrames = 0;

    this._frame = this._frame.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
  }

  /** Start running. Safe to call when already running. */
  start() {
    if (this.running) return;
    this.running = true;

    // Discard any wall-clock time that passed while stopped.
    this._lastTime = performance.now();
    this._accumulator = 0;

    document.addEventListener('visibilitychange', this._onVisibilityChange);
    this._frameHandle = requestAnimationFrame(this._frame);
  }

  /** Stop running and release the animation frame. Safe to call when stopped. */
  stop() {
    if (!this.running) return;
    this.running = false;

    cancelAnimationFrame(this._frameHandle);
    this._frameHandle = 0;
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
  }

  /**
   * One animation frame.
   *
   * @param {number} timestamp - High-resolution time in ms from rAF.
   * @private
   */
  _frame(timestamp) {
    if (!this.running) return;

    // Schedule the next frame first so a throw in update/render cannot silently
    // kill the loop forever.
    this._frameHandle = requestAnimationFrame(this._frame);

    const rawDelta = (timestamp - this._lastTime) / 1000;
    this._lastTime = timestamp;

    // Guard 1: clamp absurd deltas (backgrounded tab, breakpoint, GC pause).
    const delta = Math.min(rawDelta, MAX_FRAME_TIME);

    this._accumulator += delta;

    // Guard 2: cap catch-up work per frame.
    let steps = 0;
    while (this._accumulator >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
      this._update(FIXED_STEP);
      this._accumulator -= FIXED_STEP;
      this.elapsed += FIXED_STEP;
      steps += 1;
    }

    // Still behind after hitting the cap: abandon the backlog. Keeping it would
    // guarantee we fall further behind on every subsequent frame.
    if (this._accumulator >= FIXED_STEP) {
      this._accumulator = 0;
    }

    this._trackFps(delta);

    // alpha positions the render between the last two simulation states, so
    // motion stays smooth even when the display rate is not a multiple of 60.
    this._render(this._accumulator / FIXED_STEP);
  }

  /**
   * Update the smoothed FPS figure roughly twice a second - often enough to be
   * responsive, rarely enough to stay readable.
   *
   * @param {number} delta - Frame delta in seconds.
   * @private
   */
  _trackFps(delta) {
    this._fpsElapsed += delta;
    this._fpsFrames += 1;

    if (this._fpsElapsed >= 0.5) {
      this.fps = this._fpsFrames / this._fpsElapsed;
      this._fpsElapsed = 0;
      this._fpsFrames = 0;
    }
  }

  /**
   * Reset the clock when the tab becomes visible again.
   *
   * Browsers stop firing rAF for hidden tabs, so on return the first timestamp
   * would otherwise produce a huge delta. MAX_FRAME_TIME would already contain
   * it, but resetting means zero catch-up steps at all: the game resumes
   * exactly where the player left it.
   *
   * @private
   */
  _onVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    this._lastTime = performance.now();
    this._accumulator = 0;
  }
}
