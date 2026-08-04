import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  linkSync,
  renameSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  ARENA_PA7_FORMAL_CASE_COUNT,
  ARENA_PA7_FORMAL_CONTRACT_ID,
  ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION,
  ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK,
  ARENA_PA7_FORMAL_EQUIPMENT_DESPAWN_REASONS,
  ARENA_PA7_FORMAL_GATE_IDS,
  ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES,
  ARENA_PA7_FORMAL_LOADER_ATTESTATION_HASH_FLAG,
  ARENA_PA7_FORMAL_NODE_IMPORT_SPECIFIER,
  ARENA_PA7_FORMAL_REQUEST_V1,
  ARENA_PA7_FORMAL_REQUIRED_EVENT_TYPES,
  ARENA_PA7_FORMAL_WORKER_FLAG,
  ARENA_PA7_FORMAL_WORKER_SCRIPT_RELATIVE_PATH,
  createArenaPa7FormalCaseEvidenceHashV1,
  createArenaPa7FormalEvidenceHashV1,
  createArenaPa7FormalLifecycleBoundaryHashV1,
  createArenaPa7FormalRunSemanticHashV1,
  validateArenaPa7FormalEvidenceV1,
  validateArenaPa7FormalRunPayloadV1,
} from '../../scripts/lib/arena-pa7-formal-contract-v1.js';
import type {
  ArenaPa7FormalBuildIdentityV1,
  ArenaPa7FormalEnvironmentIdentityV1,
  ArenaPa7FormalEvidenceV1,
  ArenaPa7FormalGateV1,
  ArenaPa7FormalProgressV1,
  ArenaPa7FormalRunPayloadV1,
} from '../../scripts/lib/arena-pa7-formal-contract-v1.js';
import {
  ArenaPa7FormalPublicationFailureV1,
  ArenaPa7FormalWorkerFailureV1,
  ARENA_PA7_FORMAL_REQUIRED_PRODUCTION_MODULE_PATHS_V1,
  captureArenaPa7FormalRegularFileHashV1,
  publishArenaPa7FormalEvidenceAtomicV1,
  runArenaPa7FormalEvidenceV1,
  runArenaPa7StrictJsonWorkerV1,
  validateArenaPa7FormalSampledProgressV1,
  validateArenaPa7FormalGateConfigurationV1,
} from '../../scripts/lib/arena-pa7-formal-evidence-v1.js';
import type {
  ArenaPa7FormalBuildAttestationV1,
  ArenaPa7FormalEvidenceDependenciesV1,
  ArenaPa7FormalGateConfigurationV1,
  ArenaPa7FormalIsolationAttestationV1,
  ArenaPa7FormalSourceSnapshotV1,
  ArenaPa7FormalWorkerCleanupV1,
} from '../../scripts/lib/arena-pa7-formal-evidence-v1.js';
import {
  parseArenaPa7FormalGateCliV1,
  readArenaPa7FormalGateConfigurationFileV1,
} from '../../scripts/arena-pa7-formal-gate.js';

const TEST_RUN_TOKEN = 'pa7-lane-b-fixture-run';

function hex(value: number, width = 8): string {
  return value.toString(16).padStart(width, '0');
}

function sha(value: number): string {
  return hex(value, 64);
}

