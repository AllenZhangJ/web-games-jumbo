import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { LocalMatchSession } from '@number-strategy-jump/arena-session';
import {
  ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS,
  ARENA_PA7_PROGRESS_HEARTBEAT_MILLIS,
  ARENA_PA7_PROGRESS_HEARTBEAT_TICKS,
  createArenaPa7AtomicProgressWriterV1,
  createArenaPa7FormalProgressControllerV1,
  createArenaPa7FormalRunPayloadFromEvidenceV1,
  createFormalSurvivalBotPressureManifest,
  isArenaPa7FormalWorkerInvocationV1,
  runFormalSurvivalBotPressure,
  serializeArenaPa7FormalWorkerPayloadV1,
  type FormalSurvivalBotPressureReport,
} from '../../scripts/arena-formal-survival-bot-pressure.js';
import {
  ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK,
  ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES,
  ARENA_PA7_FORMAL_LOADER_ATTESTATION_HASH_FLAG,
  ARENA_PA7_FORMAL_NODE_IMPORT_SPECIFIER,
  ARENA_PA7_FORMAL_PROGRESS_PATH_ENV,
  ARENA_PA7_FORMAL_RUN_TOKEN_ENV,
  ARENA_PA7_FORMAL_WORKER_FLAG,
  ARENA_PA7_FORMAL_WORKER_SCRIPT_RELATIVE_PATH,
  assertArenaPa7FormalCaseEvidenceMatchesDoubleRunSummaryV1,
  createArenaPa7FormalCaseEvidenceHashV1,
  validateArenaPa7FormalCaseEvidenceV1,
  validateArenaPa7FormalRunPayloadV1,
  type ArenaPa7FormalCaseEvidenceV1,
  type ArenaPa7FormalDoubleRunSummaryV1,
  type ArenaPa7FormalLifecycleBoundaryV1,
  type ArenaPa7FormalProgressV1,
} from '../../scripts/lib/arena-pa7-formal-contract-v1.js';
import {
  ARENA_PA7_FORMAL_DEFAULT_INACTIVITY_TIMEOUT_MS,
} from '../../scripts/lib/arena-pa7-formal-evidence-v1.js';

let cachedReport: FormalSurvivalBotPressureReport | null = null;

function realThreeCaseReport(): FormalSurvivalBotPressureReport {
  cachedReport ??= runFormalSurvivalBotPressure({
    caseCount: 3,
    uniqueSeedCount: 1,
    hardLimitTicks: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.hardLimitTicks,
  });
  return cachedReport;
}

function rehashEvidence(
  evidence: ArenaPa7FormalCaseEvidenceV1,
  overrides: Partial<ArenaPa7FormalCaseEvidenceV1>,
): ArenaPa7FormalCaseEvidenceV1 {
  const { caseEvidenceHash: _ignored, ...withoutHash } = evidence;
  const candidate = Object.freeze({ ...withoutHash, ...overrides });
  return Object.freeze({
    ...candidate,
    caseEvidenceHash: createArenaPa7FormalCaseEvidenceHashV1(candidate),
  }) as ArenaPa7FormalCaseEvidenceV1;
}

function assertEvidenceDriftRejected(
  summary: ArenaPa7FormalDoubleRunSummaryV1,
  evidence: ArenaPa7FormalCaseEvidenceV1,
  overrides: Partial<ArenaPa7FormalCaseEvidenceV1>,
  label: string,
): void {
  assert.throws(() => {
    const validated = validateArenaPa7FormalCaseEvidenceV1(rehashEvidence(evidence, overrides));
    assertArenaPa7FormalCaseEvidenceMatchesDoubleRunSummaryV1(validated, summary);
  }, label);
}

