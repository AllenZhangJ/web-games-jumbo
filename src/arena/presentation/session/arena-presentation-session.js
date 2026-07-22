import { ARENA_FIXED_DT, ARENA_MATCH_PHASE } from '@number-strategy-jump/arena-match';
import { normalizeThrownError } from '@number-strategy-jump/arena-contracts';
import { ARENA_INPUT_ROUTER_MODE } from '../input/arena-input-router.js';
import { projectArenaPresentationFrame } from '../projection/arena-frame-projector.js';
import {
  createArenaMatchResources,
  destroyArenaMatchCandidate,
} from './arena-match-resources.js';
import { createArenaSessionComposition } from './arena-session-composition.js';

export const ARENA_PRESENTATION_SESSION_STATE = Object.freeze({
  CREATED: 'created',
  STARTING: 'starting',
  MATCHING: 'matching',
  RUNNING: 'running',
  PAUSED: 'paused',
  RESULT: 'result',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

const MODE = Object.freeze({
  MATCHING: 'matching',
  MATCH: 'match',
  RESULT: 'result',
});

function validateCanvas(value) {
  if (!value || typeof value.getContext !== 'function') {
    throw new TypeError('ArenaPresentationSession platform.createCanvas() 未返回 Canvas。');
  }
  return value;
}

function cleanupFailure(errors) {
  if (errors.length === 0) return null;
  const error = new Error('ArenaPresentationSession 清理未完整完成。');
  error.causes = errors;
  return error;
}

export class ArenaPresentationSession {
  #composition;
  #frameLoop;
  #accumulator;
  #state;
  #mode;
  #startPromise;
  #destroyRequested;
  #processingFrame;
  #cleaningUp;
  #cleanupObservedErrors;
  #cleanupIncomplete;
  #deferredFailureCleanup;
  #hidden;
  #contextLost;
  #externallyPaused;
  #resizePending;
  #pendingRematch;
  #matchingElapsed;
  #matchCount;
  #lastError;
  #canvas;
  #renderer;
  #matchSession;
  #eventWindow;
  #inputRouter;
  #inputAdapter;
  #publicMatchInfo;
  #snapshot;
  #lastPresentationFrame;
  #bindings;

  constructor(platform, options = {}) {
    this.#composition = createArenaSessionComposition(platform, options);
    this.#state = ARENA_PRESENTATION_SESSION_STATE.CREATED;
    this.#mode = MODE.MATCHING;
    this.#startPromise = null;
    this.#destroyRequested = false;
    this.#processingFrame = false;
    this.#cleaningUp = false;
    this.#cleanupObservedErrors = null;
    this.#cleanupIncomplete = false;
    this.#deferredFailureCleanup = false;
    this.#hidden = false;
    this.#contextLost = false;
    this.#externallyPaused = false;
    this.#resizePending = false;
    this.#pendingRematch = false;
    this.#matchingElapsed = 0;
    this.#matchCount = 0;
    this.#lastError = null;
    this.#canvas = null;
    this.#renderer = null;
    this.#matchSession = null;
    this.#eventWindow = null;
    this.#inputRouter = null;
    this.#inputAdapter = null;
    this.#publicMatchInfo = null;
    this.#snapshot = null;
    this.#lastPresentationFrame = null;
    this.#bindings = [];
    this.#accumulator = this.#composition.accumulatorFactory({
      fixedDeltaSeconds: ARENA_FIXED_DT,
      maximumSteps: this.#composition.maximumCatchUpTicks,
    });
    if (
      !this.#accumulator
      || typeof this.#accumulator.push !== 'function'
      || typeof this.#accumulator.reset !== 'function'
    ) throw new TypeError('accumulatorFactory 返回值不符合合同。');
    this.#frameLoop = this.#composition.frameLoopFactory({
      requestFrame: (callback) => this.#composition.platform.requestFrame(callback),
      cancelFrame: (token) => this.#composition.platform.cancelFrame(token),
      now: () => this.#composition.platform.now(),
      onError: (error) => this.#handleLoopFailure(error),
      maxDeltaSeconds: 0.1,
    });
    if (
      !this.#frameLoop
      || typeof this.#frameLoop.start !== 'function'
      || typeof this.#frameLoop.stop !== 'function'
      || typeof this.#frameLoop.destroy !== 'function'
    ) throw new TypeError('frameLoopFactory 返回值不符合合同。');
  }

  get state() {
    return this.#state;
  }

  #isTerminal() {
    return this.#state === ARENA_PRESENTATION_SESSION_STATE.FAILED
      || this.#state === ARENA_PRESENTATION_SESSION_STATE.DESTROYED;
  }

  #report(type, detail = {}) {
    try {
      this.#composition.onDiagnostic(Object.freeze({ type, ...detail }));
    } catch {
      // Diagnostics are observational and never own gameplay lifecycle.
    }
  }

  #stateForMode() {
    if (this.#mode === MODE.MATCHING) return ARENA_PRESENTATION_SESSION_STATE.MATCHING;
    if (this.#mode === MODE.MATCH) return ARENA_PRESENTATION_SESSION_STATE.RUNNING;
    return ARENA_PRESENTATION_SESSION_STATE.RESULT;
  }

  #assertStartedResource(value, name) {
    if (!value) throw new Error(`ArenaPresentationSession 缺少 ${name}。`);
    return value;
  }

  #guardHost(callback) {
    return (...args) => {
      if (this.#isTerminal() || this.#destroyRequested) return false;
      try {
        callback(...args);
        return true;
      } catch (error) {
        this.#failFromHost(error);
        return false;
      }
    };
  }

  #registerCleanup(cleanup, name) {
    if (typeof cleanup !== 'function') throw new TypeError(`${name} 必须返回 cleanup 函数。`);
    this.#bindings.push(cleanup);
  }

  #bindCanvasEvent(type, callback) {
    const canvas = this.#assertStartedResource(this.#canvas, 'canvas');
    if (
      typeof canvas.addEventListener !== 'function'
      || typeof canvas.removeEventListener !== 'function'
    ) {
      throw new TypeError(`Arena Canvas 缺少完整的 ${type} 事件绑定/清理能力。`);
    }
    canvas.addEventListener(type, callback, false);
    let active = true;
    return () => {
      if (!active) return;
      canvas.removeEventListener(type, callback, false);
      active = false;
    };
  }

  #bindLifecycle() {
    const platform = this.#composition.platform;
    this.#registerCleanup(platform.onResize(this.#guardHost(() => this.#handleResize())), 'onResize');
    this.#registerCleanup(platform.onHide(this.#guardHost(() => {
      this.#hidden = true;
      this.#syncPauseState();
    })), 'onHide');
    this.#registerCleanup(platform.onShow(this.#guardHost(() => {
      this.#hidden = false;
      this.#syncPauseState();
    })), 'onShow');
    this.#registerCleanup(this.#bindCanvasEvent(
      'webglcontextlost',
      this.#guardHost((event) => {
        this.#renderer.handleContextLost(event);
        this.#contextLost = true;
        this.#syncPauseState();
      }),
    ), 'webglcontextlost');
    this.#registerCleanup(this.#bindCanvasEvent(
      'webglcontextrestored',
      this.#guardHost(() => {
        if (!this.#renderer.handleContextRestored()) return;
        this.#contextLost = false;
        this.#inputRouter.resize(this.#renderer.getInputViewport());
        this.#syncPauseState();
      }),
    ), 'webglcontextrestored');
  }

  #createFrame(events = []) {
    const accepted = this.#eventWindow.consume(events);
    const frame = projectArenaPresentationFrame({
      snapshot: this.#snapshot,
      events: accepted,
      publicMatchInfo: this.#publicMatchInfo,
    });
    this.#lastPresentationFrame = frame;
    return frame;
  }

  #renderCurrent(events = [], deltaSeconds = 0) {
    const frame = this.#createFrame(events);
    const rendered = this.#renderer.render(frame, {
      deltaSeconds,
      mode: this.#mode === MODE.MATCHING ? 'matching' : 'match',
      mapperLabel: this.#composition.experimentLabel,
    });
    if (rendered === false) {
      this.#contextLost = true;
      this.#syncPauseState();
    }
    return rendered;
  }

  async #initialize() {
    this.#canvas = validateCanvas(this.#composition.platform.createCanvas());
    this.#renderer = this.#composition.rendererFactory({
      canvas: this.#canvas,
      platform: this.#composition.platform,
    });
    if (
      !this.#renderer
      || typeof this.#renderer.load !== 'function'
      || typeof this.#renderer.render !== 'function'
      || typeof this.#renderer.dispose !== 'function'
      || typeof this.#renderer.getInputViewport !== 'function'
    ) throw new TypeError('rendererFactory 返回值不符合合同。');
    await this.#renderer.load();
    if (this.#destroyRequested || this.#state === ARENA_PRESENTATION_SESSION_STATE.DESTROYED) {
      throw new Error('ArenaPresentationSession 启动已取消。');
    }

    const candidate = createArenaMatchResources(
      this.#composition,
      this.#renderer.getInputViewport(),
    );
    let router = null;
    try {
      router = this.#composition.inputRouterFactory({
        sampler: candidate.sampler,
        viewport: this.#renderer.getInputViewport(),
        hitTestRematch: (point) => this.#renderer.hitTestRematch(point),
        onRematchRequested: () => this.requestRematch(),
      });
      if (
        !router
        || typeof router.sample !== 'function'
        || typeof router.replaceSampler !== 'function'
        || typeof router.destroy !== 'function'
      ) throw new TypeError('inputRouterFactory 返回值不符合合同。');
      candidate.sampler = null;
    } catch (error) {
      try { router?.destroy?.(); } catch { /* candidate cleanup below remains authoritative */ }
      destroyArenaMatchCandidate(candidate);
      throw error;
    }

    this.#matchSession = candidate.session;
    this.#eventWindow = candidate.eventWindow;
    this.#publicMatchInfo = candidate.publicMatchInfo;
    this.#snapshot = candidate.snapshot;
    this.#inputRouter = router;
    this.#inputAdapter = this.#composition.inputAdapterFactory({
      platform: this.#composition.platform,
      sampler: this.#inputRouter,
      viewportProvider: () => this.#renderer.getInputViewport(),
      manageLifecycle: false,
      onError: (error) => this.#failFromHost(error),
    });
    if (
      !this.#inputAdapter
      || typeof this.#inputAdapter.start !== 'function'
      || typeof this.#inputAdapter.destroy !== 'function'
    ) throw new TypeError('inputAdapterFactory 返回值不符合合同。');

    this.#mode = MODE.MATCHING;
    this.#matchingElapsed = 0;
    this.#matchCount = 1;
    this.#state = ARENA_PRESENTATION_SESSION_STATE.MATCHING;
    this.#renderCurrent([], 0);
    this.#bindLifecycle();
    this.#inputAdapter.start();
    if (this.#hidden || this.#contextLost || this.#externallyPaused) this.#syncPauseState();
    else this.#startFrameLoop();
  }

  start() {
    if (this.#state === ARENA_PRESENTATION_SESSION_STATE.DESTROYED) {
      return Promise.reject(new Error('ArenaPresentationSession 已销毁。'));
    }
    if (this.#state === ARENA_PRESENTATION_SESSION_STATE.FAILED) {
      const error = new Error('ArenaPresentationSession 已失败。');
      error.cause = this.#lastError;
      return Promise.reject(error);
    }
    if (this.#startPromise) return this.#startPromise;
    if (this.#state !== ARENA_PRESENTATION_SESSION_STATE.CREATED) return Promise.resolve(this);
    this.#state = ARENA_PRESENTATION_SESSION_STATE.STARTING;
    this.#startPromise = this.#initialize()
      .then(() => this)
      .catch((error) => {
        if (this.#state === ARENA_PRESENTATION_SESSION_STATE.DESTROYED) throw error;
        throw this.#fail(error);
      })
      .finally(() => {
        this.#startPromise = null;
      });
    return this.#startPromise;
  }

  #startFrameLoop() {
    if (
      this.#isTerminal()
      || this.#hidden
      || this.#contextLost
      || this.#externallyPaused
      || this.#destroyRequested
    ) return false;
    return this.#frameLoop.start(({ deltaSeconds }) => this.#onFrame(deltaSeconds));
  }

  #activateMatch() {
    if (this.#mode !== MODE.MATCHING) return false;
    this.#matchSession.start();
    this.#inputRouter.setMode(ARENA_INPUT_ROUTER_MODE.GAMEPLAY);
    this.#mode = MODE.MATCH;
    this.#state = ARENA_PRESENTATION_SESSION_STATE.RUNNING;
    this.#accumulator.reset();
    return true;
  }

  #stepMatch() {
    const before = this.#matchSession.getSnapshot();
    const local = before.participants.find(({ id }) => id === 'player-1');
    if (!local) throw new RangeError('Arena local participant player-1 不存在。');
    const input = this.#inputRouter.sample(before.tick, {
      actionAffordance: local.actionAffordance,
    });
    const result = this.#matchSession.step(input);
    this.#snapshot = result.snapshot;
    if (this.#snapshot.phase === ARENA_MATCH_PHASE.ENDED) {
      this.#mode = MODE.RESULT;
      this.#state = ARENA_PRESENTATION_SESSION_STATE.RESULT;
      this.#inputRouter.setMode(ARENA_INPUT_ROUTER_MODE.RESULT);
      this.#accumulator.reset();
    }
    this.#composition.onMatchProgress(Object.freeze({
      matchSeed: this.#snapshot.matchSeed,
      tick: this.#snapshot.tick,
      phase: this.#snapshot.phase,
    }));
    return result.events;
  }

  #performRematch() {
    if (!this.#pendingRematch || this.#mode !== MODE.RESULT) return false;
    this.#pendingRematch = false;
    let candidate;
    try {
      candidate = createArenaMatchResources(
        this.#composition,
        this.#renderer.getInputViewport(),
      );
    } catch (error) {
      this.#report('rematch-create-failed', {
        message: error?.message ?? String(error),
      });
      return false;
    }

    try {
      this.#inputRouter.setMode(ARENA_INPUT_ROUTER_MODE.INACTIVE);
      this.#matchSession.destroy();
      this.#matchSession = null;
      this.#eventWindow.destroy();
      this.#eventWindow = null;
      this.#inputRouter.replaceSampler(candidate.sampler);
      candidate.sampler = null;
    } catch (error) {
      try { destroyArenaMatchCandidate(candidate); } catch (cleanupError) {
        error.cleanupCause = cleanupError;
      }
      throw error;
    }

    this.#matchSession = candidate.session;
    this.#eventWindow = candidate.eventWindow;
    this.#publicMatchInfo = candidate.publicMatchInfo;
    this.#snapshot = candidate.snapshot;
    this.#lastPresentationFrame = null;
    this.#matchingElapsed = 0;
    this.#accumulator.reset();
    this.#mode = MODE.MATCHING;
    this.#state = ARENA_PRESENTATION_SESSION_STATE.MATCHING;
    this.#matchCount += 1;
    return true;
  }

  #applyResize() {
    this.#renderer.resize(this.#composition.platform.getViewport());
    this.#inputRouter.resize(this.#renderer.getInputViewport());
    this.#resizePending = false;
  }

  #handleResize() {
    if (!this.#renderer || !this.#inputRouter) return;
    if (this.#processingFrame) {
      this.#resizePending = true;
      return;
    }
    this.#applyResize();
    if (this.#lastPresentationFrame && !this.#hidden && !this.#contextLost) {
      this.#renderCurrent([], 0);
    }
  }

  #onFrame(deltaSeconds) {
    if (this.#destroyRequested) return false;
    if (this.#processingFrame) throw new Error('ArenaPresentationSession frame 不可重入。');
    this.#processingFrame = true;
    try {
      if (this.#resizePending) this.#applyResize();
      this.#performRematch();
      let gameplayDeltaSeconds = deltaSeconds;
      if (this.#mode === MODE.MATCHING) {
        const previousElapsed = this.#matchingElapsed;
        this.#matchingElapsed += deltaSeconds;
        if (this.#matchingElapsed >= this.#composition.matchingDurationSeconds) {
          this.#activateMatch();
          gameplayDeltaSeconds = Math.max(
            0,
            previousElapsed + deltaSeconds - this.#composition.matchingDurationSeconds,
          );
        } else {
          gameplayDeltaSeconds = 0;
        }
      }

      const events = [];
      if (this.#mode === MODE.MATCH) {
        const batch = this.#accumulator.push(gameplayDeltaSeconds);
        if (batch.droppedSeconds > 0) {
          this.#report('presentation-backlog-dropped', {
            droppedSeconds: batch.droppedSeconds,
          });
        }
        for (let index = 0; index < batch.steps && this.#mode === MODE.MATCH; index += 1) {
          events.push(...this.#stepMatch());
        }
      }
      this.#renderCurrent(events, deltaSeconds);
      return !this.#hidden
        && !this.#contextLost
        && !this.#externallyPaused
        && !this.#destroyRequested
        && !this.#isTerminal();
    } finally {
      this.#processingFrame = false;
      if (this.#destroyRequested && this.#state !== ARENA_PRESENTATION_SESSION_STATE.DESTROYED) {
        const errors = this.#cleanupResources();
        this.#state = ARENA_PRESENTATION_SESSION_STATE.DESTROYED;
        const failure = cleanupFailure(errors);
        if (failure) this.#lastError = failure;
      } else if (this.#deferredFailureCleanup) {
        this.#completeFailureCleanup();
      }
    }
  }

  #syncPauseState() {
    if (!this.#matchSession || !this.#inputRouter || this.#isTerminal()) return;
    const paused = this.#hidden || this.#contextLost || this.#externallyPaused;
    if (paused) {
      this.#inputRouter.suspend();
      this.#matchSession.setPaused(true);
      this.#frameLoop.stop();
      this.#accumulator.reset();
      this.#state = ARENA_PRESENTATION_SESSION_STATE.PAUSED;
      return;
    }
    this.#matchSession.setPaused(false);
    this.#inputRouter.resume();
    this.#accumulator.reset();
    this.#state = this.#stateForMode();
    this.#startFrameLoop();
  }

  #handleLoopFailure(error) {
    if (this.#isTerminal() || this.#destroyRequested) return;
    this.#fail(error);
  }

  #failFromHost(error) {
    if (this.#cleaningUp) {
      this.#cleanupObservedErrors?.push(normalizeThrownError(
        error,
        'ArenaPresentationSession 清理回调失败',
      ));
      return;
    }
    if (this.#isTerminal() || this.#destroyRequested) return;
    this.#fail(error);
  }

  #cleanupResources() {
    if (this.#cleaningUp) {
      const error = new Error('ArenaPresentationSession 清理不可重入。');
      this.#cleanupObservedErrors?.push(error);
      return [error];
    }
    this.#cleaningUp = true;
    const errors = [];
    this.#cleanupObservedErrors = errors;
    try {
      try { this.#frameLoop?.destroy(); } catch (error) { errors.push(error); }
      try {
        this.#inputAdapter?.destroy();
        this.#inputAdapter = null;
      } catch (error) { errors.push(error); }
      const bindings = this.#bindings.splice(0);
      const failedBindings = [];
      for (const cleanup of bindings.reverse()) {
        try { cleanup(); } catch (error) {
          errors.push(error);
          failedBindings.push(cleanup);
        }
      }
      this.#bindings.push(...failedBindings.reverse());
      try {
        this.#inputRouter?.destroy();
        this.#inputRouter = null;
      } catch (error) { errors.push(error); }
      try {
        this.#eventWindow?.destroy();
        this.#eventWindow = null;
      } catch (error) { errors.push(error); }
      try {
        this.#matchSession?.destroy();
        this.#matchSession = null;
      } catch (error) { errors.push(error); }
      try {
        this.#renderer?.dispose();
        this.#renderer = null;
      } catch (error) { errors.push(error); }
      this.#publicMatchInfo = null;
      this.#snapshot = null;
      this.#lastPresentationFrame = null;
    } finally {
      this.#cleanupObservedErrors = null;
      this.#cleaningUp = false;
      this.#cleanupIncomplete = errors.length > 0;
    }
    return errors;
  }

  #completeFailureCleanup() {
    this.#deferredFailureCleanup = false;
    const cleanupErrors = this.#cleanupResources();
    if (cleanupErrors.length === 0) return this.#lastError;
    const failure = new Error('ArenaPresentationSession 失败且清理未完整完成。');
    failure.cause = this.#lastError;
    failure.cleanupCauses = cleanupErrors;
    this.#lastError = failure;
    return failure;
  }

  #fail(error) {
    const normalized = normalizeThrownError(error, 'ArenaPresentationSession 失败');
    if (this.#state === ARENA_PRESENTATION_SESSION_STATE.FAILED) {
      return this.#lastError ?? normalized;
    }
    if (this.#state === ARENA_PRESENTATION_SESSION_STATE.DESTROYED) return normalized;
    this.#lastError = normalized;
    this.#frameLoop?.stop();
    this.#state = ARENA_PRESENTATION_SESSION_STATE.FAILED;
    this.#report('session-failed', { message: normalized.message });
    if (this.#processingFrame) {
      this.#deferredFailureCleanup = true;
      return normalized;
    }
    return this.#completeFailureCleanup();
  }

  requestRematch() {
    if (
      this.#isTerminal()
      || this.#destroyRequested
      || this.#mode !== MODE.RESULT
      || this.#pendingRematch
    ) return false;
    this.#pendingRematch = true;
    return true;
  }

  setPaused(paused) {
    if (typeof paused !== 'boolean') throw new TypeError('paused 必须是布尔值。');
    if (this.#isTerminal() || this.#destroyRequested) return false;
    if (this.#externallyPaused === paused) return false;
    this.#externallyPaused = paused;
    this.#syncPauseState();
    return true;
  }

  getLastPresentationFrame() {
    return this.#lastPresentationFrame;
  }

  getDebugSnapshot() {
    return Object.freeze({
      state: this.#state,
      mode: this.#mode,
      matchCount: this.#matchCount,
      hidden: this.#hidden,
      contextLost: this.#contextLost,
      externallyPaused: this.#externallyPaused,
      resizePending: this.#resizePending,
      pendingRematch: this.#pendingRematch,
      cleaningUp: this.#cleaningUp,
      cleanupIncomplete: this.#cleanupIncomplete,
      deferredFailureCleanup: this.#deferredFailureCleanup,
      bindingCount: this.#bindings.length,
      publicMatchInfo: this.#publicMatchInfo,
      snapshot: this.#snapshot ? Object.freeze({
        matchSeed: this.#snapshot.matchSeed,
        tick: this.#snapshot.tick,
        phase: this.#snapshot.phase,
      }) : null,
      lastError: this.#lastError ? Object.freeze({
        name: this.#lastError.name,
        message: this.#lastError.message,
      }) : null,
      frameLoop: this.#frameLoop?.getDebugSnapshot?.() ?? null,
      accumulator: this.#accumulator?.getDebugSnapshot?.() ?? null,
      input: this.#inputRouter?.getDebugSnapshot?.() ?? null,
      inputAdapter: this.#inputAdapter?.getDebugSnapshot?.() ?? null,
      renderer: this.#renderer?.getDebugSnapshot?.() ?? null,
    });
  }

  destroy() {
    if (
      this.#state === ARENA_PRESENTATION_SESSION_STATE.DESTROYED
      && !this.#cleanupIncomplete
    ) return;
    this.#destroyRequested = true;
    this.#frameLoop?.stop();
    if (this.#processingFrame) return;
    const errors = this.#cleanupResources();
    this.#state = ARENA_PRESENTATION_SESSION_STATE.DESTROYED;
    const failure = cleanupFailure(errors);
    if (failure) {
      this.#lastError = failure;
      throw failure;
    }
  }
}
