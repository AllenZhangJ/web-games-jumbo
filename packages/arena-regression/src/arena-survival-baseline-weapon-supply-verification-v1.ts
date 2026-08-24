import {
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  EquipmentSupplyTimelineSystem,
  EquipmentSystem,
} from '@number-strategy-jump/arena-equipment';
import {
  ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_FIRST_SPAWN_TICKS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_INTERVAL_TICKS_CANDIDATE_V1,
  createArenaV2SurvivalBaselineWeaponCandidateRegistriesV1,
} from '@number-strategy-jump/arena-product-content';

export const ARENA_SURVIVAL_BASELINE_WEAPON_SUPPLY_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_SURVIVAL_BASELINE_WEAPON_SUPPLY_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

const PLAYER_ID = 'arena-p4-survival-supply-player';
const OBSERVER_ID = 'arena-p4-survival-supply-observer';
const PARTICIPANT_IDS = Object.freeze([OBSERVER_ID, PLAYER_ID]);
const FAR_POSITION = Object.freeze({ x: 100, y: 1.5, z: 100 });
const FIRST_WAVE_INDEX = 0;
const SECOND_WAVE_INDEX = 1;
const TENTH_WAVE_INDEX = 9;
const FIRST_SPAWN_TICK = ARENA_V2_SURVIVAL_SUPPLY_FIRST_SPAWN_TICKS_CANDIDATE_V1;
const SECOND_SPAWN_TICK = FIRST_SPAWN_TICK
  + SECOND_WAVE_INDEX * ARENA_V2_SURVIVAL_SUPPLY_INTERVAL_TICKS_CANDIDATE_V1;
const TENTH_SPAWN_TICK = FIRST_SPAWN_TICK
  + TENTH_WAVE_INDEX * ARENA_V2_SURVIVAL_SUPPLY_INTERVAL_TICKS_CANDIDATE_V1;
const CATALOG = ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1;

export interface ArenaSurvivalBaselineWeaponSupplyVerificationReportV1 {
  readonly schemaVersion:
    typeof ARENA_SURVIVAL_BASELINE_WEAPON_SUPPLY_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_SURVIVAL_BASELINE_WEAPON_SUPPLY_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly usesRealEquipmentSystem: true;
  readonly usesRealSupplyTimeline: true;
  readonly usesWaveRuntimeOverrides: true;
  readonly exercisesP2ModeLifecycle: false;
  readonly noEquipmentBeforeFirstSpawn: boolean;
  readonly firstWaveIndex: 0;
  readonly firstWaveSpawnTick: number;
  readonly firstWaveSpawnCount: number;
  readonly firstWaveRuntimeEquipmentDefinitionIds: readonly string[];
  readonly firstPickupKind: string | null;
  readonly firstPickupEquipmentDefinitionId: string | null;
  readonly secondWaveIndex: 1;
  readonly secondWaveSpawnTick: number;
  readonly secondWaveRuntimeEquipmentDefinitionIds: readonly string[];
  readonly replacementKind: string | null;
  readonly replacementEquipmentDefinitionId: string | null;
  readonly replacementEventTypes: readonly string[];
  readonly tenthWaveIndex: 9;
  readonly tenthWaveSpawnTick: number;
  readonly tenthWaveRuntimeEquipmentDefinitionIds: readonly string[];
  readonly worldExpiryEventCount: number;
  readonly expiredHeldSupplyCount: number;
  readonly catalogContentHash: string;
  readonly resultHash: string;
}

function definitionIdsForWave(
  timeline: EquipmentSupplyTimelineSystem,
  waveIndex: number,
): readonly string[] {
  return Object.freeze(timeline.resolveWaveEquipmentDefinitions(waveIndex).map(
    ({ equipmentDefinitionId }) => equipmentDefinitionId,
  ));
}

function participantFacts(tick: number): readonly Readonly<{
  readonly id: string;
  readonly eligible: boolean;
  readonly position: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
}>[] {
  let playerPosition: Readonly<{
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }> = FAR_POSITION;
  if (tick === FIRST_SPAWN_TICK) {
    playerPosition = CATALOG.spawnSpecs.find(({ slotId }) => slotId === 'survival-slot-01')!.position;
  } else if (tick === SECOND_SPAWN_TICK) {
    playerPosition = CATALOG.spawnSpecs.find(({ slotId }) => slotId === 'survival-slot-02')!.position;
  }
  return Object.freeze([
    Object.freeze({ id: OBSERVER_ID, eligible: true, position: FAR_POSITION }),
    Object.freeze({ id: PLAYER_ID, eligible: true, position: playerPosition }),
  ]);
}

