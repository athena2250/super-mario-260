/**
 * Action-based input state.
 *
 * Gameplay code asks for *actions* ("left", "jump"), never for keys. That
 * indirection is what lets the keyboard and the on-screen touch controls feed
 * the exact same state through `press()` / `release()` - there is only one
 * movement code path, and rebinding later means editing one table.
 *
 * @module input/Input
 */

/**
 * Physical key -> action. Both WASD and arrows are bound because players expect
 * whichever they already use, and neither costs anything to support.
 * @type {Record<string, string>}
 */
const KEY_BINDINGS = Object.freeze({
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  KeyJ: 'run',
});

/**
 * Keys whose default browser behaviour would disrupt play (scrolling the page,
 * activating a focused element) while the game is running.
 * @type {Set<string>}
 */
const SWALLOWED_KEYS = new Set(Object.keys(KEY_BINDINGS));

export class Input {
  constructor() {
    /** Actions currently held. @type {Set<string>} @private */
    this._held = new Set();

    /** Actions that went down during the current step. @type {Set<string>} @private */
    this._pressed = new Set();

    /** Actions that went up during the current step. @type {Set<string>} @private */
    this._released = new Set();

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this.releaseAll.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    // Losing focus mid-keypress never delivers the keyup, which would leave
    // Pip running into a wall forever. Clear everything instead.
    window.addEventListener('blur', this._onBlur);
  }

  /**
   * Is the action currently held down?
   * @param {string} action
   * @returns {boolean}
   */
  isDown(action) {
    return this._held.has(action);
  }

  /**
   * Did the action go down during this step? Edge-triggered - use this for
   * jumps so that holding the button does not retrigger.
   * @param {string} action
   * @returns {boolean}
   */
  justPressed(action) {
    return this._pressed.has(action);
  }

  /**
   * Did the action go up during this step? Needed for variable jump height
   * (Milestone 4), where releasing early cuts the jump short.
   * @param {string} action
   * @returns {boolean}
   */
  justReleased(action) {
    return this._released.has(action);
  }

  /**
   * Signed horizontal intent: -1, 0 or +1. Pressing both directions cancels
   * out, which is the least surprising result.
   * @returns {number}
   */
  get axisX() {
    return (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
  }

  /**
   * Begin an action. Called by the key handler and by the touch controls.
   * @param {string} action
   */
  press(action) {
    if (this._held.has(action)) return; // Ignore auto-repeat.
    this._held.add(action);
    this._pressed.add(action);
  }

  /**
   * End an action.
   * @param {string} action
   */
  release(action) {
    if (!this._held.delete(action)) return;
    this._released.add(action);
  }

  /** Release every held action. Used on focus loss. */
  releaseAll() {
    for (const action of this._held) this._released.add(action);
    this._held.clear();
  }

  /**
   * Clear the edge-triggered sets. Must be called once at the end of every
   * simulation step, after all consumers have read their input.
   */
  endStep() {
    this._pressed.clear();
    this._released.clear();
  }

  /** Detach listeners. */
  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
  }

  /**
   * @param {KeyboardEvent} event
   * @private
   */
  _onKeyDown(event) {
    if (SWALLOWED_KEYS.has(event.code)) event.preventDefault();

    const action = KEY_BINDINGS[event.code];
    // `event.repeat` is the OS key-repeat stream; press() already guards, but
    // returning early keeps the intent explicit.
    if (!action || event.repeat) return;
    this.press(action);
  }

  /**
   * @param {KeyboardEvent} event
   * @private
   */
  _onKeyUp(event) {
    const action = KEY_BINDINGS[event.code];
    if (!action) return;
    this.release(action);
  }
}
