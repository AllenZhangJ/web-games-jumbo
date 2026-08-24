import {
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND,
  type ArenaWeaponFeedbackSemanticKindV1,
} from '@number-strategy-jump/arena-contracts';
import {
  WEAPON_ACTION_CONTEXT_V1,
  WEAPON_MODE_KIND_V1,
  type WeaponActionContextKindV1,
  type WeaponModeKindV1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
  ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1,
  ARENA_V2_WEAPON_FEEDBACK_ACTION_READ_BINDINGS_CANDIDATE_V1,
  ARENA_V2_WEAPON_FEEDBACK_SIGNATURES_CANDIDATE_V1,
  ARENA_V2_WEAPON_FEEDBACK_VERB_READ_PROFILES_CANDIDATE_V1,
  requireArenaV2FormalAudioCombatGrammarIdentityCandidateV1,
  requireArenaV2WeaponCombatGrammarSourceIdentityByActionDefinitionIdCandidateV1,
  type ArenaV2FormalAudioAssetRecordCandidateV1,
  type ArenaV2FormalAudioCombatGrammarIdentityCandidateV1,
  type ArenaV2WeaponFeedbackActionReadBindingCandidateV1,
  type ArenaV2WeaponFeedbackSignatureCandidateV1,
  type ArenaV2WeaponFeedbackVerbReadProfileCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1,
  type ArenaV2WeaponFirstScreenReadabilityCandidateV1,
} from './arena-v2-character-weapon-first-screen-readability-candidate-v1.js';

type WeaponId = ArenaV2WeaponFeedbackSignatureCandidateV1['weaponId'];
type WeaponAudioSemantic = NonNullable<
  ArenaV2FormalAudioAssetRecordCandidateV1['actionSemantic']
>;
type AttackFeedbackKind = Exclude<
  ArenaWeaponFeedbackSemanticKindV1,
  typeof ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.MOVEMENT_FALL
>;

export interface ArenaV2WeaponAudiovisualFeedbackRecipeCandidateV1 {
  readonly modeKind: WeaponModeKindV1;
  readonly actionContext: WeaponActionContextKindV1;
  readonly actionDefinitionId: string;
  readonly combatGrammarIdentity: ArenaV2FormalAudioCombatGrammarIdentityCandidateV1;
  readonly feedbackKind: AttackFeedbackKind;
  readonly vfxCueId: string;
  readonly audioCueId: string;
  readonly feedbackAnchorKind: 'body-impact' | 'held-weapon-tip';
  readonly worldDirectionSource:
    | 'authority-horizontal-impulse'
    | 'no-world-direction';
  readonly reducedMotionKeepsResultShape: true;
  readonly silentModeKeepsVisualAndText: true;
}

export interface ArenaV2WeaponAuthoredPhaseAudioSlotCandidateV1 {
  readonly phase: 'windup' | 'release' | 'recovery';
  readonly desiredAudioAssetId: string;
  readonly desiredCueId: string;
  readonly combatGrammarIdentity: null;
  readonly status: 'authored-candidate-not-approved';
}

export interface ArenaV2WeaponAudiovisualProductionManifestEntryCandidateV1 {
  readonly weaponId: WeaponId;
  readonly collectionOrder: number;
  readonly equipmentDefinitionId: string;
  readonly actionBindings: readonly ArenaV2WeaponFeedbackActionReadBindingCandidateV1[];
  readonly combatGrammarIdentities: readonly [
    ArenaV2FormalAudioCombatGrammarIdentityCandidateV1,
    ArenaV2FormalAudioCombatGrammarIdentityCandidateV1,
  ];
  readonly readability: ArenaV2WeaponFirstScreenReadabilityCandidateV1;
  readonly signature: ArenaV2WeaponFeedbackSignatureCandidateV1;
  readonly verbReadProfile: ArenaV2WeaponFeedbackVerbReadProfileCandidateV1;
  readonly attachment: Readonly<{
    readonly assetId: string;
    readonly maturity: 'verified-intake-only';
  }>;
  readonly impactAudio: Readonly<{
    readonly audioAssetId: string;
    readonly weaponDefinitionId: string;
    readonly semantic: WeaponAudioSemantic;
    readonly maturity: ArenaV2FormalAudioAssetRecordCandidateV1['maturity'];
    readonly productionApproved: false;
  }>;
  readonly missingAuthoredPhaseAudio: readonly [];
  readonly authoredPhaseAudioSlots: readonly ArenaV2WeaponAuthoredPhaseAudioSlotCandidateV1[];
  readonly feedbackRecipes: readonly ArenaV2WeaponAudiovisualFeedbackRecipeCandidateV1[];
  readonly feedbackRecipeCount: 24;
  readonly inputConcepts: readonly ['direction', 'jump', 'primary'];
  readonly addsInput: false;
  readonly ownsRuleOrHitAuthority: false;
  readonly productionReady: false;
  readonly validationStatus: 'not-run';
}