function createSyntheticFormalPayload() {
  const report = realThreeCaseReport();
  const manifest = createFormalSurvivalBotPressureManifest();
  const caseEvidence = Object.freeze(manifest.cases.map((formalCase, index) => {
    const source = report.caseResults[index % report.caseResults.length]!.pa7CaseEvidence!;
    return rehashEvidence(source, {
      caseIndex: index,
      caseId: formalCase.caseId,
      caseIdentity: formalCase.caseIdentity,
      seed: formalCase.seed,
      difficultyId: formalCase.difficultyId,
      inputPlanId: formalCase.inputPlanId,
      pauseAtTick: formalCase.pauseAtTick,
    });
  }));
  const compositionEvidence = Object.freeze(manifest.cases.map((formalCase, index) => Object.freeze({
    caseId: formalCase.caseId,
    identity: report.caseResults[index % report.caseResults.length]!.compositionIdentity,
  })));
  const progressFinal: ArenaPa7FormalProgressV1 = Object.freeze({
    runToken: 'pa7-test-run-token',
    sequence: 1_500_900,
    completedCases: 300,
    currentCaseIndex: null,
    currentCaseId: null,
    currentPass: null,
    currentTick: null,
    lastCommittedCaseEvidenceHash: caseEvidence.at(-1)!.caseEvidenceHash,
  });
  const processCpuMicrosPerTickSamples = Object.freeze(manifest.cases.flatMap((_, index) => (
    report.caseResults[index % report.caseResults.length]!.processCpuMicrosPerTickSamples
  )));
  const processCpuTotalMicros = manifest.cases.reduce((sum, _, index) => (
    sum + report.caseResults[index % report.caseResults.length]!.processCpuTotalMicros
  ), 0);
  return createArenaPa7FormalRunPayloadFromEvidenceV1({
    runToken: progressFinal.runToken,
    loaderAttestationHash: 'a'.repeat(64),
    manifest,
    progressFinal,
    caseEvidence,
    compositionEvidence,
    metrics: Object.freeze({
      cpuTotalMicros: processCpuTotalMicros,
      cpuMicrosPerTickSamples: processCpuMicrosPerTickSamples,
      wallDurationMillis: 1_000,
      heapBaselineBytes: 1_000,
      heapPeakBytes: 1_200,
      heapEndingBytes: 1_100,
    }),
  });
}

test('formal pressure emits contract-validated evidence from two real runs', () => {
  const report = realThreeCaseReport();
  assert.equal(report.status, 'smoke-passed');
  assert.equal(report.caseResults.length, 3);
  assert.deepEqual(
    report.caseResults.map(({ caseId }) => caseId),
    ['formal-survival-bot-000', 'formal-survival-bot-001', 'formal-survival-bot-002'],
  );
  assert.equal(
    report.cpuTotalMicros,
    report.caseResults.reduce((sum, item) => sum + item.cpuTotalMicros, 0),
  );
  assert.equal(
    report.processCpuTotalMicros,
    report.caseResults.reduce((sum, item) => sum + item.processCpuTotalMicros, 0),
  );
  assert.equal(report.cpuMicrosPerTickSamples.length, 6);
  assert.equal(report.processCpuMicrosPerTickSamples.length, 6);
  assert.notEqual(
    report.processCpuTotalMicros,
    report.cpuTotalMicros,
    'process CPU 必须独立于 readStep self CPU 采集',
  );
  for (const item of report.caseResults) {
    const reconstructed = item.processCpuMicrosPerTickSamples.reduce((sum, sample) => (
      sum + sample * item.finalTick
    ), 0);
    assert.ok(Math.abs(reconstructed - item.processCpuTotalMicros) < 1e-6);
  }

  const firstWaveAt600: ArenaPa7FormalLifecycleBoundaryV1[] = [];
  for (const result of report.caseResults) {
    const summary = result.pa7DoubleRunSummary;
    const evidence = result.pa7CaseEvidence;
    assert.ok(summary, `${result.caseId} summary`);
    assert.ok(evidence, `${result.caseId} evidence`);
    assert.equal(Object.isFrozen(summary), true);
    assert.equal(Object.isFrozen(evidence), true);
    assert.doesNotThrow(() => validateArenaPa7FormalCaseEvidenceV1(evidence));
    assert.doesNotThrow(() => (
      assertArenaPa7FormalCaseEvidenceMatchesDoubleRunSummaryV1(evidence, summary)
    ));
    assert.equal(summary.finalHash, result.finalHash);
    assert.equal(evidence.finalHash, result.finalHash);
    assert.deepEqual(summary.cleanup, {
      sessionsCreated: 2,
      sessionDestroyAttempts: 4,
      sessionsDestroyed: 2,
      readersCreated: 8,
      readersInvalidated: 8,
      pendingCleanupCount: 0,
      cleanupErrorCount: 0,
    });

    const at600 = summary.lifecycleBoundaries.find((boundary) => (
      boundary.waveIndex === 0 && boundary.lifecycleOffset === 600
    ));
    assert.ok(at600, `${result.caseId} first-wave +600`);
    firstWaveAt600.push(at600);

    const secondWave = summary.lifecycleBoundaries.find((boundary) => (
      boundary.waveIndex === 1 && boundary.lifecycleOffset === 1
    ));
    assert.ok(secondWave, `${result.caseId} second-wave +1`);
    const partition = [
      ...secondWave.worldEquipmentInstanceIds,
      ...secondWave.heldEquipmentInstanceIds,
      ...secondWave.retiredEquipmentInstanceIds,
    ];
    assert.equal(partition.length, 3);
    assert.equal(new Set(partition).size, 3);
    assert.deepEqual([...partition].sort(), [...secondWave.waveEquipmentInstanceIds].sort());
    assert.deepEqual(
      secondWave.activeSupplyEquipmentInstanceIds,
      secondWave.worldEquipmentInstanceIds,
    );
    assert.equal(secondWave.remainingTicks.length, secondWave.worldEquipmentInstanceIds.length);
    assert.ok(secondWave.remainingTicks.every((remaining) => remaining === 599));
  }

  assert.ok(firstWaveAt600.some((boundary) => (
    boundary.pendingExpiryEquipmentInstanceIds.length === 0
      && boundary.resyncReadiness === 'ready'
      && !boundary.authorityEventTypes.includes('EquipmentExpired')
  )), '真实三 case 至少包含一个合法 pending=0 / ready / no-expiry 边界');
});

