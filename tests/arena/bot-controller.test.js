import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOT_DIFFICULTY_PROFILES,
  BOT_GOAL_ID,
  BotController,
} from '@number-strategy-jump/arena-bot';
import { createArenaV1MatchCore } from '../../src/arena/arena-v1-match-core.js';

function createController(core, difficultyId = 'hard') {
  const character = core.getCharacterDefinition('player-2');
  return new BotController({
    participantId: 'player-2',
    difficultyId,
    behaviorSeed: 100,
    personalitySeed: 200,
    arena: core.config.arena,
    characterRadius: character.collision.radius,
    maximumStepHeight: character.movement.automaticStepHeight,
  });
}

test('same bot seed and observations produce identical bounded InputFrames', () => {
  const core = createArenaV1MatchCore({ seed: 3, config: { preparingTicks: 0 } });
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
  assert.ok(hard.minimumMobilityIntervalTicks >= 14);
  assert.ok(hard.crouchHoldTicks >= 8);
});

test('bot pursues only visible reachable equipment through ordinary bounded movement input', () => {
  const core = createArenaV1MatchCore({ seed: 41, config: { preparingTicks: 0 } });
  const controller = createController(core, 'hard');
  const frame = controller.createInput(core.getSnapshot());
  const debug = controller.getDebugSnapshot();
  assert.equal(debug.goalId, BOT_GOAL_ID.ACQUIRE_EQUIPMENT);
  assert.equal(frame.primaryPressed, false);
  assert.ok(Math.hypot(frame.moveX, frame.moveZ) > 0);
  assert.ok(Math.hypot(frame.moveX, frame.moveZ) <= 1 + 1e-12);
  controller.destroy();
  core.destroy();
});

test('BotController enforces consecutive ticks and idempotent destruction', () => {
  const core = createArenaV1MatchCore({ seed: 5, config: { preparingTicks: 0 } });
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

test('invalid snapshot identity does not consume history or RNG and the same tick remains retryable', () => {
  const core = createArenaV1MatchCore({ seed: 13, config: { preparingTicks: 0 } });
  const recovering = createController(core, 'hard');
  const fresh = createController(core, 'hard');
  const snapshot = core.getSnapshot();
  const invalid = structuredClone(snapshot);
  invalid.participants[1].id = 'intruder';
  assert.throws(() => recovering.createInput(invalid), /participant 身份不一致|参赛者身份不一致/);
  assert.deepEqual(recovering.getDebugSnapshot(), fresh.getDebugSnapshot());
  assert.deepEqual(recovering.createInput(snapshot), fresh.createInput(snapshot));
  recovering.destroy();
  fresh.destroy();
  core.destroy();
});

test('debug snapshot is deeply frozen and cannot mutate controller state', () => {
  const core = createArenaV1MatchCore({ seed: 17, config: { preparingTicks: 0 } });
  const controller = createController(core, 'normal');
  controller.createInput(core.getSnapshot());
  const debug = controller.getDebugSnapshot();
  assert.equal(Object.isFrozen(debug), true);
  assert.equal(Object.isFrozen(debug.personality), true);
  assert.equal(Object.isFrozen(debug.mobility), true);
  assert.throws(() => { debug.mobility.nextMobilityTick = 999; }, TypeError);
  assert.notEqual(controller.getDebugSnapshot().mobility.nextMobilityTick, 999);
  controller.destroy();
  core.destroy();
});

test('createInput rejects reentrancy without poisoning the retryable input boundary', () => {
  const core = createArenaV1MatchCore({ seed: 19, config: { preparingTicks: 0 } });
  const controller = createController(core, 'hard');
  const fresh = createController(core, 'hard');
  const snapshot = core.getSnapshot();
  let reentered = false;
  const proxy = new Proxy(snapshot, {
    getOwnPropertyDescriptor(target, property) {
      if (!reentered) {
        reentered = true;
        controller.createInput(snapshot);
      }
      return Reflect.getOwnPropertyDescriptor(target, property);
    },
  });
  assert.throws(() => controller.createInput(proxy), /不允许重入/);
  assert.deepEqual(controller.createInput(snapshot), fresh.createInput(snapshot));
  controller.destroy();
  fresh.destroy();
  core.destroy();
});

test('an internal planning failure destroys the controller instead of continuing partial state', () => {
  const core = createArenaV1MatchCore({ seed: 23, config: { preparingTicks: 0 } });
  const controller = createController(core, 'hard');
  const cosine = Math.cos;
  Math.cos = () => { throw new Error('forced internal failure'); };
  try {
    assert.throws(() => controller.createInput(core.getSnapshot()), /forced internal failure/);
  } finally {
    Math.cos = cosine;
  }
  assert.throws(() => controller.createInput(core.getSnapshot()), /已销毁/);
  controller.destroy();
  core.destroy();
});
