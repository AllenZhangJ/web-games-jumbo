import { expect, test } from 'vitest';
import { toLegacyGameRules, NORMAL_DIFFICULTY } from '@number-strategy/difficulty';
import { GAME_PHASE, GameState, findOperationPath } from '@number-strategy/gameplay';

test('1000 deterministic standalone sessions finish without an unsolvable or negative-move state', {
  timeout: 20_000,
}, () => {
  const rules = toLegacyGameRules(NORMAL_DIFFICULTY);
  for (let seed = 0; seed < 1_000; seed += 1) {
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
      expect(path?.length, `seed ${seed} should remain solvable`).toBeGreaterThan(0);
      const next = path![0]!;
      const choiceIndex = state.choices.findIndex((choice) => (
        choice.kind === next.kind && choice.amount === next.amount
      ));
      expect(choiceIndex).toBeGreaterThanOrEqual(0);
      expect(state.startCharge(choiceIndex)).toBe(true);
      expect(state.releaseCharge()?.accepted).toBe(true);
      expect(state.resolveJump(true)?.type).toBe('land');
      if (state.currentValue !== state.targetValue) {
        expect(state.useChoices(state.createChoices())).toBe(true);
      }
      state.updateLanding(rules.landingDurationMs);
    }
    expect(state.phase).toBe(GAME_PHASE.WON);
    expect(state.movesRemaining).toBeGreaterThanOrEqual(0);
  }
});