function withHash<T extends Record<string, unknown>, K extends string>(
  value: T,
  key: K,
  hash: (candidate: unknown) => string,
): T & Record<K, string> {
  return { ...value, [key]: hash(value) } as T & Record<K, string>;
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
  return Object.fromEntries(ARENA_PA7_FORMAL_EQUIPMENT_DESPAWN_REASONS.map((reason) => [reason, count]));
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
    playerParticipantId: ignoredPlayerParticipantId,
    botParticipantId: ignoredBotParticipantId,
    ...definition
  } = formalCaseDefinition(caseIndex);
  void ignoredPlayerParticipantId;
  void ignoredBotParticipantId;
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
    item.lifecycleBoundaries.find((candidate) => (
      candidate.waveIndex === waveIndex && candidate.lifecycleOffset === offset
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

let memoPayload: ArenaPa7FormalRunPayloadV1 | null = null;

function validPayload(): ArenaPa7FormalRunPayloadV1 {
  if (memoPayload !== null) return memoPayload;
  const cases = Array.from({ length: ARENA_PA7_FORMAL_CASE_COUNT }, (_, index) => caseEvidence(index));
  const withoutSemantic = {
    schemaVersion: ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION,
    contractId: ARENA_PA7_FORMAL_CONTRACT_ID,
    runToken: TEST_RUN_TOKEN,
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
      runToken: TEST_RUN_TOKEN,
      sequence: 1_500_600,
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
  memoPayload = validateArenaPa7FormalRunPayloadV1({
    ...withoutSemantic,
    semanticHash: createArenaPa7FormalRunSemanticHashV1(withoutSemantic),
  });
  return memoPayload;
}

function payloadWithPerformance(options: {
  readonly p95MicrosPerTick?: number;
  readonly heapDeltaBytes?: number;
}): ArenaPa7FormalRunPayloadV1 {
  const payload = validPayload();
  const heapDeltaBytes = options.heapDeltaBytes ?? payload.aggregate.heap.deltaBytes;
  const heapBaselineBytes = Math.max(
    payload.aggregate.heap.baselineBytes,
    heapDeltaBytes < 0 ? -heapDeltaBytes : 0,
  );
  const heapEndingBytes = heapBaselineBytes + heapDeltaBytes;
  const aggregateOverride = {
    ...payload.aggregate,
    cpu: {
      ...payload.aggregate.cpu,
      p50MicrosPerTick: Math.min(
        payload.aggregate.cpu.p50MicrosPerTick,
        options.p95MicrosPerTick ?? payload.aggregate.cpu.p95MicrosPerTick,
      ),
      p95MicrosPerTick: options.p95MicrosPerTick ?? payload.aggregate.cpu.p95MicrosPerTick,
      p99MicrosPerTick: Math.max(
        payload.aggregate.cpu.p99MicrosPerTick,
        options.p95MicrosPerTick ?? payload.aggregate.cpu.p95MicrosPerTick,
      ),
    },
    heap: {
      baselineBytes: heapBaselineBytes,
      peakBytes: Math.max(heapBaselineBytes, heapEndingBytes),
      endingBytes: heapEndingBytes,
      deltaBytes: heapDeltaBytes,
    },
  };
  const { semanticHash: ignoredSemanticHash, ...withoutSemanticHash } = payload;
  void ignoredSemanticHash;
  const candidate = {
    ...withoutSemanticHash,
    aggregate: aggregateOverride,
  };
  return validateArenaPa7FormalRunPayloadV1({
    ...candidate,
    semanticHash: createArenaPa7FormalRunSemanticHashV1(candidate),
  });
}

function sampledProgress(options: {
  readonly sequence: number;
  readonly completedCases?: number;
  readonly currentPass?: 1 | 2 | null;
  readonly currentTick?: number | null;
  readonly lastCommittedCaseEvidenceHash?: string | null;
}): ArenaPa7FormalProgressV1 {
  const completedCases = options.completedCases ?? 0;
  const final = completedCases === ARENA_PA7_FORMAL_CASE_COUNT;
  return Object.freeze({
    runToken: TEST_RUN_TOKEN,
    sequence: options.sequence,
    completedCases,
    currentCaseIndex: final ? null : completedCases,
    currentCaseId: final
      ? null
      : `formal-survival-bot-${String(completedCases).padStart(3, '0')}`,
    currentPass: final ? null : options.currentPass ?? 1,
    currentTick: final ? null : options.currentTick ?? 0,
    lastCommittedCaseEvidenceHash: completedCases === 0
      ? null
      : options.lastCommittedCaseEvidenceHash ?? '9'.repeat(64),
  });
}

function sourceSnapshot(options: {
  readonly dirty?: boolean;
  readonly fingerprint?: string;
} = {}): ArenaPa7FormalSourceSnapshotV1 {
  return Object.freeze({
    headCommit: '1'.repeat(40),
    sourceDirty: options.dirty ?? false,
    repositoryFingerprint: options.fingerprint ?? '2'.repeat(64),
    packageLockHash: '3'.repeat(64),
    productionModuleHashes: Object.freeze(
      ARENA_PA7_FORMAL_REQUIRED_PRODUCTION_MODULE_PATHS_V1.map((relativePath, index) => (
        Object.freeze({ relativePath, sha256: sha(40_000 + index) })
      )),
    ),
  });
}

const BUILD_ATTESTATION: ArenaPa7FormalBuildAttestationV1 = Object.freeze({
  buildId: 'arena-formal-build-fixture',
  buildHash: '5'.repeat(64),
  productionVariantId: 'C+B+D',
  loaderAttestationHash: 'a'.repeat(64),
  packageLockHash: '3'.repeat(64),
  contentSelectionHash: 'ffffffff',
  compositionContractHash: '11111111',
});

const ISOLATION_ATTESTATION: ArenaPa7FormalIsolationAttestationV1 = Object.freeze({
  isolationEvidenceId: 'isolated-fixture',
  isolationEvidenceHash: '6'.repeat(64),
});

function buildIdentity(buildId = 'arena-formal-build-fixture'): ArenaPa7FormalBuildIdentityV1 {
  return Object.freeze({
    nodeVersion: process.version,
    packageManagerVersion: 'npm@fixture',
    platform: process.platform,
    architecture: process.arch,
    buildId,
    buildHash: '5'.repeat(64),
    productionVariantId: 'C+B+D',
    loaderAttestationHash: 'a'.repeat(64),
  });
}

function environmentIdentity(cpuModel = 'fixture-cpu'): ArenaPa7FormalEnvironmentIdentityV1 {
  return Object.freeze({
    cpuModel,
    logicalCpuCount: 8,
    totalMemoryBytes: 16_000_000_000,
    isolationEvidenceId: 'isolated-fixture',
    isolationEvidenceHash: '6'.repeat(64),
  });
}

function passedGates(): readonly ArenaPa7FormalGateV1[] {
  return Object.freeze(ARENA_PA7_FORMAL_GATE_IDS.map((id, index) => Object.freeze({
    id,
    passed: true,
    evidenceHash: sha(20_000 + index),
    failureReason: null,
  })));
}

function zeroWorkerCleanup(): ArenaPa7FormalWorkerCleanupV1 {
  return Object.freeze({
    childProcessesStarted: 1,
    childProcessesExited: 1,
    termSignalsSent: 0,
    killSignalsSent: 0,
    temporaryPathsCreated: 0,
    temporaryPathsRemoved: 0,
    pendingCleanupCount: 0,
    cleanupErrors: Object.freeze([]),
  });
}

function configuration(): ArenaPa7FormalGateConfigurationV1 {
  return Object.freeze({
    schemaVersion: 1,
    productionModulePaths: ARENA_PA7_FORMAL_REQUIRED_PRODUCTION_MODULE_PATHS_V1,
    buildAttestation: BUILD_ATTESTATION,
    isolationAttestation: ISOLATION_ATTESTATION,
    gateAttestation: passedGates(),
    worker: Object.freeze({
      command: process.execPath,
      args: Object.freeze([
        '--import',
        ARENA_PA7_FORMAL_NODE_IMPORT_SPECIFIER,
        ARENA_PA7_FORMAL_WORKER_SCRIPT_RELATIVE_PATH,
        ARENA_PA7_FORMAL_WORKER_FLAG,
        ARENA_PA7_FORMAL_LOADER_ATTESTATION_HASH_FLAG,
        BUILD_ATTESTATION.loaderAttestationHash,
      ]),
    }),
    inactivityTimeoutMs: 1_000,
    outputCapBytes: 1_000_000,
    progressPollMs: 10,
    termGraceMs: 50,
    killWaitMs: 500,
  });
}

function failedEvidence(
  kind: 'publication-failed' | 'publication-conflict' = 'publication-failed',
): ArenaPa7FormalEvidenceV1 {
  const progress = {
    runToken: TEST_RUN_TOKEN,
    sequence: 0,
    completedCases: 0,
    currentCaseIndex: 0,
    currentCaseId: 'formal-survival-bot-000',
    currentPass: 1 as const,
    currentTick: 0,
    lastCommittedCaseEvidenceHash: null,
  };
  const source = sourceSnapshot();
  const withoutHash = {
    schemaVersion: ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION,
    contractId: ARENA_PA7_FORMAL_CONTRACT_ID,
    sourceIdentity: {
      headCommit: source.headCommit,
      sourceDirty: false,
      repositoryFingerprintBefore: source.repositoryFingerprint,
      repositoryFingerprintAfter: source.repositoryFingerprint,
      packageLockHash: source.packageLockHash,
      productionModuleHashes: source.productionModuleHashes,
    },
    buildIdentity: buildIdentity(),
    environmentIdentity: environmentIdentity(),
    request: ARENA_PA7_FORMAL_REQUEST_V1,
    progress,
    payload: null,
    gates: ARENA_PA7_FORMAL_GATE_IDS.map((id, index) => ({
      id,
      passed: false,
      evidenceHash: sha(30_000 + index),
      failureReason: kind,
    })),
    cleanup: {
      childProcessesStarted: 0,
      childProcessesExited: 0,
      termSignalsSent: 0,
      killSignalsSent: 0,
      temporaryPathsCreated: 0,
      temporaryPathsRemoved: 0,
      pendingCleanupCount: 0,
      cleanupErrorCount: 0,
    },
    status: 'formal-failed' as const,
    failure: {
      kind,
      phase: 'publish' as const,
      completedCases: 0,
      currentCaseIndex: 0,
      currentCaseId: 'formal-survival-bot-000',
      currentPass: 1 as const,
      currentTick: 0,
      lastCommittedCaseEvidenceHash: null,
      sourceFingerprintBefore: source.repositoryFingerprint,
      sourceFingerprintAfter: source.repositoryFingerprint,
      cleanupErrors: [],
      causeName: 'Error',
      causeMessage: 'fixture publication failure',
    },
    semanticHash: '7'.repeat(64),
    generatedAt: '2026-08-03T00:00:00.000Z',
  };
  return validateArenaPa7FormalEvidenceV1({
    ...withoutHash,
    evidenceHash: createArenaPa7FormalEvidenceHashV1(withoutHash),
  });
}

async function temporaryDirectory(): Promise<string> {
  return realpath(await mkdtemp(path.join(os.tmpdir(), 'arena-pa7-evidence-test-')));
}

async function pathExists(value: string): Promise<boolean> {
  try {
    await lstat(value);
    return true;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function waitForFile(filePath: string): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    if (await pathExists(filePath)) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail(`timed out waiting for ${filePath}`);
}

async function startAtomicFileSwap(options: {
  readonly directory: string;
  readonly targetPath: string;
  readonly regularSourcePath: string;
  readonly symlinkTargetPath: string;
}): Promise<Readonly<{ readonly wait: () => Promise<void> }>> {
  const scriptPath = path.join(options.directory, `atomic-swap-${Date.now()}-${Math.random()}.mjs`);
  const readyPath = `${scriptPath}.ready`;
  await writeFile(scriptPath, [
    'import { linkSync, renameSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";',
    'const [target,regularSource,symlinkTarget,ready]=process.argv.slice(2);',
    'writeFileSync(ready,"ready");',
    'const deadline=Date.now()+900;',
    'let sequence=0;',
    'while(Date.now()<deadline){',
    '  const candidate=`${target}.candidate-${process.pid}`;',
    '  try{unlinkSync(candidate);}catch(error){if(error.code!=="ENOENT")throw error;}',
    '  if(sequence%2===0)linkSync(regularSource,candidate);else symlinkSync(symlinkTarget,candidate);',
    '  renameSync(candidate,target);',
    '  sequence+=1;',
    '}',
  ].join('\n'));
  const child = spawn(process.execPath, [
    scriptPath,
    options.targetPath,
    options.regularSourcePath,
    options.symlinkTargetPath,
    readyPath,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => { stderr += chunk; });
  const completion = new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0 && signal === null) resolve();
      else reject(new Error(`atomic swap failed code=${String(code)} signal=${String(signal)} ${stderr}`));
    });
  });
  await waitForFile(readyPath);
  return Object.freeze({ wait: () => completion });
}

