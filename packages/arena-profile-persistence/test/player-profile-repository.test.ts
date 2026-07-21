import { describe, expect, it } from 'vitest';
import {
  PLAYER_PROFILE_SAVE_ENVELOPE_SCHEMA_VERSION,
  PlayerProfileFutureSchemaError,
  PlayerProfileIndeterminateWriteError,
  advancePlayerProfile,
  createPlayerProfile,
  createPlayerProfileDefinition,
} from '@number-strategy-jump/arena-profile-contracts';
import type { PlayerProfile } from '@number-strategy-jump/arena-profile-contracts';
import { PlayerProfileRepository } from '../src/index.js';

const DEFINITION = createPlayerProfileDefinition({
  schemaVersion: 1,
  id: 'test.profile',
  contentVersion: 1,
  currentProfileSchemaVersion: 1,
  limits: {
    maxUnlockedPerKind: 8,
    maxCommittedGrantIds: 16,
    maxExperience: 10_000,
    maxIdentifierLength: 64,
  },
  defaults: {
    profileId: 'local',
    progression: { experience: 0, committedGrantIds: [] },
    unlocks: {
      characterIds: ['hero'],
      appearanceIds: [],
      equipmentIds: [],
      mapIds: ['arena'],
    },
    selection: { characterId: 'hero', appearanceId: null },
    settings: { soundEnabled: true, reducedMotion: false, qualityProfile: 'auto' },
  },
});

function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value)) as T;
}

function storageHarness() {
  const values = new Map<string, unknown>();
  const failNextRead = new Set<string>();
  const failReadAfterWrite = new Set<string>();
  const blockedDeletes = new Set<string>();
  const falseDeleteAfterMutation = new Set<string>();
  let readHook: ((key: string) => void) | null = null;
  let writeHook: ((key: string) => void) | null = null;
  const port = {
    storageRead(key: string) {
      readHook?.(key);
      if (failNextRead.delete(key)) {
        return { ok: false, found: false, value: undefined };
      }
      return values.has(key)
        ? { ok: true, found: true, value: clone(values.get(key)) }
        : { ok: true, found: false, value: undefined };
    },
    storageWrite(key: string, value: unknown) {
      values.set(key, clone(value));
      writeHook?.(key);
      if (failReadAfterWrite.delete(key)) failNextRead.add(key);
      return true;
    },
    storageDelete(key: string) {
      if (blockedDeletes.has(key)) return false;
      values.delete(key);
      return !falseDeleteAfterMutation.has(key);
    },
  };
  return {
    values,
    failReadAfterWrite,
    blockedDeletes,
    falseDeleteAfterMutation,
    port,
    setReadHook(value: ((key: string) => void) | null) { readHook = value; },
    setWriteHook(value: ((key: string) => void) | null) { writeHook = value; },
  };
}

function repository(
  storage: unknown,
  ownerId = 'owner-a',
  wallNow: () => number = () => 1_000,
): PlayerProfileRepository {
  return new PlayerProfileRepository({
    definition: DEFINITION,
    storage,
    ownerId,
    wallNow,
    keyPrefix: 'test.profile',
  });
}

function withExperience(profile: PlayerProfile, experience: number): PlayerProfile {
  return advancePlayerProfile(DEFINITION, profile, {
    progression: { ...profile.progression, experience },
  });
}

