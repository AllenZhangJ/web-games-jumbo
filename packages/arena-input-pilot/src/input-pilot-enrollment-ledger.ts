import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  createInputPilotAssignment,
  validateInputPilotAssignment,
  type InputPilotAssignment,
} from './input-pilot-assignment.js';
import {
  createInputPilotDefinition,
  type InputPilotDefinition,
} from './input-pilot-definition.js';

export const INPUT_PILOT_ENROLLMENT_LEDGER_SCHEMA_VERSION = 1;

export interface InputPilotEnrollmentSnapshot {
  readonly schemaVersion: typeof INPUT_PILOT_ENROLLMENT_LEDGER_SCHEMA_VERSION;
  readonly definitionId: string;
  readonly definitionHash: string;
  readonly revision: number;
  readonly assignments: readonly InputPilotAssignment[];
}

type PersistEnrollmentSnapshot = (
  snapshot: InputPilotEnrollmentSnapshot,
  previousRevision: number,
) => unknown;

const LEDGER_KEYS = new Set([
  'schemaVersion',
  'definitionId',
  'definitionHash',
  'revision',
  'assignments',
]);
const LEDGER_OPTION_KEYS = new Set(['definition', 'initialState', 'persist']);
const ENROLL_OPTION_KEYS = new Set(['participantId', 'enrollmentIndex']);

function compareAssignments(left: InputPilotAssignment, right: InputPilotAssignment): number {
  return left.enrollmentIndex - right.enrollmentIndex;
}

function createLedgerSnapshot(
  definition: InputPilotDefinition,
  revision: number,
  assignments: readonly InputPilotAssignment[],
): InputPilotEnrollmentSnapshot {
  return cloneFrozenData({
    schemaVersion: INPUT_PILOT_ENROLLMENT_LEDGER_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    revision,
    assignments: [...assignments].sort(compareAssignments),
  }, 'InputPilotEnrollmentLedger snapshot') as InputPilotEnrollmentSnapshot;
}

function normalizeInitialState(
  definition: InputPilotDefinition,
  value: unknown,
): InputPilotEnrollmentSnapshot {
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
    throw new RangeError('InputPilotEnrollmentLedger.revision 必须等于已提交 assignment 数量。');
  }
  const participantIds = new Set<string>();
  const enrollmentIndexes = new Set<number>();
  const assignmentIds = new Set<string>();
  for (const assignment of assignments) {
    if (participantIds.has(assignment.participantId)) {
      throw new RangeError(`InputPilotEnrollmentLedger 重复 participant ${assignment.participantId}。`);
    }
    participantIds.add(assignment.participantId);
    if (enrollmentIndexes.has(assignment.enrollmentIndex)) {
      throw new RangeError(
        `InputPilotEnrollmentLedger 重复 enrollmentIndex ${assignment.enrollmentIndex}。`,
      );
    }
    enrollmentIndexes.add(assignment.enrollmentIndex);
    if (assignmentIds.has(assignment.assignmentId)) {
      throw new RangeError(`InputPilotEnrollmentLedger 重复 assignment ${assignment.assignmentId}。`);
    }
    assignmentIds.add(assignment.assignmentId);
  }
  return createLedgerSnapshot(definition, revision, assignments);
}

export function createInputPilotEnrollmentSnapshot(
  definitionValue: unknown,
  value: unknown = null,
): InputPilotEnrollmentSnapshot {
  return normalizeInitialState(createInputPilotDefinition(definitionValue), value);
}

function validatePersistence(value: unknown): PersistEnrollmentSnapshot {
  if (typeof value !== 'function') {
    throw new TypeError('InputPilotEnrollmentLedger.persist 必须是函数。');
  }
  return value as PersistEnrollmentSnapshot;
}

function rejectThenable(value: unknown): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let current: object | null = value as object;
  const visited = new Set<object>();
  while (current) {
    if (visited.has(current) || visited.size >= 32) {
      throw new TypeError('InputPilotEnrollmentLedger.persist 返回值原型链无效。');
    }
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, 'then');
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value')) {
        throw new TypeError('InputPilotEnrollmentLedger.persist 返回了访问器 thenable。');
      }
      if (typeof descriptor.value !== 'function') return;
      try {
        Promise.prototype.then.call(value, undefined, () => {});
      } catch {
        // Reject foreign thenables without executing their then method. Native
        // Promise rejection is observed through Promise.prototype.then.
      }
      throw new TypeError('InputPilotEnrollmentLedger.persist 必须同步完成。');
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
}

