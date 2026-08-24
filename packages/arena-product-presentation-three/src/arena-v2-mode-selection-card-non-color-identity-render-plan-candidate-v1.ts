import type {
  ArenaV2UiRectV1,
  ArenaV2UiRenderPlanV1,
  ArenaV2UiRenderPrimitiveV1,
} from '@number-strategy-jump/arena-product-presentation';

type ModeKind = 'duel' | 'race' | 'survival';
type PanelPrimitive = Extract<ArenaV2UiRenderPrimitiveV1, { readonly kind: 'panel' }>;
type TextPrimitive = Extract<ArenaV2UiRenderPrimitiveV1, { readonly kind: 'text' }>;
type ActionPrimitive = Extract<ArenaV2UiRenderPrimitiveV1, { readonly kind: 'action' }>;

interface FractionRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface ModeGeometrySpec {
  readonly primary: FractionRect;
  readonly secondary: FractionRect;
  readonly tertiary: FractionRect;
  readonly radii: readonly [number, number, number];
}

interface ModeCardGroup {
  readonly modeKind: ModeKind;
  readonly panel: PanelPrimitive;
  readonly label: TextPrimitive;
  readonly description: TextPrimitive;
  readonly action: ActionPrimitive;
}

const MODE_SELECTION_PLAN_IDENTITY = 'mode-select:selection-mode';
const MODE_SELECTION_ENHANCED_PLAN_IDENTITY =
  `${MODE_SELECTION_PLAN_IDENTITY}:non-color-identity-v1`;
const MODE_PREFIX = 'selection:mode:';
const MODE_KINDS = Object.freeze(['duel', 'race', 'survival'] as const);
const CARD_SUFFIXES = Object.freeze(['panel', 'label', 'description', 'action'] as const);
const IDENTITY_ROLES = Object.freeze(['primary', 'secondary', 'tertiary'] as const);
const IDENTITY_MARKER = ':non-color-identity:';
const ADDED_PRIMITIVES_PER_CARD = 3;
const ADDED_PRIMITIVE_COUNT = 9;
const MAXIMUM_OUTPUT_PRIMITIVE_COUNT = 128;

const MODE_GEOMETRY_SPECS = Object.freeze({
  duel: Object.freeze({
    primary: Object.freeze({ x: 0.06, y: 0.31, width: 0.26, height: 0.38 }),
    secondary: Object.freeze({ x: 0.68, y: 0.31, width: 0.26, height: 0.38 }),
    tertiary: Object.freeze({ x: 0.47, y: 0.18, width: 0.06, height: 0.64 }),
    radii: Object.freeze([7, 7, 1] as const),
  }),
  race: Object.freeze({
    primary: Object.freeze({ x: 0.06, y: 0.7, width: 0.3, height: 0.1 }),
    secondary: Object.freeze({ x: 0.34, y: 0.44, width: 0.36, height: 0.1 }),
    tertiary: Object.freeze({ x: 0.76, y: 0.14, width: 0.12, height: 0.6 }),
    radii: Object.freeze([1, 1, 2] as const),
  }),
  survival: Object.freeze({
    primary: Object.freeze({ x: 0.38, y: 0.31, width: 0.24, height: 0.38 }),
    secondary: Object.freeze({ x: 0.06, y: 0.14, width: 0.16, height: 0.72 }),
    tertiary: Object.freeze({ x: 0.78, y: 0.14, width: 0.16, height: 0.72 }),
    radii: Object.freeze([8, 6, 6] as const),
  }),
} as const satisfies Readonly<Record<ModeKind, ModeGeometrySpec>>);

