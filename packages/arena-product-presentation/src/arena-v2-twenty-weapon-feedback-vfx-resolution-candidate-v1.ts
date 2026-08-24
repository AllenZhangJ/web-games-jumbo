import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type ArenaWeaponFeedbackSemanticKindV1,
} from '@number-strategy-jump/arena-contracts';
import {
  WEAPON_CORE_VERB_V1,
  type WeaponActionContextKindV1,
  type WeaponCoreVerbV1,
  type WeaponCounterInputV1,
  type WeaponFailureRiskV1,
  type WeaponModeKindV1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
  type ArenaV2FormalVfxTextureAssetRecordCandidateV1,
} from './arena-v2-formal-presentation-asset-catalog-candidate-v1.js';
import type {
  ArenaV2ModeHudFeedbackEffectQualityTierV1,
  ArenaV2ModeHudFeedbackVisualCommandV1,
} from './arena-v2-mode-hud-feedback-effect-consumer-v1.js';
import {
  ARENA_V2_TWENTY_WEAPON_FEEDBACK_READ_PLAN_CANDIDATE_V1,
} from './arena-v2-twenty-weapon-feedback-read-plan-candidate-v1.js';
import {
  ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1,
} from './arena-v2-weapon-collection-combat-grammar-visual-source-candidate-v1.js';

type WeaponId = typeof ARENA_V2_TWENTY_WEAPON_FEEDBACK_READ_PLAN_CANDIDATE_V1[
  'weaponSignatures'
][number]['weaponId'];

export interface ArenaV2WeaponCombatGrammarIdentityCandidateV1 {
  readonly sourceContentHash: string;
  readonly weaponId: WeaponId;
  readonly context: WeaponActionContextKindV1;
  readonly actionDefinitionId: string;
  readonly coreVerb: WeaponCoreVerbV1;
  readonly failureRisk: WeaponFailureRiskV1;
  readonly counterInputs: readonly WeaponCounterInputV1[];
}

interface CueRecord {
  readonly cueId: string;
  readonly weaponSpecific: boolean;
  readonly weaponId: WeaponId | null;
  readonly actionContext: WeaponActionContextKindV1 | null;
  readonly combatGrammarIdentity: ArenaV2WeaponCombatGrammarIdentityCandidateV1 | null;
  readonly modeKind: WeaponModeKindV1;
  readonly feedbackKind: ArenaWeaponFeedbackSemanticKindV1;
  readonly baseVisualCue: ArenaV2FormalVfxTextureAssetRecordCandidateV1['cueId'];
  readonly familyShape: string;
  readonly semanticShape: string;
  readonly contactAccent: string;
  readonly directionLanguage: string;
  readonly motionLanguage: string;
  readonly tailGesture: string;
  readonly timingLanguage: string;
}

