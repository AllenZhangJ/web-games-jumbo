import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
  createModeResultV3Payload,
  validateMatchContentSelectionV2,
  validateParticipantEquipmentUsageV3,
  type DeepReadonly,
  type MatchContentSelectionV2,
  type ModeResultV3Payload,
  type ParticipantEquipmentUsageV3,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import { assertProductMatchSeed } from './product-match-result.js';
import {
  createProductParticipantAssignmentsV2,
  createProductPublicParticipantsV2,
  type ProductParticipantAssignmentV2,
  type ProductPublicParticipantV2,
} from './product-participant-contract-v2.js';

export const PRODUCT_MATCH_RESULT_V3_SCHEMA_VERSION = 3 as const;

export interface ProductAuthorityIdentityV3 {
  readonly replaySchemaVersion: 6;
  readonly ruleSchemaVersion: 6;
  readonly physicsBackendVersion: string;
  readonly configHash: string;
  readonly ruleContentHash: string;
  readonly finalHash: string;
}

export type ProductParticipantEquipmentUsageV3 = ParticipantEquipmentUsageV3;

export interface ProductMatchResultV3 {
  readonly schemaVersion: typeof PRODUCT_MATCH_RESULT_V3_SCHEMA_VERSION;
  readonly modeDefinitionId: string;
  readonly matchSeed: number;
  readonly authorityIdentity: ProductAuthorityIdentityV3;
  readonly content: MatchContentSelectionV2;
  readonly participantAssignments: readonly ProductParticipantAssignmentV2[];
  readonly participantEquipmentUsage: readonly ProductParticipantEquipmentUsageV3[];
  readonly modeResult: ModeResultV3Payload;
  readonly publicParticipants: readonly ProductPublicParticipantV2[];
  readonly authorityHash: string;
}

const AUTHORITY_IDENTITY_KEYS = new Set([
  'replaySchemaVersion', 'ruleSchemaVersion', 'physicsBackendVersion', 'configHash',
  'ruleContentHash', 'finalHash',
]);
const CREATE_KEYS = new Set([
  'schemaVersion', 'modeDefinitionId', 'matchSeed', 'authorityIdentity', 'content',
  'participantAssignments', 'participantEquipmentUsage', 'modeResult', 'publicParticipants',
]);
const RESULT_KEYS = new Set([...CREATE_KEYS, 'authorityHash']);

