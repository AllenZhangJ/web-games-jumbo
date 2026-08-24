import type {
  ArenaV2UiRectV1,
  ArenaV2UiRenderPlanV1,
  ArenaV2UiRenderPrimitiveV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1,
  type ArenaV2CharacterFirstScreenIdentityCandidateV1,
} from './arena-v2-character-weapon-first-screen-readability-candidate-v1.js';

type HandlingKind = ArenaV2CharacterFirstScreenIdentityCandidateV1['handlingKind'];
type PanelPrimitive = Extract<ArenaV2UiRenderPrimitiveV1, { readonly kind: 'panel' }>;
type TextPrimitive = Extract<ArenaV2UiRenderPrimitiveV1, { readonly kind: 'text' }>;
type ActionPrimitive = Extract<ArenaV2UiRenderPrimitiveV1, { readonly kind: 'action' }>;

interface FractionRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface HandlingVisualSpec {
  readonly expectedHandlingShapeAxis: string;
  readonly expectedPoseSemantic: ArenaV2CharacterFirstScreenIdentityCandidateV1[
    'selectionPose'
  ]['semantic'];
  readonly expectedValuePatternCue: string;
  readonly glyph: string;
  readonly glyphAccessibilityText: string;
  readonly primary: FractionRect;
  readonly secondary: FractionRect;
}

interface CardPrimitiveGroup {
  readonly identity: ArenaV2CharacterFirstScreenIdentityCandidateV1;
  readonly panel: PanelPrimitive;
  readonly label: TextPrimitive;
  readonly description: TextPrimitive;
  readonly action: ActionPrimitive;
}

const CHARACTER_SELECTION_PLAN_IDENTITY = 'character-select:selection-character';
const CHARACTER_PREFIX = 'selection:character:';
const FORMAL_PREVIEW_PANEL_ID = 'selection:character:formal-preview:panel';
const MAXIMUM_CHARACTER_SELECTION_PRIMITIVE_COUNT = 128;
const ADDED_HANDLING_IDENTITY_PRIMITIVE_COUNT = 18;
const CHARACTER_CARD_SUFFIXES = Object.freeze([
  'panel',
  'label',
  'description',
  'action',
] as const);

const HANDLING_VISUAL_SPECS = Object.freeze({
  balanced: Object.freeze({
    expectedHandlingShapeAxis: '明亮躯干稳定居中，四肢等重，表达无偏科基准',
    expectedPoseSemantic: 'idle',
    expectedValuePatternCue: 'center-bright-core',
    glyph: '◎',
    glyphAccessibilityText: '居中稳定手感',
    primary: Object.freeze({ x: 0.3, y: 0.08, width: 0.4, height: 0.5 }),
    secondary: Object.freeze({ x: 0.34, y: 0.66, width: 0.32, height: 0.16 }),
  }),
  sprint: Object.freeze({
    expectedHandlingShapeAxis: '双腿高明度、上身压暗，表达直线跑速与地面推进',
    expectedPoseSemantic: 'run',
    expectedValuePatternCue: 'bright-paired-legs',
    glyph: '⇥',
    glyphAccessibilityText: '水平推进手感',
    primary: Object.freeze({ x: 0.06, y: 0.54, width: 0.7, height: 0.16 }),
    secondary: Object.freeze({ x: 0.68, y: 0.26, width: 0.24, height: 0.24 }),
  }),
  'air-control': Object.freeze({
    expectedHandlingShapeAxis: '双臂与披风高明度展开，表达空中横向修正',
    expectedPoseSemantic: 'jump',
    expectedValuePatternCue: 'bright-arms-and-cape',
    glyph: '↔',
    glyphAccessibilityText: '空中横向修正手感',
    primary: Object.freeze({ x: 0.04, y: 0.22, width: 0.92, height: 0.16 }),
    secondary: Object.freeze({ x: 0.42, y: 0.46, width: 0.16, height: 0.38 }),
  }),
  'high-jump': Object.freeze({
    expectedHandlingShapeAxis: '双腿高明度、头部次亮，表达竖直弹跳轴',
    expectedPoseSemantic: 'jump',
    expectedValuePatternCue: 'bright-spring-legs',
    glyph: '↑',
    glyphAccessibilityText: '竖直弹跳手感',
    primary: Object.freeze({ x: 0.4, y: 0.04, width: 0.2, height: 0.58 }),
    secondary: Object.freeze({ x: 0.18, y: 0.7, width: 0.64, height: 0.14 }),
  }),
  'quick-start': Object.freeze({
    expectedHandlingShapeAxis: '右臂与左腿形成高明度对角线，表达快速起步与变向',
    expectedPoseSemantic: 'run',
    expectedValuePatternCue: 'bright-start-diagonal',
    glyph: '↗',
    glyphAccessibilityText: '对角快速起步手感',
    primary: Object.freeze({ x: 0.12, y: 0.58, width: 0.42, height: 0.14 }),
    secondary: Object.freeze({ x: 0.58, y: 0.18, width: 0.3, height: 0.22 }),
  }),
  forgiving: Object.freeze({
    expectedHandlingShapeAxis: '躯干与双臂形成明亮稳定括号，表达落地与输入容错',
    expectedPoseSemantic: 'land',
    expectedValuePatternCue: 'bright-stable-bracket',
    glyph: '⌒',
    glyphAccessibilityText: '稳定恢复与容错手感',
    primary: Object.freeze({ x: 0.12, y: 0.18, width: 0.2, height: 0.58 }),
    secondary: Object.freeze({ x: 0.68, y: 0.18, width: 0.2, height: 0.58 }),
  }),
} as const satisfies Readonly<Record<HandlingKind, HandlingVisualSpec>>);

