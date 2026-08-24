import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_INFORMATION_SHARED_LAYOUT_V1,
  ArenaV2InformationScreenRegistryV1,
} from './arena-v2-information-screen-registry-v1.js';
import type {
  ArenaV2InformationScreenIdV1,
  ArenaV2InformationScreenTemplateV1,
  ArenaV2InformationUiIntentV1,
} from './arena-v2-information-screen-definition-v1.js';

export const ARENA_V2_INFORMATION_SCREEN_VIEW_MODEL_V1_SCHEMA_VERSION = 1 as const;

export const ARENA_V2_INFORMATION_SCREEN_STATE_V1 = Object.freeze({
  LOADING: 'loading',
  READY: 'ready',
  EMPTY: 'empty',
  ERROR: 'error',
} as const);

export type ArenaV2InformationScreenStateV1 = typeof ARENA_V2_INFORMATION_SCREEN_STATE_V1[
  keyof typeof ARENA_V2_INFORMATION_SCREEN_STATE_V1
];

export interface ArenaV2InformationFieldValueV1 {
  readonly fieldId: string;
  readonly labelMessageId: string;
  readonly valueText: string;
  readonly accessibilityText: string;
  readonly fixedWidthNumeric: boolean;
}

export interface ArenaV2InformationScreenViewModelV1 {
  readonly schemaVersion: typeof ARENA_V2_INFORMATION_SCREEN_VIEW_MODEL_V1_SCHEMA_VERSION;
  readonly revision: number;
  readonly screenId: ArenaV2InformationScreenIdV1;
  readonly template: ArenaV2InformationScreenTemplateV1;
  readonly state: ArenaV2InformationScreenStateV1;
  readonly questionMessageId: string;
  readonly firstViewItems: readonly ArenaV2InformationFieldValueV1[];
  readonly deferredItems: readonly ArenaV2InformationFieldValueV1[];
  readonly primaryAction: Readonly<{
    readonly intentId: ArenaV2InformationUiIntentV1;
    readonly labelMessageId: string;
    readonly enabled: boolean;
    readonly disabledReasonMessageId: string | null;
    readonly minimumTouchTargetCssPixels: 48;
  }>;
  readonly navigationTargetIds: readonly ArenaV2InformationScreenIdV1[];
  readonly bottomNavigationVisible: boolean;
  readonly announcementMessageId: string;
  readonly layout: typeof ARENA_V2_INFORMATION_SHARED_LAYOUT_V1;
}

const INPUT_KEYS = new Set([
  'revision', 'screenId', 'state', 'fieldValues', 'primaryActionEnabled',
  'primaryActionDisabledReasonMessageId',
]);
const FIELD_KEYS = new Set([
  'fieldId', 'labelMessageId', 'valueText', 'accessibilityText', 'fixedWidthNumeric',
]);
const SCREEN_STATES: ReadonlySet<unknown> = new Set(
  Object.values(ARENA_V2_INFORMATION_SCREEN_STATE_V1),
);

function cloneFieldValues(value: unknown): readonly ArenaV2InformationFieldValueV1[] {
  if (!Array.isArray(value)) throw new TypeError('Arena V2页面fieldValues必须是数组。');
  const fieldIds = new Set<string>();
  return Object.freeze(value.map((entry, index) => {
    const name = `ArenaV2InformationScreenViewModelInput.fieldValues[${index}]`;
    assertKnownKeys(entry, FIELD_KEYS, name);
    const fieldId = assertNonEmptyString(entry.fieldId, `${name}.fieldId`);
    if (fieldIds.has(fieldId)) throw new RangeError(`Arena V2页面字段${fieldId}重复。`);
    fieldIds.add(fieldId);
    if (typeof entry.fixedWidthNumeric !== 'boolean') {
      throw new TypeError(`${name}.fixedWidthNumeric必须是布尔值。`);
    }
    return Object.freeze({
      fieldId,
      labelMessageId: assertNonEmptyString(entry.labelMessageId, `${name}.labelMessageId`),
      valueText: assertNonEmptyString(entry.valueText, `${name}.valueText`),
      accessibilityText: assertNonEmptyString(
        entry.accessibilityText,
        `${name}.accessibilityText`,
      ),
      fixedWidthNumeric: entry.fixedWidthNumeric,
    });
  }));
}

