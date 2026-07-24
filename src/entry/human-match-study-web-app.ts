import {
  HUMAN_MATCH_STUDY_CAPTURE_STATE,
  type HumanMatchStudyParticipantSnapshot,
} from '@number-strategy-jump/arena-human-match-study';
import {
  createArenaStage9HumanFairnessV1Definition,
  type HumanMatchStudyDefinition,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HUMAN_MATCH_STUDY_STATUS,
  HUMAN_MATCH_STUDY_TERMINATION_REASON,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HUMAN_MATCH_STUDY_CHECKPOINT_PHASE,
  type HumanMatchStudyCheckpoint,
  type HumanMatchStudyCheckpointPhase,
  type HumanMatchStudyStatus,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HumanMatchStudyWorkspaceController,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HumanMatchStudyWorkspaceRepository,
} from '@number-strategy-jump/arena-human-match-study';
import { loadHumanMatchStudyBuildIdentity } from './human-match-study-build-identity.js';
import {
  downloadHumanMatchStudyCapturePackage,
  downloadHumanMatchStudyWorkspace,
} from './human-match-study-json-download.js';
import {
  HumanMatchStudyWorkbenchView,
} from './human-match-study-workbench-view.js';
import {
  HumanMatchStudyProductRuntime,
} from './human-match-study-product-runtime.js';
import {
  createWebResearchPageOwnerId,
  detectWebResearchEnvironment,
  type WebResearchEnvironment,
} from './web-research-environment.js';
import type { ArenaPlatformContract } from '@number-strategy-jump/arena-platform-contracts';

const HEARTBEAT_INTERVAL_MS = 20_000;
const RUNTIME_HEALTH_INTERVAL_MS = 1_000;

interface HumanStudyRoot {
  readonly document?: { readonly hidden?: boolean; querySelector?: (selector: string) => unknown };
  readonly crypto?: { readonly randomUUID?: () => string };
  readonly Date?: DateConstructor;
  readonly addEventListener?: (type: string, listener: () => void) => void;
  readonly removeEventListener?: (type: string, listener: () => void) => void;
  readonly setInterval?: (callback: () => void, milliseconds: number) => unknown;
  readonly clearInterval?: (token: unknown) => void;
}

type HumanStudyBuildIdentity = Awaited<ReturnType<typeof loadHumanMatchStudyBuildIdentity>> | Readonly<{
  collectable: false;
  reason: 'build-manifest-loading';
  manifest: null;
}>;

interface ResearchEnvironmentShape {
  readonly platform: string;
  readonly formFactor: string;
  readonly orientation: string;
  readonly inputMode: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function utcNow(root: HumanStudyRoot): string {
  const DateValue = root.Date;
  if (typeof DateValue !== 'function') throw new TypeError('真人研究 Root 缺少 Date。');
  return new DateValue().toISOString();
}

function sameEnvironment(
  left: Readonly<ResearchEnvironmentShape> | null,
  right: Readonly<ResearchEnvironmentShape> | null,
): boolean {
  return ['platform', 'formFactor', 'orientation', 'inputMode'].every(
    (key) => left?.[key as keyof ResearchEnvironmentShape]
      === right?.[key as keyof ResearchEnvironmentShape],
  );
}

function anonymousId(root: HumanStudyRoot, prefix: string, enrollmentIndex: number): string {
  let suffix: string | null = null;
  try {
    suffix = root.crypto?.randomUUID?.() ?? null;
  } catch {
    suffix = null;
  }
  if (typeof suffix !== 'string' || suffix.length === 0) {
    const rootNow = root.Date?.now?.();
    const now = Number.isFinite(rootNow) ? rootNow as number : Date.now();
    suffix = `${now}-${enrollmentIndex}`;
  }
  return `${prefix}-${suffix}`;
}

function statusText(
  phase: HumanMatchStudyCheckpointPhase | 'idle',
  terminalStatus: HumanMatchStudyStatus | null,
): string {
  switch (phase) {
    case 'idle': return '可入组下一位参与者';
    case HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.ENROLLED:
      return '已锁定匿名编号，交接设备后开始';
    case HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING:
      return '三局 1v1 正在采集';
    case HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.REVIEWING:
      return terminalStatus === HUMAN_MATCH_STUDY_STATUS.COMPLETED
        ? '对局完成，等待终局自评与原始包导出'
        : '非完整终态，等待原始包导出';
    case HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RECOVERY_REQUIRED:
      return '检测到中断；必须导出零局作废包后才能继续';
    case HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.EXPORT_PENDING:
      return '下载已触发；核对文件后确认归档';
    default: return '状态未知，已停止采集';
  }
}

export class HumanMatchStudyWebApp {
  #root: HumanStudyRoot | null;
  #platform: ArenaPlatformContract | null;
  #definition: HumanMatchStudyDefinition | null;
  #controller: HumanMatchStudyWorkspaceController | null;
  #view: HumanMatchStudyWorkbenchView | null;
  #buildIdentity: HumanStudyBuildIdentity | null;
  #environment: Readonly<WebResearchEnvironment> | null;
  #runtime: HumanMatchStudyProductRuntime | null;
  #heartbeatToken: unknown | null;
  #healthToken: unknown | null;
  #cleanups: Array<() => unknown>;
  #startPromise: Promise<this> | null;
  #started: boolean;
  #destroyed: boolean;
  #transitioning: boolean;
  #lastError: string | null;

