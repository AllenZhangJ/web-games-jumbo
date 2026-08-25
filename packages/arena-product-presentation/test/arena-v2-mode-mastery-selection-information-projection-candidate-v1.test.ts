import { describe, expect, it } from 'vitest';
import type {
  ArenaV2NextLearningGoalV1,
} from '@number-strategy-jump/arena-product-progression';
import {
  projectArenaV2ModeMasterySelectionInformationFieldSourceCandidateV1,
} from '../src/index.js';

function fieldSource() {
  return Object.freeze({
    ownerId: 'p5-mode-content' as const,
    fieldValues: Object.freeze([
      Object.freeze({
        fieldId: 'mode-objective',
        labelMessageId: 'arena.v2.field.mode-objective',
        valueText: '率先完成目标',
        accessibilityText: '率先完成目标。',
        fixedWidthNumeric: false,
      }),
      Object.freeze({
        fieldId: 'record-type',
        labelMessageId: 'arena.v2.field.record-type',
        valueText: '本地名次、终点时间与路线段记录',
        accessibilityText: '记录本地名次、终点时间与路线段记录。',
        fixedWidthNumeric: false,
      }),
    ]),
  });
}

function summary() {
  const modeRecords = Object.freeze([
    Object.freeze({
      kind: 'duel' as const,
      modeDefinitionId: 'mode.duel',
      playCount: 8,
      completionCount: 8,
      winCount: 4,
      bestPerformanceTicks: null,
      compactText: '1v1 --',
      accessibilityText: '1v1记录。',
    }),
    Object.freeze({
      kind: 'race' as const,
      modeDefinitionId: 'mode.race',
      playCount: 2,
      completionCount: 2,
      winCount: 1,
      bestPerformanceTicks: null,
      compactText: '竞速 --',
      accessibilityText: '竞速记录。',
    }),
    Object.freeze({
      kind: 'survival' as const,
      modeDefinitionId: 'mode.survival',
      playCount: 1,
      completionCount: 1,
      winCount: 0,
      bestPerformanceTicks: null,
      compactText: '生存 --',
      accessibilityText: '生存记录。',
    }),
  ]);
  return Object.freeze({
    schemaVersion: 1 as const,
    modeRecords,
    modeMasteryProgress: 8,
    modeMasteryTarget: 15,
    collectedWeaponCount: 0,
    weaponCount: 20,
    weaponMainResearchProgress: 0,
    weaponMainResearchTarget: 2400,
    completedWeaponContextCount: 0,
    weaponContextCount: 100,
    weaponContextEvidenceProgress: 0,
    weaponContextEvidenceTarget: 300,
    completedWeaponContextEvidence: 0,
    collectedMapCount: 0,
    mapCount: 2,
    completedMapSegmentCount: 0,
    mapSegmentCount: 20,
    mapRouteResearchProgress: 0,
    mapRouteResearchTarget: 60,
    completedChallengeCount: 0,
    challengeCount: 20,
    challengeProgress: 0,
    challengeProgressTarget: 60,
    compactText: '完整首页摘要',
    accessibilityText: '完整首页摘要。',
  });
}

function modeGoal(
  overrides: Partial<ArenaV2NextLearningGoalV1> = {},
): ArenaV2NextLearningGoalV1 {
  return Object.freeze({
    schemaVersion: 1 as const,
    profileRevision: 12,
    kind: 'mode-mastery' as const,
    goalId: 'mode-mastery:mode.race',
    question: '下一局怎样继续熟悉竞速？',
    actionLabel: '完成一局该模式',
    currentProgress: 2,
    targetProgress: 5,
    weaponDefinitionId: null,
    mapDefinitionId: null,
    segmentDefinitionId: null,
    modeDefinitionId: 'mode.race',
    challengeDefinitionId: null,
    context: null,
    effectiveLearningRequired: true,
    ...overrides,
  });
}

function completeGoal(
  overrides: Partial<ArenaV2NextLearningGoalV1> = {},
): ArenaV2NextLearningGoalV1 {
  return Object.freeze({
    schemaVersion: 1 as const,
    profileRevision: 12,
    kind: 'catalog-complete' as const,
    goalId: 'catalog-complete',
    question: '学习目录已经完成，下一局做什么？',
    actionLabel: '自由挑战或刷新任意个人记录',
    currentProgress: 1,
    targetProgress: 1,
    weaponDefinitionId: null,
    mapDefinitionId: null,
    segmentDefinitionId: null,
    modeDefinitionId: null,
    challengeDefinitionId: null,
    context: null,
    effectiveLearningRequired: false,
    ...overrides,
  });
}

