import assert from 'node:assert/strict';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import {
  BOT_PROFILE_REGISTRY,
} from '@number-strategy-jump/arena-bot';
import {
  ARENA_MATCH_EVENT,
  ARENA_MATCH_PHASE,
  type ArenaAuthorityEvent,
  type ArenaReplay,
} from '@number-strategy-jump/arena-match';
import {
  createDeterministicDataHash,
  createNeutralInputFrame,
  type ArenaInputFrame,
  type ArenaMatchSnapshot,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV2SurvivalSupplyBotSession,
} from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import { parseArenaStressIntegerOptions } from './arena-stress-cli.js';

export const ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_MANIFEST_ID =
  'arena.p1.formal-survival-bot-pressure.v1';
export const ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS = Object.freeze({
  caseCount: 300,
  uniqueSeedCount: 120,
  hardLimitTicks: 2_500,
  cpuBudgetMsPerTick: 0.25,
  heapGrowthBudgetBytes: 32 * 1024 * 1024,
  maximumRuntimeCount: 3,
  maximumActiveSupplyCount: 3,
  maximumEventsPerTick: 10,
  minimumUniqueFinalHashes: 120,
});

const SEED_BASE = 0x6b000000;
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
  readonly maximumRuntimeCount: number;
  readonly maximumActiveSupplyCount: number;
  readonly maximumEventsPerTick: number;
  readonly pauseSteps: number;
  readonly pauseAtTick: number | null;
  readonly pausePreservedTick: number | null;
  readonly pauseRecoveryTick: number | null;
  readonly cpuMsPerTick: number;
  readonly eventTypeCounts: Readonly<Record<string, number>>;
  readonly spawnTicks: readonly number[];
  readonly boundarySnapshots: readonly FormalSurvivalBotBoundarySnapshot[];
}

