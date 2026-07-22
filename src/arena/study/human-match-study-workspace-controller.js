import {
  createHumanMatchStudyCapturePackage,
  validateHumanMatchStudyCapturePackage,
} from '@number-strategy-jump/arena-human-match-study';
import { createHumanMatchStudyDefinition } from '@number-strategy-jump/arena-human-match-study';
import {
  HUMAN_MATCH_STUDY_STATUS,
  HUMAN_MATCH_STUDY_TERMINATION_REASON,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HUMAN_MATCH_STUDY_CHECKPOINT_PHASE,
  advanceHumanMatchStudyWorkspace,
  createEnrolledHumanMatchStudyCheckpoint,
  createHumanMatchStudyCheckpoint,
  createHumanMatchStudyReceipt,
  createHumanMatchStudyWorkspace,
} from '@number-strategy-jump/arena-human-match-study';

function validateRepository(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('HumanMatchStudyWorkspaceController.repository 无效。');
  }
  for (const method of [
    'open',
    'getSnapshot',
    'compareAndSet',
    'renewLease',
    'destroy',
  ]) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`Study repository 缺少 ${method}()。`);
    }
  }
  return value;
}

function sameAssignment(left, right) {
  return left.assignmentId === right.assignmentId
    && left.participantId === right.participantId
    && left.enrollmentIndex === right.enrollmentIndex;
}

export class HumanMatchStudyWorkspaceController {
  #definition;
  #repository;
  #state;
  #committing;

  constructor({ definition: definitionValue, repository }) {
    this.#definition = createHumanMatchStudyDefinition(definitionValue);
    this.#repository = validateRepository(repository);
    this.#state = 'created';
    this.#committing = false;
    Object.freeze(this);
  }

