import {
  ARENA_MATCH_READ_PROFILE,
  createDeterministicDataHash,
  cloneFrozenData,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  type ArenaMatchReadProfile,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_MATCH_PHASE,
  type ArenaMatchPhase,
} from './match-config.js';

const BINDING_DESCRIPTOR_SCHEMA_VERSION = 1 as const;
const HASH_PATTERN = /^[0-9a-f]{8}$/;
const PROFILE_VALUES = new Set<ArenaMatchReadProfile>([
  ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY,
  ARENA_MATCH_READ_PROFILE.BOT_MOBILITY,
  ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
]);
const DESCRIPTOR_KEYS = new Set([
  'schemaVersion',
  'compositionId',
  'participantIds',
  'mapDefinitionId',
  'contentSelectionHash',
  'compositionContractHash',
]);

export interface MatchReadBinding {
  readonly __arenaMatchReadBinding?: never;
}

export interface MatchReadIdentityMemo {
  readonly kind: 'match-read-identity';
  readonly schemaVersion: typeof BINDING_DESCRIPTOR_SCHEMA_VERSION;
  readonly compositionHash: string;
  readonly generation: number;
  readonly tick: number;
  readonly eventSequence: number;
  readonly phase: ArenaMatchPhase;
  readonly participantId: string;
  readonly profile: ArenaMatchReadProfile;
  readonly worldIdentity: DeepReadonly<{
    readonly kind: 'world-read-identity';
    readonly generation: number;
    readonly tick: number;
    readonly eventSequence: number;
    readonly phase: ArenaMatchPhase;
  }>;
}

export interface MatchReadReader {
  read(): DeepReadonly<MatchReadIdentityMemo>;
}

interface MatchReadAuthorityIdentity {
  readonly generation: number;
  readonly tick: number;
  readonly eventSequence: number;
  readonly phase: ArenaMatchPhase;
}

/** Internal owner-port shape; it is intentionally not re-exported by arena-match/index. */
export interface MatchReadOwnerPort {
  readonly owner: object;
  readonly participantIds: readonly string[];
  readonly mapDefinitionId: string;
  readonly contentSelectionHash: string | null;
  readonly configHash: string;
  readonly authorityContentHash: string;
  readonly generation: number;
  readonly readIdentity: (
    participantId: string,
    profile: ArenaMatchReadProfile,
  ) => MatchReadAuthorityIdentity;
}

interface MatchReadBindingRecord {
  readonly ownerPort: MatchReadOwnerPort;
  readonly generation: number;
  readonly compositionId: string;
  readonly participantIds: readonly string[];
  readonly mapDefinitionId: string;
  readonly contentSelectionHash: string | null;
  readonly compositionContractHash: string | null;
  readonly configHash: string;
  readonly authorityContentHash: string;
  readonly compositionHash: string;
  readonly readers: Map<string, MatchReadReader>;
  readonly readerMemos: Map<string, DeepReadonly<MatchReadIdentityMemo>>;
  valid: boolean;
  reading: boolean;
  currentWorldMemo: MatchReadIdentityMemo['worldIdentity'] | null;
}

const OWNER_PORTS = new WeakSet<object>();
const OWNER_BINDINGS = new WeakMap<object, object>();
const BINDINGS = new WeakMap<object, MatchReadBindingRecord>();
const BINDING_CREATION_PORTS = new WeakSet<object>();

function requireRecord(value: unknown, name: string): Record<string, unknown> {
  return assertPlainRecord(value, name);
}

