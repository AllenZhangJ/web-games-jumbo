import { describe, expect, it } from 'vitest';
import { createPlayerProfile } from '@number-strategy-jump/arena-profile-contracts';
import {
  CONTENT_REPLACEMENT_DEFINITION_SCHEMA_VERSION,
  ContentReplacementRegistry,
  MATCH_CONTENT_KIND,
  MATCH_CONTENT_POOL_DEFINITION_SCHEMA_VERSION,
  MatchContentPoolResolver,
  ProfileContentPoolProvider,
} from '../src/index.js';

const profileDefinition = Object.freeze({
  schemaVersion: 1,
  id: 'test-profile',
  contentVersion: 1,
  currentProfileSchemaVersion: 1,
  limits: Object.freeze({
    maxUnlockedPerKind: 16,
    maxCommittedGrantIds: 16,
    maxExperience: 1000,
    maxIdentifierLength: 64,
  }),
  defaults: Object.freeze({
    profileId: 'local-player',
    progression: Object.freeze({ experience: 0, committedGrantIds: Object.freeze([]) }),
    unlocks: Object.freeze({
      characterIds: Object.freeze(['fighter-a', 'fighter-b']),
      appearanceIds: Object.freeze([]),
      equipmentIds: Object.freeze(['hammer']),
      mapIds: Object.freeze(['map-a']),
    }),
    selection: Object.freeze({ characterId: 'fighter-a', appearanceId: null }),
    settings: Object.freeze({
      soundEnabled: true,
      reducedMotion: false,
      qualityProfile: 'auto',
    }),
  }),
});

function createResolver(): MatchContentPoolResolver {
  return new MatchContentPoolResolver({
    definition: {
      schemaVersion: MATCH_CONTENT_POOL_DEFINITION_SCHEMA_VERSION,
      id: 'test-content',
      contentVersion: 1,
      playerParticipantId: 'player-1',
      opponentParticipantId: 'player-2',
      fallbackCharacterId: 'fighter-a',
      fallbackMapId: 'map-a',
      requiredEquipmentIds: ['hammer'],
    },
    catalog: {
      characterIds: ['fighter-a', 'fighter-b'],
      equipmentIds: ['hammer'],
      mapIds: ['map-a'],
    },
    replacementRegistry: [],
    profileDefinition,
  });
}

function prototypeChain(depth: number): object {
  let value: object = Object.create(null);
  for (let index = 0; index < depth; index += 1) value = Object.create(value);
  return value;
}

