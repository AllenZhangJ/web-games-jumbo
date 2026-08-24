import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
  createSynchronousStoragePort,
  type SynchronousStoragePort,
} from '@number-strategy-jump/arena-contracts';
import { SynchronousStorageLease } from '@number-strategy-jump/arena-storage';
import {
  ARENA_V2_RETENTION_DENOMINATOR_KEY_V1,
  ARENA_V2_RETENTION_IDENTIFIER_MAX_LENGTH_V1,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1,
  createArenaV2RetentionObservationV1,
  type ArenaV2RetentionMetricV1,
  type ArenaV2RetentionObservationKindV1,
  type ArenaV2RetentionObservationReportV1,
  type ArenaV2RetentionObservationV1,
} from './arena-v2-retention-observation-v1.js';

export const ARENA_V2_OFFLINE_RETENTION_OBSERVATION_BATCH_LIMIT_V1 = 25;

export const ARENA_V2_OFFLINE_RETENTION_OBSERVATION_JOURNAL_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSinkWired: false as const,
    networkUploadSupported: false as const,
    wallClockStoredInPayload: false as const,
    cohortSubjectIdMaximumLengthUsesSharedRetentionContract: true as const,
    sameOwnerTakeoverUsesDistinctLeaseHolderIdentity: true as const,
    legacySixMetricEnvelopeMigratesInMemory: true as const,
    legacySevenMetricEnvelopeMigratesInMemory: true as const,
    legacyPayloadHashVerifiedBeforeMigration: true as const,
    deterministicOfflineExportBundleSupported: true as const,
    exportIncludesRawReplayOrInputTrajectory: false as const,
    exportPerformsNetworkUpload: false as const,
    operationGuardPrecedesLifecycleAndInputValidation: true as const,
    storageAndLeasePortsCheckedBeforeCrossOwnerProgress: true as const,
    durableObservationWatermarkPrecedesReentryRejection: true as const,
    pendingCollectIntentFrozenBeforeStorageWrite: true as const,
    pendingCollectRetryRequiresExactObservation: true as const,
    pendingCollectReconcilesBaseOrIntendedDurableIdentity: true as const,
    pendingCollectWatermarkCommitsAfterDurableConfirmation: true as const,
    pendingCollectPublicSnapshotAndExportFailClosed: true as const,
    destroyPreservesUnresolvedPendingCollectOwnership: true as const,
    lastCommittedObservationAcknowledgementRetrySupported: true as const,
    lastCommittedAcknowledgementRequiresExactIdentityAndContent: true as const,
    lastCommittedAcknowledgementTouchesNoStorageOrLease: true as const,
    atomicObservationBatchCollectSupported: true as const,
    atomicObservationBatchLimit: ARENA_V2_OFFLINE_RETENTION_OBSERVATION_BATCH_LIMIT_V1,
    atomicObservationBatchRevisionAdvancesByObservationCount: true as const,
    atomicObservationBatchRetryRequiresExactOrderedContent: true as const,
    atomicObservationBatchAcknowledgementRejectsSubBatchOverlap: true as const,
    destroyClearsLastCommittedObservationBatch: true as const,
    profileRevisionWatermarkMonotonic: true as const,
    profileRevisionRollbackRejectedBeforeStorageAccess: true as const,
    publicReadsRejectOperationIntermediateState: true as const,
    internalSnapshotAvoidsPublicReentry: true as const,
    destroyWatermarkPrecedesReentryRejection: true as const,
    validationStatus: 'not-run' as const,
  });

export interface ArenaV2OfflineRetentionObservationCollectorCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'offline-only';
  readonly cohortSubjectId: string;
  readonly sessionSequence: number;
  readonly collect: (observation: ArenaV2RetentionObservationV1) => void;
  readonly collectBatch?: (
    observations: readonly ArenaV2RetentionObservationV1[],
  ) => void;
}

export interface ArenaV2OfflineRetentionObservationJournalOptionsCandidateV1 {
  readonly storage: unknown;
  readonly ownerId: unknown;
  readonly wallNow: unknown;
  readonly cohortSubjectId: unknown;
  readonly capacity?: unknown;
  readonly keyPrefix?: unknown;
  readonly leaseDurationMs?: unknown;
  readonly leaseTakeoverSameOwner?: unknown;
}

interface StoredMetricV1 {
  readonly kind: ArenaV2RetentionObservationKindV1;
  readonly denominatorKey: ArenaV2RetentionMetricV1['denominatorKey'];
  readonly numerator: number;
  readonly denominator: number;
}

interface StoredJournalPayloadV1 {
  readonly schemaVersion: 1;
  readonly status: 'offline-only';
  readonly cohortSubjectId: string;
  readonly revision: number;
  readonly capacity: number;
  readonly latestSessionSequence: number;
  readonly latestSessionEventSequence: number;
  readonly observationCount: number;
  readonly droppedObservationCount: number;
  readonly metrics: readonly StoredMetricV1[];
  readonly observations: readonly ArenaV2RetentionObservationV1[];
}

interface StoredJournalEnvelopeV1 extends StoredJournalPayloadV1 {
  readonly payloadHash: string;
}

interface PendingCollectIntentV1 {
  readonly baseEnvelope: StoredJournalEnvelopeV1;
  readonly observations: readonly ArenaV2RetentionObservationV1[];
  readonly observationBatchIdentityHash: string;
  readonly observation: ArenaV2RetentionObservationV1;
  readonly observationIdentityHash: string;
  readonly intendedEnvelope: StoredJournalEnvelopeV1;
}

interface LastCommittedCollectBatchV1 {
  readonly observations: readonly ArenaV2RetentionObservationV1[];
  readonly observationBatchIdentityHash: string;
  readonly firstEventSequence: number;
  readonly lastEventSequence: number;
}

export interface ArenaV2OfflineRetentionObservationJournalSnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly lifecycle: 'created' | 'open' | 'failed' | 'destroyed';
  readonly cohortSubjectId: string | null;
  readonly sessionSequence: number | null;
  readonly revision: number;
  readonly capacity: number;
  readonly observationCount: number;
  readonly droppedObservationCount: number;
  readonly retainedObservationCount: number;
  readonly report: ArenaV2RetentionObservationReportV1;
  readonly observations: readonly ArenaV2RetentionObservationV1[];
}

