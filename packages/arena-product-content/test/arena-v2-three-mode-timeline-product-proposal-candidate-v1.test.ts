import { describe, expect, it } from 'vitest';
import {
  MODE_KIND,
  TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2,
  createTimelinePolicyDefinition,
  resolveTimelinePolicyRuntimeVariantV2,
} from '@number-strategy-jump/arena-definitions';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1,
} from '../src/arena-v2-three-mode-timeline-product-proposal-candidate-v1.js';

type DataRecord = Record<string, unknown>;

describe('Arena V2 three-mode Timeline product proposal candidate V1', () => {
  it('preserves the current three-mode runtime values without granting approval', () => {
    const proposal = ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1;
    expect(proposal).toMatchObject({
      status: 'production-unreachable',
      hardGate: false,
      validationStatus: 'not-run',
      proposalStatus: 'proposed-not-approved',
      balanceApprovalStatus: 'not-run',
      source: 'preserved-current-runtime-values',
      timelineRuntimePolicyConsumptionWired: false,
      defaultRegistryWired: false,
      defaultCompositionWired: false,
      defaultEntryWired: false,
    });
    expect(proposal.policyDefinitions.duel.variants).toEqual([{
      selector: { kind: 'default' },
      preparingTicks: 30,
      hardLimitActiveTicks: 3_600,
      suddenDeathStartActiveTick: 1_800,
    }]);
    expect(proposal.policyDefinitions.race.variants).toEqual([{
      selector: { kind: 'default' },
      preparingTicks: 60,
      hardLimitActiveTicks: 5_940,
      suddenDeathStartActiveTick: null,
    }]);
    expect(proposal.policyDefinitions.survival.variants.map((variant) => ({
      selector: variant.selector,
      hardLimitActiveTicks: variant.hardLimitActiveTicks,
    }))).toEqual([
      { selector: { kind: 'survival-enemy-count', enemyCount: 1 }, hardLimitActiveTicks: 4_930 },
      { selector: { kind: 'survival-enemy-count', enemyCount: 4 }, hardLimitActiveTicks: 6_130 },
      { selector: { kind: 'survival-enemy-count', enemyCount: 8 }, hardLimitActiveTicks: 9_730 },
      { selector: { kind: 'survival-enemy-count', enemyCount: 12 }, hardLimitActiveTicks: 12_130 },
      { selector: { kind: 'survival-enemy-count', enemyCount: 16 }, hardLimitActiveTicks: 13_330 },
    ]);
    expect(Object.isFrozen(proposal)).toBe(true);
    expect(Object.isFrozen(proposal.policyDefinitions.survival.variants)).toBe(true);
  });

  it('keeps the V1 shape and deterministic hash while adding exact V2 variants', () => {
    const source = {
      schemaVersion: 1,
      id: 'arena.mode.duel.timeline.compat.test.v1',
      contentVersion: 1,
      modeKind: MODE_KIND.DUEL,
      preparingTicks: 0,
      hardLimitTicks: 120,
      suddenDeathStartActiveTick: 60,
    };
    const normalized = createTimelinePolicyDefinition(source);
    expect(normalized).toEqual(source);
    expect(createDeterministicDataHash(normalized, 'Timeline V1 compatibility'))
      .toBe(createDeterministicDataHash(source, 'Timeline V1 compatibility'));
    expect(Object.hasOwn(normalized, 'variants')).toBe(false);

    const legacyShapeAtContentVersion2 = { ...source, contentVersion: 2 };
    const normalizedLegacyV2 = createTimelinePolicyDefinition(legacyShapeAtContentVersion2);
    expect(normalizedLegacyV2).toEqual(legacyShapeAtContentVersion2);
    expect(createDeterministicDataHash(normalizedLegacyV2, 'Timeline V1 compatibility v2'))
      .toBe(createDeterministicDataHash(
        legacyShapeAtContentVersion2,
        'Timeline V1 compatibility v2',
      ));
    expect(Object.hasOwn(normalizedLegacyV2, 'variants')).toBe(false);
  });

  it('requires exact selectors and rejects missing, duplicate, unordered and hostile V2 input', () => {
    const valid = structuredClone(
      ARENA_V2_THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V1
        .policyDefinitions.survival,
    ) as unknown as DataRecord;
    const variants = valid.variants as DataRecord[];

    const missing = structuredClone(valid) as DataRecord;
    (missing.variants as DataRecord[]).pop();
    expect(() => createTimelinePolicyDefinition(missing)).toThrow(/5个/);

    const duplicate = structuredClone(valid) as DataRecord;
    (duplicate.variants as DataRecord[])[1]!.selector = { kind: 'survival-enemy-count', enemyCount: 1 };
    expect(() => createTimelinePolicyDefinition(duplicate)).toThrow(/1\/4\/8\/12\/16/);

    const unordered = structuredClone(valid) as DataRecord;
    (unordered.variants as DataRecord[]).reverse();
    expect(() => createTimelinePolicyDefinition(unordered)).toThrow(/1\/4\/8\/12\/16/);

    const unknown = structuredClone(valid) as DataRecord;
    ((unknown.variants as DataRecord[])[0]!.selector as DataRecord).enemyCount = 2;
    expect(() => createTimelinePolicyDefinition(unknown)).toThrow(/1\/4\/8\/12\/16/);

    const future = structuredClone(valid) as DataRecord;
    (future.variants as DataRecord[])[0]!.future = true;
    expect(() => createTimelinePolicyDefinition(future)).toThrow(/future/);

    const symbol = structuredClone(valid) as DataRecord;
    Object.defineProperty(symbol, Symbol('future'), { value: true, enumerable: true });
    expect(() => createTimelinePolicyDefinition(symbol)).toThrow(/Symbol/);

    let getterCalls = 0;
    const accessor = structuredClone(valid) as DataRecord;
    Object.defineProperty(accessor, 'variants', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return variants;
      },
    });
    expect(() => createTimelinePolicyDefinition(accessor)).toThrow(/accessor|访问器|数据字段/i);
    expect(getterCalls).toBe(0);

    expect(() => resolveTimelinePolicyRuntimeVariantV2(
      valid,
      { kind: TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.DEFAULT },
    )).toThrow(/selector/);
    expect(resolveTimelinePolicyRuntimeVariantV2(valid, {
      kind: TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.SURVIVAL_ENEMY_COUNT,
      enemyCount: 16,
    }).hardLimitActiveTicks).toBe(13_330);
  });
});
