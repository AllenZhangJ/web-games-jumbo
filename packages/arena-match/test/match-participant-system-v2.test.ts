import { describe, expect, it } from 'vitest';
import { MatchParticipantSystemV2 } from '../src/match-participant-system-v2.js';

type DataRecord = Record<string, unknown>;

function assignment(participantId: string): DataRecord {
  return {
    participantId,
    modeRole: 'competitor',
    teamId: null,
    controllerKind: participantId === 'player-1' ? 'human' : 'bot',
    characterDefinitionId: `character.${participantId}.test`,
    slotId: null,
    slotGeneration: 0,
  };
}

function raceConfig(ids = ['player-2', 'player-1']): DataRecord {
  return {
    schemaVersion: 6,
    modeDefinitionId: 'arena.mode.race.test.v1',
    modeKind: 'race',
    modePolicyContentHash: 'ace0ace0',
    participantAssignments: ids.map(assignment),
  };
}

function constructionCause(operation: () => unknown): Error {
  let thrown: unknown;
  try {
    operation();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(Error);
  const descriptor = Object.getOwnPropertyDescriptor(thrown as object, 'cause');
  expect(descriptor).toBeDefined();
  expect(descriptor).toHaveProperty('value');
  expect(descriptor?.value).toBeInstanceOf(Error);
  return descriptor?.value as Error;
}

describe('MatchParticipantSystemV2', () => {
  it('keeps participant assignment identity immutable and is the only runtime-state writer', () => {
    const system = new MatchParticipantSystemV2(raceConfig());
    system.start();
    expect(system.participantIds).toEqual(['player-1', 'player-2']);
    expect(system.applyTransitions([{
      kind: 'activate',
      participantId: 'player-2',
      slotGeneration: null,
    }, {
      kind: 'activate',
      participantId: 'player-1',
      slotGeneration: null,
    }])).toMatchObject([
      { participantId: 'player-1', status: 'active', revision: 1 },
      { participantId: 'player-2', status: 'active', revision: 1 },
    ]);
    system.applyTransitions([{
      kind: 'begin-respawn',
      participantId: 'player-1',
      slotGeneration: null,
    }]);
    expect(system.getSnapshot('player-1')).toMatchObject({
      participantId: 'player-1',
      modeRole: 'competitor',
      teamId: null,
      controllerKind: 'human',
      status: 'respawning',
      revision: 2,
    });
    const snapshot = system.getSnapshot('player-1');
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(() => Object.assign(snapshot, { status: 'finished' })).toThrow();
    expect(system.getSnapshot('player-1').status).toBe('respawning');
  });

  it('prevalidates a sorted transition batch before committing any participant', () => {
    const system = new MatchParticipantSystemV2(raceConfig());
    system.start();
    expect(() => system.applyTransitions([{
      kind: 'activate',
      participantId: 'player-1',
      slotGeneration: null,
    }, {
      kind: 'activate',
      participantId: 'unknown',
      slotGeneration: null,
    }])).toThrow(/未知 participant/);
    expect(system.getSnapshot('player-1')).toMatchObject({ status: 'registered', revision: 0 });
    expect(() => system.applyTransitions([{
      kind: 'activate',
      participantId: 'player-1',
      slotGeneration: null,
    }, {
      kind: 'finish',
      participantId: 'player-1',
      slotGeneration: null,
    }])).toThrow(/每个 participant/);
  });

  it('releases partially constructed participant resources in strict reverse order', () => {
    const cleanupOrder: string[] = [];
    expect(() => new MatchParticipantSystemV2(
      raceConfig(['player-3', 'player-1', 'player-2']),
      (entry) => {
        if (entry.participantId === 'player-3') throw new Error('factory failed at player-3');
        return {
          destroy() {
            cleanupOrder.push(entry.participantId);
          },
        };
      },
    )).toThrow(/构造失败/);
    expect(cleanupOrder).toEqual(['player-2', 'player-1']);
  });

  it('contains a rejected async resource factory result before construction can publish', async () => {
    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', listener);
    try {
      expect(constructionCause(() => new MatchParticipantSystemV2(
        raceConfig(),
        () => Promise.reject(new Error('async-resource')) as never,
      )).message).toMatch(/同步完成/);
      await Promise.resolve();
      await Promise.resolve();
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', listener);
    }
  });

  it('rejects hostile synchronous-return shapes without executing external then or accessors', () => {
    let thenCalls = 0;
    expect(constructionCause(() => new MatchParticipantSystemV2(
      raceConfig(),
      () => ({
        then() {
          thenCalls += 1;
        },
      } as never),
    )).message).toMatch(/thenable/);
    expect(thenCalls).toBe(0);

    let dataThenFactoryCalls = 0;
    let dataThenDestroyCalls = 0;
    expect(constructionCause(() => new MatchParticipantSystemV2(
      raceConfig(),
      () => {
        dataThenFactoryCalls += 1;
        return {
          constructor: null,
          then: null,
          destroy() { dataThenDestroyCalls += 1; },
        } as never;
      },
    )).message).toMatch(/then 字段/);
    expect(dataThenFactoryCalls).toBe(1);
    expect(dataThenDestroyCalls).toBe(1);

    let thenGetterCalls = 0;
    const accessorThen = Object.defineProperty({}, 'then', {
      enumerable: true,
      get() {
        thenGetterCalls += 1;
        throw new Error('then getter must not execute');
      },
    });
    expect(constructionCause(() => new MatchParticipantSystemV2(
      raceConfig(),
      () => accessorThen as never,
    )).message).toMatch(/访问器 thenable/);
    expect(thenGetterCalls).toBe(0);

    let constructorGetterCalls = 0;
    const accessorConstructor = Object.defineProperty({}, 'constructor', {
      enumerable: true,
      get() {
        constructorGetterCalls += 1;
        throw new Error('constructor getter must not execute');
      },
    });
    expect(constructionCause(() => new MatchParticipantSystemV2(
      raceConfig(),
      () => accessorConstructor as never,
    )).message).toMatch(/访问器 constructor/);
    expect(constructorGetterCalls).toBe(0);

    const cyclicTarget = Object.create(null) as object;
    let cyclicResult: object;
    cyclicResult = new Proxy(cyclicTarget, {
      getPrototypeOf() {
        return cyclicResult;
      },
    });
    expect(constructionCause(() => new MatchParticipantSystemV2(
      raceConfig(),
      () => cyclicResult as never,
    )).message).toMatch(/prototype 链不能循环/);

    let tooDeepResult = Object.create(null) as object;
    for (let depth = 0; depth < 33; depth += 1) {
      tooDeepResult = Object.create(tooDeepResult) as object;
    }
    expect(constructionCause(() => new MatchParticipantSystemV2(
      raceConfig(),
      () => tooDeepResult as never,
    )).message).toMatch(/超过 32 层/);

    class UnsafePromiseSubclass extends Promise<unknown> {}
    expect(constructionCause(() => new MatchParticipantSystemV2(
      raceConfig(),
      () => UnsafePromiseSubclass.resolve() as never,
    )).message).toMatch(/thenable/);
  });

  it('rejects native Promise descriptor drift without invoking the replacement', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Promise.prototype, 'then');
    expect(descriptor).toBeDefined();
    let replacementCalls = 0;
    Object.defineProperty(Promise.prototype, 'then', {
      ...descriptor,
      value() {
        replacementCalls += 1;
        throw new Error('replacement then must not execute');
      },
    });
    try {
      expect(constructionCause(() => new MatchParticipantSystemV2(
        raceConfig(),
        () => ({ destroy() {} }),
      )).message).toMatch(/描述符漂移/);
      expect(replacementCalls).toBe(0);
    } finally {
      Object.defineProperty(Promise.prototype, 'then', descriptor!);
    }

    const speciesDescriptor = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
    expect(speciesDescriptor).toBeDefined();
    let speciesGetterCalls = 0;
    Object.defineProperty(Promise, Symbol.species, {
      ...speciesDescriptor,
      get() {
        speciesGetterCalls += 1;
        return Promise;
      },
    });
    try {
      expect(constructionCause(() => new MatchParticipantSystemV2(
        raceConfig(),
        () => Promise.resolve() as never,
      )).message).toMatch(/Symbol\.species.*描述符漂移/);
      expect(speciesGetterCalls).toBe(0);
    } finally {
      Object.defineProperty(Promise, Symbol.species, speciesDescriptor!);
    }
  });

  it('supports pause/resume, retains failed cleanup ownership and makes completed destroy idempotent', () => {
    const destroyCalls = new Map<string, number>();
    const system = new MatchParticipantSystemV2(raceConfig(), (entry) => ({
      destroy() {
        const calls = (destroyCalls.get(entry.participantId) ?? 0) + 1;
        destroyCalls.set(entry.participantId, calls);
        if (entry.participantId === 'player-1' && calls === 1) throw new Error('retry cleanup');
      },
    }));
    system.start();
    system.pause();
    expect(system.state).toBe('paused');
    expect(() => system.applyTransitions([{
      kind: 'activate', participantId: 'player-1', slotGeneration: null,
    }])).toThrow(/只在 active/);
    system.resume();
    expect(system.state).toBe('active');
    expect(() => system.destroy()).toThrow(/清理未完整/);
    expect(system.state).toBe('failed');
    system.destroy();
    system.destroy();
    expect(system.state).toBe('destroyed');
    expect(destroyCalls).toEqual(new Map([
      ['player-2', 1],
      ['player-1', 2],
    ]));
  });

  it('rejects accessors without executing them and fails closed on destroy reentry', () => {
    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'participantAssignments', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return [];
      },
    });
    expect(() => new MatchParticipantSystemV2(hostile)).toThrow(/访问器|数据字段/);
    expect(getterCalls).toBe(0);

    let system: MatchParticipantSystemV2;
    system = new MatchParticipantSystemV2(raceConfig(), () => ({
      destroy() {
        try {
          system.destroy();
        } catch {
          // The owned resource cannot turn a rejected reentry into success.
        }
      },
    }));
    expect(() => system.destroy()).toThrow(/清理未完整/);
    expect(system.state).toBe('failed');
  });

  it('publishes completed resource cleanup before rejecting swallowed public-read reentry', () => {
    let system: MatchParticipantSystemV2;
    let triggerReentry = true;
    let nestedError: unknown = null;
    const destroyCalls = new Map<string, number>();
    system = new MatchParticipantSystemV2(raceConfig(), (entry) => ({
      destroy() {
        destroyCalls.set(
          entry.participantId,
          (destroyCalls.get(entry.participantId) ?? 0) + 1,
        );
        if (!triggerReentry) return;
        try {
          void system.state;
        } catch (error) {
          nestedError = error;
        }
      },
    }));

    expect(() => system.destroy()).toThrow(/清理未完整/u);
    expect(String(nestedError)).toMatch(/destroy.*重入state-read/u);
    expect(system.state).toBe('failed');
    expect([...destroyCalls.values()].reduce((sum, value) => sum + value, 0)).toBe(1);

    triggerReentry = false;
    system.destroy();
    system.destroy();
    expect(system.state).toBe('destroyed');
    expect([...destroyCalls.values()].reduce((sum, value) => sum + value, 0)).toBe(2);
  });
});
