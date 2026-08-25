import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceGitCommit,
  assertEvidenceSha256,
} from '@number-strategy-jump/arena-evidence-contracts';

export const ARENA_V2_P7_AUTOMATION_EXECUTION_EVIDENCE_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_V2_P7_AUTOMATION_SUITE_DIRECTORY_CANDIDATE_V1_ID =
  'arena.v2.p7.automation-suite-directory.v1' as const;

export type ArenaV2P7AutomationSuiteReceiptStatusCandidateV1 =
  | 'not-run'
  | 'failed'
  | 'passed';
export type ArenaV2P7AutomationExecutionStatusCandidateV1 =
  | 'incomplete'
  | 'failed'
  | 'passed';

export interface ArenaV2P7AutomationSuiteDefinitionCandidateV1 {
  readonly suiteId: string;
  readonly scriptInvocation: string;
  readonly commandDefinitionHash: string;
}

export interface ArenaV2P7AutomationToolchainIdentityCandidateV1 {
  readonly nodeVersion: string;
  readonly npmVersion: string;
  readonly platform: string;
  readonly architecture: string;
  readonly typescriptVersion: string;
  readonly tsxVersion: string;
  readonly vitestVersion: string;
  readonly viteVersion: string;
  readonly esbuildVersion: string;
}

export interface ArenaV2P7AutomationSuiteReceiptCandidateV1 {
  readonly suiteId: string;
  readonly status: ArenaV2P7AutomationSuiteReceiptStatusCandidateV1;
  readonly runOrdinal: number;
  readonly attempt: number;
  readonly commandDefinitionHash: string;
  readonly sourceCommit: string;
  readonly contentIdentityHash: string;
  readonly preregistrationIdentityHash: string;
  readonly evaluationIdentityHash: string;
  readonly packageJsonSha256: string;
  readonly packageLockSha256: string;
  readonly toolchainIdentityHash: string;
  readonly toolchainIdentitySha256: string;
  readonly exitCode: number | null;
  readonly stdoutSha256: string | null;
  readonly stderrSha256: string | null;
  readonly aggregateOutputSha256: string | null;
  readonly evidenceSha256: string | null;
}

export interface ArenaV2P7AutomationExecutionEvidenceOptionsCandidateV1 {
  readonly sourceCommit: string;
  readonly sourceDirty: false;
  readonly contentIdentityHash: string;
  readonly preregistrationIdentityHash: string;
  readonly evaluationIdentityHash: string;
  readonly packageJsonSha256: string;
  readonly packageLockSha256: string;
  readonly toolchain: ArenaV2P7AutomationToolchainIdentityCandidateV1;
  readonly toolchainIdentitySha256: string;
  readonly runOrdinal: number;
  readonly attempt: number;
  readonly receipts: readonly ArenaV2P7AutomationSuiteReceiptCandidateV1[];
}

const OPTION_KEYS = new Set([
  'sourceCommit', 'sourceDirty', 'contentIdentityHash',
  'preregistrationIdentityHash', 'evaluationIdentityHash',
  'packageJsonSha256', 'packageLockSha256', 'toolchain',
  'toolchainIdentitySha256', 'runOrdinal', 'attempt', 'receipts',
]);
const TOOLCHAIN_KEYS = new Set([
  'nodeVersion', 'npmVersion', 'platform', 'architecture', 'typescriptVersion',
  'tsxVersion', 'vitestVersion', 'viteVersion', 'esbuildVersion',
]);
const RECEIPT_KEYS = new Set([
  'suiteId', 'status', 'runOrdinal', 'attempt', 'commandDefinitionHash',
  'sourceCommit', 'contentIdentityHash', 'preregistrationIdentityHash',
  'evaluationIdentityHash', 'packageJsonSha256', 'packageLockSha256',
  'toolchainIdentityHash', 'toolchainIdentitySha256', 'exitCode', 'stdoutSha256', 'stderrSha256',
  'aggregateOutputSha256', 'evidenceSha256',
]);
const STORED_MANIFEST_KEYS = new Set([
  'schemaVersion', 'status', 'defaultReleaseBundleWired', 'validationStatus',
  'definition', 'definitionIdentityHash', 'sourceCommit', 'sourceDirty',
  'contentIdentityHash', 'preregistrationIdentityHash', 'evaluationIdentityHash',
  'packageJsonSha256', 'packageLockSha256', 'toolchain', 'toolchainIdentityHash',
  'toolchainIdentitySha256',
  'runOrdinal', 'attempt', 'receipts', 'automationStatus', 'hardGate',
  'manifestIdentityHash',
]);
const CONTENT_HASH_PATTERN = /^[0-9a-f]{8}$/u;
const RECEIPT_STATUSES = new Set<ArenaV2P7AutomationSuiteReceiptStatusCandidateV1>([
  'not-run', 'failed', 'passed',
]);

