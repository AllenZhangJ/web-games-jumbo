import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_P7_AUTOMATION_EVIDENCE_PRODUCER_CANDIDATE_V1,
  createArenaV2P7AutomationEvidenceProducerCandidateV1,
  type ArenaV2P7AutomationCommandRequestCandidateV1,
  type ArenaV2P7AutomationCommandRunnerCandidateV1,
} from '../src/arena-v2-p7-automation-evidence-producer-candidate-v1.js';
import {
  createArenaV2P7AutomationSuiteDirectoryCandidateV1,
} from '../src/arena-v2-p7-automation-execution-evidence-candidate-v1.js';

function sha(index: number): string {
  return index.toString(16).padStart(2, '0').repeat(32);
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

function resultFor(
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
    stdoutSha256: sha(10 + request.suiteIndex),
    stderrSha256: sha(40 + request.suiteIndex),
    aggregateOutputSha256: null,
    evidenceSha256: sha(80 + request.suiteIndex),
  };
}

function options(commandRunner: ArenaV2P7AutomationCommandRunnerCandidateV1) {
  return {
    sourceCommit: 'a'.repeat(40),
    sourceDirty: false as const,
    contentIdentityHash: '1234abcd',
    preregistrationIdentityHash: '2345bcde',
    evaluationIdentityHash: '3456cdef',
    packageJsonSha256: sha(200),
    packageLockSha256: sha(201),
    toolchain: { ...TOOLCHAIN },
    runOrdinal: 2,
    attempt: 1,
    commandRunner,
  };
}

