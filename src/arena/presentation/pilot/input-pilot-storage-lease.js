import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';
import { createInputPilotStoragePort } from './input-pilot-storage-port.js';

export const INPUT_PILOT_STORAGE_LEASE_SCHEMA_VERSION = 1;

const LEASE_KEYS = new Set([
  'schemaVersion',
  'ownerId',
  'revision',
  'acquiredAtMs',
  'expiresAtMs',
]);

function validateLease(value) {
  assertKnownKeys(value, LEASE_KEYS, 'InputPilotStorageLease value');
  if (value.schemaVersion !== INPUT_PILOT_STORAGE_LEASE_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 InputPilotStorageLease schema ${String(value.schemaVersion)}。`,
    );
  }
  const acquiredAtMs = assertIntegerAtLeast(
    value.acquiredAtMs,
    0,
    'InputPilotStorageLease.acquiredAtMs',
  );
  const expiresAtMs = assertIntegerAtLeast(
    value.expiresAtMs,
    acquiredAtMs + 1,
    'InputPilotStorageLease.expiresAtMs',
  );
  return Object.freeze({
    schemaVersion: INPUT_PILOT_STORAGE_LEASE_SCHEMA_VERSION,
    ownerId: assertNonEmptyString(value.ownerId, 'InputPilotStorageLease.ownerId'),
    revision: assertIntegerAtLeast(value.revision, 1, 'InputPilotStorageLease.revision'),
    acquiredAtMs,
    expiresAtMs,
  });
}

function sameLease(left, right) {
  return left.ownerId === right.ownerId
    && left.revision === right.revision
    && left.acquiredAtMs === right.acquiredAtMs
    && left.expiresAtMs === right.expiresAtMs;
}

export class InputPilotStorageLease {
  #storage;
  #key;
  #ownerId;
  #wallNow;
  #durationMs;
  #held;
  #lease;
  #lastNow;
  #mutating;
  #destroyed;

  constructor({ storage, key, ownerId, wallNow, durationMs = 60_000 }) {
    this.#storage = createInputPilotStoragePort(storage);
    this.#key = assertNonEmptyString(key, 'InputPilotStorageLease.key');
    this.#ownerId = assertNonEmptyString(ownerId, 'InputPilotStorageLease.ownerId');
    if (typeof wallNow !== 'function') throw new TypeError('wallNow 必须是函数。');
    this.#wallNow = wallNow;
    this.#durationMs = assertIntegerAtLeast(durationMs, 1000, 'InputPilotStorageLease.durationMs');
    this.#held = false;
    this.#lease = null;
    this.#lastNow = null;
    this.#mutating = false;
    this.#destroyed = false;
    Object.freeze(this);
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('InputPilotStorageLease 已销毁。');
    if (this.#mutating) throw new Error('InputPilotStorageLease 操作不可重入。');
  }

  #now() {
    const value = this.#wallNow();
    const now = assertIntegerAtLeast(value, 0, 'InputPilotStorageLease wallNow');
    if (this.#lastNow !== null && now < this.#lastNow) {
      throw new RangeError('InputPilotStorageLease wallNow 不能在实例生命周期内倒退。');
    }
    this.#lastNow = now;
    return now;
  }

  #read() {
    const result = this.#storage.read(this.#key);
    if (!result.ok) throw new Error('InputPilotStorageLease 读取失败。');
    if (!result.found) return null;
    try {
      return validateLease(result.value);
    } catch (error) {
      let schemaVersion;
      try {
        schemaVersion = cloneFrozenData(
          result.value,
          'InputPilotStorageLease stored value',
        )?.schemaVersion;
      } catch {
        schemaVersion = undefined;
      }
      if (
        Number.isSafeInteger(schemaVersion)
        && schemaVersion > INPUT_PILOT_STORAGE_LEASE_SCHEMA_VERSION
      ) {
        const failure = new RangeError('InputPilotStorageLease 来自未来 schema。');
        failure.cause = error;
        throw failure;
      }
      return null;
    }
  }

  #writeAndConfirm(next) {
    if (!this.#storage.write(this.#key, next)) return false;
    const confirmed = this.#read();
    return confirmed !== null && sameLease(confirmed, next);
  }

  acquire() {
    this.#assertUsable();
    if (this.#held) return true;
    this.#mutating = true;
    try {
      const now = this.#now();
      const current = this.#read();
      if (current && current.expiresAtMs > now) return false;
      const next = validateLease({
        schemaVersion: INPUT_PILOT_STORAGE_LEASE_SCHEMA_VERSION,
        ownerId: this.#ownerId,
        revision: (current?.revision ?? 0) + 1,
        acquiredAtMs: now,
        expiresAtMs: now + this.#durationMs,
      });
      if (!this.#writeAndConfirm(next)) return false;
      this.#held = true;
      this.#lease = next;
      return true;
    } finally {
      this.#mutating = false;
    }
  }

  assertHeld() {
    this.#assertUsable();
    if (!this.#held || !this.#lease) throw new Error('InputPilotStorageLease 未持有。');
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
      throw new Error('InputPilotStorageLease 已过期或被其他页面取代。');
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
      });
      if (!this.#writeAndConfirm(next)) {
        this.#held = false;
        this.#lease = null;
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
      if (!current || !sameLease(current, this.#lease)) {
        this.#held = false;
        this.#lease = null;
        return false;
      }
      const released = this.#storage.delete(this.#key);
      this.#held = false;
      this.#lease = null;
      return released;
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
    if (this.#mutating) throw new Error('操作期间不能销毁 InputPilotStorageLease。');
    let released = true;
    try {
      released = this.release();
    } finally {
      this.#held = false;
      this.#lease = null;
      this.#storage = null;
      this.#wallNow = null;
      this.#ownerId = null;
      this.#key = null;
      this.#destroyed = true;
    }
    if (!released) throw new Error('InputPilotStorageLease 未能确认释放。');
  }
}
