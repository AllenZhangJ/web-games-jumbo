import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceGitCommit,
  assertEvidenceSha256,
} from '@number-strategy-jump/arena-evidence-contracts';
import {
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_DATA,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_IDENTITY,
  type ArenaStage7FormalAssetBudgetArtifactV1,
} from '@number-strategy-jump/arena-presentation-contracts';

export const ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

export const ARENA_V2_A7_FORMAL_VISUAL_MEDIA_PHASE_IDS_CANDIDATE_V1 = Object.freeze([
  'a0-visual-direction',
  'a1-supply-presentation',
  'a2-mode-event-cues',
  'a3-map-environment',
  'a4-character-weapon',
  'a5-hud-vfx-audio',
  'a6-collection-media',
] as const);

export const ARENA_V2_A7_DELIVERY_PLATFORM_IDS_CANDIDATE_V1 = Object.freeze([
  'web',
  'wechat',
  'douyin',
] as const);

export const ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1 = Object.freeze([
  Object.freeze({ environmentId: 'web-mobile-390x844', platformId: 'web' }),
  Object.freeze({ environmentId: 'web-desktop-1440x900', platformId: 'web' }),
  Object.freeze({ environmentId: 'wechat-developer-tool', platformId: 'wechat' }),
  Object.freeze({ environmentId: 'douyin-developer-tool', platformId: 'douyin' }),
  Object.freeze({ environmentId: 'ios-physical-device', platformId: 'ios' }),
  Object.freeze({ environmentId: 'android-physical-device', platformId: 'android' }),
] as const);

export const ARENA_V2_A7_CAPTURE_REQUIREMENTS_CANDIDATE_V1 = Object.freeze([
  Object.freeze({ kind: 'screenshot', variant: 'standard' }),
  Object.freeze({ kind: 'screenshot', variant: 'reduced-motion' }),
  Object.freeze({ kind: 'screenshot', variant: 'asset-failure-fallback' }),
  Object.freeze({ kind: 'screenshot', variant: 'accessibility' }),
  Object.freeze({ kind: 'recording', variant: 'standard' }),
  Object.freeze({ kind: 'recording', variant: 'muted-equivalence' }),
] as const);

export const ARENA_V2_A7_REVIEW_DIMENSION_IDS_CANDIDATE_V1 = Object.freeze([
  'visual-consistency',
  'silhouette-readability',
  'non-color-redundancy',
  'reduced-motion-equivalence',
  'muted-equivalence',
  'asset-failure-fallback',
  'resource-lifecycle-release',
] as const);

export type ArenaV2A7FormalVisualMediaEvidenceStateCandidateV1 =
  | 'missing'
  | 'failed'
  | 'passed';
export type ArenaV2A7FormalVisualMediaFreezeStatusCandidateV1 =
  | 'INCOMPLETE'
  | 'FAIL'
  | 'PASS';

type PhaseId = typeof ARENA_V2_A7_FORMAL_VISUAL_MEDIA_PHASE_IDS_CANDIDATE_V1[number];
type DeliveryPlatformId = typeof ARENA_V2_A7_DELIVERY_PLATFORM_IDS_CANDIDATE_V1[number];
type EnvironmentId = typeof ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1[number]['environmentId'];
type CaptureKind = typeof ARENA_V2_A7_CAPTURE_REQUIREMENTS_CANDIDATE_V1[number]['kind'];
type CaptureVariant = typeof ARENA_V2_A7_CAPTURE_REQUIREMENTS_CANDIDATE_V1[number]['variant'];
type ReviewDimensionId = typeof ARENA_V2_A7_REVIEW_DIMENSION_IDS_CANDIDATE_V1[number];
type BudgetClass =
  | 'character-glb'
  | 'attachment-glb'
  | 'texture'
  | 'audio'
  | 'uncovered';
type MediaKind = 'visual-model' | 'visual-texture' | 'ui-media' | 'audio';

export interface ArenaV2A7EvidenceStateRecordCandidateV1 {
  readonly status: ArenaV2A7FormalVisualMediaEvidenceStateCandidateV1;
  readonly evidenceSha256: string | null;
  readonly failureReason: string | null;
}

export interface ArenaV2A7PhaseEvidenceCandidateV1
extends ArenaV2A7EvidenceStateRecordCandidateV1 {
  readonly phaseId: PhaseId;
}

export interface ArenaV2A7AssetEvidenceCandidateV1 {
  readonly assetId: string;
  readonly phaseId: PhaseId;
  readonly mediaKind: MediaKind;
  readonly artifactPath: string;
  readonly sourceLocator: string;
  readonly sourceRevision: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly license: Readonly<{
    readonly licenseId: string;
    readonly rightsHolder: string;
    readonly proofDocument: string;
    readonly commercialUsePermitted: boolean;
    readonly modificationPermitted: boolean;
    readonly redistributionPermitted: boolean;
    readonly attributionRequired: boolean;
    readonly attributionText: string | null;
    readonly status: ArenaV2A7FormalVisualMediaEvidenceStateCandidateV1;
    readonly evidenceSha256: string | null;
    readonly failureReason: string | null;
  }>;
  readonly approval: Readonly<{
    readonly status: ArenaV2A7FormalVisualMediaEvidenceStateCandidateV1;
    readonly approvedBy: string | null;
    readonly approvedAt: string | null;
    readonly evidenceSha256: string | null;
    readonly failureReason: string | null;
  }>;
  readonly budget: Readonly<{
    readonly budgetClass: BudgetClass;
    readonly decodedTextureBytes: number | null;
    readonly textureWidth: number | null;
    readonly textureHeight: number | null;
  }>;
}

export interface ArenaV2A7EnvironmentBuildEvidenceCandidateV1
extends ArenaV2A7EvidenceStateRecordCandidateV1 {
  readonly environmentId: EnvironmentId;
  readonly sourceCommit: string;
  readonly contentIdentityHash: string;
  readonly buildIdentitySha256: string;
  readonly assetSetSha256: string;
}

