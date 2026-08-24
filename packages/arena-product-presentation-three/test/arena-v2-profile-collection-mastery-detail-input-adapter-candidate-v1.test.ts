import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_PROFILE_COLLECTION_MASTERY_DETAIL_INPUT_ADAPTER_CANDIDATE_V1,
  ARENA_V2_PROFILE_COLLECTION_MASTERY_DETAIL_INPUT_ADAPTER_STATE_V1,
  ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1,
} from '../src/arena-v2-profile-collection-mastery-detail-input-adapter-candidate-v1.js';

const WEAPON_CONTEXTS = Object.freeze([
  'ground', 'aerial', 'edge', 'duel-counterplay', 'survival',
] as const);
const WEAPON_FIELDS = Object.freeze([
  'range-coverage', 'timing-risk', 'ground-aerial', 'counter-inputs', 'map-consequences',
] as const);
const MAP_FIELDS = Object.freeze([
  'route-goal', 'hazard-summary', 'full-route', 'weapon-consequences',
] as const);

function catalog(prefix = 'catalog') {
  const weaponDefinitionIds = Array.from(
    { length: 20 },
    (_, index) => `${prefix}.weapon.${String(index).padStart(2, '0')}`,
  );
  const maps = Array.from({ length: 2 }, (_, mapIndex) => ({
    mapDefinitionId: `${prefix}.map.${mapIndex}`,
    segmentDefinitionIds: Array.from(
      { length: 10 },
      (_, segmentIndex) => `${prefix}.map.${mapIndex}.segment.${segmentIndex}`,
    ),
  }));
  return { weaponDefinitionIds, maps };
}

function profileDefinition(prefix = 'catalog') {
  const identities = catalog(prefix);
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
    mapDefinitions: identities.maps,
    modeDefinitions: [
      { modeDefinitionId: `${prefix}.mode.duel`, kind: 'duel' },
      { modeDefinitionId: `${prefix}.mode.race`, kind: 'race' },
      { modeDefinitionId: `${prefix}.mode.survival`, kind: 'survival' },
    ],
    challengeDefinitions: [],
  };
}

function profile(prefix = 'catalog', revision = 7, withRecords = true) {
  const identities = catalog(prefix);
  return {
    schemaVersion: 1,
    profileDefinitionId: 'arena-v2.learning-profile.candidate.v1',
    profileDefinitionContentVersion: 5,
    profileId: `${prefix}.profile.local`,
    revision,
    committedGrantIds: [] as string[],
    collections: {
      weaponDefinitionIds: withRecords ? [identities.weaponDefinitionIds[0]!] : [],
      mapDefinitionIds: withRecords ? [identities.maps[0]!.mapDefinitionId] : [],
    },
    weaponMastery: withRecords ? [{
      weaponDefinitionId: identities.weaponDefinitionIds[0]!,
      useCount: 9,
      contexts: WEAPON_CONTEXTS.map((context, index) => ({
        context,
        evidenceCount: index < 2 ? 1 : 0,
        completedAtRevision: index < 2 ? index + 1 : null,
      })),
    }] : [],
    mapSegmentMastery: withRecords
      ? identities.maps[0]!.segmentDefinitionIds.slice(0, 2).map(
        (segmentDefinitionId, index) => ({
          mapDefinitionId: identities.maps[0]!.mapDefinitionId,
          segmentDefinitionId,
          completionEvidenceCount: 1,
          completedAtRevision: index < 2 ? index + 1 : null,
          bestRaceFinishTicks: null,
          bestSurvivalTicks: null,
        }),
      )
      : [],
    modeRecords: [],
    challenges: [],
  };
}

function collectionContent(prefix = 'catalog') {
  const identities = catalog(prefix);
  const sourceContentHash = createDeterministicDataHash(
    { prefix, source: 'A6.7-test-content' },
    'A6.7 test source content',
  );
  const authority = {
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    ownerId: 'p5-content',
    weapons: [...identities.weaponDefinitionIds].reverse().map(
      (weaponDefinitionId, index) => ({
        weaponDefinitionId,
        collectionOrder: index + 1,
        displayName: `Weapon ${index + 1}`,
        learningFocus: `Learning ${index + 1}`,
        coreVerb: 'control-space',
      }),
    ),
    maps: [...identities.maps].reverse().map((map, mapIndex) => ({
      mapDefinitionId: map.mapDefinitionId,
      displayName: `Map ${mapIndex + 1}`,
      participantRange: '2–4人',
      segments: map.segmentDefinitionIds.map(
        (segmentDefinitionId, segmentIndex) => ({
          segmentDefinitionId,
          ordinal: segmentIndex + 1,
          displayName: `Segment ${mapIndex + 1}-${segmentIndex + 1}`,
          learningFocus: 'Keep route control',
          segmentKind: 'route',
          survivalRole: 'shared',
        }),
      ),
    })),
    sourceContentHash,
  };
  return {
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Information Collection Content Projection V1',
    ),
  };
}