  #assertOpen() {
    if (this.#state === 'destroyed') {
      throw new Error('HumanMatchStudyWorkspaceController 已销毁。');
    }
    if (this.#state !== 'open') {
      throw new Error('HumanMatchStudyWorkspaceController 尚未打开。');
    }
    if (this.#committing) {
      throw new Error('HumanMatchStudyWorkspaceController 状态转换不可重入。');
    }
  }

  #commit(activeTrial, receipts = null) {
    this.#assertOpen();
    const current = this.#repository.getSnapshot();
    const next = advanceHumanMatchStudyWorkspace(this.#definition, current, {
      activeTrial,
      receipts: receipts ?? current.receipts,
    });
    this.#committing = true;
    try {
      const result = this.#repository.compareAndSet(next, current.revision);
      if (!result?.committed) {
        throw new Error(`Human Match Study workspace CAS 未提交：${result?.reason ?? 'unknown'}。`);
      }
      return this.#repository.getSnapshot();
    } finally {
      this.#committing = false;
    }
  }

  #replaceActive(value) {
    const current = this.#repository.getSnapshot().activeTrial;
    if (current === null) throw new Error('没有 active Human Match Study trial。');
    const next = createHumanMatchStudyCheckpoint(this.#definition, value);
    if (next.trialId !== current.trialId || !sameAssignment(next.assignment, current.assignment)) {
      throw new RangeError('Study active trial 替换不能改变 trial/assignment 身份。');
    }
    return this.#commit(next).activeTrial;
  }

  open() {
    if (this.#state === 'destroyed') {
      throw new Error('HumanMatchStudyWorkspaceController 已销毁。');
    }
    if (this.#state === 'open') return this.getOperatorSnapshot();
    const workspace = createHumanMatchStudyWorkspace(
      this.#definition,
      this.#repository.open(),
    );
    this.#state = 'open';
    if (
      workspace.activeTrial?.phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING
      || workspace.activeTrial?.phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.REVIEWING
    ) {
      this.#replaceActive({
        ...workspace.activeTrial,
        phase: HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RECOVERY_REQUIRED,
        completedMatchCount: 0,
        terminalStatus: HUMAN_MATCH_STUDY_STATUS.INVALIDATED,
        terminationReason: HUMAN_MATCH_STUDY_TERMINATION_REASON.RUNNING_RECOVERED,
        packageReceipt: null,
      });
    }
    return this.getOperatorSnapshot();
  }

  getOperatorSnapshot() {
    this.#assertOpen();
    return this.#repository.getSnapshot();
  }

  getParticipantSnapshot() {
    this.#assertOpen();
    const workspace = this.#repository.getSnapshot();
    const active = workspace.activeTrial;
    return Object.freeze({
      definitionId: workspace.definitionId,
      definitionHash: workspace.definitionHash,
      phase: active?.phase ?? 'idle',
      participantId: active?.assignment.participantId ?? null,
      enrollmentIndex: active?.assignment.enrollmentIndex ?? null,
      completedMatchCount: active?.completedMatchCount ?? 0,
      totalMatchCount: this.#definition.matchesPerParticipant,
    });
  }

  enroll(value) {
    this.#assertOpen();
    const current = this.#repository.getSnapshot();
    if (current.activeTrial !== null) {
      throw new Error('已有 active Human Match Study trial，不能再次入组。');
    }
    const checkpoint = createEnrolledHumanMatchStudyCheckpoint(this.#definition, {
      ...value,
      enrollmentIndex: current.receipts.length,
    });
    return this.#commit(checkpoint).activeTrial;
  }

  start() {
    this.#assertOpen();
    const active = this.#repository.getSnapshot().activeTrial;
    if (active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.ENROLLED) {
      throw new Error('只有 enrolled Study trial 可以开始。');
    }
    return this.#replaceActive({
      ...active,
      phase: HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING,
    });
  }

  invalidateEnrolled() {
    this.#assertOpen();
    const active = this.#repository.getSnapshot().activeTrial;
    if (active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.ENROLLED) {
      throw new Error('只有 enrolled Study trial 可以在赛前作废。');
    }
    return this.#replaceActive({
      ...active,
      phase: HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.REVIEWING,
      completedMatchCount: 0,
      terminalStatus: HUMAN_MATCH_STUDY_STATUS.INVALIDATED,
      terminationReason: HUMAN_MATCH_STUDY_TERMINATION_REASON.PROTOCOL_DEVIATION,
    });
  }

  updateProgress(completedMatchCount) {
    this.#assertOpen();
    const active = this.#repository.getSnapshot().activeTrial;
    if (active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING) {
      throw new Error('只有 running Study trial 可以更新进度。');
    }
    if (
      !Number.isSafeInteger(completedMatchCount)
      || completedMatchCount < active.completedMatchCount
      || completedMatchCount > this.#definition.matchesPerParticipant
    ) throw new RangeError('Study completedMatchCount 必须单调且属于预注册范围。');
    if (completedMatchCount === active.completedMatchCount) return active;
    return this.#replaceActive({ ...active, completedMatchCount });
  }

  beginReview({ status, terminationReason, completedMatchCount }) {
    this.#assertOpen();
    const active = this.#repository.getSnapshot().activeTrial;
    if (active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING) {
      throw new Error('只有 running Study trial 可以进入复核。');
    }
    return this.#replaceActive({
      ...active,
      phase: HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.REVIEWING,
      completedMatchCount,
      terminalStatus: status,
      terminationReason,
    });
  }

  createCapturePackage({ matches, selfReport }) {
    this.#assertOpen();
    const active = this.#repository.getSnapshot().activeTrial;
    if (
      active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.REVIEWING
      && active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RECOVERY_REQUIRED
    ) throw new Error('只有 reviewing/recovery-required Study trial 可以生成采集包。');
    return createHumanMatchStudyCapturePackage(this.#definition, {
      recordId: active.trialId,
      definitionId: this.#definition.id,
      definitionHash: this.#definition.getContentHash(),
      commit: active.commit,
      buildId: active.buildId,
      performedAt: active.performedAt,
      operatorId: active.operatorId,
      assignment: active.assignment,
      status: active.terminalStatus,
      terminationReason: active.terminationReason,
      environment: active.environment,
      eligibility: active.eligibility,
      matches,
      selfReport,
    });
  }

  markExportPending(packageValue, packageReceipt) {
    this.#assertOpen();
    const active = this.#repository.getSnapshot().activeTrial;
    if (
      active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.REVIEWING
      && active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RECOVERY_REQUIRED
    ) throw new Error('当前 Study trial 不能登记导出。');
    const capturePackage = validateHumanMatchStudyCapturePackage(
      this.#definition,
      packageValue,
    );
    if (
      capturePackage.recordId !== active.trialId
      || !sameAssignment(capturePackage.assignment, active.assignment)
      || capturePackage.status !== active.terminalStatus
      || capturePackage.terminationReason !== active.terminationReason
      || capturePackage.matches.length !== active.completedMatchCount
      || packageReceipt?.packageId !== capturePackage.packageId
    ) throw new RangeError('CapturePackage/receipt 与 active Study trial 不一致。');
    return this.#replaceActive({
      ...active,
      phase: HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.EXPORT_PENDING,
      packageReceipt,
    });
  }

  requireRecovery() {
    this.#assertOpen();
    const active = this.#repository.getSnapshot().activeTrial;
    if (active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.EXPORT_PENDING) {
      throw new Error('只有 export-pending Study trial 可以声明导出文件丢失。');
    }
    return this.#replaceActive({
      ...active,
      phase: HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RECOVERY_REQUIRED,
      completedMatchCount: 0,
      terminalStatus: HUMAN_MATCH_STUDY_STATUS.INVALIDATED,
      terminationReason: HUMAN_MATCH_STUDY_TERMINATION_REASON.RUNNING_RECOVERED,
      packageReceipt: null,
    });
  }

  confirmExport(confirmedAt) {
    this.#assertOpen();
    const current = this.#repository.getSnapshot();
    if (current.activeTrial?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.EXPORT_PENDING) {
      throw new Error('只有 export-pending Study trial 可以确认归档。');
    }
    const receipt = createHumanMatchStudyReceipt(
      this.#definition,
      current.activeTrial,
      confirmedAt,
    );
    const committed = this.#commit(null, [...current.receipts, receipt]);
    return committed.receipts[committed.receipts.length - 1];
  }

  renewLease() {
    this.#assertOpen();
    if (this.#repository.renewLease() !== true) {
      throw new Error('Human Match Study workspace lease 续约未确认。');
    }
    return true;
  }

  destroy() {
    if (this.#state === 'destroyed') return;
    if (this.#committing) {
      throw new Error('写入期间不能销毁 HumanMatchStudyWorkspaceController。');
    }
    this.#repository.destroy();
    this.#definition = null;
    this.#repository = null;
    this.#state = 'destroyed';
  }
}