export interface ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly hardGate: false;
  readonly sourceEventId: string;
  readonly attackerParticipantId: string | null;
  readonly targetParticipantId: string | null;
  readonly specializedCueId: string;
  readonly weaponSpecific: boolean;
  readonly weaponId: WeaponId | null;
  readonly actionContext: WeaponActionContextKindV1 | null;
  readonly combatGrammarIdentity: ArenaV2WeaponCombatGrammarIdentityCandidateV1 | null;
  readonly modeKind: WeaponModeKindV1;
  readonly feedbackKind: ArenaWeaponFeedbackSemanticKindV1;
  readonly formalTexture: Readonly<{
    readonly recorded: true;
    readonly productionApproved: false;
    readonly vfxAssetId: string;
    readonly runtimeSourceKey: string;
    readonly cueId: ArenaV2FormalVfxTextureAssetRecordCandidateV1['cueId'];
    readonly maturity: ArenaV2FormalVfxTextureAssetRecordCandidateV1['maturity'];
    readonly width: 128;
    readonly height: 128;
    readonly sha256: string;
  }>;
  readonly shapeTimingColor: Readonly<{
    readonly familyShape: string;
    readonly semanticShape: string;
    readonly contactAccent: string;
    readonly directionLanguage: string;
    readonly motionLanguage: string;
    readonly tailGesture: string;
    readonly timingLanguage: string;
    readonly valueContrastPolicy: 'bright-core-dark-edge';
  }>;
  readonly directionProjection: Readonly<{
    readonly space: 'symbolic-billboard';
    readonly authorityWorldDirectionAvailable: false;
    readonly worldDirection: null;
    readonly worldOrientedArrowAllowed: false;
    readonly futureAuthorityRequirement: 'weapon-feedback-result-direction-v2';
  }>;
  readonly renderRecipe: Readonly<{
    readonly anchorParticipantId: string | null;
    readonly anchorWorldPosition: ArenaV2ModeHudFeedbackVisualCommandV1['anchorWorldPosition'];
    readonly perspective: ArenaV2ModeHudFeedbackVisualCommandV1['perspective'];
    readonly motionPolicy: 'standard' | 'static';
    readonly qualityTier: ArenaV2ModeHudFeedbackEffectQualityTierV1;
    readonly essentialLayers: readonly ['core', 'direction', 'result'];
    readonly optionalDecorationEnabled: boolean;
    readonly maximumLayers: 1 | 2 | 3;
    readonly maximumParticles: 0 | 24 | 48 | 96;
    readonly maximumAverageOverdraw: 2;
    readonly distortionAllowed: false;
    readonly explicitOffSwitch: true;
    readonly boundedLifetimeRequired: true;
    readonly pooledOwnershipRequired: true;
  }>;
  readonly accessibility: Readonly<{
    readonly staticResultOnly: boolean;
    readonly keepsTitleAndExplanation: true;
    readonly colorIndependent: true;
  }>;
  readonly governance: Readonly<{
    readonly ownsRuleOrMatchAuthority: false;
    readonly infersOutcome: false;
    readonly programmaticAssetFallbackUsed: false;
    readonly mayEnterProduction: false;
  }>;
}

const COMMAND_KEYS = new Set([
  'sourceEventId', 'cueId', 'anchorParticipantId', 'attackerParticipantId',
  'targetParticipantId', 'anchorWorldPosition',
  'title', 'explanation', 'perspective', 'emphasis', 'motionPolicy', 'qualityTier',
  'timingLanguage', 'valueContrastPolicy', 'maximumLayers', 'maximumParticles',
  'maximumAverageOverdraw', 'distortionAllowed', 'explicitOffSwitch', 'tick',
  'sequence',
]);
const MODE_KINDS = Object.freeze(['duel', 'race', 'survival'] as const);
const ATTACK_FEEDBACK_KINDS = Object.freeze([
  'hit-confirm',
  'hit-surface-transfer',
  'hit-ring-out',
  'attack-evaded',
] as const);

const GRAMMAR_SOURCE =
  ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1;
const GRAMMAR_BY_WEAPON_ID = new Map(
  GRAMMAR_SOURCE.entries.map((entry) => [entry.catalogId, entry] as const),
);
const READ_PLAN_WEAPON_IDS = new Set<string>(
  ARENA_V2_TWENTY_WEAPON_FEEDBACK_READ_PLAN_CANDIDATE_V1.weaponSignatures
    .map(({ weaponId }) => weaponId),
);
const CORE_VERB_VALUES = Object.freeze(Object.values(WEAPON_CORE_VERB_V1));
const FAMILY_SHAPE_BY_CORE_VERB = new Map(
  CORE_VERB_VALUES.map((coreVerb) => {
    const profile = ARENA_V2_TWENTY_WEAPON_FEEDBACK_READ_PLAN_CANDIDATE_V1
      .verbProfiles[coreVerb];
    if (profile.coreVerb !== coreVerb) {
      throw new RangeError(`Arena V2反馈VFX核心动词${coreVerb}读取身份漂移。`);
    }
    return [coreVerb, profile.familyShape] as const;
  }),
);

