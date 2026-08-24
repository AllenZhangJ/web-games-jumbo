import {
  ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1,
  type ArenaV2UiRectV1,
  type ArenaV2UiRenderPlanV1,
  type ArenaV2UiRenderPrimitiveV1,
  type ArenaV2WeaponCollectionCombatGrammarVisualSourceEntryCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  WEAPON_ACTION_CONTEXT_V1,
  WEAPON_CORE_VERB_V1,
  WEAPON_COUNTER_INPUT_V1,
  WEAPON_FAILURE_RISK_V1,
  type WeaponCounterInputV1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_PRIMITIVE_GEOMETRY_CLOSURE_CANDIDATE_V1,
  ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1,
  createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1,
} from './arena-v2-collection-semantic-fallback-visual-profile-candidate-v1.js';

type PanelPrimitive = Extract<ArenaV2UiRenderPrimitiveV1, { readonly kind: 'panel' }>;
type TextPrimitive = Extract<ArenaV2UiRenderPrimitiveV1, { readonly kind: 'text' }>;
type ActionPrimitive = Extract<ArenaV2UiRenderPrimitiveV1, { readonly kind: 'action' }>;

interface WeaponGrammarCardGroup {
  readonly grammar: ArenaV2WeaponCollectionCombatGrammarVisualSourceEntryCandidateV1;
  readonly previewRect: ArenaV2UiRectV1;
  readonly originalPanels: readonly [PanelPrimitive, PanelPrimitive, PanelPrimitive];
  readonly enhancedPanels: readonly [PanelPrimitive, PanelPrimitive, PanelPrimitive];
  readonly actualPanels: readonly [PanelPrimitive, PanelPrimitive, PanelPrimitive];
  readonly originalMatches: boolean;
  readonly enhancedMatches: boolean;
}

export interface ArenaV2WeaponCollectionCombatGrammarDetailTargetCandidateV1 {
  readonly schemaVersion: 1;
  readonly weaponDefinitionId: string;
  readonly displayName: string;
  readonly previewRect: ArenaV2UiRectV1;
  readonly fallbackExpected: boolean;
  readonly currentUniqueGoal: boolean;
}

const SOURCE_PLAN_IDENTITY = 'weapon-index:selection-weapon';
const DETAIL_SOURCE_PLAN_IDENTITY = 'weapon-detail';
const STANDARD_SLOT_CSS_PIXELS = Object.freeze([72, 96, 168, 240] as const);
const DETAIL_SLOT_CSS_PIXELS = Object.freeze([200, 260] as const);
const MAXIMUM_OUTPUT_PRIMITIVE_COUNT = 256;
const FALLBACK_PANEL_COUNT_PER_WEAPON = 3;
const RESHAPED_PANEL_COUNT = 60;
const SELECTION_SUFFIXES = Object.freeze([
  'panel', 'label', 'description', 'action', 'main-research', 'main-research-milestones',
] as const);
const CORE_VERB_ORDER = Object.freeze(Object.values(WEAPON_CORE_VERB_V1));
const FAILURE_RISK_ORDER = Object.freeze(Object.values(WEAPON_FAILURE_RISK_V1));
const ACTION_CONTEXT_VALUES = Object.freeze(Object.values(WEAPON_ACTION_CONTEXT_V1));
const COUNTER_INPUT_VALUES = Object.freeze(Object.values(WEAPON_COUNTER_INPUT_V1));

function assertOfficialValueClosure(values: readonly string[], expectedCount: number, name: string): void {
  if (values.length !== expectedCount || new Set(values).size !== values.length) {
    throw new RangeError(`A5/A6 ${name}正式值域数量或唯一性漂移。`);
  }
}

assertOfficialValueClosure(CORE_VERB_ORDER, 6, 'WEAPON_CORE_VERB_V1');
assertOfficialValueClosure(FAILURE_RISK_ORDER, 7, 'WEAPON_FAILURE_RISK_V1');
assertOfficialValueClosure(ACTION_CONTEXT_VALUES, 2, 'WEAPON_ACTION_CONTEXT_V1');
assertOfficialValueClosure(COUNTER_INPUT_VALUES, 2, 'WEAPON_COUNTER_INPUT_V1');

function sameRect(left: ArenaV2UiRectV1 | null, right: ArenaV2UiRectV1 | null): boolean {
  if (left === null || right === null) return left === right;
  return left.x === right.x && left.y === right.y
    && left.width === right.width && left.height === right.height;
}

function inside(container: ArenaV2UiRectV1, child: ArenaV2UiRectV1): boolean {
  return child.x >= container.x
    && child.y >= container.y
    && child.x + child.width <= container.x + container.width
    && child.y + child.height <= container.y + container.height;
}

function exactPrimitive(plan: ArenaV2UiRenderPlanV1, id: string): ArenaV2UiRenderPrimitiveV1 {
  const matches = plan.primitives.filter((primitive) => primitive.id === id);
  if (matches.length !== 1) {
    throw new RangeError(`A5/A6武器语法几何必须精确包含一个${id}。`);
  }
  return matches[0]!;
}

function samePanel(left: PanelPrimitive, right: PanelPrimitive): boolean {
  return left.id === right.id
    && sameRect(left.rect, right.rect)
    && sameRect(left.clipRect, right.clipRect)
    && left.tone === right.tone
    && left.cornerRadiusCssPixels === right.cornerRadiusCssPixels
    && left.zIndex === right.zIndex;
}

