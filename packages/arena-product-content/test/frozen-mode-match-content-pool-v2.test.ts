import { describe, expect, it } from 'vitest';
import {
  createMatchContentSelectionV2,
  createMatchRosterAssignmentV2,
} from '@number-strategy-jump/arena-contracts';
import {
  FROZEN_MODE_MATCH_CONTENT_POOL_V2_SCHEMA_VERSION,
  createFrozenModeMatchContentPoolV2,
} from '../src/index.js';

function roster() {
  return createMatchRosterAssignmentV2({
    schemaVersion: 2,
    modeDefinitionId: 'mode.race.test.v1',
    participants: [
      {
        participantId: 'p1', modeRole: 'competitor', teamId: null,
        controllerKind: 'human', slotId: null, slotGeneration: 0,
      },
      {
        participantId: 'p2', modeRole: 'competitor', teamId: null,
        controllerKind: 'bot', slotId: null, slotGeneration: 0,
      },
    ],
  });
}

function selection() {
  return createMatchContentSelectionV2({
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
  });
}

describe('P2.5 frozen mode content pool V2 candidate', () => {
  it('publishes roster, content and final assignment atomically', () => {
    const pool = createFrozenModeMatchContentPoolV2({
      schemaVersion: FROZEN_MODE_MATCH_CONTENT_POOL_V2_SCHEMA_VERSION,
      matchSeed: 7,
      sourceProfileRevision: 3,
      roster: roster(),
      selection: selection(),
    });
    expect(pool.finalAssignment.contentHash).toBe(pool.selection.contentHash);
    expect(pool.finalAssignment.participants[1]?.characterDefinitionId).toBe('fighter-b');
    expect(Object.isFrozen(pool)).toBe(true);
  });

  it('rejects mode drift before publishing a pool', () => {
    expect(() => createFrozenModeMatchContentPoolV2({
      schemaVersion: FROZEN_MODE_MATCH_CONTENT_POOL_V2_SCHEMA_VERSION,
      matchSeed: 7,
      sourceProfileRevision: 3,
      roster: roster(),
      selection: { ...selection(), modeDefinitionId: 'mode.duel.test.v1' },
    })).toThrow(/modeDefinitionId|contentHash/);
  });
});
