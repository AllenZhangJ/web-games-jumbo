import {
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND,
  assertKnownKeys,
  createDeterministicDataHash,
  cloneFrozenData,
  type ArenaWeaponFeedbackSemanticKindV1,
} from '@number-strategy-jump/arena-contracts';
import {
  WEAPON_ACTION_CONTEXT_V1,
  WEAPON_CORE_VERB_V1,
  WEAPON_MODE_KIND_V1,
  type WeaponActionContextKindV1,
  type WeaponCoreVerbV1,
  type WeaponFailureRiskV1,
  type WeaponCounterInputV1,
  type WeaponMapSituationV1,
  type WeaponModeKindV1,
} from '@number-strategy-jump/arena-definitions';
import {
  projectArenaWeaponFeedbackEventV6PresentationEvent,
  type ArenaV2WeaponFeedbackAudioCue,
  type ArenaV2WeaponFeedbackPresentationEvent,
  type ArenaV2WeaponFeedbackVisualCue,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_BASELINE_WEAPON_RUNTIME_VARIANTS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';

export const ARENA_V2_TWENTY_WEAPON_FEEDBACK_READ_PLAN_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

type CollectionWeapon = typeof ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1[number];
type CollectionWeaponId = CollectionWeapon['id'];

export interface ArenaV2WeaponFeedbackVerbReadProfileCandidateV1 {
  readonly coreVerb: WeaponCoreVerbV1;
  readonly familyShape: string;
  readonly directionLanguage: string;
  readonly motionLanguage: string;
  readonly sharedAudioBody: string;
}

export interface ArenaV2WeaponFeedbackSignatureCandidateV1 {
  readonly weaponId: CollectionWeaponId;
  readonly contactAccent: string;
  readonly tailGesture: string;
  readonly audioIdentity: string;
  readonly silhouetteReminder: string;
}

export interface ArenaV2WeaponFeedbackActionReadBindingCandidateV1 {
  readonly weaponId: CollectionWeaponId;
  readonly collectionOrder: number;
  readonly equipmentDefinitionId: string;
  readonly actionDefinitionId: string;
  readonly collectionActionDefinitionId: string;
  readonly actionIdentityKind: 'collection' | 'survival-tier';
  readonly survivalLevel: number | null;
  readonly actionContext: WeaponActionContextKindV1;
  readonly coreVerb: WeaponCoreVerbV1;
  readonly learningProblem: string;
  readonly intendedResult: string;
  readonly failureRisk: WeaponFailureRiskV1;
  readonly mapSituations: readonly WeaponMapSituationV1[];
  readonly identityCueId: string;
}

export interface ArenaV2WeaponFeedbackModeConsequenceReadCandidateV1 {
  readonly modeKind: WeaponModeKindV1;
  readonly mapSituations: readonly WeaponMapSituationV1[];
  readonly intendedOutcomes: readonly string[];
}

export interface ArenaV2TwentyWeaponFeedbackReadPlanProjectionCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly sourceEventId: string;
  readonly tick: number;
  readonly sequence: number;
  readonly modeKind: WeaponModeKindV1;
  readonly feedbackKind: ArenaWeaponFeedbackSemanticKindV1;
  readonly weaponSpecific: boolean;
  readonly weaponId: CollectionWeaponId | null;
  readonly equipmentDefinitionId: string | null;
  readonly sourceActionDefinitionId: string | null;
  readonly collectionActionDefinitionId: string | null;
  readonly actionIdentityKind: 'collection' | 'survival-tier' | null;
  readonly survivalLevel: number | null;
  readonly actionContext: WeaponActionContextKindV1 | null;
  readonly coreVerb: WeaponCoreVerbV1 | null;
  readonly learningRead: Readonly<{
    readonly learningProblem: string | null;
    readonly intendedResult: string | null;
    readonly failureRisk: WeaponFailureRiskV1 | null;
    readonly counterInputs: readonly WeaponCounterInputV1[];
    readonly identityCueId: string;
    readonly silhouetteReminder: string | null;
  }>;
  readonly authorityPresentation: ArenaV2WeaponFeedbackPresentationEvent;
  readonly modeRead: Readonly<{
    readonly focus: string;
    readonly consequence: ArenaV2WeaponFeedbackModeConsequenceReadCandidateV1 | null;
  }>;
  readonly vfx: Readonly<{
    readonly cueId: string;
    readonly baseVisualCue: ArenaV2WeaponFeedbackVisualCue;
    readonly authoritySource: 'WeaponFeedbackResolved';
    readonly familyShape: string;
    readonly semanticShape: string;
    readonly contactAccent: string;
    readonly directionLanguage: string;
    readonly motionLanguage: string;
    readonly tailGesture: string;
    readonly timingLanguage: string;
    readonly valueContrastPolicy: 'bright-core-dark-edge';
    readonly coreHex: '#FFF4B8';
    readonly warningHex: '#FFB020';
    readonly activeHex: '#FF5C5C';
    readonly darkEdgeHex: '#273451';
    readonly colorIsNeverSoleSignal: true;
    readonly essentialLayers: readonly ['core', 'direction', 'result'];
    readonly optionalLayers: readonly ['decoration'];
    readonly qualityPolicy: Readonly<{
      readonly low: 'static-core-direction-result-no-decoration';
      readonly medium: 'core-direction-result-no-decoration';
      readonly high: 'core-direction-result-plus-bounded-decoration';
      readonly off: 'static-causal-glyph-and-text';
    }>;
    readonly maximumParticlesPerEffect: 96;
    readonly maximumAverageOverdraw: 2;
    readonly distortionAllowed: false;
    readonly boundedLifetimeRequired: true;
    readonly pooledOwnershipRequired: true;
  }>;
  readonly audio: Readonly<{
    readonly cueId: string;
    readonly baseAudioCue: ArenaV2WeaponFeedbackAudioCue;
    readonly bus: 'SFX';
    readonly semanticBody: string;
    readonly weaponIdentity: string;
    readonly oneShot: true;
    readonly dedupeIdentity: string;
    readonly maximumConcurrentVoices: 8;
    readonly overflowPolicy: 'drop-lowest-priority';
    readonly deterministicVariationSource: 'sourceEventId';
    readonly syntheticFallbackAllowed: false;
  }>;
  readonly accessibility: Readonly<{
    readonly reducedMotionFallback: string;
    readonly mutedFallback: string;
    readonly lowQualityKeepsCausalRead: true;
    readonly colorIndependent: true;
  }>;
  readonly governance: Readonly<{
    readonly ownsRuleOrMatchAuthority: false;
    readonly infersHitFromPosition: false;
    readonly infersFallCauseFromAnimation: false;
    readonly writesAuthorityState: false;
    readonly formalVfxAssetApproved: false;
    readonly formalAudioAssetApproved: false;
  }>;
}

