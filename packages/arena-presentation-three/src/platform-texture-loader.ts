import * as THREE from 'three';

type UnknownMethod = (...args: unknown[]) => unknown;

interface HostImage {
  onload?: (() => void) | null;
  onerror?: ((error: unknown) => void) | null;
  src?: string;
}

interface HostImageCleanupOwner {
  readonly image: HostImage;
  onloadDetached: boolean;
  onerrorDetached: boolean;
}

interface LoadingManagerPort {
  readonly itemStart: UnknownMethod | null;
  readonly itemEnd: UnknownMethod | null;
  readonly itemError: UnknownMethod | null;
}

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
  if (!Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${String(key)} 必须是数据字段。`);
  }
  return descriptor.value;
}

function snapshotMethod(value: unknown, key: string, name: string, required: boolean): UnknownMethod | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (!required) return null;
    throw new TypeError(`${name} 必须是对象。`);
  }
  let owner: object | null = value;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, key);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key} 必须是数据方法。`);
      }
      const method = descriptor.value as UnknownMethod;
      return (...args: unknown[]) => method.call(value, ...args);
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  if (required) throw new TypeError(`${name} 缺少 ${key}()。`);
  return null;
}

function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let then: unknown;
  try { then = Reflect.get(value, 'then'); } catch { throw new TypeError(`${name} 返回值不可检查。`); }
  if (typeof then !== 'function') return;
  try { Promise.resolve(value).catch(() => {}); } catch { /* malformed thenable */ }
  throw new TypeError(`${name} 必须同步完成。`);
}

function normalizeManager(value: unknown): LoadingManagerPort {
  if (value === null || value === undefined) {
    return Object.freeze({ itemStart: null, itemEnd: null, itemError: null });
  }
  return Object.freeze({
    itemStart: snapshotMethod(value, 'itemStart', 'PlatformTextureLoader.manager', false),
    itemEnd: snapshotMethod(value, 'itemEnd', 'PlatformTextureLoader.manager', false),
    itemError: snapshotMethod(value, 'itemError', 'PlatformTextureLoader.manager', false),
  });
}