function rect(x: number, y: number, width: number, height: number): ArenaV2UiRectV1 {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new RangeError('Arena V2模式卡身份矩形必须有限且为正尺寸。');
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

function modePrimitiveIdentity(
  primitiveId: string,
): Readonly<{ readonly modeKind: string; readonly suffix: string }> | null {
  if (!primitiveId.startsWith(MODE_PREFIX)) return null;
  if (primitiveId.includes(IDENTITY_MARKER)) {
    const isExactIdentityPrimitive = MODE_KINDS.some((modeKind) => (
      IDENTITY_ROLES.some((role) => (
        primitiveId === `${MODE_PREFIX}${modeKind}${IDENTITY_MARKER}${role}`
      ))
    ));
    if (isExactIdentityPrimitive) return null;
    throw new RangeError(`Arena V2模式选择计划含未知非颜色身份primitive：${primitiveId}。`);
  }
  for (const suffix of CARD_SUFFIXES) {
    const marker = `:${suffix}`;
    if (primitiveId.endsWith(marker)) {
      return Object.freeze({
        modeKind: primitiveId.slice(MODE_PREFIX.length, -marker.length),
        suffix,
      });
    }
  }
  throw new RangeError(`Arena V2模式选择计划含未知primitive：${primitiveId}。`);
}

function collectGroups(plan: ArenaV2UiRenderPlanV1): readonly ModeCardGroup[] {
  if (plan.schemaVersion !== 1 || plan.surfaceKind !== 'information'
    || plan.status !== 'layout-candidate' || plan.productionReady !== false
    || plan.scrollRegion === null) {
    throw new RangeError('Arena V2模式卡身份增强只接受未晋级Information RenderPlan V1。');
  }
  const groups = new Map<string, Partial<Record<
    typeof CARD_SUFFIXES[number],
    ArenaV2UiRenderPrimitiveV1
  >>>();
  for (const primitive of plan.primitives) {
    const parsed = modePrimitiveIdentity(primitive.id);
    if (parsed === null) continue;
    if (!MODE_KINDS.includes(parsed.modeKind as ModeKind)) {
      throw new RangeError(`Arena V2模式选择计划含未知模式${parsed.modeKind}。`);
    }
    const suffix = parsed.suffix as typeof CARD_SUFFIXES[number];
    const group = groups.get(parsed.modeKind) ?? {};
    if (group[suffix] !== undefined) {
      throw new RangeError(`Arena V2模式${parsed.modeKind}的${suffix}重复。`);
    }
    group[suffix] = primitive;
    groups.set(parsed.modeKind, group);
  }
  if (groups.size !== 3) {
    throw new RangeError('Arena V2模式选择计划必须精确闭合duel/race/survival三张卡。');
  }
  return Object.freeze(MODE_KINDS.map((modeKind): ModeCardGroup => {
    const group = groups.get(modeKind);
    if (group === undefined
      || group.panel?.kind !== 'panel'
      || group.label?.kind !== 'text'
      || group.description?.kind !== 'text'
      || group.action?.kind !== 'action') {
      throw new TypeError(`Arena V2模式${modeKind}卡片结构不完整。`);
    }
    const panel = group.panel;
    const label = group.label;
    const description = group.description;
    const action = group.action;
    const narrow = panel.rect.height === 112;
    if ((!narrow && panel.rect.height !== 96)
      || panel.clipRect === null
      || label.clipRect === null
      || description.clipRect === null
      || action.clipRect === null
      || !sameRect(panel.clipRect, plan.scrollRegion!.viewport)
      || !sameRect(panel.clipRect, label.clipRect)
      || !sameRect(panel.clipRect, description.clipRect)
      || !sameRect(panel.clipRect, action.clipRect)
      || !sameRect(panel.rect, action.rect)
      || !containsRect(panel.rect, label.rect)
      || !containsRect(panel.rect, description.rect)
      || label.role !== 'label'
      || description.role !== 'value'
      || description.maximumLines !== (narrow ? 3 : 2)
      || action.intentId !== `arena.v2.selection.mode.${modeKind}`
      || action.minimumTouchTargetCssPixels !== 48) {
      throw new RangeError(`Arena V2模式${modeKind}卡片合同漂移。`);
    }
    return Object.freeze({ modeKind, panel, label, description, action });
  }));
}

function identityRail(card: ArenaV2UiRectV1): ArenaV2UiRectV1 {
  const width = card.height === 112 ? 52 : 46;
  return rect(card.x + card.width - width - 10, card.y + 10, width, card.height - 20);
}

function narrowedTextRect(source: ArenaV2UiRectV1, rail: ArenaV2UiRectV1): ArenaV2UiRectV1 {
  const width = rail.x - 8 - source.x;
  if (width < 72) {
    throw new RangeError('Arena V2模式卡文字区不足以容纳非颜色身份轨。');
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

function identityPanels(group: ModeCardGroup): Readonly<{
  readonly panels: readonly [PanelPrimitive, PanelPrimitive, PanelPrimitive];
  readonly signature: string;
}> {
  const rail = identityRail(group.panel.rect);
  const spec = MODE_GEOMETRY_SPECS[group.modeKind];
  const fractions = [spec.primary, spec.secondary, spec.tertiary] as const;
  const tones = ['strong', 'secondary', 'muted'] as const;
  const panelAt = (index: 0 | 1 | 2): PanelPrimitive => Object.freeze({
    kind: 'panel',
    id: `${MODE_PREFIX}${group.modeKind}:non-color-identity:${IDENTITY_ROLES[index]}`,
    rect: fractionRect(rail, fractions[index]),
    clipRect: group.panel.clipRect,
    tone: tones[index],
    cornerRadiusCssPixels: spec.radii[index],
    zIndex: 2,
  });
  const panels = Object.freeze([panelAt(0), panelAt(1), panelAt(2)] as const);
  if (panels.some((panel) => !containsRect(group.panel.rect, panel.rect))) {
    throw new RangeError(`Arena V2模式${group.modeKind}身份图形越出卡片。`);
  }
  return Object.freeze({ panels, signature: geometrySignature(group.panel.rect, panels) });
}

/**
 * Adds three static panels to each existing mode-selection card. The panels
 * are descriptive UI only: they add no action, input, authority or resource.
 */
export function addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(
  plan: ArenaV2UiRenderPlanV1,
): ArenaV2UiRenderPlanV1 {
  const alreadyEnhanced = plan.identity === MODE_SELECTION_ENHANCED_PLAN_IDENTITY;
  if (plan.identity !== MODE_SELECTION_PLAN_IDENTITY && !alreadyEnhanced) return plan;
  const groups = collectGroups(plan);
  const generated = new Map(groups.map((group) => [
    group.modeKind,
    identityPanels(group),
  ] as const));
  if (generated.size !== 3
    || new Set([...generated.values()].map(({ signature }) => signature)).size !== 3) {
    throw new RangeError('Arena V2三模式必须具有三种唯一的纯panel几何signature。');
  }
  const existingIdentityPanels = plan.primitives.filter(({ id }) => id.includes(IDENTITY_MARKER));
  if (alreadyEnhanced) {
    const expected = new Map([...generated.values()].flatMap(({ panels }) => panels).map((panel) => [
      panel.id,
      panel,
    ] as const));
    const textGeometryMatches = groups.every((group) => {
      const rail = identityRail(group.panel.rect);
      return sameRect(group.label.rect, narrowedTextRect(group.label.rect, rail))
        && sameRect(group.description.rect, narrowedTextRect(group.description.rect, rail));
    });
    if (plan.primitives.length > MAXIMUM_OUTPUT_PRIMITIVE_COUNT
      || existingIdentityPanels.length !== ADDED_PRIMITIVE_COUNT
      || new Set(existingIdentityPanels.map(({ id }) => id)).size !== ADDED_PRIMITIVE_COUNT
      || !textGeometryMatches
      || existingIdentityPanels.some((panel) => {
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
      throw new RangeError('Arena V2模式卡非颜色身份已存在但完整几何事实漂移。');
    }
    return plan;
  }
  if (existingIdentityPanels.length !== 0) {
    throw new RangeError('Arena V2模式卡非颜色身份不得在源计划中部分或提前提交。');
  }
  if (plan.primitives.length > MAXIMUM_OUTPUT_PRIMITIVE_COUNT - ADDED_PRIMITIVE_COUNT) {
    throw new RangeError('Arena V2模式选择计划没有足够primitive预算容纳模式身份。');
  }
  const replacements = new Map<string, ArenaV2UiRenderPrimitiveV1>();
  for (const group of groups) {
    replacements.set(group.label.id, Object.freeze({
      ...group.label,
      rect: narrowedTextRect(group.label.rect, identityRail(group.panel.rect)),
    }));
    replacements.set(group.description.id, Object.freeze({
      ...group.description,
      rect: narrowedTextRect(group.description.rect, identityRail(group.panel.rect)),
    }));
    const panels = generated.get(group.modeKind)!.panels;
    panels.forEach((panel, index) => {
      replacements.set(`${group.description.id}:after-${index}`, panel);
    });
  }
  const primitives: ArenaV2UiRenderPrimitiveV1[] = [];
  for (const primitive of plan.primitives) {
    primitives.push(replacements.get(primitive.id) ?? primitive);
    for (let index = 0; index < ADDED_PRIMITIVES_PER_CARD; index += 1) {
      const addition = replacements.get(`${primitive.id}:after-${index}`);
      if (addition !== undefined) primitives.push(addition);
    }
  }
  if (primitives.length !== plan.primitives.length + ADDED_PRIMITIVE_COUNT
    || primitives.length > MAXIMUM_OUTPUT_PRIMITIVE_COUNT) {
    throw new RangeError('Arena V2模式选择身份输出primitive预算漂移。');
  }
  return Object.freeze({
    ...plan,
    identity: MODE_SELECTION_ENHANCED_PLAN_IDENTITY,
    primitives: Object.freeze(primitives),
  });
}

export const ARENA_V2_MODE_SELECTION_CARD_NON_COLOR_IDENTITY_RENDER_PLAN_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    id: 'arena-v2.mode-selection-card-non-color-identity-render-plan.candidate.v1' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    modeKinds: MODE_KINDS,
    primitivesPerCard: ADDED_PRIMITIVES_PER_CARD,
    addedPrimitiveCount: ADDED_PRIMITIVE_COUNT,
    maximumOutputPrimitiveCount: MAXIMUM_OUTPUT_PRIMITIVE_COUNT,
    geometrySignatureUsesPanelsOnly: true as const,
    validatesEnhancedReplayAndDrift: true as const,
    changesActions: false as const,
    changesInputGeometry: false as const,
    createsThreeResources: false as const,
    createsDomNodesDirectly: false as const,
    loadsAssets: false as const,
    createsRafOrTimer: false as const,
    hardGatePassed: false as const,
  });
