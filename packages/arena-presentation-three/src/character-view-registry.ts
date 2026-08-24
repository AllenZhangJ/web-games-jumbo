import {
  assertCharacterPresentationRegistry,
  type CharacterPresentationDefinition,
  type CharacterPresentationRegistryPort,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  CharacterViewRuntime,
  CharacterViewRuntimeConstructionCleanupError,
} from '@number-strategy-jump/arena-presentation-runtime';
import { readDataArray } from './strict-data-array.js';

type UnknownMethod = (...args: unknown[]) => unknown;
interface ParticipantEntry {
  readonly id: string;
  readonly value: object;
  readonly definition: CharacterPresentationDefinition;
}
interface CharacterRecord {
  readonly runtime: CharacterViewRuntime;
  readonly root: unknown;
  rootDetached: boolean;
  runtimeDisposed: boolean;
}

interface CharacterViewRegistrySyncOptions {
  readonly snap?: boolean;
  readonly cameraModel?: unknown;
  readonly animationHoldParticipantIds: readonly string[];
  readonly animationHoldConfigured: boolean;
}

export const CHARACTER_VIEW_REGISTRY_TERMINAL_LIFECYCLE_V1 = Object.freeze({
  id: 'character-view-registry-terminal-lifecycle-v1',
  cleanupCallbacksCannotReenterPublicApi: true,
  cleanupCallbacksMustCompleteSynchronously: true,
  recordFailureStopsLaterCleanup: true,
});
export const CHARACTER_VIEW_REGISTRY_RUNTIME_CONSTRUCTION_LIFECYCLE_V1 = Object.freeze({
  id: 'character-view-registry-runtime-construction-lifecycle-v1',
  runtimeDebtRetainedBeforeRegistryPublication: true,
  cleanupRetriesRuntimeDebtBeforeCompletion: true,
});

function snapshotMethod(value: unknown, name: string, methodName: string): UnknownMethod {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是对象。`);
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
  throw new TypeError(`${name} 缺少 ${methodName}()。`);
}

function data(value: unknown, field: string, name: string): unknown {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是对象。`);
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${field} 必须是数据字段。`);
  }
  return descriptor.value;
}

function nonEmpty(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} 必须是非空字符串。`);
  return value;
}

function syncOptions(value: unknown): CharacterViewRegistrySyncOptions {
  if (value === undefined) {
    return Object.freeze({
      animationHoldParticipantIds: Object.freeze([]),
      animationHoldConfigured: false,
    });
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('CharacterViewRegistry sync options 必须是对象。');
  }
  const allowed = new Set<PropertyKey>(['snap', 'cameraModel', 'animationHoldParticipantIds']);
  if (Reflect.ownKeys(value).some((key) => !allowed.has(key))) {
    throw new TypeError('CharacterViewRegistry sync options 包含未知字段。');
  }
  const result: Record<string, unknown> = {};
  for (const key of ['snap', 'cameraModel', 'animationHoldParticipantIds']) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) continue;
    if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`CharacterViewRegistry ${key} 必须是数据字段。`);
    result[key] = descriptor.value;
  }
  if (result.snap !== undefined && typeof result.snap !== 'boolean') {
    throw new TypeError('CharacterViewRegistry snap 必须是布尔值。');
  }
  const holdValues = result.animationHoldParticipantIds === undefined
    ? Object.freeze([])
    : readDataArray(
      result.animationHoldParticipantIds,
      'CharacterViewRegistry animationHoldParticipantIds',
    );
  const holdIds = holdValues.map((item, index) => nonEmpty(
    item,
    `CharacterViewRegistry animationHoldParticipantIds[${index}]`,
  ));
  if (new Set(holdIds).size !== holdIds.length) {
    throw new RangeError('CharacterViewRegistry animationHoldParticipantIds 不能重复。');
  }
  return Object.freeze({
    ...(result.snap === undefined ? {} : { snap: result.snap }),
    ...(result.cameraModel === undefined ? {} : { cameraModel: result.cameraModel }),
    animationHoldParticipantIds: Object.freeze(holdIds),
    animationHoldConfigured: Object.hasOwn(result, 'animationHoldParticipantIds'),
  });
}

