/**
 * Pip - the player character.
 *
 * Movement is split four ways: horizontal control lives here, jump timing and
 * forgiveness live in {@link JumpController}, gravity lives in the shared
 * physics module, and ground contact comes from tile collision.
 *
 * All motion is velocity-based and multiplied by `dt`, so behaviour is
 * identical at any display refresh rate.
 *
 * @module entities/Player
 */

import { Entity } from './Entity.js';
import { JumpController } from './JumpController.js';
import { PlayerAnimation } from './PlayerAnimation.js';
import { drawPip } from './pipSprite.js';
import { applyGravity } from '../physics/Physics.js';
import { moveAndCollide, clampToBounds } from '../physics/TileCollision.js';
import { PLAYER, ENEMY, RULES, DEBUG } from '../core/Config.js';

/** Minimum speed at which a reversal is dramatic enough to draw as a skid. */
const SKID_THRESHOLD = 26;

export class Player extends Entity {
  /**
   * @param {number} x - Left edge of the collision box.
   * @param {number} y - Top edge of the collision box.
   */
  constructor(x, y) {
    super(x, y, PLAYER.width, PLAYER.height);

    /** Direction Pip is looking: -1 left, +1 right. @type {number} */
    this.facing = 1;

    /** Jump timing, buffering and variable height. @type {JumpController} */
    this.jump = new JumpController();

    /** True while standing on solid ground. @type {boolean} */
    this.grounded = false;

    /** True on the single step a jump launches - hook for effects and sound. */
    this.justJumped = false;

    /** True on the single step Pip touches down. */
    this.justLanded = false;

    /** True while braking hard against the direction of travel. @type {boolean} */
    this.skidding = false;

    /** Where the level begins, and where `restart()` returns to. */
    this.spawnPoint = { x, y };

    /**
     * Where a death returns Pip to: the last beacon he lit, or the level's
     * start until he lights one. Set from outside rather than inferred, because
     * a respawn point the player did not visibly earn is one they cannot
     * predict - and an unpredictable respawn reads as a bug.
     * @type {{x: number, y: number}}
     */
    this.respawnPoint = { x, y };

    /** Last step's tile contact flags. @type {import('../physics/TileCollision.js').Contact} */
    this.contact = { grounded: false, ceiling: false, wall: false, hazard: false };

    /** Presentation state - never read back by the simulation. */
    this.animation = new PlayerAnimation();

    /** Seconds of post-hit invulnerability remaining. @type {number} @private */
    this._invulnerable = 0;

    /**
     * Moving platform currently underfoot, if any. Held so the platform can
     * carry Pip on the following step.
     * @type {import('./MovingPlatform.js').MovingPlatform | null}
     */
    this.riding = null;
  }

  /** True while Pip cannot be hurt again. @returns {boolean} */
  get invulnerable() {
    return this._invulnerable > 0;
  }

  /**
   * Advance one fixed step.
   *
   * @param {number} dt - Timestep in seconds.
   * @param {import('../input/Input.js').Input} input
   * @param {import('../world/TileMap.js').TileMap} map
   */
  update(dt, input, map) {
    this.savePrevious();
    this._invulnerable = Math.max(0, this._invulnerable - dt);

    // Cleared every step; the game re-establishes it after moving platforms.
    this.riding = null;

    const direction = input.axisX;
    const topSpeed = input.isDown('run') ? PLAYER.runSpeed : PLAYER.walkSpeed;

    this._applyHorizontalControl(dt, direction, topSpeed);

    // `grounded` here is last step's result, which is exactly what coyote time
    // needs: the jump is judged against where Pip was, not where gravity is
    // about to put him.
    this.justJumped = this.jump.update(dt, input, this, this.grounded);
    if (this.justJumped) this.grounded = false;

    applyGravity(this, dt);

    // Collision zeroes `vy` on impact, so the fall speed has to be read first
    // if the landing is to be judged on its force.
    const fallSpeed = this.vy;

    // Holding down disables one-way platforms outright, rather than triggering
    // a drop on the press. Tying it to `grounded` would fail on the very next
    // step: Pip has only sunk a fraction of a pixel by then, so he is no longer
    // grounded but is still inside the platform, and it would catch him again.
    // Solid ground is unaffected.
    const dropThrough = input.isDown('down');

    const wasGrounded = this.grounded;
    this.contact = moveAndCollide(this, dt, map, { dropThrough });
    clampToBounds(this, map);

    this.grounded = this.contact.grounded;
    this.justLanded = !wasGrounded && this.grounded;
    if (this.justLanded) this.animation.land(fallSpeed);

    this.animation.update(dt, this);
  }

  /**
   * Make a beacon the place death returns Pip to.
   *
   * @param {number} x - Collision-box left edge.
   * @param {number} y - Collision-box top edge.
   */
  setRespawnPoint(x, y) {
    this.respawnPoint.x = x;
    this.respawnPoint.y = y;
  }

