import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
  type ArenaSupplyAuthorityFactV1,
  type DeepReadonly,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  createModeMatchRuntimeTerminalEvidenceV2,
  validateModeMatchRuntimeTerminalEvidenceV2,
  type ArenaReplayV6,
  type ModeMatchRuntimeTerminalEvidenceV2,
} from '@number-strategy-jump/arena-match';
import type { ProductMatchResultV3 } from '@number-strategy-jump/arena-product-contracts';
import { createProductResultReplaySettlementEvidenceV1 } from './product-result-replay-settlement-evidence-v1.js';

export const PRODUCT_RESULT_RUNTIME_SETTLEMENT_EVIDENCE_V3_SCHEMA_VERSION = 3 as const;

/**
 * V3 keeps the Result/Replay/Mode Driver closure and additionally binds the
 * complete Survival supply fact stream. Settlement can therefore prove that
 * every equipment action used the exact instance currently held by its actor.
 */
export interface ProductResultRuntimeSettlementEvidenceV3 {
  readonly schemaVersion:
    typeof PRODUCT_RESULT_RUNTIME_SETTLEMENT_EVIDENCE_V3_SCHEMA_VERSION;
  readonly result: DeepReadonly<ProductMatchResultV3>;
  readonly replay: ArenaReplayV6;
  readonly modeDriverContentHash: string;
  readonly supplyFacts: readonly DeepReadonly<ArenaSupplyAuthorityFactV1>[];
  readonly supplyFactStreamId: string | null;
  readonly lastSupplyFactSequence: number | null;
  readonly supplyFactCount: number;
  readonly supplyFactsHash: string;
  readonly runtimeTerminalEvidenceHash: string;
  readonly resultAuthorityHash: string;
  readonly replayIdentityHash: string;
  readonly settlementEvidenceHash: string;
}

export interface ProductResultRuntimeSettlementEvidenceV3CreateOptions {
  readonly schemaVersion:
    typeof PRODUCT_RESULT_RUNTIME_SETTLEMENT_EVIDENCE_V3_SCHEMA_VERSION;
  readonly result: unknown;
  readonly runtimeTerminalEvidence: unknown;
}

