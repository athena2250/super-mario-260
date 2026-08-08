/**
 * Choose a level.
 *
 * Locked levels are shown, not hidden. A list that grows as you play tells you
 * nothing about what is ahead; a list of three where two are dark tells you
 * exactly how much Hollow is left. They can be highlighted and read - the panel
 * below shows what each one is - and simply refuse to open.
 *
 * @module ui/screens/LevelSelectScreen
 */

import { Menu } from '../Menu.js';
import { drawText, drawTextShadowed } from '../PixelText.js';
import { GAME_WIDTH, PALETTE } from '../../core/Config.js';

/** Width of a level row. */
const ROW_WIDTH = 300;

/** Top of the list, and the size of the panel that sits under it. */
const LIST_Y = 64;
const DETAIL_HEIGHT = 44;

/**
 * Seconds as `m:ss`.
 *
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export class LevelSelectScreen {
  constructor() {
    /** @type {Menu} */
    this.menu = new Menu([], { y: LIST_Y, width: ROW_WIDTH });

    /** The campaign, as passed to {@link present}. @type {object[]} @private */
    this._levels = [];

    /** @type {import('../../core/Progress.js').Progress|null} @private */
    this._progress = null;

    /** @type {number} @private */
    this._time = 0;

    /** Which level the detail panel is describing. @type {number} @private */
    this._detailIndex = 0;
  }

  /**
   * Rebuild the list from current progress. Called every time the screen is
   * opened, because what is unlocked may have changed since it was last seen.
   *
   * @param {import('../../levels/levels.js').LevelEntry[]} levels
   * @param {import('../../core/Progress.js').Progress} progress
   */
  present(levels, progress) {
    this._levels = levels;
    this._progress = progress;

    const items = levels.map((level, index) => {
      const unlocked = progress.isUnlocked(index);
      const result = progress.results[index];

      return {
        id: `level:${index}`,
        label: `${level.number}  ${level.name}`,
        wide: true,
        width: ROW_WIDTH,
        disabled: !unlocked,
        detail: this._statusFor(unlocked, result),
        color: result ? PALETTE.runeVerdant : undefined,
      };
    });

    // Dropped below the detail panel, so the way out is clearly not a level.
    items.push({ id: 'back', label: 'BACK', width: 96, gapBefore: DETAIL_HEIGHT + 12 });
    this.menu.setItems(items);
  }

  /** Called every time the screen becomes current. */
  enter() {
    this._time = 0;
    this.menu.reset();
  }

  /**
   * @param {number} dt
   * @param {import('../../input/Input.js').Input} input
   * @param {import('../../input/Pointer.js').Pointer} pointer
   * @returns {{action: string, id?: string}|null}
   */
  update(dt, input, pointer) {
    this._time += dt;

    if (input.justPressed('back')) return { action: 'activate', id: 'back' };
    return this.menu.update(dt, input, pointer);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const centerX = GAME_WIDTH / 2;

    drawTextShadowed(ctx, 'SELECT A LEVEL', centerX, 26, {
      color: PALETTE.lanternCore,
      align: 'center',
      scale: 3,
    });

    this.menu.render(ctx);
    this._renderLocks(ctx);
    this._renderDetail(ctx, centerX);
  }

  /**
   * @param {boolean} unlocked
   * @param {import('../../core/Progress.js').LevelResult|null} result
   * @returns {string}
   * @private
   */
  _statusFor(unlocked, result) {
    if (!unlocked) return 'LOCKED';
    if (!result) return 'OPEN';
    return `DONE ${result.score}`;
  }

  /**
   * A closed padlock on each locked row, so the state reads without the word.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _renderLocks(ctx) {
    this.menu.items.forEach((item, index) => {
      if (!item.disabled) return;

      const bounds = this.menu.boundsOf(index);
      const x = bounds.x + bounds.width - 46;
      const y = bounds.y + 6;

      ctx.fillStyle = PALETTE.runeDormant;
      ctx.fillRect(x + 1, y, 4, 3); // shackle
      ctx.fillRect(x, y + 3, 6, 5); // body
      ctx.fillStyle = PALETTE.stone;
      ctx.fillRect(x + 2, y + 3, 2, 2);
      ctx.fillRect(x + 2, y + 5, 2, 2);
    });
  }

  /**
   * What the highlighted level is, and how it went last time.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX
   * @private
   */
  _renderDetail(ctx, centerX) {
    // The panel describes a level, so while BACK is highlighted it keeps
    // showing the last level looked at rather than vanishing and shifting the
    // whole screen around.
    if (this.menu.index < this._levels.length) this._detailIndex = this.menu.index;

    const index = this._detailIndex;
    const level = this._levels[index];
    if (!level || !this._progress) return;

    const unlocked = this._progress.isUnlocked(index);
    const result = this._progress.results[index];

    // Sits directly under the last level row, wherever the list ended up.
    const lastRow = this.menu.boundsOf(this._levels.length - 1);
    const panelY = lastRow.y + lastRow.height + 8;

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = PALETTE.stone;
    ctx.fillRect(centerX - ROW_WIDTH / 2, panelY, ROW_WIDTH, DETAIL_HEIGHT);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = PALETTE.runeDormant;
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX - ROW_WIDTH / 2 + 0.5, panelY + 0.5, ROW_WIDTH - 1, DETAIL_HEIGHT - 1);

    if (!unlocked) {
      drawText(ctx, 'FINISH THE LEVEL BEFORE IT TO OPEN THIS ONE', centerX, panelY + 19, {
        color: PALETTE.runeDormant,
        align: 'center',
      });
      return;
    }

    drawText(ctx, `${level.difficulty}   ${level.blurb}`, centerX, panelY + 8, {
      color: PALETTE.lantern,
      align: 'center',
    });

    if (!result) {
      // Blink, so an unplayed level reads as an invitation.
      if (Math.sin(this._time * 4) > -0.3) {
        drawText(ctx, 'NOT YET ATTEMPTED', centerX, panelY + 26, {
          color: PALETTE.hazeGlow,
          align: 'center',
        });
      }
      return;
    }

    const stats = [
      `BEST ${result.score}`,
      `TIME ${formatTime(result.time)}`,
      `SHARDS ${result.shards}/${result.shardTotal}`,
    ];
    stats.forEach((line, column) => {
      const x = centerX - ROW_WIDTH / 2 + 16 + column * 96;
      drawText(ctx, line, x, panelY + 26, { color: PALETTE.lanternCore });
    });
  }
}
