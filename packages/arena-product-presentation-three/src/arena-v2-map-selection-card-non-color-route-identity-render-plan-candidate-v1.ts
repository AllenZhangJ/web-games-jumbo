import {
  ARENA_V2_COLLECTION_FALLBACK_SEMANTIC_SOURCE_CANDIDATE_V1,
  type ArenaV2CollectionFallbackMapSemanticSourceCandidateV1,
  type ArenaV2UiRectV1,
  type ArenaV2UiRenderPlanV1,
  type ArenaV2UiRenderPrimitiveV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1,
  createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1,
} from './arena-v2-collection-semantic-fallback-visual-profile-candidate-v1.js';

type PanelPrimitive = Extract<ArenaV2UiRenderPrimitiveV1, { readonly kind: 'panel' }>;
type TextPrimitive = Extract<ArenaV2UiRenderPrimitiveV1, { readonly kind: 'text' }>;
type ActionPrimitive = Extract<ArenaV2UiRenderPrimitiveV1, { readonly kind: 'action' }>;

interface FractionRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface RouteGeometrySpec {
  readonly semantic: 'forward-fault-crossing-landing' | 'switchback-stair-route';
  readonly expectedSegmentCount: 8 | 12;
  readonly expectedPacingArc:
    | 'two-cycle-branch-escalation'
    | 'cardinal-switchback-sawtooth';
  readonly primary: FractionRect;
  readonly secondary: FractionRect;
  readonly tertiary: FractionRect;
  readonly radii: readonly [number, number, number];
}

interface MapCardGroup {
  readonly semanticSource: ArenaV2CollectionFallbackMapSemanticSourceCandidateV1;
  readonly panel: PanelPrimitive;
  readonly label: TextPrimitive;
  readonly description: TextPrimitive;
  readonly action: ActionPrimitive;
}

export interface ArenaV2MapRouteIdentityDetailTargetCandidateV1 {
  readonly schemaVersion: 1;
  readonly mapDefinitionId: string;
  readonly displayName: string;
  readonly previewRect: ArenaV2UiRectV1;
  readonly currentUniqueGoal: boolean;
}

const MAP_SELECTION_PLAN_IDENTITY = 'map-index:selection-map';
const MAP_DETAIL_PLAN_IDENTITY = 'map-detail';
const MAP_PREFIX = 'selection:map:';
const CORE_SUFFIXES = Object.freeze(['panel', 'label', 'description', 'action'] as const);
const ROUTE_ROLES = Object.freeze(['primary', 'secondary', 'tertiary'] as const);
const ADDED_PRIMITIVES_PER_CARD = 3;
const ADDED_PRIMITIVE_COUNT = 6;
const MAXIMUM_OUTPUT_PRIMITIVE_COUNT = 128;
const DETAIL_SLOT_CSS_PIXELS = Object.freeze([200, 260] as const);

const ROUTE_GEOMETRY_SPECS = Object.freeze({
  1: Object.freeze({
    semantic: 'forward-fault-crossing-landing',
    expectedSegmentCount: 12,
    expectedPacingArc: 'two-cycle-branch-escalation',
    primary: Object.freeze({ x: 0.04, y: 0.62, width: 0.32, height: 0.14 }),
    secondary: Object.freeze({ x: 0.45, y: 0.34, width: 0.15, height: 0.12 }),
    tertiary: Object.freeze({ x: 0.7, y: 0.56, width: 0.26, height: 0.2 }),
    radii: Object.freeze([1, 5, 2] as const),
  }),
  2: Object.freeze({
    semantic: 'switchback-stair-route',
    expectedSegmentCount: 8,
    expectedPacingArc: 'cardinal-switchback-sawtooth',
    primary: Object.freeze({ x: 0.08, y: 0.14, width: 0.46, height: 0.12 }),
    secondary: Object.freeze({ x: 0.46, y: 0.44, width: 0.44, height: 0.12 }),
    tertiary: Object.freeze({ x: 0.08, y: 0.74, width: 0.46, height: 0.12 }),
    radii: Object.freeze([1, 1, 1] as const),
  }),
} as const satisfies Readonly<Record<1 | 2, RouteGeometrySpec>>);

function rect(x: number, y: number, width: number, height: number): ArenaV2UiRectV1 {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new RangeError('Arena V2地图卡路线身份矩形必须有限且为正尺寸。');
  }
  return Object.freeze({ x, y, width, height });
}

