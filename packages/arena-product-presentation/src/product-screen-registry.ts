import {
  createProductScreenDefinition,
  type ProductScreenActiveState,
  type ProductScreenDefinition,
} from './product-screen-definition.js';

function compareIds(left: ProductScreenDefinition, right: ProductScreenDefinition): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function cloneDefinitionArray(value: unknown): ProductScreenDefinition[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError('ProductScreenRegistry definitions 必须是非空数组。');
  }
  const keys = Reflect.ownKeys(value);
  const expectedKeys = new Set(['length']);
  const definitions: ProductScreenDefinition[] = [];
  for (let index = 0; index < value.length; index += 1) {
    expectedKeys.add(String(index));
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError('ProductScreenRegistry definitions 不能包含空槽或访问器。');
    }
    definitions.push(createProductScreenDefinition(descriptor.value));
  }
  if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError('ProductScreenRegistry definitions 不能包含额外字段。');
  }
  return definitions;
}

export class ProductScreenRegistry {
  readonly #definitions: readonly ProductScreenDefinition[];
  readonly #byId: ReadonlyMap<string, ProductScreenDefinition>;
  readonly #byState: ReadonlyMap<ProductScreenActiveState, ProductScreenDefinition>;

  constructor(definitionValues: unknown) {
    const definitions = cloneDefinitionArray(definitionValues).sort(compareIds);
    const byId = new Map<string, ProductScreenDefinition>();
    const byState = new Map<ProductScreenActiveState, ProductScreenDefinition>();
    for (const definition of definitions) {
      if (byId.has(definition.id)) {
        throw new RangeError(`ProductScreenRegistry 重复 id ${definition.id}。`);
      }
      if (byState.has(definition.activeState)) {
        throw new RangeError(`ProductScreenRegistry 重复 activeState ${definition.activeState}。`);
      }
      byId.set(definition.id, definition);
      byState.set(definition.activeState, definition);
    }
    this.#definitions = Object.freeze(definitions);
    this.#byId = byId;
    this.#byState = byState;
    Object.freeze(this);
  }

  get(id: unknown): ProductScreenDefinition | null {
    return typeof id === 'string' ? this.#byId.get(id) ?? null : null;
  }

  require(id: unknown): ProductScreenDefinition {
    const definition = this.get(id);
    if (!definition) throw new RangeError(`未知 ProductScreenDefinition ${String(id)}。`);
    return definition;
  }

  getForState(activeState: unknown): ProductScreenDefinition | null {
    return typeof activeState === 'string'
      ? this.#byState.get(activeState as ProductScreenActiveState) ?? null
      : null;
  }

  requireForState(activeState: unknown): ProductScreenDefinition {
    const definition = this.getForState(activeState);
    if (!definition) {
      throw new RangeError(`ProductSession state ${String(activeState)} 缺少 ScreenDefinition。`);
    }
    return definition;
  }

  list(): readonly ProductScreenDefinition[] {
    return this.#definitions;
  }
}

export function assertProductScreenRegistry(value: unknown): ProductScreenRegistry {
  if (!(value instanceof ProductScreenRegistry)) {
    throw new TypeError('ProductScreenRegistry 必须是受支持的只读 Registry 实例。');
  }
  return value;
}
