/**
 * Sound effects, synthesised at runtime.
 *
 * Every sound is generated with oscillators and gain envelopes rather than
 * loaded from a file. That keeps the repo asset-free and original, costs
 * nothing to download, and lets each effect be tuned as numbers in source.
 *
 * Browsers refuse to start audio before a user gesture, so the context is
 * created lazily on the first input and every call is a no-op until then. Sound
 * is a garnish here: if it never unlocks, the game still plays correctly.
 *
 * The context is created even while muted - muting only turns the master gain
 * down. Skipping creation would mean a player who mutes before their first
 * keypress never gets a context at all, and unmuting later would silently do
 * nothing, because the gesture that could have created one has passed.
 *
 * @module audio/Audio
 */

/** Master output level. Deliberately modest - these are sharp, synthetic tones. */
const MASTER_GAIN = 0.22;

/**
 * Length of the shared noise buffer, in seconds. Longer than any impact asks
 * for, so every one of them can play a prefix of the same samples.
 */
const NOISE_SECONDS = 0.25;

export class Audio {
  constructor() {
    /** @type {AudioContext | null} @private */
    this._ctx = null;
    /** @type {GainNode | null} @private */
    this._master = null;
    /** @type {boolean} */
    this.muted = false;

    /**
     * White noise, generated once and shared by every impact.
     *
     * Landing is the sound the player triggers most often in a platformer, and
     * building a buffer per landing meant allocating and filling thousands of
     * samples in the middle of gameplay. The envelope moved to a gain ramp so
     * one buffer can serve every duration.
     * @type {AudioBuffer | null}
     * @private
     */
    this._noiseBuffer = null;
  }

  /**
   * Create or resume the audio context. Safe to call on every input event.
   * Must be called from inside a user-gesture handler the first time.
   */
  unlock() {
    if (!this._ctx) {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return;

      this._ctx = new Ctor();
      this._master = this._ctx.createGain();
      this._master.gain.value = this.muted ? 0 : MASTER_GAIN;
      this._master.connect(this._ctx.destination);

      this._noiseBuffer = this._createNoiseBuffer();
    }

    // Autoplay policies suspend the context; resuming is what actually unlocks.
    if (this._ctx.state === 'suspended') this._ctx.resume();
  }

  /** Toggle sound on or off. @returns {boolean} New muted state. */
  toggleMute() {
    this.muted = !this.muted;
    if (this._master) this._master.gain.value = this.muted ? 0 : MASTER_GAIN;
    return this.muted;
  }

  /** Moving the highlight in a menu: a soft, short tick. */
  menuMove() {
    this._tone({ type: 'triangle', from: 620, to: 740, duration: 0.05, gain: 0.22 });
  }

  /** Committing to a menu choice: the tick, answered an octave up. */
  menuSelect() {
    this._tone({ type: 'triangle', from: 660, to: 660, duration: 0.07, gain: 0.32 });
    this._tone({ type: 'triangle', from: 990, to: 990, duration: 0.12, gain: 0.26, delay: 0.06 });
  }

  /** Backing out of a screen: the same shape, falling instead of rising. */
  menuBack() {
    this._tone({ type: 'triangle', from: 520, to: 340, duration: 0.12, gain: 0.26 });
  }

  /** A choice that is not available yet. Flat and short - a closed door. */
  menuRefused() {
    this._tone({ type: 'square', from: 180, to: 150, duration: 0.14, gain: 0.22 });
  }

  /** A short rising blip. Pip leaving the ground. */
  jump() {
    this._tone({ type: 'square', from: 320, to: 620, duration: 0.13, gain: 0.5 });
  }

  /**
   * Hitting the ground hard. Low and dry, with no tone to speak of - it has to
   * sit under the jump without competing with it, because in a level with a lot
   * of platforming it is the sound the player hears most often.
   */
  land() {
    this._tone({ type: 'sine', from: 160, to: 70, duration: 0.09, gain: 0.3 });
    this._noise({ duration: 0.05, gain: 0.1 });
  }

  /**
   * The stomp: a descending thud with a bright click on top, which is what
   * makes a defeat feel like an impact rather than a beep.
   */
  stomp() {
    this._tone({ type: 'square', from: 520, to: 90, duration: 0.16, gain: 0.7 });
    this._tone({ type: 'triangle', from: 900, to: 300, duration: 0.08, gain: 0.4 });
    this._noise({ duration: 0.09, gain: 0.25 });
  }

  /** Shard pickup: a bright two-step chime. */
  shard() {
    this._tone({ type: 'triangle', from: 880, to: 880, duration: 0.06, gain: 0.35 });
    this._tone({ type: 'triangle', from: 1320, to: 1320, duration: 0.1, gain: 0.3, delay: 0.05 });
  }

  /**
   * A beacon catching: a struck chord that opens upward, longer and warmer than
   * anything else in the game. It should feel like relief.
   */
  checkpoint() {
    const notes = [392, 523, 659];
    notes.forEach((frequency, index) => {
      this._tone({
        type: 'triangle',
        from: frequency,
        to: frequency,
        duration: 0.5,
        gain: 0.4,
        delay: index * 0.07,
      });
    });
    this._tone({ type: 'sine', from: 196, to: 392, duration: 0.8, gain: 0.3 });
  }

