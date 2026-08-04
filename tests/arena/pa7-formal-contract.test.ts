import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_PA7_FORMAL_CASE_COUNT,
  ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK,
  ARENA_PA7_FORMAL_CONTRACT_ID,
  ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION,
  ARENA_PA7_FORMAL_EQUIPMENT_DESPAWN_REASONS,
  ARENA_PA7_FORMAL_GATE_IDS,
  ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES,
  ARENA_PA7_FORMAL_LOADER_ATTESTATION_HASH_FLAG,
  ARENA_PA7_FORMAL_NODE_IMPORT_SPECIFIER,
  ARENA_PA7_FORMAL_PROGRESS_PATH_ENV,
  ARENA_PA7_FORMAL_REQUEST_V1,
  ARENA_PA7_FORMAL_REQUIRED_EVENT_TYPES,
  ARENA_PA7_FORMAL_RUN_TOKEN_ENV,
  ARENA_PA7_FORMAL_WORKER_FLAG,
  ARENA_PA7_FORMAL_WORKER_SCRIPT_RELATIVE_PATH,
  assertArenaPa7FormalCaseEvidenceMatchesDoubleRunSummaryV1,
  cloneArenaPa7FormalStrictDataV1,
  createArenaPa7FormalCaseEvidenceHashV1,
  createArenaPa7FormalDoubleRunSummaryV1,
  createArenaPa7FormalEvidenceHashV1,
  createArenaPa7FormalLifecycleBoundariesV1,
  createArenaPa7FormalLifecycleBoundaryHashV1,
  createArenaPa7FormalRunSemanticHashV1,
  validateArenaPa7FormalCaseEvidenceV1,
  validateArenaPa7FormalEvidenceV1,
  validateArenaPa7FormalProgressSequenceV1,
  validateArenaPa7FormalRunPayloadV1,
} from '../../scripts/lib/arena-pa7-formal-contract-v1.js';
import { createArenaReadStepScheduleV2 } from '../../scripts/lib/arena-read-step-runner-v2.js';

function hex(value: number, width = 8): string {
  return value.toString(16).padStart(width, '0');
}

function sha(value: number): string {
  return hex(value, 64);
}

const FORMAL_SEED_BASE = 0x6b000000;
const FORMAL_DIFFICULTY_IDS = ['easy', 'normal', 'hard'] as const;
const FORMAL_INPUT_PLAN_IDS = [
  'neutral', 'left-contest', 'center-contest', 'right-contest', 'zigzag', 'jump-cycle',
] as const;
const FORMAL_PAUSE_TICKS = [null, 1_199, 1_200, 1_201, 1_799, 1_800, 1_801, 2_399, 2_400, 2_401] as const;

function formalCaseDefinition(caseIndex: number) {
  const seedIndex = caseIndex % 120;
  const cycleIndex = Math.floor(caseIndex / 120);
  const seed = FORMAL_SEED_BASE + seedIndex;
  const difficultyId = FORMAL_DIFFICULTY_IDS[(seedIndex + cycleIndex) % FORMAL_DIFFICULTY_IDS.length]!;
  const inputPlanId = FORMAL_INPUT_PLAN_IDS[(seedIndex + cycleIndex * 2) % FORMAL_INPUT_PLAN_IDS.length]!;
  const playerParticipantId = (seedIndex + cycleIndex) % 2 === 0 ? 'player-1' : 'player-2';
  const botParticipantId = playerParticipantId === 'player-1' ? 'player-2' : 'player-1';
  const pauseAtTick = FORMAL_PAUSE_TICKS[(seedIndex + cycleIndex * 3) % FORMAL_PAUSE_TICKS.length] ?? null;
  return {
    caseId: `formal-survival-bot-${String(caseIndex).padStart(3, '0')}`,
    caseIdentity: [
      seed,
      difficultyId,
      inputPlanId,
      playerParticipantId,
      botParticipantId,
      pauseAtTick ?? 'none',
    ].join('|'),
    seed,
    difficultyId,
    inputPlanId,
    pauseAtTick,
    playerParticipantId,
    botParticipantId,
  };
}

function withHash<T extends Record<string, unknown>, K extends string>(
  value: T,
  key: K,
  hash: (candidate: unknown) => string,
): T & Record<K, string> {
  return { ...value, [key]: hash(value) } as T & Record<K, string>;
}

function boundary(caseIndex: number, waveIndex: 0 | 1, lifecycleOffset: number) {
  const spawnTick = waveIndex === 0 ? 1_200 : 2_400;
  const authorityTick = spawnTick + lifecycleOffset;
  const ids = [0, 1, 2].map((item) => `equipment-${caseIndex}-${waveIndex}-${item}`);
  const supplyIds = [0, 1, 2].map((item) => `supply-${caseIndex}-${waveIndex}-${item}`);
  const at599 = waveIndex === 0 && lifecycleOffset === 599;
  const at600 = waveIndex === 0 && lifecycleOffset === 600;
  const at601 = waveIndex === 0 && lifecycleOffset === 601;
  const postSpawn = waveIndex === 1 && lifecycleOffset === 1;
  const firstWaveWorld = ids.slice(0, 2);
  const firstWaveHeld = ids.slice(2);
  const value = {
    supplyIds,
    waveEquipmentInstanceIds: ids,
    waveIndex,
    spawnTick,
    lifecycleOffset,
    authorityTick,
    snapshotTick: authorityTick,
    snapshotEventSequence: authorityTick + 10,
    resyncReadiness: at600 ? 'not-ready-pre-expiry' : 'ready',
    pendingAuthorityTick: at600 ? authorityTick : null,
    pendingExpiryEquipmentInstanceIds: at600 ? firstWaveWorld : [],
    worldEquipmentInstanceIds: at599 ? firstWaveWorld : postSpawn ? ids : [],
    heldEquipmentInstanceIds: waveIndex === 0 ? firstWaveHeld : [],
    retiredEquipmentInstanceIds: at601 ? firstWaveWorld : [],
    activeSupplyEquipmentInstanceIds: at599 ? firstWaveWorld : postSpawn ? ids : [],
    remainingTicks: at599 ? [1, 1] : postSpawn ? [599, 599, 599] : [],
    authorityEventTypes: at600
      ? ['EquipmentExpired']
      : at601 ? [] : postSpawn ? ['EquipmentSpawned'] : [],
  };
  return withHash(value, 'boundaryHash', createArenaPa7FormalLifecycleBoundaryHashV1);
}

function eventCounts(multiplier = 1): Record<string, number> {
  return Object.fromEntries(ARENA_PA7_FORMAL_REQUIRED_EVENT_TYPES.map((eventType) => [
    eventType,
    eventType === 'MatchStarted' || eventType === 'MatchEnded'
      ? multiplier
      : eventType === 'EquipmentSpawned' ? 6 * multiplier
        : eventType === 'EquipmentExpired' ? 2 * multiplier : 0,
  ]));
}

function despawnCounts(count = 0): Record<string, number> {
  return Object.fromEntries(ARENA_PA7_FORMAL_EQUIPMENT_DESPAWN_REASONS.map((reason) => [
    reason,
    count,
  ]));
}

function resourcePeaks() {
  return {
    worldEquipmentCount: { observed: 3, limit: 3 },
    runtimeEquipmentCount: { observed: 4, limit: 5 },
    activeSupplyCount: { observed: 3, limit: 3 },
    eventsPerTick: { observed: 4, limit: 10 },
    eventWindowCount: { observed: 10, limit: 32 },
    readerCount: { observed: 4, limit: 4 },
    sessionCount: { observed: 1, limit: 1 },
  };
}

function caseCleanup(multiplier = 1) {
  return {
    sessionsCreated: multiplier,
    sessionDestroyAttempts: multiplier,
    sessionsDestroyed: multiplier,
    readersCreated: multiplier * 4,
    readersInvalidated: multiplier * 4,
    pendingCleanupCount: 0,
    cleanupErrorCount: 0,
  };
}

function caseEvidence(caseIndex: number) {
  const {
    playerParticipantId: _playerParticipantId,
    botParticipantId: _botParticipantId,
    ...definition
  } = formalCaseDefinition(caseIndex);
  const value = {
    schemaVersion: ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION,
    caseIndex,
    ...definition,
    doubleRunCount: 2,
    finalTick: 2_500,
    inputFrameSequenceHash: sha(1_000 + caseIndex),
    authorityEventSequenceHash: sha(2_000 + caseIndex),
    worldSnapshotSequenceHash: sha(3_000 + caseIndex),
    checkpointSequenceHash: sha(4_000 + caseIndex),
    replayV5Hash: sha(5_000 + caseIndex),
    resultHash: sha(6_000 + caseIndex),
    stateHashSequenceHash: sha(7_000 + caseIndex),
    finalHash: hex(8_000 + caseIndex),
    fullAuditCount: 51,
    requiredEventTypeCounts: eventCounts(),
    equipmentDespawnReasonCounts: despawnCounts(),
    lifecycleBoundaries: [
      boundary(caseIndex, 0, 599),
      boundary(caseIndex, 0, 600),
      boundary(caseIndex, 0, 601),
      boundary(caseIndex, 1, 0),
      boundary(caseIndex, 1, 1),
    ],
    resourcePeaks: resourcePeaks(),
    cleanup: caseCleanup(2),
  };
  return withHash(value, 'caseEvidenceHash', createArenaPa7FormalCaseEvidenceHashV1);
}

function aggregate(cases: readonly ReturnType<typeof caseEvidence>[]) {
  const canonicalTotalTicks = cases.reduce((sum, item) => sum + item.finalTick, 0);
  const canonicalTotalEvents = cases.reduce((sum, item) => (
    sum + Object.values(item.requiredEventTypeCounts).reduce((eventSum, count) => eventSum + count, 0)
  ), 0);
  const executedTotalTicks = canonicalTotalTicks * 2;
  const boundaryAt = (item: ReturnType<typeof caseEvidence>, waveIndex: number, offset: number) => (
    item.lifecycleBoundaries.find((boundary) => (
      boundary.waveIndex === waveIndex && boundary.lifecycleOffset === offset
    ))!
  );
  return {
    canonicalTotalTicks,
    executedTotalTicks,
    canonicalTotalEvents,
    executedTotalEvents: canonicalTotalEvents * 2,
    uniqueCaseIdentityCount: new Set(cases.map(({ caseIdentity }) => caseIdentity)).size,
    uniqueSeedCount: new Set(cases.map(({ seed }) => seed)).size,
    uniqueInputSequenceHashes: new Set(cases.map(({ inputFrameSequenceHash }) => inputFrameSequenceHash)).size,
    uniqueEventSequenceHashes: new Set(cases.map(({ authorityEventSequenceHash }) => authorityEventSequenceHash)).size,
    uniqueSnapshotSequenceHashes: new Set(cases.map(({ worldSnapshotSequenceHash }) => worldSnapshotSequenceHash)).size,
    uniqueReplayHashes: new Set(cases.map(({ replayV5Hash }) => replayV5Hash)).size,
    uniqueFinalHashes: new Set(cases.map(({ finalHash }) => finalHash)).size,
    eventTypeCounts: Object.fromEntries(ARENA_PA7_FORMAL_REQUIRED_EVENT_TYPES.map((eventType) => [
      eventType,
      cases.reduce((sum, item) => sum + item.requiredEventTypeCounts[eventType]!, 0),
    ])),
    equipmentDespawnReasonCounts: Object.fromEntries(
      ARENA_PA7_FORMAL_EQUIPMENT_DESPAWN_REASONS.map((reason) => [
        reason,
        cases.reduce((sum, item) => sum + item.equipmentDespawnReasonCounts[reason]!, 0),
      ]),
    ),
    lifecycleCoverage: {
      firstWavePickableAt599CaseCount: cases.filter((item) => (
        boundaryAt(item, 0, 599).worldEquipmentInstanceIds.length > 0
      )).length,
      firstWavePendingAt600CaseCount: cases.filter((item) => (
        boundaryAt(item, 0, 600).pendingExpiryEquipmentInstanceIds.length > 0
      )).length,
      firstWaveReadyWithoutPendingAt600CaseCount: cases.filter((item) => (
        boundaryAt(item, 0, 600).pendingExpiryEquipmentInstanceIds.length === 0
      )).length,
      firstWaveHeldAt599CaseCount: cases.filter((item) => (
        boundaryAt(item, 0, 599).heldEquipmentInstanceIds.length > 0
      )).length,
      firstWaveRetiredBeforeExpiryCaseCount: cases.filter((item) => (
        boundaryAt(item, 0, 599).retiredEquipmentInstanceIds.length > 0
      )).length,
      postExpiryNoRepeatCaseCount: cases.filter((item) => (
        !boundaryAt(item, 0, 601).authorityEventTypes.includes('EquipmentExpired')
      )).length,
      secondWaveSpawnCaseCount: cases.filter((item) => (
        boundaryAt(item, 1, 1).worldEquipmentInstanceIds.length === 3
      )).length,
    },
    resourcePeaks: resourcePeaks(),
    cpu: {
      totalMicros: executedTotalTicks / 10,
      microsPerTick: 0.1,
      p50MicrosPerTick: 0.08,
      p95MicrosPerTick: 0.2,
      p99MicrosPerTick: 0.24,
      wallDurationMillis: 12_345,
    },
    heap: {
      baselineBytes: 1_000,
      peakBytes: 1_500,
      endingBytes: 1_200,
      deltaBytes: 200,
    },
  };
}

