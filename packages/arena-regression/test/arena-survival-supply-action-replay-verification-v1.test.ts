import { describe, expect, it } from 'vitest';
import {
  runArenaSurvivalSupplyActionReplayVerificationCandidateV1,
} from '../src/arena-survival-shared-world-authority-verification-v1.js';

describe('Arena Survival supply action Replay verification candidate V1', () => {
  it('drives real first-wave supply pickup through held equipment and ActionStarted into the existing time-cap Replay', () => {
    const first = runArenaSurvivalSupplyActionReplayVerificationCandidateV1({
      matchSeed: 0x5033_1001,
    });
    const second = runArenaSurvivalSupplyActionReplayVerificationCandidateV1({
      matchSeed: 0x5033_1001,
    });

    expect(second).toEqual(first);
    expect(first.supplyId).toContain(':wave-0:');
    expect(first.equipmentInstanceId).toBe(`${first.supplyId}:equipment`);
    expect(first.runtimeEquipmentDefinitionId).toBeTruthy();
    expect(first.collectionEquipmentDefinitionId).toBeTruthy();
    expect(first.survivalLevel).toBeGreaterThanOrEqual(1);
    expect(first.actionId).toBeTruthy();
    expect(first.actionTick).toBeGreaterThanOrEqual(1_200);
    expect(first.executedTicks).toBeGreaterThan(first.actionTick);
    expect(first.modeResultReason).toBe('survival-time-cap');
    expect(first.replayIdentityHash).toMatch(/^[0-9a-f]{8}$/u);
    expect(first.finalHash).toMatch(/^[0-9a-f]{8}$/u);
    expect(first.retainedResourceCountAfterDestroy).toBe(0);
  }, 30_000);
});
