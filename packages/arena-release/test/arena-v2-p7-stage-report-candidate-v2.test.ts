import { describe, expect, it } from 'vitest';
import {
  createArenaV2P7AutomationExecutionEvidenceCandidateV1,
  createArenaV2P7AutomationSuiteDirectoryCandidateV1,
  createArenaV2P7AutomationToolchainIdentityHashCandidateV1,
  type ArenaV2P7AutomationSuiteReceiptStatusCandidateV1,
} from '../src/arena-v2-p7-automation-execution-evidence-candidate-v1.js';
import {
  evaluateArenaV2P7EvidenceCandidateV1,
  type ArenaV2P7IndependentAuditDecisionCandidateV1,
} from '../src/arena-v2-p7-evidence-evaluation-candidate-v1.js';
import { createArenaV2P7PreregistrationCandidateV1 } from
  '../src/arena-v2-p7-preregistration-candidate-v1.js';
import {
  createArenaV2P7StageReportCandidateV2,
  validateArenaV2P7StageReportCandidateV2,
} from '../src/arena-v2-p7-stage-report-candidate-v2.js';

function sha(index: number): string {
  return index.toString(16).padStart(2, '0').repeat(32);
}

interface EvaluationFixtureOptions {
  readonly sourceCommit?: string;
  readonly contentIdentityHash?: string;
  readonly score?: number;
  readonly scoreMissingIndex?: number | null;
  readonly environmentStatus?: 'passed' | 'failed' | 'missing';
  readonly auditDecision?: ArenaV2P7IndependentAuditDecisionCandidateV1;
}

function evaluationFixture({
  sourceCommit = 'a'.repeat(40),
  contentIdentityHash = '1234abcd',
  score = 100,
  scoreMissingIndex = null,
  environmentStatus = 'passed',
  auditDecision = 'advance',
}: EvaluationFixtureOptions = {}) {
  const preregistration = createArenaV2P7PreregistrationCandidateV1({
    sourceCommit,
    sourceDirty: false,
    contentIdentityHash,
    environmentBuilds: [
      'web-mobile-390x844', 'web-desktop-1440x900', 'wechat-developer-tool',
      'douyin-developer-tool', 'ios-physical-device', 'android-physical-device',
    ].map((environmentId, index) => ({
      environmentId,
      buildIdentitySha256: sha(100 + index),
    })),
    humanTaskThresholds: [
      'onboarding-180-seconds', 'weapon-comparison-10-seconds',
      'kz-first-route-and-reentry', 'survival-supply-and-two-life-goal',
      'multiplayer-two-to-four-readability', 'longitudinal-active-goal',
    ].map((taskId) => ({
      taskId,
      minimumQualifiedParticipants: 10,
      minimumOverallCompletionRate: 0.9,
      minimumNoVerbalHelpRate: 0.8,
      minimumExplanationRate: 0.8,
      minimumSubgroupRate: 0.8,
    })),
    longitudinalThresholds: [0.5, 1, 10, 30, 60, 120, 200].map((checkpointHours) => ({
      checkpointHours,
      minimumQualifiedParticipants: 10,
      minimumActiveGoalRate: 0.8,
      minimumGoalCompletionRate: 0.7,
      minimumCrossWeaponOrMapUseRate: 0.6,
    })),
  });
  return evaluateArenaV2P7EvidenceCandidateV1({
    preregistration,
    evidence: {
      schemaVersion: 1,
      sourceCommit,
      contentIdentityHash,
      environmentBuildSetIdentityHash: preregistration.environmentBuildSetIdentityHash,
      preregistrationIdentityHash: preregistration.preregistrationIdentityHash,
      environmentEvidence: preregistration.environmentBuilds.map((entry, index) => ({
        environmentId: entry.environmentId,
        sourceCommit,
        contentIdentityHash,
        buildIdentitySha256: entry.buildIdentitySha256,
        evidenceSha256: index === 0 && environmentStatus === 'missing'
          ? null
          : sha(1 + index),
        status: index === 0 ? environmentStatus : 'passed',
        failureReason: index === 0 && environmentStatus !== 'passed'
          ? `environment ${environmentStatus}` : null,
      })),
      humanTaskEvidence: preregistration.humanTaskThresholds.map((entry, index) => ({
        taskId: entry.taskId,
        evidenceSha256: sha(16 + index),
        qualifiedParticipants: 10,
        overallCompletion: { numerator: 9, denominator: 10 },
        noVerbalHelp: { numerator: 8, denominator: 10 },
        explanation: { numerator: 8, denominator: 10 },
        subgroups: [
          { subgroupId: 'experienced', numerator: 4, denominator: 5 },
          { subgroupId: 'novice', numerator: 4, denominator: 5 },
        ],
      })),
      longitudinalEvidence: preregistration.longitudinalThresholds.map((entry, index) => ({
        checkpointHours: entry.checkpointHours,
        evidenceSha256: sha(32 + index),
        qualifiedParticipants: 10,
        activeGoal: { numerator: 8, denominator: 10 },
        goalCompletion: { numerator: 7, denominator: 10 },
        crossWeaponOrMapUse: { numerator: 6, denominator: 10 },
      })),
      scoreEvidence: preregistration.scoreDimensions.map((entry, index) => {
        const missing = index === scoreMissingIndex;
        return {
          dimensionId: entry.id,
          status: missing ? 'missing' : 'available',
          score: missing ? null : score,
          evidenceSha256: missing ? null : sha(48 + index),
        };
      }),
      defects: [],
      defectLedgerEvidenceSha256: sha(70),
      independentAudit: {
        sourceCommit,
        contentIdentityHash,
        environmentBuildSetIdentityHash: preregistration.environmentBuildSetIdentityHash,
        preregistrationIdentityHash: preregistration.preregistrationIdentityHash,
        decision: auditDecision,
        auditor: auditDecision === 'missing' ? null : 'independent-auditor',
        reason: auditDecision === 'missing' ? null : `audit:${auditDecision}`,
        evidenceSha256: auditDecision === 'missing' ? null : sha(71),
      },
    },
  });
}

