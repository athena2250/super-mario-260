/**
 * The card that names a level as it begins.
 *
 * Three levels can otherwise blur into one long cavern. A card that states
 * where you are and what it is going to ask of you gives each one an identity
 * before the first jump, and gives the transition between levels a beat of its
 * own rather than dropping the player straight into new terrain.
 *
 * It never blocks: Pip is playable from the first frame, and the card slides
 * out of the way on its own. Anything that stops a player playing in order to
 * tell them something had better be more important than a level's name.
 *
 * @module ui/LevelIntro
 */

import { drawText, drawTextShadowed } from './PixelText.js';
import { GAME_WIDTH, PALETTE } from '../core/Config.js';

/** Seconds spent sliding in, holding, and sliding out. */
const SLIDE_IN = 0.45;
const HOLD = 1.5;
const SLIDE_OUT = 0.5;

/** Card geometry. */
const WIDTH = 240;
const HEIGHT = 46;
const TOP = 92;

/**
 * Ease-out cubic. The card should arrive quickly and settle, rather than
 * cross the screen at a constant speed like a slide projector.
 *
 * @param {number} t - 0..1.
 * @returns {number}
 */
function easeOut(t) {
  return 1 - (1 - t) ** 3;
}

export class LevelIntro {
  constructor() {
    /** @type {boolean} */
    this.visible = false;

    /** @type {number} @private */
    this._time = 0;

    /** @type {{number: number, name: string, difficulty: string}|null} @private */
    this._level = null;
  }

  /**
   * Announce a level.
   *
   * @param {import('../levels/levels.js').LevelEntry} level
   */
  show(level) {
    this._level = level;
    this._time = 0;
    this.visible = true;
  }

  /** Take the card away immediately. Used when a level is left. */
  hide() {
    this.visible = false;
    this._time = 0;
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    if (!this.visible) return;

    this._time += dt;
    if (this._time > SLIDE_IN + HOLD + SLIDE_OUT) this.visible = false;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (!this.visible || !this._level) return;

    const { offset, alpha } = this._entry();
    const x = Math.round(GAME_WIDTH / 2 - WIDTH / 2 + offset);
    const centerX = x + WIDTH / 2;

    ctx.globalAlpha = alpha;

    // Plate.
    ctx.fillStyle = PALETTE.skyTop;
    ctx.fillRect(x, TOP, WIDTH, HEIGHT);
    ctx.fillStyle = PALETTE.stone;
    ctx.fillRect(x, TOP, WIDTH, 1);
    ctx.fillRect(x, TOP + HEIGHT - 1, WIDTH, 1);

    // Lantern rule down the left edge, so the card reads as lit rather than
    // as a floating rectangle.
    ctx.fillStyle = PALETTE.lantern;
    ctx.fillRect(x, TOP, 2, HEIGHT);

    drawText(ctx, `LEVEL ${this._level.number}`, centerX, TOP + 8, {
      color: PALETTE.lantern,
      align: 'center',
    });
    drawTextShadowed(ctx, this._level.name, centerX, TOP + 18, {
      color: PALETTE.lanternCore,
      align: 'center',
      scale: 2,
    });
    drawText(ctx, this._level.difficulty, centerX, TOP + 34, {
      color: PALETTE.hazeGlow,
      align: 'center',
    });

    ctx.globalAlpha = 1;
  }

  /**
   * Where the card is and how solid it is, at this moment.
   *
   * @returns {{offset: number, alpha: number}}
   * @private
   */
  _entry() {
    if (this._time < SLIDE_IN) {
      const t = easeOut(this._time / SLIDE_IN);
      return { offset: (1 - t) * -60, alpha: t };
    }

    const outAt = SLIDE_IN + HOLD;
    if (this._time < outAt) return { offset: 0, alpha: 1 };

    // Leaves the way it came, which reads as one movement rather than two.
    const t = Math.min(1, (this._time - outAt) / SLIDE_OUT);
    return { offset: t * -50, alpha: 1 - t };
  }
}
