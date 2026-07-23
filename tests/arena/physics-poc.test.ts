import test from 'node:test';
import assert from 'node:assert/strict';
import { createLightweightPhysicsWorld } from '@number-strategy-jump/arena-physics';
import {
  runPhysicsPoc,
  type PhysicsPocOptions,
} from '../../src/arena/physics/poc-scenarios.js';

const candidates: ReadonlyArray<readonly [string, PhysicsPocOptions['createWorld']]> = [
  ['lightweight-strict-ts', createLightweightPhysicsWorld],
];

function required<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) throw new Error(`物理 PoC 缺少 ${name}。`);
  return value;
}

for (const [backend, createWorld] of candidates) {
  test(`${backend} passes the common arena physics POC`, async () => {
    const report = await runPhysicsPoc({ backend, createWorld, stressTicks: 2_000 });
    assert.equal(report.nonFiniteStates, 0);
    assert.ok(required(report.idleGroundError, 'idleGroundError') < 0.06, JSON.stringify(report));
    assert.ok(required(report.accelerationDistance, 'accelerationDistance') > 2, JSON.stringify(report));
    assert.ok(required(report.stoppingDistance, 'stoppingDistance') > -0.05, JSON.stringify(report));
    assert.ok(report.stepPeakGroundY > 1.2, JSON.stringify(report));
    assert.ok(report.stepGroundedTicks > 20, JSON.stringify(report));
    assert.ok(required(report.impulsePeakY, 'impulsePeakY') > 1.2, JSON.stringify(report));
    assert.ok(Number.isInteger(report.impulseLandingTick), JSON.stringify(report));
    assert.ok(report.pairMinimumDistance > 0.72, JSON.stringify(report));
    assert.ok(Number.isInteger(report.edgeFallTick), JSON.stringify(report));
    assert.ok(required(report.resetVelocityError, 'resetVelocityError') < 0.08, JSON.stringify(report));
    assert.match(required(report.finalStateHash, 'finalStateHash'), /^[0-9a-f]{8}$/);
    assert.ok(report.averageStepMs < 1, JSON.stringify(report));
  });
}

test('lightweight physics produces the same final hash for the same workload', async () => {
  const first = await runPhysicsPoc({
    backend: 'lightweight-strict-ts',
    createWorld: createLightweightPhysicsWorld,
    stressTicks: 3_000,
  });
  const second = await runPhysicsPoc({
    backend: 'lightweight-strict-ts',
    createWorld: createLightweightPhysicsWorld,
    stressTicks: 3_000,
  });
  assert.equal(first.finalStateHash, second.finalStateHash);
});
