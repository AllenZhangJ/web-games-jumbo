import { createProductScreenDefinition } from './product-screen-definition.js';

function compareIds(left, right) {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export class ProductScreenRegistry {
  #definitions;
  #byId;
  #byState;

  constructor(definitionValues) {
    if (!Array.isArray(definitionValues) || definitionValues.length === 0) {
      throw new RangeError('ProductScreenRegistry definitions 必须是非空数组。');
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
        throw new TypeError('ProductScreenRegistry definitions 不能包含空槽或访问器。');
      }
      definitions.push(createProductScreenDefinition(descriptor.value));
    }
    if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
      throw new TypeError('ProductScreenRegistry definitions 不能包含额外字段。');
    }
    definitions.sort(compareIds);
    this.#byId = new Map();
    this.#byState = new Map();
    for (const definition of definitions) {
      if (this.#byId.has(definition.id)) {
        throw new RangeError(`ProductScreenRegistry 重复 id ${definition.id}。`);
      }
      if (this.#byState.has(definition.activeState)) {
        throw new RangeError(
          `ProductScreenRegistry 重复 activeState ${definition.activeState}。`,
        );
      }
      this.#byId.set(definition.id, definition);
      this.#byState.set(definition.activeState, definition);
    }
    this.#definitions = Object.freeze(definitions);
    Object.freeze(this);
  }

  get(id) {
    return this.#byId.get(id) ?? null;
  }

  require(id) {
    const definition = this.get(id);
    if (!definition) throw new RangeError(`未知 ProductScreenDefinition ${String(id)}。`);
    return definition;
  }

  getForState(activeState) {
    return this.#byState.get(activeState) ?? null;
  }

  requireForState(activeState) {
    const definition = this.getForState(activeState);
    if (!definition) {
      throw new RangeError(`ProductSession state ${String(activeState)} 缺少 ScreenDefinition。`);
    }
    return definition;
  }

  list() {
    return this.#definitions;
  }
}

export function assertProductScreenRegistry(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('ProductScreenRegistry 必须是对象。');
  }
  for (const method of ['require', 'requireForState', 'list']) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`ProductScreenRegistry 缺少 ${method}()。`);
    }
  }
  return value;
}
