import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  createActionDefinition,
} from '@number-strategy-jump/arena-definitions';
import { ActionRegistry } from '@number-strategy-jump/arena-definitions';
import {
  EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_DROP_FALLBACK,
  EQUIPMENT_DROP_POLICY,
  EQUIPMENT_PICKUP_MODE,
  createEquipmentDefinition,
} from '../equipment/equipment-definition.js';
import { EquipmentRegistry } from '../equipment/equipment-registry.js';
import { cloneFrozenData, cloneFrozenStringSet } from '@number-strategy-jump/arena-contracts';
import { ARENA_GAMEPLAY_V2_TUNING } from './arena-gameplay-v2-tuning.js';

const ATTACK_TUNING = ARENA_GAMEPLAY_V2_TUNING.attacks;

export const STAGE4_ACTION_ID = Object.freeze({
  BASE_PUSH: 'base-push',
  BASE_AIR_STRIKE: 'base-air-strike',
  HAMMER_SMASH: 'hammer-smash',
  HAMMER_AIR_SMASH: 'hammer-air-smash',
  CHAIN_PULL: 'chain-pull',
  CHAIN_AIR_LASH: 'chain-air-lash',
  SHIELD_CHARGE: 'shield-charge',
  SHIELD_AIR_DROP: 'shield-air-drop',
});

export const STAGE4_EQUIPMENT_ID = Object.freeze({
  HAMMER: 'hammer',
  CHAIN: 'chain',
  SHIELD: 'shield',
});

export const STAGE4_INITIAL_EQUIPMENT_SPAWNS = Object.freeze([
  Object.freeze({
    id: 'stage4-hammer-center',
    definitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    position: Object.freeze({ x: 0, y: 1, z: 0 }),
  }),
  Object.freeze({
    id: 'stage4-chain-north',
    definitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    position: Object.freeze({ x: 0, y: 1, z: 3 }),
  }),
  Object.freeze({
    id: 'stage4-shield-south',
    definitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    position: Object.freeze({ x: 0, y: 1, z: -3 }),
  }),
]);

function action(value) {
  return createActionDefinition({
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    input: {
      channel: ACTION_INPUT_CHANNEL.PRIMARY,
      trigger: ACTION_INPUT_TRIGGER.PRESSED,
    },
    lane: ACTION_LANE.COMBAT,
    conflictTags: [],
    tags: [],
    ...value,
  });
}

function equipment(value) {
  return createEquipmentDefinition({
    schemaVersion: EQUIPMENT_DEFINITION_SCHEMA_VERSION,
    slot: 'primary',
    pickup: {
      mode: EQUIPMENT_PICKUP_MODE.AUTOMATIC,
      radius: ARENA_GAMEPLAY_V2_TUNING.equipment.automaticPickupRadius,
    },
    drop: {
      onOwnerEliminated: EQUIPMENT_DROP_POLICY.LAST_SAFE_POSITION,
      invalidPositionFallback: EQUIPMENT_DROP_FALLBACK.ORIGIN_SPAWN,
    },
    tags: [],
    ...value,
  });
}

function configuredTargeting(tuning) {
  const { kind, ...parameters } = tuning.targeting;
  return { kind, parameters };
}

function aerialAction({ id, tags }) {
  const tuning = ATTACK_TUNING[id];
  return action({
    id,
    kind: 'aerial-attack',
    conflictTags: ['aerial-commitment'],
    timing: tuning.timing,
    targeting: configuredTargeting(tuning),
    effects: [
      {
        id: `${id}-begin-descent`,
        kind: 'begin-down-smash',
        trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
        parameters: {},
      },
      {
        id: `${id}-interrupt`,
        kind: 'interrupt-action',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {},
      },
      {
        id: `${id}-hitstun`,
        kind: 'apply-hitstun',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { ticks: tuning.hitstunTicks },
      },
      {
        id: `${id}-impulse`,
        kind: 'apply-directional-impulse',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {
          horizontalImpulse: tuning.knockback.horizontalImpulse,
          verticalImpulse: tuning.knockback.verticalImpulse,
        },
      },
    ],
    tags: ['aerial', ...tags],
  });
}

