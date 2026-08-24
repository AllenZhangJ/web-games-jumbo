import { describe, expect, it } from 'vitest';
import { createMatchContentSelectionV2 } from '@number-strategy-jump/arena-contracts';
import {
  createProductMatchResultV3,
  createProductPublicMatchInfoV2,
  validateProductMatchResultV3,
} from '../src/index.js';

function content() {
  return createMatchContentSelectionV2({
    schemaVersion: 2,
    modeDefinitionId: 'mode.duel.test.v1',
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
  });
}

function assignments() {
  return [
    { participantId: 'p1', modeRole: 'competitor', teamId: null, slotId: null, slotGeneration: 0 },
    { participantId: 'p2', modeRole: 'competitor', teamId: null, slotId: null, slotGeneration: 0 },
  ];
}

function publicParticipants() {
  return [
    {
      participantId: 'p1',
      displayName: 'Player 1',
      portraitKey: 'portrait.p1',
      appearanceKey: 'appearance.p1',
      identityOrdinal: 1,
      identityGlyphKey: 'glyph.1',
      identityPatternKey: 'pattern.1',
    },
    {
      participantId: 'p2',
      displayName: 'Player 2',
      portraitKey: 'portrait.p2',
      appearanceKey: 'appearance.p2',
      identityOrdinal: 2,
      identityGlyphKey: 'glyph.2',
      identityPatternKey: 'pattern.2',
    },
  ];
}

function createOptions() {
  return {
    schemaVersion: 3,
    modeDefinitionId: 'mode.duel.test.v1',
    matchSeed: 7,
    authorityIdentity: {
      replaySchemaVersion: 6,
      ruleSchemaVersion: 6,
      physicsBackendVersion: 'lightweight-v3',
      configHash: 'deadbeef',
      ruleContentHash: 'c0ffee00',
      finalHash: '1234abcd',
    },
    content: content(),
    participantAssignments: assignments(),
    participantEquipmentUsage: [
      { participantId: 'p1', usedCollectionEquipmentDefinitionIds: ['hammer.collection.test'] },
      { participantId: 'p2', usedCollectionEquipmentDefinitionIds: [] },
    ],
    modeResult: {
      kind: 'duel',
      winnerParticipantIds: ['p1'],
      isDraw: false,
      reason: 'last-participant-standing',
      endedAtTick: 300,
    },
    publicParticipants: publicParticipants(),
  };
}

describe('P2.1b Product Result V3 and PublicInfo V2 candidates', () => {
  it('hashes authority assignment, content, usage and mode result but excludes public display data', () => {
    const baseline = createProductMatchResultV3(createOptions());
    const renamed = createProductMatchResultV3({
      ...createOptions(),
      publicParticipants: publicParticipants().map((participant) => ({
        ...participant,
        displayName: `${participant.displayName} renamed`,
      })),
    });
    expect(baseline.authorityHash).toBe(renamed.authorityHash);
    expect(validateProductMatchResultV3(baseline)).toEqual(baseline);

    const usageChanged = createProductMatchResultV3({
      ...createOptions(),
      participantEquipmentUsage: [
        { participantId: 'p1', usedCollectionEquipmentDefinitionIds: [] },
        { participantId: 'p2', usedCollectionEquipmentDefinitionIds: [] },
      ],
    });
    expect(usageChanged.authorityHash).not.toBe(baseline.authorityHash);
  });

  it('publishes local identity without defaulting to player-1', () => {
    const info = createProductPublicMatchInfoV2({
      schemaVersion: 2,
      modeDefinitionId: 'mode.duel.test.v1',
      matchSeed: 7,
      localParticipantId: 'p2',
      content: content(),
      participantAssignments: assignments(),
      publicParticipants: publicParticipants(),
    });
    expect(info.localParticipantId).toBe('p2');
    expect(Object.isFrozen(info.publicParticipants)).toBe(true);
  });

  it('rejects mixed schema, identity drift, non-canonical usage and stale hash', () => {
    const options = createOptions();
    expect(() => createProductMatchResultV3({ ...options, schemaVersion: 2 }))
      .toThrow(/schemaVersion/);
    expect(() => createProductMatchResultV3({ ...options, future: true }))
      .toThrow(/future/);
    expect(() => createProductMatchResultV3({
      ...options,
      participantEquipmentUsage: [...options.participantEquipmentUsage].reverse(),
    })).toThrow(/assignment|participant集合不一致/);
    expect(() => createProductMatchResultV3({
      ...options,
      participantEquipmentUsage: [
        {
          participantId: 'p1',
          usedCollectionEquipmentDefinitionIds: ['unknown.collection.test'],
        },
        options.participantEquipmentUsage[1],
      ],
    })).toThrow(/content pool/);
    const result = createProductMatchResultV3(options);
    expect(() => validateProductMatchResultV3({
      ...result,
      authorityHash: '00000000',
    })).toThrow(/authorityHash/);
  });

  it('rejects hostile accessors before reading public or authority fields', () => {
    let getterCalls = 0;
    const options = Object.defineProperty(
      { ...createOptions() },
      'modeDefinitionId',
      {
        enumerable: true,
        get() {
          getterCalls += 1;
          return 'mode.duel.test.v1';
        },
      },
    );
    expect(() => createProductMatchResultV3(options)).toThrow(/数据字段|访问器/);
    expect(getterCalls).toBe(0);
  });
});
