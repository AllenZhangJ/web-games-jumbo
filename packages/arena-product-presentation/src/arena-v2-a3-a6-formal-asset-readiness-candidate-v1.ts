import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_IDENTITY,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY,
  type ArenaStage7FormalAssetBudgetArtifactV1,
  type ArenaStage7FormalAssetBudgetArtifactV2Candidate,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1,
  ARENA_V2_FORMAL_CHARACTER_PRESENTATION_RECORDS_CANDIDATE_V1,
  ARENA_V2_FORMAL_EQUIPMENT_ASSET_BINDINGS_CANDIDATE_V1,
  ARENA_V2_FORMAL_MAP_ASSET_BINDINGS_CANDIDATE_V1,
  ARENA_V2_FORMAL_MATERIAL_TEXTURE_ASSET_RECORDS_CANDIDATE_V1,
  ARENA_V2_FORMAL_MATERIAL_TEXTURE_BINDINGS_CANDIDATE_V1,
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
  ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1,
  ARENA_V2_FORMAL_VISUAL_ASSET_RECORDS_CANDIDATE_V1,
} from './arena-v2-formal-presentation-asset-catalog-candidate-v1.js';
import {
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY,
} from './arena-v2-a3-a6-production-approval-evidence-ledger-candidate-v1.js';

export const ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

type PhaseId = 'A3' | 'A4' | 'A5';
type MediaKind = 'audio' | 'model' | 'texture';
type Maturity = 'verified-intake-only' | 'authored-candidate-not-approved';

interface ProvenanceView {
  readonly sourceLocator: string;
  readonly sourceRevision: string;
  readonly licenseId: string;
  readonly rightsHolder: string;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
  readonly proofDocument: string;
}

interface CurrentCatalogAssetInput {
  readonly assetId: string;
  readonly phaseId: PhaseId;
  readonly role: string;
  readonly mediaKind: MediaKind;
  readonly maturity: Maturity;
  readonly artifactPath: string;
  readonly encodedMediaFormat: 'glb' | 'ogg' | 'png';
  readonly byteLength: number;
  readonly decodedTextureFormat: 'not-applicable' | 'rgba8';
  readonly widthPixels: number;
  readonly heightPixels: number;
  readonly sha256: string;
  readonly provenance: ProvenanceView;
}

const POLICY_ARTIFACT_BY_ID: ReadonlyMap<string, ArenaStage7FormalAssetBudgetArtifactV1> =
  new Map(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS.map((artifact) => (
    [artifact.id, artifact] as const
  )));
const V2_CANDIDATE_ARTIFACT_BY_ID: ReadonlyMap<
  string,
  ArenaStage7FormalAssetBudgetArtifactV2Candidate
> = new Map(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS.map((artifact) => (
  [artifact.id, artifact] as const
)));

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function freezeSorted<T extends Readonly<{ readonly assetId: string }>>(
  values: readonly T[],
): readonly T[] {
  return Object.freeze([...values].sort((left, right) => (
    compareText(left.assetId, right.assetId)
  )));
}

function v2CandidateKind(input: CurrentCatalogAssetInput) {
  if (input.mediaKind === 'audio') return 'audio' as const;
  if (input.mediaKind === 'texture') return 'texture' as const;
  if (input.role === 'map-model') return 'map-model' as const;
  if (input.role === 'weapon-attachment-model') return 'model-attachment' as const;
  if (
    input.role === 'playable-character-model'
    || input.role === 'survival-enemy-model'
  ) return 'character-model' as const;
  throw new RangeError(`Arena V2 V2预算候选不识别模型职责 ${input.role}。`);
}

