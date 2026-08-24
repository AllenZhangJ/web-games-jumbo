import { describe, expect, it } from 'vitest';
import { createArenaWeaponFeedbackDirectionFactV2 } from '../src/index.js';

describe('Arena weapon feedback direction fact V2 (not run)', () => {
  it('binds one hit feedback identity to one authority impulse direction', () => {
    expect(createArenaWeaponFeedbackDirectionFactV2({
      schemaVersion: 2,
      feedbackEventId: 'feedback:hit-1',
      feedbackTick: 20,
      feedbackSequence: 8,
      feedbackKind: 'hit-confirm',
      resultDirection: {
        schemaVersion: 2,
        kind: 'authority-horizontal-impulse',
        sourceEventId: 'knockback-1',
        source: 'KnockbackApplied',
        worldDirection: { x: 1, z: 0 },
        horizontalImpulseMagnitude: 4,
      },
    })).toMatchObject({
      feedbackEventId: 'feedback:hit-1',
      feedbackKind: 'hit-confirm',
      resultDirection: { sourceEventId: 'knockback-1', worldDirection: { x: 1, z: 0 } },
    });
  });

  it('rejects hit facts without an authority impulse direction', () => {
    expect(() => createArenaWeaponFeedbackDirectionFactV2({
      schemaVersion: 2,
      feedbackEventId: 'feedback:hit-1',
      feedbackTick: 20,
      feedbackSequence: 8,
      feedbackKind: 'hit-confirm',
      resultDirection: {
        schemaVersion: 2,
        kind: 'no-world-direction',
        sourceEventId: 'hit-1',
        source: 'attack-evaded',
        worldDirection: null,
        horizontalImpulseMagnitude: null,
      },
    })).toThrow(/不一致/);
  });
});