function sameText(left: TextPrimitive, right: TextPrimitive): boolean {
  return left.id === right.id
    && sameRect(left.rect, right.rect)
    && sameRect(left.clipRect, right.clipRect)
    && left.text === right.text
    && left.accessibilityText === right.accessibilityText
    && left.tone === right.tone
    && left.role === right.role
    && left.alignment === right.alignment
    && left.maximumLines === right.maximumLines
    && left.fixedWidthNumeric === right.fixedWidthNumeric
    && left.zIndex === right.zIndex;
}

function sameTextExceptRect(left: TextPrimitive, right: TextPrimitive): boolean {
  return left.id === right.id
    && sameRect(left.clipRect, right.clipRect)
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
    && sameRect(left.clipRect, right.clipRect)
    && left.intentId === right.intentId
    && left.label === right.label
    && left.accessibilityText === right.accessibilityText
    && left.enabled === right.enabled
    && left.disabledReason === right.disabledReason
    && left.minimumTouchTargetCssPixels === right.minimumTouchTargetCssPixels
    && left.tone === right.tone
    && left.zIndex === right.zIndex;
}

function visualArea(previewRect: ArenaV2UiRectV1): ArenaV2UiRectV1 {
  const inset = Math.max(6, Math.round(Math.min(previewRect.width, previewRect.height) * 0.08));
  const labelHeight = Math.max(20, Math.min(28, Math.round(previewRect.height * 0.24)));
  const width = previewRect.width - inset * 2;
  const height = previewRect.height - inset * 2 - labelHeight;
  if (width < 12 || height < 12) {
    throw new RangeError('A5/A6武器语法几何没有满足A6.18的安全形状区。');
  }
  return Object.freeze({
    x: previewRect.x + inset,
    y: previewRect.y + inset,
    width,
    height,
  });
}

function indexOfExact<T>(values: readonly T[], value: T, name: string): number {
  const index = values.indexOf(value);
  if (index < 0) throw new RangeError(`A5/A6武器语法含未知${name}。`);
  return index;
}

function counterMask(values: readonly WeaponCounterInputV1[]): number {
  if (values.length < 1 || values.length > 2 || new Set(values).size !== values.length) {
    throw new RangeError('A5/A6武器反制输入必须是非空、无重复的既有闭合集。');
  }
  return (values.includes(WEAPON_COUNTER_INPUT_V1.DIRECTION) ? 1 : 0)
    + (values.includes(WEAPON_COUNTER_INPUT_V1.JUMP) ? 2 : 0);
}

function clampedPosition(
  original: number,
  target: number,
  minimum: number,
  maximum: number,
): number {
  return Math.max(minimum, Math.min(maximum, Math.round(original * 0.7 + target * 0.3)));
}

function placeExistingPanel(
  source: PanelPrimitive,
  area: ArenaV2UiRectV1,
  xRatio: number,
  yRatio: number,
  cornerRadiusCssPixels: number,
): PanelPrimitive {
  const width = Math.min(source.rect.width, area.width);
  const height = Math.min(source.rect.height, area.height);
  const maximumX = area.x + area.width - width;
  const maximumY = area.y + area.height - height;
  const targetX = area.x + (area.width - width) * xRatio;
  const targetY = area.y + (area.height - height) * yRatio;
  const rect = Object.freeze({
    x: clampedPosition(source.rect.x, targetX, area.x, maximumX),
    y: clampedPosition(source.rect.y, targetY, area.y, maximumY),
    width,
    height,
  });
  const maximumRadius = Math.floor(Math.min(width, height) / 2);
  return Object.freeze({
    ...source,
    rect,
    cornerRadiusCssPixels: Math.max(0, Math.min(maximumRadius, cornerRadiusCssPixels)),
  });
}

function reshapePanels(
  grammar: ArenaV2WeaponCollectionCombatGrammarVisualSourceEntryCandidateV1,
  previewRect: ArenaV2UiRectV1,
  original: readonly [PanelPrimitive, PanelPrimitive, PanelPrimitive],
): readonly [PanelPrimitive, PanelPrimitive, PanelPrimitive] {
  const area = visualArea(previewRect);
  const verbIndex = indexOfExact(CORE_VERB_ORDER, grammar.coreVerb, '核心动词');
  const ground = grammar.contexts[0];
  const aerial = grammar.contexts[1];
  if (ground.context !== WEAPON_ACTION_CONTEXT_V1.GROUND
    || aerial.context !== WEAPON_ACTION_CONTEXT_V1.AERIAL) {
    throw new RangeError('A5/A6武器语法必须按ground/aerial固定顺序投影。');
  }
  const groundRisk = indexOfExact(FAILURE_RISK_ORDER, ground.failureRisk, '地面风险');
  const aerialRisk = indexOfExact(FAILURE_RISK_ORDER, aerial.failureRisk, '空中风险');
  const groundCounter = counterMask(ground.counterInputs);
  const aerialCounter = counterMask(aerial.counterInputs);
  const primary = placeExistingPanel(
    original[0],
    area,
    (verbIndex % 3) / 2,
    Math.floor(verbIndex / 3),
    original[0].cornerRadiusCssPixels + (verbIndex % 3) - 1,
  );
  const secondary = placeExistingPanel(
    original[1],
    area,
    groundRisk / (FAILURE_RISK_ORDER.length - 1),
    aerialRisk / (FAILURE_RISK_ORDER.length - 1),
    original[1].cornerRadiusCssPixels + ((groundRisk + aerialRisk) % 3) - 1,
  );
  const pattern = placeExistingPanel(
    original[2],
    area,
    (groundCounter - 1) / 2,
    (aerialCounter - 1) / 2,
    Math.max(0, groundCounter - aerialCounter + 1),
  );
  const result = Object.freeze([primary, secondary, pattern] as const);
  if (result.some((panel) => !inside(previewRect, panel.rect))) {
    throw new RangeError(`A5/A6武器${grammar.weaponDefinitionId}语法几何越出preview rect。`);
  }
  if (result.some((panel, index) => (
    panel.rect.width !== original[index]!.rect.width
    || panel.rect.height !== original[index]!.rect.height
  ))) {
    throw new RangeError(`A5/A6武器${grammar.weaponDefinitionId}不得改写A6.18整数尺寸身份。`);
  }
  return result;
}

