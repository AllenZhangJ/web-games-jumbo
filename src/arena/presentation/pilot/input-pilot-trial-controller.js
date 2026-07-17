import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import {
  combineCleanupFailure,
  normalizeThrownError,
} from '../../lifecycle-error.js';
import { createInputPilotDefinition } from './input-pilot-definition.js';
import {
  createInputPilotAggregateExport,
  createInputPilotAuditExport,
} from './input-pilot-export.js';
import { INPUT_PILOT_TERMINATION_REASON } from './input-pilot-record.js';
import {
  INPUT_PILOT_TRIAL_PHASE,
} from './input-pilot-trial-checkpoint.js';
import {
  invalidateInputPilotTrial,
  reviewInputPilotTrial,
  startInputPilotTrial,
  submitInputPilotTrialReview,
  updateInputPilotReviewDraft,
} from './input-pilot-trial-state.js';
import {
  INPUT_PILOT_RUNTIME_STATE,
  validateInputPilotRuntime,
  validateInputPilotRuntimeFactory,
  validateInputPilotRuntimeStatus,
} from './input-pilot-trial-runtime-port.js';
import { InputPilotWorkspaceCoordinator } from './input-pilot-workspace-coordinator.js';

export const INPUT_PILOT_TRIAL_CONTROLLER_STATE = Object.freeze({
  CREATED: 'created',
  IDLE: 'idle',
  ENROLLED: 'enrolled',
  STARTING: 'starting',
  RUNNING: 'running',
  REVIEWING: 'reviewing',
  TERMINAL: 'terminal',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

function submissionHash({ observer, selfReport, invalidate }) {
  return createDeterministicDataHash(
    { observer, selfReport, invalidate: Boolean(invalidate) },
    'InputPilot review submission',
  );
}

function cleanupRuntime(runtime) {
  if (!runtime) return [];
  try {
    runtime.destroy();
    return [];
  } catch (error) {
    return [normalizeThrownError(error, 'pilot runtime 清理失败')];
  }
}

export class InputPilotTrialController {
  #definition;
  #coordinator;
  #runtimeFactory;
  #runtime;
  #state;
  #startPromise;
  #transitioning;
  #destroyRequested;
  #lastRecord;
  #lastSubmissionHash;
  #lastError;
  #pendingRuntimeFailure;

  constructor({ definition: definitionValue, repository, runtimeFactory }) {
    const definition = createInputPilotDefinition(definitionValue);
    this.#definition = definition;
    this.#coordinator = new InputPilotWorkspaceCoordinator({ definition, repository });
    this.#runtimeFactory = validateInputPilotRuntimeFactory(runtimeFactory);
    this.#runtime = null;
    this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.CREATED;
    this.#startPromise = null;
    this.#transitioning = false;
    this.#destroyRequested = false;
    this.#lastRecord = null;
    this.#lastSubmissionHash = null;
    this.#lastError = null;
    this.#pendingRuntimeFailure = null;
    Object.freeze(this);
  }

  get state() {
    return this.#state;
  }

  #assertUsable() {
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

  #activeTrial() {
    return this.#coordinator.getSnapshot().activeTrial;
  }

  #releaseRuntime() {
    const runtime = this.#runtime;
    this.#runtime = null;
    return cleanupRuntime(runtime);
  }

  #fatal(error, message) {
    const failure = normalizeThrownError(error, message);
    const cleanupErrors = this.#releaseRuntime();
    try {
      this.#coordinator?.destroy();
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, 'pilot workspace 清理失败'));
    }
    this.#lastError = combineCleanupFailure(
      failure,
      cleanupErrors,
      `${message}且清理未完整完成。`,
    );
    this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.FAILED;
    return this.#lastError;
  }

  #invalidateActive(terminationReason, automated = null) {
    const active = this.#activeTrial();
    if (!active) throw new Error('没有 active pilot trial 可作废。');
    const record = invalidateInputPilotTrial(this.#definition, active, {
      terminationReason,
      automated,
    });
    const committed = this.#coordinator.completeActive(record);
    this.#lastRecord = committed;
    this.#lastSubmissionHash = null;
    this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL;
    const cleanupErrors = this.#releaseRuntime();
    if (cleanupErrors.length > 0) {
      this.#lastError = cleanupErrors[0];
      throw combineCleanupFailure(
        cleanupErrors[0],
        cleanupErrors.slice(1),
        'Pilot trial 已作废，但运行时清理未完整完成。',
      );
    }
    return committed;
  }

  #invalidateRuntimeFailure(originalError) {
    let automated = null;
    try {
      automated = this.#runtime?.finalizeMetrics() ?? null;
    } catch {
      automated = null;
    }
    try {
      return this.#invalidateActive(INPUT_PILOT_TERMINATION_REASON.RUNTIME_FAILED, automated);
    } catch (invalidationError) {
      const failure = normalizeThrownError(originalError, 'pilot runtime 失败');
      failure.invalidationError = invalidationError;
      throw this.#fatal(failure, 'Pilot runtime 失败且无法提交作废记录');
    }
  }

  open() {
    if (this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED) {
      throw new Error('InputPilotTrialController 已销毁。');
    }
    if (this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.CREATED) {
      return this.getSnapshot();
    }
    try {
      const workspace = this.#coordinator.open();
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

  getSnapshot() {
    if (this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED) {
      return Object.freeze({
        state: this.#state,
        workspace: null,
        lastRecord: this.#lastRecord,
        lastError: this.#lastError ? Object.freeze({
          name: this.#lastError.name,
          message: this.#lastError.message,
        }) : null,
      });
    }
    const workspace = (
      this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.CREATED
      || this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.FAILED
    ) ? null : this.#coordinator.getSnapshot();
    return Object.freeze({
      state: this.#state,
      workspace,
      lastRecord: this.#lastRecord,
      lastError: this.#lastError ? Object.freeze({
        name: this.#lastError.name,
        message: this.#lastError.message,
      }) : null,
    });
  }

  enroll({ participantId, device, eligibility, trialId }) {
    this.#assertUsable();
    if (
      this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.IDLE
      && this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL
    ) throw new Error('只有 idle/terminal Pilot Controller 可以入组下一位受测者。');
    const checkpoint = this.#coordinator.enroll({
      participantId,
      device,
      eligibility,
      trialId,
    });
    this.#lastRecord = null;
    this.#lastSubmissionHash = null;
    this.#lastError = null;
    this.#pendingRuntimeFailure = null;
    this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.ENROLLED;
    return checkpoint;
  }

  startTrial() {
    this.#assertUsable();
    if (this.#startPromise) return this.#startPromise;
    if (this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.ENROLLED) {
      return Promise.reject(new Error('只有 enrolled Pilot Controller 可以启动比赛。'));
    }
    const running = startInputPilotTrial(this.#definition, this.#activeTrial());
    this.#coordinator.replaceActive(running);
    this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.STARTING;

    const operation = Promise.resolve().then(async () => {
      let runtime = null;
      try {
        if (
          this.#destroyRequested
          || this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED
        ) throw new Error('Pilot trial 启动已取消。');
        runtime = validateInputPilotRuntime(this.#runtimeFactory(Object.freeze({
          definition: this.#definition,
          checkpoint: running,
          mapperId: running.assignment.mapperId,
          matchSeed: running.assignment.matchSeed,
          onProgress: (reviewDraft = null) => {
            if (this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING) return false;
            try {
              this.synchronize(reviewDraft);
              return true;
            } catch (error) {
              this.#lastError = normalizeThrownError(error, 'pilot progress 同步失败');
              return false;
            }
          },
          onFailure: (error) => this.reportRuntimeFailure(error),
        })));
        this.#runtime = runtime;
        await runtime.start();
        if (
          this.#destroyRequested
          || this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED
        ) throw new Error('Pilot trial 启动已取消。');
        if (this.#pendingRuntimeFailure) throw this.#pendingRuntimeFailure;
        if (this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.STARTING) {
          throw new Error(`Pilot trial 启动期间意外进入 ${this.#state}。`);
        }
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

  #transitionToReview(terminationReason, reviewDraft = null) {
    this.#transitioning = true;
    try {
      const automated = this.#runtime.finalizeMetrics();
      const reviewing = reviewInputPilotTrial(this.#definition, this.#activeTrial(), {
        automated,
        terminationReason,
        reviewDraft,
      });
      const committed = this.#coordinator.replaceActive(reviewing);
      this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING;
      const cleanupErrors = this.#releaseRuntime();
      if (cleanupErrors.length > 0) {
        this.#lastError = cleanupErrors[0];
        throw combineCleanupFailure(
          cleanupErrors[0],
          cleanupErrors.slice(1),
          'Pilot trial 已进入复核，但运行时清理未完整完成。',
        );
      }
      return committed;
    } catch (error) {
      if (this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING) throw error;
      this.#invalidateRuntimeFailure(error);
      throw normalizeThrownError(error, 'Pilot trial 进入复核失败');
    } finally {
      this.#transitioning = false;
    }
  }

  synchronize(reviewDraft = null) {
    this.#assertUsable();
    if (this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING) {
      return this.getSnapshot();
    }
    const status = validateInputPilotRuntimeStatus(this.#runtime.getStatus());
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

  reportRuntimeFailure(error) {
    if (
      this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.STARTING
      && this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING
    ) return false;
    if (this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.STARTING) {
      this.#pendingRuntimeFailure = normalizeThrownError(error, 'pilot runtime 启动失败');
      return true;
    }
    this.#invalidateRuntimeFailure(error);
    return true;
  }

  abandonTrial(reviewDraft = null) {
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

  saveReviewDraft(value) {
    this.#assertUsable();
    if (this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING) return false;
    const active = this.#activeTrial();
    const next = updateInputPilotReviewDraft(this.#definition, active, value);
    if (
      createDeterministicDataHash(active.reviewDraft, 'current pilot review draft')
      === createDeterministicDataHash(next.reviewDraft, 'next pilot review draft')
    ) return active.reviewDraft;
    return this.#coordinator.replaceActive(next).reviewDraft;
  }

  submitReview(value = null) {
    this.#assertUsable();
    const fallback = this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING
      ? this.#activeTrial().reviewDraft
      : this.#lastRecord ? {
        observer: this.#lastRecord.observer,
        selfReport: this.#lastRecord.selfReport,
        invalidate: (
          this.#lastRecord.terminationReason
          === INPUT_PILOT_TERMINATION_REASON.PROTOCOL_DEVIATION
        ),
      } : null;
    const submission = value ?? fallback;
    if (!submission) throw new Error('Pilot review submission 缺失。');
    const { observer, selfReport, invalidate = false } = submission;
    const requestedHash = submissionHash({ observer, selfReport, invalidate });
    if (this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL) {
      if (this.#lastRecord && requestedHash === this.#lastSubmissionHash) return this.#lastRecord;
      throw new Error('Pilot trial 已终结，重复提交内容不一致。');
    }
    if (this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING) {
      throw new Error('只有 reviewing pilot trial 可以提交表单。');
    }
    const record = submitInputPilotTrialReview(this.#definition, this.#activeTrial(), {
      observer,
      selfReport,
      invalidate,
    });
    const normalizedHash = submissionHash({
      observer: record.observer,
      selfReport: record.selfReport,
      invalidate,
    });
    const committed = this.#coordinator.completeActive(record);
    this.#lastRecord = committed;
    this.#lastSubmissionHash = normalizedHash;
    this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL;
    return committed;
  }

  setPaused(paused) {
    this.#assertUsable();
    if (typeof paused !== 'boolean') throw new TypeError('paused 必须是布尔值。');
    if (
      this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.STARTING
      && this.#state !== INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING
    ) return false;
    try {
      if (!paused) this.#coordinator.renewLease();
      this.#runtime?.setPaused(paused);
      return true;
    } catch (error) {
      if (this.#activeTrial()) this.#invalidateRuntimeFailure(error);
      throw normalizeThrownError(error, 'Pilot runtime 暂停状态切换失败');
    }
  }

  heartbeat() {
    this.#assertUsable();
    try {
      return this.#coordinator.renewLease();
    } catch (error) {
      throw this.#fatal(error, 'Pilot workspace heartbeat 失败');
    }
  }

  exportAuditBundle() {
    this.#assertUsable();
    return createInputPilotAuditExport(this.#definition, this.#coordinator.getSnapshot());
  }

  exportAggregateBundle() {
    this.#assertUsable();
    return createInputPilotAggregateExport(this.#definition, this.#coordinator.getSnapshot());
  }

  destroy() {
    if (this.#state === INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED) return;
    if (this.#transitioning) throw new Error('状态转换期间不能销毁 InputPilotTrialController。');
    this.#destroyRequested = true;
    const errors = this.#releaseRuntime();
    try {
      this.#coordinator?.destroy();
    } catch (error) {
      errors.push(normalizeThrownError(error, 'pilot workspace 清理失败'));
    }
    this.#coordinator = null;
    this.#runtimeFactory = null;
    this.#definition = null;
    this.#pendingRuntimeFailure = null;
    this.#state = INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED;
    if (errors.length > 0) {
      const failure = new Error('InputPilotTrialController 清理未完整完成。');
      failure.cleanupErrors = errors;
      this.#lastError = failure;
      throw failure;
    }
  }
}