if (GRAMMAR_SOURCE.entries.length !== 20
  || GRAMMAR_BY_WEAPON_ID.size !== 20
  || READ_PLAN_WEAPON_IDS.size !== 20
  || !GRAMMAR_SOURCE.entries.every(({ catalogId }) => READ_PLAN_WEAPON_IDS.has(catalogId))
  || new Set(GRAMMAR_SOURCE.entries.map(({ coreVerb }) => coreVerb)).size
    !== CORE_VERB_VALUES.length
  || FAMILY_SHAPE_BY_CORE_VERB.size !== CORE_VERB_VALUES.length
  || new Set(FAMILY_SHAPE_BY_CORE_VERB.values()).size !== CORE_VERB_VALUES.length) {
  throw new RangeError('Arena V2反馈VFX六类coreVerb与familyShape未形成双向闭包。');
}

export function requireArenaV2WeaponFeedbackFamilyShapeForCoreVerbCandidateV1(
  value: unknown,
): string {
  if (typeof value !== 'string'
    || !CORE_VERB_VALUES.some((coreVerb) => coreVerb === value)) {
    throw new RangeError(`Arena V2反馈VFX未知核心动词：${String(value)}。`);
  }
  const familyShape = FAMILY_SHAPE_BY_CORE_VERB.get(value as WeaponCoreVerbV1);
  if (familyShape === undefined) {
    throw new RangeError(`Arena V2反馈VFX核心动词${value}缺少familyShape。`);
  }
  return familyShape;
}

function combatGrammarIdentity(
  weaponId: WeaponId,
  context: WeaponActionContextKindV1,
): ArenaV2WeaponCombatGrammarIdentityCandidateV1 {
  const entry = GRAMMAR_BY_WEAPON_ID.get(weaponId);
  const contextEntry = entry?.contexts.find((candidate) => candidate.context === context);
  if (entry === undefined || entry.catalogId !== weaponId || contextEntry === undefined) {
    throw new RangeError(`Arena V2反馈VFX缺少${weaponId}/${context}同源战斗语法。`);
  }
  return Object.freeze({
    sourceContentHash: GRAMMAR_SOURCE.contentHash,
    weaponId,
    context,
    actionDefinitionId: contextEntry.actionDefinitionId,
    coreVerb: entry.coreVerb,
    failureRisk: contextEntry.failureRisk,
    counterInputs: Object.freeze([...contextEntry.counterInputs]),
  });
}

function formalTexture(
  cueId: ArenaV2FormalVfxTextureAssetRecordCandidateV1['cueId'],
): ArenaV2FormalVfxTextureAssetRecordCandidateV1 {
  const record = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.vfxTextureRecords
    .find((candidate) => candidate.cueId === cueId);
  if (record === undefined) throw new RangeError(`Arena V2反馈VFX缺少正式纹理记录：${cueId}。`);
  return record;
}

function cueId(
  subject: string,
  feedbackKind: ArenaWeaponFeedbackSemanticKindV1,
  modeKind: WeaponModeKindV1,
): string {
  return `arena.cue.vfx.weapon-feedback.${subject}.${feedbackKind}.${modeKind}.candidate.v1`;
}