function normalizeCurrentAsset(input: CurrentCatalogAssetInput) {
  const policyArtifact = POLICY_ARTIFACT_BY_ID.get(input.assetId);
  const exactPolicyArtifact = policyArtifact?.path === input.artifactPath ? policyArtifact : null;
  const candidateArtifact = V2_CANDIDATE_ARTIFACT_BY_ID.get(input.assetId);
  const expectedCandidateKind = v2CandidateKind(input);
  const exactCandidateArtifact = candidateArtifact?.path === input.artifactPath
    && candidateArtifact.kind === expectedCandidateKind
    && candidateArtifact.encodedMediaFormat === input.encodedMediaFormat
    && candidateArtifact.currentEncodedBytes === input.byteLength
    && candidateArtifact.maximumEncodedBytes === input.byteLength
    && candidateArtifact.decodedTextureFormat === input.decodedTextureFormat
    && candidateArtifact.widthPixels === input.widthPixels
    && candidateArtifact.heightPixels === input.heightPixels
    && candidateArtifact.sha256 === input.sha256
      ? candidateArtifact
      : null;
  const sourceApprovalRecorded = input.provenance.approvedBy !== null
    && input.provenance.approvedAt !== null;
  return Object.freeze({
    assetId: input.assetId,
    phaseId: input.phaseId,
    role: input.role,
    mediaKind: input.mediaKind,
    maturity: input.maturity,
    artifactPath: input.artifactPath,
    encodedMediaFormat: input.encodedMediaFormat,
    byteLength: input.byteLength,
    sha256: input.sha256,
    provenance: Object.freeze({
      sourceLocator: input.provenance.sourceLocator,
      sourceRevision: input.provenance.sourceRevision,
      licenseId: input.provenance.licenseId,
      rightsHolder: input.provenance.rightsHolder,
      proofDocument: input.provenance.proofDocument,
      sourceApprovalRecorded,
    }),
    budgetCoverage: exactPolicyArtifact === null
      ? Object.freeze({
        status: 'uncovered' as const,
        policyArtifactId: null,
        maximumEncodedBytes: null,
        withinEncodedBudget: null,
      })
      : Object.freeze({
        status: 'covered' as const,
        policyArtifactId: exactPolicyArtifact.id,
        maximumEncodedBytes: exactPolicyArtifact.maximumEncodedBytes,
        withinEncodedBudget: input.byteLength <= exactPolicyArtifact.maximumEncodedBytes,
      }),
    v2CandidateBudgetCoverage: exactCandidateArtifact === null
      ? Object.freeze({
        status: 'candidate-uncovered' as const,
        policyArtifactId: null,
        maximumEncodedBytes: null,
        withinCandidateEncodedCeiling: null,
      })
      : Object.freeze({
        status: 'candidate-covered' as const,
        policyArtifactId: exactCandidateArtifact.id,
        maximumEncodedBytes: exactCandidateArtifact.maximumEncodedBytes,
        withinCandidateEncodedCeiling:
          input.byteLength <= exactCandidateArtifact.maximumEncodedBytes,
      }),
    productionApproved: false as const,
    formalReady: false as const,
  });
}

function visualPhase(role: string): PhaseId {
  if (role === 'map-model' || role === 'survival-enemy-model') return 'A3';
  return 'A4';
}

const CURRENT_CATALOG_ASSETS = freezeSorted([
  ...ARENA_V2_FORMAL_VISUAL_ASSET_RECORDS_CANDIDATE_V1.map((record) => (
    normalizeCurrentAsset({
      assetId: record.runtimeDefinition.id,
      phaseId: visualPhase(record.role),
      role: record.role,
      mediaKind: 'model',
      maturity: record.maturity,
      artifactPath: record.artifactPath,
      encodedMediaFormat: record.encodedMediaFormat,
      byteLength: record.byteLength,
      decodedTextureFormat: 'not-applicable',
      widthPixels: 0,
      heightPixels: 0,
      sha256: record.sha256,
      provenance: record.provenance,
    })
  )),
  ...ARENA_V2_FORMAL_MATERIAL_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.map((record) => (
    normalizeCurrentAsset({
      assetId: record.textureAssetId,
      phaseId: 'A4',
      role: record.role,
      mediaKind: 'texture',
      maturity: record.maturity,
      artifactPath: record.artifactPath,
      encodedMediaFormat: record.encodedMediaFormat,
      byteLength: record.byteLength,
      decodedTextureFormat: record.decodedTextureFormat,
      widthPixels: record.width,
      heightPixels: record.height,
      sha256: record.sha256,
      provenance: record.provenance,
    })
  )),
  ...ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.map((record) => {
    const weaponPhaseAudio = record.cueId?.startsWith(
      'arena.cue.audio.weapon-phase.',
    ) ?? false;
    return normalizeCurrentAsset({
      assetId: record.audioAssetId,
      phaseId: record.actionSemantic === null && !weaponPhaseAudio ? 'A5' : 'A4',
      role: weaponPhaseAudio
        ? 'weapon-phase-audio'
        : record.actionSemantic === null
          ? 'mode-or-supply-audio'
          : 'weapon-impact-audio',
      mediaKind: 'audio',
      maturity: record.maturity,
      artifactPath: record.artifactPath,
      encodedMediaFormat: record.encodedMediaFormat,
      byteLength: record.byteLength,
      decodedTextureFormat: 'not-applicable',
      widthPixels: 0,
      heightPixels: 0,
      sha256: record.sha256,
      provenance: record.provenance,
    });
  }),
  ...ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.map((record) => (
    normalizeCurrentAsset({
      assetId: record.vfxAssetId,
      phaseId: 'A5',
      role: 'core-feedback-vfx-texture',
      mediaKind: 'texture',
      maturity: record.maturity,
      artifactPath: record.artifactPath,
      encodedMediaFormat: record.encodedMediaFormat,
      byteLength: record.byteLength,
      decodedTextureFormat: record.decodedTextureFormat,
      widthPixels: record.width,
      heightPixels: record.height,
      sha256: record.sha256,
      provenance: record.provenance,
    })
  )),
]);

