import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';

export const PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION = 1 as const;

export const PRESENTATION_ASSET_KIND = Object.freeze({
  ATTACHMENT: 'attachment',
  CHARACTER_MODEL: 'character-model',
} as const);

export type PresentationAssetKind =
  typeof PRESENTATION_ASSET_KIND[keyof typeof PRESENTATION_ASSET_KIND];

export interface PresentationAssetDefinitionJson {
  readonly schemaVersion: typeof PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly kind: PresentationAssetKind;
  readonly providerId: string;
  readonly sourceKey: string;
  readonly contentVersion: number;
  readonly tags: readonly string[];
}

const DEFINITION_KEYS = new Set([
  'schemaVersion', 'id', 'kind', 'providerId', 'sourceKey', 'contentVersion', 'tags',
]);
const KINDS: ReadonlySet<unknown> = new Set(Object.values(PRESENTATION_ASSET_KIND));

export class PresentationAssetDefinition implements PresentationAssetDefinitionJson {
  readonly schemaVersion = PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly kind: PresentationAssetKind;
  readonly providerId: string;
  readonly sourceKey: string;
  readonly contentVersion: number;
  readonly tags: readonly string[];

  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'PresentationAssetDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'PresentationAssetDefinition');
    if (source.schemaVersion !== PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(`不支持 PresentationAssetDefinition schema ${String(source.schemaVersion)}。`);
    }
    if (!KINDS.has(source.kind)) {
      throw new RangeError(`PresentationAssetDefinition.kind 不受支持：${String(source.kind)}。`);
    }
    this.id = assertNonEmptyString(source.id, 'PresentationAssetDefinition.id');
    this.kind = source.kind as PresentationAssetKind;
    this.providerId = assertNonEmptyString(
      source.providerId,
      'PresentationAssetDefinition.providerId',
    );
    this.sourceKey = assertNonEmptyString(
      source.sourceKey,
      'PresentationAssetDefinition.sourceKey',
    );
    this.contentVersion = assertIntegerAtLeast(
      source.contentVersion,
      1,
      'PresentationAssetDefinition.contentVersion',
    );
    if (!Array.isArray(source.tags)) {
      throw new TypeError('PresentationAssetDefinition.tags 必须是数组。');
    }
    this.tags = cloneFrozenStringSet(source.tags, 'PresentationAssetDefinition.tags');
    Object.freeze(this);
  }

  toJSON(): PresentationAssetDefinitionJson {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      kind: this.kind,
      providerId: this.providerId,
      sourceKey: this.sourceKey,
      contentVersion: this.contentVersion,
      tags: this.tags,
    };
  }

  getContentHash(): string {
    return createDeterministicDataHash(this.toJSON(), `PresentationAssetDefinition ${this.id}`);
  }
}

export function createPresentationAssetDefinition(value: unknown): PresentationAssetDefinition {
  return value instanceof PresentationAssetDefinition
    ? value
    : new PresentationAssetDefinition(value);
}