let memoPayload: ReturnType<typeof buildPayload> | null = null;

function buildPayload() {
  const cases = Array.from({ length: ARENA_PA7_FORMAL_CASE_COUNT }, (_, index) => caseEvidence(index));
  const withoutSemantic = {
    schemaVersion: ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION,
    contractId: ARENA_PA7_FORMAL_CONTRACT_ID,
    runToken: 'pa7-formal-run-token',
    request: ARENA_PA7_FORMAL_REQUEST_V1,
    workloadIdentity: {
      productionVariantId: 'C+B+D',
      caseGeneratorRevision: 'formal-generator-v1',
      participantIds: ['player-1', 'player-2'],
      profileIds: ['easy', 'hard', 'normal'],
      inputPlanIds: ['center-contest', 'jump-cycle', 'left-contest', 'neutral', 'right-contest', 'zigzag'],
      pauseAtTicks: [1_199, 1_200, 1_201, 1_799, 1_800, 1_801, 2_399, 2_400, 2_401],
      loaderAttestationHash: 'a'.repeat(64),
    },
    scheduleDefinitionHash: 'bbbbbbbb',
    manifestIdentity: {
      schemaVersion: 1,
      manifestId: 'arena-formal-manifest-v1',
      manifestHash: 'cccccccc',
      definitionHash: 'dddddddd',
      configHash: 'eeeeeeee',
      contentSelectionHash: 'ffffffff',
      compositionContractHash: '11111111',
    },
    progressFinal: {
      runToken: 'pa7-formal-run-token',
      sequence: 900,
      completedCases: 300,
      currentCaseIndex: null,
      currentCaseId: null,
      currentPass: null,
      currentTick: null,
      lastCommittedCaseEvidenceHash: cases.at(-1)!.caseEvidenceHash,
    },
    caseEvidence: cases,
    aggregate: aggregate(cases),
    cleanup: caseCleanup(600),
  };
  return {
    ...withoutSemantic,
    semanticHash: createArenaPa7FormalRunSemanticHashV1(withoutSemantic),
  };
}

function validPayload() {
  memoPayload ??= buildPayload();
  return memoPayload;
}

function passedEvidence() {
  const payload = validPayload();
  const generatedAt = '2026-08-03T00:00:00.000Z';
  const withoutHash = {
    schemaVersion: ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION,
    contractId: ARENA_PA7_FORMAL_CONTRACT_ID,
    sourceIdentity: {
      headCommit: 'a'.repeat(40),
      sourceDirty: false,
      repositoryFingerprintBefore: 'b'.repeat(64),
      repositoryFingerprintAfter: 'b'.repeat(64),
      packageLockHash: 'c'.repeat(64),
      productionModuleHashes: [
        { relativePath: 'packages/arena-match/src/a.ts', sha256: 'd'.repeat(64) },
        { relativePath: 'scripts/arena-formal-survival-bot-pressure.ts', sha256: 'e'.repeat(64) },
      ],
    },
    buildIdentity: {
      nodeVersion: 'v22.0.0',
      packageManagerVersion: 'npm-10',
      platform: 'darwin',
      architecture: 'arm64',
      buildId: 'arena-formal-build',
      buildHash: 'f'.repeat(64),
      productionVariantId: 'C+B+D',
      loaderAttestationHash: 'a'.repeat(64),
    },
    environmentIdentity: {
      cpuModel: 'test-cpu',
      logicalCpuCount: 8,
      totalMemoryBytes: 16_000_000_000,
      isolationEvidenceId: 'isolation-1',
      isolationEvidenceHash: '2'.repeat(64),
    },
    request: ARENA_PA7_FORMAL_REQUEST_V1,
    progress: payload.progressFinal,
    payload,
    gates: ARENA_PA7_FORMAL_GATE_IDS.map((id, index) => ({
      id,
      passed: true,
      evidenceHash: sha(20_000 + index),
      failureReason: null,
    })),
    cleanup: {
      childProcessesStarted: 1,
      childProcessesExited: 1,
      termSignalsSent: 0,
      killSignalsSent: 0,
      temporaryPathsCreated: 2,
      temporaryPathsRemoved: 2,
      pendingCleanupCount: 0,
      cleanupErrorCount: 0,
    },
    status: 'formal-passed',
    failure: null,
    semanticHash: payload.semanticHash,
    generatedAt,
  };
  return { ...withoutHash, evidenceHash: createArenaPa7FormalEvidenceHashV1(withoutHash) };
}

function rehashBoundary<T extends Record<string, unknown>>(value: T) {
  const { boundaryHash: _ignored, ...withoutHash } = value;
  return { ...withoutHash, boundaryHash: createArenaPa7FormalLifecycleBoundaryHashV1(withoutHash) };
}

function rehashCase<T extends Record<string, unknown>>(value: T) {
  const { caseEvidenceHash: _ignored, ...withoutHash } = value;
  return { ...withoutHash, caseEvidenceHash: createArenaPa7FormalCaseEvidenceHashV1(withoutHash) };
}

function caseEvidenceFromSummary(
  summary: ReturnType<typeof createArenaPa7FormalDoubleRunSummaryV1>,
) {
  return rehashCase({
    ...caseEvidence(summary.caseIndex),
    ...summary,
    doubleRunCount: 2,
  });
}

function rehashEvidence<T extends Record<string, unknown>>(value: T) {
  const { evidenceHash: _ignored, ...withoutHash } = value;
  return { ...withoutHash, evidenceHash: createArenaPa7FormalEvidenceHashV1(withoutHash) };
}

test('PA7-0 accepts only the frozen 300/120 formal payload and exact evidence', () => {
  assert.equal(ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK, 250);
  assert.equal(ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES, 32 * 1_024 * 1_024);
  assert.equal(ARENA_PA7_FORMAL_WORKER_FLAG, '--pa7-worker');
  assert.equal(ARENA_PA7_FORMAL_LOADER_ATTESTATION_HASH_FLAG, '--loader-attestation-hash');
  assert.equal(ARENA_PA7_FORMAL_RUN_TOKEN_ENV, 'ARENA_PA7_RUN_TOKEN');
  assert.equal(ARENA_PA7_FORMAL_PROGRESS_PATH_ENV, 'ARENA_PA7_PROGRESS_PATH');
  assert.equal(
    ARENA_PA7_FORMAL_WORKER_SCRIPT_RELATIVE_PATH,
    'scripts/arena-formal-survival-bot-pressure.ts',
  );
  assert.equal(ARENA_PA7_FORMAL_NODE_IMPORT_SPECIFIER, 'tsx');
  const payload = validateArenaPa7FormalRunPayloadV1(validPayload());
  const evidence = validateArenaPa7FormalEvidenceV1(passedEvidence());
  assert.equal(payload.caseEvidence.length, 300);
  assert.equal(new Set(payload.caseEvidence.map(({ seed }) => seed)).size, 120);
  assert.equal(payload.progressFinal.completedCases, 300);
  assert.equal(evidence.status, 'formal-passed');
  assert.ok(Object.isFrozen(evidence));
  assert.ok(Object.isFrozen(evidence.payload));
  assert.ok(Object.isFrozen(evidence.payload!.caseEvidence[0]!.lifecycleBoundaries));

  const laterTimestamp = rehashEvidence({ ...passedEvidence(), generatedAt: '2026-08-03T01:00:00.000Z' });
  assert.equal(laterTimestamp.evidenceHash, passedEvidence().evidenceHash);

  const { semanticHash: _semanticHash, ...semanticInput } = validPayload();
  const changedMeasurements = {
    ...semanticInput,
    aggregate: {
      ...semanticInput.aggregate,
      cpu: {
        totalMicros: 999_999,
        microsPerTick: 0.666666,
        p50MicrosPerTick: 10,
        p95MicrosPerTick: 20,
        p99MicrosPerTick: 30,
        wallDurationMillis: 777_777,
      },
      heap: { baselineBytes: 9, peakBytes: 99, endingBytes: 19, deltaBytes: 10 },
    },
  };
  assert.equal(
    createArenaPa7FormalRunSemanticHashV1(changedMeasurements),
    validPayload().semanticHash,
    'semanticHash 必须排除全部 CPU/heap/wall 测量值。',
  );

  for (const [field, value, expected] of [
    ['participantIds', ['player-1'], /participantIds formal set/],
    ['profileIds', ['easy', 'normal'], /profileIds formal set/],
    ['inputPlanIds', ['neutral'], /inputPlanIds formal set/],
    ['pauseAtTicks', [1_199, 1_200], /pauseAtTicks formal set/],
  ] as const) {
    const candidate = structuredClone(validPayload());
    candidate.workloadIdentity = { ...candidate.workloadIdentity, [field]: value };
    assert.throws(
      () => validateArenaPa7FormalRunPayloadV1(candidate),
      expected,
      `workload ${field} 不得用自洽子集替代正式集合。`,
    );
  }
});

test('PA7-0 rejects extra, missing and future-schema fields at every published layer', () => {
  const validCase = caseEvidence(0);
  assert.throws(() => validateArenaPa7FormalCaseEvidenceV1({ ...validCase, future: true }), /字段数量|未知字段/);
  const { caseId: _caseId, ...missingCase } = validCase;
  assert.throws(() => validateArenaPa7FormalCaseEvidenceV1(missingCase), /字段数量|缺少字段/);
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({ ...validCase, schemaVersion: 2 })),
    /schemaVersion/,
  );
  assert.throws(() => validateArenaPa7FormalRunPayloadV1({ ...validPayload(), extra: null }), /字段数量|未知字段/);
  const { payload: _payload, ...missingEvidence } = passedEvidence();
  assert.throws(() => validateArenaPa7FormalEvidenceV1(missingEvidence), /字段数量|缺少字段/);
  assert.throws(
    () => validateArenaPa7FormalEvidenceV1(rehashEvidence({ ...passedEvidence(), schemaVersion: 2 })),
    /schema|contract/,
  );
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1({ ...validCase, authorityHash: '12345678' }),
    /字段数量|未知字段/,
  );
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(
      { ...caseRun(), stateHashes: [{ tick: 0, hash: '12345678' }] },
      caseRun(),
    ),
    /字段数量|未知字段/,
  );
});

