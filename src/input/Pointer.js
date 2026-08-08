/**
 * Mouse and touch position, in logical game pixels.
 *
 * Only the menus use this - gameplay reads actions from {@link Input} and never
 * a cursor. It is kept separate from {@link TouchControls} because that module
 * owns the on-screen pad's own buttons; this one only reports where the pointer
 * is and whether it was clicked, and lets each screen decide what that means.
 *
 * Clicks are edge-triggered exactly like {@link Input}'s presses, and cleared by
 * `endStep()` for the same reason: every consumer in a step must see the same
 * click, and none of them should see it twice.
 *
 * @module input/Pointer
 */

export class Pointer {
  /**
   * @param {import('../core/Viewport.js').Viewport} viewport
   */
  constructor(viewport) {
    this.viewport = viewport;

    /** Position in logical pixels. @type {number} */
    this.x = -1;
    /** @type {number} */
    this.y = -1;

    /** True on the step the pointer went down. @type {boolean} */
    this.clicked = false;

    /**
     * True once the pointer has moved at all. Menus only follow the cursor
     * after it moves, so a keyboard player's selection is never stolen by a
     * mouse resting over a different button.
     * @type {boolean}
     */
    this.moved = false;

    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);

    const canvas = viewport.canvas;
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointerleave', this._onPointerLeave);
  }

  /**
   * Is the pointer inside a rectangle, in logical pixels?
   *
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @returns {boolean}
   */
  isOver(x, y, width, height) {
    return this.x >= x && this.x <= x + width && this.y >= y && this.y <= y + height;
  }

  /** Clear the movement flag. Screens call this when they open. */
  reset() {
    this.moved = false;
    this.clicked = false;
  }

  /** Clear edge-triggered state. Called once per simulation step. */
  endStep() {
    this.clicked = false;
    this.moved = false;
  }

  /** Detach listeners. */
  destroy() {
    const canvas = this.viewport.canvas;
    canvas.removeEventListener('pointermove', this._onPointerMove);
    canvas.removeEventListener('pointerdown', this._onPointerDown);
    canvas.removeEventListener('pointerleave', this._onPointerLeave);
  }

  /**
   * @param {PointerEvent} event
   * @private
   */
  _onPointerMove(event) {
    this._track(event);
    this.moved = true;
  }

  /**
   * @param {PointerEvent} event
   * @private
   */
  _onPointerDown(event) {
    this._track(event);
    this.clicked = true;
    // A tap has no hover phase, so it has to move the selection as well as
    // activate it, or the first tap would only highlight.
    this.moved = true;
  }

  /** @private */
  _onPointerLeave() {
    this.x = -1;
    this.y = -1;
  }

  /**
   * @param {PointerEvent} event
   * @private
   */
  _track(event) {
    const { x, y } = this.viewport.toGameCoords(event.clientX, event.clientY);
    this.x = x;
    this.y = y;
  }
}
