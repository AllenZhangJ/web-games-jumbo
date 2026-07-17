import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertArenaStressCpuBudget,
  createArenaStressTiming,
} from '../../scripts/arena-stress-timing.mjs';

test('Arena stress timing separates process cost from suspension-inflated wall time', () => {
  const timing = createArenaStressTiming({
    elapsedMs: 50_000,
    cpuUsage: { user: 800_000, system: 200_000 },
    totalTicks: 10_000,
  });
  assert.deepEqual(timing, {
    performanceClock: 'process.cpuUsage',
    elapsedMs: 50_000,
    cpuTimeMs: 1000,
    averageCpuTickMs: 0.1,
    averageWallTickMs: 5,
    wallToCpuRatio: 50,
  });
  assert.doesNotThrow(() => assertArenaStressCpuBudget(timing, 0.25));
});

test('Arena stress timing still rejects a real process CPU regression', () => {
  const timing = createArenaStressTiming({
    elapsedMs: 3000,
    cpuUsage: { user: 2_600_000, system: 400_000 },
    totalTicks: 10_000,
  });
  assert.equal(timing.averageCpuTickMs, 0.3);
  assert.throws(
    () => assertArenaStressCpuBudget(timing, 0.25),
    /平均 CPU tick 0\.300000ms 超过 0\.25ms/,
  );
});
