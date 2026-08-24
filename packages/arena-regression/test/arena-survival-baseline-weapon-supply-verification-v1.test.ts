import { describe, expect, it } from 'vitest';
import {
  runArenaSurvivalBaselineWeaponSupplyVerificationCandidateV1,
} from '../src/arena-survival-baseline-weapon-supply-verification-v1.js';

describe('Arena survival baseline weapon supply verification candidate v1', () => {
  it('uses real supply authority for no-default, spawn, expiry, pickup, replacement, and tiers', () => {
    const report = runArenaSurvivalBaselineWeaponSupplyVerificationCandidateV1();
    expect(report.candidateStatus).toBe('production-unreachable');
    expect(report.hardGate).toBe(false);
    expect(report.usesRealEquipmentSystem).toBe(true);
    expect(report.usesRealSupplyTimeline).toBe(true);
    expect(report.usesWaveRuntimeOverrides).toBe(true);
    expect(report.exercisesP2ModeLifecycle).toBe(false);
    expect(report.noEquipmentBeforeFirstSpawn).toBe(true);
    expect(report.firstWaveIndex).toBe(0);
    expect(report.firstWaveSpawnTick).toBe(1_200);
    expect(report.firstWaveSpawnCount).toBe(3);
    expect(report.firstWaveRuntimeEquipmentDefinitionIds).toHaveLength(3);
    expect(report.firstWaveRuntimeEquipmentDefinitionIds.every((id) => (
      id.includes('.survival.level-1.candidate.v1')
    ))).toBe(true);
    expect(report.firstPickupKind).toBe('picked-up');
    expect(report.firstPickupEquipmentDefinitionId).toContain(
      'charge-shield.survival.level-1.candidate.v1',
    );
    expect(report.secondWaveIndex).toBe(1);
    expect(report.secondWaveSpawnTick).toBe(2_400);
    expect(report.secondWaveRuntimeEquipmentDefinitionIds.every((id) => (
      id.includes('.survival.level-2.candidate.v1')
    ))).toBe(true);
    expect(report.replacementKind).toBe('replaced');
    expect(report.replacementEquipmentDefinitionId).toContain(
      'read-counter.survival.level-2.candidate.v1',
    );
    expect(report.replacementEventTypes).toEqual([
      'EquipmentRecycled', 'EquipmentReplaced',
    ]);
    expect(report.tenthWaveIndex).toBe(9);
    expect(report.tenthWaveSpawnTick).toBe(12_000);
    expect(report.tenthWaveRuntimeEquipmentDefinitionIds.every((id) => (
      id.includes('.survival.level-10.candidate.v1')
    ))).toBe(true);
    expect(report.worldExpiryEventCount).toBeGreaterThan(0);
    expect(report.expiredHeldSupplyCount).toBe(1);
    expect(report.resultHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('repeats with the same deterministic result', () => {
    expect(runArenaSurvivalBaselineWeaponSupplyVerificationCandidateV1().resultHash).toBe(
      runArenaSurvivalBaselineWeaponSupplyVerificationCandidateV1().resultHash,
    );
  });
});
