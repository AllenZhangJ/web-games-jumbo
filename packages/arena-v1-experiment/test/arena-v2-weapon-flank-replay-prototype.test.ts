import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponFlankReplayPrototype } from '../src/index.js';

describe('Arena V2 flank target-turn Replay prototype', () => {
  it('distinguishes keeping the back exposed from turning before active frames', () => {
    const result = runArenaV2WeaponFlankReplayPrototype();
    expect(result).toMatchObject({
      candidateId: 'launch-06-flank',
      weaponId: 'research-flank',
      groundActionDefinitionId: 'research-flank-ground',
    });
    expect(result.scenarios[0]).toMatchObject({
      scenario: 'keep-facing-away',
      actionStartTick: 1,
      firstActiveTick: 12,
      firstHitTick: 11,
      targetFacingAtActive: 1,
      replayVerified: true,
    });
    expect(result.scenarios[1]).toMatchObject({
      scenario: 'turn-to-attacker',
      actionStartTick: 1,
      firstActiveTick: 12,
      firstHitTick: null,
      targetFacingAtActive: -1,
      replayVerified: true,
    });
    expect(result.scenarios[1]?.actionStateSamples).toEqual(expect.arrayContaining([
      expect.objectContaining({ tick: 1, targetFacingX: 1 }),
      expect.objectContaining({ tick: 12, phase: 'active', targetFacingX: -1 }),
    ]));
  });

  it('is deterministic across active-turn scenarios', () => {
    expect(runArenaV2WeaponFlankReplayPrototype())
      .toEqual(runArenaV2WeaponFlankReplayPrototype());
  });
});