function participants(
  frame: unknown,
  registry: CharacterPresentationRegistryPort,
): readonly ParticipantEntry[] {
  const world = data(frame, 'world', 'CharacterViewRegistry frame');
  const values = data(world, 'participants', 'CharacterViewRegistry frame.world');
  const entries = readDataArray(values, 'CharacterViewRegistry frame participants', { nonEmpty: true });
  const ids = new Set<string>();
  return Object.freeze(entries.map((value, index) => {
    const name = `CharacterViewRegistry participants[${index}]`;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} 必须是对象。`);
    const id = nonEmpty(data(value, 'id', name), `${name}.id`);
    if (ids.has(id)) throw new RangeError(`CharacterViewRegistry participant ${id} 重复。`);
    ids.add(id);
    const appearance = data(value, 'appearance', name);
    const presentationId = nonEmpty(data(appearance, 'presentationId', `${name}.appearance`), `${name}.appearance.presentationId`);
    const definitionHash = nonEmpty(data(appearance, 'definitionHash', `${name}.appearance`), `${name}.appearance.definitionHash`);
    const definition = registry.require(presentationId);
    if (
      definition.characterDefinitionId !== data(value, 'characterDefinitionId', name)
      || definition.getContentHash() !== definitionHash
    ) throw new RangeError(`participant ${id} 的 presentation 引用不一致。`);
    return Object.freeze({ id, value, definition });
  }));
}

function aggregate(message: string, cause: unknown, cleanupCauses: readonly unknown[]): Error {
  const failure = new Error(message);
  failure.cause = cause;
  Object.defineProperty(failure, 'cleanupCauses', { value: Object.freeze([...cleanupCauses]) });
  return failure;
}

function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let then: unknown;
  try { then = Reflect.get(value, 'then'); } catch { throw new TypeError(`${name} 返回值不可检查。`); }
  if (typeof then !== 'function') return;
  try { Promise.resolve(value).catch(() => {}); } catch { /* malformed thenable */ }
  throw new TypeError(`${name} 必须同步完成。`);
}

export class CharacterViewRegistry {
  readonly #add: UnknownMethod;
  readonly #remove: UnknownMethod;
  readonly #presentationRegistry: CharacterPresentationRegistryPort;
  readonly #viewFactory: unknown;
  readonly #actionPresentations: unknown;
  readonly #runtimes = new Map<string, CharacterRecord>();
  #constructionDebt: CharacterViewRuntimeConstructionCleanupError | null = null;
  #disposed = false;
  #failedError: unknown = null;
  #operating = false;
  #cleaning = false;
  #reentryDetected = false;

  constructor(root: unknown, options: unknown) {
    this.#add = snapshotMethod(root, 'CharacterViewRegistry root', 'add');
    this.#remove = snapshotMethod(root, 'CharacterViewRegistry root', 'remove');
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new TypeError('CharacterViewRegistry options 必须是对象。');
    }
    const allowed = new Set<PropertyKey>(['presentationRegistry', 'viewFactory', 'actionPresentations']);
    if (Reflect.ownKeys(options).some((key) => !allowed.has(key))) {
      throw new TypeError('CharacterViewRegistry options 包含未知字段。');
    }
    this.#presentationRegistry = assertCharacterPresentationRegistry(data(options, 'presentationRegistry', 'CharacterViewRegistry options'));
    this.#viewFactory = data(options, 'viewFactory', 'CharacterViewRegistry options');
    snapshotMethod(this.#viewFactory, 'CharacterViewFactory', 'create');
    this.#actionPresentations = data(options, 'actionPresentations', 'CharacterViewRegistry options');
    if (!this.#actionPresentations || typeof this.#actionPresentations !== 'object') {
      throw new TypeError('CharacterViewRegistry 需要 action presentations。');
    }
  }

  #assertUsable(): void {
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('CharacterViewRegistry 不允许重入。');
    }
    if (this.#disposed) throw new Error('CharacterViewRegistry 已销毁。');
    if (this.#failedError) { const error = new Error('CharacterViewRegistry 已失败。'); error.cause = this.#failedError; throw error; }
  }

  #cleanupRecord(record: CharacterRecord): unknown[] {
    const errors: unknown[] = [];
    if (!record.rootDetached) {
      try {
        rejectThenable(this.#remove(record.root), 'CharacterViewRegistry root.remove()');
        if (this.#reentryDetected) throw new Error('CharacterViewRegistry remove回调发生公开API重入。');
        record.rootDetached = true;
      } catch (error) { errors.push(error); }
    }
    if (!this.#reentryDetected && record.rootDetached && !record.runtimeDisposed) {
      try {
        rejectThenable(record.runtime.dispose(), 'CharacterViewRegistry runtime.dispose()');
        if (this.#reentryDetected) throw new Error('CharacterViewRegistry dispose回调发生公开API重入。');
        record.runtimeDisposed = true;
      } catch (error) { errors.push(error); }
    }
    return errors;
  }

  #cleanupAll(): unknown[] {
    if (this.#cleaning) {
      this.#reentryDetected = true;
      return [new Error('CharacterViewRegistry 清理不可重入。')];
    }
    this.#cleaning = true;
    this.#reentryDetected = false;
    const errors: unknown[] = [];
    try {
      if (this.#constructionDebt !== null) {
        try { this.#constructionDebt.retryCleanup(); }
        catch (error) { errors.push(error); }
        if (this.#constructionDebt.cleanupComplete) this.#constructionDebt = null;
      }
      for (const [id, record] of this.#runtimes) {
        if (this.#reentryDetected) break;
        const errorCount = errors.length;
        errors.push(...this.#cleanupRecord(record));
        if (record.rootDetached && record.runtimeDisposed) this.#runtimes.delete(id);
        if (errors.length > errorCount) break;
      }
    } finally { this.#cleaning = false; }
    return errors;
  }

  #fail(error: unknown): never {
    this.#failedError = error;
    const cleanupErrors = this.#cleanupAll();
    if (cleanupErrors.length > 0) {
      throw aggregate('CharacterViewRegistry 失败关闭时清理未完整完成。', error, cleanupErrors);
    }
    throw error;
  }

  sync(frame: unknown, optionsValue: unknown = {}): void {
    this.#assertUsable();
    const options = syncOptions(optionsValue);
    const entries = participants(frame, this.#presentationRegistry);
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    const animationHoldParticipantIds = new Set(options.animationHoldParticipantIds);
    this.#operating = true;
    this.#reentryDetected = false;
    try {
      for (const [id, record] of this.#runtimes) {
        const entry = byId.get(id);
        if (entry && record.runtime.presentationId === entry.definition.id
          && record.runtime.presentationHash === entry.definition.getContentHash()) continue;
        const errors = this.#cleanupRecord(record);
        if (errors.length > 0) throw aggregate(`角色表现 ${id} 清理未完整完成。`, null, errors);
        this.#runtimes.delete(id);
      }
      for (const entry of entries) {
        let record = this.#runtimes.get(entry.id);
        if (!record) {
          const runtime = new CharacterViewRuntime({
            participantId: entry.id,
            presentationDefinition: entry.definition,
            actionPresentations: this.#actionPresentations,
            viewFactory: this.#viewFactory,
          });
          record = { runtime, root: runtime.root, rootDetached: false, runtimeDisposed: false };
          this.#runtimes.set(entry.id, record);
          rejectThenable(this.#add(record.root), 'CharacterViewRegistry root.add()');
        }
        record.runtime.sync(frame, entry.value, Object.freeze({
          snap: options.snap ?? false,
          ...(options.cameraModel === undefined ? {} : { cameraModel: options.cameraModel }),
          ...(options.animationHoldConfigured
            ? { freezeAnimation: animationHoldParticipantIds.has(entry.id) }
            : {}),
        }));
      }
    } catch (error) {
      if (error instanceof CharacterViewRuntimeConstructionCleanupError) {
        this.#constructionDebt = error;
      }
      this.#operating = false;
      this.#fail(error);
    }
    this.#operating = false;
  }

  clearAnimationHolds(): void {
    this.#assertUsable();
    this.#operating = true;
    this.#reentryDetected = false;
    try {
      for (const { runtime } of this.#runtimes.values()) runtime.setAnimationHold(false);
    } catch (error) {
      this.#operating = false;
      this.#fail(error);
    }
    this.#operating = false;
  }

  update(deltaSeconds: unknown): void {
    this.#assertUsable();
    this.#operating = true;
    this.#reentryDetected = false;
    try { for (const { runtime } of this.#runtimes.values()) runtime.update(deltaSeconds); }
    catch (error) { this.#operating = false; this.#fail(error); }
    this.#operating = false;
  }

  getParticipantVisualPosition(participantId: unknown): unknown {
    this.#assertUsable();
    const id = nonEmpty(participantId, 'CharacterViewRegistry participantId');
    return this.#runtimes.get(id)?.runtime.getVisualPosition() ?? null;
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    this.#assertUsable();
    return Object.freeze({
      characterCount: this.#runtimes.size,
      characters: Object.freeze([...this.#runtimes.values()].map(({ runtime }) => runtime.getDebugSnapshot())),
    });
  }

  dispose(): void {
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('CharacterViewRegistry 清理不可重入。');
    }
    if (!this.#disposed) this.#disposed = true;
    const errors = this.#cleanupAll();
    if (errors.length > 0) throw aggregate('CharacterViewRegistry 清理未完整完成。', this.#failedError, errors);
  }
}
