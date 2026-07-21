import { describe, expect, it } from 'vitest';
import { createProductSessionComposition } from '../src/index.js';

const PLACEHOLDER_DEFAULTS = Object.freeze({
  quickMatchServiceFactory: () => { throw new Error('not reached'); },
  profileDefinition: Object.freeze({}),
  contentPoolDefinition: Object.freeze({}),
  contentCatalog: Object.freeze({}),
  replacementRegistry: Object.freeze({}),
  progressionRegistry: Object.freeze({}),
  rewardDefinitionId: 'reward',
  baseMatchConfig: Object.freeze({}),
});

describe('Product Session composition boundary', () => {
  it('rejects option accessors without executing them', () => {
    let reads = 0;
    expect(() => createProductSessionComposition({
      get storage() { reads += 1; return {}; },
      ownerId: 'owner',
      wallNow: () => 0,
      seedSource: { nextSeed: () => 1 },
    }, PLACEHOLDER_DEFAULTS)).toThrow(/storage.*数据字段/);
    expect(reads).toBe(0);
  });

  it('preflights callbacks, seed ports and match config before content or storage acquisition', () => {
    const options = {
      storage: {},
      ownerId: 'owner',
      wallNow: () => 0,
      seedSource: { nextSeed: () => 1 },
    };
    expect(() => createProductSessionComposition({
      ...options,
      matchCompletionSink: 1 as unknown as null,
    }, PLACEHOLDER_DEFAULTS)).toThrow(/matchCompletionSink/);
    expect(() => createProductSessionComposition({
      ...options,
      seedSource: { get nextSeed() { throw new Error('must not run'); } },
    }, PLACEHOLDER_DEFAULTS)).toThrow(/nextSeed.*数据方法/);
    expect(() => createProductSessionComposition({
      ...options,
      matchConfig: null,
    }, PLACEHOLDER_DEFAULTS)).toThrow(/matchConfig.*普通对象/);
  });

  it('rejects unknown fields and mutable default accessors', () => {
    expect(() => createProductSessionComposition({
      storage: {},
      ownerId: 'owner',
      wallNow: () => 0,
      seedSource: { nextSeed: () => 1 },
      unexpected: true,
    } as never, PLACEHOLDER_DEFAULTS)).toThrow(/不支持字段/);
    let reads = 0;
    expect(() => createProductSessionComposition({
      storage: {},
      ownerId: 'owner',
      wallNow: () => 0,
      seedSource: { nextSeed: () => 1 },
    }, {
      ...PLACEHOLDER_DEFAULTS,
      get baseMatchConfig() { reads += 1; return {}; },
    })).toThrow(/baseMatchConfig.*数据字段/);
    expect(reads).toBe(0);
  });
});
