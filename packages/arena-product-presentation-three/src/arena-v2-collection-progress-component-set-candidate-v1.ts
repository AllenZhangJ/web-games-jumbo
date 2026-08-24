import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2InformationCollectionContentProjectionV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
  ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
  ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1,
  projectArenaV2MapRouteResearchMilestoneV1,
  projectArenaV2WeaponCollectionResearchMilestoneV1,
  type ArenaV2MapRouteResearchMilestoneProjectionV1,
  type ArenaV2WeaponCollectionResearchMilestoneThresholdV1,
  type ArenaV2WeaponCollectionResearchStageV1,
} from '@number-strategy-jump/arena-product-progression';
import type {
  ArenaV2A6NextGoalKindV1,
} from './arena-v2-collection-next-goal-first-screen-candidate-v1.js';

export const ARENA_V2_A6_COLLECTION_PROGRESS_COMPONENT_SET_SCHEMA_VERSION_V1 = 1 as const;

export const ARENA_V2_A6_COLLECTION_PROGRESS_SOURCE_STATE_V1 = Object.freeze({
  READY: 'ready',
  LOADING: 'loading',
  EMPTY: 'empty',
  ERROR: 'error',
  FUTURE_PROFILE: 'future-profile',
} as const);

export const ARENA_V2_A6_COLLECTION_PROGRESS_LIFECYCLE_STATE_V1 = Object.freeze({
  ACTIVE: 'active',
  DESTROYED: 'destroyed',
} as const);

export type ArenaV2A6CollectionProgressSourceStateV1 =
  typeof ARENA_V2_A6_COLLECTION_PROGRESS_SOURCE_STATE_V1[
    keyof typeof ARENA_V2_A6_COLLECTION_PROGRESS_SOURCE_STATE_V1
  ];
export type ArenaV2A6CollectionProgressLifecycleStateV1 =
  typeof ARENA_V2_A6_COLLECTION_PROGRESS_LIFECYCLE_STATE_V1[
    keyof typeof ARENA_V2_A6_COLLECTION_PROGRESS_LIFECYCLE_STATE_V1
  ];
export type ArenaV2A6CollectionProgressItemKindV1 = 'weapon' | 'map';

const CONTEXTS = new Set(['ground', 'aerial', 'edge', 'duel-counterplay', 'survival']);
const GOAL_KINDS = new Set<ArenaV2A6NextGoalKindV1>([
  'collect-map',
  'collect-weapon',
  'weapon-context',
  'map-segment',
  'mode-mastery',
  'cross-challenge',
  'record-improvement',
  'catalog-complete',
]);

export interface ArenaV2A6CollectionProgressProfileIdentityV1 {
  readonly profileSchemaVersion: 1;
  readonly profileDefinitionId: 'arena-v2.learning-profile.candidate.v1';
  readonly profileDefinitionContentVersion: 5;
  readonly profileId: string;
  readonly profileRevision: number;
}

export interface ArenaV2A6WeaponCollectionProgressFactV1 {
  readonly weaponDefinitionId: string;
  readonly collected: boolean;
  readonly collectionEvidenceCount: number;
  readonly collectionEvidenceTarget: number;
  readonly completedContextCount: number;
  readonly mastered: boolean;
}

export interface ArenaV2A6MapCollectionProgressFactV1 {
  readonly mapDefinitionId: string;
  readonly collected: boolean;
  readonly completedSegmentCount: number;
  readonly totalSegmentCount: number;
  readonly routeResearch: ArenaV2MapRouteResearchMilestoneProjectionV1;
}

export interface ArenaV2A6CollectionProgressFactsV1 {
  readonly schemaVersion: 1;
  readonly weapons: readonly ArenaV2A6WeaponCollectionProgressFactV1[];
  readonly maps: readonly ArenaV2A6MapCollectionProgressFactV1[];
  readonly weaponJourney: ArenaV2A6WeaponCollectionJourneyFactV1;
}

export interface ArenaV2A6WeaponCollectionJourneyFactV1 {
  readonly currentMainResearch: number;
  readonly targetMainResearch: 2_400;
  readonly remainingMainResearch: number;
  readonly collectedWeaponCount: number;
  readonly weaponCount: 20;
  readonly averageMatchMinutesAssumption:
    typeof ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1;
  readonly estimatedRemainingMinutes: number;
  readonly estimateKind: 'capacity-hypothesis-not-player-promise';
}

export interface ArenaV2A6WeaponCollectionJourneyReadV1 extends
  ArenaV2A6WeaponCollectionJourneyFactV1 {
  readonly valueText: string;
  readonly accessibilityText: string;
  readonly fixedWidthNumeric: true;
}

export interface ArenaV2A6CollectionNextGoalIdentityV1 {
  readonly schemaVersion: 1;
  readonly profileRevision: number;
  readonly kind: ArenaV2A6NextGoalKindV1;
  readonly goalId: string;
  readonly weaponDefinitionId: string | null;
  readonly mapDefinitionId: string | null;
  readonly segmentDefinitionId: string | null;
  readonly modeDefinitionId: string | null;
  readonly challengeDefinitionId: string | null;
  readonly context: 'ground' | 'aerial' | 'edge' | 'duel-counterplay' | 'survival' | null;
}

export interface ArenaV2A6CollectionProgressComponentInputV1 {
  readonly schemaVersion: typeof ARENA_V2_A6_COLLECTION_PROGRESS_COMPONENT_SET_SCHEMA_VERSION_V1;
  readonly epochId: string;
  readonly tick: number;
  readonly locale: string;
  readonly sourceState: ArenaV2A6CollectionProgressSourceStateV1;
  readonly profileIdentity: ArenaV2A6CollectionProgressProfileIdentityV1 | null;
  readonly collectionContent: ArenaV2InformationCollectionContentProjectionV1;
  readonly progressFacts: ArenaV2A6CollectionProgressFactsV1 | null;
  readonly nextGoalIdentity: ArenaV2A6CollectionNextGoalIdentityV1 | null;
  readonly diagnosticCode:
    | 'profile-empty'
    | 'profile-read-failed'
    | 'unsupported-profile-version'
    | null;
  readonly observedProfileSchemaVersion: number | null;
  readonly reducedMotion: boolean;
  readonly muted: boolean;
  readonly decorativeAssetState: 'ready' | 'missing';
}

export interface ArenaV2A6CollectionProgressSemanticV1 {
  readonly collectionText: '已收藏' | '未收藏';
  readonly collectionShapeToken: 'filled-archive-tab' | 'open-archive-tab';
  readonly collectionPatternToken: 'solid-single-bars' | 'dashed-single-bars';
  readonly collectionColorHex: '#45D483' | '#CFC6B3';
  readonly goalText: '当前唯一目标' | '非当前目标';
  readonly goalShapeToken: 'forward-notch-bracket' | 'plain-corner-bracket';
  readonly goalPatternToken: 'diagonal-focus-stripe' | 'quiet-dot-grid';
  readonly goalColorHex: '#FFB020' | '#CFC6B3';
  readonly colorIsNeverSoleSignal: true;
}

export interface ArenaV2A6CollectionProgressItemV1 {
  readonly kind: ArenaV2A6CollectionProgressItemKindV1;
  readonly definitionId: string;
  readonly ordinal: number;
  readonly displayName: string;
  readonly collected: boolean;
  readonly collectionResearch: Readonly<{
    readonly current: number;
    readonly target: number;
    readonly complete: boolean;
    readonly labelText: '主研究';
    readonly stage: ArenaV2WeaponCollectionResearchStageV1;
    readonly milestones: readonly Readonly<{
      readonly threshold: ArenaV2WeaponCollectionResearchMilestoneThresholdV1;
      readonly reached: boolean;
    }>[];
    readonly nextMilestone: Readonly<{
      readonly threshold: ArenaV2WeaponCollectionResearchMilestoneThresholdV1;
      readonly remainingMainResearch: number;
      readonly valueText: string;
      readonly accessibilityText: string;
    }> | null;
    readonly valueText: string;
    readonly accessibilityText: string;
    readonly fixedWidthNumeric: true;
    readonly numericSlotCharacterColumns: 7;
  }> | null;
  readonly routeResearch: ArenaV2MapRouteResearchMilestoneProjectionV1 | null;
  readonly mastery: Readonly<{
    readonly completed: number;
    readonly total: number;
    readonly complete: boolean;
    readonly valueText: string;
    readonly accessibilityText: string;
    readonly fixedWidthNumeric: true;
    readonly numericSlotCharacterColumns: 5;
  }>;
  readonly isCurrentUniqueGoal: boolean;
  readonly semantic: ArenaV2A6CollectionProgressSemanticV1;
  readonly action: Readonly<{
    readonly intentId: string;
    readonly screenId: 'weapon-index' | 'map-index';
    readonly targetDefinitionId: string;
    readonly labelText: string;
    readonly accessibilityText: string;
    readonly enabled: true;
    readonly minimumTouchTargetCssPixels: 48;
    readonly mutatesProfileOrRules: false;
  }>;
}

