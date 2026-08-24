import { describe, expect, it } from 'vitest';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_CANDIDATE_V1,
  ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_STATE_V1,
  ArenaV2ProfileCollectionProgressInputAdapterCandidateV1,
} from '../src/arena-v2-profile-collection-progress-input-adapter-candidate-v1.js';

function catalogIdentities(prefix = 'catalog') {
  const weaponDefinitionIds = Array.from(
    { length: 20 },
    (_, index) => `${prefix}.weapon.${String(index).padStart(2, '0')}`,
  );
  const maps = Array.from({ length: 2 }, (_, mapIndex) => Object.freeze({
    mapDefinitionId: `${prefix}.map.${mapIndex}`,
    segmentDefinitionIds: Object.freeze(Array.from(
      { length: 10 },
      (_, segmentIndex) => `${prefix}.map.${mapIndex}.segment.${segmentIndex}`,
    )),
  }));
  return Object.freeze({
    weaponDefinitionIds: Object.freeze(weaponDefinitionIds),
    maps: Object.freeze(maps),
  });
}

function profileDefinition(prefix = 'catalog') {
  const identities = catalogIdentities(prefix);
  return {
    schemaVersion: 1,
    id: 'arena-v2.learning-profile.candidate.v1',
    contentVersion: 5,
    currentProfileSchemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultProfileServiceWired: false,
    limits: {
      maxIdentifierLength: 160,
      maxCommittedGrantIds: 64,
      maxCounterValue: 10_000,
      maxCollectedWeaponIds: 20,
      maxCollectedMapIds: 2,
      maxWeaponMasteryRecords: 20,
      maxMapSegmentMasteryRecords: 20,
      maxModeRecords: 3,
      maxChallengeRecords: 16,
    },
    masteryRequirements: {
      weaponCollectionUseEvidence: 120,
      weaponContextEvidence: {
        ground: 1,
        aerial: 1,
        edge: 1,
        'duel-counterplay': 1,
        survival: 1,
      },
      mapSegmentCompletionEvidence: 1,
      modeCompletionEvidence: 1,
    },
    defaultProfileId: 'local',
    initiallyCollectedWeaponDefinitionIds: [],
    initiallyCollectedMapDefinitionIds: [],
    weaponDefinitionIds: identities.weaponDefinitionIds,
    mapDefinitions: identities.maps.map(({ mapDefinitionId, segmentDefinitionIds }) => ({
      mapDefinitionId,
      segmentDefinitionIds,
    })),
    modeDefinitions: [
      { modeDefinitionId: `${prefix}.mode.duel`, kind: 'duel' },
      { modeDefinitionId: `${prefix}.mode.race`, kind: 'race' },
      { modeDefinitionId: `${prefix}.mode.survival`, kind: 'survival' },
    ],
    challengeDefinitions: [],
  };
}

function profile(prefix = 'catalog', revision = 0) {
  return {
    schemaVersion: 1,
    profileDefinitionId: 'arena-v2.learning-profile.candidate.v1',
    profileDefinitionContentVersion: 5,
    profileId: `${prefix}.profile.local`,
    revision,
    committedGrantIds: [],
    collections: { weaponDefinitionIds: [], mapDefinitionIds: [] },
    weaponMastery: [],
    mapSegmentMastery: [],
    modeRecords: [],
    challenges: [],
  };
}

function collectionContent(prefix = 'catalog') {
  const identities = catalogIdentities(prefix);
  const sourceContentHash = createDeterministicDataHash(
    { prefix, source: 'A6.5-test-content' },
    'A6.5 test source content',
  );
  const authority = Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    ownerId: 'p5-content' as const,
    weapons: Object.freeze([...identities.weaponDefinitionIds].reverse().map(
      (weaponDefinitionId, index) => Object.freeze({
        weaponDefinitionId,
        collectionOrder: index + 1,
        displayName: `Weapon ${index + 1}`,
        learningFocus: `Learning ${index + 1}`,
        coreVerb: 'control-space',
      }),
    )),
    maps: Object.freeze([...identities.maps].reverse().map((map, mapIndex) => Object.freeze({
      mapDefinitionId: map.mapDefinitionId,
      displayName: `Map ${mapIndex + 1}`,
      participantRange: '2–4人',
      segments: Object.freeze([...map.segmentDefinitionIds].reverse().map(
        (segmentDefinitionId, segmentIndex) => Object.freeze({
          segmentDefinitionId,
          ordinal: segmentIndex + 1,
          displayName: `Segment ${mapIndex + 1}-${segmentIndex + 1}`,
          learningFocus: 'Keep route control',
          segmentKind: 'route',
          survivalRole: 'shared',
        }),
      )),
    }))),
    sourceContentHash,
  });
  return Object.freeze({
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Information Collection Content Projection V1',
    ),
  });
}

