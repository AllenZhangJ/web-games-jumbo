import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponWhitePlatinumDualGunsReplayPrototype } from '../src/index.js';

describe('Arena V2 white platinum dual guns Replay prototype', () => {
  it('proves the ground shot depends on staying inside the attack line', () => {
    const result = runArenaV2WeaponWhitePlatinumDualGunsReplayPrototype();
    expect(result.scenarios.map(({ scenario }) => scenario)).toEqual([
      'ground-shot-hit',
      'ground-shot-line-escape',
    ]);
    expect(result.scenarios[0]).toMatchObject({
      actionStartTick: 1,
      firstActiveTick: 13,
      firstHitTick: expect.any(Number),
      feedback: { kind: 'line-hit' },
    });
    expect(result.scenarios[1]).toMatchObject({
      actionStartTick: 1,
      firstActiveTick: 13,
      firstHitTick: null,
      feedback: { kind: 'line-escaped' },
    });
    expect(result.scenarios.every(({ replayVerified, finalHash, inputFrameCount }) => (
      replayVerified && finalHash.length > 0 && inputFrameCount > 0
    ))).toBe(true);
  });

  it('is deterministic and freezes the Replay evidence', () => {
    const first = runArenaV2WeaponWhitePlatinumDualGunsReplayPrototype();
    const second = runArenaV2WeaponWhitePlatinumDualGunsReplayPrototype();
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.scenarios)).toBe(true);
    expect(Object.isFrozen(first.scenarios[0]?.actionStateSamples)).toBe(true);
  });
});