export function runArenaSurvivalBaselineWeaponSupplyVerificationCandidateV1():
ArenaSurvivalBaselineWeaponSupplyVerificationReportV1 {
  const registries = createArenaV2SurvivalBaselineWeaponCandidateRegistriesV1();
  const equipmentSystem = new EquipmentSystem({
    participantIds: PARTICIPANT_IDS,
    actionRegistry: registries.actionRegistry,
    equipmentRegistry: registries.equipmentRegistry,
    equipmentSupplyRegistry: registries.equipmentSupplyRegistry,
  });
  const timeline = new EquipmentSupplyTimelineSystem({
    supplyDefinitionId: CATALOG.supplyDefinition.id,
    spawnSpecs: CATALOG.spawnSpecs,
    waveEquipmentOverrides: CATALOG.waveEquipmentOverrides,
    equipmentRegistry: registries.equipmentRegistry,
    equipmentSupplyRegistry: registries.equipmentSupplyRegistry,
    equipmentSystem,
  });
  let noEquipmentBeforeFirstSpawn = false;
  let firstWaveSpawnCount = 0;
  let firstPickupKind: string | null = null;
  let firstPickupEquipmentDefinitionId: string | null = null;
  let replacementKind: string | null = null;
  let replacementEquipmentDefinitionId: string | null = null;
  let replacementEventTypes: readonly string[] = Object.freeze([]);
  let worldExpiryEventCount = 0;
  try {
    for (let tick = 0; tick <= TENTH_SPAWN_TICK; tick += 1) {
      if (tick === FIRST_SPAWN_TICK) {
        noEquipmentBeforeFirstSpawn = equipmentSystem.listSnapshots().length === 0;
      }
      const result = timeline.step({
        tick,
        participants: participantFacts(tick),
        contestSeed: 0x5044 + tick,
      });
      worldExpiryEventCount += result.expiredEvents.length;
      if (tick === FIRST_SPAWN_TICK) {
        firstWaveSpawnCount = result.spawned.length;
        firstPickupKind = result.pickupDecisions[0]?.kind ?? null;
        const held = equipmentSystem.getHeldEquipment(PLAYER_ID);
        firstPickupEquipmentDefinitionId = held?.definitionId ?? null;
      }
      if (tick === SECOND_SPAWN_TICK) {
        replacementKind = result.pickupDecisions[0]?.kind ?? null;
        replacementEventTypes = Object.freeze(result.pickupEvents.map(({ type }) => type));
        const held = equipmentSystem.getHeldEquipment(PLAYER_ID);
        replacementEquipmentDefinitionId = held?.definitionId ?? null;
      }
    }
    const authority = Object.freeze({
      schemaVersion: ARENA_SURVIVAL_BASELINE_WEAPON_SUPPLY_VERIFICATION_V1_SCHEMA_VERSION,
      candidateStatus: ARENA_SURVIVAL_BASELINE_WEAPON_SUPPLY_VERIFICATION_V1_CANDIDATE_STATUS,
      hardGate: false as const,
      usesRealEquipmentSystem: true as const,
      usesRealSupplyTimeline: true as const,
      usesWaveRuntimeOverrides: true as const,
      exercisesP2ModeLifecycle: false as const,
      noEquipmentBeforeFirstSpawn,
      firstWaveIndex: FIRST_WAVE_INDEX,
      firstWaveSpawnTick: FIRST_SPAWN_TICK,
      firstWaveSpawnCount,
      firstWaveRuntimeEquipmentDefinitionIds: definitionIdsForWave(timeline, FIRST_WAVE_INDEX),
      firstPickupKind,
      firstPickupEquipmentDefinitionId,
      secondWaveIndex: SECOND_WAVE_INDEX,
      secondWaveSpawnTick: SECOND_SPAWN_TICK,
      secondWaveRuntimeEquipmentDefinitionIds: definitionIdsForWave(timeline, SECOND_WAVE_INDEX),
      replacementKind,
      replacementEquipmentDefinitionId,
      replacementEventTypes,
      tenthWaveIndex: TENTH_WAVE_INDEX,
      tenthWaveSpawnTick: TENTH_SPAWN_TICK,
      tenthWaveRuntimeEquipmentDefinitionIds: definitionIdsForWave(timeline, TENTH_WAVE_INDEX),
      worldExpiryEventCount,
      expiredHeldSupplyCount: equipmentSystem.listExpiredHeldSupplyEquipmentInstanceIds().length,
      catalogContentHash: CATALOG.contentHash,
    });
    return Object.freeze({
      ...authority,
      resultHash: createDeterministicDataHash(
        authority,
        'Arena Survival Baseline Weapon Supply Verification V1',
      ),
    });
  } finally {
    timeline.destroy();
    equipmentSystem.destroy();
  }
}
