/**
 * Top-level application state.
 *
 * {@link GameState} owns what happens *inside* a level - lives, score, the
 * chest animation. This owns which screen the game is on at all, and the fade
 * between them. Keeping the two apart means the menu system never has to reason
 * about a run's score, and the run never has to know a menu exists.
 *
 * Transitions are not instant: `go()` fades the screen out, swaps at the
 * darkest point (running an optional callback there, so the work a swap needs
 * is never visible), then fades back in. Input is refused while that runs, so a
 * double-tap cannot queue two screen changes.
 *
 * @module core/AppState
 */

import { UI } from './Config.js';

/**
 * Every screen the game can be on.
 * @enum {string}
 */
export const STATE = Object.freeze({
  MAIN_MENU: 'mainMenu',
  HOW_TO_PLAY: 'howToPlay',
  LEVEL_SELECT: 'levelSelect',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LEVEL_COMPLETE: 'levelComplete',
  TIME_UP: 'timeUp',
  GAME_OVER: 'gameOver',
  FINAL_VICTORY: 'finalVictory',
});

/** Phases of the crossfade. @enum {string} */
const FADE = Object.freeze({
  IDLE: 'idle',
  OUT: 'out',
  IN: 'in',
});

export class AppState {
  /**
   * @param {string} [initial=STATE.MAIN_MENU] - Screen to open on.
   */
  constructor(initial = STATE.MAIN_MENU) {
    /** The screen currently being updated and drawn. @type {string} */
    this.state = initial;

    /** The screen departed from, for screens that want to go "back". @type {string|null} */
    this.previous = null;

    /** @type {string} @private */
    this._fadePhase = FADE.IDLE;

    /** Curtain opacity, 0 clear .. 1 opaque. @type {number} @private */
    this._curtain = 0;

    /** @type {string|null} @private */
    this._pending = null;

    /** @type {(() => void)|null} @private */
    this._onSwap = null;
  }

  /**
   * True while a transition is running. Screens must ignore input then, or a
   * press meant for the next screen is spent on the one leaving.
   * @returns {boolean}
   */
  get busy() {
    return this._fadePhase !== FADE.IDLE;
  }

  /**
   * @param {string} state
   * @returns {boolean}
   */
  is(state) {
    return this.state === state;
  }

  /**
   * Begin a transition to another screen.
   *
   * @param {string} state - A {@link STATE} value.
   * @param {object} [options]
   * @param {boolean} [options.instant=false] - Swap without fading. Used for
   *   pause, which must not black out the level behind it.
   * @param {() => void} [options.onSwap] - Run at the darkest point of the
   *   fade, or immediately when instant. Load levels here.
   * @param {boolean} [options.reenter=false] - Allow a transition to the state
   *   already current. Restarting a level and moving to the next one are both
   *   `PLAYING` to `PLAYING`, and both want the fade.
   */
  go(state, { instant = false, onSwap = null, reenter = false } = {}) {
    if (this.busy) return;
    if (state === this.state && !reenter) return;

    if (instant) {
      onSwap?.();
      this._swapTo(state);
      return;
    }

    this._pending = state;
    this._onSwap = onSwap;
    this._fadePhase = FADE.OUT;
  }

  /**
   * Advance the transition.
   * @param {number} dt
   */
  update(dt) {
    if (this._fadePhase === FADE.OUT) {
      this._curtain = Math.min(1, this._curtain + dt / UI.fadeOut);
      if (this._curtain < 1) return;

      this._onSwap?.();
      this._onSwap = null;
      this._swapTo(this._pending);
      this._pending = null;
      this._fadePhase = FADE.IN;
      return;
    }

    if (this._fadePhase === FADE.IN) {
      this._curtain = Math.max(0, this._curtain - dt / UI.fadeIn);
      if (this._curtain === 0) this._fadePhase = FADE.IDLE;
    }
  }

  /**
   * Draw the transition curtain. Must be the last thing drawn in a frame, so it
   * covers the interface as well as the world.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   */
  renderCurtain(ctx, width, height) {
    if (this._curtain <= 0) return;

    // Smoothstep rather than linear: a linear fade spends most of its time at
    // the ends, where nothing is happening, and crosses the middle - the part
    // the eye actually reads - too fast.
    const t = this._curtain;
    const eased = t * t * (3 - 2 * t);

    ctx.globalAlpha = eased;
    ctx.fillStyle = UI.curtain;
    ctx.fillRect(0, 0, width, height);

    // A band of lantern light rides the curtain's edge, so a transition reads
    // as the Hollow closing over the screen rather than as a video cut.
    if (eased > 0.02 && eased < 0.98) {
      const edge = Math.round(height * eased);
      ctx.globalAlpha = (1 - Math.abs(eased - 0.5) * 2) * 0.5;
      ctx.fillStyle = UI.curtainEdge;
      ctx.fillRect(0, edge - 2, width, 2);
    }

    ctx.globalAlpha = 1;
  }

  /**
   * @param {string} state
   * @private
   */
  _swapTo(state) {
    this.previous = this.state;
    this.state = state;
  }
}
