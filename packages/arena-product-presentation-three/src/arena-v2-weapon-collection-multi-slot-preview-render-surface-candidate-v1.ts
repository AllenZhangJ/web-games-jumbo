import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  rejectThenable,
  snapshotMethod,
  type UnknownMethod,
} from '@number-strategy-jump/arena-presentation-runtime/capability-utils';
import * as THREE from 'three';
import type {
  ArenaV2CollectionFourScreenIdV1,
} from './arena-v2-collection-four-screen-read-owner-candidate-v1.js';
import type {
  ArenaV2A6WeaponPreviewRectCssPixelsV1,
  ArenaV2A6WeaponPreviewScreenIdV1,
  ArenaV2A6WeaponPreviewThreeMountV1,
  ArenaV2A6WeaponPreviewViewportV1,
} from './arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.js';

export const ARENA_V2_WEAPON_COLLECTION_MULTI_SLOT_PREVIEW_RENDER_SURFACE_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    stage: 'A6.13' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    productionReachable: false as const,
    defaultSurfaceWired: false as const,
    createsDom: false as const,
    loadsResources: false as const,
    createsOrDestroysMounts: false as const,
    ownsExactlyOneRenderer: true as const,
    maximumMountCount: 20 as const,
    clearsEmptyMapScreens: true as const,
    visiblePolicy: 'entire-preview-rect-inside-content-clip' as const,
    automaticRotation: false as const,
    usesWallClockOrRaf: false as const,
    forcesContextLoss: false as const,
    rendererDisposeWaitsForScissorDisable: true as const,
    constructionCleanupRetainsRetryableRendererDebt: true as const,
    stateReadRejectedDuringRendererCallback: true as const,
    swallowedStateReadReentryFailsCurrentRendererOperation: true as const,
    stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
    rendererCallbacksCheckedBeforeFrameCommit: true as const,
    destroyReentryRetainsRendererOwnership: true as const,
    failedSlotYawRestoreRetainedUntilTerminalCleanup: true as const,
    terminalCleanupOrder: Object.freeze([
      'pending-slot-yaw-restores',
      'scissor-disable',
      'renderer-dispose',
    ] as const),
  });

export type ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceStateV1 =
  | 'active'
  | 'rendering'
  | 'failed'
  | 'dispose-incomplete'
  | 'destroyed';

export interface ArenaV2WeaponCollectionPreviewRendererPortV1 {
  setPixelRatio(value: number): void;
  setSize(width: number, height: number, updateStyle: false): void;
  clear(): void;
  setScissorTest(enabled: boolean): void;
  setViewport(x: number, y: number, width: number, height: number): void;
  setScissor(x: number, y: number, width: number, height: number): void;
  clearDepth(): void;
  render(scene: THREE.Object3D, camera: THREE.Camera): void;
  dispose(): void;
}

export interface ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceOptionsV1 {
  readonly schemaVersion: 1;
  readonly renderer: ArenaV2WeaponCollectionPreviewRendererPortV1;
}

export interface ArenaV2WeaponCollectionMultiSlotPreviewRenderFrameV1 {
  readonly schemaVersion: 1;
  readonly epochId: string;
  readonly tick: number;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly viewport: ArenaV2A6WeaponPreviewViewportV1;
  readonly pixelRatio: number;
  readonly contentClipRectCssPixels: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly mounts: readonly ArenaV2A6WeaponPreviewThreeMountV1[];
}

export interface ArenaV2WeaponCollectionPreviewRenderedSlotDiagnosticV1 {
  readonly schemaVersion: 1;
  readonly mountId: string;
  readonly definitionId: string;
  readonly assetId: string;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly previewRectCssPixels: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly webglViewport: Readonly<{
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }>;
  readonly entryYawRadians: number;
}

export interface ArenaV2WeaponCollectionMultiSlotPreviewRenderFailureV1 {
  readonly schemaVersion: 1;
  readonly phase:
    | 'renderer-resize'
    | 'renderer-clear'
    | 'renderer-scissor-enable'
    | 'slot-render'
    | 'slot-yaw-restore'
    | 'renderer-scissor-disable';
  readonly mountId: string | null;
}

export interface ArenaV2WeaponCollectionMultiSlotPreviewRenderSnapshotV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly hardGate: false;
  readonly productionReachable: false;
  readonly defaultSurfaceWired: false;
  readonly state: ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceStateV1;
  readonly epochId: string | null;
  readonly tick: number | null;
  readonly screenId: ArenaV2CollectionFourScreenIdV1 | null;
  readonly viewport: ArenaV2A6WeaponPreviewViewportV1 | null;
  readonly pixelRatio: number | null;
  readonly contentClipRectCssPixels: ArenaV2A6WeaponPreviewRectCssPixelsV1 | null;
  readonly catalogContentHash: string | null;
  readonly bindingIdentity: string | null;
  readonly frameIdentity: string | null;
  readonly renderedSlotCount: number;
  readonly renderedSlots: readonly ArenaV2WeaponCollectionPreviewRenderedSlotDiagnosticV1[];
  readonly pendingYawRestoreCount: number;
  readonly failure: ArenaV2WeaponCollectionMultiSlotPreviewRenderFailureV1 | null;
  readonly createsDom: false;
  readonly loadsResources: false;
  readonly createsOrDestroysMounts: false;
  readonly automaticRotation: false;
}

