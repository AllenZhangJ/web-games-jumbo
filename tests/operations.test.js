import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOperation,
  findOperationPath,
  formatOperation,
  generateChoices,
} from '../src/core/operations.js';
import { createRng } from '../src/core/rng.js';

test('applyOperation supports the four game operations', () => {
  assert.equal(applyOperation(8, { kind: 'add', amount: 4 }), 12);
  assert.equal(applyOperation(8, { kind: 'subtract', amount: 3 }), 5);
  assert.equal(applyOperation(8, { kind: 'multiply', amount: 2 }), 16);
  assert.equal(applyOperation(8, { kind: 'divide', amount: 2 }), 4);
  assert.equal(formatOperation({ kind: 'multiply', amount: 2 }), '×2');
});

test('generateChoices always exposes a route that moves toward the target', () => {
  const rng = createRng(42);
  for (let value = 4; value <= 48; value += 4) {
    const target = 60;
    const choices = generateChoices({ value, target, rng });
    assert.equal(choices.length, 2);
    assert.ok(choices.some((choice) => Math.abs(target - applyOperation(value, choice)) < Math.abs(target - value)));
  }
});

test('planned choices expose the first step of an exact bounded solution', () => {
  const rng = createRng(45);
  const path = findOperationPath({ value: 18, target: 199, maxMoves: 7 });
  assert.ok(path);
  assert.ok(path.length <= 7);

  const choices = generateChoices({
    value: 18,
    target: 199,
    movesRemaining: 7,
    rng,
  });
  assert.ok(choices.some((choice) => (
    choice.kind === path[0].kind && choice.amount === path[0].amount
  )));
});

test('invalid operations and empty RNG picks fail before corrupting numeric state', () => {
  assert.throws(() => applyOperation(8, { kind: 'divide', amount: 0 }), /正安全整数/);
  assert.throws(() => applyOperation(Number.NaN, { kind: 'add', amount: 2 }), /安全整数/);
  assert.throws(() => createRng(1).pick([]), /非空数组/);
  assert.throws(() => createRng(1).int(4, 3), /min <= max/);
});
