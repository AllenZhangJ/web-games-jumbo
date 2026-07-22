import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  AnimationSemanticResolver,
  createCharacterPresentationDefinition,
  resolveAnimationBinding,
  type CharacterPresentationDefinition,
} from '@number-strategy-jump/arena-presentation-contracts';
import { SixSectorDirectionResolver } from './six-sector-direction-resolver.js';

const OPTION_KEYS = new Set([
  'participantId', 'presentationDefinition', 'actionPresentations', 'viewFactory',
]);
const SYNC_OPTION_KEYS = new Set(['snap', 'cameraModel']);
const APPEARANCE_KEYS = new Set([
  'presentationId', 'definitionHash', 'modelAssetId', 'rigProfileId',
  'materialProfileId', 'outlineProfileId', 'direction',
]);

export const CHARACTER_VIEW_RUNTIME_STATE = Object.freeze({
  ACTIVE: 'active',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

type CharacterViewRuntimeState =
  typeof CHARACTER_VIEW_RUNTIME_STATE[keyof typeof CHARACTER_VIEW_RUNTIME_STATE];
type UnknownMethod = (...args: unknown[]) => unknown;

interface PositionPort { readonly x: number; readonly y: number; readonly z: number }
interface RootPort { readonly position: PositionPort }
interface CharacterViewPort {
  readonly root: RootPort;
  getAnimationCapabilities(): unknown;
  sync(participant: unknown, options: unknown): unknown;
  update(deltaSeconds: number): unknown;
  getDebugSnapshot(): unknown;
  dispose(): unknown;
}

function ownData(value: unknown, name: string, field: string): unknown {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是对象。`);
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${field} 必须是数据字段。`);
  }
  return descriptor.value;
}

function snapshotMethod(value: unknown, name: string, methodName: string): UnknownMethod {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
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

function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let then: unknown;
  try { then = Reflect.get(value, 'then'); } catch {
    throw new TypeError(`${name} 返回了不可检查的 thenable。`);
  }
  if (typeof then !== 'function') return;
  try { Promise.resolve(value).catch(() => {}); } catch { /* malformed thenable is invalid */ }
  throw new TypeError(`${name} 必须同步完成。`);
}

