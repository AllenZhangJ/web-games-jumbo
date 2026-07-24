import test from 'node:test';
import assert from 'node:assert/strict';
import { selectHighestUtility } from '@number-strategy-jump/arena-bot';

function evaluator(id: string, score: number, priority: number = 0) {
  return { id, priority, score: () => score, createPlan: () => ({ marker: id }) };
}

test('utility arbitration uses score, explicit priority and stable ID tie breaks', () => {
  assert.equal(selectHighestUtility([
    evaluator('low', 0.2, 99),
    evaluator('high', 0.8, 0),
  ], {}).goalId, 'high');
  assert.equal(selectHighestUtility([
    evaluator('low-priority', 0.5, 1),
    evaluator('high-priority', 0.5, 2),
  ], {}).goalId, 'high-priority');
  assert.equal(selectHighestUtility([
    evaluator('z-goal', 0.5, 2),
    evaluator('a-goal', 0.5, 2),
  ], {}).goalId, 'a-goal');
});

test('utility arbitration fails on invalid scores and plans', () => {
  assert.throws(() => selectHighestUtility([evaluator('broken', Number.NaN)], {}), /\[0, 1\]/);
  assert.throws(() => selectHighestUtility([{
    id: 'broken-plan',
    score: () => 1,
    createPlan: () => null as never,
  }], {}), /计划对象/);
});