export interface ArenaV2A7DeliveryEvidenceCandidateV1
extends ArenaV2A7EvidenceStateRecordCandidateV1 {
  readonly platformId: DeliveryPlatformId;
  readonly sourceCommit: string;
  readonly contentIdentityHash: string;
  readonly buildIdentitySha256: string;
  readonly assetSetSha256: string;
  readonly assetManifestSha256: string;
  readonly packageByteLength: number;
}

export interface ArenaV2A7CaptureEvidenceCandidateV1
extends ArenaV2A7EvidenceStateRecordCandidateV1 {
  readonly captureId: string;
  readonly environmentId: EnvironmentId;
  readonly kind: CaptureKind;
  readonly variant: CaptureVariant;
  readonly sourceCommit: string;
  readonly contentIdentityHash: string;
  readonly buildIdentitySha256: string;
  readonly assetSetSha256: string;
  readonly artifactPath: string | null;
  readonly byteLength: number | null;
  readonly artifactSha256: string | null;
}

export interface ArenaV2A7ReviewEvidenceCandidateV1
extends ArenaV2A7EvidenceStateRecordCandidateV1 {
  readonly dimensionId: ReviewDimensionId;
  readonly reviewer: string | null;
  readonly reviewedAt: string | null;
}

export interface ArenaV2A7FormalVisualMediaFreezeEvidenceInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly sourceIdentity: Readonly<{
    readonly sourceCommit: string;
    readonly sourceDirty: boolean;
    readonly contentIdentityHash: string;
  }>;
  readonly catalogIdentity: Readonly<{
    readonly catalogId: string;
    readonly catalogRevision: string;
    readonly catalogContentHash: string;
    readonly assetSetSha256: string;
    readonly expectedAssetCount: number;
  }>;
  readonly formalBudgetEvidence: Readonly<{
    readonly policyId: 'arena.stage7.formal-asset-budget.v1';
    readonly policyContentHash: string;
    readonly artifactObservationCount: number;
    readonly status: ArenaV2A7FormalVisualMediaEvidenceStateCandidateV1;
    readonly evidenceSha256: string | null;
    readonly failureReason: string | null;
  }>;
  readonly phaseEvidence: readonly ArenaV2A7PhaseEvidenceCandidateV1[];
  readonly assets: readonly ArenaV2A7AssetEvidenceCandidateV1[];
  readonly environmentBuilds: readonly ArenaV2A7EnvironmentBuildEvidenceCandidateV1[];
  readonly deliveries: readonly ArenaV2A7DeliveryEvidenceCandidateV1[];
  readonly captures: readonly ArenaV2A7CaptureEvidenceCandidateV1[];
  readonly reviews: readonly ArenaV2A7ReviewEvidenceCandidateV1[];
}

export interface ArenaV2A7FormalVisualMediaFreezeEvidenceOptionsCandidateV1 {
  readonly evidence: ArenaV2A7FormalVisualMediaFreezeEvidenceInputCandidateV1;
}

const MAXIMUM_ASSET_COUNT = 256;
const MAXIMUM_TOTAL_ENCODED_BYTES =
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_DATA.maximumTotalEncodedBytes;
const MAXIMUM_AUDIO_ENCODED_BYTES =
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_DATA.maximumTotalAudioBytes;
const MAXIMUM_DECODED_TEXTURE_BYTES =
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_DATA.maximumTotalDecodedTextureBytes;
const MAXIMUM_SINGLE_DECODED_TEXTURE_BYTES =
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_DATA.maximumDecodedTextureBytesPerArtifact;
const MAXIMUM_TEXTURE_SIDE =
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_DATA.maximumTextureDimension;
const MAXIMUM_DELIVERY_BYTES = 4 * 1024 * 1024;
export const ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1 =
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_IDENTITY;

const FORMAL_BUDGET_ARTIFACT_BY_ID: ReadonlyMap<
string,
ArenaStage7FormalAssetBudgetArtifactV1
> = new Map(
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS.map((entry) => [entry.id, entry] as const),
);

function budgetClassForPolicyKind(
  kind: ArenaStage7FormalAssetBudgetArtifactV1['kind'],
): Exclude<BudgetClass, 'uncovered'> {
  if (kind === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.CHARACTER_MODEL) {
    return 'character-glb';
  }
  if (kind === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.MODEL_ATTACHMENT) {
    return 'attachment-glb';
  }
  if (kind === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.TEXTURE) return 'texture';
  return 'audio';
}

function maximumEncodedBytesForKind(
  kind: ArenaStage7FormalAssetBudgetArtifactV1['kind'],
): number {
  return Math.max(...ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS
    .filter((entry) => entry.kind === kind)
    .map((entry) => entry.maximumEncodedBytes));
}

const PER_ITEM_LIMITS = Object.freeze({
  'character-glb': maximumEncodedBytesForKind(
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.CHARACTER_MODEL,
  ),
  'attachment-glb': maximumEncodedBytesForKind(
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.MODEL_ATTACHMENT,
  ),
  texture: maximumEncodedBytesForKind(
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.TEXTURE,
  ),
  audio: maximumEncodedBytesForKind(
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.AUDIO,
  ),
  uncovered: null,
} as const);

