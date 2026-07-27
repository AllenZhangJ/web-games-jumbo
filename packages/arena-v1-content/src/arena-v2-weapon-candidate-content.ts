import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  ActionRegistry,
  ARENA_GAMEPLAY_V2_TUNING,
  createActionDefinition,
  createEquipmentDefinition,
  EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_DROP_FALLBACK,
  EQUIPMENT_DROP_POLICY,
  EQUIPMENT_PICKUP_MODE,
  EquipmentRegistry,
  type ActionCommitmentDefinition,
  type ActionDefinition,
  type EquipmentDefinition,
} from '@number-strategy-jump/arena-definitions';
import type { ArenaBasePushConfig } from '@number-strategy-jump/arena-match';
import {
  createStage4ContentRegistries,
  STAGE4_EQUIPMENT_DEFINITIONS,
} from './stage4-equipment.js';
import { STAGE6_MOVEMENT_ACTION_DEFINITIONS } from './stage6-movement-actions.js';

export const ARENA_V2_WEAPON_CANDIDATE_LANGUAGE_ID = Object.freeze({
  LINE_PRESSURE: 'line-pressure',
  ZONE_DENIAL: 'zone-denial',
  DELAYED_HEAVY: 'delayed-heavy',
  READ_PUNISH: 'read-punish',
  FLANK: 'flank',
} as const);

export type ArenaV2WeaponCandidateLanguageId =
  typeof ARENA_V2_WEAPON_CANDIDATE_LANGUAGE_ID[
    keyof typeof ARENA_V2_WEAPON_CANDIDATE_LANGUAGE_ID
  ];

export const ARENA_V2_WEAPON_CANDIDATE_ID = Object.freeze({
  LINE_PRESSURE: 'research-line-pressure',
  ZONE_DENIAL: 'research-zone-denial',
  DELAYED_HEAVY: 'research-delayed-heavy',
  READ_PUNISH: 'research-read-punish',
  FLANK: 'research-flank',
} as const);

export const ARENA_V2_WEAPON_CANDIDATE_ACTION_ID = Object.freeze({
  LINE_PRESSURE_GROUND: 'research-line-pressure-ground',
  LINE_PRESSURE_AERIAL: 'research-line-pressure-aerial',
  ZONE_DENIAL_GROUND: 'research-zone-denial-ground',
  ZONE_DENIAL_AERIAL: 'research-zone-denial-aerial',
  DELAYED_HEAVY_GROUND: 'research-delayed-heavy-ground',
  DELAYED_HEAVY_AERIAL: 'research-delayed-heavy-aerial',
  READ_PUNISH_GROUND: 'research-read-punish-ground',
  READ_PUNISH_AERIAL: 'research-read-punish-aerial',
  FLANK_GROUND: 'research-flank-ground',
  FLANK_AERIAL: 'research-flank-aerial',
} as const);

export interface ArenaV2WeaponCandidateContentDefinition {
  readonly weaponId: string;
  readonly languageId: ArenaV2WeaponCandidateLanguageId;
  readonly groundAction: ActionDefinition;
  readonly aerialAction: ActionDefinition;
  readonly equipment: EquipmentDefinition;
  readonly targetDistance: number;
  readonly responseTicks: number;
}

interface AttackDefinitionInput {
  readonly id: string;
  readonly aerial?: boolean;
  readonly targeting: Readonly<{ kind: string; parameters: Readonly<Record<string, unknown>> }>;
  readonly timing: Readonly<{
    windupTicks: number;
    activeTicks: number;
    recoveryTicks: number;
    cooldownTicks: number;
  }>;
  readonly targetGroundKnockbackDistance: number;
  readonly verticalImpulse: number;
  readonly hitstunTicks: number;
  readonly tags: readonly string[];
  readonly commitment?: ActionCommitmentDefinition;
}

