import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from './definition-utils.js';

export const ARENA_SUPPLY_CADENCE_SNAPSHOT_V1_SCHEMA_VERSION = 1 as const;

export interface ArenaSupplyCadenceSnapshotV1 {
  readonly schemaVersion: typeof ARENA_SUPPLY_CADENCE_SNAPSHOT_V1_SCHEMA_VERSION;
  readonly modeDefinitionId: string;
  readonly supplyDefinitionId: string;
  readonly snapshotTick: number;
  readonly nextWaveIndex: number;
  readonly nextSpawnTick: number;
  readonly remainingTicks: number;
  readonly spawnCount: number;
}

const SNAPSHOT_KEYS = new Set([
  'schemaVersion',
  'modeDefinitionId',
  'supplyDefinitionId',
  'snapshotTick',
  'nextWaveIndex',
  'nextSpawnTick',
  'remainingTicks',
  'spawnCount',
]);

function safeInteger(value: unknown, minimum: number, name: string): number {
  const result = assertIntegerAtLeast(value, minimum, name);
  if (!Number.isSafeInteger(result)) throw new RangeError(`${name}必须是安全整数。`);
  return result;
}

function identifier(value: unknown, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (result.length > 256) throw new RangeError(`${name}超过256字符。`);
  return result;
}

export function createArenaSupplyCadenceSnapshotV1(
  value: unknown,
): ArenaSupplyCadenceSnapshotV1 {
  const source = cloneFrozenData(value, 'ArenaSupplyCadenceSnapshotV1');
  assertKnownKeys(source, SNAPSHOT_KEYS, 'ArenaSupplyCadenceSnapshotV1');
  for (const key of SNAPSHOT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`ArenaSupplyCadenceSnapshotV1缺少${key}。`);
    }
  }
  if (source.schemaVersion !== ARENA_SUPPLY_CADENCE_SNAPSHOT_V1_SCHEMA_VERSION) {
    throw new RangeError('ArenaSupplyCadenceSnapshotV1.schemaVersion无效。');
  }
  const snapshotTick = safeInteger(
    source.snapshotTick,
    0,
    'ArenaSupplyCadenceSnapshotV1.snapshotTick',
  );
  const nextSpawnTick = safeInteger(
    source.nextSpawnTick,
    snapshotTick,
    'ArenaSupplyCadenceSnapshotV1.nextSpawnTick',
  );
  const remainingTicks = safeInteger(
    source.remainingTicks,
    0,
    'ArenaSupplyCadenceSnapshotV1.remainingTicks',
  );
  if (remainingTicks !== nextSpawnTick - snapshotTick) {
    throw new RangeError('ArenaSupplyCadenceSnapshotV1.remainingTicks与权威tick不闭合。');
  }
  const spawnCount = safeInteger(
    source.spawnCount,
    1,
    'ArenaSupplyCadenceSnapshotV1.spawnCount',
  );
  if (spawnCount > 3) throw new RangeError('ArenaSupplyCadenceSnapshotV1.spawnCount超过3。');
  return Object.freeze({
    schemaVersion: ARENA_SUPPLY_CADENCE_SNAPSHOT_V1_SCHEMA_VERSION,
    modeDefinitionId: identifier(
      source.modeDefinitionId,
      'ArenaSupplyCadenceSnapshotV1.modeDefinitionId',
    ),
    supplyDefinitionId: identifier(
      source.supplyDefinitionId,
      'ArenaSupplyCadenceSnapshotV1.supplyDefinitionId',
    ),
    snapshotTick,
    nextWaveIndex: safeInteger(
      source.nextWaveIndex,
      0,
      'ArenaSupplyCadenceSnapshotV1.nextWaveIndex',
    ),
    nextSpawnTick,
    remainingTicks,
    spawnCount,
  });
}
