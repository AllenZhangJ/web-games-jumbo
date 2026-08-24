import {
  createFrameScheduler,
  createPlatformContract,
  getRequiredWebGL2Context,
  normalizeCanvasSize,
  prepareCanvas,
  sizeCanvas,
} from '@number-strategy-jump/arena-platform-contracts';
import { isThenable, optionalMethod, rejectThenable } from './host-capability.js';

// Mini-game hosts are structurally dynamic; `any` is confined to this adapter boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HostObject = Record<PropertyKey, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HostCallback = (...args: any[]) => unknown;
type MiniGameId = 'wechat' | 'douyin';
type MiniGameMainCanvasOperation = 'create';
type MiniGameGlContextOperation = 'create';
type MiniGameWallClockOperation = 'read';
type MiniGameClockOperation = 'read';
type MiniGameMediaFactoryOperation = 'create-image' | 'create-audio' | 'create-offscreen-canvas';
type MiniGameVibrationOperation = 'vibrate';
type MiniGameViewportOperation = 'read';
type MiniGameStorageOperation = 'read' | 'write' | 'delete';
type MiniGameShareOperation = 'start' | 'settlement';
type MiniGameAssetReadOperation = 'sync-read' | 'callback-start' | 'callback-settlement' | 'publish';
type MiniGameInputBindingOperation = 'bind' | 'cleanup';
type MiniGameNotificationBindingOperation = 'resize' | 'show' | 'hide' | 'cleanup';
type MiniGameStorageReadResult = Readonly<{
  ok: boolean;
  found: boolean;
  value: unknown;
}>;
type MiniGameViewportSnapshot = Readonly<{
  width: number;
  height: number;
  pixelRatio: number;
  safeArea: Readonly<Record<string, number>> | null;
}>;
type MiniGameTouchCoordinateSnapshot = Readonly<{
  viewportWidth: number;
  viewportHeight: number;
  canvasWidth: number;
  canvasHeight: number;
}>;
type MiniGameSharePendingOwner = Readonly<{
  requestId: number;
  promise: Promise<boolean>;
  resolve: (result: boolean) => void;
}>;

const INPUT_BINDING_KEYS = new Set(['onStart', 'onMove', 'onEnd', 'onCancel']);
const MINI_GAME_IDS = new Set<unknown>(['wechat', 'douyin']);
const MAX_CHANGED_TOUCHES = 32;

function hostObject(value: unknown, label: string): HostObject {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError(`${label} 必须是对象。`);
  }
  return value as HostObject;
}

function miniGameId(value: unknown): MiniGameId {
  if (!MINI_GAME_IDS.has(value)) throw new RangeError(`未知小游戏平台：${String(value)}`);
  return value as MiniGameId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeProperty(value: HostObject | null | undefined, key: PropertyKey): any {
  try {
    return value?.[key];
  } catch {
    return undefined;
  }
}

function ownData(value: unknown, key: PropertyKey): unknown {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return undefined;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
}

function finitePositive(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function hostError(id: MiniGameId, message: string, cause?: unknown): Error {
  return cause === undefined
    ? new Error(`[${id}] ${message}`)
    : new Error(`[${id}] ${message}`, { cause });
}

function cleanupAll(cleanups: readonly (() => void)[], label: string): void {
  const errors: unknown[] = [];
  for (const cleanup of [...cleanups].reverse()) {
    try {
      cleanup();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, `${label} 存在 ${errors.length} 个清理失败。`);
}

function isMissingStorageError(error: unknown): boolean {
  try {
    const candidate = hostObject(error, 'storage error');
    const code = ownData(candidate, 'errorCode')
      ?? ownData(candidate, 'errCode')
      ?? ownData(candidate, 'code');
    const message = ownData(candidate, 'errMsg') ?? ownData(candidate, 'message') ?? '';
    return Number(code) === 100599 || /data\s+not\s+found/i.test(String(message));
  } catch {
    return false;
  }
}

function assetPathCandidates(sourceKey: unknown, id: MiniGameId): readonly string[] {
  if (
    typeof sourceKey !== 'string'
    || !sourceKey.startsWith('./assets/')
    || sourceKey.includes('..')
    || sourceKey.includes('\\')
  ) throw hostError(id, '资产路径必须位于 ./assets/ 且不能包含路径逃逸');
  return [sourceKey, sourceKey.slice(2)];
}

function assetArrayBuffer(value: unknown, id: MiniGameId, sourceKey: string): ArrayBuffer {
  if (value instanceof ArrayBuffer) return value.slice(0);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice().buffer;
  }
  throw hostError(id, `资产 ${sourceKey} 未返回 ArrayBuffer`);
}

function readCallbackFile(readFile: HostCallback, filePath: string, id: MiniGameId): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let returned = false;
    let settled = false;
    let pending: Readonly<{ ok: boolean; value: unknown }> | null = null;
    const settle = (ok: boolean, value: unknown) => {
      if (settled) return;
      if (!returned) {
        pending ??= { ok, value };
        return;
      }
      settled = true;
      if (ok) resolve(value);
      else reject(value);
    };
    let result: unknown;
    try {
      result = readFile({
        filePath,
        success: (response: unknown) => {
          let data: unknown;
          try {
            data = ownData(hostObject(response, `[${id}] readFile response`), 'data');
          } catch (error) {
            settle(false, error);
            return;
          }
          settle(true, data);
        },
        fail: (error: unknown) => settle(false, error),
      });
    } catch (error) {
      returned = true;
      settle(false, error);
      return;
    }
    returned = true;
    if (isThenable(result)) {
      settled = true;
      reject(new TypeError(`[${id}] FileSystemManager.readFile 不得返回 thenable。`));
      return;
    }
    const synchronousOutcome = pending as Readonly<{ ok: boolean; value: unknown }> | null;
    pending = null;
    if (synchronousOutcome) settle(synchronousOutcome.ok, synchronousOutcome.value);
  });
}

class MiniGameAssetReadRequestOwner {
  readonly #requestId: number;
  readonly #sourceKey: string;
  readonly #fileSystem: HostObject | null;
  readonly #readFile: HostCallback | null;
  readonly #readFileSync: HostCallback | null;
  readonly #id: MiniGameId;
  #started: boolean;
  #operation: MiniGameAssetReadOperation | null;
  #operationSequence: number;
  #reentryError: Error | null;

  constructor(options: Readonly<{
    requestId: number;
    sourceKey: string;
    fileSystem: HostObject | null;
    readFile: HostCallback | null;
    readFileSync: HostCallback | null;
    id: MiniGameId;
  }>) {
    this.#requestId = options.requestId;
    this.#sourceKey = options.sourceKey;
    this.#fileSystem = options.fileSystem;
    this.#readFile = options.readFile;
    this.#readFileSync = options.readFileSync;
    this.#id = options.id;
    this.#started = false;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentryError = null;
  }

