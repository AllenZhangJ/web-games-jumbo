import { describe, expect, it } from 'vitest';
import type {
  ArenaV2P7AutomationCommandRequestCandidateV1,
  ArenaV2P7AutomationCommandRunnerCandidateV1,
} from '../src/arena-v2-p7-automation-evidence-producer-candidate-v1.js';
import {
  createArenaV2P7AutomationToolchainIdentityHashCandidateV1,
} from '../src/arena-v2-p7-automation-execution-evidence-candidate-v1.js';
import {
  evaluateArenaV2P7EvidenceCandidateV1,
  type ArenaV2P7IndependentAuditDecisionCandidateV1,
} from '../src/arena-v2-p7-evidence-evaluation-candidate-v1.js';
import { createArenaV2P7PreregistrationCandidateV1 } from
  '../src/arena-v2-p7-preregistration-candidate-v1.js';
import {
  createArenaV2P7ReleaseFreezeAssemblySessionCandidateV1,
  type ArenaV2P7ReleaseFreezeAssemblySessionCandidateV1,
} from '../src/arena-v2-p7-release-freeze-assembly-session-candidate-v1.js';
import {
  createArenaV2A7CurrentCatalogIncompleteFixtureV3,
  createArenaV2A7FuturePassFixtureV3,
} from './arena-v2-a7-future-pass-fixture.js';

function sha(index: number): string {
  return index.toString(16).padStart(2, '0').repeat(32);
}

