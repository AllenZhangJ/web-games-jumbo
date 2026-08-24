import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_SUPPLY_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_SUPPLY_EXPIRY_POLICY,
  EQUIPMENT_SUPPLY_REPLACEMENT_POLICY,
  EQUIPMENT_SUPPLY_TICK_ORDER,
  MODE_KIND,
  MODE_POLICY_DEFINITION_SCHEMA_VERSION,
  ActionRegistry,
  EquipmentRegistry,
  EquipmentSupplyRegistry,
  WEAPON_COMBAT_GRAMMAR_DEFINITION_V1_SCHEMA_VERSION,
  WEAPON_TUNING_FIELD_V1,
  createActionDefinition,
  createEquipmentDefinition,
  createEquipmentSupplyDefinition,
  createSurvivalEquipmentTierPolicyDefinition,
  createWeaponCombatGrammarDefinitionV1,
  type ActionDefinition,
  type EquipmentDefinition,
  type WeaponCombatGrammarDefinitionV1,
  type WeaponTuningFieldV1,
} from '@number-strategy-jump/arena-definitions';
import {
  createDeterministicDataHash,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from './arena-v2-collection-weapon-catalog-candidate-v1.js';
import {
  ARENA_V2_KZ_BASE_MAP_DEFINITION_CANDIDATE_V1,
} from './arena-v2-kz-base-map-candidate-v1.js';
import {
  ARENA_V2_UNARMED_ACTION_CANDIDATE_V1,
} from './arena-v2-unarmed-action-candidate-v1.js';

export const ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_V2_SURVIVAL_BASELINE_WEAPON_LEVEL_COUNT_CANDIDATE_V1 = 10 as const;
export const ARENA_V2_SURVIVAL_SUPPLY_FIRST_SPAWN_TICKS_CANDIDATE_V1 = 1_200 as const;
export const ARENA_V2_SURVIVAL_SUPPLY_INTERVAL_TICKS_CANDIDATE_V1 = 1_200 as const;
export const ARENA_V2_SURVIVAL_SUPPLY_LIFETIME_TICKS_CANDIDATE_V1 = 600 as const;
export const ARENA_V2_SURVIVAL_SUPPLY_SPAWN_COUNT_CANDIDATE_V1 = 3 as const;
export const ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1_STATUS =
  'production-unreachable' as const;

interface BaselineWeaponSourceV1 {
  readonly id: string;
  readonly actions: readonly ActionDefinition[];
  readonly equipment: EquipmentDefinition;
  readonly grammar: WeaponCombatGrammarDefinitionV1;
  readonly contentHash: string;
}

export interface ArenaV2SurvivalWeaponLevelTuningCandidateV1 {
  readonly level: number;
  readonly minimumWaveIndex: number;
  readonly rangeMultiplier: number;
  readonly horizontalImpulseMultiplier: number;
  readonly cooldownMultiplier: number;
  readonly hitstunMultiplier: number;
}

export interface ArenaV2SurvivalWeaponRuntimeVariantCandidateV1 {
  readonly weaponId: BaselineWeaponSourceV1['id'];
  readonly level: number;
  readonly collectionEquipmentDefinitionId: string;
  readonly actions: readonly ActionDefinition[];
  readonly equipment: EquipmentDefinition;
  readonly grammar: WeaponCombatGrammarDefinitionV1;
  readonly permittedTuningFields: readonly WeaponTuningFieldV1[];
  readonly semanticsLocked: true;
  readonly addsInput: false;
  readonly addsAction: false;
  readonly contentHash: string;
}

export interface ArenaV2SurvivalBaselineSupplySpawnSpecCandidateV1 {
  readonly slotId: BaselineWeaponSourceV1['id'];
  readonly equipmentDefinitionId: string;
  readonly spawnId: string;
  readonly position: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
}

export interface ArenaV2SurvivalBaselineSupplyWaveOverrideCandidateV1 {
  readonly minimumWaveIndex: number;
  readonly slots: readonly Readonly<{
    readonly slotId: BaselineWeaponSourceV1['id'];
    readonly equipmentDefinitionId: string;
  }>[];
}

export interface ArenaV2SurvivalBaselineWeaponTiersCandidateV1 {
  readonly schemaVersion:
    typeof ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1_SCHEMA_VERSION;
  readonly status:
    typeof ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1_STATUS;
  readonly hardGate: false;
  readonly defaultRegistryWired: false;
  readonly tickRate: 60;
  readonly baseGroundActionDefinitionId: string;
  readonly baseAerialActionDefinitionId: string;
  readonly supplyDefinition: ReturnType<typeof createEquipmentSupplyDefinition>;
  readonly tierPolicyDefinition: ReturnType<
    typeof createSurvivalEquipmentTierPolicyDefinition
  >;
  readonly levelTuning: readonly ArenaV2SurvivalWeaponLevelTuningCandidateV1[];
  readonly spawnSpecs: readonly ArenaV2SurvivalBaselineSupplySpawnSpecCandidateV1[];
  readonly waveEquipmentOverrides:
    readonly ArenaV2SurvivalBaselineSupplyWaveOverrideCandidateV1[];
  readonly collectionEquipmentDefinitions: readonly EquipmentDefinition[];
  readonly runtimeVariants: readonly ArenaV2SurvivalWeaponRuntimeVariantCandidateV1[];
  readonly actionDefinitions: readonly ActionDefinition[];
  readonly runtimeEquipmentDefinitions: readonly EquipmentDefinition[];
  readonly contentHash: string;
}

export interface ArenaV2SurvivalRegisteredWeaponPoolCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultRegistryWired: false;
  readonly source: 'active-collection-registry-snapshot';
  readonly collectionWeaponIds: readonly string[];
  readonly collectionEquipmentDefinitionIds: readonly string[];
  readonly baseGroundActionDefinitionId: string;
  readonly baseAerialActionDefinitionId: string;
  readonly supplyDefinition: ReturnType<typeof createEquipmentSupplyDefinition>;
  readonly tierPolicyDefinition: ReturnType<
    typeof createSurvivalEquipmentTierPolicyDefinition
  >;
  readonly spawnSpecs: readonly ArenaV2SurvivalBaselineSupplySpawnSpecCandidateV1[];
  readonly waveEquipmentOverrides:
    readonly ArenaV2SurvivalBaselineSupplyWaveOverrideCandidateV1[];
  readonly collectionEquipmentDefinitions: readonly EquipmentDefinition[];
  readonly runtimeVariants: readonly ArenaV2SurvivalWeaponRuntimeVariantCandidateV1[];
  readonly actionDefinitions: readonly ActionDefinition[];
  readonly runtimeEquipmentDefinitions: readonly EquipmentDefinition[];
  readonly contentHash: string;
}

