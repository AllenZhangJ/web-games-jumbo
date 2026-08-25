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
  ARENA_V2_P7_RELEASE_FREEZE_MANIFEST_CANDIDATE_V1,
  createArenaV2P7ReleaseFreezeManifestCandidateV1,
  validateArenaV2P7ReleaseFreezeManifestCandidateV1,
} from '../src/arena-v2-p7-release-freeze-manifest-candidate-v1.js';
import { createArenaV2P7StageReportCandidateV2 } from
  '../src/arena-v2-p7-stage-report-candidate-v2.js';
import {
  createArenaV2A7CurrentCatalogIncompleteFixture,
  createArenaV2A7CurrentCatalogIncompleteFixtureV3,
  createArenaV2A7FuturePassFixture,
  createArenaV2A7FuturePassFixtureV3,
} from './arena-v2-a7-future-pass-fixture.js';

function sha(index: number): string {
  return index.toString(16).padStart(2, '0').repeat(32);
}

interface EvaluationFixtureOptions {
  readonly score?: number;
  readonly scoreMissingIndex?: number | null;
  readonly auditDecision?: ArenaV2P7IndependentAuditDecisionCandidateV1;
  readonly openDefectSeverity?: 'medium' | 'high';
}

function evaluationFixture({
  score = 100,
  scoreMissingIndex = null,
  auditDecision = 'advance',
  openDefectSeverity,
}: EvaluationFixtureOptions = {}) {
  const sourceCommit = 'a'.repeat(40);
  const contentIdentityHash = '1234abcd';
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
      scoreEvidence: preregistration.scoreDimensions.map((entry, index) => {
        const missing = index === scoreMissingIndex;
        return {
          dimensionId: entry.id,
          status: missing ? 'missing' : 'available',
          score: missing ? null : score,
          evidenceSha256: missing ? null : sha(48 + index),
        };
      }),
      defects: openDefectSeverity ? [{
        defectId: `${openDefectSeverity}-accepted-001`,
        severity: openDefectSeverity,
        status: 'open',
        owner: 'release-owner',
        impactScope: 'known optional presentation edge',
        acceptanceReason: 'bounded impact accepted by independent audit',
      }] : [],
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

const TOOLCHAIN = Object.freeze({
  nodeVersion: '22.17.0',
  npmVersion: '11.4.2',
  platform: 'darwin',
  architecture: 'arm64',
  typescriptVersion: '5.9.3',
  tsxVersion: '4.23.1',
  vitestVersion: '3.2.7',
  viteVersion: '7.3.6',
  esbuildVersion: '0.25.12',
});

function reportFixture(
  statusFor: (index: number) => ArenaV2P7AutomationSuiteReceiptStatusCandidateV1 = (
    () => 'passed'
  ),
  evaluation = evaluationFixture(),
) {
  const definition = createArenaV2P7AutomationSuiteDirectoryCandidateV1();
  const packageJsonSha256 = sha(220);
  const packageLockSha256 = sha(221);
  const toolchainIdentityHash = createArenaV2P7AutomationToolchainIdentityHashCandidateV1(
    TOOLCHAIN,
  );
  const toolchainIdentitySha256 = sha(222);
  const automationEvidence = createArenaV2P7AutomationExecutionEvidenceCandidateV1({
    sourceCommit: evaluation.sourceCommit,
    sourceDirty: false,
    contentIdentityHash: evaluation.contentIdentityHash,
    preregistrationIdentityHash: evaluation.preregistrationIdentityHash,
    evaluationIdentityHash: evaluation.evaluationIdentityHash,
    packageJsonSha256,
    packageLockSha256,
    toolchain: TOOLCHAIN,
    toolchainIdentitySha256,
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
        toolchainIdentitySha256,
        exitCode: status === 'not-run' ? null : status === 'passed' ? 0 : 1,
        stdoutSha256: status === 'not-run' ? null : sha(120 + index),
        stderrSha256: status === 'not-run' ? null : sha(160 + index),
        aggregateOutputSha256: null,
        evidenceSha256: status === 'not-run' ? null : sha(190 + index),
      };
    }),
  });
  return createArenaV2P7StageReportCandidateV2({ evaluation, automationEvidence });
}

function manifestOptions(report: ReturnType<typeof reportFixture>) {
  return {
    report,
    formalVisualMediaEvidence: createArenaV2A7CurrentCatalogIncompleteFixtureV3({
      sourceCommit: report.candidateIdentity.sourceCommit,
      contentIdentityHash: report.candidateIdentity.contentIdentityHash,
      packageLockSha256: report.candidateIdentity.packageLockSha256,
      toolchainIdentitySha256: report.candidateIdentity.toolchainIdentitySha256,
      environmentBuilds: report.candidateIdentity.environmentBuilds,
    }),
  };
}

