import {
  assertIntegerAtLeast,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { assertEvidenceSha256 } from '@number-strategy-jump/arena-evidence-contracts';
import {
  createArenaV2P7AutomationExecutionEvidenceCandidateV1,
  createArenaV2P7AutomationSuiteDirectoryCandidateV1,
  createArenaV2P7AutomationToolchainIdentityHashCandidateV1,
  type ArenaV2P7AutomationExecutionEvidenceCandidateV1,
  type ArenaV2P7AutomationSuiteDefinitionCandidateV1,
  type ArenaV2P7AutomationSuiteReceiptCandidateV1,
  type ArenaV2P7AutomationToolchainIdentityCandidateV1,
} from './arena-v2-p7-automation-execution-evidence-candidate-v1.js';

export const ARENA_V2_P7_AUTOMATION_EVIDENCE_PRODUCER_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

export type ArenaV2P7AutomationEvidenceProducerStateCandidateV1 =
  | 'created'
  | 'running'
  | 'completed'
  | 'failed'
  | 'destroyed';

export interface ArenaV2P7AutomationCommandRequestCandidateV1 {
  readonly schemaVersion: 1;
  readonly directoryId: string;
  readonly directoryIdentityHash: string;
  readonly suiteIndex: number;
  readonly suiteCount: number;
  readonly suite: Readonly<ArenaV2P7AutomationSuiteDefinitionCandidateV1>;
  readonly sourceCommit: string;
  readonly sourceDirty: false;
  readonly contentIdentityHash: string;
  readonly preregistrationIdentityHash: string;
  readonly evaluationIdentityHash: string;
  readonly packageJsonSha256: string;
  readonly packageLockSha256: string;
  readonly toolchain: Readonly<ArenaV2P7AutomationToolchainIdentityCandidateV1>;
  readonly toolchainIdentityHash: string;
  readonly runOrdinal: number;
  readonly attempt: number;
}

export interface ArenaV2P7AutomationCommandResultCandidateV1 {
  readonly suiteId: string;
  readonly directoryIdentityHash: string;
  readonly commandDefinitionHash: string;
  readonly sourceCommit: string;
  readonly contentIdentityHash: string;
  readonly preregistrationIdentityHash: string;
  readonly evaluationIdentityHash: string;
  readonly packageJsonSha256: string;
  readonly packageLockSha256: string;
  readonly toolchainIdentityHash: string;
  readonly runOrdinal: number;
  readonly attempt: number;
  readonly exitCode: number;
  readonly stdoutSha256: string | null;
  readonly stderrSha256: string | null;
  readonly aggregateOutputSha256: string | null;
  readonly evidenceSha256: string;
}

export type ArenaV2P7AutomationCommandRunnerCandidateV1 = (
  request: Readonly<ArenaV2P7AutomationCommandRequestCandidateV1>,
) => Promise<unknown>;

export interface ArenaV2P7AutomationEvidenceProducerOptionsCandidateV1 {
  readonly sourceCommit: string;
  readonly sourceDirty: false;
  readonly contentIdentityHash: string;
  readonly preregistrationIdentityHash: string;
  readonly evaluationIdentityHash: string;
  readonly packageJsonSha256: string;
  readonly packageLockSha256: string;
  readonly toolchain: Readonly<ArenaV2P7AutomationToolchainIdentityCandidateV1>;
  readonly runOrdinal: number;
  readonly attempt: number;
  readonly commandRunner: ArenaV2P7AutomationCommandRunnerCandidateV1;
}

interface CanonicalExecutionIdentity {
  readonly sourceCommit: string;
  readonly sourceDirty: false;
  readonly contentIdentityHash: string;
  readonly preregistrationIdentityHash: string;
  readonly evaluationIdentityHash: string;
  readonly packageJsonSha256: string;
  readonly packageLockSha256: string;
  readonly toolchain: Readonly<ArenaV2P7AutomationToolchainIdentityCandidateV1>;
  readonly toolchainIdentityHash: string;
  readonly runOrdinal: number;
  readonly attempt: number;
}

const OPTION_KEYS = new Set([
  'sourceCommit', 'sourceDirty', 'contentIdentityHash',
  'preregistrationIdentityHash', 'evaluationIdentityHash',
  'packageJsonSha256', 'packageLockSha256', 'toolchain',
  'runOrdinal', 'attempt', 'commandRunner',
]);
const RESULT_KEYS = new Set([
  'suiteId', 'directoryIdentityHash', 'commandDefinitionHash',
  'sourceCommit', 'contentIdentityHash', 'preregistrationIdentityHash',
  'evaluationIdentityHash', 'packageJsonSha256', 'packageLockSha256',
  'toolchainIdentityHash', 'runOrdinal', 'attempt', 'exitCode',
  'stdoutSha256', 'stderrSha256', 'aggregateOutputSha256', 'evidenceSha256',
]);
const NATIVE_PROMISE_THEN = Promise.prototype.then;

function captureExactDataRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key === 'symbol')) {
    throw new TypeError(`${name}不得包含Symbol字段。`);
  }
  const stringKeys = ownKeys as string[];
  if (
    stringKeys.length !== keys.size
    || stringKeys.some((key) => !keys.has(key))
  ) throw new TypeError(`${name}字段集合不匹配。`);
  const captured: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
    captured[key] = descriptor.value;
  }
  return Object.freeze(captured);
}

