import { OPERATION_KINDS, type OperationKind } from '@number-strategy/game-contracts';

const OP_SYMBOLS: Readonly<Record<OperationKind, string>> = Object.freeze({
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
});

export interface Operation {
  readonly kind: OperationKind;
  readonly amount: number;
}

export interface OperationChoice extends Operation {
  readonly id: string;
  readonly label: string;
}

export interface ChoiceRng {
  next(): number;
  pick<T>(items: readonly T[]): T;
}

function assertInteger(value: unknown, name: string): asserts value is number {
  if (!Number.isSafeInteger(value)) throw new TypeError(`${name} 必须是安全整数。`);
}

function assertBounds(minValue: unknown, maxValue: unknown): asserts minValue is number {
  assertInteger(minValue, 'minValue');
  assertInteger(maxValue, 'maxValue');
  if (minValue > maxValue) throw new RangeError('minValue 不能大于 maxValue。');
}

function operationKey(operation: Operation): string {
  return `${operation.kind}:${operation.amount}`;
}

function assertOperation(operation: unknown): asserts operation is Operation {
  if (!operation || typeof operation !== 'object') throw new TypeError('operation 必须是运算对象。');
  const candidate = operation as Partial<Operation>;
  if (typeof candidate.kind !== 'string' || !OPERATION_KINDS.includes(candidate.kind as OperationKind)) {
    throw new Error(`未知运算类型: ${String(candidate.kind)}`);
  }
  if (!Number.isSafeInteger(candidate.amount) || (candidate.amount ?? 0) <= 0) {
    throw new RangeError('operation.amount 必须是正安全整数。');
  }
}

export function applyOperation(value: unknown, operation: unknown): number {
  assertInteger(value, 'value');
  assertOperation(operation);
  switch (operation.kind) {
    case 'add': return value + operation.amount;
    case 'subtract': return value - operation.amount;
    case 'multiply': return value * operation.amount;
    case 'divide': return Number.isInteger(value / operation.amount) ? value / operation.amount : value;
  }
}

export function formatOperation(operation: unknown): string {
  assertOperation(operation);
  return `${OP_SYMBOLS[operation.kind]}${operation.amount}`;
}

export function distanceToTarget(value: unknown, target: unknown): number {
  assertInteger(value, 'value');
  assertInteger(target, 'target');
  return Math.abs(target - value);
}

