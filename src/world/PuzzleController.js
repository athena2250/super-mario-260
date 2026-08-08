/**
 * The vault puzzle.
 *
 * Three rune switches must be struck in the order shown on the tablet by the
 * vault. Striking one out of order darkens all three and the attempt restarts -
 * there is no penalty beyond having to walk the route again, because the
 * challenge is meant to be the route, not the retry.
 *
 * Nothing about the solution is hidden or random: the order is written on the
 * tablet, the switches are colour-coded to match, and the bridge that will
 * appear is already outlined in the level. The player is told exactly what to
 * do; the level makes doing it hard.
 *
 * On success the bridge rises one plank at a time and the vault door dissolves,
 * giving the reward a visible cause.
 *
 * @module world/PuzzleController
 */

import { TILE as TILE_IDS } from './tiles.js';

/** Seconds between planks as the bridge raises. */
const PLANK_INTERVAL = 0.07;

/** Seconds after the last plank before the vault door opens. */
const VAULT_DELAY = 0.25;

export class PuzzleController {
  /**
   * @param {object} options
   * @param {import('./TileMap.js').TileMap} options.map
   * @param {import('../entities/RuneSwitch.js').RuneSwitch[]} options.switches
   * @param {import('../entities/RuneTablet.js').RuneTablet | null} options.tablet
   * @param {number[]} options.order - Switch indices, in the required order.
   * @param {object} [options.on] - Effect callbacks, all optional.
   * @param {(sw: import('../entities/RuneSwitch.js').RuneSwitch) => void} [options.on.correct]
   * @param {() => void} [options.on.wrong]
   * @param {() => void} [options.on.solved]
   * @param {(col: number, row: number) => void} [options.on.plank]
   * @param {(col: number, row: number) => void} [options.on.vault]
   */
  constructor({ map, switches, tablet, order, on = {} }) {
    this._map = map;
    this._switches = switches;
    this._tablet = tablet;
    this._order = order;
    this._on = on;

    /** Indices matched so far. @type {number} */
    this.progress = 0;

    /** True once the full sequence has been entered. @type {boolean} */
    this.solved = false;

    /** True once the bridge and vault have finished animating. @type {boolean} */
    this.open = false;

    // Cells to convert, captured before anything mutates the grid. Sorted so
    // the bridge raises left to right rather than in storage order.
    /** @type {Array<{col: number, row: number}>} @private */
    this._planks = map.findTiles(TILE_IDS.BRIDGE_GHOST).sort((a, b) => a.col - b.col);
    /** @type {Array<{col: number, row: number}>} @private */
    this._vaultCells = map.findTiles(TILE_IDS.VAULT);

    /** @type {number} @private */
    this._raised = 0;
    /** @type {number} @private */
    this._timer = 0;
  }

  /**
   * Handle Pip touching a switch.
   *
   * @param {import('../entities/RuneSwitch.js').RuneSwitch} runeSwitch
   * @returns {'ignored'|'correct'|'wrong'|'solved'}
   */
  activate(runeSwitch) {
    if (this.solved || runeSwitch.lit) return 'ignored';

    const expected = this._order[this.progress];

    if (runeSwitch.index !== expected) {
      this._failAttempt();
      return 'wrong';
    }

    runeSwitch.activate();
    this.progress += 1;
    if (this._tablet) this._tablet.progress = this.progress;
    this._on.correct?.(runeSwitch);

    if (this.progress >= this._order.length) {
      this.solved = true;
      this._timer = 0;
      this._on.solved?.();
      return 'solved';
    }
    return 'correct';
  }

  /**
   * Advance the bridge-raising animation.
   *
   * @param {number} dt
   */
  update(dt) {
    if (!this.solved || this.open) return;

    this._timer += dt;

    // Convert one plank per interval. A while loop rather than an if, so a
    // long frame cannot leave the animation permanently behind.
    while (this._raised < this._planks.length && this._timer >= PLANK_INTERVAL) {
      const plank = this._planks[this._raised];
      this._map.setTile(plank.col, plank.row, TILE_IDS.BRIDGE);
      this._on.plank?.(plank.col, plank.row);
      this._raised += 1;
      this._timer -= PLANK_INTERVAL;
    }

    if (this._raised < this._planks.length) return;

    if (this._timer >= VAULT_DELAY) {
      for (const cell of this._vaultCells) {
        this._map.setTile(cell.col, cell.row, TILE_IDS.EMPTY);
        this._on.vault?.(cell.col, cell.row);
      }
      this.open = true;
    }
  }

  /**
   * Darken every rune and start the sequence over.
   * @private
   */
  _failAttempt() {
    this.progress = 0;
    for (const runeSwitch of this._switches) runeSwitch.reset();
    if (this._tablet) this._tablet.progress = 0;
    this._on.wrong?.();
  }
}
