import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';

export const WEAPON_COMBAT_GRAMMAR_DEFINITION_V1_SCHEMA_VERSION = 1 as const;

export const WEAPON_CORE_VERB_V1 = Object.freeze({
  PUSH: 'push',
  PULL: 'pull',
  CHARGE: 'charge',
  SUPPRESS: 'suppress',
  COUNTER: 'counter',
  FLANK: 'flank',
} as const);

export const WEAPON_ACTION_CONTEXT_V1 = Object.freeze({
  GROUND: 'ground',
  AERIAL: 'aerial',
} as const);

export const WEAPON_COUNTER_INPUT_V1 = Object.freeze({
  DIRECTION: 'direction',
  JUMP: 'jump',
} as const);

export const WEAPON_MAP_SITUATION_V1 = Object.freeze({
  EDGE: 'edge',
  NARROW_PATH: 'narrow-path',
  HEIGHT_TRANSITION: 'height-transition',
  PLATFORM_ENTRY: 'platform-entry',
  GAP: 'gap',
  OPEN_PLATFORM: 'open-platform',
} as const);

export const WEAPON_FAILURE_RISK_V1 = Object.freeze({
  LONG_RECOVERY: 'long-recovery',
  AIM_COMMITMENT: 'aim-commitment',
  SELF_OVERSHOOT: 'self-overshoot',
  LANDING_COMMITMENT: 'landing-commitment',
  NARROW_COVERAGE: 'narrow-coverage',
  HOLD_COMMITMENT: 'hold-commitment',
  POSITION_DEPENDENT: 'position-dependent',
} as const);

export const WEAPON_MODE_KIND_V1 = Object.freeze({
  DUEL: 'duel',
  RACE: 'race',
  SURVIVAL: 'survival',
} as const);

export const WEAPON_TUNING_FIELD_V1 = Object.freeze({
  RANGE: 'range',
  HORIZONTAL_IMPULSE: 'horizontal-impulse',
  VERTICAL_IMPULSE: 'vertical-impulse',
  COOLDOWN_TICKS: 'cooldown-ticks',
  HITSTUN_TICKS: 'hitstun-ticks',
} as const);

export type WeaponCoreVerbV1 = typeof WEAPON_CORE_VERB_V1[keyof typeof WEAPON_CORE_VERB_V1];
export type WeaponActionContextKindV1 = typeof WEAPON_ACTION_CONTEXT_V1[
  keyof typeof WEAPON_ACTION_CONTEXT_V1
];
export type WeaponCounterInputV1 = typeof WEAPON_COUNTER_INPUT_V1[
  keyof typeof WEAPON_COUNTER_INPUT_V1
];
export type WeaponMapSituationV1 = typeof WEAPON_MAP_SITUATION_V1[
  keyof typeof WEAPON_MAP_SITUATION_V1
];
export type WeaponFailureRiskV1 = typeof WEAPON_FAILURE_RISK_V1[
  keyof typeof WEAPON_FAILURE_RISK_V1
];
export type WeaponModeKindV1 = typeof WEAPON_MODE_KIND_V1[keyof typeof WEAPON_MODE_KIND_V1];
export type WeaponTuningFieldV1 = typeof WEAPON_TUNING_FIELD_V1[
  keyof typeof WEAPON_TUNING_FIELD_V1
];

export interface WeaponActionContextV1 {
  readonly kind: WeaponActionContextKindV1;
  readonly actionDefinitionId: string;
  readonly intendedResult: string;
  readonly mapSituations: readonly WeaponMapSituationV1[];
  readonly failureRisk: WeaponFailureRiskV1;
  readonly counterInputs: readonly WeaponCounterInputV1[];
}

export interface WeaponModeConsequenceV1 {
  readonly modeKind: WeaponModeKindV1;
  readonly mapSituations: readonly WeaponMapSituationV1[];
  readonly intendedOutcomes: readonly string[];
}

export interface WeaponSurvivalGrowthV1 {
  readonly semanticsLocked: true;
  readonly addsInput: false;
  readonly addsAction: false;
  readonly permittedTuningFields: readonly WeaponTuningFieldV1[];
}

