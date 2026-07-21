import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { PlayerProfileFutureSchemaError } from './profile-persistence-errors.js';

const MIGRATION_KEYS = new Set(['fromVersion', 'toVersion', 'migrate']);
const REGISTRY_KEYS = new Set(['currentVersion', 'migrations']);

function createMigration(value, index) {
  const name = `SaveMigrationRegistry.migrations[${index}]`;
  assertKnownKeys(value, MIGRATION_KEYS, name);
  const fromVersion = assertIntegerAtLeast(value.fromVersion, 1, `${name}.fromVersion`);
  const toVersion = assertIntegerAtLeast(value.toVersion, 2, `${name}.toVersion`);
  if (toVersion !== fromVersion + 1) {
    throw new RangeError(`${name} 只能迁移到相邻 schema。`);
  }
  if (typeof value.migrate !== 'function') throw new TypeError(`${name}.migrate 必须是函数。`);
  return Object.freeze({ fromVersion, toVersion, migrate: value.migrate });
}

function cloneMigrations(values) {
  if (!Array.isArray(values)) throw new TypeError('SaveMigrationRegistry.migrations 必须是数组。');
  const expectedKeys = new Set(['length']);
  for (let index = 0; index < values.length; index += 1) expectedKeys.add(String(index));
  const keys = Reflect.ownKeys(values);
  if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError('SaveMigrationRegistry.migrations 不能包含空槽、Symbol 或额外字段。');
  }
  return Array.from({ length: values.length }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (
      !descriptor
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) throw new TypeError(`SaveMigrationRegistry.migrations[${index}] 必须是数据字段。`);
    return createMigration(descriptor.value, index);
  });
}

function runMigration(migration, payload, name) {
  const first = cloneFrozenData(
    migration.migrate(cloneFrozenData(payload, `${name} input 1`)),
    `${name} output 1`,
  );
  const second = cloneFrozenData(
    migration.migrate(cloneFrozenData(payload, `${name} input 2`)),
    `${name} output 2`,
  );
  const firstHash = createDeterministicDataHash(first, `${name} output 1`);
  const secondHash = createDeterministicDataHash(second, `${name} output 2`);
  if (firstHash !== secondHash) throw new Error(`${name} 不是确定性迁移。`);
  if (first.schemaVersion !== migration.toVersion) {
    throw new RangeError(`${name} 输出 schemaVersion 必须是 ${migration.toVersion}。`);
  }
  return first;
}

export class SaveMigrationRegistry {
  #currentVersion;
  #byVersion;

  constructor(value) {
    assertKnownKeys(value, REGISTRY_KEYS, 'SaveMigrationRegistry');
    const { currentVersion: currentVersionValue, migrations = [] } = value;
    const currentVersion = assertIntegerAtLeast(
      currentVersionValue,
      1,
      'SaveMigrationRegistry.currentVersion',
    );
    const byVersion = new Map();
    cloneMigrations(migrations).forEach((migration) => {
      if (migration.toVersion > currentVersion) {
        throw new RangeError('SaveMigrationRegistry 不能注册超出当前 schema 的迁移。');
      }
      if (byVersion.has(migration.fromVersion)) {
        throw new RangeError(`重复的存档迁移 schema ${migration.fromVersion}。`);
      }
      byVersion.set(migration.fromVersion, migration);
    });
    for (let version = 1; version < currentVersion; version += 1) {
      if (!byVersion.has(version)) throw new RangeError(`缺少存档迁移 ${version} → ${version + 1}。`);
    }
    this.#currentVersion = currentVersion;
    this.#byVersion = byVersion;
    Object.freeze(this);
  }

  getCurrentVersion() {
    return this.#currentVersion;
  }

  migrate(payloadValue, sourceVersionValue) {
    const sourceVersion = assertIntegerAtLeast(
      sourceVersionValue,
      1,
      'SaveMigrationRegistry.sourceVersion',
    );
    if (sourceVersion > this.#currentVersion) throw new PlayerProfileFutureSchemaError();
    let payload = cloneFrozenData(payloadValue, 'SaveMigrationRegistry payload');
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

export function createSaveMigrationRegistry(value) {
  return value instanceof SaveMigrationRegistry ? value : new SaveMigrationRegistry(value);
}
