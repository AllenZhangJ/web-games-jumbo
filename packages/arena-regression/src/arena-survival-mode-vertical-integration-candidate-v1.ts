import {
  SURVIVAL_ENEMY_CONTROLLER_V2_CANDIDATE,
} from '@number-strategy-jump/arena-bot';
import {
  ARENA_MATCH_EVENT_V6,
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
  deriveSeed,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_FIRST_SPAWN_TICKS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_INTERVAL_TICKS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_LIFETIME_TICKS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_SPAWN_COUNT_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  createArenaModeVerificationContinuationPairV1,
} from './arena-mode-verification-runtime-factory-v1.js';
import {
  runArenaSurvivalBaselineWeaponSupplyVerificationCandidateV1,
} from './arena-survival-baseline-weapon-supply-verification-v1.js';
import {
  runArenaSurvivalEnemyPhysicsVerificationCandidateV1,
} from './arena-survival-enemy-physics-verification-v1.js';
import {
  runArenaSurvivalPressureBotLongRunVerificationCandidateV1,
} from './arena-survival-pressure-bot-long-run-verification-v1.js';
import {
  runArenaSurvivalTenWaveMatchCoreVerificationCandidateV1,
  runArenaSurvivalTieredSupplyMatchCoreVerificationCandidateV1,
} from './arena-survival-tiered-supply-matchcore-verification-v1.js';
import {
  runArenaSurvivalWeaponBotAffordanceVerificationCandidateV1,
} from './arena-survival-weapon-bot-affordance-verification-v1.js';
import {
  runArenaSurvivalWeaponTierConsequenceVerificationCandidateV1,
} from './arena-survival-weapon-tier-consequence-verification-v1.js';

export const ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_CANDIDATE_V1_STATUS =
  'production-unreachable' as const;
export const ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_ENEMY_COUNTS_V1 = Object.freeze(
  [1, 4, 8, 12, 16] as const,
);

export type ArenaSurvivalModeVerticalIntegrationRuntimeStateV1 =
  | 'created'
  | 'running'
  | 'completed'
  | 'failed'
  | 'destroyed';

export interface ArenaSurvivalModeVerticalIntegrationOptionsV1 {
  readonly schemaVersion:
    typeof ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_CANDIDATE_V1_SCHEMA_VERSION;
  readonly matchSeed: number;
  readonly enemyCounts: readonly [1, 4, 8, 12, 16];
}

export interface ArenaSurvivalModeVerticalIntegrationLifecycleScenarioV1 {
  readonly enemyCount: number;
  readonly matchSeed: number;
  readonly participantCount: number;
  readonly playerFallCounts: readonly number[];
  readonly respawnScheduledCount: number;
  readonly respawnedCount: number;
  readonly enemySlotChangedCount: number;
  readonly matchEndedCount: number;
  readonly survivedTicks: number;
  readonly pressureStage: number;
  readonly fallCount: number;
  readonly resultReason: 'terminal-player-fall';
  readonly continuousFinalHash: string;
  readonly restoredFinalHash: string;
  readonly resultHash: string;
}

export interface ArenaSurvivalModeVerticalIntegrationDeferredGapV1 {
  readonly id: string;
  readonly status: 'deferred';
  readonly reason: string;
  readonly requiredClosure: string;
}