function panelSignature(
  panels: readonly [PanelPrimitive, PanelPrimitive, PanelPrimitive],
  previewRect: ArenaV2UiRectV1,
): string {
  const roles = ['primary', 'secondary', 'pattern'] as const;
  return panels.map((panel, index) => `${roles[index]}:${[
    panel.rect.x - previewRect.x,
    panel.rect.y - previewRect.y,
    panel.rect.width,
    panel.rect.height,
    panel.cornerRadiusCssPixels,
  ].join(',')}`).join('|');
}

function expectedFallback(
  grammar: ArenaV2WeaponCollectionCombatGrammarVisualSourceEntryCandidateV1,
  previewRect: ArenaV2UiRectV1,
  clipRect: ArenaV2UiRectV1,
  displayName: string,
): Readonly<{
  panels: readonly [PanelPrimitive, PanelPrimitive, PanelPrimitive];
  text: TextPrimitive;
}> {
  const profile = ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1.profiles.find(
    (candidate) => candidate.kind === 'weapon'
      && candidate.definitionId === grammar.weaponDefinitionId,
  );
  if (profile === undefined) {
    throw new RangeError(`A5/A6武器${grammar.weaponDefinitionId}缺少A6.18视觉profile。`);
  }
  const primitives = createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1({
    schemaVersion: 1,
    prefix: `formal-preview:weapon:${grammar.weaponDefinitionId}`,
    rect: previewRect,
    clipRect,
    kind: 'weapon',
    definitionId: grammar.weaponDefinitionId,
    assetId: profile.assetId,
    displayName,
  });
  if (primitives.length !== 4
    || primitives[0]?.kind !== 'panel'
    || primitives[1]?.kind !== 'panel'
    || primitives[2]?.kind !== 'panel'
    || primitives[3]?.kind !== 'text') {
    throw new RangeError('A5/A6武器语法增强只接受A6.18既有3 panel + 1 text回退。');
  }
  return Object.freeze({
    panels: [primitives[0], primitives[1], primitives[2]] as const,
    text: primitives[3],
  });
}

function detailTargetKeysAreExact(
  target: ArenaV2WeaponCollectionCombatGrammarDetailTargetCandidateV1,
): boolean {
  const prototype = Object.getPrototypeOf(target);
  const descriptors = Object.getOwnPropertyDescriptors(target);
  const keys = Object.keys(descriptors).sort();
  return (prototype === Object.prototype || prototype === null)
    && keys.join('|')
      === 'currentUniqueGoal|displayName|fallbackExpected|previewRect|schemaVersion|weaponDefinitionId'
    && keys.every((key) => descriptors[key]?.enumerable === true
      && 'value' in descriptors[key]!
      && descriptors[key]?.get === undefined
      && descriptors[key]?.set === undefined);
}

function detailRectIsExact(value: ArenaV2UiRectV1): boolean {
  const prototype = Object.getPrototypeOf(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).sort();
  return (prototype === Object.prototype || prototype === null)
    && keys.join('|') === 'height|width|x|y'
    && keys.every((key) => descriptors[key]?.enumerable === true
      && 'value' in descriptors[key]!
      && descriptors[key]?.get === undefined
      && descriptors[key]?.set === undefined)
    && [value.x, value.y, value.width, value.height].every(Number.isSafeInteger)
    && value.width > 0 && value.height > 0;
}

function isDetailSourceIdentity(identity: string): boolean {
  return identity === DETAIL_SOURCE_PLAN_IDENTITY
    || identity.startsWith(`${DETAIL_SOURCE_PLAN_IDENTITY}:`);
}

function validateDetailSourceIdentity(
  identity: string,
  weaponDefinitionId: string,
): void {
  if (identity === DETAIL_SOURCE_PLAN_IDENTITY) return;
  const prefix = `${DETAIL_SOURCE_PLAN_IDENTITY}:browse-weapon:`;
  if (!identity.startsWith(prefix)) {
    throw new RangeError('A5/A6 weapon-detail source identity含未知增强后缀。');
  }
  const encoded = identity.slice(prefix.length);
  let decoded: string;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    throw new RangeError('A5/A6 weapon-detail browse identity编码无效。');
  }
  if (encoded.length === 0
    || encodeURIComponent(decoded) !== encoded
    || decoded !== weaponDefinitionId) {
    throw new RangeError('A5/A6 weapon-detail browse identity与当前武器不闭合。');
  }
}

