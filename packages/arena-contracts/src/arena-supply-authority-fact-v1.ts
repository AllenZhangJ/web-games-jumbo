import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from './definition-utils.js';

export const ARENA_SUPPLY_AUTHORITY_FACT_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_SUPPLY_AUTHORITY_FACT_MAX_RETAINED_COUNT_V1 = 1_000_000 as const;

export const ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1 = Object.freeze({
  SPAWNED: 'spawned',
  PICKED_UP: 'picked-up',
  REPLACED: 'replaced',
  EXPIRED: 'expired',
} as const);

export type ArenaSupplyAuthorityFactKindV1 =
  typeof ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1[
    keyof typeof ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1
  ];

export interface ArenaSupplyAuthorityFactV1 {
  readonly schemaVersion: typeof ARENA_SUPPLY_AUTHORITY_FACT_V1_SCHEMA_VERSION;
  readonly id: string;
  readonly streamId: string;
  readonly sequence: number;
  readonly tick: number;
  readonly modeDefinitionId: string;
  readonly kind: ArenaSupplyAuthorityFactKindV1;
  readonly supplyDefinitionId: string;
  readonly supplyId: string;
  readonly equipmentInstanceId: string;
  readonly runtimeEquipmentDefinitionId: string;
  readonly collectionEquipmentDefinitionId: string;
  readonly survivalLevel: number;
  readonly participantId: string | null;
  readonly previousEquipmentInstanceId: string | null;
}

const FACT_KEYS = new Set([
  'schemaVersion',
  'id',
  'streamId',
  'sequence',
  'tick',
  'modeDefinitionId',
  'kind',
  'supplyDefinitionId',
  'supplyId',
  'equipmentInstanceId',
  'runtimeEquipmentDefinitionId',
  'collectionEquipmentDefinitionId',
  'survivalLevel',
  'participantId',
  'previousEquipmentInstanceId',
]);
const FACT_KINDS: ReadonlySet<unknown> = new Set(
  Object.values(ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1),
);
const MAX_SEQUENCE = Math.floor((Number.MAX_SAFE_INTEGER - 1) / 2);

function boundedIdentifier(value: unknown, name: string): string {
  const id = assertNonEmptyString(value, name);
  if (id.length > 256) throw new RangeError(`${name}超过256字符。`);
  return id;
}

function nullableIdentifier(value: unknown, name: string): string | null {
  return value === null ? null : boundedIdentifier(value, name);
}

