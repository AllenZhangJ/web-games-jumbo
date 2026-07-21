import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { ARENA_V1_PLAYER_PROFILE_DEFINITION } from '../../../src/arena/product/content/arena-v1-player-profile-definition.js';
import {
  PLAYER_PROFILE_SAVE_ENVELOPE_SCHEMA_VERSION,
  PlayerProfileDefinition,
  PlayerProfileFutureSchemaError,
  PlayerProfileIndeterminateWriteError,
  PlayerProfileRepositoryBusyError,
  PlayerProfileSaveConflictError,
  SaveMigrationRegistry,
  advancePlayerProfile,
  assertPlayerProfileSaveEnvelopeHasNoFutureSchema,
  createPlayerProfile,
  createPlayerProfileDefinition,
  createPlayerProfileSaveEnvelope,
  validatePlayerProfileSaveEnvelope,
} from '@number-strategy-jump/arena-profile-contracts';
import { PlayerProfileRepository } from '../../../src/arena/product/persistence/player-profile-repository.js';
import { SynchronousStorageLease } from '../../../src/arena/storage/synchronous-storage-lease.js';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function storageHarness() {
  const values = new Map();
  const readFailures = new Set();
  const writeFailures = new Set();
  const writeThrowsAfterMutation = new Set();
  const deleteFailures = new Set();
  const deleteThrowsAfterMutation = new Set();
  const failNextRead = new Set();
  const armReadFailureOnWrite = new Set();
  const writeTransforms = new Map();
  const writeHooks = new Map();
  const writeKeys = [];
  return {
    values,
    readFailures,
    writeFailures,
    writeThrowsAfterMutation,
    deleteFailures,
    deleteThrowsAfterMutation,
    failNextRead,
    armReadFailureOnWrite,
    writeTransforms,
    writeHooks,
    writeKeys,
    port: {
      storageRead(key) {
        if (failNextRead.delete(key) || readFailures.has(key)) {
          return { ok: false, found: false, value: undefined };
        }
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key, value) {
        writeKeys.push(key);
        if (writeFailures.has(key)) return false;
        const transform = writeTransforms.get(key);
        values.set(key, clone(transform ? transform(value) : value));
        writeHooks.get(key)?.();
        if (armReadFailureOnWrite.has(key)) {
          armReadFailureOnWrite.delete(key);
          failNextRead.add(key);
        }
        if (writeThrowsAfterMutation.has(key)) throw new Error(`write throw ${key}`);
        return true;
      },
      storageDelete(key) {
        if (deleteFailures.has(key)) return false;
        values.delete(key);
        if (deleteThrowsAfterMutation.has(key)) throw new Error(`delete throw ${key}`);
        return true;
      },
    },
  };
}

function repository(harness, ownerId = 'owner-a', wallNow = () => 1000) {
  return new PlayerProfileRepository({
    definition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
    storage: harness.port,
    ownerId,
    wallNow,
    keyPrefix: 'test.profile',
  });
}

function withExperience(profile, experience) {
  return advancePlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION, profile, {
    progression: { ...profile.progression, experience },
  });
}

test('Stage 8 profile definition is immutable, bounded and deterministically hashed', () => {
  const definition = ARENA_V1_PLAYER_PROFILE_DEFINITION;
  assert.ok(definition instanceof PlayerProfileDefinition);
  assert.equal(definition.getContentHash(), definition.getContentHash());
  assert.equal(Object.isFrozen(definition), true);
  assert.equal(Object.isFrozen(definition.defaults.unlocks.characterIds), true);
  assert.equal(definition.defaults.selection.characterId, 'parkour-apprentice');
  assert.deepEqual(definition.defaults.unlocks.equipmentIds, [
    'chain',
    'hammer',
    'shield',
  ]);

  const invalid = clone(definition.toJSON());
  invalid.defaults.selection.characterId = 'locked-character';
  assert.throws(() => createPlayerProfileDefinition(invalid), /必须已经解锁/);
  assert.throws(
    () => createPlayerProfileDefinition({ ...definition.toJSON(), unknown: true }),
    /不支持字段 unknown/,
  );
});

