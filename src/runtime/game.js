import { FIXED_STEP_MS, GAME_RULES, JUMP_PHYSICS } from '../config.js';
import { GAME_PHASE, GameState } from '../core/game-state.js';
import {
  chargeToPower,
  createJumpTrajectory,
  getTargetChargeWindow,
  resolveTopLanding,
  sampleJumpTrajectory,
} from '../core/jump-physics.js';
import { applyOperation } from '../core/operations.js';
import { createRng } from '../core/rng.js';
import { WorldState } from '../core/world-state.js';
import { Renderer3D } from '../render3d/renderer3d.js';

function worldCandidates(choices, value) {
  return choices.map((operation) => ({
    operation,
    preview: applyOperation(value, operation),
  }));
}

function insideCircle(point, circle) {
  return Math.hypot(point.x - circle.x, point.y - circle.y) <= circle.radius;
}

function insideRect(point, rect) {
  return point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height;
}

const FALLBACK_CONTROLS = Object.freeze({
  pause: { x: 662, y: 70, radius: 34 },
  restart: { x: 718, y: 70, radius: 34 },
  left: { x: 120, y: 1160, width: 184, height: 128 },
  right: { x: 446, y: 1160, width: 184, height: 128 },
});

const MAX_CONSECUTIVE_FRAME_ERRORS = 3;

function defaultRendererFactory(canvas, platform) {
  return new Renderer3D(canvas, platform);
}

function pointerIdOf(point) {
  return point?.pointerId ?? 0;
}

/**
 * Owns gameplay truth and exposes a read-only presentation snapshot to Three.js.
 * Renderer3D never decides landings and never writes to GameState or WorldState.
 */
export class NumberStrategyGame {
  constructor(platform, {
    seed = Date.now(),
    rendererFactory = defaultRendererFactory,
  } = {}) {
    if (!platform || typeof platform.createCanvas !== 'function') {
      throw new TypeError('NumberStrategyGame 需要有效的平台适配层。');
    }
    if (typeof rendererFactory !== 'function') {
      throw new TypeError('rendererFactory 必须是函数。');
    }
    this.platform = platform;
    this.canvas = platform.createCanvas();
    this.seed = seed;
    this.state = new GameState({ seed });
    this.layoutRng = createRng((seed ^ 0x9e3779b9) >>> 0);
    this.renderer = rendererFactory(this.canvas, platform);
    this.world = null;
    this.jump = null;
    this.accumulator = 0;
    this.lastTime = null;
    this.frameId = null;
    this.activePointerId = null;
    this.chargeStartedAt = null;
    this.cleanups = [];
    this.eventsBound = false;
    this.lifecycle = 'idle';
    this.startPromise = null;
    this.lastRuntimeError = null;
    this.runtimeErrorCount = 0;
    this.consecutiveFrameErrors = 0;
    this.presentation = {
      revision: 0,
      jumpId: 0,
      landingId: 0,
      missId: 0,
      selectedChoice: null,
      chargePower: 0,
      jumpProgress: 0,
      landingProgress: 0,
      lastLanding: null,
      missVisual: null,
      reducedMotion: false,
    };
    this.resetWorld();
  }

  resetWorld() {
    this.world = new WorldState({
      rng: this.layoutRng,
      historyLimit: 3,
      initialCurrent: { preview: this.state.currentValue },
      initialCandidates: worldCandidates(this.state.choices, this.state.currentValue),
    });
    this.jump = null;
    this.state.chargeWindow = null;
    Object.assign(this.presentation, {
      revision: this.presentation.revision + 1,
      selectedChoice: null,
      chargePower: 0,
      jumpProgress: 0,
      landingProgress: 0,
      lastLanding: null,
      missVisual: null,
    });
  }

