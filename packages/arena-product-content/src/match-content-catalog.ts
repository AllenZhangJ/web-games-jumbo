import {
  assertKnownKeys,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';
import {
  MATCH_CONTENT_KIND,
  type MatchContentKind,
} from './content-replacement-definition.js';

export interface MatchContentCatalogData {
  readonly characterIds: readonly string[];
  readonly equipmentIds: readonly string[];
  readonly mapIds: readonly string[];
}

type CatalogKey = keyof MatchContentCatalogData;

const CATALOG_KEYS = new Set<CatalogKey>(['characterIds', 'equipmentIds', 'mapIds']);
const KEY_BY_KIND: Readonly<Record<MatchContentKind, CatalogKey>> = Object.freeze({
  [MATCH_CONTENT_KIND.CHARACTER]: 'characterIds',
  [MATCH_CONTENT_KIND.EQUIPMENT]: 'equipmentIds',
  [MATCH_CONTENT_KIND.MAP]: 'mapIds',
});

function catalogKey(kind: unknown): CatalogKey {
  const key = KEY_BY_KIND[kind as MatchContentKind];
  if (!key) throw new RangeError(`MatchContentCatalog 不支持 kind ${String(kind)}。`);
  return key;
}

export class MatchContentCatalog {
  readonly #ids: MatchContentCatalogData;

  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'MatchContentCatalog');
    assertKnownKeys(source, CATALOG_KEYS, 'MatchContentCatalog');
    this.#ids = Object.freeze({
      characterIds: cloneFrozenStringSet(
        source.characterIds as readonly unknown[] | undefined,
        'MatchContentCatalog.characterIds',
      ),
      equipmentIds: cloneFrozenStringSet(
        source.equipmentIds as readonly unknown[] | undefined,
        'MatchContentCatalog.equipmentIds',
      ),
      mapIds: cloneFrozenStringSet(
        source.mapIds as readonly unknown[] | undefined,
        'MatchContentCatalog.mapIds',
      ),
    });
    for (const key of ['characterIds', 'mapIds'] as const) {
      if (this.#ids[key].length === 0) {
        throw new RangeError(`MatchContentCatalog.${key} 不能为空。`);
      }
    }
    Object.freeze(this);
  }

  has(kind: unknown, id: unknown): boolean {
    if (typeof id !== 'string') return false;
    return this.#ids[catalogKey(kind)].includes(id);
  }

  list(kind: unknown): readonly string[] {
    return this.#ids[catalogKey(kind)];
  }

  toJSON(): MatchContentCatalogData {
    return this.#ids;
  }
}

export function createMatchContentCatalog(value: unknown): MatchContentCatalog {
  return value instanceof MatchContentCatalog ? value : new MatchContentCatalog(value);
}
