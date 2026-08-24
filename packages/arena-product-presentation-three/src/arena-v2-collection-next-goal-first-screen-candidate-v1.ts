import {
  ARENA_V2_INFORMATION_UI_INTENT_V1 as INTENT,
  type ArenaV2InformationUiIntentV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
  ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
} from '@number-strategy-jump/arena-product-progression';

export const ARENA_V2_A6_COLLECTION_NEXT_GOAL_FIRST_SCREEN_SCHEMA_VERSION_V1 = 1 as const;

export const ARENA_V2_A6_COLLECTION_NEXT_GOAL_SOURCE_STATE_V1 = Object.freeze({
  READY: 'ready',
  LOADING: 'loading',
  EMPTY: 'empty',
  ERROR: 'error',
  FUTURE_PROFILE: 'future-profile',
} as const);

export const ARENA_V2_A6_COLLECTION_NEXT_GOAL_VIEW_STATE_V1 = Object.freeze({
  ACTIVE: 'active',
  DESTROYED: 'destroyed',
} as const);

export type ArenaV2A6CollectionNextGoalSourceStateV1 =
  typeof ARENA_V2_A6_COLLECTION_NEXT_GOAL_SOURCE_STATE_V1[
    keyof typeof ARENA_V2_A6_COLLECTION_NEXT_GOAL_SOURCE_STATE_V1
  ];
export type ArenaV2A6CollectionNextGoalViewStateV1 =
  typeof ARENA_V2_A6_COLLECTION_NEXT_GOAL_VIEW_STATE_V1[
    keyof typeof ARENA_V2_A6_COLLECTION_NEXT_GOAL_VIEW_STATE_V1
  ];

export type ArenaV2A6NextGoalKindV1 =
  | 'collect-map'
  | 'collect-weapon'
  | 'weapon-context'
  | 'map-segment'
  | 'mode-mastery'
  | 'cross-challenge'
  | 'record-improvement'
  | 'catalog-complete';

export type ArenaV2A6GoalCategoryV1 = 'weapon' | 'map' | 'mode' | 'complete';
export type ArenaV2A6FirstScreenStateV1 =
  | 'ready'
  | 'complete'
  | 'loading'
  | 'empty'
  | 'error'
  | 'future-profile';
export type ArenaV2A6ViewportKindV1 = 'mobile-390x844' | 'desktop-1440x900';
export type ArenaV2A6EntryScreenIdV1 =
  | 'loading'
  | 'home'
  | 'mode-select'
  | 'weapon-index'
  | 'map-index';

export interface ArenaV2A6StaticCatalogFactV1 {
  readonly profileDefinitionId: 'arena-v2.learning-profile.candidate.v1';
  readonly profileDefinitionContentVersion: 5;
  readonly weaponCount: 20;
  readonly mapCount: 2;
  readonly mapSegmentCount: 20;
  readonly modeCount: 3;
  readonly challengeCount: 20;
  readonly characterIdentityCount: 6;
  readonly staticCapacityHours: 200;
  readonly capacityEvidenceKind: 'capacity-hypothesis';
  readonly longitudinalEvidence: 'not-run';
  readonly productionReady: false;
}

export const ARENA_V2_A6_STATIC_CATALOG_FACT_V1 = Object.freeze({
  profileDefinitionId: 'arena-v2.learning-profile.candidate.v1',
  profileDefinitionContentVersion: 5,
  weaponCount: 20,
  mapCount: 2,
  mapSegmentCount: 20,
  modeCount: 3,
  challengeCount: 20,
  characterIdentityCount: 6,
  staticCapacityHours: 200,
  capacityEvidenceKind: 'capacity-hypothesis',
  longitudinalEvidence: 'not-run',
  productionReady: false,
} as const satisfies ArenaV2A6StaticCatalogFactV1);

const ARENA_V2_A6_WEAPON_CONTEXTS_PER_WEAPON_V1 = 5;
const ARENA_V2_A6_STATIC_WEAPON_CONTEXT_CAPACITY_V1 =
  ARENA_V2_A6_STATIC_CATALOG_FACT_V1.weaponCount
  * ARENA_V2_A6_WEAPON_CONTEXTS_PER_WEAPON_V1;

export interface ArenaV2A6CollectionProgressFactV1 {
  readonly profileSchemaVersion: 1;
  readonly profileDefinitionId: string;
  readonly profileDefinitionContentVersion: number;
  readonly profileId: string;
  readonly profileRevision: number;
  readonly collectedWeaponCount: number;
  readonly weaponMainResearchProgress: number;
  readonly weaponMainResearchTarget: 2_400;
  readonly masteredWeaponCount: number;
  readonly completedWeaponContextCount: number;
  readonly collectedMapCount: number;
  readonly masteredMapSegmentCount: number;
  readonly completedModeCount: number;
  readonly completedChallengeCount: number;
  readonly challengeCount: number;
  readonly challengeProgress: number;
  readonly challengeProgressTarget: number;
}

export interface ArenaV2A6NextGoalFactV1 {
  readonly schemaVersion: 1;
  readonly profileRevision: number;
  readonly kind: ArenaV2A6NextGoalKindV1;
  readonly goalId: string;
  readonly question: string;
  readonly actionLabel: string;
  readonly currentProgress: number;
  readonly targetProgress: number;
  readonly weaponDefinitionId: string | null;
  readonly mapDefinitionId: string | null;
  readonly segmentDefinitionId: string | null;
  readonly modeDefinitionId: string | null;
  readonly challengeDefinitionId: string | null;
  readonly context: 'ground' | 'aerial' | 'edge' | 'duel-counterplay' | 'survival' | null;
  readonly effectiveLearningRequired: boolean;
}

export interface ArenaV2A6ViewportV1 {
  readonly width: 390 | 1440;
  readonly height: 844 | 900;
  readonly safeAreaInsets: Readonly<{
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  }>;
}

export interface ArenaV2A6CollectionNextGoalInputV1 {
  readonly schemaVersion: typeof ARENA_V2_A6_COLLECTION_NEXT_GOAL_FIRST_SCREEN_SCHEMA_VERSION_V1;
  readonly epochId: string;
  readonly tick: number;
  readonly locale: string;
  readonly sourceState: ArenaV2A6CollectionNextGoalSourceStateV1;
  readonly catalogFact: ArenaV2A6StaticCatalogFactV1;
  readonly progressFact: ArenaV2A6CollectionProgressFactV1 | null;
  readonly nextGoal: ArenaV2A6NextGoalFactV1 | null;
  readonly diagnosticCode:
    | 'profile-empty'
    | 'profile-read-failed'
    | 'unsupported-profile-version'
    | null;
  readonly observedProfileSchemaVersion: number | null;
  readonly viewport: ArenaV2A6ViewportV1;
  readonly reducedMotion: boolean;
  readonly muted: boolean;
  readonly decorativeAssetState: 'ready' | 'missing';
}

export interface ArenaV2A6FirstViewFactV1 {
  readonly factId: 'next-goal' | 'goal-progress' | 'category-progress' | 'state-message';
  readonly labelMessageId: string;
  readonly valueText: string;
  readonly accessibilityText: string;
  readonly fixedWidthNumeric: boolean;
  readonly numericSlotCharacterColumns: 0 | 21;
}

