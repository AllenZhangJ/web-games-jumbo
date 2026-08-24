import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_INFORMATION_UI_INTENT_V1,
  type ArenaV2InformationFieldValueV1,
  type ArenaV2InformationUiIntentV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  projectArenaV2MapRouteResearchMilestoneV1,
  type ArenaV2MapRouteResearchMilestoneProjectionV1,
} from '@number-strategy-jump/arena-product-progression';
import {
  ArenaV2CollectionProgressComponentSetCandidateV1,
  type ArenaV2A6CollectionNextGoalIdentityV1,
  type ArenaV2A6CollectionProgressComponentInputV1,
  type ArenaV2A6CollectionProgressComponentSnapshotV1,
  type ArenaV2A6CollectionProgressItemV1,
  type ArenaV2A6CollectionProgressSourceStateV1,
} from './arena-v2-collection-progress-component-set-candidate-v1.js';

export const ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_SCHEMA_VERSION_V1 = 1 as const;

export const ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_LIFECYCLE_V1 = Object.freeze({
  ACTIVE: 'active',
  DESTROYED: 'destroyed',
} as const);

export type ArenaV2A6CollectionMasteryDetailKindV1 = 'weapon' | 'map';
export type ArenaV2A6CollectionMasteryDetailScreenIdV1 = 'weapon-detail' | 'map-detail';
export type ArenaV2A6CollectionMasteryDetailLifecycleV1 =
  typeof ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_LIFECYCLE_V1[
    keyof typeof ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_LIFECYCLE_V1
  ];
export type ArenaV2A6WeaponLearningContextV1 = Exclude<
  ArenaV2A6CollectionNextGoalIdentityV1['context'],
  null
>;
export type ArenaV2A6MasteryRowStateV1 = 'not-started' | 'in-progress' | 'complete';

export interface ArenaV2A6DetailSelectionV1 {
  readonly kind: ArenaV2A6CollectionMasteryDetailKindV1;
  readonly screenId: ArenaV2A6CollectionMasteryDetailScreenIdV1;
  readonly targetDefinitionId: string;
}

export interface ArenaV2A6P5DetailContentEnvelopeV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly ownerId: 'p5-content';
  readonly screenId: ArenaV2A6CollectionMasteryDetailScreenIdV1;
  readonly targetDefinitionId: string;
  readonly sourceContentHash: string;
  readonly fieldValues: readonly ArenaV2InformationFieldValueV1[];
  readonly contentHash: string;
}

export interface ArenaV2A6ExistingDetailSelectionActionV1 {
  readonly intentId: ArenaV2InformationUiIntentV1;
  readonly labelMessageId: string;
  readonly labelText: string;
  readonly accessibilityText: string;
  readonly targetDefinitionId: string;
  readonly enabled: boolean;
  readonly disabledReason: string | null;
}

export interface ArenaV2A6WeaponContextProgressFactV1 {
  readonly context: ArenaV2A6WeaponLearningContextV1;
  readonly evidenceCount: number;
  readonly completedAtRevision: number | null;
}

export interface ArenaV2A6WeaponDetailProgressFactsV1 {
  readonly schemaVersion: 1;
  readonly ownerId: 'p6-profile';
  readonly kind: 'weapon';
  readonly profileRevision: number;
  readonly weaponDefinitionId: string;
  readonly collected: boolean;
  readonly useCount: number;
  readonly collectionEvidenceTarget: number;
  readonly contexts: readonly ArenaV2A6WeaponContextProgressFactV1[];
}

export interface ArenaV2A6MapSegmentProgressFactV1 {
  readonly segmentDefinitionId: string;
  readonly completionEvidenceCount: number;
  readonly completedAtRevision: number | null;
}

export interface ArenaV2A6MapDetailProgressFactsV1 {
  readonly schemaVersion: 1;
  readonly ownerId: 'p6-profile';
  readonly kind: 'map';
  readonly profileRevision: number;
  readonly mapDefinitionId: string;
  readonly routeResearch: ArenaV2MapRouteResearchMilestoneProjectionV1;
  readonly segments: readonly ArenaV2A6MapSegmentProgressFactV1[];
}

export type ArenaV2A6DetailProgressFactsV1 =
  | ArenaV2A6WeaponDetailProgressFactsV1
  | ArenaV2A6MapDetailProgressFactsV1;

export interface ArenaV2A6CollectionMasteryDetailInputV1 {
  readonly schemaVersion: typeof ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_SCHEMA_VERSION_V1;
  readonly collectionProgressInput: ArenaV2A6CollectionProgressComponentInputV1;
  readonly selection: ArenaV2A6DetailSelectionV1;
  readonly p5DetailContent: ArenaV2A6P5DetailContentEnvelopeV1;
  readonly detailProgressFacts: ArenaV2A6DetailProgressFactsV1 | null;
  readonly existingSelectionAction: ArenaV2A6ExistingDetailSelectionActionV1;
}

export interface ArenaV2A6MasteryRowSemanticV1 {
  readonly stateText: '未开始' | '积累中' | '已完成';
  readonly stateShapeToken: 'open-ring' | 'half-ring' | 'filled-ring';
  readonly statePatternToken: 'quiet-dot-grid' | 'diagonal-progress-stripe' | 'solid-single-bars';
  readonly stateColorHex: '#CFC6B3' | '#56B8FF' | '#45D483';
  readonly goalText: '当前唯一目标' | '非当前目标';
  readonly goalShapeToken: 'forward-notch-bracket' | 'plain-corner-bracket';
  readonly goalPatternToken: 'diagonal-focus-stripe' | 'quiet-dot-grid';
  readonly goalColorHex: '#FFB020' | '#CFC6B3';
  readonly colorIsNeverSoleSignal: true;
}

export interface ArenaV2A6MasteryDetailRowV1 {
  readonly rowKind: 'weapon-context' | 'map-segment';
  readonly identity: string;
  readonly ordinal: number;
  readonly labelText: string;
  readonly accessibilityText: string;
  readonly evidenceCount: number;
  readonly completedAtRevision: number | null;
  readonly state: ArenaV2A6MasteryRowStateV1;
  readonly isCurrentUniqueGoal: boolean;
  readonly semantic: ArenaV2A6MasteryRowSemanticV1;
}

export interface ArenaV2A6MasteryDetailLayoutContractV1 {
  readonly viewport: '390x844' | '1440x900';
  readonly safeAreaRequired: true;
  readonly contentPaddingCssPixels: 16 | 32;
  readonly summaryMinimumHeightCssPixels: 88 | 96;
  readonly rowMinimumHeightCssPixels: 56 | 60;
  readonly rowColumns: 1 | 2;
  readonly actionMinimumTouchTargetCssPixels: 48;
  readonly labelMaximumLines: 2 | 1;
  readonly numericSlotCharacterColumns: 5;
  readonly overflowPolicy: 'wrap-then-ellipsis-preserve-accessibility-text';
  readonly verticalScrollPermitted: true;
  readonly horizontalOverflowAllowed: false;
  readonly screenshotEvidence: 'not-run';
}