function baseDependencies(overrides: ArenaPa7FormalEvidenceDependenciesV1 = {}) {
  const payload = validPayload();
  return {
    captureSource: () => sourceSnapshot(),
    captureBuild: () => buildIdentity(),
    captureEnvironment: () => environmentIdentity(),
    runWorker: () => Object.freeze({
      payload,
      progress: payload.progressFinal,
      cleanup: zeroWorkerCleanup(),
    }),
    now: () => new Date('2026-08-03T00:00:00.000Z'),
    token: () => TEST_RUN_TOKEN,
    ...overrides,
  } satisfies ArenaPa7FormalEvidenceDependenciesV1;
}

function runOptions(directory: string, basename: string) {
  const config = configuration();
  return {
    cwd: process.cwd(),
    outputPath: path.join(directory, basename),
    productionModulePaths: config.productionModulePaths,
    buildAttestation: config.buildAttestation,
    isolationAttestation: config.isolationAttestation,
    gateAttestation: config.gateAttestation,
    worker: config.worker,
    inactivityTimeoutMs: config.inactivityTimeoutMs,
    outputCapBytes: config.outputCapBytes,
    progressPollMs: config.progressPollMs,
    termGraceMs: config.termGraceMs,
    killWaitMs: config.killWaitMs,
  };
}

test('PA7 lane B configuration rejects exact-key and hostile data without invoking accessors', () => {
  const valid = configuration();
  assert.equal(validateArenaPa7FormalGateConfigurationV1(valid).schemaVersion, 1);
  assert.throws(() => validateArenaPa7FormalGateConfigurationV1({ ...valid, future: true }), /exact-key/);
  const { worker: ignoredWorker, ...missing } = valid;
  void ignoredWorker;
  assert.throws(() => validateArenaPa7FormalGateConfigurationV1(missing), /exact-key/);
  assert.throws(() => validateArenaPa7FormalGateConfigurationV1({ ...valid, schemaVersion: 2 }), /schemaVersion/);
  assert.throws(() => validateArenaPa7FormalGateConfigurationV1(new Proxy(valid, {})), /Proxy/);

  let reads = 0;
  const accessor = { ...valid } as Record<string, unknown>;
  Object.defineProperty(accessor, 'worker', {
    enumerable: true,
    get() {
      reads += 1;
      throw new Error('must not execute');
    },
  });
  assert.throws(() => validateArenaPa7FormalGateConfigurationV1(accessor), /数据字段/);
  assert.equal(reads, 0);
  assert.throws(
    () => validateArenaPa7FormalGateConfigurationV1({ ...valid, [Symbol('future')]: true }),
    /Symbol/,
  );
  assert.throws(
    () => validateArenaPa7FormalGateConfigurationV1({ ...valid, productionModulePaths: new Array(1) }),
    /sparse/,
  );
  const cyclic = { ...valid } as Record<string, unknown>;
  cyclic.worker = cyclic;
  assert.throws(() => validateArenaPa7FormalGateConfigurationV1(cyclic), /循环引用/);
});

test('PA7 formal configuration accepts only the frozen production worker and module closure', () => {
  const valid = configuration();
  assert.doesNotThrow(() => validateArenaPa7FormalGateConfigurationV1(valid));
  const rejectWorker = (worker: ArenaPa7FormalGateConfigurationV1['worker']) => {
    assert.throws(
      () => validateArenaPa7FormalGateConfigurationV1({ ...valid, worker }),
      /正式 worker|Node executable|参数|loader|runner|tsx/i,
    );
  };

  rejectWorker({ command: '/usr/bin/env', args: valid.worker.args });
  rejectWorker({ command: process.execPath, args: ['-e', 'process.stdout.write("fixture")'] });
  rejectWorker({ command: process.execPath, args: valid.worker.args.slice(0, -1) });
  rejectWorker({ command: process.execPath, args: [...valid.worker.args, '--extra'] });
  rejectWorker({
    command: process.execPath,
    args: [
      ...valid.worker.args.slice(0, -2),
      `${ARENA_PA7_FORMAL_LOADER_ATTESTATION_HASH_FLAG}=${BUILD_ATTESTATION.loaderAttestationHash}`,
    ],
  });
  rejectWorker({
    command: process.execPath,
    args: valid.worker.args.map((item) => (
      item === ARENA_PA7_FORMAL_WORKER_SCRIPT_RELATIVE_PATH ? '../fixture-worker.ts' : item
    )),
  });
  rejectWorker({
    command: process.execPath,
    args: [...valid.worker.args.slice(0, -1), 'b'.repeat(64)],
  });

  for (const requiredPath of ARENA_PA7_FORMAL_REQUIRED_PRODUCTION_MODULE_PATHS_V1) {
    assert.throws(() => validateArenaPa7FormalGateConfigurationV1({
      ...valid,
      productionModulePaths: valid.productionModulePaths.filter((item) => item !== requiredPath),
    }), /production module|正式模块|闭包/i);
  }
});

test('PA7 sampled latest-snapshot validation proves reachability through adjacent tick states', () => {
  const initial = sampledProgress({ sequence: 0 });
  const samePass = sampledProgress({ sequence: 10, currentTick: 10 });
  assert.equal(
    validateArenaPa7FormalSampledProgressV1(samePass, TEST_RUN_TOKEN, initial).advanced,
    true,
  );
  assert.throws(
    () => validateArenaPa7FormalSampledProgressV1(
      sampledProgress({ sequence: 9, currentTick: 10 }),
      TEST_RUN_TOKEN,
      initial,
    ),
    /sequence|逐 tick|可达/i,
  );
  assert.throws(
    () => validateArenaPa7FormalSampledProgressV1(
      sampledProgress({ sequence: 1 }),
      TEST_RUN_TOKEN,
      initial,
    ),
    /pause|伪进度|逐 tick|可达/i,
  );

  const legalSecondPass = sampledProgress({ sequence: 2_407, currentPass: 2, currentTick: 5 });
  assert.equal(
    validateArenaPa7FormalSampledProgressV1(legalSecondPass, TEST_RUN_TOKEN, initial).advanced,
    true,
  );
  assert.throws(
    () => validateArenaPa7FormalSampledProgressV1(
      sampledProgress({ sequence: 100, currentPass: 2, currentTick: 5 }),
      TEST_RUN_TOKEN,
      initial,
    ),
    /pass|2401|2500|可达/i,
  );

  const legalCommit = sampledProgress({
    sequence: 4_804,
    completedCases: 1,
    currentPass: 1,
    currentTick: 0,
  });
  assert.equal(
    validateArenaPa7FormalSampledProgressV1(legalCommit, TEST_RUN_TOKEN, initial).advanced,
    true,
  );
  assert.throws(
    () => validateArenaPa7FormalSampledProgressV1(
      sampledProgress({ sequence: 4_803, completedCases: 1 }),
      TEST_RUN_TOKEN,
      initial,
    ),
    /commit|2401|2500|可达/i,
  );
  assert.throws(
    () => validateArenaPa7FormalSampledProgressV1(
      sampledProgress({ sequence: 9_608, completedCases: 2 }),
      TEST_RUN_TOKEN,
      initial,
    ),
    /跳 case/i,
  );
  assert.throws(
    () => validateArenaPa7FormalSampledProgressV1(
      { ...samePass, lastCommittedCaseEvidenceHash: '8'.repeat(64) },
      TEST_RUN_TOKEN,
      initial,
    ),
    /lastCommitted|commit hash/i,
  );
  assert.throws(
    () => validateArenaPa7FormalSampledProgressV1(
      { ...samePass, runToken: 'wrong-token' },
      TEST_RUN_TOKEN,
      initial,
    ),
    /runToken/i,
  );

  const penultimate = sampledProgress({
    sequence: 100_000,
    completedCases: 299,
    currentPass: 2,
    currentTick: 2_500,
  });
  const final = sampledProgress({
    sequence: 100_001,
    completedCases: 300,
    lastCommittedCaseEvidenceHash: '8'.repeat(64),
  });
  assert.equal(
    validateArenaPa7FormalSampledProgressV1(final, TEST_RUN_TOKEN, penultimate).advanced,
    true,
  );
});

