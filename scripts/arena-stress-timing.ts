export interface ArenaStressTiming {
  readonly performanceClock: 'process.cpuUsage';
  readonly elapsedMs: number;
  readonly cpuTimeMs: number;
  readonly averageCpuTickMs: number;
  readonly averageWallTickMs: number;
  readonly wallToCpuRatio: number | null;
}

function finiteAtLeast(value: unknown, minimum: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的有限数。`);
  }
  return value as number;
}

export function createArenaStressTiming({
  elapsedMs,
  cpuUsage,
  totalTicks,
}: Readonly<{
  elapsedMs: unknown;
  cpuUsage: Readonly<{ user?: unknown; system?: unknown }> | null | undefined;
  totalTicks: unknown;
}>): ArenaStressTiming {
  const wallTimeMs = finiteAtLeast(elapsedMs, 0, 'elapsedMs');
  if (
    typeof totalTicks !== 'number'
    || !Number.isSafeInteger(totalTicks)
    || totalTicks < 1
  ) {
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

export function assertArenaStressCpuBudget(
  timing: Partial<ArenaStressTiming> | null | undefined,
  averageTickBudgetMs: unknown,
): void {
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
