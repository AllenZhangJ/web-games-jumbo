import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';

export const ARENA_EXPERIMENT_MAXIMUM_CASES = 100_000;
export const ARENA_EXPERIMENT_MAXIMUM_REPLAY_SAMPLES = 1_000;
const UINT32_MAXIMUM = 0xffffffff;

export interface ArenaExperimentSeedRange {
  readonly firstSeed: number;
  readonly lastSeed: number;
  readonly caseCount: number;
}

export function assertArenaExperimentUint32Seed(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > UINT32_MAXIMUM) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value as number;
}

export function assertArenaExperimentCaseCount(value: unknown, name = 'caseCount'): number {
  if (
    !Number.isSafeInteger(value)
    || (value as number) < 1
    || (value as number) > ARENA_EXPERIMENT_MAXIMUM_CASES
  ) {
    throw new RangeError(`${name} 必须是 1～${ARENA_EXPERIMENT_MAXIMUM_CASES} 的安全整数。`);
  }
  return value as number;
}

export function createContiguousArenaExperimentSeedRange(
  firstSeedValue: unknown,
  caseCountValue: unknown,
): Readonly<ArenaExperimentSeedRange> {
  const firstSeed = assertArenaExperimentUint32Seed(firstSeedValue, 'firstSeed');
  const caseCount = assertArenaExperimentCaseCount(caseCountValue);
  const lastSeed = firstSeed + caseCount - 1;
  if (!Number.isSafeInteger(lastSeed) || lastSeed > UINT32_MAXIMUM) {
    throw new RangeError('firstSeed + caseCount 必须位于 uint32。');
  }
  return Object.freeze({ firstSeed, lastSeed, caseCount });
}

export function createSortedArenaExperimentSeeds(
  values: unknown,
  name = 'experiment seeds',
): readonly number[] {
  const source = cloneFrozenData(values, name);
  if (!Array.isArray(source) || source.length === 0) {
    throw new RangeError(`${name} 必须是非空数组。`);
  }
  if (source.length > ARENA_EXPERIMENT_MAXIMUM_CASES) {
    throw new RangeError(`${name} 不能超过 ${ARENA_EXPERIMENT_MAXIMUM_CASES} 项。`);
  }
  const seeds = source.map((seed, index) => (
    assertArenaExperimentUint32Seed(seed, `${name}[${index}]`)
  )).sort((left, right) => left - right);
  for (let index = 1; index < seeds.length; index += 1) {
    if (seeds[index] === seeds[index - 1]) {
      throw new RangeError(`${name} 包含重复 seed ${seeds[index]}。`);
    }
  }
  return Object.freeze(seeds);
}

export function createArenaExperimentReplaySeeds(
  plannedSeedsValue: unknown,
  sampleCountValue: unknown,
): readonly number[] {
  const plannedSeeds = createSortedArenaExperimentSeeds(plannedSeedsValue, 'planned seeds');
  if (
    !Number.isSafeInteger(sampleCountValue)
    || (sampleCountValue as number) < 0
    || (sampleCountValue as number) > Math.min(
      plannedSeeds.length,
      ARENA_EXPERIMENT_MAXIMUM_REPLAY_SAMPLES,
    )
  ) {
    throw new RangeError('replaySampleCount 超出 planned seeds/1000 上限。');
  }
  return Object.freeze(plannedSeeds.slice(0, sampleCountValue as number));
}

export function cloneArenaExperimentReplaySeeds(
  value: unknown,
  name = 'replaySeeds',
): readonly number[] {
  const source = cloneFrozenData(value, name);
  if (!Array.isArray(source)) throw new TypeError(`${name} 必须是数组。`);
  if (source.length > ARENA_EXPERIMENT_MAXIMUM_REPLAY_SAMPLES) {
    throw new RangeError(`${name} 不能超过 ${ARENA_EXPERIMENT_MAXIMUM_REPLAY_SAMPLES} 项。`);
  }
  const seeds = source.map((seed, index) => (
    assertArenaExperimentUint32Seed(seed, `${name}[${index}]`)
  ));
  let previousSeed: number | undefined;
  for (const seed of seeds) {
    if (previousSeed !== undefined && seed <= previousSeed) {
      throw new RangeError(`${name} 必须严格递增且不重复。`);
    }
    previousSeed = seed;
  }
  return Object.freeze(seeds);
}

export function assertArenaExperimentReplaySeedsPlanned(
  replaySeeds: readonly number[],
  plannedSeeds: readonly number[],
  name: string,
): void {
  const planned = new Set(plannedSeeds);
  for (const seed of replaySeeds) {
    if (!planned.has(seed)) throw new RangeError(`${name} seed ${seed} 不在 Definition seed 集。`);
  }
}
