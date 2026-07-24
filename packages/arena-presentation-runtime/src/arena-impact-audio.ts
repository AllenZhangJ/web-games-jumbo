const OPTION_KEYS = new Set<PropertyKey>(['createAudio', 'sourceByAction', 'voicesPerAction']);
const PLAY_OPTION_KEYS = new Set<PropertyKey>(['enabled']);

export const ARENA_IMPACT_AUDIO_SOURCE_BY_ACTION = Object.freeze({
  'base-push': './assets/arena/audio/kenney-impact-sounds/base-push.ogg',
  'hammer-smash': './assets/arena/audio/kenney-impact-sounds/hammer-smash.ogg',
  'chain-pull': './assets/arena/audio/kenney-impact-sounds/chain-pull.ogg',
  'shield-charge': './assets/arena/audio/kenney-impact-sounds/shield-charge.ogg',
});

export const ARENA_IMPACT_AUDIO_VOLUME_BY_ACTION = Object.freeze({
  'base-push': 0.72,
  'hammer-smash': 0.95,
  'chain-pull': 0.78,
  'shield-charge': 0.88,
});

export const ARENA_IMPACT_AUDIO_DEFAULTS = Object.freeze({
  voicesPerAction: 2,
  minimumVoicesPerAction: 1,
  maximumVoicesPerAction: 4,
  fallbackVolume: 0.8,
});

type UnknownMethod = (...args: unknown[]) => unknown;

interface VoiceRecord {
  readonly value: object;
  readonly stop: UnknownMethod | null;
  readonly pause: UnknownMethod | null;
  readonly load: UnknownMethod | null;
  readonly play: UnknownMethod | null;
  readonly destroy: UnknownMethod | null;
  readonly removeAttribute: UnknownMethod | null;
  stopped: boolean;
  sourceRemoved: boolean;
  destroyed: boolean;
}

function assertRecord(value: unknown, name: string): asserts value is object {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} 必须是对象。`);
}

function assertKnownKeys(value: unknown, allowed: ReadonlySet<PropertyKey>, name: string): void {
  assertRecord(value, name);
  const unknown = Reflect.ownKeys(value).find((key) => !allowed.has(key));
  if (unknown !== undefined) throw new TypeError(`${name} 包含未知字段 ${String(unknown)}。`);
}

function ownData(value: unknown, field: PropertyKey, name: string, required = true): unknown {
  assertRecord(value, name);
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${String(field)} 缺失。`);
  }
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}.${String(field)} 必须是数据字段。`);
  return descriptor.value;
}

function snapshotMethod(value: object, name: string, methodName: string): UnknownMethod | null {
  let owner: object | null = value;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, methodName);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${methodName} 必须是数据方法。`);
      }
      const method = descriptor.value as UnknownMethod;
      return (...args: unknown[]) => method.call(value, ...args);
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  return null;
}

function snapshotRequiredFunction(value: unknown, name: string): UnknownMethod {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return (...args: unknown[]) => Reflect.apply(value, undefined, args) as unknown;
}

function setProperty(value: object, field: string, fieldValue: unknown, name: string): void {
  if (!Reflect.set(value, field, fieldValue)) throw new Error(`${name}.${field} 写入失败。`);
}

function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let then: unknown;
  try { then = Reflect.get(value, 'then'); } catch { throw new TypeError(`${name} 返回值不可检查。`); }
  if (typeof then !== 'function') return;
  try { Promise.resolve(value).catch(() => {}); } catch { /* invalid thenable */ }
  throw new TypeError(`${name} 必须同步完成。`);
}

function sourceEntries(value: unknown): readonly (readonly [string, string])[] {
  assertRecord(value, 'ArenaImpactAudio.sourceByAction');
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('ArenaImpactAudio.sourceByAction 必须是普通对象。');
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length === 0) throw new RangeError('ArenaImpactAudio 至少需要一个音效。');
  const entries: Array<readonly [string, string]> = [];
  for (const key of keys) {
    if (typeof key !== 'string' || key.length === 0) {
      throw new TypeError('ArenaImpactAudio action ID 必须是非空字符串。');
    }
    const source = ownData(value, key, 'ArenaImpactAudio.sourceByAction');
    if (typeof source !== 'string' || !source.startsWith('./assets/')) {
      throw new RangeError(`ArenaImpactAudio ${key} 必须引用 ./assets/ 内的音频。`);
    }
    entries.push(Object.freeze([key, source]));
  }
  return Object.freeze(entries.sort(([left], [right]) => left.localeCompare(right)));
}

function createVoiceRecord(value: unknown): VoiceRecord {
  assertRecord(value, 'ArenaImpactAudio voice');
  return {
    value,
    stop: snapshotMethod(value, 'ArenaImpactAudio voice', 'stop'),
    pause: snapshotMethod(value, 'ArenaImpactAudio voice', 'pause'),
    load: snapshotMethod(value, 'ArenaImpactAudio voice', 'load'),
    play: snapshotMethod(value, 'ArenaImpactAudio voice', 'play'),
    destroy: snapshotMethod(value, 'ArenaImpactAudio voice', 'destroy'),
    removeAttribute: snapshotMethod(value, 'ArenaImpactAudio voice', 'removeAttribute'),
    stopped: false,
    sourceRemoved: false,
    destroyed: false,
  };
}