const MODE_ORDER = Object.freeze([
  WEAPON_MODE_KIND_V1.DUEL,
  WEAPON_MODE_KIND_V1.RACE,
  WEAPON_MODE_KIND_V1.SURVIVAL,
] as const);
const CONTEXT_ORDER = Object.freeze([
  WEAPON_ACTION_CONTEXT_V1.GROUND,
  WEAPON_ACTION_CONTEXT_V1.AERIAL,
] as const);
const ATTACK_FEEDBACK_ORDER = Object.freeze([
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_CONFIRM,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_SURFACE_TRANSFER,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_RING_OUT,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.ATTACK_EVADED,
] as const satisfies readonly AttackFeedbackKind[]);
const AUTHORED_PHASE_AUDIO_ORDER = Object.freeze([
  'windup', 'release', 'recovery',
] as const);

function requireSingle<T>(values: readonly T[], name: string): T {
  if (values.length !== 1) throw new RangeError(`${name}必须精确命中1项。`);
  return values[0]!;
}

function actionBindings(
  signature: ArenaV2WeaponFeedbackSignatureCandidateV1,
): readonly ArenaV2WeaponFeedbackActionReadBindingCandidateV1[] {
  const values = ARENA_V2_WEAPON_FEEDBACK_ACTION_READ_BINDINGS_CANDIDATE_V1
    .filter(({ weaponId }) => weaponId === signature.weaponId)
    .sort((left, right) => (
      CONTEXT_ORDER.indexOf(left.actionContext) - CONTEXT_ORDER.indexOf(right.actionContext)
    ));
  if (
    values.length !== 2
    || values.some((value, index) => value.actionContext !== CONTEXT_ORDER[index])
  ) throw new RangeError(`Arena V2武器${signature.weaponId}缺少地面/空中动作绑定。`);
  return Object.freeze(values);
}

function combatGrammarIdentities(
  signature: ArenaV2WeaponFeedbackSignatureCandidateV1,
  bindings: readonly ArenaV2WeaponFeedbackActionReadBindingCandidateV1[],
): ArenaV2WeaponAudiovisualProductionManifestEntryCandidateV1['combatGrammarIdentities'] {
  const identities = bindings.map((binding) => {
    const sourceIdentity =
      requireArenaV2WeaponCombatGrammarSourceIdentityByActionDefinitionIdCandidateV1(
        binding.collectionActionDefinitionId,
      );
    if (
      sourceIdentity.sourceContentHash
        !== ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1.contentHash
      || sourceIdentity.weaponDefinitionId !== binding.equipmentDefinitionId
      || sourceIdentity.context !== binding.actionContext
      || sourceIdentity.actionDefinitionId !== binding.collectionActionDefinitionId
      || sourceIdentity.coreVerb !== binding.coreVerb
      || sourceIdentity.failureRisk !== binding.failureRisk
    ) {
      throw new RangeError(
        `Arena V2武器${signature.weaponId}音画清单与唯一战斗语法身份漂移。`,
      );
    }
    return requireArenaV2FormalAudioCombatGrammarIdentityCandidateV1(sourceIdentity);
  });
  if (
    identities.length !== CONTEXT_ORDER.length
    || identities.some((identity, index) => identity.context !== CONTEXT_ORDER[index])
  ) {
    throw new RangeError(`Arena V2武器${signature.weaponId}音画清单缺少地面/空中语法身份。`);
  }
  return Object.freeze([identities[0]!, identities[1]!] as const);
}

