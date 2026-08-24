import {
  assertSynchronousReturn as rejectThenable,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import * as THREE from 'three';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
  type ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
  type ArenaV2A6FormalPreviewBindingSlotV1,
} from './arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import {
  ArenaV2CollectionFormalPreviewLeaseOwnerCandidateV1,
  type ArenaV2A6FormalPreviewLeaseResultV1,
} from './arena-v2-collection-formal-preview-lease-owner-candidate-v1.js';
import {
  requireArenaV2WeaponFirstScreenReadabilityProfileCandidateV1,
} from './arena-v2-character-weapon-first-screen-readability-candidate-v1.js';

export const ARENA_V2_A6_WEAPON_PREVIEW_THREE_MOUNT_OWNER_SCHEMA_VERSION_V1 = 1 as const;

export type ArenaV2A6WeaponPreviewScreenIdV1 = 'weapon-index' | 'weapon-detail';
export type ArenaV2A6WeaponPreviewViewportIdV1 = '390x844' | '1440x900';

export interface ArenaV2A6WeaponPreviewViewportV1 {
  readonly viewportId: ArenaV2A6WeaponPreviewViewportIdV1;
  readonly widthCssPixels: 390 | 1440;
  readonly heightCssPixels: 844 | 900;
}

export interface ArenaV2A6WeaponPreviewRectCssPixelsV1 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ArenaV2A6WeaponPreviewThreeMountInputV1 {
  readonly schemaVersion: typeof ARENA_V2_A6_WEAPON_PREVIEW_THREE_MOUNT_OWNER_SCHEMA_VERSION_V1;
  readonly mountId: string;
  readonly tick: number;
  readonly bindingSnapshot: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
  readonly slot: ArenaV2A6FormalPreviewBindingSlotV1;
  readonly leaseResult: ArenaV2A6FormalPreviewLeaseResultV1;
  readonly screenId: ArenaV2A6WeaponPreviewScreenIdV1;
  readonly viewport: ArenaV2A6WeaponPreviewViewportV1;
  readonly previewRectCssPixels: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly reducedMotion: boolean;
}

export interface ArenaV2A6WeaponPreviewThreeMountDestroyInputV1 {
  readonly schemaVersion: typeof ARENA_V2_A6_WEAPON_PREVIEW_THREE_MOUNT_OWNER_SCHEMA_VERSION_V1;
  readonly mountId: string;
  readonly tick: number;
}

export interface ArenaV2A6WeaponPreviewEntryTurnPlanV1 {
  readonly enabled: boolean;
  readonly automaticRotation: false;
  readonly repeat: false;
  readonly fromYawRadians: -0.18 | 0;
  readonly toYawRadians: 0;
  readonly durationTicks: 0 | 12;
}

export interface ArenaV2A6WeaponPreviewThreeMountV1 {
  readonly schemaVersion: typeof ARENA_V2_A6_WEAPON_PREVIEW_THREE_MOUNT_OWNER_SCHEMA_VERSION_V1;
  readonly status: 'production-unreachable';
  readonly validationStatus: 'not-run';
  readonly mountId: string;
  readonly tick: number;
  readonly epochId: string;
  readonly catalogContentHash: string;
  readonly bindingIdentity: string;
  readonly definitionId: string;
  readonly assetId: string;
  readonly visibleSlotLeaseId: string;
  readonly requestIdentity: string;
  readonly screenId: ArenaV2A6WeaponPreviewScreenIdV1;
  readonly viewport: ArenaV2A6WeaponPreviewViewportV1;
  readonly previewRectCssPixels: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly reducedMotion: boolean;
  readonly previewGroup: THREE.Group;
  readonly modelClone: THREE.Object3D;
  readonly camera: THREE.PerspectiveCamera;
  readonly hemisphereLight: THREE.HemisphereLight;
  readonly directionalLight: THREE.DirectionalLight;
  readonly framing: Readonly<{
    readonly sourceBoundsSize: Readonly<{ x: number; y: number; z: number }>;
    readonly sourceBoundsCenter: Readonly<{ x: number; y: number; z: number }>;
    readonly uniformScale: number;
    readonly cameraFovDegrees: 30 | 34;
    readonly cameraDistance: 4.2 | 4.8;
    readonly safeInsetCssPixels: 8 | 12;
    readonly minimumSlotCssPixels: 72 | 96 | 168 | 240;
  }>;
  readonly entryTurnPlan: ArenaV2A6WeaponPreviewEntryTurnPlanV1;
  readonly ownership: Readonly<{
    readonly ownsPreviewGroup: true;
    readonly ownsCamera: true;
    readonly ownsLights: true;
    readonly ownsClonedHierarchyNodes: true;
    readonly ownsGeometry: false;
    readonly ownsMaterial: false;
    readonly ownsTexture: false;
    readonly disposesSharedRenderResources: false;
    readonly a6_6LeaseReleaseOwner: 'upstream-host';
    readonly releaseOrdering: 'destroy-mount-before-a6.6-lease-release';
  }>;
}

export interface ArenaV2A6WeaponPreviewThreeMountOwnerSnapshotV1 {
  readonly schemaVersion: typeof ARENA_V2_A6_WEAPON_PREVIEW_THREE_MOUNT_OWNER_SCHEMA_VERSION_V1;
  readonly status: 'production-unreachable';
  readonly validationStatus: 'not-run';
  readonly state: 'active' | 'failed' | 'destroyed';
  readonly epochId: string;
  readonly catalogContentHash: string;
  readonly bindingIdentity: string;
  readonly bindingCanonicalByteLength: number;
  readonly lastTick: number;
  readonly activeMountCount: number;
  readonly cleanupDebtCount: number;
  readonly destroyedMountHistoryCount: number;
  readonly automaticRotationEnabled: false;
  readonly createsRenderer: false;
  readonly createsDom: false;
  readonly releasesA6_6LeaseHere: false;
}

interface ParsedMountInputV1 {
  readonly inputCanonical: string;
  readonly mountId: string;
  readonly tick: number;
  readonly epochId: string;
  readonly catalogContentHash: string;
  readonly bindingIdentity: string;
  readonly bindingCanonical: string;
  readonly definitionId: string;
  readonly assetId: string;
  readonly visibleSlotLeaseId: string;
  readonly requestIdentity: string;
  readonly screenId: ArenaV2A6WeaponPreviewScreenIdV1;
  readonly viewport: ArenaV2A6WeaponPreviewViewportV1;
  readonly previewRectCssPixels: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly reducedMotion: boolean;
  readonly safeInsetCssPixels: 8 | 12;
  readonly minimumSlotCssPixels: 72 | 96 | 168 | 240;
  readonly handle: THREE.Object3D;
}

interface MountRecordV1 {
  readonly canonical: string;
  readonly sourceHandle: THREE.Object3D;
  readonly mount: ArenaV2A6WeaponPreviewThreeMountV1;
  readonly cleanup: OwnedMountObjectsV1;
}