export interface ArenaV2WeaponCollectionMultiSlotPreviewRenderDestroyResultV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly state: 'destroyed' | 'dispose-incomplete';
  readonly pendingYawRestoreCount: number;
  readonly scissorDisabled: boolean;
  readonly rendererDisposed: boolean;
  readonly failurePhases: readonly (
    'slot-yaw-restore' | 'scissor-disable' | 'renderer-dispose'
  )[];
  readonly forcesContextLoss: false;
}

type DataRecord = Record<string, unknown>;

interface CapturedRendererV1 {
  readonly setPixelRatio: UnknownMethod;
  readonly setSize: UnknownMethod;
  readonly clear: UnknownMethod;
  readonly setScissorTest: UnknownMethod;
  readonly setViewport: UnknownMethod;
  readonly setScissor: UnknownMethod;
  readonly clearDepth: UnknownMethod;
  readonly render: UnknownMethod;
  readonly dispose: UnknownMethod;
}

interface ParsedMountV1 {
  readonly source: ArenaV2A6WeaponPreviewThreeMountV1;
  readonly mountId: string;
  readonly definitionId: string;
  readonly assetId: string;
  readonly visibleSlotLeaseId: string;
  readonly requestIdentity: string;
  readonly catalogContentHash: string;
  readonly bindingIdentity: string;
  readonly previewGroup: THREE.Group;
  readonly camera: THREE.PerspectiveCamera;
  readonly rect: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly webglViewport: Readonly<{ x: number; y: number; width: number; height: number }>;
  readonly entryYawRadians: number;
  readonly canonicalFacts: Readonly<Record<string, unknown>>;
}

interface ParsedFrameV1 {
  readonly epochId: string;
  readonly tick: number;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly viewport: ArenaV2A6WeaponPreviewViewportV1;
  readonly pixelRatio: number;
  readonly clipRect: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly mounts: readonly ParsedMountV1[];
  readonly catalogContentHash: string | null;
  readonly bindingIdentity: string | null;
  readonly canonical: string;
  readonly frameIdentity: string;
}

interface PendingYawRestoreV1 {
  readonly mountId: string;
  readonly previewGroup: THREE.Group;
  readonly originalYaw: number;
}

const OPTION_KEYS = new Set(['schemaVersion', 'renderer']);
const FRAME_KEYS = new Set([
  'schemaVersion', 'epochId', 'tick', 'screenId', 'viewport', 'pixelRatio',
  'contentClipRectCssPixels', 'mounts',
]);
const VIEWPORT_KEYS = new Set(['viewportId', 'widthCssPixels', 'heightCssPixels']);
const RECT_KEYS = new Set(['x', 'y', 'width', 'height']);
const MOUNT_KEYS = new Set([
  'schemaVersion', 'status', 'validationStatus', 'mountId', 'tick', 'epochId',
  'catalogContentHash', 'bindingIdentity', 'definitionId', 'assetId',
  'visibleSlotLeaseId', 'requestIdentity', 'screenId', 'viewport',
  'previewRectCssPixels', 'reducedMotion', 'previewGroup', 'modelClone', 'camera',
  'hemisphereLight', 'directionalLight', 'framing', 'entryTurnPlan', 'ownership',
]);
const FRAMING_KEYS = new Set([
  'sourceBoundsSize', 'sourceBoundsCenter', 'uniformScale', 'cameraFovDegrees',
  'cameraDistance', 'safeInsetCssPixels', 'minimumSlotCssPixels',
]);
const VECTOR_KEYS = new Set(['x', 'y', 'z']);
const ENTRY_TURN_KEYS = new Set([
  'enabled', 'automaticRotation', 'repeat', 'fromYawRadians', 'toYawRadians',
  'durationTicks',
]);
const OWNERSHIP_KEYS = new Set([
  'ownsPreviewGroup', 'ownsCamera', 'ownsLights', 'ownsClonedHierarchyNodes',
  'ownsGeometry', 'ownsMaterial', 'ownsTexture', 'disposesSharedRenderResources',
  'a6_6LeaseReleaseOwner', 'releaseOrdering',
]);
const MAX_MOUNTS = 20;
const MAX_ID_LENGTH = 300;
const MAX_ABSOLUTE_RECT_COORDINATE = 32_768;

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string): DataRecord {
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
  const output: DataRecord = Object.create(null) as DataRecord;
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (descriptor === undefined || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}不得是getter/setter。`);
    }
    output[key] = descriptor.value;
  }
  return output;
}

function denseArray(value: unknown, name: string, maximum: number): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  if (value.length > maximum) throw new RangeError(`${name}超过有界上限${maximum}。`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key === 'symbol')) throw new TypeError(`${name}不得有Symbol字段。`);
  const expectedKeys = new Set(['length', ...Array.from({ length: value.length }, (_, i) => String(i))]);
  if (ownKeys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError(`${name}不得有稀疏项或额外字段。`);
  }
  const output: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}[${index}]必须是可枚举数据字段。`);
    }
    output.push(descriptor.value);
  }
  return Object.freeze(output);
}

function text(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ID_LENGTH) {
    throw new TypeError(`${name}必须是非空有界字符串。`);
  }
  return value;
}

function integer(value: unknown, name: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name}必须是大于等于${minimum}的安全整数。`);
  }
  return value as number;
}

function finite(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name}必须是有限数。`);
  }
  return value;
}