describe('Arena V2 P7 automation evidence producer candidate V1', () => {
  it('runs the internal canonical directory in order with concurrency one', async () => {
    const calls: Readonly<ArenaV2P7AutomationCommandRequestCandidateV1>[] = [];
    let active = 0;
    let maximumActive = 0;
    const producer = createArenaV2P7AutomationEvidenceProducerCandidateV1(options(
      async (request) => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        calls.push(request);
        await Promise.resolve();
        active -= 1;
        return resultFor(request);
      },
    ));

    const manifest = await producer.start();
    const directory = createArenaV2P7AutomationSuiteDirectoryCandidateV1();
    expect(calls.map(({ suite }) => suite.suiteId)).toEqual(
      directory.suites.map(({ suiteId }) => suiteId),
    );
    expect(calls).toHaveLength(24);
    expect(maximumActive).toBe(1);
    expect(calls.every((request, index) => (
      request.suiteIndex === index
      && request.suiteCount === 24
      && request.suite.scriptInvocation === directory.suites[index]!.scriptInvocation
      && request.suite.commandDefinitionHash === directory.suites[index]!.commandDefinitionHash
      && Object.isFrozen(request)
      && Object.isFrozen(request.suite)
    ))).toBe(true);
    expect(manifest).toMatchObject({
      automationStatus: 'passed',
      hardGate: 'PASS',
      validationStatus: 'not-run',
    });
    expect(producer.state).toBe('completed');
    expect(producer.getManifest()).toBe(manifest);
    expect(() => producer.start()).toThrow(/重复start/);
  });

  it('fails fast on the third nonzero exit and marks the remaining 21 suites not-run', async () => {
    const calls: string[] = [];
    const producer = createArenaV2P7AutomationEvidenceProducerCandidateV1(options(
      async (request) => {
        calls.push(request.suite.suiteId);
        return resultFor(request, request.suiteIndex === 2 ? 17 : 0);
      },
    ));

    const manifest = await producer.start();
    expect(calls).toHaveLength(3);
    expect(manifest).toMatchObject({ automationStatus: 'failed', hardGate: 'FAIL' });
    expect(manifest.receipts.slice(0, 2).every(({ status }) => status === 'passed')).toBe(true);
    expect(manifest.receipts[2]).toMatchObject({ status: 'failed', exitCode: 17 });
    expect(manifest.receipts.slice(3).every((receipt) => (
      receipt.status === 'not-run'
      && receipt.exitCode === null
      && receipt.evidenceSha256 === null
    ))).toBe(true);
  });

  it('rejects runner exceptions without publishing a partial manifest', async () => {
    let calls = 0;
    const producer = createArenaV2P7AutomationEvidenceProducerCandidateV1(options(
      async (request) => {
        calls += 1;
        if (request.suiteIndex === 2) throw new Error('runner transport failed');
        return resultFor(request);
      },
    ));

    await expect(producer.start()).rejects.toThrow('runner transport failed');
    expect(calls).toBe(3);
    expect(producer.state).toBe('failed');
    expect(() => producer.getManifest()).toThrow(/尚无可读/);
    producer.destroy();
    producer.destroy();
    expect(producer.state).toBe('destroyed');
  });

  it('rejects invalid exit, missing output, duplicate evidence and identity drift', async () => {
    const invalidExit = createArenaV2P7AutomationEvidenceProducerCandidateV1(options(
      async (request) => ({ ...resultFor(request), exitCode: 256 }),
    ));
    await expect(invalidExit.start()).rejects.toThrow(/0到255/);

    const missingOutput = createArenaV2P7AutomationEvidenceProducerCandidateV1(options(
      async (request) => ({
        ...resultFor(request),
        stdoutSha256: null,
        stderrSha256: null,
        aggregateOutputSha256: null,
      }),
    ));
    await expect(missingOutput.start()).rejects.toThrow(/缺少输出SHA/);

    const duplicateEvidence = createArenaV2P7AutomationEvidenceProducerCandidateV1(options(
      async (request) => ({ ...resultFor(request), evidenceSha256: sha(99) }),
    ));
    await expect(duplicateEvidence.start()).rejects.toThrow(/evidence SHA重复/);

    const drift = createArenaV2P7AutomationEvidenceProducerCandidateV1(options(
      async (request) => ({ ...resultFor(request), commandDefinitionHash: 'deadbeef' }),
    ));
    await expect(drift.start()).rejects.toThrow(/commandDefinitionHash身份漂移/);
  });

  it('rejects hostile async returns and never executes ordinary thenables or accessors', async () => {
    let thenCalls = 0;
    const hostile = createArenaV2P7AutomationEvidenceProducerCandidateV1(options(
      (() => ({
        then() {
          thenCalls += 1;
          return Promise.reject(new Error('must not run'));
        },
      })) as unknown as ArenaV2P7AutomationCommandRunnerCandidateV1,
    ));
    await expect(hostile.start()).rejects.toThrow(/Promise/);
    expect(thenCalls).toBe(0);

    let getterCalls = 0;
    const accessorResult = {};
    Object.defineProperty(accessorResult, 'then', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return () => undefined;
      },
    });
    const accessor = createArenaV2P7AutomationEvidenceProducerCandidateV1(options(
      (() => accessorResult) as unknown as ArenaV2P7AutomationCommandRunnerCandidateV1,
    ));
    await expect(accessor.start()).rejects.toThrow(/Promise/);
    expect(getterCalls).toBe(0);

    const fulfilledAccessor = createArenaV2P7AutomationEvidenceProducerCandidateV1(options(
      async (request) => {
        const resultWithAccessor = resultFor(request);
        Object.defineProperty(resultWithAccessor, 'exitCode', {
          enumerable: true,
          get() {
            getterCalls += 1;
            return 0;
          },
        });
        return resultWithAccessor;
      },
    ));
    await expect(fulfilledAccessor.start()).rejects.toThrow(/访问器|data|数据/);
    expect(getterCalls).toBe(0);
  });

  it('freezes fulfilled output before late caller mutation and rejects future result fields', async () => {
    const captured: { value: ReturnType<typeof resultFor> | null } = { value: null };
    const producer = createArenaV2P7AutomationEvidenceProducerCandidateV1(options(
      async (request) => {
        const result = resultFor(request);
        if (request.suiteIndex === 0) captured.value = result;
        return result;
      },
    ));
    const manifest = await producer.start();
    const lateResult = captured.value;
    if (lateResult === null) throw new Error('test fixture did not capture runner result');
    lateResult.exitCode = 7;
    expect(manifest.receipts[0]).toMatchObject({ status: 'passed', exitCode: 0 });

    const future = createArenaV2P7AutomationEvidenceProducerCandidateV1(options(
      async (request) => ({ ...resultFor(request), futureField: true }),
    ));
    await expect(future.start()).rejects.toThrow(/字段集合/);
  });

  it('blocks running reentry and destroy, then releases references idempotently', async () => {
    let producer: ReturnType<typeof createArenaV2P7AutomationEvidenceProducerCandidateV1>;
    let startBlocked = false;
    let destroyBlocked = false;
    producer = createArenaV2P7AutomationEvidenceProducerCandidateV1(options(
      async (request) => {
        if (request.suiteIndex === 0) {
          expect(() => producer.start()).toThrow(/running/);
          expect(() => producer.destroy()).toThrow(/运行中/);
          startBlocked = true;
          destroyBlocked = true;
        }
        return resultFor(request);
      },
    ));
    await producer.start();
    expect({ startBlocked, destroyBlocked }).toEqual({
      startBlocked: true,
      destroyBlocked: true,
    });
    producer.destroy();
    producer.destroy();
    expect(producer.state).toBe('destroyed');
    expect(() => producer.getManifest()).toThrow(/尚无可读/);
    expect(() => producer.start()).toThrow(/destroyed/);
  });

  it('rejects hostile producer options without executing getters or accepting suite injection', () => {
    const base = options(async (request) => resultFor(request));
    let getterCalls = 0;
    const accessor = { ...base } as Record<string, unknown>;
    Object.defineProperty(accessor, 'sourceCommit', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'a'.repeat(40);
      },
    });
    expect(() => createArenaV2P7AutomationEvidenceProducerCandidateV1(accessor)).toThrow(
      /数据字段/,
    );
    expect(getterCalls).toBe(0);

    expect(() => createArenaV2P7AutomationEvidenceProducerCandidateV1({
      ...base,
      suites: [],
    })).toThrow(/字段集合/);

    expect(ARENA_V2_P7_AUTOMATION_EVIDENCE_PRODUCER_CANDIDATE_V1).toEqual({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      currentGate: 'incomplete',
      hardGate: false,
      defaultReleaseBundleWired: false,
      defaultEntryWired: false,
      validationStatus: 'not-run',
      stageReportAutomationWired: false,
      executesOnlyThroughInjectedRunner: true,
      fixedConcurrency: 1,
      failurePolicy: 'fail-fast',
      releasesRunnerAfterSettlement: true,
    });
  });
});