const TOOLCHAIN = {
  nodeVersion: '22.17.0',
  npmVersion: '11.4.2',
  platform: 'darwin',
  architecture: 'arm64',
  typescriptVersion: '5.9.3',
  tsxVersion: '4.23.1',
  vitestVersion: '3.2.7',
  viteVersion: '7.3.6',
  esbuildVersion: '0.25.12',
};

function automationFixture(
  evaluation: ReturnType<typeof evaluationFixture>,
  statusFor: (index: number) => ArenaV2P7AutomationSuiteReceiptStatusCandidateV1,
) {
  const definition = createArenaV2P7AutomationSuiteDirectoryCandidateV1();
  const packageJsonSha256 = sha(220);
  const packageLockSha256 = sha(221);
  const toolchainIdentityHash = createArenaV2P7AutomationToolchainIdentityHashCandidateV1(
    TOOLCHAIN,
  );
  return createArenaV2P7AutomationExecutionEvidenceCandidateV1({
    sourceCommit: evaluation.sourceCommit,
    sourceDirty: false,
    contentIdentityHash: evaluation.contentIdentityHash,
    preregistrationIdentityHash: evaluation.preregistrationIdentityHash,
    evaluationIdentityHash: evaluation.evaluationIdentityHash,
    packageJsonSha256,
    packageLockSha256,
    toolchain: TOOLCHAIN,
    runOrdinal: 1,
    attempt: 1,
    receipts: definition.suites.map((suite, index) => {
      const status = statusFor(index);
      return {
        suiteId: suite.suiteId,
        status,
        runOrdinal: 1,
        attempt: 1,
        commandDefinitionHash: suite.commandDefinitionHash,
        sourceCommit: evaluation.sourceCommit,
        contentIdentityHash: evaluation.contentIdentityHash,
        preregistrationIdentityHash: evaluation.preregistrationIdentityHash,
        evaluationIdentityHash: evaluation.evaluationIdentityHash,
        packageJsonSha256,
        packageLockSha256,
        toolchainIdentityHash,
        exitCode: status === 'not-run' ? null : status === 'passed' ? 0 : 1,
        stdoutSha256: status === 'not-run' ? null : sha(120 + index),
        stderrSha256: status === 'not-run' ? null : sha(160 + index),
        aggregateOutputSha256: null,
        evidenceSha256: status === 'not-run' ? null : sha(190 + index),
      };
    }),
  });
}