const RANGE_KEYS = Object.freeze(['range', 'radius', 'maximumVerticalDifference'] as const);
const IMPACT_EFFECT_KINDS: ReadonlySet<string> = new Set([
  'apply-directional-impulse',
  'pull-to-source',
]);

const WEAPONS: readonly BaselineWeaponSourceV1[] = Object.freeze(
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map((weapon) => Object.freeze({
    id: weapon.id,
    actions: weapon.actions,
    equipment: weapon.equipment,
    grammar: weapon.grammar,
    contentHash: weapon.contentHash,
  })),
);

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function levelTuning(level: number): ArenaV2SurvivalWeaponLevelTuningCandidateV1 {
  const progression = level - 1;
  return Object.freeze({
    level,
    minimumWaveIndex: progression,
    rangeMultiplier: rounded(1 + progression * 0.03),
    horizontalImpulseMultiplier: rounded(1 + progression * 0.04),
    cooldownMultiplier: rounded(1 - progression * 0.02),
    hitstunMultiplier: rounded(1 + progression * 0.02),
  });
}

export const ARENA_V2_SURVIVAL_WEAPON_LEVEL_TUNING_CANDIDATE_V1 = Object.freeze(
  Array.from(
    { length: ARENA_V2_SURVIVAL_BASELINE_WEAPON_LEVEL_COUNT_CANDIDATE_V1 },
    (_, index) => levelTuning(index + 1),
  ),
);

