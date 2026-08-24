import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
  createSynchronousStoragePort,
  type SynchronousStoragePort,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
  type ArenaV2LearningProfileV1,
} from '@number-strategy-jump/arena-profile-contracts';
import { SynchronousStorageLease } from '@number-strategy-jump/arena-storage';
import {
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1,
  ARENA_V2_RETENTION_IDENTIFIER_MAX_LENGTH_V1,
  createArenaV2RetentionObservationV1,
  type ArenaV2RetentionObservationV1,
} from './arena-v2-retention-observation-v1.js';
import {
  createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1,
  projectArenaV2WeaponResearchCatalogProgressCandidateV1,
  projectArenaV2WeaponResearchPaceCalibrationFromAccumulatedEvidenceCandidateV1,
  type ArenaV2WeaponResearchPaceCalibrationWindowCandidateV1,
} from './arena-v2-weapon-research-pace-calibration-candidate-v1.js';

export const ARENA_V2_OFFLINE_WEAPON_RESEARCH_PACE_BASELINE_STORE_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultEntryWired: false as const,
    storesWallClockTime: false as const,
    performsNetworkUpload: false as const,
    baselineWriteUsesExclusiveLease: true as const,
    sameOwnerTakeoverUsesDistinctLeaseHolderIdentity: true as const,
    leaseReleasedAfterInitialization: true as const,
    leaseReleasedAfterEverySynchronization: true as const,
    writeRequiresReadBackConfirmation: true as const,
    storedPayloadUsesDeterministicHash: true as const,
    futureSchemaFailsClosed: true as const,
    definitionIdVersionAndContentHashBound: true as const,
    baselineProfileIdentityAndHashBound: true as const,
    sourceJournalWatermarkBound: true as const,
    equalJournalWatermarkRequiresExactPayloadHash: true as const,
    compactSettlementEvidenceSurvivesJournalTailEviction: true as const,
    compactEvidenceStoresOnlyCountsAndAuthorityTicks: true as const,
    compactEvidenceUsesTheSharedWeaponPaceProjection: true as const,
    catalogCompletionFreezesPaceEvidence: true as const,
    postCompletionMatchesDoNotDiluteCollectionDuration: true as const,
    ambiguousCompletionBoundaryFailsClosed: true as const,
    storageRollbackFailsClosed: true as const,
    ownerIntegrationReadContainsBaselineProfile: true as const,
    browserDiagnosticSnapshotExposesRawProfile: false as const,
    validationStatus: 'not-run' as const,
  });

export interface ArenaV2OfflineWeaponResearchPaceBaselineStoreOptionsCandidateV1 {
  readonly storage: unknown;
  readonly ownerId: unknown;
  readonly wallNow: unknown;
  readonly cohortSubjectId: unknown;
  readonly keyPrefix?: unknown;
  readonly leaseDurationMs?: unknown;
  readonly leaseTakeoverSameOwner?: unknown;
}

export interface ArenaV2OfflineWeaponResearchPaceBaselineOpenInputCandidateV1 {
  readonly profileDefinition: unknown;
  readonly currentProfile: unknown;
  readonly sourceJournalRevision: unknown;
  readonly sourceJournalPayloadHash: unknown;
  readonly sourceJournalObservationCount: unknown;
  readonly sourceJournalDroppedObservationCount: unknown;
  readonly sourceJournalLatestProfileRevision: unknown;
  readonly sourceJournalObservations: unknown;
}

export interface ArenaV2OfflineWeaponResearchPaceBaselineReadCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'offline-weapon-research-pace-baseline-read';
  readonly source: 'created' | 'persisted';
  readonly baselineProfileRevision: number;
  readonly sourceJournalRevision: number;
  readonly sourceJournalPayloadHash: string;
  readonly sourceJournalObservationCount: number;
  readonly sourceJournalDroppedObservationCount: number;
  readonly sourceJournalLatestProfileRevision: number | null;
  readonly checkpointJournalRevision: number;
  readonly checkpointJournalPayloadHash: string;
  readonly checkpointJournalObservationCount: number;
  readonly checkpointJournalDroppedObservationCount: number;
  readonly checkpointJournalLatestProfileRevision: number | null;
  readonly accumulatedThroughProfileRevision: number;
  readonly accumulatedMainResearchPoints: number;
  readonly catalogCompletionProfileRevision: number | null;
  readonly accumulatedSettlementCount: number;
  readonly accumulatedMeasuredSettlementCount: number;
  readonly accumulatedMissingAuthorityDurationCount: number;
  readonly accumulatedAuthorityTicks: number;
  readonly window: ArenaV2WeaponResearchPaceCalibrationWindowCandidateV1;
  readonly profileDefinition: ReturnType<
    typeof createArenaV2LearningProfileDefinitionV1
  >;
  readonly baselineProfile: ArenaV2LearningProfileV1;
}

interface StoredBaselinePayloadCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'offline-weapon-research-pace-baseline';
  readonly cohortSubjectId: string;
  readonly profileDefinitionId: string;
  readonly profileDefinitionContentVersion: number;
  readonly profileDefinitionContentHash: string;
  readonly baselineProfileRevision: number;
  readonly baselineProfileHash: string;
  readonly baselineProfile: ArenaV2LearningProfileV1;
  readonly windowIdentityHash: string;
  readonly sourceJournalRevision: number;
  readonly sourceJournalPayloadHash: string;
  readonly sourceJournalObservationCount: number;
  readonly sourceJournalDroppedObservationCount: number;
  readonly sourceJournalLatestProfileRevision: number | null;
  readonly checkpointJournalRevision: number;
  readonly checkpointJournalPayloadHash: string;
  readonly checkpointJournalObservationCount: number;
  readonly checkpointJournalDroppedObservationCount: number;
  readonly checkpointJournalLatestProfileRevision: number | null;
  readonly accumulatedThroughProfileRevision: number;
  readonly accumulatedMainResearchPoints: number;
  readonly catalogCompletionProfileRevision: number | null;
  readonly accumulatedSettlementCount: number;
  readonly accumulatedMeasuredSettlementCount: number;
  readonly accumulatedMissingAuthorityDurationCount: number;
  readonly accumulatedAuthorityTicks: number;
}

