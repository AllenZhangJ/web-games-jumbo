import test from 'node:test';
import assert from 'node:assert/strict';
import { createContextInputMapperB } from '../../../src/arena/presentation/input/context-input-mapper-b.js';
import { createGestureInputMapperA } from '../../../src/arena/presentation/input/gesture-input-mapper-a.js';
import { InputSampler } from '../../../src/arena/presentation/input/input-sampler.js';

const viewport = Object.freeze({ width: 400, height: 800 });
const point = (pointerId, x, y) => ({ pointerId, x, y });

function outcome(kind, lane, actionDefinitionId) {
  return {
    kind,
    actionDefinitionId,
    lane,
    source: actionDefinitionId === null ? null : 'test-provider',
    reason: kind === 'selected' ? 'candidate-selected' : 'no-available-candidate',
  };
}

function actionAffordance(tick, {
  primaryLane = 'locomotion',
  primaryHoldLane = 'locomotion',
} = {}) {
  return {
    tick,
    participantId: 'player-1',
    primaryActionDefinitionId: 'test-primary',
    channels: {
      primary: outcome('selected', primaryLane, 'test-primary'),
      primaryHold: outcome('selected', primaryHoldLane, 'test-primary-hold'),
      jump: outcome('none', null, null),
      slam: outcome('none', null, null),
    },
  };
}

test('Mapper A uses move swipes for quick jump, held crouch jump and down smash', () => {
  const sampler = new InputSampler({
    participantId: 'player-1',
    viewport,
    mapper: createGestureInputMapperA(),
    gesture: { holdActivationTicks: 3 },
  });
  sampler.pointerStart(point(1, 100, 600));
  sampler.sample(0);
  sampler.pointerMove(point(1, 100, 540));
  const swipe = sampler.sample(1);
  assert.equal(swipe.jumpPressed, false);
  assert.ok(swipe.moveZ > 0);
  sampler.pointerEnd(point(1, 100, 540));
  assert.equal(sampler.sample(2).jumpPressed, true);

  sampler.pointerStart(point(2, 100, 600));
  sampler.sample(3);
  sampler.pointerMove(point(2, 100, 540));
  sampler.sample(4);
  assert.equal(sampler.sample(5).jumpHeld, true);
  assert.equal(sampler.sample(6).jumpHeld, true);
  sampler.pointerEnd(point(2, 100, 540));
  const release = sampler.sample(7);
  assert.equal(release.jumpPressed, false);
  assert.equal(release.jumpHeld, false);

  sampler.pointerStart(point(3, 100, 600));
  sampler.sample(8);
  sampler.pointerMove(point(3, 100, 670));
  assert.equal(sampler.sample(9).slamPressed, true);
  assert.equal(sampler.sample(10).slamPressed, false);
  sampler.destroy();
});

test('Mapper A primary is immediate while Mapper B delays tap/hold and suppresses down drag', () => {
  const immediate = new InputSampler({
    participantId: 'player-1',
    viewport,
    mapper: createGestureInputMapperA(),
  });
  immediate.pointerStart(point(4, 320, 600));
  const pressed = immediate.sample(0);
  assert.equal(pressed.primaryPressed, true);
  assert.equal(pressed.primaryHeld, true);
  immediate.pointerCancel(point(4, 320, 600));
  assert.equal(immediate.sample(1).primaryHeld, false);
  immediate.destroy();

  const contextual = new InputSampler({
    participantId: 'player-1',
    viewport,
    mapper: createContextInputMapperB(),
    gesture: { holdActivationTicks: 3 },
  });
  contextual.pointerStart(point(5, 320, 600));
  assert.equal(contextual.sample(0).primaryPressed, false);
  contextual.pointerEnd(point(5, 320, 600));
  assert.equal(contextual.sample(1).primaryPressed, true);

  contextual.pointerStart(point(6, 320, 600));
  contextual.sample(2, { actionAffordance: actionAffordance(2) });
  contextual.sample(3, { actionAffordance: actionAffordance(3) });
  const held = contextual.sample(4, { actionAffordance: actionAffordance(4) });
  assert.equal(held.primaryPressed, false);
  assert.equal(held.primaryHeld, true);
  assert.equal(
    contextual.sample(5, { actionAffordance: actionAffordance(5) }).primaryPressed,
    false,
  );
  assert.equal(
    contextual.sample(5 + 1, { actionAffordance: actionAffordance(6) }).primaryHeld,
    true,
  );
  contextual.pointerEnd(point(6, 320, 600));
  assert.equal(
    contextual.sample(7, { actionAffordance: actionAffordance(7) }).primaryHeld,
    false,
  );

  contextual.pointerStart(point(7, 320, 600));
  contextual.sample(8);
  contextual.pointerMove(point(7, 320, 670));
  const slam = contextual.sample(9);
  assert.equal(slam.slamPressed, true);
  assert.equal(slam.primaryPressed, false);
  assert.equal(slam.primaryHeld, false);
  contextual.destroy();

  const actionHold = new InputSampler({
    participantId: 'player-1',
    viewport,
    mapper: createContextInputMapperB(),
    gesture: { holdActivationTicks: 3 },
  });
  actionHold.pointerStart(point(8, 320, 600));
  actionHold.sample(0, {
    actionAffordance: actionAffordance(0, { primaryLane: 'combat' }),
  });
  actionHold.sample(1, {
    actionAffordance: actionAffordance(1, { primaryLane: 'combat' }),
  });
  const actionPress = actionHold.sample(2, {
    actionAffordance: actionAffordance(2, { primaryLane: 'combat' }),
  });
  assert.equal(actionPress.primaryPressed, true);
  assert.equal(actionPress.primaryHeld, false);
  assert.equal(actionHold.sample(3, {
    actionAffordance: actionAffordance(3, { primaryLane: 'combat' }),
  }).primaryPressed, false);
  actionHold.destroy();
});

test('InputSampler handles catch-up edges, lifecycle clearing and terminal mapper failure', () => {
  const sampler = new InputSampler({
    participantId: 'player-1',
    viewport,
    mapper: createGestureInputMapperA(),
  });
  sampler.pointerStart(point(11, 320, 600));
  assert.equal(sampler.sample(40).primaryPressed, true);
  assert.equal(sampler.sample(41).primaryPressed, false);
  assert.equal(sampler.sample(41 + 1).primaryHeld, true);
  assert.throws(() => sampler.sample(42), /tick 必须连续/);
  assert.equal(sampler.suspend(), true);
  assert.equal(sampler.suspend(), false);
  assert.throws(() => sampler.sample(43), /暂停/);
  assert.equal(sampler.pointerEnd(point(11, 320, 600)), false);
  assert.equal(sampler.resume(), true);
  assert.equal(sampler.pointerMove(point(11, 330, 610)), false);
  assert.deepEqual(sampler.sample(43), {
    tick: 43,
    participantId: 'player-1',
    moveX: 0,
    moveZ: 0,
    primaryPressed: false,
    primaryHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  });
  sampler.destroy();
  sampler.destroy();
  assert.throws(() => sampler.sample(44), /已销毁/);

  const broken = new InputSampler({
    participantId: 'player-1',
    viewport,
    mapper: Object.freeze({
      id: 'broken-test-mapper',
      map: () => ({ moveX: Number.NaN }),
    }),
  });
  assert.throws(() => broken.sample(0), /moveX|InputMapper/);
  assert.throws(() => broken.sample(0), /失败关闭/);
  broken.destroy();
});