interface OwnedMountObjectsV1 {
  previewGroup: THREE.Group | null;
  modelClone: THREE.Object3D | null;
  camera: THREE.PerspectiveCamera | null;
  hemisphereLight: THREE.HemisphereLight | null;
  directionalLight: THREE.DirectionalLight | null;
}

interface BuiltMountV1 {
  readonly mount: ArenaV2A6WeaponPreviewThreeMountV1;
  readonly cleanup: OwnedMountObjectsV1;
}

class WeaponCollectionPreviewMountBuildCleanupFailureV1 extends Error {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly cleanupDebt: OwnedMountObjectsV1;

  constructor(originalError: unknown, cleanupError: unknown, cleanupDebt: OwnedMountObjectsV1) {
    super('A6.9 mount构造失败且自有Three对象清理不完整。');
    this.name = 'WeaponCollectionPreviewMountBuildCleanupFailureV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.cleanupDebt = cleanupDebt;
  }
}

interface SourceHierarchyAuditV1 {
  readonly nodes: readonly THREE.Object3D[];
  readonly meshes: readonly THREE.Mesh[];
  readonly parents: ReadonlyMap<THREE.Object3D, THREE.Object3D | null>;
  readonly children: ReadonlyMap<THREE.Object3D, readonly THREE.Object3D[]>;
  readonly transforms: ReadonlyMap<THREE.Object3D, readonly number[]>;
}

type DataRecord = Record<string, unknown>;

const OWNER_KEYS = new Set(['schemaVersion', 'bindingSnapshot']);
const MOUNT_KEYS = new Set([
  'schemaVersion', 'mountId', 'tick', 'bindingSnapshot', 'slot', 'leaseResult',
  'screenId', 'viewport', 'previewRectCssPixels', 'reducedMotion',
]);
const DESTROY_KEYS = new Set(['schemaVersion', 'mountId', 'tick']);
const VIEWPORT_KEYS = new Set(['viewportId', 'widthCssPixels', 'heightCssPixels']);
const PREVIEW_RECT_KEYS = new Set(['x', 'y', 'width', 'height']);
const LEASE_READY_KEYS = new Set([
  'schemaVersion', 'status', 'visibleSlotLeaseId', 'requestIdentity', 'assetId',
  'handle', 'fallbackActive',
]);
const SLOT_KEYS = new Set([
  'kind', 'definitionId', 'displayName', 'ordinal', 'assetId', 'runtimeSourceKey',
  'role', 'maturity', 'provenance', 'byteLength', 'sha256', 'availability',
  'formalReady', 'assetUsePermitted', 'previewSourceUse', 'previewStrategies',
  'budget', 'lifecycle', 'fallback',
]);
const PROVENANCE_KEYS = new Set([
  'sourceLocator', 'sourceRevision', 'licenseId', 'rightsHolder', 'approvedBy',
  'approvedAt', 'proofDocument', 'commercialUseDeclared', 'modificationDeclared',
  'redistributionDeclared', 'attributionRequired',
]);
const LIFECYCLE_KEYS = new Set([
  'lazyRequest', 'requestPermitted', 'requestWhen', 'requestToken', 'releaseWhen',
  'releaseToken', 'loadsBytesHere', 'ownsThreeResourcesHere',
]);
const FALLBACK_KEYS = new Set([
  'active', 'content', 'preservesDefinitionIdentity', 'programmaticGeometryAllowed',
  'claimsFormalApproval',
]);
const MAX_HIERARCHY_NODES = 256;
const MAX_POSITION_VERTICES = 250_000;
const MAX_ACTIVE_MOUNTS = 32;
const MAX_DESTROYED_MOUNT_HISTORY = 64;
const MIN_MODEL_EXTENT = 0.0001;
const MAX_MODEL_EXTENT = 10_000;

function exactDataRecord(value: unknown, keys: ReadonlySet<string>, name: string): DataRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是plain object。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name}原型不受支持。`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== 'string')
    || ownKeys.length !== keys.size
    || ownKeys.some((key) => !keys.has(key as string))) {
    throw new TypeError(`${name}字段必须exact-key。`);
  }
  const output: DataRecord = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (descriptor === undefined || !('value' in descriptor)) {
      throw new TypeError(`${name}.${key}不得是getter/setter。`);
    }
    output[key] = descriptor.value;
  }
  return output;
}

function cloneStrictData(
  value: unknown,
  name: string,
  depth = 0,
  seen = new Set<object>(),
): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${name}不得包含NaN/Infinity。`);
    return value;
  }
  if (typeof value !== 'object') throw new TypeError(`${name}只能包含纯数据。`);
  if (depth > 16 || seen.has(value)) throw new TypeError(`${name}深度或循环引用无效。`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      if (value.length > 512) throw new RangeError(`${name}数组超出有界容量。`);
      return value.map((entry, index) => cloneStrictData(entry, `${name}[${index}]`, depth + 1, seen));
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${name}只能包含plain object。`);
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const ownKeys = Reflect.ownKeys(descriptors);
    if (ownKeys.some((key) => typeof key !== 'string') || ownKeys.length > 128) {
      throw new TypeError(`${name}包含symbol或过多字段。`);
    }
    const output: DataRecord = {};
    for (const key of ownKeys as string[]) {
      const descriptor = descriptors[key];
      if (descriptor === undefined || !('value' in descriptor)) {
        throw new TypeError(`${name}.${key}不得是getter/setter。`);
      }
      output[key] = cloneStrictData(descriptor.value, `${name}.${key}`, depth + 1, seen);
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

function canonicalDataString(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('A6.9 canonical不得包含NaN/Infinity。');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalDataString).join(',')}]`;
  if (typeof value !== 'object') throw new TypeError('A6.9 canonical只能包含纯数据。');
  const source = value as Readonly<Record<string, unknown>>;
  const keys = Object.keys(source).sort((left, right) => left.localeCompare(right, 'en'));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalDataString(source[key])}`).join(',')}}`;
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const symbol of value) {
    const codePoint = symbol.codePointAt(0);
    if (codePoint === undefined) continue;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function nonEmptyString(value: unknown, name: string, maximum = 256): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum || value.trim() !== value) {
    throw new TypeError(`${name}必须是有界非空字符串。`);
  }
  return value;
}

function safeTick(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(`${name}必须是非负安全整数tick。`);
  }
  return value as number;
}

function safePositiveInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new TypeError(`${name}必须是正安全整数。`);
  }
  return value as number;
}

function sha256(value: unknown, name: string): string {
  const digest = nonEmptyString(value, name, 64);
  if (!/^[a-f0-9]{64}$/u.test(digest)) throw new TypeError(`${name}必须是小写SHA-256。`);
  return digest;
}

function assertScalarIdentity(
  actual: DataRecord,
  expectedValue: unknown,
  keys: ReadonlySet<string>,
  name: string,
): void {
  const expected = exactDataRecord(expectedValue, keys, `${name}.expected`);
  for (const key of keys) {
    if (actual[key] !== expected[key]) throw new RangeError(`${name}.${key}与当前目录漂移。`);
  }
}

