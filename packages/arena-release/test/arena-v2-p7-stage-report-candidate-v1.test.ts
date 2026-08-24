import { describe, expect, it } from 'vitest';
import {
  createArenaV2P7PreregistrationCandidateV1,
  type ArenaV2P7PreregistrationCandidateV1,
} from '../src/arena-v2-p7-preregistration-candidate-v1.js';
import {
  evaluateArenaV2P7EvidenceCandidateV1,
  type ArenaV2P7AggregatedEvidenceCandidateV1,
  type ArenaV2P7DefectEvidenceCandidateV1,
  type ArenaV2P7EnvironmentEvidenceCandidateV1,
  type ArenaV2P7HumanTaskEvidenceCandidateV1,
  type ArenaV2P7IndependentAuditEvidenceCandidateV1,
  type ArenaV2P7LongitudinalEvidenceCandidateV1,
  type ArenaV2P7ScoreEvidenceCandidateV1,
} from '../src/arena-v2-p7-evidence-evaluation-candidate-v1.js';
import {
  createArenaV2P7StageReportCandidateV1,
  validateArenaV2P7StageReportCandidateV1,
} from '../src/arena-v2-p7-stage-report-candidate-v1.js';

function sha(index: number): string {
  return index.toString(16).padStart(2, '0').repeat(32);
}

type Mutable<T> = { -readonly [Key in keyof T]: T[Key] };

type MutableAggregatedEvidence = Mutable<Omit<
  ArenaV2P7AggregatedEvidenceCandidateV1,
  | 'environmentEvidence'
  | 'humanTaskEvidence'
  | 'longitudinalEvidence'
  | 'scoreEvidence'
  | 'defects'
  | 'independentAudit'
>> & {
  environmentEvidence: ArenaV2P7EnvironmentEvidenceCandidateV1[];
  humanTaskEvidence: ArenaV2P7HumanTaskEvidenceCandidateV1[];
  longitudinalEvidence: ArenaV2P7LongitudinalEvidenceCandidateV1[];
  scoreEvidence: ArenaV2P7ScoreEvidenceCandidateV1[];
  defects: ArenaV2P7DefectEvidenceCandidateV1[];
  independentAudit: ArenaV2P7IndependentAuditEvidenceCandidateV1;
};

interface MutableEvaluationInput {
  readonly preregistration: ArenaV2P7PreregistrationCandidateV1;
  readonly evidence: MutableAggregatedEvidence;
}

