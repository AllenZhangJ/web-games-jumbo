import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPositiveFinite,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ActionRegistry,
  EquipmentRegistry,
  createActionDefinition,
  createEquipmentDefinition,
  type ActionDefinition,
  type EquipmentDefinition,
  type CharacterDefinition,
  type MapDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  STAGE4_ACTION_DEFINITIONS,
  STAGE4_EQUIPMENT_DEFINITIONS,
} from '@number-strategy-jump/arena-v1-content';
import {
  createArenaV1AuthorityContent,
} from '@number-strategy-jump/arena-v1-composition';
import type { ArenaMatchConfig } from '@number-strategy-jump/arena-match';

export const ARENA_V2_SURVIVAL_WEAPON_DEFINITION_SCHEMA_VERSION = 1;

export type ArenaV2SurvivalWeaponGrowthField =
  | 'target-horizontal-control'
  | 'target-reposition-control'
  | 'target-contact-control';

export interface ArenaV2SurvivalWeaponPublicStats {
  readonly effectiveDistance: number;
  readonly windupTicks: number;
  readonly recoveryTicks: number;
  readonly horizontalControl: number;
  readonly verticalControl: number;
  readonly hitstunTicks: number;
  readonly selfMovementRisk: number;
  readonly cooldownTicks: number;
}

export interface ArenaV2SurvivalWeaponTierStep {
  readonly tier: number;
  readonly multiplier: number;
  readonly stats: ArenaV2SurvivalWeaponPublicStats;
  readonly aerialStats: ArenaV2SurvivalWeaponPublicStats;
}

export interface ArenaV2SurvivalWeaponDefinition {
  readonly schemaVersion: typeof ARENA_V2_SURVIVAL_WEAPON_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly displayName: string;
  readonly category: string;
  readonly coreVerb: string;
  readonly growthField: ArenaV2SurvivalWeaponGrowthField;
  readonly groundActionDefinitionId: string;
  readonly aerialActionDefinitionId: string;
  readonly baseStats: ArenaV2SurvivalWeaponPublicStats;
  readonly aerialStats: ArenaV2SurvivalWeaponPublicStats;
  readonly tierSteps: readonly ArenaV2SurvivalWeaponTierStep[];
}

export interface ArenaV2SurvivalWeaponTierSelection {
  readonly weaponId: string;
  readonly tier: number;
  readonly equipmentDefinitionId: string;
  readonly groundActionDefinitionId: string;
  readonly aerialActionDefinitionId: string;
  readonly stats: ArenaV2SurvivalWeaponPublicStats;
  readonly aerialStats: ArenaV2SurvivalWeaponPublicStats;
  readonly growthField: ArenaV2SurvivalWeaponGrowthField;
  readonly multiplier: number;
}

export interface ArenaV2SurvivalTierAuthorityContent {
  readonly tier: number;
  readonly weapons: readonly ArenaV2SurvivalWeaponTierSelection[];
  readonly actionRegistry: ActionRegistry;
  readonly equipmentRegistry: EquipmentRegistry;
  readonly mapRegistry: {
    require(id: string): MapDefinition;
    list(): readonly MapDefinition[];
  };
  readonly characterRegistry: {
    require(id: string): CharacterDefinition;
    list(): readonly CharacterDefinition[];
  };
  readonly definitionBundleHash: string;
}

const TIER_STEPS = Object.freeze([1, 5, 10]);
const GROWTH_FIELDS: ReadonlySet<unknown> = new Set([
  'target-horizontal-control',
  'target-reposition-control',
  'target-contact-control',
]);
const DEFINITION_KEYS = new Set([
  'schemaVersion',
  'id',
  'displayName',
  'category',
  'coreVerb',
  'growthField',
  'groundActionDefinitionId',
  'aerialActionDefinitionId',
  'baseStats',
  'aerialStats',
  'tierSteps',
]);
const STATS_KEYS = new Set([
  'effectiveDistance',
  'windupTicks',
  'recoveryTicks',
  'horizontalControl',
  'verticalControl',
  'hitstunTicks',
  'selfMovementRisk',
  'cooldownTicks',
]);
const TIER_STEP_KEYS = new Set(['tier', 'multiplier', 'stats', 'aerialStats']);

