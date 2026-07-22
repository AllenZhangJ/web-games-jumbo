import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceBoundedString,
  assertEvidenceSha256,
  assertEvidenceUtcInstant,
} from '@number-strategy-jump/arena-evidence-contracts';
import {
  createHumanMatchStudyAssignment,
  validateHumanMatchStudyAssignment,
  type HumanMatchStudyAssignment,
} from './human-match-study-assignment.js';
import {
  createHumanMatchStudyDefinition,
  type HumanMatchStudyDefinition,
} from './human-match-study-definition.js';
import {
  HUMAN_MATCH_STUDY_STATUS,
  HUMAN_MATCH_STUDY_TERMINATION_REASON,
  createHumanMatchStudySubmission,
  type HumanMatchStudyEligibility,
  type HumanMatchStudyObservedEnvironment,
  type HumanMatchStudyStatus,
  type HumanMatchStudyTerminationReason,
} from './human-match-study-record.js';

export const HUMAN_MATCH_STUDY_WORKSPACE_SCHEMA_VERSION = 1;
export const HUMAN_MATCH_STUDY_CHECKPOINT_SCHEMA_VERSION = 1;
export const HUMAN_MATCH_STUDY_RECEIPT_SCHEMA_VERSION = 1;

export const HUMAN_MATCH_STUDY_CHECKPOINT_PHASE = Object.freeze({
  ENROLLED: 'enrolled',
  RUNNING: 'running',
  REVIEWING: 'reviewing',
  RECOVERY_REQUIRED: 'recovery-required',
  EXPORT_PENDING: 'export-pending',
} as const);

export type HumanMatchStudyCheckpointPhase = typeof HUMAN_MATCH_STUDY_CHECKPOINT_PHASE[
  keyof typeof HUMAN_MATCH_STUDY_CHECKPOINT_PHASE
];

export interface HumanMatchStudyPackageReceipt {
  readonly packageId: string;
  readonly fileName: string;
  readonly sha256: string;
  readonly byteLength: number;
}

export interface HumanMatchStudyCheckpoint {
  readonly schemaVersion: 1;
  readonly trialId: string;
  readonly assignment: HumanMatchStudyAssignment;
  readonly commit: string;
  readonly buildId: string;
  readonly performedAt: string;
  readonly operatorId: string;
  readonly environment: HumanMatchStudyObservedEnvironment;
  readonly eligibility: HumanMatchStudyEligibility;
  readonly phase: HumanMatchStudyCheckpointPhase;
  readonly completedMatchCount: number;
  readonly terminalStatus: HumanMatchStudyStatus | null;
  readonly terminationReason: HumanMatchStudyTerminationReason | null;
  readonly packageReceipt: HumanMatchStudyPackageReceipt | null;
}

export interface HumanMatchStudyReceipt {
  readonly schemaVersion: 1;
  readonly trialId: string;
  readonly assignment: HumanMatchStudyAssignment;
  readonly status: HumanMatchStudyStatus;
  readonly terminationReason: HumanMatchStudyTerminationReason;
  readonly packageReceipt: HumanMatchStudyPackageReceipt;
  readonly confirmedAt: string;
}

export interface HumanMatchStudyWorkspace {
  readonly schemaVersion: 1;
  readonly definitionId: string;
  readonly definitionHash: string;
  readonly revision: number;
  readonly activeTrial: HumanMatchStudyCheckpoint | null;
  readonly receipts: readonly HumanMatchStudyReceipt[];
}

const WORKSPACE_KEYS = new Set([
  'schemaVersion', 'definitionId', 'definitionHash', 'revision', 'activeTrial', 'receipts',
]);
const CHECKPOINT_KEYS = new Set([
  'schemaVersion', 'trialId', 'assignment', 'commit', 'buildId', 'performedAt',
  'operatorId', 'environment', 'eligibility', 'phase', 'completedMatchCount',
  'terminalStatus', 'terminationReason', 'packageReceipt',
]);
const RECEIPT_KEYS = new Set([
  'schemaVersion', 'trialId', 'assignment', 'status', 'terminationReason',
  'packageReceipt', 'confirmedAt',
]);
const PACKAGE_RECEIPT_KEYS = new Set(['packageId', 'fileName', 'sha256', 'byteLength']);
const ENROLLMENT_KEYS = new Set([
  'participantId', 'trialId', 'commit', 'buildId', 'performedAt', 'operatorId',
  'environment', 'eligibility', 'enrollmentIndex',
]);
const ADVANCE_KEYS = new Set(['activeTrial', 'receipts']);