function sameRect(left: ArenaV2UiRectV1, right: ArenaV2UiRectV1): boolean {
  return left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height;
}

function containsRect(container: ArenaV2UiRectV1, child: ArenaV2UiRectV1): boolean {
  return child.x >= container.x
    && child.y >= container.y
    && child.x + child.width <= container.x + container.width
    && child.y + child.height <= container.y + container.height;
}

function fractionRect(container: ArenaV2UiRectV1, value: FractionRect): ArenaV2UiRectV1 {
  const x = Math.round(container.x + container.width * value.x);
  const y = Math.round(container.y + container.height * value.y);
  const right = Math.round(container.x + container.width * (value.x + value.width));
  const bottom = Math.round(container.y + container.height * (value.y + value.height));
  return rect(x, y, Math.max(2, right - x), Math.max(2, bottom - y));
}

function routePanelGeometry(
  source: ArenaV2CollectionFallbackMapSemanticSourceCandidateV1,
  container: ArenaV2UiRectV1,
): readonly Readonly<{
  readonly role: 'primary' | 'secondary' | 'tertiary';
  readonly rect: ArenaV2UiRectV1;
  readonly cornerRadiusCssPixels: number;
}>[] {
  const spec = specFor(source);
  const fractions = [spec.primary, spec.secondary, spec.tertiary] as const;
  return Object.freeze(ROUTE_ROLES.map((role, index) => Object.freeze({
    role,
    rect: fractionRect(container, fractions[index]!),
    cornerRadiusCssPixels: spec.radii[index]!,
  })));
}

function routeGeometrySignature(
  container: ArenaV2UiRectV1,
  geometry: ReturnType<typeof routePanelGeometry>,
): string {
  return geometry.map(({ role, rect: panelRect, cornerRadiusCssPixels }) => `${role}:${[
    panelRect.x - container.x,
    panelRect.y - container.y,
    panelRect.width,
    panelRect.height,
    cornerRadiusCssPixels,
  ].join(',')}`).join('|');
}

export function createArenaV2MapRouteIdentityGeometrySignatureCandidateV1(
  mapDefinitionId: string,
  container: ArenaV2UiRectV1,
): string {
  const source = expectedMapSources().find((candidate) => (
    candidate.mapDefinitionId === mapDefinitionId
  ));
  if (source === undefined) throw new RangeError('Arena V2地图路线signature含未知地图。');
  return routeGeometrySignature(container, routePanelGeometry(source, container));
}

function expectedMapSources(): readonly ArenaV2CollectionFallbackMapSemanticSourceCandidateV1[] {
  const maps = ARENA_V2_COLLECTION_FALLBACK_SEMANTIC_SOURCE_CANDIDATE_V1.maps;
  if (maps.length !== 2
    || maps[0]?.collectionOrder !== 1
    || maps[1]?.collectionOrder !== 2
    || maps[0].segmentCount !== 12
    || maps[1].segmentCount !== 8
    || maps.reduce((total, map) => total + map.segmentCount, 0) !== 20) {
    throw new RangeError('Arena V2地图卡路线身份必须闭合现有两图12+8段语义来源。');
  }
  return maps;
}

function specFor(
  source: ArenaV2CollectionFallbackMapSemanticSourceCandidateV1,
): RouteGeometrySpec {
  const spec = ROUTE_GEOMETRY_SPECS[source.collectionOrder];
  if (source.segmentCount !== spec.expectedSegmentCount
    || source.pacingArc !== spec.expectedPacingArc
    || source.routeRhythm.length !== source.segmentCount
    || source.landmarkCues.length !== source.segmentCount
    || source.leadingLineCues.length !== source.segmentCount) {
    throw new RangeError(`Arena V2地图${source.mapDefinitionId}路线身份源漂移。`);
  }
  return spec;
}

function exactPrimitive(
  plan: ArenaV2UiRenderPlanV1,
  id: string,
): ArenaV2UiRenderPrimitiveV1 {
  const matches = plan.primitives.filter((primitive) => primitive.id === id);
  if (matches.length !== 1) {
    throw new RangeError(`Arena V2地图选择计划必须精确包含一个${id}。`);
  }
  return matches[0]!;
}

