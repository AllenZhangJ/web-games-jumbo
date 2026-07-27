import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponPhantomTigerFistEdgeReplayPrototype } from '../src/index.js';

describe('Arena V2 phantom tiger fist edge Replay prototype', () => {
  it('connects committed hit, platform boundary and elimination feedback', () => {
    const result = runArenaV2WeaponPhantomTigerFistEdgeReplayPrototype();
    expect(result).toMatchObject({
      candidateId: 'case-study-phantom-tiger-fist',
      usesTwoParticipantMatchCoreBoundary: true,
      result: {
        weaponId: 'research-phantom-tiger-fist',
        actionDefinitionId: 'research-phantom-tiger-fist-ground',
        platformHalfWidth: 4,
        targetStartX: 3.4,
        actionStartTick: 1,
        commitmentTick: 13,
        firstHitTick: 21,
        replayVerified: true,
      },
    });
    expect(result.result.outcome).toBe('hit-ring-out');
    expect(result.result.eliminatedParticipantIds).toContain('player-2');
    expect(result.result.feedback).toMatchObject({ kind: 'hit-ring-out' });
    expect(result.result.targetHorizontalDisplacement).toBeGreaterThan(0);
  });

  it('is deterministic across repeated map-edge probes', () => {
    expect(runArenaV2WeaponPhantomTigerFistEdgeReplayPrototype())
      .toEqual(runArenaV2WeaponPhantomTigerFistEdgeReplayPrototype());
  });
});
