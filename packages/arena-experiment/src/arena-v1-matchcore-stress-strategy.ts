import { assertIntegerAtLeast, assertKnownKeys, assertPositiveFinite, cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { createArenaV1PursuitInputStrategy } from './arena-v1-pursuit-input-strategy.js';

export const ARENA_V1_MATCHCORE_STRESS_INPUT_DEFAULT_TUNING = Object.freeze({
  cadenceTicks: Object.freeze([31, 43]), cadenceJitterTicks: Object.freeze([3, 5]),
  attackOffsetTicks: Object.freeze([0, 13]), attackOffsetStepTicks: 7,
  strafePeriodTicks: 90, strafeMagnitude: 0.16, attackRange: 1.48,
});
const PARAMETER_KEYS: ReadonlySet<string> = new Set([
  'sequenceFirstSeed', 'cadenceTicks', 'cadenceJitterTicks', 'attackOffsetTicks',
  'attackOffsetStepTicks', 'strafePeriodTicks', 'strafeMagnitude', 'attackRange',
]);
const UINT32_MAXIMUM = 0xffffffff;
export interface ArenaV1MatchCoreStressInputParameters {
  readonly sequenceFirstSeed: number;
  readonly cadenceTicks: readonly [number, number];
  readonly cadenceJitterTicks: readonly [number, number];
  readonly attackOffsetTicks: readonly [number, number];
  readonly attackOffsetStepTicks: number;
  readonly strafePeriodTicks: number;
  readonly strafeMagnitude: number;
  readonly attackRange: number;
}
function cloneIntegerPair(value: unknown, minimum: number, name: string): readonly [number, number] {
  if (!Array.isArray(value) || value.length !== 2) throw new RangeError(`${name} 必须恰好包含两个整数。`);
  return Object.freeze([
    assertIntegerAtLeast(value[0], minimum, `${name}[0]`),
    assertIntegerAtLeast(value[1], minimum, `${name}[1]`),
  ]);
}
export function createArenaV1MatchCoreStressInputParameters(value: unknown): Readonly<ArenaV1MatchCoreStressInputParameters> {
  const source = cloneFrozenData(value, 'MatchCore stress input parameters');
  assertKnownKeys(source, PARAMETER_KEYS, 'MatchCore stress input parameters');
  if (!Number.isSafeInteger(source.sequenceFirstSeed)
    || (source.sequenceFirstSeed as number) < 0
    || (source.sequenceFirstSeed as number) > UINT32_MAXIMUM) {
    throw new RangeError('MatchCore stress input sequenceFirstSeed 必须是 uint32。');
  }
  const strafeMagnitude = assertPositiveFinite(source.strafeMagnitude, 'MatchCore stress input strafeMagnitude');
  if (strafeMagnitude > 1) throw new RangeError('MatchCore stress input strafeMagnitude 不能超过 1。');
  return Object.freeze({
    sequenceFirstSeed: source.sequenceFirstSeed as number,
    cadenceTicks: cloneIntegerPair(source.cadenceTicks, 1, 'cadenceTicks'),
    cadenceJitterTicks: cloneIntegerPair(source.cadenceJitterTicks, 1, 'cadenceJitterTicks'),
    attackOffsetTicks: cloneIntegerPair(source.attackOffsetTicks, 0, 'attackOffsetTicks'),
    attackOffsetStepTicks: assertIntegerAtLeast(source.attackOffsetStepTicks, 0, 'attackOffsetStepTicks'),
    strafePeriodTicks: assertIntegerAtLeast(source.strafePeriodTicks, 1, 'strafePeriodTicks'),
    strafeMagnitude,
    attackRange: assertPositiveFinite(source.attackRange, 'MatchCore stress input attackRange'),
  });
}
export function createArenaV1MatchCoreStressInputStrategy(options: {
  readonly matchSeed: number;
  readonly participantIds: readonly string[];
  readonly parameters: unknown;
}) {
  const normalized = createArenaV1MatchCoreStressInputParameters(options.parameters);
  if (!Number.isSafeInteger(options.matchSeed) || options.matchSeed < normalized.sequenceFirstSeed
    || options.matchSeed > UINT32_MAXIMUM) {
    throw new RangeError('MatchCore stress input matchSeed 必须是大于等于 sequenceFirstSeed 的 uint32。');
  }
  const sequenceIndex = options.matchSeed - normalized.sequenceFirstSeed;
  const timings = Object.freeze([0, 1].map((participantIndex) => Object.freeze({
    cadenceTicks: (normalized.cadenceTicks[participantIndex] ?? 0)
      + sequenceIndex % (normalized.cadenceJitterTicks[participantIndex] ?? 1),
    attackOffsetTicks: (normalized.attackOffsetTicks[participantIndex] ?? 0)
      + sequenceIndex * normalized.attackOffsetStepTicks,
  })));
  const strategy = createArenaV1PursuitInputStrategy({
    participantIds: options.participantIds, attackRange: normalized.attackRange,
    strafePeriodTicks: normalized.strafePeriodTicks, strafeMagnitude: normalized.strafeMagnitude,
    participantTimings: timings,
  });
  return Object.freeze({ parameters: normalized, createFrames: strategy.createFrames });
}