function validateDetailSourcePrimitivesPreserved(
  sourcePlan: ArenaV2UiRenderPlanV1,
  outputPlan: ArenaV2UiRenderPlanV1,
): void {
  sourcePlan.primitives.forEach((source) => {
    const output = exactPrimitive(outputPlan, source.id);
    const preserved = source.kind === 'panel' && output.kind === 'panel'
      ? source.id === output.id
        && sameRect(source.clipRect, output.clipRect)
        && source.tone === output.tone
        && source.cornerRadiusCssPixels === output.cornerRadiusCssPixels
        && source.zIndex === output.zIndex
      : source.kind === 'text' && output.kind === 'text'
        ? sameTextExceptRect(source, output)
        : source.kind === 'action' && output.kind === 'action'
          ? sameActionExceptRect(source, output)
          : false;
    if (!preserved) {
      throw new RangeError(`A5/A6 weapon-detail既有${source.id}文字、动作或primitive语义漂移。`);
    }
  });
}

function detailPreviewIds(
  weaponDefinitionId: string,
): Readonly<{
  prefix: string;
  fallbackIds: ReadonlySet<string>;
  approvedIds: ReadonlySet<string>;
}> {
  const prefix = `formal-preview:weapon:${weaponDefinitionId}`;
  const common = [`${prefix}:panel`, `${prefix}:title`, `${prefix}:next-main-research-milestone`];
  return Object.freeze({
    prefix,
    fallbackIds: new Set([
      ...common,
      `${prefix}:fallback-pattern:1`,
      `${prefix}:fallback-pattern:2`,
      `${prefix}:fallback-pattern:3`,
      `${prefix}:fallback`,
    ]),
    approvedIds: new Set([
      ...common,
      `${prefix}:transparent-center`,
      `${prefix}:preview-border:1`,
      `${prefix}:preview-border:2`,
      `${prefix}:preview-border:3`,
      `${prefix}:preview-border:4`,
    ]),
  });
}