function readyInput(options: Readonly<{
  prefix?: string;
  epochId?: string;
  tick?: number;
  revision?: number;
  eligibleWeaponDefinitionIds?: readonly string[] | null;
}> = {}) {
  const prefix = options.prefix ?? 'catalog';
  return {
    schemaVersion: 1,
    epochId: options.epochId ?? 'epoch-a',
    tick: options.tick ?? 0,
    locale: 'zh-CN',
    sourceState: 'ready',
    collectionContent: collectionContent(prefix),
    profileDefinition: profileDefinition(prefix),
    profile: profile(prefix, options.revision ?? 0),
    eligibleWeaponDefinitionIds: options.eligibleWeaponDefinitionIds ?? null,
    diagnosticCode: null,
    observedProfileSchemaVersion: 1,
    reducedMotion: false,
    muted: false,
    decorativeAssetState: 'ready',
  };
}

function nonReadyInput(
  sourceState: 'loading' | 'empty' | 'error' | 'future-profile',
  tick: number,
) {
  return {
    schemaVersion: 1,
    epochId: 'epoch-a',
    tick,
    locale: 'zh-CN',
    sourceState,
    collectionContent: collectionContent(),
    profileDefinition: null,
    profile: null,
    eligibleWeaponDefinitionIds: null,
    diagnosticCode: sourceState === 'empty'
      ? 'profile-empty'
      : sourceState === 'error'
        ? 'profile-read-failed'
        : sourceState === 'future-profile'
          ? 'unsupported-profile-version'
          : null,
    observedProfileSchemaVersion: sourceState === 'future-profile' ? 2 : null,
    reducedMotion: true,
    muted: true,
    decorativeAssetState: 'missing',
  };
}