test('PlayerProfile normalizes sets and enforces selection, limits and data-only input', () => {
  const definition = ARENA_V1_PLAYER_PROFILE_DEFINITION;
  const profile = createPlayerProfile(definition, {
    ...createPlayerProfile(definition),
    unlocks: {
      ...definition.defaults.unlocks,
      characterIds: ['wind-up-cube', 'parkour-apprentice'],
    },
  });
  assert.deepEqual(profile.unlocks.characterIds, ['parkour-apprentice', 'wind-up-cube']);
  assert.equal(Object.isFrozen(profile.progression.committedGrantIds), true);

  assert.throws(() => createPlayerProfile(definition, {
    ...profile,
    selection: { ...profile.selection, characterId: 'locked' },
  }), /必须已经解锁/);
  assert.throws(() => createPlayerProfile(definition, {
    ...profile,
    progression: { ...profile.progression, experience: definition.limits.maxExperience + 1 },
  }), /超出上限/);
  const accessor = { ...profile };
  Object.defineProperty(accessor, 'settings', { enumerable: true, get: () => profile.settings });
  assert.throws(() => createPlayerProfile(definition, accessor), /数据字段/);
});

test('advancePlayerProfile accepts explicit aggregate sections and increments exactly once', () => {
  const initial = createPlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION);
  const next = withExperience(initial, 25);
  assert.equal(next.revision, 1);
  assert.equal(next.progression.experience, 25);
  assert.equal(initial.progression.experience, 0);
  assert.throws(
    () => advancePlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION, initial, {}),
    /不能是空更新/,
  );
  assert.throws(
    () => advancePlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION, initial, { reward: 1 }),
    /不支持字段 reward/,
  );
});

test('profile envelopes verify raw payload hash and remain compatible across content revisions', () => {
  const definition = ARENA_V1_PLAYER_PROFILE_DEFINITION;
  const profile = withExperience(createPlayerProfile(definition), 10);
  const envelope = createPlayerProfileSaveEnvelope(definition, profile);
  const registry = new SaveMigrationRegistry({ currentVersion: 1, migrations: [] });
  assert.deepEqual(validatePlayerProfileSaveEnvelope(definition, registry, envelope).profile, profile);

  const damaged = clone(envelope);
  damaged.payload.progression.experience = 11;
  assert.throws(
    () => validatePlayerProfileSaveEnvelope(definition, registry, damaged),
    /payload hash 不一致/,
  );

  const evolvedDefinition = createPlayerProfileDefinition({
    ...definition.toJSON(),
    contentVersion: definition.contentVersion + 1,
  });
  assert.equal(
    validatePlayerProfileSaveEnvelope(evolvedDefinition, registry, envelope).profile.revision,
    1,
  );
});

test('future envelope and nested profile schemas are protected from recovery overwrite', () => {
  const definition = ARENA_V1_PLAYER_PROFILE_DEFINITION;
  const envelope = clone(createPlayerProfileSaveEnvelope(definition, createPlayerProfile(definition)));
  envelope.schemaVersion = PLAYER_PROFILE_SAVE_ENVELOPE_SCHEMA_VERSION + 1;
  assert.throws(
    () => assertPlayerProfileSaveEnvelopeHasNoFutureSchema(definition, envelope),
    PlayerProfileFutureSchemaError,
  );
  envelope.schemaVersion = PLAYER_PROFILE_SAVE_ENVELOPE_SCHEMA_VERSION;
  envelope.payloadSchemaVersion = definition.currentProfileSchemaVersion + 1;
  assert.throws(
    () => assertPlayerProfileSaveEnvelopeHasNoFutureSchema(definition, envelope),
    PlayerProfileFutureSchemaError,
  );
  envelope.payloadSchemaVersion = definition.currentProfileSchemaVersion;
  envelope.payload.schemaVersion = definition.currentProfileSchemaVersion + 1;
  assert.throws(
    () => assertPlayerProfileSaveEnvelopeHasNoFutureSchema(definition, envelope),
    PlayerProfileFutureSchemaError,
  );
});

