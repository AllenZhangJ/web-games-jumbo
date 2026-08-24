import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
} from './arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import type {
  ArenaV2A6FormalPreviewLeaseReleaseInputV1,
  ArenaV2A6FormalPreviewLeaseResultV1,
} from './arena-v2-collection-formal-preview-lease-owner-candidate-v1.js';
import type {
  ArenaV2CollectionVisiblePreviewActiveLeaseRecordV1,
  ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerStateV1,
  ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1,
  ArenaV2A6BeforeReleaseDestroyedProofReadInputV1,
  ArenaV2A6BeforeReleaseDestroyedProofReaderPortV1,
  ArenaV2A6BeforeReleaseDestroyedProofV1,
} from './arena-v2-collection-visible-preview-lease-command-execution-owner-candidate-v1.js';
import type {
  ArenaV2CollectionVisibleLayoutObservationSnapshotV1,
  ArenaV2CollectionVisibleWeaponMountLayoutV1,
} from './arena-v2-collection-visible-layout-observation-owner-candidate-v1.js';
import {
  ArenaV2WeaponCollectionPreviewThreeMountOwnerCandidateV1,
  type ArenaV2A6WeaponPreviewThreeMountV1,
} from './arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.js';

export const ARENA_V2_COLLECTION_PREVIEW_MOUNT_LIFECYCLE_DESTROY_PROOF_OWNER_CANDIDATE_V1 =
  Object.freeze({
    stage: 'A6.12b' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    ownsA6_9MountOwner: true as const,
    ownsOrReleasesA6_6: false as const,
    loadsGltf: false as const,
    createsRenderer: false as const,
    createsDom: false as const,
    createsRaf: false as const,
    inheritedLighting: 'A6.9-hemisphere-plus-directional-only' as const,
    maximumActiveWeaponLeases: 20 as const,
    maximumProofHistory: 64 as const,
    maximumSettlementDiagnostics: 22 as const,
    maximumMountSequenceKeys: 40 as const,
    maximumMountIdLength: 256 as const,
    nonBlockingLeaseSettlement: true as const,
    releaseOrder: 'prepare-destroy-mounts-read-proof-release-commit' as const,
    ownerDestroyPreparationRetriesOnlyIncompleteMountCleanup: true as const,
    destroyIncompleteResultIsDiagnosticNotTerminal: true as const,
    synchronousLifecycleOperationReentryRejected: true as const,
    swallowedA6_9CallbackReentryFailsMountLifecycleOwner: true as const,
    leaseSettlementCommitsUnderOperationGuard: true as const,
    proofReadAndReleaseCommitAreOperationIsolated: true as const,
    publicReadsRejectedDuringOperationCommit: true as const,
    stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
    mountProofSettlementAndSnapshotCallbacksCheckedBeforeStateCommit: true as const,
    cleanupReentryRetainsCurrentAndLaterOwners: true as const,
  });

export type ArenaV2CollectionPreviewMountLifecycleOwnerStateV1 =
  | 'active'
  | 'failed'
  | 'destroy-prepared'
  | 'destroy-incomplete'
  | 'destroyed';

export interface ArenaV2CollectionPreviewMountLifecycleOwnerOptionsV1 {
  readonly schemaVersion: 1;
  readonly bindingSnapshot: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
}

export interface ArenaV2CollectionPreviewMountLifecycleCommitExecutionInputV1 {
  readonly schemaVersion: 1;
  readonly executionResult: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1;
  readonly layoutSnapshot: ArenaV2CollectionVisibleLayoutObservationSnapshotV1;
}

export interface ArenaV2CollectionPreviewMountLifecyclePrepareReleaseInputV1 {
  readonly schemaVersion: 1;
  readonly planIdentity: string;
  readonly tick: number;
  readonly releaseCommands: readonly ArenaV2A6FormalPreviewLeaseReleaseInputV1[];
}

export interface ArenaV2CollectionPreviewMountLifecycleCommitReleaseInputV1 {
  readonly schemaVersion: 1;
  readonly planIdentity: string;
  readonly executionResult: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1;
}

export interface ArenaV2CollectionPreviewMountLifecycleRollbackReleaseInputV1 {
  readonly schemaVersion: 1;
  readonly planIdentity: string;
  readonly tick: number;
  readonly resourceExecutorState: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerStateV1;
  readonly rejectionPhase: 'before-resource-mutation' | 'partial-or-unknown';
}

export interface ArenaV2CollectionPreviewMountLifecyclePrepareOwnerDestroyInputV1 {
  readonly schemaVersion: 1;
  readonly tick: number;
}

export interface ArenaV2CollectionPreviewMountLifecycleFinalizeDestroyInputV1 {
  readonly schemaVersion: 1;
  readonly tick: number;
  readonly resourceOwnerState: 'destroyed' | 'destroy-incomplete';
}

export interface ArenaV2CollectionPreviewMountLifecycleResetInputV1 {
  readonly schemaVersion: 1;
  readonly tick: number;
  readonly nextBindingSnapshot: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
}

export interface ArenaV2CollectionPreviewMountLifecyclePrepareReleaseResultV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly validationStatus: 'not-run';
  readonly planIdentity: string;
  readonly tick: number;
  readonly preparedLeaseCount: number;
  readonly proofs: readonly ArenaV2A6BeforeReleaseDestroyedProofV1[];
  readonly allMountsDestroyedBeforeRelease: true;
}

export interface ArenaV2CollectionPreviewMountLifecyclePrepareOwnerDestroyResultV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly validationStatus: 'not-run';
  readonly state: 'destroy-prepared' | 'destroy-incomplete';
  readonly tick: number;
  readonly preparedLeaseCount: number;
  readonly proofCount: number;
  readonly failedMountLeaseIds: readonly string[];
}

export interface ArenaV2CollectionPreviewMountLifecycleSnapshotV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly state: ArenaV2CollectionPreviewMountLifecycleOwnerStateV1;
  readonly epochId: string;
  readonly catalogContentHash: string;
  readonly lastTick: number;
  readonly activeLeaseCount: number;
  readonly pendingLeaseCount: number;
  readonly readyLeaseCount: number;
  readonly fallbackLeaseCount: number;
  readonly staticFallbackCount: number;
  readonly mountedCount: number;
  readonly preparedReleaseLeaseCount: number;
  readonly proofHistoryCount: number;
  readonly lateSettlementDiagnosticCount: number;
  readonly destroyPrepared: boolean;
  readonly activeMounts: readonly ArenaV2A6WeaponPreviewThreeMountV1[];
  readonly a6_9State: 'active' | 'failed' | 'destroyed';
  readonly ownsOrReleasesA6_6: false;
  readonly loadsGltf: false;
  readonly createsRenderer: false;
  readonly createsDom: false;
  readonly createsRaf: false;
}

interface ParsedBindingV1 {
  readonly snapshot: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
  readonly epochId: string;
  readonly tick: number;
  readonly catalogContentHash: string;
  readonly waterlineCanonical: string;
}

interface ParsedLayoutV1 {
  readonly snapshot: ArenaV2CollectionVisibleLayoutObservationSnapshotV1;
  readonly epochId: string;
  readonly tick: number;
  readonly screenId: ArenaV2CollectionVisibleLayoutObservationSnapshotV1['screenId'];
  readonly catalogContentHash: string;
  readonly bindingSnapshot: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
  readonly waterlineCanonical: string;
  readonly mountLayouts: readonly ArenaV2CollectionVisibleWeaponMountLayoutV1[];
  readonly mountLayoutsByIdentity: ReadonlyMap<string, ArenaV2CollectionVisibleWeaponMountLayoutV1>;
  readonly staticFallbackCanonical: string;
  readonly inputCanonical: string;
}

interface ParsedActiveRecordV1 {
  readonly source: ArenaV2CollectionVisiblePreviewActiveLeaseRecordV1;
  readonly leaseResultPromise: Promise<ArenaV2A6FormalPreviewLeaseResultV1>;
  readonly canonicalWithoutPromiseOrHandle: string;
}

interface ParsedExecutionV1 {
  readonly sourceObject: object;
  readonly epochId: string;
  readonly tick: number;
  readonly screenId: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1['screenId'];
  readonly planIdentity: string;
  readonly activeRecords: readonly ParsedActiveRecordV1[];
  readonly fallbackCanonical: string;
  readonly proofCanonical: string;
  readonly canonicalWithoutPromiseOrHandle: string;
}

interface MountedActiveRecordV1 {
  readonly leaseId: string;
  readonly requestIdentity: string;
  readonly definitionId: string;
  readonly assetId: string;
  readonly ordinal: number;
  readonly screenId: 'weapon-index' | 'weapon-detail';
  readonly leaseResultPromise: Promise<ArenaV2A6FormalPreviewLeaseResultV1>;
  settlementState: 'pending' | 'ready' | 'fallback';
  settledResult: ArenaV2A6FormalPreviewLeaseResultV1 | null;
  layout: ArenaV2CollectionVisibleWeaponMountLayoutV1;
  layoutCanonical: string;
  bindingSnapshot: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
  layoutTick: number;
  mount: ArenaV2A6WeaponPreviewThreeMountV1 | null;
  mountId: string | null;
  preparedPlanIdentity: string | null;
}

interface PreparedRecordV1 {
  readonly record: MountedActiveRecordV1;
  readonly priorLayout: ArenaV2CollectionVisibleWeaponMountLayoutV1;
  readonly priorLayoutCanonical: string;
  readonly priorBindingSnapshot: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
}