const STATE_VALUES = new Set<ArenaV2A7FormalVisualMediaEvidenceStateCandidateV1>([
  'missing', 'failed', 'passed',
]);
const MEDIA_KINDS = new Set<MediaKind>([
  'visual-model', 'visual-texture', 'ui-media', 'audio',
]);
const BUDGET_CLASSES = new Set<BudgetClass>([
  'character-glb', 'attachment-glb', 'texture', 'audio', 'uncovered',
]);
const OPTION_KEYS = new Set(['evidence']);
const INPUT_KEYS = new Set([
  'schemaVersion', 'sourceIdentity', 'catalogIdentity', 'formalBudgetEvidence',
  'phaseEvidence', 'assets', 'environmentBuilds', 'deliveries', 'captures', 'reviews',
]);
const SOURCE_KEYS = new Set(['sourceCommit', 'sourceDirty', 'contentIdentityHash']);
const CATALOG_KEYS = new Set([
  'catalogId', 'catalogRevision', 'catalogContentHash', 'assetSetSha256',
  'expectedAssetCount',
]);
const FORMAL_BUDGET_EVIDENCE_KEYS = new Set([
  'policyId', 'policyContentHash', 'artifactObservationCount',
  'status', 'evidenceSha256', 'failureReason',
]);
const STATE_KEYS = new Set(['status', 'evidenceSha256', 'failureReason']);
const PHASE_KEYS = new Set(['phaseId', ...STATE_KEYS]);
const ASSET_KEYS = new Set([
  'assetId', 'phaseId', 'mediaKind', 'artifactPath', 'sourceLocator',
  'sourceRevision', 'byteLength', 'sha256', 'license', 'approval', 'budget',
]);
const LICENSE_KEYS = new Set([
  'licenseId', 'rightsHolder', 'proofDocument', 'commercialUsePermitted',
  'modificationPermitted', 'redistributionPermitted', 'attributionRequired',
  'attributionText', 'status', 'evidenceSha256', 'failureReason',
]);
const APPROVAL_KEYS = new Set([
  'status', 'approvedBy', 'approvedAt', 'evidenceSha256', 'failureReason',
]);
const BUDGET_KEYS = new Set([
  'budgetClass', 'decodedTextureBytes', 'textureWidth', 'textureHeight',
]);
const ENVIRONMENT_KEYS = new Set([
  'environmentId', 'sourceCommit', 'contentIdentityHash', 'buildIdentitySha256',
  'assetSetSha256', ...STATE_KEYS,
]);
const DELIVERY_KEYS = new Set([
  'platformId', 'sourceCommit', 'contentIdentityHash', 'buildIdentitySha256',
  'assetSetSha256', 'assetManifestSha256', 'packageByteLength', ...STATE_KEYS,
]);
const CAPTURE_KEYS = new Set([
  'captureId',
  'environmentId',
  'kind',
  'variant',
  'sourceCommit',
  'contentIdentityHash',
  'buildIdentitySha256',
  'assetSetSha256',
  'artifactPath',
  'byteLength',
  'artifactSha256',
  ...STATE_KEYS,
]);
const REVIEW_KEYS = new Set(['dimensionId', 'reviewer', 'reviewedAt', ...STATE_KEYS]);
const STORED_KEYS = new Set([
  'schemaVersion', 'status', 'implementationStatus', 'defaultReleaseBundleWired', 'defaultEntryWired',
  'validationStatus', 'publishes', 'createsOrModifiesAssets', 'participatesInGameplayAuthority',
  'p7AdvanceComputedHere', 'p7ReleaseFreezeManifestOwnedHere', 'evidenceStatus',
  'hardGate', 'formalVisualMediaReady', 'budgetSummary', 'coverageSummary',
  'incompleteReasons', 'failureReasons', 'explicitNonActions', 'evidence',
  'evidenceIdentityHash',
]);

const EXPLICIT_NON_ACTIONS = Object.freeze([
  'does-not-generate-or-modify-assets',
  'does-not-publish-release',
  'does-not-modify-branch',
  'does-not-write-git-tag',
  'does-not-upload-artifacts',
  'does-not-sign-artifacts',
  'does-not-merge-branches',
  'does-not-produce-device-human-or-approval-evidence',
  'does-not-compute-p7-advance',
  'does-not-participate-in-gameplay-authority',
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

function assertDenseArray(value: unknown, maximum: number, name: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  if (value.length > maximum) throw new RangeError(`${name}最多允许${maximum}项。`);
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) throw new RangeError(`${name}不得为稀疏数组。`);
  }
  return value;
}

function text(value: unknown, name: string): string {
  return assertNonEmptyString(value, name);
}

function nullableText(value: unknown, name: string): string | null {
  return value === null ? null : text(value, name);
}

function safeIntegerAtLeast(value: unknown, minimum: number, name: string): number {
  const result = assertIntegerAtLeast(value, minimum, name);
  if (!Number.isSafeInteger(result)) throw new RangeError(`${name}必须是安全整数。`);
  return result;
}

function contentHash(value: unknown, name: string): string {
  const result = text(value, name);
  if (!/^[0-9a-f]{8}$/u.test(result)) throw new RangeError(`${name}必须是8位小写hash。`);
  return result;
}

function relativePath(value: unknown, name: string): string {
  const result = text(value, name);
  if (
    result.startsWith('/')
    || result.includes('\\')
    || result.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) throw new RangeError(`${name}必须是仓库内规范相对路径。`);
  return result;
}