export interface WeaponCombatGrammarDefinitionV1 {
  readonly schemaVersion: typeof WEAPON_COMBAT_GRAMMAR_DEFINITION_V1_SCHEMA_VERSION;
  readonly id: string;
  readonly equipmentDefinitionId: string;
  readonly coreVerb: WeaponCoreVerbV1;
  readonly requiredInput: 'primary';
  readonly contexts: readonly WeaponActionContextV1[];
  readonly modeConsequences: readonly WeaponModeConsequenceV1[];
  readonly survivalGrowth: WeaponSurvivalGrowthV1;
  readonly tags: readonly string[];
}

const DEFINITION_KEYS = new Set([
  'schemaVersion', 'id', 'equipmentDefinitionId', 'coreVerb', 'requiredInput',
  'contexts', 'modeConsequences', 'survivalGrowth', 'tags',
]);
const CONTEXT_KEYS = new Set([
  'kind', 'actionDefinitionId', 'intendedResult', 'mapSituations',
  'failureRisk', 'counterInputs',
]);
const MODE_CONSEQUENCE_KEYS = new Set([
  'modeKind', 'mapSituations', 'intendedOutcomes',
]);
const SURVIVAL_GROWTH_KEYS = new Set([
  'semanticsLocked', 'addsInput', 'addsAction', 'permittedTuningFields',
]);
const CORE_VERBS: ReadonlySet<unknown> = new Set(Object.values(WEAPON_CORE_VERB_V1));
const CONTEXT_KINDS: ReadonlySet<unknown> = new Set(Object.values(WEAPON_ACTION_CONTEXT_V1));
const COUNTER_INPUTS: ReadonlySet<unknown> = new Set(Object.values(WEAPON_COUNTER_INPUT_V1));
const MAP_SITUATIONS: ReadonlySet<unknown> = new Set(Object.values(WEAPON_MAP_SITUATION_V1));
const FAILURE_RISKS: ReadonlySet<unknown> = new Set(Object.values(WEAPON_FAILURE_RISK_V1));
const MODE_KINDS: ReadonlySet<unknown> = new Set(Object.values(WEAPON_MODE_KIND_V1));
const TUNING_FIELDS: ReadonlySet<unknown> = new Set(Object.values(WEAPON_TUNING_FIELD_V1));
const REQUIRED_CONTEXT_ORDER = Object.freeze([
  WEAPON_ACTION_CONTEXT_V1.GROUND,
  WEAPON_ACTION_CONTEXT_V1.AERIAL,
]);
const REQUIRED_MODE_ORDER = Object.freeze([
  WEAPON_MODE_KIND_V1.DUEL,
  WEAPON_MODE_KIND_V1.RACE,
  WEAPON_MODE_KIND_V1.SURVIVAL,
]);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
}

function enumValue<T extends string>(
  value: unknown,
  values: ReadonlySet<unknown>,
  name: string,
): T {
  if (!values.has(value)) throw new RangeError(`${name}不受支持：${String(value)}。`);
  return value as T;
}

