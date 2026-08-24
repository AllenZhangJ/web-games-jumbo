import {
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import type {
  ActionDefinition,
  WeaponActionContextV1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
  type ArenaV2CollectionWeaponBundleCandidateV1,
} from './arena-v2-collection-weapon-catalog-candidate-v1.js';

export const ARENA_V2_WEAPON_NUMERIC_DOMINANCE_AUDIT_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

export type ArenaV2WeaponNumericDominanceContextCandidateV1 = 'ground' | 'aerial';

export type ArenaV2WeaponNumericDominanceAxisCandidateV1 =
  | 'threat-range'
  | 'vertical-tolerance'
  | 'facing-coverage'
  | 'horizontal-control'
  | 'hitstun'
  | 'windup'
  | 'recovery'
  | 'repeat-interval';

export interface ArenaV2WeaponNumericDominanceAxisReadCandidateV1 {
  readonly axis: ArenaV2WeaponNumericDominanceAxisCandidateV1;
  readonly direction: 'higher-is-advantage' | 'lower-is-advantage';
  readonly value: number;
}

export interface ArenaV2WeaponNumericDominanceActionReadCandidateV1 {
  readonly context: ArenaV2WeaponNumericDominanceContextCandidateV1;
  readonly actionDefinitionId: string;
  readonly targetingKind: string;
  readonly impactKind: 'apply-directional-impulse' | 'pull-to-source';
  readonly failureRisk: WeaponActionContextV1['failureRisk'];
  readonly semanticCompatibilityHash: string;
  readonly axes: readonly ArenaV2WeaponNumericDominanceAxisReadCandidateV1[];
}

export interface ArenaV2WeaponNumericDominanceWeaponReadCandidateV1 {
  readonly weaponId: string;
  readonly collectionOrder: number;
  readonly coreVerb: ArenaV2CollectionWeaponBundleCandidateV1['grammar']['coreVerb'];
  readonly ground: ArenaV2WeaponNumericDominanceActionReadCandidateV1;
  readonly aerial: ArenaV2WeaponNumericDominanceActionReadCandidateV1;
}

export interface ArenaV2WeaponNumericDominancePairCandidateV1 {
  readonly numericallyDominantWeaponId: string;
  readonly numericallyDominatedWeaponId: string;
  readonly coreVerb: ArenaV2CollectionWeaponBundleCandidateV1['grammar']['coreVerb'];
  readonly strictAdvantageAxes: readonly string[];
  readonly equalAxes: readonly string[];
  readonly requiresBalanceReview: true;
  readonly provesOverallWeaponDominance: false;
}

export interface ArenaV2WeaponNumericDominanceAuditCandidateV1 {
  readonly schemaVersion:
    typeof ARENA_V2_WEAPON_NUMERIC_DOMINANCE_AUDIT_CANDIDATE_V1_SCHEMA_VERSION;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultRegistryWired: false;
  readonly weaponCount: 20;
  readonly comparedPairCount: number;
  readonly incomparablePairCount: number;
  readonly numericDominancePairCount: number;
  readonly requiresBalanceReview: boolean;
  readonly weapons: readonly ArenaV2WeaponNumericDominanceWeaponReadCandidateV1[];
  readonly numericDominancePairs: readonly ArenaV2WeaponNumericDominancePairCandidateV1[];
  readonly computesCompositePowerScore: false;
  readonly mutatesWeaponTuning: false;
  readonly claimsDynamicBalance: false;
  readonly requiresDynamicThreeModeMapEvidence: true;
  readonly validationStatus: 'not-run';
  readonly contentHash: string;
}

const AXIS_DIRECTIONS = Object.freeze({
  'threat-range': 'higher-is-advantage',
  'vertical-tolerance': 'higher-is-advantage',
  'facing-coverage': 'higher-is-advantage',
  'horizontal-control': 'higher-is-advantage',
  hitstun: 'higher-is-advantage',
  windup: 'lower-is-advantage',
  recovery: 'lower-is-advantage',
  'repeat-interval': 'lower-is-advantage',
} satisfies Readonly<Record<
  ArenaV2WeaponNumericDominanceAxisCandidateV1,
  ArenaV2WeaponNumericDominanceAxisReadCandidateV1['direction']
>>);

function record(value: unknown, name: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是对象。`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function finite(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name}必须是有限数。`);
  }
  return value;
}