function collectGroups(plan: ArenaV2UiRenderPlanV1): readonly MapCardGroup[] {
  if (plan.schemaVersion !== 1 || plan.surfaceKind !== 'information'
    || plan.status !== 'layout-candidate' || plan.productionReady !== false
    || plan.scrollRegion === null) {
    throw new RangeError('Arena V2地图卡路线身份只接受未晋级Information RenderPlan V1。');
  }
  const sources = expectedMapSources();
  const allowedIds = new Set<string>();
  for (const source of sources) {
    const prefix = `${MAP_PREFIX}${source.mapDefinitionId}`;
    CORE_SUFFIXES.forEach((suffix) => allowedIds.add(`${prefix}:${suffix}`));
    allowedIds.add(`${prefix}:map-route-research-milestones`);
    ROUTE_ROLES.forEach((role) => allowedIds.add(`${prefix}:non-color-route-identity:${role}`));
  }
  const mapPrimitives = plan.primitives.filter(({ id }) => id.startsWith(MAP_PREFIX));
  if (mapPrimitives.some(({ id }) => !allowedIds.has(id))) {
    throw new RangeError('Arena V2地图选择计划含未知、漂移或跨地图selection primitive。');
  }
  if (new Set(mapPrimitives.map(({ id }) => id)).size !== mapPrimitives.length) {
    throw new RangeError('Arena V2地图选择计划含重复selection primitive身份。');
  }
  return Object.freeze(sources.map((semanticSource): MapCardGroup => {
    specFor(semanticSource);
    const prefix = `${MAP_PREFIX}${semanticSource.mapDefinitionId}`;
    const panel = exactPrimitive(plan, `${prefix}:panel`);
    const label = exactPrimitive(plan, `${prefix}:label`);
    const description = exactPrimitive(plan, `${prefix}:description`);
    const action = exactPrimitive(plan, `${prefix}:action`);
    if (panel.kind !== 'panel' || label.kind !== 'text'
      || description.kind !== 'text' || action.kind !== 'action') {
      throw new TypeError(`Arena V2地图${semanticSource.mapDefinitionId}卡片结构不完整。`);
    }
    if (panel.clipRect === null || label.clipRect === null
      || description.clipRect === null || action.clipRect === null
      || !sameRect(panel.clipRect, plan.scrollRegion!.viewport)
      || !sameRect(panel.clipRect, label.clipRect)
      || !sameRect(panel.clipRect, description.clipRect)
      || !sameRect(panel.clipRect, action.clipRect)
      || !sameRect(panel.rect, action.rect)
      || !containsRect(panel.rect, label.rect)
      || !containsRect(panel.rect, description.rect)
      || label.role !== 'label'
      || description.role !== 'value'
      || action.intentId !== `arena.v2.selection.map.${encodeURIComponent(
        semanticSource.mapDefinitionId
      )}`
      || action.minimumTouchTargetCssPixels !== 48) {
      throw new RangeError(`Arena V2地图${semanticSource.mapDefinitionId}选择卡合同漂移。`);
    }
    return Object.freeze({ semanticSource, panel, label, description, action });
  }));
}

function identityRail(group: MapCardGroup): ArenaV2UiRectV1 {
  const top = group.label.rect.y;
  const bottom = group.description.rect.y + group.description.rect.height;
  const height = bottom - top;
  const width = Math.min(64, Math.max(48, Math.floor(group.panel.rect.width * 0.18)));
  if (height < 42) {
    throw new RangeError('Arena V2地图卡文字层没有足够高度容纳路线身份。');
  }
  return rect(group.panel.rect.x + group.panel.rect.width - width - 10, top, width, height);
}

function narrowedTextRect(source: ArenaV2UiRectV1, rail: ArenaV2UiRectV1): ArenaV2UiRectV1 {
  const width = rail.x - 8 - source.x;
  if (width < 96) {
    throw new RangeError('Arena V2地图卡文字区不足以容纳非颜色路线身份。');
  }
  return rect(source.x, source.y, width, source.height);
}

function geometrySignature(
  card: ArenaV2UiRectV1,
  panels: readonly PanelPrimitive[],
): string {
  return panels.map((panel) => [
    panel.rect.x - card.x,
    panel.rect.y - card.y,
    panel.rect.width,
    panel.rect.height,
    panel.cornerRadiusCssPixels,
  ].join(',')).join('|');
}