export interface ArenaV2A6CollectionProgressPageV1 {
  readonly screenId: 'weapon-index' | 'map-index';
  readonly state: ArenaV2A6CollectionProgressSourceStateV1;
  readonly directoryCount: 20 | 2;
  readonly itemCount: number;
  readonly stateMessage: string | null;
  readonly weaponJourney: ArenaV2A6WeaponCollectionJourneyReadV1 | null;
  readonly items: readonly ArenaV2A6CollectionProgressItemV1[];
  readonly addsPrimaryAction: false;
  readonly nestedCards: false;
}

export interface ArenaV2A6CollectionProgressLayoutContractV1 {
  readonly viewport: '390x844' | '1440x900';
  readonly safeAreaRequired: true;
  readonly contentPaddingCssPixels: 16 | 32;
  readonly weaponColumns: 2 | 4;
  readonly mapColumns: 1 | 2;
  readonly gapCssPixels: 10 | 14;
  readonly itemMinimumHeightCssPixels: 96 | 104;
  readonly itemActionMinimumCssPixels: 48;
  readonly nameMaximumLines: 2 | 1;
  readonly statusMaximumLines: 1;
  readonly progressMaximumLines: 1;
  readonly overflowPolicy: 'wrap-then-ellipsis-preserve-accessibility-text';
  readonly verticalScrollPermitted: true;
  readonly horizontalOverflowAllowed: false;
  readonly screenshotEvidence: 'not-run';
}

export interface ArenaV2A6CollectionProgressComponentSnapshotV1 {
  readonly schemaVersion: typeof ARENA_V2_A6_COLLECTION_PROGRESS_COMPONENT_SET_SCHEMA_VERSION_V1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly validationStatus: 'not-run';
  readonly epochId: string;
  readonly tick: number;
  readonly locale: string;
  readonly sourceState: ArenaV2A6CollectionProgressSourceStateV1;
  readonly profileIdentity: ArenaV2A6CollectionProgressProfileIdentityV1 | null;
  readonly contentIdentity: Readonly<{
    readonly ownerId: 'p5-content';
    readonly sourceContentHash: string;
    readonly contentHash: string;
  }>;
  readonly currentGoalItem: Readonly<{
    readonly kind: ArenaV2A6CollectionProgressItemKindV1;
    readonly definitionId: string;
    readonly sourceGoalId: string;
  }> | null;
  readonly weaponIndex: ArenaV2A6CollectionProgressPageV1;
  readonly mapIndex: ArenaV2A6CollectionProgressPageV1;
  readonly layouts: readonly [
    ArenaV2A6CollectionProgressLayoutContractV1,
    ArenaV2A6CollectionProgressLayoutContractV1,
  ];
  readonly accessibility: Readonly<{
    readonly reducedMotion: boolean;
    readonly motionPolicy: 'brief-border-opacity-only' | 'none-static-state-change';
    readonly muted: boolean;
    readonly visualDependsOnAudioPlayback: false;
    readonly silentEquivalentComplete: true;
    readonly longTextPreservedForAssistiveTechnology: true;
  }>;
  readonly fallback: Readonly<{
    readonly decorativeAssetMissing: boolean;
    readonly usesTextShapePatternFallback: boolean;
    readonly programmaticAssetClaimsApproval: false;
  }>;
}

type PlainData = Record<string, unknown>;

const INPUT_KEYS = new Set([
  'schemaVersion', 'epochId', 'tick', 'locale', 'sourceState', 'profileIdentity',
  'collectionContent', 'progressFacts', 'nextGoalIdentity', 'diagnosticCode',
  'observedProfileSchemaVersion', 'reducedMotion', 'muted', 'decorativeAssetState',
]);
const PROFILE_KEYS = new Set([
  'profileSchemaVersion', 'profileDefinitionId', 'profileDefinitionContentVersion',
  'profileId', 'profileRevision',
]);
const CONTENT_KEYS = new Set([
  'schemaVersion', 'status', 'hardGate', 'defaultSurfaceWired', 'ownerId',
  'weapons', 'maps', 'sourceContentHash', 'contentHash',
]);
const CONTENT_WEAPON_KEYS = new Set([
  'weaponDefinitionId', 'collectionOrder', 'displayName', 'learningFocus', 'coreVerb',
]);
const CONTENT_MAP_KEYS = new Set([
  'mapDefinitionId', 'displayName', 'participantRange', 'segments',
]);
const CONTENT_SEGMENT_KEYS = new Set([
  'segmentDefinitionId', 'ordinal', 'displayName', 'learningFocus', 'segmentKind',
  'survivalRole',
]);
const PROGRESS_KEYS = new Set(['schemaVersion', 'weapons', 'maps', 'weaponJourney']);
const WEAPON_PROGRESS_KEYS = new Set([
  'weaponDefinitionId', 'collected', 'collectionEvidenceCount',
  'collectionEvidenceTarget', 'completedContextCount', 'mastered',
]);
const MAP_PROGRESS_KEYS = new Set([
  'mapDefinitionId', 'collected', 'completedSegmentCount', 'totalSegmentCount',
  'routeResearch',
]);
const WEAPON_JOURNEY_KEYS = new Set([
  'currentMainResearch', 'targetMainResearch', 'remainingMainResearch',
  'collectedWeaponCount', 'weaponCount', 'averageMatchMinutesAssumption',
  'estimatedRemainingMinutes', 'estimateKind',
]);
const MAP_ROUTE_RESEARCH_KEYS = new Set([
  'schemaVersion', 'evidenceCount', 'evidenceTarget', 'completedSegmentCount',
  'segmentCount', 'evidencePerSegmentTarget', 'stage', 'milestones',
  'nextMilestonePercentage', 'nextMilestoneEvidenceThreshold', 'remainingEvidenceCount',
]);
const MAP_ROUTE_MILESTONE_KEYS = new Set(['percentage', 'evidenceThreshold', 'reached']);
const GOAL_KEYS = new Set([
  'schemaVersion', 'profileRevision', 'kind', 'goalId', 'weaponDefinitionId',
  'mapDefinitionId', 'segmentDefinitionId', 'modeDefinitionId',
  'challengeDefinitionId', 'context',
]);
const CONSTRUCTOR_KEYS = new Set(['epochId']);
const RESET_KEYS = new Set(['epochId']);
const SOURCE_STATES: ReadonlySet<unknown> = new Set(
  Object.values(ARENA_V2_A6_COLLECTION_PROGRESS_SOURCE_STATE_V1),
);