export interface ArenaV2A6CollectionMasteryDetailSnapshotV1 {
  readonly schemaVersion: typeof ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_SCHEMA_VERSION_V1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly validationStatus: 'not-run';
  readonly epochId: string;
  readonly tick: number;
  readonly locale: string;
  readonly sourceState: ArenaV2A6CollectionProgressSourceStateV1;
  readonly screenId: ArenaV2A6CollectionMasteryDetailScreenIdV1;
  readonly kind: ArenaV2A6CollectionMasteryDetailKindV1;
  readonly targetDefinitionId: string;
  readonly stateMessage: string | null;
  readonly profileIdentity: ArenaV2A6CollectionProgressComponentSnapshotV1['profileIdentity'];
  readonly contentIdentity: Readonly<{
    readonly collectionSourceContentHash: string;
    readonly collectionContentHash: string;
    readonly p5DetailContentHash: string;
  }>;
  readonly p5DetailFields: readonly ArenaV2InformationFieldValueV1[];
  readonly summary: Readonly<{
    readonly displayName: string;
    readonly collected: boolean;
    readonly completed: number;
    readonly total: number;
    readonly valueText: string;
    readonly accessibilityText: string;
    readonly collectionEvidenceCurrent: number | null;
    readonly collectionEvidenceTarget: number | null;
    readonly mainResearchStage:
      | NonNullable<ArenaV2A6CollectionProgressItemV1['collectionResearch']>['stage']
      | null;
    readonly nextMainResearchMilestoneText: string | null;
    readonly nextMainResearchMilestoneAccessibilityText: string | null;
    readonly routeResearch: ArenaV2MapRouteResearchMilestoneProjectionV1 | null;
    readonly nextMapRouteResearchMilestoneText: string | null;
    readonly nextMapRouteResearchMilestoneAccessibilityText: string | null;
    readonly fixedWidthNumeric: true;
    readonly numericSlotCharacterColumns: 5;
    readonly isCurrentUniqueGoal: boolean;
  }> | null;
  readonly rows: readonly ArenaV2A6MasteryDetailRowV1[];
  readonly currentGoalMarker: Readonly<{
    readonly scope: 'detail' | 'weapon-context' | 'map-segment';
    readonly identity: string;
    readonly sourceGoalId: string;
  }> | null;
  readonly selectionAction: Readonly<{
    readonly intentId: ArenaV2InformationUiIntentV1;
    readonly labelMessageId: string;
    readonly labelText: string;
    readonly accessibilityText: string;
    readonly targetDefinitionId: string;
    readonly sourceEnabled: boolean;
    readonly enabled: boolean;
    readonly disabledReason: string | null;
    readonly minimumTouchTargetCssPixels: 48;
    readonly mutatesProfileOrRules: false;
  }>;
  readonly layouts: readonly [
    ArenaV2A6MasteryDetailLayoutContractV1,
    ArenaV2A6MasteryDetailLayoutContractV1,
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
  'schemaVersion', 'collectionProgressInput', 'selection', 'p5DetailContent',
  'detailProgressFacts', 'existingSelectionAction',
]);
const A6_2_INPUT_KEYS = new Set([
  'schemaVersion', 'epochId', 'tick', 'locale', 'sourceState', 'profileIdentity',
  'collectionContent', 'progressFacts', 'nextGoalIdentity', 'diagnosticCode',
  'observedProfileSchemaVersion', 'reducedMotion', 'muted', 'decorativeAssetState',
]);
const SELECTION_KEYS = new Set(['kind', 'screenId', 'targetDefinitionId']);
const P5_DETAIL_KEYS = new Set([
  'schemaVersion', 'status', 'hardGate', 'defaultSurfaceWired', 'ownerId',
  'screenId', 'targetDefinitionId', 'sourceContentHash', 'fieldValues', 'contentHash',
]);
const FIELD_KEYS = new Set([
  'fieldId', 'labelMessageId', 'valueText', 'accessibilityText', 'fixedWidthNumeric',
]);
const ACTION_KEYS = new Set([
  'intentId', 'labelMessageId', 'labelText', 'accessibilityText',
  'targetDefinitionId', 'enabled', 'disabledReason',
]);
const WEAPON_DETAIL_KEYS = new Set([
  'schemaVersion', 'ownerId', 'kind', 'profileRevision', 'weaponDefinitionId',
  'collected', 'useCount', 'collectionEvidenceTarget', 'contexts',
]);
const WEAPON_CONTEXT_KEYS = new Set([
  'context', 'evidenceCount', 'completedAtRevision',
]);
const MAP_DETAIL_KEYS = new Set([
  'schemaVersion', 'ownerId', 'kind', 'profileRevision', 'mapDefinitionId',
  'routeResearch', 'segments',
]);
const MAP_SEGMENT_KEYS = new Set([
  'segmentDefinitionId', 'completionEvidenceCount', 'completedAtRevision',
]);
const MAP_ROUTE_RESEARCH_KEYS = new Set([
  'schemaVersion', 'evidenceCount', 'evidenceTarget', 'completedSegmentCount',
  'segmentCount', 'evidencePerSegmentTarget', 'stage', 'milestones',
  'nextMilestonePercentage', 'nextMilestoneEvidenceThreshold', 'remainingEvidenceCount',
]);
const MAP_ROUTE_MILESTONE_KEYS = new Set(['percentage', 'evidenceThreshold', 'reached']);
const CONSTRUCTOR_KEYS = new Set(['epochId']);
const RESET_KEYS = new Set(['epochId']);

const WEAPON_CONTEXT_ORDER = Object.freeze([
  'ground', 'aerial', 'edge', 'duel-counterplay', 'survival',
] as const satisfies readonly ArenaV2A6WeaponLearningContextV1[]);
const WEAPON_CONTEXT_LABELS: Readonly<Record<ArenaV2A6WeaponLearningContextV1, string>> =
  Object.freeze({
    ground: '地面出手',
    aerial: '空中出手',
    edge: '边缘博弈',
    'duel-counterplay': '对局反制',
    survival: '生存应用',
  });

const EXPECTED_P5_FIELDS = Object.freeze({
  weapon: Object.freeze([
    'range-coverage', 'timing-risk', 'ground-aerial', 'counter-inputs', 'map-consequences',
  ]),
  map: Object.freeze([
    'route-goal', 'hazard-summary', 'full-route', 'weapon-consequences',
  ]),
} as const);

