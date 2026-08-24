import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
  type DeepReadonly,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  createModeMatchRuntimeTerminalEvidenceV1,
  validateModeMatchRuntimeTerminalEvidenceV1,
  type ArenaReplayV6,
  type ModeMatchRuntimeTerminalEvidenceV1,
} from '@number-strategy-jump/arena-match';
import type { ProductMatchResultV3 } from '@number-strategy-jump/arena-product-contracts';
import {
  createProductResultReplaySettlementEvidenceV1,
} from './product-result-replay-settlement-evidence-v1.js';

export const PRODUCT_RESULT_RUNTIME_SETTLEMENT_EVIDENCE_V2_SCHEMA_VERSION = 2 as const;

/**
 * V2 retains the complete Result/Replay V1 closure and adds the concrete Mode
 * Driver identity emitted by the terminal runtime. The runtime envelope is
 * flattened after validation so downstream consumers do not store Replay
 * twice, while its identity hash remains independently reconstructable.
 */
export interface ProductResultRuntimeSettlementEvidenceV2 {
  readonly schemaVersion:
    typeof PRODUCT_RESULT_RUNTIME_SETTLEMENT_EVIDENCE_V2_SCHEMA_VERSION;
  readonly result: DeepReadonly<ProductMatchResultV3>;
  readonly replay: ArenaReplayV6;
  readonly modeDriverContentHash: string;
  readonly runtimeTerminalEvidenceHash: string;
  readonly resultAuthorityHash: string;
  readonly replayIdentityHash: string;
  readonly settlementEvidenceHash: string;
}

export interface ProductResultRuntimeSettlementEvidenceV2CreateOptions {
  readonly schemaVersion:
    typeof PRODUCT_RESULT_RUNTIME_SETTLEMENT_EVIDENCE_V2_SCHEMA_VERSION;
  readonly result: unknown;
  readonly runtimeTerminalEvidence: unknown;
}

const CREATE_KEYS = new Set([
  'schemaVersion',
  'result',
  'runtimeTerminalEvidence',
]);
const EVIDENCE_KEYS = new Set([
  'schemaVersion',
  'result',
  'replay',
  'modeDriverContentHash',
  'runtimeTerminalEvidenceHash',
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
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
}

function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name}必须是8位小写十六进制hash。`);
  }
  return value;
}

function normalize(
  resultValue: unknown,
  runtimeTerminalEvidence: ModeMatchRuntimeTerminalEvidenceV1,
): ProductResultRuntimeSettlementEvidenceV2 {
  const resultReplayEvidence = createProductResultReplaySettlementEvidenceV1({
    schemaVersion: 1,
    result: resultValue,
    replay: runtimeTerminalEvidence.replay,
  });
  const identity = Object.freeze({
    schemaVersion: PRODUCT_RESULT_RUNTIME_SETTLEMENT_EVIDENCE_V2_SCHEMA_VERSION,
    resultAuthorityHash: resultReplayEvidence.resultAuthorityHash,
    replayIdentityHash: runtimeTerminalEvidence.replayIdentityHash,
    modeDriverContentHash: runtimeTerminalEvidence.modeDriverContentHash,
    runtimeTerminalEvidenceHash: runtimeTerminalEvidence.terminalEvidenceHash,
  });
  return Object.freeze({
    schemaVersion: PRODUCT_RESULT_RUNTIME_SETTLEMENT_EVIDENCE_V2_SCHEMA_VERSION,
    result: resultReplayEvidence.result,
    replay: runtimeTerminalEvidence.replay,
    modeDriverContentHash: identity.modeDriverContentHash,
    runtimeTerminalEvidenceHash: identity.runtimeTerminalEvidenceHash,
    resultAuthorityHash: identity.resultAuthorityHash,
    replayIdentityHash: identity.replayIdentityHash,
    settlementEvidenceHash: createDeterministicDataHash(
      identity,
      'ProductResultRuntimeSettlementEvidenceV2 identity',
    ),
  });
}

export function createProductResultRuntimeSettlementEvidenceV2(
  value: unknown,
): ProductResultRuntimeSettlementEvidenceV2 {
  const source = cloneFrozenData(
    value,
    'ProductResultRuntimeSettlementEvidenceV2 create options',
  );
  exactRecord(source, CREATE_KEYS, 'ProductResultRuntimeSettlementEvidenceV2 create options');
  if (source.schemaVersion !== PRODUCT_RESULT_RUNTIME_SETTLEMENT_EVIDENCE_V2_SCHEMA_VERSION) {
    throw new RangeError('ProductResultRuntimeSettlementEvidenceV2.schemaVersion必须是2。');
  }
  return normalize(
    source.result,
    validateModeMatchRuntimeTerminalEvidenceV1(source.runtimeTerminalEvidence),
  );
}

export function validateProductResultRuntimeSettlementEvidenceV2(
  value: unknown,
): ProductResultRuntimeSettlementEvidenceV2 {
  const source = cloneFrozenData(value, 'ProductResultRuntimeSettlementEvidenceV2');
  exactRecord(source, EVIDENCE_KEYS, 'ProductResultRuntimeSettlementEvidenceV2');
  if (source.schemaVersion !== PRODUCT_RESULT_RUNTIME_SETTLEMENT_EVIDENCE_V2_SCHEMA_VERSION) {
    throw new RangeError('ProductResultRuntimeSettlementEvidenceV2.schemaVersion必须是2。');
  }
  const expectedModeDriverContentHash = hash(
    source.modeDriverContentHash,
    'ProductResultRuntimeSettlementEvidenceV2.modeDriverContentHash',
  );
  const expectedRuntimeTerminalEvidenceHash = hash(
    source.runtimeTerminalEvidenceHash,
    'ProductResultRuntimeSettlementEvidenceV2.runtimeTerminalEvidenceHash',
  );
  const expectedResultAuthorityHash = hash(
    source.resultAuthorityHash,
    'ProductResultRuntimeSettlementEvidenceV2.resultAuthorityHash',
  );
  const expectedReplayIdentityHash = hash(
    source.replayIdentityHash,
    'ProductResultRuntimeSettlementEvidenceV2.replayIdentityHash',
  );
  const expectedSettlementEvidenceHash = hash(
    source.settlementEvidenceHash,
    'ProductResultRuntimeSettlementEvidenceV2.settlementEvidenceHash',
  );
  const reconstructedRuntimeEvidence = createModeMatchRuntimeTerminalEvidenceV1({
    schemaVersion: 1,
    replay: source.replay,
    modeDriverContentHash: expectedModeDriverContentHash,
  });
  if (reconstructedRuntimeEvidence.terminalEvidenceHash
    !== expectedRuntimeTerminalEvidenceHash) {
    throw new RangeError('Product结算证据声明的Runtime终局identity重算不一致。');
  }
  const normalized = normalize(source.result, reconstructedRuntimeEvidence);
  if (
    normalized.resultAuthorityHash !== expectedResultAuthorityHash
    || normalized.replayIdentityHash !== expectedReplayIdentityHash
    || normalized.settlementEvidenceHash !== expectedSettlementEvidenceHash
  ) {
    throw new RangeError('Product Result/Runtime结算证据identity重算不一致。');
  }
  return normalized;
}