function readNumber(value: unknown, name: string): number {
  return assertPositiveFinite(value, name);
}

function readNonNegativeNumber(value: unknown, name: string): number {
  if (!Number.isFinite(value) || (value as number) < 0) {
    throw new RangeError(`${name} 必须是大于等于 0 的有限数。`);
  }
  return value as number;
}

function createPublicStats(value: unknown, name: string): ArenaV2SurvivalWeaponPublicStats {
  assertKnownKeys(value, STATS_KEYS, name);
  return Object.freeze({
    effectiveDistance: readNumber(value.effectiveDistance, `${name}.effectiveDistance`),
    windupTicks: assertIntegerAtLeast(value.windupTicks, 0, `${name}.windupTicks`),
    recoveryTicks: assertIntegerAtLeast(value.recoveryTicks, 0, `${name}.recoveryTicks`),
    horizontalControl: readNumber(value.horizontalControl, `${name}.horizontalControl`),
    verticalControl: readNumber(value.verticalControl, `${name}.verticalControl`),
    hitstunTicks: assertIntegerAtLeast(value.hitstunTicks, 0, `${name}.hitstunTicks`),
    selfMovementRisk: readNonNegativeNumber(value.selfMovementRisk, `${name}.selfMovementRisk`),
    cooldownTicks: assertIntegerAtLeast(value.cooldownTicks, 0, `${name}.cooldownTicks`),
  });
}

function createTierSteps(value: unknown, name: string): readonly ArenaV2SurvivalWeaponTierStep[] {
  if (!Array.isArray(value) || value.length !== TIER_STEPS.length) {
    throw new RangeError(`${name} 必须按等级 1/5/10 提供三个步骤。`);
  }
  let previousTier = 0;
  return Object.freeze(value.map((step, index) => {
    assertKnownKeys(step, TIER_STEP_KEYS, `${name}[${index}]`);
    const tier = assertIntegerAtLeast(step.tier, 1, `${name}[${index}].tier`);
    if (tier <= previousTier || tier !== TIER_STEPS[index]) {
      throw new RangeError(`${name} 必须严格使用等级 1/5/10。`);
    }
    previousTier = tier;
    return Object.freeze({
      tier,
      multiplier: readNumber(step.multiplier, `${name}[${index}].multiplier`),
      stats: createPublicStats(step.stats, `${name}[${index}].stats`),
      aerialStats: createPublicStats(step.aerialStats, `${name}[${index}].aerialStats`),
    });
  }));
}

export function createArenaV2SurvivalWeaponDefinition(value: unknown): ArenaV2SurvivalWeaponDefinition {
  const source = cloneFrozenData(value, 'Arena V2 SurvivalWeaponDefinition');
  assertKnownKeys(source, DEFINITION_KEYS, 'Arena V2 SurvivalWeaponDefinition');
  if (source.schemaVersion !== ARENA_V2_SURVIVAL_WEAPON_DEFINITION_SCHEMA_VERSION) {
    throw new RangeError(
      `Arena V2 SurvivalWeaponDefinition.schemaVersion 必须是 ${ARENA_V2_SURVIVAL_WEAPON_DEFINITION_SCHEMA_VERSION}。`,
    );
  }
  if (!GROWTH_FIELDS.has(source.growthField)) {
    throw new RangeError(`不支持的生存武器成长字段：${String(source.growthField)}。`);
  }
  return Object.freeze({
    schemaVersion: ARENA_V2_SURVIVAL_WEAPON_DEFINITION_SCHEMA_VERSION,
    id: assertNonEmptyString(source.id, 'Arena V2 SurvivalWeaponDefinition.id'),
    displayName: assertNonEmptyString(
      source.displayName,
      'Arena V2 SurvivalWeaponDefinition.displayName',
    ),
    category: assertNonEmptyString(
      source.category,
      'Arena V2 SurvivalWeaponDefinition.category',
    ),
    coreVerb: assertNonEmptyString(
      source.coreVerb,
      'Arena V2 SurvivalWeaponDefinition.coreVerb',
    ),
    growthField: source.growthField as ArenaV2SurvivalWeaponGrowthField,
    groundActionDefinitionId: assertNonEmptyString(
      source.groundActionDefinitionId,
      'Arena V2 SurvivalWeaponDefinition.groundActionDefinitionId',
    ),
    aerialActionDefinitionId: assertNonEmptyString(
      source.aerialActionDefinitionId,
      'Arena V2 SurvivalWeaponDefinition.aerialActionDefinitionId',
    ),
    baseStats: createPublicStats(source.baseStats, 'Arena V2 SurvivalWeaponDefinition.baseStats'),
    aerialStats: createPublicStats(
      source.aerialStats,
      'Arena V2 SurvivalWeaponDefinition.aerialStats',
    ),
    tierSteps: createTierSteps(
      source.tierSteps,
      'Arena V2 SurvivalWeaponDefinition.tierSteps',
    ),
  });
}

