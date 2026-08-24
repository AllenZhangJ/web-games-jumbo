import {
  assertKnownKeys,
  assertArenaV6SurvivalEquipmentOwnershipConsistencyV1,
  ARENA_SUPPLY_AUTHORITY_FACT_MAX_RETAINED_COUNT_V1,
  cloneFrozenData,
  createArenaSupplyAuthorityFactsV1,
  createDeterministicDataHash,
  type ArenaSupplyAuthorityFactV1,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import { validateArenaReplayV6, type ArenaReplayV6 } from './replay-v6.js';

export const MODE_MATCH_RUNTIME_TERMINAL_EVIDENCE_V2_SCHEMA_VERSION = 2 as const;

export interface ModeMatchRuntimeTerminalEvidenceV2 {
  readonly schemaVersion: typeof MODE_MATCH_RUNTIME_TERMINAL_EVIDENCE_V2_SCHEMA_VERSION;
  readonly replay: ArenaReplayV6;
  readonly modeDriverContentHash: string;
  readonly supplyFacts: readonly DeepReadonly<ArenaSupplyAuthorityFactV1>[];
  readonly supplyFactStreamId: string | null;
  readonly lastSupplyFactSequence: number | null;
  readonly supplyFactCount: number;
  readonly supplyFactsHash: string;
  readonly replayIdentityHash: string;
  readonly terminalEvidenceHash: string;
}

export type ModeMatchRuntimeTerminalEvidenceV2CreateOptions = Pick<
  ModeMatchRuntimeTerminalEvidenceV2,
  | 'schemaVersion'
  | 'replay'
  | 'modeDriverContentHash'
  | 'supplyFacts'
  | 'supplyFactStreamId'
  | 'lastSupplyFactSequence'
  | 'supplyFactCount'
>;

const CREATE_KEYS = new Set([
  'schemaVersion',
  'replay',
  'modeDriverContentHash',
  'supplyFacts',
  'supplyFactStreamId',
  'lastSupplyFactSequence',
  'supplyFactCount',
]);
const EVIDENCE_KEYS = new Set([
  ...CREATE_KEYS, 'supplyFactsHash', 'replayIdentityHash', 'terminalEvidenceHash',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
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

function nullableStreamId(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError('ModeMatchRuntimeTerminalEvidenceV2.supplyFactStreamId无效。');
  }
  return value;
}

function nullableSequence(value: unknown): number | null {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError('ModeMatchRuntimeTerminalEvidenceV2.lastSupplyFactSequence无效。');
  }
  return value as number;
}

function factCount(value: unknown): number {
  if (!Number.isSafeInteger(value)
    || (value as number) < 0
    || (value as number) > ARENA_SUPPLY_AUTHORITY_FACT_MAX_RETAINED_COUNT_V1) {
    throw new RangeError('ModeMatchRuntimeTerminalEvidenceV2.supplyFactCount无效。');
  }
  return value as number;
}

function normalizeCore(value: unknown): ModeMatchRuntimeTerminalEvidenceV2CreateOptions {
  exactRecord(value, CREATE_KEYS, 'ModeMatchRuntimeTerminalEvidenceV2');
  if (value.schemaVersion !== MODE_MATCH_RUNTIME_TERMINAL_EVIDENCE_V2_SCHEMA_VERSION) {
    throw new RangeError('ModeMatchRuntimeTerminalEvidenceV2.schemaVersion必须是2。');
  }
  const replay = validateArenaReplayV6(value.replay);
  if (!Array.isArray(value.supplyFacts)
    || value.supplyFacts.length > ARENA_SUPPLY_AUTHORITY_FACT_MAX_RETAINED_COUNT_V1) {
    throw new RangeError('ModeMatchRuntimeTerminalEvidenceV2 supplyFacts超过上限。');
  }
  const supplyFacts = createArenaSupplyAuthorityFactsV1(value.supplyFacts);
  const supplyFactStreamId = nullableStreamId(value.supplyFactStreamId);
  const lastSupplyFactSequence = nullableSequence(value.lastSupplyFactSequence);
  const supplyFactCount = factCount(value.supplyFactCount);
  if (supplyFactCount !== supplyFacts.length) {
    throw new RangeError('ModeMatchRuntimeTerminalEvidenceV2供给事实数量声明不闭合。');
  }
  if (replay.config.modeKind !== 'survival') {
    if (supplyFacts.length !== 0
      || supplyFactStreamId !== null
      || lastSupplyFactSequence !== null) {
      throw new RangeError('ModeMatchRuntimeTerminalEvidenceV2非Survival不得声明供给事实。');
    }
  } else {
    const lastFact = supplyFacts.at(-1);
    if ((lastFact === undefined) !== (supplyFactStreamId === null)
      || (lastFact === undefined) !== (lastSupplyFactSequence === null)
      || (lastFact !== undefined && (
        supplyFacts[0]!.sequence !== 0
        || lastFact.streamId !== supplyFactStreamId
        || lastFact.sequence !== lastSupplyFactSequence
        || supplyFacts.some((fact) => (
          fact.streamId !== supplyFactStreamId
          || fact.modeDefinitionId !== replay.modeDefinitionId
          || fact.tick > replay.modeResult.endedAtTick
        ))
      ))) {
      throw new RangeError('ModeMatchRuntimeTerminalEvidenceV2供给事实与Replay及声明水位不闭合。');
    }
    const participants = replay.participantAssignments.map(({ participantId, modeRole }) => {
      if (modeRole !== 'player' && modeRole !== 'enemy') {
        throw new RangeError('ModeMatchRuntimeTerminalEvidenceV2 Survival参与者角色无效。');
      }
      return Object.freeze({ participantId, modeRole });
    });
    assertArenaV6SurvivalEquipmentOwnershipConsistencyV1({
      modeDefinitionId: replay.modeDefinitionId,
      participants,
      events: replay.events,
      supplyFacts,
    });
  }
  return Object.freeze({
    schemaVersion: MODE_MATCH_RUNTIME_TERMINAL_EVIDENCE_V2_SCHEMA_VERSION,
    replay,
    modeDriverContentHash: hash(
      value.modeDriverContentHash,
      'ModeMatchRuntimeTerminalEvidenceV2.modeDriverContentHash',
    ),
    supplyFacts,
    supplyFactStreamId,
    lastSupplyFactSequence,
    supplyFactCount,
  });
}

function withIdentity(core: ModeMatchRuntimeTerminalEvidenceV2CreateOptions): ModeMatchRuntimeTerminalEvidenceV2 {
  const supplyFactsHash = createDeterministicDataHash(
    core.supplyFacts,
    'ModeMatchRuntimeTerminalEvidenceV2 supply facts',
  );
  const identity = Object.freeze({
    schemaVersion: core.schemaVersion,
    replayIdentityHash: core.replay.replayIdentityHash,
    modeDriverContentHash: core.modeDriverContentHash,
    supplyFactsHash,
    supplyFactStreamId: core.supplyFactStreamId,
    lastSupplyFactSequence: core.lastSupplyFactSequence,
    supplyFactCount: core.supplyFactCount,
  });
  return Object.freeze({
    ...core,
    supplyFactsHash,
    replayIdentityHash: identity.replayIdentityHash,
    terminalEvidenceHash: createDeterministicDataHash(
      identity,
      'ModeMatchRuntimeTerminalEvidenceV2 identity',
    ),
  });
}

export function createModeMatchRuntimeTerminalEvidenceV2(value: unknown): ModeMatchRuntimeTerminalEvidenceV2 {
  return withIdentity(normalizeCore(cloneFrozenData(
    value,
    'ModeMatchRuntimeTerminalEvidenceV2 create options',
  )));
}

export function validateModeMatchRuntimeTerminalEvidenceV2(value: unknown): ModeMatchRuntimeTerminalEvidenceV2 {
  const source = cloneFrozenData(value, 'ModeMatchRuntimeTerminalEvidenceV2');
  exactRecord(source, EVIDENCE_KEYS, 'ModeMatchRuntimeTerminalEvidenceV2');
  const claimedSupplyFactsHash = hash(source.supplyFactsHash, 'ModeMatchRuntimeTerminalEvidenceV2.supplyFactsHash');
  const claimedReplayIdentityHash = hash(source.replayIdentityHash, 'ModeMatchRuntimeTerminalEvidenceV2.replayIdentityHash');
  const claimedTerminalEvidenceHash = hash(source.terminalEvidenceHash, 'ModeMatchRuntimeTerminalEvidenceV2.terminalEvidenceHash');
  const normalized = withIdentity(normalizeCore({
    schemaVersion: source.schemaVersion,
    replay: source.replay,
    modeDriverContentHash: source.modeDriverContentHash,
    supplyFacts: source.supplyFacts,
    supplyFactStreamId: source.supplyFactStreamId,
    lastSupplyFactSequence: source.lastSupplyFactSequence,
    supplyFactCount: source.supplyFactCount,
  }));
  if (normalized.supplyFactsHash !== claimedSupplyFactsHash
    || normalized.replayIdentityHash !== claimedReplayIdentityHash
    || normalized.terminalEvidenceHash !== claimedTerminalEvidenceHash) {
    throw new RangeError('ModeMatchRuntimeTerminalEvidenceV2终局identity重算不一致。');
  }
  return normalized;
}
