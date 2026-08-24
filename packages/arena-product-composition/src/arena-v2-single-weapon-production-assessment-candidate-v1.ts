import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1,
} from './arena-v2-single-weapon-production-readiness-candidate-v1.js';

export const ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const CONTENT_HASH_PATTERN = /^[0-9a-f]{8}$/u;
const EVIDENCE_STATUSES = new Set(['missing', 'failed', 'passed'] as const);
const AUDIT_DECISIONS = new Set(['missing', 'remain', 'rollback', 'advance'] as const);
const OPTION_KEYS = new Set([
  'schemaVersion', 'weaponId', 'readinessContentHash', 'evidence', 'independentAudit',
]);
const EVIDENCE_KEYS = new Set([
  'schemaVersion', 'dimensionId', 'evidenceClass', 'evidenceId', 'producerId',
  'sourceReadinessContentHash', 'sourceWeaponBundleContentHash',
  'sourceCounterplayContentHash', 'status', 'score', 'evidenceSha256',
]);
const AUDIT_KEYS = new Set([
  'schemaVersion', 'auditId', 'auditorId', 'sourceReadinessContentHash',
  'sourcePolicyContentHash', 'decision', 'evidenceSha256',
]);
const STORED_ASSESSMENT_KEYS = new Set([
  'schemaVersion', 'status', 'implementationStatus', 'validationStatus',
  'weaponId', 'equipmentDefinitionId', 'readinessContentHash', 'policyContentHash',
  'evidenceContentHash', 'evaluationStatus', 'hardGate', 'scoreEligible',
  'computedScore', 'totalScorePassed', 'everyDimensionPassed', 'dimensions',
  'assetGates', 'allProductionAssetsApproved', 'independentAudit', 'failureReasons',
  'productionRegistrationPermitted', 'groupRegistrationPermitted',
  'defaultRegistryWired', 'defaultCompositionWired', 'acceptsCallerSuppliedApproval',
  'rollbackUnit', 'evidence', 'assessmentContentHash',
]);

const SCORE_DIMENSIONS = Object.freeze([
  Object.freeze({
    dimensionId: 'independent-combat-grammar' as const,
    evidenceClass: 'rule-core-counterplay-probes' as const,
    weight: 15 as const,
  }),
  Object.freeze({
    dimensionId: 'definition-action-state' as const,
    evidenceClass: 'definition-registry-action-lifecycle' as const,
    weight: 20 as const,
  }),
  Object.freeze({
    dimensionId: 'replay-determinism' as const,
    evidenceClass: 'match-replay-checkpoint-hash' as const,
    weight: 15 as const,
  }),
  Object.freeze({
    dimensionId: 'map-mode-consequences' as const,
    evidenceClass: 'three-mode-map-consequence-matrix' as const,
    weight: 15 as const,
  }),
  Object.freeze({
    dimensionId: 'balance-counterplay' as const,
    evidenceClass: 'headless-balance-counterplay-matrix' as const,
    weight: 15 as const,
  }),
  Object.freeze({
    dimensionId: 'feedback-device-human-readability' as const,
    evidenceClass: 'final-feedback-device-human-readability' as const,
    weight: 15 as const,
  }),
  Object.freeze({
    dimensionId: 'governance-evidence' as const,
    evidenceClass: 'source-license-migration-rollback-audit' as const,
    weight: 5 as const,
  }),
]);

const POLICY_AUTHORITY = Object.freeze({
  schemaVersion: ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.single-weapon-production-assessment-policy.candidate.v1' as const,
  status: 'production-unreachable' as const,
  minimumWeightedScore: 90 as const,
  minimumDimensionScore: 80 as const,
  scoreDimensions: SCORE_DIMENSIONS,
  requiredEvidenceRecordCount: 7 as const,
  independentAuditRequired: true as const,
  allProductionAssetsApprovedRequired: true as const,
  registrationUnit: 'single-weapon' as const,
  groupRegistrationPermitted: false as const,
  acceptsCallerSuppliedApproval: false as const,
  defaultRegistryWired: false as const,
});

