import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export interface ArenaV2InformationLongProgressReadableLayoutInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly screenId: string;
  readonly fieldId: string;
  readonly valueText: string;
  readonly textWidthCssPixels: number;
  readonly baseCardHeightCssPixels: number;
  readonly baseMaximumLines: number;
}

export interface ArenaV2InformationLongProgressReadableLayoutCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'readable-layout-candidate';
  readonly productionReady: false;
  readonly visualText: string;
  readonly maximumLines: number;
  readonly cardHeightCssPixels: number;
  readonly groupingApplied: boolean;
}

const INPUT_KEYS = new Set([
  'schemaVersion', 'screenId', 'fieldId', 'valueText',
  'textWidthCssPixels', 'baseCardHeightCssPixels', 'baseMaximumLines',
]);
const HOME_RECORDS = Object.freeze({ screenId: 'home', fieldId: 'recent-records' });
const RESULT_PROGRESS = Object.freeze({ screenId: 'result-reward', fieldId: 'earned-progress' });
const RESULT_COLLECTION = Object.freeze({
  screenId: 'result-reward',
  fieldId: 'collection-change',
});
const RESULT_RECORD = Object.freeze({
  screenId: 'result-reward',
  fieldId: 'full-match-record',
});
const RESULT_REWARD = Object.freeze({
  screenId: 'result-reward',
  fieldId: 'reward-breakdown',
});
const MATCH_PREP_WEAPON_MAP_PLAN = Object.freeze({
  screenId: 'match-prep',
  fieldId: 'weapon-map-plan',
});
const MAP_FULL_ROUTE = Object.freeze({
  screenId: 'map-detail',
  fieldId: 'full-route',
});
const MAP_WEAPON_CONSEQUENCES = Object.freeze({
  screenId: 'map-detail',
  fieldId: 'weapon-consequences',
});
const MAP_MODE_RECORDS = Object.freeze({
  screenId: 'map-detail',
  fieldId: 'mode-records',
});
const WEAPON_MAP_CONSEQUENCES = Object.freeze({
  screenId: 'weapon-detail',
  fieldId: 'map-consequences',
});
const WEAPON_RECORD = Object.freeze({
  screenId: 'weapon-detail',
  fieldId: 'weapon-record',
});
const MAX_TEXT_CODE_POINTS = 4096;
const MAX_VISIBLE_LINES = MAX_TEXT_CODE_POINTS;
const ESTIMATED_GLYPH_WIDTH_CSS_PIXELS = 20;
const RESERVED_LINE_HEIGHT_CSS_PIXELS = 24;
const HOME_WEAPON_PREFIXES = Object.freeze(['武器', '主研究', '情境', '情境研究'] as const);
const HOME_MAP_PREFIXES = Object.freeze(['地图', '路线', '路线研究'] as const);
const HOME_CHALLENGE_PREFIXES = Object.freeze(['挑战', '挑战进度'] as const);

function finiteAtLeast(value: unknown, minimum: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new RangeError(`${name}必须是大于等于${minimum}的有限数。`);
  }
  return value;
}