function cloneStrictData(
  value: unknown,
  name: string,
  seen: Set<object> = new Set(),
  depth = 0,
): unknown {
  if (depth > 28) throw new RangeError(`${name}嵌套深度超限。`);
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
  const actualKeys = Object.keys(result);
  if (actualKeys.length !== keys.size || actualKeys.some((key) => !keys.has(key))) {
    throw new RangeError(`${name}字段必须exact-key闭合。`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(result, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
  return result;
}

function nonEmptyString(value: unknown, name: string, maximum = 1024): string {
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

function contentHash(value: unknown, name: string): string {
  const result = nonEmptyString(value, name, 8);
  if (!/^[0-9a-f]{8}$/u.test(result)) throw new RangeError(`${name}必须是8位小写hash。`);
  return result;
}

function completedRevision(value: unknown, profileRevision: number, name: string): number | null {
  if (value === null) return null;
  return integer(value, 1, profileRevision, name);
}

function parseSelection(value: unknown): ArenaV2A6DetailSelectionV1 {
  const source = exactRecord(value, SELECTION_KEYS, 'A6.3 selection');
  if (source.kind !== 'weapon' && source.kind !== 'map') {
    throw new RangeError('A6.3 selection.kind不受支持。');
  }
  const kind = source.kind;
  const screenId = kind === 'weapon' ? 'weapon-detail' as const : 'map-detail' as const;
  if (source.screenId !== screenId) {
    throw new RangeError('A6.3 selection的kind与既有详情screen不闭合。');
  }
  return Object.freeze({
    kind,
    screenId,
    targetDefinitionId: nonEmptyString(source.targetDefinitionId, 'A6.3 targetDefinitionId', 200),
  });
}

function parseP5DetailContent(
  value: unknown,
  selection: ArenaV2A6DetailSelectionV1,
  sourceContentHash: string,
): ArenaV2A6P5DetailContentEnvelopeV1 {
  const source = exactRecord(value, P5_DETAIL_KEYS, 'A6.3 p5DetailContent');
  if (
    source.schemaVersion !== 1
    || source.status !== 'production-unreachable'
    || source.hardGate !== false
    || source.defaultSurfaceWired !== false
    || source.ownerId !== 'p5-content'
    || source.screenId !== selection.screenId
    || source.targetDefinitionId !== selection.targetDefinitionId
  ) throw new RangeError('A6.3 P5详情内容治理、页面或目标身份漂移。');
  if (source.sourceContentHash !== sourceContentHash) {
    throw new RangeError('A6.3 P5详情内容未绑定A6.2所用P5目录revision。');
  }
  if (!Array.isArray(source.fieldValues)) {
    throw new TypeError('A6.3 P5详情fieldValues必须是数组。');
  }
  const expectedFieldIds = EXPECTED_P5_FIELDS[selection.kind];
  if (source.fieldValues.length !== expectedFieldIds.length) {
    throw new RangeError('A6.3 P5详情字段数量不闭合。');
  }
  const fields = Object.freeze(source.fieldValues.map((value, index) => {
    const field = exactRecord(value, FIELD_KEYS, `A6.3 P5详情field[${index}]`);
    const expectedFieldId = expectedFieldIds[index];
    if (expectedFieldId === undefined || field.fieldId !== expectedFieldId) {
      throw new RangeError(`A6.3 P5详情field[${index}]身份或顺序漂移。`);
    }
    return Object.freeze({
      fieldId: expectedFieldId,
      labelMessageId: nonEmptyString(field.labelMessageId, 'A6.3 P5 labelMessageId', 240),
      valueText: nonEmptyString(field.valueText, 'A6.3 P5 valueText', 4096),
      accessibilityText: nonEmptyString(field.accessibilityText, 'A6.3 P5 accessibilityText', 4096),
      fixedWidthNumeric: booleanValue(field.fixedWidthNumeric, 'A6.3 P5 fixedWidthNumeric'),
    });
  }));
  const authority = Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    ownerId: 'p5-content' as const,
    screenId: selection.screenId,
    targetDefinitionId: selection.targetDefinitionId,
    sourceContentHash: contentHash(source.sourceContentHash, 'A6.3 P5 sourceContentHash'),
    fieldValues: fields,
  });
  const actualHash = contentHash(source.contentHash, 'A6.3 P5 contentHash');
  const expectedHash = createDeterministicDataHash(
    authority,
    'Arena V2 A6.3 P5 Detail Content Envelope V1',
  );
  if (actualHash !== expectedHash) throw new RangeError('A6.3 P5详情内容hash漂移。');
  return Object.freeze({ ...authority, contentHash: actualHash });
}

export function createArenaV2A6P5DetailContentEnvelopeV1(value: Readonly<{
  readonly selection: ArenaV2A6DetailSelectionV1;
  readonly sourceContentHash: string;
  readonly fieldValues: readonly ArenaV2InformationFieldValueV1[];
}>): ArenaV2A6P5DetailContentEnvelopeV1 {
  const selection = parseSelection(value.selection);
  const authority = Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    ownerId: 'p5-content' as const,
    screenId: selection.screenId,
    targetDefinitionId: selection.targetDefinitionId,
    sourceContentHash: value.sourceContentHash,
    fieldValues: value.fieldValues,
  });
  return parseP5DetailContent(
    Object.freeze({
      ...authority,
      contentHash: createDeterministicDataHash(
        authority,
        'Arena V2 A6.3 P5 Detail Content Envelope V1',
      ),
    }),
    selection,
    value.sourceContentHash,
  );
}

function parseAction(
  value: unknown,
  selection: ArenaV2A6DetailSelectionV1,
): ArenaV2A6ExistingDetailSelectionActionV1 {
  const source = exactRecord(value, ACTION_KEYS, 'A6.3 existingSelectionAction');
  const expectedIntent = selection.kind === 'weapon'
    ? ARENA_V2_INFORMATION_UI_INTENT_V1.USE_SELECTED_WEAPON_NEXT_MATCH
    : ARENA_V2_INFORMATION_UI_INTENT_V1.USE_SELECTED_MAP_NEXT_MATCH;
  const expectedLabelMessageId = selection.kind === 'weapon'
    ? 'arena.v2.action.use-weapon-next-match'
    : 'arena.v2.action.use-map-next-match';
  if (
    source.intentId !== expectedIntent
    || source.labelMessageId !== expectedLabelMessageId
    || source.targetDefinitionId !== selection.targetDefinitionId
  ) throw new RangeError('A6.3既有详情选择动作的intent、label或目标漂移。');
  const enabled = booleanValue(source.enabled, 'A6.3 action.enabled');
  const disabledReason = source.disabledReason === null
    ? null
    : nonEmptyString(source.disabledReason, 'A6.3 action.disabledReason', 512);
  if (enabled ? disabledReason !== null : disabledReason === null) {
    throw new RangeError('A6.3既有详情选择动作的启用状态与原因矛盾。');
  }
  return Object.freeze({
    intentId: expectedIntent,
    labelMessageId: expectedLabelMessageId,
    labelText: nonEmptyString(source.labelText, 'A6.3 action.labelText', 512),
    accessibilityText: nonEmptyString(source.accessibilityText, 'A6.3 action.accessibilityText', 1024),
    targetDefinitionId: selection.targetDefinitionId,
    enabled,
    disabledReason,
  });
}

export function createArenaV2A6ExistingDetailSelectionActionV1(value: Readonly<{
  readonly selection: ArenaV2A6DetailSelectionV1;
  readonly intentId: ArenaV2InformationUiIntentV1;
  readonly labelText: string;
  readonly accessibilityText: string;
  readonly enabled: boolean;
  readonly disabledReason: string | null;
}>): ArenaV2A6ExistingDetailSelectionActionV1 {
  const selection = parseSelection(value.selection);
  return parseAction(Object.freeze({
    intentId: value.intentId,
    labelMessageId: selection.kind === 'weapon'
      ? 'arena.v2.action.use-weapon-next-match'
      : 'arena.v2.action.use-map-next-match',
    labelText: value.labelText,
    accessibilityText: value.accessibilityText,
    targetDefinitionId: selection.targetDefinitionId,
    enabled: value.enabled,
    disabledReason: value.disabledReason,
  }), selection);
}

