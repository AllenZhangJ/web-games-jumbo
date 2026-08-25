import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import type {
  ActionDefinition,
  WeaponCounterInputV1,
  WeaponFailureRiskV1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_EXPANDED_WEAPON_IDS_CANDIDATE_V1,
  ARENA_V2_EXPANDED_WEAPONS_CANDIDATE_V1,
  ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1,
  type ArenaV2ExpandedWeaponIdCandidateV1,
  type ArenaV2LaunchWeaponIdCandidateV1,
} from '@number-strategy-jump/arena-product-content';
import {
  createArenaWeaponDefenderCounterplayInputScriptCandidateV1,
  runArenaWeaponDefenderCounterfactualProbeCandidateV1,
  type ArenaBaselineWeaponBundleV1,
  type ArenaWeaponDefenderCounterfactualProbeV1,
} from './arena-baseline-weapon-consequence-verification-v1.js';

export const ARENA_EXPANDED_WEAPON_COUNTERPLAY_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_EXPANDED_WEAPON_COUNTERPLAY_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

const PLAN_KEYS = new Set([
  'schemaVersion',
  'candidateStatus',
  'hardGate',
  'defaultRegistryWired',
  'weaponCount',
  'probeOrder',
  'allowedCounterInputs',
  'probes',
  'contentHash',
]);
const ALLOWED_COUNTER_INPUTS = Object.freeze(['direction', 'jump'] as const);
const NO_DISTINGUISHING_OUTCOME_REASON =
  '真实Rule/Movement/Physics反事实链已执行，但当前场景时序尚未形成可区分观察结果。';

type ProbeContext = 'ground' | 'aerial';
type ComparisonRelation = 'greater-than-template' | 'less-than-template';
type ActionMetric =
  | 'targeting.range'
  | 'targeting.radius'
  | 'targeting.minimumFacingDot'
  | 'timing.windupTicks'
  | 'timing.activeTicks'
  | 'timing.recoveryTicks'
  | 'timing.cooldownTicks'
  | 'effect.horizontalImpulse'
  | 'effect.verticalImpulse'
  | 'effect.hitstunTicks'
  | 'effect.selfHorizontalImpulse';

interface AxisSpec {
  readonly context: ProbeContext;
  readonly metric: ActionMetric;
  readonly relation: ComparisonRelation;
}

interface ProbeSpec {
  readonly weaponId: ArenaV2ExpandedWeaponIdCandidateV1;
  readonly sourceTemplateId: ArenaV2LaunchWeaponIdCandidateV1;
  readonly advantage: AxisSpec;
  readonly failureCost: AxisSpec;
}

export interface ArenaExpandedWeaponCounterplayAxisEvidenceV1 {
  readonly context: ProbeContext;
  readonly metric: ActionMetric;
  readonly relation: ComparisonRelation;
  readonly weaponValue: number;
  readonly sourceTemplateValue: number;
}

export interface ArenaExpandedWeaponCounterplayProbeV1 {
  readonly probeId: string;
  readonly weaponId: ArenaV2ExpandedWeaponIdCandidateV1;
  readonly sourceTemplateId: ArenaV2LaunchWeaponIdCandidateV1;
  readonly weaponContentHash: string;
  readonly sourceTemplateContentHash: string;
  readonly equipmentDefinitionId: string;
  readonly grammarDefinitionId: string;
  readonly groundActionDefinitionId: string;
  readonly aerialActionDefinitionId: string;
  readonly coreVerb: string;
  readonly advantage: ArenaExpandedWeaponCounterplayAxisEvidenceV1;
  readonly failureCost: ArenaExpandedWeaponCounterplayAxisEvidenceV1 & Readonly<{
    readonly declaredFailureRisk: WeaponFailureRiskV1;
  }>;
  readonly groundCounterInputs: readonly WeaponCounterInputV1[];
  readonly aerialCounterInputs: readonly WeaponCounterInputV1[];
  readonly groundAirDifferenceAxes: readonly ActionMetric[];
  readonly groundIntendedResult: string;
  readonly aerialIntendedResult: string;
  readonly groundFailureRisk: WeaponFailureRiskV1;
  readonly aerialFailureRisk: WeaponFailureRiskV1;
  readonly sharedExecutorCoverage: 'real-rule-movement-physics-counterfactual-candidate';
  readonly counterplayExecutionStatus:
    | 'executed-counterfactual-candidate-unverified'
    | 'executed-counterfactual-no-observable-outcome-difference-unverified';
  readonly dynamicClosureGap: string | null;
  readonly executionEvidence: readonly ArenaWeaponDefenderCounterfactualProbeV1[];
  readonly probeIdentityHash: string;
}