const RAW_SUITES = [
  ['arena-assets-budget', 'npm run arena:assets:budget'],
  ['arena-bot-stress', 'npm run arena:bot:stress'],
  ['arena-build-budget', 'npm run arena:build:budget'],
  ['arena-build-verify-clean', 'npm run arena:build:verify -- --require-clean-source'],
  ['arena-core-stress', 'npm run arena:stress'],
  ['arena-defects-verify', 'npm run arena:defects:verify'],
  ['arena-experiment-balance-validate', 'npm run arena:experiment:balance:validate'],
  ['arena-map-stress', 'npm run arena:map:stress'],
  ['arena-movement-stress', 'npm run arena:movement:stress'],
  ['arena-p2-candidate-gate', 'npm run arena:p2:candidate:gate'],
  ['arena-p3-candidate-gate', 'npm run arena:p3:candidate:gate'],
  ['arena-p4-candidate-gate', 'npm run arena:p4:candidate:gate'],
  ['arena-p5-candidate-gate', 'npm run arena:p5:candidate:gate'],
  ['arena-p6-candidate-gate', 'npm run arena:p6:candidate:gate'],
  ['arena-product-stress', 'npm run arena:product:stress'],
  ['arena-profile-stress', 'npm run arena:profile:stress'],
  ['arena-regression', 'npm run arena:regression'],
  ['arena-survival-bot-stress', 'npm run arena:survival:bot:stress'],
  ['arena-survival-stress', 'npm run arena:survival:stress'],
  ['audit-dependencies', 'npm run audit:dependencies'],
  ['check-governance', 'npm run check:governance'],
  ['check-production-artifacts', 'npm run check:production-artifacts'],
  ['production-build', 'npm run build'],
  ['test-node', 'npm run test:node'],
] as const;

const SUITES: readonly Readonly<ArenaV2P7AutomationSuiteDefinitionCandidateV1>[] = Object.freeze(RAW_SUITES.map(
  ([suiteId, scriptInvocation]) => Object.freeze({
    suiteId,
    scriptInvocation,
    commandDefinitionHash: createDeterministicDataHash(
      Object.freeze({ suiteId, scriptInvocation }),
      'Arena V2 P7 automation command definition V1',
    ),
  }),
));

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

function contentHash(value: unknown, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (!CONTENT_HASH_PATTERN.test(result)) throw new RangeError(`${name}必须是8位小写hash。`);
  return result;
}

function positiveSafeInteger(value: unknown, name: string): number {
  const result = assertIntegerAtLeast(value, 1, name);
  if (!Number.isSafeInteger(result)) throw new RangeError(`${name}必须是正安全整数。`);
  return result;
}

