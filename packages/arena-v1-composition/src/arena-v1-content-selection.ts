import {
  CharacterRegistry,
  type CharacterRegistryContract,
  type MapDefinition,
  type MapEventDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  createMatchContentSelection,
  type MatchContentSelection,
} from '@number-strategy-jump/arena-contracts';
import { STAGE4_EQUIPMENT_DEFINITIONS } from '@number-strategy-jump/arena-v1-content';
import { createMapDefinition } from '@number-strategy-jump/arena-definitions';
import { MAP_EVENT_KIND } from '@number-strategy-jump/arena-map';
import { MapRegistry } from '@number-strategy-jump/arena-definitions';
import {
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

interface MapRegistryContract {
  require(id: string): MapDefinition;
  list(): readonly MapDefinition[];
}

export interface ArenaV1SelectedAuthorityRegistries {
  readonly selection: MatchContentSelection;
  readonly mapRegistry: MapRegistry;
  readonly characterRegistry: CharacterRegistry;
}

function requireRegistry<T>(value: unknown, name: string): T {
  if (!value || typeof value !== 'object') {
    throw new TypeError(`${name} 必须实现 require() 和 list()。`);
  }
  const record = value as Record<string, unknown>;
  if (typeof record.require !== 'function' || typeof record.list !== 'function') {
    throw new TypeError(`${name} 必须实现 require() 和 list()。`);
  }
  return value as T;
}

function projectEquipmentWave(
  event: MapEventDefinition,
  equipmentDefinitionIds: readonly string[],
  mapId: string,
): MapEventDefinition {
  if (event.kind !== MAP_EVENT_KIND.EQUIPMENT_WAVE) return event;
  const allowed = new Set(equipmentDefinitionIds);
  const waveEquipmentDefinitionIds = cloneFrozenData(
    event.parameters && typeof event.parameters === 'object'
      ? (event.parameters as Readonly<Record<string, unknown>>).equipmentDefinitionIds
      : undefined,
    `MapDefinition ${mapId} event ${event.id} equipmentDefinitionIds`,
  );
  if (!Array.isArray(waveEquipmentDefinitionIds)) {
    throw new TypeError(
      `MapDefinition ${mapId} event ${event.id} equipmentDefinitionIds 必须是数组。`,
    );
  }
  const normalizedWaveIds = waveEquipmentDefinitionIds.map((definitionId, index) => (
    assertNonEmptyString(
      definitionId,
      `MapDefinition ${mapId} event ${event.id} equipmentDefinitionIds[${index}]`,
    )
  ));
  if (new Set(normalizedWaveIds).size !== normalizedWaveIds.length) {
    throw new RangeError(
      `MapDefinition ${mapId} event ${event.id} equipmentDefinitionIds 不能包含重复项。`,
    );
  }
  const projectedIds = normalizedWaveIds.filter((id) => allowed.has(id));
  if (projectedIds.length === 0) {
    throw new RangeError(
      `MapDefinition ${mapId} 的装备波 ${event.id} 与本局装备池没有交集。`,
    );
  }
  return {
    ...event,
    parameters: {
      ...(event.parameters as Readonly<Record<string, unknown>>),
      equipmentDefinitionIds: projectedIds,
    },
  };
}

function projectMapDefinitionForEquipmentPool(
  definitionValue: unknown,
  equipmentDefinitionIds: readonly string[],
): MapDefinition {
  const definition = createMapDefinition(definitionValue);
  return createMapDefinition({
    ...definition.toJSON(),
    events: definition.events.map((event) => (
      projectEquipmentWave(event, equipmentDefinitionIds, definition.id)
    )),
  });
}

export function createArenaV1SelectedAuthorityRegistries({
  selection: selectionValue,
  mapRegistry: mapRegistryValue,
  characterRegistry: characterRegistryValue,
}: Readonly<{
  selection: unknown;
  mapRegistry: unknown;
  characterRegistry: unknown;
}>): ArenaV1SelectedAuthorityRegistries {
  const selection = createMatchContentSelection(selectionValue);
  const mapRegistry = requireRegistry<MapRegistryContract>(
    mapRegistryValue,
    'Arena V1 full mapRegistry',
  );
  const characterRegistry = requireRegistry<CharacterRegistryContract>(
    characterRegistryValue,
    'Arena V1 full characterRegistry',
  );
  const knownEquipmentIds = new Set(STAGE4_EQUIPMENT_DEFINITIONS.map(({ id }) => id));
  for (const id of selection.equipmentDefinitionIds) {
    if (!knownEquipmentIds.has(id)) {
      throw new RangeError(`MatchContentSelection 引用未知 EquipmentDefinition ${id}。`);
    }
  }
  const maps = selection.mapDefinitionIds.map((id) => (
    projectMapDefinitionForEquipmentPool(
      mapRegistry.require(id),
      selection.equipmentDefinitionIds,
    )
  ));
  const characters = selection.characterDefinitionIds.map((id) => characterRegistry.require(id));
  return Object.freeze({
    selection,
    mapRegistry: new MapRegistry(maps),
    characterRegistry: new CharacterRegistry(characters),
  });
}