export const STAGE4_ACTION_DEFINITIONS = Object.freeze([
  action({
    id: STAGE4_ACTION_ID.BASE_PUSH,
    kind: 'base-attack',
    timing: ATTACK_TUNING[STAGE4_ACTION_ID.BASE_PUSH].timing,
    targeting: configuredTargeting(ATTACK_TUNING[STAGE4_ACTION_ID.BASE_PUSH]),
    effects: [
      {
        id: 'base-push-interrupt',
        kind: 'interrupt-action',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {},
      },
      {
        id: 'base-push-hitstun',
        kind: 'apply-hitstun',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { ticks: ATTACK_TUNING[STAGE4_ACTION_ID.BASE_PUSH].hitstunTicks },
      },
      {
        id: 'base-push-impulse',
        kind: 'apply-directional-impulse',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {
          horizontalImpulse: ATTACK_TUNING[STAGE4_ACTION_ID.BASE_PUSH].knockback.horizontalImpulse,
          verticalImpulse: ATTACK_TUNING[STAGE4_ACTION_ID.BASE_PUSH].knockback.verticalImpulse,
        },
      },
    ],
    tags: ['core', 'fallback'],
  }),
  action({
    id: STAGE4_ACTION_ID.HAMMER_SMASH,
    kind: 'equipment-attack',
    timing: ATTACK_TUNING[STAGE4_ACTION_ID.HAMMER_SMASH].timing,
    targeting: configuredTargeting(ATTACK_TUNING[STAGE4_ACTION_ID.HAMMER_SMASH]),
    effects: [
      {
        id: 'hammer-interrupt',
        kind: 'interrupt-action',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {},
      },
      {
        id: 'hammer-hitstun',
        kind: 'apply-hitstun',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { ticks: ATTACK_TUNING[STAGE4_ACTION_ID.HAMMER_SMASH].hitstunTicks },
      },
      {
        id: 'hammer-impulse',
        kind: 'apply-directional-impulse',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {
          horizontalImpulse: ATTACK_TUNING[STAGE4_ACTION_ID.HAMMER_SMASH].knockback.horizontalImpulse,
          verticalImpulse: ATTACK_TUNING[STAGE4_ACTION_ID.HAMMER_SMASH].knockback.verticalImpulse,
        },
      },
    ],
    tags: ['equipment', 'knockback'],
  }),
  action({
    id: STAGE4_ACTION_ID.CHAIN_PULL,
    kind: 'equipment-attack',
    timing: ATTACK_TUNING[STAGE4_ACTION_ID.CHAIN_PULL].timing,
    targeting: configuredTargeting(ATTACK_TUNING[STAGE4_ACTION_ID.CHAIN_PULL]),
    effects: [
      {
        id: 'chain-interrupt',
        kind: 'interrupt-action',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {},
      },
      {
        id: 'chain-hitstun',
        kind: 'apply-hitstun',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { ticks: ATTACK_TUNING[STAGE4_ACTION_ID.CHAIN_PULL].hitstunTicks },
      },
      {
        id: 'chain-pull-target',
        kind: 'pull-to-source',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {
          horizontalImpulse: ATTACK_TUNING[STAGE4_ACTION_ID.CHAIN_PULL].knockback.horizontalImpulse,
          verticalImpulse: ATTACK_TUNING[STAGE4_ACTION_ID.CHAIN_PULL].knockback.verticalImpulse,
        },
      },
    ],
    tags: ['equipment', 'reposition'],
  }),
  action({
    id: STAGE4_ACTION_ID.SHIELD_CHARGE,
    kind: 'equipment-defense',
    timing: ATTACK_TUNING[STAGE4_ACTION_ID.SHIELD_CHARGE].timing,
    targeting: configuredTargeting(ATTACK_TUNING[STAGE4_ACTION_ID.SHIELD_CHARGE]),
    effects: [
      {
        id: 'shield-interrupt',
        kind: 'interrupt-action',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {},
      },
      {
        id: 'shield-front-guard',
        kind: 'front-guard',
        trigger: ACTION_EFFECT_TRIGGER.ACTION_ACTIVE,
        parameters: {
          minimumFacingDot: ATTACK_TUNING[STAGE4_ACTION_ID.SHIELD_CHARGE]
            .guard.minimumFacingDot,
          impulseMultiplier: ATTACK_TUNING[STAGE4_ACTION_ID.SHIELD_CHARGE]
            .guard.impulseMultiplier,
          cancelledEffectKinds: ['pull-to-source'],
        },
      },
      {
        id: 'shield-self-charge',
        kind: 'apply-self-impulse',
        trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
        parameters: {
          horizontalImpulse: ATTACK_TUNING[STAGE4_ACTION_ID.SHIELD_CHARGE]
            .selfMovement.horizontalImpulse,
        },
      },
      {
        id: 'shield-target-impulse',
        kind: 'apply-directional-impulse',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {
          horizontalImpulse: ATTACK_TUNING[STAGE4_ACTION_ID.SHIELD_CHARGE]
            .knockback.horizontalImpulse,
          verticalImpulse: ATTACK_TUNING[STAGE4_ACTION_ID.SHIELD_CHARGE]
            .knockback.verticalImpulse,
        },
      },
    ],
    tags: ['defense', 'equipment', 'reposition'],
  }),
  aerialAction({
    id: STAGE4_ACTION_ID.BASE_AIR_STRIKE,
    tags: ['core', 'fallback'],
  }),
  aerialAction({
    id: STAGE4_ACTION_ID.HAMMER_AIR_SMASH,
    tags: ['equipment', 'knockback'],
  }),
  aerialAction({
    id: STAGE4_ACTION_ID.CHAIN_AIR_LASH,
    tags: ['equipment', 'reposition'],
  }),
  aerialAction({
    id: STAGE4_ACTION_ID.SHIELD_AIR_DROP,
    tags: ['defense', 'equipment'],
  }),
]);

