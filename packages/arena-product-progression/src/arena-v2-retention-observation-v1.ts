import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1,
  type ArenaV2WeaponLearningContextV1,
} from '@number-strategy-jump/arena-profile-contracts';

export const ARENA_V2_RETENTION_OBSERVATION_KIND_V1 = Object.freeze({
  CATALOG_FIRST_SEEN: 'catalog-first-seen',
  EFFECTIVE_LEARNING_COMPLETED: 'effective-learning-completed',
  CONTENT_REPEAT_ENTRY: 'content-repeat-entry',
  CROSS_CONTENT_USED: 'cross-content-used',
  NEXT_GOAL_SELECTED: 'next-goal-selected',
  WEAPON_RESEARCH_FOCUS_CONTINUED: 'weapon-research-focus-continued',
  HOME_CONTINUATION_FOLLOWED: 'home-continuation-followed',
  MAP_LEARNING_FOCUS_CONTINUED: 'map-learning-focus-continued',
} as const);

export const ARENA_V2_RETENTION_DENOMINATOR_KEY_V1 = Object.freeze({
  CATALOG_IMPRESSION: 'eligible-catalog-impression',
  SETTLED_MATCH: 'settled-match',
  CONTENT_ENTRY: 'content-entry',
  COMPLETED_CONTENT_WINDOW: 'completed-content-window',
  NEXT_GOAL_IMPRESSION: 'next-goal-impression',
  WEAPON_RESEARCH_FOCUS_OPPORTUNITY: 'weapon-research-focus-opportunity',
  HOME_CONTINUATION_ACCEPTED: 'home-continuation-accepted',
  MAP_LEARNING_FOCUS_OPPORTUNITY: 'map-learning-focus-opportunity',
} as const);

export const ARENA_V2_RETENTION_IDENTIFIER_MAX_LENGTH_V1 = 160 as const;

export type ArenaV2RetentionObservationKindV1 = typeof ARENA_V2_RETENTION_OBSERVATION_KIND_V1[
  keyof typeof ARENA_V2_RETENTION_OBSERVATION_KIND_V1
];
export type ArenaV2RetentionDenominatorKeyV1 = typeof ARENA_V2_RETENTION_DENOMINATOR_KEY_V1[
  keyof typeof ARENA_V2_RETENTION_DENOMINATOR_KEY_V1
];

export interface ArenaV2RetentionObservationV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSinkWired: false;
  readonly eventId: string;
  readonly cohortSubjectId: string;
  readonly sessionSequence: number;
  readonly eventSequence: number;
  readonly profileRevision: number;
  readonly authorityTick: number | null;
  readonly kind: ArenaV2RetentionObservationKindV1;
  readonly denominatorKey: ArenaV2RetentionDenominatorKeyV1;
  readonly numeratorIncrement: 0 | 1;
  readonly denominatorIncrement: 1;
  readonly weaponDefinitionIds: readonly string[];
  readonly mapDefinitionIds: readonly string[];
  readonly modeDefinitionIds: readonly string[];
  readonly goalId: string | null;
  readonly repeatOrdinal: number | null;
  readonly effectiveLearningProgress: boolean | null;
  readonly goalSelected: boolean | null;
  readonly privacy: Readonly<{
    readonly containsRawReplay: false;
    readonly containsInputTrajectory: false;
    readonly containsDeviceFingerprint: false;
    readonly containsWallClockTimestamp: false;
  }>;
}

export interface ArenaV2RetentionMetricV1 {
  readonly kind: ArenaV2RetentionObservationKindV1;
  readonly denominatorKey: ArenaV2RetentionDenominatorKeyV1;
  readonly numerator: number;
  readonly denominator: number;
  readonly ratio: number | null;
}

export interface ArenaV2RetentionObservationReportV1 {
  readonly schemaVersion: 1;
  readonly status: 'offline-candidate-summary';
  readonly productionReady: false;
  readonly longitudinalEvidence: 'not-run';
  readonly observationCount: number;
  readonly distinctSubjectCount: number;
  readonly metrics: readonly ArenaV2RetentionMetricV1[];
}