function enhanceDetail(
  plan: ArenaV2UiRenderPlanV1,
  sourcePlan: ArenaV2UiRenderPlanV1,
  target: ArenaV2WeaponCollectionCombatGrammarDetailTargetCandidateV1,
): ArenaV2UiRenderPlanV1 {
  const composedIdentityPrefix = `${sourcePlan.identity}:a6.15-preview-aware:`;
  const composedViewportId = plan.identity.startsWith(composedIdentityPrefix)
    ? plan.identity.slice(composedIdentityPrefix.length)
    : '';
  const expectedDetailSlotCssPixels = composedViewportId === '390x844'
    ? 200
    : composedViewportId === '1440x900'
      ? 260
      : null;
  if (!detailTargetKeysAreExact(target)
    || target.schemaVersion !== 1
    || typeof target.weaponDefinitionId !== 'string' || target.weaponDefinitionId.length === 0
    || typeof target.displayName !== 'string' || target.displayName.length === 0
    || typeof target.fallbackExpected !== 'boolean'
    || typeof target.currentUniqueGoal !== 'boolean'
    || !detailRectIsExact(target.previewRect)
    || plan.schemaVersion !== 1 || sourcePlan.schemaVersion !== 1
    || plan.surfaceKind !== 'information' || sourcePlan.surfaceKind !== 'information'
    || plan.status !== 'layout-candidate' || sourcePlan.status !== 'layout-candidate'
    || plan.productionReady !== false || sourcePlan.productionReady !== false
    || expectedDetailSlotCssPixels === null
    || target.previewRect.width !== expectedDetailSlotCssPixels
    || target.previewRect.height !== expectedDetailSlotCssPixels
    || plan.scrollRegion === null || sourcePlan.scrollRegion === null
    || plan.primitives.length > MAXIMUM_OUTPUT_PRIMITIVE_COUNT) {
    throw new RangeError('A5/A6 weapon-detail语法增强输入或A6.15 source identity绑定无效。');
  }
  if (new Set(plan.primitives.map(({ id }) => id)).size !== plan.primitives.length
    || new Set(sourcePlan.primitives.map(({ id }) => id)).size !== sourcePlan.primitives.length) {
    throw new RangeError('A5/A6 weapon-detail语法计划含重复primitive身份。');
  }
  const viewport = plan.scrollRegion.viewport;
  const grammar = ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1.entries
    .find(({ weaponDefinitionId }) => weaponDefinitionId === target.weaponDefinitionId);
  if (grammar === undefined) throw new RangeError('A5/A6 weapon-detail含未知武器身份。');
  validateDetailSourceIdentity(sourcePlan.identity, target.weaponDefinitionId);
  if (sourcePlan.primitives.some(({ id }) => id.startsWith('selection:weapon:'))) {
    throw new RangeError('A5/A6 weapon-detail不得伪造weapon-index selection卡。');
  }
  validateDetailSourcePrimitivesPreserved(sourcePlan, plan);
  const ids = detailPreviewIds(target.weaponDefinitionId);
  if (plan.primitives.some(({ id }) => (
    id.startsWith('formal-preview:weapon:') && !id.startsWith(`${ids.prefix}:`)
  ))) {
    throw new RangeError('A5/A6 weapon-detail不得夹带未选中武器preview身份。');
  }
  const previewPrimitives = plan.primitives.filter(({ id }) => id.startsWith(`${ids.prefix}:`));
  const allowedIds = target.fallbackExpected ? ids.fallbackIds : ids.approvedIds;
  if (previewPrimitives.some(({ id }) => !allowedIds.has(id))) {
    throw new RangeError('A5/A6 weapon-detail含未知、partial或与许可路径冲突的preview primitive。');
  }
  const outer = exactPrimitive(plan, `${ids.prefix}:panel`);
  const title = exactPrimitive(plan, `${ids.prefix}:title`);
  const milestone = plan.primitives.find(({ id }) => id === `${ids.prefix}:next-main-research-milestone`);
  const expectedTitle = `${target.currentUniqueGoal ? '当前目标 · ' : ''}${target.displayName}`;
  const primaryActions = sourcePlan.primitives.filter(({ id }) => id === 'primary-action');
  const primaryAction = primaryActions[0];
  const primaryActionMatches = primaryAction?.kind === 'action'
    && primaryAction.intentId === 'use-selected-weapon-next-match';
  if (outer.kind !== 'panel' || title.kind !== 'text'
    || (milestone !== undefined && milestone.kind !== 'text')
    || title.text !== expectedTitle || title.accessibilityText !== expectedTitle
    || title.tone !== (target.currentUniqueGoal ? 'strong' : 'secondary')
    || title.role !== 'label' || title.alignment !== 'center'
    || title.maximumLines !== 1 || title.fixedWidthNumeric !== false
    || title.clipRect === null || !sameRect(title.clipRect, viewport)
    || !inside(outer.rect, title.rect)
    || primaryActions.length !== 1 || !primaryActionMatches
    || !inside(outer.rect, target.previewRect)) {
    throw new RangeError('A5/A6 weapon-detail当前身份、标题、主动作或preview rect未闭合。');
  }
  if (!target.fallbackExpected) {
    if (previewPrimitives.some(({ id }) => id.includes(':fallback'))) {
      throw new RangeError('A5/A6正式获批GLB详情路径不得混入程序化fallback。');
    }
    const approvedPanels = [
      `${ids.prefix}:transparent-center`,
      `${ids.prefix}:preview-border:1`,
      `${ids.prefix}:preview-border:2`,
      `${ids.prefix}:preview-border:3`,
      `${ids.prefix}:preview-border:4`,
    ].map((id) => exactPrimitive(plan, id));
    const thickness = 2;
    const borderTone = target.currentUniqueGoal ? 'strong' as const : 'secondary' as const;
    const expectedApprovedPanels: readonly PanelPrimitive[] = Object.freeze([
      Object.freeze({
        kind: 'panel' as const,
        id: `${ids.prefix}:transparent-center`,
        rect: target.previewRect,
        clipRect: viewport,
        tone: 'transparent' as const,
        cornerRadiusCssPixels: 12,
        zIndex: 2,
      }),
      ...[
        Object.freeze({
          x: target.previewRect.x,
          y: target.previewRect.y,
          width: target.previewRect.width,
          height: thickness,
        }),
        Object.freeze({
          x: target.previewRect.x,
          y: target.previewRect.y + target.previewRect.height - thickness,
          width: target.previewRect.width,
          height: thickness,
        }),
        Object.freeze({
          x: target.previewRect.x,
          y: target.previewRect.y + thickness,
          width: thickness,
          height: target.previewRect.height - thickness * 2,
        }),
        Object.freeze({
          x: target.previewRect.x + target.previewRect.width - thickness,
          y: target.previewRect.y + thickness,
          width: thickness,
          height: target.previewRect.height - thickness * 2,
        }),
      ].map((rect, index) => Object.freeze({
        kind: 'panel' as const,
        id: `${ids.prefix}:preview-border:${index + 1}`,
        rect,
        clipRect: viewport,
        tone: borderTone,
        cornerRadiusCssPixels: index < 2 ? 2 : 0,
        zIndex: 3,
      })),
    ]);
    if (previewPrimitives.length !== approvedPanels.length + 2 + (milestone === undefined ? 0 : 1)
      || approvedPanels.some((primitive, index) => (
        primitive.kind !== 'panel' || !samePanel(primitive, expectedApprovedPanels[index]!)
      ))) {
      throw new RangeError('A5/A6正式获批GLB详情路径必须保持既有透明preview结构。');
    }
    return plan;
  }
  if (previewPrimitives.length !== 6 + (milestone === undefined ? 0 : 1)) {
    throw new RangeError('A5/A6 weapon-detail必须精确闭合既有3 panel + 1 text fallback。');
  }
  const expected = expectedFallback(
    grammar,
    target.previewRect,
    viewport,
    target.displayName,
  );
  const fallbackText = exactPrimitive(plan, `${ids.prefix}:fallback`);
  if (fallbackText.kind !== 'text' || !sameText(fallbackText, expected.text)) {
    throw new RangeError('A5/A6 weapon-detail fallback文字或身份漂移。');
  }
  const actualPanels = Object.freeze([1, 2, 3].map((ordinal) => {
    const primitive = exactPrimitive(plan, `${ids.prefix}:fallback-pattern:${ordinal}`);
    if (primitive.kind !== 'panel') throw new TypeError('A5/A6 weapon-detail语法形状必须保持panel。');
    return primitive;
  })) as readonly [PanelPrimitive, PanelPrimitive, PanelPrimitive];
  const enhancedPanels = reshapePanels(grammar, target.previewRect, expected.panels);
  const originalMatches = actualPanels.every((panel, index) => samePanel(panel, expected.panels[index]!));
  const enhancedMatches = actualPanels.every((panel, index) => samePanel(panel, enhancedPanels[index]!));
  if (!originalMatches && !enhancedMatches) {
    throw new RangeError('A5/A6 weapon-detail几何漂移或partial增强。');
  }
  if (enhancedMatches) return plan;
  const replacements = new Map(enhancedPanels.map((panel) => [panel.id, panel]));
  const primitives = Object.freeze(plan.primitives.map((primitive) => (
    replacements.get(primitive.id) ?? primitive
  )));
  if (primitives.length !== plan.primitives.length
    || primitives.length > MAXIMUM_OUTPUT_PRIMITIVE_COUNT) {
    throw new RangeError('A5/A6 weapon-detail语法增强不得新增primitive或越过256硬上限。');
  }
  return Object.freeze({ ...plan, primitives });
}

