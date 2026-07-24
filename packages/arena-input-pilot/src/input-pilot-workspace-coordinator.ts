import {
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  InputPilotEnrollmentLedger,
  type InputPilotEnrollmentSnapshot,
} from './input-pilot-enrollment-ledger.js';
import { createInputPilotDefinition, type InputPilotDefinition } from './input-pilot-definition.js';
import { createInputPilotRecord, type InputPilotRecord } from './input-pilot-record.js';
import { createInputPilotTrialCheckpoint, type InputPilotTrialCheckpoint } from './input-pilot-trial-checkpoint.js';
import { createEnrolledInputPilotTrial } from './input-pilot-trial-state.js';
import {
  advanceInputPilotWorkspace,
  createInputPilotWorkspace,
  type InputPilotWorkspace,
} from './input-pilot-workspace.js';

type UnknownMethod = (...args: unknown[]) => unknown;
interface WorkspaceRepositoryPort {
  readonly open: UnknownMethod;
  readonly getSnapshot: UnknownMethod;
  readonly compareAndSet: UnknownMethod;
  readonly renewLease: UnknownMethod;
  readonly destroy: UnknownMethod;
}
interface WorkspaceCommitResult {
  readonly committed: boolean;
  readonly reason: string | null;
  readonly headUpdated: boolean;
}

const COORDINATOR_OPTION_KEYS = new Set(['definition', 'repository']);
const ENROLL_KEYS = new Set(['participantId', 'device', 'eligibility', 'trialId']);
const COMMIT_RESULT_KEYS = new Set(['committed', 'reason', 'headUpdated']);

function dataMethod(value: unknown, key: string): UnknownMethod {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError('InputPilotWorkspaceCoordinator.repository 无效。');
  }
  let current: object | null = value;
  const visited = new Set<object>();
  while (current) {
    if (visited.has(current) || visited.size >= 32) {
      throw new TypeError('InputPilotWorkspaceCoordinator.repository 原型链无效。');
    }
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`InputPilotWorkspaceCoordinator.repository.${key} 必须是数据方法。`);
      }
      return descriptor.value.bind(value) as UnknownMethod;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  throw new TypeError(`InputPilotWorkspaceCoordinator.repository 缺少 ${key}()。`);
}

