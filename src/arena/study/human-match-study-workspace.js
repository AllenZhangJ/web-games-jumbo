import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../rules/definition-utils.js';
import {
  assertEvidenceBoundedString,
  assertEvidenceSha256,
  assertEvidenceUtcInstant,
} from '../evidence/evidence-value-contract.js';
import {
  createHumanMatchStudyAssignment,
  validateHumanMatchStudyAssignment,
} from './human-match-study-assignment.js';
import { createHumanMatchStudyDefinition } from './human-match-study-definition.js';
import {
  HUMAN_MATCH_STUDY_STATUS,
  HUMAN_MATCH_STUDY_TERMINATION_REASON,
  createHumanMatchStudySubmission,
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
});

const WORKSPACE_KEYS = new Set([
  'schemaVersion',
  'definitionId',
  'definitionHash',
  'revision',
  'activeTrial',
  'receipts',
]);
const CHECKPOINT_KEYS = new Set([
  'schemaVersion',
  'trialId',
  'assignment',
  'commit',
  'buildId',
  'performedAt',
  'operatorId',
  'environment',
  'eligibility',
  'phase',
  'completedMatchCount',
  'terminalStatus',
  'terminationReason',
  'packageReceipt',
]);
const RECEIPT_KEYS = new Set([
  'schemaVersion',
  'trialId',
  'assignment',
  'status',
  'terminationReason',
  'packageReceipt',
  'confirmedAt',
]);
const PACKAGE_RECEIPT_KEYS = new Set([
  'packageId',
  'fileName',
  'sha256',
  'byteLength',
]);

function boundedString(value, maximumLength, name) {
  const text = assertNonEmptyString(value, name);
  if (text.length > maximumLength) throw new RangeError(`${name} 过长。`);
  return text;
}

function enumValue(value, values, name) {
  if (!Object.values(values).includes(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value;
}

function validatePackageReceipt(value, name) {
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

function checkpointSubmission(definition, source, {
  status = HUMAN_MATCH_STUDY_STATUS.INVALIDATED,
  terminationReason = HUMAN_MATCH_STUDY_TERMINATION_REASON.RUNTIME_FAILED,
} = {}) {
  return createHumanMatchStudySubmission(definition, {
    recordId: source.trialId,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: source.commit,
    buildId: source.buildId,
    performedAt: source.performedAt,
    operatorId: source.operatorId,
    assignment: source.assignment,
    status,
    terminationReason,
    environment: source.environment,
    eligibility: source.eligibility,
    selfReport: status === HUMAN_MATCH_STUDY_STATUS.COMPLETED
      ? {
          opponentTypeGuess: 'unsure',
          fairnessRating: 3,
          naturalnessRating: 3,
          wouldRematch: false,
        }
      : null,
  });
}

export function createHumanMatchStudyCheckpoint(definitionValue, value) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const source = cloneFrozenData(value, 'HumanMatchStudyCheckpoint');
  assertKnownKeys(source, CHECKPOINT_KEYS, 'HumanMatchStudyCheckpoint');
  if (source.schemaVersion !== HUMAN_MATCH_STUDY_CHECKPOINT_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 HumanMatchStudyCheckpoint schema ${String(source.schemaVersion)}。`,
    );
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
  let terminalStatus = null;
  let terminationReason = null;
  if (hasTerminal) {
    const submission = checkpointSubmission(definition, source, {
      status: source.terminalStatus,
      terminationReason: source.terminationReason,
    });
    terminalStatus = submission.status;
    terminationReason = submission.terminationReason;
  }
  const packageReceipt = validatePackageReceipt(
    source.packageReceipt,
    'HumanMatchStudyCheckpoint.packageReceipt',
  );
  if (
    phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.ENROLLED
    && completedMatchCount !== 0
  ) throw new RangeError('enrolled checkpoint 不能已有完成比赛。');
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
  if (
    phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.REVIEWING
    && !hasTerminal
  ) throw new RangeError('reviewing checkpoint 必须包含预期终态。');
  if (
    phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.EXPORT_PENDING
    && packageReceipt !== null
  ) throw new RangeError(`${phase} checkpoint 不能包含 package receipt。`);
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

export function createHumanMatchStudyReceipt(definitionValue, checkpointValue, confirmedAtValue) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const checkpoint = createHumanMatchStudyCheckpoint(definition, checkpointValue);
  if (
    checkpoint.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.EXPORT_PENDING
    || checkpoint.packageReceipt === null
    || checkpoint.terminalStatus === null
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

export function validateHumanMatchStudyReceipt(definitionValue, value) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const source = cloneFrozenData(value, 'HumanMatchStudyReceipt');
  assertKnownKeys(source, RECEIPT_KEYS, 'HumanMatchStudyReceipt');
  if (source.schemaVersion !== HUMAN_MATCH_STUDY_RECEIPT_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 HumanMatchStudyReceipt schema ${String(source.schemaVersion)}。`,
    );
  }
  const assignment = validateHumanMatchStudyAssignment(definition, source.assignment);
  const status = enumValue(
    source.status,
    HUMAN_MATCH_STUDY_STATUS,
    'HumanMatchStudyReceipt.status',
  );
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
    confirmedAt: assertEvidenceUtcInstant(
      source.confirmedAt,
      'HumanMatchStudyReceipt.confirmedAt',
    ),
  });
}

function validateCoverage(activeTrial, receipts) {
  receipts.forEach((receipt, enrollmentIndex) => {
    if (receipt.assignment.enrollmentIndex !== enrollmentIndex) {
      throw new RangeError(`HumanMatchStudyWorkspace 缺少 enrollment ${enrollmentIndex}。`);
    }
  });
  if (
    activeTrial !== null
    && activeTrial.assignment.enrollmentIndex !== receipts.length
  ) throw new RangeError('HumanMatchStudyWorkspace activeTrial enrollment 不连续。');
  const participantIds = new Set();
  const trialIds = new Set();
  const packageIds = new Set();
  const packageHashes = new Set();
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
    if (trialIds.has(trialId)) {
      throw new RangeError(`重复 Study trialId ${trialId}。`);
    }
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

export function createHumanMatchStudyWorkspace(definitionValue, value = null) {
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
    throw new RangeError(
      `不支持 HumanMatchStudyWorkspace schema ${String(source.schemaVersion)}。`,
    );
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
  const revision = assertIntegerAtLeast(
    source.revision,
    0,
    'HumanMatchStudyWorkspace.revision',
  );
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

export function createEnrolledHumanMatchStudyCheckpoint(definitionValue, {
  participantId,
  trialId,
  commit,
  buildId,
  performedAt,
  operatorId,
  environment,
  eligibility,
  enrollmentIndex,
}) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  return createHumanMatchStudyCheckpoint(definition, {
    schemaVersion: HUMAN_MATCH_STUDY_CHECKPOINT_SCHEMA_VERSION,
    trialId,
    assignment: createHumanMatchStudyAssignment({
      definition,
      participantId,
      enrollmentIndex,
    }),
    commit,
    buildId,
    performedAt,
    operatorId,
    environment,
    eligibility,
    phase: HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.ENROLLED,
    completedMatchCount: 0,
    terminalStatus: null,
    terminationReason: null,
    packageReceipt: null,
  });
}

export function advanceHumanMatchStudyWorkspace(definitionValue, currentValue, {
  activeTrial,
  receipts,
}) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const current = createHumanMatchStudyWorkspace(definition, currentValue);
  return createHumanMatchStudyWorkspace(definition, {
    ...current,
    revision: current.revision + 1,
    activeTrial,
    receipts,
  });
}