function normalizePosition(value: unknown, name: string): PositionPort {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是对象。`);
  for (const axis of ['x', 'y', 'z'] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(value, axis);
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !Number.isFinite(descriptor.value)) {
      throw new TypeError(`${name}.${axis} 必须是有限数数据字段。`);
    }
  }
  return value as PositionPort;
}

function normalizeView(value: unknown): CharacterViewPort {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('CharacterViewFactory 必须返回 view 对象。');
  }
  const rootValue = ownData(value, 'Character view', 'root');
  if (!rootValue || typeof rootValue !== 'object') {
    throw new TypeError('Character view.root 必须是对象。');
  }
  normalizePosition(ownData(rootValue, 'Character view.root', 'position'), 'Character view.root.position');
  const getAnimationCapabilities = snapshotMethod(value, 'Character view', 'getAnimationCapabilities');
  const sync = snapshotMethod(value, 'Character view', 'sync');
  const update = snapshotMethod(value, 'Character view', 'update');
  const getDebugSnapshot = snapshotMethod(value, 'Character view', 'getDebugSnapshot');
  const dispose = snapshotMethod(value, 'Character view', 'dispose');
  return Object.freeze({
    root: rootValue as RootPort,
    getAnimationCapabilities: () => {
      const result = getAnimationCapabilities();
      rejectThenable(result, 'Character view.getAnimationCapabilities()');
      return result;
    },
    sync: (participant: unknown, options: unknown) => {
      const result = sync(participant, options);
      rejectThenable(result, 'Character view.sync()');
      return result;
    },
    update: (deltaSeconds: number) => {
      const result = update(deltaSeconds);
      rejectThenable(result, 'Character view.update()');
      return result;
    },
    getDebugSnapshot: () => {
      const result = getDebugSnapshot();
      rejectThenable(result, 'Character view.getDebugSnapshot()');
      return cloneFrozenData(result, 'Character view debug snapshot');
    },
    dispose: () => {
      const result = dispose();
      rejectThenable(result, 'Character view.dispose()');
      return result;
    },
  });
}

function cleanupFailure(message: string, cause: unknown, cleanupCauses: readonly unknown[]): Error {
  const failure = new Error(message);
  failure.cause = cause;
  Object.defineProperty(failure, 'cleanupCauses', {
    value: Object.freeze([...cleanupCauses]),
  });
  return failure;
}

export class CharacterViewRuntime {
  readonly #participantId: string;
  readonly #definition: CharacterPresentationDefinition;
  readonly #definitionHash: string;
  readonly #resolver: AnimationSemanticResolver;
  readonly #directionResolver: SixSectorDirectionResolver;
  readonly #view: CharacterViewPort;
  readonly #capabilities: unknown;
  #resolverDestroyed = false;
  #directionResolverDestroyed = false;
  #viewDisposed = false;
  #state: CharacterViewRuntimeState = CHARACTER_VIEW_RUNTIME_STATE.ACTIVE;
  #lastError: unknown = null;
  #operating = false;
  #cleaning = false;

  constructor(options: unknown) {
    assertKnownKeys(options, OPTION_KEYS, 'CharacterViewRuntime options');
    const participantId = assertNonEmptyString(options.participantId, 'CharacterViewRuntime.participantId');
    const definition = createCharacterPresentationDefinition(options.presentationDefinition);
    const create = snapshotMethod(options.viewFactory, 'CharacterViewFactory', 'create');
    const resolver = new AnimationSemanticResolver({
      participantId,
      presentationDefinition: definition,
      actionPresentations: options.actionPresentations,
    });
    const directionResolver = new SixSectorDirectionResolver(definition.direction);
    let candidate: unknown = null;
    let view: CharacterViewPort | null = null;
    try {
      candidate = create(Object.freeze({ participantId, presentationDefinition: definition }));
      rejectThenable(candidate, 'CharacterViewFactory.create()');
      view = normalizeView(candidate);
      const capabilities = view.getAnimationCapabilities();
      resolveAnimationBinding(definition, 'idle', capabilities);
      this.#participantId = participantId;
      this.#definition = definition;
      this.#definitionHash = definition.getContentHash();
      this.#resolver = resolver;
      this.#directionResolver = directionResolver;
      this.#view = view;
      this.#capabilities = capabilities;
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      try { resolver.destroy(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      try { directionResolver.destroy(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      if (view) {
        try { view.dispose(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      } else if (candidate && typeof candidate === 'object') {
        try {
          const dispose = snapshotMethod(candidate, 'Character view', 'dispose');
          rejectThenable(dispose(), 'Character view.dispose()');
        } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      }
      if (cleanupErrors.length > 0) {
        throw cleanupFailure('Character view 创建失败且清理未完整完成。', error, cleanupErrors);
      }
      throw error;
    }
  }

  get root(): RootPort { this.#assertUsable(); return this.#view.root; }
  get participantId(): string { return this.#participantId; }
  get presentationId(): string { return this.#definition.id; }
  get presentationHash(): string { return this.#definitionHash; }

  #assertUsable(): void {
    if (this.#state === CHARACTER_VIEW_RUNTIME_STATE.DESTROYED) {
      throw new Error('CharacterViewRuntime 已销毁。');
    }
    if (this.#state === CHARACTER_VIEW_RUNTIME_STATE.FAILED) {
      const error = new Error('CharacterViewRuntime 已失败。');
      error.cause = this.#lastError;
      throw error;
    }
    if (this.#operating) throw new Error('CharacterViewRuntime 不允许回调重入。');
  }

  #cleanup(): unknown[] {
    if (this.#cleaning) return [new Error('CharacterViewRuntime 清理不可重入。')];
    this.#cleaning = true;
    const errors: unknown[] = [];
    try {
      if (!this.#resolverDestroyed) {
        try { this.#resolver.destroy(); this.#resolverDestroyed = true; } catch (error) { errors.push(error); }
      }
      if (!this.#directionResolverDestroyed) {
        try {
          this.#directionResolver.destroy();
          this.#directionResolverDestroyed = true;
        } catch (error) { errors.push(error); }
      }
      if (!this.#viewDisposed) {
        try { this.#view.dispose(); this.#viewDisposed = true; } catch (error) { errors.push(error); }
      }
    } finally {
      this.#cleaning = false;
    }
    return errors;
  }

  #fail(error: unknown): never {
    this.#state = CHARACTER_VIEW_RUNTIME_STATE.FAILED;
    this.#lastError = error;
    const cleanupErrors = this.#cleanup();
    if (cleanupErrors.length > 0) {
      throw cleanupFailure('CharacterViewRuntime 失败关闭时清理未完整完成。', error, cleanupErrors);
    }
    throw error;
  }

  sync(frame: unknown, participantValue: unknown, syncOptions: unknown = {}): unknown {
    this.#assertUsable();
    assertKnownKeys(syncOptions, SYNC_OPTION_KEYS, 'CharacterViewRuntime.sync options');
    if (syncOptions.snap !== undefined && typeof syncOptions.snap !== 'boolean') {
      throw new TypeError('CharacterViewRuntime.sync snap 必须是布尔值。');
    }
    const participant = assertPlainRecord(participantValue, 'CharacterViewRuntime participant');
    if (participant.id !== this.#participantId) {
      throw new RangeError('CharacterViewRuntime participant 身份不一致。');
    }
    assertKnownKeys(participant.appearance, APPEARANCE_KEYS, 'CharacterViewRuntime participant.appearance');
    if (
      participant.appearance.presentationId !== this.#definition.id
      || participant.appearance.definitionHash !== this.#definitionHash
    ) throw new RangeError('CharacterViewRuntime presentation Definition 不一致。');
    this.#operating = true;
    try {
      const semantics = this.#resolver.resolve(frame, participant);
      const cameraModel = assertPlainRecord(syncOptions.cameraModel, 'CharacterViewRuntime cameraModel');
      const direction = this.#directionResolver.resolve({
        facing: participant.facing,
        cameraBasis: cameraModel.inputBasis,
        reset: syncOptions.snap ?? false,
      });
      const baseBinding = resolveAnimationBinding(
        this.#definition,
        semantics.baseSemantic,
        this.#capabilities,
      );
      const overlayBinding = semantics.overlaySemantic === null
        ? null
        : resolveAnimationBinding(
          this.#definition,
          semantics.overlaySemantic,
          this.#capabilities,
        );
      this.#view.sync(participant, Object.freeze({
        snap: syncOptions.snap ?? false,
        animation: Object.freeze({ semantics, baseBinding, overlayBinding }),
        direction,
        frame,
      }));
      return semantics;
    } catch (error) {
      return this.#fail(error);
    } finally {
      this.#operating = false;
    }
  }

  update(deltaSeconds: unknown): void {
    this.#assertUsable();
    if (!Number.isFinite(deltaSeconds) || (deltaSeconds as number) < 0) {
      throw new RangeError('CharacterViewRuntime.update deltaSeconds 必须是有限非负数。');
    }
    this.#operating = true;
    try { this.#view.update(deltaSeconds as number); } catch (error) { this.#fail(error); }
    finally { this.#operating = false; }
  }

  getVisualPosition(): Readonly<PositionPort> {
    this.#assertUsable();
    const position = normalizePosition(this.#view.root.position, 'Character view.root.position');
    return Object.freeze({ x: position.x, y: position.y, z: position.z });
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    this.#assertUsable();
    return Object.freeze({
      participantId: this.#participantId,
      presentationId: this.#definition.id,
      presentationHash: this.#definitionHash,
      state: this.#state,
      view: this.#view.getDebugSnapshot(),
    });
  }

  dispose(): void {
    if (
      this.#state === CHARACTER_VIEW_RUNTIME_STATE.DESTROYED
      && this.#resolverDestroyed
      && this.#directionResolverDestroyed
      && this.#viewDisposed
    ) return;
    if (this.#operating) throw new Error('CharacterViewRuntime 操作期间不能销毁。');
    if (this.#cleaning) throw new Error('CharacterViewRuntime 清理不可重入。');
    this.#state = CHARACTER_VIEW_RUNTIME_STATE.DESTROYED;
    const errors = this.#cleanup();
    if (errors.length > 0) {
      throw cleanupFailure('CharacterViewRuntime 清理未完整完成。', this.#lastError, errors);
    }
  }
}