export interface ArenaSurvivalModeVerticalIntegrationReportV1 {
  readonly schemaVersion:
    typeof ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_CANDIDATE_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_CANDIDATE_V1_STATUS;
  readonly hardGate: false;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
  readonly defaultEntryWired: false;
  readonly validationStatus: 'not-run';
  readonly usesArenaV1Experiment: false;
  readonly requestedMatchSeed: number;
  readonly enemyCounts: readonly [1, 4, 8, 12, 16];
  readonly mapDefinitionId: string;
  readonly routeDefinitionId: string;
  readonly characterDefinitionId: string;
  readonly enemyProfileId: string;
  readonly lifecycleScenarios:
    readonly ArenaSurvivalModeVerticalIntegrationLifecycleScenarioV1[];
  readonly supplyFacts: Readonly<{
    firstSpawnTick: 1200;
    spawnIntervalTicks: 1200;
    spawnCount: 3;
    unpickedLifetimeTicks: 600;
    noEquipmentBeforeFirstSpawn: boolean;
    firstWaveSpawnCount: number;
    replacementKind: string | null;
    worldExpiryEventCount: number;
    expectedWaveLevels: readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    seedCount: number;
    allSeedsReachedLevelTen: boolean;
  }>;
  readonly weaponUsageFacts: Readonly<{
    pickedRuntimeEquipmentDefinitionId: string | null;
    pickedSurvivalLevel: number;
    actionStartedEventCount: number;
    hitResolvedEventCount: number;
    knockbackAppliedEventCount: number;
    rulePhysicsScenarioCount: number;
    botAffordanceRunCount: number;
  }>;
  readonly botFacts: Readonly<{
    usesRestrictedObservationInput: boolean;
    emitsOnlyInputFrames: boolean;
    enemyMatrixInputFrameCount: number;
    pressureInputFrameCount: number;
    pressureActivePrimaryPressCount: number;
    supplyAwareUnarmedRoutingAvailable: true;
  }>;
  readonly componentResultHashes: Readonly<{
    enemyPhysics: string;
    baselineSupply: string;
    tieredSupplyMatchCore: string;
    tenWaveMatchCore: string;
    weaponTierConsequence: string;
    weaponBotAffordance: string;
    pressureBotLongRun: string;
  }>;
  readonly integratedAuthority: Readonly<{
    kzMapRouteMovementPhysics: 'component-candidate';
    restrictedBotObservationToInputFrame: 'component-candidate';
    equipmentSupplyMatchCore: 'component-candidate';
    weaponRuleMovementPhysicsConsequences: 'component-candidate';
    survivalModeLifecycle: 'component-candidate';
    singleSharedTickAuthority: 'deferred';
    hitFallToModeLifecycleSameScenario: 'deferred';
    supplyAwareEnemyDecisionSameScenario: 'deferred';
  }>;
  readonly seedBinding: Readonly<{
    modeLifecycle: 'derived-from-requested-match-seed';
    existingPhysicsSupplyAndBotComponents: 'upstream-fixed-seeds';
  }>;
  readonly deferredGap: readonly ArenaSurvivalModeVerticalIntegrationDeferredGapV1[];
  readonly resultHash: string;
}

export interface ArenaSurvivalModeVerticalIntegrationRuntimeSnapshotV1 {
  readonly state: ArenaSurvivalModeVerticalIntegrationRuntimeStateV1;
  readonly retainedResourceCount: 0;
  readonly hasReport: boolean;
}

const OPTION_KEYS = new Set(['schemaVersion', 'matchSeed', 'enemyCounts']);
const RUN_KEYS = new Set(['authorityStartTick']);
const EXPECTED_LEVELS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
}

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function normalizeOptions(value: unknown): ArenaSurvivalModeVerticalIntegrationOptionsV1 {
  const source = cloneFrozenData(value, 'Arena Survival vertical integration options');
  exactRecord(source, OPTION_KEYS, 'Arena Survival vertical integration options');
  if (source.schemaVersion !== ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_CANDIDATE_V1_SCHEMA_VERSION) {
    throw new RangeError('Arena Survival vertical integration schemaVersion必须是1。');
  }
  const matchSeed = assertIntegerAtLeast(
    source.matchSeed,
    0,
    'Arena Survival vertical integration matchSeed',
  );
  if (matchSeed > 0xffff_ffff) {
    throw new RangeError('Arena Survival vertical integration matchSeed必须是uint32。');
  }
  if (!Array.isArray(source.enemyCounts)) {
    throw new TypeError('Arena Survival vertical integration enemyCounts必须是数组。');
  }
  const enemyCounts = source.enemyCounts.map((entry, index) => assertIntegerAtLeast(
    entry,
    1,
    `Arena Survival vertical integration enemyCounts[${index}]`,
  ));
  if (!sameNumbers(enemyCounts, ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_ENEMY_COUNTS_V1)) {
    throw new RangeError('Arena Survival vertical integration敌人矩阵必须精确为1/4/8/12/16。');
  }
  return Object.freeze({
    schemaVersion: ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_CANDIDATE_V1_SCHEMA_VERSION,
    matchSeed,
    enemyCounts: ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_ENEMY_COUNTS_V1,
  });
}

