import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { INPUT_PILOT_ASSIGNMENT_SCHEMA_VERSION } from './input-pilot-assignment.js';
import { createInputPilotDefinition } from './input-pilot-definition.js';
import {
  INPUT_PILOT_ENROLLMENT_LEDGER_SCHEMA_VERSION,
  createInputPilotEnrollmentSnapshot,
} from './input-pilot-enrollment-ledger.js';
import {
  INPUT_PILOT_RECORD_SCHEMA_VERSION,
  createInputPilotRecord,
} from './input-pilot-record.js';
import {
  INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
  createInputPilotTrialCheckpoint,
} from './input-pilot-trial-checkpoint.js';

export const INPUT_PILOT_WORKSPACE_SCHEMA_VERSION = 1;

const WORKSPACE_KEYS = new Set([
  'schemaVersion',
  'definitionId',
  'definitionHash',
  'revision',
  'enrollment',
  'activeTrial',
  'records',
]);
const UPDATE_KEYS = new Set(['enrollment', 'activeTrial', 'records']);

function compareRecords(left, right) {
  return left.assignment.enrollmentIndex - right.assignment.enrollmentIndex;
}

function validateCoverage(enrollment, activeTrial, records) {
  const byAssignment = new Map(enrollment.assignments.map((assignment) => [
    assignment.assignmentId,
    assignment,
  ]));
  const covered = new Set();
  for (const record of records) {
    const assignment = byAssignment.get(record.assignment.assignmentId);
    if (!assignment) {
      throw new RangeError(`record ${record.trialId} 不属于 enrollment ledger。`);
    }
    if (covered.has(assignment.assignmentId)) {
      throw new RangeError(`assignment ${assignment.assignmentId} 存在重复 trial。`);
    }
    covered.add(assignment.assignmentId);
  }
  if (activeTrial) {
    const assignment = byAssignment.get(activeTrial.assignment.assignmentId);
    if (!assignment) throw new RangeError('activeTrial 不属于 enrollment ledger。');
    if (covered.has(assignment.assignmentId)) {
      throw new RangeError('activeTrial assignment 已存在终态 record。');
    }
    covered.add(assignment.assignmentId);
  }
  if (covered.size !== enrollment.assignments.length) {
    throw new RangeError('enrollment ledger 包含没有 activeTrial 或终态 record 的孤立 assignment。');
  }
}

function assertNotFutureSchema(value, current, name) {
  if (Number.isSafeInteger(value) && value > current) {
    throw new RangeError(`${name} 来自未来 schema。`);
  }
}

function assertAssignmentNotFuture(value, name) {
  assertNotFutureSchema(value?.schemaVersion, INPUT_PILOT_ASSIGNMENT_SCHEMA_VERSION, name);
}

/**
 * Checks the entire persisted aggregate before a malformed slot is treated as
 * recoverable corruption. An older client must not erase a nested schema that
 * is newer than the workspace shell containing it.
 */
export function assertInputPilotWorkspaceHasNoFutureSchema(value) {
  const source = cloneFrozenData(value, 'InputPilotWorkspace version probe');
  assertNotFutureSchema(
    source?.schemaVersion,
    INPUT_PILOT_WORKSPACE_SCHEMA_VERSION,
    'InputPilotWorkspace',
  );
  assertNotFutureSchema(
    source?.enrollment?.schemaVersion,
    INPUT_PILOT_ENROLLMENT_LEDGER_SCHEMA_VERSION,
    'InputPilotWorkspace.enrollment',
  );
  if (Array.isArray(source?.enrollment?.assignments)) {
    source.enrollment.assignments.forEach((assignment, index) => {
      assertAssignmentNotFuture(
        assignment,
        `InputPilotWorkspace.enrollment.assignments[${index}]`,
      );
    });
  }
  if (source?.activeTrial && typeof source.activeTrial === 'object') {
    assertNotFutureSchema(
      source.activeTrial.schemaVersion,
      INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
      'InputPilotWorkspace.activeTrial',
    );
    assertAssignmentNotFuture(
      source.activeTrial.assignment,
      'InputPilotWorkspace.activeTrial.assignment',
    );
  }
  if (Array.isArray(source?.records)) {
    source.records.forEach((record, index) => {
      assertNotFutureSchema(
        record?.schemaVersion,
        INPUT_PILOT_RECORD_SCHEMA_VERSION,
        `InputPilotWorkspace.records[${index}]`,
      );
      assertAssignmentNotFuture(
        record?.assignment,
        `InputPilotWorkspace.records[${index}].assignment`,
      );
    });
  }
  return true;
}

export function createInputPilotWorkspace(definitionValue, value = null) {
  const definition = createInputPilotDefinition(definitionValue);
  if (value === null || value === undefined) {
    return Object.freeze({
      schemaVersion: INPUT_PILOT_WORKSPACE_SCHEMA_VERSION,
      definitionId: definition.id,
      definitionHash: definition.getContentHash(),
      revision: 0,
      enrollment: createInputPilotEnrollmentSnapshot(definition),
      activeTrial: null,
      records: Object.freeze([]),
    });
  }
  const source = cloneFrozenData(value, 'InputPilotWorkspace');
  assertKnownKeys(source, WORKSPACE_KEYS, 'InputPilotWorkspace');
  if (source.schemaVersion !== INPUT_PILOT_WORKSPACE_SCHEMA_VERSION) {
    throw new RangeError(`不支持 InputPilotWorkspace schema ${String(source.schemaVersion)}。`);
  }
  if (
    source.definitionId !== definition.id
    || source.definitionHash !== definition.getContentHash()
  ) throw new RangeError('InputPilotWorkspace 与当前 Definition 不一致。');
  const revision = assertIntegerAtLeast(source.revision, 0, 'InputPilotWorkspace.revision');
  const enrollment = createInputPilotEnrollmentSnapshot(definition, source.enrollment);
  if (revision < enrollment.revision) {
    throw new RangeError('InputPilotWorkspace.revision 不能小于 enrollment revision。');
  }
  const activeTrial = source.activeTrial === null
    ? null
    : createInputPilotTrialCheckpoint(definition, source.activeTrial);
  if (!Array.isArray(source.records)) throw new TypeError('InputPilotWorkspace.records 必须是数组。');
  const records = source.records.map((record) => createInputPilotRecord(definition, record));
  const trialIds = new Set();
  for (const record of records) {
    if (trialIds.has(record.trialId)) throw new RangeError(`重复 pilot trial ${record.trialId}。`);
    trialIds.add(record.trialId);
  }
  if (activeTrial && trialIds.has(activeTrial.trialId)) {
    throw new RangeError(`active pilot trial ${activeTrial.trialId} 已存在终态 record。`);
  }
  validateCoverage(enrollment, activeTrial, records);
  return Object.freeze({
    schemaVersion: INPUT_PILOT_WORKSPACE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    revision,
    enrollment,
    activeTrial,
    records: Object.freeze([...records].sort(compareRecords)),
  });
}

export function advanceInputPilotWorkspace(definitionValue, currentValue, updateValue) {
  const definition = createInputPilotDefinition(definitionValue);
  const current = createInputPilotWorkspace(definition, currentValue);
  const update = cloneFrozenData(updateValue, 'InputPilotWorkspace update');
  assertKnownKeys(update, UPDATE_KEYS, 'InputPilotWorkspace update');
  return createInputPilotWorkspace(definition, {
    ...current,
    ...update,
    revision: current.revision + 1,
  });
}