export const STAGE4_EQUIPMENT_DEFINITIONS = Object.freeze([
  equipment({
    id: STAGE4_EQUIPMENT_ID.HAMMER,
    category: 'knockback',
    actionDefinitionId: STAGE4_ACTION_ID.HAMMER_SMASH,
    aerialActionDefinitionId: STAGE4_ACTION_ID.HAMMER_AIR_SMASH,
    presentationSemantic: 'heavy-smash',
  }),
  equipment({
    id: STAGE4_EQUIPMENT_ID.CHAIN,
    category: 'reposition',
    actionDefinitionId: STAGE4_ACTION_ID.CHAIN_PULL,
    aerialActionDefinitionId: STAGE4_ACTION_ID.CHAIN_AIR_LASH,
    presentationSemantic: 'chain-pull',
  }),
  equipment({
    id: STAGE4_EQUIPMENT_ID.SHIELD,
    category: 'defense-charge',
    actionDefinitionId: STAGE4_ACTION_ID.SHIELD_CHARGE,
    aerialActionDefinitionId: STAGE4_ACTION_ID.SHIELD_AIR_DROP,
    presentationSemantic: 'shield-charge',
  }),
]);

function createConfiguredActionDefinitions(basePush) {
  if (basePush === null || basePush === undefined) return STAGE4_ACTION_DEFINITIONS;
  return Object.freeze(STAGE4_ACTION_DEFINITIONS.map((definition) => {
    if (definition.id !== STAGE4_ACTION_ID.BASE_PUSH) return definition;
    return createActionDefinition({
      ...definition,
      timing: {
        ...definition.timing,
        windupTicks: basePush.windupTicks,
        activeTicks: basePush.activeTicks,
        recoveryTicks: basePush.recoveryTicks,
      },
      targeting: {
        ...definition.targeting,
        parameters: {
          range: basePush.range,
          minimumFacingDot: basePush.minimumFacingDot,
          maximumVerticalDifference: basePush.maximumVerticalDifference,
        },
      },
      effects: definition.effects.map((effect) => {
        if (effect.kind === 'apply-hitstun') {
          return { ...effect, parameters: { ticks: basePush.hitstunTicks } };
        }
        if (effect.kind === 'apply-directional-impulse') {
          return {
            ...effect,
            parameters: {
              horizontalImpulse: basePush.horizontalImpulse,
              verticalImpulse: basePush.verticalImpulse,
            },
          };
        }
        return effect;
      }),
    });
  }));
}

export function createStage4ContentRegistries({
  basePush = null,
  additionalActionDefinitions = [],
  equipmentDefinitionIds = null,
} = {}) {
  if (!Array.isArray(additionalActionDefinitions)) {
    throw new TypeError('additionalActionDefinitions 必须是数组。');
  }
  const selectedEquipmentIds = equipmentDefinitionIds === null
    ? Object.freeze(STAGE4_EQUIPMENT_DEFINITIONS.map(({ id }) => id))
    : cloneFrozenStringSet(
      cloneFrozenData(equipmentDefinitionIds, 'equipmentDefinitionIds'),
      'equipmentDefinitionIds',
    );
  const knownEquipmentIds = new Set(STAGE4_EQUIPMENT_DEFINITIONS.map(({ id }) => id));
  for (const definitionId of selectedEquipmentIds) {
    if (!knownEquipmentIds.has(definitionId)) {
      throw new RangeError(`未知 Stage 4 EquipmentDefinition ${definitionId}。`);
    }
  }
  const equipmentDefinitions = STAGE4_EQUIPMENT_DEFINITIONS.filter(({ id }) => (
    selectedEquipmentIds.includes(id)
  ));
  const selectedActionIds = new Set(equipmentDefinitions.flatMap(({
    actionDefinitionId,
    aerialActionDefinitionId,
  }) => [actionDefinitionId, aerialActionDefinitionId]));
  const actionDefinitions = createConfiguredActionDefinitions(basePush).filter((definition) => (
    definition.id === STAGE4_ACTION_ID.BASE_PUSH
      || definition.id === STAGE4_ACTION_ID.BASE_AIR_STRIKE
      || selectedActionIds.has(definition.id)
  ));
  const actionRegistry = new ActionRegistry([
    ...actionDefinitions,
    ...additionalActionDefinitions,
  ]);
  const equipmentRegistry = new EquipmentRegistry({
    definitions: equipmentDefinitions,
    actionRegistry,
  });
  return Object.freeze({ actionRegistry, equipmentRegistry });
}
