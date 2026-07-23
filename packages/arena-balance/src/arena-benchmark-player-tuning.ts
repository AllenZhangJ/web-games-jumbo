import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPositiveFinite,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_V1_BENCHMARK_PLAYER_STRATEGY_VERSION = 1;
export const ARENA_V1_BENCHMARK_PLAYER_DEFAULT_TUNING = Object.freeze({
  observationHistoryTicks: 11,
  decisionIntervalTicks: 8,
  movementMagnitude: 0.92,
  edgeRecoveryClearance: 1.25,
  attackRangeScale: 0.92,
});
const TUNING_KEYS: ReadonlySet<string> = new Set(Object.keys(ARENA_V1_BENCHMARK_PLAYER_DEFAULT_TUNING));

export interface ArenaV1BenchmarkPlayerTuning {
  readonly observationHistoryTicks: number;
  readonly decisionIntervalTicks: number;
  readonly movementMagnitude: number;
  readonly edgeRecoveryClearance: number;
  readonly attackRangeScale: number;
}

function unitInterval(value: unknown, name: string): number {
  const result = assertPositiveFinite(value, name);
  if (result > 1) throw new RangeError(`${name} 不能超过 1。`);
  return result;
}

export function createArenaV1BenchmarkPlayerTuning(
  value: unknown,
): Readonly<ArenaV1BenchmarkPlayerTuning> {
  const source = cloneFrozenData(value, 'benchmark player tuning');
  assertKnownKeys(source, TUNING_KEYS, 'benchmark player tuning');
  return Object.freeze({
    observationHistoryTicks: assertIntegerAtLeast(source.observationHistoryTicks, 1, 'benchmark player observationHistoryTicks'),
    decisionIntervalTicks: assertIntegerAtLeast(source.decisionIntervalTicks, 1, 'benchmark player decisionIntervalTicks'),
    movementMagnitude: unitInterval(source.movementMagnitude, 'benchmark player movementMagnitude'),
    edgeRecoveryClearance: assertPositiveFinite(source.edgeRecoveryClearance, 'benchmark player edgeRecoveryClearance'),
    attackRangeScale: unitInterval(source.attackRangeScale, 'benchmark player attackRangeScale'),
  });
}