interface FeedbackSemanticProfile {
  readonly feedbackKind: ArenaWeaponFeedbackSemanticKindV1;
  readonly baseVisualCue: ArenaV2WeaponFeedbackVisualCue;
  readonly baseAudioCue: ArenaV2WeaponFeedbackAudioCue;
  readonly semanticShape: string;
  readonly timingLanguage: string;
  readonly audioBody: string;
  readonly reducedMotionFallback: string;
}

interface ModeReadProfile {
  readonly modeKind: WeaponModeKindV1;
  readonly focus: string;
}

const INPUT_KEYS = new Set(['schemaVersion', 'modeKind', 'event']);
const MODE_KINDS = new Set<unknown>(Object.values(WEAPON_MODE_KIND_V1));

export const ARENA_V2_WEAPON_FEEDBACK_VERB_READ_PROFILES_CANDIDATE_V1 = Object.freeze({
  [WEAPON_CORE_VERB_V1.PUSH]: Object.freeze({
    coreVerb: WEAPON_CORE_VERB_V1.PUSH,
    familyShape: 'solid-outward-wedge',
    directionLanguage: 'away-from-attacker',
    motionLanguage: 'weight-release',
    sharedAudioBody: 'low-mid-impact-body',
  }),
  [WEAPON_CORE_VERB_V1.PULL]: Object.freeze({
    coreVerb: WEAPON_CORE_VERB_V1.PULL,
    familyShape: 'tension-line-with-endpoint',
    directionLanguage: 'toward-attacker',
    motionLanguage: 'tension-and-return',
    sharedAudioBody: 'metal-tension-return-body',
  }),
  [WEAPON_CORE_VERB_V1.CHARGE]: Object.freeze({
    coreVerb: WEAPON_CORE_VERB_V1.CHARGE,
    familyShape: 'broad-leading-arc-wedge',
    directionLanguage: 'attacker-forward',
    motionLanguage: 'mass-forward-compression',
    sharedAudioBody: 'mid-low-ram-body',
  }),
  [WEAPON_CORE_VERB_V1.SUPPRESS]: Object.freeze({
    coreVerb: WEAPON_CORE_VERB_V1.SUPPRESS,
    familyShape: 'thin-lane-line-with-ticks',
    directionLanguage: 'along-action-lane',
    motionLanguage: 'lane-hold-and-release',
    sharedAudioBody: 'tight-transient-line-body',
  }),
  [WEAPON_CORE_VERB_V1.COUNTER]: Object.freeze({
    coreVerb: WEAPON_CORE_VERB_V1.COUNTER,
    familyShape: 'compact-rebound-diamond',
    directionLanguage: 'incoming-then-return',
    motionLanguage: 'hold-catch-release',
    sharedAudioBody: 'dry-catch-rebound-body',
  }),
  [WEAPON_CORE_VERB_V1.FLANK]: Object.freeze({
    coreVerb: WEAPON_CORE_VERB_V1.FLANK,
    familyShape: 'asymmetric-rear-arc',
    directionLanguage: 'rear-to-open-side',
    motionLanguage: 'off-axis-cut',
    sharedAudioBody: 'short-edge-swipe-body',
  }),
} satisfies Readonly<Record<WeaponCoreVerbV1, ArenaV2WeaponFeedbackVerbReadProfileCandidateV1>>);

