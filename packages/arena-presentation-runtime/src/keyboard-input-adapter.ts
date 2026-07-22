import {
  normalizeInputFrame,
  normalizeThrownError,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  rejectThenable,
  snapshotMethod,
  type UnknownMethod,
} from './capability-utils.js';
import { cloneKnownRecord, integerAtLeast } from './input-validation.js';

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
const OPTION_KEYS = new Set(['participantId', 'bindings']);
const KEY_DOWN_OPTION_KEYS = new Set(['repeat']);

export const DEFAULT_ARENA_KEY_BINDINGS = Object.freeze({
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  primary: 'KeyE',
  jump: 'Space',
  crouch: 'KeyC',
  slam: 'ArrowDown',
} as const);

type ArenaKeyBindingName = keyof typeof DEFAULT_ARENA_KEY_BINDINGS;
type ArenaKeyBindings = Readonly<Record<ArenaKeyBindingName, string>>;

interface EventTargetPort {
  readonly addEventListener: UnknownMethod;
  readonly removeEventListener: UnknownMethod;
}

interface Cleanup {
  readonly run: () => void;
}

function participantIdValue(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('KeyboardInputAdapter.participantId 必须是非空字符串。');
  }
  return value;
}

function createKeyBindings(value: unknown = {}): ArenaKeyBindings {
  const source = cloneKnownRecord(value, KEY_CONFIG_KEYS, 'ArenaKeyBindings');
  const bindings = { ...DEFAULT_ARENA_KEY_BINDINGS, ...source } as Record<string, unknown>;
  for (const [name, code] of Object.entries(bindings)) {
    if (typeof code !== 'string' || code.length === 0) {
      throw new TypeError(`ArenaKeyBindings.${name} 必须是非空字符串。`);
    }
  }
  if (new Set(Object.values(bindings)).size !== Object.keys(bindings).length) {
    throw new RangeError('ArenaKeyBindings 不能把同一键分配给多个语义。');
  }
  return Object.freeze(bindings) as ArenaKeyBindings;
}

function validateEventTarget(value: unknown): EventTargetPort {
  return Object.freeze({
    addEventListener: snapshotMethod(
      value,
      'KeyboardInputAdapter.eventTarget',
      'addEventListener',
    )!,
    removeEventListener: snapshotMethod(
      value,
      'KeyboardInputAdapter.eventTarget',
      'removeEventListener',
    )!,
  });
}

function addListener(
  target: EventTargetPort,
  type: string,
  callback: (...args: unknown[]) => unknown,
): Cleanup {
  const result = target.addEventListener(type, callback);
  rejectThenable(result, `KeyboardInputAdapter.addEventListener(${type})`);
  let active = true;
  return Object.freeze({
    run: () => {
      if (!active) return;
      const removal = target.removeEventListener(type, callback);
      rejectThenable(removal, `KeyboardInputAdapter.removeEventListener(${type})`);
      active = false;
    },
  });
}

export class KeyboardInputAdapter {
  readonly #participantId: string;
  readonly #bindings: ArenaKeyBindings;
  readonly #knownCodes: ReadonlySet<string>;
  readonly #down: Set<string>;
  readonly #pressed: Set<string>;
  #lastTick: number;
  #suspended: boolean;
  #cleanups: Cleanup[];
  #bindingToken: { active: boolean } | null;
  #destroyed: boolean;

  constructor(options: unknown) {
    const source = cloneKnownRecord(options, OPTION_KEYS, 'KeyboardInputAdapter options');
    this.#participantId = participantIdValue(source.participantId);
    this.#bindings = createKeyBindings(source.bindings ?? {});
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

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('KeyboardInputAdapter 已销毁。');
  }

  keyDown(code: unknown, options: unknown = {}): boolean {
    this.#assertUsable();
    if (typeof code !== 'string') throw new TypeError('keyboard code 必须是字符串。');
    const source = cloneKnownRecord(options, KEY_DOWN_OPTION_KEYS, 'KeyboardInputAdapter keyDown options');
    const repeat = source.repeat ?? false;
    if (typeof repeat !== 'boolean') throw new TypeError('keyboard repeat 必须是布尔值。');
    if (this.#suspended || repeat || !this.#knownCodes.has(code) || this.#down.has(code)) {
      return false;
    }
    this.#down.add(code);
    this.#pressed.add(code);
    return true;
  }