test('PA7-0 rejects Proxy, accessor, Symbol, sparse and cyclic data without executing getters', () => {
  let gets = 0;
  const proxied = new Proxy(caseEvidence(0), {
    get() {
      gets += 1;
      throw new Error('get trap must not run');
    },
  });
  assert.throws(() => validateArenaPa7FormalCaseEvidenceV1(proxied), /Proxy/);
  assert.equal(gets, 0);

  let getterCalls = 0;
  const accessor = { ...caseEvidence(0) };
  Object.defineProperty(accessor, 'caseId', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 'forged';
    },
  });
  assert.throws(() => validateArenaPa7FormalCaseEvidenceV1(accessor), /数据字段/);
  assert.equal(getterCalls, 0);

  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1({ ...caseEvidence(0), [Symbol('extra')]: true }),
    /Symbol/,
  );
  assert.throws(() => cloneArenaPa7FormalStrictDataV1(new Array(2)), /sparse/);
  assert.throws(() => cloneArenaPa7FormalStrictDataV1(Promise.resolve(null)), /异步值/);
  let thenCalls = 0;
  assert.throws(() => cloneArenaPa7FormalStrictDataV1({
    then() {
      thenCalls += 1;
    },
  }), /JSON data/);
  assert.equal(thenCalls, 0);
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  assert.throws(() => cloneArenaPa7FormalStrictDataV1(cycle), /循环引用/);
});

test('PA7-0 rejects non-finite, unsafe and tampered hash values', () => {
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({ ...caseEvidence(0), caseIndex: Number.NaN })),
    /安全整数|有限数/,
  );
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...caseEvidence(0),
      fullAuditCount: Number.MAX_SAFE_INTEGER + 1,
    })),
    /安全整数/,
  );
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1({ ...caseEvidence(0), finalHash: 'tampered' }),
    /8 位|规范数据/,
  );
  assert.throws(
    () => validateArenaPa7FormalRunPayloadV1({
      ...validPayload(),
      aggregate: {
        ...validPayload().aggregate,
        cpu: { ...validPayload().aggregate.cpu, p95MicrosPerTick: Number.POSITIVE_INFINITY },
      },
    }),
    /有限数/,
  );
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...caseEvidence(0),
      replayV5Hash: 'a',
    })),
    /64 位/,
  );
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...caseEvidence(0),
      caseIdentity: `${FORMAL_SEED_BASE}|easy|neutral|player-1|player-2|1200`,
    })),
    /caseIdentity.*formal case manifest/,
  );
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...caseEvidence(0),
      requiredEventTypeCounts: { ...caseEvidence(0).requiredEventTypeCounts, EquipmentSpawned: 7 },
    })),
    /双波各三次 spawn/,
  );
  assert.throws(
    () => validateArenaPa7FormalEvidenceV1(rehashEvidence({
      ...passedEvidence(),
      sourceIdentity: { ...passedEvidence().sourceIdentity, packageLockHash: 'a' },
    })),
    /64 位/,
  );
  assert.throws(
    () => validateArenaPa7FormalEvidenceV1({ ...passedEvidence(), evidenceHash: 'a' }),
    /64 位/,
  );
  assert.throws(
    () => validateArenaPa7FormalEvidenceV1(rehashEvidence({
      ...passedEvidence(),
      sourceIdentity: {
        ...passedEvidence().sourceIdentity,
        productionModuleHashes: [
          { relativePath: '../escape.ts', sha256: 'd'.repeat(64) },
          ...passedEvidence().sourceIdentity.productionModuleHashes.slice(1),
        ],
      },
    })),
    /仓库内相对路径/,
  );
});

test('PA7-0 rejects duplicate case, gate and equipment-instance identities', () => {
  const cases = [...validPayload().caseEvidence];
  cases[1] = cases[0]!;
  assert.throws(
    () => validateArenaPa7FormalRunPayloadV1({ ...validPayload(), caseEvidence: cases }),
    /caseIndex|重复 case|0\.\.299/,
  );

  const gates = passedEvidence().gates.map((gate) => ({ ...gate }));
  gates[1]!.id = gates[0]!.id;
  assert.throws(
    () => validateArenaPa7FormalEvidenceV1(rehashEvidence({ ...passedEvidence(), gates })),
    /ID\/顺序/,
  );

  const candidate = caseEvidence(0);
  const boundaries = candidate.lifecycleBoundaries.map((item) => ({ ...item }));
  boundaries[1] = rehashBoundary({
    ...boundaries[1]!,
    pendingExpiryEquipmentInstanceIds: ['equipment-0-0-0', 'equipment-0-0-0'],
  });
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({ ...candidate, lifecycleBoundaries: boundaries })),
    /重复项/,
  );
});

const POS = Object.freeze({ x: 0, y: 0, z: 0 });

function traceParticipant(id: string, heldEquipment: ReturnType<typeof traceEquipment> | null = null) {
  return {
    id,
    characterDefinitionId: 'character-basic',
    status: 'active',
    lives: 2,
    eliminations: id === 'player-1' ? 1 : 0,
    deaths: id === 'player-2' ? 1 : 0,
    hitstunTicks: 0,
    invulnerableTicks: 0,
    respawnTicks: 0,
    lastHitBy: null,
    lastHitTick: -1,
    action: { definitionId: null, phase: 'idle', ticksRemaining: 0 },
    actionRule: { schemaVersion: 1, mode: 'fixture' },
    movement: {
      schemaVersion: 1,
      participantId: id,
      characterDefinitionId: 'character-basic',
      mode: 'grounded',
      coyoteTicksRemaining: 0,
      jumpBufferTicksRemaining: 0,
      airJumpsUsed: 0,
      crouchChargeTicks: 0,
      crouchActionId: null,
      downSmashActionId: null,
      revision: 0,
      grounded: true,
    },
    equipment: heldEquipment === null ? null : {
      instanceId: heldEquipment.instanceId,
      definitionId: heldEquipment.definitionId,
      cooldownRemainingTicks: heldEquipment.cooldownRemainingTicks,
    },
    position: POS,
    velocity: POS,
    facing: { x: 1, z: 0 },
    grounded: true,
    supportSurfaceId: 'surface-ground',
  };
}

function traceEquipment(
  waveIndex: 0 | 1,
  slot: number,
  locationState: 'spawned' | 'held',
  ownerId = 'player-1',
) {
  const spawnTick = waveIndex === 0 ? 1_200 : 2_400;
  return {
    schemaVersion: 1,
    instanceId: `arena-v2.survival-supply.v1:wave-${waveIndex}:slot-${slot}:equipment`,
    definitionId: `equipment-${slot}`,
    spawnId: `spawn-${spawnTick}-${slot}`,
    locationState,
    ownerId: locationState === 'held' ? ownerId : null,
    position: locationState === 'held' ? null : { x: slot - 1, y: 1, z: 0 },
    lastSafePosition: { x: slot - 1, y: 1, z: 0 },
    cooldownRemainingTicks: 0,
    revision: locationState === 'held' ? 1 : 0,
  };
}

function traceSupplyItem(waveIndex: 0 | 1, slot: number, tick: number) {
  const spawnTick = waveIndex === 0 ? 1_200 : 2_400;
  const expireTick = spawnTick + 600;
  return {
    schemaVersion: 2,
    supplyDefinitionId: 'arena-v2.survival-supply.v1',
    supplyId: `arena-v2.survival-supply.v1:wave-${waveIndex}:slot-${slot}`,
    slotId: `slot-${slot}`,
    equipmentInstanceId: `arena-v2.survival-supply.v1:wave-${waveIndex}:slot-${slot}:equipment`,
    equipmentDefinitionId: `equipment-${slot}`,
    equipmentSpawnId: `spawn-${spawnTick}-${slot}`,
    spawnPosition: { x: slot - 1, y: 1, z: 0 },
    spawnTick,
    expireTick,
    remainingTicks: expireTick - tick,
    position: { x: slot - 1, y: 1, z: 0 },
  };
}

function traceWorld(tick: number, result: Record<string, unknown>) {
  const ended = tick === 2_401;
  const eventSequence = tick === 0 ? 0
    : tick >= 2_401 ? 10
      : tick >= 1_801 ? 6
        : tick >= 1_201 ? 4 : 1;
  const firstWaveHeld = tick >= 1_201 ? traceEquipment(0, 2, 'held') : null;
  const firstWaveWorld = tick >= 1_201 && tick < 1_800
    ? [traceEquipment(0, 0, 'spawned'), traceEquipment(0, 1, 'spawned')]
    : [];
  const secondWaveWorld = tick >= 2_401
    ? [0, 1, 2].map((slot) => traceEquipment(1, slot, 'spawned'))
    : [];
  const activeSupplies = tick >= 1_201 && tick < 1_800
    ? [traceSupplyItem(0, 0, tick), traceSupplyItem(0, 1, tick)]
    : tick >= 2_401
      ? [0, 1, 2].map((slot) => traceSupplyItem(1, slot, tick))
      : [];
  const pending = tick === 1_800
    ? [0, 1].map((slot) => `arena-v2.survival-supply.v1:wave-0:slot-${slot}:equipment`)
    : [];
  return {
    authoritySchemaVersion: 1,
    physicsBackendVersion: 'physics-v1',
    configHash: '12345678',
    ruleContentHash: 'abcdef01',
    matchSeed: FORMAL_SEED_BASE,
    tick,
    activeTick: tick,
    phase: ended ? 'ended' : 'running',
    remainingTicks: ended ? 0 : 2_401 - tick,
    eventSequence,
    participants: [traceParticipant('player-1', firstWaveHeld), traceParticipant('player-2')],
    equipment: [...firstWaveWorld, ...(firstWaveHeld === null ? [] : [firstWaveHeld]), ...secondWaveWorld],
    activeSupplyProjection: {
      schemaVersion: 2,
      snapshotTick: tick,
      snapshotEventSequence: eventSequence,
      resyncReadiness: tick === 1_800 ? 'not-ready-pre-expiry' : 'ready',
      pendingAuthorityTick: tick === 1_800 ? 1_800 : null,
      pendingExpiryEquipmentInstanceIds: pending,
      supplies: activeSupplies,
    },
    map: {
      schemaVersion: 1,
      definitionId: 'arena-map-training',
      nextActiveTick: 0,
      revision: 0,
      surfaces: [{ id: 'surface-ground', enabled: true, revision: 0 }],
      occurrences: [{
        occurrenceId: 'occurrence-0',
        eventId: 'none',
        kind: 'none',
        warningTick: 0,
        startTick: 0,
        endTick: null,
        phase: ended ? 'ended' : 'running',
        publicPayload: {},
        revision: 0,
      }],
    },
    result: ended ? result : null,
  };
}

function neutralInput(tick: number, participantId: string) {
  return {
    tick,
    participantId,
    moveX: 0,
    moveZ: 0,
    primaryPressed: false,
    primaryHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  };
}

