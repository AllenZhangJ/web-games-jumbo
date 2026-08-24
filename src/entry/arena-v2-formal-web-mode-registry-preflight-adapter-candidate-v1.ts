import {
  assertKnownKeys,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  preflightArenaThreeModeModeRegistryCandidateV1,
  type ArenaThreeModeModeRegistryPreflightSummaryV1,
} from '@number-strategy-jump/arena-regression';

export const ARENA_V2_FORMAL_WEB_MODE_REGISTRY_PREFLIGHT_ADAPTER_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    hardGate: false as const,
    adapterWired: true as const,
    topLevelConsumerWired: true as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    defaultEntryWired: false as const,
    runtimePolicyConsumptionWired: false as const,
    timelineRuntimePolicyConsumptionWired: false as const,
    timelineRuntimeWiringEligibilityReported: true as const,
    timelineWiringEligibilityIsAuthorizationToken: false as const,
    createsResources: false as const,
    hasExternalCallbacks: false as const,
    preflightSummaryIsAuthorizationToken: false as const,
    downstreamCandidateRevalidationRequired: true as const,
    validationStatus: 'not-run' as const,
  });

export interface ArenaV2FormalWebModeRegistryPreflightAdapterInputCandidateV1 {
  readonly modeRegistryCandidate: unknown;
  readonly raceParticipantCount: unknown;
  readonly survivalEnemyCount: unknown;
}

const INPUT_KEYS = new Set([
  'modeRegistryCandidate',
  'raceParticipantCount',
  'survivalEnemyCount',
]);

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (descriptor === undefined
    || !descriptor.enumerable
    || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举自有数据字段。`);
  }
  return descriptor.value;
}

/**
 * Resource-free adapter for a future Formal Web top-level consumer. The
 * returned identity summary is diagnostic only and never authorizes creation;
 * every downstream owner must revalidate the original candidate and counts.
 */
export function adaptArenaV2FormalWebModeRegistryPreflightCandidateV1(
  value: ArenaV2FormalWebModeRegistryPreflightAdapterInputCandidateV1,
): ArenaThreeModeModeRegistryPreflightSummaryV1 {
  const name = 'Arena V2 Formal Web Mode Registry preflight adapter input';
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, INPUT_KEYS, name);
  const modeRegistryCandidate = dataField(source, 'modeRegistryCandidate', name);
  const raceParticipantCount = dataField(source, 'raceParticipantCount', name);
  const survivalEnemyCount = dataField(source, 'survivalEnemyCount', name);
  return preflightArenaThreeModeModeRegistryCandidateV1({
    modeRegistryCandidate,
    raceParticipantCount,
    survivalEnemyCount,
  });
}
