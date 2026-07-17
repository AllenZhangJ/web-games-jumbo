import {
  assertKnownKeys,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '../../rules/definition-utils.js';
import { MATCH_CONTENT_KIND } from './content-replacement-definition.js';

const CATALOG_KEYS = new Set(['characterIds', 'equipmentIds', 'mapIds']);

const KEY_BY_KIND = Object.freeze({
  [MATCH_CONTENT_KIND.CHARACTER]: 'characterIds',
  [MATCH_CONTENT_KIND.EQUIPMENT]: 'equipmentIds',
  [MATCH_CONTENT_KIND.MAP]: 'mapIds',
});

export class MatchContentCatalog {
  #ids;

  constructor(value) {
    const source = cloneFrozenData(value, 'MatchContentCatalog');
    assertKnownKeys(source, CATALOG_KEYS, 'MatchContentCatalog');
    this.#ids = Object.freeze(Object.fromEntries([...CATALOG_KEYS].map((key) => [
      key,
      cloneFrozenStringSet(source[key], `MatchContentCatalog.${key}`),
    ])));
    for (const key of ['characterIds', 'mapIds']) {
      if (this.#ids[key].length === 0) throw new RangeError(`MatchContentCatalog.${key} 不能为空。`);
    }
    Object.freeze(this);
  }

  has(kind, id) {
    const key = KEY_BY_KIND[kind];
    if (!key) throw new RangeError(`MatchContentCatalog 不支持 kind ${String(kind)}。`);
    return this.#ids[key].includes(id);
  }

  list(kind) {
    const key = KEY_BY_KIND[kind];
    if (!key) throw new RangeError(`MatchContentCatalog 不支持 kind ${String(kind)}。`);
    return this.#ids[key];
  }

  toJSON() {
    return this.#ids;
  }
}

export function createMatchContentCatalog(value) {
  return value instanceof MatchContentCatalog ? value : new MatchContentCatalog(value);
}
