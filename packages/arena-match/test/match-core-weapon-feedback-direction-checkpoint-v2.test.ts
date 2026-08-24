import { describe, expect, it } from 'vitest';
import { ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1 } from '@number-strategy-jump/arena-contracts';
import {
  MatchCoreWeaponFeedbackAdapterV1,
  createMatchCoreWeaponFeedbackDirectionCheckpointV2,
  validateMatchCoreWeaponFeedbackDirectionCheckpointV2,
} from '../src/index.js';

function feedbackCheckpoint() {
  const adapter = new MatchCoreWeaponFeedbackAdapterV1({
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
  adapter.step({
    sequenceStart: 0,
    sourceEvents: [
      { id: 'action-1', sequence: 0, tick: 0, type: 'ActionStarted', participantId: 'attacker', action: 'weapon-action' },
      { id: 'hit-1', sequence: 1, tick: 0, type: 'HitResolved', attackerId: 'attacker', targetId: 'target', action: 'weapon-action' },
      { id: 'knockback-1', sequence: 2, tick: 0, type: 'KnockbackApplied', attackerId: 'attacker', targetId: 'target', impulse: { x: 4, y: 2, z: 0 } },
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
  const checkpoint = adapter.exportCheckpointV1();
  adapter.destroy();
  return checkpoint;
}

describe('MatchCore weapon feedback direction checkpoint V2 (not run)', () => {
  it('closes every V1 pending hit to one committed knockback direction', () => {
    const feedback = feedbackCheckpoint();
    const direction = createMatchCoreWeaponFeedbackDirectionCheckpointV2({
      feedbackCheckpoint: feedback,
      pendingDirections: [{
        hitSourceEventId: 'hit-1',
        attackerId: 'attacker',
        targetId: 'target',
        actionDefinitionId: 'weapon-action',
        firstHitTick: 0,
        knockbackSourceEventId: 'knockback-1',
        impulse: { x: 4, y: 2, z: 0 },
      }],
    });
    expect(validateMatchCoreWeaponFeedbackDirectionCheckpointV2(direction, feedback)).toEqual(
      direction,
    );
  });

  it('rejects a missing pending direction and identity tampering', () => {
    const feedback = feedbackCheckpoint();
    expect(() => createMatchCoreWeaponFeedbackDirectionCheckpointV2({
      feedbackCheckpoint: feedback,
      pendingDirections: [],
    })).toThrow(/一一闭合/);
    const direction = createMatchCoreWeaponFeedbackDirectionCheckpointV2({
      feedbackCheckpoint: feedback,
      pendingDirections: [{
        hitSourceEventId: 'hit-1', attackerId: 'attacker', targetId: 'target',
        actionDefinitionId: 'weapon-action', firstHitTick: 0,
        knockbackSourceEventId: 'knockback-1', impulse: { x: 4, y: 2, z: 0 },
      }],
    });
    expect(() => validateMatchCoreWeaponFeedbackDirectionCheckpointV2({
      ...direction,
      checkpointIdentityHash: '00000000',
    }, feedback)).toThrow(/身份hash/);
  });
});