interface PreparedReleaseV1 {
  readonly planIdentity: string;
  readonly tick: number;
  readonly inputCanonical: string;
  readonly records: readonly PreparedRecordV1[];
  readonly result: ArenaV2CollectionPreviewMountLifecyclePrepareReleaseResultV1;
}

interface ProofTombstoneV1 {
  readonly planIdentity: string;
  readonly tick: number;
  readonly assetId: string;
  readonly proof: ArenaV2A6BeforeReleaseDestroyedProofV1;
}

const OWNER_KEYS = new Set(['schemaVersion', 'bindingSnapshot']);
const COMMIT_EXECUTION_KEYS = new Set(['schemaVersion', 'executionResult', 'layoutSnapshot']);
const PREPARE_RELEASE_KEYS = new Set(['schemaVersion', 'planIdentity', 'tick', 'releaseCommands']);
const COMMIT_RELEASE_KEYS = new Set(['schemaVersion', 'planIdentity', 'executionResult']);
const ROLLBACK_KEYS = new Set([
  'schemaVersion', 'planIdentity', 'tick', 'resourceExecutorState', 'rejectionPhase',
]);
const PREPARE_DESTROY_KEYS = new Set(['schemaVersion', 'tick']);
const FINALIZE_DESTROY_KEYS = new Set(['schemaVersion', 'tick', 'resourceOwnerState']);
const RESET_KEYS = new Set(['schemaVersion', 'tick', 'nextBindingSnapshot']);
const BINDING_KEYS = new Set([
  'schemaVersion', 'status', 'hardGate', 'defaultSurfaceWired', 'validationStatus',
  'epochId', 'tick', 'sourceState', 'contentIdentity', 'budget', 'slots', 'layouts',
  'accessibility', 'governance',
]);
const CONTENT_IDENTITY_KEYS = new Set([
  'sourceContentHash', 'collectionContentHash', 'catalogContentHash', 'catalogRevision',
  'productionApprovalLedgerId', 'productionApprovalLedgerContentHash',
]);
const LAYOUT_SNAPSHOT_KEYS = new Set([
  'schemaVersion', 'status', 'implementationStatus', 'validationStatus', 'hardGate',
  'defaultSurfaceWired', 'state', 'epochId', 'tick', 'screenId', 'plannerViewport',
  'mountViewport', 'contentClipRectCssPixels', 'plannerInput',
  'visibleWeaponMountLayouts', 'visibleStaticFallbackLayouts', 'allSlotVisibility',
  'bindingValidation', 'bindingWaterlineCanonicalByteLength', 'readsDom',
  'createsThree', 'loadsResources', 'executesA6_10', 'triggersA6_9',
]);
const PLANNER_INPUT_KEYS = new Set([
  'schemaVersion', 'epochId', 'tick', 'screenId', 'viewport', 'readSnapshot',
  'visibleDefinitionIds', 'previousActiveLeaseLedger',
]);
const MOUNT_LAYOUT_KEYS = new Set([
  'schemaVersion', 'screenId', 'definitionId', 'assetId', 'ordinal', 'slot',
  'viewport', 'previewRectCssPixels', 'reducedMotion',
]);
const STATIC_FALLBACK_KEYS = new Set([
  'schemaVersion', 'screenId', 'kind', 'definitionId', 'assetId', 'ordinal',
  'viewport', 'previewRectCssPixels', 'reason', 'previewSourceUse', 'fallbackContent',
  'requestPermitted',
]);
const EXECUTION_RESULT_KEYS = new Set([
  'schemaVersion', 'status', 'validationStatus', 'productionReachable',
  'defaultSurfaceWired', 'epochId', 'tick', 'screenId', 'planIdentity',
  'releaseBarrierProofs', 'activeRecords', 'fallbackSlots', 'assetReadyCount',
  'leaseFallbackCount', 'staticFallbackCount',
]);
const ACTIVE_RECORD_KEYS = new Set([
  'schemaVersion', 'epochId', 'catalogContentHash', 'screenId', 'activationSequence',
  'visibleSlotLeaseId', 'kind', 'definitionId', 'assetId', 'ordinal', 'requestToken',
  'releaseToken', 'requestIdentity', 'leaseResultPromise', 'settlementState',
  'settledResult',
]);
const READY_RESULT_KEYS = new Set([
  'schemaVersion', 'status', 'visibleSlotLeaseId', 'requestIdentity', 'assetId',
  'handle', 'fallbackActive',
]);
const FALLBACK_RESULT_KEYS = new Set([
  'schemaVersion', 'status', 'visibleSlotLeaseId', 'requestIdentity', 'assetId',
  'handle', 'fallbackActive', 'fallbackContent', 'failureCode',
]);
const PROOF_KEYS = new Set([
  'schemaVersion', 'visibleSlotLeaseId', 'requestIdentity', 'destroyed',
]);
const EXECUTION_FALLBACK_KEYS = new Set([
  'schemaVersion', 'kind', 'definitionId', 'assetId', 'ordinal', 'reason',
  'previewSourceUse', 'fallbackContent', 'requestPermitted',
]);
const PROOF_READ_KEYS = new Set([
  'schemaVersion', 'epochId', 'tick', 'visibleSlotLeaseId', 'requestIdentity', 'assetId',
]);
const RELEASE_COMMAND_KEYS = new Set([
  'schemaVersion', 'tick', 'visibleSlotLeaseId', 'releaseToken',
]);
const MAX_ACTIVE = 20;
const MAX_PROOF_HISTORY = 64;
const MAX_LATE_DIAGNOSTICS = 22;
const MAX_MOUNT_SEQUENCE_KEYS = 40;
const MAX_MOUNT_ID_LENGTH = 256;
const NATIVE_PROMISE_THEN = Promise.prototype.then;

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  const record = assertPlainRecord(value, name);
  assertKnownKeys(record, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(record, key)) throw new TypeError(`${name}缺少字段${key}。`);
  }
  return record;
}

function exactExternalRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是plain object。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name}原型不受支持。`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.length !== keys.size
    || ownKeys.some((key) => typeof key !== 'string' || !keys.has(key))) {
    throw new TypeError(`${name}字段必须exact-key。`);
  }
  const result: PlainRecord = Object.create(null) as PlainRecord;
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function text(value: unknown, name: string, maximum = 2048): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum
    || value.trim() !== value) {
    throw new TypeError(`${name}必须是1..${maximum}字符的有界非空字符串。`);
  }
  return value;
}

function integer(value: unknown, name: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name}必须是不小于${minimum}的安全整数。`);
  }
  return value as number;
}

function canonical(value: unknown, name: string): string {
  const result = JSON.stringify(value);
  if (typeof result !== 'string') throw new TypeError(`${name}无法规范序列化。`);
  return result;
}

function isNativePromise(value: unknown): value is Promise<ArenaV2A6FormalPreviewLeaseResultV1> {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return false;
  try {
    Reflect.apply(NATIVE_PROMISE_THEN, value, [() => undefined, () => undefined]);
    return true;
  } catch {
    return false;
  }
}

function bindingWaterline(value: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1): string {
  const content = exactRecord(value.contentIdentity, CONTENT_IDENTITY_KEYS, 'A6.12b contentIdentity');
  const accessibility = assertPlainRecord(value.accessibility, 'A6.12b accessibility');
  if (typeof accessibility.reducedMotion !== 'boolean') {
    throw new TypeError('A6.12b reducedMotion必须是boolean。');
  }
  return canonical({
    catalogContentHash: content.catalogContentHash,
    catalogRevision: content.catalogRevision,
    productionApprovalLedgerId: content.productionApprovalLedgerId,
    productionApprovalLedgerContentHash: content.productionApprovalLedgerContentHash,
    slots: value.slots,
    budget: value.budget,
    layouts: value.layouts,
    reducedMotion: accessibility.reducedMotion,
    governance: value.governance,
  }, 'A6.12b binding waterline');
}

function parseBinding(value: unknown, name: string): ParsedBindingV1 {
  const cloned = cloneFrozenData(value, name) as unknown;
  const source = exactRecord(cloned, BINDING_KEYS, name);
  if (source.schemaVersion !== 1
    || source.status !== 'production-unreachable'
    || source.hardGate !== false
    || source.defaultSurfaceWired !== false
    || source.validationStatus !== 'not-run') {
    throw new RangeError(`${name}治理状态不闭合。`);
  }
  const epochId = text(source.epochId, `${name}.epochId`, 200);
  const tick = integer(source.tick, `${name}.tick`);
  const content = exactRecord(source.contentIdentity, CONTENT_IDENTITY_KEYS, `${name}.contentIdentity`);
  const catalogContentHash = text(
    content.catalogContentHash,
    `${name}.catalogContentHash`,
    128,
  );
  if (!Array.isArray(source.slots) || source.slots.length !== 22) {
    throw new RangeError(`${name}必须保留完整22槽。`);
  }
  const snapshot = cloned as ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
  return Object.freeze({
    snapshot,
    epochId,
    tick,
    catalogContentHash,
    waterlineCanonical: bindingWaterline(snapshot),
  });
}

function layoutIdentity(
  definitionId: string,
  assetId: string,
  ordinal: number,
): string {
  return canonical([definitionId, assetId, ordinal], 'A6.12b layout identity');
}

