import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertSynchronousReturn,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  validateArenaModeVerificationPlanV1,
  type ArenaModeVerificationCaseV1,
  type ArenaModeVerificationPlanV1,
} from './arena-mode-verification-plan-v1.js';

export const ARENA_MODE_VERIFICATION_RUNNER_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_MODE_VERIFICATION_RUNNER_V1_CANDIDATE_STATUS = 'production-unreachable' as const;

export interface ArenaModeVerificationRunRequestV1 {
  readonly caseId: string;
  readonly profile: ArenaModeVerificationCaseV1['profile'];
  readonly modeKind: ArenaModeVerificationCaseV1['modeKind'];
  readonly modeDefinitionId: string;
  readonly fixtureDefinitionId: string | null;
  readonly participantCount: number;
  readonly enemySlotCount: number;
  readonly matchSeed: number;
  readonly runnerTickBudget: number;
  readonly rematchCount: number;
}

export interface ArenaModeVerificationRunOutputV1 {
  readonly executedTicks: number;
  readonly maximumTicksPerMatch: number;
  readonly completedRematches: number;
  readonly authorityHash: string;
  readonly replayIdentityHash: string;
  readonly checkpointSequenceHash: string;
  readonly modeResultHash: string;
  readonly finalHash: string;
}

export interface ArenaModeVerificationRuntimeV1 {
  readonly run: () => unknown;
  readonly destroy: () => unknown;
  readonly getRetainedResourceCount: () => unknown;
}

export type ArenaModeVerificationRuntimeFactoryV1 = (
  request: Readonly<ArenaModeVerificationRunRequestV1>,
) => unknown;

export interface ArenaModeVerificationSeedReportV1 {
  readonly matchSeed: number;
  readonly executedTicks: number;
  readonly maximumTicksPerMatch: number;
  readonly completedRematches: number;
  readonly authorityHash: string;
  readonly replayIdentityHash: string;
  readonly checkpointSequenceHash: string;
  readonly modeResultHash: string;
  readonly finalHash: string;
  readonly deterministicIdentityHash: string;
}

export interface ArenaModeVerificationCaseReportV1 {
  readonly caseId: string;
  readonly profile: ArenaModeVerificationCaseV1['profile'];
  readonly modeKind: ArenaModeVerificationCaseV1['modeKind'];
  readonly seedReports: readonly Readonly<ArenaModeVerificationSeedReportV1>[];
  readonly resultHash: string;
}

export interface ArenaModeVerificationReportV1 {
  readonly schemaVersion: typeof ARENA_MODE_VERIFICATION_RUNNER_V1_SCHEMA_VERSION;
  readonly candidateStatus: typeof ARENA_MODE_VERIFICATION_RUNNER_V1_CANDIDATE_STATUS;
  readonly planId: string;
  readonly planResultHash: string;
  readonly sourceCommit: string;
  readonly caseReports: readonly Readonly<ArenaModeVerificationCaseReportV1>[];
  readonly resultHash: string;
}

const RUNTIME_KEYS: ReadonlySet<string> = new Set(['run', 'destroy', 'getRetainedResourceCount']);
const OUTPUT_KEYS: ReadonlySet<string> = new Set([
  'executedTicks',
  'maximumTicksPerMatch',
  'completedRematches',
  'authorityHash',
  'replayIdentityHash',
  'checkpointSequenceHash',
  'modeResultHash',
  'finalHash',
]);
const SEED_REPORT_KEYS: ReadonlySet<string> = new Set([
  'matchSeed',
  ...OUTPUT_KEYS,
  'deterministicIdentityHash',
]);
const CASE_REPORT_KEYS: ReadonlySet<string> = new Set([
  'caseId',
  'profile',
  'modeKind',
  'seedReports',
  'resultHash',
]);
const REPORT_KEYS: ReadonlySet<string> = new Set([
  'schemaVersion',
  'candidateStatus',
  'planId',
  'planResultHash',
  'sourceCommit',
  'caseReports',
  'resultHash',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

function safelyWrapThrownError(value: unknown, message: string): Error {
  const error = new Error(message);
  Object.defineProperty(error, 'cause', {
    value,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return error;
}

function rejectAsyncReturn(value: unknown, name: string): void {
  assertSynchronousReturn(value, name);
}

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key} 为必填字段。`);
  }
}

function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是8位小写十六进制hash。`);
  }
  return value;
}

