import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  validateArenaV2P7EvidenceEvaluationCandidateV1,
  type ArenaV2P7EvidenceEvaluationCandidateV1,
} from './arena-v2-p7-evidence-evaluation-candidate-v1.js';

export const ARENA_V2_P7_STAGE_REPORT_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

export type ArenaV2P7StageReportDecisionCandidateV1 = 'remain' | 'rollback';

type EvidenceStatus = 'incomplete' | 'failed' | 'passed';
type EvidenceIndexKind =
  | 'environment'
  | 'human-task'
  | 'longitudinal'
  | 'score-dimension'
  | 'defect-ledger'
  | 'independent-audit';

export interface EvidenceIndexEntry {
  readonly kind: EvidenceIndexKind;
  readonly id: string;
  readonly evidenceSha256: string | null;
}

const OPTION_KEYS = new Set(['evaluation']);
const STORED_REPORT_KEYS = new Set([
  'schemaVersion', 'status', 'defaultReleaseBundleWired', 'validationStatus',
  'stage', 'candidateIdentity', 'scope', 'explicitNonGoals', 'behaviorMapping',
  'implemented', 'verificationStatus', 'uncompleted', 'openDefects',
  'score', 'evidenceIndex', 'evaluationHardGate', 'reportStatus', 'hardGate',
  'independentAudit', 'reportDecision', 'rollbackPoint', 'evaluation',
  'reportIdentityHash',
]);

const REPORT_SCOPE = Object.freeze([
  'p7-preregistration-identity',
  'six-environment-evidence',
  'six-human-task-evidence',
  'seven-longitudinal-checkpoint-evidence',
  'eight-dimension-score',
  'defect-ledger-and-independent-audit',
] as const);

const REPORT_EXPLICIT_NON_GOALS = Object.freeze([
  'does-not-collect-or-modify-evidence',
  'does-not-run-automation-device-human-or-performance-validation',
  'does-not-change-preregistered-thresholds',
  'does-not-wire-default-release-bundle-or-production-entry',
] as const);

const REPORT_BEHAVIOR_MAPPING = Object.freeze([
  Object.freeze({
    source: 'validated-evaluation.environmentGates',
    target: 'verificationStatus.device',
  }),
  Object.freeze({
    source: 'validated-evaluation.humanTaskGates+longitudinalGates',
    target: 'verificationStatus.human',
  }),
  Object.freeze({
    source: 'dedicated-automation-execution-evidence-producer:not-connected',
    target: 'verificationStatus.automation:not-run+non-failed-hardGate:INCOMPLETE',
  }),
  Object.freeze({
    source: 'validated-evaluation.hardGate:FAIL',
    target: 'reportStatus:FAIL+hardGate:FAIL',
  }),
  Object.freeze({
    source: 'validated-evaluation.independentAudit:rollback',
    target: 'reportDecision:rollback',
  }),
] as const);

