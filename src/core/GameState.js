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
import { LevelTimer } from './LevelTimer.js';

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
    /**
     * The level's countdown. Built once and restarted per level rather than
     * replaced, so anything holding a reference to it stays valid.
     * @type {LevelTimer}
     */
    this.timer = new LevelTimer();

    this.reset();
  }

  /** Back to a fresh run. */
  reset() {
    /** @type {string} */
    this.phase = PHASE.PLAYING;

    /** Which level this run is of, as shown to the player. @type {number} */
    this.levelNumber = 1;

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

    /** Beacons lit this run. @type {number} */
    this.checkpoints = 0;

    /** Beacons the level contains, for the "1 / 3" readout. @type {number} */
    this.checkpointTotal = 0;

    /** Seconds remaining on the game-over pause. @type {number} @private */
    this._restartTimer = 0;

    this.timer.restart();
  }

  /** Seconds of play elapsed. @returns {number} */
  get time() {
    return this.timer.elapsed;
  }

  /** True while the world should simulate. @returns {boolean} */
  get running() {
    return this.phase === PHASE.PLAYING || this.phase === PHASE.OPENING;
  }

  /**
   * Advance the clock. It only runs during ordinary play, so it stops the
   * moment the chest is touched - the completion time reflects the game played,
   * not how long the animation ran - and it stops dead while a menu is up.
   *
   * @param {number} dt
   * @returns {boolean} True on the single step the countdown runs out.
   */
  update(dt) {
    if (this.phase === PHASE.GAME_OVER) this._restartTimer -= dt;
    if (this.phase !== PHASE.PLAYING) {
      this.timer.stop();
      return false;
    }

    // Re-arm after anything that stopped it: a pause, or the frame the level
    // was loaded on.
    if (!this.timer.running && !this.timer.expired) this.timer.resume();

    return this.timer.update(dt);
  }

  /** True once the countdown has run out. @returns {boolean} */
  get outOfTime() {
    return this.timer.expired;
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
   * Record a beacon being lit. The count is the world's to police - the world
   * refuses a second lighting - so this only ever counts what actually
   * happened.
   */
  lightCheckpoint() {
    this.checkpoints += 1;
    this.addScore(RULES.checkpointScore);
  }

  /** True once every beacon in the level is lit. @returns {boolean} */
  get allCheckpointsLit() {
    return this.checkpointTotal > 0 && this.checkpoints >= this.checkpointTotal;
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
   * Points for finishing quickly: whatever is left on the clock, at a fixed
   * rate per second. Simple enough that a player can feel it ticking away.
   *
   * @returns {number}
   */
  get timeBonus() {
    return Math.max(0, Math.round(this.timer.remaining * RULES.timeBonusPerSecond));
  }

  /**
   * Elapsed time as `m:ss`.
   * @returns {string}
   */
  get formattedTime() {
    return this.timer.formattedElapsed;
  }

  /**
   * Time left as `mm:ss` - the countdown the HUD shows.
   * @returns {string}
   */
  get formattedRemaining() {
    return this.timer.formatted;
  }
}