function evaluationFixture(
  auditDecision: ArenaV2P7IndependentAuditDecisionCandidateV1 = 'advance',
) {
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
      scoreEvidence: preregistration.scoreDimensions.map((entry, index) => ({
        dimensionId: entry.id,
        status: 'available',
        score: 100,
        evidenceSha256: sha(48 + index),
      })),
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

function runnerResult(
  request: Readonly<ArenaV2P7AutomationCommandRequestCandidateV1>,
  exitCode = 0,
) {
  return {
    suiteId: request.suite.suiteId,
    directoryIdentityHash: request.directoryIdentityHash,
    commandDefinitionHash: request.suite.commandDefinitionHash,
    sourceCommit: request.sourceCommit,
    contentIdentityHash: request.contentIdentityHash,
    preregistrationIdentityHash: request.preregistrationIdentityHash,
    evaluationIdentityHash: request.evaluationIdentityHash,
    packageJsonSha256: request.packageJsonSha256,
    packageLockSha256: request.packageLockSha256,
    toolchainIdentityHash: request.toolchainIdentityHash,
    runOrdinal: request.runOrdinal,
    attempt: request.attempt,
    exitCode,
    stdoutSha256: sha(80 + request.suiteIndex),
    stderrSha256: sha(120 + request.suiteIndex),
    aggregateOutputSha256: null,
    evidenceSha256: sha(160 + request.suiteIndex),
  };
}

function sessionOptions(
  commandRunner: ArenaV2P7AutomationCommandRunnerCandidateV1,
  auditDecision: ArenaV2P7IndependentAuditDecisionCandidateV1 = 'advance',
) {
  const evaluation = evaluationFixture(auditDecision);
  const packageLockSha256 = sha(221);
  const toolchainIdentitySha256 =
    createArenaV2P7AutomationToolchainIdentityHashCandidateV1(TOOLCHAIN);
  return {
    evaluation,
    formalVisualMediaEvidence: createArenaV2A7CurrentCatalogIncompleteFixtureV3({
      sourceCommit: evaluation.sourceCommit,
      contentIdentityHash: evaluation.contentIdentityHash,
      packageLockSha256,
      toolchainIdentitySha256,
      environmentBuilds: evaluation.preregistration.environmentBuilds,
    }),
    producerOptions: {
      sourceCommit: evaluation.sourceCommit,
      sourceDirty: false as const,
      contentIdentityHash: evaluation.contentIdentityHash,
      preregistrationIdentityHash: evaluation.preregistrationIdentityHash,
      evaluationIdentityHash: evaluation.evaluationIdentityHash,
      packageJsonSha256: sha(220),
      packageLockSha256,
      toolchain: { ...TOOLCHAIN },
      runOrdinal: 1,
      attempt: 1,
      commandRunner,
    },
  };
}

describe('Arena V2 P7 release-freeze assembly session candidate V1', () => {
  it('completes an all-PASS functional report but keeps current A7 release-freeze ineligible', async () => {
    const calls: string[] = [];
    const session = createArenaV2P7ReleaseFreezeAssemblySessionCandidateV1(sessionOptions(
      async (request) => {
        calls.push(request.suite.suiteId);
        return runnerResult(request);
      },
    ));
    const result = await session.start();
    expect(calls).toHaveLength(24);
    expect(result).toMatchObject({
      schemaVersion: 1,
      disposition: 'release-freeze-not-eligible',
      report: { hardGate: 'PASS', reportDecision: 'advance' },
      formalVisualMediaEvidence: {
        evidenceStatus: 'INCOMPLETE',
        formalVisualMediaReady: false,
      },
      releaseFreezeManifest: null,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(session.getResult()).toBe(result);
    expect(session.state).toBe('completed');
  });

  it('creates a qualification manifest only for future A7 V3 PASS evidence', async () => {
    const base = sessionOptions(async (request) => runnerResult(request));
    const futurePass = createArenaV2A7FuturePassFixtureV3({
      sourceCommit: base.evaluation.sourceCommit,
      contentIdentityHash: base.evaluation.contentIdentityHash,
      packageLockSha256: base.producerOptions.packageLockSha256,
      toolchainIdentitySha256:
        createArenaV2P7AutomationToolchainIdentityHashCandidateV1(
          base.producerOptions.toolchain,
        ),
      environmentBuilds: base.evaluation.preregistration.environmentBuilds,
    });
    const session = createArenaV2P7ReleaseFreezeAssemblySessionCandidateV1({
      ...base,
      formalVisualMediaEvidence: futurePass,
    });
    const result = await session.start();
    expect(result).toMatchObject({
      disposition: 'release-freeze-eligible',
      report: { hardGate: 'PASS', reportDecision: 'advance' },
      formalVisualMediaEvidence: {
        evidenceStatus: 'PASS',
        formalVisualMediaReady: true,
      },
      releaseFreezeManifest: {
        status: 'production-unreachable',
        publishes: false,
      },
    });
  });

  it('fails closed when the A7 structural source uses another lock or toolchain', async () => {
    const base = sessionOptions(async (request) => runnerResult(request));
    const lockDrift = createArenaV2A7CurrentCatalogIncompleteFixtureV3({
      sourceCommit: base.evaluation.sourceCommit,
      contentIdentityHash: base.evaluation.contentIdentityHash,
      packageLockSha256: 'f'.repeat(64),
      toolchainIdentitySha256:
        createArenaV2P7AutomationToolchainIdentityHashCandidateV1(
          base.producerOptions.toolchain,
        ),
      environmentBuilds: base.evaluation.preregistration.environmentBuilds,
    });
    const session = createArenaV2P7ReleaseFreezeAssemblySessionCandidateV1({
      ...base,
      formalVisualMediaEvidence: lockDrift,
    });
    await expect(session.start()).rejects.toThrow(/package lock|toolchain/u);
    expect(session.state).toBe('failed');
    expect(() => session.getResult()).toThrow(/尚无/u);
  });

  it('keeps a real command failure as a complete non-eligible report without a manifest', async () => {
    const calls: string[] = [];
    const session = createArenaV2P7ReleaseFreezeAssemblySessionCandidateV1(sessionOptions(
      async (request) => {
        calls.push(request.suite.suiteId);
        return runnerResult(request, request.suiteIndex === 2 ? 7 : 0);
      },
    ));
    const result = await session.start();
    expect(calls).toHaveLength(3);
    expect(result).toMatchObject({
      disposition: 'release-freeze-not-eligible',
      report: { hardGate: 'FAIL', reportDecision: 'remain' },
      releaseFreezeManifest: null,
    });
    expect(result.automationEvidence.receipts.slice(3).every(({ status }) => (
      status === 'not-run'
    ))).toBe(true);
    expect(session.state).toBe('completed');
  });

  it('preserves independent rollback and never creates a qualification manifest', async () => {
    const session = createArenaV2P7ReleaseFreezeAssemblySessionCandidateV1(sessionOptions(
      async (request) => runnerResult(request),
      'rollback',
    ));
    const result = await session.start();
    expect(result).toMatchObject({
      disposition: 'release-freeze-not-eligible',
      report: { reportDecision: 'rollback' },
      releaseFreezeManifest: null,
    });
  });

  it('rejects runner exceptions without exposing report or freeze-manifest fragments', async () => {
    const session = createArenaV2P7ReleaseFreezeAssemblySessionCandidateV1(sessionOptions(
      async (request) => {
        if (request.suiteIndex === 2) throw new Error('runner failed');
        return runnerResult(request);
      },
    ));
    await expect(session.start()).rejects.toThrow('runner failed');
    expect(session.state).toBe('failed');
    expect(() => session.getResult()).toThrow(/尚无可读/);
    expect(() => session.start()).toThrow(/failed/);
    expect(() => session.destroy()).not.toThrow();
    expect(() => session.destroy()).not.toThrow();
    expect(session.state).toBe('destroyed');
  });

  it('blocks running reentry and destroy, then releases the frozen result idempotently', async () => {
    let session: ArenaV2P7ReleaseFreezeAssemblySessionCandidateV1;
    let reentryBlocked = false;
    let destroyBlocked = false;
    session = createArenaV2P7ReleaseFreezeAssemblySessionCandidateV1(sessionOptions(
      async (request) => {
        if (request.suiteIndex === 0) {
          expect(() => session.start()).toThrow(/running/);
          expect(() => session.destroy()).toThrow(/运行中/);
          reentryBlocked = true;
          destroyBlocked = true;
        }
        return runnerResult(request);
      },
    ));
    await session.start();
    expect({ reentryBlocked, destroyBlocked }).toEqual({
      reentryBlocked: true,
      destroyBlocked: true,
    });
    session.destroy();
    session.destroy();
    expect(session.state).toBe('destroyed');
    expect(() => session.getResult()).toThrow(/尚无可读/);
  });

  it('delegates exact-key/accessor and hostile-thenable rejection without executing getters', async () => {
    const base = sessionOptions(async (request) => runnerResult(request));
    let getterCalls = 0;
    const accessor = { ...base } as Record<string, unknown>;
    Object.defineProperty(accessor, 'evaluation', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return base.evaluation;
      },
    });
    expect(() => createArenaV2P7ReleaseFreezeAssemblySessionCandidateV1(accessor)).toThrow(
      /数据字段/,
    );
    expect(getterCalls).toBe(0);
    expect(() => createArenaV2P7ReleaseFreezeAssemblySessionCandidateV1({
      ...base,
      releaseDecision: 'advance',
    })).toThrow(/字段集合/);

    const mismatchedA7 = createArenaV2A7CurrentCatalogIncompleteFixtureV3({
      sourceCommit: 'b'.repeat(40),
      contentIdentityHash: base.evaluation.contentIdentityHash,
      environmentBuilds: base.evaluation.preregistration.environmentBuilds,
    });
    expect(() => createArenaV2P7ReleaseFreezeAssemblySessionCandidateV1({
      ...base,
      formalVisualMediaEvidence: mismatchedA7,
    })).toThrow(/源码|身份漂移/);

    let thenCalls = 0;
    const hostile = createArenaV2P7ReleaseFreezeAssemblySessionCandidateV1(sessionOptions(
      (() => ({
        then() {
          thenCalls += 1;
          return Promise.resolve();
        },
      })) as unknown as ArenaV2P7AutomationCommandRunnerCandidateV1,
    ));
    await expect(hostile.start()).rejects.toThrow(/Promise/);
    expect(thenCalls).toBe(0);
  });
});