function expectedA6_6RequestIdentity(
  epochId: string,
  catalogContentHash: string,
  assetId: string,
  digest: string,
  requestToken: string,
): string {
  return createDeterministicDataHash(Object.freeze({
    epochId,
    catalogContentHash,
    assetId,
    sha256: digest,
    requestToken,
  }), 'Arena V2 A6.6 Formal Preview Request Identity V1');
}

function parseViewport(value: unknown): ArenaV2A6WeaponPreviewViewportV1 {
  const source = exactDataRecord(value, VIEWPORT_KEYS, 'A6.9 viewport');
  if (source.viewportId === '390x844') {
    if (source.widthCssPixels !== 390 || source.heightCssPixels !== 844) {
      throw new RangeError('A6.9 390x844 viewport尺寸不闭合。');
    }
    return Object.freeze({ viewportId: '390x844', widthCssPixels: 390, heightCssPixels: 844 });
  }
  if (source.viewportId === '1440x900') {
    if (source.widthCssPixels !== 1440 || source.heightCssPixels !== 900) {
      throw new RangeError('A6.9 1440x900 viewport尺寸不闭合。');
    }
    return Object.freeze({ viewportId: '1440x900', widthCssPixels: 1440, heightCssPixels: 900 });
  }
  throw new RangeError('A6.9只接受390x844或1440x900。');
}

function finiteCssInteger(value: unknown, name: string, allowZero: boolean): number {
  if (!Number.isSafeInteger(value) || (allowZero ? (value as number) < 0 : (value as number) <= 0)) {
    throw new TypeError(`${name}必须是${allowZero ? '非负' : '正'}安全整数CSS像素。`);
  }
  return value as number;
}

function parsePreviewRect(
  value: unknown,
  viewport: ArenaV2A6WeaponPreviewViewportV1,
  minimumSlotCssPixels: 72 | 96 | 168 | 240,
  safeInsetCssPixels: 8 | 12,
): ArenaV2A6WeaponPreviewRectCssPixelsV1 {
  const source = exactDataRecord(value, PREVIEW_RECT_KEYS, 'A6.9 previewRectCssPixels');
  const x = finiteCssInteger(source.x, 'A6.9 previewRect.x', true);
  const y = finiteCssInteger(source.y, 'A6.9 previewRect.y', true);
  const width = finiteCssInteger(source.width, 'A6.9 previewRect.width', false);
  const height = finiteCssInteger(source.height, 'A6.9 previewRect.height', false);
  if (x + width > viewport.widthCssPixels || y + height > viewport.heightCssPixels) {
    throw new RangeError('A6.9 previewRect必须完整位于viewport内。');
  }
  if (width < minimumSlotCssPixels
    || height < minimumSlotCssPixels
    || width <= safeInsetCssPixels * 2
    || height <= safeInsetCssPixels * 2) {
    throw new RangeError('A6.9 previewRect未满足A6.4 minimumSlot/safeInset。');
  }
  return Object.freeze({ x, y, width, height });
}

function parseFormalWeaponSlot(
  value: unknown,
  _epochId: string,
  _catalogContentHash: string,
  _screenId: ArenaV2A6WeaponPreviewScreenIdV1,
  _reducedMotion: boolean,
): Readonly<{
  slot: ArenaV2A6FormalPreviewBindingSlotV1;
  definitionId: string;
  assetId: string;
  digest: string;
  requestToken: string;
  safeInsetCssPixels: 8 | 12;
  minimumSlotCssPixels: 72 | 168;
}> {
  const cloned = cloneStrictData(value, 'A6.9 A6.4 formal weapon slot');
  const slot = exactDataRecord(cloned, SLOT_KEYS, 'A6.9 A6.4 formal weapon slot');
  if (slot.kind !== 'weapon') throw new RangeError('A6.9地图slot不得进入武器预览挂载。');
  const definitionId = nonEmptyString(slot.definitionId, 'A6.9 slot.definitionId');
  const assetId = nonEmptyString(slot.assetId, 'A6.9 slot.assetId');
  nonEmptyString(slot.displayName, 'A6.9 slot.displayName', 512);
  safePositiveInteger(slot.ordinal, 'A6.9 slot.ordinal');
  const digest = sha256(slot.sha256, 'A6.9 slot.sha256');
  const expectedBinding = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings.find((entry) => (
    entry.kind === 'weapon' && entry.definitionId === definitionId
  ));
  const expectedRecord = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.records.find((entry) => (
    entry.assetId === assetId
  ));
  if (expectedBinding === undefined
    || expectedBinding.assetId !== assetId
    || expectedRecord === undefined
    || expectedRecord.role !== 'weapon-attachment-model'
    || slot.runtimeSourceKey !== expectedRecord.runtimeSourceKey
    || slot.role !== expectedRecord.role
    || slot.maturity !== expectedRecord.maturity
    || slot.byteLength !== expectedRecord.byteLength
    || digest !== expectedRecord.sha256) {
    throw new RangeError('A6.9 slot未与当前正式武器catalog逐项闭合。');
  }
  const provenance = exactDataRecord(slot.provenance, PROVENANCE_KEYS, 'A6.9 slot.provenance');
  assertScalarIdentity(
    provenance,
    expectedRecord.provenance,
    PROVENANCE_KEYS,
    'A6.9 slot.provenance',
  );
  const lifecycle = exactDataRecord(slot.lifecycle, LIFECYCLE_KEYS, 'A6.9 slot.lifecycle');
  if ((slot.availability !== 'catalog-bound' && slot.availability !== 'missing')
    || slot.formalReady !== false
    || slot.assetUsePermitted !== false
    || slot.previewSourceUse !== 'text-shape-pattern-fallback-only'
    || lifecycle.lazyRequest !== false
    || lifecycle.requestPermitted !== false
    || lifecycle.requestWhen !== null
    || lifecycle.requestToken !== null
    || lifecycle.releaseWhen !== null
    || lifecycle.releaseToken !== null
    || lifecycle.loadsBytesHere !== false
    || lifecycle.ownsThreeResourcesHere !== false) {
    throw new RangeError('A6.9当前A6.4许可关闭slot合同漂移。');
  }
  const fallback = exactDataRecord(slot.fallback, FALLBACK_KEYS, 'A6.9 slot.fallback');
  if (fallback.active !== true
    || fallback.content !== 'text-shape-pattern-only'
    || fallback.preservesDefinitionIdentity !== true
    || fallback.programmaticGeometryAllowed !== false
    || fallback.claimsFormalApproval !== false) {
    throw new RangeError('A6.9当前许可关闭武器fallback合同漂移。');
  }
  throw new RangeError(
    'A6.9当前生产批准账本许可数为0；必须由未来新账本版本和独立gate开放挂载。',
  );
}

