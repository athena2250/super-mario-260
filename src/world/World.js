/**
 * The living level.
 *
 * Owns the tile grid and everything standing on it, and resolves the
 * interactions between them. `Game` stays an orchestrator - viewport, loop,
 * camera, HUD - and asks the world to simulate and draw itself.
 *
 * Interactions report outward through the `on` callbacks rather than reaching
 * into score or audio directly, so the world has no opinion about what a
 * stomp is worth or what it sounds like.
 *
 * A world is never put back to its starting state: restarting a level builds a
 * new one. One way to begin a level means there is no second path that could
 * miss something and leave a rune half-lit or a bridge still standing.
 *
 * @module world/World
 */

import { TileMap } from './TileMap.js';
import { Particles } from './Particles.js';
import { PuzzleController } from './PuzzleController.js';
import { buildLevel } from './LevelBuilder.js';
import {
  resolveShards,
  resolveEnemies,
  resolveSwitches,
  resolveCheckpoints,
  resolveChest,
} from './Interactions.js';
import { PALETTE, TILE_SIZE, DEBUG } from '../core/Config.js';

/**
 * Pixels beyond the view within which an object is still drawn.
 *
 * Generous on purpose: several things are drawn much larger than the collision
 * box they are culled by - a beacon's ignition ring reaches 30 px past the
 * post, the chest throws light 34 px above itself - and an effect that pops in
 * at the screen edge is worse than the handful of fills the margin costs.
 */
const CULL_PADDING = 48;

/**
 * Is any part of this object near enough to the view to be worth drawing?
 *
 * Culling applies to **drawing only**. Everything in the level keeps simulating
 * wherever it is, so a creature's patrol is at exactly the phase the player
 * would expect when they arrive.
 *
 * @param {import('../entities/Entity.js').Entity} entity
 * @param {{x: number, y: number, width: number, height: number}} view
 * @returns {boolean}
 */
function isNearView(entity, view) {
  return (
    entity.x + entity.width > view.x - CULL_PADDING &&
    entity.x < view.x + view.width + CULL_PADDING &&
    entity.y + entity.height > view.y - CULL_PADDING &&
    entity.y < view.y + view.height + CULL_PADDING
  );
}

export class World {
  /**
   * @param {object} definition - A level definition module.
   * @param {object} [on] - Interaction callbacks, all optional.
   */
  constructor(definition, on = {}) {
    /** @type {TileMap} */
    this.map = new TileMap(definition);

    /** @type {Particles} */
    this.particles = new Particles();

    const built = buildLevel(definition, this.map);

    /** @type {import('../entities/Enemy.js').Enemy[]} */
    this.enemies = built.enemies;
    /** @type {import('../entities/Shard.js').Shard[]} */
    this.shards = built.shards;
    /** @type {import('../entities/RuneSwitch.js').RuneSwitch[]} */
    this.switches = built.switches;
    /** @type {import('../entities/RuneTablet.js').RuneTablet[]} */
    this.tablets = built.tablets;
    /** @type {import('../entities/MovingPlatform.js').MovingPlatform[]} */
    this.platforms = built.platforms;
    /** @type {import('../entities/Checkpoint.js').Checkpoint[]} */
    this.checkpoints = built.checkpoints;
    /** @type {import('../entities/Chest.js').Chest | null} */
    this.chest = built.chest;

    this._on = on;

    /** @type {PuzzleController} */
    this.puzzle = new PuzzleController({
      map: this.map,
      switches: this.switches,
      tablet: this.tablets[0] ?? null,
      order: built.switchOrder,
      on: {
        correct: (runeSwitch) => this._onRuneLit(runeSwitch),
        wrong: () => this._onRuneRefused(),
        solved: () => on.solved?.(),
        plank: (col, row) => this._onPlankRaised(col, row),
        vault: (col, row) => this._onVaultCell(col, row),
      },
    });
  }

  /** Total shards the level contains. @returns {number} */
  get shardTotal() {
    return this.shards.length;
  }

  /** Beacons the level contains. @returns {number} */
  get checkpointTotal() {
    return this.checkpoints.length;
  }

  /** Beacons currently lit. @returns {number} */
  get checkpointsLit() {
    let lit = 0;
    for (const checkpoint of this.checkpoints) {
      if (checkpoint.lit) lit += 1;
    }
    return lit;
  }

  /**
   * True once every beacon is lit, which is what the chest waits for.
   * @returns {boolean}
   */
  get allCheckpointsLit() {
    return this.checkpointsLit === this.checkpointTotal;
  }