function normalizeAuthorityStartTick(value: unknown): 0 {
  const source = cloneFrozenData(value, 'Arena Survival vertical integration run request');
  exactRecord(source, RUN_KEYS, 'Arena Survival vertical integration run request');
  const tick = assertIntegerAtLeast(
    source.authorityStartTick,
    0,
    'Arena Survival vertical integration authorityStartTick',
  );
  if (tick !== 0) {
    throw new RangeError('Arena Survival vertical integration拒绝迟到或非零authority起点。');
  }
  return 0;
}

function lifecycleScenario(
  baseSeed: number,
  enemyCount: number,
): ArenaSurvivalModeVerticalIntegrationLifecycleScenarioV1 {
  const matchSeed = deriveSeed(baseSeed, `p3-survival-vertical:enemy-count:${enemyCount}`);
  const pair = createArenaModeVerificationContinuationPairV1({
    caseId: `arena.p3.survival.vertical.enemy-${enemyCount}.candidate.v1`,
    profile: 'correctness',
    modeKind: 'survival',
    modeDefinitionId: ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.modeDefinitionId,
    fixtureDefinitionId: `arena.p3.survival.vertical.enemy-${enemyCount}.test.fixture.v1`,
    participantCount: enemyCount + 1,
    enemySlotCount: enemyCount,
    matchSeed,
    runnerTickBudget: 1_000,
    rematchCount: 1,
  });
  const result = pair.restored.modeResult;
  if (result?.kind !== 'survival') {
    throw new Error(`Arena Survival enemy-${enemyCount}未形成Survival ModeResult。`);
  }
  const playerFallCounts = Object.freeze(pair.restored.events.flatMap((event) => (
    event.type === ARENA_MATCH_EVENT_V6.SURVIVAL_PLAYER_FALL_COUNTED
      ? [event.fallCount]
      : []
  )));
  const respawnScheduledCount = pair.restored.events.filter((event) => (
    event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED
    && event.modeRole === 'player'
  )).length;
  const respawnedCount = pair.restored.events.filter((event) => (
    event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED
    && event.modeRole === 'player'
  )).length;
  const enemySlotChangedCount = pair.restored.events.filter((event) => (
    event.type === ARENA_MATCH_EVENT_V6.SURVIVAL_ENEMY_SLOT_CHANGED
  )).length;
  const matchEndedCount = pair.restored.events.filter((event) => (
    event.type === ARENA_MATCH_EVENT_V6.MATCH_ENDED
  )).length;
  if (
    !sameNumbers(playerFallCounts, [1, 2])
    || respawnScheduledCount !== 1
    || respawnedCount !== 1
    || matchEndedCount !== 1
    || result.fallCount !== 2
    || result.reason !== 'terminal-player-fall'
    || pair.continuous.finalHash !== pair.restored.finalHash
  ) throw new RangeError(`Arena Survival enemy-${enemyCount}生命周期闭包漂移。`);
  const authority = Object.freeze({
    enemyCount,
    matchSeed,
    participantCount: enemyCount + 1,
    playerFallCounts,
    respawnScheduledCount,
    respawnedCount,
    enemySlotChangedCount,
    matchEndedCount,
    survivedTicks: result.survivedTicks,
    pressureStage: result.pressureStage,
    fallCount: result.fallCount,
    resultReason: 'terminal-player-fall' as const,
    continuousFinalHash: pair.continuous.finalHash,
    restoredFinalHash: pair.restored.finalHash,
  });
  return Object.freeze({
    ...authority,
    resultHash: createDeterministicDataHash(
      authority,
      `Arena Survival vertical lifecycle enemy-${enemyCount}`,
    ),
  });
}

