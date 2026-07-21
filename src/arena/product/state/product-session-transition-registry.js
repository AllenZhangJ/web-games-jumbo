import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V1_PRODUCT_SESSION_TRANSITIONS,
  createProductSessionTransitionDefinition,
} from './product-session-transition-definition.js';

function transitionKey(eventId, fromState) {
  return `${eventId}\u0000${fromState}`;
}

export class ProductSessionTransitionRegistry {
  #definitions;
  #byEventAndState;

  constructor(definitions = ARENA_V1_PRODUCT_SESSION_TRANSITIONS) {
    if (!Array.isArray(definitions) || definitions.length === 0) {
      throw new TypeError('ProductSessionTransitionRegistry 需要非空 Definition 数组。');
    }
    const copies = definitions.map(createProductSessionTransitionDefinition);
    const byEventAndState = new Map();
    for (const definition of copies) {
      const key = transitionKey(definition.eventId, definition.fromState);
      if (byEventAndState.has(key)) {
        throw new RangeError(
          `ProductSessionTransitionRegistry 重复转换 ${definition.eventId}/${definition.fromState}。`,
        );
      }
      byEventAndState.set(key, definition);
    }
    this.#definitions = Object.freeze(copies);
    this.#byEventAndState = byEventAndState;
    Object.freeze(this);
  }

  resolve(eventId, fromState) {
    if (typeof eventId !== 'string' || typeof fromState !== 'string') return null;
    return this.#byEventAndState.get(transitionKey(eventId, fromState)) ?? null;
  }

  getDefinitions() {
    return cloneFrozenData(this.#definitions, 'ProductSessionTransitionRegistry definitions');
  }
}

export function createProductSessionTransitionRegistry(value = null) {
  if (value instanceof ProductSessionTransitionRegistry) return value;
  return new ProductSessionTransitionRegistry(value ?? ARENA_V1_PRODUCT_SESSION_TRANSITIONS);
}