const CURRENT_ASSET_BY_ID = new Map(CURRENT_CATALOG_ASSETS.map((asset) => (
  [asset.assetId, asset] as const
)));
if (CURRENT_ASSET_BY_ID.size !== CURRENT_CATALOG_ASSETS.length) {
  throw new RangeError('Arena V2 A3–A6正式资产目录存在重复assetId。');
}

function requiredAsset(assetId: string, owner: string) {
  const asset = CURRENT_ASSET_BY_ID.get(assetId);
  if (asset === undefined) throw new RangeError(`${owner}缺少正式资产登记 ${assetId}。`);
  return asset;
}

const MATERIAL_TEXTURE_DEPENDENCY_CLOSURE = Object.freeze(
  ARENA_V2_FORMAL_MATERIAL_TEXTURE_BINDINGS_CANDIDATE_V1.map((binding) => {
    const consumer = requiredAsset(binding.consumerVisualAssetId, binding.bindingId);
    const texture = requiredAsset(binding.textureAssetId, binding.bindingId);
    return Object.freeze({
      bindingId: binding.bindingId,
      consumerVisualAssetId: binding.consumerVisualAssetId,
      textureAssetId: binding.textureAssetId,
      relationship: binding.relationship,
      gltfImageUri: binding.gltfImageUri,
      consumerMaturity: consumer.maturity,
      textureMaturity: texture.maturity,
      textureBudgetCoverage: texture.budgetCoverage,
      productionApproved: false as const,
      formalReady: false as const,
    });
  }),
);

const PLAYABLE_CHARACTER_IDENTITIES = Object.freeze(
  ARENA_V2_FORMAL_CHARACTER_PRESENTATION_RECORDS_CANDIDATE_V1
    .filter(({ role }) => role === 'playable-character-model')
    .map(({ maturity, presentation }) => Object.freeze({
      characterDefinitionId: presentation.characterDefinitionId,
      presentationDefinitionId: presentation.id,
      modelAssetId: presentation.modelAssetId,
      materialProfileId: presentation.materialProfileId,
      maturity,
      modelBudgetCoverage: requiredAsset(
        presentation.modelAssetId,
        presentation.characterDefinitionId,
      ).budgetCoverage.status,
      productionApproved: false as const,
      formalReady: false as const,
    })),
);

const SURVIVAL_ENEMY_IDENTITIES = Object.freeze(
  ARENA_V2_FORMAL_CHARACTER_PRESENTATION_RECORDS_CANDIDATE_V1
    .filter(({ role }) => role === 'survival-enemy-model')
    .map(({ maturity, presentation }) => Object.freeze({
      characterDefinitionId: presentation.characterDefinitionId,
      presentationDefinitionId: presentation.id,
      modelAssetId: presentation.modelAssetId,
      materialProfileId: presentation.materialProfileId,
      maturity,
      modelBudgetCoverage: requiredAsset(
        presentation.modelAssetId,
        presentation.characterDefinitionId,
      ).budgetCoverage.status,
      productionApproved: false as const,
      formalReady: false as const,
    })),
);