function parseViewport(value: unknown, name: string): ArenaV2A6WeaponPreviewViewportV1 {
  const source = exactRecord(value, VIEWPORT_KEYS, name);
  const valid = source.viewportId === '390x844'
    ? source.widthCssPixels === 390 && source.heightCssPixels === 844
    : source.viewportId === '1440x900'
      && source.widthCssPixels === 1440 && source.heightCssPixels === 900;
  if (!valid) throw new RangeError(`${name}必须是固定390x844或1440x900。`);
  return Object.freeze({
    viewportId: source.viewportId as '390x844' | '1440x900',
    widthCssPixels: source.widthCssPixels as 390 | 1440,
    heightCssPixels: source.heightCssPixels as 844 | 900,
  });
}

function parseRect(
  value: unknown,
  name: string,
  viewport: ArenaV2A6WeaponPreviewViewportV1,
): ArenaV2A6WeaponPreviewRectCssPixelsV1 {
  const source = exactRecord(value, RECT_KEYS, name);
  const x = integer(source.x, `${name}.x`);
  const y = integer(source.y, `${name}.y`);
  const width = integer(source.width, `${name}.width`, 1);
  const height = integer(source.height, `${name}.height`, 1);
  const right = x + width;
  const bottom = y + height;
  if (!Number.isSafeInteger(right) || !Number.isSafeInteger(bottom)
    || right > viewport.widthCssPixels || bottom > viewport.heightCssPixels
    || right > MAX_ABSOLUTE_RECT_COORDINATE || bottom > MAX_ABSOLUTE_RECT_COORDINATE) {
    throw new RangeError(`${name}必须完整位于viewport且边界为安全整数。`);
  }
  return Object.freeze({ x, y, width, height });
}

function sameViewport(
  left: ArenaV2A6WeaponPreviewViewportV1,
  right: ArenaV2A6WeaponPreviewViewportV1,
): boolean {
  return left.viewportId === right.viewportId
    && left.widthCssPixels === right.widthCssPixels
    && left.heightCssPixels === right.heightCssPixels;
}

function intersectRect(
  rect: ArenaV2A6WeaponPreviewRectCssPixelsV1,
  clip: ArenaV2A6WeaponPreviewRectCssPixelsV1,
): ArenaV2A6WeaponPreviewRectCssPixelsV1 | null {
  const x = Math.max(rect.x, clip.x);
  const y = Math.max(rect.y, clip.y);
  const right = Math.min(rect.x + rect.width, clip.x + clip.width);
  const bottom = Math.min(rect.y + rect.height, clip.y + clip.height);
  if (right <= x || bottom <= y) return null;
  return Object.freeze({ x, y, width: right - x, height: bottom - y });
}

function parseVector(value: unknown, name: string): Readonly<{ x: number; y: number; z: number }> {
  const source = exactRecord(value, VECTOR_KEYS, name);
  return Object.freeze({
    x: finite(source.x, `${name}.x`),
    y: finite(source.y, `${name}.y`),
    z: finite(source.z, `${name}.z`),
  });
}

function entryYaw(
  value: unknown,
  reducedMotion: boolean,
  mountTick: number,
  frameTick: number,
  name: string,
): number {
  const source = exactRecord(value, ENTRY_TURN_KEYS, name);
  if (source.automaticRotation !== false || source.repeat !== false || source.toYawRadians !== 0) {
    throw new RangeError(`${name}不得开启自动/重复旋转且终点yaw必须为0。`);
  }
  if (reducedMotion) {
    if (source.enabled !== false || source.fromYawRadians !== 0 || source.durationTicks !== 0) {
      throw new RangeError(`${name}与reducedMotion合同不一致。`);
    }
    return 0;
  }
  if (source.enabled !== true || source.fromYawRadians !== -0.18 || source.durationTicks !== 12) {
    throw new RangeError(`${name}与A6.9 entryTurnPlan不一致。`);
  }
  const elapsed = Math.min(12, frameTick - mountTick);
  const yaw = -0.18 + (0.18 * elapsed) / 12;
  if (!Number.isFinite(yaw)) throw new RangeError(`${name}计算产生非有限yaw。`);
  return yaw;
}