function feedbackRecipes(
  signature: ArenaV2WeaponFeedbackSignatureCandidateV1,
  bindings: readonly ArenaV2WeaponFeedbackActionReadBindingCandidateV1[],
  grammarIdentities:
    ArenaV2WeaponAudiovisualProductionManifestEntryCandidateV1['combatGrammarIdentities'],
): readonly ArenaV2WeaponAudiovisualFeedbackRecipeCandidateV1[] {
  return Object.freeze(bindings.flatMap((binding, bindingIndex) => {
    const grammarIdentity = grammarIdentities[bindingIndex];
    if (
      grammarIdentity === undefined
      || grammarIdentity.actionDefinitionId !== binding.collectionActionDefinitionId
      || grammarIdentity.context !== binding.actionContext
    ) {
      throw new RangeError(`Arena V2武器${signature.weaponId}反馈配方语法身份漂移。`);
    }
    return MODE_ORDER.flatMap((modeKind) =>
      ATTACK_FEEDBACK_ORDER.map((feedbackKind) => Object.freeze({
        modeKind,
        actionContext: binding.actionContext,
        actionDefinitionId: binding.collectionActionDefinitionId,
        combatGrammarIdentity: grammarIdentity,
        feedbackKind,
        vfxCueId:
          `arena.cue.vfx.weapon-feedback.${signature.weaponId}.${binding.actionContext}.${feedbackKind}.${modeKind}.candidate.v1`,
        audioCueId:
          `arena.cue.audio.weapon-feedback.${signature.weaponId}.${binding.actionContext}.${feedbackKind}.${modeKind}.candidate.v1`,
        feedbackAnchorKind:
          feedbackKind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.ATTACK_EVADED
            ? 'held-weapon-tip' as const
            : 'body-impact' as const,
        worldDirectionSource:
          feedbackKind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.ATTACK_EVADED
            ? 'no-world-direction' as const
            : 'authority-horizontal-impulse' as const,
        reducedMotionKeepsResultShape: true as const,
        silentModeKeepsVisualAndText: true as const,
      })),
    );
  }));
}

function authoredPhaseAudioSlots(
  weaponId: WeaponId,
): readonly ArenaV2WeaponAuthoredPhaseAudioSlotCandidateV1[] {
  return Object.freeze(AUTHORED_PHASE_AUDIO_ORDER.map((phase) => Object.freeze({
    phase,
    desiredAudioAssetId: `arena.audio.weapon.${weaponId}.${phase}.authored.v1`,
    desiredCueId: `arena.cue.audio.weapon-phase.${weaponId}.${phase}.v1`,
    combatGrammarIdentity: null,
    status: 'authored-candidate-not-approved' as const,
  })));
}

