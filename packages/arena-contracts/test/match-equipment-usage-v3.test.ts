import { describe, expect, it } from 'vitest';
import {
  ARENA_MATCH_EVENT_V6,
  ARENA_MATCH_EVENT_V6_ACTION_SOURCE,
  createParticipantEquipmentUsageV3FromEvents,
} from '../src/index.js';

function action(sequence: number, values: Record<string, unknown>) {
  return {
    id: `event-${sequence}`,
    sequence,
    tick: 100,
    type: ARENA_MATCH_EVENT_V6.ACTION_STARTED,
    participantId: 'p1',
    action: 'hammer.attack',
    sourceKind: ARENA_MATCH_EVENT_V6_ACTION_SOURCE.EQUIPMENT,
    equipmentInstanceId: 'equipment-1',
    runtimeEquipmentDefinitionId: 'hammer.runtime.level-1.test',
    collectionEquipmentDefinitionId: 'hammer.collection.test',
    survivalLevel: 1,
    ...values,
  };
}

describe('P2 participant equipment usage reducer', () => {
  it('counts only accepted equipment ActionStarted and stays stable under duplicates', () => {
    const usage = createParticipantEquipmentUsageV3FromEvents({
      participantIds: ['p1', 'p2'],
      allowedCollectionEquipmentDefinitionIds: [
        'hammer.collection.test',
        'sword.collection.test',
      ],
      events: [
        action(1, {}),
        action(2, { runtimeEquipmentDefinitionId: 'hammer.runtime.level-2.test', survivalLevel: 2 }),
        action(3, {
          action: 'movement.jump',
          sourceKind: ARENA_MATCH_EVENT_V6_ACTION_SOURCE.BASE_ACTION,
          equipmentInstanceId: null,
          runtimeEquipmentDefinitionId: null,
          collectionEquipmentDefinitionId: null,
          survivalLevel: null,
        }),
      ],
    });
    expect(usage).toEqual([
      { participantId: 'p1', usedCollectionEquipmentDefinitionIds: ['hammer.collection.test'] },
      { participantId: 'p2', usedCollectionEquipmentDefinitionIds: [] },
    ]);
  });

  it('rejects event order, participant and content identity drift', () => {
    const base = {
      participantIds: ['p1', 'p2'],
      allowedCollectionEquipmentDefinitionIds: ['hammer.collection.test'],
    };
    expect(() => createParticipantEquipmentUsageV3FromEvents({
      ...base,
      events: [action(2, {}), action(1, {})],
    })).toThrow(/sequence/);
    expect(() => createParticipantEquipmentUsageV3FromEvents({
      ...base,
      events: [action(1, { participantId: 'foreign' })],
    })).toThrow(/participant/);
    expect(() => createParticipantEquipmentUsageV3FromEvents({
      ...base,
      events: [action(1, { collectionEquipmentDefinitionId: 'unknown.collection.test' })],
    })).toThrow(/content pool/);
  });
});