function finiteRect(value: ArenaV2UiRectV1, name: string): void {
  if (![value.x, value.y, value.width, value.height].every(Number.isFinite)
    || value.width <= 0 || value.height <= 0) {
    throw new RangeError(`${name}必须是有限正尺寸矩形。`);
  }
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

function rect(
  x: number,
  y: number,
  width: number,
  height: number,
): ArenaV2UiRectV1 {
  const value = Object.freeze({ x, y, width, height });
  finiteRect(value, 'Arena V2角色卡身份矩形');
  return value;
}

function fractionalRect(
  container: ArenaV2UiRectV1,
  value: FractionRect,
): ArenaV2UiRectV1 {
  const x = Math.round(container.x + container.width * value.x);
  const y = Math.round(container.y + container.height * value.y);
  const right = Math.round(container.x + container.width * (value.x + value.width));
  const bottom = Math.round(container.y + container.height * (value.y + value.height));
  return rect(x, y, Math.max(2, right - x), Math.max(2, bottom - y));
}

function assertIdentitySource(
  identity: ArenaV2CharacterFirstScreenIdentityCandidateV1,
): HandlingVisualSpec {
  const spec = HANDLING_VISUAL_SPECS[identity.handlingKind];
  if (identity.handlingShapeAxis !== spec.expectedHandlingShapeAxis
    || identity.selectionPose.semantic !== spec.expectedPoseSemantic
    || identity.valuePattern.cue !== spec.expectedValuePatternCue
    || identity.valuePattern.colorIsNeverSoleSignal !== true) {
    throw new RangeError(`Arena V2角色卡手感身份源漂移：${identity.handlingKind}。`);
  }
  return spec;
}

function characterPrimitiveIdentity(
  primitiveId: string,
): Readonly<{ readonly characterDefinitionId: string; readonly suffix: string }> | null {
  if (!primitiveId.startsWith(CHARACTER_PREFIX) || primitiveId === FORMAL_PREVIEW_PANEL_ID) {
    return null;
  }
  for (const suffix of CHARACTER_CARD_SUFFIXES) {
    const marker = `:${suffix}`;
    if (primitiveId.endsWith(marker)) {
      return Object.freeze({
        characterDefinitionId: primitiveId.slice(CHARACTER_PREFIX.length, -marker.length),
        suffix,
      });
    }
  }
  throw new RangeError(`Arena V2角色选择计划含未知角色primitive：${primitiveId}。`);
}

function collectCardGroups(plan: ArenaV2UiRenderPlanV1): readonly CardPrimitiveGroup[] {
  if (plan.schemaVersion !== 1 || plan.surfaceKind !== 'information'
    || plan.status !== 'layout-candidate' || plan.productionReady !== false
    || plan.scrollRegion === null) {
    throw new RangeError('Arena V2角色卡身份增强只接受未晋级Information RenderPlan V1。');
  }
  const identityByDefinitionId = new Map(
    ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1.map((identity) => [
      identity.characterDefinitionId,
      identity,
    ] as const),
  );
  if (identityByDefinitionId.size !== 6) {
    throw new RangeError('Arena V2角色卡身份目录必须精确包含六个角色。');
  }
  const mutableGroups = new Map<string, Partial<Record<
    typeof CHARACTER_CARD_SUFFIXES[number],
    ArenaV2UiRenderPrimitiveV1
  >>>();
  for (const primitive of plan.primitives) {
    const parsed = characterPrimitiveIdentity(primitive.id);
    if (parsed === null) continue;
    if (!identityByDefinitionId.has(parsed.characterDefinitionId)) {
      throw new RangeError(`Arena V2角色选择计划含未知角色${parsed.characterDefinitionId}。`);
    }
    const suffix = parsed.suffix as typeof CHARACTER_CARD_SUFFIXES[number];
    const group = mutableGroups.get(parsed.characterDefinitionId) ?? {};
    if (group[suffix] !== undefined) {
      throw new RangeError(`Arena V2角色${parsed.characterDefinitionId}的${suffix}重复。`);
    }
    group[suffix] = primitive;
    mutableGroups.set(parsed.characterDefinitionId, group);
  }
  if (mutableGroups.size !== 6) {
    throw new RangeError('Arena V2角色选择计划必须精确闭合六张角色卡。');
  }
  const scrollViewport = plan.scrollRegion.viewport;
  return Object.freeze(ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1.map(
    (identity): CardPrimitiveGroup => {
      const group = mutableGroups.get(identity.characterDefinitionId);
      if (group === undefined
        || group.panel?.kind !== 'panel'
        || group.label?.kind !== 'text'
        || group.description?.kind !== 'text'
        || group.action?.kind !== 'action') {
        throw new TypeError(`Arena V2角色${identity.characterDefinitionId}卡片结构不完整。`);
      }
      const panel = group.panel;
      const label = group.label;
      const description = group.description;
      const action = group.action;
      finiteRect(panel.rect, `Arena V2角色${identity.characterDefinitionId} panel`);
      if ((panel.rect.height !== 82 && panel.rect.height !== 90)
        || panel.clipRect === null
        || label.clipRect === null
        || description.clipRect === null
        || action.clipRect === null
        || !sameRect(action.rect, panel.rect)
        || label.role !== 'label'
        || description.role !== 'value'
        || !containsRect(panel.rect, label.rect)
        || !containsRect(panel.rect, description.rect)
        || !sameRect(panel.clipRect, scrollViewport)
        || !sameRect(panel.clipRect, action.clipRect)
        || !sameRect(panel.clipRect, label.clipRect)
        || !sameRect(panel.clipRect, description.clipRect)
        || action.intentId
          !== `arena.v2.selection.character.${encodeURIComponent(identity.characterDefinitionId)}`
        || action.minimumTouchTargetCssPixels !== 48) {
        throw new RangeError(`Arena V2角色${identity.characterDefinitionId}卡片合同漂移。`);
      }
      assertIdentitySource(identity);
      return Object.freeze({ identity, panel, label, description, action });
    },
  ));
}

function identityRail(card: ArenaV2UiRectV1): ArenaV2UiRectV1 {
  const width = card.height === 82 ? 28 : 32;
  return rect(card.x + card.width - width - 8, card.y + 8, width, card.height - 16);
}

function narrowedTextRect(
  source: ArenaV2UiRectV1,
  rail: ArenaV2UiRectV1,
): ArenaV2UiRectV1 {
  const width = rail.x - 6 - source.x;
  if (width < 48) {
    throw new RangeError('Arena V2角色卡文字区不足以容纳身份轨并保持最小可读宽度。');
  }
  return rect(source.x, source.y, width, source.height);
}

function geometrySignature(
  card: ArenaV2UiRectV1,
  primary: PanelPrimitive,
  secondary: PanelPrimitive,
): string {
  const relative = (value: ArenaV2UiRectV1): string => [
    value.x - card.x,
    value.y - card.y,
    value.width,
    value.height,
  ].join(',');
  return [
    relative(primary.rect),
    primary.cornerRadiusCssPixels,
    relative(secondary.rect),
    secondary.cornerRadiusCssPixels,
  ].join('|');
}

function identityPrimitives(group: CardPrimitiveGroup): Readonly<{
  readonly primary: PanelPrimitive;
  readonly secondary: PanelPrimitive;
  readonly glyph: TextPrimitive;
  readonly geometrySignature: string;
}> {
  const spec = assertIdentitySource(group.identity);
  const rail = identityRail(group.panel.rect);
  const geometryArea = rect(rail.x, rail.y, rail.width, rail.height - 18);
  const clipRect = group.panel.clipRect;
  const prefix = `${CHARACTER_PREFIX}${group.identity.characterDefinitionId}:handling-identity`;
  const primary = Object.freeze({
    kind: 'panel' as const,
    id: `${prefix}:primary`,
    rect: fractionalRect(geometryArea, spec.primary),
    clipRect,
    tone: 'strong' as const,
    cornerRadiusCssPixels: group.identity.handlingKind === 'balanced' ? 8 : 2,
    zIndex: 2,
  });
  const secondary = Object.freeze({
    kind: 'panel' as const,
    id: `${prefix}:secondary`,
    rect: fractionalRect(geometryArea, spec.secondary),
    clipRect,
    tone: 'secondary' as const,
    cornerRadiusCssPixels: group.identity.handlingKind === 'forgiving' ? 6 : 1,
    zIndex: 2,
  });
  const glyphRect = rect(rail.x, rail.y + rail.height - 18, rail.width, 18);
  const glyph = Object.freeze({
    kind: 'text' as const,
    id: `${prefix}:glyph`,
    rect: glyphRect,
    clipRect,
    text: spec.glyph,
    accessibilityText: spec.glyphAccessibilityText,
    tone: 'strong' as const,
    role: 'label' as const,
    alignment: 'center' as const,
    maximumLines: 1,
    fixedWidthNumeric: false,
    zIndex: 2,
  });
  if (!containsRect(group.panel.rect, primary.rect)
    || !containsRect(group.panel.rect, secondary.rect)
    || !containsRect(group.panel.rect, glyph.rect)) {
    throw new RangeError(`Arena V2角色${group.identity.characterDefinitionId}身份图形越出卡片。`);
  }
  return Object.freeze({
    primary,
    secondary,
    glyph,
    geometrySignature: geometrySignature(group.panel.rect, primary, secondary),
  });
}

/**
 * Adds static, non-interactive handling identity geometry to the six existing
 * character selection cards. It never creates a page, action, input or asset
 * request, and it never derives gameplay facts from the character id.
 */
export function addArenaV2CharacterSelectionCardHandlingIdentityToRenderPlanCandidateV1(
  plan: ArenaV2UiRenderPlanV1,
): ArenaV2UiRenderPlanV1 {
  if (plan.identity !== CHARACTER_SELECTION_PLAN_IDENTITY) return plan;
  if (plan.primitives.length
    > MAXIMUM_CHARACTER_SELECTION_PRIMITIVE_COUNT
      - ADDED_HANDLING_IDENTITY_PRIMITIVE_COUNT) {
    throw new RangeError('Arena V2角色选择计划没有足够预算容纳六角色手感身份。');
  }
  const groups = collectCardGroups(plan);
  const generated = new Map(groups.map((group) => [
    group.identity.characterDefinitionId,
    identityPrimitives(group),
  ] as const));
  if (generated.size !== 6
    || new Set([...generated.values()].map(({ geometrySignature: value }) => value)).size !== 6) {
    throw new RangeError('Arena V2六角色卡必须具有六个唯一的非颜色几何signature。');
  }
  const replacements = new Map<string, ArenaV2UiRenderPrimitiveV1>();
  for (const group of groups) {
    const visual = generated.get(group.identity.characterDefinitionId)!;
    replacements.set(group.label.id, Object.freeze({
      ...group.label,
      rect: narrowedTextRect(group.label.rect, identityRail(group.panel.rect)),
    }));
    replacements.set(group.description.id, Object.freeze({
      ...group.description,
      rect: narrowedTextRect(group.description.rect, identityRail(group.panel.rect)),
    }));
    replacements.set(`${group.description.id}:after-primary`, visual.primary);
    replacements.set(`${group.description.id}:after-secondary`, visual.secondary);
    replacements.set(`${group.description.id}:after-glyph`, visual.glyph);
  }
  const primitives: ArenaV2UiRenderPrimitiveV1[] = [];
  for (const primitive of plan.primitives) {
    primitives.push(replacements.get(primitive.id) ?? primitive);
    const primary = replacements.get(`${primitive.id}:after-primary`);
    const secondary = replacements.get(`${primitive.id}:after-secondary`);
    const glyph = replacements.get(`${primitive.id}:after-glyph`);
    if (primary !== undefined && secondary !== undefined && glyph !== undefined) {
      primitives.push(primary, secondary, glyph);
    }
  }
  if (primitives.length !== plan.primitives.length
      + ADDED_HANDLING_IDENTITY_PRIMITIVE_COUNT
    || primitives.length > MAXIMUM_CHARACTER_SELECTION_PRIMITIVE_COUNT) {
    throw new RangeError('Arena V2角色选择手感身份输出primitive预算漂移。');
  }
  return Object.freeze({
    ...plan,
    identity: `${CHARACTER_SELECTION_PLAN_IDENTITY}:handling-identity-v1`,
    primitives: Object.freeze(primitives),
  });
}

export const ARENA_V2_CHARACTER_SELECTION_CARD_HANDLING_IDENTITY_RENDER_PLAN_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    id: 'arena-v2.character-selection-card-handling-identity-render-plan.candidate.v1' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    sourceCharacterCount: 6 as const,
    primitivesPerCard: 3 as const,
    addedPrimitiveCount: ADDED_HANDLING_IDENTITY_PRIMITIVE_COUNT,
    maximumOutputPrimitiveCount: MAXIMUM_CHARACTER_SELECTION_PRIMITIVE_COUNT,
    geometrySignatureExcludesGlyphText: true as const,
    changesActions: false as const,
    changesInputGeometry: false as const,
    createsThreeResources: false as const,
    loadsAssets: false as const,
    createsRafOrTimer: false as const,
    reducedMotionBehavior: 'static-geometry-unchanged' as const,
    mutedBehavior: 'visual-identity-unchanged' as const,
    hardGatePassed: false as const,
  });