function buildCueRecords(): readonly CueRecord[] {
  const catalog = ARENA_V2_TWENTY_WEAPON_FEEDBACK_READ_PLAN_CANDIDATE_V1;
  const signatures = new Map(catalog.weaponSignatures.map((value) => [value.weaponId, value]));
  const result: CueRecord[] = [];
  for (const binding of catalog.actionBindings) {
    const signature = signatures.get(binding.weaponId);
    if (signature === undefined) throw new RangeError(`Arena V2反馈VFX缺少武器签名：${binding.weaponId}。`);
    const grammarIdentity = combatGrammarIdentity(binding.weaponId, binding.actionContext);
    const verb = catalog.verbProfiles[binding.coreVerb];
    if (binding.collectionActionDefinitionId !== grammarIdentity.actionDefinitionId
      || binding.coreVerb !== grammarIdentity.coreVerb
      || binding.failureRisk !== grammarIdentity.failureRisk
      || verb.familyShape
        !== requireArenaV2WeaponFeedbackFamilyShapeForCoreVerbCandidateV1(
          grammarIdentity.coreVerb,
        )) {
      throw new RangeError(
        `Arena V2反馈VFX ${binding.weaponId}/${binding.actionContext}读取计划与战斗语法漂移。`,
      );
    }
    for (const modeKind of MODE_KINDS) {
      for (const feedbackKind of ATTACK_FEEDBACK_KINDS) {
        const semantic = catalog.feedbackProfiles[feedbackKind];
        result.push(Object.freeze({
          cueId: cueId(`${binding.weaponId}.${binding.actionContext}`, feedbackKind, modeKind),
          weaponSpecific: true,
          weaponId: binding.weaponId,
          actionContext: binding.actionContext,
          combatGrammarIdentity: grammarIdentity,
          modeKind,
          feedbackKind,
          baseVisualCue: semantic.baseVisualCue,
          familyShape: verb.familyShape,
          semanticShape: semantic.semanticShape,
          contactAccent: signature.contactAccent,
          directionLanguage: verb.directionLanguage,
          motionLanguage: verb.motionLanguage,
          tailGesture: signature.tailGesture,
          timingLanguage: semantic.timingLanguage,
        }));
      }
    }
  }
  const movement = catalog.feedbackProfiles['movement-fall'];
  for (const modeKind of MODE_KINDS) {
    result.push(Object.freeze({
      cueId: cueId('movement-global', 'movement-fall', modeKind),
      weaponSpecific: false,
      weaponId: null,
      actionContext: null,
      combatGrammarIdentity: null,
      modeKind,
      feedbackKind: 'movement-fall',
      baseVisualCue: movement.baseVisualCue,
      familyShape: 'global-route-state-glyph',
      semanticShape: movement.semanticShape,
      contactAccent: 'route-state-break',
      directionLanguage: 'downward-then-reentry',
      motionLanguage: 'support-loss-state-change',
      tailGesture: 'downward-reentry-link',
      timingLanguage: movement.timingLanguage,
    }));
  }
  if (result.length !== catalog.normalizedResolvedPlanCapacity) {
    throw new RangeError('Arena V2反馈VFX Cue目录容量不闭合。');
  }
  if (new Set(result.map(({ cueId: id }) => id)).size !== result.length) {
    throw new RangeError('Arena V2反馈VFX Cue目录存在重复身份。');
  }
  return Object.freeze(result);
}

export const ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_CUE_RECORDS_CANDIDATE_V1 =
  buildCueRecords();

const RECORD_BY_CUE_ID = new Map(
  ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_CUE_RECORDS_CANDIDATE_V1
    .map((record) => [record.cueId, record]),
);

