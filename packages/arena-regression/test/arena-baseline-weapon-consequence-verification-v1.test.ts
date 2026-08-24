import { describe, expect, it } from 'vitest';
import {
  runArenaBaselineWeaponConsequenceVerificationCandidateV1,
} from '../src/arena-baseline-weapon-consequence-verification-v1.js';

describe('Arena P4 baseline weapon consequence verification candidate V1', () => {
  it('covers three weapons across ground/aerial and edge/narrow situations', () => {
    const report = runArenaBaselineWeaponConsequenceVerificationCandidateV1();
    expect(report).toMatchObject({
      candidateStatus: 'production-unreachable',
      hardGate: false,
      usesArenaRuleEngine: true,
      usesEquipmentSystem: true,
      usesSharedPhysics: true,
      exercisesGroundAndAerialContexts: true,
      exercisesInterruption: true,
      exercisesMovementCommandExecution: true,
      exercisesIntegratedAerialTickOrder: true,
      usesAuthorityWeaponFeedbackResolver: true,
      exercisesReplayCheckpoint: false,
      exercisesModeLifecycle: false,
    });
    expect(report.scenarios).toHaveLength(12);
    expect(new Set(report.scenarios.map(({ weaponId }) => weaponId)))
      .toEqual(new Set(['heavy-hammer', 'gravity-chain', 'charge-shield']));
    expect(new Set(report.scenarios.map(({ context }) => context)))
      .toEqual(new Set(['ground', 'aerial']));
    expect(new Set(report.scenarios.map(({ mapSituation }) => mapSituation)))
      .toEqual(new Set(['edge', 'narrow-path']));
  });

  it('routes starts, hits, cooldown rejection and whiffs through the real rule chain', () => {
    const report = runArenaBaselineWeaponConsequenceVerificationCandidateV1();
    for (const scenario of report.scenarios) {
      expect(scenario.selectedFromEquipmentSystem).toBe(true);
      expect(scenario.actionStarted).toBe(true);
      expect(scenario.hitCount).toBe(1);
      expect(scenario.recordedHitCount).toBe(1);
      expect(scenario.hitstunTicks).toBeGreaterThan(0);
      expect(scenario.appliedImpulses.some(({ participantId }) => (
        participantId === 'arena-p4-target'
      ))).toBe(true);
      expect(scenario.cooldownRejected).toBe(true);
      expect(scenario.interruptTargetWasActive).toBe(true);
      expect(scenario.interruptCommitted).toBe(true);
      expect(scenario.whiffStarted).toBe(true);
      expect(scenario.whiffHitCount).toBe(0);
      expect(scenario.whiffFeedbackSemantic.kind).toBe('attack-evaded');
      expect(scenario.targetMaximumHorizontalDisplacement).toBeGreaterThan(0);
      expect(scenario.resultHash).toMatch(/^[0-9a-f]{8}$/);
      expect(scenario.context === 'aerial' ? scenario.movementCommandCount : 0)
        .toBe(scenario.context === 'aerial' ? 1 : 0);
      expect(scenario.movementCommandExecuted).toBe(scenario.context === 'aerial');
      expect([
        'hit-confirm',
        'hit-surface-transfer',
        'hit-ring-out',
      ]).toContain(scenario.feedbackSemantic.kind);
    }
    expect(report.movementFallFeedbackSemantic.kind).toBe('movement-fall');
  });

  it('is deterministic for the same definitions and map', () => {
    const first = runArenaBaselineWeaponConsequenceVerificationCandidateV1();
    const second = runArenaBaselineWeaponConsequenceVerificationCandidateV1();
    expect(first.resultHash).toBe(second.resultHash);
    expect(first.scenarios.map(({ resultHash }) => resultHash))
      .toEqual(second.scenarios.map(({ resultHash }) => resultHash));
  });
});
