/**
 * Entry point.
 *
 * Kept deliberately thin: find the canvas, construct the Game, start it, and
 * surface any boot failure to the player instead of leaving a black screen.
 *
 * @module main
 */

import { Game } from './Game.js';

/** Boot the game once the DOM is ready. */
function boot() {
  const canvas = document.getElementById('game');

  if (!(canvas instanceof HTMLCanvasElement)) {
    reportFatal('Could not find the game canvas.');
    return;
  }

  try {
    const game = new Game(canvas);
    game.start();

    // Exposed for debugging from the browser console; nothing depends on it.
    globalThis.__lumenHollow = game;
  } catch (error) {
    console.error(error);
    reportFatal('This browser could not start the game.');
  }
}

/**
 * Replace the stage with a readable message. Used only for failures that make
 * the game unplayable, where a silent black canvas would be worse.
 *
 * @param {string} message
 */
function reportFatal(message) {
  const stage = document.getElementById('stage');
  if (!stage) return;
  stage.textContent = message;
  stage.style.color = '#ffc45e';
  stage.style.font = '16px system-ui, sans-serif';
  stage.style.textAlign = 'center';
}

// Module scripts are deferred, so the DOM is usually parsed by now; the guard
// covers the case where this module is loaded some other way.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
