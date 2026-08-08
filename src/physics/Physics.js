/**
 * Shared physics helpers.
 *
 * Free functions rather than a class: they operate on any object with `vy` /
 * `vx`, so the player, enemies (Milestone 7) and loose objects all fall with
 * the same code and the same feel. Anything that needs different behaviour
 * passes an override rather than reimplementing the integration.
 *
 * @module physics/Physics
 */

import { PHYSICS } from '../core/Config.js';

/**
 * Accelerate a body downward for one step and clamp to terminal velocity.
 *
 * Gravity is not constant. Three regimes, in priority order:
 *
 *   1. Near the apex it is *weaker*, buying a moment of hang time that makes
 *      mid-air aiming readable.
 *   2. While falling it is *stronger*, so descents feel weighty rather than
 *      floaty - the single biggest contributor to a jump feeling good.
 *   3. Otherwise (rising) it is the base value, which is what the jump height
 *      was tuned against.
 *
 * @param {{vy: number}} body - Anything with a vertical velocity.
 * @param {number} dt - Timestep in seconds.
 * @param {object} [options]
 * @param {number} [options.gravity] - Override base gravity.
 * @param {number} [options.maxFall] - Override terminal velocity.
 */
export function applyGravity(body, dt, options = {}) {
  const gravity = options.gravity ?? PHYSICS.gravity;
  const maxFall = options.maxFall ?? PHYSICS.maxFallSpeed;

  let scale = 1;
  if (Math.abs(body.vy) < PHYSICS.apexThreshold) {
    scale = PHYSICS.apexMultiplier;
  } else if (body.vy > 0) {
    scale = PHYSICS.fallMultiplier;
  }

  body.vy = Math.min(body.vy + gravity * scale * dt, maxFall);
}