function actionStat(action: ActionDefinition, effectKinds: ReadonlySet<string>) {
  const parameters = action.targeting.parameters as Readonly<Record<string, unknown>>;
  const horizontalEffect = action.effects.find((effect) => effectKinds.has(effect.kind));
  const effectParameters = horizontalEffect?.parameters as Readonly<Record<string, unknown>> | undefined;
  const selfMovementEffect = action.effects.find((effect) => effect.kind === 'apply-self-impulse');
  const selfMovementParameters = selfMovementEffect?.parameters as Readonly<Record<string, unknown>> | undefined;
  const hitstunEffect = action.effects.find((effect) => effect.kind === 'apply-hitstun');
  const hitstunParameters = hitstunEffect?.parameters as Readonly<Record<string, unknown>> | undefined;
  return {
    effectiveDistance: readNumber(parameters.range, `${action.id}.targeting.range`),
    windupTicks: action.timing.windupTicks,
    recoveryTicks: action.timing.recoveryTicks,
    horizontalControl: readNumber(
      effectParameters?.horizontalImpulse,
      `${action.id}.horizontalImpulse`,
    ),
    verticalControl: readNumber(
      effectParameters?.verticalImpulse,
      `${action.id}.verticalImpulse`,
    ),
    hitstunTicks: assertIntegerAtLeast(
      hitstunParameters?.ticks ?? 0,
      0,
      `${action.id}.hitstunTicks`,
    ),
    selfMovementRisk: readNonNegativeNumber(
      selfMovementParameters?.horizontalImpulse ?? 0,
      `${action.id}.selfMovementRisk`,
    ),
    cooldownTicks: action.timing.cooldownTicks,
  };
}

const STAGE4_ACTIONS = new Map(STAGE4_ACTION_DEFINITIONS.map((definition) => [definition.id, definition]));
const STAGE4_EQUIPMENT = new Map(STAGE4_EQUIPMENT_DEFINITIONS.map((definition) => [definition.id, definition]));

interface WeaponSeed {
  readonly id: string;
  readonly displayName: string;
  readonly category: string;
  readonly coreVerb: string;
  readonly growthField: ArenaV2SurvivalWeaponGrowthField;
  readonly groundActionId: string;
  readonly aerialActionId: string;
  readonly multipliers: readonly number[];
}

const WEAPON_SEEDS: readonly WeaponSeed[] = Object.freeze([
  Object.freeze({
    id: 'hammer',
    displayName: '重锤',
    category: 'knockback',
    coreVerb: '推离',
    growthField: 'target-horizontal-control',
    groundActionId: 'hammer-smash',
    aerialActionId: 'hammer-air-smash',
    multipliers: Object.freeze([1, 1.24, 1.72]),
  }),
  Object.freeze({
    id: 'chain',
    displayName: '引力锁链',
    category: 'reposition',
    coreVerb: '换位',
    growthField: 'target-reposition-control',
    groundActionId: 'chain-pull',
    aerialActionId: 'chain-air-lash',
    multipliers: Object.freeze([1, 1.32, 1.72]),
  }),
  Object.freeze({
    id: 'shield',
    displayName: '冲锋盾',
    category: 'defense-charge',
    coreVerb: '冲入',
    growthField: 'target-contact-control',
    groundActionId: 'shield-charge',
    aerialActionId: 'shield-air-drop',
    multipliers: Object.freeze([1, 1.24, 1.72]),
  }),
]);

