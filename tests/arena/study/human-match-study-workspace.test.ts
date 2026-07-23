import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatchAssignment } from '@number-strategy-jump/arena-matchmaking';
import { createProductMatchResult } from '@number-strategy-jump/arena-product-contracts';
import {
  createArenaStage9HumanFairnessV1Definition,
} from '@number-strategy-jump/arena-human-match-study';
import {
  materializeHumanMatchStudyCapturePackage,
  validateHumanMatchStudyCapturePackage,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HUMAN_MATCH_STUDY_STATUS,
  HUMAN_MATCH_STUDY_TERMINATION_REASON,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HUMAN_MATCH_STUDY_CHECKPOINT_PHASE,
  HUMAN_MATCH_STUDY_CHECKPOINT_SCHEMA_VERSION,
  createHumanMatchStudyWorkspace,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HumanMatchStudyWorkspaceController,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HumanMatchStudyWorkspaceRepository,
  type HumanMatchStudyAssignment,
  type HumanMatchStudyCapturePackage,
} from '@number-strategy-jump/arena-human-match-study';
import {
  TEST_MATCH_CONTENT_PUBLIC_VIEW,
} from '../product/stage8-test-content.js';

const COMMIT = '2'.repeat(40);
type StudyDefinition = ReturnType<typeof createArenaStage9HumanFairnessV1Definition>;
type WriteObserver = (key: string, value: unknown) => void;

function required<T>(value: T | null | undefined, name: string): T {
  assert.ok(value != null, `${name} 不存在。`);
  return value;
}

function mutableRecord(value: unknown, name: string): Record<string, unknown> {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), `${name} 必须是对象。`);
  return value as Record<string, unknown>;
}

function clone<T>(value: T): T {
  return value === undefined
    ? value
    : JSON.parse(JSON.stringify(value)) as T;
}

function storageHarness() {
  const values = new Map<string, unknown>();
  const writeFailures = new Set<string>();
  let onWrite: WriteObserver | null = null;
  return {
    values,
    writeFailures,
    setOnWrite(callback: WriteObserver | null) {
      onWrite = callback;
    },
    port: {
      storageRead(key: string) {
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        if (writeFailures.has(key)) return false;
        values.set(key, clone(value));
        onWrite?.(key, value);
        return true;
      },
      storageDelete(key: string) {
        values.delete(key);
        return true;
      },
    },
  };
}

function eligibility() {
  return {
    consentConfirmed: true,
    priorArenaExperience: false,
    priorStudyExposure: false,
    briefingDeviation: false,
    operatorAssistance: false,
  };
}

function enrolledValue(definition: StudyDefinition, enrollmentIndex = 0) {
  return {
    participantId: `human-study-${String(enrollmentIndex + 1).padStart(4, '0')}`,
    trialId: `human-study-trial-${String(enrollmentIndex + 1).padStart(4, '0')}`,
    commit: COMMIT,
    buildId: 'arena-study-build',
    performedAt: `2026-07-18T00:00:${String(enrollmentIndex).padStart(2, '0')}.000Z`,
    operatorId: 'operator-a',
    environment: definition.environment,
    eligibility: eligibility(),
  };
}

function fakeReplay(matchSeed: number, winnerId = 'player-1') {
  return {
    replaySchemaVersion: 5,
    schemaVersion: 5,
    physicsBackendVersion: 'lightweight-v3',
    configHash: '12345678',
    ruleContentHash: 'abcdef01',
    finalHash: matchSeed.toString(16).padStart(8, '0'),
    matchSeed,
    config: { contentSelection: TEST_MATCH_CONTENT_PUBLIC_VIEW },
    inputFrames: [],
    checkpoints: [{ tick: 0, hash: '00000000' }],
    events: [],
    result: {
      winnerId,
      reason: 'last-participant-standing',
      isDraw: false,
      endedAtTick: 8_000,
    },
  };
}

function fakeCapture(
  _definition: StudyDefinition,
  assignment: HumanMatchStudyAssignment,
  count: number,
) {
  return Array.from({ length: count }, (_, matchIndex) => {
    const matchSeed = required(assignment.matchSeeds[matchIndex], `第 ${matchIndex} 局种子`);
    const replay = fakeReplay(matchSeed, matchIndex === 2 ? 'player-2' : 'player-1');
    return {
      matchIndex,
      result: createProductMatchResult({
        matchSeed,
        opponent: createMatchAssignment({ matchSeed }).opponent,
        content: replay.config.contentSelection,
        replay,
      }),
      replay,
    };
  });
}