const WEAPON_IDENTITIES = Object.freeze(
  ARENA_V2_FORMAL_EQUIPMENT_ASSET_BINDINGS_CANDIDATE_V1.map((binding) => {
    const asset = requiredAsset(binding.attachmentAssetId, binding.equipmentDefinitionId);
    return Object.freeze({
      equipmentDefinitionId: binding.equipmentDefinitionId,
      attachmentAssetId: binding.attachmentAssetId,
      maturity: binding.maturity,
      budgetCoverage: asset.budgetCoverage.status,
      sourceApprovalRecorded: asset.provenance.sourceApprovalRecorded,
      productionApproved: false as const,
      formalReady: false as const,
    });
  }),
);

const MAP_IDENTITIES = Object.freeze(
  ARENA_V2_FORMAL_MAP_ASSET_BINDINGS_CANDIDATE_V1.map((binding) => {
    const asset = requiredAsset(binding.mapVisualAssetId, binding.mapDefinitionId);
    return Object.freeze({
      mapDefinitionId: binding.mapDefinitionId,
      mapVisualAssetId: binding.mapVisualAssetId,
      maturity: binding.maturity,
      budgetCoverage: asset.budgetCoverage.status,
      sourceApprovalRecorded: asset.provenance.sourceApprovalRecorded,
      productionApproved: false as const,
      formalReady: false as const,
    });
  }),
);

if (PLAYABLE_CHARACTER_IDENTITIES.length !== 6) {
  throw new RangeError('Arena V2 A3–A6候选要求精确6个现有可玩角色表现身份。');
}
if (SURVIVAL_ENEMY_IDENTITIES.length !== 1) {
  throw new RangeError('Arena V2 A3–A6候选要求精确1个现有生存敌人表现身份。');
}
if (WEAPON_IDENTITIES.length !== 20 || MAP_IDENTITIES.length !== 2) {
  throw new RangeError('Arena V2 A3–A6候选要求精确20武器与2地图绑定。');
}
if (ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.length !== 5) {
  throw new RangeError('Arena V2 A3–A6候选要求精确5个现有核心反馈VFX纹理身份。');
}
if (ARENA_V2_FORMAL_MATERIAL_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.length !== 3) {
  throw new RangeError('Arena V2 A3–A6候选要求精确3个现有KayKit材质纹理身份。');
}

const CATALOG_POLICY_KEYS = new Set(CURRENT_CATALOG_ASSETS
  .filter(({ budgetCoverage }) => budgetCoverage.status === 'covered')
  .map(({ assetId, artifactPath }) => `${assetId}\u0000${artifactPath}`));

const POLICY_ONLY_ARTIFACTS = Object.freeze(
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS
    .filter((artifact) => !CATALOG_POLICY_KEYS.has(`${artifact.id}\u0000${artifact.path}`))
    .map((artifact) => Object.freeze({
      policyArtifactId: artifact.id,
      artifactPath: artifact.path,
      kind: artifact.kind,
      maximumEncodedBytes: artifact.maximumEncodedBytes,
      gap: 'not-registered-as-independent-formal-presentation-catalog-record' as const,
    })),
);

const UNCOVERED_ASSET_IDS = Object.freeze(CURRENT_CATALOG_ASSETS
  .filter(({ budgetCoverage }) => budgetCoverage.status === 'uncovered')
  .map(({ assetId }) => assetId));
const V2_CANDIDATE_UNCOVERED_ASSET_IDS = Object.freeze(CURRENT_CATALOG_ASSETS
  .filter(({ v2CandidateBudgetCoverage }) => (
    v2CandidateBudgetCoverage.status === 'candidate-uncovered'
  ))
  .map(({ assetId }) => assetId));
const V2_CANDIDATE_COVERED_ASSET_IDS = Object.freeze(CURRENT_CATALOG_ASSETS
  .filter(({ v2CandidateBudgetCoverage }) => (
    v2CandidateBudgetCoverage.status === 'candidate-covered'
  ))
  .map(({ assetId }) => assetId));
const UNAPPROVED_ASSET_IDS = Object.freeze(CURRENT_CATALOG_ASSETS
  .filter(({ productionApproved }) => !productionApproved)
  .map(({ assetId }) => assetId));

if (
  CURRENT_CATALOG_ASSETS.length !== 130
  || ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS.length !== 130
  || V2_CANDIDATE_COVERED_ASSET_IDS.length !== 130
  || V2_CANDIDATE_UNCOVERED_ASSET_IDS.length !== 0
) {
  throw new RangeError(
    'Arena V2正式Catalog与Stage7预算V2候选必须精确闭合130/130。',
  );
}
if (
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS.length !== 10
  || POLICY_ONLY_ARTIFACTS.length !== 0
  || UNCOVERED_ASSET_IDS.length !== 120
) {
  throw new RangeError('Arena V2预算V2投影不得静默改写V1的10 covered / 120 uncovered真值。');
}