test('SaveMigrationRegistry requires a contiguous chain and checks deterministic pure output', () => {
  assert.throws(
    () => new SaveMigrationRegistry({ currentVersion: 1, migrations: [], unknown: true }),
    /不支持字段 unknown/,
  );
  assert.throws(
    () => new SaveMigrationRegistry({ currentVersion: 1, migrations: new Array(1) }),
    /空槽|数据字段/,
  );
  assert.throws(
    () => new SaveMigrationRegistry({
      currentVersion: 3,
      migrations: [{ fromVersion: 2, toVersion: 3, migrate: (value) => value }],
    }),
    /缺少存档迁移 1/,
  );
  const registry = new SaveMigrationRegistry({
    currentVersion: 3,
    migrations: [
      {
        fromVersion: 1,
        toVersion: 2,
        migrate: (value) => ({ ...value, schemaVersion: 2, middle: value.count + 1 }),
      },
      {
        fromVersion: 2,
        toVersion: 3,
        migrate: (value) => ({ ...value, schemaVersion: 3, final: value.middle + 1 }),
      },
    ],
  });
  assert.deepEqual(registry.migrate({ schemaVersion: 1, count: 1 }, 1), {
    schemaVersion: 3,
    count: 1,
    middle: 2,
    final: 3,
  });
  assert.throws(() => registry.migrate({ schemaVersion: 4 }, 4), PlayerProfileFutureSchemaError);

  let call = 0;
  const nondeterministic = new SaveMigrationRegistry({
    currentVersion: 2,
    migrations: [{
      fromVersion: 1,
      toVersion: 2,
      migrate: (value) => ({ ...value, schemaVersion: 2, call: call += 1 }),
    }],
  });
  assert.throws(
    () => nondeterministic.migrate({ schemaVersion: 1 }, 1),
    /不是确定性迁移/,
  );
});

test('A/B repository alternates verified slots and ignores a non-authoritative head failure', () => {
  const harness = storageHarness();
  const first = repository(harness);
  let profile = first.open();
  const keys = first.getStorageKeys();
  profile = withExperience(profile, 10);
  assert.deepEqual(first.compareAndSet(profile, 0), {
    committed: true,
    reason: null,
    headUpdated: true,
  });
  assert.equal(harness.values.get(keys.head), 'a');

  harness.writeFailures.add(keys.head);
  profile = withExperience(profile, 20);
  assert.deepEqual(first.compareAndSet(profile, 1), {
    committed: true,
    reason: null,
    headUpdated: false,
  });
  assert.equal(harness.values.get(keys.head), 'a');
  first.destroy();

  harness.writeFailures.delete(keys.head);
  const reopened = repository(harness, 'owner-b');
  assert.equal(reopened.open().progression.experience, 20);
  assert.equal(reopened.getSnapshot().revision, 2);
  reopened.destroy();
});

test('repository confirms slot writes that throw after mutation and contains thrown head writes', () => {
  const harness = storageHarness();
  const repo = repository(harness);
  const initial = repo.open();
  const keys = repo.getStorageKeys();
  harness.writeThrowsAfterMutation.add(keys.slotA);
  harness.writeThrowsAfterMutation.add(keys.head);
  const result = repo.compareAndSet(withExperience(initial, 1), 0);
  assert.deepEqual(result, { committed: true, reason: null, headUpdated: false });
  assert.equal(repo.getSnapshot().revision, 1);
  repo.destroy();

  harness.writeThrowsAfterMutation.clear();
  const reopened = repository(harness, 'owner-b');
  assert.equal(reopened.open().revision, 1);
  reopened.destroy();
});

test('repository rejects storage callback reentrancy without losing the outer verified commit', () => {
  const harness = storageHarness();
  const repo = repository(harness);
  const initial = repo.open();
  const keys = repo.getStorageKeys();
  const next = withExperience(initial, 1);
  harness.writeHooks.set(keys.slotA, () => {
    assert.throws(() => repo.compareAndSet(next, 0), /不可重入/);
    assert.throws(() => repo.destroy(), /写入期间/);
  });
  assert.equal(repo.compareAndSet(next, 0).committed, true);
  assert.equal(repo.getSnapshot().revision, 1);
  repo.destroy();
});

