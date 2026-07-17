function finiteAtLeast(value, minimum, name) {
  if (!Number.isFinite(value) || value < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的有限数。`);
  }
  return value;
}

export function createArenaStressTiming({ elapsedMs, cpuUsage, totalTicks }) {
  const wallTimeMs = finiteAtLeast(elapsedMs, 0, 'elapsedMs');
  if (!Number.isSafeInteger(totalTicks) || totalTicks < 1) {
    throw new RangeError('totalTicks 必须是正安全整数。');
  }
  const userCpuMicros = finiteAtLeast(cpuUsage?.user, 0, 'cpuUsage.user');
  const systemCpuMicros = finiteAtLeast(cpuUsage?.system, 0, 'cpuUsage.system');
  const cpuTimeMs = (userCpuMicros + systemCpuMicros) / 1000;
  const averageCpuTickMs = cpuTimeMs / totalTicks;
  const averageWallTickMs = wallTimeMs / totalTicks;
  return Object.freeze({
    performanceClock: 'process.cpuUsage',
    elapsedMs: wallTimeMs,
    cpuTimeMs,
    averageCpuTickMs,
    averageWallTickMs,
    wallToCpuRatio: cpuTimeMs > 0 ? wallTimeMs / cpuTimeMs : null,
  });
}

export function assertArenaStressCpuBudget(timing, averageTickBudgetMs) {
  const budget = finiteAtLeast(averageTickBudgetMs, Number.EPSILON, 'averageTickBudgetMs');
  const average = finiteAtLeast(
    timing?.averageCpuTickMs,
    0,
    'timing.averageCpuTickMs',
  );
  if (average > budget) {
    throw new Error(
      `平均 CPU tick ${average.toFixed(6)}ms 超过 ${budget}ms 预算。`,
    );
  }
}
