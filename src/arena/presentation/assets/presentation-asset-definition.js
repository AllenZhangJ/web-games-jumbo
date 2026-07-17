import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '../../rules/definition-utils.js';

export const PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION = 1;

export const PRESENTATION_ASSET_KIND = Object.freeze({
  ATTACHMENT: 'attachment',
  CHARACTER_MODEL: 'character-model',
});

const DEFINITION_KEYS = new Set([
  'schemaVersion',
  'id',
  'kind',
  'providerId',
  'sourceKey',
  'contentVersion',
  'tags',
]);

function enumValue(value, values, name) {
  if (!Object.values(values).includes(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value;
}

export class PresentationAssetDefinition {
  constructor(value) {
    const source = cloneFrozenData(value, 'PresentationAssetDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'PresentationAssetDefinition');
    if (source.schemaVersion !== PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 PresentationAssetDefinition schema ${String(source.schemaVersion)}。`,
      );
    }
    Object.defineProperties(this, {
      schemaVersion: {
        value: PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
        enumerable: true,
      },
      id: {
        value: assertNonEmptyString(source.id, 'PresentationAssetDefinition.id'),
        enumerable: true,
      },
      kind: {
        value: enumValue(source.kind, PRESENTATION_ASSET_KIND, 'PresentationAssetDefinition.kind'),
        enumerable: true,
      },
      providerId: {
        value: assertNonEmptyString(
          source.providerId,
          'PresentationAssetDefinition.providerId',
        ),
        enumerable: true,
      },
      sourceKey: {
        value: assertNonEmptyString(
          source.sourceKey,
          'PresentationAssetDefinition.sourceKey',
        ),
        enumerable: true,
      },
      contentVersion: {
        value: assertIntegerAtLeast(
          source.contentVersion,
          1,
          'PresentationAssetDefinition.contentVersion',
        ),
        enumerable: true,
      },
      tags: {
        value: cloneFrozenStringSet(source.tags, 'PresentationAssetDefinition.tags'),
        enumerable: true,
      },
    });
    Object.freeze(this);
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      kind: this.kind,
      providerId: this.providerId,
      sourceKey: this.sourceKey,
      contentVersion: this.contentVersion,
      tags: this.tags,
    };
  }

  getContentHash() {
    return createDeterministicDataHash(this.toJSON(), `PresentationAssetDefinition ${this.id}`);
  }
}

export function createPresentationAssetDefinition(value) {
  return value instanceof PresentationAssetDefinition
    ? value
    : new PresentationAssetDefinition(value);
}