function evidenceState(
  source: Record<string, unknown>,
  name: string,
): Readonly<ArenaV2A7EvidenceStateRecordCandidateV1> {
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

function normalizePhases(value: unknown): readonly Readonly<ArenaV2A7PhaseEvidenceCandidateV1>[] {
  const source = assertDenseArray(
    value,
    ARENA_V2_A7_FORMAL_VISUAL_MEDIA_PHASE_IDS_CANDIDATE_V1.length,
    'A7 phaseEvidence',
  );
  if (source.length !== ARENA_V2_A7_FORMAL_VISUAL_MEDIA_PHASE_IDS_CANDIDATE_V1.length) {
    throw new RangeError('A7 phaseEvidence必须精确覆盖A0–A6七阶段。');
  }
  return Object.freeze(source.map((entry, index) => {
    const name = `A7 phaseEvidence[${index}]`;
    exactRecord(entry, PHASE_KEYS, name);
    const phaseId = text(entry.phaseId, `${name}.phaseId`);
    if (phaseId !== ARENA_V2_A7_FORMAL_VISUAL_MEDIA_PHASE_IDS_CANDIDATE_V1[index]) {
      throw new RangeError(`${name}.phaseId必须按冻结顺序覆盖A0–A6。`);
    }
    return Object.freeze({ phaseId: phaseId as PhaseId, ...evidenceState(entry, name) });
  }));
}

function normalizeFormalBudgetEvidence(value: unknown) {
  exactRecord(value, FORMAL_BUDGET_EVIDENCE_KEYS, 'A7 formalBudgetEvidence');
  if (value.policyId
    !== ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1.policyId
    || value.policyContentHash
      !== ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1.policyContentHash) {
    throw new RangeError('A7 formalBudgetEvidence必须绑定现行正式预算policy身份。');
  }
  const artifactObservationCount = safeIntegerAtLeast(
    value.artifactObservationCount,
    0,
    'A7 formalBudgetEvidence.artifactObservationCount',
  );
  const state = evidenceState(value, 'A7 formalBudgetEvidence');
  if (state.status === 'missing' ? artifactObservationCount !== 0
    : artifactObservationCount
      !== ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1.artifactCount) {
    throw new RangeError('A7正式预算证据状态与policy observation覆盖不闭合。');
  }
  return Object.freeze({
    policyId: ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1.policyId,
    policyContentHash:
      ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1.policyContentHash,
    artifactObservationCount,
    ...state,
  });
}

function normalizeLicense(value: unknown, name: string) {
  exactRecord(value, LICENSE_KEYS, name);
  const statusRecord = evidenceState(value, name);
  const attributionRequired = value.attributionRequired;
  if (typeof value.commercialUsePermitted !== 'boolean'
    || typeof value.modificationPermitted !== 'boolean'
    || typeof value.redistributionPermitted !== 'boolean'
    || typeof attributionRequired !== 'boolean') {
    throw new TypeError(`${name}许可结论必须是布尔值。`);
  }
  const attributionText = nullableText(value.attributionText, `${name}.attributionText`);
  if (attributionRequired !== (attributionText !== null)) {
    throw new RangeError(`${name} attributionRequired与attributionText不闭合。`);
  }
  if (statusRecord.status === 'passed' && (
    value.commercialUsePermitted !== true
    || value.modificationPermitted !== true
    || value.redistributionPermitted !== true
  )) throw new RangeError(`${name} passed不得包含受限商业/修改/再分发结论。`);
  return Object.freeze({
    licenseId: text(value.licenseId, `${name}.licenseId`),
    rightsHolder: text(value.rightsHolder, `${name}.rightsHolder`),
    proofDocument: relativePath(value.proofDocument, `${name}.proofDocument`),
    commercialUsePermitted: value.commercialUsePermitted,
    modificationPermitted: value.modificationPermitted,
    redistributionPermitted: value.redistributionPermitted,
    attributionRequired,
    attributionText,
    ...statusRecord,
  });
}

function normalizeApproval(value: unknown, name: string) {
  exactRecord(value, APPROVAL_KEYS, name);
  const state = evidenceState(value, name);
  const approvedBy = nullableText(value.approvedBy, `${name}.approvedBy`);
  const approvedAt = nullableText(value.approvedAt, `${name}.approvedAt`);
  if ((approvedBy === null) !== (approvedAt === null)) {
    throw new RangeError(`${name}批准人和日期必须同时存在或同时为空。`);
  }
  if (state.status === 'passed' ? approvedBy === null : approvedBy !== null) {
    throw new RangeError(`${name}批准身份与状态不闭合。`);
  }
  return Object.freeze({ ...state, approvedBy, approvedAt });
}

function normalizeBudget(
  value: unknown,
  mediaKind: MediaKind,
  assetId: string,
  artifactPath: string,
  name: string,
) {
  exactRecord(value, BUDGET_KEYS, name);
  const declaredBudgetClass = value.budgetClass as BudgetClass;
  if (!BUDGET_CLASSES.has(declaredBudgetClass)) {
    throw new RangeError(`${name}.budgetClass无效。`);
  }
  const policyArtifact = FORMAL_BUDGET_ARTIFACT_BY_ID.get(assetId);
  const budgetClass: BudgetClass = policyArtifact?.path === artifactPath
    ? budgetClassForPolicyKind(policyArtifact.kind)
    : 'uncovered';
  const decodedTextureBytes = value.decodedTextureBytes === null
    ? null
    : safeIntegerAtLeast(value.decodedTextureBytes, 0, `${name}.decodedTextureBytes`);
  const textureWidth = value.textureWidth === null
    ? null
    : safeIntegerAtLeast(value.textureWidth, 1, `${name}.textureWidth`);
  const textureHeight = value.textureHeight === null
    ? null
    : safeIntegerAtLeast(value.textureHeight, 1, `${name}.textureHeight`);
  const mediaUsesTextureMetrics = mediaKind === 'visual-texture' || mediaKind === 'ui-media';
  const requiresTextureMetrics = budgetClass === 'texture'
    || (budgetClass === 'uncovered' && mediaUsesTextureMetrics);
  if (requiresTextureMetrics
    !== (decodedTextureBytes !== null && textureWidth !== null && textureHeight !== null)) {
    throw new RangeError(`${name}纹理媒体必须完整提供纹理指标，非纹理媒体不得夹带。`);
  }
  if (budgetClass !== 'uncovered'
    && (mediaKind === 'audio') !== (budgetClass === 'audio')) {
    throw new RangeError(`${name} audio媒体与audio预算类必须一致。`);
  }
  if (budgetClass !== 'uncovered'
    && mediaUsesTextureMetrics
    && budgetClass !== 'texture') {
    throw new RangeError(`${name}纹理/UI媒体必须使用texture预算类。`);
  }
  if (budgetClass !== 'uncovered'
    && mediaKind === 'visual-model'
    && budgetClass !== 'character-glb'
    && budgetClass !== 'attachment-glb') {
    throw new RangeError(`${name}视觉模型预算类无效。`);
  }
  return Object.freeze({ budgetClass, decodedTextureBytes, textureWidth, textureHeight });
}

function normalizeAssets(value: unknown, expectedAssetCount: number) {
  const source = assertDenseArray(value, MAXIMUM_ASSET_COUNT, 'A7 assets');
  if (source.length !== expectedAssetCount) {
    throw new RangeError('A7 assets必须与catalog expectedAssetCount精确一致。');
  }
  const ids = new Set<string>();
  const hashes = new Set<string>();
  const paths = new Set<string>();
  let previousId: string | null = null;
  return Object.freeze(source.map((entry, index) => {
    const name = `A7 assets[${index}]`;
    exactRecord(entry, ASSET_KEYS, name);
    const assetId = text(entry.assetId, `${name}.assetId`);
    if (ids.has(assetId) || (previousId !== null && assetId <= previousId)) {
      throw new RangeError('A7 assets必须assetId唯一且稳定升序。');
    }
    ids.add(assetId);
    previousId = assetId;
    const sha256 = assertEvidenceSha256(entry.sha256, `${name}.sha256`);
    if (hashes.has(sha256)) throw new RangeError('A7 assets不得用重复字节SHA充数。');
    hashes.add(sha256);
    const phaseId = entry.phaseId as PhaseId;
    if (!ARENA_V2_A7_FORMAL_VISUAL_MEDIA_PHASE_IDS_CANDIDATE_V1.includes(phaseId)) {
      throw new RangeError(`${name}.phaseId无效。`);
    }
    const mediaKind = entry.mediaKind as MediaKind;
    if (!MEDIA_KINDS.has(mediaKind)) throw new RangeError(`${name}.mediaKind无效。`);
    const artifactPath = relativePath(entry.artifactPath, `${name}.artifactPath`);
    if (paths.has(artifactPath)) throw new RangeError('A7 assets artifactPath必须唯一。');
    paths.add(artifactPath);
    return Object.freeze({
      assetId,
      phaseId,
      mediaKind,
      artifactPath,
      sourceLocator: text(entry.sourceLocator, `${name}.sourceLocator`),
      sourceRevision: text(entry.sourceRevision, `${name}.sourceRevision`),
      byteLength: safeIntegerAtLeast(entry.byteLength, 1, `${name}.byteLength`),
      sha256,
      license: normalizeLicense(entry.license, `${name}.license`),
      approval: normalizeApproval(entry.approval, `${name}.approval`),
      budget: normalizeBudget(
        entry.budget,
        mediaKind,
        assetId,
        artifactPath,
        `${name}.budget`,
      ),
    });
  }));
}

function normalizeEnvironmentBuilds(
  value: unknown,
  sourceCommit: string,
  contentIdentityHash: string,
  assetSetSha256: string,
) {
  const source = assertDenseArray(
    value,
    ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1.length,
    'A7 environmentBuilds',
  );
  if (source.length !== ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1.length) {
    throw new RangeError('A7 environmentBuilds必须精确覆盖六目标环境。');
  }
  const buildHashes = new Set<string>();
  return Object.freeze(source.map((entry, index) => {
    const name = `A7 environmentBuilds[${index}]`;
    exactRecord(entry, ENVIRONMENT_KEYS, name);
    const expected = ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1[index]!;
    if (entry.environmentId !== expected.environmentId) {
      throw new RangeError(`${name}.environmentId必须按冻结顺序覆盖六环境。`);
    }
    const buildIdentitySha256 = assertEvidenceSha256(
      entry.buildIdentitySha256,
      `${name}.buildIdentitySha256`,
    );
    if (buildHashes.has(buildIdentitySha256)) {
      throw new RangeError('A7六环境build identity必须唯一。');
    }
    buildHashes.add(buildIdentitySha256);
    if (entry.sourceCommit !== sourceCommit
      || entry.contentIdentityHash !== contentIdentityHash
      || entry.assetSetSha256 !== assetSetSha256) {
      throw new RangeError(`${name} source/content/asset-set身份漂移。`);
    }
    return Object.freeze({
      environmentId: expected.environmentId,
      sourceCommit,
      contentIdentityHash,
      buildIdentitySha256,
      assetSetSha256,
      ...evidenceState(entry, name),
    });
  }));
}

function normalizeDeliveries(
  value: unknown,
  sourceCommit: string,
  contentIdentityHash: string,
  assetSetSha256: string,
) {
  const source = assertDenseArray(
    value,
    ARENA_V2_A7_DELIVERY_PLATFORM_IDS_CANDIDATE_V1.length,
    'A7 deliveries',
  );
  if (source.length !== ARENA_V2_A7_DELIVERY_PLATFORM_IDS_CANDIDATE_V1.length) {
    throw new RangeError('A7 deliveries必须精确覆盖Web/微信/抖音。');
  }
  const manifestHashes = new Set<string>();
  return Object.freeze(source.map((entry, index) => {
    const name = `A7 deliveries[${index}]`;
    exactRecord(entry, DELIVERY_KEYS, name);
    const expectedPlatform = ARENA_V2_A7_DELIVERY_PLATFORM_IDS_CANDIDATE_V1[index]!;
    if (entry.platformId !== expectedPlatform) {
      throw new RangeError(`${name}.platformId必须按Web/微信/抖音冻结顺序。`);
    }
    if (entry.sourceCommit !== sourceCommit
      || entry.contentIdentityHash !== contentIdentityHash
      || entry.assetSetSha256 !== assetSetSha256) {
      throw new RangeError(`${name} source/content/asset-set身份漂移。`);
    }
    const assetManifestSha256 = assertEvidenceSha256(
      entry.assetManifestSha256,
      `${name}.assetManifestSha256`,
    );
    if (manifestHashes.has(assetManifestSha256)) {
      throw new RangeError('A7三端asset manifest SHA必须分别可审计，不得重复充数。');
    }
    manifestHashes.add(assetManifestSha256);
    return Object.freeze({
      platformId: expectedPlatform,
      sourceCommit,
      contentIdentityHash,
      buildIdentitySha256: assertEvidenceSha256(
        entry.buildIdentitySha256,
        `${name}.buildIdentitySha256`,
      ),
      assetSetSha256,
      assetManifestSha256,
      packageByteLength: safeIntegerAtLeast(
        entry.packageByteLength,
        1,
        `${name}.packageByteLength`,
      ),
      ...evidenceState(entry, name),
    });
  }));
}

function normalizeCaptures(
  value: unknown,
  sourceCommit: string,
  contentIdentityHash: string,
  assetSetSha256: string,
  environmentBuilds: readonly Readonly<{ environmentId: EnvironmentId; buildIdentitySha256: string }>[],
) {
  const expectedCount = ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1.length
    * ARENA_V2_A7_CAPTURE_REQUIREMENTS_CANDIDATE_V1.length;
  const source = assertDenseArray(value, expectedCount, 'A7 captures');
  if (source.length !== expectedCount) {
    throw new RangeError(`A7 captures必须精确覆盖${expectedCount}个环境×媒体要求。`);
  }
  const ids = new Set<string>();
  const artifactHashes = new Set<string>();
  return Object.freeze(source.map((entry, index) => {
    const environmentIndex = Math.floor(
      index / ARENA_V2_A7_CAPTURE_REQUIREMENTS_CANDIDATE_V1.length,
    );
    const requirementIndex = index % ARENA_V2_A7_CAPTURE_REQUIREMENTS_CANDIDATE_V1.length;
    const environment = ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1[environmentIndex]!;
    const requirement = ARENA_V2_A7_CAPTURE_REQUIREMENTS_CANDIDATE_V1[requirementIndex]!;
    const name = `A7 captures[${index}]`;
    exactRecord(entry, CAPTURE_KEYS, name);
    if (entry.environmentId !== environment.environmentId
      || entry.kind !== requirement.kind
      || entry.variant !== requirement.variant) {
      throw new RangeError(`${name}必须按六环境与六媒体要求的冻结笛卡尔顺序。`);
    }
    const captureId = text(entry.captureId, `${name}.captureId`);
    if (ids.has(captureId)) throw new RangeError('A7 captureId必须唯一。');
    ids.add(captureId);
    if (entry.sourceCommit !== sourceCommit
      || entry.contentIdentityHash !== contentIdentityHash
      || entry.assetSetSha256 !== assetSetSha256
      || entry.buildIdentitySha256 !== environmentBuilds[environmentIndex]?.buildIdentitySha256) {
      throw new RangeError(`${name} source/build/content/asset-set身份漂移。`);
    }
    const state = evidenceState(entry, name);
    const artifactPath = entry.artifactPath === null
      ? null
      : relativePath(entry.artifactPath, `${name}.artifactPath`);
    const byteLength = entry.byteLength === null
      ? null
      : safeIntegerAtLeast(entry.byteLength, 1, `${name}.byteLength`);
    const artifactSha256 = entry.artifactSha256 === null
      ? null
      : assertEvidenceSha256(entry.artifactSha256, `${name}.artifactSha256`);
    const hasArtifact = artifactPath !== null && byteLength !== null && artifactSha256 !== null;
    if (state.status === 'missing' ? hasArtifact || artifactPath !== null || byteLength !== null
      || artifactSha256 !== null : !hasArtifact) {
      throw new RangeError(`${name}媒体artifact与证据状态不闭合。`);
    }
    if (artifactSha256 !== null) {
      if (artifactHashes.has(artifactSha256)) throw new RangeError('A7截图/录像SHA不得重复充数。');
      artifactHashes.add(artifactSha256);
    }
    return Object.freeze({
      captureId,
      environmentId: environment.environmentId,
      kind: requirement.kind,
      variant: requirement.variant,
      sourceCommit,
      contentIdentityHash,
      buildIdentitySha256: environmentBuilds[environmentIndex]!.buildIdentitySha256,
      assetSetSha256,
      artifactPath,
      byteLength,
      artifactSha256,
      ...state,
    });
  }));
}

function normalizeReviews(value: unknown) {
  const source = assertDenseArray(
    value,
    ARENA_V2_A7_REVIEW_DIMENSION_IDS_CANDIDATE_V1.length,
    'A7 reviews',
  );
  if (source.length !== ARENA_V2_A7_REVIEW_DIMENSION_IDS_CANDIDATE_V1.length) {
    throw new RangeError('A7 reviews必须精确覆盖七个视觉/无障碍/生命周期维度。');
  }
  return Object.freeze(source.map((entry, index) => {
    const name = `A7 reviews[${index}]`;
    exactRecord(entry, REVIEW_KEYS, name);
    const expected = ARENA_V2_A7_REVIEW_DIMENSION_IDS_CANDIDATE_V1[index]!;
    if (entry.dimensionId !== expected) {
      throw new RangeError(`${name}.dimensionId必须保持冻结顺序。`);
    }
    const state = evidenceState(entry, name);
    const reviewer = nullableText(entry.reviewer, `${name}.reviewer`);
    const reviewedAt = nullableText(entry.reviewedAt, `${name}.reviewedAt`);
    if ((reviewer === null) !== (reviewedAt === null)) {
      throw new RangeError(`${name} reviewer与reviewedAt必须同时存在或同时为空。`);
    }
    if (state.status === 'missing' ? reviewer !== null : reviewer === null) {
      throw new RangeError(`${name}评审身份与状态不闭合。`);
    }
    return Object.freeze({ dimensionId: expected, reviewer, reviewedAt, ...state });
  }));
}

function normalizeEvidence(value: unknown) {
  exactRecord(value, INPUT_KEYS, 'Arena V2 A7 visual/media evidence');
  if (value.schemaVersion
    !== ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V1_SCHEMA_VERSION) {
    throw new RangeError('Arena V2 A7 visual/media evidence schemaVersion无效。');
  }
  exactRecord(value.sourceIdentity, SOURCE_KEYS, 'A7 sourceIdentity');
  const sourceCommit = assertEvidenceGitCommit(
    value.sourceIdentity.sourceCommit,
    'A7 sourceIdentity.sourceCommit',
  );
  if (typeof value.sourceIdentity.sourceDirty !== 'boolean') {
    throw new TypeError('A7 sourceIdentity.sourceDirty必须是布尔值。');
  }
  const contentIdentityHash = contentHash(
    value.sourceIdentity.contentIdentityHash,
    'A7 sourceIdentity.contentIdentityHash',
  );
  exactRecord(value.catalogIdentity, CATALOG_KEYS, 'A7 catalogIdentity');
  const expectedAssetCount = safeIntegerAtLeast(
    value.catalogIdentity.expectedAssetCount,
    1,
    'A7 catalogIdentity.expectedAssetCount',
  );
  if (expectedAssetCount > MAXIMUM_ASSET_COUNT) {
    throw new RangeError(`A7 expectedAssetCount最多${MAXIMUM_ASSET_COUNT}。`);
  }
  const assetSetSha256 = assertEvidenceSha256(
    value.catalogIdentity.assetSetSha256,
    'A7 catalogIdentity.assetSetSha256',
  );
  const catalogIdentity = Object.freeze({
    catalogId: text(value.catalogIdentity.catalogId, 'A7 catalogIdentity.catalogId'),
    catalogRevision: text(
      value.catalogIdentity.catalogRevision,
      'A7 catalogIdentity.catalogRevision',
    ),
    catalogContentHash: contentHash(
      value.catalogIdentity.catalogContentHash,
      'A7 catalogIdentity.catalogContentHash',
    ),
    assetSetSha256,
    expectedAssetCount,
  });
  const sourceIdentity = Object.freeze({
    sourceCommit,
    sourceDirty: value.sourceIdentity.sourceDirty,
    contentIdentityHash,
  });
  const formalBudgetEvidence = normalizeFormalBudgetEvidence(value.formalBudgetEvidence);
  const phaseEvidence = normalizePhases(value.phaseEvidence);
  const assets = normalizeAssets(value.assets, expectedAssetCount);
  const environmentBuilds = normalizeEnvironmentBuilds(
    value.environmentBuilds,
    sourceCommit,
    contentIdentityHash,
    assetSetSha256,
  );
  return Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V1_SCHEMA_VERSION,
    sourceIdentity,
    catalogIdentity,
    formalBudgetEvidence,
    phaseEvidence,
    assets,
    environmentBuilds,
    deliveries: normalizeDeliveries(
      value.deliveries,
      sourceCommit,
      contentIdentityHash,
      assetSetSha256,
    ),
    captures: normalizeCaptures(
      value.captures,
      sourceCommit,
      contentIdentityHash,
      assetSetSha256,
      environmentBuilds,
    ),
    reviews: normalizeReviews(value.reviews),
  });
}

