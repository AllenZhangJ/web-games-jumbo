import { describe, expect, it } from 'vitest';
import {
  runArenaSurvivalWeaponTierConsequenceVerificationCandidateV1,
} from '../src/arena-survival-weapon-tier-consequence-verification-v1.js';

describe('Arena survival weapon tier consequence verification candidate v1', () => {
  it('runs level one and ten through the same real rule/physics consequence chain', () => {
    const report = runArenaSurvivalWeaponTierConsequenceVerificationCandidateV1();
    expect(report.candidateStatus).toBe('production-unreachable');
    expect(report.hardGate).toBe(false);
    expect(report.usesRealRulePhysicsConsequenceRunner).toBe(true);
    expect(report.comparesLevels).toEqual([1, 10]);
    expect(report.semanticsLocked).toBe(true);
    expect(report.addsInput).toBe(false);
    expect(report.addsAction).toBe(false);
    expect(report.exercisesP2ModeLifecycle).toBe(false);
    expect(report.runs).toHaveLength(6);

    for (const run of report.runs) {
      expect(run.scenarioCount).toBe(4);
      expect(run.actionStartedCount).toBe(4);
      expect(run.hitCount).toBeGreaterThanOrEqual(4);
      expect(run.whiffHitCount).toBe(0);
      expect(run.cooldownRejectedCount).toBe(4);
      expect(run.interruptCommittedCount).toBe(4);
      expect(run.movementCommandExecutedCount).toBe(2);
      expect(run.hitstunTicks.every((ticks) => ticks > 0)).toBe(true);
      expect(run.scenarioHashes).toHaveLength(4);
      expect(run.resultHash).toMatch(/^[0-9a-f]{8}$/);
    }

    for (const weaponId of ['heavy-hammer', 'gravity-chain', 'charge-shield']) {
      const levelOne = report.runs.find((run) => (
        run.weaponId === weaponId && run.survivalLevel === 1
      ));
      const levelTen = report.runs.find((run) => (
        run.weaponId === weaponId && run.survivalLevel === 10
      ));
      expect(levelOne).toBeDefined();
      expect(levelTen).toBeDefined();
      expect(levelTen!.runtimeContentHash).not.toBe(levelOne!.runtimeContentHash);
      expect(levelTen!.scenarioHashes).not.toEqual(levelOne!.scenarioHashes);
    }
    const shieldOne = report.runs.find((run) => (
      run.weaponId === 'charge-shield' && run.survivalLevel === 1
    ))!;
    const shieldTen = report.runs.find((run) => (
      run.weaponId === 'charge-shield' && run.survivalLevel === 10
    ))!;
    expect(Math.max(...shieldTen.hitstunTicks)).toBeGreaterThan(
      Math.max(...shieldOne.hitstunTicks),
    );
  });

  it('is deterministic across repeated complete runs', () => {
    expect(runArenaSurvivalWeaponTierConsequenceVerificationCandidateV1().resultHash).toBe(
      runArenaSurvivalWeaponTierConsequenceVerificationCandidateV1().resultHash,
    );
  });
});