function normalizeToolchain(
  value: unknown,
): Readonly<ArenaV2P7AutomationToolchainIdentityCandidateV1> {
  exactRecord(value, TOOLCHAIN_KEYS, 'Arena V2 P7 automation toolchain');
  return Object.freeze({
    nodeVersion: assertNonEmptyString(value.nodeVersion, 'toolchain.nodeVersion'),
    npmVersion: assertNonEmptyString(value.npmVersion, 'toolchain.npmVersion'),
    platform: assertNonEmptyString(value.platform, 'toolchain.platform'),
    architecture: assertNonEmptyString(value.architecture, 'toolchain.architecture'),
    typescriptVersion: assertNonEmptyString(value.typescriptVersion, 'toolchain.typescriptVersion'),
    tsxVersion: assertNonEmptyString(value.tsxVersion, 'toolchain.tsxVersion'),
    vitestVersion: assertNonEmptyString(value.vitestVersion, 'toolchain.vitestVersion'),
    viteVersion: assertNonEmptyString(value.viteVersion, 'toolchain.viteVersion'),
    esbuildVersion: assertNonEmptyString(value.esbuildVersion, 'toolchain.esbuildVersion'),
  });
}

export function createArenaV2P7AutomationToolchainIdentityHashCandidateV1(
  value: unknown,
): string {
  return createDeterministicDataHash(
    normalizeToolchain(cloneFrozenData(value, 'Arena V2 P7 automation toolchain input')),
    'Arena V2 P7 automation toolchain identity V1',
  );
}

export function createArenaV2P7AutomationSuiteDirectoryCandidateV1() {
  const definition = Object.freeze({
    schemaVersion: ARENA_V2_P7_AUTOMATION_EXECUTION_EVIDENCE_CANDIDATE_V1_SCHEMA_VERSION,
    id: ARENA_V2_P7_AUTOMATION_SUITE_DIRECTORY_CANDIDATE_V1_ID,
    suites: SUITES,
  });
  return cloneFrozenData(definition, 'Arena V2 P7 automation suite directory V1');
}

function suiteDirectoryIdentityHash(): string {
  return createDeterministicDataHash(
    createArenaV2P7AutomationSuiteDirectoryCandidateV1(),
    'Arena V2 P7 automation suite directory identity V1',
  );
}

function nullableSha256(value: unknown, name: string): string | null {
  return value === null ? null : assertEvidenceSha256(value, name);
}

function receiptStatus(value: unknown, name: string): ArenaV2P7AutomationSuiteReceiptStatusCandidateV1 {
  if (typeof value !== 'string' || !RECEIPT_STATUSES.has(
    value as ArenaV2P7AutomationSuiteReceiptStatusCandidateV1,
  )) throw new RangeError(`${name}必须是not-run、failed或passed。`);
  return value as ArenaV2P7AutomationSuiteReceiptStatusCandidateV1;
}

interface ExpectedExecutionIdentity {
  readonly sourceCommit: string;
  readonly contentIdentityHash: string;
  readonly preregistrationIdentityHash: string;
  readonly evaluationIdentityHash: string;
  readonly packageJsonSha256: string;
  readonly packageLockSha256: string;
  readonly toolchainIdentityHash: string;
  readonly toolchainIdentitySha256: string;
  readonly runOrdinal: number;
  readonly attempt: number;
}

