/**
 * The clock ran out.
 *
 * @module ui/screens/TimeUpScreen
 */

import { OutcomeScreen } from './OutcomeScreen.js';
import { drawTextShadowed } from '../PixelText.js';
import { PALETTE } from '../../core/Config.js';

export class TimeUpScreen extends OutcomeScreen {
  constructor() {
    super({
      title: "TIME'S UP!",
      color: PALETTE.thistle,
      shadowColor: PALETTE.thistleDark,
      lines: ['THE HOLLOW KEEPS ITS TREASURE', 'YOU DID NOT REACH IT IN TIME'],
      items: [
        { id: 'retry', label: 'TRY AGAIN' },
        { id: 'levelSelect', label: 'LEVEL SELECT' },
        { id: 'mainMenu', label: 'MAIN MENU' },
      ],
    });
  }

  /**
   * A dead clock face: the same readout that has been counting down all level,
   * now stopped on zero.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX
   */
  renderDetail(ctx, centerX) {
    const flicker = Math.sin(this._time * 6) > 0.4 ? PALETTE.thistleDark : PALETTE.thistle;

    drawTextShadowed(ctx, '00:00', centerX, 128, {
      color: flicker,
      align: 'center',
      scale: 2,
    });
  }
}
