import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ActionRegistry,
  EquipmentRegistry,
  createWeaponCombatGrammarDefinitionV1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  createArenaV2PublishedRegistrySnapshotCandidateV1,
  createArenaV2RegistryPublicationSnapshotHashCandidateV1,
} from './arena-v2-in-memory-registry-publication-port-candidate-v1.js';
import type {
  ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1,
} from './arena-v2-single-weapon-registry-publication-owner-candidate-v1.js';

export const ARENA_V2_REGISTRY_PUBLICATION_ENVELOPE_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;
export const ARENA_V2_REGISTRY_PUBLICATION_PRODUCT_ID_CANDIDATE_V1 =
  'arena-v2' as const;

export class ArenaV2RegistryPublicationFutureSchemaErrorCandidateV1 extends Error {
  readonly schemaVersion: unknown;

  constructor(schemaVersion: unknown) {
    super(`Arena V2 Registry publication不支持未来schema ${String(schemaVersion)}。`);
    this.name = 'ArenaV2RegistryPublicationFutureSchemaErrorCandidateV1';
    this.schemaVersion = schemaVersion;
    Object.freeze(this);
  }
}

export interface ArenaV2RegistryPublicationTransitionCandidateV1 {
  readonly ownerId: string;
  readonly weaponId: string;
  readonly direction: 'publish' | 'rollback';
  readonly fromRevision: number;
  readonly fromSnapshotHash: string;
  readonly toRevision: number;
  readonly toSnapshotHash: string;
  readonly planContentHash: string;
}

export interface ArenaV2RegistryPublicationEnvelopeCandidateV1 {
  readonly schemaVersion: 1;
  readonly productId: 'arena-v2';
  readonly revision: number;
  readonly snapshotHash: string;
  readonly collectionWeaponIds: readonly string[];
  readonly actionDefinitions: readonly unknown[];
  readonly equipmentDefinitions: readonly unknown[];
  readonly grammarDefinitions: readonly unknown[];
  readonly transition: Readonly<ArenaV2RegistryPublicationTransitionCandidateV1> | null;
  readonly envelopeHash: string;
}

export interface ArenaV2RegistryPublicationDecodedEnvelopeCandidateV1 {
  readonly envelope: Readonly<ArenaV2RegistryPublicationEnvelopeCandidateV1>;
  readonly snapshot: Readonly<ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1>;
}

const CREATE_KEYS = new Set(['revision', 'snapshot', 'transition']);
const ENVELOPE_KEYS = new Set([
  'schemaVersion', 'productId', 'revision', 'snapshotHash', 'collectionWeaponIds',
  'actionDefinitions', 'equipmentDefinitions', 'grammarDefinitions', 'transition',
  'envelopeHash',
]);
const TRANSITION_KEYS = new Set([
  'ownerId', 'weaponId', 'direction', 'fromRevision', 'fromSnapshotHash',
  'toRevision', 'toSnapshotHash', 'planContentHash',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;
const COLLECTION_WEAPON_IDS: ReadonlySet<string> = new Set(
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(({ id }) => id),
);

export const ARENA_V2_REGISTRY_PUBLICATION_ENVELOPE_POLICY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: ARENA_V2_REGISTRY_PUBLICATION_ENVELOPE_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.registry-publication-envelope-policy.candidate.v1' as const,
    status: 'production-unreachable' as const,
    productId: ARENA_V2_REGISTRY_PUBLICATION_PRODUCT_ID_CANDIDATE_V1,
    storedShape: 'plain-data-only' as const,
    definitionScope: 'arena-v2-collection-weapons-only' as const,
    integrity: 'snapshot-hash-plus-envelope-hash' as const,
    transitionAudit: 'exact-single-weapon-cas' as const,
    futureSchemaPolicy: 'reject' as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    validationStatus: 'not-run' as const,
  });

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

function contentHash(value: unknown, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (!HASH_PATTERN.test(result)) throw new RangeError(`${name}必须是8位小写hash。`);
  return result;
}

