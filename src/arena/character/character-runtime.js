import { assertCharacterRegistry } from './character-registry.js';
import { assertNonEmptyString } from '@number-strategy-jump/arena-contracts';

export function createCharacterRuntimeReference({
  participantId,
  definitionId,
  characterRegistry,
}) {
  const registry = assertCharacterRegistry(characterRegistry);
  const normalizedParticipantId = assertNonEmptyString(
    participantId,
    'CharacterRuntime.participantId',
  );
  const definition = registry.require(
    assertNonEmptyString(definitionId, 'CharacterRuntime.definitionId'),
  );
  return Object.freeze({
    participantId: normalizedParticipantId,
    definitionId: definition.id,
  });
}
