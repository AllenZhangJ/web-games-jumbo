import { describe, expect, it } from 'vitest';
import {
  ARENA_MATCH_EVENT_V6,
  ARENA_MATCH_EVENT_V6_ACTION_SOURCE,
  assertArenaV6ActionFeedbackOutcomeConsistencyV1,
} from '../src/index.js';

function action(sequence = 0, tick = 1) {
  return {
    id: `action-${sequence}`,
    sequence,
    tick,
    type: ARENA_MATCH_EVENT_V6.ACTION_STARTED,
    participantId: 'p1',
    action: 'weapon.test.attack',
    sourceKind: ARENA_MATCH_EVENT_V6_ACTION_SOURCE.EQUIPMENT,
    equipmentInstanceId: 'equipment.instance.1',
    runtimeEquipmentDefinitionId: 'weapon.runtime.test',
    collectionEquipmentDefinitionId: 'weapon.collection.test',
    survivalLevel: null,
  };
}

function hit(sequence: number, tick: number, targetId = 'p2') {
  return {
    id: `feedback-hit-${sequence}`,
    sequence,
    tick,
    type: ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED,
    kind: 'hit-confirm',
    attackerId: 'p1',
    targetId,
    actionDefinitionId: 'weapon.test.attack',
    actionStartedTick: 1,
    firstHitTick: tick,
    targetFallTick: null,
    initialSupportSurfaceId: `surface-${targetId}`,
    finalSupportSurfaceId: `surface-${targetId}`,
    fallCause: null,
    creditedAttackerId: null,
  };
}

function evaded(sequence: number, tick: number) {
  return {
    id: `feedback-evaded-${sequence}`,
    sequence,
    tick,
    type: ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED,
    kind: 'attack-evaded',
    attackerId: 'p1',
    targetId: null,
    actionDefinitionId: 'weapon.test.attack',
    actionStartedTick: 1,
    firstHitTick: null,
    targetFallTick: null,
    initialSupportSurfaceId: null,
    finalSupportSurfaceId: null,
    fallCause: null,
    creditedAttackerId: null,
  };
}

describe('P4.4cn action feedback outcome consistency', () => {
  it('requires every attack-context feedback to follow its exact authority action', () => {
    expect(() => assertArenaV6ActionFeedbackOutcomeConsistencyV1([
      hit(0, 2),
    ])).toThrow(/先行权威起手/);
    expect(() => assertArenaV6ActionFeedbackOutcomeConsistencyV1([
      evaded(0, 1),
      action(1, 1),
    ])).toThrow(/先行权威起手/);
  });

  it('rejects attack-evaded after a hit and a hit after attack-evaded', () => {
    expect(() => assertArenaV6ActionFeedbackOutcomeConsistencyV1([
      action(),
      hit(1, 2),
      evaded(2, 3),
    ])).toThrow(/与命中结果共存/);
    expect(() => assertArenaV6ActionFeedbackOutcomeConsistencyV1([
      action(),
      evaded(1, 2),
      hit(2, 3),
    ])).toThrow(/不能晚于attack-evaded/);
  });

  it('rejects repeated attack-evaded while preserving legitimate multi-target hits', () => {
    expect(() => assertArenaV6ActionFeedbackOutcomeConsistencyV1([
      action(),
      evaded(1, 2),
      evaded(2, 3),
    ])).toThrow(/不能重复/);
    expect(() => assertArenaV6ActionFeedbackOutcomeConsistencyV1([
      action(),
      hit(1, 2, 'p2'),
      hit(2, 3, 'p3'),
    ])).not.toThrow();
  });

  it('keeps delayed hit resolution legal after the attacker falls', () => {
    expect(() => assertArenaV6ActionFeedbackOutcomeConsistencyV1([
      action(),
      {
        id: 'fall-1', sequence: 1, tick: 2,
        type: ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL,
        modeDefinitionId: 'mode.duel.test', participantId: 'p1',
        modeRole: 'competitor', slotId: null, slotGeneration: 0,
        fallCause: 'movement', creditedAttackerId: null, supportSurfaceId: null,
      },
      hit(2, 3),
    ])).not.toThrow();
  });

  it('fails closed on duplicate action identity and future event fields', () => {
    expect(() => assertArenaV6ActionFeedbackOutcomeConsistencyV1([
      action(),
      { ...action(1, 1), id: 'action-duplicate' },
    ])).toThrow(/起手不能重复/);
    expect(() => assertArenaV6ActionFeedbackOutcomeConsistencyV1([
      { ...action(), future: true },
    ])).toThrow();
  });
});