test('formal pressure evidence rejects every raw-trace-derived semantic drift', () => {
  const result = realThreeCaseReport().caseResults[0]!;
  const summary = result.pa7DoubleRunSummary!;
  const evidence = result.pa7CaseEvidence!;
  const changedSha256 = (value: string): string => (
    value === '0'.repeat(64) ? '1'.repeat(64) : '0'.repeat(64)
  );

  for (const field of [
    'inputFrameSequenceHash',
    'authorityEventSequenceHash',
    'worldSnapshotSequenceHash',
    'checkpointSequenceHash',
    'replayV5Hash',
    'resultHash',
    'stateHashSequenceHash',
  ] as const) {
    assertEvidenceDriftRejected(
      summary,
      evidence,
      { [field]: changedSha256(evidence[field]) },
      field,
    );
  }
  assertEvidenceDriftRejected(
    summary,
    evidence,
    { finalHash: evidence.finalHash === '00000000' ? '11111111' : '00000000' },
    'finalHash',
  );
  assertEvidenceDriftRejected(
    summary,
    evidence,
    {
      lifecycleBoundaries: Object.freeze(evidence.lifecycleBoundaries.map((boundary, index) => (
        index === 0
          ? Object.freeze({ ...boundary, snapshotEventSequence: boundary.snapshotEventSequence + 1 })
          : boundary
      ))),
    },
    'lifecycleBoundaries',
  );
  assertEvidenceDriftRejected(
    summary,
    evidence,
    {
      resourcePeaks: Object.freeze({
        ...evidence.resourcePeaks,
        eventWindowCount: Object.freeze({ observed: 1, limit: 1 }),
      }),
    },
    'resourcePeaks',
  );
  assertEvidenceDriftRejected(
    summary,
    evidence,
    {
      cleanup: Object.freeze({
        ...evidence.cleanup,
        sessionDestroyAttempts: evidence.cleanup.sessionDestroyAttempts + 1,
      }),
    },
    'cleanup',
  );
});

test('formal pressure stops at the first failed case without skipping ahead', () => {
  const plans = createFormalSurvivalBotPressureManifest(3, 3).cases;
  const originalStart = LocalMatchSession.prototype.start;
  try {
    for (const targetIndex of [0, 1, 2]) {
      const startedSeeds: number[] = [];
      const targetSeed = plans[targetIndex]!.seed;
      LocalMatchSession.prototype.start = function startWithInjectedFailure(): void {
        const seed = this.getPublicMatchInfo().matchSeed;
        startedSeeds.push(seed);
        if (seed === targetSeed) throw new Error(`injected case failure ${targetIndex}`);
        Reflect.apply(originalStart, this, []);
      };
      assert.throws(
        () => runFormalSurvivalBotPressure({ caseCount: 3, uniqueSeedCount: 3 }),
        new RegExp(`injected case failure ${targetIndex}`),
      );
      assert.deepEqual(startedSeeds, [
        ...plans.slice(0, targetIndex).flatMap(({ seed }) => [seed, seed]),
        targetSeed,
      ]);
    }
  } finally {
    LocalMatchSession.prototype.start = originalStart;
  }
});

