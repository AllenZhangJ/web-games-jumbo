import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '../../rules/definition-utils.js';

export const UNLOCK_DEFINITION_SCHEMA_VERSION = 1;

export const UNLOCK_KIND = Object.freeze({
  CHARACTER: 'character',
  APPEARANCE: 'appearance',
  EQUIPMENT: 'equipment',
  MAP: 'map',
});

export const UNLOCK_PROFILE_KEY = Object.freeze({
  [UNLOCK_KIND.CHARACTER]: 'characterIds',
  [UNLOCK_KIND.APPEARANCE]: 'appearanceIds',
  [UNLOCK_KIND.EQUIPMENT]: 'equipmentIds',
  [UNLOCK_KIND.MAP]: 'mapIds',
});

const KEYS = new Set([
  'schemaVersion',
  'id',
  'contentVersion',
  'kind',
  'contentId',
  'requiredExperience',
  'prerequisiteIds',
]);

export class UnlockDefinition {
  constructor(value) {
    const source = cloneFrozenData(value, 'UnlockDefinition');
    assertKnownKeys(source, KEYS, 'UnlockDefinition');
    if (source.schemaVersion !== UNLOCK_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(`不支持 UnlockDefinition schema ${String(source.schemaVersion)}。`);
    }
    if (!Object.values(UNLOCK_KIND).includes(source.kind)) {
      throw new RangeError('UnlockDefinition.kind 不受支持。');
    }
    Object.defineProperties(this, {
      schemaVersion: { value: UNLOCK_DEFINITION_SCHEMA_VERSION, enumerable: true },
      id: { value: assertNonEmptyString(source.id, 'UnlockDefinition.id'), enumerable: true },
      contentVersion: {
        value: assertIntegerAtLeast(source.contentVersion, 1, 'UnlockDefinition.contentVersion'),
        enumerable: true,
      },
      kind: { value: source.kind, enumerable: true },
      contentId: {
        value: assertNonEmptyString(source.contentId, 'UnlockDefinition.contentId'),
        enumerable: true,
      },
      requiredExperience: {
        value: assertIntegerAtLeast(
          source.requiredExperience,
          0,
          'UnlockDefinition.requiredExperience',
        ),
        enumerable: true,
      },
      prerequisiteIds: {
        value: cloneFrozenStringSet(source.prerequisiteIds, 'UnlockDefinition.prerequisiteIds'),
        enumerable: true,
      },
    });
    if (this.prerequisiteIds.includes(this.id)) {
      throw new RangeError('UnlockDefinition 不能依赖自身。');
    }
    Object.freeze(this);
  }
}

export function createUnlockDefinition(value) {
  return value instanceof UnlockDefinition ? value : new UnlockDefinition(value);
}