function budgetSummary(assets: ReturnType<typeof normalizeAssets>, deliveries: ReturnType<typeof normalizeDeliveries>) {
  const totalEncodedBytes = assets.reduce((sum, asset) => sum + asset.byteLength, 0);
  const audioEncodedBytes = assets
    .filter(({ mediaKind }) => mediaKind === 'audio')
    .reduce((sum, asset) => sum + asset.byteLength, 0);
  const decodedTextureBytes = assets.reduce(
    (sum, asset) => sum + (asset.budget.decodedTextureBytes ?? 0), 0,
  );
  const perItemFailures = Object.freeze(
    assets.flatMap((asset) => {
      const policyArtifact = FORMAL_BUDGET_ARTIFACT_BY_ID.get(asset.assetId);
      const limit = policyArtifact?.path === asset.artifactPath
        ? policyArtifact.maximumEncodedBytes
        : null;
      const failures: string[] = [];
      if (limit !== null && asset.byteLength > limit) failures.push(`${asset.assetId}:encoded`);
      if (asset.budget.budgetClass === 'texture') {
        if ((asset.budget.decodedTextureBytes ?? 0) > MAXIMUM_SINGLE_DECODED_TEXTURE_BYTES) {
          failures.push(`${asset.assetId}:decoded-texture`);
        }
        if ((asset.budget.textureWidth ?? 0) > MAXIMUM_TEXTURE_SIDE
          || (asset.budget.textureHeight ?? 0) > MAXIMUM_TEXTURE_SIDE) {
          failures.push(`${asset.assetId}:texture-side`);
        }
      }
      return failures;
    }),
  );
  const uncoveredAssetIds = Object.freeze(assets
    .filter(({ budget }) => budget.budgetClass === 'uncovered')
    .map(({ assetId }) => assetId));
  const overBudgetDeliveries = Object.freeze(deliveries
    .filter(({ packageByteLength }) => packageByteLength > MAXIMUM_DELIVERY_BYTES)
    .map(({ platformId }) => platformId));
  return Object.freeze({
    policyId: 'arena.stage7.formal-asset-budget.v1' as const,
    policyContentHash:
      ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1.policyContentHash,
    policyArtifactCount:
      ARENA_V2_A7_FORMAL_ASSET_BUDGET_POLICY_IDENTITY_CANDIDATE_V1.artifactCount,
    limits: Object.freeze({
      maximumTotalEncodedBytes: MAXIMUM_TOTAL_ENCODED_BYTES,
      maximumAudioEncodedBytes: MAXIMUM_AUDIO_ENCODED_BYTES,
      maximumDecodedTextureBytes: MAXIMUM_DECODED_TEXTURE_BYTES,
      maximumSingleDecodedTextureBytes: MAXIMUM_SINGLE_DECODED_TEXTURE_BYTES,
      maximumTextureSide: MAXIMUM_TEXTURE_SIDE,
      maximumDeliveryBytes: MAXIMUM_DELIVERY_BYTES,
      perItemEncodedBytes: PER_ITEM_LIMITS,
    }),
    measured: Object.freeze({
      totalEncodedBytes,
      audioEncodedBytes,
      decodedTextureBytes,
      deliveryBytes: Object.freeze(deliveries.map(({ platformId, packageByteLength }) => (
        Object.freeze({ platformId, packageByteLength })
      ))),
    }),
    uncoveredAssetIds,
    perItemFailures,
    overBudgetDeliveries,
    totalEncodedPassed: totalEncodedBytes <= MAXIMUM_TOTAL_ENCODED_BYTES,
    audioEncodedPassed: audioEncodedBytes <= MAXIMUM_AUDIO_ENCODED_BYTES,
    decodedTexturePassed: decodedTextureBytes <= MAXIMUM_DECODED_TEXTURE_BYTES,
  });
}

