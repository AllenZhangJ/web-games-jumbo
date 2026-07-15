import { describe, expect, it } from 'vitest';
import type {
  GameplayDefinition,
  TaskDefinition,
  ValidationResult,
} from '@number-strategy/game-contracts';
import {
  BUILTIN_GAMEPLAYS,
  BUILTIN_TASKS,
  GameplayRegistry,
  NUMBER_STRATEGY_GAMEPLAY,
  REACH_NUMBER_TASK,
  TaskRegistry,
  createBuiltinGameplayRegistry,
  createBuiltinTaskRegistry,
} from '../src/registry.js';
import { NORMAL_DIFFICULTY, toLegacyGameRules } from '@number-strategy/difficulty';

const valid = (): ValidationResult => ({ valid: true, issues: [] });

function gameplayFixture(index: number): GameplayDefinition {
  return {
    id: `fixture-gameplay-${index}`,
    version: 1,
    presentation: { name: `玩法 ${index}`, description: '测试玩法' },
    supportedTaskTypes: [`fixture-task-${index}`],
    validateConfig: valid,
    createSession: () => ({ index }),
  };
}

function taskFixture(index: number): TaskDefinition {
  return {
    id: `fixture-task-${index}`,
    version: 1,
    presentation: { name: `任务 ${index}`, description: '测试任务' },
    validate: valid,
    create: () => ({ index }),
    evaluate: () => ({ status: 'active' }),
  };
}

describe('gameplay and task registries', () => {
  it('ships five real gameplays and five real tasks with stable identities', () => {
    expect(createBuiltinGameplayRegistry().list()).toHaveLength(5);
    expect(createBuiltinTaskRegistry().list()).toHaveLength(5);
    expect(new Set(BUILTIN_GAMEPLAYS.map(({ id }) => id)).size).toBe(5);
    expect(new Set(BUILTIN_TASKS.map(({ id }) => id)).size).toBe(5);
  });

  it('constructs every gameplay for one thousand deterministic normal seeds', () => {
    const rules = toLegacyGameRules(NORMAL_DIFFICULTY);
    for (const gameplay of BUILTIN_GAMEPLAYS) {
      for (let seed = 1; seed <= 1_000; seed += 1) {
        const session = gameplay.createSession(rules, {
          seed,
          difficultyId: 'normal',
          difficultyVersion: 1,
        });
        expect(session.choices).toHaveLength(2);
        expect(session.choices.every(({ kind }) => session.rules.allowedOperations.includes(kind))).toBe(true);
      }
    }
  });

  it('evaluates all five task completion rules independently', () => {
    const registry = createBuiltinTaskRegistry();
    const context = { seed: 1, gameplayId: 'number-strategy-jump', difficultyId: 'normal' };
    const task = (id: string) => registry.get(id).create({ targetValue: 40 }, context);
    const snapshot = {
      currentValue: 40,
      targetValue: 40,
      movesRemaining: 3,
      phase: 'landing' as const,
      operationHistory: [
        { id: 'a', label: '+4', kind: 'add' as const, amount: 4, previousValue: 20, result: 24 },
        { id: 'b', label: '×2', kind: 'multiply' as const, amount: 2, previousValue: 24, result: 48 },
        { id: 'c', label: '−8', kind: 'subtract' as const, amount: 8, previousValue: 48, result: 40 },
      ],
    };
    expect(registry.get('reach-number').evaluate(task('reach-number'), snapshot).status).toBe('completed');
    expect(registry.get('near-target').evaluate(task('near-target'), {
      ...snapshot, currentValue: 42,
    }).status).toBe('completed');
    expect(registry.get('surpass-target').evaluate(task('surpass-target'), {
      ...snapshot, currentValue: 44,
    }).status).toBe('completed');
    expect(registry.get('parity-lock').evaluate(task('parity-lock'), {
      ...snapshot, currentValue: 46,
    }).status).toBe('completed');
    expect(registry.get('route-master').evaluate(task('route-master'), snapshot).status).toBe('completed');
  });

  it('proves capacity for five static gameplays and five static tasks', () => {
    const gameplays = new GameplayRegistry();
    const tasks = new TaskRegistry();
    for (let index = 1; index <= 5; index += 1) {
      gameplays.register(gameplayFixture(index));
      tasks.register(taskFixture(index));
    }
    expect(gameplays.list()).toHaveLength(5);
    expect(tasks.list()).toHaveLength(5);
    expect(gameplays.get('fixture-gameplay-3').id).toBe('fixture-gameplay-3');
    expect(tasks.get('fixture-task-5', 1).id).toBe('fixture-task-5');
  });

  it('registers the real gameplay and task and evaluates the task', () => {
    expect(new GameplayRegistry().register(NUMBER_STRATEGY_GAMEPLAY).list()).toHaveLength(1);
    expect(new TaskRegistry().register(REACH_NUMBER_TASK).list()).toHaveLength(1);
    const task = REACH_NUMBER_TASK.create({ targetValue: 12 }, {
      seed: 1,
      gameplayId: NUMBER_STRATEGY_GAMEPLAY.id,
      difficultyId: 'normal',
    });
    expect(REACH_NUMBER_TASK.evaluate(task, {
      currentValue: 12,
      targetValue: 12,
      movesRemaining: 1,
      phase: 'landing',
      operationHistory: [],
    })).toMatchObject({ status: 'completed' });
  });

  it('rejects duplicates and malformed definitions', () => {
    const registry = new GameplayRegistry().register(gameplayFixture(1));
    expect(() => registry.register(gameplayFixture(1))).toThrow(/重复注册/);
    expect(() => registry.register({
      ...gameplayFixture(2),
      supportedTaskTypes: ['same', 'same'],
    })).toThrow(/无重复项/);
  });
});
