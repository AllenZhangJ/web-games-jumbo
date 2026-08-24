import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  WEAPON_ACTION_CONTEXT_V1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
  ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1,
  ARENA_V2_WEAPON_COUNTERPLAY_PROFILES_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1,
  ARENA_V2_FORMAL_ACTION_PRESENTATIONS_CANDIDATE_V1,
  ARENA_V2_FORMAL_CORE_FEEDBACK_VFX_CUE_IDS_CANDIDATE_V1,
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
  ARENA_V2_WEAPON_FEEDBACK_ACTION_READ_BINDINGS_CANDIDATE_V1,
  isArenaV2FormalAssetProductionApprovedCandidateV1,
  isArenaV2FormalModelLoadPermittedCandidateV1,
  resolveArenaV2FormalAudioCueCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';

export const ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const WEAPON_PHASES = Object.freeze(['windup', 'release', 'recovery'] as const);

const COUNTERPLAY_BY_WEAPON_ID = new Map(
  ARENA_V2_WEAPON_COUNTERPLAY_PROFILES_CANDIDATE_V1.map((profile) => (
    [profile.weaponId, profile] as const
  )),
);
const ATTACHMENT_BY_EQUIPMENT_ID: ReadonlyMap<
  string,
  typeof ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.weaponIdentities[number]
> = new Map(
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.weaponIdentities.map((identity) => (
    [identity.equipmentDefinitionId, identity] as const
  )),
);
const CATALOG_ASSET_BY_ID = new Map(
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1.catalogAssets.map((asset) => (
    [asset.assetId, asset] as const
  )),
);

function weaponActionBindings(weaponId: string) {
  return ARENA_V2_WEAPON_FEEDBACK_ACTION_READ_BINDINGS_CANDIDATE_V1
    .filter((binding) => binding.weaponId === weaponId)
    .sort((left, right) => (
      left.actionContext === right.actionContext
        ? 0
        : left.actionContext === 'ground'
          ? -1
          : 1
    ));
}

function requiredCatalogAsset(assetId: string, owner: string) {
  const asset = CATALOG_ASSET_BY_ID.get(assetId);
  if (asset === undefined) {
    throw new RangeError(`Arena V2逐武器准入${owner}缺少资产${assetId}。`);
  }
  return asset;
}

function resolveImpactAudio(weaponId: string, actionDefinitionId: string) {
  return resolveArenaV2FormalAudioCueCandidateV1({
    sourceEventId: `arena-v2.weapon-readiness.${weaponId}.impact.candidate.v1`,
    cueId: `arena.cue.audio.weapon-impact.${weaponId}.candidate.v1`,
    actionDefinitionId,
    bus: 'SFX',
    gainDb: -6,
    priority: 1,
    deterministicVariantIndex: 0,
    maximumConcurrentVoices: 8,
    overflowPolicy: 'drop-lowest-priority',
  });
}

function resolvePhaseAudio(
  weaponId: string,
  actionDefinitionId: string,
  phase: typeof WEAPON_PHASES[number],
) {
  return resolveArenaV2FormalAudioCueCandidateV1({
    sourceEventId: `arena-v2.weapon-readiness.${weaponId}.${phase}.candidate.v1`,
    cueId: `arena.cue.audio.weapon-phase.${weaponId}.${phase}.v1`,
    actionDefinitionId,
    bus: 'SFX',
    gainDb: -6,
    priority: 1,
    deterministicVariantIndex: 0,
    maximumConcurrentVoices: 8,
    overflowPolicy: 'drop-lowest-priority',
  });
}

