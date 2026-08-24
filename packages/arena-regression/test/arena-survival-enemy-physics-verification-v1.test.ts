import { describe, expect, it } from 'vitest';
import {
  ARENA_SURVIVAL_ENEMY_PHYSICS_VERIFICATION_PLAN_CANDIDATE_V1,
  runArenaSurvivalEnemyPhysicsVerificationCandidateV1,
} from '../src/arena-survival-enemy-physics-verification-v1.js';

describe('Arena Survival enemy physics verification candidate V1', () => {
  it('declares the 1/4/8/12/16 pressure matrix without claiming combat or mode lifecycle', () => {
    expect(ARENA_SURVIVAL_ENEMY_PHYSICS_VERIFICATION_PLAN_CANDIDATE_V1).toMatchObject({
      status: 'production-unreachable',
      hardGate: false,
      enemyCounts: [1, 4, 8, 12, 16],
      ticksPerScenario: 480,
      controllerRestoreTick: 240,
      usesSharedPhysics: true,
      usesObservationInputBoundary: true,
      exercisesCombatResolution: false,
      exercisesSurvivalModeLifecycle: false,
    });
  });

  it('routes one enemy family through Observation to InputFrame and shared physics', () => {
    const report = runArenaSurvivalEnemyPhysicsVerificationCandidateV1();
    expect(report.candidateStatus).toBe('production-unreachable');
    expect(report.scenarios.map(({ enemyCount }) => enemyCount)).toEqual([1, 4, 8, 12, 16]);
    for (const scenario of report.scenarios) {
      expect(scenario.executedTicks).toBe(480);
      expect(scenario.inputFrameCount).toBe(scenario.enemyCount * scenario.executedTicks);
      expect(scenario.controllerRestoreCount).toBe(scenario.enemyCount);
      expect(scenario.enemyReports).toHaveLength(scenario.enemyCount);
      expect(scenario.enemyReports.every(({ inputFrameCount }) => inputFrameCount === 480)).toBe(true);
      expect(scenario.enemyReports.every(({ movementFrameCount }) => movementFrameCount > 0)).toBe(true);
      expect(scenario.enemyReports.every(({ minimumPlayerDistance }) => (
        Number.isFinite(minimumPlayerDistance)
      ))).toBe(true);
    }
  });

  it('keeps controller restore and multi-enemy movement deterministic', () => {
    const first = runArenaSurvivalEnemyPhysicsVerificationCandidateV1();
    const second = runArenaSurvivalEnemyPhysicsVerificationCandidateV1();
    expect(second).toEqual(first);
    expect(second.resultHash).toBe(first.resultHash);
  });
});