function spawnedEvent(sequence: number, tick: 1_200 | 2_400, slot: number) {
  return {
    id: `event-${sequence}`,
    type: 'EquipmentSpawned',
    tick,
    sequence,
    payload: {
      schemaVersion: 1,
      supplyDefinitionId: 'arena-v2.survival-supply.v1',
      supplyId: `arena-v2.survival-supply.v1:wave-${tick === 1_200 ? 0 : 1}:slot-${slot}`,
      equipmentInstanceId: `arena-v2.survival-supply.v1:wave-${tick === 1_200 ? 0 : 1}:slot-${slot}:equipment`,
      spawnTick: tick,
      expireTick: tick + 600,
      tick,
      equipmentDefinitionId: `equipment-${slot}`,
      spawnId: `spawn-${tick}-${slot}`,
      position: { x: slot - 1, y: 1, z: 0 },
    },
  };
}

function expiredEvent(sequence: number, slot: number) {
  const equipmentInstanceId = `arena-v2.survival-supply.v1:wave-0:slot-${slot}:equipment`;
  return {
    id: `event-${sequence}`,
    type: 'EquipmentExpired',
    tick: 1_800,
    sequence,
    payload: {
      schemaVersion: 1,
      supplyDefinitionId: 'arena-v2.survival-supply.v1',
      supplyId: `arena-v2.survival-supply.v1:wave-0:slot-${slot}`,
      equipmentInstanceId,
      spawnTick: 1_200,
      expireTick: 1_800,
      tick: 1_800,
      expiredEquipmentInstanceId: equipmentInstanceId,
      reason: 'lifetime-expired',
    },
  };
}

function recycledEvent(sequence: number) {
  return {
    id: `event-${sequence}`,
    type: 'EquipmentRecycled',
    tick: 1_700,
    sequence,
    payload: {
      schemaVersion: 1,
      supplyDefinitionId: 'replacement-supply',
      supplyId: 'replacement-supply:wave-0:slot-0',
      equipmentInstanceId: 'replacement-supply:wave-0:slot-0:equipment',
      spawnTick: 1_600,
      expireTick: 2_200,
      tick: 1_700,
      participantId: 'player-1',
      recycledEquipmentInstanceId: 'arena-v2.survival-supply.v1:wave-0:slot-0:equipment',
      replacementEquipmentInstanceId: 'replacement-supply:wave-0:slot-0:equipment',
      reason: 'replaced',
    },
  };
}

function pickedUpEvent(sequence: number, tick: 1_798 | 1_799) {
  return {
    id: `event-${sequence}`,
    type: 'EquipmentPickedUp',
    tick,
    sequence,
    participantId: 'player-2',
    equipmentInstanceId: 'arena-v2.survival-supply.v1:wave-0:slot-1:equipment',
  };
}

function despawnedHeldEvent(sequence: number) {
  return {
    id: `event-${sequence}`,
    type: 'EquipmentDespawned',
    tick: 1_800,
    sequence,
    equipmentInstanceId: 'arena-v2.survival-supply.v1:wave-0:slot-1:equipment',
    reason: 'supply-lifecycle-expired-held-drop',
  };
}

function traceReadyWithoutPendingWorld(
  tick: number,
  result: Record<string, unknown>,
  authorityEvents: readonly Record<string, unknown>[],
  firstWaveWorldAt599Count: 0 | 1,
) {
  const base = traceWorld(tick, result);
  const pickupTick = firstWaveWorldAt599Count === 0 ? 1_798 : 1_799;
  const slot0World = tick >= 1_201 && tick <= 1_700 ? traceEquipment(0, 0, 'spawned') : null;
  const slot1World = tick >= 1_201 && tick <= pickupTick ? traceEquipment(0, 1, 'spawned') : null;
  const slot1Held = tick > pickupTick && tick <= 1_800
    ? traceEquipment(0, 1, 'held', 'player-2') : null;
  const slot2Held = tick >= 1_201 ? traceEquipment(0, 2, 'held', 'player-1') : null;
  const secondWaveWorld = tick >= 2_401
    ? [0, 1, 2].map((slot) => traceEquipment(1, slot, 'spawned'))
    : [];
  const firstWaveWorldSlots = [slot0World, slot1World]
    .flatMap((equipment, slot) => equipment === null ? [] : [slot]);
  const activeSupplies = [
    ...firstWaveWorldSlots.map((slot) => traceSupplyItem(0, slot, tick)),
    ...(tick >= 2_401 ? [0, 1, 2].map((slot) => traceSupplyItem(1, slot, tick)) : []),
  ];
  const eventSequence = authorityEvents.filter((event) => (event.tick as number) < tick).length;
  return {
    ...base,
    eventSequence,
    participants: [
      traceParticipant('player-1', slot2Held),
      traceParticipant('player-2', slot1Held),
    ],
    equipment: [slot0World, slot1World, slot1Held, slot2Held, ...secondWaveWorld]
      .filter((equipment) => equipment !== null),
    activeSupplyProjection: {
      schemaVersion: 2,
      snapshotTick: tick,
      snapshotEventSequence: eventSequence,
      resyncReadiness: 'ready',
      pendingAuthorityTick: null,
      pendingExpiryEquipmentInstanceIds: [],
      supplies: activeSupplies,
    },
  };
}

function traceBoundary(
  worldSnapshots: readonly ReturnType<typeof traceWorld>[],
  authorityEvents: readonly Record<string, unknown>[],
  waveIndex: 0 | 1,
  lifecycleOffset: 0 | 1 | 599 | 600 | 601,
) {
  const spawnTick = waveIndex === 0 ? 1_200 : 2_400;
  const snapshotTick = spawnTick + lifecycleOffset;
  const snapshot = worldSnapshots[snapshotTick]!;
  const waveIds = [0, 1, 2].map((slot) => (
    `arena-v2.survival-supply.v1:wave-${waveIndex}:slot-${slot}:equipment`
  ));
  const supplyIds = [0, 1, 2].map((slot) => (
    `arena-v2.survival-supply.v1:wave-${waveIndex}:slot-${slot}`
  ));
  const projection = snapshot.activeSupplyProjection!;
  const worldIds = snapshot.equipment
    .filter(({ instanceId, locationState }) => (
      waveIds.includes(instanceId) && locationState === 'spawned'
    ))
    .map(({ instanceId }) => instanceId)
    .sort();
  const heldIds = snapshot.equipment
    .filter(({ instanceId, locationState }) => waveIds.includes(instanceId) && locationState === 'held')
    .map(({ instanceId }) => instanceId)
    .sort();
  const active = projection.supplies
    .filter(({ equipmentInstanceId }) => waveIds.includes(equipmentInstanceId))
    .sort((left, right) => left.equipmentInstanceId.localeCompare(right.equipmentInstanceId));
  const retiredEquipmentInstanceIds = [...new Set(authorityEvents.flatMap((event) => {
    if ((event.tick as number) >= snapshotTick) return [];
    if (event.type === 'EquipmentRecycled') {
      return [(event.payload as Record<string, unknown>).recycledEquipmentInstanceId as string];
    }
    if (event.type === 'EquipmentExpired') {
      return [(event.payload as Record<string, unknown>).expiredEquipmentInstanceId as string];
    }
    if (event.type === 'EquipmentDespawned') return [event.equipmentInstanceId as string];
    return [];
  }).filter((id) => waveIds.includes(id)))].sort();
  const boundaryEventTick = waveIndex === 0 && (lifecycleOffset === 600 || lifecycleOffset === 601)
    ? snapshotTick
    : Math.max(0, snapshotTick - 1);
  const authorityEventTypes = [...new Set(authorityEvents
    .filter(({ tick }) => tick === boundaryEventTick)
    .map(({ type }) => type as string))];
  const value = {
    supplyIds,
    waveEquipmentInstanceIds: waveIds,
    waveIndex,
    spawnTick,
    lifecycleOffset,
    authorityTick: snapshotTick,
    snapshotTick,
    snapshotEventSequence: snapshot.eventSequence,
    resyncReadiness: projection.resyncReadiness,
    pendingAuthorityTick: projection.pendingAuthorityTick,
    pendingExpiryEquipmentInstanceIds: projection.pendingExpiryEquipmentInstanceIds,
    worldEquipmentInstanceIds: worldIds,
    heldEquipmentInstanceIds: heldIds,
    retiredEquipmentInstanceIds,
    activeSupplyEquipmentInstanceIds: active.map(({ equipmentInstanceId }) => equipmentInstanceId),
    remainingTicks: active.map(({ remainingTicks }) => remainingTicks),
    authorityEventTypes,
  };
  return withHash(value, 'boundaryHash', createArenaPa7FormalLifecycleBoundaryHashV1);
}

let memoCaseRun: ReturnType<typeof buildCaseRun> | null = null;

function buildCaseRun() {
  const finalTick = 2_401;
  const endedAtTick = finalTick - 1;
  const result = { winnerId: 'player-1', reason: 'elimination', isDraw: false, endedAtTick };
  const inputFrames = Array.from({ length: finalTick }, (_, tick) => [
    neutralInput(tick, 'player-1'),
    neutralInput(tick, 'player-2'),
  ]).flat();
  const authorityEvents = [
    {
      id: 'event-0',
      type: 'MatchStarted',
      tick: 0,
      sequence: 0,
      participantIds: ['player-1', 'player-2'],
    },
    spawnedEvent(1, 1_200, 0),
    spawnedEvent(2, 1_200, 1),
    spawnedEvent(3, 1_200, 2),
    expiredEvent(4, 0),
    expiredEvent(5, 1),
    spawnedEvent(6, 2_400, 0),
    spawnedEvent(7, 2_400, 1),
    spawnedEvent(8, 2_400, 2),
    {
      id: 'event-9',
      type: 'MatchEnded',
      tick: endedAtTick,
      sequence: 9,
      winnerId: result.winnerId,
      reason: result.reason,
      isDraw: result.isDraw,
      endedAtTick: result.endedAtTick,
    },
  ];
  const worldSnapshots = Array.from({ length: finalTick + 1 }, (_, tick) => traceWorld(tick, result));
  const checkpointTicks = [
    ...Array.from({ length: Math.floor(finalTick / 60) + 1 }, (_, index) => index * 60),
    finalTick,
  ].filter((tick, index, values) => index === 0 || tick !== values[index - 1]);
  const checkpoints = checkpointTicks.map((tick) => ({ tick, hash: hex(100_000 + tick) }));
  const finalHash = checkpoints.at(-1)!.hash;
  const schedule = createArenaReadStepScheduleV2();
  const fullAuditTicks: number[] = [];
  const initial = schedule.initial({ worldSnapshot: worldSnapshots[0] } as never);
  if (initial !== null) fullAuditTicks.push(initial.tick);
  for (let tick = 1; tick <= finalTick; tick += 1) {
    const events = authorityEvents.filter((event) => event.tick === tick - 1);
    const decision = schedule.afterStep(
      { worldSnapshot: worldSnapshots[tick - 1] } as never,
      { worldSnapshot: worldSnapshots[tick] } as never,
      events as never,
    );
    if (decision !== null) fullAuditTicks.push(decision.tick);
  }
  const replayV5 = {
    replaySchemaVersion: 5,
    schemaVersion: 1,
    physicsBackendVersion: 'physics-v1',
    configHash: '12345678',
    ruleContentHash: 'abcdef01',
    matchSeed: FORMAL_SEED_BASE,
    config: { participantIds: ['player-1', 'player-2'] },
    inputFrames,
    checkpoints,
    events: authorityEvents,
    finalHash,
    result,
  };
  return {
    schemaVersion: 1,
    caseIndex: 0,
    ...formalCaseDefinition(0),
    finalTick,
    inputFrames,
    authorityEvents,
    worldSnapshots,
    fullAuditTicks,
    fullAuditCount: fullAuditTicks.length,
    checkpoints,
    replayV5,
    result,
    finalHash,
    lifecycleBoundaries: [
      traceBoundary(worldSnapshots, authorityEvents, 0, 599),
      traceBoundary(worldSnapshots, authorityEvents, 0, 600),
      traceBoundary(worldSnapshots, authorityEvents, 0, 601),
      traceBoundary(worldSnapshots, authorityEvents, 1, 0),
      traceBoundary(worldSnapshots, authorityEvents, 1, 1),
    ],
    resourcePeaks: resourcePeaks(),
    cleanup: caseCleanup(),
  };
}

