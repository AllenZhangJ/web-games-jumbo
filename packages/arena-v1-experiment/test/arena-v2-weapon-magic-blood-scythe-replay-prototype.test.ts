import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponMagicBloodScytheReplayPrototype } from '../src/index.js';

describe('Arena V2 magic blood scythe Replay prototype', () => {
  it('verifies safe hit, route escape and support-surface consequence', () => {
    const result = runArenaV2WeaponMagicBloodScytheReplayPrototype();
    expect(result.scenarios.map(({ scenario }) => scenario)).toEqual([
      'ground-hit-safe',
      'ground-leaves-line',
      'ground-edge',
    ]);
    expect(result.scenarios[0]).toMatchObject({
      actionStartTick: 1,
      firstHitTick: expect.any(Number),
      fallTick: null,
      feedback: { kind: 'hit-safe' },
    });
    expect(result.scenarios[1]).toMatchObject({
      firstHitTick: null,
      fallTick: null,
      feedback: { kind: 'attack-evaded' },
    });
    expect(result.scenarios[2]).toMatchObject({
      firstHitTick: expect.any(Number),
      fallTick: expect.any(Number),
      feedback: { kind: 'hit-ring-out' },
    });
    expect(result.scenarios.every(({ replayVerified, finalHash, inputFrameCount }) => (
      replayVerified && finalHash.length > 0 && inputFrameCount > 0
    ))).toBe(true);
  });

  it('is deterministic and keeps replay samples frozen', () => {
    const first = runArenaV2WeaponMagicBloodScytheReplayPrototype();
    const second = runArenaV2WeaponMagicBloodScytheReplayPrototype();
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.scenarios)).toBe(true);
    expect(Object.isFrozen(first.scenarios[0]?.actionStateSamples)).toBe(true);
  });
});