test('formal pressure preserves primary and cleanup failures without publishing a report', () => {
  const originalStart = LocalMatchSession.prototype.start;
  const originalDestroy = LocalMatchSession.prototype.destroy;
  let destroyCalls = 0;
  try {
    LocalMatchSession.prototype.start = function startWithPrimaryFailure(): void {
      throw new Error('injected primary failure');
    };
    LocalMatchSession.prototype.destroy = function destroyWithCleanupFailure(): void {
      destroyCalls += 1;
      Reflect.apply(originalDestroy, this, []);
      throw new Error(`injected cleanup failure ${destroyCalls}`);
    };
    let observed: unknown = null;
    try {
      runFormalSurvivalBotPressure({ caseCount: 1, uniqueSeedCount: 1 });
    } catch (error) {
      observed = error;
    }
    assert.ok(observed instanceof AggregateError);
    assert.deepEqual(
      observed.errors.map((error) => error instanceof Error ? error.message : error),
      [
        'injected primary failure',
        'injected cleanup failure 1',
        'injected cleanup failure 2',
      ],
    );
    assert.equal(destroyCalls, 2);
  } finally {
    LocalMatchSession.prototype.start = originalStart;
    LocalMatchSession.prototype.destroy = originalDestroy;
  }
});

test('PA7 progress validates every in-memory tick but publishes bounded atomic heartbeats', () => {
  const published: ArenaPa7FormalProgressV1[] = [];
  let now = 0;
  const controller = createArenaPa7FormalProgressControllerV1({
    runToken: 'pa7-progress-test',
    writeProgress: (progress) => published.push(progress),
    now: () => now,
    heartbeatTicks: ARENA_PA7_PROGRESS_HEARTBEAT_TICKS,
    heartbeatMillis: ARENA_PA7_PROGRESS_HEARTBEAT_MILLIS,
  });
  for (let tick = 1; tick <= 2_401; tick += 1) {
    now += 1;
    controller.observer.onAuthorityTick(0, 1, tick);
  }
  controller.observer.onSecondPassStarted(0, 'formal-survival-bot-000');
  for (let tick = 1; tick <= 2_401; tick += 1) {
    now += 1;
    controller.observer.onAuthorityTick(0, 2, tick);
  }
  const evidence = realThreeCaseReport().caseResults[0]!.pa7CaseEvidence!;
  controller.observer.onCaseCommitted(
    0,
    evidence,
    createFormalSurvivalBotPressureManifest(2, 2).cases[1]!,
  );

  assert.equal(controller.current().sequence, 4_804);
  assert.equal(controller.current().completedCases, 1);
  assert.equal(controller.current().currentCaseIndex, 1);
  assert.ok(published.length < 20, '磁盘心跳必须远少于逐 tick 内存 transition');
  assert.equal(published[0]!.sequence, 0);
  assert.equal(published.at(-1)!.completedCases, 1);
  assert.ok(published.some((item) => item.currentPass === 2 && item.currentTick === 0));
  assert.ok(published.some((item) => item.completedCases === 1 && item.currentTick === 0));
  for (let index = 1; index < published.length; index += 1) {
    const previous = published[index - 1]!;
    const current = published[index]!;
    assert.ok(current.sequence > previous.sequence, '磁盘观察 sequence 只能向前跳');
    assert.ok(current.completedCases >= previous.completedCases, '磁盘观察 case 不得回退');
    if (current.completedCases === previous.completedCases
      && current.currentPass === previous.currentPass) {
      assert.ok(current.currentTick! > previous.currentTick!, '同 pass 磁盘 tick 不得重复/回退');
      assert.ok(
        current.currentTick! - previous.currentTick! <= ARENA_PA7_PROGRESS_HEARTBEAT_TICKS,
        'tick 心跳不得超过冻结间隔',
      );
    }
  }
  assert.ok(
    ARENA_PA7_PROGRESS_HEARTBEAT_MILLIS < ARENA_PA7_FORMAL_DEFAULT_INACTIVITY_TIMEOUT_MS,
    '磁盘心跳时间间隔必须小于 B inactivity window',
  );

  const timed: ArenaPa7FormalProgressV1[] = [];
  let timedNow = 0;
  const timedController = createArenaPa7FormalProgressControllerV1({
    runToken: 'pa7-time-heartbeat-test',
    writeProgress: (progress) => timed.push(progress),
    now: () => timedNow,
  });
  timedNow = ARENA_PA7_PROGRESS_HEARTBEAT_MILLIS + 1;
  timedController.observer.onAuthorityTick(0, 1, 1);
  assert.deepEqual(timed.map(({ currentTick }) => currentTick), [0, 1]);

  const rejected = createArenaPa7FormalProgressControllerV1({
    runToken: 'pa7-rejected-transition-test',
    writeProgress: () => {},
  });
  assert.throws(
    () => rejected.observer.onAuthorityTick(0, 1, 2),
    /tick progress 漂移/,
  );
  assert.throws(
    () => rejected.observer.onSecondPassStarted(0, 'formal-survival-bot-000'),
    /合法终局/,
  );
  assert.equal(rejected.current().sequence, 0, '非法转移不得提交内存 progress');
});

