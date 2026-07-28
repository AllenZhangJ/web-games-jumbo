import { describe, expect, it } from 'vitest';
import {
  createArenaV2WeaponResearchOverviewMatrix,
  createArenaV2WeaponCaseStudyReadabilityMatrix,
  createArenaV2WeaponReadabilityContextFacts,
  createArenaV2WeaponReadabilityTaskSet,
  evaluateArenaV2WeaponReadabilityAttempt,
  projectArenaV2WeaponReadabilityParticipantTasks,
} from '../src/index.js';
import type { ArenaV2WeaponResearchOverviewMatrix } from '../src/index.js';

describe('Arena V2 weapon readability task prototype', () => {
  it('derives five participant tasks from the current research numeric matrix', () => {
    const taskSet = createArenaV2WeaponReadabilityTaskSet();
    expect(taskSet.tasks).toHaveLength(5);
    expect(taskSet.participantReady).toBe(true);
    expect(taskSet.tasks.map(({ id }) => id)).toEqual([
      'ground-range-highest',
      'ground-coverage-highest',
      'ground-risk-direction',
      'ground-narrow-edge-choice',
      'ground-aerial-range-difference',
    ]);
    expect(taskSet.tasks.find(({ id }) => id === 'ground-range-highest')?.expectedOptionId)
      .toBe('research-line-pressure');
    expect(taskSet.tasks.find(({ id }) => id === 'ground-coverage-highest')?.expectedOptionId)
      .toBe('research-line-pressure');
    expect(taskSet.tasks.find(({ id }) => id === 'ground-risk-direction')?.expectedOptionId)
      .toBe('higher-is-risk');
    expect(taskSet.tasks.find(({ id }) => id === 'ground-narrow-edge-choice')?.expectedOptionId)
      .toBe('research-read-punish');
    expect(taskSet.tasks.find(({ id }) => id === 'ground-aerial-range-difference')?.expectedOptionId)
      .toBe('research-line-pressure');
    expect(taskSet.tasks.find(({ id }) => id === 'ground-aerial-range-difference')?.expectedContextId)
      .toBe('ground');
  });

  it('derives concise scene facts from unique extrema without scoring weapons', () => {
    const facts = createArenaV2WeaponReadabilityContextFacts(
      createArenaV2WeaponCaseStudyReadabilityMatrix(),
    );
    expect(facts.length).toBeGreaterThan(0);
    expect(facts.every(({ value, unit, statement }) => (
      Number.isFinite(value) && unit.length > 0 && statement.includes('动作')
    ))).toBe(true);
    for (const weaponId of new Set(facts.map(({ weaponId }) => weaponId))) {
      const weaponFacts = facts.filter((fact) => fact.weaponId === weaponId);
      expect(weaponFacts.length).toBeLessThanOrEqual(2);
      expect(new Set(weaponFacts.map(({ kind }) => kind)).size).toBe(weaponFacts.length);
    }
    expect(facts.some(({ displayName, statement, kind }) => (
      displayName === '魔血镰刃' && statement === '空中动作覆盖宽度最高' && kind === 'advantage'
    ))).toBe(true);
    expect(facts.some(({ displayName, statement, kind }) => (
      displayName === '猛犸石斧' && statement === '空中动作收招时间最高' && kind === 'tradeoff'
    ))).toBe(true);
  });

  it('projects participant-safe tasks without leaking expected answers or evidence', () => {
    const taskSet = createArenaV2WeaponReadabilityTaskSet();
    const participantTasks = projectArenaV2WeaponReadabilityParticipantTasks(taskSet);
    expect(participantTasks).toHaveLength(taskSet.tasks.length);
    expect(participantTasks[0]).not.toHaveProperty('expectedOptionId');
    expect(participantTasks[0]).not.toHaveProperty('evidence');
    expect(Object.isFrozen(taskSet)).toBe(true);
    expect(Object.isFrozen(taskSet.tasks)).toBe(true);
    expect(Object.isFrozen(participantTasks)).toBe(true);
  });

  it('evaluates selection, context and numeric reason without creating a population claim', () => {
    const taskSet = createArenaV2WeaponReadabilityTaskSet();
    const correctAnswers = taskSet.tasks.map((task) => ({
      taskId: task.id,
      selectedOptionId: task.expectedOptionId,
      selectedContextId: task.expectedContextId,
      reasonAxisIds: task.expectedReasonAxisIds,
    }));
    const correct = evaluateArenaV2WeaponReadabilityAttempt(taskSet, correctAnswers);
    expect(correct.status).toBe('evaluated');
    expect(correct.readyTaskCount).toBe(5);
    expect(correct.answeredTaskCount).toBe(5);
    expect(correct.passedTaskCount).toBe(5);
    expect(correct.passRate).toBe(1);

    const wrong = evaluateArenaV2WeaponReadabilityAttempt(taskSet, [
      ...correctAnswers.slice(0, 1),
      {
        ...correctAnswers[1]!,
        selectedOptionId: 'research-flank',
      },
    ]);
    expect(wrong.passedTaskCount).toBe(1);
    expect(wrong.passRate).toBe(0.2);
    expect(wrong.results[1]?.selectionCorrect).toBe(false);
  });

  it('rejects unknown or duplicate answers before evaluating the task set', () => {
    const taskSet = createArenaV2WeaponReadabilityTaskSet();
    const answer = {
      taskId: 'ground-range-highest',
      selectedOptionId: 'research-line-pressure',
    } as const;
    expect(() => evaluateArenaV2WeaponReadabilityAttempt(taskSet, [answer, answer]))
      .toThrow(/答案重复/);
    expect(() => evaluateArenaV2WeaponReadabilityAttempt(taskSet, [
      { ...answer, taskId: 'unknown' },
    ])).toThrow(/答案未知任务/);
  });

  it('blocks participant collection when a required comparison has no unique winner', () => {
    const source = JSON.parse(JSON.stringify(
      createArenaV2WeaponResearchOverviewMatrix(),
    )) as ArenaV2WeaponResearchOverviewMatrix;
    for (const row of source.rows) {
      const stat = row.contexts.find(({ id }) => id === 'ground')?.stats.find(({ id }) => id === 'range');
      if (stat) (stat as { value: number }).value = 3;
    }
    const taskSet = createArenaV2WeaponReadabilityTaskSet(source);
    expect(taskSet.participantReady).toBe(false);
    expect(taskSet.tasks.find(({ id }) => id === 'ground-range-highest')?.status).toBe('blocked');
    expect(evaluateArenaV2WeaponReadabilityAttempt(taskSet, []).status).toBe('blocked');

    const facts = createArenaV2WeaponReadabilityContextFacts(source);
    expect(facts.some(({ statId, contextId }) => statId === 'range' && contextId === 'ground')).toBe(false);
  });
});