function actionFor(id: string): ActionDefinition {
  const action = STAGE4_ACTIONS.get(id);
  if (!action) throw new RangeError(`研究武器引用未知动作 ${id}。`);
  return action;
}

function equipmentFor(id: string): EquipmentDefinition {
  const equipment = STAGE4_EQUIPMENT.get(id);
  if (!equipment) throw new RangeError(`研究武器引用未知装备 ${id}。`);
  return equipment;
}

function createBaseStats(seed: WeaponSeed): ArenaV2SurvivalWeaponPublicStats {
  const action = actionFor(seed.groundActionId);
  const effectKinds = new Set(seed.growthField === 'target-reposition-control'
    ? ['pull-to-source', 'apply-directional-impulse']
    : ['apply-directional-impulse']);
  return createPublicStats(
    actionStat(action, effectKinds),
    `${seed.id}.baseStats`,
  );
}

function scaleStats(
  baseStats: ArenaV2SurvivalWeaponPublicStats,
  multiplier: number,
): ArenaV2SurvivalWeaponPublicStats {
  return createPublicStats({
    ...baseStats,
    horizontalControl: baseStats.horizontalControl * multiplier,
  }, 'Arena V2 SurvivalWeaponDefinition tier stats');
}

function createSeedDefinition(seed: WeaponSeed): ArenaV2SurvivalWeaponDefinition {
  const baseStats = createBaseStats(seed);
  const aerialStats = createPublicStats(
    actionStat(
      actionFor(seed.aerialActionId),
      seed.growthField === 'target-reposition-control'
        ? new Set(['pull-to-source', 'apply-directional-impulse'])
        : new Set(['apply-directional-impulse']),
    ),
    `${seed.id}.aerialStats`,
  );
  return createArenaV2SurvivalWeaponDefinition({
    schemaVersion: ARENA_V2_SURVIVAL_WEAPON_DEFINITION_SCHEMA_VERSION,
    id: seed.id,
    displayName: seed.displayName,
    category: seed.category,
    coreVerb: seed.coreVerb,
    growthField: seed.growthField,
    groundActionDefinitionId: seed.groundActionId,
    aerialActionDefinitionId: seed.aerialActionId,
    baseStats,
    aerialStats,
    tierSteps: TIER_STEPS.map((tier, index) => {
      const multiplier = seed.multipliers[index];
      if (multiplier === undefined) throw new RangeError(`${seed.id} 缺少等级 ${tier} 倍率。`);
      return {
        tier,
        multiplier,
        stats: scaleStats(baseStats, multiplier),
        aerialStats: scaleStats(aerialStats, multiplier),
      };
    }),
  });
}

export const ARENA_V2_SURVIVAL_WEAPON_DEFINITIONS: readonly ArenaV2SurvivalWeaponDefinition[] =
  Object.freeze(WEAPON_SEEDS.map(createSeedDefinition));

function tierActionId(actionId: string, tier: number): string {
  return `${actionId}.survival-tier-${tier}`;
}

function tierEquipmentId(weaponId: string, tier: number): string {
  return `${weaponId}.survival-tier-${tier}`;
}

function createTierAction(
  action: ActionDefinition,
  multiplier: number,
  tier: number,
  growthField: ArenaV2SurvivalWeaponGrowthField,
): ActionDefinition {
  const targetEffectKinds = growthField === 'target-reposition-control'
    ? new Set(['pull-to-source', 'apply-directional-impulse'])
    : new Set(['apply-directional-impulse']);
  return createActionDefinition({
    ...action,
    id: tierActionId(action.id, tier),
    effects: action.effects.map((effect) => {
      if (!targetEffectKinds.has(effect.kind)) return effect;
      const parameters = effect.parameters as Readonly<Record<string, unknown>>;
      return {
        ...effect,
        parameters: {
          ...parameters,
          horizontalImpulse: readNumber(
            parameters.horizontalImpulse,
            `${action.id}.horizontalImpulse`,
          ) * multiplier,
        },
      };
    }),
  });
}

