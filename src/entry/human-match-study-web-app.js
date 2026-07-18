import {
  HUMAN_MATCH_STUDY_CAPTURE_STATE,
} from '../arena/study/human-match-study-capture-session.js';
import {
  createArenaStage9HumanFairnessV1Definition,
} from '../arena/study/arena-stage9-human-fairness-v1.js';
import {
  HUMAN_MATCH_STUDY_STATUS,
  HUMAN_MATCH_STUDY_TERMINATION_REASON,
} from '../arena/study/human-match-study-record.js';
import {
  HUMAN_MATCH_STUDY_CHECKPOINT_PHASE,
} from '../arena/study/human-match-study-workspace.js';
import {
  HumanMatchStudyWorkspaceController,
} from '../arena/study/human-match-study-workspace-controller.js';
import {
  HumanMatchStudyWorkspaceRepository,
} from '../arena/study/human-match-study-workspace-repository.js';
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
} from './web-research-environment.js';

const HEARTBEAT_INTERVAL_MS = 20_000;
const RUNTIME_HEALTH_INTERVAL_MS = 1_000;

function sameEnvironment(left, right) {
  return ['platform', 'formFactor', 'orientation', 'inputMode'].every(
    (key) => left?.[key] === right?.[key],
  );
}

function anonymousId(root, prefix, enrollmentIndex) {
  let suffix = null;
  try {
    suffix = root.crypto?.randomUUID?.() ?? null;
  } catch {
    suffix = null;
  }
  if (typeof suffix !== 'string' || suffix.length === 0) {
    const now = Number.isFinite(root.Date?.now?.()) ? root.Date.now() : Date.now();
    suffix = `${now}-${enrollmentIndex}`;
  }
  return `${prefix}-${suffix}`;
}

