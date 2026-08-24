import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  createDeterministicDataHash,
  createSynchronousStoragePort,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  createArenaV2PublishedRegistrySnapshotCandidateV1,
  createArenaV2RegistryPublicationSnapshotHashCandidateV1,
} from './arena-v2-in-memory-registry-publication-port-candidate-v1.js';
import type {
  ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1,
} from './arena-v2-persistent-registry-publication-port-candidate-v1.js';
import {
  projectArenaV2RegistryWeaponSequenceCandidateV1,
} from './arena-v2-registry-weapon-sequence-candidate-v1.js';
import {
  validateArenaV2SingleWeaponProductionAssessmentCandidateV1,
} from './arena-v2-single-weapon-production-assessment-candidate-v1.js';
import {
  createArenaV2SingleWeaponRegistrationPlanCandidateV1,
} from './arena-v2-single-weapon-registration-plan-candidate-v1.js';
import {
  createArenaV2SingleWeaponRuntimeRegistrationAssemblyCandidateV1,
} from './arena-v2-single-weapon-runtime-registration-assembly-candidate-v1.js';
import type {
  ArenaV2SingleWeaponPersistentRegistrationHostOptionsCandidateV1,
} from './arena-v2-single-weapon-persistent-registration-host-candidate-v1.js';

export const ARENA_V2_SINGLE_WEAPON_REGISTRATION_CONFIGURATION_ENVELOPE_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

export interface ArenaV2SingleWeaponRegistrationConfigurationEnvelopeOptionsCandidateV1 {
  readonly assessment: unknown;
  readonly registryReference: unknown;
  readonly hostId: string;
  readonly publicationOwnerId: string;
  readonly portOptions: ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1;
}

export interface ArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1 {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly hardGate: false;
  readonly assessmentContentHash: string;
  readonly readinessContentHash: string;
  readonly planContentHash: string;
  readonly forwardOperationIds: readonly string[];
  readonly rollbackOperationIds: readonly string[];
  readonly sourceRevision: number;
  readonly sourceSnapshotHash: string;
  readonly sourceCollectionWeaponIds: readonly string[];
  readonly targetWeaponId: string;
  readonly targetEquipmentDefinitionId: string;
  readonly targetCollectionOrder: number;
  readonly registrationHostIdentity: Readonly<{
    readonly hostId: string;
    readonly publicationOwnerId: string;
    readonly repositoryOwnerId: string;
    readonly leaseHolderId: string;
    readonly keyPrefix: string;
    readonly leaseDurationMs: number;
    readonly leaseTakeoverSameOwner: boolean;
    readonly initialRevision: 0;
    readonly initialSnapshotHash: string;
  }>;
  readonly registrationHostOptions:
    Readonly<ArenaV2SingleWeaponPersistentRegistrationHostOptionsCandidateV1>;
  readonly contentHashScope: 'deterministic-configuration-identity-excludes-injected-functions';
  readonly createsHost: false;
  readonly publishesRegistry: false;
  readonly activatesGeneration: false;
  readonly swapsRegistryReference: false;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
  readonly defaultEntryWired: false;
  readonly contentHash: string;
}

