import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BRANCH_SIDE,
  PLATFORM_ROLE,
  WorldState,
  candidateDistanceRange,
  isPointOnPlatform,
} from '../src/core/world-state.js';

function sequenceRng(values = [0.1, 0.7, 0.35, 0.9]) {
  let cursor = 0;
  return {
    next() {
      const value = values[cursor % values.length];
      cursor += 1;
      return value;
    },
  };
}

function descriptor(label, preview) {
  return {
    operation: { id: label, label },
    preview,
  };
}

function localPoint(platform, widthRatio, depthRatio) {
  const forward = platform.heading;
  const right = { x: forward.z, z: -forward.x };
  return {
    x: platform.center.x
      + right.x * platform.halfWidth * widthRatio
      + forward.x * platform.halfDepth * depthRatio,
    y: platform.topY,
    z: platform.center.z
      + right.z * platform.halfWidth * widthRatio
      + forward.z * platform.halfDepth * depthRatio,
  };
}

test('初始世界包含当前平台和左右两个绑定了运算的候选', () => {
  const left = descriptor('+3', 13);
  const right = descriptor('×2', 20);
  const world = new WorldState({
    rng: sequenceRng(),
    initialCurrent: { preview: 10 },
    initialCandidates: [left, right],
  });

  assert.equal(world.current.role, PLATFORM_ROLE.CURRENT);
  assert.equal(world.current.preview, 10);
  assert.equal(world.current.id, 'platform-1');
  assert.equal(world.candidates.length, 2);
  assert.deepEqual(world.candidates.map((platform) => platform.side), [
    BRANCH_SIDE.LEFT,
    BRANCH_SIDE.RIGHT,
  ]);
  assert.deepEqual(world.candidates[0].operation, left.operation);
  assert.notStrictEqual(world.candidates[0].operation, left.operation);
  assert.equal(world.candidates[0].preview, 13);
  assert.deepEqual(world.candidates[1].operation, right.operation);
  assert.notStrictEqual(world.candidates[1].operation, right.operation);
  assert.equal(world.platforms.length, 3);
  assert.equal(world.player.supportPlatformId, world.current.id);
  assert.deepEqual(world.player.position, { x: 0, y: 0, z: 0 });
});

test('左右分支视觉方向明确，从当前平台任意角落点到候选中心仍在常用射程', () => {
  const world = new WorldState({
    rng: sequenceRng([0, 0, 0.999, 0.999]),
    initialCandidates: [descriptor('+1', 2), descriptor('+2', 3)],
  });
  const forward = world.heading;
  const right = { x: forward.z, z: -forward.x };

  for (const candidate of world.candidates) {
    const dx = candidate.center.x - world.current.center.x;
    const dz = candidate.center.z - world.current.center.z;
    const forwardProjection = dx * forward.x + dz * forward.z;
    const sideProjection = dx * right.x + dz * right.z;
    assert.ok(forwardProjection >= world.layout.forwardMin);
    assert.equal(Math.sign(sideProjection), candidate.side === BRANCH_SIDE.LEFT ? -1 : 1);

    const conservative = candidateDistanceRange(world.current, candidate);
    assert.ok(conservative.min >= world.layout.commonRangeMin);
    assert.ok(conservative.max <= world.layout.commonRangeMax);

    for (const widthRatio of [-1, 1]) {
      for (const depthRatio of [-1, 1]) {
        const corner = localPoint(world.current, widthRatio, depthRatio);
        const distance = Math.hypot(candidate.center.x - corner.x, candidate.center.z - corner.z);
        assert.ok(distance >= world.layout.commonRangeMin);
        assert.ok(distance <= world.layout.commonRangeMax);
      }
    }
  }
});

test('成功落地保留候选平台 ID 和精确落点，并淘汰未选分支', () => {
  const world = new WorldState({
    rng: sequenceRng(),
    initialCurrent: { preview: 10 },
    initialCandidates: [descriptor('+4', 14), descriptor('×2', 20)],
  });
  const previousId = world.current.id;
  const selected = world.candidates[1];
  const rejected = world.candidates[0];
  const landing = localPoint(selected, -0.78, 0.42);
  const oldHeading = { ...world.heading };
  const result = world.commitLanding({
    platformId: selected.id,
    position: landing,
    nextCandidates: [descriptor('−3', 17), descriptor('+6', 26)],
  });

  assert.equal(world.current.id, selected.id);
  assert.equal(world.current.role, PLATFORM_ROLE.CURRENT);
  assert.equal(world.history.at(-1).id, previousId);
  assert.equal(world.history.at(-1).role, PLATFORM_ROLE.HISTORY);
  assert.ok(!world.platforms.some((platform) => platform.id === rejected.id));
  assert.equal(result.rejected.id, rejected.id);
  assert.deepEqual(world.player.position, landing);
  assert.equal(world.player.supportPlatformId, selected.id);
  assert.ok(isPointOnPlatform(world.current, world.player.position));

  const expectedHeadingMagnitude = Math.hypot(
    selected.center.x,
    selected.center.z,
  );
  assert.ok(Math.abs(world.heading.x - selected.center.x / expectedHeadingMagnitude) < 1e-12);
  assert.ok(Math.abs(world.heading.z - selected.center.z / expectedHeadingMagnitude) < 1e-12);
  assert.notDeepEqual(world.heading, oldHeading);

  for (const candidate of world.candidates) {
    const dx = candidate.center.x - selected.center.x;
    const dz = candidate.center.z - selected.center.z;
    const forwardProjection = dx * world.heading.x + dz * world.heading.z;
    assert.ok(forwardProjection >= world.layout.forwardMin);
  }
  assert.equal(world.candidates[0].operation.label, '−3');
  assert.equal(world.candidates[1].preview, 26);
});

