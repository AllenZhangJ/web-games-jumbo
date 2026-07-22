import { describe, expect, it } from 'vitest';
import { launchGame, stopLaunchedGame } from '../src/index.js';

function gameHarness(overrides: Partial<{
  destroy: () => unknown;
  start: () => unknown;
}> = {}) {
  let starts = 0;
  let destroys = 0;
  return {
    get starts() { return starts; },
    get destroys() { return destroys; },
    start() {
      starts += 1;
      return overrides.start?.();
    },
    destroy() {
      destroys += 1;
      return overrides.destroy?.();
    },
  };
}

describe('launch game coordinator', () => {
  it('rejects option accessors without execution or platform acquisition', async () => {
    let reads = 0;
    let platforms = 0;
    const options = Object.defineProperty({}, 'createGame', {
      enumerable: true,
      get() {
        reads += 1;
        return () => gameHarness();
      },
    });
    expect(await launchGame(() => {
      platforms += 1;
      return {};
    }, options)).toBeNull();
    expect(reads).toBe(0);
    expect(platforms).toBe(0);
  });

  it('blocks replacement after failed cleanup and retries the exact owned game', async () => {
    const root = {};
    let cleanupFailures = 1;
    const first = gameHarness({
      destroy() {
        if (cleanupFailures > 0) {
          cleanupFailures -= 1;
          throw new Error('destroy failed');
        }
      },
    });
    expect(await launchGame(() => ({}), { root, createGame: () => first })).toBe(first);

    let blockedPlatformCalls = 0;
    const blocked = gameHarness();
    expect(await launchGame(() => {
      blockedPlatformCalls += 1;
      return {};
    }, { root, createGame: () => blocked })).toBeNull();
    expect(blockedPlatformCalls).toBe(0);
    expect(first.destroys).toBe(1);

    const replacement = gameHarness();
    expect(await launchGame(() => ({}), { root, createGame: () => replacement })).toBe(replacement);
    expect(first.destroys).toBe(2);
    expect(replacement.starts).toBe(1);
    stopLaunchedGame(root);
  });

  it('snapshots destroy and does not double-destroy a stale completed start', async () => {
    const root = {};
    let release: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let originalDestroys = 0;
    const first = {
      start: () => gate,
      destroy: () => { originalDestroys += 1; },
    };
    const pending = launchGame(() => ({}), { root, createGame: () => first });
    await Promise.resolve();
    await Promise.resolve();
    first.destroy = () => { throw new Error('mutated destroy'); };
    const replacement = gameHarness();
    expect(await launchGame(() => ({}), { root, createGame: () => replacement })).toBe(replacement);
    expect(originalDestroys).toBe(1);
    if (release === null) throw new Error('start gate 未初始化。');
    (release as () => void)();
    expect(await pending).toBeNull();
    expect(originalDestroys).toBe(1);
    stopLaunchedGame(root);
  });

  it('contains a launch reentry raised from destroy', async () => {
    const root = {};
    let nested: Promise<object | null> | null = null;
    let nestedCreates = 0;
    const first = gameHarness({
      destroy() {
        nested = launchGame(() => ({}), {
          root,
          createGame: () => {
            nestedCreates += 1;
            return gameHarness();
          },
        });
      },
    });
    await launchGame(() => ({}), { root, createGame: () => first });
    const replacement = gameHarness();
    expect(await launchGame(() => ({}), { root, createGame: () => replacement })).toBe(replacement);
    if (nested === null) throw new Error('destroy 未触发嵌套启动。');
    expect(await (nested as Promise<object | null>)).toBeNull();
    expect(nestedCreates).toBe(0);
    stopLaunchedGame(root);
  });

  it('rejects an accessor-owned coordinator slot without executing it', async () => {
    const root = {};
    let reads = 0;
    Object.defineProperty(root, Symbol.for('number-strategy-jump.startup-state'), {
      get() {
        reads += 1;
        return null;
      },
    });
    const errors: unknown[] = [];
    expect(await launchGame(() => ({}), {
      root,
      createGame: () => gameHarness(),
      onError: (error: unknown) => errors.push(error),
    })).toBeNull();
    expect(reads).toBe(0);
    expect(errors).toHaveLength(1);
  });

  it('takes over and cleans the previous JavaScript coordinator during HMR', async () => {
    const root = {};
    const legacy = gameHarness();
    Object.defineProperty(root, Symbol.for('number-strategy-jump.startup-state'), {
      configurable: true,
      value: { generation: 7, game: legacy, starting: null },
      writable: true,
    });
    Object.defineProperty(root, '__NUMBER_STRATEGY_GAME__', {
      configurable: true,
      value: legacy,
      writable: true,
    });
    const replacement = gameHarness();
    expect(await launchGame(() => ({}), { root, createGame: () => replacement })).toBe(replacement);
    expect(legacy.destroys).toBe(1);
    stopLaunchedGame(root);
  });
});
