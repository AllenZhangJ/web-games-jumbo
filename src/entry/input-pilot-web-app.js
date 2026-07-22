import {
  INPUT_PILOT_EVIDENCE_BUNDLE_SCHEMA_VERSION,
  InputPilotFormModel,
  InputPilotTrialController,
  InputPilotWorkspaceRepository,
  createArenaInputPilotV1Definition,
  createInputPilotEvidenceBundle,
} from '@number-strategy-jump/arena-input-pilot';
import { InputPilotPresentationRuntime } from '@number-strategy-jump/arena-input-pilot-presentation';
import { downloadInputPilotJson } from './input-pilot-json-download.js';
import { loadInputPilotBuildIdentity } from './input-pilot-build-identity.js';
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
  #buildIdentity;
  #controller;
  #view;
  #heartbeatToken;
  #cleanups;
  #startPromise;
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
    this.#buildIdentity = Object.freeze({
      collectable: false,
      reason: 'build-manifest-loading',
      manifest: null,
    });
    this.#controller = null;
    this.#heartbeatToken = null;
    this.#cleanups = [];
    this.#startPromise = null;
    this.#started = false;
    this.#destroyed = false;
    Object.freeze(this);
  }

  #createController() {
    if (this.#controller !== null) throw new Error('InputPilotWebApp Controller 已创建。');
    const manifest = this.#buildIdentity.manifest;
    const keyPrefix = manifest === null
      ? undefined
      : [
        'arena.input-pilot',
        this.#definition.id,
        this.#definition.getContentHash(),
        manifest.commit,
        manifest.buildId,
        manifest.getContentHash(),
      ].join('.');
    const runtimeFactory = (trial) => new InputPilotPresentationRuntime({
      platform: this.#platform,
      ...trial,
      onProgress: () => {
        const previous = this.#controller.state;
        const accepted = trial.onProgress(this.#view.getReview());
        if (this.#controller.state !== previous) this.#render();
        return accepted;
      },
      onFailure: (error) => {
        try {
          return trial.onFailure(error);
        } finally {
          this.#render();
        }
      },
    });
    this.#controller = new InputPilotTrialController({
      definition: this.#definition,
      repository: new InputPilotWorkspaceRepository({
        definition: this.#definition,
        storage: this.#platform,
        ownerId: createInputPilotPageOwnerId(this.#root),
        wallNow: () => this.#platform.wallNow(),
        keyPrefix,
      }),
      runtimeFactory,
    });
  }

  #snapshot() {
    const snapshot = this.#controller?.getSnapshot() ?? Object.freeze({
      state: 'created',
      workspace: null,
      lastRecord: null,
      lastError: null,
    });
    const manifest = this.#buildIdentity.manifest;
    return Object.freeze({
      ...snapshot,
      evidence: Object.freeze({
        collectable: this.#buildIdentity.collectable,
        reason: this.#buildIdentity.reason,
        commit: manifest?.commit ?? null,
        buildId: manifest?.buildId ?? null,
        buildManifestHash: manifest?.getContentHash() ?? null,
      }),
    });
  }

  #assertCollectableBuild() {
    if (!this.#buildIdentity.collectable || this.#buildIdentity.manifest === null) {
      throw new Error(`当前构建不能采集正式 Input Pilot 证据：${this.#buildIdentity.reason}。`);
    }
    return this.#buildIdentity.manifest;
  }

  #render() {
    this.#view.render(this.#snapshot());
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
      getSnapshot: () => this.#snapshot(),
      enroll: () => {
        this.#assertCollectableBuild();
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
      exportEvidence: () => {
        const manifest = this.#assertCollectableBuild();
        const audit = this.#controller.exportAuditBundle();
        const value = createInputPilotEvidenceBundle(this.#definition, {
          schemaVersion: INPUT_PILOT_EVIDENCE_BUNDLE_SCHEMA_VERSION,
          commit: manifest.commit,
          buildId: manifest.buildId,
          buildManifestHash: manifest.getContentHash(),
          audit,
        });
        return downloadInputPilotJson(this.#root, {
          kind: 'evidence',
          revision: audit.workspaceRevision,
          value,
        });
      },
    });
  }

  async #startOnce() {
    try {
      const buildIdentity = await loadInputPilotBuildIdentity(this.#root);
      if (this.#destroyed) throw new Error('InputPilotWebApp 在启动期间已销毁。');
      this.#buildIdentity = buildIdentity;
      this.#createController();
      this.#controller.open();
      this.#view.bind(this.#actions());
      this.#bindLifecycle();
      this.#started = true;
      this.#render();
      return this;
    } catch (error) {
      try {
        this.destroy();
      } catch (cleanupError) {
        const failure = new Error('InputPilotWebApp 启动失败且清理未完整完成。', {
          cause: error,
        });
        failure.cleanupError = cleanupError;
        throw failure;
      }
      throw error;
    }
  }

  start() {
    if (this.#destroyed) return Promise.reject(new Error('InputPilotWebApp 已销毁。'));
    if (this.#started) return Promise.resolve(this);
    if (this.#startPromise !== null) return this.#startPromise;
    const pending = this.#startOnce();
    const settled = pending.finally(() => {
      if (this.#startPromise === settled) this.#startPromise = null;
    });
    this.#startPromise = settled;
    return settled;
  }

  getSnapshot() {
    if (this.#destroyed) return Object.freeze({ state: 'destroyed' });
    return this.#snapshot();
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
    this.#buildIdentity = null;
    this.#startPromise = null;
    this.#root = null;
    if (errors.length > 0) {
      const failure = new Error('InputPilotWebApp 清理未完整完成。');
      failure.cleanupErrors = errors;
      throw failure;
    }
  }
}
