import { describe, expect, it } from 'vitest';
import {
  SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION,
  SynchronousStorageLease,
} from '../src/index.js';

function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value)) as T;
}

function storageHarness() {
  const values = new Map<string, unknown>();
  let onRead: (() => void) | null = null;
  let onWrite: (() => void) | null = null;
  let onDelete: (() => void) | null = null;
  let deleteResult = true;
  const port = {
    storageRead(key: string) {
      onRead?.();
      return values.has(key)
        ? { ok: true, found: true, value: clone(values.get(key)) }
        : { ok: true, found: false, value: undefined };
    },
    storageWrite(key: string, value: unknown) {
      values.set(key, clone(value));
      onWrite?.();
      return true;
    },
    storageDelete(key: string) {
      if (deleteResult) values.delete(key);
      onDelete?.();
      return deleteResult;
    },
  };
  return {
    values,
    port,
    setOnRead(value: (() => void) | null) { onRead = value; },
    setOnWrite(value: (() => void) | null) { onWrite = value; },
    setOnDelete(value: (() => void) | null) { onDelete = value; },
    setDeleteResult(value: boolean) { deleteResult = value; },
  };
}

describe('SynchronousStorageLease', () => {
  it('rejects option accessors and unknown fields without executing them', () => {
    let getterCalls = 0;
    const options = {
      storage: storageHarness().port,
      key: 'lease',
      ownerId: 'owner',
      wallNow: () => 1_000,
      get durationMs() {
        getterCalls += 1;
        return 1_000;
      },
    };
    expect(() => new SynchronousStorageLease(options)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
    expect(() => new SynchronousStorageLease({
      storage: storageHarness().port,
      key: 'lease',
      ownerId: 'owner',
      wallNow: () => 1_000,
      extra: true,
    } as never)).toThrow(/不支持字段/);
  });

  it('competes deterministically, upgrades v1 and fences a stale same-owner holder', () => {
    const harness = storageHarness();
    harness.values.set('lease', {
      schemaVersion: 1,
      ownerId: 'owner',
      revision: 3,
      acquiredAtMs: 1_000,
      expiresAtMs: 2_000,
    });
    const blocked = new SynchronousStorageLease({
      storage: harness.port,
      key: 'lease',
      ownerId: 'other',
      wallNow: () => 1_500,
    });
    expect(blocked.acquire()).toBe(false);
    const replacement = new SynchronousStorageLease({
      storage: harness.port,
      key: 'lease',
      ownerId: 'owner',
      holderId: 'runtime-b',
      wallNow: () => 1_500,
      takeoverSameOwner: true,
    });
    expect(replacement.acquire()).toBe(true);
    expect(harness.values.get('lease')).toEqual({
      schemaVersion: SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION,
      ownerId: 'owner',
      holderId: 'runtime-b',
      revision: 4,
      acquiredAtMs: 1_500,
      expiresAtMs: 61_500,
    });
    replacement.destroy();
    blocked.destroy();
  });

  it('rejects every public operation reentered from wall-clock and storage callbacks', () => {
    const harness = storageHarness();
    const errors: Error[] = [];
    const leaseHolder: { current: SynchronousStorageLease | null } = { current: null };
    const attemptAll = () => {
      const current = leaseHolder.current;
      if (!current) return;
      const operations = [
        () => current.acquire(),
        () => current.assertHeld(),
        () => current.renew(),
        () => current.release(),
        () => current.getStatus(),
        () => current.isFailedClosed(),
        () => current.destroy(),
      ];
      for (const operation of operations) {
        try {
          operation();
        } catch (error) {
          errors.push(error as Error);
        }
      }
    };
    const lease = new SynchronousStorageLease({
      storage: harness.port,
      key: 'lease',
      ownerId: 'owner',
      wallNow: () => {
        attemptAll();
        return 1_000;
      },
    });
    leaseHolder.current = lease;
    harness.setOnRead(attemptAll);
    harness.setOnWrite(attemptAll);
    expect(() => lease.acquire()).toThrow(/重入/);
    expect(errors.length).toBeGreaterThanOrEqual(7);
    for (const error of errors) expect(error.message).toMatch(/不可重入|操作期间不能销毁/);
    expect(() => lease.getStatus()).toThrow(/失败关闭/);
    expect(lease.isFailedClosed()).toBe(true);
    harness.setOnRead(null);
    harness.setOnWrite(null);
    lease.destroy();
  });

  it('stops before a write when stored-value validation swallows public reentry', () => {
    let lease: SynchronousStorageLease | null = null;
    let writes = 0;
    const stored = new Proxy({
      schemaVersion: SYNCHRONOUS_STORAGE_LEASE_SCHEMA_VERSION,
      ownerId: 'previous-owner',
      holderId: 'previous-holder',
      revision: 1,
      acquiredAtMs: 1_000,
      expiresAtMs: 2_000,
    }, {
      ownKeys(target) {
        if (lease !== null) {
          try { lease.getStatus(); } catch { /* hostile value swallows reentry */ }
        }
        return Reflect.ownKeys(target);
      },
    });
    const activeLease = new SynchronousStorageLease({
      storage: {
        storageRead: () => ({ ok: true, found: true, value: stored }),
        storageWrite: () => {
          writes += 1;
          return true;
        },
        storageDelete: () => true,
      },
      key: 'lease',
      ownerId: 'owner',
      wallNow: () => 3_000,
    });
    lease = activeLease;

    expect(() => activeLease.acquire()).toThrow(/重入/);
    expect(writes).toBe(0);
    expect(activeLease.isFailedClosed()).toBe(true);
    activeLease.destroy();
  });

  it('retains old and new renewal identities for exact cleanup after swallowed reentry', () => {
    const harness = storageHarness();
    let now = 1_000;
    const lease = new SynchronousStorageLease({
      storage: harness.port,
      key: 'lease',
      ownerId: 'owner',
      wallNow: () => now,
    });
    expect(lease.acquire()).toBe(true);
    const first = clone(harness.values.get('lease')) as { revision: number };
    harness.setOnWrite(() => {
      try { lease.destroy(); } catch { /* Storage swallows the reentry rejection. */ }
    });
    now = 2_000;

    expect(() => lease.renew()).toThrow(/重入/);
    expect(() => lease.getStatus()).toThrow(/失败关闭/);
    expect(lease.isFailedClosed()).toBe(true);
    expect((harness.values.get('lease') as { revision: number }).revision).toBe(
      first.revision + 1,
    );

    harness.setOnWrite(null);
    lease.destroy();
    expect(harness.values.has('lease')).toBe(false);
    expect(() => lease.getStatus()).toThrow(/已销毁/);
  });

  it('keeps ownership after an unconfirmed release and completes destroy only after retry', () => {
    const harness = storageHarness();
    const lease = new SynchronousStorageLease({
      storage: harness.port,
      key: 'lease',
      ownerId: 'owner',
      wallNow: () => 1_000,
    });
    expect(lease.acquire()).toBe(true);
    harness.setDeleteResult(false);
    expect(() => lease.destroy()).toThrow(/未能确认释放/);
    expect(lease.getStatus().held).toBe(true);
    harness.setDeleteResult(true);
    lease.destroy();
    lease.destroy();
    expect(() => lease.getStatus()).toThrow(/已销毁/);
  });

  it('does not execute accessors in malformed stored lease data', () => {
    let getterCalls = 0;
    const stored = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 2;
      },
    });
    let current: unknown = stored;
    const lease = new SynchronousStorageLease({
      storage: {
        storageRead: () => ({
          ok: true,
          found: current !== undefined,
          value: current,
        }),
        storageWrite: (_key: string, value: unknown) => {
          current = value;
          return true;
        },
        storageDelete: () => {
          current = undefined;
          return true;
        },
      },
      key: 'lease',
      ownerId: 'owner',
      wallNow: () => 1_000,
    });
    expect(lease.acquire()).toBe(true);
    expect(getterCalls).toBe(0);
    lease.destroy();
  });

  it('rejects an asynchronous wall clock through the shared synchronous boundary', () => {
    const lease = new SynchronousStorageLease({
      storage: storageHarness().port,
      key: 'lease',
      ownerId: 'owner',
      wallNow: (() => Promise.resolve(1_000)) as never,
    });
    expect(() => lease.acquire()).toThrow(/同步完成/);
    lease.destroy();
  });
});
