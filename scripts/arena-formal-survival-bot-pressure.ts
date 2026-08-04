import assert from 'node:assert/strict';
import {
  closeSync,
  constants as fsConstants,
  fsyncSync,
  lstatSync,
  openSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import {
  BOT_PROFILE_REGISTRY,
} from '@number-strategy-jump/arena-bot';
import {
  ARENA_MATCH_EVENT,
  type ArenaAuthorityEvent,
  type ArenaReplay,
} from '@number-strategy-jump/arena-match';
import {
  createDeterministicDataHash,
  createNeutralInputFrame,
  EQUIPMENT_DESPAWN_REASON,
  type ArenaInputFrame,
  type WorldSnapshotV2,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV2SurvivalSupplyBotSession,
  readArenaV2SurvivalSupplyBotCompositionIdentity,
  type ArenaV2SurvivalSupplyBotCompositionIdentityV1,
} from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_READ_STEP_EVENT_TYPES,
  createArenaReadStepScheduleV2,
  readArenaFullAuditAtCurrentV2,
  runArenaReadStepV2,
} from './lib/arena-read-step-runner-v2.js';
import {
  ARENA_PA7_FORMAL_CONTRACT_ID,
  ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION,
  ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK,
  ARENA_PA7_FORMAL_DOUBLE_RUN_COUNT,
  ARENA_PA7_FORMAL_EQUIPMENT_DESPAWN_REASONS,
  ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES,
  ARENA_PA7_FORMAL_LOADER_ATTESTATION_HASH_FLAG,
  ARENA_PA7_FORMAL_PROGRESS_PATH_ENV,
  ARENA_PA7_FORMAL_REQUEST_V1,
  ARENA_PA7_FORMAL_REQUIRED_EVENT_TYPES,
  ARENA_PA7_FORMAL_RUN_TOKEN_ENV,
  ARENA_PA7_FORMAL_WORKER_FLAG,
  assertArenaPa7FormalCaseEvidenceMatchesDoubleRunSummaryV1,
  createArenaPa7FormalCaseEvidenceHashV1,
  createArenaPa7FormalDoubleRunSummaryV1,
  createArenaPa7FormalLifecycleBoundariesV1,
  createArenaPa7FormalRunSemanticHashV1,
  validateArenaPa7FormalCaseEvidenceV1,
  validateArenaPa7FormalProgressSequenceV1,
  validateArenaPa7FormalRunPayloadV1,
  type ArenaPa7FormalAggregateV1,
  type ArenaPa7FormalCaseCleanupV1,
  type ArenaPa7FormalCaseEvidenceV1,
  type ArenaPa7FormalCaseRunV1,
  type ArenaPa7FormalDoubleRunSummaryV1,
  type ArenaPa7FormalProgressV1,
  type ArenaPa7FormalResourcePeaksV1,
  type ArenaPa7FormalRunPayloadV1,
} from './lib/arena-pa7-formal-contract-v1.js';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import { parseArenaStressIntegerOptions } from './arena-stress-cli.js';
import {
  ARENA_PA6_READ_STEP_CASES_V1,
  ARENA_PA6_READ_STEP_HARD_LIMIT_TICKS,
  assertArenaPa6FixedCasesV1,
  requireArenaPa6ReadStepVariantV1,
  type ArenaPa6ReadStepVariantId,
} from './lib/arena-pa6-read-step-variants-v1.js';
import type { ArenaPa6LoaderAttestationV2 } from './lib/arena-pa6-source-transform-register-v2.js';

export const ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_MANIFEST_ID =
  'arena.p1.formal-survival-bot-pressure.v1';
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
export const ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS = Object.freeze({
  caseCount: 300,
  uniqueSeedCount: 120,
  hardLimitTicks: 2_500,
  cpuBudgetMsPerTick: ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK / 1_000,
  heapGrowthBudgetBytes: ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES,
  maximumWorldEquipmentCount: 3,
  maximumActiveSupplyCount: 3,
  maximumEventsPerTick: 10,
  minimumUniqueFinalHashes: 120,
});

const SEED_BASE = 0x6b000000;
export const ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PARTICIPANT_IDS = Object.freeze([
  'player-1', 'player-2',
] as const);
export const ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PROFILE_IDS = Object.freeze([
  'easy', 'normal', 'hard',
] as const);
export const ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PROFILE_DEFINITIONS = Object.freeze([
  ...BOT_PROFILE_REGISTRY.list(),
]);
export const ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_INPUT_PLANS = Object.freeze([
  Object.freeze({ id: 'neutral', movement: 'neutral', action: 'contested-primary' }),
  Object.freeze({ id: 'left-contest', movement: 'left', action: 'contested-primary' }),
  Object.freeze({ id: 'center-contest', movement: 'center-zigzag', action: 'contested-primary' }),
  Object.freeze({ id: 'right-contest', movement: 'right', action: 'contested-primary' }),
  Object.freeze({ id: 'zigzag', movement: 'zigzag', action: 'contested-primary' }),
  Object.freeze({ id: 'jump-cycle', movement: 'alternating', action: 'contested-primary' }),
] as const);
export const ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PLAN_IDS = Object.freeze([
  'neutral',
  'left-contest',
  'center-contest',
  'right-contest',
  'zigzag',
  'jump-cycle',
] as const);
export const ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PAUSE_BOUNDARY_TICKS = Object.freeze([
  null,
  1_199,
  1_200,
  1_201,
  1_799,
  1_800,
  1_801,
  2_399,
  2_400,
  2_401,
] as const);
export const ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_REQUIRED_EVENT_TYPES = Object.freeze([
  ARENA_MATCH_EVENT.MATCH_STARTED,
  ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED,
  ARENA_MATCH_EVENT.EQUIPMENT_DROPPED,
  ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP,
  ARENA_MATCH_EVENT.EQUIPMENT_REPLACED,
  ARENA_MATCH_EVENT.EQUIPMENT_RECYCLED,
  ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED,
  ARENA_MATCH_EVENT.ACTION_STARTED,
  ARENA_MATCH_EVENT.HIT_RESOLVED,
  ARENA_MATCH_EVENT.KNOCKBACK_APPLIED,
  ARENA_MATCH_EVENT.PLAYER_ELIMINATED,
  ARENA_MATCH_EVENT.PLAYER_RESPAWNED,
  ARENA_MATCH_EVENT.SUDDEN_DEATH_STARTED,
  ARENA_MATCH_EVENT.MATCH_ENDED,
] as const);
export const ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_REQUIRED_EQUIPMENT_DESPAWN_REASONS = Object.freeze([
  EQUIPMENT_DESPAWN_REASON.EXPIRED_HELD_LIFECYCLE,
] as const);

export const ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_ARENA = Object.freeze({
  killY: -4,
  surfaces: Object.freeze([Object.freeze({
    id: 'formal-survival-bot-platform',
    center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
    halfExtents: Object.freeze({ x: 4, y: 0.5, z: 4 }),
  })]),
  spawns: Object.freeze([
    Object.freeze({ x: -1, y: 1, z: 0 }),
    Object.freeze({ x: 1, y: 1, z: 0 }),
  ]),
});

export const ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_SUPPLY = Object.freeze({
  supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
  spawnSpecs: Object.freeze([
    Object.freeze({
      slotId: 'left',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
      spawnId: 'formal-survival-bot-left',
      position: Object.freeze({ x: -3, y: 1, z: 0 }),
    }),
    Object.freeze({
      slotId: 'center',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
      spawnId: 'formal-survival-bot-center',
      position: Object.freeze({ x: 0, y: 1, z: 0 }),
    }),
    Object.freeze({
      slotId: 'right',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
      spawnId: 'formal-survival-bot-right',
      position: Object.freeze({ x: 3, y: 1, z: 0 }),
    }),
  ]),
});

export interface FormalSurvivalBotCase {
  readonly caseId: string;
  readonly caseIdentity: string;
  readonly seed: number;
  readonly difficultyId: (typeof ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PROFILE_IDS)[number];
  readonly inputPlanId: (typeof ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PLAN_IDS)[number];
  readonly pauseAtTick: number | null;
  readonly playerParticipantId: 'player-1' | 'player-2';
  readonly botParticipantId: 'player-1' | 'player-2';
}

export interface FormalSurvivalBotPressureManifest {
  readonly manifestId: string;
  readonly caseCount: number;
  readonly uniqueSeedCount: number;
  readonly hardLimitTicks: number;
  readonly definition: typeof ARENA_V2_SURVIVAL_SUPPLY_DEFINITION;
  readonly arena: typeof ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_ARENA;
  readonly supply: typeof ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_SUPPLY;
  readonly configTemplate: Readonly<Record<string, unknown>>;
  readonly profiles: ReturnType<typeof BOT_PROFILE_REGISTRY.list>;
  readonly profileIds: readonly string[];
  readonly inputPlans: typeof ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_INPUT_PLANS;
  readonly inputPlanIds: readonly string[];
  readonly pauseBoundaryTicks: readonly (number | null)[];
  readonly cases: readonly FormalSurvivalBotCase[];
}

export interface FormalSurvivalBotManifestInspection {
  readonly requestedCaseCount: number;
  readonly requestedUniqueSeedCount: number;
  readonly actualCaseCount: number;
  readonly actualUniqueSeedCount: number;
  readonly uniqueCaseIdentityCount: number;
  readonly duplicateCaseIdentities: readonly string[];
}

interface FormalSurvivalBotRunTrace {
  readonly inputFrames: readonly ArenaInputFrame[];
  readonly events: readonly ArenaAuthorityEvent[];
  readonly publicSnapshotHashes: readonly string[];
  readonly checkpointHashes: readonly string[];
  readonly finalHash: string;
  readonly result: ArenaReplay['result'];
  readonly finalTick: number;
  readonly totalEvents: number;
  readonly maximumWorldEquipmentCount: number;
  readonly maximumRuntimeCount: number;
  readonly maximumActiveSupplyCount: number;
  readonly maximumEventsPerTick: number;
  readonly pauseSteps: number;
  readonly pauseAtTick: number | null;
  readonly pausePreservedTick: number | null;
  readonly pauseRecoveryTick: number | null;
  readonly cpuMsPerTick: number;
  readonly cpuMicros: number;
  readonly processCpuMicros: number;
  readonly eventTypeCounts: Readonly<Record<string, number>>;
  readonly equipmentDespawnReasonCounts: Readonly<Record<string, number>>;
  readonly spawnCountsByTick: Readonly<Record<string, number>>;
  readonly spawnTicks: readonly number[];
  readonly boundarySnapshots: readonly FormalSurvivalBotBoundarySnapshot[];
  readonly compositionIdentity: ArenaV2SurvivalSupplyBotCompositionIdentityV1;
  readonly pa7Run: ArenaPa7FormalCaseRunV1 | null;
}

interface FormalSurvivalBotPa7CaptureV1 {
  readonly caseIndex: number;
  readonly onAuthorityTick?: (tick: number) => void;
}

export interface FormalSurvivalBotBoundarySnapshot {
  readonly tick: number;
  readonly equipmentTotalCount: number;
  readonly equipmentWorldCount: number;
  readonly supplyCount: number;
  readonly remainingTicks: readonly number[];
  readonly resyncReadiness: string | null;
  readonly pendingAuthorityTick: number | null;
  readonly pendingExpiryEquipmentInstanceIds: readonly string[];
}

export interface FormalSurvivalBotCaseResult {
  readonly caseId: string;
  readonly caseIdentity: string;
  readonly seed: number;
  readonly difficultyId: string;
  readonly inputPlanId: string;
  readonly traceHash: string;
  readonly finalHash: string;
  readonly finalTick: number;
  readonly totalEvents: number;
  readonly maximumWorldEquipmentCount: number;
  readonly maximumRuntimeCount: number;
  readonly maximumActiveSupplyCount: number;
  readonly maximumEventsPerTick: number;
  readonly pauseSteps: number;
  readonly pauseAtTick: number | null;
  readonly pausePreservedTick: number | null;
  readonly pauseRecoveryTick: number | null;
  readonly cpuMsPerTick: number;
  readonly cpuTotalMicros: number;
  readonly cpuMicrosPerTickSamples: readonly number[];
  readonly processCpuTotalMicros: number;
  readonly processCpuMicrosPerTickSamples: readonly number[];
  readonly eventTypeCounts: Readonly<Record<string, number>>;
  readonly equipmentDespawnReasonCounts: Readonly<Record<string, number>>;
  readonly spawnCountsByTick: Readonly<Record<string, number>>;
  readonly spawnTicks: readonly number[];
  readonly boundarySnapshots: readonly FormalSurvivalBotBoundarySnapshot[];
  readonly compositionIdentity: ArenaV2SurvivalSupplyBotCompositionIdentityV1;
  readonly pa7DoubleRunSummary: ArenaPa7FormalDoubleRunSummaryV1 | null;
  readonly pa7CaseEvidence: ArenaPa7FormalCaseEvidenceV1 | null;
}

export interface ArenaPa6PercentilesV2 {
  readonly sampleCount: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
}

export interface ArenaPa6FormalReadStepRoundV2 {
  readonly schemaVersion: 2;
  readonly variantId: ArenaPa6ReadStepVariantId;
  readonly loaderAttestation: ArenaPa6LoaderAttestationV2;
  readonly caseSetIdentity: string;
  readonly parityIdentity: string;
  readonly caseCount: 20;
  readonly uniqueSeedCount: 20;
  readonly hardLimitTicks: 2_500;
  readonly doubleRunsPerCase: 2;
  readonly denominatorTicks: number;
  readonly selfCpuMicros: ArenaPa6PercentilesV2;
  readonly inclusiveCpuMicros: ArenaPa6PercentilesV2;
  readonly inclusiveWallMicros: ArenaPa6PercentilesV2;
  readonly processCpu: Readonly<{
    readonly userMicros: number;
    readonly systemMicros: number;
    readonly totalMicros: number;
    readonly microsPerTick: number;
  }>;
  readonly counts: Readonly<{
    readonly scheduledFullAudits: number;
    readonly sessionsCreated: number;
    readonly sessionsDestroyed: number;
    readonly completedCases: number;
  }>;
  readonly gc: Readonly<{
    readonly exposed: boolean;
    readonly forcedCollections: number;
  }>;
  readonly resources: Readonly<{
    readonly maximumWorldEquipmentCount: number;
    readonly maximumRuntimeCount: number;
    readonly maximumActiveSupplyCount: number;
    readonly maximumEventsPerTick: number;
    readonly heapBeforeBytes: number;
    readonly heapAfterBytes: number;
    readonly heapDeltaBytes: number;
  }>;
  readonly cases: readonly Readonly<{
    readonly caseId: string;
    readonly caseIdentity: string;
    readonly seed: number;
    readonly traceHash: string;
    readonly finalHash: string;
    readonly finalTick: number;
    readonly totalEvents: number;
  }>[];
}