function boundedString(value: unknown, maximumLength: number, name: string): string {
  const text = assertNonEmptyString(value, name);
  if (text.length > maximumLength) throw new RangeError(`${name} 过长。`);
  return text;
}

function enumValue<T extends string>(
  value: unknown,
  values: Readonly<Record<string, T>>,
  name: string,
): T {
  const knownValues = Object.values(values) as readonly T[];
  if (typeof value !== 'string' || !knownValues.includes(value as T)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value as T;
}

function validatePackageReceipt(
  value: unknown,
  name: string,
): HumanMatchStudyPackageReceipt | null {
  if (value === null) return null;
  assertKnownKeys(value, PACKAGE_RECEIPT_KEYS, name);
  const fileName = assertEvidenceBoundedString(value.fileName, 192, `${name}.fileName`, {
    rejectControlCharacters: true,
  });
  if (
    fileName.includes('/')
    || fileName.includes('\\')
    || fileName === '.'
    || fileName === '..'
  ) throw new RangeError(`${name}.fileName 必须是单一安全文件名。`);
  return Object.freeze({
    packageId: boundedString(value.packageId, 128, `${name}.packageId`),
    fileName,
    sha256: assertEvidenceSha256(value.sha256, `${name}.sha256`),
    byteLength: assertIntegerAtLeast(value.byteLength, 1, `${name}.byteLength`),
  });
}

function checkpointSubmission(
  definition: HumanMatchStudyDefinition,
  source: PlainRecord,
  options: Readonly<{
    status: HumanMatchStudyStatus;
    terminationReason: HumanMatchStudyTerminationReason;
  }> = {
    status: HUMAN_MATCH_STUDY_STATUS.INVALIDATED,
    terminationReason: HUMAN_MATCH_STUDY_TERMINATION_REASON.RUNTIME_FAILED,
  },
) {
  return createHumanMatchStudySubmission(definition, {
    recordId: source.trialId,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: source.commit,
    buildId: source.buildId,
    performedAt: source.performedAt,
    operatorId: source.operatorId,
    assignment: source.assignment,
    status: options.status,
    terminationReason: options.terminationReason,
    environment: source.environment,
    eligibility: source.eligibility,
    selfReport: options.status === HUMAN_MATCH_STUDY_STATUS.COMPLETED
      ? {
          opponentTypeGuess: 'unsure',
          fairnessRating: 3,
          naturalnessRating: 3,
          wouldRematch: false,
        }
      : null,
  });
}

export function createHumanMatchStudyCheckpoint(
  definitionValue: unknown,
  value: unknown,
): HumanMatchStudyCheckpoint {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const source = cloneFrozenData(value, 'HumanMatchStudyCheckpoint');
  assertKnownKeys(source, CHECKPOINT_KEYS, 'HumanMatchStudyCheckpoint');
  if (source.schemaVersion !== HUMAN_MATCH_STUDY_CHECKPOINT_SCHEMA_VERSION) {
    throw new RangeError(`不支持 HumanMatchStudyCheckpoint schema ${String(source.schemaVersion)}。`);
  }
  const phase = enumValue(
    source.phase,
    HUMAN_MATCH_STUDY_CHECKPOINT_PHASE,
    'HumanMatchStudyCheckpoint.phase',
  );
  const completedMatchCount = assertIntegerAtLeast(
    source.completedMatchCount,
    0,
    'HumanMatchStudyCheckpoint.completedMatchCount',
  );
  if (completedMatchCount > definition.matchesPerParticipant) {
    throw new RangeError('HumanMatchStudyCheckpoint.completedMatchCount 超过预注册局数。');
  }
  const hasTerminal = source.terminalStatus !== null || source.terminationReason !== null;
  if ((source.terminalStatus === null) !== (source.terminationReason === null)) {
    throw new RangeError('HumanMatchStudyCheckpoint terminal status/reason 必须同时存在。');
  }
  let terminalStatus: HumanMatchStudyStatus | null = null;
  let terminationReason: HumanMatchStudyTerminationReason | null = null;
  if (hasTerminal) {
    const status = enumValue(
      source.terminalStatus,
      HUMAN_MATCH_STUDY_STATUS,
      'HumanMatchStudyCheckpoint.terminalStatus',
    );
    const reason = enumValue(
      source.terminationReason,
      HUMAN_MATCH_STUDY_TERMINATION_REASON,
      'HumanMatchStudyCheckpoint.terminationReason',
    );
    const submission = checkpointSubmission(definition, source, {
      status,
      terminationReason: reason,
    });
    terminalStatus = submission.status;
    terminationReason = submission.terminationReason;
  }
  const packageReceipt = validatePackageReceipt(
    source.packageReceipt,
    'HumanMatchStudyCheckpoint.packageReceipt',
  );
  if (phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.ENROLLED && completedMatchCount !== 0) {
    throw new RangeError('enrolled checkpoint 不能已有完成比赛。');
  }
  if (
    phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RECOVERY_REQUIRED
    && (
      terminalStatus !== HUMAN_MATCH_STUDY_STATUS.INVALIDATED
      || terminationReason !== HUMAN_MATCH_STUDY_TERMINATION_REASON.RUNNING_RECOVERED
      || completedMatchCount !== 0
    )
  ) throw new RangeError('recovery-required checkpoint 必须是零局 running-recovered 作废。');
  if (
    phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.EXPORT_PENDING
    && (!hasTerminal || packageReceipt === null)
  ) throw new RangeError('export-pending checkpoint 必须包含终态与 package receipt。');
  if (phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.REVIEWING && !hasTerminal) {
    throw new RangeError('reviewing checkpoint 必须包含预期终态。');
  }
  if (phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.EXPORT_PENDING && packageReceipt !== null) {
    throw new RangeError(`${phase} checkpoint 不能包含 package receipt。`);
  }
  if (
    (phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.ENROLLED
      || phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING)
    && hasTerminal
  ) throw new RangeError(`${phase} checkpoint 不能预写终态。`);
  if (
    terminalStatus === HUMAN_MATCH_STUDY_STATUS.COMPLETED
    && completedMatchCount !== definition.matchesPerParticipant
  ) throw new RangeError('completed checkpoint 必须包含全部预注册比赛。');
  const submission = checkpointSubmission(definition, source);
  return Object.freeze({
    schemaVersion: HUMAN_MATCH_STUDY_CHECKPOINT_SCHEMA_VERSION,
    trialId: boundedString(source.trialId, 128, 'HumanMatchStudyCheckpoint.trialId'),
    assignment: submission.assignment,
    commit: submission.commit,
    buildId: submission.buildId,
    performedAt: submission.performedAt,
    operatorId: submission.operatorId,
    environment: submission.environment,
    eligibility: submission.eligibility,
    phase,
    completedMatchCount,
    terminalStatus,
    terminationReason,
    packageReceipt,
  });
}

export function createHumanMatchStudyReceipt(
  definitionValue: unknown,
  checkpointValue: unknown,
  confirmedAtValue: unknown,
): HumanMatchStudyReceipt {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const checkpoint = createHumanMatchStudyCheckpoint(definition, checkpointValue);
  if (
    checkpoint.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.EXPORT_PENDING
    || checkpoint.packageReceipt === null
    || checkpoint.terminalStatus === null
    || checkpoint.terminationReason === null
  ) throw new RangeError('只有 export-pending checkpoint 可以确认归档。');
  const confirmedAt = assertEvidenceUtcInstant(
    confirmedAtValue,
    'HumanMatchStudyReceipt.confirmedAt',
  );
  if (confirmedAt < checkpoint.performedAt) {
    throw new RangeError('HumanMatchStudyReceipt.confirmedAt 不能早于参与者入组。');
  }
  return Object.freeze({
    schemaVersion: HUMAN_MATCH_STUDY_RECEIPT_SCHEMA_VERSION,
    trialId: checkpoint.trialId,
    assignment: checkpoint.assignment,
    status: checkpoint.terminalStatus,
    terminationReason: checkpoint.terminationReason,
    packageReceipt: checkpoint.packageReceipt,
    confirmedAt,
  });
}

export function validateHumanMatchStudyReceipt(
  definitionValue: unknown,
  value: unknown,
): HumanMatchStudyReceipt {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const source = cloneFrozenData(value, 'HumanMatchStudyReceipt');
  assertKnownKeys(source, RECEIPT_KEYS, 'HumanMatchStudyReceipt');
  if (source.schemaVersion !== HUMAN_MATCH_STUDY_RECEIPT_SCHEMA_VERSION) {
    throw new RangeError(`不支持 HumanMatchStudyReceipt schema ${String(source.schemaVersion)}。`);
  }
  const assignment = validateHumanMatchStudyAssignment(definition, source.assignment);
  const status = enumValue(source.status, HUMAN_MATCH_STUDY_STATUS, 'HumanMatchStudyReceipt.status');
  const terminationReason = enumValue(
    source.terminationReason,
    HUMAN_MATCH_STUDY_TERMINATION_REASON,
    'HumanMatchStudyReceipt.terminationReason',
  );
  checkpointSubmission(definition, {
    trialId: source.trialId,
    assignment,
    commit: '0'.repeat(40),
    buildId: 'receipt-validation',
    performedAt: '1970-01-01T00:00:00.000Z',
    operatorId: 'receipt-validation',
    environment: definition.environment,
    eligibility: {
      consentConfirmed: false,
      priorArenaExperience: false,
      priorStudyExposure: false,
      briefingDeviation: false,
      operatorAssistance: false,
    },
  }, { status, terminationReason });
  const packageReceipt = validatePackageReceipt(
    source.packageReceipt,
    'HumanMatchStudyReceipt.packageReceipt',
  );
  if (packageReceipt === null) {
    throw new RangeError('HumanMatchStudyReceipt.packageReceipt 不能为空。');
  }
  return Object.freeze({
    schemaVersion: HUMAN_MATCH_STUDY_RECEIPT_SCHEMA_VERSION,
    trialId: boundedString(source.trialId, 128, 'HumanMatchStudyReceipt.trialId'),
    assignment,
    status,
    terminationReason,
    packageReceipt,
    confirmedAt: assertEvidenceUtcInstant(source.confirmedAt, 'HumanMatchStudyReceipt.confirmedAt'),
  });
}

function validateCoverage(
  activeTrial: HumanMatchStudyCheckpoint | null,
  receipts: readonly HumanMatchStudyReceipt[],
): void {
  receipts.forEach((receipt, enrollmentIndex) => {
    if (receipt.assignment.enrollmentIndex !== enrollmentIndex) {
      throw new RangeError(`HumanMatchStudyWorkspace 缺少 enrollment ${enrollmentIndex}。`);
    }
  });
  if (activeTrial !== null && activeTrial.assignment.enrollmentIndex !== receipts.length) {
    throw new RangeError('HumanMatchStudyWorkspace activeTrial enrollment 不连续。');
  }
  const participantIds = new Set<string>();
  const trialIds = new Set<string>();
  const packageIds = new Set<string>();
  const packageHashes = new Set<string>();
  const entries = [
    ...receipts.map((receipt) => ({
      assignment: receipt.assignment,
      trialId: receipt.trialId,
      packageReceipt: receipt.packageReceipt,
    })),
    ...(activeTrial === null ? [] : [{
      assignment: activeTrial.assignment,
      trialId: activeTrial.trialId,
      packageReceipt: activeTrial.packageReceipt,
    }]),
  ];
  for (const { assignment, trialId, packageReceipt } of entries) {
    if (participantIds.has(assignment.participantId)) {
      throw new RangeError(`重复 Study participantId ${assignment.participantId}。`);
    }
    participantIds.add(assignment.participantId);
    if (trialIds.has(trialId)) throw new RangeError(`重复 Study trialId ${trialId}。`);
    trialIds.add(trialId);
    if (packageReceipt === null) continue;
    if (packageIds.has(packageReceipt.packageId)) {
      throw new RangeError(`重复 Study packageId ${packageReceipt.packageId}。`);
    }
    if (packageHashes.has(packageReceipt.sha256)) {
      throw new RangeError(`重复 Study package SHA-256 ${packageReceipt.sha256}。`);
    }
    packageIds.add(packageReceipt.packageId);
    packageHashes.add(packageReceipt.sha256);
  }
}

export function createHumanMatchStudyWorkspace(
  definitionValue: unknown,
  value: unknown = null,
): HumanMatchStudyWorkspace {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  if (value === null || value === undefined) {
    return Object.freeze({
      schemaVersion: HUMAN_MATCH_STUDY_WORKSPACE_SCHEMA_VERSION,
      definitionId: definition.id,
      definitionHash: definition.getContentHash(),
      revision: 0,
      activeTrial: null,
      receipts: Object.freeze([]),
    });
  }
  const source = cloneFrozenData(value, 'HumanMatchStudyWorkspace');
  assertKnownKeys(source, WORKSPACE_KEYS, 'HumanMatchStudyWorkspace');
  if (source.schemaVersion !== HUMAN_MATCH_STUDY_WORKSPACE_SCHEMA_VERSION) {
    throw new RangeError(`不支持 HumanMatchStudyWorkspace schema ${String(source.schemaVersion)}。`);
  }
  if (
    source.definitionId !== definition.id
    || source.definitionHash !== definition.getContentHash()
  ) throw new RangeError('HumanMatchStudyWorkspace 与当前 Definition 身份不一致。');
  const activeTrial = source.activeTrial === null
    ? null
    : createHumanMatchStudyCheckpoint(definition, source.activeTrial);
  if (!Array.isArray(source.receipts)) {
    throw new TypeError('HumanMatchStudyWorkspace.receipts 必须是数组。');
  }
  const receipts = Object.freeze(source.receipts.map((receipt) => (
    validateHumanMatchStudyReceipt(definition, receipt)
  )));
  validateCoverage(activeTrial, receipts);
  const revision = assertIntegerAtLeast(source.revision, 0, 'HumanMatchStudyWorkspace.revision');
  const minimumRevision = receipts.length + (activeTrial === null ? 0 : 1);
  if (revision < minimumRevision) {
    throw new RangeError('HumanMatchStudyWorkspace.revision 小于已覆盖 enrollment 数。');
  }
  return Object.freeze({
    schemaVersion: HUMAN_MATCH_STUDY_WORKSPACE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    revision,
    activeTrial,
    receipts,
  });
}

export function createEnrolledHumanMatchStudyCheckpoint(
  definitionValue: unknown,
  optionsValue: unknown,
): HumanMatchStudyCheckpoint {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const options = cloneFrozenData(optionsValue, 'HumanMatchStudy enrollment options');
  assertKnownKeys(options, ENROLLMENT_KEYS, 'HumanMatchStudy enrollment options');
  return createHumanMatchStudyCheckpoint(definition, {
    schemaVersion: HUMAN_MATCH_STUDY_CHECKPOINT_SCHEMA_VERSION,
    trialId: options.trialId,
    assignment: createHumanMatchStudyAssignment({
      definition,
      participantId: options.participantId,
      enrollmentIndex: options.enrollmentIndex,
    }),
    commit: options.commit,
    buildId: options.buildId,
    performedAt: options.performedAt,
    operatorId: options.operatorId,
    environment: options.environment,
    eligibility: options.eligibility,
    phase: HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.ENROLLED,
    completedMatchCount: 0,
    terminalStatus: null,
    terminationReason: null,
    packageReceipt: null,
  });
}

export function advanceHumanMatchStudyWorkspace(
  definitionValue: unknown,
  currentValue: unknown,
  optionsValue: unknown,
): HumanMatchStudyWorkspace {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const current = createHumanMatchStudyWorkspace(definition, currentValue);
  const options = cloneFrozenData(optionsValue, 'HumanMatchStudy workspace advance options');
  assertKnownKeys(options, ADVANCE_KEYS, 'HumanMatchStudy workspace advance options');
  return createHumanMatchStudyWorkspace(definition, {
    ...current,
    revision: current.revision + 1,
    activeTrial: options.activeTrial,
    receipts: options.receipts,
  });
}
