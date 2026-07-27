import { describe, expect, it } from 'vitest';
import { runArenaV2KzLanguageConsequencePrototype } from '../src/index.js';

describe('Arena V2 KZ weapon language consequence prototype', () => {
  it('runs every candidate language through all six route surfaces and three responses', () => {
    const result = runArenaV2KzLanguageConsequencePrototype();
    expect(result.routeId).toBe('arena-v2-kz-base-route-prototype-v1');
    expect(result.usesSharedRuleAndPhysics).toBe(true);
    expect(result.candidateCount).toBe(3);
    expect(result.responsePolicies).toEqual(['hold', 'step-out', 'jump']);
    expect(result.probeCount).toBe(54);
    expect(new Set(result.probes.map(({ segmentId }) => segmentId)).size).toBe(6);
    expect(new Set(result.probes.map(({ weaponId }) => weaponId))).toEqual(new Set([
      'research-line-pressure',
      'research-zone-denial',
      'research-delayed-heavy',
    ]));
  });

  it('keeps route consequences visible as stable evidence instead of a visual-only label', () => {
    const result = runArenaV2KzLanguageConsequencePrototype();
    const byWeaponAndPolicy = (weaponId: string, responsePolicy: string) => new Set(
      result.probes
        .filter((probe) => probe.weaponId === weaponId && probe.responsePolicy === responsePolicy)
        .map(({ outcome, responseOutcome }) => `${outcome}:${responseOutcome}`),
    );
    expect(byWeaponAndPolicy('research-line-pressure', 'hold')).toEqual(new Set([
      'hit-safe:hit-safe',
      'hit-ring-out:hit-ring-out',
    ]));
    expect(byWeaponAndPolicy('research-zone-denial', 'hold')).toEqual(new Set([
      'hit-safe:hit-safe',
      'hit-ring-out:hit-ring-out',
    ]));
    expect(byWeaponAndPolicy('research-delayed-heavy', 'step-out')).toEqual(new Set([
      'miss:miss',
      'miss:movement-fall',
    ]));
    const warningZones = result.probes.filter(({ weaponId }) => weaponId === 'research-zone-denial');
    expect(warningZones.every(({ warningZone }) => warningZone !== null)).toBe(true);
    expect(warningZones.every(({ warningZone }) => (
      warningZone?.startsAtTick === 24
      && warningZone.expiresAtTickExclusive === 27
      && (warningZone.lastObservedTick ?? -1) >= 24
    ))).toBe(true);
    expect(result.probes.some(({ landedOnDifferentSurface }) => landedOnDifferentSurface)).toBe(true);
    expect(result.probes.some(({ jumpStarted }) => jumpStarted)).toBe(true);
  });

  it('is deterministic for the same route, seed and scripted response', () => {
    expect(runArenaV2KzLanguageConsequencePrototype())
      .toEqual(runArenaV2KzLanguageConsequencePrototype());
  });
});