interface ArenaPa6ReadStepMeasurementCollectorV2 {
  readonly selfCpuMicros: number[];
  readonly inclusiveCpuMicros: number[];
  readonly inclusiveWallMicros: number[];
  scheduledFullAudits: number;
  sessionsCreated: number;
  sessionsDestroyed: number;
}

function assertFinite(value: unknown, name = 'formal survival Bot snapshot'): void {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new RangeError(`${name} 包含非有限数。`);
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertFinite(child, `${name}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assertFinite(child, `${name}.${key}`);
  }
}

function publicSnapshotProjection(snapshot: WorldSnapshotV2): Readonly<Record<string, unknown>> {
  return {
    tick: snapshot.tick,
    eventSequence: snapshot.eventSequence,
    phase: snapshot.phase,
    participants: snapshot.participants,
    equipment: snapshot.equipment,
    activeSupplyProjection: snapshot.activeSupplyProjection,
  };
}

function publicSnapshotHash(snapshot: WorldSnapshotV2): string {
  return createDeterministicDataHash(
    publicSnapshotProjection(snapshot),
    'formal survival Bot public snapshot projection',
  );
}

function countEvents(events: readonly ArenaAuthorityEvent[]): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const event of events) counts[event.type] = (counts[event.type] ?? 0) + 1;
  return Object.freeze(Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  ));
}

function countEquipmentDespawnReasons(
  events: readonly ArenaAuthorityEvent[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const event of events) {
    if (event.type !== ARENA_MATCH_EVENT.EQUIPMENT_DESPAWNED) continue;
    const reason = event.reason;
    if (typeof reason !== 'string') continue;
    counts[reason] = (counts[reason] ?? 0) + 1;
  }
  return Object.freeze(Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  ));
}

function countEquipmentSpawnsByTick(
  events: readonly ArenaAuthorityEvent[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const event of events) {
    if (event.type !== ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED) continue;
    const key = String(event.tick);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.freeze(Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => Number(left) - Number(right)),
  ));
}

export function hasFormalSurvivalBotCaseSpawnCoverage(
  spawnCountsByTick: Readonly<Record<string, number>>,
): boolean {
  return spawnCountsByTick[String(1_200)] === 3
    && spawnCountsByTick[String(2_400)] === 3;
}

function boundarySnapshot(snapshot: WorldSnapshotV2): FormalSurvivalBotBoundarySnapshot {
  const projection = snapshot.activeSupplyProjection;
  return Object.freeze({
    tick: snapshot.tick,
    equipmentTotalCount: snapshot.equipment.length,
    equipmentWorldCount: snapshot.equipment.filter(({ locationState }) => (
      locationState === 'spawned' || locationState === 'dropped'
    )).length,
    supplyCount: projection?.supplies.length ?? 0,
    remainingTicks: Object.freeze(
      (projection?.supplies ?? []).map(({ remainingTicks }) => remainingTicks),
    ),
    resyncReadiness: projection?.resyncReadiness ?? null,
    pendingAuthorityTick: projection?.pendingAuthorityTick ?? null,
    pendingExpiryEquipmentInstanceIds: Object.freeze(
      [...(projection?.pendingExpiryEquipmentInstanceIds ?? [])],
    ),
  });
}

function assertBoundarySemantics(snapshot: WorldSnapshotV2): void {
  if (![1_199, 1_200, 1_201, 1_799, 1_800, 1_801, 2_399, 2_400, 2_401]
    .includes(snapshot.tick)) return;
  const boundary = boundarySnapshot(snapshot);
  assert.ok(boundary.remainingTicks.every((value) => value > 0));
  if (snapshot.tick === 1_199 || snapshot.tick === 1_200) {
    assert.equal(boundary.supplyCount, 0);
    assert.equal(boundary.resyncReadiness, 'ready');
    assert.equal(boundary.pendingAuthorityTick, null);
    assert.deepEqual(boundary.pendingExpiryEquipmentInstanceIds, []);
  } else if (snapshot.tick === 1_201) {
    assert.equal(boundary.resyncReadiness, 'ready');
    assert.equal(boundary.pendingAuthorityTick, null);
    assert.deepEqual(boundary.pendingExpiryEquipmentInstanceIds, []);
    assert.ok(boundary.remainingTicks.every((value) => value === 599));
  } else if (snapshot.tick === 1_799) {
    assert.equal(boundary.resyncReadiness, 'ready');
    assert.equal(boundary.pendingAuthorityTick, null);
    assert.deepEqual(boundary.pendingExpiryEquipmentInstanceIds, []);
    assert.ok(boundary.remainingTicks.every((value) => value === 1));
  } else if (snapshot.tick === 1_800) {
    assert.equal(boundary.supplyCount, 0);
    if (boundary.pendingExpiryEquipmentInstanceIds.length > 0) {
      assert.equal(boundary.resyncReadiness, 'not-ready-pre-expiry');
      assert.equal(boundary.pendingAuthorityTick, 1_800);
    } else {
      assert.equal(boundary.resyncReadiness, 'ready');
      assert.equal(boundary.pendingAuthorityTick, null);
    }
    assert.deepEqual(boundary.remainingTicks, []);
  } else if (snapshot.tick === 1_801) {
    assert.equal(boundary.resyncReadiness, 'ready');
    assert.equal(boundary.pendingAuthorityTick, null);
    assert.deepEqual(boundary.pendingExpiryEquipmentInstanceIds, []);
    assert.deepEqual(boundary.remainingTicks, []);
  } else if (snapshot.tick === 2_399 || snapshot.tick === 2_400) {
    assert.equal(boundary.supplyCount, 0);
    assert.equal(boundary.resyncReadiness, 'ready');
    assert.equal(boundary.pendingAuthorityTick, null);
    assert.deepEqual(boundary.pendingExpiryEquipmentInstanceIds, []);
  } else if (snapshot.tick === 2_401) {
    assert.equal(boundary.resyncReadiness, 'ready');
    assert.equal(boundary.pendingAuthorityTick, null);
    assert.deepEqual(boundary.pendingExpiryEquipmentInstanceIds, []);
    assert.ok(boundary.remainingTicks.every((value) => value === 599));
  }
}

function publicMatchInfo(seed: number) {
  return Object.freeze({
    matchSeed: seed,
    opponent: Object.freeze({
      id: 'formal-survival-bot',
      displayName: 'Formal Survival Bot',
      portraitKey: 'formal-survival-bot-portrait',
      appearanceKey: 'formal-survival-bot-appearance',
    }),
  });
}

function configTemplate(hardLimitTicks: number): Readonly<Record<string, unknown>> {
  return Object.freeze({
    preparingTicks: 0,
    livesPerParticipant: 99,
    suddenDeathStartTick: hardLimitTicks - 100,
    hardLimitTicks,
    arena: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_ARENA,
    participantIds: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PARTICIPANT_IDS,
  });
}

interface FormalSurvivalBotResourceLimits {
  readonly maximumWorldEquipmentCount: number;
  readonly maximumRuntimeCount: number;
}

function deriveFormalResourceLimits(
  manifest: Pick<FormalSurvivalBotPressureManifest, 'supply' | 'configTemplate'>,
): FormalSurvivalBotResourceLimits {
  const participantIds = manifest.configTemplate.participantIds;
  if (!Array.isArray(participantIds)
    || participantIds.length !== ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PARTICIPANT_IDS.length
    || participantIds.some((id) => typeof id !== 'string')
    || new Set(participantIds).size !== participantIds.length
    || participantIds.some((id, index) => (
      id !== ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PARTICIPANT_IDS[index]
    ))) {
    throw new Error('formal survival Bot config 的 participantIds 不符合冻结双参与者合同。');
  }
  const maximumWorldEquipmentCount = manifest.supply.spawnSpecs.length;
  if (maximumWorldEquipmentCount !== ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.maximumWorldEquipmentCount) {
    throw new Error('formal survival Bot supply spawnSpecs 数量与冻结 world equipment 上限不一致。');
  }
  return Object.freeze({
    maximumWorldEquipmentCount,
    maximumRuntimeCount: maximumWorldEquipmentCount + participantIds.length,
  });
}

function makeCase(index: number, uniqueSeedCount: number): FormalSurvivalBotCase {
  const seedIndex = index % uniqueSeedCount;
  const cycleIndex = Math.floor(index / uniqueSeedCount);
  const seed = SEED_BASE + seedIndex;
  const difficultyId = ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PROFILE_IDS[
    (seedIndex + cycleIndex) % ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PROFILE_IDS.length
  ]!;
  const inputPlanId = ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PLAN_IDS[
    (seedIndex + cycleIndex * 2) % ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PLAN_IDS.length
  ]!;
  const playerParticipantId = (seedIndex + cycleIndex) % 2 === 0
    ? 'player-1'
    : 'player-2';
  const botParticipantId = playerParticipantId === 'player-1' ? 'player-2' : 'player-1';
  const pauseAtTick = ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PAUSE_BOUNDARY_TICKS[
    (seedIndex + cycleIndex * 3)
      % ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PAUSE_BOUNDARY_TICKS.length
  ] ?? null;
  const caseIdentity = [
    seed,
    difficultyId,
    inputPlanId,
    playerParticipantId,
    botParticipantId,
    pauseAtTick ?? 'none',
  ].join('|');
  return Object.freeze({
    caseId: `formal-survival-bot-${String(index).padStart(3, '0')}`,
    caseIdentity,
    seed,
    difficultyId,
    inputPlanId,
    pauseAtTick,
    playerParticipantId,
    botParticipantId,
  });
}

export function createFormalSurvivalBotPressureManifest(
  caseCount: number = ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.caseCount,
  uniqueSeedCount: number = ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.uniqueSeedCount,
  hardLimitTicks: number = ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.hardLimitTicks,
): FormalSurvivalBotPressureManifest {
  if (!Number.isSafeInteger(caseCount) || caseCount < 1) {
    throw new RangeError('formal survival Bot caseCount 必须是正安全整数。');
  }
  if (!Number.isSafeInteger(uniqueSeedCount) || uniqueSeedCount < 1) {
    throw new RangeError('formal survival Bot uniqueSeedCount 必须是正安全整数。');
  }
  if (uniqueSeedCount > caseCount) {
    throw new RangeError('formal survival Bot uniqueSeedCount 不能超过 caseCount。');
  }
  if (!Number.isSafeInteger(hardLimitTicks) || hardLimitTicks < 2_401) {
    throw new RangeError('formal survival Bot hardLimitTicks 必须覆盖 2400 tick 后结算。');
  }
  const cases = Object.freeze(Array.from({ length: caseCount }, (_, index) => (
    makeCase(index, uniqueSeedCount)
  )));
  const inspection = inspectFormalSurvivalBotPressureManifest(cases, caseCount, uniqueSeedCount);
  if (inspection.actualUniqueSeedCount !== uniqueSeedCount) {
    throw new Error('formal survival Bot manifest 的 actual unique seed 数量与请求不一致。');
  }
  if (inspection.uniqueCaseIdentityCount !== caseCount) {
    throw new Error('formal survival Bot manifest 必须为每个 case 生成唯一 caseIdentity。');
  }
  if (caseCount === ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.caseCount) {
    const actualPauseBoundaries = new Set(cases.map(({ pauseAtTick }) => pauseAtTick));
    const missingPauseBoundaries = ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PAUSE_BOUNDARY_TICKS
      .filter((tick) => !actualPauseBoundaries.has(tick));
    if (missingPauseBoundaries.length > 0) {
      throw new Error(
        `正式 300-case manifest 缺少 pause boundary: ${missingPauseBoundaries.join(', ')}`,
      );
    }
  }
  const profiles = ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PROFILE_DEFINITIONS;
  const missingProfiles = ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PROFILE_IDS.filter(
    (id) => !profiles.some((profile) => profile.id === id),
  );
  if (missingProfiles.length > 0) {
    throw new Error(`formal survival Bot manifest 缺少 Profile Definition: ${missingProfiles.join(', ')}`);
  }
  return Object.freeze({
    manifestId: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_MANIFEST_ID,
    caseCount,
    uniqueSeedCount,
    hardLimitTicks,
    definition: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
    arena: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_ARENA,
    supply: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_SUPPLY,
    configTemplate: configTemplate(hardLimitTicks),
    profiles,
    profileIds: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PROFILE_IDS,
    inputPlans: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_INPUT_PLANS,
    inputPlanIds: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PLAN_IDS,
    pauseBoundaryTicks: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PAUSE_BOUNDARY_TICKS,
    cases,
  });
}

export function createFormalSurvivalBotPressureManifestHash(
  manifest: FormalSurvivalBotPressureManifest,
): string {
  return createDeterministicDataHash(
    manifest,
    'formal survival Bot pressure manifest',
  );
}

export function inspectFormalSurvivalBotPressureManifest(
  cases: readonly FormalSurvivalBotCase[],
  requestedCaseCount = cases.length,
  requestedUniqueSeedCount = new Set(cases.map(({ seed }) => seed)).size,
): FormalSurvivalBotManifestInspection {
  const identityCounts = new Map<string, number>();
  for (const item of cases) {
    identityCounts.set(item.caseIdentity, (identityCounts.get(item.caseIdentity) ?? 0) + 1);
  }
  return Object.freeze({
    requestedCaseCount,
    requestedUniqueSeedCount,
    actualCaseCount: cases.length,
    actualUniqueSeedCount: new Set(cases.map(({ seed }) => seed)).size,
    uniqueCaseIdentityCount: identityCounts.size,
    duplicateCaseIdentities: Object.freeze(
      [...identityCounts.entries()]
        .filter(([, count]) => count > 1)
        .map(([identity]) => identity)
        .sort(),
    ),
  });
}

function inputForCase(
  currentTick: number,
  plan: FormalSurvivalBotCase,
): ArenaInputFrame {
  const base = createNeutralInputFrame(currentTick, plan.playerParticipantId);
  const phase = Math.floor(currentTick / 120) % 2;
  const direction = phase === 0 ? 1 : -1;
  const wavePhase = currentTick % 1_200;
  const contesting = currentTick >= 1_200 && wavePhase < 180;
  switch (plan.inputPlanId) {
    case 'left-contest':
      return Object.freeze({ ...base, moveX: -0.85, primaryPressed: contesting });
    case 'center-contest':
      return Object.freeze({
        ...base,
        moveX: direction * 0.55,
        moveZ: 0.2,
        primaryPressed: contesting,
      });
    case 'right-contest':
      return Object.freeze({ ...base, moveX: 0.85, primaryPressed: contesting });
    case 'zigzag':
      return Object.freeze({
        ...base,
        moveX: direction * 0.7,
        moveZ: phase === 0 ? 0.25 : -0.25,
        primaryPressed: contesting,
      });
    case 'jump-cycle':
      return Object.freeze({
        ...base,
        moveX: direction * 0.45,
        jumpPressed: currentTick % 90 === 0,
        jumpHeld: currentTick % 90 < 10,
        primaryPressed: contesting,
      });
    case 'neutral':
      return Object.freeze({ ...base, primaryPressed: contesting });
    default: {
      const unreachable: never = plan.inputPlanId;
      throw new Error(`未知 formal Bot input plan ${String(unreachable)}。`);
    }
  }
}

function createSession(plan: FormalSurvivalBotCase, hardLimitTicks: number) {
  return createArenaV2SurvivalSupplyBotSession({
    seed: plan.seed,
    config: {
      preparingTicks: 0,
      livesPerParticipant: 99,
      suddenDeathStartTick: hardLimitTicks - 100,
      hardLimitTicks,
      arena: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_ARENA,
      participantIds: Object.freeze([
        plan.playerParticipantId,
        plan.botParticipantId,
      ]),
    },
    supply: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_SUPPLY,
    playerParticipantId: plan.playerParticipantId,
    bot: {
      participantId: plan.botParticipantId,
      difficultyId: plan.difficultyId,
      behaviorSeed: (plan.seed ^ 0x10203040) >>> 0,
      personalitySeed: (plan.seed ^ 0x50607080) >>> 0,
      profileRegistry: BOT_PROFILE_REGISTRY,
    },
    publicMatchInfo: publicMatchInfo(plan.seed),
  });
}

function assertRunInvariants(
  plan: FormalSurvivalBotCase,
  snapshot: WorldSnapshotV2,
  events: readonly ArenaAuthorityEvent[],
  expectedTick: number,
  limits: FormalSurvivalBotResourceLimits,
): void {
  assertFinite(snapshot);
  assert.equal(snapshot.tick, expectedTick);
  assert.deepEqual(
    snapshot.participants.map(({ id }) => id),
    [plan.playerParticipantId, plan.botParticipantId].sort(),
    'formal survival Bot snapshot participant identity/稳定顺序漂移',
  );
  const worldEquipmentCount = snapshot.equipment.filter(({ locationState }) => (
    locationState === 'spawned' || locationState === 'dropped'
  )).length;
  assert.ok(worldEquipmentCount <= limits.maximumWorldEquipmentCount);
  assert.ok(snapshot.equipment.length <= limits.maximumRuntimeCount);
  assert.ok(
    (snapshot.activeSupplyProjection?.supplies.length ?? 0)
      <= ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.maximumActiveSupplyCount,
  );
  assert.ok(events.length <= ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.maximumEventsPerTick);
  assert.ok(Number.isSafeInteger(snapshot.eventSequence));
}

function createPa7ResourcePeaks(
  snapshots: readonly WorldSnapshotV2[],
  events: readonly ArenaAuthorityEvent[],
  limits: FormalSurvivalBotResourceLimits,
  readerCount: number,
): ArenaPa7FormalResourcePeaksV1 {
  const eventsByTick = new Map<number, number>();
  for (const event of events) eventsByTick.set(event.tick, (eventsByTick.get(event.tick) ?? 0) + 1);
  const peak = (observed: number, limit: number) => Object.freeze({ observed, limit });
  return Object.freeze({
    worldEquipmentCount: peak(Math.max(...snapshots.map(({ equipment }) => equipment.filter(({ locationState }) => (
      locationState === 'spawned' || locationState === 'dropped'
    )).length)), limits.maximumWorldEquipmentCount),
    runtimeEquipmentCount: peak(
      Math.max(...snapshots.map(({ equipment }) => equipment.length)),
      limits.maximumRuntimeCount,
    ),
    activeSupplyCount: peak(
      Math.max(...snapshots.map(({ activeSupplyProjection }) => activeSupplyProjection?.supplies.length ?? 0)),
      ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.maximumActiveSupplyCount,
    ),
    eventsPerTick: peak(
      Math.max(0, ...eventsByTick.values()),
      ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.maximumEventsPerTick,
    ),
    eventWindowCount: peak(0, 1),
    readerCount: peak(readerCount, readerCount),
    sessionCount: peak(1, 1),
  });
}

function createPa7CaseEvidence(
  summary: ArenaPa7FormalDoubleRunSummaryV1,
): ArenaPa7FormalCaseEvidenceV1 {
  const withoutHash = Object.freeze({
    schemaVersion: ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION,
    ...summary,
    doubleRunCount: ARENA_PA7_FORMAL_DOUBLE_RUN_COUNT,
  });
  const evidence = validateArenaPa7FormalCaseEvidenceV1(Object.freeze({
    ...withoutHash,
    caseEvidenceHash: createArenaPa7FormalCaseEvidenceHashV1(withoutHash),
  }));
  assertArenaPa7FormalCaseEvidenceMatchesDoubleRunSummaryV1(evidence, summary);
  return evidence;
}

function runCase(
  plan: FormalSurvivalBotCase,
  hardLimitTicks: number,
  limits: FormalSurvivalBotResourceLimits,
  pa6Collector?: ArenaPa6ReadStepMeasurementCollectorV2,
  pa7Capture?: FormalSurvivalBotPa7CaptureV1,
): FormalSurvivalBotRunTrace {
  const processCpuStart = process.cpuUsage();
  const session = createSession(plan, hardLimitTicks);
  if (pa6Collector !== undefined) pa6Collector.sessionsCreated += 1;
  const publicSnapshotHashes: string[] = [];
  let pauseSteps = 0;
  let maximumWorldEquipmentCount = 0;
  let maximumRuntimeCount = 0;
  let maximumActiveSupplyCount = 0;
  let maximumEventsPerTick = 0;
  let totalEvents = 0;
  let cpuMicros = 0;
  let pausePreservedTick: number | null = null;
  let pauseRecoveryTick: number | null = null;
  let pa7ReaderCount = 0;
  const pa7WorldSnapshots: WorldSnapshotV2[] = [];
  const pa7FullAuditTicks: number[] = [];
  const boundarySnapshots = new Map<number, FormalSurvivalBotBoundarySnapshot>();
  const schedule = createArenaReadStepScheduleV2();
  let primaryError: unknown = null;
  let completedTrace: Omit<FormalSurvivalBotRunTrace, 'pa7Run' | 'processCpuMicros'> | null = null;
  let pa7RunWithoutCleanup: Omit<ArenaPa7FormalCaseRunV1, 'cleanup'> | null = null;
  const recordBoundary = (snapshot: WorldSnapshotV2): void => {
    assertBoundarySemantics(snapshot);
    if ([1_199, 1_200, 1_201, 1_799, 1_800, 1_801, 2_399, 2_400, 2_401]
      .includes(snapshot.tick)) {
      boundarySnapshots.set(snapshot.tick, boundarySnapshot(snapshot));
    }
  };
  try {
    session.start();
    const compositionIdentity = readArenaV2SurvivalSupplyBotCompositionIdentity(session);
    const initialAudit = readArenaFullAuditAtCurrentV2({ session, schedule });
    if (pa6Collector !== undefined) pa6Collector.scheduledFullAudits += 1;
    cpuMicros += initialAudit.measurement.totalMicros;
    recordBoundary(initialAudit.frame.worldSnapshot);
    if (pa7Capture !== undefined) {
      pa7WorldSnapshots.push(initialAudit.frame.worldSnapshot);
      pa7FullAuditTicks.push(initialAudit.decision.tick);
      pa7ReaderCount = initialAudit.fullAudit.sidecars.length + 2;
    }
    while (session.state !== 'ended') {
      const beforeFrame = session.getPresentationReadFrame();
      const before = beforeFrame.worldSnapshot;
      recordBoundary(before);
      if (plan.pauseAtTick === before.tick) {
        session.setPaused(true);
        const paused = session.stepWithPresentationReadFrame(inputForCase(before.tick, plan));
        assert.deepEqual(paused.events, []);
        assert.equal(paused.input, null);
        assert.equal(paused.readFrame, beforeFrame);
        assert.equal(paused.readFrame.worldSnapshot.tick, before.tick);
        assert.equal(publicSnapshotHash(paused.readFrame.worldSnapshot), publicSnapshotHash(before));
        pausePreservedTick = paused.readFrame.worldSnapshot.tick;
        recordBoundary(paused.readFrame.worldSnapshot);
        pauseSteps += 1;
        session.setPaused(false);
      }
      const inclusiveCpuStart = pa6Collector === undefined ? null : process.cpuUsage();
      const inclusiveWallStart = pa6Collector === undefined ? null : performance.now();
      const result = runArenaReadStepV2({
        session,
        schedule,
        playerInput: (frame) => inputForCase(frame.worldSnapshot.tick, plan),
      });
      if (pa6Collector !== undefined
        && inclusiveCpuStart !== null && inclusiveWallStart !== null) {
        const inclusiveCpu = process.cpuUsage(inclusiveCpuStart);
        const inclusiveCpuMicros = inclusiveCpu.user + inclusiveCpu.system;
        const inclusiveWallMicros = (performance.now() - inclusiveWallStart) * 1_000;
        if (!Number.isFinite(inclusiveCpuMicros) || inclusiveCpuMicros < 0
          || !Number.isFinite(inclusiveWallMicros) || inclusiveWallMicros < 0
          || !Number.isFinite(result.measurement.totalMicros)
          || result.measurement.totalMicros < 0) {
          throw new RangeError('PA6 readStep measurement 包含非有限或负数。');
        }
        pa6Collector.selfCpuMicros.push(result.measurement.totalMicros);
        pa6Collector.inclusiveCpuMicros.push(inclusiveCpuMicros);
        pa6Collector.inclusiveWallMicros.push(inclusiveWallMicros);
        if (result.measurement.fullAuditPerformed) pa6Collector.scheduledFullAudits += 1;
      }
      const snapshot = result.postFrame.worldSnapshot;
      const expectedTick = before.tick + 1;
      cpuMicros += result.measurement.totalMicros;
      assertRunInvariants(plan, snapshot, result.events, expectedTick, limits);
      pa7Capture?.onAuthorityTick?.(snapshot.tick);
      if (pausePreservedTick !== null && pauseRecoveryTick === null) {
        assert.equal(snapshot.tick, pausePreservedTick + 1);
        pauseRecoveryTick = snapshot.tick;
      }
      recordBoundary(snapshot);
      if (pa7Capture !== undefined) {
        pa7WorldSnapshots.push(snapshot);
        if (result.auditDecision !== null) {
          assert.ok(result.fullAudit);
          assert.equal(result.fullAudit.sidecars.length + 2, pa7ReaderCount);
          pa7FullAuditTicks.push(result.auditDecision.tick);
        }
      }
      publicSnapshotHashes.push(publicSnapshotHash(snapshot));
      totalEvents += result.events.length;
      maximumEventsPerTick = Math.max(maximumEventsPerTick, result.events.length);
      maximumWorldEquipmentCount = Math.max(
        maximumWorldEquipmentCount,
        snapshot.equipment.filter(({ locationState }) => (
          locationState === 'spawned' || locationState === 'dropped'
        )).length,
      );
      maximumRuntimeCount = Math.max(maximumRuntimeCount, snapshot.equipment.length);
      maximumActiveSupplyCount = Math.max(
        maximumActiveSupplyCount,
        snapshot.activeSupplyProjection?.supplies.length ?? 0,
      );
    }
    const replay = session.exportReplay();
    assert.equal(replay.replaySchemaVersion, 5);
    assert.equal(replay.inputFrames.length, publicSnapshotHashes.length * 2);
    assert.equal(replay.events.length, totalEvents);
    const finalFrame = session.getPresentationReadFrame();
    assert.equal(finalFrame.worldSnapshot.phase, 'ended');
    assert.match(replay.finalHash, /^[0-9a-f]{8}$/);
    const ticks = Math.max(1, publicSnapshotHashes.length);
    pa7RunWithoutCleanup = pa7Capture === undefined ? null : Object.freeze({
      schemaVersion: ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION,
      caseIndex: pa7Capture.caseIndex,
      caseId: plan.caseId,
      caseIdentity: plan.caseIdentity,
      seed: plan.seed,
      difficultyId: plan.difficultyId,
      inputPlanId: plan.inputPlanId,
      pauseAtTick: plan.pauseAtTick,
      playerParticipantId: plan.playerParticipantId,
      botParticipantId: plan.botParticipantId,
      finalTick: finalFrame.worldSnapshot.tick,
      inputFrames: replay.inputFrames,
      authorityEvents: replay.events,
      worldSnapshots: Object.freeze([...pa7WorldSnapshots]),
      fullAuditTicks: Object.freeze([...pa7FullAuditTicks]),
      fullAuditCount: pa7FullAuditTicks.length,
      checkpoints: replay.checkpoints,
      replayV5: replay as unknown as ArenaPa7FormalCaseRunV1['replayV5'],
      result: replay.result as unknown as ArenaPa7FormalCaseRunV1['result'],
      finalHash: replay.finalHash,
      lifecycleBoundaries: createArenaPa7FormalLifecycleBoundariesV1({
        worldSnapshots: pa7WorldSnapshots,
        authorityEvents: replay.events,
      }),
      resourcePeaks: createPa7ResourcePeaks(
        pa7WorldSnapshots,
        replay.events,
        limits,
        pa7ReaderCount,
      ),
    }) satisfies Omit<ArenaPa7FormalCaseRunV1, 'cleanup'>;
    completedTrace = Object.freeze({
      inputFrames: replay.inputFrames,
      events: replay.events,
      publicSnapshotHashes: Object.freeze(publicSnapshotHashes),
      checkpointHashes: Object.freeze(replay.checkpoints.map(({ hash }) => hash)),
      finalHash: replay.finalHash,
      result: replay.result,
      finalTick: finalFrame.worldSnapshot.tick,
      totalEvents,
      maximumWorldEquipmentCount,
      maximumRuntimeCount,
      maximumActiveSupplyCount,
      maximumEventsPerTick,
      pauseSteps,
      pauseAtTick: plan.pauseAtTick,
      pausePreservedTick,
      pauseRecoveryTick,
      cpuMsPerTick: (cpuMicros / 1_000) / ticks,
      cpuMicros,
      eventTypeCounts: countEvents(replay.events),
      equipmentDespawnReasonCounts: countEquipmentDespawnReasons(replay.events),
      spawnCountsByTick: countEquipmentSpawnsByTick(replay.events),
      spawnTicks: Object.freeze([...new Set(
        replay.events
          .filter(({ type }) => type === ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED)
          .map(({ tick }) => tick),
      )].sort((left, right) => left - right)),
      boundarySnapshots: Object.freeze(
        [...boundarySnapshots.values()].sort((left, right) => left.tick - right.tick),
      ),
      compositionIdentity,
    });
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    const cleanupErrors: unknown[] = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        session.destroy();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (cleanupErrors.length === 0) {
      if (pa6Collector !== undefined) pa6Collector.sessionsDestroyed += 1;
    } else {
      throw new AggregateError(
        primaryError === null ? cleanupErrors : [primaryError, ...cleanupErrors],
        'formal survival Bot case 主流程或 Session cleanup 失败。',
      );
    }
  }
  if (completedTrace === null) {
    throw new Error(`${plan.caseId} 未生成完整 run trace。`);
  }
  const pa7Cleanup = Object.freeze({
    sessionsCreated: 1,
    sessionDestroyAttempts: 2,
    sessionsDestroyed: 1,
    readersCreated: pa7ReaderCount,
    readersInvalidated: pa7ReaderCount,
    pendingCleanupCount: 0,
    cleanupErrorCount: 0,
  }) satisfies ArenaPa7FormalCaseCleanupV1;
  const pa7Run = pa7RunWithoutCleanup === null ? null : Object.freeze({
    ...pa7RunWithoutCleanup,
    cleanup: pa7Cleanup,
  }) satisfies ArenaPa7FormalCaseRunV1;
  const processCpu = process.cpuUsage(processCpuStart);
  const processCpuMicros = processCpu.user + processCpu.system;
  if (!Number.isSafeInteger(processCpuMicros) || processCpuMicros < 0) {
    throw new RangeError(`${plan.caseId} process CPU measurement 非法。`);
  }
  return Object.freeze({
    ...completedTrace,
    processCpuMicros,
    pa7Run,
  });
}

function compareTraces(
  plan: FormalSurvivalBotCase,
  first: FormalSurvivalBotRunTrace,
  second: FormalSurvivalBotRunTrace,
  hardLimitTicks: number,
): FormalSurvivalBotCaseResult {
  if ((first.pa7Run === null) !== (second.pa7Run === null)) {
    throw new Error(`${plan.caseId} PA7 capture 两轮启用状态不一致。`);
  }
  const pa7DoubleRunSummary = first.pa7Run === null || second.pa7Run === null
    ? null
    : createArenaPa7FormalDoubleRunSummaryV1(first.pa7Run, second.pa7Run);
  const pa7CaseEvidence = pa7DoubleRunSummary === null
    ? null
    : createPa7CaseEvidence(pa7DoubleRunSummary);
  assert.deepEqual(second.inputFrames, first.inputFrames, `${plan.caseId} InputFrame trace 漂移`);
  assert.deepEqual(second.events, first.events, `${plan.caseId} authority event trace 漂移`);
  assert.deepEqual(
    second.publicSnapshotHashes,
    first.publicSnapshotHashes,
    `${plan.caseId} public snapshot projection 漂移`,
  );
  assert.deepEqual(second.checkpointHashes, first.checkpointHashes, `${plan.caseId} state hash 漂移`);
  assert.deepEqual(second.boundarySnapshots, first.boundarySnapshots, `${plan.caseId} lifecycle boundary 漂移`);
  assert.equal(second.finalHash, first.finalHash, `${plan.caseId} final hash 漂移`);
  assert.deepEqual(second.result, first.result, `${plan.caseId} result 漂移`);
  assert.deepEqual(
    second.compositionIdentity,
    first.compositionIdentity,
    `${plan.caseId} composition provenance 漂移`,
  );
  assert.deepEqual(
    second.spawnCountsByTick,
    first.spawnCountsByTick,
    `${plan.caseId} spawn count by tick 漂移`,
  );
  // hardLimitTicks is a terminal ceiling. Sudden-death elimination may end a
  // valid case after the second-wave boundary and before that ceiling.
  assert.ok(first.finalTick >= 2_401 && first.finalTick <= hardLimitTicks);
  assert.equal(first.pauseSteps, plan.pauseAtTick === null ? 0 : 1);
  assert.equal(first.pauseAtTick, plan.pauseAtTick);
  assert.equal(second.pauseAtTick, first.pauseAtTick);
  if (plan.pauseAtTick === null) {
    assert.equal(first.pausePreservedTick, null);
    assert.equal(first.pauseRecoveryTick, null);
  } else {
    assert.equal(first.pausePreservedTick, plan.pauseAtTick);
    assert.equal(first.pauseRecoveryTick, plan.pauseAtTick + 1);
  }
  assert.equal(second.pausePreservedTick, first.pausePreservedTick);
  assert.equal(second.pauseRecoveryTick, first.pauseRecoveryTick);
  return Object.freeze({
    caseId: plan.caseId,
    caseIdentity: plan.caseIdentity,
    seed: plan.seed,
    difficultyId: plan.difficultyId,
    inputPlanId: plan.inputPlanId,
    traceHash: createDeterministicDataHash({
      inputFrames: first.inputFrames,
      events: first.events,
      publicSnapshotHashes: first.publicSnapshotHashes,
      checkpointHashes: first.checkpointHashes,
      finalHash: first.finalHash,
      result: first.result,
    }, 'formal survival Bot trace'),
    finalHash: first.finalHash,
    finalTick: first.finalTick,
    totalEvents: first.totalEvents,
    maximumWorldEquipmentCount: Math.max(
      first.maximumWorldEquipmentCount,
      second.maximumWorldEquipmentCount,
    ),
    maximumRuntimeCount: Math.max(first.maximumRuntimeCount, second.maximumRuntimeCount),
    maximumActiveSupplyCount: Math.max(
      first.maximumActiveSupplyCount,
      second.maximumActiveSupplyCount,
    ),
    maximumEventsPerTick: Math.max(first.maximumEventsPerTick, second.maximumEventsPerTick),
    pauseSteps: first.pauseSteps,
    pauseAtTick: first.pauseAtTick,
    pausePreservedTick: first.pausePreservedTick,
    pauseRecoveryTick: first.pauseRecoveryTick,
    cpuMsPerTick: Math.max(first.cpuMsPerTick, second.cpuMsPerTick),
    cpuTotalMicros: first.cpuMicros + second.cpuMicros,
    cpuMicrosPerTickSamples: Object.freeze([first.cpuMsPerTick * 1_000, second.cpuMsPerTick * 1_000]),
    processCpuTotalMicros: first.processCpuMicros + second.processCpuMicros,
    processCpuMicrosPerTickSamples: Object.freeze([
      first.processCpuMicros / first.finalTick,
      second.processCpuMicros / second.finalTick,
    ]),
    eventTypeCounts: first.eventTypeCounts,
    equipmentDespawnReasonCounts: first.equipmentDespawnReasonCounts,
    spawnCountsByTick: first.spawnCountsByTick,
    spawnTicks: first.spawnTicks,
    boundarySnapshots: first.boundarySnapshots,
    compositionIdentity: first.compositionIdentity,
    pa7DoubleRunSummary,
    pa7CaseEvidence,
  });
}

function arenaPa6PercentilesV2(values: readonly number[]): ArenaPa6PercentilesV2 {
  if (values.length === 0 || values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new RangeError('PA6 percentile samples 必须是非空有限非负数。');
  }
  const ordered = [...values].sort((left, right) => left - right);
  const at = (quantile: number): number => {
    const index = Math.max(0, Math.min(
      ordered.length - 1,
      Math.ceil(ordered.length * quantile) - 1,
    ));
    return ordered[index]!;
  };
  return Object.freeze({
    sampleCount: ordered.length,
    p50: at(0.5),
    p95: at(0.95),
    p99: at(0.99),
  });
}

export function runArenaPa6FormalReadStepRoundV2(options: {
  readonly variantId: ArenaPa6ReadStepVariantId;
  readonly loaderAttestation: ArenaPa6LoaderAttestationV2;
}): ArenaPa6FormalReadStepRoundV2 {
  const variant = requireArenaPa6ReadStepVariantV1(options.variantId);
  if (options.loaderAttestation.schemaVersion !== 2
    || options.loaderAttestation.variantId !== variant.id
    || options.loaderAttestation.profileRead !== variant.profileRead
    || options.loaderAttestation.resolverRead !== variant.resolverRead) {
    throw new Error('PA6 formal round loader attestation 与 variant 不一致。');
  }
  assertArenaPa6FixedCasesV1(ARENA_PA6_READ_STEP_CASES_V1);
  const cases = ARENA_PA6_READ_STEP_CASES_V1 as readonly FormalSurvivalBotCase[];
  const resourceLimits = deriveFormalResourceLimits({
    supply: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_SUPPLY,
    configTemplate: configTemplate(ARENA_PA6_READ_STEP_HARD_LIMIT_TICKS),
  });
  const collector: ArenaPa6ReadStepMeasurementCollectorV2 = {
    selfCpuMicros: [],
    inclusiveCpuMicros: [],
    inclusiveWallMicros: [],
    scheduledFullAudits: 0,
    sessionsCreated: 0,
    sessionsDestroyed: 0,
  };
  const gcExposed = typeof global.gc === 'function';
  let forcedCollections = 0;
  if (gcExposed) {
    global.gc!();
    forcedCollections += 1;
  }
  const heapBeforeBytes = process.memoryUsage().heapUsed;
  const processCpuStart = process.cpuUsage();
  const results: FormalSurvivalBotCaseResult[] = [];
  for (const plan of cases) {
    const first = runCase(
      plan,
      ARENA_PA6_READ_STEP_HARD_LIMIT_TICKS,
      resourceLimits,
      collector,
    );
    const second = runCase(
      plan,
      ARENA_PA6_READ_STEP_HARD_LIMIT_TICKS,
      resourceLimits,
      collector,
    );
    results.push(compareTraces(
      plan,
      first,
      second,
      ARENA_PA6_READ_STEP_HARD_LIMIT_TICKS,
    ));
  }
  const processCpu = process.cpuUsage(processCpuStart);
  const processTotalMicros = processCpu.user + processCpu.system;
  if (!Number.isFinite(processTotalMicros) || processTotalMicros < 0) {
    throw new RangeError('PA6 process CPU 非法。');
  }
  if (gcExposed) {
    global.gc!();
    forcedCollections += 1;
  }
  const heapAfterBytes = process.memoryUsage().heapUsed;
  const denominatorTicks = collector.selfCpuMicros.length;
  const caseDerivedDenominator = results.reduce((sum, result) => sum + result.finalTick * 2, 0);
  if (denominatorTicks !== caseDerivedDenominator
    || collector.inclusiveCpuMicros.length !== denominatorTicks
    || collector.inclusiveWallMicros.length !== denominatorTicks
    || collector.sessionsCreated !== 40
    || collector.sessionsDestroyed !== collector.sessionsCreated
    || results.length !== 20) {
    throw new Error('PA6 formal round denominator/lifecycle/case 数量不闭合。');
  }
  const stableCases = Object.freeze(results.map((result) => Object.freeze({
    caseId: result.caseId,
    caseIdentity: result.caseIdentity,
    seed: result.seed,
    traceHash: result.traceHash,
    finalHash: result.finalHash,
    finalTick: result.finalTick,
    totalEvents: result.totalEvents,
  })));
  const processCpuRecord = Object.freeze({
    userMicros: processCpu.user,
    systemMicros: processCpu.system,
    totalMicros: processTotalMicros,
    microsPerTick: processTotalMicros / denominatorTicks,
  });
  const report: ArenaPa6FormalReadStepRoundV2 = Object.freeze({
    schemaVersion: 2,
    variantId: variant.id,
    loaderAttestation: options.loaderAttestation,
    caseSetIdentity: createDeterministicDataHash(
      ARENA_PA6_READ_STEP_CASES_V1,
      'PA6 fixed case set',
    ),
    parityIdentity: createDeterministicDataHash(stableCases, 'PA6 strict parity cases'),
    caseCount: 20,
    uniqueSeedCount: 20,
    hardLimitTicks: ARENA_PA6_READ_STEP_HARD_LIMIT_TICKS,
    doubleRunsPerCase: 2,
    denominatorTicks,
    selfCpuMicros: arenaPa6PercentilesV2(collector.selfCpuMicros),
    inclusiveCpuMicros: arenaPa6PercentilesV2(collector.inclusiveCpuMicros),
    inclusiveWallMicros: arenaPa6PercentilesV2(collector.inclusiveWallMicros),
    processCpu: processCpuRecord,
    counts: Object.freeze({
      scheduledFullAudits: collector.scheduledFullAudits,
      sessionsCreated: collector.sessionsCreated,
      sessionsDestroyed: collector.sessionsDestroyed,
      completedCases: results.length,
    }),
    gc: Object.freeze({ exposed: gcExposed, forcedCollections }),
    resources: Object.freeze({
      maximumWorldEquipmentCount: Math.max(...results.map(
        ({ maximumWorldEquipmentCount }) => maximumWorldEquipmentCount,
      )),
      maximumRuntimeCount: Math.max(...results.map(
        ({ maximumRuntimeCount }) => maximumRuntimeCount,
      )),
      maximumActiveSupplyCount: Math.max(...results.map(
        ({ maximumActiveSupplyCount }) => maximumActiveSupplyCount,
      )),
      maximumEventsPerTick: Math.max(...results.map(
        ({ maximumEventsPerTick }) => maximumEventsPerTick,
      )),
      heapBeforeBytes,
      heapAfterBytes,
      heapDeltaBytes: heapAfterBytes - heapBeforeBytes,
    }),
    cases: stableCases,
  });
  return report;
}

export interface ArenaPa6ReadModelProbeV2 {
  readonly schemaVersion: 2;
  readonly caseId: string;
  readonly seed: number;
  readonly tickCount: number;
  readonly scheduledFullAudits: number;
  readonly finalTick: number;
  readonly traceHash: string;
}

export function runArenaPa6ReadModelProbeV2(tickCount = 8): ArenaPa6ReadModelProbeV2 {
  if (!Number.isSafeInteger(tickCount) || tickCount < 1 || tickCount > 120) {
    throw new RangeError('PA6 read-model probe tickCount 必须在 1..120。');
  }
  const plan = ARENA_PA6_READ_STEP_CASES_V1[0]! as FormalSurvivalBotCase;
  const session = createSession(plan, ARENA_PA6_READ_STEP_HARD_LIMIT_TICKS);
  const schedule = createArenaReadStepScheduleV2();
  const trace: unknown[] = [];
  let scheduledFullAudits = 0;
  try {
    session.start();
    const initial = readArenaFullAuditAtCurrentV2({ session, schedule });
    scheduledFullAudits += 1;
    trace.push(Object.freeze({
      kind: 'initial',
      frame: initial.frame,
      fullAudit: initial.fullAudit,
      decision: initial.decision,
    }));
    for (let index = 0; index < tickCount; index += 1) {
      const result = runArenaReadStepV2({
        session,
        schedule,
        playerInput: (frame) => inputForCase(frame.worldSnapshot.tick, plan),
      });
      if (result.measurement.fullAuditPerformed) scheduledFullAudits += 1;
      trace.push(Object.freeze({
        kind: 'step',
        input: result.input,
        events: result.events,
        postFrame: result.postFrame,
        fullAudit: result.fullAudit,
        auditDecision: result.auditDecision,
      }));
    }
    const finalTick = session.getPresentationReadFrame().worldSnapshot.tick;
    return Object.freeze({
      schemaVersion: 2,
      caseId: plan.caseId,
      seed: plan.seed,
      tickCount,
      scheduledFullAudits,
      finalTick,
      traceHash: createDeterministicDataHash(trace, 'PA6 read-model probe trace'),
    });
  } finally {
    session.destroy();
    session.destroy();
  }
}

export interface FormalSurvivalBotPressureReport {
  readonly status: 'formal-passed' | 'formal-failed' | 'smoke-passed' | 'smoke-failed';
  readonly executionPassed: boolean;
  readonly formalRequest: boolean;
  readonly formalGateEligible: boolean;
  readonly formalGatePassed: boolean;
  readonly formalFailureReasons: readonly string[];
  readonly manifestId: string;
  readonly manifestHash: string;
  readonly definitionHash: string;
  readonly configHash: string;
  readonly evidenceHash: string;
  readonly resultManifestHash: string;
  readonly requestedCaseCount: number;
  readonly requestedUniqueSeedCount: number;
  readonly requestedHardLimitTicks: number;
  readonly actualCaseCount: number;
  readonly actualUniqueSeedCount: number;
  readonly uniqueCaseIdentityCount: number;
  readonly completedCases: number;
  readonly canonicalTotalTicks: number;
  readonly executedTotalTicks: number;
  readonly canonicalTotalEvents: number;
  readonly executedTotalEvents: number;
  readonly uniqueFinalHashes: number;
  readonly uniqueTraceHashes: number;
  readonly minimumUniqueFinalHashes: number;
  readonly maximumWorldEquipmentCount: number;
  readonly maximumWorldEquipmentLimit: number;
  readonly maximumRuntimeCount: number;
  readonly maximumRuntimeLimit: number;
  readonly maximumActiveSupplyCount: number;
  readonly maximumEventsPerTick: number;
  readonly maximumPauseSteps: number;
  readonly heapGrowthBytes: number;
  readonly heapGrowthBudgetBytes: number;
  readonly cpuBudgetMsPerTick: number;
  readonly cpuP95MsPerTick: number;
  readonly cpuWorstMsPerTick: number;
  readonly cpuTotalMicros: number;
  readonly cpuMicrosPerTickSamples: readonly number[];
  readonly processCpuTotalMicros: number;
  readonly processCpuMicrosPerTickSamples: readonly number[];
  readonly heapBaselineBytes: number;
  readonly heapPeakBytes: number;
  readonly heapEndingBytes: number;
  readonly eventTypeCounts: Readonly<Record<string, number>>;
  readonly eventCoverage: Readonly<Record<string, boolean>>;
  readonly equipmentDespawnReasonCounts: Readonly<Record<string, number>>;
  readonly equipmentDespawnReasonCoverage: Readonly<Record<string, boolean>>;
  readonly terminalCoverage: Readonly<{
    readonly allCasesEnded: boolean;
    readonly matchEndedEvents: number;
    readonly spawnAt1200: boolean;
    readonly spawnAt2400: boolean;
    readonly activeSupplyReached3: boolean;
  }>;
  readonly terminalProjectionCoverage: Readonly<{
    readonly firstWaveRemaining599: boolean;
    readonly firstWaveRemaining1: boolean;
    readonly expiryPendingAt1800: boolean;
    readonly postExpiryReadyAt1801: boolean;
    readonly secondWaveRemaining599: boolean;
  }>;
  readonly boundaryTicksCovered: readonly number[];
  readonly caseResults: readonly FormalSurvivalBotCaseResult[];
  readonly wallDurationMs: number;
}

interface ArenaPa7FormalExecutionObserverV1 {
  readonly onAuthorityTick: (caseIndex: number, pass: 1 | 2, tick: number) => void;
  readonly onSecondPassStarted: (caseIndex: number, caseId: string) => void;
  readonly onCaseCommitted: (
    caseIndex: number,
    evidence: ArenaPa7FormalCaseEvidenceV1,
    nextCase: FormalSurvivalBotCase | null,
  ) => void;
}

export interface FormalSurvivalBotPressureRequest {
  readonly caseCount: number;
  readonly uniqueSeedCount: number;
  readonly hardLimitTicks: number;
}

export function isFormalSurvivalBotPressureRequest(
  request: FormalSurvivalBotPressureRequest,
): boolean {
  return request.caseCount === ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.caseCount
    && request.uniqueSeedCount >= ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.uniqueSeedCount
    && request.hardLimitTicks === ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.hardLimitTicks;
}

export type FormalSurvivalBotPressureStatus = FormalSurvivalBotPressureReport['status'];

export function classifyFormalSurvivalBotPressureStatus(options: {
  readonly formalRequest: boolean;
  readonly executionPassed: boolean;
  readonly formalGatePassed: boolean;
}): FormalSurvivalBotPressureStatus {
  if (options.formalRequest) {
    return options.formalGatePassed ? 'formal-passed' : 'formal-failed';
  }
  return options.executionPassed ? 'smoke-passed' : 'smoke-failed';
}

export function normalizeFormalSurvivalBotPressureRequest(options: {
  readonly caseCount?: number;
  readonly uniqueSeedCount?: number;
  readonly hardLimitTicks?: number;
} = {}): FormalSurvivalBotPressureRequest {
  const caseCount = options.caseCount ?? ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.caseCount;
  const uniqueSeedCount = options.uniqueSeedCount
    ?? ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.uniqueSeedCount;
  const hardLimitTicks = options.hardLimitTicks
    ?? ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.hardLimitTicks;
  if (!Number.isSafeInteger(caseCount) || caseCount < 1) {
    throw new RangeError('formal survival Bot caseCount 必须是正安全整数。');
  }
  if (!Number.isSafeInteger(uniqueSeedCount) || uniqueSeedCount < 1) {
    throw new RangeError('formal survival Bot uniqueSeedCount 必须是正安全整数。');
  }
  if (uniqueSeedCount > caseCount) {
    throw new RangeError('formal survival Bot uniqueSeedCount 不能超过 caseCount。');
  }
  if (!Number.isSafeInteger(hardLimitTicks) || hardLimitTicks < 2_401) {
    throw new RangeError('formal survival Bot hardLimitTicks 必须覆盖 2400 tick 后结算。');
  }
  return Object.freeze({ caseCount, uniqueSeedCount, hardLimitTicks });
}

function aggregateEventCounts(
  results: readonly FormalSurvivalBotCaseResult[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const result of results) {
    for (const [type, count] of Object.entries(result.eventTypeCounts)) {
      counts[type] = (counts[type] ?? 0) + count;
    }
  }
  return Object.freeze(Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  ));
}

function aggregateEquipmentDespawnReasonCounts(
  results: readonly FormalSurvivalBotCaseResult[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const result of results) {
    for (const [reason, count] of Object.entries(result.equipmentDespawnReasonCounts)) {
      counts[reason] = (counts[reason] ?? 0) + count;
    }
  }
  return Object.freeze(Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  ));
}

function requiredEventCoverage(
  eventTypeCounts: Readonly<Record<string, number>>,
  spawnTicks: readonly number[],
  maximumActiveSupplyCount: number,
): Readonly<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  for (const type of ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_REQUIRED_EVENT_TYPES) {
    result[type] = (eventTypeCounts[type] ?? 0) > 0;
  }
  result.spawnAt1200 = spawnTicks.includes(1_200);
  result.spawnAt2400 = spawnTicks.includes(2_400);
  result.activeSupplyReached3 = maximumActiveSupplyCount === 3;
  return Object.freeze(result);
}

export function requiredEquipmentDespawnReasonCoverage(
  reasonCounts: Readonly<Record<string, number>>,
): Readonly<Record<string, boolean>> {
  return Object.freeze(Object.fromEntries(
    ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_REQUIRED_EQUIPMENT_DESPAWN_REASONS.map((reason) => [
      reason,
      (reasonCounts[reason] ?? 0) > 0,
    ]),
  ));
}

function terminalProjectionCoverage(
  results: readonly FormalSurvivalBotCaseResult[],
): Readonly<{
  readonly firstWaveRemaining599: boolean;
  readonly firstWaveRemaining1: boolean;
  readonly expiryPendingAt1800: boolean;
  readonly postExpiryReadyAt1801: boolean;
  readonly secondWaveRemaining599: boolean;
}> {
  const snapshotsAt = (tick: number): readonly FormalSurvivalBotBoundarySnapshot[] => (
    results.flatMap(({ boundarySnapshots }) => (
      boundarySnapshots.filter((snapshot) => snapshot.tick === tick)
    ))
  );
  const at1201 = snapshotsAt(1_201);
  const at1799 = snapshotsAt(1_799);
  const at1800 = snapshotsAt(1_800);
  const at1801 = snapshotsAt(1_801);
  const at2401 = snapshotsAt(2_401);
  return Object.freeze({
    firstWaveRemaining599: at1201.some(({ remainingTicks }) => (
      remainingTicks.length > 0 && remainingTicks.every((value) => value === 599)
    )),
    firstWaveRemaining1: at1799.some(({ remainingTicks }) => (
      remainingTicks.length > 0 && remainingTicks.every((value) => value === 1)
    )),
    expiryPendingAt1800: at1800.some((snapshot) => (
      snapshot.remainingTicks.length === 0
      && snapshot.pendingExpiryEquipmentInstanceIds.length > 0
      && snapshot.resyncReadiness === 'not-ready-pre-expiry'
      && snapshot.pendingAuthorityTick === 1_800
    )),
    postExpiryReadyAt1801: at1801.some((snapshot) => (
      snapshot.remainingTicks.length === 0
      && snapshot.pendingExpiryEquipmentInstanceIds.length === 0
      && snapshot.resyncReadiness === 'ready'
      && snapshot.pendingAuthorityTick === null
    )),
    secondWaveRemaining599: at2401.some(({ remainingTicks }) => (
      remainingTicks.length > 0 && remainingTicks.every((value) => value === 599)
    )),
  });
}

function runFormalSurvivalBotPressureInternal(options: {
  readonly caseCount?: number;
  readonly uniqueSeedCount?: number;
  readonly hardLimitTicks?: number;
} = {}, observer?: ArenaPa7FormalExecutionObserverV1): FormalSurvivalBotPressureReport {
  const request = normalizeFormalSurvivalBotPressureRequest(options);
  const manifest = createFormalSurvivalBotPressureManifest(
    request.caseCount,
    request.uniqueSeedCount,
    request.hardLimitTicks,
  );
  const resourceLimits = deriveFormalResourceLimits(manifest);
  const inspection = inspectFormalSurvivalBotPressureManifest(
    manifest.cases,
    request.caseCount,
    request.uniqueSeedCount,
  );
  const definitionHash = createDeterministicDataHash(
    manifest.definition,
    'formal survival Bot supply Definition',
  );
  const configHash = createDeterministicDataHash(
    {
      configTemplate: manifest.configTemplate,
      supply: manifest.supply,
      definitionHash,
      profiles: manifest.profiles,
      profileIds: manifest.profileIds,
      inputPlans: manifest.inputPlans,
      inputPlanIds: manifest.inputPlanIds,
      pauseBoundaryTicks: manifest.pauseBoundaryTicks,
    },
    'formal survival Bot config template',
  );
  const manifestHash = createFormalSurvivalBotPressureManifestHash(manifest);
  const formalRequest = isFormalSurvivalBotPressureRequest(request);
  const startedAt = performance.now();
  if (typeof global.gc === 'function') global.gc();
  const initialHeap = process.memoryUsage().heapUsed;
  const results: FormalSurvivalBotCaseResult[] = [];
  const cpuValues: number[] = [];
  const cpuMicrosPerTickSamples: number[] = [];
  const processCpuMicrosPerTickSamples: number[] = [];
  let cpuTotalMicros = 0;
  let processCpuTotalMicros = 0;
  let heapPeakBytes = initialHeap;
  let canonicalTotalTicks = 0;
  let canonicalTotalEvents = 0;
  let maximumWorldEquipmentCount = 0;
  let maximumRuntimeCount = 0;
  let maximumActiveSupplyCount = 0;
  let maximumEventsPerTick = 0;
  let maximumPauseSteps = 0;
  for (const [caseIndex, plan] of manifest.cases.entries()) {
    const firstCapture: FormalSurvivalBotPa7CaptureV1 = observer === undefined
      ? Object.freeze({ caseIndex })
      : Object.freeze({
        caseIndex,
        onAuthorityTick: (tick: number) => observer.onAuthorityTick(caseIndex, 1, tick),
      });
    const first = runCase(plan, request.hardLimitTicks, resourceLimits, undefined, firstCapture);
    observer?.onSecondPassStarted(caseIndex, plan.caseId);
    const secondCapture: FormalSurvivalBotPa7CaptureV1 = observer === undefined
      ? Object.freeze({ caseIndex })
      : Object.freeze({
        caseIndex,
        onAuthorityTick: (tick: number) => observer.onAuthorityTick(caseIndex, 2, tick),
      });
    const second = runCase(plan, request.hardLimitTicks, resourceLimits, undefined, secondCapture);
    const result = compareTraces(plan, first, second, request.hardLimitTicks);
    if (result.pa7DoubleRunSummary === null || result.pa7CaseEvidence === null) {
      throw new Error(`${plan.caseId} 缺少 PA7 double-run summary/case evidence。`);
    }
    observer?.onCaseCommitted(
      caseIndex,
      result.pa7CaseEvidence,
      manifest.cases[caseIndex + 1] ?? null,
    );
    results.push(result);
    cpuValues.push(result.cpuMsPerTick);
    cpuTotalMicros += result.cpuTotalMicros;
    cpuMicrosPerTickSamples.push(...result.cpuMicrosPerTickSamples);
    processCpuTotalMicros += result.processCpuTotalMicros;
    processCpuMicrosPerTickSamples.push(...result.processCpuMicrosPerTickSamples);
    heapPeakBytes = Math.max(heapPeakBytes, process.memoryUsage().heapUsed);
    canonicalTotalTicks += result.finalTick;
    canonicalTotalEvents += result.totalEvents;
    maximumWorldEquipmentCount = Math.max(
      maximumWorldEquipmentCount,
      result.maximumWorldEquipmentCount,
    );
    maximumRuntimeCount = Math.max(maximumRuntimeCount, result.maximumRuntimeCount);
    maximumActiveSupplyCount = Math.max(maximumActiveSupplyCount, result.maximumActiveSupplyCount);
    maximumEventsPerTick = Math.max(maximumEventsPerTick, result.maximumEventsPerTick);
    maximumPauseSteps = Math.max(maximumPauseSteps, result.pauseSteps);
  }
  if (typeof global.gc === 'function') global.gc();
  const heapEndingBytes = process.memoryUsage().heapUsed;
  heapPeakBytes = Math.max(heapPeakBytes, heapEndingBytes);
  const heapGrowthBytes = heapEndingBytes - initialHeap;
  const sortedCpuValues = [...cpuValues].sort((left, right) => left - right);
  const cpuP95Index = Math.min(
    sortedCpuValues.length - 1,
    Math.ceil(sortedCpuValues.length * 0.95) - 1,
  );
  const cpuP95MsPerTick = sortedCpuValues[Math.max(0, cpuP95Index)] ?? 0;
  const cpuWorstMsPerTick = Math.max(...sortedCpuValues);
  const finalHashes = new Set(results.map(({ finalHash }) => finalHash));
  const traceHashes = new Set(results.map(({ traceHash }) => traceHash));
  const eventTypeCounts = aggregateEventCounts(results);
  const equipmentDespawnReasonCounts = aggregateEquipmentDespawnReasonCounts(results);
  const spawnTicks = [...new Set(results.flatMap(({ spawnTicks: values }) => values))]
    .sort((left, right) => left - right);
  const boundaryTicksCovered = [...new Set(results.flatMap(({ boundarySnapshots }) => (
    boundarySnapshots.map(({ tick }) => tick)
  )))].sort((left, right) => left - right);
  const coverage = requiredEventCoverage(
    eventTypeCounts,
    spawnTicks,
    maximumActiveSupplyCount,
  );
  const equipmentDespawnReasonCoverage = requiredEquipmentDespawnReasonCoverage(
    equipmentDespawnReasonCounts,
  );
  const requiredBoundaryTicks = ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PAUSE_BOUNDARY_TICKS
    .filter((tick) => tick !== null) as readonly number[];
  const eventCoveragePassed = Object.values(coverage).every(Boolean)
    && Object.values(equipmentDespawnReasonCoverage).every(Boolean)
    && requiredBoundaryTicks.every((tick) => boundaryTicksCovered.includes(tick));
  const projectionCoverage = terminalProjectionCoverage(results);
  const terminalProjectionCoveragePassed = Object.values(projectionCoverage).every(Boolean);
  const terminalCaseCoveragePassed = results.every((result) => (
    hasFormalSurvivalBotCaseSpawnCoverage(result.spawnCountsByTick)
    && (result.eventTypeCounts[ARENA_MATCH_EVENT.MATCH_ENDED] ?? 0) > 0
  ));
  const executionPassed = results.length === request.caseCount
    && inspection.uniqueCaseIdentityCount === request.caseCount
    && maximumWorldEquipmentCount <= resourceLimits.maximumWorldEquipmentCount
    && maximumRuntimeCount <= resourceLimits.maximumRuntimeCount
    && maximumActiveSupplyCount
      <= ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.maximumActiveSupplyCount
    && maximumEventsPerTick
      <= ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.maximumEventsPerTick
    && results.every(({ finalTick }) => (
      finalTick >= 2_401 && finalTick <= request.hardLimitTicks
    ))
    && results.every(({ pa7DoubleRunSummary, pa7CaseEvidence }) => (
      pa7DoubleRunSummary !== null && pa7CaseEvidence !== null
    ))
    && terminalCaseCoveragePassed;
  const minimumUniqueFinalHashes = Math.min(
    ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.minimumUniqueFinalHashes,
    inspection.actualUniqueSeedCount,
  );
  const formalGateEligible = formalRequest
    && inspection.actualCaseCount === 300
    && inspection.actualUniqueSeedCount >= 120
    && inspection.uniqueCaseIdentityCount === 300
    && traceHashes.size === 300
    && finalHashes.size >= minimumUniqueFinalHashes
    && eventCoveragePassed
    && Object.values(equipmentDespawnReasonCoverage).every(Boolean)
    && terminalCaseCoveragePassed
    && terminalProjectionCoveragePassed
    && maximumWorldEquipmentCount <= resourceLimits.maximumWorldEquipmentCount
    && maximumRuntimeCount <= resourceLimits.maximumRuntimeCount;
  const performancePassed = heapGrowthBytes
    <= ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES
    && cpuP95MsPerTick <= ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK / 1_000;
  const formalGatePassed = formalGateEligible && executionPassed && performancePassed;
  const formalFailureReasons: string[] = [];
  if (!formalGateEligible) formalFailureReasons.push('formal request/identity/coverage eligibility not met');
  if (!executionPassed) formalFailureReasons.push('execution invariant or case completion failed');
  if (!performancePassed) formalFailureReasons.push('CPU or heap budget failed');
  const orderedResults = Object.freeze([...results]);
  const stableEvidenceResults = orderedResults.map((result) => ({
    caseId: result.caseId,
    caseIdentity: result.caseIdentity,
    seed: result.seed,
    difficultyId: result.difficultyId,
    inputPlanId: result.inputPlanId,
    traceHash: result.traceHash,
    finalHash: result.finalHash,
    finalTick: result.finalTick,
    totalEvents: result.totalEvents,
    maximumWorldEquipmentCount: result.maximumWorldEquipmentCount,
    maximumRuntimeCount: result.maximumRuntimeCount,
    maximumActiveSupplyCount: result.maximumActiveSupplyCount,
    maximumEventsPerTick: result.maximumEventsPerTick,
    pauseSteps: result.pauseSteps,
    pauseAtTick: result.pauseAtTick,
    pausePreservedTick: result.pausePreservedTick,
    pauseRecoveryTick: result.pauseRecoveryTick,
    eventTypeCounts: result.eventTypeCounts,
    equipmentDespawnReasonCounts: result.equipmentDespawnReasonCounts,
    spawnCountsByTick: result.spawnCountsByTick,
    spawnTicks: result.spawnTicks,
    boundarySnapshots: result.boundarySnapshots,
  }));
  const resultManifestHash = createDeterministicDataHash(
    stableEvidenceResults,
    'formal survival Bot result manifest',
  );
  const evidenceHash = createDeterministicDataHash({
    manifestHash,
    definitionHash,
    configHash,
    resultManifestHash,
    eventTypeCounts,
    equipmentDespawnReasonCounts,
    eventCoverage: coverage,
    equipmentDespawnReasonCoverage,
    terminalCoverage: {
      allCasesEnded: results.every(({ finalTick }) => (
        finalTick >= 2_401 && finalTick <= request.hardLimitTicks
      )),
      matchEndedEvents: eventTypeCounts[ARENA_MATCH_EVENT.MATCH_ENDED] ?? 0,
      spawnAt1200: coverage.spawnAt1200 ?? false,
      spawnAt2400: coverage.spawnAt2400 ?? false,
      activeSupplyReached3: coverage.activeSupplyReached3 ?? false,
    },
    terminalProjectionCoverage: projectionCoverage,
    boundaryTicksCovered,
    maximumWorldEquipmentCount,
    maximumRuntimeCount,
    maximumWorldEquipmentLimit: resourceLimits.maximumWorldEquipmentCount,
    maximumRuntimeLimit: resourceLimits.maximumRuntimeCount,
  }, 'formal survival Bot evidence');
  const status = classifyFormalSurvivalBotPressureStatus({
    formalRequest,
    executionPassed,
    formalGatePassed,
  });
  const executedTotalTicks = canonicalTotalTicks * 2;
  const executedTotalEvents = canonicalTotalEvents * 2;
  const report = Object.freeze({
    status,
    executionPassed,
    formalRequest,
    formalGateEligible,
    formalGatePassed,
    formalFailureReasons: Object.freeze(formalFailureReasons),
    manifestId: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_MANIFEST_ID,
    manifestHash,
    definitionHash,
    configHash,
    evidenceHash,
    resultManifestHash,
    requestedCaseCount: request.caseCount,
    requestedUniqueSeedCount: request.uniqueSeedCount,
    requestedHardLimitTicks: request.hardLimitTicks,
    actualCaseCount: inspection.actualCaseCount,
    actualUniqueSeedCount: inspection.actualUniqueSeedCount,
    uniqueCaseIdentityCount: inspection.uniqueCaseIdentityCount,
    completedCases: results.length,
    canonicalTotalTicks,
    executedTotalTicks,
    canonicalTotalEvents,
    executedTotalEvents,
    uniqueFinalHashes: finalHashes.size,
    uniqueTraceHashes: traceHashes.size,
    minimumUniqueFinalHashes,
    maximumWorldEquipmentCount,
    maximumWorldEquipmentLimit: resourceLimits.maximumWorldEquipmentCount,
    maximumRuntimeCount,
    maximumRuntimeLimit: resourceLimits.maximumRuntimeCount,
    maximumActiveSupplyCount,
    maximumEventsPerTick,
    maximumPauseSteps,
    heapGrowthBytes,
    heapGrowthBudgetBytes: ARENA_PA7_FORMAL_HEAP_GROWTH_BUDGET_BYTES,
    cpuBudgetMsPerTick: ARENA_PA7_FORMAL_CPU_BUDGET_MICROS_PER_TICK / 1_000,
    cpuP95MsPerTick,
    cpuWorstMsPerTick,
    cpuTotalMicros,
    cpuMicrosPerTickSamples: Object.freeze(cpuMicrosPerTickSamples),
    processCpuTotalMicros,
    processCpuMicrosPerTickSamples: Object.freeze(processCpuMicrosPerTickSamples),
    heapBaselineBytes: initialHeap,
    heapPeakBytes,
    heapEndingBytes,
    eventTypeCounts,
    eventCoverage: coverage,
    equipmentDespawnReasonCounts,
    equipmentDespawnReasonCoverage,
    terminalCoverage: Object.freeze({
      allCasesEnded: results.every(({ finalTick }) => (
        finalTick >= 2_401 && finalTick <= request.hardLimitTicks
      )),
      matchEndedEvents: eventTypeCounts[ARENA_MATCH_EVENT.MATCH_ENDED] ?? 0,
      spawnAt1200: coverage.spawnAt1200 ?? false,
      spawnAt2400: coverage.spawnAt2400 ?? false,
      activeSupplyReached3: coverage.activeSupplyReached3 ?? false,
    }),
    terminalProjectionCoverage: projectionCoverage,
    boundaryTicksCovered: Object.freeze(boundaryTicksCovered),
    caseResults: orderedResults,
    wallDurationMs: performance.now() - startedAt,
  });
  return report;
}

export function runFormalSurvivalBotPressure(options: {
  readonly caseCount?: number;
  readonly uniqueSeedCount?: number;
  readonly hardLimitTicks?: number;
} = {}): FormalSurvivalBotPressureReport {
  return runFormalSurvivalBotPressureInternal(options);
}

export const ARENA_PA7_PROGRESS_HEARTBEAT_TICKS = 600 as const;
export const ARENA_PA7_PROGRESS_HEARTBEAT_MILLIS = 1_000 as const;

interface ArenaPa7ProgressControllerV1 {
  readonly observer: ArenaPa7FormalExecutionObserverV1;
  readonly current: () => ArenaPa7FormalProgressV1;
}

function assertArenaPa7FormalProgressTransitionV1(
  previous: ArenaPa7FormalProgressV1,
  current: ArenaPa7FormalProgressV1,
): void {
  if (current.runToken !== previous.runToken
    || current.sequence !== previous.sequence + 1
    || current.completedCases < previous.completedCases
    || current.completedCases > previous.completedCases + 1
    || current.completedCases > ARENA_PA7_FORMAL_REQUEST_V1.caseCount
    || (current.currentTick !== null && (
      !Number.isSafeInteger(current.currentTick)
      || current.currentTick < 0
      || current.currentTick > ARENA_PA7_FORMAL_REQUEST_V1.hardLimitTicks
    ))) {
    throw new Error('PA7 progress token/sequence/case/tick 非法前进。');
  }
  const currentFields = [
    current.currentCaseIndex,
    current.currentCaseId,
    current.currentPass,
    current.currentTick,
  ];
  if (currentFields.some((item) => item === null)
    && currentFields.some((item) => item !== null)) {
    throw new Error('PA7 progress current identity 必须全空或全存在。');
  }
  if (current.currentCaseIndex !== null
    && (current.currentCaseIndex !== current.completedCases
      || current.currentCaseId
        !== `formal-survival-bot-${String(current.currentCaseIndex).padStart(3, '0')}`)) {
    throw new Error('PA7 progress current case identity 与 completedCases 不一致。');
  }
  if (current.completedCases === previous.completedCases) {
    if (current.lastCommittedCaseEvidenceHash !== previous.lastCommittedCaseEvidenceHash
      || current.currentCaseIndex !== previous.currentCaseIndex
      || current.currentCaseId !== previous.currentCaseId
      || previous.currentPass === null
      || current.currentPass === null
      || previous.currentTick === null
      || current.currentTick === null) {
      throw new Error('PA7 progress 同 case identity/commit 漂移。');
    }
    if (current.currentPass === previous.currentPass) {
      if (current.currentTick !== previous.currentTick + 1) {
        throw new Error('PA7 progress 同 pass tick 必须严格 +1。');
      }
    } else if (previous.currentPass !== 1
      || current.currentPass !== 2
      || current.currentTick !== 0
      || previous.currentTick < 2_401) {
      throw new Error('PA7 progress 只能在合法终局从 pass1 切到 pass2 tick0。');
    }
    return;
  }
  if (current.lastCommittedCaseEvidenceHash === previous.lastCommittedCaseEvidenceHash
    || previous.currentPass !== 2
    || previous.currentTick === null
    || previous.currentTick < 2_401) {
    throw new Error('PA7 progress 只能在 pass2 合法终局提交新 case hash。');
  }
  if (current.completedCases === ARENA_PA7_FORMAL_REQUEST_V1.caseCount) {
    if (currentFields.some((item) => item !== null)) {
      throw new Error('PA7 progress 最终完成后 current identity 必须清空。');
    }
  } else if (current.currentPass !== 1 || current.currentTick !== 0) {
    throw new Error('PA7 progress 新 case 必须从 pass1 tick0 开始。');
  }
}

export function createArenaPa7FormalProgressControllerV1(options: {
  readonly runToken: string;
  readonly writeProgress: (progress: ArenaPa7FormalProgressV1) => void;
  readonly now?: () => number;
  readonly heartbeatTicks?: number;
  readonly heartbeatMillis?: number;
}): ArenaPa7ProgressControllerV1 {
  if (typeof options.runToken !== 'string' || options.runToken.trim().length === 0) {
    throw new TypeError('PA7 worker run token 必须是非空字符串。');
  }
  if (typeof options.writeProgress !== 'function') {
    throw new TypeError('PA7 worker progress writer 不存在。');
  }
  const now = options.now ?? (() => performance.now());
  const heartbeatTicks = options.heartbeatTicks ?? ARENA_PA7_PROGRESS_HEARTBEAT_TICKS;
  const heartbeatMillis = options.heartbeatMillis ?? ARENA_PA7_PROGRESS_HEARTBEAT_MILLIS;
  if (!Number.isSafeInteger(heartbeatTicks) || heartbeatTicks < 1
    || !Number.isFinite(heartbeatMillis) || heartbeatMillis <= 0) {
    throw new RangeError('PA7 worker heartbeat 配置非法。');
  }
  let progress: ArenaPa7FormalProgressV1 = Object.freeze({
    runToken: options.runToken,
    sequence: 0,
    completedCases: 0,
    currentCaseIndex: 0,
    currentCaseId: 'formal-survival-bot-000',
    currentPass: 1,
    currentTick: 0,
    lastCommittedCaseEvidenceHash: null,
  });
  validateArenaPa7FormalProgressSequenceV1([progress]);
  let lastPublishedTick = 0;
  let lastPublishedAt = now();
  options.writeProgress(progress);

  const advance = (next: ArenaPa7FormalProgressV1, forcePublish: boolean): void => {
    assertArenaPa7FormalProgressTransitionV1(progress, next);
    progress = next;
    const currentTime = now();
    const currentTick = progress.currentTick ?? lastPublishedTick;
    if (forcePublish
      || currentTick - lastPublishedTick >= heartbeatTicks
      || currentTime - lastPublishedAt >= heartbeatMillis) {
      options.writeProgress(progress);
      lastPublishedTick = currentTick;
      lastPublishedAt = currentTime;
    }
  };

  const observer: ArenaPa7FormalExecutionObserverV1 = Object.freeze({
    onAuthorityTick: (caseIndex: number, pass: 1 | 2, tick: number) => {
      if (progress.currentCaseIndex !== caseIndex || progress.currentPass !== pass
        || progress.currentTick === null || tick !== progress.currentTick + 1) {
        throw new Error('PA7 worker authority tick progress 漂移。');
      }
      advance(Object.freeze({ ...progress, sequence: progress.sequence + 1, currentTick: tick }), false);
    },
    onSecondPassStarted: (caseIndex: number, caseId: string) => {
      if (progress.currentCaseIndex !== caseIndex || progress.currentCaseId !== caseId
        || progress.currentPass !== 1 || progress.currentTick === null) {
        throw new Error('PA7 worker pass2 transition identity 漂移。');
      }
      advance(Object.freeze({
        ...progress,
        sequence: progress.sequence + 1,
        currentPass: 2,
        currentTick: 0,
      }), true);
    },
    onCaseCommitted: (
      caseIndex: number,
      evidence: ArenaPa7FormalCaseEvidenceV1,
      nextCase: FormalSurvivalBotCase | null,
    ) => {
      if (progress.currentCaseIndex !== caseIndex || progress.currentPass !== 2
        || progress.currentTick === null || evidence.caseIndex !== caseIndex) {
        throw new Error('PA7 worker case commit identity 漂移。');
      }
      const completedCases = caseIndex + 1;
      advance(Object.freeze({
        runToken: progress.runToken,
        sequence: progress.sequence + 1,
        completedCases,
        currentCaseIndex: nextCase?.caseId === undefined ? null : completedCases,
        currentCaseId: nextCase?.caseId ?? null,
        currentPass: nextCase === null ? null : 1,
        currentTick: nextCase === null ? null : 0,
        lastCommittedCaseEvidenceHash: evidence.caseEvidenceHash,
      }), true);
    },
  });
  return Object.freeze({ observer, current: () => progress });
}

interface ArenaPa7AtomicProgressDependenciesV1 {
  readonly rename?: typeof renameSync;
}

export function createArenaPa7AtomicProgressWriterV1(
  progressPathValue: string,
  dependencies: ArenaPa7AtomicProgressDependenciesV1 = {},
): (progress: ArenaPa7FormalProgressV1) => void {
  if (typeof progressPathValue !== 'string' || !path.isAbsolute(progressPathValue)) {
    throw new TypeError('ARENA_PA7_PROGRESS_PATH 必须是绝对路径。');
  }
  const parentLexical = path.dirname(path.resolve(progressPathValue));
  const parent = realpathSync(parentLexical);
  if (parent !== parentLexical) throw new Error('PA7 progress parent 必须使用 canonical path。');
  const progressPath = path.join(parent, path.basename(progressPathValue));
  const temporaryPath = `${progressPath}.tmp`;
  const rename = dependencies.rename ?? renameSync;
  return (progress: ArenaPa7FormalProgressV1): void => {
    validateArenaPa7FormalProgressSequenceV1([progress]);
    try {
      const target = lstatSync(progressPath);
      if (!target.isFile() || target.isSymbolicLink()) {
        throw new Error('PA7 progress target 必须是普通文件。');
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    let descriptor: number | null = null;
    let temporaryCreated = false;
    try {
      descriptor = openSync(
        temporaryPath,
        fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW,
        0o600,
      );
      temporaryCreated = true;
      writeFileSync(descriptor, `${JSON.stringify(progress)}\n`, 'utf8');
      fsyncSync(descriptor);
      closeSync(descriptor);
      descriptor = null;
      rename(temporaryPath, progressPath);
      temporaryCreated = false;
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      if (descriptor !== null) {
        try { closeSync(descriptor); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      }
      if (temporaryCreated) {
        try { unlinkSync(temporaryPath); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      }
      if (cleanupErrors.length > 0) {
        throw new AggregateError([error, ...cleanupErrors], 'PA7 progress 发布与临时文件清理同时失败。');
      }
      throw error;
    }
  };
}

function percentile(values: readonly number[], quantile: number): number {
  if (values.length === 0 || values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('PA7 measurement samples 必须是非空有限非负数。');
  }
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.min(
    ordered.length - 1,
    Math.ceil(ordered.length * quantile) - 1,
  ))]!;
}

function createArenaPa7ScheduleDefinitionHashV1(): string {
  const frame = (tick: number, phase: string) => ({ worldSnapshot: { tick, phase } }) as never;
  const schedule = createArenaReadStepScheduleV2();
  const fixed: unknown[] = [schedule.initial(frame(0, 'running'))];
  for (let tick = 1; tick <= ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.hardLimitTicks; tick += 1) {
    const decision = schedule.afterStep(frame(tick - 1, 'running'), frame(tick, 'running'), []);
    if (decision !== null) fixed.push(decision);
  }
  const eventReasons = ARENA_READ_STEP_EVENT_TYPES.map((type) => {
    const eventSchedule = createArenaReadStepScheduleV2();
    return Object.freeze({
      type,
      decision: eventSchedule.afterStep(frame(0, 'running'), frame(1, 'running'), [{ type }] as never),
    });
  });
  const phaseSchedule = createArenaReadStepScheduleV2();
  return createDeterministicDataHash({
    fixed,
    eventReasons,
    phaseTransition: phaseSchedule.afterStep(
      frame(0, 'running'),
      frame(1, 'sudden-death'),
      [],
    ),
  }, 'PA7 readStep schedule definition');
}

interface ArenaPa7FormalPayloadMetricsV1 {
  readonly cpuTotalMicros: number;
  readonly cpuMicrosPerTickSamples: readonly number[];
  readonly wallDurationMillis: number;
  readonly heapBaselineBytes: number;
  readonly heapPeakBytes: number;
  readonly heapEndingBytes: number;
}

interface ArenaPa7FormalCompositionEvidenceV1 {
  readonly caseId: string;
  readonly identity: ArenaV2SurvivalSupplyBotCompositionIdentityV1;
}

const PA7_RESOURCE_NAMES = Object.freeze([
  'worldEquipmentCount',
  'runtimeEquipmentCount',
  'activeSupplyCount',
  'eventsPerTick',
  'eventWindowCount',
  'readerCount',
  'sessionCount',
] as const);

function aggregatePa7CountRecord(
  cases: readonly ArenaPa7FormalCaseEvidenceV1[],
  keys: readonly string[],
  field: 'requiredEventTypeCounts' | 'equipmentDespawnReasonCounts',
): Readonly<Record<string, number>> {
  return Object.freeze(Object.fromEntries(keys.map((key) => [
    key,
    cases.reduce((sum, item) => sum + item[field][key]!, 0),
  ])));
}

function aggregatePa7Cleanup(
  cases: readonly ArenaPa7FormalCaseEvidenceV1[],
): ArenaPa7FormalCaseCleanupV1 {
  return Object.freeze({
    sessionsCreated: cases.reduce((sum, item) => sum + item.cleanup.sessionsCreated, 0),
    sessionDestroyAttempts: cases.reduce(
      (sum, item) => sum + item.cleanup.sessionDestroyAttempts,
      0,
    ),
    sessionsDestroyed: cases.reduce((sum, item) => sum + item.cleanup.sessionsDestroyed, 0),
    readersCreated: cases.reduce((sum, item) => sum + item.cleanup.readersCreated, 0),
    readersInvalidated: cases.reduce((sum, item) => sum + item.cleanup.readersInvalidated, 0),
    pendingCleanupCount: cases.reduce((sum, item) => sum + item.cleanup.pendingCleanupCount, 0),
    cleanupErrorCount: cases.reduce((sum, item) => sum + item.cleanup.cleanupErrorCount, 0),
  });
}

function lifecycleBoundaryAt(
  evidence: ArenaPa7FormalCaseEvidenceV1,
  waveIndex: number,
  lifecycleOffset: number,
) {
  const boundary = evidence.lifecycleBoundaries.find((candidate) => (
    candidate.waveIndex === waveIndex && candidate.lifecycleOffset === lifecycleOffset
  ));
  if (boundary === undefined) {
    throw new Error(`${evidence.caseId} 缺少 lifecycle ${waveIndex}:${lifecycleOffset}。`);
  }
  return boundary;
}

function aggregatePa7ResourcePeaks(
  cases: readonly ArenaPa7FormalCaseEvidenceV1[],
): ArenaPa7FormalResourcePeaksV1 {
  if (cases.length === 0) throw new Error('PA7 payload 缺少 case evidence。');
  return Object.freeze(Object.fromEntries(PA7_RESOURCE_NAMES.map((resource) => {
    const limit = cases[0]!.resourcePeaks[resource].limit;
    if (cases.some((item) => item.resourcePeaks[resource].limit !== limit)) {
      throw new Error(`PA7 payload resource ${resource} limit 漂移。`);
    }
    return [resource, Object.freeze({
      observed: Math.max(...cases.map((item) => item.resourcePeaks[resource].observed)),
      limit,
    })];
  }))) as unknown as ArenaPa7FormalResourcePeaksV1;
}

function assertFormalCompositionEvidence(
  manifest: FormalSurvivalBotPressureManifest,
  compositionEvidence: readonly ArenaPa7FormalCompositionEvidenceV1[],
): void {
  if (compositionEvidence.length !== manifest.cases.length) {
    throw new Error('PA7 composition evidence 数量与 manifest 不一致。');
  }
  const mapDefinitionIds = new Set<string>();
  for (const [index, item] of compositionEvidence.entries()) {
    const expectedCase = manifest.cases[index]!;
    if (item.caseId !== expectedCase.caseId
      || item.identity.schemaVersion !== 1
      || item.identity.compositionId !== 'arena-v2-survival-supply.v1'
      || typeof item.identity.mapDefinitionId !== 'string'
      || item.identity.mapDefinitionId.trim().length === 0
      || item.identity.participantIds.length !== 2
      || item.identity.participantIds[0] !== 'player-1'
      || item.identity.participantIds[1] !== 'player-2'
      || (item.identity.contentSelectionHash !== null
        && !/^[0-9a-f]{8}$/.test(item.identity.contentSelectionHash))
      || !/^[0-9a-f]{8}$/.test(item.identity.compositionContractHash)) {
      throw new Error(`${expectedCase.caseId} composition provenance 不符合正式 Session 合同。`);
    }
    mapDefinitionIds.add(item.identity.mapDefinitionId);
  }
  if (mapDefinitionIds.size !== 1) {
    throw new Error('PA7 composition provenance 的 map identity 跨 case 漂移。');
  }
}

/**
 * Pure payload assembly used by the formal worker and by reduced, non-performance
 * contract tests. Every semantic claim is revalidated by the frozen PA7 contract.
 */
export function createArenaPa7FormalRunPayloadFromEvidenceV1(options: {
  readonly runToken: string;
  readonly loaderAttestationHash: string;
  readonly manifest: FormalSurvivalBotPressureManifest;
  readonly progressFinal: ArenaPa7FormalProgressV1;
  readonly caseEvidence: readonly ArenaPa7FormalCaseEvidenceV1[];
  readonly compositionEvidence: readonly ArenaPa7FormalCompositionEvidenceV1[];
  readonly metrics: ArenaPa7FormalPayloadMetricsV1;
}): ArenaPa7FormalRunPayloadV1 {
  if (!SHA256_PATTERN.test(options.loaderAttestationHash)) {
    throw new TypeError('PA7 loader attestation hash 必须是 64 位小写 SHA-256。');
  }
  const manifest = options.manifest;
  if (manifest.caseCount !== ARENA_PA7_FORMAL_REQUEST_V1.caseCount
    || manifest.uniqueSeedCount !== ARENA_PA7_FORMAL_REQUEST_V1.uniqueSeedCount
    || manifest.hardLimitTicks !== ARENA_PA7_FORMAL_REQUEST_V1.hardLimitTicks) {
    throw new Error('PA7 payload 仅接受冻结 300/120/2500 manifest。');
  }
  const cases = Object.freeze(options.caseEvidence.map((item, index) => {
    const evidence = validateArenaPa7FormalCaseEvidenceV1(item);
    const expected = manifest.cases[index];
    if (expected === undefined
      || evidence.caseIndex !== index
      || evidence.caseId !== expected.caseId
      || evidence.caseIdentity !== expected.caseIdentity
      || evidence.seed !== expected.seed
      || evidence.difficultyId !== expected.difficultyId
      || evidence.inputPlanId !== expected.inputPlanId
      || evidence.pauseAtTick !== expected.pauseAtTick) {
      throw new Error(`PA7 case evidence[${index}] 与正式 manifest 脱钩。`);
    }
    return evidence;
  }));
  if (cases.length !== manifest.cases.length) {
    throw new Error('PA7 case evidence 数量与正式 manifest 不一致。');
  }
  assertFormalCompositionEvidence(manifest, options.compositionEvidence);

  const canonicalTotalTicks = cases.reduce((sum, item) => sum + item.finalTick, 0);
  const canonicalTotalEvents = cases.reduce((sum, item) => (
    sum + Object.values(item.requiredEventTypeCounts).reduce((eventSum, count) => eventSum + count, 0)
  ), 0);
  const executedTotalTicks = canonicalTotalTicks * ARENA_PA7_FORMAL_DOUBLE_RUN_COUNT;
  const samples = options.metrics.cpuMicrosPerTickSamples;
  if (samples.length !== cases.length * ARENA_PA7_FORMAL_DOUBLE_RUN_COUNT) {
    throw new Error('PA7 CPU sample 数量必须精确等于 case×double-run。');
  }
  const metrics = options.metrics;
  if (!Number.isFinite(metrics.cpuTotalMicros) || metrics.cpuTotalMicros < 0
    || !Number.isFinite(metrics.wallDurationMillis) || metrics.wallDurationMillis < 0
    || !Number.isSafeInteger(metrics.heapBaselineBytes) || metrics.heapBaselineBytes < 0
    || !Number.isSafeInteger(metrics.heapPeakBytes) || metrics.heapPeakBytes < 0
    || !Number.isSafeInteger(metrics.heapEndingBytes) || metrics.heapEndingBytes < 0) {
    throw new Error('PA7 worker measurement 非有限、负数或非安全整数。');
  }

  const lifecycleCoverage = Object.freeze({
    firstWavePickableAt599CaseCount: cases.filter((item) => (
      lifecycleBoundaryAt(item, 0, 599).worldEquipmentInstanceIds.length > 0
    )).length,
    firstWavePendingAt600CaseCount: cases.filter((item) => (
      lifecycleBoundaryAt(item, 0, 600).pendingExpiryEquipmentInstanceIds.length > 0
    )).length,
    firstWaveReadyWithoutPendingAt600CaseCount: cases.filter((item) => {
      const boundary = lifecycleBoundaryAt(item, 0, 600);
      return boundary.pendingExpiryEquipmentInstanceIds.length === 0
        && boundary.resyncReadiness === 'ready';
    }).length,
    firstWaveHeldAt599CaseCount: cases.filter((item) => (
      lifecycleBoundaryAt(item, 0, 599).heldEquipmentInstanceIds.length > 0
    )).length,
    firstWaveRetiredBeforeExpiryCaseCount: cases.filter((item) => (
      lifecycleBoundaryAt(item, 0, 599).retiredEquipmentInstanceIds.length > 0
    )).length,
    postExpiryNoRepeatCaseCount: cases.filter((item) => (
      !lifecycleBoundaryAt(item, 0, 601).authorityEventTypes.includes('EquipmentExpired')
    )).length,
    secondWaveSpawnCaseCount: cases.filter((item) => {
      const boundary = lifecycleBoundaryAt(item, 1, 1);
      return boundary.waveEquipmentInstanceIds.length === 3
        && boundary.authorityEventTypes.includes('EquipmentSpawned');
    }).length,
  });
  const aggregate = Object.freeze({
    canonicalTotalTicks,
    executedTotalTicks,
    canonicalTotalEvents,
    executedTotalEvents: canonicalTotalEvents * ARENA_PA7_FORMAL_DOUBLE_RUN_COUNT,
    uniqueCaseIdentityCount: new Set(cases.map(({ caseIdentity }) => caseIdentity)).size,
    uniqueSeedCount: new Set(cases.map(({ seed }) => seed)).size,
    uniqueInputSequenceHashes: new Set(cases.map(({ inputFrameSequenceHash }) => (
      inputFrameSequenceHash
    ))).size,
    uniqueEventSequenceHashes: new Set(cases.map(({ authorityEventSequenceHash }) => (
      authorityEventSequenceHash
    ))).size,
    uniqueSnapshotSequenceHashes: new Set(cases.map(({ worldSnapshotSequenceHash }) => (
      worldSnapshotSequenceHash
    ))).size,
    uniqueReplayHashes: new Set(cases.map(({ replayV5Hash }) => replayV5Hash)).size,
    uniqueFinalHashes: new Set(cases.map(({ finalHash }) => finalHash)).size,
    eventTypeCounts: aggregatePa7CountRecord(
      cases,
      ARENA_PA7_FORMAL_REQUIRED_EVENT_TYPES,
      'requiredEventTypeCounts',
    ),
    equipmentDespawnReasonCounts: aggregatePa7CountRecord(
      cases,
      ARENA_PA7_FORMAL_EQUIPMENT_DESPAWN_REASONS,
      'equipmentDespawnReasonCounts',
    ),
    lifecycleCoverage,
    resourcePeaks: aggregatePa7ResourcePeaks(cases),
    cpu: Object.freeze({
      totalMicros: metrics.cpuTotalMicros,
      microsPerTick: metrics.cpuTotalMicros / executedTotalTicks,
      p50MicrosPerTick: percentile(samples, 0.5),
      p95MicrosPerTick: percentile(samples, 0.95),
      p99MicrosPerTick: percentile(samples, 0.99),
      wallDurationMillis: metrics.wallDurationMillis,
    }),
    heap: Object.freeze({
      baselineBytes: metrics.heapBaselineBytes,
      peakBytes: metrics.heapPeakBytes,
      endingBytes: metrics.heapEndingBytes,
      deltaBytes: metrics.heapEndingBytes - metrics.heapBaselineBytes,
    }),
  }) satisfies ArenaPa7FormalAggregateV1;
  const cleanup = aggregatePa7Cleanup(cases);
  const manifestHash = createFormalSurvivalBotPressureManifestHash(manifest);
  const definitionHash = createDeterministicDataHash(
    manifest.definition,
    'formal survival Bot supply Definition',
  );
  const configHash = createDeterministicDataHash({
    configTemplate: manifest.configTemplate,
    supply: manifest.supply,
    definitionHash,
    profiles: manifest.profiles,
    profileIds: manifest.profileIds,
    inputPlans: manifest.inputPlans,
    inputPlanIds: manifest.inputPlanIds,
    pauseBoundaryTicks: manifest.pauseBoundaryTicks,
  }, 'formal survival Bot config template');
  const compositionEvidence = options.compositionEvidence.map(({ caseId, identity }) => Object.freeze({
    caseId,
    schemaVersion: identity.schemaVersion,
    compositionId: identity.compositionId,
    participantIds: identity.participantIds,
    mapDefinitionId: identity.mapDefinitionId,
    contentSelectionHash: identity.contentSelectionHash,
    compositionContractHash: identity.compositionContractHash,
  }));
  const withoutSemanticHash = Object.freeze({
    schemaVersion: ARENA_PA7_FORMAL_CONTRACT_SCHEMA_VERSION,
    contractId: ARENA_PA7_FORMAL_CONTRACT_ID,
    runToken: options.runToken,
    request: ARENA_PA7_FORMAL_REQUEST_V1,
    workloadIdentity: Object.freeze({
      productionVariantId: 'C+B+D',
      caseGeneratorRevision: manifestHash,
      participantIds: Object.freeze([...ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PARTICIPANT_IDS]),
      profileIds: Object.freeze([...manifest.profileIds].sort()),
      inputPlanIds: Object.freeze([...manifest.inputPlanIds].sort()),
      pauseAtTicks: Object.freeze(manifest.pauseBoundaryTicks
        .filter((tick): tick is number => tick !== null)
        .sort((left, right) => left - right)),
      loaderAttestationHash: options.loaderAttestationHash,
    }),
    scheduleDefinitionHash: createArenaPa7ScheduleDefinitionHashV1(),
    manifestIdentity: Object.freeze({
      schemaVersion: 1,
      manifestId: manifest.manifestId,
      manifestHash,
      definitionHash,
      configHash,
      contentSelectionHash: createDeterministicDataHash(
        compositionEvidence.map(({ caseId, contentSelectionHash }) => ({
          caseId,
          contentSelectionHash,
        })),
        'PA7 formal composition content selection provenance',
      ),
      compositionContractHash: createDeterministicDataHash(
        compositionEvidence,
        'PA7 formal composition contract provenance',
      ),
    }),
    progressFinal: options.progressFinal,
    caseEvidence: cases,
    aggregate,
    cleanup,
  });
  return validateArenaPa7FormalRunPayloadV1(Object.freeze({
    ...withoutSemanticHash,
    semanticHash: createArenaPa7FormalRunSemanticHashV1(withoutSemanticHash),
  }));
}

export function isArenaPa7FormalWorkerInvocationV1(args: readonly string[]): boolean {
  return args[0] === ARENA_PA7_FORMAL_WORKER_FLAG;
}

function parseArenaPa7FormalWorkerOptionsV1(
  args: readonly string[],
  environment: NodeJS.ProcessEnv,
): Readonly<{
  readonly runToken: string;
  readonly progressPath: string;
  readonly loaderAttestationHash: string;
}> {
  if (args.length !== 3
    || args[0] !== ARENA_PA7_FORMAL_WORKER_FLAG
    || args[1] !== ARENA_PA7_FORMAL_LOADER_ATTESTATION_HASH_FLAG
    || !SHA256_PATTERN.test(args[2]!)) {
    throw new Error('PA7 worker 参数必须精确为 worker flag + loader attestation SHA-256。');
  }
  const runToken = environment[ARENA_PA7_FORMAL_RUN_TOKEN_ENV];
  const progressPath = environment[ARENA_PA7_FORMAL_PROGRESS_PATH_ENV];
  if (typeof runToken !== 'string' || runToken.trim().length === 0) {
    throw new Error(`${ARENA_PA7_FORMAL_RUN_TOKEN_ENV} 缺失或为空。`);
  }
  if (typeof progressPath !== 'string' || !path.isAbsolute(progressPath)) {
    throw new Error(`${ARENA_PA7_FORMAL_PROGRESS_PATH_ENV} 必须是绝对路径。`);
  }
  return Object.freeze({ runToken, progressPath, loaderAttestationHash: args[2]! });
}

export function serializeArenaPa7FormalWorkerPayloadV1(
  value: unknown,
): string {
  return `${JSON.stringify(validateArenaPa7FormalRunPayloadV1(value))}\n`;
}

function runArenaPa7FormalWorkerV1(
  args: readonly string[],
  environment: NodeJS.ProcessEnv,
): string {
  const options = parseArenaPa7FormalWorkerOptionsV1(args, environment);
  const progress = createArenaPa7FormalProgressControllerV1({
    runToken: options.runToken,
    writeProgress: createArenaPa7AtomicProgressWriterV1(options.progressPath),
  });
  const report = runFormalSurvivalBotPressureInternal({
    caseCount: ARENA_PA7_FORMAL_REQUEST_V1.caseCount,
    uniqueSeedCount: ARENA_PA7_FORMAL_REQUEST_V1.uniqueSeedCount,
    hardLimitTicks: ARENA_PA7_FORMAL_REQUEST_V1.hardLimitTicks,
  }, progress.observer);
  if (!report.formalRequest || !report.formalGateEligible || !report.executionPassed
    || report.completedCases !== ARENA_PA7_FORMAL_REQUEST_V1.caseCount) {
    throw new Error('PA7 worker 正式执行未完成 correctness/coverage 合同。');
  }
  const manifest = createFormalSurvivalBotPressureManifest(
    ARENA_PA7_FORMAL_REQUEST_V1.caseCount,
    ARENA_PA7_FORMAL_REQUEST_V1.uniqueSeedCount,
    ARENA_PA7_FORMAL_REQUEST_V1.hardLimitTicks,
  );
  const payload = createArenaPa7FormalRunPayloadFromEvidenceV1({
    runToken: options.runToken,
    loaderAttestationHash: options.loaderAttestationHash,
    manifest,
    progressFinal: progress.current(),
    caseEvidence: report.caseResults.map(({ pa7CaseEvidence, caseId }) => {
      if (pa7CaseEvidence === null) throw new Error(`${caseId} 缺少 PA7 case evidence。`);
      return pa7CaseEvidence;
    }),
    compositionEvidence: report.caseResults.map(({ caseId, compositionIdentity }) => Object.freeze({
      caseId,
      identity: compositionIdentity,
    })),
    metrics: Object.freeze({
      cpuTotalMicros: report.processCpuTotalMicros,
      cpuMicrosPerTickSamples: report.processCpuMicrosPerTickSamples,
      wallDurationMillis: report.wallDurationMs,
      heapBaselineBytes: report.heapBaselineBytes,
      heapPeakBytes: report.heapPeakBytes,
      heapEndingBytes: report.heapEndingBytes,
    }),
  });
  assert.deepEqual(progress.current(), payload.progressFinal, 'PA7 worker progress/payload 终态漂移');
  return serializeArenaPa7FormalWorkerPayloadV1(payload);
}

async function main(): Promise<void> {
  const options = parseArenaStressIntegerOptions(process.argv.slice(2), {
    matches: {
      fallback: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.caseCount,
      minimum: 1,
      maximum: 100_000,
    },
    'seed-count': {
      fallback: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.uniqueSeedCount,
      minimum: 1,
      maximum: 100_000,
    },
    'hard-limit-ticks': {
      fallback: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.hardLimitTicks,
      minimum: 2_401,
      maximum: 1_000_000,
    },
  });
  if (options.matches === 300 && options['seed-count'] < 120) {
    throw new RangeError('正式 300-case 门必须至少使用 120 个唯一 seed。');
  }
  const report = runFormalSurvivalBotPressure({
    caseCount: options.matches,
    uniqueSeedCount: options['seed-count'],
    hardLimitTicks: options['hard-limit-ticks'],
  });
  console.log(JSON.stringify(report, null, 2));
  if (
    !report.executionPassed
    || (report.formalRequest && !report.formalGatePassed)
  ) process.exitCode = 1;
}

const invokedScript = process.argv[1] === undefined
  ? false
  : pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedScript) {
  const args = process.argv.slice(2);
  if (isArenaPa7FormalWorkerInvocationV1(args)) {
    try {
      process.stdout.write(runArenaPa7FormalWorkerV1(args, process.env));
    } catch {
      process.exitCode = 1;
    }
  } else {
    void main().catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
  }
}
