import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  WEAPON_COMBAT_GRAMMAR_DEFINITION_V1_SCHEMA_VERSION,
  createActionDefinition,
  createEquipmentDefinition,
  createWeaponCombatGrammarDefinitionV1,
  type ActionDefinition,
  type EquipmentDefinition,
  type WeaponCombatGrammarDefinitionV1,
  type WeaponFailureRiskV1,
} from '@number-strategy-jump/arena-definitions';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  validateWeaponCandidateBundleV1,
} from './arena-v2-baseline-weapon-candidate-support-v1.js';
import {
  ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1,
  type ArenaV2LaunchWeaponIdCandidateV1,
} from './arena-v2-launch-weapon-catalog-candidate-v1.js';

export const ARENA_V2_EXPANDED_WEAPON_IDS_CANDIDATE_V1 = Object.freeze([
  'hook-spear',
  'burst-gauntlet',
  'vault-lance',
  'scatter-cannon',
  'sky-anchor',
  'edge-scythe',
  'rebound-hook',
  'pulse-baton',
  'siege-axe',
  'twin-fan',
  'diving-claw',
  'route-bow',
  'pivot-blade',
  'commitment-fist',
] as const);

export type ArenaV2ExpandedWeaponIdCandidateV1 =
  typeof ARENA_V2_EXPANDED_WEAPON_IDS_CANDIDATE_V1[number];

export interface ArenaV2ExpandedWeaponCandidateV1 {
  readonly id: ArenaV2ExpandedWeaponIdCandidateV1;
  readonly collectionOrder: number;
  readonly learningProblem: string;
  readonly sourceTemplateId: ArenaV2LaunchWeaponIdCandidateV1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultRegistryWired: false;
  readonly addsInput: false;
  readonly actions: readonly ActionDefinition[];
  readonly equipment: EquipmentDefinition;
  readonly grammar: WeaponCombatGrammarDefinitionV1;
  readonly contentHash: string;
}

interface ActionTransform {
  readonly rangeMultiplier: number;
  readonly coverageMultiplier: number;
  readonly facingDotDelta: number;
  readonly windupMultiplier: number;
  readonly activeMultiplier: number;
  readonly recoveryMultiplier: number;
  readonly cooldownMultiplier: number;
  readonly horizontalImpulseMultiplier: number;
  readonly verticalImpulseMultiplier: number;
  readonly hitstunMultiplier: number;
  readonly selfImpulseMultiplier: number;
}

interface WeaponSpec {
  readonly id: ArenaV2ExpandedWeaponIdCandidateV1;
  readonly learningProblem: string;
  readonly sourceTemplateId: ArenaV2LaunchWeaponIdCandidateV1;
  readonly groundIntendedResult: string;
  readonly aerialIntendedResult: string;
  readonly groundFailureRisk: WeaponFailureRiskV1;
  readonly aerialFailureRisk: WeaponFailureRiskV1;
  readonly ground: ActionTransform;
  readonly aerial: ActionTransform;
}

const transform = (
  rangeMultiplier: number,
  coverageMultiplier: number,
  facingDotDelta: number,
  windupMultiplier: number,
  activeMultiplier: number,
  recoveryMultiplier: number,
  cooldownMultiplier: number,
  horizontalImpulseMultiplier: number,
  verticalImpulseMultiplier: number,
  hitstunMultiplier: number,
  selfImpulseMultiplier = 1,
): ActionTransform => Object.freeze({
  rangeMultiplier,
  coverageMultiplier,
  facingDotDelta,
  windupMultiplier,
  activeMultiplier,
  recoveryMultiplier,
  cooldownMultiplier,
  horizontalImpulseMultiplier,
  verticalImpulseMultiplier,
  hitstunMultiplier,
  selfImpulseMultiplier,
});

