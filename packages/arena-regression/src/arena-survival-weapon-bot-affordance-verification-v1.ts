import {
  SURVIVAL_ENEMY_FAMILY_PROFILE_CANDIDATE_V1,
  SURVIVAL_ENEMY_OBSERVATION_V1_SCHEMA_VERSION,
  SURVIVAL_ENEMY_PRIMARY_SOURCE_V1,
  SURVIVAL_ENEMY_WEAPON_AFFORDANCE_V1_SCHEMA_VERSION,
  SurvivalEnemyControllerV1,
  createSurvivalEnemyPrimaryActionAffordanceV1,
} from '@number-strategy-jump/arena-bot';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1,
  type ArenaV2SurvivalWeaponRuntimeVariantCandidateV1,
} from '@number-strategy-jump/arena-product-content';

export const ARENA_SURVIVAL_WEAPON_BOT_AFFORDANCE_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_SURVIVAL_WEAPON_BOT_AFFORDANCE_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

const ENEMY_ID = 'arena-p4-tier-bot-enemy';
const PLAYER_ID = 'arena-p4-tier-bot-player';
const SLOT_ID = 'arena-p4-tier-bot-slot';
const CATALOG = ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1;
const DISTANCE_BY_WEAPON: Readonly<Record<string, number>> = Object.freeze({
  'heavy-hammer': 1.8,
  'gravity-chain': 5,
  'charge-shield': 1.4,
});

export interface ArenaSurvivalWeaponBotAffordanceRunV1 {
  readonly weaponId: string;
  readonly survivalLevel: 1 | 10;
  readonly primaryRange: number;
  readonly minimumCommitmentTicks: number;
  readonly targetDistance: number;
  readonly actionReady: boolean;
  readonly primaryPressed: boolean;
  readonly primaryHeld: boolean;
  readonly ordinaryInputKeysOnly: boolean;
  readonly cooldownBlocksPrimary: boolean;
  readonly resultHash: string;
}

export interface ArenaSurvivalWeaponBotAffordanceVerificationReportV1 {
  readonly schemaVersion:
    typeof ARENA_SURVIVAL_WEAPON_BOT_AFFORDANCE_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_SURVIVAL_WEAPON_BOT_AFFORDANCE_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly consumesRestrictedObservation: true;
  readonly emitsOnlyInputFrame: true;
  readonly readsNoMatchCore: true;
  readonly writesNoHitOrMovement: true;
  readonly exercisesP2ModeLifecycle: false;
  readonly runs: readonly ArenaSurvivalWeaponBotAffordanceRunV1[];
  readonly resultHash: string;
}

function targetingRange(runtime: ArenaV2SurvivalWeaponRuntimeVariantCandidateV1): number {
  const parameters = runtime.actions[0]!.targeting.parameters as Readonly<Record<string, unknown>>;
  if (!Number.isFinite(parameters.range) || (parameters.range as number) <= 0) {
    throw new RangeError(`${runtime.weaponId} level ${runtime.level}缺少primary range。`);
  }
  return parameters.range as number;
}

function controller(): SurvivalEnemyControllerV1 {
  return new SurvivalEnemyControllerV1({
    participantId: ENEMY_ID,
    slotId: SLOT_ID,
    behaviorSeed: 0x5044,
    profile: SURVIVAL_ENEMY_FAMILY_PROFILE_CANDIDATE_V1,
  });
}

function affordance(
  runtime: ArenaV2SurvivalWeaponRuntimeVariantCandidateV1,
  cooldownRemainingTicks: number,
) {
  return createSurvivalEnemyPrimaryActionAffordanceV1({
    schemaVersion: SURVIVAL_ENEMY_WEAPON_AFFORDANCE_V1_SCHEMA_VERSION,
    sourceKind: SURVIVAL_ENEMY_PRIMARY_SOURCE_V1.EQUIPMENT,
    primaryActionDefinitionId: runtime.actions[0]!.id,
    collectionEquipmentDefinitionId: runtime.collectionEquipmentDefinitionId,
    runtimeEquipmentDefinitionId: runtime.equipment.id,
    survivalLevel: runtime.level,
    primaryRange: targetingRange(runtime),
    minimumCommitmentTicks: runtime.actions[0]!.commitment?.commitTicks ?? 0,
    cooldownRemainingTicks,
    actionBlocked: false,
  });
}

