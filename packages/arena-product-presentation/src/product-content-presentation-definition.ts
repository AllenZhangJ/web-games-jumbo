import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
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

export const PRODUCT_CONTENT_STAT_DIRECTION = Object.freeze({
  HIGHER_IS_BETTER: 'higher-is-better',
  LOWER_IS_BETTER: 'lower-is-better',
} as const);

export type ProductContentStatDirection = typeof PRODUCT_CONTENT_STAT_DIRECTION[
  keyof typeof PRODUCT_CONTENT_STAT_DIRECTION
];

export interface ProductContentStatJson {
  readonly id: string;
  readonly labelMessageId: string;
  readonly value: number;
  readonly maxValue: number;
  readonly unit: string;
  readonly direction: ProductContentStatDirection;
  readonly precision: number;
}

export interface ProductContentOverviewJson {
  readonly roleMessageId: string;
  readonly descriptionMessageId: string;
  readonly stats: readonly ProductContentStatJson[];
}

export interface ProductContentPresentationDefinitionJson {
  readonly schemaVersion: typeof PRODUCT_CONTENT_PRESENTATION_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly contentKind: ProductContentKind;
  readonly contentId: string;
  readonly nameMessageId: string;
  readonly previewAssetId: string;
  readonly selectable: boolean;
  readonly overview?: ProductContentOverviewJson | null;
}

export type ProductContentStat = ProductContentStatJson;
export type ProductContentOverview = ProductContentOverviewJson;

const KEYS = new Set([
  'schemaVersion', 'id', 'contentVersion', 'contentKind', 'contentId',
  'nameMessageId', 'previewAssetId', 'selectable',
  'overview',
]);
const CONTENT_KINDS: ReadonlySet<unknown> = new Set(Object.values(PRODUCT_CONTENT_KIND));
const STAT_KEYS = new Set([
  'id', 'labelMessageId', 'value', 'maxValue', 'unit', 'direction', 'precision',
]);
const OVERVIEW_KEYS = new Set(['roleMessageId', 'descriptionMessageId', 'stats']);
const STAT_DIRECTIONS: ReadonlySet<unknown> = new Set(
  Object.values(PRODUCT_CONTENT_STAT_DIRECTION),
);

function finiteNumber(value: unknown, name: string, minimum: number): number {
  if (!Number.isFinite(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的有限数。`);
  }
  return value as number;
}

function overviewValue(value: unknown, contentKind: ProductContentKind): ProductContentOverview | null {
  if (value === undefined || value === null) return null;
  if (contentKind !== PRODUCT_CONTENT_KIND.EQUIPMENT) {
    throw new RangeError('只有 equipment 内容可以声明 overview。');
  }
  const source = assertPlainRecord(value, 'ProductContentPresentationDefinition.overview');
  assertKnownKeys(source, OVERVIEW_KEYS, 'ProductContentPresentationDefinition.overview');
  if (!Array.isArray(source.stats) || source.stats.length === 0) {
    throw new RangeError('ProductContentPresentationDefinition.overview.stats 必须是非空数组。');
  }
  const ids = new Set<string>();
  const stats = source.stats.map((statValue, index) => {
    const name = `ProductContentPresentationDefinition.overview.stats[${index}]`;
    const stat = assertPlainRecord(statValue, name);
    assertKnownKeys(stat, STAT_KEYS, name);
    const id = assertNonEmptyString(stat.id, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`武器概览不能包含重复数值 ${id}。`);
    ids.add(id);
    const valueNumber = finiteNumber(stat.value, `${name}.value`, 0);
    const maxValue = finiteNumber(stat.maxValue, `${name}.maxValue`, 0);
    if (maxValue <= 0 || valueNumber > maxValue) {
      throw new RangeError(`${name}.maxValue 必须大于 value 且为有限正数。`);
    }
    if (!STAT_DIRECTIONS.has(stat.direction)) {
      throw new RangeError(`${name}.direction 不受支持：${String(stat.direction)}。`);
    }
    return Object.freeze({
      id,
      labelMessageId: assertNonEmptyString(stat.labelMessageId, `${name}.labelMessageId`),
      value: valueNumber,
      maxValue,
      unit: assertNonEmptyString(stat.unit, `${name}.unit`),
      direction: stat.direction as ProductContentStatDirection,
      precision: assertIntegerAtLeast(stat.precision, 0, `${name}.precision`),
    });
  });
  return Object.freeze({
    roleMessageId: assertNonEmptyString(
      source.roleMessageId,
      'ProductContentPresentationDefinition.overview.roleMessageId',
    ),
    descriptionMessageId: assertNonEmptyString(
      source.descriptionMessageId,
      'ProductContentPresentationDefinition.overview.descriptionMessageId',
    ),
    stats: Object.freeze(stats),
  });
}

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
  readonly overview: ProductContentOverview | null;

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
    this.overview = overviewValue(source.overview, contentKind);
    Object.freeze(this);
  }

  toJSON(): ProductContentPresentationDefinitionJson {
    const value = {
      schemaVersion: this.schemaVersion,
      id: this.id,
      contentVersion: this.contentVersion,
      contentKind: this.contentKind,
      contentId: this.contentId,
      nameMessageId: this.nameMessageId,
      previewAssetId: this.previewAssetId,
      selectable: this.selectable,
    };
    return this.overview === null ? value : { ...value, overview: this.overview };
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
