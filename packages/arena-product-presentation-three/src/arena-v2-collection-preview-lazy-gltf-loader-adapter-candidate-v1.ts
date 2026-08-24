import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { PRESENTATION_ASSET_KIND } from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_PRESENTATION_ASSET_PROVIDER_ID,
  PresentationAssetLoadTask,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  GltfPresentationAssetLoader,
} from '@number-strategy-jump/arena-presentation-three';
import {
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY,
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import * as THREE from 'three';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
} from './arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import type {
  ArenaV2A6FormalPreviewDisposeRequestV1,
  ArenaV2A6FormalPreviewDisposerPortV1,
  ArenaV2A6FormalPreviewLoadOperationV1,
  ArenaV2A6FormalPreviewLoadRequestV1,
  ArenaV2A6FormalPreviewLoaderPortV1,
} from './arena-v2-collection-formal-preview-lease-owner-candidate-v1.js';

export const ARENA_V2_A6_COLLECTION_PREVIEW_LAZY_GLTF_LOADER_ADAPTER_SCHEMA_VERSION_V1 = 1 as const;
export const ARENA_V2_A6_COLLECTION_PREVIEW_LAZY_GLTF_LOADER_ADAPTER_STATE_V1 = Object.freeze({
  ACTIVE: 'active',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
  DESTROY_INCOMPLETE: 'destroy-incomplete',
} as const);

export type ArenaV2A6CollectionPreviewLazyGltfLoaderAdapterStateV1 =
  typeof ARENA_V2_A6_COLLECTION_PREVIEW_LAZY_GLTF_LOADER_ADAPTER_STATE_V1[
    keyof typeof ARENA_V2_A6_COLLECTION_PREVIEW_LAZY_GLTF_LOADER_ADAPTER_STATE_V1
  ];

export interface ArenaV2A6CollectionPreviewLazyGltfLoaderAdapterSnapshotV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly state: ArenaV2A6CollectionPreviewLazyGltfLoaderAdapterStateV1;
  readonly catalogContentHash: string;
  readonly productionApprovedWeaponAssetCount: 0;
  readonly activeTaskCount: number;
  readonly loadingTaskCount: number;
  readonly readyTaskCount: number;
  readonly cancelledPendingTaskCount: number;
  readonly boundedCompletedIdentityCount: number;
  readonly boundedDisposedIdentityCount: number;
  readonly cleanupFailureCount: number;
  readonly reentryAttemptCount: number;
  readonly ownedUnderlyingLoaderCleanupComplete: boolean;
}

type PlainData = Record<string, unknown>;
type ExternalMethod = (...args: unknown[]) => unknown;
type TaskStateV1 = 'loading' | 'ready' | 'cancelled' | 'failed' | 'disposed';

interface PermittedWeaponAssetV1 {
  readonly definitionId: string;
  readonly assetId: string;
  readonly sha256: string;
  readonly sourceKey: string;
}

interface ParsedLoadRequestV1 {
  readonly request: ArenaV2A6FormalPreviewLoadRequestV1;
  readonly canonical: string;
  readonly asset: PermittedWeaponAssetV1;
}

interface TaskRecordV1 {
  readonly request: ArenaV2A6FormalPreviewLoadRequestV1;
  readonly requestCanonical: string;
  readonly asset: PermittedWeaponAssetV1;
  readonly operation: ArenaV2A6FormalPreviewLoadOperationV1;
  readonly resolveOperation: (handle: THREE.Object3D) => void;
  readonly rejectOperation: (reason: unknown) => void;
  task: PresentationAssetLoadTask | null;
  state: TaskStateV1;
  handle: THREE.Object3D | null;
  taskDestroyInvoked: boolean;
  taskDestroyInProgress: boolean;
  taskDestroyComplete: boolean;
  taskDestroyFailurePending: boolean;
  taskSettlementCleanupFailurePending: boolean;
  retainedInvalidLeaseOwner: unknown | null;
  retainedInvalidLeaseRelease: ExternalMethod | null;
  invalidLeaseCleanupFailurePending: boolean;
  cancelInvoked: boolean;
  publicSettled: boolean;
  taskSettled: boolean;
}

interface DisposeTombstoneV1 {
  readonly canonical: string;
}

const CONSTRUCTOR_KEYS = new Set(['schemaVersion', 'loader']);
const LOAD_REQUEST_KEYS = new Set([
  'schemaVersion', 'requestIdentity', 'epochId', 'catalogContentHash', 'assetId',
  'sha256', 'requestToken',
]);
const DISPOSE_REQUEST_KEYS = new Set([
  'schemaVersion', 'requestIdentity', 'epochId', 'catalogContentHash', 'assetId',
  'sha256', 'handle',
]);
const GLTF_VALUE_KEYS = new Set(['assetId', 'scene', 'animations', 'sourceKey']);
const LOADER_LEASE_KEYS = new Set(['assetId', 'value', 'release']);
const MAX_ACTIVE_TASKS = 20;
const MAX_COMPLETED_IDENTITY_DIAGNOSTICS = 40;
const MAX_DISPOSED_IDENTITY_DIAGNOSTICS = 40;
const NATIVE_PROMISE_THEN = Promise.prototype.then;