function stopForPlayback(record: VoiceRecord): void {
  try { (record.stop ?? record.pause)?.(); } catch { /* optional feedback is isolated */ }
  try {
    if (Reflect.has(record.value, 'currentTime')) setProperty(record.value, 'currentTime', 0, 'ArenaImpactAudio voice');
  } catch { /* host may expose a read-only cursor */ }
}

function recordComplete(record: VoiceRecord): boolean {
  return record.destroy !== null
    ? record.destroyed
    : record.stopped && record.sourceRemoved;
}

function releaseVoice(record: VoiceRecord): readonly unknown[] {
  if (recordComplete(record)) return Object.freeze([]);
  const errors: unknown[] = [];
  if (!record.stopped) {
    try {
      const stop = record.stop ?? record.pause;
      if (stop) rejectThenable(stop(), 'ArenaImpactAudio voice.stop()');
      record.stopped = true;
    } catch (error) { errors.push(error); }
  }
  if (!record.sourceRemoved) {
    try {
      if (record.removeAttribute) rejectThenable(record.removeAttribute('src'), 'ArenaImpactAudio voice.removeAttribute()');
      else setProperty(record.value, 'src', '', 'ArenaImpactAudio voice');
      record.sourceRemoved = true;
    } catch (error) { errors.push(error); }
  }
  if (record.destroy && !record.destroyed) {
    try {
      rejectThenable(record.destroy(), 'ArenaImpactAudio voice.destroy()');
      record.destroyed = true;
      record.stopped = true;
      record.sourceRemoved = true;
    } catch (error) { errors.push(error); }
  }
  return recordComplete(record) ? Object.freeze([]) : Object.freeze(errors);
}

function cleanupFailure(causes: readonly unknown[]): Error {
  const failure = new Error('ArenaImpactAudio 清理未完整完成。');
  Object.defineProperty(failure, 'causes', { value: Object.freeze([...causes]) });
  return failure;
}

function volumeForAction(action: string): number {
  return Object.hasOwn(ARENA_IMPACT_AUDIO_VOLUME_BY_ACTION, action)
    ? ARENA_IMPACT_AUDIO_VOLUME_BY_ACTION[action as keyof typeof ARENA_IMPACT_AUDIO_VOLUME_BY_ACTION]
    : ARENA_IMPACT_AUDIO_DEFAULTS.fallbackVolume;
}

export class ArenaImpactAudio {
  readonly #createAudio: UnknownMethod;
  readonly #entries: readonly (readonly [string, string])[];
  readonly #voicesByAction = new Map<string, VoiceRecord[]>();
  readonly #cursorByAction = new Map<string, number>();
  readonly #cleanupBacklog = new Set<VoiceRecord>();
  readonly #voicesPerAction: number;
  #loaded = false;
  #operating = false;
  #cleaning = false;
  #reentryDetected = false;
  #disabled = false;
  #destroyRequested = false;
  #disposed = false;

