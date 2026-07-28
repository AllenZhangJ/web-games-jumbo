import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponPersistentZonePrototype } from '../src/index.js';

describe('Arena V2 persistent weapon zone prototype', () => {
  it('distinguishes impact hit, lingering-zone hit and route escape', () => {
    const result = runArenaV2WeaponPersistentZonePrototype();
    expect(result.probeCount).toBe(6);
    const magic = result.probes.filter(({ referenceId }) => referenceId === 'magic-blood-scythe');
    const mammoth = result.probes.filter(({ referenceId }) => referenceId === 'mammoth-stone-axe');
    expect(magic.map(({ responsePolicy, outcome }) => [responsePolicy, outcome])).toEqual([
      ['hold-center', 'hit-active'],
      ['leave-before-impact', 'evaded'],
      ['enter-during-linger', 'hit-lingering'],
    ]);
    expect(magic.find(({ responsePolicy }) => responsePolicy === 'enter-during-linger')).toMatchObject({
      lingerTicks: 12,
      firstLingerTick: 24,
      firstHitPhase: 'lingering',
      feedback: 'linger-zone-hit',
    });
    expect(mammoth.find(({ responsePolicy }) => responsePolicy === 'enter-during-linger')).toMatchObject({
      lingerTicks: 0,
      firstLingerTick: null,
      firstHitTick: null,
      outcome: 'evaded',
      feedback: 'route-escape',
    });
  });

  it('is deterministic and freezes the research evidence', () => {
    const first = runArenaV2WeaponPersistentZonePrototype();
    expect(first).toEqual(runArenaV2WeaponPersistentZonePrototype());
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.probes)).toBe(true);
    expect(Object.isFrozen(first.probes[0])).toBe(true);
  });
});
