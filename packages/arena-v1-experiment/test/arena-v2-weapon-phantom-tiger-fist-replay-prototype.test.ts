import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponPhantomTigerFistReplayPrototype } from '../src/index.js';

describe('Arena V2 phantom tiger fist Replay prototype', () => {
  it('proves early release, committed release and expiry cancellation in MatchCore', () => {
    const result = runArenaV2WeaponPhantomTigerFistReplayPrototype();
    expect(result).toMatchObject({
      candidateId: 'case-study-phantom-tiger-fist',
      weaponId: 'research-phantom-tiger-fist',
      groundActionDefinitionId: 'research-phantom-tiger-fist-ground',
    });
    expect(result.scenarios.map(({ scenario }) => scenario)).toEqual([
      'early-release',
      'committed-release',
      'expired-hold',
    ]);
    expect(result.scenarios[0]).toMatchObject({
      actionStartTick: 1,
      commitmentOutcome: 'cancelled',
      commitmentTick: 9,
      firstHitTick: null,
      replayVerified: true,
    });
    expect(result.scenarios[1]).toMatchObject({
      actionStartTick: 1,
      commitmentOutcome: 'committed',
      commitmentTick: 13,
      replayVerified: true,
    });
    expect(result.scenarios[2]).toMatchObject({
      actionStartTick: 1,
      commitmentOutcome: 'cancelled',
      replayVerified: true,
    });
    expect(result.scenarios[1]?.firstHitTick).not.toBeNull();
    expect(result.scenarios[2]?.firstHitTick).toBeNull();
  });

  it('exposes charge level and position samples in the authority snapshot', () => {
    const result = runArenaV2WeaponPhantomTigerFistReplayPrototype();
    const committed = result.scenarios.find(({ scenario }) => scenario === 'committed-release');
    expect(committed?.actionStateSamples).toEqual(expect.arrayContaining([
      expect.objectContaining({
        phase: 'windup',
        commitmentStatus: 'charging',
        chargeTicks: 6,
        chargeLevel: 1,
      }),
      expect.objectContaining({
        phase: 'windup',
        commitmentStatus: 'committed',
        chargeTicks: 12,
        chargeLevel: 2,
      }),
    ]));
    expect(committed?.actionStateSamples.every(({ positionX, positionZ }) => (
      Number.isFinite(positionX) && Number.isFinite(positionZ)
    ))).toBe(true);
  });

  it('is deterministic across all three candidate scenarios', () => {
    expect(runArenaV2WeaponPhantomTigerFistReplayPrototype())
      .toEqual(runArenaV2WeaponPhantomTigerFistReplayPrototype());
  });
});
