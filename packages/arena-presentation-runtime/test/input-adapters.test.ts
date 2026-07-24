import { describe, expect, it } from 'vitest';
import {
  ARENA_INPUT_ROUTER_MODE,
  ArenaInputRouter,
  KeyboardInputAdapter,
} from '../src/index.js';

const VIEWPORT = Object.freeze({ width: 400, height: 800 });

function createSampler(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const sampler = {
    pointerStart: () => true,
    pointerMove: () => true,
    pointerEnd: () => true,
    pointerCancel: () => true,
    resize: () => { calls.push('resize'); return true; },
    suspend: () => { calls.push('suspend'); return true; },
    resume: () => { calls.push('resume'); return true; },
    sample: (tick: unknown) => ({ tick }),
    destroy: () => { calls.push('destroy'); },
    getDebugSnapshot: () => ({ calls: [...calls] }),
    ...overrides,
  };
  return { calls, sampler };
}

describe('legacy development input adapters', () => {
  it('snapshots sampler capabilities and does not destroy a same-identity replacement', () => {
    const { calls, sampler } = createSampler();
    const router = new ArenaInputRouter({
      sampler,
      viewport: VIEWPORT,
      hitTestRematch: () => false,
      onRematchRequested: () => {},
    });
    sampler.resume = () => { throw new Error('mutated method must not execute'); };
    expect(router.replaceSampler(sampler)).toBe(false);
    expect(router.setMode(ARENA_INPUT_ROUTER_MODE.GAMEPLAY)).toBe(true);
    expect(calls).toEqual(['resize', 'suspend', 'resume']);
    router.destroy();
  });

  it('rejects asynchronous sampler and rematch capabilities', () => {
    const first = createSampler({ sample: async () => ({ tick: 0 }) });
    const router = new ArenaInputRouter({
      sampler: first.sampler,
      viewport: VIEWPORT,
      hitTestRematch: () => false,
      onRematchRequested: () => {},
    });
    router.setMode(ARENA_INPUT_ROUTER_MODE.GAMEPLAY);
    expect(() => router.sample(0)).toThrow(/同步完成/);
    router.destroy();

    const second = createSampler();
    const resultRouter = new ArenaInputRouter({
      sampler: second.sampler,
      viewport: VIEWPORT,
      hitTestRematch: async () => true,
      onRematchRequested: () => {},
    });
    resultRouter.setMode(ARENA_INPUT_ROUTER_MODE.RESULT);
    expect(() => resultRouter.pointerStart({ pointerId: 1, x: 1, y: 1 })).toThrow(/同步完成/);
    resultRouter.destroy();
  });

  it('does not execute option accessors', () => {
    let reads = 0;
    const options = Object.defineProperty({}, 'participantId', {
      enumerable: true,
      get() { reads += 1; return 'player-1'; },
    });
    expect(() => new KeyboardInputAdapter(options)).toThrow(/访问器/);
    expect(reads).toBe(0);
  });

  it('retains a failed listener cleanup for a precise retry', () => {
    const listeners = new Map<string, unknown>();
    let failed = false;
    const target = {
      addEventListener(type: string, callback: unknown) { listeners.set(type, callback); },
      removeEventListener(type: string, callback: unknown) {
        if (type === 'focus' && !failed) {
          failed = true;
          throw new Error('transient cleanup failure');
        }
        if (listeners.get(type) === callback) listeners.delete(type);
      },
    };
    const keyboard = new KeyboardInputAdapter({ participantId: 'player-1' });
    keyboard.bind(target);
    expect(() => keyboard.unbind()).toThrow(/清理未完整完成/);
    expect(keyboard.getDebugSnapshot()).toMatchObject({ bound: true, pendingCleanupCount: 1 });
    expect(keyboard.unbind()).toBe(true);
    expect(keyboard.getDebugSnapshot()).toMatchObject({ bound: false, pendingCleanupCount: 0 });
    expect(listeners.size).toBe(0);
    keyboard.destroy();
  });
});