function createWeaponReadiness(
  weapon: typeof ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1[number],
) {
  const counterplay = COUNTERPLAY_BY_WEAPON_ID.get(weapon.id);
  if (counterplay === undefined) {
    throw new RangeError(`Arena V2逐武器准入缺少反制档案${weapon.id}。`);
  }
  const attachment = ATTACHMENT_BY_EQUIPMENT_ID.get(weapon.equipment.id);
  if (attachment === undefined) {
    throw new RangeError(`Arena V2逐武器准入缺少挂载资产${weapon.equipment.id}。`);
  }
  const bindings = weaponActionBindings(weapon.id);
  if (bindings.length !== 2
    || bindings[0]?.actionContext !== 'ground'
    || bindings[1]?.actionContext !== 'aerial'
    || bindings[0].actionDefinitionId !== counterplay.groundActionDefinitionId
    || bindings[1].actionDefinitionId !== counterplay.aerialActionDefinitionId) {
    throw new RangeError(`Arena V2逐武器准入${weapon.id}动作绑定未闭合地面/空中语义。`);
  }
  const [groundGrammarContext, aerialGrammarContext] = weapon.grammar.contexts;
  if (weapon.grammar.requiredInput !== ACTION_INPUT_CHANNEL.PRIMARY
    || weapon.grammar.contexts.length !== 2
    || groundGrammarContext?.kind !== WEAPON_ACTION_CONTEXT_V1.GROUND
    || aerialGrammarContext?.kind !== WEAPON_ACTION_CONTEXT_V1.AERIAL
    || groundGrammarContext.actionDefinitionId !== bindings[0].actionDefinitionId
    || aerialGrammarContext.actionDefinitionId !== bindings[1].actionDefinitionId
    || weapon.grammar.survivalGrowth.semanticsLocked !== true
    || weapon.grammar.survivalGrowth.addsInput !== false
    || weapon.grammar.survivalGrowth.addsAction !== false
    || weapon.actions.some(({ input }) => (
      input.channel !== ACTION_INPUT_CHANNEL.PRIMARY
      || input.trigger !== ACTION_INPUT_TRIGGER.PRESSED
    ))) {
    throw new RangeError(`Arena V2逐武器准入${weapon.id}引入了约定外操作。`);
  }

  const actionContexts = Object.freeze(bindings.map((binding) => {
    const presentation = ARENA_V2_FORMAL_ACTION_PRESENTATIONS_CANDIDATE_V1[
      binding.actionDefinitionId
    ];
    if (presentation === undefined) {
      throw new RangeError(`Arena V2逐武器准入缺少动作表现${binding.actionDefinitionId}。`);
    }
    return Object.freeze({
      actionContext: binding.actionContext,
      actionDefinitionId: binding.actionDefinitionId,
      collectionActionDefinitionId: binding.collectionActionDefinitionId,
      inputChannel: 'primary' as const,
      coreVerb: binding.coreVerb,
      identityCueId: binding.identityCueId,
      actionPresentationRegistered: true as const,
      actionPresentationSemantic: presentation.semantic,
      actionPresentationClipName: presentation.clipName,
    });
  }));

  const attachmentAsset = requiredCatalogAsset(
    attachment.attachmentAssetId,
    `${weapon.id}.attachment`,
  );
  const attachmentProductionApproved =
    isArenaV2FormalModelLoadPermittedCandidateV1(attachmentAsset.assetId);
  const impactResolution = resolveImpactAudio(weapon.id, counterplay.groundActionDefinitionId);
  const impactAsset = impactResolution.audioAssetId === null
    ? null
    : requiredCatalogAsset(impactResolution.audioAssetId, `${weapon.id}.impact-audio`);
  const impactAudioProductionApproved = impactAsset !== null
    && isArenaV2FormalAssetProductionApprovedCandidateV1(impactAsset.assetId);
  const phaseAudio = Object.freeze(WEAPON_PHASES.map((phase) => {
    const resolution = resolvePhaseAudio(
      weapon.id,
      counterplay.groundActionDefinitionId,
      phase,
    );
    const asset = resolution.audioAssetId === null
      ? null
      : requiredCatalogAsset(resolution.audioAssetId, `${weapon.id}.${phase}-audio`);
    return Object.freeze({
      phase,
      cueId: resolution.cueId,
      registered: resolution.ready,
      audioAssetId: resolution.audioAssetId,
      runtimeSourceKey: resolution.runtimeSourceKey,
      maturity: resolution.maturity,
      productionResolutionApproved: resolution.approved,
      productionApproved: asset !== null
        && isArenaV2FormalAssetProductionApprovedCandidateV1(asset.assetId),
    });
  }));
  const coreFeedbackVfx = Object.freeze(
    ARENA_V2_FORMAL_CORE_FEEDBACK_VFX_CUE_IDS_CANDIDATE_V1.map((cueId) => {
      const record = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1
        .vfxTextureRecords.find((candidate) => candidate.cueId === cueId);
      if (record === undefined) {
        throw new RangeError(`Arena V2逐武器准入${weapon.id}缺少VFX ${cueId}。`);
      }
      const asset = requiredCatalogAsset(record.vfxAssetId, `${weapon.id}.${cueId}`);
      return Object.freeze({
        cueId,
        vfxAssetId: record.vfxAssetId,
        registered: true as const,
        maturity: record.maturity,
        productionApproved:
          isArenaV2FormalAssetProductionApprovedCandidateV1(asset.assetId),
      });
    }),
  );

  const blockers: string[] = [
    'weapon-definition-validation-not-run',
    'weapon-counterplay-validation-not-run',
    'weapon-runtime-evidence-not-run',
    'weapon-deterministic-replay-evidence-not-run',
    'weapon-balance-evidence-not-run',
    'weapon-device-evidence-not-run',
    'weapon-human-evidence-not-run',
  ];
  if (!attachmentProductionApproved) {
    blockers.push('weapon-attachment-production-approval-missing');
  }
  if (!impactResolution.ready) blockers.push('weapon-impact-audio-registration-missing');
  if (!impactAudioProductionApproved) {
    blockers.push('weapon-impact-audio-production-approval-missing');
  }
  if (phaseAudio.some(({ registered }) => !registered)) {
    blockers.push('weapon-phase-audio-registration-missing');
  }
  if (phaseAudio.some(({ productionApproved }) => !productionApproved)) {
    blockers.push('weapon-phase-audio-production-approval-missing');
  }
  if (coreFeedbackVfx.some(({ registered }) => !registered)) {
    blockers.push('core-feedback-vfx-registration-missing');
  }
  if (coreFeedbackVfx.some(({ productionApproved }) => !productionApproved)) {
    blockers.push('core-feedback-vfx-production-approval-missing');
  }

  const authority = Object.freeze({
    schemaVersion: ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_CANDIDATE_V1_SCHEMA_VERSION,
    readinessId: `arena-v2.single-weapon-production-readiness.${weapon.id}.candidate.v1`,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    weaponId: weapon.id,
    collectionOrder: weapon.collectionOrder,
    sourceBatch: weapon.sourceBatch,
    learningProblem: weapon.learningProblem,
    identities: Object.freeze({
      equipmentDefinitionId: weapon.equipment.id,
      groundActionDefinitionId: counterplay.groundActionDefinitionId,
      aerialActionDefinitionId: counterplay.aerialActionDefinitionId,
      grammarDefinitionId: weapon.grammar.id,
      weaponBundleContentHash: weapon.contentHash,
      equipmentDefinitionHash: createDeterministicDataHash(
        weapon.equipment,
        `Arena V2 ${weapon.id} equipment definition`,
      ),
      grammarDefinitionHash: createDeterministicDataHash(
        weapon.grammar,
        `Arena V2 ${weapon.id} grammar definition`,
      ),
      actionDefinitionHashes: Object.freeze(weapon.actions.map((action) => (
        createDeterministicDataHash(action, `Arena V2 ${action.id} action definition`)
      ))),
      counterplayProfileId: counterplay.profileId,
      counterplaySignature: counterplay.counterplaySignature,
      counterplayContentHash: counterplay.contentHash,
    }),
    inputContract: Object.freeze({
      authorityContractHash:
        ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.contentHash,
      concepts: ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.concepts,
      inputFrameProjection:
        ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.inputFrameProjection,
      requiredWeaponActionInput: ACTION_INPUT_CHANNEL.PRIMARY,
      requiredWeaponActionTrigger: ACTION_INPUT_TRIGGER.PRESSED,
      primaryPressHoldRelease:
        ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.primaryAttackSemantics,
      addsInput: false as const,
      addsAction: false as const,
      crouchEnabled: ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.crouchEnabled,
      blockEnabled: ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.blockEnabled,
      dashEnabled: ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.dashEnabled,
      slamEnabled: ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.slamEnabled,
    }),
    actionContexts,
    attachment: Object.freeze({
      attachmentAssetId: attachment.attachmentAssetId,
      registered: true as const,
      maturity: attachment.maturity,
      budgetCoverage: attachment.budgetCoverage,
      sourceApprovalRecorded: attachment.sourceApprovalRecorded,
      productionApproved: attachmentProductionApproved,
      formalReady: attachment.formalReady,
    }),
    impactAudio: Object.freeze({
      cueId: impactResolution.cueId,
      actionDefinitionId: impactResolution.actionDefinitionId,
      registered: impactResolution.ready,
      audioAssetId: impactResolution.audioAssetId,
      runtimeSourceKey: impactResolution.runtimeSourceKey,
      maturity: impactResolution.maturity,
      productionResolutionApproved: impactResolution.approved,
      productionApproved: impactAudioProductionApproved,
    }),
    phaseAudio,
    coreFeedbackVfx,
    evidence: Object.freeze({
      definitionClosure: 'code-written-not-run' as const,
      counterplayClosure: 'code-written-not-run' as const,
      runtimeEvidence: 'not-run' as const,
      deterministicReplayEvidence: 'not-run' as const,
      balanceEvidence: 'not-run' as const,
      deviceEvidence: 'not-run' as const,
      humanEvidence: 'not-run' as const,
      assetApproval: 'blocked' as const,
    }),
    scoreEligible: false as const,
    computedScore: null,
    blockers: Object.freeze(blockers),
    productionRegistrationPermitted: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    rollbackUnit: Object.freeze({
      kind: 'single-weapon' as const,
      weaponId: weapon.id,
      equipmentDefinitionId: weapon.equipment.id,
      actionDefinitionIds: Object.freeze([
        counterplay.groundActionDefinitionId,
        counterplay.aerialActionDefinitionId,
      ]),
      mayRollbackOtherWeapons: false as const,
    }),
  });
  return Object.freeze({
    ...authority,
    readinessContentHash: createDeterministicDataHash(
      authority,
      `Arena V2 single weapon production readiness ${weapon.id}`,
    ),
  });
}

