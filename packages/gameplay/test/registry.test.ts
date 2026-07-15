import { describe, expect, it } from 'vitest';
import type {
  GameplayDefinition,
  TaskDefinition,
  ValidationResult,
} from '@number-strategy/game-contracts';
import {
  GameplayRegistry,
  NUMBER_STRATEGY_GAMEPLAY,
  REACH_NUMBER_TASK,
  TaskRegistry,
} from '../src/registry.js';

const valid = (): ValidationResult => ({ valid: true, issues: [] });

function gameplayFixture(index: number): GameplayDefinition {
  return {
    id: `fixture-gameplay-${index}`,
    version: 1,
    supportedTaskTypes: [`fixture-task-${index}`],
    validateConfig: valid,
    createSession: () => ({ index }),
  };
}

function taskFixture(index: number): TaskDefinition {
  return {
    id: `fixture-task-${index}`,
    version: 1,
    validate: valid,
    create: () => ({ index }),
    evaluate: () => ({ status: 'active' }),
  };
}

describe('gameplay and task registries', () => {
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
      movesRemaining: 1,
      phase: 'landing',
    })).toEqual({ status: 'completed' });
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
