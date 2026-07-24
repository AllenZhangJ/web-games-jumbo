import {
  assertKnownKeys,
  combineCleanupFailure,
  createDeterministicDataHash,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import {
  createInputPilotAggregateExport,
  createInputPilotAuditExport,
} from './input-pilot-export.js';
import {
  createInputPilotDefinition,
  type InputPilotDefinition,
} from './input-pilot-definition.js';
import type { InputPilotRecord } from './input-pilot-record.js';
import {
  createInputPilotReviewDraft,
  type InputPilotReviewDraft,
} from './input-pilot-review-draft.js';
import {
  INPUT_PILOT_RUNTIME_STATE,
  validateInputPilotRuntime,
  validateInputPilotRuntimeFactory,
  validateInputPilotRuntimeStatus,
  type InputPilotRuntimeFactory,
  type InputPilotRuntimePort,
} from './input-pilot-runtime-ports.js';
import {
  invalidateInputPilotTrial,
  reviewInputPilotTrial,
  startInputPilotTrial,
  submitInputPilotTrialReview,
  updateInputPilotReviewDraft,
} from './input-pilot-trial-state.js';
import {
  INPUT_PILOT_TRIAL_PHASE,
  type InputPilotTerminationReason,
  type InputPilotTrialCheckpoint,
} from './input-pilot-trial-checkpoint.js';
import {
  INPUT_PILOT_TERMINATION_REASON,
  INPUT_PILOT_TRIAL_CONTROLLER_STATE,
  type InputPilotTrialControllerState,
} from './input-pilot-vocabulary.js';
import type { InputPilotWorkspace } from './input-pilot-workspace.js';
import { InputPilotWorkspaceCoordinator } from './input-pilot-workspace-coordinator.js';

export { INPUT_PILOT_TRIAL_CONTROLLER_STATE } from './input-pilot-vocabulary.js';

const CONTROLLER_OPTION_KEYS = new Set(['definition', 'repository', 'runtimeFactory']);
const SUBMISSION_KEYS = new Set(['observer', 'selfReport', 'invalidate']);

export interface InputPilotTrialControllerSnapshot {
  readonly state: InputPilotTrialControllerState;
  readonly workspace: InputPilotWorkspace | null;
  readonly lastRecord: InputPilotRecord | null;
  readonly lastError: Readonly<{ name: string; message: string }> | null;
}

function normalizeSubmission(value: unknown): InputPilotReviewDraft {
  if (value === null || value === undefined) {
    throw new Error('Pilot review submission 缺失。');
  }
  assertKnownKeys(value, SUBMISSION_KEYS, 'InputPilotTrialController submission');
  const invalidate = Object.hasOwn(value, 'invalidate') ? value.invalidate : false;
  if (typeof invalidate !== 'boolean') {
    throw new TypeError('InputPilotTrialController submission.invalidate 必须是布尔值。');
  }
  return createInputPilotReviewDraft({
    observer: value.observer,
    selfReport: value.selfReport,
    invalidate,
  });
}

function submissionHash(submission: InputPilotReviewDraft): string {
  return createDeterministicDataHash(submission, 'InputPilot review submission');
}

export class InputPilotTrialController {
  #definition: InputPilotDefinition | null;
  #coordinator: InputPilotWorkspaceCoordinator | null;
  #runtimeFactory: InputPilotRuntimeFactory | null;
  #runtime: InputPilotRuntimePort | null;
  #state: InputPilotTrialControllerState;
  #startPromise: Promise<InputPilotTrialControllerSnapshot> | null;
  #transitioning: boolean;
  #destroyRequested: boolean;
  #pauseRequested: boolean;
  #lastRecord: InputPilotRecord | null;
  #lastSubmissionHash: string | null;
  #lastError: Error | null;
  #pendingRuntimeFailure: Error | null;

  constructor(optionsValue: unknown) {
    assertKnownKeys(optionsValue, CONTROLLER_OPTION_KEYS, 'InputPilotTrialController options');
    const definition = createInputPilotDefinition(optionsValue.definition);
    const runtimeFactory = validateInputPilotRuntimeFactory(optionsValue.runtimeFactory);
    this.#definition = definition;
    this.#coordinator = new InputPilotWorkspaceCoordinator({
      definition,
      repository: optionsValue.repository,
    });
    this.#runtimeFactory = runtimeFactory;
    this.#runtime = null;
    this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.CREATED;
    this.#startPromise = null;
    this.#transitioning = false;
    this.#destroyRequested = false;
    this.#pauseRequested = false;
    this.#lastRecord = null;
    this.#lastSubmissionHash = null;
    this.#lastError = null;
    this.#pendingRuntimeFailure = null;
    Object.freeze(this);
  }

  get state(): InputPilotTrialControllerState {
    return this.#state;
  }

  #requireDefinition(): InputPilotDefinition {
    if (this.#definition === null) throw new Error('InputPilotTrialController 已销毁。');
    return this.#definition;
  }

  #requireCoordinator(): InputPilotWorkspaceCoordinator {
    if (this.#coordinator === null) throw new Error('InputPilotTrialController workspace 已释放。');
    return this.#coordinator;
  }

  #requireRuntimeFactory(): InputPilotRuntimeFactory {
    if (this.#runtimeFactory === null) throw new Error('InputPilotTrialController 已销毁。');
    return this.#runtimeFactory;
  }

  #requireRuntime(): InputPilotRuntimePort {
    if (this.#runtime === null) throw new Error('InputPilotTrialController runtime 缺失。');
    return this.#runtime;
  }

  #assertUsable(): void {
    if (this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED) {
      throw new Error('InputPilotTrialController 已销毁。');
    }
    if (this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.FAILED) {
      const error = new Error('InputPilotTrialController 已失败。');
      error.cause = this.#lastError;
      throw error;
    }
    if (this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.CREATED) {
      throw new Error('InputPilotTrialController 尚未打开。');
    }
    if (this.#transitioning) throw new Error('InputPilotTrialController 状态转换不可重入。');
  }

  #activeTrial(): InputPilotTrialCheckpoint | null {
    return this.#requireCoordinator().getSnapshot().activeTrial;
  }

  #releaseRuntime(): Error[] {
    if (this.#runtime === null) return [];
    try {
      this.#runtime.destroy();
      this.#runtime = null;
      this.#pauseRequested = false;
      return [];
    } catch (error) {
      return [normalizeThrownError(error, 'pilot runtime 清理失败')];
    }
  }

  #cleanupOwnedResources(): Error[] {
    const runtimeErrors = this.#releaseRuntime();
    if (runtimeErrors.length > 0) return runtimeErrors;
    if (this.#coordinator === null) return [];
    try {
      this.#coordinator.destroy();
      this.#coordinator = null;
      return [];
    } catch (error) {
      return [normalizeThrownError(error, 'pilot workspace 清理失败')];
    }
  }

  #cleanupFailure(message: string, errors: readonly Error[]): Error {
    const failure = new Error(message) as Error & { cleanupErrors?: readonly Error[] };
    failure.cleanupErrors = Object.freeze([...errors]);
    this.#lastError = failure;
    this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.FAILED;
    return failure;
  }

  #fatal(error: unknown, message: string): Error {
    const failure = normalizeThrownError(error, message);
    const cleanupErrors = this.#cleanupOwnedResources();
    this.#lastError = combineCleanupFailure(
      failure,
      cleanupErrors,
      `${message}且清理未完整完成。`,
    );
    this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.FAILED;
    return this.#lastError;
  }

  #invalidateActive(
    terminationReason: InputPilotTerminationReason,
    automated: unknown = null,
  ): InputPilotRecord {
    const active = this.#activeTrial();
    if (active === null) throw new Error('没有 active pilot trial 可作废。');
    const record = invalidateInputPilotTrial(this.#requireDefinition(), active, {
      terminationReason,
      automated,
    });
    const committed = this.#requireCoordinator().completeActive(record);
    this.#lastRecord = committed;
    this.#lastSubmissionHash = null;
    this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL;
    const cleanupErrors = this.#releaseRuntime();
    if (cleanupErrors.length > 0) {
      throw this.#cleanupFailure(
        'Pilot trial 已作废，但运行时清理未完整完成。',
        cleanupErrors,
      );
    }
    return committed;
  }

  #invalidateRuntimeFailure(originalError: unknown): InputPilotRecord {
    let automated: unknown = null;
    try {
      automated = this.#runtime?.finalizeMetrics() ?? null;
    } catch {
      automated = null;
    }
    try {
      return this.#invalidateActive(INPUT_PILOT_TERMINATION_REASON.RUNTIME_FAILED, automated);
    } catch (invalidationError) {
      const failure = normalizeThrownError(originalError, 'pilot runtime 失败') as Error & {
        invalidationError?: unknown;
      };
      failure.invalidationError = invalidationError;
      throw this.#fatal(failure, 'Pilot runtime 失败且无法提交作废记录');
    }
  }

  open(): InputPilotTrialControllerSnapshot {
    if (this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED) {
      throw new Error('InputPilotTrialController 已销毁。');
    }
    if (this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.CREATED) {
      return this.getSnapshot();
    }
    try {
      const workspace = this.#requireCoordinator().open();
      const active = workspace.activeTrial;
      if (active === null) {
        this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.IDLE;
      } else if (active.phase === INPUT_PILOT_TRIAL_PHASE.ENROLLED) {
        this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.ENROLLED;
      } else if (active.phase === INPUT_PILOT_TRIAL_PHASE.REVIEWING) {
        this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING;
      } else {
        this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING;
        this.#invalidateActive(INPUT_PILOT_TERMINATION_REASON.RUNNING_RECOVERED);
      }
      return this.getSnapshot();
    } catch (error) {
      throw this.#fatal(error, 'InputPilotTrialController 打开失败');
    }
  }

  getSnapshot(): InputPilotTrialControllerSnapshot {
    let workspace: InputPilotWorkspace | null = null;
    if (
      this.#coordinator !== null
      && this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.CREATED
      && this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED
    ) {
      if (this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.FAILED) {
        try {
          workspace = this.#coordinator.getSnapshot();
        } catch {
          workspace = null;
        }
      } else {
        workspace = this.#coordinator.getSnapshot();
      }
    }
    return Object.freeze({
      state: this.#state,
      workspace,
      lastRecord: this.#lastRecord,
      lastError: this.#lastError === null ? null : Object.freeze({
        name: this.#lastError.name,
        message: this.#lastError.message,
      }),
    });
  }

  enroll(optionsValue: unknown): InputPilotTrialCheckpoint {
    this.#assertUsable();
    if (
      this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.IDLE
      && this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL
    ) throw new Error('只有 idle/terminal Pilot Controller 可以入组下一位受测者。');
    const checkpoint = this.#requireCoordinator().enroll(optionsValue);
    this.#lastRecord = null;
    this.#lastSubmissionHash = null;
    this.#lastError = null;
    this.#pendingRuntimeFailure = null;
    this.#pauseRequested = false;
    this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.ENROLLED;
    return checkpoint;
  }

  startTrial(): Promise<InputPilotTrialControllerSnapshot> {
    this.#assertUsable();
    if (this.#startPromise !== null) return this.#startPromise;
    if (this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.ENROLLED) {
      return Promise.reject(new Error('只有 enrolled Pilot Controller 可以启动比赛。'));
    }
    const definition = this.#requireDefinition();
    const running = startInputPilotTrial(definition, this.#activeTrial());
    this.#requireCoordinator().replaceActive(running);
    this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.STARTING;

    const operation = Promise.resolve().then(async () => {
      let runtime: InputPilotRuntimePort | null = null;
      try {
        if (this.#destroyRequested) throw new Error('Pilot trial 启动已取消。');
        runtime = validateInputPilotRuntime(this.#requireRuntimeFactory()(Object.freeze({
          definition,
          checkpoint: running,
          mapperId: running.assignment.mapperId,
          matchSeed: running.assignment.matchSeed,
          onProgress: (reviewDraft: unknown = null) => {
            if (
              this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING
              || this.#transitioning
            ) return false;
            try {
              this.synchronize(reviewDraft);
              return true;
            } catch (error) {
              this.#lastError = normalizeThrownError(error, 'pilot progress 同步失败');
              return false;
            }
          },
          onFailure: (error: unknown) => this.reportRuntimeFailure(error),
        })));
        this.#runtime = runtime;
        await runtime.start();
        if (
          this.#destroyRequested
          || this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED
        ) throw new Error('Pilot trial 启动已取消。');
        if (this.#pendingRuntimeFailure !== null) throw this.#pendingRuntimeFailure;
        if (this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.STARTING) {
          throw new Error(`Pilot trial 启动期间意外进入 ${this.#state}。`);
        }
        if (this.#pauseRequested) runtime.setPaused(true);
        this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING;
        this.synchronize();
        return this.getSnapshot();
      } catch (error) {
        if (
          this.#destroyRequested
          || this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED
        ) throw normalizeThrownError(error, 'Pilot trial 启动已取消');
        if (this.#runtime === null && runtime !== null) this.#runtime = runtime;
        this.#invalidateRuntimeFailure(error);
        throw normalizeThrownError(error, 'Pilot trial 启动失败');
      } finally {
        this.#startPromise = null;
      }
    });
    this.#startPromise = operation;
    return operation;
  }

  #transitionToReview(
    terminationReason: InputPilotTerminationReason,
    reviewDraft: unknown = null,
  ): InputPilotTrialCheckpoint {
    this.#transitioning = true;
    try {
      const automated = this.#requireRuntime().finalizeMetrics();
      if (this.#pendingRuntimeFailure !== null) throw this.#pendingRuntimeFailure;
      const reviewing = reviewInputPilotTrial(this.#requireDefinition(), this.#activeTrial(), {
        automated,
        terminationReason,
        reviewDraft,
      });
      const committed = this.#requireCoordinator().replaceActive(reviewing);
      this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING;
      const cleanupErrors = this.#releaseRuntime();
      if (cleanupErrors.length > 0) {
        throw this.#cleanupFailure(
          'Pilot trial 已进入复核，但运行时清理未完整完成。',
          cleanupErrors,
        );
      }
      return committed;
    } catch (error) {
      if (
        this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING
        || this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.FAILED
      ) throw error;
      this.#invalidateRuntimeFailure(error);
      throw normalizeThrownError(error, 'Pilot trial 进入复核失败');
    } finally {
      this.#transitioning = false;
      this.#pendingRuntimeFailure = null;
    }
  }

  synchronize(reviewDraft: unknown = null): InputPilotTrialControllerSnapshot {
    this.#assertUsable();
    if (this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING) {
      return this.getSnapshot();
    }
    const status = validateInputPilotRuntimeStatus(this.#requireRuntime().getStatus());
    if (status.timedOut) {
      this.#transitionToReview(
        INPUT_PILOT_TERMINATION_REASON.MAXIMUM_DURATION_REACHED,
        reviewDraft,
      );
    } else if (status.state === INPUT_PILOT_RUNTIME_STATE.RESULT) {
      this.#transitionToReview(INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED, reviewDraft);
    } else if (
      status.state === INPUT_PILOT_RUNTIME_STATE.FAILED
      || status.state === INPUT_PILOT_RUNTIME_STATE.DESTROYED
    ) {
      const error = new Error(`Pilot runtime 意外进入 ${status.state}。`);
      this.#invalidateRuntimeFailure(error);
      throw error;
    } else if (status.state !== INPUT_PILOT_RUNTIME_STATE.RUNNING) {
      const error = new Error(`Pilot runtime 启动后仍处于 ${status.state}。`);
      this.#invalidateRuntimeFailure(error);
      throw error;
    }
    return this.getSnapshot();
  }

  reportRuntimeFailure(error: unknown): boolean {
    if (
      this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.STARTING
      && this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING
    ) return false;
    const failure = normalizeThrownError(error, 'pilot runtime 失败');
    if (this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.STARTING || this.#transitioning) {
      this.#pendingRuntimeFailure ??= failure;
      return true;
    }
    this.#invalidateRuntimeFailure(failure);
    return true;
  }

  abandonTrial(reviewDraft: unknown = null): InputPilotRecord | InputPilotTrialCheckpoint {
    this.#assertUsable();
    if (this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.ENROLLED) {
      return this.#invalidateActive(INPUT_PILOT_TERMINATION_REASON.PROTOCOL_DEVIATION);
    }
    if (this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING) {
      throw new Error('只有 enrolled/running pilot trial 可以放弃。');
    }
    return this.#transitionToReview(
      INPUT_PILOT_TERMINATION_REASON.PARTICIPANT_ABANDONED,
      reviewDraft,
    );
  }

  saveReviewDraft(value: unknown): InputPilotReviewDraft | false {
    this.#assertUsable();
    if (this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING) return false;
    const active = this.#activeTrial();
    if (active === null) throw new Error('reviewing pilot trial 缺失。');
    const next = updateInputPilotReviewDraft(this.#requireDefinition(), active, value);
    if (
      createDeterministicDataHash(active.reviewDraft, 'current pilot review draft')
      === createDeterministicDataHash(next.reviewDraft, 'next pilot review draft')
    ) {
      if (active.reviewDraft === null) throw new Error('reviewing pilot reviewDraft 缺失。');
      return active.reviewDraft;
    }
    const committed = this.#requireCoordinator().replaceActive(next).reviewDraft;
    if (committed === null) throw new Error('Pilot reviewDraft 提交后意外缺失。');
    return committed;
  }

  submitReview(value: unknown = null): InputPilotRecord {
    this.#assertUsable();
    const lastRecord = this.#lastRecord;
    const fallback = this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING
      ? this.#activeTrial()?.reviewDraft ?? null
      : lastRecord !== null && lastRecord.observer !== null && lastRecord.selfReport !== null
        ? {
            observer: lastRecord.observer,
            selfReport: lastRecord.selfReport,
            invalidate: (
              lastRecord.terminationReason
              === INPUT_PILOT_TERMINATION_REASON.PROTOCOL_DEVIATION
            ),
          }
        : null;
    const submission = normalizeSubmission(value ?? fallback);
    const requestedHash = submissionHash(submission);
    if (this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL) {
      if (this.#lastRecord !== null && requestedHash === this.#lastSubmissionHash) {
        return this.#lastRecord;
      }
      throw new Error('Pilot trial 已终结，重复提交内容不一致。');
    }
    if (this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING) {
      throw new Error('只有 reviewing pilot trial 可以提交表单。');
    }
    const record = submitInputPilotTrialReview(
      this.#requireDefinition(),
      this.#activeTrial(),
      submission,
    );
    const normalized = createInputPilotReviewDraft({
      observer: record.observer,
      selfReport: record.selfReport,
      invalidate: submission.invalidate,
    });
    const committed = this.#requireCoordinator().completeActive(record);
    this.#lastRecord = committed;
    this.#lastSubmissionHash = submissionHash(normalized);
    this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL;
    return committed;
  }

  setPaused(paused: unknown): boolean {
    this.#assertUsable();
    if (typeof paused !== 'boolean') throw new TypeError('paused 必须是布尔值。');
    if (
      this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.STARTING
      && this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING
    ) return false;
    try {
      if (!paused) this.#requireCoordinator().renewLease();
      this.#pauseRequested = paused;
      this.#runtime?.setPaused(paused);
      return true;
    } catch (error) {
      if (this.#activeTrial() !== null) this.#invalidateRuntimeFailure(error);
      throw normalizeThrownError(error, 'Pilot runtime 暂停状态切换失败');
    }
  }

  heartbeat(): true {
    this.#assertUsable();
    try {
      return this.#requireCoordinator().renewLease();
    } catch (error) {
      throw this.#fatal(error, 'Pilot workspace heartbeat 失败');
    }
  }

  exportAuditBundle(): unknown {
    this.#assertUsable();
    return createInputPilotAuditExport(
      this.#requireDefinition(),
      this.#requireCoordinator().getSnapshot(),
    );
  }

  exportAggregateBundle(): unknown {
    this.#assertUsable();
    return createInputPilotAggregateExport(
      this.#requireDefinition(),
      this.#requireCoordinator().getSnapshot(),
    );
  }

  destroy(): void {
    if (this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED) return;
    if (this.#transitioning) {
      throw new Error('状态转换期间不能销毁 InputPilotTrialController。');
    }
    this.#destroyRequested = true;
    const errors = this.#cleanupOwnedResources();
    if (errors.length > 0) {
      throw this.#cleanupFailure('InputPilotTrialController 清理未完整完成。', errors);
    }
    this.#runtimeFactory = null;
    this.#definition = null;
    this.#pendingRuntimeFailure = null;
    this.#pauseRequested = false;
    this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED;
  }
}
