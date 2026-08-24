import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import type {
  ArenaV2InformationFieldSourceV1,
} from './arena-v2-information-field-composition-v1.js';
import type {
  ArenaV2InformationFieldValueV1,
} from './arena-v2-information-screen-view-model-v1.js';
import {
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
} from './arena-v2-information-presentation-content-v1.js';
import {
  projectArenaV2WeaponMapLearningCandidateV1,
} from './arena-v2-weapon-map-learning-projection-candidate-v1.js';
import { ProductMessageCatalog } from './product-message-catalog.js';

interface WeaponActionReadEntryV1 {
  readonly context: 'ground' | 'aerial';
  readonly actionDefinitionId: string;
  readonly resultMessageId: string;
  readonly failureRisk: string;
  readonly counterInputs: readonly string[];
  readonly mapSituations: readonly string[];
  readonly targetingKind: string;
  readonly range: number;
  readonly coverageKind: 'radius' | 'facing-dot';
  readonly coverageValue: number;
  readonly windupTicks: number;
  readonly activeTicks: number;
  readonly recoveryTicks: number;
  readonly cooldownTicks: number;
  readonly primaryGesture: 'press' | 'hold-release';
  readonly commitment: Readonly<{
    readonly commitTicks: number;
    readonly expireTicks: number;
    readonly expireOutcome: 'cancel' | 'release';
    readonly canTurn: boolean;
    readonly levelThresholds: readonly number[];
  }> | null;
}

interface WeaponModeReadEntryV1 {
  readonly modeKind: 'duel' | 'race' | 'survival';
  readonly mapSituations: readonly string[];
}

interface WeaponReadEntryV1 {
  readonly weaponDefinitionId: string;
  readonly catalogId: string;
  readonly collectionOrder: number;
  readonly sourceBatch: 'launch-six' | 'collection-expansion';
  readonly nameMessageId: string;
  readonly learningProblemMessageId: string;
  readonly coreVerb: string;
  readonly actions: readonly WeaponActionReadEntryV1[];
  readonly modeConsequences: readonly WeaponModeReadEntryV1[];
}

interface MapSegmentReadEntryV1 {
  readonly segmentDefinitionId: string;
  readonly ordinal: number;
  readonly nameMessageId: string;
  readonly lessonMessageId: string;
  readonly kind: string;
  readonly survivalRole: string;
  readonly responseOptions: readonly string[];
  readonly responseWindowTicks: number;
  readonly hitRecovery: string;
  readonly difficulty: Readonly<{
    readonly distance: number;
    readonly rhythm: number;
    readonly turn: number;
    readonly route: number;
    readonly recovery: number;
    readonly combat: number;
  }>;
  readonly branchCount: number;
  readonly supplyPointId: string;
  readonly pacingArc: 'two-cycle-branch-escalation' | 'cardinal-switchback-sawtooth';
  readonly cycleOrdinal: 1 | 2;
  readonly experienceBeat:
    | 'introduce'
    | 'develop'
    | 'twist'
    | 'test'
    | 'climax'
    | 'release'
    | 'resolution';
  readonly experienceIntensity: 1 | 2 | 3 | 4 | 5;
  readonly landmarkCue: string;
  readonly leadingLineCue: string;
  readonly memoryHook: string;
  readonly raceRead: string;
  readonly survivalRead: string;
}

interface MapReadEntryV1 {
  readonly mapDefinitionId: string;
  readonly routeDefinitionId: string;
  readonly nameMessageId: string;
  readonly minimumParticipants: number;
  readonly maximumParticipants: number;
  readonly respawnDelayTicks: number;
  readonly segments: readonly MapSegmentReadEntryV1[];
}

export interface ArenaV2InformationContentReadCatalogV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly formalVisualAssetsReady: false;
  readonly ownerId: 'p5-content';
  readonly weaponCount: 20;
  readonly mapCount: 2;
  readonly mapSegmentCount: 20;
  readonly weapons: readonly WeaponReadEntryV1[];
  readonly maps: readonly MapReadEntryV1[];
  readonly contentHash: string;
}

