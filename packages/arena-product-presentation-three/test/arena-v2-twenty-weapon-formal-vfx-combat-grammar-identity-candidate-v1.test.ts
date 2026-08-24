import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1,
  resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_TWENTY_WEAPON_FORMAL_VFX_STYLE_CANDIDATE_V1,
  resolveArenaV2TwentyWeaponFormalVfxStyleCandidateV1,
} from '../src/index.js';

function command(
  cueId: string,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    sourceEventId: `event:${cueId}`,
    cueId,
    anchorParticipantId: 'target',
    attackerParticipantId: 'attacker',
    targetParticipantId: 'target',
    anchorWorldPosition: null,
    title: '命中',
    explanation: '稳定命中反馈。',
    perspective: 'local-involved',
    emphasis: 'normal',
    motionPolicy: 'standard',
    qualityTier: 'high',
    timingLanguage: 'reaction-action-follow-through',
    valueContrastPolicy: 'bright-core-dark-edge',
    maximumLayers: 3,
    maximumParticles: 96,
    maximumAverageOverdraw: 2,
    distortionAllowed: false,
    explicitOffSwitch: true,
    tick: 20,
    sequence: 3,
  });
}

function resolution(
  weaponId = 'heavy-hammer',
  context: 'ground' | 'aerial' = 'ground',
) {
  return resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1(command(
    `arena.cue.vfx.weapon-feedback.${weaponId}.${context}.hit-confirm.duel.candidate.v1`,
  ));
}

describe('Arena V2 formal VFX combat grammar identity candidate V1 (not run)', () => {
  it('projects the same 20 x 2 grammar identity into formal style without budget growth', () => {
    const identities = ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1
      .entries.flatMap((entry) => entry.contexts.map((context) => {
        const style = resolveArenaV2TwentyWeaponFormalVfxStyleCandidateV1(
          resolution(entry.weaponDefinitionId, context.context),
        );
        expect(style?.combatGrammarIdentity).toEqual({
          sourceContentHash:
            ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1.contentHash,
          weaponId: entry.weaponDefinitionId,
          context: context.context,
          actionDefinitionId: context.actionDefinitionId,
          coreVerb: entry.coreVerb,
          failureRisk: context.failureRisk,
          counterInputs: context.counterInputs,
        });
        expect(style).toMatchObject({
          status: 'production-unreachable',
          implementationStatus: 'code-written-not-run',
          validationStatus: 'not-run',
          hardGate: false,
        });
        return `${entry.weaponDefinitionId}:${context.context}`;
      }));
    expect(identities).toHaveLength(40);
    expect(new Set(identities).size).toBe(40);
    expect(ARENA_V2_TWENTY_WEAPON_FORMAL_VFX_STYLE_CANDIDATE_V1).toMatchObject({
      exactWeaponIdentityCount: 20,
      actionContextCount: 2,
      stableStyleIdentityCount: 480,
      coreVerbFamilyShapeBijectionCount: 6,
      movementFallCombatGrammarIdentity: null,
      addsVfxLayer: false,
      raisesParticleBudget: false,
      raisesOverdrawBudget: false,
      hardGate: false,
      validationStatus: 'not-run',
    });
  });

  it.each([
    ['sourceContentHash', 'forged-source-content-hash'],
    ['weaponId', 'gravity-chain'],
    ['actionDefinitionId', 'arena.action.forged.v1'],
    ['context', 'aerial'],
    ['coreVerb', 'pull'],
    ['failureRisk', 'aim-commitment'],
    ['counterInputs', []],
  ] as const)('rejects %s drift before producing style', (field, value) => {
    const base = resolution();
    expect(base.combatGrammarIdentity).not.toBeNull();
    expect(() => resolveArenaV2TwentyWeaponFormalVfxStyleCandidateV1({
      ...base,
      combatGrammarIdentity: ({
        ...base.combatGrammarIdentity!,
        [field]: value,
      } as unknown) as NonNullable<typeof base.combatGrammarIdentity>,
    })).toThrow(/战斗语法身份漂移/);
  });

  it('rejects future grammar fields and family shape contradictions', () => {
    const base = resolution();
    expect(() => resolveArenaV2TwentyWeaponFormalVfxStyleCandidateV1({
      ...base,
      combatGrammarIdentity: {
        ...base.combatGrammarIdentity!,
        futureField: true,
      } as NonNullable<typeof base.combatGrammarIdentity>,
    })).toThrow(/不支持字段/);
    expect(() => resolveArenaV2TwentyWeaponFormalVfxStyleCandidateV1({
      ...base,
      shapeTimingColor: {
        ...base.shapeTimingColor,
        familyShape: 'tension-line-with-endpoint',
      },
    })).toThrow(/familyShape与coreVerb矛盾/);
  });

  it('rejects a coherent context substitution when the original specialized cue still says ground', () => {
    const ground = resolution();
    const aerial = resolution('heavy-hammer', 'aerial');
    expect(() => resolveArenaV2TwentyWeaponFormalVfxStyleCandidateV1({
      ...ground,
      actionContext: 'aerial',
      combatGrammarIdentity: aerial.combatGrammarIdentity,
    })).toThrow(/Cue与武器\/情境\/结果\/模式身份漂移/);
  });

  it('keeps movement-fall global and refuses forged weapon grammar', () => {
    const movement = resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1(command(
      'arena.cue.vfx.weapon-feedback.movement-global.movement-fall.duel.candidate.v1',
    ));
    expect(movement.combatGrammarIdentity).toBeNull();
    expect(resolveArenaV2TwentyWeaponFormalVfxStyleCandidateV1(movement)).toBeNull();
    expect(() => resolveArenaV2TwentyWeaponFormalVfxStyleCandidateV1({
      ...movement,
      combatGrammarIdentity: resolution().combatGrammarIdentity,
    })).toThrow(/movement-fall不得携带/);
  });
});
