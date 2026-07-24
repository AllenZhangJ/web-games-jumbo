import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNeutralInputFrame,
  normalizeInputFrame,
  normalizeInputFrames,
} from '@number-strategy-jump/arena-contracts';

const participants = ['player-1', 'player-2'];

test('InputFrame validates tick, participant, booleans and normalized movement', () => {
  const normalized = normalizeInputFrame({
    ...createNeutralInputFrame(3, 'player-1'),
    moveX: 1,
    moveZ: 1,
    primaryPressed: true,
    primaryHeld: true,
    jumpPressed: true,
    jumpHeld: true,
    slamPressed: false,
  }, { expectedTick: 3, participantIds: participants });
  assert.ok(Math.abs(Math.hypot(normalized.moveX, normalized.moveZ) - 1) < 1e-12);
  assert.throws(() => normalizeInputFrame({
    ...normalized,
    tick: 4,
  }, { expectedTick: 3, participantIds: participants }), /不一致/);
  assert.throws(() => normalizeInputFrame({
    ...normalized,
    participantId: 'unknown',
  }, { expectedTick: 3, participantIds: participants }), /未知/);
  assert.throws(() => normalizeInputFrame({
    ...normalized,
    primaryPressed: 1,
  }, { expectedTick: 3, participantIds: participants }), /布尔值/);
});

test('InputFrame V4 rejects legacy, unknown and accessor fields before gameplay reads them', () => {
  const legacy = {
    ...createNeutralInputFrame(0, 'player-1'),
    actionPressed: true,
  };
  assert.throws(() => normalizeInputFrame(legacy), /不支持字段 actionPressed/);
  const withUnknown = {
    ...createNeutralInputFrame(0, 'player-1'),
    mapperId: 'scheme-a',
  };
  assert.throws(() => normalizeInputFrame(withUnknown), /不支持字段 mapperId/);

  let getterCalls = 0;
  const accessor = { ...createNeutralInputFrame(0, 'player-1') };
  Object.defineProperty(accessor, 'primaryPressed', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return true;
    },
  });
  assert.throws(() => normalizeInputFrame(accessor), /数据字段/);
  assert.equal(getterCalls, 0);
});

test('missing frames become neutral while duplicates are rejected', () => {
  const onlyFirst = createNeutralInputFrame(7, 'player-1');
  const result = normalizeInputFrames([onlyFirst], { tick: 7, participantIds: participants });
  assert.equal(result.length, 2);
  const second = result[1];
  assert.ok(second);
  assert.equal(second.participantId, 'player-2');
  assert.equal(second.moveX, 0);
  assert.equal(second.jumpPressed, false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(second));
  assert.throws(() => normalizeInputFrames([onlyFirst, onlyFirst], {
    tick: 7,
    participantIds: participants,
  }), /重复输入/);
});