function validateSourceAndOutputCore(
  sourcePlan: ArenaV2UiRenderPlanV1,
  outputPlan: ArenaV2UiRenderPlanV1,
  grammar: ArenaV2WeaponCollectionCombatGrammarVisualSourceEntryCandidateV1,
): Readonly<{ panel: PanelPrimitive; action: ActionPrimitive }> {
  const prefix = `selection:weapon:${grammar.weaponDefinitionId}`;
  const sourcePanel = exactPrimitive(sourcePlan, `${prefix}:panel`);
  const sourceLabel = exactPrimitive(sourcePlan, `${prefix}:label`);
  const sourceDescription = exactPrimitive(sourcePlan, `${prefix}:description`);
  const sourceAction = exactPrimitive(sourcePlan, `${prefix}:action`);
  const outputPanel = exactPrimitive(outputPlan, `${prefix}:panel`);
  const outputLabel = exactPrimitive(outputPlan, `${prefix}:label`);
  const outputDescription = exactPrimitive(outputPlan, `${prefix}:description`);
  const outputAction = exactPrimitive(outputPlan, `${prefix}:action`);
  if (sourcePanel.kind !== 'panel' || outputPanel.kind !== 'panel'
    || sourceLabel.kind !== 'text' || outputLabel.kind !== 'text'
    || sourceDescription.kind !== 'text' || outputDescription.kind !== 'text'
    || sourceAction.kind !== 'action' || outputAction.kind !== 'action'
    || !sameTextExceptRect(sourceLabel, outputLabel)
    || !sameTextExceptRect(sourceDescription, outputDescription)
    || !sameActionExceptRect(sourceAction, outputAction)
    || sourceAction.intentId !== `arena.v2.selection.weapon.${encodeURIComponent(
      grammar.weaponDefinitionId
    )}`
    || sourceAction.label !== sourceLabel.text
    || sourceAction.minimumTouchTargetCssPixels !== 48
    || !sameRect(sourcePanel.rect, sourceAction.rect)
    || !sameRect(outputPanel.rect, outputAction.rect)
    || outputAction.minimumTouchTargetCssPixels !== 48
    || !sameRect(sourcePanel.clipRect, outputPanel.clipRect)
    || sourcePanel.tone !== outputPanel.tone
    || sourcePanel.cornerRadiusCssPixels !== outputPanel.cornerRadiusCssPixels
    || sourcePanel.zIndex !== outputPanel.zIndex) {
    throw new RangeError(`A5/A6武器${grammar.weaponDefinitionId}文字、动作或选择卡合同漂移。`);
  }
  return Object.freeze({ panel: outputPanel, action: outputAction });
}