function evaluationInput(): MutableEvaluationInput {
  const preregistration = createArenaV2P7PreregistrationCandidateV1({
    sourceCommit: 'a'.repeat(40),
    sourceDirty: false,
    contentIdentityHash: '1234abcd',
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
  return {
    preregistration,
    evidence: {
      schemaVersion: 1,
      sourceCommit: preregistration.sourceCommit,
      contentIdentityHash: preregistration.contentIdentityHash,
      environmentBuildSetIdentityHash: preregistration.environmentBuildSetIdentityHash,
      preregistrationIdentityHash: preregistration.preregistrationIdentityHash,
      environmentEvidence: preregistration.environmentBuilds.map((entry, index) => ({
        environmentId: entry.environmentId,
        sourceCommit: preregistration.sourceCommit,
        contentIdentityHash: preregistration.contentIdentityHash,
        buildIdentitySha256: entry.buildIdentitySha256,
        evidenceSha256: sha(1 + index),
        status: 'passed',
        failureReason: null,
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
      scoreEvidence: preregistration.scoreDimensions.map((entry, index) => ({
        dimensionId: entry.id,
        status: 'available',
        score: 100,
        evidenceSha256: sha(48 + index),
      })),
      defects: [],
      defectLedgerEvidenceSha256: sha(70),
      independentAudit: {
        sourceCommit: preregistration.sourceCommit,
        contentIdentityHash: preregistration.contentIdentityHash,
        environmentBuildSetIdentityHash: preregistration.environmentBuildSetIdentityHash,
        preregistrationIdentityHash: preregistration.preregistrationIdentityHash,
        decision: 'advance',
        auditor: 'independent-auditor',
        reason: 'all gates independently reconciled',
        evidenceSha256: sha(71),
      },
    },
  };
}

function evaluated(value = evaluationInput()) {
  return evaluateArenaV2P7EvidenceCandidateV1(value);
}

describe('Arena V2 P7 fixed stage report candidate V1', () => {
  it('keeps a fully passed upstream evaluation incomplete until automation evidence exists', () => {
    const first = createArenaV2P7StageReportCandidateV1({ evaluation: evaluated() });
    const second = createArenaV2P7StageReportCandidateV1({ evaluation: evaluated() });
    expect(first).toMatchObject({
      stage: 'P7',
      status: 'production-unreachable',
      validationStatus: 'not-run',
      defaultReleaseBundleWired: false,
      evaluationHardGate: 'PASS',
      hardGate: 'INCOMPLETE',
      reportStatus: 'INCOMPLETE',
      reportDecision: 'remain',
      verificationStatus: {
        automation: {
          status: 'not-run',
          requiredEvidenceKind: 'dedicated-automation-execution-evidence',
          evidenceSha256: null,
        },
        device: { status: 'passed', targetEnvironmentCount: 6 },
        human: { status: 'passed', humanTaskCount: 6, longitudinalCheckpointCount: 7 },
      },
    });
    expect(first.uncompleted).toContain('automation:not-run');
    expect(first.candidateIdentity.environmentBuilds).toHaveLength(6);
    expect(first.score.dimensions).toHaveLength(8);
    expect(first.evidenceIndex).toHaveLength(29);
    expect(new Set(first.evidenceIndex.map(({ id }) => id)).size).toBe(29);
    expect(new Set(first.evidenceIndex.map(({ evidenceSha256 }) => evidenceSha256)).size).toBe(29);
    expect(first.reportIdentityHash).toBe(second.reportIdentityHash);
    expect(Object.isFrozen(first)).toBe(true);
    expect(validateArenaV2P7StageReportCandidateV1(first)).toEqual(first);
  });

  it('retains failed and rollback upstream conclusions without advancing the report', () => {
    const failedInput = evaluationInput();
    failedInput.evidence.scoreEvidence[0] = {
      ...failedInput.evidence.scoreEvidence[0]!, score: 79,
    };
    const failed = createArenaV2P7StageReportCandidateV1({
      evaluation: evaluated(failedInput),
    });
    expect(failed).toMatchObject({
      evaluationHardGate: 'FAIL',
      hardGate: 'FAIL',
      reportStatus: 'FAIL',
      reportDecision: 'remain',
      verificationStatus: { automation: { status: 'not-run' } },
    });

    const rollbackInput = evaluationInput();
    rollbackInput.evidence.independentAudit = {
      ...rollbackInput.evidence.independentAudit,
      decision: 'rollback',
      reason: 'independent audit requires rollback',
    };
    const rollback = createArenaV2P7StageReportCandidateV1({
      evaluation: evaluated(rollbackInput),
    });
    expect(rollback).toMatchObject({
      evaluationHardGate: 'FAIL',
      hardGate: 'FAIL',
      reportStatus: 'FAIL',
      reportDecision: 'rollback',
      verificationStatus: { automation: { status: 'not-run' } },
      independentAudit: { decision: 'rollback' },
    });
  });

  it('keeps missing device, sample or audit evidence incomplete and never advances', () => {
    const missingDevice = evaluationInput();
    missingDevice.evidence.environmentEvidence[5] = {
      ...missingDevice.evidence.environmentEvidence[5]!,
      evidenceSha256: null,
      status: 'missing', failureReason: 'physical device not collected',
    };
    const deviceReport = createArenaV2P7StageReportCandidateV1({
      evaluation: evaluated(missingDevice),
    });
    expect(deviceReport).toMatchObject({
      evaluationHardGate: 'INCOMPLETE',
      hardGate: 'INCOMPLETE', reportStatus: 'INCOMPLETE', reportDecision: 'remain',
      verificationStatus: { device: { status: 'incomplete' } },
    });

    const missingSample = evaluationInput();
    missingSample.evidence.humanTaskEvidence[0] = {
      ...missingSample.evidence.humanTaskEvidence[0]!,
      qualifiedParticipants: 3,
      overallCompletion: { numerator: 3, denominator: 3 },
      noVerbalHelp: { numerator: 3, denominator: 3 },
      explanation: { numerator: 3, denominator: 3 },
      subgroups: [
        { subgroupId: 'experienced', numerator: 0, denominator: 0 },
        { subgroupId: 'novice', numerator: 3, denominator: 3 },
      ],
    };
    expect(createArenaV2P7StageReportCandidateV1({
      evaluation: evaluated(missingSample),
    })).toMatchObject({
      hardGate: 'INCOMPLETE',
      reportDecision: 'remain',
      verificationStatus: { human: { status: 'incomplete' } },
    });

    const missingAudit = evaluationInput();
    missingAudit.evidence.independentAudit = {
      ...missingAudit.evidence.independentAudit,
      decision: 'missing', auditor: null, reason: null, evidenceSha256: null,
    };
    expect(createArenaV2P7StageReportCandidateV1({
      evaluation: evaluated(missingAudit),
    })).toMatchObject({ hardGate: 'INCOMPLETE', reportDecision: 'remain' });

    const missingScore = evaluationInput();
    missingScore.evidence.scoreEvidence[4] = {
      dimensionId: missingScore.evidence.scoreEvidence[4]!.dimensionId,
      status: 'missing',
      score: null,
      evidenceSha256: null,
    };
    const missingScoreReport = createArenaV2P7StageReportCandidateV1({
      evaluation: evaluated(missingScore),
    });
    expect(missingScoreReport).toMatchObject({
      hardGate: 'INCOMPLETE',
      reportDecision: 'remain',
      score: {
        totalScore: null,
        totalScorePassed: null,
        everyDimensionPassed: null,
      },
    });
    expect(missingScoreReport.evidenceIndex.find(({ id }) => (
      id === `score-dimension:${missingScore.evidence.scoreEvidence[4]!.dimensionId}`
    ))?.evidenceSha256).toBeNull();
  });

  it('never treats replay-regression score evidence as automation execution evidence', () => {
    const passedScoreReport = createArenaV2P7StageReportCandidateV1({
      evaluation: evaluated(),
    });
    expect(passedScoreReport.evaluation.scoreSummary.dimensions.find(({ dimensionId }) => (
      dimensionId === 'replay-regression-integrity'
    ))?.passedMinimum).toBe(true);
    expect(passedScoreReport.verificationStatus.automation.status).toBe('not-run');
    expect(passedScoreReport.hardGate).toBe('INCOMPLETE');
    expect(passedScoreReport.reportDecision).toBe('remain');

    const value = evaluationInput();
    const index = value.evidence.scoreEvidence.findIndex(({ dimensionId }) => (
      dimensionId === 'replay-regression-integrity'
    ));
    value.evidence.scoreEvidence[index] = {
      ...value.evidence.scoreEvidence[index]!, score: 79,
    };
    const report = createArenaV2P7StageReportCandidateV1({ evaluation: evaluated(value) });
    expect(report.validationStatus).toBe('not-run');
    expect(report.verificationStatus.automation.status).toBe('not-run');
    expect(report.reportDecision).toBe('remain');
    expect(report.implemented.every(({ status }) => status === 'code-written-not-run')).toBe(true);
  });

  it('rejects missing builds, missing index entries and duplicate artifact hashes', () => {
    const completeForMissingBuild = evaluated();
    const missingBuild = {
      ...completeForMissingBuild,
      preregistration: {
        ...completeForMissingBuild.preregistration,
        environmentBuilds: completeForMissingBuild.preregistration.environmentBuilds.slice(0, -1),
      },
    };
    expect(() => createArenaV2P7StageReportCandidateV1({
      evaluation: missingBuild,
    })).toThrow();

    const completeForMissingEvidence = evaluated();
    const missingEvidence = {
      ...completeForMissingEvidence,
      evidence: {
        ...completeForMissingEvidence.evidence,
        humanTaskEvidence: completeForMissingEvidence.evidence.humanTaskEvidence.slice(0, -1),
      },
    };
    expect(() => createArenaV2P7StageReportCandidateV1({
      evaluation: missingEvidence,
    })).toThrow();

    const duplicateHashInput = evaluationInput();
    duplicateHashInput.evidence.humanTaskEvidence[0] = {
      ...duplicateHashInput.evidence.humanTaskEvidence[0]!,
      evidenceSha256: duplicateHashInput.evidence.environmentEvidence[0]!.evidenceSha256,
    };
    expect(() => createArenaV2P7StageReportCandidateV1({
      evaluation: evaluated(duplicateHashInput),
    })).toThrow(/ID\/SHA唯一/);
  });

  it('preserves explicit remain audit and all eight raw score SHA references', () => {
    const value = evaluationInput();
    value.evidence.independentAudit = {
      ...value.evidence.independentAudit,
      decision: 'remain', reason: 'manual review remains open',
    };
    const report = createArenaV2P7StageReportCandidateV1({ evaluation: evaluated(value) });
    expect(report.reportDecision).toBe('remain');
    expect(report.independentAudit.decision).toBe('remain');
    expect(report.score.dimensions).toHaveLength(8);
    expect(report.score.dimensions.every(({ evidenceSha256 }) => (
      evidenceSha256 !== null && /^[0-9a-f]{64}$/u.test(evidenceSha256)
    ))).toBe(true);
  });

  it('rejects stored report mutation, getters, thenables, future fields and identity drift', () => {
    const report = createArenaV2P7StageReportCandidateV1({ evaluation: evaluated() });
    const tampered = structuredClone(report) as unknown as { hardGate: string };
    tampered.hardGate = 'PASS';
    expect(() => validateArenaV2P7StageReportCandidateV1(tampered)).toThrow(/漂移/);

    let getterCalls = 0;
    const getter = Object.defineProperty({}, 'evaluation', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return evaluated();
      },
    });
    expect(() => createArenaV2P7StageReportCandidateV1(getter)).toThrow();
    expect(getterCalls).toBe(0);

    let thenCalls = 0;
    expect(() => createArenaV2P7StageReportCandidateV1({
      evaluation: evaluated(),
      hostile: { then() { thenCalls += 1; } },
    })).toThrow();
    expect(thenCalls).toBe(0);

    expect(() => createArenaV2P7StageReportCandidateV1({
      evaluation: evaluated(), futureField: true,
    })).toThrow(/futureField|不支持/);

    const drifted = { ...evaluated(), sourceCommit: 'b'.repeat(40) };
    expect(() => createArenaV2P7StageReportCandidateV1({ evaluation: drifted })).toThrow();
  });
});
