import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
  type ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
  type ArenaV2A6FormalPreviewBindingSlotV1,
} from './arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';

export const ARENA_V2_A6_FORMAL_PREVIEW_LEASE_OWNER_SCHEMA_VERSION_V1 = 1 as const;
export const ARENA_V2_A6_FORMAL_PREVIEW_LEASE_OWNER_STATE_V1 = Object.freeze({
  ACTIVE: 'active',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
  DESTROY_INCOMPLETE: 'destroy-incomplete',
} as const);

export type ArenaV2A6FormalPreviewLeaseOwnerStateV1 =
  typeof ARENA_V2_A6_FORMAL_PREVIEW_LEASE_OWNER_STATE_V1[
    keyof typeof ARENA_V2_A6_FORMAL_PREVIEW_LEASE_OWNER_STATE_V1
  ];
export type ArenaV2A6FormalPreviewFailureCodeV1 =
  | 'load-rejected'
  | 'load-result-invalid'
  | 'released-before-ready'
  | 'epoch-reset-before-ready'
  | 'owner-destroyed-before-ready'
  | 'cancel-failed'
  | 'dispose-failed';

export interface ArenaV2A6FormalPreviewLoadRequestV1 {
  readonly schemaVersion: 1;
  readonly requestIdentity: string;
  readonly epochId: string;
  readonly catalogContentHash: string;
  readonly assetId: string;
  readonly sha256: string;
  readonly requestToken: string;
}

export interface ArenaV2A6FormalPreviewLoadOperationV1 {
  readonly promise: Promise<unknown>;
  readonly cancel: () => void;
}

export interface ArenaV2A6FormalPreviewLoaderPortV1 {
  load(request: ArenaV2A6FormalPreviewLoadRequestV1): ArenaV2A6FormalPreviewLoadOperationV1;
}

export interface ArenaV2A6FormalPreviewDisposeRequestV1 {
  readonly schemaVersion: 1;
  readonly requestIdentity: string;
  readonly epochId: string;
  readonly catalogContentHash: string;
  readonly assetId: string;
  readonly sha256: string;
  readonly handle: unknown;
}

export interface ArenaV2A6FormalPreviewDisposerPortV1 {
  dispose(request: ArenaV2A6FormalPreviewDisposeRequestV1): void;
}

export interface ArenaV2A6FormalPreviewLeaseAcquireInputV1 {
  readonly schemaVersion: 1;
  readonly tick: number;
  readonly visibleSlotLeaseId: string;
  readonly assetId: string;
  readonly requestToken: string;
}

export interface ArenaV2A6FormalPreviewLeaseReleaseInputV1 {
  readonly schemaVersion: 1;
  readonly tick: number;
  readonly visibleSlotLeaseId: string;
  readonly releaseToken: string;
}

export type ArenaV2A6FormalPreviewLeaseResultV1 = Readonly<{
  readonly schemaVersion: 1;
  readonly status: 'ready';
  readonly visibleSlotLeaseId: string;
  readonly requestIdentity: string;
  readonly assetId: string;
  readonly handle: unknown;
  readonly fallbackActive: false;
}> | Readonly<{
  readonly schemaVersion: 1;
  readonly status: 'fallback';
  readonly visibleSlotLeaseId: string;
  readonly requestIdentity: string;
  readonly assetId: string;
  readonly handle: null;
  readonly fallbackActive: true;
  readonly fallbackContent: 'text-shape-pattern-only';
  readonly failureCode: ArenaV2A6FormalPreviewFailureCodeV1;
}>;

export interface ArenaV2A6FormalPreviewLeaseOwnerSnapshotV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly validationStatus: 'not-run';
  readonly state: ArenaV2A6FormalPreviewLeaseOwnerStateV1;
  readonly epochId: string;
  readonly catalogContentHash: string;
  readonly lastTick: number;
  readonly activeLeaseCount: number;
  readonly loadingResourceCount: number;
  readonly readyResourceCount: number;
  readonly pendingResourceCount: number;
  readonly cancelledPendingResourceCount: number;
  readonly boundedFailureCount: number;
  readonly cleanupFailureCount: number;
}

type PlainData = Record<string, unknown>;
type ExternalMethod = (...args: unknown[]) => unknown;
type ResourceStateV1 = 'loading' | 'ready' | 'failed' | 'stale' | 'disposed';

interface ValidatedSlotV1 {
  readonly kind: 'weapon' | 'map';
  readonly definitionId: string;
  readonly assetId: string;
  readonly sha256: string;
  readonly requestToken: string | null;
  readonly releaseToken: string | null;
  readonly requestPermitted: boolean;
}

interface ResourceRecordV1 {
  readonly identity: ArenaV2A6FormalPreviewLoadRequestV1;
  readonly identityCanonical: string;
  readonly leaseIds: Set<string>;
  state: ResourceStateV1;
  operation: ArenaV2A6FormalPreviewLoadOperationV1 | null;
  settlement: Promise<void>;
  settlementResolve: (() => void) | null;
  settlementComplete: boolean;
  handle: unknown | null;
  failureCode: ArenaV2A6FormalPreviewFailureCodeV1 | null;
  staleReason: ArenaV2A6FormalPreviewFailureCodeV1 | null;
  cancelInvoked: boolean;
  cancelComplete: boolean;
  cancelFailurePending: boolean;
  disposeInvoked: boolean;
  disposeComplete: boolean;
  disposeFailurePending: boolean;
}

interface LeaseRecordV1 {
  readonly leaseId: string;
  readonly inputCanonical: string;
  readonly acquireTick: number;
  readonly releaseToken: string;
  readonly resource: ResourceRecordV1;
  active: boolean;
  result: Promise<ArenaV2A6FormalPreviewLeaseResultV1>;
  resultResolve: ((value: ArenaV2A6FormalPreviewLeaseResultV1) => void) | null;
  resultSettled: boolean;
}

