/**
 * "Adventure Complete" - all three levels finished.
 *
 * The one screen in the game that is purely a reward, so it is the only one
 * that is allowed to be showy: a rising field of light, the totals from all
 * three levels, and Pip holding the lantern he has been carrying the whole way.
 *
 * @module ui/screens/FinalVictoryScreen
 */

import { Menu } from '../Menu.js';
import { drawText, drawTextShadowed } from '../PixelText.js';
import { drawPip } from '../../entities/pipSprite.js';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE, PLAYER } from '../../core/Config.js';

/** Seconds between the closing lines arriving. */
const LINE_DELAY = 0.5;

export class FinalVictoryScreen {
  constructor() {
    /** @type {Menu} */
    this.menu = new Menu(
      [
        { id: 'levelSelect', label: 'REPLAY A LEVEL' },
        { id: 'mainMenu', label: 'MAIN MENU' },
      ],
      { y: 216, width: 124 },
    );

    /** Totals across the campaign. @type {object|null} @private */
    this._totals = null;

    /** @type {number} @private */
    this._time = 0;

    /** Motes rising from the floor of the screen. @private */
    this._motes = Array.from({ length: 40 }, () => ({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      speed: 8 + Math.random() * 22,
      phase: Math.random() * Math.PI * 2,
      size: Math.random() > 0.75 ? 2 : 1,
    }));
  }

  /**
   * @param {object} totals
   * @param {number} totals.score
   * @param {string} totals.time - Total time across all levels, formatted.
   * @param {number} totals.shards
   * @param {number} totals.defeated
   */
  present(totals) {
    this._totals = totals;
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

    for (const mote of this._motes) {
      mote.y -= mote.speed * dt;
      if (mote.y < -4) {
        mote.y = GAME_HEIGHT + 4;
        mote.x = Math.random() * GAME_WIDTH;
      }
    }

    if (this._time < LINE_DELAY) return null;
    return this.menu.update(dt, input, pointer);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    this._renderMotes(ctx);

    const centerX = GAME_WIDTH / 2;

    // A halo that swells once as the screen opens, then settles to breathing.
    const swell = Math.min(1, this._time * 0.8);
    const breath = 0.85 + Math.sin(this._time * 1.5) * 0.15;
    for (let band = 0; band < 4; band++) {
      const width = (120 + band * 70) * swell;
      const height = (30 + band * 22) * swell;
      ctx.globalAlpha = (0.14 - band * 0.03) * breath;
      ctx.fillStyle = PALETTE.lantern;
      ctx.fillRect(centerX - width / 2, 48 - height / 2, width, height);
    }
    ctx.globalAlpha = 1;

    drawTextShadowed(ctx, 'ADVENTURE', centerX, 30, {
      color: PALETTE.lanternCore,
      shadowColor: PALETTE.stone,
      align: 'center',
      scale: 4,
    });
    drawTextShadowed(ctx, 'COMPLETE!', centerX, 56, {
      color: PALETTE.lanternCore,
      shadowColor: PALETTE.stone,
      align: 'center',
      scale: 4,
    });

    if (this._time > LINE_DELAY * 0.6) {
      drawText(ctx, 'PIP CARRIED THE LIGHT THROUGH ALL THREE HOLLOWS', centerX, 84, {
        color: PALETTE.lantern,
        align: 'center',
      });
    }

    this._renderTotals(ctx, centerX);
    this._renderPip(ctx, centerX);

    if (this._time > LINE_DELAY) this.menu.render(ctx);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX
   * @private
   */
  _renderTotals(ctx, centerX) {
    if (!this._totals || this._time < LINE_DELAY * 0.8) return;

    const rows = [
      ['TOTAL SCORE', String(this._totals.score), PALETTE.lanternCore],
      ['TOTAL TIME', this._totals.time, PALETTE.runeAzure],
      ['SHARDS', String(this._totals.shards), PALETTE.lantern],
      ['DEFEATED', String(this._totals.defeated), PALETTE.runeVerdant],
    ];

    rows.forEach(([label, value, color], index) => {
      const y = 104 + index * 13;
      drawText(ctx, label, centerX - 86, y, { color: PALETTE.hazeGlow, scale: 2 });
      drawText(ctx, value, centerX + 86, y, { color, scale: 2, align: 'right' });
    });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX
   * @private
   */
  _renderPip(ctx, centerX) {
    const y = 196;

    drawPip(ctx, {
      x: Math.round(centerX - PLAYER.width / 2),
      y,
      width: PLAYER.width,
      height: PLAYER.height,
      facing: 1,
      walkPhase: 0,
      moving: false,
      skidding: false,
      airborne: false,
      rising: false,
      squashing: false,
      bob: Math.sin(this._time * 2.4) > 0.4 ? -1 : 0,
      glow: 1,
    });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _renderMotes(ctx) {
    ctx.fillStyle = PALETTE.lantern;
    for (const mote of this._motes) {
      const twinkle = (Math.sin(this._time * 3 + mote.phase) + 1) / 2;
      ctx.globalAlpha = 0.2 + twinkle * 0.6;
      ctx.fillRect(Math.round(mote.x), Math.round(mote.y), mote.size, mote.size);
    }
    ctx.globalAlpha = 1;
  }
}
