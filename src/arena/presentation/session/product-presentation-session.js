import { normalizeThrownError } from '@number-strategy-jump/arena-contracts';
import { PRODUCT_SESSION_STATE } from '../../product/state/product-session-transition-definition.js';
import { PRODUCT_INPUT_ROUTER_MODE } from '../product/product-input-router.js';
import { PRODUCT_UI_INTENT_ID } from '../product/product-ui-intent.js';
import {
  PRODUCT_PRESENTATION_FLOW_STATE,
} from '../product/product-presentation-flow.js';
import {
  createPresentationMemorySnapshot,
  mergePresentationMemorySnapshot,
} from '../performance/presentation-memory-snapshot.js';
import { createProductPresentationSessionComposition } from './product-presentation-session-composition.js';

export const PRODUCT_PRESENTATION_SESSION_STATE = Object.freeze({
  CREATED: 'created',
  STARTING: 'starting',
  RUNNING: 'running',
  PAUSED: 'paused',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

function validateCanvas(value) {
  if (!value || typeof value.getContext !== 'function') {
    throw new TypeError('ProductPresentationSession platform.createCanvas() 未返回 Canvas。');
  }
  return value;
}

function validateRenderer(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('ProductPresentationSession renderer 无效。');
  }
  for (const method of [
    'load',
    'render',
    'resize',
    'getInputViewport',
    'hitTestUi',
    'bindUiIntent',
    'handleContextLost',
    'handleContextRestored',
    'dispose',
  ]) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`ProductPresentationSession renderer 缺少 ${method}()。`);
    }
  }
  return value;
}

function validateController(value) {
  if (
    !value
    || typeof value.getSnapshot !== 'function'
    || typeof value.destroy !== 'function'
  ) throw new TypeError('ProductPresentationSession controller 不符合合同。');
  return value;
}

function validateFlow(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('ProductPresentationSession flow 无效。');
  }
  for (const method of [
    'start',
    'dispatch',
    'stepMatch',
    'heartbeat',
    'hide',
    'show',
    'getSnapshot',
    'destroy',
  ]) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`ProductPresentationSession flow 缺少 ${method}()。`);
    }
  }
  return value;
}

function validateInputRouter(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('ProductPresentationSession inputRouter 无效。');
  }
  for (const method of [
    'setMode',
    'resize',
    'suspend',
    'resume',
    'sample',
    'replaceSampler',
    'pointerStart',
    'pointerMove',
    'pointerEnd',
    'pointerCancel',
    'destroy',
  ]) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`ProductPresentationSession inputRouter 缺少 ${method}()。`);
    }
  }
  return value;
}

function validateInputAdapter(value) {
  if (
    !value
    || typeof value.start !== 'function'
    || typeof value.destroy !== 'function'
  ) throw new TypeError('ProductPresentationSession inputAdapter 不符合合同。');
  return value;
}

function validateAccumulator(value) {
  if (
    !value
    || typeof value.push !== 'function'
    || typeof value.reset !== 'function'
  ) throw new TypeError('ProductPresentationSession accumulator 不符合合同。');
  return value;
}

function validateFrameLoop(value) {
  if (
    !value
    || typeof value.start !== 'function'
    || typeof value.stop !== 'function'
    || typeof value.destroy !== 'function'
  ) throw new TypeError('ProductPresentationSession frameLoop 不符合合同。');
  return value;
}

function validateRenderPacer(value) {
  if (
    !value
    || typeof value.shouldRender !== 'function'
    || typeof value.reset !== 'function'
  ) throw new TypeError('ProductPresentationSession renderPacer 不符合合同。');
  return value;
}

function validatePerformanceProbe(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('ProductPresentationSession performanceProbe 无效。');
  }
  for (const method of [
    'start',
    'markMilestone',
    'recordFrame',
    'stop',
    'getSnapshot',
    'destroy',
  ]) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`ProductPresentationSession performanceProbe 缺少 ${method}()。`);
    }
  }
  return value;
}

function cleanupFailure(errors) {
  if (errors.length === 0) return null;
  const failure = new Error('ProductPresentationSession 清理未完整完成。');
  failure.cleanupErrors = errors.map((error) => normalizeThrownError(
    error,
    'ProductPresentationSession 资源清理失败',
  ));
  return failure;
}

