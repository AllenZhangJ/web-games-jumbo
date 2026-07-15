import { describe, expect, it } from 'vitest';
import { DEFAULT_DIFFICULTY } from '@number-strategy/difficulty';
import {
  GameState,
  GameplayRegistry,
  TaskRegistry,
  type ReachNumberSnapshot,
  type ReachNumberTask,
} from '@number-strategy/gameplay';
import type { GameplayDefinition, TaskDefinition } from '@number-strategy/game-contracts';
import { CommandHandler } from '../src/command-handler.js';
import { EventCollector } from '../src/event-collector.js';
import { FixedStepClock } from '../src/fixed-step-clock.js';
import { GameSession } from '../src/game-session.js';
import { LifecycleController } from '../src/lifecycle-controller.js';
import { SnapshotFactory } from '../src/snapshot-factory.js';

describe('application components', () => {
  it('caps elapsed time, advances fixed steps and rebases without background catch-up', () => {
    const clock = new FixedStepClock(10, 30);
    const deltas: number[] = [];
    expect(clock.advance(100, (delta) => deltas.push(delta))).toBe(0);
    expect(clock.advance(200, (delta) => deltas.push(delta))).toBe(3);
    expect(deltas).toEqual([10, 10, 10]);
    clock.rebase();
    expect(clock.advance(10_000, (delta) => deltas.push(delta))).toBe(0);
  });

  it('rejects illegal lifecycle transitions and keeps destroyed terminal', () => {
    const lifecycle = new LifecycleController();
    expect(() => lifecycle.transition('running')).toThrow(/非法生命周期转换/);
    lifecycle.transition('starting');
    lifecycle.transition('running');
    lifecycle.transition('destroyed');
    expect(lifecycle.state).toBe('destroyed');
    expect(() => lifecycle.transition('idle')).toThrow(/非法生命周期转换/);
  });

  it('collects ordered events and drains them exactly once', () => {
    let now = 10;
    const events = new EventCollector(() => now++);
    events.emit('first', { value: 1 });
    events.emit('second', { value: 2 });
    expect(events.drain().map(({ id, type, occurredAtMs }) => ({ id, type, occurredAtMs })))
      .toEqual([
        { id: 1, type: 'first', occurredAtMs: 10 },
        { id: 2, type: 'second', occurredAtMs: 11 },
      ]);
    expect(events.drain()).toEqual([]);
  });

  it('creates renderer-safe snapshots without exposing mutable world truth', () => {
    const session = new GameSession({ seed: 45, difficulty: DEFAULT_DIFFICULTY });
    const snapshot = new SnapshotFactory().create({
      revision: session.presentation.revision,
      state: session.state,
      world: session.world,
      presentation: session.presentation,
      difficulty: session.difficulty,
      gameplayId: session.gameplayId,
      taskId: session.taskId,
    });
    expect(snapshot.gameplayId).toBe('number-strategy-jump');
    expect(snapshot.taskId).toBe('reach-number');
    expect(snapshot.difficultyId).toBe('normal');
    expect(snapshot.world).not.toBe(session.world);
    expect(snapshot.state.currentValue).toBe(session.state.currentValue);
  });

  it('selects registered gameplay and task definitions without changing the main loop', () => {
    const gameplayId = 'fixture-gameplay';
    const taskId = 'fixture-task';
    const gameplay: GameplayDefinition<unknown, GameState> = {
      id: gameplayId,
      version: 1,
      supportedTaskTypes: [taskId],
      validateConfig: () => ({ valid: true, issues: [] }),
      createSession: (rules, context) => new GameState({ seed: context.seed, rules }),
    };
    const task: TaskDefinition<unknown, ReachNumberTask, ReachNumberSnapshot> = {
      id: taskId,
      version: 1,
      validate: () => ({ valid: true, issues: [] }),
      create: (config) => Object.freeze({
        targetValue: (config as { targetValue: number }).targetValue,
      }),
      evaluate: (definition, snapshot) => ({
        status: definition.targetValue === snapshot.currentValue ? 'completed' : 'active',
      }),
    };
    const session = new GameSession({
      seed: 46,
      difficulty: DEFAULT_DIFFICULTY,
      gameplayRegistry: new GameplayRegistry().register(gameplay),
      taskRegistry: new TaskRegistry().register(task),
      gameplayId,
      taskId,
    });

    expect(session.gameplayId).toBe(gameplayId);
    expect(session.taskId).toBe(taskId);
    expect(session.evaluateTask().status).toBe('active');
  });

  it('validates commands before delegating them', () => {
    const received: string[] = [];
    const handler = new CommandHandler((command) => received.push(command.type));
    handler.handle({ type: 'tick', deltaMs: 16 });
    expect(received).toEqual(['tick']);
    expect(() => handler.handle({ type: 'tick', deltaMs: Number.NaN })).toThrow(/deltaMs/);
    expect(() => handler.handle({ type: 'release-charge', pointerId: 1.5 })).toThrow(/pointerId/);
  });
});