const CONSTRUCTOR_KEYS = new Set(['schemaVersion', 'bindingSnapshot', 'loader', 'disposer']);
const SNAPSHOT_KEYS = new Set([
  'schemaVersion', 'status', 'hardGate', 'defaultSurfaceWired', 'validationStatus',
  'epochId', 'tick', 'sourceState', 'contentIdentity', 'budget', 'slots', 'layouts',
  'accessibility', 'governance',
]);
const CONTENT_IDENTITY_KEYS = new Set([
  'sourceContentHash', 'collectionContentHash', 'catalogContentHash', 'catalogRevision',
  'productionApprovalLedgerId', 'productionApprovalLedgerContentHash',
]);
const CATALOG_BUDGET_KEYS = new Set([
  'policyId', 'maximumTotalEncodedBytes', 'weaponAttachmentCandidateMaximumEncodedBytes',
  'totalEncodedBytes', 'weaponEncodedBytes', 'mapEncodedBytes', 'withinTotalEncodedLimit',
  'perItemBudgetClosedCount', 'uncoveredPerItemBudgetCount', 'formalBudgetReady',
  'validationStatus',
]);
const SLOT_KEYS = new Set([
  'kind', 'definitionId', 'displayName', 'ordinal', 'assetId', 'runtimeSourceKey', 'role',
  'maturity', 'provenance', 'byteLength', 'sha256', 'availability', 'formalReady',
  'assetUsePermitted', 'previewSourceUse', 'previewStrategies', 'budget', 'lifecycle',
  'fallback',
]);
const PROVENANCE_KEYS = new Set([
  'sourceLocator', 'sourceRevision', 'licenseId', 'rightsHolder', 'approvedBy', 'approvedAt',
  'proofDocument', 'commercialUseDeclared', 'modificationDeclared', 'redistributionDeclared',
  'attributionRequired',
]);
const SLOT_BUDGET_KEYS = new Set([
  'policyId', 'coverage', 'maximumEncodedBytes', 'withinPerItemLimit', 'validationStatus',
]);
const LIFECYCLE_KEYS = new Set([
  'lazyRequest', 'requestPermitted', 'requestWhen', 'requestToken', 'releaseWhen',
  'releaseToken', 'loadsBytesHere', 'ownsThreeResourcesHere',
]);
const FALLBACK_KEYS = new Set([
  'active', 'content', 'preservesDefinitionIdentity', 'programmaticGeometryAllowed',
  'claimsFormalApproval',
]);
const PREVIEW_STRATEGY_KEYS = new Set([
  'screenId', 'framing', 'safeInsetCssPixels', 'minimumSlotCssPixels',
  'transparentBackground', 'autoRotate', 'motionPolicy', 'touchActionAdded',
  'selectionIntentAdded',
]);
const LAYOUT_KEYS = new Set([
  'viewport', 'safeAreaRequired', 'indexPreviewMinimumCssPixels',
  'detailPreviewMinimumCssPixels', 'previewSafeInsetCssPixels',
  'existingItemTouchTargetMinimumCssPixels', 'newTouchActionsAdded',
  'horizontalOverflowAllowed', 'screenshotEvidence',
]);
const ACCESSIBILITY_KEYS = new Set([
  'reducedMotion', 'automaticRotationEnabled', 'muted', 'mutedChangesPreviewMeaning',
  'assetFailurePreservesTextShapePattern',
]);
const GOVERNANCE_KEYS = new Set([
  'weaponBindingCount', 'mapBindingCount', 'pageCountAdded', 'actionCountAdded',
  'binaryAssetBytesAdded', 'programmaticNormalPathAllowed', 'formalAssetGatePassed',
  'deviceEvidence', 'screenshotEvidence', 'performanceEvidence',
]);
const ACQUIRE_KEYS = new Set([
  'schemaVersion', 'tick', 'visibleSlotLeaseId', 'assetId', 'requestToken',
]);
const RELEASE_KEYS = new Set([
  'schemaVersion', 'tick', 'visibleSlotLeaseId', 'releaseToken',
]);
const RESET_KEYS = new Set(['schemaVersion', 'tick', 'nextBindingSnapshot']);
const LOAD_OPERATION_KEYS = new Set(['promise', 'cancel']);
const MAX_ACTIVE_LEASES = 64;
const MAX_RESOURCE_IDENTITIES = 22;
const MAX_LEASE_HISTORY = 128;
const MAX_FAILURE_IDENTITIES = 64;
const MAX_PENDING_RESOURCE_IDENTITIES = 22;
const NATIVE_PROMISE_THEN = Promise.prototype.then;
const SETTLEMENT_MICROTASK_TRIGGER = Promise.resolve(undefined);

function createDeferredPromiseOwner<T>(): Readonly<{
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
}> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return Object.freeze({ promise, resolve, reject });
}

function cloneStrictData(
  value: unknown,
  name: string,
  seen: Set<object> = new Set(),
  depth = 0,
): unknown {
  if (depth > 30) throw new RangeError(`${name}嵌套深度超限。`);
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value))
  ) return value;
  if (typeof value !== 'object') throw new TypeError(`${name}只能包含有限JSON数据。`);
  if (seen.has(value)) throw new TypeError(`${name}不能循环引用。`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      const expectedKeys = new Set([
        'length',
        ...Array.from({ length: value.length }, (_, index) => String(index)),
      ]);
      if (Reflect.ownKeys(value).some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
        throw new TypeError(`${name}数组不能有空槽、Symbol或附加字段。`);
      }
      return Object.freeze(Array.from({ length: value.length }, (_, index) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
          throw new TypeError(`${name}[${index}]必须是可枚举数据字段。`);
        }
        return cloneStrictData(descriptor.value, `${name}[${index}]`, seen, depth + 1);
      }));
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${name}必须是普通数据对象，Promise/thenable不受支持。`);
    }
    const result: PlainData = Object.create(null) as PlainData;
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string' || key === 'then') {
        throw new TypeError(`${name}不能包含Symbol或thenable字段。`);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
        throw new TypeError(`${name}.${key}必须是数据字段，getter/setter被拒绝。`);
      }
      result[key] = cloneStrictData(descriptor.value, `${name}.${key}`, seen, depth + 1);
    }
    return Object.freeze(result);
  } finally {
    seen.delete(value);
  }
}

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  const result = value as PlainData;
  const actualKeys = Object.keys(result);
  if (actualKeys.length !== keys.size || actualKeys.some((key) => !keys.has(key))) {
    throw new RangeError(`${name}字段必须exact-key闭合。`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(result, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
  return result;
}

function captureExactExternalFields(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): PlainData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  const actualKeys = Reflect.ownKeys(value);
  if (actualKeys.length !== keys.size
    || actualKeys.some((key) => typeof key !== 'string' || !keys.has(key))) {
    throw new RangeError(`${name}字段必须exact-key闭合。`);
  }
  const result: PlainData = Object.create(null) as PlainData;
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function nonEmptyString(value: unknown, name: string, maximum = 2048): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maximum) {
    throw new TypeError(`${name}必须是1..${maximum}字符的非空字符串。`);
  }
  return value;
}

function safeTick(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name}必须是非负安全整数。`);
  }
  return value as number;
}

function sha256(value: unknown, name: string): string {
  const result = nonEmptyString(value, name, 64);
  if (!/^[0-9a-f]{64}$/u.test(result)) throw new RangeError(`${name}必须是64位小写SHA-256。`);
  return result;
}

function ownMethod(value: unknown, methodName: string, ownerName: string): ExternalMethod {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${ownerName}必须是对象。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = value;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) throw new TypeError(`${ownerName}原型链无效。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, methodName);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${ownerName}.${methodName}必须是数据方法。`);
      }
      const method = descriptor.value as ExternalMethod;
      return (...args: unknown[]) => method.call(value, ...args);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new TypeError(`${ownerName}缺少${methodName}()。`);
}

function isNativePromise(value: unknown): value is Promise<unknown> {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return false;
  try {
    Reflect.apply(NATIVE_PROMISE_THEN, value, [() => undefined, () => undefined]);
    return true;
  } catch {
    return false;
  }
}

function hasThenableMarker(value: unknown): boolean {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return false;
  const visited = new Set<object>();
  let cursor: object | null = value as object;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) return true;
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, 'then');
    if (descriptor !== undefined) return true;
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  return false;
}