export interface ArenaV2A6RectV1 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ArenaV2A6FirstScreenSnapshotV1 {
  readonly schemaVersion: typeof ARENA_V2_A6_COLLECTION_NEXT_GOAL_FIRST_SCREEN_SCHEMA_VERSION_V1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly validationStatus: 'not-run';
  readonly epochId: string;
  readonly tick: number;
  readonly locale: string;
  readonly state: ArenaV2A6FirstScreenStateV1;
  readonly sourceState: ArenaV2A6CollectionNextGoalSourceStateV1;
  readonly profileIdentity: Readonly<{
    readonly profileDefinitionId: string;
    readonly profileDefinitionContentVersion: number;
    readonly profileId: string;
    readonly profileRevision: number;
  }> | null;
  readonly goal: Readonly<{
    readonly kind: ArenaV2A6NextGoalKindV1;
    readonly goalId: string;
    readonly category: ArenaV2A6GoalCategoryV1;
    readonly question: string;
    readonly actionLabel: string;
    readonly targetDefinitionIds: readonly string[];
    readonly effectiveLearningRequired: boolean;
  }> | null;
  readonly firstViewFacts: readonly ArenaV2A6FirstViewFactV1[];
  readonly primaryAction: Readonly<{
    readonly intentId: ArenaV2InformationUiIntentV1;
    readonly entryScreenId: ArenaV2A6EntryScreenIdV1;
    readonly labelMessageId: string;
    readonly labelText: string;
    readonly accessibilityText: string;
    readonly enabled: boolean;
    readonly disabledReasonMessageId: string | null;
    readonly targetDefinitionId: string | null;
    readonly minimumTouchTargetCssPixels: 48;
    readonly mutatesProfileOrRules: false;
  }>;
  readonly semanticStyle: Readonly<{
    readonly textHex: '#172033';
    readonly surfaceHex: '#F4EBDD';
    readonly accentHex: '#35B8FF' | '#8B6DFF' | '#45D483' | '#FFF4B8' | '#CFC6B3';
    readonly shapeToken: string;
    readonly patternToken: string;
    readonly textToken: string;
    readonly colorIsNeverSoleSignal: true;
  }>;
  readonly layout: Readonly<{
    readonly viewportKind: ArenaV2A6ViewportKindV1;
    readonly safeRect: ArenaV2A6RectV1;
    readonly questionRect: ArenaV2A6RectV1;
    readonly firstViewFactRects: readonly ArenaV2A6RectV1[];
    readonly primaryActionRect: ArenaV2A6RectV1;
    readonly primaryActionCount: 1;
    readonly maximumFirstViewFacts: 3;
    readonly horizontalOverflowAllowed: false;
    readonly verticalScrollAllowedForDeferredContentOnly: true;
    readonly noNestedCards: true;
  }>;
  readonly textFit: Readonly<{
    readonly questionMaxLines: 2 | 3;
    readonly factMaxLines: 2 | 3;
    readonly primaryActionMaxLines: 1 | 2;
    readonly minimumBodyFontCssPixels: 16;
    readonly minimumActionFontCssPixels: 16;
    readonly overflowPolicy: 'wrap-then-ellipsis-preserve-accessibility-text';
    readonly longTokenBreakPolicy: 'anywhere';
    readonly screenshotEvidence: 'not-run';
  }>;
  readonly accessibility: Readonly<{
    readonly reducedMotion: boolean;
    readonly motionPolicy: 'brief-opacity-and-border' | 'none-static-state-change';
    readonly muted: boolean;
    readonly visualDependsOnAudioPlayback: false;
    readonly silentEquivalentComplete: true;
    readonly fullTextPreservedForAssistiveTechnology: true;
  }>;
  readonly fallback: Readonly<{
    readonly decorativeAssetMissing: boolean;
    readonly usesTextShapePatternFallback: boolean;
    readonly programmaticAssetClaimsApproval: false;
  }>;
  readonly capacityDisclosure: Readonly<{
    readonly weaponCount: 20;
    readonly mapCount: 2;
    readonly mapSegmentCount: 20;
    readonly modeCount: 3;
    readonly challengeCount: 20;
    readonly characterIdentityCount: 6;
    readonly staticCapacityHours: 200;
    readonly evidenceKind: 'capacity-hypothesis';
    readonly longitudinalEvidence: 'not-run';
    readonly isRetentionGuarantee: false;
    readonly addsCharacterFunction: false;
    readonly firstViewFact: false;
  }>;
}

const INPUT_KEYS = new Set([
  'schemaVersion', 'epochId', 'tick', 'locale', 'sourceState', 'catalogFact',
  'progressFact', 'nextGoal', 'diagnosticCode', 'observedProfileSchemaVersion',
  'viewport', 'reducedMotion', 'muted', 'decorativeAssetState',
]);
const CATALOG_KEYS = new Set([
  'profileDefinitionId', 'profileDefinitionContentVersion', 'weaponCount', 'mapCount',
  'mapSegmentCount', 'modeCount', 'challengeCount', 'characterIdentityCount',
  'staticCapacityHours', 'capacityEvidenceKind', 'longitudinalEvidence', 'productionReady',
]);
const PROGRESS_KEYS = new Set([
  'profileSchemaVersion', 'profileDefinitionId', 'profileDefinitionContentVersion',
  'profileId', 'profileRevision', 'collectedWeaponCount', 'masteredWeaponCount',
  'weaponMainResearchProgress', 'weaponMainResearchTarget',
  'completedWeaponContextCount', 'collectedMapCount', 'masteredMapSegmentCount',
  'completedModeCount', 'completedChallengeCount', 'challengeCount',
  'challengeProgress', 'challengeProgressTarget',
]);
const GOAL_KEYS = new Set([
  'schemaVersion', 'profileRevision', 'kind', 'goalId', 'question', 'actionLabel',
  'currentProgress', 'targetProgress', 'weaponDefinitionId', 'mapDefinitionId',
  'segmentDefinitionId', 'modeDefinitionId', 'challengeDefinitionId', 'context',
  'effectiveLearningRequired',
]);
const VIEWPORT_KEYS = new Set(['width', 'height', 'safeAreaInsets']);
const INSET_KEYS = new Set(['top', 'right', 'bottom', 'left']);
const RESET_KEYS = new Set(['epochId']);
const CONSTRUCTOR_KEYS = new Set(['epochId']);
const SOURCE_STATES: ReadonlySet<unknown> = new Set(
  Object.values(ARENA_V2_A6_COLLECTION_NEXT_GOAL_SOURCE_STATE_V1),
);
const GOAL_KINDS: ReadonlySet<unknown> = new Set([
  'collect-map', 'collect-weapon', 'weapon-context', 'map-segment', 'mode-mastery',
  'cross-challenge', 'record-improvement', 'catalog-complete',
]);
const CONTEXTS: ReadonlySet<unknown> = new Set([
  'ground', 'aerial', 'edge', 'duel-counterplay', 'survival',
]);

type PlainData = Record<string, unknown>;

