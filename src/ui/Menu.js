/**
 * A vertical list of buttons.
 *
 * Every screen that offers a choice uses this one widget, so keyboard
 * navigation, pointer hover, the selection animation and the disabled state are
 * written once. Screens supply items and get back the id of whatever was
 * activated this step.
 *
 * Both input paths are live at all times: arrows move the selection, the
 * pointer moves it by hovering, and either confirm or a click activates. That
 * matters on a hybrid device, where a player may use both within one menu.
 *
 * @module ui/Menu
 */

import { drawText, drawTextShadowed } from './PixelText.js';
import { GAME_WIDTH, PALETTE, UI } from '../core/Config.js';

/** Text scale used for button labels. */
const LABEL_SCALE = 2;

/** How far the selected button's frame breathes, in pixels. */
const BREATHE = 2;

/**
 * @typedef {object} MenuItem
 * @property {string} id - Returned when the item is activated.
 * @property {string} label
 * @property {boolean} [disabled] - Selectable, but cannot be activated. Used
 *   for locked levels, which must stay visible to be worth unlocking.
 * @property {string} [note] - Small text drawn to the right of the label.
 * @property {string} [color] - Overrides the label colour.
 */

export class Menu {
  /**
   * @param {MenuItem[]} items
   * @param {object} [options]
   * @param {number} [options.y=150] - Top edge of the first button.
   * @param {number} [options.centerX] - Horizontal centre of the column.
   * @param {number} [options.width] - Button width.
   */
  constructor(items, { y = 150, centerX = GAME_WIDTH / 2, width = UI.buttonWidth } = {}) {
    /** @type {MenuItem[]} */
    this.items = items;

    /** @type {number} */
    this.y = y;
    /** @type {number} */
    this.centerX = centerX;
    /** @type {number} */
    this.width = width;

    /** Index of the highlighted item. @type {number} */
    this.index = 0;

    /** Seconds since the menu opened, drives the idle animation. @private */
    this._time = 0;

    /** Seconds left on the "just moved" nudge. @type {number} @private */
    this._nudge = 0;
  }

  /**
   * Replace the items, keeping the selection in range.
   * @param {MenuItem[]} items
   */
  setItems(items) {
    this.items = items;
    this.index = Math.min(this.index, Math.max(0, items.length - 1));
  }

  /** The currently highlighted item. @returns {MenuItem|undefined} */
  get selected() {
    return this.items[this.index];
  }

  /** Rewind to the first item. Called when a screen opens. */
  reset() {
    this.index = 0;
    this._time = 0;
    this._nudge = 0;
  }

  /**
   * Bounding box of one button.
   *
   * @param {number} index
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  boundsOf(index) {
    return {
      x: Math.round(this.centerX - this.width / 2),
      y: this.y + index * (UI.buttonHeight + UI.buttonGap),
      width: this.width,
      height: UI.buttonHeight,
    };
  }

  /** Total height of the column, so screens can lay out around it. @returns {number} */
  get height() {
    return this.items.length * (UI.buttonHeight + UI.buttonGap) - UI.buttonGap;
  }

  /**
   * Read input and report what the player did.
   *
   * @param {number} dt
   * @param {import('../input/Input.js').Input} input
   * @param {import('../input/Pointer.js').Pointer} pointer
   * @returns {{action: 'move'|'activate'|'refused', id?: string}|null}
   */
  update(dt, input, pointer) {
    this._time += dt;
    this._nudge = Math.max(0, this._nudge - dt);

    if (this.items.length === 0) return null;

    if (input.justPressed('menuUp')) return this._move(-1);
    if (input.justPressed('menuDown')) return this._move(1);

    const hovered = this._hitTest(pointer);
    const clickedItem = pointer.clicked && hovered >= 0;

    // Activation is tested before hover, so a tap on an unselected button acts
    // on it immediately. Testing hover first would spend the first tap of every
    // touch interaction on merely moving the highlight.
    if (clickedItem || input.justPressed('confirm')) {
      const index = clickedItem ? hovered : this.index;
      const item = this.items[index];
      if (!item) return null;

      this.index = index;
      return { action: item.disabled ? 'refused' : 'activate', id: item.id };
    }

    if (pointer.moved && hovered >= 0 && hovered !== this.index) {
      this.index = hovered;
      this._nudge = 0.18;
      return { action: 'move' };
    }

    return null;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    this.items.forEach((item, index) => {
      const selected = index === this.index;
      const bounds = this.boundsOf(index);
      this._renderButton(ctx, item, bounds, selected);
    });
  }

  /**
   * @param {number} delta - -1 or +1.
   * @returns {{action: 'move'}}
   * @private
   */
  _move(delta) {
    const count = this.items.length;
    this.index = (this.index + delta + count) % count;
    this._nudge = 0.18;
    return { action: 'move' };
  }

  /**
   * Index of the item under the pointer, or -1.
   *
   * @param {import('../input/Pointer.js').Pointer} pointer
   * @returns {number}
   * @private
   */
  _hitTest(pointer) {
    for (let index = 0; index < this.items.length; index++) {
      const b = this.boundsOf(index);
      // Fingers are imprecise, so the hit box is taller than the frame drawn.
      if (pointer.isOver(b.x - 4, b.y - 4, b.width + 8, b.height + 8)) return index;
    }
    return -1;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {MenuItem} item
   * @param {{x: number, y: number, width: number, height: number}} bounds
   * @param {boolean} selected
   * @private
   */
  _renderButton(ctx, item, bounds, selected) {
    // The selected frame widens slightly and pulses, so which button is live is
    // obvious in peripheral vision without needing colour alone to carry it.
    const pulse = selected ? (Math.sin(this._time * 4) + 1) / 2 : 0;
    const grow = selected ? Math.round(BREATHE * pulse) + (this._nudge > 0 ? 1 : 0) : 0;

    const x = bounds.x - grow;
    const y = bounds.y;
    const width = bounds.width + grow * 2;
    const { height } = bounds;

    ctx.globalAlpha = selected ? 0.75 : 0.45;
    ctx.fillStyle = PALETTE.stone;
    ctx.fillRect(x, y, width, height);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = selected ? PALETTE.lantern : PALETTE.runeDormant;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    const labelColor = item.disabled
      ? PALETTE.runeDormant
      : (item.color ?? (selected ? PALETTE.lanternCore : PALETTE.hazeGlow));

    const textY = y + Math.round((height - 5 * LABEL_SCALE) / 2);
    drawTextShadowed(ctx, item.label, this.centerX, textY, {
      color: labelColor,
      align: 'center',
      scale: LABEL_SCALE,
    });

    if (item.note) {
      drawText(ctx, item.note, x + width + 8, y + 8, {
        color: item.disabled ? PALETTE.runeDormant : PALETTE.runeVerdant,
      });
    }

    if (selected) this._renderMarkers(ctx, x, y, width, height, pulse);
  }

  /**
   * Lantern pips either side of the live button, drifting in with the pulse.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {number} pulse - 0..1.
   * @private
   */
  _renderMarkers(ctx, x, y, width, height, pulse) {
    const drift = Math.round(pulse * 2);
    const midY = y + Math.round(height / 2) - 1;

    ctx.fillStyle = PALETTE.lantern;
    ctx.fillRect(x - 6 - drift, midY, 3, 3);
    ctx.fillRect(x + width + 3 + drift, midY, 3, 3);
  }
}
