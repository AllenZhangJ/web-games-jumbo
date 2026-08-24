import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
  ArenaV2LearningProfileIndeterminateWriteError,
  advanceArenaV2LearningProfileV1,
  createArenaV2LearningGrantV1,
  createArenaV2LearningProfileDefinitionV1,
} from '@number-strategy-jump/arena-profile-contracts';
import { ArenaV2LearningProfileRepositoryV1 } from '../src/index.js';

const DEFINITION = createArenaV2LearningProfileDefinitionV1({
  schemaVersion: ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  id: 'arena-v2.learning-profile-repository.test.v1',
  contentVersion: 1,
  currentProfileSchemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
  status: 'production-unreachable',
  hardGate: false,
  defaultProfileServiceWired: false,
  limits: {
    maxIdentifierLength: 96,
    maxCommittedGrantIds: 16,
    maxCounterValue: 1_000,
    maxCollectedWeaponIds: 2,
    maxCollectedMapIds: 2,
    maxWeaponMasteryRecords: 2,
    maxMapSegmentMasteryRecords: 4,
    maxModeRecords: 3,
    maxChallengeRecords: 4,
  },
  masteryRequirements: {
    weaponCollectionUseEvidence: 2,
    weaponContextEvidence: {
      ground: 2,
      aerial: 2,
      edge: 2,
      'duel-counterplay': 2,
      survival: 2,
    },
    mapSegmentCompletionEvidence: 2,
    modeCompletionEvidence: 2,
  },
  defaultProfileId: 'local-player',
  initiallyCollectedWeaponDefinitionIds: [],
  initiallyCollectedMapDefinitionIds: [],
  weaponDefinitionIds: ['weapon.a'],
  mapDefinitions: [{
    mapDefinitionId: 'map.a',
    segmentDefinitionIds: ['segment.a'],
  }],
  modeDefinitions: [{ modeDefinitionId: 'mode.duel', kind: 'duel' }],
  challengeDefinitions: [],
});

function grant() {
  return createArenaV2LearningGrantV1(DEFINITION, {
    schemaVersion: ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
    grantId: 'arena-learning:v1:deadbeef',
    resultAuthorityHash: 'deadbeef',
    recipientParticipantId: 'p1',
    sourceModeDefinitionId: 'mode.duel',
    sourceMapDefinitionIds: ['map.a'],
    collectedWeaponDefinitionIds: [],
    collectedMapDefinitionIds: ['map.a'],
    weaponDeltas: [],
    mapSegmentDeltas: [],
    modeDelta: {
      modeDefinitionId: 'mode.duel',
      playCountDelta: 1,
      completionCountDelta: 1,
      winCountDelta: 1,
      bestPerformanceTicksCandidate: 600,
    },
    challengeDeltas: [],
  });
}

function storageHarness() {
  const values = new Map<string, unknown>();
  const readKeys: string[] = [];
  let onRead: ((key: string) => void) | null = null;
  let onWrite: ((key: string) => void) | null = null;
  let onDelete: ((key: string) => void) | null = null;
  const failedReads = new Set<string>();
  const blockedDeletes = new Set<string>();
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  return {
    values,
    readKeys,
    failedReads,
    blockedDeletes,
    port: {
      storageRead(key: string) {
        readKeys.push(key);
        onRead?.(key);
        if (failedReads.has(key)) return { ok: false, found: false, value: undefined };
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        onWrite?.(key);
        values.set(key, clone(value));
        return true;
      },
      storageDelete(key: string) {
        onDelete?.(key);
        if (blockedDeletes.has(key)) return false;
        values.delete(key);
        return true;
      },
    },
    setOnRead(callback: ((key: string) => void) | null) { onRead = callback; },
    setOnWrite(callback: ((key: string) => void) | null) { onWrite = callback; },
    setOnDelete(callback: ((key: string) => void) | null) { onDelete = callback; },
  };
}

function captureFailure(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('Expected action to fail.');
}

