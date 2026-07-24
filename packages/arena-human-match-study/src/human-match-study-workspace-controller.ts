import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import {
  createHumanMatchStudyCapturePackage,
  validateHumanMatchStudyCapturePackage,
  type HumanMatchStudyCapturePackage,
} from './human-match-study-capture-package.js';
import {
  createHumanMatchStudyDefinition,
  type HumanMatchStudyDefinition,
} from './human-match-study-definition.js';
import {
  HUMAN_MATCH_STUDY_STATUS,
  HUMAN_MATCH_STUDY_TERMINATION_REASON,
} from './human-match-study-record.js';
import {
  HUMAN_MATCH_STUDY_CHECKPOINT_PHASE,
  advanceHumanMatchStudyWorkspace,
  createEnrolledHumanMatchStudyCheckpoint,
  createHumanMatchStudyCheckpoint,
  createHumanMatchStudyReceipt,
  createHumanMatchStudyWorkspace,
  type HumanMatchStudyCheckpoint,
  type HumanMatchStudyPackageReceipt,
  type HumanMatchStudyReceipt,
  type HumanMatchStudyWorkspace,
} from './human-match-study-workspace.js';
import type {
  HumanMatchStudyWorkspaceCommitFailureReason,
  HumanMatchStudyWorkspaceCommitResult,
} from './human-match-study-workspace-repository.js';

const OPTION_KEYS = new Set(['definition', 'repository']);
const REVIEW_KEYS = new Set(['status', 'terminationReason', 'completedMatchCount']);
const CAPTURE_KEYS = new Set(['matches', 'selfReport']);
const COMMIT_RESULT_KEYS = new Set(['committed', 'reason', 'headUpdated']);
const COMMIT_FAILURE_REASONS = new Set([
  'memory-revision-mismatch',
  'storage-revision-mismatch',
  'slot-readback-failed',
  'slot-write-failed',
]);

type ControllerState = 'created' | 'opening' | 'open' | 'failed' | 'destroyed';

export interface HumanMatchStudyWorkspaceRepositoryPort {
  open(): HumanMatchStudyWorkspace;
  getSnapshot(): HumanMatchStudyWorkspace;
  compareAndSet(
    nextValue: unknown,
    expectedRevisionValue: unknown,
  ): HumanMatchStudyWorkspaceCommitResult;
  renewLease(): boolean;
  destroy(): void;
}

export interface HumanMatchStudyWorkspaceControllerOptions {
  readonly definition: unknown;
  readonly repository: unknown;
}

export interface HumanMatchStudyWorkspaceParticipantSnapshot {
  readonly definitionId: string;
  readonly definitionHash: string;
  readonly phase: HumanMatchStudyCheckpoint['phase'] | 'idle';
  readonly participantId: string | null;
  readonly enrollmentIndex: number | null;
  readonly completedMatchCount: number;
  readonly totalMatchCount: number;
}

