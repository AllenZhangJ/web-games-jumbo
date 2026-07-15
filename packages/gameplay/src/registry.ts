import {
  definitionKey,
  type GameplayContext,
  type GameplayDefinition,
  type TaskDefinition,
  type TaskResult,
  type ValidationResult,
  type VersionedDefinition,
} from '@number-strategy/game-contracts';
import { GameState, type GamePhase } from './game-state.js';

export class VersionedRegistry<TDefinition extends VersionedDefinition> {
  readonly #definitions = new Map<string, TDefinition>();

  register(definition: TDefinition): this {
    const key = definitionKey(definition);
    if (this.#definitions.has(key)) throw new Error(`定义重复注册：${key}`);
    this.#definitions.set(key, Object.freeze({ ...definition }) as TDefinition);
    return this;
  }

  get(id: string, version?: number): TDefinition {
    if (version !== undefined) {
      const found = this.#definitions.get(`${id}@${version}`);
      if (!found) throw new Error(`未注册定义：${id}@${version}`);
      return found;
    }
    const found = [...this.#definitions.values()]
      .filter((definition) => definition.id === id)
      .sort((left, right) => right.version - left.version)[0];
    if (!found) throw new Error(`未注册定义：${id}`);
    return found;
  }

  list(): readonly TDefinition[] {
    return Object.freeze([...this.#definitions.values()]);
  }
}

function assertFunction(value: unknown, name: string): void {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
}

export class GameplayRegistry extends VersionedRegistry<GameplayDefinition> {
  override register<TConfig, TSession>(definition: GameplayDefinition<TConfig, TSession>): this {
    assertFunction(definition.validateConfig, 'Gameplay.validateConfig');
    assertFunction(definition.createSession, 'Gameplay.createSession');
    if (!Array.isArray(definition.supportedTaskTypes)
      || new Set(definition.supportedTaskTypes).size !== definition.supportedTaskTypes.length) {
      throw new TypeError('Gameplay.supportedTaskTypes 必须是无重复项的数组。');
    }
    for (const taskType of definition.supportedTaskTypes) {
      definitionKey({ id: taskType, version: 1 });
    }
    return super.register({
      ...definition,
      supportedTaskTypes: Object.freeze([...definition.supportedTaskTypes]),
    } as GameplayDefinition);
  }
}

export class TaskRegistry extends VersionedRegistry<TaskDefinition> {
  override register<TConfig, TTask, TSnapshot>(
    definition: TaskDefinition<TConfig, TTask, TSnapshot>,
  ): this {
    assertFunction(definition.validate, 'Task.validate');
    assertFunction(definition.create, 'Task.create');
    assertFunction(definition.evaluate, 'Task.evaluate');
    return super.register(definition as TaskDefinition);
  }
}

function valid(): ValidationResult {
  return { valid: true, issues: [] };
}

function invalid(path: string, message: string): ValidationResult {
  return { valid: false, issues: [{ path, message }] };
}

export const NUMBER_STRATEGY_GAMEPLAY: GameplayDefinition<unknown, GameState> = Object.freeze({
  id: 'number-strategy-jump',
  version: 1,
  supportedTaskTypes: Object.freeze(['reach-number']),
  validateConfig(config: unknown): ValidationResult {
    try {
      new GameState({ seed: 0, rules: config });
      return valid();
    } catch (error) {
      return invalid('rules', error instanceof Error ? error.message : String(error));
    }
  },
  createSession(config: unknown, context: GameplayContext): GameState {
    return new GameState({ seed: context.seed, rules: config });
  },
});

export interface ReachNumberTask {
  readonly targetValue: number;
}

export interface ReachNumberSnapshot {
  readonly currentValue: number;
  readonly movesRemaining: number;
  readonly phase: GamePhase;
}

function parseReachNumberConfig(config: unknown): ValidationResult {
  if (!config || typeof config !== 'object') return invalid('', '必须是对象');
  const targetValue = (config as Partial<ReachNumberTask>).targetValue;
  return Number.isSafeInteger(targetValue)
    ? valid()
    : invalid('targetValue', '必须是安全整数');
}

export const REACH_NUMBER_TASK: TaskDefinition<unknown, ReachNumberTask, ReachNumberSnapshot> = Object.freeze({
  id: 'reach-number',
  version: 1,
  validate: parseReachNumberConfig,
  create(config: unknown): ReachNumberTask {
    const result = parseReachNumberConfig(config);
    if (!result.valid) throw new TypeError(`任务配置无效：${result.issues[0]?.message ?? '未知错误'}`);
    return Object.freeze({ targetValue: (config as ReachNumberTask).targetValue });
  },
  evaluate(task: ReachNumberTask, snapshot: ReachNumberSnapshot): TaskResult {
    if (snapshot.currentValue === task.targetValue) return { status: 'completed' };
    if (snapshot.movesRemaining <= 0 || snapshot.phase === 'lost') {
      return { status: 'failed', reason: 'moves-exhausted' };
    }
    return { status: 'active' };
  },
});

export function createBuiltinGameplayRegistry(): GameplayRegistry {
  return new GameplayRegistry().register(NUMBER_STRATEGY_GAMEPLAY);
}

export function createBuiltinTaskRegistry(): TaskRegistry {
  return new TaskRegistry().register(REACH_NUMBER_TASK);
}
