/**
 * Rune tablet - the clue.
 *
 * Displays the three rune colours in the order the vault expects, left to
 * right. This is the entire solution to the puzzle, stated plainly and placed
 * where the player must walk past it to reach the vault. The difficulty is
 * meant to live in *reaching* the switches, never in guessing the order.
 *
 * The tablet also mirrors progress: runes already struck are lit, so a player
 * returning mid-sequence can see where they are.
 *
 * @module entities/RuneTablet
 */

import { Entity } from './Entity.js';
import { RUNE_COLORS } from './RuneSwitch.js';
import { PALETTE, TILE_SIZE } from '../core/Config.js';

const WIDTH = 34;
const HEIGHT = 24;

export class RuneTablet extends Entity {
  /**
   * @param {number} col
   * @param {number} row
   * @param {number[]} order - Switch indices in the required order.
   */
  constructor(col, row, order) {
    super(
      col * TILE_SIZE + (TILE_SIZE - WIDTH) / 2,
      (row + 1) * TILE_SIZE - HEIGHT,
      WIDTH,
      HEIGHT,
    );

    /** @type {number[]} */
    this.order = order;

    /**
     * How many of the sequence's runes are currently satisfied. Set by the
     * puzzle controller so the tablet can show progress.
     * @type {number}
     */
    this.progress = 0;

    /** @type {number} @private */
    this._time = 0;
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    this._time += dt;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);

    // Slab.
    ctx.fillStyle = PALETTE.stone;
    ctx.fillRect(x, y, WIDTH, HEIGHT);
    ctx.fillStyle = PALETTE.stoneLit;
    ctx.fillRect(x, y, WIDTH, 1);
    ctx.fillRect(x, y, 1, HEIGHT);

    // Header groove, so the slab reads as carved rather than as a blank box.
    ctx.fillStyle = PALETTE.skyTop;
    ctx.fillRect(x + 4, y + 4, WIDTH - 8, 2);

    // The sequence, left to right.
    this.order.forEach((switchIndex, position) => {
      const glyphX = x + 6 + position * 8;
      const glyphY = y + 11;
      const satisfied = position < this.progress;
      const color = RUNE_COLORS[switchIndex] ?? PALETTE.runeAmber;

      if (satisfied) {
        const pulse = (Math.sin(this._time * 4 + position) + 1) / 2;
        ctx.globalAlpha = 0.25 + pulse * 0.2;
        ctx.fillStyle = color;
        ctx.fillRect(glyphX - 2, glyphY - 2, 10, 10);
        ctx.globalAlpha = 1;
      }

      // Unsatisfied runes are drawn dimmed rather than hidden - the clue must
      // be readable before any progress has been made.
      ctx.globalAlpha = satisfied ? 1 : 0.75;
      ctx.fillStyle = color;
      ctx.fillRect(glyphX + 1, glyphY, 4, 2);
      ctx.fillRect(glyphX, glyphY + 2, 6, 2);
      ctx.fillRect(glyphX + 1, glyphY + 4, 4, 2);
      ctx.globalAlpha = 1;
    });

    // Ordering marks beneath each rune: one notch, two, three.
    ctx.fillStyle = PALETTE.stoneLit;
    for (let position = 0; position < this.order.length; position++) {
      for (let notch = 0; notch <= position; notch++) {
        ctx.fillRect(x + 6 + position * 8 + notch * 2, y + 19, 1, 2);
      }
    }
  }
}
