import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponCommitmentPrototype } from '../src/index.js';

describe('Arena V2 weapon commitment prototype', () => {
  it('makes early release, committed release and expiry distinct', () => {
    const result = runArenaV2WeaponCommitmentPrototype();
    expect(result.profileCount).toBe(2);
    expect(result.probes).toHaveLength(6);
    for (const profile of result.profiles) {
      const probes = result.probes.filter(({ profileId }) => profileId === profile.id);
      expect(probes.map(({ caseId }) => caseId)).toEqual([
        'early-release',
        'committed-turn',
        'expiry',
      ]);
      expect(probes[0]).toMatchObject({ outcome: 'early-cancel' });
      expect(probes[1]).toMatchObject({
        outcome: 'committed',
        chargeTicks: profile.commitTicks,
        chargeLevel: profile.levelThresholds.length,
        resultTick: profile.commitTicks,
      });
      expect(probes[2]).toMatchObject({
        outcome: 'expired-cancel',
        chargeTicks: profile.expireTicks,
        resultTick: profile.expireTicks,
      });
    }
  });

  it('keeps direction inside the commitment rules instead of presentation', () => {
    const result = runArenaV2WeaponCommitmentPrototype();
    const readPunish = result.probes.find(({ profileId, caseId }) => (
      profileId === 'read-punish-charge' && caseId === 'committed-turn'
    ));
    const delayedHeavy = result.probes.find(({ profileId, caseId }) => (
      profileId === 'delayed-heavy-charge' && caseId === 'committed-turn'
    ));
    expect(readPunish).toMatchObject({ facingAtStart: -1, facingAtResult: 1 });
    expect(delayedHeavy).toMatchObject({ facingAtStart: -1, facingAtResult: -1 });
  });
});