function deferredGap(): readonly ArenaSurvivalModeVerticalIntegrationDeferredGapV1[] {
  return Object.freeze([
    Object.freeze({
      id: 'single-shared-tick-authority',
      status: 'deferred' as const,
      reason: '现有KZ Movement/Physics、MatchCore供给/装备、武器后果与SurvivalMode lifecycle仍由分离候选运行。',
      requiredClosure: '由同一ModeMatchRuntimeV6 world authority按Rule→Movement/Physics→命中/冲量→fall facts→Mode顺序原子提交。',
    }),
    Object.freeze({
      id: 'supply-aware-enemy-observation',
      status: 'deferred' as const,
      reason: 'SurvivalEnemyObservationV2与ControllerV2已提供持武身份、最多3个当前供给和空手争夺策略，但本纵向候选尚未由真实world authority生产该观察。',
      requiredClosure: '把P4供给与装备快照投影成V2受限观察并接入同一Survival world tick；Controller继续只输出InputFrame。',
    }),
    Object.freeze({
      id: 'real-world-mode-runtime-composition',
      status: 'deferred' as const,
      reason: '当前Survival lifecycle continuation使用production-unreachable的.test fixture与VerificationWorldAuthority。',
      requiredClosure: '用P3 KZ world、P4 supply/equipment与真实Rule/Movement/Physics实现ModeMatchWorldAuthorityV6并接ModeMatchRuntimeV6。',
    }),
    Object.freeze({
      id: 'named-seed-through-all-components',
      status: 'deferred' as const,
      reason: '本候选把请求seed注入Mode lifecycle矩阵；既有P3/P4组件runner仍使用各自固定具名seed。',
      requiredClosure: '最终单一world authority从match seed派生Bot、供给竞争、动作与Replay具名随机流。',
    }),
    Object.freeze({
      id: 'deferred-runtime-validation',
      status: 'deferred' as const,
      reason: '按ADR-118/119，本批测试、类型、构建、压力、性能和设备验证均未运行。',
      requiredClosure: '在最终同源上执行本文件预注册测试、P3/P4/P2聚合门、Replay、长局和资源归零。',
    }),
  ]);
}