export interface FormalSurvivalBotBoundarySnapshot {
  readonly tick: number;
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
  readonly maximumRuntimeCount: number;
  readonly maximumActiveSupplyCount: number;
  readonly maximumEventsPerTick: number;
  readonly pauseSteps: number;
  readonly pauseAtTick: number | null;
  readonly pausePreservedTick: number | null;
  readonly pauseRecoveryTick: number | null;
  readonly cpuMsPerTick: number;
  readonly eventTypeCounts: Readonly<Record<string, number>>;
  readonly spawnTicks: readonly number[];
  readonly boundarySnapshots: readonly FormalSurvivalBotBoundarySnapshot[];
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

function publicSnapshotProjection(snapshot: ArenaMatchSnapshot): Readonly<Record<string, unknown>> {
  return {
    tick: snapshot.tick,
    eventSequence: snapshot.eventSequence,
    phase: snapshot.phase,
    participants: snapshot.participants,
    equipment: snapshot.equipment,
    activeSupplyProjection: snapshot.activeSupplyProjection,
  };
}

function publicSnapshotHash(snapshot: ArenaMatchSnapshot): string {
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

function boundarySnapshot(snapshot: ArenaMatchSnapshot): FormalSurvivalBotBoundarySnapshot {
  const projection = snapshot.activeSupplyProjection;
  return Object.freeze({
    tick: snapshot.tick,
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

function assertBoundarySemantics(snapshot: ArenaMatchSnapshot): void {
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
  snapshot: ArenaMatchSnapshot,
  events: readonly ArenaAuthorityEvent[],
  expectedTick: number,
): void {
  assertFinite(snapshot);
  assert.equal(snapshot.tick, expectedTick);
  assert.ok(snapshot.equipment.length <= ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.maximumRuntimeCount);
  assert.ok(
    (snapshot.activeSupplyProjection?.supplies.length ?? 0)
      <= ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.maximumActiveSupplyCount,
  );
  assert.ok(events.length <= ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.maximumEventsPerTick);
  assert.ok(Number.isSafeInteger(snapshot.eventSequence));
}

function runCase(plan: FormalSurvivalBotCase, hardLimitTicks: number): FormalSurvivalBotRunTrace {
  const session = createSession(plan, hardLimitTicks);
  const publicSnapshotHashes: string[] = [];
  let pauseSteps = 0;
  let maximumRuntimeCount = 0;
  let maximumActiveSupplyCount = 0;
  let maximumEventsPerTick = 0;
  let totalEvents = 0;
  let cpuMicros = 0;
  let pausePreservedTick: number | null = null;
  let pauseRecoveryTick: number | null = null;
  const boundarySnapshots = new Map<number, FormalSurvivalBotBoundarySnapshot>();
  const recordBoundary = (snapshot: ArenaMatchSnapshot): void => {
    assertBoundarySemantics(snapshot);
    if ([1_199, 1_200, 1_201, 1_799, 1_800, 1_801, 2_399, 2_400, 2_401]
      .includes(snapshot.tick)) {
      boundarySnapshots.set(snapshot.tick, boundarySnapshot(snapshot));
    }
  };
  try {
    session.start();
    while (session.state !== 'ended') {
      const before = session.getSnapshot();
      recordBoundary(before);
      if (plan.pauseAtTick === before.tick) {
        session.setPaused(true);
        const paused = session.step(inputForCase(before.tick, plan));
        assert.deepEqual(paused.events, []);
        assert.equal(paused.input, null);
        assert.equal(paused.snapshot.tick, before.tick);
        assert.equal(publicSnapshotHash(paused.snapshot), publicSnapshotHash(before));
        pausePreservedTick = paused.snapshot.tick;
        recordBoundary(paused.snapshot);
        pauseSteps += 1;
        session.setPaused(false);
      }
      const current = session.getSnapshot();
      const cpuStart = process.cpuUsage();
      const result = session.step(inputForCase(current.tick, plan));
      const cpu = process.cpuUsage(cpuStart);
      cpuMicros += cpu.user + cpu.system;
      const expectedTick = current.tick + 1;
      assertRunInvariants(result.snapshot, result.events, expectedTick);
      if (pausePreservedTick !== null && pauseRecoveryTick === null) {
        assert.equal(result.snapshot.tick, pausePreservedTick + 1);
        pauseRecoveryTick = result.snapshot.tick;
      }
      recordBoundary(result.snapshot);
      publicSnapshotHashes.push(publicSnapshotHash(result.snapshot));
      totalEvents += result.events.length;
      maximumEventsPerTick = Math.max(maximumEventsPerTick, result.events.length);
      maximumRuntimeCount = Math.max(maximumRuntimeCount, result.snapshot.equipment.length);
      maximumActiveSupplyCount = Math.max(
        maximumActiveSupplyCount,
        result.snapshot.activeSupplyProjection?.supplies.length ?? 0,
      );
    }
    const replay = session.exportReplay();
    assert.equal(replay.replaySchemaVersion, 5);
    assert.equal(replay.inputFrames.length, publicSnapshotHashes.length * 2);
    assert.equal(replay.events.length, totalEvents);
    assert.equal(session.getSnapshot().phase, ARENA_MATCH_PHASE.ENDED);
    assert.match(replay.finalHash, /^[0-9a-f]{8}$/);
    const ticks = Math.max(1, publicSnapshotHashes.length);
    return Object.freeze({
      inputFrames: replay.inputFrames,
      events: replay.events,
      publicSnapshotHashes: Object.freeze(publicSnapshotHashes),
      checkpointHashes: Object.freeze(replay.checkpoints.map(({ hash }) => hash)),
      finalHash: replay.finalHash,
      result: replay.result,
      finalTick: session.getSnapshot().tick,
      totalEvents,
      maximumRuntimeCount,
      maximumActiveSupplyCount,
      maximumEventsPerTick,
      pauseSteps,
      pauseAtTick: plan.pauseAtTick,
      pausePreservedTick,
      pauseRecoveryTick,
      cpuMsPerTick: (cpuMicros / 1_000) / ticks,
      eventTypeCounts: countEvents(replay.events),
      spawnTicks: Object.freeze([...new Set(
        replay.events
          .filter(({ type }) => type === ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED)
          .map(({ tick }) => tick),
      )].sort((left, right) => left - right)),
      boundarySnapshots: Object.freeze(
        [...boundarySnapshots.values()].sort((left, right) => left.tick - right.tick),
      ),
    });
  } finally {
    session.destroy();
    session.destroy();
  }
}

function compareTraces(
  plan: FormalSurvivalBotCase,
  first: FormalSurvivalBotRunTrace,
  second: FormalSurvivalBotRunTrace,
  hardLimitTicks: number,
): FormalSurvivalBotCaseResult {
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
  assert.equal(first.finalTick, hardLimitTicks);
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
    eventTypeCounts: first.eventTypeCounts,
    spawnTicks: first.spawnTicks,
    boundarySnapshots: first.boundarySnapshots,
  });
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
  readonly maximumRuntimeCount: number;
  readonly maximumActiveSupplyCount: number;
  readonly maximumEventsPerTick: number;
  readonly maximumPauseSteps: number;
  readonly heapGrowthBytes: number;
  readonly heapGrowthBudgetBytes: number;
  readonly cpuBudgetMsPerTick: number;
  readonly cpuP95MsPerTick: number;
  readonly cpuWorstMsPerTick: number;
  readonly eventTypeCounts: Readonly<Record<string, number>>;
  readonly eventCoverage: Readonly<Record<string, boolean>>;
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

export function runFormalSurvivalBotPressure(options: {
  readonly caseCount?: number;
  readonly uniqueSeedCount?: number;
  readonly hardLimitTicks?: number;
} = {}): FormalSurvivalBotPressureReport {
  const request = normalizeFormalSurvivalBotPressureRequest(options);
  const manifest = createFormalSurvivalBotPressureManifest(
    request.caseCount,
    request.uniqueSeedCount,
    request.hardLimitTicks,
  );
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
  let canonicalTotalTicks = 0;
  let canonicalTotalEvents = 0;
  let maximumRuntimeCount = 0;
  let maximumActiveSupplyCount = 0;
  let maximumEventsPerTick = 0;
  let maximumPauseSteps = 0;
  for (const plan of manifest.cases) {
    const first = runCase(plan, request.hardLimitTicks);
    const second = runCase(plan, request.hardLimitTicks);
    const result = compareTraces(plan, first, second, request.hardLimitTicks);
    results.push(result);
    cpuValues.push(result.cpuMsPerTick);
    canonicalTotalTicks += result.finalTick;
    canonicalTotalEvents += result.totalEvents;
    maximumRuntimeCount = Math.max(maximumRuntimeCount, result.maximumRuntimeCount);
    maximumActiveSupplyCount = Math.max(maximumActiveSupplyCount, result.maximumActiveSupplyCount);
    maximumEventsPerTick = Math.max(maximumEventsPerTick, result.maximumEventsPerTick);
    maximumPauseSteps = Math.max(maximumPauseSteps, result.pauseSteps);
  }
  if (typeof global.gc === 'function') global.gc();
  const heapGrowthBytes = process.memoryUsage().heapUsed - initialHeap;
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
  const requiredBoundaryTicks = ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_PAUSE_BOUNDARY_TICKS
    .filter((tick) => tick !== null) as readonly number[];
  const eventCoveragePassed = Object.values(coverage).every(Boolean)
    && requiredBoundaryTicks.every((tick) => boundaryTicksCovered.includes(tick));
  const projectionCoverage = terminalProjectionCoverage(results);
  const terminalProjectionCoveragePassed = Object.values(projectionCoverage).every(Boolean);
  const terminalCaseCoveragePassed = results.every((result) => (
    result.spawnTicks.includes(1_200)
    && result.spawnTicks.includes(2_400)
    && result.maximumActiveSupplyCount === 3
    && (result.eventTypeCounts[ARENA_MATCH_EVENT.MATCH_ENDED] ?? 0) > 0
  ));
  const executionPassed = results.length === request.caseCount
    && inspection.uniqueCaseIdentityCount === request.caseCount
    && maximumRuntimeCount <= ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.maximumRuntimeCount
    && maximumActiveSupplyCount
      <= ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.maximumActiveSupplyCount
    && maximumEventsPerTick
      <= ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.maximumEventsPerTick
    && results.every(({ finalTick }) => finalTick === request.hardLimitTicks)
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
    && terminalCaseCoveragePassed
    && terminalProjectionCoveragePassed;
  const performancePassed = heapGrowthBytes
    <= ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.heapGrowthBudgetBytes
    && cpuP95MsPerTick <= ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.cpuBudgetMsPerTick;
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
    maximumRuntimeCount: result.maximumRuntimeCount,
    maximumActiveSupplyCount: result.maximumActiveSupplyCount,
    maximumEventsPerTick: result.maximumEventsPerTick,
    pauseSteps: result.pauseSteps,
    pauseAtTick: result.pauseAtTick,
    pausePreservedTick: result.pausePreservedTick,
    pauseRecoveryTick: result.pauseRecoveryTick,
    eventTypeCounts: result.eventTypeCounts,
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
    eventCoverage: coverage,
    terminalCoverage: {
      allCasesEnded: results.every(({ finalTick }) => finalTick === request.hardLimitTicks),
      matchEndedEvents: eventTypeCounts[ARENA_MATCH_EVENT.MATCH_ENDED] ?? 0,
      spawnAt1200: coverage.spawnAt1200 ?? false,
      spawnAt2400: coverage.spawnAt2400 ?? false,
      activeSupplyReached3: coverage.activeSupplyReached3 ?? false,
    },
    terminalProjectionCoverage: projectionCoverage,
    boundaryTicksCovered,
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
    maximumRuntimeCount,
    maximumActiveSupplyCount,
    maximumEventsPerTick,
    maximumPauseSteps,
    heapGrowthBytes,
    heapGrowthBudgetBytes: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.heapGrowthBudgetBytes,
    cpuBudgetMsPerTick: ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_DEFAULTS.cpuBudgetMsPerTick,
    cpuP95MsPerTick,
    cpuWorstMsPerTick,
    eventTypeCounts,
    eventCoverage: coverage,
    terminalCoverage: Object.freeze({
      allCasesEnded: results.every(({ finalTick }) => finalTick === request.hardLimitTicks),
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
if (invokedScript) void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