  start() {
    if (this.lifecycle === 'destroyed') {
      return Promise.reject(new Error('游戏已销毁，不能再次启动。'));
    }
    if (this.lifecycle === 'running') return Promise.resolve(this);
    if (this.startPromise) return this.startPromise;

    this.lifecycle = 'starting';
    const startPromise = (async () => {
      if (this.renderer.resize() === false) {
        const error = new Error('渲染器首屏尺寸初始化失败。');
        this.recordRuntimeError('initial-resize', error);
        throw error;
      }
      await this.renderer.load();
      if (this.lifecycle === 'destroyed') {
        throw new Error('游戏在启动完成前已销毁。');
      }
      this.bindEvents();
      if (this.lifecycle === 'destroyed') {
        throw new Error('游戏在事件绑定期间已销毁。');
      }
      this.lastTime = null;
      this.accumulator = 0;
      this.lifecycle = 'running';
      if (!this.scheduleNextFrame()) {
        throw this.lastRuntimeError?.error ?? new Error('无法调度首帧。');
      }
      return this;
    })();
    this.startPromise = startPromise
      .catch((error) => {
        this.unbindEvents();
        if (this.lifecycle !== 'destroyed') this.lifecycle = 'idle';
        throw error;
      })
      .finally(() => {
        this.startPromise = null;
      });
    return this.startPromise;
  }

  bindEvents() {
    if (this.eventsBound || this.lifecycle === 'destroyed') return;
    const addCleanup = (cleanup) => {
      if (typeof cleanup === 'function') this.cleanups.push(cleanup);
    };
    try {
      addCleanup(this.platform.bindInput({
        onStart: (point) => this.onPointerStart(point),
        onEnd: (point) => this.onPointerEnd(point),
        onCancel: (point) => this.cancelCharge(point),
      }));
      addCleanup(this.platform.onResize(() => {
        if (this.lifecycle === 'destroyed') return;
        try {
          if (this.renderer.resize() === false) {
            this.recordRuntimeError('resize', new Error('渲染器尺寸更新失败。'));
          }
        } catch (error) {
          this.recordRuntimeError('resize', error);
        }
      }));
      addCleanup(this.platform.onHide(() => {
        if (this.lifecycle === 'destroyed') return;
        if (
          this.state.phase === GAME_PHASE.CHARGING
          || (this.state.phase === GAME_PHASE.PAUSED
            && this.state.previousPhase === GAME_PHASE.CHARGING)
        ) this.cancelCharge(null, true);
        if (this.state.phase !== GAME_PHASE.PAUSED) this.togglePause();
      }));
      addCleanup(this.platform.onShow(() => {
        if (this.lifecycle === 'destroyed') return;
        // The callback timestamp may use a different clock from platform.now().
        // Rebase on the next frame instead of mixing the two time origins.
        this.lastTime = null;
        this.accumulator = 0;
      }));
      this.eventsBound = true;
    } catch (error) {
      this.unbindEvents();
      throw error;
    }
  }

  unbindEvents() {
    const cleanups = this.cleanups.splice(0);
    this.eventsBound = false;
    for (const cleanup of cleanups) {
      try {
        cleanup?.();
      } catch (error) {
        this.recordRuntimeError('event-cleanup', error);
      }
    }
  }

  recordRuntimeError(source, error) {
    this.runtimeErrorCount += 1;
    this.lastRuntimeError = {
      source,
      error: error instanceof Error ? error : new Error(String(error)),
      at: this.readClock(),
    };
  }

  readClock() {
    try {
      const value = this.platform.now?.();
      if (Number.isFinite(value)) return value;
    } catch {
      // Fall through to the universal monotonic-enough wall clock fallback.
    }
    return Date.now();
  }

  scheduleNextFrame() {
    if (this.lifecycle !== 'running' || this.frameId != null) return false;
    try {
      this.frameId = this.platform.requestFrame((time) => {
        this.frameId = null;
        this.frame(time);
      });
      return true;
    } catch (error) {
      this.recordRuntimeError('request-frame', error);
      this.cancelCharge(null, true);
      this.lifecycle = 'failed';
      this.unbindEvents();
      return false;
    }
  }

  chargeWindowFor(choiceIndex) {
    const target = this.world.candidates[choiceIndex];
    if (!target) return null;
    return getTargetChargeWindow({
      origin: this.world.player.position,
      target,
      inset: 0.06,
      config: JUMP_PHYSICS,
    });
  }

  hitControl(rawPoint) {
    if (typeof this.renderer.hitTest === 'function') {
      return this.renderer.hitTest(rawPoint);
    }
    const point = this.renderer.toDesignPoint?.(rawPoint) ?? rawPoint;
    if (insideCircle(point, FALLBACK_CONTROLS.pause)) return 'pause';
    if (insideCircle(point, FALLBACK_CONTROLS.restart)) return 'restart';
    if (insideRect(point, FALLBACK_CONTROLS.left)) return 'choice-left';
    if (insideRect(point, FALLBACK_CONTROLS.right)) return 'choice-right';
    return null;
  }

