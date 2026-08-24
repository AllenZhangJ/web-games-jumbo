import { describe, expect, it } from 'vitest';
import {
  createMatchContentSelectionV2,
  createMatchRosterAssignmentV2,
  finalizeMatchParticipantAssignmentV2,
  validateFinalizedMatchAssignmentV2,
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

function content() {
  return createMatchContentSelectionV2({
    schemaVersion: 2,
    modeDefinitionId: 'mode.race.test.v1',
    contentDefinitionId: 'content.race.test.v1',
    contentVersion: 1,
    characterDefinitionIds: ['fighter-a', 'fighter-b'],
    equipmentDefinitionIds: [],
    mapDefinitionIds: ['map.race.test.v1'],
    selectedMapDefinitionId: 'map.race.test.v1',
    participantCharacters: [
      { participantId: 'p1', definitionId: 'fighter-a' },
      { participantId: 'p2', definitionId: 'fighter-b' },
    ],
  });
}

describe('P2 Match Participant Assignment V2', () => {
  it('finalizes roster only after mode-aware content closes the participant set', () => {
    const finalized = finalizeMatchParticipantAssignmentV2({ roster: roster(), content: content() });
    expect(finalized.participants[1]?.characterDefinitionId).toBe('fighter-b');
    expect(validateFinalizedMatchAssignmentV2(finalized)).toEqual(finalized);
    expect(Object.isFrozen(finalized.participants)).toBe(true);
  });

  it('rejects missing participants, mode drift and non-canonical roster order', () => {
    const source = roster();
    const { rosterHash: _rosterHash, ...createSource } = source;
    expect(() => createMatchRosterAssignmentV2({
      ...createSource,
      participants: [...source.participants].reverse(),
    })).toThrow(/稳定升序/);
    expect(() => finalizeMatchParticipantAssignmentV2({
      roster: source,
      content: { ...content(), modeDefinitionId: 'mode.duel.test.v1' },
    })).toThrow(/modeDefinitionId|contentHash/);
    expect(() => finalizeMatchParticipantAssignmentV2({
      roster: source,
      content: {
        ...content(),
        participantCharacters: [content().participantCharacters[0]],
      },
    })).toThrow(/contentHash|participant/);
  });

  it('rejects enemy without stable Bot slot generation', () => {
    expect(() => createMatchRosterAssignmentV2({
      schemaVersion: 2,
      modeDefinitionId: 'mode.survival.test.v1',
      participants: [
        {
          participantId: 'enemy-1', modeRole: 'enemy', teamId: null,
          controllerKind: 'human', slotId: 'slot-1', slotGeneration: 1,
        },
        {
          participantId: 'p1', modeRole: 'player', teamId: null,
          controllerKind: 'human', slotId: null, slotGeneration: 0,
        },
      ],
    })).toThrow(/enemy/);
  });
});