const WEAPON_SIGNATURES = Object.freeze({
  'charge-shield': Object.freeze({ contactAccent: 'broad-front-face', tailGesture: 'forward-compression', audioIdentity: 'shield-face-ram', silhouetteReminder: 'wide-round-front' }),
  'heavy-hammer': Object.freeze({ contactAccent: 'square-heavy-head', tailGesture: 'downward-weight-settle', audioIdentity: 'hard-low-hammer', silhouetteReminder: 'large-head-short-neck' }),
  'gravity-chain': Object.freeze({ contactAccent: 'hooked-tether-endpoint', tailGesture: 'inward-line-recoil', audioIdentity: 'chain-tension-return', silhouetteReminder: 'line-hook-and-weight' }),
  'line-suppressor': Object.freeze({ contactAccent: 'needle-line-pulse', tailGesture: 'straight-lane-fade', audioIdentity: 'tight-line-crack', silhouetteReminder: 'long-thin-forward-line' }),
  'read-counter': Object.freeze({ contactAccent: 'catch-diamond-notch', tailGesture: 'reverse-snap', audioIdentity: 'dry-catch-click', silhouetteReminder: 'compact-held-center' }),
  'flank-blade': Object.freeze({ contactAccent: 'rear-crescent-cut', tailGesture: 'asymmetric-side-fade', audioIdentity: 'short-blade-swipe', silhouetteReminder: 'rear-offset-blade' }),
  'hook-spear': Object.freeze({ contactAccent: 'long-hook-point', tailGesture: 'taut-return-line', audioIdentity: 'hook-zing-return', silhouetteReminder: 'long-shaft-hook-tip' }),
  'burst-gauntlet': Object.freeze({ contactAccent: 'compact-double-burst', tailGesture: 'short-punchback', audioIdentity: 'gauntlet-double-pop', silhouetteReminder: 'large-close-hand' }),
  'vault-lance': Object.freeze({ contactAccent: 'long-lance-wedge', tailGesture: 'forward-vault-streak', audioIdentity: 'lance-piercing-ram', silhouetteReminder: 'long-rigid-point' }),
  'scatter-cannon': Object.freeze({ contactAccent: 'broad-fragmented-fan', tailGesture: 'multi-spoke-fade', audioIdentity: 'wide-soft-blast', silhouetteReminder: 'wide-front-barrel' }),
  'sky-anchor': Object.freeze({ contactAccent: 'vertical-anchor-mark', tailGesture: 'downward-settle', audioIdentity: 'deep-anchor-drop', silhouetteReminder: 'top-heavy-vertical-head' }),
  'edge-scythe': Object.freeze({ contactAccent: 'wide-edge-crescent', tailGesture: 'long-edge-arc-fade', audioIdentity: 'long-scythe-sweep', silhouetteReminder: 'curved-outer-blade' }),
  'rebound-hook': Object.freeze({ contactAccent: 'curled-return-hook', tailGesture: 'inward-turnaround', audioIdentity: 'elastic-metal-snap', silhouetteReminder: 'close-curled-hook' }),
  'pulse-baton': Object.freeze({ contactAccent: 'compact-repeat-bars', tailGesture: 'short-periodic-decay', audioIdentity: 'tight-pulse-tap', silhouetteReminder: 'short-straight-baton' }),
  'siege-axe': Object.freeze({ contactAccent: 'blocky-split-wedge', tailGesture: 'heavy-split-settle', audioIdentity: 'deepest-axe-impact', silhouetteReminder: 'broad-split-head' }),
  'twin-fan': Object.freeze({ contactAccent: 'paired-soft-fans', tailGesture: 'mirrored-air-decay', audioIdentity: 'double-air-swipe', silhouetteReminder: 'paired-wide-fans' }),
  'diving-claw': Object.freeze({ contactAccent: 'diagonal-three-prong', tailGesture: 'downward-diagonal-tail', audioIdentity: 'claw-rip-swipe', silhouetteReminder: 'three-forward-prongs' }),
  'route-bow': Object.freeze({ contactAccent: 'needle-arrow-line', tailGesture: 'long-thin-fade', audioIdentity: 'dry-bow-twang', silhouetteReminder: 'bow-curve-long-line' }),
  'pivot-blade': Object.freeze({ contactAccent: 'pivot-chevron-cut', tailGesture: 'rear-turn-snap', audioIdentity: 'fast-pivot-tick', silhouetteReminder: 'offset-turning-blade' }),
  'commitment-fist': Object.freeze({ contactAccent: 'held-square-fist', tailGesture: 'hold-release-pulse', audioIdentity: 'charged-body-thump', silhouetteReminder: 'compact-forward-fist' }),
} satisfies Readonly<Record<CollectionWeaponId, Readonly<{
  readonly contactAccent: string;
  readonly tailGesture: string;
  readonly audioIdentity: string;
  readonly silhouetteReminder: string;
}>>>);

