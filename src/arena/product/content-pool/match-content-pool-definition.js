import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';

export const MATCH_CONTENT_POOL_DEFINITION_SCHEMA_VERSION = 1;

const KEYS = new Set([
  'schemaVersion',
  'id',
  'contentVersion',
  'playerParticipantId',
  'opponentParticipantId',
  'fallbackCharacterId',
  'fallbackMapId',
  'requiredEquipmentIds',
]);

export function createMatchContentPoolDefinition(value) {
  const source = cloneFrozenData(value, 'MatchContentPoolDefinition');
  assertKnownKeys(source, KEYS, 'MatchContentPoolDefinition');
  if (source.schemaVersion !== MATCH_CONTENT_POOL_DEFINITION_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 MatchContentPoolDefinition schema ${String(source.schemaVersion)}。`,
    );
  }
  const playerParticipantId = assertNonEmptyString(
    source.playerParticipantId,
    'MatchContentPoolDefinition.playerParticipantId',
  );
  const opponentParticipantId = assertNonEmptyString(
    source.opponentParticipantId,
    'MatchContentPoolDefinition.opponentParticipantId',
  );
  if (playerParticipantId === opponentParticipantId) {
    throw new RangeError('MatchContentPoolDefinition 两个 participant 不能相同。');
  }
  return Object.freeze({
    schemaVersion: MATCH_CONTENT_POOL_DEFINITION_SCHEMA_VERSION,
    id: assertNonEmptyString(source.id, 'MatchContentPoolDefinition.id'),
    contentVersion: assertIntegerAtLeast(
      source.contentVersion,
      1,
      'MatchContentPoolDefinition.contentVersion',
    ),
    playerParticipantId,
    opponentParticipantId,
    fallbackCharacterId: assertNonEmptyString(
      source.fallbackCharacterId,
      'MatchContentPoolDefinition.fallbackCharacterId',
    ),
    fallbackMapId: assertNonEmptyString(
      source.fallbackMapId,
      'MatchContentPoolDefinition.fallbackMapId',
    ),
    requiredEquipmentIds: cloneFrozenStringSet(
      source.requiredEquipmentIds,
      'MatchContentPoolDefinition.requiredEquipmentIds',
    ),
  });
}