test('repository recovers one corrupt slot and defaults only when neither slot is valid', () => {
  const harness = storageHarness();
  const writer = repository(harness);
  const keys = writer.getStorageKeys();
  const one = withExperience(writer.open(), 1);
  writer.compareAndSet(one, 0);
  const two = withExperience(one, 2);
  writer.compareAndSet(two, 1);
  writer.destroy();

  harness.values.set(keys.slotB, { corrupt: true, secret: 'must-not-leak' });
  const oneSlot = repository(harness, 'owner-b');
  assert.equal(oneSlot.open().progression.experience, 1);
  assert.equal(oneSlot.getDiagnostics().invalidSlots, 1);
  assert.doesNotMatch(JSON.stringify(oneSlot.getDiagnostics()), /must-not-leak/);
  oneSlot.destroy();

  harness.values.set(keys.slotA, { corrupt: true });
  const defaulted = repository(harness, 'owner-c');
  assert.equal(defaulted.open().revision, 0);
  assert.equal(defaulted.getDiagnostics().recoveredDefault, true);
  assert.equal(defaulted.getDiagnostics().invalidSlots, 2);
  defaulted.destroy();
});

test('repository blocks future data and releases its lease after open failure', () => {
  const harness = storageHarness();
  const probe = repository(harness);
  const keys = probe.getStorageKeys();
  probe.destroy();
  harness.values.set(keys.slotA, {
    schemaVersion: PLAYER_PROFILE_SAVE_ENVELOPE_SCHEMA_VERSION + 1,
    profileDefinitionId: ARENA_V1_PLAYER_PROFILE_DEFINITION.id,
    generation: 99,
    payloadSchemaVersion: 99,
    payloadHash: 'future',
    payload: { schemaVersion: 99 },
  });
  const blocked = repository(harness, 'owner-blocked');
  assert.throws(() => blocked.open(), PlayerProfileFutureSchemaError);
  assert.equal(harness.values.has(keys.lease), false);
  assert.equal(harness.values.get(keys.slotA).generation, 99);

  const retry = repository(harness, 'owner-retry');
  assert.throws(() => retry.open(), PlayerProfileFutureSchemaError);
  retry.destroy();
  blocked.destroy();
});

test('open cleanup failure keeps the lease retryable instead of publishing a partial repository', () => {
  const harness = storageHarness();
  const repo = repository(harness);
  const keys = repo.getStorageKeys();
  harness.readFailures.add(keys.slotA);
  harness.deleteFailures.add(keys.lease);
  assert.throws(() => repo.open(), /清理未完成/);
  assert.throws(() => repo.getSnapshot(), /尚未打开/);
  assert.equal(harness.values.has(keys.lease), true);

  harness.readFailures.delete(keys.slotA);
  harness.deleteFailures.delete(keys.lease);
  assert.equal(repo.open().revision, 0);
  repo.destroy();
  assert.equal(harness.values.has(keys.lease), false);
});

test('same-generation divergent slots fail closed instead of trusting the head hint', () => {
  const harness = storageHarness();
  const probe = repository(harness);
  const keys = probe.getStorageKeys();
  probe.destroy();
  const base = createPlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION);
  const left = withExperience(base, 1);
  const right = advancePlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION, base, {
    settings: { ...base.settings, reducedMotion: true },
  });
  harness.values.set(keys.slotA, clone(createPlayerProfileSaveEnvelope(
    ARENA_V1_PLAYER_PROFILE_DEFINITION,
    left,
  )));
  harness.values.set(keys.slotB, clone(createPlayerProfileSaveEnvelope(
    ARENA_V1_PLAYER_PROFILE_DEFINITION,
    right,
  )));
  harness.values.set(keys.head, 'a');
  const conflicted = repository(harness, 'owner-conflict');
  assert.throws(() => conflicted.open(), PlayerProfileSaveConflictError);
  assert.equal(harness.values.has(keys.lease), false);
  conflicted.destroy();
});

