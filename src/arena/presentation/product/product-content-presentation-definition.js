import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';

export const PRODUCT_CONTENT_PRESENTATION_DEFINITION_SCHEMA_VERSION = 1;

export const PRODUCT_CONTENT_KIND = Object.freeze({
  CHARACTER: 'character',
  APPEARANCE: 'appearance',
  EQUIPMENT: 'equipment',
  MAP: 'map',
});

const KEYS = new Set([
  'schemaVersion',
  'id',
  'contentVersion',
  'contentKind',
  'contentId',
  'nameMessageId',
  'previewAssetId',
  'selectable',
]);

export class ProductContentPresentationDefinition {
  constructor(value) {
    const source = cloneFrozenData(value, 'ProductContentPresentationDefinition');
    assertKnownKeys(source, KEYS, 'ProductContentPresentationDefinition');
    if (source.schemaVersion !== PRODUCT_CONTENT_PRESENTATION_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 ProductContentPresentationDefinition schema ${String(source.schemaVersion)}。`,
      );
    }
    if (!Object.values(PRODUCT_CONTENT_KIND).includes(source.contentKind)) {
      throw new RangeError(
        `ProductContentPresentationDefinition.contentKind 不受支持：${String(source.contentKind)}。`,
      );
    }
    if (typeof source.selectable !== 'boolean') {
      throw new TypeError('ProductContentPresentationDefinition.selectable 必须是布尔值。');
    }
    if (source.selectable && source.contentKind !== PRODUCT_CONTENT_KIND.CHARACTER) {
      throw new RangeError('当前只有 character 内容可以作为角色选择项。');
    }
    Object.defineProperties(this, {
      schemaVersion: {
        value: PRODUCT_CONTENT_PRESENTATION_DEFINITION_SCHEMA_VERSION,
        enumerable: true,
      },
      id: {
        value: assertNonEmptyString(source.id, 'ProductContentPresentationDefinition.id'),
        enumerable: true,
      },
      contentVersion: {
        value: assertIntegerAtLeast(
          source.contentVersion,
          1,
          'ProductContentPresentationDefinition.contentVersion',
        ),
        enumerable: true,
      },
      contentKind: { value: source.contentKind, enumerable: true },
      contentId: {
        value: assertNonEmptyString(
          source.contentId,
          'ProductContentPresentationDefinition.contentId',
        ),
        enumerable: true,
      },
      nameMessageId: {
        value: assertNonEmptyString(
          source.nameMessageId,
          'ProductContentPresentationDefinition.nameMessageId',
        ),
        enumerable: true,
      },
      previewAssetId: {
        value: assertNonEmptyString(
          source.previewAssetId,
          'ProductContentPresentationDefinition.previewAssetId',
        ),
        enumerable: true,
      },
      selectable: { value: source.selectable, enumerable: true },
    });
    Object.freeze(this);
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      contentVersion: this.contentVersion,
      contentKind: this.contentKind,
      contentId: this.contentId,
      nameMessageId: this.nameMessageId,
      previewAssetId: this.previewAssetId,
      selectable: this.selectable,
    };
  }

  getContentHash() {
    return createDeterministicDataHash(
      this.toJSON(),
      `ProductContentPresentationDefinition ${this.id}`,
    );
  }
}

export function createProductContentPresentationDefinition(value) {
  return value instanceof ProductContentPresentationDefinition
    ? value
    : new ProductContentPresentationDefinition(value);
}
