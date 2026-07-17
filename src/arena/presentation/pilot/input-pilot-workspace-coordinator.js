import { createInputPilotDefinition } from './input-pilot-definition.js';
import { InputPilotEnrollmentLedger } from './input-pilot-enrollment-ledger.js';
import { createInputPilotRecord } from './input-pilot-record.js';
import { createInputPilotTrialCheckpoint } from './input-pilot-trial-checkpoint.js';
import { createEnrolledInputPilotTrial } from './input-pilot-trial-state.js';
import {
  advanceInputPilotWorkspace,
  createInputPilotWorkspace,
} from './input-pilot-workspace.js';

function validateRepository(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('InputPilotWorkspaceCoordinator.repository 无效。');
  }
  for (const method of [
    'open',
    'getSnapshot',
    'compareAndSet',
    'renewLease',
    'destroy',
  ]) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`InputPilotWorkspaceCoordinator.repository 缺少 ${method}()。`);
    }
  }
  return value;
}

function sameTrial(left, right) {
  return left.trialId === right.trialId
    && left.assignment.assignmentId === right.assignment.assignmentId;
}

export class InputPilotWorkspaceCoordinator {
  #definition;
  #repository;
  #state;
  #committing;

  constructor({ definition: definitionValue, repository }) {
    this.#definition = createInputPilotDefinition(definitionValue);
    this.#repository = validateRepository(repository);
    this.#state = 'created';
    this.#committing = false;
    Object.freeze(this);
  }

  #assertOpen() {
    if (this.#state === 'destroyed') throw new Error('InputPilotWorkspaceCoordinator 已销毁。');
    if (this.#state !== 'open') throw new Error('InputPilotWorkspaceCoordinator 尚未打开。');
    if (this.#committing) throw new Error('InputPilotWorkspaceCoordinator 写入不可重入。');
  }

  #commit(current, update) {
    this.#assertOpen();
    if (this.#repository.getSnapshot().revision !== current.revision) {
      throw new Error('Pilot workspace 内存 revision 已变化。');
    }
    const next = advanceInputPilotWorkspace(this.#definition, current, update);
    this.#committing = true;
    try {
      const result = this.#repository.compareAndSet(next, current.revision);
      if (!result?.committed) {
        throw new Error(`Pilot workspace CAS 未提交：${result?.reason ?? 'unknown'}。`);
      }
      return this.#repository.getSnapshot();
    } finally {
      this.#committing = false;
    }
  }

  open() {
    if (this.#state === 'destroyed') throw new Error('InputPilotWorkspaceCoordinator 已销毁。');
    if (this.#state === 'open') return this.#repository.getSnapshot();
    const workspace = createInputPilotWorkspace(
      this.#definition,
      this.#repository.open(),
    );
    this.#state = 'open';
    return workspace;
  }

  getSnapshot() {
    this.#assertOpen();
    return this.#repository.getSnapshot();
  }

  enroll({ participantId, device, eligibility, trialId }) {
    this.#assertOpen();
    const current = this.#repository.getSnapshot();
    if (current.activeTrial !== null) throw new Error('已有 active pilot trial，不能再次入组。');
    let committedCheckpoint = null;
    const ledger = new InputPilotEnrollmentLedger({
      definition: this.#definition,
      initialState: current.enrollment,
      persist: (enrollment, expectedEnrollmentRevision) => {
        if (expectedEnrollmentRevision !== current.enrollment.revision) {
          throw new Error('Pilot enrollment revision 已变化。');
        }
        const assignment = enrollment.assignments.find(({ enrollmentIndex }) => (
          enrollmentIndex === expectedEnrollmentRevision
        ));
        if (!assignment) throw new Error('Pilot enrollment 未产生预期 assignment。');
        const checkpoint = createEnrolledInputPilotTrial(this.#definition, {
          assignment,
          device,
          eligibility,
          trialId,
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
      return committedCheckpoint;
    } finally {
      ledger.destroy();
    }
  }

  replaceActive(nextValue) {
    this.#assertOpen();
    const current = this.#repository.getSnapshot();
    if (current.activeTrial === null) throw new Error('没有 active pilot trial 可替换。');
    const next = createInputPilotTrialCheckpoint(this.#definition, nextValue);
    if (!sameTrial(current.activeTrial, next)) {
      throw new RangeError('Pilot active trial 替换不能改变 trial 或 assignment。');
    }
    return this.#commit(current, { activeTrial: next }).activeTrial;
  }

  completeActive(recordValue) {
    this.#assertOpen();
    const current = this.#repository.getSnapshot();
    if (current.activeTrial === null) throw new Error('没有 active pilot trial 可终结。');
    const record = createInputPilotRecord(this.#definition, recordValue);
    if (!sameTrial(current.activeTrial, record)) {
      throw new RangeError('Pilot terminal record 与 active trial 不一致。');
    }
    const committed = this.#commit(current, {
      activeTrial: null,
      records: [...current.records, record],
    });
    return committed.records.find(({ trialId }) => trialId === record.trialId);
  }

  renewLease() {
    this.#assertOpen();
    if (this.#repository.renewLease() !== true) {
      throw new Error('Pilot workspace lease 续约未确认。');
    }
    return true;
  }

  destroy() {
    if (this.#state === 'destroyed') return;
    if (this.#committing) throw new Error('写入期间不能销毁 InputPilotWorkspaceCoordinator。');
    try {
      this.#repository.destroy();
    } finally {
      this.#definition = null;
      this.#repository = null;
      this.#state = 'destroyed';
    }
  }
}
