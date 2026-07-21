import { normalizeInputFrame } from '@number-strategy-jump/arena-contracts';
import {
  cloneKnownRecord,
  integerAtLeast,
} from './input-validation.js';

const KEY_CONFIG_KEYS = new Set([
  'moveLeft',
  'moveRight',
  'moveForward',
  'moveBackward',
  'primary',
  'jump',
  'crouch',
  'slam',
]);

export const DEFAULT_ARENA_KEY_BINDINGS = Object.freeze({
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  primary: 'KeyE',
  jump: 'Space',
  crouch: 'KeyC',
  slam: 'ArrowDown',
});

function participantIdValue(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('KeyboardInputAdapter.participantId 必须是非空字符串。');
  }
  return value;
}

function createKeyBindings(overrides = {}) {
  const source = cloneKnownRecord(overrides, KEY_CONFIG_KEYS, 'ArenaKeyBindings');
  const bindings = { ...DEFAULT_ARENA_KEY_BINDINGS, ...source };
  for (const [name, code] of Object.entries(bindings)) {
    if (typeof code !== 'string' || code.length === 0) {
      throw new TypeError(`ArenaKeyBindings.${name} 必须是非空字符串。`);
    }
  }
  if (new Set(Object.values(bindings)).size !== Object.keys(bindings).length) {
    throw new RangeError('ArenaKeyBindings 不能把同一键分配给多个语义。');
  }
  return Object.freeze(bindings);
}

function addListener(target, type, callback) {
  if (typeof target?.addEventListener !== 'function') {
    throw new TypeError('KeyboardInputAdapter eventTarget 缺少 addEventListener。');
  }
  target.addEventListener(type, callback);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    target.removeEventListener?.(type, callback);
  };
}

export class KeyboardInputAdapter {
  #participantId;
  #bindings;
  #knownCodes;
  #down;
  #pressed;
  #lastTick;
  #suspended;
  #cleanups;
  #bindingToken;
  #destroyed;

  constructor({ participantId, bindings = {} }) {
    this.#participantId = participantIdValue(participantId);
    this.#bindings = createKeyBindings(bindings);
    this.#knownCodes = new Set(Object.values(this.#bindings));
    this.#down = new Set();
    this.#pressed = new Set();
    this.#lastTick = -1;
    this.#suspended = false;
    this.#cleanups = [];
    this.#bindingToken = null;
    this.#destroyed = false;
    Object.freeze(this);
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('KeyboardInputAdapter 已销毁。');
  }

  keyDown(code, { repeat = false } = {}) {
    this.#assertUsable();
    if (typeof code !== 'string') throw new TypeError('keyboard code 必须是字符串。');
    if (typeof repeat !== 'boolean') throw new TypeError('keyboard repeat 必须是布尔值。');
    if (this.#suspended || repeat || !this.#knownCodes.has(code) || this.#down.has(code)) {
      return false;
    }
    this.#down.add(code);
    this.#pressed.add(code);
    return true;
  }

  keyUp(code) {
    this.#assertUsable();
    if (typeof code !== 'string') throw new TypeError('keyboard code 必须是字符串。');
    if (this.#suspended || !this.#down.delete(code)) return false;
    return true;
  }

  sample(tick) {
    this.#assertUsable();
    integerAtLeast(tick, 0, 'KeyboardInputAdapter.tick');
    if (this.#suspended) throw new Error('KeyboardInputAdapter 暂停时不能采样。');
    if (this.#lastTick >= 0 && tick !== this.#lastTick + 1) {
      throw new RangeError(
        `KeyboardInputAdapter tick 必须连续：上次 ${this.#lastTick}，本次 ${tick}。`,
      );
    }
    const horizontal = Number(this.#down.has(this.#bindings.moveRight))
      - Number(this.#down.has(this.#bindings.moveLeft));
    const vertical = Number(this.#down.has(this.#bindings.moveForward))
      - Number(this.#down.has(this.#bindings.moveBackward));
    const magnitude = Math.hypot(horizontal, vertical);
    const scale = magnitude > 1 ? 1 / magnitude : 1;
    const frame = normalizeInputFrame({
      tick,
      participantId: this.#participantId,
      moveX: horizontal * scale,
      moveZ: vertical * scale,
      primaryPressed: this.#pressed.has(this.#bindings.primary),
      primaryHeld: this.#down.has(this.#bindings.primary),
      jumpPressed: this.#pressed.has(this.#bindings.jump),
      jumpHeld: this.#down.has(this.#bindings.crouch),
      slamPressed: this.#pressed.has(this.#bindings.slam),
    }, {
      expectedTick: tick,
      participantIds: [this.#participantId],
    });
    this.#pressed.clear();
    this.#lastTick = tick;
    return frame;
  }

  suspend() {
    this.#assertUsable();
    if (this.#suspended) return false;
    this.#suspended = true;
    this.#down.clear();
    this.#pressed.clear();
    return true;
  }

  resume() {
    this.#assertUsable();
    if (!this.#suspended) return false;
    this.#suspended = false;
    this.#down.clear();
    this.#pressed.clear();
    return true;
  }

  bind(eventTarget) {
    this.#assertUsable();
    if (this.#bindingToken !== null) return false;
    const cleanups = [];
    const token = { active: true };
    const guard = (callback) => (event) => {
      if (!token.active || this.#destroyed) return false;
      try {
        return callback(event);
      } catch {
        return false;
      }
    };
    try {
      cleanups.push(addListener(eventTarget, 'keydown', guard((event) => {
        if (this.keyDown(event?.code, { repeat: event?.repeat === true })) {
          try { event.preventDefault?.(); } catch { /* debug input still succeeds */ }
        }
      })));
      cleanups.push(addListener(eventTarget, 'keyup', guard((event) => {
        if (this.keyUp(event?.code)) {
          try { event.preventDefault?.(); } catch { /* debug input still succeeds */ }
        }
      })));
      cleanups.push(addListener(eventTarget, 'blur', guard(() => this.suspend())));
      cleanups.push(addListener(eventTarget, 'focus', guard(() => this.resume())));
      this.#cleanups = cleanups;
      this.#bindingToken = token;
      return true;
    } catch (error) {
      token.active = false;
      for (const cleanup of cleanups.reverse()) {
        try { cleanup(); } catch { /* continue rollback */ }
      }
      throw error;
    }
  }

  unbind() {
    this.#assertUsable();
    if (this.#bindingToken === null) return false;
    this.#bindingToken.active = false;
    this.#bindingToken = null;
    const cleanups = this.#cleanups.splice(0);
    for (const cleanup of cleanups.reverse()) {
      try { cleanup(); } catch { /* listener cleanup is best effort */ }
    }
    this.#down.clear();
    this.#pressed.clear();
    return true;
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({
      lastTick: this.#lastTick,
      suspended: this.#suspended,
      bound: this.#bindingToken !== null,
      downCodes: Object.freeze([...this.#down].sort()),
    });
  }

  destroy() {
    if (this.#destroyed) return;
    this.unbind();
    this.#destroyed = true;
    this.#suspended = true;
    this.#down.clear();
    this.#pressed.clear();
  }
}