function normalizeTransition(
  value: unknown,
  revision: number,
  snapshotHash: string,
  collectionWeaponIds: readonly string[],
): Readonly<ArenaV2RegistryPublicationTransitionCandidateV1> | null {
  if (value === null) return null;
  exactRecord(value, TRANSITION_KEYS, 'Arena V2 Registry publication transition');
  const direction = value.direction;
  if (direction !== 'publish' && direction !== 'rollback') {
    throw new RangeError('Arena V2 Registry publication transition.direction无效。');
  }
  const weaponId = assertNonEmptyString(
    value.weaponId,
    'Arena V2 Registry publication transition.weaponId',
  );
  if (!COLLECTION_WEAPON_IDS.has(weaponId)) {
    throw new RangeError(`Arena V2 Registry publication transition包含目录外武器${weaponId}。`);
  }
  const fromRevision = assertIntegerAtLeast(
    value.fromRevision,
    0,
    'Arena V2 Registry publication transition.fromRevision',
  );
  const toRevision = assertIntegerAtLeast(
    value.toRevision,
    1,
    'Arena V2 Registry publication transition.toRevision',
  );
  if (fromRevision >= Number.MAX_SAFE_INTEGER || toRevision !== fromRevision + 1) {
    throw new RangeError('Arena V2 Registry publication transition revision必须严格递增1。');
  }
  if (toRevision !== revision) {
    throw new RangeError('Arena V2 Registry publication transition.toRevision与封装不一致。');
  }
  const toSnapshotHash = contentHash(
    value.toSnapshotHash,
    'Arena V2 Registry publication transition.toSnapshotHash',
  );
  if (toSnapshotHash !== snapshotHash) {
    throw new RangeError('Arena V2 Registry publication transition.toSnapshotHash与封装不一致。');
  }
  if ((direction === 'publish') !== collectionWeaponIds.includes(weaponId)) {
    throw new RangeError('Arena V2 Registry publication transition方向与目标武器结果不一致。');
  }
  return Object.freeze({
    ownerId: assertNonEmptyString(
      value.ownerId,
      'Arena V2 Registry publication transition.ownerId',
    ),
    weaponId,
    direction,
    fromRevision,
    fromSnapshotHash: contentHash(
      value.fromSnapshotHash,
      'Arena V2 Registry publication transition.fromSnapshotHash',
    ),
    toRevision,
    toSnapshotHash,
    planContentHash: contentHash(
      value.planContentHash,
      'Arena V2 Registry publication transition.planContentHash',
    ),
  });
}

function envelopePayload(
  envelope: Omit<ArenaV2RegistryPublicationEnvelopeCandidateV1, 'envelopeHash'>,
) {
  return Object.freeze({
    schemaVersion: envelope.schemaVersion,
    productId: envelope.productId,
    revision: envelope.revision,
    snapshotHash: envelope.snapshotHash,
    collectionWeaponIds: envelope.collectionWeaponIds,
    actionDefinitions: envelope.actionDefinitions,
    equipmentDefinitions: envelope.equipmentDefinitions,
    grammarDefinitions: envelope.grammarDefinitions,
    transition: envelope.transition,
  });
}