export function createArenaSupplyAuthorityFactV1(
  value: unknown,
): ArenaSupplyAuthorityFactV1 {
  const source = cloneFrozenData(value, 'ArenaSupplyAuthorityFactV1');
  assertKnownKeys(source, FACT_KEYS, 'ArenaSupplyAuthorityFactV1');
  for (const key of FACT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`ArenaSupplyAuthorityFactV1缺少${key}。`);
    }
  }
  if (source.schemaVersion !== ARENA_SUPPLY_AUTHORITY_FACT_V1_SCHEMA_VERSION) {
    throw new RangeError('ArenaSupplyAuthorityFactV1.schemaVersion无效。');
  }
  if (!FACT_KINDS.has(source.kind)) {
    throw new RangeError('ArenaSupplyAuthorityFactV1.kind不受支持。');
  }
  const kind = source.kind as ArenaSupplyAuthorityFactKindV1;
  const streamId = boundedIdentifier(source.streamId, 'ArenaSupplyAuthorityFactV1.streamId');
  const sequence = assertIntegerAtLeast(
    source.sequence,
    0,
    'ArenaSupplyAuthorityFactV1.sequence',
  );
  if (sequence > MAX_SEQUENCE) {
    throw new RangeError('ArenaSupplyAuthorityFactV1.sequence超过可投影上限。');
  }
  const tick = assertIntegerAtLeast(source.tick, 0, 'ArenaSupplyAuthorityFactV1.tick');
  const participantId = nullableIdentifier(
    source.participantId,
    'ArenaSupplyAuthorityFactV1.participantId',
  );
  const previousEquipmentInstanceId = nullableIdentifier(
    source.previousEquipmentInstanceId,
    'ArenaSupplyAuthorityFactV1.previousEquipmentInstanceId',
  );
  const equipmentInstanceId = boundedIdentifier(
    source.equipmentInstanceId,
    'ArenaSupplyAuthorityFactV1.equipmentInstanceId',
  );
  if (
    (kind === ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1.SPAWNED
      || kind === ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1.EXPIRED)
    && (participantId !== null || previousEquipmentInstanceId !== null)
  ) throw new RangeError(`${kind} supply fact不能携带participant或旧装备身份。`);
  if (
    kind === ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1.PICKED_UP
    && (participantId === null || previousEquipmentInstanceId !== null)
  ) throw new RangeError('picked-up supply fact只允许participantId非空。');
  if (
    kind === ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1.REPLACED
    && (
      participantId === null
      || previousEquipmentInstanceId === null
      || previousEquipmentInstanceId === equipmentInstanceId
    )
  ) throw new RangeError('replaced supply fact的participant和旧新装备身份无效。');
  const expectedId = `${streamId}:supply-fact-v1:${sequence}:${kind}`;
  const id = boundedIdentifier(source.id, 'ArenaSupplyAuthorityFactV1.id');
  if (id !== expectedId) throw new RangeError('ArenaSupplyAuthorityFactV1.id不是canonical ID。');

  return Object.freeze({
    schemaVersion: ARENA_SUPPLY_AUTHORITY_FACT_V1_SCHEMA_VERSION,
    id,
    streamId,
    sequence,
    tick,
    modeDefinitionId: boundedIdentifier(
      source.modeDefinitionId,
      'ArenaSupplyAuthorityFactV1.modeDefinitionId',
    ),
    kind,
    supplyDefinitionId: boundedIdentifier(
      source.supplyDefinitionId,
      'ArenaSupplyAuthorityFactV1.supplyDefinitionId',
    ),
    supplyId: boundedIdentifier(source.supplyId, 'ArenaSupplyAuthorityFactV1.supplyId'),
    equipmentInstanceId,
    runtimeEquipmentDefinitionId: boundedIdentifier(
      source.runtimeEquipmentDefinitionId,
      'ArenaSupplyAuthorityFactV1.runtimeEquipmentDefinitionId',
    ),
    collectionEquipmentDefinitionId: boundedIdentifier(
      source.collectionEquipmentDefinitionId,
      'ArenaSupplyAuthorityFactV1.collectionEquipmentDefinitionId',
    ),
    survivalLevel: assertIntegerAtLeast(
      source.survivalLevel,
      1,
      'ArenaSupplyAuthorityFactV1.survivalLevel',
    ),
    participantId,
    previousEquipmentInstanceId,
  });
}

export function createArenaSupplyAuthorityFactsV1(
  value: unknown,
): readonly ArenaSupplyAuthorityFactV1[] {
  if (!Array.isArray(value)) throw new TypeError('ArenaSupplyAuthorityFactsV1必须是数组。');
  if (value.length > ARENA_SUPPLY_AUTHORITY_FACT_MAX_RETAINED_COUNT_V1) {
    throw new RangeError('ArenaSupplyAuthorityFactsV1超过长期对局保留上限。');
  }
  const facts = value.map(createArenaSupplyAuthorityFactV1);
  const ids = new Set<string>();
  for (let index = 0; index < facts.length; index += 1) {
    const fact = facts[index]!;
    if (ids.has(fact.id)) throw new RangeError(`Arena supply fact id重复：${fact.id}。`);
    ids.add(fact.id);
    if (index > 0) {
      const previous = facts[index - 1]!;
      if (fact.streamId !== previous.streamId || fact.sequence !== previous.sequence + 1) {
        throw new RangeError('Arena supply facts必须属于同一stream且sequence连续。');
      }
      if (fact.tick < previous.tick) throw new RangeError('Arena supply facts tick不能倒退。');
    }
  }
  return Object.freeze(facts);
}
