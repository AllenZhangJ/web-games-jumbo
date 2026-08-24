import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceSha256,
} from '@number-strategy-jump/arena-evidence-contracts';
import {
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2,
  ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2,
  ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_DATA,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1_IDENTITY,
} from '@number-strategy-jump/arena-product-presentation/formal-release-evidence-candidate-v1';
import {
  validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1,
  type ArenaV2A7FormalVisualMediaEvidenceStateCandidateV1,
  type ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1,
} from './arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v1.js';

export const ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V2_SCHEMA_VERSION =
  2 as const;

export type ArenaV2A7FormalVisualMediaFreezeStatusCandidateV2 =
  | 'INCOMPLETE'
  | 'FAIL';

export interface ArenaV2A7FormalBudgetEvidenceCandidateV2 {
  readonly policyId:
    typeof ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY.policyId;
  readonly policyContentHash: string;
  readonly artifactObservationCount: number;
  readonly status: ArenaV2A7FormalVisualMediaEvidenceStateCandidateV1;
  readonly evidenceSha256: string | null;
  readonly failureReason: string | null;
}

export interface ArenaV2A7FormalVisualMediaFreezeEvidenceInputCandidateV2 {
  readonly schemaVersion:
    typeof ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V2_SCHEMA_VERSION;
  readonly legacyEvidence: ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1;
  readonly formalBudgetEvidence: ArenaV2A7FormalBudgetEvidenceCandidateV2;
}

const OPTION_KEYS = new Set(['evidence']);
const INPUT_KEYS = new Set(['schemaVersion', 'legacyEvidence', 'formalBudgetEvidence']);
const FORMAL_BUDGET_EVIDENCE_KEYS = new Set([
  'policyId',
  'policyContentHash',
  'artifactObservationCount',
  'status',
  'evidenceSha256',
  'failureReason',
]);
const STORED_KEYS = new Set([
  'schemaVersion',
  'status',
  'implementationStatus',
  'currentGate',
  'defaultReleaseBundleWired',
  'defaultEntryWired',
  'validationStatus',
  'publishes',
  'createsOrModifiesAssets',
  'participatesInGameplayAuthority',
  'p7AdvanceComputedHere',
  'p7ReleaseFreezeManifestOwnedHere',
  'evidenceStatus',
  'hardGate',
  'formalVisualMediaReady',
  'budgetSummary',
  'coverageSummary',
  'incompleteReasons',
  'failureReasons',
  'explicitNonActions',
  'legacyEvidence',
  'evidence',
  'evidenceIdentityHash',
]);
const STATE_VALUES = new Set<ArenaV2A7FormalVisualMediaEvidenceStateCandidateV1>([
  'missing',
  'failed',
  'passed',
]);
const EXPLICIT_NON_ACTIONS = Object.freeze([
  'does-not-approve-v2-budget-policy',
  'does-not-invent-structural-performance-limits',
  'does-not-approve-assets',
  'does-not-create-or-modify-assets',
  'does-not-run-builds-captures-device-or-human-review',
  'does-not-compute-p7-advance',
  'does-not-publish-release',
] as const);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
}

