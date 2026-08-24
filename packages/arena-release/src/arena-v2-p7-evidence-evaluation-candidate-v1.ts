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
  validateArenaV2P7PreregistrationCandidateV1,
  type ArenaV2P7PreregistrationCandidateV1,
} from './arena-v2-p7-preregistration-candidate-v1.js';

export const ARENA_V2_P7_EVIDENCE_EVALUATION_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

export type ArenaV2P7EvidenceEvaluationStatusCandidateV1 =
  | 'incomplete'
  | 'failed'
  | 'passed';

export type ArenaV2P7EvidenceItemStatusCandidateV1 = 'missing' | 'failed' | 'passed';
export type ArenaV2P7IndependentAuditDecisionCandidateV1 =
  | 'missing'
  | 'remain'
  | 'rollback'
  | 'advance';
export type ArenaV2P7DefectSeverityCandidateV1 =
  | 'blocking'
  | 'high'
  | 'medium'
  | 'low';
export type ArenaV2P7DefectStatusCandidateV1 = 'open' | 'closed';
export type ArenaV2P7ScoreEvidenceStatusCandidateV1 = 'missing' | 'available';
type EvidenceItemStatus = ArenaV2P7EvidenceItemStatusCandidateV1;
type AuditDecision = ArenaV2P7IndependentAuditDecisionCandidateV1;
type DefectSeverity = ArenaV2P7DefectSeverityCandidateV1;
type DefectStatus = ArenaV2P7DefectStatusCandidateV1;

export interface ArenaV2P7EvidenceFractionCandidateV1 {
  readonly numerator: number;
  readonly denominator: number;
}
type Fraction = ArenaV2P7EvidenceFractionCandidateV1;

export interface ArenaV2P7SubgroupEvidenceCandidateV1 extends Fraction {
  readonly subgroupId: string;
}
type SubgroupFraction = ArenaV2P7SubgroupEvidenceCandidateV1;

export interface ArenaV2P7EnvironmentEvidenceCandidateV1 {
  readonly environmentId: string;
  readonly sourceCommit: string;
  readonly contentIdentityHash: string;
  readonly buildIdentitySha256: string;
  readonly evidenceSha256: string | null;
  readonly status: EvidenceItemStatus;
  readonly failureReason: string | null;
}
type EnvironmentEvidence = ArenaV2P7EnvironmentEvidenceCandidateV1;

export interface ArenaV2P7HumanTaskEvidenceCandidateV1 {
  readonly taskId: string;
  readonly evidenceSha256: string | null;
  readonly qualifiedParticipants: number;
  readonly overallCompletion: Fraction;
  readonly noVerbalHelp: Fraction;
  readonly explanation: Fraction;
  readonly subgroups: readonly SubgroupFraction[];
}
type HumanTaskEvidence = ArenaV2P7HumanTaskEvidenceCandidateV1;

export interface ArenaV2P7LongitudinalEvidenceCandidateV1 {
  readonly checkpointHours: number;
  readonly evidenceSha256: string | null;
  readonly qualifiedParticipants: number;
  readonly activeGoal: Fraction;
  readonly goalCompletion: Fraction;
  readonly crossWeaponOrMapUse: Fraction;
}
type LongitudinalEvidence = ArenaV2P7LongitudinalEvidenceCandidateV1;

export interface ArenaV2P7ScoreEvidenceCandidateV1 {
  readonly dimensionId: string;
  readonly status: ArenaV2P7ScoreEvidenceStatusCandidateV1;
  readonly score: number | null;
  readonly evidenceSha256: string | null;
}
type ScoreEvidence = ArenaV2P7ScoreEvidenceCandidateV1;

export interface ArenaV2P7DefectEvidenceCandidateV1 {
  readonly defectId: string;
  readonly severity: DefectSeverity;
  readonly status: DefectStatus;
  readonly owner: string | null;
  readonly impactScope: string | null;
  readonly acceptanceReason: string | null;
}
type DefectEvidence = ArenaV2P7DefectEvidenceCandidateV1;

export interface ArenaV2P7IndependentAuditEvidenceCandidateV1 {
  readonly sourceCommit: string;
  readonly contentIdentityHash: string;
  readonly environmentBuildSetIdentityHash: string;
  readonly preregistrationIdentityHash: string;
  readonly decision: AuditDecision;
  readonly auditor: string | null;
  readonly reason: string | null;
  readonly evidenceSha256: string | null;
}
type IndependentAuditEvidence = ArenaV2P7IndependentAuditEvidenceCandidateV1;

export interface ArenaV2P7AggregatedEvidenceCandidateV1 {
  readonly schemaVersion: 1;
  readonly sourceCommit: string;
  readonly contentIdentityHash: string;
  readonly environmentBuildSetIdentityHash: string;
  readonly preregistrationIdentityHash: string;
  readonly environmentEvidence: readonly EnvironmentEvidence[];
  readonly humanTaskEvidence: readonly HumanTaskEvidence[];
  readonly longitudinalEvidence: readonly LongitudinalEvidence[];
  readonly scoreEvidence: readonly ScoreEvidence[];
  readonly defects: readonly DefectEvidence[];
  readonly defectLedgerEvidenceSha256: string;
  readonly independentAudit: IndependentAuditEvidence;
}
type AggregatedEvidence = ArenaV2P7AggregatedEvidenceCandidateV1;