export class InputPilotEnrollmentLedger {
  #definition: InputPilotDefinition | null;
  #persist: PersistEnrollmentSnapshot | null;
  #snapshot: InputPilotEnrollmentSnapshot | null;
  #mutating = false;
  #destroyed = false;

  constructor(optionsValue: unknown) {
    assertKnownKeys(optionsValue, LEDGER_OPTION_KEYS, 'InputPilotEnrollmentLedger options');
    const definition = createInputPilotDefinition(optionsValue.definition);
    this.#definition = definition;
    this.#persist = validatePersistence(optionsValue.persist);
    this.#snapshot = createInputPilotEnrollmentSnapshot(definition, optionsValue.initialState);
    Object.freeze(this);
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('InputPilotEnrollmentLedger 已销毁。');
    if (this.#mutating) throw new Error('InputPilotEnrollmentLedger 写入不可重入。');
  }

  #requireDefinition(): InputPilotDefinition {
    if (!this.#definition) throw new Error('InputPilotEnrollmentLedger 已销毁。');
    return this.#definition;
  }

  #requirePersist(): PersistEnrollmentSnapshot {
    if (!this.#persist) throw new Error('InputPilotEnrollmentLedger 已销毁。');
    return this.#persist;
  }

  #requireSnapshot(): InputPilotEnrollmentSnapshot {
    if (!this.#snapshot) throw new Error('InputPilotEnrollmentLedger 已销毁。');
    return this.#snapshot;
  }

  getSnapshot(): InputPilotEnrollmentSnapshot {
    this.#assertUsable();
    return this.#requireSnapshot();
  }

  findByParticipantId(participantIdValue: unknown): InputPilotAssignment | null {
    this.#assertUsable();
    const participantId = assertNonEmptyString(
      participantIdValue,
      'InputPilotEnrollmentLedger.participantId',
    );
    return this.#requireSnapshot().assignments.find((assignment) => (
      assignment.participantId === participantId
    )) ?? null;
  }

  enroll(optionsValue: unknown): InputPilotAssignment {
    this.#assertUsable();
    assertKnownKeys(optionsValue, ENROLL_OPTION_KEYS, 'InputPilotEnrollmentLedger enroll options');
    const participantId = assertNonEmptyString(
      optionsValue.participantId,
      'InputPilotEnrollmentLedger.participantId',
    );
    const enrollmentIndex = assertIntegerAtLeast(
      optionsValue.enrollmentIndex,
      0,
      'InputPilotEnrollmentLedger.enrollmentIndex',
    );
    const snapshot = this.#requireSnapshot();
    const participantAssignment = snapshot.assignments.find((assignment) => (
      assignment.participantId === participantId
    ));
    if (participantAssignment) {
      if (participantAssignment.enrollmentIndex === enrollmentIndex) return participantAssignment;
      throw new RangeError(`participant ${participantId} 已使用其他 enrollmentIndex。`);
    }
    const indexAssignment = snapshot.assignments.find((assignment) => (
      assignment.enrollmentIndex === enrollmentIndex
    ));
    if (indexAssignment) {
      throw new RangeError(`enrollmentIndex ${enrollmentIndex} 已分配给其他 participant。`);
    }

    const assignment = createInputPilotAssignment({
      definition: this.#requireDefinition(),
      participantId,
      enrollmentIndex,
    });
    const previousRevision = snapshot.revision;
    const next = createLedgerSnapshot(
      this.#requireDefinition(),
      previousRevision + 1,
      [...snapshot.assignments, assignment],
    );
    this.#mutating = true;
    try {
      const persisted = this.#requirePersist()(next, previousRevision);
      rejectThenable(persisted);
      if (persisted !== true) {
        throw new Error('InputPilotEnrollmentLedger 持久化未确认提交。');
      }
      this.#snapshot = next;
      const committed = next.assignments.find((value) => value.participantId === participantId);
      if (!committed) throw new Error('InputPilotEnrollmentLedger 提交结果缺少 assignment。');
      return committed;
    } finally {
      this.#mutating = false;
    }
  }

  destroy(): void {
    if (this.#destroyed) return;
    if (this.#mutating) throw new Error('写入期间不能销毁 InputPilotEnrollmentLedger。');
    this.#destroyed = true;
    this.#persist = null;
    this.#snapshot = null;
    this.#definition = null;
  }
}
