import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { GameState } from '@number-strategy/gameplay';

const fixturePath = path.join(import.meta.dirname, 'fixtures', 'baseline-v0.1.0.json');

test('normal@1 preserves the v0.1.0 deterministic initial round baseline', async () => {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));

  for (const expected of fixture.initialRounds) {
    const state = new GameState({ seed: expected.seed });
    assert.deepEqual({
      seed: expected.seed,
      round: state.round,
      currentValue: state.currentValue,
      targetValue: state.targetValue,
      movesRemaining: state.movesRemaining,
      choices: state.choices.map(({ kind, amount }) => `${kind}:${amount}`),
    }, expected);
  }
});

test('normal@1 replays the frozen full winning route exactly', async () => {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  const replay = fixture.fullReplay;
  const state = new GameState({ seed: replay.seed });

  for (const expected of replay.steps) {
    assert.equal(state.currentValue, expected.before);
    assert.equal(state.movesRemaining, expected.movesBefore);
    const choice = state.choices[expected.choiceIndex]!;
    assert.equal(`${choice.kind}:${choice.amount}`, expected.choice);
    assert.equal(state.startCharge(expected.choiceIndex), true);
    assert.equal(state.releaseCharge()!.accepted, true);
    assert.equal(state.resolveJump(true)!.type, 'land');
    if (state.currentValue !== state.targetValue) {
      assert.equal(state.useChoices(state.createChoices()), true);
    }
    state.updateLanding(state.rules.landingDurationMs);
    assert.equal(state.currentValue, expected.after);
    assert.equal(state.phase, expected.phase);
  }

  assert.deepEqual({
    value: state.currentValue,
    movesRemaining: state.movesRemaining,
    phase: state.phase,
  }, replay.final);
});

test('the frozen phone screenshot remains byte-identical', async () => {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  const screenshot = await readFile(path.resolve(fixture.render.path));
  assert.equal(createHash('sha256').update(screenshot).digest('hex'), fixture.render.sha256);
});