function cloneStrictData(
  value: unknown,
  name: string,
  seen: Set<object> = new Set(),
  depth = 0,
): unknown {
  if (depth > 24) throw new RangeError(`${name}嵌套深度超限。`);
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
      const expectedKeys = new Set([
        'length',
        ...Array.from({ length: value.length }, (_, index) => String(index)),
      ]);
      if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
        throw new TypeError(`${name}数组不能有空槽、Symbol或附加字段。`);
      }
      return Object.freeze(Array.from({ length: value.length }, (_, index) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (
          descriptor === undefined
          || !descriptor.enumerable
          || !Object.hasOwn(descriptor, 'value')
        ) throw new TypeError(`${name}[${index}]必须是可枚举数据字段。`);
        return cloneStrictData(descriptor.value, `${name}[${index}]`, seen, depth + 1);
      }));
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
  const result = value as PlainData;
  const actual = Object.keys(result);
  if (actual.length !== keys.size || actual.some((key) => !keys.has(key))) {
    throw new RangeError(`${name}字段必须exact-key闭合。`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(result, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
  return result;
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

function hash(value: unknown, name: string): string {
  const result = nonEmptyString(value, name, 8);
  if (!/^[0-9a-f]{8}$/u.test(result)) throw new RangeError(`${name}必须是8位小写内容hash。`);
  return result;
}

function parseProfileIdentity(value: unknown): ArenaV2A6CollectionProgressProfileIdentityV1 {
  const source = exactRecord(value, PROFILE_KEYS, 'A6.2 profileIdentity');
  if (
    source.profileSchemaVersion !== 1
    || source.profileDefinitionId !== 'arena-v2.learning-profile.candidate.v1'
    || source.profileDefinitionContentVersion !== 5
  ) throw new RangeError('A6.2 Profile Definition身份或版本漂移。');
  return Object.freeze({
    profileSchemaVersion: 1 as const,
    profileDefinitionId: 'arena-v2.learning-profile.candidate.v1' as const,
    profileDefinitionContentVersion: 5 as const,
    profileId: nonEmptyString(source.profileId, 'A6.2 profileId', 200),
    profileRevision: integer(source.profileRevision, 0, 1_000_000_000, 'A6.2 profileRevision'),
  });
}

function parseCollectionContent(value: unknown): ArenaV2InformationCollectionContentProjectionV1 {
  const source = exactRecord(value, CONTENT_KEYS, 'A6.2 collectionContent');
  if (
    source.schemaVersion !== 1
    || source.status !== 'production-unreachable'
    || source.hardGate !== false
    || source.defaultSurfaceWired !== false
    || source.ownerId !== 'p5-content'
  ) throw new RangeError('A6.2 collectionContent治理身份不闭合。');
  if (!Array.isArray(source.weapons) || source.weapons.length !== 20) {
    throw new RangeError('A6.2 collectionContent必须精确包含20把武器。');
  }
  const contentIdentities = new Set<string>();
  const uniqueContentIdentity = (identityValue: unknown, name: string): string => {
    const identity = nonEmptyString(identityValue, name, 200);
    if (contentIdentities.has(identity)) throw new RangeError(`A6.2内容目录身份${identity}重复。`);
    contentIdentities.add(identity);
    return identity;
  };
  const weapons = Object.freeze(source.weapons.map((value, index) => {
    const weapon = exactRecord(value, CONTENT_WEAPON_KEYS, `A6.2 content weapon[${index}]`);
    const weaponDefinitionId = uniqueContentIdentity(
      weapon.weaponDefinitionId,
      `A6.2 content weapon[${index}].weaponDefinitionId`,
    );
    if (weapon.collectionOrder !== index + 1) {
      throw new RangeError(`A6.2 content weapon[${index}]稳定顺序漂移。`);
    }
    return Object.freeze({
      weaponDefinitionId,
      collectionOrder: index + 1,
      displayName: nonEmptyString(weapon.displayName, `A6.2 weapon[${index}].displayName`),
      learningFocus: nonEmptyString(weapon.learningFocus, `A6.2 weapon[${index}].learningFocus`),
      coreVerb: nonEmptyString(weapon.coreVerb, `A6.2 weapon[${index}].coreVerb`, 120),
    });
  }));
  if (!Array.isArray(source.maps) || source.maps.length !== 2) {
    throw new RangeError('A6.2 collectionContent必须精确包含2张地图。');
  }
  const maps = Object.freeze(source.maps.map((value, mapIndex) => {
    const map = exactRecord(value, CONTENT_MAP_KEYS, `A6.2 content map[${mapIndex}]`);
    const mapDefinitionId = uniqueContentIdentity(
      map.mapDefinitionId,
      `A6.2 content map[${mapIndex}].mapDefinitionId`,
    );
    if (!Array.isArray(map.segments) || map.segments.length === 0 || map.segments.length > 20) {
      throw new RangeError(`A6.2 content map[${mapIndex}]必须含1..20个段落。`);
    }
    const segments = Object.freeze(map.segments.map((segmentValue, segmentIndex) => {
      const segment = exactRecord(
        segmentValue,
        CONTENT_SEGMENT_KEYS,
        `A6.2 content map[${mapIndex}].segments[${segmentIndex}]`,
      );
      const segmentDefinitionId = uniqueContentIdentity(
        segment.segmentDefinitionId,
        `A6.2 content map[${mapIndex}].segments[${segmentIndex}].segmentDefinitionId`,
      );
      if (segment.ordinal !== segmentIndex + 1) {
        throw new RangeError(`A6.2 content map[${mapIndex}]段落稳定顺序漂移。`);
      }
      return Object.freeze({
        segmentDefinitionId,
        ordinal: segmentIndex + 1,
        displayName: nonEmptyString(segment.displayName, 'A6.2 segment displayName'),
        learningFocus: nonEmptyString(segment.learningFocus, 'A6.2 segment learningFocus'),
        segmentKind: nonEmptyString(segment.segmentKind, 'A6.2 segment kind', 120),
        survivalRole: nonEmptyString(segment.survivalRole, 'A6.2 segment survivalRole', 120),
      });
    }));
    return Object.freeze({
      mapDefinitionId,
      displayName: nonEmptyString(map.displayName, `A6.2 map[${mapIndex}].displayName`),
      participantRange: nonEmptyString(map.participantRange, `A6.2 map[${mapIndex}].participantRange`, 80),
      segments,
    });
  }));
  if (maps.reduce((total, map) => total + map.segments.length, 0) !== 20) {
    throw new RangeError('A6.2 collectionContent地图段落总数必须精确为20。');
  }
  const sourceContentHash = hash(source.sourceContentHash, 'A6.2 sourceContentHash');
  const authority = Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    ownerId: 'p5-content' as const,
    weapons,
    maps,
    sourceContentHash,
  });
  const contentHash = hash(source.contentHash, 'A6.2 contentHash');
  const expectedHash = createDeterministicDataHash(
    authority,
    'Arena V2 Information Collection Content Projection V1',
  );
  if (contentHash !== expectedHash) throw new RangeError('A6.2 collectionContent内容hash漂移。');
  return Object.freeze({ ...authority, contentHash });
}

function parseProgressFacts(
  value: unknown,
  content: ArenaV2InformationCollectionContentProjectionV1,
): ArenaV2A6CollectionProgressFactsV1 {
  const source = exactRecord(value, PROGRESS_KEYS, 'A6.2 progressFacts');
  if (source.schemaVersion !== 1) throw new RangeError('A6.2 progressFacts只接受schema 1。');
  if (!Array.isArray(source.weapons) || source.weapons.length !== 20) {
    throw new RangeError('A6.2 progressFacts必须精确覆盖20把武器。');
  }
  const weapons = Object.freeze(source.weapons.map((value, index) => {
    const weapon = exactRecord(value, WEAPON_PROGRESS_KEYS, `A6.2 weapon progress[${index}]`);
    const expectedId = content.weapons[index]?.weaponDefinitionId;
    if (expectedId === undefined || weapon.weaponDefinitionId !== expectedId) {
      throw new RangeError(`A6.2 weapon progress[${index}]身份或稳定顺序漂移。`);
    }
    const collected = booleanValue(weapon.collected, `A6.2 weapon[${index}].collected`);
    const collectionEvidenceTarget = integer(
      weapon.collectionEvidenceTarget,
      1,
      1_000_000_000,
      `A6.2 weapon[${index}].collectionEvidenceTarget`,
    );
    const collectionEvidenceCount = integer(
      weapon.collectionEvidenceCount,
      0,
      collectionEvidenceTarget,
      `A6.2 weapon[${index}].collectionEvidenceCount`,
    );
    const completedContextCount = integer(
      weapon.completedContextCount,
      0,
      5,
      `A6.2 weapon[${index}].completedContextCount`,
    );
    const mastered = booleanValue(weapon.mastered, `A6.2 weapon[${index}].mastered`);
    if ((!collected && collectionEvidenceCount >= collectionEvidenceTarget)
      || mastered !== (completedContextCount === 5)) {
      throw new RangeError(`A6.2 weapon progress[${index}]收藏与五情境完整状态矛盾。`);
    }
    return Object.freeze({
      weaponDefinitionId: expectedId,
      collected,
      collectionEvidenceCount,
      collectionEvidenceTarget,
      completedContextCount,
      mastered,
    });
  }));
  if (!Array.isArray(source.maps) || source.maps.length !== 2) {
    throw new RangeError('A6.2 progressFacts必须精确覆盖2张地图。');
  }
  const maps = Object.freeze(source.maps.map((value, index) => {
    const map = exactRecord(value, MAP_PROGRESS_KEYS, `A6.2 map progress[${index}]`);
    const expected = content.maps[index];
    if (expected === undefined || map.mapDefinitionId !== expected.mapDefinitionId) {
      throw new RangeError(`A6.2 map progress[${index}]身份或稳定顺序漂移。`);
    }
    const totalSegmentCount = integer(
      map.totalSegmentCount,
      1,
      20,
      `A6.2 map progress[${index}].totalSegmentCount`,
    );
    if (totalSegmentCount !== expected.segments.length) {
      throw new RangeError(`A6.2 map progress[${index}]段落总数与目录漂移。`);
    }
    const completedSegmentCount = integer(
      map.completedSegmentCount,
      0,
      totalSegmentCount,
      `A6.2 map progress[${index}].completedSegmentCount`,
    );
    const collected = booleanValue(map.collected, `A6.2 map progress[${index}].collected`);
    const routeResearch = parseMapRouteResearch(
      map.routeResearch,
      totalSegmentCount,
      completedSegmentCount,
      `A6.2 map progress[${index}].routeResearch`,
    );
    return Object.freeze({
      mapDefinitionId: expected.mapDefinitionId,
      collected,
      completedSegmentCount,
      totalSegmentCount,
      routeResearch,
    });
  }));
  if (maps.reduce((total, map) => total + map.totalSegmentCount, 0) !== 20) {
    throw new RangeError('A6.2地图进度段落总数必须精确为20。');
  }
  const journeySource = exactRecord(
    source.weaponJourney,
    WEAPON_JOURNEY_KEYS,
    'A6.2 weapon journey',
  );
  const currentMainResearch = integer(
    journeySource.currentMainResearch,
    0,
    2_400,
    'A6.2 weapon journey.currentMainResearch',
  );
  const remainingMainResearch = integer(
    journeySource.remainingMainResearch,
    0,
    2_400,
    'A6.2 weapon journey.remainingMainResearch',
  );
  const collectedWeaponCount = integer(
    journeySource.collectedWeaponCount,
    0,
    20,
    'A6.2 weapon journey.collectedWeaponCount',
  );
  if (journeySource.targetMainResearch !== 2_400
    || journeySource.weaponCount !== 20
    || journeySource.averageMatchMinutesAssumption
      !== ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1
    || journeySource.estimateKind !== 'capacity-hypothesis-not-player-promise'
    || remainingMainResearch !== 2_400 - currentMainResearch
    || journeySource.estimatedRemainingMinutes !== remainingMainResearch
      * ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1
    || collectedWeaponCount !== weapons.filter(({ collected }) => collected).length
    || currentMainResearch !== weapons.reduce((total, weapon) => (
      total + weapon.collectionEvidenceCount
    ), 0)) {
    throw new RangeError('A6.2武器收藏旅程与20把武器主研究事实不闭合。');
  }
  const weaponJourney = Object.freeze({
    currentMainResearch,
    targetMainResearch: 2_400 as const,
    remainingMainResearch,
    collectedWeaponCount,
    weaponCount: 20 as const,
    averageMatchMinutesAssumption: ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1,
    estimatedRemainingMinutes: remainingMainResearch
      * ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1,
    estimateKind: 'capacity-hypothesis-not-player-promise' as const,
  });
  return Object.freeze({ schemaVersion: 1 as const, weapons, maps, weaponJourney });
}

function parseMapRouteResearch(
  value: unknown,
  expectedSegmentCount: number,
  expectedCompletedSegmentCount: number,
  name: string,
): ArenaV2MapRouteResearchMilestoneProjectionV1 {
  const source = exactRecord(value, MAP_ROUTE_RESEARCH_KEYS, name);
  if (source.schemaVersion !== 1 || source.segmentCount !== expectedSegmentCount
    || source.completedSegmentCount !== expectedCompletedSegmentCount) {
    throw new RangeError(`${name} schema、段落总数或完成数漂移。`);
  }
  const evidencePerSegmentTarget = integer(
    source.evidencePerSegmentTarget,
    1,
    1_000_000_000,
    `${name}.evidencePerSegmentTarget`,
  );
  const evidenceCount = integer(
    source.evidenceCount,
    0,
    1_000_000_000,
    `${name}.evidenceCount`,
  );
  const authority = projectArenaV2MapRouteResearchMilestoneV1({
    evidenceCount,
    completedSegmentCount: expectedCompletedSegmentCount,
    segmentCount: expectedSegmentCount,
    evidencePerSegmentTarget,
  });
  if (source.evidenceTarget !== authority.evidenceTarget
    || source.stage !== authority.stage
    || source.nextMilestonePercentage !== authority.nextMilestonePercentage
    || source.nextMilestoneEvidenceThreshold !== authority.nextMilestoneEvidenceThreshold
    || source.remainingEvidenceCount !== authority.remainingEvidenceCount
    || !Array.isArray(source.milestones)
    || source.milestones.length !== authority.milestones.length) {
    throw new RangeError(`${name}聚合、阶段或下一里程碑与P6投影漂移。`);
  }
  source.milestones.forEach((value, milestoneIndex) => {
    const milestone = exactRecord(
      value,
      MAP_ROUTE_MILESTONE_KEYS,
      `${name}.milestones[${milestoneIndex}]`,
    );
    const expected = authority.milestones[milestoneIndex]!;
    if (milestone.percentage !== expected.percentage
      || milestone.evidenceThreshold !== expected.evidenceThreshold
      || milestone.reached !== expected.reached) {
      throw new RangeError(`${name}.milestones[${milestoneIndex}]身份或事实漂移。`);
    }
  });
  return authority;
}

function segmentBelongsToMap(
  content: ArenaV2InformationCollectionContentProjectionV1,
  mapDefinitionId: string | null,
  segmentDefinitionId: string,
): boolean {
  const map = content.maps.find((entry) => (
    entry.mapDefinitionId === mapDefinitionId
  ));
  return map === undefined
    ? false
    : new Set(map.segments.map(({ segmentDefinitionId: id }) => id)).has(segmentDefinitionId);
}

function parseNextGoalIdentity(
  value: unknown,
  profileRevision: number,
  content: ArenaV2InformationCollectionContentProjectionV1,
): ArenaV2A6CollectionNextGoalIdentityV1 {
  const source = exactRecord(value, GOAL_KEYS, 'A6.2 nextGoalIdentity');
  if (source.schemaVersion !== 1 || !GOAL_KINDS.has(source.kind as ArenaV2A6NextGoalKindV1)) {
    throw new RangeError('A6.2 nextGoalIdentity schema或kind不受支持。');
  }
  const kind = source.kind as ArenaV2A6NextGoalKindV1;
  const result = Object.freeze({
    schemaVersion: 1 as const,
    profileRevision: integer(source.profileRevision, 0, 1_000_000_000, 'A6.2 goal profileRevision'),
    kind,
    goalId: nonEmptyString(source.goalId, 'A6.2 goalId', 512),
    weaponDefinitionId: nullableIdentifier(source.weaponDefinitionId, 'A6.2 goal weaponDefinitionId'),
    mapDefinitionId: nullableIdentifier(source.mapDefinitionId, 'A6.2 goal mapDefinitionId'),
    segmentDefinitionId: nullableIdentifier(source.segmentDefinitionId, 'A6.2 goal segmentDefinitionId'),
    modeDefinitionId: nullableIdentifier(source.modeDefinitionId, 'A6.2 goal modeDefinitionId'),
    challengeDefinitionId: nullableIdentifier(source.challengeDefinitionId, 'A6.2 goal challengeDefinitionId'),
    context: source.context === null
      ? null
      : CONTEXTS.has(source.context as string)
        ? source.context as ArenaV2A6CollectionNextGoalIdentityV1['context']
        : (() => { throw new RangeError('A6.2 goal context不受支持。'); })(),
  });
  if (result.profileRevision !== profileRevision) {
    throw new RangeError('A6.2 nextGoalIdentity与Profile revision漂移。');
  }
  const weaponDefinitionIds = new Set(content.weapons.map(({ weaponDefinitionId }) => (
    weaponDefinitionId
  )));
  const mapDefinitionIds = new Set(content.maps.map(({ mapDefinitionId }) => mapDefinitionId));
  if (result.weaponDefinitionId !== null && !weaponDefinitionIds.has(result.weaponDefinitionId)) {
    throw new RangeError('A6.2 goal weapon不属于已验证collectionContent。');
  }
  if (result.mapDefinitionId !== null && !mapDefinitionIds.has(result.mapDefinitionId)) {
    throw new RangeError('A6.2 goal map不属于已验证collectionContent。');
  }
  if (
    result.segmentDefinitionId !== null
    && !segmentBelongsToMap(content, result.mapDefinitionId, result.segmentDefinitionId)
  ) throw new RangeError('A6.2 goal segment不属于指定map。');
  const absent = (entry: string | null): boolean => entry === null;
  if (kind === 'collect-weapon') {
    if (
      absent(result.weaponDefinitionId)
      || !absent(result.mapDefinitionId)
      || !absent(result.segmentDefinitionId)
      || !absent(result.modeDefinitionId)
      || !absent(result.challengeDefinitionId)
      || result.context !== null
      || result.goalId !== `collect-weapon:${result.weaponDefinitionId}`
    ) throw new RangeError('A6.2 collect-weapon目标身份不闭合。');
  } else if (kind === 'weapon-context') {
    if (
      absent(result.weaponDefinitionId)
      || result.context === null
      || !absent(result.mapDefinitionId)
      || !absent(result.segmentDefinitionId)
      || !absent(result.modeDefinitionId)
      || !absent(result.challengeDefinitionId)
      || result.goalId !== `weapon-context:${result.weaponDefinitionId}:${result.context}`
    ) throw new RangeError('A6.2 weapon-context目标身份不闭合。');
  } else if (kind === 'collect-map') {
    if (
      absent(result.mapDefinitionId)
      || !absent(result.weaponDefinitionId)
      || !absent(result.segmentDefinitionId)
      || !absent(result.modeDefinitionId)
      || !absent(result.challengeDefinitionId)
      || result.context !== null
      || result.goalId !== `collect-map:${result.mapDefinitionId}`
    ) throw new RangeError('A6.2 collect-map目标身份不闭合。');
  } else if (kind === 'map-segment') {
    if (
      absent(result.mapDefinitionId)
      || absent(result.segmentDefinitionId)
      || !absent(result.weaponDefinitionId)
      || !absent(result.modeDefinitionId)
      || !absent(result.challengeDefinitionId)
      || result.context !== null
      || result.goalId !== `map-segment:${result.mapDefinitionId}:${result.segmentDefinitionId}`
    ) throw new RangeError('A6.2 map-segment目标身份不闭合。');
  } else if (kind === 'mode-mastery' || kind === 'record-improvement') {
    const modeMasteryGoalId = `mode-mastery:${result.modeDefinitionId}`;
    const firstCompletionGoalId = `mode-first-completion:${result.modeDefinitionId}`;
    const recordImprovementGoalId = `record-improvement:${result.modeDefinitionId}`;
    const goalIdMatches = kind === 'mode-mastery'
      ? result.goalId === modeMasteryGoalId || result.goalId === firstCompletionGoalId
      : result.goalId === recordImprovementGoalId;
    if (
      absent(result.modeDefinitionId)
      || !absent(result.weaponDefinitionId)
      || !absent(result.mapDefinitionId)
      || !absent(result.segmentDefinitionId)
      || !absent(result.challengeDefinitionId)
      || result.context !== null
      || !goalIdMatches
    ) throw new RangeError(`A6.2 ${kind}目标身份不闭合。`);
  } else if (kind === 'cross-challenge') {
    const targetDimensionCount = [
      result.weaponDefinitionId,
      result.mapDefinitionId,
      result.segmentDefinitionId,
      result.modeDefinitionId,
    ].filter((entry) => entry !== null).length;
    if (
      absent(result.challengeDefinitionId)
      || result.context !== null
      || targetDimensionCount < 2
      || result.goalId !== `cross-challenge:${result.challengeDefinitionId}`
    ) throw new RangeError('A6.2 cross-challenge目标身份不闭合。');
  } else if (
    (result.goalId !== ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1
      && result.goalId !== ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1)
    || !absent(result.weaponDefinitionId)
    || !absent(result.mapDefinitionId)
    || !absent(result.segmentDefinitionId)
    || !absent(result.modeDefinitionId)
    || !absent(result.challengeDefinitionId)
    || result.context !== null
  ) throw new RangeError('A6.2 catalog-complete目标身份不闭合。');
  return result;
}

function currentGoalItem(
  goal: ArenaV2A6CollectionNextGoalIdentityV1,
): ArenaV2A6CollectionProgressComponentSnapshotV1['currentGoalItem'] {
  if (goal.kind === 'collect-weapon' || goal.kind === 'weapon-context') {
    if (goal.weaponDefinitionId === null) throw new Error('A6.2武器目标缺少已验证身份。');
    return Object.freeze({
      kind: 'weapon' as const,
      definitionId: goal.weaponDefinitionId,
      sourceGoalId: goal.goalId,
    });
  }
  if (goal.kind === 'collect-map' || goal.kind === 'map-segment') {
    if (goal.mapDefinitionId === null) throw new Error('A6.2地图目标缺少已验证身份。');
    return Object.freeze({
      kind: 'map' as const,
      definitionId: goal.mapDefinitionId,
      sourceGoalId: goal.goalId,
    });
  }
  if (goal.kind === 'cross-challenge') {
    if (goal.modeDefinitionId !== null) return null;
    if (goal.weaponDefinitionId !== null) return Object.freeze({
      kind: 'weapon' as const,
      definitionId: goal.weaponDefinitionId,
      sourceGoalId: goal.goalId,
    });
    if (goal.mapDefinitionId !== null) return Object.freeze({
      kind: 'map' as const,
      definitionId: goal.mapDefinitionId,
      sourceGoalId: goal.goalId,
    });
  }
  return null;
}

function parseInput(value: unknown): ArenaV2A6CollectionProgressComponentInputV1 {
  const source = exactRecord(
    cloneStrictData(value, 'A6.2 collection progress input'),
    INPUT_KEYS,
    'A6.2 collection progress input',
  );
  if (source.schemaVersion !== 1 || !SOURCE_STATES.has(source.sourceState)) {
    throw new RangeError('A6.2输入schema或sourceState不受支持。');
  }
  const sourceState = source.sourceState as ArenaV2A6CollectionProgressSourceStateV1;
  const collectionContent = parseCollectionContent(source.collectionContent);
  const profileIdentity = source.profileIdentity === null
    ? null
    : parseProfileIdentity(source.profileIdentity);
  const progressFacts = source.progressFacts === null
    ? null
    : parseProgressFacts(source.progressFacts, collectionContent);
  const nextGoalIdentity = source.nextGoalIdentity === null
    ? null
    : profileIdentity === null
      ? (() => { throw new RangeError('A6.2 nextGoal不能脱离Profile身份存在。'); })()
      : parseNextGoalIdentity(
        source.nextGoalIdentity,
        profileIdentity.profileRevision,
        collectionContent,
      );
  const diagnosticCode = source.diagnosticCode;
  const observedProfileSchemaVersion = source.observedProfileSchemaVersion === null
    ? null
    : integer(
      source.observedProfileSchemaVersion,
      0,
      1_000_000_000,
      'A6.2 observedProfileSchemaVersion',
    );
  if (sourceState === 'ready') {
    if (
      profileIdentity === null
      || progressFacts === null
      || nextGoalIdentity === null
      || diagnosticCode !== null
      || observedProfileSchemaVersion !== 1
    ) throw new RangeError('A6.2 ready状态必须携带完整Profile/进度/目标且无诊断。');
  } else {
    if (profileIdentity !== null || progressFacts !== null || nextGoalIdentity !== null) {
      throw new RangeError('A6.2非ready状态不得携带可能过期的Profile进度或目标。');
    }
    const expectedDiagnostic = sourceState === 'empty'
      ? 'profile-empty'
      : sourceState === 'error'
        ? 'profile-read-failed'
        : sourceState === 'future-profile'
          ? 'unsupported-profile-version'
          : null;
    if (diagnosticCode !== expectedDiagnostic) throw new RangeError('A6.2非ready诊断码不闭合。');
    if (
      sourceState === 'future-profile'
        ? observedProfileSchemaVersion === null || observedProfileSchemaVersion <= 1
        : observedProfileSchemaVersion !== null
    ) throw new RangeError('A6.2未来Profile版本标记不闭合。');
  }
  if (source.decorativeAssetState !== 'ready' && source.decorativeAssetState !== 'missing') {
    throw new RangeError('A6.2 decorativeAssetState不受支持。');
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    epochId: nonEmptyString(source.epochId, 'A6.2 epochId', 200),
    tick: integer(source.tick, 0, Number.MAX_SAFE_INTEGER, 'A6.2 tick'),
    locale: nonEmptyString(source.locale, 'A6.2 locale', 35),
    sourceState,
    profileIdentity,
    collectionContent,
    progressFacts,
    nextGoalIdentity,
    diagnosticCode: diagnosticCode as ArenaV2A6CollectionProgressComponentInputV1['diagnosticCode'],
    observedProfileSchemaVersion,
    reducedMotion: booleanValue(source.reducedMotion, 'A6.2 reducedMotion'),
    muted: booleanValue(source.muted, 'A6.2 muted'),
    decorativeAssetState: source.decorativeAssetState,
  });
}