function parseMount(
  value: unknown,
  index: number,
  frame: Readonly<{
    epochId: string;
    tick: number;
    screenId: ArenaV2A6WeaponPreviewScreenIdV1;
    viewport: ArenaV2A6WeaponPreviewViewportV1;
    clipRect: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  }>,
): ParsedMountV1 {
  const name = `A6.13 frame.mounts[${index}]`;
  const source = exactRecord(value, MOUNT_KEYS, name);
  if (source.schemaVersion !== 1
    || source.status !== 'production-unreachable'
    || source.validationStatus !== 'not-run') {
    throw new RangeError(`${name}不是A6.9生产不可达mount。`);
  }
  const mountId = text(source.mountId, `${name}.mountId`);
  const mountTick = integer(source.tick, `${name}.tick`);
  if (mountTick > frame.tick) throw new RangeError(`${name}.tick不得领先frame。`);
  if (source.epochId !== frame.epochId || source.screenId !== frame.screenId) {
    throw new RangeError(`${name}的epoch/screen与frame不一致。`);
  }
  const viewport = parseViewport(source.viewport, `${name}.viewport`);
  if (!sameViewport(viewport, frame.viewport)) throw new RangeError(`${name}.viewport与frame不一致。`);
  const rect = parseRect(source.previewRectCssPixels, `${name}.previewRectCssPixels`, frame.viewport);
  const clippedRect = intersectRect(rect, frame.clipRect);
  if (clippedRect === null
    || clippedRect.x !== rect.x
    || clippedRect.y !== rect.y
    || clippedRect.width !== rect.width
    || clippedRect.height !== rect.height) {
    throw new RangeError(`${name}不是A6.12a fully-visible正式mount。`);
  }
  if (typeof source.reducedMotion !== 'boolean') throw new TypeError(`${name}.reducedMotion必须是boolean。`);
  const reducedMotion = source.reducedMotion;
  const previewGroup = source.previewGroup;
  const modelClone = source.modelClone;
  const camera = source.camera;
  const hemisphereLight = source.hemisphereLight;
  const directionalLight = source.directionalLight;
  if (!(previewGroup instanceof THREE.Group)
    || !(modelClone instanceof THREE.Object3D)
    || !(camera instanceof THREE.PerspectiveCamera)
    || !(hemisphereLight instanceof THREE.HemisphereLight)
    || !(directionalLight instanceof THREE.DirectionalLight)) {
    throw new TypeError(`${name}必须持有A6.9正式Three mount对象。`);
  }
  if (modelClone.parent !== previewGroup || !previewGroup.children.includes(modelClone)) {
    throw new RangeError(`${name}已失去active modelClone/previewGroup关系。`);
  }
  const framing = exactRecord(source.framing, FRAMING_KEYS, `${name}.framing`);
  const sourceBoundsSize = parseVector(framing.sourceBoundsSize, `${name}.framing.sourceBoundsSize`);
  const sourceBoundsCenter = parseVector(
    framing.sourceBoundsCenter,
    `${name}.framing.sourceBoundsCenter`,
  );
  const uniformScale = finite(framing.uniformScale, `${name}.framing.uniformScale`);
  const cameraFovDegrees = integer(framing.cameraFovDegrees, `${name}.framing.cameraFovDegrees`, 1);
  const cameraDistance = finite(framing.cameraDistance, `${name}.framing.cameraDistance`);
  const safeInsetCssPixels = integer(
    framing.safeInsetCssPixels,
    `${name}.framing.safeInsetCssPixels`,
  );
  const minimumSlotCssPixels = integer(
    framing.minimumSlotCssPixels,
    `${name}.framing.minimumSlotCssPixels`,
    1,
  );
  if (uniformScale <= 0 || cameraDistance <= 0
    || (cameraFovDegrees !== 30 && cameraFovDegrees !== 34)
    || (safeInsetCssPixels !== 8 && safeInsetCssPixels !== 12)
    || ![72, 96, 168, 240].includes(minimumSlotCssPixels)
    || rect.width < minimumSlotCssPixels || rect.height < minimumSlotCssPixels) {
    throw new RangeError(`${name}.framing与正式slot边界不一致。`);
  }
  const ownership = exactRecord(source.ownership, OWNERSHIP_KEYS, `${name}.ownership`);
  if (ownership.ownsPreviewGroup !== true
    || ownership.ownsCamera !== true
    || ownership.ownsLights !== true
    || ownership.ownsClonedHierarchyNodes !== true
    || ownership.ownsGeometry !== false
    || ownership.ownsMaterial !== false
    || ownership.ownsTexture !== false
    || ownership.disposesSharedRenderResources !== false
    || ownership.a6_6LeaseReleaseOwner !== 'upstream-host'
    || ownership.releaseOrdering !== 'destroy-mount-before-a6.6-lease-release') {
    throw new RangeError(`${name}.ownership不是A6.9只读mount合同。`);
  }
  const yaw = entryYaw(
    source.entryTurnPlan,
    reducedMotion,
    mountTick,
    frame.tick,
    `${name}.entryTurnPlan`,
  );
  const webglViewport = Object.freeze({
    x: clippedRect.x,
    y: frame.viewport.heightCssPixels - clippedRect.y - clippedRect.height,
    width: clippedRect.width,
    height: clippedRect.height,
  });
  const canonicalFacts = Object.freeze({
    mountId,
    mountTick,
    epochId: source.epochId,
    catalogContentHash: text(source.catalogContentHash, `${name}.catalogContentHash`),
    bindingIdentity: text(source.bindingIdentity, `${name}.bindingIdentity`),
    definitionId: text(source.definitionId, `${name}.definitionId`),
    assetId: text(source.assetId, `${name}.assetId`),
    visibleSlotLeaseId: text(source.visibleSlotLeaseId, `${name}.visibleSlotLeaseId`),
    requestIdentity: text(source.requestIdentity, `${name}.requestIdentity`),
    screenId: source.screenId,
    viewport,
    rect,
    reducedMotion,
    framing: Object.freeze({
      sourceBoundsSize,
      sourceBoundsCenter,
      uniformScale,
      cameraFovDegrees,
      cameraDistance,
      safeInsetCssPixels,
      minimumSlotCssPixels,
    }),
    entryYawRadians: yaw,
  });
  return Object.freeze({
    source: value as ArenaV2A6WeaponPreviewThreeMountV1,
    mountId,
    definitionId: canonicalFacts.definitionId as string,
    assetId: canonicalFacts.assetId as string,
    visibleSlotLeaseId: canonicalFacts.visibleSlotLeaseId as string,
    requestIdentity: canonicalFacts.requestIdentity as string,
    catalogContentHash: canonicalFacts.catalogContentHash as string,
    bindingIdentity: canonicalFacts.bindingIdentity as string,
    previewGroup,
    camera,
    rect,
    webglViewport,
    entryYawRadians: yaw,
    canonicalFacts,
  });
}

function assertUnique<T>(values: readonly T[], name: string): void {
  if (new Set(values).size !== values.length) throw new RangeError(`${name}必须唯一。`);
}

