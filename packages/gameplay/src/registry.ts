import {
  definitionKey,
  type GameplayContext,
  type GameplayDefinition,
  type TaskDefinition,
  type TaskResult,
  type ValidationResult,
  type VersionedDefinition,
} from '@number-strategy/game-contracts';
import {
  GameState,
  type GamePhase,
  type GameRules,
  type LastOperation,
} from './game-state.js';

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
    validatePresentation(definition.presentation, 'Gameplay.presentation');
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
    validatePresentation(definition.presentation, 'Task.presentation');
    return super.register(definition as TaskDefinition);
  }
}

function validatePresentation(value: unknown, path: string): void {
  if (!value || typeof value !== 'object') throw new TypeError(`${path} 必须是对象。`);
  const candidate = value as { readonly name?: unknown; readonly description?: unknown };
  if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) {
    throw new TypeError(`${path}.name 必须是非空字符串。`);
  }
  if (typeof candidate.description !== 'string' || candidate.description.trim().length === 0) {
    throw new TypeError(`${path}.description 必须是非空字符串。`);
  }
}

function valid(): ValidationResult {
  return { valid: true, issues: [] };
}

function invalid(path: string, message: string): ValidationResult {
  return { valid: false, issues: [{ path, message }] };
}

type RulesTransform = (rules: Readonly<GameRules>) => Readonly<GameRules>;

const TASK_IDS = Object.freeze([
  'reach-number',
  'near-target',
  'surpass-target',
  'parity-lock',
  'route-master',
]);

function transformRules(config: unknown, transform: RulesTransform): Readonly<GameRules> {
  const baseline = new GameState({ seed: 0, rules: config }).rules;
  return transform(baseline);
}

function defineGameplay({
  id,
  name,
  description,
  supportedTaskTypes = TASK_IDS,
  transform = (rules) => rules,
}: {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly supportedTaskTypes?: readonly string[];
  readonly transform?: RulesTransform;
}): GameplayDefinition<unknown, GameState> {
  return Object.freeze({
    id,
    version: 1,
    presentation: Object.freeze({ name, description }),
    supportedTaskTypes: Object.freeze([...supportedTaskTypes]),
    validateConfig(config: unknown): ValidationResult {
      try {
        new GameState({ seed: 0, rules: transformRules(config, transform) });
        return valid();
      } catch (error) {
        return invalid('rules', error instanceof Error ? error.message : String(error));
      }
    },
    createSession(config: unknown, context: GameplayContext): GameState {
      return new GameState({ seed: context.seed, rules: transformRules(config, transform) });
    },
  });
}

export const NUMBER_STRATEGY_GAMEPLAY = defineGameplay({
  id: 'number-strategy-jump',
  name: '全能跃迁',
  description: '加减乘除都会出现，观察两条路线并精确命中。',
});

export const PLUS_MINUS_SPRINT_GAMEPLAY = defineGameplay({
  id: 'plus-minus-sprint',
  name: '加减冲刺',
  description: '只使用加法和减法，节奏直接但路线选择更密集。',
  supportedTaskTypes: TASK_IDS.filter((id) => id !== 'route-master'),
  transform: (rules) => Object.freeze({
    ...rules,
    allowedOperations: Object.freeze(['add', 'subtract'] as const),
  }),
});

export const FACTOR_LABYRINTH_GAMEPLAY = defineGameplay({
  id: 'factor-labyrinth',
  name: '倍率迷阵',
  description: '乘除改变数值尺度，并用加法校准无法整除的节点。',
  supportedTaskTypes: TASK_IDS.filter((id) => id !== 'route-master'),
  transform: (rules) => Object.freeze({
    ...rules,
    allowedOperations: Object.freeze(['add', 'multiply', 'divide'] as const),
  }),
});

export const RISING_CHAIN_GAMEPLAY = defineGameplay({
  id: 'rising-chain',
  name: '增幅连锁',
  description: '只允许加法和乘法，必须控制增长速度避免过冲。',
  supportedTaskTypes: TASK_IDS.filter((id) => id !== 'route-master'),
  transform: (rules) => Object.freeze({
    ...rules,
    allowedOperations: Object.freeze(['add', 'multiply'] as const),
  }),
});

export const PRECISION_BUDGET_GAMEPLAY = defineGameplay({
  id: 'precision-budget',
  name: '精算限步',
  description: '保留全部运算，但每局少两步，要求更早规划完整路线。',
  transform: (rules) => Object.freeze({
    ...rules,
    movesPerRound: Math.max(3, rules.movesPerRound - 2),
  }),
});

