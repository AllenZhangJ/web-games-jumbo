import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV2PublishedRegistrySnapshotCandidateV1,
  createArenaV2RegistryPublicationSnapshotHashCandidateV1,
} from './arena-v2-in-memory-registry-publication-port-candidate-v1.js';
import type {
  ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1,
} from './arena-v2-persistent-registry-publication-port-candidate-v1.js';
import type {
  ArenaV2SingleWeaponPersistentRegistrationHostOptionsCandidateV1,
} from './arena-v2-single-weapon-persistent-registration-host-candidate-v1.js';
import {
  validateArenaV2SingleWeaponRegistrationPlanCandidateV1,
} from './arena-v2-single-weapon-registration-plan-candidate-v1.js';
import {
  assertArenaV2NextRegistryWeaponCandidateV1,
} from './arena-v2-registry-weapon-sequence-candidate-v1.js';

export const ARENA_V2_SINGLE_WEAPON_RUNTIME_REGISTRATION_ASSEMBLY_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

export interface ArenaV2SingleWeaponRuntimeRegistrationAssemblyOptionsCandidateV1 {
  readonly hostId: string;
  readonly publicationOwnerId: string;
  readonly assessment: unknown;
  readonly plan: unknown;
  readonly registryReference: unknown;
  readonly portOptions: ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1;
}

export interface ArenaV2SingleWeaponRuntimeRegistrationAssemblyCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly weaponId: string;
  readonly sourceRevision: number;
  readonly sourceSnapshotHash: string;
  readonly sourceCollectionWeaponIds: readonly string[];
  readonly registrationHostOptions:
    Readonly<ArenaV2SingleWeaponPersistentRegistrationHostOptionsCandidateV1>;
  readonly defaultInstanceCreated: false;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
}

const OPTION_KEYS = new Set([
  'hostId', 'publicationOwnerId', 'assessment', 'plan', 'registryReference', 'portOptions',
]);
const READ_KEYS = new Set(['revision', 'snapshotHash', 'collectionWeaponIds']);

export const ARENA_V2_SINGLE_WEAPON_RUNTIME_REGISTRATION_ASSEMBLY_POLICY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_SINGLE_WEAPON_RUNTIME_REGISTRATION_ASSEMBLY_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.single-weapon-runtime-registration-assembly.candidate.v1',
    status: 'production-unreachable',
    source: 'same-active-runtime-registry-reference',
    baseDefinitionPolicy: 'derived-from-reference-head-only',
    driftPolicy: 'double-read-fail-closed',
    callerSuppliedBaseDefinitionsAllowed: false,
    defaultInstanceCreated: false,
    defaultRegistryWired: false,
    defaultCompositionWired: false,
    validationStatus: 'not-run',
  } as const);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
}

function captureMethod(value: unknown, methodName: 'read' | 'readHead'): () => unknown {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
    throw new TypeError('Arena V2 runtime Registry reference必须是同步对象。');
  }
  const visited = new Set<object>();
  let cursor: object | null = value;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) {
      throw new TypeError('Arena V2 runtime Registry reference原型链无效。');
    }
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, methodName);
    if (descriptor !== undefined) {
      if (descriptor.get !== undefined
        || descriptor.set !== undefined
        || !Object.hasOwn(descriptor, 'value')
        || typeof descriptor.value !== 'function') {
        throw new TypeError(`Arena V2 runtime Registry reference.${methodName}必须是数据方法。`);
      }
      const method = descriptor.value as (...args: readonly unknown[]) => unknown;
      return () => method.call(value);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new TypeError(`Arena V2 runtime Registry reference缺少${methodName}方法。`);
}