function captureDataFields(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  name: string,
  requiredKeys: ReadonlySet<string> = allowedKeys,
): PlainData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name}必须使用普通对象原型。`);
  }
  const result: PlainData = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowedKeys.has(key)) {
      throw new RangeError(`${name}包含未知字段${String(key)}。`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
    result[key] = descriptor.value;
  }
  for (const key of requiredKeys) {
    if (!Object.hasOwn(result, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
  return result;
}

function nonEmptyString(value: unknown, name: string, maximum = 2048): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maximum) {
    throw new TypeError(`${name}必须是1..${maximum}字符的非空字符串。`);
  }
  return value;
}

function sha256(value: unknown, name: string): string {
  const result = nonEmptyString(value, name, 64);
  if (!/^[0-9a-f]{64}$/u.test(result)) throw new RangeError(`${name}必须是64位小写SHA-256。`);
  return result;
}

function ownMethod(value: unknown, key: string, name: string): ExternalMethod {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是对象。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = value;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) throw new TypeError(`${name}原型链无效。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, key);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key}必须是数据方法。`);
      }
      const method = descriptor.value as ExternalMethod;
      return (...args: unknown[]) => method.call(value, ...args);
    }
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  throw new TypeError(`${name}缺少${key}()。`);
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

function requestIdentity(
  value: Omit<ArenaV2A6FormalPreviewLoadRequestV1, 'schemaVersion' | 'requestIdentity'>,
): string {
  return createDeterministicDataHash(
    value,
    'Arena V2 A6.6 Formal Preview Request Identity V1',
  );
}

function buildCurrentlyPermittedWeaponAssets(): ReadonlyMap<string, PermittedWeaponAssetV1> {
  const previewCatalog = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1;
  const weaponBindings = previewCatalog.bindings.filter(({ kind }) => kind === 'weapon');
  const mapBindings = previewCatalog.bindings.filter(({ kind }) => kind === 'map');
  if (weaponBindings.length !== 20 || mapBindings.length !== 2) {
    throw new RangeError('A6.11a要求当前A6.4目录精确包含20把武器与2张地图。');
  }
  if (ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY.assetCount !== 130
    || ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY.grantsApproval !== false
    || ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY.hardGate !== false) {
    throw new RangeError('A6.11a当前生产批准账本治理身份漂移。');
  }
  const permitted = new Map<string, PermittedWeaponAssetV1>();
  for (const binding of [...weaponBindings, ...mapBindings]) {
    const previewRecord = previewCatalog.records.find(({ assetId }) => assetId === binding.assetId);
    const approvalEntry =
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.find(
        ({ assetId }) => assetId === binding.assetId,
      );
    if (previewRecord === undefined
      || approvalEntry === undefined
      || approvalEntry.catalogContentHash
        !== ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.catalogContentHash
      || approvalEntry.assetId !== previewRecord.assetId
      || approvalEntry.artifactPath !== previewRecord.artifactPath
      || approvalEntry.byteLength !== previewRecord.byteLength
      || approvalEntry.sha256 !== previewRecord.sha256
      || approvalEntry.maturity !== previewRecord.maturity
      || approvalEntry.productionApprovalStatus !== 'missing-not-approved'
      || approvalEntry.assetUsePermitted !== false
      || approvalEntry.formalReady !== false) {
      throw new RangeError(`A6.11a资产${binding.definitionId}的当前生产批准事实不闭合。`);
    }
  }
  if (permitted.size !== 0) throw new RangeError('A6.11a当前账本不得允许任何收藏GLB预览。');
  return permitted;
}

const CURRENTLY_PERMITTED_WEAPON_ASSETS = buildCurrentlyPermittedWeaponAssets();

function parseLoadRequest(value: unknown): ParsedLoadRequestV1 {
  const source = captureDataFields(value, LOAD_REQUEST_KEYS, 'A6.11a load request');
  if (source.schemaVersion !== 1) throw new RangeError('A6.11a load request.schemaVersion必须为1。');
  const assetId = nonEmptyString(source.assetId, 'A6.11a load request.assetId', 200);
  const asset = CURRENTLY_PERMITTED_WEAPON_ASSETS.get(assetId);
  if (asset === undefined) {
    throw new RangeError('A6.11a当前生产批准账本允许的收藏GLB预览数量为0。');
  }
  const epochId = nonEmptyString(source.epochId, 'A6.11a load request.epochId', 200);
  const catalogContentHash = nonEmptyString(
    source.catalogContentHash,
    'A6.11a load request.catalogContentHash',
    64,
  );
  const sourceSha256 = sha256(source.sha256, 'A6.11a load request.sha256');
  const sourceToken = nonEmptyString(source.requestToken, 'A6.11a load request.requestToken', 200);
  const sourceIdentity = nonEmptyString(
    source.requestIdentity,
    'A6.11a load request.requestIdentity',
    64,
  );
  if (catalogContentHash !== ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.contentHash
    || sourceSha256 !== asset.sha256) {
    throw new RangeError('A6.11a请求目录、SHA或A6.4 token身份不匹配。');
  }
  const identitySource = Object.freeze({
    epochId,
    catalogContentHash,
    assetId,
    sha256: sourceSha256,
    requestToken: sourceToken,
  });
  if (sourceIdentity !== requestIdentity(identitySource)) {
    throw new RangeError('A6.11a requestIdentity不可复算。');
  }
  const request = Object.freeze({
    schemaVersion: 1 as const,
    requestIdentity: sourceIdentity,
    ...identitySource,
  });
  return Object.freeze({ request, canonical: JSON.stringify(request), asset });
}

function parseDisposeRequest(value: unknown): Readonly<{
  requestIdentity: string;
  epochId: string;
  catalogContentHash: string;
  assetId: string;
  sha256: string;
  handle: unknown;
  canonical: string;
}> {
  const source = captureDataFields(value, DISPOSE_REQUEST_KEYS, 'A6.11a dispose request');
  if (source.schemaVersion !== 1) throw new RangeError('A6.11a dispose request.schemaVersion必须为1。');
  const result = Object.freeze({
    requestIdentity: nonEmptyString(source.requestIdentity, 'A6.11a dispose.requestIdentity', 64),
    epochId: nonEmptyString(source.epochId, 'A6.11a dispose.epochId', 200),
    catalogContentHash: nonEmptyString(source.catalogContentHash, 'A6.11a dispose.catalogContentHash', 64),
    assetId: nonEmptyString(source.assetId, 'A6.11a dispose.assetId', 200),
    sha256: sha256(source.sha256, 'A6.11a dispose.sha256'),
    handle: source.handle,
    canonical: JSON.stringify({
      schemaVersion: 1,
      requestIdentity: source.requestIdentity,
      epochId: source.epochId,
      catalogContentHash: source.catalogContentHash,
      assetId: source.assetId,
      sha256: source.sha256,
    }),
  });
  return result;
}

function parseStaticGltfValue(
  value: unknown,
  record: TaskRecordV1,
): THREE.Object3D {
  const source = captureDataFields(value, GLTF_VALUE_KEYS, `A6.11a ${record.asset.assetId} GLTF value`);
  if (source.assetId !== record.asset.assetId || source.sourceKey !== record.asset.sourceKey) {
    throw new RangeError('A6.11a GLTF结果资产或内部sourceKey身份漂移。');
  }
  if (!(source.scene instanceof THREE.Object3D)) {
    throw new TypeError('A6.11a GLTF结果scene必须来自当前three依赖的Object3D。');
  }
  if (!Array.isArray(source.animations)
    || source.animations.length !== 0
    || Reflect.ownKeys(source.animations).some((key) => key !== 'length')) {
    throw new RangeError('A6.11a武器附件必须是无AnimationClip的静态GLTF。');
  }
  return source.scene;
}

function trimOldest<V>(map: Map<string, V>, maximum: number): void {
  while (map.size > maximum) {
    const oldest = map.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

function errorWithCause(message: string, cause: unknown): Error {
  const error = new Error(message);
  error.cause = cause;
  return error;
}

function hasCleanupFailureMarker(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const descriptor = Object.getOwnPropertyDescriptor(value, 'cleanupCause');
  return descriptor !== undefined && Object.hasOwn(descriptor, 'value');
}

function ownDataRelease(value: unknown): ExternalMethod | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const descriptor = Object.getOwnPropertyDescriptor(value, 'release');
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
    return null;
  }
  return descriptor.value as ExternalMethod;
}

function rejectNonNativeThenable(value: unknown, name: string): void {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return;
  const visited = new Set<object>();
  let cursor: object | null = value as object;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) {
      throw new TypeError(`${name}返回值原型链无效。`);
    }
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, 'then');
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value')) {
        throw new TypeError(`${name}不得返回访问器thenable。`);
      }
      if (typeof descriptor.value === 'function') {
        throw new TypeError(`${name}不得返回thenable。`);
      }
      return;
    }
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
}

/**
 * Production-unreachable A6.11a bridge. The current approval ledger permits
 * zero preview assets, so every request is rejected before the injected GLTF
 * loader. A future ledger version plus an independent gate may reopen this
 * adapter without treating source intake approval as production approval.
 */
export class ArenaV2CollectionPreviewLazyGltfLoaderAdapterCandidateV1
implements ArenaV2A6FormalPreviewLoaderPortV1, ArenaV2A6FormalPreviewDisposerPortV1 {
  readonly #underlyingLoad: ExternalMethod;
  readonly #ownedUnderlyingLoader: GltfPresentationAssetLoader | null;
  readonly #tasks = new Map<string, TaskRecordV1>();
  readonly #completedIdentityDiagnostics = new Map<string, number>();
  readonly #disposedIdentityDiagnostics = new Map<string, number>();
  readonly #disposedHandles = new WeakMap<THREE.Object3D, DisposeTombstoneV1>();
  #state: ArenaV2A6CollectionPreviewLazyGltfLoaderAdapterStateV1 = 'active';
  #cleanupFailureCount = 0;
  #callbackActive = false;
  #reentryAttemptCount = 0;
  #operation: string | null = null;
  #ownedUnderlyingLoaderCleanupComplete = false;
  #ownedUnderlyingLoaderCleanupFailurePending = false;

  constructor(value: unknown = { schemaVersion: 1 }) {
    const required = new Set(['schemaVersion']);
    const source = captureDataFields(value, CONSTRUCTOR_KEYS, 'A6.11a constructor', required);
    if (source.schemaVersion !== 1) throw new RangeError('A6.11a constructor.schemaVersion必须为1。');
    const loader = source.loader === undefined ? new GltfPresentationAssetLoader() : source.loader;
    this.#ownedUnderlyingLoader = source.loader === undefined
      ? loader as GltfPresentationAssetLoader
      : null;
    this.#ownedUnderlyingLoaderCleanupComplete = this.#ownedUnderlyingLoader === null;
    this.#underlyingLoad = ownMethod(loader, 'load', 'A6.11a底层GLTF loader');
  }

  get state(): ArenaV2A6CollectionPreviewLazyGltfLoaderAdapterStateV1 {
    this.#assertNoOperation('state read');
    return this.#state;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) {
      this.#reentryAttemptCount += 1;
      throw new Error(`A6.11a ${this.#operation}期间拒绝${operation}。`);
    }
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    const reentryWaterline = this.#reentryAttemptCount;
    try {
      const result = run();
      if (this.#reentryAttemptCount !== reentryWaterline) {
        const failure = new Error(`A6.11a ${operation}检测到被回调吞掉的重入异常。`);
        if (this.#state === 'destroyed' || this.#state === 'destroy-incomplete') {
          this.#state = 'destroy-incomplete';
        } else {
          this.#markFailed(failure);
        }
        throw failure;
      }
      return result;
    } finally {
      if (this.#operation === operation) this.#operation = null;
    }
  }

  #rejectCallbackReentry(operation: string): void {
    if (!this.#callbackActive) return;
    this.#reentryAttemptCount += 1;
    throw new Error(`${operation}拒绝底层loader/task回调重入。`);
  }

  #assertLoadAllowed(): void {
    this.#rejectCallbackReentry('A6.11a load');
    if (this.#state !== 'active') throw new Error(`A6.11a状态${this.#state}拒绝新load。`);
  }

  #markFailed(_error: unknown): void {
    if (this.#state === 'active') this.#state = 'failed';
  }

  #recordLeaseReleaseFailure(record: TaskRecordV1, error: unknown): void {
    if (this.#state === 'destroyed') this.#state = 'destroy-incomplete';
    else this.#markFailed(error);
    if (!record.taskDestroyInProgress && !record.invalidLeaseCleanupFailurePending) {
      this.#cleanupFailureCount += 1;
      record.invalidLeaseCleanupFailurePending = true;
    }
  }

  #invokeLeaseRelease(record: TaskRecordV1, owner: unknown, release: ExternalMethod): unknown {
    if (this.#callbackActive) {
      this.#reentryAttemptCount += 1;
      throw new Error('A6.11a底层lease.release发生嵌套回调。');
    }
    const before = this.#reentryAttemptCount;
    this.#callbackActive = true;
    let result: unknown = undefined;
    let releaseFailed = false;
    let releaseFailure: unknown = undefined;
    try {
      result = release.call(owner);
      if (isNativePromise(result)) {
        throw new TypeError('A6.11a底层lease.release必须同步完成。');
      }
      rejectNonNativeThenable(result, 'A6.11a底层lease.release');
    } catch (error) {
      releaseFailed = true;
      releaseFailure = error;
    } finally {
      this.#callbackActive = false;
    }
    if (this.#reentryAttemptCount !== before) {
      const reentryError = new Error(`A6.11a ${record.asset.assetId} lease.release发生回调重入。`);
      const failure = releaseFailed
        ? new AggregateError([releaseFailure, reentryError], 'A6.11a lease.release失败且发生回调重入。')
        : reentryError;
      this.#recordLeaseReleaseFailure(record, failure);
      throw failure;
    }
    if (releaseFailed) {
      const retainedReleaseFailure = releaseFailure === null
        ? errorWithCause('A6.11a底层lease.release抛出null。', releaseFailure)
        : releaseFailure;
      this.#recordLeaseReleaseFailure(record, retainedReleaseFailure);
      throw retainedReleaseFailure;
    }
    return result;
  }

  #wrapLoaderLease(record: TaskRecordV1, value: unknown): unknown {
    try {
      const source = captureDataFields(value, LOADER_LEASE_KEYS, 'A6.11a底层GLTF lease');
      if (source.assetId !== record.asset.assetId) throw new RangeError('A6.11a底层lease.assetId漂移。');
      if (source.value === null || source.value === undefined) {
        throw new TypeError('A6.11a底层lease.value不能为空。');
      }
      if (typeof source.release !== 'function') throw new TypeError('A6.11a底层lease.release必须是函数。');
      const release = source.release as ExternalMethod;
      return Object.freeze({
        assetId: record.asset.assetId,
        value: source.value,
        release: () => this.#invokeLeaseRelease(record, value, release),
      });
    } catch (error) {
      this.#markFailed(error);
      const release = ownDataRelease(value);
      if (release !== null) {
        record.retainedInvalidLeaseOwner = value;
        record.retainedInvalidLeaseRelease = release;
        try {
          this.#invokeLeaseRelease(record, value, release);
          record.retainedInvalidLeaseOwner = null;
          record.retainedInvalidLeaseRelease = null;
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            'A6.11a无效底层lease且清理失败。',
          );
        }
      }
      throw error;
    }
  }

  #retryRetainedInvalidLeaseCleanup(record: TaskRecordV1): unknown | null {
    if (record.retainedInvalidLeaseOwner === null
      || record.retainedInvalidLeaseRelease === null) return null;
    try {
      this.#invokeLeaseRelease(
        record,
        record.retainedInvalidLeaseOwner,
        record.retainedInvalidLeaseRelease,
      );
      record.retainedInvalidLeaseOwner = null;
      record.retainedInvalidLeaseRelease = null;
      if (record.invalidLeaseCleanupFailurePending) {
        record.invalidLeaseCleanupFailurePending = false;
        this.#cleanupFailureCount = Math.max(0, this.#cleanupFailureCount - 1);
      }
      return null;
    } catch (error) {
      return error;
    }
  }

  #invokeUnderlyingLoader(record: TaskRecordV1, definition: unknown): unknown {
    if (record.state !== 'loading' || this.#state !== 'active') {
      throw new Error('A6.11a底层loader启动时任务已不可接收。');
    }
    if (typeof definition !== 'object' || definition === null
      || Reflect.get(definition, 'id') !== record.asset.assetId
      || Reflect.get(definition, 'kind') !== PRESENTATION_ASSET_KIND.ATTACHMENT
      || Reflect.get(definition, 'providerId') !== ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_ATTACHMENT_V1
      || Reflect.get(definition, 'sourceKey') !== record.asset.sourceKey) {
      const error = new RangeError('A6.11a PresentationAssetLoadTask Definition身份漂移。');
      this.#markFailed(error);
      throw error;
    }
    if (this.#callbackActive) {
      this.#reentryAttemptCount += 1;
      throw new Error('A6.11a底层loader发生嵌套回调。');
    }
    const before = this.#reentryAttemptCount;
    this.#callbackActive = true;
    let result: unknown;
    try {
      result = this.#underlyingLoad(definition);
    } catch (error) {
      throw error;
    } finally {
      this.#callbackActive = false;
    }
    if (this.#reentryAttemptCount !== before) {
      const error = new Error(`A6.11a ${record.asset.assetId} loader发生回调重入。`);
      this.#markFailed(error);
      throw error;
    }
    if (isNativePromise(result)) {
      return Reflect.apply(NATIVE_PROMISE_THEN, result, [
        (lease: unknown) => this.#wrapLoaderLease(record, lease),
      ]) as Promise<unknown>;
    }
    return this.#wrapLoaderLease(record, result);
  }

  #settlePublicRejected(record: TaskRecordV1, error: unknown): void {
    if (record.publicSettled) return;
    record.publicSettled = true;
    record.rejectOperation(error);
  }

  #destroyTaskOnce(record: TaskRecordV1): unknown | null {
    if (record.task !== null && !record.taskDestroyComplete
      && (!record.taskDestroyInvoked || record.taskSettled)) {
      record.taskDestroyInvoked = true;
      record.taskDestroyInProgress = true;
      let destroyFailed = false;
      let failure: unknown = undefined;
      try {
        record.task.destroy();
        record.taskDestroyComplete = record.task.isCleanupComplete();
      } catch (error) {
        destroyFailed = true;
        failure = error;
      } finally {
        record.taskDestroyInProgress = false;
      }
      if (destroyFailed) {
        const retainedFailure = failure === null
          ? errorWithCause('A6.11a task.destroy抛出null。', failure)
          : failure;
        if (!record.taskDestroyFailurePending) this.#cleanupFailureCount += 1;
        record.taskDestroyFailurePending = true;
        this.#markFailed(retainedFailure);
        return retainedFailure;
      }
    }
    if (!record.taskDestroyComplete) return null;
    if (record.taskDestroyComplete && record.taskDestroyFailurePending) {
      record.taskDestroyFailurePending = false;
      this.#cleanupFailureCount = Math.max(0, this.#cleanupFailureCount - 1);
    }
    if (record.taskDestroyComplete && record.taskSettlementCleanupFailurePending) {
      record.taskSettlementCleanupFailurePending = false;
      this.#cleanupFailureCount = Math.max(0, this.#cleanupFailureCount - 1);
    }
    const invalidLeaseFailure = this.#retryRetainedInvalidLeaseCleanup(record);
    if (invalidLeaseFailure !== null) return invalidLeaseFailure;
    return null;
  }

  #rememberCompletedIdentity(record: TaskRecordV1): void {
    const identity = record.request.requestIdentity;
    this.#completedIdentityDiagnostics.set(
      identity,
      (this.#completedIdentityDiagnostics.get(identity) ?? 0) + 1,
    );
    trimOldest(this.#completedIdentityDiagnostics, MAX_COMPLETED_IDENTITY_DIAGNOSTICS);
  }

  #finishTaskRecord(record: TaskRecordV1): void {
    if (!this.#taskRecordCleanupComplete(record)
      || record.state === 'loading' || record.state === 'ready') return;
    if (this.#tasks.get(record.request.requestIdentity) === record) {
      this.#tasks.delete(record.request.requestIdentity);
    }
    this.#rememberCompletedIdentity(record);
    this.#continueOwnedUnderlyingLoaderDestroy();
  }

  #continueOwnedUnderlyingLoaderDestroy(): void {
    if (this.#state !== 'destroyed' && this.#state !== 'destroy-incomplete') return;
    if (this.#tasks.size > 0 || this.#ownedUnderlyingLoaderCleanupComplete) return;
    if (this.#ownedUnderlyingLoader === null) {
      this.#ownedUnderlyingLoaderCleanupComplete = true;
      if (this.#cleanupFailureCount === 0) this.#state = 'destroyed';
      return;
    }
    try {
      this.#ownedUnderlyingLoader.destroy();
      if (!this.#ownedUnderlyingLoader.isCleanupComplete()) {
        throw new Error('A6.11a底层自有GLTF loader清理尚未收敛。');
      }
      this.#ownedUnderlyingLoaderCleanupComplete = true;
      if (this.#ownedUnderlyingLoaderCleanupFailurePending) {
        this.#ownedUnderlyingLoaderCleanupFailurePending = false;
        this.#cleanupFailureCount = Math.max(0, this.#cleanupFailureCount - 1);
      }
      if (this.#cleanupFailureCount === 0) this.#state = 'destroyed';
    } catch (error) {
      if (!this.#ownedUnderlyingLoaderCleanupFailurePending) {
        this.#ownedUnderlyingLoaderCleanupFailurePending = true;
        this.#cleanupFailureCount += 1;
      }
      this.#state = 'destroy-incomplete';
      throw error;
    }
  }

  #taskRecordCleanupComplete(record: TaskRecordV1): boolean {
    return record.taskSettled
      && record.taskDestroyComplete
      && !record.taskDestroyFailurePending
      && !record.taskSettlementCleanupFailurePending
      && !record.invalidLeaseCleanupFailurePending
      && record.retainedInvalidLeaseOwner === null
      && record.retainedInvalidLeaseRelease === null;
  }

  #onTaskResolved(record: TaskRecordV1, rawValue: unknown): THREE.Object3D | null {
    record.taskSettled = true;
    if (record.state === 'cancelled' || this.#state === 'destroyed'
      || this.#state === 'destroy-incomplete') {
      const cleanupFailure = this.#destroyTaskOnce(record);
      if (cleanupFailure !== null && this.#state === 'destroyed') this.#state = 'destroy-incomplete';
      this.#settlePublicRejected(record, new Error('A6.11a迟到加载结果已拒绝并回收。'));
      this.#finishTaskRecord(record);
      return null;
    }
    try {
      const handle = parseStaticGltfValue(rawValue, record);
      if (this.#state !== 'active') throw new Error('A6.11a加载完成时Owner已不可发布。');
      record.handle = handle;
      record.state = 'ready';
      return handle;
    } catch (error) {
      record.state = 'failed';
      const cleanupFailure = this.#destroyTaskOnce(record);
      const failure = cleanupFailure === null
        ? error
        : new AggregateError([error, cleanupFailure], 'A6.11a无效GLTF且清理失败。');
      this.#markFailed(failure);
      this.#settlePublicRejected(record, failure);
      this.#finishTaskRecord(record);
      return null;
    }
  }

  #onTaskRejected(record: TaskRecordV1, reason: unknown): void {
    record.taskSettled = true;
    const cancelledOrDestroyed = record.state === 'cancelled'
      || this.#state === 'destroyed'
      || this.#state === 'destroy-incomplete';
    if (!cancelledOrDestroyed) record.state = 'failed';
    if (!cancelledOrDestroyed && hasCleanupFailureMarker(reason)) {
      if (!record.taskSettlementCleanupFailurePending) this.#cleanupFailureCount += 1;
      record.taskSettlementCleanupFailurePending = true;
      this.#markFailed(reason);
    }
    const cleanupFailure = this.#destroyTaskOnce(record);
    if (cleanupFailure !== null && this.#state === 'destroyed') this.#state = 'destroy-incomplete';
    this.#settlePublicRejected(
      record,
      cancelledOrDestroyed ? new Error('A6.11a加载已取消。') : reason,
    );
    this.#finishTaskRecord(record);
  }

  #failTaskSettlementObserver(record: TaskRecordV1, error: unknown): void {
    this.#markFailed(error);
    if (record.state === 'loading' || record.state === 'ready') record.state = 'failed';
    const cleanupFailure = this.#destroyTaskOnce(record);
    if (record.taskDestroyComplete) record.handle = null;
    const failure = cleanupFailure === null
      ? error
      : new AggregateError([error, cleanupFailure], 'A6.11a task结算失败且清理未完成。');
    this.#settlePublicRejected(record, failure);
    this.#finishTaskRecord(record);
  }

  #observeTaskResolved(record: TaskRecordV1, rawValue: unknown): void {
    try {
      const handle = this.#runSynchronousOperation(
        'task-resolved',
        () => this.#onTaskResolved(record, rawValue),
      );
      if (handle !== null && !record.publicSettled) {
        record.publicSettled = true;
        record.resolveOperation(handle);
      }
    } catch (error) {
      try {
        this.#runSynchronousOperation(
          'task-resolution-failure',
          () => this.#failTaskSettlementObserver(record, error),
        );
      } catch (commitError) {
        this.#failTaskSettlementObserver(record, new AggregateError(
          [error, commitError],
          'A6.11a task成功结算的失败关闭未完整提交。',
        ));
      }
    }
  }

  #observeTaskRejected(record: TaskRecordV1, reason: unknown): void {
    try {
      this.#runSynchronousOperation(
        'task-rejected',
        () => this.#onTaskRejected(record, reason),
      );
    } catch (error) {
      try {
        this.#runSynchronousOperation(
          'task-rejection-failure',
          () => this.#failTaskSettlementObserver(record, error),
        );
      } catch (commitError) {
        this.#failTaskSettlementObserver(record, new AggregateError(
          [error, commitError],
          'A6.11a task拒绝结算的失败关闭未完整提交。',
        ));
      }
    }
  }

  #cancel(record: TaskRecordV1): void {
    this.#runSynchronousOperation('cancel', () => {
    this.#rejectCallbackReentry('A6.11a cancel');
    if (record.cancelInvoked) {
      const retryFailure = this.#destroyTaskOnce(record);
      if (retryFailure !== null) {
        throw errorWithCause('A6.11a惰性GLB请求取消清理重试失败。', retryFailure);
      }
      return;
    }
    if (record.state === 'disposed' || record.state === 'failed') return;
    if (record.state === 'ready') throw new Error('A6.11a ready handle必须经disposer释放，不能cancel。');
    record.cancelInvoked = true;
    record.state = 'cancelled';
    const cleanupFailure = this.#destroyTaskOnce(record);
    const error = cleanupFailure === null
      ? new Error('A6.11a惰性GLB请求已同步取消。')
      : errorWithCause('A6.11a惰性GLB请求取消清理失败。', cleanupFailure);
    this.#settlePublicRejected(record, error);
    this.#finishTaskRecord(record);
    });
  }

  load(value: ArenaV2A6FormalPreviewLoadRequestV1): ArenaV2A6FormalPreviewLoadOperationV1 {
    return this.#runSynchronousOperation('load', () => {
    this.#assertLoadAllowed();
    const parsed = parseLoadRequest(value);
    const existing = this.#tasks.get(parsed.request.requestIdentity);
    if (existing !== undefined) {
      if (existing.requestCanonical !== parsed.canonical) {
        throw new RangeError('A6.11a requestIdentity发生完整canonical冲突。');
      }
      return existing.operation;
    }
    if (this.#tasks.size >= MAX_ACTIVE_TASKS) {
      throw new RangeError('A6.11a活跃惰性GLB task超过20。');
    }
    let resolveOperation: (handle: THREE.Object3D) => void = () => undefined;
    let rejectOperation: (reason: unknown) => void = () => undefined;
    const promise = new Promise<THREE.Object3D>((resolve, reject) => {
      resolveOperation = resolve;
      rejectOperation = reject;
    });
    const record = {} as TaskRecordV1;
    const operation = Object.freeze({
      promise,
      cancel: () => this.#cancel(record),
    });
    Object.assign(record, {
      request: parsed.request,
      requestCanonical: parsed.canonical,
      asset: parsed.asset,
      operation,
      resolveOperation,
      rejectOperation,
      task: null,
      state: 'loading' as const,
      handle: null,
      taskDestroyInvoked: false,
      taskDestroyInProgress: false,
      taskDestroyComplete: false,
      taskDestroyFailurePending: false,
      taskSettlementCleanupFailurePending: false,
      retainedInvalidLeaseOwner: null,
      retainedInvalidLeaseRelease: null,
      invalidLeaseCleanupFailurePending: false,
      cancelInvoked: false,
      publicSettled: false,
      taskSettled: false,
    });
    const taskLoader = Object.freeze({
      load: (definition: unknown) => this.#invokeUnderlyingLoader(record, definition),
    });
    const task = new PresentationAssetLoadTask({
      assetRegistry: ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.visualAssetRegistry,
      assetId: parsed.asset.assetId,
      loader: taskLoader,
    });
    record.task = task;
    this.#tasks.set(parsed.request.requestIdentity, record);
    let taskOperation: Promise<unknown>;
    try {
      taskOperation = task.load();
    } catch (error) {
      record.state = 'failed';
      record.taskSettled = true;
      this.#markFailed(error);
      this.#destroyTaskOnce(record);
      this.#settlePublicRejected(record, error);
      this.#finishTaskRecord(record);
      throw error;
    }
    Reflect.apply(NATIVE_PROMISE_THEN, taskOperation, [
      (loaded: unknown) => this.#observeTaskResolved(record, loaded),
      (reason: unknown) => this.#observeTaskRejected(record, reason),
    ]);
    return operation;
    });
  }

  dispose(value: ArenaV2A6FormalPreviewDisposeRequestV1): void {
    this.#runSynchronousOperation('dispose', () => {
    this.#rejectCallbackReentry('A6.11a dispose');
    const parsed = parseDisposeRequest(value);
    if (parsed.handle instanceof THREE.Object3D) {
      const tombstone = this.#disposedHandles.get(parsed.handle);
      if (tombstone !== undefined) {
        if (tombstone.canonical === parsed.canonical) return;
        throw new RangeError('A6.11a重复dispose事实冲突。');
      }
    }
    if (this.#state === 'destroyed' || this.#state === 'destroy-incomplete') {
      throw new Error(`A6.11a状态${this.#state}拒绝未知dispose。`);
    }
    const record = this.#tasks.get(parsed.requestIdentity);
    if (record === undefined) throw new RangeError('A6.11a dispose收到未知requestIdentity。');
    if (record.request.epochId !== parsed.epochId
      || record.request.catalogContentHash !== parsed.catalogContentHash
      || record.request.assetId !== parsed.assetId
      || record.request.sha256 !== parsed.sha256
      || record.handle !== parsed.handle
      || !(parsed.handle instanceof THREE.Object3D)) {
      throw new RangeError('A6.11a dispose完整身份或handle对象身份不匹配。');
    }
    const retryingRetainedDestroyDebt = record.state === 'failed'
      && record.handle === parsed.handle
      && !record.taskDestroyComplete;
    if (record.state !== 'ready' && !retryingRetainedDestroyDebt) {
      throw new Error(`A6.11a ${record.asset.assetId}尚无可释放ready handle。`);
    }
    const cleanupFailure = this.#destroyTaskOnce(record);
    if (cleanupFailure !== null) {
      record.state = 'failed';
      throw errorWithCause('A6.11a底层task lease释放失败。', cleanupFailure);
    }
    record.state = 'disposed';
    record.handle = null;
    this.#tasks.delete(parsed.requestIdentity);
    this.#rememberCompletedIdentity(record);
    this.#disposedHandles.set(parsed.handle, Object.freeze({
      canonical: parsed.canonical,
    }));
    this.#disposedIdentityDiagnostics.set(
      parsed.requestIdentity,
      (this.#disposedIdentityDiagnostics.get(parsed.requestIdentity) ?? 0) + 1,
    );
    trimOldest(this.#disposedIdentityDiagnostics, MAX_DISPOSED_IDENTITY_DIAGNOSTICS);
    });
  }

  getSnapshot(): ArenaV2A6CollectionPreviewLazyGltfLoaderAdapterSnapshotV1 {
    return this.#runSynchronousOperation('snapshot-read', () => {
    this.#rejectCallbackReentry('A6.11a getSnapshot');
    const records = [...this.#tasks.values()];
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      implementationStatus: 'code-written-not-run' as const,
      state: this.#state,
      catalogContentHash: ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.contentHash,
      productionApprovedWeaponAssetCount: 0 as const,
      activeTaskCount: records.length,
      loadingTaskCount: records.filter(({ state }) => state === 'loading').length,
      readyTaskCount: records.filter(({ state }) => state === 'ready').length,
      cancelledPendingTaskCount: records.filter(({ state, taskSettled }) => (
        state === 'cancelled' && !taskSettled
      )).length,
      boundedCompletedIdentityCount: this.#completedIdentityDiagnostics.size,
      boundedDisposedIdentityCount: this.#disposedIdentityDiagnostics.size,
      cleanupFailureCount: this.#cleanupFailureCount,
      reentryAttemptCount: this.#reentryAttemptCount,
      ownedUnderlyingLoaderCleanupComplete: this.#ownedUnderlyingLoaderCleanupComplete,
    });
    });
  }

  destroy(): void {
    this.#runSynchronousOperation('destroy', () => {
    this.#rejectCallbackReentry('A6.11a destroy');
    if (this.#state === 'destroyed' && this.#cleanupFailureCount === 0) return;
    this.#state = 'destroy-incomplete';
    for (const record of this.#tasks.values()) {
      if (record.state === 'loading') {
        record.state = 'cancelled';
        record.cancelInvoked = true;
        this.#settlePublicRejected(record, new Error('A6.11a Owner销毁已取消加载。'));
      }
    }
    for (const [identity, record] of this.#tasks) {
      const failure = this.#destroyTaskOnce(record);
      if (failure !== null) return;
      if (record.taskDestroyComplete) {
        record.handle = null;
        if (record.state === 'ready' || record.state === 'failed') record.state = 'disposed';
      } else if (record.state === 'ready') {
        record.state = 'failed';
      }
      if (this.#taskRecordCleanupComplete(record)) {
        this.#rememberCompletedIdentity(record);
        if (this.#tasks.get(identity) === record) this.#tasks.delete(identity);
        continue;
      }
      return;
    }
    if (this.#tasks.size === 0) this.#continueOwnedUnderlyingLoaderDestroy();
    this.#state = this.#cleanupFailureCount > 0
      || this.#tasks.size > 0
      || !this.#ownedUnderlyingLoaderCleanupComplete
      ? 'destroy-incomplete'
      : 'destroyed';
    });
  }
}

