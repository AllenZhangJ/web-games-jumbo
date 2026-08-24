import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_RESULT_HOME_CONTINUATION_RECEIPT_INFORMATION_PROJECTION_CANDIDATE_V1,
  projectArenaV2ResultHomeContinuationReceiptInformationFieldSourceCandidateV1,
} from '../src/index.js';

function fieldSource() {
  return Object.freeze({
    ownerId: 'p6-learning-profile' as const,
    fieldValues: Object.freeze([
      Object.freeze({
        fieldId: 'earned-progress',
        labelMessageId: 'arena.v2.field.earned-progress',
        valueText: '主研究+1',
        accessibilityText: '本局主研究增加一点。',
        fixedWidthNumeric: false,
      }),
      Object.freeze({
        fieldId: 'next-goal',
        labelMessageId: 'arena.v2.field.next-goal',
        valueText: '继续当前目标',
        accessibilityText: '继续当前目标。',
        fixedWidthNumeric: true,
      }),
    ]),
  });
}

function project(
  receiptKind: 'suggested-combination' | 'adjusted-combination',
  sourceKind: 'home' | 'result' = 'home',
) {
  return projectArenaV2ResultHomeContinuationReceiptInformationFieldSourceCandidateV1({
    schemaVersion: 1,
    fieldSource: fieldSource(),
    sourceKind,
    receiptKind,
  });
}

describe('Arena V2 result home continuation receipt candidate V1', () => {
  it('appends an honest start-combination receipt without claiming completion', () => {
    const suggested = project('suggested-combination');
    const adjusted = project('adjusted-combination');
    expect(suggested.fieldValues[0]?.valueText).toBe(
      '主研究+1；首页目标：已按建议组合开局',
    );
    expect(adjusted.fieldValues[0]?.valueText).toBe(
      '主研究+1；首页目标：已按你的改选组合开局',
    );
    expect(suggested.fieldValues[0]?.accessibilityText).toContain('不表示目标已经完成');
    expect(adjusted.fieldValues[0]?.accessibilityText).toContain('不表示目标已经完成');
  });

  it('names a result-origin continuation without relabeling it as a home goal', () => {
    const suggested = project('suggested-combination', 'result');
    const adjusted = project('adjusted-combination', 'result');
    expect(suggested.fieldValues[0]?.valueText).toBe(
      '主研究+1；上局目标：已按建议组合开局',
    );
    expect(adjusted.fieldValues[0]?.valueText).toBe(
      '主研究+1；上局目标：已按你的改选组合开局',
    );
    expect(suggested.fieldValues[0]?.accessibilityText).toContain('上局结算目标回执');
    expect(suggested.fieldValues[0]?.accessibilityText).not.toContain('首页目标回执');
  });

  it('preserves the owner, fields, non-target values and zero-expansion metadata', () => {
    const source = fieldSource();
    const result = project('suggested-combination');
    expect(result.ownerId).toBe(source.ownerId);
    expect(result.fieldValues.map(({ fieldId }) => fieldId)).toEqual(
      source.fieldValues.map(({ fieldId }) => fieldId),
    );
    expect(result.fieldValues[1]).toEqual(source.fieldValues[1]);
    expect(ARENA_V2_RESULT_HOME_CONTINUATION_RECEIPT_INFORMATION_PROJECTION_CANDIDATE_V1)
      .toMatchObject({
        implementationStatus: 'code-written-not-run',
        validationStatus: 'not-run',
        hardGate: false,
        neverClaimsGoalCompletion: true,
        independentFromRetentionCollector: true,
        fieldCountAdded: 0,
        pageCountAdded: 0,
        actionCountAdded: 0,
      });
  });

  it('rejects owner, target, kind and future-field drift', () => {
    expect(() => projectArenaV2ResultHomeContinuationReceiptInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: { ...fieldSource(), ownerId: 'future-owner' },
      sourceKind: 'home',
      receiptKind: 'suggested-combination',
    } as never)).toThrow(/Owner/);
    expect(() => projectArenaV2ResultHomeContinuationReceiptInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: {
        ...fieldSource(),
        fieldValues: fieldSource().fieldValues.map((field) => (
          field.fieldId === 'earned-progress'
            ? { ...field, labelMessageId: 'future.label' }
            : field
        )),
      },
      sourceKind: 'home',
      receiptKind: 'suggested-combination',
    } as never)).toThrow(/earned-progress/);
    expect(() => projectArenaV2ResultHomeContinuationReceiptInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      sourceKind: 'home',
      receiptKind: 'completed',
    } as never)).toThrow(/kind/);
    expect(() => projectArenaV2ResultHomeContinuationReceiptInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      sourceKind: 'home',
      receiptKind: 'suggested-combination',
      future: true,
    } as never)).toThrow(/future/);
    expect(() => projectArenaV2ResultHomeContinuationReceiptInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      sourceKind: 'future',
      receiptKind: 'suggested-combination',
    } as never)).toThrow(/sourceKind/);
  });
});
