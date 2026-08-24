import { describe, expect, it } from 'vitest';
import {
  createMatchContentSelectionV2,
  validateMatchContentSelectionV2,
} from '../src/match-content-selection-v2.js';

function fixture() {
  return {
    schemaVersion: 2,
    modeDefinitionId: 'mode.race.test.v1',
    contentDefinitionId: 'content.race.test.v1',
    contentVersion: 1,
    characterDefinitionIds: ['fighter-a', 'fighter-b'],
    equipmentDefinitionIds: ['hammer.collection.test'],
    mapDefinitionIds: ['map.race.test.v1'],
    selectedMapDefinitionId: 'map.race.test.v1',
    participantCharacters: [
      { participantId: 'p1', definitionId: 'fighter-a' },
      { participantId: 'p2', definitionId: 'fighter-b' },
    ],
  };
}

describe('P2 MatchContentSelection V2 candidate', () => {
  it('binds mode identity into the frozen content hash', () => {
    const first = createMatchContentSelectionV2(fixture());
    const second = createMatchContentSelectionV2({
      ...fixture(),
      modeDefinitionId: 'mode.duel.test.v1',
    });
    expect(first.contentHash).not.toBe(second.contentHash);
    expect(validateMatchContentSelectionV2(first)).toEqual(first);
    expect(Object.isFrozen(first.participantCharacters)).toBe(true);
  });

  it('rejects V1/future, unknown fields and non-canonical arrays', () => {
    expect(() => createMatchContentSelectionV2({ ...fixture(), schemaVersion: 1 }))
      .toThrow(/schemaVersion/);
    expect(() => createMatchContentSelectionV2({ ...fixture(), schemaVersion: 3 }))
      .toThrow(/schemaVersion/);
    expect(() => createMatchContentSelectionV2({ ...fixture(), future: true }))
      .toThrow(/future/);
    expect(() => createMatchContentSelectionV2({
      ...fixture(),
      characterDefinitionIds: ['fighter-b', 'fighter-a'],
    })).toThrow(/稳定升序/);
    expect(() => createMatchContentSelectionV2({
      ...fixture(),
      participantCharacters: [...fixture().participantCharacters].reverse(),
    })).toThrow(/participantId/);
  });

  it('rejects missing or stale serialized contentHash', () => {
    const created = createMatchContentSelectionV2(fixture());
    const { contentHash: _contentHash, ...missing } = created;
    expect(() => validateMatchContentSelectionV2(missing)).toThrow(/contentHash/);
    expect(() => validateMatchContentSelectionV2({
      ...created,
      contentHash: '00000000',
    })).toThrow(/contentHash/);
  });
});
