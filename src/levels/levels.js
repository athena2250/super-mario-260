/**
 * The campaign, in order.
 *
 * One list, so nothing else in the game has to know how many levels there are
 * or what they are called. Level select, progression and the HUD all read from
 * here; adding a fourth level means importing it and appending one entry.
 *
 * Difficulty is authored, not computed: it is a promise to the player about
 * what a level will ask of them, and it belongs beside the level it describes.
 *
 * @module levels/levels
 */

import { level01 } from './level01.js';
import { level02 } from './level02.js';
import { level03 } from './level03.js';

/**
 * @typedef {object} LevelEntry
 * @property {number} number - 1-based, as shown to the player.
 * @property {string} name
 * @property {string} difficulty - One word, shown on the level select.
 * @property {string} blurb - One line on what this level is about.
 * @property {object} definition - The level data itself.
 */

/** @type {LevelEntry[]} */
export const LEVELS = Object.freeze([
  {
    number: 1,
    name: level01.name,
    difficulty: 'GENTLE',
    blurb: 'LEARN THE HOLLOW',
    definition: level01,
  },
  {
    number: 2,
    name: level02.name,
    difficulty: 'TESTING',
    blurb: 'HIGHER AND FURTHER',
    definition: level02,
  },
  {
    number: 3,
    name: level03.name,
    difficulty: 'PUNISHING',
    blurb: 'EVERYTHING AT ONCE',
    definition: level03,
  },
]);

/** How many levels the campaign has. @type {number} */
export const LEVEL_COUNT = LEVELS.length;

/**
 * Clamp an index to a real level, so a bad saved index can never boot the game
 * into nothing.
 *
 * @param {number} index
 * @returns {number}
 */
export function clampLevelIndex(index) {
  if (!Number.isInteger(index)) return 0;
  return Math.min(LEVEL_COUNT - 1, Math.max(0, index));
}
