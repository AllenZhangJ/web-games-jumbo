import {
  ARENA_GAMEPLAY_V2_TUNING,
  CharacterRegistry,
  MAP_DEFINITION_SCHEMA_VERSION,
  createMapDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  createDeterministicDataHash,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaRuleEngine,
  createArenaBeginDownSmashActionEffectHandlerV1,
  createDefaultActionEffectRegistry,
  createDefaultRuleCommandRegistry,
  createDefaultTargetingRegistry,
  type ArenaRuleEngineContract,
} from '@number-strategy-jump/arena-core';
import {
  EquipmentSupplyTimelineSystem,
  EquipmentSystem,
} from '@number-strategy-jump/arena-equipment';
import {
  ArenaMapSystem,
  createDefaultMapCommandRegistry,
  createDefaultMapEventStrategyRegistry,
} from '@number-strategy-jump/arena-map';
import {
  createMovementCommand,
  isMovementCommandKind,
} from '@number-strategy-jump/arena-movement';
import {
  ARENA_MATCH_PHASE,
  HeadlessMatchRunner,
  MatchCore,
  composeSurvivalMatchReadFrameV3,
  createReplayMatch,
  type ArenaMatchConfigOverrides,
  type ArenaReplay,
} from '@number-strategy-jump/arena-match';
import {
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_FIRST_SPAWN_TICKS_CANDIDATE_V1,
  createArenaV2SurvivalBaselineWeaponCandidateRegistriesV1,
} from '@number-strategy-jump/arena-product-content';

export const ARENA_SURVIVAL_TIERED_SUPPLY_MATCHCORE_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_SURVIVAL_TIERED_SUPPLY_MATCHCORE_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

const ATTACKER_ID = 'arena-p4-supply-matchcore-player';
const TARGET_ID = 'arena-p4-supply-matchcore-target';
const PARTICIPANT_IDS = Object.freeze([ATTACKER_ID, TARGET_ID]);
const MATCH_SEED = 0x5044_31;
const HARD_LIMIT_TICKS = 1_250;
const TEN_WAVE_HARD_LIMIT_TICKS = 12_005;
const TEN_WAVE_SEEDS = Object.freeze([0x5044_41, 0x5044_42, 0x5044_43]);
const ATTACK_TICK = ARENA_V2_SURVIVAL_SUPPLY_FIRST_SPAWN_TICKS_CANDIDATE_V1;
const MAP_RULESET_VERSION = 'arena-p4-survival-tiered-supply-map-ruleset.candidate.v1';
const MODE_DEFINITION_ID = 'arena-v2.mode.survival.weapon-supply.candidate.v1';
const CATALOG = ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1;
const CHARACTER = ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1;
const BASE_MAP = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mapDefinition;
const PRIMARY_SPAWN = CATALOG.spawnSpecs.find(({ slotId }) => slotId === 'survival-slot-01');
if (!PRIMARY_SPAWN) throw new Error('P4 MatchCore supply候选缺少首个刷新槽位。');

const MATCH_MAP = createMapDefinition({
  schemaVersion: MAP_DEFINITION_SCHEMA_VERSION,
  id: 'arena-v2-p4-survival-tiered-supply-map.candidate.v1',
  arena: {
    killY: BASE_MAP.arena.killY,
    surfaces: BASE_MAP.arena.surfaces,
    spawns: [
      PRIMARY_SPAWN.position,
      { ...PRIMARY_SPAWN.position, x: PRIMARY_SPAWN.position.x + 1.3 },
    ],
  },
  equipmentSpawnPoints: BASE_MAP.equipmentSpawnPoints,
  events: [],
});

