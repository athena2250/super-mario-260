/**
 * The scenery behind every menu.
 *
 * Two parallax layers of cavern rock drifting past, with glowing crystals set
 * into them. It is the same palette and the same hard-edged pixel language as
 * the level, so the menus read as somewhere *in* the Hollow rather than as a
 * front end bolted onto it.
 *
 * The silhouettes are generated once at construction from a deterministic
 * function - no allocation per frame, and the same skyline every time the game
 * is opened, which makes the title screen feel like a place.
 *
 * @module ui/MenuBackdrop
 */

import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../core/Config.js';

/** Width of one silhouette column, in pixels. */
const COLUMN = 8;

/** Layers, back to front: scroll speed, colour and vertical placement. */
const LAYERS = [
  { speed: 5, color: PALETTE.stone, base: 78, amplitude: 22, alpha: 0.75 },
  { speed: 11, color: '#221a35', base: 54, amplitude: 30, alpha: 1 },
];

export class MenuBackdrop {
  constructor() {
    /** Seconds since construction; drives the scroll. @type {number} @private */
    this._time = 0;

    /**
     * Column heights per layer, generated once. Stacked sine waves at
     * incommensurable frequencies give a ridgeline that never visibly repeats
     * inside a screen width.
     * @type {number[][]}
     * @private
     */
    this._layers = LAYERS.map((layer, index) => {
      const columns = Math.ceil(GAME_WIDTH / COLUMN) + 2;
      return Array.from({ length: columns }, (_, i) => {
        const wave =
          Math.sin(i * 0.7 + index * 2.1) * 0.5 +
          Math.sin(i * 0.23 + index) * 0.35 +
          Math.sin(i * 1.9 + index * 0.6) * 0.15;
        return Math.round(layer.base + wave * layer.amplitude);
      });
    });

    /**
     * Crystals embedded in the near layer: position along the strip and a phase
     * so they do not all pulse together.
     * @private
     */
    this._crystals = [
      { column: 3, color: PALETTE.runeAmber, phase: 0 },
      { column: 14, color: PALETTE.runeVerdant, phase: 1.7 },
      { column: 27, color: PALETTE.runeAzure, phase: 3.1 },
      { column: 41, color: PALETTE.runeAmber, phase: 4.4 },
      { column: 52, color: PALETTE.runeAzure, phase: 2.2 },
    ];
  }

  /**
   * A slowly advancing offset menus feed to the spore field in place of a
   * camera position, so the motes drift with the scenery rather than hanging
   * still while the rock moves behind them.
   * @returns {number}
   */
  get drift() {
    return this._time * 9;
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    this._time += dt;
  }

  /**
   * Draw the scenery. The caller has already filled the sky.
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    LAYERS.forEach((layer, index) => {
      this._renderLayer(ctx, layer, this._layers[index], index === LAYERS.length - 1);
    });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {{speed: number, color: string, alpha: number}} layer
   * @param {number[]} heights
   * @param {boolean} withCrystals - Only the nearest layer carries them.
   * @private
   */
  _renderLayer(ctx, layer, heights, withCrystals) {
    // Scroll by whole columns plus a whole-pixel remainder: a fractional offset
    // would put the hard pixel edges on half pixels and blur the whole ridge.
    const scrolled = Math.floor(this._time * layer.speed);
    const shift = scrolled % COLUMN;
    const step = Math.floor(scrolled / COLUMN);

    ctx.globalAlpha = layer.alpha;
    ctx.fillStyle = layer.color;

    for (let i = 0; i < heights.length; i++) {
      const height = heights[(i + step) % heights.length];
      const x = i * COLUMN - shift;
      ctx.fillRect(x, GAME_HEIGHT - height, COLUMN, height);
    }

    ctx.globalAlpha = 1;

    if (withCrystals) this._renderCrystals(ctx, heights, step, shift);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number[]} heights
   * @param {number} step
   * @param {number} shift
   * @private
   */
  _renderCrystals(ctx, heights, step, shift) {
    for (const crystal of this._crystals) {
      // Walk the crystal backwards through the scroll so it rides its column.
      const i = (crystal.column - step) % heights.length;
      const column = i < 0 ? i + heights.length : i;

      const x = column * COLUMN - shift;
      if (x < -COLUMN || x > GAME_WIDTH) continue;

      const top = GAME_HEIGHT - heights[crystal.column % heights.length];
      const glow = 0.45 + Math.sin(this._time * 1.6 + crystal.phase) * 0.3;

      ctx.globalAlpha = glow * 0.5;
      ctx.fillStyle = crystal.color;
      ctx.fillRect(x, top + 4, COLUMN, 8);

      ctx.globalAlpha = glow;
      ctx.fillRect(x + 2, top + 5, 3, 6);
      ctx.globalAlpha = 1;
    }
  }
}