  async read(): Promise<ArrayBuffer> {
    if (this.#started) {
      throw hostError(this.#id, `asset request ${this.#requestId} 不得重复启动`);
    }
    this.#started = true;
    const candidates = assetPathCandidates(this.#sourceKey, this.#id);
    if (!this.#fileSystem) {
      throw hostError(this.#id, '宿主缺少 getFileSystemManager，无法读取本地 GLB');
    }
    if (!this.#readFile && !this.#readFileSync) {
      throw hostError(this.#id, 'FileSystemManager 缺少 readFile/readFileSync');
    }
    let lastError: unknown = null;
    for (const filePath of candidates) {
      try {
        const data = this.#readFile
          ? await this.#readCallback(filePath)
          : this.#runOperation('sync-read', (sequence) => {
            const result = this.#readFileSync?.(filePath);
            rejectThenable(result, `[${this.#id}] readFileSync`);
            this.#assertCommit(sequence, 'sync-read', `[${this.#id}] sync asset bytes`);
            return result;
          });
        return this.#runOperation('publish', (sequence) => {
          const bytes = assetArrayBuffer(data, this.#id, this.#sourceKey);
          this.#assertCommit(sequence, 'publish', `[${this.#id}] asset bytes publication`);
          return bytes;
        });
      } catch (error) {
        lastError = error;
      }
    }
    throw hostError(this.#id, `读取本地资产失败：${this.#sourceKey}`, lastError);
  }

  async #readCallback(filePath: string): Promise<unknown> {
    const pending = this.#runOperation('callback-start', (sequence) => {
      const result = readCallbackFile(this.#readFile as HostCallback, filePath, this.#id);
      this.#assertCommit(sequence, 'callback-start', `[${this.#id}] callback asset request start`);
      return result;
    });
    const value = await pending;
    return this.#runOperation('callback-settlement', (sequence) => {
      this.#assertCommit(sequence, 'callback-settlement', `[${this.#id}] callback asset settlement`);
      return value;
    });
  }

  #guardReentry(operation: MiniGameAssetReadOperation): void {
    if (this.#operation === null) return;
    this.#reentryError ??= hostError(
      this.#id,
      `asset request ${this.#requestId} ${this.#operation}期间拒绝${operation}重入`,
    );
    throw this.#reentryError;
  }

  #assertCommit(sequence: number, operation: MiniGameAssetReadOperation, label: string): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw hostError(this.#id, `${label}缺少当前asset request operation所有权`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: MiniGameAssetReadOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(
        sequence,
        operation,
        `[${this.#id}] asset request ${this.#requestId} ${operation}`,
      );
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[${this.#id}] asset request ${this.#requestId} ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }
}

class MiniGameAssetReadService {
  readonly read: (sourceKey: string) => Promise<ArrayBuffer>;
  readonly #fileSystem: HostObject | null;
  readonly #readFile: HostCallback | null;
  readonly #readFileSync: HostCallback | null;
  readonly #id: MiniGameId;
  #requestSequence: number;

  constructor(api: HostObject, id: MiniGameId) {
    const getFileSystemManager = optionalMethod(api, 'getFileSystemManager');
    let fileSystem: HostObject | null = null;
    if (getFileSystemManager) {
      try {
        const candidate = getFileSystemManager();
        rejectThenable(candidate, `[${id}] getFileSystemManager`);
        fileSystem = hostObject(candidate, `[${id}] FileSystemManager`);
      } catch {
        fileSystem = null;
      }
    }
    this.#fileSystem = fileSystem;
    this.#readFile = optionalMethod(fileSystem, 'readFile');
    this.#readFileSync = optionalMethod(fileSystem, 'readFileSync');
    this.#id = id;
    this.#requestSequence = 0;
    this.read = (sourceKey: string): Promise<ArrayBuffer> => {
      this.#requestSequence += 1;
      return new MiniGameAssetReadRequestOwner({
        requestId: this.#requestSequence,
        sourceKey,
        fileSystem: this.#fileSystem,
        readFile: this.#readFile,
        readFileSync: this.#readFileSync,
        id: this.#id,
      }).read();
    };
  }
}

class MiniGameViewportReadOwner {
  readonly read: () => MiniGameViewportSnapshot;
  readonly #getWindowInfo: HostCallback | null;
  readonly #getSystemInfoSync: HostCallback | null;
  readonly #id: MiniGameId;
  #operation: MiniGameViewportOperation | null;
  #operationSequence: number;
  #reentryError: Error | null;

  constructor(api: HostObject, id: MiniGameId) {
    this.#getWindowInfo = optionalMethod(api, 'getWindowInfo');
    this.#getSystemInfoSync = optionalMethod(api, 'getSystemInfoSync');
    this.#id = id;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentryError = null;
    this.read = (): MiniGameViewportSnapshot => this.#runOperation('read', (sequence) => {
      const info = this.#readInfo(sequence);
      const width = this.#positive(
        sequence,
        this.#readProperty(sequence, info, 'windowWidth')
          ?? this.#readProperty(sequence, info, 'screenWidth'),
        1280,
      );
      const height = this.#positive(
        sequence,
        this.#readProperty(sequence, info, 'windowHeight')
          ?? this.#readProperty(sequence, info, 'screenHeight'),
        720,
      );
      const pixelRatio = this.#positive(
        sequence,
        this.#readProperty(sequence, info, 'pixelRatio'),
        1,
      );
      const safeArea = this.#readProperty(sequence, info, 'safeArea');
      let safeAreaSnapshot: Readonly<Record<string, number>> | null = null;
      if (safeArea && typeof safeArea === 'object' && !Array.isArray(safeArea)) {
        const candidate: Record<string, number> = {};
        for (const key of ['left', 'top', 'right', 'bottom', 'width', 'height']) {
          const value = ownData(safeArea, key);
          this.#assertCommit(sequence, 'read', `[${this.#id}] viewport safeArea.${key}`);
          if (typeof value === 'number' && Number.isFinite(value)) candidate[key] = value;
        }
        if (Object.keys(candidate).length > 0) safeAreaSnapshot = Object.freeze(candidate);
      }
      return Object.freeze({
        width,
        height,
        pixelRatio: Math.min(pixelRatio, 2),
        safeArea: safeAreaSnapshot,
      });
    });
  }

  #readInfo(sequence: number): HostObject | null {
    for (const readInfo of [this.#getWindowInfo, this.#getSystemInfoSync]) {
      if (!readInfo) continue;
      try {
        const candidate = readInfo();
        rejectThenable(candidate, `[${this.#id}] viewport host read`);
        this.#assertCommit(sequence, 'read', `[${this.#id}] viewport host return`);
        return hostObject(candidate, `[${this.#id}] viewport`);
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        this.#assertCommit(sequence, 'read', `[${this.#id}] viewport fallback`);
      }
    }
    return null;
  }

  #readProperty(sequence: number, object: HostObject | null, key: string): unknown {
    if (!object) return undefined;
    try {
      const value = object[key];
      rejectThenable(value, `[${this.#id}] viewport.${key}`);
      this.#assertCommit(sequence, 'read', `[${this.#id}] viewport.${key}`);
      return value;
    } catch (error) {
      if (this.#reentryError !== null) throw error;
      this.#assertCommit(sequence, 'read', `[${this.#id}] viewport.${key} fallback`);
      return undefined;
    }
  }

  #positive(sequence: number, value: unknown, fallback: number): number {
    const result = finitePositive(value, fallback);
    this.#assertCommit(sequence, 'read', `[${this.#id}] viewport number normalization`);
    return result;
  }

  #guardReentry(operation: MiniGameViewportOperation): void {
    if (this.#operation === null) return;
    this.#reentryError ??= hostError(
      this.#id,
      `viewport ${this.#operation}期间拒绝${operation}重入`,
    );
    throw this.#reentryError;
  }

  #assertCommit(sequence: number, operation: MiniGameViewportOperation, label: string): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw hostError(this.#id, `${label}缺少当前viewport operation所有权`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: MiniGameViewportOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[${this.#id}] viewport ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[${this.#id}] viewport ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }
}