test('PA7 progress writer publishes one complete JSON line and cleans failed staging', () => {
  const directory = realpathSync(mkdtempSync(path.join(tmpdir(), 'arena-pa7-progress-')));
  try {
    const target = path.join(directory, 'progress.json');
    const progress = Object.freeze({
      runToken: 'pa7-progress-writer',
      sequence: 0,
      completedCases: 0,
      currentCaseIndex: 0,
      currentCaseId: 'formal-survival-bot-000',
      currentPass: 1,
      currentTick: 0,
      lastCommittedCaseEvidenceHash: null,
    }) satisfies ArenaPa7FormalProgressV1;
    createArenaPa7AtomicProgressWriterV1(target)(progress);
    const serialized = readFileSync(target, 'utf8');
    assert.equal(serialized.endsWith('\n'), true);
    assert.equal(serialized.slice(0, -1).includes('\n'), false);
    assert.deepEqual(JSON.parse(serialized), progress);

    const failedTarget = path.join(directory, 'failed-progress.json');
    const failedWriter = createArenaPa7AtomicProgressWriterV1(failedTarget, {
      rename: () => { throw new Error('injected atomic replace failure'); },
    });
    assert.throws(() => failedWriter(progress), /injected atomic replace failure/);
    assert.equal(existsSync(failedTarget), false);
    assert.equal(existsSync(`${failedTarget}.tmp`), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('PA7 payload assembly binds formal manifest, real provenance and one-line worker output', () => {
  const payload = createSyntheticFormalPayload();
  assert.doesNotThrow(() => validateArenaPa7FormalRunPayloadV1(payload));
  assert.equal(payload.caseEvidence.length, 300);
  assert.equal(payload.workloadIdentity.productionVariantId, 'C+B+D');
  assert.equal(payload.cleanup.cleanupErrorCount, 0);
  assert.equal(
    payload.aggregate.cpu.microsPerTick,
    payload.aggregate.cpu.totalMicros / payload.aggregate.executedTotalTicks,
  );
  assert.equal(payload.manifestIdentity.contentSelectionHash.length, 8);
  assert.equal(payload.manifestIdentity.compositionContractHash.length, 8);
  const output = serializeArenaPa7FormalWorkerPayloadV1(payload);
  assert.equal(output.endsWith('\n'), true);
  assert.equal(output.slice(0, -1).includes('\n'), false);
  assert.deepEqual(JSON.parse(output), payload);
  assert.equal(
    ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.cpuBudgetMsPerTick,
    ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK / 1_000,
  );
  assert.equal(
    ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.heapGrowthBudgetBytes,
    ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES,
  );
});

test('PA7 worker mode uses frozen flags and fails quietly before any formal execution', () => {
  assert.equal(isArenaPa7FormalWorkerInvocationV1([ARENA_PA7_FORMAL_WORKER_FLAG]), true);
  assert.equal(isArenaPa7FormalWorkerInvocationV1(['--matches', '1']), false);
  const root = process.cwd();
  const command = [
    '--import',
    ARENA_PA7_FORMAL_NODE_IMPORT_SPECIFIER,
    path.resolve(root, ARENA_PA7_FORMAL_WORKER_SCRIPT_RELATIVE_PATH),
    ARENA_PA7_FORMAL_WORKER_FLAG,
    ARENA_PA7_FORMAL_LOADER_ATTESTATION_HASH_FLAG,
    'a'.repeat(64),
  ];
  const baseEnvironment = { ...process.env };
  delete baseEnvironment[ARENA_PA7_FORMAL_RUN_TOKEN_ENV];
  delete baseEnvironment[ARENA_PA7_FORMAL_PROGRESS_PATH_ENV];
  for (const environment of [
    baseEnvironment,
    {
      ...baseEnvironment,
      [ARENA_PA7_FORMAL_RUN_TOKEN_ENV]: '',
      [ARENA_PA7_FORMAL_PROGRESS_PATH_ENV]: '/tmp/unused-pa7-progress.json',
    },
    {
      ...baseEnvironment,
      [ARENA_PA7_FORMAL_RUN_TOKEN_ENV]: 'pa7-invalid-path',
      [ARENA_PA7_FORMAL_PROGRESS_PATH_ENV]: 'relative/progress.json',
    },
  ]) {
    const result = spawnSync(process.execPath, command, {
      cwd: root,
      env: environment,
      encoding: 'utf8',
      timeout: 10_000,
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  }
});