function cloneStrictData(
  value: unknown,
  name: string,
  seen: Set<object> = new Set(),
  depth = 0,
): unknown {
  if (depth > 16) throw new RangeError(`${name}嵌套深度超限。`);
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value))
  ) return value;
  if (typeof value !== 'object') throw new TypeError(`${name}只能包含有限JSON数据。`);
  if (seen.has(value)) throw new TypeError(`${name}不能循环引用。`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      const keys = Reflect.ownKeys(value);
      if (keys.some((key) => typeof key === 'symbol')) throw new TypeError(`${name}不能包含Symbol键。`);
      const expected = new Set([
        'length',
        ...Array.from({ length: value.length }, (_, index) => String(index)),
      ]);
      if (keys.some((key) => !expected.has(key as string))) {
        throw new RangeError(`${name}数组不能包含附加字段。`);
      }
      const result = Array.from({ length: value.length }, (_, index) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (
          descriptor === undefined
          || !descriptor.enumerable
          || !Object.hasOwn(descriptor, 'value')
        ) throw new TypeError(`${name}[${index}]必须是可枚举数据字段。`);
        return cloneStrictData(descriptor.value, `${name}[${index}]`, seen, depth + 1);
      });
      return Object.freeze(result);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${name}必须是普通数据对象，Promise/thenable不受支持。`);
    }
    const result: PlainData = Object.create(null) as PlainData;
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') throw new TypeError(`${name}不能包含Symbol键。`);
      if (key === 'then') throw new TypeError(`${name}不能是thenable。`);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined
        || !descriptor.enumerable
        || !Object.hasOwn(descriptor, 'value')
      ) throw new TypeError(`${name}.${key}必须是可枚举数据字段，getter/setter被拒绝。`);
      result[key] = cloneStrictData(descriptor.value, `${name}.${key}`, seen, depth + 1);
    }
    return Object.freeze(result);
  } finally {
    seen.delete(value);
  }
}

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  const record = value as PlainData;
  const actual = Object.keys(record);
  if (actual.length !== keys.size || actual.some((key) => !keys.has(key))) {
    throw new RangeError(`${name}字段必须exact-key闭合。`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(record, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
  return record;
}

function nonEmptyString(value: unknown, name: string, maximum = 512): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maximum) {
    throw new TypeError(`${name}必须是1..${maximum}字符的非空字符串。`);
  }
  return value;
}

function integer(value: unknown, minimum: number, maximum: number, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new RangeError(`${name}必须是${minimum}..${maximum}的安全整数。`);
  }
  return value as number;
}

function booleanValue(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name}必须是boolean。`);
  return value;
}

function nullableIdentifier(value: unknown, name: string): string | null {
  return value === null ? null : nonEmptyString(value, name, 200);
}

function parseCatalog(value: unknown): ArenaV2A6StaticCatalogFactV1 {
  const source = exactRecord(value, CATALOG_KEYS, 'A6 catalogFact');
  for (const [key, expected] of Object.entries(ARENA_V2_A6_STATIC_CATALOG_FACT_V1)) {
    if (source[key] !== expected) throw new RangeError(`A6 catalogFact.${key}与P6静态容量事实漂移。`);
  }
  return ARENA_V2_A6_STATIC_CATALOG_FACT_V1;
}

function parseProgress(value: unknown): ArenaV2A6CollectionProgressFactV1 {
  const source = exactRecord(value, PROGRESS_KEYS, 'A6 progressFact');
  if (source.profileSchemaVersion !== 1) throw new RangeError('A6只接受Learning Profile schema 1。');
  const challengeCount = integer(
    source.challengeCount,
    0,
    1_000_000_000,
    'A6 challengeCount',
  );
  const challengeProgressTarget = integer(
    source.challengeProgressTarget,
    0,
    1_000_000_000,
    'A6 challengeProgressTarget',
  );
  if ((challengeCount === 0) !== (challengeProgressTarget === 0)) {
    throw new RangeError('A6挑战数量与累计进度目标必须同时为0或同时存在。');
  }
  const weaponMainResearchTarget = integer(
    source.weaponMainResearchTarget,
    2_400,
    2_400,
    'A6 weaponMainResearchTarget',
  ) as 2_400;
  const result = Object.freeze({
    profileSchemaVersion: 1 as const,
    profileDefinitionId: nonEmptyString(source.profileDefinitionId, 'A6 profileDefinitionId', 200),
    profileDefinitionContentVersion: integer(
      source.profileDefinitionContentVersion, 1, Number.MAX_SAFE_INTEGER,
      'A6 profileDefinitionContentVersion',
    ),
    profileId: nonEmptyString(source.profileId, 'A6 profileId', 200),
    profileRevision: integer(source.profileRevision, 0, 1_000_000_000, 'A6 profileRevision'),
    collectedWeaponCount: integer(source.collectedWeaponCount, 0, 20, 'A6 collectedWeaponCount'),
    weaponMainResearchProgress: integer(
      source.weaponMainResearchProgress,
      0,
      weaponMainResearchTarget,
      'A6 weaponMainResearchProgress',
    ),
    weaponMainResearchTarget,
    masteredWeaponCount: integer(source.masteredWeaponCount, 0, 20, 'A6 masteredWeaponCount'),
    completedWeaponContextCount: integer(
      source.completedWeaponContextCount,
      0,
      ARENA_V2_A6_STATIC_WEAPON_CONTEXT_CAPACITY_V1,
      'A6 completedWeaponContextCount',
    ),
    collectedMapCount: integer(source.collectedMapCount, 0, 2, 'A6 collectedMapCount'),
    masteredMapSegmentCount: integer(
      source.masteredMapSegmentCount, 0, 20, 'A6 masteredMapSegmentCount',
    ),
    completedModeCount: integer(source.completedModeCount, 0, 3, 'A6 completedModeCount'),
    completedChallengeCount: integer(
      source.completedChallengeCount,
      0,
      challengeCount,
      'A6 completedChallengeCount',
    ),
    challengeCount,
    challengeProgress: integer(
      source.challengeProgress,
      0,
      challengeProgressTarget,
      'A6 challengeProgress',
    ),
    challengeProgressTarget,
  });
  if (
    result.profileDefinitionId !== ARENA_V2_A6_STATIC_CATALOG_FACT_V1.profileDefinitionId
    || result.profileDefinitionContentVersion
      !== ARENA_V2_A6_STATIC_CATALOG_FACT_V1.profileDefinitionContentVersion
  ) throw new RangeError('A6 progressFact与当前P6 Definition身份漂移。');
  if (
    result.completedWeaponContextCount
    > ARENA_V2_A6_STATIC_WEAPON_CONTEXT_CAPACITY_V1
  ) {
    throw new RangeError('A6五情境完成数不能超过完整武器目录容量。');
  }
  if (
    result.completedWeaponContextCount
    < result.masteredWeaponCount * ARENA_V2_A6_WEAPON_CONTEXTS_PER_WEAPON_V1
  ) {
    throw new RangeError('A6每把完整理解武器必须具备五个已完成情境。');
  }
  return result;
}

function goalCategory(goal: ArenaV2A6NextGoalFactV1): ArenaV2A6GoalCategoryV1 {
  if (goal.kind === 'collect-weapon' || goal.kind === 'weapon-context') return 'weapon';
  if (goal.kind === 'collect-map' || goal.kind === 'map-segment') return 'map';
  if (goal.kind === 'catalog-complete') return 'complete';
  if (goal.kind === 'cross-challenge') {
    if (goal.modeDefinitionId !== null) return 'mode';
    if (goal.weaponDefinitionId !== null) return 'weapon';
    return 'map';
  }
  return 'mode';
}

