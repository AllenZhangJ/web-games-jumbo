import { describe, expect, it } from 'vitest';
import {
  createArenaV2P7PreregistrationCandidateV1,
} from '../src/arena-v2-p7-preregistration-candidate-v1.js';
import {
  evaluateArenaV2P7EvidenceCandidateV1,
  validateArenaV2P7EvidenceEvaluationCandidateV1,
  type ArenaV2P7AggregatedEvidenceCandidateV1,
} from '../src/arena-v2-p7-evidence-evaluation-candidate-v1.js';

interface TestInput {
  preregistration: ReturnType<typeof preregistration>;
  evidence: ArenaV2P7AggregatedEvidenceCandidateV1;
}

function preregistration() {
  return createArenaV2P7PreregistrationCandidateV1({
    sourceCommit: 'a'.repeat(40),
    sourceDirty: false,
    contentIdentityHash: '1234abcd',
    environmentBuilds: [
      'web-mobile-390x844', 'web-desktop-1440x900', 'wechat-developer-tool',
      'douyin-developer-tool', 'ios-physical-device', 'android-physical-device',
    ].map((environmentId, index) => ({
      environmentId,
      buildIdentitySha256: String(index + 1).repeat(64),
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
}

function input(): TestInput {
  const registered = preregistration();
  return {
    preregistration: registered,
    evidence: {
      schemaVersion: 1,
      sourceCommit: registered.sourceCommit,
      contentIdentityHash: registered.contentIdentityHash,
      environmentBuildSetIdentityHash: registered.environmentBuildSetIdentityHash,
      preregistrationIdentityHash: registered.preregistrationIdentityHash,
      environmentEvidence: registered.environmentBuilds.map((build) => ({
        environmentId: build.environmentId,
        sourceCommit: registered.sourceCommit,
        contentIdentityHash: registered.contentIdentityHash,
        buildIdentitySha256: build.buildIdentitySha256,
        evidenceSha256: '7'.repeat(64),
        status: 'passed',
        failureReason: null,
      })),
      humanTaskEvidence: registered.humanTaskThresholds.map((threshold) => ({
        taskId: threshold.taskId,
        evidenceSha256: '8'.repeat(64),
        qualifiedParticipants: 10,
        overallCompletion: { numerator: 9, denominator: 10 },
        noVerbalHelp: { numerator: 8, denominator: 10 },
        explanation: { numerator: 8, denominator: 10 },
        subgroups: [
          { subgroupId: 'experienced', numerator: 4, denominator: 5 },
          { subgroupId: 'novice', numerator: 4, denominator: 5 },
        ],
      })),
      longitudinalEvidence: registered.longitudinalThresholds.map((threshold) => ({
        checkpointHours: threshold.checkpointHours,
        evidenceSha256: '9'.repeat(64),
        qualifiedParticipants: 10,
        activeGoal: { numerator: 8, denominator: 10 },
        goalCompletion: { numerator: 7, denominator: 10 },
        crossWeaponOrMapUse: { numerator: 6, denominator: 10 },
      })),
      scoreEvidence: registered.scoreDimensions.map((dimension) => ({
        dimensionId: dimension.id,
        status: 'available',
        score: 100,
        evidenceSha256: 'a'.repeat(64),
      })),
      defects: [],
      defectLedgerEvidenceSha256: 'b'.repeat(64),
      independentAudit: {
        sourceCommit: registered.sourceCommit,
        contentIdentityHash: registered.contentIdentityHash,
        environmentBuildSetIdentityHash: registered.environmentBuildSetIdentityHash,
        preregistrationIdentityHash: registered.preregistrationIdentityHash,
        decision: 'advance',
        auditor: 'independent-auditor',
        reason: 'all frozen evidence independently reconciled',
        evidenceSha256: 'c'.repeat(64),
      },
    },
  };
}

function replaceAt<T>(values: readonly T[], index: number, value: T): T[] {
  return values.map((entry, current) => current === index ? value : entry);
}

describe('Arena V2 P7 evidence evaluation candidate V1', () => {
  it('passes only the complete frozen evidence closure and hashes deterministically', () => {
    const first = evaluateArenaV2P7EvidenceCandidateV1(input());
    const second = evaluateArenaV2P7EvidenceCandidateV1(input());
    expect(first).toMatchObject({
      status: 'production-unreachable',
      defaultReleaseBundleWired: false,
      validationStatus: 'not-run',
      evaluationStatus: 'passed',
      hardGate: 'PASS',
      advanceEligible: true,
      scoreSummary: {
        totalScore: 100,
        minimumTotalScore: 90,
        minimumScorePerDimension: 80,
        everyDimensionPassed: true,
      },
    });
    expect(first.environmentGates).toHaveLength(6);
    expect(first.humanTaskGates).toHaveLength(6);
    expect(first.longitudinalGates).toHaveLength(7);
    expect(first.scoreSummary.dimensions).toHaveLength(8);
    expect(first.evaluationIdentityHash).toBe(second.evaluationIdentityHash);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.evidence.humanTaskEvidence[0]!.subgroups)).toBe(true);
    expect(validateArenaV2P7EvidenceEvaluationCandidateV1(first)).toEqual(first);
  });

  it('classifies missing device or qualified sample as incomplete, never passed', () => {
    const missingDevice = input();
    const device = missingDevice.evidence.environmentEvidence[5]!;
    missingDevice.evidence = {
      ...missingDevice.evidence,
      environmentEvidence: replaceAt(
        missingDevice.evidence.environmentEvidence,
        5,
        {
          ...device,
          evidenceSha256: null,
          status: 'missing',
          failureReason: 'device not collected',
        },
      ),
    };
    expect(evaluateArenaV2P7EvidenceCandidateV1(missingDevice)).toMatchObject({
      evaluationStatus: 'incomplete', hardGate: 'INCOMPLETE', advanceEligible: false,
    });

    const forgedMissingDevice = input();
    forgedMissingDevice.evidence = {
      ...forgedMissingDevice.evidence,
      environmentEvidence: replaceAt(
        forgedMissingDevice.evidence.environmentEvidence,
        5,
        {
          ...forgedMissingDevice.evidence.environmentEvidence[5]!,
          status: 'missing',
          failureReason: 'device not collected',
        },
      ),
    };
    expect(() => evaluateArenaV2P7EvidenceCandidateV1(forgedMissingDevice)).toThrow(
      /只有missing可缺少evidenceSha256/u,
    );

    const missingSample = input();
    const task = missingSample.evidence.humanTaskEvidence[0]!;
    missingSample.evidence = {
      ...missingSample.evidence,
      humanTaskEvidence: replaceAt(
        missingSample.evidence.humanTaskEvidence,
        0,
        {
          ...task,
          qualifiedParticipants: 9,
          overallCompletion: { numerator: 9, denominator: 9 },
          noVerbalHelp: { numerator: 9, denominator: 9 },
          explanation: { numerator: 9, denominator: 9 },
          subgroups: [
            { subgroupId: 'experienced', numerator: 4, denominator: 4 },
            { subgroupId: 'novice', numerator: 5, denominator: 5 },
          ],
        },
      ),
    };
    expect(evaluateArenaV2P7EvidenceCandidateV1(missingSample)).toMatchObject({
      evaluationStatus: 'incomplete', advanceEligible: false,
    });

    const missingLongitudinalSample = input();
    missingLongitudinalSample.evidence = {
      ...missingLongitudinalSample.evidence,
      longitudinalEvidence: replaceAt(
        missingLongitudinalSample.evidence.longitudinalEvidence,
        0,
        {
          ...missingLongitudinalSample.evidence.longitudinalEvidence[0]!,
          evidenceSha256: null,
          qualifiedParticipants: 0,
          activeGoal: { numerator: 0, denominator: 0 },
          goalCompletion: { numerator: 0, denominator: 0 },
          crossWeaponOrMapUse: { numerator: 0, denominator: 0 },
        },
      ),
    };
    const missingLongitudinalResult = evaluateArenaV2P7EvidenceCandidateV1(
      missingLongitudinalSample,
    );
    expect(missingLongitudinalResult).toMatchObject({
      evaluationStatus: 'incomplete',
      hardGate: 'INCOMPLETE',
    });
    expect(missingLongitudinalResult.longitudinalGates[0]).toMatchObject({
      checkpointHours: 0.5, status: 'incomplete',
    });
  });

  it('keeps zero, partial and 9:1 subgroup recruitment incomplete until both reach five', () => {
    const cases = [
      {
        qualifiedParticipants: 0,
        fraction: { numerator: 0, denominator: 0 },
        subgroups: [
          { subgroupId: 'experienced', numerator: 0, denominator: 0 },
          { subgroupId: 'novice', numerator: 0, denominator: 0 },
        ],
      },
      {
        qualifiedParticipants: 3,
        fraction: { numerator: 3, denominator: 3 },
        subgroups: [
          { subgroupId: 'experienced', numerator: 0, denominator: 0 },
          { subgroupId: 'novice', numerator: 3, denominator: 3 },
        ],
      },
      {
        qualifiedParticipants: 10,
        fraction: { numerator: 10, denominator: 10 },
        subgroups: [
          { subgroupId: 'experienced', numerator: 9, denominator: 9 },
          { subgroupId: 'novice', numerator: 1, denominator: 1 },
        ],
      },
    ];
    for (const sample of cases) {
      const value = input();
      const task = value.evidence.humanTaskEvidence[0]!;
      value.evidence = {
        ...value.evidence,
        humanTaskEvidence: replaceAt(
          value.evidence.humanTaskEvidence,
          0,
          {
            ...task,
            evidenceSha256: sample.qualifiedParticipants === 0
              ? null
              : task.evidenceSha256,
            qualifiedParticipants: sample.qualifiedParticipants,
            overallCompletion: sample.fraction,
            noVerbalHelp: sample.fraction,
            explanation: sample.fraction,
            subgroups: sample.subgroups,
          },
        ),
      };
      const evaluated = evaluateArenaV2P7EvidenceCandidateV1(value);
      expect(evaluated).toMatchObject({
        evaluationStatus: 'incomplete',
        hardGate: 'INCOMPLETE',
      });
      expect(evaluated.humanTaskGates[0]).toMatchObject({ status: 'incomplete' });
    }

    const boundary = evaluateArenaV2P7EvidenceCandidateV1(input());
    expect(boundary.humanTaskGates[0]).toMatchObject({ status: 'passed' });
  });

  it('rejects identity drift, reordered or duplicate catalogs and future fields', () => {
    const drift = input();
    drift.evidence = {
      ...drift.evidence,
      environmentEvidence: replaceAt(
        drift.evidence.environmentEvidence,
        0,
        {
          ...drift.evidence.environmentEvidence[0]!,
          buildIdentitySha256: 'f'.repeat(64),
        },
      ),
    };
    expect(() => evaluateArenaV2P7EvidenceCandidateV1(drift)).toThrow(/identity|\u8eab\u4efd|drift/i);

    const buildSetDrift = input();
    buildSetDrift.evidence = {
      ...buildSetDrift.evidence,
      environmentBuildSetIdentityHash: 'deadbeef',
    };
    expect(() => evaluateArenaV2P7EvidenceCandidateV1(buildSetDrift)).toThrow(/身份漂移/u);

    const auditBuildSetDrift = input();
    auditBuildSetDrift.evidence = {
      ...auditBuildSetDrift.evidence,
      independentAudit: {
        ...auditBuildSetDrift.evidence.independentAudit,
        environmentBuildSetIdentityHash: 'deadbeef',
      },
    };
    expect(() => evaluateArenaV2P7EvidenceCandidateV1(auditBuildSetDrift)).toThrow(
      /independentAudit身份漂移/u,
    );

    const reordered = input();
    reordered.evidence = {
      ...reordered.evidence,
      environmentEvidence: [...reordered.evidence.environmentEvidence].reverse(),
    };
    expect(() => evaluateArenaV2P7EvidenceCandidateV1(reordered)).toThrow(/\u987a\u5e8f|must be/i);

    const duplicate = input();
    duplicate.evidence = {
      ...duplicate.evidence,
      humanTaskEvidence: replaceAt(
        duplicate.evidence.humanTaskEvidence,
        1,
        {
          ...duplicate.evidence.humanTaskEvidence[1]!,
          taskId: duplicate.evidence.humanTaskEvidence[0]!.taskId,
        },
      ),
    };
    expect(() => evaluateArenaV2P7EvidenceCandidateV1(duplicate)).toThrow(/\u9884\u6ce8\u518c\u987a\u5e8f/);

    expect(() => evaluateArenaV2P7EvidenceCandidateV1({
      ...input(), futureField: true,
    })).toThrow(/futureField|\u4e0d\u652f\u6301/);

    const futureSchema = input();
    expect(() => evaluateArenaV2P7EvidenceCandidateV1({
      ...futureSchema,
      evidence: { ...futureSchema.evidence, schemaVersion: 2 },
    })).toThrow(/schemaVersion/);
  });

  it('does not let strong averages hide one failed human or subgroup gate', () => {
    const oneMetricRed = input();
    const task = oneMetricRed.evidence.humanTaskEvidence[2]!;
    oneMetricRed.evidence = {
      ...oneMetricRed.evidence,
      humanTaskEvidence: replaceAt(
        oneMetricRed.evidence.humanTaskEvidence,
        2,
        {
          ...task,
          overallCompletion: { numerator: 10, denominator: 10 },
          noVerbalHelp: { numerator: 7, denominator: 10 },
          explanation: { numerator: 10, denominator: 10 },
          subgroups: [
            { subgroupId: 'experienced', numerator: 5, denominator: 5 },
            { subgroupId: 'novice', numerator: 3, denominator: 5 },
          ],
        },
      ),
    };
    const result = evaluateArenaV2P7EvidenceCandidateV1(oneMetricRed);
    expect(result.evaluationStatus).toBe('failed');
    expect(result.humanTaskGates[2]).toMatchObject({
      status: 'failed', noVerbalHelpRate: 0.7,
    });
    expect(result.advanceEligible).toBe(false);
  });

  it('binds the preregistered subgroup catalog and accounts for every qualified sample', () => {
    const changedCatalog = input();
    const task = changedCatalog.evidence.humanTaskEvidence[0]!;
    changedCatalog.evidence = {
      ...changedCatalog.evidence,
      humanTaskEvidence: replaceAt(
        changedCatalog.evidence.humanTaskEvidence,
        0,
        {
          ...task,
          subgroups: [
            { subgroupId: 'favorable-only', numerator: 5, denominator: 5 },
            { subgroupId: 'novice', numerator: 4, denominator: 5 },
          ],
        },
      ),
    };
    expect(() => evaluateArenaV2P7EvidenceCandidateV1(changedCatalog)).toThrow(/预注册顺序/);

    const missingPeople = input();
    missingPeople.evidence = {
      ...missingPeople.evidence,
      humanTaskEvidence: replaceAt(
        missingPeople.evidence.humanTaskEvidence,
        0,
        {
          ...missingPeople.evidence.humanTaskEvidence[0]!,
          subgroups: [
            { subgroupId: 'experienced', numerator: 4, denominator: 4 },
            { subgroupId: 'novice', numerator: 4, denominator: 4 },
          ],
        },
      ),
    };
    expect(() => evaluateArenaV2P7EvidenceCandidateV1(missingPeople)).toThrow(/分母总和/);

  });

  it('requires artifact SHA-256 identities and rejects stored evidence hash drift', () => {
    const missingHash = input();
    expect(() => evaluateArenaV2P7EvidenceCandidateV1({
      ...missingHash,
      evidence: {
        ...missingHash.evidence,
        environmentEvidence: [
          { ...missingHash.evidence.environmentEvidence[0]!, evidenceSha256: undefined },
          ...missingHash.evidence.environmentEvidence.slice(1),
        ],
      },
    })).toThrow(/evidenceSha256/);

    const evaluated = evaluateArenaV2P7EvidenceCandidateV1(input());
    const drifted = structuredClone(evaluated);
    (drifted.evidence.humanTaskEvidence[0] as { evidenceSha256: string })
      .evidenceSha256 = 'f'.repeat(64);
    expect(() => validateArenaV2P7EvidenceEvaluationCandidateV1(drifted)).toThrow(/漂移/);

    const missingLedgerHash = input();
    expect(() => evaluateArenaV2P7EvidenceCandidateV1({
      ...missingLedgerHash,
      evidence: {
        ...missingLedgerHash.evidence,
        defectLedgerEvidenceSha256: undefined,
      },
    })).toThrow(/defectLedgerEvidenceSha256/);
  });

  it('rejects a string longitudinal checkpoint instead of coercing its identity', () => {
    const value = input();
    const checkpoint = value.evidence.longitudinalEvidence[1]!;
    expect(() => evaluateArenaV2P7EvidenceCandidateV1({
      ...value,
      evidence: {
        ...value.evidence,
        longitudinalEvidence: value.evidence.longitudinalEvidence.map((entry, index) => (
          index === 1 ? { ...checkpoint, checkpointHours: '1' } : entry
        )),
      },
    })).toThrow(/checkpointHours/);
  });

  it('fails blocking/high and keeps incomplete medium/low acceptance evidence incomplete', () => {
    for (const severity of ['blocking', 'high'] as const) {
      const value = input();
      value.evidence = {
        ...value.evidence,
        defects: [{
          defectId: `${severity}-001`, severity, status: 'open',
          owner: 'owner', impactScope: 'release candidate',
          acceptanceReason: 'not acceptable for release',
        }],
      };
      expect(evaluateArenaV2P7EvidenceCandidateV1(value)).toMatchObject({
        evaluationStatus: 'failed', advanceEligible: false,
      });
    }

    const unowned = input();
    unowned.evidence = {
      ...unowned.evidence,
      defects: [{
        defectId: 'medium-001', severity: 'medium', status: 'open',
        owner: 'owner', impactScope: null, acceptanceReason: 'accepted for named scope',
      }],
    };
    expect(evaluateArenaV2P7EvidenceCandidateV1(unowned)).toMatchObject({
      evaluationStatus: 'incomplete',
      hardGate: 'INCOMPLETE',
      defectSummary: { incompleteMediumLowAcceptance: ['medium-001'] },
    });

    const accepted = input();
    accepted.evidence = {
      ...accepted.evidence,
      defects: [{
        defectId: 'medium-accepted-001', severity: 'medium', status: 'open',
        owner: 'release-owner', impactScope: 'known optional presentation edge',
        acceptanceReason: 'bounded impact accepted by independent audit',
      }],
    };
    expect(evaluateArenaV2P7EvidenceCandidateV1(accepted).evaluationStatus).toBe('passed');

    const closed = input();
    closed.evidence = {
      ...closed.evidence,
      defects: [{
        defectId: 'low-closed-001', severity: 'low', status: 'closed',
        owner: null, impactScope: null, acceptanceReason: null,
      }],
    };
    expect(evaluateArenaV2P7EvidenceCandidateV1(closed).evaluationStatus).toBe('passed');
  });

  it('enforces both the weighted total and every normalized dimension boundary', () => {
    const oneDimensionRed = input();
    oneDimensionRed.evidence = {
      ...oneDimensionRed.evidence,
      scoreEvidence: replaceAt(
        oneDimensionRed.evidence.scoreEvidence,
        7,
        { ...oneDimensionRed.evidence.scoreEvidence[7]!, score: 79 },
      ),
    };
    expect(evaluateArenaV2P7EvidenceCandidateV1(oneDimensionRed)).toMatchObject({
      evaluationStatus: 'failed',
      scoreSummary: { totalScorePassed: true, everyDimensionPassed: false },
    });

    const totalRed = input();
    totalRed.evidence = {
      ...totalRed.evidence,
      scoreEvidence: totalRed.evidence.scoreEvidence.map((entry) => ({
        ...entry, score: 80,
      })),
    };
    expect(evaluateArenaV2P7EvidenceCandidateV1(totalRed)).toMatchObject({
      evaluationStatus: 'failed',
      scoreSummary: { totalScore: 80, totalScorePassed: false, everyDimensionPassed: true },
    });
  });

  it('keeps a missing score dimension incomplete without accepting a forged zero score', () => {
    const missingScore = input();
    missingScore.evidence = {
      ...missingScore.evidence,
      scoreEvidence: replaceAt(
        missingScore.evidence.scoreEvidence,
        3,
        {
          dimensionId: missingScore.evidence.scoreEvidence[3]!.dimensionId,
          status: 'missing',
          score: null,
          evidenceSha256: null,
        },
      ),
    };
    expect(evaluateArenaV2P7EvidenceCandidateV1(missingScore)).toMatchObject({
      evaluationStatus: 'incomplete',
      hardGate: 'INCOMPLETE',
      advanceEligible: false,
      scoreSummary: {
        totalScore: null,
        totalScorePassed: null,
        everyDimensionPassed: null,
      },
    });

    const forgedZero = input();
    forgedZero.evidence = {
      ...forgedZero.evidence,
      scoreEvidence: replaceAt(
        forgedZero.evidence.scoreEvidence,
        3,
        {
          dimensionId: forgedZero.evidence.scoreEvidence[3]!.dimensionId,
          status: 'missing',
          score: 0,
          evidenceSha256: null,
        } as unknown as typeof forgedZero.evidence.scoreEvidence[number],
      ),
    };
    expect(() => evaluateArenaV2P7EvidenceCandidateV1(forgedZero)).toThrow(
      /缺失时不得伪造score或evidenceSha256/u,
    );
  });

  it('keeps missing audit incomplete and an explicit remain decision failed', () => {
    const missing = input();
    missing.evidence = {
      ...missing.evidence,
      independentAudit: {
        ...missing.evidence.independentAudit,
        decision: 'missing', auditor: null, reason: null, evidenceSha256: null,
      },
    };
    expect(evaluateArenaV2P7EvidenceCandidateV1(missing)).toMatchObject({
      evaluationStatus: 'incomplete', advanceEligible: false,
    });

    const forgedMissing = input();
    forgedMissing.evidence = {
      ...forgedMissing.evidence,
      independentAudit: {
        ...forgedMissing.evidence.independentAudit,
        decision: 'missing', auditor: null, reason: null,
      },
    };
    expect(() => evaluateArenaV2P7EvidenceCandidateV1(forgedMissing)).toThrow(
      /只有missing决定可以缺少evidenceSha256/u,
    );

    const remain = input();
    remain.evidence = {
      ...remain.evidence,
      independentAudit: {
        ...remain.evidence.independentAudit,
        decision: 'remain', reason: 'one hard gate remains',
      },
    };
    expect(evaluateArenaV2P7EvidenceCandidateV1(remain)).toMatchObject({
      evaluationStatus: 'failed', hardGate: 'FAIL', advanceEligible: false,
    });
  });

  it('rejects getters and thenables without executing user code and isolates stored output', () => {
    let getterCalls = 0;
    const getterValue = Object.defineProperty({}, 'preregistration', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return preregistration();
      },
    });
    expect(() => evaluateArenaV2P7EvidenceCandidateV1(getterValue)).toThrow();
    expect(getterCalls).toBe(0);

    let thenCalls = 0;
    const thenable = input();
    expect(() => evaluateArenaV2P7EvidenceCandidateV1({
      ...thenable,
      evidence: {
        ...thenable.evidence,
        hostile: { then() { thenCalls += 1; } },
      },
    })).toThrow();
    expect(thenCalls).toBe(0);

    const stored = input();
    const evaluated = evaluateArenaV2P7EvidenceCandidateV1(stored);
    (stored.evidence.scoreEvidence[0] as { score: number }).score = 0;
    expect(evaluated.scoreSummary.dimensions[0]!.score).toBe(100);
    expect(evaluated.evaluationStatus).toBe('passed');

    const tampered = structuredClone(evaluated);
    (tampered.scoreSummary as { totalScore: number }).totalScore = 0;
    expect(() => validateArenaV2P7EvidenceEvaluationCandidateV1(tampered)).toThrow(/漂移/);
  });
});