export interface ArenaV2OfflineRetentionObservationExportMetricCandidateV1 {
  readonly kind: ArenaV2RetentionObservationKindV1;
  readonly denominatorKey: ArenaV2RetentionMetricV1['denominatorKey'];
  readonly numerator: number;
  readonly denominator: number;
}

export interface ArenaV2OfflineRetentionObservationExportBundleCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'offline-only-export';
  readonly sourceJournalSchemaVersion: 1;
  readonly cohortSubjectId: string;
  readonly revision: number;
  readonly capacity: number;
  readonly latestSessionSequence: number;
  readonly latestSessionEventSequence: number;
  readonly observationCount: number;
  readonly droppedObservationCount: number;
  readonly retainedObservationCount: number;
  readonly metrics: readonly ArenaV2OfflineRetentionObservationExportMetricCandidateV1[];
  readonly report: ArenaV2RetentionObservationReportV1;
  readonly observations: readonly ArenaV2RetentionObservationV1[];
  readonly sourcePayloadHash: string;
  readonly exportHash: string;
}

type OfflineRetentionObservationJournalOperationCandidateV1 =
  | 'open'
  | 'collector-read'
  | 'collect'
  | 'collect-batch'
  | 'snapshot-read'
  | 'export-read'
  | 'destroy';

const OPTION_KEYS = new Set([
  'storage', 'ownerId', 'wallNow', 'cohortSubjectId', 'capacity', 'keyPrefix',
  'leaseDurationMs', 'leaseTakeoverSameOwner',
]);
const REQUIRED_OPTION_KEYS = Object.freeze([
  'storage', 'ownerId', 'wallNow', 'cohortSubjectId',
] as const);
const ENVELOPE_KEYS = new Set([
  'schemaVersion', 'status', 'cohortSubjectId', 'revision', 'capacity',
  'latestSessionSequence', 'latestSessionEventSequence', 'observationCount',
  'droppedObservationCount', 'metrics', 'observations', 'payloadHash',
]);
const METRIC_KEYS = new Set(['kind', 'denominatorKey', 'numerator', 'denominator']);
const KIND_ORDER = Object.freeze([
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CATALOG_FIRST_SEEN,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CONTENT_REPEAT_ENTRY,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CROSS_CONTENT_USED,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.NEXT_GOAL_SELECTED,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.WEAPON_RESEARCH_FOCUS_CONTINUED,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.HOME_CONTINUATION_FOLLOWED,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.MAP_LEARNING_FOCUS_CONTINUED,
] as const);
const LEGACY_SIX_KIND_ORDER = Object.freeze(KIND_ORDER.slice(0, 6));
const LEGACY_SEVEN_KIND_ORDER = Object.freeze(KIND_ORDER.slice(0, 7));
const DEFAULT_CAPACITY = 1_024;
const MAX_CAPACITY = 16_384;
const DENOMINATOR_BY_KIND: Readonly<Record<
  ArenaV2RetentionObservationKindV1,
  ArenaV2RetentionMetricV1['denominatorKey']
