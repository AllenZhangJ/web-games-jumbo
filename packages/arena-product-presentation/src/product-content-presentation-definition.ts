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
  HIGHER_IS_RISK: 'higher-is-risk',
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

export interface ProductContentActionContextJson {
  readonly id: string;
  readonly labelMessageId: string;
  readonly summaryMessageId: string;
  readonly stats: readonly ProductContentStatJson[];
}

export interface ProductContentOverviewJson {
  readonly roleMessageId: string;
  readonly descriptionMessageId: string;
  readonly coreVerbMessageId: string;
  readonly tradeoffMessageId: string;
  readonly counterplayMessageId: string;
  readonly stats: readonly ProductContentStatJson[];
  readonly contexts: readonly ProductContentActionContextJson[];
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
const OVERVIEW_KEYS = new Set([
  'roleMessageId', 'descriptionMessageId', 'coreVerbMessageId',
  'tradeoffMessageId', 'counterplayMessageId', 'stats', 'contexts',
]);
const CONTEXT_KEYS = new Set(['id', 'labelMessageId', 'summaryMessageId', 'stats']);
const STAT_DIRECTIONS: ReadonlySet<unknown> = new Set(
  Object.values(PRODUCT_CONTENT_STAT_DIRECTION),
);

function finiteNumber(value: unknown, name: string, minimum: number): number {
  if (!Number.isFinite(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的有限数。`);
  }
  return value as number;
}

function statValue(value: unknown, name: string, ids: Set<string>): ProductContentStat {
  const stat = assertPlainRecord(value, name);
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
  if (!Array.isArray(source.contexts) || source.contexts.length === 0) {
    throw new RangeError(
      'ProductContentPresentationDefinition.overview.contexts 必须是非空数组。',
    );
  }
  const statIds = new Set<string>();
  const stats = source.stats.map((value, index) => statValue(
    value,
    `ProductContentPresentationDefinition.overview.stats[${index}]`,
    statIds,
  ));
  const contextIds = new Set<string>();
  const contexts = source.contexts.map((contextValue, index) => {
    const name = `ProductContentPresentationDefinition.overview.contexts[${index}]`;
    const context = assertPlainRecord(contextValue, name);
    assertKnownKeys(context, CONTEXT_KEYS, name);
    const id = assertNonEmptyString(context.id, `${name}.id`);
    if (contextIds.has(id)) throw new RangeError(`武器概览不能包含重复上下文 ${id}。`);
    contextIds.add(id);
    if (!Array.isArray(context.stats) || context.stats.length === 0) {
      throw new RangeError(`${name}.stats 必须是非空数组。`);
    }
    const contextStatIds = new Set<string>();
    return Object.freeze({
      id,
      labelMessageId: assertNonEmptyString(context.labelMessageId, `${name}.labelMessageId`),
      summaryMessageId: assertNonEmptyString(
        context.summaryMessageId,
        `${name}.summaryMessageId`,
      ),
      stats: Object.freeze(context.stats.map((value, statIndex) => statValue(
        value,
        `${name}.stats[${statIndex}]`,
        contextStatIds,
      ))),
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
    coreVerbMessageId: assertNonEmptyString(
      source.coreVerbMessageId,
      'ProductContentPresentationDefinition.overview.coreVerbMessageId',
    ),
    tradeoffMessageId: assertNonEmptyString(
      source.tradeoffMessageId,
      'ProductContentPresentationDefinition.overview.tradeoffMessageId',
    ),
    counterplayMessageId: assertNonEmptyString(
      source.counterplayMessageId,
      'ProductContentPresentationDefinition.overview.counterplayMessageId',
    ),
    stats: Object.freeze(stats),
    contexts: Object.freeze(contexts),
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