class MiniGameStorageOperationOwner {
  readonly read: (key: string) => MiniGameStorageReadResult;
  readonly write: (key: string, value: unknown) => boolean;
  readonly delete: (key: string) => boolean;
  readonly #getStorageSync: HostCallback | null;
  readonly #getStorageInfoSync: HostCallback | null;
  readonly #setStorageSync: HostCallback | null;
  readonly #removeStorageSync: HostCallback | null;
  readonly #id: MiniGameId;
  #operation: MiniGameStorageOperation | null;
  #operationSequence: number;
  #reentryError: Error | null;

  constructor(options: Readonly<{
    getStorageSync: HostCallback | null;
    getStorageInfoSync: HostCallback | null;
    setStorageSync: HostCallback | null;
    removeStorageSync: HostCallback | null;
    id: MiniGameId;
  }>) {
    this.#getStorageSync = options.getStorageSync;
    this.#getStorageInfoSync = options.getStorageInfoSync;
    this.#setStorageSync = options.setStorageSync;
    this.#removeStorageSync = options.removeStorageSync;
    this.#id = options.id;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentryError = null;
    this.read = (key: string): MiniGameStorageReadResult => {
      try {
        return this.#runOperation('read', (sequence) => this.#readOwned(sequence, key));
      } catch {
        return { ok: false, found: false, value: undefined };
      }
    };
    this.write = (key: string, value: unknown): boolean => {
      try {
        return this.#runOperation('write', (sequence) => {
          if (!this.#setStorageSync || value === undefined) return false;
          this.#callChecked(
            sequence,
            'write',
            () => this.#setStorageSync?.(key, value),
            `[${this.#id}] storage.setStorageSync`,
          );
          return true;
        });
      } catch {
        return false;
      }
    };
    this.delete = (key: string): boolean => {
      try {
        return this.#runOperation('delete', (sequence) => {
          if (!this.#removeStorageSync) return false;
          this.#callChecked(
            sequence,
            'delete',
            () => this.#removeStorageSync?.(key),
            `[${this.#id}] storage.removeStorageSync`,
          );
          return true;
        });
      } catch {
        return false;
      }
    };
  }

  #readOwned(sequence: number, key: string): MiniGameStorageReadResult {
    if (!this.#getStorageSync) return { ok: false, found: false, value: undefined };
    let knownPresent = false;
    if (this.#getStorageInfoSync) {
      try {
        const infoValue = this.#callChecked(
          sequence,
          'read',
          () => this.#getStorageInfoSync?.(),
          `[${this.#id}] storage.getStorageInfoSync`,
        );
        const info = hostObject(infoValue, `[${this.#id}] storage info`);
        this.#assertCommit(sequence, 'read', `[${this.#id}] storage info validation`);
        const keys = ownData(info, 'keys');
        this.#assertCommit(sequence, 'read', `[${this.#id}] storage info keys`);
        if (Array.isArray(keys)) {
          knownPresent = keys.includes(key);
          this.#assertCommit(sequence, 'read', `[${this.#id}] storage key lookup`);
          if (!knownPresent) return { ok: true, found: false, value: undefined };
        }
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        this.#assertCommit(sequence, 'read', `[${this.#id}] storage info fallback`);
      }
    }
    try {
      const value = this.#callChecked(
        sequence,
        'read',
        () => this.#getStorageSync?.(key),
        `[${this.#id}] storage.getStorageSync`,
      );
      return value === undefined
        ? { ok: !knownPresent, found: false, value: undefined }
        : { ok: true, found: true, value };
    } catch (error) {
      if (this.#reentryError !== null) throw error;
      this.#assertCommit(sequence, 'read', `[${this.#id}] storage read failure classification`);
      return isMissingStorageError(error)
        ? { ok: true, found: false, value: undefined }
        : { ok: false, found: false, value: undefined };
    }
  }

  #guardReentry(operation: MiniGameStorageOperation): void {
    if (this.#operation === null) return;
    this.#reentryError ??= hostError(
      this.#id,
      `storage ${this.#operation}期间拒绝${operation}重入`,
    );
    throw this.#reentryError;
  }

  #assertCommit(sequence: number, operation: MiniGameStorageOperation, label: string): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw hostError(this.#id, `${label}缺少当前storage operation所有权`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: MiniGameStorageOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[${this.#id}] storage ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[${this.#id}] storage ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }

  #callChecked<T>(
    sequence: number,
    operation: MiniGameStorageOperation,
    callback: () => T,
    label: string,
  ): T {
    try {
      const result = callback();
      rejectThenable(result, label);
      this.#assertCommit(sequence, operation, label);
      return result;
    } catch (error) {
      try {
        this.#assertCommit(sequence, operation, label);
      } catch (reentryError) {
        if (error !== reentryError) {
          throw new AggregateError(
            [error, reentryError],
            `${label}失败且发生storage重入。`,
          );
        }
        throw reentryError;
      }
      throw error;
    }
  }
}

class MiniGameShareOperationOwner {
  readonly share: (payload: unknown) => Promise<boolean>;
  readonly #shareHost: HostCallback | null;
  readonly #id: MiniGameId;
  #requestSequence: number;
  #pending: MiniGameSharePendingOwner | null;
  #operation: MiniGameShareOperation | null;
  #operationSequence: number;
  #reentryError: Error | null;

  constructor(shareHost: HostCallback | null, id: MiniGameId) {
    this.#shareHost = shareHost;
    this.#id = id;
    this.#requestSequence = 0;
    this.#pending = null;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentryError = null;
    this.share = (payload: unknown): Promise<boolean> => {
      if (!this.#shareHost) return Promise.resolve(false);
      if (this.#operation !== null) {
        try {
          this.#guardReentry('start');
        } catch {
          return Promise.resolve(false);
        }
      }
      if (this.#pending !== null) return Promise.resolve(false);
      this.#requestSequence += 1;
      let resolve!: (result: boolean) => void;
      const promise = new Promise<boolean>((resolver) => {
        resolve = resolver;
      });
      const pending = Object.freeze({
        requestId: this.#requestSequence,
        promise,
        resolve,
      });
      this.#pending = pending;
      let shareResult: unknown;
      try {
        shareResult = this.#runOperation('start', (sequence) => {
          const value = parseSharePayload(payload);
          this.#assertCommit(sequence, 'start', `[${this.#id}] share payload`);
          const result = this.#shareHost?.(value);
          this.#assertCommit(sequence, 'start', `[${this.#id}] share host invocation`);
          return result;
        });
      } catch {
        this.#settle(pending, false);
        return promise;
      }
      Promise.resolve(shareResult).then(
        () => this.#settle(pending, true),
        () => this.#settle(pending, false),
      );
      return promise;
    };
  }

  #settle(pending: MiniGameSharePendingOwner, result: boolean): void {
    if (this.#pending !== pending) return;
    try {
      this.#runOperation('settlement', (sequence) => {
        if (this.#pending !== pending) return;
        this.#pending = null;
        this.#assertCommit(sequence, 'settlement', `[${this.#id}] share pending release`);
        pending.resolve(result);
        this.#assertCommit(sequence, 'settlement', `[${this.#id}] share settlement publication`);
      });
    } catch {
      if (this.#pending === pending) this.#pending = null;
      pending.resolve(false);
    }
  }

  #guardReentry(operation: MiniGameShareOperation): void {
    if (this.#operation === null) return;
    this.#reentryError ??= hostError(
      this.#id,
      `share ${this.#operation}期间拒绝${operation}重入`,
    );
    throw this.#reentryError;
  }

  #assertCommit(sequence: number, operation: MiniGameShareOperation, label: string): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw hostError(this.#id, `${label}缺少当前share operation所有权`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: MiniGameShareOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[${this.#id}] share ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[${this.#id}] share ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }
}

