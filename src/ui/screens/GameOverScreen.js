/**
 * Out of lanterns.
 *
 * The other way a level ends badly. It shows the same shape as the clock
 * running out, with three spent lanterns where that one shows a dead clock.
 *
 * @module ui/screens/GameOverScreen
 */

import { OutcomeScreen } from './OutcomeScreen.js';
import { PALETTE } from '../../core/Config.js';

export class GameOverScreen extends OutcomeScreen {
  constructor() {
    super({
      title: 'THE DARK WINS',
      color: PALETTE.thistle,
      shadowColor: PALETTE.thistleDark,
      lines: ['PIPS LANTERN HAS GONE OUT', 'THE HOLLOW IS PATIENT - TRY AGAIN'],
      items: [
        { id: 'retry', label: 'TRY AGAIN' },
        { id: 'levelSelect', label: 'LEVEL SELECT' },
        { id: 'mainMenu', label: 'MAIN MENU' },
      ],
    });
  }

  /**
   * Three spent lanterns, guttering out of step with one another.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX
   */
  renderDetail(ctx, centerX) {
    for (let i = 0; i < 3; i++) {
      const x = centerX - 20 + i * 16;
      const ember = Math.sin(this._time * 2 + i * 1.7) * 0.5 + 0.5;

      ctx.fillStyle = PALETTE.stone;
      ctx.fillRect(x, 128, 9, 3);
      ctx.fillStyle = PALETTE.runeDormant;
      ctx.fillRect(x + 1, 131, 7, 6);

      // A last ember, almost out.
      ctx.globalAlpha = ember * 0.5;
      ctx.fillStyle = PALETTE.thistle;
      ctx.fillRect(x + 3, 133, 3, 2);
      ctx.globalAlpha = 1;
    }
  }
}