function target(
  screenId: string,
  fieldId: string,
):
  | 'home-records'
  | 'result-progress'
  | 'result-collection'
  | 'result-record'
  | 'result-reward'
  | 'match-prep-weapon-map-plan'
  | 'map-full-route'
  | 'map-weapon-consequences'
  | 'map-mode-records'
  | 'weapon-map-consequences'
  | 'weapon-record'
  | null {
  if (screenId === HOME_RECORDS.screenId && fieldId === HOME_RECORDS.fieldId) {
    return 'home-records';
  }
  if (screenId === RESULT_PROGRESS.screenId && fieldId === RESULT_PROGRESS.fieldId) {
    return 'result-progress';
  }
  if (screenId === RESULT_COLLECTION.screenId && fieldId === RESULT_COLLECTION.fieldId) {
    return 'result-collection';
  }
  if (screenId === RESULT_RECORD.screenId && fieldId === RESULT_RECORD.fieldId) {
    return 'result-record';
  }
  if (screenId === RESULT_REWARD.screenId && fieldId === RESULT_REWARD.fieldId) {
    return 'result-reward';
  }
  if (
    screenId === MATCH_PREP_WEAPON_MAP_PLAN.screenId
    && fieldId === MATCH_PREP_WEAPON_MAP_PLAN.fieldId
  ) {
    return 'match-prep-weapon-map-plan';
  }
  if (screenId === MAP_FULL_ROUTE.screenId && fieldId === MAP_FULL_ROUTE.fieldId) {
    return 'map-full-route';
  }
  if (
    screenId === MAP_WEAPON_CONSEQUENCES.screenId
    && fieldId === MAP_WEAPON_CONSEQUENCES.fieldId
  ) {
    return 'map-weapon-consequences';
  }
  if (screenId === MAP_MODE_RECORDS.screenId && fieldId === MAP_MODE_RECORDS.fieldId) {
    return 'map-mode-records';
  }
  if (
    screenId === WEAPON_MAP_CONSEQUENCES.screenId
    && fieldId === WEAPON_MAP_CONSEQUENCES.fieldId
  ) {
    return 'weapon-map-consequences';
  }
  if (screenId === WEAPON_RECORD.screenId && fieldId === WEAPON_RECORD.fieldId) {
    return 'weapon-record';
  }
  return null;
}

function metricName(value: string): string {
  const firstDigit = Array.from(value).findIndex((character) => /[0-9]/u.test(character));
  if (firstDigit <= 0) {
    throw new RangeError('Arena首页记录总览进度项缺少稳定名称或数字事实。');
  }
  return Array.from(value).slice(0, firstDigit).join('');
}

function exactMetricGroup(
  entries: readonly string[],
  expectedNames: readonly string[],
  groupName: string,
): readonly string[] {
  const byName = new Map<string, string>();
  for (const entry of entries) {
    const name = metricName(entry);
    if (!expectedNames.includes(name) || byName.has(name)) {
      throw new RangeError(`Arena首页记录总览${groupName}进度项身份无效。`);
    }
    byName.set(name, entry);
  }
  if (byName.size !== expectedNames.length) {
    throw new RangeError(`Arena首页记录总览${groupName}进度项不完整。`);
  }
  return Object.freeze(expectedNames.map((name) => byName.get(name)!));
}

function groupedHomeRecords(value: string): string {
  const sections = value.split('；').map((entry) => entry.trim());
  if (sections.some((entry) => entry.length === 0)) {
    throw new RangeError('Arena首页记录总览不得用空段落隐藏事实。');
  }
  if (sections.length <= 2) return value;
  if (sections.length !== 4) {
    throw new RangeError('Arena首页记录总览视觉分组需要累计、经验、模式记录和长期进度四段。');
  }
  const progress = sections[3]!.split('·').map((entry) => entry.trim());
  if (progress.some((entry) => entry.length === 0)) {
    throw new RangeError('Arena首页记录总览不得用空进度项隐藏事实。');
  }
  const grouped = new Map<string, string>();
  for (const entry of progress) {
    const name = metricName(entry);
    if (grouped.has(name)) {
      throw new RangeError('Arena首页记录总览进度项名称不得重复。');
    }
    grouped.set(name, entry);
  }
  const mode = grouped.get('模式熟练');
  const weapon = exactMetricGroup(
    progress.filter((entry) => (
      (HOME_WEAPON_PREFIXES as readonly string[]).includes(metricName(entry))
    )),
    HOME_WEAPON_PREFIXES,
    '武器',
  );
  const map = exactMetricGroup(
    progress.filter((entry) => (
      (HOME_MAP_PREFIXES as readonly string[]).includes(metricName(entry))
    )),
    HOME_MAP_PREFIXES,
    '地图',
  );
  const challengeEntries = progress.filter((entry) => (
    (HOME_CHALLENGE_PREFIXES as readonly string[]).includes(metricName(entry))
  ));
  const challenge = challengeEntries.length === 0
    ? Object.freeze([])
    : exactMetricGroup(challengeEntries, HOME_CHALLENGE_PREFIXES, '挑战');
  const expectedMetricCount = 1 + weapon.length + map.length + challenge.length;
  if (mode === undefined || grouped.size !== expectedMetricCount) {
    throw new RangeError('Arena首页记录总览长期进度视觉分组与既有四类摘要不闭合。');
  }
  return [
    `${sections[0]} · ${sections[1]}`,
    sections[2]!,
    mode,
    weapon.join(' · '),
    map.join(' · '),
    ...(challenge.length === 0 ? [] : [challenge.join(' · ')]),
  ].join('\n');
}