function requireOwnKeys(
  value: object,
  requiredKeys: ReadonlySet<string>,
  name: string,
): void {
  for (const key of requiredKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
}

function requireHash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是 8 位小写十六进制 hash。`);
  }
  return value;
}

function requireParticipantIds(value: unknown, expected: readonly string[]): readonly string[] {
  if (!Array.isArray(value) || value.length !== expected.length) {
    throw new RangeError('MatchReadBinding participantIds 必须与 Core 配置长度一致。');
  }
  const ids = value.map((participantId, index) => (
    assertNonEmptyString(participantId, `MatchReadBinding participantIds[${index}]`)
  ));
  if (new Set(ids).size !== ids.length) {
    throw new RangeError('MatchReadBinding participantIds 不能重复。');
  }
  if (ids.some((participantId, index) => participantId !== expected[index])) {
    throw new RangeError('MatchReadBinding participantIds 必须与 Core 配置顺序完全一致。');
  }
  return Object.freeze(ids);
}

function normalizeDescriptor(
  value: unknown,
  ownerPort: MatchReadOwnerPort,
): Readonly<{
  readonly schemaVersion: 1;
  readonly compositionId: string;
  readonly participantIds: readonly string[];
  readonly mapDefinitionId: string;
  readonly contentSelectionHash: string | null;
  readonly compositionContractHash: string | null;
}> {
  const cloned = cloneFrozenData(value, 'MatchReadBinding descriptor');
  const source = requireRecord(cloned, 'MatchReadBinding descriptor');
  assertKnownKeys(source, DESCRIPTOR_KEYS, 'MatchReadBinding descriptor');
  requireOwnKeys(source, new Set([
    'schemaVersion',
    'compositionId',
    'participantIds',
    'mapDefinitionId',
    'contentSelectionHash',
  ]), 'MatchReadBinding descriptor');
  if (source.schemaVersion !== BINDING_DESCRIPTOR_SCHEMA_VERSION) {
    throw new RangeError('MatchReadBinding descriptor schemaVersion 必须是 1。');
  }
  const compositionId = assertNonEmptyString(source.compositionId, 'MatchReadBinding compositionId');
  const participantIds = requireParticipantIds(source.participantIds, ownerPort.participantIds);
  const mapDefinitionId = assertNonEmptyString(
    source.mapDefinitionId,
    'MatchReadBinding mapDefinitionId',
  );
  if (mapDefinitionId !== ownerPort.mapDefinitionId) {
    throw new RangeError('MatchReadBinding mapDefinitionId 与 Core 配置不一致。');
  }
  const contentSelectionHash = source.contentSelectionHash;
  if (contentSelectionHash !== null && typeof contentSelectionHash !== 'string') {
    throw new TypeError('MatchReadBinding contentSelectionHash 必须是字符串或 null。');
  }
  if (contentSelectionHash !== ownerPort.contentSelectionHash) {
    throw new RangeError('MatchReadBinding contentSelectionHash 与 Core 配置不一致。');
  }
  const compositionContractHash = source.compositionContractHash === undefined
    || source.compositionContractHash === null
    ? null
    : requireHash(source.compositionContractHash, 'MatchReadBinding compositionContractHash');
  return Object.freeze({
    schemaVersion: BINDING_DESCRIPTOR_SCHEMA_VERSION,
    compositionId,
    participantIds,
    mapDefinitionId,
    contentSelectionHash,
    compositionContractHash,
  });
}

function requireOwnerPort(value: MatchReadOwnerPort): MatchReadOwnerPort {
  if (
    value === null
    || typeof value !== 'object'
    || !OWNER_PORTS.has(value as unknown as object)
  ) throw new TypeError('MatchRead owner port provenance 无效。');
  return value;
}

function requireProfile(value: unknown): ArenaMatchReadProfile {
  if (typeof value !== 'string' || !PROFILE_VALUES.has(value as ArenaMatchReadProfile)) {
    throw new RangeError('MatchRead reader profile 不受支持。');
  }
  return value as ArenaMatchReadProfile;
}

function normalizeAuthorityIdentity(
  value: unknown,
  expectedGeneration: number,
): MatchReadAuthorityIdentity {
  const source = assertPlainRecord(value, 'MatchRead authority identity');
  const keys = new Set(['generation', 'tick', 'eventSequence', 'phase']);
  assertKnownKeys(source, keys, 'MatchRead authority identity');
  requireOwnKeys(source, keys, 'MatchRead authority identity');
  if (
    !Number.isSafeInteger(source.generation)
    || !Number.isSafeInteger(source.tick)
    || !Number.isSafeInteger(source.eventSequence)
    || (source.generation as number) < 1
    || (source.tick as number) < 0
    || (source.eventSequence as number) < 0
  ) throw new RangeError('MatchRead authority identity 必须是非负安全整数。');
  if (source.generation !== expectedGeneration) {
    throw new RangeError('MatchRead authority identity generation 与 binding 不一致。');
  }
  if (!Object.values(ARENA_MATCH_PHASE).includes(source.phase as ArenaMatchPhase)) {
    throw new RangeError('MatchRead authority identity phase 不受支持。');
  }
  return Object.freeze({
    generation: source.generation as number,
    tick: source.tick as number,
    eventSequence: source.eventSequence as number,
    phase: source.phase as ArenaMatchPhase,
  });
}

function assertRecordOwnerHashes(record: MatchReadBindingRecord): void {
  if (
    record.configHash !== requireHash(record.ownerPort.configHash, 'MatchRead owner configHash')
    || record.authorityContentHash !== requireHash(
      record.ownerPort.authorityContentHash,
      'MatchRead owner authorityContentHash',
    )
    || record.contentSelectionHash !== record.ownerPort.contentSelectionHash
  ) throw new RangeError('MatchRead binding owner hash/context 已漂移。');
}

function requireBinding(value: unknown): MatchReadBindingRecord {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError('MatchRead binding 必须是 opaque object。');
  }
  const record = BINDINGS.get(value as object);
  if (record === undefined || !record.valid) {
    throw new TypeError('MatchRead binding provenance 无效或已失效。');
  }
  return record;
}

function readerKey(participantId: string, profile: ArenaMatchReadProfile): string {
  return `${participantId}\u0000${profile}`;
}

function sameIdentity(
  left: MatchReadIdentityMemo['worldIdentity'] | null,
  right: MatchReadAuthorityIdentity,
): boolean {
  return left !== null
    && left.generation === right.generation
    && left.tick === right.tick
    && left.eventSequence === right.eventSequence
    && left.phase === right.phase;
}

function createReader(
  record: MatchReadBindingRecord,
  participantId: string,
  profile: ArenaMatchReadProfile,
): MatchReadReader {
  const key = readerKey(participantId, profile);
  if (record.readers.has(key)) {
    throw new RangeError('MatchRead reader participant/profile 已绑定且不支持 replacement。');
  }
  const reader = Object.freeze({
    read(this: unknown, ...args: never[]): DeepReadonly<MatchReadIdentityMemo> {
      if (args.length !== 0) throw new TypeError('MatchRead reader.read() 不接受参数。');
      if (!record.valid) throw new Error('MatchRead reader owner 已失效。');
      if (record.reading) throw new Error('MatchRead reader.read() 不可重入。');
      record.reading = true;
      try {
        const identity = normalizeAuthorityIdentity(
          record.ownerPort.readIdentity(participantId, profile),
          record.generation,
        );
        const worldIdentity = sameIdentity(record.currentWorldMemo, identity)
          ? record.currentWorldMemo as MatchReadIdentityMemo['worldIdentity']
          : Object.freeze({
            kind: 'world-read-identity' as const,
            generation: identity.generation,
            tick: identity.tick,
            eventSequence: identity.eventSequence,
            phase: identity.phase,
          });
        const previous = record.readerMemos.get(key);
        if (
          previous !== undefined
          && previous.worldIdentity === worldIdentity
        ) return previous;
        const memo = Object.freeze({
          kind: 'match-read-identity' as const,
          schemaVersion: BINDING_DESCRIPTOR_SCHEMA_VERSION,
          compositionHash: record.compositionHash,
          generation: identity.generation,
          tick: identity.tick,
          eventSequence: identity.eventSequence,
          phase: identity.phase,
          participantId,
          profile,
          worldIdentity,
        });
        // Construct and freeze the complete candidate before publishing either
        // identity. A failing identity/memo build must leave the prior memo
        // graph untouched.
        if (record.currentWorldMemo !== worldIdentity) {
          record.currentWorldMemo = worldIdentity;
        }
        record.readerMemos.set(key, memo);
        return memo;
      } finally {
        record.reading = false;
      }
    },
  });
  record.readers.set(key, reader);
  return reader;
}

/** Internal Core-only owner port registration; not exported from the package index. */
export function createMatchReadOwnerPort(options: {
  readonly owner: object;
  readonly participantIds: readonly string[];
  readonly mapDefinitionId: string;
  readonly contentSelectionHash: string | null;
  readonly configHash: string;
  readonly authorityContentHash: string;
  readonly readIdentity: MatchReadOwnerPort['readIdentity'];
}): MatchReadOwnerPort {
  if (options === null || typeof options !== 'object') {
    throw new TypeError('MatchRead owner port options 无效。');
  }
  const port = Object.freeze({
    owner: options.owner,
    participantIds: Object.freeze([...options.participantIds]),
    mapDefinitionId: options.mapDefinitionId,
    contentSelectionHash: options.contentSelectionHash,
    configHash: options.configHash,
    authorityContentHash: options.authorityContentHash,
    generation: 1,
    readIdentity: options.readIdentity,
  });
  OWNER_PORTS.add(port);
  return port;
}

/** Internal Core-only binding factory; the opaque binding itself is the public capability. */
export function createMatchReadBindingForOwner(
  ownerPortValue: MatchReadOwnerPort,
  descriptor: unknown,
): MatchReadBinding {
  const ownerPort = requireOwnerPort(ownerPortValue);
  if (BINDING_CREATION_PORTS.has(ownerPort)) {
    throw new Error('MatchRead binding 创建不可重入。');
  }
  BINDING_CREATION_PORTS.add(ownerPort);
  try {
    if (OWNER_BINDINGS.has(ownerPort)) {
      throw new RangeError('每个 MatchCore 只允许创建一次 MatchRead binding。');
    }
    const normalized = normalizeDescriptor(descriptor, ownerPort);
    const compositionHash = createDeterministicDataHash({
      schemaVersion: normalized.schemaVersion,
      compositionId: normalized.compositionId,
      participantIds: normalized.participantIds,
      mapDefinitionId: normalized.mapDefinitionId,
      contentSelectionHash: normalized.contentSelectionHash,
      compositionContractHash: normalized.compositionContractHash,
      configHash: requireHash(ownerPort.configHash, 'MatchRead Core configHash'),
      authorityContentHash: requireHash(
        ownerPort.authorityContentHash,
        'MatchRead Core authorityContentHash',
      ),
    }, 'MatchRead composition binding');
    const binding = Object.freeze(Object.create(null)) as MatchReadBinding;
    const record: MatchReadBindingRecord = {
      ownerPort,
      generation: ownerPort.generation,
      compositionId: normalized.compositionId,
      participantIds: normalized.participantIds,
      mapDefinitionId: normalized.mapDefinitionId,
      contentSelectionHash: normalized.contentSelectionHash,
      compositionContractHash: normalized.compositionContractHash,
      configHash: ownerPort.configHash,
      authorityContentHash: ownerPort.authorityContentHash,
      compositionHash,
      readers: new Map(),
      readerMemos: new Map(),
      valid: true,
      reading: false,
      currentWorldMemo: null,
    };
    BINDINGS.set(binding as object, record);
    OWNER_BINDINGS.set(ownerPort, binding as object);
    return binding;
  } finally {
    BINDING_CREATION_PORTS.delete(ownerPort);
  }
}

function createReaderForBinding(
  binding: MatchReadBinding,
  participantId: string,
  profile: ArenaMatchReadProfile,
): MatchReadReader {
  const record = requireBinding(binding);
  assertRecordOwnerHashes(record);
  if (typeof participantId !== 'string' || !record.ownerPort.participantIds.includes(participantId)) {
    throw new RangeError('MatchRead reader participantId 未注册。');
  }
  return createReader(record, participantId, requireProfile(profile));
}

/** Internal Core-only reader factory used to enforce cross-Core ownership. */
export function createMatchReadReaderForOwner(
  ownerPortValue: MatchReadOwnerPort,
  binding: MatchReadBinding,
  participantId: string,
  profile: ArenaMatchReadProfile,
): MatchReadReader {
  const ownerPort = requireOwnerPort(ownerPortValue);
  const record = requireBinding(binding);
  assertRecordOwnerHashes(record);
  if (record.ownerPort !== ownerPort) {
    throw new RangeError('MatchRead binding 与当前 MatchCore 不一致。');
  }
  return createReaderForBinding(binding, participantId, profile);
}

export function invalidateMatchReadOwner(ownerPortValue: MatchReadOwnerPort | null): void {
  if (ownerPortValue === null || !OWNER_PORTS.has(ownerPortValue)) return;
  const binding = OWNER_BINDINGS.get(ownerPortValue);
  if (binding === undefined) return;
  const record = BINDINGS.get(binding);
  if (record === undefined || !record.valid) return;
  record.valid = false;
  record.currentWorldMemo = null;
  record.readerMemos.clear();
  record.readers.clear();
}
