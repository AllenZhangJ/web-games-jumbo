import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ARENA_V1_BALANCE_DEFINITION } from '@number-strategy-jump/arena-v1-content';
import { createMatchAssignment } from '@number-strategy-jump/arena-matchmaking';
import { QuickMatchService } from '@number-strategy-jump/arena-v1-composition';
import { createProductMatchResult } from '@number-strategy-jump/arena-product-contracts';
import {
  PRODUCT_MATCH_RUNTIME_STATE,
  ProductMatchRuntime,
} from '@number-strategy-jump/arena-product-match';
import {
  ARENA_STAGE9_HUMAN_FAIRNESS_ARM_ID,
  createArenaStage9HumanFairnessV1Definition,
} from '@number-strategy-jump/arena-human-match-study';
import {
  createHumanMatchStudyAssignment,
  createHumanMatchStudyParticipantView,
  validateHumanMatchStudyAssignment,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HUMAN_MATCH_STUDY_BUNDLE_SCHEMA_VERSION,
  createHumanMatchStudyBundle,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HUMAN_MATCH_STUDY_CAPTURE_STATE,
  HumanMatchStudyCaptureSession,
} from '@number-strategy-jump/arena-human-match-study';
import {
  createHumanMatchStudyCapturePackage,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HUMAN_MATCH_STUDY_DEFINITION_SCHEMA_VERSION,
  createHumanMatchStudyDefinition,
  type HumanMatchStudyDefinition,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HUMAN_MATCH_STUDY_EXCLUSION_REASON,
  HUMAN_MATCH_STUDY_RECORD_SCHEMA_VERSION,
  HUMAN_MATCH_STUDY_STATUS,
  HUMAN_MATCH_STUDY_TERMINATION_REASON,
  createHumanMatchStudyRecord,
  getHumanMatchStudyProtocolExclusionReasons,
} from '@number-strategy-jump/arena-human-match-study';
import {
  verifyHumanMatchStudyReplay,
} from '@number-strategy-jump/arena-human-match-study-verification';
import {
  HUMAN_MATCH_STUDY_REPORT_STATUS,
  createHumanMatchStudyReport,
} from '@number-strategy-jump/arena-human-match-study';
import {
  TEST_MATCH_CONTENT_PUBLIC_VIEW,
  TEST_MATCH_CONTENT_SELECTION,
} from '../product/stage8-test-content.js';
import {
  writeArenaBuildManifest,
} from '../../../scripts/lib/arena-build-manifest-files.js';

const COMMIT = '1'.repeat(40);

function required<T>(value: T, name: string): NonNullable<T> {
  assert.ok(value != null, `${name} 不存在。`);
  return value as NonNullable<T>;
}

function record(value: unknown, name: string): Record<string, unknown> {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), `${name} 必须是对象。`);
  return value as Record<string, unknown>;
}

async function createTestStudyBuild(root: string) {
  const buildRoot = path.join(root, 'clean-web-build');
  await mkdir(buildRoot, { recursive: true });
  for (const fileName of ['greybox.html', 'index.html', 'product.html', 'study.html']) {
    await writeFile(path.join(buildRoot, fileName), `<p>${fileName}</p>\n`);
  }
  await writeArenaBuildManifest({
    outDir: buildRoot,
    buildId: 'build-study-1',
    commit: COMMIT,
    sourceDirty: false,
    target: 'web',
    defaultEntry: 'product',
  });
  return buildRoot;
}

function definitionValue() {
  const value = structuredClone(createArenaStage9HumanFairnessV1Definition().toJSON());
  Reflect.set(value, 'id', 'human-match-study.test.v1');
  return value;
}