function parseWeaponDetailProgress(
  value: unknown,
  selection: ArenaV2A6DetailSelectionV1,
  summary: ArenaV2A6CollectionProgressItemV1,
  profileRevision: number,
): ArenaV2A6WeaponDetailProgressFactsV1 {
  const source = exactRecord(value, WEAPON_DETAIL_KEYS, 'A6.3 weapon detailProgressFacts');
  if (
    source.schemaVersion !== 1
    || source.ownerId !== 'p6-profile'
    || source.kind !== 'weapon'
    || source.weaponDefinitionId !== selection.targetDefinitionId
    || source.profileRevision !== profileRevision
  ) throw new RangeError('A6.3武器明细的P6 owner、Profile revision或目标身份漂移。');
  if (!Array.isArray(source.contexts) || source.contexts.length !== WEAPON_CONTEXT_ORDER.length) {
    throw new RangeError('A6.3武器明细必须精确覆盖五个具名学习情境。');
  }
  const contexts = Object.freeze(source.contexts.map((value, index) => {
    const context = exactRecord(value, WEAPON_CONTEXT_KEYS, `A6.3 weapon context[${index}]`);
    const expectedContext = WEAPON_CONTEXT_ORDER[index]!;
    if (context.context !== expectedContext) {
      throw new RangeError(`A6.3 weapon context[${index}]身份或顺序漂移。`);
    }
    const evidenceCount = integer(
      context.evidenceCount,
      0,
      1_000_000_000,
      `A6.3 weapon context[${index}].evidenceCount`,
    );
    const completedAtRevision = completedRevision(
      context.completedAtRevision,
      profileRevision,
      `A6.3 weapon context[${index}].completedAtRevision`,
    );
    if (completedAtRevision !== null && evidenceCount === 0) {
      throw new RangeError('A6.3已完成武器情境必须具有正数权威证据。');
    }
    return Object.freeze({ context: expectedContext, evidenceCount, completedAtRevision });
  }));
  const useCount = integer(source.useCount, 0, 1_000_000_000, 'A6.3 weapon useCount');
  const collectionEvidenceTarget = integer(
    source.collectionEvidenceTarget,
    1,
    1_000_000_000,
    'A6.3 weapon collectionEvidenceTarget',
  );
  const collected = booleanValue(source.collected, 'A6.3 weapon collected');
  const completedCount = contexts.filter(({ completedAtRevision }) => (
    completedAtRevision !== null
  )).length;
  if (completedCount !== summary.mastery.completed) {
    throw new RangeError('A6.3武器汇总completedContextCount与P6逐情境明细不一致。');
  }
  if (collected !== summary.collected
    || useCount !== summary.collectionResearch?.current
    || collectionEvidenceTarget !== summary.collectionResearch?.target) {
    throw new RangeError('A6.3武器收藏研究明细与P6汇总不一致。');
  }
  if (!collected && useCount >= collectionEvidenceTarget) {
    throw new RangeError('A6.3未收藏武器不能达到收藏研究阈值。');
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    ownerId: 'p6-profile' as const,
    kind: 'weapon' as const,
    profileRevision,
    weaponDefinitionId: selection.targetDefinitionId,
    collected,
    useCount,
    collectionEvidenceTarget,
    contexts,
  });
}

function parseMapDetailProgress(
  value: unknown,
  selection: ArenaV2A6DetailSelectionV1,
  summary: ArenaV2A6CollectionProgressItemV1,
  profileRevision: number,
  expectedSegments: readonly Readonly<{
    readonly segmentDefinitionId: string;
    readonly ordinal: number;
    readonly displayName: string;
  }>[],
): ArenaV2A6MapDetailProgressFactsV1 {
  const source = exactRecord(value, MAP_DETAIL_KEYS, 'A6.3 map detailProgressFacts');
  if (
    source.schemaVersion !== 1
    || source.ownerId !== 'p6-profile'
    || source.kind !== 'map'
    || source.mapDefinitionId !== selection.targetDefinitionId
    || source.profileRevision !== profileRevision
  ) throw new RangeError('A6.3地图明细的P6 owner、Profile revision或目标身份漂移。');
  if (!Array.isArray(source.segments) || source.segments.length !== expectedSegments.length) {
    throw new RangeError('A6.3地图明细必须与所选P5 map目录逐段一一对应。');
  }
  const segments = Object.freeze(source.segments.map((value, index) => {
    const segment = exactRecord(value, MAP_SEGMENT_KEYS, `A6.3 map segment[${index}]`);
    const expected = expectedSegments[index]!;
    if (segment.segmentDefinitionId !== expected.segmentDefinitionId) {
      throw new RangeError(`A6.3 map segment[${index}]身份或目录顺序漂移。`);
    }
    const completionEvidenceCount = integer(
      segment.completionEvidenceCount,
      0,
      1_000_000_000,
      `A6.3 map segment[${index}].completionEvidenceCount`,
    );
    const completedAtRevision = completedRevision(
      segment.completedAtRevision,
      profileRevision,
      `A6.3 map segment[${index}].completedAtRevision`,
    );
    if (completedAtRevision !== null && completionEvidenceCount === 0) {
      throw new RangeError('A6.3已完成地图段落必须具有正数权威证据。');
    }
    return Object.freeze({
      segmentDefinitionId: expected.segmentDefinitionId,
      completionEvidenceCount,
      completedAtRevision,
    });
  }));
  const completedCount = segments.filter(({ completedAtRevision }) => (
    completedAtRevision !== null
  )).length;
  if (completedCount !== summary.mastery.completed) {
    throw new RangeError('A6.3地图汇总completedSegmentCount与P6逐段明细不一致。');
  }
  const routeResearchSource = exactRecord(
    source.routeResearch,
    MAP_ROUTE_RESEARCH_KEYS,
    'A6.3 map detailProgressFacts.routeResearch',
  );
  const evidencePerSegmentTarget = integer(
    routeResearchSource.evidencePerSegmentTarget,
    1,
    1_000_000_000,
    'A6.3 map routeResearch.evidencePerSegmentTarget',
  );
  const routeResearch = projectArenaV2MapRouteResearchMilestoneV1({
    evidenceCount: segments.reduce((total, segment) => (
      total + segment.completionEvidenceCount
    ), 0),
    completedSegmentCount: completedCount,
    segmentCount: segments.length,
    evidencePerSegmentTarget,
  });
  if (routeResearchSource.schemaVersion !== routeResearch.schemaVersion
    || routeResearchSource.evidenceCount !== routeResearch.evidenceCount
    || routeResearchSource.evidenceTarget !== routeResearch.evidenceTarget
    || routeResearchSource.completedSegmentCount !== routeResearch.completedSegmentCount
    || routeResearchSource.segmentCount !== routeResearch.segmentCount
    || routeResearchSource.stage !== routeResearch.stage
    || routeResearchSource.nextMilestonePercentage !== routeResearch.nextMilestonePercentage
    || routeResearchSource.nextMilestoneEvidenceThreshold
      !== routeResearch.nextMilestoneEvidenceThreshold
    || routeResearchSource.remainingEvidenceCount !== routeResearch.remainingEvidenceCount
    || !Array.isArray(routeResearchSource.milestones)
    || routeResearchSource.milestones.length !== routeResearch.milestones.length) {
    throw new RangeError('A6.3地图路线研究事实与P6纯投影漂移。');
  }
  routeResearchSource.milestones.forEach((value, index) => {
    const milestone = exactRecord(
      value,
      MAP_ROUTE_MILESTONE_KEYS,
      `A6.3 map routeResearch.milestones[${index}]`,
    );
    const expected = routeResearch.milestones[index]!;
    if (milestone.percentage !== expected.percentage
      || milestone.evidenceThreshold !== expected.evidenceThreshold
      || milestone.reached !== expected.reached) {
      throw new RangeError(`A6.3 map routeResearch.milestones[${index}]事实漂移。`);
    }
  });
  if (summary.routeResearch === null
    || JSON.stringify(summary.routeResearch) !== JSON.stringify(routeResearch)) {
    throw new RangeError('A6.3地图路线研究汇总与逐段明细漂移。');
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    ownerId: 'p6-profile' as const,
    kind: 'map' as const,
    profileRevision,
    mapDefinitionId: selection.targetDefinitionId,
    routeResearch,
    segments,
  });
}

