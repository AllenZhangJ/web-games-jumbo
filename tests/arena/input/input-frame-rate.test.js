import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaV1MatchCore } from '../../../src/arena/arena-v1-match-core.js';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import { createGestureInputMapperA } from '@number-strategy-jump/arena-presentation-runtime';
import { InputSampler } from '../../../src/arena/presentation/input/input-sampler.js';
import { FixedStepMatchRuntime } from '@number-strategy-jump/arena-match';

const VIEWPORT = Object.freeze({ width: 400, height: 800 });
const point = (pointerId, x, y) => ({ pointerId, x, y });

const INPUT_EVENTS = new Map([
  [0, [['start', point(1, 100, 600)]]],
  [1, [['move', point(1, 150, 600)]]],
  [10, [['start', point(2, 320, 600)]]],
  [11, [['end', point(2, 320, 600)]]],
  [30, [['end', point(1, 150, 600)]]],
  [40, [['start', point(3, 100, 600)]]],
  [41, [['move', point(3, 100, 530)]]],
  [42, [['end', point(3, 100, 530)]]],
  [55, [['start', point(4, 100, 600)]]],
  [56, [['move', point(4, 100, 530)]]],
  [57, [['end', point(4, 100, 530)]]],
  [70, [['start', point(5, 100, 600)]]],
  [71, [['move', point(5, 100, 680)]]],
  [72, [['end', point(5, 100, 680)]]],
  [100, [['start', point(6, 100, 600)]]],
  [101, [['move', point(6, 40, 600)]]],
  [130, [['cancel', point(6, 40, 600)]]],
]);

function applyInputEvents(sampler, tick) {
  for (const [kind, inputPoint] of INPUT_EVENTS.get(tick) ?? []) {
    if (kind === 'start') sampler.pointerStart(inputPoint);
    else if (kind === 'move') sampler.pointerMove(inputPoint);
    else if (kind === 'end') sampler.pointerEnd(inputPoint);
    else sampler.pointerCancel(inputPoint);
  }
}

function runAtOuterRate(hz) {
  const core = createArenaV1MatchCore({
    seed: 64_007,
    config: {
      preparingTicks: 0,
      equipment: { initialSpawns: [] },
      suddenDeathStartTick: 1_000,
      hardLimitTicks: 1_200,
    },
  });
  const sampler = new InputSampler({
    participantId: 'player-1',
    viewport: VIEWPORT,
    mapper: createGestureInputMapperA(),
    gesture: { holdActivationTicks: 3 },
  });
  const frames = [];
  const runtime = new FixedStepMatchRuntime(core, {
    inputProvider(snapshot) {
      applyInputEvents(sampler, snapshot.tick);
      const player = snapshot.participants.find(({ id }) => id === 'player-1');
      const input = sampler.sample(snapshot.tick, {
        actionAffordance: player.actionAffordance,
      });
      frames.push(input);
      return [input, createNeutralInputFrame(snapshot.tick, 'player-2')];
    },
  });
  const outerFrames = Math.round(180 * hz / 60);
  for (let index = 0; index < outerFrames; index += 1) {
    const result = runtime.advance(1 / hz);
    assert.equal(result.saturated, false);
    assert.equal(result.droppedSeconds, 0);
  }
  assert.equal(core.tick, 180);
  const result = {
    hash: core.getStateHash(),
    frames,
    snapshot: core.getSnapshot(),
  };
  runtime.destroy();
  sampler.destroy();
  core.destroy();
  return result;
}

test('30/60/120Hz outer schedules produce identical sampled V4 frames and Core state', () => {
  const at30 = runAtOuterRate(30);
  const at60 = runAtOuterRate(60);
  const at120 = runAtOuterRate(120);
  assert.deepEqual(at30.frames, at60.frames);
  assert.deepEqual(at60.frames, at120.frames);
  assert.equal(at30.hash, at60.hash);
  assert.equal(at60.hash, at120.hash);
  assert.deepEqual(at30.snapshot, at60.snapshot);
  assert.deepEqual(at60.snapshot, at120.snapshot);
});
