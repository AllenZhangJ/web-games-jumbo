import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
  ArenaV2LearningProfileIndeterminateWriteError,
  ArenaV2LearningProfileSaveConflictError,
  createArenaV2LearningGrantV1,
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
  type ArenaV2LearningProfileV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ArenaV2LearningProfileServiceErrorV1,
  ArenaV2LearningProfileServiceV1,
} from '../src/index.js';

const DEFINITION = createArenaV2LearningProfileDefinitionV1({
  schemaVersion: ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  id: 'arena-v2.learning-profile-service.test.v1',
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

function grant(grantId = 'arena-learning:v1:deadbeef') {
  return createArenaV2LearningGrantV1(DEFINITION, {
    schemaVersion: ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
    grantId,
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

function repositoryHarness() {
  let profile = createArenaV2LearningProfileV1(DEFINITION);
  let open = (): unknown => profile;
  let destroy = (): unknown => undefined;
  let compare = (next: ArenaV2LearningProfileV1, expectedRevision: number): unknown => {
    if (profile.revision !== expectedRevision) {
      return { committed: false, reason: 'memory-revision-mismatch', headUpdated: false };
    }
    profile = next;
    return { committed: true, reason: null, headUpdated: true };
  };
  let snapshot = (): unknown => profile;
  return {
    port: {
      open() { return open(); },
      getSnapshot() { return snapshot(); },
      renewLease() { return true; },
      compareAndSet(next: unknown, expectedRevision: unknown) {
        return compare(next as ArenaV2LearningProfileV1, expectedRevision as number);
      },
      destroy() { return destroy(); },
    },
    publish(next: ArenaV2LearningProfileV1) { profile = next; },
    setOpen(value: typeof open) { open = value; },
    setDestroy(value: typeof destroy) { destroy = value; },
    setCompare(value: typeof compare) { compare = value; },
    setSnapshot(value: typeof snapshot) { snapshot = value; },
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

describe('Arena V2 Learning Profile Service V1', () => {
  it('fails closed after destroy starts and retries the same Repository owner', () => {
    const repository = repositoryHarness();
    let destroyCalls = 0;
    repository.setDestroy(() => {
      destroyCalls += 1;
      if (destroyCalls === 1) throw new Error('cleanup failed');
    });
    const service = new ArenaV2LearningProfileServiceV1({
      definition: DEFINITION,
      repository: repository.port,
    });
    service.open();

    expect(() => service.destroy()).toThrow(/cleanup failed/u);
    expect(service.state).toBe('failed');
    expect(() => service.getSnapshot()).toThrow(
      ArenaV2LearningProfileIndeterminateWriteError,
    );
    expect(service.getLastKnownSnapshot().revision).toBe(0);

    service.destroy();
    expect(destroyCalls).toBe(2);
    expect(service.state).toBe('destroyed');
  });

  it('requires restart when Repository open reports unresolved lease cleanup debt', () => {
    const repository = repositoryHarness();
    repository.setOpen(() => {
      throw new ArenaV2LearningProfileIndeterminateWriteError('open cleanup debt');
    });
    const service = new ArenaV2LearningProfileServiceV1({
      definition: DEFINITION,
      repository: repository.port,
    });

    expect(captureFailure(() => service.open())).toMatchObject({
      recoverable: false,
      restartRequired: true,
      reason: 'ARENA_V2_LEARNING_PROFILE_INDETERMINATE_WRITE',
    });
    expect(service.state).toBe('failed');
  });

  it('fails closed when Repository swallows Service reentry before throwing from open', () => {
    const repository = repositoryHarness();
    let service: ArenaV2LearningProfileServiceV1;
    repository.setOpen(() => {
      try { service.destroy(); } catch { /* Repository swallows the reentry rejection. */ }
      throw new Error('open failed after swallowed reentry');
    });
    service = new ArenaV2LearningProfileServiceV1({
      definition: DEFINITION,
      repository: repository.port,
    });

    expect(captureFailure(() => service.open())).toMatchObject({
      recoverable: false,
      restartRequired: false,
      reason: 'repository-callback-reentry',
    });
    expect(service.state).toBe('failed');
  });

  it('keeps successful open and destroy callback reentry sticky', () => {
    const openRepository = repositoryHarness();
    const initial = createArenaV2LearningProfileV1(DEFINITION);
    let openService: ArenaV2LearningProfileServiceV1;
    openRepository.setOpen(() => {
      try { openService.state; } catch { /* Repository swallows the reentry rejection. */ }
      return initial;
    });
    openService = new ArenaV2LearningProfileServiceV1({
      definition: DEFINITION,
      repository: openRepository.port,
    });
    expect(captureFailure(() => openService.open())).toMatchObject({
      reason: 'repository-callback-reentry',
    });
    expect(openService.state).toBe('failed');

    const destroyRepository = repositoryHarness();
    const destroyService = new ArenaV2LearningProfileServiceV1({
      definition: DEFINITION,
      repository: destroyRepository.port,
    });
    destroyService.open();
    destroyRepository.setDestroy(() => {
      try {
        destroyService.getLastKnownSnapshot();
      } catch { /* Repository swallows the reentry rejection. */ }
    });
    expect(captureFailure(() => destroyService.destroy())).toMatchObject({
      reason: 'repository-callback-reentry',
    });
    expect(destroyService.state).toBe('failed');
  });

  it('accepts a verified write that throws after publishing and keeps the grant idempotent', () => {
    const repository = repositoryHarness();
    const service = new ArenaV2LearningProfileServiceV1({
      definition: DEFINITION,
      repository: repository.port,
    });
    service.open();
    repository.setCompare((next) => {
      repository.publish(next);
      throw new Error('throw after mutation');
    });
    expect(service.commitGrant(grant())).toMatchObject({
      committed: true,
      duplicate: false,
      profile: { revision: 1, committedGrantIds: ['arena-learning:v1:deadbeef'] },
    });
    const duplicate = service.commitGrant(grant());
    expect(duplicate).toMatchObject({
      committed: false,
      duplicate: true,
      profile: { revision: 1 },
    });
    expect(duplicate.modeCompletionDeltas).toEqual([]);
  });

  it('returns duplicate when a concurrent writer already committed the same grant', () => {
    const repository = repositoryHarness();
    const service = new ArenaV2LearningProfileServiceV1({
      definition: DEFINITION,
      repository: repository.port,
    });
    service.open();
    repository.setCompare((next) => {
      repository.publish(next);
      return { committed: false, reason: 'storage-revision-mismatch', headUpdated: false };
    });
    const duplicate = service.commitGrant(grant());
    expect(duplicate).toMatchObject({
      committed: false,
      duplicate: true,
      profile: { revision: 1 },
    });
    expect(duplicate.modeCompletionDeltas).toEqual([]);
  });

  it('requires restart for an explicit indeterminate write even when an old snapshot is readable', () => {
    const repository = repositoryHarness();
    const service = new ArenaV2LearningProfileServiceV1({
      definition: DEFINITION,
      repository: repository.port,
    });
    service.open();
    repository.setCompare(() => {
      throw new ArenaV2LearningProfileIndeterminateWriteError('indeterminate');
    });
    expect(captureFailure(() => service.commitGrant(grant()))).toMatchObject({
      recoverable: false,
      restartRequired: true,
      reason: 'ARENA_V2_LEARNING_PROFILE_INDETERMINATE_WRITE',
    });
    expect(service.state).toBe('failed');
    expect(service.getLastKnownSnapshot().revision).toBe(0);
  });

  it('fails closed on save-conflict identity drift without offering retry or restart', () => {
    const repository = repositoryHarness();
    const service = new ArenaV2LearningProfileServiceV1({
      definition: DEFINITION,
      repository: repository.port,
    });
    service.open();
    repository.setCompare(() => {
      throw new ArenaV2LearningProfileSaveConflictError('same generation drift');
    });
    expect(captureFailure(() => service.commitGrant(grant()))).toMatchObject({
      recoverable: false,
      restartRequired: false,
      reason: 'ARENA_V2_LEARNING_PROFILE_SAVE_CONFLICT',
    });
    expect(service.state).toBe('failed');
  });

  it('fails closed when a reported commit cannot return a valid synchronous snapshot', () => {
    const repository = repositoryHarness();
    const service = new ArenaV2LearningProfileServiceV1({
      definition: DEFINITION,
      repository: repository.port,
    });
    service.open();
    repository.setSnapshot(() => Promise.resolve(createArenaV2LearningProfileV1(DEFINITION)));
    const failure = captureFailure(() => service.commitGrant(grant()));
    expect(failure).toBeInstanceOf(ArenaV2LearningProfileServiceErrorV1);
    expect(failure).toMatchObject({
      recoverable: false,
      restartRequired: false,
      reason: 'repository-port-contract-invalid',
    });
    expect(service.state).toBe('failed');
  });

  it('requires restart when Repository swallows reentry after publishing the CAS write', () => {
    const repository = repositoryHarness();
    const service = new ArenaV2LearningProfileServiceV1({
      definition: DEFINITION,
      repository: repository.port,
    });
    service.open();
    repository.setCompare((next) => {
      try { service.destroy(); } catch { /* Repository swallows the reentry rejection. */ }
      repository.publish(next);
      return { committed: true, reason: null, headUpdated: true };
    });

    expect(captureFailure(() => service.commitGrant(grant()))).toMatchObject({
      recoverable: false,
      restartRequired: true,
      reason: 'repository-callback-reentry',
    });
    expect(service.state).toBe('failed');
    expect(service.getLastKnownSnapshot().revision).toBe(1);
  });

  it('rejects hostile synchronous-return accessors without executing them', () => {
    for (const key of ['then', 'constructor'] as const) {
      const repository = repositoryHarness();
      const service = new ArenaV2LearningProfileServiceV1({
        definition: DEFINITION,
        repository: repository.port,
      });
      service.open();
      let accessorCalls = 0;
      const returned = Object.create(null) as Record<string, unknown>;
      Object.defineProperty(returned, key, {
        get() {
          accessorCalls += 1;
          throw new Error('must-not-run');
        },
      });
      repository.setSnapshot(() => returned);

      expect(captureFailure(() => service.commitGrant(grant()))).toMatchObject({
        recoverable: false,
        restartRequired: false,
        reason: 'repository-port-contract-invalid',
      });
      expect(accessorCalls).toBe(0);
      expect(service.state).toBe('failed');
    }
  });
});
