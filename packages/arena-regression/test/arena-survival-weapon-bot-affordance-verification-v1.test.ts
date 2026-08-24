import { describe, expect, it } from 'vitest';
import {
  runArenaSurvivalWeaponBotAffordanceVerificationCandidateV1,
} from '../src/arena-survival-weapon-bot-affordance-verification-v1.js';

describe('Arena survival weapon bot affordance verification candidate v1', () => {
  it('lets the restricted bot consume tier range/readiness and emit only ordinary InputFrame', () => {
    const report = runArenaSurvivalWeaponBotAffordanceVerificationCandidateV1();
    expect(report.candidateStatus).toBe('production-unreachable');
    expect(report.hardGate).toBe(false);
    expect(report.consumesRestrictedObservation).toBe(true);
    expect(report.emitsOnlyInputFrame).toBe(true);
    expect(report.readsNoMatchCore).toBe(true);
    expect(report.writesNoHitOrMovement).toBe(true);
    expect(report.exercisesP2ModeLifecycle).toBe(false);
    expect(report.runs).toHaveLength(6);
    expect(report.runs.every(({ ordinaryInputKeysOnly }) => ordinaryInputKeysOnly)).toBe(true);
    expect(report.runs.every(({ cooldownBlocksPrimary }) => cooldownBlocksPrimary)).toBe(true);

    for (const weaponId of ['heavy-hammer', 'gravity-chain']) {
      expect(report.runs.find((run) => (
        run.weaponId === weaponId && run.survivalLevel === 1
      ))?.primaryPressed).toBe(false);
      expect(report.runs.find((run) => (
        run.weaponId === weaponId && run.survivalLevel === 10
      ))?.primaryPressed).toBe(true);
    }
    expect(report.runs.filter(({ weaponId }) => weaponId === 'charge-shield').every(
      ({ primaryPressed }) => primaryPressed,
    )).toBe(true);
    expect(report.resultHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('repeats with identical deterministic output', () => {
    expect(runArenaSurvivalWeaponBotAffordanceVerificationCandidateV1().resultHash).toBe(
      runArenaSurvivalWeaponBotAffordanceVerificationCandidateV1().resultHash,
    );
  });
});