  onPointerStart(rawPoint) {
    if (
      this.lifecycle !== 'running'
      || !rawPoint
      || !Number.isFinite(rawPoint.x)
      || !Number.isFinite(rawPoint.y)
    ) return false;
    let control;
    try {
      control = this.hitControl(rawPoint);
    } catch (error) {
      this.recordRuntimeError('pointer-start', error);
      return false;
    }
    if (control === 'restart') {
      this.restart();
      return true;
    }
    if (control === 'pause') {
      this.togglePause();
      return true;
    }
    if (this.state.phase === GAME_PHASE.PAUSED) {
      // The pause overlay promises “点击继续”. Consume this pointer as a pure
      // resume gesture so its matching pointerup cannot also launch a jump.
      this.togglePause();
      return true;
    }
    if (this.state.phase === GAME_PHASE.WON) {
      if (this.state.nextRound()) {
        this.clearActivePointer();
        this.resetWorld();
      }
      return true;
    }
    if (this.state.phase === GAME_PHASE.LOST) {
      this.restart();
      return true;
    }
    if (this.state.phase !== GAME_PHASE.READY || this.activePointerId != null) return false;

    let choiceIndex = control === 'choice-left'
      ? 0
      : control === 'choice-right'
        ? 1
        : null;
    if (choiceIndex == null) return false;
    try {
      const screenChoiceIndex = this.renderer.choiceIndexForControl?.(
        control,
        this.world.candidates,
      );
      if (
        Number.isInteger(screenChoiceIndex)
        && screenChoiceIndex >= 0
        && screenChoiceIndex < this.world.candidates.length
      ) {
        choiceIndex = screenChoiceIndex;
      }
    } catch {
      // Render-side projection is optional; keep the stable logical fallback.
    }
    let chargeWindow;
    try {
      chargeWindow = this.chargeWindowFor(choiceIndex);
    } catch (error) {
      this.recordRuntimeError('charge-window', error);
      return false;
    }
    if (this.state.startCharge(choiceIndex)) {
      this.activePointerId = pointerIdOf(rawPoint);
      this.chargeStartedAt = this.readClock();
      this.state.chargeWindow = chargeWindow;
      this.presentation.selectedChoice = choiceIndex;
      this.presentation.chargePower = 0;
      this.presentation.missVisual = null;
      return true;
    }
    return false;
  }

  beginJump() {
    if (this.state.phase !== GAME_PHASE.CHARGING) return false;
    const choiceIndex = this.state.selectedChoice;
    const target = this.world.candidates[choiceIndex];
    if (!target) {
      this.cancelCharge(null, true);
      this.recordRuntimeError('begin-jump', new Error('所选候选平台不存在。'));
      return false;
    }

    let trajectory;
    try {
      trajectory = createJumpTrajectory({
        origin: this.world.player.position,
        targetCenter: target.center,
        targetTopY: target.topY,
        chargeMs: this.state.chargeMs,
        config: JUMP_PHYSICS,
      });
    } catch (error) {
      this.cancelCharge(null, true);
      this.recordRuntimeError('begin-jump', error);
      return false;
    }

    const released = this.state.releaseCharge();
    if (!released.accepted) return false;
    this.jump = {
      elapsedMs: 0,
      target,
      trajectory,
    };
    this.world.player.supportPlatformId = null;
    this.presentation.jumpId += 1;
    this.presentation.jumpProgress = 0;
    this.presentation.chargePower = chargeToPower(released.chargeMs, JUMP_PHYSICS);
    return true;
  }

  onPointerEnd(rawPoint) {
    if (this.lifecycle !== 'running' || this.activePointerId == null) return false;
    if (pointerIdOf(rawPoint) !== this.activePointerId) return false;
    if (this.chargeStartedAt != null) {
      const elapsedMs = this.readClock() - this.chargeStartedAt;
      if (Number.isFinite(elapsedMs) && elapsedMs >= 0) {
        this.state.setChargeDuration(elapsedMs);
      }
    }
    this.clearActivePointer();
    return this.beginJump();
  }

