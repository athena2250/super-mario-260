/**
 * Pip's animation state.
 *
 * Kept apart from {@link Player} so that movement code stays about physics and
 * this stays about presentation: nothing here feeds back into the simulation,
 * and changing how Pip *looks* never risks changing how he *moves*.
 *
 * @module entities/PlayerAnimation
 */

import { PHYSICS, PLAYER } from '../core/Config.js';

/**
 * Pixels travelled per half of the walk cycle. Tying the animation to distance
 * rather than to time is what stops the legs from skating: the feet land at the
 * same points on the ground whatever the speed.
 */
const STRIDE = 9;

/** Fall speed below which a landing is too gentle to be worth a squash pose. */
const SQUASH_THRESHOLD = 130;

export class PlayerAnimation {
  constructor() {
    /** Seconds since spawn, driving idle and glow rhythms. @type {number} */
    this.animTime = 0;

    /** Position within the walk cycle, 0..1. @type {number} */
    this.walkPhase = 0;

    /** True while moving fast enough to animate a walk. @type {boolean} */
    this.moving = false;

    /** Seconds of landing-squash pose remaining. @type {number} @private */
    this._landTimer = 0;
  }

  /** True while the landing impact pose should be drawn. @returns {boolean} */
  get squashing() {
    return this._landTimer > 0;
  }

  /**
   * Advance the animation clock.
   *
   * @param {number} dt - Timestep in seconds.
   * @param {import('./Player.js').Player} player
   */
  update(dt, player) {
    this.animTime += dt;
    this._landTimer = Math.max(0, this._landTimer - dt);

    const speed = Math.abs(player.vx);
    this.moving = speed > PLAYER.minSpeed;

    if (this.moving && player.grounded) {
      // Wrapping keeps the phase in 0..1 without unbounded growth.
      this.walkPhase = (this.walkPhase + (speed * dt) / STRIDE) % 1;
    } else if (!this.moving) {
      this.walkPhase = 0;
    }
  }

  /**
   * Register a touchdown. Only landings with real force behind them squash, so
   * stepping off a one-pixel lip does not trigger the pose.
   *
   * @param {number} impactSpeed - Downward speed at the moment of contact.
   */
  land(impactSpeed) {
    if (impactSpeed > SQUASH_THRESHOLD) this._landTimer = PHYSICS.landingTime;
  }

  /**
   * One-pixel vertical bounce: on the walk cycle while moving, on a slow
   * breathing rhythm while idle.
   *
   * @param {boolean} grounded
   * @returns {number} 0 or -1.
   */
  bobOffset(grounded) {
    // Airborne and squashed poses set their own vertical shape; a walk bob on
    // top of either would fight with it.
    if (!grounded || this.squashing) return 0;
    if (this.moving) return this.walkPhase < 0.5 ? -1 : 0;
    return Math.sin(this.animTime * 2.4) > 0.4 ? -1 : 0;
  }

  /**
   * Lantern brightness pulse, 0..1. Beats faster when Pip is exerting himself.
   *
   * @returns {number}
   */
  glowPulse() {
    const rate = this.moving ? 6 : 2.2;
    return (Math.sin(this.animTime * rate) + 1) / 2;
  }
}