export const ARENA_V2_WEAPON_FEEDBACK_SIGNATURES_CANDIDATE_V1 = Object.freeze(
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map((weapon) => Object.freeze({
    weaponId: weapon.id,
    ...WEAPON_SIGNATURES[weapon.id],
  } satisfies ArenaV2WeaponFeedbackSignatureCandidateV1)),
);

const FEEDBACK_PROFILES = Object.freeze({
  [ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_CONFIRM]: Object.freeze({
    feedbackKind: ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_CONFIRM,
    baseVisualCue: 'impact-confirm',
    baseAudioCue: 'weapon-hit',
    semanticShape: 'solid-contact-cross-and-short-ring',
    timingLanguage: 'instant-contact-short-tail',
    audioBody: 'clear-contact-with-short-decay',
    reducedMotionFallback: 'static-contact-mark-plus-source-arrow',
  }),
  [ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_SURFACE_TRANSFER]: Object.freeze({
    feedbackKind: ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_SURFACE_TRANSFER,
    baseVisualCue: 'impact-surface-transfer',
    baseAudioCue: 'weapon-transfer',
    semanticShape: 'direction-arrow-and-sweep-line',
    timingLanguage: 'contact-then-direction-extension',
    audioBody: 'contact-with-directional-transfer-tail',
    reducedMotionFallback: 'stable-direction-line-plus-landing-ring',
  }),
  [ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_RING_OUT]: Object.freeze({
    feedbackKind: ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_RING_OUT,
    baseVisualCue: 'ring-out',
    baseAudioCue: 'weapon-ring-out',
    semanticShape: 'broken-expanding-ring',
    timingLanguage: 'displacement-then-result-confirmation',
    audioBody: 'impact-plus-separated-ring-out-confirm',
    reducedMotionFallback: 'exit-direction-icon-plus-result-text',
  }),
  [ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.ATTACK_EVADED]: Object.freeze({
    feedbackKind: ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.ATTACK_EVADED,
    baseVisualCue: 'evaded-warning',
    baseAudioCue: 'weapon-evaded',
    semanticShape: 'unclosed-arc',
    timingLanguage: 'windup-end-then-dissolve',
    audioBody: 'dry-whiff-without-impact-body',
    reducedMotionFallback: 'static-unclosed-arc-plus-recovery-direction',
  }),
  [ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.MOVEMENT_FALL]: Object.freeze({
    feedbackKind: ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.MOVEMENT_FALL,
    baseVisualCue: 'movement-fall-warning',
    baseAudioCue: 'movement-fall',
    semanticShape: 'downward-broken-line',
    timingLanguage: 'support-loss-then-reentry-marker',
    audioBody: 'support-loss-without-weapon-impact',
    reducedMotionFallback: 'status-icon-plus-downward-and-reentry-direction',
  }),
} satisfies Readonly<Record<ArenaWeaponFeedbackSemanticKindV1, FeedbackSemanticProfile>>);

