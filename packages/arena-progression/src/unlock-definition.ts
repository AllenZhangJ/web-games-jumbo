import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';

export const UNLOCK_DEFINITION_SCHEMA_VERSION = 1;
export const UNLOCK_KIND = Object.freeze({
  CHARACTER: 'character',
  APPEARANCE: 'appearance',
  EQUIPMENT: 'equipment',
  MAP: 'map',
} as const);
export type UnlockKind = typeof UNLOCK_KIND[keyof typeof UNLOCK_KIND];

export const UNLOCK_PROFILE_KEY = Object.freeze({
  [UNLOCK_KIND.CHARACTER]: 'characterIds',
  [UNLOCK_KIND.APPEARANCE]: 'appearanceIds',
  [UNLOCK_KIND.EQUIPMENT]: 'equipmentIds',
  [UNLOCK_KIND.MAP]: 'mapIds',
} as const);
export type UnlockProfileKey = typeof UNLOCK_PROFILE_KEY[UnlockKind];

export interface UnlockDefinitionValue {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly contentVersion: number;
  readonly kind: UnlockKind;
  readonly contentId: string;
  readonly requiredExperience: number;
  readonly prerequisiteIds: readonly string[];
}

const KEYS = new Set([
  'schemaVersion', 'id', 'contentVersion', 'kind', 'contentId',
  'requiredExperience', 'prerequisiteIds',
]);
const KNOWN_KINDS: ReadonlySet<unknown> = new Set(Object.values(UNLOCK_KIND));

export class UnlockDefinition implements UnlockDefinitionValue {
  declare readonly schemaVersion: 1;
  declare readonly id: string;
  declare readonly contentVersion: number;
  declare readonly kind: UnlockKind;
  declare readonly contentId: string;
  declare readonly requiredExperience: number;
  declare readonly prerequisiteIds: readonly string[];

  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'UnlockDefinition');
    assertKnownKeys(source, KEYS, 'UnlockDefinition');
    if (source.schemaVersion !== UNLOCK_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(`不支持 UnlockDefinition schema ${String(source.schemaVersion)}。`);
    }
    if (!KNOWN_KINDS.has(source.kind)) throw new RangeError('UnlockDefinition.kind 不受支持。');
    Object.defineProperties(this, {
      schemaVersion: { value: UNLOCK_DEFINITION_SCHEMA_VERSION, enumerable: true },
      id: { value: assertNonEmptyString(source.id, 'UnlockDefinition.id'), enumerable: true },
      contentVersion: {
        value: assertIntegerAtLeast(source.contentVersion, 1, 'UnlockDefinition.contentVersion'),
        enumerable: true,
      },
      kind: { value: source.kind, enumerable: true },
      contentId: { value: assertNonEmptyString(source.contentId, 'UnlockDefinition.contentId'), enumerable: true },
      requiredExperience: {
        value: assertIntegerAtLeast(source.requiredExperience, 0, 'UnlockDefinition.requiredExperience'),
        enumerable: true,
      },
      prerequisiteIds: {
        value: cloneFrozenStringSet(
          source.prerequisiteIds as readonly unknown[] | undefined,
          'UnlockDefinition.prerequisiteIds',
        ),
        enumerable: true,
      },
    });
    if (this.prerequisiteIds.includes(this.id)) {
      throw new RangeError('UnlockDefinition 不能依赖自身。');
    }
    Object.freeze(this);
  }
}

export function createUnlockDefinition(value: unknown): UnlockDefinition {
  if (value instanceof UnlockDefinition && Object.getPrototypeOf(value) === UnlockDefinition.prototype) {
    return value;
  }
  return new UnlockDefinition(value);
}
