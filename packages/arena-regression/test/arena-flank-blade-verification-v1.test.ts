import { describe, expect, it } from 'vitest';
import {
  runArenaFlankBladeVerificationCandidateV1,
} from '../src/arena-flank-blade-verification-v1.js';

describe('Arena flank blade verification candidate V1', () => {
  it('accepts normalized rear entry, rejects front entry and reuses real match authority', () => {
    const report = runArenaFlankBladeVerificationCandidateV1();
    expect(report).toMatchObject({
      candidateStatus: 'production-unreachable',
      hardGate: false,
      defaultRegistryWired: false,
      weaponId: 'flank-blade',
      coreVerb: 'flank',
      requiredInput: 'primary',
      usesNormalizedTargetFacing: true,
      usesRealTargetingRegistry: true,
      usesRealRulePhysicsConsequenceRunner: true,
      usesRealMatchCoreReplayRunner: true,
      scenarioCount: 4,
      exercisesP2ModeLifecycle: false,
    });
    expect(report.targetingProbes).toHaveLength(2);
    expect(report.targetingProbes.every(({ targetingKind }) => targetingKind === 'rear-cone'))
      .toBe(true);
    expect(report.targetingProbes.every(({ behindTargetIds }) => (
      behindTargetIds.includes('flank-target')
    ))).toBe(true);
    expect(report.targetingProbes.every(({ frontTargetIds }) => frontTargetIds.length === 0))
      .toBe(true);
    expect(report.scenarios.every(({ hitCount }) => hitCount === 1)).toBe(true);
    expect(report.matchCoreReplay.replayFinalHash).toBe(report.matchCoreReplay.replayedFinalHash);
    expect(report.resultHash).toMatch(/^[0-9a-f]{8}$/);
  });
});