function validateA6_2Input(value: unknown): Readonly<{
  readonly input: ArenaV2A6CollectionProgressComponentInputV1;
  readonly snapshot: ArenaV2A6CollectionProgressComponentSnapshotV1;
}> {
  const source = exactRecord(value, A6_2_INPUT_KEYS, 'A6.3 collectionProgressInput');
  const epochId = nonEmptyString(source.epochId, 'A6.3 collectionProgressInput.epochId', 200);
  const validator = new ArenaV2CollectionProgressComponentSetCandidateV1({ epochId });
  try {
    const snapshot = validator.consume(source);
    return Object.freeze({
      input: source as unknown as ArenaV2A6CollectionProgressComponentInputV1,
      snapshot,
    });
  } finally {
    validator.destroy();
  }
}

interface ParsedInputV1 {
  readonly collectionInput: ArenaV2A6CollectionProgressComponentInputV1;
  readonly collectionSnapshot: ArenaV2A6CollectionProgressComponentSnapshotV1;
  readonly selection: ArenaV2A6DetailSelectionV1;
  readonly p5DetailContent: ArenaV2A6P5DetailContentEnvelopeV1;
  readonly detailProgressFacts: ArenaV2A6DetailProgressFactsV1 | null;
  readonly existingSelectionAction: ArenaV2A6ExistingDetailSelectionActionV1;
  readonly selectedContent: Readonly<{
    readonly displayName: string;
    readonly segments: readonly Readonly<{
      readonly segmentDefinitionId: string;
      readonly ordinal: number;
      readonly displayName: string;
    }>[];
  }>;
  readonly summary: ArenaV2A6CollectionProgressItemV1 | null;
  readonly canonical: string;
}

function parseInput(value: unknown): ParsedInputV1 {
  const source = exactRecord(
    cloneStrictData(value, 'A6.3 collection mastery detail input'),
    INPUT_KEYS,
    'A6.3 collection mastery detail input',
  );
  if (source.schemaVersion !== 1) throw new RangeError('A6.3输入只接受schema 1。');
  const collection = validateA6_2Input(source.collectionProgressInput);
  const selection = parseSelection(source.selection);
  const collectionContent = collection.input.collectionContent;
  const selectedWeapon = selection.kind === 'weapon'
    ? collectionContent.weapons.find(({ weaponDefinitionId }) => (
      weaponDefinitionId === selection.targetDefinitionId
    ))
    : undefined;
  const selectedMap = selection.kind === 'map'
    ? collectionContent.maps.find(({ mapDefinitionId }) => (
      mapDefinitionId === selection.targetDefinitionId
    ))
    : undefined;
  if (selection.kind === 'weapon' ? selectedWeapon === undefined : selectedMap === undefined) {
    throw new RangeError('A6.3所选详情目标不属于已验证P5 collectionContent。');
  }
  const selectedContent = selection.kind === 'weapon'
    ? Object.freeze({ displayName: selectedWeapon!.displayName, segments: Object.freeze([]) })
    : Object.freeze({
      displayName: selectedMap!.displayName,
      segments: Object.freeze(selectedMap!.segments.map((segment) => Object.freeze({
        segmentDefinitionId: segment.segmentDefinitionId,
        ordinal: segment.ordinal,
        displayName: segment.displayName,
      }))),
    });
  const p5DetailContent = parseP5DetailContent(
    source.p5DetailContent,
    selection,
    collectionContent.sourceContentHash,
  );
  const existingSelectionAction = parseAction(source.existingSelectionAction, selection);
  const summaryItems = selection.kind === 'weapon'
    ? collection.snapshot.weaponIndex.items
    : collection.snapshot.mapIndex.items;
  const summary = summaryItems.find(({ definitionId }) => (
    definitionId === selection.targetDefinitionId
  )) ?? null;
  const ready = collection.input.sourceState === 'ready';
  if (ready && (summary === null || collection.snapshot.profileIdentity === null)) {
    throw new Error('A6.3 ready状态缺少已验证A6.2汇总或Profile身份。');
  }
  if (!ready && source.detailProgressFacts !== null) {
    throw new RangeError('A6.3非ready状态不得携带可能过期的P6明细事实。');
  }
  if (ready && source.detailProgressFacts === null) {
    throw new RangeError('A6.3 ready状态必须携带P6 detailProgressFacts。');
  }
  const profileRevision = collection.snapshot.profileIdentity?.profileRevision ?? -1;
  const detailProgressFacts = source.detailProgressFacts === null
    ? null
    : selection.kind === 'weapon'
      ? parseWeaponDetailProgress(
        source.detailProgressFacts,
        selection,
        summary!,
        profileRevision,
      )
      : parseMapDetailProgress(
        source.detailProgressFacts,
        selection,
        summary!,
        profileRevision,
        selectedContent.segments,
      );
  return Object.freeze({
    collectionInput: collection.input,
    collectionSnapshot: collection.snapshot,
    selection,
    p5DetailContent,
    detailProgressFacts,
    existingSelectionAction,
    selectedContent,
    summary,
    canonical: JSON.stringify({
      schemaVersion: 1,
      collectionProgressInput: collection.input,
      selection,
      p5DetailContent,
      detailProgressFacts,
      existingSelectionAction,
    }),
  });
}

function rowState(evidenceCount: number, completedAtRevision: number | null): ArenaV2A6MasteryRowStateV1 {
  if (completedAtRevision !== null) return 'complete';
  return evidenceCount > 0 ? 'in-progress' : 'not-started';
}

