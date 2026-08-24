import { describe, expect, it } from 'vitest';
import {
  projectArenaV2WeaponImpactDirectionLabelCandidateV1,
  projectArenaV2TwentyWeaponFeedbackDirectionReadPlanCandidateV2,
} from '../src/index.js';

const event = Object.freeze({
  id: 'feedback:hit-1',
  type: 'WeaponFeedbackResolved' as const,
  sequence: 8,
  tick: 20,
  kind: 'hit-confirm' as const,
  attackerId: 'attacker',
  targetId: 'target',
  actionDefinitionId: 'arena-v2.action.heavy-hammer.ground.candidate.v1',
  actionStartedTick: 10,
  firstHitTick: 14,
  targetFallTick: null,
  initialSupportSurfaceId: 'surface-a',
  finalSupportSurfaceId: 'surface-a',
  fallCause: null,
  creditedAttackerId: null,
});

function fact() {
  return {
    schemaVersion: 2,
    feedbackEventId: event.id,
    feedbackTick: event.tick,
    feedbackSequence: event.sequence,
    feedbackKind: event.kind,
    resultDirection: {
      schemaVersion: 2,
      kind: 'authority-horizontal-impulse',
      sourceEventId: 'knockback-1',
      source: 'KnockbackApplied',
      worldDirection: { x: 0.6, z: 0.8 },
      horizontalImpulseMagnitude: 5,
    },
  };
}

describe('Arena V2 twenty weapon direction read plan candidate V2 (not run)', () => {
  it('opens world orientation only for an exact authority Direction Fact', () => {
    expect(projectArenaV2TwentyWeaponFeedbackDirectionReadPlanCandidateV2({
      schemaVersion: 2,
      modeKind: 'duel',
      event,
      directionFact: fact(),
    })).toMatchObject({
      base: { weaponId: 'heavy-hammer', feedbackKind: 'hit-confirm' },
      directionProjection: {
        space: 'authority-world',
        authorityWorldDirectionAvailable: true,
        worldDirection: { x: 0.6, z: 0.8 },
        horizontalImpulseMagnitude: 5,
        playerDirectionLabel: '地图东北向',
        impactStrength: {
          strength: 'light',
          playerLabel: '轻击',
          horizontalImpulseMagnitude: 5,
        },
        worldOrientedArrowAllowed: true,
        sourceEventId: 'knockback-1',
      },
    });
  });

  it('uses absolute map compass labels and keeps no-direction feedback unlabeled', () => {
    const labels = [
      [{ x: 1, z: 0 }, '地图东向'],
      [{ x: -1, z: 0 }, '地图西向'],
      [{ x: 0, z: 1 }, '地图北向'],
      [{ x: 0, z: -1 }, '地图南向'],
      [{ x: Math.SQRT1_2, z: -Math.SQRT1_2 }, '地图东南向'],
    ] as const;
    for (const [worldDirection, playerDirectionLabel] of labels) {
      expect(projectArenaV2TwentyWeaponFeedbackDirectionReadPlanCandidateV2({
        schemaVersion: 2,
        modeKind: 'duel',
        event,
        directionFact: {
          ...fact(),
          resultDirection: { ...fact().resultDirection, worldDirection },
        },
      }).directionProjection.playerDirectionLabel).toBe(playerDirectionLabel);
    }
    expect(projectArenaV2WeaponImpactDirectionLabelCandidateV1({
      schemaVersion: 2,
      feedbackEventId: 'feedback:evaded',
      feedbackTick: 21,
      feedbackSequence: 9,
      feedbackKind: 'attack-evaded',
      resultDirection: {
        schemaVersion: 2,
        kind: 'no-world-direction',
        sourceEventId: 'evaded-1',
        source: 'attack-evaded',
        worldDirection: null,
        horizontalImpulseMagnitude: null,
      },
    })).toBeNull();
  });

  it('rejects a fact from another feedback identity', () => {
    expect(() => projectArenaV2TwentyWeaponFeedbackDirectionReadPlanCandidateV2({
      schemaVersion: 2,
      modeKind: 'duel',
      event,
      directionFact: { ...fact(), feedbackEventId: 'feedback:other' },
    })).toThrow(/身份不一致/);
  });
});