function packageReceipt(capturePackage: HumanMatchStudyCapturePackage) {
  return {
    packageId: capturePackage.packageId,
    fileName: `${capturePackage.packageId}.json`,
    sha256: 'a'.repeat(64),
    byteLength: 1024,
  };
}

test('workspace repository rejects open reentrancy before storage callbacks run', () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const harness = storageHarness();
  const repositoryOwner: { value?: HumanMatchStudyWorkspaceRepository } = {};
  let attempted = false;
  const storage = {
    ...harness.port,
    storageRead(key: string) {
      if (!attempted) {
        attempted = true;
        assert.throws(() => required(repositoryOwner.value, '工作区仓储').open(), /打开不可重入/);
      }
      return harness.port.storageRead(key);
    },
  };
  const repository = new HumanMatchStudyWorkspaceRepository({
    definition,
    storage,
    ownerId: 'reentrant-page',
    wallNow: () => 1_000,
  });
  repositoryOwner.value = repository;
  assert.equal(repository.open().revision, 0);
  assert.equal(attempted, true);
  repository.destroy();
});

test('workspace repository rejects every public operation reentered during a commit', () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const harness = storageHarness();
  const repository = new HumanMatchStudyWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'reentrant-commit-page',
    wallNow: () => 1_000,
  });
  const controller = new HumanMatchStudyWorkspaceController({ definition, repository });
  controller.open();
  const errors: unknown[] = [];
  let attempted = false;
  harness.setOnWrite(() => {
    if (attempted) return;
    attempted = true;
    const operations = [
      () => repository.open(),
      () => repository.getSnapshot(),
      () => repository.getDiagnostics(),
      () => repository.getStorageKeys(),
      () => repository.renewLease(),
      () => repository.compareAndSet({}, 0),
      () => repository.destroy(),
    ];
    for (const operation of operations) {
      try {
        operation();
      } catch (error) {
        errors.push(error);
      }
    }
  });
  controller.enroll(enrolledValue(definition));
  assert.equal(attempted, true);
  assert.equal(errors.length, 7);
  for (const error of errors) {
    assert.ok(error instanceof Error);
    assert.match(error.message, /不可重入/);
  }
  assert.equal(repository.getSnapshot().revision, 1);
  controller.destroy();
});

test('workspace repository fails closed after its lease is lost before commit', () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const harness = storageHarness();
  const repository = new HumanMatchStudyWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'lost-lease-page',
    wallNow: () => 1_000,
  });
  const controller = new HumanMatchStudyWorkspaceController({ definition, repository });
  controller.open();
  controller.enroll(enrolledValue(definition));
  harness.values.delete(repository.getStorageKeys().lease);
  assert.throws(() => controller.start(), /失败关闭/);
  assert.throws(() => repository.getSnapshot(), /失败关闭/);
  controller.destroy();
});

test('workspace controller rejects open reentrancy before repository callbacks return', () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const harness = storageHarness();
  const controllerOwner: { value?: HumanMatchStudyWorkspaceController } = {};
  let attempted = false;
  const repository = new HumanMatchStudyWorkspaceRepository({
    definition,
    storage: {
      ...harness.port,
      storageRead(key: string) {
        if (!attempted) {
          attempted = true;
          assert.throws(() => required(controllerOwner.value, '工作区控制器').open(), /打开不可重入/);
        }
        return harness.port.storageRead(key);
      },
    },
    ownerId: 'controller-reentrant-page',
    wallNow: () => 1_000,
  });
  const controller = new HumanMatchStudyWorkspaceController({ definition, repository });
  controllerOwner.value = controller;
  assert.equal(controller.open().revision, 0);
  assert.equal(attempted, true);
  controller.destroy();
});

test('workspace controller rejects enrollment accessors without executing them', () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const harness = storageHarness();
  const controller = new HumanMatchStudyWorkspaceController({
    definition,
    repository: new HumanMatchStudyWorkspaceRepository({
      definition,
      storage: harness.port,
      ownerId: 'controller-accessor-page',
      wallNow: () => 1_000,
    }),
  });
  controller.open();
  let reads = 0;
  const enrollment = Object.defineProperty({}, 'participantId', {
    enumerable: true,
    get() {
      reads += 1;
      return 'participant';
    },
  });
  assert.throws(() => controller.enroll(enrollment), /访问器|数据字段/);
  assert.equal(reads, 0);
  assert.equal(controller.getOperatorSnapshot().revision, 0);
  controller.destroy();
});