test('HumanMatchStudyDefinition freezes candidate, arms, environment and preregistered gates', () => {
  const source = definitionValue();
  const definition = createHumanMatchStudyDefinition(source);
  Reflect.set(required(source.arms[0], '首个研究臂'), 'maximumSessionWinRate', 1);
  assert.equal(required(definition.arms[0], '冻结后的首个研究臂').maximumSessionWinRate, 0.8);
  assert.equal(definition.getContentHash().length, 8);
  assert.ok(Object.isFrozen(definition.thresholds));
  assert.equal(required(
    definition.getArm(ARENA_STAGE9_HUMAN_FAIRNESS_ARM_ID.HARD),
    '高强度研究臂',
  ).difficultyId, 'hard');

  assert.throws(() => createHumanMatchStudyDefinition({
    ...definition.toJSON(),
    schemaVersion: HUMAN_MATCH_STUDY_DEFINITION_SCHEMA_VERSION + 1,
  }), /不支持/);
  const duplicateRank = structuredClone(definition.toJSON());
  Reflect.set(
    required(duplicateRank.arms[1], '第二个研究臂'),
    'botStrengthRank',
    required(duplicateRank.arms[0], '第一个研究臂').botStrengthRank,
  );
  assert.throws(() => createHumanMatchStudyDefinition(duplicateRank), /重复 botStrengthRank/);
  const invalidRange = structuredClone(definition.toJSON());
  Reflect.set(required(invalidRange.arms[0], '无效范围研究臂'), 'minimumSessionWinRate', 0.9);
  assert.throws(() => createHumanMatchStudyDefinition(invalidRange), /下限不能大于上限/);
});

test('Human Match Study assignment block-balances arms and uses natural production difficulty seeds', () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const assignments = Array.from({ length: 12 }, (_, enrollmentIndex) => (
    createHumanMatchStudyAssignment({
      definition,
      participantId: `participant-${enrollmentIndex}`,
      enrollmentIndex,
    })
  ));
  for (let start = 0; start < assignments.length; start += definition.arms.length) {
    assert.deepEqual(
      [...new Set(assignments.slice(start, start + definition.arms.length).map(
        ({ armId }) => armId,
      ))].sort(),
      definition.arms.map(({ id }) => id).sort(),
    );
  }
  for (const assignment of assignments) {
    assert.equal(assignment.matchSeeds.length, definition.matchesPerParticipant);
    assert.equal(new Set(assignment.matchSeeds).size, definition.matchesPerParticipant);
    for (const matchSeed of assignment.matchSeeds) {
      const productionAssignment = createMatchAssignment({ matchSeed });
      assert.equal(productionAssignment.selectedDifficultyId, assignment.difficultyId);
      assert.equal(productionAssignment.effectiveDifficultyId, assignment.difficultyId);
    }
  }
  assert.deepEqual(
    createHumanMatchStudyAssignment({
      definition,
      participantId: 'participant-0',
      enrollmentIndex: 0,
    }),
    assignments[0],
  );
});

test('Human Match Study assignment rejects tampering and participant view hides difficulty and seeds', () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const assignment = createHumanMatchStudyAssignment({
    definition,
    participantId: 'anonymous-001',
    enrollmentIndex: 4,
  });
  const tampered = structuredClone(assignment);
  Reflect.set(
    tampered.matchSeeds,
    0,
    (required(tampered.matchSeeds[0], '首局种子') + 1) >>> 0,
  );
  assert.throws(
    () => validateHumanMatchStudyAssignment(definition, tampered),
    /无法由入组合同复现/,
  );
  const participantView = createHumanMatchStudyParticipantView(definition, assignment);
  assert.equal('difficultyId' in participantView, false);
  assert.equal('armId' in participantView, false);
  assert.equal('matchSeeds' in participantView, false);
  assert.ok(Object.isFrozen(participantView));
});

test('Arena Stage 9 human fairness V1 fixes three hidden arms and sufficient real-human sample size', () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  assert.equal(definition.arms.length, 3);
  assert.equal(definition.matchesPerParticipant, 3);
  assert.equal(definition.thresholds.minimumEligibleParticipantsPerArm, 30);
  assert.equal(definition.thresholds.minimumAggregateSessionWinRate, 0.4);
  assert.equal(definition.thresholds.maximumAggregateSessionWinRate, 0.6);
  assert.equal(definition.thresholds.maximumAdjacentSessionWinRateInversion, 0.1);
  assert.match(definition.participantPrompt, /1v1/);
  assert.doesNotMatch(definition.participantPrompt, /机器人|真人|难度/);
});

