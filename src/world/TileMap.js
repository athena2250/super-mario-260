/**
 * The tile grid.
 *
 * Stores a level as a flat `Uint8Array` of tile ids and answers the queries
 * collision and rendering need. Everything is O(1) lookup by grid coordinate;
 * nothing iterates the whole level per frame.
 *
 * @module world/TileMap
 */

import { TILE_SIZE } from '../core/Config.js';
import {
  TILE,
  CHAR_TO_TILE,
  CHAR_TO_OBJECT,
  PLATFORM_VARIANT,
  SWITCH_INDEX,
  SPAWN_CHAR,
  isSolid,
  isPlatform,
  isHazard,
} from './tiles.js';
import { drawTile } from './tileArt.js';

export class TileMap {
  /**
   * @param {{name: string, rows: string[]}} definition - Level data. Rows are
   *   ASCII art; see `src/levels/` and the legend in `world/tiles.js`.
   */
  constructor(definition) {
    /** @type {string} */
    this.name = definition.name;

    /** Width in tiles. @type {number} */
    this.cols = Math.max(...definition.rows.map((row) => row.length));

    /** Height in tiles. @type {number} */
    this.rows = definition.rows.length;

    /** Tile ids, row-major. @type {Uint8Array} */
    this.tiles = new Uint8Array(this.cols * this.rows);

    /**
     * Pip's start position, as the top-left of a tile. Read from the `P`
     * marker in the level data so spawn points live with the level, not in
     * code.
     * @type {{col: number, row: number}}
     */
    this.spawn = { col: 1, row: 1 };

    /**
     * Entity placements read from the level's object markers. The game builds
     * real objects from these, so level files never reference constructors.
     * @type {Array<{type: string, col: number, row: number, index?: number}>}
     */
    this.objects = [];

    this._parse(definition.rows);

    /**
     * Pristine copy of the grid, taken before anything can mutate it. Restoring
     * from this is how a level restart undoes opened vaults and raised bridges.
     * @type {Uint8Array}
     * @private
     */
    this._originalTiles = this.tiles.slice();
  }

