import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { PresentationAssetDefinition } from '@number-strategy-jump/arena-presentation-contracts';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '@number-strategy-jump/arena-presentation-runtime';
import { ThreeObjectDisposalLease } from './dispose-three-resources.js';
import { PlatformTextureLoader } from './platform-texture-loader.js';
import { readDataArray } from './strict-data-array.js';

type UnknownMethod = (...args: unknown[]) => unknown;

interface LoadExternalInvocation<T> {
  readonly value: T;
  readonly reentryFailure: Error | null;
}

const GLTF_PROVIDERS = new Set<string>([
  ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_ATTACHMENT_V1,
  ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
  ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_MAP_V1,
]);

function ownData(value: unknown, key: PropertyKey, name: string, required = true): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (!required) return undefined;
    throw new TypeError(`${name} 必须是对象。`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${String(key)} 缺失。`);
  }
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}.${String(key)} 必须是数据字段。`);
  return descriptor.value;
}

function snapshotUnboundMethod(value: unknown, key: string, name: string): UnknownMethod {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} 必须是对象。`);
  let owner: object | null = value;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, key);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key} 必须是数据方法。`);
      }
      return descriptor.value as UnknownMethod;
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  throw new TypeError(`${name} 缺少 ${key}()。`);
}

function snapshotMethod(value: unknown, key: string, name: string): UnknownMethod {
  const method = snapshotUnboundMethod(value, key, name);
  return (...args: unknown[]) => method.call(value, ...args);
}

