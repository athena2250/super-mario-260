/**
 * The instructions screen.
 *
 * Two panels: what the buttons do, and what the player is trying to achieve.
 * Deliberately short - anything longer than a screen would not be read, and the
 * level itself teaches the rest by arranging its obstacles in order.
 *
 * @module ui/screens/HowToPlayScreen
 */

import { Menu } from '../Menu.js';
import { drawText, drawTextShadowed } from '../PixelText.js';
import { GAME_WIDTH, PALETTE } from '../../core/Config.js';

/** Left edge of both panels. */
const PANEL_X = 40;
/** Panel width. */
const PANEL_WIDTH = GAME_WIDTH - PANEL_X * 2;

/** Control bindings, as label and description. */
const CONTROLS = [
  ['MOVE', 'ARROW KEYS OR A / D'],
  ['JUMP', 'SPACE - W - UP ARROW'],
  ['RUN', 'HOLD SHIFT OR J'],
  ['DROP', 'DOWN ARROW ON A THIN PLATFORM'],
  ['PAUSE', 'ESC OR P - THE CLOCK STOPS TOO'],
  ['MUTE', 'M'],
];

/** What winning a level takes, in the order the player will meet it. */
const OBJECTIVES = [
  'LAND ON CREATURES TO DEFEAT THEM',
  'EXPLORE - THE WAY ON IS RARELY STRAIGHT',
  'LIGHT ALL 3 CHECKPOINTS IN THE LEVEL',
  'THEN FIND THE TREASURE AT ITS END',
  'DO IT ALL BEFORE THE CLOCK RUNS OUT',
];

export class HowToPlayScreen {
  constructor() {
    /** @type {Menu} */
    this.menu = new Menu([{ id: 'back', label: 'BACK' }], { y: 228, width: 84 });

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

    // Escape leaves from anywhere on the screen, not only from the button.
    if (input.justPressed('back')) return { action: 'activate', id: 'back' };

    return this.menu.update(dt, input, pointer);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const centerX = GAME_WIDTH / 2;

    drawTextShadowed(ctx, 'HOW TO PLAY', centerX, 18, {
      color: PALETTE.lanternCore,
      align: 'center',
      scale: 3,
    });

    this._renderPanel(ctx, 44, 92);
    drawText(ctx, 'CONTROLS', PANEL_X + 8, 50, { color: PALETTE.lantern, scale: 2 });

    CONTROLS.forEach(([label, description], index) => {
      const y = 66 + index * 12;
      drawText(ctx, label, PANEL_X + 10, y, { color: PALETTE.runeAzure });
      drawText(ctx, description, PANEL_X + 58, y, { color: PALETTE.lanternCore });
    });

    this._renderPanel(ctx, 144, 76);
    drawText(ctx, 'YOUR QUEST', PANEL_X + 8, 149, { color: PALETTE.lantern, scale: 2 });

    OBJECTIVES.forEach((line, index) => {
      const y = 164 + index * 11;
      this._renderBullet(ctx, PANEL_X + 12, y + 1, index);
      drawText(ctx, line, PANEL_X + 20, y, { color: PALETTE.lanternCore });
    });

    this.menu.render(ctx);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} y
   * @param {number} height
   * @private
   */
  _renderPanel(ctx, y, height) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = PALETTE.stone;
    ctx.fillRect(PANEL_X, y, PANEL_WIDTH, height);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = PALETTE.runeDormant;
    ctx.lineWidth = 1;
    ctx.strokeRect(PANEL_X + 0.5, y + 0.5, PANEL_WIDTH - 1, height - 1);
  }

  /**
   * A lantern pip before each objective, lighting one after another so the list
   * reads as a sequence rather than a set.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} index
   * @private
   */
  _renderBullet(ctx, x, y, index) {
    const lit = (this._time * 1.6) % (OBJECTIVES.length + 2) > index;
    ctx.fillStyle = lit ? PALETTE.lantern : PALETTE.runeDormant;
    ctx.fillRect(x, y, 3, 3);
  }
}