export interface ArenaSurvivalTieredSupplyMatchCoreVerificationReportV1 {
  readonly schemaVersion:
    typeof ARENA_SURVIVAL_TIERED_SUPPLY_MATCHCORE_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_SURVIVAL_TIERED_SUPPLY_MATCHCORE_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly usesMatchCoreV5Authority: true;
  readonly usesRealTieredSupplyTimeline: true;
  readonly usesUnarmedFallback: true;
  readonly executesSameTickPickupBeforeAction: true;
  readonly projectsV3SupplyIdentityFromTierPolicy: true;
  readonly composesMatchReadFrameV3: true;
  readonly exercisesHeadlessReplay: true;
  readonly exercisesP2ModeLifecycle: false;
  readonly noEquipmentBeforeFirstSpawn: boolean;
  readonly firstSpawnTick: number;
  readonly attackTick: number;
  readonly pickedRuntimeEquipmentDefinitionId: string | null;
  readonly pickedSurvivalLevel: 1;
  readonly equipmentSpawnedEventCount: number;
  readonly equipmentPickedUpEventCount: number;
  readonly actionStartedEventCount: number;
  readonly hitResolvedEventCount: number;
  readonly knockbackAppliedEventCount: number;
  readonly v3WorldSupplyCountAfterPickup: number;
  readonly v3HeldCollectionEquipmentDefinitionId: string | null;
  readonly v3HeldRuntimeEquipmentDefinitionId: string | null;
  readonly v3HeldSurvivalLevel: number | null;
  readonly v3ReadFrameHash: string;
  readonly replayFinalHash: string;
  readonly replayedFinalHash: string;
  readonly replayEventCount: number;
  readonly replayInputFrameCount: number;
  readonly catalogContentHash: string;
  readonly resultHash: string;
}

function config(
  hardLimitTicks = HARD_LIMIT_TICKS,
  suddenDeathStartTick = 1_230,
): ArenaMatchConfigOverrides {
  return Object.freeze({
    participantIds: PARTICIPANT_IDS,
    livesPerParticipant: 3,
    preparingTicks: 0,
    suddenDeathStartTick,
    hardLimitTicks,
    respawnTicks: 30,
    invulnerableTicks: 12,
    lastHitCreditTicks: 120,
    mapDefinitionId: MATCH_MAP.id,
    arena: MATCH_MAP.arena,
    participantCharacters: PARTICIPANT_IDS.map((participantId) => Object.freeze({
      participantId,
      definitionId: CHARACTER.id,
    })),
    equipment: Object.freeze({ initialSpawns: Object.freeze([]) }),
    airJumpHorizontalImpulse: ARENA_GAMEPLAY_V2_TUNING.character.jump.airHorizontalImpulse,
    contextPrimaryMobilityEnabled: false,
  });
}

type CandidateRegistries = ReturnType<
  typeof createArenaV2SurvivalBaselineWeaponCandidateRegistriesV1
>;

function createRuleEngine(
  registries: CandidateRegistries,
  onEquipmentSystem: (system: EquipmentSystem) => void = () => {},
): ArenaRuleEngineContract {
  return new ArenaRuleEngine({
    participantIds: PARTICIPANT_IDS,
    baseActionDefinitionId: CATALOG.baseGroundActionDefinitionId,
    baseAirActionDefinitionId: CATALOG.baseAerialActionDefinitionId,
    actionRegistry: registries.actionRegistry,
    equipmentRegistry: registries.equipmentRegistry,
    targetingRegistry: createDefaultTargetingRegistry(),
    effectRegistry: createDefaultActionEffectRegistry([
      createArenaBeginDownSmashActionEffectHandlerV1(),
    ]),
    commandRegistry: createDefaultRuleCommandRegistry(),
    movementCandidateProvider: Object.freeze({ getCandidates: () => Object.freeze([]) }),
    createEquipmentSystem: (options) => {
      const system = new EquipmentSystem({
        ...options,
        equipmentSupplyRegistry: registries.equipmentSupplyRegistry,
      });
      onEquipmentSystem(system);
      return system;
    },
    movementCommandAdapter: Object.freeze({
      isCommandKind: isMovementCommandKind,
      createCommand: createMovementCommand,
    }),
    allowBaseAttackWhiff: true,
  });
}

