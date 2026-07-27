import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponMultiplayerEdgeReplayPrototype } from '../src/index.js';

describe('Arena V2 weapon multiplayer edge Replay prototype', () => {
  it('runs all three research candidates through the two-participant edge boundary', () => {
    const result = runArenaV2WeaponMultiplayerEdgeReplayPrototype();
    expect(result).toMatchObject({
      candidateCount: 3,
      usesTwoParticipantMatchCoreBoundary: true,
      platformHalfWidth: 3.5,
      results: expect.arrayContaining([
        expect.objectContaining({
          weaponId: 'research-line-pressure',
          replayVerified: true,
        }),
        expect.objectContaining({
          weaponId: 'research-read-punish',
          replayVerified: true,
        }),
        expect.objectContaining({
          weaponId: 'research-flank',
          replayVerified: true,
        }),
      ]),
    });
    expect(result.results.every(({ hits, actionStartTicks }) => (
      hits.length > 0 && Object.keys(actionStartTicks).length === 2
    ))).toBe(true);
    expect(result.results.every(({ checkpointCount, inputFrameCount }) => (
      checkpointCount > 0 && inputFrameCount > 0
    ))).toBe(true);
  });

  it('is deterministic and preserves the edge consequence across reruns', () => {
    const first = runArenaV2WeaponMultiplayerEdgeReplayPrototype();
    const second = runArenaV2WeaponMultiplayerEdgeReplayPrototype();
    expect(first).toEqual(second);
    expect(first.results.map(({ outcome }) => outcome)).toEqual([
      'player-2-ring-out',
      'no-elimination',
      'no-elimination',
    ]);
    expect(first.results.map(({ feedback }) => feedback.kind)).toEqual([
      'hit-ring-out',
      'hit-confirm',
      'hit-confirm',
    ]);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.results)).toBe(true);
  });
});
