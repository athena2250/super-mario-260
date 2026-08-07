/**
 * Base class for the Hollow's creatures.
 *
 * Holds everything the three species share: spawn memory (so a level restart
 * puts them all back), the defeat animation, and the "is this touch a stomp or
 * a hit?" test. Species-specific movement lives in the subclasses, which
 * override `think()` rather than `update()` - that way none of them can forget
 * to save their previous position or tick their animation clock.
 *
 * @module entities/Enemy
 */

import { Entity } from './Entity.js';
import { ENEMY } from '../core/Config.js';

/**
 * How far above an enemy's top edge Pip's feet may be and still count as a
 * stomp. Generous on purpose: the alternative is players being damaged by a
 * jump they read as a clean landing.
 */
const STOMP_REACH = 7;

export class Enemy extends Entity {
  /**
   * @param {number} x - Left edge of the collision box.
   * @param {number} y - Top edge of the collision box.
   * @param {number} width
   * @param {number} height
   */
  constructor(x, y, width, height) {
    super(x, y, width, height);

    /** Everything needed to put this creature back where it started. @private */
    this._spawn = { x, y };

    /** Facing direction: -1 left, +1 right. @type {number} */
    this.facing = 1;

    /** Seconds alive, driving idle animation. @type {number} */
    this.animTime = 0;

    /** True once stomped; the body lingers only to play its defeat. */
    this.defeated = false;

    /** Seconds of defeat animation remaining. @type {number} @private */
    this._defeatTimer = 0;
  }

  /** Can this creature still hurt Pip? @returns {boolean} */
  get dangerous() {
    return this.alive && !this.defeated;
  }

  /**
   * Advance one step. Subclasses implement `think()` instead of overriding
   * this, so the shared bookkeeping always runs.
   *
   * @param {number} dt - Timestep in seconds.
   * @param {import('../world/TileMap.js').TileMap} map
   */
  update(dt, map) {
    this.savePrevious();
    this.animTime += dt;

    if (this.defeated) {
      this._defeatTimer -= dt;
      if (this._defeatTimer <= 0) this.alive = false;
      return;
    }

    this.think(dt, map);
  }

  /**
   * Species behaviour. Subclasses override.
   *
   * @param {number} _dt
   * @param {import('../world/TileMap.js').TileMap} _map
   */
  think(_dt, _map) {}

  /**
   * Decide how a touch between Pip and this creature resolves.
   *
   * A stomp requires Pip to be *descending* and to have his feet in the band
   * near the creature's top. Requiring downward motion is what stops a player
   * who runs into a creature's side at head height from being credited with a
   * kill they did not earn.
   *
   * @param {import('./Player.js').Player} player
   * @returns {boolean} True if this touch is a stomp.
   */
  isStompedBy(player) {
    return player.vy > 0 && player.bottom - this.top <= STOMP_REACH;
  }

  /** Begin the defeat animation. Progress is exposed via {@link defeatProgress}. */
  defeat() {
    if (this.defeated) return;
    this.defeated = true;
    this._defeatTimer = ENEMY.deathTime;
    this.vx = 0;
    this.vy = 0;
  }

  /**
   * Defeat animation progress, 0 at the moment of the stomp through 1 at
   * disappearance.
   *
   * @returns {number}
   */
  get defeatProgress() {
    if (!this.defeated) return 0;
    return 1 - Math.max(0, this._defeatTimer) / ENEMY.deathTime;
  }

  /** Return to the spawn position with all state cleared. */
  reset() {
    this.x = this._spawn.x;
    this.y = this._spawn.y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.animTime = 0;
    this.alive = true;
    this.defeated = false;
    this._defeatTimer = 0;
    this.snapToPosition();
  }

  /**
   * Shared squash-and-fade applied while a creature is being defeated. Returns
   * the vertical offset and scale the sprite should be drawn with, so each
   * species can keep its own artwork while sharing the timing.
   *
   * @returns {{squash: number, alpha: number, drop: number}}
   */
  getDefeatPose() {
    const t = this.defeatProgress;
    return {
      // Flattens to a quarter height, which reads as "popped" at 16 px.
      squash: 1 - t * 0.75,
      alpha: 1 - t * t,
      drop: Math.round(t * 4),
    };
  }
}