  /**
   * Replace a tile. Used by the puzzle to raise bridges and open the vault.
   *
   * @param {number} col
   * @param {number} row
   * @param {number} tile - Tile id.
   */
  setTile(col, row, tile) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    this.tiles[row * this.cols + col] = tile;
  }

  /**
   * Find every grid cell holding a given tile id. Used once at load time to
   * locate the bridge and vault cells the puzzle will later swap.
   *
   * @param {number} tile - Tile id.
   * @returns {Array<{col: number, row: number}>}
   */
  findTiles(tile) {
    const found = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.tiles[row * this.cols + col] === tile) found.push({ col, row });
      }
    }
    return found;
  }

  /** Restore every tile to its authored state. */
  reset() {
    this.tiles.set(this._originalTiles);
  }

  /** Level width in pixels. @returns {number} */
  get pixelWidth() {
    return this.cols * TILE_SIZE;
  }

  /** Level height in pixels. @returns {number} */
  get pixelHeight() {
    return this.rows * TILE_SIZE;
  }

  /**
   * Tile id at a grid coordinate. Everything outside the grid is empty, which
   * makes falling off the bottom - and walking past the edges - fall through
   * to the caller's own bounds handling rather than to an exception.
   *
   * @param {number} col
   * @param {number} row
   * @returns {number} Tile id.
   */
  tileAt(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return TILE.EMPTY;
    }
    return this.tiles[row * this.cols + col];
  }

  /**
   * @param {number} col
   * @param {number} row
   * @returns {boolean}
   */
  isSolidAt(col, row) {
    return isSolid(this.tileAt(col, row));
  }

  /**
   * @param {number} col
   * @param {number} row
   * @returns {boolean}
   */
  isPlatformAt(col, row) {
    return isPlatform(this.tileAt(col, row));
  }

  /**
   * @param {number} col
   * @param {number} row
   * @returns {boolean}
   */
  isHazardAt(col, row) {
    return isHazard(this.tileAt(col, row));
  }

  /**
   * Grid column containing a world x coordinate.
   * @param {number} x
   * @returns {number}
   */
  colAt(x) {
    return Math.floor(x / TILE_SIZE);
  }

  /**
   * Grid row containing a world y coordinate.
   * @param {number} y
   * @returns {number}
   */
  rowAt(y) {
    return Math.floor(y / TILE_SIZE);
  }

  /**
   * Grid range overlapping a world-space rectangle, clamped to the map.
   *
   * The `- 0.0001` on the far edges matters: a box whose right edge lands
   * exactly on a tile boundary does not overlap the tile beyond it, and without
   * this it would snag on walls it is merely touching.
   *
   * @param {{x: number, y: number, width: number, height: number}} rect
   * @returns {{colStart: number, colEnd: number, rowStart: number, rowEnd: number}}
   */
  rangeFor(rect) {
    return {
      colStart: Math.max(0, this.colAt(rect.x)),
      colEnd: Math.min(this.cols - 1, this.colAt(rect.x + rect.width - 0.0001)),
      rowStart: Math.max(0, this.rowAt(rect.y)),
      rowEnd: Math.min(this.rows - 1, this.rowAt(rect.y + rect.height - 0.0001)),
    };
  }

  /**
   * Draw every tile intersecting the view.
   *
   * Culling to the view is what keeps the cost proportional to the screen
   * rather than to the level: a 500-tile-wide level draws exactly as many tiles
   * as a 30-tile one.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {{x: number, y: number, width: number, height: number}} view - World
   *   -space rectangle currently on screen.
   */
  render(ctx, view) {
    const range = this.rangeFor(view);

    for (let row = range.rowStart; row <= range.rowEnd; row++) {
      const rowOffset = row * this.cols;
      for (let col = range.colStart; col <= range.colEnd; col++) {
        const tile = this.tiles[rowOffset + col];
        if (tile !== TILE.EMPTY) drawTile(ctx, tile, col, row);
      }
    }
  }

  /**
   * Overlay the tile grid, tinting cells by what they collide with. Shown when
   * `DEBUG.showHitboxes` is on.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {{x: number, y: number, width: number, height: number}} view
   */
  renderDebugGrid(ctx, view) {
    const range = this.rangeFor(view);
    ctx.globalAlpha = 0.35;

    for (let row = range.rowStart; row <= range.rowEnd; row++) {
      for (let col = range.colStart; col <= range.colEnd; col++) {
        const tile = this.tiles[row * this.cols + col];
        if (tile === TILE.EMPTY) continue;

        if (isSolid(tile)) ctx.strokeStyle = '#4cc9f0';
        else if (isPlatform(tile)) ctx.strokeStyle = '#80ed99';
        else if (isHazard(tile)) ctx.strokeStyle = '#ff5470';
        else continue;

        ctx.lineWidth = 1;
        ctx.strokeRect(
          col * TILE_SIZE + 0.5,
          row * TILE_SIZE + 0.5,
          TILE_SIZE - 1,
          TILE_SIZE - 1,
        );
      }
    }

    ctx.globalAlpha = 1;
  }

  /**
   * @param {string[]} rows
   * @private
   */
  _parse(rows) {
    rows.forEach((line, row) => {
      // Ragged rows are always a miscount in hand-authored ASCII, and silently
      // padding them shifts every tile after the mistake. Fail loudly instead.
      if (line.length !== this.cols) {
        throw new Error(
          `Level "${this.name}" row ${row} is ${line.length} tiles wide, expected ${this.cols}`,
        );
      }

      for (let col = 0; col < this.cols; col++) {
        const char = line[col];

        if (char === SPAWN_CHAR) {
          this.spawn = { col, row };
          this.tiles[row * this.cols + col] = TILE.EMPTY;
          continue;
        }

        const objectType = CHAR_TO_OBJECT[char];
        if (objectType !== undefined) {
          const placement = { type: objectType, col, row };
          if (objectType === 'switch') placement.index = SWITCH_INDEX[char];
          if (objectType === 'platform') placement.options = PLATFORM_VARIANT[char];
          this.objects.push(placement);
          this.tiles[row * this.cols + col] = TILE.EMPTY;
          continue;
        }

        const tile = CHAR_TO_TILE[char];
        if (tile === undefined) {
          throw new Error(
            `Unknown tile character "${char}" at column ${col}, row ${row} of level "${this.name}"`,
          );
        }
        this.tiles[row * this.cols + col] = tile;
      }
    });
  }
}