test('PA7 fd capture never follows a final-component symlink during controlled replacement races', async (t) => {
  if (process.platform === 'win32') {
    t.skip('O_NOFOLLOW and POSIX atomic replacement assertion');
    return;
  }
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));

  const repository = path.join(directory, 'repository');
  await mkdir(repository);
  const regularSource = path.join(repository, 'regular-source.txt');
  const target = path.join(repository, 'target.txt');
  const outsideMarker = path.join(directory, 'outside-marker.txt');
  const localBytes = 'local-repository-bytes';
  const outsideBytes = 'outside-marker-must-never-be-read';
  await writeFile(regularSource, localBytes);
  await writeFile(target, localBytes);
  await writeFile(outsideMarker, outsideBytes);
  const localHash = createHash('sha256').update(localBytes).digest('hex');
  const outsideHash = createHash('sha256').update(outsideBytes).digest('hex');
  assert.notEqual(localHash, outsideHash);

  const swap = await startAtomicFileSwap({
    directory,
    targetPath: target,
    regularSourcePath: regularSource,
    symlinkTargetPath: outsideMarker,
  });
  let successes = 0;
  let failures = 0;
  const deadline = Date.now() + 700;
  while (Date.now() < deadline) {
    try {
      const captured = captureArenaPa7FormalRegularFileHashV1(repository, 'target.txt');
      assert.equal(captured, localHash);
      assert.notEqual(captured, outsideHash);
      successes += 1;
    } catch {
      failures += 1;
    }
  }
  await swap.wait();
  assert.ok(successes > 0);
  assert.ok(failures > 0);

  const initialSymlink = path.join(repository, 'initial-symlink.txt');
  await symlink(outsideMarker, initialSymlink);
  assert.throws(
    () => captureArenaPa7FormalRegularFileHashV1(repository, 'initial-symlink.txt'),
    /普通文件|realpath 逃逸/,
  );
});

test('PA7 configuration fd capture cannot return an outside config during atomic replacement', async (t) => {
  if (process.platform === 'win32') {
    t.skip('O_NOFOLLOW and POSIX atomic replacement assertion');
    return;
  }
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const configurationDirectory = path.join(directory, 'configuration');
  await mkdir(configurationDirectory);
  const regularSource = path.join(configurationDirectory, 'regular-source.json');
  const target = path.join(configurationDirectory, 'gate.json');
  const outsideMarker = path.join(directory, 'outside-gate.json');
  const localConfiguration = {
    ...configuration(),
    buildAttestation: { ...BUILD_ATTESTATION, buildId: 'local-build' },
  };
  const outsideConfiguration = {
    ...configuration(),
    buildAttestation: { ...BUILD_ATTESTATION, buildId: 'outside-marker-build' },
  };
  await writeFile(regularSource, `${JSON.stringify(localConfiguration)}\n`);
  await writeFile(target, `${JSON.stringify(localConfiguration)}\n`);
  await writeFile(outsideMarker, `${JSON.stringify(outsideConfiguration)}\n`);

  const swap = await startAtomicFileSwap({
    directory,
    targetPath: target,
    regularSourcePath: regularSource,
    symlinkTargetPath: outsideMarker,
  });
  let successes = 0;
  let failures = 0;
  const deadline = Date.now() + 700;
  while (Date.now() < deadline) {
    try {
      const captured = readArenaPa7FormalGateConfigurationFileV1(target);
      assert.equal(captured.buildAttestation.buildId, 'local-build');
      assert.notEqual(captured.buildAttestation.buildId, 'outside-marker-build');
      successes += 1;
    } catch {
      failures += 1;
    }
  }
  await swap.wait();
  assert.ok(successes > 0);
  assert.ok(failures > 0);
});

test('PA7 publication is strict, no-overwrite and isolated for success/failure evidence', async (t) => {
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const evidence = failedEvidence();
  const output = path.join(directory, 'evidence.json');
  const stats = await publishArenaPa7FormalEvidenceAtomicV1(output, evidence, { token: 'first' });
  assert.deepEqual(stats, {
    temporaryPathsCreated: 2,
    temporaryPathsRemoved: 2,
    cleanupErrors: [],
  });
  const reread = validateArenaPa7FormalEvidenceV1(JSON.parse((await readFile(output, 'utf8')).trim()));
  assert.equal(reread.evidenceHash, evidence.evidenceHash);
  await assert.rejects(
    publishArenaPa7FormalEvidenceAtomicV1(output, failedEvidence('publication-conflict'), { token: 'second' }),
    (error: unknown) => error instanceof ArenaPa7FormalPublicationFailureV1
      && error.kind === 'publication-conflict',
  );
  assert.equal(JSON.parse((await readFile(output, 'utf8')).trim()).evidenceHash, evidence.evidenceHash);
});

test('PA7 publication rejects concurrent targets, residual temp/lock, partial JSON, symlink and escape', async (t) => {
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const evidence = failedEvidence();

  const concurrent = path.join(directory, 'concurrent.json');
  const results = await Promise.allSettled([
    publishArenaPa7FormalEvidenceAtomicV1(concurrent, evidence, { token: 'concurrent-a' }),
    publishArenaPa7FormalEvidenceAtomicV1(concurrent, evidence, { token: 'concurrent-b' }),
  ]);
  assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
  assert.equal(results.filter(({ status }) => status === 'rejected').length, 1);

  const locked = path.join(directory, 'locked.json');
  await writeFile(path.join(directory, '.locked.json.lock'), 'residual');
  await assert.rejects(
    publishArenaPa7FormalEvidenceAtomicV1(locked, evidence, { token: 'locked' }),
    /EEXIST|publication-conflict|exist/i,
  );
  assert.equal(await pathExists(locked), false);

  const residual = path.join(directory, 'residual.json');
  const residualTemporary = path.join(directory, `.residual.json.${process.pid}.fixed.tmp`);
  await writeFile(residualTemporary, 'residual');
  await assert.rejects(
    publishArenaPa7FormalEvidenceAtomicV1(residual, evidence, { token: 'fixed' }),
    /EEXIST|publication-conflict|exist/i,
  );
  assert.equal(await readFile(residualTemporary, 'utf8'), 'residual');

  const partial = path.join(directory, 'partial.json');
  const partialTemporary = path.join(directory, `.partial.json.${process.pid}.partial.tmp`);
  await assert.rejects(publishArenaPa7FormalEvidenceAtomicV1(partial, evidence, {
    token: 'partial',
    beforePublish: async () => writeFile(partialTemporary, '{"partial":'),
  }), /完整 JSON|Unexpected|publication-failed/i);
  assert.equal(await pathExists(partial), false);

  const target = path.join(directory, 'target.json');
  const linked = path.join(directory, 'linked.json');
  await writeFile(target, 'preserve');
  await symlink(target, linked);
  await assert.rejects(
    publishArenaPa7FormalEvidenceAtomicV1(linked, evidence, { token: 'symlink' }),
    /target 已存在|publication-conflict/i,
  );
  assert.equal(await readFile(target, 'utf8'), 'preserve');
  await assert.rejects(
    publishArenaPa7FormalEvidenceAtomicV1(`${directory}/x/../escape.json`, evidence),
    /逃逸|冗余/,
  );
});

