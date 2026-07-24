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
