import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import {
  createArenaMatchResources,
  destroyArenaMatchCandidate,
} from '../src/index.js';

function createHarness(options: { failEventWindow?: boolean } = {}) {
  const cleanup: string[] = [];
  const session = {
    start() {},
    setPaused() {},
    stepWithLegacySnapshotForAudit() {},
    getLegacyFullSnapshotForAudit() { return { matchSeed: 7, tick: 0 }; },
    getPublicMatchInfo() { return { matchSeed: 7 }; },
    destroy() { cleanup.push('session'); },
  };
  const sampler = {
    pointerStart() {}, pointerMove() {}, pointerEnd() {}, pointerCancel() {},
    resize() {}, suspend() {}, resume() {}, sample() {},
    destroy() { cleanup.push('sampler'); },
  };
  const eventWindow = {
    consume() {},
    destroy() { cleanup.push('eventWindow'); },
  };
  const composition = {
    matchService: {
      create() { return { matchSeed: 7, opponent: {}, content: null, session }; },
    },
    matchConfig: {},
    mapperFactory: (id: unknown) => ({ id, map() {} }),
    mapperId: 'mapper-a',
    samplerFactory: () => sampler,
    eventWindowFactory: () => {
      if (options.failEventWindow) throw new Error('event window failed');
      return eventWindow;
    },
  };
  return { cleanup, composition, eventWindow, sampler, session };
}

describe('Arena match presentation resources', () => {
  it('creates one seed-consistent candidate and destroys in dependency order', () => {
    const harness = createHarness();
    const candidate = createArenaMatchResources(harness.composition, { width: 1, height: 1 });
    expect(candidate.matchSeed).toBe(7);
    destroyArenaMatchCandidate(candidate);
    expect(harness.cleanup).toEqual(['eventWindow', 'sampler', 'session']);
  });

  it('snapshots owned methods before callers can mutate the original resources', () => {
    const harness = createHarness();
    const candidate = createArenaMatchResources(harness.composition, { width: 1, height: 1 });
    harness.session.destroy = () => { throw new Error('mutated session destroy'); };
    harness.sampler.destroy = () => { throw new Error('mutated sampler destroy'); };
    harness.eventWindow.destroy = () => { throw new Error('mutated event destroy'); };
    destroyArenaMatchCandidate(candidate);
    expect(harness.cleanup).toEqual(['eventWindow', 'sampler', 'session']);
  });

  it('rolls back acquired resources when a later factory fails', () => {
    const harness = createHarness({ failEventWindow: true });
    expect(() => createArenaMatchResources(
      harness.composition,
      { width: 1, height: 1 },
    )).toThrow(/event window failed/);
    expect(harness.cleanup).toEqual(['sampler', 'session']);
  });

  it('rejects accessor and asynchronous composition capabilities without executing accessors', () => {
    let reads = 0;
    const hostile = Object.defineProperty({}, 'matchService', {
      enumerable: true,
      get() { reads += 1; return {}; },
    });
    expect(() => createArenaMatchResources(hostile, {})).toThrow(/访问器/);
    expect(reads).toBe(0);

    const harness = createHarness();
    const asyncComposition = {
      ...harness.composition,
      mapperFactory: async (id: unknown) => ({ id, map() {} }),
    };
    expect(() => createArenaMatchResources(asyncComposition, {})).toThrow(/同步完成/);
    expect(harness.cleanup).toEqual(['session']);
  });

  it('brand-probes resource creation returns without executing hostile thenables', async () => {
    let hostileCalls = 0;
    let getterCalls = 0;
    const values = [
      () => {
        const native = Promise.reject(new Error('resource shadow rejection'));
        Object.defineProperty(native, 'then', {
          configurable: true,
          get() { getterCalls += 1; throw new Error('resource then getter must not execute'); },
        });
        return native;
      },
      () => {
        const foreign = runInNewContext('Promise.reject(new Error("resource foreign rejection"))');
        Object.defineProperty(foreign as object, 'then', { configurable: true, value: null });
        return foreign;
      },
      () => ({ then() { hostileCalls += 1; return Promise.reject(new Error('resource returned rejection')); } }),
    ];
    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => { unhandled.push(reason); };
    process.on('unhandledRejection', listener);
    try {
      for (const makeValue of values) {
        const value = makeValue();
        const harness = createHarness();
        harness.composition.matchService.create = () => value;
        expect(() => createArenaMatchResources(harness.composition, { width: 1, height: 1 }))
          .toThrow(/同步完成|Arena quick match/);
      }
      const ordinaryHarness = createHarness();
      ordinaryHarness.composition.matchService.create = () => ({ then: null } as never);
      let ordinaryError: unknown;
      try {
        createArenaMatchResources(ordinaryHarness.composition, { width: 1, height: 1 });
      } catch (error) {
        ordinaryError = error;
      }
      expect(ordinaryError).toBeInstanceOf(Error);
      expect((ordinaryError as Error).message).not.toMatch(/同步完成/);
      await new Promise<void>((resolve) => setImmediate(resolve));
    } finally {
      process.off('unhandledRejection', listener);
    }
    expect(unhandled).toHaveLength(0);
    expect(getterCalls).toBe(0);
    expect(hostileCalls).toBe(0);
  });
});
