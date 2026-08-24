import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertSynchronousReturn,
  cloneFrozenData,
  createSynchronousStoragePort,
} from '@number-strategy-jump/arena-contracts';
import type {
  SynchronousStoragePort,
} from '@number-strategy-jump/arena-contracts';

const LEGACY_SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION = 1;
export const SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION = 2;

const OPTION_KEYS = new Set([
  'storage',
  'key',
  'ownerId',
  'holderId',
  'wallNow',
  'durationMs',
  'takeoverSameOwner',
  'label',
]);
const REQUIRED_OPTION_KEYS = Object.freeze(['storage', 'key', 'ownerId', 'wallNow'] as const);
const LEGACY_LEASE_KEYS = new Set([
  'schemaVersion',
  'ownerId',
  'revision',
  'acquiredAtMs',
  'expiresAtMs',
]);
const LEASE_KEYS = new Set([...LEGACY_LEASE_KEYS, 'holderId']);

interface StoredLease {
  readonly schemaVersion: typeof SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION;
  readonly ownerId: string;
  readonly holderId: string;
  readonly revision: number;
  readonly acquiredAtMs: number;
  readonly expiresAtMs: number;
}

export interface SynchronousStorageLeaseOptions {
  readonly storage: unknown;
  readonly key: string;
  readonly ownerId: string;
  readonly holderId?: string;
  readonly wallNow: () => number;
  readonly durationMs?: number;
  readonly takeoverSameOwner?: boolean;
  readonly label?: string;
}

export interface SynchronousStorageLeaseStatus {
  readonly held: boolean;
  readonly revision: number | null;
  readonly expiresAtMs: number | null;
}

type SynchronousStorageLeaseOperation =
  | 'acquire'
  | 'assert-held'
  | 'renew'
  | 'release'
  | 'status-read'
  | 'failed-closed-read'
  | 'destroy';

export const SYNCHRONOUS_STORAGE_LEASE_LIFECYCLE = Object.freeze({
  operationGuardPrecedesLifecycleAndInputValidation: true,
  publicReadsRejectLeaseTransactionIntermediateState: true,
  callbackReentryIsSticky: true,
  storedValueValidationCheckedBeforeCrossPortProgress: true,
  publicStateWaitsForCallbackClosure: true,
  failedLeaseRetainsCleanupIdentity: true,
  ambiguousRenewRetainsBoundedCleanupCandidates: true,
  destroyFastPathChecksOperationBeforeIdempotence: true,
  wallClockUsesSharedSynchronousReturnBoundary: true,
  failedClosedStateIsOwnerObservable: true,
  validationStatus: 'not-run',
} as const);

interface NormalizedOptions {
  readonly storage: unknown;
  readonly key: unknown;
  readonly ownerId: unknown;
  readonly holderId: unknown;
  readonly wallNow: unknown;
  readonly durationMs: unknown;
  readonly takeoverSameOwner: unknown;
  readonly label: unknown;
}

function optionValue(
  descriptors: Record<string, PropertyDescriptor>,
  key: string,
  fallback?: unknown,
): unknown {
  const descriptor = descriptors[key];
  return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ? descriptor.value
    : fallback;
}

function normalizeOptions(value: unknown): NormalizedOptions {
  assertKnownKeys(value, OPTION_KEYS, 'SynchronousStorageLease options');
  const descriptors = Object.getOwnPropertyDescriptors(value as object);
  for (const key of REQUIRED_OPTION_KEYS) {
    if (!descriptors[key]) {
      throw new TypeError(`SynchronousStorageLease options.${key} 必须是可枚举数据字段。`);
    }
  }
  const ownerId = optionValue(descriptors, 'ownerId');
  return Object.freeze({
    storage: optionValue(descriptors, 'storage'),
    key: optionValue(descriptors, 'key'),
    ownerId,
    holderId: optionValue(descriptors, 'holderId', ownerId),
    wallNow: optionValue(descriptors, 'wallNow'),
    durationMs: optionValue(descriptors, 'durationMs', 60_000),
    takeoverSameOwner: optionValue(descriptors, 'takeoverSameOwner', false),
    label: optionValue(descriptors, 'label', 'SynchronousStorageLease'),
  });
}