  clearActivePointer() {
    this.activePointerId = null;
    this.chargeStartedAt = null;
  }

  cancelCharge(rawPoint = null, force = false) {
    if (
      !force
      && this.activePointerId != null
      && rawPoint != null
      && pointerIdOf(rawPoint) !== this.activePointerId
    ) return false;
    this.clearActivePointer();
    const cancelled = this.state.cancelCharge();
    if (!cancelled) return false;
    this.presentation.selectedChoice = null;
    this.presentation.chargePower = 0;
    return true;
  }

  togglePause() {
    if (
      this.state.phase === GAME_PHASE.CHARGING
      || (this.state.phase === GAME_PHASE.PAUSED
        && this.state.previousPhase === GAME_PHASE.CHARGING)
    ) this.cancelCharge(null, true);
    return this.state.togglePause();
  }

  restart() {
    this.clearActivePointer();
    this.state.restart();
    this.resetWorld();
    this.accumulator = 0;
    this.lastTime = null;
  }

  resolveJump() {
    if (!this.jump || this.state.phase !== GAME_PHASE.JUMPING) return null;
    const landing = resolveTopLanding({
      trajectory: this.jump.trajectory,
      target: this.jump.target,
    });
    if (landing.landed) {
      const operation = this.state.choices[this.state.selectedChoice];
      const nextValue = applyOperation(this.state.currentValue, operation);
      const nextMovesRemaining = this.state.movesRemaining - 1;
      const rngSnapshot = this.state.rng.snapshot?.();
      let nextChoices;
      try {
        nextChoices = this.state.createChoices({
          value: nextValue,
          movesRemaining: nextMovesRemaining,
        });
        // Commit the fallible world transition before mutating GameState. All
        // state-side validation above is synchronous, so the two truth layers
        // cannot be left half-committed by candidate generation or landing checks.
        this.world.commitLanding({
          platformId: this.jump.target.id,
          position: landing.position,
          nextCandidates: worldCandidates(nextChoices, nextValue),
        });
      } catch (error) {
        if (rngSnapshot !== undefined) this.state.rng.restore?.(rngSnapshot);
        throw error;
      }
      const event = this.state.resolveJump(landing);
      if (!event || !this.state.useChoices(nextChoices)) {
        throw new Error('落地后无法提交新的数值候选。');
      }
      this.presentation.landingId += 1;
      this.presentation.revision += 1;
      this.presentation.missVisual = null;
      this.presentation.lastLanding = landing;
      this.jump = null;
      return event;
    } else {
      const event = this.state.resolveJump(landing);
      this.world.player.position = { ...landing.position };
      this.world.player.supportPlatformId = null;
      this.presentation.missId += 1;
      this.presentation.missVisual = {
        reason: landing.reason,
        targetId: this.jump.target.id,
        offset: landing.offset,
      };
      this.presentation.lastLanding = landing;
      this.jump = null;
      return event;
    }
  }

  update(deltaMs) {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    if (this.state.phase === GAME_PHASE.PAUSED) return;

    const phaseAtStart = this.state.phase;
    this.state.updateCharge(deltaMs);
    if (this.state.phase === GAME_PHASE.CHARGING) {
      this.presentation.chargePower = chargeToPower(this.state.chargeMs, JUMP_PHYSICS);
    }

    let remainingDeltaMs = phaseAtStart === GAME_PHASE.LANDING || phaseAtStart === GAME_PHASE.LOST
      ? deltaMs
      : 0;
    if (this.state.phase === GAME_PHASE.JUMPING && this.jump) {
      this.jump.elapsedMs += deltaMs;
      const sample = sampleJumpTrajectory(this.jump.trajectory, this.jump.elapsedMs);
      this.world.player.position = sample.position;
      this.state.setJumpProgress(sample.progress);
      this.presentation.jumpProgress = sample.progress;
      if (sample.completed) {
        remainingDeltaMs = Math.max(0, this.jump.elapsedMs - this.jump.trajectory.durationMs);
        this.resolveJump();
      }
    } else if (this.state.phase === GAME_PHASE.JUMPING) {
      throw new Error('跳跃状态缺少活动轨迹。');
    }

    const landingEvent = this.state.updateLanding(remainingDeltaMs);
    this.presentation.landingProgress = this.state.landingProgress ?? 0;
    if (landingEvent?.type === 'continue') {
      this.presentation.selectedChoice = null;
      this.presentation.chargePower = 0;
      this.presentation.jumpProgress = 0;
    }

    if (this.state.phase === GAME_PHASE.LOST && !this.world.player.supportPlatformId) {
      const floorY = (this.world.current?.topY ?? 0) - 20;
      const currentY = Number.isFinite(this.world.player.position.y)
        ? this.world.player.position.y
        : floorY;
      this.world.player.position.y = Math.max(floorY, currentY - remainingDeltaMs / 460);
    }
  }

