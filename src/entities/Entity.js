/**
 * Base class for everything that occupies space and moves.
 *
 * Position is the **top-left of the collision box**, measured in logical
 * pixels. Sprites may be drawn larger than the box; the box is what physics and
 * tile collision will use, so keeping this convention consistent across every
 * entity is what stops Milestone 4 from becoming a mess of offsets.
 *
 * Every entity records its previous position each step so the renderer can
 * interpolate by the loop's `alpha`.
 *
 * @module entities/Entity
 */

export class Entity {
  /**
   * @param {number} x - Left edge, logical pixels.
   * @param {number} y - Top edge, logical pixels.
   * @param {number} width - Collision box width.
   * @param {number} height - Collision box height.
   */
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    /** Velocity in logical pixels per second. */
    this.vx = 0;
    this.vy = 0;

    /** Position at the end of the previous step, for render interpolation. */
    this.prevX = x;
    this.prevY = y;

    /** Set false to have the world skip and eventually reap this entity. */
    this.alive = true;
  }

  get left() {
    return this.x;
  }

  get right() {
    return this.x + this.width;
  }

  get top() {
    return this.y;
  }

  get bottom() {
    return this.y + this.height;
  }

  get centerX() {
    return this.x + this.width / 2;
  }

  get centerY() {
    return this.y + this.height / 2;
  }

  /**
   * Axis-aligned overlap test against another entity. Touching edges do not
   * count as overlapping, which keeps a body resting exactly on top of another
   * from reading as a collision every step.
   *
   * @param {Entity} other
   * @returns {boolean}
   */
  intersects(other) {
    return (
      this.left < other.right &&
      this.right > other.left &&
      this.top < other.bottom &&
      this.bottom > other.top
    );
  }

  /** Snapshot the current position. Call at the top of every `update`. */
  savePrevious() {
    this.prevX = this.x;
    this.prevY = this.y;
  }

  /**
   * Cancel interpolation for this step. Call after teleporting an entity, or
   * the renderer will draw it sliding between the two positions.
   */
  snapToPosition() {
    this.prevX = this.x;
    this.prevY = this.y;
  }

  /**
   * Interpolated draw position, rounded to whole pixels to keep sprites crisp.
   *
   * @param {number} alpha - Interpolation factor from the loop, 0..1.
   * @returns {{x: number, y: number}}
   */
  getRenderPosition(alpha) {
    return {
      x: Math.round(this.prevX + (this.x - this.prevX) * alpha),
      y: Math.round(this.prevY + (this.y - this.prevY) * alpha),
    };
  }

  /**
   * Advance one fixed step. Subclasses override.
   * @param {number} _dt - Timestep in seconds.
   */
  update(_dt) {}

  /**
   * Draw. Subclasses override.
   * @param {CanvasRenderingContext2D} _ctx
   * @param {number} _alpha
   */
  render(_ctx, _alpha) {}

  /**
   * Debug collision box, drawn when DEBUG.showHitboxes is on.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   */
  renderHitbox(ctx, alpha) {
    const { x, y } = this.getRenderPosition(alpha);
    ctx.strokeStyle = '#ff5470';
    ctx.lineWidth = 1;
    // The half-pixel offset puts the stroke on the pixel rather than straddling
    // two, which would blur it.
    ctx.strokeRect(x + 0.5, y + 0.5, this.width - 1, this.height - 1);
  }
}