function attackDefinition(input: AttackDefinitionInput): ActionDefinition {
  return createActionDefinition({
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id: input.id,
    kind: 'research-language-attack',
    input: {
      channel: ACTION_INPUT_CHANNEL.PRIMARY,
      trigger: ACTION_INPUT_TRIGGER.PRESSED,
    },
    lane: ACTION_LANE.COMBAT,
    conflictTags: ['research-language-commitment'],
    timing: input.timing,
    ...(input.commitment ? { commitment: input.commitment } : {}),
    targeting: input.targeting,
    effects: [
      ...(input.aerial ? [{
        id: `${input.id}-begin-descent`,
        kind: 'begin-down-smash',
        trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
        parameters: {},
      }] : []),
      {
        id: `${input.id}-interrupt`,
        kind: 'interrupt-action',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {},
      },
      {
        id: `${input.id}-hitstun`,
        kind: 'apply-hitstun',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { ticks: input.hitstunTicks },
      },
      {
        id: `${input.id}-impulse`,
        kind: 'apply-directional-impulse',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {
          horizontalImpulse: Math.sqrt(
            2 * ARENA_GAMEPLAY_V2_TUNING.physics.standardGroundDeceleration
              * input.targetGroundKnockbackDistance,
          ),
          verticalImpulse: input.verticalImpulse,
        },
      },
    ],
    tags: input.tags,
  });
}

function equipmentDefinition({
  id,
  groundActionId,
  aerialActionId,
  languageId,
}: Readonly<{
  id: string;
  groundActionId: string;
  aerialActionId: string;
  languageId: ArenaV2WeaponCandidateLanguageId;
}>): EquipmentDefinition {
  return createEquipmentDefinition({
    schemaVersion: EQUIPMENT_DEFINITION_SCHEMA_VERSION,
    id,
    category: 'research-language',
    slot: 'primary',
    actionDefinitionId: groundActionId,
    aerialActionDefinitionId: aerialActionId,
    pickup: {
      mode: EQUIPMENT_PICKUP_MODE.AUTOMATIC,
      radius: ARENA_GAMEPLAY_V2_TUNING.equipment.automaticPickupRadius,
    },
    drop: {
      onOwnerEliminated: EQUIPMENT_DROP_POLICY.LAST_SAFE_POSITION,
      invalidPositionFallback: EQUIPMENT_DROP_FALLBACK.ORIGIN_SPAWN,
    },
    presentationSemantic: `research-${languageId}`,
    tags: ['research', 'v2-language'],
  });
}

const lineGround = attackDefinition({
  id: ARENA_V2_WEAPON_CANDIDATE_ACTION_ID.LINE_PRESSURE_GROUND,
  targeting: {
    kind: 'facing-cone',
    parameters: { range: 5.5, minimumFacingDot: 0.8, maximumVerticalDifference: 1.5 },
  },
  timing: { windupTicks: 8, activeTicks: 3, recoveryTicks: 18, cooldownTicks: 60 },
  targetGroundKnockbackDistance: 0.55,
  verticalImpulse: 2.2,
  hitstunTicks: 12,
  tags: ['line-pressure', 'ground'],
});
const lineAir = attackDefinition({
  id: ARENA_V2_WEAPON_CANDIDATE_ACTION_ID.LINE_PRESSURE_AERIAL,
  aerial: true,
  targeting: {
    kind: 'downward-cylinder',
    parameters: { range: 3, radius: 1.1, minimumVerticalDrop: 0, maximumVerticalDifference: 3 },
  },
  timing: { windupTicks: 6, activeTicks: 4, recoveryTicks: 20, cooldownTicks: 60 },
  targetGroundKnockbackDistance: 0.7,
  verticalImpulse: 2.8,
  hitstunTicks: 14,
  tags: ['line-pressure', 'aerial'],
});

const zoneGround = attackDefinition({
  id: ARENA_V2_WEAPON_CANDIDATE_ACTION_ID.ZONE_DENIAL_GROUND,
  targeting: {
    kind: 'facing-capsule',
    parameters: { range: 4, radius: 1.2, maximumVerticalDifference: 1.5 },
  },
  timing: { windupTicks: 24, activeTicks: 3, recoveryTicks: 18, cooldownTicks: 96 },
  targetGroundKnockbackDistance: 0.8,
  verticalImpulse: 2.5,
  hitstunTicks: 18,
  tags: ['zone-denial', 'warning', 'ground'],
});
const zoneAir = attackDefinition({
  id: ARENA_V2_WEAPON_CANDIDATE_ACTION_ID.ZONE_DENIAL_AERIAL,
  aerial: true,
  targeting: {
    kind: 'downward-cylinder',
    parameters: { range: 3.2, radius: 1.4, minimumVerticalDrop: 0, maximumVerticalDifference: 3.2 },
  },
  timing: { windupTicks: 18, activeTicks: 4, recoveryTicks: 20, cooldownTicks: 96 },
  targetGroundKnockbackDistance: 0.9,
  verticalImpulse: 3,
  hitstunTicks: 20,
  tags: ['zone-denial', 'warning', 'aerial'],
});

