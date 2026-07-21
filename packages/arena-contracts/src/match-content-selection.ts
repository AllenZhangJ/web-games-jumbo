import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from './definition-utils.js';
import { createDeterministicDataHash } from './deterministic-data-hash.js';

export const MATCH_CONTENT_SELECTION_SCHEMA_VERSION = 1;

const SELECTION_KEYS = new Set([
  'schemaVersion',
  'contentDefinitionId',
  'contentVersion',
  'characterDefinitionIds',
  'equipmentDefinitionIds',
  'mapDefinitionIds',
  'selectedMapDefinitionId',
  'participantCharacters',
  'contentHash',
]);
const PARTICIPANT_CHARACTER_KEYS = new Set(['participantId', 'definitionId']);

export interface MatchParticipantCharacterSelection {
  readonly participantId: string;
  readonly definitionId: string;
}

export interface MatchContentSelection {
  readonly schemaVersion: typeof MATCH_CONTENT_SELECTION_SCHEMA_VERSION;
  readonly contentDefinitionId: string;
  readonly contentVersion: number;
  readonly characterDefinitionIds: readonly string[];
  readonly equipmentDefinitionIds: readonly string[];
  readonly mapDefinitionIds: readonly string[];
  readonly selectedMapDefinitionId: string;
  readonly participantCharacters: readonly MatchParticipantCharacterSelection[];
  readonly contentHash: string;
}

function compareParticipants(
  left: MatchParticipantCharacterSelection,
  right: MatchParticipantCharacterSelection,
): number {
  return left.participantId < right.participantId
    ? -1
    : left.participantId > right.participantId ? 1 : 0;
}

function cloneParticipantCharacters(
  values: unknown,
  characterDefinitionIds: readonly string[],
): readonly MatchParticipantCharacterSelection[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('MatchContentSelection.participantCharacters 必须是非空数组。');
  }
  const participantIds = new Set<string>();
  const result = values.map((value, index) => {
    const name = `MatchContentSelection.participantCharacters[${index}]`;
    assertKnownKeys(value, PARTICIPANT_CHARACTER_KEYS, name);
    const participantId = assertNonEmptyString(value.participantId, `${name}.participantId`);
    if (participantIds.has(participantId)) {
      throw new RangeError(`MatchContentSelection 重复 participant ${participantId}。`);
    }
    participantIds.add(participantId);
    const definitionId = assertNonEmptyString(value.definitionId, `${name}.definitionId`);
    if (!characterDefinitionIds.includes(definitionId)) {
      throw new RangeError(`${name}.definitionId 不在角色内容池。`);
    }
    return Object.freeze({ participantId, definitionId });
  });
  return Object.freeze(result.sort(compareParticipants));
}

function assertHash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}$/.test(value)) {
    throw new TypeError(`${name} 必须是 8 位十六进制 hash。`);
  }
  return value;
}

export function createMatchContentSelection(value: unknown): MatchContentSelection {
  const source = cloneFrozenData(value, 'MatchContentSelection');
  assertKnownKeys(source, SELECTION_KEYS, 'MatchContentSelection');
  if (source.schemaVersion !== MATCH_CONTENT_SELECTION_SCHEMA_VERSION) {
    throw new RangeError(`不支持 MatchContentSelection schema ${String(source.schemaVersion)}。`);
  }
  const characterDefinitionIds = cloneFrozenStringSet(
    source.characterDefinitionIds as readonly unknown[] | undefined,
    'MatchContentSelection.characterDefinitionIds',
  );
  const equipmentDefinitionIds = cloneFrozenStringSet(
    source.equipmentDefinitionIds as readonly unknown[] | undefined,
    'MatchContentSelection.equipmentDefinitionIds',
  );
  const mapDefinitionIds = cloneFrozenStringSet(
    source.mapDefinitionIds as readonly unknown[] | undefined,
    'MatchContentSelection.mapDefinitionIds',
  );
  if (characterDefinitionIds.length === 0 || mapDefinitionIds.length === 0) {
    throw new RangeError('MatchContentSelection 角色池和地图池不能为空。');
  }
  const selectedMapDefinitionId = assertNonEmptyString(
    source.selectedMapDefinitionId,
    'MatchContentSelection.selectedMapDefinitionId',
  );
  if (!mapDefinitionIds.includes(selectedMapDefinitionId)) {
    throw new RangeError('MatchContentSelection.selectedMapDefinitionId 不在地图池。');
  }
  const payload = Object.freeze({
    schemaVersion: MATCH_CONTENT_SELECTION_SCHEMA_VERSION,
    contentDefinitionId: assertNonEmptyString(
      source.contentDefinitionId,
      'MatchContentSelection.contentDefinitionId',
    ),
    contentVersion: assertIntegerAtLeast(
      source.contentVersion,
      1,
      'MatchContentSelection.contentVersion',
    ),
    characterDefinitionIds,
    equipmentDefinitionIds,
    mapDefinitionIds,
    selectedMapDefinitionId,
    participantCharacters: cloneParticipantCharacters(
      source.participantCharacters,
      characterDefinitionIds,
    ),
  });
  const contentHash = createDeterministicDataHash(payload, 'MatchContentSelection');
  if (
    source.contentHash !== undefined
    && assertHash(source.contentHash, 'MatchContentSelection.contentHash') !== contentHash
  ) {
    throw new RangeError('MatchContentSelection contentHash 与内容不一致。');
  }
  return Object.freeze({ ...payload, contentHash });
}

export function createMatchContentPublicView(value: unknown): MatchContentSelection {
  const selection = createMatchContentSelection(value);
  return Object.freeze({
    schemaVersion: selection.schemaVersion,
    contentDefinitionId: selection.contentDefinitionId,
    contentVersion: selection.contentVersion,
    contentHash: selection.contentHash,
    characterDefinitionIds: selection.characterDefinitionIds,
    equipmentDefinitionIds: selection.equipmentDefinitionIds,
    mapDefinitionIds: selection.mapDefinitionIds,
    selectedMapDefinitionId: selection.selectedMapDefinitionId,
    participantCharacters: selection.participantCharacters,
  });
}