  constructor({
    platform,
    root = globalThis as unknown as HumanStudyRoot,
  }: { readonly platform: ArenaPlatformContract; readonly root?: HumanStudyRoot }) {
    const mount = root.document?.querySelector?.('#human-study-app');
    if (!mount) throw new Error('HumanMatchStudyWebApp 缺少 #human-study-app。');
    if (!platform || typeof platform.wallNow !== 'function') {
      throw new TypeError('HumanMatchStudyWebApp 需要完整 Web Platform。');
    }
    this.#root = root;
    this.#platform = platform;
    this.#definition = createArenaStage9HumanFairnessV1Definition();
    this.#environment = detectWebResearchEnvironment(root);
    this.#view = new HumanMatchStudyWorkbenchView({ root: mount });
    this.#controller = new HumanMatchStudyWorkspaceController({
      definition: this.#definition,
      repository: new HumanMatchStudyWorkspaceRepository({
        definition: this.#definition,
        storage: platform,
        ownerId: createWebResearchPageOwnerId(root, 'human-study-page'),
        wallNow: () => platform.wallNow(),
      }),
    });
    this.#buildIdentity = Object.freeze({
      collectable: false,
      reason: 'build-manifest-loading',
      manifest: null,
    });
    this.#runtime = null;
    this.#heartbeatToken = null;
    this.#healthToken = null;
    this.#cleanups = [];
    this.#startPromise = null;
    this.#started = false;
    this.#destroyed = false;
    this.#transitioning = false;
    this.#lastError = null;
    Object.freeze(this);
  }

  #active() {
    const controller = this.#controller;
    if (!controller) throw new Error('HumanMatchStudyWebApp Controller 已释放。');
    return controller.getOperatorSnapshot().activeTrial;
  }

  #currentEnvironment() {
    const root = this.#root;
    if (!root) throw new Error('HumanMatchStudyWebApp Root 已释放。');
    this.#environment = detectWebResearchEnvironment(root);
    return this.#environment;
  }

  #buildMatchesActive(active: HumanMatchStudyCheckpoint | null): boolean {
    const manifest = this.#buildIdentity?.manifest ?? null;
    return manifest !== null
      && active?.commit === manifest.commit
      && active?.buildId === manifest.buildId;
  }

  #model() {
    const controller = this.#controller;
    const definition = this.#definition;
    if (!controller || !definition) throw new Error('HumanMatchStudyWebApp 模型依赖已释放。');
    const workspace = controller.getOperatorSnapshot();
    const participant = controller.getParticipantSnapshot();
    const active = workspace.activeTrial;
    const identity = this.#buildIdentity;
    const manifest = identity?.manifest ?? null;
    const environment = this.#currentEnvironment();
    const environmentReady = sameEnvironment(environment, definition.environment);
    const buildReady = identity?.collectable ?? false;
    const phase = participant.phase;
    let error = this.#lastError;
    if (error === null && !buildReady && phase === 'idle') {
      error = `正式采集已阻断：${identity?.reason ?? 'destroyed'}。`;
    }
    if (error === null && !environmentReady && phase !== 'export-pending') {
      error = '正式采集只允许 Web 手机竖屏触控环境。';
    }
    return Object.freeze({
      phase,
      terminalStatus: active?.terminalStatus ?? null,
      statusText: statusText(phase, active?.terminalStatus ?? null),
      participantId: participant.participantId,
      completedMatchCount: participant.completedMatchCount,
      totalMatchCount: participant.totalMatchCount,
      receiptCount: workspace.receipts.length,
      packageReceipt: active?.packageReceipt ?? null,
      environment,
      buildId: manifest?.buildId ?? null,
      collectable: buildReady,
      canEnroll: (
        phase === 'idle'
        && buildReady
        && environmentReady
        && error === null
      ),
      canStart: (
        phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.ENROLLED
        && buildReady
        && environmentReady
        && this.#buildMatchesActive(active)
        && error === null
      ),
      error,
    });
  }

  #render() {
    if (this.#destroyed) return;
    this.#view?.render(this.#model());
  }

  #captureMatches(): readonly unknown[] {
    return this.#runtime?.exportMatches() ?? Object.freeze([]);
  }

  #stopGame(): void {
    this.#runtime?.stopPresentation();
  }

  #handleCaptureProgress(participantSnapshot: HumanMatchStudyParticipantSnapshot): void {
    const active = this.#active();
    if (active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING) return;
    const controller = this.#controller;
    if (!controller) throw new Error('HumanMatchStudyWebApp Controller 已释放。');
    controller.updateProgress(participantSnapshot.completedMatchCount);
    if (participantSnapshot.state === HUMAN_MATCH_STUDY_CAPTURE_STATE.COMPLETED) {
      controller.beginReview({
        status: HUMAN_MATCH_STUDY_STATUS.COMPLETED,
        terminationReason: HUMAN_MATCH_STUDY_TERMINATION_REASON.STUDY_COMPLETED,
        completedMatchCount: participantSnapshot.completedMatchCount,
      });
      this.#stopGame();
    }
    this.#render();
  }

  #handleRuntimeFailure(error: unknown): void {
    if (this.#destroyed) return;
    this.#lastError = errorMessage(error);
    let active: HumanMatchStudyCheckpoint | null = null;
    try {
      active = this.#active();
    } catch (workspaceError) {
      this.#lastError = `${this.#lastError}；Workspace 已不可读：${
        errorMessage(workspaceError)
      }`;
    }
    if (active?.phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING) {
      let completedMatchCount = 0;
      try { completedMatchCount = this.#captureMatches().length; } catch { completedMatchCount = 0; }
      try {
        const controller = this.#controller;
        if (!controller) throw new Error('HumanMatchStudyWebApp Controller 已释放。');
        controller.updateProgress(completedMatchCount);
        controller.beginReview({
          status: HUMAN_MATCH_STUDY_STATUS.INVALIDATED,
          terminationReason: HUMAN_MATCH_STUDY_TERMINATION_REASON.RUNTIME_FAILED,
          completedMatchCount,
        });
      } catch (transitionError) {
        this.#lastError = `${this.#lastError}；作废检查点失败：${errorMessage(transitionError)}`;
      }
    }
    try { this.#stopGame(); } catch (cleanupError) {
      this.#lastError = `${this.#lastError}；运行时清理失败：${errorMessage(cleanupError)}`;
    }
    try {
      this.#render();
    } catch (renderError) {
      this.#lastError = `${this.#lastError}；状态读取失败：${
        errorMessage(renderError)
      }`;
      this.#view?.showFatalError(this.#lastError);
    }
  }

  #assertFormalEnvironment() {
    const identity = this.#buildIdentity;
    const definition = this.#definition;
    if (!identity?.collectable) {
      throw new Error(`当前构建不能采集正式证据：${identity?.reason ?? 'destroyed'}。`);
    }
    if (!definition || !sameEnvironment(this.#currentEnvironment(), definition.environment)) {
      throw new Error('当前设备不是预注册的 Web 手机竖屏触控环境。');
    }
  }

  #actions() {
    const controller = this.#controller;
    const view = this.#view;
    const root = this.#root;
    if (!controller || !view || !root) {
      throw new Error('HumanMatchStudyWebApp actions 依赖已释放。');
    }
    return Object.freeze({
      enroll: async () => {
        this.#assertFormalEnvironment();
        const enrollment = view.getEnrollment();
        if (!enrollment.eligibility.consentConfirmed) {
          throw new Error('未确认知情同意，禁止入组。');
        }
        if (
          enrollment.eligibility.priorArenaExperience
          || enrollment.eligibility.priorStudyExposure
          || enrollment.eligibility.briefingDeviation
          || enrollment.eligibility.operatorAssistance
        ) throw new Error('该参与者不满足 V1 新手与无干预入组条件。');
        const workspace = controller.getOperatorSnapshot();
        const enrollmentIndex = workspace.receipts.length;
        const manifest = this.#buildIdentity?.manifest ?? null;
        if (!manifest) throw new Error('Human Match Study clean build identity 缺失。');
        const trialId = anonymousId(root, 's9-study-trial', enrollmentIndex);
        controller.enroll({
          participantId: anonymousId(root, 's9-participant', enrollmentIndex),
          trialId,
          commit: manifest.commit,
          buildId: manifest.buildId,
          performedAt: utcNow(root),
          operatorId: enrollment.operatorId,
          environment: this.#currentEnvironment(),
          eligibility: enrollment.eligibility,
        });
        this.#lastError = null;
        this.#render();
      },
      start: () => this.#startTrial(),
      invalidateEnrolled: async () => {
        controller.invalidateEnrolled();
        this.#lastError = null;
        this.#render();
      },
      abandon: async () => {
        const active = this.#active();
        if (active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING) return;
        const completedMatchCount = this.#captureMatches().length;
        controller.updateProgress(completedMatchCount);
        controller.beginReview({
          status: HUMAN_MATCH_STUDY_STATUS.ABANDONED,
          terminationReason: HUMAN_MATCH_STUDY_TERMINATION_REASON.PARTICIPANT_ABANDONED,
          completedMatchCount,
        });
        this.#stopGame();
        this.#render();
      },
      exportPackage: async () => {
        const active = this.#active();
        if (!active) throw new Error('没有可导出的 Human Match Study trial。');
        const matches = active.phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RECOVERY_REQUIRED
          ? []
          : this.#captureMatches();
        const selfReport = active.terminalStatus === HUMAN_MATCH_STUDY_STATUS.COMPLETED
          ? view.getSelfReport()
          : null;
        const capturePackage = controller.createCapturePackage({
          matches,
          selfReport,
        });
        const receipt = await downloadHumanMatchStudyCapturePackage(
          root,
          capturePackage,
        );
        controller.markExportPending(capturePackage, receipt);
        this.#runtime?.destroy();
        this.#runtime = null;
        this.#lastError = null;
        this.#render();
      },
      confirmExport: async () => {
        controller.confirmExport(utcNow(root));
        view.resetEnrollment();
        this.#lastError = null;
        this.#render();
      },
      fileLost: async () => {
        controller.requireRecovery();
        this.#lastError = '原导出文件未确认，当前 assignment 必须以零局作废包重新归档。';
        this.#render();
      },
      exportWorkspace: async () => {
        await downloadHumanMatchStudyWorkspace(
          root,
          controller.getOperatorSnapshot(),
        );
      },
    });
  }

  async #startTrial(): Promise<void> {
    if (this.#transitioning) throw new Error('真人研究运行时正在转换。');
    this.#assertFormalEnvironment();
    const active = this.#active();
    if (!this.#buildMatchesActive(active)) {
      throw new Error('入组检查点与当前 clean build 不一致，请先作废。');
    }
    this.#transitioning = true;
    try {
      const controller = this.#controller;
      const definition = this.#definition;
      const platform = this.#platform;
      const root = this.#root;
      if (!controller || !definition || !platform || !root) {
        throw new Error('HumanMatchStudyWebApp 运行依赖已释放。');
      }
      const running = controller.start();
      const runtime = new HumanMatchStudyProductRuntime({
        definition,
        assignment: running.assignment,
        platform,
        root,
        trialId: running.trialId,
        onProgress: (snapshot: HumanMatchStudyParticipantSnapshot) => (
          this.#handleCaptureProgress(snapshot)
        ),
        onFailure: (error: unknown) => this.#handleRuntimeFailure(error),
      });
      this.#runtime = runtime;
      this.#render();
      await runtime.start();
      this.#lastError = null;
      this.#render();
    } catch (error) {
      this.#handleRuntimeFailure(error);
      throw error;
    } finally {
      this.#transitioning = false;
    }
  }

  #bindLifecycle() {
    const platform = this.#platform;
    const root = this.#root;
    const definition = this.#definition;
    if (!platform || !root || !definition) {
      throw new Error('HumanMatchStudyWebApp 生命周期依赖已释放。');
    }
    this.#cleanups.push(platform.onResize(() => {
      if (this.#destroyed) return;
      const active = this.#active();
      if (
        active?.phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING
        && !sameEnvironment(this.#currentEnvironment(), definition.environment)
      ) {
        const completedMatchCount = this.#captureMatches().length;
        try {
          const controller = this.#controller;
          if (!controller) throw new Error('HumanMatchStudyWebApp Controller 已释放。');
          controller.updateProgress(completedMatchCount);
          controller.beginReview({
            status: HUMAN_MATCH_STUDY_STATUS.INVALIDATED,
            terminationReason: HUMAN_MATCH_STUDY_TERMINATION_REASON.PROTOCOL_DEVIATION,
            completedMatchCount,
          });
          this.#stopGame();
          this.#lastError = '运行中离开预注册手机竖屏触控环境，本次已作废。';
        } catch (error) {
          this.#handleRuntimeFailure(error);
        }
      }
      this.#render();
    }));
    const beforeUnload = () => {
      try { this.destroy(); } catch { /* browser teardown remains best-effort */ }
    };
    root.addEventListener?.('beforeunload', beforeUnload);
    this.#cleanups.push(() => root.removeEventListener?.('beforeunload', beforeUnload));
    this.#heartbeatToken = root.setInterval?.(() => {
      if (root.document?.hidden) return;
      try { this.#controller?.renewLease(); } catch (error) {
        this.#handleRuntimeFailure(error);
      }
    }, HEARTBEAT_INTERVAL_MS) ?? null;
    this.#healthToken = root.setInterval?.(() => {
      if (this.#runtime === null) return;
      try {
        this.#runtime.assertHealthy();
      } catch (error) {
        this.#handleRuntimeFailure(error);
      }
    }, RUNTIME_HEALTH_INTERVAL_MS) ?? null;
  }

  async #startOnce(): Promise<this> {
    try {
      const controller = this.#controller;
      const view = this.#view;
      const root = this.#root;
      if (!controller || !view || !root) throw new Error('HumanMatchStudyWebApp 依赖已释放。');
      controller.open();
      view.bind(this.#actions());
      this.#bindLifecycle();
      this.#render();
      const buildIdentity = await loadHumanMatchStudyBuildIdentity(root);
      if (this.#destroyed) throw new Error('HumanMatchStudyWebApp 在启动期间已销毁。');
      this.#buildIdentity = buildIdentity;
      this.#started = true;
      this.#render();
      return this;
    } catch (error) {
      try {
        this.destroy();
      } catch (cleanupError) {
        throw Object.assign(new Error('HumanMatchStudyWebApp 启动失败且清理未完整完成。', {
          cause: error,
        }), { cleanupError });
      }
      throw error;
    }
  }

  start(): Promise<this> {
    if (this.#destroyed) return Promise.reject(new Error('HumanMatchStudyWebApp 已销毁。'));
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
    return this.#model();
  }

  destroy(): void {
    if (
      this.#destroyed
      && this.#runtime === null
      && this.#controller === null
      && this.#view === null
      && this.#heartbeatToken === null
      && this.#healthToken === null
      && this.#cleanups.length === 0
    ) return;
    this.#destroyed = true;
    const errors: unknown[] = [];
    for (const [field, token] of [
      ['heartbeat', this.#heartbeatToken],
      ['health', this.#healthToken],
    ]) {
      if (token === null) continue;
      try {
        this.#root?.clearInterval?.(token);
        if (field === 'heartbeat') this.#heartbeatToken = null;
        else this.#healthToken = null;
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
    if (this.#runtime !== null) {
      try {
        this.#runtime.destroy();
        this.#runtime = null;
      } catch (error) {
        errors.push(error);
      }
    }
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
      throw Object.assign(new Error('HumanMatchStudyWebApp 清理未完整完成。'), {
        cleanupErrors: errors,
      });
    }
    this.#platform = null;
    this.#definition = null;
    this.#buildIdentity = null;
    this.#environment = null;
    this.#startPromise = null;
    this.#root = null;
  }
}