const OPTION_KEYS = new Set([
  'assessment', 'registryReference', 'hostId', 'publicationOwnerId', 'portOptions',
]);
const PORT_OPTION_KEYS = new Set([
  'storage', 'repositoryOwnerId', 'leaseHolderId', 'wallNow', 'initialRevision',
  'initialSnapshot', 'keyPrefix', 'leaseDurationMs', 'leaseTakeoverSameOwner',
]);
const REQUIRED_PORT_OPTION_KEYS = Object.freeze([
  'storage', 'repositoryOwnerId', 'leaseHolderId', 'wallNow', 'initialRevision',
  'initialSnapshot',
] as const);
const REGISTRATION_HOST_OPTION_KEYS = new Set([
  'hostId', 'publicationOwnerId', 'snapshotOptions', 'portOptions',
]);
const SNAPSHOT_OPTION_KEYS = new Set([
  'assessment', 'plan', 'baseCollectionWeaponIds', 'baseActionDefinitions',
  'baseEquipmentDefinitions', 'baseGrammarDefinitions',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;
const DEFAULT_KEY_PREFIX = 'arena-v2.registry-publication.candidate.v1';
const DEFAULT_LEASE_DURATION_MS = 60_000;

export const ARENA_V2_SINGLE_WEAPON_REGISTRATION_CONFIGURATION_ENVELOPE_POLICY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_SINGLE_WEAPON_REGISTRATION_CONFIGURATION_ENVELOPE_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.single-weapon-registration-configuration-envelope.candidate.v1' as const,
    status: 'production-unreachable' as const,
    assessmentSource: 'validated-stored-assessment-only' as const,
    planSource: 'internally-recomputed-twelve-step-plan' as const,
    registrySource: 'same-active-reference-double-read-and-head' as const,
    activeSequence: 'formal-twenty-weapon-contiguous-prefix' as const,
    targetSequence: 'exactly-next-single-weapon' as const,
    callerSuppliedPlanAllowed: false as const,
    callerSuppliedBaseDefinitionsAllowed: false as const,
    createsHost: false as const,
    publishesRegistry: false as const,
    activatesGeneration: false as const,
    swapsRegistryReference: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    defaultEntryWired: false as const,
    hardGate: false as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
  });

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  requiredKeys: readonly string[],
  name: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  assertKnownKeys(value, keys, name);
  for (const key of requiredKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是自有可枚举数据字段。`);
    }
  }
}

function hash(value: unknown, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (!HASH_PATTERN.test(result)) throw new RangeError(`${name}必须是8位小写hash。`);
  return result;
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function normalizePortOptions(
  value: unknown,
): Readonly<{
  readonly portOptions: ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1;
  readonly identity: ArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1[
    'registrationHostIdentity'
  ];
}> {
  exactRecord(
    value,
    PORT_OPTION_KEYS,
    REQUIRED_PORT_OPTION_KEYS,
    'Arena V2 single weapon registration envelope.portOptions',
  );
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const portOptionValues = new Map<string, unknown>();
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(
        `Arena V2 single weapon registration envelope.portOptions.${key}`
        + '必须是自有可枚举数据字段。',
      );
    }
    portOptionValues.set(key, descriptor.value);
  }
  const data = (key: string): unknown => portOptionValues.get(key);
  const storage = createSynchronousStoragePort(data('storage'), {
    label: 'Arena V2 Single Weapon Registration Envelope Storage',
  });
  const wallNow = data('wallNow');
  if (typeof wallNow !== 'function') {
    throw new TypeError('Arena V2 single weapon registration envelope.wallNow必须是函数。');
  }
  const repositoryOwnerId = assertNonEmptyString(
    data('repositoryOwnerId'),
    'Arena V2 single weapon registration envelope.repositoryOwnerId',
  );
  const leaseHolderId = assertNonEmptyString(
    data('leaseHolderId'),
    'Arena V2 single weapon registration envelope.leaseHolderId',
  );
  const initialRevision = assertIntegerAtLeast(
    data('initialRevision'),
    0,
    'Arena V2 single weapon registration envelope.initialRevision',
  );
  const initialSnapshot = createArenaV2PublishedRegistrySnapshotCandidateV1(
    data('initialSnapshot'),
    'Arena V2 single weapon registration envelope initial snapshot',
  );
  if (initialRevision !== 0 || initialSnapshot.collectionWeaponIds.length !== 0) {
    throw new RangeError('Arena V2单把注册封套持久端口必须从revision 0空基线恢复。');
  }
  const initialSnapshotHash = createArenaV2RegistryPublicationSnapshotHashCandidateV1(
    initialSnapshot,
  );
  const keyPrefix = !portOptionValues.has('keyPrefix')
    ? DEFAULT_KEY_PREFIX
    : assertNonEmptyString(
      data('keyPrefix'),
      'Arena V2 single weapon registration envelope.keyPrefix',
    );
  const leaseDurationMs = !portOptionValues.has('leaseDurationMs')
    ? DEFAULT_LEASE_DURATION_MS
    : assertIntegerAtLeast(
      data('leaseDurationMs'),
      1_000,
      'Arena V2 single weapon registration envelope.leaseDurationMs',
    );
  const leaseTakeoverSameOwner = !portOptionValues.has('leaseTakeoverSameOwner')
    ? false
    : data('leaseTakeoverSameOwner');
  if (typeof leaseTakeoverSameOwner !== 'boolean') {
    throw new TypeError(
      'Arena V2 single weapon registration envelope.leaseTakeoverSameOwner必须是布尔值。',
    );
  }
  const normalizedPortOptions = Object.freeze({
    storage: Object.freeze({
      storageRead: (key: string) => storage.read(key),
      storageWrite: (key: string, data: unknown) => storage.write(key, data),
      storageDelete: (key: string) => storage.delete(key),
    }),
    repositoryOwnerId,
    leaseHolderId,
    wallNow: wallNow as () => number,
    initialRevision: 0 as const,
    initialSnapshot,
    keyPrefix,
    leaseDurationMs,
    leaseTakeoverSameOwner,
  }) satisfies Readonly<ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1>;
  return Object.freeze({
    portOptions: normalizedPortOptions,
    identity: Object.freeze({
      hostId: '',
      publicationOwnerId: '',
      repositoryOwnerId,
      leaseHolderId,
      keyPrefix,
      leaseDurationMs,
      leaseTakeoverSameOwner,
      initialRevision: 0 as const,
      initialSnapshotHash,
    }),
  });
}

export function createArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1(
  options: ArenaV2SingleWeaponRegistrationConfigurationEnvelopeOptionsCandidateV1,
): Readonly<ArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1> {
  exactRecord(
    options,
    OPTION_KEYS,
    [...OPTION_KEYS],
    'Arena V2 single weapon registration configuration envelope options',
  );
  const hostId = assertNonEmptyString(options.hostId, 'Arena V2 registration envelope.hostId');
  const publicationOwnerId = assertNonEmptyString(
    options.publicationOwnerId,
    'Arena V2 registration envelope.publicationOwnerId',
  );
  const assessment = validateArenaV2SingleWeaponProductionAssessmentCandidateV1(
    options.assessment,
  );
  const plan = createArenaV2SingleWeaponRegistrationPlanCandidateV1(assessment);
  if (plan.forwardOperationIds.length !== 12
    || plan.rollbackOperationIds.length !== 12
    || new Set(plan.forwardOperationIds).size !== 12
    || !plan.rollbackOperationIds.every((operationId, index) => (
      operationId === plan.forwardOperationIds[11 - index]
    ))) {
    throw new RangeError('Arena V2单把注册封套要求精确12步及反向回滚。');
  }
  const normalizedPort = normalizePortOptions(options.portOptions);
  const assembly = createArenaV2SingleWeaponRuntimeRegistrationAssemblyCandidateV1({
    hostId,
    publicationOwnerId,
    assessment,
    plan,
    registryReference: options.registryReference,
    portOptions: normalizedPort.portOptions,
  });
  const sequence = projectArenaV2RegistryWeaponSequenceCandidateV1(
    assembly.sourceCollectionWeaponIds,
  );
  const targetWeapon = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(
    ({ id }) => id === plan.weaponId,
  );
  if (targetWeapon === undefined
    || sequence.complete
    || sequence.nextWeaponId !== targetWeapon.id
    || sequence.nextWeaponDefinitionId !== targetWeapon.equipment.id
    || sequence.nextCollectionOrder !== targetWeapon.collectionOrder
    || assembly.weaponId !== targetWeapon.id
    || plan.equipmentDefinitionId !== targetWeapon.equipment.id
    || plan.assessmentContentHash !== assessment.assessmentContentHash
    || plan.readinessContentHash !== assessment.readinessContentHash) {
    throw new RangeError('Arena V2单把注册封套assessment、plan与连续武器序列身份不一致。');
  }
  hash(assembly.sourceSnapshotHash, 'Arena V2 registration envelope.sourceSnapshotHash');
  if (!Number.isSafeInteger(assembly.sourceRevision) || assembly.sourceRevision < 0
    || !sameIds(assembly.sourceCollectionWeaponIds, sequence.activeWeaponIds)) {
    throw new RangeError('Arena V2单把注册封套active Registry来源身份无效。');
  }
  const registrationHostOptions = assembly.registrationHostOptions;
  exactRecord(
    registrationHostOptions,
    REGISTRATION_HOST_OPTION_KEYS,
    [...REGISTRATION_HOST_OPTION_KEYS],
    'Arena V2 single weapon registration envelope.registrationHostOptions',
  );
  const snapshotOptionsValue = registrationHostOptions.snapshotOptions;
  exactRecord(
    snapshotOptionsValue,
    SNAPSHOT_OPTION_KEYS,
    [...SNAPSHOT_OPTION_KEYS],
    'Arena V2 single weapon registration envelope.snapshotOptions',
  );
  const snapshotOptions = snapshotOptionsValue;
  if (registrationHostOptions.hostId !== hostId
    || registrationHostOptions.publicationOwnerId !== publicationOwnerId
    || registrationHostOptions.portOptions !== normalizedPort.portOptions
    || snapshotOptions.assessment !== assessment
    || snapshotOptions.plan !== plan
    || !Array.isArray(snapshotOptions.baseCollectionWeaponIds)
    || !sameIds(
      snapshotOptions.baseCollectionWeaponIds as readonly string[],
      sequence.activeWeaponIds,
    )) {
    throw new RangeError('Arena V2单把注册封套runtime assembly身份漂移。');
  }
  const registrationHostIdentity = Object.freeze({
    ...normalizedPort.identity,
    hostId,
    publicationOwnerId,
  });
  const authority = Object.freeze({
    schemaVersion:
      ARENA_V2_SINGLE_WEAPON_REGISTRATION_CONFIGURATION_ENVELOPE_CANDIDATE_V1_SCHEMA_VERSION,
    id: `arena-v2.single-weapon-registration-configuration-envelope.${targetWeapon.id}.candidate.v1`,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    assessmentContentHash: hash(
      assessment.assessmentContentHash,
      'Arena V2 registration envelope.assessmentContentHash',
    ),
    readinessContentHash: hash(
      assessment.readinessContentHash,
      'Arena V2 registration envelope.readinessContentHash',
    ),
    planContentHash: hash(plan.contentHash, 'Arena V2 registration envelope.planContentHash'),
    forwardOperationIds: Object.freeze([...plan.forwardOperationIds]),
    rollbackOperationIds: Object.freeze([...plan.rollbackOperationIds]),
    sourceRevision: assembly.sourceRevision,
    sourceSnapshotHash: assembly.sourceSnapshotHash,
    sourceCollectionWeaponIds: Object.freeze([...sequence.activeWeaponIds]),
    targetWeaponId: targetWeapon.id,
    targetEquipmentDefinitionId: targetWeapon.equipment.id,
    targetCollectionOrder: targetWeapon.collectionOrder,
    registrationHostIdentity,
    contentHashScope:
      'deterministic-configuration-identity-excludes-injected-functions' as const,
    createsHost: false as const,
    publishesRegistry: false as const,
    activatesGeneration: false as const,
    swapsRegistryReference: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    defaultEntryWired: false as const,
  });
  return Object.freeze({
    ...authority,
    registrationHostOptions,
    contentHash: createDeterministicDataHash(
      authority,
      `Arena V2 single weapon registration configuration envelope ${targetWeapon.id}`,
    ),
  });
}