export interface ArenaV2WeaponCollectionReadItemV1 {
  readonly weaponDefinitionId: string;
  readonly collectionOrder: number;
  readonly displayName: string;
  readonly learningFocus: string;
  readonly coreVerb: string;
}

export interface ArenaV2MapSegmentCollectionReadItemV1 {
  readonly segmentDefinitionId: string;
  readonly ordinal: number;
  readonly displayName: string;
  readonly learningFocus: string;
  readonly segmentKind: string;
  readonly survivalRole: string;
}

export interface ArenaV2MapCollectionReadItemV1 {
  readonly mapDefinitionId: string;
  readonly displayName: string;
  readonly participantRange: string;
  readonly segments: readonly ArenaV2MapSegmentCollectionReadItemV1[];
}

export interface ArenaV2InformationCollectionContentProjectionV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly ownerId: 'p5-content';
  readonly weapons: readonly ArenaV2WeaponCollectionReadItemV1[];
  readonly maps: readonly ArenaV2MapCollectionReadItemV1[];
  readonly sourceContentHash: string;
  readonly contentHash: string;
}

export interface ArenaV2CompetitiveWeaponMapLearningContextV1 {
  readonly modeKind: 'duel' | 'race';
  readonly weaponDefinitionId: string;
  readonly mapDefinitionId: string;
}

export interface ArenaV2WeaponOperationReadProjectionV1 {
  readonly weaponDefinitionId: string;
  readonly catalogId: string;
  readonly visibleText: '按一下' | '按住松开';
  readonly compactText: string;
  readonly accessibilityText: string;
  readonly groundResult: string;
  readonly aerialResult: string;
}

export interface ArenaV2WeaponCoreFightReadProjectionV1 {
  readonly weaponDefinitionId: string;
  readonly catalogId: string;
  readonly displayName: string;
  readonly coreVerb: string;
  readonly operation: ArenaV2WeaponOperationReadProjectionV1;
  readonly tradeoff: string;
  readonly visibleText: string;
  readonly compactText: string;
  readonly accessibilityText: string;
}

export type ArenaV2MapRouteSkeletonStageV1 =
  | '起步'
  | '第一次变化'
  | '第一次高潮'
  | '收官';

export interface ArenaV2MapRouteSkeletonAnchorReadV1 {
  readonly stage: ArenaV2MapRouteSkeletonStageV1;
  readonly segmentDefinitionId: string;
  readonly ordinal: number;
  readonly displayName: string;
  readonly learningFocus: string;
}

export interface ArenaV2MapRouteSkeletonReadProjectionV1 {
  readonly mapDefinitionId: string;
  readonly displayName: string;
  readonly visibleText: string;
  readonly compactText: string;
  readonly accessibilityText: string;
  readonly anchors: readonly ArenaV2MapRouteSkeletonAnchorReadV1[];
}

const COMPETITIVE_LEARNING_CONTEXT_KEYS = new Set([
  'modeKind',
  'weaponDefinitionId',
  'mapDefinitionId',
]);

function competitiveLearningContext(
  value: ArenaV2CompetitiveWeaponMapLearningContextV1 | undefined,
): ArenaV2CompetitiveWeaponMapLearningContextV1 | undefined {
  if (value === undefined) return undefined;
  const source = cloneFrozenData(value, 'ArenaV2CompetitiveWeaponMapLearningContextV1');
  assertKnownKeys(
    source,
    COMPETITIVE_LEARNING_CONTEXT_KEYS,
    'ArenaV2CompetitiveWeaponMapLearningContextV1',
  );
  for (const key of COMPETITIVE_LEARNING_CONTEXT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`ArenaV2CompetitiveWeaponMapLearningContextV1缺少${key}。`);
    }
  }
  if (source.modeKind !== 'duel' && source.modeKind !== 'race') {
    throw new RangeError('Arena V2详情武器地图学习只接受1v1或竞速上下文。');
  }
  return Object.freeze({
    modeKind: source.modeKind,
    weaponDefinitionId: assertNonEmptyString(
      source.weaponDefinitionId,
      'Arena V2详情学习weaponDefinitionId',
    ),
    mapDefinitionId: assertNonEmptyString(
      source.mapDefinitionId,
      'Arena V2详情学习mapDefinitionId',
    ),
  });
}