function assertSyncReturn(value: unknown, name: string): void {
  if (isNativePromise(value)) throw new TypeError(`${name}必须同步完成。`);
  if (typeof value !== 'object' || value === null) return;
  let cursor: object | null = value;
  const visited = new Set<object>();
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) throw new TypeError(`${name}返回值原型链无效。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, 'then');
    if (descriptor) throw new TypeError(`${name}不得返回thenable。`);
    cursor = Object.getPrototypeOf(cursor);
  }
}

function assertSameScalarFields(
  actual: PlainData,
  expected: object,
  keys: ReadonlySet<string>,
  name: string,
): void {
  const expectedData = expected as Readonly<Record<string, unknown>>;
  for (const key of keys) {
    if (actual[key] !== expectedData[key]) {
      throw new RangeError(`${name}.${key}与当前正式目录漂移。`);
    }
  }
}

function parseBindingSnapshot(value: unknown): Readonly<{
  epochId: string;
  tick: number;
  catalogContentHash: string;
  slots: readonly ValidatedSlotV1[];
}> {
  const cloned = cloneStrictData(value, 'A6.6 A6.4 binding snapshot');
  const source = exactRecord(cloned, SNAPSHOT_KEYS, 'A6.6 A6.4 binding snapshot');
  if (source.schemaVersion !== 1
    || source.status !== 'production-unreachable'
    || source.hardGate !== false
    || source.defaultSurfaceWired !== false
    || source.validationStatus !== 'not-run') {
    throw new RangeError('A6.6只接受A6.4 production-unreachable/not-run快照。');
  }
  const epochId = nonEmptyString(source.epochId, 'A6.6 binding snapshot.epochId', 200);
  const tick = safeTick(source.tick, 'A6.6 binding snapshot.tick');
  const contentIdentity = exactRecord(
    source.contentIdentity,
    CONTENT_IDENTITY_KEYS,
    'A6.6 binding snapshot.contentIdentity',
  );
  const catalogContentHash = nonEmptyString(
    contentIdentity.catalogContentHash,
    'A6.6 binding snapshot.catalogContentHash',
    128,
  );
  if (catalogContentHash !== ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.contentHash
    || contentIdentity.catalogRevision
      !== ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.sourceCatalogContentHash
    || contentIdentity.productionApprovalLedgerId
      !== ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY.ledgerId
    || contentIdentity.productionApprovalLedgerContentHash
      !== ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.contentHash) {
    throw new RangeError('A6.6 A6.4快照未绑定当前正式资产catalog identity。');
  }
  nonEmptyString(contentIdentity.sourceContentHash, 'A6.6 sourceContentHash', 128);
  nonEmptyString(contentIdentity.collectionContentHash, 'A6.6 collectionContentHash', 128);
  const catalogBudget = exactRecord(source.budget, CATALOG_BUDGET_KEYS, 'A6.6 binding snapshot.budget');
  assertSameScalarFields(
    catalogBudget,
    ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.budget,
    CATALOG_BUDGET_KEYS,
    'A6.6 binding snapshot.budget',
  );
  if (!Array.isArray(source.layouts) || source.layouts.length !== 2) {
    throw new RangeError('A6.6要求390x844与1440x900两份布局合同。');
  }
  const layoutViewports = source.layouts.map((layout, index) => {
    const parsed = exactRecord(layout, LAYOUT_KEYS, `A6.6 layout[${index}]`);
    if ((parsed.viewport !== '390x844' && parsed.viewport !== '1440x900')
      || parsed.safeAreaRequired !== true
      || parsed.existingItemTouchTargetMinimumCssPixels !== 48
      || parsed.newTouchActionsAdded !== 0
      || parsed.horizontalOverflowAllowed !== false
      || parsed.screenshotEvidence !== 'not-run') {
      throw new RangeError(`A6.6 layout[${index}]关键治理值漂移。`);
    }
    return parsed.viewport;
  });
  if (layoutViewports[0] !== '390x844' || layoutViewports[1] !== '1440x900') {
    throw new RangeError('A6.6布局顺序必须稳定为390x844、1440x900。');
  }
  const accessibility = exactRecord(
    source.accessibility,
    ACCESSIBILITY_KEYS,
    'A6.6 binding snapshot.accessibility',
  );
  if (typeof accessibility.reducedMotion !== 'boolean'
    || typeof accessibility.muted !== 'boolean'
    || accessibility.automaticRotationEnabled !== false
    || accessibility.mutedChangesPreviewMeaning !== false
    || accessibility.assetFailurePreservesTextShapePattern !== true) {
    throw new RangeError('A6.6无障碍关键治理值漂移。');
  }
  const governance = exactRecord(
    source.governance,
    GOVERNANCE_KEYS,
    'A6.6 binding snapshot.governance',
  );
  const expectedGovernance = Object.freeze({
    weaponBindingCount: 20,
    mapBindingCount: 2,
    pageCountAdded: 0,
    actionCountAdded: 0,
    binaryAssetBytesAdded: 0,
    programmaticNormalPathAllowed: false,
    formalAssetGatePassed: false,
    deviceEvidence: 'not-run',
    screenshotEvidence: 'not-run',
    performanceEvidence: 'not-run',
  });
  assertSameScalarFields(governance, expectedGovernance, GOVERNANCE_KEYS, 'A6.6 governance');
  if (!Array.isArray(source.slots) || source.slots.length !== 22) {
    throw new RangeError('A6.6要求A6.4完整20武器+2地图槽位。');
  }
  const slots = source.slots.map((rawSlot, index) => {
    const slot = exactRecord(rawSlot, SLOT_KEYS, `A6.6 slot[${index}]`);
    const kind = slot.kind;
    if (kind !== 'weapon' && kind !== 'map') throw new RangeError(`A6.6 slot[${index}].kind无效。`);
    const definitionId = nonEmptyString(slot.definitionId, `A6.6 slot[${index}].definitionId`, 200);
    const assetId = nonEmptyString(slot.assetId, `A6.6 slot[${index}].assetId`, 200);
    const digest = sha256(slot.sha256, `A6.6 slot[${index}].sha256`);
    nonEmptyString(slot.runtimeSourceKey, `A6.6 slot[${index}].runtimeSourceKey`, 2048);
    const provenance = exactRecord(slot.provenance, PROVENANCE_KEYS, `A6.6 slot[${index}].provenance`);
    const budget = exactRecord(slot.budget, SLOT_BUDGET_KEYS, `A6.6 slot[${index}].budget`);
    const lifecycle = exactRecord(slot.lifecycle, LIFECYCLE_KEYS, `A6.6 slot[${index}].lifecycle`);
    const fallback = exactRecord(slot.fallback, FALLBACK_KEYS, `A6.6 slot[${index}].fallback`);
    const expectedBinding = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings.find((binding) => (
      binding.kind === kind && binding.definitionId === definitionId
    ));
    if (expectedBinding === undefined || expectedBinding.assetId !== assetId) {
      throw new RangeError(`A6.6 slot[${index}] Definition/asset不属于当前正式目录。`);
    }
    const expectedRecord = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.records.find((record) => (
      record.assetId === assetId
    ));
    if (expectedRecord === undefined
      || slot.runtimeSourceKey !== expectedRecord.runtimeSourceKey
      || slot.role !== expectedRecord.role
      || slot.maturity !== expectedRecord.maturity
      || slot.byteLength !== expectedRecord.byteLength
      || digest !== expectedRecord.sha256
      || expectedBinding.maturity !== expectedRecord.maturity) {
      throw new RangeError(`A6.6 slot[${index}]正式资产身份发生coherent substitution。`);
    }
    assertSameScalarFields(
      provenance,
      expectedRecord.provenance,
      PROVENANCE_KEYS,
      `A6.6 slot[${index}].provenance`,
    );
    const expectedSlotBudget = Object.freeze({
      policyId: 'arena.stage7.formal-asset-budget.v1',
      coverage: kind === 'weapon'
        ? 'candidate-attachment-limit'
        : 'map-glb-not-covered-by-current-policy',
      maximumEncodedBytes: kind === 'weapon' ? 65_536 : null,
      withinPerItemLimit: kind === 'weapon' ? true : null,
      validationStatus: 'metadata-only-not-recomputed',
    });
    assertSameScalarFields(
      budget,
      expectedSlotBudget,
      SLOT_BUDGET_KEYS,
      `A6.6 slot[${index}].budget`,
    );
    if (!Array.isArray(slot.previewStrategies) || slot.previewStrategies.length !== 2) {
      throw new RangeError(`A6.6 slot[${index}]必须有index/detail两项preview策略。`);
    }
    slot.previewStrategies.forEach((strategy, strategyIndex) => {
      const parsed = exactRecord(
        strategy,
        PREVIEW_STRATEGY_KEYS,
        `A6.6 slot[${index}].previewStrategies[${strategyIndex}]`,
      );
      const expectedScreenId = kind === 'weapon'
        ? (strategyIndex === 0 ? 'weapon-index' : 'weapon-detail')
        : (strategyIndex === 0 ? 'map-index' : 'map-detail');
      if (parsed.screenId !== expectedScreenId
        || parsed.transparentBackground !== true
        || parsed.autoRotate !== false
        || parsed.touchActionAdded !== false
        || parsed.selectionIntentAdded !== false) {
        throw new RangeError(`A6.6 slot[${index}] preview策略治理值漂移。`);
      }
    });
    const approvalEntry = ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries
      .find((entry) => entry.assetId === assetId);
    if (approvalEntry === undefined
      || approvalEntry.catalogContentHash
        !== ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.catalogContentHash
      || approvalEntry.assetId !== expectedRecord.assetId
      || approvalEntry.artifactPath !== expectedRecord.artifactPath
      || approvalEntry.byteLength !== expectedRecord.byteLength
      || approvalEntry.sha256 !== expectedRecord.sha256
      || approvalEntry.maturity !== expectedRecord.maturity
      || approvalEntry.productionApprovalStatus !== 'missing-not-approved'
      || approvalEntry.assetUsePermitted !== false
      || approvalEntry.formalReady !== false) {
      throw new RangeError(`A6.6 slot[${index}]生产批准账本事实漂移。`);
    }
    const requestPermitted = false as const;
    if (fallback.content !== 'text-shape-pattern-only'
      || fallback.preservesDefinitionIdentity !== true
      || fallback.programmaticGeometryAllowed !== false
      || fallback.claimsFormalApproval !== false) {
      throw new RangeError(`A6.6 slot[${index}]fallback语义漂移。`);
    }
    if ((kind === 'weapon' && slot.availability !== 'catalog-bound' && slot.availability !== 'missing')
      || slot.formalReady !== false
      || slot.assetUsePermitted !== false
      || slot.previewSourceUse !== 'text-shape-pattern-fallback-only'
      || requestPermitted) {
      throw new RangeError(`A6.6 slot[${index}]当前批准账本下必须保持不可请求回退。`);
    }
    const projected: ValidatedSlotV1 = Object.freeze({
      kind,
      definitionId,
      assetId,
      sha256: digest,
      requestToken: lifecycle.requestToken === null
        ? null
        : nonEmptyString(lifecycle.requestToken, `A6.6 slot[${index}].requestToken`, 200),
      releaseToken: lifecycle.releaseToken === null
        ? null
        : nonEmptyString(lifecycle.releaseToken, `A6.6 slot[${index}].releaseToken`, 200),
      requestPermitted,
    });
    if (lifecycle.lazyRequest !== false
      || lifecycle.requestPermitted !== false
      || lifecycle.requestWhen !== null
      || lifecycle.requestToken !== null
      || lifecycle.releaseWhen !== null
      || lifecycle.releaseToken !== null
      || lifecycle.loadsBytesHere !== false
      || lifecycle.ownsThreeResourcesHere !== false
      || fallback.active !== true
      || fallback.content !== 'text-shape-pattern-only'
      || fallback.preservesDefinitionIdentity !== true
      || fallback.programmaticGeometryAllowed !== false
      || fallback.claimsFormalApproval !== false) {
      throw new RangeError(`A6.6 slot[${index}]回退合同不闭合。`);
    }
    return projected;
  });
  if (slots.filter(({ kind }) => kind === 'weapon').length !== 20
    || slots.filter(({ kind }) => kind === 'map').length !== 2
    || new Set(slots.map(({ assetId }) => assetId)).size !== slots.length
    || new Set(slots.map(({ definitionId }) => definitionId)).size !== slots.length) {
    throw new RangeError('A6.6 A6.4槽位数量或身份不闭合。');
  }
  return Object.freeze({ epochId, tick, catalogContentHash, slots: Object.freeze(slots) });
}

function parseLoadOperation(value: unknown): ArenaV2A6FormalPreviewLoadOperationV1 {
  const source = captureExactExternalFields(value, LOAD_OPERATION_KEYS, 'A6.6 loader operation');
  if (!isNativePromise(source.promise)) throw new TypeError('A6.6 loader operation.promise必须是原生Promise。');
  if (typeof source.cancel !== 'function') throw new TypeError('A6.6 loader operation.cancel必须是数据函数。');
  const cancel = source.cancel as () => void;
  return Object.freeze({ promise: source.promise, cancel: () => cancel.call(value) });
}

function requestIdentity(value: Omit<ArenaV2A6FormalPreviewLoadRequestV1, 'schemaVersion' | 'requestIdentity'>): string {
  return createDeterministicDataHash(value, 'Arena V2 A6.6 Formal Preview Request Identity V1');
}

function fallbackResult(
  lease: LeaseRecordV1,
  code: ArenaV2A6FormalPreviewFailureCodeV1,
): ArenaV2A6FormalPreviewLeaseResultV1 {
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'fallback' as const,
    visibleSlotLeaseId: lease.leaseId,
    requestIdentity: lease.resource.identity.requestIdentity,
    assetId: lease.resource.identity.assetId,
    handle: null,
    fallbackActive: true as const,
    fallbackContent: 'text-shape-pattern-only' as const,
    failureCode: code,
  });
}

export class ArenaV2CollectionFormalPreviewLeaseOwnerCandidateV1 {
  readonly #load: ExternalMethod;
  readonly #dispose: ExternalMethod;
  #state: ArenaV2A6FormalPreviewLeaseOwnerStateV1 = 'active';
  #epochId: string;
  #catalogContentHash: string;
  #lastTick: number;
  #slots = new Map<string, ValidatedSlotV1>();
  #resources = new Map<string, ResourceRecordV1>();
  #pendingResources = new Set<ResourceRecordV1>();
  #leases = new Map<string, LeaseRecordV1>();
  #leaseHistory = new Map<string, string>();
  #releaseHistory = new Map<string, string>();
  #requestTokenIdentities = new Map<string, string>();
  #failureIdentities = new Map<string, ArenaV2A6FormalPreviewFailureCodeV1>();
  #cleanupFailureCount = 0;
  #callbackActive = false;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: unknown) {
    const source = captureExactExternalFields(value, CONSTRUCTOR_KEYS, 'A6.6 constructor');
    if (source.schemaVersion !== 1) throw new RangeError('A6.6 constructor.schemaVersion必须为1。');
    const snapshot = parseBindingSnapshot(source.bindingSnapshot);
    this.#epochId = snapshot.epochId;
    this.#catalogContentHash = snapshot.catalogContentHash;
    this.#lastTick = snapshot.tick;
    this.#slots = new Map(snapshot.slots.map((slot) => [slot.assetId, slot]));
    this.#load = ownMethod(source.loader, 'load', 'A6.6 loader');
    this.#dispose = ownMethod(source.disposer, 'dispose', 'A6.6 disposer');
  }

  get state(): ArenaV2A6FormalPreviewLeaseOwnerStateV1 {
    this.#assertNoOperation('state read');
    return this.#state;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) {
      const error = new Error(`A6.6 ${this.#operation}期间拒绝${operation}。`);
      this.#reentrySequence += 1;
      this.#reentryError ??= error;
      throw this.#reentryError;
    }
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) throw new Error('A6.6缺少当前操作所有权。');
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #failClosed(destroying = false): void {
    this.#state = destroying || this.#state === 'destroyed' || this.#state === 'destroy-incomplete'
      ? 'destroy-incomplete'
      : 'failed';
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
      this.#failClosed(operation === 'destroy');
      throw failed && failureValue !== reentryError
        ? new AggregateError([failureValue, reentryError], `A6.6 ${operation}失败且同步重入。`)
        : reentryError;
    }
    if (failed) throw failureValue;
    return result;
  }

  #assertActive(operation: string): void {
    if (this.#state !== 'active') throw new Error(`${operation}拒绝状态${this.#state}。`);
  }

  #callExternal(method: ExternalMethod, ...args: unknown[]): unknown {
    const result = this.#callExternalCapturingResult(method, ...args);
    this.#assertCurrentOperationCommit();
    return result;
  }

  #callExternalCapturingResult(
    method: ExternalMethod,
    ...args: unknown[]
  ): unknown {
    if (this.#callbackActive) throw new Error('A6.6外部回调不可嵌套。');
    this.#callbackActive = true;
    try {
      return method(...args);
    } finally {
      this.#callbackActive = false;
    }
  }

  #recordFailure(identity: string, code: ArenaV2A6FormalPreviewFailureCodeV1): void {
    if (!this.#failureIdentities.has(identity) && this.#failureIdentities.size >= MAX_FAILURE_IDENTITIES) {
      const oldest = this.#failureIdentities.keys().next().value as string | undefined;
      if (oldest !== undefined) this.#failureIdentities.delete(oldest);
    }
    this.#failureIdentities.set(identity, code);
  }

  #trimLeaseHistory(): void {
    while (this.#leaseHistory.size > MAX_LEASE_HISTORY) {
      let removed = false;
      for (const leaseId of this.#leaseHistory.keys()) {
        if (this.#leases.has(leaseId)) continue;
        this.#leaseHistory.delete(leaseId);
        this.#releaseHistory.delete(leaseId);
        removed = true;
        break;
      }
      if (!removed) throw new RangeError('A6.6租约历史无可淘汰项。');
    }
    while (this.#releaseHistory.size > MAX_LEASE_HISTORY) {
      const oldest = this.#releaseHistory.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.#releaseHistory.delete(oldest);
    }
  }

  #assertLeaseCapacityForNewFact(): void {
    if (this.#leases.size >= MAX_ACTIVE_LEASES) {
      throw new RangeError('A6.6可见slot租约超过64。');
    }
    if (this.#leaseHistory.size >= MAX_LEASE_HISTORY
      && ![...this.#leaseHistory.keys()].some((leaseId) => !this.#leases.has(leaseId))) {
      throw new RangeError('A6.6租约历史达到128且无可淘汰项。');
    }
  }

  #cancelOnce(resource: ResourceRecordV1): boolean {
    if (resource.operation === null) {
      resource.cancelComplete = true;
      return true;
    }
    if (resource.cancelComplete) return true;
    resource.cancelInvoked = true;
    try {
      const result = this.#callExternal(resource.operation.cancel);
      assertSyncReturn(result, 'A6.6 loader cancel()');
      resource.cancelComplete = true;
      if (resource.cancelFailurePending) {
        resource.cancelFailurePending = false;
        this.#cleanupFailureCount = Math.max(0, this.#cleanupFailureCount - 1);
      }
      return true;
    } catch (error) {
      if (this.#reentryError !== null) throw error;
      resource.failureCode = 'cancel-failed';
      if (!resource.cancelFailurePending) this.#cleanupFailureCount += 1;
      resource.cancelFailurePending = true;
      this.#recordFailure(resource.identityCanonical, 'cancel-failed');
      this.#state = this.#state === 'destroyed' || this.#state === 'destroy-incomplete'
        ? 'destroy-incomplete'
        : 'failed';
      return false;
    }
  }

  #disposeOnce(resource: ResourceRecordV1, handle: unknown): boolean {
    if (resource.disposeComplete) return true;
    resource.disposeInvoked = true;
    const request: ArenaV2A6FormalPreviewDisposeRequestV1 = Object.freeze({
      schemaVersion: 1 as const,
      requestIdentity: resource.identity.requestIdentity,
      epochId: resource.identity.epochId,
      catalogContentHash: resource.identity.catalogContentHash,
      assetId: resource.identity.assetId,
      sha256: resource.identity.sha256,
      handle,
    });
    try {
      const result = this.#callExternal(this.#dispose, request);
      assertSyncReturn(result, 'A6.6 disposer.dispose()');
      resource.disposeComplete = true;
      if (resource.disposeFailurePending) {
        resource.disposeFailurePending = false;
        this.#cleanupFailureCount = Math.max(0, this.#cleanupFailureCount - 1);
      }
      return true;
    } catch (error) {
      if (this.#reentryError !== null) throw error;
      resource.failureCode = 'dispose-failed';
      if (!resource.disposeFailurePending) this.#cleanupFailureCount += 1;
      resource.disposeFailurePending = true;
      this.#recordFailure(resource.identityCanonical, 'dispose-failed');
      this.#state = this.#state === 'destroyed' || this.#state === 'destroy-incomplete'
        ? 'destroy-incomplete'
        : 'failed';
      return false;
    }
  }

  #resourceCleanupComplete(resource: ResourceRecordV1): boolean {
    return resource.settlementComplete
      && resource.handle === null
      && !resource.cancelFailurePending
      && !resource.disposeFailurePending;
  }

  #settleLoaded(resource: ResourceRecordV1, handle: unknown): void {
    const handleInvalid = handle === null || handle === undefined || hasThenableMarker(handle);
    if (handleInvalid) {
      resource.state = 'failed';
      resource.failureCode = 'load-result-invalid';
      this.#recordFailure(resource.identityCanonical, 'load-result-invalid');
      return;
    }
    if (resource.staleReason !== null
      || resource.identity.epochId !== this.#epochId
      || this.#state !== 'active') {
      resource.state = 'stale';
      resource.failureCode = resource.staleReason
        ?? (this.#state === 'active' ? 'epoch-reset-before-ready' : 'owner-destroyed-before-ready');
      resource.handle = handle;
      if (this.#disposeOnce(resource, handle)) {
        resource.handle = null;
        resource.state = 'disposed';
      }
      return;
    }
    resource.handle = handle;
    resource.state = 'ready';
  }

  #settleRejected(resource: ResourceRecordV1): void {
    if (resource.staleReason !== null) {
      resource.state = 'stale';
      resource.failureCode = resource.staleReason;
      return;
    }
    resource.state = 'failed';
    resource.failureCode = 'load-rejected';
    this.#recordFailure(resource.identityCanonical, 'load-rejected');
  }

  #settleLease(lease: LeaseRecordV1): void {
    if (lease.resultSettled) return;
    const resolve = lease.resultResolve;
    if (resolve === null) throw new Error('A6.6租约结果Owner缺少resolve。');
    const result = this.#resultForLease(lease);
    lease.resultSettled = true;
    lease.resultResolve = null;
    resolve(result);
  }

  #settleResourceLeases(resource: ResourceRecordV1): void {
    for (const leaseId of resource.leaseIds) {
      const lease = this.#leases.get(leaseId);
      if (lease !== undefined && lease.resource === resource) this.#settleLease(lease);
    }
  }

  #finishSettlement(resource: ResourceRecordV1): void {
    if (resource.settlementComplete) return;
    resource.settlementComplete = true;
    resource.cancelComplete = true;
    if (resource.cancelFailurePending) {
      resource.cancelFailurePending = false;
      this.#cleanupFailureCount = Math.max(0, this.#cleanupFailureCount - 1);
    }
    if (this.#resourceCleanupComplete(resource)) this.#pendingResources.delete(resource);
    if (resource.state === 'failed' && resource.failureCode !== null) {
      this.#recordFailure(resource.identityCanonical, resource.failureCode);
    }
    if (this.#resourceCleanupComplete(resource)
      && (resource.leaseIds.size === 0
        || resource.state === 'disposed'
        || resource.state === 'stale')) {
      if (this.#resources.get(resource.identityCanonical) === resource) {
        this.#resources.delete(resource.identityCanonical);
      }
    }
    if (this.#state === 'destroyed' && this.#cleanupFailureCount > 0) {
      this.#state = 'destroy-incomplete';
    }
    this.#settleResourceLeases(resource);
    const resolve = resource.settlementResolve;
    resource.settlementResolve = null;
    if (resolve === null) throw new Error('A6.6资源结算Owner缺少resolve。');
    resolve();
  }

  #failSettlementObserver(resource: ResourceRecordV1): void {
    this.#failClosed();
    if (resource.settlementComplete) return;
    resource.state = resource.staleReason === null ? 'failed' : 'stale';
    resource.failureCode = resource.staleReason ?? 'load-rejected';
    this.#recordFailure(resource.identityCanonical, resource.failureCode);
    this.#finishSettlement(resource);
  }

  #observeLoadSettlement(
    resource: ResourceRecordV1,
    operation: ArenaV2A6FormalPreviewLoadOperationV1,
  ): void {
    Reflect.apply(NATIVE_PROMISE_THEN, operation.promise, [
      (handle: unknown) => {
        try {
          this.#runSynchronousOperation('load-fulfilled', () => {
            if (resource.settlementComplete) return;
            if (resource.operation !== operation) {
              throw new Error('A6.6拒绝过期load fulfilled提交。');
            }
            this.#settleLoaded(resource, handle);
            this.#finishSettlement(resource);
          });
        } catch {
          try {
            this.#runSynchronousOperation(
              'load-settlement-failure',
              () => this.#failSettlementObserver(resource),
            );
          } catch {
            this.#failClosed();
          }
        }
      },
      () => {
        try {
          this.#runSynchronousOperation('load-rejected', () => {
            if (resource.settlementComplete) return;
            if (resource.operation !== operation) {
              throw new Error('A6.6拒绝过期load rejected提交。');
            }
            this.#settleRejected(resource);
            this.#finishSettlement(resource);
          });
        } catch {
          try {
            this.#runSynchronousOperation(
              'load-rejection-failure',
              () => this.#failSettlementObserver(resource),
            );
          } catch {
            this.#failClosed();
          }
        }
      },
    ]);
  }

  #scheduleLoadInvocationFailureSettlement(resource: ResourceRecordV1): void {
    Reflect.apply(NATIVE_PROMISE_THEN, SETTLEMENT_MICROTASK_TRIGGER, [
      () => {
        try {
          this.#runSynchronousOperation('load-invocation-failure', () => {
            if (!resource.settlementComplete) this.#finishSettlement(resource);
          });
        } catch {
          try {
            this.#runSynchronousOperation(
              'load-invocation-failure-close',
              () => this.#failSettlementObserver(resource),
            );
          } catch { this.#failClosed(); }
        }
      },
    ]);
  }

  #resultForLease(
    lease: LeaseRecordV1,
  ): ArenaV2A6FormalPreviewLeaseResultV1 {
    const resource = lease.resource;
    if (!lease.active) {
      return fallbackResult(lease, resource.staleReason ?? 'released-before-ready');
    }
    if (resource.state === 'ready' && resource.handle !== null
      && resource.identity.epochId === this.#epochId && this.#state === 'active') {
      return Object.freeze({
        schemaVersion: 1 as const,
        status: 'ready' as const,
        visibleSlotLeaseId: lease.leaseId,
        requestIdentity: resource.identity.requestIdentity,
        assetId: resource.identity.assetId,
        handle: resource.handle,
        fallbackActive: false as const,
      });
    }
    return fallbackResult(
      lease,
      resource.failureCode
        ?? resource.staleReason
        ?? (this.#state === 'active' ? 'load-rejected' : 'owner-destroyed-before-ready'),
    );
  }

  #installLease(
    leaseId: string,
    inputCanonical: string,
    tick: number,
    releaseToken: string,
    resource: ResourceRecordV1,
  ): Promise<ArenaV2A6FormalPreviewLeaseResultV1> {
    const resultOwner = createDeferredPromiseOwner<ArenaV2A6FormalPreviewLeaseResultV1>();
    const lease: LeaseRecordV1 = {
      leaseId,
      inputCanonical,
      acquireTick: tick,
      releaseToken,
      resource,
      active: true,
      result: resultOwner.promise,
      resultResolve: resultOwner.resolve,
      resultSettled: false,
    };
    resource.leaseIds.add(leaseId);
    this.#leases.set(leaseId, lease);
    this.#leaseHistory.set(leaseId, inputCanonical);
    this.#trimLeaseHistory();
    if (resource.settlementComplete) this.#settleLease(lease);
    return lease.result;
  }

  acquire(value: unknown): Promise<ArenaV2A6FormalPreviewLeaseResultV1> {
    return this.#runSynchronousOperation('acquire', () => {
    this.#assertActive('A6.6 acquire');
    const cloned = cloneStrictData(value, 'A6.6 acquire');
    const source = exactRecord(cloned, ACQUIRE_KEYS, 'A6.6 acquire');
    if (source.schemaVersion !== 1) throw new RangeError('A6.6 acquire.schemaVersion必须为1。');
    const tick = safeTick(source.tick, 'A6.6 acquire.tick');
    const leaseId = nonEmptyString(source.visibleSlotLeaseId, 'A6.6 visibleSlotLeaseId', 200);
    const assetId = nonEmptyString(source.assetId, 'A6.6 assetId', 200);
    const token = nonEmptyString(source.requestToken, 'A6.6 requestToken', 200);
    const inputCanonical = JSON.stringify(cloned);
    const existingLease = this.#leases.get(leaseId);
    if (existingLease !== undefined) {
      if (tick === existingLease.acquireTick && inputCanonical === existingLease.inputCanonical) {
        return existingLease.result;
      }
      throw new RangeError('A6.6可见slot租约ID重复或同tick冲突。');
    }
    const historicalCanonical = this.#leaseHistory.get(leaseId);
    if (historicalCanonical !== undefined) {
      if (historicalCanonical === inputCanonical) {
        throw new RangeError('A6.6已释放租约不得重新acquire。');
      }
      throw new RangeError('A6.6同epoch租约ID历史事实冲突。');
    }
    if (tick < this.#lastTick) throw new RangeError('A6.6 acquire tick回退。');
    const slot = this.#slots.get(assetId);
    if (slot === undefined) throw new RangeError('A6.6拒绝A6.4快照之外的assetId。');
    if (!slot.requestPermitted
      || slot.requestToken === null
      || slot.releaseToken === null
      || token !== slot.requestToken) {
      throw new RangeError('A6.6在调用loader前拒绝未批准、missing或无token资产。');
    }
    this.#assertLeaseCapacityForNewFact();
    const identitySource = Object.freeze({
      epochId: this.#epochId,
      catalogContentHash: this.#catalogContentHash,
      assetId: slot.assetId,
      sha256: slot.sha256,
      requestToken: token,
    });
    const identityCanonical = JSON.stringify(identitySource);
    const identity = requestIdentity(identitySource);
    const tokenIdentity = this.#requestTokenIdentities.get(token);
    if (tokenIdentity !== undefined && tokenIdentity !== identityCanonical) {
      throw new RangeError('A6.6重复requestToken绑定了冲突资产身份。');
    }
    const failedCode = this.#failureIdentities.get(identityCanonical);
    if (failedCode !== undefined) {
      const failedResource: ResourceRecordV1 = {
        identity: Object.freeze({
          schemaVersion: 1 as const,
          requestIdentity: identity,
          ...identitySource,
        }),
        identityCanonical,
        leaseIds: new Set<string>(),
        state: 'failed',
        operation: null,
        settlement: Promise.resolve(),
        settlementResolve: null,
        settlementComplete: true,
        handle: null,
        failureCode: failedCode,
        staleReason: null,
        cancelInvoked: false,
        cancelComplete: false,
        cancelFailurePending: false,
        disposeInvoked: false,
        disposeComplete: false,
        disposeFailurePending: false,
      };
      this.#lastTick = tick;
      return this.#installLease(leaseId, inputCanonical, tick, slot.releaseToken, failedResource);
    }
    let resource = this.#resources.get(identityCanonical);
    if (resource !== undefined) {
      this.#lastTick = tick;
      return this.#installLease(leaseId, inputCanonical, tick, slot.releaseToken, resource);
    }
    if (this.#resources.size >= MAX_RESOURCE_IDENTITIES) {
      throw new RangeError('A6.6同epoch资源身份超过22。');
    }
    if (this.#pendingResources.size >= MAX_PENDING_RESOURCE_IDENTITIES) {
      throw new RangeError('A6.6跨epoch未决资源达到22，拒绝继续调用loader。');
    }
    const loadRequest: ArenaV2A6FormalPreviewLoadRequestV1 = Object.freeze({
      schemaVersion: 1 as const,
      requestIdentity: identity,
      ...identitySource,
    });
    const settlementOwner = createDeferredPromiseOwner<void>();
    resource = {
      identity: loadRequest,
      identityCanonical,
      leaseIds: new Set<string>(),
      state: 'loading',
      operation: null,
      settlement: settlementOwner.promise,
      settlementResolve: settlementOwner.resolve,
      settlementComplete: false,
      handle: null,
      failureCode: null,
      staleReason: null,
      cancelInvoked: false,
      cancelComplete: false,
      cancelFailurePending: false,
      disposeInvoked: false,
      disposeComplete: false,
      disposeFailurePending: false,
    };
    this.#resources.set(identityCanonical, resource);
    this.#pendingResources.add(resource);
    this.#requestTokenIdentities.set(token, identityCanonical);
    this.#lastTick = tick;
    const leaseResult = this.#installLease(
      leaseId,
      inputCanonical,
      tick,
      slot.releaseToken,
      resource,
    );
    let loadSettlementObserved = false;
    try {
      const loadResult = this.#callExternalCapturingResult(this.#load, loadRequest);
      resource.operation = parseLoadOperation(loadResult);
      this.#observeLoadSettlement(resource, resource.operation);
      loadSettlementObserved = true;
      this.#assertCurrentOperationCommit();
    } catch (error) {
      if (this.#reentryError !== null) {
        if (!loadSettlementObserved) {
          resource.state = 'failed';
          resource.failureCode = 'load-rejected';
          this.#recordFailure(identityCanonical, 'load-rejected');
          this.#settleResourceLeases(resource);
          this.#scheduleLoadInvocationFailureSettlement(resource);
        }
        throw error;
      }
      resource.state = 'failed';
      resource.failureCode = 'load-rejected';
      this.#recordFailure(identityCanonical, 'load-rejected');
      this.#settleResourceLeases(resource);
      this.#scheduleLoadInvocationFailureSettlement(resource);
    }
    return leaseResult;
    });
  }

  release(value: unknown): void {
    this.#runSynchronousOperation('release', () => {
    this.#assertActive('A6.6 release');
    const cloned = cloneStrictData(value, 'A6.6 release');
    const source = exactRecord(cloned, RELEASE_KEYS, 'A6.6 release');
    if (source.schemaVersion !== 1) throw new RangeError('A6.6 release.schemaVersion必须为1。');
    const tick = safeTick(source.tick, 'A6.6 release.tick');
    const leaseId = nonEmptyString(source.visibleSlotLeaseId, 'A6.6 release.visibleSlotLeaseId', 200);
    const token = nonEmptyString(source.releaseToken, 'A6.6 release.releaseToken', 200);
    const lease = this.#leases.get(leaseId);
    const canonical = JSON.stringify(cloned);
    if (lease === undefined) {
      const previousRelease = this.#releaseHistory.get(leaseId);
      if (previousRelease === canonical) return;
      if (previousRelease !== undefined) throw new RangeError('A6.6重复release事实冲突。');
      throw new RangeError('A6.6 release收到未知租约。');
    }
    if (tick < this.#lastTick) throw new RangeError('A6.6 release tick回退。');
    if (token !== lease.releaseToken) throw new RangeError('A6.6 releaseToken身份不匹配。');
    this.#releaseHistory.set(leaseId, canonical);
    lease.active = false;
    this.#settleLease(lease);
    this.#leases.delete(leaseId);
    lease.resource.leaseIds.delete(leaseId);
    this.#lastTick = tick;
    this.#trimLeaseHistory();
    if (lease.resource.leaseIds.size > 0) return;
    if (lease.resource.state === 'loading') {
      lease.resource.staleReason = 'released-before-ready';
      lease.resource.state = 'stale';
      this.#cancelOnce(lease.resource);
      return;
    }
    if (lease.resource.state === 'ready' && lease.resource.handle !== null) {
      if (this.#disposeOnce(lease.resource, lease.resource.handle)) {
        lease.resource.handle = null;
        lease.resource.state = 'disposed';
      }
    }
    if (this.#resourceCleanupComplete(lease.resource)
      && this.#resources.get(lease.resource.identityCanonical) === lease.resource) {
      this.#resources.delete(lease.resource.identityCanonical);
    }
    });
  }

  resetPresentationEpoch(value: unknown): void {
    this.#runSynchronousOperation('reset-epoch', () => {
    this.#assertActive('A6.6 resetPresentationEpoch');
    const cloned = cloneStrictData(value, 'A6.6 resetPresentationEpoch');
    const source = exactRecord(cloned, RESET_KEYS, 'A6.6 resetPresentationEpoch');
    if (source.schemaVersion !== 1) throw new RangeError('A6.6 reset.schemaVersion必须为1。');
    const tick = safeTick(source.tick, 'A6.6 reset.tick');
    if (tick < this.#lastTick) throw new RangeError('A6.6 reset tick回退。');
    const next = parseBindingSnapshot(source.nextBindingSnapshot);
    if (next.epochId === this.#epochId) throw new RangeError('A6.6 reset必须切换到新epoch。');
    for (const lease of this.#leases.values()) lease.active = false;
    const resourcesToCleanup = new Set([
      ...this.#resources.values(),
      ...this.#pendingResources,
    ]);
    for (const resource of resourcesToCleanup) resource.leaseIds.clear();
    for (const resource of resourcesToCleanup) {
      if (resource.state === 'loading' || resource.cancelFailurePending) {
        resource.staleReason = 'epoch-reset-before-ready';
        resource.state = 'stale';
        if (!this.#cancelOnce(resource)) {
          throw new Error('A6.6 reset取消旧epoch资源失败。');
        }
      }
      if (resource.handle !== null) {
        if (!this.#disposeOnce(resource, resource.handle)) {
          throw new Error('A6.6 reset释放旧epoch资源失败。');
        }
        resource.handle = null;
        resource.state = 'disposed';
      }
    }
    if ([...resourcesToCleanup].some((resource) => (
      !resource.settlementComplete
      || resource.handle !== null
      || resource.cancelFailurePending
      || resource.disposeFailurePending
    ))) {
      this.#state = 'failed';
      throw new Error('A6.6 reset清理不完整，拒绝切换epoch。');
    }
    for (const lease of this.#leases.values()) this.#settleLease(lease);
    this.#leases.clear();
    this.#resources.clear();
    this.#leaseHistory.clear();
    this.#releaseHistory.clear();
    this.#requestTokenIdentities.clear();
    this.#failureIdentities.clear();
    this.#epochId = next.epochId;
    this.#catalogContentHash = next.catalogContentHash;
    this.#lastTick = next.tick;
    this.#slots = new Map(next.slots.map((slot) => [slot.assetId, slot]));
    });
  }

  getSnapshot(): ArenaV2A6FormalPreviewLeaseOwnerSnapshotV1 {
    return this.#runSynchronousOperation('snapshot-read', () => Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      validationStatus: 'not-run' as const,
      state: this.#state,
      epochId: this.#epochId,
      catalogContentHash: this.#catalogContentHash,
      lastTick: this.#lastTick,
      activeLeaseCount: this.#leases.size,
      loadingResourceCount: [...this.#pendingResources].filter(({ state }) => (
        state === 'loading' || state === 'stale'
      )).length,
      readyResourceCount: [...this.#resources.values()].filter(({ state }) => state === 'ready').length,
      pendingResourceCount: this.#pendingResources.size,
      cancelledPendingResourceCount: [...this.#pendingResources].filter(({ cancelInvoked }) => (
        cancelInvoked
      )).length,
      boundedFailureCount: this.#failureIdentities.size,
      cleanupFailureCount: this.#cleanupFailureCount,
    }));
  }

  destroy(): void {
    this.#runSynchronousOperation('destroy', () => {
    if (this.#state === 'destroyed' && this.#cleanupFailureCount === 0) return;
    this.#state = 'destroy-incomplete';
    for (const lease of this.#leases.values()) lease.active = false;
    const resourcesToCleanup = new Set([
      ...this.#resources.values(),
      ...this.#pendingResources,
    ]);
    for (const resource of resourcesToCleanup) resource.leaseIds.clear();
    for (const resource of resourcesToCleanup) {
      if (resource.state === 'loading' || resource.cancelFailurePending) {
        resource.staleReason = 'owner-destroyed-before-ready';
        resource.state = 'stale';
        if (!this.#cancelOnce(resource)) return;
      }
      if (resource.handle !== null) {
        if (!this.#disposeOnce(resource, resource.handle)) return;
        resource.handle = null;
        resource.state = 'disposed';
      }
    }
    const cleanupComplete = [...resourcesToCleanup].every((resource) => (
      this.#resourceCleanupComplete(resource)
    ));
    if (!cleanupComplete || this.#cleanupFailureCount > 0) {
      return;
    }
    for (const lease of this.#leases.values()) this.#settleLease(lease);
    this.#leases.clear();
    this.#resources.clear();
    this.#leaseHistory.clear();
    this.#releaseHistory.clear();
    this.#requestTokenIdentities.clear();
    this.#failureIdentities.clear();
    this.#slots.clear();
    this.#pendingResources.clear();
    this.#state = 'destroyed';
    });
  }
}

export const ARENA_V2_A6_FORMAL_PREVIEW_LEASE_OWNER_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  stage: 'A6.6' as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  currentProductionApprovedAssetCount: 0 as const,
  currentRequestPermittedAssetCount: 0 as const,
  futureEnablementRequiresNewApprovalLedgerVersionAndIndependentGate: true as const,
  loadsBytesHere: false as const,
  createsThreeResourcesHere: false as const,
  loaderAndDisposerInjected: true as const,
  cleanupRetriesOnlyIncompleteResources: true as const,
  failedDisposeRetainsHandleForRetry: true as const,
  destroyIncompleteRetainsResourceLedger: true as const,
  maximumActiveVisibleSlotLeases: MAX_ACTIVE_LEASES,
  maximumConcurrentResourceIdentities: MAX_RESOURCE_IDENTITIES,
  maximumLeaseHistoryEntries: MAX_LEASE_HISTORY,
  maximumFailureIdentities: MAX_FAILURE_IDENTITIES,
  maximumPendingResourceIdentitiesAcrossEpochs: MAX_PENDING_RESOURCE_IDENTITIES,
  unapprovedRuntimeSourceKeyExposedToLoader: false as const,
  disposerFailureTransitionsOwnerToFailed: true as const,
  snapshotReadRejectedDuringExternalCallback: true as const,
  synchronousLifecycleOperationReentryRejected: true as const,
  swallowedCallbackReentryRejectedBeforeSuccessCommit: true as const,
  leaseAndResourceOwnersPublishedBeforeLoaderLoad: true as const,
  loadSettlementCommitsUnderOperationGuard: true as const,
  releasedLeaseCannotBeRevivedByLateLoad: true as const,
  publicReadsRejectedDuringOperationCommit: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  loadOperationCapturedAndObservedBeforeCommitCheck: true as const,
  cancelAndDisposeCallbacksCheckedBeforeCleanupCommit: true as const,
  cleanupReentryRetainsCurrentAndLaterResources: true as const,
  ordinaryCleanupFailureRetainsCurrentAndLaterResources: true as const,
  leaseSettlementWaitsForEveryResourceCleanup: true as const,
  epochResetWaitsForEveryOldResourceCleanup: true as const,
  failedEpochResetDoesNotCommitNextBinding: true as const,
  fallback: 'a6.4-text-shape-pattern-only' as const,
  validationStatus: 'not-run' as const,
  screenshotEvidence: 'not-run' as const,
  deviceEvidence: 'not-run' as const,
  performanceEvidence: 'not-run' as const,
});

export type {
  ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
  ArenaV2A6FormalPreviewBindingSlotV1,
};