describe('Arena V2 mode mastery selection information projection candidate V1', () => {
  it('shows selected-mode and whole-mode mastery in the existing record field', () => {
    const result = projectArenaV2ModeMasterySelectionInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      selectedModeKind: 'race',
      nextGoal: modeGoal(),
      summary: summary(),
    });
    expect(result.fieldValues).toHaveLength(fieldSource().fieldValues.length);
    expect(result.fieldValues.find(({ fieldId }) => fieldId === 'record-type')).toMatchObject({
      valueText: '本地名次、终点时间与路线段记录；竞速熟练2/5·整体8/15',
      fixedWidthNumeric: false,
    });
    expect(result.fieldValues.find(({ fieldId }) => fieldId === 'record-type')
      ?.accessibilityText).toContain('超过单模式目标后的完成局数仍保留在模式记录中');
  });

  it('fails closed on owner, target field, mode order and aggregate drift', () => {
    const project = (overrides: Record<string, unknown> = {}) => (
      projectArenaV2ModeMasterySelectionInformationFieldSourceCandidateV1({
        schemaVersion: 1,
        fieldSource: fieldSource(),
        selectedModeKind: 'race',
        nextGoal: modeGoal(),
        summary: summary(),
        ...overrides,
      } as never)
    );
    expect(() => project({
      fieldSource: { ...fieldSource(), ownerId: 'future-owner' },
    })).toThrow(/Mode Content/);
    expect(() => project({
      fieldSource: { ...fieldSource(), fieldValues: [] },
    })).toThrow(/record-type/);
    expect(() => project({ selectedModeKind: 'future-mode' })).toThrow(/selectedModeKind/);
    expect(() => project({ nextGoal: modeGoal({ kind: 'future-goal' } as never) })).toThrow(
      /nextGoalKind/,
    );
    expect(() => project({ nextGoal: modeGoal({ actionLabel: '' }) })).toThrow(
      /nextGoal.actionLabel/,
    );
    expect(() => project({ nextGoal: { ...modeGoal(), future: true } })).toThrow(/future/);
    let getterCalls = 0;
    const hostileGoal = Object.create(null) as Record<string, unknown>;
    for (const [key, value] of Object.entries(modeGoal())) hostileGoal[key] = value;
    Object.defineProperty(hostileGoal, 'actionLabel', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return '不得执行';
      },
    });
    expect(() => project({ nextGoal: hostileGoal })).toThrow(/数据字段|访问器/);
    expect(getterCalls).toBe(0);
    expect(() => project({
      summary: { ...summary(), modeRecords: [...summary().modeRecords].reverse() },
    })).toThrow(/顺序/);
    expect(() => project({
      summary: { ...summary(), modeMasteryProgress: 9 },
    })).toThrow(/不闭合/);
    expect(() => project({
      summary: { ...summary(), modeMasteryTarget: 14 },
    })).toThrow(/等分/);
  });

  it('uses the validated catalog-complete goal to expose free challenge without resolving completion again', () => {
    const modeRecords = Object.freeze(summary().modeRecords.map((record) => Object.freeze({
      ...record,
      playCount: 5,
      completionCount: 5,
      bestPerformanceTicks: 600,
    })));
    const terminalSummary = Object.freeze({
      ...summary(),
      modeRecords,
      modeMasteryProgress: 15,
      collectedWeaponCount: 20,
      weaponMainResearchProgress: 2400,
      completedWeaponContextCount: 100,
      weaponContextEvidenceProgress: 300,
      completedWeaponContextEvidence: 300,
      collectedMapCount: 2,
      completedMapSegmentCount: 20,
      mapRouteResearchProgress: 60,
      completedChallengeCount: 20,
      challengeProgress: 60,
    });
    const result = projectArenaV2ModeMasterySelectionInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      selectedModeKind: 'survival',
      nextGoal: completeGoal(),
      summary: terminalSummary,
    });
    expect(result.fieldValues).toHaveLength(fieldSource().fieldValues.length);
    expect(result.fieldValues.find(({ fieldId }) => fieldId === 'record-type')).toMatchObject({
      valueText: '本地名次、终点时间与路线段记录；生存熟练5/5·整体15/15；可刷新：1v1最快胜利00:10·竞速最快到达00:10·生存最长坚持00:10；本轮建议：常规1v1·累计5局；学习目录已完成·自由挑战或刷新任意个人记录',
      fixedWidthNumeric: false,
    });
    expect(result.fieldValues.find(({ fieldId }) => fieldId === 'record-type')
      ?.accessibilityText).toContain('可自由挑战或刷新任意个人记录');
    expect(result.fieldValues.find(({ fieldId }) => fieldId === 'record-type')
      ?.accessibilityText).toContain('当前可刷新的三种个人记录为：1v1最快胜利00:10；竞速最快到达00:10；生存最长坚持00:10');
    expect(result.fieldValues.find(({ fieldId }) => fieldId === 'record-type')
      ?.accessibilityText).toContain('本轮建议优先游玩累计局数最少的常规1v1；当前累计5局');

    const recordPendingSummary = Object.freeze({
      ...terminalSummary,
      modeRecords: Object.freeze(terminalSummary.modeRecords.map((record) => Object.freeze({
        ...record,
        bestPerformanceTicks: record.kind === 'survival' ? null : record.bestPerformanceTicks,
      }))),
    });
    const nonTerminal = projectArenaV2ModeMasterySelectionInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      selectedModeKind: 'survival',
      nextGoal: modeGoal({
        kind: 'record-improvement',
        goalId: 'record-improvement:mode.survival',
        question: '怎样建立生存个人记录？',
        actionLabel: '完成一局生存并建立记录',
        currentProgress: 0,
        targetProgress: 1,
        modeDefinitionId: 'mode.survival',
        effectiveLearningRequired: false,
      }),
      summary: recordPendingSummary,
    });
    expect(nonTerminal.fieldValues.find(({ fieldId }) => fieldId === 'record-type')
      ?.valueText).not.toContain('学习目录已完成');
    expect(nonTerminal.fieldValues.find(({ fieldId }) => fieldId === 'record-type')
      ?.valueText).not.toContain('可刷新：');

    expect(() => projectArenaV2ModeMasterySelectionInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      selectedModeKind: 'survival',
      nextGoal: completeGoal({ currentProgress: 0 }),
      summary: terminalSummary,
    })).toThrow(/目录范围完成身份不闭合/);
    expect(() => projectArenaV2ModeMasterySelectionInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      selectedModeKind: 'survival',
      nextGoal: completeGoal({ weaponDefinitionId: 'weapon.future' }),
      summary: terminalSummary,
    })).toThrow(/目录范围完成身份不闭合/);
  });

  it('recommends the least-played mode after full catalog completion with stable ties', () => {
    const terminalSummary = Object.freeze({
      ...summary(),
      modeRecords: Object.freeze(summary().modeRecords.map((record) => Object.freeze({
        ...record,
        playCount: record.kind === 'duel' ? 9 : record.kind === 'race' ? 5 : 6,
        completionCount: 5,
        bestPerformanceTicks: 600,
      }))),
      modeMasteryProgress: 15,
      collectedWeaponCount: 20,
      weaponMainResearchProgress: 2400,
      completedWeaponContextCount: 100,
      weaponContextEvidenceProgress: 300,
      completedWeaponContextEvidence: 300,
      collectedMapCount: 2,
      completedMapSegmentCount: 20,
      mapRouteResearchProgress: 60,
      completedChallengeCount: 20,
      challengeProgress: 60,
    });
    const result = projectArenaV2ModeMasterySelectionInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      selectedModeKind: 'survival',
      nextGoal: completeGoal(),
      summary: terminalSummary,
    });
    const record = result.fieldValues.find(({ fieldId }) => fieldId === 'record-type');
    expect(record?.valueText).toContain('本轮建议：竞速·累计5局');
    expect(record?.accessibilityText).toContain('累计局数最少的竞速；当前累计5局');
  });

  it('shows active-pool completion without publishing full-catalog records or terminal copy', () => {
    const result = projectArenaV2ModeMasterySelectionInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      selectedModeKind: 'race',
      nextGoal: completeGoal({
        goalId: 'active-learning-complete',
        question: '当前开放内容已经完成，下一局做什么？',
        actionLabel: '自由练习当前开放内容，等待新武器开放',
      }),
      summary: summary(),
    });
    const record = result.fieldValues.find(({ fieldId }) => fieldId === 'record-type');
    expect(record?.valueText).toContain(
      '竞速熟练2/5·整体8/15；当前开放内容已完成·自由练习当前开放内容，等待新武器开放',
    );
    expect(record?.valueText).not.toContain('学习目录已完成');
    expect(record?.valueText).not.toContain('可刷新：');
    expect(record?.accessibilityText).toContain('未声称完整20武器目录完成');
  });
});