function record(value: unknown, name: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是对象。`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function assertCatalog(value: unknown): ArenaV2InformationContentReadCatalogV1 {
  const catalog = record(value, 'ArenaV2InformationContentReadCatalogV1');
  if (catalog.schemaVersion !== 1 || catalog.status !== 'production-unreachable'
    || catalog.hardGate !== false || catalog.defaultSurfaceWired !== false
    || catalog.formalVisualAssetsReady !== false || catalog.ownerId !== 'p5-content'
    || catalog.weaponCount !== 20 || catalog.mapCount !== 2
    || catalog.mapSegmentCount !== 20 || !Array.isArray(catalog.weapons)
    || !Array.isArray(catalog.maps) || catalog.weapons.length !== 20
    || catalog.maps.length !== 2 || typeof catalog.contentHash !== 'string'
    || catalog.contentHash.length === 0) {
    throw new RangeError('Arena V2信息内容目录边界或数量不闭合。');
  }
  const segmentCount = catalog.maps.reduce((total, mapValue, index) => {
    const map = record(mapValue, `ArenaV2InformationContentReadCatalogV1.maps[${index}]`);
    if (!Array.isArray(map.segments) || map.segments.length === 0) {
      throw new RangeError(`Arena V2信息内容目录地图${index}缺少地图段落。`);
    }
    return total + map.segments.length;
  }, 0);
  if (segmentCount !== 20) {
    throw new RangeError('Arena V2信息内容目录必须精确包含20个地图段落。');
  }
  return value as ArenaV2InformationContentReadCatalogV1;
}

function requireMessageCatalog(value: unknown): ProductMessageCatalog {
  if (!(value instanceof ProductMessageCatalog)) {
    throw new TypeError('Arena V2信息内容投影需要受支持的中文MessageCatalog。');
  }
  return value;
}

function text(catalog: ProductMessageCatalog, messageId: string): string {
  return catalog.require(messageId);
}

function fixed(value: number): string {
  if (!Number.isFinite(value)) throw new RangeError('Arena V2信息数值必须有限。');
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/u, '').replace(/\.$/u, '');
}

function localizedEnum(
  catalog: ProductMessageCatalog,
  prefix: string,
  value: string,
): string {
  return text(catalog, `arena.v2.${prefix}.${value}`);
}

function field(
  fieldId: string,
  valueText: string,
  accessibilityText = valueText,
  fixedWidthNumeric = false,
): ArenaV2InformationFieldValueV1 {
  return Object.freeze({
    fieldId,
    labelMessageId: `arena.v2.field.${fieldId}`,
    valueText,
    accessibilityText,
    fixedWidthNumeric,
  });
}

function requireWeapon(
  catalog: ArenaV2InformationContentReadCatalogV1,
  weaponDefinitionId: string,
): WeaponReadEntryV1 {
  const weapon = catalog.weapons.find((entry) => (
    entry.weaponDefinitionId === weaponDefinitionId
  ));
  if (!weapon) throw new RangeError(`Arena V2信息目录没有武器${weaponDefinitionId}。`);
  if (weapon.actions.length !== 2 || weapon.actions[0]?.context !== 'ground'
    || weapon.actions[1]?.context !== 'aerial') {
    throw new RangeError(`Arena V2武器${weaponDefinitionId}缺少地面/空中阅读上下文。`);
  }
  return weapon;
}

function requireMap(
  catalog: ArenaV2InformationContentReadCatalogV1,
  mapDefinitionId: string,
): MapReadEntryV1 {
  const map = catalog.maps.find((entry) => entry.mapDefinitionId === mapDefinitionId);
  if (!map) throw new RangeError(`Arena V2信息目录没有地图${mapDefinitionId}。`);
  return map;
}

function coverageText(action: WeaponActionReadEntryV1): string {
  return action.coverageKind === 'radius'
    ? `覆盖半径${fixed(action.coverageValue)}格`
    : `朝向阈值${fixed(action.coverageValue)}（数值越低覆盖越宽）`;
}

function modeLabel(modeKind: WeaponModeReadEntryV1['modeKind']): string {
  if (modeKind === 'duel') return '1v1';
  if (modeKind === 'race') return '竞速';
  return '生存';
}

function competitiveLearningProjection(
  contentCatalog: ArenaV2InformationContentReadCatalogV1,
  messages: ProductMessageCatalog,
  value: ArenaV2CompetitiveWeaponMapLearningContextV1 | undefined,
) {
  const context = competitiveLearningContext(value);
  if (context === undefined) return null;
  if (contentCatalog.contentHash
    !== ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.contentHash
    || messages.getContentHash()
      !== ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.getContentHash()) {
    throw new RangeError('Arena V2详情武器地图学习目录与共享投影身份不一致。');
  }
  return projectArenaV2WeaponMapLearningCandidateV1({
    modeKind: context.modeKind,
    weaponDefinitionIds: [context.weaponDefinitionId],
    mapDefinitionId: context.mapDefinitionId,
    focusPolicy: 'exactly-one',
    unknownMapPolicy: 'fail-closed',
  });
}

function unique<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...new Set(values)]);
}

const PLAYER_VISIBLE_TICK_RATE_HZ = ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz;

function playerDurationText(ticks: number): string {
  if (!Number.isSafeInteger(ticks) || ticks < 0) {
    throw new RangeError('Arena V2内容展示时间必须是非负安全整数tick。');
  }
  if (ticks === 0) return '0秒';
  const tenths = Math.ceil((ticks / PLAYER_VISIBLE_TICK_RATE_HZ) * 10);
  return tenths % 10 === 0
    ? `${tenths / 10}秒`
    : `${(tenths / 10).toFixed(1)}秒`;
}

function primaryGestureText(weapon: WeaponReadEntryV1): string {
  const commitments = weapon.actions.flatMap((action) => (
    action.commitment === null ? [] : [action.commitment]
  ));
  if (commitments.length === 0) return '按下攻击开始出招';
  const minimumCommitTicks = Math.min(...commitments.map(({ commitTicks }) => commitTicks));
  const maximumExpireTicks = Math.max(...commitments.map(({ expireTicks }) => expireTicks));
  const allAutoRelease = commitments.every(({ expireOutcome }) => expireOutcome === 'release');
  const turnCopy = commitments.every(({ canTurn }) => !canTurn) ? '，蓄势中不能转向' : '';
  return `按住攻击至少${playerDurationText(minimumCommitTicks)}后松开`
    + `${turnCopy}；最迟${playerDurationText(maximumExpireTicks)}${
      allAutoRelease ? '自动释放' : '自动取消'
    }`;
}

function primaryGestureSummaryText(weapon: WeaponReadEntryV1): string {
  return unique(weapon.actions.map(({ primaryGesture }) => (
    primaryGesture === 'press' ? '按一下' : '按住松开'
  ))).join(' / ');
}

export function projectArenaV2WeaponOperationReadV1(
  contentCatalogValue: unknown,
  messageCatalogValue: unknown,
  weaponIdentity: string,
): ArenaV2WeaponOperationReadProjectionV1 {
  const contentCatalog = assertCatalog(contentCatalogValue);
  const messages = requireMessageCatalog(messageCatalogValue);
  const identity = assertNonEmptyString(weaponIdentity, 'Arena V2武器操作读取身份');
  const weapon = contentCatalog.weapons.find((entry) => (
    entry.weaponDefinitionId === identity || entry.catalogId === identity
  ));
  if (weapon === undefined) {
    throw new RangeError(`Arena V2武器操作目录没有${identity}。`);
  }
  const ground = weapon.actions[0];
  const aerial = weapon.actions[1];
  if (ground?.context !== 'ground' || aerial?.context !== 'aerial') {
    throw new RangeError(`Arena V2武器${weapon.catalogId}缺少地面/空中操作上下文。`);
  }
  const compactText = primaryGestureSummaryText(weapon);
  if (compactText !== '按一下' && compactText !== '按住松开') {
    throw new RangeError(`Arena V2武器${weapon.catalogId}的地面/空中基础手势不一致。`);
  }
  return Object.freeze({
    weaponDefinitionId: weapon.weaponDefinitionId,
    catalogId: weapon.catalogId,
    visibleText: compactText,
    compactText,
    accessibilityText: primaryGestureText(weapon),
    groundResult: text(messages, ground.resultMessageId),
    aerialResult: text(messages, aerial.resultMessageId),
  });
}

export function projectArenaV2WeaponCoreFightReadV1(
  contentCatalogValue: unknown,
  messageCatalogValue: unknown,
  weaponIdentity: string,
): ArenaV2WeaponCoreFightReadProjectionV1 {
  const contentCatalog = assertCatalog(contentCatalogValue);
  const messages = requireMessageCatalog(messageCatalogValue);
  const operation = projectArenaV2WeaponOperationReadV1(
    contentCatalog,
    messages,
    weaponIdentity,
  );
  const weapon = requireWeapon(contentCatalog, operation.weaponDefinitionId);
  const displayName = text(messages, weapon.nameMessageId);
  const coreVerb = localizedEnum(messages, 'verb', weapon.coreVerb);
  const tradeoff = text(messages, weapon.learningProblemMessageId);
  const compactText = `${coreVerb}｜${operation.compactText}｜${tradeoff}`;
  return Object.freeze({
    weaponDefinitionId: weapon.weaponDefinitionId,
    catalogId: weapon.catalogId,
    displayName,
    coreVerb,
    operation,
    tradeoff,
    visibleText: compactText,
    compactText,
    accessibilityText: `${displayName}。核心动词：${coreVerb}。主要取舍：${tradeoff} `
      + `操作：${operation.accessibilityText}。地面：${operation.groundResult} `
      + `空中：${operation.aerialResult}`,
  });
}

export function arenaV2MapExperienceBeatTextV1(
  value: MapSegmentReadEntryV1['experienceBeat'],
): string {
  const labels = {
    introduce: '入门', develop: '展开', twist: '变化', test: '考验',
    climax: '高潮', release: '缓冲', resolution: '收束',
  } as const;
  return labels[value];
}

export function arenaV2MapLandmarkCueTextV1(value: string): string {
  const labels: Readonly<Record<string, string>> = Object.freeze({
    'start-deck': '起步台',
    'landing-island': '落点岛',
    'stair-crown': '阶梯顶',
    'route-fork': '路线分岔',
    'narrow-bridge': '窄桥',
    'wire-choice': '钢丝双路',
    'reset-deck': '重置台',
    'stair-tower': '高阶塔',
    'elevated-fork': '高位分岔',
    'narrow-spine': '窄脊',
    'finish-wire': '终局钢丝',
    'cardinal-corner': '直角转角',
    'reversal-wire': '反向钢丝',
    'descent-rungs': '下行阶',
    'north-landing': '北侧落点',
    'finish-deck': '终点台',
  });
  const label = labels[value];
  if (label === undefined) throw new RangeError(`Arena V2地图详情缺少地标文案${value}。`);
  return label;
}

function mapRouteMemoryAnchors(
  map: MapReadEntryV1,
): readonly Readonly<{
  readonly stage: ArenaV2MapRouteSkeletonStageV1;
  readonly segment: MapSegmentReadEntryV1;
}>[] {
  const first = map.segments[0];
  const firstTwist = map.segments.find(({ experienceBeat }) => experienceBeat === 'twist');
  const firstClimax = map.segments.find(({ experienceBeat }) => experienceBeat === 'climax');
  const finish = map.segments[map.segments.length - 1];
  if (first === undefined || firstTwist === undefined || firstClimax === undefined
    || finish === undefined) {
    throw new RangeError(`Arena V2地图${map.mapDefinitionId}缺少四段路线记忆骨架。`);
  }
  const segments = [first, firstTwist, firstClimax, finish];
  if (new Set(segments.map(({ segmentDefinitionId }) => segmentDefinitionId)).size !== 4) {
    throw new RangeError(`Arena V2地图${map.mapDefinitionId}的路线记忆骨架必须精确包含四个不同路段。`);
  }
  return Object.freeze([
    Object.freeze({ stage: '起步' as const, segment: first }),
    Object.freeze({ stage: '第一次变化' as const, segment: firstTwist }),
    Object.freeze({ stage: '第一次高潮' as const, segment: firstClimax }),
    Object.freeze({ stage: '收官' as const, segment: finish }),
  ]);
}

export function projectArenaV2MapRouteSkeletonReadV1(
  contentCatalogValue: unknown,
  messageCatalogValue: unknown,
  mapDefinitionId: string,
): ArenaV2MapRouteSkeletonReadProjectionV1 {
  const contentCatalog = assertCatalog(contentCatalogValue);
  const messages = requireMessageCatalog(messageCatalogValue);
  const identity = assertNonEmptyString(mapDefinitionId, 'Arena V2地图路线骨架身份');
  const map = requireMap(contentCatalog, identity);
  const anchors = Object.freeze(mapRouteMemoryAnchors(map).map(({ stage, segment }) => (
    Object.freeze({
      stage,
      segmentDefinitionId: segment.segmentDefinitionId,
      ordinal: segment.ordinal,
      displayName: text(messages, segment.nameMessageId),
      learningFocus: text(messages, segment.lessonMessageId),
    })
  )));
  return Object.freeze({
    mapDefinitionId: map.mapDefinitionId,
    displayName: text(messages, map.nameMessageId),
    visibleText: anchors.map(({ displayName }) => displayName).join(' → '),
    compactText: anchors.map(({ displayName }) => displayName).join('→'),
    accessibilityText: anchors.map(({ stage, ordinal, displayName, learningFocus }) => (
      `${stage}：第${ordinal}段${displayName}，${learningFocus}`
    )).join('；'),
    anchors,
  });
}

/**
 * Provides the content-owned five fields of weapon-detail. Profile history is
 * deliberately excluded and must come from the P6 owner.
 */
export function projectArenaV2WeaponDetailContentFieldsV1(
  contentCatalogValue: unknown,
  messageCatalogValue: unknown,
  weaponDefinitionId: string,
  learningContext?: ArenaV2CompetitiveWeaponMapLearningContextV1,
): ArenaV2InformationFieldSourceV1 {
  const contentCatalog = assertCatalog(contentCatalogValue);
  const messages = requireMessageCatalog(messageCatalogValue);
  const weapon = requireWeapon(contentCatalog, weaponDefinitionId);
  const ground = weapon.actions[0]!;
  const aerial = weapon.actions[1]!;
  const coreFight = projectArenaV2WeaponCoreFightReadV1(
    contentCatalog,
    messages,
    weaponDefinitionId,
  );
  const name = text(messages, weapon.nameMessageId);
  const counterInputs = unique(weapon.actions.flatMap(({ counterInputs: inputs }) => inputs));
  const learning = competitiveLearningProjection(contentCatalog, messages, learningContext);
  if (learning !== null && learning.weaponDefinitionId !== weaponDefinitionId) {
    throw new RangeError('Arena V2武器详情与竞技学习武器身份不一致。');
  }
  const modeConsequences = weapon.modeConsequences.map((consequence) => {
    const situations = consequence.mapSituations.map((situation) => (
      localizedEnum(messages, 'map-situation', situation)
    ));
    return `${modeLabel(consequence.modeKind)}：${situations.join('、')}`;
  });
  return Object.freeze({
    ownerId: contentCatalog.ownerId,
    fieldValues: Object.freeze([
      field(
        'range-coverage',
        `${name}｜地面${fixed(ground.range)}格·${coverageText(ground)}；空中${fixed(aerial.range)}格·${coverageText(aerial)}`,
      ),
      field(
        'timing-risk',
        `地面 前摇${playerDurationText(ground.windupTicks)}/有效${playerDurationText(ground.activeTicks)}/恢复${playerDurationText(ground.recoveryTicks)}/冷却${playerDurationText(ground.cooldownTicks)}，${localizedEnum(messages, 'risk', ground.failureRisk)}；空中 前摇${playerDurationText(aerial.windupTicks)}/有效${playerDurationText(aerial.activeTicks)}/恢复${playerDurationText(aerial.recoveryTicks)}/冷却${playerDurationText(aerial.cooldownTicks)}，${localizedEnum(messages, 'risk', aerial.failureRisk)}`,
        undefined,
        true,
      ),
      field(
        'ground-aerial',
        `核心：${coreFight.compactText}`,
        coreFight.accessibilityText,
      ),
      field(
        'counter-inputs',
        counterInputs.length === 0
          ? '依靠站位与出手时机反制'
          : counterInputs.map((input) => localizedEnum(messages, 'counter', input)).join('、'),
      ),
      field(
        'map-consequences',
        `${text(messages, weapon.learningProblemMessageId)} ${modeConsequences.join('；')}`
          + (learning === null
            ? ''
            : `；当前${modeLabel(learning.modeKind)}地图${learning.mapDisplayName}`
              + `优先练${learning.practiceSummary}`),
      ),
    ]),
  });
}

/**
 * Provides the content-owned four fields of map-detail. Best records and mode
 * records remain owned by the P6 Profile projection.
 */
export function projectArenaV2MapDetailContentFieldsV1(
  contentCatalogValue: unknown,
  messageCatalogValue: unknown,
  mapDefinitionId: string,
  learningContext?: ArenaV2CompetitiveWeaponMapLearningContextV1,
): ArenaV2InformationFieldSourceV1 {
  const contentCatalog = assertCatalog(contentCatalogValue);
  const messages = requireMessageCatalog(messageCatalogValue);
  const map = requireMap(contentCatalog, mapDefinitionId);
  const name = text(messages, map.nameMessageId);
  const learning = competitiveLearningProjection(contentCatalog, messages, learningContext);
  if (learning !== null && learning.mapDefinitionId !== mapDefinitionId) {
    throw new RangeError('Arena V2地图详情与竞技学习地图身份不一致。');
  }
  const roles = new Map<string, number>();
  let maximumDifficulty = 0;
  let branchCount = 0;
  for (const segment of map.segments) {
    roles.set(segment.survivalRole, (roles.get(segment.survivalRole) ?? 0) + 1);
    maximumDifficulty = Math.max(maximumDifficulty, ...Object.values(segment.difficulty));
    branchCount += segment.branchCount;
  }
  const route = map.segments.map((segment) => (
    `${segment.ordinal}.${text(messages, segment.nameMessageId)}`
    + `［${arenaV2MapExperienceBeatTextV1(segment.experienceBeat)}·强度${segment.experienceIntensity}`
    + `·${arenaV2MapLandmarkCueTextV1(segment.landmarkCue)}］`
    + `（${text(messages, segment.lessonMessageId)}）`
  ));
  const roleSummary = [...roles.entries()].map(([role, count]) => (
    `${localizedEnum(messages, 'survival-role', role)}${count}段`
  ));
  const precisionKinds = unique(map.segments.map(({ kind }) => kind)).map((kind) => (
    localizedEnum(messages, 'segment-kind', kind)
  ));
  const pacingArc = map.segments[0]!.pacingArc === 'two-cycle-branch-escalation'
    ? '两轮分支递进，中段重置后进入终局组合'
    : '方向折返锯齿，在钢丝峰值后下降缓冲再收官';
  const landmarkRoute = map.segments.map(
    ({ landmarkCue }) => arenaV2MapLandmarkCueTextV1(landmarkCue),
  );
  const routeSkeleton = projectArenaV2MapRouteSkeletonReadV1(
    contentCatalog,
    messages,
    mapDefinitionId,
  );
  const dangerSummary = `${roleSummary.join('；')}；共${branchCount}条分支，`
    + `最高难度${maximumDifficulty}/4；掉落后${
      playerDurationText(map.respawnDelayTicks)
    }在安全锚点恢复`;
  return Object.freeze({
    ownerId: contentCatalog.ownerId,
    fieldValues: Object.freeze([
      field(
        'route-goal',
        `${name}｜${map.segments.length}段｜${map.minimumParticipants}–${map.maximumParticipants}人｜只用方向与跳跃到达终点｜${pacingArc}`,
        undefined,
        true,
      ),
      field(
        'hazard-summary',
        routeSkeleton.visibleText,
        `路线骨架。${routeSkeleton.accessibilityText}。`,
      ),
      field('full-route', `${route.join(' → ')}。危险统计：${dangerSummary}`),
      field(
        'weapon-consequences',
        `地标顺序：${landmarkRoute.join('→')}。每段都有一个武器供给点；${precisionKinds.join('、')}会放大推离、拉取、压制和侧袭对落点的影响，快速分支更暴露，恢复分支更稳。`
          + (learning === null
            ? ''
            : ` 当前${modeLabel(learning.modeKind)}武器${learning.weaponDisplayName}`
              + `优先练${learning.practiceSummary}。`),
      ),
    ]),
  });
}

/** Creates the static 20-weapon / 2-map / 20-segment lists used by collection pages. */
export function projectArenaV2InformationCollectionContentV1(
  contentCatalogValue: unknown,
  messageCatalogValue: unknown,
): ArenaV2InformationCollectionContentProjectionV1 {
  const contentCatalog = assertCatalog(contentCatalogValue);
  const messages = requireMessageCatalog(messageCatalogValue);
  const weapons = Object.freeze(contentCatalog.weapons.map((weapon) => Object.freeze({
    weaponDefinitionId: weapon.weaponDefinitionId,
    collectionOrder: weapon.collectionOrder,
    displayName: text(messages, weapon.nameMessageId),
    learningFocus: text(messages, weapon.learningProblemMessageId),
    coreVerb: localizedEnum(messages, 'verb', weapon.coreVerb),
  })));
  const maps = Object.freeze(contentCatalog.maps.map((map) => Object.freeze({
    mapDefinitionId: map.mapDefinitionId,
    displayName: text(messages, map.nameMessageId),
    participantRange: `${map.minimumParticipants}–${map.maximumParticipants}人`,
    segments: Object.freeze(map.segments.map((segment) => Object.freeze({
      segmentDefinitionId: segment.segmentDefinitionId,
      ordinal: segment.ordinal,
      displayName: text(messages, segment.nameMessageId),
      learningFocus: text(messages, segment.lessonMessageId),
      segmentKind: localizedEnum(messages, 'segment-kind', segment.kind),
      survivalRole: localizedEnum(messages, 'survival-role', segment.survivalRole),
    }))),
  })));
  const projection = Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    ownerId: contentCatalog.ownerId,
    weapons,
    maps,
    sourceContentHash: contentCatalog.contentHash,
  });
  return Object.freeze({
    ...projection,
    contentHash: createDeterministicDataHash(
      projection,
      'Arena V2 Information Collection Content Projection V1',
    ),
  });
}

export const ARENA_V2_INFORMATION_CONTENT_READ_PROJECTION_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  ownerId: 'p5-content' as const,
  weaponCount: 20 as const,
  mapCount: 2 as const,
  mapSegmentCount: 20 as const,
  weaponDetailFirstViewLeadsWithCoreVerbAndTradeoff: true as const,
  weaponDetailCoreReadoutUsesExistingGroundAerialField: true as const,
  mapDetailFirstViewUsesFourAnchorRouteSkeleton: true as const,
  mapDetailFullRouteRetainsDangerStatistics: true as const,
  mapRouteSkeletonReadSharedByDirectoryAndDetail: true as const,
  mapRouteSkeletonReadSharedByDirectoryDetailAndPreparation: true as const,
  mapRouteSkeletonReadSharedByDirectoryDetailPreparationResultAndMode: true as const,
  weaponOperationReadSharedByDetailDirectoryAndHud: true as const,
  weaponCoreFightReadSharedByDirectoryDetailPreparationAndResult: true as const,
  weaponCoreFightReadSharedByDirectoryDetailPreparationResultAndMode: true as const,
  weaponOperationReadNormalizesDefinitionAndCatalogIdentity: true as const,
  weaponOperationReadRejectsGroundAerialGestureDrift: true as const,
  competitiveWeaponMapDetailLearningUsesSharedProjection: true as const,
  survivalPreselectedWeaponLearningAllowed: false as const,
  validationStatus: 'not-run' as const,
});