const MODE_PROFILES = Object.freeze({
  [WEAPON_MODE_KIND_V1.DUEL]: Object.freeze({
    modeKind: WEAPON_MODE_KIND_V1.DUEL,
    focus: 'opponent-spacing-and-ring-out-attribution',
  }),
  [WEAPON_MODE_KIND_V1.RACE]: Object.freeze({
    modeKind: WEAPON_MODE_KIND_V1.RACE,
    focus: 'route-preservation-interference-and-reentry',
  }),
  [WEAPON_MODE_KIND_V1.SURVIVAL]: Object.freeze({
    modeKind: WEAPON_MODE_KIND_V1.SURVIVAL,
    focus: 'survival-time-crowd-pressure-and-safe-routing',
  }),
} satisfies Readonly<Record<WeaponModeKindV1, ModeReadProfile>>);

export const ARENA_V2_WEAPON_FEEDBACK_ACTION_READ_BINDINGS_CANDIDATE_V1 = Object.freeze(
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.flatMap((weapon) => (
    weapon.grammar.contexts.map((context, index) => {
      const action = weapon.actions[index];
      const expectedActionId = index === 0
        ? weapon.equipment.actionDefinitionId
        : weapon.equipment.aerialActionDefinitionId;
      if (action === undefined
        || action.id !== context.actionDefinitionId
        || action.id !== expectedActionId
        || context.kind !== (index === 0
          ? WEAPON_ACTION_CONTEXT_V1.GROUND
          : WEAPON_ACTION_CONTEXT_V1.AERIAL)) {
        throw new RangeError(`Arena V2武器反馈动作绑定不闭合：${weapon.id}/${String(index)}。`);
      }
      return Object.freeze({
        weaponId: weapon.id,
        collectionOrder: weapon.collectionOrder,
        equipmentDefinitionId: weapon.equipment.id,
        actionDefinitionId: action.id,
        collectionActionDefinitionId: action.id,
        actionIdentityKind: 'collection' as const,
        survivalLevel: null,
        actionContext: context.kind,
        coreVerb: weapon.grammar.coreVerb,
        learningProblem: weapon.learningProblem,
        intendedResult: context.intendedResult,
        failureRisk: context.failureRisk,
        mapSituations: context.mapSituations,
        identityCueId:
          `arena.cue.weapon-identity.${weapon.id}.${context.kind}.candidate.v1`,
      } satisfies ArenaV2WeaponFeedbackActionReadBindingCandidateV1);
    })
  )),
);

const COLLECTION_ACTION_BINDING_BY_WEAPON_AND_CONTEXT = new Map<
  string,
  ArenaV2WeaponFeedbackActionReadBindingCandidateV1
>(
  ARENA_V2_WEAPON_FEEDBACK_ACTION_READ_BINDINGS_CANDIDATE_V1.map((binding) => (
    [`${binding.weaponId}:${binding.actionContext}`, binding] as const
  )),
);

export const ARENA_V2_SURVIVAL_WEAPON_FEEDBACK_ACTION_ALIASES_CANDIDATE_V1 = Object.freeze(
  ARENA_V2_SURVIVAL_BASELINE_WEAPON_RUNTIME_VARIANTS_CANDIDATE_V1.flatMap((variant) => (
    variant.grammar.contexts.map((context, index) => {
      const action = variant.actions[index];
      const collectionBinding = COLLECTION_ACTION_BINDING_BY_WEAPON_AND_CONTEXT.get(
        `${variant.weaponId}:${context.kind}`,
      );
      if (action === undefined
        || action.id !== context.actionDefinitionId
        || collectionBinding === undefined
        || variant.collectionEquipmentDefinitionId !== collectionBinding.equipmentDefinitionId
        || variant.grammar.coreVerb !== collectionBinding.coreVerb) {
        throw new RangeError(
          `Arena V2生存武器反馈动作别名不闭合：${variant.weaponId}/L${variant.level}/${String(index)}。`,
        );
      }
      return Object.freeze({
        ...collectionBinding,
        actionDefinitionId: action.id,
        collectionActionDefinitionId: collectionBinding.actionDefinitionId,
        actionIdentityKind: 'survival-tier' as const,
        survivalLevel: variant.level,
      } satisfies ArenaV2WeaponFeedbackActionReadBindingCandidateV1);
    })
  )),
);

const ACTION_BINDING_BY_ID = new Map(
  [
    ...ARENA_V2_WEAPON_FEEDBACK_ACTION_READ_BINDINGS_CANDIDATE_V1,
    ...ARENA_V2_SURVIVAL_WEAPON_FEEDBACK_ACTION_ALIASES_CANDIDATE_V1,
  ].map((binding) => (
    [binding.actionDefinitionId, binding] as const
  )),
);