const SPECS: readonly WeaponSpec[] = Object.freeze([
  {
    id: 'hook-spear', learningProblem: 'long-thin-pull-versus-side-step',
    sourceTemplateId: 'gravity-chain',
    groundIntendedResult: 'long-thin-pull-from-route-edge',
    aerialIntendedResult: 'diagonal-pull-across-height-change',
    groundFailureRisk: 'aim-commitment', aerialFailureRisk: 'landing-commitment',
    ground: transform(1.18, 0.72, 0.08, 1.12, 0.8, 1.05, 1.08, 0.85, 0.9, 0.9),
    aerial: transform(1.08, 0.7, 0.08, 1.05, 0.85, 1.1, 1.08, 0.9, 1.05, 0.9),
  },
  {
    id: 'burst-gauntlet', learningProblem: 'short-fast-push-versus-range',
    sourceTemplateId: 'heavy-hammer',
    groundIntendedResult: 'fast-short-push-before-opponent-sets-feet',
    aerialIntendedResult: 'quick-small-landing-burst',
    groundFailureRisk: 'narrow-coverage', aerialFailureRisk: 'landing-commitment',
    ground: transform(0.72, 1.05, -0.12, 0.38, 0.7, 0.5, 0.42, 0.45, 0.65, 0.55),
    aerial: transform(0.68, 0.72, 0, 0.45, 0.6, 0.48, 0.42, 0.42, 0.62, 0.52),
  },
  {
    id: 'vault-lance', learningProblem: 'self-launch-spacing-versus-overshoot',
    sourceTemplateId: 'charge-shield',
    groundIntendedResult: 'cross-one-platform-entry-and-push',
    aerialIntendedResult: 'commit-to-longer-downward-route-entry',
    groundFailureRisk: 'self-overshoot', aerialFailureRisk: 'landing-commitment',
    ground: transform(1.22, 0.72, 0, 1.05, 0.8, 1.2, 1.15, 0.8, 0.9, 0.85, 1.18),
    aerial: transform(1.15, 0.78, 0, 1.1, 0.85, 1.18, 1.15, 0.85, 1.08, 0.9),
  },
  {
    id: 'scatter-cannon', learningProblem: 'wide-midline-pressure-versus-cooldown',
    sourceTemplateId: 'line-suppressor',
    groundIntendedResult: 'cover-wide-midrange-route-for-one-beat',
    aerialIntendedResult: 'sweep-wide-air-entry-with-low-impact',
    groundFailureRisk: 'long-recovery', aerialFailureRisk: 'position-dependent',
    ground: transform(0.58, 2.2, -0.2, 1.35, 1.7, 1.45, 2.1, 1.2, 1.15, 1.2),
    aerial: transform(0.62, 2, -0.15, 1.3, 1.6, 1.4, 2, 1.1, 1.2, 1.15),
  },
  {
    id: 'sky-anchor', learningProblem: 'vertical-stop-versus-ground-exposure',
    sourceTemplateId: 'heavy-hammer',
    groundIntendedResult: 'hold-space-below-a-height-transition',
    aerialIntendedResult: 'strong-vertical-drop-with-limited-horizontal-push',
    groundFailureRisk: 'long-recovery', aerialFailureRisk: 'landing-commitment',
    ground: transform(0.88, 0.9, 0.06, 0.78, 1.05, 0.82, 0.9, 0.62, 1.35, 1.05),
    aerial: transform(1.22, 1.12, 0, 1.05, 1.25, 1.3, 1.12, 0.55, 1.48, 1.2),
  },
  {
    id: 'edge-scythe', learningProblem: 'wide-edge-sweep-versus-center-space',
    sourceTemplateId: 'heavy-hammer',
    groundIntendedResult: 'sweep-one-edge-with-medium-force',
    aerialIntendedResult: 'cover-an-edge-landing-arc',
    groundFailureRisk: 'position-dependent', aerialFailureRisk: 'landing-commitment',
    ground: transform(1.08, 1.2, -0.2, 0.72, 1.35, 0.78, 0.82, 0.72, 0.9, 0.8),
    aerial: transform(1.06, 1.28, 0, 0.7, 1.3, 0.8, 0.82, 0.7, 0.92, 0.82),
  },
  {
    id: 'rebound-hook', learningProblem: 'close-pull-turnaround-versus-whiff',
    sourceTemplateId: 'gravity-chain',
    groundIntendedResult: 'quick-close-pull-to-reverse-relative-order',
    aerialIntendedResult: 'pull-one-target-under-the-user',
    groundFailureRisk: 'aim-commitment', aerialFailureRisk: 'position-dependent',
    ground: transform(0.62, 1.28, -0.16, 0.62, 1.2, 0.62, 0.58, 0.72, 0.82, 0.7),
    aerial: transform(0.72, 1.15, 0, 0.7, 1.15, 0.68, 0.62, 0.78, 0.88, 0.76),
  },
  {
    id: 'pulse-baton', learningProblem: 'repeat-interrupt-versus-low-displacement',
    sourceTemplateId: 'line-suppressor',
    groundIntendedResult: 'repeat-short-interrupt-on-narrow-entry',
    aerialIntendedResult: 'tap-air-route-without-owning-the-whole-line',
    groundFailureRisk: 'narrow-coverage', aerialFailureRisk: 'narrow-coverage',
    ground: transform(0.34, 1.35, -0.12, 0.5, 0.72, 0.52, 0.38, 0.62, 0.72, 0.68),
    aerial: transform(0.38, 1.25, -0.08, 0.52, 0.75, 0.55, 0.4, 0.58, 0.78, 0.7),
  },
  {
    id: 'siege-axe', learningProblem: 'maximum-push-versus-visible-commitment',
    sourceTemplateId: 'heavy-hammer',
    groundIntendedResult: 'maximum-ground-push-after-visible-windup',
    aerialIntendedResult: 'large-landing-threat-with-long-recovery',
    groundFailureRisk: 'long-recovery', aerialFailureRisk: 'landing-commitment',
    ground: transform(1.18, 1.16, -0.05, 1.45, 1.15, 1.42, 1.5, 1.35, 1.28, 1.25),
    aerial: transform(1.2, 1.22, 0, 1.4, 1.18, 1.45, 1.5, 1.32, 1.35, 1.28),
  },
  {
    id: 'twin-fan', learningProblem: 'broad-soft-coverage-versus-weak-finish',
    sourceTemplateId: 'line-suppressor',
    groundIntendedResult: 'broad-soft-pressure-across-two-route-angles',
    aerialIntendedResult: 'hold-a-wide-air-corridor-briefly',
    groundFailureRisk: 'long-recovery', aerialFailureRisk: 'position-dependent',
    ground: transform(0.48, 2.65, -0.25, 0.9, 2.1, 1.35, 1.45, 0.68, 0.82, 0.82),
    aerial: transform(0.52, 2.4, -0.2, 0.88, 2, 1.32, 1.42, 0.65, 0.88, 0.84),
  },
  {
    id: 'diving-claw', learningProblem: 'air-first-flank-versus-ground-range',
    sourceTemplateId: 'flank-blade',
    groundIntendedResult: 'small-ground-flank-to-set-up-jump',
    aerialIntendedResult: 'strong-air-flank-across-a-height-change',
    groundFailureRisk: 'position-dependent', aerialFailureRisk: 'landing-commitment',
    ground: transform(0.72, 0.9, 0.08, 0.72, 0.8, 0.7, 0.75, 0.65, 0.78, 0.72),
    aerial: transform(1.28, 1.2, -0.12, 0.85, 1.25, 1.18, 1.2, 1.3, 1.25, 1.18),
  },
  {
    id: 'route-bow', learningProblem: 'maximum-line-range-versus-thin-coverage',
    sourceTemplateId: 'line-suppressor',
    groundIntendedResult: 'contest-the-longest-visible-straight-route',
    aerialIntendedResult: 'contest-a-thin-air-line-before-landing',
    groundFailureRisk: 'narrow-coverage', aerialFailureRisk: 'narrow-coverage',
    ground: transform(1.42, 0.55, 0.12, 1.28, 0.68, 1.25, 1.62, 1.12, 1.05, 1.08),
    aerial: transform(1.35, 0.58, 0.1, 1.22, 0.7, 1.22, 1.55, 1.08, 1.08, 1.06),
  },
  {
    id: 'pivot-blade', learningProblem: 'fast-rear-pivot-versus-facing-read',
    sourceTemplateId: 'flank-blade',
    groundIntendedResult: 'fast-rear-pivot-at-platform-entry',
    aerialIntendedResult: 'short-rear-cut-while-crossing-height',
    groundFailureRisk: 'position-dependent', aerialFailureRisk: 'position-dependent',
    ground: transform(0.82, 1.25, -0.18, 0.62, 0.8, 0.58, 0.65, 0.78, 0.85, 0.75),
    aerial: transform(0.88, 1.22, -0.15, 0.65, 0.82, 0.62, 0.68, 0.8, 0.9, 0.78),
  },
  {
    id: 'commitment-fist', learningProblem: 'short-hold-punish-versus-early-exit',
    sourceTemplateId: 'read-counter',
    groundIntendedResult: 'shorter-commitment-punish-with-lower-force',
    aerialIntendedResult: 'hold-one-air-route-and-release-before-landing',
    groundFailureRisk: 'hold-commitment', aerialFailureRisk: 'hold-commitment',
    ground: transform(0.88, 1.08, -0.08, 0.72, 1.05, 0.7, 0.72, 0.78, 0.82, 0.8),
    aerial: transform(0.92, 1.06, -0.06, 0.75, 1.05, 0.72, 0.75, 0.8, 0.86, 0.82),
  },
]);