const A6_REUSE_BINDINGS = Object.freeze({
  weaponPreviewAssetIds: Object.freeze(WEAPON_IDENTITIES.map(({ attachmentAssetId }) => (
    attachmentAssetId
  ))),
  mapPreviewAssetIds: Object.freeze(MAP_IDENTITIES.map(({ mapVisualAssetId }) => mapVisualAssetId)),
  productionApprovalLedgerIdentity:
    ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY,
  productionApprovedPreviewAssetIds: Object.freeze([] as readonly string[]),
  assetUsePermittedPreviewAssetIds: Object.freeze([] as readonly string[]),
  fallbackPreviewAssetIds: Object.freeze([
    ...WEAPON_IDENTITIES.map(({ attachmentAssetId }) => attachmentAssetId),
    ...MAP_IDENTITIES.map(({ mapVisualAssetId }) => mapVisualAssetId),
  ]),
  requestTokenCount: 0 as const,
  releaseTokenCount: 0 as const,
  futureEnablementRequiresNewApprovalLedgerVersionAndIndependentGate: true as const,
  addsAssets: false as const,
  choosesGameplayFacts: false as const,
  formalReady: false as const,
});

const PRODUCTION_APPROVAL_MISSING_ASSET_IDS = Object.freeze(
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries
    .map(({ assetId }) => assetId),
);
const SOURCE_APPROVAL_RECORDED_ASSET_IDS = Object.freeze(
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries
    .filter(({ sourceApprovalRecorded }) => sourceApprovalRecorded)
    .map(({ assetId }) => assetId),
);