function semantic(
  collected: boolean,
  isCurrentUniqueGoal: boolean,
): ArenaV2A6CollectionProgressSemanticV1 {
  return Object.freeze({
    collectionText: collected ? '已收藏' as const : '未收藏' as const,
    collectionShapeToken: collected ? 'filled-archive-tab' as const : 'open-archive-tab' as const,
    collectionPatternToken: collected ? 'solid-single-bars' as const : 'dashed-single-bars' as const,
    collectionColorHex: collected ? '#45D483' as const : '#CFC6B3' as const,
    goalText: isCurrentUniqueGoal ? '当前唯一目标' as const : '非当前目标' as const,
    goalShapeToken: isCurrentUniqueGoal
      ? 'forward-notch-bracket' as const
      : 'plain-corner-bracket' as const,
    goalPatternToken: isCurrentUniqueGoal
      ? 'diagonal-focus-stripe' as const
      : 'quiet-dot-grid' as const,
    goalColorHex: isCurrentUniqueGoal ? '#FFB020' as const : '#CFC6B3' as const,
    colorIsNeverSoleSignal: true as const,
  });
}

function itemAction(
  kind: ArenaV2A6CollectionProgressItemKindV1,
  definitionId: string,
  displayName: string,
): ArenaV2A6CollectionProgressItemV1['action'] {
  return Object.freeze({
    intentId: `arena.v2.selection.${kind}.${encodeURIComponent(definitionId)}`,
    screenId: kind === 'weapon' ? 'weapon-index' as const : 'map-index' as const,
    targetDefinitionId: definitionId,
    labelText: displayName,
    accessibilityText: `查看${displayName}收藏进度。`,
    enabled: true as const,
    minimumTouchTargetCssPixels: 48 as const,
    mutatesProfileOrRules: false as const,
  });
}

