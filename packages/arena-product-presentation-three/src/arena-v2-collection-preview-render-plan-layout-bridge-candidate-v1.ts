import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  addArenaV2InformationSelectionToRenderPlanCandidateV1,
  type ArenaV2InformationScreenPipelineResultV1,
  type ArenaV2InformationSelectionProjectionCandidateV1,
  type ArenaV2UiRectV1,
  type ArenaV2UiRenderPlanV1,
  type ArenaV2UiRenderPrimitiveV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1,
  ARENA_V2_MAP_ROUTE_RESEARCH_MILESTONE_PERCENTAGES_V1,
  ARENA_V2_WEAPON_COLLECTION_RESEARCH_MILESTONE_THRESHOLDS_V1,
  projectArenaV2MapRouteResearchMilestoneV1,
  projectArenaV2WeaponCollectionResearchMilestoneV1,
} from '@number-strategy-jump/arena-product-progression';
import type {
  ArenaV2CollectionFourScreenIdV1,
  ArenaV2CollectionFourScreenReadSnapshotV1,
  ArenaV2CollectionCurrentScreenPreviewSlotV1,
} from './arena-v2-collection-four-screen-read-owner-candidate-v1.js';
import type {
  ArenaV2CollectionPreviewSlotLayoutObservationInputV1,
} from './arena-v2-collection-visible-layout-observation-owner-candidate-v1.js';
import type {
  ArenaV2A6WeaponPreviewRectCssPixelsV1,
  ArenaV2A6WeaponPreviewViewportV1,
} from './arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.js';
import {
  createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1,
} from './arena-v2-collection-semantic-fallback-visual-profile-candidate-v1.js';
import {
  addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1,
} from './arena-v2-map-selection-card-non-color-route-identity-render-plan-candidate-v1.js';
import {
  addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1,
} from './arena-v2-weapon-collection-combat-grammar-fallback-geometry-render-plan-candidate-v1.js';

export const ARENA_V2_COLLECTION_PREVIEW_RENDER_PLAN_LAYOUT_BRIDGE_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    stage: 'A6.15' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    outputIsStandardRenderPlan: true as const,
    readsDom: false as const,
    measuresDom: false as const,
    createsThreeResources: false as const,
    loadsAssetBytes: false as const,
    actionsAdded: 0 as const,
    maximumCurrentPageSlotCount: 20 as const,
    maximumOutputPrimitiveCount: 256 as const,
    scrollCoordinatesStoredUnprojected: true as const,
    outputRenderPlanIdentityIncludesFixedViewportId: true as const,
    formalWeaponPreviewCenter: 'transparent-for-a6.13' as const,
    mapPreviewSource: 'text-shape-pattern-fallback-only' as const,
    semanticFallbackVocabulary: 'arena-v2.a6.18.v1' as const,
    semanticFallbackProfileCount: 22 as const,
    semanticFallbackMaximumPrimitiveCountPerSlot: 4 as const,
    semanticFallbackResourceRequestsAdded: 0 as const,
    weaponCombatGrammarFallbackGeometryWired: true as const,
    weaponCombatGrammarFallbackGeometryIndexAndDetailWired: true as const,
    weaponCombatGrammarFallbackGeometryAddedPrimitiveCount: 0 as const,
    weaponCombatGrammarFallbackPanelsReshaped: 60 as const,
    weaponCombatGrammarFallbackDetailPanelsReshapedPerSelectedWeapon: 3 as const,
    mapSelectionNonColorRouteIdentityWired: true as const,
    mapSelectionNonColorRouteIdentityAddedPrimitiveCount: 6 as const,
    mapDetailNonColorRouteIdentityWired: true as const,
    mapDetailNonColorRouteIdentityAddedPrimitiveCount: 0 as const,
    mapDetailNonColorRouteIdentityPanelsReshapedPerSelectedMap: 3 as const,
    hostComposedSourceRenderPlanAttested: true as const,
  });

export interface ArenaV2CollectionPreviewRenderPlanLayoutBridgeInputV1 {
  readonly schemaVersion: 1;
  readonly epochId: string;
  readonly tick: number;
  readonly viewport: ArenaV2A6WeaponPreviewViewportV1;
  readonly scrollOffsetCssPixels: number;
  readonly scrollSourceRenderPlanIdentity: string;
  readonly scrollSourceRenderPlanRevision: number;
  readonly pipelineResult: ArenaV2InformationScreenPipelineResultV1;
  readonly authoritativeSourceRenderPlan?: ArenaV2UiRenderPlanV1;
  readonly selectionProjection: ArenaV2InformationSelectionProjectionCandidateV1 | null;
  readonly sourceRenderPlan: ArenaV2UiRenderPlanV1;
  readonly readSnapshot: ArenaV2CollectionFourScreenReadSnapshotV1;
}

export interface ArenaV2CollectionPreviewRenderPlanLayoutBridgeA6_12cInputV1 {
  readonly contentClipRectCssPixels: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly slotLayouts: readonly ArenaV2CollectionPreviewSlotLayoutObservationInputV1[];
}

export interface ArenaV2CollectionPreviewRenderPlanLayoutDiagnosticV1 {
  readonly schemaVersion: 1;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly definitionId: string;
  readonly assetId: string;
  readonly ordinal: number;
  readonly sourcePanelRectCssPixels: ArenaV2UiRectV1;
  readonly storedPreviewRectCssPixels: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly projectedPreviewRectCssPixels: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly previewUiMode:
    | 'transparent-formal-weapon-center'
    | 'text-shape-pattern-map-fallback'
    | 'text-shape-pattern-weapon-fallback';
  readonly requestPermittedByUpstreamSlot: boolean;
  readonly selectedInSourceProjection: boolean;
}

export interface ArenaV2CollectionPreviewRenderPlanLayoutBridgeResultV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly epochId: string;
  readonly tick: number;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly viewport: ArenaV2A6WeaponPreviewViewportV1;
  readonly scrollOffsetCssPixels: number;
  readonly maximumScrollOffsetCssPixels: number;
  readonly sourceRenderPlanIdentity: string;
  readonly sourceRenderPlanRevision: number;
  readonly previewAwareRenderPlan: ArenaV2UiRenderPlanV1;
  readonly a6_12cLayoutInput: ArenaV2CollectionPreviewRenderPlanLayoutBridgeA6_12cInputV1;
  readonly diagnostics: Readonly<{
    readonly sourceSelectionCardsReused: number;
    readonly insertedDetailPanelCount: 0 | 1;
    readonly shiftedContentPrimitiveCount: number;
    readonly formalWeaponTransparentPreviewCount: number;
    readonly staticFallbackPreviewCount: number;
    readonly sourceActionCount: number;
    readonly outputActionCount: number;
    readonly addsAction: false;
    readonly storedRenderPlanCoordinatesRemainUnscrolled: true;
    readonly slotLayoutsUseProjectedCssCoordinates: true;
    readonly slots: readonly ArenaV2CollectionPreviewRenderPlanLayoutDiagnosticV1[];
  }>;
}

export type ArenaV2CollectionPreviewRenderPlanLayoutBridgeStateV1 =
  | 'active'
  | 'destroyed';

export interface ArenaV2CollectionPreviewRenderPlanLayoutBridgeSnapshotV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly state: ArenaV2CollectionPreviewRenderPlanLayoutBridgeStateV1;
  readonly epochId: string;
  readonly lastTick: number;
  readonly lastScreenId: ArenaV2CollectionFourScreenIdV1 | null;
  readonly sourceRenderPlanIdentityCount: number;
  readonly hasCommittedResult: boolean;
  readonly createsThreeResources: false;
  readonly loadsAssetBytes: false;
}

interface ParsedInputV1 {
  readonly epochId: string;
  readonly tick: number;
  readonly viewport: ArenaV2A6WeaponPreviewViewportV1;
  readonly scrollOffsetCssPixels: number;
  readonly selectionProjection: ArenaV2InformationSelectionProjectionCandidateV1 | null;
  readonly sourceRenderPlan: ArenaV2UiRenderPlanV1;
  readonly readSnapshot: ArenaV2CollectionFourScreenReadSnapshotV1;
  readonly inputCanonical: string;
  readonly sourcePlanCanonical: string;
}

interface SourcePlanViewportRecordV1 {
  readonly revision: number;
  readonly canonical: string;
}

interface SourcePlanIdentityRecordV1 {
  readonly '390x844': SourcePlanViewportRecordV1 | null;
  readonly '1440x900': SourcePlanViewportRecordV1 | null;
}

interface ComposedLayoutV1 {
  readonly renderPlan: ArenaV2UiRenderPlanV1;
  readonly storedSlotRects: readonly ArenaV2A6WeaponPreviewRectCssPixelsV1[];
  readonly sourcePanelRects: readonly ArenaV2UiRectV1[];
  readonly sourceSelectionCardsReused: number;
  readonly insertedDetailPanelCount: 0 | 1;
  readonly shiftedContentPrimitiveCount: number;
}