function routePanels(group: MapCardGroup): Readonly<{
  readonly panels: readonly [PanelPrimitive, PanelPrimitive, PanelPrimitive];
  readonly signature: string;
}> {
  const rail = identityRail(group);
  const tones = ['strong', 'secondary', 'muted'] as const;
  const geometry = routePanelGeometry(group.semanticSource, rail);
  const makePanel = (index: 0 | 1 | 2): PanelPrimitive => Object.freeze({
    kind: 'panel' as const,
    id: `${MAP_PREFIX}${group.semanticSource.mapDefinitionId}:non-color-route-identity:${
      ROUTE_ROLES[index]
    }`,
    rect: geometry[index]!.rect,
    clipRect: group.panel.clipRect,
    tone: tones[index],
    cornerRadiusCssPixels: geometry[index]!.cornerRadiusCssPixels,
    zIndex: 2,
  });
  const panels = Object.freeze([
    makePanel(0),
    makePanel(1),
    makePanel(2),
  ] as const);
  if (panels.some((panel) => !containsRect(group.panel.rect, panel.rect))) {
    throw new RangeError(`Arena V2地图${group.semanticSource.mapDefinitionId}路线图形越出卡片。`);
  }
  return Object.freeze({ panels, signature: geometrySignature(group.panel.rect, panels) });
}

function detailTargetIsExact(target: ArenaV2MapRouteIdentityDetailTargetCandidateV1): boolean {
  const prototype = Object.getPrototypeOf(target);
  const descriptors = Object.getOwnPropertyDescriptors(target);
  const keys = Object.keys(descriptors).sort();
  const rectDescriptors = Object.getOwnPropertyDescriptors(target.previewRect);
  const rectKeys = Object.keys(rectDescriptors).sort();
  return (prototype === Object.prototype || prototype === null)
    && keys.join('|')
      === 'currentUniqueGoal|displayName|mapDefinitionId|previewRect|schemaVersion'
    && keys.every((key) => descriptors[key]?.enumerable === true
      && 'value' in descriptors[key]!
      && descriptors[key]?.get === undefined
      && descriptors[key]?.set === undefined)
    && (Object.getPrototypeOf(target.previewRect) === Object.prototype
      || Object.getPrototypeOf(target.previewRect) === null)
    && rectKeys.join('|') === 'height|width|x|y'
    && rectKeys.every((key) => rectDescriptors[key]?.enumerable === true
      && 'value' in rectDescriptors[key]!
      && rectDescriptors[key]?.get === undefined
      && rectDescriptors[key]?.set === undefined)
    && [
      target.previewRect.x,
      target.previewRect.y,
      target.previewRect.width,
      target.previewRect.height,
    ].every(Number.isSafeInteger)
    && target.previewRect.width > 0 && target.previewRect.height > 0;
}

function isMapDetailIdentity(identity: string): boolean {
  return identity === MAP_DETAIL_PLAN_IDENTITY || identity.startsWith(`${MAP_DETAIL_PLAN_IDENTITY}:`);
}

function validateMapDetailSourceIdentity(identity: string, mapDefinitionId: string): void {
  if (identity === MAP_DETAIL_PLAN_IDENTITY) return;
  const prefix = `${MAP_DETAIL_PLAN_IDENTITY}:browse-map:`;
  if (!identity.startsWith(prefix)) {
    throw new RangeError('Arena V2 map-detail source identity含未知增强后缀。');
  }
  const encoded = identity.slice(prefix.length);
  let decoded: string;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    throw new RangeError('Arena V2 map-detail browse identity编码无效。');
  }
  if (encoded.length === 0 || encodeURIComponent(decoded) !== encoded || decoded !== mapDefinitionId) {
    throw new RangeError('Arena V2 map-detail browse identity与当前地图不闭合。');
  }
}

function samePanel(left: PanelPrimitive, right: PanelPrimitive): boolean {
  return left.id === right.id
    && sameRect(left.rect, right.rect)
    && ((left.clipRect === null && right.clipRect === null)
      || (left.clipRect !== null && right.clipRect !== null
        && sameRect(left.clipRect, right.clipRect)))
    && left.tone === right.tone
    && left.cornerRadiusCssPixels === right.cornerRadiusCssPixels
    && left.zIndex === right.zIndex;
}

function sameTextExceptRect(left: TextPrimitive, right: TextPrimitive): boolean {
  return left.id === right.id
    && ((left.clipRect === null && right.clipRect === null)
      || (left.clipRect !== null && right.clipRect !== null
        && sameRect(left.clipRect, right.clipRect)))
    && left.text === right.text
    && left.accessibilityText === right.accessibilityText
    && left.tone === right.tone
    && left.role === right.role
    && left.alignment === right.alignment
    && left.maximumLines === right.maximumLines
    && left.fixedWidthNumeric === right.fixedWidthNumeric
    && left.zIndex === right.zIndex;
}