function enumSet<T extends string>(
  value: unknown,
  values: ReadonlySet<unknown>,
  name: string,
  minimumLength = 1,
): readonly T[] {
  if (!Array.isArray(value) || value.length < minimumLength) {
    throw new RangeError(`${name}至少需要${minimumLength}项。`);
  }
  const result = value.map((entry, index) => enumValue<T>(entry, values, `${name}[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError(`${name}不能重复。`);
  return Object.freeze(result);
}

function stringSet(
  value: unknown,
  name: string,
  minimumLength = 1,
): readonly string[] {
  if (!Array.isArray(value) || value.length < minimumLength) {
    throw new RangeError(`${name}至少需要${minimumLength}项。`);
  }
  const result = value.map((entry, index) => assertNonEmptyString(entry, `${name}[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError(`${name}不能重复。`);
  return Object.freeze(result);
}

export function createWeaponCombatGrammarDefinitionV1(
  value: unknown,
): WeaponCombatGrammarDefinitionV1 {
  const source = cloneFrozenData(value, 'WeaponCombatGrammarDefinitionV1');
  exactRecord(source, DEFINITION_KEYS, 'WeaponCombatGrammarDefinitionV1');
  if (source.schemaVersion !== WEAPON_COMBAT_GRAMMAR_DEFINITION_V1_SCHEMA_VERSION) {
    throw new RangeError('WeaponCombatGrammarDefinitionV1.schemaVersion必须是1。');
  }
  if (source.requiredInput !== 'primary') {
    throw new RangeError('WeaponCombatGrammarDefinitionV1只允许复用primary输入。');
  }
  if (!Array.isArray(source.contexts) || source.contexts.length !== 2) {
    throw new RangeError('WeaponCombatGrammarDefinitionV1必须精确包含ground/aerial两个上下文。');
  }
  const contexts = source.contexts.map((entry, index) => {
    const name = `WeaponCombatGrammarDefinitionV1.contexts[${index}]`;
    exactRecord(entry, CONTEXT_KEYS, name);
    const kind = enumValue<WeaponActionContextKindV1>(entry.kind, CONTEXT_KINDS, `${name}.kind`);
    if (kind !== REQUIRED_CONTEXT_ORDER[index]) {
      throw new RangeError('WeaponCombatGrammarDefinitionV1.contexts必须按ground/aerial排列。');
    }
    return Object.freeze({
      kind,
      actionDefinitionId: assertNonEmptyString(entry.actionDefinitionId, `${name}.actionDefinitionId`),
      intendedResult: assertNonEmptyString(entry.intendedResult, `${name}.intendedResult`),
      mapSituations: enumSet<WeaponMapSituationV1>(
        entry.mapSituations,
        MAP_SITUATIONS,
        `${name}.mapSituations`,
      ),
      failureRisk: enumValue<WeaponFailureRiskV1>(
        entry.failureRisk,
        FAILURE_RISKS,
        `${name}.failureRisk`,
      ),
      counterInputs: enumSet<WeaponCounterInputV1>(
        entry.counterInputs,
        COUNTER_INPUTS,
        `${name}.counterInputs`,
      ),
    });
  });
  if (!Array.isArray(source.modeConsequences) || source.modeConsequences.length !== 3) {
    throw new RangeError('WeaponCombatGrammarDefinitionV1必须精确覆盖duel/race/survival。');
  }
  const modeConsequences = source.modeConsequences.map((entry, index) => {
    const name = `WeaponCombatGrammarDefinitionV1.modeConsequences[${index}]`;
    exactRecord(entry, MODE_CONSEQUENCE_KEYS, name);
    const modeKind = enumValue<WeaponModeKindV1>(entry.modeKind, MODE_KINDS, `${name}.modeKind`);
    if (modeKind !== REQUIRED_MODE_ORDER[index]) {
      throw new RangeError('WeaponCombatGrammarDefinitionV1.modeConsequences顺序必须是duel/race/survival。');
    }
    return Object.freeze({
      modeKind,
      mapSituations: enumSet<WeaponMapSituationV1>(
        entry.mapSituations,
        MAP_SITUATIONS,
        `${name}.mapSituations`,
        2,
      ),
      intendedOutcomes: stringSet(entry.intendedOutcomes, `${name}.intendedOutcomes`, 2),
    });
  });
  exactRecord(
    source.survivalGrowth,
    SURVIVAL_GROWTH_KEYS,
    'WeaponCombatGrammarDefinitionV1.survivalGrowth',
  );
  if (
    source.survivalGrowth.semanticsLocked !== true
    || source.survivalGrowth.addsInput !== false
    || source.survivalGrowth.addsAction !== false
  ) {
    throw new RangeError('Survival成长必须锁定语义且不得增加输入或动作。');
  }
  return Object.freeze({
    schemaVersion: WEAPON_COMBAT_GRAMMAR_DEFINITION_V1_SCHEMA_VERSION,
    id: assertNonEmptyString(source.id, 'WeaponCombatGrammarDefinitionV1.id'),
    equipmentDefinitionId: assertNonEmptyString(
      source.equipmentDefinitionId,
      'WeaponCombatGrammarDefinitionV1.equipmentDefinitionId',
    ),
    coreVerb: enumValue<WeaponCoreVerbV1>(
      source.coreVerb,
      CORE_VERBS,
      'WeaponCombatGrammarDefinitionV1.coreVerb',
    ),
    requiredInput: 'primary',
    contexts: Object.freeze(contexts),
    modeConsequences: Object.freeze(modeConsequences),
    survivalGrowth: Object.freeze({
      semanticsLocked: true,
      addsInput: false,
      addsAction: false,
      permittedTuningFields: enumSet<WeaponTuningFieldV1>(
        source.survivalGrowth.permittedTuningFields,
        TUNING_FIELDS,
        'WeaponCombatGrammarDefinitionV1.survivalGrowth.permittedTuningFields',
      ),
    }),
    tags: cloneFrozenStringSet(
      source.tags as readonly unknown[],
      'WeaponCombatGrammarDefinitionV1.tags',
    ),
  });
}
