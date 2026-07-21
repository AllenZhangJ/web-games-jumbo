import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const CONTENT_REPLACEMENT_DEFINITION_SCHEMA_VERSION = 1;

export const MATCH_CONTENT_KIND = Object.freeze({
  CHARACTER: 'character',
  EQUIPMENT: 'equipment',
  MAP: 'map',
});

const KEYS = new Set([
  'schemaVersion',
  'id',
  'contentVersion',
  'kind',
  'retiredId',
  'replacementId',
]);

export function createContentReplacementDefinition(value) {
  const source = cloneFrozenData(value, 'ContentReplacementDefinition');
  assertKnownKeys(source, KEYS, 'ContentReplacementDefinition');
  if (source.schemaVersion !== CONTENT_REPLACEMENT_DEFINITION_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 ContentReplacementDefinition schema ${String(source.schemaVersion)}。`,
    );
  }
  if (!Object.values(MATCH_CONTENT_KIND).includes(source.kind)) {
    throw new RangeError('ContentReplacementDefinition.kind 不受支持。');
  }
  const retiredId = assertNonEmptyString(
    source.retiredId,
    'ContentReplacementDefinition.retiredId',
  );
  const replacementId = assertNonEmptyString(
    source.replacementId,
    'ContentReplacementDefinition.replacementId',
  );
  if (retiredId === replacementId) {
    throw new RangeError('ContentReplacementDefinition 不能替换为自身。');
  }
  return Object.freeze({
    schemaVersion: CONTENT_REPLACEMENT_DEFINITION_SCHEMA_VERSION,
    id: assertNonEmptyString(source.id, 'ContentReplacementDefinition.id'),
    contentVersion: assertIntegerAtLeast(
      source.contentVersion,
      1,
      'ContentReplacementDefinition.contentVersion',
    ),
    kind: source.kind,
    retiredId,
    replacementId,
  });
}
