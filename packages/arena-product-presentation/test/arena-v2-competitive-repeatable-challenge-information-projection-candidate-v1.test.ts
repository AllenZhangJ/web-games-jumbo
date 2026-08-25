import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
  ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_COMPETITIVE_REPEATABLE_CHALLENGE_INFORMATION_PROJECTION_CANDIDATE_V1,
  projectArenaV2CompetitiveRepeatableChallengeInformationFieldSourceCandidateV1,
} from '../src/index.js';

function fieldSource() {
  return Object.freeze({
    ownerId: 'p5-mode-content' as const,
    fieldValues: Object.freeze([
      Object.freeze({
        fieldId: 'mode-goal',
        labelMessageId: 'arena.v2.field.mode-goal',
        valueText: '既有模式目标',
        accessibilityText: '既有模式目标。',
        fixedWidthNumeric: false,
      }),
      Object.freeze({
        fieldId: 'participant-count',
        labelMessageId: 'arena.v2.field.participant-count',
        valueText: '2名参与者',
        accessibilityText: '两名参与者。',
        fixedWidthNumeric: true,
      }),
    ]),
  });
}

function project(
  modeKind: 'duel' | 'race',
  bestPerformanceTicks: number | null,
  overrides: Readonly<Record<string, unknown>> = {},
) {
  return projectArenaV2CompetitiveRepeatableChallengeInformationFieldSourceCandidateV1({
    schemaVersion: 1,
    modeDefinitionId: ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1[modeKind],
    modeKind,
    fieldSource: fieldSource(),
    bestPerformanceTicks,
    ...overrides,
  } as never);
}

function target(modeKind: 'duel' | 'race', bestPerformanceTicks: number | null) {
  return project(modeKind, bestPerformanceTicks).fieldValues.find(({ fieldId }) => (
    fieldId === 'mode-goal'
  ))!;
}

describe('Arena V2 competitive repeatable challenge information projection candidate V1', () => {
  it('uses the existing mode-goal field for a first Duel win or first Race finish', () => {
    expect(target('duel', null).valueText).toBe('本局挑战：完成常规1v1并争取首胜');
    expect(target('duel', null).accessibilityText).toContain('把对手击落到场外');
    expect(target('race', null).valueText).toBe('本局挑战：沿完整路线到达终点');
    expect(target('race', null).accessibilityText).toContain('到达终点');
  });

  it('shows the exact existing best record and does not invent an improvement step', () => {
    expect(target('duel', 3_600).valueText).toBe('最快胜利 01:00 · 本局挑战：争取刷新');
    expect(target('race', 5_400).valueText).toBe('最快到达 01:30 · 本局挑战：争取刷新');
    expect(target('duel', 3_600).valueText).not.toMatch(/\+|缩短|秒内/u);
    expect(target('race', 5_400).valueText).not.toMatch(/\+|缩短|秒内/u);
    expect(ARENA_V2_COMPETITIVE_REPEATABLE_CHALLENGE_INFORMATION_PROJECTION_CANDIDATE_V1)
      .toMatchObject({
        implementationStatus: 'code-written-not-run',
        validationStatus: 'not-run',
        hardGate: false,
        improvementStepPolicy: 'no-formal-step-do-not-invent-exact-tick',
        fieldCountAdded: 0,
        pageCountAdded: 0,
        actionCountAdded: 0,
      });
  });

  it('formats the formal Profile maximum deterministically and rejects values above it', () => {
    const maximum = ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1.limits.maxCounterValue;
    const first = target('duel', maximum).valueText;
    const second = target('duel', maximum).valueText;
    expect(first).toBe(second);
    expect(first).toMatch(/^最快胜利 \d+:[0-5]\d · 本局挑战：争取刷新$/u);
    expect(() => target('duel', maximum + 1)).toThrow(/Profile计数上限/u);
  });

  it('preserves owner, field identities, count and non-target fields', () => {
    const source = fieldSource();
    const result = project('duel', null);
    expect(result.ownerId).toBe(source.ownerId);
    expect(result.fieldValues).toHaveLength(source.fieldValues.length);
    expect(result.fieldValues.map(({ fieldId }) => fieldId)).toEqual(
      source.fieldValues.map(({ fieldId }) => fieldId),
    );
    expect(result.fieldValues[1]).toEqual(source.fieldValues[1]);
    expect(result.fieldValues[0]).toMatchObject({
      labelMessageId: source.fieldValues[0]!.labelMessageId,
      fixedWidthNumeric: false,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.fieldValues)).toBe(true);
  });

  it('rejects mode, identity, tick and target-field drift', () => {
    expect(() => project('duel', null, { modeDefinitionId: 'mode.future' })).toThrow(/身份漂移/);
    expect(() => project('duel', -1)).toThrow(/tick|bestPerformanceTicks/);
    expect(() => project('duel', 1.5)).toThrow(/安全整数/);
    expect(() => project('duel', null, { modeKind: 'survival' })).toThrow(/仅支持/);
    expect(() => project('duel', null, {
      fieldSource: { ...fieldSource(), ownerId: 'future-owner' },
    })).toThrow(/Owner/);
    expect(() => project('duel', null, {
      fieldSource: {
        ...fieldSource(),
        fieldValues: fieldSource().fieldValues.map((field) => (
          field.fieldId === 'mode-goal'
            ? { ...field, labelMessageId: 'future.label' }
            : field
        )),
      },
    })).toThrow(/mode-goal/);
  });

  it('rejects future fields, Symbols, accessors and thenables without executing getters', () => {
    expect(() => project('duel', null, { future: true })).toThrow(/future/);

    const symbolInput = {
      schemaVersion: 1,
      modeDefinitionId: ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.duel,
      modeKind: 'duel',
      fieldSource: fieldSource(),
      bestPerformanceTicks: null,
    } as Record<PropertyKey, unknown>;
    Object.defineProperty(symbolInput, Symbol('future'), { enumerable: true, value: true });
    expect(() => projectArenaV2CompetitiveRepeatableChallengeInformationFieldSourceCandidateV1(
      symbolInput as never,
    )).toThrow();

    let getterCalls = 0;
    const accessorInput = Object.defineProperty({
      schemaVersion: 1,
      modeDefinitionId: ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.duel,
      modeKind: 'duel',
      bestPerformanceTicks: null,
    }, 'fieldSource', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return fieldSource();
      },
    });
    expect(() => projectArenaV2CompetitiveRepeatableChallengeInformationFieldSourceCandidateV1(
      accessorInput as never,
    )).toThrow();
    expect(getterCalls).toBe(0);

    let thenCalls = 0;
    expect(() => project('duel', null, {
      fieldSource: { ...fieldSource(), then: () => { thenCalls += 1; } },
    })).toThrow();
    expect(thenCalls).toBe(0);
  });
});
