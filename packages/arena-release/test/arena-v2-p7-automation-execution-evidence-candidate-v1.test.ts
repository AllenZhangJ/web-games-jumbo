import { describe, expect, it } from 'vitest';
import {
  createArenaV2P7AutomationExecutionEvidenceCandidateV1,
  createArenaV2P7AutomationSuiteDirectoryCandidateV1,
  createArenaV2P7AutomationToolchainIdentityHashCandidateV1,
  validateArenaV2P7AutomationExecutionEvidenceCandidateV1,
  type ArenaV2P7AutomationSuiteReceiptStatusCandidateV1,
} from '../src/arena-v2-p7-automation-execution-evidence-candidate-v1.js';

function sha(index: number): string {
  return index.toString(16).padStart(2, '0').repeat(32);
}

const SOURCE_COMMIT = 'a'.repeat(40);
const CONTENT_IDENTITY_HASH = '1234abcd';
const PREREGISTRATION_IDENTITY_HASH = '2345bcde';
const EVALUATION_IDENTITY_HASH = '3456cdef';
const PACKAGE_JSON_SHA = sha(200);
const PACKAGE_LOCK_SHA = sha(201);
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

function options(
  statusFor: (index: number) => ArenaV2P7AutomationSuiteReceiptStatusCandidateV1 = (
    () => 'not-run'
  ),
) {
  const definition = createArenaV2P7AutomationSuiteDirectoryCandidateV1();
  const toolchainIdentityHash = createArenaV2P7AutomationToolchainIdentityHashCandidateV1(
    TOOLCHAIN,
  );
  return {
    sourceCommit: SOURCE_COMMIT,
    sourceDirty: false,
    contentIdentityHash: CONTENT_IDENTITY_HASH,
    preregistrationIdentityHash: PREREGISTRATION_IDENTITY_HASH,
    evaluationIdentityHash: EVALUATION_IDENTITY_HASH,
    packageJsonSha256: PACKAGE_JSON_SHA,
    packageLockSha256: PACKAGE_LOCK_SHA,
    toolchain: { ...TOOLCHAIN },
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
        sourceCommit: SOURCE_COMMIT,
        contentIdentityHash: CONTENT_IDENTITY_HASH,
        preregistrationIdentityHash: PREREGISTRATION_IDENTITY_HASH,
        evaluationIdentityHash: EVALUATION_IDENTITY_HASH,
        packageJsonSha256: PACKAGE_JSON_SHA,
        packageLockSha256: PACKAGE_LOCK_SHA,
        toolchainIdentityHash,
        exitCode: status === 'not-run' ? null : status === 'passed' ? 0 : 1,
        stdoutSha256: status === 'not-run' ? null : sha(10 + index),
        stderrSha256: status === 'not-run' ? null : sha(40 + index),
        aggregateOutputSha256: null,
        evidenceSha256: status === 'not-run' ? null : sha(80 + index),
      };
    }),
  };
}