function collectGroups(
  plan: ArenaV2UiRenderPlanV1,
  sourcePlan: ArenaV2UiRenderPlanV1,
): readonly WeaponGrammarCardGroup[] {
  if (sourcePlan.identity !== SOURCE_PLAN_IDENTITY
    || plan.schemaVersion !== 1 || sourcePlan.schemaVersion !== 1
    || plan.surfaceKind !== 'information' || sourcePlan.surfaceKind !== 'information'
    || plan.status !== 'layout-candidate' || sourcePlan.status !== 'layout-candidate'
    || plan.productionReady !== false || sourcePlan.productionReady !== false
    || plan.scrollRegion === null || sourcePlan.scrollRegion === null
    || plan.primitives.length > MAXIMUM_OUTPUT_PRIMITIVE_COUNT) {
    throw new RangeError('A5/A6武器语法增强只接受A6.15未晋级、未越界的weapon-index计划。');
  }
  if (new Set(plan.primitives.map(({ id }) => id)).size !== plan.primitives.length
    || new Set(sourcePlan.primitives.map(({ id }) => id)).size !== sourcePlan.primitives.length) {
    throw new RangeError('A5/A6武器语法计划含重复primitive身份。');
  }
  const entries = ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1.entries;
  const allowedSelectionIds = new Set(entries.flatMap(({ weaponDefinitionId }) => (
    SELECTION_SUFFIXES.map((suffix) => `selection:weapon:${weaponDefinitionId}:${suffix}`)
  )));
  const allowedFallbackIds = new Set(entries.flatMap(({ weaponDefinitionId }) => [
    `formal-preview:weapon:${weaponDefinitionId}:panel`,
    `formal-preview:weapon:${weaponDefinitionId}:fallback-pattern:1`,
    `formal-preview:weapon:${weaponDefinitionId}:fallback-pattern:2`,
    `formal-preview:weapon:${weaponDefinitionId}:fallback-pattern:3`,
    `formal-preview:weapon:${weaponDefinitionId}:fallback`,
  ]));
  if (plan.primitives.some(({ id }) => (
    (id.startsWith('selection:weapon:') && !allowedSelectionIds.has(id))
    || (id.startsWith('formal-preview:weapon:') && !allowedFallbackIds.has(id))
  ))) {
    throw new RangeError('A5/A6武器语法计划含未知武器、部分提交或漂移primitive。');
  }
  const sourceSelectionIds = sourcePlan.primitives
    .filter(({ id }) => id.startsWith('selection:weapon:'))
    .map(({ id }) => id);
  const expectedSourceIds = new Set(entries.flatMap(({ weaponDefinitionId }) => [
    `selection:weapon:${weaponDefinitionId}:panel`,
    `selection:weapon:${weaponDefinitionId}:label`,
    `selection:weapon:${weaponDefinitionId}:description`,
    `selection:weapon:${weaponDefinitionId}:action`,
  ]));
  if (sourceSelectionIds.length !== expectedSourceIds.size
    || sourceSelectionIds.some((id) => !expectedSourceIds.has(id))) {
    throw new RangeError('A5/A6武器语法source RenderPlan必须精确闭合20张既有四primitive卡片。');
  }
  const groups = entries.map((grammar): WeaponGrammarCardGroup => {
    const { action } = validateSourceAndOutputCore(sourcePlan, plan, grammar);
    const preview = exactPrimitive(
      plan,
      `formal-preview:weapon:${grammar.weaponDefinitionId}:panel`,
    );
    if (preview.kind !== 'panel' || preview.clipRect === null
      || preview.rect.width < 72 || preview.rect.height < 72) {
      throw new RangeError(`A5/A6武器${grammar.weaponDefinitionId}preview槽不满足A6.4下限。`);
    }
    const expected = expectedFallback(
      grammar,
      preview.rect,
      preview.clipRect,
      action.label,
    );
    const text = exactPrimitive(
      plan,
      `formal-preview:weapon:${grammar.weaponDefinitionId}:fallback`,
    );
    if (text.kind !== 'text' || !sameText(text, expected.text)) {
      throw new RangeError(`A5/A6武器${grammar.weaponDefinitionId}A6.18 fallback文字被改写。`);
    }
    const actualPanels = Object.freeze([1, 2, 3].map((ordinal) => {
      const primitive = exactPrimitive(
        plan,
        `formal-preview:weapon:${grammar.weaponDefinitionId}:fallback-pattern:${ordinal}`,
      );
      if (primitive.kind !== 'panel') throw new TypeError('A5/A6武器语法形状必须保持panel。');
      return primitive;
    })) as readonly [PanelPrimitive, PanelPrimitive, PanelPrimitive];
    const enhancedPanels = reshapePanels(grammar, preview.rect, expected.panels);
    const originalMatches = actualPanels.every((panel, index) => samePanel(panel, expected.panels[index]!));
    const enhancedMatches = actualPanels.every((panel, index) => samePanel(panel, enhancedPanels[index]!));
    if (!originalMatches && !enhancedMatches) {
      throw new RangeError(`A5/A6武器${grammar.weaponDefinitionId}几何漂移或部分提交。`);
    }
    return Object.freeze({
      grammar,
      previewRect: preview.rect,
      originalPanels: expected.panels,
      enhancedPanels,
      actualPanels,
      originalMatches,
      enhancedMatches,
    });
  });
  const originalOnly = groups.some((group) => group.originalMatches && !group.enhancedMatches);
  const enhancedOnly = groups.some((group) => group.enhancedMatches && !group.originalMatches);
  if (originalOnly && enhancedOnly) {
    throw new RangeError('A5/A6武器语法20卡不得部分提交或混用增强前后几何。');
  }
  const signatures = groups.map(({ enhancedPanels, previewRect }) => (
    panelSignature(enhancedPanels, previewRect)
  ));
  if (new Set(signatures).size !== 20) {
    throw new RangeError('A5/A6武器语法重排不得破坏A6.18的20武器纯几何唯一性。');
  }
  return Object.freeze(groups);
}

/**
 * Reframes A6.18's existing three fallback panels in place. It adds no
 * primitive and never changes the fallback text, selection action, or facts.
 */
export function addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
  plan: ArenaV2UiRenderPlanV1,
  sourceRenderPlan: ArenaV2UiRenderPlanV1,
  detailTarget: ArenaV2WeaponCollectionCombatGrammarDetailTargetCandidateV1 | null = null,
): ArenaV2UiRenderPlanV1 {
  if (isDetailSourceIdentity(sourceRenderPlan.identity)) {
    if (detailTarget === null) {
      throw new RangeError('A5/A6 weapon-detail语法增强缺少当前选择身份。');
    }
    return enhanceDetail(plan, sourceRenderPlan, detailTarget);
  }
  if (detailTarget !== null) {
    throw new RangeError('A5/A6非weapon-detail不得提交详情目标。');
  }
  if (sourceRenderPlan.identity !== SOURCE_PLAN_IDENTITY) return plan;
  const groups = collectGroups(plan, sourceRenderPlan);
  const needsEnhancement = groups.some((group) => group.originalMatches && !group.enhancedMatches);
  if (!needsEnhancement) return plan;
  const replacements = new Map<string, PanelPrimitive>();
  groups.forEach(({ enhancedPanels }) => {
    enhancedPanels.forEach((panel) => replacements.set(panel.id, panel));
  });
  if (replacements.size !== RESHAPED_PANEL_COUNT) {
    throw new RangeError('A5/A6武器语法增强必须精确重排20×3个既有panel。');
  }
  const primitives = Object.freeze(plan.primitives.map((primitive) => (
    replacements.get(primitive.id) ?? primitive
  )));
  if (primitives.length !== plan.primitives.length
    || primitives.length > MAXIMUM_OUTPUT_PRIMITIVE_COUNT) {
    throw new RangeError('A5/A6武器语法增强不得新增primitive或越过256硬上限。');
  }
  return Object.freeze({ ...plan, primitives });
}