test('历史平台有界且平台 ID 在晋升前后不变、不重用', () => {
  const world = new WorldState({
    rng: sequenceRng(),
    historyLimit: 2,
    initialCandidates: [descriptor('+1', 1), descriptor('+2', 2)],
  });
  const seenIds = new Set(world.platforms.map((platform) => platform.id));

  for (let step = 0; step < 5; step += 1) {
    const selected = world.candidates[step % 2];
    const selectedId = selected.id;
    const result = world.commitLanding({
      platformId: selectedId,
      position: localPoint(selected, 0.1 * (step % 2 ? -1 : 1), 0.15),
      nextCandidates: [
        descriptor(`left-${step}`, step + 10),
        descriptor(`right-${step}`, step + 20),
      ],
    });

    assert.equal(result.current.id, selectedId);
    assert.equal(world.current.id, selectedId);
    assert.ok(world.history.length <= 2);
    for (const candidate of world.candidates) {
      assert.ok(!seenIds.has(candidate.id));
      seenIds.add(candidate.id);
    }
  }

  assert.equal(world.history.length, 2);
  assert.equal(world.platforms.length, 5);
  assert.equal(world.step, 5);
});

test('不允许把候选平台以外的坐标当成成功落点', () => {
  const world = new WorldState({
    rng: sequenceRng(),
    initialCandidates: [descriptor('+1', 1), descriptor('+2', 2)],
  });
  const selected = world.candidates[0];

  assert.throws(() => world.commitLanding({
    platformId: selected.id,
    position: { x: selected.center.x + 20, y: 0, z: selected.center.z },
    nextCandidates: [descriptor('+3', 3), descriptor('+4', 4)],
  }), /落点不在/);
  assert.equal(world.current.id, 'platform-1');
  assert.equal(world.history.length, 0);
});

test('错误高度和候选生成异常都不会留下半提交世界', () => {
  let randomCalls = 0;
  const rng = {
    next() {
      randomCalls += 1;
      return randomCalls <= 4 ? 0.5 : Number.NaN;
    },
  };
  const world = new WorldState({
    rng,
    initialCandidates: [descriptor('+1', 1), descriptor('+2', 2)],
  });
  const selected = world.candidates[0];
  const before = world.snapshot();

  assert.throws(() => world.commitLanding({
    platformId: selected.id,
    position: { ...selected.center, y: selected.topY + 1 },
    nextCandidates: [descriptor('+3', 3), descriptor('+4', 4)],
  }), /落点高度/);
  assert.throws(() => world.commitLanding({
    platformId: selected.id,
    position: { ...selected.center, y: selected.topY },
    nextCandidates: [descriptor('+3', 3), descriptor('+4', 4)],
  }), /rng 必须返回/);

  assert.equal(world.step, before.step);
  assert.equal(world.current.id, before.current.id);
  assert.equal(world.current.role, PLATFORM_ROLE.CURRENT);
  assert.deepEqual(world.history, []);
  assert.deepEqual(world.platforms.map((platform) => platform.id), before.platforms.map((platform) => platform.id));
});

test('snapshot mutations cannot write back into world truth', () => {
  const world = new WorldState({
    rng: sequenceRng(),
    initialCurrent: { preview: 10 },
    initialCandidates: [descriptor('+1', 11), descriptor('+2', 12)],
  });
  const snapshot = world.snapshot();
  snapshot.current.center.x = 999;
  snapshot.candidates[0].operation.label = 'mutated';
  snapshot.player.position.z = 999;

  assert.equal(world.current.center.x, 0);
  assert.equal(world.candidates[0].operation.label, '+1');
  assert.equal(world.player.position.z, 0);
});

test('invalid platform dimensions are rejected at construction', () => {
  assert.throws(() => new WorldState({ platform: { halfWidth: Number.NaN } }), /halfWidth/);
  assert.throws(() => new WorldState({ platform: { halfDepth: -1 } }), /必须为正数/);
});
