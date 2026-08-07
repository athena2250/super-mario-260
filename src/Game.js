/**
 * Game root.
 *
 * An orchestrator: it owns the viewport, loop, camera, input, run state and
 * interface, and delegates the level itself to {@link World}. The loop calls
 * exactly two methods here - `update(dt)` and `render(alpha)` - and everything
 * else hangs off those.
 *
 * @module Game
 */

import { Viewport } from './core/Viewport.js';
import { Loop } from './core/Loop.js';
import { Camera } from './core/Camera.js';
import { GameState, PHASE } from './core/GameState.js';
import { PALETTE, DEBUG, PLAYER, TILE_SIZE } from './core/Config.js';
import { Input } from './input/Input.js';
import { TouchControls } from './input/TouchControls.js';
import { Audio } from './audio/Audio.js';
import { Spores } from './world/Spores.js';
import { World } from './world/World.js';
import { Player } from './entities/Player.js';
import { Hud } from './ui/Hud.js';
import { VictoryScreen } from './ui/VictoryScreen.js';
import { renderDebugOverlay } from './ui/DebugOverlay.js';
import { level01 } from './levels/level01.js';

/**
 * Convert a map's spawn tile into Pip's starting collision-box position:
 * centred in the tile horizontally, feet resting on the tile's floor.
 *
 * @param {import('./world/TileMap.js').TileMap} map
 * @returns {[number, number]} Constructor arguments for {@link Player}.
 */
function spawnPositionFor(map) {
  const x = map.spawn.col * TILE_SIZE + (TILE_SIZE - PLAYER.width) / 2;
  const y = (map.spawn.row + 1) * TILE_SIZE - PLAYER.height;
  return [Math.round(x), Math.round(y)];
}

export class Game {
  /**
   * @param {HTMLCanvasElement} canvas - The canvas the game renders into.
   */
  constructor(canvas) {
    /** @type {Viewport} */
    this.viewport = new Viewport(canvas);

    /** @type {Input} */
    this.input = new Input();

    /** @type {TouchControls} */
    this.touchControls = new TouchControls(this.viewport, this.input);

    /** @type {Audio} */
    this.audio = new Audio();

    /** @type {GameState} */
    this.state = new GameState();

    /** @type {Hud} */
    this.hud = new Hud();

    /** @type {VictoryScreen} */
    this.victory = new VictoryScreen();

    /** Ambient background particle field. @type {Spores} */
    this.spores = new Spores();

    /** @type {World} */
    this.world = new World(level01, this._worldHandlers());
    this.state.shardTotal = this.world.shardTotal;

    /** @type {Player} */
    this.player = new Player(...spawnPositionFor(this.world.map));

    /** @type {Camera} */
    this.camera = new Camera(this.world.map);
    this.camera.snapTo(this.player);

    /** Time bonus awarded on completion, held for the results screen. @private */
    this._timeBonus = 0;

    /** @type {Loop} */
    this.loop = new Loop({
      update: (dt) => this.update(dt),
      render: (alpha) => this.render(alpha),
    });

    /**
     * Cached backdrop gradient. It only depends on the logical resolution,
     * which never changes, so it is built once instead of per frame.
     * @type {CanvasGradient}
     * @private
     */
    this._skyGradient = this._createSkyGradient();

    this._attachAudioUnlock();
  }

  /** Start the simulation. */
  start() {
    this.loop.start();
  }

  /** Stop the simulation and release the animation frame. */
  stop() {
    this.loop.stop();
  }

  /** Tear everything down and detach every listener. */
  destroy() {
    this.stop();
    this.touchControls.destroy();
    this.input.destroy();
    this.viewport.destroy();
  }

  /**
   * Advance the simulation by one fixed step.
   *
   * @param {number} dt - Timestep in seconds (always FIXED_STEP).
   */
  update(dt) {
    this.spores.update(dt);
    this.state.update(dt);
    this.hud.update(dt);
    this.victory.update(dt);

    if (this.state.running) {
      this.world.update(dt, this.input, this.player);
      this._checkFatalTerrain();
      this._advanceVictory();
      this.camera.update(dt, this.player);
    } else if (this.state.phase === PHASE.GAME_OVER && this.state.readyToRestart) {
      this._restartLevel();
    } else if (this.state.phase === PHASE.VICTORY) {
      // The world is frozen behind the results screen, but the camera keeps
      // easing so the final frame settles rather than stopping dead.
      this.camera.update(dt, this.player);
      if (this.victory.complete && this.input.justPressed('jump')) this._restartLevel();
    }

    // Must come last: it clears the just-pressed/just-released edges once every
    // consumer for this step has read them.
    this.input.endStep();
  }

