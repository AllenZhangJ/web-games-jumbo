import { describe, expect, it } from 'vitest';
import {
  MODE_KIND,
  MODE_POLICY_DEFINITION_SCHEMA_VERSION,
  createSurvivalPressurePolicyDefinition,
} from '@number-strategy-jump/arena-definitions';
import { SurvivalPressureResolverV1 } from '../src/survival-pressure-resolver-v1.js';

const POLICY = createSurvivalPressurePolicyDefinition({
  schemaVersion: MODE_POLICY_DEFINITION_SCHEMA_VERSION,
  id: 'arena.survival.pressure.resolver.candidate.v1',
  contentVersion: 1,
  modeKind: MODE_KIND.SURVIVAL,
  slotActivationOrder: ['slot-01', 'slot-02', 'slot-03'],
  slotEntries: [
    { slotId: 'slot-01', anchorCapabilityId: 'anchor-01' },
    { slotId: 'slot-02', anchorCapabilityId: 'anchor-02' },
    { slotId: 'slot-03', anchorCapabilityId: 'anchor-03' },
  ],
  stages: [
    { stage: 0, startActiveTick: 0, desiredActiveEnemySlots: 1, reactivationDelayTicks: 180 },
    { stage: 1, startActiveTick: 1_200, desiredActiveEnemySlots: 2, reactivationDelayTicks: 180 },
    { stage: 2, startActiveTick: 2_400, desiredActiveEnemySlots: 3, reactivationDelayTicks: 180 },
  ],
});

describe('SurvivalPressureResolverV1', () => {
  it('resolves boundaries using frozen activation order and anchor bindings', () => {
    const resolver = new SurvivalPressureResolverV1(POLICY);
    expect(resolver.resolve(1_199)).toMatchObject({
      stage: 0,
      desiredActiveEnemySlots: 1,
      nextStageStartActiveTick: 1_200,
    });
    expect(resolver.resolve(1_200).activeSlots).toEqual([
      { activationOrdinal: 0, slotId: 'slot-01', anchorCapabilityId: 'anchor-01' },
      { activationOrdinal: 1, slotId: 'slot-02', anchorCapabilityId: 'anchor-02' },
    ]);
    expect(resolver.resolve(99_999)).toMatchObject({
      stage: 2,
      desiredActiveEnemySlots: 3,
      nextStageStartActiveTick: null,
    });
  });

  it('rejects invalid ticks and repeats deterministically', () => {
    const resolver = new SurvivalPressureResolverV1(POLICY);
    expect(() => resolver.resolve(-1)).toThrow(/activeTick/);
    expect(resolver.resolve(2_400).contentHash).toBe(resolver.resolve(2_400).contentHash);
  });
});
