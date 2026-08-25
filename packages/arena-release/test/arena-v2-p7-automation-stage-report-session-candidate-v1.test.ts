import { describe, expect, it } from 'vitest';
import {
  createArenaV2P7AutomationStageReportSessionCandidateV1,
  type ArenaV2P7AutomationStageReportSessionCandidateV1,
} from '../src/arena-v2-p7-automation-stage-report-session-candidate-v1.js';
import type {
  ArenaV2P7AutomationCommandRequestCandidateV1,
  ArenaV2P7AutomationCommandRunnerCandidateV1,
} from '../src/arena-v2-p7-automation-evidence-producer-candidate-v1.js';
import {
  evaluateArenaV2P7EvidenceCandidateV1,
  type ArenaV2P7IndependentAuditDecisionCandidateV1,
} from '../src/arena-v2-p7-evidence-evaluation-candidate-v1.js';
import { createArenaV2P7PreregistrationCandidateV1 } from
  '../src/arena-v2-p7-preregistration-candidate-v1.js';

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
    toolchainIdentitySha256: request.toolchainIdentitySha256,
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
  return {
    evaluation,
    producerOptions: {
      sourceCommit: evaluation.sourceCommit,
      sourceDirty: false as const,
      contentIdentityHash: evaluation.contentIdentityHash,
      preregistrationIdentityHash: evaluation.preregistrationIdentityHash,
      evaluationIdentityHash: evaluation.evaluationIdentityHash,
      packageJsonSha256: sha(220),
      packageLockSha256: sha(221),
      toolchain: { ...TOOLCHAIN },
      toolchainIdentitySha256: sha(222),
      runOrdinal: 1,
      attempt: 1,
      commandRunner,
    },
  };
}

describe('Arena V2 P7 automation to stage-report session candidate V1', () => {
  it('publishes one frozen PASS manifest and V2 report only after all suites complete', async () => {
    const calls: string[] = [];
    const session = createArenaV2P7AutomationStageReportSessionCandidateV1(sessionOptions(
      async (request) => {
        calls.push(request.suite.suiteId);
        return runnerResult(request);
      },
    ));
    expect(() => session.getResult()).toThrow(/尚无可读/);
    const result = await session.start();
    expect(calls).toHaveLength(24);
    expect(result.automationEvidence).toMatchObject({ hardGate: 'PASS' });
    expect(result.report).toMatchObject({ hardGate: 'PASS', reportDecision: 'advance' });
    expect(result.report.automationEvidence.manifestIdentityHash).toBe(
      result.automationEvidence.manifestIdentityHash,
    );
    expect(result.report.candidateIdentity).toMatchObject({
      packageJsonSha256: sha(220),
      packageLockSha256: sha(221),
      toolchain: TOOLCHAIN,
      automationManifestIdentityHash: result.automationEvidence.manifestIdentityHash,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(session.getResult()).toBe(result);
    expect(session.state).toBe('completed');
  });

  it('turns a real third-suite nonzero exit into a complete FAIL report and stops', async () => {
    const calls: string[] = [];
    const session = createArenaV2P7AutomationStageReportSessionCandidateV1(sessionOptions(
      async (request) => {
        calls.push(request.suite.suiteId);
        return runnerResult(request, request.suiteIndex === 2 ? 9 : 0);
      },
    ));
    const result = await session.start();
    expect(calls).toHaveLength(3);
    expect(result.automationEvidence).toMatchObject({ hardGate: 'FAIL' });
    expect(result.automationEvidence.receipts.slice(3).every(({ status }) => (
      status === 'not-run'
    ))).toBe(true);
    expect(result.report).toMatchObject({
      hardGate: 'FAIL',
      reportStatus: 'FAIL',
      reportDecision: 'remain',
    });
  });

  it('preserves independent rollback precedence for a completed command failure', async () => {
    const session = createArenaV2P7AutomationStageReportSessionCandidateV1(sessionOptions(
      async (request) => runnerResult(request, request.suiteIndex === 0 ? 5 : 0),
      'rollback',
    ));
    const result = await session.start();
    expect(result.report).toMatchObject({ hardGate: 'FAIL', reportDecision: 'rollback' });
  });

  it('rejects runner exceptions without exposing a partial manifest or report', async () => {
    const session = createArenaV2P7AutomationStageReportSessionCandidateV1(sessionOptions(
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
    expect(() => session.getResult()).toThrow(/尚无可读/);
  });

  it('rejects stored evaluation or producer identity drift before the runner is called', () => {
    let calls = 0;
    const base = sessionOptions(async (request) => {
      calls += 1;
      return runnerResult(request);
    });
    expect(() => createArenaV2P7AutomationStageReportSessionCandidateV1({
      ...base,
      evaluation: { ...base.evaluation, evaluationIdentityHash: 'deadbeef' },
    })).toThrow(/身份|漂移/);
    expect(() => createArenaV2P7AutomationStageReportSessionCandidateV1({
      ...base,
      producerOptions: { ...base.producerOptions, sourceCommit: 'b'.repeat(40) },
    })).toThrow(/身份不一致/);
    expect(calls).toBe(0);
  });

  it('blocks running reentry and destroy, then releases a completed result idempotently', async () => {
    let session: ArenaV2P7AutomationStageReportSessionCandidateV1;
    let reentryBlocked = false;
    let destroyBlocked = false;
    session = createArenaV2P7AutomationStageReportSessionCandidateV1(sessionOptions(
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
    expect(() => session.start()).toThrow(/destroyed/);
  });

  it('rejects accessors, hostile thenables and injected future decision fields', async () => {
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
    expect(() => createArenaV2P7AutomationStageReportSessionCandidateV1(accessor)).toThrow(
      /数据字段/,
    );
    expect(getterCalls).toBe(0);

    let thenCalls = 0;
    const hostile = createArenaV2P7AutomationStageReportSessionCandidateV1(sessionOptions(
      (() => ({
        then() {
          thenCalls += 1;
          return Promise.reject(new Error('must not execute'));
        },
      })) as unknown as ArenaV2P7AutomationCommandRunnerCandidateV1,
    ));
    await expect(hostile.start()).rejects.toThrow(/Promise/);
    expect(thenCalls).toBe(0);

    expect(() => createArenaV2P7AutomationStageReportSessionCandidateV1({
      ...base,
      reportDecision: 'advance',
    })).toThrow(/字段集合/);
    expect(() => createArenaV2P7AutomationStageReportSessionCandidateV1({
      ...base,
      producerOptions: { ...base.producerOptions, receipts: [] },
    })).toThrow(/字段集合/);
  });
});