function sameActionExceptRect(left: ActionPrimitive, right: ActionPrimitive): boolean {
  return left.id === right.id
    && ((left.clipRect === null && right.clipRect === null)
      || (left.clipRect !== null && right.clipRect !== null
        && sameRect(left.clipRect, right.clipRect)))
    && left.intentId === right.intentId
    && left.label === right.label
    && left.accessibilityText === right.accessibilityText
    && left.enabled === right.enabled
    && left.disabledReason === right.disabledReason
    && left.minimumTouchTargetCssPixels === right.minimumTouchTargetCssPixels
    && left.tone === right.tone
    && left.zIndex === right.zIndex;
}

function enhanceMapDetail(
  plan: ArenaV2UiRenderPlanV1,
  sourcePlan: ArenaV2UiRenderPlanV1,
  target: ArenaV2MapRouteIdentityDetailTargetCandidateV1,
): ArenaV2UiRenderPlanV1 {
  const composedPrefix = `${sourcePlan.identity}:a6.15-preview-aware:`;
  const viewportId = plan.identity.startsWith(composedPrefix)
    ? plan.identity.slice(composedPrefix.length)
    : '';
  const expectedDetailSlotCssPixels = viewportId === '390x844'
    ? 200
    : viewportId === '1440x900'
      ? 260
      : null;
  if (!detailTargetIsExact(target)
    || target.schemaVersion !== 1
    || typeof target.mapDefinitionId !== 'string' || target.mapDefinitionId.length === 0
    || typeof target.displayName !== 'string' || target.displayName.length === 0
    || typeof target.currentUniqueGoal !== 'boolean'
    || expectedDetailSlotCssPixels === null
    || target.previewRect.width !== expectedDetailSlotCssPixels
    || target.previewRect.height !== expectedDetailSlotCssPixels
    || plan.schemaVersion !== 1 || sourcePlan.schemaVersion !== 1
    || plan.surfaceKind !== 'information' || sourcePlan.surfaceKind !== 'information'
    || plan.status !== 'layout-candidate' || sourcePlan.status !== 'layout-candidate'
    || plan.productionReady !== false || sourcePlan.productionReady !== false
    || plan.scrollRegion === null || sourcePlan.scrollRegion === null
    || plan.primitives.length > MAXIMUM_OUTPUT_PRIMITIVE_COUNT) {
    throw new RangeError('Arena V2 map-detail路线身份输入或A6.15 source identity绑定无效。');
  }
  validateMapDetailSourceIdentity(sourcePlan.identity, target.mapDefinitionId);
  if (new Set(plan.primitives.map(({ id }) => id)).size !== plan.primitives.length
    || new Set(sourcePlan.primitives.map(({ id }) => id)).size !== sourcePlan.primitives.length) {
    throw new RangeError('Arena V2 map-detail路线身份含重复primitive。');
  }
  const source = expectedMapSources().find(({ mapDefinitionId }) => (
    mapDefinitionId === target.mapDefinitionId
  ));
  if (source === undefined) throw new RangeError('Arena V2 map-detail含未知地图。');
  if (sourcePlan.primitives.some(({ id }) => id.startsWith('selection:map:'))) {
    throw new RangeError('Arena V2 map-detail不得夹带map-index selection卡。');
  }
  sourcePlan.primitives.forEach((sourcePrimitive) => {
    const output = exactPrimitive(plan, sourcePrimitive.id);
    const preserved = sourcePrimitive.kind === 'panel' && output.kind === 'panel'
      ? sourcePrimitive.id === output.id
        && ((sourcePrimitive.clipRect === null && output.clipRect === null)
          || (sourcePrimitive.clipRect !== null && output.clipRect !== null
            && sameRect(sourcePrimitive.clipRect, output.clipRect)))
        && sourcePrimitive.tone === output.tone
        && sourcePrimitive.cornerRadiusCssPixels === output.cornerRadiusCssPixels
        && sourcePrimitive.zIndex === output.zIndex
      : sourcePrimitive.kind === 'text' && output.kind === 'text'
        ? sameTextExceptRect(sourcePrimitive, output)
        : sourcePrimitive.kind === 'action' && output.kind === 'action'
          ? sameActionExceptRect(sourcePrimitive, output)
          : false;
    if (!preserved) throw new RangeError('Arena V2 map-detail既有文字/action或primitive语义漂移。');
  });
  const prefix = `formal-preview:map:${target.mapDefinitionId}`;
  if (plan.primitives.some(({ id }) => (
    id.startsWith('formal-preview:map:') && !id.startsWith(`${prefix}:`)
  ))) {
    throw new RangeError('Arena V2 map-detail夹带未选中地图preview。');
  }
  const allowedIds = new Set([
    `${prefix}:panel`,
    `${prefix}:title`,
    `${prefix}:next-map-route-research-milestone`,
    `${prefix}:fallback-pattern:1`,
    `${prefix}:fallback-pattern:2`,
    `${prefix}:fallback-pattern:3`,
    `${prefix}:fallback`,
  ]);
  const previewPrimitives = plan.primitives.filter(({ id }) => id.startsWith(`${prefix}:`));
  const milestone = plan.primitives.find(({ id }) => id === `${prefix}:next-map-route-research-milestone`);
  if (previewPrimitives.some(({ id }) => !allowedIds.has(id))
    || previewPrimitives.length !== 6 + (milestone === undefined ? 0 : 1)) {
    throw new RangeError('Arena V2 map-detail必须精确闭合同构3 panel + 1 text fallback。');
  }
  const outer = exactPrimitive(plan, `${prefix}:panel`);
  const title = exactPrimitive(plan, `${prefix}:title`);
  const expectedTitle = `${target.currentUniqueGoal ? '当前目标 · ' : ''}${target.displayName}`;
  const primaryActions = sourcePlan.primitives.filter(({ id }) => id === 'primary-action');
  const primaryAction = primaryActions[0];
  const primaryActionMatches = primaryAction?.kind === 'action'
    && primaryAction.intentId === 'use-selected-map-next-match';
  if (outer.kind !== 'panel' || title.kind !== 'text'
    || (milestone !== undefined && milestone.kind !== 'text')
    || !containsRect(outer.rect, target.previewRect)
    || title.text !== expectedTitle || title.accessibilityText !== expectedTitle
    || title.tone !== (target.currentUniqueGoal ? 'strong' : 'secondary')
    || title.role !== 'label' || title.alignment !== 'center'
    || title.maximumLines !== 1 || title.fixedWidthNumeric !== false
    || title.clipRect === null || !sameRect(title.clipRect, plan.scrollRegion.viewport)
    || !containsRect(outer.rect, title.rect)
    || primaryActions.length !== 1 || !primaryActionMatches) {
    throw new RangeError('Arena V2 map-detail当前身份、标题、主动作或preview rect未闭合。');
  }
  const profile = ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1.profiles.find(
    (candidate) => candidate.kind === 'map' && candidate.definitionId === target.mapDefinitionId,
  );
  if (profile === undefined) throw new RangeError('Arena V2 map-detail缺少A6.18视觉profile。');
  const expectedFallback = createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1({
    schemaVersion: 1,
    prefix,
    rect: target.previewRect,
    clipRect: plan.scrollRegion.viewport,
    kind: 'map',
    definitionId: target.mapDefinitionId,
    assetId: profile.assetId,
    displayName: target.displayName,
  });
  const expectedFallbackText = expectedFallback[3];
  if (expectedFallback.length !== 4 || expectedFallbackText?.kind !== 'text') {
    throw new RangeError('Arena V2 map-detail A6.18 fallback结构漂移。');
  }
  const fallbackText = exactPrimitive(plan, `${prefix}:fallback`);
  if (fallbackText.kind !== 'text'
    || fallbackText.id !== expectedFallbackText.id
    || !sameRect(fallbackText.rect, expectedFallbackText.rect)
    || !sameTextExceptRect(fallbackText, expectedFallbackText)) {
    throw new RangeError('Arena V2 map-detail fallback文字漂移。');
  }
  const originalPanels = Object.freeze(expectedFallback.slice(0, 3).map((primitive) => {
    if (primitive.kind !== 'panel') throw new RangeError('Arena V2 map-detail A6.18形状漂移。');
    return primitive;
  })) as readonly [PanelPrimitive, PanelPrimitive, PanelPrimitive];
  const geometry = routePanelGeometry(source, target.previewRect);
  const enhancedPanels = Object.freeze(originalPanels.map((panel, index) => Object.freeze({
    ...panel,
    rect: geometry[index]!.rect,
    cornerRadiusCssPixels: geometry[index]!.cornerRadiusCssPixels,
  }))) as readonly [PanelPrimitive, PanelPrimitive, PanelPrimitive];
  const actualPanels = Object.freeze([1, 2, 3].map((ordinal) => {
    const primitive = exactPrimitive(plan, `${prefix}:fallback-pattern:${ordinal}`);
    if (primitive.kind !== 'panel') throw new TypeError('Arena V2 map-detail路线形状必须保持panel。');
    return primitive;
  })) as readonly [PanelPrimitive, PanelPrimitive, PanelPrimitive];
  const originalMatches = actualPanels.every((panel, index) => samePanel(panel, originalPanels[index]!));
  const enhancedMatches = actualPanels.every((panel, index) => samePanel(panel, enhancedPanels[index]!));
  if (!originalMatches && !enhancedMatches) {
    throw new RangeError('Arena V2 map-detail路线几何漂移或partial增强。');
  }
  if (enhancedMatches) return plan;
  const replacements = new Map(enhancedPanels.map((panel) => [panel.id, panel]));
  const primitives = Object.freeze(plan.primitives.map((primitive) => replacements.get(primitive.id) ?? primitive));
  if (primitives.length !== plan.primitives.length || primitives.length > MAXIMUM_OUTPUT_PRIMITIVE_COUNT) {
    throw new RangeError('Arena V2 map-detail路线增强不得新增primitive或越界。');
  }
  return Object.freeze({ ...plan, primitives });
}