const OBSERVATION_CREATE_KEYS = new Set([
  'schemaVersion', 'status', 'hardGate', 'defaultSinkWired', 'eventId',
  'cohortSubjectId', 'sessionSequence', 'eventSequence', 'profileRevision',
  'authorityTick', 'kind', 'weaponDefinitionIds', 'mapDefinitionIds',
  'modeDefinitionIds', 'goalId', 'repeatOrdinal', 'effectiveLearningProgress',
  'goalSelected',
]);
const OBSERVATION_VALUE_KEYS = new Set([
  ...OBSERVATION_CREATE_KEYS,
  'denominatorKey', 'numeratorIncrement', 'denominatorIncrement', 'privacy',
]);
const PRIVACY_KEYS = new Set([
  'containsRawReplay', 'containsInputTrajectory', 'containsDeviceFingerprint',
  'containsWallClockTimestamp',
]);
const RESEARCH_FOCUS_CREATE_KEYS = new Set([
  'schemaVersion', 'status', 'hardGate', 'defaultSinkWired', 'eventId',
  'cohortSubjectId', 'sessionSequence', 'eventSequence', 'profileRevision',
  'authorityTick', 'previousGoalId', 'previousGoalProfileRevision', 'previousGoalKind',
  'previousGoalWeaponDefinitionId', 'previousGoalContext',
  'progressedWeaponDefinitionId', 'progressedContext',
]);
const MAP_LEARNING_FOCUS_CREATE_KEYS = new Set([
  'schemaVersion', 'status', 'hardGate', 'defaultSinkWired', 'eventId',
  'cohortSubjectId', 'sessionSequence', 'eventSequence', 'profileRevision',
  'authorityTick', 'previousGoalId', 'previousGoalProfileRevision', 'previousGoalKind',
  'previousGoalMapDefinitionId', 'previousGoalSegmentDefinitionId',
  'progressedMapDefinitionId', 'progressedSegmentDefinitionId',
]);
const MAX_DIMENSION_IDS = 64;
const KIND_ORDER = Object.freeze([
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CATALOG_FIRST_SEEN,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CONTENT_REPEAT_ENTRY,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CROSS_CONTENT_USED,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.NEXT_GOAL_SELECTED,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.WEAPON_RESEARCH_FOCUS_CONTINUED,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.HOME_CONTINUATION_FOLLOWED,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.MAP_LEARNING_FOCUS_CONTINUED,
]);
const DENOMINATOR_BY_KIND: Readonly<Record<
  ArenaV2RetentionObservationKindV1,
  ArenaV2RetentionDenominatorKeyV1
>> = Object.freeze({
  'catalog-first-seen': ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.CATALOG_IMPRESSION,
  'effective-learning-completed': ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.SETTLED_MATCH,
  'content-repeat-entry': ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.CONTENT_ENTRY,
  'cross-content-used': ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.COMPLETED_CONTENT_WINDOW,
  'next-goal-selected': ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.NEXT_GOAL_IMPRESSION,
  'weapon-research-focus-continued':
    ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.WEAPON_RESEARCH_FOCUS_OPPORTUNITY,
  'home-continuation-followed':
    ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.HOME_CONTINUATION_ACCEPTED,
  'map-learning-focus-continued':
    ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.MAP_LEARNING_FOCUS_OPPORTUNITY,
});
const PRIVACY = Object.freeze({
  containsRawReplay: false as const,
  containsInputTrajectory: false as const,
  containsDeviceFingerprint: false as const,
  containsWallClockTimestamp: false as const,
});

function assertProfileRevisionOrder(
  observations: readonly ArenaV2RetentionObservationV1[],
): void {
  const observationsBySubject = new Map<string, ArenaV2RetentionObservationV1[]>();
  for (const observation of observations) {
    const subjectObservations = observationsBySubject.get(observation.cohortSubjectId) ?? [];
    subjectObservations.push(observation);
    observationsBySubject.set(observation.cohortSubjectId, subjectObservations);
  }
  for (const subjectObservations of observationsBySubject.values()) {
    subjectObservations.sort((left, right) => {
      if (left.sessionSequence !== right.sessionSequence) {
        return left.sessionSequence < right.sessionSequence ? -1 : 1;
      }
      if (left.eventSequence === right.eventSequence) return 0;
      return left.eventSequence < right.eventSequence ? -1 : 1;
    });
    let previousProfileRevision: number | null = null;
    for (const observation of subjectObservations) {
      if (previousProfileRevision !== null
        && observation.profileRevision < previousProfileRevision) {
        throw new RangeError('Arena V2留存观察profileRevision不能随事件身份回退。');
      }
      previousProfileRevision = observation.profileRevision;
    }
  }
}

