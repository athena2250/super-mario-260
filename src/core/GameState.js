/**
 * Run state: lives, score, timer and the phase the game is in.
 *
 * Kept separate from {@link Game} so that what the HUD and the victory screen
 * read is a small, inspectable object rather than a dozen fields spread across
 * the game root.
 *
 * @module core/GameState
 */

import { RULES } from './Config.js';

/**
 * Phases the game moves through.
 * @enum {string}
 */
export const PHASE = Object.freeze({
  /** Normal play. */
  PLAYING: 'playing',
  /** The chest is mid-animation; input is ignored but the world still runs. */
  OPENING: 'opening',
  /** The results screen is up. */
  VICTORY: 'victory',
  /** Out of lives; the level is about to restart. */
  GAME_OVER: 'gameOver',
});

export class GameState {
  constructor() {
    this.reset();
  }

  /** Back to a fresh run. */
  reset() {
    /** @type {string} */
    this.phase = PHASE.PLAYING;

    /** @type {number} */
    this.lives = RULES.startingLives;

    /** @type {number} */
    this.score = 0;

    /** Shards picked up this run. @type {number} */
    this.shards = 0;

    /** Shards present in the level, for the "3 / 18" readout. @type {number} */
    this.shardTotal = 0;

    /** Creatures defeated this run. @type {number} */
    this.defeated = 0;

    /** Seconds of play elapsed. @type {number} */
    this.time = 0;

    /** Seconds remaining on the game-over pause. @type {number} @private */
    this._restartTimer = 0;
  }

  /** True while the world should simulate. @returns {boolean} */
  get running() {
    return this.phase === PHASE.PLAYING || this.phase === PHASE.OPENING;
  }

  /**
   * Advance the clock. The timer stops the moment the chest is touched, so the
   * completion time reflects play rather than how long the animation ran.
   *
   * @param {number} dt
   */
  update(dt) {
    if (this.phase === PHASE.PLAYING) this.time += dt;
    if (this.phase === PHASE.GAME_OVER) this._restartTimer -= dt;
  }

  /** @param {number} amount */
  addScore(amount) {
    this.score += amount;
  }

  /** Record a shard pickup. */
  collectShard() {
    this.shards += 1;
    this.addScore(RULES.shardScore);
  }

  /** Record a defeated creature. */
  recordStomp() {
    this.defeated += 1;
    this.addScore(RULES.stompScore);
  }

  /**
   * Take a hit.
   *
   * @returns {boolean} True if that was the last life.
   */
  loseLife() {
    this.lives -= 1;
    if (this.lives > 0) return false;

    this.phase = PHASE.GAME_OVER;
    this._restartTimer = 2.2;
    return true;
  }

  /** True once the game-over pause has run its course. @returns {boolean} */
  get readyToRestart() {
    return this.phase === PHASE.GAME_OVER && this._restartTimer <= 0;
  }

  /** The chest has been touched. */
  beginOpening() {
    this.phase = PHASE.OPENING;
  }

  /**
   * The chest animation has finished. Awards the time bonus and freezes the
   * run.
   *
   * @returns {number} The time bonus awarded.
   */
  finish() {
    const bonus = this.timeBonus;
    this.addScore(bonus);
    this.phase = PHASE.VICTORY;
    return bonus;
  }

  /**
   * Points for finishing quickly: a fixed pot that decays by one per second,
   * never below zero. Simple enough that a player can feel it ticking.
   *
   * @returns {number}
   */
  get timeBonus() {
    return Math.max(0, Math.round(RULES.timeBonusStart - this.time));
  }

  /**
   * Elapsed time as `m:ss`.
   * @returns {string}
   */
  get formattedTime() {
    const total = Math.floor(this.time);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
}