function touchPoint(
  touch: HostObject,
  coordinates: MiniGameTouchCoordinateSnapshot,
) {
  const identifier = safeProperty(touch, 'identifier');
  const pointerId = Number.isSafeInteger(identifier) && identifier >= 0 ? identifier : null;
  if (pointerId === null) return null;
  const candidatesX = [safeProperty(touch, 'clientX'), safeProperty(touch, 'x'), safeProperty(touch, 'pageX')];
  const candidatesY = [safeProperty(touch, 'clientY'), safeProperty(touch, 'y'), safeProperty(touch, 'pageY')];
  const sourceX = candidatesX.find((value) => typeof value === 'number' && Number.isFinite(value)) ?? 0;
  const sourceY = candidatesY.find((value) => typeof value === 'number' && Number.isFinite(value)) ?? 0;
  return {
    x: (sourceX / coordinates.viewportWidth) * coordinates.canvasWidth,
    y: (sourceY / coordinates.viewportHeight) * coordinates.canvasHeight,
    pointerId,
  };
}

function touchPoints(
  eventValue: unknown,
  canvas: HostObject,
  readViewport: () => MiniGameViewportSnapshot,
) {
  try {
    const event = hostObject(eventValue, 'mini-game touch event');
    const changed = safeProperty(event, 'changedTouches');
    const current = safeProperty(event, 'touches');
    const changedLength = safeProperty(changed, 'length');
    const currentLength = safeProperty(current, 'length');
    const source = Number.isSafeInteger(changedLength) ? changed : current;
    const length = Number.isSafeInteger(changedLength) ? changedLength : currentLength;
    if (!source || !Number.isSafeInteger(length) || length < 1 || length > MAX_CHANGED_TOUCHES) return [];
    const viewport = readViewport();
    const coordinates = Object.freeze({
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      canvasWidth: finitePositive(safeProperty(canvas, 'width'), viewport.width),
      canvasHeight: finitePositive(safeProperty(canvas, 'height'), viewport.height),
    });
    const points = [];
    for (let index = 0; index < length; index += 1) {
      const touch = safeProperty(source, index);
      if (!touch || typeof touch !== 'object') continue;
      const value = touchPoint(hostObject(touch, 'mini-game touch'), coordinates);
      if (value) points.push(value);
    }
    return points;
  } catch {
    return [];
  }
}

function parseInputBindings(value: unknown): Readonly<Record<string, HostCallback>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('mini-game input bindings 必须是对象。');
  }
  let keys: (string | symbol)[];
  try {
    keys = Reflect.ownKeys(value);
  } catch (cause) {
    throw new TypeError('mini-game input bindings 无法读取。', { cause });
  }
  const callbacks: Record<string, HostCallback> = Object.create(null) as Record<string, HostCallback>;
  for (const key of keys) {
    if (typeof key !== 'string' || !INPUT_BINDING_KEYS.has(key)) {
      throw new TypeError(`mini-game input bindings 包含未知字段 ${String(key)}。`);
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch (cause) {
      throw new TypeError(`mini-game input bindings.${key} 无法读取。`, { cause });
    }
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`mini-game input bindings.${key} 必须是数据字段。`);
    }
    if (descriptor.value !== undefined && typeof descriptor.value !== 'function') {
      throw new TypeError(`mini-game input bindings.${key} 必须是函数。`);
    }
    if (typeof descriptor.value === 'function') callbacks[key] = descriptor.value as HostCallback;
  }
  for (const key of INPUT_BINDING_KEYS) callbacks[key] ??= () => {};
  return Object.freeze(callbacks);
}

function parseSharePayload(value: unknown): Readonly<{ title?: string; query: string }> {
  if (value === undefined || value === null) return Object.freeze({ query: '' });
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('mini-game share payload 必须是对象。');
  }
  let keys: (string | symbol)[];
  try {
    keys = Reflect.ownKeys(value);
  } catch (cause) {
    throw new TypeError('mini-game share payload 无法读取。', { cause });
  }
  const result: { title?: string; query: string } = { query: '' };
  for (const key of keys) {
    if (key !== 'title' && key !== 'query') {
      throw new TypeError(`mini-game share payload 包含未知字段 ${String(key)}。`);
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch (cause) {
      throw new TypeError(`mini-game share payload.${String(key)} 无法读取。`, { cause });
    }
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`mini-game share payload.${String(key)} 必须是数据字段。`);
    }
    if (descriptor.value !== undefined && typeof descriptor.value !== 'string') {
      throw new TypeError(`mini-game share payload.${String(key)} 必须是字符串。`);
    }
    if (key === 'title' && descriptor.value !== undefined) result.title = descriptor.value as string;
    if (key === 'query' && descriptor.value !== undefined) result.query = descriptor.value as string;
  }
  return Object.freeze(result);
}

function subscribeHost(
  on: HostCallback | null,
  off: HostCallback | null,
  name: string,
  callback: HostCallback,
  id: MiniGameId,
  required = false,
): () => void {
  if (!on || !off) {
    if (required) throw hostError(id, `宿主缺少 ${name}/off${name.slice(2)} API`);
    return () => {};
  }
  let active = true;
  let owned = false;
  let rollbackAttempted = false;
  const guarded = (...args: unknown[]) => {
    if (active) callback(...args);
  };
  try {
    const result = on(guarded);
    owned = true;
    if (isThenable(result)) {
      active = false;
      rollbackAttempted = true;
      try {
        rejectThenable(off(guarded), `[${id}] ${name} 注册回滚`);
        owned = false;
      } catch (rollbackError) {
        throw new AggregateError(
          [new TypeError(`[${id}] ${name} 不得返回 thenable。`), rollbackError],
          `[${id}] ${name} 异步注册且回滚失败`,
        );
      }
      throw new TypeError(`[${id}] ${name} 不得返回 thenable。`);
    }
  } catch (cause) {
    active = false;
    if (!owned && !rollbackAttempted) {
      try {
        rejectThenable(off(guarded), `[${id}] ${name} 失败回滚`);
      } catch (rollbackError) {
        throw hostError(id, `注册 ${name} 失败且回滚不完整`, new AggregateError([cause, rollbackError]));
      }
    }
    if (required || cause instanceof TypeError || cause instanceof AggregateError) {
      throw hostError(id, `注册 ${name} 失败`, cause);
    }
    return () => {};
  }
  return () => {
    active = false;
    if (!owned) return;
    rejectThenable(off(guarded), `[${id}] 清理 ${name}`);
    owned = false;
  };
}