function captureRuntime(value: unknown): ArenaModeVerificationRuntimeV1 {
  rejectAsyncReturn(value, 'ArenaModeVerification runtime factory');
  exactRecord(value, RUNTIME_KEYS, 'ArenaModeVerification runtime');
  const runDescriptor = Object.getOwnPropertyDescriptor(value, 'run');
  const destroyDescriptor = Object.getOwnPropertyDescriptor(value, 'destroy');
  const retainedDescriptor = Object.getOwnPropertyDescriptor(value, 'getRetainedResourceCount');
  if (
    !runDescriptor
    || !('value' in runDescriptor)
    || typeof runDescriptor.value !== 'function'
    || !destroyDescriptor
    || !('value' in destroyDescriptor)
    || typeof destroyDescriptor.value !== 'function'
    || !retainedDescriptor
    || !('value' in retainedDescriptor)
    || typeof retainedDescriptor.value !== 'function'
  ) {
    throw new TypeError(
      'ArenaModeVerification runtime必须使用自有数据函数run/destroy/getRetainedResourceCount。',
    );
  }
  return Object.freeze({
    run: () => Reflect.apply(runDescriptor.value as (...args: never[]) => unknown, value, []),
    destroy: () => Reflect.apply(
      destroyDescriptor.value as (...args: never[]) => unknown,
      value,
      [],
    ),
    getRetainedResourceCount: () => Reflect.apply(
      retainedDescriptor.value as (...args: never[]) => unknown,
      value,
      [],
    ),
  });
}

function destroyUncapturedRuntime(value: unknown, name: string): void {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return;
  const descriptor = Object.getOwnPropertyDescriptor(value, 'destroy');
  if (!descriptor || !('value' in descriptor) || typeof descriptor.value !== 'function') return;
  const result = Reflect.apply(
    descriptor.value as (...args: never[]) => unknown,
    value,
    [],
  );
  rejectAsyncReturn(result, `${name} destroy`);
}

function normalizeRunOutput(
  value: unknown,
  verificationCase: Readonly<ArenaModeVerificationCaseV1>,
): Readonly<ArenaModeVerificationRunOutputV1> {
  rejectAsyncReturn(value, `ArenaModeVerification ${verificationCase.id} run`);
  const source = cloneFrozenData(value, `ArenaModeVerification ${verificationCase.id} output`);
  exactRecord(source, OUTPUT_KEYS, `ArenaModeVerification ${verificationCase.id} output`);
  const executedTicks = assertIntegerAtLeast(
    source.executedTicks,
    1,
    `ArenaModeVerification ${verificationCase.id}.executedTicks`,
  );
  const maximumTicksPerMatch = assertIntegerAtLeast(
    source.maximumTicksPerMatch,
    1,
    `ArenaModeVerification ${verificationCase.id}.maximumTicksPerMatch`,
  );
  if (maximumTicksPerMatch > verificationCase.runnerTickBudget) {
    throw new RangeError(`${verificationCase.id} 单局tick超过预注册runnerTickBudget。`);
  }
  const completedRematches = assertIntegerAtLeast(
    source.completedRematches,
    1,
    `ArenaModeVerification ${verificationCase.id}.completedRematches`,
  );
  if (completedRematches !== verificationCase.rematchCount) {
    throw new RangeError(`${verificationCase.id} 未完整执行预注册rematchCount。`);
  }
  if (executedTicks < completedRematches || executedTicks < maximumTicksPerMatch) {
    throw new RangeError(`${verificationCase.id} total/max tick计数不闭合。`);
  }
  if (
    verificationCase.profile === 'long-run'
    && (
      completedRematches !== 1
      || executedTicks !== verificationCase.runnerTickBudget
      || maximumTicksPerMatch !== verificationCase.runnerTickBudget
    )
  ) {
    throw new RangeError(`${verificationCase.id} long-run必须完整执行单局预注册tick预算。`);
  }
  return Object.freeze({
    executedTicks,
    maximumTicksPerMatch,
    completedRematches,
    authorityHash: hash(source.authorityHash, `${verificationCase.id}.authorityHash`),
    replayIdentityHash: hash(
      source.replayIdentityHash,
      `${verificationCase.id}.replayIdentityHash`,
    ),
    checkpointSequenceHash: hash(
      source.checkpointSequenceHash,
      `${verificationCase.id}.checkpointSequenceHash`,
    ),
    modeResultHash: hash(source.modeResultHash, `${verificationCase.id}.modeResultHash`),
    finalHash: hash(source.finalHash, `${verificationCase.id}.finalHash`),
  });
}

