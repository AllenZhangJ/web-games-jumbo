import { createPresentationQualityDefinition } from './presentation-quality-definition.js';

export class PresentationQualityRegistry {
  #definitions;

  constructor(values) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new RangeError('PresentationQualityRegistry definitions 不能为空。');
    }
    this.#definitions = new Map();
    for (const value of values) {
      const definition = createPresentationQualityDefinition(value);
      if (this.#definitions.has(definition.id)) {
        throw new RangeError(`重复的 PresentationQualityDefinition ${definition.id}。`);
      }
      this.#definitions.set(definition.id, definition);
    }
    Object.freeze(this);
  }

  get(id) {
    return this.#definitions.get(id) ?? null;
  }

  require(id) {
    const definition = this.get(id);
    if (!definition) throw new RangeError(`未知表现质量档位 ${String(id)}。`);
    return definition;
  }

  list() {
    return Object.freeze([...this.#definitions.values()].sort((left, right) => (
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0
    )));
  }
}

export function createPresentationQualityRegistry(values) {
  return values instanceof PresentationQualityRegistry
    ? values
    : new PresentationQualityRegistry(values);
}