test('PA7 orchestration publishes a validator-clean synthetic success and binds source/build identities', async (t) => {
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const result = await runArenaPa7FormalEvidenceV1(
    runOptions(directory, 'passed.json'),
    baseDependencies(),
  );
  assert.equal(result.evidence.status, 'formal-passed');
  assert.equal(result.publishedPath, path.join(directory, 'passed.json'));
  assert.equal(result.evidence.payload!.caseEvidence.length, 300);
  assert.equal(result.evidence.cleanup.pendingCleanupCount, 0);
  validateArenaPa7FormalEvidenceV1(
    JSON.parse((await readFile(result.publishedPath!, 'utf8')).trim()),
  );
});

test('PA7 derives CPU/heap gates from validated aggregate at exact contract budgets', async (t) => {
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const runWithPayload = async (basename: string, payload: ArenaPa7FormalRunPayloadV1) => (
    runArenaPa7FormalEvidenceV1(
      runOptions(directory, basename),
      baseDependencies({
        runWorker: () => Object.freeze({
          payload,
          progress: payload.progressFinal,
          cleanup: zeroWorkerCleanup(),
        }),
        publish: () => Object.freeze({
          temporaryPathsCreated: 2,
          temporaryPathsRemoved: 2,
          cleanupErrors: Object.freeze([]),
        }),
      }),
    )
  );

  const atBudgetPayload = payloadWithPerformance({
    p95MicrosPerTick: ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK,
    heapDeltaBytes: ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES,
  });
  const atBudget = await runWithPayload('budget-exact.json', atBudgetPayload);
  assert.equal(atBudget.evidence.status, 'formal-passed');
  assert.equal(atBudget.evidence.gates.find(({ id }) => id === 'cpu-budget')!.passed, true);
  assert.equal(atBudget.evidence.gates.find(({ id }) => id === 'heap-budget')!.passed, true);

  const lowerCpu = await runWithPayload('budget-exact.json', payloadWithPerformance({
    p95MicrosPerTick: ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK - 1,
    heapDeltaBytes: ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES,
  }));
  assert.notEqual(
    lowerCpu.evidence.gates.find(({ id }) => id === 'cpu-budget')!.evidenceHash,
    atBudget.evidence.gates.find(({ id }) => id === 'cpu-budget')!.evidenceHash,
  );

  const cpuOver = await runWithPayload('budget-cpu-over.json', payloadWithPerformance({
    p95MicrosPerTick: ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK + 1,
  }));
  assert.equal(cpuOver.evidence.status, 'formal-failed');
  assert.equal(cpuOver.evidence.failure!.kind, 'cpu-limit');
  assert.equal(cpuOver.evidence.failure!.phase, 'aggregate');

  const heapOver = await runWithPayload('budget-heap-over.json', payloadWithPerformance({
    heapDeltaBytes: ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES + 1,
  }));
  assert.equal(heapOver.evidence.status, 'formal-failed');
  assert.equal(heapOver.evidence.failure!.kind, 'heap-limit');
  assert.equal(heapOver.evidence.failure!.phase, 'aggregate');

  const negativeHeap = await runWithPayload('budget-negative-heap.json', payloadWithPerformance({
    heapDeltaBytes: -1,
  }));
  assert.equal(negativeHeap.evidence.status, 'formal-passed');
  assert.equal(negativeHeap.evidence.gates.find(({ id }) => id === 'heap-budget')!.passed, true);
});

test('PA7 orchestration fails closed for dirty source, source drift and build/environment drift', async (t) => {
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  let workerCalls = 0;
  const dirty = await runArenaPa7FormalEvidenceV1(
    runOptions(directory, 'dirty.json'),
    baseDependencies({
      captureSource: () => sourceSnapshot({ dirty: true }),
      runWorker: () => {
        workerCalls += 1;
        throw new Error('must not run');
      },
    }),
  );
  assert.equal(dirty.evidence.failure!.kind, 'source-dirty');
  assert.equal(workerCalls, 0);

  let sourceReads = 0;
  const drift = await runArenaPa7FormalEvidenceV1(
    runOptions(directory, 'source-drift.json'),
    baseDependencies({
      captureSource: () => sourceSnapshot({
        fingerprint: sourceReads++ === 0 ? '2'.repeat(64) : '8'.repeat(64),
      }),
    }),
  );
  assert.equal(drift.evidence.failure!.kind, 'source-drift');
  assert.equal(drift.evidence.status, 'formal-failed');

  let buildReads = 0;
  const buildDrift = await runArenaPa7FormalEvidenceV1(
    runOptions(directory, 'build-drift.json'),
    baseDependencies({
      captureBuild: () => buildIdentity(buildReads++ === 0 ? 'build-before' : 'build-after'),
    }),
  );
  assert.equal(buildDrift.evidence.failure!.kind, 'build-unattested');
  assert.equal(buildDrift.evidence.failure!.phase, 'preflight');

  let environmentReads = 0;
  const environmentDrift = await runArenaPa7FormalEvidenceV1(
    runOptions(directory, 'environment-drift.json'),
    baseDependencies({
      captureEnvironment: () => environmentIdentity(
        environmentReads++ === 0 ? 'cpu-before' : 'cpu-after',
      ),
    }),
  );
  assert.equal(environmentDrift.evidence.failure!.kind, 'build-unattested');

  let lockMismatchWorkerCalls = 0;
  const lockMismatchOptions = runOptions(directory, 'lock-mismatch.json');
  const lockMismatch = await runArenaPa7FormalEvidenceV1({
    ...lockMismatchOptions,
    buildAttestation: { ...lockMismatchOptions.buildAttestation, packageLockHash: 'b'.repeat(64) },
  }, baseDependencies({
    runWorker: () => {
      lockMismatchWorkerCalls += 1;
      throw new Error('must not run with lock mismatch');
    },
  }));
  assert.equal(lockMismatch.evidence.failure!.kind, 'build-unattested');
  assert.equal(lockMismatchWorkerCalls, 0);

  const contentMismatchOptions = runOptions(directory, 'content-mismatch.json');
  const contentMismatch = await runArenaPa7FormalEvidenceV1({
    ...contentMismatchOptions,
    buildAttestation: { ...contentMismatchOptions.buildAttestation, contentSelectionHash: 'eeeeeeee' },
  }, baseDependencies());
  assert.equal(contentMismatch.evidence.failure!.kind, 'build-unattested');
});

