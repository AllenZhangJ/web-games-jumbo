import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  validateArenaReplayV6,
  type ArenaReplayV6,
} from './replay-v6.js';

export const MODE_MATCH_RUNTIME_TERMINAL_EVIDENCE_V1_SCHEMA_VERSION = 1 as const;

/**
 * Terminal proof emitted by the runtime that owns both the committed Replay
 * and the concrete Mode Driver. Replay V6 intentionally keeps the stable mode
 * policy identity; this envelope additionally binds the normalized driver
 * content that actually resolved the match.
 */
export interface ModeMatchRuntimeTerminalEvidenceV1 {
  readonly schemaVersion:
    typeof MODE_MATCH_RUNTIME_TERMINAL_EVIDENCE_V1_SCHEMA_VERSION;
  readonly replay: ArenaReplayV6;
  readonly modeDriverContentHash: string;
  readonly replayIdentityHash: string;
  readonly terminalEvidenceHash: string;
}

export type ModeMatchRuntimeTerminalEvidenceV1CreateOptions = Pick<
  ModeMatchRuntimeTerminalEvidenceV1,
  'schemaVersion' | 'replay' | 'modeDriverContentHash'
>;

const CREATE_KEYS = new Set([
  'schemaVersion',
  'replay',
  'modeDriverContentHash',
]);
const EVIDENCE_KEYS = new Set([
  ...CREATE_KEYS,
  'replayIdentityHash',
  'terminalEvidenceHash',
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

function normalizeCore(
  value: unknown,
): ModeMatchRuntimeTerminalEvidenceV1CreateOptions {
  exactRecord(value, CREATE_KEYS, 'ModeMatchRuntimeTerminalEvidenceV1');
  if (value.schemaVersion !== MODE_MATCH_RUNTIME_TERMINAL_EVIDENCE_V1_SCHEMA_VERSION) {
    throw new RangeError('ModeMatchRuntimeTerminalEvidenceV1.schemaVersion必须是1。');
  }
  return Object.freeze({
    schemaVersion: MODE_MATCH_RUNTIME_TERMINAL_EVIDENCE_V1_SCHEMA_VERSION,
    replay: validateArenaReplayV6(value.replay),
    modeDriverContentHash: hash(
      value.modeDriverContentHash,
      'ModeMatchRuntimeTerminalEvidenceV1.modeDriverContentHash',
    ),
  });
}

function withIdentity(
  core: ModeMatchRuntimeTerminalEvidenceV1CreateOptions,
): ModeMatchRuntimeTerminalEvidenceV1 {
  const identity = Object.freeze({
    schemaVersion: core.schemaVersion,
    replayIdentityHash: core.replay.replayIdentityHash,
    modeDriverContentHash: core.modeDriverContentHash,
  });
  return Object.freeze({
    ...core,
    replayIdentityHash: identity.replayIdentityHash,
    terminalEvidenceHash: createDeterministicDataHash(
      identity,
      'ModeMatchRuntimeTerminalEvidenceV1 identity',
    ),
  });
}

export function createModeMatchRuntimeTerminalEvidenceV1(
  value: unknown,
): ModeMatchRuntimeTerminalEvidenceV1 {
  const source = cloneFrozenData(
    value,
    'ModeMatchRuntimeTerminalEvidenceV1 create options',
  );
  return withIdentity(normalizeCore(source));
}

export function validateModeMatchRuntimeTerminalEvidenceV1(
  value: unknown,
): ModeMatchRuntimeTerminalEvidenceV1 {
  const source = cloneFrozenData(value, 'ModeMatchRuntimeTerminalEvidenceV1');
  exactRecord(source, EVIDENCE_KEYS, 'ModeMatchRuntimeTerminalEvidenceV1');
  const expectedReplayIdentityHash = hash(
    source.replayIdentityHash,
    'ModeMatchRuntimeTerminalEvidenceV1.replayIdentityHash',
  );
  const expectedTerminalEvidenceHash = hash(
    source.terminalEvidenceHash,
    'ModeMatchRuntimeTerminalEvidenceV1.terminalEvidenceHash',
  );
  const normalized = withIdentity(normalizeCore({
    schemaVersion: source.schemaVersion,
    replay: source.replay,
    modeDriverContentHash: source.modeDriverContentHash,
  }));
  if (
    normalized.replayIdentityHash !== expectedReplayIdentityHash
    || normalized.terminalEvidenceHash !== expectedTerminalEvidenceHash
  ) {
    throw new RangeError('ModeMatchRuntimeTerminalEvidenceV1终局identity重算不一致。');
  }
  return normalized;
}