function parseFrame(value: unknown): ParsedFrameV1 {
  const source = exactRecord(value, FRAME_KEYS, 'A6.13 render frame');
  if (source.schemaVersion !== 1) throw new RangeError('A6.13 frame.schemaVersion必须为1。');
  const epochId = text(source.epochId, 'A6.13 frame.epochId');
  const tick = integer(source.tick, 'A6.13 frame.tick');
  if (source.screenId !== 'weapon-index'
    && source.screenId !== 'weapon-detail'
    && source.screenId !== 'map-index'
    && source.screenId !== 'map-detail') {
    throw new RangeError('A6.13 frame.screenId只允许A6.8四个收藏页面。');
  }
  const screenId = source.screenId;
  const viewport = parseViewport(source.viewport, 'A6.13 frame.viewport');
  const pixelRatio = finite(source.pixelRatio, 'A6.13 frame.pixelRatio');
  if (pixelRatio < 0.5 || pixelRatio > 2) {
    throw new RangeError('A6.13 frame.pixelRatio必须位于0.5..2。');
  }
  const clipRect = parseRect(
    source.contentClipRectCssPixels,
    'A6.13 frame.contentClipRectCssPixels',
    viewport,
  );
  const mountValues = denseArray(source.mounts, 'A6.13 frame.mounts', MAX_MOUNTS);
  if (screenId.startsWith('map-') && mountValues.length !== 0) {
    throw new RangeError('A6.13地图收藏页只允许空mount清屏帧。');
  }
  if (screenId === 'weapon-detail' && mountValues.length > 1) {
    throw new RangeError('A6.13 weapon-detail最多渲染一个mount。');
  }
  const weaponScreenId = screenId === 'weapon-index' || screenId === 'weapon-detail'
    ? screenId
    : null;
  const mounts = weaponScreenId === null
    ? []
    : mountValues.map((mount, index) => parseMount(mount, index, {
      epochId,
      tick,
      screenId: weaponScreenId,
      viewport,
      clipRect,
    }));
  assertUnique(mounts.map(({ mountId }) => mountId), 'A6.13 mountId');
  assertUnique(mounts.map(({ definitionId }) => definitionId), 'A6.13 definitionId');
  assertUnique(mounts.map(({ assetId }) => assetId), 'A6.13 assetId');
  assertUnique(mounts.map(({ visibleSlotLeaseId }) => visibleSlotLeaseId), 'A6.13 leaseId');
  assertUnique(mounts.map(({ requestIdentity }) => requestIdentity), 'A6.13 requestIdentity');
  assertUnique(mounts.map(({ previewGroup }) => previewGroup), 'A6.13 previewGroup identity');
  assertUnique(mounts.map(({ camera }) => camera), 'A6.13 camera identity');
  const catalogContentHash = mounts[0]?.catalogContentHash ?? null;
  const bindingIdentity = mounts[0]?.bindingIdentity ?? null;
  if (mounts.some((mount) => mount.catalogContentHash !== catalogContentHash
    || mount.bindingIdentity !== bindingIdentity)) {
    throw new RangeError('A6.13同帧mount的catalog/binding身份不一致。');
  }
  const identityPayload = Object.freeze({
    schemaVersion: 1,
    epochId,
    tick,
    screenId,
    viewport,
    pixelRatio,
    contentClipRectCssPixels: clipRect,
    mounts: Object.freeze(mounts.map(({ canonicalFacts }) => canonicalFacts)),
  });
  const canonical = JSON.stringify(identityPayload);
  return Object.freeze({
    epochId,
    tick,
    screenId,
    viewport,
    pixelRatio,
    clipRect,
    mounts: Object.freeze(mounts),
    catalogContentHash,
    bindingIdentity,
    canonical,
    frameIdentity: createDeterministicDataHash(
      identityPayload,
      'Arena V2 A6.13 Weapon Collection Multi Slot Render Frame V1',
    ),
  });
}

function sameMountReferences(
  left: readonly ParsedMountV1[],
  right: readonly ParsedMountV1[],
): boolean {
  return left.length === right.length && left.every((mount, index) => {
    const other = right[index];
    return other !== undefined
      && mount.source === other.source
      && mount.previewGroup === other.previewGroup
      && mount.camera === other.camera;
  });
}

function captureRenderer(value: unknown): CapturedRendererV1 {
  rejectThenable(value, 'A6.13 renderer');
  return Object.freeze({
    setPixelRatio: snapshotMethod(value, 'A6.13 renderer', 'setPixelRatio'),
    setSize: snapshotMethod(value, 'A6.13 renderer', 'setSize'),
    clear: snapshotMethod(value, 'A6.13 renderer', 'clear'),
    setScissorTest: snapshotMethod(value, 'A6.13 renderer', 'setScissorTest'),
    setViewport: snapshotMethod(value, 'A6.13 renderer', 'setViewport'),
    setScissor: snapshotMethod(value, 'A6.13 renderer', 'setScissor'),
    clearDepth: snapshotMethod(value, 'A6.13 renderer', 'clearDepth'),
    render: snapshotMethod(value, 'A6.13 renderer', 'render'),
    dispose: snapshotMethod(value, 'A6.13 renderer', 'dispose'),
  });
}