function awaitNativePromise(value: unknown, name: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    try {
      Reflect.apply(NATIVE_PROMISE_THEN, value, [resolve, reject]);
    } catch {
      reject(new TypeError(`${name}必须返回原生或foreign Promise。`));
    }
  });
}

function assertExitCode(value: unknown, name: string): number {
  const result = assertIntegerAtLeast(value, 0, name);
  if (!Number.isSafeInteger(result) || result > 255) {
    throw new RangeError(`${name}必须是0到255安全整数。`);
  }
  return result;
}

function nullableSha256(value: unknown, name: string): string | null {
  return value === null ? null : assertEvidenceSha256(value, name);
}

function createNotRunReceipt(
  suite: Readonly<ArenaV2P7AutomationSuiteDefinitionCandidateV1>,
  identity: Readonly<CanonicalExecutionIdentity>,
): ArenaV2P7AutomationSuiteReceiptCandidateV1 {
  return Object.freeze({
    suiteId: suite.suiteId,
    status: 'not-run' as const,
    runOrdinal: identity.runOrdinal,
    attempt: identity.attempt,
    commandDefinitionHash: suite.commandDefinitionHash,
    sourceCommit: identity.sourceCommit,
    contentIdentityHash: identity.contentIdentityHash,
    preregistrationIdentityHash: identity.preregistrationIdentityHash,
    evaluationIdentityHash: identity.evaluationIdentityHash,
    packageJsonSha256: identity.packageJsonSha256,
    packageLockSha256: identity.packageLockSha256,
    toolchainIdentityHash: identity.toolchainIdentityHash,
    exitCode: null,
    stdoutSha256: null,
    stderrSha256: null,
    aggregateOutputSha256: null,
    evidenceSha256: null,
  });
}

