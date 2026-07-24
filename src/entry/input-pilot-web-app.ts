import {
  INPUT_PILOT_EVIDENCE_BUNDLE_SCHEMA_VERSION,
  InputPilotFormModel,
  InputPilotTrialController,
  InputPilotWorkspaceRepository,
  createArenaInputPilotV1Definition,
  createInputPilotEvidenceBundle,
  type InputPilotDefinition,
} from '@number-strategy-jump/arena-input-pilot';
import { InputPilotPresentationRuntime } from '@number-strategy-jump/arena-input-pilot-presentation';
import type { ArenaPlatformContract } from '@number-strategy-jump/arena-platform-contracts';
import type { WebResearchEnvironment } from './web-research-environment.js';
import { downloadInputPilotJson } from './input-pilot-json-download.js';
import { loadInputPilotBuildIdentity } from './input-pilot-build-identity.js';
import {
  createInputPilotPageOwnerId,
  detectInputPilotWebEnvironment,
} from './input-pilot-web-environment.js';
import { InputPilotWorkbenchView } from './input-pilot-workbench-view.js';

const HEARTBEAT_INTERVAL_MS = 20_000;

interface PilotWebRoot {
  readonly document?: { readonly hidden?: boolean; querySelector?: (selector: string) => unknown };
  readonly addEventListener?: (type: string, listener: () => void) => void;
  readonly removeEventListener?: (type: string, listener: () => void) => void;
  readonly setInterval?: (callback: () => void, milliseconds: number) => unknown;
  readonly clearInterval?: (token: unknown) => void;
}

interface PilotRuntimeOptions {
  readonly onProgress: (review: unknown) => unknown;
  readonly onFailure: (error: unknown) => unknown;
  readonly [key: string]: unknown;
}

type PilotBuildIdentity = Awaited<ReturnType<typeof loadInputPilotBuildIdentity>> | Readonly<{
  collectable: false;
  reason: 'build-manifest-loading';
  manifest: null;
}>;

function participantIdFor(index: number): string {
  return `pilot-${String(index + 1).padStart(4, '0')}`;
}

function workspaceRevision(value: unknown): number {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Input Pilot export 必须是对象。');
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, 'workspaceRevision');
  if (!descriptor || !Object.hasOwn(descriptor, 'value')
    || !Number.isSafeInteger(descriptor.value) || descriptor.value < 0) {
    throw new RangeError('Input Pilot export.workspaceRevision 必须是非负安全整数。');
  }
  return descriptor.value as number;
}

export class InputPilotWebApp {
  #root: PilotWebRoot | null;
  #platform: ArenaPlatformContract | null;
  #definition: InputPilotDefinition | null;
  #environment: Readonly<WebResearchEnvironment> | null;
  #buildIdentity: PilotBuildIdentity | null;
  #controller: InputPilotTrialController | null;
  #view: InputPilotWorkbenchView | null;
  #heartbeatToken: unknown | null;
  #cleanups: Array<() => unknown>;
  #startPromise: Promise<this> | null;
  #started: boolean;
  #destroyed: boolean;

  constructor({
    platform,
    root = globalThis as unknown as PilotWebRoot,
  }: { readonly platform: ArenaPlatformContract; readonly root?: PilotWebRoot }) {
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
    if (!this.#definition || !this.#platform || !this.#root || !this.#view || !this.#buildIdentity) {
      throw new Error('InputPilotWebApp 依赖已释放。');
    }
    const definition = this.#definition;
    const platform = this.#platform;
    const root = this.#root;
    const view = this.#view;
    const manifest = this.#buildIdentity.manifest;
    const keyPrefix = manifest === null
      ? undefined
      : [
        'arena.input-pilot',
        definition.id,
        definition.getContentHash(),
        manifest.commit,
        manifest.buildId,
        manifest.getContentHash(),
      ].join('.');
    const runtimeFactory = (trial: PilotRuntimeOptions) => new InputPilotPresentationRuntime({
      platform,
      ...trial,
      onProgress: () => {
        const controller = this.#controller;
        if (!controller) throw new Error('InputPilotWebApp Controller 已释放。');
        const previous = controller.state;
        const accepted = trial.onProgress(view.getReview());
        if (controller.state !== previous) this.#render();
        return accepted;
      },
      onFailure: (error: unknown) => {
        try {
          return trial.onFailure(error);
        } finally {
          this.#render();
        }
      },
    });
    this.#controller = new InputPilotTrialController({
      definition,
      repository: new InputPilotWorkspaceRepository({
        definition,
        storage: platform,
        ownerId: createInputPilotPageOwnerId(root),
        wallNow: () => platform.wallNow(),
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
    const manifest = this.#buildIdentity?.manifest ?? null;
    const identity = this.#buildIdentity;
    return Object.freeze({
      ...snapshot,
      evidence: Object.freeze({
        collectable: identity?.collectable ?? false,
        reason: identity?.reason ?? 'destroyed',
        commit: manifest?.commit ?? null,
        buildId: manifest?.buildId ?? null,
        buildManifestHash: manifest?.getContentHash() ?? null,
      }),
    });
  }

  #assertCollectableBuild() {
    const identity = this.#buildIdentity;
    if (!identity || !identity.collectable || identity.manifest === null) {
      throw new Error(`当前构建不能采集正式 Input Pilot 证据：${identity?.reason ?? 'destroyed'}。`);
    }
    return identity.manifest;
  }

  #render() {
    this.#view?.render(this.#snapshot());
  }