interface StoredBaselineEnvelopeCandidateV1 extends StoredBaselinePayloadCandidateV1 {
  readonly payloadHash: string;
}

type BaselineStoreOperationCandidateV1 =
  | 'open'
  | 'synchronize'
  | 'read'
  | 'project'
  | 'destroy';

const OPTION_KEYS = new Set([
  'storage', 'ownerId', 'wallNow', 'cohortSubjectId', 'keyPrefix',
  'leaseDurationMs', 'leaseTakeoverSameOwner',
]);
const REQUIRED_OPTION_KEYS = Object.freeze([
  'storage', 'ownerId', 'wallNow', 'cohortSubjectId',
] as const);
const OPEN_INPUT_KEYS = new Set([
  'profileDefinition', 'currentProfile', 'sourceJournalRevision',
  'sourceJournalPayloadHash', 'sourceJournalObservationCount',
  'sourceJournalDroppedObservationCount', 'sourceJournalLatestProfileRevision',
  'sourceJournalObservations',
]);
const ENVELOPE_KEYS = new Set([
  'schemaVersion', 'status', 'cohortSubjectId', 'profileDefinitionId',
  'profileDefinitionContentVersion', 'profileDefinitionContentHash',
  'baselineProfileRevision', 'baselineProfileHash', 'baselineProfile',
  'windowIdentityHash', 'sourceJournalRevision', 'sourceJournalPayloadHash',
  'sourceJournalObservationCount', 'sourceJournalDroppedObservationCount',
  'sourceJournalLatestProfileRevision', 'payloadHash',
  'checkpointJournalRevision', 'checkpointJournalPayloadHash',
  'checkpointJournalObservationCount', 'checkpointJournalDroppedObservationCount',
  'checkpointJournalLatestProfileRevision', 'accumulatedThroughProfileRevision',
  'accumulatedMainResearchPoints', 'catalogCompletionProfileRevision',
  'accumulatedSettlementCount', 'accumulatedMeasuredSettlementCount',
  'accumulatedMissingAuthorityDurationCount', 'accumulatedAuthorityTicks',
]);
const DEFAULT_KEY_PREFIX = 'arena.v2-retention-observation.candidate.v1';

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是对象。`);
  }
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}缺少${key}。`);
    dataField(value, key, name);
  }
  return value as Record<string, unknown>;
}

function normalizedOptions(value: unknown): Readonly<{
  storage: unknown;
  ownerId: string;
  wallNow: () => number;
  cohortSubjectId: string;
  keyPrefix: string;
  leaseDurationMs: number;
  leaseTakeoverSameOwner: boolean;
}> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2离线武器研究节奏基线Store options必须是对象。');
  }
  const name = 'Arena V2离线武器研究节奏基线Store options';
  assertKnownKeys(value, OPTION_KEYS, name);
  for (const key of REQUIRED_OPTION_KEYS) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  for (const key of Object.keys(value)) dataField(value, key, name);
  const cohortSubjectId = assertNonEmptyString(
    dataField(value, 'cohortSubjectId', name),
    `${name}.cohortSubjectId`,
  );
  if (cohortSubjectId.length > ARENA_V2_RETENTION_IDENTIFIER_MAX_LENGTH_V1) {
    throw new RangeError(`${name}.cohortSubjectId超过留存身份长度上限。`);
  }
  const wallNow = dataField(value, 'wallNow', name);
  if (typeof wallNow !== 'function') throw new TypeError(`${name}.wallNow必须是函数。`);
  const leaseTakeoverSameOwner = Object.hasOwn(value, 'leaseTakeoverSameOwner')
    ? dataField(value, 'leaseTakeoverSameOwner', name)
    : false;
  if (typeof leaseTakeoverSameOwner !== 'boolean') {
    throw new TypeError(`${name}.leaseTakeoverSameOwner必须是boolean。`);
  }
  return Object.freeze({
    storage: dataField(value, 'storage', name),
    ownerId: assertNonEmptyString(dataField(value, 'ownerId', name), `${name}.ownerId`),
    wallNow: wallNow as () => number,
    cohortSubjectId,
    keyPrefix: assertNonEmptyString(
      Object.hasOwn(value, 'keyPrefix')
        ? dataField(value, 'keyPrefix', name)
        : DEFAULT_KEY_PREFIX,
      `${name}.keyPrefix`,
    ),
    leaseDurationMs: assertIntegerAtLeast(
      Object.hasOwn(value, 'leaseDurationMs')
        ? dataField(value, 'leaseDurationMs', name)
        : 60_000,
      1_000,
      `${name}.leaseDurationMs`,
    ),
    leaseTakeoverSameOwner,
  });
}

function nullableRevision(value: unknown, name: string): number | null {
  return value === null ? null : assertIntegerAtLeast(value, 0, name);
}

