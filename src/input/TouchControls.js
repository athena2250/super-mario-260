/**
 * On-screen touch controls.
 *
 * Drawn into the canvas in logical coordinates rather than as DOM elements, so
 * the pad scales with the game and needs no separate responsive layout. Presses
 * are fed into the same {@link Input} action state the keyboard uses, so
 * gameplay code never knows which device is driving it.
 *
 * Multitouch is tracked per `pointerId`, which is what allows running and
 * jumping at the same time - the single most common failure of naive on-screen
 * pads.
 *
 * @module input/TouchControls
 */

import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../core/Config.js';

/** Visual size of the direction buttons, in logical pixels. */
const SIZE = 32;
/** Distance from the screen edges. */
const MARGIN = 9;
/** Invisible padding added to every hit box - fingers are imprecise. */
const TOUCH_SLOP = 7;

export class TouchControls {
  /**
   * @param {import('../core/Viewport.js').Viewport} viewport
   * @param {import('./Input.js').Input} input
   */
  constructor(viewport, input) {
    this.viewport = viewport;
    this.input = input;

    /**
     * Hidden until an actual touch happens, so desktop players never see a pad
     * they cannot use. Hybrid laptops therefore get it only once used by touch.
     * @type {boolean}
     */
    this.visible = false;

    const bottom = GAME_HEIGHT - MARGIN;

    /** @type {Array<{action: string, x: number, y: number, w: number, h: number}>} */
    this.buttons = [
      { action: 'left', x: MARGIN, y: bottom - SIZE, w: SIZE, h: SIZE },
      { action: 'right', x: MARGIN + SIZE + 6, y: bottom - SIZE, w: SIZE, h: SIZE },
      { action: 'run', x: GAME_WIDTH - MARGIN - SIZE * 2 - 12, y: bottom - SIZE, w: SIZE, h: SIZE },
      { action: 'jump', x: GAME_WIDTH - MARGIN - SIZE - 4, y: bottom - SIZE - 4, w: SIZE + 4, h: SIZE + 4 },
    ];

    /** Active pointer id -> the action it is currently holding. @type {Map<number, string>} */
    this._pointers = new Map();

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    const canvas = viewport.canvas;
    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerup', this._onPointerUp);
    canvas.addEventListener('pointercancel', this._onPointerUp);
    // A finger dragged off the canvas must not leave the action stuck on.
    canvas.addEventListener('pointerleave', this._onPointerUp);
  }

  /**
   * Draw the pad. Call after the world so the controls sit on top.
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (!this.visible) return;

    const active = new Set(this._pointers.values());

    for (const button of this.buttons) {
      const pressed = active.has(button.action);

      ctx.globalAlpha = pressed ? 0.5 : 0.24;
      ctx.fillStyle = PALETTE.lanternCore;
      ctx.fillRect(button.x, button.y, button.w, button.h);

      ctx.globalAlpha = pressed ? 0.95 : 0.6;
      ctx.fillStyle = PALETTE.skyTop;
      this._drawGlyph(ctx, button);
    }

    ctx.globalAlpha = 1;
  }

  /** Detach listeners. */
  destroy() {
    const canvas = this.viewport.canvas;
    canvas.removeEventListener('pointerdown', this._onPointerDown);
    canvas.removeEventListener('pointermove', this._onPointerMove);
    canvas.removeEventListener('pointerup', this._onPointerUp);
    canvas.removeEventListener('pointercancel', this._onPointerUp);
    canvas.removeEventListener('pointerleave', this._onPointerUp);
    this._pointers.clear();
  }

  /**
   * @param {PointerEvent} event
   * @private
   */
  _onPointerDown(event) {
    if (event.pointerType === 'touch') this.visible = true;
    if (!this.visible) return;

    const button = this._hitTest(event);
    if (!button) return;

    event.preventDefault();
    this._pointers.set(event.pointerId, button.action);
    this.input.press(button.action);
  }

  /**
   * Sliding a thumb from one button to another swaps the held action, which is
   * how players expect a d-pad to behave.
   * @param {PointerEvent} event
   * @private
   */
  _onPointerMove(event) {
    if (!this._pointers.has(event.pointerId)) return;

    const previous = this._pointers.get(event.pointerId);
    const button = this._hitTest(event);
    const next = button ? button.action : null;
    if (next === previous) return;

    this._releasePointerAction(event.pointerId);

    if (next) {
      this._pointers.set(event.pointerId, next);
      this.input.press(next);
    }
  }

  /**
   * @param {PointerEvent} event
   * @private
   */
  _onPointerUp(event) {
    this._releasePointerAction(event.pointerId);
  }

  /**
   * Release the action a pointer holds, unless another finger is still holding
   * the same one.
   * @param {number} pointerId
   * @private
   */
  _releasePointerAction(pointerId) {
    const action = this._pointers.get(pointerId);
    if (action === undefined) return;

    this._pointers.delete(pointerId);
    for (const stillHeld of this._pointers.values()) {
      if (stillHeld === action) return;
    }
    this.input.release(action);
  }

  /**
   * @param {PointerEvent} event
   * @returns {{action: string, x: number, y: number, w: number, h: number} | null}
   * @private
   */
  _hitTest(event) {
    const { x, y } = this.viewport.toGameCoords(event.clientX, event.clientY);

    for (const b of this.buttons) {
      if (
        x >= b.x - TOUCH_SLOP &&
        x <= b.x + b.w + TOUCH_SLOP &&
        y >= b.y - TOUCH_SLOP &&
        y <= b.y + b.h + TOUCH_SLOP
      ) {
        return b;
      }
    }
    return null;
  }

  /**
   * Glyphs are drawn as solid shapes rather than text so they stay crisp at the
   * game's low resolution and need no font to load.
   * @param {CanvasRenderingContext2D} ctx
   * @param {{action: string, x: number, y: number, w: number, h: number}} button
   * @private
   */
  _drawGlyph(ctx, button) {
    const cx = button.x + button.w / 2;
    const cy = button.y + button.h / 2;

    ctx.beginPath();
    switch (button.action) {
      case 'left':
        ctx.moveTo(cx + 4, cy - 7);
        ctx.lineTo(cx + 4, cy + 7);
        ctx.lineTo(cx - 6, cy);
        break;
      case 'right':
        ctx.moveTo(cx - 4, cy - 7);
        ctx.lineTo(cx - 4, cy + 7);
        ctx.lineTo(cx + 6, cy);
        break;
      case 'jump':
        ctx.moveTo(cx - 7, cy + 4);
        ctx.lineTo(cx + 7, cy + 4);
        ctx.lineTo(cx, cy - 6);
        break;
      case 'run':
        // Double chevron, echoing a fast-forward symbol.
        ctx.moveTo(cx - 7, cy - 6);
        ctx.lineTo(cx - 1, cy);
        ctx.lineTo(cx - 7, cy + 6);
        ctx.lineTo(cx - 5, cy + 6);
        ctx.lineTo(cx + 1, cy);
        ctx.lineTo(cx - 5, cy - 6);
        ctx.closePath();
        ctx.moveTo(cx, cy - 6);
        ctx.lineTo(cx + 6, cy);
        ctx.lineTo(cx, cy + 6);
        ctx.lineTo(cx + 2, cy + 6);
        ctx.lineTo(cx + 8, cy);
        ctx.lineTo(cx + 2, cy - 6);
        break;
    }
    ctx.closePath();
    ctx.fill();
  }
}