test('PA7 supplied failed gates retain a contract-legal stable failure phase', async (t) => {
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const options = runOptions(directory, 'failed-gate.json');
  const gates = options.gateAttestation.map((gate, index) => index === 0 ? {
    ...gate,
    passed: false,
    failureReason: 'source-dirty' as const,
  } : gate);
  const result = await runArenaPa7FormalEvidenceV1({ ...options, gateAttestation: gates }, baseDependencies());
  assert.equal(result.evidence.failure!.kind, 'source-dirty');
  assert.equal(result.evidence.failure!.phase, 'preflight');
  validateArenaPa7FormalEvidenceV1(result.evidence);
});

function failureProgress(completedCases: number): ArenaPa7FormalProgressV1 {
  if (completedCases === 300) {
    return Object.freeze({
      runToken: TEST_RUN_TOKEN,
      sequence: 999,
      completedCases,
      currentCaseIndex: null,
      currentCaseId: null,
      currentPass: null,
      currentTick: null,
      lastCommittedCaseEvidenceHash: '9'.repeat(64),
    });
  }
  return Object.freeze({
    runToken: TEST_RUN_TOKEN,
    sequence: completedCases + 1,
    completedCases,
    currentCaseIndex: completedCases,
    currentCaseId: `formal-survival-bot-${String(completedCases).padStart(3, '0')}`,
    currentPass: completedCases === 0 ? 1 : 2,
    currentTick: completedCases === 0 ? 0 : 1_200,
    lastCommittedCaseEvidenceHash: completedCases === 0 ? null : '9'.repeat(64),
  });
}

test('PA7 first/middle/final failures retain exact case location and never publish passed', async (t) => {
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  for (const completedCases of [0, 150, 300]) {
    const progress = failureProgress(completedCases);
    const cleanup = zeroWorkerCleanup();
    const result = await runArenaPa7FormalEvidenceV1(
      runOptions(directory, `failed-${completedCases}.json`),
      baseDependencies({
        runWorker: () => {
          throw new ArenaPa7FormalWorkerFailureV1({
            kind: 'case-execution',
            phase: completedCases === 0 ? 'run-first' : 'run-second',
            progress,
            cleanup,
            primaryCause: new Error(`case ${completedCases} failed`),
          });
        },
      }),
    );
    assert.equal(result.evidence.status, 'formal-failed');
    assert.equal(result.evidence.failure!.completedCases, completedCases);
    assert.equal(result.evidence.failure!.currentCaseIndex, progress.currentCaseIndex);
    assert.equal(result.evidence.failure!.lastCommittedCaseEvidenceHash, progress.lastCommittedCaseEvidenceHash);
    assert.equal(result.evidence.gates.some(({ passed }) => passed), false);
  }
});

test('PA7 preserves the primary error together with destroy cleanup errors', async (t) => {
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const progress = failureProgress(150);
  const cleanup: ArenaPa7FormalWorkerCleanupV1 = Object.freeze({
    childProcessesStarted: 1,
    childProcessesExited: 0,
    termSignalsSent: 1,
    killSignalsSent: 1,
    temporaryPathsCreated: 1,
    temporaryPathsRemoved: 0,
    pendingCleanupCount: 2,
    cleanupErrors: Object.freeze(['Error: destroy failed']),
  });
  const result = await runArenaPa7FormalEvidenceV1(
    runOptions(directory, 'primary-plus-cleanup.json'),
    baseDependencies({
      runWorker: () => {
        throw new ArenaPa7FormalWorkerFailureV1({
          kind: 'case-execution',
          phase: 'run-second',
          progress,
          cleanup,
          primaryCause: new AggregateError(
            [new Error('primary case failure'), new Error('destroy failed')],
            'primary and cleanup',
          ),
        });
      },
    }),
  );
  assert.equal(result.evidence.failure!.kind, 'case-execution');
  assert.deepEqual(result.evidence.failure!.cleanupErrors, ['Error: destroy failed']);
  assert.equal(result.evidence.cleanup.pendingCleanupCount, 2);
  assert.equal(result.evidence.cleanup.cleanupErrorCount, 1);
});

test('PA7 orchestration rejects hostile throwable/thenable results without executing traps or then', async (t) => {
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  let trapReads = 0;
  const hostileThrowable = new Proxy({}, {
    get() {
      trapReads += 1;
      throw new Error('must not read throwable');
    },
    getPrototypeOf() {
      trapReads += 1;
      throw new Error('must not inspect throwable prototype');
    },
  });
  const thrown = await runArenaPa7FormalEvidenceV1(
    runOptions(directory, 'hostile-throwable.json'),
    baseDependencies({ runWorker: () => { throw hostileThrowable; } }),
  );
  assert.equal(thrown.evidence.status, 'formal-failed');
  assert.equal(thrown.evidence.failure!.kind, 'case-validation');
  assert.equal(trapReads, 0);

  let thenCalls = 0;
  const thenable = {
    then() {
      thenCalls += 1;
    },
  };
  const rejectedThenable = await runArenaPa7FormalEvidenceV1(
    runOptions(directory, 'hostile-thenable.json'),
    baseDependencies({ runWorker: () => thenable as never }),
  );
  assert.equal(rejectedThenable.evidence.status, 'formal-failed');
  assert.equal(rejectedThenable.evidence.failure!.kind, 'case-validation');
  assert.equal(thenCalls, 0);
});

test('PA7 strict worker rejects extra stdout and any stderr', async (t) => {
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const extraStdout = path.join(directory, 'extra-stdout.mjs');
  const stderr = path.join(directory, 'stderr.mjs');
  await writeFile(extraStdout, 'process.stdout.write("{}\\n{}\\n");\n');
  await writeFile(stderr, 'process.stderr.write("unexpected\\n");\n');
  const options = (script: string) => ({
    command: process.execPath,
    args: [script],
    cwd: process.cwd(),
    temporaryDirectory: directory,
    runToken: TEST_RUN_TOKEN,
    inactivityTimeoutMs: 1_000,
    outputCapBytes: 10_000,
    progressPollMs: 10,
    termGraceMs: 50,
    killWaitMs: 500,
  });
  await assert.rejects(
    runArenaPa7StrictJsonWorkerV1(options(extraStdout)),
    (error: unknown) => error instanceof ArenaPa7FormalWorkerFailureV1
      && error.kind === 'case-validation',
  );
  await assert.rejects(
    runArenaPa7StrictJsonWorkerV1(options(stderr)),
    (error: unknown) => error instanceof ArenaPa7FormalWorkerFailureV1
      && error.kind === 'case-execution',
  );
});