function renderedDiagnostic(
  mount: ParsedMountV1,
  screenId: ArenaV2CollectionFourScreenIdV1,
): ArenaV2WeaponCollectionPreviewRenderedSlotDiagnosticV1 {
  return Object.freeze({
    schemaVersion: 1 as const,
    mountId: mount.mountId,
    definitionId: mount.definitionId,
    assetId: mount.assetId,
    screenId,
    previewRectCssPixels: mount.rect,
    webglViewport: mount.webglViewport,
    entryYawRadians: mount.entryYawRadians,
  });
}

function failure(
  phase: ArenaV2WeaponCollectionMultiSlotPreviewRenderFailureV1['phase'],
  mountId: string | null,
): ArenaV2WeaponCollectionMultiSlotPreviewRenderFailureV1 {
  return Object.freeze({ schemaVersion: 1 as const, phase, mountId });
}

class SlotRenderFailureV1 extends Error {
  readonly phase: 'slot-render' | 'slot-yaw-restore';
  readonly original: unknown;

  constructor(phase: 'slot-render' | 'slot-yaw-restore', original: unknown) {
    super(`A6.13 ${phase}失败。`);
    this.phase = phase;
    this.original = original;
  }
}

interface ConstructionCleanupResourcesV1 {
  readonly renderer: CapturedRendererV1;
  scissorDisabled: boolean;
  rendererDisposed: boolean;
}

function callCapturedRendererForConstructionCleanup(
  renderer: CapturedRendererV1,
  method: 'setScissorTest' | 'dispose',
  args: readonly unknown[],
): void {
  const result = renderer[method](...args);
  rejectThenable(result, `A6.13 construction cleanup renderer.${method}()`);
  if (result !== undefined) {
    throw new TypeError(`A6.13 construction cleanup renderer.${method}()必须同步返回void。`);
  }
}

function constructionCleanupComplete(resources: ConstructionCleanupResourcesV1): boolean {
  return resources.scissorDisabled && resources.rendererDisposed;
}

function cleanupConstructionResources(resources: ConstructionCleanupResourcesV1): void {
  const cleanupFailures: unknown[] = [];
  if (!resources.scissorDisabled) {
    try {
      callCapturedRendererForConstructionCleanup(
        resources.renderer,
        'setScissorTest',
        [false],
      );
      resources.scissorDisabled = true;
    } catch (error) { cleanupFailures.push(error); }
  }
  if (resources.scissorDisabled && !resources.rendererDisposed) {
    try {
      callCapturedRendererForConstructionCleanup(resources.renderer, 'dispose', []);
      resources.rendererDisposed = true;
    } catch (error) { cleanupFailures.push(error); }
  }
  if (cleanupFailures.length > 0) {
    throw new AggregateError(cleanupFailures, 'A6.13构造资源清理不完整。');
  }
  if (!constructionCleanupComplete(resources)) {
    throw new Error('A6.13构造资源清理依赖尚未收敛。');
  }
}