export interface ArenaV2P7EvidenceEvaluationOptionsCandidateV1 {
  readonly preregistration: ArenaV2P7PreregistrationCandidateV1;
  readonly evidence: ArenaV2P7AggregatedEvidenceCandidateV1;
}

const OPTION_KEYS = new Set(['preregistration', 'evidence']);
const EVIDENCE_KEYS = new Set([
  'schemaVersion', 'sourceCommit', 'contentIdentityHash', 'environmentBuildSetIdentityHash',
  'preregistrationIdentityHash', 'environmentEvidence', 'humanTaskEvidence',
  'longitudinalEvidence', 'scoreEvidence', 'defects', 'independentAudit',
  'defectLedgerEvidenceSha256',
]);
const ENVIRONMENT_KEYS = new Set([
  'environmentId', 'sourceCommit', 'contentIdentityHash',
  'buildIdentitySha256', 'evidenceSha256', 'status', 'failureReason',
]);
const HUMAN_KEYS = new Set([
  'taskId', 'evidenceSha256', 'qualifiedParticipants', 'overallCompletion', 'noVerbalHelp',
  'explanation', 'subgroups',
]);
const LONGITUDINAL_KEYS = new Set([
  'checkpointHours', 'evidenceSha256', 'qualifiedParticipants', 'activeGoal', 'goalCompletion',
  'crossWeaponOrMapUse',
]);
const FRACTION_KEYS = new Set(['numerator', 'denominator']);
const SUBGROUP_KEYS = new Set(['subgroupId', 'numerator', 'denominator']);
const SCORE_KEYS = new Set(['dimensionId', 'status', 'score', 'evidenceSha256']);
const DEFECT_KEYS = new Set([
  'defectId', 'severity', 'status', 'owner', 'impactScope', 'acceptanceReason',
]);
const AUDIT_KEYS = new Set([
  'sourceCommit', 'contentIdentityHash', 'environmentBuildSetIdentityHash',
  'preregistrationIdentityHash',
  'decision', 'auditor', 'reason', 'evidenceSha256',
]);
const STORED_EVALUATION_KEYS = new Set([
  'schemaVersion', 'status', 'defaultReleaseBundleWired', 'validationStatus',
  'sourceCommit', 'contentIdentityHash', 'preregistrationIdentityHash',
  'preregistration', 'evidenceIdentityHash', 'evaluationStatus', 'hardGate',
  'advanceEligible', 'environmentGates', 'humanTaskGates', 'longitudinalGates',
  'scoreSummary', 'defectSummary', 'independentAudit', 'failureReasons',
  'evidence', 'evaluationIdentityHash',
]);
const CONTENT_HASH_PATTERN = /^[0-9a-f]{8}$/u;
const DEFECT_SEVERITIES = new Set<DefectSeverity>([
  'blocking', 'high', 'medium', 'low',
]);
const DEFECT_STATUSES = new Set<DefectStatus>(['open', 'closed']);
const EVIDENCE_ITEM_STATUSES = new Set<EvidenceItemStatus>([
  'missing', 'failed', 'passed',
]);
const AUDIT_DECISIONS = new Set<AuditDecision>([
  'missing', 'remain', 'rollback', 'advance',
]);
const SCORE_EVIDENCE_STATUSES = new Set<ArenaV2P7ScoreEvidenceStatusCandidateV1>([
  'missing', 'available',
]);

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

function contentHash(value: unknown, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (!CONTENT_HASH_PATTERN.test(result)) {
    throw new RangeError(`${name}必须是8位小写hash。`);
  }
  return result;
}

function nullableText(value: unknown, name: string): string | null {
  if (value === null) return null;
  return assertNonEmptyString(value, name);
}

function finiteScore(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new RangeError(`${name}必须是0到100的有限数。`);
  }
  return value;
}

function identityText(value: unknown, name: string): string {
  return assertNonEmptyString(value, name);
}

