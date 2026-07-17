import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  createActionDefinition,
} from '../action/action-definition.js';
import { ActionRegistry } from '../action/action-registry.js';
import {
  EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_DROP_FALLBACK,
  EQUIPMENT_DROP_POLICY,
  EQUIPMENT_PICKUP_MODE,
  createEquipmentDefinition,
} from '../equipment/equipment-definition.js';
import { EquipmentRegistry } from '../equipment/equipment-registry.js';

export const STAGE4_ACTION_ID = Object.freeze({
  BASE_PUSH: 'base-push',
  HAMMER_SMASH: 'hammer-smash',
  CHAIN_PULL: 'chain-pull',
  SHIELD_CHARGE: 'shield-charge',
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
    pickup: { mode: EQUIPMENT_PICKUP_MODE.AUTOMATIC, radius: 0.8 },
    drop: {
      onOwnerEliminated: EQUIPMENT_DROP_POLICY.LAST_SAFE_POSITION,
      invalidPositionFallback: EQUIPMENT_DROP_FALLBACK.ORIGIN_SPAWN,
    },
    tags: [],
    ...value,
  });
}

export const STAGE4_ACTION_DEFINITIONS = Object.freeze([
  action({
    id: STAGE4_ACTION_ID.BASE_PUSH,
    kind: 'base-attack',
    timing: { windupTicks: 8, activeTicks: 3, recoveryTicks: 15, cooldownTicks: 0 },
    targeting: {
      kind: 'facing-cone',
      parameters: { range: 1.5, minimumFacingDot: 0.35, maximumVerticalDifference: 1.5 },
    },
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
        parameters: { ticks: 24 },
      },
      {
        id: 'base-push-impulse',
        kind: 'apply-directional-impulse',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { horizontalImpulse: 8.5, verticalImpulse: 4.8 },
      },
    ],
    tags: ['core', 'fallback'],
  }),
  action({
    id: STAGE4_ACTION_ID.HAMMER_SMASH,
    kind: 'equipment-attack',
    timing: { windupTicks: 18, activeTicks: 3, recoveryTicks: 24, cooldownTicks: 72 },
    targeting: {
      kind: 'facing-cone',
      parameters: { range: 1.8, minimumFacingDot: 0.4, maximumVerticalDifference: 1.5 },
    },
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
        parameters: { ticks: 30 },
      },
      {
        id: 'hammer-impulse',
        kind: 'apply-directional-impulse',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { horizontalImpulse: 15, verticalImpulse: 6.2 },
      },
    ],
    tags: ['equipment', 'knockback'],
  }),
  action({
    id: STAGE4_ACTION_ID.CHAIN_PULL,
    kind: 'equipment-attack',
    timing: { windupTicks: 12, activeTicks: 4, recoveryTicks: 20, cooldownTicks: 90 },
    targeting: {
      kind: 'facing-cone',
      parameters: { range: 5, minimumFacingDot: 0.55, maximumVerticalDifference: 2 },
    },
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
        parameters: { ticks: 20 },
      },
      {
        id: 'chain-pull-target',
        kind: 'pull-to-source',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { horizontalImpulse: 10, verticalImpulse: 2.5 },
      },
    ],
    tags: ['equipment', 'reposition'],
  }),
  action({
    id: STAGE4_ACTION_ID.SHIELD_CHARGE,
    kind: 'equipment-defense',
    timing: { windupTicks: 5, activeTicks: 16, recoveryTicks: 18, cooldownTicks: 96 },
    targeting: {
      kind: 'facing-capsule',
      parameters: { range: 1.6, radius: 0.65, maximumVerticalDifference: 1.5 },
    },
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
          minimumFacingDot: 0.25,
          impulseMultiplier: 0.2,
          cancelledEffectKinds: ['pull-to-source'],
        },
      },
      {
        id: 'shield-self-charge',
        kind: 'apply-self-impulse',
        trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
        parameters: { horizontalImpulse: 6.5 },
      },
      {
        id: 'shield-target-impulse',
        kind: 'apply-directional-impulse',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { horizontalImpulse: 7.5, verticalImpulse: 2.8 },
      },
    ],
    tags: ['defense', 'equipment', 'reposition'],
  }),
]);

export const STAGE4_EQUIPMENT_DEFINITIONS = Object.freeze([
  equipment({
    id: STAGE4_EQUIPMENT_ID.HAMMER,
    category: 'knockback',
    actionDefinitionId: STAGE4_ACTION_ID.HAMMER_SMASH,
    presentationSemantic: 'heavy-smash',
  }),
  equipment({
    id: STAGE4_EQUIPMENT_ID.CHAIN,
    category: 'reposition',
    actionDefinitionId: STAGE4_ACTION_ID.CHAIN_PULL,
    presentationSemantic: 'chain-pull',
  }),
  equipment({
    id: STAGE4_EQUIPMENT_ID.SHIELD,
    category: 'defense-charge',
    actionDefinitionId: STAGE4_ACTION_ID.SHIELD_CHARGE,
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
} = {}) {
  if (!Array.isArray(additionalActionDefinitions)) {
    throw new TypeError('additionalActionDefinitions 必须是数组。');
  }
  const actionRegistry = new ActionRegistry([
    ...createConfiguredActionDefinitions(basePush),
    ...additionalActionDefinitions,
  ]);
  const equipmentRegistry = new EquipmentRegistry({
    definitions: STAGE4_EQUIPMENT_DEFINITIONS,
    actionRegistry,
  });
  return Object.freeze({ actionRegistry, equipmentRegistry });
}