/**
 * Adds three inert route-shape panels to each existing map-selection card.
 * sourceRenderPlanIdentity keeps A6.15's preview-aware derivative bound to the
 * exact validated map-index selection source without changing its own identity.
 */
export function addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
  plan: ArenaV2UiRenderPlanV1,
  sourceRenderPlanIdentity: string = plan.identity,
  sourceRenderPlan: ArenaV2UiRenderPlanV1 | null = null,
  detailTarget: ArenaV2MapRouteIdentityDetailTargetCandidateV1 | null = null,
): ArenaV2UiRenderPlanV1 {
  if (isMapDetailIdentity(sourceRenderPlanIdentity)) {
    if (sourceRenderPlan === null || detailTarget === null
      || sourceRenderPlan.identity !== sourceRenderPlanIdentity) {
      throw new RangeError('Arena V2 map-detail路线增强缺少同源计划或当前地图目标。');
    }
    return enhanceMapDetail(plan, sourceRenderPlan, detailTarget);
  }
  if (sourceRenderPlan !== null || detailTarget !== null) {
    throw new RangeError('Arena V2非map-detail不得提交详情计划或目标。');
  }
  if (sourceRenderPlanIdentity !== MAP_SELECTION_PLAN_IDENTITY) return plan;
  if (plan.identity !== MAP_SELECTION_PLAN_IDENTITY
    && !plan.identity.startsWith(`${MAP_SELECTION_PLAN_IDENTITY}:a6.15-preview-aware:`)) {
    throw new RangeError('Arena V2地图路线身份不得接入非map-index选择计划。');
  }
  const groups = collectGroups(plan);
  const existingRoutePanels = plan.primitives.filter(({ id }) => (
    id.includes(':non-color-route-identity:')
  ));
  if (existingRoutePanels.length !== 0 && existingRoutePanels.length !== ADDED_PRIMITIVE_COUNT) {
    throw new RangeError('Arena V2地图路线身份不得处于部分提交状态。');
  }
  const generated = groups.map((group) => routePanels(group));
  if (new Set(generated.map(({ signature }) => signature)).size !== 2) {
    throw new RangeError('Arena V2两张地图必须具有两种唯一纯panel路线signature。');
  }
  if (existingRoutePanels.length === ADDED_PRIMITIVE_COUNT) {
    const expected = new Map(generated.flatMap(({ panels }) => panels).map((panel) => [
      panel.id,
      panel,
    ] as const));
    const textGeometryMatches = groups.every((group) => {
      const rail = identityRail(group);
      return sameRect(group.label.rect, narrowedTextRect(group.label.rect, rail))
        && sameRect(group.description.rect, narrowedTextRect(group.description.rect, rail));
    });
    if (plan.primitives.length > MAXIMUM_OUTPUT_PRIMITIVE_COUNT
      || new Set(existingRoutePanels.map(({ id }) => id)).size !== ADDED_PRIMITIVE_COUNT
      || !textGeometryMatches
      || existingRoutePanels.some((panel) => {
      const expectedPanel = expected.get(panel.id);
      return panel.kind !== 'panel' || expectedPanel === undefined
        || !sameRect(panel.rect, expectedPanel.rect)
        || panel.cornerRadiusCssPixels !== expectedPanel.cornerRadiusCssPixels
        || panel.tone !== expectedPanel.tone
        || panel.zIndex !== expectedPanel.zIndex
        || panel.clipRect === null
        || expectedPanel.clipRect === null
        || !sameRect(panel.clipRect, expectedPanel.clipRect);
    })) {
      throw new RangeError('Arena V2地图路线身份已存在但几何事实漂移。');
    }
    return plan;
  }
  if (plan.primitives.length > MAXIMUM_OUTPUT_PRIMITIVE_COUNT - ADDED_PRIMITIVE_COUNT) {
    throw new RangeError('Arena V2地图选择计划没有足够primitive预算容纳路线身份。');
  }
  const textReplacements = new Map<string, TextPrimitive>();
  const panelsByDescription = new Map<string, readonly PanelPrimitive[]>();
  groups.forEach((group, index) => {
    const rail = identityRail(group);
    textReplacements.set(group.label.id, Object.freeze({
      ...group.label,
      rect: narrowedTextRect(group.label.rect, rail),
    }));
    textReplacements.set(group.description.id, Object.freeze({
      ...group.description,
      rect: narrowedTextRect(group.description.rect, rail),
    }));
    panelsByDescription.set(group.description.id, generated[index]!.panels);
  });
  const primitives: ArenaV2UiRenderPrimitiveV1[] = [];
  for (const primitive of plan.primitives) {
    primitives.push(textReplacements.get(primitive.id) ?? primitive);
    const additions = panelsByDescription.get(primitive.id);
    if (additions !== undefined) primitives.push(...additions);
  }
  if (primitives.length !== plan.primitives.length + ADDED_PRIMITIVE_COUNT
    || primitives.length > MAXIMUM_OUTPUT_PRIMITIVE_COUNT) {
    throw new RangeError('Arena V2地图路线身份输出primitive预算漂移。');
  }
  return Object.freeze({
    ...plan,
    primitives: Object.freeze(primitives),
  });
}