function assertGoalIdentity(goal: ArenaV2A6NextGoalFactV1): void {
  const absent = (value: string | null) => value === null;
  if (goal.kind === 'collect-weapon') {
    if (
      absent(goal.weaponDefinitionId)
      || !absent(goal.mapDefinitionId)
      || !absent(goal.segmentDefinitionId)
      || !absent(goal.modeDefinitionId)
      || !absent(goal.challengeDefinitionId)
      || goal.context !== null
      || goal.goalId !== `collect-weapon:${goal.weaponDefinitionId}`
    ) throw new RangeError('A6 collect-weapon目标身份不闭合。');
    return;
  }
  if (goal.kind === 'weapon-context') {
    if (
      absent(goal.weaponDefinitionId)
      || goal.context === null
      || !absent(goal.mapDefinitionId)
      || !absent(goal.segmentDefinitionId)
      || !absent(goal.modeDefinitionId)
      || !absent(goal.challengeDefinitionId)
      || goal.goalId !== `weapon-context:${goal.weaponDefinitionId}:${goal.context}`
    ) throw new RangeError('A6 weapon-context目标身份不闭合。');
    return;
  }
  if (goal.kind === 'collect-map') {
    if (
      absent(goal.mapDefinitionId)
      || !absent(goal.weaponDefinitionId)
      || !absent(goal.segmentDefinitionId)
      || !absent(goal.modeDefinitionId)
      || !absent(goal.challengeDefinitionId)
      || goal.context !== null
      || goal.goalId !== `collect-map:${goal.mapDefinitionId}`
    ) throw new RangeError('A6 collect-map目标身份不闭合。');
    return;
  }
  if (goal.kind === 'map-segment') {
    if (
      absent(goal.mapDefinitionId)
      || absent(goal.segmentDefinitionId)
      || !absent(goal.weaponDefinitionId)
      || !absent(goal.modeDefinitionId)
      || !absent(goal.challengeDefinitionId)
      || goal.context !== null
      || goal.goalId !== `map-segment:${goal.mapDefinitionId}:${goal.segmentDefinitionId}`
    ) throw new RangeError('A6 map-segment目标身份不闭合。');
    return;
  }
  if (goal.kind === 'mode-mastery' || goal.kind === 'record-improvement') {
    const modeMasteryGoalId = `mode-mastery:${goal.modeDefinitionId}`;
    const firstCompletionGoalId = `mode-first-completion:${goal.modeDefinitionId}`;
    const recordImprovementGoalId = `record-improvement:${goal.modeDefinitionId}`;
    const goalIdMatches = goal.kind === 'mode-mastery'
      ? goal.goalId === modeMasteryGoalId || goal.goalId === firstCompletionGoalId
      : goal.goalId === recordImprovementGoalId;
    if (
      absent(goal.modeDefinitionId)
      || !absent(goal.weaponDefinitionId)
      || !absent(goal.mapDefinitionId)
      || !absent(goal.segmentDefinitionId)
      || !absent(goal.challengeDefinitionId)
      || goal.context !== null
      || !goalIdMatches
    ) throw new RangeError(`A6 ${goal.kind}目标身份不闭合。`);
    if (goal.goalId === firstCompletionGoalId
      && (goal.currentProgress !== 0 || goal.targetProgress !== 1)) {
      throw new RangeError('A6 mode-first-completion目标必须精确表示0→1首次完成。');
    }
    return;
  }
  if (goal.kind === 'cross-challenge') {
    const targetDimensionCount = [
      goal.weaponDefinitionId,
      goal.mapDefinitionId,
      goal.segmentDefinitionId,
      goal.modeDefinitionId,
    ].filter((value) => value !== null).length;
    if (
      absent(goal.challengeDefinitionId)
      || goal.context !== null
      || goal.goalId !== `cross-challenge:${goal.challengeDefinitionId}`
      || targetDimensionCount < 2
      || (goal.segmentDefinitionId !== null && goal.mapDefinitionId === null)
    ) throw new RangeError('A6 cross-challenge目标身份不闭合。');
    return;
  }
  if (
    (goal.goalId !== ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1
      && goal.goalId !== ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1)
    || goal.currentProgress !== 1
    || goal.targetProgress !== 1
    || !absent(goal.weaponDefinitionId)
    || !absent(goal.mapDefinitionId)
    || !absent(goal.segmentDefinitionId)
    || !absent(goal.modeDefinitionId)
    || !absent(goal.challengeDefinitionId)
    || goal.context !== null
  ) throw new RangeError('A6 catalog-complete目标身份不闭合。');
}

function parseGoal(value: unknown, profileRevision: number): ArenaV2A6NextGoalFactV1 {
  const source = exactRecord(value, GOAL_KEYS, 'A6 nextGoal');
  if (source.schemaVersion !== 1) throw new RangeError('A6 nextGoal只接受schema 1。');
  if (!GOAL_KINDS.has(source.kind)) throw new RangeError('A6 nextGoal.kind不受支持。');
  const kind = source.kind as ArenaV2A6NextGoalKindV1;
  const context = source.context === null
    ? null
    : CONTEXTS.has(source.context)
      ? source.context as ArenaV2A6NextGoalFactV1['context']
      : (() => { throw new RangeError('A6 nextGoal.context不受支持。'); })();
  const result = Object.freeze({
    schemaVersion: 1 as const,
    profileRevision: integer(source.profileRevision, 0, 1_000_000_000, 'A6 goal profileRevision'),
    kind,
    goalId: nonEmptyString(source.goalId, 'A6 goalId', 512),
    question: nonEmptyString(source.question, 'A6 goal question', 512),
    actionLabel: nonEmptyString(source.actionLabel, 'A6 goal actionLabel', 512),
    currentProgress: integer(source.currentProgress, 0, 1_000_000_000, 'A6 currentProgress'),
    targetProgress: integer(
      source.targetProgress,
      kind === 'record-improvement' ? 0 : 1,
      1_000_000_000,
      'A6 targetProgress',
    ),
    weaponDefinitionId: nullableIdentifier(source.weaponDefinitionId, 'A6 weaponDefinitionId'),
    mapDefinitionId: nullableIdentifier(source.mapDefinitionId, 'A6 mapDefinitionId'),
    segmentDefinitionId: nullableIdentifier(source.segmentDefinitionId, 'A6 segmentDefinitionId'),
    modeDefinitionId: nullableIdentifier(source.modeDefinitionId, 'A6 modeDefinitionId'),
    challengeDefinitionId: nullableIdentifier(source.challengeDefinitionId, 'A6 challengeDefinitionId'),
    context,
    effectiveLearningRequired: booleanValue(
      source.effectiveLearningRequired,
      'A6 effectiveLearningRequired',
    ),
  });
  if (result.profileRevision !== profileRevision) {
    throw new RangeError('A6 nextGoal与Profile revision漂移。');
  }
  if (result.currentProgress > result.targetProgress) {
    throw new RangeError('A6 nextGoal进度不能超过目标值。');
  }
  const expectedEffective = result.kind !== 'record-improvement'
    && result.kind !== 'catalog-complete';
  if (result.effectiveLearningRequired !== expectedEffective) {
    throw new RangeError('A6 nextGoal有效学习标记与P6目标种类不一致。');
  }
  assertGoalIdentity(result);
  return result;
}