function assetPathCandidates(value: unknown): readonly string[] {
  if (typeof value !== 'string' || (!value.startsWith('./assets/') && !value.startsWith('assets/'))) {
    throw new RangeError('PlatformTextureLoader 只允许加载 assets/ 内的纹理。');
  }
  const pathname = value.split(/[?#]/u, 1)[0] ?? '';
  let decodedPathname: string;
  try { decodedPathname = decodeURIComponent(pathname); } catch (cause) {
    const error = new RangeError('PlatformTextureLoader 纹理路径编码无效。');
    error.cause = cause;
    throw error;
  }
  if (
    pathname.includes('\\')
    || decodedPathname.includes('\\')
    || decodedPathname.split('/').includes('..')
  ) throw new RangeError('PlatformTextureLoader 拒绝纹理路径逃逸。');
  return Object.freeze(value.startsWith('./') ? [value, value.slice(2)] : [value]);
}

export type PlatformTextureLoaderState =
  'active' | 'destroy-requested' | 'destroy-incomplete' | 'destroyed';

export interface PlatformTextureLoaderSnapshot {
  readonly state: PlatformTextureLoaderState;
  readonly pendingRequestCount: number;
  readonly cleanupComplete: boolean;
}

export class PlatformTextureLoader {
  readonly #createImage: () => unknown;
  readonly #manager: LoadingManagerPort;
  readonly #baseUrl: string | null;
  readonly #cancelRequestBySequence = new Map<number, () => readonly unknown[]>();
  #nextRequestSequence = 1;
  #state: PlatformTextureLoaderState = 'active';
  #externalCallbackDepth = 0;
  #loadReentryAttemptCount = 0;

  constructor(options: unknown) {
    const allowed = new Set<PropertyKey>(['createImage', 'manager', 'baseUrl']);
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new TypeError('PlatformTextureLoader options 必须是对象。');
    }
    if (Reflect.ownKeys(options).some((key) => !allowed.has(key))) {
      throw new TypeError('PlatformTextureLoader options 包含未知字段。');
    }
    const createImage = ownData(options, 'createImage', 'PlatformTextureLoader options');
    if (typeof createImage !== 'function') throw new TypeError('PlatformTextureLoader.createImage 必须是函数。');
    this.#createImage = createImage as () => unknown;
    this.#manager = normalizeManager(ownData(options, 'manager', 'PlatformTextureLoader options', false));
    const baseUrlValue = ownData(
      options,
      'baseUrl',
      'PlatformTextureLoader options',
      false,
    );
    if (baseUrlValue === undefined || baseUrlValue === null) {
      this.#baseUrl = null;
    } else {
      if (typeof baseUrlValue !== 'string' || baseUrlValue.length === 0) {
        throw new TypeError('PlatformTextureLoader.baseUrl 必须是非空字符串或 null。');
      }
      let parsedBaseUrl: URL;
      try {
        parsedBaseUrl = new URL(baseUrlValue);
      } catch (cause) {
        const failure = new RangeError('PlatformTextureLoader.baseUrl 无效。');
        failure.cause = cause;
        throw failure;
      }
      if (parsedBaseUrl.protocol !== 'http:' && parsedBaseUrl.protocol !== 'https:') {
        throw new RangeError('PlatformTextureLoader.baseUrl 只允许 http/https。');
      }
      if (parsedBaseUrl.username.length > 0 || parsedBaseUrl.password.length > 0) {
        throw new RangeError('PlatformTextureLoader.baseUrl 不允许凭据。');
      }
      this.#baseUrl = parsedBaseUrl.href;
    }
  }

  #invokeExternal<T>(name: string, invoke: () => T): T {
    const reentryWaterline = this.#loadReentryAttemptCount;
    this.#externalCallbackDepth += 1;
    let failed = false;
    let failure: unknown = undefined;
    let result: T | undefined;
    try {
      result = invoke();
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      this.#externalCallbackDepth -= 1;
    }
    if (this.#loadReentryAttemptCount !== reentryWaterline) {
      const reentryFailure = new Error(`${name}期间发生公开load同步重入。`);
      if (failed) {
        throw new AggregateError([failure, reentryFailure], `${name}失败且发生load重入。`);
      }
      throw reentryFailure;
    }
    if (failed) throw failure;
    return result as T;
  }

  #callExternalSync(method: UnknownMethod | null, name: string, ...args: unknown[]): void {
    if (method === null) return;
    this.#invokeExternal(name, () => {
      rejectThenable(method(...args), name);
    });
  }

  #cleanupImage(owner: HostImageCleanupOwner): readonly unknown[] {
    const failures: unknown[] = [];
    if (!owner.onloadDetached) {
      try {
        this.#invokeExternal('HostImage.onload解绑', () => { owner.image.onload = null; });
        owner.onloadDetached = true;
      } catch (error) { failures.push(error); }
    }
    if (!owner.onerrorDetached) {
      try {
        this.#invokeExternal('HostImage.onerror解绑', () => { owner.image.onerror = null; });
        owner.onerrorDetached = true;
      } catch (error) { failures.push(error); }
    }
    return Object.freeze(failures);
  }

  #assertLoadAllowed(): void {
    if (this.#externalCallbackDepth > 0) {
      this.#loadReentryAttemptCount = this.#loadReentryAttemptCount === Number.MAX_SAFE_INTEGER
        ? 0
        : this.#loadReentryAttemptCount + 1;
      throw new Error('PlatformTextureLoader外部回调期间拒绝公开load同步重入。');
    }
    if (this.#state !== 'active') {
      throw new Error(`PlatformTextureLoader状态${this.#state}拒绝新load。`);
    }
  }

  load(
    urlValue: unknown,
    onLoadValue: unknown = () => {},
    _onProgress: unknown = undefined,
    onErrorValue: unknown = () => {},
  ): THREE.Texture {
    this.#assertLoadAllowed();
    const sourceKeyCandidates = assetPathCandidates(urlValue);
    const candidates = this.#baseUrl === null
      ? sourceKeyCandidates
      : Object.freeze(sourceKeyCandidates.map((sourceKey) => (
        new URL(sourceKey, this.#baseUrl as string).href
      )));
    const url = candidates[0] ?? urlValue as string;
    if (typeof onLoadValue !== 'function' || typeof onErrorValue !== 'function') {
      throw new TypeError('PlatformTextureLoader callbacks 必须是函数。');
    }
    const onLoad = onLoadValue as (texture: THREE.Texture) => unknown;
    const onError = onErrorValue as (error: Error) => unknown;
    const texture = new THREE.Texture();
    const requestSequence = this.#nextRequestSequence;
    if (!Number.isSafeInteger(requestSequence)) {
      const failure = new RangeError('PlatformTextureLoader request sequence溢出。');
      try {
        this.#invokeExternal('PlatformTextureLoader溢出纹理清理', () => {
          rejectThenable(texture.dispose(), 'PlatformTextureLoader texture.dispose()');
        });
      } catch (cleanupFailure) {
        throw new AggregateError([failure, cleanupFailure], 'PlatformTextureLoader序号溢出且纹理清理失败。');
      }
      throw failure;
    }
    this.#nextRequestSequence += 1;
    let attempt = 0;
    let settled = false;
    let failureActive = false;
    let failureCause: unknown = null;
    const imageCleanupOwners = new Set<HostImageCleanupOwner>();
    let activeImageOwner: HostImageCleanupOwner | null = null;
    let managerStarted = false;
    let textureDisposed = false;
    let managerErrorComplete = false;
    let managerEndComplete = false;
    let errorCallbackNotified = false;
    let errorNotification: Error | null = null;
    let cleanupInProgress = false;
    let managerStartInProgress = false;
    let cancellationRequestedDuringManagerStart = false;
    let imageCreationInProgress = false;
    let cancellationRequestedDuringImageCreation = false;
    let imageBindingInProgress = false;
    let cancellationRequestedDuringImageBinding = false;
    let imageErrorInProgress = false;
    let cancellationRequestedDuringImageError = false;
    let completionInProgress = false;
    let cancellationRequestedDuringCompletion = false;

    const finishRequest = (): void => {
      this.#cancelRequestBySequence.delete(requestSequence);
      if (
        (this.#state === 'destroy-requested' || this.#state === 'destroy-incomplete')
        && this.#cancelRequestBySequence.size === 0
      ) {
        this.#state = 'destroyed';
      }
    };

    const notifyError = (error: Error): readonly unknown[] => {
      try {
        this.#invokeExternal('PlatformTextureLoader.onError()', () => {
          rejectThenable(onError(error), 'PlatformTextureLoader.onError()');
        });
        return Object.freeze([]);
      } catch (callbackFailure) {
        return Object.freeze([callbackFailure]);
      }
    };
    const failPermanently = (cause: unknown): readonly unknown[] => {
      if (cleanupInProgress) {
        return Object.freeze([new Error('PlatformTextureLoader纹理清理发生同步重入。')]);
      }
      if (!failureActive) {
        if (settled) return Object.freeze([]);
      }
      cleanupInProgress = true;
      if (!failureActive) {
        settled = true;
        failureActive = true;
        failureCause = cause;
      }
      const cleanupErrors: unknown[] = [];
      for (const owner of imageCleanupOwners) {
        cleanupErrors.push(...this.#cleanupImage(owner));
        if (owner.onloadDetached && owner.onerrorDetached) imageCleanupOwners.delete(owner);
      }
      if (!textureDisposed) {
        try {
          this.#invokeExternal('PlatformTextureLoader texture.dispose()', () => {
            rejectThenable(texture.dispose(), 'PlatformTextureLoader texture.dispose()');
          });
          textureDisposed = true;
        } catch (error) { cleanupErrors.push(error); }
      }
      if (managerStarted) {
        if (!managerErrorComplete) {
          try {
            this.#callExternalSync(this.#manager.itemError, 'LoadingManager.itemError()', url);
            managerErrorComplete = true;
          } catch (error) { cleanupErrors.push(error); }
        }
        if (!managerEndComplete) {
          try {
            this.#callExternalSync(this.#manager.itemEnd, 'LoadingManager.itemEnd()', url);
            managerEndComplete = true;
          } catch (error) { cleanupErrors.push(error); }
        }
      }
      if (!errorCallbackNotified) {
        if (errorNotification === null) {
          errorNotification = new Error(`宿主无法解码纹理：${url}`);
          errorNotification.cause = failureCause;
          if (cleanupErrors.length > 0) {
            Object.defineProperty(errorNotification, 'cleanupCauses', {
              value: Object.freeze([...cleanupErrors]),
            });
          }
        }
        const callbackErrors = notifyError(errorNotification);
        cleanupErrors.push(...callbackErrors);
        errorCallbackNotified = callbackErrors.length === 0;
      }
      const cleanupComplete = textureDisposed
        && imageCleanupOwners.size === 0
        && (!managerStarted || (managerErrorComplete && managerEndComplete))
        && errorCallbackNotified;
      if (cleanupComplete) {
        finishRequest();
      } else {
        this.#state = 'destroy-incomplete';
      }
      cleanupInProgress = false;
      return Object.freeze(cleanupErrors);
    };
    const beginAttempt = (): void => {
      const currentAttempt = attempt;
      const sourceKey = candidates[currentAttempt];
      attempt += 1;
      if (sourceKey === undefined) {
        failPermanently(new RangeError('PlatformTextureLoader 纹理候选索引越界。'));
        return;
      }
      let imageValue: unknown;
      imageCreationInProgress = true;
      try {
        imageValue = this.#invokeExternal(
          'PlatformTextureLoader.createImage()',
          () => this.#createImage(),
        );
      } catch (error) {
        imageCreationInProgress = false;
        failPermanently(error);
        return;
      } finally {
        imageCreationInProgress = false;
      }
      if (!imageValue || typeof imageValue !== 'object' || Array.isArray(imageValue)) {
        failPermanently(new TypeError('platform.createImage() 未返回图片对象。'));
        return;
      }
      const image = imageValue as HostImage;
      const imageOwner: HostImageCleanupOwner = {
        image,
        onloadDetached: false,
        onerrorDetached: false,
      };
      imageCleanupOwners.add(imageOwner);
      activeImageOwner = imageOwner;
      texture.image = image;
      const requestMayContinue = (): boolean => (
        !settled
        && this.#state === 'active'
        && currentAttempt === attempt - 1
        && activeImageOwner === imageOwner
      );
      if (cancellationRequestedDuringImageCreation || !requestMayContinue()) {
        failPermanently(new Error(`PlatformTextureLoader销毁已取消图片创建：${url}`));
        return;
      }
      let queuedBindingSignal: Readonly<{ kind: 'load' } | { kind: 'error'; cause: unknown }> | null = null;
      let queuedBindingSignalConflict = false;
      const queueBindingSignal = (
        signal: Readonly<{ kind: 'load' } | { kind: 'error'; cause: unknown }>,
      ): void => {
        if (queuedBindingSignal === null) queuedBindingSignal = signal;
        else queuedBindingSignalConflict = true;
      };
      const performImageLoad = (): void => {
        if (!requestMayContinue() || completionInProgress || cleanupInProgress || imageErrorInProgress) return;
        completionInProgress = true;
        let completionFailed = false;
        let completionFailure: unknown = undefined;
        try {
          const detachFailures = this.#cleanupImage(imageOwner);
          if (imageOwner.onloadDetached && imageOwner.onerrorDetached) imageCleanupOwners.delete(imageOwner);
          if (detachFailures.length > 0) {
            throw new AggregateError(detachFailures, 'PlatformTextureLoader成功前图片回调解绑失败。');
          }
          texture.needsUpdate = true;
          this.#callExternalSync(this.#manager.itemEnd, 'LoadingManager.itemEnd()', url);
          managerEndComplete = true;
          if (cancellationRequestedDuringCompletion || this.#state !== 'active') {
            completionFailed = true;
            completionFailure = new Error(`PlatformTextureLoader销毁已取消纹理发布：${url}`);
          } else {
            this.#invokeExternal('PlatformTextureLoader.onLoad()', () => {
              rejectThenable(onLoad(texture), 'PlatformTextureLoader.onLoad()');
            });
            settled = true;
          }
        } catch (error) {
          completionFailed = true;
          completionFailure = error;
        } finally {
          completionInProgress = false;
        }
        if (completionFailed) {
          failPermanently(completionFailure);
          return;
        }
        finishRequest();
      };
      const performImageError = (error: unknown): void => {
        if (!requestMayContinue() || completionInProgress || cleanupInProgress || imageErrorInProgress) return;
        imageErrorInProgress = true;
        try {
          const detachFailures = this.#cleanupImage(imageOwner);
          if (imageOwner.onloadDetached && imageOwner.onerrorDetached) imageCleanupOwners.delete(imageOwner);
          if (detachFailures.length > 0) {
            imageErrorInProgress = false;
            failPermanently(new AggregateError(
              [error, ...detachFailures],
              'PlatformTextureLoader图片失败且回调解绑未完成。',
            ));
            return;
          }
          if (cancellationRequestedDuringImageError || this.#state !== 'active') {
            imageErrorInProgress = false;
            failPermanently(new Error(`PlatformTextureLoader销毁已取消图片失败处理：${url}`));
            return;
          }
          if (!requestMayContinue()) return;
          if (attempt < candidates.length) {
            imageErrorInProgress = false;
            beginAttempt();
            return;
          }
          imageErrorInProgress = false;
          failPermanently(error);
        } finally {
          imageErrorInProgress = false;
        }
      };
      const flushBindingSignal = (): void => {
        const signal = queuedBindingSignal;
        const conflict = queuedBindingSignalConflict;
        queuedBindingSignal = null;
        queuedBindingSignalConflict = false;
        if (!requestMayContinue() || signal === null) return;
        if (conflict) {
          performImageError(new Error('PlatformTextureLoader单次图片属性写入触发了多个回调。'));
          return;
        }
        if (signal.kind === 'load') performImageLoad();
        else performImageError(signal.cause);
      };
      const onImageLoad = (): void => {
        if (!requestMayContinue()) return;
        if (imageBindingInProgress) {
          queueBindingSignal(Object.freeze({ kind: 'load' as const }));
          return;
        }
        performImageLoad();
      };
      const onImageError = (error: unknown): void => {
        if (!requestMayContinue()) return;
        if (imageBindingInProgress) {
          queueBindingSignal(Object.freeze({ kind: 'error' as const, cause: error }));
          return;
        }
        performImageError(error);
      };
      const writeImageField = (write: () => void, name: string): boolean => {
        let writeFailed = false;
        let writeFailure: unknown = undefined;
        imageBindingInProgress = true;
        try {
          this.#invokeExternal(name, write);
        } catch (error) {
          writeFailed = true;
          writeFailure = error;
        } finally {
          imageBindingInProgress = false;
        }
        if (cancellationRequestedDuringImageBinding || this.#state !== 'active') {
          queuedBindingSignal = null;
          queuedBindingSignalConflict = false;
          failPermanently(new Error(`PlatformTextureLoader销毁已取消图片绑定：${url}`));
          return false;
        }
        if (writeFailed) {
          const signalFailure = queuedBindingSignal !== null
            ? new Error(`${name}失败前已同步触发图片回调。`)
            : null;
          queuedBindingSignal = null;
          queuedBindingSignalConflict = false;
          performImageError(signalFailure === null
            ? writeFailure
            : new AggregateError([writeFailure, signalFailure], `${name}写入与回调同时失败。`));
        } else {
          flushBindingSignal();
        }
        return requestMayContinue();
      };
      imageOwner.onloadDetached = false;
      if (!writeImageField(() => { image.onload = onImageLoad; }, 'HostImage.onload')) return;
      imageOwner.onerrorDetached = false;
      if (!writeImageField(() => { image.onerror = onImageError; }, 'HostImage.onerror')) return;
      writeImageField(() => { image.src = sourceKey; }, 'HostImage.src');
    };

    this.#cancelRequestBySequence.set(requestSequence, () => {
      if (managerStartInProgress) {
        cancellationRequestedDuringManagerStart = true;
        return Object.freeze([]);
      }
      if (imageCreationInProgress) {
        cancellationRequestedDuringImageCreation = true;
        return Object.freeze([]);
      }
      if (imageBindingInProgress) {
        cancellationRequestedDuringImageBinding = true;
        return Object.freeze([]);
      }
      if (imageErrorInProgress) {
        cancellationRequestedDuringImageError = true;
        return Object.freeze([]);
      }
      if (completionInProgress) {
        cancellationRequestedDuringCompletion = true;
        return Object.freeze([]);
      }
      if (cleanupInProgress) {
        return Object.freeze([]);
      }
      return failPermanently(new Error(`PlatformTextureLoader销毁已取消纹理：${url}`));
    });
    managerStarted = true;
    managerStartInProgress = true;
    try { this.#callExternalSync(this.#manager.itemStart, 'LoadingManager.itemStart()', url); } catch (error) {
      managerStartInProgress = false;
      const rollbackFailures = failPermanently(error);
      if (rollbackFailures.length > 0) {
        throw new AggregateError(
          [error, ...rollbackFailures],
          'LoadingManager.itemStart失败且PlatformTextureLoader回滚未完成。',
        );
      }
      throw error;
    }
    managerStartInProgress = false;
    if (cancellationRequestedDuringManagerStart || this.#state !== 'active') {
      this.#cancelRequestBySequence.get(requestSequence)?.();
      return texture;
    }
    if (settled || this.#state !== 'active') {
      this.#cancelRequestBySequence.get(requestSequence)?.();
      return texture;
    }
    beginAttempt();
    return texture;
  }

  getSnapshot(): PlatformTextureLoaderSnapshot {
    return Object.freeze({
      state: this.#state,
      pendingRequestCount: this.#cancelRequestBySequence.size,
      cleanupComplete: this.#state === 'destroyed',
    });
  }

  isCleanupComplete(): boolean {
    return this.#state === 'destroyed';
  }

  destroy(): void {
    if (this.#state === 'destroyed') return;
    this.#state = 'destroy-requested';
    const cleanupErrors: unknown[] = [];
    for (const cancel of [...this.#cancelRequestBySequence.values()]) {
      cleanupErrors.push(...cancel());
    }
    if (this.#cancelRequestBySequence.size === 0) {
      this.#state = 'destroyed';
      return;
    }
    if (cleanupErrors.length === 0) {
      // 当前请求正处于 manager、图片创建/绑定/失败或 onLoad 的同步外部回调中；取消 Owner 已经登记，
      // 由该回调返回后的唯一完成路径继续清理，不能反向让外部回调被误判为失败。
      this.#state = 'destroy-requested';
      return;
    }
    this.#state = 'destroy-incomplete';
    throw new AggregateError(cleanupErrors, 'PlatformTextureLoader清理未完整完成。');
  }
}

export const PLATFORM_TEXTURE_LOADER_LIFECYCLE_V1 = Object.freeze({
  requestOwnerPublishedBeforeManagerStart: true as const,
  destroyCancelsPendingImagesAndDetachesCallbacks: true as const,
  cancellationBalancesStartedManagerItem: true as const,
  completionAndCancellationShareOneRequestWatermark: true as const,
  managerReentryCannotRecursivelyCleanSameRequest: true as const,
  managerStartReentryDefersCancellationUntilCallbackReturns: true as const,
  deferredCancellationDoesNotFailOwningCallback: true as const,
  errorCallbackMustConfirmBeforeRequestOwnerRelease: true as const,
  errorCallbackRetryReusesSameFailureObject: true as const,
  failureCleanupReentryDefersToCurrentOwner: true as const,
  incompleteNaturalFailureClosesLoaderToNewRequests: true as const,
  imageCallbackBindingStopsAfterSynchronousSettlement: true as const,
  successCallbackMustConfirmBeforeTextureOwnershipTransfer: true as const,
  imageCallbackDetachFailuresRetainedPerAttempt: true as const,
  bindingSignalsSettleAfterHostSetterReturns: true as const,
  destroyDuringImageCreationAndBindingDefersToOwner: true as const,
  destroyDuringImageFailureDefersToCurrentAttempt: true as const,
  fallbackCannotAbandonPriorImageCleanupDebt: true as const,
  externalCallbacksCannotReenterPublicLoad: true as const,
  swallowedLoadReentryFailsOwningRequest: true as const,
  asynchronousLoadsRemainAllowedOutsideExternalCallbackStack: true as const,
  itemStartFailureRetainsRequestOwnerUntilRollbackCompletes: true as const,
  itemStartAttemptBalancesManagerErrorAndEnd: true as const,
  itemStartRollbackFailureClosesLoaderAndRetries: true as const,
  itemStartPrimaryAndCleanupFailuresRemainObservable: true as const,
  incompleteCancellationCleanupRetainedForRetry: true as const,
  lateImageCallbacksCannotRepublishTexture: true as const,
  validationStatus: 'not-run' as const,
});
