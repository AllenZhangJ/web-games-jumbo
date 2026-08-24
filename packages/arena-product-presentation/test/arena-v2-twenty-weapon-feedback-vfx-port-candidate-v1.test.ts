import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PASSTHROUGH_CUE_IDS_CANDIDATE_V1,
  ArenaV2TwentyWeaponFeedbackVfxPortCandidateV1,
} from '../src/index.js';

function command(
  sourceEventId: string,
  cueId: string,
) {
  return {
    sourceEventId,
    cueId,
    anchorParticipantId: 'target',
    attackerParticipantId: 'attacker',
    targetParticipantId: 'target',
    anchorWorldPosition: null,
    title: '反馈',
    explanation: '反馈结果。',
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
    tick: 20,
    sequence: 3,
  };
}

function downstream() {
  const resolved: unknown[] = [];
  const passthrough: unknown[] = [];
  const removed: string[] = [];
  let clears = 0;
  let disposes = 0;
  return {
    resolved,
    passthrough,
    removed,
    get clears() { return clears; },
    get disposes() { return disposes; },
    port: {
      presentResolved(value: unknown) { resolved.push(value); },
      presentPassthrough(value: unknown) { passthrough.push(value); },
      remove(sourceEventId: string) { removed.push(sourceEventId); },
      clear() { clears += 1; },
      dispose() { disposes += 1; },
    },
  };
}

describe('Arena V2 twenty weapon feedback VFX port candidate V1 (not run)', () => {
  it('exports one frozen exact passthrough cue directory without duplicate identities', () => {
    expect(ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PASSTHROUGH_CUE_IDS_CANDIDATE_V1).toHaveLength(22);
    expect(new Set(
      ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PASSTHROUGH_CUE_IDS_CANDIDATE_V1,
    ).size).toBe(22);
    expect(Object.isFrozen(
      ARENA_V2_TWENTY_WEAPON_FEEDBACK_VFX_PASSTHROUGH_CUE_IDS_CANDIDATE_V1,
    )).toBe(true);
  });

  it('routes specialized and validated generic commands through separate downstream paths', () => {
    const target = downstream();
    const port = new ArenaV2TwentyWeaponFeedbackVfxPortCandidateV1({
      assetPolicy: 'candidate-audition',
      downstream: target.port,
    });
    port.present(command(
      'weapon-1',
      'arena.cue.vfx.weapon-feedback.heavy-hammer.ground.hit-confirm.duel.candidate.v1',
    ));
    port.present(command('unarmed-1', 'impact-confirm'));
    expect(target.resolved[0]).toMatchObject({
      sourceEventId: 'weapon-1',
      attackerParticipantId: 'attacker',
      targetParticipantId: 'target',
      formalTexture: { cueId: 'impact-confirm', productionApproved: false },
    });
    expect(target.passthrough[0]).toMatchObject({
      sourceEventId: 'unarmed-1',
      cueId: 'impact-confirm',
    });
    expect(port.getSnapshot()).toMatchObject({
      activeSpecializedSourceEventIds: ['weapon-1'],
      activePassthroughSourceEventIds: ['unarmed-1'],
    });
    port.remove('weapon-1');
    expect(target.removed).toEqual(['weapon-1']);
    port.dispose();
    expect(target.disposes).toBe(1);
  });

  it('dispatches an exact source command once and fails closed on combat identity drift', () => {
    const target = downstream();
    const port = new ArenaV2TwentyWeaponFeedbackVfxPortCandidateV1({
      assetPolicy: 'candidate-audition',
      downstream: target.port,
    });
    const original = command(
      'weapon-1',
      'arena.cue.vfx.weapon-feedback.heavy-hammer.ground.hit-confirm.duel.candidate.v1',
    );
    port.present(original);
    port.present({ ...original });
    expect(target.resolved).toHaveLength(1);
    expect(() => port.present({
      ...original,
      anchorParticipantId: 'other-target',
      targetParticipantId: 'other-target',
    })).toThrow(/身份漂移/);
    expect(target.resolved).toHaveLength(1);
    expect(port.state).toBe('failed');
    port.dispose();
  });

  it('rejects unapproved specialized art before downstream presentation in production policy', () => {
    const target = downstream();
    const port = new ArenaV2TwentyWeaponFeedbackVfxPortCandidateV1({
      assetPolicy: 'production-approved-only',
      downstream: target.port,
    });
    expect(() => port.present(command(
      'weapon-1',
      'arena.cue.vfx.weapon-feedback.heavy-hammer.ground.hit-confirm.duel.candidate.v1',
    ))).toThrow(/未获生产批准/);
    expect(target.resolved).toEqual([]);
    expect(target.clears).toBe(1);
    expect(port.state).toBe('failed');
    port.dispose();
  });

  it('fails closed on source identity drift and unknown passthrough cues', () => {
    const first = downstream();
    const drift = new ArenaV2TwentyWeaponFeedbackVfxPortCandidateV1({
      assetPolicy: 'candidate-audition',
      downstream: first.port,
    });
    drift.present(command('same', 'impact-confirm'));
    expect(() => drift.present(command('same', 'ring-out'))).toThrow(/身份漂移/);
    expect(drift.state).toBe('failed');
    drift.dispose();

    const second = downstream();
    const unknown = new ArenaV2TwentyWeaponFeedbackVfxPortCandidateV1({
      assetPolicy: 'candidate-audition',
      downstream: second.port,
    });
    expect(() => unknown.present(command('unknown', 'guessed-effect'))).toThrow(/未注册/);
    expect(second.passthrough).toEqual([]);
    unknown.dispose();
  });
});
