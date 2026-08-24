import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2A6FormalPreviewBindingSlotV1,
  ArenaV2A6FormalPreviewStrategyV1,
} from './arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import {
  ArenaV2CollectionFormalPreviewLeaseOwnerCandidateV1,
} from './arena-v2-collection-formal-preview-lease-owner-candidate-v1.js';
import type {
  ArenaV2CollectionCurrentScreenPreviewSlotV1,
  ArenaV2CollectionFourScreenIdV1,
  ArenaV2CollectionFourScreenReadSnapshotV1,
} from './arena-v2-collection-four-screen-read-owner-candidate-v1.js';
import type {
  ArenaV2A6WeaponPreviewRectCssPixelsV1,
  ArenaV2A6WeaponPreviewViewportV1,
} from './arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.js';
import type {
  ArenaV2CollectionPlannedActivePreviewLeaseV1,
  ArenaV2CollectionPreviewViewportV1,
} from './arena-v2-collection-visible-preview-lease-command-planning-owner-candidate-v1.js';

export const ARENA_V2_COLLECTION_VISIBLE_LAYOUT_OBSERVATION_OWNER_CANDIDATE_V1 =
  Object.freeze({
    stage: 'A6.12a' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    readsDom: false as const,
    createsThree: false as const,
    loadsResources: false as const,
    executesA6_10: false as const,
    triggersA6_9: false as const,
    currentPageMaximumObservedSlots: 20 as const,
    fullBindingValidationSlotCount: 22 as const,
    maximumAbsoluteLayoutCoordinateCssPixels: 32_768 as const,
    visiblePolicy: 'entire-preview-rect-inside-content-clip' as const,
    detailVisibleSlotCount: 1 as const,
    retainedHistory: 'last-valid-snapshot-only' as const,
  });

export type ArenaV2CollectionVisibleLayoutObservationOwnerStateV1 =
  'active' | 'failed' | 'destroyed';
export type ArenaV2CollectionPreviewSlotVisibilityV1 =
  'fully-visible' | 'clipped' | 'outside';

export interface ArenaV2CollectionPreviewSlotLayoutObservationInputV1 {
  readonly kind: 'weapon' | 'map';
  readonly definitionId: string;
  readonly assetId: string;
  readonly ordinal: number;
  readonly previewRectCssPixels: ArenaV2A6WeaponPreviewRectCssPixelsV1;
}

export interface ArenaV2CollectionVisibleLayoutObservationInputV1 {
  readonly schemaVersion: 1;
  readonly epochId: string;
  readonly tick: number;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly viewport: ArenaV2A6WeaponPreviewViewportV1;
  readonly readSnapshot: ArenaV2CollectionFourScreenReadSnapshotV1;
  readonly previousActiveLeaseLedger: readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[];
  readonly contentClipRectCssPixels: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly slotLayouts: readonly ArenaV2CollectionPreviewSlotLayoutObservationInputV1[];
}

export interface ArenaV2CollectionVisibleLayoutPlannerInputV1 {
  readonly schemaVersion: 1;
  readonly epochId: string;
  readonly tick: number;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly viewport: ArenaV2CollectionPreviewViewportV1;
  readonly readSnapshot: ArenaV2CollectionFourScreenReadSnapshotV1;
  readonly visibleDefinitionIds: readonly string[];
  readonly previousActiveLeaseLedger: readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[];
}

export interface ArenaV2CollectionVisibleWeaponMountLayoutV1 {
  readonly schemaVersion: 1;
  readonly screenId: 'weapon-index' | 'weapon-detail';
  readonly definitionId: string;
  readonly assetId: string;
  readonly ordinal: number;
  readonly slot: ArenaV2A6FormalPreviewBindingSlotV1;
  readonly viewport: ArenaV2A6WeaponPreviewViewportV1;
  readonly previewRectCssPixels: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly reducedMotion: boolean;
}

export interface ArenaV2CollectionVisibleStaticFallbackLayoutV1 {
  readonly schemaVersion: 1;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly kind: 'weapon' | 'map';
  readonly definitionId: string;
  readonly assetId: string;
  readonly ordinal: number;
  readonly viewport: ArenaV2A6WeaponPreviewViewportV1;
  readonly previewRectCssPixels: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly reason: 'map-formal-preview-not-approved' | 'missing-or-unapproved-weapon';
  readonly previewSourceUse: 'text-shape-pattern-fallback-only';
  readonly fallbackContent: 'text-shape-pattern-only';
  readonly requestPermitted: false;
}

export interface ArenaV2CollectionPreviewSlotVisibilityDiagnosticV1 {
  readonly schemaVersion: 1;
  readonly kind: 'weapon' | 'map';
  readonly definitionId: string;
  readonly assetId: string;
  readonly ordinal: number;
  readonly previewRectCssPixels: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly visibility: ArenaV2CollectionPreviewSlotVisibilityV1;
  readonly requiredMinimumSlotCssPixels: 72 | 96 | 168 | 240;
  readonly requiredSafeInsetCssPixels: 8 | 12;
  readonly leaseEligibleWhenFullyVisible: boolean;
  readonly staticFallbackWhenFullyVisible: boolean;
}

