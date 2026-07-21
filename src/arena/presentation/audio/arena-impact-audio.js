const DEFAULT_SOURCE_BY_ACTION = Object.freeze({
  'base-push': './assets/arena/audio/kenney-impact-sounds/base-push.ogg',
  'hammer-smash': './assets/arena/audio/kenney-impact-sounds/hammer-smash.ogg',
  'chain-pull': './assets/arena/audio/kenney-impact-sounds/chain-pull.ogg',
  'shield-charge': './assets/arena/audio/kenney-impact-sounds/shield-charge.ogg',
});

const VOLUME_BY_ACTION = Object.freeze({
  'base-push': 0.72,
  'hammer-smash': 0.95,
  'chain-pull': 0.78,
  'shield-charge': 0.88,
});

function sourceEntries(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('ArenaImpactAudio.sourceByAction 必须是对象。');
  }
  const entries = Object.entries(value);
  if (entries.length === 0) throw new RangeError('ArenaImpactAudio 至少需要一个音效。');
  for (const [action, source] of entries) {
    if (typeof action !== 'string' || action.length === 0) {
      throw new TypeError('ArenaImpactAudio action ID 必须是非空字符串。');
    }
    if (typeof source !== 'string' || !source.startsWith('./assets/')) {
      throw new RangeError(`ArenaImpactAudio ${action} 必须引用 ./assets/ 内的音频。`);
    }
  }
  return entries;
}

function stopVoice(voice) {
  try {
    if (typeof voice.stop === 'function') voice.stop();
    else voice.pause?.();
  } catch {
    // Optional host audio must never fail the render loop.
  }
  try {
    if ('currentTime' in voice) voice.currentTime = 0;
  } catch {
    // Some mini-game audio implementations expose a read-only currentTime.
  }
}

/**
 * Small host-neutral SFX pool. It consumes already-deduplicated presentation
 * events and never participates in authoritative combat.
 */
export class ArenaImpactAudio {
  #createAudio;
  #entries;
  #voicesByAction;
  #cursorByAction;
  #voicesPerAction;
  #loaded;
  #disposed;

  constructor({
    createAudio,
    sourceByAction = DEFAULT_SOURCE_BY_ACTION,
    voicesPerAction = 2,
  }) {
    if (typeof createAudio !== 'function') {
      throw new TypeError('ArenaImpactAudio.createAudio 必须是函数。');
    }
    if (!Number.isSafeInteger(voicesPerAction) || voicesPerAction < 1 || voicesPerAction > 4) {
      throw new RangeError('ArenaImpactAudio.voicesPerAction 必须是 1～4。');
    }
    this.#createAudio = createAudio;
    this.#entries = Object.freeze(sourceEntries(sourceByAction));
    this.#voicesByAction = new Map();
    this.#cursorByAction = new Map();
    this.#voicesPerAction = voicesPerAction;
    this.#loaded = false;
    this.#disposed = false;
  }

  load() {
    if (this.#disposed) throw new Error('ArenaImpactAudio 已销毁。');
    if (this.#loaded) return this;
    for (const [action, source] of this.#entries) {
      const voices = [];
      for (let index = 0; index < this.#voicesPerAction; index += 1) {
        let voice = null;
        try {
          voice = this.#createAudio();
          if (!voice || typeof voice !== 'object') continue;
          voice.src = source;
          if ('preload' in voice) voice.preload = 'auto';
          voice.volume = VOLUME_BY_ACTION[action] ?? 0.8;
          voice.load?.();
          voices.push(voice);
        } catch {
          try { voice?.destroy?.(); } catch { /* optional cleanup */ }
        }
      }
      this.#voicesByAction.set(action, voices);
      this.#cursorByAction.set(action, 0);
    }
    this.#loaded = true;
    return this;
  }

  play(action, { enabled = true } = {}) {
    if (this.#disposed) throw new Error('ArenaImpactAudio 已销毁。');
    if (typeof enabled !== 'boolean') throw new TypeError('ArenaImpactAudio.enabled 必须是布尔值。');
    if (!enabled) return false;
    if (!this.#loaded) this.load();
    const voices = this.#voicesByAction.get(action) ?? [];
    if (voices.length === 0) return false;
    const cursor = this.#cursorByAction.get(action) ?? 0;
    const voice = voices[cursor % voices.length];
    this.#cursorByAction.set(action, (cursor + 1) % voices.length);
    stopVoice(voice);
    try {
      voice.volume = VOLUME_BY_ACTION[action] ?? 0.8;
      if (typeof voice.play !== 'function') return false;
      const pending = voice.play();
      pending?.catch?.(() => {});
      return true;
    } catch {
      return false;
    }
  }

  getDebugSnapshot() {
    return Object.freeze({
      loaded: this.#loaded,
      disposed: this.#disposed,
      voiceCounts: Object.freeze(Object.fromEntries(
        [...this.#voicesByAction.entries()].map(([action, voices]) => [action, voices.length]),
      )),
    });
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const voices of this.#voicesByAction.values()) {
      for (const voice of voices) {
        stopVoice(voice);
        try { voice.destroy?.(); } catch { /* best-effort host cleanup */ }
        try { voice.removeAttribute?.('src'); } catch { /* browser-only cleanup */ }
      }
    }
    this.#voicesByAction.clear();
    this.#cursorByAction.clear();
    this.#loaded = false;
  }
}

export const ARENA_IMPACT_AUDIO_SOURCE_BY_ACTION = DEFAULT_SOURCE_BY_ACTION;
