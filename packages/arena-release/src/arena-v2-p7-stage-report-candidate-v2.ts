import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  validateArenaV2P7AutomationExecutionEvidenceCandidateV1,
  type ArenaV2P7AutomationExecutionEvidenceCandidateV1,
} from './arena-v2-p7-automation-execution-evidence-candidate-v1.js';
import {
  validateArenaV2P7EvidenceEvaluationCandidateV1,
  type ArenaV2P7EvidenceEvaluationCandidateV1,
} from './arena-v2-p7-evidence-evaluation-candidate-v1.js';
import { createArenaV2P7StageReportCandidateV1 } from
  './arena-v2-p7-stage-report-candidate-v1.js';

export const ARENA_V2_P7_STAGE_REPORT_CANDIDATE_V2_SCHEMA_VERSION = 2 as const;

export type ArenaV2P7StageReportDecisionCandidateV2 =
  | 'advance'
  | 'remain'
  | 'rollback';

type HardGate = 'PASS' | 'FAIL' | 'INCOMPLETE';

const OPTION_KEYS = new Set(['evaluation', 'automationEvidence']);
const STORED_REPORT_KEYS = new Set([
  'schemaVersion', 'status', 'defaultReleaseBundleWired', 'validationStatus',
  'stage', 'candidateIdentity', 'scope', 'explicitNonGoals', 'behaviorMapping',
  'implemented', 'verificationStatus', 'uncompleted', 'failureReasons',
  'openDefects', 'score', 'evidenceIndex', 'automationReceiptIndex',
  'nonPassingAutomationSuites', 'evaluationHardGate', 'automationHardGate',
  'reportStatus', 'hardGate', 'independentAudit', 'reportDecision',
  'rollbackPoint', 'evaluation', 'automationEvidence', 'reportIdentityHash',
]);

