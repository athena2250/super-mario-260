/**
 * Jump timing and forgiveness.
 *
 * Split out of Player because jump *feel* is the most heavily tuned part of a
 * platformer and deserves to be readable and testable on its own. It owns three
 * things that separate a good jump from a frustrating one:
 *
 *   - **Coyote time** - a jump pressed just after walking off a ledge still
 *     fires. Players press late constantly; without this the game feels like it
 *     drops inputs.
 *   - **Jump buffering** - a jump pressed just before landing fires on
 *     touchdown instead of being lost. The same problem at the other end.
 *   - **Variable height** - releasing the button mid-rise cuts the remaining
 *     upward velocity, so tapping hops and holding leaps.
 *
 * @module entities/JumpController
 */

import { PHYSICS } from '../core/Config.js';

export class JumpController {
  constructor() {
    /** Seconds of coyote grace remaining. @type {number} @private */
    this._coyote = 0;

    /** Seconds a buffered jump press stays valid. @type {number} @private */
    this._buffer = 0;

    /** True from launch until the rise ends. @type {boolean} */
    this.rising = false;
  }

  /**
   * Resolve jumping for one step, mutating `body.vy` when a jump fires or is
   * cut short.
   *
   * @param {number} dt - Timestep in seconds.
   * @param {import('../input/Input.js').Input} input
   * @param {{vy: number}} body
   * @param {boolean} grounded - Whether the body is standing on something.
   * @returns {boolean} True on the step a jump launches, so the caller can
   *   trigger effects and sound.
   */
  update(dt, input, body, grounded) {
    this._tickTimers(dt, input, grounded);

    let launched = false;
    if (this._buffer > 0 && this._coyote > 0) {
      body.vy = -PHYSICS.jumpSpeed;
      // Both windows are spent, so one press can never produce two jumps.
      this._buffer = 0;
      this._coyote = 0;
      this.rising = true;
      launched = true;
    }

    this._applyJumpCut(input, body, launched);
    return launched;
  }

  /** Cancel any in-progress jump state. Call when Pip is hurt or respawned. */
  reset() {
    this._coyote = 0;
    this._buffer = 0;
    this.rising = false;
  }

  /**
   * @param {number} dt
   * @param {import('../input/Input.js').Input} input
   * @param {boolean} grounded
   * @private
   */
  _tickTimers(dt, input, grounded) {
    // Standing on ground refills coyote time; leaving it starts the countdown.
    this._coyote = grounded ? PHYSICS.coyoteTime : Math.max(0, this._coyote - dt);

    if (input.justPressed('jump')) {
      this._buffer = PHYSICS.jumpBufferTime;
    } else {
      this._buffer = Math.max(0, this._buffer - dt);
    }
  }

  /**
   * Shorten the jump when the button is released early.
   *
   * @param {import('../input/Input.js').Input} input
   * @param {{vy: number}} body
   * @param {boolean} launched - True if the jump started this very step.
   * @private
   */
  _applyJumpCut(input, body, launched) {
    if (!this.rising) return;

    // The rise is over once Pip stops moving up, whether that is from the cut,
    // gravity, or a ceiling.
    if (body.vy >= 0) {
      this.rising = false;
      return;
    }

    // Skipping the cut on the launch step guarantees a minimum jump height:
    // a press and release inside the same 1/60 s would otherwise be cut before
    // it ever moved Pip, which reads as the button not working.
    if (launched) return;

    if (input.justReleased('jump')) {
      body.vy *= PHYSICS.jumpCut;
      this.rising = false;
    }
  }
}