function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let current: object | null = value as object;
  const visited = new Set<object>();
  while (current) {
    if (visited.has(current) || visited.size >= 32) throw new TypeError(`${name} 原型链无效。`);
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, 'then');
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name} 返回了访问器 thenable。`);
      if (typeof descriptor.value !== 'function') return;
      try { Promise.prototype.then.call(value, undefined, () => {}); } catch { /* foreign thenable */ }
      throw new TypeError(`${name} 必须同步完成。`);
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
}

function callSync(method: UnknownMethod, name: string, ...args: unknown[]): unknown {
  const result = method(...args);
  rejectThenable(result, name);
  return result;
}

function validateRepository(value: unknown): WorkspaceRepositoryPort {
  return Object.freeze({
    open: dataMethod(value, 'open'),
    getSnapshot: dataMethod(value, 'getSnapshot'),
    compareAndSet: dataMethod(value, 'compareAndSet'),
    renewLease: dataMethod(value, 'renewLease'),
    destroy: dataMethod(value, 'destroy'),
  });
}

function validateCommitResult(value: unknown): WorkspaceCommitResult {
  assertKnownKeys(value, COMMIT_RESULT_KEYS, 'Pilot workspace CAS result');
  if (typeof value.committed !== 'boolean' || typeof value.headUpdated !== 'boolean') {
    throw new TypeError('Pilot workspace CAS result committed/headUpdated 必须是布尔值。');
  }
  if (value.reason !== null && (typeof value.reason !== 'string' || value.reason.length === 0)) {
    throw new TypeError('Pilot workspace CAS result reason 必须是 null 或非空字符串。');
  }
  return Object.freeze({
    committed: value.committed,
    reason: value.reason,
    headUpdated: value.headUpdated,
  });
}

function sameTrial(left: InputPilotTrialCheckpoint, right: InputPilotTrialCheckpoint | InputPilotRecord): boolean {
  return left.trialId === right.trialId
    && left.assignment.assignmentId === right.assignment.assignmentId;
}

export class InputPilotWorkspaceCoordinator {
  #definition: InputPilotDefinition | null;
  #repository: WorkspaceRepositoryPort | null;
  #state: 'created' | 'open' | 'destroyed' = 'created';
  #committing = false;

  constructor(optionsValue: unknown) {
    assertKnownKeys(optionsValue, COORDINATOR_OPTION_KEYS, 'InputPilotWorkspaceCoordinator options');
    this.#definition = createInputPilotDefinition(optionsValue.definition);
    this.#repository = validateRepository(optionsValue.repository);
    Object.freeze(this);
  }

  #requireDefinition(): InputPilotDefinition {
    if (!this.#definition) throw new Error('InputPilotWorkspaceCoordinator 已销毁。');
    return this.#definition;
  }

  #requireRepository(): WorkspaceRepositoryPort {
    if (!this.#repository) throw new Error('InputPilotWorkspaceCoordinator 已销毁。');
    return this.#repository;
  }

  #repositorySnapshot(): InputPilotWorkspace {
    return createInputPilotWorkspace(
      this.#requireDefinition(),
      callSync(
        this.#requireRepository().getSnapshot,
        'InputPilotWorkspaceCoordinator.repository.getSnapshot',
      ),
    );
  }

  #assertOpen(): void {
    if (this.#state === 'destroyed') throw new Error('InputPilotWorkspaceCoordinator 已销毁。');
    if (this.#state !== 'open') throw new Error('InputPilotWorkspaceCoordinator 尚未打开。');
    if (this.#committing) throw new Error('InputPilotWorkspaceCoordinator 写入不可重入。');
  }

  #commit(current: InputPilotWorkspace, update: unknown): InputPilotWorkspace {
    this.#assertOpen();
    if (this.#repositorySnapshot().revision !== current.revision) {
      throw new Error('Pilot workspace 内存 revision 已变化。');
    }
    const next = advanceInputPilotWorkspace(this.#requireDefinition(), current, update);
    this.#committing = true;
    try {
      const result = validateCommitResult(callSync(
        this.#requireRepository().compareAndSet,
        'InputPilotWorkspaceCoordinator.repository.compareAndSet',
        next,
        current.revision,
      ));
      if (!result.committed) {
        throw new Error(`Pilot workspace CAS 未提交：${result.reason ?? 'unknown'}。`);
      }
      return this.#repositorySnapshot();
    } finally {
      this.#committing = false;
    }
  }

  open(): InputPilotWorkspace {
    if (this.#state === 'destroyed') throw new Error('InputPilotWorkspaceCoordinator 已销毁。');
    if (this.#state === 'open') return this.#repositorySnapshot();
    const workspace = createInputPilotWorkspace(
      this.#requireDefinition(),
      callSync(this.#requireRepository().open, 'InputPilotWorkspaceCoordinator.repository.open'),
    );
    this.#state = 'open';
    return workspace;
  }

  getSnapshot(): InputPilotWorkspace {
    this.#assertOpen();
    return this.#repositorySnapshot();
  }

  enroll(optionsValue: unknown): InputPilotTrialCheckpoint {
    this.#assertOpen();
    assertKnownKeys(optionsValue, ENROLL_KEYS, 'InputPilotWorkspaceCoordinator enroll options');
    const participantId = assertNonEmptyString(
      optionsValue.participantId,
      'InputPilotWorkspaceCoordinator.participantId',
    );
    const current = this.#repositorySnapshot();
    if (current.activeTrial !== null) throw new Error('已有 active pilot trial，不能再次入组。');
    let committedCheckpoint: InputPilotTrialCheckpoint | null = null;
    const ledger = new InputPilotEnrollmentLedger({
      definition: this.#requireDefinition(),
      initialState: current.enrollment,
      persist: (
        enrollment: InputPilotEnrollmentSnapshot,
        expectedEnrollmentRevision: number,
      ) => {
        if (expectedEnrollmentRevision !== current.enrollment.revision) {
          throw new Error('Pilot enrollment revision 已变化。');
        }
        const assignment = enrollment.assignments.find(({ enrollmentIndex }) => (
          enrollmentIndex === expectedEnrollmentRevision
        ));
        if (!assignment) throw new Error('Pilot enrollment 未产生预期 assignment。');
        const checkpoint = createEnrolledInputPilotTrial(this.#requireDefinition(), {
          assignment,
          device: optionsValue.device,
          eligibility: optionsValue.eligibility,
          trialId: optionsValue.trialId,
        });
        const committed = this.#commit(current, {
          enrollment,
          activeTrial: checkpoint,
        });
        committedCheckpoint = committed.activeTrial;
        return true;
      },
    });
    try {
      ledger.enroll({
        participantId,
        enrollmentIndex: current.enrollment.revision,
      });
      if (!committedCheckpoint) throw new Error('Pilot enrollment 未返回已提交 checkpoint。');
      return committedCheckpoint;
    } finally {
      ledger.destroy();
    }
  }

  replaceActive(nextValue: unknown): InputPilotTrialCheckpoint {
    this.#assertOpen();
    const current = this.#repositorySnapshot();
    if (current.activeTrial === null) throw new Error('没有 active pilot trial 可替换。');
    const next = createInputPilotTrialCheckpoint(this.#requireDefinition(), nextValue);
    if (!sameTrial(current.activeTrial, next)) {
      throw new RangeError('Pilot active trial 替换不能改变 trial 或 assignment。');
    }
    const activeTrial = this.#commit(current, { activeTrial: next }).activeTrial;
    if (!activeTrial) throw new Error('Pilot active trial 提交后意外缺失。');
    return activeTrial;
  }

  completeActive(recordValue: unknown): InputPilotRecord {
    this.#assertOpen();
    const current = this.#repositorySnapshot();
    if (current.activeTrial === null) throw new Error('没有 active pilot trial 可终结。');
    const record = createInputPilotRecord(this.#requireDefinition(), recordValue);
    if (!sameTrial(current.activeTrial, record)) {
      throw new RangeError('Pilot terminal record 与 active trial 不一致。');
    }
    const committed = this.#commit(current, {
      activeTrial: null,
      records: [...current.records, record],
    });
    const committedRecord = committed.records.find(({ trialId }) => trialId === record.trialId);
    if (!committedRecord) throw new Error('Pilot terminal record 提交后意外缺失。');
    return committedRecord;
  }

  renewLease(): true {
    this.#assertOpen();
    const result = callSync(
      this.#requireRepository().renewLease,
      'InputPilotWorkspaceCoordinator.repository.renewLease',
    );
    if (result !== true) throw new Error('Pilot workspace lease 续约未确认。');
    return true;
  }

  destroy(): void {
    if (this.#state === 'destroyed') return;
    if (this.#committing) throw new Error('写入期间不能销毁 InputPilotWorkspaceCoordinator。');
    callSync(this.#requireRepository().destroy, 'InputPilotWorkspaceCoordinator.repository.destroy');
    this.#definition = null;
    this.#repository = null;
    this.#state = 'destroyed';
  }
}