describe('Arena V2 P7 automation execution evidence candidate V1', () => {
  it('freezes the current 24-suite canonical directory in stable order', () => {
    const definition = createArenaV2P7AutomationSuiteDirectoryCandidateV1();
    expect(definition.suites).toHaveLength(24);
    expect(definition.suites.map(({ suiteId, scriptInvocation }) => ({
      suiteId, scriptInvocation,
    }))).toEqual([
      { suiteId: 'arena-assets-budget', scriptInvocation: 'npm run arena:assets:budget' },
      { suiteId: 'arena-bot-stress', scriptInvocation: 'npm run arena:bot:stress' },
      { suiteId: 'arena-build-budget', scriptInvocation: 'npm run arena:build:budget' },
      {
        suiteId: 'arena-build-verify-clean',
        scriptInvocation: 'npm run arena:build:verify -- --require-clean-source',
      },
      { suiteId: 'arena-core-stress', scriptInvocation: 'npm run arena:stress' },
      { suiteId: 'arena-defects-verify', scriptInvocation: 'npm run arena:defects:verify' },
      {
        suiteId: 'arena-experiment-balance-validate',
        scriptInvocation: 'npm run arena:experiment:balance:validate',
      },
      { suiteId: 'arena-map-stress', scriptInvocation: 'npm run arena:map:stress' },
      { suiteId: 'arena-movement-stress', scriptInvocation: 'npm run arena:movement:stress' },
      { suiteId: 'arena-p2-candidate-gate', scriptInvocation: 'npm run arena:p2:candidate:gate' },
      { suiteId: 'arena-p3-candidate-gate', scriptInvocation: 'npm run arena:p3:candidate:gate' },
      { suiteId: 'arena-p4-candidate-gate', scriptInvocation: 'npm run arena:p4:candidate:gate' },
      { suiteId: 'arena-p5-candidate-gate', scriptInvocation: 'npm run arena:p5:candidate:gate' },
      { suiteId: 'arena-p6-candidate-gate', scriptInvocation: 'npm run arena:p6:candidate:gate' },
      { suiteId: 'arena-product-stress', scriptInvocation: 'npm run arena:product:stress' },
      { suiteId: 'arena-profile-stress', scriptInvocation: 'npm run arena:profile:stress' },
      { suiteId: 'arena-regression', scriptInvocation: 'npm run arena:regression' },
      {
        suiteId: 'arena-survival-bot-stress',
        scriptInvocation: 'npm run arena:survival:bot:stress',
      },
      { suiteId: 'arena-survival-stress', scriptInvocation: 'npm run arena:survival:stress' },
      { suiteId: 'audit-dependencies', scriptInvocation: 'npm run audit:dependencies' },
      { suiteId: 'check-governance', scriptInvocation: 'npm run check:governance' },
      {
        suiteId: 'check-production-artifacts',
        scriptInvocation: 'npm run check:production-artifacts',
      },
      { suiteId: 'production-build', scriptInvocation: 'npm run build' },
      { suiteId: 'test-node', scriptInvocation: 'npm run test:node' },
    ]);
    expect(definition.suites.find(({ suiteId }) => (
      suiteId === 'arena-build-verify-clean'
    ))?.scriptInvocation).toBe('npm run arena:build:verify -- --require-clean-source');
    expect(new Set(definition.suites.map(({ commandDefinitionHash }) => (
      commandDefinitionHash
    ))).size).toBe(24);
    expect(Object.isFrozen(definition)).toBe(true);
  });

  it('keeps all not-run receipts incomplete with no self-reported output', () => {
    const manifest = createArenaV2P7AutomationExecutionEvidenceCandidateV1(options());
    expect(manifest).toMatchObject({
      status: 'production-unreachable',
      defaultReleaseBundleWired: false,
      validationStatus: 'not-run',
      automationStatus: 'incomplete',
      hardGate: 'INCOMPLETE',
    });
    expect(manifest.receipts).toHaveLength(24);
    expect(manifest.receipts.every((receipt) => (
      receipt.status === 'not-run'
      && receipt.exitCode === null
      && receipt.stdoutSha256 === null
      && receipt.stderrSha256 === null
      && receipt.aggregateOutputSha256 === null
      && receipt.evidenceSha256 === null
    ))).toBe(true);
    expect(validateArenaV2P7AutomationExecutionEvidenceCandidateV1(manifest)).toEqual(manifest);
  });

  it('keeps partially passed receipts incomplete and gives failed precedence', () => {
    const partial = createArenaV2P7AutomationExecutionEvidenceCandidateV1(options(
      (index) => index < 5 ? 'passed' : 'not-run',
    ));
    expect(partial).toMatchObject({ automationStatus: 'incomplete', hardGate: 'INCOMPLETE' });

    const failed = createArenaV2P7AutomationExecutionEvidenceCandidateV1(options(
      (index) => index === 8 ? 'failed' : index < 10 ? 'passed' : 'not-run',
    ));
    expect(failed).toMatchObject({ automationStatus: 'failed', hardGate: 'FAIL' });
  });

  it('can represent a future all-passed fixture without claiming current execution', () => {
    const first = createArenaV2P7AutomationExecutionEvidenceCandidateV1(options(
      () => 'passed',
    ));
    const second = createArenaV2P7AutomationExecutionEvidenceCandidateV1(options(
      () => 'passed',
    ));
    expect(first).toMatchObject({
      validationStatus: 'not-run',
      automationStatus: 'passed',
      hardGate: 'PASS',
    });
    expect(first.manifestIdentityHash).toBe(second.manifestIdentityHash);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it('rejects missing, duplicate, disordered or command-drifted receipts', () => {
    const missingSource = options();
    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1({
      ...missingSource,
      receipts: missingSource.receipts.slice(0, -1),
    })).toThrow(/24项/);

    const duplicateSource = options();
    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1({
      ...duplicateSource,
      receipts: duplicateSource.receipts.map((entry, index) => (
        index === 1 ? { ...entry, suiteId: duplicateSource.receipts[0]!.suiteId } : entry
      )),
    })).toThrow(/顺序|suiteId/);

    const disorderedSource = options();
    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1({
      ...disorderedSource,
      receipts: [
        disorderedSource.receipts[1]!,
        disorderedSource.receipts[0]!,
        ...disorderedSource.receipts.slice(2),
      ],
    })).toThrow(/顺序|suiteId/);

    const commandDrift = options();
    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1({
      ...commandDrift,
      receipts: commandDrift.receipts.map((entry, index) => (
        index === 0 ? { ...entry, commandDefinitionHash: 'deadbeef' } : entry
      )),
    })).toThrow(/命令Definition漂移/);
  });

  it('rejects mixed source/toolchain identity and forged exit or output closure', () => {
    const mixedCommit = options(() => 'passed');
    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1({
      ...mixedCommit,
      receipts: mixedCommit.receipts.map((entry, index) => (
        index === 5 ? { ...entry, sourceCommit: 'b'.repeat(40) } : entry
      )),
    })).toThrow(/身份发生混用/);

    const mixedToolchain = options(() => 'passed');
    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1({
      ...mixedToolchain,
      receipts: mixedToolchain.receipts.map((entry, index) => (
        index === 5 ? { ...entry, toolchainIdentityHash: 'deadbeef' } : entry
      )),
    })).toThrow(/身份发生混用/);

    const mixedPackageLock = options(() => 'passed');
    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1({
      ...mixedPackageLock,
      receipts: mixedPackageLock.receipts.map((entry, index) => (
        index === 5 ? { ...entry, packageLockSha256: sha(202) } : entry
      )),
    })).toThrow(/身份发生混用/);

    const mixedEvaluation = options(() => 'passed');
    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1({
      ...mixedEvaluation,
      receipts: mixedEvaluation.receipts.map((entry, index) => (
        index === 5 ? { ...entry, evaluationIdentityHash: '4567def0' } : entry
      )),
    })).toThrow(/身份发生混用/);

    const falsePass = options(() => 'passed');
    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1({
      ...falsePass,
      receipts: falsePass.receipts.map((entry, index) => (
        index === 0 ? { ...entry, exitCode: 1 } : entry
      )),
    })).toThrow(/状态与exitCode矛盾/);

    const falseFailure = options(() => 'failed');
    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1({
      ...falseFailure,
      receipts: falseFailure.receipts.map((entry, index) => (
        index === 0 ? { ...entry, exitCode: 0 } : entry
      )),
    })).toThrow(/状态与exitCode矛盾/);

    const notRunWithOutput = options();
    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1({
      ...notRunWithOutput,
      receipts: notRunWithOutput.receipts.map((entry, index) => (
        index === 0 ? { ...entry, stdoutSha256: sha(250) } : entry
      )),
    })).toThrow(/未运行时不得携带执行结果/);
  });

  it('rejects duplicate evidence, sparse receipts and unsafe run identity', () => {
    const duplicateEvidence = options(() => 'passed');
    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1({
      ...duplicateEvidence,
      receipts: duplicateEvidence.receipts.map((entry, index) => (
        index === 1
          ? { ...entry, evidenceSha256: duplicateEvidence.receipts[0]!.evidenceSha256 }
          : entry
      )),
    })).toThrow(/evidence SHA必须唯一/);

    const sparse = options();
    Reflect.deleteProperty(sparse.receipts, '3');
    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1(sparse)).toThrow(
      /稀疏|空槽/,
    );

    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1({
      ...options(), runOrdinal: Number.MAX_SAFE_INTEGER + 1,
    })).toThrow(/安全整数/);
  });

  it('rejects stored mutation, getters, thenables, future fields and caller mutation', () => {
    const source = options(() => 'passed');
    const manifest = createArenaV2P7AutomationExecutionEvidenceCandidateV1(source);
    source.receipts[0]!.status = 'failed';
    expect(manifest.receipts[0]!.status).toBe('passed');

    const tampered = structuredClone(manifest) as unknown as { hardGate: string };
    tampered.hardGate = 'INCOMPLETE';
    expect(() => validateArenaV2P7AutomationExecutionEvidenceCandidateV1(tampered)).toThrow(/漂移/);

    let getterCalls = 0;
    const getter = Object.defineProperty({}, 'sourceCommit', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return SOURCE_COMMIT;
      },
    });
    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1(getter)).toThrow();
    expect(getterCalls).toBe(0);

    let thenCalls = 0;
    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1({
      ...options(), futureThenable: { then() { thenCalls += 1; } },
    })).toThrow();
    expect(thenCalls).toBe(0);

    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1({
      ...options(), futureField: true,
    })).toThrow(/futureField|不支持/);

    const symbolInput = options();
    Object.defineProperty(symbolInput, Symbol('future'), {
      enumerable: true,
      value: true,
    });
    expect(() => createArenaV2P7AutomationExecutionEvidenceCandidateV1(symbolInput)).toThrow(
      /Symbol/,
    );
  });
});