function createRunRequest(
  verificationCase: Readonly<ArenaModeVerificationCaseV1>,
  matchSeed: number,
): Readonly<ArenaModeVerificationRunRequestV1> {
  return Object.freeze({
    caseId: verificationCase.id,
    profile: verificationCase.profile,
    modeKind: verificationCase.modeKind,
    modeDefinitionId: verificationCase.modeDefinitionId,
    fixtureDefinitionId: verificationCase.fixtureDefinitionId,
    participantCount: verificationCase.participantCount,
    enemySlotCount: verificationCase.enemySlotCount,
    matchSeed,
    runnerTickBudget: verificationCase.runnerTickBudget,
    rematchCount: verificationCase.rematchCount,
  });
}

function executeOnce(
  factory: ArenaModeVerificationRuntimeFactoryV1,
  request: Readonly<ArenaModeVerificationRunRequestV1>,
  verificationCase: Readonly<ArenaModeVerificationCaseV1>,
): Readonly<ArenaModeVerificationRunOutputV1> {
  let runtime: ArenaModeVerificationRuntimeV1 | null = null;
  let candidate: unknown = undefined;
  let failure: Error | null = null;
  let output: Readonly<ArenaModeVerificationRunOutputV1> | null = null;
  try {
    candidate = factory(request);
    rejectAsyncReturn(candidate, `ArenaModeVerification ${verificationCase.id} factory`);
    runtime = captureRuntime(candidate);
    output = normalizeRunOutput(runtime.run(), verificationCase);
  } catch (error: unknown) {
    failure = safelyWrapThrownError(error, `${verificationCase.id} 无渲染执行失败。`);
    if (runtime === null && candidate !== undefined) {
      try {
        destroyUncapturedRuntime(candidate, `${verificationCase.id} 未捕获runtime`);
      } catch (cleanupError: unknown) {
        failure = new AggregateError([
          failure,
          safelyWrapThrownError(
            cleanupError,
            `${verificationCase.id} 未捕获runtime清理失败。`,
          ),
        ], `${verificationCase.id} runtime捕获及清理失败。`);
      }
    }
  } finally {
    if (runtime !== null) {
      const cleanupFailures: Error[] = [];
      try {
        const destroyResult = runtime.destroy();
        rejectAsyncReturn(destroyResult, `ArenaModeVerification ${verificationCase.id} destroy`);
      } catch (error: unknown) {
        cleanupFailures.push(safelyWrapThrownError(
          error,
          `${verificationCase.id} 无渲染资源清理失败。`,
        ));
      }
      try {
        const retainedValue = runtime.getRetainedResourceCount();
        rejectAsyncReturn(
          retainedValue,
          `ArenaModeVerification ${verificationCase.id} getRetainedResourceCount`,
        );
        const retainedResourceCount = assertIntegerAtLeast(
          retainedValue,
          0,
          `${verificationCase.id}.retainedResourceCount`,
        );
        if (retainedResourceCount !== 0) {
          throw new RangeError(`${verificationCase.id} destroy后仍保留权威资源。`);
        }
      } catch (error: unknown) {
        cleanupFailures.push(safelyWrapThrownError(
          error,
          `${verificationCase.id} 无渲染资源归零复核失败。`,
        ));
      }
      if (cleanupFailures.length > 0) {
        failure = failure === null && cleanupFailures.length === 1
          ? cleanupFailures[0]!
          : new AggregateError(
              [...(failure === null ? [] : [failure]), ...cleanupFailures],
              `${verificationCase.id} 执行及清理失败。`,
            );
      }
    }
  }
  if (failure !== null) throw failure;
  if (output === null) throw new Error(`${verificationCase.id} 未产生验证输出。`);
  return output;
}