>> = Object.freeze({
  [ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CATALOG_FIRST_SEEN]:
    ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.CATALOG_IMPRESSION,
  [ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED]:
    ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.SETTLED_MATCH,
  [ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CONTENT_REPEAT_ENTRY]:
    ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.CONTENT_ENTRY,
  [ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CROSS_CONTENT_USED]:
    ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.COMPLETED_CONTENT_WINDOW,
  [ARENA_V2_RETENTION_OBSERVATION_KIND_V1.NEXT_GOAL_SELECTED]:
    ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.NEXT_GOAL_IMPRESSION,
  [ARENA_V2_RETENTION_OBSERVATION_KIND_V1.WEAPON_RESEARCH_FOCUS_CONTINUED]:
    ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.WEAPON_RESEARCH_FOCUS_OPPORTUNITY,
  [ARENA_V2_RETENTION_OBSERVATION_KIND_V1.HOME_CONTINUATION_FOLLOWED]:
    ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.HOME_CONTINUATION_ACCEPTED,
  [ARENA_V2_RETENTION_OBSERVATION_KIND_V1.MAP_LEARNING_FOCUS_CONTINUED]:
    ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.MAP_LEARNING_FOCUS_OPPORTUNITY,
});

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function normalizedOptions(
  value: unknown,
): Readonly<{
  storage: unknown;
  ownerId: string;
  wallNow: () => number;
  cohortSubjectId: string;
  capacity: number;
  keyPrefix: string;
  leaseDurationMs: number;
  leaseTakeoverSameOwner: boolean;
}> {
  const name = 'Arena V2 offline retention journal options';
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是对象。`);
  }
  assertKnownKeys(value, OPTION_KEYS, name);
  for (const key of REQUIRED_OPTION_KEYS) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  const storage = dataField(value, 'storage', name);
  const ownerId = assertNonEmptyString(dataField(value, 'ownerId', name), `${name}.ownerId`);
  const cohortSubjectId = assertNonEmptyString(
    dataField(value, 'cohortSubjectId', name),
    `${name}.cohortSubjectId`,
  );
  if (cohortSubjectId.length > ARENA_V2_RETENTION_IDENTIFIER_MAX_LENGTH_V1) {
    throw new RangeError(
      `${name}.cohortSubjectId超出`
      + `${ARENA_V2_RETENTION_IDENTIFIER_MAX_LENGTH_V1}字符。`,
    );
  }
  const wallNow = dataField(value, 'wallNow', name);
  if (typeof wallNow !== 'function') throw new TypeError(`${name}.wallNow必须是函数。`);
  const capacityValue = Object.hasOwn(value, 'capacity')
    ? dataField(value, 'capacity', name)
    : DEFAULT_CAPACITY;
  const capacity = assertIntegerAtLeast(capacityValue, 32, `${name}.capacity`);
  if (capacity > MAX_CAPACITY) throw new RangeError(`${name}.capacity超过上限。`);
  const keyPrefix = assertNonEmptyString(
    Object.hasOwn(value, 'keyPrefix')
      ? dataField(value, 'keyPrefix', name)
      : 'arena.v2-retention-observation.candidate.v1',
    `${name}.keyPrefix`,
  );
  const leaseDurationMs = assertIntegerAtLeast(
    Object.hasOwn(value, 'leaseDurationMs')
      ? dataField(value, 'leaseDurationMs', name)
      : 60_000,
    1_000,
    `${name}.leaseDurationMs`,
  );
  const leaseTakeoverSameOwner = Object.hasOwn(value, 'leaseTakeoverSameOwner')
    ? dataField(value, 'leaseTakeoverSameOwner', name)
    : false;
  if (typeof leaseTakeoverSameOwner !== 'boolean') {
    throw new TypeError(`${name}.leaseTakeoverSameOwner必须是boolean。`);
  }
  return Object.freeze({
    storage,
    ownerId,
    wallNow: wallNow as () => number,
    cohortSubjectId,
    capacity,
    keyPrefix,
    leaseDurationMs,
    leaseTakeoverSameOwner,
  });
}

function payload(value: StoredJournalPayloadV1): StoredJournalPayloadV1 {
  return cloneFrozenData(value, 'Arena V2 offline retention journal payload');
}

function envelope(value: StoredJournalPayloadV1): StoredJournalEnvelopeV1 {
  const normalized = payload(value);
  return Object.freeze({
    ...normalized,
    payloadHash: createDeterministicDataHash(
      normalized,
      'Arena V2 offline retention journal payload',
    ),
  });
}

function observationIdentityHash(
  observation: ArenaV2RetentionObservationV1,
): string {
  return createDeterministicDataHash(
    observation,
    'Arena V2 offline retention observation identity',
  );
}

function observationBatchIdentityHash(
  observations: readonly ArenaV2RetentionObservationV1[],
): string {
  return createDeterministicDataHash(
    observations,
    'Arena V2 offline retention observation batch identity',
  );
}

function normalizeObservationBatch(
  value: unknown,
): readonly ArenaV2RetentionObservationV1[] {
  const name = 'Arena V2 offline retention observation batch';
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${name}必须使用原生Array原型。`);
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  if (lengthDescriptor === undefined
    || Object.hasOwn(lengthDescriptor, 'get')
    || Object.hasOwn(lengthDescriptor, 'set')
    || !Object.hasOwn(lengthDescriptor, 'value')
    || !Number.isSafeInteger(lengthDescriptor.value)
    || lengthDescriptor.value < 1
    || lengthDescriptor.value > ARENA_V2_OFFLINE_RETENTION_OBSERVATION_BATCH_LIMIT_V1) {
    throw new RangeError(
      `${name}长度必须是1..${ARENA_V2_OFFLINE_RETENTION_OBSERVATION_BATCH_LIMIT_V1}。`,
    );
  }
  const length = lengthDescriptor.value as number;
  const expectedKeys = new Set<PropertyKey>(['length']);
  for (let index = 0; index < length; index += 1) expectedKeys.add(String(index));
  const keys = Reflect.ownKeys(value);
  if (keys.length !== expectedKeys.size || keys.some((key) => !expectedKeys.has(key))) {
    throw new TypeError(`${name}包含未知字段、Symbol或稀疏项。`);
  }
  const observations: ArenaV2RetentionObservationV1[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}[${index}]必须是可枚举数据字段。`);
    }
    observations.push(createArenaV2RetentionObservationV1(descriptor.value));
  }
  return Object.freeze(observations);
}

function emptyMetrics(): readonly StoredMetricV1[] {
  return Object.freeze(KIND_ORDER.map((kind) => Object.freeze({
    kind,
    denominatorKey: DENOMINATOR_BY_KIND[kind],
    numerator: 0,
    denominator: 0,
  })));
}

function incrementSafeInteger(value: number, increment: number, name: string): number {
  const next = value + increment;
  if (!Number.isSafeInteger(next)) throw new RangeError(`${name}溢出。`);
  return next;
}

function validateMetrics(value: unknown, observationCount: number): readonly StoredMetricV1[] {
  if (!Array.isArray(value)) {
    throw new RangeError('Arena V2 offline retention journal metrics目录不闭合。');
  }
  const expectedOrder = value.length === LEGACY_SIX_KIND_ORDER.length
    ? LEGACY_SIX_KIND_ORDER
    : value.length === LEGACY_SEVEN_KIND_ORDER.length
      ? LEGACY_SEVEN_KIND_ORDER
      : value.length === KIND_ORDER.length
        ? KIND_ORDER
        : null;
  if (expectedOrder === null) {
    throw new RangeError('Arena V2 offline retention journal metrics目录不闭合。');
  }
  const metrics = Object.freeze(value.map((entry, index) => {
    const name = `Arena V2 offline retention journal metrics[${index}]`;
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new TypeError(`${name}必须是对象。`);
    }
    assertKnownKeys(entry, METRIC_KEYS, name);
    for (const key of METRIC_KEYS) dataField(entry, key, name);
    const kind = dataField(entry, 'kind', name);
    const expectedKind = expectedOrder[index]!;
    if (kind !== expectedKind) throw new RangeError(`${name}.kind顺序漂移。`);
    const denominatorKey = dataField(entry, 'denominatorKey', name);
    if (denominatorKey !== DENOMINATOR_BY_KIND[expectedKind]) {
      throw new RangeError(`${name}.denominatorKey漂移。`);
    }
    const numerator = assertIntegerAtLeast(dataField(entry, 'numerator', name), 0, `${name}.numerator`);
    const denominator = assertIntegerAtLeast(
      dataField(entry, 'denominator', name),
      0,
      `${name}.denominator`,
    );
    if (numerator > denominator) throw new RangeError(`${name}分子不能大于分母。`);
    return Object.freeze({
      kind: expectedKind,
      denominatorKey: DENOMINATOR_BY_KIND[expectedKind],
      numerator,
      denominator,
    });
  }));
  const denominatorTotal = metrics.reduce((sum, metric) => sum + metric.denominator, 0);
  if (!Number.isSafeInteger(denominatorTotal) || denominatorTotal !== observationCount) {
    throw new RangeError('Arena V2 offline retention journal累计分母与观察数不一致。');
  }
  if (expectedOrder.length === KIND_ORDER.length) return metrics;
  return Object.freeze([
    ...metrics,
    ...KIND_ORDER.slice(expectedOrder.length).map((kind) => Object.freeze({
      kind,
      denominatorKey: DENOMINATOR_BY_KIND[kind],
      numerator: 0,
      denominator: 0,
    })),
  ]);
}

function validateEnvelope(
  value: unknown,
  cohortSubjectId: string,
  capacity: number,
): StoredJournalEnvelopeV1 {
  const rawSource = cloneFrozenData(value, 'Arena V2 offline retention journal envelope');
  const source = rawSource as unknown as Record<string, unknown>;
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    throw new TypeError('Arena V2 offline retention journal envelope必须是对象。');
  }
  assertKnownKeys(source, ENVELOPE_KEYS, 'Arena V2 offline retention journal envelope');
  for (const key of ENVELOPE_KEYS) dataField(source, key, 'Arena V2 offline retention journal envelope');
  if (source.schemaVersion !== 1 || source.status !== 'offline-only') {
    throw new RangeError('Arena V2 offline retention journal schema或状态不受支持。');
  }
  if (source.cohortSubjectId !== cohortSubjectId || source.capacity !== capacity) {
    throw new RangeError('Arena V2 offline retention journal身份或容量漂移。');
  }
  const revision = assertIntegerAtLeast(source.revision, 0, 'journal.revision');
  const latestSessionSequence = assertIntegerAtLeast(
    source.latestSessionSequence,
    0,
    'journal.latestSessionSequence',
  );
  const latestSessionEventSequence = assertIntegerAtLeast(
    source.latestSessionEventSequence,
    0,
    'journal.latestSessionEventSequence',
  );
  const observationCount = assertIntegerAtLeast(
    source.observationCount,
    0,
    'journal.observationCount',
  );
  const droppedObservationCount = assertIntegerAtLeast(
    source.droppedObservationCount,
    0,
    'journal.droppedObservationCount',
  );
  if (!Array.isArray(source.observations) || source.observations.length > capacity) {
    throw new RangeError('Arena V2 offline retention journal observations超出容量。');
  }
  if (observationCount !== droppedObservationCount + source.observations.length) {
    throw new RangeError('Arena V2 offline retention journal累计数量不闭合。');
  }
  if (revision !== observationCount) {
    throw new RangeError('Arena V2 offline retention journal revision与观察数不一致。');
  }
  const eventIds = new Set<string>();
  let previousSession = 0;
  let previousEventSequence = 0;
  let previousProfileRevision: number | null = null;
  const retainedDenominators = new Map<ArenaV2RetentionObservationKindV1, number>();
  const retainedNumerators = new Map<ArenaV2RetentionObservationKindV1, number>();
  const observations = Object.freeze(source.observations.map((entry, index) => {
    const observation = createArenaV2RetentionObservationV1(entry);
    if (observation.cohortSubjectId !== cohortSubjectId) {
      throw new RangeError('Arena V2 offline retention journal observation cohort漂移。');
    }
    if (eventIds.has(observation.eventId)) {
      throw new RangeError('Arena V2 offline retention journal eventId重复。');
    }
    eventIds.add(observation.eventId);
    if (index > 0) {
      const continuesSession = observation.sessionSequence === previousSession
        && observation.eventSequence === previousEventSequence + 1;
      const startsNextSession = observation.sessionSequence === previousSession + 1
        && observation.eventSequence === 1;
      if (!continuesSession && !startsNextSession) {
        throw new RangeError('Arena V2 offline retention journal observations不连续。');
      }
    }
    if (previousProfileRevision !== null
      && observation.profileRevision < previousProfileRevision) {
      throw new RangeError(
        'Arena V2 offline retention journal observation profileRevision回退。',
      );
    }
    retainedDenominators.set(
      observation.kind,
      (retainedDenominators.get(observation.kind) ?? 0) + 1,
    );
    retainedNumerators.set(
      observation.kind,
      (retainedNumerators.get(observation.kind) ?? 0) + observation.numeratorIncrement,
    );
    previousSession = observation.sessionSequence;
    previousEventSequence = observation.eventSequence;
    previousProfileRevision = observation.profileRevision;
    return observation;
  }));
  if (observations.length > 0) {
    const last = observations[observations.length - 1]!;
    if (last.sessionSequence !== latestSessionSequence
      || last.eventSequence !== latestSessionEventSequence) {
      throw new RangeError('Arena V2 offline retention journal末观察水位不一致。');
    }
  } else if (observationCount > 0 || latestSessionSequence !== 0
    || latestSessionEventSequence !== 0) {
    throw new RangeError('Arena V2 offline retention journal空窗口水位不一致。');
  }
  const sourceMetricCount = Array.isArray(source.metrics) ? source.metrics.length : -1;
  const legacyMetricEnvelope = sourceMetricCount === LEGACY_SIX_KIND_ORDER.length
    || sourceMetricCount === LEGACY_SEVEN_KIND_ORDER.length;
  const sourceKinds = new Set(KIND_ORDER.slice(0, Math.max(sourceMetricCount, 0)));
  if (legacyMetricEnvelope && observations.some(({ kind }) => !sourceKinds.has(kind))) {
    throw new RangeError('Arena V2 offline retention journal旧指标信封不得携带新指标观察。');
  }
  const metrics = validateMetrics(source.metrics, observationCount);
  for (const metric of metrics) {
    if ((retainedDenominators.get(metric.kind) ?? 0) > metric.denominator
      || (retainedNumerators.get(metric.kind) ?? 0) > metric.numerator) {
      throw new RangeError('Arena V2 offline retention journal累计指标小于保留窗口。');
    }
  }
  const normalizedPayload = payload({
    schemaVersion: 1,
    status: 'offline-only',
    cohortSubjectId,
    revision,
    capacity,
    latestSessionSequence,
    latestSessionEventSequence,
    observationCount,
    droppedObservationCount,
    metrics,
    observations,
  });
  const payloadForHash = legacyMetricEnvelope
    ? payload({
      schemaVersion: 1,
      status: 'offline-only',
      cohortSubjectId,
      revision,
      capacity,
      latestSessionSequence,
      latestSessionEventSequence,
      observationCount,
      droppedObservationCount,
      metrics: Object.freeze(metrics.slice(0, sourceMetricCount)),
      observations,
    })
    : normalizedPayload;
  const payloadHash = assertNonEmptyString(source.payloadHash, 'journal.payloadHash');
  if (payloadHash !== createDeterministicDataHash(
    payloadForHash,
    'Arena V2 offline retention journal payload',
  )) {
    throw new RangeError('Arena V2 offline retention journal payloadHash不一致。');
  }
  return legacyMetricEnvelope
    ? envelope(normalizedPayload)
    : Object.freeze({ ...normalizedPayload, payloadHash });
}

function initialEnvelope(
  cohortSubjectId: string,
  capacity: number,
): StoredJournalEnvelopeV1 {
  return envelope({
    schemaVersion: 1,
    status: 'offline-only',
    cohortSubjectId,
    revision: 0,
    capacity,
    latestSessionSequence: 0,
    latestSessionEventSequence: 0,
    observationCount: 0,
    droppedObservationCount: 0,
    metrics: emptyMetrics(),
    observations: Object.freeze([]),
  });
}

function report(metrics: readonly StoredMetricV1[], observationCount: number) {
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'offline-candidate-summary' as const,
    productionReady: false as const,
    longitudinalEvidence: 'not-run' as const,
    observationCount,
    distinctSubjectCount: observationCount === 0 ? 0 : 1,
    metrics: Object.freeze(metrics.map((metric) => Object.freeze({
      ...metric,
      ratio: metric.denominator === 0 ? null : metric.numerator / metric.denominator,
    }))),
  });
}

function exportBundle(
  source: StoredJournalEnvelopeV1,
): ArenaV2OfflineRetentionObservationExportBundleCandidateV1 {
  const value = Object.freeze({
    schemaVersion: 1 as const,
    status: 'offline-only-export' as const,
    sourceJournalSchemaVersion: source.schemaVersion,
    cohortSubjectId: source.cohortSubjectId,
    revision: source.revision,
    capacity: source.capacity,
    latestSessionSequence: source.latestSessionSequence,
    latestSessionEventSequence: source.latestSessionEventSequence,
    observationCount: source.observationCount,
    droppedObservationCount: source.droppedObservationCount,
    retainedObservationCount: source.observations.length,
    metrics: source.metrics,
    report: report(source.metrics, source.observationCount),
    observations: source.observations,
    sourcePayloadHash: source.payloadHash,
  });
  return Object.freeze({
    ...value,
    exportHash: createDeterministicDataHash(
      value,
      'Arena V2 offline retention observation export bundle',
    ),
  });
}

export class ArenaV2OfflineRetentionObservationJournalCandidateV1 {
  #storage: Readonly<SynchronousStoragePort> | null;
  #lease: SynchronousStorageLease | null;
  #journalKey: string | null;
  #cohortSubjectId: string | null;
  #capacity: number;
  #currentSessionSequence: number | null = null;
  #currentSessionEventSequence = 0;
  #envelope: StoredJournalEnvelopeV1;
  #pendingCollectIntent: PendingCollectIntentV1 | null = null;
  #lastCommittedCollectBatch: LastCommittedCollectBatchV1 | null = null;
  #lifecycle: 'created' | 'open' | 'failed' | 'destroyed' = 'created';
  #operation: OfflineRetentionObservationJournalOperationCandidateV1 | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: ArenaV2OfflineRetentionObservationJournalOptionsCandidateV1) {
    const options = normalizedOptions(value);
    const storage = createSynchronousStoragePort(options.storage, {
      label: 'Arena V2 Offline Retention Journal Storage',
    });
    this.#storage = storage;
    this.#journalKey = `${options.keyPrefix}.journal`;
    this.#cohortSubjectId = options.cohortSubjectId;
    this.#capacity = options.capacity;
    this.#envelope = initialEnvelope(options.cohortSubjectId, options.capacity);
    this.#lease = new SynchronousStorageLease({
      storage: options.storage,
      key: `${options.keyPrefix}.lease`,
      ownerId: options.ownerId,
      holderId: `${options.ownerId}.offline-retention-journal-holder`,
      wallNow: options.wallNow,
      durationMs: options.leaseDurationMs,
      takeoverSameOwner: options.leaseTakeoverSameOwner,
      label: 'Arena V2 Offline Retention Journal Lease',
    });
    Object.freeze(this);
  }

  #assertOpen(): void {
    if (this.#lifecycle !== 'open') {
      throw new Error(`Arena V2 offline retention journal状态${this.#lifecycle}不可写。`);
    }
  }

  #rejectReentry(
    operation: OfflineRetentionObservationJournalOperationCandidateV1,
  ): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `Arena V2 offline retention journal操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw error;
  }

  #runOperation<T>(
    operation: OfflineRetentionObservationJournalOperationCandidateV1,
    callback: () => T,
  ): T {
    if (this.#operation !== null) this.#rejectReentry(operation);
    this.#operation = operation;
    this.#reentryError = null;
    try {
      return callback();
    } finally {
      this.#operation = null;
    }
  }

  #assertReentryFree(sequence: number, operation: string): void {
    if (this.#reentrySequence === sequence) return;
    const error = new Error(
      `Arena V2 offline retention journal ${operation}期间发生回调重入。`,
    );
    if (this.#reentryError !== null) error.cause = this.#reentryError;
    throw error;
  }

  #callChecked<T>(sequence: number, operation: string, callback: () => T): T {
    try {
      const result = callback();
      this.#assertReentryFree(sequence, operation);
      return result;
    } catch (error) {
      this.#assertReentryFree(sequence, operation);
      throw error;
    }
  }

  #storageValue(): Readonly<SynchronousStoragePort> {
    if (this.#storage === null) throw new Error('Arena V2 offline retention journal已销毁。');
    return this.#storage;
  }

  #leaseValue(): SynchronousStorageLease {
    if (this.#lease === null) throw new Error('Arena V2 offline retention journal已销毁。');
    return this.#lease;
  }

  #readStoredFromPort(): StoredJournalEnvelopeV1 | null {
    if (this.#journalKey === null || this.#cohortSubjectId === null) {
      throw new Error('Arena V2 offline retention journal已销毁。');
    }
    const read = this.#storageValue().read(this.#journalKey);
    if (!read.ok) throw new Error('Arena V2 offline retention journal读取失败。');
    return read.found
      ? validateEnvelope(read.value, this.#cohortSubjectId, this.#capacity)
      : null;
  }

  #readExclusiveCurrent(sequence: number): StoredJournalEnvelopeV1 {
    const lease = this.#leaseValue();
    const renewed = this.#callChecked(sequence, '租约续租', () => lease.renew());
    const acquired = renewed
      ? true
      : this.#callChecked(sequence, '租约取得', () => lease.acquire());
    if (!acquired) {
      throw new Error('Arena V2 offline retention journal租约不可用。');
    }
    const stored = this.#callChecked(
      sequence,
      '当前Journal读取',
      () => this.#readStoredFromPort(),
    );
    if (stored === null) {
      throw new Error('Arena V2 offline retention journal持久状态意外缺失。');
    }
    return stored;
  }

  #writeConfirmed(next: StoredJournalEnvelopeV1, sequence: number): void {
    if (this.#journalKey === null) {
      throw new Error('Arena V2 offline retention journal已销毁。');
    }
    let writeAccepted = false;
    let writeError: unknown = null;
    try {
      writeAccepted = this.#callChecked(
        sequence,
        'Journal写入',
        () => this.#storageValue().write(this.#journalKey!, next),
      );
    } catch (error) {
      writeError = error;
      this.#assertReentryFree(sequence, 'Journal写入');
    }
    let confirmed: StoredJournalEnvelopeV1 | null = null;
    let readError: unknown = null;
    try {
      confirmed = this.#callChecked(
        sequence,
        '写入确认读取',
        () => this.#readStoredFromPort(),
      );
    } catch (error) {
      readError = error;
      this.#assertReentryFree(sequence, '写入确认读取');
    }
    if (confirmed !== null && confirmed.payloadHash === next.payloadHash) {
      this.#assertReentryFree(sequence, '写入确认');
      return;
    }
    this.#assertReentryFree(sequence, '写入确认');
    if (readError instanceof Error) throw readError;
    if (readError !== null) {
      throw new Error(`Arena V2 offline retention journal写后读回失败：${String(readError)}`);
    }
    if (writeError instanceof Error) throw writeError;
    if (writeError !== null) throw new Error(`Arena V2 offline retention journal写入失败：${String(writeError)}`);
    if (!writeAccepted) throw new Error('Arena V2 offline retention journal写入未被存储端接受。');
    throw new Error('Arena V2 offline retention journal写后读回不一致。');
  }

  #createPendingCollectIntent(
    observation: ArenaV2RetentionObservationV1,
  ): PendingCollectIntentV1 {
    return this.#createPendingCollectBatchIntent(Object.freeze([observation]));
  }

  #createPendingCollectBatchIntent(
    batch: readonly ArenaV2RetentionObservationV1[],
  ): PendingCollectIntentV1 {
    const baseEnvelope = this.#envelope;
    const observations = [...baseEnvelope.observations];
    let droppedObservationCount = baseEnvelope.droppedObservationCount;
    let metrics = baseEnvelope.metrics;
    for (const observation of batch) {
      observations.push(observation);
      if (observations.length > this.#capacity) {
        observations.shift();
        droppedObservationCount = incrementSafeInteger(
          droppedObservationCount,
          1,
          'Arena V2 offline retention journal droppedObservationCount',
        );
      }
      metrics = Object.freeze(metrics.map((metric) => (
        metric.kind === observation.kind
          ? Object.freeze({
            ...metric,
            numerator: incrementSafeInteger(
              metric.numerator,
              observation.numeratorIncrement,
              `Arena V2 offline retention ${metric.kind} numerator`,
            ),
            denominator: incrementSafeInteger(
              metric.denominator,
              1,
              `Arena V2 offline retention ${metric.kind} denominator`,
            ),
          })
          : metric
      )));
    }
    const observation = batch.at(-1)!;
    const intendedEnvelope = envelope({
      schemaVersion: 1,
      status: 'offline-only',
      cohortSubjectId: observation.cohortSubjectId,
      revision: incrementSafeInteger(
        baseEnvelope.revision,
        batch.length,
        'Arena V2 offline retention journal revision',
      ),
      capacity: this.#capacity,
      latestSessionSequence: observation.sessionSequence,
      latestSessionEventSequence: observation.eventSequence,
      observationCount: incrementSafeInteger(
        baseEnvelope.observationCount,
        batch.length,
        'Arena V2 offline retention journal observationCount',
      ),
      droppedObservationCount,
      metrics,
      observations: Object.freeze(observations),
    });
    return Object.freeze({
      baseEnvelope,
      observations: batch,
      observationBatchIdentityHash: observationBatchIdentityHash(batch),
      observation,
      observationIdentityHash: observationIdentityHash(observation),
      intendedEnvelope,
    });
  }

  #acknowledgeLastCommittedObservationRetry(
    observation: ArenaV2RetentionObservationV1,
    sequence: number,
  ): void {
    this.#acknowledgeLastCommittedObservationBatchRetry(
      Object.freeze([observation]),
      sequence,
    );
  }

  #acknowledgeLastCommittedObservationBatchRetry(
    observations: readonly ArenaV2RetentionObservationV1[],
    sequence: number,
  ): void {
    const currentSessionSequence = this.#currentSessionSequence;
    const currentEventSequence = this.#currentSessionEventSequence;
    const committed = this.#lastCommittedCollectBatch;
    const first = observations[0]!;
    const latest = observations.at(-1)!;
    const retained = this.#envelope.observations.slice(-observations.length);
    if (currentSessionSequence === null
      || currentEventSequence < 1
      || committed === null
      || retained.length !== observations.length
      || this.#envelope.latestSessionSequence !== currentSessionSequence
      || this.#envelope.latestSessionEventSequence !== currentEventSequence
      || first.eventSequence !== committed.firstEventSequence
      || latest.eventSequence !== committed.lastEventSequence
      || latest.eventSequence !== currentEventSequence
      || latest.cohortSubjectId !== this.#cohortSubjectId
      || latest.sessionSequence !== currentSessionSequence
      || observations.length !== committed.observations.length) {
      throw new RangeError(
        'Arena V2 offline retention journal最后已提交观察批身份无法闭合。',
      );
    }
    const retryIdentityHash = observationBatchIdentityHash(observations);
    const retainedIdentityHash = observationBatchIdentityHash(retained);
    if (retryIdentityHash !== committed.observationBatchIdentityHash
      || retainedIdentityHash !== committed.observationBatchIdentityHash
      || observations.some((observation, index) => (
        observation.eventId !== retained[index]!.eventId
        || observation.sessionSequence !== retained[index]!.sessionSequence
        || observation.eventSequence !== retained[index]!.eventSequence
      ))) {
      throw new RangeError(
        'Arena V2 offline retention journal同水位确认必须重试最后同一观察或原子批。',
      );
    }
    this.#assertReentryFree(sequence, '最后已提交观察批确认');
  }

  #assertPendingCollectObservation(
    pending: PendingCollectIntentV1,
    observation: ArenaV2RetentionObservationV1,
  ): void {
    this.#assertPendingCollectBatch(pending, Object.freeze([observation]));
  }

  #assertPendingCollectBatch(
    pending: PendingCollectIntentV1,
    observations: readonly ArenaV2RetentionObservationV1[],
  ): void {
    const first = observations[0]!;
    const latest = observations.at(-1)!;
    if (observations.length !== pending.observations.length
      || observationBatchIdentityHash(observations)
        !== pending.observationBatchIdentityHash
      || first.eventId !== pending.observations[0]!.eventId
      || first.eventSequence !== pending.observations[0]!.eventSequence
      || latest.eventId !== pending.observation.eventId
      || latest.sessionSequence !== pending.observation.sessionSequence
      || latest.eventSequence !== pending.observation.eventSequence) {
      throw new RangeError(
        'Arena V2 offline retention journal存在未决collect时只能重试同一冻结observation或原子批。',
      );
    }
  }

  #commitPendingCollectIntent(
    pending: PendingCollectIntentV1,
    sequence: number,
  ): void {
    if (this.#pendingCollectIntent !== pending) {
      throw new Error('Arena V2 offline retention journal待提交collect intent身份漂移。');
    }
    const localIsBase = this.#envelope.payloadHash === pending.baseEnvelope.payloadHash;
    const localIsIntended = this.#envelope.payloadHash
      === pending.intendedEnvelope.payloadHash;
    const firstObservation = pending.observations[0]!;
    if ((!localIsBase && !localIsIntended)
      || this.#currentSessionSequence !== pending.observation.sessionSequence
      || (localIsBase
        ? this.#currentSessionEventSequence + 1 !== firstObservation.eventSequence
          || this.#currentSessionEventSequence + pending.observations.length
            !== pending.observation.eventSequence
        : this.#currentSessionEventSequence !== pending.observation.eventSequence)) {
      throw new RangeError('Arena V2 offline retention journal待提交collect本地水位漂移。');
    }
    this.#assertReentryFree(sequence, '观察写入发布');
    if (localIsBase) {
      this.#envelope = pending.intendedEnvelope;
      this.#currentSessionEventSequence = pending.observation.eventSequence;
    }
    this.#lastCommittedCollectBatch = Object.freeze({
      observations: pending.observations,
      observationBatchIdentityHash: pending.observationBatchIdentityHash,
      firstEventSequence: firstObservation.eventSequence,
      lastEventSequence: pending.observation.eventSequence,
    });
    this.#pendingCollectIntent = null;
  }

  #reconcilePendingCollectIntent(
    pending: PendingCollectIntentV1,
    sequence: number,
  ): void {
    if (this.#pendingCollectIntent !== pending) {
      throw new Error('Arena V2 offline retention journal待重试collect intent身份漂移。');
    }
    const localIsBase = this.#envelope.payloadHash === pending.baseEnvelope.payloadHash;
    const localIsIntended = this.#envelope.payloadHash
      === pending.intendedEnvelope.payloadHash;
    if (!localIsBase && !localIsIntended) {
      throw new Error('Arena V2 offline retention journal待重试collect本地状态未知。');
    }
    const stored = this.#readExclusiveCurrent(sequence);
    if (stored.payloadHash === pending.intendedEnvelope.payloadHash) {
      this.#commitPendingCollectIntent(pending, sequence);
      return;
    }
    if (stored.payloadHash !== pending.baseEnvelope.payloadHash || localIsIntended) {
      throw new Error('Arena V2 offline retention journal本地/持久状态组合无法安全恢复。');
    }
    this.#writeConfirmed(pending.intendedEnvelope, sequence);
    this.#commitPendingCollectIntent(pending, sequence);
  }

  open(): ArenaV2OfflineRetentionObservationJournalSnapshotCandidateV1 {
    return this.#runOperation('open', () => {
      if (this.#lifecycle !== 'created') {
        throw new Error(`Arena V2 offline retention journal状态${this.#lifecycle}不能open。`);
      }
      const sequence = this.#reentrySequence;
      try {
        const acquired = this.#callChecked(
          sequence,
          '打开租约取得',
          () => this.#leaseValue().acquire(),
        );
        if (!acquired) {
          throw new Error('Arena V2 offline retention journal已被其他owner持有。');
        }
        const stored = this.#callChecked(
          sequence,
          '打开Journal读取',
          () => this.#readStoredFromPort(),
        );
        if (stored === null) {
          this.#writeConfirmed(this.#envelope, sequence);
        } else {
          this.#envelope = stored;
        }
        this.#assertReentryFree(sequence, '打开提交');
        const nextSessionSequence = this.#envelope.latestSessionSequence + 1;
        if (!Number.isSafeInteger(nextSessionSequence)) {
          throw new RangeError('Arena V2 offline retention journal sessionSequence溢出。');
        }
        this.#currentSessionSequence = nextSessionSequence;
        this.#currentSessionEventSequence = 0;
        this.#lifecycle = 'open';
        return this.#snapshot();
      } catch (error) {
        this.#lifecycle = 'failed';
        try { this.#leaseValue().release(); } catch {
          // The original open failure remains authoritative unless cleanup also reenters.
        }
        this.#assertReentryFree(sequence, '打开失败清理');
        throw error;
      }
    });
  }

  getCollector(): ArenaV2OfflineRetentionObservationCollectorCandidateV1 {
    return this.#runOperation('collector-read', () => {
      if (this.#lifecycle !== 'open' || this.#cohortSubjectId === null
        || this.#currentSessionSequence === null) {
        throw new Error('Arena V2 offline retention journal尚未打开。');
      }
      const cohortSubjectId = this.#cohortSubjectId;
      const sessionSequence = this.#currentSessionSequence;
      return Object.freeze({
        schemaVersion: 1 as const,
        status: 'offline-only' as const,
        cohortSubjectId,
        sessionSequence,
        collect: (observation: ArenaV2RetentionObservationV1): void => {
          this.collect(observation);
        },
        collectBatch: (
          observations: readonly ArenaV2RetentionObservationV1[],
        ): void => {
          this.collectBatch(observations);
        },
      });
    });
  }

  #collectObservationBatch(
    observations: readonly ArenaV2RetentionObservationV1[],
    sequence: number,
  ): void {
    const pendingCollectIntent = this.#pendingCollectIntent;
    if (pendingCollectIntent !== null) {
      if (observations.length === 1) {
        this.#assertPendingCollectObservation(pendingCollectIntent, observations[0]!);
      } else {
        this.#assertPendingCollectBatch(pendingCollectIntent, observations);
      }
      this.#reconcilePendingCollectIntent(pendingCollectIntent, sequence);
      return;
    }
    if (observations.some((observation) => (
      observation.cohortSubjectId !== this.#cohortSubjectId
      || observation.sessionSequence !== this.#currentSessionSequence
    ))) {
      throw new RangeError('Arena V2 offline retention observation身份或session漂移。');
    }
    const latest = observations.at(-1)!;
    if (latest.eventSequence === this.#currentSessionEventSequence) {
      if (observations.length === 1) {
        this.#acknowledgeLastCommittedObservationRetry(observations[0]!, sequence);
      } else {
        this.#acknowledgeLastCommittedObservationBatchRetry(observations, sequence);
      }
      return;
    }
    let previousProfileRevision = this.#envelope.observations.at(-1)?.profileRevision ?? null;
    for (let index = 0; index < observations.length; index += 1) {
      const observation = observations[index]!;
      const expectedEventSequence = this.#currentSessionEventSequence + index + 1;
      if (!Number.isSafeInteger(expectedEventSequence)) {
        throw new RangeError('Arena V2 offline retention observation eventSequence溢出。');
      }
      if (observation.eventSequence !== expectedEventSequence) {
        throw new RangeError('Arena V2 offline retention observation eventSequence不连续。');
      }
      if (previousProfileRevision !== null
        && observation.profileRevision < previousProfileRevision) {
        throw new RangeError(
          'Arena V2 offline retention observation profileRevision不能回退。',
        );
      }
      previousProfileRevision = observation.profileRevision;
    }
    const pending = observations.length === 1
      ? this.#createPendingCollectIntent(observations[0]!)
      : this.#createPendingCollectBatchIntent(observations);
    this.#assertReentryFree(sequence, 'collect intent冻结');
    this.#pendingCollectIntent = pending;
    this.#reconcilePendingCollectIntent(pending, sequence);
  }

  collect(value: unknown): void {
    this.#runOperation('collect', () => {
      this.#assertOpen();
      const sequence = this.#reentrySequence;
      const observation = createArenaV2RetentionObservationV1(value);
      this.#assertReentryFree(sequence, '观察输入规范化');
      this.#collectObservationBatch(Object.freeze([observation]), sequence);
    });
  }

  collectBatch(value: unknown): void {
    this.#runOperation('collect-batch', () => {
      this.#assertOpen();
      const sequence = this.#reentrySequence;
      const observations = normalizeObservationBatch(value);
      this.#assertReentryFree(sequence, '观察批输入规范化');
      this.#collectObservationBatch(observations, sequence);
    });
  }

  getSnapshot(): ArenaV2OfflineRetentionObservationJournalSnapshotCandidateV1 {
    return this.#runOperation('snapshot-read', () => {
      if (this.#pendingCollectIntent !== null) {
        throw new Error(
          'Arena V2 offline retention journal存在未决collect，不能发布snapshot。',
        );
      }
      return this.#snapshot();
    });
  }

  #snapshot(): ArenaV2OfflineRetentionObservationJournalSnapshotCandidateV1 {
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      lifecycle: this.#lifecycle,
      cohortSubjectId: this.#cohortSubjectId,
      sessionSequence: this.#currentSessionSequence,
      revision: this.#envelope.revision,
      capacity: this.#capacity,
      observationCount: this.#envelope.observationCount,
      droppedObservationCount: this.#envelope.droppedObservationCount,
      retainedObservationCount: this.#envelope.observations.length,
      report: report(this.#envelope.metrics, this.#envelope.observationCount),
      observations: this.#envelope.observations,
    });
  }

  getExportBundle(): ArenaV2OfflineRetentionObservationExportBundleCandidateV1 {
    return this.#runOperation('export-read', () => {
      if (this.#pendingCollectIntent !== null) {
        throw new Error(
          'Arena V2 offline retention journal存在未决collect，不能发布export。',
        );
      }
      if (this.#lifecycle !== 'open' && this.#lifecycle !== 'failed') {
        throw new Error(`Arena V2 offline retention journal状态${this.#lifecycle}不能导出。`);
      }
      return exportBundle(this.#envelope);
    });
  }

  destroy(): void {
    this.#runOperation('destroy', () => {
      if (this.#lifecycle === 'destroyed') return;
      const sequence = this.#reentrySequence;
      const pendingCollectIntent = this.#pendingCollectIntent;
      if (pendingCollectIntent !== null) {
        this.#reconcilePendingCollectIntent(pendingCollectIntent, sequence);
      }
      this.#lifecycle = 'failed';
      try {
        this.#leaseValue().destroy();
      } catch (error) {
        this.#assertReentryFree(sequence, '销毁');
        throw error;
      }
      this.#lease = null;
      this.#storage = null;
      this.#journalKey = null;
      this.#cohortSubjectId = null;
      this.#currentSessionSequence = null;
      this.#currentSessionEventSequence = 0;
      this.#lastCommittedCollectBatch = null;
      this.#lifecycle = 'destroyed';
      this.#assertReentryFree(sequence, '销毁发布');
    });
  }
}
