import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  EquipmentSupplyTimelineSystem,
  type EquipmentSupplySpawnSpec,
} from '@number-strategy-jump/arena-equipment';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  createArenaV2SurvivalSupplyRegistry,
} from '@number-strategy-jump/arena-v1-content';
import type {
  MatchCore,
  MatchCoreEquipmentSupplyTimelineFactoryContext,
} from '@number-strategy-jump/arena-match';
import { createArenaV1MatchCore } from './arena-v1-match-core.js';

const OPTION_KEYS = new Set([
  'seed',
  'config',
  'physicsFactory',
  'ruleEngineFactory',
  'mapSystemFactory',
  'characterRegistry',
  'supply',
]);
const SUPPLY_KEYS = new Set(['supplyDefinitionId', 'spawnSpecs']);

export interface ArenaV2SurvivalSupplyComposition {
  readonly supplyDefinitionId: string;
  readonly spawnSpecs: readonly EquipmentSupplySpawnSpec[];
}

export interface ArenaV2SurvivalSupplyMatchCoreOptions {
  readonly seed?: unknown;
  readonly config?: unknown;
  readonly physicsFactory?: unknown;
  readonly ruleEngineFactory?: unknown;
  readonly mapSystemFactory?: unknown;
  readonly characterRegistry?: unknown;
  readonly supply: ArenaV2SurvivalSupplyComposition;
}

export function createArenaV2SurvivalSupplyMatchCore(options: unknown): MatchCore {
  const source = cloneFrozenData(options, 'Arena V2 survival supply composition');
  assertKnownKeys(source, OPTION_KEYS, 'Arena V2 survival supply composition');
  const supply = assertPlainRecord(source.supply, 'Arena V2 survival supply composition.supply');
  assertKnownKeys(supply, SUPPLY_KEYS, 'Arena V2 survival supply composition.supply');
  const supplyDefinitionId = assertNonEmptyString(
    supply.supplyDefinitionId,
    'Arena V2 survival supply composition.supplyDefinitionId',
  );
  const supplyRegistry = createArenaV2SurvivalSupplyRegistry();
  supplyRegistry.require(supplyDefinitionId);
  if (!Array.isArray(supply.spawnSpecs)) {
    throw new TypeError('Arena V2 survival supply composition.spawnSpecs 必须是数组。');
  }
  const spawnSpecs = supply.spawnSpecs;
  const rawConfig = source.config === undefined
    ? {}
    : assertPlainRecord(source.config, 'Arena V2 survival supply config');
  if (rawConfig.equipment !== undefined) {
    const equipment = assertPlainRecord(rawConfig.equipment, 'Arena V2 survival supply equipment');
    if (!Array.isArray(equipment.initialSpawns) || equipment.initialSpawns.length !== 0) {
      throw new RangeError('Arena V2 survival supply composition 禁止并行 initialSpawns authority。');
    }
  }
  const config = {
    ...rawConfig,
    equipment: { initialSpawns: [] },
  };
  const { supply: ignoredSupply, ...baseOptions } = source;
  void ignoredSupply;
  const timelineFactory = (context: MatchCoreEquipmentSupplyTimelineFactoryContext) => {
    if (context.config.preparingTicks > ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.firstSpawnTick) {
      throw new RangeError('Arena V2 survival preparingTicks 不能晚于首波供给。');
    }
    for (const [index, spec] of spawnSpecs.entries()) {
      if (!spec || typeof spec !== 'object' || !context.isEquipmentPositionValid(spec.position)) {
        throw new RangeError(`Arena V2 survival supply spawnSpecs[${index}] 不在合法地图表面。`);
      }
    }
    return new EquipmentSupplyTimelineSystem({
      supplyDefinitionId,
      spawnSpecs,
      equipmentRegistry: context.equipmentDefinitionCatalog,
      equipmentSupplyRegistry: supplyRegistry,
      equipmentSystem: context.equipmentAuthority,
    });
  };
  return createArenaV1MatchCore({
    ...baseOptions,
    config,
    equipmentSupplyRegistry: supplyRegistry,
    equipmentSupplyTimelineFactory: timelineFactory,
  });
}

export const ARENA_V2_SURVIVAL_SUPPLY_COMPOSITION_ID = Object.freeze({
  DEFINITION: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
});