function testStudyDefinition() {
  const value = structuredClone(createArenaStage9HumanFairnessV1Definition().toJSON());
  Reflect.set(value, 'id', 'arena.stage9.human-fairness.test.v1');
  Reflect.set(value.thresholds, 'minimumEligibleParticipantsPerArm', 2);
  Reflect.set(value.thresholds, 'minimumAggregateSessionWinRate', 0.3);
  Reflect.set(value.thresholds, 'maximumAggregateSessionWinRate', 0.8);
  Reflect.set(value.thresholds, 'maximumAggregateWilsonIntervalWidth', 0.9);
  const easy = required(value.arms.find(({ difficultyId }) => difficultyId === 'easy'), '简单研究臂');
  const normal = required(value.arms.find(({ difficultyId }) => difficultyId === 'normal'), '普通研究臂');
  const hard = required(value.arms.find(({ difficultyId }) => difficultyId === 'hard'), '困难研究臂');
  Reflect.set(easy, 'maximumSessionWinRate', 1);
  Reflect.set(normal, 'minimumSessionWinRate', 0);
  Reflect.set(normal, 'maximumSessionWinRate', 1);
  Reflect.set(hard, 'minimumSessionWinRate', 0);
  return createHumanMatchStudyDefinition(value);
}

function productReplay(matchSeed: number, winnerId: string | null, endedAtTick = 8_000) {
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
      reason: winnerId === null ? 'hard-limit-draw' : 'last-participant-standing',
      isDraw: winnerId === null,
      endedAtTick,
    },
  };
}

function productResult(matchSeed: number, winnerId: string | null, endedAtTick = 8_000) {
  const assignment = createMatchAssignment({ matchSeed });
  const replay = productReplay(matchSeed, winnerId, endedAtTick);
  return createProductMatchResult({
    matchSeed,
    opponent: assignment.opponent,
    content: TEST_MATCH_CONTENT_PUBLIC_VIEW,
    replay,
  });
}

interface CompletedRecordOptions {
  readonly sessionWin?: boolean;
  readonly botGuess?: boolean;
  readonly environment?: unknown;
}

function completedRecord(definition: HumanMatchStudyDefinition, enrollmentIndex: number, {
  sessionWin = true,
  botGuess = false,
  environment = definition.environment,
}: CompletedRecordOptions = {}) {
  const assignment = createHumanMatchStudyAssignment({
    definition,
    participantId: `study-participant-${enrollmentIndex}`,
    enrollmentIndex,
  });
  const winners = sessionWin
    ? ['player-1', 'player-1', 'player-2']
    : ['player-1', 'player-2', 'player-2'];
  return {
    schemaVersion: HUMAN_MATCH_STUDY_RECORD_SCHEMA_VERSION,
    recordId: `study-record-${enrollmentIndex}`,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: COMMIT,
    buildId: 'build-study-1',
    performedAt: `2026-07-18T00:00:${String(enrollmentIndex).padStart(2, '0')}.000Z`,
    operatorId: 'operator-1',
    assignment,
    status: HUMAN_MATCH_STUDY_STATUS.COMPLETED,
    terminationReason: HUMAN_MATCH_STUDY_TERMINATION_REASON.STUDY_COMPLETED,
    environment,
    eligibility: {
      consentConfirmed: true,
      priorArenaExperience: false,
      priorStudyExposure: false,
      briefingDeviation: false,
      operatorAssistance: false,
    },
    matches: assignment.matchSeeds.map((matchSeed, matchIndex) => ({
      matchIndex,
      result: productResult(matchSeed, required(winners[matchIndex], `第 ${matchIndex} 局胜者`)),
      replayArtifact: {
        id: `replay-${enrollmentIndex}-${matchIndex}`,
        path: `participant-${enrollmentIndex}/match-${matchIndex}.json`,
        sha256: matchSeed.toString(16).padStart(64, '0'),
        byteLength: 1_024,
      },
    })),
    selfReport: {
      opponentTypeGuess: botGuess ? 'bot' : 'unsure',
      fairnessRating: 4,
      naturalnessRating: 4,
      wouldRematch: true,
    },
  };
}