function mastery(
  kind: ArenaV2A6CollectionProgressItemKindV1,
  completed: number,
  total: number,
): ArenaV2A6CollectionProgressItemV1['mastery'] {
  const noun = kind === 'weapon' ? '情境' : '路线段';
  return Object.freeze({
    completed,
    total,
    complete: completed === total,
    valueText: `${completed}/${total}`,
    accessibilityText: `已完成${completed}/${total}个${noun}。`,
    fixedWidthNumeric: true as const,
    numericSlotCharacterColumns: 5 as const,
  });
}

function collectionResearch(
  current: number,
  target: number,
  collected: boolean,
): NonNullable<ArenaV2A6CollectionProgressItemV1['collectionResearch']> {
  const projection = projectArenaV2WeaponCollectionResearchMilestoneV1({
    count: current,
    target,
    collected,
  });
  const next = projection.milestones.find(({ reached }) => !reached) ?? null;
  const nextMilestone = next === null ? null : Object.freeze({
    threshold: next.threshold,
    remainingMainResearch: next.threshold - current,
    valueText: `下一里程碑 ${next.threshold}/${target}，还需${next.threshold - current}次主研究`,
    accessibilityText: `下一主研究里程碑为${next.threshold}/${target}，还需要${
      next.threshold - current
    }次主研究。`,
  });
  return Object.freeze({
    current,
    target,
    complete: current >= target,
    labelText: '主研究' as const,
    stage: projection.stage,
    milestones: projection.milestones,
    nextMilestone,
    valueText: `${current}/${target}`,
    accessibilityText: `主研究进度${current}/${target}，当前阶段${projection.stage}。${
      nextMilestone?.accessibilityText ?? '四个主研究里程碑均已完成。'
    }`,
    fixedWidthNumeric: true as const,
    numericSlotCharacterColumns: 7 as const,
  });
}