function normalizedOpenInput(value: unknown): Readonly<{
  profileDefinition: ReturnType<typeof createArenaV2LearningProfileDefinitionV1>;
  currentProfile: ArenaV2LearningProfileV1;
  sourceJournalRevision: number;
  sourceJournalPayloadHash: string;
  sourceJournalObservationCount: number;
  sourceJournalDroppedObservationCount: number;
  sourceJournalLatestProfileRevision: number | null;
  sourceJournalObservations: readonly ArenaV2RetentionObservationV1[];
}> {
  const name = 'Arena V2离线武器研究节奏基线Store open input';
  const source = exactRecord(value, OPEN_INPUT_KEYS, name);
  const profileDefinition = createArenaV2LearningProfileDefinitionV1(
    source.profileDefinition,
  );
  const currentProfile = createArenaV2LearningProfileV1(
    profileDefinition,
    source.currentProfile,
  );
  const sourceJournalRevision = assertIntegerAtLeast(
    source.sourceJournalRevision,
    0,
    `${name}.sourceJournalRevision`,
  );
  const sourceJournalObservationCount = assertIntegerAtLeast(
    source.sourceJournalObservationCount,
    0,
    `${name}.sourceJournalObservationCount`,
  );
  if (sourceJournalRevision !== sourceJournalObservationCount) {
    throw new RangeError(`${name}的Journal revision与观察数不一致。`);
  }
  const sourceJournalDroppedObservationCount = assertIntegerAtLeast(
    source.sourceJournalDroppedObservationCount,
    0,
    `${name}.sourceJournalDroppedObservationCount`,
  );
  if (sourceJournalDroppedObservationCount > sourceJournalObservationCount) {
    throw new RangeError(`${name}的Journal丢弃数超过观察数。`);
  }
  const sourceJournalLatestProfileRevision = nullableRevision(
    source.sourceJournalLatestProfileRevision,
    `${name}.sourceJournalLatestProfileRevision`,
  );
  if ((sourceJournalObservationCount === 0)
    !== (sourceJournalLatestProfileRevision === null)) {
    throw new RangeError(`${name}的Journal末Profile水位与观察数不一致。`);
  }
  if (sourceJournalLatestProfileRevision !== null
    && sourceJournalLatestProfileRevision > currentProfile.revision) {
    throw new RangeError(`${name}的Journal Profile水位领先当前Profile。`);
  }
  if (!Array.isArray(source.sourceJournalObservations)) {
    throw new TypeError(`${name}.sourceJournalObservations必须是数组。`);
  }
  const sourceJournalObservations = Object.freeze(
    source.sourceJournalObservations.map(createArenaV2RetentionObservationV1),
  );
  if (sourceJournalObservations.length
      !== sourceJournalObservationCount - sourceJournalDroppedObservationCount
    || (sourceJournalObservations.at(-1)?.profileRevision ?? null)
      !== sourceJournalLatestProfileRevision) {
    throw new RangeError(`${name}的Journal保留窗口与累计水位不一致。`);
  }
  return Object.freeze({
    profileDefinition,
    currentProfile,
    sourceJournalRevision,
    sourceJournalPayloadHash: assertNonEmptyString(
      source.sourceJournalPayloadHash,
      `${name}.sourceJournalPayloadHash`,
    ),
    sourceJournalObservationCount,
    sourceJournalDroppedObservationCount,
    sourceJournalLatestProfileRevision,
    sourceJournalObservations,
  });
}

function payload(value: StoredBaselinePayloadCandidateV1): StoredBaselinePayloadCandidateV1 {
  return cloneFrozenData(value, 'Arena V2离线武器研究节奏基线payload');
}

function envelope(
  value: StoredBaselinePayloadCandidateV1,
): StoredBaselineEnvelopeCandidateV1 {
  const normalized = payload(value);
  return Object.freeze({
    ...normalized,
    payloadHash: createDeterministicDataHash(
      normalized,
      'Arena V2离线武器研究节奏基线payload',
    ),
  });
}

function createEnvelope(
  cohortSubjectId: string,
  input: ReturnType<typeof normalizedOpenInput>,
): StoredBaselineEnvelopeCandidateV1 {
  const catalogProgress = projectArenaV2WeaponResearchCatalogProgressCandidateV1({
    profileDefinition: input.profileDefinition,
    profile: input.currentProfile,
  });
  const window = createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1({
    profileDefinition: input.profileDefinition,
    baselineProfile: input.currentProfile,
    cohortSubjectId,
  });
  return envelope({
    schemaVersion: 1,
    status: 'offline-weapon-research-pace-baseline',
    cohortSubjectId,
    profileDefinitionId: window.profileDefinitionId,
    profileDefinitionContentVersion: window.profileDefinitionContentVersion,
    profileDefinitionContentHash: window.profileDefinitionContentHash,
    baselineProfileRevision: window.baselineProfileRevision,
    baselineProfileHash: window.baselineProfileHash,
    baselineProfile: input.currentProfile,
    windowIdentityHash: window.windowIdentityHash,
    sourceJournalRevision: input.sourceJournalRevision,
    sourceJournalPayloadHash: input.sourceJournalPayloadHash,
    sourceJournalObservationCount: input.sourceJournalObservationCount,
    sourceJournalDroppedObservationCount: input.sourceJournalDroppedObservationCount,
    sourceJournalLatestProfileRevision: input.sourceJournalLatestProfileRevision,
    checkpointJournalRevision: input.sourceJournalRevision,
    checkpointJournalPayloadHash: input.sourceJournalPayloadHash,
    checkpointJournalObservationCount: input.sourceJournalObservationCount,
    checkpointJournalDroppedObservationCount: input.sourceJournalDroppedObservationCount,
    checkpointJournalLatestProfileRevision: input.sourceJournalLatestProfileRevision,
    accumulatedThroughProfileRevision: input.currentProfile.revision,
    accumulatedMainResearchPoints: catalogProgress.currentMainResearchPoints,
    catalogCompletionProfileRevision: catalogProgress.catalogComplete
      ? input.currentProfile.revision
      : null,
    accumulatedSettlementCount: 0,
    accumulatedMeasuredSettlementCount: 0,
    accumulatedMissingAuthorityDurationCount: 0,
    accumulatedAuthorityTicks: 0,
  });
}

