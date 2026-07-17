import test from 'node:test';
import assert from 'node:assert/strict';
import { createLightweightPhysicsWorld } from '../../src/arena/physics/lightweight-physics.js';
import { runPhysicsPoc } from '../../src/arena/physics/poc-scenarios.js';

const candidates = [
  ['lightweight-js', createLightweightPhysicsWorld],
];

for (const [backend, createWorld] of candidates) {
  test(`${backend} passes the common arena physics POC`, async () => {
    const report = await runPhysicsPoc({ backend, createWorld, stressTicks: 2_000 });
    assert.equal(report.nonFiniteStates, 0);
    assert.ok(report.idleGroundError < 0.06, JSON.stringify(report));
    assert.ok(report.accelerationDistance > 2, JSON.stringify(report));
    assert.ok(report.stoppingDistance > -0.05, JSON.stringify(report));
    assert.ok(report.stepPeakGroundY > 1.2, JSON.stringify(report));
    assert.ok(report.stepGroundedTicks > 20, JSON.stringify(report));
    assert.ok(report.impulsePeakY > 1.2, JSON.stringify(report));
    assert.ok(Number.isInteger(report.impulseLandingTick), JSON.stringify(report));
    assert.ok(report.pairMinimumDistance > 0.72, JSON.stringify(report));
    assert.ok(Number.isInteger(report.edgeFallTick), JSON.stringify(report));
    assert.ok(report.resetVelocityError < 0.08, JSON.stringify(report));
    assert.match(report.finalStateHash, /^[0-9a-f]{8}$/);
    assert.ok(report.averageStepMs < 1, JSON.stringify(report));
  });
}

test('lightweight physics produces the same final hash for the same workload', async () => {
  const first = await runPhysicsPoc({
    backend: 'lightweight-js',
    createWorld: createLightweightPhysicsWorld,
    stressTicks: 3_000,
  });
  const second = await runPhysicsPoc({
    backend: 'lightweight-js',
    createWorld: createLightweightPhysicsWorld,
    stressTicks: 3_000,
  });
  assert.equal(first.finalStateHash, second.finalStateHash);
});
