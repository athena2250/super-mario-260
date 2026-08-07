/**
 * Pip's sprite, drawn procedurally.
 *
 * Pip is a lantern-sprite: a small amber glow wearing a chipped stone shell,
 * with two stubby legs. Drawing him from primitives rather than an image keeps
 * the repo asset-free for now and makes the silhouette easy to iterate on -
 * once the art is settled this module is the single place to swap in a real
 * sprite sheet without touching any movement code.
 *
 * All drawing is done in whole pixels, centred on the collision box, so the
 * result stays crisp under the viewport's integer upscale.
 *
 * @module entities/pipSprite
 */

import { PALETTE } from '../core/Config.js';

/** Body silhouette: row widths from top to bottom, two logical pixels each. */
const BODY_ROWS = [7, 10, 12, 12, 10, 8];
const ROW_HEIGHT = 2;
const LEG_HEIGHT = 2;

/**
 * Draw Pip.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} pose
 * @param {number} pose.x - Collision box left edge (already rounded).
 * @param {number} pose.y - Collision box top edge (already rounded).
 * @param {number} pose.width - Collision box width.
 * @param {number} pose.height - Collision box height.
 * @param {number} pose.facing - -1 for left, +1 for right.
 * @param {number} pose.walkPhase - 0..1 cycle position for the leg animation.
 * @param {boolean} pose.moving - True while Pip has meaningful speed.
 * @param {boolean} pose.skidding - True while turning against momentum.
 * @param {boolean} pose.airborne - True while not standing on ground.
 * @param {boolean} pose.rising - True while moving upward.
 * @param {boolean} pose.squashing - True during the landing impact pose.
 * @param {number} pose.bob - Vertical idle bob offset in pixels (0 or -1).
 * @param {number} pose.glow - 0..1 lantern brightness pulse.
 */
export function drawPip(ctx, pose) {
  const centerX = Math.round(pose.x + pose.width / 2);
  const bottom = pose.y + pose.height;
  const bodyBottom = bottom - LEG_HEIGHT + pose.bob;

  // Squash and stretch. Deforming the silhouette is what sells weight: Pip
  // narrows as he leaps and flattens on impact, both anchored to his feet so
  // he never appears to sink into or float above the ground.
  const { widthDelta, topDelta } = getDeformation(pose);
  const bodyTop = bodyBottom - BODY_ROWS.length * ROW_HEIGHT + topDelta;

  // Skidding throws Pip's weight backwards against the direction of travel.
  const lean = pose.skidding ? -pose.facing : 0;

  drawGlow(ctx, centerX, bodyBottom - 6, pose.glow);
  drawLegs(ctx, centerX, bottom, pose);
  drawBody(ctx, centerX + lean, bodyTop, widthDelta);
  drawShell(ctx, centerX + lean, bodyTop);
  drawFace(ctx, centerX + lean, bodyTop, pose);
}

/**
 * Per-pose body deformation.
 *
 * @param {object} pose
 * @returns {{widthDelta: number, topDelta: number}} Width change applied to
 *   every body row, and vertical shift of the body's top edge.
 */
function getDeformation(pose) {
  if (pose.squashing) return { widthDelta: 2, topDelta: 3 };
  if (pose.airborne && pose.rising) return { widthDelta: -1, topDelta: -2 };
  if (pose.airborne) return { widthDelta: 1, topDelta: 1 };
  return { widthDelta: 0, topDelta: 0 };
}

/**
 * Soft halo. Two translucent squares rather than a radial gradient: cheaper,
 * and the hard edges suit the pixel-art style better than a smooth falloff.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} glow - 0..1 pulse.
 */
function drawGlow(ctx, cx, cy, glow) {
  ctx.fillStyle = PALETTE.lantern;

  ctx.globalAlpha = 0.06 + glow * 0.04;
  ctx.fillRect(cx - 13, cy - 13, 26, 26);

  ctx.globalAlpha = 0.1 + glow * 0.07;
  ctx.fillRect(cx - 8, cy - 8, 16, 16);

  ctx.globalAlpha = 1;
}