test('HumanMatchStudyRecord binds production opponent, natural difficulty, replay and privacy fields', () => {
  const definition = testStudyDefinition();
  const source = completedRecord(definition, 0);
  const record = createHumanMatchStudyRecord(definition, source);
  assert.equal(record.matches.length, 3);
  assert.ok(Object.isFrozen(required(record.matches[0], '首局研究记录').result));
  assert.deepEqual(getHumanMatchStudyProtocolExclusionReasons(definition, record), []);

  const wrongSeed = structuredClone(source);
  Reflect.set(
    required(wrongSeed.matches[0], '错误种子首局').result,
    'matchSeed',
    required(wrongSeed.matches[1], '错误种子次局').result.matchSeed,
  );
  assert.throws(() => createHumanMatchStudyRecord(definition, wrongSeed), /authorityHash|matchSeed/);
  const incomplete = structuredClone(source);
  incomplete.matches.pop();
  assert.throws(() => createHumanMatchStudyRecord(definition, incomplete), /完整预注册对局/);
  for (const invalidPath of [
    '../replay.json',
    'C:/replay.json',
    'https://example.com/replay.json',
    'participant-0/replay\u0000.json',
  ]) {
    const invalidArtifact = structuredClone(source);
    Reflect.set(
      required(invalidArtifact.matches[0], '无效产物首局').replayArtifact,
      'path',
      invalidPath,
    );
    assert.throws(
      () => createHumanMatchStudyRecord(definition, invalidArtifact),
      /相对路径|空段|控制字符/,
    );
  }

  const assisted = completedRecord(definition, 1);
  assisted.eligibility.operatorAssistance = true;
  assert.deepEqual(
    getHumanMatchStudyProtocolExclusionReasons(definition, assisted),
    [HUMAN_MATCH_STUDY_EXCLUSION_REASON.OPERATOR_ASSISTANCE],
  );
});

test('HumanMatchStudyReport distinguishes incomplete, failed and ready evidence with explicit denominators', () => {
  const definition = testStudyDefinition();
  assert.equal(
    createHumanMatchStudyReport(definition, []).status,
    HUMAN_MATCH_STUDY_REPORT_STATUS.INCOMPLETE,
  );
  const prematureFailure = completedRecord(definition, 0, { botGuess: true });
  const premature = createHumanMatchStudyReport(definition, [prematureFailure]);
  assert.equal(premature.status, HUMAN_MATCH_STUDY_REPORT_STATUS.INCOMPLETE);
  assert.ok(premature.failedGateIds.includes('perception.bot-guess-rate'));
  const armSeen = new Map();
  const records = Array.from({ length: 6 }, (_, enrollmentIndex) => {
    const preview = createHumanMatchStudyAssignment({
      definition,
      participantId: `study-participant-${enrollmentIndex}`,
      enrollmentIndex,
    });
    const seen = armSeen.get(preview.difficultyId) ?? 0;
    armSeen.set(preview.difficultyId, seen + 1);
    return completedRecord(definition, enrollmentIndex, {
      sessionWin: preview.difficultyId === 'easy' || seen === 0,
    });
  });
  const ready = createHumanMatchStudyReport(definition, records);
  assert.equal(ready.status, HUMAN_MATCH_STUDY_REPORT_STATUS.READY);
  assert.equal(ready.aggregate.completedParticipants, 6);
  assert.equal(ready.aggregate.completedMatches, 18);
  assert.equal(ready.aggregate.sessionWinRate, 4 / 6);
  assert.ok(required(
    ready.aggregate.sessionWinWilsonInterval,
    '总体胜率 Wilson 区间',
  ).width < 0.9);
  assert.equal(ready.failedGateIds.length, 0);
  assert.equal(ready.resultHash.length, 8);

  const suspicious = records.map((record) => structuredClone(record));
  suspicious.forEach((record) => { record.selfReport.opponentTypeGuess = 'bot'; });
  const failed = createHumanMatchStudyReport(definition, suspicious);
  assert.equal(failed.status, HUMAN_MATCH_STUDY_REPORT_STATUS.FAILED);
  assert.ok(failed.failedGateIds.includes('perception.bot-guess-rate'));

  const middleInversionSeen = new Map();
  const middleInversion = Array.from({ length: 6 }, (_, enrollmentIndex) => {
    const assignment = createHumanMatchStudyAssignment({
      definition,
      participantId: `study-participant-${enrollmentIndex}`,
      enrollmentIndex,
    });
    const seen = middleInversionSeen.get(assignment.difficultyId) ?? 0;
    middleInversionSeen.set(assignment.difficultyId, seen + 1);
    return completedRecord(definition, enrollmentIndex, {
      sessionWin: assignment.difficultyId === 'normal'
        || (assignment.difficultyId === 'easy' && seen === 0),
    });
  });
  const inverted = createHumanMatchStudyReport(definition, middleInversion);
  assert.equal(inverted.status, HUMAN_MATCH_STUDY_REPORT_STATUS.FAILED);
  assert.ok(inverted.failedGateIds.some((id) => id.startsWith(
    'win-rate.adjacent-inversion.',
  )));

  const duplicate = [...records, structuredClone(required(records[0], '首个研究记录'))];
  assert.throws(() => createHumanMatchStudyReport(definition, duplicate), /重复 recordId/);
  assert.throws(
    () => createHumanMatchStudyReport(definition, [
      required(records[0], '首个研究记录'),
      required(records[2], '第三个研究记录'),
    ]),
    /enrollmentIndex 必须从 0 连续/,
  );
});

