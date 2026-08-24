import { describe, expect, it } from 'vitest';
import { resolveArenaV2TwentyWeaponFeedbackVfxCandidateV2 } from '../src/index.js';

const event = {
  id: 'feedback:hit-1', type: 'WeaponFeedbackResolved' as const, sequence: 8, tick: 20,
  kind: 'hit-confirm' as const, attackerId: 'attacker', targetId: 'target',
  actionDefinitionId: 'arena-v2.action.heavy-hammer.ground.candidate.v1',
  actionStartedTick: 10, firstHitTick: 14, targetFallTick: null,
  initialSupportSurfaceId: 'surface-a', finalSupportSurfaceId: 'surface-a',
  fallCause: null, creditedAttackerId: null,
};

describe('Arena V2 weapon feedback VFX resolution candidate V2 (not run)', () => {
  it('combines an authored VFX recipe with exact authority world direction', () => {
    expect(resolveArenaV2TwentyWeaponFeedbackVfxCandidateV2({
      schemaVersion: 2,
      modeKind: 'duel',
      event,
      directionFact: {
        schemaVersion: 2, feedbackEventId: event.id, feedbackTick: 20,
        feedbackSequence: 8, feedbackKind: 'hit-confirm',
        resultDirection: {
          schemaVersion: 2, kind: 'authority-horizontal-impulse',
          sourceEventId: 'knockback-1', source: 'KnockbackApplied',
          worldDirection: { x: 1, z: 0 }, horizontalImpulseMagnitude: 4,
        },
      },
      command: {
        sourceEventId: event.id,
        cueId: 'arena.cue.vfx.weapon-feedback.heavy-hammer.ground.hit-confirm.duel.candidate.v1',
        anchorParticipantId: 'target',
        attackerParticipantId: 'attacker', targetParticipantId: 'target',
        anchorWorldPosition: null,
        title: '轻击 · 重锤·地面：你命中了目标',
        explanation: '目标仍在原支撑面，但位置与路线压力已经改变。',
        perspective: 'local-involved',
        emphasis: 'normal',
        motionPolicy: 'standard', qualityTier: 'medium',
        timingLanguage: 'reaction-action-follow-through',
        valueContrastPolicy: 'bright-core-dark-edge', maximumLayers: 2,
        maximumParticles: 48, maximumAverageOverdraw: 2,
        distortionAllowed: false, explicitOffSwitch: true, tick: 20, sequence: 8,
      },
    })).toMatchObject({
      base: { formalTexture: { cueId: 'impact-confirm', productionApproved: false } },
      directionRenderRecipe: {
        space: 'authority-world', worldDirection: { x: 1, z: 0 },
        horizontalImpulseMagnitude: 4, worldOrientedArrowAllowed: true,
        impactStrength: 'light', effectScaleMultiplier: 0.9,
        directionArrowScaleMultiplier: 0.9,
        cameraImpactScaleMultiplier: 0.82,
        characterImpactScaleMultiplier: 0.85,
        billboardFamilyShapeRequired: false,
      },
    });
  });
});