function normalizeReceipt(
  value: unknown,
  suite: Readonly<ArenaV2P7AutomationSuiteDefinitionCandidateV1>,
  expected: Readonly<ExpectedExecutionIdentity>,
) {
  exactRecord(value, RECEIPT_KEYS, `P7 automation receipt ${suite.suiteId}`);
  if (value.suiteId !== suite.suiteId) {
    throw new RangeError(`P7 automation receipt顺序或suiteId漂移：${suite.suiteId}。`);
  }
  if (value.commandDefinitionHash !== suite.commandDefinitionHash) {
    throw new RangeError(`P7 automation receipt ${suite.suiteId}命令Definition漂移。`);
  }
  const status = receiptStatus(value.status, `receipt ${suite.suiteId}.status`);
  const runOrdinal = positiveSafeInteger(value.runOrdinal, `receipt ${suite.suiteId}.runOrdinal`);
  const attempt = positiveSafeInteger(value.attempt, `receipt ${suite.suiteId}.attempt`);
  const sourceCommit = assertEvidenceGitCommit(value.sourceCommit, `receipt ${suite.suiteId}.sourceCommit`);
  const receiptContentIdentityHash = contentHash(
    value.contentIdentityHash,
    `receipt ${suite.suiteId}.contentIdentityHash`,
  );
  const receiptPreregistrationIdentityHash = contentHash(
    value.preregistrationIdentityHash,
    `receipt ${suite.suiteId}.preregistrationIdentityHash`,
  );
  const receiptEvaluationIdentityHash = contentHash(
    value.evaluationIdentityHash,
    `receipt ${suite.suiteId}.evaluationIdentityHash`,
  );
  const packageJsonSha256 = assertEvidenceSha256(
    value.packageJsonSha256,
    `receipt ${suite.suiteId}.packageJsonSha256`,
  );
  const packageLockSha256 = assertEvidenceSha256(
    value.packageLockSha256,
    `receipt ${suite.suiteId}.packageLockSha256`,
  );
  const receiptToolchainIdentityHash = contentHash(
    value.toolchainIdentityHash,
    `receipt ${suite.suiteId}.toolchainIdentityHash`,
  );
  const receiptToolchainIdentitySha256 = assertEvidenceSha256(
    value.toolchainIdentitySha256,
    `receipt ${suite.suiteId}.toolchainIdentitySha256`,
  );
  if (
    sourceCommit !== expected.sourceCommit
    || receiptContentIdentityHash !== expected.contentIdentityHash
    || receiptPreregistrationIdentityHash !== expected.preregistrationIdentityHash
    || receiptEvaluationIdentityHash !== expected.evaluationIdentityHash
    || packageJsonSha256 !== expected.packageJsonSha256
    || packageLockSha256 !== expected.packageLockSha256
    || receiptToolchainIdentityHash !== expected.toolchainIdentityHash
    || receiptToolchainIdentitySha256 !== expected.toolchainIdentitySha256
    || runOrdinal !== expected.runOrdinal
    || attempt !== expected.attempt
  ) throw new RangeError(`P7 automation receipt ${suite.suiteId}执行身份发生混用。`);

  let exitCode: number | null = null;
  if (value.exitCode !== null) {
    exitCode = assertIntegerAtLeast(value.exitCode, 0, `receipt ${suite.suiteId}.exitCode`);
    if (!Number.isSafeInteger(exitCode) || exitCode > 255) {
      throw new RangeError(`receipt ${suite.suiteId}.exitCode必须是0到255安全整数。`);
    }
  }
  const stdoutSha256 = nullableSha256(value.stdoutSha256, `receipt ${suite.suiteId}.stdoutSha256`);
  const stderrSha256 = nullableSha256(value.stderrSha256, `receipt ${suite.suiteId}.stderrSha256`);
  const aggregateOutputSha256 = nullableSha256(
    value.aggregateOutputSha256,
    `receipt ${suite.suiteId}.aggregateOutputSha256`,
  );
  const evidenceSha256 = nullableSha256(value.evidenceSha256, `receipt ${suite.suiteId}.evidenceSha256`);
  if (status === 'not-run') {
    if (
      exitCode !== null
      || stdoutSha256 !== null
      || stderrSha256 !== null
      || aggregateOutputSha256 !== null
      || evidenceSha256 !== null
    ) throw new RangeError(`P7 automation receipt ${suite.suiteId}未运行时不得携带执行结果。`);
  } else {
    if (exitCode === null || evidenceSha256 === null) {
      throw new RangeError(`P7 automation receipt ${suite.suiteId}已运行时缺少exit/evidence闭包。`);
    }
    if (
      stdoutSha256 === null
      && stderrSha256 === null
      && aggregateOutputSha256 === null
    ) throw new RangeError(`P7 automation receipt ${suite.suiteId}缺少输出artifact SHA。`);
    if (status === 'passed' ? exitCode !== 0 : exitCode === 0) {
      throw new RangeError(`P7 automation receipt ${suite.suiteId}状态与exitCode矛盾。`);
    }
  }
  return Object.freeze({
    suiteId: suite.suiteId,
    status,
    runOrdinal,
    attempt,
    commandDefinitionHash: suite.commandDefinitionHash,
    sourceCommit,
    contentIdentityHash: receiptContentIdentityHash,
    preregistrationIdentityHash: receiptPreregistrationIdentityHash,
    evaluationIdentityHash: receiptEvaluationIdentityHash,
    packageJsonSha256,
    packageLockSha256,
    toolchainIdentityHash: receiptToolchainIdentityHash,
    toolchainIdentitySha256: receiptToolchainIdentitySha256,
    exitCode,
    stdoutSha256,
    stderrSha256,
    aggregateOutputSha256,
    evidenceSha256,
  });
}