export interface ArenaV2CollectionVisibleLayoutObservationSnapshotV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly state: 'active';
  readonly epochId: string;
  readonly tick: number;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly plannerViewport: ArenaV2CollectionPreviewViewportV1;
  readonly mountViewport: ArenaV2A6WeaponPreviewViewportV1;
  readonly contentClipRectCssPixels: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly plannerInput: ArenaV2CollectionVisibleLayoutPlannerInputV1;
  readonly visibleWeaponMountLayouts: readonly ArenaV2CollectionVisibleWeaponMountLayoutV1[];
  readonly visibleStaticFallbackLayouts: readonly ArenaV2CollectionVisibleStaticFallbackLayoutV1[];
  readonly allSlotVisibility: readonly ArenaV2CollectionPreviewSlotVisibilityDiagnosticV1[];
  readonly bindingValidation: Readonly<{
    readonly validator: 'A6.6-rejecting-short-lifecycle';
    readonly validatedSlotCount: 22;
    readonly loaderCallCount: 0;
    readonly disposerCallCount: 0;
    readonly activeLeaseCount: 0;
  }>;
  readonly bindingWaterlineCanonicalByteLength: number;
  readonly readsDom: false;
  readonly createsThree: false;
  readonly loadsResources: false;
  readonly executesA6_10: false;
  readonly triggersA6_9: false;
}

interface ParsedFullSlotV1 {
  readonly slot: ArenaV2A6FormalPreviewBindingSlotV1;
  readonly lifecycle: PlainRecord;
  readonly fallback: PlainRecord;
  readonly eligible: boolean;
}

interface ParsedCurrentSlotV1 {
  readonly currentSlot: ArenaV2CollectionCurrentScreenPreviewSlotV1;
  readonly fullSlot: ParsedFullSlotV1;
  readonly previewStrategy: ArenaV2A6FormalPreviewStrategyV1;
}

interface ParsedObservationV1 {
  readonly epochId: string;
  readonly tick: number;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly viewport: ArenaV2A6WeaponPreviewViewportV1;
  readonly readSnapshot: ArenaV2CollectionFourScreenReadSnapshotV1;
  readonly previousLedger: readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[];
  readonly clipRect: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly plannerInput: ArenaV2CollectionVisibleLayoutPlannerInputV1;
  readonly mountLayouts: readonly ArenaV2CollectionVisibleWeaponMountLayoutV1[];
  readonly fallbackLayouts: readonly ArenaV2CollectionVisibleStaticFallbackLayoutV1[];
  readonly diagnostics: readonly ArenaV2CollectionPreviewSlotVisibilityDiagnosticV1[];
  readonly bindingValidation: ArenaV2CollectionVisibleLayoutObservationSnapshotV1['bindingValidation'];
  readonly waterlineCanonical: string;
  readonly inputCanonical: string;
}

const INPUT_KEYS = new Set([
  'schemaVersion', 'epochId', 'tick', 'screenId', 'viewport', 'readSnapshot',
  'previousActiveLeaseLedger', 'contentClipRectCssPixels', 'slotLayouts',
]);
const SNAPSHOT_KEYS = new Set([
  'schemaVersion', 'status', 'hardGate', 'defaultSurfaceWired', 'validationStatus',
  'epochId', 'tick', 'screenId', 'sourceState', 'indexPage', 'detailPage',
  'previewSlots', 'formalAssetLeaseBinding', 'formalAssetGovernance',
]);
const BINDING_KEYS = new Set([
  'schemaVersion', 'status', 'hardGate', 'defaultSurfaceWired', 'validationStatus',
  'epochId', 'tick', 'sourceState', 'contentIdentity', 'budget', 'slots', 'layouts',
  'accessibility', 'governance',
]);
const CONTENT_IDENTITY_KEYS = new Set([
  'sourceContentHash', 'collectionContentHash', 'catalogContentHash', 'catalogRevision',
  'productionApprovalLedgerId', 'productionApprovalLedgerContentHash',
]);
const GOVERNANCE_SUMMARY_KEYS = new Set([
  'contentIdentity', 'budget', 'layouts', 'accessibility', 'governance',
  'loadsResourcesHere', 'ownsThreeResourcesHere',
]);
const SLOT_KEYS = new Set([
  'kind', 'definitionId', 'displayName', 'ordinal', 'assetId', 'runtimeSourceKey',
  'role', 'maturity', 'provenance', 'byteLength', 'sha256', 'availability',
  'formalReady', 'assetUsePermitted', 'previewSourceUse', 'previewStrategies',
  'budget', 'lifecycle', 'fallback',
]);
const PREVIEW_SLOT_KEYS = new Set([
  ...[...SLOT_KEYS].filter((key) => key !== 'previewStrategies'), 'previewStrategy',
]);
const PREVIEW_STRATEGY_KEYS = new Set([
  'screenId', 'framing', 'safeInsetCssPixels', 'minimumSlotCssPixels',
  'transparentBackground', 'autoRotate', 'motionPolicy', 'touchActionAdded',
  'selectionIntentAdded',
]);
const LIFECYCLE_KEYS = new Set([
  'lazyRequest', 'requestPermitted', 'requestWhen', 'requestToken', 'releaseWhen',
  'releaseToken', 'loadsBytesHere', 'ownsThreeResourcesHere',
]);
const FALLBACK_KEYS = new Set([
  'active', 'content', 'preservesDefinitionIdentity', 'programmaticGeometryAllowed',
  'claimsFormalApproval',
]);
const VIEWPORT_KEYS = new Set(['viewportId', 'widthCssPixels', 'heightCssPixels']);
const RECT_KEYS = new Set(['x', 'y', 'width', 'height']);
const SLOT_LAYOUT_KEYS = new Set([
  'kind', 'definitionId', 'assetId', 'ordinal', 'previewRectCssPixels',
]);
const PROFILE_IDENTITY_KEYS = new Set([
  'profileSchemaVersion', 'profileDefinitionId', 'profileDefinitionContentVersion',
  'profileId', 'profileRevision',
]);
const LEDGER_KEYS = new Set([
  'schemaVersion', 'epochId', 'catalogContentHash', 'screenId', 'activationSequence',
  'visibleSlotLeaseId', 'kind', 'definitionId', 'assetId', 'ordinal', 'requestToken',
  'releaseToken', 'state',
]);
const CONSTRUCTOR_KEYS = new Set(['epochId']);
const SCREEN_IDS = new Set<unknown>([
  'weapon-index', 'map-index', 'weapon-detail', 'map-detail',
]);
const MAX_ABSOLUTE_LAYOUT_COORDINATE = 32_768;

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  const record = assertPlainRecord(value, name);
  assertKnownKeys(record, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(record, key)) throw new TypeError(`${name}缺少字段${key}。`);
  }
  return record;
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

function signedInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${name}必须是安全整数。`);
  return value as number;
}

function canonical(value: unknown, name: string): string {
  const result = JSON.stringify(value);
  if (typeof result !== 'string') throw new TypeError(`${name}无法规范序列化。`);
  return result;
}

function utf8ByteLength(value: string): number {
  let byteLength = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) throw new TypeError('A6.12a UTF-8字节计算失败。');
    byteLength += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return byteLength;
}

function parseViewport(value: unknown): ArenaV2A6WeaponPreviewViewportV1 {
  const source = exactRecord(value, VIEWPORT_KEYS, 'A6.12a viewport');
  if (source.viewportId === '390x844'
    && source.widthCssPixels === 390
    && source.heightCssPixels === 844) {
    return Object.freeze({ viewportId: '390x844', widthCssPixels: 390, heightCssPixels: 844 });
  }
  if (source.viewportId === '1440x900'
    && source.widthCssPixels === 1440
    && source.heightCssPixels === 900) {
    return Object.freeze({ viewportId: '1440x900', widthCssPixels: 1440, heightCssPixels: 900 });
  }
  throw new RangeError('A6.12a viewport只接受390×844或1440×900的固定完整对象。');
}

function parseRect(
  value: unknown,
  name: string,
  allowOutsideViewport: boolean,
  viewport: ArenaV2A6WeaponPreviewViewportV1,
): ArenaV2A6WeaponPreviewRectCssPixelsV1 {
  const source = exactRecord(value, RECT_KEYS, name);
  const x = signedInteger(source.x, `${name}.x`);
  const y = signedInteger(source.y, `${name}.y`);
  const width = integer(source.width, `${name}.width`, 1);
  const height = integer(source.height, `${name}.height`, 1);
  const right = x + width;
  const bottom = y + height;
  if (!Number.isSafeInteger(right) || !Number.isSafeInteger(bottom)) {
    throw new RangeError(`${name}边界溢出安全整数。`);
  }
  if (Math.abs(x) > MAX_ABSOLUTE_LAYOUT_COORDINATE
    || Math.abs(y) > MAX_ABSOLUTE_LAYOUT_COORDINATE
    || Math.abs(right) > MAX_ABSOLUTE_LAYOUT_COORDINATE
    || Math.abs(bottom) > MAX_ABSOLUTE_LAYOUT_COORDINATE
    || width > MAX_ABSOLUTE_LAYOUT_COORDINATE
    || height > MAX_ABSOLUTE_LAYOUT_COORDINATE) {
    throw new RangeError(`${name}超过A6.12a有界滚动坐标范围。`);
  }
  if (!allowOutsideViewport && (
    x < 0 || y < 0 || right > viewport.widthCssPixels || bottom > viewport.heightCssPixels
  )) throw new RangeError(`${name}必须完整位于viewport。`);
  return Object.freeze({ x, y, width, height });
}

function classifyRect(
  rect: ArenaV2A6WeaponPreviewRectCssPixelsV1,
  clip: ArenaV2A6WeaponPreviewRectCssPixelsV1,
): ArenaV2CollectionPreviewSlotVisibilityV1 {
  const rectRight = rect.x + rect.width;
  const rectBottom = rect.y + rect.height;
  const clipRight = clip.x + clip.width;
  const clipBottom = clip.y + clip.height;
  if (rect.x >= clip.x && rect.y >= clip.y
    && rectRight <= clipRight && rectBottom <= clipBottom) return 'fully-visible';
  if (rectRight <= clip.x || rect.x >= clipRight
    || rectBottom <= clip.y || rect.y >= clipBottom) return 'outside';
  return 'clipped';
}

function slotKey(kind: 'weapon' | 'map', definitionId: string): string {
  return `${kind}|${definitionId}`;
}

function parseFullSlot(value: unknown, index: number): ParsedFullSlotV1 {
  const source = exactRecord(value, SLOT_KEYS, `A6.12a binding.slots[${index}]`);
  if (source.kind !== 'weapon' && source.kind !== 'map') {
    throw new RangeError(`A6.12a binding.slots[${index}].kind不受支持。`);
  }
  text(source.definitionId, `A6.12a binding.slots[${index}].definitionId`, 300);
  text(source.assetId, `A6.12a binding.slots[${index}].assetId`, 300);
  integer(source.ordinal, `A6.12a binding.slots[${index}].ordinal`, 1);
  if (!Array.isArray(source.previewStrategies) || source.previewStrategies.length !== 2) {
    throw new RangeError(`A6.12a binding.slots[${index}]必须有两项preview strategy。`);
  }
  source.previewStrategies.forEach((strategy, strategyIndex) => {
    exactRecord(
      strategy,
      PREVIEW_STRATEGY_KEYS,
      `A6.12a binding.slots[${index}].previewStrategies[${strategyIndex}]`,
    );
  });
  const lifecycle = exactRecord(source.lifecycle, LIFECYCLE_KEYS, 'A6.12a slot.lifecycle');
  const fallback = exactRecord(source.fallback, FALLBACK_KEYS, 'A6.12a slot.fallback');
  const eligible = source.kind === 'weapon'
    && source.formalReady === true
    && source.assetUsePermitted === true
    && source.previewSourceUse === 'formal-glb-permitted'
    && lifecycle.requestPermitted === true
    && typeof lifecycle.requestToken === 'string'
    && typeof lifecycle.releaseToken === 'string'
    && fallback.active === false;
  if (!eligible && (
    lifecycle.requestPermitted !== false
    || lifecycle.requestToken !== null
    || lifecycle.releaseToken !== null
    || fallback.active !== true
    || source.previewSourceUse !== 'text-shape-pattern-fallback-only'
  )) throw new RangeError('A6.12a非正式可请求槽必须保持无token静态fallback。');
  return Object.freeze({
    slot: source as unknown as ArenaV2A6FormalPreviewBindingSlotV1,
    lifecycle,
    fallback,
    eligible,
  });
}

function validateBindingWithA6_6(
  value: unknown,
): ArenaV2CollectionVisibleLayoutObservationSnapshotV1['bindingValidation'] {
  let loaderCallCount = 0;
  let disposerCallCount = 0;
  const validator = new ArenaV2CollectionFormalPreviewLeaseOwnerCandidateV1({
    schemaVersion: 1,
    bindingSnapshot: value,
    loader: {
      load() {
        loaderCallCount += 1;
        throw new Error('A6.12a binding validator不得调用loader。');
      },
    },
    disposer: {
      dispose() {
        disposerCallCount += 1;
        throw new Error('A6.12a binding validator不得调用disposer。');
      },
    },
  });
  try {
    const snapshot = validator.getSnapshot();
    if (snapshot.activeLeaseCount !== 0
      || snapshot.loadingResourceCount !== 0
      || snapshot.readyResourceCount !== 0
      || loaderCallCount !== 0
      || disposerCallCount !== 0) {
      throw new Error('A6.12a短生命周期validator意外创建资源或租约。');
    }
    return Object.freeze({
      validator: 'A6.6-rejecting-short-lifecycle' as const,
      validatedSlotCount: 22 as const,
      loaderCallCount: 0 as const,
      disposerCallCount: 0 as const,
      activeLeaseCount: 0 as const,
    });
  } finally {
    validator.destroy();
  }
}

function validateCurrentPageShape(
  snapshot: PlainRecord,
  screenId: ArenaV2CollectionFourScreenIdV1,
  currentSlots: readonly ParsedCurrentSlotV1[],
): void {
  const detail = screenId.endsWith('-detail');
  if (detail ? snapshot.detailPage === null || snapshot.indexPage !== null
    : snapshot.indexPage === null || snapshot.detailPage !== null) {
    throw new RangeError('A6.12a A6.8 index/detail页形状不闭合。');
  }
  const page = assertPlainRecord(
    detail ? snapshot.detailPage : snapshot.indexPage,
    'A6.12a current page',
  );
  if (!Object.hasOwn(page, 'profileIdentity')) {
    throw new TypeError('A6.12a current page缺少profileIdentity。');
  }
  if (page.profileIdentity !== null) {
    const profile = exactRecord(
      page.profileIdentity,
      PROFILE_IDENTITY_KEYS,
      'A6.12a current page.profileIdentity',
    );
    integer(profile.profileSchemaVersion, 'A6.12a profileSchemaVersion', 1);
    text(profile.profileDefinitionId, 'A6.12a profileDefinitionId', 300);
    integer(profile.profileDefinitionContentVersion, 'A6.12a profileDefinitionContentVersion', 1);
    text(profile.profileId, 'A6.12a profileId', 300);
    integer(profile.profileRevision, 'A6.12a profileRevision');
  }
  if (detail && (
    page.screenId !== screenId
    || page.targetDefinitionId !== currentSlots[0]?.fullSlot.slot.definitionId
  )) throw new RangeError('A6.12a detail page与唯一selection slot不闭合。');
}

function parseLedger(
  value: unknown,
  epochId: string,
  catalogContentHash: string,
  allSlots: ReadonlyMap<string, ParsedFullSlotV1>,
): readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[] {
  if (!Array.isArray(value) || value.length > 20) {
    throw new RangeError('A6.12a previousActiveLeaseLedger必须是最多20项数组。');
  }
  const ids = new Set<string>();
  return Object.freeze(value.map((candidate, index) => {
    const source = exactRecord(candidate, LEDGER_KEYS, `A6.12a ledger[${index}]`);
    if (source.schemaVersion !== 1
      || source.epochId !== epochId
      || source.catalogContentHash !== catalogContentHash
      || !SCREEN_IDS.has(source.screenId)
      || source.kind !== 'weapon'
      || source.state !== 'planned-active') {
      throw new RangeError(`A6.12a ledger[${index}]治理身份不闭合。`);
    }
    const definitionId = text(source.definitionId, `A6.12a ledger[${index}].definitionId`, 300);
    const assetId = text(source.assetId, `A6.12a ledger[${index}].assetId`, 300);
    const ordinal = integer(source.ordinal, `A6.12a ledger[${index}].ordinal`, 1);
    const activationSequence = integer(
      source.activationSequence,
      `A6.12a ledger[${index}].activationSequence`,
      1,
    );
    const leaseId = text(
      source.visibleSlotLeaseId,
      `A6.12a ledger[${index}].visibleSlotLeaseId`,
      200,
    );
    const expectedLeaseId = `a6.10:${String(source.screenId)}:${assetId}:${activationSequence}`;
    const slot = allSlots.get(slotKey('weapon', definitionId));
    if (leaseId !== expectedLeaseId
      || ids.has(leaseId)
      || slot === undefined
      || !slot.eligible
      || slot.slot.assetId !== assetId
      || slot.slot.ordinal !== ordinal
      || slot.lifecycle.requestToken !== source.requestToken
      || slot.lifecycle.releaseToken !== source.releaseToken) {
      throw new RangeError(`A6.12a ledger[${index}]与A6.4 binding不闭合。`);
    }
    ids.add(leaseId);
    return Object.freeze({
      schemaVersion: 1 as const,
      epochId,
      catalogContentHash,
      screenId: source.screenId as ArenaV2CollectionFourScreenIdV1,
      activationSequence,
      visibleSlotLeaseId: leaseId,
      kind: 'weapon' as const,
      definitionId,
      assetId,
      ordinal,
      requestToken: source.requestToken as string,
      releaseToken: source.releaseToken as string,
      state: 'planned-active' as const,
    });
  }));
}

function isRecoverableContractError(error: unknown): boolean {
  return error instanceof TypeError || error instanceof RangeError;
}

function parseObservation(value: unknown): ParsedObservationV1 {
  const cloned = cloneFrozenData(value, 'A6.12a observation input');
  const source = exactRecord(cloned, INPUT_KEYS, 'A6.12a observation input');
  if (source.schemaVersion !== 1 || !SCREEN_IDS.has(source.screenId)) {
    throw new RangeError('A6.12a schemaVersion或screenId不受支持。');
  }
  const epochId = text(source.epochId, 'A6.12a epochId', 200);
  const tick = integer(source.tick, 'A6.12a tick');
  const screenId = source.screenId as ArenaV2CollectionFourScreenIdV1;
  const viewport = parseViewport(source.viewport);
  const snapshot = exactRecord(source.readSnapshot, SNAPSHOT_KEYS, 'A6.12a A6.8 snapshot');
  if (snapshot.schemaVersion !== 1
    || snapshot.status !== 'production-unreachable'
    || snapshot.hardGate !== false
    || snapshot.defaultSurfaceWired !== false
    || snapshot.validationStatus !== 'not-run'
    || snapshot.epochId !== epochId
    || snapshot.tick !== tick
    || snapshot.screenId !== screenId) {
    throw new RangeError('A6.12a epoch/tick/screen与A6.8 snapshot不闭合。');
  }
  const binding = exactRecord(
    snapshot.formalAssetLeaseBinding,
    BINDING_KEYS,
    'A6.12a formalAssetLeaseBinding',
  );
  if (binding.schemaVersion !== 1
    || binding.status !== 'production-unreachable'
    || binding.hardGate !== false
    || binding.defaultSurfaceWired !== false
    || binding.validationStatus !== 'not-run'
    || binding.epochId !== epochId
    || binding.tick !== tick
    || binding.sourceState !== snapshot.sourceState
    || !Array.isArray(binding.slots)
    || binding.slots.length !== 22
    || !Array.isArray(binding.layouts)
    || binding.layouts.length !== 2) {
    throw new RangeError('A6.12a完整A6.4 binding身份、数量或状态不闭合。');
  }
  const bindingValidation = validateBindingWithA6_6(binding);
  const contentIdentity = exactRecord(
    binding.contentIdentity,
    CONTENT_IDENTITY_KEYS,
    'A6.12a binding.contentIdentity',
  );
  const catalogContentHash = text(
    contentIdentity.catalogContentHash,
    'A6.12a catalogContentHash',
    64,
  );
  const fullSlots = Object.freeze(binding.slots.map(parseFullSlot));
  const allSlots = new Map<string, ParsedFullSlotV1>();
  const assetIds = new Set<string>();
  for (const parsed of fullSlots) {
    const key = slotKey(parsed.slot.kind, parsed.slot.definitionId);
    if (allSlots.has(key) || assetIds.has(parsed.slot.assetId)) {
      throw new RangeError('A6.12a完整binding包含重复Definition或asset。');
    }
    allSlots.set(key, parsed);
    assetIds.add(parsed.slot.assetId);
  }
  for (const kind of ['weapon', 'map'] as const) {
    const kindSlots = fullSlots.filter(({ slot }) => slot.kind === kind);
    const expectedCount = kind === 'weapon' ? 20 : 2;
    if (kindSlots.length !== expectedCount
      || kindSlots.some(({ slot }, index) => slot.ordinal !== index + 1)) {
      throw new RangeError(`A6.12a ${kind}目录数量或ordinal不连续。`);
    }
  }
  if (!Array.isArray(snapshot.previewSlots)) {
    throw new TypeError('A6.12a A6.8 previewSlots必须是数组。');
  }
  const expectedKind = screenId.startsWith('weapon') ? 'weapon' : 'map';
  const currentSlots = Object.freeze(snapshot.previewSlots.map((candidate, index) => {
    const current = exactRecord(candidate, PREVIEW_SLOT_KEYS, `A6.12a previewSlots[${index}]`);
    if (current.kind !== expectedKind) throw new RangeError('A6.12a当前页preview kind漂移。');
    const definitionId = text(current.definitionId, `A6.12a previewSlots[${index}].definitionId`, 300);
    const fullSlot = allSlots.get(slotKey(expectedKind, definitionId));
    if (fullSlot === undefined) throw new RangeError('A6.12a preview slot不属于完整binding。');
    const previewStrategy = fullSlot.slot.previewStrategies.find((strategy) => (
      strategy.screenId === screenId
    ));
    const { previewStrategies: _strategies, ...base } = fullSlot.slot;
    void _strategies;
    if (previewStrategy === undefined
      || canonical(current, 'A6.12a current preview slot')
        !== canonical({ ...base, previewStrategy }, 'A6.12a expected preview slot')) {
      throw new RangeError('A6.12a当前页preview slot与A6.4完整slot/strategy漂移。');
    }
    return Object.freeze({
      currentSlot: current as unknown as ArenaV2CollectionCurrentScreenPreviewSlotV1,
      fullSlot,
      previewStrategy,
    });
  }));
  const expectedCount = screenId === 'weapon-index' ? 20 : screenId === 'map-index' ? 2 : 1;
  if (currentSlots.length !== expectedCount) {
    throw new RangeError('A6.12a当前页preview slot数量不闭合。');
  }
  let previousOrdinal = 0;
  currentSlots.forEach(({ fullSlot }, index) => {
    if (fullSlot.slot.ordinal <= previousOrdinal
      || (!screenId.endsWith('-detail') && fullSlot.slot.ordinal !== index + 1)) {
      throw new RangeError('A6.12a当前页preview slots必须按ordinal稳定排列。');
    }
    previousOrdinal = fullSlot.slot.ordinal;
  });
  validateCurrentPageShape(snapshot, screenId, currentSlots);
  const governance = exactRecord(
    snapshot.formalAssetGovernance,
    GOVERNANCE_SUMMARY_KEYS,
    'A6.12a formalAssetGovernance',
  );
  if (governance.loadsResourcesHere !== false
    || governance.ownsThreeResourcesHere !== false
    || canonical(governance.contentIdentity, 'A6.12a governance contentIdentity')
      !== canonical(binding.contentIdentity, 'A6.12a binding contentIdentity')
    || canonical(governance.budget, 'A6.12a governance budget')
      !== canonical(binding.budget, 'A6.12a binding budget')
    || canonical(governance.layouts, 'A6.12a governance layouts')
      !== canonical(binding.layouts, 'A6.12a binding layouts')
    || canonical(governance.accessibility, 'A6.12a governance accessibility')
      !== canonical(binding.accessibility, 'A6.12a binding accessibility')
    || canonical(governance.governance, 'A6.12a governance')
      !== canonical(binding.governance, 'A6.12a binding governance')) {
    throw new RangeError('A6.12a A6.8治理摘要与完整binding漂移。');
  }
  const accessibility = assertPlainRecord(binding.accessibility, 'A6.12a binding.accessibility');
  if (typeof accessibility.reducedMotion !== 'boolean') {
    throw new TypeError('A6.12a reducedMotion必须是boolean。');
  }
  const reducedMotion = accessibility.reducedMotion;
  const layoutContract = (binding.layouts as readonly PlainRecord[]).find((layout) => (
    layout.viewport === viewport.viewportId
  ));
  if (layoutContract === undefined) throw new RangeError('A6.12a viewport缺少A6.4 layout合同。');
  const clipRect = parseRect(
    source.contentClipRectCssPixels,
    'A6.12a contentClipRectCssPixels',
    false,
    viewport,
  );
  if (!Array.isArray(source.slotLayouts) || source.slotLayouts.length !== currentSlots.length) {
    throw new RangeError('A6.12a slotLayouts必须与当前页previewSlots精确一一对应。');
  }
  const diagnostics: ArenaV2CollectionPreviewSlotVisibilityDiagnosticV1[] = [];
  const visibleDefinitionIds: string[] = [];
  const mountLayouts: ArenaV2CollectionVisibleWeaponMountLayoutV1[] = [];
  const fallbackLayouts: ArenaV2CollectionVisibleStaticFallbackLayoutV1[] = [];
  const seenLayouts = new Set<string>();
  source.slotLayouts.forEach((candidate, index) => {
    const layout = exactRecord(candidate, SLOT_LAYOUT_KEYS, `A6.12a slotLayouts[${index}]`);
    const current = currentSlots[index];
    if (current === undefined) throw new Error('A6.12a current slot索引意外缺失。');
    const kind = layout.kind;
    if (kind !== 'weapon' && kind !== 'map') throw new RangeError('A6.12a layout.kind不受支持。');
    const definitionId = text(layout.definitionId, `A6.12a slotLayouts[${index}].definitionId`, 300);
    const assetId = text(layout.assetId, `A6.12a slotLayouts[${index}].assetId`, 300);
    const ordinal = integer(layout.ordinal, `A6.12a slotLayouts[${index}].ordinal`, 1);
    const identity = slotKey(kind, definitionId);
    if (seenLayouts.has(identity)
      || kind !== current.fullSlot.slot.kind
      || definitionId !== current.fullSlot.slot.definitionId
      || assetId !== current.fullSlot.slot.assetId
      || ordinal !== current.fullSlot.slot.ordinal) {
      throw new RangeError('A6.12a slot layout重复、未知、错序或身份漂移。');
    }
    seenLayouts.add(identity);
    const rect = parseRect(
      layout.previewRectCssPixels,
      `A6.12a slotLayouts[${index}].previewRectCssPixels`,
      true,
      viewport,
    );
    const visibility = classifyRect(rect, clipRect);
    const indexScreen = screenId.endsWith('-index');
    const layoutMinimumValue = indexScreen
      ? layoutContract.indexPreviewMinimumCssPixels
      : layoutContract.detailPreviewMinimumCssPixels;
    const requiredMinimum = Math.max(
      current.previewStrategy.minimumSlotCssPixels,
      integer(layoutMinimumValue, 'A6.12a layout minimum', 1),
    ) as 72 | 96 | 168 | 240;
    const requiredSafeInset = Math.max(
      current.previewStrategy.safeInsetCssPixels,
      integer(layoutContract.previewSafeInsetCssPixels, 'A6.12a layout safe inset', 1),
    ) as 8 | 12;
    if (visibility === 'fully-visible') {
      if (rect.width < requiredMinimum
        || rect.height < requiredMinimum
        || rect.width <= requiredSafeInset * 2
        || rect.height <= requiredSafeInset * 2) {
        throw new RangeError('A6.12a fully-visible槽未满足A6.4 minimumSlot/safeInset。');
      }
      visibleDefinitionIds.push(definitionId);
      if (current.fullSlot.eligible) {
        if (kind !== 'weapon' || !screenId.startsWith('weapon')) {
          throw new Error('A6.12a仅武器页正式武器可形成mount layout。');
        }
        mountLayouts.push(Object.freeze({
          schemaVersion: 1 as const,
          screenId: screenId as 'weapon-index' | 'weapon-detail',
          definitionId,
          assetId,
          ordinal,
          slot: current.fullSlot.slot,
          viewport,
          previewRectCssPixels: rect,
          reducedMotion,
        }));
      } else {
        fallbackLayouts.push(Object.freeze({
          schemaVersion: 1 as const,
          screenId,
          kind,
          definitionId,
          assetId,
          ordinal,
          viewport,
          previewRectCssPixels: rect,
          reason: kind === 'map'
            ? 'map-formal-preview-not-approved' as const
            : 'missing-or-unapproved-weapon' as const,
          previewSourceUse: 'text-shape-pattern-fallback-only' as const,
          fallbackContent: 'text-shape-pattern-only' as const,
          requestPermitted: false as const,
        }));
      }
    }
    diagnostics.push(Object.freeze({
      schemaVersion: 1 as const,
      kind,
      definitionId,
      assetId,
      ordinal,
      previewRectCssPixels: rect,
      visibility,
      requiredMinimumSlotCssPixels: requiredMinimum,
      requiredSafeInsetCssPixels: requiredSafeInset,
      leaseEligibleWhenFullyVisible: current.fullSlot.eligible,
      staticFallbackWhenFullyVisible: !current.fullSlot.eligible,
    }));
  });
  if (screenId.endsWith('-detail')
    && (visibleDefinitionIds.length !== 1 || diagnostics[0]?.visibility !== 'fully-visible')) {
    throw new RangeError('A6.12a detail页唯一selection preview必须fully-visible。');
  }
  const previousLedger = parseLedger(
    source.previousActiveLeaseLedger,
    epochId,
    catalogContentHash,
    allSlots,
  );
  const typedSnapshot = snapshot as unknown as ArenaV2CollectionFourScreenReadSnapshotV1;
  const plannerInput = Object.freeze({
    schemaVersion: 1 as const,
    epochId,
    tick,
    screenId,
    viewport: viewport.viewportId,
    readSnapshot: typedSnapshot,
    visibleDefinitionIds: Object.freeze(visibleDefinitionIds),
    previousActiveLeaseLedger: previousLedger,
  });
  const waterlineCanonical = canonical({
    catalogRevision: contentIdentity.catalogRevision,
    catalogContentHash,
    productionApprovalLedgerId: contentIdentity.productionApprovalLedgerId,
    productionApprovalLedgerContentHash: contentIdentity.productionApprovalLedgerContentHash,
    slots: binding.slots,
    budget: binding.budget,
    layouts: binding.layouts,
    reducedMotion,
    governance: binding.governance,
  }, 'A6.12a binding waterline');
  return Object.freeze({
    epochId,
    tick,
    screenId,
    viewport,
    readSnapshot: typedSnapshot,
    previousLedger,
    clipRect,
    plannerInput,
    mountLayouts: Object.freeze(mountLayouts),
    fallbackLayouts: Object.freeze(fallbackLayouts),
    diagnostics: Object.freeze(diagnostics),
    bindingValidation,
    waterlineCanonical,
    inputCanonical: canonical(cloned, 'A6.12a observation input'),
  });
}

export class ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1 {
  #state: ArenaV2CollectionVisibleLayoutObservationOwnerStateV1 = 'active';
  #epochId: string;
  #busy = false;
  #lastTick = -1;
  #lastInputCanonical: string | null = null;
  #bindingWaterlineCanonical: string | null = null;
  #snapshot: ArenaV2CollectionVisibleLayoutObservationSnapshotV1 | null = null;

  constructor(value: unknown) {
    const source = exactRecord(
      cloneFrozenData(value, 'A6.12a constructor'),
      CONSTRUCTOR_KEYS,
      'A6.12a constructor',
    );
    this.#epochId = text(source.epochId, 'A6.12a constructor.epochId', 200);
  }

  get state(): ArenaV2CollectionVisibleLayoutObservationOwnerStateV1 {
    return this.#state;
  }

  #assertActive(operation: string): void {
    if (this.#state !== 'active') throw new Error(`${operation}拒绝状态${this.#state}。`);
    if (this.#busy) throw new Error(`${operation}拒绝重入。`);
  }

  #clearCommitted(): void {
    this.#lastTick = -1;
    this.#lastInputCanonical = null;
    this.#bindingWaterlineCanonical = null;
    this.#snapshot = null;
  }

  observe(value: unknown): ArenaV2CollectionVisibleLayoutObservationSnapshotV1 {
    this.#assertActive('A6.12a observe');
    this.#busy = true;
    try {
      const parsed = parseObservation(value);
      if (parsed.epochId !== this.#epochId) throw new RangeError('A6.12a epochId漂移。');
      if (parsed.tick < this.#lastTick) throw new RangeError('A6.12a tick回退。');
      if (parsed.tick === this.#lastTick) {
        if (parsed.inputCanonical !== this.#lastInputCanonical) {
          throw new RangeError('A6.12a同tick布局、screen或事实冲突。');
        }
        if (this.#snapshot === null) throw new Error('A6.12a同tick幂等snapshot缺失。');
        return this.#snapshot;
      }
      if (this.#bindingWaterlineCanonical !== null
        && parsed.waterlineCanonical !== this.#bindingWaterlineCanonical) {
        throw new RangeError('A6.12a同epoch A6.4租约/视觉合同漂移，必须新建Owner。');
      }
      const snapshot = Object.freeze({
        schemaVersion: 1 as const,
        status: 'production-unreachable' as const,
        implementationStatus: 'code-written-not-run' as const,
        validationStatus: 'not-run' as const,
        hardGate: false as const,
        defaultSurfaceWired: false as const,
        state: 'active' as const,
        epochId: parsed.epochId,
        tick: parsed.tick,
        screenId: parsed.screenId,
        plannerViewport: parsed.viewport.viewportId,
        mountViewport: parsed.viewport,
        contentClipRectCssPixels: parsed.clipRect,
        plannerInput: parsed.plannerInput,
        visibleWeaponMountLayouts: parsed.mountLayouts,
        visibleStaticFallbackLayouts: parsed.fallbackLayouts,
        allSlotVisibility: parsed.diagnostics,
        bindingValidation: parsed.bindingValidation,
        bindingWaterlineCanonicalByteLength: utf8ByteLength(parsed.waterlineCanonical),
        readsDom: false as const,
        createsThree: false as const,
        loadsResources: false as const,
        executesA6_10: false as const,
        triggersA6_9: false as const,
      });
      this.#lastTick = parsed.tick;
      this.#lastInputCanonical = parsed.inputCanonical;
      this.#bindingWaterlineCanonical = parsed.waterlineCanonical;
      this.#snapshot = snapshot;
      return snapshot;
    } catch (error) {
      if (isRecoverableContractError(error)) throw error;
      this.#clearCommitted();
      this.#state = 'failed';
      throw error;
    } finally {
      this.#busy = false;
    }
  }

  getSnapshot(): ArenaV2CollectionVisibleLayoutObservationSnapshotV1 | null {
    this.#assertActive('A6.12a getSnapshot');
    return this.#snapshot;
  }

  destroy(): void {
    if (this.#state === 'destroyed') return;
    if (this.#busy) throw new Error('A6.12a observe期间不能destroy。');
    this.#clearCommitted();
    this.#state = 'destroyed';
  }
}