function createBootstrapManifest(
  source: Readonly<Record<string, unknown>>,
) {
  const definition = createArenaV2P7AutomationSuiteDirectoryCandidateV1();
  const toolchainIdentityHash = createArenaV2P7AutomationToolchainIdentityHashCandidateV1(
    source.toolchain,
  );
  const rawIdentity = Object.freeze({
    sourceCommit: source.sourceCommit,
    sourceDirty: source.sourceDirty,
    contentIdentityHash: source.contentIdentityHash,
    preregistrationIdentityHash: source.preregistrationIdentityHash,
    evaluationIdentityHash: source.evaluationIdentityHash,
    packageJsonSha256: source.packageJsonSha256,
    packageLockSha256: source.packageLockSha256,
    toolchain: source.toolchain,
    toolchainIdentityHash,
    runOrdinal: source.runOrdinal,
    attempt: source.attempt,
  });
  return createArenaV2P7AutomationExecutionEvidenceCandidateV1({
    sourceCommit: rawIdentity.sourceCommit,
    sourceDirty: rawIdentity.sourceDirty,
    contentIdentityHash: rawIdentity.contentIdentityHash,
    preregistrationIdentityHash: rawIdentity.preregistrationIdentityHash,
    evaluationIdentityHash: rawIdentity.evaluationIdentityHash,
    packageJsonSha256: rawIdentity.packageJsonSha256,
    packageLockSha256: rawIdentity.packageLockSha256,
    toolchain: rawIdentity.toolchain,
    runOrdinal: rawIdentity.runOrdinal,
    attempt: rawIdentity.attempt,
    receipts: definition.suites.map((suite) => ({
      suiteId: suite.suiteId,
      status: 'not-run',
      runOrdinal: rawIdentity.runOrdinal,
      attempt: rawIdentity.attempt,
      commandDefinitionHash: suite.commandDefinitionHash,
      sourceCommit: rawIdentity.sourceCommit,
      contentIdentityHash: rawIdentity.contentIdentityHash,
      preregistrationIdentityHash: rawIdentity.preregistrationIdentityHash,
      evaluationIdentityHash: rawIdentity.evaluationIdentityHash,
      packageJsonSha256: rawIdentity.packageJsonSha256,
      packageLockSha256: rawIdentity.packageLockSha256,
      toolchainIdentityHash,
      exitCode: null,
      stdoutSha256: null,
      stderrSha256: null,
      aggregateOutputSha256: null,
      evidenceSha256: null,
    })),
  });
}

function canonicalIdentity(
  manifest: ArenaV2P7AutomationExecutionEvidenceCandidateV1,
): Readonly<CanonicalExecutionIdentity> {
  return Object.freeze({
    sourceCommit: manifest.sourceCommit,
    sourceDirty: false,
    contentIdentityHash: manifest.contentIdentityHash,
    preregistrationIdentityHash: manifest.preregistrationIdentityHash,
    evaluationIdentityHash: manifest.evaluationIdentityHash,
    packageJsonSha256: manifest.packageJsonSha256,
    packageLockSha256: manifest.packageLockSha256,
    toolchain: manifest.toolchain,
    toolchainIdentityHash: manifest.toolchainIdentityHash,
    runOrdinal: manifest.runOrdinal,
    attempt: manifest.attempt,
  });
}

function createCommandRequest(
  manifest: ArenaV2P7AutomationExecutionEvidenceCandidateV1,
  identity: Readonly<CanonicalExecutionIdentity>,
  suite: Readonly<ArenaV2P7AutomationSuiteDefinitionCandidateV1>,
  suiteIndex: number,
): Readonly<ArenaV2P7AutomationCommandRequestCandidateV1> {
  return cloneFrozenData({
    schemaVersion: ARENA_V2_P7_AUTOMATION_EVIDENCE_PRODUCER_CANDIDATE_V1_SCHEMA_VERSION,
    directoryId: manifest.definition.id,
    directoryIdentityHash: manifest.definitionIdentityHash,
    suiteIndex,
    suiteCount: manifest.definition.suites.length,
    suite,
    ...identity,
  }, `Arena V2 P7 automation runner request ${suite.suiteId}`);
}