function nullableText(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function safeIntegerAtLeast(value: unknown, minimum: number, name: string): number {
  const result = assertIntegerAtLeast(value, minimum, name);
  if (!Number.isSafeInteger(result)) throw new RangeError(`${name}必须是安全整数。`);
  return result;
}

function normalizeEvidenceState(
  source: Record<string, unknown>,
  name: string,
) {
  const status = source.status as ArenaV2A7FormalVisualMediaEvidenceStateCandidateV1;
  if (!STATE_VALUES.has(status)) throw new RangeError(`${name}.status无效。`);
  const evidenceSha256 = source.evidenceSha256 === null
    ? null
    : assertEvidenceSha256(source.evidenceSha256, `${name}.evidenceSha256`);
  const failureReason = nullableText(source.failureReason, `${name}.failureReason`);
  if (status === 'missing') {
    if (evidenceSha256 !== null || failureReason === null) {
      throw new RangeError(`${name} missing必须无证据SHA且有缺失原因。`);
    }
  } else if (status === 'failed') {
    if (evidenceSha256 === null || failureReason === null) {
      throw new RangeError(`${name} failed必须有证据SHA与失败原因。`);
    }
  } else if (evidenceSha256 === null || failureReason !== null) {
    throw new RangeError(`${name} passed必须有证据SHA且无失败原因。`);
  }
  return Object.freeze({ status, evidenceSha256, failureReason });
}

function normalizeFormalBudgetEvidence(value: unknown) {
  exactRecord(value, FORMAL_BUDGET_EVIDENCE_KEYS, 'A7 V2 formalBudgetEvidence');
  const identity = ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY;
  if (
    value.policyId !== identity.policyId
    || value.policyContentHash !== identity.policyContentHash
  ) throw new RangeError('A7 V2必须绑定当前130项正式预算候选身份。');
  const artifactObservationCount = safeIntegerAtLeast(
    value.artifactObservationCount,
    0,
    'A7 V2 formalBudgetEvidence.artifactObservationCount',
  );
  const state = normalizeEvidenceState(value, 'A7 V2 formalBudgetEvidence');
  if (
    state.status === 'missing'
      ? artifactObservationCount !== 0
      : artifactObservationCount !== identity.artifactCount
  ) throw new RangeError('A7 V2预算证据状态与130项observation覆盖不闭合。');
  return Object.freeze({
    policyId: identity.policyId,
    policyContentHash: identity.policyContentHash,
    artifactObservationCount,
    ...state,
  });
}

function mediaMatchesBudgetKind(
  mediaKind: string,
  budgetKind: string,
): boolean {
  if (budgetKind === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.AUDIO) {
    return mediaKind === 'audio';
  }
  if (budgetKind === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.TEXTURE) {
    return mediaKind === 'visual-texture' || mediaKind === 'ui-media';
  }
  return mediaKind === 'visual-model';
}

function assertCurrentCatalogBudgetCoverage(
  legacyEvidence: ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1,
) {
  const assets = legacyEvidence.evidence.assets;
  const artifacts = ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS;
  const catalogIdentity =
    ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1_IDENTITY;
  const actualCatalogIdentity = legacyEvidence.evidence.catalogIdentity;
  if (
    actualCatalogIdentity.catalogId !== catalogIdentity.catalogId
    || actualCatalogIdentity.catalogRevision !== catalogIdentity.catalogRevision
    || actualCatalogIdentity.catalogContentHash !== catalogIdentity.catalogContentHash
    || actualCatalogIdentity.expectedAssetCount !== catalogIdentity.expectedAssetCount
  ) throw new RangeError('A7 V2必须绑定当前Arena唯一130项正式表现目录。');
  const approvalEntries =
    ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries;
  if (assets.length !== artifacts.length || assets.length !== approvalEntries.length) {
    throw new RangeError('A7 V2必须精确覆盖当前130项正式资产目录。');
  }
  for (let index = 0; index < artifacts.length; index += 1) {
    const asset = assets[index];
    const artifact = artifacts[index];
    const approvalEntry = approvalEntries[index];
    const expectedMediaKind = approvalEntry?.kind === 'audio'
      ? 'audio'
      : approvalEntry?.kind === 'texture' ? 'visual-texture' : 'visual-model';
    const expectedEncodedMediaFormat = approvalEntry?.kind === 'audio'
      ? ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.OGG
      : approvalEntry?.kind === 'texture'
        ? ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.PNG
        : ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.GLB;
    const expectedPhaseId = approvalEntry?.kind === 'map-model'
      ? 'a3-map-environment'
      : approvalEntry?.kind === 'audio' || approvalEntry?.assetId.startsWith('arena.vfx.')
        ? 'a5-hud-vfx-audio'
        : 'a4-character-weapon';
    if (
      asset === undefined
      || artifact === undefined
      || approvalEntry === undefined
      || asset.assetId !== artifact.id
      || asset.assetId !== approvalEntry.assetId
      || asset.artifactPath !== artifact.path
      || asset.artifactPath !== approvalEntry.artifactPath
      || asset.byteLength !== artifact.currentEncodedBytes
      || asset.byteLength !== approvalEntry.byteLength
      || asset.sha256 !== artifact.sha256
      || asset.sha256 !== approvalEntry.sha256
      || asset.phaseId !== expectedPhaseId
      || asset.mediaKind !== expectedMediaKind
      || !mediaMatchesBudgetKind(asset.mediaKind, artifact.kind)
      || artifact.encodedMediaFormat !== expectedEncodedMediaFormat
      || asset.sourceLocator !== approvalEntry.sourceEvidence.sourceLocator
      || asset.sourceRevision !== approvalEntry.sourceEvidence.sourceRevision
      || asset.license.licenseId !== approvalEntry.sourceEvidence.licenseId
      || asset.license.rightsHolder !== approvalEntry.sourceEvidence.rightsHolder
      || asset.license.proofDocument !== approvalEntry.sourceEvidence.proofDocument
      || (artifact.kind === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.TEXTURE
        ? artifact.decodedTextureFormat
          !== ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2.RGBA8
        : artifact.decodedTextureFormat
          !== ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2.NOT_APPLICABLE)
      || (artifact.kind === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.TEXTURE
        && (
          asset.budget.decodedTextureBytes !== artifact.decodedTextureBytes
          || asset.budget.textureWidth !== artifact.widthPixels
          || asset.budget.textureHeight !== artifact.heightPixels
        ))
    ) throw new RangeError(`A7 V2资产与预算候选逐项身份漂移：index=${index}。`);
  }
  return Object.freeze({
    status: 'catalog-covered-candidate-not-approved' as const,
    artifactCount: artifacts.length,
    exactIdPathByteShaCoverage: true as const,
    exactCatalogAndSourceEvidenceCoverage: true as const,
    mediaKindCoverage: true as const,
    encodedMediaFormatPolicyCoverage: true as const,
    textureDecodedByteCoverage: true as const,
    textureDecodedFormatPolicyCoverage: true as const,
    textureDimensionCoverage: true as const,
  });
}

export function assertArenaV2A7CurrentFormalAssetCatalogBindingCandidateV2(
  evidence: ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2,
): void {
  assertCurrentCatalogBudgetCoverage(evidence.legacyEvidence);
}

/** Reuses the current 130-item binding without accepting V2's unapproved gate. */
export function assertArenaV2A7CurrentFormalAssetCatalogLegacyBindingCandidateV2(
  evidence: ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1,
) {
  return assertCurrentCatalogBudgetCoverage(evidence);
}

function isLegacyBudgetReason(reason: string): boolean {
  return reason.startsWith('formal-budget-evidence:')
    || reason.endsWith(':per-item-budget-uncovered')
    || (reason.startsWith('budget:') && !reason.startsWith('budget:delivery:'));
}

/**
 * Reuses the proven A7 V1 evidence envelope while replacing only its obsolete
 * ten-item budget gate with the exact 130-item V2 candidate coverage.
 */
export function evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2(value: unknown) {
  const source = cloneFrozenData(value, 'Arena V2 A7 visual/media evidence V2 options');
  exactRecord(source, OPTION_KEYS, 'Arena V2 A7 visual/media evidence V2 options');
  exactRecord(source.evidence, INPUT_KEYS, 'Arena V2 A7 visual/media evidence V2');
  if (
    source.evidence.schemaVersion
      !== ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V2_SCHEMA_VERSION
  ) throw new RangeError('Arena V2 A7 visual/media evidence V2 schemaVersion无效。');
  const legacyEvidence = validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(
    source.evidence.legacyEvidence,
  );
  const formalBudgetEvidence = normalizeFormalBudgetEvidence(
    source.evidence.formalBudgetEvidence,
  );
  const catalogCoverage = assertCurrentCatalogBudgetCoverage(legacyEvidence);
  const baseIncompleteReasons = legacyEvidence.incompleteReasons.filter(
    (reason) => !isLegacyBudgetReason(reason),
  );
  const baseFailureReasons = legacyEvidence.failureReasons.filter(
    (reason) => !isLegacyBudgetReason(reason),
  );
  const incompleteReasons = Object.freeze([
    ...baseIncompleteReasons,
    ...(formalBudgetEvidence.status === 'missing'
      ? ['formal-budget-v2-observation:missing'] : []),
    'formal-budget-v2-policy:proposed-not-approved',
    'formal-budget-v2-structural-limits:unresolved-not-approved',
  ]);
  const failureReasons = Object.freeze([
    ...baseFailureReasons,
    ...(formalBudgetEvidence.status === 'failed'
      ? ['formal-budget-v2-observation:failed'] : []),
  ]);
  const evidenceStatus: ArenaV2A7FormalVisualMediaFreezeStatusCandidateV2 =
    incompleteReasons.length > 0 ? 'INCOMPLETE' : 'FAIL';
  const policy = ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_DATA;
  const evidence = Object.freeze({
    ...legacyEvidence.evidence,
    schemaVersion:
      ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V2_SCHEMA_VERSION,
    formalBudgetEvidence,
  });
  const core = Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V2_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    currentGate: 'incomplete' as const,
    defaultReleaseBundleWired: false as const,
    defaultEntryWired: false as const,
    validationStatus: 'not-run' as const,
    publishes: false as const,
    createsOrModifiesAssets: false as const,
    participatesInGameplayAuthority: false as const,
    p7AdvanceComputedHere: false as const,
    p7ReleaseFreezeManifestOwnedHere: false as const,
    evidenceStatus,
    hardGate: false as const,
    formalVisualMediaReady: false as const,
    budgetSummary: Object.freeze({
      policyId: policy.id,
      policyContentHash: policy.contentHash,
      policyArtifactCount: policy.summary.artifactCount,
      approvalStatus: policy.approvalStatus,
      hardGateUsable: policy.hardGateUsable,
      structuralLimitsStatus: policy.structuralLimits.status,
      artifactObservationCount: formalBudgetEvidence.artifactObservationCount,
      catalogCoverage,
      measured: Object.freeze({
        totalEncodedBytes: policy.summary.totalEncodedBytes,
        audioEncodedBytes: policy.summary.totalAudioBytes,
        decodedTextureBytes: policy.summary.totalDecodedTextureBytes,
        deliveryBytes: legacyEvidence.budgetSummary.measured.deliveryBytes,
      }),
    }),
    coverageSummary: Object.freeze({
      ...legacyEvidence.coverageSummary,
      formalBudgetObservationCount: formalBudgetEvidence.artifactObservationCount,
      formalBudgetCatalogArtifactCount: policy.summary.artifactCount,
    }),
    incompleteReasons,
    failureReasons,
    explicitNonActions: EXPLICIT_NON_ACTIONS,
    legacyEvidence,
    evidence,
  });
  return Object.freeze({
    ...core,
    evidenceIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 A7 formal visual/media freeze evidence candidate V2',
    ),
  });
}