function validateEnvelope(
  value: unknown,
  cohortSubjectId: string,
  input: ReturnType<typeof normalizedOpenInput>,
): StoredBaselineEnvelopeCandidateV1 {
  const name = 'Arena V2离线武器研究节奏基线envelope';
  const source = exactRecord(cloneFrozenData(value, name), ENVELOPE_KEYS, name);
  if (source.schemaVersion !== 1
    || source.status !== 'offline-weapon-research-pace-baseline') {
    throw new RangeError(`${name}来自未来或不受支持的schema。`);
  }
  if (source.cohortSubjectId !== cohortSubjectId) {
    throw new RangeError(`${name}匿名主体漂移。`);
  }
  const baselineProfile = createArenaV2LearningProfileV1(
    input.profileDefinition,
    source.baselineProfile,
  );
  const window = createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1({
    profileDefinition: input.profileDefinition,
    baselineProfile,
    cohortSubjectId,
  });
  if (source.profileDefinitionId !== window.profileDefinitionId
    || source.profileDefinitionContentVersion !== window.profileDefinitionContentVersion
    || source.profileDefinitionContentHash !== window.profileDefinitionContentHash
    || source.baselineProfileRevision !== window.baselineProfileRevision
    || source.baselineProfileHash !== window.baselineProfileHash
    || source.windowIdentityHash !== window.windowIdentityHash) {
    throw new RangeError(`${name}Definition、Profile或窗口身份漂移。`);
  }
  const sourceJournalRevision = assertIntegerAtLeast(
    source.sourceJournalRevision,
    0,
    `${name}.sourceJournalRevision`,
  );
  const sourceJournalObservationCount = assertIntegerAtLeast(
    source.sourceJournalObservationCount,
    0,
    `${name}.sourceJournalObservationCount`,
  );
  const sourceJournalDroppedObservationCount = assertIntegerAtLeast(
    source.sourceJournalDroppedObservationCount,
    0,
    `${name}.sourceJournalDroppedObservationCount`,
  );
  const sourceJournalLatestProfileRevision = nullableRevision(
    source.sourceJournalLatestProfileRevision,
    `${name}.sourceJournalLatestProfileRevision`,
  );
  if (sourceJournalRevision !== sourceJournalObservationCount
    || sourceJournalDroppedObservationCount > sourceJournalObservationCount
    || (sourceJournalObservationCount === 0)
      !== (sourceJournalLatestProfileRevision === null)
    || (sourceJournalLatestProfileRevision !== null
      && sourceJournalLatestProfileRevision > baselineProfile.revision)) {
    throw new RangeError(`${name}初始Journal水位不闭合。`);
  }
  const checkpointJournalRevision = assertIntegerAtLeast(
    source.checkpointJournalRevision,
    sourceJournalRevision,
    `${name}.checkpointJournalRevision`,
  );
  const checkpointJournalObservationCount = assertIntegerAtLeast(
    source.checkpointJournalObservationCount,
    sourceJournalObservationCount,
    `${name}.checkpointJournalObservationCount`,
  );
  const checkpointJournalDroppedObservationCount = assertIntegerAtLeast(
    source.checkpointJournalDroppedObservationCount,
    sourceJournalDroppedObservationCount,
    `${name}.checkpointJournalDroppedObservationCount`,
  );
  const checkpointJournalLatestProfileRevision = nullableRevision(
    source.checkpointJournalLatestProfileRevision,
    `${name}.checkpointJournalLatestProfileRevision`,
  );
  const accumulatedThroughProfileRevision = assertIntegerAtLeast(
    source.accumulatedThroughProfileRevision,
    baselineProfile.revision,
    `${name}.accumulatedThroughProfileRevision`,
  );
  const accumulatedMainResearchPoints = assertIntegerAtLeast(
    source.accumulatedMainResearchPoints,
    0,
    `${name}.accumulatedMainResearchPoints`,
  );
  const catalogCompletionProfileRevision = nullableRevision(
    source.catalogCompletionProfileRevision,
    `${name}.catalogCompletionProfileRevision`,
  );
  const accumulatedSettlementCount = assertIntegerAtLeast(
    source.accumulatedSettlementCount,
    0,
    `${name}.accumulatedSettlementCount`,
  );
  const accumulatedMeasuredSettlementCount = assertIntegerAtLeast(
    source.accumulatedMeasuredSettlementCount,
    0,
    `${name}.accumulatedMeasuredSettlementCount`,
  );
  const accumulatedMissingAuthorityDurationCount = assertIntegerAtLeast(
    source.accumulatedMissingAuthorityDurationCount,
    0,
    `${name}.accumulatedMissingAuthorityDurationCount`,
  );
  const accumulatedAuthorityTicks = assertIntegerAtLeast(
    source.accumulatedAuthorityTicks,
    0,
    `${name}.accumulatedAuthorityTicks`,
  );
  const baselineCatalogProgress = projectArenaV2WeaponResearchCatalogProgressCandidateV1({
    profileDefinition: input.profileDefinition,
    profile: baselineProfile,
  });
  const currentCatalogProgress = projectArenaV2WeaponResearchCatalogProgressCandidateV1({
    profileDefinition: input.profileDefinition,
    profile: input.currentProfile,
  });
  if (checkpointJournalRevision !== checkpointJournalObservationCount
    || checkpointJournalDroppedObservationCount > checkpointJournalObservationCount
    || checkpointJournalRevision < sourceJournalRevision
    || checkpointJournalDroppedObservationCount < sourceJournalDroppedObservationCount
    || (checkpointJournalObservationCount === 0)
      !== (checkpointJournalLatestProfileRevision === null)
    || (sourceJournalLatestProfileRevision !== null
      && (checkpointJournalLatestProfileRevision === null
        || checkpointJournalLatestProfileRevision < sourceJournalLatestProfileRevision))
    || accumulatedThroughProfileRevision - baselineProfile.revision
      !== accumulatedSettlementCount
    || accumulatedMainResearchPoints
      < baselineCatalogProgress.currentMainResearchPoints
    || accumulatedMainResearchPoints
      > currentCatalogProgress.currentMainResearchPoints
    || accumulatedMainResearchPoints
      - baselineCatalogProgress.currentMainResearchPoints
      > accumulatedSettlementCount
    || accumulatedMeasuredSettlementCount + accumulatedMissingAuthorityDurationCount
      !== accumulatedSettlementCount
    || checkpointJournalLatestProfileRevision !== null
      && checkpointJournalLatestProfileRevision > input.currentProfile.revision
    || catalogCompletionProfileRevision === null
      && checkpointJournalLatestProfileRevision !== null
      && checkpointJournalLatestProfileRevision > accumulatedThroughProfileRevision
    || catalogCompletionProfileRevision === null
      && (baselineCatalogProgress.catalogComplete
        || accumulatedMainResearchPoints
          >= currentCatalogProgress.targetMainResearchPoints)
    || catalogCompletionProfileRevision !== null
      && (catalogCompletionProfileRevision !== accumulatedThroughProfileRevision
        || accumulatedMainResearchPoints
          !== currentCatalogProgress.targetMainResearchPoints
        || !currentCatalogProgress.catalogComplete
        || (baselineCatalogProgress.catalogComplete
          ? catalogCompletionProfileRevision !== baselineProfile.revision
          : catalogCompletionProfileRevision <= baselineProfile.revision))
    || accumulatedThroughProfileRevision > input.currentProfile.revision) {
    throw new RangeError(`${name}紧凑结算证据或Checkpoint水位不闭合。`);
  }
  const normalized = payload({
    schemaVersion: 1,
    status: 'offline-weapon-research-pace-baseline',
    cohortSubjectId,
    profileDefinitionId: window.profileDefinitionId,
    profileDefinitionContentVersion: window.profileDefinitionContentVersion,
    profileDefinitionContentHash: window.profileDefinitionContentHash,
    baselineProfileRevision: window.baselineProfileRevision,
    baselineProfileHash: window.baselineProfileHash,
    baselineProfile,
    windowIdentityHash: window.windowIdentityHash,
    sourceJournalRevision,
    sourceJournalPayloadHash: assertNonEmptyString(
      source.sourceJournalPayloadHash,
      `${name}.sourceJournalPayloadHash`,
    ),
    sourceJournalObservationCount,
    sourceJournalDroppedObservationCount,
    sourceJournalLatestProfileRevision,
    checkpointJournalRevision,
    checkpointJournalPayloadHash: assertNonEmptyString(
      source.checkpointJournalPayloadHash,
      `${name}.checkpointJournalPayloadHash`,
    ),
    checkpointJournalObservationCount,
    checkpointJournalDroppedObservationCount,
    checkpointJournalLatestProfileRevision,
    accumulatedThroughProfileRevision,
    accumulatedMainResearchPoints,
    catalogCompletionProfileRevision,
    accumulatedSettlementCount,
    accumulatedMeasuredSettlementCount,
    accumulatedMissingAuthorityDurationCount,
    accumulatedAuthorityTicks,
  });
  const payloadHash = assertNonEmptyString(source.payloadHash, `${name}.payloadHash`);
  if (payloadHash !== createDeterministicDataHash(
    normalized,
    'Arena V2离线武器研究节奏基线payload',
  )) {
    throw new RangeError(`${name}.payloadHash不一致。`);
  }
  if (baselineProfile.profileId !== input.currentProfile.profileId
    || input.currentProfile.revision < baselineProfile.revision
    || input.sourceJournalRevision < checkpointJournalRevision
    || (input.sourceJournalRevision === checkpointJournalRevision
      && input.sourceJournalPayloadHash !== normalized.checkpointJournalPayloadHash)
    || input.sourceJournalObservationCount < checkpointJournalObservationCount
    || input.sourceJournalDroppedObservationCount < checkpointJournalDroppedObservationCount
    || (checkpointJournalLatestProfileRevision !== null
      && (input.sourceJournalLatestProfileRevision === null
        || input.sourceJournalLatestProfileRevision
          < checkpointJournalLatestProfileRevision))) {
    throw new RangeError(`${name}与当前Profile或Journal水位不兼容。`);
  }
  return Object.freeze({ ...normalized, payloadHash });
}