function exact(value: unknown, name: string): Readonly<{
  source: PlainRecord;
  includesDerivedFields: boolean;
}> {
  const source = cloneFrozenData(value, name);
  const includesDerivedFields = typeof source === 'object'
    && source !== null
    && Object.hasOwn(source, 'denominatorKey');
  const keys = includesDerivedFields ? OBSERVATION_VALUE_KEYS : OBSERVATION_CREATE_KEYS;
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return Object.freeze({ source, includesDerivedFields });
}

function id(value: unknown, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (result.length > ARENA_V2_RETENTION_IDENTIFIER_MAX_LENGTH_V1) {
    throw new RangeError(`${name}超出长度上限。`);
  }
  return result;
}

function optionalId(value: unknown, name: string): string | null {
  return value === null ? null : id(value, name);
}

function ids(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  const result = cloneFrozenStringSet(value, name);
  if (result.length > MAX_DIMENSION_IDS) throw new RangeError(`${name}超出数量上限。`);
  result.forEach((entry, index) => id(entry, `${name}[${index}]`));
  return result;
}

function optionalBoolean(value: unknown, name: string): boolean | null {
  if (value !== null && typeof value !== 'boolean') throw new TypeError(`${name}必须是布尔值或null。`);
  return value as boolean | null;
}

function optionalOrdinal(value: unknown, name: string): number | null {
  return value === null ? null : assertIntegerAtLeast(value, 1, name);
}

function optionalTick(value: unknown, name: string): number | null {
  return value === null ? null : assertIntegerAtLeast(value, 0, name);
}

function settlementProfileRevision(
  previousGoalProfileRevisionValue: unknown,
  profileRevisionValue: unknown,
  name: string,
): number {
  const previousGoalProfileRevision = assertIntegerAtLeast(
    previousGoalProfileRevisionValue,
    0,
    `${name}.previousGoalProfileRevision`,
  );
  const expectedProfileRevision = previousGoalProfileRevision + 1;
  if (!Number.isSafeInteger(expectedProfileRevision)) {
    throw new RangeError(`${name}.previousGoalProfileRevision溢出。`);
  }
  const profileRevision = assertIntegerAtLeast(
    profileRevisionValue,
    0,
    `${name}.profileRevision`,
  );
  if (profileRevision !== expectedProfileRevision) {
    throw new RangeError(`${name}目标与结算Profile revision不连续。`);
  }
  return profileRevision;
}

function numerator(
  kind: ArenaV2RetentionObservationKindV1,
  repeatOrdinal: number | null,
  effectiveLearningProgress: boolean | null,
  goalSelected: boolean | null,
  weaponDefinitionIds: readonly string[],
  mapDefinitionIds: readonly string[],
  modeDefinitionIds: readonly string[],
): 0 | 1 {
  switch (kind) {
    case ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CATALOG_FIRST_SEEN:
      if (repeatOrdinal === null) throw new RangeError('catalog-first-seen需要repeatOrdinal。');
      return repeatOrdinal === 1 ? 1 : 0;
    case ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED:
      if (effectiveLearningProgress === null) {
        throw new RangeError('effective-learning-completed需要有效进度结果。');
      }
      return effectiveLearningProgress ? 1 : 0;
    case ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CONTENT_REPEAT_ENTRY:
      if (repeatOrdinal === null) throw new RangeError('content-repeat-entry需要repeatOrdinal。');
      return repeatOrdinal > 1 ? 1 : 0;
    case ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CROSS_CONTENT_USED:
      return weaponDefinitionIds.length > 1 || mapDefinitionIds.length > 1 ? 1 : 0;
    case ARENA_V2_RETENTION_OBSERVATION_KIND_V1.NEXT_GOAL_SELECTED:
      if (goalSelected === null) throw new RangeError('next-goal-selected需要goalSelected。');
      return goalSelected ? 1 : 0;
    case ARENA_V2_RETENTION_OBSERVATION_KIND_V1.WEAPON_RESEARCH_FOCUS_CONTINUED:
      if (goalSelected === null || weaponDefinitionIds.length !== 1) {
        throw new RangeError('weapon-research-focus-continued需要一把目标武器和延续结果。');
      }
      return goalSelected ? 1 : 0;
    case ARENA_V2_RETENTION_OBSERVATION_KIND_V1.HOME_CONTINUATION_FOLLOWED:
      if (goalSelected === null || modeDefinitionIds.length !== 1
        || weaponDefinitionIds.length > 1 || mapDefinitionIds.length > 1) {
        throw new RangeError(
          'home-continuation-followed需要唯一目标模式、可选单武器/地图和兑现结果。',
        );
      }
      return goalSelected ? 1 : 0;
    case ARENA_V2_RETENTION_OBSERVATION_KIND_V1.MAP_LEARNING_FOCUS_CONTINUED:
      if (goalSelected === null || mapDefinitionIds.length !== 1) {
        throw new RangeError('map-learning-focus-continued需要一张目标地图和延续结果。');
      }
      return goalSelected ? 1 : 0;
  }
}