test('workspace controller fails closed on CAS conflict and retries failed destroy', () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const snapshot = createHumanMatchStudyWorkspace(definition);
  let destroyAttempts = 0;
  const repository = {
    open: () => snapshot,
    getSnapshot: () => snapshot,
    compareAndSet: () => Object.freeze({
      committed: false,
      reason: 'storage-revision-mismatch',
      headUpdated: false,
    }),
    renewLease: () => true,
    destroy() {
      destroyAttempts += 1;
      if (destroyAttempts === 1) throw new Error('temporary cleanup failure');
    },
  };
  const controller = new HumanMatchStudyWorkspaceController({ definition, repository });
  controller.open();
  assert.throws(
    () => controller.enroll(enrolledValue(definition)),
    /CAS 未提交.*storage-revision-mismatch/,
  );
  assert.throws(() => controller.getOperatorSnapshot(), /失败关闭/);
  assert.throws(() => controller.destroy(), /temporary cleanup failure/);
  assert.equal(destroyAttempts, 1);
  controller.destroy();
  controller.destroy();
  assert.equal(destroyAttempts, 2);
});

test('raw CapturePackage binds submission, natural difficulty, results and Replay identity', () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const harness = storageHarness();
  const repository = new HumanMatchStudyWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-a',
    wallNow: () => 1000,
  });
  const controller = new HumanMatchStudyWorkspaceController({ definition, repository });
  controller.open();
  const checkpoint = controller.enroll(enrolledValue(definition));
  controller.start();
  const captures = fakeCapture(definition, checkpoint.assignment, 3);
  controller.updateProgress(3);
  controller.beginReview({
    status: HUMAN_MATCH_STUDY_STATUS.COMPLETED,
    terminationReason: HUMAN_MATCH_STUDY_TERMINATION_REASON.STUDY_COMPLETED,
    completedMatchCount: 3,
  });
  const capturePackage = controller.createCapturePackage({
    matches: captures,
    selfReport: {
      opponentTypeGuess: 'unsure',
      fairnessRating: 4,
      naturalnessRating: 4,
      wouldRematch: true,
    },
  });
  assert.equal(capturePackage.matches.length, 3);
  assert.match(capturePackage.packageId, /^human-study-package-[0-9a-f]{8}$/);
  assert.ok(Object.isFrozen(required(capturePackage.matches[0], '首局捕获').replay));

  const artifacts = captures.map((_, index) => ({
    id: `replay-${index}`,
    path: `participant-0/match-${index}.json`,
    sha256: String(index + 1).repeat(64),
    byteLength: 100,
  }));
  const record = materializeHumanMatchStudyCapturePackage(
    definition,
    capturePackage,
    artifacts,
  );
  assert.equal(record.status, HUMAN_MATCH_STUDY_STATUS.COMPLETED);
  assert.equal(record.matches.length, 3);

  const tampered = clone(capturePackage);
  assert.equal(
    Reflect.set(
      required(tampered.matches[0], '被篡改首局').replay,
      'matchSeed',
      required(tampered.matches[1], '被篡改次局').replay.matchSeed,
    ),
    true,
  );
  assert.throws(
    () => validateHumanMatchStudyCapturePackage(definition, tampered),
    /预注册 match seed/,
  );
  controller.destroy();
});

