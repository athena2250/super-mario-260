/**
 * A 3x5 bitmap font.
 *
 * The canvas text API renders anti-aliased vector glyphs, which look wrong at
 * this resolution - soft grey edges against art that is otherwise hard pixels.
 * Drawing letters as rectangles from a bitmap keeps the HUD in the same visual
 * language as the game, and needs no font file to load.
 *
 * @module ui/PixelText
 */

/** Glyph width and height in pixels, before scaling. */
export const GLYPH_WIDTH = 3;
export const GLYPH_HEIGHT = 5;

/** Blank columns between glyphs, before scaling. */
export const LETTER_SPACING = 1;

/**
 * Glyphs as five rows of three bits. Uppercase only: a lowercase set would
 * double the table for text that is all headings and numbers anyway.
 * @type {Record<string, string[]>}
 */
const GLYPHS = Object.freeze({
  A: ['111', '101', '111', '101', '101'],
  B: ['110', '101', '110', '101', '110'],
  C: ['111', '100', '100', '100', '111'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '111', '100', '111'],
  F: ['111', '100', '111', '100', '100'],
  G: ['111', '100', '101', '101', '111'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  J: ['001', '001', '001', '101', '111'],
  K: ['101', '101', '110', '101', '101'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'],
  N: ['110', '101', '101', '101', '101'],
  O: ['111', '101', '101', '101', '111'],
  P: ['111', '101', '111', '100', '100'],
  Q: ['111', '101', '101', '111', '001'],
  R: ['111', '101', '110', '101', '101'],
  S: ['111', '100', '111', '001', '111'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'],
  W: ['101', '101', '111', '111', '101'],
  X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'],
  Z: ['111', '001', '010', '100', '111'],
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '001', '001', '001'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
  ':': ['000', '010', '000', '010', '000'],
  '/': ['001', '001', '010', '100', '100'],
  '!': ['010', '010', '010', '000', '010'],
  '.': ['000', '000', '000', '000', '010'],
  '-': ['000', '000', '111', '000', '000'],
  "'": ['010', '010', '000', '000', '000'],
  '?': ['111', '001', '011', '000', '010'],
  '*': ['101', '010', '111', '010', '101'],
  ' ': ['000', '000', '000', '000', '000'],
});

/**
 * Width of a string in pixels at a given scale.
 *
 * @param {string} text
 * @param {number} [scale=1]
 * @returns {number}
 */
export function measureText(text, scale = 1) {
  if (text.length === 0) return 0;
  const glyphs = text.length * (GLYPH_WIDTH + LETTER_SPACING) - LETTER_SPACING;
  return glyphs * scale;
}

/**
 * Draw a string.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text - Case-insensitive; unknown characters render blank.
 * @param {number} x - Left edge, or the anchor point when `align` is set.
 * @param {number} y - Top edge.
 * @param {object} [options]
 * @param {string} [options.color='#fff2c9']
 * @param {number} [options.scale=1] - Whole numbers only, to stay pixel-exact.
 * @param {'left'|'center'|'right'} [options.align='left']
 * @returns {number} The width drawn, in pixels.
 */
export function drawText(ctx, text, x, y, { color = '#fff2c9', scale = 1, align = 'left' } = {}) {
  const upper = String(text).toUpperCase();
  const width = measureText(upper, scale);

  let cursorX = x;
  if (align === 'center') cursorX = Math.round(x - width / 2);
  else if (align === 'right') cursorX = Math.round(x - width);

  ctx.fillStyle = color;

  for (const char of upper) {
    const glyph = GLYPHS[char];
    if (glyph) {
      for (let row = 0; row < GLYPH_HEIGHT; row++) {
        const bits = glyph[row];
        for (let col = 0; col < GLYPH_WIDTH; col++) {
          if (bits[col] === '1') {
            ctx.fillRect(cursorX + col * scale, y + row * scale, scale, scale);
          }
        }
      }
    }
    cursorX += (GLYPH_WIDTH + LETTER_SPACING) * scale;
  }

  return width;
}

/**
 * Draw a string with a hard one-pixel drop shadow, for text that has to stay
 * readable over busy artwork.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {object} [options] - As {@link drawText}, plus `shadowColor`.
 * @param {string} [options.shadowColor='#1b1033']
 * @returns {number}
 */
export function drawTextShadowed(ctx, text, x, y, options = {}) {
  const { shadowColor = '#1b1033', scale = 1 } = options;
  drawText(ctx, text, x + scale, y + scale, { ...options, color: shadowColor });
  return drawText(ctx, text, x, y, options);
}
