import { describe, expect, it } from 'vitest';
import {
  runArenaSurvivalTenWaveMatchCoreVerificationCandidateV1,
  runArenaSurvivalTieredSupplyMatchCoreVerificationCandidateV1,
} from '../src/arena-survival-tiered-supply-matchcore-verification-v1.js';

describe('Arena survival tiered supply MatchCore verification candidate v1', () => {
  it('executes no-default → wave spawn → pickup → level action in one authority tick order', () => {
    const report = runArenaSurvivalTieredSupplyMatchCoreVerificationCandidateV1();
    expect(report.candidateStatus).toBe('production-unreachable');
    expect(report.hardGate).toBe(false);
    expect(report.usesMatchCoreV5Authority).toBe(true);
    expect(report.usesRealTieredSupplyTimeline).toBe(true);
    expect(report.usesUnarmedFallback).toBe(true);
    expect(report.executesSameTickPickupBeforeAction).toBe(true);
    expect(report.projectsV3SupplyIdentityFromTierPolicy).toBe(true);
    expect(report.composesMatchReadFrameV3).toBe(true);
    expect(report.exercisesHeadlessReplay).toBe(true);
    expect(report.exercisesP2ModeLifecycle).toBe(false);
    expect(report.noEquipmentBeforeFirstSpawn).toBe(true);
    expect(report.firstSpawnTick).toBe(1_200);
    expect(report.attackTick).toBe(1_200);
    expect(report.pickedRuntimeEquipmentDefinitionId).toContain(
      'charge-shield.survival.level-1.candidate.v1',
    );
    expect(report.pickedSurvivalLevel).toBe(1);
    expect(report.equipmentSpawnedEventCount).toBe(3);
    expect(report.equipmentPickedUpEventCount).toBe(1);
    expect(report.actionStartedEventCount).toBeGreaterThanOrEqual(1);
    expect(report.hitResolvedEventCount).toBeGreaterThanOrEqual(1);
    expect(report.knockbackAppliedEventCount).toBeGreaterThanOrEqual(1);
    expect(report.v3WorldSupplyCountAfterPickup).toBe(2);
    expect(report.v3HeldCollectionEquipmentDefinitionId).toBe(
      'arena-v2.weapon.charge-shield.candidate.v1',
    );
    expect(report.v3HeldRuntimeEquipmentDefinitionId).toContain(
      'charge-shield.survival.level-1.candidate.v1',
    );
    expect(report.v3HeldSurvivalLevel).toBe(1);
    expect(report.v3ReadFrameHash).toMatch(/^[0-9a-f]{8}$/);
    expect(report.replayedFinalHash).toBe(report.replayFinalHash);
    expect(report.replayEventCount).toBeGreaterThan(0);
    expect(report.replayInputFrameCount).toBeGreaterThan(0);
    expect(report.resultHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('repeats with identical deterministic output', () => {
    expect(runArenaSurvivalTieredSupplyMatchCoreVerificationCandidateV1().resultHash).toBe(
      runArenaSurvivalTieredSupplyMatchCoreVerificationCandidateV1().resultHash,
    );
  });

  it('automatically replaces level 1 through 10 across three replayed seeds', () => {
    const report = runArenaSurvivalTenWaveMatchCoreVerificationCandidateV1();
    expect(report.usesRealTenWaveSupplyTimeline).toBe(true);
    expect(report.usesAutomaticProximityReplacement).toBe(true);
    expect(report.exercisesFormalModeLifecycle).toBe(false);
    expect(report.seedReports).toHaveLength(3);
    for (const seed of report.seedReports) {
      expect(seed.pickedWaveLevels).toEqual(report.expectedWaveLevels);
      expect(seed.finalSurvivalLevel).toBe(10);
      expect(seed.finalCollectionEquipmentDefinitionId).toBe(
        'arena-v2.weapon.burst-gauntlet.candidate.v1',
      );
      expect(seed.equipmentSpawnedEventCount).toBe(30);
      expect(seed.equipmentPickedUpEventCount).toBe(10);
      expect(seed.equipmentReplacedEventCount).toBe(9);
      expect(seed.replayedFinalHash).toBe(seed.replayFinalHash);
      expect(seed.inputFrameCount).toBeGreaterThan(0);
    }
    expect(report.resultHash).toMatch(/^[0-9a-f]{8}$/);
  });
});
