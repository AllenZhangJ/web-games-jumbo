import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  INPUT_PILOT_ASSIGNMENT_SCHEMA_VERSION,
  type InputPilotAssignment,
} from './input-pilot-assignment.js';
import {
  INPUT_PILOT_ENROLLMENT_LEDGER_SCHEMA_VERSION,
  createInputPilotEnrollmentSnapshot,
  type InputPilotEnrollmentSnapshot,
} from './input-pilot-enrollment-ledger.js';
import { createInputPilotDefinition } from './input-pilot-definition.js';
import {
  INPUT_PILOT_RECORD_SCHEMA_VERSION,
  createInputPilotRecord,
  type InputPilotRecord,
} from './input-pilot-record.js';
import {
  INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
  createInputPilotTrialCheckpoint,
  type InputPilotTrialCheckpoint,
} from './input-pilot-trial-checkpoint.js';

export const INPUT_PILOT_WORKSPACE_SCHEMA_VERSION = 1;

export interface InputPilotWorkspace {
  readonly schemaVersion: typeof INPUT_PILOT_WORKSPACE_SCHEMA_VERSION;
  readonly definitionId: string;
  readonly definitionHash: string;
  readonly revision: number;
  readonly enrollment: InputPilotEnrollmentSnapshot;
  readonly activeTrial: InputPilotTrialCheckpoint | null;
  readonly records: readonly InputPilotRecord[];
}

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

function compareRecords(left: InputPilotRecord, right: InputPilotRecord): number {
  return left.assignment.enrollmentIndex - right.assignment.enrollmentIndex;
}

function validateCoverage(
  enrollment: InputPilotEnrollmentSnapshot,
  activeTrial: InputPilotTrialCheckpoint | null,
  records: readonly InputPilotRecord[],
): void {
  const byAssignment = new Map<string, InputPilotAssignment>(enrollment.assignments.map((assignment) => [
    assignment.assignmentId,
    assignment,
  ]));
  const covered = new Set<string>();
  for (const record of records) {
    const assignment = byAssignment.get(record.assignment.assignmentId);
    if (!assignment) throw new RangeError(`record ${record.trialId} 不属于 enrollment ledger。`);
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

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function assertNotFutureSchema(value: unknown, current: number, name: string): void {
  if (Number.isSafeInteger(value) && (value as number) > current) {
    throw new RangeError(`${name} 来自未来 schema。`);
  }
}

function assertAssignmentNotFuture(value: unknown, name: string): void {
  assertNotFutureSchema(recordValue(value)?.schemaVersion, INPUT_PILOT_ASSIGNMENT_SCHEMA_VERSION, name);
}

/**
 * Checks the entire persisted aggregate before a malformed slot is treated as
 * recoverable corruption. An older client must not erase a nested schema that
 * is newer than the workspace shell containing it.
 */
export function assertInputPilotWorkspaceHasNoFutureSchema(value: unknown): true {
  const source = recordValue(cloneFrozenData(value, 'InputPilotWorkspace version probe'));
  assertNotFutureSchema(source?.schemaVersion, INPUT_PILOT_WORKSPACE_SCHEMA_VERSION, 'InputPilotWorkspace');
  const enrollment = recordValue(source?.enrollment);
  assertNotFutureSchema(
    enrollment?.schemaVersion,
    INPUT_PILOT_ENROLLMENT_LEDGER_SCHEMA_VERSION,
    'InputPilotWorkspace.enrollment',
  );
  if (Array.isArray(enrollment?.assignments)) {
    enrollment.assignments.forEach((assignment, index) => {
      assertAssignmentNotFuture(assignment, `InputPilotWorkspace.enrollment.assignments[${index}]`);
    });
  }
  const activeTrial = recordValue(source?.activeTrial);
  if (activeTrial) {
    assertNotFutureSchema(
      activeTrial.schemaVersion,
      INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
      'InputPilotWorkspace.activeTrial',
    );
    assertAssignmentNotFuture(
      activeTrial.assignment,
      'InputPilotWorkspace.activeTrial.assignment',
    );
  }
  if (Array.isArray(source?.records)) {
    source.records.forEach((recordValueItem, index) => {
      const record = recordValue(recordValueItem);
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

export function createInputPilotWorkspace(
  definitionValue: unknown,
  value: unknown = null,
): InputPilotWorkspace {
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
  const trialIds = new Set<string>();
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

export function advanceInputPilotWorkspace(
  definitionValue: unknown,
  currentValue: unknown,
  updateValue: unknown,
): InputPilotWorkspace {
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