export const BUILTIN_GAMEPLAYS = Object.freeze([
  NUMBER_STRATEGY_GAMEPLAY,
  PLUS_MINUS_SPRINT_GAMEPLAY,
  FACTOR_LABYRINTH_GAMEPLAY,
  RISING_CHAIN_GAMEPLAY,
  PRECISION_BUDGET_GAMEPLAY,
]);

export interface ReachNumberTask {
  readonly targetValue: number;
}

export interface ReachNumberSnapshot {
  readonly currentValue: number;
  readonly targetValue: number;
  readonly movesRemaining: number;
  readonly phase: GamePhase;
  readonly operationHistory: readonly LastOperation[];
}

function parseReachNumberConfig(config: unknown): ValidationResult {
  if (!config || typeof config !== 'object') return invalid('', '必须是对象');
  const targetValue = (config as Partial<ReachNumberTask>).targetValue;
  return Number.isSafeInteger(targetValue)
    ? valid()
    : invalid('targetValue', '必须是安全整数');
}

function terminalResult(
  completed: boolean,
  snapshot: ReachNumberSnapshot,
  successMessage: string,
): TaskResult {
  if (completed) return { status: 'completed', message: successMessage };
  if (snapshot.movesRemaining <= 0 || snapshot.phase === 'lost') {
    return { status: 'failed', reason: 'moves-exhausted', message: '步数耗尽，再试一次' };
  }
  return { status: 'active' };
}

function defineTask({
  id,
  name,
  description,
  evaluate,
}: {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly evaluate: (task: ReachNumberTask, snapshot: ReachNumberSnapshot) => TaskResult;
}): TaskDefinition<unknown, ReachNumberTask, ReachNumberSnapshot> {
  return Object.freeze({
    id,
    version: 1,
    presentation: Object.freeze({ name, description }),
    validate: parseReachNumberConfig,
    create(config: unknown): ReachNumberTask {
      const result = parseReachNumberConfig(config);
      if (!result.valid) throw new TypeError(`任务配置无效：${result.issues[0]?.message ?? '未知错误'}`);
      return Object.freeze({ targetValue: (config as ReachNumberTask).targetValue });
    },
    evaluate,
  });
}

export const REACH_NUMBER_TASK = defineTask({
  id: 'reach-number',
  name: '精确命中',
  description: '让当前值与目标值完全一致。',
  evaluate: (task, snapshot) => terminalResult(
    snapshot.currentValue === task.targetValue,
    snapshot,
    '精确命中目标',
  ),
});

export const NEAR_TARGET_TASK = defineTask({
  id: 'near-target',
  name: '近域停靠',
  description: '进入目标值前后 2 的范围即可完成。',
  evaluate: (task, snapshot) => terminalResult(
    Math.abs(snapshot.currentValue - task.targetValue) <= 2,
    snapshot,
    '进入目标近域',
  ),
});

export const SURPASS_TARGET_TASK = defineTask({
  id: 'surpass-target',
  name: '越界抵达',
  description: '达到或超过目标值即可完成，注意不要耗尽步数。',
  evaluate: (task, snapshot) => terminalResult(
    snapshot.currentValue >= task.targetValue,
    snapshot,
    '成功越过目标线',
  ),
});

export const PARITY_LOCK_TASK = defineTask({
  id: 'parity-lock',
  name: '奇偶锁定',
  description: '与目标奇偶一致，并进入前后 6 的范围。',
  evaluate: (task, snapshot) => terminalResult(
    Math.abs(snapshot.currentValue - task.targetValue) <= 6
      && Math.abs(snapshot.currentValue % 2) === Math.abs(task.targetValue % 2),
    snapshot,
    '奇偶频率锁定',
  ),
});

export const ROUTE_MASTER_TASK = defineTask({
  id: 'route-master',
  name: '路线大师',
  description: '至少成功三跳、使用两类运算，并进入目标前后 8。',
  evaluate: (task, snapshot) => terminalResult(
    snapshot.operationHistory.length >= 3
      && new Set(snapshot.operationHistory.map(({ kind }) => kind)).size >= 2
      && Math.abs(snapshot.currentValue - task.targetValue) <= 8,
    snapshot,
    '多路线组合完成',
  ),
});

export const BUILTIN_TASKS = Object.freeze([
  REACH_NUMBER_TASK,
  NEAR_TARGET_TASK,
  SURPASS_TARGET_TASK,
  PARITY_LOCK_TASK,
  ROUTE_MASTER_TASK,
]);

export function createBuiltinGameplayRegistry(): GameplayRegistry {
  return BUILTIN_GAMEPLAYS.reduce(
    (registry, definition) => registry.register(definition),
    new GameplayRegistry(),
  );
}

export function createBuiltinTaskRegistry(): TaskRegistry {
  return BUILTIN_TASKS.reduce(
    (registry, definition) => registry.register(definition),
    new TaskRegistry(),
  );
}