class MiniGameInputBindingOwner {
  readonly bind: (bindingsValue?: unknown) => () => void;
  readonly #touchCapabilities: Readonly<{
    start: readonly [HostCallback | null, HostCallback | null];
    move: readonly [HostCallback | null, HostCallback | null];
    end: readonly [HostCallback | null, HostCallback | null];
    cancel: readonly [HostCallback | null, HostCallback | null];
  }>;
  readonly #canvas: HostObject;
  readonly #readViewport: () => MiniGameViewportSnapshot;
  readonly #id: MiniGameId;
  #operation: MiniGameInputBindingOperation | null;
  #operationSequence: number;
  #reentryError: Error | null;

  constructor(options: Readonly<{
    touchCapabilities: Readonly<{
      start: readonly [HostCallback | null, HostCallback | null];
      move: readonly [HostCallback | null, HostCallback | null];
      end: readonly [HostCallback | null, HostCallback | null];
      cancel: readonly [HostCallback | null, HostCallback | null];
    }>;
    canvas: HostObject;
    readViewport: () => MiniGameViewportSnapshot;
    id: MiniGameId;
  }>) {
    this.#touchCapabilities = options.touchCapabilities;
    this.#canvas = options.canvas;
    this.#readViewport = options.readViewport;
    this.#id = options.id;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentryError = null;
    this.bind = (bindingsValue: unknown = {}): (() => void) => (
      this.#runOperation('bind', (sequence) => this.#bindOwned(sequence, bindingsValue))
    );
  }

  #bindOwned(sequence: number, bindingsValue: unknown): () => void {
    const bindings = parseInputBindings(bindingsValue);
    this.#assertCommit(sequence, 'bind', `[${this.#id}] input binding parse`);
    const dispatch = (callback: HostCallback) => (event: unknown) => {
      for (const point of touchPoints(event, this.#canvas, this.#readViewport)) callback(point);
    };
    const cleanups: Array<() => void> = [];
    try {
      const register = (
        capability: readonly [HostCallback | null, HostCallback | null],
        name: string,
        callback: HostCallback,
        required: boolean,
      ) => {
        cleanups.push(subscribeHost(...capability, name, callback, this.#id, required));
        this.#assertCommit(sequence, 'bind', `[${this.#id}] ${name} binding publication`);
      };
      register(
        this.#touchCapabilities.start,
        'onTouchStart',
        dispatch(bindings.onStart ?? (() => {})),
        true,
      );
      register(
        this.#touchCapabilities.move,
        'onTouchMove',
        dispatch(bindings.onMove ?? (() => {})),
        true,
      );
      register(
        this.#touchCapabilities.end,
        'onTouchEnd',
        dispatch(bindings.onEnd ?? (() => {})),
        true,
      );
      register(
        this.#touchCapabilities.cancel,
        'onTouchCancel',
        dispatch(bindings.onCancel ?? (() => {})),
        false,
      );
    } catch (error) {
      try {
        cleanupAll(cleanups, `[${this.#id}] input binding rollback`);
        this.#assertCommit(sequence, 'bind', `[${this.#id}] input binding rollback`);
      } catch (cleanupError) {
        if (cleanupError === error) throw error;
        throw new AggregateError(
          [error, cleanupError],
          `[${this.#id}] input binding 注册失败且回滚不完整。`,
        );
      }
      throw error;
    }
    let cleaned = false;
    return () => {
      if (cleaned) return;
      this.#runOperation('cleanup', (cleanupSequence) => {
        cleanupAll(cleanups, `[${this.#id}] input binding`);
        this.#assertCommit(
          cleanupSequence,
          'cleanup',
          `[${this.#id}] input binding cleanup publication`,
        );
        cleaned = true;
      });
    };
  }

  #guardReentry(operation: MiniGameInputBindingOperation): void {
    if (this.#operation === null) return;
    this.#reentryError ??= hostError(
      this.#id,
      `input binding ${this.#operation}期间拒绝${operation}重入`,
    );
    throw this.#reentryError;
  }

  #assertCommit(
    sequence: number,
    operation: MiniGameInputBindingOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw hostError(this.#id, `${label}缺少当前input binding operation所有权`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: MiniGameInputBindingOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[${this.#id}] input binding ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[${this.#id}] input binding ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }
}

