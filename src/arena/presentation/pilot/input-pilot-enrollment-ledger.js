import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';
import {
  createInputPilotAssignment,
  validateInputPilotAssignment,
} from './input-pilot-assignment.js';
import { createInputPilotDefinition } from './input-pilot-definition.js';

export const INPUT_PILOT_ENROLLMENT_LEDGER_SCHEMA_VERSION = 1;

const LEDGER_KEYS = new Set([
  'schemaVersion',
  'definitionId',
  'definitionHash',
  'revision',
  'assignments',
]);

function compareAssignments(left, right) {
  return left.enrollmentIndex - right.enrollmentIndex;
}

function createLedgerSnapshot(definition, revision, assignments) {
  return cloneFrozenData({
    schemaVersion: INPUT_PILOT_ENROLLMENT_LEDGER_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    revision,
    assignments: [...assignments].sort(compareAssignments),
  }, 'InputPilotEnrollmentLedger snapshot');
}

function normalizeInitialState(definition, value) {
  if (value === undefined || value === null) return createLedgerSnapshot(definition, 0, []);
  const source = cloneFrozenData(value, 'InputPilotEnrollmentLedger initialState');
  assertKnownKeys(source, LEDGER_KEYS, 'InputPilotEnrollmentLedger initialState');
  if (source.schemaVersion !== INPUT_PILOT_ENROLLMENT_LEDGER_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 InputPilotEnrollmentLedger schema ${String(source.schemaVersion)}。`,
    );
  }
  if (
    source.definitionId !== definition.id
    || source.definitionHash !== definition.getContentHash()
  ) throw new RangeError('InputPilotEnrollmentLedger 与当前 Definition 不一致。');
  if (!Array.isArray(source.assignments)) {
    throw new TypeError('InputPilotEnrollmentLedger.assignments 必须是数组。');
  }
  const revision = assertIntegerAtLeast(
    source.revision,
    0,
    'InputPilotEnrollmentLedger.revision',
  );
  const assignments = source.assignments.map((assignment) => (
    validateInputPilotAssignment(definition, assignment)
  ));
  if (revision !== assignments.length) {
    throw new RangeError(
      'InputPilotEnrollmentLedger.revision 必须等于已提交 assignment 数量。',
    );
  }
  const participantIds = new Set();
  const enrollmentIndexes = new Set();
  const assignmentIds = new Set();
  for (const assignment of assignments) {
    if (participantIds.has(assignment.participantId)) {
      throw new RangeError(
        `InputPilotEnrollmentLedger 重复 participant ${assignment.participantId}。`,
      );
    }
    participantIds.add(assignment.participantId);
    if (enrollmentIndexes.has(assignment.enrollmentIndex)) {
      throw new RangeError(
        `InputPilotEnrollmentLedger 重复 enrollmentIndex ${assignment.enrollmentIndex}。`,
      );
    }
    enrollmentIndexes.add(assignment.enrollmentIndex);
    if (assignmentIds.has(assignment.assignmentId)) {
      throw new RangeError(
        `InputPilotEnrollmentLedger 重复 assignment ${assignment.assignmentId}。`,
      );
    }
    assignmentIds.add(assignment.assignmentId);
  }
  return createLedgerSnapshot(definition, revision, assignments);
}

export function createInputPilotEnrollmentSnapshot(definitionValue, value = null) {
  const definition = createInputPilotDefinition(definitionValue);
  return normalizeInitialState(definition, value);
}

function validatePersistence(value) {
  if (typeof value !== 'function') {
    throw new TypeError('InputPilotEnrollmentLedger.persist 必须是函数。');
  }
  return value;
}

export class InputPilotEnrollmentLedger {
  #definition;
  #persist;
  #snapshot;
  #mutating;
  #destroyed;

  constructor({ definition: definitionValue, initialState, persist }) {
    const definition = createInputPilotDefinition(definitionValue);
    this.#definition = definition;
    this.#persist = validatePersistence(persist);
    this.#snapshot = createInputPilotEnrollmentSnapshot(definition, initialState);
    this.#mutating = false;
    this.#destroyed = false;
    Object.freeze(this);
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('InputPilotEnrollmentLedger 已销毁。');
    if (this.#mutating) throw new Error('InputPilotEnrollmentLedger 写入不可重入。');
  }

  getSnapshot() {
    this.#assertUsable();
    return this.#snapshot;
  }

  findByParticipantId(participantIdValue) {
    this.#assertUsable();
    const participantId = assertNonEmptyString(
      participantIdValue,
      'InputPilotEnrollmentLedger.participantId',
    );
    return this.#snapshot.assignments.find((assignment) => (
      assignment.participantId === participantId
    )) ?? null;
  }

  enroll({ participantId: participantIdValue, enrollmentIndex: enrollmentIndexValue }) {
    this.#assertUsable();
    const participantId = assertNonEmptyString(
      participantIdValue,
      'InputPilotEnrollmentLedger.participantId',
    );
    const enrollmentIndex = assertIntegerAtLeast(
      enrollmentIndexValue,
      0,
      'InputPilotEnrollmentLedger.enrollmentIndex',
    );
    const participantAssignment = this.#snapshot.assignments.find((assignment) => (
      assignment.participantId === participantId
    ));
    if (participantAssignment) {
      if (participantAssignment.enrollmentIndex === enrollmentIndex) return participantAssignment;
      throw new RangeError(`participant ${participantId} 已使用其他 enrollmentIndex。`);
    }
    const indexAssignment = this.#snapshot.assignments.find((assignment) => (
      assignment.enrollmentIndex === enrollmentIndex
    ));
    if (indexAssignment) {
      throw new RangeError(`enrollmentIndex ${enrollmentIndex} 已分配给其他 participant。`);
    }

    const assignment = createInputPilotAssignment({
      definition: this.#definition,
      participantId,
      enrollmentIndex,
    });
    const previousRevision = this.#snapshot.revision;
    const next = createLedgerSnapshot(
      this.#definition,
      previousRevision + 1,
      [...this.#snapshot.assignments, assignment],
    );
    this.#mutating = true;
    try {
      const persisted = this.#persist(next, previousRevision);
      if (persisted && typeof persisted.then === 'function') {
        Promise.resolve(persisted).catch(() => {
          // The synchronous contract already rejected this writer. Contain a
          // late async rejection so it cannot escape into the App lifecycle.
        });
        throw new TypeError('InputPilotEnrollmentLedger.persist 必须同步完成。');
      }
      if (persisted !== true) {
        throw new Error('InputPilotEnrollmentLedger 持久化未确认提交。');
      }
      this.#snapshot = next;
      return this.#snapshot.assignments.find((value) => (
        value.participantId === participantId
      ));
    } finally {
      this.#mutating = false;
    }
  }

  destroy() {
    if (this.#destroyed) return;
    if (this.#mutating) throw new Error('写入期间不能销毁 InputPilotEnrollmentLedger。');
    this.#destroyed = true;
    this.#persist = null;
    this.#snapshot = null;
    this.#definition = null;
  }
}
