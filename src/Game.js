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
import { AppState, STATE } from './core/AppState.js';
import { PALETTE, DEBUG, PLAYER, TILE_SIZE, TIMER } from './core/Config.js';
import { Input } from './input/Input.js';
import { Pointer } from './input/Pointer.js';
import { TouchControls } from './input/TouchControls.js';
import { Audio } from './audio/Audio.js';
import { Spores } from './world/Spores.js';
import { World } from './world/World.js';
import { Player } from './entities/Player.js';
import { Hud } from './ui/Hud.js';
import { LevelIntro } from './ui/LevelIntro.js';
import { MenuBackdrop } from './ui/MenuBackdrop.js';
import { TitleScreen } from './ui/screens/TitleScreen.js';
import { HowToPlayScreen } from './ui/screens/HowToPlayScreen.js';
import { LevelSelectScreen } from './ui/screens/LevelSelectScreen.js';
import { PauseScreen } from './ui/screens/PauseScreen.js';
import { TimeUpScreen } from './ui/screens/TimeUpScreen.js';
import { GameOverScreen } from './ui/screens/GameOverScreen.js';
import { LevelCompleteScreen } from './ui/screens/LevelCompleteScreen.js';
import { FinalVictoryScreen } from './ui/screens/FinalVictoryScreen.js';
import { Progress } from './core/Progress.js';
import { renderDebugOverlay } from './ui/DebugOverlay.js';
import { LEVELS, LEVEL_COUNT, clampLevelIndex } from './levels/levels.js';

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