function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let then: unknown;
  try { then = Reflect.get(value, 'then'); } catch { throw new TypeError(`${name} 返回值不可检查。`); }
  if (typeof then !== 'function') return;
  try { Promise.resolve(value).catch(() => {}); } catch { /* malformed thenable */ }
  throw new TypeError(`${name} 必须同步完成。`);
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} 必须是非空字符串。`);
  return value;
}

function normalizeDefinition(value: unknown): Readonly<Pick<PresentationAssetDefinition, 'id' | 'sourceKey' | 'providerId'>> {
  const definition = Object.freeze({
    id: nonEmptyString(ownData(value, 'id', 'asset Definition'), 'asset Definition.id'),
    sourceKey: nonEmptyString(ownData(value, 'sourceKey', 'asset Definition'), 'asset Definition.sourceKey'),
    providerId: nonEmptyString(ownData(value, 'providerId', 'asset Definition'), 'asset Definition.providerId'),
  });
  if (!GLTF_PROVIDERS.has(definition.providerId)) {
    throw new RangeError('GltfPresentationAssetLoader 收到不支持的 asset Definition。');
  }
  return definition;
}

function cleanupFailure(message: string, cause: unknown, cleanupCause: unknown): Error {
  const failure = new Error(message);
  failure.cause = cause;
  Object.defineProperty(failure, 'cleanupCause', { value: cleanupCause });
  return failure;
}

function handledRejectedPromise<T>(reason: unknown): Promise<T> {
  const rejected = Promise.reject<T>(reason);
  rejected.catch(() => {});
  return rejected;
}

async function settleExternalInvocation<T>(
  invocation: Readonly<LoadExternalInvocation<T>>,
  name: string,
): Promise<Awaited<T>> {
  try {
    return await invocation.value;
  } catch (error) {
    if (invocation.reentryFailure !== null) {
      throw new AggregateError(
        [error, invocation.reentryFailure],
        `${name}异步失败且同步调用阶段发生load重入。`,
      );
    }
    throw error;
  }
}

export interface GltfPresentationAssetValue {
  readonly assetId: string;
  readonly scene: THREE.Object3D;
  readonly animations: readonly THREE.AnimationClip[];
  readonly sourceKey: string;
}

export interface GltfPresentationAssetLease {
  readonly assetId: string;
  readonly value: Readonly<GltfPresentationAssetValue>;
  readonly release: () => void;
}

export type GltfPresentationAssetLoaderState =
  'active' | 'destroy-requested' | 'destroy-incomplete' | 'destroyed';

export interface GltfPresentationAssetLoaderSnapshot {
  readonly state: GltfPresentationAssetLoaderState;
  readonly pendingLoadCount: number;
  readonly retainedCandidateDisposalCount: number;
  readonly textureHandlerRegistered: boolean;
  readonly platformTextureLoaderPendingRequestCount: number;
  readonly platformTextureLoaderCleanupComplete: boolean;
  readonly cleanupComplete: boolean;
}

export class GltfPresentationAssetLoader {
  readonly #loadAsync: UnknownMethod;
  readonly #parseAsync: UnknownMethod;
  readonly #readAssetBytes: ((sourceKey: string, signal: AbortSignal) => unknown) | null;
  readonly #pendingLoads = new Set<number>();
  readonly #pendingReadAbortControllers = new Map<number, AbortController>();
  readonly #retainedCandidateScenes = new Map<number, THREE.Object3D>();
  readonly #retainedCandidateDisposals = new Map<number, ThreeObjectDisposalLease>();
  #nextLoadSequence = 1;
  #state: GltfPresentationAssetLoaderState = 'active';
  #terminalCleanupInProgress = false;
  #terminalCleanupDestroyReentryCount = 0;
  #externalCallbackDepth = 0;
  #loadReentryAttemptCount = 0;
  #platformTextureLoader: PlatformTextureLoader | null = null;
  #textureHandlerRegistration: Readonly<{
    readonly pattern: RegExp;
    readonly addHandler: UnknownMethod;
    readonly removeHandler: UnknownMethod;
  }> | null = null;
  #textureHandlerCleanup: Readonly<{
    readonly pattern: RegExp;
    readonly removeHandler: UnknownMethod;
  }> | null = null;

  constructor(options: unknown = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new TypeError('GltfPresentationAssetLoader options 必须是对象。');
    }
    const allowed = new Set<PropertyKey>(['loader', 'readAssetBytes', 'createImage']);
    if (Reflect.ownKeys(options).some((key) => !allowed.has(key))) {
      throw new TypeError('GltfPresentationAssetLoader options 包含未知字段。');
    }
    const injectedLoader = ownData(
      options,
      'loader',
      'GltfPresentationAssetLoader options',
      false,
    ) ?? null;
    const readAssetBytes = ownData(options, 'readAssetBytes', 'GltfPresentationAssetLoader options', false) ?? null;
    if (readAssetBytes !== null && typeof readAssetBytes !== 'function') {
      throw new TypeError('GltfPresentationAssetLoader.readAssetBytes 必须是函数或 null。');
    }
    this.#readAssetBytes = readAssetBytes as (
      (sourceKey: string, signal: AbortSignal) => unknown
    ) | null;
    const createImage = ownData(options, 'createImage', 'GltfPresentationAssetLoader options', false) ?? null;
    if (createImage !== null && typeof createImage !== 'function') {
      throw new TypeError('GltfPresentationAssetLoader.createImage 必须是函数或 null。');
    }
    const usesDefaultLoader = injectedLoader === null;
    const defaultLoadAsync = usesDefaultLoader
      ? snapshotUnboundMethod(GLTFLoader.prototype, 'loadAsync', 'GLTFLoader.prototype')
      : null;
    const defaultParseAsync = usesDefaultLoader
      ? snapshotUnboundMethod(GLTFLoader.prototype, 'parseAsync', 'GLTFLoader.prototype')
      : null;
    const defaultAddHandler = usesDefaultLoader && createImage !== null
      ? snapshotUnboundMethod(THREE.LoadingManager.prototype, 'addHandler', 'LoadingManager.prototype')
      : null;
    const defaultRemoveHandler = usesDefaultLoader && createImage !== null
      ? snapshotUnboundMethod(THREE.LoadingManager.prototype, 'removeHandler', 'LoadingManager.prototype')
      : null;
    const loader = usesDefaultLoader ? new GLTFLoader() : injectedLoader;
    this.#loadAsync = usesDefaultLoader
      ? (...args) => (defaultLoadAsync as UnknownMethod).call(loader, ...args)
      : snapshotMethod(loader, 'loadAsync', 'GltfPresentationAssetLoader.loader');
    this.#parseAsync = usesDefaultLoader
      ? (...args) => (defaultParseAsync as UnknownMethod).call(loader, ...args)
      : snapshotMethod(loader, 'parseAsync', 'GltfPresentationAssetLoader.loader');
    if (createImage !== null) {
      const manager = ownData(loader, 'manager', 'GltfPresentationAssetLoader.loader');
      const addHandler = usesDefaultLoader
        ? (...args: unknown[]) => (defaultAddHandler as UnknownMethod).call(manager, ...args)
        : snapshotMethod(manager, 'addHandler', 'GltfPresentationAssetLoader.loader.manager');
      const removeHandler = usesDefaultLoader
        ? (...args: unknown[]) => (defaultRemoveHandler as UnknownMethod).call(manager, ...args)
        : snapshotMethod(manager, 'removeHandler', 'GltfPresentationAssetLoader.loader.manager');
      const pattern = /\.(?:png|jpe?g)(?:[?#].*)?$/i;
      this.#platformTextureLoader = new PlatformTextureLoader({ createImage, manager });
      this.#textureHandlerRegistration = Object.freeze({ pattern, addHandler, removeHandler });
    }
  }

  #advanceLoadReentryAttempt(): void {
    this.#loadReentryAttemptCount = this.#loadReentryAttemptCount === Number.MAX_SAFE_INTEGER
      ? 0
      : this.#loadReentryAttemptCount + 1;
  }

  #invokeLoadExternal<T>(name: string, invoke: () => T): Readonly<LoadExternalInvocation<T>> {
    const reentryWaterline = this.#loadReentryAttemptCount;
    this.#externalCallbackDepth += 1;
    let failed = false;
    let failure: unknown = undefined;
    let value: T | undefined;
    try {
      value = invoke();
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      this.#externalCallbackDepth -= 1;
    }
    const reentryFailure = this.#loadReentryAttemptCount === reentryWaterline
      ? null
      : new Error(`${name}期间发生公开load同步重入。`);
    if (failed) {
      if (reentryFailure !== null) {
        throw new AggregateError([failure, reentryFailure], `${name}失败且发生load重入。`);
      }
      throw failure;
    }
    return Object.freeze({ value: value as T, reentryFailure });
  }

  #assertLoadAllowed(): void {
    if (this.#externalCallbackDepth > 0) {
      this.#advanceLoadReentryAttempt();
      throw new Error('GltfPresentationAssetLoader外部回调期间拒绝公开load同步重入。');
    }
    if (this.#state !== 'active') {
      throw new Error(`GltfPresentationAssetLoader状态${this.#state}拒绝新load。`);
    }
  }

  #beginLoad(): number {
    this.#assertLoadAllowed();
    const sequence = this.#nextLoadSequence;
    if (!Number.isSafeInteger(sequence)) {
      throw new RangeError('GltfPresentationAssetLoader load sequence溢出。');
    }
    this.#nextLoadSequence += 1;
    this.#pendingLoads.add(sequence);
    return sequence;
  }

  #assertLoadMayPublish(sequence: number): void {
    if (!this.#pendingLoads.has(sequence)) {
      throw new Error('GltfPresentationAssetLoader load所有权已丢失。');
    }
    if (this.#state !== 'active') {
      throw new Error('GltfPresentationAssetLoader销毁期间拒绝发布迟到资产。');
    }
  }

  #ensureTextureHandlerRegistered(): void {
    const registration = this.#textureHandlerRegistration;
    if (registration === null) return;
    const platformTextureLoader = this.#platformTextureLoader;
    if (platformTextureLoader === null) {
      throw new Error('GltfPresentationAssetLoader缺少待注册的平台纹理Loader。');
    }
    this.#textureHandlerRegistration = null;
    this.#textureHandlerCleanup = Object.freeze({
      pattern: registration.pattern,
      removeHandler: registration.removeHandler,
    });
    try {
      const invocation = this.#invokeLoadExternal(
        'LoadingManager.addHandler()',
        () => rejectThenable(
          registration.addHandler(registration.pattern, platformTextureLoader),
          'LoadingManager.addHandler()',
        ),
      );
      if (invocation.reentryFailure !== null) throw invocation.reentryFailure;
    } catch (error) {
      if (this.#state === 'active') this.#state = 'destroy-incomplete';
      throw error;
    }
  }

  #abortPendingAssetReads(): void {
    for (const [sequence, controller] of this.#pendingReadAbortControllers) {
      if (controller.signal.aborted) continue;
      const invocation = this.#invokeLoadExternal(
        `GltfPresentationAssetLoader asset read ${sequence} abort()`,
        () => controller.abort(),
      );
      if (invocation.reentryFailure !== null) throw invocation.reentryFailure;
      if (!controller.signal.aborted) {
        throw new Error(
          `GltfPresentationAssetLoader asset read ${sequence}取消未提交。`,
        );
      }
    }
  }

  #continueDestroy(): void {
    if (this.#state === 'active' || this.#state === 'destroyed') return;
    if (this.#terminalCleanupInProgress) {
      this.#terminalCleanupDestroyReentryCount =
        this.#terminalCleanupDestroyReentryCount === Number.MAX_SAFE_INTEGER
          ? 0
          : this.#terminalCleanupDestroyReentryCount + 1;
      return;
    }
    this.#terminalCleanupInProgress = true;
    try {
      try {
        this.#abortPendingAssetReads();
      } catch (error) {
        this.#state = 'destroy-incomplete';
        throw error;
      }
      const platformTextureLoader = this.#platformTextureLoader;
      if (platformTextureLoader !== null && !platformTextureLoader.isCleanupComplete()) {
        try {
          const invocation = this.#invokeLoadExternal(
            'PlatformTextureLoader.destroy()',
            () => platformTextureLoader.destroy(),
          );
          if (invocation.reentryFailure !== null) throw invocation.reentryFailure;
        } catch (error) {
          this.#state = 'destroy-incomplete';
          throw error;
        }
      }
      const candidateCleanupFailures: unknown[] = [];
      const retainedDisposals = [...this.#retainedCandidateDisposals];
      for (const [sequence, scene] of this.#retainedCandidateScenes) {
        let disposal: ThreeObjectDisposalLease;
        let constructionReentry: Error | null = null;
        try {
          const invocation = this.#invokeLoadExternal(
            'ThreeObjectDisposalLease重建',
            () => new ThreeObjectDisposalLease(scene),
          );
          disposal = invocation.value;
          constructionReentry = invocation.reentryFailure;
        } catch (error) {
          candidateCleanupFailures.push(error);
          continue;
        }
        try {
          const invocation = this.#invokeLoadExternal(
            '重建ThreeObjectDisposalLease.dispose()',
            () => disposal.dispose(),
          );
          this.#retainedCandidateScenes.delete(sequence);
          if (constructionReentry !== null) candidateCleanupFailures.push(constructionReentry);
          if (invocation.reentryFailure !== null) {
            candidateCleanupFailures.push(invocation.reentryFailure);
          }
        } catch (error) {
          this.#retainedCandidateDisposals.set(sequence, disposal);
          this.#retainedCandidateScenes.delete(sequence);
          if (constructionReentry !== null) candidateCleanupFailures.push(constructionReentry);
          candidateCleanupFailures.push(error);
        }
      }
      for (const [sequence, disposal] of retainedDisposals) {
        try {
          const invocation = this.#invokeLoadExternal(
            'ThreeObjectDisposalLease.dispose()',
            () => disposal.dispose(),
          );
          this.#retainedCandidateDisposals.delete(sequence);
          if (invocation.reentryFailure !== null) {
            candidateCleanupFailures.push(invocation.reentryFailure);
          }
        } catch (error) { candidateCleanupFailures.push(error); }
      }
      if (candidateCleanupFailures.length > 0) {
        this.#state = 'destroy-incomplete';
        throw new AggregateError(
          candidateCleanupFailures,
          'GltfPresentationAssetLoader候选scene清理未完整完成。',
        );
      }
      if (this.#pendingLoads.size > 0) {
        this.#state = 'destroy-requested';
        return;
      }
      const cleanup = this.#textureHandlerCleanup;
      if (cleanup !== null) {
        try {
          const invocation = this.#invokeLoadExternal(
            'LoadingManager.removeHandler()',
            () => rejectThenable(
              cleanup.removeHandler(cleanup.pattern),
              'LoadingManager.removeHandler()',
            ),
          );
          this.#textureHandlerCleanup = null;
          this.#platformTextureLoader = null;
          if (invocation.reentryFailure !== null) throw invocation.reentryFailure;
        } catch (error) {
          this.#state = 'destroy-incomplete';
          throw error;
        }
      } else {
        this.#textureHandlerRegistration = null;
        this.#platformTextureLoader = null;
      }
      this.#state = 'destroyed';
    } finally {
      this.#terminalCleanupInProgress = false;
    }
  }

  getSnapshot(): GltfPresentationAssetLoaderSnapshot {
    const platformTextureLoader = this.#platformTextureLoader?.getSnapshot() ?? null;
    return Object.freeze({
      state: this.#state,
      pendingLoadCount: this.#pendingLoads.size,
      retainedCandidateDisposalCount:
        this.#retainedCandidateScenes.size + this.#retainedCandidateDisposals.size,
      textureHandlerRegistered: this.#textureHandlerCleanup !== null,
      platformTextureLoaderPendingRequestCount:
        platformTextureLoader?.pendingRequestCount ?? 0,
      platformTextureLoaderCleanupComplete:
        platformTextureLoader?.cleanupComplete ?? true,
      cleanupComplete: this.#state === 'destroyed',
    });
  }

  isCleanupComplete(): boolean {
    return this.#state === 'destroyed';
  }

  load(definitionValue: unknown): Promise<GltfPresentationAssetLease> {
    try {
      this.#assertLoadAllowed();
      const definition = normalizeDefinition(definitionValue);
      const sequence = this.#beginLoad();
      return this.#loadOwned(definition, sequence);
    } catch (error) {
      return handledRejectedPromise(error);
    }
  }

  async #loadOwned(
    definition: ReturnType<typeof normalizeDefinition>,
    sequence: number,
  ): Promise<GltfPresentationAssetLease> {
    let primaryFailed = false;
    let primaryFailure: unknown = undefined;
    let candidateScene: THREE.Object3D | null = null;
    let candidateDisposal: ThreeObjectDisposalLease | null = null;
    try {
      this.#ensureTextureHandlerRegistered();
      this.#assertLoadMayPublish(sequence);
      let result: unknown;
      let resultInvocationReentry: Error | null = null;
      if (this.#readAssetBytes) {
        const abortController = new AbortController();
        if (this.#pendingReadAbortControllers.has(sequence)) {
          throw new RangeError('GltfPresentationAssetLoader asset read Owner重复。');
        }
        this.#pendingReadAbortControllers.set(sequence, abortController);
        let bytes: unknown = undefined;
        try {
          const readInvocation = this.#invokeLoadExternal(
            'GltfPresentationAssetLoader.readAssetBytes()',
            () => this.#readAssetBytes?.(
              definition.sourceKey,
              abortController.signal,
            ),
          );
          bytes = await settleExternalInvocation(
            readInvocation,
            'GltfPresentationAssetLoader.readAssetBytes()',
          );
          if (readInvocation.reentryFailure !== null) throw readInvocation.reentryFailure;
        } finally {
          if (this.#pendingReadAbortControllers.get(sequence) === abortController) {
            this.#pendingReadAbortControllers.delete(sequence);
          }
        }
        this.#assertLoadMayPublish(sequence);
        if (!(bytes instanceof ArrayBuffer)) {
          throw new TypeError(`GLTF asset ${definition.id} bytes 必须是 ArrayBuffer。`);
        }
        const slash = definition.sourceKey.lastIndexOf('/');
        const basePath = slash < 0 ? '' : definition.sourceKey.slice(0, slash + 1);
        const parseInvocation = this.#invokeLoadExternal(
          'GltfPresentationAssetLoader.parseAsync()',
          () => this.#parseAsync(bytes, basePath),
        );
        result = await settleExternalInvocation(
          parseInvocation,
          'GltfPresentationAssetLoader.parseAsync()',
        );
        resultInvocationReentry = parseInvocation.reentryFailure;
      } else {
        const loadInvocation = this.#invokeLoadExternal(
          'GltfPresentationAssetLoader.loadAsync()',
          () => this.#loadAsync(definition.sourceKey),
        );
        result = await settleExternalInvocation(
          loadInvocation,
          'GltfPresentationAssetLoader.loadAsync()',
        );
        resultInvocationReentry = loadInvocation.reentryFailure;
      }
      const sceneInvocation = this.#invokeLoadExternal(
        `GLTF asset ${definition.id} scene读取`,
        () => {
          const scene = ownData(result, 'scene', `GLTF asset ${definition.id}`);
          if (!(scene instanceof THREE.Object3D)) {
            throw new TypeError(`GLTF asset ${definition.id} 缺少 Object3D scene。`);
          }
          return scene;
        },
      );
      const sceneValue = sceneInvocation.value;
      candidateScene = sceneValue;
      const disposalInvocation = this.#invokeLoadExternal(
        'ThreeObjectDisposalLease构造',
        () => new ThreeObjectDisposalLease(sceneValue),
      );
      candidateDisposal = disposalInvocation.value;
      candidateScene = null;
      const animationsInvocation = this.#invokeLoadExternal(
        `GLTF asset ${definition.id} animations读取`,
        () => readDataArray(
          ownData(result, 'animations', `GLTF asset ${definition.id}`),
          `GLTF asset ${definition.id}.animations`,
        ),
      );
      const animations = animationsInvocation.value;
      if (animations.some((clip) => !(clip instanceof THREE.AnimationClip))) {
        throw new TypeError(`GLTF asset ${definition.id}.animations 包含无效 clip。`);
      }
      const loadReentryFailures = [
        resultInvocationReentry,
        sceneInvocation.reentryFailure,
        disposalInvocation.reentryFailure,
        animationsInvocation.reentryFailure,
      ].filter((failure): failure is Error => failure !== null);
      if (loadReentryFailures.length > 0) {
        throw new AggregateError(
          loadReentryFailures,
          `GLTF asset ${definition.id}外部调用阶段发生load重入。`,
        );
      }
      this.#assertLoadMayPublish(sequence);
      const value = Object.freeze({
        assetId: definition.id,
        scene: sceneValue,
        animations: Object.freeze(animations as readonly THREE.AnimationClip[]),
        sourceKey: definition.sourceKey,
      });
      const disposal = candidateDisposal;
      if (disposal === null) {
        throw new Error(`GLTF asset ${definition.id} 发布前缺少资源租约。`);
      }
      candidateDisposal = null;
      return Object.freeze({
        assetId: definition.id,
        value,
        release: () => { disposal.dispose(); },
      });
    } catch (error) {
      primaryFailed = true;
      primaryFailure = error;
      if (candidateDisposal !== null) {
        const disposal = candidateDisposal;
        try {
          const invocation = this.#invokeLoadExternal(
            `GLTF asset ${definition.id}候选scene清理`,
            () => disposal.dispose(),
          );
          candidateDisposal = null;
          if (invocation.reentryFailure !== null) {
            primaryFailure = new AggregateError(
              [error, invocation.reentryFailure],
              `GLTF asset ${definition.id} load失败且候选scene清理期间发生load重入。`,
            );
          }
        } catch (cleanupCause) {
          this.#retainedCandidateDisposals.set(sequence, disposal);
          candidateDisposal = null;
          if (this.#state === 'active') this.#state = 'destroy-incomplete';
          primaryFailure = cleanupFailure(
            `GLTF asset ${definition.id} 无效、迟到或不可发布且清理失败。`,
            error,
            cleanupCause,
          );
        }
      } else if (candidateScene !== null) {
        this.#retainedCandidateScenes.set(sequence, candidateScene);
        candidateScene = null;
        if (this.#state === 'active') this.#state = 'destroy-incomplete';
      }
      throw primaryFailure;
    } finally {
      this.#pendingLoads.delete(sequence);
      try {
        this.#continueDestroy();
      } catch (cleanupCause) {
        if (primaryFailed) {
          throw cleanupFailure(
            'GltfPresentationAssetLoader load失败且终态清理未完成。',
            primaryFailure,
            cleanupCause,
          );
        }
        throw cleanupCause;
      }
    }
  }

  destroy(): void {
    if (this.#state === 'destroyed') return;
    if (this.#state === 'active') this.#state = 'destroy-requested';
    this.#continueDestroy();
  }
}

export const GLTF_PRESENTATION_ASSET_LOADER_LIFECYCLE_V1 = Object.freeze({
  pendingLoadOwnerPublishedBeforeExternalRead: true as const,
  destroyRejectsNewLoadsBeforeDefinitionRead: true as const,
  lateParsedSceneDisposedBeforeRejection: true as const,
  textureHandlerRemovedAfterPendingLoadsSettle: true as const,
  pendingPlatformTexturesCancelledBeforeWaitingForGltfSettlement: true as const,
  pendingAssetReadsOwnAbortControllers: true as const,
  destroyAbortsPendingAssetReadsBeforeWaitingForGltfSettlement: true as const,
  assetReadAbortControllersReleasedOnlyByMatchingLoadOwner: true as const,
  thrownNullAndUndefinedRemainFailuresDuringLoadCleanup: true as const,
  invalidCandidateDisposalRetainedForDestroyRetry: true as const,
  candidateCleanupDebtClosesLoaderToNewLoads: true as const,
  candidateCleanupRetryPrecedesDestroyedPublication: true as const,
  candidateCleanupFailuresRetainOriginalLoadFailure: true as const,
  terminalCleanupReentryDefersToCurrentOwner: true as const,
  removeHandlerDestroyReentryCannotRepeatRemoval: true as const,
  candidateCleanupDestroyReentryCannotRepeatDisposal: true as const,
  destroyReentryDoesNotPublishIncompleteState: true as const,
  externalCallbacksCannotReenterPublicLoad: true as const,
  swallowedLoadReentryFailsOwningLoad: true as const,
  reentrantAsyncResultStillSettlesUnderOriginalOwner: true as const,
  callbackStackExitRestoresConcurrentLoadAdmission: true as const,
  publishedLeaseReleaseRemainsOutsideLoaderReentryGate: true as const,
  candidateLeaseConstructionFailureRetainsSceneOwner: true as const,
  retainedSceneOwnerRetriesLeaseConstructionBeforeDispose: true as const,
  candidateSceneOwnerClosesLoaderUntilCleanupCompletes: true as const,
  leaseConstructionAndCleanupFailuresRemainObservable: true as const,
  textureHandlerRegistrationRunsUnderPendingLoadOwner: true as const,
  registrationAttemptPublishesCleanupOwnerBeforeManagerCall: true as const,
  registrationFailureRetainsHandlerRemovalDebt: true as const,
  destroyBeforeFirstLoadSkipsUnregisteredHandlerRemoval: true as const,
  optionAndPrototypeValidationPrecedesDefaultLoaderConstruction: true as const,
  defaultLoaderMethodsCapturedWithoutPostConstructionPrototypeReads: true as const,
  platformTextureOwnerCreatedAfterHandlerPortsCaptured: true as const,
  incompleteTextureHandlerRemovalRetainedForRetry: true as const,
  publishedLeaseRemainsCallerOwned: true as const,
  validationStatus: 'not-run' as const,
});
