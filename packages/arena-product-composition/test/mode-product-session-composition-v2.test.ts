import { describe, expect, it } from 'vitest';
import { MODE_PRODUCT_SESSION_V2_STATE } from '@number-strategy-jump/arena-product-session';
import { createModeProductSessionCompositionV2 } from '../src/index.js';

const MODE_ID = 'mode.duel.test.v1';

function profileDefinition() {
  return {
    schemaVersion: 1,
    id: 'profile.mode-composition.test.v1',
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
        mapIds: ['map.duel.test.v1'],
      },
      selection: { characterId: 'fighter-a', appearanceId: null },
      settings: { soundEnabled: true, reducedMotion: false, qualityProfile: 'auto' },
    },
  };
}

function options(onDestroy: () => void, override: Readonly<Record<string, unknown>> = {}) {
  return {
    modeDefinitionId: MODE_ID,
    modeKind: 'duel',
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
      destroy: onDestroy,
    },
    publicMatchInfo: {
      schemaVersion: 2,
      modeDefinitionId: MODE_ID,
      matchSeed: 7,
      localParticipantId: 'p1',
      content: {
        schemaVersion: 2,
        modeDefinitionId: MODE_ID,
        contentDefinitionId: 'content.duel.test.v1',
        contentVersion: 1,
        characterDefinitionIds: ['fighter-a', 'fighter-b'],
        equipmentDefinitionIds: ['hammer.collection.test'],
        mapDefinitionIds: ['map.duel.test.v1'],
        selectedMapDefinitionId: 'map.duel.test.v1',
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
    },
    authorityIdentity: {
      replaySchemaVersion: 6,
      ruleSchemaVersion: 6,
      physicsBackendVersion: 'lightweight-v3',
      configHash: 'deadbeef',
      ruleContentHash: 'c0ffee00',
      finalHash: '1234abcd',
    },
    progressionRegistry: {
      rewards: [{
        schemaVersion: 2,
        id: 'reward.duel.test.v2',
        contentVersion: 1,
        modeDefinitionId: MODE_ID,
        completionExperience: 10,
        policy: { kind: 'duel', winnerBonusExperience: 5, drawBonusExperience: 2 },
      }],
      unlocks: [],
    },
    profileDefinition: profileDefinition(),
    profileService: {
      getSnapshot() { return profileDefinition().defaults; },
      commitProgressionGrant() { throw new Error('not reached'); },
    },
    recipientParticipantId: 'p1',
    ...override,
  };
}

describe('P2.5 mode Product composition V2 candidate', () => {
  it('creates one explicit production-unreachable Product Session', () => {
    let destroyed = 0;
    const session = createModeProductSessionCompositionV2(options(() => { destroyed += 1; }));
    expect(session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.CREATED);
    session.destroy();
    expect(destroyed).toBe(1);
  });

  it('leaves the supplied match with its caller when downstream construction fails', () => {
    let destroyed = 0;
    expect(() => createModeProductSessionCompositionV2(options(
      () => { destroyed += 1; },
      { progressionRegistry: { rewards: [], unlocks: [], future: true } },
    ))).toThrow(/future/);
    expect(destroyed).toBe(0);
  });

  it('does not invoke or coerce caller-owned hostile match cleanup on construction failure', () => {
    let coercions = 0;
    const hostile = Object.defineProperty(Object.create(null), Symbol.toPrimitive, {
      value() {
        coercions += 1;
        throw new Error('must-not-coerce');
      },
    });
    expect(() => createModeProductSessionCompositionV2(options(
      () => { throw hostile; },
      { progressionRegistry: { rewards: [], unlocks: [], future: true } },
    ))).toThrow(/future/);
    expect(coercions).toBe(0);
  });

  it('rejects reward recipients that are not the explicit local participant', () => {
    expect(() => createModeProductSessionCompositionV2(options(
      () => {},
      { recipientParticipantId: 'p2' },
    ))).toThrow(/本地participant/);
  });

  it('never executes caller-owned cleanup or its hostile then accessor on construction failure', () => {
    let thenCalls = 0;
    let destroys = 0;
    expect(() => createModeProductSessionCompositionV2(options(
      () => {
        destroys += 1;
        return Object.defineProperty(Object.create(null), 'then', {
          get() {
            thenCalls += 1;
            throw new Error('must-not-run');
          },
        });
      },
      { progressionRegistry: { rewards: [], unlocks: [], future: true } },
    ))).toThrow(/future/);
    expect(destroys).toBe(0);
    expect(thenCalls).toBe(0);
  });
});