function uniqueOperations(operations: readonly Operation[]): Operation[] {
  const seen = new Set<string>();
  return operations.filter((operation) => {
    const key = operationKey(operation);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeAllowedOperations(value: unknown = OPERATION_KINDS): ReadonlySet<OperationKind> {
  if (!Array.isArray(value) || value.length < 2) {
    throw new RangeError('allowedOperations 至少需要两种运算。');
  }
  const allowed = new Set<OperationKind>();
  for (const kind of value) {
    if (typeof kind !== 'string' || !OPERATION_KINDS.includes(kind as OperationKind)) {
      throw new Error(`allowedOperations 包含未知运算类型: ${String(kind)}`);
    }
    allowed.add(kind as OperationKind);
  }
  if (allowed.size !== value.length) throw new RangeError('allowedOperations 不能包含重复运算。');
  return allowed;
}

function candidatesFor(
  value: number,
  target: number,
  maxValue = 199,
  allowedOperations: unknown = OPERATION_KINDS,
): Operation[] {
  const allowed = normalizeAllowedOperations(allowedOperations);
  const delta = target - value;
  const magnitude = Math.max(1, Math.abs(delta));
  const candidates: Operation[] = [delta >= 0
    ? { kind: 'add', amount: Math.min(9, magnitude) }
    : { kind: 'subtract', amount: Math.min(9, magnitude) }];
  for (let amount = 2; amount <= 9; amount += 1) {
    candidates.push({ kind: 'add', amount }, { kind: 'subtract', amount });
  }
  if (value > 0 && value * 2 <= maxValue) candidates.push({ kind: 'multiply', amount: 2 });
  if (value > 0 && value % 2 === 0) candidates.push({ kind: 'divide', amount: 2 });
  if (value > 0 && value % 3 === 0) candidates.push({ kind: 'divide', amount: 3 });
  return uniqueOperations(candidates).filter(({ kind }) => allowed.has(kind));
}

export interface FindOperationPathOptions {
  readonly value: number;
  readonly target: number;
  readonly maxMoves: number;
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly allowedOperations?: readonly OperationKind[];
}

export function findOperationPath({
  value,
  target,
  maxMoves,
  minValue = -99,
  maxValue = 199,
  allowedOperations = OPERATION_KINDS,
}: FindOperationPathOptions): Operation[] | null {
  assertInteger(value, 'value');
  assertInteger(target, 'target');
  assertBounds(minValue, maxValue);
  if (!Number.isInteger(maxMoves) || maxMoves < 0) {
    throw new RangeError('maxMoves 必须是大于等于 0 的整数。');
  }
  normalizeAllowedOperations(allowedOperations);
  if (value < minValue || value > maxValue || target < minValue || target > maxValue) return null;
  if (value === target) return [];

  const visited = new Set([value]);
  let frontier: { readonly value: number; readonly path: readonly Operation[] }[] = [{ value, path: [] }];
  for (let depth = 0; depth < maxMoves; depth += 1) {
    const nextFrontier: typeof frontier = [];
    for (const node of frontier) {
      for (const operation of candidatesFor(node.value, target, maxValue, allowedOperations)) {
        const result = applyOperation(node.value, operation);
        if (result < minValue || result > maxValue || visited.has(result)) continue;
        const path = [...node.path, operation];
        if (result === target) return path;
        visited.add(result);
        nextFrontier.push({ value: result, path });
      }
    }
    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }
  return null;
}

export interface GenerateChoicesOptions {
  readonly value: number;
  readonly target: number;
  readonly rng: ChoiceRng;
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly movesRemaining?: number | null;
  readonly allowedOperations?: readonly OperationKind[];
}

export function generateChoices({
  value,
  target,
  rng,
  minValue = -99,
  maxValue = 199,
  movesRemaining = null,
  allowedOperations = OPERATION_KINDS,
}: GenerateChoicesOptions): OperationChoice[] {
  assertInteger(value, 'value');
  assertInteger(target, 'target');
  assertBounds(minValue, maxValue);
  if (!rng || typeof rng.pick !== 'function' || typeof rng.next !== 'function') {
    throw new TypeError('rng 必须提供 next() 和 pick(items)。');
  }
  const candidates = candidatesFor(value, target, maxValue, allowedOperations)
    .map((operation) => ({ ...operation, result: applyOperation(value, operation) }))
    .filter(({ result }) => result >= minValue && result <= maxValue)
    .sort((left, right) => distanceToTarget(left.result, target) - distanceToTarget(right.result, target));
  if (candidates.length < 2) throw new RangeError('当前数值边界内不足两个合法候选运算。');

  const helpfulPool = candidates.filter(({ result }) => (
    distanceToTarget(result, target) < distanceToTarget(value, target)
  ));
  const plannedPath = Number.isInteger(movesRemaining) && (movesRemaining ?? -1) >= 0
    ? findOperationPath({
      value,
      target,
      maxMoves: movesRemaining as number,
      minValue,
      maxValue,
      allowedOperations,
    })
    : null;
  const planned = plannedPath?.[0]
    ? candidates.find((candidate) => operationKey(candidate) === operationKey(plannedPath[0]!))
    : undefined;
  const rankedHelpful = helpfulPool.length > 0 ? helpfulPool : candidates.slice(0, 1);
  const helpful = planned ?? rng.pick(rankedHelpful.slice(0, Math.min(4, rankedHelpful.length)));
  const alternatePool = candidates.filter((operation) => operationKey(operation) !== operationKey(helpful));
  if (alternatePool.length === 0) throw new RangeError('无法生成与保底路径不同的第二个候选运算。');
  const alternate = rng.pick(alternatePool.slice(0, Math.min(8, alternatePool.length)));
  const pair = rng.next() > 0.5 ? [helpful, alternate] : [alternate, helpful];
  return pair.map((operation, index) => ({
    id: `${operation.kind}-${operation.amount}-${index}`,
    kind: operation.kind,
    amount: operation.amount,
    label: formatOperation(operation),
  }));
}