describe('Arena V2 Learning Profile Repository V1', () => {
  it('marks lease acquisition indeterminate when a written candidate cannot be read or cleaned', () => {
    const storage = storageHarness();
    const keyPrefix = 'arena.p6.repository-acquire-indeterminate.test';
    const leaseKey = `${keyPrefix}.lease`;
    const repository = new ArenaV2LearningProfileRepositoryV1({
      definition: DEFINITION,
      storage: storage.port,
      ownerId: 'owner.p6.repository-acquire-indeterminate.test',
      wallNow: () => 1_000,
      keyPrefix,
    });
    storage.setOnWrite((key) => {
      if (key === leaseKey) storage.failedReads.add(leaseKey);
    });

    expect(captureFailure(() => repository.open())).toMatchObject({
      code: 'ARENA_V2_LEARNING_PROFILE_INDETERMINATE_WRITE',
      cause: expect.any(Error),
    });
    expect(storage.values.has(leaseKey)).toBe(true);
    expect(() => repository.open()).toThrow(ArenaV2LearningProfileIndeterminateWriteError);

    storage.setOnWrite(null);
    storage.failedReads.clear();
    repository.destroy();
    expect(storage.values.has(leaseKey)).toBe(false);
  });

  it('fails closed after destroy starts and retries the same lease cleanup', () => {
    const storage = storageHarness();
    const keyPrefix = 'arena.p6.repository-destroy-watermark.test';
    const repository = new ArenaV2LearningProfileRepositoryV1({
      definition: DEFINITION,
      storage: storage.port,
      ownerId: 'owner.p6.repository-destroy-watermark.test',
      wallNow: () => 1_000,
      keyPrefix,
    });
    repository.open();
    storage.blockedDeletes.add(`${keyPrefix}.lease`);

    expect(() => repository.destroy()).toThrow(/未能确认释放/u);
    expect(() => repository.getSnapshot()).toThrow(
      ArenaV2LearningProfileIndeterminateWriteError,
    );
    expect(storage.values.has(`${keyPrefix}.lease`)).toBe(true);

    storage.blockedDeletes.clear();
    repository.destroy();
    expect(storage.values.has(`${keyPrefix}.lease`)).toBe(false);
  });

  it('fails closed when opening fails and the acquired lease cannot be released', () => {
    const storage = storageHarness();
    const keyPrefix = 'arena.p6.repository-open-cleanup-debt.test';
    const repository = new ArenaV2LearningProfileRepositoryV1({
      definition: DEFINITION,
      storage: storage.port,
      ownerId: 'owner.p6.repository-open-cleanup-debt.test',
      wallNow: () => 1_000,
      keyPrefix,
    });
    storage.failedReads.add(`${keyPrefix}.slot-a`);
    storage.blockedDeletes.add(`${keyPrefix}.lease`);

    const failure = captureFailure(() => repository.open());
    expect(failure).toBeInstanceOf(ArenaV2LearningProfileIndeterminateWriteError);
    expect(failure).toMatchObject({
      cause: {
        originalError: expect.any(Error),
        cleanupErrors: [expect.any(Error)],
      },
    });
    expect(storage.values.has(`${keyPrefix}.lease`)).toBe(true);
    expect(() => repository.open()).toThrow(ArenaV2LearningProfileIndeterminateWriteError);

    storage.failedReads.clear();
    storage.blockedDeletes.clear();
    repository.destroy();
    expect(storage.values.has(`${keyPrefix}.lease`)).toBe(false);
  });

  it('marks a swallowed post-write Storage callback reentry indeterminate', () => {
    const storage = storageHarness();
    const repository = new ArenaV2LearningProfileRepositoryV1({
      definition: DEFINITION,
      storage: storage.port,
      ownerId: 'owner.p6.repository-reentry.test',
      wallNow: () => 1_000,
      keyPrefix: 'arena.p6.repository-reentry.test',
    });
    const current = repository.open();
    const next = advanceArenaV2LearningProfileV1(
      DEFINITION,
      current,
      grant(),
      current.revision,
    ).profile;
    storage.setOnWrite((key) => {
      if (!key.endsWith('.slot-a')) return;
      try { repository.destroy(); } catch { /* Storage swallows the reentry rejection. */ }
    });

    expect(() => repository.compareAndSet(next, current.revision)).toThrow(
      ArenaV2LearningProfileIndeterminateWriteError,
    );
    expect(storage.values.has('arena.p6.repository-reentry.test.slot-a')).toBe(true);
    expect(() => repository.getSnapshot()).toThrow(
      ArenaV2LearningProfileIndeterminateWriteError,
    );

    storage.setOnWrite(null);
    repository.destroy();

    const recovered = new ArenaV2LearningProfileRepositoryV1({
      definition: DEFINITION,
      storage: storage.port,
      ownerId: 'owner.p6.repository-reentry.recovered.test',
      wallNow: () => 1_000,
      keyPrefix: 'arena.p6.repository-reentry.test',
    });
    expect(recovered.open().revision).toBe(1);
    recovered.destroy();
  });

  it('stops opening after the first swallowed Storage read reentry', () => {
    const storage = storageHarness();
    const keyPrefix = 'arena.p6.repository-read-reentry.test';
    let repository: ArenaV2LearningProfileRepositoryV1;
    storage.setOnRead((key) => {
      if (key !== `${keyPrefix}.slot-a`) return;
      try { repository.getDiagnostics(); } catch { /* Storage swallows the rejection. */ }
    });
    repository = new ArenaV2LearningProfileRepositoryV1({
      definition: DEFINITION,
      storage: storage.port,
      ownerId: 'owner.p6.repository-read-reentry.test',
      wallNow: () => 1_000,
      keyPrefix,
    });

    expect(() => repository.open()).toThrow(ArenaV2LearningProfileIndeterminateWriteError);
    expect(storage.readKeys).not.toContain(`${keyPrefix}.slot-b`);
    expect(storage.readKeys).not.toContain(`${keyPrefix}.head`);
    storage.setOnRead(null);
    repository.destroy();
  });

  it('commits the durable head/profile watermark before rejecting swallowed reentry', () => {
    const storage = storageHarness();
    const keyPrefix = 'arena.p6.repository-head-reentry.test';
    const repository = new ArenaV2LearningProfileRepositoryV1({
      definition: DEFINITION,
      storage: storage.port,
      ownerId: 'owner.p6.repository-head-reentry.test',
      wallNow: () => 1_000,
      keyPrefix,
    });
    const current = repository.open();
    const next = advanceArenaV2LearningProfileV1(
      DEFINITION,
      current,
      grant(),
      current.revision,
    ).profile;
    storage.setOnWrite((key) => {
      if (key !== `${keyPrefix}.head`) return;
      try { repository.getSnapshot(); } catch { /* Storage swallows the rejection. */ }
    });

    expect(() => repository.compareAndSet(next, current.revision)).toThrow(
      ArenaV2LearningProfileIndeterminateWriteError,
    );
    expect(storage.values.get(`${keyPrefix}.head`)).toBe('a');
    storage.setOnWrite(null);
    repository.destroy();

    const recovered = new ArenaV2LearningProfileRepositoryV1({
      definition: DEFINITION,
      storage: storage.port,
      ownerId: 'owner.p6.repository-head-reentry.recovered.test',
      wallNow: () => 1_000,
      keyPrefix,
    });
    expect(recovered.open().revision).toBe(1);
    recovered.destroy();
  });

  it('publishes destroyed before rejecting swallowed lease cleanup reentry', () => {
    const storage = storageHarness();
    const keyPrefix = 'arena.p6.repository-destroy-reentry.test';
    const repository = new ArenaV2LearningProfileRepositoryV1({
      definition: DEFINITION,
      storage: storage.port,
      ownerId: 'owner.p6.repository-destroy-reentry.test',
      wallNow: () => 1_000,
      keyPrefix,
    });
    repository.open();
    storage.setOnDelete((key) => {
      if (key !== `${keyPrefix}.lease`) return;
      try { repository.getStorageKeys(); } catch { /* Storage swallows the rejection. */ }
    });

    expect(() => repository.destroy()).toThrow(ArenaV2LearningProfileIndeterminateWriteError);
    expect(() => repository.getDiagnostics()).toThrow(/已销毁/u);
  });
});