function readRegistry(value: unknown) {
  exactRecord(value, READ_KEYS, 'Arena V2 runtime Registry read');
  const revision = assertIntegerAtLeast(
    value.revision,
    0,
    'Arena V2 runtime Registry revision',
  );
  if (!Number.isSafeInteger(revision)) {
    throw new RangeError('Arena V2 runtime Registry revision必须是安全整数。');
  }
  if (typeof value.snapshotHash !== 'string'
    || !/^[0-9a-f]{8}$/u.test(value.snapshotHash)) {
    throw new RangeError('Arena V2 runtime Registry snapshotHash必须是8位小写hash。');
  }
  if (!Array.isArray(value.collectionWeaponIds)) {
    throw new TypeError('Arena V2 runtime Registry collectionWeaponIds必须是数组。');
  }
  const collectionWeaponIds = Object.freeze(value.collectionWeaponIds.map((entry, index) => (
    assertNonEmptyString(entry, `Arena V2 runtime Registry collectionWeaponIds[${index}]`)
  )));
  if (new Set(collectionWeaponIds).size !== collectionWeaponIds.length) {
    throw new RangeError('Arena V2 runtime Registry collectionWeaponIds不能重复。');
  }
  return Object.freeze({
    revision,
    snapshotHash: value.snapshotHash,
    collectionWeaponIds,
  });
}

function sameRead(
  left: ReturnType<typeof readRegistry>,
  right: ReturnType<typeof readRegistry>,
): boolean {
  return left.revision === right.revision
    && left.snapshotHash === right.snapshotHash
    && left.collectionWeaponIds.length === right.collectionWeaponIds.length
    && left.collectionWeaponIds.every((id, index) => id === right.collectionWeaponIds[index]);
}

export function createArenaV2SingleWeaponRuntimeRegistrationAssemblyCandidateV1(
  options: ArenaV2SingleWeaponRuntimeRegistrationAssemblyOptionsCandidateV1,
): Readonly<ArenaV2SingleWeaponRuntimeRegistrationAssemblyCandidateV1> {
  exactRecord(
    options,
    OPTION_KEYS,
    'Arena V2 single weapon runtime registration assembly options',
  );
  const read = captureMethod(options.registryReference, 'read');
  const readHead = captureMethod(options.registryReference, 'readHead');
  const before = readRegistry(read());
  const head = createArenaV2PublishedRegistrySnapshotCandidateV1(
    readHead(),
    'Arena V2 runtime registration active head',
  );
  const headHash = createArenaV2RegistryPublicationSnapshotHashCandidateV1(head);
  if (before.snapshotHash !== headHash
    || before.collectionWeaponIds.length !== head.collectionWeaponIds.length
    || !before.collectionWeaponIds.every((id, index) => id === head.collectionWeaponIds[index])) {
    throw new RangeError('Arena V2 runtime registration read与head不一致。');
  }
  const plan = validateArenaV2SingleWeaponRegistrationPlanCandidateV1({
    assessment: options.assessment,
    plan: options.plan,
  });
  if (head.collectionWeaponIds.includes(plan.weaponId)) {
    throw new RangeError(`Arena V2 runtime Registry已经包含目标武器${plan.weaponId}。`);
  }
  assertArenaV2NextRegistryWeaponCandidateV1(
    head.collectionWeaponIds,
    plan.weaponId,
  );
  const after = readRegistry(read());
  if (!sameRead(before, after)) {
    throw new RangeError('Arena V2 runtime registration装配期间active Registry发生漂移。');
  }
  const registrationHostOptions = Object.freeze({
    hostId: assertNonEmptyString(options.hostId, 'Arena V2 runtime registration hostId'),
    publicationOwnerId: assertNonEmptyString(
      options.publicationOwnerId,
      'Arena V2 runtime registration publicationOwnerId',
    ),
    snapshotOptions: Object.freeze({
      assessment: options.assessment,
      plan,
      baseCollectionWeaponIds: head.collectionWeaponIds,
      baseActionDefinitions: head.actionRegistry.list(),
      baseEquipmentDefinitions: head.equipmentRegistry.list(),
      baseGrammarDefinitions: head.grammarDefinitions,
    }),
    portOptions: options.portOptions,
  }) satisfies Readonly<ArenaV2SingleWeaponPersistentRegistrationHostOptionsCandidateV1>;
  return Object.freeze({
    schemaVersion:
      ARENA_V2_SINGLE_WEAPON_RUNTIME_REGISTRATION_ASSEMBLY_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    weaponId: plan.weaponId,
    sourceRevision: before.revision,
    sourceSnapshotHash: before.snapshotHash,
    sourceCollectionWeaponIds: before.collectionWeaponIds,
    registrationHostOptions,
    defaultInstanceCreated: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
  });
}