function parseViewport(value: unknown): ArenaV2A6ViewportV1 {
  const source = exactRecord(value, VIEWPORT_KEYS, 'A6 viewport');
  const width = integer(source.width, 1, 4096, 'A6 viewport.width');
  const height = integer(source.height, 1, 4096, 'A6 viewport.height');
  if (!((width === 390 && height === 844) || (width === 1440 && height === 900))) {
    throw new RangeError('A6候选只登记390x844与1440x900视口。');
  }
  const insets = exactRecord(source.safeAreaInsets, INSET_KEYS, 'A6 safeAreaInsets');
  const top = integer(insets.top, 0, height - 1, 'A6 safeAreaInsets.top');
  const right = integer(insets.right, 0, width - 1, 'A6 safeAreaInsets.right');
  const bottom = integer(insets.bottom, 0, height - 1, 'A6 safeAreaInsets.bottom');
  const left = integer(insets.left, 0, width - 1, 'A6 safeAreaInsets.left');
  if (left + right > width - 320 || top + bottom > height - 640) {
    throw new RangeError('A6 safe area不足以容纳首屏与48px主动作。');
  }
  return Object.freeze({
    width: width as 390 | 1440,
    height: height as 844 | 900,
    safeAreaInsets: Object.freeze({ top, right, bottom, left }),
  });
}

function parseInput(value: unknown): ArenaV2A6CollectionNextGoalInputV1 {
  const source = exactRecord(
    cloneStrictData(value, 'A6 collection next-goal input'),
    INPUT_KEYS,
    'A6 collection next-goal input',
  );
  if (source.schemaVersion !== 1) throw new RangeError('A6输入只接受schema 1。');
  if (!SOURCE_STATES.has(source.sourceState)) throw new RangeError('A6 sourceState不受支持。');
  const sourceState = source.sourceState as ArenaV2A6CollectionNextGoalSourceStateV1;
  const catalogFact = parseCatalog(source.catalogFact);
  const progressFact = source.progressFact === null ? null : parseProgress(source.progressFact);
  const nextGoal = source.nextGoal === null
    ? null
    : progressFact === null
      ? (() => { throw new RangeError('A6 nextGoal不能脱离Profile事实存在。'); })()
      : parseGoal(source.nextGoal, progressFact.profileRevision);
  if (
    nextGoal?.kind === 'catalog-complete'
    && nextGoal.goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1
    && progressFact !== null
    && (
      progressFact.collectedWeaponCount !== 20
      || progressFact.weaponMainResearchProgress !== progressFact.weaponMainResearchTarget
      || progressFact.masteredWeaponCount !== 20
      || progressFact.completedWeaponContextCount
        !== ARENA_V2_A6_STATIC_WEAPON_CONTEXT_CAPACITY_V1
      || progressFact.collectedMapCount !== 2
      || progressFact.masteredMapSegmentCount !== 20
      || progressFact.completedModeCount !== 3
      || progressFact.completedChallengeCount !== progressFact.challengeCount
      || progressFact.challengeProgress !== progressFact.challengeProgressTarget
    )
  ) throw new RangeError('A6 catalog-complete与未完成的目录进度矛盾。');
  if (
    nextGoal?.kind === 'catalog-complete'
    && nextGoal.goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1
    && progressFact !== null
    && (
      progressFact.collectedMapCount !== 2
      || progressFact.masteredMapSegmentCount !== 20
      || progressFact.completedModeCount !== 3
    )
  ) throw new RangeError('A6 active-learning-complete与未完成的共用地图/模式进度矛盾。');
  const diagnosticCode = source.diagnosticCode;
  const observedProfileSchemaVersion = source.observedProfileSchemaVersion === null
    ? null
    : integer(
      source.observedProfileSchemaVersion,
      0,
      1_000_000_000,
      'A6 observedProfileSchemaVersion',
    );
  if (sourceState === 'ready') {
    if (
      progressFact === null
      || nextGoal === null
      || diagnosticCode !== null
      || observedProfileSchemaVersion !== 1
    ) throw new RangeError('A6 ready状态必须携带闭合Profile/goal且无诊断。');
  } else {
    if (progressFact !== null || nextGoal !== null) {
      throw new RangeError('A6非ready状态不得携带可能过期的Profile/goal。');
    }
    const expectedDiagnostic = sourceState === 'empty'
      ? 'profile-empty'
      : sourceState === 'error'
        ? 'profile-read-failed'
        : sourceState === 'future-profile'
          ? 'unsupported-profile-version'
          : null;
    if (diagnosticCode !== expectedDiagnostic) {
      throw new RangeError('A6非ready状态诊断码不闭合。');
    }
    if (
      sourceState === 'future-profile'
        ? observedProfileSchemaVersion === null || observedProfileSchemaVersion <= 1
        : observedProfileSchemaVersion !== null
    ) throw new RangeError('A6未来Profile版本标记不闭合。');
  }
  if (source.decorativeAssetState !== 'ready' && source.decorativeAssetState !== 'missing') {
    throw new RangeError('A6 decorativeAssetState不受支持。');
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    epochId: nonEmptyString(source.epochId, 'A6 epochId', 200),
    tick: integer(source.tick, 0, Number.MAX_SAFE_INTEGER, 'A6 tick'),
    locale: nonEmptyString(source.locale, 'A6 locale', 35),
    sourceState,
    catalogFact,
    progressFact,
    nextGoal,
    diagnosticCode: diagnosticCode as ArenaV2A6CollectionNextGoalInputV1['diagnosticCode'],
    observedProfileSchemaVersion,
    viewport: parseViewport(source.viewport),
    reducedMotion: booleanValue(source.reducedMotion, 'A6 reducedMotion'),
    muted: booleanValue(source.muted, 'A6 muted'),
    decorativeAssetState: source.decorativeAssetState,
  });
}

function rect(x: number, y: number, width: number, height: number): ArenaV2A6RectV1 {
  return Object.freeze({ x, y, width, height });
}

function layout(
  viewport: ArenaV2A6ViewportV1,
  factCount: number,
): ArenaV2A6FirstScreenSnapshotV1['layout'] {
  const narrow = viewport.width === 390;
  const safeRect = rect(
    viewport.safeAreaInsets.left,
    viewport.safeAreaInsets.top,
    viewport.width - viewport.safeAreaInsets.left - viewport.safeAreaInsets.right,
    viewport.height - viewport.safeAreaInsets.top - viewport.safeAreaInsets.bottom,
  );
  const padding = narrow ? 16 : 32;
  const gap = narrow ? 12 : 20;
  const contentX = safeRect.x + padding;
  const contentWidth = safeRect.width - padding * 2;
  const questionRect = rect(contentX, safeRect.y + padding, contentWidth, narrow ? 112 : 104);
  const actionWidth = narrow ? contentWidth : Math.min(480, contentWidth);
  const actionRect = rect(
    safeRect.x + (safeRect.width - actionWidth) / 2,
    safeRect.y + safeRect.height - padding - 56,
    actionWidth,
    56,
  );
  const factTop = questionRect.y + questionRect.height + gap;
  const availableHeight = Math.max(72, actionRect.y - gap - factTop);
  const factRects = narrow
    ? Object.freeze(Array.from({ length: factCount }, (_, index) => rect(
      contentX,
      factTop + index * (Math.min(96, (availableHeight - gap * Math.max(0, factCount - 1)) / Math.max(1, factCount)) + gap),
      contentWidth,
      Math.min(96, (availableHeight - gap * Math.max(0, factCount - 1)) / Math.max(1, factCount)),
    )))
    : Object.freeze(Array.from({ length: factCount }, (_, index) => {
      const width = (contentWidth - gap * Math.max(0, factCount - 1)) / Math.max(1, factCount);
      return rect(contentX + index * (width + gap), factTop, width, Math.min(152, availableHeight));
    }));
  return Object.freeze({
    viewportKind: narrow ? 'mobile-390x844' as const : 'desktop-1440x900' as const,
    safeRect,
    questionRect,
    firstViewFactRects: factRects,
    primaryActionRect: actionRect,
    primaryActionCount: 1 as const,
    maximumFirstViewFacts: 3 as const,
    horizontalOverflowAllowed: false as const,
    verticalScrollAllowedForDeferredContentOnly: true as const,
    noNestedCards: true as const,
  });
}

