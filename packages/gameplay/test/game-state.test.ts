import { test } from 'vitest';
import assert from 'node:assert/strict';
import { DEFAULT_DIFFICULTY, toLegacyGameRules } from '@number-strategy/difficulty';
import { GAME_PHASE, GameState } from '../src/game-state.js';
import { findOperationPath } from '../src/operations.js';

const GAME_RULES = toLegacyGameRules(DEFAULT_DIFFICULTY);

test('landing applies the selected operation and consumes exactly one move', () => {
  const state = new GameState({ seed: 7 });
  state.currentValue = 10;
  state.targetValue = 30;
  state.movesRemaining = 3;
  state.choices = [
    { id: 'add-5', kind: 'add', amount: 5, label: '+5' },
    { id: 'multiply-2', kind: 'multiply', amount: 2, label: '×2' },
  ];
  state.startCharge(1);
  state.updateCharge(620);
  const release = state.releaseCharge('perfect');
  assert.equal(release.accepted, true);
  state.setJumpProgress(1);
  state.resolveJump({ landed: true, reason: 'landed' });
  assert.equal(state.currentValue, 20);
  assert.equal(state.movesRemaining, 2);
  assert.equal(state.phase, GAME_PHASE.LANDING);
});

test('hitting the target completes the round after landing settles', () => {
  const state = new GameState({ seed: 8 });
  state.currentValue = 21;
  state.targetValue = 42;
  state.movesRemaining = 2;
  state.choices = [
    { id: 'multiply-2', kind: 'multiply', amount: 2, label: '×2' },
    { id: 'subtract-3', kind: 'subtract', amount: 3, label: '−3' },
  ];
  state.startCharge(0);
  state.updateCharge(620);
  state.releaseCharge('perfect');
  state.setJumpProgress(1);
  state.resolveJump({ landed: true, reason: 'landed' });
  const event = state.updateLanding(GAME_RULES.landingDurationMs);
  assert.equal(event.type, 'won');
  assert.equal(state.phase, GAME_PHASE.WON);
});

test('physical miss result ends the run without applying an operation', () => {
  const state = new GameState({ seed: 9 });
  const before = state.currentValue;
  state.startCharge(0);
  state.updateCharge(GAME_RULES.chargeMaxMs + 120);
  const release = state.releaseCharge('normal');
  assert.equal(release.accepted, true);
  state.setJumpProgress(1);
  const event = state.resolveJump({ landed: false, reason: 'overshoot' });
  assert.equal(event.type, 'miss');
  assert.equal(state.phase, GAME_PHASE.LOST);
  assert.equal(state.currentValue, before);
  assert.match(state.message, /越过平台/);
});

test('problematic seeds retain an exact winning branch within seven moves', () => {
  for (let seed = 0; seed < 5000; seed += 1) {
    const state = new GameState({ seed });
    while (state.currentValue !== state.targetValue) {
      const path = findOperationPath({
        value: state.currentValue,
        target: state.targetValue,
        maxMoves: state.movesRemaining,
        minValue: GAME_RULES.minValue,
        maxValue: GAME_RULES.maxValue,
      });
      assert.ok(path?.length, `seed ${seed} should remain solvable`);
      const next = path[0];
      const choiceIndex = state.choices.findIndex((choice) => (
        choice.kind === next.kind && choice.amount === next.amount
      ));
      assert.notEqual(choiceIndex, -1, `seed ${seed} should expose its planned operation`);

      assert.equal(state.startCharge(choiceIndex), true);
      assert.equal(state.releaseCharge().accepted, true);
      state.resolveJump(true);
      assert.equal(state.useChoices(state.createChoices()), true);
      state.updateLanding(GAME_RULES.landingDurationMs);
    }
    assert.equal(state.phase, GAME_PHASE.WON, `seed ${seed} should finish within the move budget`);
    assert.ok(state.movesRemaining >= 0);
  }
}, 15_000);

test('very high rounds cap the target and still select a reachable value', () => {
  const state = new GameState({ seed: 110 });
  state.round = 1_000_000;
  state.resetRound();

  assert.ok(state.targetValue <= GAME_RULES.maxValue);
  assert.ok(findOperationPath({
    value: state.currentValue,
    target: state.targetValue,
    maxMoves: state.movesRemaining,
    minValue: GAME_RULES.minValue,
    maxValue: GAME_RULES.maxValue,
  }));
});

test('charge accumulation rejects invalid deltas, saturates, and paused cancellation resumes ready', () => {
  const state = new GameState({ seed: 1 });
  state.startCharge(0);
  state.updateCharge(Number.NaN);
  state.updateCharge(-20);
  assert.equal(state.chargeMs, 0);
  state.updateCharge(GAME_RULES.chargeMaxMs * 2);
  assert.equal(state.chargeMs, GAME_RULES.chargeMaxMs);

  state.togglePause();
  assert.equal(state.phase, GAME_PHASE.PAUSED);
  assert.equal(state.cancelCharge(), true);
  state.togglePause();
  assert.equal(state.phase, GAME_PHASE.READY);
  assert.equal(state.selectedChoice, null);
});

test('invalid or duplicate external choices are rejected without replacement', () => {
  const state = new GameState({ seed: 2 });
  const original = state.choices;
  assert.equal(state.useChoices([
    { kind: 'divide', amount: 0 },
    { kind: 'add', amount: 2 },
  ]), false);
  assert.equal(state.useChoices([
    { kind: 'add', amount: 2 },
    { kind: 'add', amount: 2 },
  ]), false);
  assert.strictEqual(state.choices, original);
});
