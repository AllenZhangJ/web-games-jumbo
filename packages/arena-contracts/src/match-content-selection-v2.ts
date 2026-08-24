import {
  createMatchContentSelection,
  type MatchParticipantCharacterSelection,
} from './match-content-selection.js';
import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type DeepReadonly,
  type PlainRecord,
} from './definition-utils.js';
import { createDeterministicDataHash } from './deterministic-data-hash.js';

export const MATCH_CONTENT_SELECTION_V2_SCHEMA_VERSION = 2 as const;

export interface MatchContentSelectionV2 {
  readonly schemaVersion: typeof MATCH_CONTENT_SELECTION_V2_SCHEMA_VERSION;
  readonly modeDefinitionId: string;
  readonly contentDefinitionId: string;
  readonly contentVersion: number;
  readonly characterDefinitionIds: readonly string[];
  readonly equipmentDefinitionIds: readonly string[];
  readonly mapDefinitionIds: readonly string[];
  readonly selectedMapDefinitionId: string;
  readonly participantCharacters: readonly MatchParticipantCharacterSelection[];
  readonly contentHash: string;
}

const KEYS = new Set([
  'schemaVersion', 'modeDefinitionId', 'contentDefinitionId', 'contentVersion',
  'characterDefinitionIds', 'equipmentDefinitionIds', 'mapDefinitionIds',
  'selectedMapDefinitionId', 'participantCharacters', 'contentHash',
]);
const REQUIRED_CREATE_KEYS = [...KEYS].filter((key) => key !== 'contentHash');

function requireKeys(value: PlainRecord, keys: readonly string[], name: string): void {
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name} 缺少字段 ${key}。`);
  }
}

function assertHash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}$/.test(value)) {
    throw new TypeError(`${name} 必须是8位小写十六进制hash。`);
  }
  return value;
}

function assertSameStringArray(
  source: unknown,
  normalized: readonly string[],
  name: string,
): void {
  if (!Array.isArray(source)
    || source.length !== normalized.length
    || source.some((value, index) => value !== normalized[index])) {
    throw new RangeError(`${name} 必须唯一且按字符串稳定升序排序。`);
  }
}

function assertSameParticipants(
  source: unknown,
  normalized: readonly MatchParticipantCharacterSelection[],
): void {
  if (!Array.isArray(source) || source.length !== normalized.length) {
    throw new RangeError('MatchContentSelectionV2.participantCharacters 集合不一致。');
  }
  source.forEach((value, index) => {
    const record = value as PlainRecord;
    const expected = normalized[index];
    if (
      !expected
      || record.participantId !== expected.participantId
      || record.definitionId !== expected.definitionId
    ) {
      throw new RangeError(
        'MatchContentSelectionV2.participantCharacters 必须按participantId稳定排序。',
      );
    }
  });
}

export function createMatchContentSelectionV2(
  value: unknown,
): DeepReadonly<MatchContentSelectionV2> {
  const source = cloneFrozenData(value, 'MatchContentSelectionV2');
  assertKnownKeys(source, KEYS, 'MatchContentSelectionV2');
  requireKeys(source, REQUIRED_CREATE_KEYS, 'MatchContentSelectionV2');
  if (source.schemaVersion !== MATCH_CONTENT_SELECTION_V2_SCHEMA_VERSION) {
    throw new RangeError('MatchContentSelectionV2.schemaVersion 必须是2。');
  }
  const modeDefinitionId = assertNonEmptyString(
    source.modeDefinitionId,
    'MatchContentSelectionV2.modeDefinitionId',
  );
  const common = createMatchContentSelection({
    schemaVersion: 1,
    contentDefinitionId: source.contentDefinitionId,
    contentVersion: source.contentVersion,
    characterDefinitionIds: source.characterDefinitionIds,
    equipmentDefinitionIds: source.equipmentDefinitionIds,
    mapDefinitionIds: source.mapDefinitionIds,
    selectedMapDefinitionId: source.selectedMapDefinitionId,
    participantCharacters: source.participantCharacters,
  });
  assertSameStringArray(
    source.characterDefinitionIds,
    common.characterDefinitionIds,
    'MatchContentSelectionV2.characterDefinitionIds',
  );
  assertSameStringArray(
    source.equipmentDefinitionIds,
    common.equipmentDefinitionIds,
    'MatchContentSelectionV2.equipmentDefinitionIds',
  );
  assertSameStringArray(
    source.mapDefinitionIds,
    common.mapDefinitionIds,
    'MatchContentSelectionV2.mapDefinitionIds',
  );
  assertSameParticipants(source.participantCharacters, common.participantCharacters);
  const payload = Object.freeze({
    schemaVersion: MATCH_CONTENT_SELECTION_V2_SCHEMA_VERSION,
    modeDefinitionId,
    contentDefinitionId: common.contentDefinitionId,
    contentVersion: common.contentVersion,
    characterDefinitionIds: common.characterDefinitionIds,
    equipmentDefinitionIds: common.equipmentDefinitionIds,
    mapDefinitionIds: common.mapDefinitionIds,
    selectedMapDefinitionId: common.selectedMapDefinitionId,
    participantCharacters: common.participantCharacters,
  });
  const contentHash = createDeterministicDataHash(payload, 'MatchContentSelectionV2');
  if (source.contentHash !== undefined
    && assertHash(source.contentHash, 'MatchContentSelectionV2.contentHash') !== contentHash) {
    throw new RangeError('MatchContentSelectionV2.contentHash 与Mode/content内容不一致。');
  }
  return Object.freeze({ ...payload, contentHash });
}

export function validateMatchContentSelectionV2(
  value: unknown,
): DeepReadonly<MatchContentSelectionV2> {
  const source = cloneFrozenData(value, 'MatchContentSelectionV2 bytes');
  assertKnownKeys(source, KEYS, 'MatchContentSelectionV2 bytes');
  requireKeys(source, [...KEYS], 'MatchContentSelectionV2 bytes');
  return createMatchContentSelectionV2(source);
}

export function createMatchContentPublicViewV2(
  value: unknown,
): DeepReadonly<MatchContentSelectionV2> {
  return validateMatchContentSelectionV2(value);
}
