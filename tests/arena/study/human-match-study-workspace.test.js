import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatchAssignment } from '@number-strategy-jump/arena-matchmaking';
import { createProductMatchResult } from '@number-strategy-jump/arena-product-contracts';
import {
  createArenaStage9HumanFairnessV1Definition,
} from '../../../src/arena/study/arena-stage9-human-fairness-v1.js';
import {
  materializeHumanMatchStudyCapturePackage,
  validateHumanMatchStudyCapturePackage,
} from '../../../src/arena/study/human-match-study-capture-package.js';
import {
  HUMAN_MATCH_STUDY_STATUS,
  HUMAN_MATCH_STUDY_TERMINATION_REASON,
} from '../../../src/arena/study/human-match-study-record.js';
import {
  HUMAN_MATCH_STUDY_CHECKPOINT_PHASE,
  HUMAN_MATCH_STUDY_CHECKPOINT_SCHEMA_VERSION,
} from '../../../src/arena/study/human-match-study-workspace.js';
import {
  HumanMatchStudyWorkspaceController,
} from '../../../src/arena/study/human-match-study-workspace-controller.js';
import {
  HumanMatchStudyWorkspaceRepository,
} from '../../../src/arena/study/human-match-study-workspace-repository.js';
import {
  TEST_MATCH_CONTENT_PUBLIC_VIEW,
} from '../product/stage8-test-content.js';

const COMMIT = '2'.repeat(40);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function storageHarness() {
  const values = new Map();
  const writeFailures = new Set();
  return {
    values,
    writeFailures,
    port: {
      storageRead(key) {
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key, value) {
        if (writeFailures.has(key)) return false;
        values.set(key, clone(value));
        return true;
      },
      storageDelete(key) {
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

function enrolledValue(definition, enrollmentIndex = 0) {
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

function fakeReplay(matchSeed, winnerId = 'player-1') {
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
    checkpoints: [],
    events: [],
    result: {
      winnerId,
      reason: 'last-participant-standing',
      isDraw: false,
      endedAtTick: 8_000,
    },
  };
}

function fakeCapture(definition, assignment, count) {
  return Array.from({ length: count }, (_, matchIndex) => {
    const matchSeed = assignment.matchSeeds[matchIndex];
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

function packageReceipt(capturePackage) {
  return {
    packageId: capturePackage.packageId,
    fileName: `${capturePackage.packageId}.json`,
    sha256: 'a'.repeat(64),
    byteLength: 1024,
  };
}

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
  assert.ok(Object.isFrozen(capturePackage.matches[0].replay));

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
  tampered.matches[0].replay.matchSeed = tampered.matches[1].replay.matchSeed;
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
  assert.equal(opened.activeTrial.phase, HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RECOVERY_REQUIRED);
  assert.equal(opened.activeTrial.completedMatchCount, 0);
  assert.equal(opened.activeTrial.terminationReason, 'running-recovered');
  assert.equal(opened.activeTrial.assignment.assignmentId, checkpoint.assignment.assignmentId);

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
  assert.equal(
    confirmer.open().activeTrial.phase,
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
  assert.equal(
    restored.open().activeTrial.phase,
    HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING,
  );
  restored.destroy();

  const future = clone(harness.values.get(keys.slotB));
  future.payload.activeTrial.schemaVersion = HUMAN_MATCH_STUDY_CHECKPOINT_SCHEMA_VERSION + 1;
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