function observation(
  primaryRange: number,
  primaryMinimumCommitmentTicks: number,
  actionReady: boolean,
  targetDistance: number,
) {
  return {
    schemaVersion: SURVIVAL_ENEMY_OBSERVATION_V1_SCHEMA_VERSION,
    tick: 0,
    eventSequence: 0,
    modeDefinitionId: 'arena-v2.mode.survival.candidate.v1',
    participantId: ENEMY_ID,
    slotId: SLOT_ID,
    slotGeneration: 0,
    active: true,
    primaryRange,
    primaryMinimumCommitmentTicks,
    primaryCommitment: null,
    self: {
      position: { x: 0, y: 1.5, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      hitstunTicks: 0,
      actionReady,
      actionInProgress: false,
      currentSegmentId: 'kz-segment-01-platform',
    },
    player: {
      participantId: PLAYER_ID,
      position: { x: targetDistance, y: 1.5, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      invulnerableTicks: 0,
      currentSegmentId: 'kz-segment-01-platform',
    },
    routeTargets: [{
      segmentId: 'kz-segment-01-platform',
      anchorId: 'kz-a-route-start',
      position: { x: targetDistance, y: 1.5, z: 0 },
      intent: 'pursuit',
      traversal: 'walk',
      priority: 100,
    }],
  };
}

function runVariant(
  runtime: ArenaV2SurvivalWeaponRuntimeVariantCandidateV1,
): ArenaSurvivalWeaponBotAffordanceRunV1 {
  if (runtime.level !== 1 && runtime.level !== 10) {
    throw new RangeError('P4 Bot affordance只比较level 1/10。');
  }
  const targetDistance = DISTANCE_BY_WEAPON[runtime.weaponId];
  if (targetDistance === undefined) {
    throw new RangeError(`P4 Bot affordance缺少 ${runtime.weaponId} 的目标距离。`);
  }
  const ready = affordance(runtime, 0);
  const readyController = controller();
  const readyFrame = readyController.createInput(observation(
    ready.primaryRange,
    ready.minimumCommitmentTicks,
    ready.actionReady,
    targetDistance,
  ));
  readyController.destroy();
  const cooling = affordance(runtime, 1);
  const coolingController = controller();
  const coolingFrame = coolingController.createInput(observation(
    cooling.primaryRange,
    cooling.minimumCommitmentTicks,
    cooling.actionReady,
    targetDistance,
  ));
  coolingController.destroy();
  const inputKeys = Object.keys(readyFrame).sort();
  const ordinaryInputKeys = [
    'jumpHeld', 'jumpPressed', 'moveX', 'moveZ', 'participantId',
    'primaryHeld', 'primaryPressed', 'slamPressed', 'tick',
  ].sort();
  const authority = Object.freeze({
    weaponId: runtime.weaponId,
    survivalLevel: runtime.level,
    primaryRange: ready.primaryRange,
    minimumCommitmentTicks: ready.minimumCommitmentTicks,
    targetDistance,
    actionReady: ready.actionReady,
    primaryPressed: readyFrame.primaryPressed,
    primaryHeld: readyFrame.primaryHeld,
    ordinaryInputKeysOnly: inputKeys.join('|') === ordinaryInputKeys.join('|'),
    cooldownBlocksPrimary: !cooling.actionReady && !coolingFrame.primaryPressed,
  });
  return Object.freeze({
    ...authority,
    resultHash: createDeterministicDataHash(
      authority,
      `Arena Survival ${runtime.weaponId} Level ${runtime.level} Bot Affordance`,
    ),
  });
}

export function runArenaSurvivalWeaponBotAffordanceVerificationCandidateV1():
ArenaSurvivalWeaponBotAffordanceVerificationReportV1 {
  const runs = Object.freeze((['heavy-hammer', 'gravity-chain', 'charge-shield'] as const)
    .flatMap((weaponId) => ([1, 10] as const).map((level) => {
      const runtime = CATALOG.runtimeVariants.find((candidate) => (
        candidate.weaponId === weaponId && candidate.level === level
      ));
      if (!runtime) throw new Error(`${weaponId} level ${level} Bot runtime缺失。`);
      return runVariant(runtime);
    })));
  const authority = Object.freeze({
    schemaVersion: ARENA_SURVIVAL_WEAPON_BOT_AFFORDANCE_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_SURVIVAL_WEAPON_BOT_AFFORDANCE_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    consumesRestrictedObservation: true as const,
    emitsOnlyInputFrame: true as const,
    readsNoMatchCore: true as const,
    writesNoHitOrMovement: true as const,
    exercisesP2ModeLifecycle: false as const,
    runs,
  });
  return Object.freeze({
    ...authority,
    resultHash: createDeterministicDataHash(
      authority,
      'Arena Survival Weapon Bot Affordance Verification V1',
    ),
  });
}