function normalizeCommandResult(
  value: unknown,
  request: Readonly<ArenaV2P7AutomationCommandRequestCandidateV1>,
): Readonly<ArenaV2P7AutomationCommandResultCandidateV1> {
  const source = captureExactDataRecord(
    cloneFrozenData(value, `Arena V2 P7 automation runner result ${request.suite.suiteId}`),
    RESULT_KEYS,
    `Arena V2 P7 automation runner result ${request.suite.suiteId}`,
  );
  const expected = [
    ['suiteId', request.suite.suiteId],
    ['directoryIdentityHash', request.directoryIdentityHash],
    ['commandDefinitionHash', request.suite.commandDefinitionHash],
    ['sourceCommit', request.sourceCommit],
    ['contentIdentityHash', request.contentIdentityHash],
    ['preregistrationIdentityHash', request.preregistrationIdentityHash],
    ['evaluationIdentityHash', request.evaluationIdentityHash],
    ['packageJsonSha256', request.packageJsonSha256],
    ['packageLockSha256', request.packageLockSha256],
    ['toolchainIdentityHash', request.toolchainIdentityHash],
    ['runOrdinal', request.runOrdinal],
    ['attempt', request.attempt],
  ] as const;
  for (const [key, expectedValue] of expected) {
    if (source[key] !== expectedValue) {
      throw new RangeError(`P7 automation runner result ${request.suite.suiteId}.${key}身份漂移。`);
    }
  }
  const exitCode = assertExitCode(source.exitCode, `runner ${request.suite.suiteId}.exitCode`);
  const stdoutSha256 = nullableSha256(
    source.stdoutSha256,
    `runner ${request.suite.suiteId}.stdoutSha256`,
  );
  const stderrSha256 = nullableSha256(
    source.stderrSha256,
    `runner ${request.suite.suiteId}.stderrSha256`,
  );
  const aggregateOutputSha256 = nullableSha256(
    source.aggregateOutputSha256,
    `runner ${request.suite.suiteId}.aggregateOutputSha256`,
  );
  if (stdoutSha256 === null && stderrSha256 === null && aggregateOutputSha256 === null) {
    throw new RangeError(`P7 automation runner result ${request.suite.suiteId}缺少输出SHA。`);
  }
  return Object.freeze({
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
    stdoutSha256,
    stderrSha256,
    aggregateOutputSha256,
    evidenceSha256: assertEvidenceSha256(
      source.evidenceSha256,
      `runner ${request.suite.suiteId}.evidenceSha256`,
    ),
  });
}

function createExecutedReceipt(
  result: Readonly<ArenaV2P7AutomationCommandResultCandidateV1>,
): ArenaV2P7AutomationSuiteReceiptCandidateV1 {
  return Object.freeze({
    suiteId: result.suiteId,
    status: result.exitCode === 0 ? 'passed' as const : 'failed' as const,
    runOrdinal: result.runOrdinal,
    attempt: result.attempt,
    commandDefinitionHash: result.commandDefinitionHash,
    sourceCommit: result.sourceCommit,
    contentIdentityHash: result.contentIdentityHash,
    preregistrationIdentityHash: result.preregistrationIdentityHash,
    evaluationIdentityHash: result.evaluationIdentityHash,
    packageJsonSha256: result.packageJsonSha256,
    packageLockSha256: result.packageLockSha256,
    toolchainIdentityHash: result.toolchainIdentityHash,
    exitCode: result.exitCode,
    stdoutSha256: result.stdoutSha256,
    stderrSha256: result.stderrSha256,
    aggregateOutputSha256: result.aggregateOutputSha256,
    evidenceSha256: result.evidenceSha256,
  });
}

export class ArenaV2P7AutomationEvidenceProducerCandidateV1 {
  #state: ArenaV2P7AutomationEvidenceProducerStateCandidateV1 = 'created';
  #commandRunner: ArenaV2P7AutomationCommandRunnerCandidateV1 | null;
  #bootstrapManifest: ArenaV2P7AutomationExecutionEvidenceCandidateV1 | null;
  #identity: Readonly<CanonicalExecutionIdentity> | null;
  #manifest: ArenaV2P7AutomationExecutionEvidenceCandidateV1 | null = null;

  constructor(value: unknown) {
    const source = captureExactDataRecord(value, OPTION_KEYS, 'P7 automation producer options');
    if (typeof source.commandRunner !== 'function') {
      throw new TypeError('P7 automation producer commandRunner必须是函数数据字段。');
    }
    const bootstrapManifest = createBootstrapManifest(source);
    this.#commandRunner = source.commandRunner as ArenaV2P7AutomationCommandRunnerCandidateV1;
    this.#bootstrapManifest = bootstrapManifest;
    this.#identity = canonicalIdentity(bootstrapManifest);
  }

