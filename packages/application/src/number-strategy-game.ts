import {
  createBuiltinDifficultyRegistry,
  type DifficultyProfile,
  type LegacyGameRules,
  type LegacyJumpPhysics,
  type LegacyWorldOptions,
} from '@number-strategy/difficulty';
import {
  GAME_PHASE,
  applyOperation,
  type GameState,
  type GameplayRegistry,
  type OperationChoice,
  type TaskRegistry,
} from '@number-strategy/gameplay';
import {
  chargeToPower,
  createJumpTrajectory,
  getTargetChargeWindow,
  resolveTopLanding,
  sampleJumpTrajectory,
  type ChargeWindow,
  type JumpTrajectory,
  type WorldState,
  type WorldPlatform,
} from '@number-strategy/jump-engine';
import type { FeedbackPort, GameCommand, GameEvent, GameSnapshot, StoragePort } from '@number-strategy/game-contracts';
import {
  ReplayRecorder,
  SaveRepository,
  exportSaveDiagnostics,
  replaySave,
  type GameIdentity,
  type ReplayAction,
  type SaveEnvelope,
} from '@number-strategy/persistence';
import { CommandHandler } from './command-handler.js';
import { EventCollector } from './event-collector.js';
import { FixedStepClock } from './fixed-step-clock.js';
import { GameSession, type SessionPresentation } from './game-session.js';
import { LifecycleController, type ApplicationLifecycle } from './lifecycle-controller.js';
import { SnapshotFactory } from './snapshot-factory.js';

function worldCandidates(choices: readonly OperationChoice[], value: number) {
  return choices.map((operation) => ({
    operation,
    preview: applyOperation(value, operation),
  }));
}

export interface InputPoint {
  readonly x: number;
  readonly y: number;
  readonly pointerId?: number;
  readonly control?: Control;
}

interface Circle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type Control = 'pause' | 'restart' | 'choice-left' | 'choice-right';
type Cleanup = () => void;

export interface CanvasPort {
  createCanvas(): unknown;
}

export interface FrameClockPort {
  now?(): number;
  requestFrame(callback: (time?: number) => void): unknown;
  cancelFrame(id: unknown): void;
}

export interface InputPort {
  bindInput(callbacks: {
    readonly onStart: (point: InputPoint) => boolean;
    readonly onEnd: (point: InputPoint) => boolean;
    readonly onCancel: (point: InputPoint) => boolean;
  }): Cleanup;
}

export interface LifecyclePort {
  onResize(callback: () => void): Cleanup;
  onShow(callback: () => void): Cleanup;
  onHide(callback: () => void): Cleanup;
}

export interface PlatformPort extends CanvasPort, FrameClockPort, InputPort, LifecyclePort {}

export interface RendererPort {
  resize(): boolean | void;
  load(): Promise<unknown>;
  render(snapshot: GameSnapshot, events: readonly GameEvent[]): boolean | void;
  destroy?(): void;
  dispose?(): void;
  hitTest?(point: InputPoint): Control | null;
  toDesignPoint?(point: InputPoint): InputPoint;
  choiceIndexForControl?(control: Control, candidates: readonly WorldPlatform[]): number | null;
  getDebugSnapshot?(): unknown;
}

export type RendererFactory = (canvas: unknown, platform: PlatformPort) => RendererPort;

export interface NumberStrategyGameOptions {
  readonly seed?: number;
  readonly difficulty?: unknown;
  readonly gameplayRegistry?: GameplayRegistry;
  readonly taskRegistry?: TaskRegistry;
  readonly gameplayId?: string;
  readonly taskId?: string;
  readonly restoreSave?: boolean;
  readonly rendererFactory: RendererFactory;
  readonly feedback?: FeedbackPort;
  readonly storage?: StoragePort;
}

interface ActiveJump {
  elapsedMs: number;
  readonly target: WorldPlatform;
  readonly trajectory: Readonly<JumpTrajectory>;
}

interface RuntimeErrorRecord {
  readonly source: string;
  readonly error: Error;
  readonly at: number;
}

function insideCircle(point: InputPoint, circle: Circle): boolean {
  return Math.hypot(point.x - circle.x, point.y - circle.y) <= circle.radius;
}