export type ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2 = ReturnType<
  typeof evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2
>;

/** Recomputes a stored V2 result and rejects self-reported gate or identity drift. */
export function validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2(
  value: unknown,
): ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2 {
  const source = cloneFrozenData(value, 'Arena V2 A7 stored visual/media evidence V2');
  exactRecord(source, STORED_KEYS, 'Arena V2 A7 stored visual/media evidence V2');
  const canonical = evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV2({
    evidence: {
      schemaVersion:
        ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V2_SCHEMA_VERSION,
      legacyEvidence: source.legacyEvidence,
      formalBudgetEvidence: (source.evidence as Record<string, unknown>).formalBudgetEvidence,
    },
  });
  if (
    source.evidenceIdentityHash !== canonical.evidenceIdentityHash
    || createDeterministicDataHash(
      source,
      'Arena V2 A7 stored visual/media evidence V2 comparison',
    ) !== createDeterministicDataHash(
      canonical,
      'Arena V2 A7 stored visual/media evidence V2 comparison',
    )
  ) throw new RangeError('Arena V2 A7 stored visual/media evidence V2身份或结果发生漂移。');
  return canonical;
}

export const ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V2 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  currentGate: 'incomplete' as const,
  defaultReleaseBundleWired: false as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
  currentPassInstanceExists: false as const,
  hardGate: false as const,
  formalAssetCatalogCount: 130 as const,
  formalBudgetPolicyApprovalStatus: 'proposed-not-approved' as const,
  formalBudgetStructuralLimitsStatus: 'unresolved-not-approved' as const,
  createsOrModifiesAssets: false as const,
  producesDeviceHumanOrApprovalEvidence: false as const,
  p7ReleaseFreezeManifestOwnedHere: false as const,
  p7AdvanceComputedHere: false as const,
});
