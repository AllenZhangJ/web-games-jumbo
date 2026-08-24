import {
  ARENA_GAMEPLAY_V2_TUNING,
  CHARACTER_DEFINITION_SCHEMA_VERSION,
  MODE_KIND,
  MODE_POLICY_DEFINITION_SCHEMA_VERSION,
  compileJumpImpulseFromHeight,
  createCharacterDefinition,
  createSurvivalPressurePolicyDefinition,
} from '@number-strategy-jump/arena-definitions';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-base-map-candidate-v1.js';
import {
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-switchback-map-candidate-v1.js';

export const ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1_STATUS =
  'production-unreachable' as const;
export const ARENA_V2_SURVIVAL_PRESSURE_STAGE_INTERVAL_TICKS_CANDIDATE_V1 = 1_200 as const;
export const ARENA_V2_SURVIVAL_MAXIMUM_ACTIVE_ENEMIES_CANDIDATE_V1 = 16 as const;

const MODE_DEFINITION_ID = 'arena-v2.mode.survival.candidate.v1';
const CHARACTER_TUNING = ARENA_GAMEPLAY_V2_TUNING.character;
const REENTRY_ANCHOR_IDS = Object.freeze(
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.segments.map(({ respawnAnchorId }) => (
    respawnAnchorId
  )),
);
const ACTIVE_ENEMY_COUNTS = Object.freeze([1, 2, 3, 4, 5, 6, 8, 10, 12, 16]);

export const ARENA_V2_SURVIVAL_ENEMY_FAMILY_CHARACTER_DEFINITION_CANDIDATE_V1 =
  createCharacterDefinition({
    schemaVersion: CHARACTER_DEFINITION_SCHEMA_VERSION,
    id: 'arena-v2.character.survival-enemy-family.candidate.v1',
    collision: CHARACTER_TUNING.collision,
    movement: CHARACTER_TUNING.movement,
    jump: {
      groundImpulse: compileJumpImpulseFromHeight(CHARACTER_TUNING.jump.targetGroundHeight),
      crouchImpulse: compileJumpImpulseFromHeight(CHARACTER_TUNING.jump.targetChargedHeight),
      airImpulse: compileJumpImpulseFromHeight(CHARACTER_TUNING.jump.targetAirHeight),
      downSmashSpeed: CHARACTER_TUNING.jump.downAttackStartSpeed,
      downSmashAccelerationPerTick: CHARACTER_TUNING.jump.downAttackAccelerationPerTick,
      maximumDownSmashSpeed: CHARACTER_TUNING.jump.maximumDownAttackSpeed,
      coyoteTicks: CHARACTER_TUNING.jump.coyoteTicks,
      bufferTicks: CHARACTER_TUNING.jump.bufferTicks,
      maximumAirJumps: CHARACTER_TUNING.jump.maximumAirJumps,
      maximumCrouchChargeTicks: CHARACTER_TUNING.jump.maximumCrouchChargeTicks,
    },
    tags: ['arena-v2', 'survival', 'enemy-family', 'single-archetype', 'candidate'],
  });

export const ARENA_V2_SURVIVAL_ENEMY_SLOT_IDS_CANDIDATE_V1 = Object.freeze(
  Array.from(
    { length: ARENA_V2_SURVIVAL_MAXIMUM_ACTIVE_ENEMIES_CANDIDATE_V1 },
    (_, index) => `arena-v2-survival-enemy-slot-${String(index + 1).padStart(2, '0')}`,
  ),
);

export const ARENA_V2_SURVIVAL_PRESSURE_POLICY_DEFINITION_CANDIDATE_V1 =
  createSurvivalPressurePolicyDefinition({
    schemaVersion: MODE_POLICY_DEFINITION_SCHEMA_VERSION,
    id: 'arena-v2.mode-policy.survival.pressure.candidate.v1',
    contentVersion: 1,
    modeKind: MODE_KIND.SURVIVAL,
    slotActivationOrder: ARENA_V2_SURVIVAL_ENEMY_SLOT_IDS_CANDIDATE_V1,
    slotEntries: ARENA_V2_SURVIVAL_ENEMY_SLOT_IDS_CANDIDATE_V1.map((slotId, index) => ({
      slotId,
      anchorCapabilityId: REENTRY_ANCHOR_IDS[index % REENTRY_ANCHOR_IDS.length]!,
    })),
    stages: ACTIVE_ENEMY_COUNTS.map((desiredActiveEnemySlots, stage) => ({
      stage,
      startActiveTick: stage * ARENA_V2_SURVIVAL_PRESSURE_STAGE_INTERVAL_TICKS_CANDIDATE_V1,
      desiredActiveEnemySlots,
      reactivationDelayTicks: 180,
    })),
  });

const AUTHORITY = Object.freeze({
  schemaVersion: ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1_SCHEMA_VERSION,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  modeDefinitionId: MODE_DEFINITION_ID,
  enemyVisualArchetypeCount: 1 as const,
  enemyAuthorityFamilyCount: 1 as const,
  enemyFamilyCharacterDefinition:
    ARENA_V2_SURVIVAL_ENEMY_FAMILY_CHARACTER_DEFINITION_CANDIDATE_V1,
  pressurePolicyDefinition: ARENA_V2_SURVIVAL_PRESSURE_POLICY_DEFINITION_CANDIDATE_V1,
  maximumActiveEnemies: ARENA_V2_SURVIVAL_MAXIMUM_ACTIVE_ENEMIES_CANDIDATE_V1,
  stageIntervalTicks: ARENA_V2_SURVIVAL_PRESSURE_STAGE_INTERVAL_TICKS_CANDIDATE_V1,
  sharesMapDefinitionId: ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.mapDefinitionId,
  sharesMapDefinitionIds: Object.freeze([
    ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.mapDefinitionId,
    ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2.mapDefinitionId,
  ]),
  runtimeReentryAnchorsFollowSelectedRouteSegments: true as const,
});

export const ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  contentHash: createDeterministicDataHash(AUTHORITY, 'Arena V2 Survival Pressure Candidate V1'),
});