function parseLayout(value: unknown): ParsedLayoutV1 {
  const cloned = cloneFrozenData(value, 'A6.12b layout snapshot');
  const source = exactRecord(cloned, LAYOUT_SNAPSHOT_KEYS, 'A6.12b layout snapshot');
  if (source.schemaVersion !== 1
    || source.status !== 'production-unreachable'
    || source.implementationStatus !== 'code-written-not-run'
    || source.validationStatus !== 'not-run'
    || source.hardGate !== false
    || source.defaultSurfaceWired !== false
    || source.state !== 'active'
    || source.readsDom !== false
    || source.createsThree !== false
    || source.loadsResources !== false
    || source.executesA6_10 !== false
    || source.triggersA6_9 !== false) {
    throw new RangeError('A6.12b只接受未接生产的A6.12a active snapshot。');
  }
  const epochId = text(source.epochId, 'A6.12b layout.epochId', 200);
  const tick = integer(source.tick, 'A6.12b layout.tick');
  if (source.screenId !== 'weapon-index'
    && source.screenId !== 'weapon-detail'
    && source.screenId !== 'map-index'
    && source.screenId !== 'map-detail') {
    throw new RangeError('A6.12b layout.screenId不受支持。');
  }
  const planner = exactRecord(source.plannerInput, PLANNER_INPUT_KEYS, 'A6.12b plannerInput');
  if (planner.schemaVersion !== 1
    || planner.epochId !== epochId
    || planner.tick !== tick
    || planner.screenId !== source.screenId
    || planner.viewport !== source.plannerViewport) {
    throw new RangeError('A6.12b layout与plannerInput身份不闭合。');
  }
  const readSnapshot = assertPlainRecord(planner.readSnapshot, 'A6.12b readSnapshot');
  const binding = parseBinding(readSnapshot.formalAssetLeaseBinding, 'A6.12b layout binding');
  if (binding.epochId !== epochId || binding.tick !== tick) {
    throw new RangeError('A6.12b layout binding epoch/tick不闭合。');
  }
  if (!Array.isArray(source.visibleWeaponMountLayouts)
    || source.visibleWeaponMountLayouts.length > MAX_ACTIVE
    || !Array.isArray(source.visibleStaticFallbackLayouts)
    || source.visibleStaticFallbackLayouts.length > MAX_ACTIVE) {
    throw new RangeError('A6.12b当前页mount/fallback数量超出有界范围。');
  }
  const mounts: ArenaV2CollectionVisibleWeaponMountLayoutV1[] = [];
  const byIdentity = new Map<string, ArenaV2CollectionVisibleWeaponMountLayoutV1>();
  source.visibleWeaponMountLayouts.forEach((candidate, index) => {
    const layout = exactRecord(candidate, MOUNT_LAYOUT_KEYS, `A6.12b mountLayouts[${index}]`);
    if (layout.schemaVersion !== 1
      || (layout.screenId !== 'weapon-index' && layout.screenId !== 'weapon-detail')
      || layout.screenId !== source.screenId
      || typeof layout.reducedMotion !== 'boolean') {
      throw new RangeError(`A6.12b mountLayouts[${index}]状态或screen不闭合。`);
    }
    const definitionId = text(layout.definitionId, `A6.12b mountLayouts[${index}].definitionId`, 300);
    const assetId = text(layout.assetId, `A6.12b mountLayouts[${index}].assetId`, 300);
    const ordinal = integer(layout.ordinal, `A6.12b mountLayouts[${index}].ordinal`, 1);
    const identity = layoutIdentity(definitionId, assetId, ordinal);
    if (byIdentity.has(identity)) throw new RangeError('A6.12b mount layout身份重复。');
    const typed = layout as unknown as ArenaV2CollectionVisibleWeaponMountLayoutV1;
    byIdentity.set(identity, typed);
    mounts.push(typed);
  });
  const fallbackValues = source.visibleStaticFallbackLayouts.map((candidate, index) => {
    const fallback = exactRecord(
      candidate,
      STATIC_FALLBACK_KEYS,
      `A6.12b staticFallback[${index}]`,
    );
    if (fallback.schemaVersion !== 1
      || fallback.screenId !== source.screenId
      || (fallback.kind !== 'weapon' && fallback.kind !== 'map')
      || fallback.reason !== (fallback.kind === 'map'
        ? 'map-formal-preview-not-approved'
        : 'missing-or-unapproved-weapon')
      || fallback.previewSourceUse !== 'text-shape-pattern-fallback-only'
      || fallback.fallbackContent !== 'text-shape-pattern-only'
      || fallback.requestPermitted !== false) {
      throw new RangeError(`A6.12b staticFallback[${index}]合同不闭合。`);
    }
    const definitionId = text(
      fallback.definitionId,
      `A6.12b staticFallback[${index}].definitionId`,
      300,
    );
    const assetId = text(fallback.assetId, `A6.12b staticFallback[${index}].assetId`, 300);
    const ordinal = integer(fallback.ordinal, `A6.12b staticFallback[${index}].ordinal`, 1);
    return Object.freeze({
      schemaVersion: 1 as const,
      kind: fallback.kind,
      definitionId,
      assetId,
      ordinal,
      reason: fallback.reason,
      previewSourceUse: fallback.previewSourceUse,
      fallbackContent: fallback.fallbackContent,
      requestPermitted: false as const,
    });
  });
  if (new Set(fallbackValues.map(({ definitionId, assetId, ordinal }) => (
    layoutIdentity(definitionId, assetId, ordinal)
  ))).size !== fallbackValues.length) {
    throw new RangeError('A6.12b static fallback身份重复。');
  }
  return Object.freeze({
    snapshot: cloned as ArenaV2CollectionVisibleLayoutObservationSnapshotV1,
    epochId,
    tick,
    screenId: source.screenId as ArenaV2CollectionVisibleLayoutObservationSnapshotV1['screenId'],
    catalogContentHash: binding.catalogContentHash,
    bindingSnapshot: binding.snapshot,
    waterlineCanonical: binding.waterlineCanonical,
    mountLayouts: Object.freeze(mounts),
    mountLayoutsByIdentity: byIdentity,
    staticFallbackCanonical: canonical(fallbackValues, 'A6.12b static fallback'),
    inputCanonical: canonical(cloned, 'A6.12b layout snapshot'),
  });
}

function parseLeaseResult(
  value: unknown,
  leaseId: string,
  requestIdentity: string,
  assetId: string,
): ArenaV2A6FormalPreviewLeaseResultV1 {
  const status = typeof value === 'object' && value !== null
    ? Object.getOwnPropertyDescriptor(value, 'status')
    : undefined;
  if (status === undefined || !('value' in status)) {
    throw new TypeError('A6.12b lease result.status必须是数据字段。');
  }
  const keys = status.value === 'ready' ? READY_RESULT_KEYS : FALLBACK_RESULT_KEYS;
  const source = exactExternalRecord(value, keys, 'A6.12b lease result');
  if (source.schemaVersion !== 1
    || source.visibleSlotLeaseId !== leaseId
    || source.requestIdentity !== requestIdentity
    || source.assetId !== assetId) {
    throw new RangeError('A6.12b lease result身份漂移。');
  }
  if (source.status === 'ready') {
    if (source.fallbackActive !== false || source.handle === null) {
      throw new RangeError('A6.12b ready result形状不闭合。');
    }
  } else if (source.status === 'fallback') {
    if (source.fallbackActive !== true
      || source.handle !== null
      || source.fallbackContent !== 'text-shape-pattern-only'
      || typeof source.failureCode !== 'string') {
      throw new RangeError('A6.12b fallback result形状不闭合。');
    }
  } else {
    throw new RangeError('A6.12b lease result.status不受支持。');
  }
  return value as ArenaV2A6FormalPreviewLeaseResultV1;
}