function safeAdd(value: number, increment: number, name: string): number {
  const result = value + increment;
  if (!Number.isSafeInteger(result)) throw new RangeError(`${name}溢出。`);
  return result;
}

function synchronizeEnvelope(
  source: StoredBaselineEnvelopeCandidateV1,
  input: ReturnType<typeof normalizedOpenInput>,
): StoredBaselineEnvelopeCandidateV1 {
  if (input.sourceJournalObservations.some(({ cohortSubjectId }) => (
    cohortSubjectId !== source.cohortSubjectId
  ))) {
    throw new RangeError('Arena V2离线武器研究节奏Checkpoint匿名主体漂移。');
  }
  const currentCatalogProgress = projectArenaV2WeaponResearchCatalogProgressCandidateV1({
    profileDefinition: input.profileDefinition,
    profile: input.currentProfile,
  });
  if (currentCatalogProgress.currentMainResearchPoints
    < source.accumulatedMainResearchPoints) {
    throw new RangeError('Arena V2离线武器研究节奏Checkpoint主研究点回退。');
  }
  const checkpoint = Object.freeze({
    checkpointJournalRevision: input.sourceJournalRevision,
    checkpointJournalPayloadHash: input.sourceJournalPayloadHash,
    checkpointJournalObservationCount: input.sourceJournalObservationCount,
    checkpointJournalDroppedObservationCount: input.sourceJournalDroppedObservationCount,
    checkpointJournalLatestProfileRevision: input.sourceJournalLatestProfileRevision,
  });
  if (source.catalogCompletionProfileRevision !== null) {
    if (!currentCatalogProgress.catalogComplete) {
      throw new RangeError('Arena V2离线武器研究节奏全集完成后不能回退。');
    }
    return envelope({
      schemaVersion: 1,
      status: 'offline-weapon-research-pace-baseline',
      cohortSubjectId: source.cohortSubjectId,
      profileDefinitionId: source.profileDefinitionId,
      profileDefinitionContentVersion: source.profileDefinitionContentVersion,
      profileDefinitionContentHash: source.profileDefinitionContentHash,
      baselineProfileRevision: source.baselineProfileRevision,
      baselineProfileHash: source.baselineProfileHash,
      baselineProfile: source.baselineProfile,
      windowIdentityHash: source.windowIdentityHash,
      sourceJournalRevision: source.sourceJournalRevision,
      sourceJournalPayloadHash: source.sourceJournalPayloadHash,
      sourceJournalObservationCount: source.sourceJournalObservationCount,
      sourceJournalDroppedObservationCount: source.sourceJournalDroppedObservationCount,
      sourceJournalLatestProfileRevision: source.sourceJournalLatestProfileRevision,
      ...checkpoint,
      accumulatedThroughProfileRevision: source.accumulatedThroughProfileRevision,
      accumulatedMainResearchPoints: source.accumulatedMainResearchPoints,
      catalogCompletionProfileRevision: source.catalogCompletionProfileRevision,
      accumulatedSettlementCount: source.accumulatedSettlementCount,
      accumulatedMeasuredSettlementCount: source.accumulatedMeasuredSettlementCount,
      accumulatedMissingAuthorityDurationCount:
        source.accumulatedMissingAuthorityDurationCount,
      accumulatedAuthorityTicks: source.accumulatedAuthorityTicks,
    });
  }
  const pendingSettlements = input.sourceJournalObservations
    .filter((observation) => (
      observation.kind
        === ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED
      && observation.profileRevision > source.accumulatedThroughProfileRevision
      && observation.profileRevision <= input.currentProfile.revision
    ))
    .sort((left, right) => left.profileRevision - right.profileRevision);
  const expectedSettlementCount =
    input.currentProfile.revision - source.accumulatedThroughProfileRevision;
  if (!Number.isSafeInteger(expectedSettlementCount)
    || expectedSettlementCount < 0
    || pendingSettlements.length !== expectedSettlementCount
    || pendingSettlements.some((observation, index) => (
      observation.profileRevision
        !== source.accumulatedThroughProfileRevision + index + 1
    ))) {
    throw new RangeError('Arena V2离线武器研究节奏Checkpoint缺少连续结算窗口。');
  }
  const mainResearchPointDelta = currentCatalogProgress.currentMainResearchPoints
    - source.accumulatedMainResearchPoints;
  if (!Number.isSafeInteger(mainResearchPointDelta)
    || mainResearchPointDelta < 0
    || mainResearchPointDelta > pendingSettlements.length) {
    throw new RangeError('Arena V2离线武器研究节奏Checkpoint主研究点增量无效。');
  }
  if (currentCatalogProgress.catalogComplete
    && mainResearchPointDelta !== pendingSettlements.length) {
    throw new RangeError('Arena V2离线武器研究节奏Checkpoint全集完成边界不明确。');
  }
  let measuredSettlementCount = 0;
  let missingAuthorityDurationCount = 0;
  let authorityTicks = 0;
  for (const settlement of pendingSettlements) {
    if (settlement.authorityTick === null) {
      missingAuthorityDurationCount = safeAdd(
        missingAuthorityDurationCount,
        1,
        'Arena V2离线武器研究节奏Checkpoint缺时长数',
      );
    } else {
      measuredSettlementCount = safeAdd(
        measuredSettlementCount,
        1,
        'Arena V2离线武器研究节奏Checkpoint已测数',
      );
      authorityTicks = safeAdd(
        authorityTicks,
        settlement.authorityTick,
        'Arena V2离线武器研究节奏Checkpoint权威tick',
      );
    }
  }
  return envelope({
    schemaVersion: 1,
    status: 'offline-weapon-research-pace-baseline',
    cohortSubjectId: source.cohortSubjectId,
    profileDefinitionId: source.profileDefinitionId,
    profileDefinitionContentVersion: source.profileDefinitionContentVersion,
    profileDefinitionContentHash: source.profileDefinitionContentHash,
    baselineProfileRevision: source.baselineProfileRevision,
    baselineProfileHash: source.baselineProfileHash,
    baselineProfile: source.baselineProfile,
    windowIdentityHash: source.windowIdentityHash,
    sourceJournalRevision: source.sourceJournalRevision,
    sourceJournalPayloadHash: source.sourceJournalPayloadHash,
    sourceJournalObservationCount: source.sourceJournalObservationCount,
    sourceJournalDroppedObservationCount: source.sourceJournalDroppedObservationCount,
    sourceJournalLatestProfileRevision: source.sourceJournalLatestProfileRevision,
    ...checkpoint,
    accumulatedThroughProfileRevision: input.currentProfile.revision,
    accumulatedMainResearchPoints: currentCatalogProgress.currentMainResearchPoints,
    catalogCompletionProfileRevision: currentCatalogProgress.catalogComplete
      ? input.currentProfile.revision
      : null,
    accumulatedSettlementCount: safeAdd(
      source.accumulatedSettlementCount,
      pendingSettlements.length,
      'Arena V2离线武器研究节奏累计结算数',
    ),
    accumulatedMeasuredSettlementCount: safeAdd(
      source.accumulatedMeasuredSettlementCount,
      measuredSettlementCount,
      'Arena V2离线武器研究节奏累计已测结算数',
    ),
    accumulatedMissingAuthorityDurationCount: safeAdd(
      source.accumulatedMissingAuthorityDurationCount,
      missingAuthorityDurationCount,
      'Arena V2离线武器研究节奏累计缺时长结算数',
    ),
    accumulatedAuthorityTicks: safeAdd(
      source.accumulatedAuthorityTicks,
      authorityTicks,
      'Arena V2离线武器研究节奏累计权威tick',
    ),
  });
}