describe('Arena Product Content strict boundaries', () => {
  it('preserves deterministic pool identity for the same profile and seed', () => {
    const resolver = createResolver();
    const profile = createPlayerProfile(profileDefinition);
    const first = resolver.resolve({ profile, matchSeed: 20260721 });
    const second = resolver.resolve({ profile, matchSeed: 20260721 });
    expect(second).toEqual(first);
    expect(second.poolHash).toBe(first.poolHash);
    expect(Object.isFrozen(second.selection)).toBe(true);
  });

  it('rejects accessors without execution and snapshots external methods', () => {
    let getterCalls = 0;
    const invalid = {
      get profileService() {
        getterCalls += 1;
        return { getSnapshot: () => createPlayerProfile(profileDefinition) };
      },
      resolver: createResolver(),
    };
    expect(() => new ProfileContentPoolProvider(invalid)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);

    const profileService = { getSnapshot: () => createPlayerProfile(profileDefinition) };
    const resolver = createResolver();
    const resolverPort = { resolve: resolver.resolve.bind(resolver) };
    const provider = new ProfileContentPoolProvider({ profileService, resolver: resolverPort });
    profileService.getSnapshot = () => { throw new Error('替换后的方法不应执行'); };
    resolverPort.resolve = () => { throw new Error('替换后的方法不应执行'); };
    expect(provider.resolve({ matchSeed: 7 }).matchSeed).toBe(7);
  });

  it('rejects reentry and asynchronous values on synchronous ports', async () => {
    const resolver = createResolver();
    let reentryError: unknown = null;
    const provider = new ProfileContentPoolProvider({
      profileService: {
        getSnapshot() {
          try {
            provider.resolve({ matchSeed: 2 });
          } catch (error) {
            reentryError = error;
          }
          return createPlayerProfile(profileDefinition);
        },
      },
      resolver,
    });
    expect(provider.resolve({ matchSeed: 1 }).matchSeed).toBe(1);
    expect(String(reentryError)).toMatch(/不允许重入/);

    const asyncProvider = new ProfileContentPoolProvider({
      profileService: { getSnapshot: () => Promise.reject(new Error('late rejection')) },
      resolver,
    });
    expect(() => asyncProvider.resolve({ matchSeed: 1 })).toThrow(/必须同步完成/);
    await Promise.resolve();
  });

  it('rejects hostile then/constructor accessors and Promise subclasses without execution', () => {
    const resolver = createResolver();
    for (const key of ['then', 'constructor'] as const) {
      let accessorCalls = 0;
      const returned = Object.create(null);
      Object.defineProperty(returned, key, {
        get() {
          accessorCalls += 1;
          throw new Error('must-not-run');
        },
      });
      const provider = new ProfileContentPoolProvider({
        profileService: { getSnapshot() { return returned; } },
        resolver,
      });
      expect(() => provider.resolve({ matchSeed: 1 })).toThrow(/访问器/);
      expect(accessorCalls).toBe(0);
    }

    let speciesCalls = 0;
    class DerivedPromise<T> extends Promise<T> {
      static get [Symbol.species](): PromiseConstructor {
        speciesCalls += 1;
        return Promise;
      }
    }
    const subclassProvider = new ProfileContentPoolProvider({
      profileService: {
        getSnapshot() {
          return new DerivedPromise((resolve) => resolve(createPlayerProfile(profileDefinition)));
        },
      },
      resolver,
    });
    expect(() => subclassProvider.resolve({ matchSeed: 1 })).toThrow(/同步完成/);
    expect(speciesCalls).toBe(0);

    const dataThenProvider = new ProfileContentPoolProvider({
      profileService: { getSnapshot: () => ({ then: null }) },
      resolver,
    });
    expect(() => dataThenProvider.resolve({ matchSeed: 1 }))
      .toThrow(/then 字段.*同步完成/);
  });

  it('distinguishes cyclic and over-deep synchronous return prototype chains', () => {
    const resolver = createResolver();
    let cyclic: object;
    cyclic = new Proxy(Object.create(null), {
      getPrototypeOf() { return cyclic; },
    });
    const cycleProvider = new ProfileContentPoolProvider({
      profileService: { getSnapshot() { return cyclic; } },
      resolver,
    });
    expect(() => cycleProvider.resolve({ matchSeed: 1 })).toThrow(/循环/);

    const deepProvider = new ProfileContentPoolProvider({
      profileService: { getSnapshot() { return prototypeChain(33); } },
      resolver,
    });
    expect(() => deepProvider.resolve({ matchSeed: 1 })).toThrow(/超过32层/);
  });

  it('fails closed when native Promise descriptors drift', () => {
    const thenDescriptor = Object.getOwnPropertyDescriptor(Promise.prototype, 'then');
    const speciesDescriptor = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
    if (thenDescriptor === undefined || speciesDescriptor === undefined) {
      throw new Error('native Promise descriptors unavailable');
    }
    const resolver = createResolver();
    const normalProvider = new ProfileContentPoolProvider({
      profileService: { getSnapshot: () => createPlayerProfile(profileDefinition) },
      resolver,
    });
    try {
      Object.defineProperty(Promise.prototype, 'then', {
        ...thenDescriptor,
        value: function driftedThen() { return undefined; },
      });
      expect(() => normalProvider.resolve({ matchSeed: 1 })).toThrow(/描述符漂移/);
    } finally {
      Object.defineProperty(Promise.prototype, 'then', thenDescriptor);
    }

    const promiseProvider = new ProfileContentPoolProvider({
      profileService: { getSnapshot: () => Promise.resolve(createPlayerProfile(profileDefinition)) },
      resolver,
    });
    try {
      Object.defineProperty(Promise, Symbol.species, {
        ...speciesDescriptor,
        get() { return class DriftedPromise extends Promise {}; },
      });
      expect(() => promiseProvider.resolve({ matchSeed: 1 })).toThrow(/species.*漂移/);
    } finally {
      Object.defineProperty(Promise, Symbol.species, speciesDescriptor);
    }
  });

  it('rejects invalid input before external work and fails closed on mismatched output', () => {
    const resolver = createResolver();
    const profile = createPlayerProfile(profileDefinition);
    let snapshotCalls = 0;
    const provider = new ProfileContentPoolProvider({
      profileService: {
        getSnapshot() {
          snapshotCalls += 1;
          return profile;
        },
      },
      resolver,
    });
    expect(() => provider.resolve({ matchSeed: -1 })).toThrow(/uint32/);
    expect(snapshotCalls).toBe(0);

    const mismatched = new ProfileContentPoolProvider({
      profileService: { getSnapshot: () => profile },
      resolver: {
        resolve: () => resolver.resolve({ profile, matchSeed: 2 }),
      },
    });
    expect(() => mismatched.resolve({ matchSeed: 1 })).toThrow(/matchSeed 与请求不一致/);
  });

  it('rejects replacement ambiguity, cycles and accessor-backed arrays', () => {
    const replacement = (id: string, retiredId: string, replacementId: string) => ({
      schemaVersion: CONTENT_REPLACEMENT_DEFINITION_SCHEMA_VERSION,
      id,
      contentVersion: 1,
      kind: MATCH_CONTENT_KIND.EQUIPMENT,
      retiredId,
      replacementId,
    });
    expect(() => new ContentReplacementRegistry([
      replacement('one', 'retired', 'legacy'),
      replacement('two', 'retired', 'hammer'),
    ])).toThrow(/重复来源/);
    expect(() => new ContentReplacementRegistry([
      replacement('one', 'retired', 'legacy'),
      replacement('two', 'legacy', 'retired'),
    ])).toThrow(/替换环/);
    const accessor: unknown[] = [];
    Object.defineProperty(accessor, '0', {
      enumerable: true,
      get: () => replacement('unsafe', 'retired', 'hammer'),
    });
    accessor.length = 1;
    expect(() => new ContentReplacementRegistry(accessor)).toThrow(/空槽或访问器/);
  });
});