function checkpointIdentity(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name}必须是非负有限数。`);
  }
  return value;
}

function normalizeFraction(value: unknown, name: string): Fraction {
  exactRecord(value, FRACTION_KEYS, name);
  const numerator = assertIntegerAtLeast(value.numerator, 0, `${name}.numerator`);
  const denominator = assertIntegerAtLeast(value.denominator, 0, `${name}.denominator`);
  if (numerator > denominator) {
    throw new RangeError(`${name}.numerator不得大于denominator。`);
  }
  return Object.freeze({ numerator, denominator });
}

function fractionRate(value: Fraction): number | null {
  return value.denominator === 0 ? null : value.numerator / value.denominator;
}

function requireCanonicalCoverage<T>(
  value: unknown,
  canonicalKeys: readonly string[],
  keyOf: (entry: unknown, index: number) => string,
  normalize: (entry: unknown, index: number) => T,
  name: string,
): readonly T[] {
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  if (value.length !== canonicalKeys.length) {
    throw new RangeError(`${name}必须精确覆盖${canonicalKeys.length}项。`);
  }
  return Object.freeze(value.map((entry, index) => {
    const expected = canonicalKeys[index];
    if (keyOf(entry, index) !== expected) {
      throw new RangeError(`${name}[${index}]必须是${expected}且保持预注册顺序。`);
    }
    return normalize(entry, index);
  }));
}

function normalizeEnvironments(
  value: unknown,
  preregistration: ArenaV2P7PreregistrationCandidateV1,
): readonly EnvironmentEvidence[] {
  const ids = preregistration.environmentBuilds.map(({ environmentId }) => environmentId);
  return requireCanonicalCoverage(
    value,
    ids,
    (entry, index) => {
      exactRecord(entry, ENVIRONMENT_KEYS, `P7 environmentEvidence[${index}]`);
      return identityText(
        entry.environmentId,
        `P7 environmentEvidence[${index}].environmentId`,
      );
    },
    (entry, index) => {
      exactRecord(entry, ENVIRONMENT_KEYS, `P7 environmentEvidence[${index}]`);
      const expected = preregistration.environmentBuilds[index]!;
      const status = entry.status as EvidenceItemStatus;
      if (!EVIDENCE_ITEM_STATUSES.has(status)) {
        throw new RangeError(`P7 environmentEvidence[${index}].status无效。`);
      }
      const failureReason = nullableText(
        entry.failureReason,
        `P7 environmentEvidence[${index}].failureReason`,
      );
      if ((status === 'passed') !== (failureReason === null)) {
        throw new RangeError(
          `P7 environmentEvidence[${index}]的status与failureReason不闭合。`,
        );
      }
      const normalized = Object.freeze({
        environmentId: identityText(
          entry.environmentId,
          `P7 environmentEvidence[${index}].environmentId`,
        ),
        sourceCommit: assertEvidenceGitCommit(
          entry.sourceCommit,
          `P7 environmentEvidence[${index}].sourceCommit`,
        ),
        contentIdentityHash: contentHash(
          entry.contentIdentityHash,
          `P7 environmentEvidence[${index}].contentIdentityHash`,
        ),
        buildIdentitySha256: assertEvidenceSha256(
          entry.buildIdentitySha256,
          `P7 environmentEvidence[${index}].buildIdentitySha256`,
        ),
        evidenceSha256: entry.evidenceSha256 === null
          ? null
          : assertEvidenceSha256(
            entry.evidenceSha256,
            `P7 environmentEvidence[${index}].evidenceSha256`,
          ),
        status,
        failureReason,
      });
      if (
        normalized.sourceCommit !== preregistration.sourceCommit
        || normalized.contentIdentityHash !== preregistration.contentIdentityHash
        || normalized.buildIdentitySha256 !== expected.buildIdentitySha256
      ) {
        throw new RangeError(`P7 environmentEvidence[${index}]身份漂移。`);
      }
      if ((status === 'missing') !== (normalized.evidenceSha256 === null)) {
        throw new RangeError(
          `P7 environmentEvidence[${index}]只有missing可缺少evidenceSha256。`,
        );
      }
      return normalized;
    },
    'P7 environmentEvidence',
  );
}

function normalizeHumanTasks(
  value: unknown,
  preregistration: ArenaV2P7PreregistrationCandidateV1,
): readonly HumanTaskEvidence[] {
  const ids = preregistration.humanTaskThresholds.map(({ taskId }) => taskId);
  return requireCanonicalCoverage(
    value,
    ids,
    (entry, index) => {
      exactRecord(entry, HUMAN_KEYS, `P7 humanTaskEvidence[${index}]`);
      return identityText(entry.taskId, `P7 humanTaskEvidence[${index}].taskId`);
    },
    (entry, index) => {
      exactRecord(entry, HUMAN_KEYS, `P7 humanTaskEvidence[${index}]`);
      const qualifiedParticipants = assertIntegerAtLeast(
        entry.qualifiedParticipants,
        0,
        `P7 humanTaskEvidence[${index}].qualifiedParticipants`,
      );
      const evidenceSha256 = entry.evidenceSha256 === null
        ? null
        : assertEvidenceSha256(
          entry.evidenceSha256,
          `P7 humanTaskEvidence[${index}].evidenceSha256`,
        );
      if ((qualifiedParticipants === 0) !== (evidenceSha256 === null)) {
        throw new RangeError(
          `P7 humanTaskEvidence[${index}]零样本必须且只有零样本可以缺少evidenceSha256。`,
        );
      }
      const overallCompletion = normalizeFraction(
        entry.overallCompletion,
        `P7 humanTaskEvidence[${index}].overallCompletion`,
      );
      const noVerbalHelp = normalizeFraction(
        entry.noVerbalHelp,
        `P7 humanTaskEvidence[${index}].noVerbalHelp`,
      );
      const explanation = normalizeFraction(
        entry.explanation,
        `P7 humanTaskEvidence[${index}].explanation`,
      );
      for (const [metric, fraction] of Object.entries({
        overallCompletion, noVerbalHelp, explanation,
      })) {
        if (fraction.denominator !== qualifiedParticipants) {
          throw new RangeError(
            `P7 humanTaskEvidence[${index}].${metric}分母必须等于合格样本数。`,
          );
        }
      }
      if (!Array.isArray(entry.subgroups)) {
        throw new TypeError(`P7 humanTaskEvidence[${index}].subgroups必须是数组。`);
      }
      if (entry.subgroups.length !== preregistration.humanSubgroups.length) {
        throw new RangeError(
          `P7 humanTaskEvidence[${index}].subgroups必须精确覆盖`
          + `${preregistration.humanSubgroups.length}项预注册子组。`,
        );
      }
      const subgroups = Object.freeze(entry.subgroups.map((subgroup, subgroupIndex) => {
        const name = `P7 humanTaskEvidence[${index}].subgroups[${subgroupIndex}]`;
        exactRecord(subgroup, SUBGROUP_KEYS, name);
        const subgroupId = assertNonEmptyString(subgroup.subgroupId, `${name}.subgroupId`);
        if (subgroupId !== preregistration.humanSubgroups[subgroupIndex]?.id) {
          throw new RangeError(
            `${name}.subgroupId必须是${preregistration.humanSubgroups[subgroupIndex]?.id}`
            + '且保持预注册顺序。',
          );
        }
        const fraction = normalizeFraction({
          numerator: subgroup.numerator,
          denominator: subgroup.denominator,
        }, name);
        return Object.freeze({ subgroupId, ...fraction });
      }));
      if (subgroups.reduce((sum, subgroup) => sum + subgroup.denominator, 0)
        !== qualifiedParticipants) {
        throw new RangeError(
          `P7 humanTaskEvidence[${index}].subgroups分母总和必须等于合格样本数。`,
        );
      }
      return Object.freeze({
        taskId: identityText(entry.taskId, `P7 humanTaskEvidence[${index}].taskId`),
        evidenceSha256,
        qualifiedParticipants,
        overallCompletion,
        noVerbalHelp,
        explanation,
        subgroups,
      });
    },
    'P7 humanTaskEvidence',
  );
}

function normalizeLongitudinal(
  value: unknown,
  preregistration: ArenaV2P7PreregistrationCandidateV1,
): readonly LongitudinalEvidence[] {
  const checkpoints = preregistration.longitudinalThresholds.map(({ checkpointHours }) => (
    String(checkpointHours)
  ));
  return requireCanonicalCoverage(
    value,
    checkpoints,
    (entry, index) => {
      exactRecord(entry, LONGITUDINAL_KEYS, `P7 longitudinalEvidence[${index}]`);
      return String(checkpointIdentity(
        entry.checkpointHours,
        `P7 longitudinalEvidence[${index}].checkpointHours`,
      ));
    },
    (entry, index) => {
      exactRecord(entry, LONGITUDINAL_KEYS, `P7 longitudinalEvidence[${index}]`);
      const expectedCheckpoint = preregistration.longitudinalThresholds[index]!
        .checkpointHours;
      const checkpointHours = checkpointIdentity(
        entry.checkpointHours,
        `P7 longitudinalEvidence[${index}].checkpointHours`,
      );
      if (checkpointHours !== expectedCheckpoint) {
        throw new RangeError(`P7 longitudinalEvidence[${index}]节点身份漂移。`);
      }
      const qualifiedParticipants = assertIntegerAtLeast(
        entry.qualifiedParticipants,
        0,
        `P7 longitudinalEvidence[${index}].qualifiedParticipants`,
      );
      const evidenceSha256 = entry.evidenceSha256 === null
        ? null
        : assertEvidenceSha256(
          entry.evidenceSha256,
          `P7 longitudinalEvidence[${index}].evidenceSha256`,
        );
      if ((qualifiedParticipants === 0) !== (evidenceSha256 === null)) {
        throw new RangeError(
          `P7 longitudinalEvidence[${index}]零样本必须且只有零样本可以缺少evidenceSha256。`,
        );
      }
      const activeGoal = normalizeFraction(
        entry.activeGoal,
        `P7 longitudinalEvidence[${index}].activeGoal`,
      );
      const goalCompletion = normalizeFraction(
        entry.goalCompletion,
        `P7 longitudinalEvidence[${index}].goalCompletion`,
      );
      const crossWeaponOrMapUse = normalizeFraction(
        entry.crossWeaponOrMapUse,
        `P7 longitudinalEvidence[${index}].crossWeaponOrMapUse`,
      );
      for (const [metric, fraction] of Object.entries({
        activeGoal, goalCompletion, crossWeaponOrMapUse,
      })) {
        if (fraction.denominator !== qualifiedParticipants) {
          throw new RangeError(
            `P7 longitudinalEvidence[${index}].${metric}分母必须等于合格样本数。`,
          );
        }
      }
      return Object.freeze({
        checkpointHours,
        evidenceSha256,
        qualifiedParticipants,
        activeGoal,
        goalCompletion,
        crossWeaponOrMapUse,
      });
    },
    'P7 longitudinalEvidence',
  );
}

function normalizeScores(
  value: unknown,
  preregistration: ArenaV2P7PreregistrationCandidateV1,
): readonly ScoreEvidence[] {
  const ids = preregistration.scoreDimensions.map(({ id }) => id);
  return requireCanonicalCoverage(
    value,
    ids,
    (entry, index) => {
      exactRecord(entry, SCORE_KEYS, `P7 scoreEvidence[${index}]`);
      return identityText(entry.dimensionId, `P7 scoreEvidence[${index}].dimensionId`);
    },
    (entry, index) => {
      exactRecord(entry, SCORE_KEYS, `P7 scoreEvidence[${index}]`);
      const status = entry.status as ArenaV2P7ScoreEvidenceStatusCandidateV1;
      if (!SCORE_EVIDENCE_STATUSES.has(status)) {
        throw new RangeError(`P7 scoreEvidence[${index}].status无效。`);
      }
      if (status === 'missing') {
        if (entry.score !== null || entry.evidenceSha256 !== null) {
          throw new RangeError(
            `P7 scoreEvidence[${index}]缺失时不得伪造score或evidenceSha256。`,
          );
        }
      } else if (entry.score === null || entry.evidenceSha256 === null) {
        throw new RangeError(
          `P7 scoreEvidence[${index}]可用时必须同时提供score与evidenceSha256。`,
        );
      }
      return Object.freeze({
        dimensionId: identityText(
          entry.dimensionId,
          `P7 scoreEvidence[${index}].dimensionId`,
        ),
        status,
        score: status === 'missing'
          ? null
          : finiteScore(entry.score, `P7 scoreEvidence[${index}].score`),
        evidenceSha256: status === 'missing'
          ? null
          : assertEvidenceSha256(
            entry.evidenceSha256,
            `P7 scoreEvidence[${index}].evidenceSha256`,
          ),
      });
    },
    'P7 scoreEvidence',
  );
}

function normalizeDefects(value: unknown): readonly DefectEvidence[] {
  if (!Array.isArray(value)) throw new TypeError('P7 defects必须是数组。');
  const ids = new Set<string>();
  let previousId: string | null = null;
  return Object.freeze(value.map((entry, index) => {
    const name = `P7 defects[${index}]`;
    exactRecord(entry, DEFECT_KEYS, name);
    const defectId = assertNonEmptyString(entry.defectId, `${name}.defectId`);
    if (ids.has(defectId) || (previousId !== null && defectId <= previousId)) {
      throw new RangeError('P7 defects必须ID唯一且稳定排序。');
    }
    ids.add(defectId);
    previousId = defectId;
    const severity = entry.severity as DefectSeverity;
    const status = entry.status as DefectStatus;
    if (!DEFECT_SEVERITIES.has(severity)) throw new RangeError(`${name}.severity无效。`);
    if (!DEFECT_STATUSES.has(status)) throw new RangeError(`${name}.status无效。`);
    return Object.freeze({
      defectId,
      severity,
      status,
      owner: nullableText(entry.owner, `${name}.owner`),
      impactScope: nullableText(entry.impactScope, `${name}.impactScope`),
      acceptanceReason: nullableText(entry.acceptanceReason, `${name}.acceptanceReason`),
    });
  }));
}

function normalizeAudit(
  value: unknown,
  preregistration: ArenaV2P7PreregistrationCandidateV1,
): IndependentAuditEvidence {
  exactRecord(value, AUDIT_KEYS, 'P7 independentAudit');
  const decision = value.decision as AuditDecision;
  if (!AUDIT_DECISIONS.has(decision)) throw new RangeError('P7 independentAudit.decision无效。');
  const auditor = nullableText(value.auditor, 'P7 independentAudit.auditor');
  const reason = nullableText(value.reason, 'P7 independentAudit.reason');
  if (decision === 'missing' ? auditor !== null || reason !== null : auditor === null || reason === null) {
    throw new RangeError('P7 independentAudit的decision/auditor/reason不闭合。');
  }
  const evidenceSha256 = value.evidenceSha256 === null
    ? null
    : assertEvidenceSha256(
      value.evidenceSha256,
      'P7 independentAudit.evidenceSha256',
    );
  if ((decision === 'missing') !== (evidenceSha256 === null)) {
    throw new RangeError('P7 independentAudit只有missing决定可以缺少evidenceSha256。');
  }
  const result = Object.freeze({
    sourceCommit: assertEvidenceGitCommit(value.sourceCommit, 'P7 independentAudit.sourceCommit'),
    contentIdentityHash: contentHash(
      value.contentIdentityHash,
      'P7 independentAudit.contentIdentityHash',
    ),
    environmentBuildSetIdentityHash: contentHash(
      value.environmentBuildSetIdentityHash,
      'P7 independentAudit.environmentBuildSetIdentityHash',
    ),
    preregistrationIdentityHash: contentHash(
      value.preregistrationIdentityHash,
      'P7 independentAudit.preregistrationIdentityHash',
    ),
    decision,
    auditor,
    reason,
    evidenceSha256,
  });
  if (
    result.sourceCommit !== preregistration.sourceCommit
    || result.contentIdentityHash !== preregistration.contentIdentityHash
    || result.environmentBuildSetIdentityHash
      !== preregistration.environmentBuildSetIdentityHash
    || result.preregistrationIdentityHash !== preregistration.preregistrationIdentityHash
  ) throw new RangeError('P7 independentAudit身份漂移。');
  return result;
}

function normalizeEvidence(
  value: unknown,
  preregistration: ArenaV2P7PreregistrationCandidateV1,
): AggregatedEvidence {
  exactRecord(value, EVIDENCE_KEYS, 'P7 aggregated evidence');
  if (value.schemaVersion !== ARENA_V2_P7_EVIDENCE_EVALUATION_CANDIDATE_V1_SCHEMA_VERSION) {
    throw new RangeError('P7 aggregated evidence schemaVersion无效。');
  }
  const sourceCommit = assertEvidenceGitCommit(value.sourceCommit, 'P7 evidence sourceCommit');
  const contentIdentityHash = contentHash(value.contentIdentityHash, 'P7 evidence contentIdentityHash');
  const environmentBuildSetIdentityHash = contentHash(
    value.environmentBuildSetIdentityHash,
    'P7 evidence environmentBuildSetIdentityHash',
  );
  const preregistrationIdentityHash = contentHash(
    value.preregistrationIdentityHash,
    'P7 evidence preregistrationIdentityHash',
  );
  if (
    sourceCommit !== preregistration.sourceCommit
    || contentIdentityHash !== preregistration.contentIdentityHash
    || environmentBuildSetIdentityHash !== preregistration.environmentBuildSetIdentityHash
    || preregistrationIdentityHash !== preregistration.preregistrationIdentityHash
  ) throw new RangeError('P7 aggregated evidence顶层身份漂移。');
  return Object.freeze({
    schemaVersion: ARENA_V2_P7_EVIDENCE_EVALUATION_CANDIDATE_V1_SCHEMA_VERSION,
    sourceCommit,
    contentIdentityHash,
    environmentBuildSetIdentityHash,
    preregistrationIdentityHash,
    environmentEvidence: normalizeEnvironments(value.environmentEvidence, preregistration),
    humanTaskEvidence: normalizeHumanTasks(value.humanTaskEvidence, preregistration),
    longitudinalEvidence: normalizeLongitudinal(value.longitudinalEvidence, preregistration),
    scoreEvidence: normalizeScores(value.scoreEvidence, preregistration),
    defects: normalizeDefects(value.defects),
    defectLedgerEvidenceSha256: assertEvidenceSha256(
      value.defectLedgerEvidenceSha256,
      'P7 defectLedgerEvidenceSha256',
    ),
    independentAudit: normalizeAudit(value.independentAudit, preregistration),
  });
}

function humanGate(
  evidence: HumanTaskEvidence,
  threshold: ArenaV2P7PreregistrationCandidateV1['humanTaskThresholds'][number],
  minimumQualifiedParticipantsPerSubgroup: number,
) {
  const overallRate = fractionRate(evidence.overallCompletion);
  const noHelpRate = fractionRate(evidence.noVerbalHelp);
  const explanationRate = fractionRate(evidence.explanation);
  const subgroupRates = evidence.subgroups.map(fractionRate);
  const complete = evidence.qualifiedParticipants >= threshold.minimumQualifiedParticipants
    && overallRate !== null
    && noHelpRate !== null
    && explanationRate !== null
    && subgroupRates.length > 0
    && subgroupRates.every((rate) => rate !== null)
    && evidence.subgroups.every(({ denominator }) => (
      denominator >= minimumQualifiedParticipantsPerSubgroup
    ));
  const passed = complete
    && overallRate! >= threshold.minimumOverallCompletionRate
    && noHelpRate! >= threshold.minimumNoVerbalHelpRate
    && explanationRate! >= threshold.minimumExplanationRate
    && subgroupRates.every((rate) => rate! >= threshold.minimumSubgroupRate);
  return Object.freeze({
    taskId: evidence.taskId,
    status: complete ? (passed ? 'passed' as const : 'failed' as const) : 'incomplete' as const,
    qualifiedParticipants: evidence.qualifiedParticipants,
    overallCompletionRate: overallRate,
    noVerbalHelpRate: noHelpRate,
    explanationRate,
    subgroupRates: Object.freeze(evidence.subgroups.map((subgroup, index) => Object.freeze({
      subgroupId: subgroup.subgroupId,
      rate: subgroupRates[index],
    }))),
  });
}

function longitudinalGate(
  evidence: LongitudinalEvidence,
  threshold: ArenaV2P7PreregistrationCandidateV1['longitudinalThresholds'][number],
) {
  const activeGoalRate = fractionRate(evidence.activeGoal);
  const goalCompletionRate = fractionRate(evidence.goalCompletion);
  const crossWeaponOrMapUseRate = fractionRate(evidence.crossWeaponOrMapUse);
  const complete = evidence.qualifiedParticipants >= threshold.minimumQualifiedParticipants
    && activeGoalRate !== null
    && goalCompletionRate !== null
    && crossWeaponOrMapUseRate !== null;
  const passed = complete
    && activeGoalRate! >= threshold.minimumActiveGoalRate
    && goalCompletionRate! >= threshold.minimumGoalCompletionRate
    && crossWeaponOrMapUseRate! >= threshold.minimumCrossWeaponOrMapUseRate;
  return Object.freeze({
    checkpointHours: evidence.checkpointHours,
    status: complete ? (passed ? 'passed' as const : 'failed' as const) : 'incomplete' as const,
    qualifiedParticipants: evidence.qualifiedParticipants,
    activeGoalRate,
    goalCompletionRate,
    crossWeaponOrMapUseRate,
  });
}

/**
 * Evaluates already-collected aggregate evidence against the immutable P7
 * preregistration. It does not collect samples, modify thresholds or publish a
 * release bundle.
 */
export function evaluateArenaV2P7EvidenceCandidateV1(
  value: unknown,
) {
  const source = cloneFrozenData(value, 'Arena V2 P7 evidence evaluation options');
  exactRecord(source, OPTION_KEYS, 'Arena V2 P7 evidence evaluation options');
  const preregistration = validateArenaV2P7PreregistrationCandidateV1(
    source.preregistration,
  );
  const evidence = normalizeEvidence(source.evidence, preregistration);

  const environmentGates = Object.freeze(evidence.environmentEvidence.map((entry) => Object.freeze({
    environmentId: entry.environmentId,
    status: entry.status,
  })));
  const humanTaskGates = Object.freeze(evidence.humanTaskEvidence.map((entry, index) => (
    humanGate(
      entry,
      preregistration.humanTaskThresholds[index]!,
      preregistration.releaseGates.minimumQualifiedParticipantsPerSubgroup,
    )
  )));
  const longitudinalGates = Object.freeze(evidence.longitudinalEvidence.map((entry, index) => (
    longitudinalGate(entry, preregistration.longitudinalThresholds[index]!)
  )));
  const scoreDimensions = Object.freeze(evidence.scoreEvidence.map((entry, index) => {
    const registered = preregistration.scoreDimensions[index]!;
    const minimumScore = preregistration.releaseGates.minimumScorePerDimension;
    if (entry.status === 'missing' || entry.score === null) {
      return Object.freeze({
        dimensionId: entry.dimensionId,
        status: 'missing' as const,
        score: null,
        weight: registered.weight,
        weightedPoints: null,
        passedMinimum: null,
      });
    }
    return Object.freeze({
      dimensionId: entry.dimensionId,
      status: entry.score >= minimumScore ? 'passed' as const : 'failed' as const,
      score: entry.score,
      weight: registered.weight,
      weightedPoints: entry.score * registered.weight / 100,
      passedMinimum: entry.score >= minimumScore,
    });
  }));
  const scoreEvidenceComplete = scoreDimensions.every(({ status }) => status !== 'missing');
  const totalScore = scoreEvidenceComplete
    ? scoreDimensions.reduce((sum, entry) => sum + (entry.weightedPoints ?? 0), 0)
    : null;
  const openBlocking = evidence.defects.filter((entry) => (
    entry.status === 'open' && entry.severity === 'blocking'
  )).length;
  const openHigh = evidence.defects.filter((entry) => (
    entry.status === 'open' && entry.severity === 'high'
  )).length;
  const incompleteMediumLowAcceptance = preregistration.releaseGates
    .mediumAndLowRequireNamedOwnerImpactScopeAndAcceptanceReason
    ? evidence.defects.filter((entry) => (
      entry.status === 'open'
      && (entry.severity === 'medium' || entry.severity === 'low')
      && (entry.owner === null || entry.impactScope === null || entry.acceptanceReason === null)
    )).map(({ defectId }) => defectId)
    : [];

  const missingEvidence = environmentGates.some(({ status }) => status === 'missing')
    || humanTaskGates.some(({ status }) => status === 'incomplete')
    || longitudinalGates.some(({ status }) => status === 'incomplete')
    || !scoreEvidenceComplete;
  const incomplete = (
    preregistration.releaseGates.missingDeviceOrSampleMeansIncomplete
    && missingEvidence
  )
    || (
      preregistration.releaseGates.independentAuditRequired
      && evidence.independentAudit.decision === 'missing'
    )
    || incompleteMediumLowAcceptance.length > 0;
  const failed = environmentGates.some(({ status }) => status === 'failed')
    || humanTaskGates.some(({ status }) => status === 'failed')
    || longitudinalGates.some(({ status }) => status === 'failed')
    || (
      totalScore !== null
      && totalScore < preregistration.releaseGates.minimumTotalScore
    )
    || scoreDimensions.some(({ status }) => status === 'failed')
    || openBlocking > preregistration.releaseGates.blockingDefectMaximum
    || openHigh > preregistration.releaseGates.highDefectMaximum
    || (
      preregistration.releaseGates.independentAuditRequired
      && (
        evidence.independentAudit.decision === 'remain'
        || evidence.independentAudit.decision === 'rollback'
      )
    );
  const evaluationStatus: ArenaV2P7EvidenceEvaluationStatusCandidateV1 = incomplete
    ? 'incomplete'
    : failed
      ? 'failed'
      : 'passed';
  const failureReasons = Object.freeze([
    ...environmentGates.filter(({ status }) => status !== 'passed')
      .map(({ environmentId, status }) => `environment:${environmentId}:${status}`),
    ...humanTaskGates.filter(({ status }) => status !== 'passed')
      .map(({ taskId, status }) => `human-task:${taskId}:${status}`),
    ...longitudinalGates.filter(({ status }) => status !== 'passed')
      .map(({ checkpointHours, status }) => `longitudinal:${checkpointHours}:${status}`),
    ...(
      totalScore !== null
      && totalScore < preregistration.releaseGates.minimumTotalScore
        ? [`score-total:${totalScore}`]
        : []
    ),
    ...scoreDimensions.filter(({ status }) => status !== 'passed')
      .map(({ dimensionId, status }) => `score-dimension:${dimensionId}:${status}`),
    ...(openBlocking > preregistration.releaseGates.blockingDefectMaximum
      ? [`blocking-defects:${openBlocking}`]
      : []),
    ...(openHigh > preregistration.releaseGates.highDefectMaximum
      ? [`high-defects:${openHigh}`]
      : []),
    ...incompleteMediumLowAcceptance.map((id) => `incomplete-medium-low-acceptance:${id}`),
    ...(preregistration.releaseGates.independentAuditRequired
      && evidence.independentAudit.decision !== 'advance'
      ? [`independent-audit:${evidence.independentAudit.decision}`]
      : []),
  ]);
  const evidenceIdentityHash = createDeterministicDataHash(
    evidence,
    'Arena V2 P7 aggregate evidence candidate V1',
  );
  const core = Object.freeze({
    schemaVersion: ARENA_V2_P7_EVIDENCE_EVALUATION_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    defaultReleaseBundleWired: false as const,
    validationStatus: 'not-run' as const,
    sourceCommit: preregistration.sourceCommit,
    contentIdentityHash: preregistration.contentIdentityHash,
    preregistrationIdentityHash: preregistration.preregistrationIdentityHash,
    preregistration,
    evidenceIdentityHash,
    evaluationStatus,
    hardGate: evaluationStatus === 'passed' ? 'PASS' as const
      : evaluationStatus === 'failed' ? 'FAIL' as const : 'INCOMPLETE' as const,
    advanceEligible: evaluationStatus === 'passed'
      && (
        !preregistration.releaseGates.independentAuditRequired
        || evidence.independentAudit.decision === 'advance'
      ),
    environmentGates,
    humanTaskGates,
    longitudinalGates,
    scoreSummary: Object.freeze({
      dimensions: scoreDimensions,
      totalScore,
      minimumTotalScore: preregistration.releaseGates.minimumTotalScore,
      minimumScorePerDimension: preregistration.releaseGates.minimumScorePerDimension,
      totalScorePassed: totalScore === null
        ? null
        : totalScore >= preregistration.releaseGates.minimumTotalScore,
      everyDimensionPassed: scoreEvidenceComplete
        ? scoreDimensions.every(({ status }) => status === 'passed')
        : null,
    }),
    defectSummary: Object.freeze({
      openBlocking,
      openHigh,
      blockingDefectMaximum: preregistration.releaseGates.blockingDefectMaximum,
      highDefectMaximum: preregistration.releaseGates.highDefectMaximum,
      incompleteMediumLowAcceptance: Object.freeze(incompleteMediumLowAcceptance),
    }),
    independentAudit: evidence.independentAudit,
    failureReasons,
    evidence,
  });
  return Object.freeze({
    ...core,
    evaluationIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 P7 evidence evaluation candidate V1',
    ),
  });
}

export type ArenaV2P7EvidenceEvaluationCandidateV1 = ReturnType<
  typeof evaluateArenaV2P7EvidenceCandidateV1
>;

/** Re-evaluates stored evidence and rejects any self-reported result drift. */
export function validateArenaV2P7EvidenceEvaluationCandidateV1(
  value: unknown,
): ArenaV2P7EvidenceEvaluationCandidateV1 {
  const source = cloneFrozenData(value, 'Arena V2 P7 stored evidence evaluation');
  exactRecord(
    source,
    STORED_EVALUATION_KEYS,
    'Arena V2 P7 stored evidence evaluation',
  );
  const canonical = evaluateArenaV2P7EvidenceCandidateV1({
    preregistration: source.preregistration,
    evidence: source.evidence,
  });
  if (
    source.evaluationIdentityHash !== canonical.evaluationIdentityHash
    || createDeterministicDataHash(
      source,
      'Arena V2 P7 stored evidence evaluation comparison',
    ) !== createDeterministicDataHash(
      canonical,
      'Arena V2 P7 stored evidence evaluation comparison',
    )
  ) throw new RangeError('Arena V2 P7 stored evidence evaluation身份或结果发生漂移。');
  return canonical;
}

export const ARENA_V2_P7_EVIDENCE_EVALUATION_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  currentGate: 'incomplete' as const,
  hardGate: false as const,
  defaultReleaseBundleWired: false as const,
  validationStatus: 'not-run' as const,
  consumesValidatedPreregistrationOnly: true as const,
  modifiesPreregisteredThresholds: false as const,
  targetEnvironmentCount: 6 as const,
  scoreEvidenceMissingYieldsIncomplete: true as const,
  missingEvidenceShaUsesNull: true as const,
  environmentBuildSetIdentityRequired: true as const,
  scoreAndDefectGatesFromPreregistration: true as const,
  missingAndAuditGatesFromPreregistration: true as const,
  humanTaskCount: 6 as const,
  longitudinalCheckpointCount: 7 as const,
  scoreDimensionCount: 8 as const,
  validatesStoredEvaluationByRecomputation: true as const,
});
