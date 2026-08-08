/**
 * The clock ran out.
 *
 * Drawn over the frozen level rather than over the menu scenery, so the player
 * can see exactly where they were standing when it happened - which is the
 * whole information they need to decide whether to try again.
 *
 * @module ui/screens/TimeUpScreen
 */

import { Menu } from '../Menu.js';
import { drawText, drawTextShadowed } from '../PixelText.js';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../../core/Config.js';

/** Seconds the panel takes to drop in. */
const ENTRY_TIME = 0.35;

export class TimeUpScreen {
  constructor() {
    /**
     * Drawn on top of the level, which stays frozen behind it.
     * @type {boolean}
     */
    this.overWorld = true;

    /** @type {Menu} */
    this.menu = new Menu(
      [
        { id: 'retry', label: 'TRY AGAIN' },
        { id: 'mainMenu', label: 'MAIN MENU' },
      ],
      { y: 158 },
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

    // The buttons stay inert until the panel has finished arriving, so a jump
    // held at the moment of expiry is not spent on a menu the player has not
    // seen yet.
    if (this._time < ENTRY_TIME) return null;

    return this.menu.update(dt, input, pointer);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const centerX = GAME_WIDTH / 2;
    const entry = Math.min(1, this._time / ENTRY_TIME);

    // Dim the level. Not to black: the Hollow should still be visible under it.
    ctx.globalAlpha = 0.78 * entry;
    ctx.fillStyle = PALETTE.skyTop;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.globalAlpha = 1;

    // The heading slides down into place and overshoots by a pixel or two.
    const drop = Math.round((1 - entry) * -30);

    drawTextShadowed(ctx, "TIME'S UP!", centerX, 62 + drop, {
      color: PALETTE.thistle,
      shadowColor: PALETTE.thistleDark,
      align: 'center',
      scale: 4,
    });

    if (entry < 1) return;

    drawText(ctx, 'THE HOLLOW KEEPS ITS TREASURE', centerX, 96, {
      color: PALETTE.hazeGlow,
      align: 'center',
    });
    drawText(ctx, 'YOU DID NOT REACH IT IN TIME', centerX, 108, {
      color: PALETTE.hazeGlow,
      align: 'center',
    });

    this._renderSpentClock(ctx, centerX, 130);
    this.menu.render(ctx);
  }

  /**
   * A dead clock face reading zero: the same shape the HUD has been showing all
   * level, now stopped.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX
   * @param {number} y
   * @private
   */
  _renderSpentClock(ctx, centerX, y) {
    const flicker = Math.sin(this._time * 6) > 0.4 ? PALETTE.thistleDark : PALETTE.thistle;

    drawTextShadowed(ctx, '00:00', centerX, y, {
      color: flicker,
      align: 'center',
      scale: 2,
    });
  }
}
