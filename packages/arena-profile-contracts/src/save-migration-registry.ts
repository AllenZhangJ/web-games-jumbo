import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import { PlayerProfileFutureSchemaError } from './profile-persistence-errors.js';

export interface SaveMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly migrate: (payload: Readonly<Record<string, unknown>>) => unknown;
}

export interface SaveMigrationRegistryData {
  readonly currentVersion: number;
  readonly migrations?: readonly SaveMigration[];
}

const MIGRATION_KEYS = new Set(['fromVersion', 'toVersion', 'migrate']);
const REGISTRY_KEYS = new Set(['currentVersion', 'migrations']);

function createMigration(value: unknown, index: number): SaveMigration {
  const name = `SaveMigrationRegistry.migrations[${index}]`;
  assertKnownKeys(value, MIGRATION_KEYS, name);
  const fromVersion = assertIntegerAtLeast(value.fromVersion, 1, `${name}.fromVersion`);
  const toVersion = assertIntegerAtLeast(value.toVersion, 2, `${name}.toVersion`);
  if (toVersion !== fromVersion + 1) throw new RangeError(`${name} 只能迁移到相邻 schema。`);
  if (typeof value.migrate !== 'function') throw new TypeError(`${name}.migrate 必须是函数。`);
  return Object.freeze({
    fromVersion,
    toVersion,
    migrate: value.migrate as SaveMigration['migrate'],
  });
}

function cloneMigrations(values: unknown): readonly SaveMigration[] {
  if (!Array.isArray(values)) throw new TypeError('SaveMigrationRegistry.migrations 必须是数组。');
  const expectedKeys = new Set(['length']);
  for (let index = 0; index < values.length; index += 1) expectedKeys.add(String(index));
  const keys = Reflect.ownKeys(values);
  if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError('SaveMigrationRegistry.migrations 不能包含空槽、Symbol 或额外字段。');
  }
  return Object.freeze(Array.from({ length: values.length }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      throw new TypeError(`SaveMigrationRegistry.migrations[${index}] 必须是数据字段。`);
    }
    return createMigration(descriptor.value, index);
  }));
}

function asPayload(value: unknown, name: string): Readonly<Record<string, unknown>> {
  return assertPlainRecord(value, name);
}

function runMigration(
  migration: SaveMigration,
  payload: Readonly<Record<string, unknown>>,
  name: string,
): Readonly<Record<string, unknown>> {
  const firstInput = asPayload(cloneFrozenData(payload, `${name} input 1`), `${name} input 1`);
  const secondInput = asPayload(cloneFrozenData(payload, `${name} input 2`), `${name} input 2`);
  const first = asPayload(cloneFrozenData(migration.migrate(firstInput), `${name} output 1`), `${name} output 1`);
  const second = asPayload(cloneFrozenData(migration.migrate(secondInput), `${name} output 2`), `${name} output 2`);
  if (
    createDeterministicDataHash(first, `${name} output 1`)
    !== createDeterministicDataHash(second, `${name} output 2`)
  ) throw new Error(`${name} 不是确定性迁移。`);
  if (first.schemaVersion !== migration.toVersion) {
    throw new RangeError(`${name} 输出 schemaVersion 必须是 ${migration.toVersion}。`);
  }
  return first;
}

export class SaveMigrationRegistry {
  readonly #currentVersion: number;
  readonly #byVersion: ReadonlyMap<number, SaveMigration>;

  constructor(value: SaveMigrationRegistryData) {
    assertKnownKeys(value, REGISTRY_KEYS, 'SaveMigrationRegistry');
    const currentVersion = assertIntegerAtLeast(
      value.currentVersion,
      1,
      'SaveMigrationRegistry.currentVersion',
    );
    const migrations = value.migrations === undefined ? [] : value.migrations;
    const byVersion = new Map<number, SaveMigration>();
    cloneMigrations(migrations).forEach((migration) => {
      if (migration.toVersion > currentVersion) throw new RangeError('SaveMigrationRegistry 不能注册超出当前 schema 的迁移。');
      if (byVersion.has(migration.fromVersion)) throw new RangeError(`重复的存档迁移 schema ${migration.fromVersion}。`);
      byVersion.set(migration.fromVersion, migration);
    });
    for (let version = 1; version < currentVersion; version += 1) {
      if (!byVersion.has(version)) throw new RangeError(`缺少存档迁移 ${version} → ${version + 1}。`);
    }
    this.#currentVersion = currentVersion;
    this.#byVersion = byVersion;
    Object.freeze(this);
  }

  getCurrentVersion(): number {
    return this.#currentVersion;
  }

  migrate(payloadValue: unknown, sourceVersionValue: unknown): Readonly<Record<string, unknown>> {
    const sourceVersion = assertIntegerAtLeast(sourceVersionValue, 1, 'SaveMigrationRegistry.sourceVersion');
    if (sourceVersion > this.#currentVersion) throw new PlayerProfileFutureSchemaError();
    let payload = asPayload(cloneFrozenData(payloadValue, 'SaveMigrationRegistry payload'), 'SaveMigrationRegistry payload');
    if (payload.schemaVersion !== sourceVersion) {
      throw new RangeError('存档 payload schemaVersion 与 envelope 不一致。');
    }
    for (let version = sourceVersion; version < this.#currentVersion; version += 1) {
      const migration = this.#byVersion.get(version);
      if (!migration) throw new RangeError(`没有可用的存档迁移 ${version} → ${version + 1}。`);
      payload = runMigration(migration, payload, `存档迁移 ${version} → ${version + 1}`);
    }
    return payload;
  }
}

export function createSaveMigrationRegistry(value: unknown): SaveMigrationRegistry {
  return value instanceof SaveMigrationRegistry
    ? value
    : new SaveMigrationRegistry(value as SaveMigrationRegistryData);
}
