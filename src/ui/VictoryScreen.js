/**
 * "Treasure Found!" results screen.
 *
 * Appears once the chest animation completes. Rows count themselves in one at a
 * time and the score tallies up rather than appearing finished, because a
 * results screen that animates reads as a reward and one that does not reads as
 * a dialog box.
 *
 * @module ui/VictoryScreen
 */

import { drawText, drawTextShadowed } from './PixelText.js';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../core/Config.js';

/** Seconds between result rows appearing. */
const ROW_DELAY = 0.45;

/** Seconds the score spends counting up to its final value. */
const TALLY_TIME = 0.8;

export class VictoryScreen {
  constructor() {
    /** Seconds since the screen appeared. @type {number} @private */
    this._time = 0;

    /** @type {boolean} */
    this.visible = false;

    /** Sparkle positions, generated once so they do not jitter. @private */
    this._sparkles = Array.from({ length: 26 }, () => ({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      phase: Math.random() * Math.PI * 2,
      size: Math.random() > 0.7 ? 2 : 1,
    }));
  }

  /** Show the screen from the top. */
  show() {
    this.visible = true;
    this._time = 0;
  }

  /** Hide and rewind. */
  reset() {
    this.visible = false;
    this._time = 0;
  }

  /** True once every row has appeared and the player may restart. */
  get complete() {
    return this._time > ROW_DELAY * 5;
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    if (this.visible) this._time += dt;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/GameState.js').GameState} state
   * @param {number} timeBonus - Bonus awarded, shown as its own row.
   */
  render(ctx, state, timeBonus) {
    if (!this.visible) return;

    // Dim the world behind, easing in so the transition is not a hard cut.
    ctx.globalAlpha = Math.min(0.82, this._time * 2);
    ctx.fillStyle = PALETTE.skyTop;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.globalAlpha = 1;

    this._renderSparkles(ctx);

    const centerX = GAME_WIDTH / 2;

    drawTextShadowed(ctx, 'TREASURE FOUND!', centerX, 52, {
      color: PALETTE.lanternCore,
      align: 'center',
      scale: 3,
    });

    // Underline that draws itself outward from the centre.
    const sweep = Math.min(1, this._time * 1.6) * 100;
    ctx.fillStyle = PALETTE.lantern;
    ctx.fillRect(centerX - sweep, 74, sweep * 2, 1);

    const rows = [
      ['TIME', state.formattedTime, PALETTE.lanternCore],
      ['SHARDS', `${state.shards}/${state.shardTotal}`, PALETTE.lantern],
      ['DEFEATED', String(state.defeated), PALETTE.runeVerdant],
      ['TIME BONUS', String(timeBonus), PALETTE.runeAzure],
    ];

    rows.forEach(([label, value, color], index) => {
      if (this._time < ROW_DELAY * (index + 1)) return;
      const y = 96 + index * 16;
      drawText(ctx, label, centerX - 80, y, { color: PALETTE.hazeGlow, scale: 2 });
      drawText(ctx, value, centerX + 80, y, { color, scale: 2, align: 'right' });
    });

    this._renderTotal(ctx, state, centerX);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/GameState.js').GameState} state
   * @param {number} centerX
   * @private
   */
  _renderTotal(ctx, state, centerX) {
    if (this._time < ROW_DELAY * 5) return;

    // Count up to the final score rather than printing it.
    const tally = Math.min(1, (this._time - ROW_DELAY * 5) / TALLY_TIME);
    const shown = Math.round(state.score * tally);

    drawTextShadowed(ctx, 'SCORE', centerX, 172, {
      color: PALETTE.hazeGlow,
      align: 'center',
      scale: 2,
    });
    drawTextShadowed(ctx, String(shown), centerX, 188, {
      color: PALETTE.lanternCore,
      align: 'center',
      scale: 4,
    });

    if (tally >= 1) {
      // Blink the prompt so it reads as interactive.
      const blink = Math.sin(this._time * 5) > -0.3;
      if (blink) {
        drawTextShadowed(ctx, 'PRESS JUMP TO PLAY AGAIN', centerX, 232, {
          color: PALETTE.lantern,
          align: 'center',
        });
      }
    }
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
