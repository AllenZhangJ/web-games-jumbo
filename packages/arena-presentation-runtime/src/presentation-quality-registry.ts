import { assertNonEmptyString } from '@number-strategy-jump/arena-contracts';
import {
  createPresentationQualityDefinition,
  type PresentationQualityDefinition,
} from './presentation-quality-definition.js';

function normalizeDefinitions(values: unknown): PresentationQualityDefinition[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('PresentationQualityRegistry definitions 不能为空。');
  }
  const expectedKeys = new Set(['length']);
  const result: PresentationQualityDefinition[] = [];
  for (let index = 0; index < values.length; index += 1) {
    expectedKeys.add(String(index));
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError('PresentationQualityRegistry definitions 不能包含空槽或访问器。');
    }
    result.push(createPresentationQualityDefinition(descriptor.value));
  }
  if (Reflect.ownKeys(values).some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError('PresentationQualityRegistry definitions 不能包含额外字段。');
  }
  return result.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
}

export class PresentationQualityRegistry {
  readonly #definitions: readonly PresentationQualityDefinition[];
  readonly #byId: ReadonlyMap<string, PresentationQualityDefinition>;

  constructor(values: unknown) {
    const definitions = normalizeDefinitions(values);
    const byId = new Map<string, PresentationQualityDefinition>();
    for (const definition of definitions) {
      if (byId.has(definition.id)) {
        throw new RangeError(`重复的 PresentationQualityDefinition ${definition.id}。`);
      }
      byId.set(definition.id, definition);
    }
    this.#definitions = Object.freeze(definitions);
    this.#byId = byId;
    Object.freeze(this);
  }

  get(id: string): PresentationQualityDefinition | null {
    return this.#byId.get(assertNonEmptyString(id, 'PresentationQualityRegistry.id')) ?? null;
  }
  require(id: string): PresentationQualityDefinition {
    const normalizedId = assertNonEmptyString(id, 'PresentationQualityRegistry.id');
    const definition = this.#byId.get(normalizedId);
    if (!definition) throw new RangeError(`未知表现质量档位 ${normalizedId}。`);
    return definition;
  }
  list(): readonly PresentationQualityDefinition[] { return this.#definitions; }
}

export function createPresentationQualityRegistry(value: unknown): PresentationQualityRegistry {
  return value instanceof PresentationQualityRegistry ? value : new PresentationQualityRegistry(value);
}