function createCore(
  seed: number,
  matchConfig: ArenaMatchConfigOverrides = config(),
  capture: Readonly<{
    readonly onEquipmentSystem?: (system: EquipmentSystem) => void;
    readonly onSupplyTimeline?: (timeline: EquipmentSupplyTimelineSystem) => void;
  }> = {},
): MatchCore {
  const registries = createArenaV2SurvivalBaselineWeaponCandidateRegistriesV1();
  return new MatchCore({
    seed,
    config: matchConfig,
    characterRegistry: new CharacterRegistry([CHARACTER]),
    ruleEngineFactory: () => createRuleEngine(registries, capture.onEquipmentSystem),
    mapSystemFactory: ({ matchSeed, equipmentDefinitionCatalog }) => new ArenaMapSystem({
      mapDefinition: MATCH_MAP,
      strategyRegistry: createDefaultMapEventStrategyRegistry(),
      commandRegistry: createDefaultMapCommandRegistry(),
      matchSeed,
      rulesetVersion: MAP_RULESET_VERSION,
      validationContext: { equipmentRegistry: equipmentDefinitionCatalog },
    }),
    equipmentSupplyTimelineFactory: (context) => {
      for (const spec of CATALOG.spawnSpecs) {
        if (!context.isEquipmentPositionValid(spec.position)) {
          throw new RangeError(`P4 supply spawn ${spec.slotId}不在合法地图表面。`);
        }
      }
      const timeline = new EquipmentSupplyTimelineSystem({
        supplyDefinitionId: CATALOG.supplyDefinition.id,
        spawnSpecs: CATALOG.spawnSpecs,
        waveEquipmentOverrides: CATALOG.waveEquipmentOverrides,
        equipmentRegistry: context.equipmentDefinitionCatalog,
        equipmentSupplyRegistry: registries.equipmentSupplyRegistry,
        equipmentSystem: context.equipmentAuthority,
      });
      capture.onSupplyTimeline?.(timeline);
      return timeline;
    },
  });
}

function frames(tick: number): readonly ArenaInputFrame[] {
  return Object.freeze(PARTICIPANT_IDS.map((participantId) => {
    const pressed = participantId === ATTACKER_ID && tick === ATTACK_TICK;
    return Object.freeze({
      tick,
      participantId,
      moveX: 0,
      moveZ: 0,
      primaryPressed: pressed,
      primaryHeld: pressed,
      jumpPressed: false,
      jumpHeld: false,
      slamPressed: false,
    });
  }));
}

function neutralFrames(tick: number): readonly ArenaInputFrame[] {
  return Object.freeze(PARTICIPANT_IDS.map((participantId) => Object.freeze({
    tick,
    participantId,
    moveX: 0,
    moveZ: 0,
    primaryPressed: false,
    primaryHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  })));
}

function eventCount(replay: ArenaReplay, type: string): number {
  return replay.events.filter((event) => event.type === type).length;
}

