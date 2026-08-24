import { describe, expect, it } from 'vitest';
import {
  ARENA_MATCH_EVENT_V6,
  ARENA_MATCH_EVENT_V6_ACTION_SOURCE,
  assertArenaV6CompetitiveEquipmentActionEligibilityV1,
  type ArenaV6CompetitiveEquipmentActionEligibilityParticipantV1,
} from '../src/index.js';

const participants: readonly ArenaV6CompetitiveEquipmentActionEligibilityParticipantV1[] =
  Object.freeze([
    Object.freeze({
      participantId: 'competitor-1',
      modeRole: 'competitor',
      slotId: null,
      slotGeneration: 0,
    }),
    Object.freeze({
      participantId: 'competitor-2',
      modeRole: 'competitor',
      slotId: null,
      slotGeneration: 0,
    }),
  ]);

function action(sequence: number, tick: number, participantId = 'competitor-1') {
  return {
    id: `action-${sequence}`,
    sequence,
    tick,
    type: ARENA_MATCH_EVENT_V6.ACTION_STARTED,
    participantId,
    action: 'weapon.test.attack',
    sourceKind: ARENA_MATCH_EVENT_V6_ACTION_SOURCE.EQUIPMENT,
    equipmentInstanceId: `instance-${participantId}`,
    runtimeEquipmentDefinitionId: 'weapon.runtime.test',
    collectionEquipmentDefinitionId: 'weapon.collection.test',
    survivalLevel: null,
  };
}

function fall(sequence: number, tick: number, participantId = 'competitor-1') {
  return {
    id: `fall-${sequence}`,
    sequence,
    tick,
    type: ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL,
    modeDefinitionId: 'mode.competitive.test',
    participantId,
    modeRole: 'competitor',
    slotId: null,
    slotGeneration: 0,
    fallCause: 'movement',
    creditedAttackerId: null,
    supportSurfaceId: null,
  };
}

function respawnSchedule(sequence: number, tick: number, readyTick = tick + 180) {
  return {
    id: `schedule-${sequence}`,
    sequence,
    tick,
    type: ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED,
    modeDefinitionId: 'mode.race.test',
    participantId: 'competitor-1',
    modeRole: 'competitor',
    slotId: null,
    slotGeneration: 0,
    readyTick,
    anchorId: 'race.anchor.1',
    reason: 'race-fall',
  };
}

function respawn(sequence: number, tick: number, anchorId = 'race.anchor.1') {
  return {
    id: `respawn-${sequence}`,
    sequence,
    tick,
    type: ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED,
    modeDefinitionId: 'mode.race.test',
    participantId: 'competitor-1',
    modeRole: 'competitor',
    slotId: null,
    slotGeneration: 0,
    anchorId,
    invulnerableTicks: 0,
  };
}

function finish(sequence: number, tick: number) {
  return {
    id: `finish-${sequence}`,
    sequence,
    tick,
    type: ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED,
    modeDefinitionId: 'mode.race.test',
    participantId: 'competitor-1',
    finishTick: tick,
    progressOrdinal: 10,
  };
}

function feedback(sequence: number, tick: number, startedTick: number) {
  return {
    id: `feedback-${sequence}`,
    sequence,
    tick,
    type: ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED,
    kind: 'hit-confirm',
    attackerId: 'competitor-1',
    targetId: 'competitor-2',
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

describe('P4.4cm Duel/Race equipment action eligibility', () => {
  it('rejects a Duel equipment action after fall but keeps delayed feedback eligible', () => {
    expect(() => assertArenaV6CompetitiveEquipmentActionEligibilityV1({
      modeKind: 'duel',
      participants,
      events: [fall(0, 1), action(1, 2)],
    })).toThrow(/非active参与者/);

    expect(() => assertArenaV6CompetitiveEquipmentActionEligibilityV1({
      modeKind: 'duel',
      participants,
      events: [action(0, 1), fall(1, 2), feedback(2, 3, 1)],
    })).not.toThrow();
  });

  it('rejects a Race equipment action during the fixed fall-to-respawn gap', () => {
    expect(() => assertArenaV6CompetitiveEquipmentActionEligibilityV1({
      modeKind: 'race',
      participants,
      events: [fall(0, 10), respawnSchedule(1, 10), action(2, 11)],
    })).toThrow(/非active参与者/);
  });

  it('allows a Race equipment action only after exact scheduled respawn closure', () => {
    expect(() => assertArenaV6CompetitiveEquipmentActionEligibilityV1({
      modeKind: 'race',
      participants,
      events: [
        fall(0, 10),
        respawnSchedule(1, 10),
        respawn(2, 190),
        action(3, 191),
      ],
    })).not.toThrow();
    expect(() => assertArenaV6CompetitiveEquipmentActionEligibilityV1({
      modeKind: 'race',
      participants,
      events: [fall(0, 10), respawnSchedule(1, 10), respawn(2, 190, 'other-anchor')],
    })).toThrow(/respawn必须闭合/);
    expect(() => assertArenaV6CompetitiveEquipmentActionEligibilityV1({
      modeKind: 'race',
      participants,
      events: [fall(0, 10), respawnSchedule(1, 10, 189)],
    })).toThrow(/180 tick|固定延迟/);
  });

  it('rejects new Race equipment actions after finish without rejecting delayed feedback', () => {
    expect(() => assertArenaV6CompetitiveEquipmentActionEligibilityV1({
      modeKind: 'race',
      participants,
      events: [finish(0, 10), action(1, 11)],
    })).toThrow(/非active参与者/);
    expect(() => assertArenaV6CompetitiveEquipmentActionEligibilityV1({
      modeKind: 'race',
      participants,
      events: [action(0, 9), finish(1, 10), feedback(2, 11, 9)],
    })).not.toThrow();
  });

  it('fails closed on future fields and accessors without executing them', () => {
    let getterCalls = 0;
    const accessorParticipant = Object.defineProperty({
      participantId: 'competitor-1', modeRole: 'competitor', slotId: null,
    }, 'slotGeneration', {
      enumerable: true,
      get() { getterCalls += 1; return 0; },
    });
    expect(() => assertArenaV6CompetitiveEquipmentActionEligibilityV1({
      modeKind: 'duel',
      participants: [accessorParticipant, participants[1]!],
      events: [],
    })).toThrow();
    expect(getterCalls).toBe(0);
    expect(() => assertArenaV6CompetitiveEquipmentActionEligibilityV1({
      modeKind: 'duel',
      participants,
      events: [{ ...action(0, 1), future: true }],
    })).toThrow();
  });
});
