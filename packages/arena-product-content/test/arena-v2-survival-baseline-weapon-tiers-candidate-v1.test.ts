import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1,
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
  ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1,
  ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_BASELINE_SUPPLY_DEFINITION_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_BASELINE_WEAPON_LEVEL_COUNT_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_FIRST_SPAWN_TICKS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_INTERVAL_TICKS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_LIFETIME_TICKS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_SPAWN_COUNT_CANDIDATE_V1,
  createArenaV2SurvivalBaselineWeaponCandidateRegistriesV1,
  type ArenaV2SurvivalWeaponRuntimeVariantCandidateV1,
} from '../src/index.js';
import {
  WEAPON_TUNING_FIELD_V1,
  type ActionDefinition,
} from '@number-strategy-jump/arena-definitions';

function variant(
  weaponId: ArenaV2SurvivalWeaponRuntimeVariantCandidateV1['weaponId'],
  level: number,
): ArenaV2SurvivalWeaponRuntimeVariantCandidateV1 {
  const result = ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1.runtimeVariants.find(
    (candidate) => candidate.weaponId === weaponId && candidate.level === level,
  );
  if (!result) throw new Error(`${weaponId} level ${level} missing`);
  return result;
}

function numericParameter(
  action: ActionDefinition,
  location: 'targeting' | 'impact' | 'self' | 'hitstun',
  key: string,
): number {
  let parameters: unknown;
  if (location === 'targeting') parameters = action.targeting.parameters;
  else {
    const kind = location === 'impact'
      ? new Set(['apply-directional-impulse', 'pull-to-source'])
      : new Set([location === 'self' ? 'apply-self-impulse' : 'apply-hitstun']);
    parameters = action.effects.find((effect) => kind.has(effect.kind))?.parameters;
  }
  const value = (parameters as Readonly<Record<string, unknown>> | undefined)?.[key];
  if (!Number.isFinite(value)) throw new Error(`${action.id} ${location}.${key} missing`);
  return value as number;
}