function runOrchestration(
  options: ArenaSurvivalModeVerticalIntegrationOptionsV1,
): ArenaSurvivalModeVerticalIntegrationReportV1 {
  const enemyPhysics = runArenaSurvivalEnemyPhysicsVerificationCandidateV1();
  const baselineSupply = runArenaSurvivalBaselineWeaponSupplyVerificationCandidateV1();
  const tieredSupply = runArenaSurvivalTieredSupplyMatchCoreVerificationCandidateV1();
  const tenWave = runArenaSurvivalTenWaveMatchCoreVerificationCandidateV1();
  const weaponConsequences = runArenaSurvivalWeaponTierConsequenceVerificationCandidateV1();
  const weaponBot = runArenaSurvivalWeaponBotAffordanceVerificationCandidateV1();
  const pressureBot = runArenaSurvivalPressureBotLongRunVerificationCandidateV1();
  const lifecycleScenarios = Object.freeze(options.enemyCounts.map((enemyCount) => (
    lifecycleScenario(options.matchSeed, enemyCount)
  )));

  const physicsCounts = enemyPhysics.scenarios.map(({ enemyCount }) => enemyCount);
  if (
    enemyPhysics.candidateStatus !== 'production-unreachable'
    || enemyPhysics.hardGate !== false
    || !enemyPhysics.usesSharedPhysics
    || !enemyPhysics.usesObservationInputBoundary
    || enemyPhysics.exercisesCombatResolution
    || enemyPhysics.exercisesSurvivalModeLifecycle
    || !sameNumbers(physicsCounts, options.enemyCounts)
  ) throw new RangeError('Arena Survival P3 physics组件合同漂移。');
  if (
    ARENA_V2_SURVIVAL_SUPPLY_FIRST_SPAWN_TICKS_CANDIDATE_V1 !== 1_200
    || ARENA_V2_SURVIVAL_SUPPLY_INTERVAL_TICKS_CANDIDATE_V1 !== 1_200
    || ARENA_V2_SURVIVAL_SUPPLY_SPAWN_COUNT_CANDIDATE_V1 !== 3
    || ARENA_V2_SURVIVAL_SUPPLY_LIFETIME_TICKS_CANDIDATE_V1 !== 600
    || !baselineSupply.noEquipmentBeforeFirstSpawn
    || baselineSupply.firstWaveSpawnCount !== 3
    || baselineSupply.replacementKind !== 'replaced'
    || baselineSupply.worldExpiryEventCount < 1
  ) throw new RangeError('Arena Survival P4供给组件合同漂移。');
  if (
    !tieredSupply.usesMatchCoreV5Authority
    || !tieredSupply.usesRealTieredSupplyTimeline
    || !tieredSupply.executesSameTickPickupBeforeAction
    || !tieredSupply.exercisesHeadlessReplay
    || tieredSupply.exercisesP2ModeLifecycle
    || tieredSupply.firstSpawnTick !== 1_200
    || tieredSupply.pickedSurvivalLevel !== 1
    || tieredSupply.hitResolvedEventCount < 1
    || tieredSupply.knockbackAppliedEventCount < 1
  ) throw new RangeError('Arena Survival P4 MatchCore组件合同漂移。');
  if (
    !sameNumbers(tenWave.expectedWaveLevels, EXPECTED_LEVELS)
    || tenWave.seedReports.length === 0
    || tenWave.seedReports.some((seed) => (
      !sameNumbers(seed.pickedWaveLevels, EXPECTED_LEVELS)
      || seed.finalSurvivalLevel !== 10
      || seed.replayFinalHash !== seed.replayedFinalHash
    ))
  ) throw new RangeError('Arena Survival P4临时等级/Replay组件合同漂移。');
  if (
    !weaponConsequences.usesRealRulePhysicsConsequenceRunner
    || weaponConsequences.exercisesP2ModeLifecycle
    || !weaponBot.consumesRestrictedObservation
    || !weaponBot.emitsOnlyInputFrame
    || !weaponBot.writesNoHitOrMovement
    || pressureBot.exercisesFormalModeLifecycle
    || pressureBot.inactiveNonNeutralFrameCount !== 0
  ) throw new RangeError('Arena Survival武器/Bot组件合同漂移。');

  const supplyFacts = Object.freeze({
    firstSpawnTick: 1_200 as const,
    spawnIntervalTicks: 1_200 as const,
    spawnCount: 3 as const,
    unpickedLifetimeTicks: 600 as const,
    noEquipmentBeforeFirstSpawn: baselineSupply.noEquipmentBeforeFirstSpawn,
    firstWaveSpawnCount: baselineSupply.firstWaveSpawnCount,
    replacementKind: baselineSupply.replacementKind,
    worldExpiryEventCount: baselineSupply.worldExpiryEventCount,
    expectedWaveLevels: EXPECTED_LEVELS,
    seedCount: tenWave.seedReports.length,
    allSeedsReachedLevelTen: tenWave.seedReports.every(({ finalSurvivalLevel }) => (
      finalSurvivalLevel === 10
    )),
  });
  const weaponUsageFacts = Object.freeze({
    pickedRuntimeEquipmentDefinitionId: tieredSupply.pickedRuntimeEquipmentDefinitionId,
    pickedSurvivalLevel: tieredSupply.pickedSurvivalLevel,
    actionStartedEventCount: tieredSupply.actionStartedEventCount,
    hitResolvedEventCount: tieredSupply.hitResolvedEventCount,
    knockbackAppliedEventCount: tieredSupply.knockbackAppliedEventCount,
    rulePhysicsScenarioCount: weaponConsequences.runs.reduce(
      (total, run) => total + run.scenarioCount,
      0,
    ),
    botAffordanceRunCount: weaponBot.runs.length,
  });
  const botFacts = Object.freeze({
    usesRestrictedObservationInput: enemyPhysics.usesObservationInputBoundary,
    emitsOnlyInputFrames: weaponBot.emitsOnlyInputFrame,
    enemyMatrixInputFrameCount: enemyPhysics.scenarios.reduce(
      (total, scenario) => total + scenario.inputFrameCount,
      0,
    ),
    pressureInputFrameCount: pressureBot.totalInputFrameCount,
    pressureActivePrimaryPressCount: pressureBot.activePrimaryPressCount,
    supplyAwareUnarmedRoutingAvailable: true as const,
  });
  const componentResultHashes = Object.freeze({
    enemyPhysics: enemyPhysics.resultHash,
    baselineSupply: baselineSupply.resultHash,
    tieredSupplyMatchCore: tieredSupply.resultHash,
    tenWaveMatchCore: tenWave.resultHash,
    weaponTierConsequence: weaponConsequences.resultHash,
    weaponBotAffordance: weaponBot.resultHash,
    pressureBotLongRun: pressureBot.resultHash,
  });
  const authority = Object.freeze({
    schemaVersion: ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_CANDIDATE_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_CANDIDATE_V1_STATUS,
    hardGate: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    defaultEntryWired: false as const,
    validationStatus: 'not-run' as const,
    usesArenaV1Experiment: false as const,
    requestedMatchSeed: options.matchSeed,
    enemyCounts: options.enemyCounts,
    mapDefinitionId: enemyPhysics.mapDefinitionId,
    routeDefinitionId: enemyPhysics.routeDefinitionId,
    characterDefinitionId: enemyPhysics.characterDefinitionId,
    enemyProfileId: enemyPhysics.enemyProfileId,
    lifecycleScenarios,
    supplyFacts,
    weaponUsageFacts,
    botFacts,
    componentResultHashes,
    integratedAuthority: Object.freeze({
      kzMapRouteMovementPhysics: 'component-candidate' as const,
      restrictedBotObservationToInputFrame: 'component-candidate' as const,
      equipmentSupplyMatchCore: 'component-candidate' as const,
      weaponRuleMovementPhysicsConsequences: 'component-candidate' as const,
      survivalModeLifecycle: 'component-candidate' as const,
      singleSharedTickAuthority: 'deferred' as const,
      hitFallToModeLifecycleSameScenario: 'deferred' as const,
      supplyAwareEnemyDecisionSameScenario: 'deferred' as const,
    }),
    seedBinding: Object.freeze({
      modeLifecycle: 'derived-from-requested-match-seed' as const,
      existingPhysicsSupplyAndBotComponents: 'upstream-fixed-seeds' as const,
    }),
    deferredGap: deferredGap(),
  });
  if (ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1.status !== 'production-unreachable') {
    throw new RangeError('Arena Survival tier catalog意外进入生产可达状态。');
  }
  if (
    SURVIVAL_ENEMY_CONTROLLER_V2_CANDIDATE.status !== 'production-unreachable'
    || !SURVIVAL_ENEMY_CONTROLLER_V2_CANDIDATE.emitsOnlyInputFrame
    || SURVIVAL_ENEMY_CONTROLLER_V2_CANDIDATE.writesHitMovementSupplyOrMode
    || SURVIVAL_ENEMY_CONTROLLER_V2_CANDIDATE.defaultBotRegistryWired
  ) throw new RangeError('Arena Survival supply-aware Bot V2候选边界漂移。');
  return Object.freeze({
    ...authority,
    resultHash: createDeterministicDataHash(
      authority,
      'Arena Survival Mode Vertical Integration Candidate V1',
    ),
  });
}