const REPORT_IMPLEMENTED = Object.freeze([
  Object.freeze({ itemId: 'p7-preregistration-contract', status: 'code-written-not-run' }),
  Object.freeze({ itemId: 'p7-evidence-evaluation-contract', status: 'code-written-not-run' }),
  Object.freeze({ itemId: 'p7-fixed-stage-report-projection', status: 'code-written-not-run' }),
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

function aggregateStatus(statuses: readonly string[]): EvidenceStatus {
  if (statuses.includes('missing') || statuses.includes('incomplete')) return 'incomplete';
  if (statuses.includes('failed')) return 'failed';
  return 'passed';
}

function reportHardGate(
  evaluation: ArenaV2P7EvidenceEvaluationCandidateV1,
): 'FAIL' | 'INCOMPLETE' {
  return evaluation.hardGate === 'FAIL' ? 'FAIL' : 'INCOMPLETE';
}

function reportDecision(
  evaluation: ArenaV2P7EvidenceEvaluationCandidateV1,
): ArenaV2P7StageReportDecisionCandidateV1 {
  return evaluation.independentAudit.decision === 'rollback' ? 'rollback' : 'remain';
}

function evidenceIndex(
  evaluation: ArenaV2P7EvidenceEvaluationCandidateV1,
): readonly EvidenceIndexEntry[] {
  const entries: EvidenceIndexEntry[] = [
    ...evaluation.evidence.environmentEvidence.map((entry) => Object.freeze({
      kind: 'environment' as const,
      id: `environment:${entry.environmentId}`,
      evidenceSha256: entry.evidenceSha256,
    })),
    ...evaluation.evidence.humanTaskEvidence.map((entry) => Object.freeze({
      kind: 'human-task' as const,
      id: `human-task:${entry.taskId}`,
      evidenceSha256: entry.evidenceSha256,
    })),
    ...evaluation.evidence.longitudinalEvidence.map((entry) => Object.freeze({
      kind: 'longitudinal' as const,
      id: `longitudinal:${entry.checkpointHours}`,
      evidenceSha256: entry.evidenceSha256,
    })),
    ...evaluation.evidence.scoreEvidence.map((entry) => Object.freeze({
      kind: 'score-dimension' as const,
      id: `score-dimension:${entry.dimensionId}`,
      evidenceSha256: entry.evidenceSha256,
    })),
    Object.freeze({
      kind: 'defect-ledger' as const,
      id: 'defect-ledger:p7-open-and-closed',
      evidenceSha256: evaluation.evidence.defectLedgerEvidenceSha256,
    }),
    Object.freeze({
      kind: 'independent-audit' as const,
      id: 'independent-audit:p7-stage-decision',
      evidenceSha256: evaluation.evidence.independentAudit.evidenceSha256,
    }),
  ];
  const ids = new Set(entries.map(({ id }) => id));
  const presentHashes = entries.flatMap(({ evidenceSha256 }) => (
    evidenceSha256 === null ? [] : [evidenceSha256]
  ));
  if (
    entries.length !== 29
    || ids.size !== entries.length
    || new Set(presentHashes).size !== presentHashes.length
  ) {
    throw new RangeError('Arena V2 P7 stage report证据索引必须精确覆盖29项且已有ID/SHA唯一。');
  }
  return Object.freeze(entries);
}

/** Projects one canonical fixed-format P7 stage report from validated evidence. */
export function createArenaV2P7StageReportCandidateV1(value: unknown) {
  const source = cloneFrozenData(value, 'Arena V2 P7 stage report options');
  exactRecord(source, OPTION_KEYS, 'Arena V2 P7 stage report options');
  const evaluation = validateArenaV2P7EvidenceEvaluationCandidateV1(source.evaluation);
  if (
    evaluation.preregistration.environmentBuilds.length
    !== evaluation.preregistration.releaseGates.requiredTargetEnvironmentCount
  ) {
    throw new RangeError('Arena V2 P7 stage report必须精确包含六环境build identity。');
  }
  const indexedEvidence = evidenceIndex(evaluation);
  const openDefects = Object.freeze(evaluation.evidence.defects
    .filter(({ status }) => status === 'open')
    .map((entry) => Object.freeze({
      defectId: entry.defectId,
      severity: entry.severity,
      owner: entry.owner,
      impactScope: entry.impactScope,
      acceptanceReason: entry.acceptanceReason,
    })));
  const scoreDimensions = Object.freeze(evaluation.scoreSummary.dimensions.map((entry, index) => {
    const raw = evaluation.evidence.scoreEvidence[index]!;
    if (raw.dimensionId !== entry.dimensionId) {
      throw new RangeError('Arena V2 P7 stage report评分与原始证据顺序漂移。');
    }
    return Object.freeze({
      dimensionId: entry.dimensionId,
      status: entry.status,
      score: entry.score,
      weight: entry.weight,
      weightedPoints: entry.weightedPoints,
      passedMinimum: entry.passedMinimum,
      evidenceSha256: raw.evidenceSha256,
    });
  }));
  const hardGate = reportHardGate(evaluation);
  const core = Object.freeze({
    schemaVersion: ARENA_V2_P7_STAGE_REPORT_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    defaultReleaseBundleWired: false as const,
    validationStatus: 'not-run' as const,
    stage: 'P7' as const,
    candidateIdentity: Object.freeze({
      sourceCommit: evaluation.sourceCommit,
      sourceDirty: false as const,
      contentIdentityHash: evaluation.contentIdentityHash,
      environmentBuildSetIdentityHash:
        evaluation.preregistration.environmentBuildSetIdentityHash,
      preregistrationIdentityHash: evaluation.preregistrationIdentityHash,
      evidenceIdentityHash: evaluation.evidenceIdentityHash,
      evaluationIdentityHash: evaluation.evaluationIdentityHash,
      environmentBuilds: Object.freeze(evaluation.preregistration.environmentBuilds.map(
        (entry) => Object.freeze({
          environmentId: entry.environmentId,
          buildIdentitySha256: entry.buildIdentitySha256,
        }),
      )),
    }),
    scope: REPORT_SCOPE,
    explicitNonGoals: REPORT_EXPLICIT_NON_GOALS,
    behaviorMapping: REPORT_BEHAVIOR_MAPPING,
    implemented: REPORT_IMPLEMENTED,
    verificationStatus: Object.freeze({
      automation: Object.freeze({
        status: 'not-run' as const,
        requiredEvidenceKind: 'dedicated-automation-execution-evidence' as const,
        evidenceSha256: null,
      }),
      device: Object.freeze({
        status: aggregateStatus(evaluation.environmentGates.map(({ status }) => status)),
        targetEnvironmentCount: evaluation.environmentGates.length,
      }),
      human: Object.freeze({
        status: aggregateStatus([
          ...evaluation.humanTaskGates.map(({ status }) => status),
          ...evaluation.longitudinalGates.map(({ status }) => status),
        ]),
        humanTaskCount: evaluation.humanTaskGates.length,
        longitudinalCheckpointCount: evaluation.longitudinalGates.length,
      }),
    }),
    uncompleted: Object.freeze([
      'automation:not-run',
      ...evaluation.failureReasons,
    ]),
    openDefects,
    score: Object.freeze({
      dimensions: scoreDimensions,
      totalScore: evaluation.scoreSummary.totalScore,
      minimumTotalScore: evaluation.scoreSummary.minimumTotalScore,
      minimumScorePerDimension: evaluation.scoreSummary.minimumScorePerDimension,
      totalScorePassed: evaluation.scoreSummary.totalScorePassed,
      everyDimensionPassed: evaluation.scoreSummary.everyDimensionPassed,
    }),
    evidenceIndex: indexedEvidence,
    evaluationHardGate: evaluation.hardGate,
    reportStatus: hardGate,
    hardGate,
    independentAudit: Object.freeze({
      decision: evaluation.independentAudit.decision,
      auditor: evaluation.independentAudit.auditor,
      reason: evaluation.independentAudit.reason,
      evidenceSha256: evaluation.independentAudit.evidenceSha256,
    }),
    reportDecision: reportDecision(evaluation),
    rollbackPoint: Object.freeze({
      sourceCommit: evaluation.sourceCommit,
      action: 'discard-candidate-report-and-keep-prior-release-state' as const,
      preservesDefaultReleaseBundle: true as const,
    }),
    evaluation,
  });
  return Object.freeze({
    ...core,
    reportIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 P7 fixed stage report candidate V1',
    ),
  });
}

export type ArenaV2P7StageReportCandidateV1 = ReturnType<
  typeof createArenaV2P7StageReportCandidateV1
>;

/** Rebuilds a stored report and rejects self-reported status or decision drift. */
export function validateArenaV2P7StageReportCandidateV1(
  value: unknown,
): ArenaV2P7StageReportCandidateV1 {
  const source = cloneFrozenData(value, 'Arena V2 P7 stored stage report');
  exactRecord(source, STORED_REPORT_KEYS, 'Arena V2 P7 stored stage report');
  const canonical = createArenaV2P7StageReportCandidateV1({ evaluation: source.evaluation });
  if (
    source.reportIdentityHash !== canonical.reportIdentityHash
    || createDeterministicDataHash(
      source,
      'Arena V2 P7 stored stage report comparison',
    ) !== createDeterministicDataHash(
      canonical,
      'Arena V2 P7 stored stage report comparison',
    )
  ) throw new RangeError('Arena V2 P7 stored stage report身份或内容发生漂移。');
  return canonical;
}

export const ARENA_V2_P7_STAGE_REPORT_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  currentGate: 'incomplete' as const,
  hardGate: false as const,
  defaultReleaseBundleWired: false as const,
  validationStatus: 'not-run' as const,
  consumesValidatedEvaluationOnly: true as const,
  modifiesPreregisteredThresholds: false as const,
  targetEnvironmentCount: 6 as const,
  evidenceIndexCount: 29 as const,
  preservesMissingEvidenceSlots: true as const,
  environmentBuildSetIdentityPropagated: true as const,
  dedicatedAutomationEvidenceProducerWired: false as const,
  reportPassAllowed: false as const,
  reportAdvanceAllowed: false as const,
  evaluationFailurePrecedence: true as const,
  independentAuditRollbackPrecedence: true as const,
  defaultEntryWired: false as const,
});