/**
 * Creates one denominator-complete, offline observation. Callers provide
 * stable sequence identities; the contract intentionally has no clock,
 * network sink, raw replay, input path or device identity.
 */
export function createArenaV2RetentionObservationV1(
  value: unknown,
): ArenaV2RetentionObservationV1 {
  const { source, includesDerivedFields } = exact(value, 'ArenaV2RetentionObservationV1');
  if (source.schemaVersion !== 1
    || source.status !== 'production-unreachable'
    || source.hardGate !== false
    || source.defaultSinkWired !== false) {
    throw new RangeError('Arena V2留存观察不得提前接入生产。');
  }
  if (!KIND_ORDER.includes(source.kind as ArenaV2RetentionObservationKindV1)) {
    throw new RangeError(`Arena V2留存观察kind不受支持：${String(source.kind)}。`);
  }
  const kind = source.kind as ArenaV2RetentionObservationKindV1;
  const weaponDefinitionIds = ids(source.weaponDefinitionIds, 'weaponDefinitionIds');
  const mapDefinitionIds = ids(source.mapDefinitionIds, 'mapDefinitionIds');
  const modeDefinitionIds = ids(source.modeDefinitionIds, 'modeDefinitionIds');
  const goalId = optionalId(source.goalId, 'goalId');
  const repeatOrdinal = optionalOrdinal(source.repeatOrdinal, 'repeatOrdinal');
  const effectiveLearningProgress = optionalBoolean(
    source.effectiveLearningProgress,
    'effectiveLearningProgress',
  );
  const goalSelected = optionalBoolean(source.goalSelected, 'goalSelected');
  if ((kind === ARENA_V2_RETENTION_OBSERVATION_KIND_V1.NEXT_GOAL_SELECTED
    || kind === ARENA_V2_RETENTION_OBSERVATION_KIND_V1.WEAPON_RESEARCH_FOCUS_CONTINUED
    || kind === ARENA_V2_RETENTION_OBSERVATION_KIND_V1.HOME_CONTINUATION_FOLLOWED
    || kind === ARENA_V2_RETENTION_OBSERVATION_KIND_V1.MAP_LEARNING_FOCUS_CONTINUED)
    && goalId === null) {
    throw new RangeError(`${kind}必须携带goalId。`);
  }
  if (kind !== ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CATALOG_FIRST_SEEN
    && kind !== ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CONTENT_REPEAT_ENTRY
    && repeatOrdinal !== null) {
    throw new RangeError(`${kind}不能携带repeatOrdinal。`);
  }
  if (kind !== ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED
    && effectiveLearningProgress !== null) {
    throw new RangeError(`${kind}不能携带effectiveLearningProgress。`);
  }
  if (kind !== ARENA_V2_RETENTION_OBSERVATION_KIND_V1.NEXT_GOAL_SELECTED
    && kind !== ARENA_V2_RETENTION_OBSERVATION_KIND_V1.WEAPON_RESEARCH_FOCUS_CONTINUED
    && kind !== ARENA_V2_RETENTION_OBSERVATION_KIND_V1.HOME_CONTINUATION_FOLLOWED
    && kind !== ARENA_V2_RETENTION_OBSERVATION_KIND_V1.MAP_LEARNING_FOCUS_CONTINUED
    && goalSelected !== null) {
    throw new RangeError(`${kind}不能携带goalSelected。`);
  }
  const numeratorIncrement = numerator(
    kind,
    repeatOrdinal,
    effectiveLearningProgress,
    goalSelected,
    weaponDefinitionIds,
    mapDefinitionIds,
    modeDefinitionIds,
  );
  const result = Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSinkWired: false as const,
    eventId: id(source.eventId, 'eventId'),
    cohortSubjectId: id(source.cohortSubjectId, 'cohortSubjectId'),
    sessionSequence: assertIntegerAtLeast(source.sessionSequence, 1, 'sessionSequence'),
    eventSequence: assertIntegerAtLeast(source.eventSequence, 1, 'eventSequence'),
    profileRevision: assertIntegerAtLeast(source.profileRevision, 0, 'profileRevision'),
    authorityTick: optionalTick(source.authorityTick, 'authorityTick'),
    kind,
    denominatorKey: DENOMINATOR_BY_KIND[kind],
    numeratorIncrement,
    denominatorIncrement: 1 as const,
    weaponDefinitionIds,
    mapDefinitionIds,
    modeDefinitionIds,
    goalId,
    repeatOrdinal,
    effectiveLearningProgress,
    goalSelected,
    privacy: PRIVACY,
  });
  if (includesDerivedFields) {
    assertKnownKeys(source.privacy, PRIVACY_KEYS, 'ArenaV2RetentionObservationV1.privacy');
    for (const key of PRIVACY_KEYS) {
      if (!Object.hasOwn(source.privacy, key) || source.privacy[key] !== false) {
        throw new RangeError('Arena V2留存观察privacy声明不一致。');
      }
    }
    if (source.denominatorKey !== result.denominatorKey
      || source.numeratorIncrement !== result.numeratorIncrement
      || source.denominatorIncrement !== result.denominatorIncrement) {
      throw new RangeError('Arena V2留存观察派生分子或分母不一致。');
    }
  }
  return result;
}

