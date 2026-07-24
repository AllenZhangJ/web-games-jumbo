import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';

export const PRODUCT_CONTENT_PRESENTATION_DEFINITION_SCHEMA_VERSION = 1 as const;

export const PRODUCT_CONTENT_KIND = Object.freeze({
  CHARACTER: 'character',
  APPEARANCE: 'appearance',
  EQUIPMENT: 'equipment',
  MAP: 'map',
} as const);

export type ProductContentKind = typeof PRODUCT_CONTENT_KIND[keyof typeof PRODUCT_CONTENT_KIND];

export interface ProductContentPresentationDefinitionJson {
  readonly schemaVersion: typeof PRODUCT_CONTENT_PRESENTATION_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly contentKind: ProductContentKind;
  readonly contentId: string;
  readonly nameMessageId: string;
  readonly previewAssetId: string;
  readonly selectable: boolean;
}

const KEYS = new Set([
  'schemaVersion', 'id', 'contentVersion', 'contentKind', 'contentId',
  'nameMessageId', 'previewAssetId', 'selectable',
]);
const CONTENT_KINDS: ReadonlySet<unknown> = new Set(Object.values(PRODUCT_CONTENT_KIND));

export class ProductContentPresentationDefinition
implements ProductContentPresentationDefinitionJson {
  readonly schemaVersion = PRODUCT_CONTENT_PRESENTATION_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly contentKind: ProductContentKind;
  readonly contentId: string;
  readonly nameMessageId: string;
  readonly previewAssetId: string;
  readonly selectable: boolean;

  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'ProductContentPresentationDefinition');
    assertKnownKeys(source, KEYS, 'ProductContentPresentationDefinition');
    if (source.schemaVersion !== PRODUCT_CONTENT_PRESENTATION_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 ProductContentPresentationDefinition schema ${String(source.schemaVersion)}。`,
      );
    }
    if (!CONTENT_KINDS.has(source.contentKind)) {
      throw new RangeError(
        `ProductContentPresentationDefinition.contentKind 不受支持：${String(source.contentKind)}。`,
      );
    }
    if (typeof source.selectable !== 'boolean') {
      throw new TypeError('ProductContentPresentationDefinition.selectable 必须是布尔值。');
    }
    const contentKind = source.contentKind as ProductContentKind;
    if (source.selectable && contentKind !== PRODUCT_CONTENT_KIND.CHARACTER) {
      throw new RangeError('当前只有 character 内容可以作为角色选择项。');
    }
    this.id = assertNonEmptyString(source.id, 'ProductContentPresentationDefinition.id');
    this.contentVersion = assertIntegerAtLeast(
      source.contentVersion,
      1,
      'ProductContentPresentationDefinition.contentVersion',
    );
    this.contentKind = contentKind;
    this.contentId = assertNonEmptyString(
      source.contentId,
      'ProductContentPresentationDefinition.contentId',
    );
    this.nameMessageId = assertNonEmptyString(
      source.nameMessageId,
      'ProductContentPresentationDefinition.nameMessageId',
    );
    this.previewAssetId = assertNonEmptyString(
      source.previewAssetId,
      'ProductContentPresentationDefinition.previewAssetId',
    );
    this.selectable = source.selectable;
    Object.freeze(this);
  }

  toJSON(): ProductContentPresentationDefinitionJson {
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

  getContentHash(): string {
    return createDeterministicDataHash(
      this.toJSON(),
      `ProductContentPresentationDefinition ${this.id}`,
    );
  }
}

export function createProductContentPresentationDefinition(
  value: unknown,
): ProductContentPresentationDefinition {
  return value instanceof ProductContentPresentationDefinition
    ? value
    : new ProductContentPresentationDefinition(value);
}
