import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_CUE_RECORDS_CANDIDATE_V1,
  ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_RESOLUTION_CANDIDATE_V1,
  ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1,
  resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1,
} from '../src/index.js';

function command(
  cueId = 'arena.cue.vfx.weapon-feedback.heavy-hammer.ground.hit-confirm.duel.candidate.v1',
) {
  return {
    sourceEventId: 'event-1',
    cueId,
    anchorParticipantId: 'target',
    attackerParticipantId: 'attacker',
    targetParticipantId: 'target',
    anchorWorldPosition: null,
    title: '命中',
    explanation: '目标仍在原支撑面。',
    perspective: 'local-involved' as const,
    emphasis: 'normal' as const,
    motionPolicy: 'standard' as const,
    qualityTier: 'high' as const,
    timingLanguage: 'reaction-action-follow-through' as const,
    valueContrastPolicy: 'bright-core-dark-edge' as const,
    maximumLayers: 3 as const,
    maximumParticles: 96 as const,
    maximumAverageOverdraw: 2 as const,
    distortionAllowed: false as const,
    explicitOffSwitch: true as const,
    tick: 20,
    sequence: 3,
  };
}

describe('Arena V2 twenty weapon feedback VFX resolution candidate V1 (not run)', () => {
  it('closes all 483 authored cue identities without creating new texture identities', () => {
    expect(ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_CUE_RECORDS_CANDIDATE_V1).toHaveLength(483);
    const resolved = ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_CUE_RECORDS_CANDIDATE_V1
      .map(({ cueId }) => resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1(command(cueId)));
    expect(new Set(resolved.map(({ specializedCueId }) => specializedCueId)).size).toBe(483);
    expect(new Set(resolved.map(({ formalTexture }) => formalTexture.cueId))).toEqual(new Set([
      'impact-confirm',
      'impact-surface-transfer',
      'ring-out',
      'evaded-warning',
      'movement-fall-warning',
    ]));
    expect(resolved.every(({ governance }) => !governance.programmaticAssetFallbackUsed)).toBe(true);
  });

  it('resolves one weapon cue to Shape-Timing-Color and bounded authored texture use', () => {
    expect(resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1(command())).toMatchObject({
      validationStatus: 'not-run',
      hardGate: false,
      attackerParticipantId: 'attacker',
      targetParticipantId: 'target',
      weaponSpecific: true,
      weaponId: 'heavy-hammer',
      actionContext: 'ground',
      combatGrammarIdentity: {
        sourceContentHash:
          ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1.contentHash,
        weaponId: 'heavy-hammer',
        context: 'ground',
        actionDefinitionId: 'arena-v2.action.heavy-hammer.ground.candidate.v1',
        coreVerb: 'push',
      },
      modeKind: 'duel',
      feedbackKind: 'hit-confirm',
      formalTexture: {
        cueId: 'impact-confirm',
        maturity: 'authored-candidate-not-approved',
        productionApproved: false,
      },
      shapeTimingColor: {
        familyShape: 'solid-outward-wedge',
        contactAccent: 'square-heavy-head',
        valueContrastPolicy: 'bright-core-dark-edge',
      },
      directionProjection: {
        space: 'symbolic-billboard',
        authorityWorldDirectionAvailable: false,
        worldDirection: null,
        worldOrientedArrowAllowed: false,
      },
      renderRecipe: {
        perspective: 'local-involved',
        essentialLayers: ['core', 'direction', 'result'],
        optionalDecorationEnabled: true,
        maximumParticles: 96,
        maximumAverageOverdraw: 2,
        distortionAllowed: false,
      },
    });
  });

  it('closes all 20 weapons x 2 contexts against the unique collection grammar source', () => {
    const identities = ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1
      .entries.flatMap((entry) => entry.contexts.map((context) => {
        const resolution = resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1(command(
          `arena.cue.vfx.weapon-feedback.${entry.catalogId}.${context.context}.hit-confirm.duel.candidate.v1`,
        ));
        expect(resolution.combatGrammarIdentity).toEqual({
          sourceContentHash:
            ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1.contentHash,
          weaponId: entry.catalogId,
          context: context.context,
          actionDefinitionId: context.actionDefinitionId,
          coreVerb: entry.coreVerb,
          failureRisk: context.failureRisk,
          counterInputs: context.counterInputs,
        });
        expect(Object.isFrozen(resolution.combatGrammarIdentity)).toBe(true);
        expect(Object.isFrozen(resolution.combatGrammarIdentity?.counterInputs)).toBe(true);
        return `${entry.catalogId}:${context.context}`;
      }));
    expect(identities).toHaveLength(40);
    expect(new Set(identities).size).toBe(40);
  });

  it('keeps movement fall global and static fallback particle-free', () => {
    const value = command(
      'arena.cue.vfx.weapon-feedback.movement-global.movement-fall.race.candidate.v1',
    );
    expect(resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1({
      ...value,
      motionPolicy: 'static',
      qualityTier: 'low',
      timingLanguage: 'static-result-only',
      maximumLayers: 1,
      maximumParticles: 0,
    })).toMatchObject({
      weaponSpecific: false,
      weaponId: null,
      actionContext: null,
      combatGrammarIdentity: null,
      feedbackKind: 'movement-fall',
      formalTexture: { cueId: 'movement-fall-warning' },
      renderRecipe: { optionalDecorationEnabled: false, maximumParticles: 0 },
      accessibility: { staticResultOnly: true },
    });
  });

  it('keeps the existing VFX budget and production gates unchanged', () => {
    expect(ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_RESOLUTION_CANDIDATE_V1).toMatchObject({
      specializedCueCount: 483,
      combatGrammarWeaponContextIdentityCount: 40,
      coreVerbFamilyShapeBijectionCount: 6,
      movementFallCombatGrammarIdentity: null,
      productionApprovedTextureCount: 0,
      essentialLayers: ['core', 'direction', 'result'],
      optionalLayers: ['decoration'],
      hardGate: false,
      defaultSurfaceWired: false,
      preservesAuthorityCombatParticipantIdentities: true,
      validationStatus: 'not-run',
    });
    const resolution = resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1(command());
    expect(resolution.renderRecipe).toMatchObject({
      perspective: 'local-involved',
      maximumLayers: 3,
      maximumParticles: 96,
      maximumAverageOverdraw: 2,
      distortionAllowed: false,
      boundedLifetimeRequired: true,
      pooledOwnershipRequired: true,
    });
  });

  it('rejects generic cues and invalid static budgets instead of falling back', () => {
    expect(() => resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1(
      command('impact-confirm'),
    )).toThrow(/未注册/);
    expect(() => resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1({
      ...command(),
      motionPolicy: 'static',
      timingLanguage: 'static-result-only',
    })).toThrow(/静态策略/);
  });
});