function createCandidate() {
  const core = Object.freeze({
    schemaVersion: ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.a3-a6.formal-asset-readiness.candidate.v1' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    formalReady: false as const,
    hardGate: false as const,
    defaultCompositionWired: false as const,
    defaultEntryWired: false as const,
    createsOrModifiesAssets: false as const,
    grantsApproval: false as const,
    participatesInGameplayAuthority: false as const,
    p7AdvanceComputedHere: false as const,
    currentCatalogContentHash:
      ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.contentHash,
    formalBudgetPolicyIdentity: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_IDENTITY,
    proposedFormalBudgetPolicyV2Identity:
      ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY,
    playableCharacterIdentities: PLAYABLE_CHARACTER_IDENTITIES,
    survivalEnemyIdentities: SURVIVAL_ENEMY_IDENTITIES,
    weaponIdentities: WEAPON_IDENTITIES,
    mapIdentities: MAP_IDENTITIES,
    catalogAssets: CURRENT_CATALOG_ASSETS,
    materialTextureDependencyClosure: MATERIAL_TEXTURE_DEPENDENCY_CLOSURE,
    a6ReuseBindings: A6_REUSE_BINDINGS,
    policyOnlyArtifacts: POLICY_ONLY_ARTIFACTS,
    uncoveredAssetIds: UNCOVERED_ASSET_IDS,
    v2CandidateBudgetCoverageProjection: Object.freeze({
      status: 'candidate-coverage-only' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      coveredAssetIds: V2_CANDIDATE_COVERED_ASSET_IDS,
      uncoveredAssetIds: V2_CANDIDATE_UNCOVERED_ASSET_IDS,
      preservedV1UncoveredAssetIds: UNCOVERED_ASSET_IDS,
      encodedMediaFormatSourceProjectionClosed: true as const,
      textureDimensionSourceProjectionClosed: true as const,
      productionApproved: false as const,
      assetUsePermitted: false as const,
      hardGate: false as const,
      hardGateUsable: false as const,
      defaultFormalBundleConsumes: false as const,
      defaultPreloaderConsumes: false as const,
      defaultEntryConsumes: false as const,
    }),
    productionApprovalEvidenceProjection: Object.freeze({
      status: 'evidence-gap-projection-only' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      ledgerIdentity:
        ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY,
      sourceApprovalRecordedAssetIds: SOURCE_APPROVAL_RECORDED_ASSET_IDS,
      productionApprovalMissingAssetIds: PRODUCTION_APPROVAL_MISSING_ASSET_IDS,
      productionApprovedAssetIds: Object.freeze([]),
      budgetCandidateCoveredAssetIds: V2_CANDIDATE_COVERED_ASSET_IDS,
      grantsApproval: false as const,
      assetUsePermitted: false as const,
      formalReady: false as const,
      hardGate: false as const,
      defaultFormalBundleConsumes: false as const,
      defaultPreloaderConsumes: false as const,
      defaultEntryConsumes: false as const,
    }),
    unapprovedAssetIds: UNAPPROVED_ASSET_IDS,
    coverage: Object.freeze({
      playableCharacterIdentities: PLAYABLE_CHARACTER_IDENTITIES.length,
      survivalEnemyIdentities: SURVIVAL_ENEMY_IDENTITIES.length,
      weaponIdentities: WEAPON_IDENTITIES.length,
      mapIdentities: MAP_IDENTITIES.length,
      vfxTextureIdentities: ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.length,
      formalMaterialTextureIdentities:
        ARENA_V2_FORMAL_MATERIAL_TEXTURE_ASSET_RECORDS_CANDIDATE_V1.length,
      formalMaterialTextureBindings: MATERIAL_TEXTURE_DEPENDENCY_CLOSURE.length,
      audioIdentities: ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.length,
      weaponActionAudioIdentities:
        ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.filter(({ actionSemantic }) => (
          actionSemantic !== null
        )).length,
      weaponImpactAudioIdentities:
        ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1
          .coverage.weaponImpactAudioIdentities.implemented,
      additionalUnarmedImpactAudioIdentities:
        ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1
          .coverage.additionalUnarmedImpactAudioIdentities.implemented,
      weaponPhaseAudioIdentities:
        ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.filter(({ cueId }) => (
          cueId?.startsWith('arena.cue.audio.weapon-phase.') ?? false
        )).length,
      modeSupplyAudioIdentities:
        ARENA_V2_FORMAL_AUDIO_ASSET_RECORDS_CANDIDATE_V1.filter(({
          actionSemantic,
          cueId,
        }) => (
          actionSemantic === null
          && !(cueId?.startsWith('arena.cue.audio.weapon-phase.') ?? false)
        )).length,
      modeFeedbackAudioIdentities:
        ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1
          .coverage.modeFeedbackAudioIdentities.implemented,
      supplyFeedbackAudioIdentities:
        ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1
          .coverage.supplyFeedbackAudioIdentities.implemented,
      budgetPolicyArtifacts: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS.length,
      catalogAssetsCoveredByPolicy:
        CURRENT_CATALOG_ASSETS.length - UNCOVERED_ASSET_IDS.length,
      catalogAssetsUncoveredByPolicy: UNCOVERED_ASSET_IDS.length,
      policyOnlyArtifacts: POLICY_ONLY_ARTIFACTS.length,
      v2CandidateBudgetPolicyArtifacts:
        ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS.length,
      catalogAssetsCoveredByV2Candidate: V2_CANDIDATE_COVERED_ASSET_IDS.length,
      catalogAssetsUncoveredByV2Candidate: V2_CANDIDATE_UNCOVERED_ASSET_IDS.length,
      productionApprovalEvidenceAssets:
        ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1
          .summary.assetCount,
      sourceApprovalRecordedAssets: SOURCE_APPROVAL_RECORDED_ASSET_IDS.length,
      productionApprovedAssets: 0 as const,
      productionApprovalMissingAssets: PRODUCTION_APPROVAL_MISSING_ASSET_IDS.length,
    }),
    deferredGates: Object.freeze([
      'A0.3真人盲测仍为0/10',
      'A1.1必须按当前source identity重建',
      '地图、VFX与项目自产音频尚无协调批准',
      '扩展武器、地图、VFX与大部分音频不在现行正式预算白名单',
      'V2仅精确冻结当前Catalog字节身份，结构上限/产品余量/批准未解决且不可用于hard gate',
      '逐资产生产批准证据账本当前130/130均为missing-not-approved，不授予资产使用权',
      '三端截图、设备、真人、性能、生命周期释放与Final证据未运行',
    ] as const),
  });
  return Object.freeze({
    ...core,
    readinessIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 A3-A6 formal asset readiness candidate V1',
    ),
  });
}

export const ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1 = createCandidate();

export type ArenaV2A3A6FormalAssetReadinessCandidateV1 =
  typeof ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1;