function deterministicIdentity(
  output: Readonly<ArenaModeVerificationRunOutputV1>,
): Readonly<ArenaModeVerificationRunOutputV1> {
  return Object.freeze({
    executedTicks: output.executedTicks,
    maximumTicksPerMatch: output.maximumTicksPerMatch,
    completedRematches: output.completedRematches,
    authorityHash: output.authorityHash,
    replayIdentityHash: output.replayIdentityHash,
    checkpointSequenceHash: output.checkpointSequenceHash,
    modeResultHash: output.modeResultHash,
    finalHash: output.finalHash,
  });
}

function executeSeed(
  factory: ArenaModeVerificationRuntimeFactoryV1,
  verificationCase: Readonly<ArenaModeVerificationCaseV1>,
  matchSeed: number,
): Readonly<ArenaModeVerificationSeedReportV1> {
  const request = createRunRequest(verificationCase, matchSeed);
  const first = executeOnce(factory, request, verificationCase);
  const second = executeOnce(factory, request, verificationCase);
  const firstIdentity = deterministicIdentity(first);
  const secondIdentity = deterministicIdentity(second);
  const firstHash = createDeterministicDataHash(
    firstIdentity,
    `${verificationCase.id} seed ${matchSeed} first identity`,
  );
  const secondHash = createDeterministicDataHash(
    secondIdentity,
    `${verificationCase.id} seed ${matchSeed} second identity`,
  );
  if (firstHash !== secondHash) {
    throw new RangeError(`${verificationCase.id} seed ${matchSeed} 双跑确定性漂移。`);
  }
  return Object.freeze({
    matchSeed,
    ...firstIdentity,
    deterministicIdentityHash: firstHash,
  });
}

function executeCase(
  factory: ArenaModeVerificationRuntimeFactoryV1,
  verificationCase: Readonly<ArenaModeVerificationCaseV1>,
): Readonly<ArenaModeVerificationCaseReportV1> {
  const seedReports: Readonly<ArenaModeVerificationSeedReportV1>[] = [];
  for (let offset = 0; offset < verificationCase.seedCount; offset += 1) {
    seedReports.push(executeSeed(factory, verificationCase, verificationCase.seedStart + offset));
  }
  const core = Object.freeze({
    caseId: verificationCase.id,
    profile: verificationCase.profile,
    modeKind: verificationCase.modeKind,
    seedReports: Object.freeze(seedReports),
  });
  return Object.freeze({
    ...core,
    resultHash: createDeterministicDataHash(core, `${verificationCase.id} verification report`),
  });
}

export function runArenaModeVerificationPlanV1(
  planValue: unknown,
  factory: ArenaModeVerificationRuntimeFactoryV1,
): Readonly<ArenaModeVerificationReportV1> {
  if (typeof factory !== 'function') {
    throw new TypeError('ArenaModeVerification runtime factory必须是函数。');
  }
  const plan: Readonly<ArenaModeVerificationPlanV1> = validateArenaModeVerificationPlanV1(
    planValue,
  );
  const caseReports = Object.freeze(plan.cases.map((entry) => executeCase(factory, entry)));
  const core = Object.freeze({
    schemaVersion: ARENA_MODE_VERIFICATION_RUNNER_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_MODE_VERIFICATION_RUNNER_V1_CANDIDATE_STATUS,
    planId: plan.id,
    planResultHash: plan.resultHash,
    sourceCommit: plan.sourceCommit,
    caseReports,
  });
  return cloneFrozenData({
    ...core,
    resultHash: createDeterministicDataHash(core, 'ArenaModeVerificationReportV1'),
  }, 'ArenaModeVerificationReportV1');
}

function validateSeedReport(
  value: unknown,
  verificationCase: Readonly<ArenaModeVerificationCaseV1>,
  index: number,
): Readonly<ArenaModeVerificationSeedReportV1> {
  const name = `ArenaModeVerificationReportV1 ${verificationCase.id} seedReports[${index}]`;
  exactRecord(value, SEED_REPORT_KEYS, name);
  const expectedSeed = verificationCase.seedStart + index;
  if (value.matchSeed !== expectedSeed) {
    throw new RangeError(`${name}.matchSeed 必须精确匹配预注册seed序列。`);
  }
  const output = normalizeRunOutput({
    executedTicks: value.executedTicks,
    maximumTicksPerMatch: value.maximumTicksPerMatch,
    completedRematches: value.completedRematches,
    authorityHash: value.authorityHash,
    replayIdentityHash: value.replayIdentityHash,
    checkpointSequenceHash: value.checkpointSequenceHash,
    modeResultHash: value.modeResultHash,
    finalHash: value.finalHash,
  }, verificationCase);
  const expectedIdentityHash = createDeterministicDataHash(
    deterministicIdentity(output),
    `${verificationCase.id} seed ${expectedSeed} supplied identity`,
  );
  if (
    hash(value.deterministicIdentityHash, `${name}.deterministicIdentityHash`)
    !== expectedIdentityHash
  ) {
    throw new RangeError(`${name}.deterministicIdentityHash 与重算身份不一致。`);
  }
  return Object.freeze({
    matchSeed: expectedSeed,
    ...output,
    deterministicIdentityHash: expectedIdentityHash,
  });
}

