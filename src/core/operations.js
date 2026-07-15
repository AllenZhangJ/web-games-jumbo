const OP_SYMBOLS = Object.freeze({ add: '+', subtract: '−', multiply: '×', divide: '÷' });

function assertInteger(value, name) {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${name} 必须是安全整数。`);
  }
}

function assertBounds(minValue, maxValue) {
  assertInteger(minValue, 'minValue');
  assertInteger(maxValue, 'maxValue');
  if (minValue > maxValue) throw new RangeError('minValue 不能大于 maxValue。');
}

function operationKey(operation) {
  return `${operation.kind}:${operation.amount}`;
}

function assertOperation(operation) {
  if (!operation || typeof operation !== 'object') {
    throw new TypeError('operation 必须是运算对象。');
  }
  if (!Object.prototype.hasOwnProperty.call(OP_SYMBOLS, operation.kind)) {
    throw new Error(`未知运算类型: ${operation.kind}`);
  }
  if (!Number.isSafeInteger(operation.amount) || operation.amount <= 0) {
    throw new RangeError('operation.amount 必须是正安全整数。');
  }
}

export function applyOperation(value, operation) {
  assertInteger(value, 'value');
  assertOperation(operation);
  switch (operation.kind) {
    case 'add':
      return value + operation.amount;
    case 'subtract':
      return value - operation.amount;
    case 'multiply':
      return value * operation.amount;
    case 'divide':
      return Number.isInteger(value / operation.amount) ? value / operation.amount : value;
    default:
      throw new Error(`未知运算类型: ${operation.kind}`);
  }
}

export function formatOperation(operation) {
  assertOperation(operation);
  return `${OP_SYMBOLS[operation.kind]}${operation.amount}`;
}

export function distanceToTarget(value, target) {
  assertInteger(value, 'value');
  assertInteger(target, 'target');
  return Math.abs(target - value);
}

function uniqueOperations(operations) {
  const seen = new Set();
  return operations.filter((operation) => {
    const key = operationKey(operation);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function candidatesFor(value, target, maxValue = 199) {
  const delta = target - value;
  const magnitude = Math.max(1, Math.abs(delta));
  const direct = delta >= 0
    ? { kind: 'add', amount: Math.min(9, magnitude) }
    : { kind: 'subtract', amount: Math.min(9, magnitude) };

  const candidates = [direct];
  for (let amount = 2; amount <= 9; amount += 1) {
    candidates.push({ kind: 'add', amount });
    candidates.push({ kind: 'subtract', amount });
  }
  if (value > 0 && value * 2 <= maxValue) candidates.push({ kind: 'multiply', amount: 2 });
  if (value > 0 && value % 2 === 0) candidates.push({ kind: 'divide', amount: 2 });
  if (value > 0 && value % 3 === 0) candidates.push({ kind: 'divide', amount: 3 });
  return uniqueOperations(candidates);
}

/**
 * Finds a shortest legal operation path. The value space is deliberately
 * bounded, so this breadth-first search is deterministic and small (299 values
 * with the production rules). It is used to keep every generated round
 * winnable instead of relying on a merely distance-reducing greedy choice.
 */
export function findOperationPath({
  value,
  target,
  maxMoves,
  minValue = -99,
  maxValue = 199,
}) {
  assertInteger(value, 'value');
  assertInteger(target, 'target');
  assertBounds(minValue, maxValue);
  if (!Number.isInteger(maxMoves) || maxMoves < 0) {
    throw new RangeError('maxMoves 必须是大于等于 0 的整数。');
  }
  if (value < minValue || value > maxValue || target < minValue || target > maxValue) {
    return null;
  }
  if (value === target) return [];

  const visited = new Set([value]);
  let frontier = [{ value, path: [] }];
  for (let depth = 0; depth < maxMoves; depth += 1) {
    const nextFrontier = [];
    for (const node of frontier) {
      for (const operation of candidatesFor(node.value, target, maxValue)) {
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

export function generateChoices({
  value,
  target,
  rng,
  minValue = -99,
  maxValue = 199,
  movesRemaining = null,
}) {
  assertInteger(value, 'value');
  assertInteger(target, 'target');
  assertBounds(minValue, maxValue);
  if (!rng || typeof rng.pick !== 'function' || typeof rng.next !== 'function') {
    throw new TypeError('rng 必须提供 next() 和 pick(items)。');
  }

  const candidates = candidatesFor(value, target, maxValue)
    .map((operation) => ({
      ...operation,
      result: applyOperation(value, operation),
    }))
    .filter((operation) => operation.result >= minValue && operation.result <= maxValue)
    .sort((a, b) => distanceToTarget(a.result, target) - distanceToTarget(b.result, target));

  if (candidates.length < 2) {
    throw new RangeError('当前数值边界内不足两个合法候选运算。');
  }

  const helpfulPool = candidates.filter((operation) =>
    distanceToTarget(operation.result, target) < distanceToTarget(value, target),
  );
  const plannedPath = Number.isInteger(movesRemaining) && movesRemaining >= 0
    ? findOperationPath({ value, target, maxMoves: movesRemaining, minValue, maxValue })
    : null;
  const planned = plannedPath?.[0]
    ? candidates.find((candidate) => operationKey(candidate) === operationKey(plannedPath[0]))
    : null;
  const rankedHelpful = helpfulPool.length > 0 ? helpfulPool : candidates.slice(0, 1);
  const helpful = planned
    ?? rng.pick(rankedHelpful.slice(0, Math.min(4, rankedHelpful.length)));
  const alternatePool = candidates.filter((operation) =>
    operation.kind !== helpful.kind || operation.amount !== helpful.amount,
  );
  if (alternatePool.length === 0) {
    throw new RangeError('无法生成与保底路径不同的第二个候选运算。');
  }
  const alternate = rng.pick(alternatePool.slice(0, Math.min(8, alternatePool.length)));
  const pair = rng.next() > 0.5 ? [helpful, alternate] : [alternate, helpful];

  return pair.map(({ result: _result, ...operation }, index) => ({
    id: `${operation.kind}-${operation.amount}-${index}`,
    ...operation,
    label: formatOperation(operation),
  }));
}
