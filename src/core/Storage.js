/**
 * A safe wrapper around `localStorage`.
 *
 * Every access is guarded, because saved progress is the one part of the game
 * that lives outside it and therefore the one part that can arrive broken:
 *
 *   - The API may not exist at all, or may throw merely on being *touched* -
 *     Safari's private mode and a page opened from `file://` both do this.
 *   - The quota may be full, so a write can throw even when a read worked.
 *   - The stored text is user-editable, so it may be truncated, hand-edited or
 *     left over from an older version of the game.
 *
 * None of that is allowed to stop someone playing. Every method fails quietly
 * and the caller carries on with defaults - losing a save is a disappointment,
 * but a black screen is a broken game.
 *
 * @module core/Storage
 */

/**
 * Probe for a usable storage backend.
 *
 * The write-then-remove test is deliberate: some browsers expose the object and
 * only throw when it is actually used, so merely checking that it exists proves
 * nothing.
 *
 * @returns {Storage|null}
 */
function detectBackend() {
  try {
    const backend = globalThis.localStorage;
    if (!backend) return null;

    const probe = '__lumen_probe__';
    backend.setItem(probe, '1');
    backend.removeItem(probe);
    return backend;
  } catch {
    return null;
  }
}

export class SaveSlot {
  /**
   * @param {string} key - Storage key. Version it, so a future format change
   *   simply ignores old saves rather than trying to read them.
   * @param {Storage|null} [backend] - Injectable for tests; detected if absent.
   */
  constructor(key, backend = detectBackend()) {
    /** @type {string} */
    this.key = key;

    /** @type {Storage|null} @private */
    this._backend = backend;
  }

  /** Whether anything written here will actually survive. @returns {boolean} */
  get available() {
    return this._backend !== null;
  }

  /**
   * Read and parse the slot.
   *
   * @returns {object|null} The stored object, or null if there is nothing
   *   readable there - which includes the case of stored text that is not valid
   *   JSON, since a corrupt save and no save mean the same thing to the caller.
   */
  read() {
    if (!this._backend) return null;

    try {
      const raw = this._backend.getItem(this.key);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : null;
    } catch {
      return null;
    }
  }

  /**
   * Write the slot.
   *
   * @param {object} data
   * @returns {boolean} Whether it was actually stored.
   */
  write(data) {
    if (!this._backend) return false;

    try {
      this._backend.setItem(this.key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  /** Remove the slot. */
  clear() {
    if (!this._backend) return;

    try {
      this._backend.removeItem(this.key);
    } catch {
      // Nothing sensible to do, and nothing depends on it having worked.
    }
  }
}