  /** Pushing at something that is not ready yet. */
  refused() {
    this._tone({ type: 'square', from: 200, to: 160, duration: 0.18, gain: 0.28 });
  }

  /** A rune accepted: rises, so progress sounds like progress. */
  runeCorrect(step = 0) {
    const base = 440 * Math.pow(1.26, step);
    this._tone({ type: 'sine', from: base, to: base * 1.5, duration: 0.22, gain: 0.5 });
  }

  /** A rune refused: a flat, downward buzz. Unmistakably a "no". */
  runeWrong() {
    this._tone({ type: 'sawtooth', from: 220, to: 110, duration: 0.3, gain: 0.35 });
  }

  /** The bridge raising: one click per plank. */
  plank() {
    this._tone({ type: 'square', from: 1200, to: 800, duration: 0.05, gain: 0.18 });
  }

  /** The vault opening: a long, low swell. */
  vault() {
    this._tone({ type: 'sine', from: 90, to: 320, duration: 0.9, gain: 0.6 });
    this._tone({ type: 'triangle', from: 180, to: 640, duration: 0.9, gain: 0.3 });
  }

  /** One second gone, in the last ten. Dry and short - a clock, not a melody. */
  tick() {
    this._tone({ type: 'square', from: 1400, to: 1400, duration: 0.035, gain: 0.16 });
  }

  /** Crossing a warning threshold: two falling notes, unmistakably a countdown. */
  timeWarning() {
    this._tone({ type: 'triangle', from: 660, to: 660, duration: 0.14, gain: 0.32 });
    this._tone({ type: 'triangle', from: 494, to: 494, duration: 0.22, gain: 0.32, delay: 0.15 });
  }

  /** The clock running out: a long descending slide with no resolution. */
  timeUp() {
    this._tone({ type: 'sawtooth', from: 440, to: 60, duration: 1.2, gain: 0.45 });
    this._tone({ type: 'triangle', from: 220, to: 55, duration: 1.4, gain: 0.3, delay: 0.1 });
  }

  /** Taking a hit. */
  hurt() {
    this._tone({ type: 'sawtooth', from: 380, to: 90, duration: 0.35, gain: 0.5 });
  }

  /** Losing the last life. */
  gameOver() {
    const notes = [392, 330, 262, 196];
    notes.forEach((frequency, index) => {
      this._tone({
        type: 'triangle',
        from: frequency,
        to: frequency,
        duration: 0.22,
        gain: 0.45,
        delay: index * 0.16,
      });
    });
  }

  /** The chest opening: a rising arpeggio that resolves upward. */
  treasure() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((frequency, index) => {
      this._tone({
        type: 'triangle',
        from: frequency,
        to: frequency,
        duration: 0.35,
        gain: 0.42,
        delay: index * 0.14,
      });
    });
    this._tone({ type: 'sine', from: 262, to: 523, duration: 1.3, gain: 0.3, delay: 0.5 });
  }

  /**
   * Play one oscillator with a percussive envelope.
   *
   * @param {object} options
   * @param {OscillatorType} options.type
   * @param {number} options.from - Start frequency in Hz.
   * @param {number} options.to - End frequency in Hz.
   * @param {number} options.duration - Seconds.
   * @param {number} [options.gain=0.4] - Peak level, before the master gain.
   * @param {number} [options.delay=0] - Seconds to wait before starting.
   * @private
   */
  _tone({ type, from, to, duration, gain = 0.4, delay = 0 }) {
    if (!this._ctx || this.muted) return;

    const start = this._ctx.currentTime + delay;
    const oscillator = this._ctx.createOscillator();
    const envelope = this._ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);

    // A tiny attack avoids the click a hard start would produce; the
    // exponential release is what makes these read as struck rather than held.
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(envelope);
    envelope.connect(this._master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  /**
   * A burst of filtered white noise, for impact texture.
   *
   * @param {object} options
   * @param {number} options.duration
   * @param {number} [options.gain=0.2]
   * @private
   */
  _noise({ duration, gain = 0.2 }) {
    if (!this._ctx || this.muted || !this._noiseBuffer) return;

    const start = this._ctx.currentTime;
    const source = this._ctx.createBufferSource();
    const envelope = this._ctx.createGain();

    source.buffer = this._noiseBuffer;

    // The fade used to be baked into the samples. Ramping the gain instead is
    // the same linear decay, and it is what lets one buffer serve every impact
    // whatever length it asks for.
    envelope.gain.setValueAtTime(gain, start);
    envelope.gain.linearRampToValueAtTime(0, start + duration);

    source.connect(envelope);
    envelope.connect(this._master);
    source.start(start);
    source.stop(start + duration);
  }

  /**
   * One buffer of flat white noise, reused by every impact.
   *
   * @returns {AudioBuffer}
   * @private
   */
  _createNoiseBuffer() {
    const frames = Math.floor(this._ctx.sampleRate * NOISE_SECONDS);
    const buffer = this._ctx.createBuffer(1, frames, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    return buffer;
  }
}
