import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertArenaStressCpuBudget,
  createArenaStressTiming,
} from '../../scripts/arena-stress-timing.js';
import { assertArenaGitSourceIdentityStable } from '../../scripts/arena-git-source-identity.js';

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

test('Arena source identity gate rejects commit or dirty-state drift', () => {
  const clean = { sourceCommit: 'a'.repeat(40), sourceDirty: false };
  assert.doesNotThrow(() => assertArenaGitSourceIdentityStable(clean, { ...clean }));
  assert.throws(() => assertArenaGitSourceIdentityStable(clean, {
    ...clean,
    sourceDirty: true,
  }), /Git commit 或工作区 dirty 状态发生变化/);
  assert.throws(() => assertArenaGitSourceIdentityStable(clean, {
    sourceCommit: 'b'.repeat(40),
    sourceDirty: false,
  }), /Git commit 或工作区 dirty 状态发生变化/);
});