test('HumanMatchStudyBundle binds one immutable build and cannot predate records', () => {
  const definition = testStudyDefinition();
  const records = [completedRecord(definition, 0), completedRecord(definition, 1)];
  const source = {
    schemaVersion: HUMAN_MATCH_STUDY_BUNDLE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: COMMIT,
    buildId: 'build-study-1',
    createdAt: '2026-07-18T00:01:00.000Z',
    records,
  };
  const bundle = createHumanMatchStudyBundle(definition, source);
  assert.equal(bundle.records.length, 2);
  assert.ok(Object.isFrozen(bundle.records));

  const mixedBuild = structuredClone(source);
  Reflect.set(required(mixedBuild.records[1], '第二条混合构建记录'), 'buildId', 'another-build');
  assert.throws(() => createHumanMatchStudyBundle(definition, mixedBuild), /buildId/);
  const predatesRecord = structuredClone(source);
  predatesRecord.createdAt = '2026-07-17T23:59:59.000Z';
  assert.throws(() => createHumanMatchStudyBundle(definition, predatesRecord), /不能早于/);
  const missingEnrollment = structuredClone(source);
  missingEnrollment.records.shift();
  assert.throws(
    () => createHumanMatchStudyBundle(definition, missingEnrollment),
    /enrollmentIndex 必须从 0 连续/,
  );
});

function completedFakeLocalMatch(matchSeed: number, winnerId: string | null = 'player-1') {
  const assignment = createMatchAssignment({ matchSeed });
  const replay = productReplay(matchSeed, winnerId);
  let state = 'created';
  return {
    matchSeed,
    opponent: assignment.opponent,
    content: TEST_MATCH_CONTENT_PUBLIC_VIEW,
    session: {
      get state() { return state; },
      start() { state = 'running'; },
      setPaused() {},
      step() {
        state = 'ended';
        return Object.freeze({ events: Object.freeze([]), snapshot: Object.freeze({ tick: 1 }) });
      },
      getSnapshot() { return Object.freeze({ tick: state === 'ended' ? 1 : 0 }); },
      exportReplay() { return replay; },
      destroy() { state = 'destroyed'; },
    },
  };
}