  get state(): ArenaV2P7AutomationEvidenceProducerStateCandidateV1 {
    return this.#state;
  }

  start(): Promise<ArenaV2P7AutomationExecutionEvidenceCandidateV1> {
    if (this.#state !== 'created') {
      throw new Error(`P7 automation producer不能从${this.#state}重复start。`);
    }
    this.#state = 'running';
    return this.#run();
  }

  getManifest(): ArenaV2P7AutomationExecutionEvidenceCandidateV1 {
    if (this.#state !== 'completed' || this.#manifest === null) {
      throw new Error('P7 automation producer尚无可读的完整manifest。');
    }
    return this.#manifest;
  }

  destroy(): void {
    if (this.#state === 'running') {
      throw new Error('P7 automation producer运行中不得destroy。');
    }
    if (this.#state === 'destroyed') return;
    this.#releaseExecutionInputs();
    this.#manifest = null;
    this.#state = 'destroyed';
  }

  #releaseExecutionInputs(): void {
    this.#commandRunner = null;
    this.#bootstrapManifest = null;
    this.#identity = null;
  }

  async #run(): Promise<ArenaV2P7AutomationExecutionEvidenceCandidateV1> {
    try {
      const runner = this.#commandRunner;
      const bootstrapManifest = this.#bootstrapManifest;
      const identity = this.#identity;
      if (runner === null || bootstrapManifest === null || identity === null) {
        throw new Error('P7 automation producer运行依赖已被释放。');
      }
      const receipts: ArenaV2P7AutomationSuiteReceiptCandidateV1[] = [];
      const evidenceHashes = new Set<string>();
      let stopped = false;
      for (let index = 0; index < bootstrapManifest.definition.suites.length; index += 1) {
        const suite = bootstrapManifest.definition.suites[index]!;
        if (stopped) {
          receipts.push(createNotRunReceipt(suite, identity));
          continue;
        }
        const request = createCommandRequest(bootstrapManifest, identity, suite, index);
        const returned = runner(request);
        const result = normalizeCommandResult(
          await awaitNativePromise(returned, `P7 automation runner ${suite.suiteId}`),
          request,
        );
        if (evidenceHashes.has(result.evidenceSha256)) {
          throw new RangeError(`P7 automation runner ${suite.suiteId} evidence SHA重复。`);
        }
        evidenceHashes.add(result.evidenceSha256);
        receipts.push(createExecutedReceipt(result));
        stopped = result.exitCode !== 0;
      }
      const manifest = createArenaV2P7AutomationExecutionEvidenceCandidateV1({
        sourceCommit: identity.sourceCommit,
        sourceDirty: identity.sourceDirty,
        contentIdentityHash: identity.contentIdentityHash,
        preregistrationIdentityHash: identity.preregistrationIdentityHash,
        evaluationIdentityHash: identity.evaluationIdentityHash,
        packageJsonSha256: identity.packageJsonSha256,
        packageLockSha256: identity.packageLockSha256,
        toolchain: identity.toolchain,
        runOrdinal: identity.runOrdinal,
        attempt: identity.attempt,
        receipts,
      });
      this.#manifest = manifest;
      this.#releaseExecutionInputs();
      this.#state = 'completed';
      return manifest;
    } catch (error) {
      this.#manifest = null;
      this.#releaseExecutionInputs();
      this.#state = 'failed';
      throw error;
    }
  }
}

export function createArenaV2P7AutomationEvidenceProducerCandidateV1(
  value: unknown,
): ArenaV2P7AutomationEvidenceProducerCandidateV1 {
  return new ArenaV2P7AutomationEvidenceProducerCandidateV1(value);
}

export const ARENA_V2_P7_AUTOMATION_EVIDENCE_PRODUCER_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  currentGate: 'incomplete' as const,
  hardGate: false as const,
  defaultReleaseBundleWired: false as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
  stageReportAutomationWired: false as const,
  executesOnlyThroughInjectedRunner: true as const,
  fixedConcurrency: 1 as const,
  failurePolicy: 'fail-fast' as const,
  releasesRunnerAfterSettlement: true as const,
});
