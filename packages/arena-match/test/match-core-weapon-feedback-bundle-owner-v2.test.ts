import { describe, expect, it } from 'vitest';
import { ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1 } from '@number-strategy-jump/arena-contracts';
import { MatchCoreWeaponFeedbackBundleOwnerV2 } from '../src/index.js';

function owner() {
  return new MatchCoreWeaponFeedbackBundleOwnerV2({
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
}

describe('MatchCore weapon feedback bundle owner V2 (not run)', () => {
  it('commits feedback and authority direction as one checkpoint pair', () => {
    const bundle = owner();
    const result = bundle.step({
      sequenceStart: 40,
      sourceEvents: [
        { id: 'action-1', sequence: 0, tick: 0, type: 'ActionStarted', participantId: 'attacker', action: 'weapon-action' },
        { id: 'hit-1', sequence: 1, tick: 0, type: 'HitResolved', attackerId: 'attacker', targetId: 'target', action: 'weapon-action' },
        { id: 'knockback-1', sequence: 2, tick: 0, type: 'KnockbackApplied', attackerId: 'attacker', targetId: 'target', impulse: { x: 3, y: 1, z: 4 } },
        { id: 'eliminated-1', sequence: 3, tick: 0, type: 'PlayerEliminated', participantId: 'target', remainingLives: 0, creditedAttackerId: 'attacker' },
      ],
      observation: {
        tick: 1,
        eventSequence: 4,
        participants: [
          { participantId: 'attacker', active: true, actionDefinitionId: 'weapon-action', supportSurfaceId: 'a' },
          { participantId: 'target', active: false, actionDefinitionId: null, supportSurfaceId: null },
        ],
      },
    });
    expect(result.feedbackEvents).toHaveLength(1);
    expect(result.directionFacts[0]).toMatchObject({
      feedbackEventId: result.feedbackEvents[0]!.id,
      feedbackKind: 'hit-ring-out',
      resultDirection: {
        sourceEventId: 'knockback-1',
        worldDirection: { x: 0.6, z: 0.8 },
      },
    });
    expect(result.directionCheckpoint.feedbackCheckpointIdentityHash).toBe(
      result.feedbackCheckpoint.checkpointIdentityHash,
    );
    bundle.destroy();
  });

  it('keeps both live checkpoints unchanged when direction binding rejects a hit', () => {
    const bundle = owner();
    const beforeFeedback = bundle.exportFeedbackCheckpointV1();
    const beforeDirection = bundle.exportDirectionCheckpointV2();
    expect(() => bundle.step({
      sequenceStart: 40,
      sourceEvents: [
        { id: 'action-1', sequence: 0, tick: 0, type: 'ActionStarted', participantId: 'attacker', action: 'weapon-action' },
        { id: 'hit-1', sequence: 1, tick: 0, type: 'HitResolved', attackerId: 'attacker', targetId: 'target', action: 'weapon-action' },
      ],
      observation: {
        tick: 1,
        eventSequence: 2,
        participants: [
          { participantId: 'attacker', active: true, actionDefinitionId: 'weapon-action', supportSurfaceId: 'a' },
          { participantId: 'target', active: true, actionDefinitionId: null, supportSurfaceId: 'b' },
        ],
      },
    })).toThrow(/缺少同批KnockbackApplied/);
    expect(bundle.exportFeedbackCheckpointV1()).toEqual(beforeFeedback);
    expect(bundle.exportDirectionCheckpointV2()).toEqual(beforeDirection);
    bundle.destroy();
  });

  it('atomically clears stale hit direction when a later fall has no attacker credit', () => {
    const bundle = owner();
    bundle.step({
      sequenceStart: 40,
      sourceEvents: [
        { id: 'action-1', sequence: 0, tick: 0, type: 'ActionStarted', participantId: 'attacker', action: 'weapon-action' },
        { id: 'hit-1', sequence: 1, tick: 0, type: 'HitResolved', attackerId: 'attacker', targetId: 'target', action: 'weapon-action' },
        { id: 'knockback-1', sequence: 2, tick: 0, type: 'KnockbackApplied', attackerId: 'attacker', targetId: 'target', impulse: { x: 3, y: 1, z: 4 } },
      ],
      observation: {
        tick: 1,
        eventSequence: 3,
        participants: [
          { participantId: 'attacker', active: true, actionDefinitionId: 'weapon-action', supportSurfaceId: 'a' },
          { participantId: 'target', active: true, actionDefinitionId: null, supportSurfaceId: 'b' },
        ],
      },
    });
    const result = bundle.step({
      sequenceStart: 40,
      sourceEvents: [{
        id: 'movement-fall-1', sequence: 3, tick: 1, type: 'PlayerEliminated',
        participantId: 'target', remainingLives: 0, creditedAttackerId: null,
      }],
      observation: {
        tick: 2,
        eventSequence: 4,
        participants: [
          { participantId: 'attacker', active: true, actionDefinitionId: 'weapon-action', supportSurfaceId: 'a' },
          { participantId: 'target', active: false, actionDefinitionId: null, supportSurfaceId: null },
        ],
      },
    });
    expect(result.feedbackEvents).toMatchObject([{ kind: 'movement-fall' }]);
    expect(result.directionFacts).toMatchObject([{
      feedbackKind: 'movement-fall',
      resultDirection: { kind: 'no-world-direction' },
    }]);
    expect(result.feedbackCheckpoint.pendingHits).toEqual([]);
    expect(result.directionCheckpoint.pendingDirections).toEqual([]);
    bundle.destroy();
  });

  it('keeps the first of two same-tick hits bound to its own impulse', () => {
    const bundle = owner();
    const result = bundle.step({
      sequenceStart: 40,
      sourceEvents: [
        { id: 'action-1', sequence: 0, tick: 0, type: 'ActionStarted', participantId: 'attacker', action: 'weapon-action' },
        { id: 'hit-1', sequence: 1, tick: 0, type: 'HitResolved', attackerId: 'attacker', targetId: 'target', action: 'weapon-action' },
        { id: 'knockback-1', sequence: 2, tick: 0, type: 'KnockbackApplied', attackerId: 'attacker', targetId: 'target', impulse: { x: 3, y: 1, z: 4 } },
        { id: 'hit-2', sequence: 3, tick: 0, type: 'HitResolved', attackerId: 'attacker', targetId: 'target', action: 'weapon-action' },
        { id: 'knockback-2', sequence: 4, tick: 0, type: 'KnockbackApplied', attackerId: 'attacker', targetId: 'target', impulse: { x: -4, y: 1, z: 3 } },
      ],
      observation: {
        tick: 1,
        eventSequence: 5,
        participants: [
          { participantId: 'attacker', active: true, actionDefinitionId: 'weapon-action', supportSurfaceId: 'a' },
          { participantId: 'target', active: true, actionDefinitionId: null, supportSurfaceId: 'b' },
        ],
      },
    });
    expect(result.feedbackEvents).toMatchObject([{
      id: 'feedback:hit-1',
      kind: 'hit-confirm',
    }]);
    expect(result.directionFacts).toMatchObject([{
      feedbackEventId: 'feedback:hit-1',
      resultDirection: { sourceEventId: 'knockback-1' },
    }]);
    expect(result.feedbackCheckpoint.pendingHits).toMatchObject([{
      sourceEventId: 'hit-2',
    }]);
    expect(result.directionCheckpoint.pendingDirections).toMatchObject([{
      hitSourceEventId: 'hit-2',
      knockbackSourceEventId: 'knockback-2',
    }]);
    bundle.destroy();
  });

  it('commits same-tick repeated hit and final ring-out as two exact direction facts', () => {
    const bundle = owner();
    const result = bundle.step({
      sequenceStart: 40,
      sourceEvents: [
        { id: 'action-1', sequence: 0, tick: 0, type: 'ActionStarted', participantId: 'attacker', action: 'weapon-action' },
        { id: 'hit-1', sequence: 1, tick: 0, type: 'HitResolved', attackerId: 'attacker', targetId: 'target', action: 'weapon-action' },
        { id: 'knockback-1', sequence: 2, tick: 0, type: 'KnockbackApplied', attackerId: 'attacker', targetId: 'target', impulse: { x: 3, y: 1, z: 4 } },
        { id: 'hit-2', sequence: 3, tick: 0, type: 'HitResolved', attackerId: 'attacker', targetId: 'target', action: 'weapon-action' },
        { id: 'knockback-2', sequence: 4, tick: 0, type: 'KnockbackApplied', attackerId: 'attacker', targetId: 'target', impulse: { x: -4, y: 1, z: 3 } },
        { id: 'fall-1', sequence: 5, tick: 0, type: 'PlayerEliminated', participantId: 'target', remainingLives: 0, creditedAttackerId: 'attacker' },
      ],
      observation: {
        tick: 1,
        eventSequence: 6,
        participants: [
          { participantId: 'attacker', active: true, actionDefinitionId: 'weapon-action', supportSurfaceId: 'a' },
          { participantId: 'target', active: false, actionDefinitionId: null, supportSurfaceId: null },
        ],
      },
    });
    expect(result.feedbackEvents).toMatchObject([
      { id: 'feedback:hit-1', kind: 'hit-confirm' },
      { id: 'feedback:hit-2', kind: 'hit-ring-out' },
    ]);
    expect(result.directionFacts).toMatchObject([
      { feedbackEventId: 'feedback:hit-1', resultDirection: { sourceEventId: 'knockback-1' } },
      { feedbackEventId: 'feedback:hit-2', resultDirection: { sourceEventId: 'knockback-2' } },
    ]);
    expect(result.feedbackCheckpoint.pendingHits).toEqual([]);
    expect(result.directionCheckpoint.pendingDirections).toEqual([]);
    bundle.destroy();
  });
});