function finiteAtLeast(value: unknown, minimum: number, name: string): number {
  const result = finite(value, name);
  if (result < minimum) throw new RangeError(`${name}必须大于等于${minimum}。`);
  return result;
}

function parameter(
  source: Readonly<Record<string, unknown>>,
  key: string,
  name: string,
): number {
  if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  return finite(source[key], `${name}.${key}`);
}

function effect(
  action: ActionDefinition,
  kinds: ReadonlySet<string>,
  name: string,
) {
  const matches = action.effects.filter(({ kind }) => kinds.has(kind));
  if (matches.length !== 1) throw new RangeError(`${name}必须有唯一匹配effect。`);
  return matches[0]!;
}

function actionRead(
  action: ActionDefinition,
  context: WeaponActionContextV1,
): ArenaV2WeaponNumericDominanceActionReadCandidateV1 {
  const name = `Arena V2数值支配审计${action.id}`;
  const targeting = record(action.targeting.parameters, `${name}.targeting.parameters`);
  const impact = effect(
    action,
    new Set(['apply-directional-impulse', 'pull-to-source']),
    `${name}.impact`,
  );
  const hitstun = effect(action, new Set(['apply-hitstun']), `${name}.hitstun`);
  const impactParameters = record(impact.parameters, `${name}.impact.parameters`);
  const hitstunParameters = record(hitstun.parameters, `${name}.hitstun.parameters`);
  const minimumFacingDot = Object.hasOwn(targeting, 'minimumFacingDot')
    ? finite(targeting.minimumFacingDot, `${name}.minimumFacingDot`)
    : null;
  if (minimumFacingDot !== null && (minimumFacingDot < -1 || minimumFacingDot > 1)) {
    throw new RangeError(`${name}.minimumFacingDot超出[-1,1]。`);
  }
  const repeatInterval = Math.max(
    action.timing.windupTicks + action.timing.activeTicks + action.timing.recoveryTicks,
    action.timing.cooldownTicks,
  );
  const axes = Object.freeze([
    Object.freeze({
      axis: 'threat-range' as const,
      direction: AXIS_DIRECTIONS['threat-range'],
      value: finiteAtLeast(parameter(targeting, 'range', name), 0, `${name}.range`),
    }),
    Object.freeze({
      axis: 'vertical-tolerance' as const,
      direction: AXIS_DIRECTIONS['vertical-tolerance'],
      value: finiteAtLeast(
        parameter(targeting, 'maximumVerticalDifference', name),
        0,
        `${name}.maximumVerticalDifference`,
      ),
    }),
    Object.freeze({
      axis: 'facing-coverage' as const,
      direction: AXIS_DIRECTIONS['facing-coverage'],
      value: minimumFacingDot === null ? 2 : 1 - minimumFacingDot,
    }),
    Object.freeze({
      axis: 'horizontal-control' as const,
      direction: AXIS_DIRECTIONS['horizontal-control'],
      value: finiteAtLeast(
        parameter(impactParameters, 'horizontalImpulse', `${name}.impact`),
        0,
        `${name}.horizontalImpulse`,
      ),
    }),
    Object.freeze({
      axis: 'hitstun' as const,
      direction: AXIS_DIRECTIONS.hitstun,
      value: finiteAtLeast(
        parameter(hitstunParameters, 'ticks', `${name}.hitstun`),
        0,
        `${name}.hitstunTicks`,
      ),
    }),
    Object.freeze({
      axis: 'windup' as const,
      direction: AXIS_DIRECTIONS.windup,
      value: action.timing.windupTicks,
    }),
    Object.freeze({
      axis: 'recovery' as const,
      direction: AXIS_DIRECTIONS.recovery,
      value: action.timing.recoveryTicks,
    }),
    Object.freeze({
      axis: 'repeat-interval' as const,
      direction: AXIS_DIRECTIONS['repeat-interval'],
      value: repeatInterval,
    }),
  ]);
  const ignoredTargetingParameters = Object.fromEntries(
    Object.entries(targeting).filter(([key]) => ![
      'range', 'maximumVerticalDifference', 'minimumFacingDot',
    ].includes(key)),
  );
  const effectSemantics = action.effects.map((entry) => {
    const parameters = record(entry.parameters, `${name}.${entry.kind}.parameters`);
    if (entry === impact) {
      return Object.freeze({
        kind: entry.kind,
        trigger: entry.trigger,
        verticalImpulse: parameter(parameters, 'verticalImpulse', `${name}.impact`),
      });
    }
    if (entry === hitstun) return Object.freeze({ kind: entry.kind, trigger: entry.trigger });
    return Object.freeze({ kind: entry.kind, trigger: entry.trigger, parameters });
  });
  const semanticCompatibilityHash = createDeterministicDataHash({
    targetingKind: action.targeting.kind,
    ignoredTargetingParameters,
    effectSemantics,
    commitment: action.commitment ?? null,
    failureRisk: context.failureRisk,
  }, `${name}.semantic-compatibility`);
  return Object.freeze({
    context: context.kind,
    actionDefinitionId: action.id,
    targetingKind: action.targeting.kind,
    impactKind: impact.kind as 'apply-directional-impulse' | 'pull-to-source',
    failureRisk: context.failureRisk,
    semanticCompatibilityHash,
    axes,
  });
}