  #handleLifecycle(operation: () => unknown): void {
    if (this.#destroyed) return;
    try {
      operation();
    } catch {
      // Controller already fails closed and preserves the last durable checkpoint.
    }
    this.#render();
  }

  #bindLifecycle() {
    const platform = this.#platform;
    const root = this.#root;
    if (!platform || !root) throw new Error('InputPilotWebApp 生命周期依赖已释放。');
    this.#cleanups.push(platform.onHide(() => {
      this.#handleLifecycle(() => this.#controller?.setPaused(true));
    }));
    this.#cleanups.push(platform.onShow(() => {
      this.#handleLifecycle(() => {
        this.#controller?.heartbeat();
        this.#controller?.setPaused(false);
      });
    }));
    const beforeUnload = () => {
      try { this.destroy(); } catch { /* browser teardown remains best-effort */ }
    };
    root.addEventListener?.('beforeunload', beforeUnload);
    this.#cleanups.push(() => root.removeEventListener?.('beforeunload', beforeUnload));
    if (typeof root.setInterval === 'function') {
      this.#heartbeatToken = root.setInterval(() => {
        if (root.document?.hidden) return;
        this.#handleLifecycle(() => this.#controller?.heartbeat());
      }, HEARTBEAT_INTERVAL_MS);
    }
  }

  #actions() {
    const controller = this.#controller;
    const view = this.#view;
    const root = this.#root;
    const definition = this.#definition;
    const environment = this.#environment;
    if (!controller || !view || !root || !definition || !environment) {
      throw new Error('InputPilotWebApp actions 依赖已释放。');
    }
    return Object.freeze({
      getSnapshot: () => this.#snapshot(),
      enroll: () => {
        this.#assertCollectableBuild();
        const eligibility = view.getEnrollment();
        const workspace = controller.getSnapshot().workspace;
        if (!workspace) throw new Error('InputPilotWebApp Workspace 尚未打开。');
        const enrollmentIndex = workspace.enrollment.revision;
        controller.enroll({
          participantId: participantIdFor(enrollmentIndex),
          device: environment,
          eligibility,
        });
        view.resetForNextParticipant();
      },
      start: () => controller.startTrial(),
      abandon: () => controller.abandonTrial(view.getReview()),
      saveDraft: (value: unknown) => controller.saveReviewDraft(value),
      submit: () => controller.submitReview(view.getReview()),
      exportAggregate: () => {
        const value = controller.exportAggregateBundle();
        return downloadInputPilotJson(root, {
          kind: 'aggregate',
          revision: workspaceRevision(value),
          value,
        });
      },
      exportAudit: () => {
        const value = controller.exportAuditBundle();
        return downloadInputPilotJson(root, {
          kind: 'audit',
          revision: workspaceRevision(value),
          value,
        });
      },
      exportEvidence: () => {
        const manifest = this.#assertCollectableBuild();
        const audit = controller.exportAuditBundle();
        const value = createInputPilotEvidenceBundle(definition, {
          schemaVersion: INPUT_PILOT_EVIDENCE_BUNDLE_SCHEMA_VERSION,
          commit: manifest.commit,
          buildId: manifest.buildId,
          buildManifestHash: manifest.getContentHash(),
          audit,
        });
        return downloadInputPilotJson(root, {
          kind: 'evidence',
          revision: workspaceRevision(audit),
          value,
        });
      },
    });
  }

  async #startOnce() {
    try {
      const root = this.#root;
      if (!root) throw new Error('InputPilotWebApp Root 已释放。');
      const buildIdentity = await loadInputPilotBuildIdentity(root);
      if (this.#destroyed) throw new Error('InputPilotWebApp 在启动期间已销毁。');
      this.#buildIdentity = buildIdentity;
      this.#createController();
      this.#controller?.open();
      this.#view?.bind(this.#actions());
      this.#bindLifecycle();
      this.#started = true;
      this.#render();
      return this;
    } catch (error) {
      try {
        this.destroy();
      } catch (cleanupError) {
        throw Object.assign(new Error('InputPilotWebApp 启动失败且清理未完整完成。', {
          cause: error,
        }), { cleanupError });
      }
      throw error;
    }
  }

  start(): Promise<this> {
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

  getSnapshot(): unknown {
    if (this.#destroyed) return Object.freeze({ state: 'destroyed' });
    return this.#snapshot();
  }

  destroy(): void {
    if (
      this.#destroyed
      && this.#controller === null
      && this.#view === null
      && this.#heartbeatToken === null
      && this.#cleanups.length === 0
    ) return;
    this.#destroyed = true;
    const errors: unknown[] = [];
    if (this.#heartbeatToken !== null) {
      try {
        this.#root?.clearInterval?.(this.#heartbeatToken);
        this.#heartbeatToken = null;
      } catch (error) {
        errors.push(error);
      }
    }
    const retryCleanups: Array<() => unknown> = [];
    for (const cleanup of this.#cleanups.splice(0).reverse()) {
      try { cleanup(); } catch (error) {
        retryCleanups.push(cleanup);
        errors.push(error);
      }
    }
    this.#cleanups.push(...retryCleanups.reverse());
    if (this.#controller !== null) {
      try {
        this.#controller.destroy();
        this.#controller = null;
      } catch (error) {
        errors.push(error);
      }
    }
    if (this.#view !== null) {
      try {
        this.#view.destroy();
        this.#view = null;
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw Object.assign(new Error('InputPilotWebApp 清理未完整完成。'), {
        cleanupErrors: errors,
      });
    }
    this.#platform = null;
    this.#definition = null;
    this.#environment = null;
    this.#buildIdentity = null;
    this.#startPromise = null;
    this.#root = null;
  }
}