function manifestEntry(
  signature: ArenaV2WeaponFeedbackSignatureCandidateV1,
): ArenaV2WeaponAudiovisualProductionManifestEntryCandidateV1 {
  const bindings = actionBindings(signature);
  const equipmentDefinitionId = bindings[0]!.equipmentDefinitionId;
  if (bindings.some((binding) => binding.equipmentDefinitionId !== equipmentDefinitionId)) {
    throw new RangeError(`Arena V2武器${signature.weaponId}动作绑定的Equipment身份漂移。`);
  }
  const grammarIdentities = combatGrammarIdentities(signature, bindings);
  const readability = requireSingle(
    ARENA_V2_WEAPON_FIRST_SCREEN_READABILITY_CATALOG_CANDIDATE_V1.filter((item) => (
      item.weaponId === signature.weaponId
      && item.equipmentDefinitionId === equipmentDefinitionId
    )),
    `Arena V2武器${signature.weaponId}可读性档案`,
  );
  const attachment = requireSingle(
    ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.equipmentAssetBindings.filter(
      (item) => item.equipmentDefinitionId === equipmentDefinitionId,
    ),
    `Arena V2武器${signature.weaponId}正式附件`,
  );
  const audio = requireSingle(
    ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.audioRecords.filter(
      (item) => (
        item.weaponDefinitionId === equipmentDefinitionId
        && item.actionSemantic !== null
      ),
    ),
    `Arena V2武器${signature.weaponId}命中音频`,
  );
  if (audio.weaponDefinitionId !== equipmentDefinitionId || audio.actionSemantic === null) {
    throw new RangeError(`Arena V2武器${signature.weaponId}命中音频Definition身份漂移。`);
  }
  const verbReadProfile = ARENA_V2_WEAPON_FEEDBACK_VERB_READ_PROFILES_CANDIDATE_V1[
    bindings[0]!.coreVerb
  ];
  const recipes = feedbackRecipes(signature, bindings, grammarIdentities);
  if (recipes.length !== 24) {
    throw new RangeError(`Arena V2武器${signature.weaponId}必须精确形成24个反馈配方。`);
  }
  return Object.freeze({
    weaponId: signature.weaponId,
    collectionOrder: bindings[0]!.collectionOrder,
    equipmentDefinitionId,
    actionBindings: bindings,
    combatGrammarIdentities: grammarIdentities,
    readability,
    signature,
    verbReadProfile,
    attachment: Object.freeze({
      assetId: attachment.attachmentAssetId,
      maturity: attachment.maturity,
    }),
    impactAudio: Object.freeze({
      audioAssetId: audio.audioAssetId,
      weaponDefinitionId: audio.weaponDefinitionId,
      semantic: audio.actionSemantic,
      maturity: audio.maturity,
      productionApproved: false as const,
    }),
    missingAuthoredPhaseAudio: [] as const,
    authoredPhaseAudioSlots: authoredPhaseAudioSlots(signature.weaponId),
    feedbackRecipes: recipes,
    feedbackRecipeCount: 24 as const,
    inputConcepts: Object.freeze(['direction', 'jump', 'primary'] as const),
    addsInput: false as const,
    ownsRuleOrHitAuthority: false as const,
    productionReady: false as const,
    validationStatus: 'not-run' as const,
  });
}

export const ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1 =
  Object.freeze(
    ARENA_V2_WEAPON_FEEDBACK_SIGNATURES_CANDIDATE_V1
      .map(manifestEntry)
      .sort((left, right) => left.collectionOrder - right.collectionOrder),
  );

const ALL_RECIPE_IDS = ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1
  .flatMap(({ feedbackRecipes: recipes }) => recipes.map(({ vfxCueId }) => vfxCueId));
const ALL_RECIPE_AUDIO_IDS =
  ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1
    .flatMap(({ feedbackRecipes: recipes }) => recipes.map(({ audioCueId }) => audioCueId));
const ALL_PHASE_AUDIO_ASSET_IDS =
  ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1
    .flatMap(({ authoredPhaseAudioSlots: slots }) => (
      slots.map(({ desiredAudioAssetId }) => desiredAudioAssetId)
    ));
const ALL_PHASE_AUDIO_CUE_IDS =
  ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1
    .flatMap(({ authoredPhaseAudioSlots: slots }) => (
      slots.map(({ desiredCueId }) => desiredCueId)
    ));
const ALL_COMBAT_GRAMMAR_ACTION_IDS =
  ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1
    .flatMap(({ combatGrammarIdentities: identities }) => (
      identities.map(({ actionDefinitionId }) => actionDefinitionId)
    ));
const ALL_IMPACT_AUDIO_ASSET_IDS =
  ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1
    .map(({ impactAudio }) => impactAudio.audioAssetId);
if (
  ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1.length !== 20
  || ALL_COMBAT_GRAMMAR_ACTION_IDS.length !== 40
  || new Set(ALL_COMBAT_GRAMMAR_ACTION_IDS).size !== 40
  || ALL_IMPACT_AUDIO_ASSET_IDS.length !== 20
  || new Set(ALL_IMPACT_AUDIO_ASSET_IDS).size !== 20
  || ALL_RECIPE_IDS.length !== 480
  || new Set(ALL_RECIPE_IDS).size !== 480
  || ALL_RECIPE_AUDIO_IDS.length !== 480
  || new Set(ALL_RECIPE_AUDIO_IDS).size !== 480
  || ALL_PHASE_AUDIO_ASSET_IDS.length !== 60
  || new Set(ALL_PHASE_AUDIO_ASSET_IDS).size !== 60
  || ALL_PHASE_AUDIO_CUE_IDS.length !== 60
  || new Set(ALL_PHASE_AUDIO_CUE_IDS).size !== 60
) throw new RangeError('Arena V2二十武器音画制作清单未闭合20把/480个武器反馈配方。');

