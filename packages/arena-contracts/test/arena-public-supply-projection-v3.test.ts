import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS,
  ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION,
  assertArenaPublicSupplyProjectionV3ResyncReady,
  createArenaPublicSupplyProjectionV3Audit,
  requireArenaPublicSupplyProjectionV3,
  type ArenaPublicSupplyProjectionV3AuditOptions,
  type ArenaPublicWorldSupplyIdentityV3,
} from '../src/arena-public-supply-projection-v3.js';

type DataRecord = Record<string, unknown>;

const MODE_ID = 'arena.mode.survival.test.v1';
const SUPPLY_DEFINITION_ID = 'arena.supply.survival.test.v1';
const TIER_POLICY_ID = 'arena.mode.survival.policy.tier.test.v1';
const SPAWN_TICK = 1_200;
const EXPIRE_TICK = 1_800;

function identity(slotOrdinal: number): ArenaPublicWorldSupplyIdentityV3 {
  const slotId = `supply-slot-${slotOrdinal}.test`;
  return {
    modeDefinitionId: MODE_ID,
    supplyDefinitionId: SUPPLY_DEFINITION_ID,
    tierPolicyDefinitionId: TIER_POLICY_ID,
    supplyId: `${SUPPLY_DEFINITION_ID}:wave-0:${slotId}`,
    slotId,
    waveIndex: 0,
    survivalLevel: 1,
    collectionEquipmentDefinitionId: `collection-${slotOrdinal}.test`,
    runtimeEquipmentDefinitionId: `runtime-${slotOrdinal}.level-1.test`,
    equipmentInstanceId: `${SUPPLY_DEFINITION_ID}:wave-0:${slotId}:equipment`,
    equipmentSpawnId: `spawn-${slotOrdinal}.test`,
    spawnPosition: { x: slotOrdinal * 2, y: 1, z: 0 },
    spawnTick: SPAWN_TICK,
    expireTick: EXPIRE_TICK,
  };
}

function identities(): ArenaPublicWorldSupplyIdentityV3[] {
  return [identity(1), identity(2), identity(3)];
}

function worldEquipmentFor(
  values: readonly ArenaPublicWorldSupplyIdentityV3[],
  locationState: 'spawned' | 'dropped' | 'despawned' = 'spawned',
): DataRecord[] {
  return values.map((value) => ({
    schemaVersion: 3,
    instanceId: value.equipmentInstanceId,
    runtimeEquipmentDefinitionId: value.runtimeEquipmentDefinitionId,
    collectionEquipmentDefinitionId: value.collectionEquipmentDefinitionId,
    survivalLevel: value.survivalLevel,
    spawnId: value.equipmentSpawnId,
    locationState,
    ownerId: null,
    position: locationState === 'despawned'
      ? null
      : { x: value.spawnPosition.x + 0.5, y: value.spawnPosition.y, z: value.spawnPosition.z },
    lastSafePosition: value.spawnPosition,
    cooldownRemainingTicks: 0,
    revision: 1,
  }));
}

function options(
  snapshotTick: number,
  expectedWorldSupplyIdentities: readonly ArenaPublicWorldSupplyIdentityV3[],
  worldSupplyEquipment = worldEquipmentFor(expectedWorldSupplyIdentities),
): ArenaPublicSupplyProjectionV3AuditOptions {
  return {
    modeDefinitionId: MODE_ID,
    snapshotTick,
    eventSequence: 41,
    worldSupplyEquipment,
    expectedWorldSupplyIdentities,
  };
}

function item(
  value: ArenaPublicWorldSupplyIdentityV3,
  snapshotTick: number,
  equipment: DataRecord,
): DataRecord {
  return {
    schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION,
    supplyDefinitionId: value.supplyDefinitionId,
    tierPolicyDefinitionId: value.tierPolicyDefinitionId,
    supplyId: value.supplyId,
    slotId: value.slotId,
    waveIndex: value.waveIndex,
    survivalLevel: value.survivalLevel,
    collectionEquipmentDefinitionId: value.collectionEquipmentDefinitionId,
    runtimeEquipmentDefinitionId: value.runtimeEquipmentDefinitionId,
    equipmentInstanceId: value.equipmentInstanceId,
    equipmentSpawnId: value.equipmentSpawnId,
    spawnPosition: value.spawnPosition,
    spawnTick: value.spawnTick,
    expireTick: value.expireTick,
    remainingTicks: value.expireTick - snapshotTick,
    position: equipment.position,
  };
}

