import { assertNonEmptyString } from '@number-strategy-jump/arena-contracts';
import {
  MATCH_CONTENT_KIND,
  createContentReplacementDefinition,
  type ContentReplacementDefinition,
  type MatchContentKind,
} from './content-replacement-definition.js';

function normalizeDefinitions(values: unknown): ContentReplacementDefinition[] {
  if (!Array.isArray(values)) {
    throw new TypeError('ContentReplacementRegistry definitions 必须是数组。');
  }
  const keys = Reflect.ownKeys(values);
  const expectedKeys = new Set(['length']);
  const definitions: ContentReplacementDefinition[] = [];
  for (let index = 0; index < values.length; index += 1) {
    expectedKeys.add(String(index));
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError('ContentReplacementRegistry definitions 不能包含空槽或访问器。');
    }
    definitions.push(createContentReplacementDefinition(descriptor.value));
  }
  if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError('ContentReplacementRegistry definitions 不能包含额外字段。');
  }
  return definitions.sort((left, right) => (
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  ));
}

function replacementKey(kind: MatchContentKind, contentId: string): string {
  return `${kind}:${contentId}`;
}

const KINDS: ReadonlySet<unknown> = new Set(Object.values(MATCH_CONTENT_KIND));

export class ContentReplacementRegistry {
  readonly #definitions: readonly ContentReplacementDefinition[];
  readonly #bySource: ReadonlyMap<string, ContentReplacementDefinition>;

  constructor(definitions: unknown = []) {
    const normalized = normalizeDefinitions(definitions);
    const ids = new Set<string>();
    const bySource = new Map<string, ContentReplacementDefinition>();
    for (const definition of normalized) {
      if (ids.has(definition.id)) {
        throw new RangeError(`ContentReplacementRegistry 重复 id ${definition.id}。`);
      }
      ids.add(definition.id);
      const key = replacementKey(definition.kind, definition.retiredId);
      if (bySource.has(key)) {
        throw new RangeError(`ContentReplacementRegistry 重复来源 ${key}。`);
      }
      bySource.set(key, definition);
    }
    for (const definition of normalized) {
      const visited = new Set<string>();
      let currentId = definition.retiredId;
      while (bySource.has(replacementKey(definition.kind, currentId))) {
        const key = replacementKey(definition.kind, currentId);
        if (visited.has(key)) throw new RangeError('ContentReplacementRegistry 存在替换环。');
        visited.add(key);
        const next = bySource.get(key);
        if (!next) throw new Error('ContentReplacementRegistry 内部索引不一致。');
        currentId = next.replacementId;
      }
    }
    this.#definitions = Object.freeze(normalized);
    this.#bySource = bySource;
    Object.freeze(this);
  }

  resolve(kind: unknown, retiredId: unknown): string | null {
    if (!KINDS.has(kind)) {
      throw new RangeError(`ContentReplacementRegistry 不支持 kind ${String(kind)}。`);
    }
    let currentId = assertNonEmptyString(
      retiredId,
      'ContentReplacementRegistry retiredId',
    );
    let replaced = false;
    for (;;) {
      const next = this.#bySource.get(replacementKey(kind as MatchContentKind, currentId));
      if (!next) break;
      replaced = true;
      currentId = next.replacementId;
    }
    return replaced ? currentId : null;
  }

  list(): readonly ContentReplacementDefinition[] {
    return this.#definitions;
  }
}

export function createContentReplacementRegistry(value: unknown = []): ContentReplacementRegistry {
  return value instanceof ContentReplacementRegistry
    ? value
    : new ContentReplacementRegistry(value);
}
