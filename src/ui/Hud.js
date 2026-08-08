/**
 * Heads-up display.
 *
 * Drawn in screen space, outside the camera transform. Shows only what a player
 * needs mid-jump: lives remaining, shards found, score, and the clock. The rune
 * sequence is deliberately *not* mirrored here - reading the tablet is part of
 * the puzzle, and a permanent copy on screen would remove the reason to explore
 * back to it.
 *
 * @module ui/Hud
 */

import { drawTextShadowed } from './PixelText.js';
import { URGENCY } from '../core/LevelTimer.js';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE } from '../core/Config.js';

/** Margin from the screen edges. */
const MARGIN = 6;

/**
 * How the clock reads at each level of urgency: its colour, how fast it
 * throbs, and whether it jitters.
 *
 * The escalation is deliberately in colour and rhythm rather than in size or
 * position - a readout that moves is one the player has to re-find, and the
 * whole point of the last ten seconds is that they can still see the platform
 * they are jumping to.
 */
const CLOCK_STYLE = Object.freeze({
  [URGENCY.CALM]: { color: PALETTE.lanternCore, pulse: 0, shake: 0 },
  [URGENCY.WARN]: { color: PALETTE.lantern, pulse: 2, shake: 0 },
  [URGENCY.ALARM]: { color: PALETTE.thistle, pulse: 5, shake: 0 },
  [URGENCY.CRITICAL]: { color: PALETTE.thistle, pulse: 9, shake: 1 },
});

export class Hud {
  constructor() {
    /** Seconds since the HUD was reset, driving the warning rhythms. @private */
    this._time = 0;

    /** Seconds remaining on the transient message banner. @type {number} @private */
    this._messageTimer = 0;
    /** @type {string} @private */
    this._message = '';
    /** @type {string} @private */
    this._messageColor = PALETTE.lanternCore;
  }

  /**
   * Show a short banner across the middle of the screen - used for puzzle
   * feedback like "RUNE SEALED" or "WRONG ORDER".
   *
   * @param {string} text
   * @param {string} [color]
   * @param {number} [duration=1.6]
   */
  showMessage(text, color = PALETTE.lanternCore, duration = 1.6) {
    this._message = text;
    this._messageColor = color;
    this._messageTimer = duration;
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    this._time += dt;
    this._messageTimer = Math.max(0, this._messageTimer - dt);
  }

