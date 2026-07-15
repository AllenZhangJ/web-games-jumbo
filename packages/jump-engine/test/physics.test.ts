import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  chargeToRange,
  createJumpTrajectory,
  getTargetChargeWindow,
  rangeToCharge,
  resolveTopLanding,
  sampleJumpTrajectory,
} from '../src/physics.js';

const PHYSICS = {
  minChargeMs: 100,
  maxChargeMs: 1100,
  minRange: 1,
  maxRange: 9,
  rangeExponent: 1,
  durationMinMs: 600,
  durationMaxMs: 800,
  heightMin: 1.2,
  heightMax: 2.2,
};

const TARGET = {
  center: { x: 0, z: 5 },
  halfWidth: 1,
  halfDepth: 1,
  topY: 0,
};

test('charge maps monotonically to range and its inverse is stable', () => {
  const charges = [100, 300, 600, 900, 1100];
  const ranges = charges.map((charge) => chargeToRange(charge, PHYSICS));
  assert.deepEqual(ranges, [1, 2.6, 5, 7.4, 9]);

  for (const charge of charges) {
    assert.ok(Math.abs(rangeToCharge(chargeToRange(charge, PHYSICS), PHYSICS) - charge) < 1e-9);
  }
});

test('target charge window comes from the rectangular top footprint', () => {
  const window = getTargetChargeWindow({
    origin: { x: 0, y: 0, z: 0 },
    target: TARGET,
    config: PHYSICS,
  });

  assert.equal(window.entryRange, 4);
  assert.equal(window.idealRange, 5);
  assert.equal(window.exitRange, 6);
  assert.equal(window.minChargeMs, 475);
  assert.equal(window.idealChargeMs, 600);
  assert.equal(window.maxChargeMs, 725);
});

test('trajectory samples real x/z motion and a parabolic height', () => {
  const trajectory = createJumpTrajectory({
    origin: { x: 0, y: 0, z: 0 },
    targetCenter: TARGET.center,
    targetTopY: TARGET.topY,
    chargeMs: 600,
    config: PHYSICS,
  });

  const start = sampleJumpTrajectory(trajectory, 0);
  const apex = sampleJumpTrajectory(trajectory, trajectory.durationMs / 2);
  const end = sampleJumpTrajectory(trajectory, trajectory.durationMs);

  assert.deepEqual(start.position, { x: 0, y: 0, z: 0 });
  assert.equal(apex.position.z, 2.5);
  assert.ok(Math.abs(apex.position.y - 1.7) < 1e-9);
  assert.deepEqual(end.position, { x: 0, y: 0, z: 5 });
  assert.equal(end.completed, true);
  assert.equal(end.descending, true);
});

test('successful landing keeps the exact off-center impact position', () => {
  const trajectory = createJumpTrajectory({
    origin: { x: 0, y: 0, z: 0 },
    targetCenter: TARGET.center,
    targetTopY: TARGET.topY,
    chargeMs: 537.5,
    config: PHYSICS,
  });
  const landing = resolveTopLanding({ trajectory, target: TARGET });

  assert.equal(landing.landed, true);
  assert.equal(landing.position.z, 4.5);
  assert.equal(landing.offset.z, -0.5);
  assert.notDeepEqual(landing.position, { x: 0, y: 0, z: 5 });
});

test('short and overshooting jumps miss the platform', () => {
  const shortJump = createJumpTrajectory({
    origin: { x: 0, y: 0, z: 0 },
    targetCenter: TARGET.center,
    targetTopY: TARGET.topY,
    chargeMs: 350,
    config: PHYSICS,
  });
  const longJump = createJumpTrajectory({
    origin: { x: 0, y: 0, z: 0 },
    targetCenter: TARGET.center,
    targetTopY: TARGET.topY,
    chargeMs: 850,
    config: PHYSICS,
  });

  assert.equal(resolveTopLanding({ trajectory: shortJump, target: TARGET }).reason, 'short');
  assert.equal(resolveTopLanding({ trajectory: longJump, target: TARGET }).reason, 'overshoot');
});

test('safe inset narrows the valid charge window', () => {
  const full = getTargetChargeWindow({
    origin: { x: 0, y: 0, z: 0 },
    target: TARGET,
    config: PHYSICS,
  });
  const safe = getTargetChargeWindow({
    origin: { x: 0, y: 0, z: 0 },
    target: TARGET,
    inset: 0.25,
    config: PHYSICS,
  });

  assert.ok(safe.minChargeMs > full.minChargeMs);
  assert.ok(safe.maxChargeMs < full.maxChargeMs);
});

test('non-finite physics inputs and invalid timing configs fail fast', () => {
  assert.throws(() => chargeToRange(Number.NaN, PHYSICS), /chargeMs 必须是有限数/);
  assert.throws(() => rangeToCharge(Number.POSITIVE_INFINITY, PHYSICS), /distance 必须是有限数/);
  assert.throws(() => createJumpTrajectory({
    origin: { x: 0, y: 0, z: 0 },
    targetCenter: TARGET.center,
    targetTopY: 0,
    chargeMs: 600,
    config: { ...PHYSICS, durationMinMs: 0 },
  }), /跳跃时长/);
  const trajectory = createJumpTrajectory({
    origin: { x: 0, y: 0, z: 0 },
    targetCenter: TARGET.center,
    targetTopY: 0,
    chargeMs: 600,
    config: PHYSICS,
  });
  assert.throws(() => sampleJumpTrajectory(trajectory, Number.NaN), /elapsedMs 必须是有限数/);
});
