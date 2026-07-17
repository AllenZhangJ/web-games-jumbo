import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNeutralInputFrame,
  normalizeInputFrame,
  normalizeInputFrames,
} from '../../src/arena/input-frame.js';

const participants = ['player-1', 'player-2'];

test('InputFrame validates tick, participant, booleans and normalized movement', () => {
  const normalized = normalizeInputFrame({
    tick: 3,
    participantId: 'player-1',
    moveX: 1,
    moveZ: 1,
    actionPressed: true,
    actionHeld: true,
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
    actionPressed: 1,
  }, { expectedTick: 3, participantIds: participants }), /布尔值/);
});

test('missing frames become neutral while duplicates are rejected', () => {
  const onlyFirst = createNeutralInputFrame(7, 'player-1');
  const result = normalizeInputFrames([onlyFirst], { tick: 7, participantIds: participants });
  assert.equal(result.length, 2);
  assert.equal(result[1].participantId, 'player-2');
  assert.equal(result[1].moveX, 0);
  assert.throws(() => normalizeInputFrames([onlyFirst, onlyFirst], {
    tick: 7,
    participantIds: participants,
  }), /重复输入/);
});
