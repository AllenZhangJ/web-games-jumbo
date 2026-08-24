import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  assertSynchronousReturn as rejectThenable,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  AnimationSemanticResolver,
  createCharacterPresentationDefinition,
  resolveAnimationBinding,
  type CharacterPresentationDefinition,
} from '@number-strategy-jump/arena-presentation-contracts';
import { snapshotLegacyMethod as snapshotMethod } from './capability-utils.js';
import { SixSectorDirectionResolver } from './six-sector-direction-resolver.js';

const OPTION_KEYS = new Set([
  'participantId', 'presentationDefinition', 'actionPresentations', 'viewFactory',
]);
const SYNC_OPTION_KEYS = new Set(['snap', 'cameraModel', 'freezeAnimation']);
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
interface PositionPort { readonly x: number; readonly y: number; readonly z: number }
interface RootPort { readonly position: PositionPort }
interface CharacterViewPort {
  readonly root: RootPort;
  getAnimationCapabilities(): unknown;
  sync(participant: unknown, options: unknown): unknown;
  update(deltaSeconds: number): unknown;
  setAnimationHold: ((value: boolean) => unknown) | null;
  getDebugSnapshot(): unknown;
  dispose(): unknown;
}

interface CharacterViewRuntimeConstructionResources {
  resolver: AnimationSemanticResolver | null;
  resolverDestroyed: boolean;
  directionResolver: SixSectorDirectionResolver | null;
  directionResolverDestroyed: boolean;
  candidate: unknown;
  candidateDispose: (() => unknown) | null;
  candidateDisposeCaptured: boolean;
  candidateDisposed: boolean;
  view: CharacterViewPort | null;
  viewDisposed: boolean;
}

export const CHARACTER_VIEW_RUNTIME_CONSTRUCTION_LIFECYCLE_V1 = Object.freeze({
  id: 'character-view-runtime-construction-lifecycle-v1',
  factoryCandidateRetainsCleanupOwnerBeforeNormalization: true,
  resolverCleanupUsesIndependentWatermarks: true,
  registryCanRetryConstructionDebt: true,
});
export const CHARACTER_VIEW_RUNTIME_TERMINAL_LIFECYCLE_V1 = Object.freeze({
  id: 'character-view-runtime-terminal-lifecycle-v1',
  cleanupCallbacksCannotReenterPublicApi: true,
  cleanupCallbacksMustCompleteSynchronously: true,
  childFailureStopsLaterCleanup: true,
});