function requireKeys(value: PlainRecord, keys: ReadonlySet<string>, name: string): void {
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name} 缺少字段 ${key}。`);
  }
}

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is PlainRecord {
  assertKnownKeys(value, keys, name);
  requireKeys(value, keys, name);
}

function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}$/.test(value)) {
    throw new TypeError(`${name} 必须是8位小写十六进制hash。`);
  }
  return value;
}

function createAuthorityIdentityV3(value: unknown): ProductAuthorityIdentityV3 {
  exactRecord(value, AUTHORITY_IDENTITY_KEYS, 'ProductAuthorityIdentityV3');
  if (value.replaySchemaVersion !== 6 || value.ruleSchemaVersion !== 6) {
    throw new RangeError('ProductAuthorityIdentityV3只接受Replay/Rule schema 6。');
  }
  return Object.freeze({
    replaySchemaVersion: 6,
    ruleSchemaVersion: 6,
    physicsBackendVersion: assertNonEmptyString(
      value.physicsBackendVersion,
      'ProductAuthorityIdentityV3.physicsBackendVersion',
    ),
    configHash: hash(value.configHash, 'ProductAuthorityIdentityV3.configHash'),
    ruleContentHash: hash(value.ruleContentHash, 'ProductAuthorityIdentityV3.ruleContentHash'),
    finalHash: hash(value.finalHash, 'ProductAuthorityIdentityV3.finalHash'),
  });
}

function assertModeResultParticipants(
  result: DeepReadonly<ModeResultV3Payload>,
  assignments: readonly ProductParticipantAssignmentV2[],
): void {
  const participantIds = new Set(assignments.map(({ participantId }) => participantId));
  if (result.kind === 'duel') {
    if (result.winnerParticipantIds.some((id) => !participantIds.has(id))) {
      throw new RangeError('Duel modeResult winner不在assignment。');
    }
    return;
  }
  if (result.kind === 'race') {
    if (
      result.rankings.length !== assignments.length
      || result.rankings.some((ranking, index) => (
        ranking.participantId !== assignments[index]!.participantId
      ))
    ) {
      throw new RangeError('Race modeResult rankings必须与assignment完全一致。');
    }
    return;
  }
  if (!participantIds.has(result.playerParticipantId)) {
    throw new RangeError('Survival modeResult player不在assignment。');
  }
}

function normalizeAuthority(value: PlainRecord) {
  if (value.schemaVersion !== PRODUCT_MATCH_RESULT_V3_SCHEMA_VERSION) {
    throw new RangeError('ProductMatchResultV3.schemaVersion 必须是3。');
  }
  const modeDefinitionId = assertNonEmptyString(
    value.modeDefinitionId,
    'ProductMatchResultV3.modeDefinitionId',
  );
  const content = validateMatchContentSelectionV2(value.content);
  if (content.modeDefinitionId !== modeDefinitionId) {
    throw new RangeError('ProductMatchResultV3 content Mode身份不一致。');
  }
  const participantAssignments = createProductParticipantAssignmentsV2(
    value.participantAssignments,
  );
  if (
    participantAssignments.length !== content.participantCharacters.length
    || participantAssignments.some(({ participantId }, index) => (
      participantId !== content.participantCharacters[index]?.participantId
    ))
  ) {
    throw new RangeError('ProductMatchResultV3 assignment/content participant集合不一致。');
  }
  const modeResult = createModeResultV3Payload(value.modeResult);
  assertModeResultParticipants(modeResult, participantAssignments);
  return Object.freeze({
    schemaVersion: PRODUCT_MATCH_RESULT_V3_SCHEMA_VERSION,
    modeDefinitionId,
    matchSeed: assertProductMatchSeed(value.matchSeed, 'ProductMatchResultV3.matchSeed'),
    authorityIdentity: createAuthorityIdentityV3(value.authorityIdentity),
    content,
    participantAssignments,
    participantEquipmentUsage: validateParticipantEquipmentUsageV3(
      value.participantEquipmentUsage,
      participantAssignments.map(({ participantId }) => participantId),
      content.equipmentDefinitionIds,
    ),
    modeResult,
  });
}

export function createProductMatchResultV3(
  value: unknown,
): DeepReadonly<ProductMatchResultV3> {
  const source = cloneFrozenData(value, 'ProductMatchResultV3 create options');
  exactRecord(source, CREATE_KEYS, 'ProductMatchResultV3 create options');
  const authority = normalizeAuthority(source);
  const publicParticipants = createProductPublicParticipantsV2(
    source.publicParticipants,
    authority.participantAssignments,
  );
  return Object.freeze({
    ...authority,
    publicParticipants,
    authorityHash: createDeterministicDataHash(authority, 'ProductMatchResultV3 authority'),
  });
}

export function validateProductMatchResultV3(
  value: unknown,
): DeepReadonly<ProductMatchResultV3> {
  const source = cloneFrozenData(value, 'ProductMatchResultV3');
  exactRecord(source, RESULT_KEYS, 'ProductMatchResultV3');
  const {
    authorityHash: sourceAuthorityHash,
    publicParticipants: sourcePublicParticipants,
    ...createFields
  } = source;
  const result = createProductMatchResultV3({
    ...createFields,
    publicParticipants: sourcePublicParticipants,
  });
  if (hash(sourceAuthorityHash, 'ProductMatchResultV3.authorityHash') !== result.authorityHash) {
    throw new RangeError('ProductMatchResultV3.authorityHash 与权威内容不一致。');
  }
  return result;
}

export function assertProductResultEndedAtTickV3(
  result: ProductMatchResultV3,
  endedAtTick: unknown,
): void {
  const tick = assertIntegerAtLeast(endedAtTick, 0, 'ProductMatchResultV3 endedAtTick');
  if (result.modeResult.endedAtTick !== tick) {
    throw new RangeError('ProductMatchResultV3 modeResult终局tick不一致。');
  }
}