/**
 * Recomputes only the A7 visual/media evidence state. It never collects evidence,
 * approves an asset or computes the P7 release decision.
 */
export function evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(value: unknown) {
  const source = cloneFrozenData(value, 'Arena V2 A7 visual/media evidence options');
  exactRecord(source, OPTION_KEYS, 'Arena V2 A7 visual/media evidence options');
  const evidence = normalizeEvidence(source.evidence);
  const budget = budgetSummary(evidence.assets, evidence.deliveries);
  const incompleteReasons = Object.freeze([
    ...(evidence.sourceIdentity.sourceDirty ? ['source:dirty'] : []),
    ...(evidence.formalBudgetEvidence.status === 'missing'
      ? ['formal-budget-evidence:missing'] : []),
    ...evidence.phaseEvidence.filter(({ status }) => status === 'missing')
      .map(({ phaseId }) => `phase:${phaseId}:missing`),
    ...evidence.assets.filter(({ license }) => license.status === 'missing')
      .map(({ assetId }) => `asset:${assetId}:license-missing`),
    ...evidence.assets.filter(({ approval }) => approval.status === 'missing')
      .map(({ assetId }) => `asset:${assetId}:approval-missing`),
    ...budget.uncoveredAssetIds.map((assetId) => `asset:${assetId}:per-item-budget-uncovered`),
    ...evidence.environmentBuilds.filter(({ status }) => status === 'missing')
      .map(({ environmentId }) => `environment:${environmentId}:missing`),
    ...evidence.deliveries.filter(({ status }) => status === 'missing')
      .map(({ platformId }) => `delivery:${platformId}:missing`),
    ...evidence.captures.filter(({ status }) => status === 'missing')
      .map(({ captureId }) => `capture:${captureId}:missing`),
    ...evidence.reviews.filter(({ status }) => status === 'missing')
      .map(({ dimensionId }) => `review:${dimensionId}:missing`),
  ]);
  const failureReasons = Object.freeze([
    ...(evidence.formalBudgetEvidence.status === 'failed'
      ? ['formal-budget-evidence:failed'] : []),
    ...evidence.phaseEvidence.filter(({ status }) => status === 'failed')
      .map(({ phaseId }) => `phase:${phaseId}:failed`),
    ...evidence.assets.filter(({ license }) => license.status === 'failed')
      .map(({ assetId }) => `asset:${assetId}:license-failed`),
    ...evidence.assets.filter(({ approval }) => approval.status === 'failed')
      .map(({ assetId }) => `asset:${assetId}:approval-failed`),
    ...evidence.environmentBuilds.filter(({ status }) => status === 'failed')
      .map(({ environmentId }) => `environment:${environmentId}:failed`),
    ...evidence.deliveries.filter(({ status }) => status === 'failed')
      .map(({ platformId }) => `delivery:${platformId}:failed`),
    ...evidence.captures.filter(({ status }) => status === 'failed')
      .map(({ captureId }) => `capture:${captureId}:failed`),
    ...evidence.reviews.filter(({ status }) => status === 'failed')
      .map(({ dimensionId }) => `review:${dimensionId}:failed`),
    ...budget.perItemFailures.map((entry) => `budget:${entry}`),
    ...budget.overBudgetDeliveries.map((platformId) => `budget:delivery:${platformId}`),
    ...(!budget.totalEncodedPassed ? ['budget:total-encoded'] : []),
    ...(!budget.audioEncodedPassed ? ['budget:audio-encoded'] : []),
    ...(!budget.decodedTexturePassed ? ['budget:decoded-texture'] : []),
  ]);
  const evidenceStatus: ArenaV2A7FormalVisualMediaFreezeStatusCandidateV1 =
    incompleteReasons.length > 0 ? 'INCOMPLETE'
      : failureReasons.length > 0 ? 'FAIL' : 'PASS';
  const core = Object.freeze({
    schemaVersion:
      ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    defaultReleaseBundleWired: false as const,
    defaultEntryWired: false as const,
    validationStatus: 'not-run' as const,
    publishes: false as const,
    createsOrModifiesAssets: false as const,
    participatesInGameplayAuthority: false as const,
    p7AdvanceComputedHere: false as const,
    p7ReleaseFreezeManifestOwnedHere: false as const,
    evidenceStatus,
    hardGate: evidenceStatus,
    formalVisualMediaReady: evidenceStatus === 'PASS',
    budgetSummary: budget,
    coverageSummary: Object.freeze({
      phaseCount: evidence.phaseEvidence.length,
      assetCount: evidence.assets.length,
      formalBudgetObservationCount:
        evidence.formalBudgetEvidence.artifactObservationCount,
      environmentCount: evidence.environmentBuilds.length,
      deliveryPlatformCount: evidence.deliveries.length,
      captureCount: evidence.captures.length,
      reviewDimensionCount: evidence.reviews.length,
    }),
    incompleteReasons,
    failureReasons,
    explicitNonActions: EXPLICIT_NON_ACTIONS,
    evidence,
  });
  return Object.freeze({
    ...core,
    evidenceIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 A7 formal visual/media freeze evidence candidate V1',
    ),
  });
}

