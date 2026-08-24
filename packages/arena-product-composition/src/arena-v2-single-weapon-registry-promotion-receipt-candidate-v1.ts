import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  decodeArenaV2RegistryPublicationEnvelopeCandidateV1,
} from './arena-v2-registry-publication-envelope-candidate-v1.js';
import {
  requireArenaV2SingleWeaponPublishedPromotionCapabilityCandidateV1,
} from './arena-v2-single-weapon-persistent-registration-host-candidate-v1.js';

export const ARENA_V2_SINGLE_WEAPON_REGISTRY_PROMOTION_RECEIPT_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

export interface ArenaV2SingleWeaponRegistryPromotionReceiptCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hostId: string;
  readonly publicationOwnerId: string;
  readonly weaponId: string;
  readonly planContentHash: string;
  readonly fromRevision: number;
  readonly fromSnapshotHash: string;
  readonly toRevision: number;
  readonly toSnapshotHash: string;
  readonly envelopeHash: string;
  readonly collectionWeaponIds: readonly string[];
  readonly atomicReferenceSwapPermitted: true;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
  readonly receiptHash: string;
}

const RECEIPT_KEYS = new Set([
  'schemaVersion', 'status', 'hostId', 'publicationOwnerId', 'weaponId',
  'planContentHash', 'fromRevision', 'fromSnapshotHash', 'toRevision',
  'toSnapshotHash', 'envelopeHash', 'collectionWeaponIds',
  'atomicReferenceSwapPermitted', 'defaultRegistryWired',
  'defaultCompositionWired', 'receiptHash',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;
const AUTHORIZED_PROMOTION_RECEIPTS = new WeakSet<object>();

export const ARENA_V2_SINGLE_WEAPON_REGISTRY_PROMOTION_RECEIPT_POLICY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_SINGLE_WEAPON_REGISTRY_PROMOTION_RECEIPT_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.single-weapon-registry-promotion-receipt-policy.candidate.v1' as const,
    status: 'production-unreachable' as const,
    authority: 'module-private-published-host-capability' as const,
    persistenceEvidence: 'decoded-envelope-and-read-head' as const,
    transition: 'publish-only' as const,
    referenceSwap: 'single-use-cas-by-current-head' as const,
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

function hash(value: unknown, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (!HASH_PATTERN.test(result)) throw new RangeError(`${name}必须是8位小写hash。`);
  return result;
}

function ids(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  const result = value.map((entry, index) => assertNonEmptyString(entry, `${name}[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError(`${name}不能重复。`);
  return Object.freeze(result);
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function receiptPayload(
  receipt: Omit<ArenaV2SingleWeaponRegistryPromotionReceiptCandidateV1, 'receiptHash'>,
) {
  return Object.freeze({
    schemaVersion: receipt.schemaVersion,
    status: receipt.status,
    hostId: receipt.hostId,
    publicationOwnerId: receipt.publicationOwnerId,
    weaponId: receipt.weaponId,
    planContentHash: receipt.planContentHash,
    fromRevision: receipt.fromRevision,
    fromSnapshotHash: receipt.fromSnapshotHash,
    toRevision: receipt.toRevision,
    toSnapshotHash: receipt.toSnapshotHash,
    envelopeHash: receipt.envelopeHash,
    collectionWeaponIds: receipt.collectionWeaponIds,
    atomicReferenceSwapPermitted: receipt.atomicReferenceSwapPermitted,
    defaultRegistryWired: receipt.defaultRegistryWired,
    defaultCompositionWired: receipt.defaultCompositionWired,
  });
}

export function createArenaV2SingleWeaponRegistryPromotionReceiptCandidateV1(
  capabilityValue: unknown,
): Readonly<ArenaV2SingleWeaponRegistryPromotionReceiptCandidateV1> {
  const capability = requireArenaV2SingleWeaponPublishedPromotionCapabilityCandidateV1(
    capabilityValue,
  );
  const decoded = decodeArenaV2RegistryPublicationEnvelopeCandidateV1(
    capability.registryEnvelope,
  );
  const transition = decoded.envelope.transition;
  if (transition === null || transition.direction !== 'publish') {
    throw new RangeError('Arena V2 Registry晋级只接受封存的单把publish generation。');
  }
  if (transition.ownerId !== capability.publicationOwnerId
    || transition.weaponId !== capability.weaponId
    || transition.planContentHash !== capability.planContentHash
    || transition.fromSnapshotHash !== capability.previousSnapshotHash
    || transition.toSnapshotHash !== capability.nextSnapshotHash
    || transition.toRevision !== decoded.envelope.revision
    || decoded.envelope.snapshotHash !== capability.registryRead.snapshotHash
    || decoded.envelope.revision !== capability.registryRead.revision
    || !sameIds(
      decoded.snapshot.collectionWeaponIds,
      capability.registryRead.collectionWeaponIds,
    )) {
    throw new RangeError('Arena V2 Registry封存能力、持久封装与当前头不闭合。');
  }
  const payload = Object.freeze({
    schemaVersion:
      ARENA_V2_SINGLE_WEAPON_REGISTRY_PROMOTION_RECEIPT_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    hostId: assertNonEmptyString(capability.hostId, 'Arena V2 Registry promotion hostId'),
    publicationOwnerId: transition.ownerId,
    weaponId: transition.weaponId,
    planContentHash: transition.planContentHash,
    fromRevision: transition.fromRevision,
    fromSnapshotHash: transition.fromSnapshotHash,
    toRevision: transition.toRevision,
    toSnapshotHash: transition.toSnapshotHash,
    envelopeHash: decoded.envelope.envelopeHash,
    collectionWeaponIds: decoded.snapshot.collectionWeaponIds,
    atomicReferenceSwapPermitted: true as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
  });
  const receipt = Object.freeze({
    ...payload,
    receiptHash: createDeterministicDataHash(
      payload,
      'Arena V2 single weapon registry promotion receipt',
    ),
  });
  AUTHORIZED_PROMOTION_RECEIPTS.add(receipt);
  return receipt;
}

export function requireArenaV2SingleWeaponRegistryPromotionReceiptCapabilityCandidateV1(
  value: unknown,
): Readonly<ArenaV2SingleWeaponRegistryPromotionReceiptCandidateV1> {
  if (typeof value !== 'object' || value === null
    || !AUTHORIZED_PROMOTION_RECEIPTS.has(value)) {
    throw new TypeError('Arena V2默认Registry交换必须使用本进程真实晋级回执。');
  }
  return value as Readonly<ArenaV2SingleWeaponRegistryPromotionReceiptCandidateV1>;
}

export function validateArenaV2SingleWeaponRegistryPromotionReceiptCandidateV1(
  value: unknown,
): Readonly<ArenaV2SingleWeaponRegistryPromotionReceiptCandidateV1> {
  const source = cloneFrozenData(value, 'Arena V2 stored Registry promotion receipt');
  exactRecord(source, RECEIPT_KEYS, 'Arena V2 stored Registry promotion receipt');
  if (source.schemaVersion
    !== ARENA_V2_SINGLE_WEAPON_REGISTRY_PROMOTION_RECEIPT_CANDIDATE_V1_SCHEMA_VERSION
    || source.status !== 'production-unreachable'
    || source.atomicReferenceSwapPermitted !== true
    || source.defaultRegistryWired !== false
    || source.defaultCompositionWired !== false) {
    throw new RangeError('Arena V2 Registry promotion receipt策略字段无效。');
  }
  const fromRevision = assertIntegerAtLeast(
    source.fromRevision,
    0,
    'Arena V2 Registry promotion receipt.fromRevision',
  );
  const toRevision = assertIntegerAtLeast(
    source.toRevision,
    1,
    'Arena V2 Registry promotion receipt.toRevision',
  );
  if (fromRevision >= Number.MAX_SAFE_INTEGER || toRevision !== fromRevision + 1) {
    throw new RangeError('Arena V2 Registry promotion receipt revision必须递增1。');
  }
  const payload = Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hostId: assertNonEmptyString(source.hostId, 'Arena V2 Registry promotion receipt.hostId'),
    publicationOwnerId: assertNonEmptyString(
      source.publicationOwnerId,
      'Arena V2 Registry promotion receipt.publicationOwnerId',
    ),
    weaponId: assertNonEmptyString(
      source.weaponId,
      'Arena V2 Registry promotion receipt.weaponId',
    ),
    planContentHash: hash(
      source.planContentHash,
      'Arena V2 Registry promotion receipt.planContentHash',
    ),
    fromRevision,
    fromSnapshotHash: hash(
      source.fromSnapshotHash,
      'Arena V2 Registry promotion receipt.fromSnapshotHash',
    ),
    toRevision,
    toSnapshotHash: hash(
      source.toSnapshotHash,
      'Arena V2 Registry promotion receipt.toSnapshotHash',
    ),
    envelopeHash: hash(
      source.envelopeHash,
      'Arena V2 Registry promotion receipt.envelopeHash',
    ),
    collectionWeaponIds: ids(
      source.collectionWeaponIds,
      'Arena V2 Registry promotion receipt.collectionWeaponIds',
    ),
    atomicReferenceSwapPermitted: true as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
  });
  if (hash(source.receiptHash, 'Arena V2 Registry promotion receipt.receiptHash')
    !== createDeterministicDataHash(
      receiptPayload(payload),
      'Arena V2 stored Registry promotion receipt',
    )) {
    throw new RangeError('Arena V2 Registry promotion receipt hash已经漂移。');
  }
  return Object.freeze({ ...payload, receiptHash: source.receiptHash as string });
}