class MiniGameNotificationBindingOwner {
  readonly onResize: (callback: unknown) => () => void;
  readonly onShow: (callback: unknown) => () => void;
  readonly onHide: (callback: unknown) => () => void;
  readonly #ports: Readonly<{
    resize: readonly [HostCallback | null, HostCallback | null, string];
    show: readonly [HostCallback | null, HostCallback | null, string];
    hide: readonly [HostCallback | null, HostCallback | null, string];
  }>;
  readonly #id: MiniGameId;
  #operation: MiniGameNotificationBindingOperation | null;
  #operationSequence: number;
  #reentryError: Error | null;

  constructor(options: Readonly<{
    onWindowResize: HostCallback | null;
    offWindowResize: HostCallback | null;
    onShow: HostCallback | null;
    offShow: HostCallback | null;
    onHide: HostCallback | null;
    offHide: HostCallback | null;
    id: MiniGameId;
  }>) {
    this.#ports = Object.freeze({
      resize: [options.onWindowResize, options.offWindowResize, 'onWindowResize'] as const,
      show: [options.onShow, options.offShow, 'onShow'] as const,
      hide: [options.onHide, options.offHide, 'onHide'] as const,
    });
    this.#id = options.id;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentryError = null;
    this.onResize = (callback: unknown): (() => void) => this.#bind('resize', callback);
    this.onShow = (callback: unknown): (() => void) => this.#bind('show', callback);
    this.onHide = (callback: unknown): (() => void) => this.#bind('hide', callback);
  }

  #bind(
    operation: Extract<MiniGameNotificationBindingOperation, 'resize' | 'show' | 'hide'>,
    callback: unknown,
  ): () => void {
    if (typeof callback !== 'function') {
      throw new TypeError(`[${this.#id}] ${operation} callback 必须是函数。`);
    }
    return this.#runOperation(operation, (sequence) => {
      const [on, off, name] = this.#ports[operation];
      const cleanup = subscribeHost(on, off, name, callback as HostCallback, this.#id);
      try {
        this.#assertCommit(sequence, operation, `[${this.#id}] ${name} binding publication`);
      } catch (error) {
        try {
          cleanup();
          this.#assertCommit(sequence, operation, `[${this.#id}] ${name} binding rollback`);
        } catch (cleanupError) {
          if (cleanupError === error) throw error;
          throw new AggregateError(
            [error, cleanupError],
            `[${this.#id}] ${name} 注册失败且回滚不完整。`,
          );
        }
        throw error;
      }
      let cleaned = false;
      return () => {
        if (cleaned) return;
        this.#runOperation('cleanup', (cleanupSequence) => {
          cleanup();
          this.#assertCommit(
            cleanupSequence,
            'cleanup',
            `[${this.#id}] ${name} cleanup publication`,
          );
          cleaned = true;
        });
      };
    });
  }

  #guardReentry(operation: MiniGameNotificationBindingOperation): void {
    if (this.#operation === null) return;
    this.#reentryError ??= hostError(
      this.#id,
      `notification ${this.#operation}期间拒绝${operation}重入`,
    );
    throw this.#reentryError;
  }

  #assertCommit(
    sequence: number,
    operation: MiniGameNotificationBindingOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw hostError(this.#id, `${label}缺少当前notification operation所有权`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(
    operation: MiniGameNotificationBindingOperation,
    run: (sequence: number) => T,
  ): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[${this.#id}] notification ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[${this.#id}] notification ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }
}

function createOffscreenCanvas(
  createOffscreen: HostCallback | null,
  createCanvas: HostCallback,
  id: MiniGameId,
  mainCanvas: HostObject,
  width: unknown,
  height: unknown,
): unknown {
  const size = normalizeCanvasSize(width, height, id);
  let lastError: unknown = null;
  const acceptCanvas = (candidate: unknown) => {
    rejectThenable(candidate, `[${id}] 创建离屏 Canvas`);
    if (candidate === mainCanvas) throw hostError(id, '宿主把主 Canvas 重复返回为离屏 Canvas，已拒绝调整其尺寸');
    return sizeCanvas(candidate, size.width, size.height, id);
  };
  if (createOffscreen) {
    const options = { type: '2d', width: size.width, height: size.height };
    const attempts = id === 'douyin'
      ? [() => createOffscreen(), () => createOffscreen(options)]
      : [() => createOffscreen(options), () => createOffscreen()];
    for (const create of attempts) {
      try {
        return acceptCanvas(create());
      } catch (error) {
        lastError = error;
      }
    }
  }
  try {
    return acceptCanvas(createCanvas());
  } catch (error) {
    lastError = error;
  }
  throw hostError(id, '无法创建离屏 Canvas：宿主需要 createOffscreenCanvas 或支持第二次 createCanvas()', lastError);
}

class MiniGameMainCanvasCreationOwner {
  readonly create: () => HostObject;
  readonly #createCanvas: HostCallback;
  readonly #id: MiniGameId;
  #operation: MiniGameMainCanvasOperation | null;
  #operationSequence: number;
  #reentryError: Error | null;

  constructor(createCanvas: HostCallback, id: MiniGameId) {
    this.#createCanvas = createCanvas;
    this.#id = id;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentryError = null;
    this.create = (): HostObject => this.#runOperation('create', (sequence) => {
      const candidate = this.#createCanvas();
      rejectThenable(candidate, `[${this.#id}] createCanvas`);
      this.#assertCommit(sequence, 'create', `[${this.#id}] main Canvas host return`);
      const prepared = prepareCanvas(candidate, this.#id);
      rejectThenable(prepared, `[${this.#id}] main Canvas preparation`);
      this.#assertCommit(sequence, 'create', `[${this.#id}] main Canvas publication`);
      return hostObject(prepared, `[${this.#id}] main Canvas`);
    });
  }

  #guardReentry(operation: MiniGameMainCanvasOperation): void {
    if (this.#operation === null) return;
    this.#reentryError ??= hostError(
      this.#id,
      `main Canvas ${this.#operation}期间拒绝${operation}重入`,
    );
    throw this.#reentryError;
  }

  #assertCommit(
    sequence: number,
    operation: MiniGameMainCanvasOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw hostError(this.#id, `${label}缺少当前main Canvas operation所有权`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(
    operation: MiniGameMainCanvasOperation,
    run: (sequence: number) => T,
  ): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[${this.#id}] main Canvas ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[${this.#id}] main Canvas ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }
}

class MiniGameGlContextOperationOwner {
  readonly create: (canvas: unknown, attributes: unknown) => unknown;
  readonly #id: MiniGameId;
  #operation: MiniGameGlContextOperation | null;
  #operationSequence: number;
  #reentryError: Error | null;

  constructor(id: MiniGameId) {
    this.#id = id;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentryError = null;
    this.create = (canvas: unknown, attributes: unknown): unknown => (
      this.#runOperation('create', (sequence) => {
        const context = getRequiredWebGL2Context(canvas, attributes, this.#id);
        rejectThenable(context, `[${this.#id}] WebGL2 context`);
        this.#assertCommit(sequence, 'create', `[${this.#id}] WebGL2 context publication`);
        return context;
      })
    );
  }

  #guardReentry(operation: MiniGameGlContextOperation): void {
    if (this.#operation === null) return;
    this.#reentryError ??= hostError(
      this.#id,
      `WebGL context ${this.#operation}期间拒绝${operation}重入`,
    );
    throw this.#reentryError;
  }

  #assertCommit(
    sequence: number,
    operation: MiniGameGlContextOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw hostError(this.#id, `${label}缺少当前WebGL context operation所有权`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(
    operation: MiniGameGlContextOperation,
    run: (sequence: number) => T,
  ): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[${this.#id}] WebGL context ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[${this.#id}] WebGL context ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }
}

class MiniGameWallClockReadOwner {
  readonly read: () => number;
  readonly #wallNow: HostCallback;
  readonly #id: MiniGameId;
  #operation: MiniGameWallClockOperation | null;
  #operationSequence: number;
  #reentryError: Error | null;

  constructor(wallNow: HostCallback, id: MiniGameId) {
    this.#wallNow = wallNow;
    this.#id = id;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentryError = null;
    this.read = (): number => this.#runOperation('read', (sequence) => {
      const value = this.#wallNow();
      rejectThenable(value, `[${this.#id}] wall clock`);
      this.#assertCommit(sequence, 'read', `[${this.#id}] wall clock host return`);
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw hostError(this.#id, 'wall clock必须返回有限数字');
      }
      return value;
    });
  }

  #guardReentry(operation: MiniGameWallClockOperation): void {
    if (this.#operation === null) return;
    this.#reentryError ??= hostError(
      this.#id,
      `wall clock ${this.#operation}期间拒绝${operation}重入`,
    );
    throw this.#reentryError;
  }

  #assertCommit(
    sequence: number,
    operation: MiniGameWallClockOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw hostError(this.#id, `${label}缺少当前wall clock operation所有权`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: MiniGameWallClockOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[${this.#id}] wall clock ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[${this.#id}] wall clock ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }
}

class MiniGameClockReadOwner {
  readonly read: () => number;
  readonly #performanceNow: HostCallback | undefined;
  readonly #wallNow: () => number;
  readonly #id: MiniGameId;
  #operation: MiniGameClockOperation | null;
  #operationSequence: number;
  #reentryError: Error | null;

  constructor(
    performanceNow: HostCallback | undefined,
    wallNow: () => number,
    id: MiniGameId,
  ) {
    this.#performanceNow = performanceNow;
    this.#wallNow = wallNow;
    this.#id = id;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentryError = null;
    this.read = (): number => {
      try {
        return this.#runOperation('read', (sequence) => {
          if (this.#performanceNow) {
            const value = this.#performanceNow();
            rejectThenable(value, `[${this.#id}] performance.now`);
            this.#assertCommit(sequence, 'read', `[${this.#id}] performance.now`);
            if (typeof value === 'number' && Number.isFinite(value)) {
              return this.#id === 'douyin' ? value / 1000 : value;
            }
          }
          const fallback = this.#wallNow();
          this.#assertCommit(sequence, 'read', `[${this.#id}] wall clock fallback`);
          return fallback;
        });
      } catch {
        return this.#wallNow();
      }
    };
  }

  #guardReentry(operation: MiniGameClockOperation): void {
    if (this.#operation === null) return;
    this.#reentryError ??= hostError(
      this.#id,
      `clock ${this.#operation}期间拒绝${operation}重入`,
    );
    throw this.#reentryError;
  }

  #assertCommit(sequence: number, operation: MiniGameClockOperation, label: string): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw hostError(this.#id, `${label}缺少当前clock operation所有权`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: MiniGameClockOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[${this.#id}] clock ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[${this.#id}] clock ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }
}

class MiniGameMediaFactoryOperationOwner {
  readonly createImage: () => unknown;
  readonly createAudio: () => unknown;
  readonly createOffscreenCanvas: (width: unknown, height: unknown) => unknown;
  readonly #createImageHost: HostCallback | null;
  readonly #createAudioHost: HostCallback | null;
  readonly #createOffscreenHost: HostCallback | null;
  readonly #createCanvasHost: HostCallback;
  readonly #mainCanvas: HostObject;
  readonly #id: MiniGameId;
  #operation: MiniGameMediaFactoryOperation | null;
  #operationSequence: number;
  #reentryError: Error | null;