function progressInput(options: Readonly<{
  prefix?: string;
  epochId?: string;
  tick?: number;
  revision?: number;
  withRecords?: boolean;
  sourceState?: 'ready' | 'loading' | 'empty' | 'error' | 'future-profile';
}> = {}) {
  const prefix = options.prefix ?? 'catalog';
  const sourceState = options.sourceState ?? 'ready';
  const ready = sourceState === 'ready';
  return {
    schemaVersion: 1,
    epochId: options.epochId ?? 'epoch-a',
    tick: options.tick ?? 0,
    locale: 'zh-CN',
    sourceState,
    collectionContent: collectionContent(prefix),
    profileDefinition: ready ? profileDefinition(prefix) : null,
    profile: ready ? profile(prefix, options.revision ?? 7, options.withRecords ?? true) : null,
    eligibleWeaponDefinitionIds: null,
    diagnosticCode: sourceState === 'empty'
      ? 'profile-empty'
      : sourceState === 'error'
        ? 'profile-read-failed'
        : sourceState === 'future-profile'
          ? 'unsupported-profile-version'
          : null,
    observedProfileSchemaVersion: sourceState === 'future-profile' ? 2 : ready ? 1 : null,
    reducedMotion: false,
    muted: false,
    decorativeAssetState: 'ready',
  };
}

function selection(
  kind: 'weapon' | 'map',
  prefix = 'catalog',
  alternate = false,
) {
  const identities = catalog(prefix);
  const targetDefinitionId = kind === 'weapon'
    ? identities.weaponDefinitionIds[alternate ? 1 : 0]!
    : identities.maps[alternate ? 1 : 0]!.mapDefinitionId;
  return {
    kind,
    screenId: `${kind}-detail`,
    targetDefinitionId,
  };
}

function p5DetailContent(
  selected: ReturnType<typeof selection>,
  sourceContentHash: string,
) {
  const fieldIds = selected.kind === 'weapon' ? WEAPON_FIELDS : MAP_FIELDS;
  const authority = {
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    ownerId: 'p5-content',
    screenId: selected.screenId,
    targetDefinitionId: selected.targetDefinitionId,
    sourceContentHash,
    fieldValues: fieldIds.map((fieldId) => ({
      fieldId,
      labelMessageId: `a6.7.field.${fieldId}`,
      valueText: `value:${fieldId}`,
      accessibilityText: `accessible:${fieldId}`,
      fixedWidthNumeric: fieldId === 'timing-risk' || fieldId === 'route-goal',
    })),
  };
  return {
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 A6.3 P5 Detail Content Envelope V1',
    ),
  };
}

function existingSelectionAction(selected: ReturnType<typeof selection>) {
  return {
    intentId: selected.kind === 'weapon'
      ? 'use-selected-weapon-next-match'
      : 'use-selected-map-next-match',
    labelMessageId: selected.kind === 'weapon'
      ? 'arena.v2.action.use-weapon-next-match'
      : 'arena.v2.action.use-map-next-match',
    labelText: '下局使用',
    accessibilityText: `下局使用${selected.targetDefinitionId}`,
    targetDefinitionId: selected.targetDefinitionId,
    enabled: true,
    disabledReason: null,
  };
}

function adapterInput(options: Readonly<{
  prefix?: string;
  epochId?: string;
  tick?: number;
  revision?: number;
  withRecords?: boolean;
  sourceState?: 'ready' | 'loading' | 'empty' | 'error' | 'future-profile';
  kind?: 'weapon' | 'map';
  alternate?: boolean;
}> = {}) {
  const rawProgressInput = progressInput(options);
  const selected = selection(
    options.kind ?? 'weapon',
    options.prefix ?? 'catalog',
    options.alternate ?? false,
  );
  return {
    schemaVersion: 1,
    profileCollectionProgressInput: rawProgressInput,
    selection: selected,
    p5DetailContent: p5DetailContent(
      selected,
      rawProgressInput.collectionContent.sourceContentHash,
    ),
    existingSelectionAction: existingSelectionAction(selected),
  };
}