  keyUp(code: unknown): boolean {
    this.#assertUsable();
    if (typeof code !== 'string') throw new TypeError('keyboard code 必须是字符串。');
    if (this.#suspended || !this.#down.delete(code)) return false;
    return true;
  }

  sample(tickValue: unknown): ArenaInputFrame {
    this.#assertUsable();
    const tick = integerAtLeast(tickValue, 0, 'KeyboardInputAdapter.tick');
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

  suspend(): boolean {
    this.#assertUsable();
    if (this.#suspended) return false;
    this.#suspended = true;
    this.#down.clear();
    this.#pressed.clear();
    return true;
  }

  resume(): boolean {
    this.#assertUsable();
    if (!this.#suspended) return false;
    this.#suspended = false;
    this.#down.clear();
    this.#pressed.clear();
    return true;
  }

  #cleanup(values: readonly Cleanup[]): Readonly<{ failed: Cleanup[]; errors: Error[] }> {
    const failed: Cleanup[] = [];
    const errors: Error[] = [];
    for (const cleanup of [...values].reverse()) {
      try {
        cleanup.run();
      } catch (error) {
        failed.push(cleanup);
        errors.push(normalizeThrownError(error, 'KeyboardInputAdapter 监听清理失败'));
      }
    }
    failed.reverse();
    return Object.freeze({ failed, errors });
  }

  bind(eventTarget: unknown): boolean {
    this.#assertUsable();
    if (this.#bindingToken !== null || this.#cleanups.length > 0) return false;
    const target = validateEventTarget(eventTarget);
    const cleanups: Cleanup[] = [];
    const token = { active: true };
    const guard = (callback: (event: unknown) => unknown) => (event: unknown) => {
      if (!token.active || this.#destroyed) return false;
      try {
        const result = callback(event);
        rejectThenable(result, 'KeyboardInputAdapter event callback');
        return result;
      } catch {
        return false;
      }
    };
    try {
      cleanups.push(addListener(target, 'keydown', guard((event) => {
        const record = event as { code?: unknown; repeat?: unknown; preventDefault?: unknown } | null;
        if (this.keyDown(record?.code, { repeat: record?.repeat === true })) {
          try {
            if (typeof record?.preventDefault === 'function') record.preventDefault();
          } catch { /* debug input still succeeds */ }
        }
      })));
      cleanups.push(addListener(target, 'keyup', guard((event) => {
        const record = event as { code?: unknown; preventDefault?: unknown } | null;
        if (this.keyUp(record?.code)) {
          try {
            if (typeof record?.preventDefault === 'function') record.preventDefault();
          } catch { /* debug input still succeeds */ }
        }
      })));
      cleanups.push(addListener(target, 'blur', guard(() => this.suspend())));
      cleanups.push(addListener(target, 'focus', guard(() => this.resume())));
      this.#cleanups = cleanups;
      this.#bindingToken = token;
      return true;
    } catch (error) {
      token.active = false;
      const cleanup = this.#cleanup(cleanups);
      this.#cleanups = cleanup.failed;
      if (cleanup.errors.length > 0) {
        throw new AggregateError(
          [normalizeThrownError(error, 'KeyboardInputAdapter 绑定失败'), ...cleanup.errors],
          'KeyboardInputAdapter 绑定失败且监听回滚未完整完成。',
        );
      }
      throw error;
    }
  }

  unbind(): boolean {
    this.#assertUsable();
    if (this.#bindingToken === null && this.#cleanups.length === 0) return false;
    if (this.#bindingToken) this.#bindingToken.active = false;
    const cleanup = this.#cleanup(this.#cleanups);
    this.#cleanups = cleanup.failed;
    this.#down.clear();
    this.#pressed.clear();
    if (cleanup.failed.length === 0) this.#bindingToken = null;
    if (cleanup.errors.length > 0) {
      throw new AggregateError(cleanup.errors, 'KeyboardInputAdapter 监听清理未完整完成。');
    }
    return true;
  }

  getDebugSnapshot(): Readonly<{
    lastTick: number;
    suspended: boolean;
    bound: boolean;
    pendingCleanupCount: number;
    downCodes: readonly string[];
  }> {
    this.#assertUsable();
    return Object.freeze({
      lastTick: this.#lastTick,
      suspended: this.#suspended,
      bound: this.#bindingToken !== null,
      pendingCleanupCount: this.#cleanups.length,
      downCodes: Object.freeze([...this.#down].sort()),
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.unbind();
    this.#destroyed = true;
    this.#suspended = true;
    this.#down.clear();
    this.#pressed.clear();
  }
}