function parseExecution(value: unknown): ParsedExecutionV1 {
  const source = exactExternalRecord(value, EXECUTION_RESULT_KEYS, 'A6.12b execution result');
  if (source.schemaVersion !== 1
    || source.status !== 'production-unreachable'
    || source.validationStatus !== 'not-run'
    || source.productionReachable !== false
    || source.defaultSurfaceWired !== false) {
    throw new RangeError('A6.12b execution result治理状态不闭合。');
  }
  const epochId = text(source.epochId, 'A6.12b execution.epochId', 200);
  const tick = integer(source.tick, 'A6.12b execution.tick');
  if (source.screenId !== 'weapon-index'
    && source.screenId !== 'weapon-detail'
    && source.screenId !== 'map-index'
    && source.screenId !== 'map-detail') {
    throw new RangeError('A6.12b execution.screenId不受支持。');
  }
  const planIdentity = text(source.planIdentity, 'A6.12b planIdentity', 256);
  if (!Array.isArray(source.activeRecords) || source.activeRecords.length > MAX_ACTIVE) {
    throw new RangeError('A6.12b active records最多20项。');
  }
  const active: ParsedActiveRecordV1[] = [];
  const ids = new Set<string>();
  const promises = new Set<Promise<ArenaV2A6FormalPreviewLeaseResultV1>>();
  source.activeRecords.forEach((candidate, index) => {
    const record = exactExternalRecord(candidate, ACTIVE_RECORD_KEYS, `A6.12b active[${index}]`);
    if (record.schemaVersion !== 1
      || record.epochId !== epochId
      || record.screenId !== source.screenId
      || record.kind !== 'weapon') {
      throw new RangeError(`A6.12b active[${index}]只能是当前screen正式武器。`);
    }
    const leaseId = text(record.visibleSlotLeaseId, `A6.12b active[${index}].leaseId`, 200);
    const requestIdentity = text(
      record.requestIdentity,
      `A6.12b active[${index}].requestIdentity`,
      128,
    );
    const definitionId = text(record.definitionId, `A6.12b active[${index}].definitionId`, 300);
    const assetId = text(record.assetId, `A6.12b active[${index}].assetId`, 300);
    integer(record.ordinal, `A6.12b active[${index}].ordinal`, 1);
    integer(record.activationSequence, `A6.12b active[${index}].activationSequence`, 1);
    text(record.catalogContentHash, `A6.12b active[${index}].catalogContentHash`, 128);
    text(record.requestToken, `A6.12b active[${index}].requestToken`, 300);
    text(record.releaseToken, `A6.12b active[${index}].releaseToken`, 300);
    if (ids.has(leaseId) || !isNativePromise(record.leaseResultPromise)
      || promises.has(record.leaseResultPromise)) {
      throw new RangeError('A6.12b active lease或Promise重复/非原生。');
    }
    ids.add(leaseId);
    promises.add(record.leaseResultPromise);
    if (record.settlementState !== 'pending'
      && record.settlementState !== 'ready'
      && record.settlementState !== 'fallback') {
      throw new RangeError('A6.12b settlementState不受支持。');
    }
    if (record.settlementState === 'pending' && record.settledResult !== null) {
      throw new RangeError('A6.12b pending record不得预填settledResult。');
    }
    if (record.settlementState !== 'pending') {
      const settled = parseLeaseResult(record.settledResult, leaseId, requestIdentity, assetId);
      if (settled.status !== record.settlementState) {
        throw new RangeError('A6.12b settlementState/result不闭合。');
      }
    }
    active.push(Object.freeze({
      source: candidate as ArenaV2CollectionVisiblePreviewActiveLeaseRecordV1,
      leaseResultPromise: record.leaseResultPromise,
      canonicalWithoutPromiseOrHandle: canonical({
        epochId,
        catalogContentHash: record.catalogContentHash,
        screenId: record.screenId,
        activationSequence: record.activationSequence,
        leaseId,
        definitionId,
        assetId,
        ordinal: record.ordinal,
        requestToken: record.requestToken,
        releaseToken: record.releaseToken,
        requestIdentity,
        settlementState: record.settlementState,
      }, 'A6.12b active record canonical'),
    }));
  });
  if (!Array.isArray(source.fallbackSlots)
    || !Array.isArray(source.releaseBarrierProofs)
    || source.fallbackSlots.length > MAX_ACTIVE
    || source.releaseBarrierProofs.length > MAX_ACTIVE) {
    throw new RangeError('A6.12b fallback/proof数组超出有界范围。');
  }
  const fallbackValues = source.fallbackSlots.map((candidate, index) => {
    const fallback = exactRecord(
      cloneFrozenData(candidate, `A6.12b execution fallback[${index}]`),
      EXECUTION_FALLBACK_KEYS,
      `A6.12b execution fallback[${index}]`,
    );
    if (fallback.schemaVersion !== 1
      || (fallback.kind !== 'weapon' && fallback.kind !== 'map')
      || fallback.reason !== (fallback.kind === 'map'
        ? 'map-formal-preview-not-approved'
        : 'missing-or-unapproved-weapon')
      || fallback.previewSourceUse !== 'text-shape-pattern-fallback-only'
      || fallback.fallbackContent !== 'text-shape-pattern-only'
      || fallback.requestPermitted !== false) {
      throw new RangeError(`A6.12b execution fallback[${index}]合同不闭合。`);
    }
    const ordinal = integer(fallback.ordinal, `A6.12b execution fallback[${index}].ordinal`, 1);
    const definitionId = text(
      fallback.definitionId,
      `A6.12b execution fallback[${index}].definitionId`,
      300,
    );
    const assetId = text(
      fallback.assetId,
      `A6.12b execution fallback[${index}].assetId`,
      300,
    );
    return Object.freeze({
      schemaVersion: 1 as const,
      kind: fallback.kind,
      definitionId,
      assetId,
      ordinal,
      reason: fallback.reason,
      previewSourceUse: fallback.previewSourceUse,
      fallbackContent: fallback.fallbackContent,
      requestPermitted: false as const,
    });
  });
  if (new Set(fallbackValues.map((fallback) => layoutIdentity(
    fallback.definitionId,
    fallback.assetId,
    fallback.ordinal,
  ))).size !== fallbackValues.length) {
    throw new RangeError('A6.12b execution fallback身份重复。');
  }
  const proofLeaseIds = new Set<string>();
  const proofValues = source.releaseBarrierProofs.map((candidate, index) => {
    const proof = exactRecord(
      cloneFrozenData(candidate, `A6.12b execution proof[${index}]`),
      PROOF_KEYS,
      `A6.12b execution proof[${index}]`,
    );
    if (proof.schemaVersion !== 1 || proof.destroyed !== true) {
      throw new RangeError(`A6.12b execution proof[${index}]合同不闭合。`);
    }
    const leaseId = text(
      proof.visibleSlotLeaseId,
      `A6.12b execution proof[${index}].leaseId`,
      200,
    );
    const requestIdentity = text(
      proof.requestIdentity,
      `A6.12b execution proof[${index}].requestIdentity`,
      128,
    );
    if (proofLeaseIds.has(leaseId)) throw new RangeError('A6.12b execution proof lease重复。');
    proofLeaseIds.add(leaseId);
    return publicProof(leaseId, requestIdentity);
  });
  const readyCount = active.filter(({ source: record }) => record.settlementState === 'ready').length;
  const leaseFallbackCount = active
    .filter(({ source: record }) => record.settlementState === 'fallback').length;
  if (source.assetReadyCount !== readyCount
    || source.leaseFallbackCount !== leaseFallbackCount
    || source.staticFallbackCount !== fallbackValues.length) {
    throw new RangeError('A6.12b execution settlement/fallback计数漂移。');
  }
  const fallbackCanonical = canonical(fallbackValues, 'A6.12b execution fallbackSlots');
  const proofCanonical = canonical(proofValues, 'A6.12b execution proofs');
  return Object.freeze({
    sourceObject: value as object,
    epochId,
    tick,
    screenId: source.screenId as ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1['screenId'],
    planIdentity,
    activeRecords: Object.freeze(active),
    fallbackCanonical,
    proofCanonical,
    canonicalWithoutPromiseOrHandle: canonical({
      epochId,
      tick,
      screenId: source.screenId,
      planIdentity,
      activeRecords: active.map(({ canonicalWithoutPromiseOrHandle }) => canonicalWithoutPromiseOrHandle),
      fallbackCanonical,
      proofCanonical,
    }, 'A6.12b execution canonical'),
  });
}

function publicProof(leaseId: string, requestIdentity: string): ArenaV2A6BeforeReleaseDestroyedProofV1 {
  return Object.freeze({
    schemaVersion: 1 as const,
    visibleSlotLeaseId: leaseId,
    requestIdentity,
    destroyed: true as const,
  });
}

function isContractError(error: unknown): boolean {
  return error instanceof TypeError || error instanceof RangeError;
}