describe('Arena V2 P7 release-freeze manifest candidate V1', () => {
  it('withholds qualification from an all-PASS functional report while current A7 is incomplete', () => {
    const report = reportFixture();
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1(
      manifestOptions(report),
    )).toThrow(/A7.*PASS|正式视觉/);
  });

  it('rejects any not-run or failed automation instead of manufacturing eligibility', () => {
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1(manifestOptions(
      reportFixture((index) => index === 2 ? 'not-run' : 'passed'),
    ))).toThrow(/PASS|资格/);
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1(manifestOptions(
      reportFixture((index) => index === 2 ? 'failed' : 'passed'),
    ))).toThrow(/PASS|资格/);
  });

  it('rejects failed, missing-score and independent rollback reports', () => {
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1(manifestOptions(
      reportFixture(() => 'passed', evaluationFixture({ score: 79 })),
    ))).toThrow(/PASS|资格/);
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1(manifestOptions(
      reportFixture(() => 'passed', evaluationFixture({ auditDecision: 'rollback' })),
    ))).toThrow(/PASS|资格/);
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1(manifestOptions(
      reportFixture(() => 'passed', evaluationFixture({ scoreMissingIndex: 6 })),
    ))).toThrow(/PASS|资格/);
  });

  it('requires A7 V3 and rejects legacy V1/V2 evidence', () => {
    const report = reportFixture();
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1({ report }))
      .toThrow(/字段|formalVisualMediaEvidence/);
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1({
      report,
      formalVisualMediaEvidence: createArenaV2A7FuturePassFixture({
        sourceCommit: 'b'.repeat(40),
        contentIdentityHash: report.candidateIdentity.contentIdentityHash,
        environmentBuilds: report.candidateIdentity.environmentBuilds,
      }),
    })).toThrow(/V3|schemaVersion|字段/);
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1({
      report,
      formalVisualMediaEvidence: createArenaV2A7FuturePassFixture({
        sourceCommit: report.candidateIdentity.sourceCommit,
        contentIdentityHash: report.candidateIdentity.contentIdentityHash,
        environmentBuilds: report.candidateIdentity.environmentBuilds,
      }),
    })).toThrow(/V3|schemaVersion|字段/);
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1({
      report,
      formalVisualMediaEvidence: createArenaV2A7CurrentCatalogIncompleteFixture({
        sourceCommit: report.candidateIdentity.sourceCommit,
        contentIdentityHash: report.candidateIdentity.contentIdentityHash,
        environmentBuilds: report.candidateIdentity.environmentBuilds,
      }),
    })).toThrow(/V3|schemaVersion|字段/);
  });

  it('creates only a qualification manifest from future report plus future A7 V3 PASS', () => {
    const report = reportFixture();
    const formalVisualMediaEvidence = createArenaV2A7FuturePassFixtureV3({
      sourceCommit: report.candidateIdentity.sourceCommit,
      contentIdentityHash: report.candidateIdentity.contentIdentityHash,
      packageLockSha256: report.candidateIdentity.packageLockSha256,
      toolchainIdentitySha256: report.candidateIdentity.toolchainIdentitySha256,
      environmentBuilds: report.candidateIdentity.environmentBuilds,
    });
    const manifest = createArenaV2P7ReleaseFreezeManifestCandidateV1({
      report,
      formalVisualMediaEvidence,
    });
    expect(manifest).toMatchObject({
      status: 'production-unreachable',
      defaultReleaseBundleWired: false,
      defaultEntryWired: false,
      validationStatus: 'not-run',
      publishes: false,
      qualification: {
        reportHardGate: 'PASS',
        formalVisualMediaHardGate: 'PASS',
        formalVisualMediaReady: true,
        approvedFormalAssetCount: 130,
      },
      identity: {
        formalAssetBudgetPolicyId:
          formalVisualMediaEvidence.approvedPolicyAssembly.approvedPolicyCandidate
            .policyId,
        formalAssetBudgetPolicyRevision:
          formalVisualMediaEvidence.approvedPolicyAssembly.approvedPolicyCandidate
            .policyRevision,
        formalAssetBudgetPolicyContentHash:
          formalVisualMediaEvidence.approvedPolicyAssembly.approvedPolicyCandidate
            .policyContentHash,
        formalAssetBudgetApprovedPolicyAssemblyIdentity:
          formalVisualMediaEvidence.approvedPolicyAssembly
            .approvedPolicyAssemblyIdentity,
        formalVisualMediaEvidenceRecordIndexIdentityHash:
          formalVisualMediaEvidence.formalEvidenceRecordIndexIdentityHash,
        formalVisualMediaEvidenceRetrievalPlanIdentityHash:
          formalVisualMediaEvidence.formalEvidenceRetrievalPlanIdentityHash,
        formalVisualMediaEvidenceStoreSnapshotIdentityHash:
          formalVisualMediaEvidence.formalEvidenceStoreSnapshotIdentityHash,
        formalVisualMediaEvidenceVerificationIndexIdentityHash:
          formalVisualMediaEvidence.formalEvidenceRecordVerificationIndexIdentityHash,
      },
    });
    expect(validateArenaV2P7ReleaseFreezeManifestCandidateV1(manifest))
      .toEqual(manifest);
    expect(manifest.qualification.formalVisualMediaEvidenceRecordCount)
      .toBeGreaterThan(0);
    expect(manifest.qualification.formalVisualMediaEvidenceRecordCount)
      .toBe(formalVisualMediaEvidence.formalEvidenceRecordIndex.length);
    expect(manifest.qualification.formalVisualMediaEvidenceTotalBytes)
      .toBe(formalVisualMediaEvidence.coverageSummary.totalFormalEvidenceBytes);
    expect(manifest.qualification.formalVisualMediaEvidenceVerificationReceiptCount)
      .toBe(formalVisualMediaEvidence.formalEvidenceRecordVerificationIndex.length);
    expect(manifest.qualification.formalVisualMediaEvidenceVerificationReceiptTotalBytes)
      .toBe(
        formalVisualMediaEvidence.coverageSummary
          .totalFormalEvidenceVerificationReceiptBytes,
      );
    expect(ARENA_V2_P7_RELEASE_FREEZE_MANIFEST_CANDIDATE_V1)
      .toMatchObject({
        releaseFreezeIdentityRetainsA7RetrievalPlanAndStoreSnapshot: true,
      });
  });

  it('requires the A7 structural measurements to use the report lock and toolchain', () => {
    const report = reportFixture();
    const options = {
      sourceCommit: report.candidateIdentity.sourceCommit,
      contentIdentityHash: report.candidateIdentity.contentIdentityHash,
      environmentBuilds: report.candidateIdentity.environmentBuilds,
    };
    const lockDrift = createArenaV2A7FuturePassFixtureV3({
      ...options,
      packageLockSha256: 'f'.repeat(64),
      toolchainIdentitySha256: report.candidateIdentity.toolchainIdentitySha256,
    });
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1({
      report,
      formalVisualMediaEvidence: lockDrift,
    })).toThrow(/package lock|toolchain/u);

    const toolchainDrift = createArenaV2A7FuturePassFixtureV3({
      ...options,
      packageLockSha256: report.candidateIdentity.packageLockSha256,
      toolchainIdentitySha256: 'e'.repeat(64),
    });
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1({
      report,
      formalVisualMediaEvidence: toolchainDrift,
    })).toThrow(/package lock|toolchain/u);
  });

  it('rejects A7 evidence SHA reused by functional or automation evidence', () => {
    const report = reportFixture();
    const collision = createArenaV2A7FuturePassFixtureV3({
      sourceCommit: report.candidateIdentity.sourceCommit,
      contentIdentityHash: report.candidateIdentity.contentIdentityHash,
      packageLockSha256: report.candidateIdentity.packageLockSha256,
      toolchainIdentitySha256: report.candidateIdentity.toolchainIdentitySha256,
      environmentBuilds: report.candidateIdentity.environmentBuilds,
      formalBudgetEvidenceSha256: report.evidenceIndex[0]!.evidenceSha256!,
    });
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1({
      report,
      formalVisualMediaEvidence: collision,
    })).toThrow(/功能、自动化与A7|formal-budget:|跨域重复/u);
  });

  it('rejects an A7 verification receipt SHA reused by functional evidence', () => {
    const report = reportFixture();
    const collision = createArenaV2A7FuturePassFixtureV3({
      sourceCommit: report.candidateIdentity.sourceCommit,
      contentIdentityHash: report.candidateIdentity.contentIdentityHash,
      packageLockSha256: report.candidateIdentity.packageLockSha256,
      toolchainIdentitySha256: report.candidateIdentity.toolchainIdentitySha256,
      environmentBuilds: report.candidateIdentity.environmentBuilds,
      verificationReceiptSha256Override:
        report.evidenceIndex[0]!.evidenceSha256!,
    });
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1({
      report,
      formalVisualMediaEvidence: collision,
    })).toThrow(/功能、自动化与A7验证回执|verification-receipt-0|跨域重复/u);
  });

  it('rejects one A7 evidence SHA reused by different formal evidence slots', () => {
    const report = reportFixture();
    const fixtureOptions = {
      sourceCommit: report.candidateIdentity.sourceCommit,
      contentIdentityHash: report.candidateIdentity.contentIdentityHash,
      packageLockSha256: report.candidateIdentity.packageLockSha256,
      toolchainIdentitySha256: report.candidateIdentity.toolchainIdentitySha256,
      environmentBuilds: report.candidateIdentity.environmentBuilds,
    };
    const baseline = createArenaV2A7FuturePassFixtureV3(fixtureOptions);
    expect(() => {
      const duplicate = createArenaV2A7FuturePassFixtureV3({
        ...fixtureOptions,
        formalBudgetEvidenceSha256:
          baseline.legacyEvidence.evidence.phaseEvidence[0]!.evidenceSha256!,
      });
      return createArenaV2P7ReleaseFreezeManifestCandidateV1({
        report,
        formalVisualMediaEvidence: duplicate,
      });
    }).toThrow(/A7 V3视觉\/结构.*跨证据槽重复/u);
  });

  it('keeps accepted medium defects behind A7 and rejects open high severity', () => {
    const acceptedReport = reportFixture(
        () => 'passed',
        evaluationFixture({ openDefectSeverity: 'medium' }),
      );
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1(
      manifestOptions(acceptedReport),
    )).toThrow(/A7.*PASS|正式视觉/);
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1(manifestOptions(
      reportFixture(
        () => 'passed',
        evaluationFixture({ openDefectSeverity: 'high' }),
      ),
    ))).toThrow(/high|PASS|资格/);
  });

  it('rejects stored-manifest forgery while the current candidate has no legal PASS instance', () => {
    expect(() => validateArenaV2P7ReleaseFreezeManifestCandidateV1({
      report: reportFixture(),
      formalVisualMediaEvidence: manifestOptions(reportFixture()).formalVisualMediaEvidence,
      identityHash: 'deadbeef',
    })).toThrow(/字段|身份|漂移/);
  });

  it('rejects reordered, duplicated or forged evidence through stored report recomputation', () => {
    const report = reportFixture();
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1(manifestOptions({
        ...report,
        evidenceIndex: [report.evidenceIndex[1]!, report.evidenceIndex[0]!, ...report.evidenceIndex.slice(2)],
      }))).toThrow(/漂移|身份/);
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1(manifestOptions({
        ...report,
        evidenceIndex: report.evidenceIndex.map((entry, index) => (
          index === 1 ? report.evidenceIndex[0]! : entry
        )),
      }))).toThrow(/漂移|身份/);
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1(manifestOptions({
        ...report,
        automationReceiptIndex: [
          report.automationReceiptIndex[1]!,
          report.automationReceiptIndex[0]!,
          ...report.automationReceiptIndex.slice(2),
        ],
      }))).toThrow(/漂移|身份/);
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1(manifestOptions({
        ...report,
        automationReceiptIndex: report.automationReceiptIndex.map((entry, index) => (
          index === 1 ? report.automationReceiptIndex[0]! : entry
        )),
      }))).toThrow(/漂移|身份/);
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1(manifestOptions({
      ...report,
      reportIdentityHash: 'deadbeef',
    }))).toThrow(/漂移|身份/);
  });

  it('rejects accessors, hostile thenables, future fields and caller-injected gates', () => {
    const report = reportFixture();
    const base = manifestOptions(report);
    let getterCalls = 0;
    const accessor = { formalVisualMediaEvidence: base.formalVisualMediaEvidence };
    Object.defineProperty(accessor, 'report', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return report;
      },
    });
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1(accessor)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);

    let thenCalls = 0;
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1({
      report: {
        then() {
          thenCalls += 1;
        },
      },
      formalVisualMediaEvidence: base.formalVisualMediaEvidence,
    })).toThrow();
    expect(thenCalls).toBe(0);

    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1({
      ...base,
      hardGate: 'PASS',
    })).toThrow(/不支持|字段/);
    expect(() => createArenaV2P7ReleaseFreezeManifestCandidateV1({
      ...base,
      evidenceIndex: [],
      artifact: { path: 'release.zip' },
    })).toThrow(/不支持|字段/);
    expect(ARENA_V2_P7_RELEASE_FREEZE_MANIFEST_CANDIDATE_V1).toMatchObject({
      status: 'production-unreachable',
      defaultReleaseBundleWired: false,
      defaultEntryWired: false,
      validationStatus: 'not-run',
      publishes: false,
      readsOrWritesFiles: false,
    });
  });
});
