import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponLaunchReplayPrototype } from '../src/index.js';

describe('Arena V2 line-pressure launch Replay prototype', () => {
  it('runs the candidate through the real MatchCore Replay schema', () => {
    const result = runArenaV2WeaponLaunchReplayPrototype();
    expect(result).toMatchObject({
      candidateId: 'launch-04-line-pressure',
      weaponId: 'research-line-pressure',
      groundActionDefinitionId: 'research-line-pressure-ground',
      replaySchemaVersion: 5,
      replayVerified: true,
    });
    expect(result.checkpointCount).toBeGreaterThan(1);
    expect(result.inputFrameCount).toBeGreaterThan(0);
    expect(result.actionStartTick).not.toBeNull();
    expect(result.firstHitTick).not.toBeNull();
  });

  it('proves the formal action lifecycle is visible in the authority snapshot', () => {
    const result = runArenaV2WeaponLaunchReplayPrototype();
    expect(result.actionPhaseSequence).toEqual([
      'idle',
      'windup',
      'active',
      'recovery',
    ]);
    expect(result.actionStateSamples.some(({ definitionId, phase }) => (
      definitionId === 'research-line-pressure-ground' && phase === 'active'
    ))).toBe(true);
  });

  it('is deterministic across two candidate replay generations', () => {
    expect(runArenaV2WeaponLaunchReplayPrototype())
      .toEqual(runArenaV2WeaponLaunchReplayPrototype());
  });
});
