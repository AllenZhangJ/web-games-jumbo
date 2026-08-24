import { describe, expect, it } from 'vitest';
import {
  ARENA_MATCH_EVENT_V6,
  ARENA_MATCH_EVENT_V6_ACTION_SOURCE,
  ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1,
  assertArenaV6SurvivalEquipmentOwnershipConsistencyV1,
} from '../src/index.js';

const modeDefinitionId = 'mode.survival.ownership.test';
const participants = Object.freeze([
  Object.freeze({ participantId: 'player-1', modeRole: 'player' as const }),
  Object.freeze({ participantId: 'enemy-1', modeRole: 'enemy' as const }),
]);

function fact(
  sequence: number,
  tick: number,
  kind: 'spawned' | 'picked-up' | 'replaced' | 'expired',
  equipmentInstanceId: string,
  participantId: string | null = null,
  previousEquipmentInstanceId: string | null = null,
) {
  return {
    schemaVersion: 1 as const,
    id: `supply-stream:supply-fact-v1:${sequence}:${kind}`,
    streamId: 'supply-stream',
    sequence,
    tick,
    modeDefinitionId,
    kind,
    supplyDefinitionId: `supply.${equipmentInstanceId}`,
    supplyId: `world.${equipmentInstanceId}`,
    equipmentInstanceId,
    runtimeEquipmentDefinitionId: `runtime.${equipmentInstanceId}`,
    collectionEquipmentDefinitionId: `collection.${equipmentInstanceId}`,
    survivalLevel: 1,
    participantId,
    previousEquipmentInstanceId,
  };
}

function action(sequence: number, tick: number, participantId: string, instanceId: string) {
  return {
    id: `action-${sequence}`,
    sequence,
    tick,
    type: ARENA_MATCH_EVENT_V6.ACTION_STARTED,
    participantId,
    action: 'weapon.test.attack',
    sourceKind: ARENA_MATCH_EVENT_V6_ACTION_SOURCE.EQUIPMENT,
    equipmentInstanceId: instanceId,
    runtimeEquipmentDefinitionId: `runtime.${instanceId}`,
    collectionEquipmentDefinitionId: `collection.${instanceId}`,
    survivalLevel: 1,
  };
}

function assertOwnership(events: readonly unknown[], supplyFacts: readonly unknown[]): void {
  assertArenaV6SurvivalEquipmentOwnershipConsistencyV1({
    modeDefinitionId,
    participants,
    events,
    supplyFacts,
  });
}

describe('Survival equipment ownership consistency V1', () => {
  it('允许同tick先提交拾取事实，再使用精确实例起手', () => {
    expect(() => assertOwnership(
      [action(0, 1, 'player-1', 'equipment-a')],
      [
        fact(0, 1, ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1.SPAWNED, 'equipment-a'),
        fact(
          1,
          1,
          ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1.PICKED_UP,
          'equipment-a',
          'player-1',
        ),
      ],
    )).not.toThrow();
  });

  it('替换后只允许新实例继续起手', () => {
    const supplyFacts = [
      fact(0, 1, 'spawned', 'equipment-a'),
      fact(1, 1, 'picked-up', 'equipment-a', 'player-1'),
      fact(2, 2, 'spawned', 'equipment-b'),
      fact(3, 2, 'replaced', 'equipment-b', 'player-1', 'equipment-a'),
    ];
    expect(() => assertOwnership(
      [
        action(0, 1, 'player-1', 'equipment-a'),
        action(1, 2, 'player-1', 'equipment-b'),
      ],
      supplyFacts,
    )).not.toThrow();
    expect(() => assertOwnership(
      [action(0, 2, 'player-1', 'equipment-a')],
      supplyFacts,
    )).toThrow(/持有事实/u);
  });

  it('拒绝未拾取、已过期、他人持有或身份漂移的实例', () => {
    const spawned = fact(0, 1, 'spawned', 'equipment-a');
    expect(() => assertOwnership(
      [action(0, 1, 'player-1', 'equipment-a')],
      [spawned],
    )).toThrow(/持有事实/u);
    expect(() => assertOwnership(
      [action(0, 2, 'player-1', 'equipment-a')],
      [spawned, fact(1, 2, 'expired', 'equipment-a')],
    )).toThrow(/持有事实/u);
    expect(() => assertOwnership(
      [action(0, 1, 'enemy-1', 'equipment-a')],
      [spawned, fact(1, 1, 'picked-up', 'equipment-a', 'player-1')],
    )).toThrow(/持有事实/u);
    expect(() => assertOwnership(
      [action(0, 1, 'player-1', 'equipment-a')],
      [
        spawned,
        {
          ...fact(1, 1, 'picked-up', 'equipment-a', 'player-1'),
          runtimeEquipmentDefinitionId: 'runtime.drifted',
        },
      ],
    )).toThrow(/同身份spawn/u);
  });

  it('拒绝缺少sequence 0的终局事实前缀', () => {
    expect(() => assertOwnership([], [{
      ...fact(0, 0, 'spawned', 'equipment-a'),
      id: 'supply-stream:supply-fact-v1:1:spawned',
      sequence: 1,
    }])).toThrow(/sequence 0/u);
  });
});