export class ProductPresentationSession {
  #composition;
  #state;
  #startPromise;
  #destroyRequested;
  #processingFrame;
  #cleaningUp;
  #cleanupIncomplete;
  #deferredFailureCleanup;
  #hidden;
  #contextLost;
  #externallyPaused;
  #resizePending;
  #lastError;
  #canvas;
  #renderer;
  #controller;
  #flow;
  #inputRouter;
  #inputAdapter;
  #accumulator;
  #frameLoop;
  #renderPacer;
  #performanceProbe;
  #performanceProbeErrorCount;
  #lastPerformanceSnapshot;
  #lastPublishTelemetry;
  #firstMatchMilestoneRecorded;
  #performanceObservedMatchCount;
  #performanceMatchActive;
  #performanceLifecycleCounters;
  #bindings;
  #lastSnapshot;
  #inputMatchActive;
  #hasAssignedMatchSampler;
  #lastWallNowMs;
  #nextProfileLeaseHeartbeatAtMs;

  constructor(platform, options = {}) {
    this.#composition = createProductPresentationSessionComposition(platform, options);
    this.#state = PRODUCT_PRESENTATION_SESSION_STATE.CREATED;
    this.#startPromise = null;
    this.#destroyRequested = false;
    this.#processingFrame = false;
    this.#cleaningUp = false;
    this.#cleanupIncomplete = false;
    this.#deferredFailureCleanup = false;
    this.#hidden = false;
    this.#contextLost = false;
    this.#externallyPaused = false;
    this.#resizePending = false;
    this.#lastError = null;
    this.#canvas = null;
    this.#renderer = null;
    this.#controller = null;
    this.#flow = null;
    this.#inputRouter = null;
    this.#inputAdapter = null;
    this.#accumulator = null;
    this.#frameLoop = null;
    this.#renderPacer = null;
    this.#performanceProbe = null;
    this.#performanceProbeErrorCount = 0;
    this.#lastPerformanceSnapshot = null;
    this.#lastPublishTelemetry = null;
    this.#firstMatchMilestoneRecorded = false;
    this.#performanceObservedMatchCount = 0;
    this.#performanceMatchActive = false;
    this.#performanceLifecycleCounters = {
      hideCount: 0,
      showCount: 0,
      contextLostCount: 0,
      contextRestoredCount: 0,
    };
    this.#bindings = [];
    this.#lastSnapshot = null;
    this.#inputMatchActive = false;
    this.#hasAssignedMatchSampler = false;
    this.#lastWallNowMs = null;
    this.#nextProfileLeaseHeartbeatAtMs = null;
    Object.freeze(this);
  }

  get state() {
    return this.#state;
  }

  #isTerminal() {
    return this.#state === PRODUCT_PRESENTATION_SESSION_STATE.FAILED
      || this.#state === PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED;
  }

  #report(type, detail = {}) {
    try { this.#composition.onDiagnostic(Object.freeze({ type, ...detail })); } catch {
      // Diagnostics are observational and cannot own Product lifecycle.
    }
  }

  #performanceNow() {
    try {
      const value = this.#composition.platform.now();
      if (Number.isFinite(value) && value >= 0) return value;
    } catch {
      // Performance observation must not own Product lifecycle.
    }
    return null;
  }

  #observePerformance(method, ...args) {
    if (this.#performanceProbe === null) return false;
    try {
      return this.#performanceProbe[method](...args);
    } catch (error) {
      this.#performanceProbeErrorCount += 1;
      this.#report('performance-probe-error', {
        method,
        message: error?.message ?? String(error),
      });
      return false;
    }
  }

  #markPerformanceMilestone(id, timestampMs = this.#performanceNow()) {
    if (timestampMs === null) return false;
    return this.#observePerformance('markMilestone', id, timestampMs);
  }

  #guardHost(callback) {
    return (...args) => {
      if (this.#isTerminal() || this.#destroyRequested) return false;
      try {
        callback(...args);
        return true;
      } catch (error) {
        this.#fail(error);
        return false;
      }
    };
  }

  #registerCleanup(cleanup, name) {
    if (typeof cleanup !== 'function') throw new TypeError(`${name} 必须返回 cleanup 函数。`);
    this.#bindings.push(cleanup);
  }

  #bindCanvasEvent(type, callback) {
    if (typeof this.#canvas?.addEventListener !== 'function') {
      throw new TypeError(`Product Canvas 缺少 ${type} 事件能力。`);
    }
    this.#canvas.addEventListener(type, callback, false);
    let active = true;
    return () => {
      if (!active) return;
      if (this.#canvas === null) {
        throw new Error(`Product Canvas ${type} 清理时 Canvas 已丢失。`);
      }
      this.#canvas.removeEventListener?.(type, callback, false);
      active = false;
    };
  }

  #failFromHost(error) {
    if (this.#cleaningUp || this.#destroyRequested || this.#isTerminal()) return;
    this.#fail(error);
  }

  #bindLifecycle() {
    const platform = this.#composition.platform;
    this.#registerCleanup(platform.onResize(this.#guardHost(() => this.#handleResize())), 'onResize');
    this.#registerCleanup(platform.onHide(this.#guardHost(() => {
      this.#performanceLifecycleCounters.hideCount += 1;
      this.#hidden = true;
      this.#syncPauseState();
    })), 'onHide');
    this.#registerCleanup(platform.onShow(this.#guardHost(() => {
      this.#performanceLifecycleCounters.showCount += 1;
      this.#hidden = false;
      this.#syncPauseState();
    })), 'onShow');
    this.#registerCleanup(this.#bindCanvasEvent(
      'webglcontextlost',
      this.#guardHost((event) => {
        this.#performanceLifecycleCounters.contextLostCount += 1;
        this.#renderer.handleContextLost(event);
        this.#contextLost = true;
        this.#syncPauseState();
      }),
    ), 'webglcontextlost');
    this.#registerCleanup(this.#bindCanvasEvent(
      'webglcontextrestored',
      this.#guardHost(() => {
        if (!this.#renderer.handleContextRestored()) return;
        this.#performanceLifecycleCounters.contextRestoredCount += 1;
        this.#contextLost = false;
        if (!this.#inputRouter) {
          this.#resizePending = true;
          return;
        }
        this.#applyResize();
        this.#syncPauseState();
      }),
    ), 'webglcontextrestored');
  }

  #desiredInputMode(snapshot) {
    if (snapshot.viewModel.terminal) return PRODUCT_INPUT_ROUTER_MODE.INACTIVE;
    if (snapshot.viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH) {
      return PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY;
    }
    return PRODUCT_INPUT_ROUTER_MODE.UI;
  }

  #updateInputMode(snapshot) {
    const inMatch = snapshot.viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH;
    if (!inMatch) {
      this.#inputMatchActive = false;
    } else if (!this.#inputMatchActive) {
      if (this.#hasAssignedMatchSampler) {
        this.#inputRouter.replaceSampler(this.#createSampler());
      }
      this.#hasAssignedMatchSampler = true;
      this.#inputMatchActive = true;
    }
    this.#inputRouter.setMode(this.#desiredInputMode(snapshot));
  }

  #createSampler() {
    const mapper = this.#composition.mapperFactory(this.#composition.mapperId);
    if (!mapper || mapper.id !== this.#composition.mapperId || typeof mapper.map !== 'function') {
      throw new TypeError('ProductPresentationSession mapperFactory 返回值不符合合同。');
    }
    return this.#composition.samplerFactory({
      participantId: 'player-1',
      viewport: this.#renderer.getInputViewport(),
      mapper,
    });
  }

  #readWallNow() {
    const now = this.#composition.platform.wallNow();
    if (!Number.isSafeInteger(now) || now < 0) {
      throw new RangeError('ProductPresentationSession platform.wallNow() 必须返回非负安全整数。');
    }
    if (this.#lastWallNowMs !== null && now < this.#lastWallNowMs) {
      throw new RangeError('ProductPresentationSession wallNow 不能在实例生命周期内倒退。');
    }
    this.#lastWallNowMs = now;
    return now;
  }

  #scheduleProfileLeaseHeartbeat(now, delayMs) {
    const next = now + delayMs;
    if (!Number.isSafeInteger(next)) {
      throw new RangeError('ProductPresentationSession Profile lease 心跳时间溢出。');
    }
    this.#nextProfileLeaseHeartbeatAtMs = next;
  }

  #heartbeatIfDue(force = false) {
    let snapshot = this.#flow.getSnapshot();
    if (snapshot.viewModel.terminal) {
      this.#nextProfileLeaseHeartbeatAtMs = null;
      return snapshot;
    }
    const now = this.#readWallNow();
    if (
      !force
      && this.#nextProfileLeaseHeartbeatAtMs !== null
      && now < this.#nextProfileLeaseHeartbeatAtMs
    ) return snapshot;
    const outcome = this.#flow.heartbeat();
    snapshot = outcome.snapshot;
    if (snapshot.viewModel.terminal) {
      this.#nextProfileLeaseHeartbeatAtMs = null;
      return snapshot;
    }
    this.#scheduleProfileLeaseHeartbeat(
      now,
      outcome.renewed
        ? this.#composition.profileLeaseHeartbeatIntervalMs
        : this.#composition.profileLeaseRetryIntervalMs,
    );
    return snapshot;
  }

  #publish(snapshot, deltaSeconds, { forceRender = false } = {}) {
    this.#lastSnapshot = snapshot;
    const performanceInMatch = snapshot?.viewModel?.activeState === PRODUCT_SESSION_STATE.IN_MATCH;
    const matchSeed = snapshot?.matchFrame?.source?.matchSeed;
    if (
      performanceInMatch
      && !this.#performanceMatchActive
      && Number.isSafeInteger(matchSeed)
      && matchSeed >= 0
      && matchSeed <= 0xffffffff
    ) {
      this.#performanceObservedMatchCount += 1;
    }
    this.#performanceMatchActive = performanceInMatch;
    this.#updateInputMode(snapshot);
    this.#lastPublishTelemetry = Object.freeze({
      rendered: false,
      renderDurationMs: null,
      resources: null,
    });
    if (this.#hidden || this.#contextLost || this.#destroyRequested || this.#isTerminal()) {
      return true;
    }
    if (!this.#renderPacer.shouldRender(deltaSeconds, { force: forceRender })) return true;
    const renderStartedAtMs = this.#performanceNow();
    const rendered = this.#renderer.render(Object.freeze({
      viewModel: snapshot.viewModel,
      matchFrame: snapshot.matchFrame,
    }), { deltaSeconds });
    const renderEndedAtMs = this.#performanceNow();
    let resources = null;
    const sampleResources = this.#performanceProbe?.shouldSampleResources?.() ?? true;
    if (sampleResources) {
      try { resources = this.#renderer.getPerformanceSnapshot?.() ?? null; } catch (error) {
        this.#performanceProbeErrorCount += 1;
        this.#report('performance-probe-error', {
          method: 'renderer.getPerformanceSnapshot',
          message: error?.message ?? String(error),
        });
      }
      try {
        const memory = createPresentationMemorySnapshot(
          this.#composition.performanceMemoryProvider(),
        );
        resources = mergePresentationMemorySnapshot(resources, memory);
      } catch (error) {
        this.#performanceProbeErrorCount += 1;
        this.#report('performance-probe-error', {
          method: 'performanceMemoryProvider',
          message: error?.message ?? String(error),
        });
      }
    }
    this.#lastPublishTelemetry = Object.freeze({
      rendered: rendered !== false,
      renderDurationMs: renderStartedAtMs !== null
        && renderEndedAtMs !== null
        && renderEndedAtMs >= renderStartedAtMs
        ? renderEndedAtMs - renderStartedAtMs
        : null,
      resources,
    });
    if (rendered === false) {
      this.#contextLost = true;
      if (this.#state !== PRODUCT_PRESENTATION_SESSION_STATE.STARTING) {
        this.#syncPauseState();
      }
    }
    return rendered;
  }

  #dispatchIntent(intent) {
    if (this.#isTerminal() || this.#destroyRequested) {
      return Promise.reject(new Error('ProductPresentationSession 不可处理 UI intent。'));
    }
    if (this.#flow === null) {
      return Promise.reject(new Error('ProductPresentationSession 尚未完成启动。'));
    }
    if (
      intent?.id === PRODUCT_UI_INTENT_ID.START_MATCH
      || intent?.id === PRODUCT_UI_INTENT_ID.REQUEST_MATCH
      || intent?.id === PRODUCT_UI_INTENT_ID.REQUEST_REMATCH
    ) this.#markPerformanceMilestone('first-match-requested');
    return this.#flow.dispatch(intent).then(
      (snapshot) => {
        if (snapshot === null || this.#isTerminal() || this.#destroyRequested) return snapshot;
        try {
          this.#publish(snapshot, 0, { forceRender: true });
          return this.#lastSnapshot;
        } catch (error) {
          throw this.#fail(error);
        }
      },
      (error) => {
        if (this.#flow?.state === PRODUCT_PRESENTATION_FLOW_STATE.FAILED) {
          throw this.#fail(error);
        }
        throw error;
      },
    );
  }

  async #initialize() {
    this.#renderPacer = validateRenderPacer(this.#composition.renderPacerFactory({
      qualityDefinition: this.#composition.qualityDefinition,
    }));
    this.#performanceProbe = this.#composition.performanceProbeFactory();
    validatePerformanceProbe(this.#performanceProbe);
    const probeStartedAtMs = this.#performanceNow();
    if (probeStartedAtMs !== null) this.#observePerformance('start', probeStartedAtMs);
    this.#canvas = validateCanvas(this.#composition.platform.createCanvas());
    this.#renderer = this.#composition.rendererFactory({
      canvas: this.#canvas,
      platform: this.#composition.platform,
      qualityDefinition: this.#composition.qualityDefinition,
    });
    validateRenderer(this.#renderer);
    this.#bindLifecycle();
    await this.#renderer.load();
    this.#markPerformanceMilestone('renderer-ready');
    if (this.#destroyRequested || this.#state === PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED) {
      throw new Error('ProductPresentationSession 启动已取消。');
    }
    this.#resizeRenderer();
    this.#resizePending = false;

    this.#controller = this.#composition.controllerFactory({
      storage: this.#composition.platform,
      ownerId: this.#composition.ownerId,
      profileLeaseHolderId: this.#composition.profileLeaseHolderId,
      wallNow: () => this.#composition.platform.wallNow(),
      seedSource: this.#composition.seedSource,
      matchConfig: this.#composition.matchConfig,
      matchCompletionSink: this.#composition.matchCompletionSink,
      keyPrefix: this.#composition.keyPrefix,
      profileLeaseTakeoverSameOwner: this.#composition.profileLeaseTakeoverSameOwner,
      diagnosticSink: (detail) => this.#report('product', { detail }),
    });
    validateController(this.#controller);
    this.#markPerformanceMilestone('controller-ready');
    let sampler = this.#createSampler();
    try {
      this.#inputRouter = this.#composition.inputRouterFactory({
        sampler,
        viewport: this.#renderer.getInputViewport(),
        hitTestUi: (point, viewport) => this.#renderer.hitTestUi(
          point,
          viewport,
          this.#lastSnapshot?.viewModel ?? this.#flow?.getSnapshot?.().viewModel ?? null,
        ),
        onIntent: (intent) => this.#dispatchIntent(intent),
        onIntentRejected: (error, intent) => this.#report('ui-intent-rejected', {
          message: error?.message ?? String(error),
          intentId: intent.id,
        }),
      });
      if (typeof this.#inputRouter?.destroy === 'function') sampler = null;
      validateInputRouter(this.#inputRouter);
    } finally {
      if (sampler !== null) sampler?.destroy?.();
    }
    this.#flow = this.#composition.flowFactory({
      controller: this.#controller,
      inputSource: this.#inputRouter,
    });
    validateFlow(this.#flow);
    this.#registerCleanup(this.#renderer.bindUiIntent({
      onIntent: (intent) => this.#dispatchIntent(intent),
      onRejected: (error, intent) => this.#report('ui-intent-rejected', {
        message: error?.message ?? String(error),
        intentId: intent?.id ?? null,
      }),
    }), 'renderer.bindUiIntent');
    this.#inputAdapter = this.#composition.inputAdapterFactory({
      platform: this.#composition.platform,
      sampler: this.#inputRouter,
      viewportProvider: () => this.#renderer.getInputViewport(),
      manageLifecycle: false,
      onError: (error) => this.#failFromHost(error),
    });
    validateInputAdapter(this.#inputAdapter);
    this.#accumulator = validateAccumulator(this.#composition.accumulatorFactory({
      fixedDeltaSeconds: this.#composition.fixedDeltaSeconds,
      maximumSteps: this.#composition.maximumCatchUpTicks,
    }));
    this.#frameLoop = this.#composition.frameLoopFactory({
      requestFrame: (callback) => this.#composition.platform.requestFrame(callback),
      cancelFrame: (token) => this.#composition.platform.cancelFrame(token),
      now: () => this.#composition.platform.now(),
      onError: (error) => this.#fail(error),
      maxDeltaSeconds: 0.1,
    });
    validateFrameLoop(this.#frameLoop);
    if (this.#resizePending) this.#applyResize();

    this.#lastSnapshot = this.#flow.getSnapshot();
    this.#updateInputMode(this.#lastSnapshot);
    this.#publish(this.#lastSnapshot, 0, { forceRender: true });
    const startingFlow = this.#flow.start();
    await Promise.resolve();
    this.#inputAdapter.start();
    if (this.#hidden || this.#contextLost || this.#externallyPaused) {
      this.#syncPauseState();
    }
    const started = await startingFlow;
    if (this.#destroyRequested || this.#state === PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED) {
      throw new Error('ProductPresentationSession 启动已取消。');
    }
    if (started !== null) this.#lastSnapshot = started;
    const heartbeatNow = this.#readWallNow();
    this.#scheduleProfileLeaseHeartbeat(
      heartbeatNow,
      this.#composition.profileLeaseHeartbeatIntervalMs,
    );
    this.#publish(this.#lastSnapshot ?? this.#flow.getSnapshot(), 0, { forceRender: true });
    this.#markPerformanceMilestone('interactive');
    this.#syncPauseState();
  }

  start() {
    if (this.#state === PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED) {
      return Promise.reject(new Error('ProductPresentationSession 已销毁。'));
    }
    if (this.#state === PRODUCT_PRESENTATION_SESSION_STATE.FAILED) {
      const error = new Error('ProductPresentationSession 已失败。');
      error.cause = this.#lastError;
      return Promise.reject(error);
    }
    if (this.#startPromise) return this.#startPromise;
    if (this.#state !== PRODUCT_PRESENTATION_SESSION_STATE.CREATED) {
      return Promise.resolve(this);
    }
    this.#state = PRODUCT_PRESENTATION_SESSION_STATE.STARTING;
    let operation;
    operation = this.#initialize()
      .then(() => this)
      .catch((error) => {
        if (this.#state === PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED) throw error;
        throw this.#fail(error);
      })
      .finally(() => {
        if (this.#startPromise === operation) this.#startPromise = null;
      });
    this.#startPromise = operation;
    return operation;
  }

  #startFrameLoop() {
    if (
      this.#isTerminal()
      || this.#hidden
      || this.#contextLost
      || this.#externallyPaused
      || this.#destroyRequested
      || this.#lastSnapshot?.viewModel?.terminal
    ) return false;
    return this.#frameLoop.start(({ timestamp, deltaSeconds }) => (
      this.#onFrame(timestamp, deltaSeconds)
    ));
  }

  #onFrame(timestamp, deltaSeconds) {
    if (this.#destroyRequested) return false;
    if (this.#processingFrame) throw new Error('ProductPresentationSession frame 不可重入。');
    this.#processingFrame = true;
    try {
      if (this.#resizePending) this.#applyResize();
      let snapshot = this.#heartbeatIfDue();
      let coreSteps = 0;
      let droppedSeconds = 0;
      if (snapshot.viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH) {
        const batch = this.#accumulator.push(deltaSeconds);
        coreSteps = batch.steps;
        droppedSeconds = batch.droppedSeconds;
        if (batch.droppedSeconds > 0) {
          this.#report('presentation-backlog-dropped', {
            droppedSeconds: batch.droppedSeconds,
          });
        }
        for (
          let index = 0;
          index < batch.steps
            && snapshot.viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH;
          index += 1
        ) snapshot = this.#flow.stepMatch();
      } else {
        this.#accumulator.reset();
      }
      this.#publish(snapshot, deltaSeconds);
      if (
        !this.#firstMatchMilestoneRecorded
        && snapshot.viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH
      ) {
        this.#firstMatchMilestoneRecorded = this.#markPerformanceMilestone(
          'first-match-ready',
          timestamp,
        );
      }
      this.#observePerformance('recordFrame', {
        timestampMs: timestamp,
        deltaSeconds,
        coreSteps,
        droppedSeconds,
        rendered: this.#lastPublishTelemetry?.rendered ?? false,
        renderDurationMs: this.#lastPublishTelemetry?.renderDurationMs ?? null,
        resources: this.#lastPublishTelemetry?.resources ?? null,
      });
      return !this.#hidden
        && !this.#contextLost
        && !this.#externallyPaused
        && !this.#destroyRequested
        && !this.#isTerminal()
        && !snapshot.viewModel.terminal;
    } finally {
      this.#processingFrame = false;
      if (this.#destroyRequested && this.#state !== PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED) {
        const errors = this.#cleanupResources();
        this.#state = PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED;
        const failure = cleanupFailure(errors);
        if (failure) this.#lastError = failure;
      } else if (this.#deferredFailureCleanup) {
        this.#completeFailureCleanup();
      }
    }
  }

  #resizeRenderer() {
    if (this.#renderer.resize(this.#composition.platform.getViewport()) === false) {
      throw new Error('Product Renderer resize 失败。');
    }
  }

  #applyResize() {
    this.#resizeRenderer();
    this.#inputRouter.resize(this.#renderer.getInputViewport());
    this.#resizePending = false;
  }

  #handleResize() {
    if (!this.#renderer || !this.#inputRouter) {
      this.#resizePending = true;
      return;
    }
    if (this.#processingFrame) {
      this.#resizePending = true;
      return;
    }
    this.#applyResize();
    if (this.#lastSnapshot && !this.#hidden && !this.#contextLost) {
      this.#publish(this.#lastSnapshot, 0, { forceRender: true });
    }
  }

  #syncPauseState() {
    if (!this.#flow || !this.#inputRouter || !this.#frameLoop || this.#isTerminal()) return;
    const paused = this.#hidden || this.#contextLost || this.#externallyPaused;
    if (paused) {
      this.#inputRouter.suspend();
      this.#lastSnapshot = this.#flow.hide();
      this.#frameLoop.stop();
      this.#accumulator.reset();
      this.#state = PRODUCT_PRESENTATION_SESSION_STATE.PAUSED;
      return;
    }
    const wasPaused = this.#state === PRODUCT_PRESENTATION_SESSION_STATE.PAUSED;
    this.#lastSnapshot = this.#flow.show();
    if (wasPaused && !this.#lastSnapshot.viewModel.terminal) {
      this.#lastSnapshot = this.#heartbeatIfDue(true);
    }
    this.#inputRouter.resume();
    this.#updateInputMode(this.#lastSnapshot);
    this.#accumulator.reset();
    this.#renderPacer.reset();
    this.#state = PRODUCT_PRESENTATION_SESSION_STATE.RUNNING;
    this.#publish(this.#lastSnapshot, 0, { forceRender: true });
    this.#startFrameLoop();
  }

  dispatch(intent) {
    return this.#dispatchIntent(intent);
  }

  setPaused(paused) {
    if (typeof paused !== 'boolean') throw new TypeError('paused 必须是布尔值。');
    if (this.#isTerminal() || this.#destroyRequested) return false;
    if (this.#externallyPaused === paused) return false;
    this.#externallyPaused = paused;
    this.#syncPauseState();
    return true;
  }

  getLastSnapshot() {
    return this.#lastSnapshot;
  }

  getPerformanceSnapshot() {
    let probe = this.#lastPerformanceSnapshot;
    if (this.#performanceProbe !== null) {
      try { probe = this.#performanceProbe.getSnapshot(); } catch (error) {
        this.#performanceProbeErrorCount += 1;
        this.#report('performance-probe-error', {
          method: 'getSnapshot',
          message: error?.message ?? String(error),
        });
      }
    }
    return Object.freeze({
      qualityDefinitionId: this.#composition.qualityDefinition.id,
      qualityDefinitionHash: this.#composition.qualityDefinition.getContentHash(),
      observerErrorCount: this.#performanceProbeErrorCount,
      observedMatchCount: this.#performanceObservedMatchCount,
      lifecycle: Object.freeze({ ...this.#performanceLifecycleCounters }),
      probe,
    });
  }

  #finalizePerformanceProbe() {
    if (this.#performanceProbe === null) return this.getPerformanceSnapshot();
    const stoppedAtMs = this.#performanceNow();
    if (stoppedAtMs !== null) this.#observePerformance('stop', stoppedAtMs);
    try { this.#lastPerformanceSnapshot = this.#performanceProbe.getSnapshot(); } catch (error) {
      this.#performanceProbeErrorCount += 1;
      this.#report('performance-probe-error', {
        method: 'finalize.getSnapshot',
        message: error?.message ?? String(error),
      });
    }
    try { this.#performanceProbe.destroy(); } catch (error) {
      this.#performanceProbeErrorCount += 1;
      this.#report('performance-probe-error', {
        method: 'finalize.destroy',
        message: error?.message ?? String(error),
      });
    }
    this.#performanceProbe = null;
    return this.getPerformanceSnapshot();
  }

  finishPerformanceCapture() {
    return this.#finalizePerformanceProbe();
  }

  getDebugSnapshot() {
    return Object.freeze({
      state: this.#state,
      hidden: this.#hidden,
      contextLost: this.#contextLost,
      externallyPaused: this.#externallyPaused,
      resizePending: this.#resizePending,
      processingFrame: this.#processingFrame,
      cleanupIncomplete: this.#cleanupIncomplete,
      deferredFailureCleanup: this.#deferredFailureCleanup,
      bindingCount: this.#bindings.length,
      productState: this.#lastSnapshot?.viewModel?.activeState ?? null,
      matchTick: this.#lastSnapshot?.matchFrame?.source?.tick ?? null,
      input: this.#inputRouter?.getDebugSnapshot?.() ?? null,
      renderer: this.#renderer?.getDebugSnapshot?.() ?? null,
      frameLoop: this.#frameLoop?.getDebugSnapshot?.() ?? null,
      accumulator: this.#accumulator?.getDebugSnapshot?.() ?? null,
      renderPacer: this.#renderPacer?.getDebugSnapshot?.() ?? null,
      lastErrorMessage: this.#lastError?.message ?? null,
      lastErrorCauseMessage: this.#lastError?.cause?.message ?? null,
      performance: this.getPerformanceSnapshot(),
      nextProfileLeaseHeartbeatAtMs: this.#nextProfileLeaseHeartbeatAtMs,
    });
  }

  #cleanupResources() {
    if (this.#cleaningUp) return [new Error('ProductPresentationSession 清理不可重入。')];
    this.#cleaningUp = true;
    const errors = [];
    try {
      if (this.#frameLoop !== null) {
        if (typeof this.#frameLoop?.destroy !== 'function') this.#frameLoop = null;
        else {
          try { this.#frameLoop.destroy(); this.#frameLoop = null; } catch (error) { errors.push(error); }
        }
      }
      if (this.#performanceProbe !== null) {
        this.#finalizePerformanceProbe();
      }
      if (this.#inputAdapter !== null) {
        if (typeof this.#inputAdapter?.destroy !== 'function') this.#inputAdapter = null;
        else {
          try { this.#inputAdapter.destroy(); this.#inputAdapter = null; } catch (error) { errors.push(error); }
        }
      }
      const bindings = this.#bindings.splice(0);
      const failedBindings = [];
      for (const cleanup of bindings.reverse()) {
        try { cleanup(); } catch (error) { errors.push(error); failedBindings.push(cleanup); }
      }
      this.#bindings.push(...failedBindings.reverse());
      if (this.#flow !== null) {
        if (typeof this.#flow?.destroy !== 'function') this.#flow = null;
        else {
          try { this.#flow.destroy(); this.#flow = null; } catch (error) { errors.push(error); }
        }
      }
      if (this.#inputRouter !== null) {
        if (typeof this.#inputRouter?.destroy !== 'function') this.#inputRouter = null;
        else {
          try { this.#inputRouter.destroy(); this.#inputRouter = null; } catch (error) { errors.push(error); }
        }
      }
      if (this.#controller !== null) {
        if (typeof this.#controller?.destroy !== 'function') this.#controller = null;
        else {
          try { this.#controller.destroy(); this.#controller = null; } catch (error) { errors.push(error); }
        }
      }
      if (this.#renderer !== null) {
        if (typeof this.#renderer?.dispose !== 'function') this.#renderer = null;
        else {
          try { this.#renderer.dispose(); this.#renderer = null; } catch (error) { errors.push(error); }
        }
      }
      if (this.#renderer === null && this.#bindings.length === 0) this.#canvas = null;
      this.#accumulator = null;
      this.#renderPacer = null;
      this.#lastPublishTelemetry = null;
      this.#lastSnapshot = null;
      this.#inputMatchActive = false;
      this.#hasAssignedMatchSampler = false;
      this.#lastWallNowMs = null;
      this.#nextProfileLeaseHeartbeatAtMs = null;
    } finally {
      this.#cleanupIncomplete = errors.length > 0;
      this.#cleaningUp = false;
    }
    return errors;
  }

  #completeFailureCleanup() {
    this.#deferredFailureCleanup = false;
    const cleanupErrors = this.#cleanupResources();
    if (cleanupErrors.length === 0) return this.#lastError;
    const failure = new Error('ProductPresentationSession 失败且清理未完整完成。');
    failure.cause = this.#lastError;
    failure.cleanupErrors = cleanupErrors.map((error) => normalizeThrownError(
      error,
      'ProductPresentationSession 资源清理失败',
    ));
    this.#lastError = failure;
    return failure;
  }

  #fail(error) {
    const failure = normalizeThrownError(error, 'ProductPresentationSession 失败');
    if (this.#state === PRODUCT_PRESENTATION_SESSION_STATE.FAILED) {
      return this.#lastError ?? failure;
    }
    if (this.#state === PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED) return failure;
    this.#lastError = failure;
    this.#frameLoop?.stop?.();
    this.#state = PRODUCT_PRESENTATION_SESSION_STATE.FAILED;
    this.#report('session-failed', { message: failure.message });
    if (this.#state === PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED) return failure;
    if (this.#processingFrame) {
      this.#deferredFailureCleanup = true;
      return failure;
    }
    return this.#completeFailureCleanup();
  }

  destroy() {
    if (
      this.#state === PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED
      && !this.#cleanupIncomplete
    ) return;
    if (this.#processingFrame) {
      this.#destroyRequested = true;
      return;
    }
    this.#destroyRequested = true;
    const errors = this.#cleanupResources();
    this.#state = PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED;
    const failure = cleanupFailure(errors);
    if (failure) {
      this.#lastError = failure;
      throw failure;
    }
    this.#lastError = null;
  }
}