function buildReadyWithoutPendingCaseRun(firstWaveWorldAt599Count: 0 | 1) {
  const base = buildCaseRun();
  const pickupTick = firstWaveWorldAt599Count === 0 ? 1_798 : 1_799;
  const authorityEvents: Array<Record<string, unknown>> = [
    {
      id: 'event-0',
      type: 'MatchStarted',
      tick: 0,
      sequence: 0,
      participantIds: ['player-1', 'player-2'],
    },
    spawnedEvent(1, 1_200, 0),
    spawnedEvent(2, 1_200, 1),
    spawnedEvent(3, 1_200, 2),
    recycledEvent(4),
    pickedUpEvent(5, pickupTick),
    despawnedHeldEvent(6),
    spawnedEvent(7, 2_400, 0),
    spawnedEvent(8, 2_400, 1),
    spawnedEvent(9, 2_400, 2),
    {
      id: 'event-10',
      type: 'MatchEnded',
      tick: base.result.endedAtTick,
      sequence: 10,
      ...base.result,
    },
  ];
  const worldSnapshots = Array.from({ length: base.finalTick + 1 }, (_, tick) => (
    traceReadyWithoutPendingWorld(
      tick,
      base.result,
      authorityEvents,
      firstWaveWorldAt599Count,
    )
  ));
  const schedule = createArenaReadStepScheduleV2();
  const fullAuditTicks: number[] = [];
  const initial = schedule.initial({ worldSnapshot: worldSnapshots[0] } as never);
  if (initial !== null) fullAuditTicks.push(initial.tick);
  for (let tick = 1; tick <= base.finalTick; tick += 1) {
    const stepEvents = authorityEvents.filter((event) => event.tick === tick - 1);
    const decision = schedule.afterStep(
      { worldSnapshot: worldSnapshots[tick - 1] } as never,
      { worldSnapshot: worldSnapshots[tick] } as never,
      stepEvents as never,
    );
    if (decision !== null) fullAuditTicks.push(decision.tick);
  }
  const replayV5 = {
    ...base.replayV5,
    events: authorityEvents,
  };
  return {
    ...base,
    authorityEvents,
    worldSnapshots,
    fullAuditTicks,
    fullAuditCount: fullAuditTicks.length,
    replayV5,
    lifecycleBoundaries: [
      traceBoundary(worldSnapshots, authorityEvents, 0, 599),
      traceBoundary(worldSnapshots, authorityEvents, 0, 600),
      traceBoundary(worldSnapshots, authorityEvents, 0, 601),
      traceBoundary(worldSnapshots, authorityEvents, 1, 0),
      traceBoundary(worldSnapshots, authorityEvents, 1, 1),
    ],
  };
}

function caseRun() {
  memoCaseRun ??= buildCaseRun();
  return structuredClone(memoCaseRun);
}