function dataField(
  descriptors: Record<string, PropertyDescriptor>,
  key: string,
  label: string,
): unknown {
  const descriptor = descriptors[key];
  if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
    throw new TypeError(`${label}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function validateLease(value: unknown, label: string): StoredLease {
  assertKnownKeys(value, LEASE_KEYS, `${label} value`);
  const descriptors = Object.getOwnPropertyDescriptors(value as object);
  const schemaVersion = dataField(descriptors, 'schemaVersion', label);
  if (
    schemaVersion !== LEGACY_SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION
    && schemaVersion !== SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION
  ) {
    throw new RangeError(`${label} 不支持 schema ${String(schemaVersion)}。`);
  }
  if (schemaVersion === LEGACY_SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION) {
    assertKnownKeys(value, LEGACY_LEASE_KEYS, `${label} value`);
  }
  const acquiredAtMs = assertIntegerAtLeast(
    dataField(descriptors, 'acquiredAtMs', label),
    0,
    `${label}.acquiredAtMs`,
  );
  const expiresAtMs = assertIntegerAtLeast(
    dataField(descriptors, 'expiresAtMs', label),
    acquiredAtMs + 1,
    `${label}.expiresAtMs`,
  );
  const ownerId = assertNonEmptyString(
    dataField(descriptors, 'ownerId', label),
    `${label}.ownerId`,
  );
  return Object.freeze({
    schemaVersion: SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION,
    ownerId,
    holderId: schemaVersion === LEGACY_SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION
      ? ownerId
      : assertNonEmptyString(
        dataField(descriptors, 'holderId', label),
        `${label}.holderId`,
      ),
    revision: assertIntegerAtLeast(
      dataField(descriptors, 'revision', label),
      1,
      `${label}.revision`,
    ),
    acquiredAtMs,
    expiresAtMs,
  });
}

function sameLease(left: StoredLease, right: StoredLease): boolean {
  return left.ownerId === right.ownerId
    && left.holderId === right.holderId
    && left.revision === right.revision
    && left.acquiredAtMs === right.acquiredAtMs
    && left.expiresAtMs === right.expiresAtMs;
}

function normalizeLeaseError(value: unknown, message: string): Error {
  if (value instanceof Error) return value;
  const error = new Error(`${message}：${String(value)}`) as Error & { originalError?: unknown };
  error.originalError = value;
  return error;
}

export class SynchronousStorageLease {
  #storage: Readonly<SynchronousStoragePort> | null;
  #key: string | null;
  #ownerId: string | null;
  #holderId: string | null;
  #wallNow: (() => number) | null;
  readonly #durationMs: number;
  readonly #label: string;
  #takeoverSameOwner: boolean;
  #held = false;
  #lease: StoredLease | null = null;
  #cleanupLeaseCandidates: StoredLease[] = [];
  #lastNow: number | null = null;
  #operation: SynchronousStorageLeaseOperation | null = null;
  #failed = false;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #destroyed = false;

  constructor(options: SynchronousStorageLeaseOptions) {
    const normalized = normalizeOptions(options);
    this.#label = assertNonEmptyString(
      normalized.label,
      'SynchronousStorageLease.label',
    );
    this.#storage = createSynchronousStoragePort(normalized.storage, { label: this.#label });
    this.#key = assertNonEmptyString(normalized.key, `${this.#label}.key`);
    this.#ownerId = assertNonEmptyString(normalized.ownerId, `${this.#label}.ownerId`);
    this.#holderId = assertNonEmptyString(normalized.holderId, `${this.#label}.holderId`);
    if (typeof normalized.wallNow !== 'function') throw new TypeError('wallNow 必须是函数。');
    this.#wallNow = normalized.wallNow as () => number;
    this.#durationMs = assertIntegerAtLeast(
      normalized.durationMs,
      1000,
      `${this.#label}.durationMs`,
    );
    if (typeof normalized.takeoverSameOwner !== 'boolean') {
      throw new TypeError(`${this.#label}.takeoverSameOwner 必须是布尔值。`);
    }
    if (normalized.takeoverSameOwner && this.#holderId === this.#ownerId) {
      throw new RangeError(
        `${this.#label}.holderId 在 same-owner takeover 模式下必须唯一且不能等于 ownerId。`,
      );
    }
    this.#takeoverSameOwner = normalized.takeoverSameOwner;
    Object.freeze(this);
  }

  #recordReentry(requestedOperation: SynchronousStorageLeaseOperation): Error {
    this.#reentrySequence += 1;
    if (this.#reentryError === null) {
      this.#reentryError = new Error(
        `${this.#label} ${String(this.#operation)}期间不可重入${requestedOperation}。`,
      );
    }
    return this.#reentryError;
  }

  #runOperation<T>(
    operation: SynchronousStorageLeaseOperation,
    callback: () => T,
    options: Readonly<{ allowDestroyed?: boolean; allowFailed?: boolean }> = {},
  ): T {
    if (this.#operation !== null) throw this.#recordReentry(operation);
    this.#operation = operation;
    const sequence = this.#reentrySequence;
    try {
      if (!options.allowDestroyed && this.#destroyed) {
        throw new Error(`${this.#label} 已销毁。`);
      }
      if (!options.allowFailed && this.#failed) {
        throw new Error(`${this.#label} 已失败关闭。`);
      }
      try {
        const result = callback();
        this.#assertNoReentrySince(sequence, operation);
        return result;
      } catch (error) {
        if (this.#reentrySequence !== sequence) {
          this.#failed = true;
          throw this.#reentryError ?? error;
        }
        throw error;
      }
    } finally {
      this.#operation = null;
      this.#reentryError = null;
    }
  }

  #assertNoReentrySince(sequence: number, operation: string): void {
    if (this.#reentrySequence === sequence) return;
    this.#failed = true;
    throw this.#reentryError ?? new Error(`${this.#label} ${operation}期间发生重入。`);
  }

  #assertAuthorityCommitReady(operation: SynchronousStorageLeaseOperation): void {
    if (this.#reentryError !== null) {
      this.#failed = true;
      throw this.#reentryError;
    }
    if (this.#operation !== operation) {
      throw new Error(`${this.#label} ${operation}缺少权威操作所有权。`);
    }
  }

  #retainCleanupCandidate(candidate: StoredLease): void {
    if (this.#cleanupLeaseCandidates.some((current) => sameLease(current, candidate))) return;
    this.#cleanupLeaseCandidates.push(candidate);
    if (this.#cleanupLeaseCandidates.length > 2) {
      throw new Error(`${this.#label} 清理候选超过旧/新两代上限。`);
    }
  }

  #ownsLease(candidate: StoredLease): boolean {
    return (this.#lease !== null && sameLease(this.#lease, candidate))
      || this.#cleanupLeaseCandidates.some((current) => sameLease(current, candidate));
  }

  #clearOwnedLeaseState(): void {
    if (this.#reentryError !== null) {
      this.#failed = true;
      throw this.#reentryError;
    }
    if (this.#operation !== 'release' && this.#operation !== 'destroy') {
      throw new Error(`${this.#label} 清理租约缺少release/destroy操作所有权。`);
    }
    this.#held = false;
    this.#lease = null;
    this.#cleanupLeaseCandidates = [];
  }

  #requireStorage(): Readonly<SynchronousStoragePort> {
    if (!this.#storage) throw new Error(`${this.#label} 已销毁。`);
    return this.#storage;
  }

  #requireWallNow(): () => number {
    if (!this.#wallNow) throw new Error(`${this.#label} 已销毁。`);
    return this.#wallNow;
  }

  #requireKey(): string {
    if (!this.#key) throw new Error(`${this.#label} 已销毁。`);
    return this.#key;
  }

  #now(): number {
    const sequence = this.#reentrySequence;
    let rawNow: unknown;
    try {
      rawNow = this.#requireWallNow()();
    } catch (error) {
      this.#assertNoReentrySince(sequence, 'wallNow回调');
      throw error;
    }
    this.#assertNoReentrySince(sequence, 'wallNow回调');
    assertSynchronousReturn(rawNow, `${this.#label} wallNow`);
    const now = assertIntegerAtLeast(rawNow, 0, `${this.#label} wallNow`);
    if (this.#lastNow !== null && now < this.#lastNow) {
      throw new RangeError(`${this.#label} wallNow 不能在实例生命周期内倒退。`);
    }
    this.#lastNow = now;
    return now;
  }

  #read(): StoredLease | null {
    const sequence = this.#reentrySequence;
    let result: ReturnType<SynchronousStoragePort['read']>;
    try {
      result = this.#requireStorage().read(this.#requireKey());
    } catch (error) {
      this.#assertNoReentrySince(sequence, 'Storage读取');
      throw error;
    }
    this.#assertNoReentrySince(sequence, 'Storage读取');
    if (!result.ok) throw new Error(`${this.#label} 读取失败。`);
    if (!result.found) return null;
    let validated: StoredLease;
    try {
      validated = validateLease(result.value, this.#label);
    } catch (error) {
      let schemaVersion: unknown;
      try {
        const cloned = cloneFrozenData(result.value, `${this.#label} stored value`);
        schemaVersion = cloned && typeof cloned === 'object'
          ? (cloned as Record<string, unknown>).schemaVersion
          : undefined;
      } catch {
        schemaVersion = undefined;
      }
      this.#assertNoReentrySince(sequence, 'Storage读取值校验');
      if (
        Number.isSafeInteger(schemaVersion)
        && (schemaVersion as number) > SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION
      ) {
        const failure = new RangeError(`${this.#label} 来自未来 schema.`);
        failure.cause = error;
        throw failure;
      }
      return null;
    }
    this.#assertNoReentrySince(sequence, 'Storage读取值校验');
    return validated;
  }

  #writeAndConfirm(next: StoredLease): boolean {
    let writeThrew = false;
    let writeError: unknown = null;
    const writeSequence = this.#reentrySequence;
    try {
      this.#requireStorage().write(this.#requireKey(), next);
    } catch (error) {
      writeThrew = true;
      writeError = error;
    }
    const confirmed = this.#read();
    this.#assertNoReentrySince(writeSequence, 'Storage写入');
    if (confirmed !== null && sameLease(confirmed, next)) return true;
    if (writeThrew) throw normalizeLeaseError(writeError, `${this.#label} 写入失败`);
    return false;
  }

  #cleanupAcquireCandidate(candidate: StoredLease): boolean {
    try {
      const current = this.#read();
      if (!current || !sameLease(current, candidate)) return true;
      const deleteSequence = this.#reentrySequence;
      try {
        this.#requireStorage().delete(this.#requireKey());
      } catch {
        // A host may mutate before throwing. The authoritative read-back below
        // decides whether cleanup succeeded.
      }
      const remaining = this.#read();
      this.#assertNoReentrySince(deleteSequence, '候选租约清理');
      return !remaining || !sameLease(remaining, candidate);
    } catch {
      return false;
    }
  }

  #assertHeldInsideMutation(): true {
    if (!this.#held || !this.#lease) throw new Error(`${this.#label} 未持有。`);
    const now = this.#now();
    const current = this.#read();
    if (
      !current
      || !sameLease(current, this.#lease)
      || current.ownerId !== this.#ownerId
      || current.expiresAtMs <= now
    ) {
      this.#held = false;
      this.#lease = null;
      throw new Error(`${this.#label} 已过期或被其他页面取代。`);
    }
    return true;
  }

  #releaseInsideMutation(): boolean {
    if (this.#lease === null && this.#cleanupLeaseCandidates.length === 0) return true;
    const current = this.#read();
    if (!current) {
      this.#clearOwnedLeaseState();
      return true;
    }
    if (!this.#ownsLease(current)) {
      this.#clearOwnedLeaseState();
      return true;
    }
    let deleteThrew = false;
    let deleteError: unknown = null;
    const deleteSequence = this.#reentrySequence;
    try {
      this.#requireStorage().delete(this.#requireKey());
    } catch (error) {
      deleteThrew = true;
      deleteError = error;
    }
    const remaining = this.#read();
    this.#assertNoReentrySince(deleteSequence, '租约释放');
    if (!remaining) {
      this.#clearOwnedLeaseState();
      return true;
    }
    if (!sameLease(remaining, current)) {
      this.#clearOwnedLeaseState();
      return false;
    }
    if (deleteThrew) throw normalizeLeaseError(deleteError, `${this.#label} 释放失败`);
    return false;
  }

  acquire(): boolean {
    return this.#runOperation('acquire', () => {
      const operationSequence = this.#reentrySequence;
      if (this.#held) return this.#assertHeldInsideMutation();
      const now = this.#now();
      const current = this.#read();
      if (
        current
        && current.expiresAtMs > now
        && !(this.#takeoverSameOwner && current.ownerId === this.#ownerId)
      ) return false;
      const next = validateLease({
        schemaVersion: SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION,
        ownerId: this.#ownerId,
        holderId: this.#holderId,
        revision: (current?.revision ?? 0) + 1,
        acquiredAtMs: now,
        expiresAtMs: now + this.#durationMs,
      }, this.#label);
      let confirmed = false;
      try {
        confirmed = this.#writeAndConfirm(next);
      } catch (error) {
        const failure = normalizeLeaseError(error, `${this.#label} 获取失败`) as Error & {
          cleanupError?: Error;
        };
        if (!this.#cleanupAcquireCandidate(next)) {
          this.#retainCleanupCandidate(next);
          this.#failed = true;
          failure.cleanupError = new Error(`${this.#label} 获取失败且候选租约未确认清理。`);
        }
        throw failure;
      }
      if (!confirmed) return false;
      this.#assertNoReentrySince(operationSequence, '获取');
      this.#assertAuthorityCommitReady('acquire');
      this.#held = true;
      this.#lease = next;
      this.#cleanupLeaseCandidates = [];
      return true;
    });
  }

  assertHeld(): true {
    return this.#runOperation('assert-held', () => {
      const operationSequence = this.#reentrySequence;
      const held = this.#assertHeldInsideMutation();
      this.#assertNoReentrySince(operationSequence, '持有复核');
      return held;
    });
  }

  renew(): boolean {
    return this.#runOperation('renew', () => {
      const operationSequence = this.#reentrySequence;
      if (!this.#held || !this.#lease) return false;
      const now = this.#now();
      const current = this.#read();
      if (!current || !sameLease(current, this.#lease) || current.expiresAtMs <= now) {
        this.#held = false;
        this.#lease = null;
        return false;
      }
      const next = validateLease({
        schemaVersion: current.schemaVersion,
        ownerId: current.ownerId,
        holderId: current.holderId,
        revision: current.revision + 1,
        acquiredAtMs: now,
        expiresAtMs: now + this.#durationMs,
      }, this.#label);
      let confirmed = false;
      try {
        confirmed = this.#writeAndConfirm(next);
      } catch (error) {
        this.#retainCleanupCandidate(current);
        this.#retainCleanupCandidate(next);
        try {
          const persisted = this.#read();
          if (persisted !== null && sameLease(persisted, next)) {
            this.#held = true;
            this.#lease = next;
          } else if (persisted !== null && sameLease(persisted, current)) {
            this.#held = true;
            this.#lease = current;
          }
        } catch {
          // Destroy will match the current storage value against the bounded
          // old/new cleanup candidates before deleting anything.
        }
        this.#failed = true;
        throw error;
      }
      if (!confirmed) {
        const stillCurrent = this.#read();
        if (!stillCurrent || !sameLease(stillCurrent, current)) {
          this.#held = false;
          this.#lease = null;
        }
        return false;
      }
      this.#assertNoReentrySince(operationSequence, '续租');
      this.#assertAuthorityCommitReady('renew');
      this.#lease = next;
      this.#cleanupLeaseCandidates = [];
      return true;
    });
  }

  release(): boolean {
    return this.#runOperation('release', () => {
      const operationSequence = this.#reentrySequence;
      const released = this.#releaseInsideMutation();
      this.#assertNoReentrySince(operationSequence, '释放');
      return released;
    });
  }

  getStatus(): Readonly<SynchronousStorageLeaseStatus> {
    return this.#runOperation('status-read', () => Object.freeze({
      held: this.#held,
      revision: this.#lease?.revision ?? null,
      expiresAtMs: this.#lease?.expiresAtMs ?? null,
    }));
  }

  isFailedClosed(): boolean {
    return this.#runOperation('failed-closed-read', () => this.#failed, {
      allowFailed: true,
    });
  }

  destroy(): void {
    this.#runOperation('destroy', () => {
      if (this.#destroyed) return;
      const operationSequence = this.#reentrySequence;
      if (!this.#releaseInsideMutation()) throw new Error(`${this.#label} 未能确认释放。`);
      this.#assertNoReentrySince(operationSequence, '销毁');
      this.#assertAuthorityCommitReady('destroy');
      this.#held = false;
      this.#lease = null;
      this.#cleanupLeaseCandidates = [];
      this.#storage = null;
      this.#wallNow = null;
      this.#ownerId = null;
      this.#holderId = null;
      this.#takeoverSameOwner = false;
      this.#key = null;
      this.#failed = false;
      this.#destroyed = true;
    }, { allowDestroyed: true, allowFailed: true });
  }
}