function stateMessage(state: ArenaV2A6CollectionProgressSourceStateV1): string | null {
  if (state === 'ready') return null;
  if (state === 'loading') return '正在读取收藏进度';
  if (state === 'empty') return '尚无可展示的收藏档案';
  if (state === 'error') return '收藏进度读取失败，未显示假状态';
  return '档案来自未来版本，当前版本不会覆盖';
}

function weaponCollectionJourney(
  fact: ArenaV2A6WeaponCollectionJourneyFactV1,
): ArenaV2A6WeaponCollectionJourneyReadV1 {
  const remainingHours = fact.estimatedRemainingMinutes / 60;
  const remainingHoursText = Number.isInteger(remainingHours)
    ? String(remainingHours)
    : remainingHours.toFixed(1);
  const valueText = fact.remainingMainResearch === 0
    ? '武器收藏 ' + fact.collectedWeaponCount + '/' + fact.weaponCount + ' · 主研究全部完成'
    : '武器收藏 ' + fact.collectedWeaponCount + '/' + fact.weaponCount
      + ' · 主研究 ' + fact.currentMainResearch + '/' + fact.targetMainResearch
      + ' · 容量估算约剩' + remainingHoursText + '小时';
  return Object.freeze({
    ...fact,
    valueText,
    accessibilityText: fact.remainingMainResearch === 0
      ? '已收藏' + fact.collectedWeaponCount + '/' + fact.weaponCount + '把武器，全部'
        + fact.targetMainResearch + '次主研究已完成。'
      : '已收藏' + fact.collectedWeaponCount + '/' + fact.weaponCount + '把武器，主研究进度'
        + fact.currentMainResearch + '/' + fact.targetMainResearch + '，还需'
        + fact.remainingMainResearch + '次主研究。按每局平均'
        + fact.averageMatchMinutesAssumption + '分钟的容量假设，约剩'
        + remainingHoursText + '小时；这是设计估算，不是玩家时长承诺。',
    fixedWidthNumeric: true as const,
  });
}