/**
 * Seconds as `m:ss`. Used for the campaign total, which is the only duration
 * not already formatted by a timer.
 *
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
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

    /** Cursor and taps, for the menus only. @type {Pointer} */
    this.pointer = new Pointer(this.viewport);

    /** @type {TouchControls} */
    this.touchControls = new TouchControls(this.viewport, this.input);

    /** @type {Audio} */
    this.audio = new Audio();

    /** Which screen the game is on. @type {AppState} */
    this.app = new AppState(STATE.MAIN_MENU);

    /** Scenery drawn behind every menu. @type {MenuBackdrop} */
    this.backdrop = new MenuBackdrop();

    /**
     * Screens, keyed by the state that shows them. A state with no entry here
     * is a gameplay state and runs the world instead.
     *
     * A screen may set `overWorld`, which means it is drawn on top of the level
     * - frozen, still lit - rather than on top of the menu scenery.
     * @type {Record<string, {overWorld?: boolean, enter?: () => void, update: Function, render: Function}>}
     */
    this.screens = {
      [STATE.MAIN_MENU]: new TitleScreen(),
      [STATE.HOW_TO_PLAY]: new HowToPlayScreen(),
      [STATE.LEVEL_SELECT]: new LevelSelectScreen(),
      [STATE.PAUSED]: new PauseScreen(),
      [STATE.TIME_UP]: new TimeUpScreen(),
      [STATE.GAME_OVER]: new GameOverScreen(),
      [STATE.LEVEL_COMPLETE]: new LevelCompleteScreen(),
      [STATE.FINAL_VICTORY]: new FinalVictoryScreen(),
    };

    /** What the player has finished and unlocked. @type {Progress} */
    this.progress = new Progress(LEVEL_COUNT);

    /** @type {GameState} */
    this.state = new GameState();

    /** @type {Hud} */
    this.hud = new Hud();

    /** The card that names a level as it begins. @type {LevelIntro} */
    this.levelIntro = new LevelIntro();

    /** Ambient background particle field. @type {Spores} */
    this.spores = new Spores();

    /** Index into {@link LEVELS} of the level currently loaded. @type {number} */
    this.levelIndex = 0;

    /** @type {World} */
    this.world = null;
    /** @type {Player} */
    this.player = null;
    /** @type {Camera} */
    this.camera = null;

    /** Last whole second announced by {@link _soundTheClock}. @type {number|null} @private */
    this._lastSecond = null;

    this.loadLevel(0);

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

    this.screens[STATE.MAIN_MENU].enter();
    this._attachAudioUnlock();
  }

  /** The level currently loaded. @returns {import('./levels/levels.js').LevelEntry} */
  get level() {
    return LEVELS[this.levelIndex];
  }

  /**
   * Build a level from scratch: its world, its Pip, its camera and a fresh run
   * state. Everything a level owns is replaced rather than reused, so nothing
   * can survive from the level before it.
   *
   * @param {number} index - Index into {@link LEVELS}; clamped.
   */
  loadLevel(index) {
    this.levelIndex = clampLevelIndex(index);

    this.world = new World(this.level.definition, this._worldHandlers());
    this.player = new Player(...spawnPositionFor(this.world.map));
    this.camera = new Camera(this.world.map);
    this.camera.snapTo(this.player);

    this.state.reset();
    this.state.levelNumber = this.level.number;
    this.state.shardTotal = this.world.shardTotal;
    this.state.checkpointTotal = this.world.checkpointTotal;
    this.hud.reset();
    this.levelIntro.show(this.level);
    this._lastSecond = null;
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
    this.pointer.destroy();
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

    // Read before the transition advances, so a press made during a fade is
    // dropped rather than landing on the screen that is arriving.
    const transitioning = this.app.busy;
    this.app.update(dt);

    // Muting works from anywhere, including the menus, which make sound too.
    if (this.input.justPressed('mute')) this._toggleMute();

    const screen = this.screens[this.app.state];
    if (screen) {
      // A screen laid over the level leaves the level exactly as it was: the
      // world is not stepped, so nothing moves and the clock does not run.
      if (!screen.overWorld) this.backdrop.update(dt);
      this.hud.update(dt);

      const result = screen.update(dt, this.input, this.pointer);
      if (!transitioning && result) this._handleScreenAction(result);
    } else {
      this._updateLevel(dt);
    }

    // The on-screen pad belongs to gameplay; leaving it live under a menu would
    // let one tap both press a button and jump.
    this.touchControls.setEnabled(this.app.is(STATE.PLAYING));

    // Must come last: they clear the just-pressed/just-released edges once every
    // consumer for this step has read them.
    this.input.endStep();
    this.pointer.endStep();
  }

  /**
   * One step of an actual level.
   *
   * @param {number} dt
   * @private
   */
  _updateLevel(dt) {
    // Tested before anything else advances, so the frame the player pauses on
    // is the frame they see - no extra step of physics slips through.
    if (this.state.phase === PHASE.PLAYING && this.input.justPressed('pause')) {
      this._pause();
      return;
    }

    const ranOut = this.state.update(dt);
    this.hud.update(dt);
    this.levelIntro.update(dt);

    if (ranOut) {
      this._onTimeUp();
      return;
    }
    this._soundTheClock();

    if (this.state.running) {
      this.world.update(dt, this.input, this.player);
      this._reportPipMoves();
      this._checkFatalTerrain();
      this._advanceVictory();
      this.camera.update(dt, this.player);
      return;
    }

    if (this.state.endingSettled) this._onGameOver();
  }

  /**
   * Silence the game, or bring it back.
   * @private
   */
  _toggleMute() {
    const muted = this.audio.toggleMute();
    if (!muted) this.audio.menuSelect();
    this.hud.showMessage(muted ? 'SOUND OFF' : 'SOUND ON', PALETTE.hazeGlow, 1.2);
  }

  /**
   * Give Pip's own movement a voice.
   *
   * The player produces two events a step can't infer from anywhere else -
   * leaving the ground and hitting it - and both were being computed and
   * thrown away. A jump with no sound and a landing with no dust reads as
   * weightless however good the physics underneath it is.
   *
   * @private
   */
  _reportPipMoves() {
    if (this.player.justJumped) this.audio.jump();
    if (!this.player.justLanded) return;

    // Only a landing with real force behind it is worth marking; the animation
    // has already made that judgement, so use the same threshold rather than a
    // second one that could disagree with it.
    const heavy = this.player.animation.squashing;

    this.world.particles.emit({
      x: this.player.centerX,
      y: this.player.bottom,
      count: heavy ? 8 : 4,
      color: PALETTE.stoneLit,
      speed: heavy ? 52 : 30,
      gravity: 130,
      life: 0.3,
    });

    if (!heavy) return;
    this.audio.land();
    this.camera.shake(1.5);
  }

  /**
   * Hold the level where it is.
   *
   * Instant rather than faded: a pause should feel like the world holding its
   * breath, and a black wipe would read as the game having lost its place. The
   * held movement keys are released, so a player who tabs away mid-run does not
   * come back to Pip still sprinting into a wall.
   *
   * @private
   */
  _pause() {
    this.audio.menuBack();
    this.input.releaseAll();

    this.app.go(STATE.PAUSED, {
      instant: true,
      onSwap: () => {
        this.screens[STATE.PAUSED].enter();
        this.pointer.reset();
      },
    });
  }

  /**
   * Back into the level, from exactly where it stopped.
   * @private
   */
  _resume() {
    this.audio.menuSelect();
    this.app.go(STATE.PLAYING, { instant: true });
  }

  /**
   * The countdown has run out. The level is left exactly as it stands - the
   * screen is drawn over it - so the player can see where they ran out.
   * @private
   */
  _onTimeUp() {
    this.audio.timeUp();
    this._goto(STATE.TIME_UP);
  }

  /**
   * The last lantern has gone out. Shown a beat after the death itself, so the
   * death is seen and heard before the game talks about it.
   * @private
   */
  _onGameOver() {
    this._goto(STATE.GAME_OVER);
  }

  /**
   * Mark the passing seconds once the clock is low: a tick each second through
   * the last ten, and a single chime as each warning threshold is crossed.
   *
   * Sound carries urgency without costing any of the screen the player is
   * trying to read, which is why the visual warnings can stay as restrained as
   * they are.
   *
   * @private
   */
  _soundTheClock() {
    const { timer } = this.state;
    const seconds = timer.wholeSecondsLeft;
    if (seconds === this._lastSecond) return;

    const previous = this._lastSecond;
    this._lastSecond = seconds;

    // Only ever going down, and only while actually playing.
    if (previous === null || seconds > previous || !timer.running) return;

    if (seconds === TIMER.warnAt || seconds === TIMER.alarmAt) {
      this.audio.timeWarning();
    } else if (seconds > 0 && seconds <= TIMER.criticalAt) {
      this.audio.tick();
    }
  }

  /**
   * Move on from a finished level.
   * @private
   */
  _advanceLevel() {
    this._goto(STATE.PLAYING, () => this.loadLevel(this.levelIndex + 1));
  }

  /**
   * Close the campaign, with the totals from every level finished.
   * @private
   */
  _finishAdventure() {
    const totals = this.progress.totals;

    this.screens[STATE.FINAL_VICTORY].present({
      score: totals.score,
      time: formatDuration(totals.time),
      shards: totals.shards,
      defeated: totals.defeated,
    });
    this.audio.treasure();
    this._goto(STATE.FINAL_VICTORY, () => this.loadLevel(0));
  }

  /**
   * Route whatever a menu screen reported into sound and a screen change.
   *
   * @param {{action: string, id?: string}} result
   * @private
   */
  _handleScreenAction({ action, id }) {
    if (action === 'move') {
      this.audio.menuMove();
      return;
    }

    if (action === 'refused') {
      this.audio.menuRefused();
      return;
    }

    if (action !== 'activate') return;

    switch (id) {
      case 'play':
        this.audio.menuSelect();
        this._goto(STATE.PLAYING, () => this.loadLevel(0));
        break;
      case 'howToPlay':
        this.audio.menuSelect();
        this._goto(STATE.HOW_TO_PLAY);
        break;
      case 'levelSelect':
        this.audio.menuSelect();
        this._openLevelSelect();
        break;
      case 'resume':
        this._resume();
        break;
      case 'retry':
      case 'replay':
        this.audio.menuSelect();
        this._goto(STATE.PLAYING, () => this.loadLevel(this.levelIndex));
        break;
      case 'nextLevel':
        this.audio.menuSelect();
        this._advanceLevel();
        break;
      case 'finish':
        this.audio.menuSelect();
        this._finishAdventure();
        break;
      case 'mainMenu':
        this.audio.menuBack();
        this._goto(STATE.MAIN_MENU, () => this.loadLevel(0));
        break;
      case 'back':
        this.audio.menuBack();
        this._goto(STATE.MAIN_MENU);
        break;
      default:
        // Level select reports its rows as "level:<index>".
        if (typeof id === 'string' && id.startsWith('level:')) {
          this.audio.menuSelect();
          this._goto(STATE.PLAYING, () => this.loadLevel(Number(id.slice(6))));
        }
        break;
    }
  }

  /**
   * Open the level list, rebuilt from current progress - what is unlocked may
   * have changed since it was last looked at.
   * @private
   */
  _openLevelSelect() {
    this.screens[STATE.LEVEL_SELECT].present(LEVELS, this.progress);
    this._goto(STATE.LEVEL_SELECT);
  }

  /**
   * Change screen, doing the work the change needs while the curtain is down.
   *
   * @param {string} state - A {@link STATE} value.
   * @param {() => void} [work] - Run at the darkest point of the fade.
   * @private
   */
  _goto(state, work) {
    // A level being left takes its intro card with it, or the card would sit
    // frozen behind whatever screen replaced the level.
    if (state !== STATE.PLAYING) this.levelIntro.hide();

    this.app.go(state, {
      reenter: true,
      onSwap: () => {
        work?.();
        this.screens[state]?.enter?.();
        // A menu opened under a resting cursor must not start with that item
        // selected just because the pointer happens to be there.
        this.pointer.reset();
      },
    });
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

    const screen = this.screens[this.app.state];

    if (screen && !screen.overWorld) {
      this.backdrop.render(ctx);
      this.spores.render(ctx, alpha, this.backdrop.drift);
      screen.render(ctx);
    } else {
      this._renderLevel(ctx, alpha);
      // A screen that sits over the level draws last, on top of the HUD.
      screen?.render(ctx);
    }

    this.touchControls.render(ctx);
    if (DEBUG.showStats) renderDebugOverlay(ctx, this.loop, this.player, this.state);

    // Last of all, so the curtain covers the interface as well as the world.
    this.app.renderCurtain(ctx, width, height);
  }

  /**
   * The level itself: spores, then the world inside the camera transform, then
   * the interface in screen space.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha
   * @private
   */
  _renderLevel(ctx, alpha) {
    this.spores.render(ctx, alpha, this.camera.x);

    ctx.save();
    this.camera.applyTo(ctx);
    this.world.render(ctx, alpha, this.camera.view);
    this.player.render(ctx, alpha);
    ctx.restore();

    this.hud.render(ctx, this.state);
    this.levelIntro.render(ctx);
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
        this.camera.shake(2);
      },
      // Every way of dying costs the same and returns Pip to the same place -
      // the last beacon he lit. A creature that only knocked him back would
      // make one kind of death cheaper than another for no reason the player
      // could see.
      hurt: () => this._loseLife(),
      rune: (runeSwitch, progress) => {
        this.audio.runeCorrect(progress - 1);
        this.hud.showMessage('RUNE LIT', runeSwitch.color);
      },
      runeRefused: () => {
        this.audio.runeWrong();
        this.hud.showMessage('WRONG ORDER', PALETTE.thistle);
      },
      checkpoint: (checkpoint) => this._lightCheckpoint(checkpoint),
      chestRefused: (lit, total) => {
        this.audio.refused();
        this.hud.showMessage(`BEACONS ${lit}/${total}`, PALETTE.thistle, 2);
      },
      solved: () => this.hud.showMessage('THE VAULT STIRS', PALETTE.runeAzure, 2.2),
      plank: () => this.audio.plank(),
      vault: () => {
        this.audio.vault();
        this.camera.shake(3);
      },
      chestOpened: () => {
        this.state.beginOpening();
        this.audio.treasure();
        this.camera.shake(2.5);
      },
    };
  }

  /**
   * A beacon has caught: count it, announce it, and make it the place death
   * returns Pip to from now on.
   *
   * The respawn point is the *most recently* lit beacon rather than the
   * highest-numbered one, because that is where the player last was - which is
   * what "send me back to where I was" means to them.
   *
   * @param {import('./entities/Checkpoint.js').Checkpoint} checkpoint
   * @private
   */
  _lightCheckpoint(checkpoint) {
    this.state.lightCheckpoint();
    this.audio.checkpoint();
    this.camera.shake(1.5);

    const { x, y } = checkpoint.respawnPosition(this.player.width, this.player.height);
    this.player.setRespawnPoint(x, y);

    const total = this.world.checkpointTotal;
    this.hud.showMessage(
      `CHECKPOINT ${checkpoint.number} OF ${total}`,
      PALETTE.lanternCore,
      2,
    );
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

    this._loseLife();
  }

  /**
   * Deduct a life, and either send Pip back to his last beacon or end the run.
   *
   * With lives left he returns to the most recent beacon - or to the level's
   * start if he has not lit one. With none left the run is over, so he goes
   * back to the start whatever he lit, and the game-over screen comes up over a
   * level that is already reset behind it.
   *
   * @private
   */
  _loseLife() {
    const lastLife = this.state.loseLife();
    this.camera.shake(lastLife ? 4 : 2.5);

    // A burst where he was lost, so a death off screen still reads as a death
    // rather than as Pip having teleported for no reason.
    this.world.particles.emit({
      x: this.player.centerX,
      y: this.player.centerY,
      count: 18,
      color: PALETTE.lantern,
      speed: 90,
      gravity: 160,
      life: 0.6,
    });

    if (lastLife) {
      this.audio.gameOver();
      this.hud.showMessage('THE HOLLOW WINS', PALETTE.thistle, 2.2);
      this.player.returnToStart();
      this.camera.snapTo(this.player);
      return;
    }

    this.audio.hurt();
    this.player.respawn();
    this.camera.snapTo(this.player);
    this.hud.flashRespawn();

    // Only worth saying once a beacon is actually behind him; before that,
    // "back to the beacon" would name something the player has never seen.
    if (this.state.checkpoints > 0) {
      this.hud.showMessage('BACK TO THE BEACON', PALETTE.lanternCore, 1.6);
    }
  }

  /**
   * Move from the chest animation to the results screen once it finishes.
   *
   * The level is banked here rather than on the results screen's buttons, so a
   * player who walks away at the results still keeps what they earned.
   *
   * @private
   */
  _advanceVictory() {
    if (this.state.phase !== PHASE.OPENING) return;
    if (!this.world.chest?.opened) return;

    const timeBonus = this.state.finish();
    const isFinalLevel = this.levelIndex === LEVEL_COUNT - 1;

    this.progress.record(this.levelIndex, {
      time: this.state.time,
      score: this.state.score,
      shards: this.state.shards,
      shardTotal: this.state.shardTotal,
      defeated: this.state.defeated,
    });

    this.screens[STATE.LEVEL_COMPLETE].present({
      levelNumber: this.level.number,
      levelName: this.level.name,
      time: this.state.formattedTime,
      checkpoints: this.state.checkpoints,
      checkpointTotal: this.state.checkpointTotal,
      shards: this.state.shards,
      shardTotal: this.state.shardTotal,
      defeated: this.state.defeated,
      timeBonus,
      score: this.state.score,
      isFinalLevel,
    });

    this._goto(STATE.LEVEL_COMPLETE);
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