describe('Arena V2 A6.7 Profile collection mastery detail input adapter candidate V1', () => {
  it('projects five weapon contexts and ordered map segments through P6 into A6.3 input', () => {
    const adapter = new ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    const weapon = adapter.consume(adapterInput({ tick: 0, kind: 'weapon' }));
    expect(weapon.detailProgressFacts).toMatchObject({
      kind: 'weapon',
      profileRevision: 7,
      useCount: 9,
      contexts: [
        { context: 'ground', evidenceCount: 1, completedAtRevision: 1 },
        { context: 'aerial', evidenceCount: 1, completedAtRevision: 2 },
        { context: 'edge', evidenceCount: 0, completedAtRevision: null },
        { context: 'duel-counterplay', evidenceCount: 0, completedAtRevision: null },
        { context: 'survival', evidenceCount: 0, completedAtRevision: null },
      ],
    });
    const map = adapter.consume(adapterInput({ tick: 1, kind: 'map' }));
    expect(map.detailProgressFacts?.kind).toBe('map');
    if (map.detailProgressFacts?.kind === 'map') {
      expect(map.detailProgressFacts.segments.map(({ segmentDefinitionId }) => segmentDefinitionId))
        .toEqual(catalog().maps[0]!.segmentDefinitionIds);
      expect(map.detailProgressFacts.segments.filter(({ completedAtRevision }) => (
        completedAtRevision !== null
      ))).toHaveLength(2);
    }
  });

  it('emits legal zero detail facts instead of guessing completion', () => {
    const adapter = new ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    const weapon = adapter.consume(adapterInput({
      tick: 0,
      kind: 'weapon',
      alternate: true,
      withRecords: false,
    }));
    expect(weapon.detailProgressFacts).toMatchObject({
      kind: 'weapon',
      useCount: 0,
      contexts: WEAPON_CONTEXTS.map((context) => ({
        context,
        evidenceCount: 0,
        completedAtRevision: null,
      })),
    });
  });

  it('passes non-ready states with null detail facts and no Profile facts', () => {
    const adapter = new ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    for (const [tick, sourceState] of (
      ['loading', 'empty', 'error', 'future-profile'] as const
    ).entries()) {
      const output = adapter.consume(adapterInput({ tick, sourceState }));
      expect(output.collectionProgressInput.sourceState).toBe(sourceState);
      expect(output.collectionProgressInput.profileIdentity).toBeNull();
      expect(output.detailProgressFacts).toBeNull();
    }
  });

  it('uses dynamic replacement content and permits higher-tick A to B to A browsing', () => {
    const adapter = new ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1({
      epochId: 'epoch-replacement',
    });
    const firstA = adapter.consume(adapterInput({
      prefix: 'replacement', epochId: 'epoch-replacement', tick: 0, kind: 'weapon',
    }));
    const b = adapter.consume(adapterInput({
      prefix: 'replacement', epochId: 'epoch-replacement', tick: 1_000_000, kind: 'map',
    }));
    const secondA = adapter.consume(adapterInput({
      prefix: 'replacement', epochId: 'epoch-replacement', tick: 1_000_001, kind: 'weapon',
    }));
    expect(firstA.selection.targetDefinitionId).toBe('replacement.weapon.00');
    expect(b.selection.targetDefinitionId).toBe('replacement.map.0');
    expect(secondA.selection).toEqual(firstA.selection);
    expect(secondA.detailProgressFacts).toEqual(firstA.detailProgressFacts);
  });

  it('rejects recoverable contracts without replacing the last valid output', () => {
    const adapter = new ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    const valid = adapterInput({ tick: 2 });
    const output = adapter.consume(valid);
    expect(adapter.consume(valid)).toBe(output);

    const conflict = adapterInput({ tick: 2 });
    conflict.existingSelectionAction.labelText = '冲突动作';
    expect(() => adapter.consume(conflict)).toThrow(/同tick输入携带冲突/);
    expect(() => adapter.consume(adapterInput({ tick: 1 }))).toThrow(/tick回退/);
    expect(() => adapter.consume({ ...adapterInput({ tick: 3 }), future: true }))
      .toThrow(/不支持字段 future/);
    expect(adapter.state).toBe(
      ARENA_V2_PROFILE_COLLECTION_MASTERY_DETAIL_INPUT_ADAPTER_STATE_V1.ACTIVE,
    );
    expect(adapter.getInput()).toBe(output);
  });

  it('rejects summary/detail contradictions through the formal Profile validator', () => {
    const value = adapterInput({ tick: 0 });
    const profileValue = value.profileCollectionProgressInput.profile;
    if (profileValue === null) throw new Error('test fixture requires ready Profile');
    profileValue.weaponMastery[0]!.contexts[0]!.evidenceCount = 0;
    expect(() => new ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1({
      epochId: 'epoch-a',
    }).consume(value)).toThrow(/完成状态不一致|完成revision|Profile/);
  });

  it('rejects content, Definition, Profile identity and revision drift', () => {
    const contentDrift = new ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    contentDrift.consume(adapterInput({ tick: 0 }));
    expect(() => contentDrift.consume(adapterInput({
      prefix: 'replacement', tick: 1,
    }))).toThrow(/collectionContent身份漂移|Definition内容漂移/);

    const detailDrift = new ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    detailDrift.consume(adapterInput({ tick: 0 }));
    const changedDetail = adapterInput({ tick: 1 });
    changedDetail.p5DetailContent.fieldValues[0]!.valueText = 'changed detail content';
    changedDetail.p5DetailContent.contentHash = createDeterministicDataHash({
      schemaVersion: changedDetail.p5DetailContent.schemaVersion,
      status: changedDetail.p5DetailContent.status,
      hardGate: changedDetail.p5DetailContent.hardGate,
      defaultSurfaceWired: changedDetail.p5DetailContent.defaultSurfaceWired,
      ownerId: changedDetail.p5DetailContent.ownerId,
      screenId: changedDetail.p5DetailContent.screenId,
      targetDefinitionId: changedDetail.p5DetailContent.targetDefinitionId,
      sourceContentHash: changedDetail.p5DetailContent.sourceContentHash,
      fieldValues: changedDetail.p5DetailContent.fieldValues,
    }, 'Arena V2 A6.3 P5 Detail Content Envelope V1');
    expect(() => detailDrift.consume(changedDetail)).toThrow(/detail content身份漂移/);

    const definitionDrift = new ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    definitionDrift.consume(adapterInput({ tick: 0 }));
    const changedDefinition = adapterInput({ tick: 1 });
    const definition = changedDefinition.profileCollectionProgressInput.profileDefinition;
    if (definition === null) throw new Error('test fixture requires ready Definition');
    definition.limits.maxCounterValue += 1;
    expect(() => definitionDrift.consume(changedDefinition)).toThrow(/Definition内容漂移/);

    const profileDrift = new ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    profileDrift.consume(adapterInput({ tick: 0 }));
    const changedProfile = adapterInput({ tick: 1 });
    const profileValue = changedProfile.profileCollectionProgressInput.profile;
    if (profileValue === null) throw new Error('test fixture requires ready Profile');
    profileValue.profileId = 'other.profile';
    expect(() => profileDrift.consume(changedProfile)).toThrow(/Profile身份漂移/);

    const sameRevision = new ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    sameRevision.consume(adapterInput({ tick: 0, revision: 7 }));
    const changedSameRevision = adapterInput({ tick: 1, revision: 7 });
    const sameRevisionProfile = changedSameRevision.profileCollectionProgressInput.profile;
    if (sameRevisionProfile === null) throw new Error('test fixture requires ready Profile');
    sameRevisionProfile.committedGrantIds = ['grant.same-revision-drift'];
    expect(() => sameRevision.consume(changedSameRevision))
      .toThrow(/相同Profile revision携带冲突事实/);

    const revision = new ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    revision.consume(adapterInput({ tick: 0, revision: 7 }));
    expect(() => revision.consume(adapterInput({ tick: 1, revision: 6 })))
      .toThrow(/revision回退/);
  });

  it('rejects accessors and thenables without execution', () => {
    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    for (const [key, value] of Object.entries(adapterInput())) {
      if (key === 'schemaVersion') continue;
      Object.defineProperty(hostile, key, { enumerable: true, value });
    }
    expect(() => new ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1({
      epochId: 'epoch-a',
    }).consume(hostile)).toThrow(/必须是可枚举数据字段/);
    expect(getterCalls).toBe(0);

    let thenCalls = 0;
    expect(() => new ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1({
      epochId: 'epoch-a',
    }).consume({
      ...adapterInput(),
      then() {
        thenCalls += 1;
      },
    })).toThrow(/只能包含可序列化数据|不支持字段 then/);
    expect(thenCalls).toBe(0);
  });

  it('resets the epoch and destroys idempotently without wiring a default surface', () => {
    const adapter = new ArenaV2ProfileCollectionMasteryDetailInputAdapterCandidateV1({
      epochId: 'epoch-a',
    });
    adapter.consume(adapterInput({ tick: 5 }));
    adapter.resetPresentationEpoch({ epochId: 'epoch-b' });
    expect(adapter.getInput()).toBeNull();
    expect(adapter.consume(adapterInput({ epochId: 'epoch-b', tick: 0 })).selection.kind)
      .toBe('weapon');
    adapter.destroy();
    adapter.destroy();
    expect(adapter.state).toBe(
      ARENA_V2_PROFILE_COLLECTION_MASTERY_DETAIL_INPUT_ADAPTER_STATE_V1.DESTROYED,
    );
    expect(() => adapter.getInput()).toThrow(/拒绝状态destroyed/);
    expect(ARENA_V2_PROFILE_COLLECTION_MASTERY_DETAIL_INPUT_ADAPTER_CANDIDATE_V1)
      .toMatchObject({
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
      });
  });
});