export const ARENA_V2_A6_COLLECTION_PREVIEW_LAZY_GLTF_LOADER_ADAPTER_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  stage: 'A6.11a' as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  loadsBytesHere: true as const,
  currentLoadsBytesHere: false as const,
  lazy: true as const,
  preloadsCatalog: false as const,
  createsThreeResourcesThroughInjectedGltfLoader: true as const,
  ownsThreeResourcesThroughTaskLease: true as const,
  directlyDisposesSharedResources: false as const,
  createsRendererOrDomHere: false as const,
  productionApprovedWeaponAssetCount: 0 as const,
  currentLoaderReachableAssetCount: 0 as const,
  futureEnablementRequiresNewApprovalLedgerVersionAndIndependentGate: true as const,
  mapAssetsPermitted: false as const,
  maximumActiveTasks: MAX_ACTIVE_TASKS,
  runtimeSourceKeyExposedToA6_6: false as const,
  taskDestroyRetriesOnlyIncompleteSettledCleanup: true as const,
  destroyIncompleteRetainsTaskRecords: true as const,
  failedDisposeRetainsHandleForRetry: true as const,
  sequentialReloadAfterDisposeAllowed: true as const,
  activeGenerationDeduplicatedByFullCanonical: true as const,
  disposeReplayUsesWeakHandleIdentity: true as const,
  synchronousLifecycleOperationReentryRejected: true as const,
  swallowedCallbackReentryFailsClosed: true as const,
  taskOperationOwnerPublishedBeforeTaskLoad: true as const,
  taskSettlementCommitsUnderOperationGuard: true as const,
  successfulTaskPromiseResolvesAfterGuardedStateCommit: true as const,
  releasedOrDestroyedTaskCannotBeRevivedByLateLoad: true as const,
  defaultUnderlyingLoaderOwnedUntilAllTasksSettle: true as const,
  successfulOwnedLoaderRetryPublishesDestroyed: true as const,
  thrownNullAndUndefinedRemainLifecycleFailures: true as const,
  taskDestroyAndCleanupCheckShareFailureWatermark: true as const,
  ordinaryCleanupFailureRetainsCurrentAndLaterTaskRecords: true as const,
  ownedUnderlyingLoaderDestroyWaitsForEveryTaskRecordCleanup: true as const,
  publicReadsRejectedDuringOperationCommit: true as const,
  validationStatus: 'not-run' as const,
  screenshotEvidence: 'not-run' as const,
  browserEvidence: 'not-run' as const,
  deviceEvidence: 'not-run' as const,
  performanceEvidence: 'not-run' as const,
});
