import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  ARENA_GAMEPLAY_V2_TUNING,
  ActionRegistry,
  EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_DROP_FALLBACK,
  EQUIPMENT_DROP_POLICY,
  EQUIPMENT_PICKUP_MODE,
  EquipmentRegistry,
  createActionDefinition,
  createEquipmentDefinition,
  type ActionDefinition,
  type ActionCommitmentDefinition,
  type EquipmentDefinition,
  type WeaponCombatGrammarDefinitionV1,
} from '@number-strategy-jump/arena-definitions';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';

type AttackTuningId = keyof typeof ARENA_GAMEPLAY_V2_TUNING.attacks;
type ImpactEffectKind = 'apply-directional-impulse' | 'pull-to-source';

interface CreateGroundActionOptions {
  readonly id: string;
  readonly tuningId: AttackTuningId;
  readonly impactEffectKind: ImpactEffectKind;
  readonly tags: readonly string[];
  readonly selfHorizontalImpulse?: number;
  readonly commitment?: ActionCommitmentDefinition;
}

interface CreateAerialActionOptions {
  readonly id: string;
  readonly tuningId: AttackTuningId;
  readonly impactEffectKind: ImpactEffectKind;
  readonly tags: readonly string[];
  readonly commitment?: ActionCommitmentDefinition;
  readonly beginsDescent?: boolean;
}

interface CreateEquipmentOptions {
  readonly id: string;
  readonly category: string;
  readonly groundActionDefinitionId: string;
  readonly aerialActionDefinitionId: string;
  readonly presentationSemantic: string;
  readonly tags: readonly string[];
}

function targeting(tuningId: AttackTuningId) {
  const { kind, ...parameters } = ARENA_GAMEPLAY_V2_TUNING.attacks[tuningId].targeting;
  return Object.freeze({ kind, parameters: Object.freeze(parameters) });
}

function impactEffects(
  id: string,
  tuningId: AttackTuningId,
  impactEffectKind: ImpactEffectKind,
) {
  const tuning = ARENA_GAMEPLAY_V2_TUNING.attacks[tuningId];
  return Object.freeze([
    Object.freeze({
      id: `${id}.interrupt`,
      kind: 'interrupt-action',
      trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
      parameters: Object.freeze({}),
    }),
    Object.freeze({
      id: `${id}.hitstun`,
      kind: 'apply-hitstun',
      trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
      parameters: Object.freeze({ ticks: tuning.hitstunTicks }),
    }),
    Object.freeze({
      id: `${id}.impact`,
      kind: impactEffectKind,
      trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
      parameters: Object.freeze({
        horizontalImpulse: tuning.knockback.horizontalImpulse,
        verticalImpulse: tuning.knockback.verticalImpulse,
      }),
    }),
  ]);
}

function baseAction(
  id: string,
  kind: string,
  tuningId: AttackTuningId,
  effects: readonly unknown[],
  tags: readonly string[],
  commitment?: ActionCommitmentDefinition,
): ActionDefinition {
  return createActionDefinition({
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id,
    kind,
    input: {
      channel: ACTION_INPUT_CHANNEL.PRIMARY,
      trigger: ACTION_INPUT_TRIGGER.PRESSED,
    },
    lane: ACTION_LANE.COMBAT,
    conflictTags: [],
    timing: ARENA_GAMEPLAY_V2_TUNING.attacks[tuningId].timing,
    ...(commitment === undefined ? {} : { commitment }),
    targeting: targeting(tuningId),
    effects,
    tags,
  });
}

export function createGroundWeaponActionCandidateV1({
  id,
  tuningId,
  impactEffectKind,
  tags,
  selfHorizontalImpulse,
  commitment,
}: CreateGroundActionOptions): ActionDefinition {
  const effects: unknown[] = [...impactEffects(id, tuningId, impactEffectKind)];
  if (selfHorizontalImpulse !== undefined) {
    effects.unshift(Object.freeze({
      id: `${id}.self-movement`,
      kind: 'apply-self-impulse',
      trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
      parameters: Object.freeze({ horizontalImpulse: selfHorizontalImpulse }),
    }));
  }
  return baseAction(id, 'equipment-attack', tuningId, effects, tags, commitment);
}

export function createAerialWeaponActionCandidateV1({
  id,
  tuningId,
  impactEffectKind,
  tags,
  commitment,
  beginsDescent = true,
}: CreateAerialActionOptions): ActionDefinition {
  const effects = Object.freeze([
    ...(beginsDescent ? [Object.freeze({
      id: `${id}.begin-descent`,
      kind: 'begin-down-smash',
      trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
      parameters: Object.freeze({}),
    })] : []),
    ...impactEffects(id, tuningId, impactEffectKind),
  ]);
  return baseAction(
    id,
    'aerial-attack',
    tuningId,
    effects,
    Object.freeze(['aerial', ...tags]),
    commitment,
  );
}

export function createWeaponEquipmentCandidateV1({
  id,
  category,
  groundActionDefinitionId,
  aerialActionDefinitionId,
  presentationSemantic,
  tags,
}: CreateEquipmentOptions): EquipmentDefinition {
  return createEquipmentDefinition({
    schemaVersion: EQUIPMENT_DEFINITION_SCHEMA_VERSION,
    id,
    category,
    slot: 'primary',
    actionDefinitionId: groundActionDefinitionId,
    aerialActionDefinitionId,
    pickup: {
      mode: EQUIPMENT_PICKUP_MODE.AUTOMATIC,
      radius: ARENA_GAMEPLAY_V2_TUNING.equipment.automaticPickupRadius,
    },
    drop: {
      onOwnerEliminated: EQUIPMENT_DROP_POLICY.LAST_SAFE_POSITION,
      invalidPositionFallback: EQUIPMENT_DROP_FALLBACK.ORIGIN_SPAWN,
    },
    presentationSemantic,
    tags,
  });
}

export function validateWeaponCandidateBundleV1(options: Readonly<{
  readonly actions: readonly ActionDefinition[];
  readonly equipment: EquipmentDefinition;
  readonly grammar: WeaponCombatGrammarDefinitionV1;
  readonly forbiddenEffectKinds?: readonly string[];
}>): string {
  const { actions, equipment, grammar, forbiddenEffectKinds = [] } = options;
  const actionRegistry = new ActionRegistry(actions);
  const equipmentRegistry = new EquipmentRegistry({
    definitions: [equipment],
    actionRegistry,
  });
  equipmentRegistry.require(equipment.id);
  if (grammar.equipmentDefinitionId !== equipment.id) {
    throw new RangeError('Weapon candidate grammar/equipment身份不闭合。');
  }
  const expectedActions = [equipment.actionDefinitionId, equipment.aerialActionDefinitionId];
  if (grammar.contexts.some((context, index) => (
    context.actionDefinitionId !== expectedActions[index]
  ))) throw new RangeError('Weapon candidate grammar/action上下文不闭合。');
  const forbidden = new Set(forbiddenEffectKinds);
  for (const action of actions) {
    for (const effect of action.effects) {
      if (forbidden.has(effect.kind)) {
        throw new RangeError(`Weapon candidate禁止effect ${effect.kind}。`);
      }
    }
  }
  return createDeterministicDataHash(
    { actions, equipment, grammar },
    `Weapon candidate ${equipment.id}`,
  );
}