  /**
   * Take a hit from a creature or hazard.
   *
   * @returns {boolean} False if Pip was still invulnerable, so the caller knows
   *   not to deduct a life or play a sound.
   */
  takeHit() {
    if (this.invulnerable) return false;

    this._invulnerable = RULES.invulnerableTime;

    // Knocked back and up, away from whatever hit him. This is what stops the
    // player from being pinned inside a creature while invulnerability ticks.
    this.vy = -160;
    this.vx = -this.facing * 90;
    this.grounded = false;
    this.jump.reset();
    return true;
  }

  /**
   * Rebound off a stomped creature. Slightly weaker than a full jump, so
   * chaining stomps still requires the player to jump between them.
   */
  bounce() {
    this.vy = -ENEMY.stompBounce;
    this.grounded = false;
    this.jump.reset();
    this.animation.land(0);
  }

  /**
   * Stand on a moving platform.
   *
   * @param {import('./MovingPlatform.js').MovingPlatform} platform
   */
  landOnPlatform(platform) {
    const wasGrounded = this.grounded;
    this.grounded = true;
    this.riding = platform;
    this.justLanded = !wasGrounded;
  }

  /**
   * Return to the last beacon lit - or to the level's start, if none has been.
   * Used after spikes or a fall out of the level.
   */
  respawn() {
    this._returnTo(this.respawnPoint);
  }

  /**
   * Return to the level's start and forget any beacon. Used when the whole
   * level restarts.
   */
  restart() {
    this.setRespawnPoint(this.spawnPoint.x, this.spawnPoint.y);
    this._returnTo(this.spawnPoint);
  }

  /**
   * @param {{x: number, y: number}} target
   * @private
   */
  _returnTo(target) {
    this.x = target.x;
    this.y = target.y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.grounded = false;
    this.skidding = false;
    this.riding = null;
    this._invulnerable = RULES.invulnerableTime;
    this.jump.reset();

    // Without this the renderer would draw Pip streaking across the level from
    // wherever he died back to the spawn point.
    this.snapToPosition();
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha - Interpolation factor from the loop.
   */
  render(ctx, alpha) {
    const { x, y } = this.getRenderPosition(alpha);

    // Blink while invulnerable. Skipping alternate 60 ms slices reads as a
    // flicker without ever hiding Pip long enough to lose track of him.
    const blinkedOut =
      this.invulnerable && Math.floor(this._invulnerable / 0.06) % 2 === 0;

    if (!blinkedOut) {
      drawPip(ctx, {
        x,
        y,
        width: this.width,
        height: this.height,
        facing: this.facing,
        walkPhase: this.animation.walkPhase,
        moving: this.animation.moving,
        skidding: this.skidding,
        airborne: !this.grounded,
        rising: this.vy < 0,
        squashing: this.animation.squashing,
        bob: this.animation.bobOffset(this.grounded),
        glow: this.animation.glowPulse(),
      });
    }

    if (DEBUG.showHitboxes) this.renderHitbox(ctx, alpha);
  }

  /**
   * Accelerate, brake or coast based on the held direction.
   *
   * @param {number} dt
   * @param {number} direction - -1, 0 or +1.
   * @param {number} topSpeed - Current maximum, walk or run.
   * @private
   */
  _applyHorizontalControl(dt, direction, topSpeed) {
    if (direction === 0) {
      this._applyFriction(dt);
      this.skidding = false;
      return;
    }

    this.facing = direction;

    // Reversing gets its own, larger acceleration so turns feel decisive
    // without making top speed twitchy. In the air both values drop, so a jump
    // can be steered but not rewritten mid-flight.
    const opposing = this.vx !== 0 && Math.sign(this.vx) !== direction;
    const accel = this.grounded
      ? (opposing ? PLAYER.turnAccel : PLAYER.accel)
      : (opposing ? PLAYER.airTurnAccel : PLAYER.airAccel);

    const speedBefore = Math.abs(this.vx);
    this.vx += direction * accel * dt;

    if (Math.abs(this.vx) > topSpeed) {
      if (speedBefore <= topSpeed) {
        // Ordinary acceleration: stop cleanly at the cap.
        this.vx = direction * topSpeed;
      } else {
        // Already faster than the cap, which happens when the run button is
        // released at speed. Bleed the excess off gradually instead of
        // snapping, so letting go of run does not feel like hitting a wall.
        this.vx =
          Math.sign(this.vx) * Math.max(topSpeed, speedBefore - PLAYER.friction * dt);
      }
    }

    // A skid is a ground manoeuvre - there is nothing to scrape against midair.
    this.skidding = this.grounded && opposing && Math.abs(this.vx) > SKID_THRESHOLD;
  }

  /**
   * Coast to a stop. The final snap to zero below `minSpeed` prevents an
   * imperceptible drift that would otherwise never quite end.
   *
   * @param {number} dt
   * @private
   */
  _applyFriction(dt) {
    // Air drag is far weaker than ground friction, so momentum carries across
    // a jump instead of evaporating the moment you let go of a direction.
    const drop = (this.grounded ? PLAYER.friction : PLAYER.airFriction) * dt;

    if (Math.abs(this.vx) <= drop + PLAYER.minSpeed) {
      this.vx = 0;
      return;
    }
    this.vx -= Math.sign(this.vx) * drop;
  }

}