test('PA7 progress fd capture retries one ordinary supersede but bounds churn and rejects symlinks', async (t) => {
  if (process.platform === 'win32') {
    t.skip('O_NOFOLLOW and POSIX atomic replacement assertion');
    return;
  }
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const workerPath = path.join(directory, 'progress-race-worker.mjs');
  await writeFile(workerPath, [
    'import { renameSync, writeFileSync } from "node:fs";',
    'const progress={runToken:process.env.ARENA_PA7_RUN_TOKEN,sequence:1,completedCases:0,currentCaseIndex:0,currentCaseId:"formal-survival-bot-000",currentPass:1,currentTick:1,lastCommittedCaseEvidenceHash:null};',
    'writeFileSync(`${process.env.ARENA_PA7_PROGRESS_PATH}.tmp`,`${JSON.stringify(progress)}\\n`);',
    'renameSync(`${process.env.ARENA_PA7_PROGRESS_PATH}.tmp`,process.env.ARENA_PA7_PROGRESS_PATH);',
    'process.on("SIGTERM",()=>{});',
    'setInterval(()=>{},1000);',
  ].join('\n'));
  const options = () => ({
    command: process.execPath,
    args: [workerPath],
    cwd: process.cwd(),
    temporaryDirectory: directory,
    runToken: TEST_RUN_TOKEN,
    // This test controls the read race itself; process startup is not a performance assertion.
    inactivityTimeoutMs: 5_000,
    outputCapBytes: 10_000,
    progressPollMs: 5,
    termGraceMs: 1,
    killWaitMs: 500,
  });

  const outside = path.join(directory, 'outside-progress.json');
  await writeFile(outside, `${JSON.stringify(sampledProgress({ sequence: 1, currentTick: 1 }))}\n`);
  let replacedWithSymlink = false;
  await assert.rejects(runArenaPa7StrictJsonWorkerV1({
    ...options(),
    progressReadHooks: {
      afterPathBefore(progressPath) {
        if (replacedWithSymlink) return;
        const candidate = `${progressPath}.controlled-symlink`;
        symlinkSync(outside, candidate);
        renameSync(candidate, progressPath);
        replacedWithSymlink = true;
      },
    },
  }), (error: unknown) => error instanceof ArenaPa7FormalWorkerFailureV1
    && error.kind === 'progress-invalid');
  assert.equal(replacedWithSymlink, true);

  const replacement = path.join(directory, 'replacement-progress.json');
  writeFileSync(replacement, `${JSON.stringify(sampledProgress({ sequence: 1, currentTick: 1 }))}\n`);
  let replacedAfterRead = false;
  let acceptedReplacement = false;
  await assert.rejects(runArenaPa7StrictJsonWorkerV1({
    ...options(),
    progressReadHooks: {
      afterDescriptorRead(progressPath) {
        if (replacedAfterRead) return;
        linkSync(replacement, `${progressPath}.controlled-inode`);
        renameSync(`${progressPath}.controlled-inode`, progressPath);
        replacedAfterRead = true;
      },
      afterProgressAccepted() {
        acceptedReplacement = true;
        throw new Error('PA7 test stop after accepted replacement progress.');
      },
    },
  }), (error: unknown) => error instanceof ArenaPa7FormalWorkerFailureV1
    && error.kind === 'progress-invalid'
    && error.progress.sequence === 1
    && error.progress.currentTick === 1);
  assert.equal(replacedAfterRead, true);
  assert.equal(acceptedReplacement, true);

  let changedCtimeOnce = false;
  let acceptedAfterCtimeRetry = false;
  await assert.rejects(runArenaPa7StrictJsonWorkerV1({
    ...options(),
    progressReadHooks: {
      afterPathBefore(progressPath) {
        if (changedCtimeOnce) return;
        chmodSync(progressPath, 0o400);
        changedCtimeOnce = true;
      },
      afterProgressAccepted() {
        acceptedAfterCtimeRetry = true;
        throw new Error('PA7 test stop after accepted ctime-retry progress.');
      },
    },
  }), (error: unknown) => error instanceof ArenaPa7FormalWorkerFailureV1
    && error.kind === 'progress-invalid'
    && error.progress.sequence === 1
    && error.progress.currentTick === 1);
  assert.equal(changedCtimeOnce, true);
  assert.equal(acceptedAfterCtimeRetry, true);

  let ctimeChurnCount = 0;
  await assert.rejects(runArenaPa7StrictJsonWorkerV1({
    ...options(),
    progressReadHooks: {
      afterPathBefore(progressPath) {
        chmodSync(progressPath, ctimeChurnCount % 2 === 0 ? 0o400 : 0o600);
        ctimeChurnCount += 1;
      },
    },
  }), (error: unknown) => error instanceof ArenaPa7FormalWorkerFailureV1
    && error.kind === 'progress-invalid'
    && /持续替换|稳定样本/i.test(error.message));
  assert.equal(ctimeChurnCount, 3);

  const churnCandidates = Array.from({ length: 3 }, (_, index) => {
    const candidate = path.join(directory, `prebuilt-progress-churn-${index}.json`);
    writeFileSync(candidate, `${JSON.stringify(sampledProgress({ sequence: 1, currentTick: 1 }))}\n`);
    return candidate;
  });
  let churnCount = 0;
  await assert.rejects(runArenaPa7StrictJsonWorkerV1({
    ...options(),
    progressReadHooks: {
      afterDescriptorRead(progressPath) {
        const candidate = churnCandidates[churnCount]!;
        churnCount += 1;
        renameSync(candidate, progressPath);
      },
    },
  }), (error: unknown) => error instanceof ArenaPa7FormalWorkerFailureV1
    && error.kind === 'progress-invalid'
    && /持续替换|稳定样本/i.test(error.message));
  assert.equal(churnCount, 3);
});

test('PA7 child close performs a required final progress reread after the last atomic replace', async (t) => {
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const payloadPath = path.join(directory, 'payload.json');
  const progressAckPath = path.join(directory, 'progress.ack');
  const workerPath = path.join(directory, 'final-progress-worker.mjs');
  await writeFile(payloadPath, JSON.stringify(validPayload()));
  await writeFile(workerPath, [
    'import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";',
    'const payload=JSON.parse(readFileSync(process.argv[2],"utf8"));',
    'const progressPath=process.env.ARENA_PA7_PROGRESS_PATH;',
    'const sleeper=new Int32Array(new SharedArrayBuffer(4));',
    'let sequence=0;',
    'for(let completedCases=1;completedCases<=300;completedCases+=1){',
    '  sequence+=5002;',
    '  const final=completedCases===300;',
    '  const progress={runToken:process.env.ARENA_PA7_RUN_TOKEN,sequence,completedCases,currentCaseIndex:final?null:completedCases,currentCaseId:final?null:`formal-survival-bot-${String(completedCases).padStart(3,"0")}`,currentPass:final?null:1,currentTick:final?null:0,lastCommittedCaseEvidenceHash:payload.caseEvidence[completedCases-1].caseEvidenceHash};',
    '  writeFileSync(`${progressPath}.tmp`,`${JSON.stringify(progress)}\\n`);',
    '  renameSync(`${progressPath}.tmp`,progressPath);',
    '  while(!final&&(!existsSync(process.argv[3])||readFileSync(process.argv[3],"utf8")!==String(completedCases)))Atomics.wait(sleeper,0,0,1);',
    '}',
    'process.stdout.write(`${JSON.stringify(payload)}\\n`);',
  ].join('\n'));

  const result = await runArenaPa7StrictJsonWorkerV1({
    command: process.execPath,
    args: [workerPath, payloadPath, progressAckPath],
    cwd: process.cwd(),
    temporaryDirectory: directory,
    runToken: TEST_RUN_TOKEN,
    inactivityTimeoutMs: 1_000,
    outputCapBytes: 32 * 1_024 * 1_024,
    progressPollMs: 20,
    termGraceMs: 50,
    killWaitMs: 500,
    progressReadHooks: {
      afterProgressAccepted(progress) {
        writeFileSync(progressAckPath, String(progress.completedCases));
      },
    },
  });
  assert.deepEqual(result.progress, validPayload().progressFinal);
  assert.equal(result.cleanup.pendingCleanupCount, 0);
});