export class ArenaSurvivalModeVerticalIntegrationCandidateRuntimeV1 {
  readonly #options: ArenaSurvivalModeVerticalIntegrationOptionsV1;
  #state: ArenaSurvivalModeVerticalIntegrationRuntimeStateV1 = 'created';
  #processing = false;
  #reentryAttempted = false;
  #report: ArenaSurvivalModeVerticalIntegrationReportV1 | null = null;

  constructor(value: unknown) {
    this.#options = normalizeOptions(value);
    Object.freeze(this);
  }

  get state(): ArenaSurvivalModeVerticalIntegrationRuntimeStateV1 { return this.#state; }

  run(value: unknown): ArenaSurvivalModeVerticalIntegrationReportV1 {
    if (this.#state === 'destroyed') throw new Error('Arena Survival vertical runtime已销毁。');
    if (this.#state !== 'created' || this.#processing) {
      this.#reentryAttempted = true;
      throw new Error(`Arena Survival vertical runtime状态${this.#state}不可重入run。`);
    }
    this.#state = 'running';
    this.#processing = true;
    this.#reentryAttempted = false;
    try {
      normalizeAuthorityStartTick(value);
      const report = runOrchestration(this.#options);
      if (this.#reentryAttempted) throw new Error('Arena Survival vertical runtime运行期间发生重入。');
      this.#report = report;
      this.#state = 'completed';
      return report;
    } catch (error) {
      this.#report = null;
      this.#state = 'failed';
      throw error;
    } finally {
      this.#processing = false;
    }
  }

  getSnapshot(): ArenaSurvivalModeVerticalIntegrationRuntimeSnapshotV1 {
    return Object.freeze({
      state: this.#state,
      retainedResourceCount: 0 as const,
      hasReport: this.#report !== null,
    });
  }

  getRetainedResourceCount(): 0 { return 0; }

  destroy(): void {
    if (this.#state === 'destroyed') return;
    if (this.#processing) {
      this.#reentryAttempted = true;
      throw new Error('Arena Survival vertical runtime运行期间不可destroy。');
    }
    this.#report = null;
    this.#state = 'destroyed';
  }
}

export function createArenaSurvivalModeVerticalIntegrationCandidateRuntimeV1(
  value: unknown,
): ArenaSurvivalModeVerticalIntegrationCandidateRuntimeV1 {
  return new ArenaSurvivalModeVerticalIntegrationCandidateRuntimeV1(value);
}

export function runArenaSurvivalModeVerticalIntegrationCandidateV1(
  value: unknown,
): ArenaSurvivalModeVerticalIntegrationReportV1 {
  const runtime = createArenaSurvivalModeVerticalIntegrationCandidateRuntimeV1(value);
  try {
    return runtime.run({ authorityStartTick: 0 });
  } finally {
    runtime.destroy();
  }
}

export const ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_PLAN_CANDIDATE_V1 = Object.freeze({
  status: ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_CANDIDATE_V1_STATUS,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
  enemyCounts: ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_ENEMY_COUNTS_V1,
  targetAuthorityOrder: Object.freeze([
    'supply-expiry-pickup-replacement',
    'restricted-observation-to-input-frame',
    'rule-movement-physics-action-resolution',
    'hit-impulse-fall-facts',
    'survival-mode-lifecycle',
  ] as const),
  integratedInOneWorldAuthority: false as const,
});