describe('Arena V2 P7 fixed stage report candidate V2', () => {
  it('combines future all-green fixtures into PASS and advance without claiming current wiring', () => {
    const evaluation = evaluationFixture();
    const automationEvidence = automationFixture(evaluation, () => 'passed');
    const first = createArenaV2P7StageReportCandidateV2({ evaluation, automationEvidence });
    const second = createArenaV2P7StageReportCandidateV2({ evaluation, automationEvidence });
    expect(first).toMatchObject({
      status: 'production-unreachable',
      validationStatus: 'not-run',
      defaultReleaseBundleWired: false,
      evaluationHardGate: 'PASS',
      automationHardGate: 'PASS',
      hardGate: 'PASS',
      reportStatus: 'PASS',
      reportDecision: 'advance',
      verificationStatus: {
        automation: { status: 'passed', receiptCounts: { total: 24, passed: 24 } },
        device: { status: 'passed' },
        human: { status: 'passed' },
      },
    });
    expect(first.evidenceIndex).toHaveLength(29);
    expect(new Set(first.evidenceIndex.map(({ id }) => id)).size).toBe(29);
    expect(new Set(first.evidenceIndex.map(({ evidenceSha256 }) => evidenceSha256)).size).toBe(29);
    expect(first.automationReceiptIndex).toHaveLength(24);
    expect(first.nonPassingAutomationSuites).toEqual([]);
    expect(first.candidateIdentity.environmentBuilds).toHaveLength(6);
    expect(first.reportIdentityHash).toBe(second.reportIdentityHash);
    expect(Object.isFrozen(first)).toBe(true);
    expect(validateArenaV2P7StageReportCandidateV2(first)).toEqual(first);
  });

  it('keeps passed evaluation with all not-run automation incomplete and traceable', () => {
    const evaluation = evaluationFixture();
    const automationEvidence = automationFixture(evaluation, () => 'not-run');
    const report = createArenaV2P7StageReportCandidateV2({ evaluation, automationEvidence });
    expect(report).toMatchObject({
      evaluationHardGate: 'PASS',
      automationHardGate: 'INCOMPLETE',
      hardGate: 'INCOMPLETE',
      reportDecision: 'remain',
      verificationStatus: {
        automation: { status: 'incomplete', receiptCounts: { notRun: 24 } },
      },
    });
    expect(report.nonPassingAutomationSuites).toHaveLength(24);
    expect(report.uncompleted.filter((entry) => entry.endsWith(':not-run'))).toHaveLength(24);
    expect(report.failureReasons).toEqual([]);
  });

  it('never lets automation incomplete downgrade an evaluation failure', () => {
    const evaluation = evaluationFixture({ score: 79 });
    const automationEvidence = automationFixture(evaluation, () => 'not-run');
    const report = createArenaV2P7StageReportCandidateV2({ evaluation, automationEvidence });
    expect(report).toMatchObject({
      evaluationHardGate: 'FAIL',
      automationHardGate: 'INCOMPLETE',
      hardGate: 'FAIL',
      reportStatus: 'FAIL',
      reportDecision: 'remain',
    });
    expect(report.failureReasons.some((entry) => entry.startsWith('score-'))).toBe(true);
    expect(report.uncompleted.some((entry) => entry.startsWith('score-'))).toBe(false);
    expect(report.uncompleted.filter((entry) => entry.endsWith(':not-run'))).toHaveLength(24);
  });

  it('never lets evaluation incomplete downgrade an automation failure', () => {
    const evaluation = evaluationFixture({ environmentStatus: 'missing' });
    const automationEvidence = automationFixture(
      evaluation,
      (index) => index === 9 ? 'failed' : 'not-run',
    );
    const report = createArenaV2P7StageReportCandidateV2({ evaluation, automationEvidence });
    expect(report).toMatchObject({
      evaluationHardGate: 'INCOMPLETE',
      automationHardGate: 'FAIL',
      hardGate: 'FAIL',
      reportStatus: 'FAIL',
      reportDecision: 'remain',
      verificationStatus: { automation: { receiptCounts: { failed: 1, notRun: 23 } } },
    });
    expect(report.failureReasons).toContain('automation:arena-p2-candidate-gate:failed');
    expect(report.failureReasons.some((entry) => entry.startsWith('environment:'))).toBe(false);
    expect(report.uncompleted).toContain('environment:web-mobile-390x844:missing');
  });

  it('preserves a missing score slot as incomplete through the V2 report', () => {
    const evaluation = evaluationFixture({ scoreMissingIndex: 6 });
    const automationEvidence = automationFixture(evaluation, () => 'passed');
    const report = createArenaV2P7StageReportCandidateV2({ evaluation, automationEvidence });
    expect(report).toMatchObject({
      evaluationHardGate: 'INCOMPLETE',
      automationHardGate: 'PASS',
      hardGate: 'INCOMPLETE',
      reportStatus: 'INCOMPLETE',
      reportDecision: 'remain',
    });
    expect(report.uncompleted).toContain(
      'score-dimension:formal-assets-accessibility:missing',
    );
    expect(report.evidenceIndex.find(({ id }) => (
      id === 'score-dimension:formal-assets-accessibility'
    ))?.evidenceSha256).toBeNull();
  });

  it('gives independent audit rollback precedence over every combined gate', () => {
    const evaluation = evaluationFixture({ auditDecision: 'rollback' });
    const automationEvidence = automationFixture(evaluation, () => 'passed');
    const report = createArenaV2P7StageReportCandidateV2({ evaluation, automationEvidence });
    expect(report).toMatchObject({
      evaluationHardGate: 'FAIL',
      hardGate: 'FAIL',
      reportDecision: 'rollback',
      independentAudit: { decision: 'rollback' },
    });
  });

  it('rejects mixed evaluation identity and receipt/status tampering', () => {
    const evaluation = evaluationFixture();
    const automationEvidence = automationFixture(evaluation, () => 'passed');
    const otherEvaluation = evaluationFixture({ sourceCommit: 'b'.repeat(40) });
    expect(() => createArenaV2P7StageReportCandidateV2({
      evaluation: otherEvaluation,
      automationEvidence,
    })).toThrow(/身份不一致/);

    expect(() => createArenaV2P7StageReportCandidateV2({
      evaluation: { hardGate: 'PASS', evaluationIdentityHash: evaluation.evaluationIdentityHash },
      automationEvidence,
    })).toThrow();
    expect(() => createArenaV2P7StageReportCandidateV2({
      evaluation,
      automationEvidence: {
        automationStatus: 'passed',
        manifestIdentityHash: automationEvidence.manifestIdentityHash,
      },
    })).toThrow();

    const tamperedReceipt = structuredClone(automationEvidence) as unknown as {
      receipts: Array<{ status: string }>;
    };
    tamperedReceipt.receipts[0]!.status = 'failed';
    expect(() => createArenaV2P7StageReportCandidateV2({
      evaluation,
      automationEvidence: tamperedReceipt,
    })).toThrow();

    const missingReceipt = structuredClone(automationEvidence) as unknown as {
      receipts: unknown[];
    };
    missingReceipt.receipts.pop();
    expect(() => createArenaV2P7StageReportCandidateV2({
      evaluation,
      automationEvidence: missingReceipt,
    })).toThrow();

    const duplicateReceipt = structuredClone(automationEvidence) as unknown as {
      receipts: unknown[];
    };
    duplicateReceipt.receipts[1] = duplicateReceipt.receipts[0];
    expect(() => createArenaV2P7StageReportCandidateV2({
      evaluation,
      automationEvidence: duplicateReceipt,
    })).toThrow();
  });

  it('rejects stored report drift, getters, thenables and future fields', () => {
    const evaluation = evaluationFixture();
    const automationEvidence = automationFixture(evaluation, () => 'passed');
    const report = createArenaV2P7StageReportCandidateV2({ evaluation, automationEvidence });
    const tampered = structuredClone(report) as unknown as { reportDecision: string };
    tampered.reportDecision = 'remain';
    expect(() => validateArenaV2P7StageReportCandidateV2(tampered)).toThrow(/漂移/);

    const tamperedIndex = structuredClone(report) as unknown as {
      automationReceiptIndex: Array<{ status: string }>;
    };
    tamperedIndex.automationReceiptIndex[0]!.status = 'not-run';
    expect(() => validateArenaV2P7StageReportCandidateV2(tamperedIndex)).toThrow(/漂移/);

    let getterCalls = 0;
    const getter = Object.defineProperty({}, 'evaluation', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return evaluation;
      },
    });
    expect(() => createArenaV2P7StageReportCandidateV2(getter)).toThrow();
    expect(getterCalls).toBe(0);

    let thenCalls = 0;
    expect(() => createArenaV2P7StageReportCandidateV2({
      evaluation,
      automationEvidence,
      futureThenable: { then() { thenCalls += 1; } },
    })).toThrow();
    expect(thenCalls).toBe(0);

    expect(() => createArenaV2P7StageReportCandidateV2({
      evaluation,
      automationEvidence,
      futureField: true,
    })).toThrow(/futureField|不支持/);

    const symbolInput = { evaluation, automationEvidence };
    Object.defineProperty(symbolInput, Symbol('future'), {
      enumerable: true,
      value: true,
    });
    expect(() => createArenaV2P7StageReportCandidateV2(symbolInput)).toThrow(/Symbol/);
  });
});