test('PA7 progress reader fails closed for partial JSON and wrong tokens', async (t) => {
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const makeWorker = async (basename: string, body: string): Promise<string> => {
    const workerPath = path.join(directory, basename);
    await writeFile(workerPath, [
      'import { writeFileSync } from "node:fs";',
      body,
      'setInterval(()=>{},1000);',
    ].join('\n'));
    return workerPath;
  };
  const partial = await makeWorker(
    'partial-progress.mjs',
    'writeFileSync(process.env.ARENA_PA7_PROGRESS_PATH,"{\\\"runToken\\\":");',
  );
  const wrongToken = await makeWorker(
    'wrong-token-progress.mjs',
    'writeFileSync(process.env.ARENA_PA7_PROGRESS_PATH,`${JSON.stringify({runToken:"wrong",sequence:1,completedCases:0,currentCaseIndex:0,currentCaseId:"formal-survival-bot-000",currentPass:1,currentTick:1,lastCommittedCaseEvidenceHash:null})}\\n`);',
  );
  const options = (workerPath: string) => ({
    command: process.execPath,
    args: [workerPath],
    cwd: process.cwd(),
    temporaryDirectory: directory,
    runToken: TEST_RUN_TOKEN,
    inactivityTimeoutMs: 1_000,
    outputCapBytes: 10_000,
    progressPollMs: 5,
    termGraceMs: 50,
    killWaitMs: 500,
  });
  for (const workerPath of [partial, wrongToken]) {
    await assert.rejects(
      runArenaPa7StrictJsonWorkerV1(options(workerPath)),
      (error: unknown) => error instanceof ArenaPa7FormalWorkerFailureV1
        && error.kind === 'progress-invalid',
    );
  }
});

test('PA7 progress watchdog rejects completed-case jumps instead of renewing inactivity', async (t) => {
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const workerPath = path.join(directory, 'jump-progress.mjs');
  await writeFile(workerPath, [
    'import { writeFileSync } from "node:fs";',
    'const progress={runToken:process.env.ARENA_PA7_RUN_TOKEN,sequence:2,completedCases:2,currentCaseIndex:2,currentCaseId:"formal-survival-bot-002",currentPass:1,currentTick:0,lastCommittedCaseEvidenceHash:"9".repeat(64)};',
    'writeFileSync(process.env.ARENA_PA7_PROGRESS_PATH,`${JSON.stringify(progress)}\\n`);',
    'setInterval(()=>{},1000);',
  ].join('\n'));
  await assert.rejects(runArenaPa7StrictJsonWorkerV1({
    command: process.execPath,
    args: [workerPath],
    cwd: process.cwd(),
    temporaryDirectory: directory,
    runToken: TEST_RUN_TOKEN,
    inactivityTimeoutMs: 1_000,
    outputCapBytes: 10_000,
    progressPollMs: 10,
    termGraceMs: 50,
    killWaitMs: 500,
  }), (error: unknown) => error instanceof ArenaPa7FormalWorkerFailureV1
    && error.kind === 'progress-invalid'
    && /不得跳 case/.test(error.message));
});

async function waitForProcessExit(pid: number): Promise<void> {
  const deadline = Date.now() + 1_000;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') return;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail(`process ${pid} remained alive`);
}

test('PA7 inactivity timeout TERM→KILL cleans the child and descendant process group', async (t) => {
  if (process.platform === 'win32') {
    t.skip('POSIX process-group assertion');
    return;
  }
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const workerPath = path.join(directory, 'stall-worker.mjs');
  const descendantPidPath = path.join(directory, 'descendant.pid');
  const descendantReadyPath = path.join(directory, 'descendant.ready');
  await writeFile(workerPath, [
    'import { spawn } from "node:child_process";',
    'import { existsSync, renameSync, writeFileSync } from "node:fs";',
    'const descendantCode="const {writeFileSync}=require(\\"node:fs\\");process.on(\\"SIGTERM\\",()=>{});writeFileSync(process.argv[1],\\"ready\\");setInterval(()=>{},1000)";',
    'const descendant=spawn(process.execPath,["-e",descendantCode,process.argv[3]],{stdio:"ignore"});',
    'process.on("SIGTERM",()=>{});',
    'const sleeper=new Int32Array(new SharedArrayBuffer(4));',
    'while(!existsSync(process.argv[3]))Atomics.wait(sleeper,0,0,1);',
    'writeFileSync(process.argv[2],String(descendant.pid));',
    'const progress={runToken:process.env.ARENA_PA7_RUN_TOKEN,sequence:1,completedCases:0,currentCaseIndex:0,currentCaseId:"formal-survival-bot-000",currentPass:1,currentTick:1,lastCommittedCaseEvidenceHash:null};',
    'writeFileSync(`${process.env.ARENA_PA7_PROGRESS_PATH}.tmp`,`${JSON.stringify(progress)}\\n`);',
    'renameSync(`${process.env.ARENA_PA7_PROGRESS_PATH}.tmp`,process.env.ARENA_PA7_PROGRESS_PATH);',
    'setInterval(()=>{},1000);',
  ].join('\n'));
  let failure: ArenaPa7FormalWorkerFailureV1 | null = null;
  try {
    await runArenaPa7StrictJsonWorkerV1({
      command: process.execPath,
      args: [workerPath, descendantPidPath, descendantReadyPath],
      cwd: process.cwd(),
      temporaryDirectory: directory,
      runToken: TEST_RUN_TOKEN,
      inactivityTimeoutMs: 2_000,
      outputCapBytes: 10_000,
      progressPollMs: 10,
      termGraceMs: 10,
      killWaitMs: 1_000,
    });
  } catch (error) {
    if (error instanceof ArenaPa7FormalWorkerFailureV1) failure = error;
    else throw error;
  }
  assert.ok(failure);
  assert.equal(failure.kind, 'timeout');
  assert.equal(failure.cleanup.childProcessesStarted, 1);
  assert.equal(failure.cleanup.childProcessesExited, 1);
  assert.equal(failure.cleanup.termSignalsSent, 1);
  assert.equal(failure.cleanup.killSignalsSent, 1);
  assert.equal(failure.progress.sequence, 1);
  assert.equal(failure.progress.completedCases, 0);
  assert.equal(failure.progress.currentCaseIndex, 0);
  assert.equal(failure.progress.currentCaseId, 'formal-survival-bot-000');
  assert.equal(failure.progress.currentPass, 1);
  assert.equal(failure.progress.currentTick, 1);
  assert.equal(failure.progress.lastCommittedCaseEvidenceHash, null);
  const descendantPid = Number(await readFile(descendantPidPath, 'utf8'));
  assert.ok(Number.isSafeInteger(descendantPid) && descendantPid > 1);
  await waitForProcessExit(descendantPid);
});

test('PA7 CLI parsing/config files and pre-publication failure keep stdout/stderr disciplined', async (t) => {
  const directory = await temporaryDirectory();
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const configPath = path.join(directory, 'config.json');
  const outputPath = path.join(directory, 'output.json');
  await writeFile(configPath, `${JSON.stringify(configuration())}\n`);
  assert.equal(readArenaPa7FormalGateConfigurationFileV1(configPath).schemaVersion, 1);
  assert.deepEqual(parseArenaPa7FormalGateCliV1([
    `--config=${configPath}`,
    `--output=${outputPath}`,
  ]), { configPath, outputPath });
  assert.throws(() => parseArenaPa7FormalGateCliV1([`--config=${configPath}`]), /必须且仅能/);
  assert.throws(() => parseArenaPa7FormalGateCliV1([
    `--config=${configPath}`,
    `--config=${configPath}`,
    `--output=${outputPath}`,
  ]), /不得重复/);

  const partial = path.join(directory, 'partial-config.json');
  await writeFile(partial, '{"schemaVersion":1');
  assert.throws(() => readArenaPa7FormalGateConfigurationFileV1(partial), /单行完整 JSON/);
  const linked = path.join(directory, 'linked-config.json');
  await symlink(configPath, linked);
  assert.throws(() => readArenaPa7FormalGateConfigurationFileV1(linked), /非符号链接/);

  const processResult = spawnSync(process.execPath, [
    '--import', 'tsx', 'scripts/arena-pa7-formal-gate.ts', '--unknown=value',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 5_000,
  });
  assert.equal(processResult.status, 1);
  assert.equal(processResult.stdout, '');
  assert.match(processResult.stderr, /^PA7 gate CLI 未知参数 --unknown。\n$/);
});