function parseBindingSnapshot(
  value: unknown,
): Readonly<{
  snapshot: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
  epochId: string;
  tick: number;
  catalogContentHash: string;
  reducedMotion: boolean;
  bindingIdentity: string;
  bindingCanonical: string;
}> {
  const cloned = cloneStrictData(
    value,
    'A6.9 A6.4 complete binding snapshot',
  ) as ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
  const rejectingLoader = Object.freeze({
    load(): never {
      throw new Error('A6.9身份校验不得触发A6.6 loader。');
    },
  });
  const rejectingDisposer = Object.freeze({
    dispose(): never {
      throw new Error('A6.9身份校验不得触发A6.6 disposer。');
    },
  });
  const validator = new ArenaV2CollectionFormalPreviewLeaseOwnerCandidateV1({
    schemaVersion: 1,
    bindingSnapshot: cloned,
    loader: rejectingLoader,
    disposer: rejectingDisposer,
  });
  const validated = validator.getSnapshot();
  validator.destroy();
  if (validated.state !== 'active'
    || validated.activeLeaseCount !== 0
    || validated.loadingResourceCount !== 0
    || validated.readyResourceCount !== 0
    || validated.pendingResourceCount !== 0) {
    throw new Error('A6.9 A6.6全快照验证器产生了意外资源状态。');
  }
  const leaseVisualContract = Object.freeze({
    catalogContentHash: cloned.contentIdentity.catalogContentHash,
    catalogRevision: cloned.contentIdentity.catalogRevision,
    productionApprovalLedgerId: cloned.contentIdentity.productionApprovalLedgerId,
    productionApprovalLedgerContentHash:
      cloned.contentIdentity.productionApprovalLedgerContentHash,
    slots: cloned.slots,
    budget: cloned.budget,
    layouts: cloned.layouts,
    reducedMotion: cloned.accessibility.reducedMotion,
    governance: cloned.governance,
  });
  return Object.freeze({
    snapshot: cloned,
    epochId: validated.epochId,
    tick: safeTick(cloned.tick, 'A6.9 bindingSnapshot.tick'),
    catalogContentHash: validated.catalogContentHash,
    reducedMotion: cloned.accessibility.reducedMotion,
    bindingIdentity: createDeterministicDataHash(
      leaseVisualContract,
      'Arena V2 A6.9 A6.4 Lease Visual Contract V1',
    ),
    bindingCanonical: canonicalDataString(leaseVisualContract),
  });
}

function parseReadyLease(
  value: unknown,
  epochId: string,
  catalogContentHash: string,
  assetId: string,
  digest: string,
  requestToken: string,
): Readonly<{
  visibleSlotLeaseId: string;
  requestIdentity: string;
  handle: THREE.Object3D;
  canonical: DataRecord;
}> {
  const source = exactDataRecord(value, LEASE_READY_KEYS, 'A6.9 A6.6 ready lease result');
  if (source.schemaVersion !== 1
    || source.status !== 'ready'
    || source.fallbackActive !== false) {
    throw new RangeError('A6.9只接受A6.6 ready且非fallback结果。');
  }
  const visibleSlotLeaseId = nonEmptyString(
    source.visibleSlotLeaseId,
    'A6.9 lease.visibleSlotLeaseId',
  );
  if (source.assetId !== assetId) throw new RangeError('A6.9 lease.assetId与slot不匹配。');
  const identity = nonEmptyString(source.requestIdentity, 'A6.9 lease.requestIdentity', 128);
  const expectedIdentity = expectedA6_6RequestIdentity(
    epochId,
    catalogContentHash,
    assetId,
    digest,
    requestToken,
  );
  if (identity !== expectedIdentity) throw new RangeError('A6.9 A6.6 requestIdentity不匹配。');
  if (!(source.handle instanceof THREE.Object3D)) {
    throw new TypeError('A6.9 handle必须来自同一three依赖的Object3D。');
  }
  return Object.freeze({
    visibleSlotLeaseId,
    requestIdentity: identity,
    handle: source.handle,
    canonical: Object.freeze({
      schemaVersion: 1,
      status: 'ready',
      visibleSlotLeaseId: source.visibleSlotLeaseId,
      requestIdentity: identity,
      assetId,
      fallbackActive: false,
    }),
  });
}

function parseMountInput(value: unknown): ParsedMountInputV1 {
  const source = exactDataRecord(value, MOUNT_KEYS, 'A6.9 mount input');
  if (source.schemaVersion !== 1) throw new RangeError('A6.9 mount schemaVersion必须为1。');
  const mountId = nonEmptyString(source.mountId, 'A6.9 mountId');
  const tick = safeTick(source.tick, 'A6.9 tick');
  const binding = parseBindingSnapshot(source.bindingSnapshot);
  const epochId = binding.epochId;
  const catalogContentHash = binding.catalogContentHash;
  if (tick < binding.tick) throw new RangeError('A6.9 mount tick不得早于A6.4 bindingSnapshot。');
  if (source.screenId !== 'weapon-index' && source.screenId !== 'weapon-detail') {
    throw new RangeError('A6.9只支持weapon-index/weapon-detail。');
  }
  if (typeof source.reducedMotion !== 'boolean') throw new TypeError('A6.9 reducedMotion必须为boolean。');
  if (source.reducedMotion !== binding.reducedMotion) {
    throw new RangeError('A6.9 reducedMotion必须与完整A6.4 bindingSnapshot一致。');
  }
  const viewport = parseViewport(source.viewport);
  const parsedSlot = parseFormalWeaponSlot(
    source.slot,
    epochId,
    catalogContentHash,
    source.screenId,
    source.reducedMotion,
  );
  const matchingLayout = binding.snapshot.layouts.find((layout) => layout.viewport === viewport.viewportId);
  if (matchingLayout === undefined) throw new RangeError('A6.9 viewport未命中A6.4 layout合同。');
  const layoutMinimum = source.screenId === 'weapon-index'
    ? matchingLayout.indexPreviewMinimumCssPixels
    : matchingLayout.detailPreviewMinimumCssPixels;
  const minimumSlotCssPixels = Math.max(
    parsedSlot.minimumSlotCssPixels,
    layoutMinimum,
  ) as 72 | 96 | 168 | 240;
  const safeInsetCssPixels = Math.max(
    parsedSlot.safeInsetCssPixels,
    matchingLayout.previewSafeInsetCssPixels,
  ) as 8 | 12;
  const previewRectCssPixels = parsePreviewRect(
    source.previewRectCssPixels,
    viewport,
    minimumSlotCssPixels,
    safeInsetCssPixels,
  );
  const matchingSnapshotSlots = binding.snapshot.slots.filter((slot) => (
    slot.kind === 'weapon'
    && slot.definitionId === parsedSlot.definitionId
    && slot.assetId === parsedSlot.assetId
  ));
  const matchingSnapshotSlot = matchingSnapshotSlots[0];
  if (matchingSnapshotSlots.length !== 1
    || matchingSnapshotSlot === undefined
    || canonicalDataString(matchingSnapshotSlot) !== canonicalDataString(parsedSlot.slot)) {
    throw new RangeError('A6.9选中slot不是完整A6.4 bindingSnapshot中的同一条目。');
  }
  const lease = parseReadyLease(
    source.leaseResult,
    epochId,
    catalogContentHash,
    parsedSlot.assetId,
    parsedSlot.digest,
    parsedSlot.requestToken,
  );
  const canonicalData = Object.freeze({
    schemaVersion: 1,
    mountId,
    tick,
    bindingSnapshot: binding.snapshot,
    slot: parsedSlot.slot,
    leaseResult: lease.canonical,
    screenId: source.screenId,
    viewport,
    previewRectCssPixels,
    reducedMotion: source.reducedMotion,
  });
  return Object.freeze({
    inputCanonical: canonicalDataString(canonicalData),
    mountId,
    tick,
    epochId,
    catalogContentHash,
    bindingIdentity: binding.bindingIdentity,
    bindingCanonical: binding.bindingCanonical,
    definitionId: parsedSlot.definitionId,
    assetId: parsedSlot.assetId,
    visibleSlotLeaseId: lease.visibleSlotLeaseId,
    requestIdentity: lease.requestIdentity,
    screenId: source.screenId,
    viewport,
    previewRectCssPixels,
    reducedMotion: source.reducedMotion,
    safeInsetCssPixels,
    minimumSlotCssPixels,
    handle: lease.handle,
  });
}