export function requireArenaV2WeaponFeedbackActionReadBindingCandidateV1(
  actionDefinitionId: unknown,
): ArenaV2WeaponFeedbackActionReadBindingCandidateV1 {
  if (typeof actionDefinitionId !== 'string' || actionDefinitionId.length === 0) {
    throw new TypeError('Arena V2 weapon feedback actionDefinitionId必须是非空字符串。');
  }
  const binding = ACTION_BINDING_BY_ID.get(actionDefinitionId);
  if (binding === undefined) {
    throw new RangeError(`Arena V2 weapon feedback action未进入20把目录：${actionDefinitionId}。`);
  }
  return binding;
}

export function resolveArenaV2WeaponFeedbackActionReadBindingCandidateV1(
  actionDefinitionId: unknown,
): ArenaV2WeaponFeedbackActionReadBindingCandidateV1 | null {
  if (typeof actionDefinitionId !== 'string' || actionDefinitionId.length === 0) {
    throw new TypeError('Arena V2 weapon feedback actionDefinitionId必须是非空字符串。');
  }
  return ACTION_BINDING_BY_ID.get(actionDefinitionId) ?? null;
}

function assertCatalogClosure(): void {
  const weapons = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1;
  const bindings = ARENA_V2_WEAPON_FEEDBACK_ACTION_READ_BINDINGS_CANDIDATE_V1;
  if (weapons.length !== 20
    || bindings.length !== 40
    || ARENA_V2_SURVIVAL_WEAPON_FEEDBACK_ACTION_ALIASES_CANDIDATE_V1.length !== 400
    || ACTION_BINDING_BY_ID.size !== 440
    || ARENA_V2_WEAPON_FEEDBACK_SIGNATURES_CANDIDATE_V1.length !== 20
    || new Set(ARENA_V2_WEAPON_FEEDBACK_SIGNATURES_CANDIDATE_V1.map(
      ({ weaponId }) => weaponId,
    )).size !== 20) {
    throw new RangeError('Arena V2二十武器反馈读取目录未闭合20武器/40收藏动作/400生存动作。');
  }
  for (const weapon of weapons) {
    if (weapon.grammar.modeConsequences.length !== 3
      || weapon.grammar.modeConsequences.some((consequence, index) => (
        consequence.modeKind !== [
          WEAPON_MODE_KIND_V1.DUEL,
          WEAPON_MODE_KIND_V1.RACE,
          WEAPON_MODE_KIND_V1.SURVIVAL,
        ][index]
      ))) {
      throw new RangeError(`Arena V2武器${weapon.id}反馈读取缺少三模式后果。`);
    }
  }
}

assertCatalogClosure();

function readModeKind(value: unknown): WeaponModeKindV1 {
  if (!MODE_KINDS.has(value)) throw new RangeError(`Arena V2武器反馈模式不受支持：${String(value)}。`);
  return value as WeaponModeKindV1;
}

function requireWeapon(weaponId: CollectionWeaponId): CollectionWeapon {
  const weapon = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(({ id }) => id === weaponId);
  if (weapon === undefined) throw new RangeError(`Arena V2反馈读取缺少武器${weaponId}。`);
  return weapon;
}

function cueId(
  channel: 'vfx' | 'audio',
  modeKind: WeaponModeKindV1,
  feedbackKind: ArenaWeaponFeedbackSemanticKindV1,
  binding: ArenaV2WeaponFeedbackActionReadBindingCandidateV1 | null,
): string {
  const subject = binding === null
    ? 'movement-global'
    : `${binding.weaponId}.${binding.actionContext}`;
  return `arena.cue.${channel}.weapon-feedback.${subject}.${feedbackKind}.${modeKind}.candidate.v1`;
}

/**
 * Resolves one exact V6 authority event into a product Presentation read plan.
 * It only enriches an already validated cause with stable weapon, mode, VFX and
 * audio identities. It never reads positions, animation completion or sound state.
 */