const CREATE_KEYS = new Set(['schemaVersion', 'result', 'runtimeTerminalEvidence']);
const EVIDENCE_KEYS = new Set([
  'schemaVersion',
  'result',
  'replay',
  'modeDriverContentHash',
  'supplyFacts',
  'supplyFactStreamId',
  'lastSupplyFactSequence',
  'supplyFactCount',
  'supplyFactsHash',
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
  runtimeTerminalEvidence: ModeMatchRuntimeTerminalEvidenceV2,
): ProductResultRuntimeSettlementEvidenceV3 {
  const resultReplayEvidence = createProductResultReplaySettlementEvidenceV1({
    schemaVersion: 1,
    result: resultValue,
    replay: runtimeTerminalEvidence.replay,
  });
  const identity = Object.freeze({
    schemaVersion: PRODUCT_RESULT_RUNTIME_SETTLEMENT_EVIDENCE_V3_SCHEMA_VERSION,
    resultAuthorityHash: resultReplayEvidence.resultAuthorityHash,
    replayIdentityHash: runtimeTerminalEvidence.replayIdentityHash,
    modeDriverContentHash: runtimeTerminalEvidence.modeDriverContentHash,
    supplyFactsHash: runtimeTerminalEvidence.supplyFactsHash,
    supplyFactStreamId: runtimeTerminalEvidence.supplyFactStreamId,
    lastSupplyFactSequence: runtimeTerminalEvidence.lastSupplyFactSequence,
    supplyFactCount: runtimeTerminalEvidence.supplyFactCount,
    runtimeTerminalEvidenceHash: runtimeTerminalEvidence.terminalEvidenceHash,
  });
  return Object.freeze({
    schemaVersion: PRODUCT_RESULT_RUNTIME_SETTLEMENT_EVIDENCE_V3_SCHEMA_VERSION,
    result: resultReplayEvidence.result,
    replay: runtimeTerminalEvidence.replay,
    modeDriverContentHash: identity.modeDriverContentHash,
    supplyFacts: runtimeTerminalEvidence.supplyFacts,
    supplyFactStreamId: identity.supplyFactStreamId,
    lastSupplyFactSequence: identity.lastSupplyFactSequence,
    supplyFactCount: identity.supplyFactCount,
    supplyFactsHash: identity.supplyFactsHash,
    runtimeTerminalEvidenceHash: identity.runtimeTerminalEvidenceHash,
    resultAuthorityHash: identity.resultAuthorityHash,
    replayIdentityHash: identity.replayIdentityHash,
    settlementEvidenceHash: createDeterministicDataHash(
      identity,
      'ProductResultRuntimeSettlementEvidenceV3 identity',
    ),
  });
}

export function createProductResultRuntimeSettlementEvidenceV3(
  value: unknown,
): ProductResultRuntimeSettlementEvidenceV3 {
  const source = cloneFrozenData(
    value,
    'ProductResultRuntimeSettlementEvidenceV3 create options',
  );
  exactRecord(source, CREATE_KEYS, 'ProductResultRuntimeSettlementEvidenceV3 create options');
  if (source.schemaVersion !== PRODUCT_RESULT_RUNTIME_SETTLEMENT_EVIDENCE_V3_SCHEMA_VERSION) {
    throw new RangeError('ProductResultRuntimeSettlementEvidenceV3.schemaVersion必须是3。');
  }
  return normalize(
    source.result,
    validateModeMatchRuntimeTerminalEvidenceV2(source.runtimeTerminalEvidence),
  );
}

export function validateProductResultRuntimeSettlementEvidenceV3(
  value: unknown,
): ProductResultRuntimeSettlementEvidenceV3 {
  const source = cloneFrozenData(value, 'ProductResultRuntimeSettlementEvidenceV3');
  exactRecord(source, EVIDENCE_KEYS, 'ProductResultRuntimeSettlementEvidenceV3');
  if (source.schemaVersion !== PRODUCT_RESULT_RUNTIME_SETTLEMENT_EVIDENCE_V3_SCHEMA_VERSION) {
    throw new RangeError('ProductResultRuntimeSettlementEvidenceV3.schemaVersion必须是3。');
  }
  const expectedSupplyFactsHash = hash(
    source.supplyFactsHash,
    'ProductResultRuntimeSettlementEvidenceV3.supplyFactsHash',
  );
  const expectedRuntimeTerminalEvidenceHash = hash(
    source.runtimeTerminalEvidenceHash,
    'ProductResultRuntimeSettlementEvidenceV3.runtimeTerminalEvidenceHash',
  );
  const expectedResultAuthorityHash = hash(
    source.resultAuthorityHash,
    'ProductResultRuntimeSettlementEvidenceV3.resultAuthorityHash',
  );
  const expectedReplayIdentityHash = hash(
    source.replayIdentityHash,
    'ProductResultRuntimeSettlementEvidenceV3.replayIdentityHash',
  );
  const expectedSettlementEvidenceHash = hash(
    source.settlementEvidenceHash,
    'ProductResultRuntimeSettlementEvidenceV3.settlementEvidenceHash',
  );
  const reconstructedRuntimeEvidence = createModeMatchRuntimeTerminalEvidenceV2({
    schemaVersion: 2,
    replay: source.replay,
    modeDriverContentHash: source.modeDriverContentHash,
    supplyFacts: source.supplyFacts,
    supplyFactStreamId: source.supplyFactStreamId,
    lastSupplyFactSequence: source.lastSupplyFactSequence,
    supplyFactCount: source.supplyFactCount,
  });
  if (reconstructedRuntimeEvidence.supplyFactsHash !== expectedSupplyFactsHash
    || reconstructedRuntimeEvidence.terminalEvidenceHash
      !== expectedRuntimeTerminalEvidenceHash) {
    throw new RangeError('Product V3结算证据声明的Runtime供给终局identity重算不一致。');
  }
  const normalized = normalize(source.result, reconstructedRuntimeEvidence);
  if (normalized.resultAuthorityHash !== expectedResultAuthorityHash
    || normalized.replayIdentityHash !== expectedReplayIdentityHash
    || normalized.settlementEvidenceHash !== expectedSettlementEvidenceHash) {
    throw new RangeError('Product Result/Runtime V3结算证据identity重算不一致。');
  }
  return normalized;
}