function assertGoalProgressConsistency(
  goal: ArenaV2A6CollectionNextGoalIdentityV1,
  progress: ArenaV2A6CollectionProgressFactsV1,
): void {
  if (goal.kind === 'collect-weapon' || goal.kind === 'weapon-context') {
    const weapon = progress.weapons.find(({ weaponDefinitionId }) => (
      weaponDefinitionId === goal.weaponDefinitionId
    ));
    if (weapon === undefined) throw new RangeError('A6.2武器目标未命中Profile进度目录。');
    const mainResearchComplete = weapon.collectionEvidenceCount
      === weapon.collectionEvidenceTarget;
    if (goal.kind === 'collect-weapon'
      ? mainResearchComplete
      : !weapon.collected || weapon.mastered || !mainResearchComplete) {
      throw new RangeError(`A6.2 ${goal.kind}与武器收藏/熟练事实矛盾。`);
    }
  } else if (goal.kind === 'collect-map' || goal.kind === 'map-segment') {
    const map = progress.maps.find(({ mapDefinitionId }) => mapDefinitionId === goal.mapDefinitionId);
    if (map === undefined) throw new RangeError('A6.2地图目标未命中Profile进度目录。');
    const mapComplete = map.completedSegmentCount === map.totalSegmentCount;
    if (goal.kind === 'collect-map' ? map.collected : !map.collected || mapComplete) {
      throw new RangeError(`A6.2 ${goal.kind}与地图收藏/熟练事实矛盾。`);
    }
  } else if (goal.kind === 'catalog-complete'
    && goal.goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1) {
    const weaponComplete = progress.weapons.every((weapon) => (
      weapon.collected
      && weapon.collectionEvidenceCount === weapon.collectionEvidenceTarget
      && weapon.mastered
      && weapon.completedContextCount === 5
    ));
    const mapComplete = progress.maps.every((map) => (
      map.collected && map.completedSegmentCount === map.totalSegmentCount
    ));
    if (!weaponComplete || !mapComplete) {
      throw new RangeError('A6.2 catalog-complete与未完成的收藏目录矛盾。');
    }
  } else if (goal.kind === 'catalog-complete'
    && goal.goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1
    && progress.maps.some((map) => (
      !map.collected || map.completedSegmentCount !== map.totalSegmentCount
    ))) {
    throw new RangeError('A6.2 active-learning-complete与未完成的共用地图进度矛盾。');
  }
}

const LAYOUTS = Object.freeze([
  Object.freeze({
    viewport: '390x844' as const,
    safeAreaRequired: true as const,
    contentPaddingCssPixels: 16 as const,
    weaponColumns: 2 as const,
    mapColumns: 1 as const,
    gapCssPixels: 10 as const,
    itemMinimumHeightCssPixels: 96 as const,
    itemActionMinimumCssPixels: 48 as const,
    nameMaximumLines: 2 as const,
    statusMaximumLines: 1 as const,
    progressMaximumLines: 1 as const,
    overflowPolicy: 'wrap-then-ellipsis-preserve-accessibility-text' as const,
    verticalScrollPermitted: true as const,
    horizontalOverflowAllowed: false as const,
    screenshotEvidence: 'not-run' as const,
  }),
  Object.freeze({
    viewport: '1440x900' as const,
    safeAreaRequired: true as const,
    contentPaddingCssPixels: 32 as const,
    weaponColumns: 4 as const,
    mapColumns: 2 as const,
    gapCssPixels: 14 as const,
    itemMinimumHeightCssPixels: 104 as const,
    itemActionMinimumCssPixels: 48 as const,
    nameMaximumLines: 1 as const,
    statusMaximumLines: 1 as const,
    progressMaximumLines: 1 as const,
    overflowPolicy: 'wrap-then-ellipsis-preserve-accessibility-text' as const,
    verticalScrollPermitted: true as const,
    horizontalOverflowAllowed: false as const,
    screenshotEvidence: 'not-run' as const,
  }),
] as const satisfies readonly [
  ArenaV2A6CollectionProgressLayoutContractV1,
  ArenaV2A6CollectionProgressLayoutContractV1,
]);

function projectSnapshot(
  input: ArenaV2A6CollectionProgressComponentInputV1,
): ArenaV2A6CollectionProgressComponentSnapshotV1 {
  if (input.nextGoalIdentity !== null && input.progressFacts !== null) {
    assertGoalProgressConsistency(input.nextGoalIdentity, input.progressFacts);
  }
  const goal = input.nextGoalIdentity === null ? null : currentGoalItem(input.nextGoalIdentity);
  const ready = input.sourceState === 'ready';
  const weaponJourney = !ready || input.progressFacts === null
    ? null
    : weaponCollectionJourney(input.progressFacts.weaponJourney);
  const weaponItems = !ready || input.progressFacts === null
    ? Object.freeze([])
    : Object.freeze(input.collectionContent.weapons.map((content, index) => {
      const progress = input.progressFacts!.weapons[index];
      if (progress === undefined || progress.weaponDefinitionId !== content.weaponDefinitionId) {
        throw new RangeError('A6.2武器内容与Profile进度身份未闭合。');
      }
      const isCurrentUniqueGoal = goal?.kind === 'weapon'
        && goal.definitionId === content.weaponDefinitionId;
      return Object.freeze({
        kind: 'weapon' as const,
        definitionId: content.weaponDefinitionId,
        ordinal: content.collectionOrder,
        displayName: content.displayName,
        collected: progress.collected,
        collectionResearch: collectionResearch(
          progress.collectionEvidenceCount,
          progress.collectionEvidenceTarget,
          progress.collected,
        ),
        routeResearch: null,
        mastery: mastery('weapon', progress.completedContextCount, 5),
        isCurrentUniqueGoal,
        semantic: semantic(progress.collected, isCurrentUniqueGoal),
        action: itemAction('weapon', content.weaponDefinitionId, content.displayName),
      });
    }));
  const mapItems = !ready || input.progressFacts === null
    ? Object.freeze([])
    : Object.freeze(input.collectionContent.maps.map((content, index) => {
      const progress = input.progressFacts!.maps[index];
      if (progress === undefined || progress.mapDefinitionId !== content.mapDefinitionId) {
        throw new RangeError('A6.2地图内容与Profile进度身份未闭合。');
      }
      const isCurrentUniqueGoal = goal?.kind === 'map'
        && goal.definitionId === content.mapDefinitionId;
      return Object.freeze({
        kind: 'map' as const,
        definitionId: content.mapDefinitionId,
        ordinal: index + 1,
        displayName: content.displayName,
        collected: progress.collected,
        collectionResearch: null,
        routeResearch: progress.routeResearch,
        mastery: mastery('map', progress.completedSegmentCount, progress.totalSegmentCount),
        isCurrentUniqueGoal,
        semantic: semantic(progress.collected, isCurrentUniqueGoal),
        action: itemAction('map', content.mapDefinitionId, content.displayName),
      });
    }));
  const goalMatches = [...weaponItems, ...mapItems].filter(({ isCurrentUniqueGoal }) => (
    isCurrentUniqueGoal
  ));
  if (goalMatches.length > 1 || (input.nextGoalIdentity?.kind === 'catalog-complete' && goalMatches.length > 0)) {
    throw new RangeError('A6.2唯一nextGoal标记数量不闭合。');
  }
  if (goal !== null && goalMatches.length !== 1) {
    throw new RangeError('A6.2唯一nextGoal没有命中固定收藏目录。');
  }
  const message = stateMessage(input.sourceState);
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    validationStatus: 'not-run' as const,
    epochId: input.epochId,
    tick: input.tick,
    locale: input.locale,
    sourceState: input.sourceState,
    profileIdentity: input.profileIdentity,
    contentIdentity: Object.freeze({
      ownerId: 'p5-content' as const,
      sourceContentHash: input.collectionContent.sourceContentHash,
      contentHash: input.collectionContent.contentHash,
    }),
    currentGoalItem: goal,
    weaponIndex: Object.freeze({
      screenId: 'weapon-index' as const,
      state: input.sourceState,
      directoryCount: 20 as const,
      itemCount: weaponItems.length,
      stateMessage: message,
      weaponJourney,
      items: weaponItems,
      addsPrimaryAction: false as const,
      nestedCards: false as const,
    }),
    mapIndex: Object.freeze({
      screenId: 'map-index' as const,
      state: input.sourceState,
      directoryCount: 2 as const,
      itemCount: mapItems.length,
      stateMessage: message,
      weaponJourney: null,
      items: mapItems,
      addsPrimaryAction: false as const,
      nestedCards: false as const,
    }),
    layouts: LAYOUTS,
    accessibility: Object.freeze({
      reducedMotion: input.reducedMotion,
      motionPolicy: input.reducedMotion
        ? 'none-static-state-change' as const
        : 'brief-border-opacity-only' as const,
      muted: input.muted,
      visualDependsOnAudioPlayback: false as const,
      silentEquivalentComplete: true as const,
      longTextPreservedForAssistiveTechnology: true as const,
    }),
    fallback: Object.freeze({
      decorativeAssetMissing: input.decorativeAssetState === 'missing',
      usesTextShapePatternFallback: input.decorativeAssetState === 'missing',
      programmaticAssetClaimsApproval: false as const,
    }),
  });
}