test('HumanMatchStudyCaptureSession drives the unchanged Product runtime and hides its arm', () => {
  const definition = testStudyDefinition();
  const assignment = createHumanMatchStudyAssignment({
    definition,
    participantId: 'capture-participant',
    enrollmentIndex: 0,
  });
  const capture = new HumanMatchStudyCaptureSession({ definition, assignment });
  const ports = capture.getPresentationPorts();
  for (let index = 0; index < definition.matchesPerParticipant; index += 1) {
    const matchSeed = ports.seedSource.nextSeed();
    assert.equal(matchSeed, assignment.matchSeeds[index]);
    const runtime = new ProductMatchRuntime(
      completedFakeLocalMatch(matchSeed, index === 2 ? 'player-2' : 'player-1'),
      { completionSink: ports.matchCompletionSink },
    );
    runtime.start();
    runtime.step();
    assert.equal(runtime.state, PRODUCT_MATCH_RUNTIME_STATE.ENDED);
    runtime.destroy();
  }
  assert.equal(capture.state, HUMAN_MATCH_STUDY_CAPTURE_STATE.COMPLETED);
  const participant = capture.getParticipantSnapshot();
  assert.equal(participant.completedMatchCount, 3);
  assert.equal('armId' in participant, false);
  assert.equal('difficultyId' in participant, false);
  assert.equal('matchSeeds' in participant, false);
  const operator = record(capture.exportOperatorCapture(), '操作员捕获');
  assert.ok(Array.isArray(operator.matches), '操作员捕获 matches 必须是数组。');
  const operatorAssignment = record(operator.assignment, '操作员捕获 assignment');
  assert.equal(operator.matches.length, 3);
  assert.equal(operatorAssignment.difficultyId, assignment.difficultyId);
  assert.ok(Object.isFrozen(record(required(operator.matches[0], '操作员首局'), '操作员首局').replay));
  capture.destroy();
  assert.equal(capture.state, HUMAN_MATCH_STUDY_CAPTURE_STATE.DESTROYED);
});

test('study capture and Product completion ports fail closed on missing replay or async sinks', () => {
  const definition = testStudyDefinition();
  const assignment = createHumanMatchStudyAssignment({
    definition,
    participantId: 'capture-failure-participant',
    enrollmentIndex: 0,
  });
  const capture = new HumanMatchStudyCaptureSession({ definition, assignment });
  const ports = capture.getPresentationPorts();
  ports.seedSource.nextSeed();
  assert.throws(() => ports.seedSource.nextSeed(), /尚未留下完整 Replay/);
  assert.equal(capture.state, HUMAN_MATCH_STUDY_CAPTURE_STATE.FAILED);
  capture.destroy();

  const runtime = new ProductMatchRuntime(
    completedFakeLocalMatch(required(assignment.matchSeeds[0], '首局种子')),
    { completionSink: async () => {} },
  );
  runtime.start();
  assert.throws(() => runtime.step(), /必须同步完成/);
  assert.equal(runtime.state, PRODUCT_MATCH_RUNTIME_STATE.FAILED);
  runtime.destroy();
});