  constructor(options: unknown) {
    assertKnownKeys(options, OPTION_KEYS, 'ArenaImpactAudio options');
    this.#createAudio = snapshotRequiredFunction(
      ownData(options, 'createAudio', 'ArenaImpactAudio options'),
      'ArenaImpactAudio.createAudio',
    );
    this.#entries = sourceEntries(
      ownData(options, 'sourceByAction', 'ArenaImpactAudio options', false)
        ?? ARENA_IMPACT_AUDIO_SOURCE_BY_ACTION,
    );
    const voicesPerAction = ownData(options, 'voicesPerAction', 'ArenaImpactAudio options', false)
      ?? ARENA_IMPACT_AUDIO_DEFAULTS.voicesPerAction;
    if (
      !Number.isSafeInteger(voicesPerAction)
      || (voicesPerAction as number) < ARENA_IMPACT_AUDIO_DEFAULTS.minimumVoicesPerAction
      || (voicesPerAction as number) > ARENA_IMPACT_AUDIO_DEFAULTS.maximumVoicesPerAction
    ) throw new RangeError('ArenaImpactAudio.voicesPerAction 必须是 1～4。');
    this.#voicesPerAction = voicesPerAction as number;
  }

  #assertUsable(): void {
    if (this.#disposed || this.#destroyRequested) throw new Error('ArenaImpactAudio 已销毁。');
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('ArenaImpactAudio 不允许重入。');
    }
  }

  #begin(): void {
    this.#assertUsable();
    this.#operating = true;
    this.#reentryDetected = false;
  }

  #complete(): void {
    if (this.#reentryDetected) throw new Error('ArenaImpactAudio 宿主回调发生重入。');
    this.#operating = false;
  }

  #trackCandidate(record: VoiceRecord, action: string): void {
    const voices = this.#voicesByAction.get(action)!;
    voices.push(record);
  }

  #discardCandidate(record: VoiceRecord): void {
    const causes = releaseVoice(record);
    if (!recordComplete(record) || causes.length > 0) this.#cleanupBacklog.add(record);
  }

  load(): this {
    this.#assertUsable();
    if (this.#disabled) return this;
    if (this.#loaded) return this;
    this.#begin();
    try {
      for (const [action, source] of this.#entries) {
        this.#voicesByAction.set(action, []);
        this.#cursorByAction.set(action, 0);
        for (let index = 0; index < this.#voicesPerAction; index += 1) {
          let record: VoiceRecord | null = null;
          try {
            const value = this.#createAudio();
            if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
            record = createVoiceRecord(value);
            setProperty(record.value, 'src', source, 'ArenaImpactAudio voice');
            if (Reflect.has(record.value, 'preload')) setProperty(record.value, 'preload', 'auto', 'ArenaImpactAudio voice');
            setProperty(record.value, 'volume', volumeForAction(action), 'ArenaImpactAudio voice');
            if (record.load) rejectThenable(record.load(), 'ArenaImpactAudio voice.load()');
            this.#trackCandidate(record, action);
          } catch {
            if (record) this.#discardCandidate(record);
          }
        }
      }
      this.#loaded = true;
      this.#complete();
    } catch (error) {
      this.#operating = false;
      if (this.#reentryDetected) {
        this.#disabled = true;
        this.#loaded = true;
        return this;
      }
      this.#destroyRequested = true;
      try { this.#cleanupAll(); } catch { /* retained for dispose retry */ }
      throw error;
    }
    return this;
  }

  play(actionValue: unknown, options: unknown = {}): boolean {
    this.#assertUsable();
    if (typeof actionValue !== 'string' || actionValue.length === 0) {
      throw new TypeError('ArenaImpactAudio action 必须是非空字符串。');
    }
    assertKnownKeys(options, PLAY_OPTION_KEYS, 'ArenaImpactAudio play options');
    const enabled = ownData(options, 'enabled', 'ArenaImpactAudio play options', false) ?? true;
    if (typeof enabled !== 'boolean') throw new TypeError('ArenaImpactAudio.enabled 必须是布尔值。');
    if (!enabled || this.#disabled) return false;
    if (!this.#loaded) this.load();
    const voices = this.#voicesByAction.get(actionValue) ?? [];
    if (voices.length === 0) return false;
    const cursor = this.#cursorByAction.get(actionValue) ?? 0;
    const voice = voices[cursor % voices.length]!;
    this.#cursorByAction.set(actionValue, (cursor + 1) % voices.length);
    this.#begin();
    try {
      stopForPlayback(voice);
      setProperty(voice.value, 'volume', volumeForAction(actionValue), 'ArenaImpactAudio voice');
      if (!voice.play) { this.#complete(); return false; }
      const pending = voice.play();
      if (pending && (typeof pending === 'object' || typeof pending === 'function')) {
        try { Promise.resolve(pending).catch(() => {}); } catch { /* optional playback */ }
      }
      this.#complete();
      return true;
    } catch {
      this.#operating = false;
      if (this.#reentryDetected) this.#disabled = true;
      return false;
    }
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    return Object.freeze({
      loaded: this.#loaded,
      disabled: this.#disabled,
      disposed: this.#disposed,
      pendingCleanupCount: this.#cleanupBacklog.size,
      voiceCounts: Object.freeze(Object.fromEntries(
        [...this.#voicesByAction.entries()].map(([action, voices]) => [action, voices.length]),
      )),
    });
  }

  #cleanupAll(): void {
    if (this.#cleaning) throw new Error('ArenaImpactAudio 清理不可重入。');
    this.#cleaning = true;
    const errors: unknown[] = [];
    try {
      const records = new Set<VoiceRecord>([
        ...this.#cleanupBacklog,
        ...[...this.#voicesByAction.values()].flat(),
      ]);
      for (const record of records) {
        const causes = releaseVoice(record);
        if (recordComplete(record)) this.#cleanupBacklog.delete(record);
        else {
          this.#cleanupBacklog.add(record);
          errors.push(...causes);
        }
      }
      if (this.#cleanupBacklog.size === 0 && [...records].every(recordComplete)) {
        this.#voicesByAction.clear();
        this.#cursorByAction.clear();
        this.#loaded = false;
        this.#disposed = true;
      }
    } finally { this.#cleaning = false; }
    if (errors.length > 0 || !this.#disposed) throw cleanupFailure(errors);
  }

  dispose(): void {
    if (this.#disposed) return;
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('ArenaImpactAudio 清理不可重入。');
    }
    this.#destroyRequested = true;
    this.#cleanupAll();
  }
}
