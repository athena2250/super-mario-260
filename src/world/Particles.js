/**
 * Particle burst system.
 *
 * A single fixed-size pool shared by every effect in the game. Emitting never
 * allocates: it claims dead slots, and when the pool is full the oldest
 * particles are simply overwritten. That trade - dropping a few sparks during a
 * very busy moment - is much better than a GC pause mid-jump.
 *
 * @module world/Particles
 */

import { PALETTE } from '../core/Config.js';

/** Pool size. Comfortably more than any single burst needs. */
const CAPACITY = 220;

export class Particles {
  constructor() {
    /**
     * @type {Array<{
     *   x: number, y: number, prevX: number, prevY: number,
     *   vx: number, vy: number, life: number, maxLife: number,
     *   gravity: number, size: number, color: string, active: boolean
     * }>}
     * @private
     */
    this._pool = Array.from({ length: CAPACITY }, () => ({
      x: 0, y: 0, prevX: 0, prevY: 0,
      vx: 0, vy: 0, life: 0, maxLife: 1,
      gravity: 0, size: 1, color: PALETTE.lantern, active: false,
    }));

    /** Next slot to overwrite when the pool is full. @type {number} @private */
    this._cursor = 0;
  }

  /**
   * Emit a burst.
   *
   * @param {object} options
   * @param {number} options.x - Centre of the burst, world coordinates.
   * @param {number} options.y
   * @param {number} [options.count=10]
   * @param {string} [options.color]
   * @param {number} [options.speed=60] - Base outward speed.
   * @param {number} [options.spread=1] - Fraction of speed randomised per spark.
   * @param {number} [options.gravity=240] - 0 for sparks that hang in the air.
   * @param {number} [options.life=0.5] - Seconds before a spark fades out.
   * @param {number} [options.size=1]
   * @param {number} [options.upwardBias=0] - Extra initial upward speed.
   */
  emit({
    x,
    y,
    count = 10,
    color = PALETTE.lantern,
    speed = 60,
    spread = 1,
    gravity = 240,
    life = 0.5,
    size = 1,
    upwardBias = 0,
  }) {
    for (let i = 0; i < count; i++) {
      const particle = this._claim();

      // Even angular distribution with a random jitter, so bursts look round
      // rather than clumped.
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
      const magnitude = speed * (1 - spread / 2 + Math.random() * spread);

      particle.x = x;
      particle.y = y;
      particle.prevX = x;
      particle.prevY = y;
      particle.vx = Math.cos(angle) * magnitude;
      particle.vy = Math.sin(angle) * magnitude - upwardBias;
      particle.life = life * (0.7 + Math.random() * 0.6);
      particle.maxLife = particle.life;
      particle.gravity = gravity;
      particle.size = size;
      particle.color = color;
      particle.active = true;
    }
  }

  /**
   * Advance every live particle.
   *
   * @param {number} dt - Timestep in seconds.
   */
  update(dt) {
    for (const particle of this._pool) {
      if (!particle.active) continue;

      particle.life -= dt;
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }

      particle.prevX = particle.x;
      particle.prevY = particle.y;
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
  }

  /** Deactivate everything. Used when a level restarts. */
  clear() {
    for (const particle of this._pool) particle.active = false;
  }

  /**
   * Draw. Called inside the camera transform, in world coordinates.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha - Interpolation factor from the loop.
   */
  render(ctx, alpha) {
    for (const particle of this._pool) {
      if (!particle.active) continue;

      const x = particle.prevX + (particle.x - particle.prevX) * alpha;
      const y = particle.prevY + (particle.y - particle.prevY) * alpha;

      // Fading on the square of remaining life keeps sparks bright for most of
      // their life and then vanishing quickly, rather than dimming throughout.
      const remaining = particle.life / particle.maxLife;
      ctx.globalAlpha = remaining * remaining;
      ctx.fillStyle = particle.color;
      ctx.fillRect(Math.round(x), Math.round(y), particle.size, particle.size);
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Find a slot to write into: a dead one if possible, otherwise the oldest.
   *
   * @returns {object}
   * @private
   */
  _claim() {
    for (let i = 0; i < CAPACITY; i++) {
      const index = (this._cursor + i) % CAPACITY;
      if (!this._pool[index].active) {
        this._cursor = (index + 1) % CAPACITY;
        return this._pool[index];
      }
    }

    const recycled = this._pool[this._cursor];
    this._cursor = (this._cursor + 1) % CAPACITY;
    return recycled;
  }
}