export function projectArenaV2TwentyWeaponFeedbackReadPlanCandidateV1(
  value: unknown,
): ArenaV2TwentyWeaponFeedbackReadPlanProjectionCandidateV1 {
  const source = cloneFrozenData(value, 'Arena V2 twenty weapon feedback read plan input');
  assertKnownKeys(source, INPUT_KEYS, 'Arena V2 twenty weapon feedback read plan input');
  for (const key of INPUT_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`Arena V2武器反馈读取输入缺少${key}。`);
  }
  if (source.schemaVersion
    !== ARENA_V2_TWENTY_WEAPON_FEEDBACK_READ_PLAN_CANDIDATE_V1_SCHEMA_VERSION) {
    throw new RangeError('Arena V2武器反馈读取输入只接受schemaVersion 1。');
  }
  const modeKind = readModeKind(source.modeKind);
  const presentation = projectArenaWeaponFeedbackEventV6PresentationEvent(source.event);
  const semantic = FEEDBACK_PROFILES[presentation.feedbackKind];
  const mode = MODE_PROFILES[modeKind];
  const weaponSpecific = presentation.feedbackKind
    !== ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.MOVEMENT_FALL;
  const binding = weaponSpecific
    ? presentation.action === null
      ? (() => { throw new RangeError('武器反馈缺少ActionDefinition身份。'); })()
      : ACTION_BINDING_BY_ID.get(presentation.action)
        ?? (() => { throw new RangeError(`武器反馈动作未进入二十武器目录：${presentation.action}。`); })()
    : null;
  if (binding !== null && (
    (modeKind === WEAPON_MODE_KIND_V1.SURVIVAL
      && binding.actionIdentityKind !== 'survival-tier')
    || (modeKind !== WEAPON_MODE_KIND_V1.SURVIVAL
      && binding.actionIdentityKind !== 'collection')
  )) {
    throw new RangeError(
      `武器反馈动作${binding.actionDefinitionId}不属于${modeKind}运行时身份域。`,
    );
  }
  const weapon = binding === null ? null : requireWeapon(binding.weaponId);
  const signature = binding === null ? null : WEAPON_SIGNATURES[binding.weaponId];
  const verb = binding === null
    ? Object.freeze({
      familyShape: 'global-route-state-glyph',
      directionLanguage: 'downward-then-reentry',
      motionLanguage: 'support-loss-state-change',
      sharedAudioBody: 'non-weapon-support-loss-body',
    })
    : ARENA_V2_WEAPON_FEEDBACK_VERB_READ_PROFILES_CANDIDATE_V1[binding.coreVerb];
  const consequence = weapon === null
    ? null
    : weapon.grammar.modeConsequences.find((candidate) => candidate.modeKind === modeKind)
      ?? (() => { throw new RangeError(`武器${weapon.id}缺少${modeKind}表现后果。`); })();
  const identityCueId = binding?.identityCueId
    ?? `arena.cue.route-state.movement-fall.${modeKind}.candidate.v1`;
  return Object.freeze({
    schemaVersion: ARENA_V2_TWENTY_WEAPON_FEEDBACK_READ_PLAN_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    sourceEventId: presentation.sourceEventId,
    tick: presentation.tick,
    sequence: presentation.sequence,
    modeKind,
    feedbackKind: presentation.feedbackKind,
    weaponSpecific,
    weaponId: binding?.weaponId ?? null,
    equipmentDefinitionId: binding?.equipmentDefinitionId ?? null,
    sourceActionDefinitionId: presentation.action,
    collectionActionDefinitionId: binding?.collectionActionDefinitionId ?? null,
    actionIdentityKind: binding?.actionIdentityKind ?? null,
    survivalLevel: binding?.survivalLevel ?? null,
    actionContext: binding?.actionContext ?? null,
    coreVerb: binding?.coreVerb ?? null,
    learningRead: Object.freeze({
      learningProblem: binding?.learningProblem ?? null,
      intendedResult: binding?.intendedResult ?? null,
      failureRisk: binding?.failureRisk ?? null,
      counterInputs: binding === null
        ? Object.freeze([])
        : requireWeapon(binding.weaponId).grammar.contexts.find((context) => (
          context.kind === binding.actionContext
          && context.actionDefinitionId === binding.collectionActionDefinitionId
        ))?.counterInputs
          ?? (() => {
            throw new RangeError(`武器反馈${binding.actionDefinitionId}缺少同源反制输入。`);
          })(),
      identityCueId,
      silhouetteReminder: signature?.silhouetteReminder ?? null,
    }),
    authorityPresentation: presentation,
    modeRead: Object.freeze({
      focus: mode.focus,
      consequence: consequence === null ? null : Object.freeze({
        modeKind: consequence.modeKind,
        mapSituations: consequence.mapSituations,
        intendedOutcomes: consequence.intendedOutcomes,
      }),
    }),
    vfx: Object.freeze({
      cueId: cueId('vfx', modeKind, presentation.feedbackKind, binding),
      baseVisualCue: semantic.baseVisualCue,
      authoritySource: 'WeaponFeedbackResolved' as const,
      familyShape: verb.familyShape,
      semanticShape: semantic.semanticShape,
      contactAccent: signature?.contactAccent ?? 'route-state-break',
      directionLanguage: verb.directionLanguage,
      motionLanguage: verb.motionLanguage,
      tailGesture: signature?.tailGesture ?? 'downward-reentry-link',
      timingLanguage: semantic.timingLanguage,
      valueContrastPolicy: 'bright-core-dark-edge' as const,
      coreHex: '#FFF4B8' as const,
      warningHex: '#FFB020' as const,
      activeHex: '#FF5C5C' as const,
      darkEdgeHex: '#273451' as const,
      colorIsNeverSoleSignal: true as const,
      essentialLayers: Object.freeze(['core', 'direction', 'result'] as const),
      optionalLayers: Object.freeze(['decoration'] as const),
      qualityPolicy: Object.freeze({
        low: 'static-core-direction-result-no-decoration' as const,
        medium: 'core-direction-result-no-decoration' as const,
        high: 'core-direction-result-plus-bounded-decoration' as const,
        off: 'static-causal-glyph-and-text' as const,
      }),
      maximumParticlesPerEffect: 96 as const,
      maximumAverageOverdraw: 2 as const,
      distortionAllowed: false as const,
      boundedLifetimeRequired: true as const,
      pooledOwnershipRequired: true as const,
    }),
    audio: Object.freeze({
      cueId: cueId('audio', modeKind, presentation.feedbackKind, binding),
      baseAudioCue: semantic.baseAudioCue,
      bus: 'SFX' as const,
      semanticBody: `${verb.sharedAudioBody}+${semantic.audioBody}`,
      weaponIdentity: signature?.audioIdentity ?? 'movement-fall-global',
      oneShot: true as const,
      dedupeIdentity: presentation.sourceEventId,
      maximumConcurrentVoices: 8 as const,
      overflowPolicy: 'drop-lowest-priority' as const,
      deterministicVariationSource: 'sourceEventId' as const,
      syntheticFallbackAllowed: false as const,
    }),
    accessibility: Object.freeze({
      reducedMotionFallback: semantic.reducedMotionFallback,
      mutedFallback: 'retain-shape-direction-result-text-and-semantic-announcement',
      lowQualityKeepsCausalRead: true as const,
      colorIndependent: true as const,
    }),
    governance: Object.freeze({
      ownsRuleOrMatchAuthority: false as const,
      infersHitFromPosition: false as const,
      infersFallCauseFromAnimation: false as const,
      writesAuthorityState: false as const,
      formalVfxAssetApproved: false as const,
      formalAudioAssetApproved: false as const,
    }),
  });
}