function requiredDataField(
  descriptors: Record<string, PropertyDescriptor>,
  key: string,
  label: string,
): unknown {
  const descriptor = descriptors[key];
  if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
    throw new TypeError(`${label}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function bindMethod(
  value: object,
  name: keyof HumanMatchStudyWorkspaceRepositoryPort,
): (...args: readonly unknown[]) => unknown {
  let current: object | null = value;
  while (current) {
    const descriptor = Object.getOwnPropertyDescriptor(current, name);
    if (descriptor) {
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')
        || typeof descriptor.value !== 'function') {
        throw new TypeError(`Study repository.${name} 必须是数据方法。`);
      }
      return descriptor.value.bind(value) as (...args: readonly unknown[]) => unknown;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  throw new TypeError(`Study repository 缺少 ${name}()。`);
}

function validateRepository(value: unknown): Readonly<HumanMatchStudyWorkspaceRepositoryPort> {
  if (!value || typeof value !== 'object') {
    throw new TypeError('HumanMatchStudyWorkspaceController.repository 无效。');
  }
  return Object.freeze({
    open: bindMethod(value, 'open') as () => HumanMatchStudyWorkspace,
    getSnapshot: bindMethod(value, 'getSnapshot') as () => HumanMatchStudyWorkspace,
    compareAndSet: bindMethod(value, 'compareAndSet') as (
      nextValue: unknown,
      expectedRevisionValue: unknown,
    ) => HumanMatchStudyWorkspaceCommitResult,
    renewLease: bindMethod(value, 'renewLease') as () => boolean,
    destroy: bindMethod(value, 'destroy') as () => void,
  });
}

function normalizeOptions(value: unknown): Readonly<HumanMatchStudyWorkspaceControllerOptions> {
  assertKnownKeys(value, OPTION_KEYS, 'HumanMatchStudyWorkspaceController options');
  const descriptors = Object.getOwnPropertyDescriptors(value as object);
  return Object.freeze({
    definition: requiredDataField(
      descriptors,
      'definition',
      'HumanMatchStudyWorkspaceController options',
    ),
    repository: requiredDataField(
      descriptors,
      'repository',
      'HumanMatchStudyWorkspaceController options',
    ),
  });
}

function sameAssignment(
  left: HumanMatchStudyCheckpoint['assignment'],
  right: HumanMatchStudyCheckpoint['assignment'],
): boolean {
  return left.assignmentId === right.assignmentId
    && left.participantId === right.participantId
    && left.enrollmentIndex === right.enrollmentIndex;
}

function requireActive(
  value: HumanMatchStudyCheckpoint | null,
  message = '没有 active Human Match Study trial。',
): HumanMatchStudyCheckpoint {
  if (value === null) throw new Error(message);
  return value;
}

function validateCommitResult(value: unknown): HumanMatchStudyWorkspaceCommitResult {
  const source = cloneFrozenData(value, 'HumanMatchStudyWorkspaceController commit result');
  assertKnownKeys(
    source,
    COMMIT_RESULT_KEYS,
    'HumanMatchStudyWorkspaceController commit result',
  );
  if (typeof source.committed !== 'boolean' || typeof source.headUpdated !== 'boolean') {
    throw new TypeError('Human Match Study workspace CAS 返回了非法布尔字段。');
  }
  if (source.committed) {
    if (source.reason !== null) {
      throw new RangeError('成功的 Human Match Study workspace CAS 不能包含失败原因。');
    }
    return Object.freeze({ committed: true, reason: null, headUpdated: source.headUpdated });
  }
  if (source.headUpdated || !COMMIT_FAILURE_REASONS.has(source.reason as string)) {
    throw new RangeError('失败的 Human Match Study workspace CAS 返回值无效。');
  }
  return Object.freeze({
    committed: false,
    reason: source.reason as HumanMatchStudyWorkspaceCommitFailureReason,
    headUpdated: false,
  });
}

export class HumanMatchStudyWorkspaceController {
  #definition: HumanMatchStudyDefinition | null;
  #repository: Readonly<HumanMatchStudyWorkspaceRepositoryPort> | null;
  #state: ControllerState = 'created';
  #committing = false;

  constructor(optionsValue: HumanMatchStudyWorkspaceControllerOptions | unknown) {
    const options = normalizeOptions(optionsValue);
    this.#definition = createHumanMatchStudyDefinition(options.definition);
    this.#repository = validateRepository(options.repository);
    Object.freeze(this);
  }

  #requireDefinition(): HumanMatchStudyDefinition {
    if (!this.#definition) throw new Error('HumanMatchStudyWorkspaceController 已销毁。');
    return this.#definition;
  }

  #requireRepository(): Readonly<HumanMatchStudyWorkspaceRepositoryPort> {
    if (!this.#repository) throw new Error('HumanMatchStudyWorkspaceController 已销毁。');
    return this.#repository;
  }

  #assertOpen(): void {
    if (this.#state === 'destroyed') {
      throw new Error('HumanMatchStudyWorkspaceController 已销毁。');
    }
    if (this.#state === 'failed') {
      throw new Error('HumanMatchStudyWorkspaceController 已失败关闭。');
    }
    if (this.#state !== 'open') {
      throw new Error('HumanMatchStudyWorkspaceController 尚未打开。');
    }
    if (this.#committing) {
      throw new Error('HumanMatchStudyWorkspaceController 状态转换不可重入。');
    }
  }

  #commit(
    activeTrial: HumanMatchStudyCheckpoint | null,
    receipts: readonly HumanMatchStudyReceipt[] | null = null,
  ): HumanMatchStudyWorkspace {
    this.#assertOpen();
    const repository = this.#requireRepository();
    const current = createHumanMatchStudyWorkspace(
      this.#requireDefinition(),
      repository.getSnapshot(),
    );
    const next = advanceHumanMatchStudyWorkspace(this.#requireDefinition(), current, {
      activeTrial,
      receipts: receipts ?? current.receipts,
    });
    this.#committing = true;
    try {
      const result = validateCommitResult(repository.compareAndSet(next, current.revision));
      if (result.committed !== true) {
        throw new Error(
          `Human Match Study workspace CAS 未提交：${String(result.reason ?? 'unknown')}。`,
        );
      }
      return createHumanMatchStudyWorkspace(
        this.#requireDefinition(),
        repository.getSnapshot(),
      );
    } catch (error) {
      this.#state = 'failed';
      throw normalizeThrownError(error, 'HumanMatchStudyWorkspaceController 提交失败');
    } finally {
      this.#committing = false;
    }
  }

  #replaceActive(value: unknown): HumanMatchStudyCheckpoint {
    const current = requireActive(this.#requireRepository().getSnapshot().activeTrial);
    const next = createHumanMatchStudyCheckpoint(this.#requireDefinition(), value);
    if (next.trialId !== current.trialId || !sameAssignment(next.assignment, current.assignment)) {
      throw new RangeError('Study active trial 替换不能改变 trial/assignment 身份。');
    }
    return requireActive(this.#commit(next).activeTrial);
  }

  open(): HumanMatchStudyWorkspace {
    if (this.#state === 'destroyed') {
      throw new Error('HumanMatchStudyWorkspaceController 已销毁。');
    }
    if (this.#state === 'failed') {
      throw new Error('HumanMatchStudyWorkspaceController 已失败关闭。');
    }
    if (this.#state === 'opening') {
      throw new Error('HumanMatchStudyWorkspaceController 打开不可重入。');
    }
    if (this.#state === 'open') return this.getOperatorSnapshot();
    this.#state = 'opening';
    try {
      const workspace = createHumanMatchStudyWorkspace(
        this.#requireDefinition(),
        this.#requireRepository().open(),
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
    } catch (error) {
      this.#state = 'failed';
      throw normalizeThrownError(error, 'HumanMatchStudyWorkspaceController 打开失败');
    }
  }

  getOperatorSnapshot(): HumanMatchStudyWorkspace {
    this.#assertOpen();
    return createHumanMatchStudyWorkspace(
      this.#requireDefinition(),
      this.#requireRepository().getSnapshot(),
    );
  }

  getParticipantSnapshot(): Readonly<HumanMatchStudyWorkspaceParticipantSnapshot> {
    this.#assertOpen();
    const workspace = this.#requireRepository().getSnapshot();
    const active = workspace.activeTrial;
    return Object.freeze({
      definitionId: workspace.definitionId,
      definitionHash: workspace.definitionHash,
      phase: active?.phase ?? 'idle',
      participantId: active?.assignment.participantId ?? null,
      enrollmentIndex: active?.assignment.enrollmentIndex ?? null,
      completedMatchCount: active?.completedMatchCount ?? 0,
      totalMatchCount: this.#requireDefinition().matchesPerParticipant,
    });
  }

  enroll(value: unknown): HumanMatchStudyCheckpoint {
    this.#assertOpen();
    const current = this.#requireRepository().getSnapshot();
    if (current.activeTrial !== null) {
      throw new Error('已有 active Human Match Study trial，不能再次入组。');
    }
    const enrollment = assertPlainRecord(
      cloneFrozenData(value, 'Human Match Study enrollment'),
      'Human Match Study enrollment',
    );
    const checkpoint = createEnrolledHumanMatchStudyCheckpoint(this.#requireDefinition(), {
      ...enrollment,
      enrollmentIndex: current.receipts.length,
    });
    return requireActive(this.#commit(checkpoint).activeTrial);
  }

  start(): HumanMatchStudyCheckpoint {
    this.#assertOpen();
    const active = this.#requireRepository().getSnapshot().activeTrial;
    if (active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.ENROLLED) {
      throw new Error('只有 enrolled Study trial 可以开始。');
    }
    return this.#replaceActive({
      ...active,
      phase: HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING,
    });
  }

  invalidateEnrolled(): HumanMatchStudyCheckpoint {
    this.#assertOpen();
    const active = this.#requireRepository().getSnapshot().activeTrial;
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

  updateProgress(completedMatchCount: unknown): HumanMatchStudyCheckpoint {
    this.#assertOpen();
    const active = this.#requireRepository().getSnapshot().activeTrial;
    if (active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING) {
      throw new Error('只有 running Study trial 可以更新进度。');
    }
    if (
      !Number.isSafeInteger(completedMatchCount)
      || (completedMatchCount as number) < active.completedMatchCount
      || (completedMatchCount as number) > this.#requireDefinition().matchesPerParticipant
    ) throw new RangeError('Study completedMatchCount 必须单调且属于预注册范围。');
    if (completedMatchCount === active.completedMatchCount) return active;
    return this.#replaceActive({ ...active, completedMatchCount });
  }

  beginReview(value: unknown): HumanMatchStudyCheckpoint {
    this.#assertOpen();
    const source = cloneFrozenData(value, 'Human Match Study review');
    assertKnownKeys(source, REVIEW_KEYS, 'Human Match Study review');
    const active = this.#requireRepository().getSnapshot().activeTrial;
    if (active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING) {
      throw new Error('只有 running Study trial 可以进入复核。');
    }
    return this.#replaceActive({
      ...active,
      phase: HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.REVIEWING,
      completedMatchCount: source.completedMatchCount,
      terminalStatus: source.status,
      terminationReason: source.terminationReason,
    });
  }

  createCapturePackage(value: unknown): HumanMatchStudyCapturePackage {
    this.#assertOpen();
    const source = cloneFrozenData(value, 'Human Match Study capture options');
    assertKnownKeys(source, CAPTURE_KEYS, 'Human Match Study capture options');
    const active = this.#requireRepository().getSnapshot().activeTrial;
    if (
      active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.REVIEWING
      && active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RECOVERY_REQUIRED
    ) throw new Error('只有 reviewing/recovery-required Study trial 可以生成采集包。');
    return createHumanMatchStudyCapturePackage(this.#requireDefinition(), {
      recordId: active.trialId,
      definitionId: this.#requireDefinition().id,
      definitionHash: this.#requireDefinition().getContentHash(),
      commit: active.commit,
      buildId: active.buildId,
      performedAt: active.performedAt,
      operatorId: active.operatorId,
      assignment: active.assignment,
      status: active.terminalStatus,
      terminationReason: active.terminationReason,
      environment: active.environment,
      eligibility: active.eligibility,
      matches: source.matches,
      selfReport: source.selfReport,
    });
  }

  markExportPending(
    packageValue: unknown,
    packageReceiptValue: unknown,
  ): HumanMatchStudyCheckpoint {
    this.#assertOpen();
    const active = this.#requireRepository().getSnapshot().activeTrial;
    if (
      active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.REVIEWING
      && active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RECOVERY_REQUIRED
    ) throw new Error('当前 Study trial 不能登记导出。');
    const capturePackage = validateHumanMatchStudyCapturePackage(
      this.#requireDefinition(),
      packageValue,
    );
    const packageReceipt = assertPlainRecord(
      cloneFrozenData(packageReceiptValue, 'Human Match Study package receipt'),
      'Human Match Study package receipt',
    ) as unknown as HumanMatchStudyPackageReceipt;
    if (
      capturePackage.recordId !== active.trialId
      || !sameAssignment(capturePackage.assignment, active.assignment)
      || capturePackage.status !== active.terminalStatus
      || capturePackage.terminationReason !== active.terminationReason
      || capturePackage.matches.length !== active.completedMatchCount
      || packageReceipt.packageId !== capturePackage.packageId
    ) throw new RangeError('CapturePackage/receipt 与 active Study trial 不一致。');
    return this.#replaceActive({
      ...active,
      phase: HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.EXPORT_PENDING,
      packageReceipt,
    });
  }

  requireRecovery(): HumanMatchStudyCheckpoint {
    this.#assertOpen();
    const active = this.#requireRepository().getSnapshot().activeTrial;
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

  confirmExport(confirmedAt: unknown): HumanMatchStudyReceipt {
    this.#assertOpen();
    const current = this.#requireRepository().getSnapshot();
    if (current.activeTrial?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.EXPORT_PENDING) {
      throw new Error('只有 export-pending Study trial 可以确认归档。');
    }
    const receipt = createHumanMatchStudyReceipt(
      this.#requireDefinition(),
      current.activeTrial,
      confirmedAt,
    );
    const committed = this.#commit(null, [...current.receipts, receipt]);
    const confirmed = committed.receipts[committed.receipts.length - 1];
    if (!confirmed) throw new Error('Human Match Study 归档回执提交后缺失。');
    return confirmed;
  }

  renewLease(): true {
    this.#assertOpen();
    try {
      if (this.#requireRepository().renewLease() !== true) {
        throw new Error('Human Match Study workspace lease 续约未确认。');
      }
      return true;
    } catch (error) {
      this.#state = 'failed';
      throw normalizeThrownError(error, 'HumanMatchStudyWorkspaceController 续租失败');
    }
  }

  destroy(): void {
    if (this.#state === 'destroyed') return;
    if (this.#state === 'opening' || this.#committing) {
      throw new Error('活动操作期间不能销毁 HumanMatchStudyWorkspaceController。');
    }
    try {
      this.#requireRepository().destroy();
    } catch (error) {
      this.#state = 'failed';
      throw normalizeThrownError(error, 'HumanMatchStudyWorkspaceController 销毁失败');
    }
    this.#definition = null;
    this.#repository = null;
    this.#state = 'destroyed';
  }
}