  constructor(options: Readonly<{
    createImage: HostCallback | null;
    createAudio: HostCallback | null;
    createOffscreenCanvas: HostCallback | null;
    createCanvas: HostCallback;
    mainCanvas: HostObject;
    id: MiniGameId;
  }>) {
    this.#createImageHost = options.createImage;
    this.#createAudioHost = options.createAudio;
    this.#createOffscreenHost = options.createOffscreenCanvas;
    this.#createCanvasHost = options.createCanvas;
    this.#mainCanvas = options.mainCanvas;
    this.#id = options.id;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentryError = null;
    this.createImage = (): unknown => this.#createNullable('create-image', this.#createImageHost);
    this.createAudio = (): unknown => this.#createNullable('create-audio', this.#createAudioHost);
    this.createOffscreenCanvas = (width: unknown, height: unknown): unknown => (
      this.#runOperation('create-offscreen-canvas', (sequence) => {
        const result = createOffscreenCanvas(
          this.#createOffscreenHost,
          this.#createCanvasHost,
          this.#id,
          this.#mainCanvas,
          width,
          height,
        );
        rejectThenable(result, `[${this.#id}] offscreen Canvas factory`);
        this.#assertCommit(
          sequence,
          'create-offscreen-canvas',
          `[${this.#id}] offscreen Canvas publication`,
        );
        return result;
      })
    );
  }

  #createNullable(
    operation: Extract<MiniGameMediaFactoryOperation, 'create-image' | 'create-audio'>,
    host: HostCallback | null,
  ): unknown {
    try {
      return this.#runOperation(operation, (sequence) => {
        if (!host) return null;
        const result = host();
        rejectThenable(result, `[${this.#id}] ${operation} host return`);
        this.#assertCommit(sequence, operation, `[${this.#id}] ${operation} publication`);
        return result ?? null;
      });
    } catch {
      return null;
    }
  }

  #guardReentry(operation: MiniGameMediaFactoryOperation): void {
    if (this.#operation === null) return;
    this.#reentryError ??= hostError(
      this.#id,
      `media factory ${this.#operation}期间拒绝${operation}重入`,
    );
    throw this.#reentryError;
  }

  #assertCommit(
    sequence: number,
    operation: MiniGameMediaFactoryOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw hostError(this.#id, `${label}缺少当前media factory operation所有权`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(
    operation: MiniGameMediaFactoryOperation,
    run: (sequence: number) => T,
  ): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[${this.#id}] media factory ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[${this.#id}] media factory ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }
}

class MiniGameVibrationOperationOwner {
  readonly vibrate: (kind?: unknown) => boolean;
  readonly #vibrateLong: HostCallback | null;
  readonly #vibrateShort: HostCallback | null;
  readonly #id: MiniGameId;
  #operation: MiniGameVibrationOperation | null;
  #operationSequence: number;
  #reentryError: Error | null;

  constructor(
    vibrateLong: HostCallback | null,
    vibrateShort: HostCallback | null,
    id: MiniGameId,
  ) {
    this.#vibrateLong = vibrateLong;
    this.#vibrateShort = vibrateShort;
    this.#id = id;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentryError = null;
    this.vibrate = (kind: unknown = 'light'): boolean => {
      try {
        return this.#runOperation('vibrate', (sequence) => {
          const heavy = kind === 'heavy';
          const method = heavy ? this.#vibrateLong : this.#vibrateShort;
          if (!method) return false;
          const result = heavy ? method() : method({ type: 'light' });
          rejectThenable(result, `[${this.#id}] vibration host return`);
          this.#assertCommit(sequence, 'vibrate', `[${this.#id}] vibration publication`);
          return true;
        });
      } catch {
        return false;
      }
    };
  }

  #guardReentry(operation: MiniGameVibrationOperation): void {
    if (this.#operation === null) return;
    this.#reentryError ??= hostError(
      this.#id,
      `vibration ${this.#operation}期间拒绝${operation}重入`,
    );
    throw this.#reentryError;
  }

  #assertCommit(
    sequence: number,
    operation: MiniGameVibrationOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw hostError(this.#id, `${label}缺少当前vibration operation所有权`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: MiniGameVibrationOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCommit(sequence, operation, `[${this.#id}] vibration ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `[${this.#id}] vibration ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }
}

export function createMiniGamePlatform(apiValue: unknown, idValue: unknown) {
  const id = miniGameId(idValue);
  const api = hostObject(apiValue, `[${id}] API`);
  const createCanvas = optionalMethod(api, 'createCanvas');
  if (!createCanvas) throw hostError(id, '未检测到小游戏 createCanvas API');

  const touchCapabilities = Object.freeze({
    start: [optionalMethod(api, 'onTouchStart'), optionalMethod(api, 'offTouchStart')] as const,
    move: [optionalMethod(api, 'onTouchMove'), optionalMethod(api, 'offTouchMove')] as const,
    end: [optionalMethod(api, 'onTouchEnd'), optionalMethod(api, 'offTouchEnd')] as const,
    cancel: [optionalMethod(api, 'onTouchCancel'), optionalMethod(api, 'offTouchCancel')] as const,
  });
  const requiredTouchApis = [
    ['onTouchStart', touchCapabilities.start[0]],
    ['offTouchStart', touchCapabilities.start[1]],
    ['onTouchMove', touchCapabilities.move[0]],
    ['offTouchMove', touchCapabilities.move[1]],
    ['onTouchEnd', touchCapabilities.end[0]],
    ['offTouchEnd', touchCapabilities.end[1]],
  ] as const;
  const missingTouchApis = requiredTouchApis.filter(([, method]) => !method).map(([name]) => name);
  if (missingTouchApis.length > 0) {
    throw hostError(id, `宿主缺少必要触摸 API：${missingTouchApis.join('、')}`);
  }

  const mainCanvasOwner = new MiniGameMainCanvasCreationOwner(createCanvas, id);
  let canvas: HostObject;
  try {
    canvas = mainCanvasOwner.create();
  } catch (cause) {
    throw hostError(id, '创建主 Canvas 失败', cause);
  }
  const glContextOwner = new MiniGameGlContextOperationOwner(id);

  const viewportOwner = new MiniGameViewportReadOwner(api, id);
  const readViewport = viewportOwner.read;
  const wallClockOwner = new MiniGameWallClockReadOwner(Date.now.bind(Date), id);
  const getPerformance = optionalMethod(api, 'getPerformance');
  let performanceObject: HostObject | null = null;
  try {
    const candidate = getPerformance?.() ?? ownData(api, 'performance');
    if (!isThenable(candidate) && candidate != null) {
      performanceObject = hostObject(candidate, `[${id}] performance`);
    }
  } catch {
    performanceObject = null;
  }
  const performanceNow = optionalMethod(performanceObject, 'now');
  const clockOwner = new MiniGameClockReadOwner(performanceNow ?? undefined, wallClockOwner.read, id);
  const now = clockOwner.read;

  const apiRequestFrame = optionalMethod(api, 'requestAnimationFrame');
  const apiCancelFrame = optionalMethod(api, 'cancelAnimationFrame');
  const canvasRequestFrame = optionalMethod(canvas, 'requestAnimationFrame');
  const canvasCancelFrame = optionalMethod(canvas, 'cancelAnimationFrame');
  const requestHostFrame = apiRequestFrame ?? canvasRequestFrame;
  const cancelHostFrame = apiRequestFrame ? apiCancelFrame : canvasCancelFrame;
  const frames = createFrameScheduler({
    ...(requestHostFrame ? {
      request: (callback: () => void) => {
        const result = requestHostFrame(callback);
        rejectThenable(result, `[${id}] requestAnimationFrame`);
        return result;
      },
    } : {}),
    ...(cancelHostFrame ? {
      cancel: (frameId: unknown) => rejectThenable(cancelHostFrame(frameId), `[${id}] cancelAnimationFrame`),
    } : {}),
    now,
  });

  const getStorageSync = optionalMethod(api, 'getStorageSync');
  const getStorageInfoSync = optionalMethod(api, 'getStorageInfoSync');
  const setStorageSync = optionalMethod(api, 'setStorageSync');
  const removeStorageSync = optionalMethod(api, 'removeStorageSync');
  const storageOwner = new MiniGameStorageOperationOwner({
    getStorageSync,
    getStorageInfoSync,
    setStorageSync,
    removeStorageSync,
    id,
  });
  const storageRead = storageOwner.read;
  const storageWrite = storageOwner.write;
  const storageDelete = storageOwner.delete;

  const createOffscreen = optionalMethod(api, 'createOffscreenCanvas');
  const createImage = optionalMethod(api, 'createImage');
  const createAudio = optionalMethod(api, 'createInnerAudioContext');
  const vibrateLong = optionalMethod(api, 'vibrateLong');
  const vibrateShort = optionalMethod(api, 'vibrateShort');
  const shareAppMessage = optionalMethod(api, 'shareAppMessage');
  const assetReadService = new MiniGameAssetReadService(api, id);
  const readAssetBytes = assetReadService.read;
  const onWindowResize = optionalMethod(api, 'onWindowResize');
  const offWindowResize = optionalMethod(api, 'offWindowResize');
  const onShow = optionalMethod(api, 'onShow');
  const offShow = optionalMethod(api, 'offShow');
  const onHide = optionalMethod(api, 'onHide');
  const offHide = optionalMethod(api, 'offHide');
  const mediaFactoryOwner = new MiniGameMediaFactoryOperationOwner({
    createImage,
    createAudio,
    createOffscreenCanvas: createOffscreen,
    createCanvas,
    mainCanvas: canvas,
    id,
  });
  const vibrationOwner = new MiniGameVibrationOperationOwner(vibrateLong, vibrateShort, id);
  const shareOwner = new MiniGameShareOperationOwner(shareAppMessage, id);
  const inputBindingOwner = new MiniGameInputBindingOwner({
    touchCapabilities,
    canvas,
    readViewport,
    id,
  });
  const notificationBindingOwner = new MiniGameNotificationBindingOwner({
    onWindowResize,
    offWindowResize,
    onShow,
    offShow,
    onHide,
    offHide,
    id,
  });

  return createPlatformContract({
    id,
    storageConcurrency: 'single-active-runtime',
    createCanvas: () => canvas,
    createOffscreenCanvas: mediaFactoryOwner.createOffscreenCanvas,
    getWebGLContext: glContextOwner.create,
    createImage: mediaFactoryOwner.createImage,
    readAssetBytes,
    getViewport: readViewport,
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
    now,
    wallNow: wallClockOwner.read,
    bindInput: inputBindingOwner.bind,
    onResize: notificationBindingOwner.onResize,
    onShow: notificationBindingOwner.onShow,
    onHide: notificationBindingOwner.onHide,
    createAudio: mediaFactoryOwner.createAudio,
    vibrate: vibrationOwner.vibrate,
    storageGet: (key) => {
      const result = storageRead(key);
      return result.ok && result.found ? result.value : undefined;
    },
    storageSet: storageWrite,
    storageRemove: storageDelete,
    storageRead,
    storageWrite,
    storageDelete,
    share: shareOwner.share,
  });
}

