import { describe, expect, it } from 'vitest';
import {
  createArenaMatchResources,
  destroyArenaMatchCandidate,
} from '../src/index.js';

function createHarness(options: { failEventWindow?: boolean } = {}) {
  const cleanup: string[] = [];
  const session = {
    start() {},
    setPaused() {},
    step() {},
    getSnapshot() { return { matchSeed: 7, tick: 0 }; },
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
});
