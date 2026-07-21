import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V1_PRODUCT_SESSION_TRANSITIONS,
  createProductSessionTransitionDefinition,
  type ProductSessionEvent,
  type ProductSessionState,
  type ProductSessionTransitionDefinition,
} from './product-session-transition-definition.js';

function transitionKey(eventId: ProductSessionEvent, fromState: ProductSessionState): string {
  return `${eventId}\u0000${fromState}`;
}

export class ProductSessionTransitionRegistry {
  readonly #definitions: readonly ProductSessionTransitionDefinition[];
  readonly #byEventAndState: ReadonlyMap<string, ProductSessionTransitionDefinition>;

  constructor(definitions: unknown = ARENA_V1_PRODUCT_SESSION_TRANSITIONS) {
    const source = cloneFrozenData(definitions, 'ProductSessionTransitionRegistry definitions');
    if (!Array.isArray(source) || source.length === 0) {
      throw new TypeError('ProductSessionTransitionRegistry 需要非空 Definition 数组。');
    }
    const copies = source.map(createProductSessionTransitionDefinition);
    const byEventAndState = new Map<string, ProductSessionTransitionDefinition>();
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

  resolve(eventId: unknown, fromState: unknown): ProductSessionTransitionDefinition | null {
    if (typeof eventId !== 'string' || typeof fromState !== 'string') return null;
    return this.#byEventAndState.get(transitionKey(
      eventId as ProductSessionEvent,
      fromState as ProductSessionState,
    )) ?? null;
  }

  getDefinitions(): readonly ProductSessionTransitionDefinition[] {
    return cloneFrozenData(
      this.#definitions,
      'ProductSessionTransitionRegistry definitions',
    );
  }
}

export function createProductSessionTransitionRegistry(
  value: unknown = null,
): ProductSessionTransitionRegistry {
  if (
    value instanceof ProductSessionTransitionRegistry
    && Object.getPrototypeOf(value) === ProductSessionTransitionRegistry.prototype
  ) return value;
  return new ProductSessionTransitionRegistry(value ?? ARENA_V1_PRODUCT_SESSION_TRANSITIONS);
}