test('PA7-0 double-run proof rejects one-point tamper and Replay/Snapshot mismatch', () => {
  const first = caseRun();
  const summary = createArenaPa7FormalDoubleRunSummaryV1(first, caseRun());
  assert.match(summary.replayV5Hash, /^[0-9a-f]{64}$/);
  assert.equal(summary.fullAuditCount, first.fullAuditTicks.length);
  assert.equal(Object.keys(first.replayV5).length, 12, '正向必须使用正式 Replay V5 12 字段。');
  assert.equal(first.worldSnapshots.length, first.finalTick + 1, '正向必须逐 tick 提供完整 world。');
  assert.equal(first.authorityEvents[0]!.sequence, 0);
  assert.equal(first.result.endedAtTick, first.finalTick - 1);
  assert.equal(first.worldSnapshots[0]!.eventSequence, 0, 'tick0 snapshot 必须是尚未提交 MatchStarted 的水位。');
  assert.equal(first.worldSnapshots[1]!.eventSequence, 1, 'tick0 MatchStarted 必须在 tick1 snapshot 可见。');
  assert.equal(first.worldSnapshots[1_200]!.eventSequence, 1);
  assert.equal(first.worldSnapshots[1_201]!.eventSequence, 4);
  assert.equal(first.worldSnapshots[2_400]!.eventSequence, 6);
  assert.equal(first.worldSnapshots[2_401]!.eventSequence, 10);
  assert.ok(first.fullAuditTicks.includes(1), 'MatchStarted 必须进入 tick1 afterStep schedule。');

  const matchedEvidence = rehashCase({
    ...caseEvidence(0),
    pauseAtTick: summary.pauseAtTick,
    finalTick: summary.finalTick,
    fullAuditCount: summary.fullAuditCount,
    requiredEventTypeCounts: summary.requiredEventTypeCounts,
    equipmentDespawnReasonCounts: summary.equipmentDespawnReasonCounts,
    inputFrameSequenceHash: summary.inputFrameSequenceHash,
    authorityEventSequenceHash: summary.authorityEventSequenceHash,
    worldSnapshotSequenceHash: summary.worldSnapshotSequenceHash,
    checkpointSequenceHash: summary.checkpointSequenceHash,
    replayV5Hash: summary.replayV5Hash,
    resultHash: summary.resultHash,
    stateHashSequenceHash: summary.stateHashSequenceHash,
    finalHash: summary.finalHash,
    lifecycleBoundaries: summary.lifecycleBoundaries,
    resourcePeaks: summary.resourcePeaks,
    cleanup: summary.cleanup,
  });
  assert.doesNotThrow(() => assertArenaPa7FormalCaseEvidenceMatchesDoubleRunSummaryV1(
    matchedEvidence,
    summary,
  ));
  assert.throws(
    () => assertArenaPa7FormalCaseEvidenceMatchesDoubleRunSummaryV1(matchedEvidence, {
      ...summary,
      inputFrameSequenceHash: '9'.repeat(64),
    }),
    /inputFrameSequenceHash 不一致/,
  );
  const detachedCleanupEvidence = rehashCase({
    ...matchedEvidence,
    cleanup: {
      ...matchedEvidence.cleanup,
      sessionDestroyAttempts: matchedEvidence.cleanup.sessionDestroyAttempts + 1,
    },
  });
  assert.throws(
    () => assertArenaPa7FormalCaseEvidenceMatchesDoubleRunSummaryV1(detachedCleanupEvidence, summary),
    /cleanup 不一致/,
  );

  const secondInputTamper = caseRun();
  secondInputTamper.inputFrames = secondInputTamper.inputFrames.map((frame, index) => (
    index === 0 ? { ...frame, moveX: 1 } : frame
  ));
  secondInputTamper.replayV5 = { ...secondInputTamper.replayV5, inputFrames: secondInputTamper.inputFrames };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(first, secondInputTamper),
    /double run inputFrames/,
  );

  const snapshotMismatch = caseRun();
  snapshotMismatch.worldSnapshots[snapshotMismatch.worldSnapshots.length - 1] = {
    ...snapshotMismatch.worldSnapshots.at(-1)!,
    result: { ...snapshotMismatch.result, winnerId: 'player-2' },
  };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(snapshotMismatch, snapshotMismatch),
    /Replay\/Snapshot result/,
  );

  const wrongInitialWatermark = caseRun();
  Object.assign(wrongInitialWatermark.worldSnapshots[0]!, { eventSequence: 1 });
  Object.assign(wrongInitialWatermark.worldSnapshots[0]!.activeSupplyProjection!, {
    snapshotEventSequence: 1,
  });
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(wrongInitialWatermark, wrongInitialWatermark),
    /eventSequence 与 authority events 不一致/,
  );

  const missingStartedWatermark = caseRun();
  Object.assign(missingStartedWatermark.worldSnapshots[1]!, { eventSequence: 0 });
  Object.assign(missingStartedWatermark.worldSnapshots[1]!.activeSupplyProjection!, {
    snapshotEventSequence: 0,
  });
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(missingStartedWatermark, missingStartedWatermark),
    /eventSequence 与 authority events 不一致/,
  );

  const missingStartedSchedule = caseRun();
  missingStartedSchedule.fullAuditTicks = missingStartedSchedule.fullAuditTicks.filter((tick) => tick !== 1);
  missingStartedSchedule.fullAuditCount = missingStartedSchedule.fullAuditTicks.length;
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(missingStartedSchedule, missingStartedSchedule),
    /fullAuditTicks schedule/,
  );

  const auditCountMismatch = caseRun();
  auditCountMismatch.fullAuditCount += 1;
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(auditCountMismatch, auditCountMismatch),
    /fullAuditCount.*序列长度/,
  );

  const detachedBoundary = caseRun();
  const driftedWave = detachedBoundary.lifecycleBoundaries[0]!.waveEquipmentInstanceIds;
  const driftedWorld = [driftedWave[0]!, driftedWave[2]!];
  const driftedHeld = [driftedWave[1]!];
  detachedBoundary.lifecycleBoundaries = detachedBoundary.lifecycleBoundaries.map((item) => {
    if (item.waveIndex !== 0) return item;
    if (item.lifecycleOffset === 599) return rehashBoundary({
      ...item,
      worldEquipmentInstanceIds: driftedWorld,
      heldEquipmentInstanceIds: driftedHeld,
      activeSupplyEquipmentInstanceIds: driftedWorld,
      remainingTicks: [1, 1],
    });
    if (item.lifecycleOffset === 600) return rehashBoundary({
      ...item,
      pendingExpiryEquipmentInstanceIds: driftedWorld,
      heldEquipmentInstanceIds: driftedHeld,
    });
    return rehashBoundary({
      ...item,
      heldEquipmentInstanceIds: driftedHeld,
      retiredEquipmentInstanceIds: driftedWorld,
    });
  });
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(detachedBoundary, detachedBoundary),
    /Replay\/World 派生值/,
  );

  const detachedResources = caseRun();
  detachedResources.resourcePeaks = {
    ...detachedResources.resourcePeaks,
    runtimeEquipmentCount: { ...detachedResources.resourcePeaks.runtimeEquipmentCount, observed: 3 },
  };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(detachedResources, detachedResources),
    /resourcePeaks\.runtimeEquipmentCount.*派生值/,
  );

  const firstCheckpointMismatch = caseRun();
  firstCheckpointMismatch.checkpoints[0] = { tick: 1, hash: firstCheckpointMismatch.checkpoints[0]!.hash };
  firstCheckpointMismatch.replayV5 = {
    ...firstCheckpointMismatch.replayV5,
    checkpoints: firstCheckpointMismatch.checkpoints,
  };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(firstCheckpointMismatch, firstCheckpointMismatch),
    /tick0|checkpoint/i,
  );

  const middleCheckpointMismatch = caseRun();
  middleCheckpointMismatch.checkpoints[2] = {
    ...middleCheckpointMismatch.checkpoints[2]!,
    tick: middleCheckpointMismatch.checkpoints[1]!.tick,
  };
  middleCheckpointMismatch.replayV5 = {
    ...middleCheckpointMismatch.replayV5,
    checkpoints: middleCheckpointMismatch.checkpoints,
  };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(middleCheckpointMismatch, middleCheckpointMismatch),
    /严格递增|checkpoint/i,
  );

  const middleCheckpointHashDrift = caseRun();
  middleCheckpointHashDrift.checkpoints[2] = {
    ...middleCheckpointHashDrift.checkpoints[2]!,
    hash: '87654321',
  };
  middleCheckpointHashDrift.replayV5 = {
    ...middleCheckpointHashDrift.replayV5,
    checkpoints: middleCheckpointHashDrift.checkpoints,
  };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(first, middleCheckpointHashDrift),
    /double run checkpoints/,
  );

  const unknownEvent = caseRun();
  Object.assign(unknownEvent.authorityEvents[1]!, { type: 'FutureEvent' });
  unknownEvent.replayV5 = { ...unknownEvent.replayV5, events: unknownEvent.authorityEvents };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(unknownEvent, unknownEvent),
    /不在正式 schedule 集合/,
  );

  const duplicateEventId = caseRun();
  Object.assign(duplicateEventId.authorityEvents[1]!, {
    id: duplicateEventId.authorityEvents[0]!.id,
  });
  duplicateEventId.replayV5 = { ...duplicateEventId.replayV5, events: duplicateEventId.authorityEvents };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(duplicateEventId, duplicateEventId),
    /id 不能重复/,
  );

  const replaySeedDrift = caseRun();
  replaySeedDrift.replayV5 = {
    ...replaySeedDrift.replayV5,
    matchSeed: replaySeedDrift.seed + 1,
  };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(replaySeedDrift, replaySeedDrift),
    /seed.*Replay\.matchSeed/,
  );

  const roleOrderDrift = caseRun();
  [roleOrderDrift.playerParticipantId, roleOrderDrift.botParticipantId] = [
    roleOrderDrift.botParticipantId,
    roleOrderDrift.playerParticipantId,
  ];
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(roleOrderDrift, roleOrderDrift),
    /caseIdentity.*role manifest/,
  );

  const duplicateMatchStarted = caseRun();
  Object.assign(duplicateMatchStarted.authorityEvents[1]!, {
    type: 'MatchStarted',
    participantIds: ['player-1', 'player-2'],
  });
  duplicateMatchStarted.replayV5 = {
    ...duplicateMatchStarted.replayV5,
    events: duplicateMatchStarted.authorityEvents,
  };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(duplicateMatchStarted, duplicateMatchStarted),
    /有且仅有.*MatchStarted.*MatchEnded/,
  );

  const wrongMatchEndedTick = caseRun();
  Object.assign(wrongMatchEndedTick.authorityEvents.at(-1)!, { tick: 2_399 });
  wrongMatchEndedTick.replayV5 = {
    ...wrongMatchEndedTick.replayV5,
    events: wrongMatchEndedTick.authorityEvents,
  };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(wrongMatchEndedTick, wrongMatchEndedTick),
    /MatchEnded tick 必须等于 result\.endedAtTick/,
  );

  const wrongMatchEndedResult = caseRun();
  Object.assign(wrongMatchEndedResult.authorityEvents.at(-1)!, { winnerId: 'player-2' });
  wrongMatchEndedResult.replayV5 = {
    ...wrongMatchEndedResult.replayV5,
    events: wrongMatchEndedResult.authorityEvents,
  };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(wrongMatchEndedResult, wrongMatchEndedResult),
    /MatchEnded\.winnerId.*Replay result/,
  );

  const missingSpawn = caseRun();
  Object.assign(missingSpawn.authorityEvents[1]!, { type: 'ActionStarted' });
  missingSpawn.replayV5 = { ...missingSpawn.replayV5, events: missingSpawn.authorityEvents };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(missingSpawn, missingSpawn),
    /EquipmentSpawned 必须精确为 tick1200=3、tick2400=3/,
  );

  const spawnOnWrongTick = caseRun();
  Object.assign(spawnOnWrongTick.authorityEvents[1]!, { tick: 1_199 });
  spawnOnWrongTick.replayV5 = { ...spawnOnWrongTick.replayV5, events: spawnOnWrongTick.authorityEvents };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(spawnOnWrongTick, spawnOnWrongTick),
    /EquipmentSpawned 只允许出现在 tick1200\/2400/,
  );

  const missingExpiryPayload = caseRun();
  const missingExpiryEvents = missingExpiryPayload.authorityEvents as unknown as Array<Record<string, unknown>>;
  const { payload: _missingPayload, ...withoutPayload } = missingExpiryEvents[4]!;
  missingExpiryEvents[4] = withoutPayload;
  missingExpiryPayload.replayV5 = {
    ...missingExpiryPayload.replayV5,
    events: missingExpiryPayload.authorityEvents,
  };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(missingExpiryPayload, missingExpiryPayload),
    /EquipmentExpired.*缺少 payload/,
  );

  const wrongExpiryPayload = caseRun();
  const wrongExpiryEvents = wrongExpiryPayload.authorityEvents as unknown as Array<Record<string, unknown>>;
  const firstExpiryPayload = wrongExpiryEvents[4]!.payload as Record<string, unknown>;
  const secondExpiryPayload = wrongExpiryEvents[5]!.payload as Record<string, unknown>;
  wrongExpiryEvents[4]!.payload = {
    ...firstExpiryPayload,
    expiredEquipmentInstanceId: secondExpiryPayload.expiredEquipmentInstanceId,
  };
  wrongExpiryPayload.replayV5 = {
    ...wrongExpiryPayload.replayV5,
    events: wrongExpiryPayload.authorityEvents,
  };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(wrongExpiryPayload, wrongExpiryPayload),
    /Expired payload|expiredEquipmentInstanceId/,
  );

  const endedNotLast = caseRun();
  const lastSpawn = endedNotLast.authorityEvents[8]!;
  const endedEvent = endedNotLast.authorityEvents[9]!;
  endedNotLast.authorityEvents[8] = { ...endedEvent, id: 'event-8', sequence: 8 };
  endedNotLast.authorityEvents[9] = { ...lastSpawn, id: 'event-9', sequence: 9 };
  endedNotLast.replayV5 = { ...endedNotLast.replayV5, events: endedNotLast.authorityEvents };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(endedNotLast, endedNotLast),
    /MatchEnded 必须是最后一个 authority event/,
  );

  const unknownDespawnReason = caseRun();
  Object.assign(unknownDespawnReason.authorityEvents[1]!, {
    type: 'EquipmentDespawned',
    equipmentInstanceId: 'arena-v2.survival-supply.v1:wave-0:slot-0:equipment',
    reason: 'future-despawn-reason',
  });
  unknownDespawnReason.replayV5 = {
    ...unknownDespawnReason.replayV5,
    events: unknownDespawnReason.authorityEvents,
  };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(unknownDespawnReason, unknownDespawnReason),
    /EquipmentDespawned\.reason 不在冻结集合/,
  );

  const wrongAuthoritySchema = caseRun();
  Object.assign(wrongAuthoritySchema.worldSnapshots[0]!, { authoritySchemaVersion: 2 });
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(wrongAuthoritySchema, wrongAuthoritySchema),
    /authoritySchemaVersion|authority identity/,
  );

  const participantOrderDrift = caseRun();
  Object.assign(participantOrderDrift.worldSnapshots[1]!, {
    participants: [...participantOrderDrift.worldSnapshots[1]!.participants].reverse(),
  });
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(participantOrderDrift, participantOrderDrift),
    /participant IDs\/顺序/,
  );

  const missingFinalCheckpoint = caseRun();
  missingFinalCheckpoint.checkpoints = missingFinalCheckpoint.checkpoints.slice(0, -1);
  missingFinalCheckpoint.replayV5 = {
    ...missingFinalCheckpoint.replayV5,
    checkpoints: missingFinalCheckpoint.checkpoints,
  };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(missingFinalCheckpoint, missingFinalCheckpoint),
    /finalTick\/finalHash/,
  );

  const finalCheckpointHashDrift = caseRun();
  finalCheckpointHashDrift.checkpoints[finalCheckpointHashDrift.checkpoints.length - 1] = {
    tick: finalCheckpointHashDrift.finalTick,
    hash: '87654321',
  };
  finalCheckpointHashDrift.replayV5 = {
    ...finalCheckpointHashDrift.replayV5,
    checkpoints: finalCheckpointHashDrift.checkpoints,
  };
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(finalCheckpointHashDrift, finalCheckpointHashDrift),
    /checkpoint|finalHash/i,
  );
});