  frame(_time) {
    if (this.lifecycle !== 'running') return;
    try {
      // requestAnimationFrame timestamps are not portable across mini-game
      // hosts: some are omitted, some use uptime, while platform.now() may use
      // epoch time. Use one clock consistently for the whole runtime.
      const timestamp = this.readClock();
      const elapsed = this.lastTime == null ? 0 : timestamp - this.lastTime;
      const delta = Number.isFinite(elapsed)
        ? Math.min(100, Math.max(0, elapsed))
        : 0;
      this.lastTime = timestamp;
      if (!Number.isFinite(this.accumulator) || this.accumulator < 0) this.accumulator = 0;
      this.accumulator += delta;
      while (this.accumulator >= FIXED_STEP_MS) {
        this.update(FIXED_STEP_MS);
        this.accumulator -= FIXED_STEP_MS;
      }
      if (this.renderer.draw(this.state, this.world, this.presentation) === false) {
        const rendererError = this.renderer.getDebugSnapshot?.()?.errors?.last;
        throw new Error(rendererError?.message ?? '渲染器未能完成当前帧。');
      }
      this.consecutiveFrameErrors = 0;
    } catch (error) {
      this.consecutiveFrameErrors += 1;
      this.recordRuntimeError('frame', error);
      if (this.consecutiveFrameErrors >= MAX_CONSECUTIVE_FRAME_ERRORS) {
        this.cancelCharge(null, true);
        this.lifecycle = 'failed';
        this.unbindEvents();
      }
    } finally {
      // A transient draw/update exception must not silently kill the only game
      // loop. Repeated failures enter an explicit diagnosable failed state.
      this.scheduleNextFrame();
    }
  }

  debugJump(choiceIndex = 0, chargeMs = null) {
    if (this.state.phase !== GAME_PHASE.READY) return false;
    if (!this.state.startCharge(choiceIndex)) return false;
    this.state.chargeWindow = this.chargeWindowFor(choiceIndex);
    this.state.setChargeDuration(chargeMs ?? this.state.chargeWindow?.idealChargeMs ?? 600);
    this.presentation.selectedChoice = choiceIndex;
    return this.beginJump();
  }

  getDebugSnapshot() {
    return {
      phase: this.state.phase,
      currentValue: this.state.currentValue,
      targetValue: this.state.targetValue,
      movesRemaining: this.state.movesRemaining,
      currentPlatformId: this.world.current.id,
      historyIds: this.world.history.map((platform) => platform.id),
      player: { ...this.world.player.position },
      lifecycle: this.lifecycle,
      runtimeErrorCount: this.runtimeErrorCount,
      lastRuntimeError: this.lastRuntimeError
        ? {
          source: this.lastRuntimeError.source,
          message: this.lastRuntimeError.error.message,
          at: this.lastRuntimeError.at,
        }
        : null,
      renderer: this.renderer.getDebugSnapshot?.() ?? null,
    };
  }

  destroy() {
    if (this.lifecycle === 'destroyed') return;
    this.lifecycle = 'destroyed';
    this.clearActivePointer();
    const frameId = this.frameId;
    this.frameId = null;
    if (frameId != null) {
      try {
        this.platform.cancelFrame(frameId);
      } catch (error) {
        this.recordRuntimeError('cancel-frame', error);
      }
    }
    this.unbindEvents();
    try {
      if (typeof this.renderer.destroy === 'function') this.renderer.destroy();
      else this.renderer.dispose?.();
    } catch (error) {
      this.recordRuntimeError('renderer-destroy', error);
    }
  }
}
