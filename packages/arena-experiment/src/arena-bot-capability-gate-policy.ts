import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_BOT_CAPABILITY_DEFAULT_GATE_POLICY = Object.freeze({
  minimumCompletedPairedCases: 1,
  maximumAverageUncreditedDeaths: 0.5,
  minimumCapabilityIndexDelta: 0,
  minimumLifePressureDelta: 0,
  scoreRateToleranceScale: 0.5,
});
const GATE_POLICY_KEYS: ReadonlySet<string> = new Set(Object.keys(ARENA_BOT_CAPABILITY_DEFAULT_GATE_POLICY));
function finiteAtLeast(value: unknown, minimum: number, name: string): number {
  if (!Number.isFinite(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的有限数。`);
  }
  return value as number;
}
export function createArenaBotCapabilityGatePolicyDefinition(value: unknown = {}) {
  const source = cloneFrozenData(value, 'ArenaBotCapabilityGatePolicy');
  assertKnownKeys(source, GATE_POLICY_KEYS, 'ArenaBotCapabilityGatePolicy');
  const merged = { ...ARENA_BOT_CAPABILITY_DEFAULT_GATE_POLICY, ...source };
  return Object.freeze({
    minimumCompletedPairedCases: assertIntegerAtLeast(merged.minimumCompletedPairedCases, 1, 'ArenaBotCapabilityGatePolicy.minimumCompletedPairedCases'),
    maximumAverageUncreditedDeaths: finiteAtLeast(merged.maximumAverageUncreditedDeaths, 0, 'ArenaBotCapabilityGatePolicy.maximumAverageUncreditedDeaths'),
    minimumCapabilityIndexDelta: finiteAtLeast(merged.minimumCapabilityIndexDelta, 0, 'ArenaBotCapabilityGatePolicy.minimumCapabilityIndexDelta'),
    minimumLifePressureDelta: finiteAtLeast(merged.minimumLifePressureDelta, 0, 'ArenaBotCapabilityGatePolicy.minimumLifePressureDelta'),
    scoreRateToleranceScale: finiteAtLeast(merged.scoreRateToleranceScale, 0, 'ArenaBotCapabilityGatePolicy.scoreRateToleranceScale'),
  });
}