export const ARENA_V2_MAP_SELECTION_CARD_NON_COLOR_ROUTE_IDENTITY_RENDER_PLAN_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    id: 'arena-v2.map-selection-card-non-color-route-identity-render-plan.candidate.v1' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    defaultSurfaceWired: false as const,
    sourcePlanIdentity: MAP_SELECTION_PLAN_IDENTITY,
    sourceSemanticCatalogContentHash:
      ARENA_V2_COLLECTION_FALLBACK_SEMANTIC_SOURCE_CANDIDATE_V1.contentHash,
    mapCount: 2 as const,
    mapSegmentCounts: Object.freeze([12, 8] as const),
    routeSemantics: Object.freeze([
      ROUTE_GEOMETRY_SPECS[1].semantic,
      ROUTE_GEOMETRY_SPECS[2].semantic,
    ] as const),
    primitivesPerCard: ADDED_PRIMITIVES_PER_CARD,
    addedPrimitiveCount: ADDED_PRIMITIVE_COUNT,
    maximumOutputPrimitiveCount: MAXIMUM_OUTPUT_PRIMITIVE_COUNT,
    geometrySignatureUsesPanelsOnly: true as const,
    validatesEnhancedReplayAndDrift: true as const,
    colorGlyphOrTextCanSatisfyIdentity: false as const,
    preservesPlanIdentity: true as const,
    mapIndexWired: true as const,
    mapDetailWired: true as const,
    detailAddedPrimitiveCount: 0 as const,
    detailSlotCssPixels: DETAIL_SLOT_CSS_PIXELS,
    detailUsesSharedRouteGeometryCore: true as const,
    detailSourceIdentityAndTargetBound: true as const,
    detailViewportIdentityAndSlotSizeBound: true as const,
    detailSourcePanelIdentityClipToneRadiusAndZIndexPreserved: true as const,
    addsPages: 0 as const,
    addsActions: 0 as const,
    changesActions: false as const,
    changesInputGeometry: false as const,
    changesAvailability: false as const,
    changesAccessibilitySemantics: false as const,
    createsThreeResources: false as const,
    createsDomNodesDirectly: false as const,
    loadsAssets: false as const,
    createsRafOrTimer: false as const,
    hardGatePassed: false as const,
  });
