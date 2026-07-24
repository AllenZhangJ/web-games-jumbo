import { assertIntegerAtLeast, assertKnownKeys } from '@number-strategy-jump/arena-contracts';
import {
  assertArenaExperimentCaseCount,
  createSortedArenaExperimentSeeds,
} from './experiment-seed-utils.js';

export const ARENA_STAGE9_BOT_SEED_BASE = 0x6d2b79f5;
export const ARENA_STAGE9_BOT_SEED_STEP = 2_654_435_761;
const UINT32_SIZE = 0x1_0000_0000;
const COHORT_KEYS: ReadonlySet<string> = new Set(['firstIndex', 'caseCount']);

export function createArenaStage9BotSeedCohort(value: unknown): readonly number[] {
  assertKnownKeys(value, COHORT_KEYS, 'Arena Stage 9 Bot seed cohort');
  const firstIndex = assertIntegerAtLeast(value.firstIndex, 0, 'Arena Stage 9 Bot seed cohort.firstIndex');
  const caseCount = assertArenaExperimentCaseCount(value.caseCount, 'Arena Stage 9 Bot seed cohort.caseCount');
  if (firstIndex + caseCount > UINT32_SIZE) {
    throw new RangeError('Arena Stage 9 Bot seed cohort 不能跨越 uint32 序列周期。');
  }
  const base = BigInt(ARENA_STAGE9_BOT_SEED_BASE);
  const step = BigInt(ARENA_STAGE9_BOT_SEED_STEP);
  const mask = 0xffff_ffffn;
  return createSortedArenaExperimentSeeds(Array.from(
    { length: caseCount },
    (_, offset) => Number((BigInt(firstIndex + offset) * step + base) & mask),
  ), 'bot experiment seed cohort');
}
export function createArenaStage9BotSeeds(caseCountValue: unknown): readonly number[] {
  return createArenaStage9BotSeedCohort({ firstIndex: 0, caseCount: assertArenaExperimentCaseCount(caseCountValue) });
}