export type ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1 = ReturnType<
  typeof evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1
>;

/** Recomputes a stored result and rejects self-reported status or identity drift. */
export function validateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1(
  value: unknown,
): ArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1 {
  const source = cloneFrozenData(value, 'Arena V2 A7 stored visual/media evidence');
  exactRecord(source, STORED_KEYS, 'Arena V2 A7 stored visual/media evidence');
  const canonical = evaluateArenaV2A7FormalVisualMediaFreezeEvidenceCandidateV1({
    evidence: source.evidence,
  });
  if (
    source.evidenceIdentityHash !== canonical.evidenceIdentityHash
    || createDeterministicDataHash(
      source,
      'Arena V2 A7 stored visual/media evidence comparison',
    ) !== createDeterministicDataHash(
      canonical,
      'Arena V2 A7 stored visual/media evidence comparison',
    )
  ) throw new RangeError('Arena V2 A7 stored visual/media evidence身份或结果发生漂移。');
  return canonical;
}

export const ARENA_V2_A7_FORMAL_VISUAL_MEDIA_FREEZE_EVIDENCE_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  defaultReleaseBundleWired: false as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
  currentPassInstanceExists: false as const,
  createsOrModifiesAssets: false as const,
  producesDeviceHumanOrApprovalEvidence: false as const,
  p7ReleaseFreezeManifestOwnedHere: false as const,
  p7AdvanceComputedHere: false as const,
  assetMaximumCount: MAXIMUM_ASSET_COUNT,
  requiredEnvironmentCount: ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1.length,
  requiredDeliveryPlatformCount: ARENA_V2_A7_DELIVERY_PLATFORM_IDS_CANDIDATE_V1.length,
  requiredCaptureCount:
    ARENA_V2_A7_TARGET_ENVIRONMENTS_CANDIDATE_V1.length
    * ARENA_V2_A7_CAPTURE_REQUIREMENTS_CANDIDATE_V1.length,
});