const delayedGround = attackDefinition({
  id: ARENA_V2_WEAPON_CANDIDATE_ACTION_ID.DELAYED_HEAVY_GROUND,
  targeting: {
    kind: 'facing-cone',
    parameters: { range: 2.4, minimumFacingDot: 0.45, maximumVerticalDifference: 1.5 },
  },
  timing: { windupTicks: 30, activeTicks: 3, recoveryTicks: 30, cooldownTicks: 120 },
  targetGroundKnockbackDistance: 3.3,
  verticalImpulse: 6.5,
  hitstunTicks: 30,
  tags: ['delayed-heavy', 'warning', 'ground'],
});
const delayedAir = attackDefinition({
  id: ARENA_V2_WEAPON_CANDIDATE_ACTION_ID.DELAYED_HEAVY_AERIAL,
  aerial: true,
  targeting: {
    kind: 'downward-cylinder',
    parameters: { range: 3, radius: 1.3, minimumVerticalDrop: 0, maximumVerticalDifference: 3 },
  },
  timing: { windupTicks: 22, activeTicks: 4, recoveryTicks: 32, cooldownTicks: 120 },
  targetGroundKnockbackDistance: 3.6,
  verticalImpulse: 7,
  hitstunTicks: 32,
  tags: ['delayed-heavy', 'warning', 'aerial'],
});

const readPunishCommitment: ActionCommitmentDefinition = Object.freeze({
  commitTicks: 12,
  expireTicks: 18,
  expireOutcome: 'cancel',
  canTurn: true,
  levelThresholds: Object.freeze([6, 12]),
});
const readPunishGround = attackDefinition({
  id: ARENA_V2_WEAPON_CANDIDATE_ACTION_ID.READ_PUNISH_GROUND,
  targeting: {
    kind: 'facing-cone',
    parameters: { range: 3.2, minimumFacingDot: 0.75, maximumVerticalDifference: 1.5 },
  },
  timing: { windupTicks: 24, activeTicks: 2, recoveryTicks: 28, cooldownTicks: 96 },
  targetGroundKnockbackDistance: 2.4,
  verticalImpulse: 4.8,
  hitstunTicks: 24,
  tags: ['read-punish', 'active-frames', 'ground'],
  commitment: readPunishCommitment,
});
const readPunishAir = attackDefinition({
  id: ARENA_V2_WEAPON_CANDIDATE_ACTION_ID.READ_PUNISH_AERIAL,
  aerial: true,
  targeting: {
    kind: 'downward-cylinder',
    parameters: { range: 2.8, radius: 1.1, minimumVerticalDrop: 0, maximumVerticalDifference: 2.8 },
  },
  timing: { windupTicks: 20, activeTicks: 3, recoveryTicks: 30, cooldownTicks: 96 },
  targetGroundKnockbackDistance: 2.6,
  verticalImpulse: 5.4,
  hitstunTicks: 26,
  tags: ['read-punish', 'active-frames', 'aerial'],
  commitment: readPunishCommitment,
});

const flankGround = attackDefinition({
  id: ARENA_V2_WEAPON_CANDIDATE_ACTION_ID.FLANK_GROUND,
  targeting: {
    kind: 'rear-cone',
    parameters: { range: 3.4, minimumFacingDot: 0.65, maximumVerticalDifference: 1.5 },
  },
  timing: { windupTicks: 10, activeTicks: 3, recoveryTicks: 22, cooldownTicks: 72 },
  targetGroundKnockbackDistance: 2,
  verticalImpulse: 3.2,
  hitstunTicks: 16,
  tags: ['flank', 'directional', 'ground'],
});
const flankAir = attackDefinition({
  id: ARENA_V2_WEAPON_CANDIDATE_ACTION_ID.FLANK_AERIAL,
  aerial: true,
  targeting: {
    kind: 'rear-cone',
    parameters: { range: 2.8, minimumFacingDot: 0.6, maximumVerticalDifference: 2.8 },
  },
  timing: { windupTicks: 8, activeTicks: 3, recoveryTicks: 24, cooldownTicks: 72 },
  targetGroundKnockbackDistance: 2.2,
  verticalImpulse: 3.8,
  hitstunTicks: 18,
  tags: ['flank', 'directional', 'aerial'],
});