  /** Clear any banner. Used on restart. */
  reset() {
    this._time = 0;
    this._messageTimer = 0;
    this._message = '';
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/GameState.js').GameState} state
   */
  render(ctx, state) {
    drawTextShadowed(ctx, `LEVEL ${state.levelNumber}`, MARGIN, MARGIN, {
      color: PALETTE.hazeGlow,
    });

    this._renderLives(ctx, state.lives, MARGIN + 9);

    drawTextShadowed(ctx, `${state.shards}/${state.shardTotal}`, MARGIN + 13, MARGIN + 19, {
      color: PALETTE.lantern,
    });
    // Shard pip beside the count, so the number needs no label.
    ctx.fillStyle = PALETTE.lantern;
    ctx.fillRect(MARGIN + 3, MARGIN + 20, 2, 4);
    ctx.fillRect(MARGIN + 2, MARGIN + 21, 4, 2);

    this._renderCheckpoints(ctx, state);
    this._renderClock(ctx, state);

    drawTextShadowed(ctx, String(state.score), GAME_WIDTH - MARGIN, MARGIN + 13, {
      color: PALETTE.lantern,
      align: 'right',
    });

    if (this._messageTimer > 0) this._renderMessage(ctx);
  }

  /**
   * The countdown, top right, escalating as it empties.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/GameState.js').GameState} state
   * @private
   */
  _renderClock(ctx, state) {
    const { urgency } = state.timer;
    const style = CLOCK_STYLE[urgency] ?? CLOCK_STYLE[URGENCY.CALM];

    // One throb per beat, never fading far enough to become hard to read.
    const beat = style.pulse > 0 ? (Math.sin(this._time * style.pulse) + 1) / 2 : 1;
    const jitter =
      style.shake > 0 && beat > 0.75 ? (Math.random() < 0.5 ? -style.shake : style.shake) : 0;

    if (urgency >= URGENCY.ALARM) this._renderAlarmEdge(ctx, urgency, beat);

    ctx.globalAlpha = 0.65 + beat * 0.35;
    drawTextShadowed(ctx, state.formattedRemaining, GAME_WIDTH - MARGIN + jitter, MARGIN, {
      color: style.color,
      align: 'right',
      scale: 2,
    });
    ctx.globalAlpha = 1;
  }

  /**
   * A thin bar of colour along the top and bottom edges in the last half
   * minute. Kept to the very edges and to a low alpha: it has to be felt at the
   * corner of the eye without tinting the platform Pip is aiming at.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} urgency
   * @param {number} beat - 0..1.
   * @private
   */
  _renderAlarmEdge(ctx, urgency, beat) {
    const thickness = urgency >= URGENCY.CRITICAL ? 3 : 2;
    const peak = urgency >= URGENCY.CRITICAL ? 0.3 : 0.16;

    ctx.globalAlpha = beat * peak;
    ctx.fillStyle = PALETTE.thistle;
    ctx.fillRect(0, 0, GAME_WIDTH, thickness);
    ctx.fillRect(0, GAME_HEIGHT - thickness, GAME_WIDTH, thickness);
    ctx.globalAlpha = 1;
  }

  /**
   * Beacons, top centre: the count, and one flame per beacon beneath it. The
   * flames are what make the number mean something at a glance - three dark
   * ones is a to-do list.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/GameState.js').GameState} state
   * @private
   */
  _renderCheckpoints(ctx, state) {
    const total = state.checkpointTotal;
    if (total === 0) return;

    const centerX = GAME_WIDTH / 2;
    const complete = state.allCheckpointsLit;

    drawTextShadowed(ctx, `${state.checkpoints}/${total}`, centerX, MARGIN, {
      color: complete ? PALETTE.lanternCore : PALETTE.lantern,
      align: 'center',
    });

    // One pip per beacon, lit left to right as they are earned.
    const spacing = 7;
    const startX = Math.round(centerX - ((total - 1) * spacing) / 2);

    for (let i = 0; i < total; i++) {
      const lit = i < state.checkpoints;
      const x = startX + i * spacing;

      ctx.fillStyle = PALETTE.stone;
      ctx.fillRect(x - 2, MARGIN + 8, 5, 5);
      ctx.fillStyle = lit ? PALETTE.lantern : PALETTE.runeDormant;
      ctx.fillRect(x - 1, MARGIN + 9, 3, 3);
      if (lit) {
        ctx.fillStyle = PALETTE.lanternCore;
        ctx.fillRect(x, MARGIN + 10, 1, 1);
      }
    }
  }

  /**
   * Lives as lantern pips rather than a number: readable at a glance without
   * having to parse a digit.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} lives
   * @param {number} y - Top edge of the row.
   * @private
   */
  _renderLives(ctx, lives, y) {
    for (let i = 0; i < Math.max(0, lives); i++) {
      const x = MARGIN + i * 9;
      ctx.fillStyle = PALETTE.stone;
      ctx.fillRect(x, y, 7, 2);
      ctx.fillStyle = PALETTE.lantern;
      ctx.fillRect(x + 1, y + 2, 5, 4);
      ctx.fillStyle = PALETTE.lanternCore;
      ctx.fillRect(x + 2, y + 3, 3, 2);
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _renderMessage(ctx) {
    // Fade out over the last half second rather than vanishing mid-read.
    ctx.globalAlpha = Math.min(1, this._messageTimer / 0.5);

    const centerX = GAME_WIDTH / 2;
    drawTextShadowed(ctx, this._message, centerX, 34, {
      color: this._messageColor,
      align: 'center',
      scale: 2,
    });

    ctx.globalAlpha = 1;
  }
}
