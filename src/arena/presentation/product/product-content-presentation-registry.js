import {
  PRODUCT_CONTENT_KIND,
  createProductContentPresentationDefinition,
} from './product-content-presentation-definition.js';

function contentKey(kind, contentId) {
  return `${kind}:${contentId}`;
}

function compareIds(left, right) {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export class ProductContentPresentationRegistry {
  #definitions;
  #byId;
  #byContent;

  constructor(definitionValues) {
    if (!Array.isArray(definitionValues) || definitionValues.length === 0) {
      throw new RangeError(
        'ProductContentPresentationRegistry definitions 必须是非空数组。',
      );
    }
    const keys = Reflect.ownKeys(definitionValues);
    const expectedKeys = new Set(['length']);
    const definitions = [];
    for (let index = 0; index < definitionValues.length; index += 1) {
      expectedKeys.add(String(index));
      const descriptor = Object.getOwnPropertyDescriptor(definitionValues, String(index));
      if (
        !descriptor
        || !descriptor.enumerable
        || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
      ) {
        throw new TypeError(
          'ProductContentPresentationRegistry definitions 不能包含空槽或访问器。',
        );
      }
      definitions.push(createProductContentPresentationDefinition(descriptor.value));
    }
    if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
      throw new TypeError(
        'ProductContentPresentationRegistry definitions 不能包含额外字段。',
      );
    }
    definitions.sort(compareIds);
    this.#byId = new Map();
    this.#byContent = new Map();
    for (const definition of definitions) {
      if (this.#byId.has(definition.id)) {
        throw new RangeError(
          `ProductContentPresentationRegistry 重复 id ${definition.id}。`,
        );
      }
      const key = contentKey(definition.contentKind, definition.contentId);
      if (this.#byContent.has(key)) {
        throw new RangeError(`ProductContentPresentationRegistry 重复内容 ${key}。`);
      }
      this.#byId.set(definition.id, definition);
      this.#byContent.set(key, definition);
    }
    this.#definitions = Object.freeze(definitions);
    Object.freeze(this);
  }

  require(id) {
    const definition = this.#byId.get(id);
    if (!definition) {
      throw new RangeError(`未知 ProductContentPresentationDefinition ${String(id)}。`);
    }
    return definition;
  }

  requireContent(kind, contentId) {
    const definition = this.#byContent.get(contentKey(kind, contentId));
    if (!definition) {
      throw new RangeError(`产品内容 ${kind}:${String(contentId)} 缺少表现定义。`);
    }
    return definition;
  }

  list() {
    return this.#definitions;
  }

  listSelectableCharacters() {
    return Object.freeze(this.#definitions.filter((definition) => (
      definition.contentKind === PRODUCT_CONTENT_KIND.CHARACTER
      && definition.selectable
    )));
  }
}

export function assertProductContentPresentationRegistry(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('ProductContentPresentationRegistry 必须是对象。');
  }
  for (const method of ['requireContent', 'list', 'listSelectableCharacters']) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`ProductContentPresentationRegistry 缺少 ${method}()。`);
    }
  }
  return value;
}