function rowSemantic(
  state: ArenaV2A6MasteryRowStateV1,
  isCurrentUniqueGoal: boolean,
): ArenaV2A6MasteryRowSemanticV1 {
  return Object.freeze({
    stateText: state === 'complete' ? '已完成' as const
      : state === 'in-progress' ? '积累中' as const : '未开始' as const,
    stateShapeToken: state === 'complete' ? 'filled-ring' as const
      : state === 'in-progress' ? 'half-ring' as const : 'open-ring' as const,
    statePatternToken: state === 'complete' ? 'solid-single-bars' as const
      : state === 'in-progress' ? 'diagonal-progress-stripe' as const : 'quiet-dot-grid' as const,
    stateColorHex: state === 'complete' ? '#45D483' as const
      : state === 'in-progress' ? '#56B8FF' as const : '#CFC6B3' as const,
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

function goalMarker(
  parsed: ParsedInputV1,
): ArenaV2A6CollectionMasteryDetailSnapshotV1['currentGoalMarker'] {
  const goal = parsed.collectionInput.nextGoalIdentity;
  if (goal === null) return null;
  if (
    parsed.selection.kind === 'weapon'
    && goal.kind === 'weapon-context'
    && goal.weaponDefinitionId === parsed.selection.targetDefinitionId
    && goal.context !== null
  ) return Object.freeze({
    scope: 'weapon-context' as const,
    identity: goal.context,
    sourceGoalId: goal.goalId,
  });
  if (
    parsed.selection.kind === 'map'
    && goal.kind === 'map-segment'
    && goal.mapDefinitionId === parsed.selection.targetDefinitionId
    && goal.segmentDefinitionId !== null
  ) return Object.freeze({
    scope: 'map-segment' as const,
    identity: goal.segmentDefinitionId,
    sourceGoalId: goal.goalId,
  });
  const mapped = parsed.collectionSnapshot.currentGoalItem;
  return mapped?.kind === parsed.selection.kind
    && mapped.definitionId === parsed.selection.targetDefinitionId
    ? Object.freeze({
      scope: 'detail' as const,
      identity: parsed.selection.targetDefinitionId,
      sourceGoalId: mapped.sourceGoalId,
    })
    : null;
}

const LAYOUTS = Object.freeze([
  Object.freeze({
    viewport: '390x844' as const,
    safeAreaRequired: true as const,
    contentPaddingCssPixels: 16 as const,
    summaryMinimumHeightCssPixels: 88 as const,
    rowMinimumHeightCssPixels: 56 as const,
    rowColumns: 1 as const,
    actionMinimumTouchTargetCssPixels: 48 as const,
    labelMaximumLines: 2 as const,
    numericSlotCharacterColumns: 5 as const,
    overflowPolicy: 'wrap-then-ellipsis-preserve-accessibility-text' as const,
    verticalScrollPermitted: true as const,
    horizontalOverflowAllowed: false as const,
    screenshotEvidence: 'not-run' as const,
  }),
  Object.freeze({
    viewport: '1440x900' as const,
    safeAreaRequired: true as const,
    contentPaddingCssPixels: 32 as const,
    summaryMinimumHeightCssPixels: 96 as const,
    rowMinimumHeightCssPixels: 60 as const,
    rowColumns: 2 as const,
    actionMinimumTouchTargetCssPixels: 48 as const,
    labelMaximumLines: 1 as const,
    numericSlotCharacterColumns: 5 as const,
    overflowPolicy: 'wrap-then-ellipsis-preserve-accessibility-text' as const,
    verticalScrollPermitted: true as const,
    horizontalOverflowAllowed: false as const,
    screenshotEvidence: 'not-run' as const,
  }),
] as const satisfies readonly [
  ArenaV2A6MasteryDetailLayoutContractV1,
  ArenaV2A6MasteryDetailLayoutContractV1,
]);

function stateMessage(state: ArenaV2A6CollectionProgressSourceStateV1): string | null {
  if (state === 'ready') return null;
  if (state === 'loading') return '正在读取详情熟练进度';
  if (state === 'empty') return '尚无可展示的收藏详情记录';
  if (state === 'error') return '详情进度读取失败，未显示推测状态';
  return '档案来自未来版本，当前详情保持只读关闭';
}

function projectSnapshot(parsed: ParsedInputV1): ArenaV2A6CollectionMasteryDetailSnapshotV1 {
  const marker = goalMarker(parsed);
  const facts = parsed.detailProgressFacts;
  const rows: readonly ArenaV2A6MasteryDetailRowV1[] = facts === null
    ? Object.freeze([])
    : facts.kind === 'weapon'
      ? Object.freeze(facts.contexts.map((context, index) => {
        const state = rowState(context.evidenceCount, context.completedAtRevision);
        const isCurrentUniqueGoal = marker?.scope === 'weapon-context'
          && marker.identity === context.context;
        const labelText = WEAPON_CONTEXT_LABELS[context.context];
        return Object.freeze({
          rowKind: 'weapon-context' as const,
          identity: context.context,
          ordinal: index + 1,
          labelText,
          accessibilityText: `${labelText}，${rowSemantic(state, isCurrentUniqueGoal).stateText}，证据${context.evidenceCount}。`,
          evidenceCount: context.evidenceCount,
          completedAtRevision: context.completedAtRevision,
          state,
          isCurrentUniqueGoal,
          semantic: rowSemantic(state, isCurrentUniqueGoal),
        });
      }))
      : Object.freeze(facts.segments.map((segment, index) => {
        const content = parsed.selectedContent.segments[index]!;
        const state = rowState(segment.completionEvidenceCount, segment.completedAtRevision);
        const isCurrentUniqueGoal = marker?.scope === 'map-segment'
          && marker.identity === segment.segmentDefinitionId;
        return Object.freeze({
          rowKind: 'map-segment' as const,
          identity: segment.segmentDefinitionId,
          ordinal: content.ordinal,
          labelText: content.displayName,
          accessibilityText: `${content.displayName}，${rowSemantic(state, isCurrentUniqueGoal).stateText}，证据${segment.completionEvidenceCount}。`,
          evidenceCount: segment.completionEvidenceCount,
          completedAtRevision: segment.completedAtRevision,
          state,
          isCurrentUniqueGoal,
          semantic: rowSemantic(state, isCurrentUniqueGoal),
        });
      }));
  const goalCount = rows.filter(({ isCurrentUniqueGoal }) => isCurrentUniqueGoal).length
    + (marker?.scope === 'detail' ? 1 : 0);
  if (goalCount > 1 || (marker !== null && goalCount !== 1)) {
    throw new RangeError('A6.3全页唯一nextGoal标记数量不闭合。');
  }
  const summary = parsed.summary === null ? null : Object.freeze({
    displayName: parsed.selectedContent.displayName,
    collected: parsed.summary.collected,
    completed: parsed.summary.mastery.completed,
    total: parsed.summary.mastery.total,
    valueText: parsed.summary.mastery.valueText,
    accessibilityText: `${parsed.selectedContent.displayName}，${parsed.summary.collected ? '已收藏' : '未收藏'}，${
      parsed.summary.collectionResearch === null
        ? ''
        : `主研究${parsed.summary.collectionResearch.current}/${parsed.summary.collectionResearch.target}，`
    }${parsed.summary.routeResearch === null
      ? ''
      : `路线研究${parsed.summary.routeResearch.evidenceCount}/${
        parsed.summary.routeResearch.evidenceTarget
      }，当前阶段${parsed.summary.routeResearch.stage}，`
    }熟练进度${parsed.summary.mastery.completed}/${parsed.summary.mastery.total}。`,
    collectionEvidenceCurrent: parsed.summary.collectionResearch?.current ?? null,
    collectionEvidenceTarget: parsed.summary.collectionResearch?.target ?? null,
    mainResearchStage: parsed.summary.collectionResearch?.stage ?? null,
    nextMainResearchMilestoneText: parsed.summary.collectionResearch === null
      ? null
      : parsed.summary.collectionResearch.nextMilestone?.valueText
        ?? '主研究里程碑已完成',
    nextMainResearchMilestoneAccessibilityText: parsed.summary.collectionResearch === null
      ? null
      : parsed.summary.collectionResearch.nextMilestone?.accessibilityText
        ?? '四个主研究里程碑均已完成。',
    routeResearch: parsed.summary.routeResearch,
    nextMapRouteResearchMilestoneText: parsed.summary.routeResearch === null
      ? null
      : parsed.summary.routeResearch.nextMilestonePercentage === null
        ? '路线研究里程碑已完成'
        : `下一里程碑${parsed.summary.routeResearch.nextMilestonePercentage}%，还需${
          parsed.summary.routeResearch.remainingEvidenceCount
        }次有效路线练习`,
    nextMapRouteResearchMilestoneAccessibilityText: parsed.summary.routeResearch === null
      ? null
      : parsed.summary.routeResearch.nextMilestonePercentage === null
        ? '四个地图路线研究里程碑均已完成。'
        : `下一地图路线研究里程碑为${
          parsed.summary.routeResearch.nextMilestonePercentage
        }%，还需要${parsed.summary.routeResearch.remainingEvidenceCount}次有效路线练习。`,
    fixedWidthNumeric: true as const,
    numericSlotCharacterColumns: 5 as const,
    isCurrentUniqueGoal: marker?.scope === 'detail',
  });
  const ready = parsed.collectionInput.sourceState === 'ready';
  const actionEnabled = ready && parsed.existingSelectionAction.enabled;
  const message = stateMessage(parsed.collectionInput.sourceState);
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    validationStatus: 'not-run' as const,
    epochId: parsed.collectionInput.epochId,
    tick: parsed.collectionInput.tick,
    locale: parsed.collectionInput.locale,
    sourceState: parsed.collectionInput.sourceState,
    screenId: parsed.selection.screenId,
    kind: parsed.selection.kind,
    targetDefinitionId: parsed.selection.targetDefinitionId,
    stateMessage: message,
    profileIdentity: parsed.collectionSnapshot.profileIdentity,
    contentIdentity: Object.freeze({
      collectionSourceContentHash: parsed.collectionInput.collectionContent.sourceContentHash,
      collectionContentHash: parsed.collectionInput.collectionContent.contentHash,
      p5DetailContentHash: parsed.p5DetailContent.contentHash,
    }),
    p5DetailFields: parsed.p5DetailContent.fieldValues,
    summary,
    rows,
    currentGoalMarker: marker,
    selectionAction: Object.freeze({
      intentId: parsed.existingSelectionAction.intentId,
      labelMessageId: parsed.existingSelectionAction.labelMessageId,
      labelText: parsed.existingSelectionAction.labelText,
      accessibilityText: parsed.existingSelectionAction.accessibilityText,
      targetDefinitionId: parsed.existingSelectionAction.targetDefinitionId,
      sourceEnabled: parsed.existingSelectionAction.enabled,
      enabled: actionEnabled,
      disabledReason: actionEnabled
        ? null
        : message ?? parsed.existingSelectionAction.disabledReason,
      minimumTouchTargetCssPixels: 48 as const,
      mutatesProfileOrRules: false as const,
    }),
    layouts: LAYOUTS,
    accessibility: Object.freeze({
      reducedMotion: parsed.collectionInput.reducedMotion,
      motionPolicy: parsed.collectionInput.reducedMotion
        ? 'none-static-state-change' as const
        : 'brief-border-opacity-only' as const,
      muted: parsed.collectionInput.muted,
      visualDependsOnAudioPlayback: false as const,
      silentEquivalentComplete: true as const,
      longTextPreservedForAssistiveTechnology: true as const,
    }),
    fallback: Object.freeze({
      decorativeAssetMissing: parsed.collectionInput.decorativeAssetState === 'missing',
      usesTextShapePatternFallback: parsed.collectionInput.decorativeAssetState === 'missing',
      programmaticAssetClaimsApproval: false as const,
    }),
  });
}

export class ArenaV2CollectionMasteryDetailCompositionCandidateV1 {
  #epochId: string;
  #state: ArenaV2A6CollectionMasteryDetailLifecycleV1 =
    ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_LIFECYCLE_V1.ACTIVE;
  #lastTick = -1;
  #lastInputCanonical: string | null = null;
  #collectionContentIdentity: string | null = null;
  readonly #detailContentHashBySelection = new Map<string, string>();
  #profileIdentity: string | null = null;
  #profileRevision = -1;
  #profileCanonical: string | null = null;
  readonly #detailFactBySelection = new Map<string, Readonly<{
    readonly profileRevision: number;
    readonly canonical: string;
  }>>();
  #snapshot: ArenaV2A6CollectionMasteryDetailSnapshotV1 | null = null;
  #snapshotCanonical: string | null = null;
  #busy = false;

  constructor(value: unknown) {
    const source = exactRecord(
      cloneStrictData(value, 'A6.3 constructor'),
      CONSTRUCTOR_KEYS,
      'A6.3 constructor',
    );
    this.#epochId = nonEmptyString(source.epochId, 'A6.3 constructor.epochId', 200);
  }

  get state(): ArenaV2A6CollectionMasteryDetailLifecycleV1 { return this.#state; }

  #assertActive(operation: string): void {
    if (this.#state !== ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_LIFECYCLE_V1.ACTIVE) {
      throw new Error(`${operation}拒绝状态${this.#state}。`);
    }
    if (this.#busy) throw new Error(`${operation}拒绝重入。`);
  }

  #assertSnapshotIntegrity(): void {
    if (this.#snapshot !== null && JSON.stringify(this.#snapshot) !== this.#snapshotCanonical) {
      throw new Error('A6.3已存快照完整性漂移，组件失败关闭。');
    }
  }

  consume(value: unknown): ArenaV2A6CollectionMasteryDetailSnapshotV1 {
    this.#assertActive('A6.3 consume');
    this.#assertSnapshotIntegrity();
    this.#busy = true;
    try {
      const parsed = parseInput(value);
      if (parsed.collectionInput.epochId !== this.#epochId) {
        throw new RangeError('A6.3输入epochId漂移。');
      }
      if (parsed.collectionInput.tick < this.#lastTick) throw new RangeError('A6.3输入tick回退。');
      if (parsed.collectionInput.tick === this.#lastTick) {
        if (parsed.canonical !== this.#lastInputCanonical) {
          throw new RangeError('A6.3同tick输入携带冲突事实。');
        }
        if (this.#snapshot === null) throw new Error('A6.3同tick幂等状态缺少快照。');
        return this.#snapshot;
      }
      const nextCollectionContentIdentity = [
        parsed.collectionInput.collectionContent.sourceContentHash,
        parsed.collectionInput.collectionContent.contentHash,
      ].join('|');
      if (
        this.#collectionContentIdentity !== null
        && nextCollectionContentIdentity !== this.#collectionContentIdentity
      ) {
        throw new RangeError('A6.3同epoch P5 collectionContent identity/hash漂移。');
      }
      const nextSelectionIdentity = `${parsed.selection.kind}|${parsed.selection.targetDefinitionId}`;
      const previousDetailContentHash = this.#detailContentHashBySelection.get(nextSelectionIdentity);
      if (
        previousDetailContentHash !== undefined
        && previousDetailContentHash !== parsed.p5DetailContent.contentHash
      ) {
        throw new RangeError('A6.3同epoch同一详情目标的P5 content hash漂移。');
      }
      if (
        previousDetailContentHash === undefined
        && this.#detailContentHashBySelection.size >= 22
      ) {
        throw new RangeError('A6.3同epoch详情内容身份表超过20武器＋2地图上限。');
      }
      const profile = parsed.collectionSnapshot.profileIdentity;
      const nextProfileIdentity = profile === null ? null : [
        profile.profileDefinitionId,
        profile.profileDefinitionContentVersion,
        profile.profileId,
      ].join('|');
      if (
        this.#profileIdentity !== null
        && nextProfileIdentity !== null
        && nextProfileIdentity !== this.#profileIdentity
      ) throw new RangeError('A6.3同epoch Profile身份漂移。');
      if (profile !== null && profile.profileRevision < this.#profileRevision) {
        throw new RangeError('A6.3 Profile revision回退。');
      }
      const nextDetailCanonical = parsed.detailProgressFacts === null
        ? null
        : JSON.stringify(parsed.detailProgressFacts);
      const nextProfileCanonical = profile === null ? null : JSON.stringify({
        profileIdentity: profile,
        progressFacts: parsed.collectionInput.progressFacts,
        nextGoalIdentity: parsed.collectionInput.nextGoalIdentity,
      });
      if (
        profile !== null
        && profile.profileRevision === this.#profileRevision
        && nextProfileCanonical !== this.#profileCanonical
      ) throw new RangeError('A6.3相同Profile revision的完整汇总事实漂移。');
      const previousDetailFact = this.#detailFactBySelection.get(nextSelectionIdentity);
      if (
        profile !== null
        && nextDetailCanonical !== null
        && previousDetailFact?.profileRevision === profile.profileRevision
        && previousDetailFact.canonical !== nextDetailCanonical
      ) throw new RangeError('A6.3相同Profile revision与selection的明细身份或完成集合漂移。');
      const snapshot = projectSnapshot(parsed);
      const snapshotCanonical = JSON.stringify(snapshot);
      this.#lastTick = parsed.collectionInput.tick;
      this.#lastInputCanonical = parsed.canonical;
      this.#collectionContentIdentity = nextCollectionContentIdentity;
      this.#detailContentHashBySelection.set(
        nextSelectionIdentity,
        parsed.p5DetailContent.contentHash,
      );
      if (profile !== null) {
        this.#profileIdentity = nextProfileIdentity;
        this.#profileRevision = profile.profileRevision;
        this.#profileCanonical = nextProfileCanonical;
        if (nextDetailCanonical !== null) {
          this.#detailFactBySelection.set(nextSelectionIdentity, Object.freeze({
            profileRevision: profile.profileRevision,
            canonical: nextDetailCanonical,
          }));
        }
      }
      this.#snapshot = snapshot;
      this.#snapshotCanonical = snapshotCanonical;
      return snapshot;
    } finally {
      this.#busy = false;
    }
  }

  getSnapshot(): ArenaV2A6CollectionMasteryDetailSnapshotV1 | null {
    this.#assertActive('A6.3 getSnapshot');
    this.#assertSnapshotIntegrity();
    return this.#snapshot;
  }

  resetPresentationEpoch(value: unknown): void {
    this.#assertActive('A6.3 resetPresentationEpoch');
    this.#assertSnapshotIntegrity();
    const source = exactRecord(
      cloneStrictData(value, 'A6.3 epoch reset'),
      RESET_KEYS,
      'A6.3 epoch reset',
    );
    const epochId = nonEmptyString(source.epochId, 'A6.3 epoch reset.epochId', 200);
    if (epochId === this.#epochId) throw new RangeError('A6.3 epoch reset必须使用新epochId。');
    this.#epochId = epochId;
    this.#lastTick = -1;
    this.#lastInputCanonical = null;
    this.#collectionContentIdentity = null;
    this.#detailContentHashBySelection.clear();
    this.#profileIdentity = null;
    this.#profileRevision = -1;
    this.#profileCanonical = null;
    this.#detailFactBySelection.clear();
    this.#snapshot = null;
    this.#snapshotCanonical = null;
  }

  destroy(): void {
    if (this.#state === ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_LIFECYCLE_V1.DESTROYED) return;
    if (this.#busy) throw new Error('A6.3 consume期间不能destroy。');
    this.#lastTick = -1;
    this.#lastInputCanonical = null;
    this.#collectionContentIdentity = null;
    this.#detailContentHashBySelection.clear();
    this.#profileIdentity = null;
    this.#profileRevision = -1;
    this.#profileCanonical = null;
    this.#detailFactBySelection.clear();
    this.#snapshot = null;
    this.#snapshotCanonical = null;
    this.#state = ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_LIFECYCLE_V1.DESTROYED;
  }
}

export const ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_REFERENCE_LEDGER_V1 = Object.freeze([
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
  Object.freeze({ read: true as const, path: 'packages/arena-product-presentation/src/arena-v2-information-content-read-projection-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-presentation/src/arena-v2-information-selection-render-plan-candidate-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-presentation/src/arena-v2-information-screen-registry-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-progression/src/arena-v2-learning-information-projection-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-progression/src/arena-v2-weapon-collection-research-milestone-projection-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-progression/src/arena-v2-next-learning-goal-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-content/src/arena-v2-learning-profile-definition-candidate-v1.ts' }),
  Object.freeze({ read: true as const, path: 'packages/arena-product-presentation-three/src/arena-v2-collection-progress-component-set-candidate-v1.ts' }),
] as const);

export const ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_COMPOSITION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  validationStatus: 'not-run' as const,
  rendererNeutral: true as const,
  pageCountAdded: 0 as const,
  primaryActionCountAdded: 0 as const,
  supportedScreens: Object.freeze(['weapon-detail', 'map-detail'] as const),
  weaponContextCount: 5 as const,
  localProductionContentIdCatalog: false as const,
  ownsProfileReads: false as const,
  ownsProfileWrites: false as const,
  ownsRewardResolution: false as const,
  ownsNextGoalSelection: false as const,
  assetBytesAdded: 0 as const,
  screenshotEvidence: 'not-run' as const,
  deviceEvidence: 'not-run' as const,
  humanEvidence: 'not-run' as const,
  referenceLedger: ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_REFERENCE_LEDGER_V1,
});