function optionalString(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function position(
  value: unknown,
): ArenaV2ModeHudFeedbackVisualCommandV1['anchorWorldPosition'] {
  if (value === null) return null;
  const source = cloneFrozenData(value, 'Arena V2反馈VFX位置');
  assertKnownKeys(source, new Set(['x', 'y', 'z']), 'Arena V2反馈VFX位置');
  for (const axis of ['x', 'y', 'z'] as const) {
    if (!Object.hasOwn(source, axis)
      || typeof source[axis] !== 'number'
      || !Number.isFinite(source[axis])) {
      throw new TypeError(`Arena V2反馈VFX位置.${axis}必须是有限数。`);
    }
  }
  return Object.freeze({
    x: source.x as number,
    y: source.y as number,
    z: source.z as number,
  });
}

export function createArenaV2FeedbackVisualCommandSnapshotCandidateV1(
  value: unknown,
): ArenaV2ModeHudFeedbackVisualCommandV1 {
  const source = cloneFrozenData(value, 'Arena V2 twenty weapon feedback VFX command');
  assertKnownKeys(source, COMMAND_KEYS, 'Arena V2 twenty weapon feedback VFX command');
  for (const key of COMMAND_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`Arena V2反馈VFX命令缺少${key}。`);
  }
  const cue = assertNonEmptyString(source.cueId, 'Arena V2反馈VFX命令.cueId');
  const perspective = source.perspective;
  if ((source.motionPolicy !== 'standard' && source.motionPolicy !== 'static')
    || (source.qualityTier !== 'low'
      && source.qualityTier !== 'medium'
      && source.qualityTier !== 'high')
    || (source.emphasis !== 'normal'
      && source.emphasis !== 'strong'
      && source.emphasis !== 'warning')
    || (source.timingLanguage !== 'reaction-action-follow-through'
      && source.timingLanguage !== 'static-result-only')
    || source.valueContrastPolicy !== 'bright-core-dark-edge'
    || (source.maximumLayers !== 1 && source.maximumLayers !== 2 && source.maximumLayers !== 3)
    || (source.maximumParticles !== 0
      && source.maximumParticles !== 24
      && source.maximumParticles !== 48
      && source.maximumParticles !== 96)
    || source.maximumAverageOverdraw !== 2
    || source.distortionAllowed !== false
    || source.explicitOffSwitch !== true
    || !Number.isSafeInteger(source.tick)
    || (source.tick as number) < 0
    || !Number.isSafeInteger(source.sequence)
    || (source.sequence as number) < 0) {
    throw new RangeError('Arena V2反馈VFX命令预算或枚举合同无效。');
  }
  if (perspective !== 'local-involved'
    && perspective !== 'global'
    && perspective !== 'remote-only') {
    throw new RangeError('Arena V2反馈VFX命令.perspective无效。');
  }
  if ((source.motionPolicy === 'static') !== (source.timingLanguage === 'static-result-only')) {
    throw new RangeError('Arena V2反馈VFX静态策略与时序语言不一致。');
  }
  if (source.motionPolicy === 'static'
    && (source.maximumLayers !== 1 || source.maximumParticles !== 0)) {
    throw new RangeError('Arena V2反馈VFX静态策略必须关闭粒子并限制为一层。');
  }
  const expectedStandardBudget = source.qualityTier === 'low'
    ? Object.freeze({ maximumLayers: 1, maximumParticles: 24 })
    : source.qualityTier === 'medium'
      ? Object.freeze({ maximumLayers: 2, maximumParticles: 48 })
      : Object.freeze({ maximumLayers: 3, maximumParticles: 96 });
  if (source.motionPolicy === 'standard'
    && (source.maximumLayers !== expectedStandardBudget.maximumLayers
      || source.maximumParticles !== expectedStandardBudget.maximumParticles)) {
    throw new RangeError('Arena V2反馈VFX画质等级与层数/粒子预算不一致。');
  }
  return Object.freeze({
    sourceEventId: assertNonEmptyString(source.sourceEventId, 'Arena V2反馈VFX命令.sourceEventId'),
    cueId: cue,
    anchorParticipantId: optionalString(
      source.anchorParticipantId,
      'Arena V2反馈VFX命令.anchorParticipantId',
    ),
    attackerParticipantId: optionalString(
      source.attackerParticipantId,
      'Arena V2反馈VFX命令.attackerParticipantId',
    ),
    targetParticipantId: optionalString(
      source.targetParticipantId,
      'Arena V2反馈VFX命令.targetParticipantId',
    ),
    anchorWorldPosition: position(source.anchorWorldPosition),
    title: assertNonEmptyString(source.title, 'Arena V2反馈VFX命令.title'),
    explanation: assertNonEmptyString(source.explanation, 'Arena V2反馈VFX命令.explanation'),
    perspective,
    emphasis: source.emphasis,
    motionPolicy: source.motionPolicy,
    qualityTier: source.qualityTier,
    timingLanguage: source.timingLanguage,
    valueContrastPolicy: 'bright-core-dark-edge',
    maximumLayers: source.maximumLayers,
    maximumParticles: source.maximumParticles,
    maximumAverageOverdraw: 2,
    distortionAllowed: false,
    explicitOffSwitch: true,
    tick: source.tick as number,
    sequence: source.sequence as number,
  });
}

/**
 * Resolves an already-specialized visual command to one recorded authored
 * texture and a bounded renderer recipe. It never substitutes procedural art
 * and never upgrades an unapproved candidate into a production-ready asset.
 */