function aggregateStatus(
  receipts: readonly Readonly<{ status: ArenaV2P7AutomationSuiteReceiptStatusCandidateV1 }>[],
): ArenaV2P7AutomationExecutionStatusCandidateV1 {
  if (receipts.some(({ status }) => status === 'failed')) return 'failed';
  if (receipts.some(({ status }) => status === 'not-run')) return 'incomplete';
  return 'passed';
}

/** Creates a canonical receipt manifest; it never executes a command. */
export function createArenaV2P7AutomationExecutionEvidenceCandidateV1(value: unknown) {
  const source = cloneFrozenData(value, 'Arena V2 P7 automation execution evidence options');
  exactRecord(source, OPTION_KEYS, 'Arena V2 P7 automation execution evidence options');
  const sourceCommit = assertEvidenceGitCommit(source.sourceCommit, 'P7 automation sourceCommit');
  if (source.sourceDirty !== false) throw new Error('P7 automation evidence只接受clean source。');
  const contentIdentityHash = contentHash(source.contentIdentityHash, 'P7 automation contentIdentityHash');
  const preregistrationIdentityHash = contentHash(
    source.preregistrationIdentityHash,
    'P7 automation preregistrationIdentityHash',
  );
  const evaluationIdentityHash = contentHash(
    source.evaluationIdentityHash,
    'P7 automation evaluationIdentityHash',
  );
  const packageJsonSha256 = assertEvidenceSha256(source.packageJsonSha256, 'P7 automation packageJsonSha256');
  const packageLockSha256 = assertEvidenceSha256(source.packageLockSha256, 'P7 automation packageLockSha256');
  const toolchain = normalizeToolchain(source.toolchain);
  const toolchainIdentityHash = createArenaV2P7AutomationToolchainIdentityHashCandidateV1(toolchain);
  const toolchainIdentitySha256 = assertEvidenceSha256(
    source.toolchainIdentitySha256,
    'P7 automation toolchainIdentitySha256',
  );
  const runOrdinal = positiveSafeInteger(source.runOrdinal, 'P7 automation runOrdinal');
  const attempt = positiveSafeInteger(source.attempt, 'P7 automation attempt');
  const receiptValues = source.receipts;
  if (!Array.isArray(receiptValues) || receiptValues.length !== SUITES.length) {
    throw new RangeError(`P7 automation receipts必须精确覆盖${SUITES.length}项。`);
  }
  for (let index = 0; index < receiptValues.length; index += 1) {
    if (!Object.hasOwn(receiptValues, index)) throw new RangeError('P7 automation receipts不得稀疏。');
  }
  const expectedIdentity = Object.freeze({
    sourceCommit,
    sourceDirty: false as const,
    contentIdentityHash,
    preregistrationIdentityHash,
    evaluationIdentityHash,
    packageJsonSha256,
    packageLockSha256,
    toolchainIdentityHash,
    toolchainIdentitySha256,
    runOrdinal,
    attempt,
  });
  const receipts = Object.freeze(SUITES.map((suite, index) => (
    normalizeReceipt(receiptValues[index], suite, expectedIdentity)
  )));
  const ids = new Set(receipts.map(({ suiteId }) => suiteId));
  const commandHashes = new Set(receipts.map(({ commandDefinitionHash }) => commandDefinitionHash));
  const evidenceHashes = receipts
    .map(({ evidenceSha256 }) => evidenceSha256)
    .filter((entry): entry is string => entry !== null);
  if (ids.size !== receipts.length || commandHashes.size !== receipts.length) {
    throw new RangeError('P7 automation receipts suite/command identity必须唯一。');
  }
  if (new Set(evidenceHashes).size !== evidenceHashes.length) {
    throw new RangeError('P7 automation已运行receipt evidence SHA必须唯一。');
  }
  const automationStatus = aggregateStatus(receipts);
  const definition = createArenaV2P7AutomationSuiteDirectoryCandidateV1();
  const core = Object.freeze({
    schemaVersion: ARENA_V2_P7_AUTOMATION_EXECUTION_EVIDENCE_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    defaultReleaseBundleWired: false as const,
    validationStatus: 'not-run' as const,
    definition,
    definitionIdentityHash: suiteDirectoryIdentityHash(),
    ...expectedIdentity,
    toolchain,
    receipts,
    automationStatus,
    hardGate: automationStatus === 'passed' ? 'PASS' as const
      : automationStatus === 'failed' ? 'FAIL' as const : 'INCOMPLETE' as const,
  });
  return Object.freeze({
    ...core,
    manifestIdentityHash: createDeterministicDataHash(
      core,
      'Arena V2 P7 automation execution evidence manifest V1',
    ),
  });
}