function candidate({
  weaponId,
  languageId,
  groundAction,
  aerialAction,
  targetDistance,
}: Readonly<{
  weaponId: string;
  languageId: ArenaV2WeaponCandidateLanguageId;
  groundAction: ActionDefinition;
  aerialAction: ActionDefinition;
  targetDistance: number;
}>): ArenaV2WeaponCandidateContentDefinition {
  return Object.freeze({
    weaponId,
    languageId,
    groundAction,
    aerialAction,
    equipment: equipmentDefinition({
      id: weaponId,
      groundActionId: groundAction.id,
      aerialActionId: aerialAction.id,
      languageId,
    }),
    targetDistance,
    responseTicks: groundAction.timing.windupTicks,
  });
}

export const ARENA_V2_WEAPON_CANDIDATE_CONTENT_DEFINITIONS = Object.freeze([
  candidate({
    weaponId: ARENA_V2_WEAPON_CANDIDATE_ID.LINE_PRESSURE,
    languageId: ARENA_V2_WEAPON_CANDIDATE_LANGUAGE_ID.LINE_PRESSURE,
    groundAction: lineGround,
    aerialAction: lineAir,
    targetDistance: 4,
  }),
  candidate({
    weaponId: ARENA_V2_WEAPON_CANDIDATE_ID.ZONE_DENIAL,
    languageId: ARENA_V2_WEAPON_CANDIDATE_LANGUAGE_ID.ZONE_DENIAL,
    groundAction: zoneGround,
    aerialAction: zoneAir,
    targetDistance: 2.8,
  }),
  candidate({
    weaponId: ARENA_V2_WEAPON_CANDIDATE_ID.DELAYED_HEAVY,
    languageId: ARENA_V2_WEAPON_CANDIDATE_LANGUAGE_ID.DELAYED_HEAVY,
    groundAction: delayedGround,
    aerialAction: delayedAir,
    targetDistance: 1.8,
  }),
  candidate({
    weaponId: ARENA_V2_WEAPON_CANDIDATE_ID.READ_PUNISH,
    languageId: ARENA_V2_WEAPON_CANDIDATE_LANGUAGE_ID.READ_PUNISH,
    groundAction: readPunishGround,
    aerialAction: readPunishAir,
    targetDistance: 2.2,
  }),
  candidate({
    weaponId: ARENA_V2_WEAPON_CANDIDATE_ID.FLANK,
    languageId: ARENA_V2_WEAPON_CANDIDATE_LANGUAGE_ID.FLANK,
    groundAction: flankGround,
    aerialAction: flankAir,
    targetDistance: 2.3,
  }),
]);

export interface ArenaV2WeaponCandidateContentRegistryOptions {
  readonly basePush?: ArenaBasePushConfig | null;
  readonly additionalActionDefinitions?: readonly ActionDefinition[];
}

export function createArenaV2WeaponCandidateContentRegistries(
  options: ArenaV2WeaponCandidateContentRegistryOptions = {},
) {
  const additionalActionDefinitions = [
    ...STAGE6_MOVEMENT_ACTION_DEFINITIONS,
    ...ARENA_V2_WEAPON_CANDIDATE_CONTENT_DEFINITIONS.flatMap(({ groundAction, aerialAction }) => (
      [groundAction, aerialAction]
    )),
    ...(options.additionalActionDefinitions ?? []),
  ];
  const registryOptions = options.basePush === undefined
    ? { additionalActionDefinitions }
    : { basePush: options.basePush, additionalActionDefinitions };
  const base = createStage4ContentRegistries(registryOptions);
  const actionRegistry = new ActionRegistry(base.actionRegistry.list());
  const equipmentRegistry = new EquipmentRegistry({
    definitions: [
      ...STAGE4_EQUIPMENT_DEFINITIONS,
      ...ARENA_V2_WEAPON_CANDIDATE_CONTENT_DEFINITIONS.map(({ equipment }) => equipment),
    ],
    actionRegistry,
  });
  return Object.freeze({
    actionRegistry,
    equipmentRegistry,
  });
}