function readProjection(
  source: StoredBaselineEnvelopeCandidateV1,
  profileDefinition: ReturnType<typeof createArenaV2LearningProfileDefinitionV1>,
  origin: 'created' | 'persisted',
): ArenaV2OfflineWeaponResearchPaceBaselineReadCandidateV1 {
  const window = createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1({
    profileDefinition,
    baselineProfile: source.baselineProfile,
    cohortSubjectId: source.cohortSubjectId,
  });
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'offline-weapon-research-pace-baseline-read' as const,
    source: origin,
    baselineProfileRevision: source.baselineProfileRevision,
    sourceJournalRevision: source.sourceJournalRevision,
    sourceJournalPayloadHash: source.sourceJournalPayloadHash,
    sourceJournalObservationCount: source.sourceJournalObservationCount,
    sourceJournalDroppedObservationCount: source.sourceJournalDroppedObservationCount,
    sourceJournalLatestProfileRevision: source.sourceJournalLatestProfileRevision,
    checkpointJournalRevision: source.checkpointJournalRevision,
    checkpointJournalPayloadHash: source.checkpointJournalPayloadHash,
    checkpointJournalObservationCount: source.checkpointJournalObservationCount,
    checkpointJournalDroppedObservationCount:
      source.checkpointJournalDroppedObservationCount,
    checkpointJournalLatestProfileRevision:
      source.checkpointJournalLatestProfileRevision,
    accumulatedThroughProfileRevision: source.accumulatedThroughProfileRevision,
    accumulatedMainResearchPoints: source.accumulatedMainResearchPoints,
    catalogCompletionProfileRevision: source.catalogCompletionProfileRevision,
    accumulatedSettlementCount: source.accumulatedSettlementCount,
    accumulatedMeasuredSettlementCount: source.accumulatedMeasuredSettlementCount,
    accumulatedMissingAuthorityDurationCount:
      source.accumulatedMissingAuthorityDurationCount,
    accumulatedAuthorityTicks: source.accumulatedAuthorityTicks,
    window,
    profileDefinition,
    baselineProfile: source.baselineProfile,
  });
}