export function createArenaV2RegistryPublicationEnvelopeCandidateV1(
  value: unknown,
): Readonly<ArenaV2RegistryPublicationEnvelopeCandidateV1> {
  exactRecord(value, CREATE_KEYS, 'Arena V2 Registry publication envelope input');
  const revision = assertIntegerAtLeast(
    value.revision,
    0,
    'Arena V2 Registry publication envelope revision',
  );
  const snapshot = createArenaV2PublishedRegistrySnapshotCandidateV1(value.snapshot);
  const snapshotHash = createArenaV2RegistryPublicationSnapshotHashCandidateV1(snapshot);
  const collectionWeaponIds = cloneFrozenData(
    snapshot.collectionWeaponIds,
    'Arena V2 Registry publication envelope collectionWeaponIds',
  );
  const transition = normalizeTransition(
    value.transition,
    revision,
    snapshotHash,
    collectionWeaponIds,
  );
  const payload = Object.freeze({
    schemaVersion: ARENA_V2_REGISTRY_PUBLICATION_ENVELOPE_CANDIDATE_V1_SCHEMA_VERSION,
    productId: ARENA_V2_REGISTRY_PUBLICATION_PRODUCT_ID_CANDIDATE_V1,
    revision,
    snapshotHash,
    collectionWeaponIds,
    actionDefinitions: cloneFrozenData(
      snapshot.actionRegistry.list(),
      'Arena V2 Registry publication envelope Action Definitions',
    ),
    equipmentDefinitions: cloneFrozenData(
      snapshot.equipmentRegistry.list(),
      'Arena V2 Registry publication envelope Equipment Definitions',
    ),
    grammarDefinitions: cloneFrozenData(
      snapshot.grammarDefinitions,
      'Arena V2 Registry publication envelope Grammar Definitions',
    ),
    transition,
  });
  return Object.freeze({
    ...payload,
    envelopeHash: createDeterministicDataHash(
      payload,
      'Arena V2 Registry publication envelope',
    ),
  });
}

export function decodeArenaV2RegistryPublicationEnvelopeCandidateV1(
  value: unknown,
): Readonly<ArenaV2RegistryPublicationDecodedEnvelopeCandidateV1> {
  const source = cloneFrozenData(value, 'Arena V2 Registry publication stored envelope');
  exactRecord(source, ENVELOPE_KEYS, 'Arena V2 Registry publication stored envelope');
  if (source.schemaVersion
    !== ARENA_V2_REGISTRY_PUBLICATION_ENVELOPE_CANDIDATE_V1_SCHEMA_VERSION) {
    throw new ArenaV2RegistryPublicationFutureSchemaErrorCandidateV1(source.schemaVersion);
  }
  if (source.productId !== ARENA_V2_REGISTRY_PUBLICATION_PRODUCT_ID_CANDIDATE_V1) {
    throw new RangeError('Arena V2 Registry publication productId无效。');
  }
  if (!Array.isArray(source.collectionWeaponIds)
    || !Array.isArray(source.actionDefinitions)
    || !Array.isArray(source.equipmentDefinitions)
    || !Array.isArray(source.grammarDefinitions)) {
    throw new TypeError('Arena V2 Registry publication Definition字段必须是数组。');
  }
  const actionRegistry = new ActionRegistry(source.actionDefinitions);
  const equipmentRegistry = new EquipmentRegistry({
    definitions: source.equipmentDefinitions,
    actionRegistry,
  });
  const snapshot = createArenaV2PublishedRegistrySnapshotCandidateV1(Object.freeze({
    collectionWeaponIds: source.collectionWeaponIds,
    actionRegistry,
    equipmentRegistry,
    grammarDefinitions: source.grammarDefinitions.map(createWeaponCombatGrammarDefinitionV1),
  }));
  const canonical = createArenaV2RegistryPublicationEnvelopeCandidateV1({
    revision: source.revision,
    snapshot,
    transition: source.transition,
  });
  if (contentHash(
    source.snapshotHash,
    'Arena V2 Registry publication stored snapshotHash',
  ) !== canonical.snapshotHash
    || contentHash(
      source.envelopeHash,
      'Arena V2 Registry publication stored envelopeHash',
    ) !== canonical.envelopeHash
    || createDeterministicDataHash(
      envelopePayload(source as unknown as Omit<
        ArenaV2RegistryPublicationEnvelopeCandidateV1,
        'envelopeHash'
      >),
      'Arena V2 Registry publication stored envelope payload',
    ) !== canonical.envelopeHash) {
    throw new RangeError('Arena V2 Registry publication封装内容或hash已经漂移。');
  }
  return Object.freeze({ envelope: canonical, snapshot });
}