/**
 * Creates the denominator-complete continuation observation for either the
 * 120-step main weapon research goal or one exact weapon-context goal. It
 * compares reducer-applied identities only; it never reads input trajectories
 * or infers intent from combat positions.
 */
export function createArenaV2WeaponResearchFocusContinuationObservationV1(
  value: unknown,
): ArenaV2RetentionObservationV1 {
  const source = cloneFrozenData(value, 'ArenaV2WeaponResearchFocusContinuationObservationV1');
  assertKnownKeys(
    source,
    RESEARCH_FOCUS_CREATE_KEYS,
    'ArenaV2WeaponResearchFocusContinuationObservationV1',
  );
  for (const key of RESEARCH_FOCUS_CREATE_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`ArenaV2WeaponResearchFocusContinuationObservationV1缺少${key}。`);
    }
  }
  const previousGoalId = id(source.previousGoalId, 'previousGoalId');
  const profileRevision = settlementProfileRevision(
    source.previousGoalProfileRevision,
    source.profileRevision,
    'ArenaV2WeaponResearchFocusContinuationObservationV1',
  );
  if (source.previousGoalKind !== 'collect-weapon'
    && source.previousGoalKind !== 'weapon-context') {
    throw new RangeError('previousGoalKind必须是collect-weapon或weapon-context。');
  }
  const previousGoalKind = source.previousGoalKind;
  const previousGoalWeaponDefinitionId = id(
    source.previousGoalWeaponDefinitionId,
    'previousGoalWeaponDefinitionId',
  );
  const previousGoalContext = optionalId(source.previousGoalContext, 'previousGoalContext');
  const progressedWeaponDefinitionId = optionalId(
    source.progressedWeaponDefinitionId,
    'progressedWeaponDefinitionId',
  );
  const progressedContext = optionalId(source.progressedContext, 'progressedContext');
  const isKnownContext = (context: string | null): context is ArenaV2WeaponLearningContextV1 => (
    context !== null && ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.includes(
      context as ArenaV2WeaponLearningContextV1,
    )
  );
  if (previousGoalKind === 'collect-weapon' && previousGoalContext !== null) {
    throw new RangeError('collect-weapon目标不能携带武器情境。');
  }
  if (previousGoalKind === 'weapon-context' && !isKnownContext(previousGoalContext)) {
    throw new RangeError('weapon-context目标必须携带规范武器情境。');
  }
  if (previousGoalKind === 'collect-weapon' && progressedContext !== null) {
    throw new RangeError('collect-weapon进度不能携带武器情境。');
  }
  if (previousGoalKind === 'weapon-context'
    && progressedContext !== null && !isKnownContext(progressedContext)) {
    throw new RangeError('weapon-context进度携带了未知武器情境。');
  }
  if (previousGoalKind === 'weapon-context'
    && (progressedWeaponDefinitionId === null) !== (progressedContext === null)) {
    throw new RangeError('weapon-context进度的武器和情境身份必须同时存在或同时缺失。');
  }
  const expectedGoalId = previousGoalKind === 'collect-weapon'
    ? `collect-weapon:${previousGoalWeaponDefinitionId}`
    : `weapon-context:${previousGoalWeaponDefinitionId}:${previousGoalContext}`;
  if (previousGoalId !== expectedGoalId) {
    throw new RangeError('武器学习焦点goalId与目标身份不一致。');
  }
  const continued = previousGoalKind === 'collect-weapon'
    ? progressedWeaponDefinitionId === previousGoalWeaponDefinitionId
    : progressedWeaponDefinitionId === previousGoalWeaponDefinitionId
      && progressedContext === previousGoalContext;
  return createArenaV2RetentionObservationV1({
    schemaVersion: source.schemaVersion,
    status: source.status,
    hardGate: source.hardGate,
    defaultSinkWired: source.defaultSinkWired,
    eventId: source.eventId,
    cohortSubjectId: source.cohortSubjectId,
    sessionSequence: source.sessionSequence,
    eventSequence: source.eventSequence,
    profileRevision,
    authorityTick: source.authorityTick,
    kind: ARENA_V2_RETENTION_OBSERVATION_KIND_V1.WEAPON_RESEARCH_FOCUS_CONTINUED,
    weaponDefinitionIds: [previousGoalWeaponDefinitionId],
    mapDefinitionIds: [],
    modeDefinitionIds: [],
    goalId: previousGoalId,
    repeatOrdinal: null,
    effectiveLearningProgress: null,
    goalSelected: continued,
  });
}