const INPUT_KEYS = new Set([
  'schemaVersion', 'epochId', 'tick', 'viewport', 'scrollOffsetCssPixels',
  'scrollSourceRenderPlanIdentity', 'scrollSourceRenderPlanRevision',
  'pipelineResult', 'authoritativeSourceRenderPlan', 'selectionProjection',
  'sourceRenderPlan', 'readSnapshot',
]);
const CONSTRUCTOR_KEYS = new Set(['schemaVersion', 'epochId']);
const PIPELINE_KEYS = new Set([
  'schemaVersion', 'status', 'productionReady', 'viewModel', 'renderModel',
  'layout', 'renderPlan',
]);
const RENDER_PLAN_KEYS = new Set([
  'schemaVersion', 'surfaceKind', 'identity', 'revision', 'status',
  'productionReady', 'primitives', 'scrollRegion', 'liveAnnouncements',
  'audioCues', 'worldAnchors', 'inputExclusionRect', 'formalAssetIds',
]);
const SCROLL_REGION_KEYS = new Set([
  'viewport', 'contentHeight', 'verticalScrollRequired',
]);
const RECT_KEYS = new Set(['x', 'y', 'width', 'height']);
const PANEL_KEYS = new Set([
  'kind', 'id', 'rect', 'clipRect', 'tone', 'cornerRadiusCssPixels', 'zIndex',
]);
const TEXT_KEYS = new Set([
  'kind', 'id', 'rect', 'clipRect', 'text', 'accessibilityText', 'tone',
  'role', 'alignment', 'maximumLines', 'fixedWidthNumeric', 'zIndex',
]);
const ACTION_KEYS = new Set([
  'kind', 'id', 'rect', 'clipRect', 'intentId', 'label', 'accessibilityText',
  'enabled', 'disabledReason', 'minimumTouchTargetCssPixels', 'tone', 'zIndex',
]);
const VIEWPORT_KEYS = new Set(['viewportId', 'widthCssPixels', 'heightCssPixels']);
const PROJECTION_KEYS = new Set(['kind', 'selectedId', 'items']);
const PROJECTION_ITEM_KEYS = new Set([
  'id', 'label', 'description', 'available', 'unavailableReason',
]);
const REQUIRED_PROJECTION_ITEM_KEYS = Object.freeze([
  'id', 'label', 'description',
] as const);
const MAX_PRIMITIVES = 256;
const MAX_SCROLL_CONTENT_HEIGHT = 32_768;
const MAIN_RESEARCH_LINE_HEIGHT = 20;
const MAIN_RESEARCH_MILESTONE_LINE_HEIGHT = 20;

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function inputRecord(value: unknown): PlainRecord {
  const source = assertPlainRecord(value, 'A6.15 compose input');
  assertKnownKeys(source, INPUT_KEYS, 'A6.15 compose input');
  for (const key of INPUT_KEYS) {
    if (key === 'authoritativeSourceRenderPlan') continue;
    if (!Object.hasOwn(source, key)) throw new TypeError(`A6.15 compose input缺少${key}。`);
  }
  return source;
}

function text(value: unknown, name: string, maximum = 500): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) {
    throw new RangeError(`${name}必须是1..${maximum}字符字符串。`);
  }
  return value;
}