export const ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_POLICY_CANDIDATE_V1 =
  Object.freeze({
    ...POLICY_AUTHORITY,
    contentHash: createDeterministicDataHash(
      POLICY_AUTHORITY,
      'Arena V2 single weapon production assessment policy candidate V1',
    ),
  });

if (SCORE_DIMENSIONS.reduce((sum, dimension) => sum + dimension.weight, 0) !== 100
  || new Set(SCORE_DIMENSIONS.map(({ dimensionId }) => dimensionId)).size !== 7
  || new Set(SCORE_DIMENSIONS.map(({ evidenceClass }) => evidenceClass)).size !== 7) {
  throw new RangeError('Arena V2逐武器评估策略必须闭合7个独立维度与100分权重。');
}

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
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
}

function contentHash(value: unknown, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (!CONTENT_HASH_PATTERN.test(result)) throw new RangeError(`${name}必须是8位小写hash。`);
  return result;
}

function nullableText(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function nullableSha256(value: unknown, name: string): string | null {
  if (value === null) return null;
  const result = assertNonEmptyString(value, name);
  if (!SHA256_PATTERN.test(result)) throw new RangeError(`${name}必须是64位小写SHA-256。`);
  return result;
}

function score(value: unknown, name: string): number {
  if (typeof value !== 'number'
    || !Number.isInteger(value)
    || value < 0
    || value > 100) {
    throw new RangeError(`${name}必须是0到100的整数。`);
  }
  return value;
}

type Readiness = typeof ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1[
  'weapons'
][number];

function normalizeEvidence(value: unknown, readiness: Readiness) {
  if (!Array.isArray(value) || value.length !== SCORE_DIMENSIONS.length) {
    throw new RangeError('Arena V2逐武器评估必须提供精确7条维度证据。');
  }
  const byDimension = new Map<string, Record<string, unknown>>();
  value.forEach((entry, index) => {
    exactRecord(entry, EVIDENCE_KEYS, `Arena V2 weapon evidence[${index}]`);
    const dimensionId = assertNonEmptyString(
      entry.dimensionId,
      `Arena V2 weapon evidence[${index}].dimensionId`,
    );
    if (byDimension.has(dimensionId)) {
      throw new RangeError(`Arena V2逐武器评估维度重复：${dimensionId}。`);
    }
    byDimension.set(dimensionId, entry);
  });
  return Object.freeze(SCORE_DIMENSIONS.map((dimension) => {
    const entry = byDimension.get(dimension.dimensionId);
    if (entry === undefined) {
      throw new RangeError(`Arena V2逐武器评估缺少维度${dimension.dimensionId}。`);
    }
    if (entry.schemaVersion
      !== ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_CANDIDATE_V1_SCHEMA_VERSION
      || entry.evidenceClass !== dimension.evidenceClass) {
      throw new RangeError(`Arena V2逐武器评估${dimension.dimensionId}版本或证据类型漂移。`);
    }
    const status = entry.status;
    if (!EVIDENCE_STATUSES.has(status as 'missing' | 'failed' | 'passed')) {
      throw new RangeError(`Arena V2逐武器评估${dimension.dimensionId}状态无效。`);
    }
    const normalizedStatus = status as 'missing' | 'failed' | 'passed';
    const evidenceId = nullableText(entry.evidenceId, `${dimension.dimensionId}.evidenceId`);
    const producerId = nullableText(entry.producerId, `${dimension.dimensionId}.producerId`);
    const evidenceSha256 = nullableSha256(
      entry.evidenceSha256,
      `${dimension.dimensionId}.evidenceSha256`,
    );
    const normalizedScore = score(entry.score, `${dimension.dimensionId}.score`);
    if (contentHash(
      entry.sourceReadinessContentHash,
      `${dimension.dimensionId}.sourceReadinessContentHash`,
    ) !== readiness.readinessContentHash
      || contentHash(
        entry.sourceWeaponBundleContentHash,
        `${dimension.dimensionId}.sourceWeaponBundleContentHash`,
      ) !== readiness.identities.weaponBundleContentHash
      || contentHash(
        entry.sourceCounterplayContentHash,
        `${dimension.dimensionId}.sourceCounterplayContentHash`,
      ) !== readiness.identities.counterplayContentHash) {
      throw new RangeError(`Arena V2逐武器评估${dimension.dimensionId}来源身份漂移。`);
    }
    if (normalizedStatus === 'missing'
      ? evidenceId !== null
        || producerId !== null
        || evidenceSha256 !== null
        || normalizedScore !== 0
      : evidenceId === null || producerId === null || evidenceSha256 === null) {
      throw new RangeError(`Arena V2逐武器评估${dimension.dimensionId}证据字段不闭合。`);
    }
    return Object.freeze({
      schemaVersion:
        ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_CANDIDATE_V1_SCHEMA_VERSION,
      dimensionId: dimension.dimensionId,
      evidenceClass: dimension.evidenceClass,
      evidenceId,
      producerId,
      sourceReadinessContentHash: readiness.readinessContentHash,
      sourceWeaponBundleContentHash: readiness.identities.weaponBundleContentHash,
      sourceCounterplayContentHash: readiness.identities.counterplayContentHash,
      status: normalizedStatus,
      score: normalizedScore,
      evidenceSha256,
    });
  }));
}

function normalizeAudit(
  value: unknown,
  readiness: Readiness,
  evidenceProducerIds: ReadonlySet<string>,
) {
  exactRecord(value, AUDIT_KEYS, 'Arena V2 single weapon independent audit');
  if (value.schemaVersion
    !== ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_CANDIDATE_V1_SCHEMA_VERSION) {
    throw new RangeError('Arena V2逐武器独立审计schemaVersion无效。');
  }
  const decision = value.decision;
  if (!AUDIT_DECISIONS.has(decision as 'missing' | 'remain' | 'rollback' | 'advance')) {
    throw new RangeError('Arena V2逐武器独立审计decision无效。');
  }
  const normalizedDecision = decision as 'missing' | 'remain' | 'rollback' | 'advance';
  const auditId = nullableText(value.auditId, 'Arena V2 single weapon auditId');
  const auditorId = nullableText(value.auditorId, 'Arena V2 single weapon auditorId');
  const evidenceSha256 = nullableSha256(
    value.evidenceSha256,
    'Arena V2 single weapon audit evidenceSha256',
  );
  if (contentHash(
    value.sourceReadinessContentHash,
    'Arena V2 single weapon audit sourceReadinessContentHash',
  ) !== readiness.readinessContentHash
    || contentHash(
      value.sourcePolicyContentHash,
      'Arena V2 single weapon audit sourcePolicyContentHash',
    ) !== ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_POLICY_CANDIDATE_V1.contentHash) {
    throw new RangeError('Arena V2逐武器独立审计来源身份漂移。');
  }
  if (normalizedDecision === 'missing'
    ? auditId !== null || auditorId !== null || evidenceSha256 !== null
    : auditId === null || auditorId === null || evidenceSha256 === null) {
    throw new RangeError('Arena V2逐武器独立审计字段不闭合。');
  }
  if (auditorId !== null && evidenceProducerIds.has(auditorId)) {
    throw new RangeError('Arena V2逐武器独立审计人不得兼任该武器证据生产者。');
  }
  return Object.freeze({
    schemaVersion:
      ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_CANDIDATE_V1_SCHEMA_VERSION,
    auditId,
    auditorId,
    sourceReadinessContentHash: readiness.readinessContentHash,
    sourcePolicyContentHash:
      ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_POLICY_CANDIDATE_V1.contentHash,
    decision: normalizedDecision,
    evidenceSha256,
  });
}

/**
 * Scores one exact collection weapon against the immutable per-weapon policy.
 * It consumes identity-bound evidence records and current catalog approvals;
 * it never mutates a registry or accepts an approval boolean from the caller.
 */
export function assessArenaV2SingleWeaponProductionCandidateV1(value: unknown) {
  const source = cloneFrozenData(value, 'Arena V2 single weapon production assessment');
  exactRecord(source, OPTION_KEYS, 'Arena V2 single weapon production assessment');
  if (source.schemaVersion
    !== ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_CANDIDATE_V1_SCHEMA_VERSION) {
    throw new RangeError('Arena V2逐武器生产评估schemaVersion无效。');
  }
  const weaponId = assertNonEmptyString(source.weaponId, 'Arena V2 assessment.weaponId');
  const readiness = ARENA_V2_SINGLE_WEAPON_PRODUCTION_READINESS_MATRIX_CANDIDATE_V1
    .weapons.find((entry) => entry.weaponId === weaponId);
  if (readiness === undefined) throw new RangeError(`Arena V2逐武器生产评估未知武器${weaponId}。`);
  if (contentHash(source.readinessContentHash, 'Arena V2 assessment.readinessContentHash')
    !== readiness.readinessContentHash) {
    throw new RangeError(`Arena V2逐武器生产评估${weaponId}readiness身份漂移。`);
  }

  const evidence = normalizeEvidence(source.evidence, readiness);
  const producerIds = new Set(evidence.flatMap(({ producerId }) => (
    producerId === null ? [] : [producerId]
  )));
  const independentAudit = normalizeAudit(source.independentAudit, readiness, producerIds);
  const dimensions = Object.freeze(evidence.map((entry, index) => {
    const policy = SCORE_DIMENSIONS[index]!;
    return Object.freeze({
      dimensionId: entry.dimensionId,
      evidenceClass: entry.evidenceClass,
      status: entry.status,
      score: entry.score,
      weight: policy.weight,
      weightedPoints: entry.score * policy.weight / 100,
      passedMinimum: entry.status === 'passed'
        && entry.score >= ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_POLICY_CANDIDATE_V1
          .minimumDimensionScore,
    });
  }));
  const hasMissingEvidence = evidence.some(({ status }) => status === 'missing');
  const scoreEligible = !hasMissingEvidence;
  const computedScore = scoreEligible
    ? dimensions.reduce((sum, dimension) => sum + dimension.weightedPoints, 0)
    : null;
  const totalScorePassed = computedScore !== null
    && computedScore
      >= ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_POLICY_CANDIDATE_V1
        .minimumWeightedScore;
  const everyDimensionPassed = dimensions.every(({ passedMinimum }) => passedMinimum);
  const assetGates = Object.freeze({
    attachmentProductionApproved: readiness.attachment.productionApproved,
    impactAudioProductionApproved: readiness.impactAudio.productionApproved,
    everyPhaseAudioProductionApproved: readiness.phaseAudio.every(
      ({ productionApproved }) => productionApproved,
    ),
    everyCoreFeedbackVfxProductionApproved: readiness.coreFeedbackVfx.every(
      ({ productionApproved }) => productionApproved,
    ),
  });
  const allProductionAssetsApproved = Object.values(assetGates).every(Boolean);
  const incomplete = hasMissingEvidence || independentAudit.decision === 'missing';
  const failed = evidence.some(({ status }) => status === 'failed')
    || !totalScorePassed
    || !everyDimensionPassed
    || !allProductionAssetsApproved
    || independentAudit.decision === 'remain'
    || independentAudit.decision === 'rollback';
  const evaluationStatus = incomplete
    ? 'incomplete' as const
    : failed
      ? 'failed' as const
      : 'passed' as const;
  const failureReasons = Object.freeze([
    ...evidence.filter(({ status }) => status !== 'passed')
      .map(({ dimensionId, status }) => `evidence:${dimensionId}:${status}`),
    ...(computedScore === null ? ['score:not-eligible'] : []),
    ...(computedScore !== null && !totalScorePassed ? [`score-total:${computedScore}`] : []),
    ...dimensions.filter(({ passedMinimum }) => !passedMinimum)
      .map(({ dimensionId }) => `score-dimension:${dimensionId}`),
    ...Object.entries(assetGates).flatMap(([gate, passed]) => (
      passed ? [] : [`asset:${gate}`]
    )),
    ...(independentAudit.decision === 'advance'
      ? []
      : [`independent-audit:${independentAudit.decision}`]),
  ]);
  const evidenceContentHash = createDeterministicDataHash(
    Object.freeze({ evidence, independentAudit }),
    `Arena V2 single weapon production evidence ${weaponId}`,
  );
  const authority = Object.freeze({
    schemaVersion:
      ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    weaponId: readiness.weaponId,
    equipmentDefinitionId: readiness.identities.equipmentDefinitionId,
    readinessContentHash: readiness.readinessContentHash,
    policyContentHash:
      ARENA_V2_SINGLE_WEAPON_PRODUCTION_ASSESSMENT_POLICY_CANDIDATE_V1.contentHash,
    evidenceContentHash,
    evaluationStatus,
    hardGate: evaluationStatus === 'passed'
      ? 'PASS' as const
      : evaluationStatus === 'failed'
        ? 'FAIL' as const
        : 'INCOMPLETE' as const,
    scoreEligible,
    computedScore,
    totalScorePassed,
    everyDimensionPassed,
    dimensions,
    assetGates,
    allProductionAssetsApproved,
    independentAudit,
    failureReasons,
    productionRegistrationPermitted: evaluationStatus === 'passed'
      && independentAudit.decision === 'advance',
    groupRegistrationPermitted: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    acceptsCallerSuppliedApproval: false as const,
    rollbackUnit: readiness.rollbackUnit,
    evidence,
  });
  return Object.freeze({
    ...authority,
    assessmentContentHash: createDeterministicDataHash(
      authority,
      `Arena V2 single weapon production assessment ${weaponId}`,
    ),
  });
}

export type ArenaV2SingleWeaponProductionAssessmentCandidateV1 = ReturnType<
  typeof assessArenaV2SingleWeaponProductionCandidateV1
>;

/** Recomputes every derived field and rejects a stored assessment with drift. */
export function validateArenaV2SingleWeaponProductionAssessmentCandidateV1(
  value: unknown,
): ArenaV2SingleWeaponProductionAssessmentCandidateV1 {
  const source = cloneFrozenData(value, 'Arena V2 stored single weapon assessment');
  exactRecord(source, STORED_ASSESSMENT_KEYS, 'Arena V2 stored single weapon assessment');
  const storedHash = contentHash(
    source.assessmentContentHash,
    'Arena V2 stored single weapon assessment.assessmentContentHash',
  );
  const {
    assessmentContentHash: _assessmentContentHash,
    ...storedAuthority
  } = source;
  const actualStoredHash = createDeterministicDataHash(
    storedAuthority,
    `Arena V2 single weapon production assessment ${String(source.weaponId)}`,
  );
  if (actualStoredHash !== storedHash) {
    throw new RangeError('Arena V2逐武器生产评估存储内容hash漂移。');
  }
  const recomputed = assessArenaV2SingleWeaponProductionCandidateV1({
    schemaVersion: source.schemaVersion,
    weaponId: source.weaponId,
    readinessContentHash: source.readinessContentHash,
    evidence: source.evidence,
    independentAudit: source.independentAudit,
  });
  if (recomputed.assessmentContentHash !== storedHash) {
    throw new RangeError('Arena V2逐武器生产评估派生结果漂移。');
  }
  return recomputed;
}
