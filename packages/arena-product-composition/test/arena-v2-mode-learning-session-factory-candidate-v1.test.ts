import { describe, expect, it } from 'vitest';
import {
  createFinalizedMatchAssignmentV2,
  createMatchContentSelectionV2,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2ProductAuthorityRegistryCandidateV1,
} from '@number-strategy-jump/arena-product-match';
import {
  ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
} from '../src/arena-v2-learning-evidence-composition-candidate-v1.js';
import {
  ARENA_V2_MODE_LEARNING_SESSION_FACTORY_CANDIDATE_V1,
  ArenaV2ModeLearningSessionFactoryCandidateV1,
} from '../src/arena-v2-mode-learning-session-factory-candidate-v1.js';
import {
  ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import { ArenaV2LearningProfileRepositoryV1 } from '@number-strategy-jump/arena-profile-persistence';
import { ArenaV2LearningProfileServiceV1 } from '@number-strategy-jump/arena-profile-service';

const MODE_ID = 'mode.duel.factory.test.v1';

function rewardProfileDefinition() {
  return {
    schemaVersion: 1,
    id: 'profile.mode-learning-factory.test.v1',
    contentVersion: 1,
    currentProfileSchemaVersion: 1,
    limits: {
      maxUnlockedPerKind: 16,
      maxCommittedGrantIds: 16,
      maxExperience: 1_000,
      maxIdentifierLength: 80,
    },
    defaults: {
      profileId: 'local-player',
      progression: { experience: 0, committedGrantIds: [] },
      unlocks: {
        characterIds: ['fighter-a'],
        appearanceIds: [],
        equipmentIds: [],
        mapIds: ['map.duel.factory.test.v1'],
      },
      selection: { characterId: 'fighter-a', appearanceId: null },
      settings: { soundEnabled: true, reducedMotion: false, qualityProfile: 'auto' },
    },
  };
}

function learningService() {
  const values = new Map<string, unknown>();
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  const repository = new ArenaV2LearningProfileRepositoryV1({
    definition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
    storage: {
      storageRead(key: string) {
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        values.set(key, clone(value));
        return true;
      },
      storageDelete(key: string) {
        values.delete(key);
        return true;
      },
    },
    ownerId: 'owner.mode-learning-factory.test',
    wallNow: () => 1_000,
    keyPrefix: 'arena.mode-learning-factory.test',
  });
  return new ArenaV2LearningProfileServiceV1({
    definition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
    repository,
  });
}

function publicMatchInfo(
  modeDefinitionId = MODE_ID,
  localParticipantId = 'p1',
  contentDefinitionId = 'content.duel.factory.test.v1',
) {
  return {
    schemaVersion: 2,
    modeDefinitionId,
    matchSeed: 7,
    localParticipantId,
    content: {
      schemaVersion: 2,
      modeDefinitionId,
      contentDefinitionId,
      contentVersion: 1,
      characterDefinitionIds: ['fighter-a', 'fighter-b'],
      equipmentDefinitionIds: ['hammer.collection.test'],
      mapDefinitionIds: ['map.duel.factory.test.v1'],
      selectedMapDefinitionId: 'map.duel.factory.test.v1',
      participantCharacters: [
        { participantId: 'p1', definitionId: 'fighter-a' },
        { participantId: 'p2', definitionId: 'fighter-b' },
      ],
    },
    participantAssignments: [
      {
        participantId: 'p1', modeRole: 'competitor', teamId: null,
        slotId: null, slotGeneration: 0,
      },
      {
        participantId: 'p2', modeRole: 'competitor', teamId: null,
        slotId: null, slotGeneration: 0,
      },
    ],
    publicParticipants: [
      {
        participantId: 'p1', displayName: 'Player 1', portraitKey: 'portrait.1',
        appearanceKey: 'appearance.1', identityOrdinal: 1,
        identityGlyphKey: 'glyph.1', identityPatternKey: 'pattern.1',
      },
      {
        participantId: 'p2', displayName: 'Player 2', portraitKey: 'portrait.2',
        appearanceKey: 'appearance.2', identityOrdinal: 2,
        identityGlyphKey: 'glyph.2', identityPatternKey: 'pattern.2',
      },
    ],
  };
}

function authorityRegistry() {
  return new ArenaV2ProductAuthorityRegistryCandidateV1({
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    modeRegistryContentHash: 'a1b2c3d4',
    authorities: [
      {
        modeKind: 'duel',
        modeDefinitionId: MODE_ID,
        replaySchemaVersion: 6,
        ruleSchemaVersion: 6,
        physicsBackendVersion: 'lightweight-v3',
      },
      {
        modeKind: 'race',
        modeDefinitionId: 'mode.race.factory.test.v1',
        replaySchemaVersion: 6,
        ruleSchemaVersion: 6,
        physicsBackendVersion: 'lightweight-v3',
      },
      {
        modeKind: 'survival',
        modeDefinitionId: 'mode.survival.factory.test.v1',
        replaySchemaVersion: 6,
        ruleSchemaVersion: 6,
        physicsBackendVersion: 'lightweight-v3',
      },
    ],
  });
}

function authorityAdmission(
  registry: ArenaV2ProductAuthorityRegistryCandidateV1,
  version: 1 | 2,
  info: ReturnType<typeof publicMatchInfo>,
) {
  const content = createMatchContentSelectionV2(info.content);
  const finalAssignment = createFinalizedMatchAssignmentV2({
    schemaVersion: 2,
    modeDefinitionId: MODE_ID,
    contentHash: content.contentHash,
    participants: [
      {
        participantId: 'p1',
        modeRole: 'competitor',
        teamId: null,
        controllerKind: 'human',
        characterDefinitionId: 'fighter-a',
        slotId: null,
        slotGeneration: 0,
      },
      {
        participantId: 'p2',
        modeRole: 'competitor',
        teamId: null,
        controllerKind: 'bot',
        characterDefinitionId: 'fighter-b',
        slotId: null,
        slotGeneration: 0,
      },
    ],
  });
  const request = {
    modeKind: 'duel' as const,
    modeDefinitionId: MODE_ID,
    matchSeed: info.matchSeed,
    content,
    finalAssignment,
  };
  return version === 1
    ? registry.admitMatch(request)
    : registry.admitMatchV2({ ...request, modeDriverContentHash: 'a001a001' });
}

function factoryHarness(overrides: Readonly<{
  bundleModeKind?: 'duel' | 'race' | 'survival';
  publicModeDefinitionId?: string;
  publicLocalParticipantId?: string;
  bundleFuture?: boolean;
  authorityAdmissionVersion?: 1 | 2;
}> = {}) {
  const service = learningService();
  let destroys = 0;
  let bundleCalls = 0;
  const factory = new ArenaV2ModeLearningSessionFactoryCandidateV1({
    matchBundleFactory: {
      createMatchBundle(request: Readonly<{
        schemaVersion: 1;
        generation: number;
        modeKind: 'duel' | 'race' | 'survival';
      }>) {
        bundleCalls += 1;
        const registry = overrides.authorityAdmissionVersion === undefined
          ? null
          : authorityRegistry();
        const info = publicMatchInfo(
          overrides.publicModeDefinitionId,
          overrides.publicLocalParticipantId,
          registry === null
            ? 'content.duel.factory.test.v1'
            : 'content.duel.factory.test.v1.mode-registry-a1b2c3d4',
        );
        return {
          schemaVersion: 1,
          generation: request.generation,
          modeKind: overrides.bundleModeKind ?? request.modeKind,
          modeDefinitionId: MODE_ID,
          matchSession: {
            start() {
              return {
                readFrame: {},
                readFrameAudit: { activeSupplyProjection: null },
                supplyCadence: null,
                localJumpAvailability: { state: 'ready' },
              };
            },
            step() {
              return {
                events: [],
                supplyFacts: [],
                supplyCadence: null,
                readFrame: {},
                readFrameAudit: { activeSupplyProjection: null },
                inputs: [],
                weaponFeedbackDirectionFactsV2: [],
                localJumpAvailability: { state: 'blocked' },
                result: null,
              };
            },
            pause() {},
            resume() {},
            destroy() { destroys += 1; },
          },
          publicMatchInfo: info,
          authorityIdentity: {
            replaySchemaVersion: 6,
            ruleSchemaVersion: 6,
            physicsBackendVersion: 'lightweight-v3',
            configHash: 'deadbeef',
            ruleContentHash: 'c0ffee00',
            finalHash: '1234abcd',
          },
          authorityRegistry: registry,
          authorityAdmission: registry === null
            ? null
            : authorityAdmission(registry, overrides.authorityAdmissionVersion!, info),
          recipientParticipantId: 'p1',
          ...(overrides.bundleFuture === true ? { future: true } : {}),
        };
      },
    },
    progressionRegistry: {
      rewards: [{
        schemaVersion: 2,
        id: 'reward.duel.factory.test.v2',
        contentVersion: 1,
        modeDefinitionId: MODE_ID,
        completionExperience: 10,
        policy: { kind: 'duel', winnerBonusExperience: 5, drawBonusExperience: 2 },
      }],
      unlocks: [],
    },
    rewardProfileDefinition: rewardProfileDefinition(),
    rewardProfileService: {
      getSnapshot() { return rewardProfileDefinition().defaults; },
      commitProgressionGrant() { throw new Error('not reached'); },
    },
    learningProfileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
    learningEvidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
    learningProfileService: service,
    maxEventCount: 10_000,
  });
  return {
    factory,
    service,
    bundleCalls: () => bundleCalls,
    destroys: () => destroys,
  };
}

describe('Arena V2 Mode/Learning Session factory candidate V1', () => {
  it('creates one generation-scoped bridge from the real Mode and Learning compositions', () => {
    const value = factoryHarness();
    const session = value.factory.createSession({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    });
    expect(session.getSnapshot()).toMatchObject({
      state: 'created', sessionState: 'created', learningHandoffState: 'collecting',
    });
    expect(session.start()).toMatchObject({
      readFrame: {},
      supplyCadence: null,
      localJumpAvailability: { state: 'ready' },
    });
    expect(session.getSnapshot()).toMatchObject({ state: 'running', sessionState: 'running' });
    session.destroy();
    expect(value.destroys()).toBe(1);
    value.service.destroy();
    expect(ARENA_V2_MODE_LEARNING_SESSION_FACTORY_CANDIDATE_V1).toMatchObject({
      status: 'production-unreachable', hardGate: false,
      defaultCompositionWired: false, defaultNavigationWired: false,
      supportedModeKinds: ['duel', 'race', 'survival'],
      registeredAuthorityAdmissionVersion: 2,
      registeredAuthorityAdmissionValidatedBeforeMatchTransfer: true,
      validationStatus: 'not-run',
    });
  });

  it('rejects a mode-drifted bundle and destroys its Match owner once', () => {
    const value = factoryHarness({ bundleModeKind: 'race' });
    expect(() => value.factory.createSession({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    })).toThrow(/modeKind漂移/);
    expect(value.destroys()).toBe(1);
    value.service.destroy();
  });

  it('rejects public identity drift before transferring Match ownership', () => {
    const value = factoryHarness({ publicLocalParticipantId: 'p2' });
    expect(() => value.factory.createSession({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    })).toThrow(/recipient/);
    expect(value.destroys()).toBe(1);
    value.service.destroy();
  });

  it('rejects registered Admission V1 before Match ownership transfer', () => {
    const value = factoryHarness({ authorityAdmissionVersion: 1 });
    expect(() => value.factory.createSession({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    })).toThrow(/Admission V2|schemaVersion必须是2/u);
    expect(value.destroys()).toBe(1);
    value.service.destroy();
  });

  it('accepts registered Admission V2 before creating the formal bridge', () => {
    const value = factoryHarness({ authorityAdmissionVersion: 2 });
    const session = value.factory.createSession({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    });
    expect(session.getSnapshot()).toMatchObject({ state: 'created' });
    session.destroy();
    expect(value.destroys()).toBe(1);
    value.service.destroy();
  });

  it('cleans the captured Match owner when a future bundle field is rejected', () => {
    const value = factoryHarness({ bundleFuture: true });
    expect(() => value.factory.createSession({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    })).toThrow(/future|字段|不受支持/);
    expect(value.destroys()).toBe(1);
    value.service.destroy();
  });

  it('rejects stale generations and future request fields before bundle creation', () => {
    const value = factoryHarness();
    expect(() => value.factory.createSession({
      schemaVersion: 1,
      generation: 2,
      modeKind: 'duel',
    })).toThrow(/generation漂移/);
    expect(() => value.factory.createSession({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
      future: true,
    })).toThrow(/future|字段|不受支持/);
    expect(value.bundleCalls()).toBe(0);
    expect(value.destroys()).toBe(0);
    value.service.destroy();
  });
});
