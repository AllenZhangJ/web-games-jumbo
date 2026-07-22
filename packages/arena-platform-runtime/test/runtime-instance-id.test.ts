import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createRuntimeInstanceId } from '../src/index.js';

describe('runtime instance identity', () => {
  it('prefers a snapshotted randomUUID capability', () => {
    const crypto = { randomUUID: () => 'first-token' };
    const root = { crypto };
    const first = createRuntimeInstanceId(root, 'arena');
    crypto.randomUUID = () => 'second-token';
    expect(first).toBe('arena-first-token');
    expect(createRuntimeInstanceId(root, 'arena')).toBe('arena-second-token');
  });

  it('supports getRandomValues-only mini-game hosts', () => {
    expect(createRuntimeInstanceId({
      crypto: {
        getRandomValues(values: Uint32Array) {
          values.set([1, 2, 3, 4]);
          return values;
        },
      },
    }, 'mini-game')).toBe('mini-game-00000001000000020000000300000004');
  });

  it('falls through from unusable randomUUID and preserves a zero host clock', () => {
    expect(createRuntimeInstanceId({
      crypto: {
        randomUUID: async () => 'late-token',
        getRandomValues(values: Uint32Array) {
          values.set([5, 6, 7, 8]);
          return values;
        },
      },
    }, 'mini-game')).toBe('mini-game-00000005000000060000000700000008');
    expect(createRuntimeInstanceId({
      Date: { now: () => 0 },
      performance: { now: () => 0 },
    }, 'arena')).toMatch(/^arena-fallback-0-0-\d+$/);
  });

  it('uses explicit host clocks and a monotonic in-module fallback sequence', () => {
    const root = {
      Date: { now: () => 1_234_567 },
      performance: { now: () => 98.765 },
    };
    const first = createRuntimeInstanceId(root, 'arena-product');
    const second = createRuntimeInstanceId(root, 'arena-product');
    expect(first).toMatch(/^arena-product-fallback-1234567-98765-\d+$/);
    expect(second).not.toBe(first);
  });

  it('rejects ambiguous namespaces and asynchronous entropy providers', () => {
    expect(() => createRuntimeInstanceId({}, 'unsafe prefix')).toThrow(/安全标识/);
    const value = createRuntimeInstanceId({
      crypto: { getRandomValues: async () => new Uint32Array(4) },
      Date: { now: () => 5 },
    }, 'arena');
    expect(value).toMatch(/^arena-fallback-5-0-\d+$/);
  });

  it('keeps host identity outside authority dependencies and nondeterministic globals', async () => {
    const manifest = JSON.parse(await readFile(
      new URL('../package.json', import.meta.url),
      'utf8',
    )) as { dependencies?: Record<string, string> };
    expect(manifest.dependencies ?? {}).toEqual({
      '@number-strategy-jump/arena-platform-contracts': '0.1.0',
    });
    const source = await readFile(new URL('../src/runtime-instance-id.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/@number-strategy-jump\/(?:arena-match|arena-core|arena-bot)/);
    expect(source).not.toMatch(/Math\.random/);
  });
});