  /**
   * Draw one frame, in three bands: screen space, then world space inside the
   * camera transform, then screen space again for the interface.
   *
   * @param {number} alpha - Interpolation factor between simulation states.
   */
  render(alpha) {
    const { ctx, width, height } = this.viewport;

    ctx.fillStyle = this._skyGradient;
    ctx.fillRect(0, 0, width, height);
    this.spores.render(ctx, alpha, this.camera.x);

    ctx.save();
    this.camera.applyTo(ctx);
    this.world.render(ctx, alpha, this.camera.view);
    this.player.render(ctx, alpha);
    ctx.restore();

    this.hud.render(ctx, this.state);
    this.victory.render(ctx, this.state, this._timeBonus);
    this.touchControls.render(ctx);
    if (DEBUG.showStats) renderDebugOverlay(ctx, this.loop, this.player, this.state);
  }

  /**
   * Callbacks the world reports its interactions through. Everything that
   * scores, sounds or announces lives here rather than in the world.
   *
   * @returns {object}
   * @private
   */
  _worldHandlers() {
    return {
      shard: () => {
        this.state.collectShard();
        this.audio.shard();
      },
      stomp: () => {
        this.state.recordStomp();
        this.audio.stomp();
      },
      // A creature knocks Pip back but leaves him where he is. Only terrain
      // sends him back to a checkpoint, because only terrain has moved him
      // somewhere he cannot be.
      hurt: () => this._loseLife({ returnToCheckpoint: false }),
      rune: (runeSwitch, progress) => {
        this.audio.runeCorrect(progress - 1);
        this.hud.showMessage('RUNE LIT', runeSwitch.color);
      },
      runeRefused: () => {
        this.audio.runeWrong();
        this.hud.showMessage('WRONG ORDER', PALETTE.thistle);
      },
      solved: () => this.hud.showMessage('THE VAULT STIRS', PALETTE.runeAzure, 2.2),
      plank: () => this.audio.plank(),
      vault: () => this.audio.vault(),
      chestOpened: () => {
        this.state.beginOpening();
        this.audio.treasure();
      },
    };
  }

  /**
   * Spikes and bottomless pits, which cost a life outright rather than going
   * through the invulnerability window - otherwise Pip could sit in spikes.
   * @private
   */
  _checkFatalTerrain() {
    if (this.state.phase !== PHASE.PLAYING) return;

    const fellOut = this.player.top > this.world.map.pixelHeight;
    if (!this.player.contact.hazard && !fellOut) return;

    this._loseLife({ returnToCheckpoint: true });
  }

  /**
   * Deduct a life, and either recover or end the run.
   *
   * @param {object} options
   * @param {boolean} options.returnToCheckpoint - True for terrain deaths,
   *   false for creature contact, which only knocks Pip back.
   * @private
   */
  _loseLife({ returnToCheckpoint }) {
    const lastLife = this.state.loseLife();

    if (lastLife) {
      this.audio.gameOver();
      this.hud.showMessage('THE HOLLOW WINS', PALETTE.thistle, 2.2);
      return;
    }

    this.audio.hurt();

    if (returnToCheckpoint) {
      this.player.respawn();
      this.camera.snapTo(this.player);
    }
  }

  /**
   * Move from the chest animation to the results screen once it finishes.
   * @private
   */
  _advanceVictory() {
    if (this.state.phase !== PHASE.OPENING) return;
    if (!this.world.chest?.opened) return;

    this._timeBonus = this.state.finish();
    this.victory.show();
  }

  /**
   * Full restart: level, creatures, puzzle, run state and Pip.
   * @private
   */
  _restartLevel() {
    this.world.reset();
    this.state.reset();
    this.state.shardTotal = this.world.shardTotal;
    this.hud.reset();
    this.victory.reset();
    this._timeBonus = 0;

    this.player.restart();
    this.camera.snapTo(this.player);
  }

  /**
   * Browsers only allow audio to start from a user gesture, so the context is
   * unlocked on the first key or touch and never again.
   * @private
   */
  _attachAudioUnlock() {
    const unlock = () => this.audio.unlock();
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('pointerdown', unlock, { once: true });
  }

  /**
   * Build the vertical cavern gradient: deep bruised purple overhead fading to
   * a warmer, spore-lit haze near the floor.
   *
   * @returns {CanvasGradient}
   * @private
   */
  _createSkyGradient() {
    const { ctx, height } = this.viewport;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(0.65, PALETTE.skyBottom);
    gradient.addColorStop(1, PALETTE.hazeGlow);
    return gradient;
  }
}
