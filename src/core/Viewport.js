/**
 * Responsive canvas management.
 *
 * Strategy: the canvas backing store is pinned to the logical resolution from
 * Config, and CSS scales it up to fill the screen. This gives us three things
 * for free:
 *
 *   1. Crisp pixel-art upscaling (integer scale + `image-rendering: pixelated`).
 *   2. A constant fill rate, so performance does not collapse on 4K displays or
 *      high-DPR phones.
 *   3. One coordinate space for gameplay code - nothing outside this module
 *      needs to know the screen size or device pixel ratio.
 *
 * @module core/Viewport
 */

import { GAME_WIDTH, GAME_HEIGHT } from './Config.js';

export class Viewport {
  /**
   * @param {HTMLCanvasElement} canvas - The canvas element to manage.
   */
  constructor(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError('Viewport requires an HTMLCanvasElement');
    }

    /** @type {HTMLCanvasElement} */
    this.canvas = canvas;

    // `alpha: false` lets the compositor skip blending the canvas against the
    // page, which is a measurable win on mobile. We always paint every pixel.
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not acquire a 2D rendering context');

    /** @type {CanvasRenderingContext2D} */
    this.ctx = ctx;

    /** Current CSS-pixels-per-logical-pixel scale factor. @type {number} */
    this.scale = 1;

    // Bound so it can be added and removed as the same reference.
    this._onResize = this.resize.bind(this);

    this._configureBackingStore();
    this._attachListeners();
    this.resize();
  }

  /** Logical render width in pixels. @returns {number} */
  get width() {
    return GAME_WIDTH;
  }

  /** Logical render height in pixels. @returns {number} */
  get height() {
    return GAME_HEIGHT;
  }

  /**
   * Recompute the on-screen size of the canvas, preserving aspect ratio.
   *
   * At >= 1x we floor to an integer scale so every game pixel maps to a whole
   * number of screen pixels (no shimmering seams). On screens too small for 1x
   * we fall back to a fractional scale - a slightly soft image beats cropping
   * gameplay off the edge.
   */
  resize() {
    const stage = this.canvas.parentElement ?? document.body;
    const available = stage.getBoundingClientRect();

    // Fall back to the window if the container has not been laid out yet.
    const availWidth = available.width || window.innerWidth;
    const availHeight = available.height || window.innerHeight;

    const rawScale = Math.min(availWidth / GAME_WIDTH, availHeight / GAME_HEIGHT);
    this.scale = rawScale >= 1 ? Math.floor(rawScale) : rawScale;

    this.canvas.style.width = `${GAME_WIDTH * this.scale}px`;
    this.canvas.style.height = `${GAME_HEIGHT * this.scale}px`;

    // Resizing the element can reset context state on some browsers, so the
    // smoothing flag is reasserted here rather than only at construction.
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * Convert a pointer/touch event position into logical game coordinates.
   * Needed by touch controls and any future mouse interaction.
   *
   * @param {number} clientX - Client X from a pointer or touch event.
   * @param {number} clientY - Client Y from a pointer or touch event.
   * @returns {{x: number, y: number}} Position in logical pixels.
   */
  toGameCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / this.scale,
      y: (clientY - rect.top) / this.scale,
    };
  }

  /** Detach listeners. Call when tearing the game down. */
  destroy() {
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    this._visualViewport?.removeEventListener('resize', this._onResize);
  }

  /** Pin the backing store to the logical resolution. @private */
  _configureBackingStore() {
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;
    this.ctx.imageSmoothingEnabled = false;
  }

  /** @private */
  _attachListeners() {
    window.addEventListener('resize', this._onResize);
    // iOS Safari does not always fire `resize` when the device rotates.
    window.addEventListener('orientationchange', this._onResize);

    // visualViewport reports the true drawable area when mobile browser chrome
    // (URL bar, keyboard) slides in and out.
    this._visualViewport = window.visualViewport ?? null;
    this._visualViewport?.addEventListener('resize', this._onResize);
  }
}
