/**
 * The welcome screen.
 *
 * Title, subtitle and the two ways in. Pip stands on a foreground ledge below
 * the menu, idling with the same sprite and the same bob the game uses, so the
 * first thing the player sees is the character they are about to control rather
 * than a logo.
 *
 * The screen draws only its own contents: the sky, spores and parallax scenery
 * behind it belong to {@link MenuBackdrop} and are drawn by the game root, so
 * every menu shares one backdrop instead of each carrying a copy.
 *
 * @module ui/screens/TitleScreen
 */

import { Menu } from '../Menu.js';
import { drawText, drawTextShadowed } from '../PixelText.js';
import { drawPip } from '../../entities/pipSprite.js';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE, PLAYER } from '../../core/Config.js';

/** Top of the foreground ledge Pip stands on. */
const FLOOR_Y = 214;

export class TitleScreen {
  constructor() {
    /** @type {Menu} */
    this.menu = new Menu(
      [
        { id: 'play', label: 'PLAY' },
        { id: 'howToPlay', label: 'HOW TO PLAY' },
      ],
      { y: 112 },
    );

    /** Seconds since the screen opened. @type {number} @private */
    this._time = 0;
  }

  /** Called every time the screen becomes current. */
  enter() {
    this._time = 0;
    this.menu.reset();
  }

  /**
   * @param {number} dt
   * @param {import('../../input/Input.js').Input} input
   * @param {import('../../input/Pointer.js').Pointer} pointer
   * @returns {{action: string, id?: string}|null}
   */
  update(dt, input, pointer) {
    this._time += dt;
    return this.menu.update(dt, input, pointer);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    this._renderFloor(ctx);
    this._renderTitle(ctx);
    this.menu.render(ctx);
    this._renderPip(ctx);

    drawTextShadowed(ctx, 'ARROWS TO CHOOSE   ENTER TO BEGIN', GAME_WIDTH / 2, 236, {
      color: PALETTE.hazeGlow,
      align: 'center',
    });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _renderTitle(ctx) {
    const centerX = GAME_WIDTH / 2;

    // A soft lantern halo behind the wordmark, breathing slowly. Built from
    // three stacked bands rather than a gradient so it stays pixel-hard.
    const breath = 0.5 + Math.sin(this._time * 1.4) * 0.5;
    for (let band = 0; band < 3; band++) {
      const height = 34 + band * 16;
      const width = 150 + band * 60 + breath * 10;
      ctx.globalAlpha = (0.16 - band * 0.045) * (0.7 + breath * 0.3);
      ctx.fillStyle = PALETTE.lantern;
      ctx.fillRect(centerX - width / 2, 48 - height / 2, width, height);
    }
    ctx.globalAlpha = 1;

    drawTextShadowed(ctx, 'LUMEN HOLLOW', centerX, 36, {
      color: PALETTE.lanternCore,
      shadowColor: PALETTE.stone,
      align: 'center',
      scale: 5,
    });

    drawText(ctx, 'AN ADVENTURE BEYOND THE LIGHT', centerX, 74, {
      color: PALETTE.lantern,
      align: 'center',
    });
  }

  /**
   * A foreground ledge, which gives Pip something to stand on and the hint text
   * something to sit against.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _renderFloor(ctx) {
    ctx.fillStyle = PALETTE.stone;
    ctx.fillRect(0, FLOOR_Y, GAME_WIDTH, GAME_HEIGHT - FLOOR_Y);
    ctx.fillStyle = PALETTE.stoneLit;
    ctx.fillRect(0, FLOOR_Y, GAME_WIDTH, 2);
    ctx.fillStyle = PALETTE.moss;
    ctx.fillRect(0, FLOOR_Y, GAME_WIDTH, 1);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _renderPip(ctx) {
    const x = Math.round(GAME_WIDTH / 2 - PLAYER.width / 2);
    const y = FLOOR_Y - PLAYER.height;

    // Idle values: standing still, facing the player's side of the screen, with
    // the lantern glow pulsing on the same clock as the title's halo.
    drawPip(ctx, {
      x,
      y,
      width: PLAYER.width,
      height: PLAYER.height,
      facing: 1,
      walkPhase: 0,
      moving: false,
      skidding: false,
      airborne: false,
      rising: false,
      squashing: false,
      // The same idle rhythm PlayerAnimation uses, so he breathes on the title
      // exactly as he does in the level.
      bob: Math.sin(this._time * 2.4) > 0.4 ? -1 : 0,
      glow: (Math.sin(this._time * 2.2) + 1) / 2,
    });
  }
}