test('human fairness evidence CLI describes V1 and reports an empty bundle as incomplete', async () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const described = spawnSync(process.execPath, [
    '--import', 'tsx',
    'scripts/arena-human-fairness-evidence.ts',
    '--describe',
  ], { cwd: path.resolve('.'), encoding: 'utf8' });
  assert.equal(described.status, 0, described.stderr);
  const description = JSON.parse(described.stdout);
  assert.equal(description.definitionHash, definition.getContentHash());
  assert.equal(description.minimumCompletedParticipants, 90);
  assert.equal(description.minimumCompletedMatches, 270);

  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-human-fairness-'));
  try {
    const buildRoot = await createTestStudyBuild(root);
    const workspaceBytes = Buffer.from(`${JSON.stringify({
      schemaVersion: 1,
      definitionId: definition.id,
      definitionHash: definition.getContentHash(),
      revision: 0,
      activeTrial: null,
      receipts: [],
    }, null, 2)}\n`);
    await writeFile(path.join(root, 'workspace-audit.json'), workspaceBytes);
    await writeFile(path.join(root, 'capture-package-manifest.json'), `${JSON.stringify({
      schemaVersion: 1,
      definitionId: definition.id,
      definitionHash: definition.getContentHash(),
      commit: COMMIT,
      buildId: 'build-study-1',
      workspace: {
        sourceSha256: createHash('sha256').update(workspaceBytes).digest('hex'),
        sourceByteLength: workspaceBytes.byteLength,
        revision: 0,
        receiptCount: 0,
        archivedPath: 'workspace-audit.json',
      },
      packages: [],
    }, null, 2)}\n`);
    const bundlePath = path.join(root, 'study-evidence.json');
    await writeFile(bundlePath, `${JSON.stringify({
      schemaVersion: HUMAN_MATCH_STUDY_BUNDLE_SCHEMA_VERSION,
      definitionId: definition.id,
      definitionHash: definition.getContentHash(),
      commit: COMMIT,
      buildId: 'build-study-1',
      createdAt: '2026-07-18T00:00:00.000Z',
      records: [],
    }, null, 2)}\n`);
    const incomplete = spawnSync(process.execPath, [
      '--import', 'tsx',
      'scripts/arena-human-fairness-evidence.ts',
      '--bundle',
      bundlePath,
      '--build-root',
      buildRoot,
    ], { cwd: path.resolve('.'), encoding: 'utf8' });
    assert.equal(incomplete.status, 2, incomplete.stderr);
    const output = JSON.parse(incomplete.stdout);
    assert.equal(output.verifiedMatchCount, 0);
    assert.equal(output.report.status, HUMAN_MATCH_STUDY_REPORT_STATUS.INCOMPLETE);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Human Match Study CLI reproduces authority and every hidden Bot input', async () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const source = completedRecord(definition, 0);
  const assignment = source.assignment;
  const matchSeed = required(assignment.matchSeeds[0], '首局权威种子');
  const service = new QuickMatchService();
  const localMatch = service.create({
    matchSeed,
    config: {
      ...ARENA_V1_BALANCE_DEFINITION.matchConfig,
      contentSelection: TEST_MATCH_CONTENT_SELECTION,
    },
  });
  let replay!: ReturnType<typeof localMatch.session.runUntilEnded>;
  try {
    replay = localMatch.session.runUntilEnded(() => null);
  } finally {
    localMatch.session.destroy();
  }
  Reflect.set(source, 'status', HUMAN_MATCH_STUDY_STATUS.ABANDONED);
  Reflect.set(
    source,
    'terminationReason',
    HUMAN_MATCH_STUDY_TERMINATION_REASON.PARTICIPANT_ABANDONED,
  );
  Reflect.set(source, 'matches', [{
    matchIndex: 0,
    result: createProductMatchResult({
      matchSeed,
      opponent: localMatch.opponent,
      content: replay.config.contentSelection,
      replay,
    }),
    replayArtifact: required(source.matches[0], '首局研究来源').replayArtifact,
  }]);
  Reflect.set(source, 'selfReport', null);
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-human-replay-'));
  try {
    const buildRoot = await createTestStudyBuild(root);
    const {
      schemaVersion: ignoredRecordSchemaVersion,
      matches: ignoredRecordMatches,
      ...captureSubmission
    } = source;
    const capturePackage = createHumanMatchStudyCapturePackage(definition, {
      ...captureSubmission,
      matches: [{
        matchIndex: 0,
        result: required(source.matches[0], '捕获包首局来源').result,
        replay,
      }],
    });
    assert.equal(ignoredRecordSchemaVersion, HUMAN_MATCH_STUDY_RECORD_SCHEMA_VERSION);
    assert.equal(ignoredRecordMatches.length, 1);
    const packagePath = path.join(root, 'capture-package.json');
    const packageBytes = Buffer.from(`${JSON.stringify(capturePackage, null, 2)}\n`);
    await writeFile(packagePath, packageBytes);
    const workspacePath = path.join(root, 'workspace-audit.json');
    const workspaceSource = {
      schemaVersion: 1,
      definitionId: definition.id,
      definitionHash: definition.getContentHash(),
      revision: 1,
      activeTrial: null,
      receipts: [{
        schemaVersion: 1,
        trialId: capturePackage.recordId,
        assignment: capturePackage.assignment,
        status: capturePackage.status,
        terminationReason: capturePackage.terminationReason,
        packageReceipt: {
          packageId: capturePackage.packageId,
          fileName: path.basename(packagePath),
          sha256: createHash('sha256').update(packageBytes).digest('hex'),
          byteLength: packageBytes.byteLength,
        },
        confirmedAt: '2026-07-18T00:01:00.000Z',
      }],
    };
    await writeFile(workspacePath, `${JSON.stringify(workspaceSource, null, 2)}\n`);
    const ingestRoot = path.join(root, 'ingested');
    const ingested = spawnSync(process.execPath, [
      '--import', 'tsx',
      'scripts/arena-human-fairness-ingest.ts',
      '--package',
      packagePath,
      '--workspace',
      workspacePath,
      '--build-root',
      buildRoot,
      '--output',
      ingestRoot,
    ], {
      cwd: path.resolve('.'),
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    assert.equal(ingested.status, 0, ingested.stderr);
    const ingestSummary = JSON.parse(ingested.stdout);
    assert.equal(ingestSummary.recordCount, 1);
    assert.equal(ingestSummary.replayCount, 1);
    const mismatchedWorkspace = structuredClone(workspaceSource);
    Reflect.set(
      required(mismatchedWorkspace.receipts[0], '首个工作区回执').packageReceipt,
      'sha256',
      'f'.repeat(64),
    );
    const mismatchedWorkspacePath = path.join(root, 'workspace-mismatched.json');
    await writeFile(
      mismatchedWorkspacePath,
      `${JSON.stringify(mismatchedWorkspace, null, 2)}\n`,
    );
    const rejectedIngest = spawnSync(process.execPath, [
      '--import', 'tsx',
      'scripts/arena-human-fairness-ingest.ts',
      '--package',
      packagePath,
      '--workspace',
      mismatchedWorkspacePath,
      '--build-root',
      buildRoot,
      '--output',
      path.join(root, 'rejected-ingest'),
    ], {
      cwd: path.resolve('.'),
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    assert.equal(rejectedIngest.status, 1);
    assert.match(rejectedIngest.stderr, /workspace receipt 0/);
    const evidenceRoot = path.join(ingestRoot, 'evidence');
    const bundlePath = path.join(evidenceRoot, 'human-fairness-evidence.json');
    const ingestedBundle = JSON.parse(await readFile(bundlePath, 'utf8'));
    assert.equal(ingestedBundle.records[0].recordId, source.recordId);
    assert.equal(ingestedBundle.records[0].matches.length, 1);
    const command = spawnSync(process.execPath, [
      '--import', 'tsx',
      'scripts/arena-human-fairness-evidence.ts',
      '--bundle',
      bundlePath,
      '--build-root',
      buildRoot,
      '--artifacts-root',
      evidenceRoot,
    ], {
      cwd: path.resolve('.'),
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    assert.equal(command.status, 2, command.stderr);
    const output = JSON.parse(command.stdout);
    assert.equal(output.report.status, HUMAN_MATCH_STUDY_REPORT_STATUS.INCOMPLETE);
    assert.equal(output.verifiedMatchCount, 1);
    assert.equal(output.verifiedMatches[0].matchSeed, matchSeed);
    assert.equal(output.verifiedMatches[0].difficultyId, assignment.difficultyId);
    assert.equal(output.verifiedMatches[0].finalHash, replay.finalHash);
    const ingestManifestPath = path.join(evidenceRoot, 'capture-package-manifest.json');
    const tamperedManifest = JSON.parse(await readFile(ingestManifestPath, 'utf8'));
    tamperedManifest.packages[0].sourceFileName = 'unrelated-package.json';
    await writeFile(ingestManifestPath, `${JSON.stringify(tamperedManifest, null, 2)}\n`);
    const rejectedEvidence = spawnSync(process.execPath, [
      '--import', 'tsx',
      'scripts/arena-human-fairness-evidence.ts',
      '--bundle',
      bundlePath,
      '--build-root',
      buildRoot,
      '--artifacts-root',
      evidenceRoot,
    ], {
      cwd: path.resolve('.'),
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    assert.equal(rejectedEvidence.status, 1);
    assert.match(rejectedEvidence.stderr, /workspace\/package receipt 0/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }

  const tampered = structuredClone(replay);
  const botFrame = required(
    tampered.inputFrames.find(({ participantId }) => participantId === 'player-2'),
    'Bot 输入帧',
  );
  Reflect.set(botFrame, 'moveX', botFrame.moveX === 0 ? 0.1 : 0);
  assert.throws(() => verifyHumanMatchStudyReplay({
    definition,
    record: source,
    matchIndex: 0,
    replay: tampered,
  }), /Bot 输入/);
});
