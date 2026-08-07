/**
 * Snub - a shelled grazer.
 *
 * The simplest creature in the Hollow and the first one the player meets: it
 * walks a ledge, turns at walls, and turns again rather than walking off an
 * edge. That last rule is what makes it safe to introduce early - a Snub stays
 * where the player found it, so its patrol can be learned and timed.
 *
 * @module entities/enemies/Snub
 */

import { Enemy } from '../Enemy.js';
import { applyGravity } from '../../physics/Physics.js';
import { moveAndCollide } from '../../physics/TileCollision.js';
import { ENEMY, PALETTE } from '../../core/Config.js';

/** Pixels travelled per half of the leg cycle. */
const STRIDE = 6;

export class Snub extends Enemy {
  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    super(x, y, ENEMY.snub.width, ENEMY.snub.height);

    /** Position within the leg cycle, 0..1. @type {number} @private */
    this._walkPhase = 0;
  }

  /**
   * @param {number} dt
   * @param {import('../../world/TileMap.js').TileMap} map
   */
  think(dt, map) {
    this.vx = this.facing * ENEMY.snub.speed;
    applyGravity(this, dt);

    const contact = moveAndCollide(this, dt, map);

    // Turn at a wall, or at the lip of the ledge it is grazing.
    if (contact.wall || (contact.grounded && this._atLedge(map))) {
      this.facing *= -1;
    }

    this._walkPhase = (this._walkPhase + (Math.abs(this.vx) * dt) / STRIDE) % 1;
  }

  /**
   * Is there nothing to stand on just ahead?
   *
   * @param {import('../../world/TileMap.js').TileMap} map
   * @returns {boolean}
   * @private
   */
  _atLedge(map) {
    const probeX = this.facing > 0 ? this.right + 1 : this.left - 1;
    const col = map.colAt(probeX);
    const row = map.rowAt(this.bottom + 1);
    return !map.isSolidAt(col, row) && !map.isPlatformAt(col, row);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   */
  render(ctx, alpha) {
    const { x, y } = this.getRenderPosition(alpha);
    const pose = this.getDefeatPose();

    const height = Math.round(this.height * pose.squash);
    const top = y + (this.height - height) + pose.drop;
    const centerX = x + Math.round(this.width / 2);
    const bottom = top + height;

    ctx.globalAlpha = pose.alpha;

    // Legs: two stubs alternating on the walk cycle.
    ctx.fillStyle = PALETTE.snubShell;
    const lift = this.defeated ? 0 : this._walkPhase < 0.5 ? 1 : 0;
    ctx.fillRect(centerX - 4, bottom - 2 - lift, 3, 2);
    ctx.fillRect(centerX + 1, bottom - 2 - (1 - lift), 3, 2);

    // Soft underbody.
    ctx.fillStyle = PALETTE.snub;
    ctx.fillRect(centerX - 5, bottom - 6, 10, 4);

    // Domed shell, drawn as three narrowing bands.
    ctx.fillStyle = PALETTE.snubShell;
    ctx.fillRect(centerX - 6, top + 3, 12, 3);
    ctx.fillRect(centerX - 5, top + 1, 10, 2);
    ctx.fillRect(centerX - 3, top, 6, 1);

    // Shell markings catch the cavern light.
    ctx.fillStyle = PALETTE.moss;
    ctx.fillRect(centerX - 3, top + 2, 2, 1);
    ctx.fillRect(centerX + 2, top + 3, 2, 1);

    // A single eye on the leading side.
    ctx.fillStyle = PALETTE.skyTop;
    ctx.fillRect(centerX + this.facing * 3 - 1, bottom - 5, 2, 2);

    ctx.globalAlpha = 1;
  }
}