export function requireArenaV2WeaponAudiovisualProductionManifestEntryCandidateV1(
  weaponId: WeaponId,
): ArenaV2WeaponAudiovisualProductionManifestEntryCandidateV1 {
  const entry = ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1.find(
    (candidate) => candidate.weaponId === weaponId,
  );
  if (!entry) throw new RangeError(`Arena V2音画制作清单没有武器${weaponId}。`);
  return entry;
}

export function requireArenaV2EquipmentAudiovisualProductionManifestEntryCandidateV1(
  equipmentDefinitionId: string,
): ArenaV2WeaponAudiovisualProductionManifestEntryCandidateV1 {
  const entry = ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_CANDIDATE_V1.find(
    (candidate) => candidate.equipmentDefinitionId === equipmentDefinitionId,
  );
  if (!entry) {
    throw new RangeError(`Arena V2音画制作清单没有Equipment ${equipmentDefinitionId}。`);
  }
  return entry;
}

export function requireArenaV2WeaponAudiovisualProductionManifestCombatGrammarIdentityCandidateV1(
  equipmentDefinitionId: string,
  actionContext: WeaponActionContextKindV1,
  value: unknown,
): ArenaV2FormalAudioCombatGrammarIdentityCandidateV1 {
  const entry = requireArenaV2EquipmentAudiovisualProductionManifestEntryCandidateV1(
    equipmentDefinitionId,
  );
  const expected = entry.combatGrammarIdentities.find(
    (identity) => identity.context === actionContext,
  );
  if (expected === undefined) {
    throw new RangeError(
      `Arena V2音画制作清单没有${equipmentDefinitionId}/${actionContext}语法身份。`,
    );
  }
  const identity = requireArenaV2FormalAudioCombatGrammarIdentityCandidateV1(value);
  if (
    identity.sourceContentHash !== expected.sourceContentHash
    || identity.weaponDefinitionId !== expected.weaponDefinitionId
    || identity.context !== expected.context
    || identity.actionDefinitionId !== expected.actionDefinitionId
    || identity.coreVerb !== expected.coreVerb
    || identity.failureRisk !== expected.failureRisk
    || identity.counterInputs.length !== expected.counterInputs.length
    || identity.counterInputs.some((input, index) => input !== expected.counterInputs[index])
  ) {
    throw new RangeError(
      `Arena V2音画制作清单${equipmentDefinitionId}/${actionContext}语法身份漂移。`,
    );
  }
  return expected;
}

export const ARENA_V2_TWENTY_WEAPON_AUDIOVISUAL_PRODUCTION_MANIFEST_METADATA_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    hardGate: false as const,
    weaponCount: 20 as const,
    actionBindingCount: 40 as const,
    weaponCombatGrammarSourceContentHash:
      ARENA_V2_WEAPON_COMBAT_GRAMMAR_PRESENTATION_SOURCE_CANDIDATE_V1.contentHash,
    weaponCombatGrammarIdentityCount: 40 as const,
    impactAudioLookupPolicy: 'exact-weapon-definition-id' as const,
    phaseCombatGrammarIdentity: null,
    modeSupplyMovementUnarmedCombatGrammarIdentity: null,
    stableWeaponFeedbackRecipeCount: 480 as const,
    uniqueWeaponFeedbackVfxCueCount: 480 as const,
    uniqueWeaponFeedbackAudioCueCount: 480 as const,
    sharedCoreVfxTextureCount: 5 as const,
    registeredAudioIdentityCount: 98 as const,
    registeredImpactAudioCount: 20 as const,
    authoredPhaseAudioMissingPerWeapon: 0 as const,
    authoredPhaseAudioMissingTotal: 0 as const,
    authoredPhaseAudioCandidatePerWeapon: 3 as const,
    authoredPhaseAudioCandidateTotal: 60 as const,
    stableAuthoredPhaseAudioAssetSlotCount: 60 as const,
    stableAuthoredPhaseAudioCueSlotCount: 60 as const,
    addsInput: false as const,
    ownsRuleOrHitAuthority: false as const,
    defaultSurfaceWired: false as const,
    defaultEntryWired: false as const,
    defaultNavigationWired: false as const,
    productionReady: false as const,
    validationStatus: 'not-run' as const,
  });