function activeProjection(
  snapshotTick = EXPIRE_TICK - 1,
  values = identities(),
  equipment = worldEquipmentFor(values),
): DataRecord {
  return {
    schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION,
    modeDefinitionId: MODE_ID,
    snapshotTick,
    snapshotEventSequence: 41,
    resyncReadiness: ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS.READY,
    pendingAuthorityTick: null,
    pendingExpiryEquipmentInstanceIds: [],
    supplies: values.map((value, index) => item(value, snapshotTick, equipment[index]!)),
  };
}

function pendingProjection(values = identities()): DataRecord {
  return {
    schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION,
    modeDefinitionId: MODE_ID,
    snapshotTick: EXPIRE_TICK,
    snapshotEventSequence: 41,
    resyncReadiness: ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS.NOT_READY_PRE_EXPIRY,
    pendingAuthorityTick: EXPIRE_TICK,
    pendingExpiryEquipmentInstanceIds: values
      .map((value) => value.equipmentInstanceId)
      .sort(),
    supplies: [],
  };
}

function readyPostExpiryProjection(): DataRecord {
  return {
    schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION,
    modeDefinitionId: MODE_ID,
    snapshotTick: EXPIRE_TICK + 1,
    snapshotEventSequence: 42,
    resyncReadiness: ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS.READY,
    pendingAuthorityTick: null,
    pendingExpiryEquipmentInstanceIds: [],
    supplies: [],
  };
}

function mutableCopy<T>(value: T): T {
  return structuredClone(value);
}

