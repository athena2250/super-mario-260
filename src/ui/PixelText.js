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
 * Rendered strings, keyed by exactly what determines their pixels.
 *
 * A glyph is one `fillRect` per lit pixel, so a HUD of five short readouts -
 * drawn twice each, once for its shadow - costs several hundred fill operations
 * every frame to redraw text that changes about once a second. Painting each
 * distinct string once into a small canvas and blitting it afterwards is the
 * same pixels for one draw call.
 *
 * The cache is bounded because the clock alone produces a new string every
 * second; the oldest entry goes when it is full.
 *
 * @type {Map<string, HTMLCanvasElement>}
 */
const stringCache = new Map();

/** Entries kept. Comfortably more than any one screen shows at once. */
const CACHE_LIMIT = 128;

/** Whether this environment can give us a canvas to cache into. */
const canCache = typeof document !== 'undefined' && typeof document.createElement === 'function';

/**
 * Paint glyphs directly, one `fillRect` per lit pixel. This is the definition
 * of what the font looks like; the cache is only a recording of it.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} upper - Already upper-cased.
 * @param {number} x - Left edge.
 * @param {number} y - Top edge.
 * @param {string} color
 * @param {number} scale
 */
function paintGlyphs(ctx, upper, x, y, color, scale) {
  ctx.fillStyle = color;

  let cursorX = x;
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
}

/**
 * The cached canvas for a string, painting it if this is the first time.
 *
 * @param {string} upper
 * @param {number} width - Already measured, in pixels.
 * @param {string} color
 * @param {number} scale
 * @returns {HTMLCanvasElement}
 */
function cachedString(upper, width, color, scale) {
  const key = `${scale}|${color}|${upper}`;
  const existing = stringCache.get(key);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = GLYPH_HEIGHT * scale;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  paintGlyphs(ctx, upper, 0, 0, color, scale);

  if (stringCache.size >= CACHE_LIMIT) {
    stringCache.delete(stringCache.keys().next().value);
  }
  stringCache.set(key, canvas);
  return canvas;
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
  return paintString(ctx, String(text).toUpperCase(), x, y, color, scale, align);
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
  const {
    color = '#fff2c9',
    shadowColor = '#1b1033',
    scale = 1,
    align = 'left',
  } = options;

  const upper = String(text).toUpperCase();
  paintString(ctx, upper, x + scale, y + scale, shadowColor, scale, align);
  return paintString(ctx, upper, x, y, color, scale, align);
}

/**
 * Shared body of both public draws: work out where the string starts, then
 * either blit it or paint it.
 *
 * The cache is skipped for fractional positions. A `fillRect` at a fractional
 * coordinate and a `drawImage` at one do not antialias identically, and the
 * point of this font is that what is drawn is exactly what was asked for.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} upper
 * @param {number} x
 * @param {number} y
 * @param {string} color
 * @param {number} scale
 * @param {'left'|'center'|'right'} align
 * @returns {number} The width drawn, in pixels.
 */
function paintString(ctx, upper, x, y, color, scale, align) {
  const width = measureText(upper, scale);
  if (width <= 0) return width;

  let cursorX = x;
  if (align === 'center') cursorX = Math.round(x - width / 2);
  else if (align === 'right') cursorX = Math.round(x - width);

  if (canCache && Number.isInteger(cursorX) && Number.isInteger(y)) {
    ctx.drawImage(cachedString(upper, width, color, scale), cursorX, y);
  } else {
    paintGlyphs(ctx, upper, cursorX, y, color, scale);
  }

  return width;
}