export const MINI_GAME_PLATFORM_MAIN_CANVAS_AND_WEBGL_OPERATION_POLICY = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  codeStatus: 'code-written-not-run',
  mainCanvasAndWebGlUseIndependentOperationOwners: true,
  mainCanvasPublishesOnlyAfterPrepareCanvasCompletes: true,
  webGlContextPublishesOnlyAfterRequiredWebGl2Validation: true,
  borrowedMainCanvasContractRemainsUnchanged: true,
  validationStatus: 'not-run',
});

export const MINI_GAME_PLATFORM_CLOCK_OPERATION_POLICY = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  codeStatus: 'code-written-not-run',
  wallClockAndPerformanceClockUseIndependentReadOwners: true,
  dateNowPortIsCapturedOnceDuringPlatformConstruction: true,
  publicWallNowAndPerformanceFallbackShareTheSameOwner: true,
  douyinPerformanceUnitNormalizationRemainsUnchanged: true,
  frameSchedulerCallbackRescheduleSemanticsRemainUnchanged: true,
  validationStatus: 'not-run',
});

export const MINI_GAME_PLATFORM_MEDIA_AND_VIBRATION_OPERATION_POLICY = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  codeStatus: 'code-written-not-run',
  imageAudioAndOffscreenCanvasShareOneFactoryOwner: true,
  nullableMediaFactoryFallbacksRemainUnchanged: true,
  offscreenCanvasRejectsMainCanvasReuseBeforeSizing: true,
  vibrationUsesIndependentOperationOwner: true,
  lightAndHeavyVibrationVocabularyRemainsUnchanged: true,
  validationStatus: 'not-run',
});

export const MINI_GAME_PLATFORM_VIEWPORT_OPERATION_POLICY = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  codeStatus: 'code-written-not-run',
  viewportReadUsesSingleSynchronousOperationOwner: true,
  hostPropertiesAndNumericNormalizationCheckedBeforePublication: true,
  safeAreaIsCopiedFromDataPropertiesOnly: true,
  conservativeDimensionsAndPixelRatioCapRemainUnchanged: true,
  validationStatus: 'not-run',
});

export const MINI_GAME_PLATFORM_STORAGE_OPERATION_POLICY = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  codeStatus: 'code-written-not-run',
  readWriteAndDeleteShareOneOperationOwner: true,
  hostResultsAndThenablesCheckedBeforeSuccessPublication: true,
  storageInfoFailureStillFallsBackToDirectRead: true,
  storageKeysAndValueContractRemainUnchanged: true,
  validationStatus: 'not-run',
});

export const MINI_GAME_PLATFORM_SHARE_OPERATION_POLICY = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  codeStatus: 'code-written-not-run',
  pendingIdentityPublishesBeforeHostInvocation: true,
  duplicateShareWhilePendingReturnsFalse: true,
  staleSettlementCannotReleaseNewerRequest: true,
  titleAndQueryPayloadContractRemainsUnchanged: true,
  validationStatus: 'not-run',
});

export const MINI_GAME_PLATFORM_ASSET_READ_OPERATION_POLICY = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  codeStatus: 'code-written-not-run',
  eachAssetReadUsesIndependentRequestOwner: true,
  callbackStartSettlementAndBytePublicationAreSeparated: true,
  firstCallbackSettlementWinsAndLateCallbacksAreInert: true,
  concurrentReadsForDifferentAssetsRemainAllowed: true,
  localAssetPathAndArrayBufferContractsRemainUnchanged: true,
  validationStatus: 'not-run',
});

export const MINI_GAME_PLATFORM_BINDING_OPERATION_POLICY = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  codeStatus: 'code-written-not-run',
  touchBindingAndNotificationBindingUseIndependentOwners: true,
  partialTouchRegistrationRollsBackInReverseOrder: true,
  cleanupFailureRetainsExactSubscriptionForRetry: true,
  lateTouchDeliveryRemainsInertAfterCleanupStarts: true,
  oneViewportAndCanvasSnapshotIsSharedByAllTouchesInOneEvent: true,
  touchAndVisibilityVocabularyRemainUnchanged: true,
  validationStatus: 'not-run',
});