function style(category: ArenaV2A6GoalCategoryV1 | 'neutral'):
ArenaV2A6FirstScreenSnapshotV1['semanticStyle'] {
  const token = category === 'weapon'
    ? { accentHex: '#35B8FF' as const, shapeToken: 'heavy-square-forward-notch', patternToken: 'vertical-single-bars', textToken: '武器' }
    : category === 'map'
      ? { accentHex: '#8B6DFF' as const, shapeToken: 'branch-diamond', patternToken: 'dashed-route', textToken: '地图' }
      : category === 'mode'
        ? { accentHex: '#45D483' as const, shapeToken: 'segmented-ring', patternToken: 'dot-grid', textToken: '模式' }
        : category === 'complete'
          ? { accentHex: '#FFF4B8' as const, shapeToken: 'closed-seal-ring', patternToken: 'cross-hatch', textToken: '完成' }
          : { accentHex: '#CFC6B3' as const, shapeToken: 'open-status-bracket', patternToken: 'horizontal-dashes', textToken: '状态' };
  return Object.freeze({
    textHex: '#172033' as const,
    surfaceHex: '#F4EBDD' as const,
    ...token,
    colorIsNeverSoleSignal: true as const,
  });
}

function fact(
  factId: ArenaV2A6FirstViewFactV1['factId'],
  labelMessageId: string,
  valueText: string,
  accessibilityText: string,
  fixedWidthNumeric = false,
): ArenaV2A6FirstViewFactV1 {
  return Object.freeze({
    factId,
    labelMessageId,
    valueText,
    accessibilityText,
    fixedWidthNumeric,
    numericSlotCharacterColumns: fixedWidthNumeric ? 21 as const : 0 as const,
  });
}

function categoryProgress(
  category: ArenaV2A6GoalCategoryV1,
  progress: ArenaV2A6CollectionProgressFactV1,
): ArenaV2A6FirstViewFactV1 {
  if (category === 'weapon') return fact(
    'category-progress',
    'arena.v2.a6.weapon-progress',
    `收藏${progress.collectedWeaponCount}/20 · 五情境完整${progress.masteredWeaponCount}/20`
      + ` · 主研究${progress.weaponMainResearchProgress}/${progress.weaponMainResearchTarget}`
      + ` · 情境${progress.completedWeaponContextCount}/${ARENA_V2_A6_STATIC_WEAPON_CONTEXT_CAPACITY_V1}`,
    `已收藏${progress.collectedWeaponCount}/20把武器，完整理解${progress.masteredWeaponCount}/20把，共完成${
      progress.weaponMainResearchProgress
    }/${progress.weaponMainResearchTarget}次主研究和${progress.completedWeaponContextCount
    }/${ARENA_V2_A6_STATIC_WEAPON_CONTEXT_CAPACITY_V1}项武器情境。`,
    true,
  );
  if (category === 'map') return fact(
    'category-progress',
    'arena.v2.a6.map-progress',
    `地图${progress.collectedMapCount}/2 · 路线${progress.masteredMapSegmentCount}/20`,
    `已收藏${progress.collectedMapCount}/2张地图，已理解${progress.masteredMapSegmentCount}/20段路线。`,
    true,
  );
  if (category === 'mode') return fact(
    'category-progress',
    'arena.v2.a6.mode-progress',
    `模式${progress.completedModeCount}/3${progress.challengeCount === 0
      ? ''
      : ` · 挑战完成${progress.completedChallengeCount}/${progress.challengeCount}`
        + ` · 挑战进度${progress.challengeProgress}/${progress.challengeProgressTarget}`}`,
    `已完成${progress.completedModeCount}/3种模式的熟练记录${progress.challengeCount === 0
      ? '。'
      : `，已完成${progress.completedChallengeCount}/${progress.challengeCount}项交叉挑战`
        + `，累计挑战进度${progress.challengeProgress}/${progress.challengeProgressTarget}。`}`,
    true,
  );
  const challengeValueText = progress.challengeCount === 0
    ? ''
    : ` · 挑战完成${progress.completedChallengeCount}/${progress.challengeCount}`
      + ` · 挑战进度${progress.challengeProgress}/${progress.challengeProgressTarget}`;
  const challengeAccessibilityText = progress.challengeCount === 0
    ? ''
    : `，已完成${progress.completedChallengeCount}/${progress.challengeCount}项交叉挑战`
      + `，累计挑战进度${progress.challengeProgress}/${progress.challengeProgressTarget}`;
  return fact(
    'category-progress',
    'arena.v2.a6.catalog-progress',
    `20武器 · 2地图 · 3模式 · 主研究${progress.weaponMainResearchProgress}/${
      progress.weaponMainResearchTarget
    } · 情境${progress.completedWeaponContextCount}/${
      ARENA_V2_A6_STATIC_WEAPON_CONTEXT_CAPACITY_V1
    }${challengeValueText}`,
    `当前目录包含20把武器、2张地图和3种模式，已完成${
      progress.weaponMainResearchProgress
    }/${progress.weaponMainResearchTarget}次主研究和${progress.completedWeaponContextCount
    }/${ARENA_V2_A6_STATIC_WEAPON_CONTEXT_CAPACITY_V1}项武器情境${challengeAccessibilityText}。`,
    true,
  );
}

