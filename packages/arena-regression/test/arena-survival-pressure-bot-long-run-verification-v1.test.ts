import { describe, expect, it } from 'vitest';
import {
  runArenaSurvivalPressureBotLongRunVerificationCandidateV1,
} from '../src/arena-survival-pressure-bot-long-run-verification-v1.js';

describe('Arena survival pressure Bot long-run verification candidate v1', () => {
  it('keeps 16 same-family enemies on ordinary InputFrames through all ten stages', () => {
    const report = runArenaSurvivalPressureBotLongRunVerificationCandidateV1();
    expect(report.candidateStatus).toBe('production-unreachable');
    expect(report.hardGate).toBe(false);
    expect(report.usesSingleEnemyFamily).toBe(true);
    expect(report.usesOrdinaryInputFramesOnly).toBe(true);
    expect(report.writesNoHitPickupOrMovementAuthority).toBe(true);
    expect(report.exercisesFormalModeLifecycle).toBe(false);
    expect(report.simulatedTickCount).toBe(10_801);
    expect(report.configuredEnemySlotCount).toBe(16);
    expect(report.finalActiveEnemyCount).toBe(16);
    expect(report.totalInputFrameCount).toBe(10_801 * 16);
    expect(report.activePrimaryPressCount).toBeGreaterThan(0);
    expect(report.inactiveNonNeutralFrameCount).toBe(0);
    expect(report.stageReports.map(({ activeInputFrameCount }) => activeInputFrameCount)).toEqual(
      [1, 2, 3, 4, 5, 6, 8, 10, 12, 16],
    );
    expect(report.restoredContinuationHash).toBe(report.checkpointContinuationHash);
    expect(report.resultHash).toMatch(/^[0-9a-f]{8}$/);
  });
});
