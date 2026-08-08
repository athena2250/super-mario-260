/**
 * The panel shown when a level ends badly.
 *
 * Running out of time and running out of lanterns are the same moment from the
 * player's side - the level is over, here is why, here is what you can do - so
 * they are the same screen with different words rather than two screens that
 * happen to look alike.
 *
 * Always drawn over the frozen level: seeing where you were standing when it
 * happened is the whole information needed to decide whether to try again.
 *
 * @module ui/screens/OutcomeScreen
 */

import { Menu } from '../Menu.js';
import { drawText, drawTextShadowed } from '../PixelText.js';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../../core/Config.js';

/** Seconds the panel takes to arrive. */
const ENTRY_TIME = 0.35;

export class OutcomeScreen {
  /**
   * @param {object} options
   * @param {string} options.title - Large heading.
   * @param {string} options.color - Heading colour.
   * @param {string} options.shadowColor
   * @param {string[]} options.lines - One or two lines of explanation.
   * @param {import('../Menu.js').MenuItem[]} options.items
   */
  constructor({ title, color, shadowColor, lines, items }) {
    /** Drawn on top of the level, which stays frozen behind it. @type {boolean} */
    this.overWorld = true;

    /** @type {string} @protected */
    this._title = title;
    /** @type {string} @protected */
    this._color = color;
    /** @type {string} @protected */
    this._shadowColor = shadowColor;
    /** @type {string[]} @protected */
    this._lines = lines;

    /** @type {Menu} */
    this.menu = new Menu(items, { y: 168 });

    /** @type {number} @protected */
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

    // Inert until the panel has finished arriving, so a jump held at the moment
    // of failure is not spent on a menu the player has not seen yet.
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

    // The heading slides down into place rather than appearing.
    const drop = Math.round((1 - entry) * -30);

    drawTextShadowed(ctx, this._title, centerX, 58 + drop, {
      color: this._color,
      shadowColor: this._shadowColor,
      align: 'center',
      scale: 4,
    });

    if (entry < 1) return;

    this._lines.forEach((line, index) => {
      drawText(ctx, line, centerX, 92 + index * 12, {
        color: PALETTE.hazeGlow,
        align: 'center',
      });
    });

    this.renderDetail(ctx, centerX);
    this.menu.render(ctx);
  }

  /**
   * Hook for whatever makes this particular ending specific. Drawn between the
   * explanation and the buttons.
   *
   * @param {CanvasRenderingContext2D} _ctx
   * @param {number} _centerX
   */
  renderDetail(_ctx, _centerX) {}
}
