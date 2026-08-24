import {
  assertKnownKeys,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ActionRegistry,
  EquipmentRegistry,
} from '@number-strategy-jump/arena-definitions';
import {
  createArenaV2PublishedRegistrySnapshotCandidateV1,
  createArenaV2RegistryPublicationSnapshotHashCandidateV1,
} from './arena-v2-in-memory-registry-publication-port-candidate-v1.js';
import type {
  ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1,
} from './arena-v2-persistent-registry-publication-port-candidate-v1.js';

export const ARENA_V2_EMPTY_REGISTRY_BASELINE_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

const POLICY = Object.freeze({
  schemaVersion: ARENA_V2_EMPTY_REGISTRY_BASELINE_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.empty-registry-baseline.candidate.v1' as const,
  status: 'production-unreachable' as const,
  revision: 0 as const,
  collectionWeaponCount: 0 as const,
  purpose: 'first-weapon-registration-base-only' as const,
  playable: false as const,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
});

export const ARENA_V2_EMPTY_REGISTRY_BASELINE_POLICY_CANDIDATE_V1 = Object.freeze({
  ...POLICY,
  contentHash: createDeterministicDataHash(
    POLICY,
    'Arena V2 empty Registry baseline policy candidate V1',
  ),
});

export type ArenaV2EmptyRegistryBaselinePortInputCandidateV1 = Omit<
  ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1,
  'initialRevision' | 'initialSnapshot'
>;

const PORT_INPUT_KEYS = new Set([
  'storage', 'repositoryOwnerId', 'leaseHolderId', 'wallNow', 'keyPrefix',
  'leaseDurationMs', 'leaseTakeoverSameOwner',
]);
const REQUIRED_PORT_INPUT_KEYS = Object.freeze([
  'storage', 'repositoryOwnerId', 'leaseHolderId', 'wallNow',
] as const);

function portInput(
  value: unknown,
): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2空Registry端口输入必须是普通对象。');
  }
  assertKnownKeys(value, PORT_INPUT_KEYS, 'Arena V2空Registry端口输入');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of REQUIRED_PORT_INPUT_KEYS) {
    const descriptor = descriptors[key];
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Arena V2空Registry端口输入.${key}缺失。`);
    }
  }
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Arena V2空Registry端口输入.${key}必须是可枚举数据字段。`);
    }
  }
  return Object.freeze(Object.fromEntries(Object.entries(descriptors).map(
    ([key, descriptor]) => [key, descriptor.value],
  )));
}

export function createArenaV2EmptyRegistryBaselineCandidateV1() {
  const actionRegistry = new ActionRegistry([]);
  const equipmentRegistry = new EquipmentRegistry({
    definitions: [],
    actionRegistry,
  });
  const snapshot = createArenaV2PublishedRegistrySnapshotCandidateV1({
    collectionWeaponIds: Object.freeze([]),
    actionRegistry,
    equipmentRegistry,
    grammarDefinitions: Object.freeze([]),
  }, 'Arena V2 empty Registry baseline');
  return Object.freeze({
    schemaVersion: ARENA_V2_EMPTY_REGISTRY_BASELINE_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    revision: 0 as const,
    snapshotHash: createArenaV2RegistryPublicationSnapshotHashCandidateV1(snapshot),
    snapshot,
    playable: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    defaultEntryWired: false as const,
  });
}

export function createArenaV2EmptyRegistryBaselinePortOptionsCandidateV1(
  value: ArenaV2EmptyRegistryBaselinePortInputCandidateV1,
): Readonly<ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1> {
  const source = portInput(value);
  const baseline = createArenaV2EmptyRegistryBaselineCandidateV1();
  return Object.freeze({
    storage: source.storage,
    repositoryOwnerId: source.repositoryOwnerId,
    leaseHolderId: source.leaseHolderId,
    wallNow: source.wallNow,
    initialRevision: baseline.revision,
    initialSnapshot: baseline.snapshot,
    ...(source.keyPrefix === undefined ? {} : { keyPrefix: source.keyPrefix }),
    ...(source.leaseDurationMs === undefined
      ? {}
      : { leaseDurationMs: source.leaseDurationMs }),
    ...(source.leaseTakeoverSameOwner === undefined
      ? {}
      : { leaseTakeoverSameOwner: source.leaseTakeoverSameOwner }),
  }) as Readonly<ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1>;
}

export type ArenaV2EmptyRegistryBaselineCandidateV1 = ReturnType<
  typeof createArenaV2EmptyRegistryBaselineCandidateV1
>;