function finiteTransform(node: THREE.Object3D): readonly number[] {
  const values = [
    node.position.x, node.position.y, node.position.z,
    node.quaternion.x, node.quaternion.y, node.quaternion.z, node.quaternion.w,
    node.scale.x, node.scale.y, node.scale.z,
  ];
  if (values.some((entry) => !Number.isFinite(entry))
    || Math.abs(node.scale.x) < Number.EPSILON
    || Math.abs(node.scale.y) < Number.EPSILON
    || Math.abs(node.scale.z) < Number.EPSILON) {
    throw new RangeError('A6.9静态层级包含NaN/Infinity或零尺度。');
  }
  return Object.freeze(values);
}

function materialList(mesh: THREE.Mesh): readonly THREE.Material[] {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  if (materials.length === 0
    || materials.some((material) => !(material instanceof THREE.MeshStandardMaterial))) {
    throw new TypeError('A6.9武器附件只接受已有PBR MeshStandard/Physical material。');
  }
  return materials;
}

function hierarchyNodes(root: THREE.Object3D): readonly THREE.Object3D[] {
  const output: THREE.Object3D[] = [];
  const stack: THREE.Object3D[] = [root];
  const seen = new Set<THREE.Object3D>();
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) break;
    if (!(node instanceof THREE.Object3D) || seen.has(node)) {
      throw new TypeError('A6.9层级包含跨three对象、重复节点或环。');
    }
    seen.add(node);
    output.push(node);
    if (output.length > MAX_HIERARCHY_NODES) throw new RangeError('A6.9层级节点超出有界预算。');
    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      const child: THREE.Object3D | undefined = node.children[index];
      if (child === undefined || child.parent !== node) {
        throw new TypeError('A6.9层级父子身份不闭合。');
      }
      stack.push(child);
    }
  }
  return Object.freeze(output);
}

function auditStaticSource(root: THREE.Object3D): SourceHierarchyAuditV1 {
  const nodes = hierarchyNodes(root);
  const meshes: THREE.Mesh[] = [];
  const parents = new Map<THREE.Object3D, THREE.Object3D | null>();
  const children = new Map<THREE.Object3D, readonly THREE.Object3D[]>();
  const transforms = new Map<THREE.Object3D, readonly number[]>();
  let totalVertices = 0;
  for (const node of nodes) {
    if (node instanceof THREE.SkinnedMesh || node instanceof THREE.Bone) {
      throw new TypeError('A6.9武器收藏预览禁止SkinnedMesh/Bone。');
    }
    if (node instanceof THREE.Camera || node instanceof THREE.Light) {
      throw new TypeError('A6.9附件层级不得夹带相机或灯光。');
    }
    if (node.animations.length > 0) throw new TypeError('A6.9附件层级不得夹带动画clip。');
    parents.set(node, node.parent);
    children.set(node, Object.freeze([...node.children]));
    transforms.set(node, finiteTransform(node));
    if (!(node instanceof THREE.Mesh)) continue;
    if (!(node.geometry instanceof THREE.BufferGeometry)) {
      throw new TypeError('A6.9 Mesh必须使用BufferGeometry。');
    }
    materialList(node);
    if (Object.keys(node.geometry.morphAttributes).length > 0
      || (node.morphTargetInfluences?.length ?? 0) > 0) {
      throw new TypeError('A6.9静态附件不得包含morph动画候选。');
    }
    const position = node.geometry.getAttribute('position');
    if (position === undefined || position.itemSize < 3 || position.count <= 0) {
      throw new RangeError('A6.9 Mesh必须有非空position顶点。');
    }
    totalVertices += position.count;
    if (totalVertices > MAX_POSITION_VERTICES) throw new RangeError('A6.9顶点数量超出预览有界预算。');
    for (let index = 0; index < position.count; index += 1) {
      if (!Number.isFinite(position.getX(index))
        || !Number.isFinite(position.getY(index))
        || !Number.isFinite(position.getZ(index))) {
        throw new RangeError('A6.9 Mesh position包含NaN/Infinity。');
      }
    }
    meshes.push(node);
  }
  if (meshes.length === 0 || totalVertices === 0) throw new RangeError('A6.9空模型不得挂载。');
  return Object.freeze({
    nodes,
    meshes: Object.freeze(meshes),
    parents,
    children,
    transforms,
  });
}

function assertSourceUnchanged(audit: SourceHierarchyAuditV1): void {
  for (const node of audit.nodes) {
    const expectedParent = audit.parents.get(node);
    const expectedChildren = audit.children.get(node);
    const expectedTransform = audit.transforms.get(node);
    if (node.parent !== expectedParent
      || expectedChildren === undefined
      || node.children.length !== expectedChildren.length
      || node.children.some((child, index) => child !== expectedChildren[index])
      || expectedTransform === undefined
      || finiteTransform(node).some((entry, index) => entry !== expectedTransform[index])) {
      throw new Error('A6.9 clone过程改变了借入source层级。');
    }
  }
}

function assertCloneSharesOnlyRenderResources(
  sourceAudit: SourceHierarchyAuditV1,
  cloneRoot: THREE.Object3D,
): readonly THREE.Mesh[] {
  const cloneNodes = hierarchyNodes(cloneRoot);
  const sourceSet = new Set(sourceAudit.nodes);
  if (cloneNodes.some((node) => sourceSet.has(node))) {
    throw new Error('A6.9 clone层级复用了借入source节点。');
  }
  const cloneMeshes = cloneNodes.filter((node): node is THREE.Mesh => node instanceof THREE.Mesh);
  if (cloneMeshes.length !== sourceAudit.meshes.length) throw new Error('A6.9 clone Mesh数量漂移。');
  cloneMeshes.forEach((cloneMesh, index) => {
    const sourceMesh = sourceAudit.meshes[index];
    if (sourceMesh === undefined
      || cloneMesh.geometry !== sourceMesh.geometry
      || cloneMesh.material !== sourceMesh.material) {
      throw new Error('A6.9 clone必须共享原geometry/material引用且不得替换。');
    }
    materialList(cloneMesh);
    cloneMesh.castShadow = false;
    cloneMesh.receiveShadow = false;
  });
  return Object.freeze(cloneMeshes);
}