test('compare-and-set rejects stale memory and detects external storage changes', () => {
  const harness = storageHarness();
  const repo = repository(harness);
  const initial = repo.open();
  const next = withExperience(initial, 1);
  assert.equal(repo.compareAndSet(next, 1).reason, 'memory-revision-mismatch');
  assert.equal(repo.compareAndSet(next, 0).committed, true);

  const keys = repo.getStorageKeys();
  const external = withExperience(next, 2);
  harness.values.set(keys.slotB, clone(createPlayerProfileSaveEnvelope(
    ARENA_V1_PLAYER_PROFILE_DEFINITION,
    external,
  )));
  const localNext = withExperience(next, 3);
  assert.equal(repo.compareAndSet(localNext, 1).reason, 'storage-revision-mismatch');
  assert.equal(repo.getSnapshot().progression.experience, 1);
  repo.destroy();
});

test('lease contention and expiry prevent concurrent or stale writers', () => {
  const harness = storageHarness();
  let now = 1000;
  const first = repository(harness, 'owner-a', () => now);
  first.open();
  const second = repository(harness, 'owner-b', () => now);
  assert.throws(() => second.open(), PlayerProfileRepositoryBusyError);
  now = 61_001;
  const replacement = repository(harness, 'owner-c', () => now);
  replacement.open();
  assert.throws(
    () => first.compareAndSet(withExperience(first.getSnapshot(), 1), 0),
    /过期或被其他页面取代/,
  );
  replacement.destroy();
  second.destroy();
  first.destroy();
  first.destroy();
});

test('profile lease renewal retries a confirmed transient failure and fails closed after expiry', () => {
  const harness = storageHarness();
  let now = 1_000;
  const repo = repository(harness, 'renew-owner', () => now);
  repo.open();
  const leaseKey = repo.getStorageKeys().lease;

  now = 20_000;
  harness.writeFailures.add(leaseKey);
  assert.equal(repo.renewLease(), false);
  assert.equal(repo.getSnapshot().revision, 0);

  harness.writeFailures.delete(leaseKey);
  assert.equal(repo.renewLease(), true);
  now = 80_000;
  assert.throws(() => repo.renewLease(), PlayerProfileIndeterminateWriteError);
  assert.throws(() => repo.getSnapshot(), PlayerProfileIndeterminateWriteError);
  repo.destroy();
});

test('shared lease confirms thrown host mutations and retains ownership for release retry', () => {
  const harness = storageHarness();
  const key = 'test.shared-lease';
  harness.writeThrowsAfterMutation.add(key);
  const lease = new SynchronousStorageLease({
    storage: harness.port,
    key,
    ownerId: 'lease-owner',
    wallNow: () => 1000,
  });
  assert.equal(lease.acquire(), true);
  assert.equal(lease.getStatus().held, true);

  harness.writeThrowsAfterMutation.delete(key);
  harness.deleteFailures.add(key);
  assert.equal(lease.release(), false);
  assert.equal(lease.getStatus().held, true);
  harness.deleteFailures.delete(key);
  harness.deleteThrowsAfterMutation.add(key);
  assert.equal(lease.release(), true);
  assert.equal(lease.getStatus().held, false);
  lease.destroy();
});

test('opt-in same-owner takeover fences a stale single-host runtime before writes', () => {
  const harness = storageHarness();
  const key = 'test.single-host-takeover';
  assert.throws(() => new SynchronousStorageLease({
    storage: harness.port,
    key,
    ownerId: 'single-host-owner',
    wallNow: () => 1000,
    takeoverSameOwner: true,
  }), /holderId.*不能等于 ownerId/);
  const first = new SynchronousStorageLease({
    storage: harness.port,
    key,
    ownerId: 'single-host-owner',
    holderId: 'runtime-a',
    wallNow: () => 1000,
  });
  const replacement = new SynchronousStorageLease({
    storage: harness.port,
    key,
    ownerId: 'single-host-owner',
    holderId: 'runtime-b',
    wallNow: () => 1000,
    takeoverSameOwner: true,
  });
  assert.equal(first.acquire(), true);
  assert.equal(replacement.acquire(), true);
  assert.equal(harness.values.get(key).schemaVersion, 2);
  assert.equal(harness.values.get(key).holderId, 'runtime-b');
  assert.equal(replacement.getStatus().revision, 2);
  assert.throws(() => first.assertHeld(), /过期或被其他页面取代/);
  assert.equal(first.release(), true);
  assert.equal(replacement.assertHeld(), true);
  assert.equal(replacement.release(), true);
  first.destroy();
  replacement.destroy();
});

