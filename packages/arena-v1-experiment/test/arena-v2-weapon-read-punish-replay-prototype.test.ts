import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponReadPunishReplayPrototype } from '../src/index.js';

describe('Arena V2 read-punish commitment Replay prototype', () => {
  it('proves early release, committed release and expiry cancellation in MatchCore', () => {
    const result = runArenaV2WeaponReadPunishReplayPrototype();
    expect(result).toMatchObject({
      candidateId: 'launch-05-read-punish',
      weaponId: 'research-read-punish',
      groundActionDefinitionId: 'research-read-punish-ground',
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
      firstHitTick: 25,
      replayVerified: true,
    });
    expect(result.scenarios[2]).toMatchObject({
      actionStartTick: 1,
      commitmentOutcome: 'cancelled',
      commitmentTick: 19,
      firstHitTick: null,
      replayVerified: true,
    });
  });

  it('exposes charge level and committed state in the authority snapshot', () => {
    const result = runArenaV2WeaponReadPunishReplayPrototype();
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
  });

  it('is deterministic across all three candidate scenarios', () => {
    expect(runArenaV2WeaponReadPunishReplayPrototype())
      .toEqual(runArenaV2WeaponReadPunishReplayPrototype());
  });
});
