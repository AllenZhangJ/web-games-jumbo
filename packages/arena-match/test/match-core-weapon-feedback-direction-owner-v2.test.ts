import { describe, expect, it } from 'vitest';
import { ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1 } from '@number-strategy-jump/arena-contracts';
import {
  MatchCoreWeaponFeedbackAdapterV1,
  MatchCoreWeaponFeedbackDirectionOwnerV2,
} from '../src/index.js';

function pair() {
  const feedback = new MatchCoreWeaponFeedbackAdapterV1({
    participantIds: ['attacker', 'target'],
    outcomeWindowTicks: ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1,
    initialObservation: {
      tick: 0,
      eventSequence: 0,
      participants: [
        { participantId: 'attacker', active: true, actionDefinitionId: null, supportSurfaceId: 'a' },
        { participantId: 'target', active: true, actionDefinitionId: null, supportSurfaceId: 'b' },
      ],
    },
  });
  const initialFeedbackCheckpoint = feedback.exportCheckpointV1();
  const direction = new MatchCoreWeaponFeedbackDirectionOwnerV2({
    feedbackCheckpoint: initialFeedbackCheckpoint,
    directionCheckpoint: null,
  });
  return { feedback, direction };
}

function multiTargetPair() {
  const feedback = new MatchCoreWeaponFeedbackAdapterV1({
    participantIds: ['attacker', 'target-a', 'target-b'],
    outcomeWindowTicks: ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1,
    initialObservation: {
      tick: 0,
      eventSequence: 0,
      participants: [
        { participantId: 'attacker', active: true, actionDefinitionId: null, supportSurfaceId: 'a' },
        { participantId: 'target-a', active: true, actionDefinitionId: null, supportSurfaceId: 'b' },
        { participantId: 'target-b', active: true, actionDefinitionId: null, supportSurfaceId: 'c' },
      ],
    },
  });
  const direction = new MatchCoreWeaponFeedbackDirectionOwnerV2({
    feedbackCheckpoint: feedback.exportCheckpointV1(),
    directionCheckpoint: null,
  });
  return { feedback, direction };
}

const hitEvents = Object.freeze([
  { id: 'action-1', sequence: 0, tick: 0, type: 'ActionStarted', participantId: 'attacker', action: 'weapon-action' },
  { id: 'hit-1', sequence: 1, tick: 0, type: 'HitResolved', attackerId: 'attacker', targetId: 'target', action: 'weapon-action' },
  { id: 'knockback-1', sequence: 2, tick: 0, type: 'KnockbackApplied', attackerId: 'attacker', targetId: 'target', impulse: { x: 3, y: 2, z: 4 } },
]);