export function runArenaSurvivalTieredSupplyMatchCoreVerificationCandidateV1():
ArenaSurvivalTieredSupplyMatchCoreVerificationReportV1 {
  let capturedEquipmentSystem: EquipmentSystem | null = null;
  let capturedSupplyTimeline: EquipmentSupplyTimelineSystem | null = null;
  const core = createCore(MATCH_SEED, config(), {
    onEquipmentSystem: (system) => { capturedEquipmentSystem = system; },
    onSupplyTimeline: (timeline) => { capturedSupplyTimeline = timeline; },
  });
  if (capturedEquipmentSystem === null || capturedSupplyTimeline === null) {
    core.destroy();
    throw new Error('P4 MatchCore supply候选未捕获 equipment/supply authority。');
  }
  const equipmentSystem: EquipmentSystem = capturedEquipmentSystem;
  const supplyTimeline: EquipmentSupplyTimelineSystem = capturedSupplyTimeline;
  const readBinding = core.createMatchReadBinding({
    schemaVersion: 1,
    compositionId: 'arena-p4-survival-tiered-supply-matchcore.candidate.v1',
    participantIds: PARTICIPANT_IDS,
    mapDefinitionId: MATCH_MAP.id,
    contentSelectionHash: null,
  });
  const readFrameReader = core.createMatchReadFrameReader(readBinding, ATTACKER_ID);
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 300 });
  let noEquipmentBeforeFirstSpawn = false;
  let replay: ArenaReplay;
  let pickedRuntimeEquipmentDefinitionId: string | null = null;
  let v3WorldSupplyCountAfterPickup = -1;
  let v3HeldCollectionEquipmentDefinitionId: string | null = null;
  let v3HeldRuntimeEquipmentDefinitionId: string | null = null;
  let v3HeldSurvivalLevel: number | null = null;
  let v3ReadFrameHash = '';
  try {
    while (core.phase !== ARENA_MATCH_PHASE.ENDED) {
      if (core.tick === ATTACK_TICK) {
        noEquipmentBeforeFirstSpawn = core.getLegacyFullSnapshotForAudit().equipment.length === 0;
      }
      runner.step(frames(core.tick));
      if (core.tick === ATTACK_TICK + 1) {
        const attacker = core.getLegacyFullSnapshotForAudit().participants.find(
          ({ id }) => id === ATTACKER_ID,
        );
        pickedRuntimeEquipmentDefinitionId = attacker?.equipment?.definitionId ?? null;
        const v2Frame = readFrameReader.read();
        const supplyProjection = supplyTimeline.getPublicSupplyProjectionV3({
          modeDefinitionId: MODE_DEFINITION_ID,
          tierPolicyDefinition: CATALOG.tierPolicyDefinition,
          snapshotTick: v2Frame.worldSnapshot.tick,
          eventSequence: v2Frame.worldSnapshot.eventSequence,
          equipment: equipmentSystem.listSnapshots(),
        });
        const adapted = composeSurvivalMatchReadFrameV3({
          modeDefinitionId: MODE_DEFINITION_ID,
          tierPolicyDefinition: CATALOG.tierPolicyDefinition,
          v2Frame,
          activeSupplyProjection: supplyProjection.projection,
          expectedWorldSupplyIdentities: supplyProjection.expectedWorldSupplyIdentities,
          modeProjection: {
            schemaVersion: 1,
            modeDefinitionId: MODE_DEFINITION_ID,
            revision: v2Frame.worldSnapshot.tick,
            preparationRemainingTicks: null,
            state: {
              kind: 'survival',
              playerParticipantId: ATTACKER_ID,
              fallCount: 0,
              terminalFallCount: 2,
              survivedTicks: v2Frame.worldSnapshot.activeTick,
              pressureStage: 0,
              enemySlots: [{
                slotId: 'arena-p4-survival-enemy-slot-01',
                participantId: TARGET_ID,
                active: true,
                generation: 1,
                anchorId: 'arena-p4-survival-enemy-anchor-01',
              }],
            },
          },
          modeResult: null,
        });
        const v3Attacker = adapted.readFrame.worldSnapshot.participants.find(
          ({ id }) => id === ATTACKER_ID,
        );
        v3WorldSupplyCountAfterPickup = adapted.readFrame.worldSnapshot
          .activeSupplyProjection?.supplies.length ?? -1;
        v3HeldCollectionEquipmentDefinitionId =
          v3Attacker?.equipment?.collectionEquipmentDefinitionId ?? null;
        v3HeldRuntimeEquipmentDefinitionId =
          v3Attacker?.equipment?.runtimeEquipmentDefinitionId ?? null;
        v3HeldSurvivalLevel = v3Attacker?.equipment?.survivalLevel ?? null;
        v3ReadFrameHash = createDeterministicDataHash(
          adapted.readFrame,
          'Arena Survival tiered supply MatchReadFrame V3',
        );
      }
    }
    replay = runner.exportReplay();
  } finally {
    runner.destroy();
    core.destroy();
  }
  const replayed = createReplayMatch(({ seed, config: replayConfig }) => (
    createCore(seed, replayConfig)
  ))(replay);
  const authority = Object.freeze({
    schemaVersion: ARENA_SURVIVAL_TIERED_SUPPLY_MATCHCORE_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_SURVIVAL_TIERED_SUPPLY_MATCHCORE_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    usesMatchCoreV5Authority: true as const,
    usesRealTieredSupplyTimeline: true as const,
    usesUnarmedFallback: true as const,
    executesSameTickPickupBeforeAction: true as const,
    projectsV3SupplyIdentityFromTierPolicy: true as const,
    composesMatchReadFrameV3: true as const,
    exercisesHeadlessReplay: true as const,
    exercisesP2ModeLifecycle: false as const,
    noEquipmentBeforeFirstSpawn,
    firstSpawnTick: CATALOG.supplyDefinition.firstSpawnTick,
    attackTick: ATTACK_TICK,
    pickedRuntimeEquipmentDefinitionId,
    pickedSurvivalLevel: 1 as const,
    equipmentSpawnedEventCount: eventCount(replay, 'EquipmentSpawned'),
    equipmentPickedUpEventCount: eventCount(replay, 'EquipmentPickedUp'),
    actionStartedEventCount: eventCount(replay, 'ActionStarted'),
    hitResolvedEventCount: eventCount(replay, 'HitResolved'),
    knockbackAppliedEventCount: eventCount(replay, 'KnockbackApplied'),
    v3WorldSupplyCountAfterPickup,
    v3HeldCollectionEquipmentDefinitionId,
    v3HeldRuntimeEquipmentDefinitionId,
    v3HeldSurvivalLevel,
    v3ReadFrameHash,
    replayFinalHash: replay.finalHash,
    replayedFinalHash: replayed.finalHash,
    replayEventCount: replay.events.length,
    replayInputFrameCount: replay.inputFrames.length,
    catalogContentHash: CATALOG.contentHash,
  });
  return Object.freeze({
    ...authority,
    resultHash: createDeterministicDataHash(
      authority,
      'Arena Survival Tiered Supply MatchCore Verification V1',
    ),
  });
}

