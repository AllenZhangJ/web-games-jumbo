/**
 * Tick-driven utility arbitration adapted from Yuka's GoalEvaluator/Think
 * pattern (MIT, commit 10591304811222d6856020d5de129b39ef43b58d).
 * This version is deliberately pure and does not use Yuka's wall-clock
 * Regulator so authoritative replays stay deterministic.
 */
export function selectHighestUtility(evaluators, context) {
  if (!Array.isArray(evaluators) || evaluators.length === 0) {
    throw new RangeError('utility evaluators 必须是非空数组。');
  }
  let best = null;
  for (const evaluator of evaluators) {
    if (
      !evaluator
      || typeof evaluator.id !== 'string'
      || evaluator.id.length === 0
      || typeof evaluator.score !== 'function'
      || typeof evaluator.createPlan !== 'function'
    ) throw new TypeError('utility evaluator 合同无效。');
    const score = evaluator.score(context);
    if (!Number.isFinite(score) || score < 0 || score > 1) {
      throw new RangeError(`utility evaluator ${evaluator.id} 必须返回 [0, 1]。`);
    }
    const priority = evaluator.priority ?? 0;
    if (!Number.isSafeInteger(priority)) {
      throw new TypeError(`utility evaluator ${evaluator.id} priority 必须是安全整数。`);
    }
    if (
      best === null
      || score > best.score
      || (score === best.score && priority > best.priority)
      || (score === best.score && priority === best.priority && evaluator.id < best.evaluator.id)
    ) best = { evaluator, score, priority };
  }
  const plan = best.evaluator.createPlan(context);
  if (!plan || typeof plan !== 'object') {
    throw new TypeError(`utility evaluator ${best.evaluator.id} 必须创建计划对象。`);
  }
  return Object.freeze({
    goalId: best.evaluator.id,
    score: best.score,
    plan: Object.freeze({ ...plan, goalId: best.evaluator.id }),
  });
}
