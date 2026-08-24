import { describe, expect, it } from 'vitest';
import {
  resolveArenaWeaponFeedbackResultDirectionV2,
} from '../src/index.js';

describe('Weapon feedback result direction resolver V2 (not run)', () => {
  it('normalizes a committed push or pull impulse without reading positions', () => {
    expect(resolveArenaWeaponFeedbackResultDirectionV2({
      feedbackKind: 'hit-surface-transfer',
      sourceEventId: 'knockback-1',
      impulse: { x: 3, y: 2, z: 4 },
    })).toMatchObject({
      schemaVersion: 2,
      kind: 'authority-horizontal-impulse',
      source: 'KnockbackApplied',
      worldDirection: { x: 0.6, z: 0.8 },
      horizontalImpulseMagnitude: 5,
    });
    expect(resolveArenaWeaponFeedbackResultDirectionV2({
      feedbackKind: 'hit-confirm',
      sourceEventId: 'knockback-pull',
      impulse: { x: -8, y: 1, z: 0 },
    }).worldDirection).toEqual({ x: -1, z: 0 });
  });

  it('keeps evaded and movement fall free of invented world direction', () => {
    for (const feedbackKind of ['attack-evaded', 'movement-fall'] as const) {
      expect(resolveArenaWeaponFeedbackResultDirectionV2({
        feedbackKind,
        sourceEventId: `${feedbackKind}-1`,
        impulse: null,
      })).toMatchObject({
        kind: 'no-world-direction',
        source: feedbackKind,
        worldDirection: null,
        horizontalImpulseMagnitude: null,
      });
    }
  });

  it('rejects zero horizontal hit impulse and invented miss impulse', () => {
    expect(() => resolveArenaWeaponFeedbackResultDirectionV2({
      feedbackKind: 'hit-ring-out',
      sourceEventId: 'zero',
      impulse: { x: 0, y: 5, z: 0 },
    })).toThrow(/不可为零/);
    expect(() => resolveArenaWeaponFeedbackResultDirectionV2({
      feedbackKind: 'attack-evaded',
      sourceEventId: 'miss',
      impulse: { x: 1, y: 0, z: 0 },
    })).toThrow(/不得携带/);
  });
});
