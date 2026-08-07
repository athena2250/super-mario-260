/**
 * Developer readout.
 *
 * Shown only when `DEBUG.showStats` is on. Uses the browser's own font rather
 * than the bitmap one, because this is a tool rather than part of the game and
 * legibility beats style here.
 *
 * @module ui/DebugOverlay
 */

import { GAME_HEIGHT, PALETTE } from '../core/Config.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../core/Loop.js').Loop} loop
 * @param {import('../entities/Player.js').Player} player
 * @param {import('../core/GameState.js').GameState} state
 */
export function renderDebugOverlay(ctx, loop, player, state) {
  const text =
    `${loop.fps.toFixed(0)} FPS  ` +
    `vx ${player.vx.toFixed(0)}  vy ${player.vy.toFixed(0)}  ` +
    `${player.grounded ? 'ground' : 'air'}  ` +
    `${state.phase}`;

  ctx.font = '8px monospace';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(2, GAME_HEIGHT - 12, ctx.measureText(text).width + 4, 11);
  ctx.fillStyle = PALETTE.lanternCore;
  ctx.fillText(text, 4, GAME_HEIGHT - 10);
}