function record(value: DeepReadonly<unknown>, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  return { ...(value as Readonly<Record<string, unknown>>) };
}

function scaledFinite(value: unknown, multiplier: number, name: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${name}必须是有限数。`);
  return rounded((value as number) * multiplier);
}

function scaledTicks(value: number, multiplier: number): number {
  return Math.max(1, Math.round(value * multiplier));
}

function runtimeId(baseId: string, level: number): string {
  const suffix = '.candidate.v1';
  if (!baseId.endsWith(suffix)) throw new RangeError(`候选ID ${baseId} 缺少${suffix}后缀。`);
  return `${baseId.slice(0, -suffix.length)}.survival.level-${level}${suffix}`;
}

function createRuntimeAction(
  source: ActionDefinition,
  level: ArenaV2SurvivalWeaponLevelTuningCandidateV1,
  permitted: ReadonlySet<WeaponTuningFieldV1>,
): ActionDefinition {
  const targetingParameters = record(
    source.targeting.parameters,
    `ActionDefinition ${source.id} targeting.parameters`,
  );
  if (permitted.has(WEAPON_TUNING_FIELD_V1.RANGE)) {
    for (const key of RANGE_KEYS) {
      if (Object.hasOwn(targetingParameters, key)) {
        targetingParameters[key] = scaledFinite(
          targetingParameters[key],
          level.rangeMultiplier,
          `ActionDefinition ${source.id} targeting.${key}`,
        );
      }
    }
  }
  const runtimeActionDefinitionId = runtimeId(source.id, level.level);
  const effects = source.effects.map((effect, index) => {
    const parameters = record(
      effect.parameters,
      `ActionDefinition ${source.id} effect ${effect.id}.parameters`,
    );
    if (
      permitted.has(WEAPON_TUNING_FIELD_V1.HORIZONTAL_IMPULSE)
      && IMPACT_EFFECT_KINDS.has(effect.kind)
      && Object.hasOwn(parameters, 'horizontalImpulse')
    ) {
      parameters.horizontalImpulse = scaledFinite(
        parameters.horizontalImpulse,
        level.horizontalImpulseMultiplier,
        `ActionDefinition ${source.id} effect ${effect.id}.horizontalImpulse`,
      );
    }
    if (
      permitted.has(WEAPON_TUNING_FIELD_V1.HITSTUN_TICKS)
      && effect.kind === 'apply-hitstun'
      && Object.hasOwn(parameters, 'ticks')
    ) {
      if (!Number.isSafeInteger(parameters.ticks) || (parameters.ticks as number) < 0) {
        throw new RangeError(`ActionDefinition ${source.id} effect ${effect.id}.ticks非法。`);
      }
      parameters.ticks = scaledTicks(parameters.ticks as number, level.hitstunMultiplier);
    }
    return Object.freeze({
      id: `${runtimeActionDefinitionId}.effect-${index}-${effect.kind}`,
      kind: effect.kind,
      trigger: effect.trigger,
      parameters: Object.freeze(parameters),
    });
  });
  return createActionDefinition({
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id: runtimeActionDefinitionId,
    kind: source.kind,
    input: source.input,
    lane: source.lane,
    conflictTags: source.conflictTags,
    timing: {
      ...source.timing,
      cooldownTicks: permitted.has(WEAPON_TUNING_FIELD_V1.COOLDOWN_TICKS)
        ? scaledTicks(source.timing.cooldownTicks, level.cooldownMultiplier)
        : source.timing.cooldownTicks,
    },
    ...(source.commitment === undefined ? {} : { commitment: source.commitment }),
    targeting: {
      kind: source.targeting.kind,
      parameters: Object.freeze(targetingParameters),
    },
    effects,
    tags: [...source.tags, 'survival-runtime', `survival-level-${level.level}`],
  });
}

function createRuntimeVariant(
  weapon: BaselineWeaponSourceV1,
  level: ArenaV2SurvivalWeaponLevelTuningCandidateV1,
): ArenaV2SurvivalWeaponRuntimeVariantCandidateV1 {
  const permitted = new Set(weapon.grammar.survivalGrowth.permittedTuningFields);
  const actions = Object.freeze(weapon.actions.map((action) => (
    createRuntimeAction(action, level, permitted)
  )));
  if (actions.length !== weapon.grammar.contexts.length) {
    throw new RangeError(`${weapon.id} Survival runtime不得增加或删除动作。`);
  }
  for (let index = 0; index < actions.length; index += 1) {
    const source = weapon.actions[index]!;
    const runtime = actions[index]!;
    if (runtime.input.channel !== source.input.channel || runtime.input.trigger !== source.input.trigger) {
      throw new RangeError(`${weapon.id} Survival runtime不得改变输入合同。`);
    }
    if (runtime.effects.map(({ kind }) => kind).join('|') !== source.effects.map(({ kind }) => kind).join('|')) {
      throw new RangeError(`${weapon.id} Survival runtime不得改变effect语义。`);
    }
  }
  const equipment = createEquipmentDefinition({
    schemaVersion: EQUIPMENT_DEFINITION_SCHEMA_VERSION,
    id: runtimeId(weapon.equipment.id, level.level),
    category: weapon.equipment.category,
    slot: weapon.equipment.slot,
    actionDefinitionId: actions[0]!.id,
    aerialActionDefinitionId: actions[1]!.id,
    pickup: weapon.equipment.pickup,
    drop: weapon.equipment.drop,
    presentationSemantic: weapon.equipment.presentationSemantic,
    tags: [...weapon.equipment.tags, 'survival-runtime', `survival-level-${level.level}`],
  });
  const grammar = createWeaponCombatGrammarDefinitionV1({
    schemaVersion: WEAPON_COMBAT_GRAMMAR_DEFINITION_V1_SCHEMA_VERSION,
    id: runtimeId(weapon.grammar.id, level.level),
    equipmentDefinitionId: equipment.id,
    coreVerb: weapon.grammar.coreVerb,
    requiredInput: weapon.grammar.requiredInput,
    contexts: weapon.grammar.contexts.map((context, index) => ({
      ...context,
      actionDefinitionId: actions[index]!.id,
    })),
    modeConsequences: weapon.grammar.modeConsequences,
    survivalGrowth: weapon.grammar.survivalGrowth,
    tags: [...weapon.grammar.tags, 'survival-runtime', `survival-level-${level.level}`],
  });
  const authority = Object.freeze({
    weaponId: weapon.id,
    level: level.level,
    collectionEquipmentDefinitionId: weapon.equipment.id,
    sourceContentHash: weapon.contentHash,
    actions,
    equipment,
    grammar,
    permittedTuningFields: weapon.grammar.survivalGrowth.permittedTuningFields,
    semanticsLocked: true as const,
    addsInput: false as const,
    addsAction: false as const,
  });
  return Object.freeze({
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      `Arena V2 Survival ${weapon.id} level ${level.level}`,
    ),
  });
}

const RUNTIME_VARIANTS = Object.freeze(
  ARENA_V2_SURVIVAL_WEAPON_LEVEL_TUNING_CANDIDATE_V1.flatMap((level) => (
    WEAPONS.map((weapon) => createRuntimeVariant(weapon, level))
  )),
);

export const ARENA_V2_SURVIVAL_BASELINE_WEAPON_RUNTIME_VARIANTS_CANDIDATE_V1 =
  RUNTIME_VARIANTS;

const SUPPLY_SLOT_BINDINGS = Object.freeze([
  Object.freeze({
    slotId: 'survival-slot-01',
    initialWeaponId: 'charge-shield',
    mapSpawnPointId: 'kz-supply-01',
  }),
  Object.freeze({
    slotId: 'survival-slot-02',
    initialWeaponId: 'gravity-chain',
    mapSpawnPointId: 'kz-supply-06',
  }),
  Object.freeze({
    slotId: 'survival-slot-03',
    initialWeaponId: 'heavy-hammer',
    mapSpawnPointId: 'kz-supply-12',
  }),
]);

function supplyWeaponIdsForWave(waveIndex: number): readonly string[] {
  return Object.freeze(Array.from(
    { length: ARENA_V2_SURVIVAL_SUPPLY_SPAWN_COUNT_CANDIDATE_V1 },
    (_, slotIndex) => WEAPONS[
      (waveIndex * ARENA_V2_SURVIVAL_SUPPLY_SPAWN_COUNT_CANDIDATE_V1 + slotIndex)
        % WEAPONS.length
    ]!.id,
  ));
}

export const ARENA_V2_SURVIVAL_BASELINE_SUPPLY_SPAWN_SPECS_CANDIDATE_V1 = Object.freeze(
  SUPPLY_SLOT_BINDINGS.map(({ slotId, initialWeaponId, mapSpawnPointId }) => {
    const weapon = WEAPONS.find(({ id }) => id === initialWeaponId);
    const mapPoint = ARENA_V2_KZ_BASE_MAP_DEFINITION_CANDIDATE_V1.equipmentSpawnPoints.find(
      ({ id }) => id === mapSpawnPointId,
    );
    if (!weapon || !mapPoint) {
      throw new Error(`Survival supply slot ${slotId}/${mapSpawnPointId}闭包缺失。`);
    }
    return Object.freeze({
      slotId,
      equipmentDefinitionId: weapon.equipment.id,
      spawnId: `arena-v2-survival-${mapSpawnPointId}-${slotId}`,
      position: Object.freeze({
        x: mapPoint.position.x,
        y: mapPoint.position.y + 1,
        z: mapPoint.position.z,
      }),
    });
  }),
);

export const ARENA_V2_SURVIVAL_BASELINE_SUPPLY_WAVE_OVERRIDES_CANDIDATE_V1 = Object.freeze(
  ARENA_V2_SURVIVAL_WEAPON_LEVEL_TUNING_CANDIDATE_V1.map((level) => {
    const weaponIds = supplyWeaponIdsForWave(level.minimumWaveIndex);
    return Object.freeze({
      minimumWaveIndex: level.minimumWaveIndex,
      slots: Object.freeze(ARENA_V2_SURVIVAL_BASELINE_SUPPLY_SPAWN_SPECS_CANDIDATE_V1.map((spec, index) => {
        const weaponId = weaponIds[index]!;
        const runtime = RUNTIME_VARIANTS.find((candidate) => (
          candidate.weaponId === weaponId && candidate.level === level.level
        ));
        if (!runtime) throw new Error(`${weaponId} level ${level.level} supply runtime缺失。`);
        return Object.freeze({
          slotId: spec.slotId,
          equipmentDefinitionId: runtime.equipment.id,
        });
      })),
    });
  }),
);

export const ARENA_V2_SURVIVAL_BASELINE_SUPPLY_DEFINITION_CANDIDATE_V1 =
  createEquipmentSupplyDefinition({
    schemaVersion: EQUIPMENT_SUPPLY_DEFINITION_SCHEMA_VERSION,
    id: 'arena-v2.survival.baseline-weapon-supply.candidate.v1',
    firstSpawnTick: ARENA_V2_SURVIVAL_SUPPLY_FIRST_SPAWN_TICKS_CANDIDATE_V1,
    spawnIntervalTicks: ARENA_V2_SURVIVAL_SUPPLY_INTERVAL_TICKS_CANDIDATE_V1,
    spawnCount: ARENA_V2_SURVIVAL_SUPPLY_SPAWN_COUNT_CANDIDATE_V1,
    pickupRadius: 0.8,
    lifetimeTicks: ARENA_V2_SURVIVAL_SUPPLY_LIFETIME_TICKS_CANDIDATE_V1,
    replacementPolicy: EQUIPMENT_SUPPLY_REPLACEMENT_POLICY.ATOMIC_RECYCLE_HELD,
    expiryPolicy: EQUIPMENT_SUPPLY_EXPIRY_POLICY.WORLD_ONLY_AT_EXPIRE_TICK,
    tickOrder: EQUIPMENT_SUPPLY_TICK_ORDER,
  });

export const ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIER_POLICY_CANDIDATE_V1 =
  createSurvivalEquipmentTierPolicyDefinition({
    schemaVersion: MODE_POLICY_DEFINITION_SCHEMA_VERSION,
    id: 'arena-v2.mode-policy.survival.baseline-weapon-tier.candidate.v1',
    contentVersion: 1,
    modeKind: MODE_KIND.SURVIVAL,
    supplyDefinitionId: ARENA_V2_SURVIVAL_BASELINE_SUPPLY_DEFINITION_CANDIDATE_V1.id,
    tiers: ARENA_V2_SURVIVAL_WEAPON_LEVEL_TUNING_CANDIDATE_V1.map((level) => ({
      minimumWaveIndex: level.minimumWaveIndex,
      survivalLevel: level.level,
      variants: WEAPONS.map((weapon) => {
        const runtime = RUNTIME_VARIANTS.find((candidate) => (
          candidate.weaponId === weapon.id && candidate.level === level.level
        ));
        if (!runtime) throw new Error(`${weapon.id} level ${level.level} runtime缺失。`);
        return {
          collectionEquipmentDefinitionId: weapon.equipment.id,
          runtimeEquipmentDefinitionId: runtime.equipment.id,
        };
      }),
    })),
  });

const COLLECTION_EQUIPMENT = Object.freeze(WEAPONS.map(({ equipment }) => equipment));
const COLLECTION_ACTION_DEFINITIONS = Object.freeze(WEAPONS.flatMap(({ actions }) => actions));
const ACTION_DEFINITIONS = Object.freeze([
  ...ARENA_V2_UNARMED_ACTION_CANDIDATE_V1.actions,
  ...COLLECTION_ACTION_DEFINITIONS,
  ...RUNTIME_VARIANTS.flatMap(({ actions }) => actions),
]);
const RUNTIME_EQUIPMENT = Object.freeze(RUNTIME_VARIANTS.map(({ equipment }) => equipment));

function validateCatalogClosure(): void {
  const actionRegistry = new ActionRegistry(ACTION_DEFINITIONS);
  const equipmentRegistry = new EquipmentRegistry({
    definitions: [...COLLECTION_EQUIPMENT, ...RUNTIME_EQUIPMENT],
    actionRegistry,
  });
  const supplyRegistry = new EquipmentSupplyRegistry([
    ARENA_V2_SURVIVAL_BASELINE_SUPPLY_DEFINITION_CANDIDATE_V1,
  ]);
  supplyRegistry.require(ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIER_POLICY_CANDIDATE_V1.supplyDefinitionId);
  for (const tier of ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIER_POLICY_CANDIDATE_V1.tiers) {
    for (const variant of tier.variants) {
      equipmentRegistry.require(variant.collectionEquipmentDefinitionId);
      equipmentRegistry.require(variant.runtimeEquipmentDefinitionId);
    }
  }
}

validateCatalogClosure();

const CATALOG_AUTHORITY = Object.freeze({
  schemaVersion: ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1_SCHEMA_VERSION,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  tickRate: 60 as const,
  baseGroundActionDefinitionId: ARENA_V2_UNARMED_ACTION_CANDIDATE_V1.actions[0]!.id,
  baseAerialActionDefinitionId: ARENA_V2_UNARMED_ACTION_CANDIDATE_V1.actions[1]!.id,
  supplyDefinition: ARENA_V2_SURVIVAL_BASELINE_SUPPLY_DEFINITION_CANDIDATE_V1,
  tierPolicyDefinition: ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIER_POLICY_CANDIDATE_V1,
  levelTuning: ARENA_V2_SURVIVAL_WEAPON_LEVEL_TUNING_CANDIDATE_V1,
  spawnSpecs: ARENA_V2_SURVIVAL_BASELINE_SUPPLY_SPAWN_SPECS_CANDIDATE_V1,
  waveEquipmentOverrides: ARENA_V2_SURVIVAL_BASELINE_SUPPLY_WAVE_OVERRIDES_CANDIDATE_V1,
  collectionEquipmentDefinitions: COLLECTION_EQUIPMENT,
  runtimeVariants: RUNTIME_VARIANTS,
  actionDefinitions: ACTION_DEFINITIONS,
  runtimeEquipmentDefinitions: RUNTIME_EQUIPMENT,
});

export const ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1:
ArenaV2SurvivalBaselineWeaponTiersCandidateV1 = Object.freeze({
  ...CATALOG_AUTHORITY,
  contentHash: createDeterministicDataHash(
    CATALOG_AUTHORITY,
    'Arena V2 Survival Baseline Weapon Tiers Candidate V1',
  ),
});

export function createArenaV2SurvivalBaselineWeaponCandidateRegistriesV1(): Readonly<{
  actionRegistry: ActionRegistry;
  equipmentRegistry: EquipmentRegistry;
  equipmentSupplyRegistry: EquipmentSupplyRegistry;
}> {
  const actionRegistry = new ActionRegistry(ACTION_DEFINITIONS);
  return Object.freeze({
    actionRegistry,
    equipmentRegistry: new EquipmentRegistry({
      definitions: [...COLLECTION_EQUIPMENT, ...RUNTIME_EQUIPMENT],
      actionRegistry,
    }),
    equipmentSupplyRegistry: new EquipmentSupplyRegistry([
      ARENA_V2_SURVIVAL_BASELINE_SUPPLY_DEFINITION_CANDIDATE_V1,
    ]),
  });
}

function registeredWeaponSources(
  collectionEquipmentDefinitionIds: readonly string[],
): readonly BaselineWeaponSourceV1[] {
  if (!Array.isArray(collectionEquipmentDefinitionIds)
    || collectionEquipmentDefinitionIds.length === 0) {
    throw new RangeError('Arena V2 Survival已注册武器池不能为空。');
  }
  const ids = collectionEquipmentDefinitionIds.map((value, index) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new TypeError(`Arena V2 Survival已注册武器池[${index}]必须是非空字符串。`);
    }
    return value;
  });
  if (new Set(ids).size !== ids.length) {
    throw new RangeError('Arena V2 Survival已注册武器池不能包含重复Definition。');
  }
  const result = ids.map((equipmentDefinitionId) => {
    const weapon = WEAPONS.find(({ equipment }) => equipment.id === equipmentDefinitionId);
    if (weapon === undefined) {
      throw new RangeError(
        `Arena V2 Survival已注册武器池包含未知Definition ${equipmentDefinitionId}。`,
      );
    }
    return weapon;
  });
  return Object.freeze(result);
}

export function createArenaV2SurvivalRegisteredWeaponPoolCandidateV1(
  collectionEquipmentDefinitionIds: readonly string[],
): ArenaV2SurvivalRegisteredWeaponPoolCandidateV1 {
  const weapons = registeredWeaponSources(collectionEquipmentDefinitionIds);
  const weaponIds = Object.freeze(weapons.map(({ id }) => id));
  const equipmentIds = Object.freeze(weapons.map(({ equipment }) => equipment.id));
  const runtimeVariants = Object.freeze(RUNTIME_VARIANTS.filter(({ weaponId }) => (
    weaponIds.includes(weaponId)
  )));
  const spawnSpecs = Object.freeze(
    ARENA_V2_SURVIVAL_BASELINE_SUPPLY_SPAWN_SPECS_CANDIDATE_V1.map((spec, index) => (
      Object.freeze({
        ...spec,
        equipmentDefinitionId: weapons[index % weapons.length]!.equipment.id,
      })
    )),
  );
  const waveEquipmentOverrides = Object.freeze(
    ARENA_V2_SURVIVAL_WEAPON_LEVEL_TUNING_CANDIDATE_V1.map((level) => Object.freeze({
      minimumWaveIndex: level.minimumWaveIndex,
      slots: Object.freeze(spawnSpecs.map((spec, index) => {
        const weapon = weapons[
          (level.minimumWaveIndex * ARENA_V2_SURVIVAL_SUPPLY_SPAWN_COUNT_CANDIDATE_V1 + index)
            % weapons.length
        ]!;
        const runtime = runtimeVariants.find((candidate) => (
          candidate.weaponId === weapon.id && candidate.level === level.level
        ));
        if (runtime === undefined) {
          throw new Error(`${weapon.id} level ${level.level}注册武器池runtime缺失。`);
        }
        return Object.freeze({
          slotId: spec.slotId,
          equipmentDefinitionId: runtime.equipment.id,
        });
      })),
    })),
  );
  const tierPolicyDefinition = createSurvivalEquipmentTierPolicyDefinition({
    schemaVersion: MODE_POLICY_DEFINITION_SCHEMA_VERSION,
    id: 'arena-v2.mode-policy.survival.registered-weapon-tier.candidate.v1',
    contentVersion: 1,
    modeKind: MODE_KIND.SURVIVAL,
    supplyDefinitionId: ARENA_V2_SURVIVAL_BASELINE_SUPPLY_DEFINITION_CANDIDATE_V1.id,
    tiers: ARENA_V2_SURVIVAL_WEAPON_LEVEL_TUNING_CANDIDATE_V1.map((level) => ({
      minimumWaveIndex: level.minimumWaveIndex,
      survivalLevel: level.level,
      variants: weapons.map((weapon) => {
        const runtime = runtimeVariants.find((candidate) => (
          candidate.weaponId === weapon.id && candidate.level === level.level
        ));
        if (runtime === undefined) {
          throw new Error(`${weapon.id} level ${level.level}注册武器池tier缺失。`);
        }
        return {
          collectionEquipmentDefinitionId: weapon.equipment.id,
          runtimeEquipmentDefinitionId: runtime.equipment.id,
        };
      }),
    })),
  });
  const collectionEquipmentDefinitions = Object.freeze(weapons.map(({ equipment }) => equipment));
  const actionDefinitions = Object.freeze([
    ...ARENA_V2_UNARMED_ACTION_CANDIDATE_V1.actions,
    ...weapons.flatMap(({ actions }) => actions),
    ...runtimeVariants.flatMap(({ actions }) => actions),
  ]);
  const runtimeEquipmentDefinitions = Object.freeze(
    runtimeVariants.map(({ equipment }) => equipment),
  );
  const authority = Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultRegistryWired: false as const,
    source: 'active-collection-registry-snapshot' as const,
    collectionWeaponIds: weaponIds,
    collectionEquipmentDefinitionIds: equipmentIds,
    baseGroundActionDefinitionId: ARENA_V2_UNARMED_ACTION_CANDIDATE_V1.actions[0]!.id,
    baseAerialActionDefinitionId: ARENA_V2_UNARMED_ACTION_CANDIDATE_V1.actions[1]!.id,
    supplyDefinition: ARENA_V2_SURVIVAL_BASELINE_SUPPLY_DEFINITION_CANDIDATE_V1,
    tierPolicyDefinition,
    spawnSpecs,
    waveEquipmentOverrides,
    collectionEquipmentDefinitions,
    runtimeVariants,
    actionDefinitions,
    runtimeEquipmentDefinitions,
  });
  return Object.freeze({
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Survival Registered Weapon Pool Candidate V1',
    ),
  });
}

export function createArenaV2SurvivalRegisteredWeaponPoolRegistriesCandidateV1(
  collectionEquipmentDefinitionIds: readonly string[],
): Readonly<{
  weaponPool: ArenaV2SurvivalRegisteredWeaponPoolCandidateV1;
  actionRegistry: ActionRegistry;
  equipmentRegistry: EquipmentRegistry;
  equipmentSupplyRegistry: EquipmentSupplyRegistry;
}> {
  const weaponPool = createArenaV2SurvivalRegisteredWeaponPoolCandidateV1(
    collectionEquipmentDefinitionIds,
  );
  const actionRegistry = new ActionRegistry(weaponPool.actionDefinitions);
  return Object.freeze({
    weaponPool,
    actionRegistry,
    equipmentRegistry: new EquipmentRegistry({
      definitions: [
        ...weaponPool.collectionEquipmentDefinitions,
        ...weaponPool.runtimeEquipmentDefinitions,
      ],
      actionRegistry,
    }),
    equipmentSupplyRegistry: new EquipmentSupplyRegistry([
      weaponPool.supplyDefinition,
    ]),
  });
}
