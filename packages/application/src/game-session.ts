import {
  DEFAULT_DIFFICULTY,
  defineDifficultyProfile,
  toLegacyGameRules,
  toLegacyJumpPhysics,
  toLegacyWorldOptions,
  type DifficultyProfile,
  type LegacyGameRules,
  type LegacyJumpPhysics,
  type LegacyWorldOptions,
} from '@number-strategy/difficulty';
import {
  GameState,
  applyOperation,
  createBuiltinGameplayRegistry,
  createBuiltinTaskRegistry,
  type GameplayRegistry,
  type TaskRegistry,
} from '@number-strategy/gameplay';
import type { TaskResult } from '@number-strategy/game-contracts';
import {
  WorldState,
  createRng,
  type DeterministicRng,
  type LandingResult,
} from '@number-strategy/jump-engine';

export interface MissVisual {
  readonly reason: string;
  readonly targetId: string;
  readonly offset: { readonly x: number; readonly z: number };
}

export interface SessionPresentation extends Record<string, unknown> {
  revision: number;
  jumpId: number;
  landingId: number;
  missId: number;
  selectedChoice: number | null;
  chargePower: number;
  jumpProgress: number;
  jumpReleasedAtMs: number | null;
  landingProgress: number;
  lastLanding: LandingResult | null;
  missVisual: MissVisual | null;
  reducedMotion: boolean;
}

export class GameSession {
  readonly seed: number;
  readonly difficulty: Readonly<DifficultyProfile>;
  readonly gameRules: Readonly<LegacyGameRules>;
  readonly jumpPhysics: Readonly<LegacyJumpPhysics>;
  readonly worldOptions: Readonly<LegacyWorldOptions>;
  readonly state: GameState;
  readonly gameplayRegistry: GameplayRegistry;
  readonly taskRegistry: TaskRegistry;
  readonly gameplayId: string;
  readonly taskId: string;
  task!: unknown;
  readonly #layoutRng: DeterministicRng;
  world!: WorldState;
  readonly presentation: SessionPresentation;

  constructor({
    seed = Date.now(),
    difficulty = DEFAULT_DIFFICULTY,
    gameplayRegistry = createBuiltinGameplayRegistry(),
    taskRegistry = createBuiltinTaskRegistry(),
    gameplayId = 'number-strategy-jump',
    taskId = 'reach-number',
  }: {
    readonly seed?: number;
    readonly difficulty?: unknown;
    readonly gameplayRegistry?: GameplayRegistry;
    readonly taskRegistry?: TaskRegistry;
    readonly gameplayId?: string;
    readonly taskId?: string;
  } = {}) {
    this.seed = seed;
    this.difficulty = defineDifficultyProfile(difficulty);
    this.gameRules = toLegacyGameRules(this.difficulty);
    this.jumpPhysics = toLegacyJumpPhysics(this.difficulty);
    this.worldOptions = toLegacyWorldOptions(this.difficulty);
    this.gameplayRegistry = gameplayRegistry;
    this.taskRegistry = taskRegistry;
    this.gameplayId = gameplayId;
    this.taskId = taskId;
    const gameplay = this.gameplayRegistry.get(gameplayId);
    if (!gameplay.supportedTaskTypes.includes(taskId)) {
      throw new Error(`玩法 ${gameplayId} 不支持任务 ${taskId}。`);
    }
    const configResult = gameplay.validateConfig(this.gameRules);
    if (!configResult.valid) {
      throw new TypeError(`玩法配置无效：${configResult.issues[0]?.message ?? '未知错误'}`);
    }
    const createdState = gameplay.createSession(this.gameRules, {
      seed,
      difficultyId: this.difficulty.id,
      difficultyVersion: this.difficulty.version,
    });
    if (!(createdState instanceof GameState)) {
      throw new TypeError(`玩法 ${gameplayId} 必须创建兼容的 GameState 会话。`);
    }
    this.state = createdState;
    this.#layoutRng = createRng((seed ^ 0x9e3779b9) >>> 0);
    this.presentation = {
      revision: 0,
      jumpId: 0,
      landingId: 0,
      missId: 0,
      selectedChoice: null,
      chargePower: 0,
      jumpProgress: 0,
      jumpReleasedAtMs: null,
      landingProgress: 0,
      lastLanding: null,
      missVisual: null,
      reducedMotion: false,
    };
    this.resetWorld();
  }

  resetWorld(): void {
    this.task = this.createTask();
    const candidates = this.state.choices.map((operation) => ({
      operation,
      preview: applyOperation(this.state.currentValue, operation),
    }));
    this.world = new WorldState({
      rng: this.#layoutRng,
      historyLimit: this.worldOptions.historyLimit,
      platform: this.worldOptions.platform,
      layout: this.worldOptions.layout,
      initialCurrent: { preview: this.state.currentValue },
      initialCandidates: candidates,
    });
    this.state.chargeWindow = null;
    Object.assign(this.presentation, {
      revision: this.presentation.revision + 1,
      selectedChoice: null,
      chargePower: 0,
      jumpProgress: 0,
      jumpReleasedAtMs: null,
      landingProgress: 0,
      lastLanding: null,
      missVisual: null,
    });
  }

  evaluateTask(): TaskResult {
    const taskDefinition = this.taskRegistry.get(this.taskId);
    return taskDefinition.evaluate(this.task, {
      currentValue: this.state.currentValue,
      targetValue: this.state.targetValue,
      movesRemaining: this.state.movesRemaining,
      phase: this.state.phase,
      operationHistory: this.state.operationHistory.map((operation) => ({ ...operation })),
    });
  }

  private createTask(): unknown {
    const taskDefinition = this.taskRegistry.get(this.taskId);
    const config = { targetValue: this.state.targetValue };
    const result = taskDefinition.validate(config);
    if (!result.valid) throw new TypeError(`任务配置无效：${result.issues[0]?.message ?? '未知错误'}`);
    return taskDefinition.create(config, {
      seed: this.seed,
      gameplayId: this.gameplayId,
      difficultyId: this.difficulty.id,
    });
  }
}