function finite(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name}必须是有限数。`);
  }
  return value;
}

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function scaledTick(value: number, multiplier: number, minimum: number): number {
  return Math.max(minimum, Math.round(value * multiplier));
}

function transformedAction(
  source: ActionDefinition,
  weaponId: ArenaV2ExpandedWeaponIdCandidateV1,
  context: 'ground' | 'aerial',
  value: ActionTransform,
): ActionDefinition {
  const actionId = `arena-v2.action.${weaponId}.${context}.candidate.v1`;
  const windupTicks = Math.max(
    scaledTick(source.timing.windupTicks, value.windupMultiplier, 0),
    source.commitment === undefined ? 0 : source.commitment.expireTicks + 1,
  );
  const targeting = { ...(source.targeting.parameters as Readonly<Record<string, unknown>>) };
  for (const key of ['range', 'maximumVerticalDifference'] as const) {
    if (Object.hasOwn(targeting, key)) {
      targeting[key] = rounded(finite(targeting[key], `${actionId}.${key}`) * value.rangeMultiplier);
    }
  }
  if (Object.hasOwn(targeting, 'radius')) {
    targeting.radius = rounded(
      finite(targeting.radius, `${actionId}.radius`) * value.coverageMultiplier,
    );
  }
  if (Object.hasOwn(targeting, 'minimumFacingDot')) {
    targeting.minimumFacingDot = rounded(Math.max(-1, Math.min(
      1,
      finite(targeting.minimumFacingDot, `${actionId}.minimumFacingDot`)
        + value.facingDotDelta,
    )));
  }
  const effects = source.effects.map((effect, index) => {
    const parameters = { ...(effect.parameters as Readonly<Record<string, unknown>>) };
    if ((effect.kind === 'apply-directional-impulse' || effect.kind === 'pull-to-source')
      && Object.hasOwn(parameters, 'horizontalImpulse')) {
      parameters.horizontalImpulse = rounded(
        finite(parameters.horizontalImpulse, `${actionId}.horizontalImpulse`)
          * value.horizontalImpulseMultiplier,
      );
      parameters.verticalImpulse = rounded(
        finite(parameters.verticalImpulse, `${actionId}.verticalImpulse`)
          * value.verticalImpulseMultiplier,
      );
    }
    if (effect.kind === 'apply-hitstun' && Object.hasOwn(parameters, 'ticks')) {
      parameters.ticks = scaledTick(
        finite(parameters.ticks, `${actionId}.hitstunTicks`),
        value.hitstunMultiplier,
        1,
      );
    }
    if (effect.kind === 'apply-self-impulse' && Object.hasOwn(parameters, 'horizontalImpulse')) {
      parameters.horizontalImpulse = rounded(
        finite(parameters.horizontalImpulse, `${actionId}.selfHorizontalImpulse`)
          * value.selfImpulseMultiplier,
      );
    }
    return Object.freeze({
      id: `${actionId}.effect-${index}-${effect.kind}`,
      kind: effect.kind,
      trigger: effect.trigger,
      parameters: Object.freeze(parameters),
    });
  });
  return createActionDefinition({
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id: actionId,
    kind: source.kind,
    input: source.input,
    lane: source.lane,
    conflictTags: source.conflictTags,
    timing: {
      windupTicks,
      activeTicks: scaledTick(source.timing.activeTicks, value.activeMultiplier, 1),
      recoveryTicks: scaledTick(source.timing.recoveryTicks, value.recoveryMultiplier, 0),
      cooldownTicks: scaledTick(source.timing.cooldownTicks, value.cooldownMultiplier, 0),
    },
    ...(source.commitment === undefined ? {} : { commitment: source.commitment }),
    targeting: { kind: source.targeting.kind, parameters: Object.freeze(targeting) },
    effects,
    tags: Object.freeze(['arena-v2', 'collection-weapon', weaponId, context]),
  });
}

function createCandidate(spec: WeaponSpec, index: number): ArenaV2ExpandedWeaponCandidateV1 {
  const template = ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1.find(({ id }) => (
    id === spec.sourceTemplateId
  ));
  if (!template) throw new RangeError(`扩展武器${spec.id}缺少模板${spec.sourceTemplateId}。`);
  const actions = Object.freeze([
    transformedAction(template.actions[0]!, spec.id, 'ground', spec.ground),
    transformedAction(template.actions[1]!, spec.id, 'aerial', spec.aerial),
  ]);
  const equipment = createEquipmentDefinition({
    schemaVersion: EQUIPMENT_DEFINITION_SCHEMA_VERSION,
    id: `arena-v2.weapon.${spec.id}.candidate.v1`,
    category: `collection-${template.grammar.coreVerb}`,
    slot: 'primary',
    actionDefinitionId: actions[0]!.id,
    aerialActionDefinitionId: actions[1]!.id,
    pickup: template.equipment.pickup,
    drop: template.equipment.drop,
    presentationSemantic: spec.id,
    tags: ['arena-v2', 'collection-weapon', spec.id, template.grammar.coreVerb],
  });
  const grammar = createWeaponCombatGrammarDefinitionV1({
    schemaVersion: WEAPON_COMBAT_GRAMMAR_DEFINITION_V1_SCHEMA_VERSION,
    id: `arena-v2.weapon-grammar.${spec.id}.candidate.v1`,
    equipmentDefinitionId: equipment.id,
    coreVerb: template.grammar.coreVerb,
    requiredInput: 'primary',
    contexts: template.grammar.contexts.map((context, contextIndex) => ({
      ...context,
      actionDefinitionId: actions[contextIndex]!.id,
      intendedResult: contextIndex === 0
        ? spec.groundIntendedResult
        : spec.aerialIntendedResult,
      failureRisk: contextIndex === 0 ? spec.groundFailureRisk : spec.aerialFailureRisk,
    })),
    modeConsequences: template.grammar.modeConsequences.map((consequence) => ({
      ...consequence,
      intendedOutcomes: [
        `${spec.id}-${consequence.modeKind}-learning-opportunity`,
        `${spec.id}-${consequence.modeKind}-failure-remains-readable`,
      ],
    })),
    survivalGrowth: template.grammar.survivalGrowth,
    tags: ['arena-v2', 'collection-weapon', spec.id, spec.learningProblem],
  });
  const contentHash = validateWeaponCandidateBundleV1({ actions, equipment, grammar });
  return Object.freeze({
    id: spec.id,
    collectionOrder: index + 7,
    learningProblem: spec.learningProblem,
    sourceTemplateId: spec.sourceTemplateId,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultRegistryWired: false as const,
    addsInput: false as const,
    actions,
    equipment,
    grammar,
    contentHash,
  });
}

export const ARENA_V2_EXPANDED_WEAPONS_CANDIDATE_V1 = Object.freeze(
  SPECS.map(createCandidate),
);

const AUTHORITY = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  requiredInputChannels: Object.freeze(['direction', 'jump', 'primary'] as const),
  weaponCount: 14 as const,
  weapons: ARENA_V2_EXPANDED_WEAPONS_CANDIDATE_V1,
});

export const ARENA_V2_EXPANDED_WEAPON_CATALOG_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  contentHash: createDeterministicDataHash(
    AUTHORITY,
    'Arena V2 Expanded Weapon Catalog Candidate V1',
  ),
});