describe('MatchCore weapon feedback direction owner V2 (not run)', () => {
  it('binds an immediate credited ring-out to the committed knockback direction', () => {
    const { feedback, direction } = pair();
    const sourceEvents = [...hitEvents, {
      id: 'eliminated-1', sequence: 3, tick: 0, type: 'PlayerEliminated',
      participantId: 'target', remainingLives: 0, creditedAttackerId: 'attacker',
    }];
    const feedbackEvents = feedback.step({
      sequenceStart: 40,
      sourceEvents,
      observation: {
        tick: 1,
        eventSequence: 4,
        participants: [
          { participantId: 'attacker', active: true, actionDefinitionId: 'weapon-action', supportSurfaceId: 'a' },
          { participantId: 'target', active: false, actionDefinitionId: null, supportSurfaceId: null },
        ],
      },
    });
    const result = direction.step({
      sourceEvents,
      feedbackEvents,
      feedbackCheckpoint: feedback.exportCheckpointV1(),
    });
    expect(result.facts).toHaveLength(1);
    expect(result.facts[0]).toMatchObject({
      feedbackKind: 'hit-ring-out',
      resultDirection: {
        sourceEventId: 'knockback-1',
        worldDirection: { x: 0.6, z: 0.8 },
        horizontalImpulseMagnitude: 5,
      },
    });
    expect(result.checkpoint.pendingDirections).toEqual([]);
    direction.destroy();
    feedback.destroy();
  });

  it('binds grouped same-tick multi-target hits to each target knockback by identity', () => {
    const { feedback, direction } = multiTargetPair();
    const sourceEvents = [
      { id: 'action-multi-target', sequence: 0, tick: 0, type: 'ActionStarted', participantId: 'attacker', action: 'sweep.attack' },
      { id: 'hit-target-a', sequence: 1, tick: 0, type: 'HitResolved', attackerId: 'attacker', targetId: 'target-a', action: 'sweep.attack' },
      { id: 'hit-target-b', sequence: 2, tick: 0, type: 'HitResolved', attackerId: 'attacker', targetId: 'target-b', action: 'sweep.attack' },
      { id: 'knockback-target-a', sequence: 3, tick: 0, type: 'KnockbackApplied', attackerId: 'attacker', targetId: 'target-a', impulse: { x: 3, y: 1, z: 4 } },
      { id: 'knockback-target-b', sequence: 4, tick: 0, type: 'KnockbackApplied', attackerId: 'attacker', targetId: 'target-b', impulse: { x: -4, y: 1, z: 3 } },
      { id: 'eliminated-target-a', sequence: 5, tick: 0, type: 'PlayerEliminated', participantId: 'target-a', remainingLives: 0, creditedAttackerId: 'attacker' },
      { id: 'eliminated-target-b', sequence: 6, tick: 0, type: 'PlayerEliminated', participantId: 'target-b', remainingLives: 0, creditedAttackerId: 'attacker' },
    ];
    const feedbackEvents = feedback.step({
      sequenceStart: 70,
      sourceEvents,
      observation: {
        tick: 1,
        eventSequence: 7,
        participants: [
          { participantId: 'attacker', active: true, actionDefinitionId: 'sweep.attack', supportSurfaceId: 'a' },
          { participantId: 'target-a', active: false, actionDefinitionId: null, supportSurfaceId: null },
          { participantId: 'target-b', active: false, actionDefinitionId: null, supportSurfaceId: null },
        ],
      },
    });
    const result = direction.step({
      sourceEvents,
      feedbackEvents,
      feedbackCheckpoint: feedback.exportCheckpointV1(),
    });
    expect(result.facts).toMatchObject([
      {
        feedbackEventId: 'feedback:hit-target-a',
        feedbackKind: 'hit-ring-out',
        resultDirection: {
          sourceEventId: 'knockback-target-a',
          worldDirection: { x: 0.6, z: 0.8 },
        },
      },
      {
        feedbackEventId: 'feedback:hit-target-b',
        feedbackKind: 'hit-ring-out',
        resultDirection: {
          sourceEventId: 'knockback-target-b',
          worldDirection: { x: -0.8, z: 0.6 },
        },
      },
    ]);
    expect(result.checkpoint.pendingDirections).toEqual([]);
    direction.destroy();
    feedback.destroy();
  });

  it('exports and restores a pending direction checkpoint before the outcome window closes', () => {
    const { feedback, direction } = pair();
    const feedbackEvents = feedback.step({
      sequenceStart: 40,
      sourceEvents: hitEvents,
      observation: {
        tick: 1,
        eventSequence: 3,
        participants: [
          { participantId: 'attacker', active: true, actionDefinitionId: 'weapon-action', supportSurfaceId: 'a' },
          { participantId: 'target', active: true, actionDefinitionId: null, supportSurfaceId: 'b' },
        ],
      },
    });
    const feedbackCheckpoint = feedback.exportCheckpointV1();
    const result = direction.step({
      sourceEvents: hitEvents,
      feedbackEvents,
      feedbackCheckpoint,
    });
    expect(result.facts).toEqual([]);
    expect(result.checkpoint.pendingDirections).toHaveLength(1);
    const restored = new MatchCoreWeaponFeedbackDirectionOwnerV2({
      feedbackCheckpoint,
      directionCheckpoint: result.checkpoint,
    });
    expect(restored.exportCheckpointV2()).toEqual(result.checkpoint);
    restored.destroy();
    direction.destroy();
    feedback.destroy();
  });

  it('clears an expired hit direction when the target later falls without credit', () => {
    const { feedback, direction } = pair();
    const firstFeedbackEvents = feedback.step({
      sequenceStart: 40,
      sourceEvents: hitEvents,
      observation: {
        tick: 1,
        eventSequence: 3,
        participants: [
          { participantId: 'attacker', active: true, actionDefinitionId: 'weapon-action', supportSurfaceId: 'a' },
          { participantId: 'target', active: true, actionDefinitionId: null, supportSurfaceId: 'b' },
        ],
      },
    });
    direction.step({
      sourceEvents: hitEvents,
      feedbackEvents: firstFeedbackEvents,
      feedbackCheckpoint: feedback.exportCheckpointV1(),
    });
    const fallEvents = [{
      id: 'movement-fall-1', sequence: 3, tick: 1, type: 'PlayerEliminated',
      participantId: 'target', remainingLives: 0, creditedAttackerId: null,
    }];
    const fallFeedbackEvents = feedback.step({
      sequenceStart: 40,
      sourceEvents: fallEvents,
      observation: {
        tick: 2,
        eventSequence: 4,
        participants: [
          { participantId: 'attacker', active: true, actionDefinitionId: 'weapon-action', supportSurfaceId: 'a' },
          { participantId: 'target', active: false, actionDefinitionId: null, supportSurfaceId: null },
        ],
      },
    });
    const result = direction.step({
      sourceEvents: fallEvents,
      feedbackEvents: fallFeedbackEvents,
      feedbackCheckpoint: feedback.exportCheckpointV1(),
    });
    expect(result.facts).toMatchObject([{
      feedbackKind: 'movement-fall',
      resultDirection: { kind: 'no-world-direction' },
    }]);
    expect(result.checkpoint.pendingDirections).toEqual([]);
    direction.destroy();
    feedback.destroy();
  });

  it('binds same-tick repeated hits by the exact feedback source event identity', () => {
    const { feedback, direction } = pair();
    const sourceEvents = [
      { id: 'action-1', sequence: 0, tick: 0, type: 'ActionStarted', participantId: 'attacker', action: 'weapon-action' },
      { id: 'hit-1', sequence: 1, tick: 0, type: 'HitResolved', attackerId: 'attacker', targetId: 'target', action: 'weapon-action' },
      { id: 'hit-2', sequence: 2, tick: 0, type: 'HitResolved', attackerId: 'attacker', targetId: 'target', action: 'weapon-action' },
      { id: 'knockback-1', sequence: 3, tick: 0, type: 'KnockbackApplied', attackerId: 'attacker', targetId: 'target', impulse: { x: 3, y: 2, z: 4 } },
      { id: 'knockback-2', sequence: 4, tick: 0, type: 'KnockbackApplied', attackerId: 'attacker', targetId: 'target', impulse: { x: -4, y: 1, z: 3 } },
    ];
    const feedbackEvents = feedback.step({
      sequenceStart: 40,
      sourceEvents,
      observation: {
        tick: 1,
        eventSequence: 5,
        participants: [
          { participantId: 'attacker', active: true, actionDefinitionId: 'weapon-action', supportSurfaceId: 'a' },
          { participantId: 'target', active: true, actionDefinitionId: null, supportSurfaceId: 'b' },
        ],
      },
    });
    const result = direction.step({
      sourceEvents,
      feedbackEvents,
      feedbackCheckpoint: feedback.exportCheckpointV1(),
    });
    expect(result.facts).toMatchObject([{
      feedbackEventId: 'feedback:hit-1',
      feedbackKind: 'hit-confirm',
      resultDirection: {
        sourceEventId: 'knockback-1',
        worldDirection: { x: 0.6, z: 0.8 },
      },
    }]);
    expect(result.checkpoint.pendingDirections).toMatchObject([{
      hitSourceEventId: 'hit-2',
      knockbackSourceEventId: 'knockback-2',
    }]);
    direction.destroy();
    feedback.destroy();
  });

  it('fails before commit when a hit lacks the same-batch KnockbackApplied event', () => {
    const { feedback, direction } = pair();
    const sourceEvents = hitEvents.slice(0, 2);
    feedback.step({
      sequenceStart: 40,
      sourceEvents,
      observation: {
        tick: 1,
        eventSequence: 2,
        participants: [
          { participantId: 'attacker', active: true, actionDefinitionId: 'weapon-action', supportSurfaceId: 'a' },
          { participantId: 'target', active: true, actionDefinitionId: null, supportSurfaceId: 'b' },
        ],
      },
    });
    expect(() => direction.step({
      sourceEvents,
      feedbackEvents: [],
      feedbackCheckpoint: feedback.exportCheckpointV1(),
    })).toThrow(/缺少同批KnockbackApplied/);
    expect(direction.exportCheckpointV2().tick).toBe(0);
    direction.destroy();
    feedback.destroy();
  });
});