const V2_BEHAVIOR_MAPPING = Object.freeze([
  Object.freeze({
    source: 'validated-evaluation.environmentGates',
    target: 'verificationStatus.device',
  }),
  Object.freeze({
    source: 'validated-evaluation.humanTaskGates+longitudinalGates',
    target: 'verificationStatus.human',
  }),
  Object.freeze({
    source: 'validated-automation-manifest.receipts',
    target: 'verificationStatus.automation+automationReceiptIndex',
  }),
  Object.freeze({
    source: 'evaluation.hardGate+automationEvidence.hardGate',
    target: 'FAIL-precedence-then-INCOMPLETE-then-PASS',
  }),
  Object.freeze({
    source: 'validated-evaluation.independentAudit:rollback',
    target: 'reportDecision:rollback-before-combined-gate',
  }),
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

function assertCrossIdentity(
  evaluation: ArenaV2P7EvidenceEvaluationCandidateV1,
  automation: ArenaV2P7AutomationExecutionEvidenceCandidateV1,
): void {
  if (
    evaluation.sourceCommit !== automation.sourceCommit
    || evaluation.contentIdentityHash !== automation.contentIdentityHash
    || evaluation.preregistrationIdentityHash !== automation.preregistrationIdentityHash
    || evaluation.evaluationIdentityHash !== automation.evaluationIdentityHash
  ) throw new RangeError('Arena V2 P7 V2 report评价与自动化证据身份不一致。');
}

function combinedHardGate(
  evaluation: ArenaV2P7EvidenceEvaluationCandidateV1,
  automation: ArenaV2P7AutomationExecutionEvidenceCandidateV1,
): HardGate {
  if (evaluation.hardGate === 'FAIL' || automation.hardGate === 'FAIL') return 'FAIL';
  if (
    evaluation.hardGate === 'INCOMPLETE'
    || automation.hardGate === 'INCOMPLETE'
  ) return 'INCOMPLETE';
  return 'PASS';
}

function reportDecision(
  evaluation: ArenaV2P7EvidenceEvaluationCandidateV1,
  hardGate: HardGate,
): ArenaV2P7StageReportDecisionCandidateV2 {
  if (evaluation.independentAudit.decision === 'rollback') return 'rollback';
  return hardGate === 'PASS' ? 'advance' : 'remain';
}

/** Combines only canonical stored evaluation and automation evidence. */
export function createArenaV2P7StageReportCandidateV2(value: unknown) {
  const source = cloneFrozenData(value, 'Arena V2 P7 stage report V2 options');
  exactRecord(source, OPTION_KEYS, 'Arena V2 P7 stage report V2 options');
  const evaluation = validateArenaV2P7EvidenceEvaluationCandidateV1(source.evaluation);
  const automationEvidence = validateArenaV2P7AutomationExecutionEvidenceCandidateV1(
    source.automationEvidence,
  );
  assertCrossIdentity(evaluation, automationEvidence);

  const v1 = createArenaV2P7StageReportCandidateV1({ evaluation });
  const automationReceiptIndex = Object.freeze(automationEvidence.receipts.map((receipt) => (
    Object.freeze({
      suiteId: receipt.suiteId,
      status: receipt.status,
      commandDefinitionHash: receipt.commandDefinitionHash,
      evidenceSha256: receipt.evidenceSha256,
    })
  )));
  if (automationReceiptIndex.length !== 24) {
    throw new RangeError('Arena V2 P7 V2 report必须精确索引24项自动化回执。');
  }
  const nonPassingAutomationSuites = Object.freeze(automationReceiptIndex
    .filter(({ status }) => status !== 'passed')
    .map(({ suiteId, status }) => Object.freeze({ suiteId, status })));
  const automationCounts = Object.freeze({
    total: automationReceiptIndex.length,
    passed: automationReceiptIndex.filter(({ status }) => status === 'passed').length,
    failed: automationReceiptIndex.filter(({ status }) => status === 'failed').length,
    notRun: automationReceiptIndex.filter(({ status }) => status === 'not-run').length,
  });
  const hardGate = combinedHardGate(evaluation, automationEvidence);
  const automationNotRun = automationReceiptIndex
    .filter(({ status }) => status === 'not-run')
    .map(({ suiteId }) => `automation:${suiteId}:not-run`);
  const automationFailures = automationReceiptIndex
    .filter(({ status }) => status === 'failed')
    .map(({ suiteId }) => `automation:${suiteId}:failed`);
  const uncompleted = Object.freeze([
    ...(evaluation.hardGate === 'INCOMPLETE' ? evaluation.failureReasons : []),
    ...automationNotRun,
  ]);
  const failureReasons = Object.freeze([
    ...(evaluation.hardGate === 'FAIL' ? evaluation.failureReasons : []),
    ...automationFailures,
  ]);
  const core = Object.freeze({
    schemaVersion: ARENA_V2_P7_STAGE_REPORT_CANDIDATE_V2_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    defaultReleaseBundleWired: false as const,
    validationStatus: 'not-run' as const,
    stage: v1.stage,
    candidateIdentity: Object.freeze({
      ...v1.candidateIdentity,
      evaluationReportV1IdentityHash: v1.reportIdentityHash,
      packageJsonSha256: automationEvidence.packageJsonSha256,
      packageLockSha256: automationEvidence.packageLockSha256,
      toolchain: automationEvidence.toolchain,
      toolchainIdentityHash: automationEvidence.toolchainIdentityHash,
      toolchainIdentitySha256: automationEvidence.toolchainIdentitySha256,
      automationDefinitionIdentityHash: automationEvidence.definitionIdentityHash,
      automationManifestIdentityHash: automationEvidence.manifestIdentityHash,
    }),
    scope: Object.freeze([
      ...v1.scope,
      'twenty-four-suite-automation-execution-evidence',
    ]),
    explicitNonGoals: Object.freeze([
      ...v1.explicitNonGoals,
      'does-not-treat-contract-validationStatus-as-execution-status',
    ]),
    behaviorMapping: V2_BEHAVIOR_MAPPING,
    implemented: Object.freeze([
      ...v1.implemented,
      Object.freeze({
        itemId: 'p7-fixed-stage-report-v2-composition',
        status: 'code-written-not-run' as const,
      }),
    ]),
    verificationStatus: Object.freeze({
      automation: Object.freeze({
        status: automationEvidence.automationStatus,
        hardGate: automationEvidence.hardGate,
        receiptCounts: automationCounts,
        definitionIdentityHash: automationEvidence.definitionIdentityHash,
        manifestIdentityHash: automationEvidence.manifestIdentityHash,
      }),
      device: v1.verificationStatus.device,
      human: v1.verificationStatus.human,
    }),
    uncompleted,
    failureReasons,
    openDefects: v1.openDefects,
    score: v1.score,
    evidenceIndex: v1.evidenceIndex,
    automationReceiptIndex,
    nonPassingAutomationSuites,
    evaluationHardGate: evaluation.hardGate,
    automationHardGate: automationEvidence.hardGate,
    reportStatus: hardGate,
    hardGate,
    independentAudit: v1.independentAudit,
    reportDecision: reportDecision(evaluation, hardGate),
    rollbackPoint: v1.rollbackPoint,
    evaluation,
    automationEvidence,
  });
  return Object.freeze({
    ...core,
    reportIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 P7 fixed stage report candidate V2',
    ),
  });
}

export type ArenaV2P7StageReportCandidateV2 = ReturnType<
  typeof createArenaV2P7StageReportCandidateV2
>;

/** Rebuilds the complete V2 report and rejects stored status or identity drift. */
export function validateArenaV2P7StageReportCandidateV2(
  value: unknown,
): ArenaV2P7StageReportCandidateV2 {
  const source = cloneFrozenData(value, 'Arena V2 P7 stored stage report V2');
  exactRecord(source, STORED_REPORT_KEYS, 'Arena V2 P7 stored stage report V2');
  const canonical = createArenaV2P7StageReportCandidateV2({
    evaluation: source.evaluation,
    automationEvidence: source.automationEvidence,
  });
  if (
    source.reportIdentityHash !== canonical.reportIdentityHash
    || createDeterministicDataHash(
      source,
      'Arena V2 P7 stored stage report V2 comparison',
    ) !== createDeterministicDataHash(
      canonical,
      'Arena V2 P7 stored stage report V2 comparison',
    )
  ) throw new RangeError('Arena V2 P7 stored stage report V2身份或内容发生漂移。');
  return canonical;
}

export const ARENA_V2_P7_STAGE_REPORT_CANDIDATE_V2 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  currentGate: 'incomplete' as const,
  hardGate: false as const,
  defaultReleaseBundleWired: false as const,
  validationStatus: 'not-run' as const,
  defaultEntryWired: false as const,
  consumesValidatedEvaluationOnly: true as const,
  consumesValidatedAutomationEvidenceOnly: true as const,
  evaluationEvidenceIndexCount: 29 as const,
  automationReceiptIndexCount: 24 as const,
  producerWired: false as const,
  currentPassInstanceExists: false as const,
});
