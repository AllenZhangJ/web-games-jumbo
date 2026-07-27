import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponTrueHadesHookScytheReplayPrototype } from '../src/index.js';

describe('Arena V2 true Hades hook scythe Replay prototype', () => {
  it('verifies staged commitment, release cancellation and support-surface consequences', () => {
    const result = runArenaV2WeaponTrueHadesHookScytheReplayPrototype();
    expect(result.scenarios.map(({ scenario }) => scenario)).toEqual([
      'early-release',
      'committed-release',
      'expired-hold',
      'committed-edge',
    ]);

    const earlyRelease = result.scenarios[0]!;
    const committedRelease = result.scenarios[1]!;
    const expiredHold = result.scenarios[2]!;
    const committedEdge = result.scenarios[3]!;

    expect(earlyRelease).toMatchObject({
      commitmentOutcome: 'cancelled',
      firstHitTick: null,
      fallTick: null,
      feedback: { kind: 'commitment-cancelled' },
    });
    expect(committedRelease).toMatchObject({
      commitmentOutcome: 'committed',
      actionStartTick: 1,
      commitmentTick: 9,
      firstHitTick: expect.any(Number),
      fallTick: null,
      feedback: { kind: 'hit-safe' },
    });
    expect(expiredHold).toMatchObject({
      commitmentOutcome: 'cancelled',
      firstHitTick: null,
      fallTick: null,
      feedback: { kind: 'commitment-cancelled' },
    });
    expect(committedEdge).toMatchObject({
      commitmentOutcome: 'committed',
      firstHitTick: expect.any(Number),
      fallTick: expect.any(Number),
      feedback: { kind: 'hit-ring-out' },
    });
    expect(committedEdge.targetHorizontalDisplacement).toBeGreaterThan(0);
    expect(result.scenarios.every(({ replayVerified, finalHash, inputFrameCount }) => (
      replayVerified && finalHash.length > 0 && inputFrameCount > 0
    ))).toBe(true);
  });

  it('is deterministic and keeps replay samples frozen', () => {
    const first = runArenaV2WeaponTrueHadesHookScytheReplayPrototype();
    const second = runArenaV2WeaponTrueHadesHookScytheReplayPrototype();
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.scenarios)).toBe(true);
    expect(Object.isFrozen(first.scenarios[0]?.actionStateSamples)).toBe(true);
  });
});
