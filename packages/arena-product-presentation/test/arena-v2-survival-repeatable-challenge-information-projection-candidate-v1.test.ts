import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_SURVIVAL_PRESSURE_STAGE_INTERVAL_TICKS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_SURVIVAL_REPEATABLE_CHALLENGE_INFORMATION_PROJECTION_CANDIDATE_V1,
  projectArenaV2SurvivalRepeatableChallengeInformationFieldSourceCandidateV1,
} from '../src/index.js';

const INTERVAL = ARENA_V2_SURVIVAL_PRESSURE_STAGE_INTERVAL_TICKS_CANDIDATE_V1;

function fieldSource() {
  return Object.freeze({
    ownerId: 'p6-learning-profile' as const,
    fieldValues: Object.freeze([
      Object.freeze({
        fieldId: 'completed-modes',
        labelMessageId: 'arena.v2.field.completed-modes',
        valueText: '已完成0/3',
        accessibilityText: '已完成零个模式，共三个。',
        fixedWidthNumeric: false,
      }),
      Object.freeze({
        fieldId: 'best-survival-record',
        labelMessageId: 'arena.v2.field.best-survival-record',
        valueText: '尚无生存记录',
        accessibilityText: '尚无生存记录',
        fixedWidthNumeric: true,
      }),
    ]),
  });
}

function project(bestSurvivalTicks: number | null, source: unknown = fieldSource()) {
  return projectArenaV2SurvivalRepeatableChallengeInformationFieldSourceCandidateV1({
    schemaVersion: 1,
    fieldSource: source as never,
    bestSurvivalTicks,
  });
}

function challengeField(bestSurvivalTicks: number | null) {
  return project(bestSurvivalTicks).fieldValues.find(({ fieldId }) => (
    fieldId === 'best-survival-record'
  ))!;
}

describe('Arena V2 Survival repeatable challenge information projection candidate V1', () => {
  it('turns no record into the first 20-second pressure challenge', () => {
    const source = fieldSource();
    const result = project(null);
    const target = challengeField(null);

    expect(result.ownerId).toBe(source.ownerId);
    expect(result.fieldValues).toHaveLength(source.fieldValues.length);
    expect(result.fieldValues.map(({ fieldId }) => fieldId)).toEqual(
      source.fieldValues.map(({ fieldId }) => fieldId),
    );
    expect(result.fieldValues[0]).toEqual(source.fieldValues[0]);
    expect(target).toMatchObject({
      fieldId: 'best-survival-record',
      labelMessageId: 'arena.v2.field.best-survival-record',
      fixedWidthNumeric: true,
    });
    expect(target.valueText).toContain('本局挑战00:20');
    expect(target.valueText).toContain('压力第2档');
    expect(target.accessibilityText).toContain('本局可重复挑战目标');
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.fieldValues)).toBe(true);
  });

  it('selects the next exact 20-second boundary and entering pressure stage', () => {
    expect(challengeField(INTERVAL - 1).valueText).toContain('本局挑战00:20');
    expect(challengeField(INTERVAL).valueText).toContain('本局挑战00:40');
    expect(challengeField(INTERVAL).valueText).toContain('压力第3档');
    expect(challengeField((9 * INTERVAL) - 1).valueText).toContain('压力第10档');
  });

  it('uses personal best plus 20 seconds after reaching the final pressure stage', () => {
    const atFinalStage = challengeField(9 * INTERVAL);
    expect(atFinalStage.valueText).toContain('最佳03:00');
    expect(atFinalStage.valueText).toContain('本局挑战03:20');
    expect(atFinalStage.valueText).toContain('再坚持20秒');
    expect(atFinalStage.accessibilityText).toContain('已进入最后压力档');
  });

  it('rejects invalid ticks, field ownership and target-field drift', () => {
    expect(() => project(-1)).toThrow(/bestSurvivalTicks|tick/);
    expect(() => project(Number.MAX_SAFE_INTEGER)).toThrow(/tick/);
    expect(() => project(null, { ...fieldSource(), ownerId: 'future-owner' })).toThrow(/Owner/);
    expect(() => project(null, {
      ...fieldSource(),
      fieldValues: fieldSource().fieldValues.map((field) => (
        field.fieldId === 'best-survival-record'
          ? { ...field, labelMessageId: 'future.label' }
          : field
      )),
    })).toThrow(/best-survival-record/);
    expect(() => project(null, {
      ...fieldSource(),
      fieldValues: [...fieldSource().fieldValues, fieldSource().fieldValues[1]],
    })).toThrow(/字段ID不得重复/);
  });

  it('rejects future fields, Symbols, accessors and thenables without executing getters', () => {
    expect(() => projectArenaV2SurvivalRepeatableChallengeInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      bestSurvivalTicks: null,
      future: true,
    } as never)).toThrow(/future/);

    const symbolInput = {
      schemaVersion: 1,
      fieldSource: fieldSource(),
      bestSurvivalTicks: null,
    } as Record<PropertyKey, unknown>;
    Object.defineProperty(symbolInput, Symbol('future'), { enumerable: true, value: true });
    expect(() => projectArenaV2SurvivalRepeatableChallengeInformationFieldSourceCandidateV1(
      symbolInput as never,
    )).toThrow();

    let getterCalls = 0;
    const accessorInput = Object.defineProperty({
      schemaVersion: 1,
      bestSurvivalTicks: null,
    }, 'fieldSource', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return fieldSource();
      },
    });
    expect(() => projectArenaV2SurvivalRepeatableChallengeInformationFieldSourceCandidateV1(
      accessorInput as never,
    )).toThrow();
    expect(getterCalls).toBe(0);

    let thenCalls = 0;
    expect(() => project(null, {
      ...fieldSource(),
      then() {
        thenCalls += 1;
      },
    })).toThrow();
    expect(thenCalls).toBe(0);
  });

  it('publishes an isolated read-only contract with no new fields or writes', () => {
    expect(ARENA_V2_SURVIVAL_REPEATABLE_CHALLENGE_INFORMATION_PROJECTION_CANDIDATE_V1)
      .toMatchObject({
        status: 'production-unreachable',
        implementationStatus: 'code-written-not-run',
        validationStatus: 'not-run',
        defaultSurfaceWired: false,
        pressureStageCount: 10,
        stageIntervalTicks: INTERVAL,
        fieldCountAdded: 0,
        pageCountAdded: 0,
        actionCountAdded: 0,
        writesAuthorityProfileRewardOrTask: false,
        usesWallClockTimerOrAsyncOwner: false,
      });
  });
});