function groupedText(kind: ReturnType<typeof target>, value: string): string {
  if (kind === 'home-records') return groupedHomeRecords(value);
  if (
    kind === 'result-progress'
    || kind === 'result-collection'
    || kind === 'result-record'
    || kind === 'result-reward'
  ) {
    const receipts = value.split('；').map((entry) => entry.trim());
    if (receipts.some((entry) => entry.length === 0)) {
      const label = kind === 'result-progress'
        ? '进度'
        : kind === 'result-collection'
          ? '阶段与收藏'
          : kind === 'result-record'
            ? '完整对局记录'
            : '经验明细';
      throw new RangeError(`Arena结算${label}不得用空回执隐藏事实。`);
    }
    return receipts.join('\n');
  }
  if (kind === 'map-full-route') {
    const routeSegments = value.split(' → ').map((entry) => entry.trim());
    if (routeSegments.some((entry) => entry.length === 0)) {
      throw new RangeError('Arena地图详情完整路线不得用空路段隐藏事实。');
    }
    return routeSegments.join('\n');
  }
  if (kind === 'map-weapon-consequences') {
    const rawSentences = value.split('。');
    const terminalPunctuation = rawSentences[rawSentences.length - 1] === '';
    if (terminalPunctuation) rawSentences.pop();
    const sentences = rawSentences.map((entry) => entry.trim());
    if (sentences.some((entry) => entry.length === 0)) {
      throw new RangeError('Arena地图详情武器影响不得用空句隐藏事实。');
    }
    return sentences.map((sentence, index) => (
      `${sentence}${terminalPunctuation || index < sentences.length - 1 ? '。' : ''}`
    )).join('\n');
  }
  if (
    kind === 'weapon-map-consequences'
    || kind === 'weapon-record'
    || kind === 'map-mode-records'
    || kind === 'match-prep-weapon-map-plan'
  ) {
    const clauses = value.split('；').map((entry) => entry.trim());
    if (clauses.some((entry) => entry.length === 0)) {
      const label = kind === 'weapon-map-consequences'
        ? 'Arena武器详情地图后果'
        : kind === 'weapon-record'
          ? 'Arena武器详情武器记录'
          : kind === 'map-mode-records'
            ? 'Arena地图详情模式记录'
            : 'Arena竞技准备本局练法';
      throw new RangeError(`${label}不得用空子句隐藏事实。`);
    }
    return clauses.map((clause, index) => (
      `${clause}${index < clauses.length - 1 ? '；' : ''}`
    )).join('\n');
  }
  return value;
}

function estimatedLineCount(value: string, textWidthCssPixels: number): number {
  const columns = Math.max(
    1,
    Math.floor(textWidthCssPixels / ESTIMATED_GLYPH_WIDTH_CSS_PIXELS),
  );
  return value.split('\n').reduce((total, line) => (
    total + Math.max(1, Math.ceil(Array.from(line).length / columns))
  ), 0);
}

/**
 * Resolves visual wrapping and height for eleven existing fields. The input has
 * already been validated by its field owner; this function never derives facts.
 */
