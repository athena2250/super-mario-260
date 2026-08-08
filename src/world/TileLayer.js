/**
 * Pre-rendered tile artwork.
 *
 * The tile grid is static almost all of the time - only the puzzle ever changes
 * a cell - but drawing it from primitives costs one `fillStyle` change and
 * several `fillRect`s per visible tile, every frame, forever. At 480x270 that is
 * around 160 visible tiles and 800 fill operations per frame spent redrawing
 * pixels that did not change.
 *
 * So the artwork is painted once into offscreen canvases and blitted. The
 * drawing code in `tileArt.js` is untouched and still the single source of what
 * a tile looks like; this module only decides *when* it runs.
 *
 * Chunked rather than one canvas the size of the level: a long level would
 * otherwise need a single texture wider than the 4096 px many mobile GPUs
 * accept, at which point the browser silently falls back to something much
 * slower. Chunks also mean a changed tile repaints one small canvas.
 *
 * @module world/TileLayer
 */

import { TILE_SIZE } from '../core/Config.js';
import { TILE } from './tiles.js';
import { drawTile } from './tileArt.js';

/** Chunk size in tiles. 64 x 32 is 1024 x 512 px - comfortably within limits. */
const CHUNK_COLS = 64;
const CHUNK_ROWS = 32;

/**
 * Whether this environment can give us an offscreen canvas. Node (used by the
 * level tooling) cannot, and falls back to drawing tiles directly.
 *
 * @returns {boolean}
 */
function canCache() {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

export class TileLayer {
  /**
   * @param {import('./TileMap.js').TileMap} map
   */
  constructor(map) {
    /** @type {import('./TileMap.js').TileMap} @private */
    this._map = map;

    /** @type {boolean} @private */
    this._enabled = canCache();

    /** Chunks across and down. @private */
    this._cols = Math.ceil(map.cols / CHUNK_COLS);
    this._rows = Math.ceil(map.rows / CHUNK_ROWS);

    /**
     * Chunk canvases, row-major. Built up front rather than on first sight: a
     * chunk costs a few thousand fill operations, and paying that during the
     * level's loading fade is invisible where paying it mid-run is a dropped
     * frame as the player crosses a boundary.
     * @type {Array<HTMLCanvasElement|null>}
     * @private
     */
    this._chunks = new Array(this._cols * this._rows).fill(null);

    if (this._enabled) this._buildAll();
  }

  /**
   * Draw every tile intersecting the view.
   *
   * @param {CanvasRenderingContext2D} ctx - Already inside the camera transform,
   *   so world coordinates map straight onto it.
   * @param {{x: number, y: number, width: number, height: number}} view
   */
  render(ctx, view) {
    if (!this._enabled) {
      this._drawTilesDirectly(ctx, view);
      return;
    }

    const firstCol = Math.max(0, Math.floor(view.x / (CHUNK_COLS * TILE_SIZE)));
    const lastCol = Math.min(
      this._cols - 1,
      Math.floor((view.x + view.width) / (CHUNK_COLS * TILE_SIZE)),
    );
    const firstRow = Math.max(0, Math.floor(view.y / (CHUNK_ROWS * TILE_SIZE)));
    const lastRow = Math.min(
      this._rows - 1,
      Math.floor((view.y + view.height) / (CHUNK_ROWS * TILE_SIZE)),
    );

    for (let row = firstRow; row <= lastRow; row++) {
      for (let col = firstCol; col <= lastCol; col++) {
        const chunk = this._chunks[row * this._cols + col];
        if (!chunk) continue;

        // Whole-pixel destination: the camera has already rounded its
        // translation, so the blit lands exactly on the pixel grid.
        ctx.drawImage(chunk, col * CHUNK_COLS * TILE_SIZE, row * CHUNK_ROWS * TILE_SIZE);
      }
    }
  }

  /**
   * Repaint one cell, after the puzzle has swapped what stands there.
   *
   * The cell is cleared before it is redrawn because tiles may be drawn with
   * transparency - painting the new tile over the old one would leave the old
   * one showing through.
   *
   * @param {number} col
   * @param {number} row
   */
  invalidateTile(col, row) {
    if (!this._enabled) return;

    const chunkCol = Math.floor(col / CHUNK_COLS);
    const chunkRow = Math.floor(row / CHUNK_ROWS);
    const chunk = this._chunks[chunkRow * this._cols + chunkCol];
    if (!chunk) return;

    const ctx = chunk.getContext('2d');
    const x = (col - chunkCol * CHUNK_COLS) * TILE_SIZE;
    const y = (row - chunkRow * CHUNK_ROWS) * TILE_SIZE;

    ctx.clearRect(x, y, TILE_SIZE, TILE_SIZE);

    const tile = this._map.tileAt(col, row);
    if (tile === TILE.EMPTY) return;

    // `drawTile` works in world coordinates, so the chunk's own origin is
    // translated away first.
    ctx.save();
    ctx.translate(-chunkCol * CHUNK_COLS * TILE_SIZE, -chunkRow * CHUNK_ROWS * TILE_SIZE);
    drawTile(ctx, tile, col, row);
    ctx.restore();
  }

  /** @private */
  _buildAll() {
    for (let row = 0; row < this._rows; row++) {
      for (let col = 0; col < this._cols; col++) {
        this._chunks[row * this._cols + col] = this._buildChunk(col, row);
      }
    }
  }

  /**
   * @param {number} chunkCol
   * @param {number} chunkRow
   * @returns {HTMLCanvasElement}
   * @private
   */
  _buildChunk(chunkCol, chunkRow) {
    const map = this._map;
    const startCol = chunkCol * CHUNK_COLS;
    const startRow = chunkRow * CHUNK_ROWS;
    const endCol = Math.min(map.cols, startCol + CHUNK_COLS);
    const endRow = Math.min(map.rows, startRow + CHUNK_ROWS);

    const canvas = document.createElement('canvas');
    canvas.width = (endCol - startCol) * TILE_SIZE;
    canvas.height = (endRow - startRow) * TILE_SIZE;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // `drawTile` works in world coordinates, so the chunk's origin is shifted
    // away for the duration of the paint and put back afterwards. A translate
    // left in place would silently offset every later repaint of this chunk.
    ctx.save();
    ctx.translate(-startCol * TILE_SIZE, -startRow * TILE_SIZE);

    for (let row = startRow; row < endRow; row++) {
      const rowOffset = row * map.cols;
      for (let col = startCol; col < endCol; col++) {
        const tile = map.tiles[rowOffset + col];
        if (tile !== TILE.EMPTY) drawTile(ctx, tile, col, row);
      }
    }

    ctx.restore();
    return canvas;
  }

  /**
   * The uncached path, for environments with no canvas of their own.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {{x: number, y: number, width: number, height: number}} view
   * @private
   */
  _drawTilesDirectly(ctx, view) {
    const map = this._map;
    const range = map.rangeFor(view);

    for (let row = range.rowStart; row <= range.rowEnd; row++) {
      const rowOffset = row * map.cols;
      for (let col = range.colStart; col <= range.colEnd; col++) {
        const tile = map.tiles[rowOffset + col];
        if (tile !== TILE.EMPTY) drawTile(ctx, tile, col, row);
      }
    }
  }
}
