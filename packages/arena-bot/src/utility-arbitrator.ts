export type UtilityPlan = Readonly<Record<PropertyKey, unknown>>;

export interface UtilityEvaluator<TContext, TPlan extends object> {
  readonly id: string;
  readonly priority?: number;
  score(context: TContext): number;
  createPlan(context: TContext): TPlan;
}

export interface UtilityDecision<TPlan extends object> {
  readonly goalId: string;
  readonly score: number;
  readonly plan: Readonly<TPlan & { readonly goalId: string }>;
}

interface RankedEvaluator<TContext, TPlan extends object> {
  readonly evaluator: UtilityEvaluator<TContext, TPlan>;
  readonly score: number;
  readonly priority: number;
}

function readDataProperty(
  value: object,
  key: 'id' | 'priority' | 'score' | 'createPlan',
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined) return undefined;
  if (!('value' in descriptor)) {
    throw new TypeError(`utility evaluator.${key} 不得是访问器。`);
  }
  return descriptor.value;
}

function validateEvaluator<TContext, TPlan extends object>(
  candidate: unknown,
): UtilityEvaluator<TContext, TPlan> {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    throw new TypeError('utility evaluator 合同无效。');
  }
  const id = readDataProperty(candidate, 'id');
  const priority = readDataProperty(candidate, 'priority');
  const score = readDataProperty(candidate, 'score');
  const createPlan = readDataProperty(candidate, 'createPlan');
  if (
    typeof id !== 'string'
    || id.length === 0
    || typeof score !== 'function'
    || typeof createPlan !== 'function'
  ) {
    throw new TypeError('utility evaluator 合同无效。');
  }
  if (priority !== undefined && !Number.isSafeInteger(priority)) {
    throw new TypeError(`utility evaluator ${id} priority 必须是安全整数。`);
  }
  return candidate as UtilityEvaluator<TContext, TPlan>;
}

function copyPlan<TPlan extends object>(plan: TPlan, evaluatorId: string): TPlan {
  if (typeof plan !== 'object' || plan === null || Array.isArray(plan)) {
    throw new TypeError(`utility evaluator ${evaluatorId} 必须创建计划对象。`);
  }
  const prototype = Object.getPrototypeOf(plan);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`utility evaluator ${evaluatorId} 必须创建普通计划对象。`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(plan);
  const copied: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string') {
      throw new TypeError(`utility evaluator ${evaluatorId} 计划不得包含 Symbol 字段。`);
    }
    const descriptor = descriptors[key];
    if (descriptor === undefined || !('value' in descriptor)) {
      throw new TypeError(`utility evaluator ${evaluatorId} 计划字段不得是访问器。`);
    }
    copied[key] = descriptor.value;
  }
  return copied as TPlan;
}

/**
 * 基于逻辑 tick 的纯效用裁决。相同 evaluator、上下文和顺序始终产生相同结果。
 */
export function selectHighestUtility<TContext, TPlan extends object>(
  evaluators: readonly UtilityEvaluator<TContext, TPlan>[],
  context: TContext,
): UtilityDecision<TPlan> {
  if (!Array.isArray(evaluators) || evaluators.length === 0) {
    throw new RangeError('utility evaluators 必须是非空数组。');
  }
  let best: RankedEvaluator<TContext, TPlan> | null = null;
  for (const candidate of evaluators) {
    const evaluator = validateEvaluator<TContext, TPlan>(candidate);
    const score = evaluator.score(context);
    if (!Number.isFinite(score) || score < 0 || score > 1) {
      throw new RangeError(`utility evaluator ${evaluator.id} 必须返回 [0, 1]。`);
    }
    const priority = evaluator.priority ?? 0;
    if (
      best === null
      || score > best.score
      || (score === best.score && priority > best.priority)
      || (score === best.score && priority === best.priority && evaluator.id < best.evaluator.id)
    ) {
      best = { evaluator, score, priority };
    }
  }
  if (best === null) throw new Error('utility evaluators 裁决未产生候选。');
  const plan = copyPlan(best.evaluator.createPlan(context), best.evaluator.id);
  return Object.freeze({
    goalId: best.evaluator.id,
    score: best.score,
    plan: Object.freeze({ ...plan, goalId: best.evaluator.id }),
  });
}