/**
 * Creates the denominator-complete continuation observation for a frozen map
 * collection or route-segment goal. The caller provides only reducer-applied
 * settlement identities; selecting or merely entering the map cannot count as
 * continued learning progress.
 */
export function createArenaV2MapLearningFocusContinuationObservationV1(
  value: unknown,
): ArenaV2RetentionObservationV1 {
  const name = 'ArenaV2MapLearningFocusContinuationObservationV1';
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, MAP_LEARNING_FOCUS_CREATE_KEYS, name);
  for (const key of MAP_LEARNING_FOCUS_CREATE_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  const previousGoalId = id(source.previousGoalId, 'previousGoalId');
  const profileRevision = settlementProfileRevision(
    source.previousGoalProfileRevision,
    source.profileRevision,
    'ArenaV2MapLearningFocusContinuationObservationV1',
  );
  if (source.previousGoalKind !== 'collect-map' && source.previousGoalKind !== 'map-segment') {
    throw new RangeError('previousGoalKind必须是collect-map或map-segment。');
  }
  const previousGoalKind = source.previousGoalKind;
  const previousGoalMapDefinitionId = id(
    source.previousGoalMapDefinitionId,
    'previousGoalMapDefinitionId',
  );
  const previousGoalSegmentDefinitionId = optionalId(
    source.previousGoalSegmentDefinitionId,
    'previousGoalSegmentDefinitionId',
  );
  const progressedMapDefinitionId = optionalId(
    source.progressedMapDefinitionId,
    'progressedMapDefinitionId',
  );
  const progressedSegmentDefinitionId = optionalId(
    source.progressedSegmentDefinitionId,
    'progressedSegmentDefinitionId',
  );
  if (previousGoalKind === 'collect-map' && previousGoalSegmentDefinitionId !== null) {
    throw new RangeError('collect-map目标不能携带路段身份。');
  }
  if (previousGoalKind === 'map-segment' && previousGoalSegmentDefinitionId === null) {
    throw new RangeError('map-segment目标必须携带路段身份。');
  }
  if ((progressedMapDefinitionId === null) !== (progressedSegmentDefinitionId === null)
    && previousGoalKind === 'map-segment') {
    throw new RangeError('map-segment进度的地图和路段身份必须同时存在或同时缺失。');
  }
  if (previousGoalKind === 'collect-map' && progressedSegmentDefinitionId !== null) {
    throw new RangeError('collect-map进度不能携带路段身份。');
  }
  const expectedGoalId = previousGoalKind === 'collect-map'
    ? `collect-map:${previousGoalMapDefinitionId}`
    : `map-segment:${previousGoalMapDefinitionId}:${previousGoalSegmentDefinitionId}`;
  if (previousGoalId !== expectedGoalId) {
    throw new RangeError('地图学习焦点goalId与目标身份不一致。');
  }
  const continued = previousGoalKind === 'collect-map'
    ? progressedMapDefinitionId === previousGoalMapDefinitionId
    : progressedMapDefinitionId === previousGoalMapDefinitionId
      && progressedSegmentDefinitionId === previousGoalSegmentDefinitionId;
  return createArenaV2RetentionObservationV1({
    schemaVersion: source.schemaVersion,
    status: source.status,
    hardGate: source.hardGate,
    defaultSinkWired: source.defaultSinkWired,
    eventId: source.eventId,
    cohortSubjectId: source.cohortSubjectId,
    sessionSequence: source.sessionSequence,
    eventSequence: source.eventSequence,
    profileRevision,
    authorityTick: source.authorityTick,
    kind: ARENA_V2_RETENTION_OBSERVATION_KIND_V1.MAP_LEARNING_FOCUS_CONTINUED,
    weaponDefinitionIds: [],
    mapDefinitionIds: [previousGoalMapDefinitionId],
    modeDefinitionIds: [],
    goalId: previousGoalId,
    repeatOrdinal: null,
    effectiveLearningProgress: null,
    goalSelected: continued,
  });
}