describe('Arena V2 survival baseline weapon tier candidate v1', () => {
  it('freezes ten levels and twenty runtime weapon variants while spawning three per wave', () => {
    const catalog = ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1;
    expect(catalog.status).toBe('production-unreachable');
    expect(catalog.hardGate).toBe(false);
    expect(catalog.defaultRegistryWired).toBe(false);
    expect(catalog.tickRate).toBe(60);
    expect(catalog.levelTuning).toHaveLength(
      ARENA_V2_SURVIVAL_BASELINE_WEAPON_LEVEL_COUNT_CANDIDATE_V1,
    );
    expect(catalog.runtimeVariants).toHaveLength(200);
    expect(catalog.runtimeEquipmentDefinitions).toHaveLength(200);
    expect(catalog.actionDefinitions).toHaveLength(442);
    expect(catalog.baseGroundActionDefinitionId).toContain('unarmed-push.ground');
    expect(catalog.baseAerialActionDefinitionId).toContain('unarmed-strike.aerial');
    expect(catalog.spawnSpecs.map(({ slotId }) => slotId)).toEqual([
      'survival-slot-01', 'survival-slot-02', 'survival-slot-03',
    ]);
    expect(catalog.waveEquipmentOverrides).toHaveLength(10);
    expect(catalog.waveEquipmentOverrides[0]!.minimumWaveIndex).toBe(0);
    expect(catalog.waveEquipmentOverrides[9]!.minimumWaveIndex).toBe(9);
    expect(catalog.waveEquipmentOverrides.every(({ slots }) => slots.length === 3)).toBe(true);
    expect(catalog.tierPolicyDefinition.tiers).toHaveLength(10);
    expect(catalog.tierPolicyDefinition.tiers.map((tier) => tier.minimumWaveIndex)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(catalog.tierPolicyDefinition.tiers.every((tier) => tier.variants.length === 20)).toBe(true);
    expect(catalog.waveEquipmentOverrides[0]!.slots.map(({ equipmentDefinitionId }) => (
      equipmentDefinitionId
    ))).toEqual(expect.arrayContaining([
      expect.stringContaining('charge-shield.survival.level-1'),
      expect.stringContaining('heavy-hammer.survival.level-1'),
      expect.stringContaining('gravity-chain.survival.level-1'),
    ]));
    expect(catalog.waveEquipmentOverrides[1]!.slots.map(({ equipmentDefinitionId }) => (
      equipmentDefinitionId
    ))).toEqual(expect.arrayContaining([
      expect.stringContaining('line-suppressor.survival.level-2'),
      expect.stringContaining('read-counter.survival.level-2'),
      expect.stringContaining('flank-blade.survival.level-2'),
    ]));
    const rotatedWeaponIds = catalog.waveEquipmentOverrides.flatMap(({ slots }) => (
      slots.map(({ equipmentDefinitionId }) => catalog.runtimeVariants.find(
        ({ equipment }) => equipment.id === equipmentDefinitionId,
      )!.weaponId)
    ));
    expect(new Set(rotatedWeaponIds)).toEqual(new Set(
      ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(({ id }) => id),
    ));
    expect(Object.isFrozen(catalog)).toBe(true);
    expect(catalog.contentHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('encodes no initial weapon, three drops every twenty seconds, and ten-second expiry', () => {
    const supply = ARENA_V2_SURVIVAL_BASELINE_SUPPLY_DEFINITION_CANDIDATE_V1;
    expect(supply.firstSpawnTick).toBe(
      ARENA_V2_SURVIVAL_SUPPLY_FIRST_SPAWN_TICKS_CANDIDATE_V1,
    );
    expect(supply.spawnIntervalTicks).toBe(
      ARENA_V2_SURVIVAL_SUPPLY_INTERVAL_TICKS_CANDIDATE_V1,
    );
    expect(supply.lifetimeTicks).toBe(
      ARENA_V2_SURVIVAL_SUPPLY_LIFETIME_TICKS_CANDIDATE_V1,
    );
    expect(supply.spawnCount).toBe(ARENA_V2_SURVIVAL_SUPPLY_SPAWN_COUNT_CANDIDATE_V1);
    expect(supply.firstSpawnTick / 60).toBe(20);
    expect(supply.spawnIntervalTicks / 60).toBe(20);
    expect(supply.lifetimeTicks / 60).toBe(10);
    expect(supply.replacementPolicy).toBe('atomic-recycle-held');
    expect(supply.expiryPolicy).toBe('world-only-at-expire-tick');
    expect(supply.tickOrder).toEqual(['spawn', 'expire', 'pickup', 'action']);
  });

  it('preserves action/input semantics and changes only each grammar whitelist', () => {
    for (const source of ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1) {
      const weaponId = source.id;
      const first = variant(weaponId, 1);
      const tenth = variant(weaponId, 10);
      expect(first.actions).toHaveLength(source.actions.length);
      expect(tenth.actions).toHaveLength(source.actions.length);
      expect(first.addsInput).toBe(false);
      expect(first.addsAction).toBe(false);
      expect(first.semanticsLocked).toBe(true);
      expect(tenth.actions.map((action) => action.input)).toEqual(
        source.actions.map((action) => action.input),
      );
      expect(tenth.actions.map((action) => action.effects.map(({ kind }) => kind))).toEqual(
        source.actions.map((action) => action.effects.map(({ kind }) => kind)),
      );
      const permitted = source.grammar.survivalGrowth.permittedTuningFields;
      if (permitted.includes(WEAPON_TUNING_FIELD_V1.COOLDOWN_TICKS)) {
        expect(tenth.actions[0]!.timing.cooldownTicks).toBeLessThan(
          source.actions[0]!.timing.cooldownTicks,
        );
      } else {
        expect(tenth.actions[0]!.timing.cooldownTicks).toBe(
          source.actions[0]!.timing.cooldownTicks,
        );
      }
      const expectedImpulse = numericParameter(source.actions[0]!, 'impact', 'horizontalImpulse');
      if (permitted.includes(WEAPON_TUNING_FIELD_V1.HORIZONTAL_IMPULSE)) {
        expect(numericParameter(tenth.actions[0]!, 'impact', 'horizontalImpulse'))
          .toBeGreaterThan(expectedImpulse);
      } else {
        expect(numericParameter(tenth.actions[0]!, 'impact', 'horizontalImpulse'))
          .toBe(expectedImpulse);
      }
    }
  });

  it('grows hammer/chain range, shield hitstun, and never grows shield self movement', () => {
    const hammerTen = variant('heavy-hammer', 10).actions[0]!;
    const chainTen = variant('gravity-chain', 10).actions[0]!;
    const shieldTen = variant('charge-shield', 10).actions[0]!;
    const shieldBase = ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1.actions[0]!;

    expect(numericParameter(hammerTen, 'targeting', 'range')).toBeGreaterThan(
      numericParameter(ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.actions[0]!, 'targeting', 'range'),
    );
    expect(numericParameter(chainTen, 'targeting', 'range')).toBeGreaterThan(
      numericParameter(ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1.actions[0]!, 'targeting', 'range'),
    );
    expect(numericParameter(shieldTen, 'targeting', 'range')).toBe(
      numericParameter(shieldBase, 'targeting', 'range'),
    );
    expect(numericParameter(shieldTen, 'hitstun', 'ticks')).toBeGreaterThan(
      numericParameter(shieldBase, 'hitstun', 'ticks'),
    );
    expect(numericParameter(shieldTen, 'self', 'horizontalImpulse')).toBe(
      numericParameter(shieldBase, 'self', 'horizontalImpulse'),
    );
    expect(shieldTen.effects.map(({ kind }) => kind)).not.toEqual(expect.arrayContaining([
      'front-guard', 'guard', 'damage-reduction', 'invulnerability',
    ]));
  });

  it('keeps collection identity stable while every level resolves to unique runtime definitions', () => {
    const catalog = ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1;
    const runtimeIds = catalog.tierPolicyDefinition.tiers.flatMap((tier) => (
      tier.variants.map(({ runtimeEquipmentDefinitionId }) => runtimeEquipmentDefinitionId)
    ));
    expect(new Set(runtimeIds).size).toBe(200);
    for (const tier of catalog.tierPolicyDefinition.tiers) {
      expect(tier.variants.map(({ collectionEquipmentDefinitionId }) => (
        collectionEquipmentDefinitionId
      ))).toEqual(catalog.tierPolicyDefinition.tiers[0]!.variants.map((variantEntry) => (
        variantEntry.collectionEquipmentDefinitionId
      )));
    }
    const registries = createArenaV2SurvivalBaselineWeaponCandidateRegistriesV1();
    for (const runtimeId of runtimeIds) expect(registries.equipmentRegistry.require(runtimeId).id).toBe(runtimeId);
    expect(registries.equipmentSupplyRegistry.require(catalog.supplyDefinition.id).id).toBe(
      catalog.supplyDefinition.id,
    );
  });
});
