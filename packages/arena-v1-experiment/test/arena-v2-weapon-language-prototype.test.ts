import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponLanguagePrototype } from '../src/index.js';

describe('Arena V2 weapon language prototype', () => {
  it('runs five candidate languages through Rule/Effect registries', () => {
    const result = runArenaV2WeaponLanguagePrototype();
    expect(result.candidateCount).toBe(5);
    expect(result.policies).toEqual(['hold', 'step-out']);
    expect(result.persistentAreaEffectImplemented).toBe(false);
    expect(result.results).toHaveLength(10);
    for (const weaponId of [
      'research-line-pressure',
      'research-zone-denial',
      'research-delayed-heavy',
      'research-read-punish',
      'research-flank',
    ]) {
      const hold = result.results.find(({ weaponId: id, policy }) => id === weaponId && policy === 'hold');
      const stepOut = result.results.find(({ weaponId: id, policy }) => id === weaponId && policy === 'step-out');
      expect(hold?.outcome).toBe('hit');
      expect(hold?.firstHitTick).not.toBeNull();
      expect(hold?.horizontalImpulse).toBeGreaterThan(0);
      expect(stepOut?.outcome).toBe('miss');
      expect(stepOut?.firstHitTick).toBeNull();
      expect(stepOut?.responseTicks).toBeGreaterThan(0);
    }
  });

  it('keeps warning lead and language identity visible as research evidence', () => {
    const result = runArenaV2WeaponLanguagePrototype();
    const byId = new Map(result.results.map((probe) => [
      `${probe.weaponId}:${probe.policy}`,
      probe,
    ]));
    expect(byId.get('research-line-pressure:hold')).toMatchObject({
      languageId: 'line-pressure',
      responseTicks: 8,
      actionDefinitionId: 'research-line-pressure-ground',
    });
    expect(byId.get('research-zone-denial:hold')?.responseTicks).toBe(24);
    expect(byId.get('research-delayed-heavy:hold')?.responseTicks).toBe(30);
    expect(byId.get('research-read-punish:hold')).toMatchObject({
      languageId: 'read-punish',
      responseTicks: 18,
      actionDefinitionId: 'research-read-punish-ground',
    });
    expect(byId.get('research-flank:hold')).toMatchObject({
      languageId: 'flank',
      responseTicks: 10,
      actionDefinitionId: 'research-flank-ground',
    });
  });
});