function detailSlotClosure(): readonly Readonly<{
  detailSlotCssPixels: 200 | 260;
  uniqueWeaponGeometrySignatureCount: 20;
}>[] {
  return Object.freeze(DETAIL_SLOT_CSS_PIXELS.map((detailSlotCssPixels) => {
    const signatures = ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1
      .entries.map((grammar) => {
        const rect = Object.freeze({
          x: 0, y: 0, width: detailSlotCssPixels, height: detailSlotCssPixels,
        });
        const fallback = expectedFallback(grammar, rect, rect, grammar.weaponDefinitionId);
        return panelSignature(reshapePanels(grammar, rect, fallback.panels), rect);
      });
    if (new Set(signatures).size !== 20) {
      throw new RangeError(`A5/A6 weapon-detail ${detailSlotCssPixels}px未保持20武器整数几何身份。`);
    }
    return Object.freeze({ detailSlotCssPixels, uniqueWeaponGeometrySignatureCount: 20 as const });
  }));
}

function standardClosure(): readonly Readonly<{
  standardSlotCssPixels: 72 | 96 | 168 | 240;
  uniqueFinalGeometrySignatureCount: 22;
}>[] {
  return Object.freeze(STANDARD_SLOT_CSS_PIXELS.map((standardSlotCssPixels) => {
    const originalPatternWidths: number[] = [];
    const weaponSignatures = ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1
      .entries.map((grammar) => {
        const rect = Object.freeze({
          x: 0, y: 0, width: standardSlotCssPixels, height: standardSlotCssPixels,
        });
        const fallback = expectedFallback(grammar, rect, rect, grammar.weaponDefinitionId);
        const reshaped = reshapePanels(grammar, rect, fallback.panels);
        originalPatternWidths.push(fallback.panels[2].rect.width);
        if (reshaped[2].rect.width !== fallback.panels[2].rect.width) {
          throw new RangeError('A5/A6武器语法不得改写A6.18 pattern整数宽度身份。');
        }
        return panelSignature(reshaped, rect);
      });
    const signatureIndex = STANDARD_SLOT_CSS_PIXELS.indexOf(standardSlotCssPixels);
    const mapSignatures = ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_PRIMITIVE_GEOMETRY_CLOSURE_CANDIDATE_V1
      .entries.filter(({ kind }) => kind === 'map')
      .map(({ signatures }) => signatures[signatureIndex]!.signature);
    if (new Set(originalPatternWidths).size !== 20
      || new Set(weaponSignatures).size !== 20
      || new Set([...weaponSignatures, ...mapSignatures]).size !== 22) {
      throw new RangeError(
        `A5/A6武器语法${standardSlotCssPixels}px重排破坏A6.18b的22项几何闭包。`,
      );
    }
    return Object.freeze({ standardSlotCssPixels, uniqueFinalGeometrySignatureCount: 22 as const });
  }));
}

export const ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_FALLBACK_GEOMETRY_RENDER_PLAN_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    stage: 'A5/A6.weapon-combat-grammar-fallback-geometry' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    sourceGrammarContentHash:
      ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1.contentHash,
    weaponCount: 20 as const,
    fallbackPanelsReshapedPerWeapon: FALLBACK_PANEL_COUNT_PER_WEAPON,
    reshapedPanelCount: RESHAPED_PANEL_COUNT,
    detailFallbackPanelsReshapedPerSelectedWeapon: 3 as const,
    addedPrimitiveCount: 0 as const,
    maximumOutputPrimitiveCount: MAXIMUM_OUTPUT_PRIMITIVE_COUNT,
    preservesFallbackPrimitiveIdsRolesAndText: true as const,
    preservesSelectionTextActionsAndTouchTargets: true as const,
    colorGlyphOrTextCanSatisfyGrammarGeometry: false as const,
    preservesA6_18IntegerPanelDimensions: true as const,
    preservesA6_18UniqueIntegerPatternWidthsAtStandardSlots: true as const,
    grammarDimensionsAloneClaimTwentyUniqueWeapons: false as const,
    officialDefinitionValueDomainsFailClosed: true as const,
    geometrySignatureFormat: 'a6.18b-primary-secondary-pattern-v1' as const,
    projectsDistanceBand: false as const,
    createsResources: false as const,
    loadsAssetBytes: false as const,
    createsLeaseOrMount: false as const,
    addsPagesActionsOrInputs: false as const,
    weaponIndexWired: true as const,
    weaponDetailWired: true as const,
    detailSourceIdentityAndTargetBound: true as const,
    detailViewportIdentityAndSlotSizeBound: true as const,
    detailTitleAndPrimaryActionIdentityBound: true as const,
    approvedGltfPathReturnsOriginal: true as const,
    approvedGltfGeometryRevalidated: true as const,
    standardGeometryClosure: standardClosure(),
    detailGeometryClosure: detailSlotClosure(),
  });