export type ArenaV2P7AutomationExecutionEvidenceCandidateV1 = ReturnType<
  typeof createArenaV2P7AutomationExecutionEvidenceCandidateV1
>;

/** Rebuilds a stored manifest and rejects self-reported status or command drift. */
export function validateArenaV2P7AutomationExecutionEvidenceCandidateV1(
  value: unknown,
): ArenaV2P7AutomationExecutionEvidenceCandidateV1 {
  const source = cloneFrozenData(value, 'Arena V2 P7 stored automation evidence');
  exactRecord(source, STORED_MANIFEST_KEYS, 'Arena V2 P7 stored automation evidence');
  const canonical = createArenaV2P7AutomationExecutionEvidenceCandidateV1({
    sourceCommit: source.sourceCommit,
    sourceDirty: source.sourceDirty,
    contentIdentityHash: source.contentIdentityHash,
    preregistrationIdentityHash: source.preregistrationIdentityHash,
    evaluationIdentityHash: source.evaluationIdentityHash,
    packageJsonSha256: source.packageJsonSha256,
    packageLockSha256: source.packageLockSha256,
    toolchain: source.toolchain,
    toolchainIdentitySha256: source.toolchainIdentitySha256,
    runOrdinal: source.runOrdinal,
    attempt: source.attempt,
    receipts: source.receipts,
  });
  if (
    source.manifestIdentityHash !== canonical.manifestIdentityHash
    || createDeterministicDataHash(
      source,
      'Arena V2 P7 stored automation evidence comparison',
    ) !== createDeterministicDataHash(
      canonical,
      'Arena V2 P7 stored automation evidence comparison',
    )
  ) throw new RangeError('Arena V2 P7 stored automation evidence身份或状态发生漂移。');
  return canonical;
}

export const ARENA_V2_P7_AUTOMATION_EXECUTION_EVIDENCE_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  currentGate: 'incomplete' as const,
  hardGate: false as const,
  defaultReleaseBundleWired: false as const,
  validationStatus: 'not-run' as const,
  executesCommands: false as const,
  suiteCount: SUITES.length,
  suiteDirectoryIdentityHash: suiteDirectoryIdentityHash(),
  futureProducerWired: false as const,
  stageReportWired: false as const,
  defaultEntryWired: false as const,
});
