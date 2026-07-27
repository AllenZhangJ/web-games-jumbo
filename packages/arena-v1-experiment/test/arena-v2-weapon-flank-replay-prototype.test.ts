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
    expect(result.scenarios[2]).toMatchObject({
      scenario: 'turn-twice-before-active',
      actionStartTick: 1,
      firstActiveTick: 12,
      firstHitTick: 11,
      targetFacingBeforeActive: 1,
      targetFacingAtActive: 1,
      replayVerified: true,
    });
    expect(result.scenarios[2]?.actionStateSamples).toEqual(expect.arrayContaining([
      expect.objectContaining({ tick: 9, targetFacingX: -1 }),
      expect.objectContaining({ tick: 11, targetFacingX: 1 }),
      expect.objectContaining({ tick: 12, phase: 'active', targetFacingX: 1 }),
    ]));
    expect(result.scenarios[3]).toMatchObject({
      scenario: 'side-entry',
      actionStartTick: 24,
      firstActiveTick: 35,
      firstHitTick: 34,
      targetFacingAtActive: -1,
      rearAlignmentAtStart: expect.closeTo(-0.624695, 5),
      rearAlignmentAtActive: expect.closeTo(-0.800204, 5),
      finalHash: 'ef8764cd',
      replayVerified: true,
    });
    expect(result.scenarios[3]?.actionStateSamples).toEqual(expect.arrayContaining([
      expect.objectContaining({
        tick: 0,
        attackerPosition: { x: 1.2, z: 1.5 },
      }),
      expect.objectContaining({
        tick: 35,
        phase: 'active',
        attackerPosition: { x: 1.2, z: -0.9000000000000005 },
      }),
    ]));
  });

  it('is deterministic across active-turn and side-entry scenarios', () => {
    expect(runArenaV2WeaponFlankReplayPrototype())
      .toEqual(runArenaV2WeaponFlankReplayPrototype());
  });
});