export class ArenaV2OfflineWeaponResearchPaceBaselineStoreCandidateV1 {
  #storage: Readonly<SynchronousStoragePort> | null;
  #lease: SynchronousStorageLease | null;
  #baselineKey: string | null;
  #cohortSubjectId: string | null;
  #baseline: StoredBaselineEnvelopeCandidateV1 | null = null;
  #profileDefinition: ReturnType<typeof createArenaV2LearningProfileDefinitionV1> | null = null;
  #origin: 'created' | 'persisted' | null = null;
  #lifecycle: 'created' | 'open' | 'failed' | 'destroyed' = 'created';
  #operation: BaselineStoreOperationCandidateV1 | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: ArenaV2OfflineWeaponResearchPaceBaselineStoreOptionsCandidateV1) {
    const options = normalizedOptions(value);
    this.#storage = createSynchronousStoragePort(options.storage, {
      label: 'Arena V2 Offline Weapon Research Pace Baseline Storage',
    });
    this.#baselineKey = `${options.keyPrefix}.weapon-research-pace-baseline`;
    this.#cohortSubjectId = options.cohortSubjectId;
    this.#lease = new SynchronousStorageLease({
      storage: options.storage,
      key: `${options.keyPrefix}.weapon-research-pace-baseline.lease`,
      ownerId: options.ownerId,
      holderId: `${options.ownerId}.weapon-research-pace-baseline-holder`,
      wallNow: options.wallNow,
      durationMs: options.leaseDurationMs,
      takeoverSameOwner: options.leaseTakeoverSameOwner,
      label: 'Arena V2 Offline Weapon Research Pace Baseline Lease',
    });
    Object.freeze(this);
  }

  #rejectReentry(operation: BaselineStoreOperationCandidateV1): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `Arena V2离线武器研究节奏基线Store操作${this.#operation ?? 'unknown'}`
      + `期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw error;
  }

  #runOperation<T>(operation: BaselineStoreOperationCandidateV1, callback: () => T): T {
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
    if (sequence === this.#reentrySequence) return;
    const error = new Error(`Arena V2离线武器研究节奏基线Store ${operation}期间发生重入。`);
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
    if (this.#storage === null) throw new Error('Arena V2离线武器研究节奏基线Store已销毁。');
    return this.#storage;
  }

  #leaseValue(): SynchronousStorageLease {
    if (this.#lease === null) throw new Error('Arena V2离线武器研究节奏基线Store已销毁。');
    return this.#lease;
  }

  #readStored(input: ReturnType<typeof normalizedOpenInput>):
  StoredBaselineEnvelopeCandidateV1 | null {
    if (this.#baselineKey === null || this.#cohortSubjectId === null) {
      throw new Error('Arena V2离线武器研究节奏基线Store已销毁。');
    }
    const read = this.#storageValue().read(this.#baselineKey);
    if (!read.ok) throw new Error('Arena V2离线武器研究节奏基线读取失败。');
    return read.found
      ? validateEnvelope(read.value, this.#cohortSubjectId, input)
      : null;
  }

  #writeConfirmed(
    next: StoredBaselineEnvelopeCandidateV1,
    input: ReturnType<typeof normalizedOpenInput>,
    sequence: number,
  ): void {
    if (this.#baselineKey === null) {
      throw new Error('Arena V2离线武器研究节奏基线Store已销毁。');
    }
    let accepted = false;
    let writeFailed = false;
    let writeError: unknown = null;
    try {
      accepted = this.#callChecked(
        sequence,
        '基线写入',
        () => this.#storageValue().write(this.#baselineKey!, next),
      );
    } catch (error) {
      writeFailed = true;
      writeError = error;
      this.#assertReentryFree(sequence, '基线写入');
    }
    let confirmed: StoredBaselineEnvelopeCandidateV1 | null = null;
    let readFailed = false;
    let readError: unknown = null;
    try {
      confirmed = this.#callChecked(
        sequence,
        '基线写后读回',
        () => this.#readStored(input),
      );
    } catch (error) {
      readFailed = true;
      readError = error;
      this.#assertReentryFree(sequence, '基线写后读回');
    }
    if (confirmed?.payloadHash === next.payloadHash) return;
    if (readFailed) {
      if (readError instanceof Error) throw readError;
      throw new Error(
        `Arena V2离线武器研究节奏基线写后读回失败：${String(readError)}`,
        { cause: readError },
      );
    }
    if (writeFailed) {
      if (writeError instanceof Error) throw writeError;
      throw new Error(
        `Arena V2离线武器研究节奏基线写入失败：${String(writeError)}`,
        { cause: writeError },
      );
    }
    if (!accepted) throw new Error('Arena V2离线武器研究节奏基线写入未被接受。');
    throw new Error('Arena V2离线武器研究节奏基线写后读回不一致。');
  }

  #withExclusiveLease<T>(
    sequence: number,
    operation: string,
    callback: () => T,
  ): T {
    let acquired = false;
    let result: T | undefined;
    let operationFailed = false;
    let operationError: unknown = null;
    try {
      acquired = this.#callChecked(
        sequence,
        `${operation}租约取得`,
        () => this.#leaseValue().acquire(),
      );
      if (!acquired) throw new Error(`Arena V2离线武器研究节奏${operation}租约不可用。`);
      result = callback();
      this.#assertReentryFree(sequence, `${operation}提交`);
    } catch (error) {
      operationFailed = true;
      operationError = error;
    }
    let releaseFailed = false;
    let releaseError: unknown = null;
    if (acquired) {
      try {
        const released = this.#callChecked(
          sequence,
          `${operation}租约释放`,
          () => this.#leaseValue().release(),
        );
        if (!released) {
          throw new Error(`Arena V2离线武器研究节奏${operation}租约未确认释放。`);
        }
      } catch (error) {
        releaseFailed = true;
        releaseError = error;
      }
    }
    if (operationFailed && releaseFailed) {
      throw new AggregateError(
        [operationError, releaseError],
        `Arena V2离线武器研究节奏${operation}失败且租约释放失败。`,
      );
    }
    if (operationFailed) throw operationError;
    if (releaseFailed) throw releaseError;
    return result as T;
  }

  open(value: ArenaV2OfflineWeaponResearchPaceBaselineOpenInputCandidateV1):
  ArenaV2OfflineWeaponResearchPaceBaselineReadCandidateV1 {
    return this.#runOperation('open', () => {
      if (this.#lifecycle !== 'created' || this.#cohortSubjectId === null) {
        throw new Error(`Arena V2离线武器研究节奏基线Store状态${this.#lifecycle}不能open。`);
      }
      const sequence = this.#reentrySequence;
      const input = normalizedOpenInput(value);
      this.#assertReentryFree(sequence, 'open输入规范化');
      try {
        const opened = this.#withExclusiveLease(sequence, '基线初始化', () => {
          const stored = this.#callChecked(
            sequence,
            '持久基线读取',
            () => this.#readStored(input),
          );
          const initialized = stored ?? createEnvelope(this.#cohortSubjectId!, input);
          const synchronized = synchronizeEnvelope(initialized, input);
          this.#assertReentryFree(sequence, '持久基线规范化');
          if (stored === null || synchronized.payloadHash !== stored.payloadHash) {
            this.#writeConfirmed(synchronized, input, sequence);
          }
          return Object.freeze({
            baseline: synchronized,
            origin: stored === null ? 'created' as const : 'persisted' as const,
          });
        });
        this.#baseline = opened.baseline;
        this.#profileDefinition = input.profileDefinition;
        this.#origin = opened.origin;
        this.#lifecycle = 'open';
        return readProjection(opened.baseline, input.profileDefinition, opened.origin);
      } catch (error) {
        this.#lifecycle = 'failed';
        throw error;
      }
    });
  }

  synchronize(
    value: ArenaV2OfflineWeaponResearchPaceBaselineOpenInputCandidateV1,
  ): ArenaV2OfflineWeaponResearchPaceBaselineReadCandidateV1 {
    return this.#runOperation('synchronize', () => {
      if (this.#lifecycle !== 'open' || this.#baseline === null
        || this.#profileDefinition === null || this.#origin === null) {
        throw new Error('Arena V2离线武器研究节奏基线Store尚未打开。');
      }
      const sequence = this.#reentrySequence;
      const input = normalizedOpenInput(value);
      this.#assertReentryFree(sequence, 'synchronize输入规范化');
      try {
        const next = this.#withExclusiveLease(sequence, 'Checkpoint同步', () => {
          const stored = this.#callChecked(
            sequence,
            'Checkpoint持久基线读取',
            () => this.#readStored(input),
          );
          if (stored === null) {
            throw new Error('Arena V2离线武器研究节奏Checkpoint持久基线缺失。');
          }
          if (stored.payloadHash !== this.#baseline!.payloadHash) {
            throw new RangeError('Arena V2离线武器研究节奏Checkpoint存在并发基线漂移。');
          }
          const synchronized = synchronizeEnvelope(stored, input);
          if (synchronized.payloadHash !== stored.payloadHash) {
            this.#writeConfirmed(synchronized, input, sequence);
          }
          return synchronized;
        });
        this.#baseline = next;
        this.#profileDefinition = input.profileDefinition;
        return readProjection(next, input.profileDefinition, this.#origin);
      } catch (error) {
        this.#lifecycle = 'failed';
        throw error;
      }
    });
  }

  getRead(): ArenaV2OfflineWeaponResearchPaceBaselineReadCandidateV1 {
    return this.#runOperation('read', () => {
      if (this.#lifecycle !== 'open' || this.#baseline === null
        || this.#profileDefinition === null || this.#origin === null) {
        throw new Error('Arena V2离线武器研究节奏基线Store尚未打开。');
      }
      return readProjection(this.#baseline, this.#profileDefinition, this.#origin);
    });
  }

  project(currentProfile: unknown): ReturnType<
    typeof projectArenaV2WeaponResearchPaceCalibrationFromAccumulatedEvidenceCandidateV1
  > {
    return this.#runOperation('project', () => {
      if (this.#lifecycle !== 'open' || this.#baseline === null
        || this.#profileDefinition === null) {
        throw new Error('Arena V2离线武器研究节奏基线Store尚未打开。');
      }
      const profile = createArenaV2LearningProfileV1(
        this.#profileDefinition,
        currentProfile,
      );
      return projectArenaV2WeaponResearchPaceCalibrationFromAccumulatedEvidenceCandidateV1({
        profileDefinition: this.#profileDefinition,
        baselineProfile: this.#baseline.baselineProfile,
        currentProfile: profile,
        window: createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1({
          profileDefinition: this.#profileDefinition,
          baselineProfile: this.#baseline.baselineProfile,
          cohortSubjectId: this.#baseline.cohortSubjectId,
        }),
        settledMatchCount: this.#baseline.accumulatedSettlementCount,
        measuredSettledMatchCount: this.#baseline.accumulatedMeasuredSettlementCount,
        missingAuthorityDurationCount:
          this.#baseline.accumulatedMissingAuthorityDurationCount,
        totalAuthorityTicks: this.#baseline.accumulatedAuthorityTicks,
        evidenceThroughProfileRevision:
          this.#baseline.accumulatedThroughProfileRevision,
        catalogCompletionProfileRevision:
          this.#baseline.catalogCompletionProfileRevision,
      });
    });
  }

  destroy(): void {
    this.#runOperation('destroy', () => {
      if (this.#lifecycle === 'destroyed') return;
      const sequence = this.#reentrySequence;
      this.#lifecycle = 'failed';
      this.#callChecked(sequence, '销毁租约Owner', () => this.#leaseValue().destroy());
      this.#storage = null;
      this.#lease = null;
      this.#baselineKey = null;
      this.#cohortSubjectId = null;
      this.#baseline = null;
      this.#profileDefinition = null;
      this.#origin = null;
      this.#lifecycle = 'destroyed';
      this.#assertReentryFree(sequence, '销毁发布');
    });
  }
}
