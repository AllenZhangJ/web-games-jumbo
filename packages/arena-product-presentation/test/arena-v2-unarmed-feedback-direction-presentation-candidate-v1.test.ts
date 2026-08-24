import { describe, expect, it } from 'vitest';
import {
  projectArenaV2UnarmedFeedbackDirectionPresentationCandidateV1,
} from '../src/index.js';

const event = Object.freeze({
  id: 'feedback:unarmed-hit-1',
  type: 'WeaponFeedbackResolved' as const,
  sequence: 8,
  tick: 20,
  kind: 'hit-confirm' as const,
  attackerId: 'player',
  targetId: 'enemy',
  actionDefinitionId: 'arena-v2.action.unarmed-push.ground.candidate.v1',
  actionStartedTick: 10,
  firstHitTick: 14,
  targetFallTick: null,
  initialSupportSurfaceId: 'surface-a',
  finalSupportSurfaceId: 'surface-a',
  fallCause: null,
  creditedAttackerId: null,
});

const directionFact = Object.freeze({
  schemaVersion: 2 as const,
  feedbackEventId: event.id,
  feedbackTick: event.tick,
  feedbackSequence: event.sequence,
  feedbackKind: event.kind,
  resultDirection: Object.freeze({
    schemaVersion: 2 as const,
    kind: 'authority-horizontal-impulse' as const,
    sourceEventId: 'knockback:unarmed-hit-1',
    source: 'KnockbackApplied' as const,
    worldDirection: Object.freeze({ x: 1, z: 0 }),
    horizontalImpulseMagnitude: 13,
  }),
});

const command = Object.freeze({
  sourceEventId: event.id,
  cueId: 'impact-confirm',
  anchorParticipantId: 'enemy',
  attackerParticipantId: 'player',
  targetParticipantId: 'enemy',
  anchorWorldPosition: null,
  title: '你命中了目标',
  explanation: '目标位置与路线压力已经改变。',
  perspective: 'local-involved' as const,
  emphasis: 'normal' as const,
  motionPolicy: 'standard' as const,
  qualityTier: 'medium' as const,
  timingLanguage: 'reaction-action-follow-through' as const,
  valueContrastPolicy: 'bright-core-dark-edge' as const,
  maximumLayers: 2 as const,
  maximumParticles: 48 as const,
  maximumAverageOverdraw: 2 as const,
  distortionAllowed: false as const,
  explicitOffSwitch: true as const,
  tick: event.tick,
  sequence: event.sequence,
});

describe('Arena V2 unarmed feedback direction presentation candidate V1 (not run)', () => {
  it('preserves exact authority direction and strength on the existing generic cue', () => {
    expect(projectArenaV2UnarmedFeedbackDirectionPresentationCandidateV1({
      schemaVersion: 1,
      command,
      event,
      directionFact,
    })).toMatchObject({
      command: { cueId: 'impact-confirm' },
      directionRenderRecipe: {
        space: 'authority-world',
        worldDirection: { x: 1, z: 0 },
        horizontalImpulseMagnitude: 13,
        impactStrength: 'heavy',
        effectScaleMultiplier: 1.12,
        directionArrowScaleMultiplier: 1.28,
        cameraImpactScaleMultiplier: 1.18,
        characterImpactScaleMultiplier: 1.12,
      },
      governance: {
        exactUnarmedActionIdentityRequired: true,
        exactFeedbackFactIdentityRequired: true,
        reusesGenericCueAndAuthoredBudget: true,
        infersDirectionFromPositionOrAnimation: false,
      },
    });
  });

  it('rejects weapon actions and command, event or direction identity drift', () => {
    expect(() => projectArenaV2UnarmedFeedbackDirectionPresentationCandidateV1({
      schemaVersion: 1,
      command,
      event: {
        ...event,
        actionDefinitionId: 'arena-v2.action.heavy-hammer.ground.candidate.v1',
      },
      directionFact,
    })).toThrow(/精确徒手Action/);
    expect(() => projectArenaV2UnarmedFeedbackDirectionPresentationCandidateV1({
      schemaVersion: 1,
      command: { ...command, cueId: 'ring-out' },
      event,
      directionFact,
    })).toThrow(/身份不一致/);
    expect(() => projectArenaV2UnarmedFeedbackDirectionPresentationCandidateV1({
      schemaVersion: 1,
      command,
      event,
      directionFact: { ...directionFact, feedbackSequence: 9 },
    })).toThrow(/身份不一致/);
  });
});
