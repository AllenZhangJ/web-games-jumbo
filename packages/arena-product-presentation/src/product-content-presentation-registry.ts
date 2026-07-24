import {
  PRODUCT_CONTENT_KIND,
  createProductContentPresentationDefinition,
  type ProductContentKind,
  type ProductContentPresentationDefinition,
} from './product-content-presentation-definition.js';

function contentKey(kind: ProductContentKind, contentId: string): string {
  return `${kind}:${contentId}`;
}

function compareIds(
  left: ProductContentPresentationDefinition,
  right: ProductContentPresentationDefinition,
): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function cloneDefinitionArray(value: unknown): ProductContentPresentationDefinition[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError('ProductContentPresentationRegistry definitions 必须是非空数组。');
  }
  const keys = Reflect.ownKeys(value);
  const expectedKeys = new Set(['length']);
  const definitions: ProductContentPresentationDefinition[] = [];
  for (let index = 0; index < value.length; index += 1) {
    expectedKeys.add(String(index));
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError('ProductContentPresentationRegistry definitions 不能包含空槽或访问器。');
    }
    definitions.push(createProductContentPresentationDefinition(descriptor.value));
  }
  if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError('ProductContentPresentationRegistry definitions 不能包含额外字段。');
  }
  return definitions;
}

export class ProductContentPresentationRegistry {
  readonly #definitions: readonly ProductContentPresentationDefinition[];
  readonly #byId: ReadonlyMap<string, ProductContentPresentationDefinition>;
  readonly #byContent: ReadonlyMap<string, ProductContentPresentationDefinition>;

  constructor(definitionValues: unknown) {
    const definitions = cloneDefinitionArray(definitionValues).sort(compareIds);
    const byId = new Map<string, ProductContentPresentationDefinition>();
    const byContent = new Map<string, ProductContentPresentationDefinition>();
    for (const definition of definitions) {
      if (byId.has(definition.id)) {
        throw new RangeError(`ProductContentPresentationRegistry 重复 id ${definition.id}。`);
      }
      const key = contentKey(definition.contentKind, definition.contentId);
      if (byContent.has(key)) {
        throw new RangeError(`ProductContentPresentationRegistry 重复内容 ${key}。`);
      }
      byId.set(definition.id, definition);
      byContent.set(key, definition);
    }
    this.#definitions = Object.freeze(definitions);
    this.#byId = byId;
    this.#byContent = byContent;
    Object.freeze(this);
  }

  require(id: unknown): ProductContentPresentationDefinition {
    const definition = typeof id === 'string' ? this.#byId.get(id) : undefined;
    if (!definition) {
      throw new RangeError(`未知 ProductContentPresentationDefinition ${String(id)}。`);
    }
    return definition;
  }

  requireContent(
    kind: ProductContentKind,
    contentId: string,
  ): ProductContentPresentationDefinition {
    const definition = this.#byContent.get(contentKey(kind, contentId));
    if (!definition) {
      throw new RangeError(`产品内容 ${kind}:${String(contentId)} 缺少表现定义。`);
    }
    return definition;
  }

  list(): readonly ProductContentPresentationDefinition[] {
    return this.#definitions;
  }

  listSelectableCharacters(): readonly ProductContentPresentationDefinition[] {
    return Object.freeze(this.#definitions.filter((definition) => (
      definition.contentKind === PRODUCT_CONTENT_KIND.CHARACTER && definition.selectable
    )));
  }
}

export function assertProductContentPresentationRegistry(
  value: unknown,
): ProductContentPresentationRegistry {
  if (!(value instanceof ProductContentPresentationRegistry)) {
    throw new TypeError('ProductContentPresentationRegistry 必须是受支持的只读 Registry 实例。');
  }
  return value;
}
