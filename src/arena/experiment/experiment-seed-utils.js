import { cloneFrozenData } from '../rules/definition-utils.js';

export const ARENA_EXPERIMENT_MAXIMUM_CASES = 100_000;
export const ARENA_EXPERIMENT_MAXIMUM_REPLAY_SAMPLES = 1_000;
const UINT32_MAXIMUM = 0xffffffff;

export function assertArenaExperimentUint32Seed(value, name) {
  if (!Number.isSafeInteger(value) || value < 0 || value > UINT32_MAXIMUM) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value;
}

export function assertArenaExperimentCaseCount(value, name = 'caseCount') {
  if (
    !Number.isSafeInteger(value)
    || value < 1
    || value > ARENA_EXPERIMENT_MAXIMUM_CASES
  ) {
    throw new RangeError(`${name} 必须是 1～${ARENA_EXPERIMENT_MAXIMUM_CASES} 的安全整数。`);
  }
  return value;
}

export function createContiguousArenaExperimentSeedRange(firstSeedValue, caseCountValue) {
  const firstSeed = assertArenaExperimentUint32Seed(firstSeedValue, 'firstSeed');
  const caseCount = assertArenaExperimentCaseCount(caseCountValue);
  const lastSeed = firstSeed + caseCount - 1;
  if (!Number.isSafeInteger(lastSeed) || lastSeed > UINT32_MAXIMUM) {
    throw new RangeError('firstSeed + caseCount 必须位于 uint32。');
  }
  return Object.freeze({ firstSeed, lastSeed, caseCount });
}

export function createSortedArenaExperimentSeeds(values, name = 'experiment seeds') {
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

export function createArenaExperimentReplaySeeds(plannedSeedsValue, sampleCountValue) {
  const plannedSeeds = createSortedArenaExperimentSeeds(plannedSeedsValue, 'planned seeds');
  if (
    !Number.isSafeInteger(sampleCountValue)
    || sampleCountValue < 0
    || sampleCountValue > Math.min(
      plannedSeeds.length,
      ARENA_EXPERIMENT_MAXIMUM_REPLAY_SAMPLES,
    )
  ) {
    throw new RangeError('replaySampleCount 超出 planned seeds/1000 上限。');
  }
  return Object.freeze(plannedSeeds.slice(0, sampleCountValue));
}

export function cloneArenaExperimentReplaySeeds(value, name = 'replaySeeds') {
  const source = cloneFrozenData(value, name);
  if (!Array.isArray(source)) throw new TypeError(`${name} 必须是数组。`);
  if (source.length > ARENA_EXPERIMENT_MAXIMUM_REPLAY_SAMPLES) {
    throw new RangeError(`${name} 不能超过 ${ARENA_EXPERIMENT_MAXIMUM_REPLAY_SAMPLES} 项。`);
  }
  const seeds = source.map((seed, index) => (
    assertArenaExperimentUint32Seed(seed, `${name}[${index}]`)
  ));
  for (let index = 1; index < seeds.length; index += 1) {
    if (seeds[index] <= seeds[index - 1]) {
      throw new RangeError(`${name} 必须严格递增且不重复。`);
    }
  }
  return Object.freeze(seeds);
}

export function assertArenaExperimentReplaySeedsPlanned(replaySeeds, plannedSeeds, name) {
  const planned = new Set(plannedSeeds);
  for (const seed of replaySeeds) {
    if (!planned.has(seed)) throw new RangeError(`${name} seed ${seed} 不在 Definition seed 集。`);
  }
}