test('lease v2 reads legacy v1 but writes a future-safe holder schema', () => {
  const harness = storageHarness();
  const key = 'test.legacy-lease-upgrade';
  harness.values.set(key, {
    schemaVersion: 1,
    ownerId: 'single-host-owner',
    revision: 7,
    acquiredAtMs: 1000,
    expiresAtMs: 61_000,
  });
  const blocked = new SynchronousStorageLease({
    storage: harness.port,
    key,
    ownerId: 'other-owner',
    wallNow: () => 2000,
  });
  assert.equal(blocked.acquire(), false);

  const replacement = new SynchronousStorageLease({
    storage: harness.port,
    key,
    ownerId: 'single-host-owner',
    holderId: 'runtime-v2',
    wallNow: () => 2000,
    takeoverSameOwner: true,
  });
  assert.equal(replacement.acquire(), true);
  assert.deepEqual(harness.values.get(key), {
    schemaVersion: 2,
    ownerId: 'single-host-owner',
    holderId: 'runtime-v2',
    revision: 8,
    acquiredAtMs: 2000,
    expiresAtMs: 62_000,
  });
  replacement.destroy();
  blocked.destroy();
});

test('shared lease cleans a persisted candidate when acquisition read-back fails', () => {
  const harness = storageHarness();
  const key = 'test.failed-acquire-lease';
  harness.armReadFailureOnWrite.add(key);
  const lease = new SynchronousStorageLease({
    storage: harness.port,
    key,
    ownerId: 'lease-owner',
    wallNow: () => 1000,
  });
  assert.throws(() => lease.acquire(), /读取失败/);
  assert.equal(harness.values.has(key), false);
  assert.equal(lease.getStatus().held, false);
  lease.destroy();
});

test('shared lease rejects and contains asynchronous host write and delete callbacks', async () => {
  const values = new Map();
  let asyncWrite = true;
  let asyncDelete = false;
  const port = {
    storageRead(key) {
      return values.has(key)
        ? { ok: true, found: true, value: clone(values.get(key)) }
        : { ok: true, found: false, value: undefined };
    },
    storageWrite(key, value) {
      if (asyncWrite) return Promise.reject(new Error('late write rejection'));
      values.set(key, clone(value));
      return true;
    },
    storageDelete(key) {
      if (asyncDelete) return Promise.reject(new Error('late delete rejection'));
      values.delete(key);
      return true;
    },
  };
  const lease = new SynchronousStorageLease({
    storage: port,
    key: 'test.async-lease',
    ownerId: 'lease-owner',
    wallNow: () => 1000,
  });
  assert.throws(() => lease.acquire(), /必须同步完成/);
  asyncWrite = false;
  assert.equal(lease.acquire(), true);
  asyncDelete = true;
  assert.throws(() => lease.release(), /必须同步完成/);
  assert.equal(lease.getStatus().held, true);
  asyncDelete = false;
  assert.equal(lease.release(), true);
  lease.destroy();
  await new Promise((resolve) => setImmediate(resolve));
});

test('failed slot readback rolls back the inactive slot and keeps the old snapshot writable', () => {
  const harness = storageHarness();
  const repo = repository(harness);
  const initial = repo.open();
  const keys = repo.getStorageKeys();
  harness.armReadFailureOnWrite.add(keys.slotA);
  const next = withExperience(initial, 1);
  assert.deepEqual(repo.compareAndSet(next, 0), {
    committed: false,
    reason: 'slot-readback-failed',
    headUpdated: false,
  });
  assert.equal(harness.values.has(keys.slotA), false);
  assert.equal(repo.getSnapshot().revision, 0);
  assert.equal(repo.compareAndSet(next, 0).committed, true);
  repo.destroy();
});

