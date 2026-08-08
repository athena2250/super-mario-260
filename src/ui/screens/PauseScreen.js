/**
 * Paused.
 *
 * Drawn over the level exactly where it stopped, and arrived at *without* a
 * fade - a pause is meant to feel like the world holding its breath, and a
 * black wipe on the way in would read as the game having lost its place.
 *
 * The countdown is not touched here: while this screen is up the level is not
 * stepped at all, so the clock simply is not advanced. That is why pausing
 * cannot be used to buy time, and why resuming continues from exactly the
 * fraction of a second it stopped on.
 *
 * @module ui/screens/PauseScreen
 */

import { Menu } from '../Menu.js';
import { drawText, drawTextShadowed } from '../PixelText.js';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../../core/Config.js';

export class PauseScreen {
  constructor() {
    /** Drawn on top of the level, which stays exactly as it was. @type {boolean} */
    this.overWorld = true;

    /** @type {Menu} */
    this.menu = new Menu(
      [
        { id: 'resume', label: 'RESUME', color: PALETTE.runeVerdant },
        { id: 'retry', label: 'RESTART LEVEL' },
        { id: 'mainMenu', label: 'MAIN MENU' },
      ],
      { y: 128 },
    );

    /** @type {number} @private */
    this._time = 0;
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

    // The key that paused also unpauses, which is what everyone tries first.
    // It cannot fire on the step the screen opened: the edge that opened it was
    // consumed by the level's update earlier in that same step.
    if (input.justPressed('pause') || input.justPressed('back')) {
      return { action: 'activate', id: 'resume' };
    }

    return this.menu.update(dt, input, pointer);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const centerX = GAME_WIDTH / 2;

    // Dimmer than an ending screen: the level behind is not over, and the
    // player is about to go back to reading it.
    ctx.globalAlpha = 0.66;
    ctx.fillStyle = PALETTE.skyTop;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.globalAlpha = 1;

    this._renderBars(ctx, centerX);

    drawTextShadowed(ctx, 'PAUSED', centerX, 76, {
      color: PALETTE.lanternCore,
      shadowColor: PALETTE.stone,
      align: 'center',
      scale: 4,
    });

    this.menu.render(ctx);

    drawText(ctx, 'ESC OR P TO RESUME', centerX, 224, {
      color: PALETTE.hazeGlow,
      align: 'center',
    });
  }

  /**
   * The pause glyph itself, breathing slowly above the word. It is the only
   * moving thing on a screen where nothing else moves, which is what stops the
   * frozen level underneath from reading as a hang.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX
   * @private
   */
  _renderBars(ctx, centerX) {
    const breath = (Math.sin(this._time * 2) + 1) / 2;

    ctx.globalAlpha = 0.5 + breath * 0.5;
    ctx.fillStyle = PALETTE.lantern;
    ctx.fillRect(centerX - 9, 42, 6, 22);
    ctx.fillRect(centerX + 3, 42, 6, 22);
    ctx.globalAlpha = 1;
  }
}
