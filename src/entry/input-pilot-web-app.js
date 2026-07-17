import { createArenaInputPilotV1Definition } from '../arena/presentation/pilot/arena-input-pilot-v1.js';
import { InputPilotFormModel } from '../arena/presentation/pilot/input-pilot-form-model.js';
import { InputPilotTrialController } from '../arena/presentation/pilot/input-pilot-trial-controller.js';
import { InputPilotWorkspaceRepository } from '../arena/presentation/pilot/input-pilot-workspace-repository.js';
import { InputPilotPresentationRuntime } from '../arena/presentation/session/input-pilot-presentation-runtime.js';
import { downloadInputPilotJson } from './input-pilot-json-download.js';
import {
  createInputPilotPageOwnerId,
  detectInputPilotWebEnvironment,
} from './input-pilot-web-environment.js';
import { InputPilotWorkbenchView } from './input-pilot-workbench-view.js';

const HEARTBEAT_INTERVAL_MS = 20_000;

function participantIdFor(index) {
  return `pilot-${String(index + 1).padStart(4, '0')}`;
}

export class InputPilotWebApp {
  #root;
  #platform;
  #definition;
  #environment;
  #controller;
  #view;
  #heartbeatToken;
  #cleanups;
  #started;
  #destroyed;

  constructor({ platform, root = globalThis }) {
    const documentObject = root?.document;
    const mount = documentObject?.querySelector?.('#pilot-app');
    if (!mount) throw new Error('InputPilotWebApp 缺少 #pilot-app。');
    if (!platform || typeof platform.wallNow !== 'function') {
      throw new TypeError('InputPilotWebApp 需要完整 Web Platform。');
    }
    this.#root = root;
    this.#platform = platform;
    this.#definition = createArenaInputPilotV1Definition();
    this.#environment = detectInputPilotWebEnvironment(root);
    const formModel = new InputPilotFormModel();
    this.#view = new InputPilotWorkbenchView({
      root: mount,
      formModel,
      definition: this.#definition,
      environment: this.#environment,
    });
    let controller = null;
    const runtimeFactory = (trial) => new InputPilotPresentationRuntime({
      platform: this.#platform,
      ...trial,
      onProgress: () => {
        const previous = controller.state;
        const accepted = trial.onProgress(this.#view.getReview());
        if (controller.state !== previous) this.#view.render(controller.getSnapshot());
        return accepted;
      },
      onFailure: (error) => {
        try {
          return trial.onFailure(error);
        } finally {
          this.#view.render(controller.getSnapshot());
        }
      },
    });
    controller = new InputPilotTrialController({
      definition: this.#definition,
      repository: new InputPilotWorkspaceRepository({
        definition: this.#definition,
        storage: this.#platform,
        ownerId: createInputPilotPageOwnerId(root),
        wallNow: () => this.#platform.wallNow(),
      }),
      runtimeFactory,
    });
    this.#controller = controller;
    this.#heartbeatToken = null;
    this.#cleanups = [];
    this.#started = false;
    this.#destroyed = false;
    Object.freeze(this);
  }

  #render() {
    this.#view.render(this.#controller.getSnapshot());
  }

  #handleLifecycle(operation) {
    if (this.#destroyed) return;
    try {
      operation();
    } catch {
      // Controller already fails closed and preserves the last durable checkpoint.
    }
    this.#render();
  }

  #bindLifecycle() {
    this.#cleanups.push(this.#platform.onHide(() => {
      this.#handleLifecycle(() => this.#controller.setPaused(true));
    }));
    this.#cleanups.push(this.#platform.onShow(() => {
      this.#handleLifecycle(() => {
        this.#controller.heartbeat();
        this.#controller.setPaused(false);
      });
    }));
    const beforeUnload = () => {
      try { this.destroy(); } catch { /* browser teardown remains best-effort */ }
    };
    this.#root.addEventListener?.('beforeunload', beforeUnload);
    this.#cleanups.push(() => this.#root.removeEventListener?.('beforeunload', beforeUnload));
    if (typeof this.#root.setInterval === 'function') {
      this.#heartbeatToken = this.#root.setInterval(() => {
        if (this.#root.document?.hidden) return;
        this.#handleLifecycle(() => this.#controller.heartbeat());
      }, HEARTBEAT_INTERVAL_MS);
    }
  }

  #actions() {
    return Object.freeze({
      getSnapshot: () => this.#controller.getSnapshot(),
      enroll: () => {
        const eligibility = this.#view.getEnrollment();
        const enrollmentIndex = this.#controller.getSnapshot().workspace.enrollment.revision;
        this.#controller.enroll({
          participantId: participantIdFor(enrollmentIndex),
          device: this.#environment,
          eligibility,
        });
        this.#view.resetForNextParticipant();
      },
      start: () => this.#controller.startTrial(),
      abandon: () => this.#controller.abandonTrial(this.#view.getReview()),
      saveDraft: (value) => this.#controller.saveReviewDraft(value),
      submit: () => this.#controller.submitReview(this.#view.getReview()),
      exportAggregate: () => {
        const value = this.#controller.exportAggregateBundle();
        return downloadInputPilotJson(this.#root, {
          kind: 'aggregate',
          revision: value.workspaceRevision,
          value,
        });
      },
      exportAudit: () => {
        const value = this.#controller.exportAuditBundle();
        return downloadInputPilotJson(this.#root, {
          kind: 'audit',
          revision: value.workspaceRevision,
          value,
        });
      },
    });
  }

  start() {
    if (this.#destroyed) return Promise.reject(new Error('InputPilotWebApp 已销毁。'));
    if (this.#started) return Promise.resolve(this);
    try {
      this.#controller.open();
      this.#view.bind(this.#actions());
      this.#bindLifecycle();
      this.#started = true;
      this.#render();
      return Promise.resolve(this);
    } catch (error) {
      try {
        this.destroy();
        return Promise.reject(error);
      } catch (cleanupError) {
        const failure = new Error('InputPilotWebApp 启动失败且清理未完整完成。', {
          cause: error,
        });
        failure.cleanupError = cleanupError;
        return Promise.reject(failure);
      }
    }
  }

  getSnapshot() {
    if (this.#destroyed) return Object.freeze({ state: 'destroyed' });
    return this.#controller.getSnapshot();
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    const errors = [];
    if (this.#heartbeatToken !== null) {
      try { this.#root.clearInterval?.(this.#heartbeatToken); } catch (error) { errors.push(error); }
      this.#heartbeatToken = null;
    }
    for (const cleanup of this.#cleanups.splice(0).reverse()) {
      try { cleanup(); } catch (error) { errors.push(error); }
    }
    try { this.#controller?.destroy(); } catch (error) { errors.push(error); }
    try { this.#view?.destroy(); } catch (error) { errors.push(error); }
    this.#controller = null;
    this.#view = null;
    this.#platform = null;
    this.#definition = null;
    this.#environment = null;
    this.#root = null;
    if (errors.length > 0) {
      const failure = new Error('InputPilotWebApp 清理未完整完成。');
      failure.cleanupErrors = errors;
      throw failure;
    }
  }
}