function profileCanonical(input: ArenaV2A6CollectionProgressComponentInputV1): string | null {
  return input.profileIdentity === null
    ? null
    : JSON.stringify({
      profileIdentity: input.profileIdentity,
      progressFacts: input.progressFacts,
      nextGoalIdentity: input.nextGoalIdentity,
    });
}

function contentIdentity(input: ArenaV2A6CollectionProgressComponentInputV1): string {
  return `${input.collectionContent.sourceContentHash}|${input.collectionContent.contentHash}`;
}

export class ArenaV2CollectionProgressComponentSetCandidateV1 {
  #epochId: string;
  #state: ArenaV2A6CollectionProgressLifecycleStateV1 =
    ARENA_V2_A6_COLLECTION_PROGRESS_LIFECYCLE_STATE_V1.ACTIVE;
  #lastTick = -1;
  #lastInputCanonical: string | null = null;
  #contentIdentity: string | null = null;
  #profileIdentity: string | null = null;
  #profileRevision = -1;
  #profileCanonical: string | null = null;
  #snapshot: ArenaV2A6CollectionProgressComponentSnapshotV1 | null = null;
  #snapshotCanonical: string | null = null;
  #busy = false;

  constructor(value: unknown) {
    const source = exactRecord(
      cloneStrictData(value, 'A6.2 constructor'),
      CONSTRUCTOR_KEYS,
      'A6.2 constructor',
    );
    this.#epochId = nonEmptyString(source.epochId, 'A6.2 constructor.epochId', 200);
  }

  get state(): ArenaV2A6CollectionProgressLifecycleStateV1 { return this.#state; }

  #assertActive(operation: string): void {
    if (this.#state !== ARENA_V2_A6_COLLECTION_PROGRESS_LIFECYCLE_STATE_V1.ACTIVE) {
      throw new Error(`${operation}拒绝状态${this.#state}。`);
    }
    if (this.#busy) throw new Error(`${operation}拒绝重入。`);
  }

  #assertSnapshotIntegrity(): void {
    if (
      this.#snapshot !== null
      && JSON.stringify(this.#snapshot) !== this.#snapshotCanonical
    ) throw new Error('A6.2已存快照完整性漂移，组件失败关闭。');
  }

  consume(value: unknown): ArenaV2A6CollectionProgressComponentSnapshotV1 {
    this.#assertActive('A6.2 consume');
    this.#assertSnapshotIntegrity();
    this.#busy = true;
    try {
      const input = parseInput(value);
      if (input.epochId !== this.#epochId) throw new RangeError('A6.2输入epochId漂移。');
      const canonical = JSON.stringify(input);
      if (input.tick < this.#lastTick) throw new RangeError('A6.2输入tick回退。');
      if (input.tick === this.#lastTick) {
        if (canonical !== this.#lastInputCanonical) throw new RangeError('A6.2同tick输入携带冲突事实。');
        if (this.#snapshot === null) throw new Error('A6.2同tick幂等状态缺少已提交快照。');
        return this.#snapshot;
      }
      const nextContentIdentity = contentIdentity(input);
      if (this.#contentIdentity !== null && nextContentIdentity !== this.#contentIdentity) {
        throw new RangeError('A6.2同epoch内容目录identity/hash漂移。');
      }
      const nextProfileIdentity = input.profileIdentity === null ? null : [
        input.profileIdentity.profileDefinitionId,
        input.profileIdentity.profileDefinitionContentVersion,
        input.profileIdentity.profileId,
      ].join('|');
      if (
        this.#profileIdentity !== null
        && nextProfileIdentity !== null
        && nextProfileIdentity !== this.#profileIdentity
      ) throw new RangeError('A6.2同epoch Profile身份漂移。');
      if (
        input.profileIdentity !== null
        && input.profileIdentity.profileRevision < this.#profileRevision
      ) throw new RangeError('A6.2 Profile revision回退。');
      const nextProfileCanonical = profileCanonical(input);
      if (
        input.profileIdentity !== null
        && input.profileIdentity.profileRevision === this.#profileRevision
        && nextProfileCanonical !== this.#profileCanonical
      ) throw new RangeError('A6.2相同Profile revision携带冲突收藏事实或目标。');
      const snapshot = projectSnapshot(input);
      const snapshotCanonical = JSON.stringify(snapshot);
      this.#lastTick = input.tick;
      this.#lastInputCanonical = canonical;
      this.#contentIdentity = nextContentIdentity;
      if (input.profileIdentity !== null) {
        this.#profileIdentity = nextProfileIdentity;
        this.#profileRevision = input.profileIdentity.profileRevision;
        this.#profileCanonical = nextProfileCanonical;
      }
      this.#snapshot = snapshot;
      this.#snapshotCanonical = snapshotCanonical;
      return snapshot;
    } finally {
      this.#busy = false;
    }
  }

  getSnapshot(): ArenaV2A6CollectionProgressComponentSnapshotV1 | null {
    this.#assertActive('A6.2 getSnapshot');
    this.#assertSnapshotIntegrity();
    return this.#snapshot;
  }

  resetPresentationEpoch(value: unknown): void {
    this.#assertActive('A6.2 resetPresentationEpoch');
    this.#assertSnapshotIntegrity();
    const source = exactRecord(
      cloneStrictData(value, 'A6.2 epoch reset'),
      RESET_KEYS,
      'A6.2 epoch reset',
    );
    const epochId = nonEmptyString(source.epochId, 'A6.2 epoch reset.epochId', 200);
    if (epochId === this.#epochId) throw new RangeError('A6.2 epoch reset必须使用新epochId。');
    this.#epochId = epochId;
    this.#lastTick = -1;
    this.#lastInputCanonical = null;
    this.#contentIdentity = null;
    this.#profileIdentity = null;
    this.#profileRevision = -1;
    this.#profileCanonical = null;
    this.#snapshot = null;
    this.#snapshotCanonical = null;
  }

  destroy(): void {
    if (this.#state === ARENA_V2_A6_COLLECTION_PROGRESS_LIFECYCLE_STATE_V1.DESTROYED) return;
    if (this.#busy) throw new Error('A6.2 consume期间不能destroy。');
    this.#lastTick = -1;
    this.#lastInputCanonical = null;
    this.#contentIdentity = null;
    this.#profileIdentity = null;
    this.#profileRevision = -1;
    this.#profileCanonical = null;
    this.#snapshot = null;
    this.#snapshotCanonical = null;
    this.#state = ARENA_V2_A6_COLLECTION_PROGRESS_LIFECYCLE_STATE_V1.DESTROYED;
  }
}

export const ARENA_V2_A6_COLLECTION_PROGRESS_REFERENCE_LEDGER_V1 = Object.freeze([
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
  Object.freeze({ read: true as const, path: 'packages/arena-product-presentation/src/arena-v2-information-selection-render-plan-candidate-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-presentation/src/arena-v2-information-content-read-projection-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-progression/src/arena-v2-learning-information-projection-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-progression/src/arena-v2-weapon-collection-research-milestone-projection-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-progression/src/arena-v2-next-learning-goal-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-content/src/arena-v2-information-content-read-catalog-candidate-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-content/src/arena-v2-learning-profile-definition-candidate-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-presentation-three/src/arena-v2-collection-next-goal-first-screen-candidate-v1.ts' }),
] as const);

export const ARENA_V2_A6_COLLECTION_PROGRESS_COMPONENT_SET_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  validationStatus: 'not-run' as const,
  rendererNeutral: true as const,
  pageCountAdded: 0 as const,
  primaryActionCountAdded: 0 as const,
  weaponCount: 20 as const,
  mapCount: 2 as const,
  mapSegmentCount: 20 as const,
  itemActionSemantics: 'arena.v2.selection.{weapon|map}.{encoded-definition-id}' as const,
  ownsProfileWrites: false as const,
  ownsRewardResolution: false as const,
  ownsNextGoalSelection: false as const,
  usesCurrencyStoreRedDotsOrTaskList: false as const,
  nestedCards: false as const,
  assetBytesAdded: 0 as const,
  screenshotEvidence: 'not-run' as const,
  deviceEvidence: 'not-run' as const,
  humanEvidence: 'not-run' as const,
  referenceLedger: ARENA_V2_A6_COLLECTION_PROGRESS_REFERENCE_LEDGER_V1,
});