function boundsForStaticClone(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  bounds.makeEmpty();
  const point = new THREE.Vector3();
  let pointCount = 0;
  for (const node of hierarchyNodes(root)) {
    if (!(node instanceof THREE.Mesh)) continue;
    if (node.matrixWorld.elements.some((entry) => !Number.isFinite(entry))) {
      throw new RangeError('A6.9 clone matrixWorld包含NaN/Infinity。');
    }
    const position = node.geometry.getAttribute('position');
    if (position === undefined) throw new RangeError('A6.9 clone缺少position。');
    for (let index = 0; index < position.count; index += 1) {
      point.set(position.getX(index), position.getY(index), position.getZ(index));
      point.applyMatrix4(node.matrixWorld);
      if (![point.x, point.y, point.z].every(Number.isFinite)) {
        throw new RangeError('A6.9计算bounds时产生NaN/Infinity。');
      }
      bounds.expandByPoint(point);
      pointCount += 1;
    }
  }
  if (pointCount === 0 || bounds.isEmpty()) throw new RangeError('A6.9模型bounds为空。');
  const size = bounds.getSize(new THREE.Vector3());
  const maximumExtent = Math.max(size.x, size.y, size.z);
  if (![size.x, size.y, size.z].every(Number.isFinite)
    || maximumExtent < MIN_MODEL_EXTENT
    || maximumExtent > MAX_MODEL_EXTENT) {
    throw new RangeError('A6.9模型bounds超出有限范围。');
  }
  return bounds;
}

function detachAndClear(object: THREE.Object3D, label: string): void {
  if (object.parent !== null) {
    rejectThenable(
      THREE.Object3D.prototype.remove.call(object.parent, object),
      `${label}.remove`,
    );
  }
  rejectThenable(
    THREE.Object3D.prototype.clear.call(object),
    `${label}.clear`,
  );
}

function cleanupOwnedMountObjects(
  objects: OwnedMountObjectsV1,
  assertCommit: () => void = () => {},
): void {
  if (objects.modelClone !== null) {
    detachAndClear(objects.modelClone, 'A6.9 model clone');
    assertCommit();
    objects.modelClone = null;
  }
  if (objects.modelClone === null && objects.previewGroup !== null) {
    detachAndClear(objects.previewGroup, 'A6.9 preview group');
    assertCommit();
    objects.previewGroup = null;
  }
  if (objects.previewGroup === null && objects.camera !== null) {
    detachAndClear(objects.camera, 'A6.9 camera');
    assertCommit();
    objects.camera = null;
  }
  if (objects.camera === null && objects.hemisphereLight !== null) {
    detachAndClear(objects.hemisphereLight, 'A6.9 hemisphere light');
    assertCommit();
    objects.hemisphereLight = null;
  }
  if (objects.hemisphereLight === null && objects.directionalLight !== null) {
    detachAndClear(objects.directionalLight, 'A6.9 directional light');
    assertCommit();
    objects.directionalLight = null;
  }
  if (Object.values(objects).some((resource) => resource !== null)) {
    throw new Error('A6.9自有Three对象清理依赖尚未收敛。');
  }
}

function buildMount(parsed: ParsedMountInputV1): BuiltMountV1 {
  const sourceAudit = auditStaticSource(parsed.handle);
  const cleanup: OwnedMountObjectsV1 = {
    previewGroup: null,
    modelClone: null,
    camera: null,
    hemisphereLight: null,
    directionalLight: null,
  };
  try {
    const previewGroup = new THREE.Group();
    cleanup.previewGroup = previewGroup;
    previewGroup.name = `arena-v2-a6.9-preview:${parsed.mountId}`;
    const cloned = parsed.handle.clone(true);
    if (!(cloned instanceof THREE.Object3D) || cloned === parsed.handle) {
      throw new Error('A6.9 source必须生成独立、未挂载的Object3D clone。');
    }
    const modelClone = cloned;
    cleanup.modelClone = modelClone;
    if (modelClone.parent !== null) {
      throw new Error('A6.9 source必须生成独立、未挂载的Object3D clone。');
    }
    assertSourceUnchanged(sourceAudit);
    assertCloneSharesOnlyRenderResources(sourceAudit, modelClone);
    const readabilityProfile = requireArenaV2WeaponFirstScreenReadabilityProfileCandidateV1(
      parsed.definitionId,
    );
    const previewEuler = parsed.screenId === 'weapon-index'
      ? readabilityProfile.groundPickup.eulerRadians
      : readabilityProfile.grip.heldEulerRadians;
    modelClone.rotation.set(
      modelClone.rotation.x + previewEuler[0],
      modelClone.rotation.y + previewEuler[1],
      modelClone.rotation.z + previewEuler[2],
      modelClone.rotation.order,
    );
    modelClone.userData.arenaV2ReadabilityPose = parsed.screenId === 'weapon-index'
      ? 'ground-pickup'
      : 'held-three-quarter';
    modelClone.userData.arenaV2SilhouetteFamily = readabilityProfile.silhouette.family;
    modelClone.userData.arenaV2PatternCue = readabilityProfile.silhouette.patternCue;
    previewGroup.add(modelClone);
    const bounds = boundsForStaticClone(modelClone);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const maximumExtent = Math.max(size.x, size.y, size.z);
    const targetExtent = parsed.screenId === 'weapon-index' ? 1.4 : 2.0;
    const uniformScale = targetExtent / maximumExtent;
    if (!Number.isFinite(uniformScale) || uniformScale <= 0 || uniformScale > 10_000) {
      throw new RangeError('A6.9统一尺度计算无效。');
    }
    previewGroup.scale.setScalar(uniformScale);
    previewGroup.position.set(
      -center.x * uniformScale,
      -center.y * uniformScale,
      -center.z * uniformScale,
    );

    const cameraFovDegrees = parsed.screenId === 'weapon-index' ? 34 as const : 30 as const;
    const cameraDistance = parsed.screenId === 'weapon-index' ? 4.8 as const : 4.2 as const;
    const camera = new THREE.PerspectiveCamera(
      cameraFovDegrees,
      parsed.previewRectCssPixels.width / parsed.previewRectCssPixels.height,
      0.1,
      20,
    );
    cleanup.camera = camera;
    camera.name = `arena-v2-a6.9-camera:${parsed.mountId}`;
    camera.position.set(parsed.screenId === 'weapon-detail' ? 0.35 : 0, 0.2, cameraDistance);
    camera.lookAt(0, 0, 0);

    const hemisphereLight = new THREE.HemisphereLight(0xd8e8ff, 0x4e4a42, 1.05);
    cleanup.hemisphereLight = hemisphereLight;
    hemisphereLight.name = `arena-v2-a6.9-hemisphere:${parsed.mountId}`;
    const directionalLight = new THREE.DirectionalLight(0xfff4e2, 1.9);
    cleanup.directionalLight = directionalLight;
    directionalLight.name = `arena-v2-a6.9-directional:${parsed.mountId}`;
    directionalLight.position.set(3, 4, 5);
    directionalLight.castShadow = false;

    const entryTurnPlan: ArenaV2A6WeaponPreviewEntryTurnPlanV1 = parsed.reducedMotion
      ? Object.freeze({
        enabled: false,
        automaticRotation: false,
        repeat: false,
        fromYawRadians: 0,
        toYawRadians: 0,
        durationTicks: 0,
      })
      : Object.freeze({
        enabled: true,
        automaticRotation: false,
        repeat: false,
        fromYawRadians: -0.18,
        toYawRadians: 0,
        durationTicks: 12,
      });
    const mount = Object.freeze({
      schemaVersion: 1,
      status: 'production-unreachable',
      validationStatus: 'not-run',
      mountId: parsed.mountId,
      tick: parsed.tick,
      epochId: parsed.epochId,
      catalogContentHash: parsed.catalogContentHash,
      bindingIdentity: parsed.bindingIdentity,
      definitionId: parsed.definitionId,
      assetId: parsed.assetId,
      visibleSlotLeaseId: parsed.visibleSlotLeaseId,
      requestIdentity: parsed.requestIdentity,
      screenId: parsed.screenId,
      viewport: parsed.viewport,
      previewRectCssPixels: parsed.previewRectCssPixels,
      reducedMotion: parsed.reducedMotion,
      previewGroup,
      modelClone,
      camera,
      hemisphereLight,
      directionalLight,
      framing: Object.freeze({
        sourceBoundsSize: Object.freeze({ x: size.x, y: size.y, z: size.z }),
        sourceBoundsCenter: Object.freeze({ x: center.x, y: center.y, z: center.z }),
        uniformScale,
        cameraFovDegrees,
        cameraDistance,
        safeInsetCssPixels: parsed.safeInsetCssPixels,
        minimumSlotCssPixels: parsed.minimumSlotCssPixels,
      }),
      entryTurnPlan,
      ownership: Object.freeze({
        ownsPreviewGroup: true,
        ownsCamera: true,
        ownsLights: true,
        ownsClonedHierarchyNodes: true,
        ownsGeometry: false,
        ownsMaterial: false,
        ownsTexture: false,
        disposesSharedRenderResources: false,
        a6_6LeaseReleaseOwner: 'upstream-host',
        releaseOrdering: 'destroy-mount-before-a6.6-lease-release',
      }),
    }) satisfies ArenaV2A6WeaponPreviewThreeMountV1;
    return Object.freeze({ mount, cleanup });
  } catch (error) {
    try { cleanupOwnedMountObjects(cleanup); } catch (cleanupError) {
      throw new WeaponCollectionPreviewMountBuildCleanupFailureV1(
        error,
        cleanupError,
        cleanup,
      );
    }
    throw error;
  }
}