export interface ArenaSurvivalTenWaveSeedVerificationReportV1 {
  readonly matchSeed: number;
  readonly pickedWaveLevels: readonly number[];
  readonly finalRuntimeEquipmentDefinitionId: string | null;
  readonly finalCollectionEquipmentDefinitionId: string | null;
  readonly finalSurvivalLevel: number | null;
  readonly equipmentSpawnedEventCount: number;
  readonly equipmentPickedUpEventCount: number;
  readonly equipmentReplacedEventCount: number;
  readonly replayFinalHash: string;
  readonly replayedFinalHash: string;
  readonly eventCount: number;
  readonly inputFrameCount: number;
}

export interface ArenaSurvivalTenWaveMatchCoreVerificationReportV1 {
  readonly schemaVersion:
    typeof ARENA_SURVIVAL_TIERED_SUPPLY_MATCHCORE_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_SURVIVAL_TIERED_SUPPLY_MATCHCORE_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly usesMatchCoreV5Authority: true;
  readonly usesRealTenWaveSupplyTimeline: true;
  readonly usesAutomaticProximityReplacement: true;
  readonly exercisesHeadlessReplay: true;
  readonly exercisesFormalModeLifecycle: false;
  readonly seedReports: readonly ArenaSurvivalTenWaveSeedVerificationReportV1[];
  readonly expectedWaveLevels: readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  readonly resultHash: string;
}

function survivalLevelForRuntime(runtimeEquipmentDefinitionId: string | null): number | null {
  if (runtimeEquipmentDefinitionId === null) return null;
  return CATALOG.runtimeVariants.find(({ equipment }) => (
    equipment.id === runtimeEquipmentDefinitionId
  ))?.level ?? null;
}