function weaponRead(
  weapon: ArenaV2CollectionWeaponBundleCandidateV1,
): ArenaV2WeaponNumericDominanceWeaponReadCandidateV1 {
  const groundContext = weapon.grammar.contexts.find(({ kind }) => kind === 'ground');
  const aerialContext = weapon.grammar.contexts.find(({ kind }) => kind === 'aerial');
  if (!groundContext || !aerialContext) {
    throw new RangeError(`Arena V2数值支配审计${weapon.id}缺少地面或空中语法。`);
  }
  const groundAction = weapon.actions.find(({ id }) => (
    id === groundContext.actionDefinitionId
  ));
  const aerialAction = weapon.actions.find(({ id }) => (
    id === aerialContext.actionDefinitionId
  ));
  if (!groundAction || !aerialAction) {
    throw new RangeError(`Arena V2数值支配审计${weapon.id}动作身份不闭合。`);
  }
  return Object.freeze({
    weaponId: weapon.id,
    collectionOrder: weapon.collectionOrder,
    coreVerb: weapon.grammar.coreVerb,
    ground: actionRead(groundAction, groundContext),
    aerial: actionRead(aerialAction, aerialContext),
  });
}

function compareActions(
  candidate: ArenaV2WeaponNumericDominanceActionReadCandidateV1,
  reference: ArenaV2WeaponNumericDominanceActionReadCandidateV1,
): Readonly<{
  compatible: boolean;
  noWorse: boolean;
  strict: readonly string[];
  equal: readonly string[];
}> {
  if (candidate.context !== reference.context
    || candidate.semanticCompatibilityHash !== reference.semanticCompatibilityHash
    || candidate.axes.length !== reference.axes.length) {
    return Object.freeze({ compatible: false, noWorse: false, strict: [], equal: [] });
  }
  const strict: string[] = [];
  const equal: string[] = [];
  for (let index = 0; index < candidate.axes.length; index += 1) {
    const left = candidate.axes[index]!;
    const right = reference.axes[index]!;
    if (left.axis !== right.axis || left.direction !== right.direction) {
      return Object.freeze({ compatible: false, noWorse: false, strict: [], equal: [] });
    }
    if (left.value === right.value) {
      equal.push(`${candidate.context}:${left.axis}`);
      continue;
    }
    const better = left.direction === 'higher-is-advantage'
      ? left.value > right.value
      : left.value < right.value;
    if (!better) {
      return Object.freeze({ compatible: true, noWorse: false, strict: [], equal: [] });
    }
    strict.push(`${candidate.context}:${left.axis}`);
  }
  return Object.freeze({
    compatible: true,
    noWorse: true,
    strict: Object.freeze(strict),
    equal: Object.freeze(equal),
  });
}