test('unconfirmed slot that cannot be rolled back poisons the repository fail closed', () => {
  const harness = storageHarness();
  const repo = repository(harness);
  const initial = repo.open();
  const keys = repo.getStorageKeys();
  harness.armReadFailureOnWrite.add(keys.slotA);
  harness.deleteFailures.add(keys.slotA);
  assert.throws(
    () => repo.compareAndSet(withExperience(initial, 1), 0),
    PlayerProfileIndeterminateWriteError,
  );
  assert.throws(() => repo.getSnapshot(), PlayerProfileIndeterminateWriteError);
  harness.deleteFailures.delete(keys.slotA);
  repo.destroy();
});

test('future data observed during write confirmation is preserved and closes the writer', () => {
  const harness = storageHarness();
  const repo = repository(harness);
  const initial = repo.open();
  const keys = repo.getStorageKeys();
  harness.writeTransforms.set(keys.slotA, (value) => ({
    ...clone(value),
    schemaVersion: PLAYER_PROFILE_SAVE_ENVELOPE_SCHEMA_VERSION + 1,
  }));
  assert.throws(
    () => repo.compareAndSet(withExperience(initial, 1), 0),
    PlayerProfileFutureSchemaError,
  );
  assert.equal(
    harness.values.get(keys.slotA).schemaVersion,
    PLAYER_PROFILE_SAVE_ENVELOPE_SCHEMA_VERSION + 1,
  );
  assert.throws(() => repo.getSnapshot(), PlayerProfileIndeterminateWriteError);
  repo.destroy();
});

test('a different valid generation observed after a reported write fails closed without deletion', () => {
  const harness = storageHarness();
  const repo = repository(harness);
  const initial = repo.open();
  const keys = repo.getStorageKeys();
  const divergent = advancePlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION, initial, {
    settings: { ...initial.settings, reducedMotion: true },
  });
  const divergentEnvelope = createPlayerProfileSaveEnvelope(
    ARENA_V1_PLAYER_PROFILE_DEFINITION,
    divergent,
  );
  harness.writeTransforms.set(keys.slotA, () => divergentEnvelope);
  assert.throws(
    () => repo.compareAndSet(withExperience(initial, 1), 0),
    PlayerProfileIndeterminateWriteError,
  );
  assert.equal(harness.values.get(keys.slotA).payload.settings.reducedMotion, true);
  repo.destroy();
});

test('repository lifecycle is explicit and destroy is idempotent', () => {
  const harness = storageHarness();
  const repo = repository(harness);
  assert.throws(() => repo.getSnapshot(), /尚未打开/);
  assert.equal(repo.open(), repo.open());
  const diagnostics = repo.getDiagnostics();
  assert.equal(Object.isFrozen(diagnostics), true);
  repo.destroy();
  repo.destroy();
  assert.throws(() => repo.open(), /已销毁/);
});

test('repository keeps ownership alive when destroy cleanup fails and allows retry', () => {
  const harness = storageHarness();
  const repo = repository(harness);
  repo.open();
  const keys = repo.getStorageKeys();
  harness.deleteFailures.add(keys.lease);
  assert.throws(() => repo.destroy(), /未能确认释放/);
  assert.equal(repo.getSnapshot().revision, 0);
  assert.equal(harness.values.has(keys.lease), true);
  harness.deleteFailures.delete(keys.lease);
  repo.destroy();
  repo.destroy();
  assert.equal(harness.values.has(keys.lease), false);
});

test('profile persistence hashes never depend on object insertion order', () => {
  const profile = createPlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION);
  const reordered = {
    settings: profile.settings,
    selection: profile.selection,
    unlocks: profile.unlocks,
    progression: profile.progression,
    revision: profile.revision,
    profileId: profile.profileId,
    profileDefinitionId: profile.profileDefinitionId,
    schemaVersion: profile.schemaVersion,
  };
  assert.equal(
    createDeterministicDataHash(profile),
    createDeterministicDataHash(reordered),
  );
});
