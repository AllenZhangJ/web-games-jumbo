import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../rules/definition-utils.js';
import { createSynchronousStoragePort } from './synchronous-storage-port.js';

const LEGACY_SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION = 1;
export const SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION = 2;

const LEGACY_LEASE_KEYS = new Set([
  'schemaVersion',
  'ownerId',
  'revision',
  'acquiredAtMs',
  'expiresAtMs',
]);
const LEASE_KEYS = new Set([...LEGACY_LEASE_KEYS, 'holderId']);

function validateLease(value, label) {
  const schemaVersion = value?.schemaVersion;
  if (
    schemaVersion !== LEGACY_SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION
    && schemaVersion !== SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION
  ) {
    throw new RangeError(`${label} 不支持 schema ${String(schemaVersion)}。`);
  }
  assertKnownKeys(
    value,
    schemaVersion === LEGACY_SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION
      ? LEGACY_LEASE_KEYS
      : LEASE_KEYS,
    `${label} value`,
  );
  const acquiredAtMs = assertIntegerAtLeast(
    value.acquiredAtMs,
    0,
    `${label}.acquiredAtMs`,
  );
  const expiresAtMs = assertIntegerAtLeast(
    value.expiresAtMs,
    acquiredAtMs + 1,
    `${label}.expiresAtMs`,
  );
  const ownerId = assertNonEmptyString(value.ownerId, `${label}.ownerId`);
  return Object.freeze({
    schemaVersion: SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION,
    ownerId,
    holderId: schemaVersion === LEGACY_SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION
      ? ownerId
      : assertNonEmptyString(value.holderId, `${label}.holderId`),
    revision: assertIntegerAtLeast(value.revision, 1, `${label}.revision`),
    acquiredAtMs,
    expiresAtMs,
  });
}

function sameLease(left, right) {
  return left.ownerId === right.ownerId
    && left.holderId === right.holderId
    && left.revision === right.revision
    && left.acquiredAtMs === right.acquiredAtMs
    && left.expiresAtMs === right.expiresAtMs;
}

function normalizeLeaseError(value, message) {
  if (value instanceof Error) return value;
  const error = new Error(`${message}：${String(value)}`);
  error.originalError = value;
  return error;
}

export class SynchronousStorageLease {
  #storage;
  #key;
  #ownerId;
  #holderId;
  #wallNow;
  #durationMs;
  #label;
  #takeoverSameOwner;
  #held;
  #lease;
  #lastNow;
  #mutating;
  #destroyed;

  constructor({
    storage,
    key,
    ownerId,
    holderId = ownerId,
    wallNow,
    durationMs = 60_000,
    takeoverSameOwner = false,
    label: labelValue = 'SynchronousStorageLease',
  }) {
    this.#label = assertNonEmptyString(labelValue, 'SynchronousStorageLease.label');
    this.#storage = createSynchronousStoragePort(storage, { label: this.#label });
    this.#key = assertNonEmptyString(key, `${this.#label}.key`);
    this.#ownerId = assertNonEmptyString(ownerId, `${this.#label}.ownerId`);
    this.#holderId = assertNonEmptyString(holderId, `${this.#label}.holderId`);
    if (typeof wallNow !== 'function') throw new TypeError('wallNow 必须是函数。');
    this.#wallNow = wallNow;
    this.#durationMs = assertIntegerAtLeast(
      durationMs,
      1000,
      `${this.#label}.durationMs`,
    );
    if (typeof takeoverSameOwner !== 'boolean') {
      throw new TypeError(`${this.#label}.takeoverSameOwner 必须是布尔值。`);
    }
    if (takeoverSameOwner && this.#holderId === this.#ownerId) {
      throw new RangeError(
        `${this.#label}.holderId 在 same-owner takeover 模式下必须唯一且不能等于 ownerId。`,
      );
    }
    this.#takeoverSameOwner = takeoverSameOwner;
    this.#held = false;
    this.#lease = null;
    this.#lastNow = null;
    this.#mutating = false;
    this.#destroyed = false;
    Object.freeze(this);
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error(`${this.#label} 已销毁。`);
    if (this.#mutating) throw new Error(`${this.#label} 操作不可重入。`);
  }

  #now() {
    const now = assertIntegerAtLeast(this.#wallNow(), 0, `${this.#label} wallNow`);
    if (this.#lastNow !== null && now < this.#lastNow) {
      throw new RangeError(`${this.#label} wallNow 不能在实例生命周期内倒退。`);
    }
    this.#lastNow = now;
    return now;
  }

  #read() {
    const result = this.#storage.read(this.#key);
    if (!result.ok) throw new Error(`${this.#label} 读取失败。`);
    if (!result.found) return null;
    try {
      return validateLease(result.value, this.#label);
    } catch (error) {
      let schemaVersion;
      try {
        schemaVersion = cloneFrozenData(
          result.value,
          `${this.#label} stored value`,
        )?.schemaVersion;
      } catch {
        schemaVersion = undefined;
      }
      if (
        Number.isSafeInteger(schemaVersion)
        && schemaVersion > SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION
      ) {
        const failure = new RangeError(`${this.#label} 来自未来 schema。`);
        failure.cause = error;
        throw failure;
      }
      return null;
    }
  }

  #writeAndConfirm(next) {
    let writeThrew = false;
    let writeError = null;
    try {
      this.#storage.write(this.#key, next);
    } catch (error) {
      writeThrew = true;
      writeError = error;
    }
    const confirmed = this.#read();
    if (confirmed !== null && sameLease(confirmed, next)) return true;
    if (writeThrew) throw normalizeLeaseError(writeError, `${this.#label} 写入失败`);
    return false;
  }

  #cleanupAcquireCandidate(candidate) {
    try {
      const current = this.#read();
      if (!current || !sameLease(current, candidate)) return true;
      try {
        this.#storage.delete(this.#key);
      } catch {
        // Deletion may have completed before the host threw; read-back below
        // is the authority for whether cleanup succeeded.
      }
      const remaining = this.#read();
      return !remaining || !sameLease(remaining, candidate);
    } catch {
      return false;
    }
  }

  acquire() {
    this.#assertUsable();
    if (this.#held) return this.assertHeld();
    this.#mutating = true;
    try {
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
        const failure = normalizeLeaseError(error, `${this.#label} 获取失败`);
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

  assertHeld() {
    this.#assertUsable();
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

  renew() {
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
        ...current,
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

  release() {
    this.#assertUsable();
    this.#mutating = true;
    try {
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
      let deleteError = null;
      try {
        this.#storage.delete(this.#key);
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
    } finally {
      this.#mutating = false;
    }
  }

  getStatus() {
    this.#assertUsable();
    return Object.freeze({
      held: this.#held,
      revision: this.#lease?.revision ?? null,
      expiresAtMs: this.#lease?.expiresAtMs ?? null,
    });
  }

  destroy() {
    if (this.#destroyed) return;
    if (this.#mutating) throw new Error(`操作期间不能销毁 ${this.#label}。`);
    if (!this.release()) throw new Error(`${this.#label} 未能确认释放。`);
    this.#held = false;
    this.#lease = null;
    this.#storage = null;
    this.#wallNow = null;
    this.#ownerId = null;
    this.#holderId = null;
    this.#takeoverSameOwner = false;
    this.#key = null;
    this.#destroyed = true;
  }
}