export class ArenaV2WeaponCollectionPreviewThreeMountOwnerCandidateV1 {
  #state: 'active' | 'failed' | 'destroyed' = 'active';
  readonly #epochId: string;
  readonly #catalogContentHash: string;
  readonly #bindingIdentity: string;
  readonly #bindingCanonical: string;
  #lastTick = -1;
  readonly #mounts = new Map<string, MountRecordV1>();
  readonly #destroyedMountHistory = new Map<string, string>();
  readonly #cleanupDebts = new Set<OwnedMountObjectsV1>();
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: unknown) {
    const source = exactDataRecord(value, OWNER_KEYS, 'A6.9 owner constructor');
    if (source.schemaVersion !== 1) throw new RangeError('A6.9 owner schemaVersion必须为1。');
    const binding = parseBindingSnapshot(source.bindingSnapshot);
    this.#epochId = binding.epochId;
    this.#catalogContentHash = binding.catalogContentHash;
    this.#bindingIdentity = binding.bindingIdentity;
    this.#bindingCanonical = binding.bindingCanonical;
    this.#lastTick = binding.tick;
  }

  #assertNoMutation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(`A6.9 Owner在${this.#operation}期间拒绝${operation}。`);
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) throw new Error('A6.9缺少当前操作所有权。');
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoMutation(operation);
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
        ? new AggregateError([failureValue, reentryError], `A6.9 ${operation}失败且同步重入。`)
        : reentryError;
    }
    if (failed) throw failureValue;
    return result;
  }

  mount(value: unknown): ArenaV2A6WeaponPreviewThreeMountV1 {
    return this.#runSynchronousOperation('mount', () => {
    if (this.#state !== 'active') throw new Error('A6.9 Owner当前不可继续挂载。');
    const parsed = parseMountInput(value);
    const existing = this.#mounts.get(parsed.mountId);
    if (existing !== undefined) {
      if (existing.canonical === parsed.inputCanonical && existing.sourceHandle === parsed.handle) {
        return existing.mount;
      }
      throw new Error('A6.9同mountId输入冲突。');
    }
    if (this.#destroyedMountHistory.has(parsed.mountId)) {
      throw new Error('A6.9已销毁mountId不得重新挂载。');
    }
    if (parsed.epochId !== this.#epochId || parsed.catalogContentHash !== this.#catalogContentHash) {
      throw new Error('A6.9 mount与Owner epoch/catalog身份不一致。');
    }
    if (parsed.bindingCanonical !== this.#bindingCanonical) {
      throw new Error('A6.9 mount完整bindingSnapshot与Owner构造快照漂移。');
    }
    if (parsed.tick < this.#lastTick) throw new Error('A6.9新挂载tick回退。');
    if (this.#mounts.size >= MAX_ACTIVE_MOUNTS) throw new RangeError('A6.9活跃mount达到有界上限。');
    let built: BuiltMountV1 | null = null;
    try {
      built = buildMount(parsed);
      this.#assertCurrentOperationCommit();
    } catch (error) {
      if (built !== null && this.#reentryError !== null) {
        try {
          cleanupOwnedMountObjects(
            built.cleanup,
            () => this.#assertCurrentOperationCommit(),
          );
        } catch (cleanupError) {
          this.#cleanupDebts.add(built.cleanup);
          throw new AggregateError(
            [error, cleanupError],
            'A6.9 mount重入失败且构造资源清理债务已保留。',
          );
        }
        built = null;
      }
      if (error instanceof WeaponCollectionPreviewMountBuildCleanupFailureV1) {
        this.#cleanupDebts.add(error.cleanupDebt);
        this.#state = 'failed';
        throw new AggregateError(
          [error.originalError, error.cleanupError],
          'A6.9 mount构造失败且清理债务已由Owner保留。',
        );
      }
      throw error;
    }
    if (built === null) throw new Error('A6.9 mount构造未产生Owner。');
    this.#mounts.set(parsed.mountId, Object.freeze({
      canonical: parsed.inputCanonical,
      sourceHandle: parsed.handle,
      mount: built.mount,
      cleanup: built.cleanup,
    }));
    this.#lastTick = Math.max(this.#lastTick, parsed.tick);
    return built.mount;
    });
  }

  destroyMount(value: unknown): void {
    this.#runSynchronousOperation('destroy-mount', () => {
    const source = exactDataRecord(value, DESTROY_KEYS, 'A6.9 destroy mount input');
    if (source.schemaVersion !== 1) throw new RangeError('A6.9 destroy schemaVersion必须为1。');
    const mountId = nonEmptyString(source.mountId, 'A6.9 destroy.mountId');
    const tick = safeTick(source.tick, 'A6.9 destroy.tick');
    const canonical = JSON.stringify({ schemaVersion: 1, mountId, tick });
    const previous = this.#destroyedMountHistory.get(mountId);
    if (previous !== undefined) {
      if (previous === canonical) return;
      throw new Error('A6.9 destroy重放与既有事实冲突。');
    }
    if (this.#state !== 'active') throw new Error('A6.9 Owner当前不可销毁单个mount。');
    const record = this.#mounts.get(mountId);
    if (record === undefined) throw new Error('A6.9 destroy引用未知mountId。');
    if (tick < this.#lastTick) throw new Error('A6.9 destroy tick回退。');
    try {
      cleanupOwnedMountObjects(
        record.cleanup,
        () => this.#assertCurrentOperationCommit(),
      );
      this.#assertCurrentOperationCommit();
    } catch (error) {
      this.#state = 'failed';
      throw error;
    }
    this.#mounts.delete(mountId);
    this.#destroyedMountHistory.set(mountId, canonical);
    while (this.#destroyedMountHistory.size > MAX_DESTROYED_MOUNT_HISTORY) {
      const oldest = this.#destroyedMountHistory.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.#destroyedMountHistory.delete(oldest);
    }
    this.#lastTick = Math.max(this.#lastTick, tick);
    });
  }

  getSnapshot(): ArenaV2A6WeaponPreviewThreeMountOwnerSnapshotV1 {
    return this.#runSynchronousOperation('snapshot-read', () => Object.freeze({
      schemaVersion: 1,
      status: 'production-unreachable',
      validationStatus: 'not-run',
      state: this.#state,
      epochId: this.#epochId,
      catalogContentHash: this.#catalogContentHash,
      bindingIdentity: this.#bindingIdentity,
      bindingCanonicalByteLength: utf8ByteLength(this.#bindingCanonical),
      lastTick: this.#lastTick,
      activeMountCount: this.#mounts.size,
      cleanupDebtCount: this.#cleanupDebts.size,
      destroyedMountHistoryCount: this.#destroyedMountHistory.size,
      automaticRotationEnabled: false,
      createsRenderer: false,
      createsDom: false,
      releasesA6_6LeaseHere: false,
    }));
  }

  destroy(): void {
    if (this.#state === 'destroyed') return;
    this.#runSynchronousOperation('destroy', () => {
    const errors: unknown[] = [];
    for (const [mountId, record] of this.#mounts) {
      try {
        cleanupOwnedMountObjects(
          record.cleanup,
          () => this.#assertCurrentOperationCommit(),
        );
        this.#assertCurrentOperationCommit();
        this.#mounts.delete(mountId);
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        break;
      }
    }
    for (const debt of errors.length === 0 ? [...this.#cleanupDebts] : []) {
      try {
        cleanupOwnedMountObjects(
          debt,
          () => this.#assertCurrentOperationCommit(),
        );
        this.#assertCurrentOperationCommit();
        this.#cleanupDebts.delete(debt);
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        break;
      }
    }
    if (errors.length > 0) {
      this.#state = 'failed';
      throw new AggregateError(errors, 'A6.9 destroy未能清理全部自有场景节点。');
    }
    if (this.#mounts.size > 0 || this.#cleanupDebts.size > 0) {
      this.#state = 'failed';
      throw new Error('A6.9 destroy清理依赖尚未收敛。');
    }
    this.#destroyedMountHistory.clear();
    this.#state = 'destroyed';
    });
  }
}