describe('ArenaPublicSupplyProjection V3 contract', () => {
  it('audits the complete +599 Mode/tier/wave/world identity closure and freezes a copy', () => {
    const values = identities();
    const equipment = worldEquipmentFor(values);
    const source = activeProjection(EXPIRE_TICK - 1, values, equipment);
    const audited = createArenaPublicSupplyProjectionV3Audit(
      source,
      options(EXPIRE_TICK - 1, values, equipment),
    );

    expect(audited.schemaVersion).toBe(3);
    expect(audited.modeDefinitionId).toBe(MODE_ID);
    expect(audited.supplies).toHaveLength(3);
    expect(audited.supplies.every((supply) => supply.remainingTicks === 1)).toBe(true);
    expect(audited.supplies.map((supply) => supply.equipmentInstanceId)).toEqual(
      values.map((value) => value.equipmentInstanceId),
    );
    expect([
      audited,
      audited.supplies,
      audited.supplies[0],
      audited.supplies[0]?.position,
      audited.supplies[0]?.spawnPosition,
    ].every(Object.isFrozen)).toBe(true);

    ((source.supplies as DataRecord[])[0]!).runtimeEquipmentDefinitionId = 'mutated.test';
    (((source.supplies as DataRecord[])[0]!).position as DataRecord).x = 999;
    equipment[0]!.collectionEquipmentDefinitionId = 'mutated-collection.test';
    expect(audited.supplies[0]?.runtimeEquipmentDefinitionId).toBe(
      'runtime-1.level-1.test',
    );
    expect(audited.supplies[0]?.position.x).toBe(2.5);
  });

  it('preserves the P1 +600 pending and +601 ready lifecycle without exposing pending items', () => {
    const values = identities();
    const equipment = worldEquipmentFor(values);
    const pending = createArenaPublicSupplyProjectionV3Audit(
      pendingProjection(values),
      options(EXPIRE_TICK, values, equipment),
    );
    expect(pending.resyncReadiness).toBe(
      ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS.NOT_READY_PRE_EXPIRY,
    );
    expect(pending.pendingAuthorityTick).toBe(EXPIRE_TICK);
    expect(pending.pendingExpiryEquipmentInstanceIds).toEqual(
      values.map((value) => value.equipmentInstanceId).sort(),
    );
    expect(pending.supplies).toEqual([]);
    expect(() => assertArenaPublicSupplyProjectionV3ResyncReady(
      pendingProjection(values),
      options(EXPIRE_TICK, values, equipment),
    )).toThrow(/resync/);

    const postExpiry = createArenaPublicSupplyProjectionV3Audit(
      readyPostExpiryProjection(),
      {
        ...options(EXPIRE_TICK + 1, [], []),
        eventSequence: 42,
      },
    );
    expect(postExpiry.resyncReadiness).toBe(
      ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS.READY,
    );
    expect(postExpiry.pendingExpiryEquipmentInstanceIds).toEqual([]);
    expect(postExpiry.supplies).toEqual([]);
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      readyPostExpiryProjection(),
      {
        ...options(EXPIRE_TICK + 1, [], worldEquipmentFor(values, 'despawned')),
        eventSequence: 42,
      },
    )).toThrow(/双向集合/);
  });

  it('rejects missing, extra, V2/future schema and mixed-generation item shapes', () => {
    const values = identities();
    const equipment = worldEquipmentFor(values);
    const source = activeProjection(EXPIRE_TICK - 1, values, equipment);
    const auditOptions = options(EXPIRE_TICK - 1, values, equipment);

    const missing = mutableCopy(source);
    delete missing.modeDefinitionId;
    expect(() => createArenaPublicSupplyProjectionV3Audit(missing, auditOptions)).toThrow(
      /modeDefinitionId/,
    );
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      { ...source, future: true },
      auditOptions,
    )).toThrow(/future/);
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      { ...source, schemaVersion: 2 },
      auditOptions,
    )).toThrow(/schemaVersion/);
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      { ...source, schemaVersion: 4 },
      auditOptions,
    )).toThrow(/schemaVersion/);
    expect(() => createArenaPublicSupplyProjectionV3Audit(source, {
      ...auditOptions,
      future: true,
    } as ArenaPublicSupplyProjectionV3AuditOptions)).toThrow(/future/);

    const v2Item = mutableCopy(source);
    const first = (v2Item.supplies as DataRecord[])[0]!;
    delete first.runtimeEquipmentDefinitionId;
    delete first.collectionEquipmentDefinitionId;
    delete first.survivalLevel;
    first.equipmentDefinitionId = 'legacy-v2.test';
    expect(() => createArenaPublicSupplyProjectionV3Audit(v2Item, auditOptions)).toThrow(
      /equipmentDefinitionId|runtimeEquipmentDefinitionId/,
    );
    const futureItem = mutableCopy(source);
    (futureItem.supplies as DataRecord[])[0]!.schemaVersion = 4;
    expect(() => createArenaPublicSupplyProjectionV3Audit(futureItem, auditOptions)).toThrow(
      /schemaVersion/,
    );
    const nestedExtra = mutableCopy(source);
    ((nestedExtra.supplies as DataRecord[])[0]!.position as DataRecord).future = true;
    expect(() => createArenaPublicSupplyProjectionV3Audit(nestedExtra, auditOptions)).toThrow(
      /future/,
    );
    expect(() => requireArenaPublicSupplyProjectionV3(null, auditOptions)).toThrow(/缺少/);
  });

  it('fails closed on every Mode/tier/wave/item/world identity drift and incomplete direction', () => {
    const values = identities();
    const equipment = worldEquipmentFor(values);
    const source = activeProjection(EXPIRE_TICK - 1, values, equipment);
    const auditOptions = options(EXPIRE_TICK - 1, values, equipment);

    expect(() => createArenaPublicSupplyProjectionV3Audit(
      { ...source, modeDefinitionId: 'foreign-mode.test' },
      auditOptions,
    )).toThrow(/modeDefinitionId/);
    expect(() => createArenaPublicSupplyProjectionV3Audit(source, {
      ...auditOptions,
      snapshotTick: EXPIRE_TICK - 2,
    })).toThrow(/snapshotTick/);
    expect(() => createArenaPublicSupplyProjectionV3Audit(source, {
      ...auditOptions,
      eventSequence: 42,
    })).toThrow(/eventSequence/);
    const foreignModeIdentity = mutableCopy(values) as unknown as DataRecord[];
    foreignModeIdentity[0]!.modeDefinitionId = 'foreign-mode.test';
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      source,
      options(
        EXPIRE_TICK - 1,
        foreignModeIdentity as unknown as ArenaPublicWorldSupplyIdentityV3[],
        equipment,
      ),
    )).toThrow(/modeDefinitionId/);

    for (const [field, replacement] of [
      ['tierPolicyDefinitionId', 'foreign-tier.test'],
      ['waveIndex', 1],
      ['survivalLevel', 2],
      ['collectionEquipmentDefinitionId', 'foreign-collection.test'],
      ['runtimeEquipmentDefinitionId', 'foreign-runtime.test'],
      ['equipmentInstanceId', 'foreign-instance.test'],
      ['equipmentSpawnId', 'foreign-spawn.test'],
      ['slotId', 'foreign-slot.test'],
    ] as const) {
      const changed = mutableCopy(source);
      (changed.supplies as DataRecord[])[0]![field] = replacement;
      expect(() => createArenaPublicSupplyProjectionV3Audit(changed, auditOptions)).toThrow(
        /identity|闭包/,
      );
    }

    for (const [field, replacement] of [
      ['runtimeEquipmentDefinitionId', 'foreign-runtime.test'],
      ['collectionEquipmentDefinitionId', 'foreign-collection.test'],
      ['survivalLevel', 2],
      ['spawnId', 'foreign-spawn.test'],
    ] as const) {
      const worldDrift = mutableCopy(equipment);
      worldDrift[0]![field] = replacement;
      expect(() => createArenaPublicSupplyProjectionV3Audit(
        source,
        options(EXPIRE_TICK - 1, values, worldDrift),
      )).toThrow(/world equipment.*身份漂移/);
    }

    const worldPositionDrift = mutableCopy(equipment);
    (worldPositionDrift[0]!.position as DataRecord).x = 88;
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      source,
      options(EXPIRE_TICK - 1, values, worldPositionDrift),
    )).toThrow(/position/);

    const missingWorld = equipment.slice(1);
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      source,
      options(EXPIRE_TICK - 1, values, missingWorld),
    )).toThrow(/双向集合/);

    const missingProjection = mutableCopy(source);
    (missingProjection.supplies as DataRecord[]).pop();
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      missingProjection,
      auditOptions,
    )).toThrow(/active 集合/);
    const unstableProjection = mutableCopy(source);
    (unstableProjection.supplies as DataRecord[]).reverse();
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      unstableProjection,
      auditOptions,
    )).toThrow(/稳定升序/);

    const crossWave = mutableCopy(values) as unknown as DataRecord[];
    crossWave[1]!.waveIndex = 1;
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      source,
      options(
        EXPIRE_TICK - 1,
        crossWave as unknown as ArenaPublicWorldSupplyIdentityV3[],
        equipment,
      ),
    )).toThrow(/supply\/tier\/wave\/level/);

    const crossTier = mutableCopy(values) as unknown as DataRecord[];
    crossTier[1]!.tierPolicyDefinitionId = 'foreign-tier.test';
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      source,
      options(
        EXPIRE_TICK - 1,
        crossTier as unknown as ArenaPublicWorldSupplyIdentityV3[],
        equipment,
      ),
    )).toThrow(/supply\/tier\/wave\/level/);
  });

  it('locks exact +599/+600/+601 readiness, remaining and pending bidirectional sets', () => {
    const values = identities();
    const equipment = worldEquipmentFor(values);

    const wrongRemaining = activeProjection(EXPIRE_TICK - 1, values, equipment);
    (wrongRemaining.supplies as DataRecord[])[0]!.remainingTicks = 2;
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      wrongRemaining,
      options(EXPIRE_TICK - 1, values, equipment),
    )).toThrow(/remainingTicks/);

    expect(() => createArenaPublicSupplyProjectionV3Audit(
      { ...pendingProjection(values), resyncReadiness: 'ready', pendingAuthorityTick: null },
      options(EXPIRE_TICK, values, equipment),
    )).toThrow(/readiness/);
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      { ...pendingProjection(values), pendingExpiryEquipmentInstanceIds: [] },
      options(EXPIRE_TICK, values, equipment),
    )).toThrow(/pending expiry/);
    const unsortedPending = mutableCopy(pendingProjection(values));
    (unsortedPending.pendingExpiryEquipmentInstanceIds as string[]).reverse();
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      unsortedPending,
      options(EXPIRE_TICK, values, equipment),
    )).toThrow(/稳定升序/);
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      {
        ...pendingProjection(values),
        supplies: (activeProjection(EXPIRE_TICK - 1, values, equipment).supplies as DataRecord[]),
      },
      options(EXPIRE_TICK, values, equipment),
    )).toThrow(/pre-expiry/);
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      readyPostExpiryProjection(),
      {
        ...options(EXPIRE_TICK + 1, values, equipment),
        eventSequence: 42,
      },
    )).toThrow(/生命周期/);
  });

  it('rejects duplicate identities, capacity overflow and non-finite or unsafe numbers', () => {
    const values = identities();
    const equipment = worldEquipmentFor(values);
    const source = activeProjection(EXPIRE_TICK - 1, values, equipment);

    for (const field of [
      'supplyId',
      'slotId',
      'equipmentInstanceId',
      'equipmentSpawnId',
    ] as const) {
      const duplicate = mutableCopy(values) as unknown as DataRecord[];
      duplicate[1]![field] = duplicate[0]![field];
      expect(() => createArenaPublicSupplyProjectionV3Audit(
        source,
        options(
          EXPIRE_TICK - 1,
          duplicate as unknown as ArenaPublicWorldSupplyIdentityV3[],
          equipment,
        ),
      )).toThrow(/重复|不能重复/);
    }

    const fourth = identity(4);
    const four = [...values, fourth];
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      activeProjection(EXPIRE_TICK - 1, four, worldEquipmentFor(four)),
      options(EXPIRE_TICK - 1, four, worldEquipmentFor(four)),
    )).toThrow(/超过 3/);
    const single = [identity(1)];
    expect(createArenaPublicSupplyProjectionV3Audit(
      activeProjection(EXPIRE_TICK - 1, single, worldEquipmentFor(single)),
      options(EXPIRE_TICK - 1, single, worldEquipmentFor(single)),
    ).supplies).toHaveLength(1);

    const nonFinite = mutableCopy(source);
    ((nonFinite.supplies as DataRecord[])[0]!.position as DataRecord).x = Number.NaN;
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      nonFinite,
      options(EXPIRE_TICK - 1, values, equipment),
    )).toThrow(/非有限|有限数/);

    const unsafe = mutableCopy(source);
    (unsafe.supplies as DataRecord[])[0]!.waveIndex = Number.MAX_SAFE_INTEGER + 1;
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      unsafe,
      options(EXPIRE_TICK - 1, values, equipment),
    )).toThrow(/安全整数/);
    const infiniteIdentity = mutableCopy(values) as unknown as DataRecord[];
    infiniteIdentity[0]!.survivalLevel = Number.POSITIVE_INFINITY;
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      source,
      options(
        EXPIRE_TICK - 1,
        infiniteIdentity as unknown as ArenaPublicWorldSupplyIdentityV3[],
        equipment,
      ),
    )).toThrow(/非有限|安全整数/);
  });

  it('rejects accessors, Proxy substitution, Symbols, sparse arrays and cycles without getters', () => {
    const values = identities();
    const equipment = worldEquipmentFor(values);
    const source = activeProjection(EXPIRE_TICK - 1, values, equipment);
    const auditOptions = options(EXPIRE_TICK - 1, values, equipment);
    let getterCalls = 0;

    const accessor = mutableCopy(source);
    Object.defineProperty(accessor, 'modeDefinitionId', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return MODE_ID;
      },
    });
    expect(() => createArenaPublicSupplyProjectionV3Audit(accessor, auditOptions)).toThrow(
      /数据字段|访问器/,
    );
    expect(getterCalls).toBe(0);

    const worldAccessorOptions = mutableCopy(auditOptions);
    Object.defineProperty(
      (worldAccessorOptions.worldSupplyEquipment as unknown as DataRecord[])[0]!,
      'runtimeEquipmentDefinitionId',
      {
        enumerable: true,
        get() {
          getterCalls += 1;
          return 'runtime-1.level-1.test';
        },
      },
    );
    expect(() => createArenaPublicSupplyProjectionV3Audit(
      source,
      worldAccessorOptions,
    )).toThrow(/数据字段|访问器/);
    expect(getterCalls).toBe(0);

    const optionAccessor = mutableCopy(auditOptions);
    Object.defineProperty(
      (optionAccessor.expectedWorldSupplyIdentities as unknown as DataRecord[])[0]!,
      'waveIndex',
      {
        enumerable: true,
        get() {
          getterCalls += 1;
          return 0;
        },
      },
    );
    expect(() => createArenaPublicSupplyProjectionV3Audit(source, optionAccessor)).toThrow(
      /数据字段|访问器/,
    );
    expect(getterCalls).toBe(0);

    let proxyGetCalls = 0;
    const proxy = new Proxy(source, {
      get() {
        proxyGetCalls += 1;
        throw new Error('must not execute get trap');
      },
      ownKeys() {
        throw new Error('hostile ownKeys');
      },
    });
    expect(() => createArenaPublicSupplyProjectionV3Audit(proxy, auditOptions)).toThrow(
      /hostile ownKeys/,
    );
    expect(proxyGetCalls).toBe(0);

    const symbol = mutableCopy(source);
    Object.defineProperty(symbol, Symbol('hostile'), { enumerable: true, value: true });
    expect(() => createArenaPublicSupplyProjectionV3Audit(symbol, auditOptions)).toThrow(/Symbol/);

    const sparse = mutableCopy(source);
    sparse.supplies = new Array(3);
    expect(() => createArenaPublicSupplyProjectionV3Audit(sparse, auditOptions)).toThrow(
      /空槽|访问器/,
    );

    const cycle = mutableCopy(source);
    (cycle.supplies as DataRecord[])[0]!.cycle = cycle;
    expect(() => createArenaPublicSupplyProjectionV3Audit(cycle, auditOptions)).toThrow(/循环引用/);
  });

  it('is explicitly exported as a versioned library contract after P2.0b handoff', () => {
    const publicIndex = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
    expect(publicIndex).toMatch(/arena-public-supply-projection-v3/);
  });
});