function safeInteger(value: unknown, name: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name}必须是不小于${minimum}的安全整数。`);
  }
  return value as number;
}

function finite(value: unknown, name: string, minimum?: number): number {
  if (!Number.isFinite(value) || (minimum !== undefined && (value as number) < minimum)) {
    throw new RangeError(`${name}必须是${minimum === undefined ? '' : `不小于${minimum}的`}有限数。`);
  }
  return value as number;
}

function stableCanonical(value: unknown, name: string): string {
  const seen = new Set<object>();
  const normalize = (candidate: unknown): unknown => {
    if (candidate === null || typeof candidate === 'string' || typeof candidate === 'boolean') {
      return candidate;
    }
    if (typeof candidate === 'number') {
      if (!Number.isFinite(candidate)) throw new TypeError(`${name}含非有限数。`);
      return candidate;
    }
    if (Array.isArray(candidate)) return candidate.map(normalize);
    if (typeof candidate !== 'object') throw new TypeError(`${name}含非数据字段。`);
    if (seen.has(candidate)) throw new TypeError(`${name}含循环引用。`);
    seen.add(candidate);
    const record = assertPlainRecord(candidate, name);
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) normalized[key] = normalize(record[key]);
    seen.delete(candidate);
    return normalized;
  };
  const result = JSON.stringify(normalize(value));
  if (typeof result !== 'string') throw new TypeError(`${name}无法规范序列化。`);
  return result;
}

function parseViewport(value: unknown): ArenaV2A6WeaponPreviewViewportV1 {
  const source = exactRecord(value, VIEWPORT_KEYS, 'A6.15 viewport');
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
  throw new RangeError('A6.15 viewport只接受390×844或1440×900完整身份。');
}

function parseRect(value: unknown, name: string, positiveSize = true): ArenaV2UiRectV1 {
  const source = exactRecord(value, RECT_KEYS, name);
  const x = finite(source.x, `${name}.x`);
  const y = finite(source.y, `${name}.y`);
  const width = finite(source.width, `${name}.width`, positiveSize ? 1 : 0);
  const height = finite(source.height, `${name}.height`, positiveSize ? 1 : 0);
  return Object.freeze({ x, y, width, height });
}

function integerRect(
  x: number,
  y: number,
  width: number,
  height: number,
  name: string,
): ArenaV2A6WeaponPreviewRectCssPixelsV1 {
  for (const [label, value] of Object.entries({ x, y, width, height })) {
    if (!Number.isSafeInteger(value) || ((label === 'width' || label === 'height') && value < 1)) {
      throw new RangeError(`${name}.${label}必须是安全整数。`);
    }
  }
  return Object.freeze({ x, y, width, height });
}

function sameRect(left: ArenaV2UiRectV1, right: ArenaV2UiRectV1): boolean {
  return left.x === right.x && left.y === right.y
    && left.width === right.width && left.height === right.height;
}

function parsePrimitive(value: unknown, name: string): ArenaV2UiRenderPrimitiveV1 {
  const candidate = assertPlainRecord(value, name);
  const keys = candidate.kind === 'panel' ? PANEL_KEYS
    : candidate.kind === 'text' ? TEXT_KEYS
      : candidate.kind === 'action' ? ACTION_KEYS
        : null;
  if (keys === null) throw new RangeError(`${name}.kind不受支持。`);
  const source = exactRecord(candidate, keys, name);
  const id = text(source.id, `${name}.id`, 500);
  const rect = parseRect(source.rect, `${name}.rect`);
  const clipRect = source.clipRect === null ? null : parseRect(source.clipRect, `${name}.clipRect`);
  const zIndex = safeInteger(source.zIndex, `${name}.zIndex`);
  if (source.kind === 'panel') {
    const tone = source.tone;
    if (!['background', 'surface', 'primary', 'secondary', 'muted', 'strong', 'warning', 'transparent'].includes(tone as string)) {
      throw new RangeError(`${name}.tone不受支持。`);
    }
    return Object.freeze({
      kind: 'panel', id, rect, clipRect,
      tone: tone as Extract<ArenaV2UiRenderPrimitiveV1, { kind: 'panel' }>['tone'],
      cornerRadiusCssPixels: finite(source.cornerRadiusCssPixels, `${name}.cornerRadiusCssPixels`, 0),
      zIndex,
    });
  }
  if (source.kind === 'text') {
    const role = source.role;
    const alignment = source.alignment;
    const tone = source.tone;
    if (!['question', 'label', 'value', 'navigation', 'hud-primary', 'hud-secondary', 'feedback'].includes(role as string)
      || !['left', 'center', 'right'].includes(alignment as string)
      || !['background', 'surface', 'primary', 'secondary', 'muted', 'strong', 'warning', 'transparent'].includes(tone as string)
      || typeof source.fixedWidthNumeric !== 'boolean') {
      throw new RangeError(`${name}文字枚举或布尔字段不闭合。`);
    }
    return Object.freeze({
      kind: 'text', id, rect, clipRect,
      text: text(source.text, `${name}.text`, 2_000),
      accessibilityText: text(source.accessibilityText, `${name}.accessibilityText`, 4_000),
      tone: tone as Extract<ArenaV2UiRenderPrimitiveV1, { kind: 'text' }>['tone'],
      role: role as Extract<ArenaV2UiRenderPrimitiveV1, { kind: 'text' }>['role'],
      alignment: alignment as 'left' | 'center' | 'right',
      maximumLines: safeInteger(source.maximumLines, `${name}.maximumLines`, 1),
      fixedWidthNumeric: source.fixedWidthNumeric,
      zIndex,
    });
  }
  const tone = source.tone;
  if (!['primary', 'muted', 'transparent'].includes(tone as string)
    || typeof source.enabled !== 'boolean'
    || (source.disabledReason !== null && typeof source.disabledReason !== 'string')
    || source.minimumTouchTargetCssPixels !== 48) {
    throw new RangeError(`${name}动作合同不闭合。`);
  }
  return Object.freeze({
    kind: 'action', id, rect, clipRect,
    intentId: text(source.intentId, `${name}.intentId`, 1_000),
    label: text(source.label, `${name}.label`, 1_000),
    accessibilityText: text(source.accessibilityText, `${name}.accessibilityText`, 2_000),
    enabled: source.enabled,
    disabledReason: source.disabledReason as string | null,
    minimumTouchTargetCssPixels: 48,
    tone: tone as 'primary' | 'muted' | 'transparent',
    zIndex,
  });
}

function parseRenderPlan(value: unknown, name: string): ArenaV2UiRenderPlanV1 {
  const source = exactRecord(value, RENDER_PLAN_KEYS, name);
  if (source.schemaVersion !== 1 || source.surfaceKind !== 'information'
    || source.status !== 'layout-candidate' || source.productionReady !== false) {
    throw new RangeError(`${name}不是未晋级Information RenderPlan V1。`);
  }
  if (!Array.isArray(source.primitives) || source.primitives.length > MAX_PRIMITIVES) {
    throw new RangeError(`${name}.primitives超过有界上限。`);
  }
  const ids = new Set<string>();
  const primitives = Object.freeze(source.primitives.map((candidate, index) => {
    const parsed = parsePrimitive(candidate, `${name}.primitives[${index}]`);
    if (ids.has(parsed.id)) throw new RangeError(`${name}含重复primitive id ${parsed.id}。`);
    ids.add(parsed.id);
    return parsed;
  }));
  const scroll = exactRecord(source.scrollRegion, SCROLL_REGION_KEYS, `${name}.scrollRegion`);
  const viewport = parseRect(scroll.viewport, `${name}.scrollRegion.viewport`);
  const contentHeight = finite(scroll.contentHeight, `${name}.scrollRegion.contentHeight`, 1);
  if (contentHeight > MAX_SCROLL_CONTENT_HEIGHT
    || scroll.verticalScrollRequired !== (contentHeight > viewport.height)) {
    throw new RangeError(`${name}.scrollRegion范围或滚动标记不闭合。`);
  }
  if (!Array.isArray(source.liveAnnouncements)
    || source.liveAnnouncements.length > 16
    || source.liveAnnouncements.some((entry) => typeof entry !== 'string')) {
    throw new TypeError(`${name}.liveAnnouncements不闭合。`);
  }
  if (!Array.isArray(source.audioCues) || source.audioCues.length !== 0
    || !Array.isArray(source.worldAnchors) || source.worldAnchors.length !== 0
    || source.inputExclusionRect !== null
    || !Array.isArray(source.formalAssetIds) || source.formalAssetIds.length !== 0) {
    throw new RangeError(`${name}不得夹带HUD、世界锚点、输入排除或资产加载身份。`);
  }
  return Object.freeze({
    schemaVersion: 1,
    surfaceKind: 'information',
    identity: text(source.identity, `${name}.identity`, 500),
    revision: safeInteger(source.revision, `${name}.revision`),
    status: 'layout-candidate',
    productionReady: false,
    primitives,
    scrollRegion: Object.freeze({
      viewport,
      contentHeight,
      verticalScrollRequired: scroll.verticalScrollRequired as boolean,
    }),
    liveAnnouncements: Object.freeze([...(source.liveAnnouncements as string[])]),
    audioCues: Object.freeze([]),
    worldAnchors: Object.freeze([]),
    inputExclusionRect: null,
    formalAssetIds: Object.freeze([] as const),
  });
}

function parseProjection(
  value: unknown,
  expectedKind: 'weapon' | 'map',
): ArenaV2InformationSelectionProjectionCandidateV1 {
  const source = exactRecord(value, PROJECTION_KEYS, 'A6.15 selectionProjection');
  if (source.kind !== expectedKind) throw new RangeError('A6.15 selection kind与当前页漂移。');
  const selectedId = text(source.selectedId, 'A6.15 selectionProjection.selectedId', 300);
  if (!Array.isArray(source.items)) throw new TypeError('A6.15 selectionProjection.items必须为数组。');
  const expectedCount = expectedKind === 'weapon' ? 20 : 2;
  if (source.items.length !== expectedCount) {
    throw new RangeError(`A6.15 ${expectedKind} selection必须精确${expectedCount}项。`);
  }
  const ids = new Set<string>();
  const items = Object.freeze(source.items.map((candidate, index) => {
    const itemName = `A6.15 selection item[${index}]`;
    const item = assertPlainRecord(candidate, itemName);
    assertKnownKeys(item, PROJECTION_ITEM_KEYS, itemName);
    for (const key of REQUIRED_PROJECTION_ITEM_KEYS) {
      if (!Object.hasOwn(item, key)) throw new TypeError(`${itemName}缺少${key}。`);
    }
    const id = text(item.id, `A6.15 selection item[${index}].id`, 300);
    if (ids.has(id)) throw new RangeError('A6.15 selection definitionId重复。');
    ids.add(id);
    try {
      if (decodeURIComponent(encodeURIComponent(id)) !== id) throw new URIError();
    } catch {
      throw new RangeError('A6.15 selection definitionId不能稳定编码。');
    }
    const hasAvailability = Object.hasOwn(item, 'available');
    const hasUnavailableReason = Object.hasOwn(item, 'unavailableReason');
    if (hasAvailability !== hasUnavailableReason) {
      throw new TypeError('A6.15 selection可用性与不可用原因必须同时提供。');
    }
    if (hasAvailability && typeof item.available !== 'boolean') {
      throw new TypeError('A6.15 selection available必须是布尔值。');
    }
    const available = hasAvailability ? item.available as boolean : true;
    const unavailableReason = hasUnavailableReason
      ? item.unavailableReason === null
        ? null
        : text(
          item.unavailableReason,
          `A6.15 selection item[${index}].unavailableReason`,
          500,
        )
      : null;
    if (available === (unavailableReason !== null)) {
      throw new RangeError('A6.15 selection可用性与不可用原因不闭合。');
    }
    return Object.freeze({
      id,
      label: text(item.label, `A6.15 selection item[${index}].label`, 500),
      description: text(item.description, `A6.15 selection item[${index}].description`, 1_000),
      ...(hasAvailability ? { available, unavailableReason } : {}),
    });
  }));
  if (!ids.has(selectedId)) throw new RangeError('A6.15 selectedId不属于当前目录。');
  if (items.find(({ id }) => id === selectedId)?.available === false) {
    throw new RangeError('A6.15 selectedId不能指向未开放收藏项。');
  }
  return Object.freeze({ kind: expectedKind, selectedId, items });
}

function requireIntegerClip(
  rect: ArenaV2UiRectV1,
  viewport: ArenaV2A6WeaponPreviewViewportV1,
): ArenaV2A6WeaponPreviewRectCssPixelsV1 {
  const clip = integerRect(rect.x, rect.y, rect.width, rect.height, 'A6.15 content clip');
  if (clip.x < 0 || clip.y < 0
    || clip.x + clip.width > viewport.widthCssPixels
    || clip.y + clip.height > viewport.heightCssPixels) {
    throw new RangeError('A6.15 content clip必须完整位于固定viewport。');
  }
  return clip;
}

function parseInput(value: unknown): ParsedInputV1 {
  const cloned = cloneFrozenData(value, 'A6.15 compose input');
  const source = inputRecord(cloned);
  if (source.schemaVersion !== 1) throw new RangeError('A6.15只接受schema 1。');
  const epochId = text(source.epochId, 'A6.15 epochId', 300);
  const tick = safeInteger(source.tick, 'A6.15 tick');
  const viewport = parseViewport(source.viewport);
  const scrollOffsetCssPixels = safeInteger(
    source.scrollOffsetCssPixels,
    'A6.15 scrollOffsetCssPixels',
  );
  const scrollSourceRenderPlanIdentity = text(
    source.scrollSourceRenderPlanIdentity,
    'A6.15 scrollSourceRenderPlanIdentity',
    500,
  );
  const scrollSourceRenderPlanRevision = safeInteger(
    source.scrollSourceRenderPlanRevision,
    'A6.15 scrollSourceRenderPlanRevision',
  );
  const pipelineSource = exactRecord(source.pipelineResult, PIPELINE_KEYS, 'A6.15 pipelineResult');
  if (pipelineSource.schemaVersion !== 1
    || pipelineSource.status !== 'surface-pipeline-candidate'
    || pipelineSource.productionReady !== false) {
    throw new RangeError('A6.15 pipelineResult治理状态不闭合。');
  }
  const viewModel = assertPlainRecord(pipelineSource.viewModel, 'A6.15 pipeline.viewModel');
  const renderModel = assertPlainRecord(pipelineSource.renderModel, 'A6.15 pipeline.renderModel');
  const layout = assertPlainRecord(pipelineSource.layout, 'A6.15 pipeline.layout');
  const basePlan = parseRenderPlan(pipelineSource.renderPlan, 'A6.15 pipeline.renderPlan');
  const readSnapshot = source.readSnapshot as ArenaV2CollectionFourScreenReadSnapshotV1;
  const readRecord = assertPlainRecord(readSnapshot, 'A6.15 A6.8 readSnapshot');
  const screenId = readRecord.screenId;
  if (screenId !== 'weapon-index' && screenId !== 'map-index'
    && screenId !== 'weapon-detail' && screenId !== 'map-detail') {
    throw new RangeError('A6.15 readSnapshot screenId不受支持。');
  }
  if (readRecord.schemaVersion !== 1
    || readRecord.status !== 'production-unreachable'
    || readRecord.hardGate !== false
    || readRecord.defaultSurfaceWired !== false
    || readRecord.validationStatus !== 'not-run'
    || readRecord.epochId !== epochId
    || readRecord.tick !== tick) {
    throw new RangeError('A6.15 A6.8快照治理、epoch或tick不闭合。');
  }
  const bindingRecord = assertPlainRecord(
    readRecord.formalAssetLeaseBinding,
    'A6.15 A6.8 formalAssetLeaseBinding',
  );
  if (bindingRecord.schemaVersion !== 1
    || bindingRecord.status !== 'production-unreachable'
    || bindingRecord.hardGate !== false
    || bindingRecord.defaultSurfaceWired !== false
    || bindingRecord.validationStatus !== 'not-run'
    || bindingRecord.epochId !== epochId
    || bindingRecord.tick !== tick) {
    throw new RangeError('A6.15 A6.8 formalAssetLeaseBinding治理、epoch或tick漂移。');
  }
  const revision = safeInteger(basePlan.revision, 'A6.15 pipeline renderPlan revision');
  if (viewModel.schemaVersion !== 1 || renderModel.schemaVersion !== 1 || layout.schemaVersion !== 1
    || viewModel.screenId !== screenId || renderModel.screenId !== screenId
    || layout.screenId !== screenId || basePlan.identity !== screenId
    || viewModel.revision !== revision || renderModel.revision !== revision) {
    throw new RangeError('A6.15 Pipeline各层screen/revision身份不闭合。');
  }
  const layoutViewport = parseRect(layout.contentViewport, 'A6.15 pipeline.layout.contentViewport');
  if (!sameRect(layoutViewport, basePlan.scrollRegion!.viewport)
    || layout.contentHeight !== basePlan.scrollRegion!.contentHeight) {
    throw new RangeError('A6.15 Pipeline Layout与RenderPlan滚动域漂移。');
  }
  requireIntegerClip(basePlan.scrollRegion!.viewport, viewport);

  const index = screenId.endsWith('-index');
  const expectedKind = screenId.startsWith('weapon') ? 'weapon' as const : 'map' as const;
  const selectionProjection = index
    ? parseProjection(source.selectionProjection, expectedKind)
    : source.selectionProjection === null ? null
      : (() => { throw new RangeError('A6.15详情页不得携带selection grid投影。'); })();
  const sourceRenderPlan = parseRenderPlan(source.sourceRenderPlan, 'A6.15 sourceRenderPlan');
  const expectedIndexSourcePlan = selectionProjection === null
    ? null
    : addArenaV2InformationSelectionToRenderPlanCandidateV1(basePlan, selectionProjection);
  const authoritativeSourceRenderPlan = source.authoritativeSourceRenderPlan === undefined
    ? expectedIndexSourcePlan ?? basePlan
    : parseRenderPlan(
      source.authoritativeSourceRenderPlan,
      'A6.15 authoritative source RenderPlan',
    );
  if (expectedIndexSourcePlan !== null && stableCanonical(
    authoritativeSourceRenderPlan,
    'A6.15 authoritative index source RenderPlan',
  ) !== stableCanonical(expectedIndexSourcePlan, 'A6.15 expected index source RenderPlan')) {
    throw new RangeError('A6.15目录页权威sourceRenderPlan不是当前Pipeline与selection的组合结果。');
  }
  if (authoritativeSourceRenderPlan.revision !== revision
    || (index
      ? !authoritativeSourceRenderPlan.identity.startsWith(`${screenId}:selection-`)
      : !authoritativeSourceRenderPlan.identity.startsWith(screenId))) {
    throw new RangeError('A6.15权威sourceRenderPlan页面或revision身份漂移。');
  }
  const expectedCanonical = stableCanonical(
    authoritativeSourceRenderPlan,
    'A6.15 authoritative source RenderPlan',
  );
  const sourcePlanCanonical = stableCanonical(sourceRenderPlan, 'A6.15 source RenderPlan');
  if (sourcePlanCanonical !== expectedCanonical) {
    throw new RangeError('A6.15 sourceRenderPlan不是Host当前权威组合结果。');
  }
  if (sourceRenderPlan.revision !== revision) {
    throw new RangeError('A6.15 sourceRenderPlan revision与Pipeline漂移。');
  }
  if (scrollSourceRenderPlanIdentity !== sourceRenderPlan.identity
    || scrollSourceRenderPlanRevision !== sourceRenderPlan.revision) {
    throw new RangeError('A6.15 scrollOffset没有绑定当前source RenderPlan identity/revision。');
  }
  return Object.freeze({
    epochId,
    tick,
    viewport,
    scrollOffsetCssPixels,
    selectionProjection,
    sourceRenderPlan,
    readSnapshot,
    inputCanonical: stableCanonical(cloned, 'A6.15 compose input'),
    sourcePlanCanonical,
  });
}

function layoutContractForViewport(
  readSnapshot: ArenaV2CollectionFourScreenReadSnapshotV1,
  viewport: ArenaV2A6WeaponPreviewViewportV1,
) {
  const layout = readSnapshot.formalAssetLeaseBinding.layouts.find(
    (candidate) => candidate.viewport === viewport.viewportId,
  );
  if (layout === undefined) throw new RangeError('A6.15 A6.4当前viewport布局合同缺失。');
  if (layout.newTouchActionsAdded !== 0
    || layout.existingItemTouchTargetMinimumCssPixels !== 48
    || layout.horizontalOverflowAllowed !== false) {
    throw new RangeError('A6.15 A6.4布局治理字段漂移。');
  }
  return layout;
}

function validateReadSnapshotAndSlots(
  parsed: ParsedInputV1,
): readonly ArenaV2CollectionCurrentScreenPreviewSlotV1[] {
  const read = parsed.readSnapshot;
  const index = read.screenId.endsWith('-index');
  if (index ? read.indexPage === null || read.detailPage !== null
    : read.detailPage === null || read.indexPage !== null) {
    throw new RangeError('A6.15 A6.8 index/detail页形状不闭合。');
  }
  const expectedKind = read.screenId.startsWith('weapon') ? 'weapon' : 'map';
  const expectedCount = read.screenId === 'weapon-index' ? 20
    : read.screenId === 'map-index' ? 2 : 1;
  if (read.previewSlots.length !== expectedCount) {
    throw new RangeError(`A6.15当前页必须精确${expectedCount}个preview slots。`);
  }
  const ids = new Set<string>();
  read.previewSlots.forEach((slot, indexValue) => {
    if (slot.kind !== expectedKind || slot.ordinal !== indexValue + 1
      || typeof slot.definitionId !== 'string' || slot.definitionId.length === 0
      || typeof slot.assetId !== 'string' || slot.assetId.length === 0
      || ids.has(slot.definitionId)
      || slot.previewStrategy.screenId !== read.screenId) {
      throw new RangeError('A6.15 previewSlots类型、次序或身份漂移。');
    }
    ids.add(slot.definitionId);
  });
  if (index) {
    const page = read.screenId === 'weapon-index'
      ? read.indexPage!.weaponIndex : read.indexPage!.mapIndex;
    const projection = parsed.selectionProjection!;
    if (page.screenId !== read.screenId || page.items.length !== expectedCount) {
      throw new RangeError('A6.15 A6.2当前index page与A6.8 slots不闭合。');
    }
    if (expectedKind === 'weapon') requireWeaponCollectionJourney(page.weaponJourney);
    else if (page.weaponJourney !== null) {
      throw new RangeError('A6.15地图目录不得夹带武器收藏旅程。');
    }
    page.items.forEach((item, itemIndex) => {
      const slot = read.previewSlots[itemIndex]!;
      const projected = projection.items[itemIndex]!;
      if (item.kind !== expectedKind || item.ordinal !== itemIndex + 1
        || item.definitionId !== slot.definitionId
        || projected.id !== slot.definitionId
        || projected.label !== slot.displayName
        || item.displayName !== slot.displayName
        || item.action.targetDefinitionId !== slot.definitionId
        || item.action.intentId !== `arena.v2.selection.${expectedKind}.${encodeURIComponent(slot.definitionId)}`) {
        throw new RangeError('A6.15 selection、A6.2页面与A6.8 slot逐项身份漂移。');
      }
      if (expectedKind === 'weapon') requireWeaponCollectionResearch(item, itemIndex);
      else requireMapRouteResearch(item, itemIndex);
    });
  } else {
    const detail = read.detailPage!;
    const slot = read.previewSlots[0]!;
    if (detail.screenId !== read.screenId
      || detail.kind !== expectedKind
      || detail.targetDefinitionId !== slot.definitionId
      || (detail.summary !== null && detail.summary.displayName !== slot.displayName)) {
      throw new RangeError('A6.15详情页selection、名称与唯一preview slot漂移。');
    }
    const milestoneText = detail.summary?.nextMainResearchMilestoneText ?? null;
    const milestoneAccessibilityText =
      detail.summary?.nextMainResearchMilestoneAccessibilityText ?? null;
    const mapMilestoneText = detail.summary?.nextMapRouteResearchMilestoneText ?? null;
    const mapMilestoneAccessibilityText =
      detail.summary?.nextMapRouteResearchMilestoneAccessibilityText ?? null;
    if (expectedKind === 'weapon' && detail.summary !== null) {
      const current = detail.summary.collectionEvidenceCurrent;
      const target = detail.summary.collectionEvidenceTarget;
      if (!Number.isSafeInteger(current) || (current as number) < 0 || target !== 120
        || typeof detail.summary.collected !== 'boolean') {
        throw new RangeError('A6.15武器详情主研究计数、目标或收藏事实不闭合。');
      }
      const authority = projectArenaV2WeaponCollectionResearchMilestoneV1({
        count: current,
        target,
        collected: detail.summary.collected,
      });
      const next = authority.milestones.find(({ reached }) => !reached) ?? null;
      const expectedMilestoneText = next === null
        ? '主研究里程碑已完成'
        : `下一里程碑 ${next.threshold}/120，还需${next.threshold - authority.count}次主研究`;
      const expectedAccessibilityText = next === null
        ? '四个主研究里程碑均已完成。'
        : `下一主研究里程碑为${next.threshold}/120，还需要${
          next.threshold - authority.count
        }次主研究。`;
      if (detail.summary.mainResearchStage !== authority.stage
        || milestoneText !== expectedMilestoneText
        || milestoneAccessibilityText !== expectedAccessibilityText
        || detail.summary.routeResearch !== null
        || mapMilestoneText !== null
        || mapMilestoneAccessibilityText !== null) {
        throw new RangeError('A6.15武器详情主研究阶段或下一里程碑事实漂移。');
      }
    } else if (expectedKind === 'map' && detail.summary !== null) {
      const authority = requireMapRouteResearch({
        routeResearch: detail.summary.routeResearch,
      }, 0);
      const expectedMapMilestoneText = authority.nextMilestonePercentage === null
        ? '路线研究里程碑已完成'
        : `下一里程碑${authority.nextMilestonePercentage}%，还需${
          authority.remainingEvidenceCount
        }次有效路线练习`;
      const expectedMapAccessibilityText = authority.nextMilestonePercentage === null
        ? '四个地图路线研究里程碑均已完成。'
        : `下一地图路线研究里程碑为${authority.nextMilestonePercentage}%，还需要${
          authority.remainingEvidenceCount
        }次有效路线练习。`;
      if (mapMilestoneText !== expectedMapMilestoneText
        || mapMilestoneAccessibilityText !== expectedMapAccessibilityText
        || milestoneText !== null
        || milestoneAccessibilityText !== null
        || detail.summary.collectionEvidenceCurrent !== null
        || detail.summary.collectionEvidenceTarget !== null
        || detail.summary.mainResearchStage !== null
      ) {
        throw new RangeError('A6.15地图详情路线研究或主研究事实漂移。');
      }
    } else if (milestoneText !== null || milestoneAccessibilityText !== null
      || mapMilestoneText !== null || mapMilestoneAccessibilityText !== null) {
      throw new RangeError('A6.15空详情不得夹带研究里程碑文案。');
    }
  }
  return read.previewSlots;
}

function requireWeaponCollectionResearch(
  item: NonNullable<ArenaV2CollectionFourScreenReadSnapshotV1['indexPage']>[
    'weaponIndex'
  ]['items'][number],
  itemIndex: number,
) {
  const research = item.collectionResearch;
  if (research === null
    || !Number.isSafeInteger(research.current)
    || research.current < 0
    || research.target !== 120
    || research.current > research.target
    || research.labelText !== '主研究'
    || research.valueText !== `${research.current}/${research.target}`
    || research.complete !== (research.current === research.target)
    || typeof research.accessibilityText !== 'string'
    || research.accessibilityText.length === 0
    || research.milestones.length
      !== ARENA_V2_WEAPON_COLLECTION_RESEARCH_MILESTONE_THRESHOLDS_V1.length) {
    throw new RangeError(`A6.15 weapon item[${itemIndex}]主研究事实不闭合。`);
  }
  const authority = projectArenaV2WeaponCollectionResearchMilestoneV1({
    count: research.current,
    target: research.target,
    collected: item.collected,
  });
  if (research.stage !== authority.stage) {
    throw new RangeError(`A6.15 weapon item[${itemIndex}]主研究阶段与权威事实漂移。`);
  }
  research.milestones.forEach((milestone, milestoneIndex) => {
    const expected = authority.milestones[milestoneIndex]!;
    if (milestone.threshold !== expected.threshold || milestone.reached !== expected.reached) {
      throw new RangeError(`A6.15 weapon item[${itemIndex}]里程碑顺序或事实漂移。`);
    }
  });
  return research;
}

function requireWeaponCollectionJourney(
  journey: NonNullable<ArenaV2CollectionFourScreenReadSnapshotV1['indexPage']>[
    'weaponIndex'
  ]['weaponJourney'],
) {
  if (journey === null
    || journey.targetMainResearch !== 2_400
    || journey.weaponCount !== 20
    || journey.averageMatchMinutesAssumption
      !== ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1
    || journey.estimateKind !== 'capacity-hypothesis-not-player-promise'
    || journey.remainingMainResearch !== 2_400 - journey.currentMainResearch
    || journey.estimatedRemainingMinutes !== journey.remainingMainResearch
      * ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1
    || journey.collectedWeaponCount < 0
    || journey.collectedWeaponCount > 20
    || journey.valueText.length === 0
    || journey.accessibilityText.length === 0
    || journey.fixedWidthNumeric !== true) {
    throw new RangeError('A6.15武器收藏旅程事实不闭合。');
  }
  return journey;
}

function requireMapRouteResearch(
  item: Readonly<{ readonly routeResearch: unknown }>,
  itemIndex: number,
) {
  const research = item.routeResearch;
  if (research === null || typeof research !== 'object') {
    throw new RangeError(`A6.15 map item[${itemIndex}]缺少地图路线研究事实。`);
  }
  const typed = research as NonNullable<
    NonNullable<ArenaV2CollectionFourScreenReadSnapshotV1['indexPage']>[
      'mapIndex'
    ]['items'][number]['routeResearch']
  >;
  const authority = projectArenaV2MapRouteResearchMilestoneV1({
    evidenceCount: typed.evidenceCount,
    completedSegmentCount: typed.completedSegmentCount,
    segmentCount: typed.segmentCount,
    evidencePerSegmentTarget: typed.evidencePerSegmentTarget,
  });
  if (typed.schemaVersion !== authority.schemaVersion
    || typed.evidenceTarget !== authority.evidenceTarget
    || typed.stage !== authority.stage
    || typed.nextMilestonePercentage !== authority.nextMilestonePercentage
    || typed.nextMilestoneEvidenceThreshold !== authority.nextMilestoneEvidenceThreshold
    || typed.remainingEvidenceCount !== authority.remainingEvidenceCount
    || typed.milestones.length !== ARENA_V2_MAP_ROUTE_RESEARCH_MILESTONE_PERCENTAGES_V1.length) {
    throw new RangeError(`A6.15 map item[${itemIndex}]路线研究聚合事实漂移。`);
  }
  typed.milestones.forEach((milestone, milestoneIndex) => {
    const expected = authority.milestones[milestoneIndex]!;
    if (milestone.percentage !== expected.percentage
      || milestone.evidenceThreshold !== expected.evidenceThreshold
      || milestone.reached !== expected.reached) {
      throw new RangeError(`A6.15 map item[${itemIndex}]路线里程碑顺序或事实漂移。`);
    }
  });
  return authority;
}

function replaceRect(
  primitive: ArenaV2UiRenderPrimitiveV1,
  rect: ArenaV2UiRectV1,
): ArenaV2UiRenderPrimitiveV1 {
  return Object.freeze({ ...primitive, rect });
}

function shiftRect(rect: ArenaV2UiRectV1, deltaY: number): ArenaV2UiRectV1 {
  return Object.freeze({ ...rect, y: rect.y + deltaY });
}

function previewPanel(
  id: string,
  rect: ArenaV2UiRectV1,
  clipRect: ArenaV2UiRectV1,
  kind: 'weapon' | 'map',
  formalVisualCenter = false,
): ArenaV2UiRenderPrimitiveV1 {
  return Object.freeze({
    kind: 'panel' as const,
    id,
    rect,
    clipRect,
    tone: kind === 'weapon' && formalVisualCenter ? 'transparent' as const : 'muted' as const,
    cornerRadiusCssPixels: 12,
    zIndex: 2,
  });
}

function previewSemanticFallbackPrimitives(
  prefix: string,
  rect: ArenaV2UiRectV1,
  clipRect: ArenaV2UiRectV1,
  definitionId: string,
  assetId: string,
  displayName: string,
  kind: 'weapon' | 'map',
): readonly ArenaV2UiRenderPrimitiveV1[] {
  return createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1({
    schemaVersion: 1,
    prefix,
    rect,
    clipRect,
    definitionId,
    assetId,
    displayName,
    kind,
  });
}

function previewBorderPrimitives(
  prefix: string,
  rect: ArenaV2UiRectV1,
  clipRect: ArenaV2UiRectV1,
  selected: boolean,
): readonly ArenaV2UiRenderPrimitiveV1[] {
  const thickness = 2;
  const tone = selected ? 'strong' as const : 'secondary' as const;
  const edges = [
    Object.freeze({ x: rect.x, y: rect.y, width: rect.width, height: thickness }),
    Object.freeze({ x: rect.x, y: rect.y + rect.height - thickness, width: rect.width, height: thickness }),
    Object.freeze({ x: rect.x, y: rect.y + thickness, width: thickness, height: rect.height - thickness * 2 }),
    Object.freeze({ x: rect.x + rect.width - thickness, y: rect.y + thickness, width: thickness, height: rect.height - thickness * 2 }),
  ];
  return Object.freeze(edges.map((edge, index) => Object.freeze({
    kind: 'panel' as const,
    id: `${prefix}:preview-border:${index + 1}`,
    rect: edge,
    clipRect,
    tone,
    cornerRadiusCssPixels: index < 2 ? 2 : 0,
    zIndex: 3,
  })));
}

function previewTitleText(
  id: string,
  rect: ArenaV2UiRectV1,
  clipRect: ArenaV2UiRectV1,
  displayName: string,
  selected: boolean,
): ArenaV2UiRenderPrimitiveV1 {
  const value = `${selected ? '当前目标 · ' : ''}${displayName}`;
  return Object.freeze({
    kind: 'text' as const,
    id,
    rect,
    clipRect,
    text: value,
    accessibilityText: value,
    tone: selected ? 'strong' as const : 'secondary' as const,
    role: 'label' as const,
    alignment: 'center' as const,
    maximumLines: 1,
    fixedWidthNumeric: false,
    zIndex: 3,
  });
}

function mainResearchLinePrimitive(
  prefix: string,
  rect: ArenaV2UiRectV1,
  clipRect: ArenaV2UiRectV1,
  research: ReturnType<typeof requireWeaponCollectionResearch>,
): ArenaV2UiRenderPrimitiveV1 {
  const value = `主研究 ${research.current}/${research.target} · ${research.stage}`;
  return Object.freeze({
    kind: 'text' as const,
    id: `${prefix}:main-research`,
    rect,
    clipRect,
    text: value,
    accessibilityText: research.accessibilityText,
    tone: 'strong' as const,
    role: 'value' as const,
    alignment: 'left' as const,
    maximumLines: 1,
    fixedWidthNumeric: true,
    zIndex: 3,
  });
}

function mainResearchMilestoneLinePrimitive(
  prefix: string,
  rect: ArenaV2UiRectV1,
  clipRect: ArenaV2UiRectV1,
  research: ReturnType<typeof requireWeaponCollectionResearch>,
): ArenaV2UiRenderPrimitiveV1 {
  const value = research.milestones.map(({ threshold, reached }) => (
    `${reached ? '■' : '□'}${threshold}`
  )).join('·');
  const accessibilityText = research.milestones.map(({ threshold, reached }) => (
    `${threshold}${reached ? '已达' : '未达'}`
  )).join('，');
  return Object.freeze({
    kind: 'text' as const,
    id: `${prefix}:main-research-milestones`,
    rect,
    clipRect,
    text: value,
    accessibilityText: `主研究里程碑：${accessibilityText}。`,
    tone: 'secondary' as const,
    role: 'label' as const,
    alignment: 'center' as const,
    maximumLines: 1,
    fixedWidthNumeric: true,
    zIndex: 3,
  });
}

function mapRouteResearchMilestoneLinePrimitive(
  prefix: string,
  rect: ArenaV2UiRectV1,
  clipRect: ArenaV2UiRectV1,
  research: ReturnType<typeof requireMapRouteResearch>,
): ArenaV2UiRenderPrimitiveV1 {
  const ticks = research.milestones.map(({ percentage, reached }) => (
    `${reached ? '■' : '□'}${percentage}`
  )).join('·');
  const accessibilityTicks = research.milestones.map(({ percentage, reached }) => (
    `${percentage}%${reached ? '已达' : '未达'}`
  )).join('，');
  return Object.freeze({
    kind: 'text' as const,
    id: `${prefix}:map-route-research-milestones`,
    rect,
    clipRect,
    text: `路线研究 ${research.evidenceCount}/${research.evidenceTarget} · ${
      research.stage
    } · ${ticks}`,
    accessibilityText: `地图路线研究进度${research.evidenceCount}/${
      research.evidenceTarget
    }，当前阶段${research.stage}；路线研究里程碑：${accessibilityTicks}。`,
    tone: 'secondary' as const,
    role: 'value' as const,
    alignment: 'left' as const,
    maximumLines: 1,
    fixedWidthNumeric: true,
    zIndex: 3,
  });
}

function weaponJourneyPrimitives(
  rect: ArenaV2UiRectV1,
  clipRect: ArenaV2UiRectV1,
  journey: ReturnType<typeof requireWeaponCollectionJourney>,
): readonly ArenaV2UiRenderPrimitiveV1[] {
  return Object.freeze([
    Object.freeze({
      kind: 'panel' as const,
      id: 'collection-journey:weapon:panel',
      rect,
      clipRect,
      tone: 'muted' as const,
      cornerRadiusCssPixels: 12,
      zIndex: 2,
    }),
    Object.freeze({
      kind: 'text' as const,
      id: 'collection-journey:weapon:value',
      rect: Object.freeze({
        x: rect.x + 12,
        y: rect.y + 8,
        width: rect.width - 24,
        height: rect.height - 16,
      }),
      clipRect,
      text: journey.valueText,
      accessibilityText: journey.accessibilityText,
      tone: 'strong' as const,
      role: 'value' as const,
      alignment: 'center' as const,
      maximumLines: 2,
      fixedWidthNumeric: true,
      zIndex: 3,
    }),
  ]);
}

function composeIndexLayout(
  parsed: ParsedInputV1,
  slots: readonly ArenaV2CollectionCurrentScreenPreviewSlotV1[],
): ComposedLayoutV1 {
  const sourcePlan = parsed.sourceRenderPlan;
  const projection = parsed.selectionProjection!;
  const clip = sourcePlan.scrollRegion!.viewport;
  const layout = layoutContractForViewport(parsed.readSnapshot, parsed.viewport);
  const requiredMinimum = layout.indexPreviewMinimumCssPixels;
  const safeInset = layout.previewSafeInsetCssPixels;
  const byId = new Map(sourcePlan.primitives.map((primitive) => [primitive.id, primitive]));
  const cards = projection.items.map((item, index) => {
    const prefix = `selection:${projection.kind}:${item.id}`;
    const panel = byId.get(`${prefix}:panel`);
    const label = byId.get(`${prefix}:label`);
    const description = byId.get(`${prefix}:description`);
    const action = byId.get(`${prefix}:action`);
    if (panel?.kind !== 'panel' || label?.kind !== 'text'
      || description?.kind !== 'text' || action?.kind !== 'action'
      || action.intentId !== `arena.v2.selection.${projection.kind}.${encodeURIComponent(item.id)}`
      || action.label !== item.label
      || !sameRect(panel.rect, action.rect)
      || !sameRect(panel.clipRect!, clip) || !sameRect(label.clipRect!, clip)
      || !sameRect(description.clipRect!, clip) || !sameRect(action.clipRect!, clip)) {
      throw new RangeError(`A6.15 ${prefix}不是既有selection helper生成的完整卡片。`);
    }
    return Object.freeze({ item, slot: slots[index]!, prefix, panel, label, description, action });
  });
  const cardIds = new Set(cards.flatMap(({ prefix }) => [
    `${prefix}:panel`, `${prefix}:label`, `${prefix}:description`, `${prefix}:action`,
  ]));
  const selectionPrimitives = sourcePlan.primitives.filter((primitive) => primitive.id.startsWith('selection:'));
  if (selectionPrimitives.length !== cardIds.size
    || selectionPrimitives.some((primitive) => !cardIds.has(primitive.id))) {
    throw new RangeError('A6.15 sourceRenderPlan含缺失、重复或伪造selection primitive。');
  }
  const oldHeight = cards[0]!.panel.rect.height;
  if (!cards.every(({ panel }) => panel.rect.height === oldHeight)) {
    throw new RangeError('A6.15既有selection卡片高度不一致。');
  }
  const rowYs = [...new Set(cards.map(({ panel }) => panel.rect.y))].sort((a, b) => a - b);
  const researchBlockHeight = projection.kind === 'weapon'
    ? 4 + MAIN_RESEARCH_LINE_HEIGHT + 4 + MAIN_RESEARCH_MILESTONE_LINE_HEIGHT
    : 4 + MAIN_RESEARCH_MILESTONE_LINE_HEIGHT;
  const newCardHeight = safeInset + requiredMinimum + 8 + 22 + 4 + 36
    + researchBlockHeight + safeInset;
  const weaponJourney = projection.kind === 'weapon'
    ? requireWeaponCollectionJourney(
      parsed.readSnapshot.indexPage!.weaponIndex.weaponJourney,
    )
    : null;
  const journeyBlockHeight = weaponJourney === null ? 0 : 56;
  const replacement = new Map<string, ArenaV2UiRenderPrimitiveV1>();
  const storedSlotRects: ArenaV2A6WeaponPreviewRectCssPixelsV1[] = [];
  const sourcePanelRects: ArenaV2UiRectV1[] = [];
  const injectedByPanelId = new Map<string, readonly ArenaV2UiRenderPrimitiveV1[]>();
  cards.forEach(({ item, slot, prefix, panel, label, description, action }, index) => {
    const rowIndex = rowYs.indexOf(panel.rect.y);
    if (rowIndex < 0) throw new Error('A6.15 selection row索引丢失。');
    const cardRect = Object.freeze({
      x: panel.rect.x,
      y: panel.rect.y + journeyBlockHeight + rowIndex * (newCardHeight - oldHeight),
      width: panel.rect.width,
      height: newCardHeight,
    });
    const previewWidth = Math.floor(cardRect.width - safeInset * 2);
    if (previewWidth < requiredMinimum) {
      throw new RangeError('A6.15既有selection卡片宽度无法容纳A6.4预览最小值。');
    }
    const storedPreviewRect = integerRect(
      Math.round(cardRect.x + (cardRect.width - previewWidth) / 2),
      Math.round(cardRect.y + safeInset),
      previewWidth,
      requiredMinimum,
      `A6.15 ${prefix} preview rect`,
    );
    const labelRect = Object.freeze({
      x: cardRect.x + 10,
      y: storedPreviewRect.y + storedPreviewRect.height + 8,
      width: cardRect.width - 20,
      height: 22,
    });
    const descriptionRect = Object.freeze({
      x: cardRect.x + 10,
      y: labelRect.y + labelRect.height + 4,
      width: cardRect.width - 20,
      height: 36,
    });
    replacement.set(panel.id, replaceRect(panel, cardRect));
    replacement.set(label.id, replaceRect(label, labelRect));
    replacement.set(description.id, replaceRect(description, descriptionRect));
    replacement.set(action.id, replaceRect(action, cardRect));
    const previewRect = Object.freeze({ ...storedPreviewRect });
    const formalVisualCenter = slot.kind === 'weapon'
      && slot.formalReady
      && slot.assetUsePermitted;
    const injected: ArenaV2UiRenderPrimitiveV1[] = [
      previewPanel(
        `formal-preview:${slot.kind}:${slot.definitionId}:panel`,
        previewRect,
        clip,
        slot.kind,
        formalVisualCenter,
      ),
    ];
    if (formalVisualCenter) {
      injected.push(...previewBorderPrimitives(
        `formal-preview:${slot.kind}:${slot.definitionId}`,
        previewRect,
        clip,
        item.id === projection.selectedId,
      ));
    } else {
      injected.push(...previewSemanticFallbackPrimitives(
        `formal-preview:${slot.kind}:${slot.definitionId}`,
        previewRect,
        clip,
        slot.definitionId,
        slot.assetId,
        slot.displayName,
        slot.kind,
      ));
    }
    if (slot.kind === 'weapon') {
      const progressItem = parsed.readSnapshot.indexPage!.weaponIndex.items[index]!;
      const research = requireWeaponCollectionResearch(progressItem, index);
      const researchLineRect = Object.freeze({
        x: cardRect.x + 10,
        y: descriptionRect.y + descriptionRect.height + 4,
        width: cardRect.width - 20,
        height: MAIN_RESEARCH_LINE_HEIGHT,
      });
      const milestoneRect = Object.freeze({
        x: cardRect.x + 10,
        y: researchLineRect.y + researchLineRect.height + 4,
        width: cardRect.width - 20,
        height: MAIN_RESEARCH_MILESTONE_LINE_HEIGHT,
      });
      injected.push(mainResearchLinePrimitive(prefix, researchLineRect, clip, research));
      injected.push(mainResearchMilestoneLinePrimitive(prefix, milestoneRect, clip, research));
    } else {
      const progressItem = parsed.readSnapshot.indexPage!.mapIndex.items[index]!;
      const research = requireMapRouteResearch(progressItem, index);
      const milestoneRect = Object.freeze({
        x: cardRect.x + 10,
        y: descriptionRect.y + descriptionRect.height + 4,
        width: cardRect.width - 20,
        height: MAIN_RESEARCH_MILESTONE_LINE_HEIGHT,
      });
      injected.push(mapRouteResearchMilestoneLinePrimitive(
        prefix,
        milestoneRect,
        clip,
        research,
      ));
    }
    injectedByPanelId.set(panel.id, Object.freeze(injected));
    storedSlotRects.push(storedPreviewRect);
    sourcePanelRects.push(panel.rect);
  });
  const firstPanel = cards[0]?.panel;
  const journeyPrimitives = weaponJourney === null || firstPanel === undefined
    ? Object.freeze([])
    : weaponJourneyPrimitives(
      Object.freeze({
        x: clip.x,
        y: firstPanel.rect.y,
        width: clip.width,
        height: journeyBlockHeight - 8,
      }),
      clip,
      weaponJourney,
    );
  const primitives: ArenaV2UiRenderPrimitiveV1[] = [];
  let journeyInserted = false;
  for (const primitive of sourcePlan.primitives) {
    if (!journeyInserted && primitive.id === firstPanel?.id) {
      primitives.push(...journeyPrimitives);
      journeyInserted = true;
    }
    const next = replacement.get(primitive.id) ?? primitive;
    primitives.push(next);
    const injected = injectedByPanelId.get(primitive.id);
    if (injected !== undefined) primitives.push(...injected);
  }
  if (journeyPrimitives.length > 0 && !journeyInserted) {
    throw new RangeError('A6.15武器收藏旅程未能绑定到首张选择卡。');
  }
  const oldEnd = Math.max(...cards.map(({ panel }) => panel.rect.y + panel.rect.height));
  const newEnd = Math.max(...cards.map(({ panel }) => {
    const next = replacement.get(panel.id)!;
    return next.rect.y + next.rect.height;
  }));
  const expectedOldEnd = clip.y + sourcePlan.scrollRegion!.contentHeight;
  if (Math.abs(oldEnd - expectedOldEnd) > 0.000001) {
    throw new RangeError('A6.15 selection卡片不是source scroll content末段，拒绝重排。');
  }
  const contentHeight = sourcePlan.scrollRegion!.contentHeight + (newEnd - oldEnd);
  if (!Number.isSafeInteger(contentHeight) || contentHeight > MAX_SCROLL_CONTENT_HEIGHT) {
    throw new RangeError('A6.15 index重排后的contentHeight无界或非整数。');
  }
  return Object.freeze({
    renderPlan: Object.freeze({
      ...sourcePlan,
      identity: `${sourcePlan.identity}:a6.15-preview-aware:${parsed.viewport.viewportId}`,
      primitives: Object.freeze(primitives),
      scrollRegion: Object.freeze({
        viewport: clip,
        contentHeight,
        verticalScrollRequired: contentHeight > clip.height,
      }),
    }),
    storedSlotRects: Object.freeze(storedSlotRects),
    sourcePanelRects: Object.freeze(sourcePanelRects),
    sourceSelectionCardsReused: slots.length,
    insertedDetailPanelCount: 0,
    shiftedContentPrimitiveCount: cards.length * 4,
  });
}

function composeDetailLayout(
  parsed: ParsedInputV1,
  slots: readonly ArenaV2CollectionCurrentScreenPreviewSlotV1[],
): ComposedLayoutV1 {
  const sourcePlan = parsed.sourceRenderPlan;
  const clip = sourcePlan.scrollRegion!.viewport;
  const layout = layoutContractForViewport(parsed.readSnapshot, parsed.viewport);
  const slot = slots[0]!;
  const requiredMinimum = layout.detailPreviewMinimumCssPixels;
  const previewSize = parsed.viewport.viewportId === '390x844' ? 200 : 260;
  const safeInset = layout.previewSafeInsetCssPixels;
  if (previewSize < requiredMinimum) throw new RangeError('A6.15 detail预览小于A6.4最小值。');
  const question = sourcePlan.primitives.find((primitive) => primitive.id === 'page-question');
  if (question?.kind !== 'text' || question.role !== 'question'
    || question.clipRect === null || !sameRect(question.clipRect, clip)) {
    throw new RangeError('A6.15详情RenderPlan缺少权威page-question。');
  }
  const laterClipped = sourcePlan.primitives.filter((primitive) => (
    primitive.id !== question.id
    && primitive.clipRect !== null
    && sameRect(primitive.clipRect, clip)
    && primitive.rect.y >= question.rect.y + question.rect.height
  ));
  const insertionY = laterClipped.length === 0
    ? Math.ceil(question.rect.y + question.rect.height + (parsed.viewport.viewportId === '390x844' ? 12 : 16))
    : Math.min(...laterClipped.map((primitive) => primitive.rect.y));
  const labelHeight = 24;
  const labelGap = 8;
  const detail = parsed.readSnapshot.detailPage!;
  const nextMilestoneText = slot.kind === 'weapon'
    ? detail.summary?.nextMainResearchMilestoneText ?? null
    : detail.summary?.nextMapRouteResearchMilestoneText ?? null;
  const nextMilestoneAccessibilityText = slot.kind === 'weapon'
    ? detail.summary?.nextMainResearchMilestoneAccessibilityText ?? null
    : detail.summary?.nextMapRouteResearchMilestoneAccessibilityText ?? null;
  const milestoneLineHeight = nextMilestoneText === null ? 0 : 22;
  const milestoneLineGap = nextMilestoneText === null ? 0 : 4;
  const minimumPanelWidth = previewSize + safeInset * 2;
  const milestonePanelWidth = parsed.viewport.viewportId === '390x844' ? clip.width : 520;
  const panelWidth = nextMilestoneText === null
    ? minimumPanelWidth
    : Math.min(clip.width, Math.max(minimumPanelWidth, milestonePanelWidth));
  const panelHeight = safeInset + labelHeight + milestoneLineGap + milestoneLineHeight
    + labelGap + previewSize + safeInset;
  if (panelWidth > clip.width) throw new RangeError('A6.15详情preview panel超出content viewport宽度。');
  const panelRect = integerRect(
    Math.round(clip.x + (clip.width - panelWidth) / 2),
    insertionY,
    panelWidth,
    panelHeight,
    'A6.15 detail panel',
  );
  const storedPreviewRect = integerRect(
    Math.round(panelRect.x + (panelRect.width - previewSize) / 2),
    panelRect.y + safeInset + labelHeight + milestoneLineGap + milestoneLineHeight + labelGap,
    previewSize,
    previewSize,
    'A6.15 detail preview',
  );
  const gapAfter = parsed.viewport.viewportId === '390x844' ? 12 : 16;
  const shiftDelta = panelHeight + gapAfter;
  const injected: ArenaV2UiRenderPrimitiveV1[] = [
    previewPanel(
      `formal-preview:${slot.kind}:${slot.definitionId}:panel`,
      panelRect,
      clip,
      slot.kind,
    ),
    previewTitleText(
      `formal-preview:${slot.kind}:${slot.definitionId}:title`,
      Object.freeze({
        x: panelRect.x + safeInset,
        y: panelRect.y + safeInset,
        width: panelRect.width - safeInset * 2,
        height: labelHeight,
      }),
      clip,
      slot.displayName,
      parsed.readSnapshot.detailPage!.summary?.isCurrentUniqueGoal ?? false,
    ),
  ];
  if (nextMilestoneText !== null && nextMilestoneAccessibilityText !== null) {
    injected.push(Object.freeze({
      kind: 'text' as const,
      id: `formal-preview:${slot.kind}:${slot.definitionId}:${
        slot.kind === 'weapon'
          ? 'next-main-research-milestone'
          : 'next-map-route-research-milestone'
      }`,
      rect: Object.freeze({
        x: panelRect.x + safeInset,
        y: panelRect.y + safeInset + labelHeight + milestoneLineGap,
        width: panelRect.width - safeInset * 2,
        height: milestoneLineHeight,
      }),
      clipRect: clip,
      text: nextMilestoneText,
      accessibilityText: nextMilestoneAccessibilityText,
      tone: 'secondary' as const,
      role: 'value' as const,
      alignment: 'center' as const,
      maximumLines: 1,
      fixedWidthNumeric: true,
      zIndex: 3,
    }));
  }
  if (!slot.formalReady || !slot.assetUsePermitted || slot.kind === 'map') {
    injected.push(...previewSemanticFallbackPrimitives(
      `formal-preview:${slot.kind}:${slot.definitionId}`,
      storedPreviewRect,
      clip,
      slot.definitionId,
      slot.assetId,
      slot.displayName,
      slot.kind,
    ));
  } else {
    injected.push(previewPanel(
      `formal-preview:${slot.kind}:${slot.definitionId}:transparent-center`,
      storedPreviewRect,
      clip,
      'weapon',
      true,
    ));
    injected.push(...previewBorderPrimitives(
      `formal-preview:${slot.kind}:${slot.definitionId}`,
      storedPreviewRect,
      clip,
      parsed.readSnapshot.detailPage!.summary?.isCurrentUniqueGoal ?? false,
    ));
  }
  let inserted = false;
  let shifted = 0;
  const primitives: ArenaV2UiRenderPrimitiveV1[] = [];
  for (const primitive of sourcePlan.primitives) {
    const clipped = primitive.clipRect !== null && sameRect(primitive.clipRect, clip);
    const afterInsertion = clipped && primitive.id !== question.id && primitive.rect.y >= insertionY;
    if (!inserted && afterInsertion) {
      primitives.push(...injected);
      inserted = true;
    }
    if (clipped && primitive.id !== question.id
      && primitive.rect.y < insertionY
      && primitive.rect.y + primitive.rect.height > insertionY) {
      throw new RangeError('A6.15详情内容primitive跨越插入边界。');
    }
    if (afterInsertion) {
      primitives.push(replaceRect(primitive, shiftRect(primitive.rect, shiftDelta)));
      shifted += 1;
    } else {
      primitives.push(primitive);
    }
  }
  if (!inserted) primitives.push(...injected);
  const contentHeight = sourcePlan.scrollRegion!.contentHeight + shiftDelta;
  if (!Number.isSafeInteger(contentHeight) || contentHeight > MAX_SCROLL_CONTENT_HEIGHT) {
    throw new RangeError('A6.15 detail重排后的contentHeight无界或非整数。');
  }
  return Object.freeze({
    renderPlan: Object.freeze({
      ...sourcePlan,
      identity: `${sourcePlan.identity}:a6.15-preview-aware:${parsed.viewport.viewportId}`,
      primitives: Object.freeze(primitives),
      scrollRegion: Object.freeze({
        viewport: clip,
        contentHeight,
        verticalScrollRequired: contentHeight > clip.height,
      }),
    }),
    storedSlotRects: Object.freeze([storedPreviewRect]),
    sourcePanelRects: Object.freeze([panelRect]),
    sourceSelectionCardsReused: 0,
    insertedDetailPanelCount: 1,
    shiftedContentPrimitiveCount: shifted,
  });
}

function countActions(plan: ArenaV2UiRenderPlanV1): number {
  return plan.primitives.filter((primitive) => primitive.kind === 'action').length;
}

function buildResult(parsed: ParsedInputV1): ArenaV2CollectionPreviewRenderPlanLayoutBridgeResultV1 {
  const slots = validateReadSnapshotAndSlots(parsed);
  const baseComposed = parsed.readSnapshot.screenId.endsWith('-index')
    ? composeIndexLayout(parsed, slots)
    : composeDetailLayout(parsed, slots);
  const weaponGrammarRenderPlan =
    addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      baseComposed.renderPlan,
      parsed.sourceRenderPlan,
      parsed.readSnapshot.screenId === 'weapon-detail'
        ? Object.freeze({
          schemaVersion: 1 as const,
          weaponDefinitionId: slots[0]!.definitionId,
          displayName: slots[0]!.displayName,
          previewRect: baseComposed.storedSlotRects[0]!,
          fallbackExpected: !slots[0]!.formalReady || !slots[0]!.assetUsePermitted,
          currentUniqueGoal:
            parsed.readSnapshot.detailPage!.summary?.isCurrentUniqueGoal ?? false,
        })
        : null,
    );
  const routeIdentityRenderPlan =
    addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      weaponGrammarRenderPlan,
      parsed.sourceRenderPlan.identity,
      parsed.readSnapshot.screenId === 'map-detail' ? parsed.sourceRenderPlan : null,
      parsed.readSnapshot.screenId === 'map-detail'
        ? Object.freeze({
          schemaVersion: 1 as const,
          mapDefinitionId: slots[0]!.definitionId,
          displayName: slots[0]!.displayName,
          previewRect: baseComposed.storedSlotRects[0]!,
          currentUniqueGoal:
            parsed.readSnapshot.detailPage!.summary?.isCurrentUniqueGoal ?? false,
        })
        : null,
    );
  const composed = routeIdentityRenderPlan === baseComposed.renderPlan
    ? baseComposed
    : Object.freeze({ ...baseComposed, renderPlan: routeIdentityRenderPlan });
  if (composed.renderPlan.primitives.length > MAX_PRIMITIVES) {
    throw new RangeError('A6.15组合后的RenderPlan primitives超过有界上限。');
  }
  const outputRenderPlan = parseRenderPlan(
    composed.renderPlan,
    'A6.15 composed preview-aware RenderPlan',
  );
  const clip = requireIntegerClip(outputRenderPlan.scrollRegion!.viewport, parsed.viewport);
  const maximumScrollOffsetCssPixels = outputRenderPlan.scrollRegion!.contentHeight - clip.height;
  const boundedMaximum = Math.max(0, maximumScrollOffsetCssPixels);
  if (!Number.isSafeInteger(boundedMaximum)
    || parsed.scrollOffsetCssPixels > boundedMaximum) {
    throw new RangeError('A6.15 scrollOffset必须位于0到最终contentHeight最大滚动值。');
  }
  const slotLayouts = Object.freeze(slots.map((slot, index) => {
    const stored = composed.storedSlotRects[index]!;
    const projected = integerRect(
      stored.x,
      stored.y - parsed.scrollOffsetCssPixels,
      stored.width,
      stored.height,
      `A6.15 projected slot[${index}]`,
    );
    return Object.freeze({
      kind: slot.kind,
      definitionId: slot.definitionId,
      assetId: slot.assetId,
      ordinal: slot.ordinal,
      previewRectCssPixels: projected,
    });
  }));
  const sourceActionCount = countActions(parsed.sourceRenderPlan);
  const outputActionCount = countActions(outputRenderPlan);
  if (sourceActionCount !== outputActionCount) {
    throw new Error('A6.15不得新增、删除或替换既有主动作/selection action。');
  }
  const diagnostics = Object.freeze(slots.map((slot, index) => {
    const selected = parsed.selectionProjection?.selectedId === slot.definitionId
      || parsed.readSnapshot.detailPage?.targetDefinitionId === slot.definitionId;
    const previewUiMode = slot.kind === 'map'
      ? 'text-shape-pattern-map-fallback' as const
      : slot.formalReady && slot.assetUsePermitted
        ? 'transparent-formal-weapon-center' as const
        : 'text-shape-pattern-weapon-fallback' as const;
    return Object.freeze({
      schemaVersion: 1 as const,
      screenId: parsed.readSnapshot.screenId,
      definitionId: slot.definitionId,
      assetId: slot.assetId,
      ordinal: slot.ordinal,
      sourcePanelRectCssPixels: composed.sourcePanelRects[index]!,
      storedPreviewRectCssPixels: composed.storedSlotRects[index]!,
      projectedPreviewRectCssPixels: slotLayouts[index]!.previewRectCssPixels,
      previewUiMode,
      requestPermittedByUpstreamSlot: slot.lifecycle.requestPermitted,
      selectedInSourceProjection: selected,
    });
  }));
  return Object.freeze({
    schemaVersion: 1,
    status: 'production-unreachable',
    implementationStatus: 'code-written-not-run',
    validationStatus: 'not-run',
    hardGate: false,
    defaultSurfaceWired: false,
    epochId: parsed.epochId,
    tick: parsed.tick,
    screenId: parsed.readSnapshot.screenId,
    viewport: parsed.viewport,
    scrollOffsetCssPixels: parsed.scrollOffsetCssPixels,
    maximumScrollOffsetCssPixels: boundedMaximum,
    sourceRenderPlanIdentity: parsed.sourceRenderPlan.identity,
    sourceRenderPlanRevision: parsed.sourceRenderPlan.revision,
    previewAwareRenderPlan: outputRenderPlan,
    a6_12cLayoutInput: Object.freeze({
      contentClipRectCssPixels: clip,
      slotLayouts,
    }),
    diagnostics: Object.freeze({
      sourceSelectionCardsReused: composed.sourceSelectionCardsReused,
      insertedDetailPanelCount: composed.insertedDetailPanelCount,
      shiftedContentPrimitiveCount: composed.shiftedContentPrimitiveCount,
      formalWeaponTransparentPreviewCount: diagnostics.filter(
        ({ previewUiMode }) => previewUiMode === 'transparent-formal-weapon-center',
      ).length,
      staticFallbackPreviewCount: diagnostics.filter(
        ({ previewUiMode }) => previewUiMode !== 'transparent-formal-weapon-center',
      ).length,
      sourceActionCount,
      outputActionCount,
      addsAction: false,
      storedRenderPlanCoordinatesRemainUnscrolled: true,
      slotLayoutsUseProjectedCssCoordinates: true,
      slots: diagnostics,
    }),
  });
}

export class ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1 {
  #state: ArenaV2CollectionPreviewRenderPlanLayoutBridgeStateV1 = 'active';
  #epochId: string;
  #lastTick = -1;
  #lastScreenId: ArenaV2CollectionFourScreenIdV1 | null = null;
  #lastInputCanonical: string | null = null;
  #lastResult: ArenaV2CollectionPreviewRenderPlanLayoutBridgeResultV1 | null = null;
  #sourcePlans = new Map<string, SourcePlanIdentityRecordV1>();

  constructor(value: unknown) {
    const source = exactRecord(
      cloneFrozenData(value, 'A6.15 constructor'),
      CONSTRUCTOR_KEYS,
      'A6.15 constructor',
    );
    if (source.schemaVersion !== 1) throw new RangeError('A6.15 constructor只接受schema 1。');
    this.#epochId = text(source.epochId, 'A6.15 constructor.epochId', 300);
  }

  compose(value: unknown): ArenaV2CollectionPreviewRenderPlanLayoutBridgeResultV1 {
    if (this.#state !== 'active') throw new Error('A6.15 destroyed后不能继续compose。');
    const parsed = parseInput(value);
    if (parsed.epochId !== this.#epochId) throw new RangeError('A6.15 compose epoch漂移。');
    if (parsed.tick < this.#lastTick) throw new RangeError('A6.15 compose tick回退。');
    if (parsed.tick === this.#lastTick && this.#lastInputCanonical !== null) {
      if (parsed.inputCanonical !== this.#lastInputCanonical || this.#lastResult === null) {
        throw new RangeError('A6.15同tick输入冲突。');
      }
      return this.#lastResult;
    }
    const previousIdentity = this.#sourcePlans.get(parsed.sourceRenderPlan.identity);
    const previousPlan = previousIdentity?.[parsed.viewport.viewportId] ?? null;
    const latestIdentityRevision = Math.max(
      previousIdentity?.['390x844']?.revision ?? -1,
      previousIdentity?.['1440x900']?.revision ?? -1,
    );
    if (parsed.sourceRenderPlan.revision < latestIdentityRevision) {
      throw new RangeError('A6.15同RenderPlan identity的revision跨视口回退。');
    }
    if (previousPlan !== null) {
      if (parsed.sourceRenderPlan.revision === previousPlan.revision
        && parsed.sourcePlanCanonical !== previousPlan.canonical) {
        throw new RangeError('A6.15同RenderPlan identity/revision内容漂移。');
      }
    }
    const result = buildResult(parsed);
    const nextSourcePlans = new Map(this.#sourcePlans);
    const nextViewportRecord = Object.freeze({
      revision: parsed.sourceRenderPlan.revision,
      canonical: parsed.sourcePlanCanonical,
    });
    const nextIdentityRecord: SourcePlanIdentityRecordV1 = parsed.viewport.viewportId === '390x844'
      ? Object.freeze({
        '390x844': nextViewportRecord,
        '1440x900': previousIdentity?.['1440x900'] ?? null,
      })
      : Object.freeze({
        '390x844': previousIdentity?.['390x844'] ?? null,
        '1440x900': nextViewportRecord,
      });
    nextSourcePlans.set(parsed.sourceRenderPlan.identity, nextIdentityRecord);
    if (nextSourcePlans.size > 4) {
      throw new RangeError('A6.15固定四页RenderPlan identity上限被突破。');
    }
    this.#lastTick = parsed.tick;
    this.#lastScreenId = parsed.readSnapshot.screenId;
    this.#lastInputCanonical = parsed.inputCanonical;
    this.#lastResult = result;
    this.#sourcePlans = nextSourcePlans;
    return result;
  }

  getSnapshot(): ArenaV2CollectionPreviewRenderPlanLayoutBridgeSnapshotV1 {
    return Object.freeze({
      schemaVersion: 1,
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      defaultSurfaceWired: false,
      state: this.#state,
      epochId: this.#epochId,
      lastTick: this.#lastTick,
      lastScreenId: this.#lastScreenId,
      sourceRenderPlanIdentityCount: this.#sourcePlans.size,
      hasCommittedResult: this.#lastResult !== null,
      createsThreeResources: false,
      loadsAssetBytes: false,
    });
  }

  destroy(): void {
    if (this.#state === 'destroyed') return;
    this.#state = 'destroyed';
    this.#sourcePlans.clear();
    this.#lastInputCanonical = null;
    this.#lastResult = null;
    this.#lastScreenId = null;
  }
}

export const ARENA_V2_COLLECTION_PREVIEW_RENDER_PLAN_LAYOUT_BRIDGE_REFERENCES_V1 =
  Object.freeze([
    Object.freeze({ skill: 'game-art-director', read: true as const }),
    Object.freeze({ skill: 'threejs-game-ui-designer', read: true as const }),
    Object.freeze({ skill: 'media-asset-management', read: true as const }),
    Object.freeze({ path: 'docs/architecture/arena-art-bible.md', read: true as const }),
    Object.freeze({ path: 'docs/architecture/arena-art-development-alignment-matrix.md', read: true as const }),
    Object.freeze({ path: 'docs/architecture/arena-v2-production-development-plan.md', read: true as const }),
    Object.freeze({ path: 'packages/arena-product-presentation/src/arena-v2-information-selection-render-plan-candidate-v1.ts', read: true as const }),
    Object.freeze({ path: 'packages/arena-product-presentation/src/arena-v2-information-screen-layout-v1.ts', read: true as const }),
    Object.freeze({ path: 'packages/arena-product-progression/src/arena-v2-weapon-collection-research-milestone-projection-v1.ts', read: true as const }),
    Object.freeze({ path: 'packages/arena-product-presentation-three/src/arena-v2-collection-four-screen-read-owner-candidate-v1.ts', read: true as const }),
    Object.freeze({ path: 'packages/arena-product-presentation-three/src/arena-v2-collection-visible-layout-observation-owner-candidate-v1.ts', read: true as const }),
  ] as const);