test('PA7-0.2 accepts pickup/retirement paths and binds retired identities to authority events', () => {
  const readyWithOneWorld = buildReadyWithoutPendingCaseRun(1);
  const producedBoundaries = createArenaPa7FormalLifecycleBoundariesV1({
    worldSnapshots: readyWithOneWorld.worldSnapshots,
    authorityEvents: readyWithOneWorld.authorityEvents,
  });
  assert.deepEqual(producedBoundaries, readyWithOneWorld.lifecycleBoundaries);
  assert.equal(Object.isFrozen(producedBoundaries), true);
  assert.throws(
    () => createArenaPa7FormalLifecycleBoundariesV1({
      worldSnapshots: readyWithOneWorld.worldSnapshots,
      authorityEvents: readyWithOneWorld.authorityEvents,
      futureField: true,
    }),
    /字段数量|未知字段/,
  );
  let proxyTrapCalls = 0;
  assert.throws(
    () => createArenaPa7FormalLifecycleBoundariesV1(new Proxy({}, {
      getPrototypeOf() {
        proxyTrapCalls += 1;
        return Object.prototype;
      },
    })),
    /Proxy/,
  );
  assert.equal(proxyTrapCalls, 0);
  const readySummary = createArenaPa7FormalDoubleRunSummaryV1(
    readyWithOneWorld,
    buildReadyWithoutPendingCaseRun(1),
  );
  const at599 = readySummary.lifecycleBoundaries[0]!;
  const at600 = readySummary.lifecycleBoundaries[1]!;
  const at601 = readySummary.lifecycleBoundaries[2]!;
  assert.equal(at599.worldEquipmentInstanceIds.length, 1);
  assert.equal(at599.heldEquipmentInstanceIds.length, 1);
  assert.equal(at599.retiredEquipmentInstanceIds.length, 1);
  assert.deepEqual(at600.pendingExpiryEquipmentInstanceIds, []);
  assert.equal(at600.resyncReadiness, 'ready');
  assert.equal(at600.pendingAuthorityTick, null);
  assert.equal(at600.authorityEventTypes.includes('EquipmentExpired'), false);
  assert.equal(at601.heldEquipmentInstanceIds.length, 1);
  assert.equal(at601.retiredEquipmentInstanceIds.length, 2);

  const readyWithNoWorld = createArenaPa7FormalDoubleRunSummaryV1(
    buildReadyWithoutPendingCaseRun(0),
    buildReadyWithoutPendingCaseRun(0),
  );
  assert.equal(readyWithNoWorld.lifecycleBoundaries[0]!.worldEquipmentInstanceIds.length, 0);
  assert.equal(readyWithNoWorld.lifecycleBoundaries[0]!.heldEquipmentInstanceIds.length, 2);
  assert.equal(readyWithNoWorld.lifecycleBoundaries[0]!.retiredEquipmentInstanceIds.length, 1);

  const forgedRetired = buildReadyWithoutPendingCaseRun(1);
  const forgedWave = forgedRetired.lifecycleBoundaries[0]!.waveEquipmentInstanceIds;
  forgedRetired.lifecycleBoundaries = forgedRetired.lifecycleBoundaries.map((item) => {
    if (item.waveIndex !== 0) return item;
    if (item.lifecycleOffset === 599) return rehashBoundary({
      ...item,
      worldEquipmentInstanceIds: [],
      heldEquipmentInstanceIds: [forgedWave[2]!],
      retiredEquipmentInstanceIds: [forgedWave[0]!, forgedWave[1]!],
      activeSupplyEquipmentInstanceIds: [],
      remainingTicks: [],
    });
    if (item.lifecycleOffset === 600) return rehashBoundary({
      ...item,
      heldEquipmentInstanceIds: [forgedWave[2]!],
      retiredEquipmentInstanceIds: [forgedWave[0]!, forgedWave[1]!],
    });
    return item;
  });
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(forgedRetired, forgedRetired),
    /Replay\/World 派生值/,
  );

  const retiredRevival = buildReadyWithoutPendingCaseRun(1);
  const revivalWave = retiredRevival.lifecycleBoundaries[2]!.waveEquipmentInstanceIds;
  retiredRevival.lifecycleBoundaries[2] = rehashBoundary({
    ...retiredRevival.lifecycleBoundaries[2]!,
    heldEquipmentInstanceIds: [revivalWave[0]!, revivalWave[2]!],
    retiredEquipmentInstanceIds: [revivalWave[1]!],
  });
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(retiredRevival, retiredRevival),
    /retired 集合必须单调且不得复活/,
  );

  const unexplainedDisappearance = buildReadyWithoutPendingCaseRun(1);
  unexplainedDisappearance.lifecycleBoundaries[1] = rehashBoundary({
    ...unexplainedDisappearance.lifecycleBoundaries[1]!,
    heldEquipmentInstanceIds: unexplainedDisappearance.lifecycleBoundaries[1]!
      .heldEquipmentInstanceIds.slice(0, 1),
  });
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(
      unexplainedDisappearance,
      unexplainedDisappearance,
    ),
    /wave=pending⊎held⊎retired/,
  );

  const pendingOutsidePreviousWorld = caseEvidence(0);
  const pendingWave = pendingOutsidePreviousWorld.lifecycleBoundaries[0]!.waveEquipmentInstanceIds;
  const invalidPendingBoundaries = pendingOutsidePreviousWorld.lifecycleBoundaries.map((item) => {
    if (item.waveIndex !== 0) return item;
    if (item.lifecycleOffset === 600) return rehashBoundary({
      ...item,
      pendingExpiryEquipmentInstanceIds: [pendingWave[2]],
      heldEquipmentInstanceIds: [pendingWave[0]],
      retiredEquipmentInstanceIds: [pendingWave[1]],
    });
    if (item.lifecycleOffset === 601) return rehashBoundary({
      ...item,
      heldEquipmentInstanceIds: [],
      retiredEquipmentInstanceIds: pendingWave,
    });
    return item;
  });
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...pendingOutsidePreviousWorld,
      lifecycleBoundaries: invalidPendingBoundaries,
    })),
    /pending 必须是 \+599 world 的子集/,
  );

  const pendingEmptyWithExpiry = buildReadyWithoutPendingCaseRun(1);
  pendingEmptyWithExpiry.authorityEvents[6] = expiredEvent(6, 1);
  pendingEmptyWithExpiry.replayV5 = {
    ...pendingEmptyWithExpiry.replayV5,
    events: pendingEmptyWithExpiry.authorityEvents,
  };
  pendingEmptyWithExpiry.lifecycleBoundaries = pendingEmptyWithExpiry.lifecycleBoundaries.map((item) => (
    item.waveIndex === 0 && item.lifecycleOffset === 600
      ? rehashBoundary({ ...item, authorityEventTypes: ['EquipmentExpired'] })
      : item
  ));
  assert.throws(
    () => createArenaPa7FormalDoubleRunSummaryV1(pendingEmptyWithExpiry, pendingEmptyWithExpiry),
    /pending 空时|Expired payload 必须精确覆盖/,
  );

  const mixedCases = Array.from(
    { length: ARENA_PA7_FORMAL_CASE_COUNT },
    (_, index) => caseEvidence(index),
  );
  mixedCases[0] = caseEvidenceFromSummary(readySummary) as typeof mixedCases[number];
  const { semanticHash: _oldSemanticHash, ...payloadWithoutSemantic } = validPayload();
  const mixedWithoutSemantic = {
    ...payloadWithoutSemantic,
    caseEvidence: mixedCases,
    aggregate: aggregate(mixedCases),
  };
  const mixedPayload = {
    ...mixedWithoutSemantic,
    semanticHash: createArenaPa7FormalRunSemanticHashV1(mixedWithoutSemantic),
  };
  const validatedMixed = validateArenaPa7FormalRunPayloadV1(mixedPayload);
  assert.equal(validatedMixed.aggregate.lifecycleCoverage.firstWavePendingAt600CaseCount, 299);
  assert.equal(validatedMixed.aggregate.lifecycleCoverage.firstWaveReadyWithoutPendingAt600CaseCount, 1);
  assert.equal(validatedMixed.aggregate.lifecycleCoverage.firstWaveRetiredBeforeExpiryCaseCount, 1);
});

test('PA7-0 enforces 599/600/601 lifecycle semantics without fabricating post-hard-limit proof', () => {
  const candidate = caseEvidence(0);
  const offsets = candidate.lifecycleBoundaries.map(({ waveIndex, lifecycleOffset }) => `${waveIndex}:${lifecycleOffset}`);
  assert.deepEqual(offsets, ['0:599', '0:600', '0:601', '1:0', '1:1']);
  assert.doesNotThrow(() => validateArenaPa7FormalCaseEvidenceV1(candidate));
  assert.equal(candidate.lifecycleBoundaries[0]!.waveEquipmentInstanceIds.length, 3);
  assert.equal(candidate.lifecycleBoundaries[0]!.activeSupplyEquipmentInstanceIds.length, 2);
  assert.equal(candidate.lifecycleBoundaries[0]!.heldEquipmentInstanceIds.length, 1);

  const missing601 = candidate.lifecycleBoundaries.filter(({ lifecycleOffset }) => lifecycleOffset !== 601);
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({ ...candidate, lifecycleBoundaries: missing601 })),
    /精确包含 5 个有序边界/,
  );

  const { retiredEquipmentInstanceIds: _missingRetired, ...boundaryWithoutRetired } = (
    candidate.lifecycleBoundaries[0]!
  );
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...candidate,
      lifecycleBoundaries: [boundaryWithoutRetired, ...candidate.lifecycleBoundaries.slice(1)],
    })),
    /字段数量|缺少字段/,
  );

  const repeatExpiry = candidate.lifecycleBoundaries.map((item) => item.lifecycleOffset === 601
    ? rehashBoundary({ ...item, authorityEventTypes: ['EquipmentExpired'] })
    : item);
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({ ...candidate, lifecycleBoundaries: repeatExpiry })),
    /不得重复 expiry/,
  );

  const pendingWorldMismatch = candidate.lifecycleBoundaries.map((item) => item.lifecycleOffset === 600
    ? rehashBoundary({ ...item, worldEquipmentInstanceIds: ['equipment-0-0-0'] })
    : item);
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...candidate,
      lifecycleBoundaries: pendingWorldMismatch,
    })),
    /两两互斥|world\/active 为空/,
  );

  const incompletePending = candidate.lifecycleBoundaries.map((item) => item.lifecycleOffset === 600
    ? rehashBoundary({ ...item, pendingExpiryEquipmentInstanceIds: ['equipment-0-0-0'] })
    : item);
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...candidate,
      lifecycleBoundaries: incompletePending,
    })),
    /wave=pending⊎held⊎retired|迁移必须由 pending\/held\/retired 解释|本波 waveEquipmentInstanceIds/,
  );

  const uncleared601 = candidate.lifecycleBoundaries.map((item) => item.lifecycleOffset === 601
    ? rehashBoundary({ ...item, worldEquipmentInstanceIds: ['equipment-0-0-0'] })
    : item);
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({ ...candidate, lifecycleBoundaries: uncleared601 })),
    /两两互斥|wave=held⊎retired/,
  );

  const weakSecondWave = candidate.lifecycleBoundaries.map((item) => (
    item.waveIndex === 1 && item.lifecycleOffset === 1
      ? rehashBoundary({ ...item, activeSupplyEquipmentInstanceIds: [] })
      : item
  ));
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({ ...candidate, lifecycleBoundaries: weakSecondWave })),
    /第二波 offset=1/,
  );

  const immediatePickupSecondWave = candidate.lifecycleBoundaries.map((item) => {
    if (item.waveIndex !== 1 || item.lifecycleOffset !== 1) return item;
    const worldIds = item.waveEquipmentInstanceIds.slice(0, 2);
    return rehashBoundary({
      ...item,
      worldEquipmentInstanceIds: worldIds,
      heldEquipmentInstanceIds: item.waveEquipmentInstanceIds.slice(2),
      activeSupplyEquipmentInstanceIds: worldIds,
      remainingTicks: [599, 599],
    });
  });
  assert.doesNotThrow(() => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
    ...candidate,
    lifecycleBoundaries: immediatePickupSecondWave,
  })));

  const prematureSecondWave = candidate.lifecycleBoundaries.map((item) => (
    item.waveIndex === 1 && item.lifecycleOffset === 0
      ? rehashBoundary({ ...item, worldEquipmentInstanceIds: ['equipment-0-1-0'] })
      : item
  ));
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...candidate,
      lifecycleBoundaries: prematureSecondWave,
    })),
    /第二波 offset=0/,
  );

  const repeatedCoverage = [
    ...candidate.lifecycleBoundaries,
    candidate.lifecycleBoundaries[0],
  ];
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...candidate,
      lifecycleBoundaries: repeatedCoverage,
    })),
    /精确包含 5 个/,
  );

  const supplyDrift = candidate.lifecycleBoundaries.map((item) => (
    item.waveIndex === 0 && item.lifecycleOffset === 600
      ? rehashBoundary({ ...item, supplyIds: [...item.supplyIds.slice(0, 2), 'drifted-supply'].sort() })
      : item
  ));
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({ ...candidate, lifecycleBoundaries: supplyDrift })),
    /每波 supplyIds/,
  );

  const duplicateSupplyIds = candidate.lifecycleBoundaries.map((item) => (
    item.waveIndex === 0 && item.lifecycleOffset === 599
      ? rehashBoundary({ ...item, supplyIds: [item.supplyIds[0], item.supplyIds[0], item.supplyIds[2]] })
      : item
  ));
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...candidate,
      lifecycleBoundaries: duplicateSupplyIds,
    })),
    /重复项|唯一/,
  );

  const singularSupplyId = candidate.lifecycleBoundaries.map((item) => (
    item.waveIndex === 0 && item.lifecycleOffset === 599
      ? rehashBoundary({ ...item, supplyIds: [item.supplyIds[0]] })
      : item
  ));
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...candidate,
      lifecycleBoundaries: singularSupplyId,
    })),
    /精确包含 3 个/,
  );

  const { supplyIds: oldSupplyIds, ...oldSingularBoundary } = candidate.lifecycleBoundaries[0]!;
  const legacySingularField = [
    { ...oldSingularBoundary, supplyId: oldSupplyIds[0] },
    ...candidate.lifecycleBoundaries.slice(1),
  ];
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...candidate,
      lifecycleBoundaries: legacySingularField,
    })),
    /字段数量|未知字段|缺少字段/,
  );

  const spoofHeldAsWorld = candidate.lifecycleBoundaries.map((item) => (
    item.waveIndex === 0 && item.lifecycleOffset === 599
      ? rehashBoundary({
        ...item,
        worldEquipmentInstanceIds: item.waveEquipmentInstanceIds,
        activeSupplyEquipmentInstanceIds: item.waveEquipmentInstanceIds,
        remainingTicks: [1, 1, 1],
      })
      : item
  ));
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...candidate,
      lifecycleBoundaries: spoofHeldAsWorld,
    })),
    /pending\/world\/held\/retired 必须两两互斥/,
  );

  const wrongWaveSupplyIds = candidate.lifecycleBoundaries.map((item) => item.waveIndex === 1
    ? rehashBoundary({ ...item, supplyIds: candidate.lifecycleBoundaries[0]!.supplyIds })
    : item);
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...candidate,
      lifecycleBoundaries: wrongWaveSupplyIds,
    })),
    /两波 supplyId 集合不得重叠/,
  );

  const crossBoundaryIdentityDrift = candidate.lifecycleBoundaries.map((item) => (
    item.waveIndex === 0 && item.lifecycleOffset === 600
      ? rehashBoundary({
        ...item,
        pendingExpiryEquipmentInstanceIds: [
          'equipment-0-0-0', 'equipment-0-0-1', 'equipment-0-0-other',
        ],
      })
      : item
  ));
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...candidate,
      lifecycleBoundaries: crossBoundaryIdentityDrift,
    })),
    /本波 waveEquipmentInstanceIds|同一精确实例集合/,
  );

  const firstWaveIds = candidate.lifecycleBoundaries[0]!.waveEquipmentInstanceIds;
  const overlappingWaves = candidate.lifecycleBoundaries.map((item) => item.waveIndex === 1
    ? rehashBoundary({
      ...item,
      waveEquipmentInstanceIds: firstWaveIds,
      worldEquipmentInstanceIds: item.lifecycleOffset === 1 ? firstWaveIds : [],
      activeSupplyEquipmentInstanceIds: item.lifecycleOffset === 1 ? firstWaveIds : [],
    })
    : item);
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...candidate,
      lifecycleBoundaries: overlappingWaves,
    })),
    /两波 equipment instance 集合不得重叠/,
  );

  const sequenceRollback = candidate.lifecycleBoundaries.map((item) => (
    item.waveIndex === 1 && item.lifecycleOffset === 0
      ? rehashBoundary({ ...item, snapshotEventSequence: 1 })
      : item
  ));
  assert.throws(
    () => validateArenaPa7FormalCaseEvidenceV1(rehashCase({
      ...candidate,
      lifecycleBoundaries: sequenceRollback,
    })),
    /snapshotEventSequence 不得回退/,
  );

  const badCoverage = {
    ...validPayload(),
    aggregate: {
      ...validPayload().aggregate,
      lifecycleCoverage: {
        ...validPayload().aggregate.lifecycleCoverage,
        firstWavePendingAt600CaseCount: 299,
      },
    },
  };
  assert.throws(() => validateArenaPa7FormalRunPayloadV1(badCoverage), /lifecycleCoverage.*与 cases 不一致/);
});

