import {
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  assertCharacterRegistry,
  type CharacterRegistryContract,
} from '@number-strategy-jump/arena-definitions';

export interface CharacterRuntimeReferenceOptions {
  readonly participantId: unknown;
  readonly definitionId: unknown;
  readonly characterRegistry: unknown;
}

export interface CharacterRuntimeReference {
  readonly participantId: string;
  readonly definitionId: string;
}

const OPTION_KEYS = new Set(['participantId', 'definitionId', 'characterRegistry']);

export function createCharacterRuntimeReference(
  options: CharacterRuntimeReferenceOptions,
): CharacterRuntimeReference {
  const source: unknown = options;
  assertKnownKeys(source, OPTION_KEYS, 'CharacterRuntime options');
  const registry: CharacterRegistryContract = assertCharacterRegistry(source.characterRegistry);
  const normalizedParticipantId = assertNonEmptyString(
    source.participantId,
    'CharacterRuntime.participantId',
  );
  const definition = registry.require(
    assertNonEmptyString(source.definitionId, 'CharacterRuntime.definitionId'),
  );
  return Object.freeze({
    participantId: normalizedParticipantId,
    definitionId: definition.id,
  });
}