function primaryAction(
  category: ArenaV2A6GoalCategoryV1 | 'neutral',
  goal: ArenaV2A6NextGoalFactV1 | null,
  sourceState: ArenaV2A6CollectionNextGoalSourceStateV1,
): ArenaV2A6FirstScreenSnapshotV1['primaryAction'] {
  const enabled = sourceState === 'error'
    || sourceState === 'ready';
  const labelText = goal?.actionLabel
    ?? (sourceState === 'error' ? '重试读取收藏档案' : '等待收藏档案可用');
  const disabledReasonMessageId = enabled
    ? null
    : 'arena.v2.a6.profile-unavailable';
  if (category === 'weapon' && goal !== null) return Object.freeze({
    intentId: INTENT.OPEN_SELECTED_WEAPON,
    entryScreenId: 'weapon-index' as const,
    labelMessageId: 'arena.v2.action.open-weapon',
    labelText,
    accessibilityText: `${labelText}。`,
    enabled,
    disabledReasonMessageId,
    targetDefinitionId: goal.weaponDefinitionId,
    minimumTouchTargetCssPixels: 48 as const,
    mutatesProfileOrRules: false as const,
  });
  if (category === 'map' && goal !== null) return Object.freeze({
    intentId: INTENT.OPEN_SELECTED_MAP,
    entryScreenId: 'map-index' as const,
    labelMessageId: 'arena.v2.action.open-map',
    labelText,
    accessibilityText: `${labelText}。`,
    enabled,
    disabledReasonMessageId,
    targetDefinitionId: goal.mapDefinitionId,
    minimumTouchTargetCssPixels: 48 as const,
    mutatesProfileOrRules: false as const,
  });
  return Object.freeze({
    intentId: sourceState === 'error' ? INTENT.RETRY_LOADING : INTENT.OPEN_MODE_SELECT,
    entryScreenId: sourceState === 'error'
      ? 'loading' as const
      : category === 'mode' || category === 'complete'
        ? 'mode-select' as const
        : 'home' as const,
    labelMessageId: sourceState === 'error'
      ? 'arena.v2.action.retry-loading'
      : 'arena.v2.action.choose-mode',
    labelText,
    accessibilityText: `${labelText}。`,
    enabled,
    disabledReasonMessageId,
    targetDefinitionId: goal?.modeDefinitionId ?? null,
    minimumTouchTargetCssPixels: 48 as const,
    mutatesProfileOrRules: false as const,
  });
}

function stateFact(state: Exclude<ArenaV2A6FirstScreenStateV1, 'ready' | 'complete'>):
ArenaV2A6FirstViewFactV1 {
  const value = state === 'loading'
    ? '正在读取收藏档案'
    : state === 'empty'
      ? '尚无可展示的收藏档案'
      : state === 'future-profile'
        ? '档案来自未来版本，当前版本不会覆盖'
        : '收藏档案读取失败，未显示假进度';
  return fact(
    'state-message',
    `arena.v2.a6.state.${state}`,
    value,
    `${value}。`,
  );
}

function projectSnapshot(input: ArenaV2A6CollectionNextGoalInputV1): ArenaV2A6FirstScreenSnapshotV1 {
  const complete = input.nextGoal?.kind === 'catalog-complete'
    && input.nextGoal.goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1;
  const state: ArenaV2A6FirstScreenStateV1 = input.sourceState === 'ready'
    ? complete ? 'complete' : 'ready'
    : input.sourceState;
  const goalCategoryValue: ArenaV2A6GoalCategoryV1 | null = input.nextGoal === null
    ? null
    : goalCategory(input.nextGoal);
  const category: ArenaV2A6GoalCategoryV1 | 'neutral' = goalCategoryValue ?? 'neutral';
  const firstViewFacts = input.progressFact === null
    || input.nextGoal === null
    || goalCategoryValue === null
    ? Object.freeze([stateFact(state as Exclude<ArenaV2A6FirstScreenStateV1, 'ready' | 'complete'>)])
    : Object.freeze([
      fact(
        'next-goal',
        'arena.v2.field.next-goal',
        input.nextGoal.question,
        `${input.nextGoal.question} ${input.nextGoal.actionLabel}。`,
      ),
      fact(
        'goal-progress',
        'arena.v2.a6.goal-progress',
        `${input.nextGoal.currentProgress}/${input.nextGoal.targetProgress}`,
        `当前进度${input.nextGoal.currentProgress}/${input.nextGoal.targetProgress}。`,
        true,
      ),
      categoryProgress(goalCategoryValue, input.progressFact),
    ]);
  const targetDefinitionIds = input.nextGoal === null
    ? Object.freeze([])
    : Object.freeze([
      input.nextGoal.weaponDefinitionId,
      input.nextGoal.mapDefinitionId,
      input.nextGoal.segmentDefinitionId,
      input.nextGoal.modeDefinitionId,
      input.nextGoal.challengeDefinitionId,
    ].filter((entry): entry is string => entry !== null));
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    validationStatus: 'not-run' as const,
    epochId: input.epochId,
    tick: input.tick,
    locale: input.locale,
    state,
    sourceState: input.sourceState,
    profileIdentity: input.progressFact === null ? null : Object.freeze({
      profileDefinitionId: input.progressFact.profileDefinitionId,
      profileDefinitionContentVersion: input.progressFact.profileDefinitionContentVersion,
      profileId: input.progressFact.profileId,
      profileRevision: input.progressFact.profileRevision,
    }),
    goal: input.nextGoal === null || goalCategoryValue === null ? null : Object.freeze({
      kind: input.nextGoal.kind,
      goalId: input.nextGoal.goalId,
      category: goalCategoryValue,
      question: input.nextGoal.question,
      actionLabel: input.nextGoal.actionLabel,
      targetDefinitionIds,
      effectiveLearningRequired: input.nextGoal.effectiveLearningRequired,
    }),
    firstViewFacts,
    primaryAction: primaryAction(category, input.nextGoal, input.sourceState),
    semanticStyle: style(category),
    layout: layout(input.viewport, firstViewFacts.length),
    textFit: Object.freeze({
      questionMaxLines: input.viewport.width === 390 ? 3 as const : 2 as const,
      factMaxLines: input.viewport.width === 390 ? 3 as const : 2 as const,
      primaryActionMaxLines: input.viewport.width === 390 ? 2 as const : 1 as const,
      minimumBodyFontCssPixels: 16 as const,
      minimumActionFontCssPixels: 16 as const,
      overflowPolicy: 'wrap-then-ellipsis-preserve-accessibility-text' as const,
      longTokenBreakPolicy: 'anywhere' as const,
      screenshotEvidence: 'not-run' as const,
    }),
    accessibility: Object.freeze({
      reducedMotion: input.reducedMotion,
      motionPolicy: input.reducedMotion
        ? 'none-static-state-change' as const
        : 'brief-opacity-and-border' as const,
      muted: input.muted,
      visualDependsOnAudioPlayback: false as const,
      silentEquivalentComplete: true as const,
      fullTextPreservedForAssistiveTechnology: true as const,
    }),
    fallback: Object.freeze({
      decorativeAssetMissing: input.decorativeAssetState === 'missing',
      usesTextShapePatternFallback: input.decorativeAssetState === 'missing',
      programmaticAssetClaimsApproval: false as const,
    }),
    capacityDisclosure: Object.freeze({
      weaponCount: 20 as const,
      mapCount: 2 as const,
      mapSegmentCount: 20 as const,
      modeCount: 3 as const,
      challengeCount: 20 as const,
      characterIdentityCount: 6 as const,
      staticCapacityHours: 200 as const,
      evidenceKind: 'capacity-hypothesis' as const,
      longitudinalEvidence: 'not-run' as const,
      isRetentionGuarantee: false as const,
      addsCharacterFunction: false as const,
      firstViewFact: false as const,
    }),
  });
}

function profileCanonical(input: ArenaV2A6CollectionNextGoalInputV1): string | null {
  return input.progressFact === null
    ? null
    : JSON.stringify({ progressFact: input.progressFact, nextGoal: input.nextGoal });
}