function statusText(phase, terminalStatus) {
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
  #root;
  #platform;
  #definition;
  #controller;
  #view;
  #buildIdentity;
  #environment;
  #runtime;
  #heartbeatToken;
  #healthToken;
  #cleanups;
  #started;
  #destroyed;
  #transitioning;
  #lastError;

  constructor({ platform, root = globalThis }) {
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
    this.#started = false;
    this.#destroyed = false;
    this.#transitioning = false;
    this.#lastError = null;
    Object.freeze(this);
  }

  #active() {
    return this.#controller.getOperatorSnapshot().activeTrial;
  }

  #currentEnvironment() {
    this.#environment = detectWebResearchEnvironment(this.#root);
    return this.#environment;
  }

  #buildMatchesActive(active) {
    const manifest = this.#buildIdentity.manifest;
    return manifest !== null
      && active?.commit === manifest.commit
      && active?.buildId === manifest.buildId;
  }

  #model() {
    const workspace = this.#controller.getOperatorSnapshot();
    const participant = this.#controller.getParticipantSnapshot();
    const active = workspace.activeTrial;
    const manifest = this.#buildIdentity.manifest;
    const environment = this.#currentEnvironment();
    const environmentReady = sameEnvironment(environment, this.#definition.environment);
    const buildReady = this.#buildIdentity.collectable;
    const phase = participant.phase;
    let error = this.#lastError;
    if (error === null && !buildReady && phase === 'idle') {
      error = `正式采集已阻断：${this.#buildIdentity.reason}。`;
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
    this.#view.render(this.#model());
  }

  #captureMatches() {
    return this.#runtime?.exportMatches() ?? Object.freeze([]);
  }

  #stopGame() {
    this.#runtime?.stopPresentation();
  }

  #handleCaptureProgress(participantSnapshot) {
    const active = this.#active();
    if (active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING) return;
    this.#controller.updateProgress(participantSnapshot.completedMatchCount);
    if (participantSnapshot.state === HUMAN_MATCH_STUDY_CAPTURE_STATE.COMPLETED) {
      this.#controller.beginReview({
        status: HUMAN_MATCH_STUDY_STATUS.COMPLETED,
        terminationReason: HUMAN_MATCH_STUDY_TERMINATION_REASON.STUDY_COMPLETED,
        completedMatchCount: participantSnapshot.completedMatchCount,
      });
      this.#stopGame();
    }
    this.#render();
  }

  #handleRuntimeFailure(error) {
    if (this.#destroyed) return;
    this.#lastError = error?.message ?? String(error);
    let active = null;
    try {
      active = this.#active();
    } catch (workspaceError) {
      this.#lastError = `${this.#lastError}；Workspace 已不可读：${
        workspaceError?.message ?? String(workspaceError)
      }`;
    }
    if (active?.phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING) {
      let completedMatchCount = 0;
      try { completedMatchCount = this.#captureMatches().length; } catch { completedMatchCount = 0; }
      try {
        this.#controller.updateProgress(completedMatchCount);
        this.#controller.beginReview({
          status: HUMAN_MATCH_STUDY_STATUS.INVALIDATED,
          terminationReason: HUMAN_MATCH_STUDY_TERMINATION_REASON.RUNTIME_FAILED,
          completedMatchCount,
        });
      } catch (transitionError) {
        this.#lastError = `${this.#lastError}；作废检查点失败：${transitionError.message}`;
      }
    }
    try { this.#stopGame(); } catch (cleanupError) {
      this.#lastError = `${this.#lastError}；运行时清理失败：${cleanupError.message}`;
    }
    try {
      this.#render();
    } catch (renderError) {
      this.#lastError = `${this.#lastError}；状态读取失败：${
        renderError?.message ?? String(renderError)
      }`;
      this.#view?.showFatalError(this.#lastError);
    }
  }

  #assertFormalEnvironment() {
    if (!this.#buildIdentity.collectable) {
      throw new Error(`当前构建不能采集正式证据：${this.#buildIdentity.reason}。`);
    }
    if (!sameEnvironment(this.#currentEnvironment(), this.#definition.environment)) {
      throw new Error('当前设备不是预注册的 Web 手机竖屏触控环境。');
    }
  }

  #actions() {
    return Object.freeze({
      enroll: async () => {
        this.#assertFormalEnvironment();
        const enrollment = this.#view.getEnrollment();
        if (!enrollment.eligibility.consentConfirmed) {
          throw new Error('未确认知情同意，禁止入组。');
        }
        if (
          enrollment.eligibility.priorArenaExperience
          || enrollment.eligibility.priorStudyExposure
          || enrollment.eligibility.briefingDeviation
          || enrollment.eligibility.operatorAssistance
        ) throw new Error('该参与者不满足 V1 新手与无干预入组条件。');
        const workspace = this.#controller.getOperatorSnapshot();
        const enrollmentIndex = workspace.receipts.length;
        const manifest = this.#buildIdentity.manifest;
        const trialId = anonymousId(this.#root, 's9-study-trial', enrollmentIndex);
        this.#controller.enroll({
          participantId: anonymousId(this.#root, 's9-participant', enrollmentIndex),
          trialId,
          commit: manifest.commit,
          buildId: manifest.buildId,
          performedAt: new this.#root.Date().toISOString(),
          operatorId: enrollment.operatorId,
          environment: this.#currentEnvironment(),
          eligibility: enrollment.eligibility,
        });
        this.#lastError = null;
        this.#render();
      },
      start: () => this.#startTrial(),
      invalidateEnrolled: async () => {
        this.#controller.invalidateEnrolled();
        this.#lastError = null;
        this.#render();
      },
      abandon: async () => {
        const active = this.#active();
        if (active?.phase !== HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING) return;
        const completedMatchCount = this.#captureMatches().length;
        this.#controller.updateProgress(completedMatchCount);
        this.#controller.beginReview({
          status: HUMAN_MATCH_STUDY_STATUS.ABANDONED,
          terminationReason: HUMAN_MATCH_STUDY_TERMINATION_REASON.PARTICIPANT_ABANDONED,
          completedMatchCount,
        });
        this.#stopGame();
        this.#render();
      },
      exportPackage: async () => {
        const active = this.#active();
        const matches = active.phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RECOVERY_REQUIRED
          ? []
          : this.#captureMatches();
        const selfReport = active.terminalStatus === HUMAN_MATCH_STUDY_STATUS.COMPLETED
          ? this.#view.getSelfReport()
          : null;
        const capturePackage = this.#controller.createCapturePackage({
          matches,
          selfReport,
        });
        const receipt = await downloadHumanMatchStudyCapturePackage(
          this.#root,
          capturePackage,
        );
        this.#controller.markExportPending(capturePackage, receipt);
        this.#runtime?.destroy();
        this.#runtime = null;
        this.#lastError = null;
        this.#render();
      },
      confirmExport: async () => {
        this.#controller.confirmExport(new this.#root.Date().toISOString());
        this.#view.resetEnrollment();
        this.#lastError = null;
        this.#render();
      },
      fileLost: async () => {
        this.#controller.requireRecovery();
        this.#lastError = '原导出文件未确认，当前 assignment 必须以零局作废包重新归档。';
        this.#render();
      },
      exportWorkspace: async () => {
        await downloadHumanMatchStudyWorkspace(
          this.#root,
          this.#controller.getOperatorSnapshot(),
        );
      },
    });
  }

  async #startTrial() {
    if (this.#transitioning) throw new Error('真人研究运行时正在转换。');
    this.#assertFormalEnvironment();
    const active = this.#active();
    if (!this.#buildMatchesActive(active)) {
      throw new Error('入组检查点与当前 clean build 不一致，请先作废。');
    }
    this.#transitioning = true;
    try {
      const running = this.#controller.start();
      const runtime = new HumanMatchStudyProductRuntime({
        definition: this.#definition,
        assignment: running.assignment,
        platform: this.#platform,
        root: this.#root,
        trialId: running.trialId,
        onProgress: (snapshot) => this.#handleCaptureProgress(snapshot),
        onFailure: (error) => this.#handleRuntimeFailure(error),
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
    this.#cleanups.push(this.#platform.onResize(() => {
      if (this.#destroyed) return;
      const active = this.#active();
      if (
        active?.phase === HUMAN_MATCH_STUDY_CHECKPOINT_PHASE.RUNNING
        && !sameEnvironment(this.#currentEnvironment(), this.#definition.environment)
      ) {
        const completedMatchCount = this.#captureMatches().length;
        try {
          this.#controller.updateProgress(completedMatchCount);
          this.#controller.beginReview({
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
    this.#root.addEventListener?.('beforeunload', beforeUnload);
    this.#cleanups.push(() => this.#root.removeEventListener?.('beforeunload', beforeUnload));
    this.#heartbeatToken = this.#root.setInterval?.(() => {
      if (this.#root.document?.hidden) return;
      try { this.#controller.renewLease(); } catch (error) {
        this.#handleRuntimeFailure(error);
      }
    }, HEARTBEAT_INTERVAL_MS) ?? null;
    this.#healthToken = this.#root.setInterval?.(() => {
      if (this.#runtime === null) return;
      try {
        this.#runtime.assertHealthy();
      } catch (error) {
        this.#handleRuntimeFailure(error);
      }
    }, RUNTIME_HEALTH_INTERVAL_MS) ?? null;
  }

  async start() {
    if (this.#destroyed) throw new Error('HumanMatchStudyWebApp 已销毁。');
    if (this.#started) return this;
    try {
      this.#controller.open();
      this.#view.bind(this.#actions());
      this.#bindLifecycle();
      this.#started = true;
      this.#render();
      this.#buildIdentity = await loadHumanMatchStudyBuildIdentity(this.#root);
      this.#render();
      return this;
    } catch (error) {
      try { this.destroy(); } catch { /* startup error remains primary */ }
      throw error;
    }
  }

  getSnapshot() {
    if (this.#destroyed) return Object.freeze({ state: 'destroyed' });
    return this.#model();
  }

  destroy() {
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
    const errors = [];
    for (const [field, token] of [
      ['heartbeat', this.#heartbeatToken],
      ['health', this.#healthToken],
    ]) {
      if (token === null) continue;
      try {
        this.#root.clearInterval?.(token);
        if (field === 'heartbeat') this.#heartbeatToken = null;
        else this.#healthToken = null;
      } catch (error) {
        errors.push(error);
      }
    }
    const retryCleanups = [];
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
      const failure = new Error('HumanMatchStudyWebApp 清理未完整完成。');
      failure.cleanupErrors = errors;
      throw failure;
    }
    this.#platform = null;
    this.#definition = null;
    this.#buildIdentity = null;
    this.#environment = null;
    this.#root = null;
  }
}
