import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILTIN_DIFFICULTIES,
  toLegacyGameRules,
  validateDifficultyProfile,
} from '@number-strategy/difficulty';
import { createRuntimeConfig } from '../src/config.js';
import { GAME_PHASE, GameState, findOperationPath } from '@number-strategy/gameplay';

test('easy, normal and hard each keep 10000 seeded rounds winnable', { timeout: 30_000 }, () => {
  for (const profile of BUILTIN_DIFFICULTIES) {
    const rules = toLegacyGameRules(profile);
    for (let seed = 0; seed < 10_000; seed += 1) {
      const state = new GameState({ seed, rules });
      while (state.currentValue !== state.targetValue) {
        const path = findOperationPath({
          value: state.currentValue,
          target: state.targetValue,
          maxMoves: state.movesRemaining,
          minValue: rules.minValue,
          maxValue: rules.maxValue,
          allowedOperations: rules.allowedOperations,
        });
        assert.ok(path?.length, `${profile.id}@${profile.version} seed ${seed} should be solvable`);
        const next = path[0];
        const choiceIndex = state.choices.findIndex((choice) => (
          choice.kind === next.kind && choice.amount === next.amount
        ));
        assert.notEqual(
          choiceIndex,
          -1,
          `${profile.id}@${profile.version} seed ${seed} should expose its planned operation`,
        );
        assert.equal(state.startCharge(choiceIndex), true);
        assert.equal(state.releaseCharge().accepted, true);
        state.resolveJump(true);
        if (state.currentValue !== state.targetValue) {
          assert.equal(state.useChoices(state.createChoices()), true);
        }
        state.updateLanding(rules.landingDurationMs);
      }
      assert.equal(state.phase, GAME_PHASE.WON);
      assert.ok(state.movesRemaining >= 0);
    }
  }
});

test('difficulty and rules reject malformed external configuration before runtime mutation', () => {
  for (const malformed of [null, [], {}, { id: 4, version: '1' }]) {
    assert.equal(validateDifficultyProfile(malformed).valid, false);
    assert.throws(() => createRuntimeConfig(malformed), /难度配置无效/);
  }

  assert.throws(() => new GameState({
    rules: { allowedOperations: ['add', 'add'] },
  }), /重复运算/);
  assert.throws(() => new GameState({
    rules: { allowedOperations: ['add', 'teleport'] },
  }), /未知运算/);
});

test('a restricted operation set never leaks a disabled operation', () => {
  const rules = {
    ...toLegacyGameRules(BUILTIN_DIFFICULTIES[0]),
    allowedOperations: ['add', 'subtract'],
  };
  for (let seed = 0; seed < 100; seed += 1) {
    const state = new GameState({ seed, rules });
    assert.ok(state.choices.every(({ kind }) => rules.allowedOperations.includes(kind)));
  }
});
