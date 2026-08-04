import {
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  assertPresentationAssetRegistry,
  type PresentationAssetDefinition,
  type PresentationAssetRegistryPort,
} from '@number-strategy-jump/arena-presentation-contracts';

const OPTION_KEYS = new Set(['assetRegistry', 'assetId', 'loader']);
const LEASE_KEYS = new Set(['assetId', 'value', 'release']);
const NATIVE_PROMISE_THEN = Promise.prototype.then;

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

type SyncReturnInspection =
  | Readonly<{ kind: 'native-promise'; value: object }>
  | Readonly<{ kind: 'sync'; value: unknown }>;

function captureExactDataFields(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  name: string,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') throw new RangeError(`${name} 不支持 Symbol 字段。`);
    if (!allowedKeys.has(key)) throw new RangeError(`${name} 不支持字段 ${key}。`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function observeNativePromise(value: unknown): boolean {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return false;
  try {
    Reflect.apply(NATIVE_PROMISE_THEN, value, [() => undefined, () => undefined]);
    return true;
  } catch {
    return false;
  }
}

function inspectSyncOrNativePromise(value: unknown, label: string): SyncReturnInspection {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    return { kind: 'sync', value };
  }
  if (observeNativePromise(value)) return { kind: 'native-promise', value: value as object };
  const visited = new Set<object>();
  let current: object | null = value as object;
  let depth = 0;
  while (current !== null && depth < 32 && !visited.has(current)) {
    visited.add(current);
    depth += 1;
    const descriptor = Object.getOwnPropertyDescriptor(current, 'then');
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value')) {
        throw new TypeError(`${label} 返回了访问器 thenable。`);
      }
      if (typeof descriptor.value === 'function') {
        throw new TypeError(`${label} 返回了普通 thenable。`);
      }
      return { kind: 'sync', value };
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  if (current !== null) throw new TypeError(`${label} 返回值原型链无效。`);
  return { kind: 'sync', value };
}

function resolveSyncOrNativePromise<T>(
  value: unknown,
  label: string,
): Promise<Readonly<{ value: T }>> {
  const inspected = inspectSyncOrNativePromise(value, label);
  if (inspected.kind === 'sync') {
    return Promise.resolve(Object.freeze({ value: inspected.value as T }));
  }
  return new Promise<Readonly<{ value: T }>>((resolve, reject) => {
    try {
      Reflect.apply(NATIVE_PROMISE_THEN, inspected.value, [
        (resolved: unknown) => resolve(Object.freeze({ value: resolved as T })),
        (rejected: unknown) => reject(rejected),
      ]);
    } catch (error) {
      reject(error);
    }
  });
}

function observedRejectedOperation(error: unknown): Promise<never> {
  observeNativePromise(error);
  const operation = Promise.reject(error);
  observeNativePromise(operation);
  return operation;
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
  const fields = captureExactDataFields(value, LEASE_KEYS, 'Presentation asset lease');
  for (const key of LEASE_KEYS) {
    if (!Object.hasOwn(fields, key)) {
      throw new TypeError(`Presentation asset lease.${key} 必须是可枚举数据字段。`);
    }
  }
  if (fields.assetId !== expectedAssetId) {
    throw new RangeError('Presentation asset lease.assetId 与请求不一致。');
  }
  if (fields.value === undefined || fields.value === null) {
    throw new TypeError('Presentation asset lease.value 不能为空。');
  }
  rejectAsyncResult(fields.value, 'Presentation asset lease.value');
  if (typeof fields.release !== 'function') {
    throw new TypeError('Presentation asset lease.release 必须是函数。');
  }
  const rawRelease = fields.release as ReleaseMethod;
  return Object.freeze({
    assetId: fields.assetId as string,
    value: fields.value,
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

function rejectAsyncResult(value: unknown, label: string): void {
  const inspected = inspectSyncOrNativePromise(value, label);
  if (inspected.kind === 'native-promise') throw new TypeError(`${label} 必须同步完成。`);
}

function releaseLease(lease: NormalizedLease | null): void {
  if (!lease) return;
  rejectAsyncResult(lease.release(), 'Presentation asset lease.release()');
}

export class PresentationAssetLoadTask {
  readonly #definition: PresentationAssetDefinition;
  readonly #loadAsset: LoadMethod;
  #state: PresentationAssetLoadState = PRESENTATION_ASSET_LOAD_STATE.CREATED;
  #promise: Promise<unknown> | null = null;
  #lease: NormalizedLease | null = null;
  #releasingLease: NormalizedLease | null = null;
  #lastError: unknown = null;

  constructor(optionsValue: unknown) {
    const options = captureExactDataFields(
      optionsValue,
      OPTION_KEYS,
      'PresentationAssetLoadTask options',
    );
    const registry: PresentationAssetRegistryPort = assertPresentationAssetRegistry(options.assetRegistry);
    const assetId = assertNonEmptyString(options.assetId, 'PresentationAssetLoadTask.assetId');
    const loadAsset = normalizeLoader(options.loader);
    this.#definition = registry.require(assetId);
    this.#loadAsset = loadAsset;
  }

  get state(): PresentationAssetLoadState { return this.#state; }

  #releaseRetainedLease(): void {
    if (this.#lease === null) return;
    if (this.#releasingLease !== null) return;
    const lease = this.#lease;
    this.#releasingLease = lease;
    try {
      releaseLease(lease);
      if (this.#lease === lease) this.#lease = null;
    } finally {
      this.#releasingLease = null;
    }
  }

  load(): Promise<unknown> {
    if (this.#state === PRESENTATION_ASSET_LOAD_STATE.DESTROYED) {
      return observedRejectedOperation(new Error('PresentationAssetLoadTask 已销毁。'));
    }
    if (this.#state === PRESENTATION_ASSET_LOAD_STATE.FAILED) {
      const error = new Error('PresentationAssetLoadTask 已失败。');
      error.cause = this.#lastError;
      return observedRejectedOperation(error);
    }
    if (this.#state === PRESENTATION_ASSET_LOAD_STATE.READY) {
      const operation = this.#promise;
      if (operation === null) {
        return observedRejectedOperation(
          new Error('PresentationAssetLoadTask ready 状态缺少 load operation。'),
        );
      }
      return operation;
    }
    if (this.#promise) return this.#promise;
    this.#state = PRESENTATION_ASSET_LOAD_STATE.LOADING;
    this.#promise = Promise.resolve()
      .then(() => {
        if (this.#state === PRESENTATION_ASSET_LOAD_STATE.DESTROYED) {
          throw new Error('PresentationAssetLoadTask 启动已取消。');
        }
        const loadResult = this.#loadAsset(this.#definition);
        if (this.#promise !== null && loadResult === this.#promise) {
          throw new Error('Presentation asset loader.load() 不得自返回当前 load operation。');
        }
        return resolveSyncOrNativePromise(
          loadResult,
          'Presentation asset loader.load()',
        );
      })
      .then(({ value: rawLease }) => {
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
        observeNativePromise(error);
        if (this.#state !== PRESENTATION_ASSET_LOAD_STATE.DESTROYED) {
          this.#lastError = error;
          this.#state = PRESENTATION_ASSET_LOAD_STATE.FAILED;
        }
        throw error;
      });
    observeNativePromise(this.#promise);
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