function validateCaseReport(
  value: unknown,
  verificationCase: Readonly<ArenaModeVerificationCaseV1>,
): Readonly<ArenaModeVerificationCaseReportV1> {
  const name = `ArenaModeVerificationReportV1 case ${verificationCase.id}`;
  exactRecord(value, CASE_REPORT_KEYS, name);
  if (
    value.caseId !== verificationCase.id
    || value.profile !== verificationCase.profile
    || value.modeKind !== verificationCase.modeKind
  ) {
    throw new RangeError(`${name} identity 与验证计划不一致。`);
  }
  if (!Array.isArray(value.seedReports) || value.seedReports.length !== verificationCase.seedCount) {
    throw new RangeError(`${name}.seedReports 必须精确覆盖预注册seedCount。`);
  }
  const seedReports = Object.freeze(value.seedReports.map((entry, index) => (
    validateSeedReport(entry, verificationCase, index)
  )));
  const core = Object.freeze({
    caseId: verificationCase.id,
    profile: verificationCase.profile,
    modeKind: verificationCase.modeKind,
    seedReports,
  });
  const expectedResultHash = createDeterministicDataHash(
    core,
    `${verificationCase.id} supplied verification report`,
  );
  if (hash(value.resultHash, `${name}.resultHash`) !== expectedResultHash) {
    throw new RangeError(`${name}.resultHash 与重算身份不一致。`);
  }
  return Object.freeze({ ...core, resultHash: expectedResultHash });
}

export function validateArenaModeVerificationReportV1(
  value: unknown,
  planValue: unknown,
): Readonly<ArenaModeVerificationReportV1> {
  const plan = validateArenaModeVerificationPlanV1(planValue);
  const source = cloneFrozenData(value, 'ArenaModeVerificationReportV1 supplied report');
  exactRecord(source, REPORT_KEYS, 'ArenaModeVerificationReportV1 supplied report');
  if (
    source.schemaVersion !== ARENA_MODE_VERIFICATION_RUNNER_V1_SCHEMA_VERSION
    || source.candidateStatus !== ARENA_MODE_VERIFICATION_RUNNER_V1_CANDIDATE_STATUS
    || source.planId !== plan.id
    || source.planResultHash !== plan.resultHash
    || source.sourceCommit !== plan.sourceCommit
  ) {
    throw new RangeError('ArenaModeVerificationReportV1 plan/source identity不一致。');
  }
  if (!Array.isArray(source.caseReports) || source.caseReports.length !== plan.cases.length) {
    throw new RangeError('ArenaModeVerificationReportV1 caseReports必须完整映射验证计划。');
  }
  const caseReports = Object.freeze(source.caseReports.map((entry, index) => (
    validateCaseReport(entry, plan.cases[index]!)
  )));
  const core = Object.freeze({
    schemaVersion: ARENA_MODE_VERIFICATION_RUNNER_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_MODE_VERIFICATION_RUNNER_V1_CANDIDATE_STATUS,
    planId: plan.id,
    planResultHash: plan.resultHash,
    sourceCommit: plan.sourceCommit,
    caseReports,
  });
  const expectedResultHash = createDeterministicDataHash(
    core,
    'ArenaModeVerificationReportV1 supplied report',
  );
  if (hash(source.resultHash, 'ArenaModeVerificationReportV1.resultHash') !== expectedResultHash) {
    throw new RangeError('ArenaModeVerificationReportV1.resultHash 与重算身份不一致。');
  }
  return cloneFrozenData({
    ...core,
    resultHash: expectedResultHash,
  }, 'ArenaModeVerificationReportV1');
}
