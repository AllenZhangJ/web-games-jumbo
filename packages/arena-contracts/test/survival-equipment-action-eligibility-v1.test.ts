import { describe, expect, it } from 'vitest';
import {
  ARENA_MATCH_EVENT_V6,
  ARENA_MATCH_EVENT_V6_ACTION_SOURCE,
  assertArenaV6SurvivalEquipmentActionEligibilityV1,
  type ArenaV6SurvivalEquipmentActionEligibilityParticipantV1,
} from '../src/index.js';

const participants: readonly ArenaV6SurvivalEquipmentActionEligibilityParticipantV1[] = Object.freeze([
  Object.freeze({
    participantId: 'player-1',
    modeRole: 'player',
    slotId: null,
    slotGeneration: 0,
  }),
  Object.freeze({
    participantId: 'enemy-slot-a',
    modeRole: 'enemy',
    slotId: 'slot-a',
    slotGeneration: 1,
  }),
]);

function action(sequence: number, tick: number, participantId: string) {
  return {
    id: `action-${sequence}`,
    sequence,
    tick,
    type: ARENA_MATCH_EVENT_V6.ACTION_STARTED,
    participantId,
    action: 'weapon.test.attack',
    sourceKind: ARENA_MATCH_EVENT_V6_ACTION_SOURCE.EQUIPMENT,
    equipmentInstanceId: `instance-${participantId}`,
    runtimeEquipmentDefinitionId: 'weapon.runtime.level-1.test',
    collectionEquipmentDefinitionId: 'weapon.collection.test',
    survivalLevel: 1,
  };
}

function slotChange(
  sequence: number,
  tick: number,
  active: boolean,
  previousGeneration: number,
  generation: number,
) {
  return {
    id: `slot-${sequence}`,
    sequence,
    tick,
    type: ARENA_MATCH_EVENT_V6.SURVIVAL_ENEMY_SLOT_CHANGED,
    modeDefinitionId: 'mode.survival.test',
    participantId: 'enemy-slot-a',
    slotId: 'slot-a',
    previousGeneration,
    generation,
    active,
    anchorId: active ? 'anchor-a' : null,
    reason: active ? 'pressure-stage' : 'fell',
  };
}

function playerFall(sequence: number, tick: number) {
  return {
    id: `fall-${sequence}`,
    sequence,
    tick,
    type: ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL,
    modeDefinitionId: 'mode.survival.test',
    participantId: 'player-1',
    modeRole: 'player',
    slotId: null,
    slotGeneration: 0,
    fallCause: 'movement',
    creditedAttackerId: null,
    supportSurfaceId: null,
  };
}

function playerRespawnScheduled(sequence: number, tick: number) {
  return {
    id: `schedule-${sequence}`,
    sequence,
    tick,
    type: ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED,
    modeDefinitionId: 'mode.survival.test',
    participantId: 'player-1',
    modeRole: 'player',
    slotId: null,
    slotGeneration: 0,
    readyTick: tick + 30,
    anchorId: 'anchor-player',
    reason: 'survival-first-fall',
  };
}

function playerRespawned(sequence: number, tick: number) {
  return {
    id: `respawn-${sequence}`,
    sequence,
    tick,
    type: ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED,
    modeDefinitionId: 'mode.survival.test',
    participantId: 'player-1',
    modeRole: 'player',
    slotId: null,
    slotGeneration: 0,
    anchorId: 'anchor-player',
    invulnerableTicks: 30,
  };
}

function feedback(sequence: number, tick: number, startedTick: number) {
  return {
    id: `feedback-${sequence}`,
    sequence,
    tick,
    type: ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED,
    kind: 'hit-confirm',
    attackerId: 'player-1',
    targetId: 'enemy-slot-a',
    actionDefinitionId: 'weapon.test.attack',
    actionStartedTick: startedTick,
    firstHitTick: startedTick,
    targetFallTick: null,
    initialSupportSurfaceId: 'surface-a',
    finalSupportSurfaceId: 'surface-a',
    fallCause: null,
    creditedAttackerId: null,
  };
}

describe('P4.4cl Survival equipment action eligibility', () => {
  it('allows an equipment action only after the enemy slot generation is active', () => {
    expect(() => assertArenaV6SurvivalEquipmentActionEligibilityV1({
      participants,
      events: [
        slotChange(0, 1, true, 1, 2),
        action(1, 2, 'enemy-slot-a'),
      ],
    })).not.toThrow();
    expect(() => assertArenaV6SurvivalEquipmentActionEligibilityV1({
      participants,
      events: [action(0, 1, 'enemy-slot-a')],
    })).toThrow(/非active参与者/);
  });

  it('rejects a retired enemy action and a player action between fall and respawn', () => {
    expect(() => assertArenaV6SurvivalEquipmentActionEligibilityV1({
      participants,
      events: [
        slotChange(0, 1, true, 1, 2),
        {
          ...playerFall(1, 2),
          participantId: 'enemy-slot-a',
          modeRole: 'enemy',
          slotId: 'slot-a',
          slotGeneration: 2,
        },
        slotChange(2, 2, false, 2, 2),
        action(3, 3, 'enemy-slot-a'),
      ],
    })).toThrow(/非active参与者/);
    expect(() => assertArenaV6SurvivalEquipmentActionEligibilityV1({
      participants,
      events: [
        playerFall(0, 1),
        playerRespawnScheduled(1, 1),
        action(2, 2, 'player-1'),
      ],
    })).toThrow(/非active参与者/);
  });

  it('keeps an already started action eligible when its pending hit closes after a fall', () => {
    expect(() => assertArenaV6SurvivalEquipmentActionEligibilityV1({
      participants,
      events: [
        action(0, 1, 'player-1'),
        playerFall(1, 2),
        playerRespawnScheduled(2, 2),
        playerRespawned(3, 32),
        feedback(4, 33, 1),
      ],
    })).not.toThrow();
  });

  it('allows only the first scheduled respawn at its exact ready tick and anchor', () => {
    expect(() => assertArenaV6SurvivalEquipmentActionEligibilityV1({
      participants,
      events: [
        playerFall(0, 1),
        playerRespawnScheduled(1, 1),
        playerRespawned(2, 30),
      ],
    })).toThrow(/respawn必须闭合/);
    expect(() => assertArenaV6SurvivalEquipmentActionEligibilityV1({
      participants,
      events: [
        playerFall(0, 1),
        playerRespawnScheduled(1, 2),
      ],
    })).toThrow(/respawn schedule/);
    expect(() => assertArenaV6SurvivalEquipmentActionEligibilityV1({
      participants,
      events: [
        playerFall(0, 1),
        playerRespawnScheduled(1, 1),
        playerRespawned(2, 31),
        playerFall(3, 40),
        playerRespawnScheduled(4, 40),
      ],
    })).toThrow(/respawn schedule/);
  });

  it('fails closed on future fields and accessors without executing them', () => {
    let getterCalls = 0;
    const accessorParticipant = Object.defineProperty({
      participantId: 'player-1', modeRole: 'player', slotId: null,
    }, 'slotGeneration', {
      enumerable: true,
      get() { getterCalls += 1; return 0; },
    });
    expect(() => assertArenaV6SurvivalEquipmentActionEligibilityV1({
      participants: [accessorParticipant, participants[1]!],
      events: [],
    })).toThrow();
    expect(getterCalls).toBe(0);
    expect(() => assertArenaV6SurvivalEquipmentActionEligibilityV1({
      participants,
      events: [{ ...action(0, 1, 'player-1'), future: true }],
    })).toThrow();
  });
});