function insideRect(point: InputPoint, rect: Rect): boolean {
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

function pointerIdOf(point: InputPoint | null): number {
  return point?.pointerId ?? 0;
}

/**
 * Owns gameplay truth and exposes a read-only presentation snapshot to Three.js.
 * Renderer3D never decides landings and never writes to GameState or WorldState.
 */
export class NumberStrategyGame {
  readonly platform: PlatformPort;
  readonly canvas: unknown;
  readonly renderer: RendererPort;
  session: GameSession;
  readonly fixedStepClock = new FixedStepClock();
  readonly lifecycleController = new LifecycleController();
  readonly eventCollector: EventCollector;
  readonly snapshotFactory = new SnapshotFactory();
  readonly commandHandler: CommandHandler<boolean>;
  readonly feedback: FeedbackPort;
  readonly storage: StoragePort;
  readonly saveRepository: SaveRepository;
  replayRecorder: ReplayRecorder;
  restoringReplay = false;
  restoredActionCount = 0;
  restoreError: string | null = null;
  jump: ActiveJump | null = null;
  frameId: unknown | null = null;
  activePointerId: number | null = null;
  chargeStartedAt: number | null = null;
  cleanups: Cleanup[] = [];
  eventsBound = false;
  startPromise: Promise<this> | null = null;
  lastRuntimeError: RuntimeErrorRecord | null = null;
  runtimeErrorCount = 0;
  consecutiveFrameErrors = 0;

  get seed(): number { return this.session.seed; }
  get difficulty(): Readonly<DifficultyProfile> { return this.session.difficulty; }
  get gameRules(): Readonly<LegacyGameRules> { return this.session.gameRules; }
  get jumpPhysics(): Readonly<LegacyJumpPhysics> { return this.session.jumpPhysics; }
  get worldOptions(): Readonly<LegacyWorldOptions> { return this.session.worldOptions; }
  get state(): GameState { return this.session.state; }
  get world(): WorldState { return this.session.world; }
  get presentation(): SessionPresentation { return this.session.presentation; }
  get accumulator(): number { return this.fixedStepClock.accumulator; }
  get lastTime(): number | null { return this.fixedStepClock.lastTime; }
  get lifecycle(): ApplicationLifecycle { return this.lifecycleController.state; }

  constructor(platform: PlatformPort, {
    seed,
    difficulty,
    gameplayRegistry,
    taskRegistry,
    gameplayId,
    taskId,
    restoreSave = true,
    rendererFactory,
    feedback = { handle: () => {}, dispose: () => {} },
    storage = { read: () => undefined, write: () => false, remove: () => false },
  }: NumberStrategyGameOptions) {
    if (!platform || typeof platform.createCanvas !== 'function') {
      throw new TypeError('NumberStrategyGame 需要有效的平台适配层。');
    }
    if (typeof rendererFactory !== 'function') {
      throw new TypeError('rendererFactory 必须是函数。');
    }
    this.platform = platform;
    this.canvas = platform.createCanvas();
    this.storage = storage;
    this.saveRepository = new SaveRepository(storage);
    const canRestore = restoreSave
      && seed === undefined
      && difficulty === undefined
      && gameplayId === undefined
      && taskId === undefined;
    let loadedSave = canRestore ? this.saveRepository.load() : null;
    let restoredDifficulty: unknown = difficulty;
    if (loadedSave) {
      try {
        restoredDifficulty = createBuiltinDifficultyRegistry().get(
          loadedSave.game.difficulty.id,
          loadedSave.game.difficulty.version,
        );
      } catch (error) {
        this.restoreError = error instanceof Error ? error.message : String(error);
        this.saveRepository.clear();
        loadedSave = null;
      }
    }
    const sessionSeed = seed ?? loadedSave?.game.seed ?? Date.now();
    const sessionGameplayId = gameplayId ?? loadedSave?.game.gameplay.id;
    const sessionTaskId = taskId ?? loadedSave?.game.task.id;
    try {
      this.session = new GameSession({
        seed: sessionSeed,
        ...(restoredDifficulty === undefined ? {} : { difficulty: restoredDifficulty }),
        ...(gameplayRegistry === undefined ? {} : { gameplayRegistry }),
        ...(taskRegistry === undefined ? {} : { taskRegistry }),
        ...(sessionGameplayId === undefined ? {} : { gameplayId: sessionGameplayId }),
        ...(sessionTaskId === undefined ? {} : { taskId: sessionTaskId }),
      });
    } catch (error) {
      if (!loadedSave) throw error;
      this.restoreError = error instanceof Error ? error.message : String(error);
      this.saveRepository.clear();
      loadedSave = null;
      this.session = new GameSession({
        seed: seed ?? Date.now(),
        ...(difficulty === undefined ? {} : { difficulty }),
        ...(gameplayRegistry === undefined ? {} : { gameplayRegistry }),
        ...(taskRegistry === undefined ? {} : { taskRegistry }),
        ...(gameplayId === undefined ? {} : { gameplayId }),
        ...(taskId === undefined ? {} : { taskId }),
      });
    }
    this.renderer = rendererFactory(this.canvas, platform);
    this.feedback = feedback;
    this.eventCollector = new EventCollector(() => this.readClock());
    this.commandHandler = new CommandHandler((command) => this.executeCommand(command));
    this.replayRecorder = new ReplayRecorder(this.gameIdentity());
    if (loadedSave && this.restoreError === null) this.restoreFromSave(loadedSave);
  }

  private gameIdentity(): GameIdentity {
    return Object.freeze({
      seed: this.seed,
      difficulty: { id: this.difficulty.id, version: this.difficulty.version },
      gameplay: {
        id: this.session.gameplayId,
        version: this.session.gameplayRegistry.get(this.session.gameplayId).version,
      },
      task: {
        id: this.session.taskId,
        version: this.session.taskRegistry.get(this.session.taskId).version,
      },
    });
  }

  private recordAction(action: ReplayAction): void {
    if (this.restoringReplay) return;
    try {
      this.replayRecorder.append(action);
      this.saveRepository.save(this.replayRecorder.envelope(this.readClock()));
    } catch (error) {
      this.recordRuntimeError('persistence', error);
    }
  }

  private restoreFromSave(envelope: SaveEnvelope): void {
    this.restoringReplay = true;
    try {
      this.restoredActionCount = replaySave(envelope, {
        jump: (choiceIndex, chargeMs) => {
          if (!this.debugJump(choiceIndex, chargeMs) || !this.jump) return false;
          const durationMs = this.jump.trajectory.durationMs;
          this.update(durationMs);
          if (this.state.phase === GAME_PHASE.LANDING) this.update(this.gameRules.landingDurationMs);
          return this.state.phase === GAME_PHASE.READY
            || this.state.phase === GAME_PHASE.WON
            || this.state.phase === GAME_PHASE.LOST;
        },
        restart: () => {
          this.restart();
          return true;
        },
        nextRound: () => this.executeCommand({ type: 'next-round' }),
      });
      this.replayRecorder = new ReplayRecorder(this.gameIdentity(), envelope.replay.actions);
    } catch (error) {
      this.restoreError = error instanceof Error ? error.message : String(error);
      this.session = new GameSession({
        seed: envelope.game.seed,
        difficulty: this.session.difficulty,
        gameplayRegistry: this.session.gameplayRegistry,
        taskRegistry: this.session.taskRegistry,
        gameplayId: this.session.gameplayId,
        taskId: this.session.taskId,
      });
      this.jump = null;
      this.restoredActionCount = 0;
      this.replayRecorder = new ReplayRecorder(this.gameIdentity());
      this.saveRepository.clear();
    } finally {
      this.restoringReplay = false;
      this.eventCollector.clear();
    }
  }

  clearSave(): boolean {
    this.replayRecorder = new ReplayRecorder(this.gameIdentity());
    return this.saveRepository.clear();
  }

  exportDiagnostics(): string {
    return exportSaveDiagnostics(
      this.replayRecorder.envelope(this.readClock()),
      this.saveRepository.diagnostics(),
    );
  }

  private executeCommand(command: GameCommand): boolean {
    switch (command.type) {
      case 'start-charge': {
        const choiceIndex = command.choice === 'left' ? 0 : 1;
        const chargeWindow = this.chargeWindowFor(choiceIndex);
        if (!this.state.startCharge(choiceIndex)) return false;
        this.activePointerId = command.pointerId;
        this.chargeStartedAt = this.readClock();
        this.state.chargeWindow = chargeWindow;
        this.presentation.selectedChoice = choiceIndex;
        this.presentation.chargePower = 0;
        this.presentation.missVisual = null;
        this.eventCollector.emit('charge-started', { choiceIndex });
        return true;
      }
      case 'release-charge': {
        if (this.activePointerId === null || command.pointerId !== this.activePointerId) return false;
        if (this.chargeStartedAt !== null) {
          const elapsedMs = this.readClock() - this.chargeStartedAt;
          if (Number.isFinite(elapsedMs) && elapsedMs >= 0) this.state.setChargeDuration(elapsedMs);
        }
        this.clearActivePointer();
        return this.beginJump();
      }
      case 'cancel-charge':
        return this.cancelCharge(
          command.pointerId === undefined ? null : { x: 0, y: 0, pointerId: command.pointerId },
          command.pointerId === undefined,
        );
      case 'tick':
        this.update(command.deltaMs);
        return true;
      case 'pause':
        return this.state.phase === GAME_PHASE.PAUSED ? false : this.togglePause();
      case 'resume':
        return this.state.phase === GAME_PHASE.PAUSED ? !this.togglePause() : false;
      case 'restart':
        this.restart();
        return true;
      case 'next-round':
        if (!this.state.nextRound()) return false;
        this.clearActivePointer();
        this.resetWorld();
        this.recordAction({ type: 'next-round' });
        return true;
    }
  }

  resetWorld(): void {
    this.session.resetWorld();
    this.jump = null;
    this.eventCollector.emit('world-reset', { round: this.state.round });
  }

  start(): Promise<this> {
    if (this.lifecycle === 'destroyed') {
      return Promise.reject(new Error('游戏已销毁，不能再次启动。'));
    }
    if (this.lifecycle === 'running') return Promise.resolve(this);
    if (this.startPromise) return this.startPromise;

    this.lifecycleController.transition('starting');
    const startPromise = (async () => {
      if (this.renderer.resize() === false) {
        const error = new Error('渲染器首屏尺寸初始化失败。');
        this.recordRuntimeError('initial-resize', error);
        throw error;
      }
      await this.renderer.load();
      if ((this.lifecycle as ApplicationLifecycle) === 'destroyed') {
        throw new Error('游戏在启动完成前已销毁。');
      }
      this.bindEvents();
      if ((this.lifecycle as ApplicationLifecycle) === 'destroyed') {
        throw new Error('游戏在事件绑定期间已销毁。');
      }
      this.fixedStepClock.rebase();
      this.lifecycleController.transition('running');
      if (!this.scheduleNextFrame()) {
        throw this.lastRuntimeError?.error ?? new Error('无法调度首帧。');
      }
      return this;
    })();
    this.startPromise = startPromise
      .catch((error) => {
        this.unbindEvents();
        if (this.lifecycle !== 'destroyed') this.lifecycleController.transition('idle');
        throw error;
      })
      .finally(() => {
        this.startPromise = null;
      });
    return this.startPromise;
  }

  bindEvents(): void {
    if (this.eventsBound || this.lifecycle === 'destroyed') return;
    const addCleanup = (cleanup: unknown): void => {
      if (typeof cleanup === 'function') this.cleanups.push(cleanup as Cleanup);
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
        this.fixedStepClock.rebase();
      }));
      this.eventsBound = true;
    } catch (error) {
      this.unbindEvents();
      throw error;
    }
  }

  unbindEvents(): void {
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

  recordRuntimeError(source: string, error: unknown): void {
    this.runtimeErrorCount += 1;
    this.lastRuntimeError = {
      source,
      error: error instanceof Error ? error : new Error(String(error)),
      at: this.readClock(),
    };
  }

  readClock(): number {
    try {
      const value = this.platform.now?.();
      if (typeof value === 'number' && Number.isFinite(value)) return value;
    } catch {
      // Fall through to the universal monotonic-enough wall clock fallback.
    }
    return Date.now();
  }

  scheduleNextFrame(): boolean {
    if (this.lifecycle !== 'running' || this.frameId != null) return false;
    try {
      this.frameId = this.platform.requestFrame(() => {
        this.frameId = null;
        this.frame();
      });
      return true;
    } catch (error) {
      this.recordRuntimeError('request-frame', error);
      this.cancelCharge(null, true);
      this.lifecycleController.transition('failed');
      this.unbindEvents();
      return false;
    }
  }

  chargeWindowFor(choiceIndex: number): ChargeWindow | null {
    const target = this.world.candidates[choiceIndex];
    if (!target) return null;
    return getTargetChargeWindow({
      origin: this.world.player.position,
      target,
      inset: 0.06,
      config: this.jumpPhysics,
    });
  }

  hitControl(rawPoint: InputPoint): Control | null {
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

  onPointerStart(rawPoint: InputPoint): boolean {
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
      return this.commandHandler.handle({ type: 'restart' });
    }
    if (control === 'pause') {
      return this.commandHandler.handle({
        type: this.state.phase === GAME_PHASE.PAUSED ? 'resume' : 'pause',
      });
    }
    if (this.state.phase === GAME_PHASE.PAUSED) {
      // The pause overlay promises “点击继续”. Consume this pointer as a pure
      // resume gesture so its matching pointerup cannot also launch a jump.
      return this.commandHandler.handle({ type: 'resume' });
    }
    if (this.state.phase === GAME_PHASE.WON) {
      return this.commandHandler.handle({ type: 'next-round' });
    }
    if (this.state.phase === GAME_PHASE.LOST) {
      return this.commandHandler.handle({ type: 'restart' });
    }
    if (this.state.phase !== GAME_PHASE.READY || this.activePointerId != null) return false;

    if (control !== 'choice-left' && control !== 'choice-right') return false;
    let choiceIndex = control === 'choice-left' ? 0 : 1;
    try {
      const screenChoiceIndex = this.renderer.choiceIndexForControl?.(
        control,
        this.world.candidates,
      );
      if (
        typeof screenChoiceIndex === 'number'
        && Number.isInteger(screenChoiceIndex)
        && screenChoiceIndex >= 0
        && screenChoiceIndex < this.world.candidates.length
      ) {
        choiceIndex = screenChoiceIndex;
      }
    } catch {
      // Render-side projection is optional; keep the stable logical fallback.
    }
    try {
      return this.commandHandler.handle({
        type: 'start-charge',
        choice: choiceIndex === 0 ? 'left' : 'right',
        pointerId: pointerIdOf(rawPoint),
      });
    } catch (error) {
      this.recordRuntimeError('charge-window', error);
      return false;
    }
  }

  beginJump(): boolean {
    if (this.state.phase !== GAME_PHASE.CHARGING) return false;
    const choiceIndex = this.state.selectedChoice;
    if (choiceIndex === null) return false;
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
        config: this.jumpPhysics,
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
    this.presentation.chargePower = chargeToPower(released.chargeMs, this.jumpPhysics);
    this.eventCollector.emit('jump-started', {
      choiceIndex,
      chargeMs: released.chargeMs,
      targetId: target.id,
    });
    this.recordAction({
      type: 'jump',
      choiceIndex: choiceIndex === 0 ? 0 : 1,
      chargeMs: released.chargeMs,
    });
    return true;
  }

  onPointerEnd(rawPoint: InputPoint): boolean {
    if (this.lifecycle !== 'running') return false;
    return this.commandHandler.handle({
      type: 'release-charge',
      pointerId: pointerIdOf(rawPoint),
    });
  }

  clearActivePointer(): void {
    this.activePointerId = null;
    this.chargeStartedAt = null;
  }

  cancelCharge(rawPoint: InputPoint | null = null, force = false): boolean {
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
    this.eventCollector.emit('charge-cancelled', {});
    return true;
  }

  togglePause(): boolean {
    if (
      this.state.phase === GAME_PHASE.CHARGING
      || (this.state.phase === GAME_PHASE.PAUSED
        && this.state.previousPhase === GAME_PHASE.CHARGING)
    ) this.cancelCharge(null, true);
    return this.state.togglePause();
  }

  restart(): void {
    this.clearActivePointer();
    this.state.restart();
    this.resetWorld();
    this.fixedStepClock.rebase();
    this.eventCollector.emit('restarted', {});
    this.recordAction({ type: 'restart' });
  }

  resolveJump() {
    if (!this.jump || this.state.phase !== GAME_PHASE.JUMPING) return null;
    const landing = resolveTopLanding({
      trajectory: this.jump.trajectory,
      target: this.jump.target,
    });
    if (landing.landed) {
      const selectedChoice = this.state.selectedChoice;
      const operation = selectedChoice === null ? undefined : this.state.choices[selectedChoice];
      if (!operation) throw new Error('落地结算缺少已选择的运算。');
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
      if (!event || event.type !== 'land' || !this.state.useChoices(nextChoices)) {
        throw new Error('落地后无法提交新的数值候选。');
      }
      this.presentation.landingId += 1;
      this.presentation.revision += 1;
      this.presentation.missVisual = null;
      this.presentation.lastLanding = landing;
      this.jump = null;
      this.eventCollector.emit('landed', {
        result: event.result,
        platformId: this.world.current.id,
      });
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
      this.eventCollector.emit('missed', {
        reason: landing.reason,
        targetId: this.presentation.missVisual.targetId,
      });
      return event;
    }
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    if (this.state.phase === GAME_PHASE.PAUSED) return;

    const phaseAtStart = this.state.phase;
    this.state.updateCharge(deltaMs);
    if (this.state.phase === GAME_PHASE.CHARGING) {
      this.presentation.chargePower = chargeToPower(this.state.chargeMs, this.jumpPhysics);
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
    if (landingEvent?.type === 'won' || landingEvent?.type === 'lost') {
      this.eventCollector.emit(landingEvent.type, {
        currentValue: this.state.currentValue,
        targetValue: this.state.targetValue,
      });
    }
    if (landingEvent) {
      const taskResult = this.session.evaluateTask();
      if (taskResult.status !== 'active') {
        this.eventCollector.emit(`task-${taskResult.status}`, {
          taskId: this.session.taskId,
          reason: taskResult.reason,
        });
      }
    }

    if (this.state.phase === GAME_PHASE.LOST && !this.world.player.supportPlatformId) {
      const floorY = (this.world.current?.topY ?? 0) - 20;
      const currentY = Number.isFinite(this.world.player.position.y)
        ? this.world.player.position.y
        : floorY;
      this.world.player.position.y = Math.max(floorY, currentY - remainingDeltaMs / 460);
    }
  }

  frame(): void {
    if (this.lifecycle !== 'running') return;
    try {
      // requestAnimationFrame timestamps are not portable across mini-game
      // hosts: some are omitted, some use uptime, while platform.now() may use
      // epoch time. Use one clock consistently for the whole runtime.
      this.fixedStepClock.advance(this.readClock(), (deltaMs) => {
        this.commandHandler.handle({ type: 'tick', deltaMs });
      });
      const events = this.eventCollector.drain();
      const snapshot = this.snapshotFactory.create({
        revision: this.presentation.revision,
        state: this.state,
        world: this.world,
        presentation: this.presentation,
        difficulty: this.difficulty,
        gameplayId: this.session.gameplayId,
        taskId: this.session.taskId,
      });
      try {
        this.feedback.handle(events);
      } catch (error) {
        this.recordRuntimeError('feedback', error);
      }
      if (this.renderer.render(snapshot, events) === false) {
        throw new Error('渲染器未能完成当前帧。');
      }
      this.consecutiveFrameErrors = 0;
    } catch (error) {
      this.consecutiveFrameErrors += 1;
      this.recordRuntimeError('frame', error);
      if (this.consecutiveFrameErrors >= MAX_CONSECUTIVE_FRAME_ERRORS) {
        this.cancelCharge(null, true);
        this.lifecycleController.transition('failed');
        this.unbindEvents();
      }
    } finally {
      // A transient draw/update exception must not silently kill the only game
      // loop. Repeated failures enter an explicit diagnosable failed state.
      this.scheduleNextFrame();
    }
  }

  debugJump(choiceIndex = 0, chargeMs: number | null = null): boolean {
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
      difficulty: {
        id: this.difficulty.id,
        version: this.difficulty.version,
      },
      currentPlatformId: this.world.current.id,
      historyIds: this.world.history.map((platform) => platform.id),
      player: { ...this.world.player.position },
      lifecycle: this.lifecycle,
      runtimeErrorCount: this.runtimeErrorCount,
      persistence: {
        actions: this.replayRecorder.actions.length,
        restoredActionCount: this.restoredActionCount,
        restoreError: this.restoreError,
        diagnostics: this.saveRepository.diagnostics(),
      },
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

  destroy(): void {
    if (this.lifecycle === 'destroyed') return;
    this.lifecycleController.transition('destroyed');
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
    try {
      this.feedback.dispose();
    } catch (error) {
      this.recordRuntimeError('feedback-dispose', error);
    }
    this.eventCollector.clear();
  }
}