export function projectArenaV2WeaponNumericDominanceAuditCandidateV1(
): ArenaV2WeaponNumericDominanceAuditCandidateV1 {
  const weapons = Object.freeze(
    ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1
      .map(weaponRead)
      .sort((left, right) => left.collectionOrder - right.collectionOrder),
  );
  if (weapons.length !== 20 || new Set(weapons.map(({ weaponId }) => weaponId)).size !== 20) {
    throw new RangeError('Arena V2数值支配审计必须精确覆盖20把收藏武器。');
  }
  let comparedPairCount = 0;
  let incomparablePairCount = 0;
  const numericDominancePairs: ArenaV2WeaponNumericDominancePairCandidateV1[] = [];
  for (const candidate of weapons) {
    for (const reference of weapons) {
      if (candidate.weaponId === reference.weaponId) continue;
      if (candidate.coreVerb !== reference.coreVerb) {
        incomparablePairCount += 1;
        continue;
      }
      const ground = compareActions(candidate.ground, reference.ground);
      const aerial = compareActions(candidate.aerial, reference.aerial);
      if (!ground.compatible || !aerial.compatible) {
        incomparablePairCount += 1;
        continue;
      }
      comparedPairCount += 1;
      if (!ground.noWorse || !aerial.noWorse) continue;
      const strictAdvantageAxes = Object.freeze([...ground.strict, ...aerial.strict]);
      if (strictAdvantageAxes.length === 0) continue;
      numericDominancePairs.push(Object.freeze({
        numericallyDominantWeaponId: candidate.weaponId,
        numericallyDominatedWeaponId: reference.weaponId,
        coreVerb: candidate.coreVerb,
        strictAdvantageAxes,
        equalAxes: Object.freeze([...ground.equal, ...aerial.equal]),
        requiresBalanceReview: true as const,
        provesOverallWeaponDominance: false as const,
      }));
    }
  }
  numericDominancePairs.sort((left, right) => (
    left.numericallyDominantWeaponId.localeCompare(right.numericallyDominantWeaponId)
    || left.numericallyDominatedWeaponId.localeCompare(right.numericallyDominatedWeaponId)
  ));
  const authority = Object.freeze({
    schemaVersion: ARENA_V2_WEAPON_NUMERIC_DOMINANCE_AUDIT_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultRegistryWired: false as const,
    weaponCount: 20 as const,
    comparedPairCount,
    incomparablePairCount,
    numericDominancePairCount: numericDominancePairs.length,
    requiresBalanceReview: numericDominancePairs.length > 0,
    weapons,
    numericDominancePairs: Object.freeze(numericDominancePairs),
    computesCompositePowerScore: false as const,
    mutatesWeaponTuning: false as const,
    claimsDynamicBalance: false as const,
    requiresDynamicThreeModeMapEvidence: true as const,
    validationStatus: 'not-run' as const,
  });
  return Object.freeze({
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Weapon Numeric Dominance Audit Candidate V1',
    ),
  });
}

export const ARENA_V2_WEAPON_NUMERIC_DOMINANCE_AUDIT_POLICY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    sameCoreVerbAndSemanticShapeOnly: true as const,
    groundAndAerialMustBothBeNoWorse: true as const,
    atLeastOneStrictNumericAdvantageRequired: true as const,
    compositePowerScoreForbidden: true as const,
    automaticTuningMutationForbidden: true as const,
    numericFindingRequiresThreeModeMapReview: true as const,
    validationStatus: 'not-run' as const,
  });
