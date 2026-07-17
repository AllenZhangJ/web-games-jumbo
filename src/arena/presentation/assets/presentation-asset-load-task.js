import { assertPresentationAssetRegistry } from './presentation-asset-registry.js';

export const PRESENTATION_ASSET_LOAD_STATE = Object.freeze({
  CREATED: 'created',
  LOADING: 'loading',
  READY: 'ready',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

function assertLoader(value) {
  if (!value || typeof value !== 'object' || typeof value.load !== 'function') {
    throw new TypeError('PresentationAssetLoaderPort 必须实现 load()。');
  }
  return value;
}

function inspectLease(value, expectedAssetId) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('PresentationAssetLoaderPort.load() 必须返回 lease 对象。');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('Presentation asset lease 必须是普通对象。');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.some((key) => typeof key !== 'string')
    || keys.some((key) => !['assetId', 'value', 'release'].includes(key))
  ) throw new TypeError('Presentation asset lease 只能包含 assetId/value/release。');
  for (const key of ['assetId', 'value', 'release']) {
    const descriptor = descriptors[key];
    if (
      !descriptor
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      throw new TypeError(`Presentation asset lease.${key} 必须是可枚举数据字段。`);
    }
  }
  if (descriptors.assetId.value !== expectedAssetId) {
    throw new RangeError('Presentation asset lease.assetId 与请求不一致。');
  }
  if (descriptors.value.value === undefined || descriptors.value.value === null) {
    throw new TypeError('Presentation asset lease.value 不能为空。');
  }
  if (typeof descriptors.release.value !== 'function') {
    throw new TypeError('Presentation asset lease.release 必须是函数。');
  }
  return {
    assetId: descriptors.assetId.value,
    value: descriptors.value.value,
    release: descriptors.release.value,
  };
}

function dataReleaseFunction(value) {
  if (!value || typeof value !== 'object') return null;
  const descriptor = Object.getOwnPropertyDescriptor(value, 'release');
  return descriptor
    && Object.prototype.hasOwnProperty.call(descriptor, 'value')
    && typeof descriptor.value === 'function'
    ? descriptor.value
    : null;
}

function releaseLease(lease) {
  if (!lease) return;
  const result = lease.release();
  if (result && typeof result.then === 'function') {
    throw new TypeError('Presentation asset lease.release 必须同步完成。');
  }
}

export class PresentationAssetLoadTask {
  #definition;
  #loader;
  #state;
  #promise;
  #lease;
  #lastError;

  constructor({ assetRegistry, assetId, loader }) {
    this.#definition = assertPresentationAssetRegistry(assetRegistry).require(assetId);
    this.#loader = assertLoader(loader);
    this.#state = PRESENTATION_ASSET_LOAD_STATE.CREATED;
    this.#promise = null;
    this.#lease = null;
    this.#lastError = null;
  }

  get state() {
    return this.#state;
  }

  #releaseRetainedLease() {
    if (this.#lease === null) return;
    const lease = this.#lease;
    releaseLease(lease);
    this.#lease = null;
  }

  load() {
    if (this.#state === PRESENTATION_ASSET_LOAD_STATE.DESTROYED) {
      return Promise.reject(new Error('PresentationAssetLoadTask 已销毁。'));
    }
    if (this.#state === PRESENTATION_ASSET_LOAD_STATE.FAILED) {
      const error = new Error('PresentationAssetLoadTask 已失败。');
      error.cause = this.#lastError;
      return Promise.reject(error);
    }
    if (this.#state === PRESENTATION_ASSET_LOAD_STATE.READY) {
      return Promise.resolve(this.#lease.value);
    }
    if (this.#promise) return this.#promise;
    this.#state = PRESENTATION_ASSET_LOAD_STATE.LOADING;
    this.#promise = Promise.resolve()
      .then(() => {
        if (this.#state === PRESENTATION_ASSET_LOAD_STATE.DESTROYED) {
          throw new Error('PresentationAssetLoadTask 启动已取消。');
        }
        return this.#loader.load(this.#definition);
      })
      .then((rawLease) => {
        let lease = null;
        try {
          lease = inspectLease(rawLease, this.#definition.id);
        } catch (error) {
          const rawRelease = dataReleaseFunction(rawLease);
          if (rawRelease) {
            const cleanupLease = { release: rawRelease };
            try { releaseLease(cleanupLease); } catch (cleanupError) {
              this.#lease = cleanupLease;
              const failure = new Error('Presentation asset lease 无效且清理失败。');
              failure.cause = error;
              failure.cleanupCause = cleanupError;
              throw failure;
            }
          }
          throw error;
        }
        if (this.#state === PRESENTATION_ASSET_LOAD_STATE.DESTROYED) {
          this.#lease = lease;
          this.#releaseRetainedLease();
          throw new Error('PresentationAssetLoadTask 加载完成时已销毁。');
        }
        this.#lease = lease;
        this.#state = PRESENTATION_ASSET_LOAD_STATE.READY;
        return lease.value;
      })
      .catch((error) => {
        if (this.#state !== PRESENTATION_ASSET_LOAD_STATE.DESTROYED) {
          this.#lastError = error;
          this.#state = PRESENTATION_ASSET_LOAD_STATE.FAILED;
        }
        throw error;
      });
    return this.#promise;
  }

  getDebugSnapshot() {
    return Object.freeze({
      assetId: this.#definition.id,
      state: this.#state,
      hasLease: this.#lease !== null,
      hasError: this.#lastError !== null,
    });
  }

  destroy() {
    if (
      this.#state === PRESENTATION_ASSET_LOAD_STATE.DESTROYED
      && this.#lease === null
    ) return;
    this.#state = PRESENTATION_ASSET_LOAD_STATE.DESTROYED;
    this.#releaseRetainedLease();
  }
}