export class ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: ConstructionCleanupResourcesV1;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: ConstructionCleanupResourcesV1,
  ) {
    super([originalError, cleanupError], 'A6.13构造失败且Renderer反向清理不完整。');
    this.name =
      'ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean { return constructionCleanupComplete(this.#resources); }

  retryCleanup(): void { cleanupConstructionResources(this.#resources); }
}

export class ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceCandidateV1 {
  readonly #renderer: CapturedRendererV1;
  #state: ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceStateV1 = 'active';
  #callbackActive = false;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #epochId: string | null = null;
  #catalogContentHash: string | null = null;
  #bindingIdentity: string | null = null;
  #lastTick = -1;
  #lastCanonical: string | null = null;
  #lastParsedMounts: readonly ParsedMountV1[] = Object.freeze([]);
  #pixelRatio: number | null = null;
  #size: Readonly<{ width: number; height: number }> | null = null;
  readonly #pendingYawRestores = new Map<THREE.Group, PendingYawRestoreV1>();
  #scissorDisabled = false;
  #rendererDisposed = false;
  #snapshot: ArenaV2WeaponCollectionMultiSlotPreviewRenderSnapshotV1;
  #destroyResult: ArenaV2WeaponCollectionMultiSlotPreviewRenderDestroyResultV1 | null = null;

  constructor(value: unknown) {
    const source = exactRecord(value, OPTION_KEYS, 'A6.13 constructor');
    if (source.schemaVersion !== 1) throw new RangeError('A6.13 constructor.schemaVersion必须为1。');
    this.#renderer = captureRenderer(source.renderer);
    try {
      this.#callRenderer('setScissorTest', [false]);
      this.#scissorDisabled = true;
    } catch (primary) {
      const resources: ConstructionCleanupResourcesV1 = {
        renderer: this.#renderer,
        scissorDisabled: false,
        rendererDisposed: false,
      };
      try {
        cleanupConstructionResources(resources);
      } catch (cleanupError) {
        throw new ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceConstructionCleanupFailureCandidateV1(
          primary,
          cleanupError,
          resources,
        );
      }
      throw primary;
    }
    this.#snapshot = this.#makeSnapshot(null, Object.freeze([]), null);
  }

  get state(): ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceStateV1 {
    this.#assertNoOperation('state read');
    return this.#state;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(`A6.13 ${this.#operation}期间拒绝${operation}重入。`);
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) return;
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
        ? new AggregateError([failureValue, reentryError], `A6.13 ${operation}失败且同步重入。`)
        : reentryError;
    }
    if (failed) throw failureValue;
    return result;
  }

  #callRenderer(method: keyof CapturedRendererV1, args: readonly unknown[]): void {
    this.#assertCurrentOperationCommit();
    if (this.#callbackActive) throw new Error('A6.13内部renderer调用发生重入。');
    this.#callbackActive = true;
    let result: unknown;
    try {
      result = this.#renderer[method](...args);
    } finally {
      this.#callbackActive = false;
    }
    rejectThenable(result, `A6.13 renderer.${method}()`);
    this.#assertCurrentOperationCommit();
    if (result !== undefined) throw new TypeError(`A6.13 renderer.${method}()必须同步返回void。`);
  }

  #makeSnapshot(
    frame: ParsedFrameV1 | null,
    diagnostics: readonly ArenaV2WeaponCollectionPreviewRenderedSlotDiagnosticV1[],
    failed: ArenaV2WeaponCollectionMultiSlotPreviewRenderFailureV1 | null,
  ): ArenaV2WeaponCollectionMultiSlotPreviewRenderSnapshotV1 {
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      hardGate: false as const,
      productionReachable: false as const,
      defaultSurfaceWired: false as const,
      state: this.#state,
      epochId: frame?.epochId ?? this.#epochId,
      tick: frame?.tick ?? (this.#lastTick >= 0 ? this.#lastTick : null),
      screenId: frame?.screenId ?? null,
      viewport: frame?.viewport ?? null,
      pixelRatio: frame?.pixelRatio ?? this.#pixelRatio,
      contentClipRectCssPixels: frame?.clipRect ?? null,
      catalogContentHash: frame?.catalogContentHash ?? this.#catalogContentHash,
      bindingIdentity: frame?.bindingIdentity ?? this.#bindingIdentity,
      frameIdentity: frame?.frameIdentity ?? null,
      renderedSlotCount: diagnostics.length,
      renderedSlots: Object.freeze([...diagnostics]),
      pendingYawRestoreCount: this.#pendingYawRestores.size,
      failure: failed,
      createsDom: false as const,
      loadsResources: false as const,
      createsOrDestroysMounts: false as const,
      automaticRotation: false as const,
    });
  }

  #renderSlot(mount: ParsedMountV1): void {
    const originalYaw = mount.previewGroup.rotation.y;
    if (!Number.isFinite(originalYaw)) throw new RangeError('A6.13 previewGroup原yaw不是有限数。');
    if (this.#pendingYawRestores.has(mount.previewGroup)) {
      throw new Error(`A6.13 mount ${mount.mountId}仍有未完成yaw恢复债务。`);
    }
    const yawRestore: PendingYawRestoreV1 = Object.freeze({
      mountId: mount.mountId,
      previewGroup: mount.previewGroup,
      originalYaw,
    });
    this.#pendingYawRestores.set(mount.previewGroup, yawRestore);
    let primary: unknown = null;
    try {
      mount.previewGroup.rotation.y = mount.entryYawRadians;
      const { x, y, width, height } = mount.webglViewport;
      this.#callRenderer('setViewport', [x, y, width, height]);
      this.#callRenderer('setScissor', [x, y, width, height]);
      this.#callRenderer('clearDepth', []);
      this.#callRenderer('render', [mount.previewGroup, mount.camera]);
    } catch (error) {
      primary = error;
    }
    let restoreError: unknown = null;
    try {
      mount.previewGroup.rotation.y = originalYaw;
      if (this.#pendingYawRestores.get(mount.previewGroup) === yawRestore) {
        this.#pendingYawRestores.delete(mount.previewGroup);
      }
    } catch (error) {
      restoreError = error;
    }
    if (primary !== null && restoreError !== null) {
      throw new SlotRenderFailureV1(
        'slot-yaw-restore',
        new AggregateError([primary, restoreError], 'A6.13 slot render与yaw恢复同时失败。'),
      );
    }
    if (restoreError !== null) throw new SlotRenderFailureV1('slot-yaw-restore', restoreError);
    if (primary !== null) throw new SlotRenderFailureV1('slot-render', primary);
  }

  render(value: unknown): ArenaV2WeaponCollectionMultiSlotPreviewRenderSnapshotV1 {
    return this.#runSynchronousOperation('render', () => {
    if (this.#state !== 'active') throw new Error(`A6.13 render拒绝状态${this.#state}。`);
    const parsed = parseFrame(value);
    if (this.#epochId !== null && parsed.epochId !== this.#epochId) {
      throw new RangeError('A6.13同Surface不接受epoch漂移；应销毁并重建。');
    }
    if (this.#catalogContentHash !== null
      && parsed.catalogContentHash !== null
      && parsed.catalogContentHash !== this.#catalogContentHash) {
      throw new RangeError('A6.13同epoch catalogContentHash漂移。');
    }
    if (this.#bindingIdentity !== null
      && parsed.bindingIdentity !== null
      && parsed.bindingIdentity !== this.#bindingIdentity) {
      throw new RangeError('A6.13同epoch bindingIdentity漂移。');
    }
    if (parsed.tick < this.#lastTick) throw new RangeError('A6.13 frame.tick回退。');
    if (parsed.tick === this.#lastTick && this.#lastCanonical !== null) {
      if (parsed.canonical !== this.#lastCanonical
        || !sameMountReferences(parsed.mounts, this.#lastParsedMounts)) {
        throw new RangeError('A6.13同tick frame事实冲突。');
      }
      return this.#snapshot;
    }

    this.#state = 'rendering';
    let currentFailure: ArenaV2WeaponCollectionMultiSlotPreviewRenderFailureV1 | null = null;
    let scissorMayBeEnabled = false;
    try {
      try {
        if (this.#pixelRatio !== parsed.pixelRatio) {
          this.#callRenderer('setPixelRatio', [parsed.pixelRatio]);
          this.#pixelRatio = parsed.pixelRatio;
        }
        if (this.#size === null
          || this.#size.width !== parsed.viewport.widthCssPixels
          || this.#size.height !== parsed.viewport.heightCssPixels) {
          this.#callRenderer('setSize', [
            parsed.viewport.widthCssPixels,
            parsed.viewport.heightCssPixels,
            false,
          ]);
          this.#size = Object.freeze({
            width: parsed.viewport.widthCssPixels,
            height: parsed.viewport.heightCssPixels,
          });
        }
      } catch (error) {
        currentFailure = failure('renderer-resize', null);
        throw error;
      }
      try {
        this.#callRenderer('clear', []);
      } catch (error) {
        currentFailure = failure('renderer-clear', null);
        throw error;
      }
      try {
        scissorMayBeEnabled = true;
        this.#scissorDisabled = false;
        this.#callRenderer('setScissorTest', [true]);
      } catch (error) {
        currentFailure = failure('renderer-scissor-enable', null);
        throw error;
      }
      for (const mount of parsed.mounts) {
        try {
          this.#renderSlot(mount);
        } catch (error) {
          currentFailure = failure(
            error instanceof SlotRenderFailureV1 ? error.phase : 'slot-render',
            mount.mountId,
          );
          throw error instanceof SlotRenderFailureV1 ? error.original : error;
        }
      }
    } catch (error) {
      let cleanupError: unknown = null;
      if (scissorMayBeEnabled) {
        try {
          this.#callRenderer('setScissorTest', [false]);
          scissorMayBeEnabled = false;
          this.#scissorDisabled = true;
        } catch (candidate) {
          cleanupError = candidate;
          currentFailure = failure('renderer-scissor-disable', null);
        }
      }
      this.#state = 'failed';
      this.#snapshot = this.#makeSnapshot(null, Object.freeze([]), currentFailure);
      if (cleanupError !== null) {
        throw new AggregateError([error, cleanupError], 'A6.13 render失败且scissor清理失败。');
      }
      throw error;
    }
    try {
      this.#callRenderer('setScissorTest', [false]);
      this.#scissorDisabled = true;
    } catch (error) {
      this.#state = 'failed';
      currentFailure = failure('renderer-scissor-disable', null);
      this.#snapshot = this.#makeSnapshot(null, Object.freeze([]), currentFailure);
      throw error;
    }

    this.#state = 'active';
    this.#epochId = parsed.epochId;
    if (parsed.catalogContentHash !== null) this.#catalogContentHash = parsed.catalogContentHash;
    if (parsed.bindingIdentity !== null) this.#bindingIdentity = parsed.bindingIdentity;
    this.#lastTick = parsed.tick;
    this.#lastCanonical = parsed.canonical;
    this.#lastParsedMounts = parsed.mounts;
    const diagnostics = Object.freeze(parsed.mounts.map((mount) => (
      renderedDiagnostic(mount, parsed.screenId)
    )));
    this.#snapshot = this.#makeSnapshot(parsed, diagnostics, null);
    return this.#snapshot;
    });
  }

  getSnapshot(): ArenaV2WeaponCollectionMultiSlotPreviewRenderSnapshotV1 {
    return this.#runSynchronousOperation('snapshot', () => this.#snapshot);
  }

  destroy(): ArenaV2WeaponCollectionMultiSlotPreviewRenderDestroyResultV1 {
    return this.#runSynchronousOperation('destroy', () => {
    if (this.#state === 'destroyed' && this.#destroyResult !== null) return this.#destroyResult;
    if (this.#state === 'rendering') throw new Error('A6.13 rendering期间拒绝destroy。');
    const failures: (
      'slot-yaw-restore' | 'scissor-disable' | 'renderer-dispose'
    )[] = [];
    for (const [previewGroup, record] of this.#pendingYawRestores) {
      try {
        previewGroup.rotation.y = record.originalYaw;
        if (this.#pendingYawRestores.get(previewGroup) === record) {
          this.#pendingYawRestores.delete(previewGroup);
        }
      } catch {
        failures.push('slot-yaw-restore');
        break;
      }
    }
    if (failures.length === 0 && !this.#scissorDisabled) {
      try {
        this.#callRenderer('setScissorTest', [false]);
        this.#scissorDisabled = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        failures.push('scissor-disable');
      }
    }
    if (failures.length === 0 && this.#scissorDisabled && !this.#rendererDisposed) {
      try {
        this.#callRenderer('dispose', []);
        this.#rendererDisposed = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        failures.push('renderer-dispose');
      }
    }
    this.#state = failures.length === 0 && this.#pendingYawRestores.size === 0
      ? 'destroyed'
      : 'dispose-incomplete';
    this.#lastParsedMounts = Object.freeze([]);
    this.#lastCanonical = null;
    this.#snapshot = Object.freeze({
      ...this.#snapshot,
      state: this.#state,
      pendingYawRestoreCount: this.#pendingYawRestores.size,
    });
    const result = Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      state: this.#state as 'destroyed' | 'dispose-incomplete',
      pendingYawRestoreCount: this.#pendingYawRestores.size,
      scissorDisabled: this.#scissorDisabled,
      rendererDisposed: this.#rendererDisposed,
      failurePhases: Object.freeze(failures),
      forcesContextLoss: false as const,
    });
    this.#destroyResult = result;
    return result;
    });
  }
}