/**
 * Two stubby legs. They alternate on a two-beat cycle while walking and sit
 * flat while idle.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} bottom
 * @param {object} pose
 */
function drawLegs(ctx, cx, bottom, pose) {
  ctx.fillStyle = PALETTE.stone;

  if (pose.airborne) {
    // Tucked under him on the way up, reaching for the ground on the way down.
    const tuck = pose.rising ? 3 : 0;
    const spread = pose.rising ? 1 : 3;
    ctx.fillRect(cx - 2 - spread, bottom - LEG_HEIGHT - tuck, 3, LEG_HEIGHT);
    ctx.fillRect(cx - 1 + spread, bottom - LEG_HEIGHT - tuck, 3, LEG_HEIGHT);
    return;
  }

  if (pose.skidding) {
    // Both legs planted and braced wide against the slide.
    ctx.fillRect(cx - 5, bottom - LEG_HEIGHT, 3, LEG_HEIGHT);
    ctx.fillRect(cx + 2, bottom - LEG_HEIGHT, 3, LEG_HEIGHT);
    return;
  }

  // Lift alternates half a cycle apart; idle keeps both feet down.
  const lift = pose.moving ? 1 : 0;
  const leadUp = pose.walkPhase < 0.5 ? lift : 0;
  const trailUp = pose.walkPhase < 0.5 ? 0 : lift;

  ctx.fillRect(cx - 4, bottom - LEG_HEIGHT - leadUp + pose.bob, 3, LEG_HEIGHT);
  ctx.fillRect(cx + 1, bottom - LEG_HEIGHT - trailUp + pose.bob, 3, LEG_HEIGHT);
}

/**
 * The glowing body: a stack of centred rows forming a rounded lantern shape,
 * brightest at its core.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} top
 * @param {number} widthDelta - Squash/stretch applied to every row.
 */
function drawBody(ctx, cx, top, widthDelta) {
  BODY_ROWS.forEach((rowWidth, index) => {
    // Never let a row collapse to nothing, however extreme the deformation.
    const width = Math.max(3, rowWidth + widthDelta);

    // The middle rows are the lantern's core and read brightest.
    ctx.fillStyle = index >= 2 && index <= 3 ? PALETTE.lanternCore : PALETTE.lantern;
    ctx.fillRect(
      cx - Math.floor(width / 2),
      top + index * ROW_HEIGHT,
      width,
      ROW_HEIGHT,
    );
  });
}

/**
 * Chipped stone shell and carry hook worn over the top of the body.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} bodyTop
 */
function drawShell(ctx, cx, bodyTop) {
  ctx.fillStyle = PALETTE.stone;
  ctx.fillRect(cx - 5, bodyTop, 10, 2);
  ctx.fillRect(cx - 3, bodyTop - 2, 6, 2);

  // Lit edge along the top catches the cavern haze.
  ctx.fillStyle = PALETTE.stoneLit;
  ctx.fillRect(cx - 3, bodyTop - 2, 6, 1);

  // Carry hook.
  ctx.fillStyle = PALETTE.stone;
  ctx.fillRect(cx - 1, bodyTop - 4, 2, 2);
}

/**
 * Eyes. Both are drawn shifted toward the facing direction, which sells the
 * turn without needing a mirrored sprite.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} bodyTop
 * @param {object} pose
 */
function drawFace(ctx, cx, bodyTop, pose) {
  const eyeY = bodyTop + ROW_HEIGHT * 2;
  const shift = pose.facing;

  ctx.fillStyle = PALETTE.skyTop;

  if (pose.skidding) {
    // Squeezed shut with effort: single flat line per eye.
    ctx.fillRect(cx - 4 + shift, eyeY + 1, 3, 1);
    ctx.fillRect(cx + 1 + shift, eyeY + 1, 3, 1);
    return;
  }

  // Eyes widen in the air - a one-pixel change that reads clearly at this size.
  const eyeHeight = pose.airborne ? 3 : 2;
  ctx.fillRect(cx - 4 + shift, eyeY, 2, eyeHeight);
  ctx.fillRect(cx + 2 + shift, eyeY, 2, eyeHeight);
}