function ownData(value: unknown, name: string, field: string, required = true): unknown {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是对象。`);
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
    if (!descriptor && !required) return undefined;
    throw new TypeError(`${name}.${field} 必须是数据字段。`);
  }
  return descriptor.value;
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
  const setAnimationHold = snapshotMethod(value, 'Character view', 'setAnimationHold', false);
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
    setAnimationHold: setAnimationHold === null
      ? null
      : (animationHeld: boolean) => {
        const result = setAnimationHold(animationHeld);
        rejectThenable(result, 'Character view.setAnimationHold()');
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

function characterViewRuntimeConstructionCleanupComplete(
  resources: CharacterViewRuntimeConstructionResources,
): boolean {
  const viewComplete = resources.view !== null
    ? resources.viewDisposed
    : resources.candidate === null
      || typeof resources.candidate !== 'object'
      || resources.candidateDisposed;
  const resolverComplete = resources.resolver === null || resources.resolverDestroyed;
  const directionResolverComplete = resources.directionResolver === null
    || resources.directionResolverDestroyed;
  return resolverComplete && directionResolverComplete && viewComplete;
}

function cleanupCharacterViewRuntimeConstruction(
  resources: CharacterViewRuntimeConstructionResources,
): void {
  const errors: unknown[] = [];
  if (resources.resolver !== null && !resources.resolverDestroyed) {
    try {
      rejectThenable(resources.resolver.destroy(), 'AnimationSemanticResolver.destroy()');
      resources.resolverDestroyed = true;
    } catch (error) { errors.push(error); }
  }
  if (resources.directionResolver !== null && !resources.directionResolverDestroyed) {
    try {
      rejectThenable(resources.directionResolver.destroy(), 'SixSectorDirectionResolver.destroy()');
      resources.directionResolverDestroyed = true;
    } catch (error) { errors.push(error); }
  }
  if (resources.view !== null && !resources.viewDisposed) {
    try {
      rejectThenable(resources.view.dispose(), 'Character view.dispose()');
      resources.viewDisposed = true;
      resources.candidateDisposed = true;
    } catch (error) { errors.push(error); }
  } else if (
    resources.view === null
    && resources.candidate !== null
    && typeof resources.candidate === 'object'
    && !resources.candidateDisposed
  ) {
    try {
      if (!resources.candidateDisposeCaptured) {
        const dispose = snapshotMethod(resources.candidate, 'Character view candidate', 'dispose');
        resources.candidateDispose = () => dispose();
        resources.candidateDisposeCaptured = true;
      }
      if (resources.candidateDispose === null) {
        throw new Error('Character view candidate清理端口尚未捕获。');
      }
      rejectThenable(resources.candidateDispose(), 'Character view candidate.dispose()');
      resources.candidateDisposed = true;
    } catch (error) { errors.push(error); }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, 'CharacterViewRuntime 构造资源清理未完整完成。');
  }
  if (!characterViewRuntimeConstructionCleanupComplete(resources)) {
    throw new Error('CharacterViewRuntime 构造资源清理依赖尚未收敛。');
  }
}

export class CharacterViewRuntimeConstructionCleanupError extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: CharacterViewRuntimeConstructionResources;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: CharacterViewRuntimeConstructionResources,
  ) {
    super([originalError, cleanupError], 'CharacterViewRuntime 构造失败且清理未完整完成。');
    this.name = 'CharacterViewRuntimeConstructionCleanupError';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean {
    return characterViewRuntimeConstructionCleanupComplete(this.#resources);
  }

  retryCleanup(): void {
    cleanupCharacterViewRuntimeConstruction(this.#resources);
  }
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
  #freezeAnimation = false;
  #operating = false;
  #cleaning = false;
  #reentryDetected = false;

  constructor(options: unknown) {
    assertKnownKeys(options, OPTION_KEYS, 'CharacterViewRuntime options');
    const participantId = assertNonEmptyString(options.participantId, 'CharacterViewRuntime.participantId');
    const definition = createCharacterPresentationDefinition(options.presentationDefinition);
    const create = snapshotMethod(options.viewFactory, 'CharacterViewFactory', 'create');
    const construction: CharacterViewRuntimeConstructionResources = {
      resolver: null,
      resolverDestroyed: false,
      directionResolver: null,
      directionResolverDestroyed: false,
      candidate: null,
      candidateDispose: null,
      candidateDisposeCaptured: false,
      candidateDisposed: false,
      view: null,
      viewDisposed: false,
    };
    try {
      const resolver = new AnimationSemanticResolver({
        participantId,
        presentationDefinition: definition,
        actionPresentations: options.actionPresentations,
      });
      construction.resolver = resolver;
      const directionResolver = new SixSectorDirectionResolver(definition.direction);
      construction.directionResolver = directionResolver;
      const candidate = create(Object.freeze({ participantId, presentationDefinition: definition }));
      construction.candidate = candidate;
      rejectThenable(candidate, 'CharacterViewFactory.create()');
      if (candidate !== null && typeof candidate === 'object') {
        const dispose = snapshotMethod(candidate, 'Character view candidate', 'dispose');
        construction.candidateDispose = () => dispose();
        construction.candidateDisposeCaptured = true;
      }
      const view = normalizeView(candidate);
      construction.view = view;
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
      try {
        cleanupCharacterViewRuntimeConstruction(construction);
      } catch (cleanupError) {
        throw new CharacterViewRuntimeConstructionCleanupError(error, cleanupError, construction);
      }
      throw error;
    }
  }

  get root(): RootPort { this.#assertUsable(); return this.#view.root; }
  get participantId(): string { return this.#participantId; }
  get presentationId(): string { return this.#definition.id; }
  get presentationHash(): string { return this.#definitionHash; }

  #assertUsable(): void {
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('CharacterViewRuntime 不允许回调重入。');
    }
    if (this.#state === CHARACTER_VIEW_RUNTIME_STATE.DESTROYED) {
      throw new Error('CharacterViewRuntime 已销毁。');
    }
    if (this.#state === CHARACTER_VIEW_RUNTIME_STATE.FAILED) {
      const error = new Error('CharacterViewRuntime 已失败。');
      error.cause = this.#lastError;
      throw error;
    }
  }

  #cleanup(): unknown[] {
    if (this.#cleaning) {
      this.#reentryDetected = true;
      return [new Error('CharacterViewRuntime 清理不可重入。')];
    }
    this.#cleaning = true;
    this.#reentryDetected = false;
    const errors: unknown[] = [];
    try {
      if (!this.#resolverDestroyed) {
        try {
          rejectThenable(this.#resolver.destroy(), 'AnimationSemanticResolver.destroy()');
          if (this.#reentryDetected) {
            throw new Error('AnimationSemanticResolver.destroy() 回调发生Runtime反调。');
          }
          this.#resolverDestroyed = true;
        } catch (error) { errors.push(error); }
      }
      if (errors.length === 0 && !this.#reentryDetected && !this.#directionResolverDestroyed) {
        try {
          rejectThenable(this.#directionResolver.destroy(), 'SixSectorDirectionResolver.destroy()');
          if (this.#reentryDetected) {
            throw new Error('SixSectorDirectionResolver.destroy() 回调发生Runtime反调。');
          }
          this.#directionResolverDestroyed = true;
        } catch (error) { errors.push(error); }
      }
      if (errors.length === 0 && !this.#reentryDetected && !this.#viewDisposed) {
        try {
          rejectThenable(this.#view.dispose(), 'Character view.dispose()');
          if (this.#reentryDetected) {
            throw new Error('Character view.dispose() 回调发生Runtime反调。');
          }
          this.#viewDisposed = true;
        } catch (error) { errors.push(error); }
      }
    } finally {
      this.#cleaning = false;
    }
    return errors;
  }

  #fail(error: unknown): never {
    this.#state = CHARACTER_VIEW_RUNTIME_STATE.FAILED;
    this.#lastError = error;
    this.#freezeAnimation = false;
    const cleanupErrors = this.#cleanup();
    if (cleanupErrors.length > 0) {
      throw cleanupFailure('CharacterViewRuntime 失败关闭时清理未完整完成。', error, cleanupErrors);
    }
    throw error;
  }

  sync(frame: unknown, participantValue: unknown, syncOptions: unknown = {}): unknown {
    this.#assertUsable();
    assertKnownKeys(syncOptions, SYNC_OPTION_KEYS, 'CharacterViewRuntime.sync options');
    const snapValue = ownData(syncOptions, 'CharacterViewRuntime.sync options', 'snap');
    const cameraModelValue = ownData(
      syncOptions,
      'CharacterViewRuntime.sync options',
      'cameraModel',
    );
    const freezeAnimationValue = ownData(
      syncOptions,
      'CharacterViewRuntime.sync options',
      'freezeAnimation',
      false,
    ) ?? false;
    const freezeAnimationConfigured = Object.hasOwn(syncOptions, 'freezeAnimation');
    if (typeof snapValue !== 'boolean') {
      throw new TypeError('CharacterViewRuntime.sync snap 必须是布尔值。');
    }
    if (typeof freezeAnimationValue !== 'boolean') {
      throw new TypeError('CharacterViewRuntime.sync freezeAnimation 必须是布尔值。');
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
      const cameraModel = assertPlainRecord(cameraModelValue, 'CharacterViewRuntime cameraModel');
      const direction = this.#directionResolver.resolve({
        facing: participant.facing,
        cameraBasis: cameraModel.inputBasis,
        reset: snapValue,
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
        snap: snapValue,
        ...((freezeAnimationConfigured || this.#freezeAnimation)
          ? { freezeAnimation: freezeAnimationValue }
          : {}),
        animation: Object.freeze({ semantics, baseBinding, overlayBinding }),
        direction,
        frame,
      }));
      this.#freezeAnimation = freezeAnimationValue;
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

  setAnimationHold(value: unknown): void {
    this.#assertUsable();
    if (typeof value !== 'boolean') {
      throw new TypeError('CharacterViewRuntime animation hold 必须是布尔值。');
    }
    if (value && this.#view.setAnimationHold === null) {
      throw new Error('CharacterViewRuntime 当前View不支持独立动画冻结。');
    }
    this.#operating = true;
    try {
      if (this.#view.setAnimationHold !== null) this.#view.setAnimationHold(value);
      this.#freezeAnimation = value;
    } catch (error) {
      this.#fail(error);
    } finally {
      this.#operating = false;
    }
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
      freezeAnimation: this.#freezeAnimation,
      view: this.#view.getDebugSnapshot(),
    });
  }

  dispose(): void {
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('CharacterViewRuntime 清理不可重入。');
    }
    if (
      this.#state === CHARACTER_VIEW_RUNTIME_STATE.DESTROYED
      && this.#resolverDestroyed
      && this.#directionResolverDestroyed
      && this.#viewDisposed
    ) return;
    this.#state = CHARACTER_VIEW_RUNTIME_STATE.DESTROYED;
    this.#freezeAnimation = false;
    const errors = this.#cleanup();
    if (errors.length > 0) {
      throw cleanupFailure('CharacterViewRuntime 清理未完整完成。', this.#lastError, errors);
    }
  }
}