function collectionIdForRuntime(runtimeEquipmentDefinitionId: string | null): string | null {
  if (runtimeEquipmentDefinitionId === null) return null;
  return CATALOG.runtimeVariants.find(({ equipment }) => (
    equipment.id === runtimeEquipmentDefinitionId
  ))?.collectionEquipmentDefinitionId ?? null;
}

function runTenWaveSeed(matchSeed: number): ArenaSurvivalTenWaveSeedVerificationReportV1 {
  const matchConfig = config(TEN_WAVE_HARD_LIMIT_TICKS, TEN_WAVE_HARD_LIMIT_TICKS - 1);
  const core = createCore(matchSeed, matchConfig);
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 1_200 });
  const pickedWaveLevels: number[] = [];
  let replay: ArenaReplay;
  let finalRuntimeEquipmentDefinitionId: string | null = null;
  try {
    while (core.phase !== ARENA_MATCH_PHASE.ENDED) {
      runner.step(neutralFrames(core.tick));
      const completedTick = core.tick - 1;
      const firstSpawnTick = CATALOG.supplyDefinition.firstSpawnTick;
      const interval = CATALOG.supplyDefinition.spawnIntervalTicks;
      if (
        completedTick >= firstSpawnTick
        && (completedTick - firstSpawnTick) % interval === 0
        && pickedWaveLevels.length < 10
      ) {
        const held = core.getLegacyFullSnapshotForAudit().participants.find(
          ({ id }) => id === ATTACKER_ID,
        )?.equipment?.definitionId ?? null;
        const level = survivalLevelForRuntime(held);
        if (level === null) throw new Error(`P4 ten-wave tick ${completedTick}未解析到持有等级。`);
        pickedWaveLevels.push(level);
      }
    }
    replay = runner.exportReplay();
    finalRuntimeEquipmentDefinitionId = core.getLegacyFullSnapshotForAudit().participants.find(
      ({ id }) => id === ATTACKER_ID,
    )?.equipment?.definitionId ?? null;
  } finally {
    runner.destroy();
    core.destroy();
  }
  const replayed = createReplayMatch(({ seed, config: replayConfig }) => (
    createCore(seed, replayConfig)
  ))(replay);
  return Object.freeze({
    matchSeed,
    pickedWaveLevels: Object.freeze(pickedWaveLevels),
    finalRuntimeEquipmentDefinitionId,
    finalCollectionEquipmentDefinitionId: collectionIdForRuntime(
      finalRuntimeEquipmentDefinitionId,
    ),
    finalSurvivalLevel: survivalLevelForRuntime(finalRuntimeEquipmentDefinitionId),
    equipmentSpawnedEventCount: eventCount(replay, 'EquipmentSpawned'),
    equipmentPickedUpEventCount: eventCount(replay, 'EquipmentPickedUp'),
    equipmentReplacedEventCount: eventCount(replay, 'EquipmentReplaced'),
    replayFinalHash: replay.finalHash,
    replayedFinalHash: replayed.finalHash,
    eventCount: replay.events.length,
    inputFrameCount: replay.inputFrames.length,
  });
}

export function runArenaSurvivalTenWaveMatchCoreVerificationCandidateV1():
ArenaSurvivalTenWaveMatchCoreVerificationReportV1 {
  const seedReports = Object.freeze(TEN_WAVE_SEEDS.map(runTenWaveSeed));
  const authority = Object.freeze({
    schemaVersion: ARENA_SURVIVAL_TIERED_SUPPLY_MATCHCORE_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_SURVIVAL_TIERED_SUPPLY_MATCHCORE_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    usesMatchCoreV5Authority: true as const,
    usesRealTenWaveSupplyTimeline: true as const,
    usesAutomaticProximityReplacement: true as const,
    exercisesHeadlessReplay: true as const,
    exercisesFormalModeLifecycle: false as const,
    seedReports,
    expectedWaveLevels: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const),
  });
  return Object.freeze({
    ...authority,
    resultHash: createDeterministicDataHash(
      authority,
      'Arena Survival Ten Wave MatchCore Verification V1',
    ),
  });
}
