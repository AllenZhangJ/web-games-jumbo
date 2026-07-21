import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaV1MatchCore } from '../../src/arena/arena-v1-match-core.js';
import {
  cloneBotSourceSnapshot,
  BOT_GOAL_ID,
  BOT_MOBILITY_INTENT,
  BotMobilityScheduler,
  createBotArenaView,
  createBotObservation,
  selectBotMobilityIntent,
} from '@number-strategy-jump/arena-bot';

function observationFromRaw(core, mutate = () => {}) {
  const raw = core.getSnapshot();
  mutate(raw);
  const source = cloneBotSourceSnapshot(raw);
  return createBotObservation({
    commandSnapshot: source,
    delayedSnapshot: source,
    selfId: 'player-2',
    arena: createBotArenaView(
      core.config.arena,
      core.getCharacterDefinition('player-2').collision.radius,
    ),
  });
}

function decision(goalId, target) {
  return { goalId, plan: { target, speedScale: 1, actionCandidate: false } };
}

test('mobility policy uses only current public affordance for crouch, air jump and slam', () => {
  const core = createArenaV1MatchCore({ seed: 81, config: { preparingTicks: 0 } });
  const grounded = observationFromRaw(core);
  assert.equal(selectBotMobilityIntent({
    observation: grounded,
    decision: decision(BOT_GOAL_ID.ACQUIRE_EQUIPMENT, {
      x: grounded.self.position.x - 5,
      y: grounded.self.position.y,
      z: grounded.self.position.z,
    }),
  }), BOT_MOBILITY_INTENT.CROUCH_JUMP);

  const airborne = observationFromRaw(core, (raw) => {
    const self = raw.participants.find(({ id }) => id === 'player-2');
    const opponent = raw.participants.find(({ id }) => id === 'player-1');
    self.position.y = 2.5;
    self.velocity.y = 0.5;
    self.grounded = false;
    self.supportSurfaceId = null;
    self.movement.grounded = false;
    self.actionAffordance.channels.jump.kind = 'selected';
    self.actionAffordance.channels.jump.actionDefinitionId = 'movement.explicit-air-jump';
    self.actionAffordance.channels.slam.kind = 'selected';
    self.actionAffordance.channels.slam.actionDefinitionId = 'movement.down-smash';
    opponent.position.x = self.position.x + 5;
    opponent.position.z = self.position.z;
  });
  assert.equal(selectBotMobilityIntent({
    observation: airborne,
    decision: decision(BOT_GOAL_ID.RECOVER_EDGE, { x: 0, y: 1, z: 0 }),
  }), BOT_MOBILITY_INTENT.JUMP);

  const aboveOpponent = observationFromRaw(core, (raw) => {
    const self = raw.participants.find(({ id }) => id === 'player-2');
    const opponent = raw.participants.find(({ id }) => id === 'player-1');
    self.position = { x: 0, y: 3, z: 0 };
    self.velocity.y = -1;
    self.grounded = false;
    self.supportSurfaceId = null;
    self.movement.grounded = false;
    self.actionAffordance.channels.slam.kind = 'selected';
    self.actionAffordance.channels.slam.actionDefinitionId = 'movement.down-smash';
    opponent.position = { x: 0.2, y: 1, z: 0 };
  });
  assert.equal(selectBotMobilityIntent({
    observation: aboveOpponent,
    decision: decision(BOT_GOAL_ID.RECOVER_EDGE, { x: 0, y: 1, z: 0 }),
  }), BOT_MOBILITY_INTENT.SLAM);
  core.destroy();
});

test('mobility scheduler emits one-tick edges, bounded hold/release and cancels on interruption', () => {
  const scheduler = new BotMobilityScheduler({
    minimumIntervalTicks: 4,
    crouchHoldTicks: 2,
  });
  assert.equal(scheduler.schedule(0, BOT_MOBILITY_INTENT.CROUCH_JUMP, true, true), true);
  assert.deepEqual(scheduler.sample(0, true), {
    jumpPressed: false,
    jumpHeld: true,
    slamPressed: false,
  });
  assert.deepEqual(scheduler.sample(1, true), {
    jumpPressed: false,
    jumpHeld: true,
    slamPressed: false,
  });
  assert.equal(scheduler.schedule(2, BOT_MOBILITY_INTENT.JUMP, true, true), false);
  assert.deepEqual(scheduler.sample(2, true), {
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  });
  for (let tick = 3; tick < 6; tick += 1) scheduler.sample(tick, true);
  assert.equal(scheduler.schedule(6, BOT_MOBILITY_INTENT.JUMP, true, true), true);
  assert.throws(
    () => scheduler.schedule(6, BOT_MOBILITY_INTENT.JUMP, true, true),
    /已调度/,
  );
  assert.throws(
    () => scheduler.schedule(7, BOT_MOBILITY_INTENT.JUMP, true, true),
    /尚未采样/,
  );
  assert.throws(() => scheduler.sample(7, true), /匹配已调度 tick 6/);
  assert.equal(scheduler.sample(6, true).jumpPressed, true);
  assert.throws(
    () => scheduler.schedule(6, BOT_MOBILITY_INTENT.JUMP, true, true),
    /下一未采样 tick/,
  );
  assert.throws(() => scheduler.sample(6, true), /tick 必须连续/);
  scheduler.schedule(7, BOT_MOBILITY_INTENT.CROUCH_JUMP, true, false);
  assert.deepEqual(scheduler.sample(7, false), {
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  });
  scheduler.destroy();
  scheduler.destroy();
  assert.throws(() => scheduler.sample(8, true), /已销毁/);
});
