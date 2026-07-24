import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
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
  #lastNow: number | null = null;
  #mutating = false;
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

  #assertUsable(): void {
    if (this.#destroyed) throw new Error(`${this.#label} 已销毁。`);
    if (this.#mutating) throw new Error(`${this.#label} 操作不可重入。`);
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
    const now = assertIntegerAtLeast(
      this.#requireWallNow()(),
      0,
      `${this.#label} wallNow`,
    );
    if (this.#lastNow !== null && now < this.#lastNow) {
      throw new RangeError(`${this.#label} wallNow 不能在实例生命周期内倒退。`);
    }
    this.#lastNow = now;
    return now;
  }

  #read(): StoredLease | null {
    const result = this.#requireStorage().read(this.#requireKey());
    if (!result.ok) throw new Error(`${this.#label} 读取失败。`);
    if (!result.found) return null;
    try {
      return validateLease(result.value, this.#label);
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
  }

  #writeAndConfirm(next: StoredLease): boolean {
    let writeThrew = false;
    let writeError: unknown = null;
    try {
      this.#requireStorage().write(this.#requireKey(), next);
    } catch (error) {
      writeThrew = true;
      writeError = error;
    }
    const confirmed = this.#read();
    if (confirmed !== null && sameLease(confirmed, next)) return true;
    if (writeThrew) throw normalizeLeaseError(writeError, `${this.#label} 写入失败`);
    return false;
  }

  #cleanupAcquireCandidate(candidate: StoredLease): boolean {
    try {
      const current = this.#read();
      if (!current || !sameLease(current, candidate)) return true;
      try {
        this.#requireStorage().delete(this.#requireKey());
      } catch {
        // A host may mutate before throwing. The authoritative read-back below
        // decides whether cleanup succeeded.
      }
      const remaining = this.#read();
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
    if (!this.#held || !this.#lease) return true;
    const current = this.#read();
    if (!current) {
      this.#held = false;
      this.#lease = null;
      return true;
    }
    if (!sameLease(current, this.#lease)) {
      this.#held = false;
      this.#lease = null;
      return true;
    }
    let deleteThrew = false;
    let deleteError: unknown = null;
    try {
      this.#requireStorage().delete(this.#requireKey());
    } catch (error) {
      deleteThrew = true;
      deleteError = error;
    }
    const remaining = this.#read();
    if (!remaining) {
      this.#held = false;
      this.#lease = null;
      return true;
    }
    if (!sameLease(remaining, this.#lease)) {
      this.#held = false;
      this.#lease = null;
      return false;
    }
    if (deleteThrew) throw normalizeLeaseError(deleteError, `${this.#label} 释放失败`);
    return false;
  }

  acquire(): boolean {
    this.#assertUsable();
    this.#mutating = true;
    try {
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
          failure.cleanupError = new Error(`${this.#label} 获取失败且候选租约未确认清理。`);
        }
        throw failure;
      }
      if (!confirmed) return false;
      this.#held = true;
      this.#lease = next;
      return true;
    } finally {
      this.#mutating = false;
    }
  }

  assertHeld(): true {
    this.#assertUsable();
    this.#mutating = true;
    try {
      return this.#assertHeldInsideMutation();
    } finally {
      this.#mutating = false;
    }
  }

  renew(): boolean {
    this.#assertUsable();
    this.#mutating = true;
    try {
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
      if (!this.#writeAndConfirm(next)) {
        const stillCurrent = this.#read();
        if (!stillCurrent || !sameLease(stillCurrent, current)) {
          this.#held = false;
          this.#lease = null;
        }
        return false;
      }
      this.#lease = next;
      return true;
    } finally {
      this.#mutating = false;
    }
  }

  release(): boolean {
    this.#assertUsable();
    this.#mutating = true;
    try {
      return this.#releaseInsideMutation();
    } finally {
      this.#mutating = false;
    }
  }

  getStatus(): Readonly<SynchronousStorageLeaseStatus> {
    this.#assertUsable();
    return Object.freeze({
      held: this.#held,
      revision: this.#lease?.revision ?? null,
      expiresAtMs: this.#lease?.expiresAtMs ?? null,
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    if (this.#mutating) throw new Error(`操作期间不能销毁 ${this.#label}。`);
    this.#mutating = true;
    try {
      if (!this.#releaseInsideMutation()) throw new Error(`${this.#label} 未能确认释放。`);
      this.#held = false;
      this.#lease = null;
      this.#storage = null;
      this.#wallNow = null;
      this.#ownerId = null;
      this.#holderId = null;
      this.#takeoverSameOwner = false;
      this.#key = null;
      this.#destroyed = true;
    } finally {
      this.#mutating = false;
    }
  }
}