const CATALOG_AUTHORITY = Object.freeze({
  schemaVersion: ARENA_V2_TWENTY_WEAPON_FEEDBACK_READ_PLAN_CANDIDATE_V1_SCHEMA_VERSION,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  defaultSurfaceWired: false as const,
  weaponCount: 20 as const,
  actionBindingCount: 40 as const,
  survivalRuntimeActionAliasCount: 400 as const,
  acceptedActionIdentityCount: 440 as const,
  coreVerbProfileCount: 6 as const,
  feedbackSemanticCount: 5 as const,
  modeProfileCount: 3 as const,
  weaponActionModeFeedbackPlanCapacity: 480 as const,
  globalMovementFallPlanCount: 3 as const,
  normalizedResolvedPlanCapacity: 483 as const,
  acceptedRuntimeProjectionCombinationCount: 1_923 as const,
  weaponSignatures: ARENA_V2_WEAPON_FEEDBACK_SIGNATURES_CANDIDATE_V1,
  verbProfiles: ARENA_V2_WEAPON_FEEDBACK_VERB_READ_PROFILES_CANDIDATE_V1,
  actionBindings: ARENA_V2_WEAPON_FEEDBACK_ACTION_READ_BINDINGS_CANDIDATE_V1,
  survivalActionAliases: ARENA_V2_SURVIVAL_WEAPON_FEEDBACK_ACTION_ALIASES_CANDIDATE_V1,
  feedbackProfiles: FEEDBACK_PROFILES,
  modeProfiles: MODE_PROFILES,
  formalVfxAssetsReady: false as const,
  formalAudioAssetsReady: false as const,
  ownsRuleOrMatchAuthority: false as const,
});

export const ARENA_V2_TWENTY_WEAPON_FEEDBACK_READ_PLAN_CANDIDATE_V1 = Object.freeze({
  ...CATALOG_AUTHORITY,
  contentHash: createDeterministicDataHash(
    CATALOG_AUTHORITY,
    'Arena V2 Twenty Weapon Feedback Read Plan Candidate V1',
  ),
  validationStatus: 'not-run' as const,
});
