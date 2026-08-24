import { describe, expect, it } from 'vitest';
import {
  projectArenaV2WeaponImpactStrengthCandidateV1,
} from '../src/index.js';

function hitFact(horizontalImpulseMagnitude: number) {
  return {
    schemaVersion: 2,
    feedbackEventId: `feedback:${horizontalImpulseMagnitude}`,
    feedbackTick: 10,
    feedbackSequence: 2,
    feedbackKind: 'hit-confirm',
    resultDirection: {
      schemaVersion: 2,
      kind: 'authority-horizontal-impulse',
      sourceEventId: `knockback:${horizontalImpulseMagnitude}`,
      source: 'KnockbackApplied',
      worldDirection: { x: 1, z: 0 },
      horizontalImpulseMagnitude,
    },
  };
}

describe('Arena V2 weapon impact strength projection candidate V1 (not run)', () => {
  it('classifies only the exact authority impulse at the 8 and 12 boundaries', () => {
    expect(projectArenaV2WeaponImpactStrengthCandidateV1(hitFact(7.999)))
      .toMatchObject({ strength: 'light', playerLabel: '轻击' });
    expect(projectArenaV2WeaponImpactStrengthCandidateV1(hitFact(8)))
      .toMatchObject({ strength: 'medium', playerLabel: '实击' });
    expect(projectArenaV2WeaponImpactStrengthCandidateV1(hitFact(11.999)))
      .toMatchObject({ strength: 'medium', playerLabel: '实击' });
    expect(projectArenaV2WeaponImpactStrengthCandidateV1(hitFact(12)))
      .toMatchObject({ strength: 'heavy', playerLabel: '重击' });
  });

  it('returns no impact strength for a non-hit feedback fact', () => {
    expect(projectArenaV2WeaponImpactStrengthCandidateV1({
      schemaVersion: 2,
      feedbackEventId: 'feedback:evaded',
      feedbackTick: 10,
      feedbackSequence: 3,
      feedbackKind: 'attack-evaded',
      resultDirection: {
        schemaVersion: 2,
        kind: 'no-world-direction',
        sourceEventId: 'feedback:evaded',
        source: 'attack-evaded',
        worldDirection: null,
        horizontalImpulseMagnitude: null,
      },
    })).toBeNull();
  });
});