export function resolveArenaV2InformationLongProgressReadableLayoutCandidateV1(
  value: unknown,
): ArenaV2InformationLongProgressReadableLayoutCandidateV1 {
  const source = assertPlainRecord(
    cloneFrozenData(value, 'ArenaV2InformationLongProgressReadableLayoutInputCandidateV1'),
    'ArenaV2InformationLongProgressReadableLayoutInputCandidateV1',
  );
  assertKnownKeys(
    source,
    INPUT_KEYS,
    'ArenaV2InformationLongProgressReadableLayoutInputCandidateV1',
  );
  for (const key of INPUT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`ArenaV2InformationLongProgressReadableLayoutInputCandidateV1缺少${key}。`);
    }
  }
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena V2长期进度可读布局schemaVersion无效。');
  }
  const screenId = assertNonEmptyString(source.screenId, 'Arena V2长期进度screenId');
  const fieldId = assertNonEmptyString(source.fieldId, 'Arena V2长期进度fieldId');
  const valueText = assertNonEmptyString(source.valueText, 'Arena V2长期进度valueText');
  if (valueText.includes('\n') || valueText.includes('\r')) {
    throw new RangeError('Arena V2长期进度上游文本不得预置换行。');
  }
  if (Array.from(valueText).length > MAX_TEXT_CODE_POINTS) {
    throw new RangeError('Arena V2长期进度文本超过有界视觉合同。');
  }
  const textWidthCssPixels = finiteAtLeast(
    source.textWidthCssPixels,
    1,
    'Arena V2长期进度textWidthCssPixels',
  );
  const baseCardHeightCssPixels = finiteAtLeast(
    source.baseCardHeightCssPixels,
    1,
    'Arena V2长期进度baseCardHeightCssPixels',
  );
  const baseMaximumLines = finiteAtLeast(
    source.baseMaximumLines,
    1,
    'Arena V2长期进度baseMaximumLines',
  );
  if (!Number.isSafeInteger(baseMaximumLines)) {
    throw new RangeError('Arena V2长期进度baseMaximumLines必须是安全整数。');
  }
  const kind = target(screenId, fieldId);
  if (kind === null) {
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'readable-layout-candidate' as const,
      productionReady: false as const,
      visualText: valueText,
      maximumLines: baseMaximumLines,
      cardHeightCssPixels: baseCardHeightCssPixels,
      groupingApplied: false,
    });
  }
  const visualText = groupedText(kind, valueText);
  const contentLines = estimatedLineCount(visualText, textWidthCssPixels);
  if (contentLines > MAX_VISIBLE_LINES) {
    throw new RangeError('Arena V2长期进度文本超过4096行有界视觉合同。');
  }
  const maximumLines = Math.max(baseMaximumLines, contentLines);
  const overflowLines = Math.max(0, contentLines - baseMaximumLines);
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'readable-layout-candidate' as const,
    productionReady: false as const,
    visualText,
    maximumLines,
    cardHeightCssPixels: baseCardHeightCssPixels
      + Math.ceil(overflowLines * RESERVED_LINE_HEIGHT_CSS_PIXELS),
    groupingApplied: visualText !== valueText || contentLines > 2,
  });
}

export const ARENA_V2_INFORMATION_LONG_PROGRESS_READABLE_LAYOUT_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    targetFieldIds: Object.freeze([
      'recent-records',
      'earned-progress',
      'collection-change',
      'full-match-record',
      'reward-breakdown',
      'weapon-map-plan',
      'full-route',
      'weapon-consequences',
      'mode-records',
      'map-consequences',
      'weapon-record',
    ] as const),
    fieldCountAdded: 0 as const,
    primitiveCountAdded: 0 as const,
    pageCountAdded: 0 as const,
    actionCountAdded: 0 as const,
    ownsDomCanvasThreeOrMediaResources: false as const,
    derivesProgressRewardOrAuthorityFacts: false as const,
    reducedMotionChangesInformation: false as const,
    mutedChangesInformation: false as const,
  });
