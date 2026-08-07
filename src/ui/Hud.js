/**
 * Heads-up display.
 *
 * Drawn in screen space, outside the camera transform. Shows only what a player
 * needs mid-jump: lives remaining, shards found, score, and the clock. The rune
 * sequence is deliberately *not* mirrored here - reading the tablet is part of
 * the puzzle, and a permanent copy on screen would remove the reason to explore
 * back to it.
 *
 * @module ui/Hud
 */

import { drawTextShadowed } from './PixelText.js';
import { GAME_WIDTH, PALETTE } from '../core/Config.js';

/** Margin from the screen edges. */
const MARGIN = 6;

export class Hud {
  constructor() {
    /** Seconds remaining on the transient message banner. @type {number} @private */
    this._messageTimer = 0;
    /** @type {string} @private */
    this._message = '';
    /** @type {string} @private */
    this._messageColor = PALETTE.lanternCore;
  }

  /**
   * Show a short banner across the middle of the screen - used for puzzle
   * feedback like "RUNE SEALED" or "WRONG ORDER".
   *
   * @param {string} text
   * @param {string} [color]
   * @param {number} [duration=1.6]
   */
  showMessage(text, color = PALETTE.lanternCore, duration = 1.6) {
    this._message = text;
    this._messageColor = color;
    this._messageTimer = duration;
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    this._messageTimer = Math.max(0, this._messageTimer - dt);
  }

  /** Clear any banner. Used on restart. */
  reset() {
    this._messageTimer = 0;
    this._message = '';
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/GameState.js').GameState} state
   */
  render(ctx, state) {
    this._renderLives(ctx, state.lives);

    drawTextShadowed(ctx, `${state.shards}/${state.shardTotal}`, MARGIN + 13, MARGIN + 10, {
      color: PALETTE.lantern,
    });
    // Shard pip beside the count, so the number needs no label.
    ctx.fillStyle = PALETTE.lantern;
    ctx.fillRect(MARGIN + 3, MARGIN + 11, 2, 4);
    ctx.fillRect(MARGIN + 2, MARGIN + 12, 4, 2);

    drawTextShadowed(ctx, state.formattedTime, GAME_WIDTH - MARGIN, MARGIN, {
      color: PALETTE.lanternCore,
      align: 'right',
    });
    drawTextShadowed(ctx, String(state.score), GAME_WIDTH - MARGIN, MARGIN + 10, {
      color: PALETTE.lantern,
      align: 'right',
    });

    if (this._messageTimer > 0) this._renderMessage(ctx);
  }

  /**
   * Lives as lantern pips rather than a number: readable at a glance without
   * having to parse a digit.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} lives
   * @private
   */
  _renderLives(ctx, lives) {
    for (let i = 0; i < Math.max(0, lives); i++) {
      const x = MARGIN + i * 9;
      ctx.fillStyle = PALETTE.stone;
      ctx.fillRect(x, MARGIN, 7, 2);
      ctx.fillStyle = PALETTE.lantern;
      ctx.fillRect(x + 1, MARGIN + 2, 5, 4);
      ctx.fillStyle = PALETTE.lanternCore;
      ctx.fillRect(x + 2, MARGIN + 3, 3, 2);
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _renderMessage(ctx) {
    // Fade out over the last half second rather than vanishing mid-read.
    ctx.globalAlpha = Math.min(1, this._messageTimer / 0.5);

    const centerX = GAME_WIDTH / 2;
    drawTextShadowed(ctx, this._message, centerX, 34, {
      color: this._messageColor,
      align: 'center',
      scale: 2,
    });

    ctx.globalAlpha = 1;
  }
}
