import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPositiveFinite,
  cloneFrozenData,
  type ArenaInputFrame,
  type ArenaMatchSnapshot,
} from '@number-strategy-jump/arena-contracts';
import { createArenaV1PursuitInputStrategy } from './arena-v1-pursuit-input-strategy.js';

export const ARENA_V1_SCRIPTED_PRESSURE_DEFAULT_PARAMETERS = Object.freeze({
  cadenceTicks: Object.freeze([31, 43]),
  cadenceJitterTicks: Object.freeze([3, 5]),
  attackOffsetTicks: Object.freeze([0, 13]),
  strafePeriodTicks: 90,
  strafeMagnitude: 0.16,
  attackRangeScale: 0.98,
});
const PARAMETER_KEYS: ReadonlySet<string> = new Set([
  'cadenceTicks', 'cadenceJitterTicks', 'attackOffsetTicks', 'strafePeriodTicks', 'strafeMagnitude', 'attackRangeScale',
]);
const UINT32_MAXIMUM = 0xffffffff;
export interface ArenaV1ScriptedPressureParameters {
  readonly cadenceTicks: readonly [number, number];
  readonly cadenceJitterTicks: readonly [number, number];
  readonly attackOffsetTicks: readonly [number, number];
  readonly strafePeriodTicks: number;
  readonly strafeMagnitude: number;
  readonly attackRangeScale: number;
}
function cloneIntegerPair(value: unknown, minimum: number, name: string): readonly [number, number] {
  if (!Array.isArray(value) || value.length !== 2) throw new RangeError(`${name} 必须恰好包含两个整数。`);
  return Object.freeze([
    assertIntegerAtLeast(value[0], minimum, `${name}[0]`),
    assertIntegerAtLeast(value[1], minimum, `${name}[1]`),
  ]);
}
export function createArenaV1ScriptedPressureParameters(
  value: unknown,
): Readonly<ArenaV1ScriptedPressureParameters> {
  const source = cloneFrozenData(value, 'scripted pressure parameters');
  assertKnownKeys(source, PARAMETER_KEYS, 'scripted pressure parameters');
  const strafeMagnitude = assertPositiveFinite(source.strafeMagnitude, 'scripted pressure parameters.strafeMagnitude');
  if (strafeMagnitude > 1) throw new RangeError('scripted pressure parameters.strafeMagnitude 不能超过 1。');
  const attackRangeScale = assertPositiveFinite(source.attackRangeScale, 'scripted pressure parameters.attackRangeScale');
  if (attackRangeScale > 1) throw new RangeError('scripted pressure parameters.attackRangeScale 不能超过 1。');
  return Object.freeze({
    cadenceTicks: cloneIntegerPair(source.cadenceTicks, 1, 'cadenceTicks'),
    cadenceJitterTicks: cloneIntegerPair(source.cadenceJitterTicks, 1, 'cadenceJitterTicks'),
    attackOffsetTicks: cloneIntegerPair(source.attackOffsetTicks, 0, 'attackOffsetTicks'),
    strafePeriodTicks: assertIntegerAtLeast(source.strafePeriodTicks, 1, 'strafePeriodTicks'),
    strafeMagnitude,
    attackRangeScale,
  });
}
export function createArenaV1ScriptedPressureInputStrategy(options: unknown): Readonly<{
  parameters: Readonly<ArenaV1ScriptedPressureParameters>;
  createFrames: (snapshot: ArenaMatchSnapshot) => readonly ArenaInputFrame[];
}> {
  assertKnownKeys(options, new Set(['matchSeed', 'participantIds', 'basePushRange', 'parameters']), 'scripted pressure strategy options');
  if (!Number.isSafeInteger(options.matchSeed) || (options.matchSeed as number) < 0 || (options.matchSeed as number) > UINT32_MAXIMUM) {
    throw new RangeError('scripted pressure strategy matchSeed 必须是 uint32。');
  }
  const matchSeed = options.matchSeed as number;
  const range = assertPositiveFinite(options.basePushRange, 'scripted pressure strategy basePushRange');
  const normalized = createArenaV1ScriptedPressureParameters(options.parameters);
  const timings = Object.freeze(([0, 1] as const).map((participantIndex) => Object.freeze({
    cadenceTicks: normalized.cadenceTicks[participantIndex] + matchSeed % normalized.cadenceJitterTicks[participantIndex],
    attackOffsetTicks: normalized.attackOffsetTicks[participantIndex] + (matchSeed % 97) * 7,
  })));
  const strategy = createArenaV1PursuitInputStrategy({
    participantIds: options.participantIds,
    attackRange: range * normalized.attackRangeScale,
    strafePeriodTicks: normalized.strafePeriodTicks,
    strafeMagnitude: normalized.strafeMagnitude,
    participantTimings: timings,
  });
  return Object.freeze({ parameters: normalized, createFrames: strategy.createFrames });
}