export function resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1(
  value: unknown,
): ArenaV2TwentyWeaponFeedbackVfxResolutionCandidateV1 {
  const input = createArenaV2FeedbackVisualCommandSnapshotCandidateV1(value);
  const record = RECORD_BY_CUE_ID.get(input.cueId);
  if (record === undefined) throw new RangeError(`Arena V2反馈VFX Cue未注册：${input.cueId}。`);
  const texture = formalTexture(record.baseVisualCue);
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    sourceEventId: input.sourceEventId,
    attackerParticipantId: input.attackerParticipantId,
    targetParticipantId: input.targetParticipantId,
    specializedCueId: input.cueId,
    weaponSpecific: record.weaponSpecific,
    weaponId: record.weaponId,
    actionContext: record.actionContext,
    combatGrammarIdentity: record.combatGrammarIdentity,
    modeKind: record.modeKind,
    feedbackKind: record.feedbackKind,
    formalTexture: Object.freeze({
      recorded: true as const,
      productionApproved: false as const,
      vfxAssetId: texture.vfxAssetId,
      runtimeSourceKey: texture.runtimeSourceKey,
      cueId: texture.cueId,
      maturity: texture.maturity,
      width: texture.width,
      height: texture.height,
      sha256: texture.sha256,
    }),
    shapeTimingColor: Object.freeze({
      familyShape: record.familyShape,
      semanticShape: record.semanticShape,
      contactAccent: record.contactAccent,
      directionLanguage: record.directionLanguage,
      motionLanguage: record.motionLanguage,
      tailGesture: record.tailGesture,
      timingLanguage: record.timingLanguage,
      valueContrastPolicy: 'bright-core-dark-edge' as const,
    }),
    directionProjection: Object.freeze({
      space: 'symbolic-billboard' as const,
      authorityWorldDirectionAvailable: false as const,
      worldDirection: null,
      worldOrientedArrowAllowed: false as const,
      futureAuthorityRequirement: 'weapon-feedback-result-direction-v2' as const,
    }),
    renderRecipe: Object.freeze({
      anchorParticipantId: input.anchorParticipantId,
      anchorWorldPosition: input.anchorWorldPosition,
      perspective: input.perspective,
      motionPolicy: input.motionPolicy,
      qualityTier: input.qualityTier,
      essentialLayers: Object.freeze(['core', 'direction', 'result'] as const),
      optionalDecorationEnabled: input.motionPolicy === 'standard'
        && input.qualityTier === 'high'
        && input.maximumLayers === 3,
      maximumLayers: input.maximumLayers,
      maximumParticles: input.maximumParticles,
      maximumAverageOverdraw: 2 as const,
      distortionAllowed: false as const,
      explicitOffSwitch: true as const,
      boundedLifetimeRequired: true as const,
      pooledOwnershipRequired: true as const,
    }),
    accessibility: Object.freeze({
      staticResultOnly: input.motionPolicy === 'static',
      keepsTitleAndExplanation: true as const,
      colorIndependent: true as const,
    }),
    governance: Object.freeze({
      ownsRuleOrMatchAuthority: false as const,
      infersOutcome: false as const,
      programmaticAssetFallbackUsed: false as const,
      mayEnterProduction: false as const,
    }),
  });
}

export const ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_RESOLUTION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  defaultSurfaceWired: false as const,
  specializedCueCount: 483 as const,
  combatGrammarSourceContentHash: GRAMMAR_SOURCE.contentHash,
  combatGrammarWeaponContextIdentityCount: 40 as const,
  coreVerbFamilyShapeBijectionCount: 6 as const,
  movementFallCombatGrammarIdentity: null,
  recordedFormalTextureCount: 5 as const,
  productionApprovedTextureCount: 0 as const,
  shapeTimingColorOrderRequired: true as const,
  currentDirectionProjection: 'symbolic-billboard' as const,
  preservesValidatedPerspectiveInRenderRecipe: true as const,
  derivesPerspectiveFromLocalizedCopy: false as const,
  preservesAuthorityCombatParticipantIdentities: true as const,
  worldOrientedArrowAllowed: false as const,
  futureAuthorityDirectionContractRequired: true as const,
  essentialLayers: Object.freeze(['core', 'direction', 'result'] as const),
  optionalLayers: Object.freeze(['decoration'] as const),
  programmaticAssetFallbackAllowed: false as const,
  ownsRuleOrMatchAuthority: false as const,
  validationStatus: 'not-run' as const,
});
