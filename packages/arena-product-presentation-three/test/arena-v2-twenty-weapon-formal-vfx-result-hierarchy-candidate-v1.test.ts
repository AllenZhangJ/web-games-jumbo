import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1,
  resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_TWENTY_WEAPON_FORMAL_VFX_STYLE_CANDIDATE_V1,
  resolveArenaV2TwentyWeaponFormalVfxStyleCandidateV1,
} from '../src/index.js';

type ImpactKind = 'hit-confirm' | 'hit-surface-transfer' | 'hit-ring-out';

function command(cueId: string): Readonly<Record<string, unknown>> {
  return Object.freeze({
    sourceEventId: `event:${cueId}`,
    cueId,
    anchorParticipantId: 'target',
    attackerParticipantId: 'attacker',
    targetParticipantId: 'target',
    anchorWorldPosition: null,
    title: '稳定反馈',
    explanation: '只读表现命令。',
    perspective: 'local-involved',
    emphasis: 'normal',
    motionPolicy: 'standard',
    qualityTier: 'low',
    timingLanguage: 'reaction-action-follow-through',
    valueContrastPolicy: 'bright-core-dark-edge',
    maximumLayers: 1,
    maximumParticles: 24,
    maximumAverageOverdraw: 2,
    distortionAllowed: false,
    explicitOffSwitch: true,
    tick: 30,
    sequence: 7,
  });
}

function style(
  weaponId: string,
  context: 'ground' | 'aerial',
  feedbackKind: ImpactKind | 'attack-evaded',
) {
  const resolution = resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1(command(
    `arena.cue.vfx.weapon-feedback.${weaponId}.${context}.${feedbackKind}.duel.candidate.v1`,
  ));
  const result = resolveArenaV2TwentyWeaponFormalVfxStyleCandidateV1(resolution);
  if (result === null) throw new Error('武器反馈必须解析出正式VFX样式。');
  return result;
}

function signalArea(value: ReturnType<typeof style>): number {
  return (value.shape.outerRadius ** 2 - value.shape.innerRadius ** 2)
    * Math.abs(value.shape.scaleX * value.shape.scaleY);
}

describe('Arena V2 twenty-weapon formal VFX result hierarchy candidate V1 (not run)', () => {
  it('keeps Shape/Value extent strictly ordered for every weapon and action context', () => {
    const identities: string[] = [];
    for (const entry of
      ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1.entries) {
      for (const context of entry.contexts) {
        const hit = style(entry.catalogId, context.context, 'hit-confirm');
        const transfer = style(
          entry.catalogId,
          context.context,
          'hit-surface-transfer',
        );
        const ringOut = style(entry.catalogId, context.context, 'hit-ring-out');
        expect([hit.resultHierarchy.rank, transfer.resultHierarchy.rank, ringOut.resultHierarchy.rank])
          .toEqual([1, 2, 3]);
        expect(signalArea(hit)).toBeLessThan(signalArea(transfer));
        expect(signalArea(transfer)).toBeLessThan(signalArea(ringOut));
        expect(hit.particles.size).toBeLessThan(transfer.particles.size);
        expect(transfer.particles.size).toBeLessThan(ringOut.particles.size);
        expect(hit.direction.lengthScale).toBeLessThan(transfer.direction.lengthScale);
        expect(transfer.direction.lengthScale).toBeLessThan(ringOut.direction.lengthScale);
        identities.push(`${entry.catalogId}:${context.context}`);
      }
    }
    expect(identities).toHaveLength(40);
    expect(new Set(identities).size).toBe(40);
  });

  it('keeps attack-evaded outside the impact ladder and lighter than hit-confirm', () => {
    const evaded = style('heavy-hammer', 'ground', 'attack-evaded');
    const hit = style('heavy-hammer', 'ground', 'hit-confirm');
    expect(evaded.resultHierarchy).toEqual({
      role: 'non-hit-whiff',
      rank: 0,
      shapeExtentMultiplier: 0.88,
      particleExtentMultiplier: 0,
      directionExtentMultiplier: 0.82,
    });
    expect(evaded.particles.size).toBe(0);
    expect(evaded.particles.spreadX).toBe(0);
    expect(evaded.particles.spreadY).toBe(0);
    expect(evaded.direction.lengthScale).toBeLessThan(hit.direction.lengthScale);
    expect(Object.isFrozen(evaded.resultHierarchy)).toBe(true);
  });

  it('is deterministic without requiring object singleton identity', () => {
    const first = style('gravity-chain', 'aerial', 'hit-surface-transfer');
    const second = style('gravity-chain', 'aerial', 'hit-surface-transfer');
    expect(second).toEqual(first);
    expect(second.styleId).toBe(first.styleId);
    expect(ARENA_V2_TWENTY_WEAPON_FORMAL_VFX_STYLE_CANDIDATE_V1).toMatchObject({
      impactResultHierarchyCount: 3,
      attackEvadedImpactRank: 0,
      shapeTimingValueHierarchyAppliedToConsumedFields: true,
      addsVfxLayer: false,
      raisesParticleBudget: false,
      raisesOverdrawBudget: false,
      hardGate: false,
      validationStatus: 'not-run',
    });
  });

  it('keeps movement-fall global with no weapon style or combat hierarchy', () => {
    const resolution = resolveArenaV2TwentyWeaponFeedbackVfxCandidateV1(command(
      'arena.cue.vfx.weapon-feedback.movement-global.movement-fall.duel.candidate.v1',
    ));
    expect(resolveArenaV2TwentyWeaponFormalVfxStyleCandidateV1(resolution)).toBeNull();
  });
});
