import {
  assertKnownKeys,
  assertArenaV6CompetitiveEquipmentActionEligibilityV1,
  assertArenaV6SurvivalEquipmentActionEligibilityV1,
  cloneFrozenData,
  createDeterministicDataHash,
  createParticipantEquipmentUsageV3FromEvents,
  type DeepReadonly,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  validateProductMatchResultV3,
  type ProductMatchResultV3,
} from '@number-strategy-jump/arena-product-contracts';
import {
  validateArenaReplayV6,
  type ArenaReplayV6,
} from '@number-strategy-jump/arena-match';

export const PRODUCT_RESULT_REPLAY_SETTLEMENT_EVIDENCE_V1_SCHEMA_VERSION = 1 as const;

export interface ProductResultReplaySettlementEvidenceV1 {
  readonly schemaVersion:
    typeof PRODUCT_RESULT_REPLAY_SETTLEMENT_EVIDENCE_V1_SCHEMA_VERSION;
  readonly result: DeepReadonly<ProductMatchResultV3>;
  readonly replay: ArenaReplayV6;
  readonly resultAuthorityHash: string;
  readonly replayIdentityHash: string;
  readonly settlementEvidenceHash: string;
}

const CREATE_KEYS = new Set(['schemaVersion', 'result', 'replay']);
const EVIDENCE_KEYS = new Set([
  ...CREATE_KEYS,
  'resultAuthorityHash',
  'replayIdentityHash',
  'settlementEvidenceHash',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is PlainRecord {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
}

function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name}必须是8位小写十六进制hash。`);
  }
  return value;
}

function sameData(left: unknown, right: unknown, name: string): boolean {
  return createDeterministicDataHash(left, `${name} left`)
    === createDeterministicDataHash(right, `${name} right`);
}

function assertAuthorityIdentity(
  result: DeepReadonly<ProductMatchResultV3>,
  replay: ArenaReplayV6,
): void {
  if (
    result.authorityIdentity.replaySchemaVersion !== replay.replaySchemaVersion
    || result.authorityIdentity.ruleSchemaVersion !== replay.authoritySchemaVersion
    || result.authorityIdentity.physicsBackendVersion !== replay.physicsBackendVersion
    || result.authorityIdentity.configHash !== replay.configHash
    || result.authorityIdentity.ruleContentHash !== replay.contentHash
    || result.authorityIdentity.finalHash !== replay.finalHash
  ) {
    throw new RangeError('Product Result与Replay V6终局权威身份不一致。');
  }
  if (
    result.modeDefinitionId !== replay.modeDefinitionId
    || result.matchSeed !== replay.matchSeed
    || result.modeDefinitionId !== replay.config.modeDefinitionId
  ) {
    throw new RangeError('Product Result与Replay V6模式或seed身份不一致。');
  }
  if (!sameData(result.modeResult, replay.modeResult, 'Product Result/Replay modeResult')) {
    throw new RangeError('Product Result与Replay V6终局模式结果不一致。');
  }
}

function assertParticipantIdentity(
  result: DeepReadonly<ProductMatchResultV3>,
  replay: ArenaReplayV6,
): void {
  const characterByParticipant = new Map(
    result.content.participantCharacters.map(({ participantId, definitionId }) => (
      [participantId, definitionId] as const
    )),
  );
  if (result.participantAssignments.length !== replay.participantAssignments.length) {
    throw new RangeError('Product Result与Replay V6参与者数量不一致。');
  }
  result.participantAssignments.forEach((assignment, index) => {
    const replayAssignment = replay.participantAssignments[index];
    if (
      replayAssignment === undefined
      || assignment.participantId !== replayAssignment.participantId
      || assignment.modeRole !== replayAssignment.modeRole
      || assignment.teamId !== replayAssignment.teamId
      || assignment.slotId !== replayAssignment.slotId
      || assignment.slotGeneration !== replayAssignment.slotGeneration
      || characterByParticipant.get(assignment.participantId)
        !== replayAssignment.characterDefinitionId
    ) {
      throw new RangeError('Product Result与Replay V6参与者、角色或slot身份不一致。');
    }
  });
}

function assertEquipmentUsage(
  result: DeepReadonly<ProductMatchResultV3>,
  replay: ArenaReplayV6,
): void {
  if (result.modeResult.kind === 'duel' || result.modeResult.kind === 'race') {
    assertArenaV6CompetitiveEquipmentActionEligibilityV1({
      modeKind: result.modeResult.kind,
      participants: result.participantAssignments.map((entry) => ({
        participantId: entry.participantId,
        modeRole: entry.modeRole,
        slotId: entry.slotId,
        slotGeneration: entry.slotGeneration,
      })),
      events: replay.events,
    });
  } else {
    assertArenaV6SurvivalEquipmentActionEligibilityV1({
      participants: result.participantAssignments.map((entry) => ({
        participantId: entry.participantId,
        modeRole: entry.modeRole,
        slotId: entry.slotId,
        slotGeneration: entry.slotGeneration,
      })),
      events: replay.events,
    });
  }
  const reconstructed = createParticipantEquipmentUsageV3FromEvents({
    participantIds: result.participantAssignments.map(({ participantId }) => participantId),
    allowedCollectionEquipmentDefinitionIds: result.content.equipmentDefinitionIds,
    events: replay.events,
  });
  if (!sameData(
    result.participantEquipmentUsage,
    reconstructed,
    'Product Result/Replay equipment usage',
  )) {
    throw new RangeError('Product Result武器使用摘要与Replay V6事件重建结果不一致。');
  }
}

function normalize(value: PlainRecord): ProductResultReplaySettlementEvidenceV1 {
  if (value.schemaVersion !== PRODUCT_RESULT_REPLAY_SETTLEMENT_EVIDENCE_V1_SCHEMA_VERSION) {
    throw new RangeError('ProductResultReplaySettlementEvidenceV1.schemaVersion必须是1。');
  }
  const result = validateProductMatchResultV3(value.result);
  const replay = validateArenaReplayV6(value.replay);
  assertAuthorityIdentity(result, replay);
  assertParticipantIdentity(result, replay);
  assertEquipmentUsage(result, replay);
  const identity = Object.freeze({
    schemaVersion: PRODUCT_RESULT_REPLAY_SETTLEMENT_EVIDENCE_V1_SCHEMA_VERSION,
    resultAuthorityHash: result.authorityHash,
    replayIdentityHash: replay.replayIdentityHash,
  });
  return Object.freeze({
    schemaVersion: PRODUCT_RESULT_REPLAY_SETTLEMENT_EVIDENCE_V1_SCHEMA_VERSION,
    result,
    replay,
    resultAuthorityHash: identity.resultAuthorityHash,
    replayIdentityHash: identity.replayIdentityHash,
    settlementEvidenceHash: createDeterministicDataHash(
      identity,
      'ProductResultReplaySettlementEvidenceV1 identity',
    ),
  });
}

export function createProductResultReplaySettlementEvidenceV1(
  value: unknown,
): ProductResultReplaySettlementEvidenceV1 {
  const source = cloneFrozenData(
    value,
    'ProductResultReplaySettlementEvidenceV1 create options',
  );
  exactRecord(
    source,
    CREATE_KEYS,
    'ProductResultReplaySettlementEvidenceV1 create options',
  );
  return normalize(source);
}

export function validateProductResultReplaySettlementEvidenceV1(
  value: unknown,
): ProductResultReplaySettlementEvidenceV1 {
  const source = cloneFrozenData(value, 'ProductResultReplaySettlementEvidenceV1');
  exactRecord(source, EVIDENCE_KEYS, 'ProductResultReplaySettlementEvidenceV1');
  const expectedResultAuthorityHash = hash(
    source.resultAuthorityHash,
    'ProductResultReplaySettlementEvidenceV1.resultAuthorityHash',
  );
  const expectedReplayIdentityHash = hash(
    source.replayIdentityHash,
    'ProductResultReplaySettlementEvidenceV1.replayIdentityHash',
  );
  const expectedSettlementEvidenceHash = hash(
    source.settlementEvidenceHash,
    'ProductResultReplaySettlementEvidenceV1.settlementEvidenceHash',
  );
  const normalized = normalize(source);
  if (
    normalized.resultAuthorityHash !== expectedResultAuthorityHash
    || normalized.replayIdentityHash !== expectedReplayIdentityHash
    || normalized.settlementEvidenceHash !== expectedSettlementEvidenceHash
  ) {
    throw new RangeError('Product Result与Replay V6结算证据identity重算不一致。');
  }
  return normalized;
}