function failedEvidence(kind: 'source-drift' | 'cleanup-failed' | 'publication-conflict') {
  const completedCases = kind === 'source-drift' ? 0 : kind === 'cleanup-failed' ? 150 : 300;
  const currentCaseIndex = completedCases === 300 ? null : completedCases;
  const currentCaseId = currentCaseIndex === null
    ? null : `formal-survival-bot-${String(currentCaseIndex).padStart(3, '0')}`;
  const currentPass = currentCaseIndex === null ? null : 1;
  const currentTick = currentCaseIndex === null ? null : 600;
  const lastCommittedCaseEvidenceHash = completedCases === 0 ? null : sha(40_000 + completedCases - 1);
  const progress = {
    runToken: 'failed-run-token',
    sequence: 8,
    completedCases,
    currentCaseIndex,
    currentCaseId,
    currentPass,
    currentTick,
    lastCommittedCaseEvidenceHash,
  };
  const phase = kind === 'source-drift' ? 'preflight'
    : kind === 'cleanup-failed' ? 'cleanup' : 'publish';
  const cleanupErrors = kind === 'cleanup-failed' ? ['destroy failed'] : [];
  const withoutHash = {
    ...passedEvidence(),
    sourceIdentity: {
      ...passedEvidence().sourceIdentity,
      sourceDirty: kind === 'source-drift',
      repositoryFingerprintAfter: kind === 'source-drift' ? '3'.repeat(64) : 'b'.repeat(64),
    },
    progress,
    payload: null,
    gates: ARENA_PA7_FORMAL_GATE_IDS.map((id, index) => ({
      id,
      passed: index !== 1,
      evidenceHash: sha(30_000 + index),
      failureReason: index === 1 ? kind : null,
    })),
    cleanup: {
      ...passedEvidence().cleanup,
      pendingCleanupCount: kind === 'cleanup-failed' ? 1 : 0,
      cleanupErrorCount: cleanupErrors.length,
    },
    status: 'formal-failed',
    failure: {
      kind,
      phase,
      completedCases,
      currentCaseIndex,
      currentCaseId,
      currentPass,
      currentTick,
      lastCommittedCaseEvidenceHash,
      sourceFingerprintBefore: 'b'.repeat(64),
      sourceFingerprintAfter: kind === 'source-drift' ? '3'.repeat(64) : 'b'.repeat(64),
      cleanupErrors,
      causeName: 'Error',
      causeMessage: 'stable diagnostic',
    },
    semanticHash: 'a'.repeat(64),
  };
  return rehashEvidence(withoutHash);
}

test('PA7-0 validates progress, cleanup, source drift and publication failure as structured data', () => {
  const baseline = {
    runToken: 'progress-token',
    sequence: 1,
    completedCases: 0,
    currentCaseIndex: 0,
    currentCaseId: 'formal-survival-bot-000',
    currentPass: 1,
    currentTick: 0,
    lastCommittedCaseEvidenceHash: null,
  };
  const secondPass = {
    runToken: 'progress-token',
    sequence: 2,
    completedCases: 0,
    currentCaseIndex: 0,
    currentCaseId: 'formal-survival-bot-000',
    currentPass: 2,
    currentTick: 0,
    lastCommittedCaseEvidenceHash: null,
  };
  const secondPassAdvanced = {
    ...secondPass,
    sequence: 3,
    currentTick: 2_401,
  };
  const committed = {
    runToken: 'progress-token',
    sequence: 4,
    completedCases: 1,
    currentCaseIndex: 1,
    currentCaseId: 'formal-survival-bot-001',
    currentPass: 1,
    currentTick: 0,
    lastCommittedCaseEvidenceHash: 'a'.repeat(64),
  };
  assert.equal(validateArenaPa7FormalProgressSequenceV1([
    baseline,
    { ...baseline, sequence: 2, currentTick: 1 },
  ]).length, 2);
  assert.equal(validateArenaPa7FormalProgressSequenceV1([
    { ...baseline, currentTick: 2_401 },
    secondPass,
  ]).length, 2);
  assert.equal(validateArenaPa7FormalProgressSequenceV1([
    secondPassAdvanced,
    committed,
  ]).length, 2);
  assert.throws(
    () => validateArenaPa7FormalProgressSequenceV1([baseline, { ...secondPass, sequence: 3 }]),
    /跳号/,
  );
  assert.throws(
    () => validateArenaPa7FormalProgressSequenceV1([baseline, { ...secondPass, runToken: 'wrong' }]),
    /token/,
  );
  assert.throws(
    () => validateArenaPa7FormalProgressSequenceV1([
      { ...baseline, currentTick: 10 },
      { ...baseline, sequence: 2, currentTick: 9 },
    ]),
    /tick 必须严格 \+1/,
  );
  assert.throws(
    () => validateArenaPa7FormalProgressSequenceV1([baseline, secondPass]),
    /合法终局 tick/,
  );
  assert.throws(
    () => validateArenaPa7FormalProgressSequenceV1([
      baseline,
      { ...baseline, sequence: 2, currentTick: 2 },
    ]),
    /tick 必须严格 \+1/,
  );
  assert.throws(
    () => validateArenaPa7FormalProgressSequenceV1([
      { ...baseline, currentTick: 2_401 },
      secondPass,
      { ...secondPass, sequence: 3, currentPass: 1, currentTick: 1 },
    ]),
    /pass 只能在合法终局/,
  );
  assert.throws(
    () => validateArenaPa7FormalProgressSequenceV1([
      baseline,
      { ...baseline, sequence: 2, currentCaseId: 'drifted-case', currentTick: 1 },
    ]),
    /formal manifest index|identity 不得漂移/,
  );
  assert.throws(
    () => validateArenaPa7FormalProgressSequenceV1([
      committed,
      { ...committed, sequence: 5, currentTick: 1, lastCommittedCaseEvidenceHash: 'b'.repeat(64) },
    ]),
    /commit hash 不得漂移/,
  );
  assert.throws(
    () => validateArenaPa7FormalProgressSequenceV1([{ ...baseline, currentTick: 2_501 }]),
    /hard limit/,
  );

  const firstFailure = validateArenaPa7FormalEvidenceV1(failedEvidence('source-drift')).failure!;
  const middleFailure = validateArenaPa7FormalEvidenceV1(failedEvidence('cleanup-failed')).failure!;
  const finalFailure = validateArenaPa7FormalEvidenceV1(failedEvidence('publication-conflict')).failure!;
  assert.equal(firstFailure.completedCases, 0);
  assert.equal(middleFailure.completedCases, 150);
  assert.equal(finalFailure.completedCases, 300);
  assert.equal(firstFailure.kind, 'source-drift');
  assert.equal(middleFailure.phase, 'cleanup');
  assert.equal(finalFailure.phase, 'publish');

  assert.throws(
    () => validateArenaPa7FormalEvidenceV1(rehashEvidence({
      ...passedEvidence(),
      progress: { ...passedEvidence().progress, sequence: passedEvidence().progress.sequence + 1 },
    })),
    /progressFinal/,
  );
  assert.throws(
    () => validateArenaPa7FormalEvidenceV1(rehashEvidence({
      ...passedEvidence(),
      buildIdentity: { ...passedEvidence().buildIdentity, loaderAttestationHash: '9'.repeat(64) },
    })),
    /loader attestation identity/,
  );

  const mismatchedGate = failedEvidence('publication-conflict');
  const mismatchedGates = mismatchedGate.gates.map((gate) => gate.passed
    ? gate
    : { ...gate, failureReason: 'source-drift' });
  assert.throws(
    () => validateArenaPa7FormalEvidenceV1(rehashEvidence({
      ...mismatchedGate,
      gates: mismatchedGates,
    })),
    /failure\.kind.*失败 gate/,
  );

  const wrongPublishPhase = failedEvidence('publication-conflict');
  assert.throws(
    () => validateArenaPa7FormalEvidenceV1(rehashEvidence({
      ...wrongPublishPhase,
      failure: { ...wrongPublishPhase.failure!, phase: 'run-first' },
    })),
    /必须位于 publish/,
  );
  assert.throws(
    () => validateArenaPa7FormalEvidenceV1(rehashEvidence({
      ...passedEvidence(),
      cleanup: { ...passedEvidence().cleanup, childProcessesExited: 0 },
    })),
    /formal-passed.*cleanup/,
  );
});
