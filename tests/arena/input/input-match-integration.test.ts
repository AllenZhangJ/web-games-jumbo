import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { STAGE4_ACTION_ID } from '@number-strategy-jump/arena-v1-content';
import { STAGE6_MOVEMENT_ACTION_ID } from '@number-strategy-jump/arena-v1-content';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import { ARENA_MATCH_EVENT, type MatchCore } from '@number-strategy-jump/arena-match';
import { MOVEMENT_MODE } from '@number-strategy-jump/arena-movement';
import {
  createContextInputMapperB,
  createGestureInputMapperA,
  type ArenaInputMapper,
  InputSampler,
} from '@number-strategy-jump/arena-presentation-runtime';

const VIEWPORT = Object.freeze({ width: 400, height: 800 });
const WIDE_ARENA = Object.freeze({
  killY: -8,
  surfaces: Object.freeze([Object.freeze({
    id: 'input-integration-platform',
    center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
    halfExtents: Object.freeze({ x: 8, y: 0.5, z: 5 }),
  })]),
  spawns: Object.freeze([
    Object.freeze({ x: -3, y: 1, z: 0 }),
    Object.freeze({ x: 3, y: 1, z: 0 }),
  ]),
});

const point = (pointerId: number, x: number, y: number) => ({ pointerId, x, y });

function required<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) throw new Error(`测试缺少 ${name}。`);
  return value;
}

function createCore(config: Record<string, unknown> = {}): MatchCore {
  return createArenaV1MatchCore({
    seed: 6_404,
    config: {
      arena: WIDE_ARENA,
      equipment: { initialSpawns: [] },
      preparingTicks: 0,
      suddenDeathStartTick: 1_000,
      hardLimitTicks: 1_200,
      ...config,
    },
  });
}

function createSampler(mapper: ArenaInputMapper): InputSampler {
  return new InputSampler({
    participantId: 'player-1',
    viewport: VIEWPORT,
    mapper,
    gesture: { holdActivationTicks: 3 },
  });
}

function step(core: MatchCore, sampler: InputSampler): ReturnType<MatchCore['step']> {
  const snapshot = core.getSnapshot();
  const player = required(
    snapshot.participants.find(({ id }) => id === 'player-1'),
    'player-1 快照',
  );
  const input = sampler.sample(snapshot.tick, {
    actionAffordance: player.actionAffordance,
  });
  return core.step([
    input,
    createNeutralInputFrame(snapshot.tick, 'player-2'),
  ]);
}

function started(events: ReturnType<MatchCore['step']>, action: string): boolean {
  return events.some((event) => (
    event.type === ARENA_MATCH_EVENT.ACTION_STARTED
    && event.action === action
  ));
}

test('Mapper A drives MatchCore ground jump, air jump and down smash through V4 input', () => {
  const core = createCore();
  const sampler = createSampler(createGestureInputMapperA());

  sampler.pointerStart(point(1, 100, 600));
  step(core, sampler);
  sampler.pointerMove(point(1, 100, 530));
  step(core, sampler);
  sampler.pointerEnd(point(1, 100, 530));
  assert.equal(started(
    step(core, sampler),
    STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
  ), true);

  sampler.pointerStart(point(2, 100, 600));
  step(core, sampler);
  sampler.pointerMove(point(2, 100, 530));
  step(core, sampler);
  sampler.pointerEnd(point(2, 100, 530));
  assert.equal(started(
    step(core, sampler),
    STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP,
  ), true);

  sampler.pointerStart(point(3, 100, 600));
  step(core, sampler);
  sampler.pointerMove(point(3, 100, 680));
  assert.equal(started(
    step(core, sampler),
    STAGE6_MOVEMENT_ACTION_ID.DOWN_SMASH,
  ), true);

  sampler.destroy();
  core.destroy();
});

test('Mapper A long upward hold begins and releases an explicit crouch jump', () => {
  const core = createCore();
  const sampler = createSampler(createGestureInputMapperA());

  sampler.pointerStart(point(10, 100, 600));
  step(core, sampler);
  sampler.pointerMove(point(10, 100, 530));
  step(core, sampler);
  assert.equal(started(
    step(core, sampler),
    STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_BEGIN,
  ), true);
  assert.equal(
    required(core.getSnapshot().participants[0], 'player-1 移动状态').movement.mode,
    MOVEMENT_MODE.CROUCH_CHARGING,
  );
  sampler.pointerEnd(point(10, 100, 530));
  assert.equal(started(
    step(core, sampler),
    STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_RELEASE,
  ), true);

  sampler.destroy();
  core.destroy();
});

test('Mapper B uses Rule affordance for contextual jump, crouch hold and down smash', () => {
  const core = createCore();
  const sampler = createSampler(createContextInputMapperB());

  sampler.pointerStart(point(20, 320, 600));
  sampler.pointerEnd(point(20, 320, 600));
  assert.equal(started(
    step(core, sampler),
    STAGE6_MOVEMENT_ACTION_ID.CONTEXT_GROUND_JUMP,
  ), true);

  sampler.pointerStart(point(21, 320, 600));
  step(core, sampler);
  sampler.pointerMove(point(21, 320, 680));
  assert.equal(started(
    step(core, sampler),
    STAGE6_MOVEMENT_ACTION_ID.DOWN_SMASH,
  ), true);

  sampler.destroy();
  core.destroy();

  const crouchCore = createCore();
  const crouchSampler = createSampler(createContextInputMapperB());
  crouchSampler.pointerStart(point(22, 320, 600));
  step(crouchCore, crouchSampler);
  step(crouchCore, crouchSampler);
  assert.equal(started(
    step(crouchCore, crouchSampler),
    STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_BEGIN,
  ), true);
  assert.equal(
    required(crouchCore.getSnapshot().participants[0], 'player-1 蓄力状态').movement.mode,
    MOVEMENT_MODE.CROUCH_CHARGING,
  );
  crouchSampler.pointerEnd(point(22, 320, 600));
  assert.equal(started(
    step(crouchCore, crouchSampler),
    STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_RELEASE,
  ), true);
  crouchSampler.destroy();
  crouchCore.destroy();
});

test('Mapper B long hold keeps a legal combat primary above contextual crouch', () => {
  const core = createCore({
    arena: {
      ...WIDE_ARENA,
      spawns: [{ x: -0.55, y: 1, z: 0 }, { x: 0.55, y: 1, z: 0 }],
    },
    basePush: { range: 2 },
  });
  const sampler = createSampler(createContextInputMapperB());
  sampler.pointerStart(point(30, 320, 600));
  step(core, sampler);
  step(core, sampler);
  const events = step(core, sampler);
  assert.equal(started(events, STAGE4_ACTION_ID.BASE_PUSH), true);
  assert.equal(started(
    events,
    STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_BEGIN,
  ), false);
  assert.equal(
    required(core.getSnapshot().participants[0], 'player-1 标准状态').movement.mode,
    MOVEMENT_MODE.STANDARD,
  );

  sampler.destroy();
  core.destroy();
});
