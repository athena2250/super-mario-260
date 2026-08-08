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
 * Physical key -> action, or several actions.
 *
 * Both WASD and arrows are bound because players expect whichever they already
 * use, and neither costs anything to support. A key may drive more than one
 * action: up is both `jump` in the level and `menuUp` in a menu. Because only
 * one of those consumers is ever listening at a time, binding both to the same
 * key is what keeps the controls identical everywhere instead of teaching the
 * player a second, menu-only keyboard.
 *
 * @type {Record<string, string|string[]>}
 */
const KEY_BINDINGS = Object.freeze({
  ArrowLeft: ['left', 'menuLeft'],
  KeyA: ['left', 'menuLeft'],
  ArrowRight: ['right', 'menuRight'],
  KeyD: ['right', 'menuRight'],
  ArrowDown: ['down', 'menuDown'],
  KeyS: ['down', 'menuDown'],
  ArrowUp: ['jump', 'menuUp'],
  KeyW: ['jump', 'menuUp'],
  Space: ['jump', 'confirm'],
  Enter: 'confirm',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  KeyJ: 'run',
  Escape: ['pause', 'back'],
  KeyP: 'pause',
});

/**
 * Keys whose default browser behaviour would disrupt play (scrolling the page,
 * activating a focused element) while the game is running.
 *
 * Escape is deliberately excluded: swallowing it would trap the player in
 * fullscreen, and nothing it does by default interferes with the game.
 * @type {Set<string>}
 */
const SWALLOWED_KEYS = new Set(
  Object.keys(KEY_BINDINGS).filter((code) => code !== 'Escape'),
);

/**
 * Normalise a binding to a list, so the handlers have one shape to deal with.
 *
 * @param {string|string[]|undefined} binding
 * @returns {string[]}
 */
function actionsFor(binding) {
  if (binding === undefined) return [];
  return Array.isArray(binding) ? binding : [binding];
}

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

    // `event.repeat` is the OS key-repeat stream; press() already guards, but
    // returning early keeps the intent explicit.
    if (event.repeat) return;
    for (const action of actionsFor(KEY_BINDINGS[event.code])) this.press(action);
  }

  /**
   * @param {KeyboardEvent} event
   * @private
   */
  _onKeyUp(event) {
    for (const action of actionsFor(KEY_BINDINGS[event.code])) this.release(action);
  }
}