function createTierEquipment(
  equipment: EquipmentDefinition,
  selection: ArenaV2SurvivalWeaponTierSelection,
): EquipmentDefinition {
  return createEquipmentDefinition({
    ...equipment,
    id: selection.equipmentDefinitionId,
    actionDefinitionId: selection.groundActionDefinitionId,
    aerialActionDefinitionId: selection.aerialActionDefinitionId,
    tags: [...equipment.tags, 'survival-tier', `tier-${selection.tier}`],
  });
}

function createSelection(
  definition: ArenaV2SurvivalWeaponDefinition,
  tier: number,
): ArenaV2SurvivalWeaponTierSelection {
  const step = definition.tierSteps.find((candidate) => candidate.tier === tier);
  if (!step) throw new RangeError(`武器 ${definition.id} 不支持生存等级 ${tier}。`);
  return Object.freeze({
    weaponId: definition.id,
    tier,
    equipmentDefinitionId: tierEquipmentId(definition.id, tier),
    groundActionDefinitionId: tierActionId(definition.groundActionDefinitionId, tier),
    aerialActionDefinitionId: tierActionId(definition.aerialActionDefinitionId, tier),
    stats: step.stats,
    aerialStats: step.aerialStats,
    growthField: definition.growthField,
    multiplier: step.multiplier,
  });
}

export function createArenaV2SurvivalTierAuthorityContent(
  tier: number,
  config: ArenaMatchConfig,
): ArenaV2SurvivalTierAuthorityContent {
  const normalizedTier = assertIntegerAtLeast(tier, 1, 'survival tier');
  const baseContent = createArenaV1AuthorityContent(config);
  const weapons = Object.freeze(ARENA_V2_SURVIVAL_WEAPON_DEFINITIONS.map((definition) => (
    createSelection(definition, normalizedTier)
  )));
  const tierActions = weapons.flatMap((selection) => {
    const definition = ARENA_V2_SURVIVAL_WEAPON_DEFINITIONS.find(({ id }) => id === selection.weaponId)!;
    const groundAction = actionFor(definition.groundActionDefinitionId);
    const aerialAction = actionFor(definition.aerialActionDefinitionId);
    return [
      createTierAction(groundAction, selection.multiplier, normalizedTier, selection.growthField),
      createTierAction(aerialAction, selection.multiplier, normalizedTier, selection.growthField),
    ];
  });
  const tierEquipment = weapons.map((selection) => {
    const definition = ARENA_V2_SURVIVAL_WEAPON_DEFINITIONS.find(({ id }) => id === selection.weaponId)!;
    return createTierEquipment(equipmentFor(definition.id), selection);
  });
  const actionRegistry = new ActionRegistry([
    ...baseContent.actionRegistry.list(),
    ...tierActions,
  ]);
  const equipmentRegistry = new EquipmentRegistry({
    definitions: [
      ...baseContent.equipmentRegistry.list(),
      ...tierEquipment,
    ],
    actionRegistry,
  });
  const definitionBundleHash = createDeterministicDataHash({
    schemaVersion: ARENA_V2_SURVIVAL_WEAPON_DEFINITION_SCHEMA_VERSION,
    tier: normalizedTier,
    weapons,
    actions: tierActions,
    equipment: tierEquipment,
  }, 'Arena V2 survival tier definition bundle');
  return Object.freeze({
    tier: normalizedTier,
    weapons,
    actionRegistry,
    equipmentRegistry,
    mapRegistry: baseContent.mapRegistry,
    characterRegistry: baseContent.characterRegistry,
    definitionBundleHash,
  });
}

export function selectArenaV2SurvivalTierWeapon(
  content: ArenaV2SurvivalTierAuthorityContent,
  weaponId: string,
): ArenaV2SurvivalWeaponTierSelection {
  const normalized = assertNonEmptyString(weaponId, 'weaponId');
  const selection = content.weapons.find(({ weaponId: id }) => id === normalized);
  if (!selection) throw new RangeError(`生存等级 ${content.tier} 不包含武器 ${normalized}。`);
  return selection;
}