export interface ArenaExpandedWeaponCounterplayVerificationPlanV1 {
  readonly schemaVersion:
    typeof ARENA_EXPANDED_WEAPON_COUNTERPLAY_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_EXPANDED_WEAPON_COUNTERPLAY_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly defaultRegistryWired: false;
  readonly weaponCount: 14;
  readonly probeOrder: readonly ArenaV2ExpandedWeaponIdCandidateV1[];
  readonly allowedCounterInputs: readonly ['direction', 'jump'];
  readonly probes: readonly ArenaExpandedWeaponCounterplayProbeV1[];
  readonly contentHash: string;
}

const PROBE_SPECS: readonly ProbeSpec[] = Object.freeze([
  Object.freeze({
    weaponId: 'hook-spear', sourceTemplateId: 'gravity-chain',
    advantage: Object.freeze({
      context: 'ground', metric: 'targeting.range', relation: 'greater-than-template',
    }),
    failureCost: Object.freeze({
      context: 'ground',
      metric: 'targeting.minimumFacingDot',
      relation: 'greater-than-template',
    }),
  }),
  Object.freeze({
    weaponId: 'burst-gauntlet', sourceTemplateId: 'heavy-hammer',
    advantage: Object.freeze({
      context: 'ground', metric: 'timing.windupTicks', relation: 'less-than-template',
    }),
    failureCost: Object.freeze({
      context: 'ground', metric: 'targeting.range', relation: 'less-than-template',
    }),
  }),
  Object.freeze({
    weaponId: 'vault-lance', sourceTemplateId: 'charge-shield',
    advantage: Object.freeze({
      context: 'ground',
      metric: 'effect.selfHorizontalImpulse',
      relation: 'greater-than-template',
    }),
    failureCost: Object.freeze({
      context: 'ground', metric: 'timing.recoveryTicks', relation: 'greater-than-template',
    }),
  }),
  Object.freeze({
    weaponId: 'scatter-cannon', sourceTemplateId: 'line-suppressor',
    advantage: Object.freeze({
      context: 'ground', metric: 'targeting.radius', relation: 'greater-than-template',
    }),
    failureCost: Object.freeze({
      context: 'ground', metric: 'timing.cooldownTicks', relation: 'greater-than-template',
    }),
  }),
  Object.freeze({
    weaponId: 'sky-anchor', sourceTemplateId: 'heavy-hammer',
    advantage: Object.freeze({
      context: 'aerial', metric: 'targeting.range', relation: 'greater-than-template',
    }),
    failureCost: Object.freeze({
      context: 'aerial', metric: 'timing.recoveryTicks', relation: 'greater-than-template',
    }),
  }),
  Object.freeze({
    weaponId: 'edge-scythe', sourceTemplateId: 'heavy-hammer',
    advantage: Object.freeze({
      context: 'ground',
      metric: 'targeting.minimumFacingDot',
      relation: 'less-than-template',
    }),
    failureCost: Object.freeze({
      context: 'ground', metric: 'effect.horizontalImpulse', relation: 'less-than-template',
    }),
  }),
  Object.freeze({
    weaponId: 'rebound-hook', sourceTemplateId: 'gravity-chain',
    advantage: Object.freeze({
      context: 'ground', metric: 'timing.windupTicks', relation: 'less-than-template',
    }),
    failureCost: Object.freeze({
      context: 'ground', metric: 'targeting.range', relation: 'less-than-template',
    }),
  }),
  Object.freeze({
    weaponId: 'pulse-baton', sourceTemplateId: 'line-suppressor',
    advantage: Object.freeze({
      context: 'ground', metric: 'timing.cooldownTicks', relation: 'less-than-template',
    }),
    failureCost: Object.freeze({
      context: 'ground', metric: 'targeting.range', relation: 'less-than-template',
    }),
  }),
  Object.freeze({
    weaponId: 'siege-axe', sourceTemplateId: 'heavy-hammer',
    advantage: Object.freeze({
      context: 'ground', metric: 'effect.horizontalImpulse', relation: 'greater-than-template',
    }),
    failureCost: Object.freeze({
      context: 'ground', metric: 'timing.windupTicks', relation: 'greater-than-template',
    }),
  }),
  Object.freeze({
    weaponId: 'twin-fan', sourceTemplateId: 'line-suppressor',
    advantage: Object.freeze({
      context: 'ground', metric: 'targeting.radius', relation: 'greater-than-template',
    }),
    failureCost: Object.freeze({
      context: 'ground', metric: 'targeting.range', relation: 'less-than-template',
    }),
  }),
  Object.freeze({
    weaponId: 'diving-claw', sourceTemplateId: 'flank-blade',
    advantage: Object.freeze({
      context: 'aerial', metric: 'targeting.range', relation: 'greater-than-template',
    }),
    failureCost: Object.freeze({
      context: 'ground', metric: 'targeting.range', relation: 'less-than-template',
    }),
  }),
  Object.freeze({
    weaponId: 'route-bow', sourceTemplateId: 'line-suppressor',
    advantage: Object.freeze({
      context: 'ground', metric: 'targeting.range', relation: 'greater-than-template',
    }),
    failureCost: Object.freeze({
      context: 'ground', metric: 'targeting.radius', relation: 'less-than-template',
    }),
  }),
  Object.freeze({
    weaponId: 'pivot-blade', sourceTemplateId: 'flank-blade',
    advantage: Object.freeze({
      context: 'ground', metric: 'timing.windupTicks', relation: 'less-than-template',
    }),
    failureCost: Object.freeze({
      context: 'ground', metric: 'targeting.range', relation: 'less-than-template',
    }),
  }),
  Object.freeze({
    weaponId: 'commitment-fist', sourceTemplateId: 'read-counter',
    advantage: Object.freeze({
      context: 'ground', metric: 'timing.windupTicks', relation: 'less-than-template',
    }),
    failureCost: Object.freeze({
      context: 'ground', metric: 'effect.horizontalImpulse', relation: 'less-than-template',
    }),
  }),
]);

