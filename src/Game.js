/**
 * Game root.
 *
 * Owns the long-lived subsystems and wires them together. Right now that is the
 * viewport plus a single static render of the Hollow's backdrop; the fixed-step
 * update/render loop that drives it continuously arrives in Milestone 2, at
 * which point `render()` becomes the loop's draw callback instead of being
 * called directly.
 *
 * @module Game
 */

import { Viewport } from './core/Viewport.js';
import { PALETTE } from './core/Config.js';

export class Game {
  /**
   * @param {HTMLCanvasElement} canvas - The canvas the game renders into.
   */
  constructor(canvas) {
    /** @type {Viewport} */
    this.viewport = new Viewport(canvas);

    /**
     * Cached backdrop gradient. It only depends on the logical resolution,
     * which never changes, so it is built once instead of per frame.
     * @type {CanvasGradient}
     * @private
     */
    this._skyGradient = this._createSkyGradient();
  }

  /**
   * Start the game. Renders the current state and keeps it correct across
   * resizes and orientation changes.
   */
  start() {
    this.viewport.onResize(() => this.render());
    this.render();
  }

  /**
   * Draw one frame.
   *
   * The backdrop is painted opaquely every frame, so there is no need to clear
   * the canvas first - one fewer full-screen pass.
   */
  render() {
    const { ctx, width, height } = this.viewport;

    ctx.fillStyle = this._skyGradient;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Build the vertical cavern gradient: deep bruised purple overhead fading to
   * a warmer, spore-lit haze near the floor.
   *
   * @returns {CanvasGradient}
   * @private
   */
  _createSkyGradient() {
    const { ctx, height } = this.viewport;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(0.65, PALETTE.skyBottom);
    gradient.addColorStop(1, PALETTE.hazeGlow);
    return gradient;
  }
}
