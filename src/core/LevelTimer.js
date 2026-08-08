/**
 * The five-minute countdown a level is played against.
 *
 * **Why it counts simulation time rather than sampling the wall clock.** The
 * loop is a fixed-step accumulator: `update` is called with exactly 1/60 s and
 * exactly sixty times per second of real time, whatever the display refreshes
 * at. Subtracting `dt` here is therefore already independent of frame rate -
 * it is a fixed amount per *simulation step*, not per rendered frame, and 30 Hz,
 * 60 Hz and 144 Hz all burn the clock at the same rate.
 *
 * Sampling `performance.now()` instead would be worse, not better: it would
 * keep running through a stall the player cannot play through, and it would
 * drift away from the simulation the moment the loop drops catch-up steps. The
 * clock the player is racing should measure the game they actually got to play.
 *
 * @module core/LevelTimer
 */

import { TIMER } from './Config.js';

/**
 * How urgent the remaining time is. Ordered, so the interface can simply
 * compare.
 * @enum {number}
 */
export const URGENCY = Object.freeze({
  CALM: 0,
  WARN: 1,
  ALARM: 2,
  CRITICAL: 3,
});

export class LevelTimer {
  /**
   * @param {number} [duration=TIMER.levelSeconds] - Seconds on the clock.
   */
  constructor(duration = TIMER.levelSeconds) {
    /** @type {number} */
    this.duration = duration;

    /** Seconds left, never below zero. @type {number} */
    this.remaining = duration;

    /** Whether `update` advances the clock. @type {boolean} */
    this.running = false;
  }

  /** Seconds of play so far. @returns {number} */
  get elapsed() {
    return this.duration - this.remaining;
  }

  /** True once the clock has run out. @returns {boolean} */
  get expired() {
    return this.remaining <= 0;
  }

  /**
   * Whole seconds left, as displayed. Rounded *up*, so the readout shows the
   * full duration on the first frame and only reads 00:00 when the time really
   * is gone.
   *
   * @returns {number}
   */
  get wholeSecondsLeft() {
    return Math.ceil(this.remaining - 0.0001);
  }

  /** How close the clock is to zero. @returns {number} A {@link URGENCY} value. */
  get urgency() {
    if (this.remaining <= TIMER.criticalAt) return URGENCY.CRITICAL;
    if (this.remaining <= TIMER.alarmAt) return URGENCY.ALARM;
    if (this.remaining <= TIMER.warnAt) return URGENCY.WARN;
    return URGENCY.CALM;
  }

  /**
   * The clock as `MM:SS`.
   * @returns {string}
   */
  get formatted() {
    const total = Math.max(0, this.wholeSecondsLeft);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * Time survived, as `M:SS` - what a results screen wants to show.
   * @returns {string}
   */
  get formattedElapsed() {
    const total = Math.floor(this.elapsed);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * Put a full clock back and start it.
   *
   * @param {number} [duration=this.duration]
   */
  restart(duration = this.duration) {
    this.duration = duration;
    this.remaining = duration;
    this.running = true;
  }

  /** Stop the clock where it is. Pausing, and finishing, both use this. */
  stop() {
    this.running = false;
  }

  /** Continue from where it stopped. */
  resume() {
    this.running = true;
  }

  /**
   * Advance the clock by one simulation step.
   *
   * @param {number} dt - Always FIXED_STEP.
   * @returns {boolean} True on the single step the clock runs out, so the
   *   caller can react exactly once.
   */
  update(dt) {
    if (!this.running || this.expired) return false;

    this.remaining = Math.max(0, this.remaining - dt);
    if (!this.expired) return false;

    this.running = false;
    return true;
  }
}