const ACTION_METRICS: readonly ActionMetric[] = Object.freeze([
  'targeting.range',
  'targeting.radius',
  'targeting.minimumFacingDot',
  'timing.windupTicks',
  'timing.activeTicks',
  'timing.recoveryTicks',
  'timing.cooldownTicks',
  'effect.horizontalImpulse',
  'effect.verticalImpulse',
  'effect.hitstunTicks',
  'effect.selfHorizontalImpulse',
]);

function dataField(value: unknown, key: string, name: string): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通数据对象。`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是自有数据字段。`);
  }
  return descriptor.value;
}

function finiteNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name}必须是有限数。`);
  }
  return value;
}

function effectMetric(
  action: ActionDefinition,
  effectKind: string,
  parameter: string,
  name: string,
): number {
  const effects = action.effects.filter(({ kind }) => kind === effectKind);
  if (effects.length !== 1) throw new RangeError(`${name}必须精确包含一个${effectKind} effect。`);
  return finiteNumber(
    dataField(effects[0]!.parameters, parameter, `${name}.${effectKind}`),
    `${name}.${effectKind}.${parameter}`,
  );
}

function actionMetric(action: ActionDefinition, metric: ActionMetric, name: string): number {
  switch (metric) {
    case 'targeting.range':
    case 'targeting.radius':
    case 'targeting.minimumFacingDot':
      return finiteNumber(
        dataField(action.targeting.parameters, metric.slice('targeting.'.length), name),
        `${name}.${metric}`,
      );
    case 'timing.windupTicks': return action.timing.windupTicks;
    case 'timing.activeTicks': return action.timing.activeTicks;
    case 'timing.recoveryTicks': return action.timing.recoveryTicks;
    case 'timing.cooldownTicks': return action.timing.cooldownTicks;
    case 'effect.horizontalImpulse':
      return effectMetric(
        action,
        action.effects.some(({ kind }) => kind === 'pull-to-source')
          ? 'pull-to-source'
          : 'apply-directional-impulse',
        'horizontalImpulse',
        name,
      );
    case 'effect.verticalImpulse':
      return effectMetric(
        action,
        action.effects.some(({ kind }) => kind === 'pull-to-source')
          ? 'pull-to-source'
          : 'apply-directional-impulse',
        'verticalImpulse',
        name,
      );
    case 'effect.hitstunTicks':
      return effectMetric(action, 'apply-hitstun', 'ticks', name);
    case 'effect.selfHorizontalImpulse':
      return effectMetric(action, 'apply-self-impulse', 'horizontalImpulse', name);
  }
}

function actionFor(
  actions: readonly ActionDefinition[],
  context: ProbeContext,
  name: string,
): ActionDefinition {
  if (actions.length !== 2) throw new RangeError(`${name}必须精确包含ground/aerial两个Action。`);
  return actions[context === 'ground' ? 0 : 1]!;
}

function axisEvidence(
  weaponActions: readonly ActionDefinition[],
  sourceActions: readonly ActionDefinition[],
  spec: AxisSpec,
  name: string,
): ArenaExpandedWeaponCounterplayAxisEvidenceV1 {
  const weaponValue = actionMetric(
    actionFor(weaponActions, spec.context, name),
    spec.metric,
    `${name}.weapon`,
  );
  const sourceTemplateValue = actionMetric(
    actionFor(sourceActions, spec.context, name),
    spec.metric,
    `${name}.sourceTemplate`,
  );
  const relationHolds = spec.relation === 'greater-than-template'
    ? weaponValue > sourceTemplateValue
    : weaponValue < sourceTemplateValue;
  if (!relationHolds) throw new RangeError(`${name}.${spec.metric}不再满足${spec.relation}。`);
  return Object.freeze({ ...spec, weaponValue, sourceTemplateValue });
}

function optionalActionMetric(action: ActionDefinition, metric: ActionMetric): number | null {
  try {
    return actionMetric(action, metric, `${action.id}.${metric}`);
  } catch {
    return null;
  }
}

function groundAirDifferenceAxes(
  actions: readonly ActionDefinition[],
  weaponId: ArenaV2ExpandedWeaponIdCandidateV1,
): readonly ActionMetric[] {
  const ground = actionFor(actions, 'ground', weaponId);
  const aerial = actionFor(actions, 'aerial', weaponId);
  const axes = ACTION_METRICS.filter((metric) => {
    const groundValue = optionalActionMetric(ground, metric);
    const aerialValue = optionalActionMetric(aerial, metric);
    return groundValue !== null && aerialValue !== null && groundValue !== aerialValue;
  });
  if (axes.length === 0) throw new RangeError(`${weaponId}没有可审计的地面/空中数值差异。`);
  return Object.freeze(axes);
}

function assertCounterInputs(
  inputs: readonly WeaponCounterInputV1[],
  name: string,
): readonly WeaponCounterInputV1[] {
  if (inputs.length === 0 || new Set(inputs).size !== inputs.length) {
    throw new RangeError(`${name}必须是非空唯一反制输入集合。`);
  }
  if (inputs.some((input) => !ALLOWED_COUNTER_INPUTS.includes(input))) {
    throw new RangeError(`${name}只能使用direction/jump，不能增加primary或新输入。`);
  }
  return Object.freeze([...inputs]);
}

function assertIdentityClosure(
  spec: ProbeSpec,
  weapon: typeof ARENA_V2_EXPANDED_WEAPONS_CANDIDATE_V1[number],
  source: typeof ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1[number],
): void {
  if (
    weapon.id !== spec.weaponId
    || weapon.sourceTemplateId !== spec.sourceTemplateId
    || source.id !== spec.sourceTemplateId
    || weapon.status !== 'production-unreachable'
    || weapon.defaultRegistryWired !== false
    || weapon.addsInput !== false
    || weapon.actions.length !== 2
    || source.actions.length !== 2
    || weapon.grammar.equipmentDefinitionId !== weapon.equipment.id
    || weapon.grammar.contexts[0]?.actionDefinitionId !== weapon.actions[0]?.id
    || weapon.grammar.contexts[1]?.actionDefinitionId !== weapon.actions[1]?.id
    || weapon.grammar.coreVerb !== source.grammar.coreVerb
    || weapon.grammar.requiredInput !== 'primary'
    || weapon.actions.some(({ input }) => input.channel !== 'primary')
    || source.grammar.equipmentDefinitionId !== source.equipment.id
    || source.grammar.contexts[0]?.actionDefinitionId !== source.actions[0]?.id
    || source.grammar.contexts[1]?.actionDefinitionId !== source.actions[1]?.id
    || source.actions.some(({ input }) => input.channel !== 'primary')
  ) throw new RangeError(`${spec.weaponId}的weapon/template/grammar/action身份未闭合。`);
  const contentHash = createDeterministicDataHash(
    { actions: weapon.actions, equipment: weapon.equipment, grammar: weapon.grammar },
    `${spec.weaponId} counterplay content`,
  );
  if (contentHash !== weapon.contentHash) {
    throw new RangeError(`${spec.weaponId} contentHash与真实Definition漂移。`);
  }
  const sourceContentHash = createDeterministicDataHash(
    { actions: source.actions, equipment: source.equipment, grammar: source.grammar },
    `${spec.sourceTemplateId} counterplay source content`,
  );
  if (sourceContentHash !== source.contentHash) {
    throw new RangeError(`${spec.weaponId}来源模板contentHash与真实Definition漂移。`);
  }
}

function createProbe(spec: ProbeSpec): ArenaExpandedWeaponCounterplayProbeV1 {
  const weapon = ARENA_V2_EXPANDED_WEAPONS_CANDIDATE_V1.find(({ id }) => (
    id === spec.weaponId
  ));
  const source = ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1.find(({ id }) => (
    id === spec.sourceTemplateId
  ));
  if (weapon === undefined || source === undefined) {
    throw new RangeError(`${spec.weaponId}缺少扩展武器或来源模板。`);
  }
  assertIdentityClosure(spec, weapon, source);
  const groundContext = weapon.grammar.contexts[0]!;
  const aerialContext = weapon.grammar.contexts[1]!;
  if (groundContext.kind !== 'ground' || aerialContext.kind !== 'aerial') {
    throw new RangeError(`${spec.weaponId} grammar context顺序必须是ground/aerial。`);
  }
  const bundle: ArenaBaselineWeaponBundleV1 = Object.freeze({
    id: weapon.id,
    actions: weapon.actions,
    equipment: weapon.equipment,
    grammar: weapon.grammar,
    contentHash: weapon.contentHash,
  });
  const executionEvidence = Object.freeze((['ground', 'aerial'] as const).map((context) => (
    runArenaWeaponDefenderCounterfactualProbeCandidateV1(bundle, {
      context,
      mapSituation: 'edge',
      defenderInputScript: createArenaWeaponDefenderCounterplayInputScriptCandidateV1(
        bundle,
        context,
        'edge',
      ),
    })
  )));
  const distinguishesObservableOutcome = executionEvidence.some(
    ({ counterplayChangedObservableOutcome }) => counterplayChangedObservableOutcome,
  );
  const authority = Object.freeze({
    probeId: `arena.p4.expanded-counterplay.${spec.weaponId}.v1`,
    weaponId: spec.weaponId,
    sourceTemplateId: spec.sourceTemplateId,
    weaponContentHash: weapon.contentHash,
    sourceTemplateContentHash: source.contentHash,
    equipmentDefinitionId: weapon.equipment.id,
    grammarDefinitionId: weapon.grammar.id,
    groundActionDefinitionId: weapon.actions[0]!.id,
    aerialActionDefinitionId: weapon.actions[1]!.id,
    coreVerb: weapon.grammar.coreVerb,
    advantage: axisEvidence(weapon.actions, source.actions, spec.advantage, spec.weaponId),
    failureCost: Object.freeze({
      ...axisEvidence(weapon.actions, source.actions, spec.failureCost, spec.weaponId),
      declaredFailureRisk: weapon.grammar.contexts[
        spec.failureCost.context === 'ground' ? 0 : 1
      ]!.failureRisk,
    }),
    groundCounterInputs: assertCounterInputs(
      groundContext.counterInputs,
      `${spec.weaponId}.groundCounterInputs`,
    ),
    aerialCounterInputs: assertCounterInputs(
      aerialContext.counterInputs,
      `${spec.weaponId}.aerialCounterInputs`,
    ),
    groundAirDifferenceAxes: groundAirDifferenceAxes(weapon.actions, spec.weaponId),
    groundIntendedResult: groundContext.intendedResult,
    aerialIntendedResult: aerialContext.intendedResult,
    groundFailureRisk: groundContext.failureRisk,
    aerialFailureRisk: aerialContext.failureRisk,
    sharedExecutorCoverage: 'real-rule-movement-physics-counterfactual-candidate' as const,
    counterplayExecutionStatus: distinguishesObservableOutcome
      ? 'executed-counterfactual-candidate-unverified' as const
      : 'executed-counterfactual-no-observable-outcome-difference-unverified' as const,
    dynamicClosureGap: distinguishesObservableOutcome ? null : NO_DISTINGUISHING_OUTCOME_REASON,
    executionEvidence,
  });
  return Object.freeze({
    ...authority,
    probeIdentityHash: createDeterministicDataHash(
      authority,
      `${spec.weaponId} counterplay probe identity`,
    ),
  });
}

function createExpectedPlan(): Readonly<ArenaExpandedWeaponCounterplayVerificationPlanV1> {
  if (
    PROBE_SPECS.length !== 14
    || ARENA_V2_EXPANDED_WEAPON_IDS_CANDIDATE_V1.length !== 14
    || ARENA_V2_EXPANDED_WEAPONS_CANDIDATE_V1.length !== 14
  ) throw new RangeError('Arena扩展武器counterplay必须精确覆盖14把。');
  for (let index = 0; index < PROBE_SPECS.length; index += 1) {
    if (
      PROBE_SPECS[index]!.weaponId !== ARENA_V2_EXPANDED_WEAPON_IDS_CANDIDATE_V1[index]
      || ARENA_V2_EXPANDED_WEAPONS_CANDIDATE_V1[index]?.id
        !== ARENA_V2_EXPANDED_WEAPON_IDS_CANDIDATE_V1[index]
    ) throw new RangeError('Arena扩展武器counterplay目录顺序漂移。');
  }
  const probes = Object.freeze(PROBE_SPECS.map(createProbe));
  const identitySets = [
    probes.map(({ probeId }) => probeId),
    probes.map(({ weaponId }) => weaponId),
    probes.map(({ probeIdentityHash }) => probeIdentityHash),
  ];
  if (identitySets.some((identities) => new Set(identities).size !== 14)) {
    throw new RangeError('Arena扩展武器counterplay probe身份必须逐把唯一。');
  }
  const authority = Object.freeze({
    schemaVersion: ARENA_EXPANDED_WEAPON_COUNTERPLAY_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_EXPANDED_WEAPON_COUNTERPLAY_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    defaultRegistryWired: false as const,
    weaponCount: 14 as const,
    probeOrder: ARENA_V2_EXPANDED_WEAPON_IDS_CANDIDATE_V1,
    allowedCounterInputs: ALLOWED_COUNTER_INPUTS,
    probes,
  });
  return cloneFrozenData({
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena Expanded Weapon Counterplay Verification V1',
    ),
  }, 'Arena Expanded Weapon Counterplay Verification V1 expected plan') as Readonly<
    ArenaExpandedWeaponCounterplayVerificationPlanV1
  >;
}

function assertExactDataEqual(left: unknown, right: unknown, path: string): void {
  if (Object.is(left, right)) return;
  if (
    typeof left !== 'object' || left === null
    || typeof right !== 'object' || right === null
  ) throw new RangeError(`${path}身份漂移。`);
  const leftKeys = Reflect.ownKeys(left);
  const rightKeys = Reflect.ownKeys(right);
  if (
    leftKeys.some((key) => typeof key === 'symbol')
    || rightKeys.some((key) => typeof key === 'symbol')
    || leftKeys.length !== rightKeys.length
  ) throw new RangeError(`${path} exact-key漂移。`);
  for (let index = 0; index < leftKeys.length; index += 1) {
    const leftKey = leftKeys[index]!;
    const rightKey = rightKeys[index]!;
    if (leftKey !== rightKey) throw new RangeError(`${path}字段或目录顺序漂移。`);
    const leftDescriptor = Object.getOwnPropertyDescriptor(left, leftKey);
    const rightDescriptor = Object.getOwnPropertyDescriptor(right, rightKey);
    if (
      leftDescriptor === undefined || rightDescriptor === undefined
      || !Object.hasOwn(leftDescriptor, 'value')
      || !Object.hasOwn(rightDescriptor, 'value')
    ) throw new TypeError(`${path}.${String(leftKey)}必须是数据字段。`);
    assertExactDataEqual(
      leftDescriptor.value,
      rightDescriptor.value,
      `${path}.${String(leftKey)}`,
    );
  }
}

const EXPECTED_PLAN = createExpectedPlan();

export const ARENA_EXPANDED_WEAPON_COUNTERPLAY_VERIFICATION_PLAN_CANDIDATE_V1 = EXPECTED_PLAN;

export function validateArenaExpandedWeaponCounterplayVerificationPlanV1(
  value: unknown,
): DeepReadonly<ArenaExpandedWeaponCounterplayVerificationPlanV1> {
  const source = cloneFrozenData(value, 'Arena Expanded Weapon Counterplay Verification V1');
  assertKnownKeys(source, PLAN_KEYS, 'Arena Expanded Weapon Counterplay Verification V1');
  for (const key of PLAN_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena Expanded Weapon Counterplay Verification V1缺少${key}。`);
    }
  }
  assertExactDataEqual(
    source,
    EXPECTED_PLAN,
    'Arena Expanded Weapon Counterplay Verification V1',
  );
  return source as DeepReadonly<ArenaExpandedWeaponCounterplayVerificationPlanV1>;
}

export function createArenaExpandedWeaponCounterplayVerificationPlanV1():
DeepReadonly<ArenaExpandedWeaponCounterplayVerificationPlanV1> {
  return validateArenaExpandedWeaponCounterplayVerificationPlanV1(EXPECTED_PLAN);
}
