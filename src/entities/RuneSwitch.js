/**
 * Rune switch - one of the three the vault demands.
 *
 * Each switch has a fixed colour tied to its index (amber, verdant, azure), and
 * the tablet by the vault shows which order they must be struck in. Colour is
 * the whole language of the puzzle: nothing here is hidden or random, only
 * placed somewhere that takes work to reach.
 *
 * A switch is armed by touching it, and can only be armed once per attempt.
 *
 * @module entities/RuneSwitch
 */

import { Entity } from './Entity.js';
import { PALETTE, TILE_SIZE } from '../core/Config.js';

const WIDTH = 12;
const HEIGHT = 14;

/** Rune colours by switch index. Also used by the tablet and the HUD. */
export const RUNE_COLORS = Object.freeze([
  PALETTE.runeAmber,
  PALETTE.runeVerdant,
  PALETTE.runeAzure,
]);

export class RuneSwitch extends Entity {
  /**
   * @param {number} col
   * @param {number} row
   * @param {number} index - 0, 1 or 2. Selects the rune's colour and identity.
   */
  constructor(col, row, index) {
    super(
      col * TILE_SIZE + (TILE_SIZE - WIDTH) / 2,
      (row + 1) * TILE_SIZE - HEIGHT,
      WIDTH,
      HEIGHT,
    );

    /** @type {number} */
    this.index = index;

    /** @type {string} */
    this.color = RUNE_COLORS[index] ?? PALETTE.runeAmber;

    /** True once struck in the current attempt. @type {boolean} */
    this.lit = false;

    /** @type {number} @private */
    this._time = 0;

    /** Seconds of strike animation remaining. @type {number} @private */
    this._flash = 0;
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    this._time += dt;
    this._flash = Math.max(0, this._flash - dt);
  }

  /** Light this rune. Returns false if it was already lit. @returns {boolean} */
  activate() {
    if (this.lit) return false;
    this.lit = true;
    this._flash = 0.35;
    return true;
  }

  /** Return to dormant. Used on a wrong order and on level restart. */
  reset() {
    this.lit = false;
    this._flash = 0;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const centerX = x + Math.round(this.width / 2);

    // Plinth.
    ctx.fillStyle = PALETTE.stone;
    ctx.fillRect(x, y + 8, this.width, 6);
    ctx.fillStyle = PALETTE.stoneLit;
    ctx.fillRect(x, y + 8, this.width, 1);

    // The rune itself: dormant grey until struck, then its own colour.
    const active = this.lit;
    const pulse = (Math.sin(this._time * 3) + 1) / 2;

    if (active) {
      // Halo, brightest immediately after the strike.
      ctx.globalAlpha = 0.16 + pulse * 0.1 + this._flash;
      ctx.fillStyle = this.color;
      ctx.fillRect(centerX - 11, y - 5, 22, 22);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = active ? this.color : PALETTE.runeDormant;

    // A diamond glyph: four stacked bars of decreasing then increasing width.
    ctx.fillRect(centerX - 1, y, 2, 2);
    ctx.fillRect(centerX - 3, y + 2, 6, 2);
    ctx.fillRect(centerX - 4, y + 4, 8, 2);
    ctx.fillRect(centerX - 2, y + 6, 4, 2);

    if (active) {
      ctx.fillStyle = PALETTE.lanternCore;
      ctx.fillRect(centerX - 1, y + 3, 2, 2);
    }
  }
}
