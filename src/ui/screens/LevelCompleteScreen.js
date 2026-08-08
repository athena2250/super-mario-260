/**
 * "Treasure Found!" - the results of a finished level.
 *
 * Rows count themselves in one at a time and the score tallies up rather than
 * appearing finished, because a results screen that animates reads as a reward
 * and one that does not reads as a dialog box. The buttons stay inert until the
 * tally lands, so the reward is never skipped past by a jump the player was
 * still holding when the chest opened.
 *
 * It renders from a **snapshot** taken at the moment of completion, not from
 * the live run state - the next level is loaded behind this screen while the
 * player is still reading it.
 *
 * @module ui/screens/LevelCompleteScreen
 */

import { Menu } from '../Menu.js';
import { drawText, drawTextShadowed } from '../PixelText.js';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../../core/Config.js';

/** Seconds between result rows appearing. */
const ROW_DELAY = 0.32;

/** Seconds the score spends counting up to its final value. */
const TALLY_TIME = 0.8;

/** Rows shown, in order. */
const ROW_COUNT = 5;

export class LevelCompleteScreen {
  constructor() {
    /** Drawn over the level, which is frozen on its final frame. @type {boolean} */
    this.overWorld = true;

    /** @type {Menu} */
    this.menu = new Menu([], { y: 176 });

    /**
     * The finished level's numbers, taken at the moment it was finished.
     * @type {object|null}
     * @private
     */
    this._result = null;

    /** @type {number} @private */
    this._time = 0;

    /**
     * Sparkle positions, generated once so they do not jitter between frames.
     * @private
     */
    this._sparkles = Array.from({ length: 26 }, () => ({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      phase: Math.random() * Math.PI * 2,
      size: Math.random() > 0.7 ? 2 : 1,
    }));
  }

  /**
   * Hand the screen the numbers to show. Called before the transition, so the
   * data is in place by the time the curtain lifts.
   *
   * @param {object} result
   * @param {number} result.levelNumber
   * @param {string} result.levelName
   * @param {string} result.time - Completion time, formatted.
   * @param {number} result.checkpoints
   * @param {number} result.checkpointTotal
   * @param {number} result.shards
   * @param {number} result.shardTotal
   * @param {number} result.defeated
   * @param {number} result.timeBonus
   * @param {number} result.score
   * @param {boolean} result.isFinalLevel - Changes "next level" into "finish".
   */
  present(result) {
    this._result = result;

    this.menu.setItems([
      result.isFinalLevel
        ? { id: 'finish', label: 'FINISH', color: PALETTE.runeVerdant }
        : { id: 'nextLevel', label: 'CONTINUE', color: PALETTE.runeVerdant },
      { id: 'replay', label: 'REPLAY LEVEL' },
      { id: 'mainMenu', label: 'MAIN MENU' },
    ]);
  }

  /** Called every time the screen becomes current. */
  enter() {
    this._time = 0;
    this.menu.reset();
  }

  /** True once every row has appeared and the score has finished counting. */
  get settled() {
    return this._time > ROW_DELAY * ROW_COUNT + TALLY_TIME;
  }

  /**
   * @param {number} dt
   * @param {import('../../input/Input.js').Input} input
   * @param {import('../../input/Pointer.js').Pointer} pointer
   * @returns {{action: string, id?: string}|null}
   */
  update(dt, input, pointer) {
    this._time += dt;

    // Nothing happens until the results have finished arriving: the reward is
    // not skippable, and the game never moves on by itself - the player is
    // asked, and the game waits for as long as it takes them to answer.
    if (!this.settled) return null;

    return this.menu.update(dt, input, pointer);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (!this._result) return;

    // Dim the level behind, easing in so the transition is not a hard cut.
    ctx.globalAlpha = Math.min(0.86, this._time * 2.5);
    ctx.fillStyle = PALETTE.skyTop;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.globalAlpha = 1;

    this._renderSparkles(ctx);

    const centerX = GAME_WIDTH / 2;

    drawTextShadowed(ctx, 'TREASURE FOUND!', centerX, 20, {
      color: PALETTE.lanternCore,
      align: 'center',
      scale: 3,
    });
    drawText(ctx, `LEVEL ${this._result.levelNumber} COMPLETE`, centerX, 40, {
      color: PALETTE.lantern,
      align: 'center',
    });

    // Underline that draws itself outward from the centre.
    const sweep = Math.min(1, this._time * 1.6) * 92;
    ctx.fillStyle = PALETTE.lantern;
    ctx.fillRect(centerX - sweep, 50, sweep * 2, 1);

    this._renderRows(ctx, centerX);
    this._renderScore(ctx, centerX);

    if (!this.settled) return;

    this._renderPrompt(ctx, centerX);
    this.menu.render(ctx);
  }

  /**
   * The question the buttons answer. Naming the level being offered is what
   * turns three buttons into a decision the player can make without reading all
   * three of them.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX
   * @private
   */
  _renderPrompt(ctx, centerX) {
    const prompt = this._result.isFinalLevel
      ? 'THAT WAS THE LAST HOLLOW'
      : `CONTINUE TO LEVEL ${this._result.levelNumber + 1}?`;

    drawText(ctx, prompt, centerX, 166, {
      color: PALETTE.lantern,
      align: 'center',
    });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX
   * @private
   */
  _renderRows(ctx, centerX) {
    const r = this._result;
    const rows = [
      ['TIME', r.time, PALETTE.lanternCore],
      ['BEACONS', `${r.checkpoints}/${r.checkpointTotal}`, PALETTE.lantern],
      ['SHARDS', `${r.shards}/${r.shardTotal}`, PALETTE.lantern],
      ['DEFEATED', String(r.defeated), PALETTE.runeVerdant],
      ['TIME BONUS', String(r.timeBonus), PALETTE.runeAzure],
    ];

    rows.forEach(([label, value, color], index) => {
      if (this._time < ROW_DELAY * (index + 1)) return;
      const y = 62 + index * 14;
      drawText(ctx, label, centerX - 92, y, { color: PALETTE.hazeGlow, scale: 2 });
      drawText(ctx, value, centerX + 92, y, { color, scale: 2, align: 'right' });
    });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX
   * @private
   */
  _renderScore(ctx, centerX) {
    const start = ROW_DELAY * ROW_COUNT;
    if (this._time < start) return;

    // Count up to the final score rather than printing it.
    const tally = Math.min(1, (this._time - start) / TALLY_TIME);
    const shown = Math.round(this._result.score * tally);

    drawText(ctx, 'SCORE', centerX, 136, {
      color: PALETTE.hazeGlow,
      align: 'center',
    });
    drawTextShadowed(ctx, String(shown), centerX, 146, {
      color: PALETTE.lanternCore,
      align: 'center',
      scale: 3,
    });
  }

  /**
   * Slow drifting motes of light over the whole screen.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _renderSparkles(ctx) {
    ctx.fillStyle = PALETTE.lantern;
    for (const sparkle of this._sparkles) {
      const twinkle = Math.sin(this._time * 3 + sparkle.phase);
      if (twinkle < 0) continue;

      ctx.globalAlpha = twinkle * 0.7;
      const drift = (this._time * 8) % (GAME_HEIGHT + 20);
      const y = (sparkle.y - drift + GAME_HEIGHT + 20) % (GAME_HEIGHT + 20);
      ctx.fillRect(Math.round(sparkle.x), Math.round(y), sparkle.size, sparkle.size);
    }
    ctx.globalAlpha = 1;
  }
}