  /**
   * Advance the world by one step and resolve every interaction with Pip.
   *
   * Ordering matters and is not arbitrary: platforms move first so that riders
   * can be carried before they run their own movement, and interactions are
   * resolved last, against final positions.
   *
   * @param {number} dt
   * @param {import('../input/Input.js').Input} input
   * @param {import('../entities/Player.js').Player} player
   */
  update(dt, input, player) {
    this._updatePlatforms(dt, player);

    player.update(dt, input, this.map);
    this._landOnPlatforms(player);

    for (const enemy of this.enemies) {
      enemy.update(dt, this.map);
      // A creature that has fallen out of the level is gone for good; without
      // this it would keep accelerating downward forever.
      if (enemy.top > this.map.pixelHeight) enemy.alive = false;
    }

    for (const shard of this.shards) shard.update(dt);
    for (const runeSwitch of this.switches) runeSwitch.update(dt);
    for (const tablet of this.tablets) tablet.update(dt);
    for (const checkpoint of this.checkpoints) checkpoint.update(dt);
    this.chest?.update(dt);

    this.puzzle.update(dt);
    this.particles.update(dt);

    this._resolveInteractions(player);
  }

  /**
   * Draw the world. Called inside the camera transform.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   * @param {{x: number, y: number, width: number, height: number}} view
   */
  render(ctx, alpha, view) {
    this.map.render(ctx, view);

    for (const tablet of this.tablets) {
      if (isNearView(tablet, view)) tablet.render(ctx);
    }
    for (const runeSwitch of this.switches) {
      if (isNearView(runeSwitch, view)) runeSwitch.render(ctx);
    }
    for (const checkpoint of this.checkpoints) {
      if (isNearView(checkpoint, view)) checkpoint.render(ctx);
    }
    if (this.chest && isNearView(this.chest, view)) this.chest.render(ctx);

    for (const shard of this.shards) {
      if (!shard.collected && isNearView(shard, view)) shard.render(ctx);
    }
    for (const platform of this.platforms) {
      if (isNearView(platform, view)) platform.render(ctx, alpha);
    }

    for (const enemy of this.enemies) {
      if (enemy.alive && isNearView(enemy, view)) enemy.render(ctx, alpha);
    }

    this.particles.render(ctx, alpha);

    if (DEBUG.showHitboxes) this.map.renderDebugGrid(ctx, view);
  }

  /**
   * @param {number} dt
   * @param {import('../entities/Player.js').Player} player
   * @private
   */
  _updatePlatforms(dt, player) {
    for (const platform of this.platforms) {
      platform.update(dt);

      // Carry the rider before it moves itself, so standing still on a moving
      // platform keeps Pip glued to the same spot on the deck.
      if (player.riding === platform) {
        player.x += platform.deltaX;
        player.y += platform.deltaY;
      }
    }
  }

  /**
   * @param {import('../entities/Player.js').Player} player
   * @private
   */
  _landOnPlatforms(player) {
    const previousBottom = player.prevY + player.height;

    for (const platform of this.platforms) {
      if (platform.carry(player, previousBottom)) {
        player.landOnPlatform(platform);
        return;
      }
    }
  }

  /**
   * @param {import('../entities/Player.js').Player} player
   * @private
   */
  _resolveInteractions(player) {
    resolveShards(this, player, this._on);
    resolveEnemies(this, player, this._on);
    resolveSwitches(this, player);
    resolveCheckpoints(this, player, this._on);
    resolveChest(this, player, this._on);
  }

  /**
   * Fire the burst of light a beacon throws as it catches.
   *
   * @param {import('../entities/Checkpoint.js').Checkpoint} checkpoint
   */
  igniteCheckpoint(checkpoint) {
    this.particles.emit({
      x: checkpoint.centerX,
      y: checkpoint.top + 4,
      count: 26,
      color: PALETTE.lantern,
      speed: 90,
      gravity: -40,
      life: 0.9,
      upwardBias: 50,
    });
  }

  /**
   * @param {import('../entities/RuneSwitch.js').RuneSwitch} runeSwitch
   * @private
   */
  _onRuneLit(runeSwitch) {
    // Keep every tablet in step, not just the one the puzzle holds.
    for (const tablet of this.tablets) tablet.progress = this.puzzle.progress;

    this.particles.emit({
      x: runeSwitch.centerX,
      y: runeSwitch.top,
      count: 20,
      color: runeSwitch.color,
      speed: 70,
      gravity: -30,
      life: 0.8,
      upwardBias: 30,
    });
    this._on.rune?.(runeSwitch, this.puzzle.progress);
  }

  /** @private */
  _onRuneRefused() {
    for (const tablet of this.tablets) tablet.progress = 0;
    this._on.runeRefused?.();
  }

  /**
   * @param {number} col
   * @param {number} row
   * @private
   */
  _onPlankRaised(col, row) {
    this.particles.emit({
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE,
      count: 5,
      color: PALETTE.runeAzure,
      speed: 40,
      gravity: -60,
      life: 0.5,
    });
    this._on.plank?.();
  }

  /**
   * @param {number} col
   * @param {number} row
   * @private
   */
  _onVaultCell(col, row) {
    this.particles.emit({
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2,
      count: 14,
      color: PALETTE.vault,
      speed: 90,
      gravity: 120,
      life: 0.7,
    });
    this._on.vault?.();
  }
}
