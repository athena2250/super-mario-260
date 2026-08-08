/**
 * What the player has done so far.
 *
 * Deliberately separate from {@link GameState}, which is one run of one level
 * and is thrown away every time a level loads. This survives all of that: which
 * levels are unlocked, which are finished, and the best result on each.
 *
 * It saves itself to a {@link SaveSlot} after every change, and everything it
 * loads is treated as hostile: the stored text is user-editable, may be left
 * over from a build with a different number of levels, and may simply be
 * corrupt. Anything that does not survive validation is dropped rather than
 * trusted, so the worst a mangled save can do is lose progress.
 *
 * @module core/Progress
 */

import { SaveSlot } from './Storage.js';

/**
 * Storage key. Versioned: a future format change ignores old saves outright
 * rather than trying to migrate something it may not understand.
 */
export const SAVE_KEY = 'lumenHollow.progress.v1';

/**
 * Coerce a stored number into a sane one. Anything missing, negative, infinite
 * or non-numeric becomes zero.
 *
 * @param {unknown} value
 * @returns {number}
 */
function safeNumber(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Validate one stored level result.
 *
 * @param {unknown} entry
 * @returns {import('./Progress.js').LevelResult|null}
 */
function safeResult(entry) {
  if (typeof entry !== 'object' || entry === null) return null;

  return {
    time: safeNumber(entry.time),
    score: safeNumber(entry.score),
    shards: safeNumber(entry.shards),
    shardTotal: safeNumber(entry.shardTotal),
    defeated: safeNumber(entry.defeated),
  };
}

/**
 * @typedef {object} LevelResult
 * @property {number} time - Completion time in seconds.
 * @property {number} score
 * @property {number} shards
 * @property {number} shardTotal
 * @property {number} defeated
 */

export class Progress {
  /**
   * @param {number} levelCount - How many levels the campaign has.
   * @param {SaveSlot} [slot] - Where to persist. Injectable for tests.
   */
  constructor(levelCount, slot = new SaveSlot(SAVE_KEY)) {
    /** @type {number} */
    this.levelCount = levelCount;

    /** @type {SaveSlot} @private */
    this._slot = slot;

    /**
     * Best result per level index, or null if never finished.
     * @type {Array<LevelResult|null>}
     */
    this.results = new Array(levelCount).fill(null);

    this.load();
  }

  /** Whether progress will survive a refresh. @returns {boolean} */
  get persistent() {
    return this._slot.available;
  }

  /**
   * Read saved progress, keeping only what validates.
   *
   * A save from a build with more levels is truncated and one with fewer is
   * padded, so changing the campaign's length degrades to "some levels are
   * locked again" rather than to a crash.
   *
   * @returns {boolean} True if anything was restored.
   */
  load() {
    const data = this._slot.read();
    if (!data || !Array.isArray(data.results)) return false;

    this.results = Array.from({ length: this.levelCount }, (_, index) =>
      safeResult(data.results[index]),
    );

    return this.results.some((result) => result !== null);
  }

  /** Write current progress. @returns {boolean} Whether it was stored. */
  save() {
    return this._slot.write({ version: 1, results: this.results });
  }

  /**
   * Levels are unlocked in order: the first always, and each one after that by
   * finishing the one before it.
   *
   * @param {number} index
   * @returns {boolean}
   */
  isUnlocked(index) {
    if (index === 0) return true;
    return this.isCompleted(index - 1);
  }

  /**
   * @param {number} index
   * @returns {boolean}
   */
  isCompleted(index) {
    return this.results[index] != null;
  }

  /** How many levels are currently playable. @returns {number} */
  get unlockedCount() {
    let count = 0;
    for (let i = 0; i < this.levelCount; i++) {
      if (this.isUnlocked(i)) count += 1;
    }
    return count;
  }

  /** True once every level has been finished. @returns {boolean} */
  get allCompleted() {
    return this.results.every((result) => result != null);
  }

  /**
   * Record a finished level, keeping the better of the old and new results.
   *
   * "Better" is judged on score, not time: the game rewards finding things, and
   * a fast run that skipped half the level should not overwrite a thorough one.
   *
   * @param {number} index
   * @param {LevelResult} result
   * @returns {boolean} True if this completion unlocked something new.
   */
  record(index, result) {
    const first = !this.isCompleted(index);
    const previous = this.results[index];

    if (!previous || result.score > previous.score) {
      this.results[index] = { ...result };
    }

    this.save();
    return first && index + 1 < this.levelCount;
  }

  /**
   * Totals across every finished level, for the closing screen.
   * @returns {{score: number, time: number, shards: number, defeated: number, completed: number}}
   */
  get totals() {
    const totals = { score: 0, time: 0, shards: 0, defeated: 0, completed: 0 };

    for (const result of this.results) {
      if (!result) continue;
      totals.score += result.score;
      totals.time += result.time;
      totals.shards += result.shards;
      totals.defeated += result.defeated;
      totals.completed += 1;
    }
    return totals;
  }

  /** Forget everything, on disk as well as in memory. */
  reset() {
    this.results = new Array(this.levelCount).fill(null);
    this._slot.clear();
  }
}