export class ArenaV2CollectionNextGoalFirstScreenCandidateV1 {
  #epochId: string;
  #state: ArenaV2A6CollectionNextGoalViewStateV1 =
    ARENA_V2_A6_COLLECTION_NEXT_GOAL_VIEW_STATE_V1.ACTIVE;
  #lastTick = -1;
  #lastInputCanonical: string | null = null;
  #profileIdentity: string | null = null;
  #profileRevision = -1;
  #profileCanonical: string | null = null;
  #snapshot: ArenaV2A6FirstScreenSnapshotV1 | null = null;
  #busy = false;

  constructor(value: unknown) {
    const source = exactRecord(
      cloneStrictData(value, 'A6 first-screen constructor'),
      CONSTRUCTOR_KEYS,
      'A6 first-screen constructor',
    );
    this.#epochId = nonEmptyString(source.epochId, 'A6 constructor.epochId', 200);
  }

  get state(): ArenaV2A6CollectionNextGoalViewStateV1 { return this.#state; }

  #assertActive(operation: string): void {
    if (this.#state !== ARENA_V2_A6_COLLECTION_NEXT_GOAL_VIEW_STATE_V1.ACTIVE) {
      throw new Error(`${operation}拒绝状态${this.#state}。`);
    }
    if (this.#busy) throw new Error(`${operation}拒绝重入。`);
  }

  consume(value: unknown): ArenaV2A6FirstScreenSnapshotV1 {
    this.#assertActive('A6 first-screen consume');
    this.#busy = true;
    try {
      const input = parseInput(value);
      if (input.epochId !== this.#epochId) throw new RangeError('A6输入epochId漂移。');
      const canonical = JSON.stringify(input);
      if (input.tick < this.#lastTick) throw new RangeError('A6输入tick回退。');
      if (input.tick === this.#lastTick) {
        if (canonical !== this.#lastInputCanonical) throw new RangeError('A6同tick输入携带冲突事实。');
        if (this.#snapshot === null) throw new Error('A6同tick幂等状态缺少已提交快照。');
        return this.#snapshot;
      }
      const nextProfileIdentity = input.progressFact === null ? null : [
        input.progressFact.profileDefinitionId,
        input.progressFact.profileDefinitionContentVersion,
        input.progressFact.profileId,
      ].join('|');
      const nextProfileCanonical = profileCanonical(input);
      if (
        this.#profileIdentity !== null
        && nextProfileIdentity !== null
        && nextProfileIdentity !== this.#profileIdentity
      ) throw new RangeError('A6同epoch Profile身份漂移。');
      if (input.progressFact !== null && input.progressFact.profileRevision < this.#profileRevision) {
        throw new RangeError('A6 Profile revision回退。');
      }
      if (
        input.progressFact !== null
        && input.progressFact.profileRevision === this.#profileRevision
        && nextProfileCanonical !== this.#profileCanonical
      ) throw new RangeError('A6相同Profile revision携带冲突进度或目标。');
      const snapshot = projectSnapshot(input);
      this.#lastTick = input.tick;
      this.#lastInputCanonical = canonical;
      if (input.progressFact !== null) {
        this.#profileIdentity = nextProfileIdentity;
        this.#profileRevision = input.progressFact.profileRevision;
        this.#profileCanonical = nextProfileCanonical;
      }
      this.#snapshot = snapshot;
      return snapshot;
    } finally {
      this.#busy = false;
    }
  }

  getSnapshot(): ArenaV2A6FirstScreenSnapshotV1 | null {
    this.#assertActive('A6 first-screen getSnapshot');
    return this.#snapshot;
  }

  resetPresentationEpoch(value: unknown): void {
    this.#assertActive('A6 first-screen resetPresentationEpoch');
    const source = exactRecord(
      cloneStrictData(value, 'A6 epoch reset'),
      RESET_KEYS,
      'A6 epoch reset',
    );
    const epochId = nonEmptyString(source.epochId, 'A6 epoch reset.epochId', 200);
    if (epochId === this.#epochId) throw new RangeError('A6 epoch reset必须使用新epochId。');
    this.#epochId = epochId;
    this.#lastTick = -1;
    this.#lastInputCanonical = null;
    this.#profileIdentity = null;
    this.#profileRevision = -1;
    this.#profileCanonical = null;
    this.#snapshot = null;
  }

  destroy(): void {
    if (this.#state === ARENA_V2_A6_COLLECTION_NEXT_GOAL_VIEW_STATE_V1.DESTROYED) return;
    if (this.#busy) throw new Error('A6 first-screen consume期间不能destroy。');
    this.#lastTick = -1;
    this.#lastInputCanonical = null;
    this.#profileIdentity = null;
    this.#profileRevision = -1;
    this.#profileCanonical = null;
    this.#snapshot = null;
    this.#state = ARENA_V2_A6_COLLECTION_NEXT_GOAL_VIEW_STATE_V1.DESTROYED;
  }
}

export const ARENA_V2_A6_COLLECTION_NEXT_GOAL_REFERENCE_LEDGER_V1 = Object.freeze([
  Object.freeze({ read: true as const, path: '.agents/skills/threejs-game-ui-designer/SKILL.md' }),
  Object.freeze({ read: true as const, path: '.agents/skills/threejs-game-ui-designer/references/ui-patterns.md' }),
  Object.freeze({ read: true as const, path: '.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md' }),
  Object.freeze({ read: true as const, path: '.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md' }),
  Object.freeze({ read: true as const, path: '.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md' }),
  Object.freeze({ read: true as const, path: '.agents/skills/threejs-game-ui-designer/references/checklists/mobile-input.md' }),
  Object.freeze({ read: true as const, path: 'docs/architecture/arena-art-bible.md' }),
  Object.freeze({ read: true as const, path: 'docs/architecture/arena-art-development-alignment-matrix.md' }),
  Object.freeze({ read: true as const, path: 'docs/decisions/073-arena-v2-ui-eleven-page-contract.md' }),
  Object.freeze({ read: true as const, path: 'docs/architecture/arena-v2-p6-implementation-ledger.md' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-progression/src/arena-v2-next-learning-goal-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-progression/src/arena-v2-learning-information-projection-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-progression/src/arena-v2-learning-capacity-report-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-profile-contracts/src/arena-v2-learning-profile-definition-v1.ts' }),
] as const);

export const ARENA_V2_A6_COLLECTION_NEXT_GOAL_FIRST_SCREEN_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  validationStatus: 'not-run' as const,
  rendererNeutral: true as const,
  ownsProfileWrites: false as const,
  ownsRewardResolution: false as const,
  ownsNextGoalSelection: false as const,
  catalogCompletePrimaryActionWired: true as const,
  catalogCompletePrimaryActionTarget: 'existing-mode-select' as const,
  promisesObservedRetentionHours: false as const,
  pageCountAdded: 0 as const,
  maximumFirstViewFacts: 3 as const,
  primaryActionCount: 1 as const,
  minimumTouchTargetCssPixels: 48 as const,
  supportedViewports: Object.freeze(['390x844', '1440x900'] as const),
  usesCurrencyOrStoreOrRedDots: false as const,
  characterIdentityCount: 6 as const,
  addsCharacterFunction: false as const,
  assetBytesAdded: 0 as const,
  screenshotEvidence: 'not-run' as const,
  deviceEvidence: 'not-run' as const,
  humanEvidence: 'not-run' as const,
  referenceLedger: ARENA_V2_A6_COLLECTION_NEXT_GOAL_REFERENCE_LEDGER_V1,
});