export class ArenaV2CollectionPreviewMountLifecycleDestroyProofOwnerCandidateV1
implements ArenaV2A6BeforeReleaseDestroyedProofReaderPortV1 {
  #state: ArenaV2CollectionPreviewMountLifecycleOwnerStateV1 = 'active';
  #binding: ParsedBindingV1;
  #mountOwner: ArenaV2WeaponCollectionPreviewThreeMountOwnerCandidateV1;
  #records = new Map<string, MountedActiveRecordV1>();
  #proofHistory = new Map<string, ProofTombstoneV1>();
  #settlementDiagnostics: readonly string[] = Object.freeze([]);
  #mountSequences = new Map<string, number>();
  #prepared: PreparedReleaseV1 | null = null;
  #destroyPrepared = false;
  #lastTick: number;
  #lastExecutionTick = -1;
  #lastExecutionCanonical: string | null = null;
  #lastExecutionSnapshot: ArenaV2CollectionPreviewMountLifecycleSnapshotV1 | null = null;
  #lastPlanCanonicalByIdentity = new Map<string, string>();
  #lastCompletedPlanIdentity: string | null = null;
  #lastCompletedPlanOutcome: 'committed' | 'rolled-back' | null = null;
  #lastRollbackCanonical: string | null = null;
  #committedExecutionResults = new WeakSet<object>();
  #staticFallbackCount = 0;
  #callbackActive = false;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #snapshot: ArenaV2CollectionPreviewMountLifecycleSnapshotV1;
  #lastPrepareDestroyResult: ArenaV2CollectionPreviewMountLifecyclePrepareOwnerDestroyResultV1 | null = null;

  constructor(value: unknown) {
    const source = exactRecord(
      cloneFrozenData(value, 'A6.12b constructor'),
      OWNER_KEYS,
      'A6.12b constructor',
    );
    if (source.schemaVersion !== 1) throw new RangeError('A6.12b constructor.schemaVersion必须为1。');
    this.#binding = parseBinding(source.bindingSnapshot, 'A6.12b constructor.bindingSnapshot');
    this.#mountOwner = new ArenaV2WeaponCollectionPreviewThreeMountOwnerCandidateV1({
      schemaVersion: 1,
      bindingSnapshot: this.#binding.snapshot,
    });
    this.#lastTick = this.#binding.tick;
    this.#snapshot = this.#runSynchronousOperation(
      'constructor-snapshot',
      () => this.#makeSnapshot(),
    );
  }

  get state(): ArenaV2CollectionPreviewMountLifecycleOwnerStateV1 {
    this.#assertNoOperation('state read');
    return this.#state;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) {
      const error = new RangeError(`A6.12b ${this.#operation}期间拒绝${operation}。`);
      this.#reentrySequence += 1;
      this.#reentryError ??= error;
      throw this.#reentryError;
    }
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) throw new Error('A6.12b缺少当前操作所有权。');
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    let failed = false;
    let failureValue: unknown = null;
    let result!: T;
    try {
      result = run();
    } catch (error) {
      failed = true;
      failureValue = error;
    } finally {
      if (this.#operation === operation) this.#operation = null;
    }
    const reentryError = this.#reentryError;
    this.#reentryError = null;
    if (reentryError !== null) {
      this.#state = 'failed';
      throw failed && failureValue !== reentryError
        ? new AggregateError([failureValue, reentryError], `A6.12b ${operation}失败且同步重入。`)
        : reentryError;
    }
    if (failed) throw failureValue;
    return result;
  }

  #assertCallable(operation: string, allowDestroyPrepared = false): void {
    if (this.#callbackActive) {
      const error = new RangeError(`${operation}拒绝Promise回调重入。`);
      this.#reentrySequence += 1;
      this.#reentryError ??= error;
      throw this.#reentryError;
    }
    if (this.#state === 'destroyed' || this.#state === 'destroy-incomplete') {
      throw new RangeError(`${operation}拒绝状态${this.#state}。`);
    }
    if (this.#state === 'failed') throw new RangeError(`${operation}拒绝failed状态。`);
    if (!allowDestroyPrepared && this.#state === 'destroy-prepared') {
      throw new RangeError(`${operation}拒绝destroy-prepared状态。`);
    }
  }

  #makeSnapshot(): ArenaV2CollectionPreviewMountLifecycleSnapshotV1 {
    const mounts = Object.freeze(
      [...this.#records.values()]
        .filter((record) => record.mount !== null)
        .map((record) => record.mount!),
    );
    const mountOwnerSnapshot = this.#mountOwner.getSnapshot();
    this.#assertCurrentOperationCommit();
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      hardGate: false as const,
      defaultSurfaceWired: false as const,
      state: this.#state,
      epochId: this.#binding.epochId,
      catalogContentHash: this.#binding.catalogContentHash,
      lastTick: this.#lastTick,
      activeLeaseCount: this.#records.size,
      pendingLeaseCount: [...this.#records.values()]
        .filter(({ settlementState }) => settlementState === 'pending').length,
      readyLeaseCount: [...this.#records.values()]
        .filter(({ settlementState }) => settlementState === 'ready').length,
      fallbackLeaseCount: [...this.#records.values()]
        .filter(({ settlementState }) => settlementState === 'fallback').length,
      staticFallbackCount: this.#staticFallbackCount,
      mountedCount: mounts.length,
      preparedReleaseLeaseCount: this.#prepared?.records.length ?? 0,
      proofHistoryCount: this.#proofHistory.size,
      lateSettlementDiagnosticCount: this.#settlementDiagnostics.length,
      destroyPrepared: this.#destroyPrepared,
      activeMounts: mounts,
      a6_9State: mountOwnerSnapshot.state,
      ownsOrReleasesA6_6: false as const,
      loadsGltf: false as const,
      createsRenderer: false as const,
      createsDom: false as const,
      createsRaf: false as const,
    });
  }

  #publishSnapshot(): void {
    this.#snapshot = this.#makeSnapshot();
    if (this.#lastExecutionSnapshot !== null) this.#lastExecutionSnapshot = this.#snapshot;
  }

  #fail(): void {
    this.#state = 'failed';
    try { this.#publishSnapshot(); } catch { /* 保留失败所有权，不向Promise链二次抛错。 */ }
  }

  #recordLate(leaseId: string, code: string): void {
    const next = [...this.#settlementDiagnostics, `${leaseId}:${code}`];
    this.#settlementDiagnostics = Object.freeze(
      next.slice(Math.max(0, next.length - MAX_LATE_DIAGNOSTICS)),
    );
    if (this.#state !== 'destroyed') {
      try { this.#publishSnapshot(); } catch { /* 迟到诊断不能复活或破坏Owner。 */ }
    }
  }

  #nextMountId(record: MountedActiveRecordV1): string {
    const key = canonical([record.screenId, record.assetId], 'A6.12b mount sequence key');
    if (!this.#mountSequences.has(key) && this.#mountSequences.size >= MAX_MOUNT_SEQUENCE_KEYS) {
      throw new RangeError('A6.12b mount sequence键超过20武器×2页面上限。');
    }
    const previous = this.#mountSequences.get(key) ?? 0;
    if (!Number.isSafeInteger(previous + 1)) throw new RangeError('A6.12b mount sequence耗尽。');
    const next = previous + 1;
    const mountId = `a6.12b:${record.leaseId}:${next}`;
    if (mountId.length > MAX_MOUNT_ID_LENGTH) {
      throw new RangeError('A6.12b结构化mountId超过256字符。');
    }
    this.#mountSequences.set(key, next);
    return mountId;
  }

  #mountRecord(record: MountedActiveRecordV1, tick: number): void {
    if (record.settlementState !== 'ready' || record.settledResult?.status !== 'ready') return;
    if (record.preparedPlanIdentity !== null || this.#destroyPrepared) return;
    if (record.mount !== null) return;
    const mountId = this.#nextMountId(record);
    const mount = this.#mountOwner.mount({
      schemaVersion: 1,
      mountId,
      tick,
      bindingSnapshot: record.bindingSnapshot,
      slot: record.layout.slot,
      leaseResult: record.settledResult,
      screenId: record.layout.screenId,
      viewport: record.layout.viewport,
      previewRectCssPixels: record.layout.previewRectCssPixels,
      reducedMotion: record.layout.reducedMotion,
    });
    this.#assertCurrentOperationCommit();
    record.mountId = mountId;
    record.mount = mount;
  }

  #destroyRecordMount(record: MountedActiveRecordV1, tick: number): void {
    if (record.mount === null || record.mountId === null) return;
    this.#mountOwner.destroyMount({ schemaVersion: 1, mountId: record.mountId, tick });
    this.#assertCurrentOperationCommit();
    record.mount = null;
    record.mountId = null;
  }

  #continueMountCleanupAfterFailure(): void {
    try {
      this.#mountOwner.destroy();
      this.#assertCurrentOperationCommit();
    } catch (error) {
      if (this.#reentryError !== null) throw error;
    }
    const snapshot = this.#mountOwner.getSnapshot();
    this.#assertCurrentOperationCommit();
    if (snapshot.activeMountCount === 0) {
      for (const record of this.#records.values()) {
        record.mount = null;
        record.mountId = null;
      }
    }
  }

  #settle(record: MountedActiveRecordV1, value: unknown): void {
    const current = this.#records.get(record.leaseId);
    if (current !== record || current.leaseResultPromise !== record.leaseResultPromise) {
      const status = typeof value === 'object' && value !== null
        ? Object.getOwnPropertyDescriptor(value, 'status')?.value
        : 'invalid';
      this.#recordLate(record.leaseId, `late-${String(status)}`);
      return;
    }
    const result = parseLeaseResult(value, record.leaseId, record.requestIdentity, record.assetId);
    if (this.#state !== 'active' || this.#destroyPrepared) {
      this.#recordLate(record.leaseId, `inactive-${result.status}`);
      return;
    }
    if (record.settlementState !== 'pending') {
      if (record.settledResult === result && record.settlementState === result.status) return;
      throw new RangeError('A6.12b同lease settlement事实或handle漂移。');
    }
    record.settledResult = result;
    record.settlementState = result.status;
    if (result.status === 'ready') this.#mountRecord(record, record.layoutTick);
    this.#publishSnapshot();
  }

  #observeSettlement(record: MountedActiveRecordV1): void {
    Reflect.apply(NATIVE_PROMISE_THEN, record.leaseResultPromise, [
      (value: unknown) => {
        try {
          this.#runSynchronousOperation('lease-settled', () => {
            this.#callbackActive = true;
            try {
              this.#settle(record, value);
              this.#assertCurrentOperationCommit();
            } finally {
              this.#callbackActive = false;
            }
          });
        } catch {
          try {
            this.#runSynchronousOperation('lease-settled-failure', () => this.#fail());
          } catch { this.#state = 'failed'; }
        }
      },
      () => {
        try {
          this.#runSynchronousOperation('lease-rejected', () => {
            this.#callbackActive = true;
            try {
              if (this.#records.get(record.leaseId) === record
                && this.#state === 'active'
                && !this.#destroyPrepared) this.#fail();
              else this.#recordLate(record.leaseId, 'late-rejection');
            } finally {
              this.#callbackActive = false;
            }
          });
        } catch {
          try {
            this.#runSynchronousOperation('lease-rejected-failure', () => this.#fail());
          } catch { this.#state = 'failed'; }
        }
      },
    ]);
  }

  #setProof(tombstone: ProofTombstoneV1): void {
    const leaseId = tombstone.proof.visibleSlotLeaseId;
    const existing = this.#proofHistory.get(leaseId);
    if (existing !== undefined) {
      if (existing.tick === tombstone.tick
        && existing.assetId === tombstone.assetId
        && existing.proof.requestIdentity === tombstone.proof.requestIdentity
        && existing.proof.destroyed === true) return;
      throw new RangeError('A6.12b同lease proof身份冲突。');
    }
    this.#proofHistory.set(leaseId, tombstone);
    while (this.#proofHistory.size > MAX_PROOF_HISTORY) {
      const protectedIds = new Set([
        ...this.#records.keys(),
        ...(this.#prepared?.records.map(({ record }) => record.leaseId) ?? []),
      ]);
      const removable = [...this.#proofHistory.keys()].find((id) => !protectedIds.has(id));
      if (removable === undefined) throw new RangeError('A6.12b proof历史无法有界淘汰。');
      this.#proofHistory.delete(removable);
    }
  }

  #validateLayoutAndExecution(
    layout: ParsedLayoutV1,
    execution: ParsedExecutionV1,
  ): ReadonlyMap<string, ArenaV2CollectionVisibleWeaponMountLayoutV1> {
    if (layout.epochId !== this.#binding.epochId
      || execution.epochId !== this.#binding.epochId
      || layout.catalogContentHash !== this.#binding.catalogContentHash
      || layout.waterlineCanonical !== this.#binding.waterlineCanonical
      || layout.tick !== execution.tick
      || layout.screenId !== execution.screenId) {
      throw new RangeError('A6.12b execution/layout/constructor epoch、tick、screen或catalog漂移。');
    }
    const layoutsByLease = new Map<string, ArenaV2CollectionVisibleWeaponMountLayoutV1>();
    const matchedLayouts = new Set<string>();
    for (const parsedRecord of execution.activeRecords) {
      const record = parsedRecord.source;
      if (record.catalogContentHash !== this.#binding.catalogContentHash) {
        throw new RangeError('A6.12b active record catalog漂移。');
      }
      const identity = layoutIdentity(record.definitionId, record.assetId, record.ordinal);
      const mountLayout = layout.mountLayoutsByIdentity.get(identity);
      if (mountLayout === undefined || matchedLayouts.has(identity)) {
        throw new RangeError('A6.12b active record与fully-visible mount layout不一一对应。');
      }
      matchedLayouts.add(identity);
      if (record.requestToken !== mountLayout.slot.lifecycle.requestToken
        || record.releaseToken !== mountLayout.slot.lifecycle.releaseToken) {
        throw new RangeError('A6.12b active record token与A6.12a slot漂移。');
      }
      layoutsByLease.set(record.visibleSlotLeaseId, mountLayout);
    }
    if (matchedLayouts.size !== layout.mountLayouts.length) {
      throw new RangeError('A6.12b存在无active lease的mount layout。');
    }
    if (execution.fallbackCanonical !== layout.staticFallbackCanonical) {
      throw new RangeError('A6.12b execution fallback与A6.12a static fallback漂移。');
    }
    return layoutsByLease;
  }

  commitExecution(value: unknown): ArenaV2CollectionPreviewMountLifecycleSnapshotV1 {
    return this.#runSynchronousOperation('commit-execution', () => {
    this.#assertCallable('A6.12b commitExecution');
    const source = exactExternalRecord(value, COMMIT_EXECUTION_KEYS, 'A6.12b commitExecution');
    if (source.schemaVersion !== 1) throw new RangeError('A6.12b commitExecution.schemaVersion必须为1。');
    const layout = parseLayout(source.layoutSnapshot);
    const execution = parseExecution(source.executionResult);
    const layoutsByLease = this.#validateLayoutAndExecution(layout, execution);
    const inputCanonical = canonical({
      layout: layout.inputCanonical,
      execution: execution.canonicalWithoutPromiseOrHandle,
    }, 'A6.12b commitExecution input');
    if (this.#prepared !== null) {
      throw new RangeError('A6.12b必须先commitRelease或rollbackPreparedRelease。');
    }
    if (execution.tick < this.#lastExecutionTick) throw new RangeError('A6.12b execution tick回退。');
    if (execution.tick === this.#lastExecutionTick && this.#lastExecutionCanonical !== null) {
      if (inputCanonical !== this.#lastExecutionCanonical || this.#lastExecutionSnapshot === null) {
        throw new RangeError('A6.12b同tick execution/layout冲突。');
      }
      for (const parsed of execution.activeRecords) {
      if (this.#records.get(parsed.source.visibleSlotLeaseId)?.leaseResultPromise
          !== parsed.leaseResultPromise) {
          throw new RangeError('A6.12b同tick replay替换了原生Promise。');
        }
        const existing = this.#records.get(parsed.source.visibleSlotLeaseId);
        if (existing?.settlementState !== parsed.source.settlementState
          || (parsed.source.settlementState !== 'pending'
            && existing.settledResult !== parsed.source.settledResult)) {
          throw new RangeError('A6.12b同tick replay替换了settlement事实或handle。');
        }
      }
      return this.#lastExecutionSnapshot;
    }
    const nextIds = new Set(execution.activeRecords.map(({ source: record }) => (
      record.visibleSlotLeaseId
    )));
    for (const leaseId of this.#records.keys()) {
      if (!nextIds.has(leaseId)) {
        throw new RangeError('A6.12b execution遗漏旧active；必须先提交release事务。');
      }
    }
    for (const parsed of execution.activeRecords) {
      const publicRecord = parsed.source;
      const existing = this.#records.get(publicRecord.visibleSlotLeaseId);
      if (existing !== undefined && (
        existing.requestIdentity !== publicRecord.requestIdentity
        || existing.definitionId !== publicRecord.definitionId
        || existing.assetId !== publicRecord.assetId
        || existing.ordinal !== publicRecord.ordinal
        || existing.screenId !== publicRecord.screenId
        || existing.leaseResultPromise !== parsed.leaseResultPromise
        || existing.settlementState !== publicRecord.settlementState
        || (publicRecord.settlementState !== 'pending'
          && existing.settledResult !== publicRecord.settledResult)
      )) throw new RangeError('A6.12b retained active record身份或Promise漂移。');
    }
    let mutationStarted = false;
    try {
      for (const parsed of execution.activeRecords) {
        const publicRecord = parsed.source;
        const layoutValue = layoutsByLease.get(publicRecord.visibleSlotLeaseId);
        if (layoutValue === undefined) throw new Error('A6.12b预检后mount layout丢失。');
        const layoutCanonical = canonical(layoutValue, 'A6.12b mount layout');
        let record = this.#records.get(publicRecord.visibleSlotLeaseId);
        if (record === undefined) {
          record = {
            leaseId: publicRecord.visibleSlotLeaseId,
            requestIdentity: publicRecord.requestIdentity,
            definitionId: publicRecord.definitionId,
            assetId: publicRecord.assetId,
            ordinal: publicRecord.ordinal,
            screenId: publicRecord.screenId as 'weapon-index' | 'weapon-detail',
            leaseResultPromise: parsed.leaseResultPromise,
            settlementState: 'pending',
            settledResult: null,
            layout: layoutValue,
            layoutCanonical,
            bindingSnapshot: layout.bindingSnapshot,
            layoutTick: layout.tick,
            mount: null,
            mountId: null,
            preparedPlanIdentity: null,
          };
          mutationStarted = true;
          this.#records.set(record.leaseId, record);
          if (publicRecord.settlementState !== 'pending') {
            record.settledResult = parseLeaseResult(
              publicRecord.settledResult,
              record.leaseId,
              record.requestIdentity,
              record.assetId,
            );
            record.settlementState = record.settledResult.status;
          }
          this.#observeSettlement(record);
          this.#mountRecord(record, layout.tick);
        } else {
          const layoutChanged = record.layoutCanonical !== layoutCanonical;
          if (layoutChanged && record.mount !== null) {
            mutationStarted = true;
            this.#destroyRecordMount(record, layout.tick);
          }
          record.layout = layoutValue;
          record.layoutCanonical = layoutCanonical;
          record.bindingSnapshot = layout.bindingSnapshot;
          record.layoutTick = layout.tick;
          if (layoutChanged) this.#mountRecord(record, layout.tick);
        }
      }
      this.#staticFallbackCount = layout.snapshot.visibleStaticFallbackLayouts.length;
      this.#lastTick = Math.max(this.#lastTick, execution.tick);
      this.#lastExecutionTick = execution.tick;
      this.#lastExecutionCanonical = inputCanonical;
      this.#state = 'active';
      this.#publishSnapshot();
      this.#lastExecutionSnapshot = this.#snapshot;
      return this.#snapshot;
    } catch (error) {
      if (mutationStarted || !isContractError(error)) this.#fail();
      throw error;
    }
    });
  }

  prepareRelease(
    value: unknown,
  ): ArenaV2CollectionPreviewMountLifecyclePrepareReleaseResultV1 {
    return this.#runSynchronousOperation('prepare-release', () => {
    this.#assertCallable('A6.12b prepareRelease');
    const cloned = cloneFrozenData(value, 'A6.12b prepareRelease');
    const source = exactRecord(cloned, PREPARE_RELEASE_KEYS, 'A6.12b prepareRelease');
    if (source.schemaVersion !== 1) throw new RangeError('A6.12b prepareRelease.schemaVersion必须为1。');
    const planIdentity = text(source.planIdentity, 'A6.12b prepareRelease.planIdentity', 256);
    const tick = integer(source.tick, 'A6.12b prepareRelease.tick');
    if (tick < this.#lastTick) throw new RangeError('A6.12b prepareRelease tick回退。');
    if (!Array.isArray(source.releaseCommands) || source.releaseCommands.length > MAX_ACTIVE) {
      throw new RangeError('A6.12b releaseCommands最多20项。');
    }
    const inputCanonical = canonical(cloned, 'A6.12b prepareRelease');
    const knownCanonical = this.#lastPlanCanonicalByIdentity.get(planIdentity);
    if (knownCanonical !== undefined && knownCanonical !== inputCanonical) {
      throw new RangeError('A6.12b同planIdentity release事实冲突。');
    }
    if (this.#prepared !== null) {
      if (this.#prepared.planIdentity === planIdentity
        && this.#prepared.inputCanonical === inputCanonical) return this.#prepared.result;
      throw new RangeError('A6.12b已有另一prepared release事务。');
    }
    if (this.#lastCompletedPlanIdentity === planIdentity) {
      throw new RangeError('A6.12b已完成plan不得再次prepare。');
    }
    const seen = new Set<string>();
    const records = source.releaseCommands.map((candidate, index) => {
      const command = exactRecord(candidate, RELEASE_COMMAND_KEYS, `A6.12b release[${index}]`);
      if (command.schemaVersion !== 1 || command.tick !== tick) {
        throw new RangeError(`A6.12b release[${index}] schema/tick不闭合。`);
      }
      const leaseId = text(command.visibleSlotLeaseId, `A6.12b release[${index}].leaseId`, 200);
      const record = this.#records.get(leaseId);
      if (seen.has(leaseId) || record === undefined) {
        throw new RangeError('A6.12b release重复或引用未知active lease。');
      }
      if (command.releaseToken !== record.layout.slot.lifecycle.releaseToken
        || record.preparedPlanIdentity !== null) {
        throw new RangeError('A6.12b release token或prepared身份漂移。');
      }
      seen.add(leaseId);
      return Object.freeze({
        record,
        priorLayout: record.layout,
        priorLayoutCanonical: record.layoutCanonical,
        priorBindingSnapshot: record.bindingSnapshot,
      });
    });
    let mutationStarted = false;
    const proofs: ArenaV2A6BeforeReleaseDestroyedProofV1[] = [];
    try {
      for (const prepared of records) {
        mutationStarted = true;
        this.#destroyRecordMount(prepared.record, tick);
        prepared.record.preparedPlanIdentity = planIdentity;
        const proof = publicProof(prepared.record.leaseId, prepared.record.requestIdentity);
        this.#setProof(Object.freeze({
          planIdentity,
          tick,
          assetId: prepared.record.assetId,
          proof,
        }));
        proofs.push(proof);
      }
      const result = Object.freeze({
        schemaVersion: 1 as const,
        status: 'production-unreachable' as const,
        validationStatus: 'not-run' as const,
        planIdentity,
        tick,
        preparedLeaseCount: records.length,
        proofs: Object.freeze(proofs),
        allMountsDestroyedBeforeRelease: true as const,
      });
      this.#prepared = Object.freeze({
        planIdentity,
        tick,
        inputCanonical,
        records: Object.freeze(records),
        result,
      });
      this.#lastPlanCanonicalByIdentity.set(planIdentity, inputCanonical);
      while (this.#lastPlanCanonicalByIdentity.size > MAX_PROOF_HISTORY) {
        const oldest = this.#lastPlanCanonicalByIdentity.keys().next().value as string | undefined;
        if (oldest === undefined) break;
        this.#lastPlanCanonicalByIdentity.delete(oldest);
      }
      this.#lastTick = Math.max(this.#lastTick, tick);
      this.#publishSnapshot();
      return result;
    } catch (error) {
      if (mutationStarted) {
        this.#continueMountCleanupAfterFailure();
        this.#fail();
      }
      throw error;
    }
    });
  }

  readDestroyedProof(
    value: ArenaV2A6BeforeReleaseDestroyedProofReadInputV1,
  ): ArenaV2A6BeforeReleaseDestroyedProofV1 {
    return this.#runSynchronousOperation('read-destroyed-proof', () => {
    if (this.#state === 'destroyed' || this.#state === 'failed') {
      throw new RangeError(`A6.12b readDestroyedProof拒绝状态${this.#state}。`);
    }
    const source = exactRecord(
      cloneFrozenData(value, 'A6.12b proof read'),
      PROOF_READ_KEYS,
      'A6.12b proof read',
    );
    if (source.schemaVersion !== 1 || source.epochId !== this.#binding.epochId) {
      throw new RangeError('A6.12b proof read schema/epoch漂移。');
    }
    const tick = integer(source.tick, 'A6.12b proof read.tick');
    const leaseId = text(source.visibleSlotLeaseId, 'A6.12b proof read.leaseId', 200);
    const requestIdentity = text(source.requestIdentity, 'A6.12b proof read.requestIdentity', 128);
    const assetId = text(source.assetId, 'A6.12b proof read.assetId', 300);
    const tombstone = this.#proofHistory.get(leaseId);
    if (tombstone === undefined
      || tombstone.tick !== tick
      || tombstone.assetId !== assetId
      || tombstone.proof.requestIdentity !== requestIdentity) {
      throw new RangeError('A6.12b destroyed proof不存在或身份不闭合。');
    }
    return tombstone.proof;
    });
  }

  commitRelease(value: unknown): ArenaV2CollectionPreviewMountLifecycleSnapshotV1 {
    return this.#runSynchronousOperation('commit-release', () => {
    this.#assertCallable('A6.12b commitRelease');
    const source = exactExternalRecord(value, COMMIT_RELEASE_KEYS, 'A6.12b commitRelease');
    if (source.schemaVersion !== 1) throw new RangeError('A6.12b commitRelease.schemaVersion必须为1。');
    const planIdentity = text(source.planIdentity, 'A6.12b commitRelease.planIdentity', 256);
    const execution = parseExecution(source.executionResult);
    if (this.#prepared === null) {
      if (this.#lastCompletedPlanIdentity === planIdentity
        && this.#lastCompletedPlanOutcome === 'committed'
        && this.#committedExecutionResults.has(execution.sourceObject)) return this.#snapshot;
      throw new RangeError('A6.12b commitRelease缺少prepared事务。');
    }
    if (this.#prepared.planIdentity !== planIdentity
      || execution.planIdentity !== planIdentity
      || execution.tick !== this.#prepared.tick
      || execution.epochId !== this.#binding.epochId
      || this.#prepared.records.some(({ record }) => record.screenId !== execution.screenId)) {
      throw new RangeError('A6.12b commitRelease plan/tick漂移。');
    }
    const preparedIds = new Set(this.#prepared.records.map(({ record }) => record.leaseId));
    if (execution.activeRecords.some(({ source: record }) => preparedIds.has(record.visibleSlotLeaseId))) {
      throw new RangeError('A6.12b execution仍包含应释放lease。');
    }
    const executionByLease = new Map(execution.activeRecords.map((parsed) => [
      parsed.source.visibleSlotLeaseId,
      parsed,
    ]));
    for (const current of this.#records.values()) {
      if (preparedIds.has(current.leaseId)) continue;
      const parsed = executionByLease.get(current.leaseId);
      const record = parsed?.source;
      if (record === undefined
        || record.requestIdentity !== current.requestIdentity
        || record.definitionId !== current.definitionId
        || record.assetId !== current.assetId
        || record.ordinal !== current.ordinal
        || record.screenId !== current.screenId
        || parsed?.leaseResultPromise !== current.leaseResultPromise
        || record.settlementState !== current.settlementState
        || (record.settlementState !== 'pending'
          && record.settledResult !== current.settledResult)) {
        throw new RangeError('A6.12b commitRelease遗漏或篡改了未释放active lease。');
      }
    }
    const expectedProofCanonical = canonical(
      this.#prepared.result.proofs,
      'A6.12b prepared proofs',
    );
    if (execution.proofCanonical !== expectedProofCanonical) {
      throw new RangeError('A6.12b execution release proof与prepared事务漂移。');
    }
    for (const { record } of this.#prepared.records) {
      if (record.mount !== null || record.mountId !== null
        || record.preparedPlanIdentity !== planIdentity) {
        throw new Error('A6.12b commitRelease前mount销毁事实丢失。');
      }
    }
    for (const { record } of this.#prepared.records) this.#records.delete(record.leaseId);
    this.#committedExecutionResults.add(execution.sourceObject);
    this.#lastCompletedPlanIdentity = planIdentity;
    this.#lastCompletedPlanOutcome = 'committed';
    this.#lastRollbackCanonical = null;
    this.#prepared = null;
    this.#lastExecutionSnapshot = null;
    this.#lastTick = Math.max(this.#lastTick, execution.tick);
    this.#publishSnapshot();
    return this.#snapshot;
    });
  }

  rollbackPreparedRelease(value: unknown): ArenaV2CollectionPreviewMountLifecycleSnapshotV1 {
    return this.#runSynchronousOperation('rollback-release', () => {
    this.#assertCallable('A6.12b rollbackPreparedRelease');
    const cloned = cloneFrozenData(value, 'A6.12b rollback');
    const source = exactRecord(cloned, ROLLBACK_KEYS, 'A6.12b rollback');
    if (source.schemaVersion !== 1) throw new RangeError('A6.12b rollback.schemaVersion必须为1。');
    const planIdentity = text(source.planIdentity, 'A6.12b rollback.planIdentity', 256);
    const tick = integer(source.tick, 'A6.12b rollback.tick');
    const rollbackCanonical = canonical(cloned, 'A6.12b rollback');
    if (this.#prepared === null) {
      if (this.#lastCompletedPlanIdentity === planIdentity
        && this.#lastCompletedPlanOutcome === 'rolled-back'
        && this.#lastRollbackCanonical === rollbackCanonical) return this.#snapshot;
      throw new RangeError('A6.12b rollback缺少prepared事务。');
    }
    if (this.#prepared.planIdentity !== planIdentity || tick < this.#prepared.tick) {
      throw new RangeError('A6.12b rollback plan/tick漂移。');
    }
    if (source.resourceExecutorState !== 'active'
      || source.rejectionPhase !== 'before-resource-mutation') {
      this.#fail();
      throw new Error('A6.12b仅允许A6.11b资源变更前拒绝后的active状态回滚。');
    }
    try {
      for (const prepared of this.#prepared.records) {
        const { record } = prepared;
        record.layout = prepared.priorLayout;
        record.layoutCanonical = prepared.priorLayoutCanonical;
        record.bindingSnapshot = prepared.priorBindingSnapshot;
        record.layoutTick = tick;
        record.preparedPlanIdentity = null;
        if (record.settlementState === 'ready') this.#mountRecord(record, tick);
      }
      for (const { record } of this.#prepared.records) this.#proofHistory.delete(record.leaseId);
      this.#lastCompletedPlanIdentity = planIdentity;
      this.#lastCompletedPlanOutcome = 'rolled-back';
      this.#lastRollbackCanonical = rollbackCanonical;
      this.#prepared = null;
      this.#lastTick = Math.max(this.#lastTick, tick);
      this.#publishSnapshot();
      return this.#snapshot;
    } catch (error) {
      this.#fail();
      throw error;
    }
    });
  }

  prepareAllForOwnerDestroy(
    value: unknown,
  ): ArenaV2CollectionPreviewMountLifecyclePrepareOwnerDestroyResultV1 {
    return this.#runSynchronousOperation('prepare-owner-destroy', () => {
    const source = exactRecord(
      cloneFrozenData(value, 'A6.12b prepare owner destroy'),
      PREPARE_DESTROY_KEYS,
      'A6.12b prepare owner destroy',
    );
    if (source.schemaVersion !== 1) throw new RangeError('A6.12b destroy prepare.schemaVersion必须为1。');
    const tick = integer(source.tick, 'A6.12b destroy prepare.tick');
    if (this.#state === 'destroyed') {
      throw new RangeError('A6.12b prepareAllForOwnerDestroy拒绝destroyed状态。');
    }
    const retryingIncompleteDestroy = this.#state === 'destroy-incomplete';
    if (this.#lastPrepareDestroyResult !== null) {
      if (this.#lastPrepareDestroyResult.tick !== tick) {
        throw new RangeError('A6.12b destroy prepare已存在冲突事实。');
      }
      if (this.#state === 'destroy-prepared') {
        return this.#lastPrepareDestroyResult;
      }
      if (!retryingIncompleteDestroy) {
        throw new RangeError('A6.12b destroy prepare已存在冲突事实。');
      }
    }
    if (this.#state === 'destroy-prepared') {
      throw new RangeError(`A6.12b prepareAllForOwnerDestroy拒绝状态${this.#state}。`);
    }
    if (tick < this.#lastTick) throw new RangeError('A6.12b destroy prepare tick回退。');
    const enteredFailed = this.#state === 'failed';
    if (this.#prepared !== null && this.#prepared.tick !== tick) {
      throw new RangeError('A6.12b吸收prepared release时必须复用同tick proof。');
    }
    const planIdentity = `a6.12b:owner-destroy:${this.#binding.epochId}:${tick}`;
    const failures: string[] = [];
    let proofCount = 0;
    let cleanupFailed = false;
    if (enteredFailed || retryingIncompleteDestroy) {
      this.#continueMountCleanupAfterFailure();
      const mountSnapshot = this.#mountOwner.getSnapshot();
      this.#assertCurrentOperationCommit();
      cleanupFailed = mountSnapshot.state !== 'destroyed';
      if (cleanupFailed) {
        const retainedMountLeaseIds = [...this.#records.values()]
          .filter((record) => record.mount !== null || record.mountId !== null)
          .map((record) => record.leaseId);
        failures.push(...(
          retainedMountLeaseIds.length > 0
            ? retainedMountLeaseIds
            : (this.#lastPrepareDestroyResult?.failedMountLeaseIds ?? [])
        ));
      }
    }
    if (!cleanupFailed) {
      for (const record of this.#records.values()) {
        if (cleanupFailed) break;
        try {
          const existingProof = this.#proofHistory.get(record.leaseId);
          if (existingProof !== undefined) {
            if (existingProof.tick !== tick
              || existingProof.assetId !== record.assetId
              || existingProof.proof.requestIdentity !== record.requestIdentity
              || record.mount !== null
              || record.mountId !== null) {
              throw new RangeError('A6.12b prepared proof无法安全吸收进Owner destroy。');
            }
          } else {
            this.#destroyRecordMount(record, tick);
            const proof = publicProof(record.leaseId, record.requestIdentity);
            this.#setProof(Object.freeze({ planIdentity, tick, assetId: record.assetId, proof }));
          }
          record.preparedPlanIdentity = planIdentity;
          proofCount += 1;
        } catch (error) {
          if (this.#reentryError !== null) throw error;
          failures.push(record.leaseId);
          cleanupFailed = true;
        }
      }
    }
    if (cleanupFailed) {
      this.#continueMountCleanupAfterFailure();
      this.#state = 'destroy-incomplete';
    } else {
      this.#state = 'destroy-prepared';
    }
    this.#prepared = null;
    this.#destroyPrepared = true;
    this.#lastTick = Math.max(this.#lastTick, tick);
    const result = Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      validationStatus: 'not-run' as const,
      state: this.#state as 'destroy-prepared' | 'destroy-incomplete',
      tick,
      preparedLeaseCount: this.#records.size,
      proofCount,
      failedMountLeaseIds: Object.freeze(failures),
    });
    this.#lastPrepareDestroyResult = result;
    this.#publishSnapshot();
    return result;
    });
  }

  finalizeDestroy(value: unknown): ArenaV2CollectionPreviewMountLifecycleSnapshotV1 {
    return this.#runSynchronousOperation('finalize-destroy', () => {
    if (this.#state === 'destroyed') return this.#snapshot;
    const source = exactRecord(
      cloneFrozenData(value, 'A6.12b finalizeDestroy'),
      FINALIZE_DESTROY_KEYS,
      'A6.12b finalizeDestroy',
    );
    if (source.schemaVersion !== 1) throw new RangeError('A6.12b finalizeDestroy.schemaVersion必须为1。');
    const tick = integer(source.tick, 'A6.12b finalizeDestroy.tick');
    if (!this.#destroyPrepared || tick < this.#lastTick) {
      throw new RangeError('A6.12b finalizeDestroy缺少prepare或tick回退。');
    }
    if (source.resourceOwnerState !== 'destroyed') {
      this.#state = 'destroy-incomplete';
      this.#publishSnapshot();
      throw new Error('A6.12b A6.11b/A6.11c资源Owner未完整destroy。');
    }
    try {
      this.#mountOwner.destroy();
      this.#assertCurrentOperationCommit();
      this.#records.clear();
      this.#proofHistory.clear();
      this.#settlementDiagnostics = Object.freeze([]);
      this.#mountSequences.clear();
      this.#prepared = null;
      this.#staticFallbackCount = 0;
      this.#lastTick = Math.max(this.#lastTick, tick);
      this.#state = 'destroyed';
      this.#snapshot = this.#makeSnapshot();
      return this.#snapshot;
    } catch (error) {
      this.#state = 'destroy-incomplete';
      try { this.#publishSnapshot(); } catch { /* 保留可重试清理所有权。 */ }
      throw error;
    }
    });
  }

  resetPresentationEpoch(value: unknown): ArenaV2CollectionPreviewMountLifecycleSnapshotV1 {
    return this.#runSynchronousOperation('reset-epoch', () => {
    this.#assertCallable('A6.12b resetPresentationEpoch');
    const source = exactRecord(
      cloneFrozenData(value, 'A6.12b reset'),
      RESET_KEYS,
      'A6.12b reset',
    );
    if (source.schemaVersion !== 1) throw new RangeError('A6.12b reset.schemaVersion必须为1。');
    const tick = integer(source.tick, 'A6.12b reset.tick');
    if (tick < this.#lastTick) throw new RangeError('A6.12b reset旧epoch命令tick回退。');
    if (this.#records.size !== 0 || this.#prepared !== null || this.#destroyPrepared) {
      throw new RangeError('A6.12b reset只允许无active/prepared事务。');
    }
    const next = parseBinding(source.nextBindingSnapshot, 'A6.12b reset.nextBindingSnapshot');
    if (next.epochId === this.#binding.epochId) throw new RangeError('A6.12b reset必须切换新epoch。');
    const nextMountOwner = new ArenaV2WeaponCollectionPreviewThreeMountOwnerCandidateV1({
      schemaVersion: 1,
      bindingSnapshot: next.snapshot,
    });
    try {
      this.#mountOwner.destroy();
      this.#assertCurrentOperationCommit();
    } catch (error) {
      try { nextMountOwner.destroy(); } catch { /* 构造后的空Owner继续尽力释放。 */ }
      this.#fail();
      throw error;
    }
    this.#mountOwner = nextMountOwner;
    this.#binding = next;
    this.#proofHistory.clear();
    this.#settlementDiagnostics = Object.freeze([]);
    this.#mountSequences.clear();
    this.#lastPlanCanonicalByIdentity.clear();
    this.#lastCompletedPlanIdentity = null;
    this.#lastCompletedPlanOutcome = null;
    this.#lastRollbackCanonical = null;
    this.#lastExecutionTick = -1;
    this.#lastExecutionCanonical = null;
    this.#lastExecutionSnapshot = null;
    this.#committedExecutionResults = new WeakSet<object>();
    this.#staticFallbackCount = 0;
    this.#lastPrepareDestroyResult = null;
    this.#lastTick = next.tick;
    this.#publishSnapshot();
    return this.#snapshot;
    });
  }

  getSnapshot(): ArenaV2CollectionPreviewMountLifecycleSnapshotV1 {
    return this.#runSynchronousOperation('snapshot-read', () => {
    return this.#snapshot;
    });
  }
}
