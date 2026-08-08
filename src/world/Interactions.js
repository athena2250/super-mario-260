/**
 * Everything that happens when Pip touches something.
 *
 * Split out of {@link World} so that the world's `update` stays a readable list
 * of what moves, and the rules for what a touch *means* live in one place. Each
 * resolver reports outward through the world's callbacks rather than scoring or
 * playing sound itself.
 *
 * @module world/Interactions
 */

import { PALETTE } from '../core/Config.js';

/**
 * Collect any shards Pip is overlapping.
 *
 * @param {import('./World.js').World} world
 * @param {import('../entities/Player.js').Player} player
 * @param {object} on - The world's callbacks.
 */
export function resolveShards(world, player, on) {
  for (const shard of world.shards) {
    if (shard.collected || !shard.intersects(player)) continue;

    shard.collect();
    world.particles.emit({
      x: shard.centerX,
      y: shard.centerY,
      count: 9,
      color: PALETTE.lanternCore,
      speed: 46,
      gravity: 90,
      life: 0.4,
    });
    on.shard?.(shard);
  }
}

/**
 * Resolve creature contact: a stomp defeats, anything else hurts.
 *
 * @param {import('./World.js').World} world
 * @param {import('../entities/Player.js').Player} player
 * @param {object} on
 */
export function resolveEnemies(world, player, on) {
  for (const enemy of world.enemies) {
    if (!enemy.dangerous || !enemy.intersects(player)) continue;

    if (enemy.isStompedBy(player)) {
      enemy.defeat();
      player.bounce();
      world.particles.emit({
        x: enemy.centerX,
        y: enemy.centerY,
        count: 14,
        color: PALETTE.moss,
        speed: 78,
        gravity: 300,
        life: 0.45,
        upwardBias: 40,
      });
      on.stomp?.(enemy);
      continue;
    }

    // `takeHit` refuses while Pip is still flashing from the last one, so a
    // single touch can never cost two lives.
    if (player.takeHit()) {
      world.particles.emit({
        x: player.centerX,
        y: player.centerY,
        count: 12,
        color: PALETTE.thistle,
        speed: 70,
        gravity: 200,
        life: 0.5,
      });
      on.hurt?.(enemy);
    }
  }
}

/**
 * Offer any touched rune to the puzzle, which decides whether it counts.
 *
 * @param {import('./World.js').World} world
 * @param {import('../entities/Player.js').Player} player
 */
export function resolveSwitches(world, player) {
  for (const runeSwitch of world.switches) {
    if (runeSwitch.intersects(player)) world.puzzle.activate(runeSwitch);
  }
}

/**
 * Light any beacon Pip is touching.
 *
 * The entity refuses a second lighting itself, so a player standing inside the
 * box - which happens for many steps at a walking pace - can never count the
 * same beacon twice.
 *
 * @param {import('./World.js').World} world
 * @param {import('../entities/Player.js').Player} player
 * @param {object} on
 */
export function resolveCheckpoints(world, player, on) {
  for (const checkpoint of world.checkpoints) {
    if (checkpoint.lit || !checkpoint.intersects(player)) continue;
    if (!checkpoint.activate()) continue;

    world.igniteCheckpoint(checkpoint);
    on.checkpoint?.(checkpoint);
  }
}

/**
 * Open the chest, but only once the vault stands open *and* every beacon is
 * lit. The runes are the lock; the beacons are the toll.
 *
 * @param {import('./World.js').World} world
 * @param {import('../entities/Player.js').Player} player
 * @param {object} on
 */
export function resolveChest(world, player, on) {
  const { chest } = world;
  if (!chest || !world.puzzle.open) return;
  if (chest.opening || !chest.intersects(player)) return;

  if (!world.allCheckpointsLit) {
    // Reported on a cooldown: without it this would fire every step for as
    // long as the player stands against the chest.
    if (chest.refuse()) on.chestRefused?.(world.checkpointsLit, world.checkpointTotal);
    return;
  }

  if (chest.open()) {
    world.particles.emit({
      x: chest.centerX,
      y: chest.top,
      count: 40,
      color: PALETTE.lanternCore,
      speed: 120,
      gravity: 120,
      life: 1.1,
      upwardBias: 90,
    });
    on.chestOpened?.(chest);
  }
}