describe('Arena V2 A6.5 Profile collection progress input adapter candidate V1', () => {
  it('projects a ready Profile into an A6.2-validated input without owning algorithms', () => {
    const adapter = new ArenaV2ProfileCollectionProgressInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    const output = adapter.consume(readyInput());
    expect(output).toMatchObject({
      schemaVersion: 1,
      epochId: 'epoch-a',
      tick: 0,
      sourceState: 'ready',
      profileIdentity: {
        profileSchemaVersion: 1,
        profileDefinitionId: 'arena-v2.learning-profile.candidate.v1',
        profileDefinitionContentVersion: 5,
        profileId: 'catalog.profile.local',
        profileRevision: 0,
      },
      nextGoalIdentity: {
        kind: 'collect-map',
        mapDefinitionId: 'catalog.map.0',
      },
    });
    expect(output.progressFacts?.weapons).toHaveLength(20);
    expect(output.progressFacts?.maps).toHaveLength(2);
    expect(output.progressFacts?.weapons[0]?.weaponDefinitionId).toBe('catalog.weapon.19');
    expect(output.progressFacts?.maps[0]?.mapDefinitionId).toBe('catalog.map.1');
    expect(output.progressFacts?.weaponJourney).toMatchObject({
      targetMainResearch: 2_400,
      weaponCount: 20,
      averageMatchMinutesAssumption: 5,
      estimateKind: 'capacity-hypothesis-not-player-promise',
    });
    expect(adapter.getInput()).toBe(output);
    expect(Object.isFrozen(output)).toBe(true);
  });

  it('accepts a same-shape dynamic replacement directory in a fresh epoch', () => {
    const adapter = new ArenaV2ProfileCollectionProgressInputAdapterCandidateV1({
      epochId: 'epoch-dynamic',
    });
    const output = adapter.consume(readyInput({
      prefix: 'replacement',
      epochId: 'epoch-dynamic',
    }));
    expect(output.progressFacts?.weapons[0]?.weaponDefinitionId).toBe('replacement.weapon.19');
    expect(output.progressFacts?.maps[0]?.mapDefinitionId).toBe('replacement.map.1');
    expect(output.nextGoalIdentity).toMatchObject({
      kind: 'collect-map',
      mapDefinitionId: 'replacement.map.0',
    });
  });

  it('keeps the full catalog visible while forwarding the active weapon scope to the unique goal', () => {
    const identities = catalogIdentities();
    const base = readyInput({
      revision: 1,
      eligibleWeaponDefinitionIds: [identities.weaponDefinitionIds[5]!],
    });
    const input = {
      ...base,
      profile: {
        ...base.profile,
        collections: {
          weaponDefinitionIds: [],
          mapDefinitionIds: identities.maps.map(({ mapDefinitionId }) => mapDefinitionId),
        },
        mapSegmentMastery: [{
          mapDefinitionId: identities.maps[0]!.mapDefinitionId,
          segmentDefinitionId: identities.maps[0]!.segmentDefinitionIds[0]!,
          completionEvidenceCount: 1,
          completedAtRevision: 1,
          bestRaceFinishTicks: null,
          bestSurvivalTicks: null,
        }],
        modeRecords: base.profileDefinition.modeDefinitions.map((mode) => ({
          modeDefinitionId: mode.modeDefinitionId,
          kind: mode.kind,
          playCount: 1,
          completionCount: 1,
          winCount: 0,
          completedAtRevision: 1,
          bestPerformanceTicks: mode.kind === 'survival' ? 900 : null,
        })),
      },
    };
    const output = new ArenaV2ProfileCollectionProgressInputAdapterCandidateV1({
      epochId: 'epoch-a',
    }).consume(input);

    expect(output.nextGoalIdentity).toMatchObject({
      kind: 'collect-weapon',
      weaponDefinitionId: 'catalog.weapon.05',
    });
    expect(output.progressFacts?.weapons).toHaveLength(20);
  });

  it('rejects empty, duplicate and catalog-external active weapon scopes', () => {
    const consume = (eligibleWeaponDefinitionIds: readonly string[]) => (
      new ArenaV2ProfileCollectionProgressInputAdapterCandidateV1({ epochId: 'epoch-a' })
        .consume({ ...readyInput(), eligibleWeaponDefinitionIds })
    );
    expect(() => consume([])).toThrow(/必须是非空数组或null/);
    expect(() => consume(['catalog.weapon.00', 'catalog.weapon.00'])).toThrow(/重复声明/);
    expect(() => consume(['catalog.weapon.external'])).toThrow(/不在P5收藏目录中/);
  });

  it('passes non-ready states without carrying stale Profile facts', () => {
    const adapter = new ArenaV2ProfileCollectionProgressInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    for (const [index, state] of (
      ['loading', 'empty', 'error', 'future-profile'] as const
    ).entries()) {
      const output = adapter.consume(nonReadyInput(state, index));
      expect(output.sourceState).toBe(state);
      expect(output.profileIdentity).toBeNull();
      expect(output.progressFacts).toBeNull();
      expect(output.nextGoalIdentity).toBeNull();
    }
    expect(() => new ArenaV2ProfileCollectionProgressInputAdapterCandidateV1({
      epochId: 'epoch-a',
    }).consume({
      ...nonReadyInput('loading', 0),
      profileDefinition: profileDefinition(),
      profile: profile(),
    })).toThrow(/不得夹带Profile事实/);
  });

  it('rejects future fields, accessors and thenables without invoking user code', () => {
    expect(() => new ArenaV2ProfileCollectionProgressInputAdapterCandidateV1({
      epochId: 'epoch-a',
    }).consume({ ...readyInput(), future: true })).toThrow(/不支持字段 future/);

    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    for (const [key, value] of Object.entries(readyInput())) {
      if (key === 'schemaVersion') continue;
      Object.defineProperty(hostile, key, { enumerable: true, value });
    }
    expect(() => new ArenaV2ProfileCollectionProgressInputAdapterCandidateV1({
      epochId: 'epoch-a',
    }).consume(hostile)).toThrow(/必须是可枚举数据字段/);
    expect(getterCalls).toBe(0);

    let thenCalls = 0;
    expect(() => new ArenaV2ProfileCollectionProgressInputAdapterCandidateV1({
      epochId: 'epoch-a',
    }).consume({
      ...readyInput(),
      then() {
        thenCalls += 1;
      },
    })).toThrow(/只能包含可序列化数据|不支持字段 then/);
    expect(thenCalls).toBe(0);
  });

  it('rejects recoverable input conflicts before changing the committed watermark', () => {
    const adapter = new ArenaV2ProfileCollectionProgressInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    const value = readyInput({ tick: 2 });
    const first = adapter.consume(value);
    expect(adapter.consume(value)).toBe(first);
    expect(() => adapter.consume({ ...value, locale: 'en-US' })).toThrow(/同tick输入携带冲突/);
    expect(adapter.state).toBe(ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_STATE_V1.ACTIVE);
    expect(adapter.getInput()).toBe(first);

    expect(() => adapter.consume(readyInput({ tick: 1 }))).toThrow(/tick回退/);
    expect(adapter.state).toBe(ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_STATE_V1.ACTIVE);
    expect(adapter.getInput()).toBe(first);

    expect(() => adapter.consume({ ...readyInput({ tick: 3 }), future: true }))
      .toThrow(/不支持字段 future/);
    expect(adapter.state).toBe(ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_STATE_V1.ACTIVE);
    expect(adapter.getInput()).toBe(first);
  });

  it('allows monotonic revisions but rejects same-revision, definition and content drift', () => {
    const advancing = new ArenaV2ProfileCollectionProgressInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    advancing.consume(readyInput({ tick: 1, revision: 1 }));
    expect(advancing.consume(readyInput({ tick: 2, revision: 2 })).profileIdentity)
      .toMatchObject({ profileRevision: 2 });

    const sameRevision = new ArenaV2ProfileCollectionProgressInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    sameRevision.consume(readyInput({ tick: 1, revision: 1 }));
    const conflicting = readyInput({ tick: 2, revision: 1 });
    conflicting.profile.committedGrantIds = ['grant.conflict'];
    expect(() => sameRevision.consume(conflicting)).toThrow(/相同Profile revision携带冲突事实/);

    const drift = new ArenaV2ProfileCollectionProgressInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    drift.consume(readyInput({ tick: 1 }));
    expect(() => drift.consume(readyInput({ prefix: 'replacement', tick: 2 }))).toThrow(
      /collectionContent身份漂移|Profile Definition内容漂移/,
    );
  });

  it('resets the epoch atomically and destroys idempotently', () => {
    const adapter = new ArenaV2ProfileCollectionProgressInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    adapter.consume(readyInput({ tick: 5 }));
    adapter.resetPresentationEpoch({ epochId: 'epoch-b' });
    expect(adapter.getInput()).toBeNull();
    expect(adapter.consume(readyInput({
      prefix: 'replacement',
      epochId: 'epoch-b',
      tick: 0,
    })).progressFacts?.weapons[0]?.weaponDefinitionId).toBe('replacement.weapon.19');
    adapter.destroy();
    adapter.destroy();
    expect(adapter.state).toBe(ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_STATE_V1.DESTROYED);
    expect(() => adapter.consume(readyInput({ epochId: 'epoch-b' }))).toThrow(/拒绝状态destroyed/);
    expect(ARENA_V2_PROFILE_COLLECTION_PROGRESS_INPUT_ADAPTER_CANDIDATE_V1).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      defaultSurfaceWired: false,
      inheritedUnreachableGoalKinds: [],
      inheritedUnreachableGoalReason: null,
      catalogCompleteReachable: true,
      catalogCompleteKindMeaning: 'resolved-learning-scope-complete',
      fullCatalogTerminalGoalId: 'catalog-complete',
      activeLearningCompletionGoalId: 'active-learning-complete',
      fullCatalogTerminalMeaning: 'free-challenge-or-record-refresh',
      eligibleWeaponScopeForwardedToUniqueGoalResolver: true,
      nullEligibleWeaponScopeMeansFullDefinition: true,
      fullCatalogProgressRemainsVisibleForActiveScope: true,
    });
  });
});