test('workspace reload invalidates a running trial without preserving partial Replay claims', () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const harness = storageHarness();
  let now = 1000;
  const first = new HumanMatchStudyWorkspaceController({
    definition,
    repository: new HumanMatchStudyWorkspaceRepository({
      definition,
      storage: harness.port,
      ownerId: 'page-a',
      wallNow: () => now,
    }),
  });
  first.open();
  const checkpoint = first.enroll(enrolledValue(definition));
  first.start();
  first.updateProgress(1);
  const participant = first.getParticipantSnapshot();
  assert.equal(participant.completedMatchCount, 1);
  assert.equal('difficultyId' in participant, false);
  assert.equal('matchSeeds' in participant, false);
  first.destroy();

  now += 1;
  const recovered = new HumanMatchStudyWorkspaceController({
    definition,
    repository: new HumanMatchStudyWorkspaceRepository({
      definition,
      storage: harness.port,
      ownerId: 'page-b',
      wallNow: () => now,
    }),
  });
  const opened = recovered.open();
  const recoveredTrial = required(opened.activeTrial, '恢复后的试验');
  assert.equal(recoveredTrial.phase, HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RECOVERY_REQUIRED);
  assert.equal(recoveredTrial.completedMatchCount, 0);
  assert.equal(recoveredTrial.terminationReason, 'running-recovered');
  assert.equal(recoveredTrial.assignment.assignmentId, checkpoint.assignment.assignmentId);

  const capturePackage = recovered.createCapturePackage({
    matches: [],
    selfReport: null,
  });
  recovered.markExportPending(capturePackage, packageReceipt(capturePackage));
  recovered.destroy();

  now += 1;
  const confirmer = new HumanMatchStudyWorkspaceController({
    definition,
    repository: new HumanMatchStudyWorkspaceRepository({
      definition,
      storage: harness.port,
      ownerId: 'page-c',
      wallNow: () => now,
    }),
  });
  const confirmerTrial = required(confirmer.open().activeTrial, '待确认导出的试验');
  assert.equal(
    confirmerTrial.phase,
    HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.EXPORT_PENDING,
  );
  const receipt = confirmer.confirmExport('2026-07-18T00:01:00.000Z');
  assert.equal(receipt.status, HUMAN_MATCH_STUDY_STATUS.INVALIDATED);
  const next = confirmer.enroll(enrolledValue(definition, 1));
  assert.equal(next.assignment.enrollmentIndex, 1);
  confirmer.destroy();
});

test('workspace repository alternates slots, survives a bad head and protects future nested schemas', () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const harness = storageHarness();
  let now = 1000;
  const repository = new HumanMatchStudyWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-a',
    wallNow: () => now,
  });
  const initial = repository.open();
  const keys = repository.getStorageKeys();
  const controller = new HumanMatchStudyWorkspaceController({
    definition,
    repository,
  });
  // The repository is already open; controller.open() is idempotent.
  controller.open();
  controller.enroll(enrolledValue(definition));
  assert.equal(harness.values.get(keys.head), 'a');
  controller.start();
  assert.equal(harness.values.get(keys.head), 'b');
  controller.destroy();

  harness.values.set(keys.head, 'broken-head');
  now += 1;
  const restored = new HumanMatchStudyWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-b',
    wallNow: () => now,
  });
  const restoredTrial = required(restored.open().activeTrial, '恢复的运行中试验');
  assert.equal(
    restoredTrial.phase,
    HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING,
  );
  restored.destroy();

  const future = mutableRecord(clone(required(harness.values.get(keys.slotB), 'B 槽工作区')), 'B 槽工作区');
  const futurePayload = mutableRecord(future.payload, 'B 槽工作区.payload');
  const futureTrial = mutableRecord(futurePayload.activeTrial, 'B 槽工作区.activeTrial');
  futureTrial.schemaVersion = HUMAN_MATCH_STUDY_CHECKPOINT_SCHEMA_VERSION + 1;
  harness.values.set(keys.slotA, future);
  harness.values.set(keys.slotB, future);
  now += 1;
  const protectedRepository = new HumanMatchStudyWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId: 'page-c',
    wallNow: () => now,
  });
  assert.throws(() => protectedRepository.open(), /来自未来 schema/);
  protectedRepository.destroy();

  assert.equal(initial.revision, 0);
});

test('workspace rejects non-monotonic progress and mismatched package receipts', () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const harness = storageHarness();
  const controller = new HumanMatchStudyWorkspaceController({
    definition,
    repository: new HumanMatchStudyWorkspaceRepository({
      definition,
      storage: harness.port,
      ownerId: 'page-a',
      wallNow: () => 1000,
    }),
  });
  controller.open();
  const checkpoint = controller.enroll(enrolledValue(definition));
  controller.start();
  controller.updateProgress(1);
  assert.throws(() => controller.updateProgress(0), /必须单调/);
  controller.beginReview({
    status: HUMAN_MATCH_STUDY_STATUS.ABANDONED,
    terminationReason: HUMAN_MATCH_STUDY_TERMINATION_REASON.PARTICIPANT_ABANDONED,
    completedMatchCount: 1,
  });
  const capturePackage = controller.createCapturePackage({
    matches: fakeCapture(definition, checkpoint.assignment, 1),
    selfReport: null,
  });
  assert.throws(
    () => controller.markExportPending(capturePackage, {
      ...packageReceipt(capturePackage),
      packageId: 'wrong-package',
    }),
    /不一致/,
  );
  assert.throws(
    () => controller.markExportPending(capturePackage, {
      ...packageReceipt(capturePackage),
      fileName: 'capture\u0000.json',
    }),
    /控制字符/,
  );

  controller.destroy();
});
