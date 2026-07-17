import test from 'node:test';
import assert from 'node:assert/strict';
import { BotController } from '../../src/arena/ai/bot-controller.js';
import { BOT_DIFFICULTY_PROFILES } from '../../src/arena/ai/bot-difficulty.js';
import { MatchCore } from '../../src/arena/match-core.js';

function createController(core, difficultyId = 'hard') {
  return new BotController({
    participantId: 'player-2',
    difficultyId,
    behaviorSeed: 100,
    personalitySeed: 200,
    arena: core.config.arena,
    characterRadius: core.config.character.radius,
    basePush: core.config.basePush,
  });
}

test('same bot seed and observations produce identical bounded InputFrames', () => {
  const core = new MatchCore({ seed: 3, config: { preparingTicks: 0 } });
  const first = createController(core);
  const second = createController(core);
  for (let tick = 0; tick < 180; tick += 1) {
    const snapshot = core.getSnapshot();
    const firstFrame = first.createInput(snapshot);
    const secondFrame = second.createInput(snapshot);
    assert.deepEqual(firstFrame, secondFrame);
    assert.ok(Math.hypot(firstFrame.moveX, firstFrame.moveZ) <= 1 + 1e-12);
    core.step([firstFrame]);
    if (core.result) break;
  }
  first.destroy();
  second.destroy();
  core.destroy();
});

test('hard bot remains human-limited instead of receiving instant perfect control', () => {
  const hard = BOT_DIFFICULTY_PROFILES.hard;
  assert.ok(hard.observationDelayTicks >= 6);
  assert.ok(hard.replanIntervalTicks >= 4);
  assert.ok(hard.directionJitterRadians > 0);
  assert.ok(hard.actionCommitChance < 1);
  assert.ok(hard.shortPauseChance > 0);
});

test('BotController enforces consecutive ticks and idempotent destruction', () => {
  const core = new MatchCore({ seed: 5, config: { preparingTicks: 0 } });
  const controller = createController(core, 'normal');
  controller.createInput(core.getSnapshot());
  core.step([]);
  core.step([]);
  assert.throws(() => controller.createInput(core.getSnapshot()), /tick 必须连续/);
  controller.destroy();
  controller.destroy();
  assert.throws(() => controller.createInput(core.getSnapshot()), /已销毁/);
  core.destroy();
});