export function aggregateArenaV2RetentionObservationsV1(
  values: readonly unknown[],
): ArenaV2RetentionObservationReportV1 {
  if (!Array.isArray(values)) throw new TypeError('Arena V2留存观察集合必须是数组。');
  const observations = values.map(createArenaV2RetentionObservationV1);
  if (new Set(observations.map(({ eventId }) => eventId)).size !== observations.length) {
    throw new RangeError('Arena V2留存观察eventId不能重复。');
  }
  const sequenceIdentities = observations.map((entry) => (
    `${entry.cohortSubjectId}\u0000${entry.sessionSequence}\u0000${entry.eventSequence}`
  ));
  if (new Set(sequenceIdentities).size !== sequenceIdentities.length) {
    throw new RangeError('同一留存观察主体和session不能重复使用eventSequence。');
  }
  assertProfileRevisionOrder(observations);
  const metrics = KIND_ORDER.map((kind): ArenaV2RetentionMetricV1 => {
    const matching = observations.filter((entry) => entry.kind === kind);
    const numeratorValue = matching.reduce(
      (total, entry) => total + entry.numeratorIncrement,
      0,
    );
    const denominator = matching.reduce(
      (total, entry) => total + entry.denominatorIncrement,
      0,
    );
    return Object.freeze({
      kind,
      denominatorKey: DENOMINATOR_BY_KIND[kind],
      numerator: numeratorValue,
      denominator,
      ratio: denominator === 0 ? null : numeratorValue / denominator,
    });
  });
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'offline-candidate-summary' as const,
    productionReady: false as const,
    longitudinalEvidence: 'not-run' as const,
    observationCount: observations.length,
    distinctSubjectCount: new Set(observations.map(({ cohortSubjectId }) => cohortSubjectId)).size,
    metrics: Object.freeze(metrics),
  });
}