export const ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_ENTRIES_CANDIDATE_V1 =
  Object.freeze(ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(createWeaponReadiness));

if (ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_ENTRIES_CANDIDATE_V1.length !== 20
  || COUNTERPLAY_BY_WEAPON_ID.size !== 20
  || ATTACHMENT_BY_EQUIPMENT_ID.size !== 20
  || ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_ENTRIES_CANDIDATE_V1.some((entry, index) => (
    entry.collectionOrder !== index + 1
    || entry.actionContexts.length !== 2
    || entry.phaseAudio.length !== 3
    || entry.coreFeedbackVfx.length !== 5
    || entry.blockers.length === 0
    || entry.productionRegistrationPermitted
    || entry.defaultRegistryWired
    || entry.rollbackUnit.mayRollbackOtherWeapons
  ))) {
  throw new RangeError('Arena V2逐武器生产准入矩阵未闭合20把独立门禁。');
}

if (new Set(ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_ENTRIES_CANDIDATE_V1.map(
  ({ readinessId }) => readinessId,
)).size !== 20
  || new Set(ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_ENTRIES_CANDIDATE_V1.map(
    ({ readinessContentHash }) => readinessContentHash,
  )).size !== 20) {
  throw new RangeError('Arena V2逐武器生产准入矩阵存在重复身份或内容哈希。');
}

const MATRIX_AUTHORITY = Object.freeze({
  schemaVersion: ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.single-weapon-production-readiness-matrix.candidate.v1' as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  weaponCount: 20 as const,
  independentlyBlockedWeaponCount: 20 as const,
  productionRegistrationPermittedWeaponCount: 0 as const,
  independentRollbackUnitCount: 20 as const,
  groupRegistrationPermitted: false as const,
  allOrNothingRegistrationAllowed: false as const,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  acceptsCallerSuppliedApproval: false as const,
  productionApprovalUsesSharedLedgerIndex: true as const,
  modelApprovalRequiresExternalTextureDependencyClosure: true as const,
  weapons: ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_ENTRIES_CANDIDATE_V1,
});

export const ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1 =
  Object.freeze({
    ...MATRIX_AUTHORITY,
    contentHash: createDeterministicDataHash(
      MATRIX_AUTHORITY,
      'Arena V2 single weapon production readiness matrix candidate V1',
    ),
  });

export type ArenaV2SingleWeaponProductionReadinessEntryCandidateV1 =
  typeof ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_ENTRIES_CANDIDATE_V1[number];
