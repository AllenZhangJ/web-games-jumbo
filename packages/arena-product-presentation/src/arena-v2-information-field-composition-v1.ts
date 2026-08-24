import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2InformationScreenIdV1,
} from './arena-v2-information-screen-definition-v1.js';
import {
  ArenaV2InformationScreenRegistryV1,
} from './arena-v2-information-screen-registry-v1.js';
import {
  projectArenaV2InformationScreenViewModelV1,
  type ArenaV2InformationFieldValueV1,
  type ArenaV2InformationScreenStateV1,
  type ArenaV2InformationScreenViewModelV1,
} from './arena-v2-information-screen-view-model-v1.js';

export interface ArenaV2InformationFieldSourceV1 {
  readonly ownerId: string;
  readonly fieldValues: readonly ArenaV2InformationFieldValueV1[];
}

export interface ArenaV2InformationFieldCompositionInputV1 {
  readonly revision: number;
  readonly screenId: ArenaV2InformationScreenIdV1;
  readonly state: ArenaV2InformationScreenStateV1;
  readonly fieldSources: readonly ArenaV2InformationFieldSourceV1[];
  readonly primaryActionEnabled: boolean;
  readonly primaryActionDisabledReasonMessageId: string | null;
}

const INPUT_KEYS = new Set([
  'revision', 'screenId', 'state', 'fieldSources', 'primaryActionEnabled',
  'primaryActionDisabledReasonMessageId',
]);
const SOURCE_KEYS = new Set(['ownerId', 'fieldValues']);

function exact(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

/**
 * Explicitly combines fields owned by content, profile and result projections.
 * It assigns no priority: duplicate ownership is always an integration error.
 */
export function composeArenaV2InformationScreenViewModelV1(
  registry: ArenaV2InformationScreenRegistryV1,
  value: unknown,
): ArenaV2InformationScreenViewModelV1 {
  if (!(registry instanceof ArenaV2InformationScreenRegistryV1)) {
    throw new TypeError('Arena V2页面字段合并需要受支持的ScreenRegistry。');
  }
  const source = exact(value, INPUT_KEYS, 'ArenaV2InformationFieldCompositionV1');
  if (!Array.isArray(source.fieldSources) || source.fieldSources.length === 0) {
    throw new RangeError('Arena V2页面字段合并至少需要一个明确owner。');
  }
  const ownerIds = new Set<string>();
  const fieldOwners = new Map<string, string>();
  const fieldValues: ArenaV2InformationFieldValueV1[] = [];
  source.fieldSources.forEach((sourceValue, sourceIndex) => {
    const fieldSource = exact(
      sourceValue,
      SOURCE_KEYS,
      `ArenaV2InformationFieldCompositionV1.fieldSources[${sourceIndex}]`,
    );
    const ownerId = assertNonEmptyString(
      fieldSource.ownerId,
      `ArenaV2InformationFieldCompositionV1.fieldSources[${sourceIndex}].ownerId`,
    );
    if (ownerIds.has(ownerId)) throw new RangeError(`Arena V2页面字段owner ${ownerId}重复。`);
    ownerIds.add(ownerId);
    if (!Array.isArray(fieldSource.fieldValues) || fieldSource.fieldValues.length === 0) {
      throw new RangeError(`Arena V2页面字段owner ${ownerId}没有提供字段。`);
    }
    for (const rawField of fieldSource.fieldValues) {
      if (typeof rawField !== 'object' || rawField === null || Array.isArray(rawField)) {
        throw new TypeError(`Arena V2页面字段owner ${ownerId}提供了非对象字段。`);
      }
      const fieldId = assertNonEmptyString(
        (rawField as Readonly<Record<string, unknown>>).fieldId,
        `Arena V2页面字段owner ${ownerId}.fieldId`,
      );
      const previousOwner = fieldOwners.get(fieldId);
      if (previousOwner !== undefined) {
        throw new RangeError(
          `Arena V2页面字段${fieldId}同时由${previousOwner}和${ownerId}提供。`,
        );
      }
      fieldOwners.set(fieldId, ownerId);
      fieldValues.push(rawField as unknown as ArenaV2InformationFieldValueV1);
    }
  });
  return projectArenaV2InformationScreenViewModelV1(registry, {
    revision: assertIntegerAtLeast(source.revision, 0, 'Arena V2页面字段合并revision'),
    screenId: source.screenId,
    state: source.state,
    fieldValues,
    primaryActionEnabled: source.primaryActionEnabled,
    primaryActionDisabledReasonMessageId: source.primaryActionDisabledReasonMessageId,
  });
}

export const ARENA_V2_INFORMATION_FIELD_COMPOSITION_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  duplicateFieldPolicy: 'fail-closed' as const,
});
