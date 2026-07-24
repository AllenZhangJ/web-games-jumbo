import {
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  assertPresentationAssetRegistry,
  type PresentationAssetDefinition,
  type PresentationAssetRegistryPort,
} from '@number-strategy-jump/arena-presentation-contracts';

const OPTION_KEYS = new Set(['assetRegistry', 'assetId', 'loader']);
const LEASE_KEYS = new Set(['assetId', 'value', 'release']);

export const PRESENTATION_ASSET_LOAD_STATE = Object.freeze({
  CREATED: 'created',
  LOADING: 'loading',
  READY: 'ready',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

type PresentationAssetLoadState =
  typeof PRESENTATION_ASSET_LOAD_STATE[keyof typeof PRESENTATION_ASSET_LOAD_STATE];
type LoadMethod = (definition: PresentationAssetDefinition) => unknown;
type ReleaseMethod = () => unknown;

interface NormalizedLease {
  readonly assetId: string;
  readonly value: unknown;
  readonly release: ReleaseMethod;
}

function ownMethod(value: unknown, name: string): { owner: object; method: (...args: unknown[]) => unknown } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`Presentation asset ${name} owner 必须是对象。`);
  }
  let owner: object | null = value;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, name);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`Presentation asset ${name} 必须是数据方法。`);
      }
      return { owner: value, method: descriptor.value as (...args: unknown[]) => unknown };
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  throw new TypeError(`Presentation asset 缺少 ${name}()。`);
}

function normalizeLoader(value: unknown): LoadMethod {
  const { owner, method } = ownMethod(value, 'load');
  return (definition) => method.call(owner, definition);
}

function inspectLease(value: unknown, expectedAssetId: string): NormalizedLease {
  assertKnownKeys(value, LEASE_KEYS, 'Presentation asset lease');
  for (const key of LEASE_KEYS) {
    if (!Object.hasOwn(value, key)) {
      throw new TypeError(`Presentation asset lease.${key} 必须是可枚举数据字段。`);
    }
  }
  if (value.assetId !== expectedAssetId) {
    throw new RangeError('Presentation asset lease.assetId 与请求不一致。');
  }
  if (value.value === undefined || value.value === null) {
    throw new TypeError('Presentation asset lease.value 不能为空。');
  }
  if (typeof value.release !== 'function') {
    throw new TypeError('Presentation asset lease.release 必须是函数。');
  }
  const rawRelease = value.release as ReleaseMethod;
  return Object.freeze({
    assetId: value.assetId,
    value: value.value,
    release: () => rawRelease.call(value),
  });
}

function dataReleaseFunction(value: unknown): ReleaseMethod | null {
  if (!value || typeof value !== 'object') return null;
  const descriptor = Object.getOwnPropertyDescriptor(value, 'release');
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
    return null;
  }
  const method = descriptor.value as ReleaseMethod;
  return () => method.call(value);
}

function rejectAsyncResult(value: unknown): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let then: unknown;
  try { then = Reflect.get(value, 'then'); } catch {
    throw new TypeError('Presentation asset lease.release 返回了不可检查的 thenable。');
  }
  if (typeof then !== 'function') return;
  try { Promise.resolve(value).catch(() => {}); } catch { /* malformed thenable is already invalid */ }
  throw new TypeError('Presentation asset lease.release 必须同步完成。');
}

function releaseLease(lease: NormalizedLease | null): void {
  if (!lease) return;
  rejectAsyncResult(lease.release());
}

export class PresentationAssetLoadTask {
  readonly #definition: PresentationAssetDefinition;
  readonly #loadAsset: LoadMethod;
  #state: PresentationAssetLoadState = PRESENTATION_ASSET_LOAD_STATE.CREATED;
  #promise: Promise<unknown> | null = null;
  #lease: NormalizedLease | null = null;
  #lastError: unknown = null;

  constructor(options: unknown) {
    assertKnownKeys(options, OPTION_KEYS, 'PresentationAssetLoadTask options');
    const registry: PresentationAssetRegistryPort = assertPresentationAssetRegistry(options.assetRegistry);
    const assetId = assertNonEmptyString(options.assetId, 'PresentationAssetLoadTask.assetId');
    const loadAsset = normalizeLoader(options.loader);
    this.#definition = registry.require(assetId);
    this.#loadAsset = loadAsset;
  }

  get state(): PresentationAssetLoadState { return this.#state; }

  #releaseRetainedLease(): void {
    if (this.#lease === null) return;
    const lease = this.#lease;
    releaseLease(lease);
    this.#lease = null;
  }

  load(): Promise<unknown> {
    if (this.#state === PRESENTATION_ASSET_LOAD_STATE.DESTROYED) {
      return Promise.reject(new Error('PresentationAssetLoadTask 已销毁。'));
    }
    if (this.#state === PRESENTATION_ASSET_LOAD_STATE.FAILED) {
      const error = new Error('PresentationAssetLoadTask 已失败。');
      error.cause = this.#lastError;
      return Promise.reject(error);
    }
    if (this.#state === PRESENTATION_ASSET_LOAD_STATE.READY) {
      return Promise.resolve(this.#lease?.value);
    }
    if (this.#promise) return this.#promise;
    this.#state = PRESENTATION_ASSET_LOAD_STATE.LOADING;
    this.#promise = Promise.resolve()
      .then(() => {
        if (this.#state === PRESENTATION_ASSET_LOAD_STATE.DESTROYED) {
          throw new Error('PresentationAssetLoadTask 启动已取消。');
        }
        return this.#loadAsset(this.#definition);
      })
      .then((rawLease) => {
        let lease: NormalizedLease;
        try {
          lease = inspectLease(rawLease, this.#definition.id);
        } catch (error) {
          const rawRelease = dataReleaseFunction(rawLease);
          if (rawRelease) {
            const cleanupLease = Object.freeze({
              assetId: this.#definition.id,
              value: rawLease,
              release: rawRelease,
            });
            try { releaseLease(cleanupLease); } catch (cleanupError) {
              this.#lease = cleanupLease;
              const failure = new Error('Presentation asset lease 无效且清理失败。');
              failure.cause = error;
              Object.defineProperty(failure, 'cleanupCause', { value: cleanupError });
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
      .catch((error: unknown) => {
        if (this.#state !== PRESENTATION_ASSET_LOAD_STATE.DESTROYED) {
          this.#lastError = error;
          this.#state = PRESENTATION_ASSET_LOAD_STATE.FAILED;
        }
        throw error;
      });
    return this.#promise;
  }

  getDebugSnapshot(): Readonly<Record<string, string | boolean>> {
    return Object.freeze({
      assetId: this.#definition.id,
      state: this.#state,
      hasLease: this.#lease !== null,
      hasError: this.#lastError !== null,
    });
  }

  destroy(): void {
    if (this.#state === PRESENTATION_ASSET_LOAD_STATE.DESTROYED && this.#lease === null) return;
    this.#state = PRESENTATION_ASSET_LOAD_STATE.DESTROYED;
    this.#releaseRetainedLease();
  }
}