function requireExactFields(
  expectedIds: readonly string[],
  fieldValues: readonly ArenaV2InformationFieldValueV1[],
): ReadonlyMap<string, ArenaV2InformationFieldValueV1> {
  const valuesById = new Map(fieldValues.map((value) => [value.fieldId, value]));
  const expected = new Set(expectedIds);
  const missing = expectedIds.filter((id) => !valuesById.has(id));
  const extra = fieldValues.filter(({ fieldId }) => !expected.has(fieldId)).map(({ fieldId }) => fieldId);
  if (missing.length > 0 || extra.length > 0) {
    throw new RangeError(
      `Arena V2页面字段不闭合；missing=${missing.join(',') || '-'} extra=${extra.join(',') || '-'}。`,
    );
  }
  return valuesById;
}

export function projectArenaV2InformationScreenViewModelV1(
  registry: ArenaV2InformationScreenRegistryV1,
  value: unknown,
): ArenaV2InformationScreenViewModelV1 {
  if (!(registry instanceof ArenaV2InformationScreenRegistryV1)) {
    throw new TypeError('Arena V2页面ViewModel需要受支持的ScreenRegistry。');
  }
  const source = cloneFrozenData(value, 'ArenaV2InformationScreenViewModelInput');
  assertKnownKeys(source, INPUT_KEYS, 'ArenaV2InformationScreenViewModelInput');
  const definition = registry.require(source.screenId as ArenaV2InformationScreenIdV1);
  if (!SCREEN_STATES.has(source.state)) {
    throw new RangeError(`Arena V2页面state不受支持：${String(source.state)}。`);
  }
  if (typeof source.primaryActionEnabled !== 'boolean') {
    throw new TypeError('Arena V2页面primaryActionEnabled必须是布尔值。');
  }
  const disabledReasonMessageId = source.primaryActionDisabledReasonMessageId === null
    ? null
    : assertNonEmptyString(
      source.primaryActionDisabledReasonMessageId,
      'ArenaV2InformationScreenViewModelInput.primaryActionDisabledReasonMessageId',
    );
  if (source.primaryActionEnabled && disabledReasonMessageId !== null) {
    throw new RangeError('Arena V2页面主动作可用时不能携带禁用原因。');
  }
  if (!source.primaryActionEnabled && disabledReasonMessageId === null) {
    throw new RangeError('Arena V2页面主动作禁用时必须提供原因。');
  }
  const fieldValues = cloneFieldValues(source.fieldValues);
  const expectedIds = [...definition.firstViewFieldIds, ...definition.deferredFieldIds];
  const valuesById = requireExactFields(expectedIds, fieldValues);
  const viewModel = {
    schemaVersion: ARENA_V2_INFORMATION_SCREEN_VIEW_MODEL_V1_SCHEMA_VERSION,
    revision: assertIntegerAtLeast(source.revision, 0, 'ArenaV2InformationScreenViewModelInput.revision'),
    screenId: definition.id,
    template: definition.template,
    state: source.state as ArenaV2InformationScreenStateV1,
    questionMessageId: definition.questionMessageId,
    firstViewItems: Object.freeze(definition.firstViewFieldIds.map((id) => valuesById.get(id)!)),
    deferredItems: Object.freeze(definition.deferredFieldIds.map((id) => valuesById.get(id)!)),
    primaryAction: Object.freeze({
      intentId: definition.primaryAction.intentId,
      labelMessageId: definition.primaryAction.labelMessageId,
      enabled: source.primaryActionEnabled,
      disabledReasonMessageId,
      minimumTouchTargetCssPixels: 48 as const,
    }),
    navigationTargetIds: definition.navigationTargetIds,
    bottomNavigationVisible: definition.bottomNavigationVisible,
    announcementMessageId: definition.announcementMessageId,
    layout: ARENA_V2_INFORMATION_SHARED_LAYOUT_V1,
  } satisfies ArenaV2InformationScreenViewModelV1;
  return Object.freeze(viewModel);
}