describe('PlayerProfileRepository', () => {
  it('rejects option accessors without execution and snapshots storage methods', () => {
    const harness = storageHarness();
    let getterCalls = 0;
    const options = {
      definition: DEFINITION,
      storage: harness.port,
      ownerId: 'owner-a',
      wallNow: () => 1_000,
      get keyPrefix() {
        getterCalls += 1;
        return 'hostile';
      },
    };
    expect(() => new PlayerProfileRepository(options)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);

    const repo = repository(harness.port);
    harness.port.storageRead = () => {
      throw new Error('replacement read must not execute');
    };
    harness.port.storageWrite = () => {
      throw new Error('replacement write must not execute');
    };
    harness.port.storageDelete = () => {
      throw new Error('replacement delete must not execute');
    };
    expect(repo.open().revision).toBe(0);
    repo.destroy();
  });

  it('rejects every public operation reentered during open storage callbacks', () => {
    const harness = storageHarness();
    const repo = repository(harness.port);
    const next = withExperience(createPlayerProfile(DEFINITION), 1);
    const errors: Error[] = [];
    const attemptAll = () => {
      const operations = [
        () => repo.open(),
        () => repo.getSnapshot(),
        () => repo.getDiagnostics(),
        () => repo.getStorageKeys(),
        () => repo.renewLease(),
        () => repo.compareAndSet(next, 0),
        () => repo.destroy(),
      ];
      for (const operation of operations) {
        try {
          operation();
        } catch (error) {
          errors.push(error as Error);
        }
      }
    };
    harness.setReadHook(attemptAll);
    expect(repo.open().revision).toBe(0);
    harness.setReadHook(null);
    expect(errors.length).toBeGreaterThanOrEqual(21);
    for (const error of errors) expect(error.message).toMatch(/不可重入/);
    repo.destroy();
  });

  it('keeps one verified CAS when storage callbacks attempt reads, writes and destroy', () => {
    const harness = storageHarness();
    const repo = repository(harness.port);
    const initial = repo.open();
    const next = withExperience(initial, 1);
    const errors: Error[] = [];
    harness.setWriteHook((key) => {
      if (!key.endsWith('.slot-a')) return;
      const operations = [
        () => repo.getSnapshot(),
        () => repo.getDiagnostics(),
        () => repo.getStorageKeys(),
        () => repo.renewLease(),
        () => repo.compareAndSet(next, 0),
        () => repo.destroy(),
      ];
      for (const operation of operations) {
        try {
          operation();
        } catch (error) {
          errors.push(error as Error);
        }
      }
    });
    expect(repo.compareAndSet(next, 0)).toEqual({
      committed: true,
      reason: null,
      headUpdated: true,
    });
    harness.setWriteHook(null);
    expect(errors).toHaveLength(6);
    for (const error of errors) expect(error.message).toMatch(/不可重入/);
    expect(repo.getSnapshot().revision).toBe(1);
    repo.destroy();
  });

  it('fails closed immediately when CAS confirms that another runtime owns the lease', () => {
    const harness = storageHarness();
    let now = 1_000;
    const stale = repository(harness.port, 'owner-a', () => now);
    const initial = stale.open();
    now = 61_001;
    const replacement = repository(harness.port, 'owner-b', () => now);
    replacement.open();
    expect(() => stale.compareAndSet(withExperience(initial, 1), 0)).toThrow(
      PlayerProfileIndeterminateWriteError,
    );
    expect(() => stale.getSnapshot()).toThrow(PlayerProfileIndeterminateWriteError);
    replacement.destroy();
    stale.destroy();
  });

  it('protects a future schema injected after open and closes the stale writer', () => {
    const harness = storageHarness();
    const repo = repository(harness.port);
    const initial = repo.open();
    const keys = repo.getStorageKeys();
    harness.values.set(keys.slotA, {
      schemaVersion: PLAYER_PROFILE_SAVE_ENVELOPE_SCHEMA_VERSION + 1,
      profileDefinitionId: DEFINITION.id,
      generation: 9,
      payloadSchemaVersion: 9,
      payloadHash: 'future',
      payload: { schemaVersion: 9 },
    });
    expect(() => repo.compareAndSet(withExperience(initial, 1), 0)).toThrow(
      PlayerProfileFutureSchemaError,
    );
    expect(() => repo.getSnapshot()).toThrow(PlayerProfileIndeterminateWriteError);
    expect((harness.values.get(keys.slotA) as { generation: number }).generation).toBe(9);
    repo.destroy();
  });

  it('uses read-back authority when rollback deletion mutates but reports false', () => {
    const harness = storageHarness();
    const repo = repository(harness.port);
    const initial = repo.open();
    const keys = repo.getStorageKeys();
    harness.failReadAfterWrite.add(keys.slotA);
    harness.falseDeleteAfterMutation.add(keys.slotA);
    const next = withExperience(initial, 1);
    expect(repo.compareAndSet(next, 0)).toEqual({
      committed: false,
      reason: 'slot-readback-failed',
      headUpdated: false,
    });
    expect(harness.values.has(keys.slotA)).toBe(false);
    harness.falseDeleteAfterMutation.delete(keys.slotA);
    expect(repo.compareAndSet(next, 0).committed).toBe(true);
    repo.destroy();
  });

  it('retains all ownership after destroy cleanup failure and completes one exact retry', () => {
    const harness = storageHarness();
    const repo = repository(harness.port);
    repo.open();
    const keys = repo.getStorageKeys();
    harness.blockedDeletes.add(keys.lease);
    expect(() => repo.destroy()).toThrow(/未能确认释放/);
    expect(repo.getSnapshot().revision).toBe(0);
    expect(harness.values.has(keys.lease)).toBe(true);
    harness.blockedDeletes.delete(keys.lease);
    repo.destroy();
    repo.destroy();
    expect(harness.values.has(keys.lease)).toBe(false);
    expect(() => repo.getStorageKeys()).toThrow(/已销毁/);
  });
});