export const ARENA_V2_A6_WEAPON_COLLECTION_PREVIEW_THREE_MOUNT_OWNER_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  stage: 'A6.9' as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  supportedScreens: Object.freeze(['weapon-index', 'weapon-detail'] as const),
  supportedViewports: Object.freeze(['390x844', '1440x900'] as const),
  maximumActiveMounts: MAX_ACTIVE_MOUNTS,
  maximumDestroyedMountHistory: MAX_DESTROYED_MOUNT_HISTORY,
  maximumHierarchyNodesPerMount: MAX_HIERARCHY_NODES,
  maximumPositionVerticesPerMount: MAX_POSITION_VERTICES,
  acceptsWeaponAttachmentsOnly: true as const,
  acceptsSkinnedMeshOrBone: false as const,
  acceptsAnimationCandidates: false as const,
  clonesHierarchyNodes: true as const,
  sharesGeometryMaterialTexture: true as const,
  mutatesSharedRenderResources: false as const,
  disposesSharedRenderResources: false as const,
  automaticRotation: false as const,
  createsRenderer: false as const,
  createsDom: false as const,
  createsRaf: false as const,
  createsHdrEnvironment: false as const,
  createsProgrammaticFormalModel: false as const,
  shadowCastingEnabled: false as const,
  a6_6LeaseReleasedHere: false as const,
  bindingAuthorizationUsesFullCanonical: true as const,
  truncatedBindingHashIsDiagnosticOnly: true as const,
  releaseOrdering: 'destroy-mount-before-a6.6-lease-release' as const,
  currentProductionApprovedWeaponCount: 0 as const,
  currentMountPermittedWeaponCount: 0 as const,
  mountCleanupUsesPerResourceCompletionWatermarks: true as const,
  failedBuildCleanupDebtRetainedForDestroyRetry: true as const,
  destroyRetriesOnlyIncompleteMountCleanup: true as const,
  mutationReentrancyRejected: true as const,
  swallowedThreeCallbackReentryFailsClosed: true as const,
  failedMountReentryDoesNotPublishRecord: true as const,
  destroyReentryCannotPublishDestroyedSuccess: true as const,
  partialMutationSnapshotReadRejected: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  mountBuildCheckedBeforeRecordPublication: true as const,
  mountCleanupCheckedBeforeOwnershipRelease: true as const,
  destroyReentryRetainsCurrentAndLaterMountOwners: true as const,
  ordinaryDestroyFailureRetainsCurrentAndLaterMountOwners: true as const,
  cleanupCallbacksMustCompleteSynchronously: true as const,
  futureEnablementRequiresNewApprovalLedgerVersionAndIndependentGate: true as const,
  validationStatus: 'not-run' as const,
  screenshotEvidence: 'not-run' as const,
  deviceEvidence: 'not-run' as const,
  performanceEvidence: 'not-run' as const,
});
